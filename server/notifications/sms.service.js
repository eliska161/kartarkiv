// sms-sender-smsmobileapi.js (updated)
const LOG_PREFIX = '[SmsService-SMSMobileAPI]';

// Use the documented API endpoint by default
const SMSMOBILEAPI_ENDPOINT = process.env.SMSMOBILEAPI_ENDPOINT || 'https://api.smsmobileapi.com/sendsms/';
const SMSMOBILEAPI_API_KEY = process.env.SMSMOBILEAPI_API_KEY;
const SMSMOBILEAPI_DEVICE_ID = process.env.SMSMOBILEAPI_DEVICE_ID || null; // maps to sIdentifiant
const DISABLE_SMS =
  String(process.env.DISABLE_SMS_SENDING || process.env.DISABLE_SMS_REMINDERS || '').toLowerCase() === 'true';

const resolveBaseUrl = () => {
  const envBase =
    process.env.INVOICE_PAYMENT_BASE_URL ||
    process.env.CLIENT_PAYMENT_BASE_URL ||
    process.env.CLIENT_BASE_URL ||
    process.env.BASE_URL ||
    'https://kartarkiv.co';

  let clean = String(envBase).trim();

  // Hvis protokoll mangler, legg til https://
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean.replace(/^\/+/, '');
  }

  // Fjern trailing skråstrek
  clean = clean.replace(/\/+$/, '');

  try {
    // Normaliser via URL-konstructor
    const u = new URL(clean);
    return `${u.protocol}//${u.hostname}${u.port ? ':'+u.port : ''}${u.pathname.replace(/\/+$/,'')}`;
  } catch (e) {
    // fallback: return hva vi har
    return clean;
  }
};

const resolvePaymentUrl = invoiceId => {
  // bruk URL og searchParams for å bygge korrekt querystring
  const base = resolveBaseUrl();
  // Lag et URL-objekt; hvis path mangler, legg den til
  let url;
  try {
    url = new URL(base);
  } catch (e) {
    // fallback hvis base er noe uventet
    url = new URL('https://kartarkiv.co');
  }

  // Sørg for at pathen /admin/betaling er til stedet (erstatt eventuell trailing)
  url.pathname = (url.pathname.replace(/\/+$/,'') + '/admin/betaling').replace(/\/+/g,'/');

  // Sett invoiceId korrekt via searchParams
  url.searchParams.set('invoiceId', String(invoiceId));

  return url.toString();
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

// Use GET (simpler for this API) but fall back to POST if environment requires it
const sendViaSMSMobileAPI = async ({ to, message }) => {
  if (!SMSMOBILEAPI_API_KEY) {
    throw new Error('SMSMobileAPI not configured (SMSMOBILEAPI_API_KEY required)');
  }

  if (typeof fetch !== 'function') {
    throw new Error(
      'Fetch API not available. In Node <18 install a polyfill (e.g. npm i node-fetch@2) and set global.fetch = require("node-fetch").'
    );
  }

  // Build params according to documented API
  const params = new URLSearchParams({
    apikey: SMSMOBILEAPI_API_KEY,
    recipients: to,
    message,
    sendsms: '1'
  });

  if (SMSMOBILEAPI_DEVICE_ID) {
    params.set('sIdentifiant', SMSMOBILEAPI_DEVICE_ID);
  }

  const url = `${SMSMOBILEAPI_ENDPOINT}?${params.toString()}`;

  // Minimal logging to avoid hitting log-rate limits on hosts like Railway
  console.info(`${LOG_PREFIX} Sending SMS to ${to} via SMSMobileAPI (GET)`);

  // Attempt GET first
  let res;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch (err) {
    // network/TLS/proxy error — give helpful message
    console.error(`${LOG_PREFIX} network error when calling SMSMobileAPI:`, err && err.message);
    throw err;
  }

  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  const status = res.status;
  const text = await res.text().catch(() => '');

  // If the server returns HTML (WordPress page / error), provide concise diagnostic
  if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
    const snippet = text ? text.slice(0, 1000) : '';
    const err = new Error(
      `SMSMobileAPI returned unexpected content-type (HTTP ${status}, content-type=${contentType}). Snippet: ${snippet.slice(0,300)}`
    );
    err.status = status;
    err.contentType = contentType;
    err.raw = snippet;
    console.error(`${LOG_PREFIX} Non-API response from SMSMobileAPI:`, { status, contentType, snippet: snippet.slice(0,200) });
    throw err;
  }

  // The API may return plain text like "SMS SENT" or a JSON. Accept both.
  // Try to parse JSON if content-type indicates it
  let parsed = null;
  if (contentType.includes('application/json')) {
    try { parsed = JSON.parse(text); } catch (e) { parsed = null; }
  }

  // If not JSON, but text present, return it as raw
  if (!res.ok) {
    throw new Error(`SMSMobileAPI HTTP ${status}: ${text}`);
  }

  return { success: true, raw: parsed || text, provider: 'smsmobileapi' };
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
    console.error(`${LOG_PREFIX} sendSms error:`, err && err.message);
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

const ping = async () => {
  if (!SMSMOBILEAPI_API_KEY) throw new Error('Missing SMSMOBILEAPI_API_KEY');
  return { ok: true, endpoint: SMSMOBILEAPI_ENDPOINT };
};

module.exports = {
  normalizePhoneNumber,
  resolvePaymentUrl,
  sendInvoiceReminderSms,
  sendSms,
  ping
};
