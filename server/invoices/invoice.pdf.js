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
  const margin = 40;
  const contentWidth = width - margin * 2;
  const headerHeight = 220;
  const slipHeight = 300;
  const slipBottomMargin = 42;
  const protectedBottom = slipBottomMargin + slipHeight + 40;

  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const brandPrimary = rgb(23 / 255, 131 / 255, 76 / 255);
  const brandDark = rgb(15 / 255, 78 / 255, 47 / 255);
  const brandSoft = rgb(242 / 255, 251 / 255, 246 / 255);
  const slate = rgb(71 / 255, 85 / 255, 105 / 255);
  const tableBorder = rgb(210 / 255, 224 / 255, 216 / 255);
  const giroYellow = rgb(252 / 255, 227 / 255, 125 / 255);
  const textDark = rgb(24 / 255, 42 / 255, 30 / 255);
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

  const ensureSpace = required => {
    if (y - required < protectedBottom) {
      y = protectedBottom + required;
    }
  };

  // Header band with logo and metadata panel
  page.drawRectangle({ x: 0, y: height - headerHeight, width, height: headerHeight, color: brandPrimary });
  page.drawRectangle({ x: 0, y: height - headerHeight, width, height: 28, color: brandDark });

  if (logoImage) {
    const logoHeight = 52;
    const logoWidth = (logoImage.width / logoImage.height) * logoHeight;
    page.drawImage(logoImage, {
      x: margin,
      y: height - logoHeight - 30,
      width: logoWidth,
      height: logoHeight
    });
  } else {
    page.drawText(String(sellerName), { x: margin, y: height - 62, size: 28, font: bold, color: white });
  }

  const headerInfoY = height - headerHeight + 88;
  page.drawText(String(sellerOrg), { x: margin, y: headerInfoY, size: 14, font: regular, color: white });
  page.drawText('Faktura', { x: margin, y: headerInfoY - 22, size: 18, font: bold, color: white });
  page.drawText(`#${invoiceId}`, { x: margin + 70, y: headerInfoY - 22, size: 18, font: bold, color: white });

  const metaWidth = 232;
  const metaHeight = 170;
  const metaX = width - margin - metaWidth;
  const metaYTop = height - 28;
  page.drawRectangle({ x: metaX, y: metaYTop - metaHeight, width: metaWidth, height: metaHeight, color: white, borderColor: brandDark, borderWidth: 1.2 });

  const metaEntries = [
    ['Fakturanr.', `#${invoiceId}`],
    ['Dato', formatDate(createdAt)],
    ['Forfallsdato', formatDate(dueDate)],
    ['Konto', accountNumber],
    ['KID', kid]
  ];

  let metaY = metaYTop - 24;
  metaEntries.forEach(([label, value]) => {
    page.drawText(label, { x: metaX + 14, y: metaY, size: 9, font: regular, color: slate });
    page.drawText(String(value || ''), { x: metaX + 14, y: metaY - 14, size: 13, font: bold, color: brandDark });
    metaY -= 30;
  });

  let y = height - headerHeight - 36;

  const drawBodyText = ({ text, x = margin, size = 12, font = regular, color = textDark, gap = size + 6 }) => {
    ensureSpace(gap);
    page.drawText(String(text || ''), { x, y, size, font, color });
    y -= gap;
  };

  const recipientBoxHeight = buyerEmail ? 102 : 78;
  ensureSpace(recipientBoxHeight + 24);
  const recipientBottom = y - recipientBoxHeight;
  page.drawRectangle({ x: margin, y: recipientBottom, width: contentWidth, height: recipientBoxHeight, color: brandSoft, borderColor: tableBorder, borderWidth: 1 });
  page.drawText('Fakturamottaker', { x: margin + 16, y: y - 18, size: 13, font: bold, color: brandDark });
  page.drawText(buyerName || buyerEmail || 'Ukjent mottaker', { x: margin + 16, y: y - 36, size: 12, font: regular, color: textDark });
  if (buyerEmail) {
    page.drawText(buyerEmail, { x: margin + 16, y: y - 52, size: 11, font: regular, color: slate });
  }
  const issuerX = margin + contentWidth / 2 + 12;
  page.drawText('Fakturautsteder', { x: issuerX, y: y - 18, size: 13, font: bold, color: brandDark });
  const issuerLine = sellerOrg ? `${sellerName} – ${sellerOrg}` : sellerName;
  page.drawText(String(issuerLine || sellerName), { x: issuerX, y: y - 36, size: 12, font: regular, color: textDark });
  if (baseUrl) {
    page.drawText(String(baseUrl).replace(/\/$/, ''), { x: issuerX, y: y - 52, size: 11, font: regular, color: slate });
  }

  y = recipientBottom - 28;

  drawBodyText({ text: 'Fakturadetaljer', font: bold, size: 14, color: brandDark, gap: 22 });

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

  const infoBoxHeight = 96;
  const infoBottomMargin = 28;
  if (y - infoBoxHeight < protectedBottom + infoBottomMargin) {
    y = protectedBottom + infoBottomMargin + infoBoxHeight;
  }
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
  let paymentInfoCursorY = y - 42;
  instructionLines.forEach(line => {
    page.drawText(line, {
      x: margin + 16,
      y: paymentInfoCursorY,
      size: 11,
      font: regular,
      color: textDark
    });
    paymentInfoCursorY -= 14;
  });

  const giroSummaryPanelHeight = 64;
  const summaryGap = 20;
  const summaryY = Math.max(infoBottom - summaryGap - giroSummaryPanelHeight, protectedBottom + 20);
  const summaryWidth = (contentWidth - 18) / 2;
  const summaryLeftX = margin;
  const summaryRightX = margin + summaryWidth + 18;

  page.drawRectangle({ x: summaryLeftX, y: summaryY, width: summaryWidth, height: giroSummaryPanelHeight, color: white, borderColor: tableBorder, borderWidth: 1 });
  page.drawRectangle({ x: summaryRightX, y: summaryY, width: summaryWidth, height: giroSummaryPanelHeight, color: white, borderColor: tableBorder, borderWidth: 1 });
  page.drawRectangle({ x: summaryLeftX, y: summaryY + giroSummaryPanelHeight - 24, width: summaryWidth, height: 24, color: brandSoft });
  page.drawRectangle({ x: summaryRightX, y: summaryY + giroSummaryPanelHeight - 24, width: summaryWidth, height: 24, color: brandSoft });

  page.drawText('Kvittering', { x: summaryLeftX + 14, y: summaryY + giroSummaryPanelHeight - 18, size: 11, font: bold, color: brandDark });
  page.drawText(nok(amountNok), { x: summaryLeftX + 14, y: summaryY + giroSummaryPanelHeight - 38, size: 13, font: bold, color: brandDark });
  page.drawText(formatDate(dueDate), { x: summaryLeftX + 14, y: summaryY + 14, size: 10, font: regular, color: slate });

  page.drawText('Giro', { x: summaryRightX + 14, y: summaryY + giroSummaryPanelHeight - 18, size: 11, font: bold, color: brandDark });
  page.drawText(`${sellerName} – ${sellerOrg}`, { x: summaryRightX + 14, y: summaryY + giroSummaryPanelHeight - 38, size: 10.5, font: regular, color: textDark });
  page.drawText(`#${invoiceId}`, { x: summaryRightX + 14, y: summaryY + 14, size: 10, font: regular, color: slate });

  // Norwegian giro-style payment slip
  const slipY = slipBottomMargin;
  const slipX = margin;
  const slipWidth = contentWidth;
  const slipLeftWidth = 210;
  const slipRightWidth = slipWidth - slipLeftWidth;

  page.drawRectangle({ x: slipX, y: slipY, width: slipWidth, height: slipHeight, color: giroYellow, borderColor: brandDark, borderWidth: 1.1 });
  page.drawLine({
    start: { x: slipX + slipLeftWidth, y: slipY },
    end: { x: slipX + slipLeftWidth, y: slipY + slipHeight },
    thickness: 1,
    color: brandDark
  });

  const slipHeaderHeight = 28;
  page.drawLine({
    start: { x: slipX, y: slipY + slipHeight - slipHeaderHeight },
    end: { x: slipX + slipWidth, y: slipY + slipHeight - slipHeaderHeight },
    thickness: 1,
    color: brandDark
  });
  page.drawText('KVITTERING', { x: slipX + 14, y: slipY + slipHeight - 19, size: 11, font: bold, color: brandDark });
  page.drawText('GIRO', { x: slipX + slipLeftWidth + 16, y: slipY + slipHeight - 19, size: 11, font: bold, color: brandDark });

  const slipLabel = (text, xPos, yPos) => {
    page.drawText(text, { x: xPos, y: yPos, size: 9, font: regular, color: brandDark });
  };

  const slipValueBox = (value, xPos, yPos, widthArea, heightArea = 24, align = 'left', fontSize = 12, fontFace = bold) => {
    page.drawRectangle({ x: xPos, y: yPos, width: widthArea, height: heightArea, color: white, borderColor: brandDark, borderWidth: 0.8 });
    const text = String(value || '');
    if (!text) {
      return;
    }
    if (align === 'right') {
      const textWidth = fontFace.widthOfTextAtSize(text, fontSize);
      const drawX = xPos + widthArea - textWidth - 6;
      page.drawText(text, { x: drawX, y: yPos + 6, size: fontSize, font: fontFace, color: textDark });
    } else if (align === 'center') {
      const textWidth = fontFace.widthOfTextAtSize(text, fontSize);
      const drawX = xPos + (widthArea - textWidth) / 2;
      page.drawText(text, { x: drawX, y: yPos + 6, size: fontSize, font: fontFace, color: textDark });
    } else {
      page.drawText(text, { x: xPos + 6, y: yPos + 6, size: fontSize, font: fontFace, color: textDark });
    }
  };

  const giroTop = slipY + slipHeight - slipHeaderHeight - 24;
  const leftX = slipX + 12;
  const rightX = slipX + slipLeftWidth + 12;

  // Left column content
  let leftRowY = giroTop;
  slipLabel('Konto', leftX, leftRowY);
  slipValueBox(accountNumber, leftX, leftRowY - 22, slipLeftWidth - 24, 26, 'left', 12, bold);
  leftRowY -= 48;

  slipLabel('Beløp', leftX, leftRowY);
  slipValueBox(nok(amountNok), leftX, leftRowY - 22, slipLeftWidth - 24, 26, 'left', 12, bold);
  leftRowY -= 48;

  slipLabel('Kundenummer', leftX, leftRowY);
  slipValueBox(buyerEmail || buyerName || '-', leftX, leftRowY - 22, slipLeftWidth - 24, 26, 'left', 10.5, regular);
  leftRowY -= 46;

  slipLabel('Fakturanummer', leftX, leftRowY);
  slipValueBox(`#${invoiceId}`, leftX, leftRowY - 22, slipLeftWidth - 24, 26, 'left', 11, regular);
  leftRowY -= 46;

  slipLabel('KID', leftX, leftRowY);
  slipValueBox(kid || '-', leftX, leftRowY - 22, slipLeftWidth - 24, 26, 'left', 11, regular);

  // Right column content
  const rightSpacing = 44;
  const accountLabelY = giroTop;
  const amountLabelY = giroTop - rightSpacing;
  const dueLabelY = giroTop - rightSpacing * 2;
  const toLabelY = giroTop - rightSpacing * 3;
  const addressLabelY = Math.min(toLabelY - 32, slipY + 132);
  const kidLabelY = Math.max(slipY + 48, addressLabelY - 52);

  slipLabel('Betales til konto', rightX, accountLabelY);
  slipValueBox(accountNumber, rightX, accountLabelY - 24, slipRightWidth - 24, 28, 'left', 12, bold);

  slipLabel('Beløp', rightX, amountLabelY);
  slipValueBox(nok(amountNok), rightX, amountLabelY - 24, slipRightWidth - 24, 28, 'right', 12, bold);

  slipLabel('Betales innen', rightX, dueLabelY);
  slipValueBox(formatDate(dueDate), rightX, dueLabelY - 24, slipRightWidth / 2 - 18, 28, 'left', 11, regular);
  slipLabel('Dato', rightX + slipRightWidth / 2, dueLabelY);
  slipValueBox(formatDate(createdAt), rightX + slipRightWidth / 2, dueLabelY - 24, slipRightWidth / 2 - 30, 28, 'left', 11, regular);

  slipLabel('Til', rightX, toLabelY);
  slipValueBox(`${sellerName} – ${sellerOrg}`, rightX, toLabelY - 24, slipRightWidth - 24, 28, 'left', 11, regular);

  slipLabel('Adresse', rightX, addressLabelY);
  const addressLines = ['Søaveien 23C', '0459 OSLO'];
  addressLines.forEach((line, idx) => {
    page.drawText(line, { x: rightX + 6, y: addressLabelY - 20 - idx * 12, size: 9, font: regular, color: brandDark });
  });

  slipLabel('KID', rightX, kidLabelY);
  const kidDigits = String(kid || '').replace(/\s+/g, '');
  const boxWidth = 16;
  const boxHeight = 20;
  const maxBoxes = Math.min(Math.max(kidDigits.length, 10), Math.floor((slipRightWidth - 40) / (boxWidth + 2)));
  for (let i = 0; i < maxBoxes; i += 1) {
    const char = kidDigits[i] || '';
    const boxX = rightX + i * (boxWidth + 2);
    slipValueBox(char, boxX, kidLabelY - 20, boxWidth, boxHeight, 'center', 11.5, bold);
  }
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

