const LOG_PREFIX = '[SmsService]';

const DEFAULT_PROVIDER = 'textbelt';
const TEXTBELT_ENDPOINT = process.env.SMS_TEXTBELT_ENDPOINT || 'https://textbelt.com/text';
const TEXTBELT_API_KEY = process.env.SMS_TEXTBELT_API_KEY || 'textbelt';

const DISABLE_SMS =
  String(process.env.DISABLE_SMS_SENDING || process.env.DISABLE_SMS_REMINDERS || '').toLowerCase() === 'true';

const resolveBaseUrl = () =>
  (process.env.INVOICE_PAYMENT_BASE_URL ||
    process.env.CLIENT_PAYMENT_BASE_URL ||
    process.env.CLIENT_BASE_URL ||
    process.env.BASE_URL ||
    'https://kartarkiv.no'
  ).replace(/\/+$/, '');

const resolvePaymentUrl = invoiceId => {
  const template = process.env.INVOICE_PAYMENT_URL_TEMPLATE;
  if (template && template.includes('{invoiceId}')) {
    return template.replace('{invoiceId}', String(invoiceId));
  }
  const base = resolveBaseUrl();
  return `${base}/admin/betaling?invoiceId=${invoiceId}`;
};

const formatCurrency = amount =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(Number(amount || 0));

const formatDate = value => {
  if (!value) {
    return 'ukjent dato';
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return 'ukjent dato';
  }
  return new Intl.DateTimeFormat('nb-NO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dt);
};

const normalizePhoneNumber = raw => {
  if (!raw) {
    return null;
  }
  const trimmed = String(raw).trim();
  if (!trimmed) {
    return null;
  }
  const digitsOnly = trimmed.replace(/[^\d+]/g, '');
  if (!digitsOnly) {
    return null;
  }

  if (digitsOnly.startsWith('+')) {
    return digitsOnly;
  }

  if (digitsOnly.startsWith('00')) {
    return `+${digitsOnly.slice(2)}`;
  }

  // Norwegian defaults
  if (digitsOnly.startsWith('47') && digitsOnly.length === 10) {
    return `+${digitsOnly}`;
  }

  const withoutLeadingZero = digitsOnly.replace(/^0+/, '');
  if (withoutLeadingZero.length === 8) {
    return `+47${withoutLeadingZero}`;
  }

  return `+${withoutLeadingZero}`;
};

const sendViaTextbelt = async ({ to, message }) => {
  const response = await fetch(TEXTBELT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      phone: to,
      message,
      key: TEXTBELT_API_KEY
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Textbelt request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  if (!payload?.success) {
    const err = new Error(`Textbelt error: ${payload?.error || 'unknown error'}`);
    err.details = payload;
    throw err;
  }

  return payload;
};

const sendSms = async ({ to, message }) => {
  if (!to) {
    throw new Error('SMS recipient missing');
  }
  if (!message) {
    throw new Error('SMS message missing');
  }

  if (typeof fetch !== 'function') {
    throw new Error('Fetch API is not available in this environment');
  }

  if (DISABLE_SMS) {
    console.info(`${LOG_PREFIX} SMS disabled; skipping send to ${to}. Message="${message}"`);
    return { mocked: true };
  }

  switch ((process.env.SMS_PROVIDER || DEFAULT_PROVIDER).toLowerCase()) {
    default:
      return sendViaTextbelt({ to, message });
  }
};

const buildReminderMessage = ({ invoiceId, amountNok, dueDate, paymentUrl, kid, accountNumber, recipientName }) => {
  const friendlyName = recipientName ? `Hei ${recipientName},` : 'Hei!';
  const kidPart = kid ? ` KID: ${kid}.` : '';
  const accountPart = accountNumber ? ` Kontonr: ${accountNumber}.` : '';
  return [
    friendlyName,
    `faktura #${invoiceId} på ${formatCurrency(amountNok)} forfaller ${formatDate(dueDate)}.`,
    `Betalingsinfo:${kidPart}${accountPart}`,
    `Betalingssiden finner du her: ${paymentUrl}`
  ]
    .map(part => part.trim())
    .filter(Boolean)
    .join(' ');
};

const sendInvoiceReminderSms = async ({
  invoiceId,
  phoneNumber,
  amountNok,
  dueDate,
  paymentUrl,
  kid = null,
  accountNumber = null,
  recipientName = null
}) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  if (!normalizedPhone) {
    throw new Error('Ugyldig telefonnummer for SMS');
  }
  const url = paymentUrl || resolvePaymentUrl(invoiceId);
  const message = buildReminderMessage({
    invoiceId,
    amountNok,
    dueDate,
    paymentUrl: url,
    kid,
    accountNumber,
    recipientName
  }).slice(0, 450); // keep buffer for SMS gateways

  const providerResponse = await sendSms({ to: normalizedPhone, message });
  console.info(`${LOG_PREFIX} Reminder SMS sent for invoice ${invoiceId} -> ${normalizedPhone}`);
  return { providerResponse, phone: normalizedPhone, message, paymentUrl: url };
};

module.exports = {
  normalizePhoneNumber,
  resolvePaymentUrl,
  sendInvoiceReminderSms
};
