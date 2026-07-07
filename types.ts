
export type TableData = Record<string, string>[];

export interface DiffResult {
  leftOnly: TableData;
  rightOnly: TableData;
  both: TableData;
  headers: string[];
}

export enum ComparisonStatus {
  IDLE = 'IDLE',
  COMPARING = 'COMPARING',
  DONE = 'DONE'
}
