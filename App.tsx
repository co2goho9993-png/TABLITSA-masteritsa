
import React, { useState, useEffect, useRef } from 'react';
import { TableEditor } from './components/TableEditor';
import { PropertyPanel } from './components/PropertyPanel';
import { INITIAL_DATA, A3_WIDTH_MM, A3_HEIGHT_MM, MARGIN_MM } from './constants';
import { TableData, Selection, TableCellStyle, TableRow } from './types';
import { exportToPDF } from './services/pdfService';
import { FileDown, Upload, Save, FolderOpen } from 'lucide-react';
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

const NUMERIC_COLUMNS = [7, 8, 11, 12];

const formatToFixed1 = (val: string): string => {
  if (!val || val === '–' || val.trim() === '') return val;
  const clean = val.toString().replace(/\s/g, '').replace(',', '.');
  const num = parseFloat(clean);
  if (!isNaN(num) && /^-?\d+(\.\d+)?$/.test(clean)) {
    const rounded = Math.round(num * 10) / 10;
    if (rounded % 1 === 0) return rounded.toString();
    return rounded.toString().replace('.', ',');
  }
  return val;
};

const App: React.FC = () => {
  const [data, setData] = useState<TableData>(INITIAL_DATA);
  const [selection, setSelection] = useState<Selection>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const basePxPerMm = 3.78;
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const resizingRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift' && !isShiftPressed) {
        setIsShiftPressed(true);
        if (containerRef.current) containerRef.current.style.cursor = 'grab';
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        if (containerRef.current) containerRef.current.style.cursor = 'auto';
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isShiftPressed]);

  useEffect(() => { zoomRef.current = zoom; posRef.current = position; }, [zoom, position]);

  useEffect(() => {
    const handleInitialFit = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        const fitScale = Math.min((clientWidth - 160) / (A3_WIDTH_MM * basePxPerMm), (clientHeight - 160) / (A3_HEIGHT_MM * basePxPerMm));
        setZoom(fitScale); setPosition({ x: 0, y: 0 });
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
      setZoom(newZoom); setPosition({ x: newX, y: newY });
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
      const ws = wb.Sheets[wb.SheetNames[0]];
      const allRowsRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];
      let headerRowIdx = -1;
      for (let i = 0; i < Math.min(10, allRowsRaw.length); i++) {
        const rowStr = allRowsRaw[i].join(" ").toLowerCase();
        if (rowStr.includes("муниципальное") || rowStr.includes("образование") || rowStr.includes("мероприятие")) {
          headerRowIdx = i; break;
        }
      }
      if (headerRowIdx === -1) return;

      let dataRowsStartIdx = headerRowIdx + 1;
      while (dataRowsStartIdx < allRowsRaw.length) {
        const row = allRowsRaw[dataRowsStartIdx];
        const rowStr = row.join(" ").toLowerCase();
        const isSubHeader = SUBHEADER_KEYWORDS.some(kw => rowStr.includes(kw.toLowerCase()));
        const isEmpty = row.every(c => !c || c.toString().trim() === "");
        if (isSubHeader || isEmpty) dataRowsStartIdx++;
        else break;
      }

      const headerRow = allRowsRaw[headerRowIdx];
      const validIndices: number[] = [];
      for (let i = 0; i < headerRow.length; i++) {
        const title = headerRow[i]?.toString().toLowerCase().trim() || "";
        if (!EXCLUDED_TITLES.some(bl => title.includes(bl))) validIndices.push(i);
      }

      const filteredRows = allRowsRaw.slice(dataRowsStartIdx).filter(r => r.some(c => c)).map(row => 
        validIndices.map(idx => row[idx])
      );

      const newTableRows: TableRow[] = filteredRows.map((row, rIdx) => {
        const rowString = row.join(" ").toLowerCase();
        const isTotal = rIdx === 0 || rowString.includes("всего") || rowString.includes("итого");
        return {
          id: `row-import-${Date.now()}-${rIdx}`,
          isTotal,
          cells: data.columns.map((_, cIdx) => {
            let val = row[cIdx]?.toString() || "";

            if (cIdx === 3) {
              if (val.toLowerCase().trim() === 'да') val = 'Да';
              if (val.toLowerCase().trim() === 'нет') val = 'Нет';
            }

            if (NUMERIC_COLUMNS.includes(cIdx)) val = formatToFixed1(val);
            
            if (cIdx === 12) {
              const costVal = formatToFixed1(row[11]?.toString() || "");
              if (val === costVal || val === "2022") val = "";
              const cleanVal = val.trim();
              const isMissing = !cleanVal || cleanVal === '0' || cleanVal === '0,0' || cleanVal === '–';
              if (isMissing) val = isTotal ? "" : "–";
            }
            return {
              id: `cell-${Date.now()}-${rIdx}-${cIdx}`,
              value: (cIdx === 0) ? (isTotal ? "" : "AUTO") : val,
              style: (cIdx === 0 && !isTotal) ? { circleColor: '#1c9ad6' } : undefined
            };
          })
        };
      });
      setData({ ...data, rows: newTableRows });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveProject = () => {
    const projectJson = JSON.stringify(data, null, 2);
    const blob = new Blob([projectJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `project_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const loadedData = JSON.parse(content);
        if (loadedData && loadedData.columns && loadedData.rows) {
          setData(loadedData);
          setSelection(null);
        } else {
          alert('Неверный формат файла проекта');
        }
      } catch (err) {
        console.error(err);
        alert('Ошибка при загрузке проекта');
      }
      if (projectInputRef.current) projectInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleUpdateCell = (rowIdx: number, colIdx: number, value: string) => {
    let val = value;
    if (colIdx === 3) {
      if (val.toLowerCase().trim() === 'да') val = 'Да';
      if (val.toLowerCase().trim() === 'нет') val = 'Нет';
    }
    if (!data.rows[rowIdx]) return;
    const isTotal = data.rows[rowIdx].isTotal;
    if (NUMERIC_COLUMNS.includes(colIdx)) val = formatToFixed1(val);
    if (colIdx === 12) {
      const cleanVal = val.trim();
      if (!cleanVal || cleanVal === '0' || cleanVal === '0,0' || cleanVal === '–') val = isTotal ? "" : "–";
    }
    const newData = { ...data };
    newData.rows[rowIdx].cells[colIdx].value = val;
    setData(newData);
  };

  const handleUpdateCellStyle = (rowIdx: number, colIdx: number, style: TableCellStyle) => {
    if (rowIdx < 0) return; 
    if (!data.rows[rowIdx]) return;
    const newData = { ...data };
    const currentCell = newData.rows[rowIdx].cells[colIdx];
    if (colIdx === 0) {
      if (style.fontSize !== undefined) {
        newData.rows.forEach(r => {
          if (!r.isTotal) {
            r.cells[0].style = { ...r.cells[0].style, fontSize: style.fontSize };
          }
        });
      }
      if (style.circleSize !== undefined) {
        newData.rows.forEach(r => {
          if (!r.isTotal) {
            r.cells[0].style = { ...r.cells[0].style, circleSize: style.circleSize };
          }
        });
      }
      if (style.fontWeight !== undefined) {
        newData.rows.forEach(r => {
          if (!r.isTotal) {
            r.cells[0].style = { ...r.cells[0].style, fontWeight: style.fontWeight };
          }
        });
      }
      if (style.circleColor !== undefined) {
        currentCell.style = { ...currentCell.style, circleColor: style.circleColor };
      }
    } else {
      if (style.fontSize !== undefined) {
        const isNumericCol = (idx: number) => idx >= 7;
        const getBaseSize = (idx: number) => isNumericCol(idx) ? 3.8 : 3.1;
        const oldFontSize = currentCell.style?.fontSize || getBaseSize(colIdx);
        const ratio = style.fontSize / oldFontSize;
        newData.rows.forEach(r => r.cells.forEach((c, idx) => {
          if (idx === 0) return;
          const base = c.style?.fontSize || getBaseSize(idx);
          c.style = { ...c.style, fontSize: base * ratio };
        }));
      }
      if (style.fontWeight !== undefined) {
        currentCell.style = { ...currentCell.style, fontWeight: style.fontWeight };
      }
    }
    setData({ ...newData });
  };

  const handleUpdateColumnTitle = (colIdx: number, title: string) => {
    const newData = { ...data };
    newData.columns[colIdx].title = title;
    setData(newData);
  };

  const handleUpdateGroupTitle = (title: string) => {
    setData({ ...data, groupTitle: title });
  };

  const handleAddRow = () => {
    const existingBodyRow = data.rows.find(r => !r.isTotal);
    const baseStyle = existingBodyRow?.cells[0]?.style || {};
    const newRowStyle: TableCellStyle = {
      ...baseStyle,
      circleColor: '#1c9ad6' 
    };
    const newRow: TableRow = {
      id: `r${Date.now()}`,
      cells: data.columns.map((_, i) => ({
        id: `c${Date.now()}${i}`,
        value: i === 0 ? 'AUTO' : '',
        style: i === 0 ? newRowStyle : undefined
      }))
    };
    setData({ ...data, rows: [...data.rows, newRow] });
  };

  const handleResizeColumn = (idx: number, delta: number) => {
    resizingRef.current = true;
    const newData = { ...data };
    if (idx + 1 < newData.columns.length) {
      const actual = Math.max(Math.min(delta, newData.columns[idx + 1].width - 1), -(newData.columns[idx].width - 1));
      newData.columns[idx].width += actual;
      newData.columns[idx + 1].width -= actual;
      setData(newData);
    }
  };

  const handleDeleteRow = (idx: number) => {
    const r = [...data.rows]; 
    r.splice(idx, 1); 
    setData({ ...data, rows: r }); 
    setSelection(null);
  };

  const handleAddColumn = (at: number | undefined) => {
    const newCol = { id: `c${Date.now()}`, title: 'Новый', width: 5 };
    const cols = [...data.columns];
    if (at !== undefined && at !== -1) cols.splice(at + 1, 0, newCol); 
    else if (at === -1) cols.splice(8, 0, newCol); 
    else cols.push(newCol);
    const scale = 100 / cols.reduce((s, c) => s + c.width, 0);
    cols.forEach(c => c.width *= scale);
    const rows = data.rows.map(r => { 
      const c = [...r.cells]; 
      const cellId = `cc${Date.now()}-${Math.random()}`;
      if (at !== undefined && at !== -1) c.splice(at + 1, 0, { id: cellId, value: '' }); 
      else if (at === -1) c.splice(8, 0, { id: cellId, value: '' });
      else c.push({ id: cellId, value: '' }); 
      return { ...r, cells: c }; 
    });
    setData({ ...data, columns: cols, rows });
  };

  const handleDeleteColumn = (idx: number) => {
    if (data.columns.length <= 1) return;
    const cols = [...data.columns]; 
    const delW = cols[idx].width; 
    cols.splice(idx, 1);
    const scale = 100 / (100 - delW); 
    cols.forEach(c => c.width *= scale);
    const rows = data.rows.map(r => { const c = [...r.cells]; c.splice(idx, 1); return { ...r, cells: c }; });
    setData({ ...data, columns: cols, rows }); 
    setSelection(null);
  };

  const handleSelect = (rIdx: number, cIdx: number) => {
    if (selection?.rowIdx !== rIdx || selection?.colIdx !== cIdx) {
      setSelection({ rowIdx: rIdx, colIdx: cIdx });
    }
  };

  const currentPxPerMm = basePxPerMm * zoom;
  return (
    <div className="flex h-screen bg-[#111111] overflow-hidden font-['Roboto_Condensed'] text-slate-100">
      <div ref={containerRef} className="flex-1 overflow-hidden relative select-none" onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (isShiftPressed || e.button === 1) {
          setIsDragging(true);
          dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
          if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
        } else if (!target.closest('td') && !target.closest('th') && !target.closest('button') && !target.closest('textarea') && !target.closest('.fixed')) {
          setSelection(null);
        }
      }} onMouseMove={(e) => isDragging && setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y })}
      onMouseUp={() => { 
        setIsDragging(false); 
        resizingRef.current = false;
        if (containerRef.current) containerRef.current.style.cursor = isShiftPressed ? 'grab' : 'auto'; 
      }}>
        <div className="bg-white shadow-2xl absolute left-1/2 top-1/2 flex flex-col origin-center"
          style={{ width: `${A3_WIDTH_MM * currentPxPerMm}px`, height: `${A3_HEIGHT_MM * currentPxPerMm}px`, padding: `${MARGIN_MM * currentPxPerMm}px`, transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))` }}>
          <div className="w-full flex-1 relative overflow-visible">
            <TableEditor 
              data={data} 
              selection={selection} 
              onSelect={handleSelect} 
              onUpdateCell={handleUpdateCell} 
              onUpdateCellStyle={handleUpdateCellStyle}
              onUpdateColumnTitle={handleUpdateColumnTitle}
              onUpdateGroupTitle={handleUpdateGroupTitle}
              pxPerMm={currentPxPerMm}
              onResizeColumn={handleResizeColumn}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onAddColumn={handleAddColumn}
              onDeleteColumn={handleDeleteColumn}
            />
          </div>
        </div>
        <div className="absolute top-8 left-8 bg-black/95 backdrop-blur-3xl px-5 py-3 rounded-2xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-4 shadow-2xl pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></div><span>SCALE: {(zoom * 100).toFixed(0)}%</span>
        </div>
        
        {/* Панель управления проектом */}
        <div className="absolute bottom-8 left-8 flex flex-col gap-4">
          <div className="flex gap-4">
            <button 
              onClick={handleSaveProject} 
              title="Сохранить проект (.json)" 
              className="w-16 h-16 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
            >
              <Save size={32} />
            </button>
            <input type="file" ref={projectInputRef} onChange={handleLoadProject} accept=".json" className="hidden" />
            <button 
              onClick={() => projectInputRef.current?.click()} 
              title="Загрузить проект (.json)" 
              className="w-16 h-16 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
            >
              <FolderOpen size={32} />
            </button>
          </div>
          <div className="flex gap-4">
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} title="Импорт Excel" className="w-16 h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"><Upload size={32} /></button>
            <button onClick={() => exportToPDF(data)} title="Экспорт PDF" className="w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"><FileDown size={32} /></button>
          </div>
        </div>
      </div>
      <PropertyPanel data={data} selection={selection} onUpdateStyle={(style) => selection && handleUpdateCellStyle(selection.rowIdx, selection.colIdx, style)} />
    </div>
  );
};

export default App;
