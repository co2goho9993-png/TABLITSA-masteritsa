
import { TableData } from './types';

export const COLORS = {
  headerBg: '#9bc1e4',
  border: '#4D4D4D',
  text: '#000000',
  totalBg: '#BDBDBD',
  totalText: '#FFFFFF', 
  rowEven: '#FFFFFF',
  rowOdd: '#E6F0F9', 
  selection: '#EBF2FF',
};

export const CIRCLE_PALETTE = [
  { color: '#f04423', label: 'Перспективные' },
  { color: '#00b06b', label: 'Законченные' },
  { color: '#1c9ad6', label: 'Субсидия' },
  { color: '#f1a98c', label: 'ФП модернизация', textBlack: true },
  { color: '#f5d38f', label: 'Казначейские', textBlack: true },
  { color: '#a0ce8c', label: 'Специальные' },
  { color: '#72c3a6', label: 'Регионы-шефы' },
  { color: '#6e1d15', label: 'Коричневый' },
  { color: '#ef1e25', label: 'Строительство' },
  { color: '#00b04a', label: 'Капремонт' },
  { color: '#c36ca6', label: 'Ремонт' },
];

export const INITIAL_COLUMNS = [
  { id: 'c1', title: '№\nп/п', width: 2.5 },
  { id: 'c2', title: 'Муниципальное образование', width: 9.0 },
  { id: 'c3', title: 'Населенный пункт', width: 7.0 }, 
  { id: 'c4', title: 'Принадлежность\nк ОНП', width: 6.5 },
  { id: 'c5', title: 'Наименование мероприятия', width: 26.3 },
  { id: 'c6', title: 'Тип мероприятия', width: 8.0 }, 
  { id: 'c7', title: 'Вид объекта', width: 5.6 },
  { id: 'c8', title: 'Протяженность,\nкм', width: 6.0 },
  { id: 'c9', title: '(кол-во)', width: 4.8 },
  { id: 'c10', title: 'Ед. изм.', width: 4.8 },
  { id: 'c11', title: 'Период\nреализации', width: 6.0 },
  { id: 'c12', title: 'Общая стоимость,\nтыс. руб. с НДС', width: 8.0 },
  { id: 'c13', title: 'Охват населения,\nтыс. чел.', width: 5.5 },
];

const createCells = (values: string[]) => values.map((v, i) => ({ 
  id: `cell-${Math.random()}-${i}`, 
  value: v,
  style: i === 0 ? { circleColor: '#1c9ad6' } : undefined
}));

export const INITIAL_DATA: TableData = {
  columns: INITIAL_COLUMNS,
  rows: [
    {
      id: 'total',
      isTotal: true,
      cells: createCells(['', 'ВСЕГО', '', '', '', '', '', '0', '5,1', 'МВт', '2024–2030', '153 182,6', ''])
    },
    {
      id: 'r1',
      cells: createCells(['AUTO', 'Станично-Луганский муниципальное округ', 'пгт. Станица Луганская', 'Да', 'Разработка проектной документации и замена оборудования котельной №1.', 'Капитальный ремонт', 'ОПН', '–', '0,8', 'МВт', '2024', '26 000', '1,2'])
    },
    {
      id: 'r2',
      cells: createCells(['AUTO', 'Станично-Луганский муниципальное округ', 'пгт. Станица Луганская', 'Да', 'Техническое перевооружение систем газоснабжения и отопления.', 'Техническое перевооружение', 'ОПН', '–', '–', '–', '2024-2025', '17 018,3', '0,8'])
    }
  ]
};

export const A3_WIDTH_MM = 420;
export const A3_HEIGHT_MM = 297;
export const MARGIN_MM = 3; // Уменьшено на 80% от 15мм
