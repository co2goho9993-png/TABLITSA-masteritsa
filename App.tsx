
import React, { useState, useEffect, useRef } from 'react';
import { TableEditor } from './components/TableEditor';
import { PropertyPanel } from './components/PropertyPanel';
import { INITIAL_DATA, A3_WIDTH_MM, A3_HEIGHT_MM, MARGIN_MM } from './constants';
import { TableData, Selection, TableCellStyle, TableRow } from './types';
import { exportToPDF } from './services/pdfService';
import { FileDown, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

const EXCLUDED_TITLES = [
  "код графика",
  "учтено в графике",
  "тип системы",
  "тип объекта",
  "эффект от реализации",
  "реализация",
  "источник финансирования"
];

const SUBHEADER_KEYWORDS = [
  "(кол-во)",
  "кол-во",
  "ед. изм.",
  "ед.изм.",
  "единица измерения"
];

// Колонки, требующие числового форматирования (0-based индексы)
const NUMERIC_COLUMNS = [7, 8, 11, 12];

/**
 * Округляет значение до 1 знака после запятой и форматирует по правилам РФ (с запятой)
 */
const formatToFixed1 = (val: string): string => {
  if (!val || val === '–' || val.trim() === '') return val;
  
  const clean = val.toString().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(clean);
  
  if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(clean)) {
    return num.toFixed(1).replace('.', ',');
  }
  return val;
};

/**
 * Очистка текста от лишних пробелов и нормализация кавычек
 */
const cleanText = (text: string): string => {
  if (!text) return '';
  return text.toString()
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const App: React.FC = () => {
  const [data, setData] = useState<TableData>(INITIAL_DATA);
  const [selection, setSelection] = useState<Selection>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const basePxPerMm = 3.78;
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const selectionRef = useRef<Selection>(null);

  // Навигация по таблице с клавиатуры
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Игнорируем навигацию, если не выбрана ячейка
      if (!selectionRef.current) return;

      const { rowIdx, colIdx } = selectionRef.current;
      const rowCount = data.rows.length;
      const colCount = data.columns.length;

      let nextRow = rowIdx;
      let nextCol = colIdx;
      let prevent = false;

      switch (e.key) {
        case 'ArrowUp':
          nextRow = Math.max(0, rowIdx - 1);
          prevent = true;
          break;
        case 'ArrowDown':
          nextRow = Math.min(rowCount - 1, rowIdx + 1);
          prevent = true;
          break;
        case 'ArrowLeft':
          // Навигация влево только если курсор в начале или зажат Shift/Alt
          nextCol = Math.max(0, colIdx - 1);
          prevent = true;
          break;
        case 'ArrowRight':
          nextCol = Math.min(colCount - 1, colIdx + 1);
          prevent = true;
          break;
        case 'Tab':
          if (e.shiftKey) {
            if (colIdx > 0) nextCol = colIdx - 1;
            else if (rowIdx > 0) { nextRow = rowIdx - 1; nextCol = colCount - 1; }
          } else {
            if (colIdx < colCount - 1) nextCol = colIdx + 1;
            else if (rowIdx < rowCount - 1) { nextRow = rowIdx + 1; nextCol = 0; }
          }
          prevent = true;
          break;
        case 'Enter':
          if (!e.shiftKey) {
            nextRow = Math.min(rowCount - 1, rowIdx + 1);
            prevent = true;
          } else {
            nextRow = Math.max(0, rowIdx - 1);
            prevent = true;
          }
          break;
        default:
          return;
      }

      if (prevent) {
        e.preventDefault();
        setSelection({ rowIdx: nextRow, colIdx: nextCol });
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [data.rows.length, data.columns.length]);

  // Управление панорамированием
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          setIsSpacePressed(true);
          if (containerRef.current) containerRef.current.style.cursor = 'grab';
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        if (containerRef.current) containerRef.current.style.cursor = 'auto';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  useEffect(() => {
    zoomRef.current = zoom;
    posRef.current = position;
  }, [zoom, position]);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  useEffect(() => {
    const handleInitialFit = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const padding = 160;
        const fitScale = Math.min(
          (clientWidth - padding) / (A3_WIDTH_MM * basePxPerMm),
          (clientHeight - padding) / (A3_HEIGHT_MM * basePxPerMm)
        );
        setZoom(fitScale);
        setPosition({ x: 0, y: 0 });
      }
    };
    handleInitialFit();
    window.addEventListener('resize', handleInitialFit);
    return () => window.removeEventListener('resize', handleInitialFit);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.pow(1.08, -e.deltaY / 100);
      const newZoom = Math.min(Math.max(zoomRef.current * factor, 0.1), 10);
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const ratio = newZoom / zoomRef.current;
      const newX = mouseX - (mouseX - posRef.current.x) * ratio;
      const newY = mouseY - (mouseY - posRef.current.y) * ratio;
      setZoom(newZoom);
      setPosition({ x: newX, y: newY });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      
      const allRowsRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
      if (allRowsRaw.length === 0) return;

      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(10, allRowsRaw.length); i++) {
        const rowStr = allRowsRaw[i].join(" ").toLowerCase();
        if (rowStr.includes("муниципальное") || rowStr.includes("образование") || rowStr.includes("мероприятие")) {
          headerRowIdx = i;
          break;
        }
      }

      if (headerRowIdx === -1) {
        alert("Не удалось найти строку заголовка в Excel-файле.");
        return;
      }

      const headerRow = allRowsRaw[headerRowIdx];
      const colInfo = ws['!cols'] || [];

      const validIndices: number[] = [];
      for (let i = 0; i < headerRow.length; i++) {
        const isHidden = colInfo[i]?.hidden === true;
        const title = headerRow[i]?.toString().toLowerCase().trim() || "";
        const isExcluded = EXCLUDED_TITLES.some(blacklisted => title.includes(blacklisted));

        if (!isHidden && !isExcluded) {
          validIndices.push(i);
        }
      }

      let dataRowsStartIdx = headerRowIdx + 1;
      while (dataRowsStartIdx < allRowsRaw.length) {
        const currentRow = allRowsRaw[dataRowsStartIdx];
        const rowStr = currentRow.join(" ").toLowerCase();
        const isSubHeader = SUBHEADER_KEYWORDS.some(kw => rowStr.includes(kw.toLowerCase()));
        const isEmpty = currentRow.every(cell => !cell || cell.toString().trim() === "");
        if (isSubHeader || isEmpty) dataRowsStartIdx++;
        else break;
      }

      const filteredRows = allRowsRaw.slice(dataRowsStartIdx).map(row => 
        validIndices.map(idx => row[idx])
      );

      if (filteredRows.length === 0) {
        alert("В файле не найдено строк данных после заголовков.");
        return;
      }

      const newTableRows: TableRow[] = filteredRows.map((row, rIdx) => {
        const isFirstDataRow = rIdx === 0;
        const rowString = row.join(" ").toLowerCase();
        const containsTotalKeyword = rowString.includes("всего") || rowString.includes("итого");
        const isTotal = isFirstDataRow || containsTotalKeyword;

        return {
          id: `row-import-${Date.now()}-${rIdx}`,
          isTotal: isTotal,
          cells: data.columns.map((_, cIdx) => {
            let val = row[cIdx]?.toString() || "";
            val = cleanText(val);
            if (NUMERIC_COLUMNS.includes(cIdx)) val = formatToFixed1(val);
            if (cIdx === 3) {
              const clean = val.trim().toLowerCase();
              if (clean === 'да') val = 'Да';
              else if (clean === 'нет') val = 'Нет';
            }
            if (cIdx === 12) {
              const clean = val.trim();
              if (!clean || clean === '0' || clean === '0,0' || clean === '0.0' || clean === '0,00') val = '–';
            }

            return {
              id: `cell-import-${Date.now()}-${rIdx}-${cIdx}`,
              value: (cIdx === 0) ? (isTotal ? "" : "AUTO") : val,
              style: (cIdx === 0 && !isTotal) ? { circleColor: '#3b82f6' } : undefined
            };
          })
        };
      });

      setData({ ...data, rows: newTableRows });
      setSelection(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('td') || target.closest('button') || target.closest('textarea') || target.closest('.cursor-pointer');
    
    if (isSpacePressed || e.button === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
      return;
    }

    if (!isInteractive) setSelection(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (containerRef.current) containerRef.current.style.cursor = isSpacePressed ? 'grab' : 'auto';
  };

  const handleUpdateCell = (rowIdx: number, colIdx: number, value: string) => {
    let val = cleanText(value);
    if (NUMERIC_COLUMNS.includes(colIdx)) val = formatToFixed1(val);
    if (colIdx === 3) {
      const clean = value.trim().toLowerCase();
      if (clean === 'да') val = 'Да';
      else if (clean === 'нет') val = 'Нет';
    }
    if (colIdx === 12) {
      const clean = val.trim();
      if (!clean || clean === '0' || clean === '0,0' || clean === '0.0' || clean === '0,00') val = '–';
    }

    const newData = { ...data };
    newData.rows[rowIdx].cells[colIdx].value = val;
    setData(newData);
  };

  const handleUpdateCellStyle = (rowIdx: number, colIdx: number, style: TableCellStyle) => {
    const newData = { ...data };
    const currentCell = newData.rows[rowIdx].cells[colIdx];
    
    if (style.fontSize !== undefined) {
      const isNumericCol = (idx: number) => idx >= 7;
      const getBaseSize = (idx: number) => isNumericCol(idx) ? 3.8 : 3.1;
      const oldFontSize = currentCell.style?.fontSize || getBaseSize(colIdx);
      const ratio = style.fontSize / oldFontSize;

      newData.rows.forEach((row) => {
        row.cells.forEach((cell, cIdx) => {
          const base = cell.style?.fontSize || getBaseSize(cIdx);
          cell.style = { ...cell.style, fontSize: base * ratio };
        });
      });
    }

    if (style.fontWeight !== undefined) {
      currentCell.style = { ...currentCell.style, fontWeight: style.fontWeight };
    }

    setData({ ...newData });
  };

  const handleAddRow = () => {
    const newRow = {
      id: `row-${Date.now()}`,
      cells: data.columns.map((_, i) => ({ 
        id: `cell-${Date.now()}-${i}`, 
        value: i === 0 ? 'AUTO' : '',
        style: i === 0 ? { circleColor: '#3b82f6' } : undefined
      }))
    };
    const newRows = [...data.rows];
    newRows.push(newRow);
    setData({ ...data, rows: newRows });
  };

  const handleDeleteRow = (rowIdx: number) => {
    const newRows = [...data.rows];
    newRows.splice(rowIdx, 1);
    setData({ ...data, rows: newRows });
    setSelection(null);
  };

  const handleAddColumn = (atIdx: number = -1) => {
    const newColId = `c${Date.now()}`;
    const newColumns = [...data.columns];
    const newCol = { id: newColId, title: 'Новый столбец', width: 8 };
    if (atIdx >= 0) newColumns.splice(atIdx + 1, 0, newCol);
    else newColumns.push(newCol);
    const scale = 100 / newColumns.reduce((sum, c) => sum + c.width, 0);
    newColumns.forEach(c => c.width *= scale);
    const newRows = data.rows.map(row => {
      const newCells = [...row.cells];
      const cell = { id: `cell-${Date.now()}-${newColId}`, value: '' };
      if (atIdx >= 0) newCells.splice(atIdx + 1, 0, cell);
      else newCells.push(cell);
      return { ...row, cells: newCells };
    });
    setData({ columns: newColumns, rows: newRows });
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (data.columns.length <= 1) return;
    const deletedWidth = data.columns[colIdx].width;
    const newColumns = [...data.columns];
    newColumns.splice(colIdx, 1);
    const scale = 100 / (100 - deletedWidth);
    newColumns.forEach(c => c.width *= scale);
    const newRows = data.rows.map(row => {
      const newCells = [...row.cells];
      newCells.splice(colIdx, 1);
      return { ...row, cells: newCells };
    });
    setData({ columns: newColumns, rows: newRows });
    setSelection(null);
  };

  const handleResizeColumn = (colIdx: number, deltaPercent: number) => {
    const newData = { ...data };
    const nextIdx = colIdx + 1;
    if (nextIdx >= newData.columns.length) return;
    const minWidth = 1;
    const currentWidth = newData.columns[colIdx].width;
    const nextWidth = newData.columns[nextIdx].width;
    const actualDelta = Math.max(Math.min(deltaPercent, nextWidth - minWidth), -(currentWidth - minWidth));
    newData.columns[colIdx].width += actualDelta;
    newData.columns[nextIdx].width -= actualDelta;
    setData(newData);
  };

  const currentPxPerMm = basePxPerMm * zoom;
  const sheetWidthPx = A3_WIDTH_MM * currentPxPerMm;
  const sheetHeightPx = A3_HEIGHT_MM * currentPxPerMm;
  const sheetPaddingPx = MARGIN_MM * currentPxPerMm;

  return (
    <div className="flex h-screen bg-[#111111] overflow-hidden font-['Roboto_Condensed'] text-slate-100">
      <div 
        ref={containerRef} 
        className="flex-1 overflow-hidden relative select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div 
          className="bg-white shadow-[0_0_100px_rgba(0,0,0,1)] absolute left-1/2 top-1/2 flex flex-col origin-center"
          style={{
            width: `${sheetWidthPx}px`,
            height: `${sheetHeightPx}px`,
            padding: `${sheetPaddingPx}px`,
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
          }}
        >
          <div className="flex justify-between items-start border-black border-b-[3px] pb-4" style={{ marginBottom: `${4 * currentPxPerMm}px`, borderBottomWidth: `${0.8 * currentPxPerMm}px` }}>
             <div className="flex flex-col">
               <span className="font-bold uppercase tracking-[0.1em] text-black" style={{ fontSize: `${6 * currentPxPerMm}px` }}>Приложение № 1</span>
               <span className="text-gray-500 font-bold uppercase tracking-tight" style={{ fontSize: `${4 * currentPxPerMm}px` }}>ВЕДОМОСТЬ ОБЪЕКТОВ МОДЕРНИЗАЦИИ</span>
             </div>
             <div className="text-right flex flex-col items-end">
               <span className="bg-black text-white rounded-sm font-bold uppercase" style={{ fontSize: `${3 * currentPxPerMm}px`, padding: `${0.5 * currentPxPerMm}px ${2 * currentPxPerMm}px` }}>ФОРМАТ А3</span>
               <div className="mt-2">
                 <span className="text-gray-400 font-bold tracking-widest uppercase" style={{ fontSize: `${2.5 * currentPxPerMm}px` }}>
                    Vector Studio Editor
                 </span>
               </div>
             </div>
          </div>

          <div className="w-full flex-1 relative" style={{ overflow: 'visible' }}>
            <TableEditor 
              data={data} 
              selection={selection} 
              onSelect={(r, c) => setSelection({ rowIdx: r, colIdx: c })}
              onUpdateCell={handleUpdateCell}
              onResizeColumn={handleResizeColumn}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onAddColumn={handleAddColumn}
              onDeleteColumn={handleDeleteColumn}
              pxPerMm={currentPxPerMm}
            />
          </div>

          <div className="pt-2 flex justify-between items-center border-gray-100 border-t" style={{ marginTop: `${4 * currentPxPerMm}px`, borderTopWidth: `${0.5 * currentPxPerMm}px` }}>
             <div className="font-bold text-gray-300 uppercase tracking-[0.2em]" style={{ fontSize: `${3 * currentPxPerMm}px` }}>
               Vector Studio • (A3 420x297mm)
             </div>
             <div className="flex items-center text-gray-400 uppercase font-bold" style={{ fontSize: `${3 * currentPxPerMm}px`, gap: `${5 * currentPxPerMm}px` }}>
               <span>Лист 1</span>
               <span>Всего листов 1</span>
             </div>
          </div>
        </div>

        <div className="absolute top-8 left-8 flex flex-col gap-2 pointer-events-none">
           <div className="bg-black/95 backdrop-blur-3xl px-5 py-3 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-4 shadow-2xl">
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_100px_#3b82f6]"></div>
             <span>SCALE: {(zoom * 100).toFixed(0)}%</span>
           </div>
        </div>

        <div className="absolute bottom-8 left-8 flex flex-col gap-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.4)] transition-all transform hover:scale-110 active:scale-95 group"
            title="Импорт из Excel"
          >
            <Upload size={32} />
          </button>
          <button
            onClick={() => exportToPDF(data)}
            className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all transform hover:scale-110 active:scale-95 group"
            title="Экспорт в PDF"
          >
            <FileDown size={32} />
          </button>
        </div>
      </div>

      <PropertyPanel 
        data={data} 
        selection={selection} 
        onUpdateStyle={(style) => selection && handleUpdateCellStyle(selection.rowIdx, selection.colIdx, style)}
      />
    </div>
  );
};

export default App;
