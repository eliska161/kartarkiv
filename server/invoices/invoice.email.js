const nodemailer = require('nodemailer');
const dns = require('dns').promises;
const net = require('net');

const RESEND_EMAIL_ENDPOINT = process.env.RESEND_API_URL || 'https://api.resend.com/emails';

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

const RESEND_RETRYABLE_STATUS = new Set([408, 409, 425, 429]);

const DEADLINE_SAFETY_BUFFER_MS = 500;
const MINIMUM_ATTEMPT_BUDGET_MS = 1500;

let smtpDiagnosticsPromise = null;

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

function hasResendConfiguration() {
  return Boolean(process.env.RESEND_API_KEY);
}

function hasSmtpConfiguration() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
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

function probeSmtpPort(host, port, timeoutMs) {
  return new Promise(resolve => {
    const start = Date.now();
    let socket;
    let timer;
    let settled = false;

    const finalize = result => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (socket) {
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch (cleanupError) {
          console.warn(`${LOG_PREFIX} Failed to clean up SMTP probe socket`, cleanupError);
        }
      }
      const durationMs = Date.now() - start;
      resolve({
        ok: result?.ok === true,
        reason: result?.reason,
        error: result?.error,
        durationMs
      });
    };

    try {
      socket = net.createConnection({ host, port });
    } catch (error) {
      finalize({ ok: false, reason: 'error', error });
      return;
    }

    timer = setTimeout(() => finalize({ ok: false, reason: 'timeout' }), timeoutMs);

    socket.once('connect', () => finalize({ ok: true }));
    socket.once('error', error => finalize({ ok: false, reason: 'error', error }));
    socket.setTimeout(timeoutMs, () => finalize({ ok: false, reason: 'timeout' }));
  });
}

async function gatherSmtpDiagnostics() {
  if (!hasSmtpConfiguration()) {
    console.warn(`${LOG_PREFIX} SMTP diagnostics skipped because configuration is incomplete.`);
    return;
  }

  const { SMTP_HOST, SMTP_PORT } = process.env;
  const port = Number(SMTP_PORT) || 587;
  const secure = port === 465;
  const connectionTimeout = parseTimeout(process.env.SMTP_CONNECTION_TIMEOUT, 20000);
  const greetingTimeout = parseTimeout(process.env.SMTP_GREETING_TIMEOUT, 20000);
  const socketTimeout = parseTimeout(process.env.SMTP_SOCKET_TIMEOUT, 45000);

  console.info(
    `${LOG_PREFIX} SMTP configuration summary host=${SMTP_HOST} port=${port} secure=${secure} ` +
      `connectionTimeout=${connectionTimeout}ms greetingTimeout=${greetingTimeout}ms socketTimeout=${socketTimeout}ms`
  );

  const dnsTimeoutMs = parseTimeout(process.env.SMTP_DNS_TIMEOUT, 2000);
  try {
    const lookupPromise = dns.lookup(SMTP_HOST, { all: true });
    const records = await Promise.race([
      lookupPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`DNS lookup timed out after ${dnsTimeoutMs}ms`)), dnsTimeoutMs)
      )
    ]);

    const addresses = Array.isArray(records) ? records : [records];
    if (!addresses.length) {
      console.warn(`${LOG_PREFIX} DNS lookup for ${SMTP_HOST} returned no addresses.`);
    } else {
      const formatted = addresses
        .map(entry => `${entry.address}/${entry.family === 6 ? 'IPv6' : 'IPv4'}`)
        .join(', ');
      console.info(`${LOG_PREFIX} DNS lookup results for ${SMTP_HOST}: ${formatted}`);
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} SMTP DNS lookup failed for ${SMTP_HOST}: ${error.message}`, error);
  }

  const probeTimeoutMs = parseTimeout(process.env.SMTP_PROBE_TIMEOUT, 3000);
  try {
    const result = await probeSmtpPort(SMTP_HOST, port, probeTimeoutMs);
    if (result.ok) {
      console.info(
        `${LOG_PREFIX} SMTP connectivity probe succeeded in ${result.durationMs}ms (host=${SMTP_HOST} port=${port}).`
      );
    } else if (result.reason === 'timeout') {
      console.error(
        `${LOG_PREFIX} SMTP connectivity probe timed out after ${probeTimeoutMs}ms (host=${SMTP_HOST} port=${port}). ` +
          'The SMTP server may be unreachable from this environment.'
      );
    } else {
      console.error(
        `${LOG_PREFIX} SMTP connectivity probe failed (${result.error?.code || result.error?.message || result.reason}) ` +
          `(host=${SMTP_HOST} port=${port}).`,
        result.error
      );
    }
  } catch (probeError) {
    console.error(`${LOG_PREFIX} Unexpected error during SMTP connectivity probe`, probeError);
  }
}

async function ensureSmtpDiagnostics() {
  if (!hasSmtpConfiguration()) {
    return;
  }
  if (!smtpDiagnosticsPromise) {
    smtpDiagnosticsPromise = gatherSmtpDiagnostics().catch(error => {
      console.error(`${LOG_PREFIX} Failed to collect SMTP diagnostics`, error);
    });
  }
  await smtpDiagnosticsPromise;
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

function normalizeRecipients(to) {
  if (!to) {
    return [];
  }
  if (Array.isArray(to)) {
    return to.filter(Boolean);
  }
  return String(to)
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function mapAttachmentsForResend(attachments = []) {
  return attachments
    .map(attachment => {
      if (!attachment) {
        return null;
      }
      const { filename, content, contentType } = attachment;
      if (!content) {
        return null;
      }
      let base64Content;
      if (Buffer.isBuffer(content)) {
        base64Content = content.toString('base64');
      } else if (typeof content === 'string') {
        base64Content = Buffer.from(content).toString('base64');
      } else {
        return null;
      }
      return {
        filename: filename || 'attachment',
        content: base64Content,
        content_type: contentType || 'application/octet-stream'
      };
    })
    .filter(Boolean);
}

async function sendViaResend(mailOptions, attempt, budgetMs) {
  const effectiveBudget = Math.max(MINIMUM_ATTEMPT_BUDGET_MS, budgetMs);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), effectiveBudget);
  try {
    const recipients = normalizeRecipients(mailOptions.to);
    if (!recipients.length) {
      const error = new Error('Resend requires at least one recipient');
      error.code = 'RESEND_NO_RECIPIENTS';
      error.provider = 'resend';
      error.retryable = false;
      throw error;
    }

    const payload = {
      from: mailOptions.from,
      to: recipients,
      subject: mailOptions.subject,
      html: mailOptions.html || undefined,
      text: mailOptions.text || undefined
    };

    const attachments = mapAttachmentsForResend(mailOptions.attachments);
    if (attachments.length) {
      payload.attachments = attachments;
    }

    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const bodyText = await response.text();
    let parsedBody;
    if (bodyText) {
      try {
        parsedBody = JSON.parse(bodyText);
      } catch (parseError) {
        parsedBody = bodyText;
      }
    }

    if (!response.ok) {
      const error = new Error(
        `Resend request failed with status ${response.status}${
          parsedBody && parsedBody.error ? `: ${parsedBody.error.message || parsedBody.error}` : ''
        }`
      );
      error.provider = 'resend';
      error.status = response.status;
      error.code = `RESEND_${response.status}`;
      error.retryable = response.status >= 500 || RESEND_RETRYABLE_STATUS.has(response.status);
      error.body = parsedBody;
      throw error;
    }

    return {
      provider: 'resend',
      accepted: recipients,
      messageId: parsedBody?.id || parsedBody?.data?.id || 'resend:unknown',
      response: parsedBody
    };
  } catch (error) {
    if (error && typeof error === 'object') {
      error.provider = error.provider || 'resend';
      if (error.name === 'AbortError') {
        const timeoutError = createOverallTimeoutError(attempt, {
          stage: 'resend-fetch',
          budgetMs,
          effectiveBudget,
          to: mailOptions?.to
        });
        timeoutError.provider = 'resend';
        throw timeoutError;
      }
      if (!error.code) {
        error.code = 'RESEND_ERROR';
      }
      if (error instanceof TypeError && typeof error.retryable === 'undefined') {
        error.retryable = true;
      }
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRetryableEmailError(error) {
  if (!error) {
    return false;
  }

  if (error.provider === 'resend') {
    if (typeof error.retryable === 'boolean') {
      return error.retryable;
    }
    if (typeof error.status === 'number') {
      return error.status >= 500 || RESEND_RETRYABLE_STATUS.has(error.status);
    }
    const message = String(error.message || '').toLowerCase();
    return message.includes('timed out') || message.includes('timeout');
  }

  return isRetryableSmtpError(error);
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

  let usingResend = hasResendConfiguration();

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

    const provider = usingResend ? 'resend' : 'smtp';

    try {
      const attemptBudget = Math.max(
        MINIMUM_ATTEMPT_BUDGET_MS,
        timeRemaining - DEADLINE_SAFETY_BUFFER_MS
      );
      console.info(
        `${LOG_PREFIX} Attempt ${attempt}/${attempts} starting. provider=${provider} timeRemainingMs=${timeRemaining} attemptBudgetMs=${attemptBudget}`
      );
      let info;
      let transport = null;
      try {
        if (provider === 'resend') {
          info = await sendViaResend(mailOptions, attempt, attemptBudget);
        } else {
          await ensureSmtpDiagnostics();
          transport = buildTransport();
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
          info = await sendMailWithBudget(transport, mailOptions, attempt, attemptBudget);
        }
      } finally {
        if (provider === 'smtp' && transport) {
          try {
            if (typeof transport.close === 'function') {
              transport.close();
            }
          } catch (closeError) {
            console.warn(`${LOG_PREFIX} Failed to close SMTP transport cleanly`, closeError);
          }
        }
      }

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
      if (provider === 'smtp') {
        const { SMTP_HOST, SMTP_PORT } = process.env;
        if (error?.command === 'CONN' || error?.code === 'ETIMEDOUT') {
          const hostLabel = `${SMTP_HOST || 'undefined-host'}:${SMTP_PORT || 'undefined-port'}`;
          const codeLabel = error?.code || error?.errno || 'unknown';
          console.error(
            `${LOG_PREFIX} SMTP connection to ${hostLabel} failed (${codeLabel}). ` +
              'Verify network access, firewall rules, and that the SMTP service is reachable from the server.'
          );
        }
      }
      if (provider === 'resend' && !isRetryableEmailError(error) && hasSmtpConfiguration()) {
        console.warn(
          `${LOG_PREFIX} Resend failed with non-retryable error; switching to SMTP fallback for remaining attempts.`
        );
        usingResend = false;
        attempt -= 1;
        continue;
      }

      const shouldRetry = attempt < attempts && isRetryableEmailError(error);
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
