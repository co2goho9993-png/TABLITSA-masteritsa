
import React from 'react';
import { TableData, Selection, TableCellStyle } from '../types';
import { Bold, Plus, Minus, Type, Circle } from 'lucide-react';

interface PropertyPanelProps {
  data: TableData;
  selection: Selection;
  onUpdateStyle: (style: TableCellStyle) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ data, selection, onUpdateStyle }) => {
  // Defensive access to current selection
  const isHeader = selection && selection.rowIdx < 0;
  const selectedRow = selection && !isHeader ? data.rows[selection.rowIdx] : null;
  const selectedCell = selectedRow ? selectedRow.cells[selection!.colIdx] : null;

  if (!selection) return (
    <div className="w-64 bg-[#1a1a1a] border-l border-white/10 p-6 flex flex-col gap-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Настройки ячейки</h3>
      <div className="flex-1 flex items-center justify-center text-gray-600 text-[10px] uppercase font-bold text-center italic">
        Выберите ячейку для редактирования стиля
      </div>
    </div>
  );

  if (isHeader) return (
    <div className="w-64 bg-[#1a1a1a] border-l border-white/10 p-6 flex flex-col gap-6 shadow-2xl z-50">
      <div className="flex flex-col gap-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Заголовок</h3>
        <span className="text-[8px] text-gray-500 uppercase font-bold">Ячейка шапки</span>
      </div>
      <div className="flex-1 flex items-center justify-center text-gray-600 text-[10px] uppercase font-bold text-center italic">
        Редактирование стиля шапки ограничено стандартами
      </div>
    </div>
  );

  if (!selectedCell) return null;

  const isFirstCol = selection.colIdx === 0;
  const currentFontSize = selectedCell?.style?.fontSize || (selection.colIdx >= 7 ? 3.8 : 3.1);
  const currentCircleSize = selectedCell?.style?.circleSize || (currentFontSize * 1.6);
  const isLinkedCol = !isFirstCol && selection.colIdx >= 1 && selection.colIdx <= 7;

  return (
    <div className="w-64 bg-[#1a1a1a] border-l border-white/10 p-6 flex flex-col gap-6 shadow-2xl z-50">
      <div className="flex flex-col gap-1">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Типографика</h3>
        <span className="text-[8px] text-gray-500 uppercase font-bold">Ячейка R{selection.rowIdx + 1}:C{selection.colIdx + 1}</span>
      </div>

      <div className="space-y-6">
        {isFirstCol && (
          <div className="flex flex-col gap-3">
            <label className="text-[9px] font-bold uppercase text-gray-400 flex items-center gap-2">
              <Circle size={12} className="text-gray-600" /> Диаметр кружка (мм)
            </label>
            <div className="flex items-center justify-between bg-black/40 rounded-lg p-1 border border-white/5">
              <button 
                onClick={() => onUpdateStyle({ circleSize: Math.max(1, currentCircleSize - 0.2) })}
                className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <Minus size={14} />
              </button>
              <span className="text-[11px] font-bold text-white tabular-nums">{currentCircleSize.toFixed(1)}</span>
              <button 
                onClick={() => onUpdateStyle({ circleSize: Math.min(30, currentCircleSize + 0.2) })}
                className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-[9px] font-bold uppercase text-gray-400 flex items-center gap-2">
            <Type size={12} className="text-gray-600" /> {isFirstCol ? 'Размер цифры (мм)' : 'Размер шрифта (мм)'}
          </label>
          <div className="flex items-center justify-between bg-black/40 rounded-lg p-1 border border-white/5">
            <button 
              onClick={() => onUpdateStyle({ fontSize: Math.max(0.5, currentFontSize - 0.1) })}
              className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="text-[11px] font-bold text-white tabular-nums">{currentFontSize.toFixed(1)}</span>
            <button 
              onClick={() => onUpdateStyle({ fontSize: Math.min(20, currentFontSize + 0.1) })}
              className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>
          {isLinkedCol && (
            <p className="text-[8px] text-blue-500/60 font-bold uppercase tracking-wider">
              * Связанный размер для колонок 2–8
            </p>
          )}
          {isFirstCol && (
            <p className="text-[8px] text-emerald-500/60 font-bold uppercase tracking-wider">
              * Независимый размер (Колонка 1)
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[9px] font-bold uppercase text-gray-400 flex items-center gap-2">
            <Bold size={12} className="text-gray-600" /> Начертание
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[400, 700].map(weight => (
              <button
                key={weight}
                onClick={() => onUpdateStyle({ fontWeight: weight })}
                className={`py-2 rounded border text-[10px] font-bold uppercase transition-all ${
                  (selectedCell?.style?.fontWeight || (isFirstCol || selection.colIdx >= 7 || data.rows[selection.rowIdx]?.isTotal ? 700 : 400)) == weight
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                {weight === 700 ? 'Bold' : 'Regular'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-2">
         <div className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Информация</div>
         <div className="text-[10px] text-gray-400 font-bold">Roboto Condensed</div>
         <div className="text-[10px] text-gray-400 font-bold">Vector Rendering Engine</div>
      </div>
    </div>
  );
};
