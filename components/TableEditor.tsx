
import React, { useRef, useEffect, useState } from 'react';
import { TableData, Selection, TableCellStyle } from '../types';
import { COLORS, A3_WIDTH_MM, MARGIN_MM } from '../constants';
import { formatRussianText } from '../services/formatService';
import { Plus, Trash2, X } from 'lucide-react';

interface TableEditorProps {
  data: TableData;
  selection: Selection;
  onSelect: (rowIdx: number, colIdx: number) => void;
  onUpdateCell: (rowIdx: number, colIdx: number, value: string) => void;
  onUpdateCellStyle: (rowIdx: number, colIdx: number, style: TableCellStyle) => void;
  onResizeColumn: (colIdx: number, deltaPercent: number) => void;
  onAddRow: () => void;
  onDeleteRow: (idx: number) => void;
  onAddColumn: (atIdx?: number) => void;
  onDeleteColumn: (idx: number) => void;
  onUpdateColumnTitle: (colIdx: number, title: string) => void;
  onUpdateGroupTitle: (title: string) => void;
  pxPerMm: number;
}

export const TableEditor: React.FC<TableEditorProps> = ({ 
  data, 
  selection, 
  onSelect, 
  onUpdateCell, 
  onUpdateCellStyle,
  onResizeColumn,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
  onUpdateColumnTitle,
  onUpdateGroupTitle,
  pxPerMm 
}) => {
  const activeInputRef = useRef<HTMLTextAreaElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const [resizingColIdx, setResizingColIdx] = useState<number | null>(null);
  const startXRef = useRef(0);

  const baseHeaderFontSize = 2.6 * pxPerMm; 
  const standardFontSize = 3.1 * pxPerMm;
  const largerFontSize = 3.8 * pxPerMm; 
  const cellPadding = 0.7 * pxPerMm;
  const headerPadding = 0.6 * pxPerMm; 
  const borderWidth = 0.1 * pxPerMm; 
  const controlSize = 5.0 * pxPerMm;

  useEffect(() => {
    if (selection && activeInputRef.current) {
      const textarea = activeInputRef.current;
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
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

  const renderEditableHeaderCell = (idx: number, isGroup?: boolean) => {
    const rowIdx = isGroup ? -2 : -1;
    const isSelected = selection?.rowIdx === rowIdx && selection?.colIdx === idx;
    const value = isGroup ? (data.groupTitle || '') : data.columns[idx].title;

    return (
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        <span 
          className="whitespace-pre-wrap invisible pointer-events-none select-none"
          style={{ 
            fontSize: `${baseHeaderFontSize}px`,
            lineHeight: '1.05',
            padding: '0px',
            display: 'block',
            width: '100%'
          }}
        >
          {formatRussianText(value) || ' '}
        </span>
        
        {isSelected ? (
          <textarea
            ref={activeInputRef}
            value={value}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
            }}
            onChange={(e) => {
              if (isGroup) onUpdateGroupTitle(e.target.value);
              else onUpdateColumnTitle(idx, e.target.value);
            }}
            className="absolute inset-0 w-full h-full bg-transparent outline-none resize-none overflow-hidden font-inherit border-none caret-white block"
            style={{
              padding: '0px',
              fontSize: `${baseHeaderFontSize}px`,
              fontWeight: 'bold',
              textAlign: 'center',
              lineHeight: '1.05',
              color: '#FFFFFF',
              margin: '0'
            }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-center leading-[1.05] whitespace-pre-wrap px-0">
             {formatRussianText(value)}
          </span>
        )}
      </div>
    );
  };

  const renderHeader = () => {
    const commonStyle = (idx: number, isGroup?: boolean) => {
      const rowIdx = isGroup ? -2 : -1;
      const isSelected = selection?.rowIdx === rowIdx && selection?.colIdx === idx;
      return {
        borderColor: COLORS.border,
        borderWidth: `${borderWidth}px`, 
        color: '#FFFFFF',
        textAlign: 'center' as const,
        fontSize: `${baseHeaderFontSize}px`,
        outline: isSelected ? `${borderWidth * 3}px solid #3B82F6` : 'none',
        outlineOffset: `-${borderWidth * 1.5}px`,
        overflow: 'visible' as const
      };
    };

    const thClass = "text-center font-bold align-middle border relative group/th cursor-pointer";

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
            <th 
              key={col.id} 
              rowSpan={2} 
              className={thClass} 
              onClick={(e) => { e.stopPropagation(); onSelect(-1, idx); }}
              style={{ ...commonStyle(idx), width: `${col.width}%`, padding: `${headerPadding}px` }}
            >
              {renderEditableHeaderCell(idx)}
              {renderColControls(idx)}
            </th>
          ))}
          <th 
            colSpan={2} 
            className={thClass} 
            onClick={(e) => { e.stopPropagation(); onSelect(-2, 8); }}
            style={{ ...commonStyle(8, true), width: `${data.columns[8].width + data.columns[9].width}%`, padding: `${headerPadding}px` }}
          >
            {renderEditableHeaderCell(8, true)}
            <button 
              onClick={(e) => { e.stopPropagation(); onAddColumn(-1); }}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg z-[120] flex items-center justify-center transform hover:scale-125 transition-transform"
              style={{ width: `${4 * pxPerMm}px`, height: `${4 * pxPerMm}px` }}
            >
              <Plus size={2.8 * pxPerMm} strokeWidth={4} />
            </button>
          </th>
          {data.columns.slice(10).map((col, idx) => {
            const actualIdx = idx + 10;
            return (
              <th 
                key={col.id} 
                rowSpan={2} 
                className={thClass} 
                onClick={(e) => { e.stopPropagation(); onSelect(-1, actualIdx); }}
                style={{ ...commonStyle(actualIdx), width: `${col.width}%`, padding: `${headerPadding}px` }}
              >
                {renderEditableHeaderCell(actualIdx)}
                {renderColControls(actualIdx)}
              </th>
            );
          })}
        </tr>
        <tr style={{ backgroundColor: COLORS.headerBg, overflow: 'visible' }}>
          <th 
            className={thClass} 
            onClick={(e) => { e.stopPropagation(); onSelect(-1, 8); }}
            style={{ ...commonStyle(8), width: `${data.columns[8].width}%`, padding: `${headerPadding}px` }}
          >
            {renderEditableHeaderCell(8)}
            {renderColControls(8)}
          </th>
          <th 
            className={thClass} 
            onClick={(e) => { e.stopPropagation(); onSelect(-1, 9); }}
            style={{ ...commonStyle(9), width: `${data.columns[9].width}%`, padding: `${headerPadding}px` }}
          >
            {renderEditableHeaderCell(9)}
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
                    const isNumericCol = cIdx >= 7;
                    const isFirstCol = cIdx === 0 && !row.isTotal;
                    const isLastCol = cIdx === data.columns.length - 1;
                    
                    const cellValue = isFirstCol && cell.value === 'AUTO' ? getRowNumber(rIdx).toString() : cell.value;
                    
                    let currentFontSize = (cell.style?.fontSize ? cell.style.fontSize * pxPerMm : (isNumericCol ? largerFontSize : standardFontSize));
                    const currentCircleSize = (cell.style?.circleSize ? cell.style.circleSize * pxPerMm : currentFontSize * 1.6);
                    const fontWeight = cell.style?.fontWeight || (isFirstCol || isNumericCol || row.isTotal ? '700' : '400');
                    const textAlign = cIdx === 4 ? 'left' : 'center';

                    return (
                      <td
                        key={cell.id}
                        onClick={(e) => { e.stopPropagation(); onSelect(rIdx, cIdx); }}
                        className={`leading-tight border cursor-pointer relative group/cell ${
                          isSelected ? 'bg-[#333333]' : ''
                        }`}
                        style={{ 
                          borderColor: COLORS.border,
                          fontSize: `${currentFontSize}px`,
                          fontWeight: fontWeight,
                          textAlign: textAlign, 
                          verticalAlign: 'middle',
                          borderWidth: `${borderWidth}px`,
                          color: row.isTotal ? COLORS.totalText : (isSelected ? '#f0f0f0' : COLORS.text),
                          padding: `${cellPadding}px`, 
                          overflow: 'visible'
                        }}
                      >
                        {isFirstCol ? (
                          <div className="flex items-center justify-center h-full w-full">
                             <div 
                                className="rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform cursor-pointer leading-none"
                                style={{ 
                                  backgroundColor: cell.style?.circleColor || '#1c9ad6',
                                  width: `${currentCircleSize}px`,
                                  height: `${currentCircleSize}px`,
                                  fontSize: `${currentFontSize}px`,
                                  fontWeight: fontWeight,
                                  color: '#FFFFFF'
                                }}
                             >
                               {cellValue}
                             </div>
                          </div>
                        ) : (
                          <div className="relative w-full h-full flex items-center overflow-hidden">
                             <span 
                               className="whitespace-pre-wrap invisible pointer-events-none select-none block w-full"
                               style={{ 
                                 lineHeight: '1.2',
                                 padding: '0px',
                                 fontSize: `${currentFontSize}px`
                               }}
                             >
                               {formatRussianText(cellValue) || ' '}
                             </span>

                             {isSelected ? (
                               <textarea
                                 ref={activeInputRef}
                                 value={cellValue}
                                 onKeyDown={(e) => {
                                   if (e.key === ' ' || e.key === 'Enter') e.stopPropagation();
                                 }}
                                 onChange={(e) => {
                                   onUpdateCell(rIdx, cIdx, e.target.value);
                                 }}
                                 className="absolute inset-0 w-full h-full bg-transparent outline-none resize-none overflow-hidden font-inherit border-none caret-blue-400 block"
                                 style={{
                                   padding: '0px',
                                   fontSize: `${currentFontSize}px`,
                                   fontWeight: 'inherit',
                                   textAlign: 'inherit',
                                   lineHeight: '1.2',
                                   color: '#f0f0f0',
                                   margin: '0'
                                 }}
                               />
                             ) : (
                               <span 
                                 className="absolute inset-0 flex items-center whitespace-pre-wrap break-words"
                                 style={{ 
                                   justifyContent: textAlign === 'left' ? 'flex-start' : 'center',
                                   textAlign: textAlign
                                 }}
                               >
                                 {formatRussianText(cellValue)}
                               </span>
                             )}
                          </div>
                        )}

                        {!isLastCol && (
                          <div 
                            onMouseDown={(e) => handleMouseDownResizer(e, cIdx)}
                            className="absolute right-0 top-0 bottom-0 z-[50] group-hover/cell:opacity-100 opacity-0 transition-opacity flex items-center justify-center"
                            style={{ width: `${4 * pxPerMm}px`, cursor: 'col-resize', transform: 'translateX(50%)' }}
                          >
                            <div 
                              className="w-[2px] h-[80%] bg-blue-500/60 rounded-full shadow-lg"
                              style={{ height: 'calc(100% - 4px)' }}
                            />
                          </div>
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
