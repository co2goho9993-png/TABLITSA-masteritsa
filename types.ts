
export interface TableCellStyle {
  fontSize?: number;
  fontWeight?: string | number;
  circleColor?: string;
  circleSize?: number;
}

export interface TableCell {
  id: string;
  value: string;
  style?: TableCellStyle;
}

export interface TableRow {
  id: string;
  cells: TableCell[];
  isHeader?: boolean;
  isTotal?: boolean;
}

export interface TableColumn {
  id: string;
  title: string;
  width: number; // percentage
}

export interface TableData {
  columns: TableColumn[];
  rows: TableRow[];
}

export type Selection = {
  rowIdx: number;
  colIdx: number;
} | null;
