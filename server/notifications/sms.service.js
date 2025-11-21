const LOG_PREFIX = '[SmsService]';

const DEFAULT_PROVIDER = 'smsmobileapi';

// SMSMobileAPI config (FREE - uses your phone)
const SMSMOBILEAPI_ENDPOINT = 'https://smsmobileapi.com/api/v1/send';
const SMSMOBILEAPI_API_KEY = process.env.SMSMOBILEAPI_API_KEY;
const SMSMOBILEAPI_DEVICE_ID = process.env.SMSMOBILEAPI_DEVICE_ID; // Optional, for multi-device

// Textbelt config (backup)
const TEXTBELT_ENDPOINT = process.env.SMS_TEXTBELT_ENDPOINT || 'https://textbelt.com/text';
const TEXTBELT_API_KEY = process.env.SMS_TEXTBELT_API_KEY || 'textbelt';

// Twilio config (backup)
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const TWILIO_ALPHANUMERIC_SENDER = process.env.TWILIO_ALPHANUMERIC_SENDER;

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

const sendViaSMSMobileAPI = async ({ to, message }) => {
  if (!SMSMOBILEAPI_API_KEY) {
    throw new Error('SMSMobileAPI not configured (SMSMOBILEAPI_API_KEY required)');
  }

  const payload = {
    phoneNumbers: [to],
    message: message
  };

  // Optional: specify which device to use if you have multiple phones
  if (SMSMOBILEAPI_DEVICE_ID) {
    payload.deviceId = SMSMOBILEAPI_DEVICE_ID;
  }

  const response = await fetch(SMSMOBILEAPI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SMSMOBILEAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SMSMobileAPI request failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  
  // Check if the API returned an error
  if (result.error || !result.success) {
    const errorMsg = result.message || result.error || 'Unknown error';
    throw new Error(`SMSMobileAPI error: ${errorMsg}`);
  }

  return {
    success: true,
    messageId: result.data?.id || result.id,
    status: result.data?.status || result.status,
    provider: 'smsmobileapi'
  };
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

const sendViaTwilio = async ({ to, message }) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN required)');
  }

  let fromValue;
  if (TWILIO_MESSAGING_SERVICE_SID) {
    fromValue = TWILIO_MESSAGING_SERVICE_SID;
  } else if (TWILIO_ALPHANUMERIC_SENDER) {
    fromValue = TWILIO_ALPHANUMERIC_SENDER;
  } else if (TWILIO_PHONE_NUMBER) {
    fromValue = TWILIO_PHONE_NUMBER;
  } else {
    throw new Error('Twilio sender not configured');
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      To: to,
      From: fromValue,
      Body: message
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    const errorMsg = payload?.message || payload?.error?.message || 'Unknown Twilio error';
    const err = new Error(`Twilio API error (${response.status}): ${errorMsg}`);
    err.details = payload;
    throw err;
  }

  return {
    sid: payload.sid,
    status: payload.status,
    from: payload.from,
    to: payload.to,
    dateCreated: payload.date_created
  };
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

  const provider = (process.env.SMS_PROVIDER || DEFAULT_PROVIDER).toLowerCase();

  switch (provider) {
    case 'smsmobileapi':
      return sendViaSMSMobileAPI({ to, message });
    case 'twilio':
      return sendViaTwilio({ to, message });
    case 'textbelt':
      return sendViaTextbelt({ to, message });
    default:
      throw new Error(`Unknown SMS provider: ${provider}`);
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