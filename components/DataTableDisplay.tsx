
import React, { useState, useRef, useMemo, forwardRef, useEffect } from 'react';
import { TableData } from '../types';
import { parseRawData } from '../utils/dataProcessor';

interface DataTableDisplayProps {
  side: 'A' | 'B';
  data: TableData;
  headers: string[];
  visibleHeaders?: string[];
  diffData: TableData;
  title: string;
  onDataLoaded: (data: TableData, headers: string[]) => void;
  onClear: () => void;
  highlightClass: string;
  filterMode: number;
  hoveredIdentity: string | null;
  flashingIdentity: string | null;
  onRowHover: (row: Record<string, string> | null) => void;
  onRowClick?: (row: Record<string, string>) => void;
  excludedRows?: Set<number>;
  onToggleExclusion?: (index: number) => void;
  getRowIdentity: (row: Record<string, string>) => string;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  notes?: Map<string, string>;
  onNoteChange?: (rowJson: string, value: string) => void;
  onCellUpdate?: (rowIndex: number, column: string, value: string) => void;
  headerExtra?: React.ReactNode;
  limitFlash?: 'top' | 'bottom' | null;
  showSyncIndicator?: boolean;
}

const DataTableDisplay = forwardRef<HTMLDivElement, DataTableDisplayProps>(({ 
  side,
  data, 
  headers, 
  visibleHeaders,
  diffData, 
  title, 
  onDataLoaded,
  onClear,
  highlightClass,
  filterMode,
  hoveredIdentity,
  flashingIdentity,
  onRowHover,
  onRowClick,
  excludedRows,
  onToggleExclusion,
  getRowIdentity,
  onScroll,
  notes,
  onNoteChange,
  onCellUpdate,
  headerExtra,
  limitFlash,
  showSyncIndicator
}, ref) => {
  const [isManualInput, setIsManualInput] = useState(false);
  const [editingCell, setEditingCell] = useState<{rowIndex: number, column: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  
  const diffStrings = useMemo(() => new Set(diffData.map(row => JSON.stringify(row))), [diffData]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeHeaders = useMemo(() => visibleHeaders || headers, [visibleHeaders, headers]);

  const filteredDisplayDataWithIndex = useMemo(() => {
    const mapped = data.map((row, index) => ({ row, index }));
    if (filterMode === 1) return mapped.filter(({row}) => !diffStrings.has(JSON.stringify(row)));
    if (filterMode === 2) {
       const diffRows = new Set(diffData.map(r => JSON.stringify(r)));
       return mapped.filter(({row}) => diffRows.has(JSON.stringify(row)));
    }
    return mapped;
  }, [data, diffData, filterMode, diffStrings]);

  const handleManualInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.trim()) {
      const parsed = parseRawData(text);
      onDataLoaded(parsed.data, parsed.headers);
      setIsManualInput(false);
    }
  };

  const startEditing = (rowIndex: number, column: string, value: string) => {
    setEditingCell({ rowIndex, column });
    setEditValue(value);
  };

  const submitEdit = () => {
    if (editingCell && onCellUpdate) {
      onCellUpdate(editingCell.rowIndex, editingCell.column, editValue);
    }
    setEditingCell(null);
  };

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingCell]);

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-full relative">
      {/* 表格標題列 */}
      <div className="bg-slate-800/40 px-6 border-b border-slate-800 flex justify-between items-center backdrop-blur-md h-[64px] shrink-0 z-40">
        <div className="flex items-center space-x-3 overflow-hidden flex-1">
          <h3 className="font-black text-slate-100 text-[24px] md:text-[32px] tracking-tighter uppercase leading-[64px] h-[64px] whitespace-nowrap truncate shrink-0">
            {title}
          </h3>
          
          {data.length > 0 && (
            <div className="flex items-center space-x-0 shrink-0">
              <div className="flex items-center space-x-2 mr-3">
                <span className={`text-[12px] px-2 py-0.5 rounded-md font-black ${side === 'A' ? 'bg-red-900/40 text-red-400 border border-red-500/20' : 'bg-blue-900/40 text-blue-400 border border-blue-500/20'}`}>
                  {filteredDisplayDataWithIndex.length} 筆
                </span>
                <button 
                  onClick={onClear}
                  className="p-1 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg transition-all group"
                  title="清空此表資料"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* 操作提示文字區塊 */}
              <div className="flex items-center border-l border-slate-800 pl-3 space-x-3 h-[24px]">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden lg:block animate-in fade-in duration-500">
                  雙擊欄位可編輯資料
                </span>
                
                {showSyncIndicator && (
                  <div className="flex items-center space-x-2 bg-indigo-900/40 border border-indigo-500/20 px-2 py-0.5 rounded-md animate-pulse">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div>
                    <span className="text-[10px] font-black text-indigo-300 uppercase tracking-tighter">同步中</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-4 shrink-0">
          {headerExtra && (
            <div className="flex items-center">
              {headerExtra}
            </div>
          )}
        </div>
      </div>

      {/* 捲動極限閃爍層：頂部 (絕對定位於捲動容器上方) */}
      {limitFlash === 'top' && (
        <div className="absolute top-[108px] left-0 right-0 h-[40px] bg-red-600/40 z-[100] animate-pulse pointer-events-none border-y border-red-500/30"></div>
      )}

      {/* 主要內容容器 */}
      <div 
        ref={ref}
        onScroll={onScroll}
        className="h-[640px] overflow-auto custom-scrollbar bg-slate-950/20 relative"
      >
        {data.length > 0 ? (
          <table className="w-full text-left border-separate border-spacing-0 table-fixed relative">
            <thead className="sticky top-0 z-30">
              <tr className="bg-slate-800 h-[44px]">
                {activeHeaders.map((h, i) => (
                  <th key={i} className="px-5 py-0 font-black text-slate-500 border-b border-slate-800 whitespace-nowrap uppercase tracking-widest text-[16px] leading-[44px] bg-slate-800">
                    <div className="truncate">{h}</div>
                  </th>
                ))}
                
                {onToggleExclusion && (
                  <th className="sticky-header right-0 px-3 w-14 text-center border-b border-slate-800">
                    <div className="flex items-center justify-center h-full relative group">
                      <svg className="w-5 h-5 text-slate-500 hover:text-indigo-400 transition-colors cursor-help" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                      </svg>
                      <div className="absolute top-1/2 -translate-y-1/2 right-[140%] px-4 py-2 bg-slate-800 border border-slate-600 text-white text-[12px] font-bold rounded-xl shadow-2xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all pointer-events-none whitespace-nowrap z-[100] backdrop-blur-xl">
                        將所選項目在匯出時隱藏。
                        <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-slate-800 border-r border-t border-slate-600 rotate-45"></div>
                      </div>
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/10 cursor-pointer">
              {filteredDisplayDataWithIndex.map(({row, index: originalIndex}, rowIndex) => {
                const rowJson = JSON.stringify(row);
                const identity = getRowIdentity(row);
                const isDiff = diffStrings.has(rowJson);
                const isSyncHovered = hoveredIdentity === identity;
                const isExcluded = excludedRows?.has(originalIndex);
                const isFlashing = flashingIdentity === identity;

                const trStatusClasses = [
                  isDiff ? (highlightClass.includes('red') ? 'is-diff-red' : 'is-diff-blue') : '',
                  isExcluded ? 'is-excluded' : '',
                  isSyncHovered ? 'is-sync-hover' : '',
                  isFlashing ? 'animate-pulse-sync' : ''
                ].join(' ');

                return (
                  <tr 
                    key={rowIndex} 
                    data-identity={identity}
                    onMouseEnter={() => onRowHover(row)}
                    onMouseLeave={() => onRowHover(null)}
                    onClick={() => onRowClick?.(row)}
                    className={`group strict-row overflow-hidden relative ${trStatusClasses}`}
                  >
                    {activeHeaders.map((h, colIndex) => {
                      const isEditing = editingCell?.rowIndex === originalIndex && editingCell?.column === h;
                      return (
                        <td 
                          key={colIndex} 
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            startEditing(originalIndex, h, row[h] || "");
                          }}
                          className={`px-5 py-0 whitespace-nowrap truncate text-[18px] leading-[40px] strict-row ${isDiff ? 'text-slate-100 font-bold' : 'text-slate-400 group-hover:text-slate-100'} ${isSyncHovered ? 'text-indigo-200' : ''}`}
                        >
                          <div className={`h-full flex items-center transition-opacity ${isExcluded ? 'opacity-30' : 'opacity-100'}`}>
                            {isEditing ? (
                              <input 
                                ref={editInputRef}
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') submitEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                onBlur={submitEdit}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full h-[32px] bg-slate-900 border border-indigo-500 text-white rounded px-2 outline-none shadow-lg z-50"
                              />
                            ) : (
                              row[h] || <span className="text-slate-800 italic opacity-20 text-[12px]">null</span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    {onToggleExclusion && (
                      <td className="sticky-cell right-0 px-3 text-center w-14 strict-row">
                        <div className="flex items-center justify-center h-full">
                          <input 
                            type="checkbox"
                            checked={isExcluded}
                            onChange={(e) => {
                                e.stopPropagation();
                                onToggleExclusion?.(originalIndex);
                            }}
                            className="w-5 h-5 rounded-md bg-slate-950 border-slate-700 text-red-600 focus:ring-0 cursor-pointer shadow-sm transition-transform active:scale-90"
                          />
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
            {isManualInput ? (
              <div className="w-full h-full flex flex-col animate-in fade-in zoom-in duration-300 p-2">
                <textarea
                  ref={textareaRef}
                  onChange={handleManualInput}
                  placeholder="在此處貼上內容 (Ctrl+V)..."
                  className="flex-1 bg-slate-950 border-2 border-dashed border-indigo-500/20 rounded-2xl p-6 text-indigo-100 font-mono text-sm outline-none transition-all resize-none shadow-2xl focus:border-indigo-500/40"
                />
                <button onClick={() => setIsManualInput(false)} className="mt-3 text-slate-600 hover:text-white font-black transition-colors text-xs uppercase tracking-widest">取消貼上</button>
              </div>
            ) : (
              <div 
                onClick={() => { setIsManualInput(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
                className="group w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/10 transition-all rounded-3xl border-2 border-dashed border-slate-800 hover:border-indigo-500/30"
              >
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-900/10 border border-slate-700 transition-all shadow-xl">
                  <svg className="w-8 h-8 text-slate-500 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="text-xl font-black text-slate-600 group-hover:text-slate-300 tracking-tight">點擊貼上資料</h4>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 捲動極限閃爍層：底部 (絕對定位於組件最下方) */}
      {limitFlash === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-red-600/40 z-[100] animate-pulse pointer-events-none border-y border-red-500/30"></div>
      )}
    </div>
  );
});

export default DataTableDisplay;
