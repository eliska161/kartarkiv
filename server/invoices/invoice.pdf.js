const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

async function makeInvoicePdf({
  sellerName = 'Kartarkiv',
  sellerOrg = 'Kartarkiv CO',
  buyerEmail,
  buyerName,
  invoiceId,
  amountNok,
  createdAt = new Date(),
  dueDate,
  kid,
  accountNumber,
  lineItems = [],
  baseUrl
}) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait (points)
  const { width } = page.getSize();
  const margin = 50;
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  let y = 780;
  const drawText = (text, x, font = regular, size = 12, color = rgb(0, 0, 0)) => {
    page.drawText(String(text || ''), { x, y, size, font, color });
    y -= size + 6;
  };

  // Header
  drawText(sellerName, margin, bold, 18);
  drawText(sellerOrg, margin, regular, 12, rgb(0.2, 0.2, 0.2));
  y -= 10;

  // Invoice meta
  drawText(`Faktura #${invoiceId}`, margin, bold, 16);
  drawText(`Dato: ${formatDate(createdAt)}`, margin);
  drawText(`Forfallsdato: ${formatDate(dueDate)}`, margin);
  drawText(`Konto: ${maskAccount(accountNumber)}`, margin);
  drawText(`KID: ${kid}`, margin);

  // Buyer
  y -= 10;
  drawText('Fakturamottaker:', margin, bold, 14);
  drawText(buyerName || buyerEmail, margin);
  if (buyerEmail) drawText(buyerEmail, margin);

  // Line items
  y -= 10;
  drawText('Detaljer:', margin, bold, 14);
  const colDesc = margin;
  const colAmt = width - margin - 120;

  if (Array.isArray(lineItems) && lineItems.length > 0) {
    for (const item of lineItems) {
      const desc = item.description || 'Linje';
      const qty = Math.max(1, Number(item.quantity || 1));
      const amt = Number(item.amount || 0);
      page.drawText(`${desc} (x${qty})`, { x: colDesc, y, size: 12, font: regular });
      page.drawText(nok(amt * qty), { x: colAmt, y, size: 12, font: regular });
      y -= 18;
    }
  }

  // Total
  y -= 6;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 18;
  page.drawText('Totalt', { x: colDesc, y, size: 14, font: bold });
  page.drawText(nok(amountNok), { x: colAmt, y, size: 14, font: bold });
  y -= 24;

  // Instructions
  const instructions = [
    `Betal til konto ${accountNumber} innen ${formatDate(dueDate)}.`,
    `Oppgi KID ${kid} ved betaling.`,
  ];
  if (baseUrl) instructions.push(`Les mer: ${baseUrl}`);
  for (const line of instructions) {
    drawText(line, margin, regular, 12, rgb(0.1, 0.1, 0.1));
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function maskAccount(value) {
  const v = String(value || '');
  if (v.length <= 4) return v;
  return `${'*'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}`;
}

function formatDate(d) {
  const dt = new Date(d);
  return new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
}

function nok(amount) {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(Number(amount || 0));
}

module.exports = { makeInvoicePdf };

