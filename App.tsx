
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { compareTables } from './utils/dataProcessor';
import { TableData, DiffResult, ComparisonStatus } from './types';
import DataTableDisplay from './components/DataTableDisplay';
import ExportModal from './components/ExportModal';

const App: React.FC = () => {
  const [leftData, setLeftData] = useState<TableData>([]);
  const [rightData, setRightData] = useState<TableData>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedCompareHeaders, setSelectedCompareHeaders] = useState<Set<string>>(new Set());
  const [hideIgnoredColumns, setHideIgnoredColumns] = useState(false);
  
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [status, setStatus] = useState<ComparisonStatus>(ComparisonStatus.IDLE);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [filterMode, setFilterMode] = useState<number>(0);
  const [hoveredIdentity, setHoveredIdentity] = useState<string | null>(null);
  const [flashingIdentity, setFlashingIdentity] = useState<string | null>(null);
  
  const [excludedLeft, setExcludedLeft] = useState<Set<number>>(new Set());
  const [tableAHeaderNote, setTableAHeaderNote] = useState("");
  const [tableBHeaderNote, setTableBHeaderNote] = useState("");

  const [includeIdenticalInExport, setIncludeIdenticalInExport] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [bLimitFlash, setBLimitFlash] = useState<'top' | 'bottom' | null>(null);
  const syncOffsetRef = useRef<number>(0);
  const isInternalScrolling = useRef<boolean>(false);
  const flashTimerRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef<number>(0);

  const tableARef = useRef<HTMLDivElement>(null);
  const tableBRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === ComparisonStatus.DONE) {
      setDiffResult(null);
      setStatus(ComparisonStatus.IDLE);
    }
  }, [leftData, rightData, selectedCompareHeaders]);

  const triggerLimitFlash = (direction: 'top' | 'bottom') => {
    if (flashTimerRef.current) window.clearTimeout(flashTimerRef.current);
    setBLimitFlash(direction);
    flashTimerRef.current = window.setTimeout(() => {
      setBLimitFlash(null);
      flashTimerRef.current = null;
    }, 400);
  };

  const handleDataLoaded = (side: 'left' | 'right', data: TableData, newHeaders: string[]) => {
    let currentOtherSideHeaders: string[] = [];
    if (side === 'left') {
      currentOtherSideHeaders = rightData.length > 0 ? Object.keys(rightData[0]) : [];
    } else {
      currentOtherSideHeaders = leftData.length > 0 ? Object.keys(leftData[0]) : [];
    }

    const updatedHeaders = Array.from(new Set([...currentOtherSideHeaders, ...newHeaders]));
    setHeaders(updatedHeaders);
    
    if (selectedCompareHeaders.size === 0) {
      setSelectedCompareHeaders(new Set(updatedHeaders));
    } else {
      const nextSelected = new Set(selectedCompareHeaders);
      newHeaders.forEach(h => nextSelected.add(h));
      setSelectedCompareHeaders(nextSelected);
    }

    if (side === 'left') {
      setLeftData(data);
      setExcludedLeft(new Set());
    } else {
      setRightData(data);
    }
    setIsSyncing(false);
  };

  const toggleCompareHeader = (h: string) => {
    const next = new Set(selectedCompareHeaders);
    if (next.has(h)) next.delete(h); else next.add(h);
    setSelectedCompareHeaders(next);
  };

  const handleCompare = useCallback(() => {
    if (leftData.length === 0 || rightData.length === 0) {
      alert("請確保兩側都有資料。");
      return;
    }
    setStatus(ComparisonStatus.COMPARING);
    setTimeout(() => {
      const result = compareTables(leftData, rightData, Array.from(selectedCompareHeaders));
      setDiffResult(result);
      setStatus(ComparisonStatus.DONE);
    }, 200);
  }, [leftData, rightData, selectedCompareHeaders]);

  const handleClear = () => {
    setLeftData([]);
    setRightData([]);
    setHeaders([]);
    setSelectedCompareHeaders(new Set());
    setDiffResult(null);
    setStatus(ComparisonStatus.IDLE);
    setExcludedLeft(new Set());
    setTableAHeaderNote("");
    setTableBHeaderNote("");
    setFilterMode(0);
    setFlashingIdentity(null);
    setIsSyncing(false);
    setIncludeIdenticalInExport(false);
  };

  const handleClearSide = (side: 'A' | 'B') => {
    let nextHeaders: string[] = [];
    
    if (side === 'A') {
      setLeftData([]);
      setExcludedLeft(new Set());
      setTableAHeaderNote("");
      if (rightData.length > 0) {
        nextHeaders = Object.keys(rightData[0]);
      }
    } else {
      setRightData([]);
      setTableBHeaderNote("");
      if (leftData.length > 0) {
        nextHeaders = Object.keys(leftData[0]);
      }
    }

    setHeaders(nextHeaders);
    const nextSelected = new Set<string>();
    selectedCompareHeaders.forEach(h => {
      if (nextHeaders.includes(h)) nextSelected.add(h);
    });
    setSelectedCompareHeaders(nextSelected);

    setDiffResult(null);
    setStatus(ComparisonStatus.IDLE);
    setFlashingIdentity(null);
    setFilterMode(0);
    setIsSyncing(false);
  };

  const getRowIdentity = useCallback((row: Record<string, string>) => {
    const subset: Record<string, string> = {};
    const keys = selectedCompareHeaders.size > 0 ? Array.from(selectedCompareHeaders) : headers;
    keys.forEach(k => {
      subset[k] = row[k] || '';
    });
    return JSON.stringify(subset);
  }, [selectedCompareHeaders, headers]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>, sourceSide: 'A' | 'B') => {
    if (!isSyncing || isInternalScrolling.current) {
        lastScrollTopRef.current = e.currentTarget.scrollTop;
        return;
    }

    const source = e.currentTarget;
    const target = sourceSide === 'A' ? tableBRef.current : tableARef.current;

    if (target) {
      isInternalScrolling.current = true;
      
      const delta = source.scrollTop - lastScrollTopRef.current;
      const direction = delta > 0 ? 'down' : 'up';
      lastScrollTopRef.current = source.scrollTop;

      const newScrollTop = sourceSide === 'A' 
        ? source.scrollTop + syncOffsetRef.current 
        : source.scrollTop - syncOffsetRef.current;
      
      target.scrollTop = newScrollTop;

      if (sourceSide === 'A' && target.scrollHeight > target.clientHeight) {
        if (direction === 'up' && target.scrollTop === 0 && newScrollTop < -2) {
          triggerLimitFlash('top');
        } else if (direction === 'down' && Math.abs(target.scrollTop + target.clientHeight - target.scrollHeight) < 5 && newScrollTop + target.clientHeight > target.scrollHeight + 2) {
          triggerLimitFlash('bottom');
        }
      }

      window.requestAnimationFrame(() => {
        isInternalScrolling.current = false;
      });
    }
  };

  const handleRowClickAlignment = (clickedRow: Record<string, string>) => {
    if (isSyncing) {
      setIsSyncing(false);
      return;
    }

    const identity = getRowIdentity(clickedRow);
    const rowA = tableARef.current?.querySelector(`[data-identity='${identity}']`) as HTMLElement;
    const rowB = tableBRef.current?.querySelector(`[data-identity='${identity}']`) as HTMLElement;

    if (rowA && tableARef.current && rowB && tableBRef.current) {
      const containerA = tableARef.current;
      const containerB = tableBRef.current;
      const visualOffsetA = rowA.offsetTop - containerA.scrollTop;
      const targetScrollTopB = rowB.offsetTop - visualOffsetA;

      setFlashingIdentity(identity);
      setTimeout(() => setFlashingIdentity(null), 1000);

      containerB.scrollTo({ top: targetScrollTopB, behavior: 'smooth' });
      
      setTimeout(() => {
        syncOffsetRef.current = containerB.scrollTop - containerA.scrollTop;
        lastScrollTopRef.current = containerA.scrollTop;
        setIsSyncing(true);
      }, 500); 
    }
  };

  const handleToggleExclusion = (index: number) => {
    setExcludedLeft(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  };

  const handleUpdateCell = (side: 'A' | 'B', rowIndex: number, column: string, newValue: string) => {
    if (side === 'A') {
      const newData = [...leftData];
      newData[rowIndex] = { ...newData[rowIndex], [column]: newValue };
      setLeftData(newData);
    } else {
      const newData = [...rightData];
      newData[rowIndex] = { ...newData[rowIndex], [column]: newValue };
      setRightData(newData);
    }
    if (status === ComparisonStatus.DONE) {
       setStatus(ComparisonStatus.IDLE);
       setDiffResult(null);
    }
  };

  const exportableData = useMemo(() => {
    if (!diffResult) return [];
    const baseSet = includeIdenticalInExport 
      ? [...diffResult.leftOnly, ...diffResult.both] 
      : diffResult.leftOnly;

    // 建立物件到索引的映射，確保能正確對應到 leftData 的原始索引
    const rowToIndex = new Map<Record<string, string>, number>();
    leftData.forEach((row, index) => rowToIndex.set(row, index));

    return baseSet.filter(row => {
      const index = rowToIndex.get(row);
      return index !== undefined && !excludedLeft.has(index);
    });
  }, [diffResult, excludedLeft, includeIdenticalInExport, leftData]);

  // 關鍵修復：使用原始 headers 過濾而非直接使用 selectedCompareHeaders (Set) 轉 Array，以維持順序
  const visibleHeaders = useMemo(() => {
    return hideIgnoredColumns 
      ? headers.filter(h => selectedCompareHeaders.has(h))
      : headers;
  }, [headers, selectedCompareHeaders, hideIgnoredColumns]);

  return (
    <div className="min-h-screen flex flex-col max-w-[1900px] mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center">
          <div className="bg-indigo-600 text-white p-3 rounded-2xl mr-4 shadow-2xl shadow-indigo-900/50 transform rotate-2">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              DiffSheet <span className="text-indigo-500">PRO</span>
            </h1>
            <p className="text-slate-500 text-sm font-bold tracking-wide">專業資料比對與匯出排除工具</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setFilterMode(0)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 0 ? 'bg-slate-700 text-white shadow-inner' : 'text-slate-500 hover:text-slate-300'}`}>全部</button>
            <button onClick={() => setFilterMode(1)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 1 ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>相同</button>
            <button onClick={() => setFilterMode(2)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${filterMode === 2 ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>不同</button>
          </div>

          <button onClick={handleClear} className="px-5 py-2.5 text-slate-400 hover:text-red-400 font-bold border border-slate-800 hover:border-red-900/50 hover:bg-red-900/10 rounded-xl transition-all text-sm group">一鍵清空</button>
          
          <button 
            onClick={handleCompare}
            disabled={leftData.length === 0 || rightData.length === 0 || status === ComparisonStatus.COMPARING}
            className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 border-b-4 border-indigo-800 active:border-b-0 active:translate-y-1 disabled:bg-slate-800 disabled:text-slate-600 disabled:border-none disabled:translate-y-0 text-white font-black rounded-xl shadow-2xl transition-all text-sm"
          >
            {status === ComparisonStatus.COMPARING ? '處理中...' : '執行比對'}
          </button>
        </div>
      </header>

      {headers.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-3xl animate-in slide-in-from-top-4 duration-500 flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">比對欄位控制 (勾選要參與比對的欄位)</span>
            <div className="flex flex-wrap gap-2">
              {headers.map(h => (
                <button
                  key={h}
                  onClick={() => toggleCompareHeader(h)}
                  className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border ${selectedCompareHeaders.has(h) ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-2 border-t border-slate-800 pt-3">
            <input type="checkbox" id="hideIgnored" checked={hideIgnoredColumns} onChange={() => setHideIgnoredColumns(!hideIgnoredColumns)} className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer" />
            <label htmlFor="hideIgnored" className="text-xs font-black text-slate-400 cursor-pointer uppercase tracking-widest">隱藏忽略欄位</label>
          </div>
        </div>
      )}

      <main className="flex flex-col lg:flex-row gap-4 flex-1 items-start">
        <div className="flex-[1.2] min-w-0 h-full">
          <DataTableDisplay 
            ref={tableARef}
            side="A"
            title="來源資料"
            data={leftData}
            headers={headers}
            visibleHeaders={visibleHeaders}
            diffData={diffResult?.leftOnly || []}
            onDataLoaded={(d, h) => handleDataLoaded('left', d, h)}
            onClear={() => handleClearSide('A')}
            highlightClass="bg-red-500/20"
            filterMode={filterMode}
            hoveredIdentity={hoveredIdentity}
            flashingIdentity={flashingIdentity}
            onRowHover={(row) => setHoveredIdentity(row ? getRowIdentity(row) : null)}
            onRowClick={handleRowClickAlignment}
            excludedRows={excludedLeft}
            onToggleExclusion={handleToggleExclusion}
            getRowIdentity={getRowIdentity}
            onScroll={(e) => handleScroll(e, 'A')}
            onCellUpdate={(idx, col, val) => handleUpdateCell('A', idx, col, val)}
            showSyncIndicator={isSyncing}
            headerExtra={
              <input 
                type="text"
                value={tableAHeaderNote}
                onChange={(e) => setTableAHeaderNote(e.target.value)}
                placeholder="輸入備註..."
                className="w-32 md:w-64 bg-transparent border-b border-slate-700 text-slate-100 text-[18px] font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 pb-1 text-center placeholder:text-center"
              />
            }
          />
        </div>

        <div className="flex-1 min-w-0 h-full">
          <DataTableDisplay 
            ref={tableBRef}
            side="B"
            title="對比目標"
            data={rightData}
            headers={headers}
            visibleHeaders={visibleHeaders}
            diffData={diffResult?.rightOnly || []}
            onDataLoaded={(d, h) => handleDataLoaded('right', d, h)}
            onClear={() => handleClearSide('B')}
            highlightClass="bg-blue-500/20"
            filterMode={filterMode}
            hoveredIdentity={hoveredIdentity}
            flashingIdentity={flashingIdentity}
            onRowHover={(row) => setHoveredIdentity(row ? getRowIdentity(row) : null)}
            onRowClick={handleRowClickAlignment}
            getRowIdentity={getRowIdentity}
            onScroll={(e) => handleScroll(e, 'B')}
            onCellUpdate={(idx, col, val) => handleUpdateCell('B', idx, col, val)}
            limitFlash={bLimitFlash}
            headerExtra={
              <input 
                type="text"
                value={tableBHeaderNote}
                onChange={(e) => setTableBHeaderNote(e.target.value)}
                placeholder="輸入備註..."
                className="w-32 md:w-64 bg-transparent border-b border-slate-700 text-slate-100 text-[18px] font-medium outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 pb-1 text-center placeholder:text-center"
              />
            }
          />
        </div>
      </main>

      {status === ComparisonStatus.DONE && diffResult && (
        <section className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-bottom-8 duration-500 shadow-2xl">
          <div className="flex items-center space-x-16">
            <div className="flex flex-col">
              <span className="text-slate-500 text-[12px] font-black uppercase tracking-widest mb-2">比對摘要結果</span>
              <div className="flex items-center space-x-12">
                <div className="flex items-center space-x-4">
                  <div className="w-5 h-5 bg-red-500 rounded-md"></div>
                  <span className="text-slate-100 font-black text-4xl">{diffResult.leftOnly.length}</span>
                  <span className="text-slate-500 text-lg font-bold">筆 A 側獨有</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-5 h-5 bg-slate-500 rounded-md"></div>
                  <span className="text-slate-100 font-black text-4xl">{diffResult.both.length}</span>
                  <span className="text-slate-500 text-lg font-bold">筆 完全相同</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-3 rounded-2xl border border-slate-800 group cursor-pointer hover:border-indigo-500/30 transition-all" onClick={() => setIncludeIdenticalInExport(!includeIdenticalInExport)}>
              <input 
                type="checkbox" 
                checked={includeIdenticalInExport} 
                onChange={() => {}} 
                className="w-5 h-5 rounded-md bg-slate-950 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer" 
              />
              <span className="text-sm font-black text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-widest">包含相同項目</span>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full md:w-auto px-16 py-5 bg-white text-slate-950 hover:bg-indigo-50 rounded-2xl font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center group text-xl"
            >
              <svg className="w-8 h-8 mr-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              匯出差異選單 ({exportableData.length} 筆)
            </button>
          </div>
        </section>
      )}

      {isModalOpen && diffResult && (
        <ExportModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          data={exportableData}
          headers={headers}
        />
      )}
    </div>
  );
};

export default App;
