const nodemailer = require('nodemailer');

function buildTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      // Fail fast on network issues so API calls don't block too long
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      // requireTLS: true, // uncomment if provider requires TLS on 587
      // tls: { rejectUnauthorized: false } // only if provider uses self-signed certs
    });
  }
  return null;
}

async function sendInvoiceEmail({ to, from, subject, text, html, pdfBuffer, filename = 'invoice.pdf' }) {
  const transport = buildTransport();
  if (!transport) {
    console.warn('Email transport not configured; pretending to send email to', to);
    return { accepted: [to], messageId: 'mock-email', preview: true };
  }
  const info = await transport.sendMail({
    to,
    from: from || process.env.EMAIL_FROM || 'Kartarkiv <noreply@kartarkiv.co>',
    subject,
    text,
    html,
    attachments: pdfBuffer ? [{ filename, content: pdfBuffer, contentType: 'application/pdf' }] : []
  });
  return info;
}

async function sendReceiptEmail({ to, amount, invoiceId }) {
  const subject = `Betaling registrert – Faktura #${invoiceId}`;
  const body = `Betalingen for faktura #${invoiceId} er registrert som mottatt. Takk for innbetalingen.`;
  return sendInvoiceEmail({ to, subject, text: body, html: body });
}

module.exports = { sendInvoiceEmail, sendReceiptEmail };
