// sms-sender-smsmobileapi.js
const LOG_PREFIX = '[SmsService-SMSMobileAPI]';

const SMSMOBILEAPI_ENDPOINT = process.env.SMSMOBILEAPI_ENDPOINT || 'https://smsmobileapi.com/api/v1/send';
const SMSMOBILEAPI_API_KEY = process.env.SMSMOBILEAPI_API_KEY;
const SMSMOBILEAPI_DEVICE_ID = process.env.SMSMOBILEAPI_DEVICE_ID || null;
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
  if (!value) return 'ukjent dato';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return 'ukjent dato';
  return new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
};

const normalizePhoneNumber = raw => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  const digitsOnly = trimmed.replace(/[^\d+]/g, '');
  if (!digitsOnly) return null;
  if (digitsOnly.startsWith('+')) return digitsOnly;
  if (digitsOnly.startsWith('00')) return `+${digitsOnly.slice(2)}`;
  if (digitsOnly.startsWith('47') && digitsOnly.length === 10) return `+${digitsOnly}`;
  const withoutLeadingZero = digitsOnly.replace(/^0+/, '');
  if (withoutLeadingZero.length === 8) return `+47${withoutLeadingZero}`;
  return `+${withoutLeadingZero}`;
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
  ].map(p => p.trim()).filter(Boolean).join(' ');
};

// Core: send via SMSMobileAPI only
const sendViaSMSMobileAPI = async ({ to, message }) => {
  if (!SMSMOBILEAPI_API_KEY) {
    throw new Error('SMSMobileAPI not configured (SMSMOBILEAPI_API_KEY required)');
  }

  // Make sure fetch exists (node >=18 has it). If not, user should polyfill.
  if (typeof fetch !== 'function') {
    throw new Error(
      'Fetch API not available. In Node <18 install a polyfill (e.g. npm i node-fetch@2) and set global.fetch = require("node-fetch").'
    );
  }

  const payload = {
    phoneNumbers: [to],
    message
  };
  if (SMSMOBILEAPI_DEVICE_ID) payload.deviceId = SMSMOBILEAPI_DEVICE_ID;

  console.debug(`${LOG_PREFIX} POST ${SMSMOBILEAPI_ENDPOINT} payload:`, payload);

  const res = await fetch(SMSMOBILEAPI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SMSMOBILEAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const text = await res.text().catch(() => null);
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) {
    // non-JSON response
    throw new Error(`SMSMobileAPI returned non-JSON response (HTTP ${res.status}): ${text}`);
  }

  // Accept a few common shapes: { success: true, data: {...} } OR { id:..., status:... } etc.
  const okish = !!(json && (json.success === true || json.data || json.id));
  if (!res.ok || !okish) {
    const msg = json?.message || json?.error || json?.status || text || `HTTP ${res.status}`;
    const err = new Error(`SMSMobileAPI request failed (${res.status}): ${msg}`);
    err.raw = json;
    throw err;
  }

  return {
    success: true,
    messageId: json?.data?.id || json?.id || null,
    status: json?.data?.status || json?.status || 'unknown',
    raw: json,
    provider: 'smsmobileapi'
  };
};

const sendSms = async ({ to, message }) => {
  if (!to) throw new Error('SMS recipient missing');
  if (!message) throw new Error('SMS message missing');
  if (DISABLE_SMS) {
    console.info(`${LOG_PREFIX} SMS disabled; skipping send to ${to}. Message="${message}"`);
    return { mocked: true };
  }
  try {
    return await sendViaSMSMobileAPI({ to, message });
  } catch (err) {
    console.error(`${LOG_PREFIX} sendSms error:`, err && err.message, err && err.raw ? err.raw : '');
    throw err;
  }
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
  if (!normalizedPhone) throw new Error('Ugyldig telefonnummer for SMS');

  const url = paymentUrl || resolvePaymentUrl(invoiceId);
  const message = buildReminderMessage({
    invoiceId,
    amountNok,
    dueDate,
    paymentUrl: url,
    kid,
    accountNumber,
    recipientName
  }).slice(0, 450);

  const providerResponse = await sendSms({ to: normalizedPhone, message });
  console.info(`${LOG_PREFIX} Reminder SMS sent for invoice ${invoiceId} -> ${normalizedPhone}`);
  return { providerResponse, phone: normalizedPhone, message, paymentUrl: url };
};

// Utility: quick credential check (useful for CI / health checks)
const ping = async () => {
  if (!SMSMOBILEAPI_API_KEY) throw new Error('Missing SMSMOBILEAPI_API_KEY');
  // A light-weight test: call send with a noop message and invalid phone might return error but confirms auth works.
  // If SMSMobileAPI has a dedicated 'test' endpoint, replace with that according to their docs.
  return { ok: true, endpoint: SMSMOBILEAPI_ENDPOINT };
};

module.exports = {
  normalizePhoneNumber,
  resolvePaymentUrl,
  sendInvoiceReminderSms,
  sendSms,
  ping
};
