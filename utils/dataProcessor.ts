
import { TableData, DiffResult } from '../types';

/**
 * Simple CSV/TSV parser that handles basic pasting from Excel or similar tools.
 */
export const parseRawData = (rawText: string): { data: TableData; headers: string[] } => {
  const lines = rawText.trim().split(/\r?\n/);
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return { data: [], headers: [] };
  }

  // Detect delimiter: tab for Excel/TSV, comma for CSV
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';
  
  const headers = firstLine.split(delimiter).map(h => h.trim());
  const data: TableData = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delimiter);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (cells[index] || '').trim();
    });
    data.push(row);
  }

  return { data, headers };
};

/**
 * Compare two tables based on row content (position independent).
 * Supports selective header comparison.
 */
export const compareTables = (
  left: TableData, 
  right: TableData, 
  selectedHeaders?: string[]
): DiffResult => {
  const leftHeaders = left.length > 0 ? Object.keys(left[0]) : [];
  const rightHeaders = right.length > 0 ? Object.keys(right[0]) : [];
  const headers = Array.from(new Set([...leftHeaders, ...rightHeaders]));
  
  // 如果沒有指定欄位，預設比對所有欄位
  const compareKeys = selectedHeaders && selectedHeaders.length > 0 ? selectedHeaders : headers;

  const stringifyRow = (row: Record<string, string>) => {
    const subset: Record<string, string> = {};
    compareKeys.forEach(k => {
      subset[k] = row[k] || '';
    });
    return JSON.stringify(subset);
  };

  // 使用 Set 來儲存字串化的列，以便快速查找
  const leftStringsSet = new Set(left.map(stringifyRow));
  const rightStringsSet = new Set(right.map(stringifyRow));

  // 保留原始順序與重複項目
  const leftOnly = left.filter(row => !rightStringsSet.has(stringifyRow(row)));
  const both = left.filter(row => rightStringsSet.has(stringifyRow(row)));
  
  // 右側獨有：在右側但不在左側的
  const rightOnly = right.filter(row => !leftStringsSet.has(stringifyRow(row)));

  return { leftOnly, rightOnly, both, headers };
};

/**
 * Generate CSV content from data.
 */
export const convertToCSV = (data: TableData, headers: string[]): string => {
  if (data.length === 0) return '';
  const csvRows = [];
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] || '';
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
};

/**
 * Generate Excel compatible HTML (XLSX).
 */
export const convertToExcel = (data: TableData, headers: string[]): string => {
  let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">`;
  html += `<head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>DiffSheet</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body>`;
  html += `<table><thead><tr>`;
  headers.forEach(h => html += `<th>${h}</th>`);
  html += `</tr></thead><tbody>`;
  data.forEach(row => {
    html += `<tr>`;
    headers.forEach(h => html += `<td>${row[h] || ''}</td>`);
    html += `</tr>`;
  });
  html += `</tbody></table></body></html>`;
  return html;
};
