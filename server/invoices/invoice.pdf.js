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
  const { width, height } = page.getSize();
  const margin = 40;
  const contentWidth = width - margin * 2;
  const headerHeight = 110;
  const slipHeight = 170;
  const slipBottomMargin = 40;
  const protectedBottom = slipBottomMargin + slipHeight + 24;

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const brandPrimary = rgb(23 / 255, 131 / 255, 76 / 255);
  const brandDark = rgb(15 / 255, 78 / 255, 47 / 255);
  const brandSoft = rgb(242 / 255, 251 / 255, 246 / 255);
  const slate = rgb(71 / 255, 85 / 255, 105 / 255);
  const tableBorder = rgb(210 / 255, 224 / 255, 216 / 255);
  const giroYellow = rgb(252 / 255, 227 / 255, 125 / 255);
  const textDark = rgb(24 / 255, 42 / 255, 30 / 255);

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

  const ensureSpace = required => {
    if (y - required < protectedBottom) {
      y = protectedBottom + required;
    }
  };

  // Header band
  page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: brandPrimary });
  page.drawRectangle({ x: 0, y: height - headerHeight - 14, width, height: 14, color: brandDark });

  const headerTextY = height - 50;
  page.drawText(String(sellerName), { x: margin, y: headerTextY, size: 26, font: bold, color: rgb(1, 1, 1) });
  page.drawText(String(sellerOrg), { x: margin, y: headerTextY - 22, size: 12, font: regular, color: rgb(1, 1, 1) });

  const metaWidth = 220;
  const metaX = width - margin - metaWidth;
  let metaY = height - 40;
  const drawMeta = (label, value) => {
    const labelSize = 10;
    const valueSize = 14;
    const labelColor = rgb(220 / 255, 235 / 255, 226 / 255);
    const valueColor = rgb(1, 1, 1);
    drawRightAligned(String(label), metaX, metaWidth, metaY, regular, labelSize, labelColor);
    metaY -= labelSize + 4;
    drawRightAligned(String(value || ''), metaX, metaWidth, metaY, bold, valueSize, valueColor);
    metaY -= valueSize + 10;
  };

  drawMeta('Fakturanr.', `#${invoiceId}`);
  drawMeta('Dato', formatDate(createdAt));
  drawMeta('Forfallsdato', formatDate(dueDate));
  drawMeta('Konto', accountNumber);
  drawMeta('KID', kid);

  let y = height - headerHeight - 50;

  const drawBodyText = ({ text, x = margin, size = 12, font = regular, color = textDark, gap = size + 6 }) => {
    ensureSpace(gap);
    page.drawText(String(text || ''), { x, y, size, font, color });
    y -= gap;
  };

  drawBodyText({ text: 'Fakturamottaker', font: bold, size: 14, color: brandDark, gap: 18 });
  drawBodyText({ text: buyerName || buyerEmail, size: 12, color: textDark, gap: 16 });
  if (buyerEmail) {
    drawBodyText({ text: buyerEmail, size: 11, color: slate, gap: 18 });
  }

  drawBodyText({ text: 'Fakturadetaljer', font: bold, size: 14, color: brandDark, gap: 20 });

  const columnWidths = [contentWidth * 0.5, contentWidth * 0.16, contentWidth * 0.14, contentWidth * 0.20];
  const columnX = [margin, margin + columnWidths[0], margin + columnWidths[0] + columnWidths[1], margin + columnWidths[0] + columnWidths[1] + columnWidths[2]];
  const headerRowHeight = 28;

  const lineRows = Array.isArray(lineItems) && lineItems.length > 0 ? lineItems : [{ description: 'Ingen fakturalinjer', amount: 0, quantity: 0 }];

  const bodyRowHeights = lineRows.map(item => {
    const qty = Math.max(1, Number(item?.quantity || 1));
    const descLines = wrapText(item?.description || 'Linje', columnWidths[0] - 24, regular, 11);
    const baseHeight = Math.max(22, descLines.length * 13 + 12);
    return { qty, descLines, amount: Number(item?.amount || 0), height: baseHeight };
  });

  const totalRowHeight = 32;
  const tableHeight = headerRowHeight + bodyRowHeights.reduce((sum, row) => sum + row.height, 0) + totalRowHeight;
  if (y - tableHeight < protectedBottom) {
    const offset = protectedBottom + tableHeight - y;
    y += offset;
  }

  let tableTop = y;
  const tableBottom = tableTop - tableHeight;

  page.drawRectangle({ x: margin, y: tableBottom, width: contentWidth, height: tableHeight, color: rgb(1, 1, 1) });
  const headerBottom = tableTop - headerRowHeight;
  page.drawRectangle({ x: margin, y: headerBottom, width: contentWidth, height: headerRowHeight, color: brandDark });

  const headerLabels = ['Beskrivelse', 'Antall', 'Pris', 'Sum'];
  headerLabels.forEach((label, index) => {
    const textX = columnX[index] + 10;
    if (index === 0) {
      page.drawText(label, {
        x: textX,
        y: headerBottom + headerRowHeight - 18,
        size: 11,
        font: bold,
        color: rgb(1, 1, 1)
      });
    } else {
      drawRightAligned(label, columnX[index], columnWidths[index] - 12, headerBottom + headerRowHeight - 18, bold, 11, rgb(1, 1, 1));
    }
  });

  let rowTop = headerBottom;
  bodyRowHeights.forEach((row, rowIndex) => {
    const rowBottom = rowTop - row.height;
    const fillColor = rowIndex % 2 === 0 ? brandSoft : rgb(1, 1, 1);
    page.drawRectangle({ x: margin, y: rowBottom, width: contentWidth, height: row.height, color: fillColor });
    page.drawLine({
      start: { x: margin, y: rowBottom },
      end: { x: margin + contentWidth, y: rowBottom },
      thickness: 0.5,
      color: tableBorder
    });

    row.descLines.forEach((line, idx) => {
      page.drawText(line, {
        x: margin + 12,
        y: rowTop - 16 - idx * 13,
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
  page.drawRectangle({ x: margin, y: totalBottom, width: contentWidth, height: totalRowHeight, color: brandSoft });
  page.drawLine({
    start: { x: margin, y: totalBottom },
    end: { x: margin + contentWidth, y: totalBottom },
    thickness: 0.75,
    color: tableBorder
  });
  drawRightAligned('Totalt å betale', columnX[2], columnWidths[2] + columnWidths[3] - 24, totalTop - 20, bold, 12, textDark);
  drawRightAligned(nok(amountNok), columnX[3], columnWidths[3] - 12, totalTop - 20, bold, 14, brandDark);

  y = tableBottom - 36;
  if (y < protectedBottom + 90) {
    y = protectedBottom + 90;
  }

  const infoBoxHeight = 86;
  const infoBottom = y - infoBoxHeight;
  page.drawRectangle({ x: margin, y: infoBottom, width: contentWidth, height: infoBoxHeight, color: brandSoft });
  page.drawRectangle({ x: margin, y: infoBottom, width: contentWidth, height: 2, color: brandPrimary });
  page.drawText('Betalingsinformasjon', {
    x: margin + 16,
    y: y - 22,
    size: 12,
    font: bold,
    color: brandDark
  });
  const instructionLines = [
    `Beløp: ${nok(amountNok)}`,
    `Forfallsdato: ${formatDate(dueDate)}`,
    `Kontonummer: ${accountNumber}`,
    `KID: ${kid}`
  ];
  if (baseUrl) {
    instructionLines.push(`Mer informasjon: ${baseUrl}`);
  }
  let infoLineY = y - 42;
  instructionLines.forEach(line => {
    page.drawText(line, {
      x: margin + 16,
      y: infoLineY,
      size: 11,
      font: regular,
      color: textDark
    });
    infoLineY -= 14;
  });

  // Norwegian giro-style payment slip
  const slipY = slipBottomMargin;
  const slipX = margin;
  page.drawRectangle({ x: slipX, y: slipY, width: contentWidth, height: slipHeight, color: giroYellow });
  page.drawRectangle({ x: slipX, y: slipY + slipHeight - 40, width: contentWidth, height: 40, color: rgb(1, 1, 1) });
  page.drawLine({
    start: { x: slipX + contentWidth / 2, y: slipY },
    end: { x: slipX + contentWidth / 2, y: slipY + slipHeight },
    thickness: 1,
    color: brandDark
  });

  const slipHeaderY = slipY + slipHeight - 24;
  page.drawText('Kvittering', { x: slipX + 18, y: slipHeaderY, size: 12, font: bold, color: brandDark });
  page.drawText('Giro', { x: slipX + contentWidth / 2 + 18, y: slipHeaderY, size: 12, font: bold, color: brandDark });

  const drawSlipField = (label, value, xPos, yPos, widthArea) => {
    const labelSize = 9;
    const valueSize = 12;
    page.drawText(label, { x: xPos, y: yPos, size: labelSize, font: regular, color: brandDark });
    page.drawRectangle({ x: xPos - 2, y: yPos - 4, width: widthArea, height: 22, borderWidth: 0.8, borderColor: brandDark, color: rgb(1, 1, 1) });
    page.drawText(String(value || ''), {
      x: xPos + 6,
      y: yPos + 6,
      size: valueSize,
      font: bold,
      color: textDark
    });
  };

  const slipLeftX = slipX + 18;
  const slipRightX = slipX + contentWidth / 2 + 18;
  const fieldWidth = contentWidth / 2 - 36;
  let slipFieldY = slipY + slipHeight - 70;

  const slipRecipient = sellerOrg ? `${sellerName} – ${sellerOrg}` : sellerName;

  drawSlipField('Beløp', nok(amountNok), slipLeftX, slipFieldY, fieldWidth);
  drawSlipField('Konto', accountNumber, slipLeftX, slipFieldY - 36, fieldWidth);
  drawSlipField('KID', kid, slipLeftX, slipFieldY - 72, fieldWidth);
  drawSlipField('Fakturadato', formatDate(createdAt), slipLeftX, slipFieldY - 108, fieldWidth);

  drawSlipField('Til', slipRecipient, slipRightX, slipFieldY, fieldWidth);
  drawSlipField('Fra', buyerName || buyerEmail || '', slipRightX, slipFieldY - 36, fieldWidth);
  drawSlipField('Fakturanr.', `#${invoiceId}`, slipRightX, slipFieldY - 72, fieldWidth);
  drawSlipField('Forfallsdato', formatDate(dueDate), slipRightX, slipFieldY - 108, fieldWidth);

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

