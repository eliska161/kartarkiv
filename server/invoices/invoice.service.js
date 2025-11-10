const pool = require('../database/connection');
const { generateKid } = require('./invoice.kid');
const { makeInvoicePdf } = require('./invoice.pdf');
const { sendInvoiceEmail } = require('./invoice.email');

async function createKidForInvoiceId(id) {
  const base = String(id).padStart(7, '0');
  return generateKid(base);
}

async function createAndSendInvoice({ invoiceId, email, name, amountNok, accountNumber, dueDate, lineItems }) {
  if (!invoiceId) throw new Error('invoiceId required');
  const kid = await createKidForInvoiceId(invoiceId);

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
    accountNumber,
    lineItems,
    baseUrl: process.env.BASE_URL
  });

  const subject = `Faktura #${invoiceId} – Kartarkiv`;
  const body = [
    `Hei ${name || ''}`.trim(),
    '',
    `Vedlagt finner du faktura #${invoiceId} på ${amountNok} NOK.`,
    `Betal til konto ${accountNumber} og oppgi KID ${kid} innen ${formatDate(dueDate)}.`,
    '',
    'Takk!'
  ].join('\n');

  await sendInvoiceEmail({ to: email, subject, text: body, html: body, pdfBuffer, filename: `invoice-${invoiceId}.pdf` });

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
    [kid, accountNumber, invoiceId]
  );

  return { kid };
}

function formatDate(d) {
  const dt = new Date(d);
  return new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
}

module.exports = { createAndSendInvoice, createKidForInvoiceId };

