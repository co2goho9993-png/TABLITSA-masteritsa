
import React, { useState, useEffect, useRef } from 'react';
import { TableEditor } from './components/TableEditor';
import { PropertyPanel } from './components/PropertyPanel';
import { INITIAL_DATA, A3_WIDTH_MM, A3_HEIGHT_MM, MARGIN_MM } from './constants';
import { TableData, Selection, TableCellStyle } from './types';
import { exportToPDF } from './services/pdfService';
import { FileDown } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<TableData>(INITIAL_DATA);
  const [selection, setSelection] = useState<Selection>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const basePxPerMm = 3.78;
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  const dragStartRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const posRef = useRef({ x: 0, y: 0 });
  const selectionRef = useRef<Selection>(null);

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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        e.preventDefault();
        setIsSpacePressed(true);
      }

      if (selectionRef.current && e.shiftKey) {
        let { rowIdx, colIdx } = selectionRef.current;
        let moved = false;
        if (e.key === 'ArrowUp') { rowIdx = Math.max(0, rowIdx - 1); moved = true; }
        else if (e.key === 'ArrowDown') { rowIdx = Math.min(data.rows.length - 1, rowIdx + 1); moved = true; }
        else if (e.key === 'ArrowLeft') { colIdx = Math.max(0, colIdx - 1); moved = true; }
        else if (e.key === 'ArrowRight') { colIdx = Math.min(data.columns.length - 1, colIdx + 1); moved = true; }
        if (moved) { e.preventDefault(); setSelection({ rowIdx, colIdx }); }
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, [data.rows.length, data.columns.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isInteractive = target.closest('td') || target.closest('button') || target.closest('textarea') || target.closest('.cursor-pointer');
    if (!isInteractive) setSelection(null);

    if (isSpacePressed || e.button === 1) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
    }
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
    let val = value;
    if (colIdx === 3) {
      const clean = value.trim().toLowerCase();
      if (clean === 'да') val = 'Да';
      else if (clean === 'нет') val = 'Нет';
    }
    const newData = { ...data };
    newData.rows[rowIdx].cells[colIdx].value = val;
    setData(newData);
  };

  const handleUpdateCellStyle = (rowIdx: number, colIdx: number, style: TableCellStyle) => {
    const newData = { ...data };
    const currentCell = newData.rows[rowIdx].cells[colIdx];
    
    // Глобальное пропорциональное изменение шрифта
    if (style.fontSize !== undefined) {
      const isNumericCol = (idx: number) => idx >= 7;
      const getBaseSize = (idx: number) => isNumericCol(idx) ? 3.8 : 3.1;
      const oldFontSize = currentCell.style?.fontSize || getBaseSize(colIdx);
      const ratio = style.fontSize / oldFontSize;

      newData.rows.forEach((row) => {
        row.cells.forEach((cell, cIdx) => {
          const base = cell.style?.fontSize || getBaseSize(cIdx);
          cell.style = {
            ...cell.style,
            fontSize: base * ratio
          };
        });
      });
    }

    // Применение жирности (только для текущей ячейки)
    if (style.fontWeight !== undefined) {
      currentCell.style = {
        ...currentCell.style,
        fontWeight: style.fontWeight
      };
    }

    setData({ ...newData });
  };

  const handleAddRow = () => {
    const lastRow = data.rows[data.rows.length - 1];
    const newRow = {
      id: `row-${Date.now()}`,
      cells: data.columns.map((_, i) => ({ 
        id: `cell-${Date.now()}-${i}`, 
        value: i === 0 ? 'AUTO' : '',
        style: i === 0 ? { circleColor: '#3b82f6' } : undefined
      }))
    };
    const newRows = [...data.rows];
    if (lastRow?.isTotal) newRows.splice(newRows.length - 1, 0, newRow);
    else newRows.push(newRow);
    setData({ ...data, rows: newRows });
  };

  const handleDeleteRow = (rowIdx: number) => {
    if (data.rows[rowIdx].isTotal) return;
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
             <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_#3b82f6]"></div>
             <span>SCALE: {(zoom * 100).toFixed(0)}%</span>
           </div>
        </div>

        <button
          onClick={() => exportToPDF(data)}
          className="absolute bottom-8 left-8 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-[0_10px_30px_rgba(37,99,235,0.4)] transition-all transform hover:scale-110 active:scale-95 group"
          title="Экспорт в PDF"
        >
          <FileDown size={32} />
        </button>
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
