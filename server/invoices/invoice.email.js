const nodemailer = require('nodemailer');

const LOG_PREFIX = '[InvoiceEmail]';

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

const DEADLINE_SAFETY_BUFFER_MS = 500;
const MINIMUM_ATTEMPT_BUDGET_MS = 1500;

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

function createOverallTimeoutError(attempt, context) {
  const error = new Error('SMTP overall timeout exceeded');
  error.code = 'ETIMEDOUT';
  error.command = 'OVERALL_TIMEOUT';
  if (Number.isFinite(attempt) && attempt > 0) {
    error.attempts = attempt;
  }
  if (context) {
    error.context = context;
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

function sendMailWithBudget(transport, mailOptions, attempt, budgetMs) {
  const effectiveBudget = Math.max(MINIMUM_ATTEMPT_BUDGET_MS, budgetMs);

  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      try {
        if (typeof transport.close === 'function') {
          transport.close();
        }
      } catch (closeError) {
        console.warn(`${LOG_PREFIX} Failed to close SMTP transport after timeout`, closeError);
      }
      reject(
        createOverallTimeoutError(attempt, {
          stage: 'sendMailWithBudget',
          budgetMs,
          effectiveBudget,
          to: mailOptions?.to
        })
      );
    }, effectiveBudget);

    transport.sendMail(mailOptions, (error, info) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeoutId);
      if (error) {
        reject(error);
        return;
      }
      resolve(info);
    });
  });
}

async function sendInvoiceEmail({ to, from, subject, text, html, pdfBuffer, filename = 'invoice.pdf' }) {
  const attempts = Math.max(1, resolveRetryAttempts());
  const deadline = Date.now() + resolveOverallTimeoutMs();
  let lastError = null;

  const mailOptions = {
    to,
    from: from || process.env.EMAIL_FROM || 'Kartarkiv <noreply@kartarkiv.co>',
    subject,
    text,
    html,
    attachments: pdfBuffer ? [{ filename, content: pdfBuffer, contentType: 'application/pdf' }] : []
  };

  console.info(
    `${LOG_PREFIX} Starting invoice email send. to=${to} subject="${subject}" attempts=${attempts} deadlineMs=${new Date(deadline).toISOString()} overallTimeoutMs=${deadline - Date.now()}`
  );

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const timeRemaining = deadline - Date.now();
    if (timeRemaining <= DEADLINE_SAFETY_BUFFER_MS) {
      console.error(
        `${LOG_PREFIX} Overall timeout hit before attempt ${attempt}. remainingMs=${timeRemaining}`
      );
      lastError = createOverallTimeoutError(attempt - 1, {
        stage: 'pre-attempt',
        remainingMs: timeRemaining
      });
      break;
    }

    const transport = buildTransport();
    if (!transport) {
      if (attempt === 1) {
        console.warn(
          `${LOG_PREFIX} Email transport not configured; pretending to send email to ${to}`
        );
        return { accepted: [to], messageId: 'mock-email', preview: true };
      }
      lastError = new Error('SMTP transport misconfigured during retry');
      break;
    }

    try {
      const attemptBudget = Math.max(
        MINIMUM_ATTEMPT_BUDGET_MS,
        timeRemaining - DEADLINE_SAFETY_BUFFER_MS
      );
      console.info(
        `${LOG_PREFIX} Attempt ${attempt}/${attempts} starting. timeRemainingMs=${timeRemaining} attemptBudgetMs=${attemptBudget}`
      );
      const info = await sendMailWithBudget(transport, mailOptions, attempt, attemptBudget);

      if (attempt > 1) {
        console.info(`${LOG_PREFIX} Invoice email send succeeded on retry attempt ${attempt}.`);
      }

      return info;
    } catch (error) {
      lastError = error;
      console.error(
        `${LOG_PREFIX} Attempt ${attempt} failed. code=${error?.code} command=${error?.command} message=${error?.message}`,
        error
      );
      const shouldRetry = attempt < attempts && isRetryableSmtpError(error);
      if (!shouldRetry) {
        if (error && typeof error === 'object') {
          error.attempts = attempt;
        }
        break;
      }

      const remainingBeforeDelay = deadline - Date.now();
      if (remainingBeforeDelay <= DEADLINE_SAFETY_BUFFER_MS + MINIMUM_ATTEMPT_BUDGET_MS) {
        console.error(
          `${LOG_PREFIX} Not enough time remaining for another attempt. remainingMs=${remainingBeforeDelay}`
        );
        lastError = createOverallTimeoutError(attempt, {
          stage: 'retry-budget',
          remainingMs: remainingBeforeDelay
        });
        break;
      }

      const plannedDelay = Math.min(30000, 2000 * Math.pow(2, attempt - 1));
      const safeDelay = Math.min(
        plannedDelay,
        Math.max(0, remainingBeforeDelay - DEADLINE_SAFETY_BUFFER_MS - MINIMUM_ATTEMPT_BUDGET_MS)
      );
      if (safeDelay <= 0) {
        console.error(
          `${LOG_PREFIX} Calculated safe delay <= 0. plannedDelay=${plannedDelay} remainingBeforeDelay=${remainingBeforeDelay}`
        );
        lastError = createOverallTimeoutError(attempt, {
          stage: 'delay-calculation',
          plannedDelay,
          remainingBeforeDelay
        });
        break;
      }
      console.warn(
        `${LOG_PREFIX} Attempt ${attempt} failed (${error.code || error.message}). Retrying in ${safeDelay}ms (plannedDelay=${plannedDelay}).`
      );
      await wait(safeDelay);
    } finally {
      try {
        if (typeof transport?.close === 'function') {
          transport.close();
        }
      } catch (closeError) {
        console.warn(`${LOG_PREFIX} Failed to close SMTP transport cleanly`, closeError);
      }
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
