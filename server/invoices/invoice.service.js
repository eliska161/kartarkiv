const pool = require('../database/connection');
const { generateKid } = require('./invoice.kid');
const { makeInvoicePdf } = require('./invoice.pdf');
const { sendInvoiceEmail } = require('./invoice.email');

const LOGO_URL = 'https://i.ibb.co/PZmKX4sH/logo-uptime.png';

function resolveAccountNumber(provided) {
  return (
    process.env.INVOICE_ACCOUNT_NUMBER ||
    provided ||
    process.env.SB1_ACCOUNT_NUMBER ||
    '00000000000'
  );
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(Number(amount || 0));
}

function sanitizeText(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function buildInvoiceEmailHtml({
  name,
  invoiceId,
  amount,
  dueDate,
  accountNumber,
  kid,
  issuedDate,
  lineItems,
  baseUrl
}) {
  const logoDataUrl = LOGO_URL || null;
  const safeName = sanitizeText(name || '');
  const safeDue = sanitizeText(dueDate);
  const safeAccount = sanitizeText(accountNumber);
  const safeKid = sanitizeText(kid);
  const safeAmount = sanitizeText(amount);
  const safeIssued = sanitizeText(issuedDate);
  const rows = Array.isArray(lineItems) && lineItems.length > 0
    ? lineItems
        .map(item => {
          const qty = Math.max(1, Number(item?.quantity || 1));
          const unit = formatCurrency(item?.amount || 0);
          const total = formatCurrency((item?.amount || 0) * qty);
          const description = sanitizeText(item?.description || 'Linje');
          return `
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;line-height:1.4;color:#0f4e2f;">
                ${description}
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:center;color:#0f4e2f;white-space:nowrap;">
                ${qty}
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;color:#0f4e2f;white-space:nowrap;">
                ${unit}
              </td>
              <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-size:14px;text-align:right;color:#0f4e2f;font-weight:600;white-space:nowrap;">
                ${total}
              </td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td colspan="4" style="padding:16px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;font-size:14px;">
          Ingen fakturalinjer registrert.
        </td>
      </tr>
    `;

  const summaryUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/admin/betaling` : null;

  return `<!DOCTYPE html>
  <html lang="nb">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Faktura #${sanitizeText(invoiceId)}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f2fbf6;font-family:'Inter','Helvetica Neue',Arial,sans-serif;color:#0f4e2f;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 0;">
        <tr>
          <td align="center" style="padding:0 16px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 20px 40px rgba(17,63,45,0.12);">
              <tr>
                <td style="background-color:#17834c;padding:32px 40px 28px 40px;color:#ffffff;">
                  ${logoDataUrl
                    ? `<img src="${logoDataUrl}" alt="Kartarkiv" style="height:44px;display:block;margin-bottom:20px;" />`
                    : `<div style="font-size:28px;font-weight:700;margin-bottom:12px;">Kartarkiv</div>`}
                  <div style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.7);">
                    Faktura ${sanitizeText(invoiceId)}
                  </div>
                  <div style="font-size:28px;font-weight:700;margin-top:4px;">${safeAmount}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 40px 16px 40px;">
                  <p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;">Hei ${safeName || 'der'},</p>
                  <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#334155;">
                    Vedlagt finner du faktura <strong>#${sanitizeText(invoiceId)}</strong>. Nedenfor finner du en oversikt over beløp og betalingsinformasjon. Husk å betale innen forfallsdatoen.
                  </p>

                  <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:separate;border-spacing:0 12px;">
                    <tr>
                      <td style="background:#f8fafc;padding:16px 20px;border-radius:14px;">
                        <div style="display:flex;flex-wrap:wrap;gap:16px;">
                          <div style="flex:1;min-width:160px;">
                            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Forfallsdato</div>
                            <div style="font-size:16px;font-weight:600;">${safeDue}</div>
                          </div>
                          <div style="flex:1;min-width:160px;">
                            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Konto</div>
                            <div style="font-size:16px;font-weight:600;">${safeAccount}</div>
                          </div>
                          <div style="flex:1;min-width:160px;">
                            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">KID</div>
                            <div style="font-size:16px;font-weight:600;">${safeKid}</div>
                          </div>
                          <div style="flex:1;min-width:160px;">
                            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.08em;color:#64748b;margin-bottom:4px;">Utsendt</div>
                            <div style="font-size:16px;font-weight:600;">${safeIssued}</div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <h3 style="font-size:15px;margin:32px 0 12px 0;color:#0f4e2f;text-transform:uppercase;letter-spacing:0.12em;">Fakturadetaljer</h3>
                  <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;border-radius:14px;overflow:hidden;">
                    <thead>
                      <tr>
                        <th align="left" style="padding:14px 16px;background:#0f4e2f;color:#ffffff;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Beskrivelse</th>
                        <th align="center" style="padding:14px 16px;background:#0f4e2f;color:#ffffff;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Antall</th>
                        <th align="right" style="padding:14px 16px;background:#0f4e2f;color:#ffffff;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Pris</th>
                        <th align="right" style="padding:14px 16px;background:#0f4e2f;color:#ffffff;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;">Sum</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rows}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colspan="3" style="padding:18px 16px;background:#f8fafc;font-size:15px;font-weight:600;text-align:right;border-top:1px solid #d6e3dd;color:#0f4e2f;">Totalt å betale</td>
                        <td style="padding:18px 16px;background:#f8fafc;font-size:18px;font-weight:700;text-align:right;border-top:1px solid #d6e3dd;color:#17834c;">${safeAmount}</td>
                      </tr>
                    </tfoot>
                  </table>

                  <p style="margin:28px 0 0 0;font-size:14px;line-height:1.6;color:#475569;">
                    Betalingsinformasjon: Bruk kontonummer <strong>${safeAccount}</strong> og oppgi KID <strong>${safeKid}</strong> ved betaling. Fakturaen forfaller <strong>${safeDue}</strong>.
                  </p>
                  ${summaryUrl
                    ? `<div style="margin:32px 0 8px 0;">
                        <a href="${summaryUrl}" style="display:inline-block;background:#17834c;color:#ffffff;text-decoration:none;padding:14px 26px;border-radius:999px;font-weight:600;font-size:15px;">Åpne fakturaoversikt</a>
                      </div>`
                    : ''}
                  <p style="margin:24px 0 0 0;font-size:14px;color:#64748b;">Har du spørsmål? Ta kontakt med oss ved å svare på denne e-posten.</p>
                  <p style="margin:24px 0 0 0;font-size:14px;color:#0f4e2f;font-weight:600;">Takk for samarbeidet!<br/>Kartarkiv-teamet</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

async function createKidForInvoiceId(id) {
  const base = String(id).padStart(7, '0');
  return generateKid(base);
}

async function createAndSendInvoice({ invoiceId, email, name, amountNok, accountNumber, dueDate, lineItems }) {
  if (!invoiceId) throw new Error('invoiceId required');
  const kid = await createKidForInvoiceId(invoiceId);
  const resolvedAccountNumber = resolveAccountNumber(accountNumber);
  const issuedDate = formatDate(new Date());
  const formattedAmount = formatCurrency(amountNok);
  const formattedDueDate = formatDate(dueDate || new Date(Date.now() + 14 * 86400000));

  const pdfBuffer = await makeInvoicePdf({
    sellerName: 'Kartarkiv',
    sellerOrg: 'EOK',
    buyerEmail: email,
    buyerName: name,
    invoiceId,
    amountNok,
    createdAt: new Date(),
    dueDate: dueDate || new Date(Date.now() + 14 * 86400000),
    kid,
    accountNumber: resolvedAccountNumber,
    lineItems,
    baseUrl: process.env.BASE_URL
  });

  const subject = `Faktura #${invoiceId} | Kartarkiv`;
  const body = [
    `Hei ${name || ''}`.trim(),
    '',
    `Vedlagt finner du faktura #${invoiceId} på ${formattedAmount}.`,
    `Betal til konto ${resolvedAccountNumber} og oppgi KID ${kid} innen ${formattedDueDate}.`,
    '',
    'Takk!'
  ].join('\n');

  try {
    await sendInvoiceEmail({
      to: email,
      subject,
      text: body,
      html: buildInvoiceEmailHtml({
        name,
        invoiceId,
        amount: formattedAmount,
        dueDate: formattedDueDate,
        accountNumber: resolvedAccountNumber,
        kid,
        issuedDate,
        lineItems,
        baseUrl: process.env.BASE_URL
      }),
      pdfBuffer,
      filename: `invoice-${invoiceId}.pdf`
    });
  } catch (error) {
    console.error('Failed to send invoice email for', invoiceId, error);
    throw error;
  }

  // Persist invoice metadata only after the email has been sent successfully
  await pool.query(
    `UPDATE club_invoices
     SET
       status = 'invoice_requested',
       invoice_requested_at = NOW(),
       kid = $1,
       account_number = $2,
       pdf_url = COALESCE(pdf_url, NULL),
       paid = COALESCE(paid, FALSE),
       updated_at = NOW()
     WHERE id = $3`,
    [kid, resolvedAccountNumber, invoiceId]
  );

  return { kid };
}

function formatDate(d) {
  const dt = new Date(d);
  return new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
}

module.exports = { createAndSendInvoice, createKidForInvoiceId };
