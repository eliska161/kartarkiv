const pool = require('../database/connection');
const { sendInvoiceReminderSms } = require('../notifications/sms.service');

const LOG_PREFIX = '[InvoiceReminderJob]';
const REMINDER_WINDOW_HOURS = Number(process.env.INVOICE_SMS_REMINDER_WINDOW_HOURS || 24);
const CHECK_INTERVAL_MS = Number(process.env.INVOICE_SMS_CHECK_INTERVAL_MS || 15 * 60 * 1000);
const MAX_BATCH = Number(process.env.INVOICE_SMS_MAX_BATCH || 25);
const DISABLED =
  String(process.env.DISABLE_SMS_REMINDERS || '').toLowerCase() === 'true' ||
  String(process.env.DISABLE_SMS_SENDING || '').toLowerCase() === 'true';

let timer = null;
let running = false;

const resolveAccountNumber = invoice =>
  process.env.INVOICE_ACCOUNT_NUMBER ||
  invoice.account_number ||
  process.env.SB1_ACCOUNT_NUMBER ||
  '00000000000';

const toNok = cents => (Number.isFinite(Number(cents)) ? Number(cents) / 100 : 0);

const fetchInvoicesDueSoon = async () => {
  const { rows } = await pool.query(
    `
      SELECT
        id,
        invoice_request_name,
        invoice_request_phone,
        total_amount_cents,
        due_date,
        kid,
        account_number
      FROM club_invoices
      WHERE
        due_date IS NOT NULL
        AND COALESCE(paid, FALSE) = FALSE
        AND (status IS NULL OR status <> 'paid')
        AND sms_reminder_sent_at IS NULL
        AND invoice_request_phone IS NOT NULL
        AND length(trim(invoice_request_phone)) > 5
        AND NOW() >= (due_date::timestamp - ($1 * interval '1 hour'))
        AND NOW() <= due_date::timestamp
      ORDER BY due_date ASC
      LIMIT $2
    `,
    [REMINDER_WINDOW_HOURS, MAX_BATCH]
  );

  return rows;
};

const markReminderSent = async invoiceId => {
  await pool.query(
    `
      UPDATE club_invoices
      SET sms_reminder_sent_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [invoiceId]
  );
};

const runReminderPass = async () => {
  if (running) {
    return;
  }
  running = true;
  try {
    const invoices = await fetchInvoicesDueSoon();
    if (invoices.length === 0) {
      return;
    }
    console.info(`${LOG_PREFIX} Processing ${invoices.length} invoice reminder(s).`);

    for (const invoice of invoices) {
      try {
        await sendInvoiceReminderSms({
          invoiceId: invoice.id,
          phoneNumber: invoice.invoice_request_phone,
          amountNok: toNok(invoice.total_amount_cents),
          dueDate: invoice.due_date,
          paymentUrl: null,
          kid: invoice.kid,
          accountNumber: resolveAccountNumber(invoice),
          recipientName: invoice.invoice_request_name
        });
        await markReminderSent(invoice.id);
      } catch (error) {
        console.error(`${LOG_PREFIX} Failed to send reminder for invoice ${invoice.id}:`, error);
      }
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Reminder pass failed:`, error);
  } finally {
    running = false;
  }
};

const startInvoiceReminderWorker = () => {
  if (DISABLED) {
    console.info(`${LOG_PREFIX} SMS reminders disabled via environment variable.`);
    return;
  }
  if (timer) {
    return;
  }
  console.info(
    `${LOG_PREFIX} Starting worker. Window=${REMINDER_WINDOW_HOURS}h interval=${Math.round(CHECK_INTERVAL_MS / 1000)}s`
  );
  runReminderPass().catch(err => {
    console.error(`${LOG_PREFIX} Initial run failed:`, err);
  });
  timer = setInterval(runReminderPass, CHECK_INTERVAL_MS);
};

module.exports = { startInvoiceReminderWorker, runReminderPass };
