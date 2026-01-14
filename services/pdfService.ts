
import { jsPDF } from 'jspdf';
import { TableData, TableRow } from '../types';
import { A3_WIDTH_MM, A3_HEIGHT_MM, MARGIN_MM, COLORS } from '../constants';
import { formatRussianText } from './formatService';

/**
 * World-class PDF Export Service with resilient font loading.
 * Professional-grade typography for A3 technical reports.
 */

const FONT_SOURCES = {
  regular: [
    'https://cdn.jsdelivr.net/gh/googlefonts/roboto@master/src/hinted/RobotoCondensed-Regular.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/static/RobotoCondensed-Regular.ttf',
    'https://fonts.gstatic.com/s/robotocondensed/v25/ieVi2ZhD3EzW720cy7zA5V_v779Gva966A.ttf'
  ],
  bold: [
    'https://cdn.jsdelivr.net/gh/googlefonts/roboto@master/src/hinted/RobotoCondensed-Bold.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/robotocondensed/static/RobotoCondensed-Bold.ttf',
    'https://fonts.gstatic.com/s/robotocondensed/v25/ieVj2ZhD3EzW720cy7zA5V_v779Gva968A96V-E.ttf'
  ]
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
      if (buffer.byteLength < 5000) throw new Error('Font file suspiciously small');
      return await arrayBufferToBase64(buffer);
    } catch (e) {
      console.warn(`Font load failed for ${url}:`, e);
      lastError = e;
    }
  }
  throw new Error(`Failed to load font from all sources. Last error: ${lastError?.message || 'Unknown'}`);
}

export const exportToPDF = async (data: TableData) => {
  try {
    const [regBase64, boldBase64] = await Promise.all([
      fetchWithFallback(FONT_SOURCES.regular),
      fetchWithFallback(FONT_SOURCES.bold)
    ]);

    if (!regBase64 || !boldBase64) throw new Error("Font data is empty or invalid");

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a3',
      compress: true
    });

    const fontName = 'RobotoCondensed';
    const regFile = 'RobotoCondensed-Regular.ttf';
    const boldFile = 'RobotoCondensed-Bold.ttf';
    
    doc.addFileToVFS(regFile, regBase64);
    doc.addFileToVFS(boldFile, boldBase64);
    doc.addFont(regFile, fontName, 'normal');
    doc.addFont(boldFile, fontName, 'bold');
    doc.setFont(fontName, 'normal');

    const margin = MARGIN_MM;
    const contentWidth = A3_WIDTH_MM - (margin * 2);
    
    const hexToRgb = (hex: string) => {
      const bigint = parseInt(hex.replace('#', ''), 16);
      return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const borderColor = hexToRgb(COLORS.border);
    const headerBg = hexToRgb(COLORS.headerBg);
    const totalBg = hexToRgb(COLORS.totalBg);
    const rowOddBg = hexToRgb(COLORS.rowOdd);

    let currentY = margin + 30; 
    const headerFontSize = 8.5; // Slightly reduced to ensure NO line breaks in headers
    const bodyFontSize = 8.5;
    const specialFontSize = 10;

    const colWidthsMm = data.columns.map(col => (col.width / 100) * contentWidth);

    const renderCellText = (x: number, y: number, w: number, h: number, text: string, fontSize: number, align: 'left' | 'center', isBold: boolean) => {
      doc.setFont(fontName, isBold ? 'bold' : 'normal');
      doc.setFontSize(fontSize);
      
      const padding = 0.8; 
      const formatted = formatRussianText(text || '');
      
      const lines = doc.splitTextToSize(formatted, w - (padding * 2));
      const lineHeight = fontSize * 0.352778 * 1.15;
      const totalTextH = lines.length * lineHeight;
      const startY = y + (h - totalTextH) / 2 + (fontSize * 0.352778) * 0.85;

      lines.forEach((line: string, i: number) => {
        const tw = doc.getTextWidth(line);
        const tx = align === 'center' ? x + (w / 2) - (tw / 2) : x + padding;
        doc.text(line, tx, startY + (i * lineHeight));
      });
    };

    const drawHeader = () => {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.05); // Hairline accuracy
      
      const h1 = 12; 
      const h2 = 8;
      const totalH = h1 + h2;

      doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
      doc.rect(margin, currentY, contentWidth, totalH, 'F');

      let curX = margin;
      
      for (let i = 0; i < 8; i++) {
        doc.rect(curX, currentY, colWidthsMm[i], totalH, 'D');
        renderCellText(curX, currentY, colWidthsMm[i], totalH, data.columns[i].title, headerFontSize, 'center', true);
        curX += colWidthsMm[i];
      }

      const groupedW = colWidthsMm[8] + colWidthsMm[9];
      doc.rect(curX, currentY, groupedW, h1, 'D');
      renderCellText(curX, currentY, groupedW, h1, 'Мощность ОПН', headerFontSize, 'center', true);
      
      doc.rect(curX, currentY + h1, colWidthsMm[8], h2, 'D');
      renderCellText(curX, currentY + h1, colWidthsMm[8], h2, data.columns[8].title, headerFontSize, 'center', true);
      
      doc.rect(curX + colWidthsMm[8], currentY + h1, colWidthsMm[9], h2, 'D');
      renderCellText(curX + colWidthsMm[8], currentY + h1, colWidthsMm[9], h2, data.columns[9].title, headerFontSize, 'center', true);
      
      curX += groupedW;

      for (let i = 10; i < 13; i++) {
        doc.rect(curX, currentY, colWidthsMm[i], totalH, 'D');
        renderCellText(curX, currentY, colWidthsMm[i], totalH, data.columns[i].title, headerFontSize, 'center', true);
        curX += colWidthsMm[i];
      }

      currentY += totalH;
    };

    const drawRow = (row: TableRow, isTotal: boolean, bodyIdx: number) => {
      let maxH = 8;
      row.cells.forEach((cell, i) => {
        const fs = cell.style?.fontSize ? cell.style.fontSize * 2.83 : (i >= 7 ? specialFontSize : bodyFontSize);
        const val = (i === 0 && cell.value === 'AUTO') ? (bodyIdx + 1).toString() : cell.value;
        const lines = doc.splitTextToSize(formatRussianText(val || ''), colWidthsMm[i] - 2);
        const h = lines.length * (fs * 0.352778 * 1.15) + 4;
        if (h > maxH) maxH = h;
      });

      if (isTotal) {
        doc.setFillColor(totalBg[0], totalBg[1], totalBg[2]);
        doc.rect(margin, currentY, contentWidth, maxH, 'F');
      } else if (bodyIdx % 2 !== 0) {
        doc.setFillColor(rowOddBg[0], rowOddBg[1], rowOddBg[2]);
        doc.rect(margin, currentY, contentWidth, maxH, 'F');
      }

      let curX = margin;
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.05); 

      row.cells.forEach((cell, i) => {
        doc.rect(curX, currentY, colWidthsMm[i], maxH, 'D');
        const isNumeric = i >= 7;
        const fs = cell.style?.fontSize ? cell.style.fontSize * 2.83 : (isNumeric ? specialFontSize : bodyFontSize);
        const val = (i === 0 && cell.value === 'AUTO') ? (bodyIdx + 1).toString() : cell.value;
        const isBold = isTotal || isNumeric || cell.style?.fontWeight === 700;
        
        doc.setTextColor(isTotal ? 255 : 0);

        if (i === 0 && !isTotal) {
          const circleCol = hexToRgb(cell.style?.circleColor || '#3b82f6');
          doc.setFillColor(circleCol[0], circleCol[1], circleCol[2]);
          doc.circle(curX + colWidthsMm[i] / 2, currentY + maxH / 2, 2.5, 'F');
          doc.setTextColor(255);
          renderCellText(curX, currentY, colWidthsMm[i], maxH, val, fs * 0.9, 'center', true);
        } else {
          const align = [1, 2, 4, 5].includes(i) ? 'left' : 'center';
          renderCellText(curX, currentY, colWidthsMm[i], maxH, val, fs, align, isBold);
        }
        curX += colWidthsMm[i];
      });

      currentY += maxH;
    };

    doc.setTextColor(0);
    doc.setFont(fontName, 'bold');
    doc.setFontSize(18);
    doc.text('ПРИЛОЖЕНИЕ № 1', margin, margin + 12);
    doc.setFontSize(11);
    doc.text('ВЕДОМОСТЬ ОБЪЕКТОВ МОДЕРНИЗАЦИИ', margin, margin + 18);
    
    doc.setFontSize(8);
    doc.setFillColor(0, 0, 0);
    doc.rect(A3_WIDTH_MM - margin - 22, margin + 5, 22, 5, 'F');
    doc.setTextColor(255);
    doc.text('ФОРМАТ А3', A3_WIDTH_MM - margin - 20, margin + 8.5);

    drawHeader();

    let bIdx = 0;
    data.rows.forEach(row => {
      if (currentY > A3_HEIGHT_MM - 25) {
        doc.addPage();
        currentY = margin + 25;
        doc.setFont(fontName, 'normal');
        drawHeader();
      }
      drawRow(row, !!row.isTotal, row.isTotal ? -1 : bIdx++);
    });

    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.setFont(fontName, 'normal');
    doc.text('Лист 1 из 1', contentWidth / 2 + margin, A3_HEIGHT_MM - margin, { align: 'center' });
    doc.text('Vector Studio • (A3 420x297mm)', margin, A3_HEIGHT_MM - margin);

    doc.save('ведомость_модернизации_А3.pdf');
  } catch (error) {
    console.error('PDF Export Error:', error);
    alert('Ошибка экспорта: ' + (error instanceof Error ? error.message : 'Неизвестная ошибка'));
  }
};
