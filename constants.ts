
import { TableData } from './types';

export const COLORS = {
  headerBg: '#B8CCE4', // Specific reference light blue
  border: '#4D4D4D',   // 70% black saturation
  text: '#000000',
  totalBg: '#BDBDBD', // Lightened gray for TOTAL row
  totalText: '#FFFFFF', 
  rowEven: '#FFFFFF',
  rowOdd: '#E6F0F9', 
  selection: '#EBF2FF',
  circleColors: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#000000']
};

export const INITIAL_COLUMNS = [
  { id: 'c1', title: '№\nп/п', width: 2.5 },
  { id: 'c2', title: 'Муниципальное образование', width: 9.0 },
  { id: 'c3', title: 'Населенный пункт', width: 10.0 },
  { id: 'c4', title: 'Принадлежность\nк ОНП', width: 6.5 },
  { id: 'c5', title: 'Наименование мероприятия', width: 25.3 }, // Increased to soak up space from c12 reduction
  { id: 'c6', title: 'Тип мероприятия', width: 7.6 },
  { id: 'c7', title: 'Вид объекта', width: 5.6 },
  { id: 'c8', title: 'Протяженность,\nкм', width: 6.0 },
  { id: 'c9', title: '(кол-во)', width: 4.0 },
  { id: 'c10', title: 'Ед. изм.', width: 4.0 },
  { id: 'c11', title: 'Период\nреализации', width: 6.0 },
  { id: 'c12', title: 'Общая стоимость,\nтыс. руб. с НДС', width: 8.0 }, // Reduced by ~30% from 11.45
  { id: 'c13', title: 'Охват населения,\nтыс. чел.', width: 5.5 },
];

const createCells = (values: string[]) => values.map((v, i) => ({ 
  id: `cell-${Math.random()}-${i}`, 
  value: v,
  style: i === 0 ? { circleColor: '#3b82f6' } : undefined
}));

export const INITIAL_DATA: TableData = {
  columns: INITIAL_COLUMNS,
  rows: [
    {
      id: 'total',
      isTotal: true,
      cells: createCells(['', 'ВСЕГО', '', '', '', '', '', '', '5,1', 'МВт', '2024–2030', '153 182,6', '-'])
    },
    {
      id: 'r1',
      cells: createCells(['AUTO', 'Станично-Луганский муниципальный округ', 'пгт. Станица Луганская', 'Да', 'Разработка проектной документации и замена оборудования котельной №1.', 'Капитальный ремонт', 'ОПН', '-', '0,8', 'МВт', '2024', '26 000,0', '1.2'])
    },
    {
      id: 'r2',
      cells: createCells(['AUTO', 'Станично-Луганский муниципальный округ', 'пгт. Станица Луганская', 'Да', 'Техническое перевооружение систем газоснабжения и отопления.', 'Техническое перевооружение', 'ОПН', '-', '-', '-', '2024-2025', '17 018,3', '0.8'])
    },
    {
      id: 'r3',
      cells: createCells(['AUTO', 'Станично-Луганский муниципальный округ', 'с. Ольховое', 'Да', 'Строительство подводящего газопровода высокого давления.', 'Строительство', 'Линейный объект', '4.2', '-', '-', '2025', '45 000,0', '3.5'])
    },
    {
      id: 'r4',
      cells: createCells(['AUTO', 'Станично-Луганский муниципальный округ', 'пгт. Станица Луганская', 'Да', 'Замена ветхих тепловых сетей от котельной №2.', 'Капитальный ремонт', 'Тепловые сети', '1.5', '-', '-', '2024', '12 500,0', '0.5'])
    }
  ]
};

export const A3_WIDTH_MM = 420;
export const A3_HEIGHT_MM = 297;
export const MARGIN_MM = 15;
