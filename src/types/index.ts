interface CsvData {
  headers: string[];
  rows: string[][];
}

interface FrequencyData {
  value: string;
  count: number;
  percentage: number;
}

interface ColumnStats {
  totalValues: number;
  uniqueValues: number;
  emptyValues: number;
  mostCommon: string;
  leastCommon: string;
  isNumeric: boolean;
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
  } | null;
}

export type { CsvData, FrequencyData, ColumnStats };
