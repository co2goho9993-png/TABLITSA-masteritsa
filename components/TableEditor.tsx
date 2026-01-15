
import React, { useRef, useEffect, useState } from 'react';
import { TableData, Selection } from '../types';
import { COLORS, A3_WIDTH_MM, MARGIN_MM } from '../constants';
import { formatRussianText } from '../services/formatService';
import { Plus, Trash2, X } from 'lucide-react';

interface TableEditorProps {
  data: TableData;
  selection: Selection;
  onSelect: (rowIdx: number, colIdx: number) => void;
  onUpdateCell: (rowIdx: number, colIdx: number, value: string) => void;
  onResizeColumn: (colIdx: number, deltaPercent: number) => void;
  onAddRow: () => void;
  onDeleteRow: (idx: number) => void;
  onAddColumn: (atIdx?: number) => void;
  onDeleteColumn: (idx: number) => void;
  pxPerMm: number;
}

export const TableEditor: React.FC<TableEditorProps> = ({ 
  data, 
  selection, 
  onSelect, 
  onUpdateCell, 
  onResizeColumn,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
  pxPerMm 
}) => {
  const activeInputRef = useRef<HTMLTextAreaElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [resizingColIdx, setResizingColIdx] = useState<number | null>(null);
  const [colorPickerAnchor, setColorPickerAnchor] = useState<{ rowIdx: number, x: number, y: number } | null>(null);
  const startXRef = useRef(0);

  const baseHeaderFontSize = 2.6 * pxPerMm; 
  const standardFontSize = 3.1 * pxPerMm;
  const largerFontSize = 3.8 * pxPerMm; 
  const cellPadding = 1.0 * pxPerMm; 
  const headerPadding = 0.6 * pxPerMm; 
  const borderWidth = 0.1 * pxPerMm; 
  const controlSize = 5.0 * pxPerMm;

  useEffect(() => {
    if (selection && activeInputRef.current) {
      const textarea = activeInputRef.current;
      textarea.focus();
      textarea.style.height = '0px';
      textarea.style.height = `${textarea.scrollHeight}px`;
      
      // Выделяем весь текст для удобства быстрой перезаписи (как в Excel)
      textarea.select();
    }
  }, [selection?.rowIdx, selection?.colIdx]);

  const handleMouseDownResizer = (e: React.MouseEvent, colIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    setResizingColIdx(colIdx);
    startXRef.current = e.clientX;
  };

  useEffect(() => {
    if (resizingColIdx === null) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startXRef.current;
      const tableWidthPx = (A3_WIDTH_MM - (MARGIN_MM * 2)) * pxPerMm;
      const deltaPercent = (dx / tableWidthPx) * 100;
      onResizeColumn(resizingColIdx, deltaPercent);
      startXRef.current = e.clientX;
    };
    const handleMouseUp = () => setResizingColIdx(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColIdx, onResizeColumn, pxPerMm]);

  const handleCircleClick = (e: React.MouseEvent, rowIdx: number) => {
    e.stopPropagation();
    setColorPickerAnchor({ rowIdx, x: e.clientX, y: e.clientY });
  };

  const handleColorSelect = (color: string) => {
    if (colorPickerAnchor) {
      const { rowIdx } = colorPickerAnchor;
      const newData = { ...data };
      const cell = newData.rows[rowIdx].cells[0];
      cell.style = { ...cell.style, circleColor: color };
      onUpdateCell(rowIdx, 0, cell.value); 
      setColorPickerAnchor(null);
    }
  };

  const renderHeader = () => {
    const commonStyle = {
      borderColor: COLORS.border,
      borderWidth: `${borderWidth}px`, 
      color: '#FFFFFF',
      lineHeight: '1.05',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'keep-all' as const,
      textAlign: 'center' as const,
      fontSize: `${baseHeaderFontSize}px`
    };

    const thClass = "text-center font-bold align-middle border relative group/th";

    const renderColControls = (idx: number) => (
      <div 
        className="absolute right-0 top-0 bottom-0 z-[100] flex flex-col items-center justify-center opacity-0 group-hover/th:opacity-100 transition-opacity"
        style={{ width: `${6 * pxPerMm}px`, transform: 'translateX(50%)' }}
      >
        <div 
          onMouseDown={(e) => handleMouseDownResizer(e, idx)}
          className="w-[1px] h-full bg-blue-600/30 cursor-col-resize absolute left-1/2 -translate-x-1/2 hover:bg-blue-600 transition-colors" 
        />
        <div className="flex flex-col gap-1 z-[110] pointer-events-auto">
          <button 
            onClick={(e) => { e.stopPropagation(); onAddColumn(idx); }}
            className="bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-xl flex items-center justify-center transform hover:scale-125 transition-transform"
            style={{ width: `${3 * pxPerMm}px`, height: `${3 * pxPerMm}px` }}
          >
            <Plus size={2.0 * pxPerMm} strokeWidth={4} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDeleteColumn(idx); }}
            className="bg-red-600 text-white rounded-full hover:bg-red-700 shadow-xl flex items-center justify-center transform hover:scale-125 transition-transform"
            style={{ width: `${3 * pxPerMm}px`, height: `${3 * pxPerMm}px` }}
          >
            <X size={2.0 * pxPerMm} strokeWidth={4} />
          </button>
        </div>
      </div>
    );

    return (
      <thead style={{ overflow: 'visible' }}>
        <tr style={{ backgroundColor: COLORS.headerBg, overflow: 'visible' }}>
          {data.columns.slice(0, 8).map((col, idx) => (
            <th key={col.id} rowSpan={2} className={thClass} style={{ ...commonStyle, width: `${col.width}%`, padding: `${headerPadding}px` }}>
              {formatRussianText(col.title)}
              {renderColControls(idx)}
            </th>
          ))}
          <th colSpan={2} className={thClass} style={{ ...commonStyle, width: `${data.columns[8].width + data.columns[9].width}%`, padding: `${headerPadding}px` }}>
            {formatRussianText('Мощность ОПН')}
            <button 
              onClick={(e) => { e.stopPropagation(); onAddColumn(-1); }}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg z-[120] flex items-center justify-center transform hover:scale-125 transition-transform"
              style={{ width: `${4 * pxPerMm}px`, height: `${4 * pxPerMm}px` }}
            >
              <Plus size={2.8 * pxPerMm} strokeWidth={4} />
            </button>
          </th>
          {data.columns.slice(10).map((col, idx) => (
            <th key={col.id} rowSpan={2} className={thClass} style={{ ...commonStyle, width: `${col.width}%`, padding: `${headerPadding}px` }}>
              {formatRussianText(col.title)}
              {renderColControls(idx + 10)}
            </th>
          ))}
        </tr>
        <tr style={{ backgroundColor: COLORS.headerBg, overflow: 'visible' }}>
          <th className={thClass} style={{ ...commonStyle, width: `${data.columns[8].width}%`, padding: `${headerPadding}px` }}>
            {formatRussianText(data.columns[8].title)}
            {renderColControls(8)}
          </th>
          <th className={thClass} style={{ ...commonStyle, width: `${data.columns[9].width}%`, padding: `${headerPadding}px` }}>
            {formatRussianText(data.columns[9].title)}
            {renderColControls(9)}
          </th>
        </tr>
      </thead>
    );
  };

  const getRowNumber = (rIdx: number) => {
    let count = 0;
    for (let i = 0; i <= rIdx; i++) {
      if (!data.rows[i].isTotal) count++;
    }
    return count;
  };

  return (
    <div className="bg-white relative flex flex-col h-full" style={{ overflow: 'visible' }}>
      <div style={{ overflow: 'visible' }}>
        <table 
          ref={tableRef}
          className="w-full border-collapse table-fixed select-none" 
          style={{ border: `${borderWidth}px solid ${COLORS.border}`, overflow: 'visible' }}
          lang="ru"
        >
          {renderHeader()}
          <tbody style={{ overflow: 'visible' }}>
            {data.rows.map((row, rIdx) => {
              const isBodyRow = !row.isTotal;
              let bodyIdx = 0;
              if (isBodyRow) {
                for (let i = 0; i < rIdx; i++) if (!data.rows[i].isTotal) bodyIdx++;
              }
              const rowBg = row.isTotal ? COLORS.totalBg : (bodyIdx % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd);

              return (
                <tr 
                  key={row.id}
                  className="group/row relative"
                  style={{ backgroundColor: rowBg, overflow: 'visible' }}
                >
                  {row.cells.map((cell, cIdx) => {
                    const isSelected = selection?.rowIdx === rIdx && selection?.colIdx === cIdx;
                    const isTextCol = [1, 2, 4, 5].includes(cIdx);
                    const isNumericCol = cIdx >= 7;
                    const isPeriodCol = cIdx === 10;
                    const isFirstCol = cIdx === 0 && !row.isTotal;
                    
                    const cellValue = isFirstCol && cell.value === 'AUTO' ? getRowNumber(rIdx).toString() : cell.value;
                    
                    let currentFontSize = (cell.style?.fontSize ? cell.style.fontSize * pxPerMm : (isNumericCol ? largerFontSize : standardFontSize));
                    const fontWeight = cell.style?.fontWeight || (isNumericCol || row.isTotal ? '700' : '400');
                    
                    return (
                      <td
                        key={cell.id}
                        onClick={(e) => { e.stopPropagation(); onSelect(rIdx, cIdx); }}
                        className={`leading-tight border cursor-pointer relative ${
                          isSelected ? 'bg-[#333333]' : ''
                        }`}
                        style={{ 
                          borderColor: COLORS.border,
                          fontSize: `${currentFontSize}px`,
                          fontWeight: fontWeight,
                          textAlign: isTextCol ? 'left' : 'center',
                          verticalAlign: 'middle',
                          borderWidth: `${borderWidth}px`,
                          color: row.isTotal ? COLORS.totalText : (isSelected ? '#f0f0f0' : COLORS.text),
                          padding: `${cellPadding}px`, 
                          whiteSpace: isPeriodCol ? 'nowrap' : 'normal',
                          wordBreak: isPeriodCol ? 'keep-all' : 'break-word',
                          overflow: 'visible'
                        }}
                      >
                        {isFirstCol ? (
                          <div className="flex items-center justify-center h-full w-full">
                             <div 
                                onClick={(e) => handleCircleClick(e, rIdx)}
                                className="rounded-full flex items-center justify-center font-bold text-white shadow-sm hover:scale-110 transition-transform cursor-pointer"
                                style={{ 
                                  backgroundColor: cell.style?.circleColor || '#3b82f6',
                                  width: `${4.0 * pxPerMm}px`,
                                  height: `${4.0 * pxPerMm}px`,
                                  fontSize: `${currentFontSize * 0.85}px`
                                }}
                             >
                               {cellValue}
                             </div>
                          </div>
                        ) : isSelected ? (
                          <textarea
                            ref={activeInputRef}
                            value={cellValue}
                            onChange={(e) => {
                              onUpdateCell(rIdx, cIdx, e.target.value);
                              e.target.style.height = '0px';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            className="w-full bg-transparent outline-none resize-none overflow-hidden font-inherit border-none caret-blue-400 block"
                            style={{
                              padding: '0px',
                              fontSize: `${currentFontSize}px`,
                              fontWeight: 'inherit',
                              textAlign: 'inherit',
                              lineHeight: 'inherit',
                              color: '#f0f0f0',
                              height: 'auto',
                              minHeight: '1em'
                            }}
                          />
                        ) : (
                          <span className="relative z-0 block">
                            {formatRussianText(cellValue)}
                          </span>
                        )}
                        {isSelected && (
                          <div 
                            className="absolute pointer-events-none z-[60]" 
                            style={{ 
                              inset: `-${borderWidth}px`, 
                              border: `${borderWidth * 3}px solid #3B82F6`
                            }} 
                          />
                        )}
                      </td>
                    );
                  })}
                  {!row.isTotal && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 transition-all z-[100] pointer-events-none"
                      style={{ right: `-${controlSize * 1.1}px` }}
                    >
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteRow(rIdx); }}
                        className="bg-red-600 text-white rounded-full hover:bg-red-700 shadow-2xl flex items-center justify-center pointer-events-auto transform hover:scale-125 transition-transform"
                        style={{ width: `${controlSize}px`, height: `${controlSize}px` }}
                      >
                        <Trash2 size={controlSize * 0.55} strokeWidth={3} />
                      </button>
                    </div>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {colorPickerAnchor && (
          <div 
            className="fixed bg-black/95 backdrop-blur-2xl p-4 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/15 flex gap-3 z-[200]"
            style={{ 
              left: `${colorPickerAnchor.x}px`, 
              top: `${colorPickerAnchor.y}px`,
              transform: 'translate(-50%, 10px)'
            }}
          >
            {COLORS.circleColors.map(color => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className="w-8 h-8 rounded-full border border-white/20 hover:scale-125 transition-all shadow-inner active:scale-95"
                style={{ backgroundColor: color }}
              />
            ))}
            <button 
              onClick={(e) => { e.stopPropagation(); setColorPickerAnchor(null); }}
              className="ml-2 text-white/50 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="flex mt-2 justify-center" style={{ overflow: 'visible' }}>
          <button 
            onClick={(e) => { e.stopPropagation(); onAddRow(); }}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95"
            style={{ width: `${controlSize * 1.2}px`, height: `${controlSize * 1.2}px` }}
            title="Добавить строку"
          >
            <Plus size={controlSize * 0.7} strokeWidth={4} />
          </button>
        </div>
      </div>
    </div>
  );
};
