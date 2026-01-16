
import { jsPDF } from 'jspdf';
import { TableData, TableRow } from '../types';
import { A3_WIDTH_MM, A3_HEIGHT_MM, MARGIN_MM, COLORS } from '../constants';
import { formatRussianText } from './formatService';

/**
 * World-class PDF Export Service with precise unit matching and fixed header proportions.
 */

const FONT_SOURCES = {
  regular: [
    'https://cdn.jsdelivr.net/gh/googlefonts/roboto@master/src/hinted/RobotoCondensed-Regular.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/static/RobotoCondensed-Regular.ttf'
  ],
  bold: [
    'https://cdn.jsdelivr.net/gh/googlefonts/roboto@master/src/hinted/RobotoCondensed-Bold.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/static/RobotoCondensed-Bold.ttf'
  ]
};

const UI_UNITS = {
  headerFontSize: 2.6, // Фиксированный размер шрифта шапки (как в UI)
  standardFontSize: 3.1, 
  numericFontSize: 3.8, 
  cellPadding: 0.8, 
  headerPadding: 0.4, 
  borderWidth: 0.1, 
  lineHeight: 1.0 
};

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve) => {
    const blob = new Blob([buffer], { type: 'application/octet-stream' });
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl && dataUrl.includes(',')) {
        resolve(dataUrl.split(',')[1]);
      } else {
        resolve('');
      }
    };
    reader.readAsDataURL(blob);
  });
}

async function fetchWithFallback(urls: string[]): Promise<string> {
  let lastError: any = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { mode: 'cors', cache: 'default' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      return await arrayBufferToBase64(buffer);
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`Failed to load font. ${lastError?.message}`);
}

export const exportToPDF = async (data: TableData) => {
  try {
    const [regBase64, boldBase64] = await Promise.all([
      fetchWithFallback(FONT_SOURCES.regular),
      fetchWithFallback(FONT_SOURCES.bold)
    ]);

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
      putOnlyUsedFonts: true,
      floatPrecision: 16
    });

    const fontName = 'RobotoCondensed';
    doc.addFileToVFS('RobotoCondensed-Regular.ttf', regBase64);
    doc.addFileToVFS('RobotoCondensed-Bold.ttf', boldBase64);
    doc.addFont('RobotoCondensed-Regular.ttf', fontName, 'normal');
    doc.addFont('RobotoCondensed-Bold.ttf', fontName, 'bold');
    doc.setFont(fontName, 'normal');

    const margin = MARGIN_MM;
    const contentWidth = A3_WIDTH_MM - (margin * 2);
    const colWidthsMm = data.columns.map(col => (col.width / 100) * contentWidth);

    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const borderColor = hexToRgb(COLORS.border);
    const headerBg = hexToRgb(COLORS.headerBg);
    const totalBg = hexToRgb(COLORS.totalBg);
    const rowOddBg = hexToRgb(COLORS.rowOdd);

    let currentY = margin;

    const mmToPt = (mm: number) => mm * (72 / 25.4);

    const renderCellText = (
      x: number, 
      y: number, 
      w: number, 
      h: number, 
      text: string, 
      fontSizeMm: number, 
      align: 'left' | 'center', 
      isBold: boolean, 
      colorRgb: number[] = [0, 0, 0]
    ) => {
      doc.setFont(fontName, isBold ? 'bold' : 'normal');
      doc.setFontSize(mmToPt(fontSizeMm));
      doc.setTextColor(colorRgb[0], colorRgb[1], colorRgb[2]);
      
      const padding = align === 'left' ? UI_UNITS.cellPadding : 0.2;
      const formatted = formatRussianText(text || '');
      
      const lines = doc.splitTextToSize(formatted, w - (padding * 2));
      const lineH = fontSizeMm * UI_UNITS.lineHeight;
      const totalTextH = lines.length * lineH;
      
      // Вертикальное центрирование
      let startY = y + (h - totalTextH) / 2 + (fontSizeMm * 0.78);

      lines.forEach((line: string, i: number) => {
        const tw = doc.getTextWidth(line);
        const tx = align === 'center' ? x + (w / 2) - (tw / 2) : x + padding;
        doc.text(line, tx, startY + (i * lineH));
      });
    };

    const drawHeader = () => {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(UI_UNITS.borderWidth);
      
      const h1 = 8.0; 
      const h2 = 6.0;
      const totalH = h1 + h2;
      const white = [255, 255, 255];

      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(margin, currentY, contentWidth, totalH, 'F');

      let curX = margin;
      for (let i = 0; i < 8; i++) {
        doc.rect(curX, currentY, colWidthsMm[i], totalH, 'D');
        renderCellText(curX, currentY, colWidthsMm[i], totalH, data.columns[i].title, UI_UNITS.headerFontSize, 'center', true, white);
        curX += colWidthsMm[i];
      }

      const groupedW = colWidthsMm[8] + colWidthsMm[9];
      doc.rect(curX, currentY, groupedW, h1, 'D');
      renderCellText(curX, currentY, groupedW, h1, 'Мощность ОПН', UI_UNITS.headerFontSize, 'center', true, white);
      
      doc.rect(curX, currentY + h1, colWidthsMm[8], h2, 'D');
      renderCellText(curX, currentY + h1, colWidthsMm[8], h2, data.columns[8].title, UI_UNITS.headerFontSize, 'center', true, white);
      
      doc.rect(curX + colWidthsMm[8], currentY + h1, colWidthsMm[9], h2, 'D');
      renderCellText(curX + colWidthsMm[8], currentY + h1, colWidthsMm[9], h2, data.columns[9].title, UI_UNITS.headerFontSize, 'center', true, white);
      
      curX += groupedW;
      for (let i = 10; i < 13; i++) {
        doc.rect(curX, currentY, colWidthsMm[i], totalH, 'D');
        renderCellText(curX, currentY, colWidthsMm[i], totalH, data.columns[i].title, UI_UNITS.headerFontSize, 'center', true, white);
        curX += colWidthsMm[i];
      }
      currentY += totalH;
    };

    const calculateRowHeight = (row: TableRow, bIdx: number) => {
      let maxH = 6.0; 
      row.cells.forEach((cell, i) => {
        const isNumeric = i >= 7;
        const fs = cell.style?.fontSize || (isNumeric ? UI_UNITS.numericFontSize : UI_UNITS.standardFontSize);
        
        // 1. Ensure circle fits without clipping
        if (i === 0 && !row.isTotal) {
          const circleSizeMm = cell.style?.circleSize || (fs * 1.6);
          // High buffer padding for the circle (x2.5 padding)
          const requiredCircleH = circleSizeMm + (UI_UNITS.cellPadding * 2.5);
          if (requiredCircleH > maxH) maxH = requiredCircleH;
        }

        // 2. Ensure multi-line text fits
        const val = (i === 0 && cell.value === 'AUTO') ? (bIdx + 1).toString() : cell.value;
        const formatted = formatRussianText(val || '');
        const lines = doc.splitTextToSize(formatted, colWidthsMm[i] - (UI_UNITS.cellPadding * 2));
        const textH = lines.length * (fs * UI_UNITS.lineHeight) + (UI_UNITS.cellPadding * 3.0); // Increased padding
        if (textH > maxH) maxH = textH;
      });
      return maxH;
    };

    const drawRow = (row: TableRow, isTotal: boolean, bodyIdx: number) => {
      const rowHeight = calculateRowHeight(row, bodyIdx);

      if (currentY + rowHeight > A3_HEIGHT_MM - margin - 5) {
        doc.addPage();
        currentY = margin;
        drawHeader();
      }

      if (isTotal) {
        doc.setFillColor(totalBg[0], totalBg[1], totalBg[2]);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      } else if (bodyIdx % 2 !== 0) {
        doc.setFillColor(rowOddBg[0], rowOddBg[1], rowOddBg[2]);
        doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
      }

      let curX = margin;
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(UI_UNITS.borderWidth);

      row.cells.forEach((cell, i) => {
        doc.rect(curX, currentY, colWidthsMm[i], rowHeight, 'D');
        const isNumeric = i >= 7;
        const fs = cell.style?.fontSize || (isNumeric ? UI_UNITS.numericFontSize : UI_UNITS.standardFontSize);
        const circleSize = cell.style?.circleSize || (fs * 1.6);
        const val = (i === 0 && cell.value === 'AUTO') ? (bodyIdx + 1).toString() : cell.value;
        const isBold = isTotal || isNumeric || cell.style?.fontWeight === 700;
        const textColor = isTotal ? [255, 255, 255] : [0, 0, 0];
        
        if (i === 0 && !isTotal) {
          const hexColor = (cell.style?.circleColor || '#1c9ad6').toLowerCase();
          const circleCol = hexToRgb(hexColor);
          doc.setFillColor(circleCol[0], circleCol[1], circleCol[2]);
          const radius = circleSize / 2;
          doc.circle(curX + colWidthsMm[i] / 2, currentY + rowHeight / 2, radius, 'F');
          renderCellText(curX, currentY, colWidthsMm[i], rowHeight, val, fs, 'center', true, [255, 255, 255]);
        } else {
          const align = i === 4 ? 'left' : 'center';
          renderCellText(curX, currentY, colWidthsMm[i], rowHeight, val, fs, align, isBold, textColor);
        }
        curX += colWidthsMm[i];
      });

      currentY += rowHeight;
    };

    drawHeader();
    let bIdx = 0;
    data.rows.forEach(row => {
      drawRow(row, !!row.isTotal, row.isTotal ? -1 : bIdx++);
    });

    doc.save('ведомость_модернизации_А3.pdf');
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Ошибка экспорта: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
  }
};
