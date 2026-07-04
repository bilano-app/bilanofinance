import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Globe, Search, Zap, Crosshair, ArrowUpRight, Newspaper, Radar, Orbit, AlertTriangle, RefreshCcw
} from 'lucide-react';

const COMMON_TICKERS = [
  // IHSG
  "PTRO.JK", "BBNI.JK", "BBKP.JK", "BBCA.JK", "BBRI.JK", "BMRI.JK", "ASII.JK", "TLKM.JK", "GOTO.JK", "AMMN.JK", "BREN.JK", "DEWA.JK",
  // US Wall Street
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "BRK-B", "JPM", "V"
];

interface UniversalNewsScannerProps {
  currentUserEmail: string;
  onNewsUpdate?: (newsData: any) => void;
}

export default function UniversalNewsScanner({ currentUserEmail, onNewsUpdate }: UniversalNewsScannerProps) {
  const [activeMode, setActiveMode] = useState<'universal' | 'deepscan'>('universal');
  
  // State Universal News
  const [marketType, setMarketType] = useState<'ID' | 'US'>('ID');
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [universalData, setUniversalData] = useState<any>(null);
  const [universalError, setUniversalError] = useState("");

  // State Deep Scan
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  const filteredTickers = useMemo(() => {
    if (!searchQuery) return COMMON_TICKERS.slice(0, 8);
    return COMMON_TICKERS.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8);
  }, [searchQuery]);

  const handleFetchUniversal = async () => {
    setIsFetchingNews(true);
    setUniversalError("");
    setUniversalData(null);
    try {
      const res = await fetch('/api/finance/universal-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': currentUserEmail },
        body: JSON.stringify({ market: marketType })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal menarik data berita.");
      if (!data.data || !data.data.klotters || data.data.klotters.length === 0) {
          throw new Error("Pencarian Google tidak mengembalikan hasil berita yang valid hari ini.");
      }
      
      setUniversalData(data.data);
      if (onNewsUpdate) onNewsUpdate(data.data); // Update ke Context AI
      
    } catch (error: any) {
      console.error(error);
      setUniversalError(error.message);
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleDeepScan = async () => {
    if (!selectedTicker) return;
    setIsScanning(true);
    setScanError("");
    setScanResult(null);
    try {
      const res = await fetch('/api/finance/deep-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-email': currentUserEmail },
        body: JSON.stringify({ ticker: selectedTicker })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Gagal melakukan deep scan.");
      if (!data.data || !data.data.verdict) {
          throw new Error("Sistem gagal menganalisis ticker ini karena minimnya sentimen berita.");
      }
      
      setScanResult(data.data);
      if (onNewsUpdate) onNewsUpdate(data.data); // Update ke Context AI

    } catch (error: any) {
      console.error(error);
      setScanError(error.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Helper pewarnaan untuk Sentimen Positif/Negatif
  const getVerdictColorText = (verdict: string) => {
      const v = (verdict || "").toUpperCase();
      if (v.includes('POSITIF')) return 'text-[#00FF41]';
      if (v.includes('NEGATIF')) return 'text-[#FF003C]';
      return 'text-[#FFD700]';
  };
  
  const getVerdictColorBg = (verdict: string) => {
      const v = (verdict || "").toUpperCase();
      if (v.includes('POSITIF')) return 'bg-[#00FF41]';
      if (v.includes('NEGATIF')) return 'bg-[#FF003C]';
      return 'bg-[#FFD700]';
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-20">
      
      {/* Header & Toggle */}
      <div className="flex justify-between items-end border-b border-[#222] pb-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Radar className="w-5 h-5 text-[#00E5FF]" /> Global Scanner & Deep Scan
          </h2>
          <p className="text-[10px] text-[#A1A1AA] uppercase tracking-[0.15em] mt-1 font-bold">
            Pemindaian Berita Aktual & Analisis Momentum Jangka Pendek
          </p>
        </div>
        <div className="flex bg-[#111] border border-[#333]">
           <button 
             onClick={() => setActiveMode('universal')} 
             className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeMode === 'universal' ? 'bg-[#00E5FF] text-black' : 'text-[#A1A1AA] hover:text-white'}`}
           >
             Universal News
           </button>
           <button 
             onClick={() => setActiveMode('deepscan')} 
             className={`px-6 py-2 text-[10px] font-black uppercase tracking-[0.15em] transition-all ${activeMode === 'deepscan' ? 'bg-[#FFD700] text-black' : 'text-[#A1A1AA] hover:text-white'}`}
           >
             Ticker Deep Scan
           </button>
        </div>
      </div>

      {/* ======================================= */}
      {/* MODE 1: UNIVERSAL NEWS                  */}
      {/* ======================================= */}
      {activeMode === 'universal' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-[#050505] p-4 border border-[#222]">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-widest">Pilih Pasar</label>
              <select 
                value={marketType} 
                onChange={(e) => setMarketType(e.target.value as 'ID' | 'US')}
                className="bg-[#111] border border-[#333] text-white text-xs px-4 py-2 outline-none focus:border-[#00E5FF] uppercase font-mono cursor-pointer"
              >
                <option value="ID">Saham Indonesia (IHSG)</option>
                <option value="US">Saham US (Wall Street)</option>
              </select>
            </div>
            <button 
              onClick={handleFetchUniversal} 
              disabled={isFetchingNews}
              className="mt-4 px-6 py-2 h-9 bg-[#00E5FF] hover:bg-[#00B3CC] disabled:bg-[#333] text-black font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
            >
              {isFetchingNews ? <Orbit className="w-3.5 h-3.5 animate-spin"/> : <Globe className="w-3.5 h-3.5"/>}
              Telusuri Berita Hari Ini
            </button>
          </div>

          {isFetchingNews ? (
            <div className="bg-[#0D0D0D] border border-[#222] py-24 flex flex-col items-center justify-center text-center">
               <Orbit className="w-10 h-10 text-[#00E5FF] animate-spin mb-4" />
               <p className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-[0.2em] animate-pulse">Menyaring Ribuan Berita Harian...</p>
            </div>
          ) : universalError ? (
            <div className="bg-[#FF003C]/10 border border-[#FF003C]/30 p-8 flex flex-col items-center justify-center text-center">
               <AlertTriangle className="w-10 h-10 text-[#FF003C] mb-4" />
               <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Sistem Gagal Merespon</h3>
               <p className="text-[#A1A1AA] text-xs max-w-md uppercase tracking-wider mb-6">{universalError}</p>
               <button 
                 onClick={handleFetchUniversal}
                 className="flex items-center gap-2 bg-[#FF003C] hover:bg-[#CC0030] text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 <RefreshCcw className="w-3 h-3" /> Coba Lagi
               </button>
            </div>
          ) : universalData && universalData.klotters ? (
            <div className="space-y-8">
              {universalData.klotters.map((klotter: any, index: number) => (
                <div key={index} className="bg-[#09090B] border border-[#333] relative overflow-hidden shadow-lg">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00E5FF]"></div>
                  <div className="p-4 border-b border-[#222] bg-[#111]">
                    <h3 className="text-xs font-black text-white uppercase tracking-widest">
                      Klotter Berita {index + 1}
                    </h3>
                  </div>
                  
                  {/* Horizontal Scroll untuk Berita */}
                  <div className="flex overflow-x-auto gap-4 p-5 pb-6 snap-x custom-scrollbar">
                    {klotter.articles.map((article: any, aIdx: number) => (
                      <a key={aIdx} href={article.url} target="_blank" rel="noopener noreferrer" className="min-w-[280px] w-[280px] bg-[#050505] border border-[#222] p-4 snap-start hover:border-[#00E5FF]/50 transition-colors group flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[8px] font-bold bg-[#00E5FF]/10 text-[#00E5FF] px-1.5 py-0.5 uppercase tracking-wider">{article.source || "Global News"}</span>
                            <span className="text-[8px] text-[#666] font-mono">{article.time || "Baru saja"}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white leading-relaxed group-hover:text-[#00E5FF] transition-colors line-clamp-3">
                            {article.title}
                          </h4>
                        </div>
                        <div className="mt-3 flex items-center text-[9px] text-[#A1A1AA] font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                          Buka Sumber <ArrowUpRight className="w-3 h-3 ml-1" />
                        </div>
                      </a>
                    ))}
                  </div>

                  <div className="p-4 border-t border-[#222] bg-[#050505]">
                    <p className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                      <Crosshair className="w-3 h-3 text-[#00FF41]"/> Indikasi Saham Terkait
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(klotter.implicatedStocks || []).map((stock: string, sIdx: number) => (
                        <span key={sIdx} className="text-xs font-mono font-black text-[#00FF41] bg-[#00FF41]/10 border border-[#00FF41]/30 px-2 py-1">
                          {stock}
                        </span>
                      ))}
                      {(!klotter.implicatedStocks || klotter.implicatedStocks.length === 0) && (
                         <span className="text-[10px] text-[#666] font-mono italic">Belum ada identifikasi saham spesifik</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ======================================= */}
      {/* MODE 2: TICKER DEEP SCAN                */}
      {/* ======================================= */}
      {activeMode === 'deepscan' && (
        <div className="space-y-6">
          <div className="bg-[#050505] border border-[#222] p-6 max-w-2xl shadow-lg" ref={wrapperRef}>
            <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest block mb-2">Target Ticker Analysis</label>
            <div className="relative">
              <div className="flex items-center border border-[#333] bg-[#000] focus-within:border-[#FFD700] transition-colors">
                <div className="pl-4">
                  <Search className="w-4 h-4 text-[#666]" />
                </div>
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value.toUpperCase());
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Ketik kode saham (Cth: PTRO.JK, BBNI.JK, AAPL)"
                  className="w-full bg-transparent text-white font-mono text-sm px-4 py-3 outline-none uppercase"
                />
                <button 
                  onClick={handleDeepScan}
                  disabled={isScanning || !selectedTicker}
                  className="bg-[#FFD700] hover:bg-[#CCAA00] disabled:bg-[#333] text-black font-black text-[10px] uppercase tracking-widest px-6 py-3 transition-all h-full"
                >
                  {isScanning ? 'SCANNING...' : 'EKSEKUSI'}
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 w-[calc(100%-120px)] bg-[#111] border border-[#333] mt-1 z-50 shadow-2xl">
                  {filteredTickers.map((ticker) => (
                    <div 
                      key={ticker}
                      onClick={() => {
                        setSelectedTicker(ticker);
                        setSearchQuery(ticker);
                        setShowDropdown(false);
                      }}
                      className="px-4 py-3 text-white font-mono text-xs cursor-pointer hover:bg-[#222] hover:text-[#FFD700] border-b border-[#222] last:border-none"
                    >
                      {ticker}
                    </div>
                  ))}
                  {searchQuery && !filteredTickers.includes(searchQuery) && (
                    <div 
                      onClick={() => {
                        setSelectedTicker(searchQuery);
                        setShowDropdown(false);
                      }}
                      className="px-4 py-3 text-[#00E5FF] font-mono text-xs cursor-pointer hover:bg-[#222] border-b border-[#222]"
                    >
                      Gunakan "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
            {selectedTicker && !isScanning && (
              <p className="text-[9px] font-mono text-[#00FF41] mt-2">Target terkunci: {selectedTicker}</p>
            )}
          </div>

          {isScanning ? (
            <div className="bg-[#0D0D0D] border border-[#222] py-24 flex flex-col items-center justify-center text-center">
               <Zap className="w-12 h-12 text-[#FFD700] animate-bounce mb-4" />
               <p className="text-[10px] text-[#FFD700] font-bold uppercase tracking-[0.2em] animate-pulse">Menyelami Data Fundamental & Sentimen {selectedTicker}...</p>
            </div>
          ) : scanError ? (
            <div className="bg-[#FF003C]/10 border border-[#FF003C]/30 p-8 flex flex-col items-center justify-center text-center">
               <AlertTriangle className="w-10 h-10 text-[#FF003C] mb-4" />
               <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Deep Scan Gagal</h3>
               <p className="text-[#A1A1AA] text-xs max-w-md uppercase tracking-wider mb-6">{scanError}</p>
               <button 
                 onClick={handleDeepScan}
                 className="flex items-center gap-2 bg-[#FF003C] hover:bg-[#CC0030] text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 <RefreshCcw className="w-3 h-3" /> Coba Lagi Scan
               </button>
            </div>
          ) : scanResult ? (
            <div className="space-y-6">
              
              {/* Hasil Verdict Momentum */}
              <div className="bg-[#050505] border border-[#333] p-8 relative overflow-hidden shadow-lg">
                <div className={`absolute top-0 left-0 w-2 h-full ${getVerdictColorBg(scanResult.verdict)}`}></div>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mb-2">Indikator Sentimen Sentral</p>
                    <h1 className={`text-4xl font-black uppercase tracking-tight ${getVerdictColorText(scanResult.verdict)}`}>
                      {scanResult.verdict}
                    </h1>
                  </div>
                  <div className="bg-[#111] border border-[#333] px-4 py-2">
                    <p className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest mb-1">Ticker</p>
                    <p className="font-mono text-xl text-white font-black">{scanResult.ticker}</p>
                  </div>
                </div>

                <div className="border-t border-[#222] pt-6 mt-6">
                  <p className="text-[10px] font-bold text-[#00E5FF] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Newspaper className="w-4 h-4"/> Uraian Analisis Sentimen
                  </p>
                  <div className="text-sm text-[#D4D4D8] leading-relaxed font-sans space-y-4 whitespace-pre-wrap">
                    {scanResult.reasoning}
                  </div>
                </div>
              </div>

              {/* Berita Relevan Spesifik */}
              <h3 className="font-black text-white text-sm uppercase tracking-widest mt-8 border-b border-[#222] pb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#FFD700]" /> Sumber Berita Penggerak Sentimen
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(scanResult.articles || []).map((article: any, idx: number) => (
                  <a key={idx} href={article.url} target="_blank" rel="noopener noreferrer" className="bg-[#0D0D0D] border border-[#222] p-5 hover:bg-[#111] hover:border-[#FFD700]/50 transition-all group flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#FFD700] bg-[#FFD700]/10 px-2 py-1">
                          {article.source || "Finance Source"}
                        </span>
                        {article.time && <span className="text-[9px] text-[#666] font-mono">{article.time}</span>}
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug group-hover:text-[#FFD700] transition-colors mb-4 line-clamp-3">
                        {article.title}
                      </h4>
                    </div>
                    <div className="flex items-center text-[9px] text-[#A1A1AA] font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                      Baca Selengkapnya <ArrowUpRight className="w-3 h-3 ml-1" />
                    </div>
                  </a>
                ))}
              </div>

            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}