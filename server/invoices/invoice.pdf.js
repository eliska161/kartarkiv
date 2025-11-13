const fs = require('fs');
const path = require('path');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const LOGO_PATH = path.join(
  __dirname,
  '..',
  '..',
  'client',
  'public',
  'uploads',
  'logo',
  'kartarkiv.png'
);

let cachedLogoBytes;

function getLogoBytes() {
  if (cachedLogoBytes !== undefined) {
    return cachedLogoBytes;
  }

  try {
    cachedLogoBytes = fs.readFileSync(LOGO_PATH);
  } catch (error) {
    cachedLogoBytes = null;
    console.warn('⚠️  Could not load invoice PDF logo asset:', LOGO_PATH, error.message);
  }

  return cachedLogoBytes;
}

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
  const { width, height } = page.getSize();
  const margin = 48;
  const contentWidth = width - margin * 2;
  const headerHeight = 128;
  const protectedBottom = 72;

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const brandPrimary = rgb(23 / 255, 131 / 255, 76 / 255);
  const brandDark = rgb(15 / 255, 78 / 255, 47 / 255);
  const slate = rgb(71 / 255, 85 / 255, 105 / 255);
  const tableBorder = rgb(210 / 255, 222 / 255, 215 / 255);
  const textDark = rgb(24 / 255, 42 / 255, 30 / 255);
  const muted = rgb(120 / 255, 135 / 255, 123 / 255);
  const lightDivider = rgb(227 / 255, 236 / 255, 232 / 255);
  const white = rgb(1, 1, 1);

  let logoImage;
  const logoBytes = getLogoBytes();
  if (logoBytes) {
    try {
      logoImage = await pdfDoc.embedPng(logoBytes);
    } catch (error) {
      console.warn('⚠️  Failed to embed logo for invoice PDF:', error.message);
    }
  }

  const wrapText = (text, maxWidth, font = regular, size = 12) => {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [''];
    }
    const lines = [];
    let current = words.shift();
    for (const word of words) {
      const candidate = `${current} ${word}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) {
      lines.push(current);
    }
    return lines;
  };

  const drawRightAligned = (text, x, widthArea, yPos, font = regular, size = 12, color = textDark) => {
    const value = String(text || '');
    const textWidth = font.widthOfTextAtSize(value, size);
    const drawX = x + Math.max(0, widthArea - textWidth);
    page.drawText(value, { x: drawX, y: yPos, font, size, color });
  };

  // Header band
  page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: brandPrimary });

  const headerContentY = height - margin + 6;
  if (logoImage) {
    const logoHeight = 48;
    const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
    page.drawImage(logoImage, {
      x: margin,
      y: headerContentY - logoHeight,
      width: logoWidth,
      height: logoHeight
    });
  } else {
    page.drawText(String(sellerName), { x: margin, y: headerContentY - 34, size: 26, font: bold, color: white });
  }

  page.drawText('Faktura', { x: margin, y: headerContentY - 82, size: 20, font: bold, color: white });
  page.drawText(`#${invoiceId}`, { x: margin + 92, y: headerContentY - 82, size: 20, font: bold, color: white });
  if (sellerOrg) {
    page.drawText(String(sellerOrg), { x: margin, y: headerContentY - 108, size: 12, font: regular, color: white });
  }

  const metaColumnX = width - margin - 220;
  const metaEntries = [
    ['Dato', formatDate(createdAt)],
    ['Forfallsdato', formatDate(dueDate)],
    ['Kontonummer', accountNumber],
    ['KID', kid]
  ];

  let metaCursor = height - margin - 14;
  metaEntries.forEach(([label, value]) => {
    page.drawText(label, { x: metaColumnX, y: metaCursor + 10, size: 9, font: regular, color: lightDivider });
    page.drawText(String(value || ''), { x: metaColumnX, y: metaCursor - 4, size: 12, font: bold, color: white });
    metaCursor -= 30;
  });

  let y = height - headerHeight - 32;

  page.drawLine({
    start: { x: margin, y: y + 10 },
    end: { x: margin + contentWidth, y: y + 10 },
    thickness: 1,
    color: lightDivider
  });

  const buyerBlockTop = y;
  const buyerLineHeight = 16;
  page.drawText('Fakturamottaker', { x: margin, y: buyerBlockTop, size: 13, font: bold, color: brandDark });
  page.drawText(buyerName || buyerEmail || 'Ukjent mottaker', { x: margin, y: buyerBlockTop - buyerLineHeight, size: 12, font: regular, color: textDark });
  let buyerDetailsY = buyerBlockTop - buyerLineHeight * 2;
  if (buyerEmail) {
    page.drawText(buyerEmail, { x: margin, y: buyerDetailsY, size: 11, font: regular, color: slate });
    buyerDetailsY -= buyerLineHeight;
  }

  const issuerX = margin + contentWidth / 2 + 8;
  page.drawText('Utsteder', { x: issuerX, y: buyerBlockTop, size: 13, font: bold, color: brandDark });
  const issuerLine = sellerOrg ? `${sellerName} – ${sellerOrg}` : sellerName;
  page.drawText(String(issuerLine || sellerName), { x: issuerX, y: buyerBlockTop - buyerLineHeight, size: 12, font: regular, color: textDark });
  if (baseUrl) {
    page.drawText(String(baseUrl).replace(/\/$/, ''), { x: issuerX, y: buyerBlockTop - buyerLineHeight * 2, size: 11, font: regular, color: slate });
  }

  y = Math.min(buyerDetailsY, buyerBlockTop - buyerLineHeight * 3) - 24;

  page.drawText('Fakturadetaljer', { x: margin, y, size: 14, font: bold, color: brandDark });
  y -= 24;

  const columnWidths = [contentWidth * 0.52, contentWidth * 0.14, contentWidth * 0.14, contentWidth * 0.20];
  const columnX = [margin, margin + columnWidths[0], margin + columnWidths[0] + columnWidths[1], margin + columnWidths[0] + columnWidths[1] + columnWidths[2]];
  const headerRowHeight = 30;

  const lineRows = Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : [{ description: 'Ingen fakturalinjer', amount: 0, quantity: 0 }];

  const bodyRowHeights = lineRows.map(item => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    const descLines = wrapText(item?.description || 'Linje', columnWidths[0] - 24, regular, 11);
    const baseHeight = Math.max(24, descLines.length * 13 + 14);
    return { qty, descLines, amount: Number(item?.amount || 0), height: baseHeight };
  });

  const totalRowHeight = 34;
  const tableHeight = headerRowHeight + bodyRowHeights.reduce((sum, row) => sum + row.height, 0) + totalRowHeight;
  if (y - tableHeight < protectedBottom) {
    const offset = protectedBottom + tableHeight - y;
    y += offset;
  }

  let tableTop = y;
  const tableBottom = tableTop - tableHeight;

  const headerBottom = tableTop - headerRowHeight;
  page.drawRectangle({ x: margin, y: headerBottom, width: contentWidth, height: headerRowHeight, color: brandPrimary });

  const headerLabels = ['Beskrivelse', 'Antall', 'Pris', 'Sum'];
  headerLabels.forEach((label, index) => {
    const textX = columnX[index] + 10;
    if (index === 0) {
      page.drawText(label, {
        x: textX,
        y: headerBottom + headerRowHeight - 20,
        size: 11,
        font: bold,
        color: white
      });
    } else {
      drawRightAligned(label, columnX[index], columnWidths[index] - 12, headerBottom + headerRowHeight - 20, bold, 11, white);
    }
  });

  let rowTop = headerBottom;
  bodyRowHeights.forEach((row, rowIndex) => {
    const rowBottom = rowTop - row.height;
    page.drawLine({
      start: { x: margin, y: rowBottom },
      end: { x: margin + contentWidth, y: rowBottom },
      thickness: 0.5,
      color: lightDivider
    });

    row.descLines.forEach((line, idx) => {
      page.drawText(line, {
        x: margin + 12,
        y: rowTop - 18 - idx * 13,
        size: 11,
        font: regular,
        color: textDark
      });
    });

    const qtyY = rowBottom + row.height / 2 - 6;
    const qtyDisplay = row.qty > 0 ? row.qty : '-';
    drawRightAligned(qtyDisplay, columnX[1], columnWidths[1] - 12, qtyY, regular, 11, textDark);
    const unitAmount = row.amount;
    const unitFormatted = row.qty ? nok(unitAmount) : '-';
    const totalFormatted = row.qty ? nok(unitAmount * row.qty) : '-';
    drawRightAligned(unitFormatted, columnX[2], columnWidths[2] - 12, qtyY, regular, 11, textDark);
    drawRightAligned(totalFormatted, columnX[3], columnWidths[3] - 12, qtyY, bold, 11, brandDark);

    rowTop = rowBottom;
  });

  const totalBottom = tableBottom;
  const totalTop = totalBottom + totalRowHeight;
  page.drawLine({
    start: { x: margin, y: totalTop },
    end: { x: margin + contentWidth, y: totalTop },
    thickness: 0.75,
    color: tableBorder
  });
  drawRightAligned('Totalt å betale', columnX[2], columnWidths[2] + columnWidths[3] - 24, totalTop - 22, bold, 12, textDark);
  drawRightAligned(nok(amountNok), columnX[3], columnWidths[3] - 12, totalTop - 22, bold, 14, brandDark);

  y = tableBottom - 40;
  if (y < protectedBottom + 100) {
    y = protectedBottom + 100;
  }

  page.drawLine({
    start: { x: margin, y: y },
    end: { x: margin + contentWidth, y: y },
    thickness: 0.75,
    color: lightDivider
  });
  y -= 26;

  page.drawText('Betalingsinformasjon', { x: margin, y, size: 12, font: bold, color: brandDark });
  y -= 22;

  const paymentDetails = [
    ['Beløp', nok(amountNok)],
    ['Forfallsdato', formatDate(dueDate)],
    ['Kontonummer', accountNumber],
    ['KID', kid || '-']
  ];
  if (baseUrl) {
    paymentDetails.push(['Mer informasjon', String(baseUrl).replace(/\/$/, '')]);
  }

  paymentDetails.forEach(([label, value]) => {
    page.drawText(label, { x: margin, y, size: 11, font: bold, color: brandDark });
    page.drawText(String(value || ''), { x: margin + 140, y, size: 11, font: regular, color: textDark });
    y -= 18;
  });

  const footerY = Math.max(y - 24, protectedBottom);
  page.drawLine({
    start: { x: margin, y: footerY },
    end: { x: margin + contentWidth, y: footerY },
    thickness: 0.5,
    color: tableBorder
  });
  page.drawText('Takk for at du støtter Kartarkiv!', { x: margin, y: footerY - 18, size: 10, font: regular, color: muted });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function formatDate(d) {
  const dt = new Date(d);
  return new Intl.DateTimeFormat('nb-NO', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(dt);
}

function nok(amount) {
  return new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(Number(amount || 0));
}

module.exports = { makeInvoicePdf };

