
import React, { useState, useMemo } from 'react';
import { TableData } from '../types';
import { convertToCSV, convertToExcel } from '../utils/dataProcessor';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TableData;
  headers: string[];
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, data, headers }) => {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle');
  const [csvStatus, setCsvStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [xlsStatus, setXlsStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // 控制要匯出的欄位
  const [exportSelectedHeaders, setExportSelectedHeaders] = useState<Set<string>>(new Set(headers));

  const toggleHeader = (h: string) => {
    setExportSelectedHeaders(prev => {
      const next = new Set(prev);
      if (next.has(h)) next.delete(h); else next.add(h);
      return next;
    });
  };

  const selectAllHeaders = () => setExportSelectedHeaders(new Set(headers));
  const deselectAllHeaders = () => setExportSelectedHeaders(new Set());

  // 匯出時使用的欄位 (維持原始順序)
  const activeExportHeaders = useMemo(() => {
    return headers.filter(h => exportSelectedHeaders.has(h));
  }, [headers, exportSelectedHeaders]);

  if (!isOpen) return null;

  const handleCopyData = async () => {
    if (data.length === 0 || copyStatus !== 'idle' || activeExportHeaders.length === 0) return;
    
    // 標頭行
    const headerLine = activeExportHeaders.join('\t');
    // 資料行
    const dataLines = data.map(row => 
      activeExportHeaders.map(h => row[h] || '').join('\t')
    ).join('\n');

    const fullContent = `${headerLine}\n${dataLines}`;

    try {
      await navigator.clipboard.writeText(fullContent);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error('複製失敗:', err);
      alert('無法複製到剪貼簿');
    }
  };

  const handleDownloadCSV = () => {
    if (csvStatus !== 'idle' || activeExportHeaders.length === 0) return;
    setCsvStatus('processing');
    
    setTimeout(() => {
      const csvContent = convertToCSV(data, activeExportHeaders);
      const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `DiffSheet_CSV_${new Date().toISOString().slice(0, 10)}.csv`);
      link.click();
      
      setCsvStatus('success');
      setTimeout(() => {
        setCsvStatus('idle');
        onClose();
      }, 1000);
    }, 300);
  };

  const handleDownloadExcel = () => {
    if (xlsStatus !== 'idle' || activeExportHeaders.length === 0) return;
    setXlsStatus('processing');

    setTimeout(() => {
      const excelContent = convertToExcel(data, activeExportHeaders);
      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `DiffSheet_Excel_${new Date().toISOString().slice(0, 10)}.xls`);
      link.click();
      
      setXlsStatus('success');
      setTimeout(() => {
        setXlsStatus('idle');
        onClose();
      }, 1000);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">
        
        {/* 彈窗標頭 */}
        <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div>
            <h2 className="text-xl font-bold text-slate-100 flex items-center">
              匯出篩選與預覽
              <span className="ml-3 px-2 py-0.5 bg-indigo-900/40 text-indigo-400 border border-indigo-500/30 rounded-full text-xs">
                {data.length} 筆
              </span>
            </h2>
            <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-wider">自定義要匯出的欄位順序與內容</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors group">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 匯出欄位篩選區 */}
        <div className="px-6 py-4 bg-slate-800/20 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">匯出欄位控制 ({activeExportHeaders.length}/{headers.length})</span>
            <div className="flex items-center space-x-4">
              <button onClick={selectAllHeaders} className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest">全選</button>
              <button onClick={deselectAllHeaders} className="text-[10px] font-black text-slate-500 hover:text-red-400 uppercase tracking-widest">清除</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {headers.map(h => (
              <button
                key={h}
                onClick={() => toggleHeader(h)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all border ${exportSelectedHeaders.has(h) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
              >
                {h}
              </button>
            ))}
          </div>
        </div>

        {/* 預覽表格區 */}
        <div className="flex-1 overflow-auto p-6 bg-slate-950/30 custom-scrollbar">
          {data.length > 0 ? (
            activeExportHeaders.length > 0 ? (
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
                <table className="w-full text-left text-xs border-collapse table-fixed">
                  <thead className="bg-slate-800/80 border-b border-slate-700">
                    <tr>
                      {activeExportHeaders.map((h, i) => (
                        <th key={i} className="px-4 py-3 font-bold text-slate-400 whitespace-nowrap uppercase tracking-widest text-[9px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {data.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                        {activeExportHeaders.map((h, j) => (
                          <td key={j} className="px-4 py-2.5 text-slate-400 whitespace-nowrap truncate">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 50 && (
                  <div className="px-5 py-3 text-center text-[10px] text-slate-500 font-black bg-slate-800/30 uppercase tracking-widest">
                    ... 另外 {data.length - 50} 筆資料已就緒
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-700 py-20 border-2 border-dashed border-slate-800 rounded-3xl">
                <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
                </svg>
                <p className="text-sm font-black uppercase tracking-widest">請至少選擇一個匯出欄位</p>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 py-20">
              <p className="text-lg font-bold">目前沒有可匯出的內容</p>
            </div>
          )}
        </div>

        {/* 底部操作區 */}
        <div className="px-6 py-5 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 flex-wrap">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-all text-sm"
          >
            取消
          </button>
          
          <button 
            onClick={handleCopyData}
            disabled={data.length === 0 || activeExportHeaders.length === 0}
            className={`min-w-[130px] px-6 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center border ${
              copyStatus === 'success' 
                ? 'bg-indigo-600 border-indigo-400 text-white shadow-indigo-900/40' 
                : 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700'
            } disabled:opacity-50`}
          >
            {copyStatus === 'success' ? '成功複製！' : '複製內容'}
          </button>

          <button 
            onClick={handleDownloadCSV}
            disabled={data.length === 0 || csvStatus !== 'idle' || activeExportHeaders.length === 0}
            className={`min-w-[130px] px-6 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center border ${
              csvStatus === 'success'
                ? 'bg-emerald-600 border-emerald-400 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-100 hover:bg-slate-600'
            } disabled:opacity-50`}
          >
            {csvStatus === 'idle' && '匯出為 CSV'}
            {csvStatus === 'processing' && '處理中...'}
            {csvStatus === 'success' && '匯出完成'}
          </button>
          
          <button 
            onClick={handleDownloadExcel}
            disabled={data.length === 0 || xlsStatus !== 'idle' || activeExportHeaders.length === 0}
            className={`min-w-[160px] px-6 py-2.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center shadow-xl ${
              xlsStatus === 'success'
                ? 'bg-emerald-500 text-white shadow-emerald-900/20'
                : 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-emerald-900/40'
            } disabled:bg-slate-800 disabled:text-slate-600 disabled:shadow-none disabled:opacity-50`}
          >
            {xlsStatus === 'idle' && '匯出為試算表 (XLS)'}
            {xlsStatus === 'processing' && '正在產生檔案...'}
            {xlsStatus === 'success' && '成功下載！'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
