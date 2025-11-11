const nodemailer = require('nodemailer');

const RETRYABLE_SMTP_ERROR_CODES = new Set([
  'ETIMEDOUT',
  'ESOCKET',
  'ECONNECTION',
  'ECONNRESET',
  'ECONNREFUSED',
  'EPIPE',
  'EAI_AGAIN'
]);

const RETRYABLE_SMTP_COMMANDS = new Set(['CONN', 'EHLO', 'HELO', 'STARTTLS']);

function parseTimeout(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveRetryAttempts() {
  const parsed = Number(process.env.INVOICE_EMAIL_MAX_ATTEMPTS);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return 3;
}

function resolveOverallTimeoutMs() {
  return parseTimeout(process.env.SMTP_OVERALL_TIMEOUT, 25000);
}

function createOverallTimeoutError(attempt) {
  const error = new Error('SMTP overall timeout exceeded');
  error.code = 'ETIMEDOUT';
  error.command = 'OVERALL_TIMEOUT';
  if (Number.isFinite(attempt) && attempt > 0) {
    error.attempts = attempt;
  }
  return error;
}

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      // Fail fast on network issues so API calls don't block too long while still giving the
      // provider a fair chance to respond. These values are configurable via env overrides.
      connectionTimeout: parseTimeout(process.env.SMTP_CONNECTION_TIMEOUT, 20000),
      greetingTimeout: parseTimeout(process.env.SMTP_GREETING_TIMEOUT, 20000),
      socketTimeout: parseTimeout(process.env.SMTP_SOCKET_TIMEOUT, 45000),
      // requireTLS: true, // uncomment if provider requires TLS on 587
      // tls: { rejectUnauthorized: false } // only if provider uses self-signed certs
    });
  }
  return null;
}

function isRetryableSmtpError(error) {
  if (!error) {
    return false;
  }

  if (error.code && RETRYABLE_SMTP_ERROR_CODES.has(error.code)) {
    return true;
  }

  if (error.command && RETRYABLE_SMTP_COMMANDS.has(error.command)) {
    return true;
  }

  const message = String(error.message || '').toLowerCase();
  if (message.includes('timed out') || message.includes('timeout')) {
    return true;
  }

  return false;
}

function wait(delayMs) {
  return new Promise(resolve => setTimeout(resolve, delayMs));
}

async function sendInvoiceEmail({ to, from, subject, text, html, pdfBuffer, filename = 'invoice.pdf' }) {
  const transport = buildTransport();
  if (!transport) {
    console.warn('Email transport not configured; pretending to send email to', to);
    return { accepted: [to], messageId: 'mock-email', preview: true };
  }
  const attempts = Math.max(1, resolveRetryAttempts());
  const deadline = Date.now() + resolveOverallTimeoutMs();
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const timeRemaining = deadline - Date.now();
    if (timeRemaining <= 0) {
      lastError = createOverallTimeoutError(attempt - 1);
      break;
    }

    try {
      const info = await transport.sendMail({
        to,
        from: from || process.env.EMAIL_FROM || 'Kartarkiv <noreply@kartarkiv.co>',
        subject,
        text,
        html,
        attachments: pdfBuffer ? [{ filename, content: pdfBuffer, contentType: 'application/pdf' }] : []
      });

      if (attempt > 1) {
        console.info(`Invoice email send succeeded on retry attempt ${attempt}.`);
      }

      return info;
    } catch (error) {
      lastError = error;
      const shouldRetry = attempt < attempts && isRetryableSmtpError(error);
      if (!shouldRetry) {
        if (error && typeof error === 'object') {
          error.attempts = attempt;
        }
        break;
      }

      const remainingBeforeDelay = deadline - Date.now();
      if (remainingBeforeDelay <= 0) {
        lastError = createOverallTimeoutError(attempt);
        break;
      }

      const plannedDelay = Math.min(30000, 2000 * Math.pow(2, attempt - 1));
      const safeDelay = Math.min(plannedDelay, Math.max(0, remainingBeforeDelay - 500));
      if (safeDelay <= 0) {
        lastError = createOverallTimeoutError(attempt);
        break;
      }
      console.warn(
        `Invoice email send attempt ${attempt} failed (${error.code || error.message}). Retrying in ${safeDelay}ms.`
      );
      await wait(safeDelay);
    }
  }

  throw lastError;
}

async function sendReceiptEmail({ to, amount, invoiceId }) {
  const subject = `Betaling registrert – Faktura #${invoiceId}`;
  const body = `Betalingen for faktura #${invoiceId} er registrert som mottatt. Takk for innbetalingen.`;
  return sendInvoiceEmail({ to, subject, text: body, html: body });
}

module.exports = { sendInvoiceEmail, sendReceiptEmail };
