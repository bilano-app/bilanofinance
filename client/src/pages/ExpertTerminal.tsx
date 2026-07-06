import React, { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Fingerprint, Layers, Radar, Scale, VenetianMask, ShieldAlert,
  ArrowUpRight, ArrowDownRight, ChevronUp, ChevronDown, Orbit, Database, X, Wrench, ScanSearch, Radio, LogOut, Calculator, Settings2, Hourglass,
  Target, Globe, Newspaper, Search
} from "lucide-react";
import { useUser, useInvestments, useTransactions, useLiveQuotes, useHistoricalQuotes, usePortfolioSnapshots, useSaveSnapshot } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ComposedChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line, LineChart, Legend } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import UniversalNewsScanner from "./UniversalNewsScanner";
import { useDebts } from "@/hooks/use-finance"; // 👈 Tambahkan ini
import TerminalAIChat from "./TerminalAIChat"; // 👈 Pastikan path sesuai

// Skema Warna Terminal Profesional (High Contrast Neons)
const COLORS = ['#00FF41', '#00E5FF', '#FF003C', '#FFD700', '#B500FF', '#FF8C00', '#FFFFFF'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export default function ExpertTerminal() {
  const { toast } = useToast();
  
  // State Autentikasi Terminal (Menggunakan Gembok Terminal Unlocked)
  const [isTerminalAuth, setIsTerminalAuth] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("bilano_terminal_unlocked") === "true";
    return false;
  });
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { data: debts = [] } = useDebts(); // 👈 Tambahkan ini
  const [newsContext, setNewsContext] = useState<any>(null); //

  // Mengambil email dari session key utama agar hooks use-finance tidak null
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  // Data Hooks
  const { data: user } = useUser();
  const { data: investments = [] } = useInvestments();
  const { data: transactions = [] } = useTransactions();
  const { data: snapshots = [] } = usePortfolioSnapshots();
  const saveSnapshotMutation = useSaveSnapshot();

  const [activeTab, setActiveTab] = useState<'alokasi' | 'pantauan' | 'terealisasi' | 'simulator' | 'intel' | 'scanner'>('alokasi');
  const [showProfit, setShowProfit] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'>('1M');
  
  // Filter Ekstraksi Chart
  const [chartAssetFilter, setChartAssetFilter] = useState<string>('ALL');
  const [chartLineFilter, setChartLineFilter] = useState<'ALL' | 'MARKET_VALUE' | 'MODAL' | 'DIVIDEND'>('ALL');
  
  // Indikator Progres Interaktif
  const [intelStatus, setIntelStatus] = useState("Membangun koneksi ke server agregator...");

  const { data: forexRates = {} } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail && isTerminalAuth
  });

  const [tickerOverrides, setTickerOverrides] = useState<Record<string, string>>(() => {
      const saved = localStorage.getItem('bilano_ticker_overrides');
      return saved ? JSON.parse(saved) : {};
  });
  const [editTickerModal, setEditTickerModal] = useState<string | null>(null);
  const [tempTicker, setTempTicker] = useState("");
  const [assetDetailModal, setAssetDetailModal] = useState<any | null>(null);

  useEffect(() => {
      localStorage.setItem('bilano_ticker_overrides', JSON.stringify(tickerOverrides));
  }, [tickerOverrides]);

  const cashBalance = user?.cashBalance || 0;

  const chronologicalTxs = useMemo(() => {
      return [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  const uniqueTickersToFetch = useMemo(() => {
    const tickers = new Set<string>();
    tickers.add("IDR=X");

    investments.forEach((inv: any) => {
        const parts = (inv.symbol || "").split('|');
        const sym = parts[0].trim().toUpperCase();
        const curr = parts[1] || 'IDR';
        const isIDR = curr === 'IDR';
        const typeLower = (inv.type || 'saham').toLowerCase();
        
        const isStock = typeLower === 'saham' || (!inv.type && sym.length === 4);
        const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(sym);
        
        const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
        let defaultTicker = sym;
        if (isIDR && isStock && !isGold && !knownUS.includes(sym) && !sym.endsWith('.JK')) defaultTicker = `${sym}.JK`;
        
        tickers.add(tickerOverrides[sym] || defaultTicker);
    });

    chronologicalTxs.forEach((t: any) => {
        if (t.type === 'invest_sell') {
            const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
            const symbol = match ? match[1].toUpperCase().trim() : 'Unknown';
            if (symbol !== 'Unknown') {
                const isUSD = t.description?.includes('USD') || t.description?.includes('US$');
                const isIDR = !isUSD;
                const isStock = symbol.length === 4; 
                const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
                const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
                
                let defaultTicker = symbol;
                if (isIDR && isStock && !isGold && !knownUS.includes(symbol) && !symbol.endsWith('.JK')) defaultTicker = `${symbol}.JK`;
                tickers.add(tickerOverrides[symbol] || defaultTicker);
            }
        }
    });

    return Array.from(tickers);
  }, [investments, chronologicalTxs, tickerOverrides]);

  const apiRange = useMemo(() => {
      if (chartTimeframe === '1D') return '1d';
      if (chartTimeframe === '1W') return '5d'; 
      if (chartTimeframe === '1M') return '1mo';
      if (chartTimeframe === '3M') return '3mo';
      if (chartTimeframe === '1Y') return '1y';
      return '5y';
  }, [chartTimeframe]);

  const { data: livePrices = {}, isLoading: isLivePricesLoading } = useLiveQuotes(uniqueTickersToFetch);
  // =========================================================================
  // 🚀 HOOK DIVIDEN REAL-TIME DARI API
  // =========================================================================
  const { data: dividendEvents = {} } = useQuery({
      queryKey: ['dividendEvents', uniqueTickersToFetch.join(',')],
      queryFn: async () => {
          if (uniqueTickersToFetch.length === 0) return {};
          const res = await fetch(`/api/finance/dividends`, {
              method: 'POST',
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ symbols: uniqueTickersToFetch, range: '5y' }) 
          });
          if (!res.ok) throw new Error("Gagal menarik data dividen.");
          const json = await res.json();
          return json.data || {};
      },
      enabled: !!currentUserEmail && isTerminalAuth,
      staleTime: 1000 * 60 * 60 * 24 // Cache 1 hari
  });
  const { data: historyPrices = {} } = useHistoricalQuotes(uniqueTickersToFetch, apiRange);
  const { data: simHistoryPrices = {} } = useHistoricalQuotes(uniqueTickersToFetch, '5y');

  // 🚀 MEMISAHKAN TICKER KHUSUS UNTUK INTEL (HANYA ASET YANG MASIH DIPEGANG)
  const activeSymbolsForIntel = useMemo(() => {
      const tickers = new Set<string>();
      investments.forEach((inv: any) => {
          if (inv.quantity > 0) { 
              const parts = (inv.symbol || "").split('|');
              const sym = parts[0].trim().toUpperCase();
              const curr = parts[1] || 'IDR';
              const isIDR = curr === 'IDR';
              const typeLower = (inv.type || 'saham').toLowerCase();
              
              const isStock = typeLower === 'saham' || (!inv.type && sym.length === 4);
              const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(sym);
              
              const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
              let defaultTicker = sym;
              if (isIDR && isStock && !isGold && !knownUS.includes(sym) && !sym.endsWith('.JK')) defaultTicker = `${sym}.JK`;
              
              tickers.add(tickerOverrides[sym] || defaultTicker);
          }
      });
      return Array.from(tickers);
  }, [investments, tickerOverrides]);

  // =========================================================================
  // 🚀 HOOK MARKET INTEL (Mengambil data ketika tab aktif)
  // =========================================================================
  const { data: marketIntelData, isLoading: isIntelLoading, refetch: refetchIntel } = useQuery({
      queryKey: ['marketIntel', activeSymbolsForIntel.join(',')],
      queryFn: async () => {
          if (activeSymbolsForIntel.length === 0) return null;
          const res = await fetch(`/api/finance/intel`, {
              method: 'POST',
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ symbols: activeSymbolsForIntel }) 
          });
          if (!res.ok) throw new Error("Gagal menarik data intel.");
          return res.json();
      },
      enabled: !!currentUserEmail && isTerminalAuth && activeTab === 'intel',
      staleTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false, 
  });

  // Efek untuk teks status loading Market Intel
  useEffect(() => {
      let interval: NodeJS.Timeout;
      
      if (isIntelLoading) {
          let tick = 0;
          setIntelStatus("Menginisiasi pemindai makro global...");
          
          interval = setInterval(() => {
              tick++;
              if (tick === 2) setIntelStatus("Memetakan portofolio ke mesin pencari...");
              else if (tick === 5) setIntelStatus("Menarik puluhan artikel berita terbaru hari ini...");
              else if (tick === 8) setIntelStatus("Menyaring relevansi data dengan aset...");
              else if (tick === 12) setIntelStatus("Mengekstrak sentimen pasar secara real-time...");
              else if (tick === 16) setIntelStatus("Menyusun laporan intelijen komprehensif...");
              else if (tick === 22) setIntelStatus("Sintesis data masif sedang berlangsung, mohon tunggu...");
          }, 1000); 
      } else if (marketIntelData) {
          setIntelStatus("Sinkronisasi data selesai.");
      }
      
      return () => clearInterval(interval);
  }, [isIntelLoading, marketIntelData]);

  const getPriceForDate = useCallback((ticker: string, targetTs: number) => {
      const hist = historyPrices[ticker];
      if (!hist || !hist.timestamps || hist.timestamps.length === 0) return null;
      
      const targetSec = targetTs / 1000;
      let closestPrice = null; 
      
      for(let i = hist.timestamps.length-1; i >= 0; i--) {
          if (hist.timestamps[i] <= targetSec) { 
              if (hist.close[i] !== null && hist.close[i] !== undefined) {
                  closestPrice = hist.close[i];
                  break;
              }
          }
      }
      return closestPrice;
  }, [historyPrices]);

  const getHistoricalRate = useCallback((targetTs: number, currency: string) => {
      if (currency === 'IDR') return 1;
      const liveRateFallback = Number(forexRates[currency]) || 16200;
      if (currency !== 'USD') return liveRateFallback;
      return getPriceForDate('IDR=X', targetTs) || liveRateFallback;
  }, [forexRates, getPriceForDate]);

  const activePortfolio = useMemo(() => {
    const agg: Record<string, { qty: number, totalModalIDR: number, symbol: string, currency: string, activeTicker: string, liveMultiplier: number, isStock: boolean, isIDR: boolean, createdAt: string }> = {};
    
    investments.forEach((inv: any) => {
      const parts = (inv.symbol || "").split('|');
      const sym = parts[0].trim().toUpperCase();
      const curr = parts[1] || 'IDR';
      const isIDR = curr === 'IDR';
      const typeLower = (inv.type || 'saham').toLowerCase();
      
      const isStock = typeLower === 'saham' || (!inv.type && sym.length === 4);
      const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(sym);
      const multiplier = (isStock && isIDR && !isGold) ? 100 : 1; 

      const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
      let defaultTicker = sym;
      if (isIDR && isStock && !isGold && !knownUS.includes(sym) && !sym.endsWith('.JK')) defaultTicker = `${sym}.JK`;
      
      const activeTicker = tickerOverrides[sym] || defaultTicker;
      const invDateTs = inv.createdAt ? new Date(inv.createdAt).getTime() : Date.now();
      const historicalRate = isIDR ? 1 : getHistoricalRate(invDateTs, curr);

      if (!agg[sym]) {
          agg[sym] = { qty: 0, totalModalIDR: 0, symbol: sym, currency: curr, activeTicker, liveMultiplier: multiplier, isStock, isIDR, createdAt: inv.createdAt };
      } else if (inv.createdAt && new Date(inv.createdAt) < new Date(agg[sym].createdAt)) {
          agg[sym].createdAt = inv.createdAt;
      }
      
      agg[sym].qty += inv.quantity;
      agg[sym].totalModalIDR += (inv.quantity * inv.avgPrice * multiplier * historicalRate);
    });
    
    return Object.values(agg).filter((p: any) => p.qty > 0);
  }, [investments, tickerOverrides, getHistoricalRate]);

  const validFirstBuyDate = useMemo(() => {
      const symbolData: Record<string, { firstBuy: number, lastSell: number, currentQty: number }> = {};

      chronologicalTxs.forEach((t: any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
              const sym = match ? match[1].toUpperCase().trim() : 'Unknown';
              const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i);
              const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
              const ts = new Date(t.date).getTime();

              if (!symbolData[sym]) {
                  symbolData[sym] = { firstBuy: Infinity, lastSell: 0, currentQty: 0 };
              }

              if (t.type === 'invest_buy') {
                  if (ts < symbolData[sym].firstBuy) symbolData[sym].firstBuy = ts;
                  symbolData[sym].currentQty += qty;
              } else if (t.type === 'invest_sell') {
                  if (ts > symbolData[sym].lastSell) symbolData[sym].lastSell = ts;
                  symbolData[sym].currentQty -= qty;
              }
          }
      });

      let earliestValidTs = Infinity;
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

      Object.keys(symbolData).forEach(sym => {
          const data = symbolData[sym];
          if (data.firstBuy !== Infinity) {
              const isHeldActive = data.currentQty > 0.0001;
              const isHeldLongTerm = (data.lastSell - data.firstBuy) >= ONE_YEAR_MS;

              if (isHeldActive || isHeldLongTerm) {
                  if (data.firstBuy < earliestValidTs) {
                      earliestValidTs = data.firstBuy;
                  }
              }
          }
      });

      return earliestValidTs === Infinity ? new Date() : new Date(earliestValidTs);
  }, [chronologicalTxs]);

  // =========================================================================
  // 🚀 ENGINE SIMULATOR STRATEGI (GBM)
  // =========================================================================
  const [expandedSimAsset, setExpandedSimAsset] = useState<string | null>(null);
  const [simParams, setSimParams] = useState<Record<string, any>>({});

  const extractHistoricalStats = useCallback((ticker: string) => {
      const hist = simHistoryPrices[ticker];
      if (!hist || !hist.timestamps || hist.timestamps.length < 2) return { cagr: 12, volatility: 15, isReady: false }; 
      
      const closes = hist.close.filter((c: number) => c !== null && c !== undefined);
      if (closes.length < 2) return { cagr: 12, volatility: 15, isReady: false };

      const firstPrice = closes[0];
      const lastPrice = closes[closes.length - 1];
      const days = (hist.timestamps[hist.timestamps.length - 1] - hist.timestamps[0]) / (24 * 3600);
      const years = Math.max(days / 365, 0.1); 

      let cagr = Math.pow((lastPrice / firstPrice), (1 / years)) - 1;
      
      let returns = [];
      for(let i=1; i<closes.length; i++) {
          returns.push((closes[i] - closes[i-1]) / closes[i-1]);
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
      let volatility = Math.sqrt(variance) * Math.sqrt(252);

      if (cagr > 0.5) cagr = 0.5; if (cagr < -0.1) cagr = -0.1;
      if (volatility > 0.8) volatility = 0.8; if (volatility < 0.05) volatility = 0.05;

      return { cagr: cagr * 100, volatility: volatility * 100, isReady: true };
  }, [simHistoryPrices]);

  useEffect(() => {
      if (activePortfolio.length > 0 && Object.keys(livePrices).length > 0) {
          setSimParams(prev => {
              const newParams = { ...prev };
              let hasChanges = false;
              activePortfolio.forEach(asset => {
                  const stats = extractHistoricalStats(asset.activeTicker);
                  const currentParam = newParams[asset.symbol];
                  
                  if (!currentParam || (!currentParam._isReady && stats.isReady)) {
                      const livePriceAPI = livePrices[asset.activeTicker];
                      const liveValuationIDR = livePriceAPI ? (asset.qty * livePriceAPI * asset.liveMultiplier) : asset.totalModalIDR;
                      newParams[asset.symbol] = {
                          modalAwal: currentParam?.modalAwal ?? liveValuationIDR,
                          kontribusiBulanan: currentParam?.kontribusiBulanan ?? 1000000,
                          horizonWaktu: currentParam?.horizonWaktu ?? 5,
                          kenaikanSetoran: currentParam?.kenaikanSetoran ?? 10,
                          ekspektasiReturn: Number((stats.cagr).toFixed(1)),
                          volatilitas: Number((stats.volatility).toFixed(1)),
                          _isReady: stats.isReady
                      };
                      hasChanges = true;
                  }
              });
              return hasChanges ? newParams : prev;
          });
      }
  }, [activePortfolio, livePrices, extractHistoricalStats]);

  const handleExpandSim = (asset: any) => {
      if (expandedSimAsset === asset.symbol) {
          setExpandedSimAsset(null);
      } else {
          setExpandedSimAsset(asset.symbol);
      }
  };

  const getSimDataForAsset = useCallback((asset: any, params: any) => {
      const S0 = 100; 
      const mu = params.ekspektasiReturn / 100;
      const sigma = params.volatilitas / 100;
      const months = params.horizonWaktu * 12;
      const dt = 1 / 12;

      let pricePath = [S0];
      const seededRandom = (seed: number) => {
          let x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
      }
      let seed = asset.symbol.charCodeAt(0) + params.horizonWaktu;
      
      for (let i = 1; i <= months; i++) {
          let u = 0, v = 0;
          while(u === 0) u = seededRandom(seed++);
          while(v === 0) v = seededRandom(seed++);
          let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
          
          let drift = (mu - 0.5 * sigma * sigma) * dt;
          let shock = sigma * Math.sqrt(dt) * z;
          pricePath.push(pricePath[i-1] * Math.exp(drift + shock));
      }

      const chartData = [];
      let lsShares = params.modalAwal / pricePath[0];
      let lsModal = params.modalAwal;

      let dcaShares = params.modalAwal / pricePath[0];
      let dcaModal = params.modalAwal;

      let vaShares = params.modalAwal / pricePath[0];
      let vaModal = params.modalAwal;
      let vaTarget = params.modalAwal;

      chartData.push({ month: 0, LumpSum: params.modalAwal, DCA: params.modalAwal, ValueAveraging: params.modalAwal });

      for (let m = 1; m <= months; m++) {
          const currentPrice = pricePath[m];
          const yearIndex = Math.floor((m-1)/12);
          const currentMonthlyContrib = params.kontribusiBulanan * Math.pow(1 + (params.kenaikanSetoran/100), yearIndex);

          const valLS = lsShares * currentPrice;

          dcaShares += currentMonthlyContrib / currentPrice;
          dcaModal += currentMonthlyContrib;
          const valDCA = dcaShares * currentPrice;

          vaTarget = vaTarget * (1 + (mu/12)) + currentMonthlyContrib;
          const currentVaVal = vaShares * currentPrice;
          const shortfall = vaTarget - currentVaVal;
          
          if (shortfall > 0) {
              vaShares += shortfall / currentPrice;
              vaModal += shortfall;
          }
          const valVA = vaShares * currentPrice;

          chartData.push({ month: m, LumpSum: valLS, DCA: valDCA, ValueAveraging: valVA });
      }

      const finalLS = chartData[months].LumpSum;
      const finalDCA = chartData[months].DCA;
      const finalVA = chartData[months].ValueAveraging;

      const strategies = [
          { name: 'Lump Sum', modal: lsModal, akhir: finalLS, laba: finalLS - lsModal, roi: ((finalLS - lsModal)/lsModal)*100 },
          { name: 'DCA', modal: dcaModal, akhir: finalDCA, laba: finalDCA - dcaModal, roi: ((finalDCA - dcaModal)/dcaModal)*100 },
          { name: 'Value Averaging', modal: vaModal, akhir: finalVA, laba: finalVA - vaModal, roi: ((finalVA - vaModal)/vaModal)*100 }
      ];

      const bestStrategy = strategies.reduce((p, c) => (c.akhir > p.akhir ? c : p));

      return { chartData, strategies, bestStrategy };
  }, []);

  const grandTotalSimulation = useMemo(() => {
      if (activePortfolio.length === 0 || Object.keys(simParams).length === 0) return null;
      
      let totalModal = 0;
      let totalAkhir = 0;
      let maxHorizon = 0;

      activePortfolio.forEach(asset => {
          const params = simParams[asset.symbol];
          if (!params) return;
          if (params.horizonWaktu > maxHorizon) maxHorizon = params.horizonWaktu;

          const sim = getSimDataForAsset(asset, params);
          if (sim && sim.bestStrategy) {
              totalModal += sim.bestStrategy.modal;
              totalAkhir += sim.bestStrategy.akhir;
          }
      });

      return { totalModal, totalAkhir, maxHorizon, laba: totalAkhir - totalModal };
  }, [activePortfolio, simParams, getSimDataForAsset]);

  const countdownToTarget = useMemo(() => {
      if (!grandTotalSimulation || grandTotalSimulation.maxHorizon === 0) return null;
      
      const targetDate = new Date(validFirstBuyDate);
      targetDate.setFullYear(targetDate.getFullYear() + grandTotalSimulation.maxHorizon);

      const now = new Date();
      if (targetDate <= now) return { y: 0, m: 0, d: 0, isReached: true };

      let y = targetDate.getFullYear() - now.getFullYear();
      let m = targetDate.getMonth() - now.getMonth();
      let d = targetDate.getDate() - now.getDate();

      if (d < 0) {
          m -= 1;
          const prevMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); 
          d += prevMonth.getDate();
      }
      if (m < 0) {
          y -= 1;
          m += 12;
      }

      return { y, m, d, isReached: false };
  }, [validFirstBuyDate, grandTotalSimulation]);

  const realizedTradesBase = useMemo(() => {
    return chronologicalTxs.filter((t: any) => t.type === 'invest_sell').map((t: any) => {
      const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
      const symbol = match ? match[1].toUpperCase().trim() : 'Unknown';
      
      const sellPriceMatch = t.description?.match(/@\s*(?:Rp|USD|US\$)?\s*([0-9.,]+)/i);
      const sellPriceRaw = sellPriceMatch ? parseFloat(sellPriceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

      const isUSD = t.description?.includes('USD') || t.description?.includes('US$');
      const currency = isUSD ? 'USD' : 'IDR'; 
      const isIDR = currency === 'IDR';
      
      const txDateTs = new Date(t.date).getTime();
      const historicalRate = isIDR ? 1 : getHistoricalRate(txDateTs, currency);
      
      const sellPriceIDR = sellPriceRaw * historicalRate;
      const isStock = symbol.length === 4; 
      const isGold = ['ANTAM', 'UBS', 'EMAS', 'GOLD'].includes(symbol);
      const knownUS = ['AAPL', 'MSFT', 'GOOG', 'TSLA', 'AMZN', 'META', 'QQQM', 'IVV', 'VOO', 'SPY'];
      
      let defaultTicker = symbol;
      if (isIDR && isStock && !isGold && !knownUS.includes(symbol) && !symbol.endsWith('.JK')) defaultTicker = `${symbol}.JK`;
      const activeTicker = tickerOverrides[symbol] || defaultTicker;

      return { ...t, symbol, currency, sellPriceIDR, activeTicker, isIDR, isStock, isGold };
    });
  }, [chronologicalTxs, tickerOverrides, getHistoricalRate]);

  const totalAssetValue = activePortfolio.reduce((acc: any, p: any) => {
    const livePriceAPI = livePrices[p.activeTicker];
    const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
    return acc + liveValuationIDR;
  }, 0);

  const totalInvested = activePortfolio.reduce((acc: any, p: any) => acc + p.totalModalIDR, 0);
  const totalProfitLoss = totalAssetValue - totalInvested;
  const totalWealth = cashBalance + totalAssetValue;

  const realizedTrades = useMemo(() => {
    return realizedTradesBase.map((t: any) => ({
        ...t, livePriceIDR: livePrices[t.activeTicker] || 0
    }));
  }, [realizedTradesBase, livePrices]);

  const pieData = [
    { name: 'Cash Tunai', value: cashBalance },
    ...activePortfolio.map((p: any) => {
       const livePriceAPI = livePrices[p.activeTicker];
       const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
       return { name: p.symbol, value: liveValuationIDR };
    })
  ].filter((d: any) => d.value > 0);

  const firstInvestmentDate = useMemo(() => {
      let earliest = new Date();
      let found = false;

      const investTxs = chronologicalTxs.filter((t: any) => t.type === 'invest_buy' || t.type === 'invest_sell');
      if (investTxs.length > 0) {
          earliest = new Date(investTxs[0].date);
          found = true;
      }

      investments.forEach((inv: any) => {
          if (inv.createdAt) {
              const invDate = new Date(inv.createdAt);
              if (!found || invDate < earliest) {
                  earliest = invDate;
                  found = true;
              }
          }
      });
      return earliest;
  }, [chronologicalTxs, investments]);

  // =========================================================================
  // 🚀 PERBAIKAN LOGIKA KALKULASI MODAL (SPUS & VGT BUG FIX)
  // =========================================================================
  const setupAwalBases = useMemo(() => {
      const txNetQty: Record<string, {qty: number, invested: number}> = {};
      
      chronologicalTxs.forEach((t: any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
              const sym = match ? match[1].toUpperCase().trim() : 'Unknown';
              const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i); 
              const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;
              
              const priceMatch = t.description?.match(/@\s*(?:Rp|USD|US\$)?\s*([0-9.,]+)/i);
              const rawPrice = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

              const asset = activePortfolio.find((p: any) => p.symbol === sym);
              const currency = asset ? asset.currency : (t.description?.includes('USD') ? 'USD' : 'IDR');
              const multiplier = asset ? asset.liveMultiplier : (sym.length === 4 ? 100 : 1);
              const rate = currency === 'IDR' ? 1 : getHistoricalRate(new Date(t.date).getTime(), currency);

              let realAmountIDR = rawPrice * qty * multiplier * rate;
              if (!realAmountIDR || isNaN(realAmountIDR) || realAmountIDR === 0) {
                  realAmountIDR = t.amount;
              }
              
              if (!txNetQty[sym]) txNetQty[sym] = { qty: 0, invested: 0 };
              if (t.type === 'invest_buy') {
                  txNetQty[sym].qty += qty;
                  txNetQty[sym].invested += realAmountIDR;
              } else {
                  txNetQty[sym].qty -= qty;
                  txNetQty[sym].invested -= realAmountIDR;
              }
          }
      });

      const bases: Record<string, { qty: number, invested: number, date: Date }> = {};
      activePortfolio.forEach(p => {
          const txNet = txNetQty[p.symbol] || { qty: 0, invested: 0 };
          const setupQty = p.qty - txNet.qty;
          const setupInvested = p.totalModalIDR - txNet.invested; 
          
          if (setupQty > 0.0001) { 
              bases[p.symbol] = {
                  qty: setupQty,
                  invested: setupInvested > 0 ? setupInvested : 0,
                  date: new Date(p.createdAt || new Date())
              };
          }
      });
      return bases;
  }, [chronologicalTxs, activePortfolio, getHistoricalRate]);

  const getSnapshotAtDate = useCallback((targetDate: Date, isCurrent: boolean) => {
      const qtyMap: Record<string, { qty: number, investedIDR: number }> = {};
      const targetTs = targetDate.getTime();
      
      Object.keys(setupAwalBases).forEach(sym => {
          if (setupAwalBases[sym].date.getTime() <= targetTs) {
              qtyMap[sym] = { qty: setupAwalBases[sym].qty, investedIDR: setupAwalBases[sym].invested };
          }
      });

      const pastTx = chronologicalTxs.filter((t:any) => new Date(t.date).getTime() <= targetTs);
      pastTx.forEach((t:any) => {
          if (t.type === 'invest_buy' || t.type === 'invest_sell') {
              const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
              if (match) {
                  const sym = match[1].toUpperCase().trim();
                  const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i);
                  const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0; 
                  
                  const priceMatch = t.description?.match(/@\s*(?:Rp|USD|US\$)?\s*([0-9.,]+)/i);
                  const rawPrice = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

                  const asset = activePortfolio.find((p: any) => p.symbol === sym);
                  const currency = asset ? asset.currency : (t.description?.includes('USD') ? 'USD' : 'IDR');
                  const multiplier = asset ? asset.liveMultiplier : (sym.length === 4 ? 100 : 1);
                  const rate = currency === 'IDR' ? 1 : getHistoricalRate(new Date(t.date).getTime(), currency);

                  let realAmountIDR = rawPrice * qty * multiplier * rate;
                  if (!realAmountIDR || isNaN(realAmountIDR) || realAmountIDR === 0) {
                      realAmountIDR = t.amount;
                  }
                  
                  if (!qtyMap[sym]) qtyMap[sym] = { qty: 0, investedIDR: 0 };
                  
                  if (t.type === 'invest_buy') {
                      qtyMap[sym].qty += qty;
                      qtyMap[sym].investedIDR += realAmountIDR;
                  } else {
                      qtyMap[sym].qty -= qty;
                      qtyMap[sym].investedIDR -= realAmountIDR;
                      if (qtyMap[sym].qty <= 0) {
                          qtyMap[sym].qty = 0;
                          qtyMap[sym].investedIDR = 0;
                      } else {
                          qtyMap[sym].investedIDR = Math.max(0, qtyMap[sym].investedIDR);
                      }
                  }
              }
          }
      });
      
      let details: Record<string, {invested: number, valuasi: number, qty: number}> = {};
      let totalInv = 0; let totalVal = 0;
      
      Object.keys(qtyMap).forEach(sym => {
          if (qtyMap[sym].qty > 0) {
              const currentAsset = activePortfolio.find((p: any) => p.symbol === sym);
              const activeTicker = currentAsset ? currentAsset.activeTicker : (tickerOverrides[sym] || sym);
              const liveMultiplier = currentAsset ? currentAsset.liveMultiplier : 1;
              
              let price = qtyMap[sym].investedIDR / (qtyMap[sym].qty * liveMultiplier); 
              if (isCurrent) {
                  price = livePrices[activeTicker] || price;
              } else {
                  const htmlPrice = getPriceForDate(activeTicker, targetTs);
                  price = htmlPrice || price;
              }
              
              const valuasi = price ? (qtyMap[sym].qty * price * liveMultiplier) : qtyMap[sym].investedIDR;
              details[sym] = { invested: qtyMap[sym].investedIDR, valuasi, qty: qtyMap[sym].qty };
              totalInv += qtyMap[sym].investedIDR;
              totalVal += valuasi;
          } else {
              details[sym] = { invested: 0, valuasi: 0, qty: 0 };
          }
      });
      
      return { totalValue: totalVal, investValue: totalInv, details };
  }, [setupAwalBases, chronologicalTxs, activePortfolio, tickerOverrides, livePrices, getPriceForDate, getHistoricalRate]);

  const availableMonths = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      if (selectedYear > currentYear) return [];
      
      let start = 0;
      if (selectedYear === firstInvestmentDate.getFullYear()) start = firstInvestmentDate.getMonth();
      else if (selectedYear < firstInvestmentDate.getFullYear()) return []; 
      
      let end = 11;
      if (selectedYear === currentYear) end = currentMonth;
      
      return MONTH_NAMES.map((name, idx) => ({ name, monthNum: idx + 1 })).slice(start, end + 1);
  }, [selectedYear, firstInvestmentDate]);

  const getMonthData = useCallback((monthNum: number, year: number) => {
      const snap = snapshots.find((s: any) => s.month === monthNum && s.year === year);
      if (snap) {
          let details = {};
          try { details = JSON.parse(snap.assetsDetail || "{}"); } catch(e) {}
          return { isSaved: true, totalValue: snap.totalValue, investValue: snap.investValue, details };
      }
      
      const isCurrentMonth = year === new Date().getFullYear() && monthNum === new Date().getMonth() + 1;
      const endOfMonth = isCurrentMonth ? new Date() : new Date(year, monthNum, 0, 23, 59, 59);
      
      const calcData = getSnapshotAtDate(endOfMonth, isCurrentMonth);
      return { isSaved: false, ...calcData };
  }, [snapshots, getSnapshotAtDate]);

  const availableYears = useMemo(() => {
      const startYear = firstInvestmentDate.getFullYear();
      const currentYear = new Date().getFullYear();
      const years = [];
      for (let y = startYear; y <= currentYear; y++) years.push(y);
      return years;
  }, [firstInvestmentDate]);

  const getYearData = useCallback((year: number) => {
      const isCurrentYear = year === new Date().getFullYear();
      const endOfYear = isCurrentYear ? new Date() : new Date(year, 11, 31, 23, 59, 59);
      return getSnapshotAtDate(endOfYear, isCurrentYear);
  }, [getSnapshotAtDate]);

  // =========================================================================
  // 🚀 ENGINE GENERATOR GRAFIK LIVE (MARKET VALUE, MODAL, DIVIDEND)
  // =========================================================================
  const chartDataDaily = useMemo(() => {
     if (activePortfolio.length === 0 || Object.keys(historyPrices).length === 0) return [];

     const parsedInvestTxs = chronologicalTxs.filter((t: any) => t.type === 'invest_buy' || t.type === 'invest_sell').map((t: any) => {
         const match = t.description?.match(/(?:lot\/unit\s+)([^|@\s]+)/i);
         const sym = match ? match[1].toUpperCase().trim() : 'Unknown';
         const qtyMatch = t.description?.match(/([0-9.]+)\s+lot\/unit/i);
         const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 0;

         const priceMatch = t.description?.match(/@\s*(?:Rp|USD|US\$)?\s*([0-9.,]+)/i);
         const rawPrice = priceMatch ? parseFloat(priceMatch[1].replace(/\./g, '').replace(/,/g, '.')) : 0;

         const asset = activePortfolio.find((p: any) => p.symbol === sym);
         const currency = asset ? asset.currency : (t.description?.includes('USD') ? 'USD' : 'IDR');
         const multiplier = asset ? asset.liveMultiplier : (sym.length === 4 ? 100 : 1);
         const txDateTs = new Date(t.date).getTime();
         const historicalRate = currency === 'IDR' ? 1 : getHistoricalRate(txDateTs, currency);

         let realAmountIDR = rawPrice * qty * multiplier * historicalRate;
         if (!realAmountIDR || isNaN(realAmountIDR) || realAmountIDR === 0) {
             realAmountIDR = t.amount;
         }

         return { ...t, parsedSymbol: sym, parsedQty: qty, parsedRealAmountIDR: realAmountIDR };
     });

     const firstDate = firstInvestmentDate.getTime();
     const now = new Date().getTime();

     let startTimeframe = firstDate;
     let stepSize = 24 * 60 * 60 * 1000; 
     
     if (chartTimeframe === '1D') {
         startTimeframe = now - 1 * 24 * 60 * 60 * 1000;
         stepSize = 5 * 60 * 1000; 
     } else if (chartTimeframe === '1W') {
         startTimeframe = now - 7 * 24 * 60 * 60 * 1000;
         stepSize = 1 * 60 * 60 * 1000; 
     } else if (chartTimeframe === '1M') {
         startTimeframe = now - 30 * 24 * 60 * 60 * 1000;
         stepSize = 12 * 60 * 60 * 1000; 
     } else if (chartTimeframe === '3M') {
         startTimeframe = now - 90 * 24 * 60 * 60 * 1000;
         stepSize = 24 * 60 * 60 * 1000; 
     } else if (chartTimeframe === '1Y') {
         startTimeframe = Math.max(firstDate, now - 365 * 24 * 60 * 60 * 1000);
         stepSize = 24 * 60 * 60 * 1000; 
     } else if (chartTimeframe === '5Y') {
         startTimeframe = Math.max(firstDate, now - 1825 * 24 * 60 * 60 * 1000);
         stepSize = 3 * 24 * 60 * 60 * 1000; 
     }
     
     let currentTs = startTimeframe;
     if (chartTimeframe === '1D') {
         const startDate = new Date(currentTs);
         const roundedMinutes = Math.floor(startDate.getMinutes() / 5) * 5;
         currentTs = new Date(startDate).setMinutes(roundedMinutes, 0, 0);
     } else if (chartTimeframe === '1W') {
         currentTs = new Date(currentTs).setMinutes(0, 0, 0);
     } else {
         currentTs = new Date(currentTs).setHours(0, 0, 0, 0);
     }

     const endTs = now;
     const dailyData = [];
     let cumulativeDividend = 0;

     // FUNGSI PEMBANTU: Mengecek jumlah lot/qty riil yang dipegang pada waktu (timestamp) tertentu
     const getQtyAtTime = (sym: string, targetTs: number) => {
         let q = 0;
         if (setupAwalBases[sym] && setupAwalBases[sym].date.getTime() <= targetTs) {
             q = setupAwalBases[sym].qty;
         }
         parsedInvestTxs.forEach((t: any) => {
             if (t.parsedSymbol === sym && new Date(t.date).getTime() <= targetTs) {
                 if (t.type === 'invest_buy') q += t.parsedQty;
                 else { q -= t.parsedQty; if (q < 0) q = 0; }
             }
         });
         return q;
     };

     // 1. HITUNG DIVIDEN MASA LALU (Sebelum titik awal grafik agar akumulasinya tidak mulai dari 0)
     const allTradedSymbols = Array.from(new Set([...Object.keys(setupAwalBases), ...parsedInvestTxs.map((t: any) => t.parsedSymbol)]));
     
     allTradedSymbols.forEach(sym => {
         const assetMeta = activePortfolio.find((p: any) => p.symbol === sym);
         const ticker = assetMeta ? assetMeta.activeTicker : (tickerOverrides[sym] || sym);
         const multiplier = assetMeta ? assetMeta.liveMultiplier : (sym.length === 4 ? 100 : 1);
         const divs = dividendEvents[ticker] || [];
         
         divs.forEach((d: any) => {
             const divTsMs = d.date * 1000; 
             // Cek jika dividen terjadi SEBELUM grafik ini dimulai
             if (divTsMs <= currentTs) {
                 const heldQty = getQtyAtTime(sym, divTsMs);
                 if (heldQty > 0) {
                     cumulativeDividend += (d.amount * heldQty * multiplier);
                 }
             }
         });
     });

     // 2. RENDER TITIK GRAFIK
     while(currentTs <= endTs) {
         const dateObj = new Date(currentTs);
         let dateLabel = '';
         
         if (chartTimeframe === '1D') dateLabel = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
         else if (chartTimeframe === '1W') dateLabel = dateObj.toLocaleDateString('id-ID', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
         else if (chartTimeframe === '5Y') dateLabel = dateObj.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
         else dateLabel = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

         let currentQty: Record<string, number> = {};
         let currentInvestedIDR: Record<string, number> = {};

         Object.keys(setupAwalBases).forEach(sym => {
             if (setupAwalBases[sym].date.getTime() <= currentTs) {
                 currentQty[sym] = setupAwalBases[sym].qty;
                 currentInvestedIDR[sym] = setupAwalBases[sym].invested;
             }
         });

         parsedInvestTxs.forEach((t: any) => {
             if (new Date(t.date).getTime() <= currentTs) {
                 if (!currentQty[t.parsedSymbol]) { currentQty[t.parsedSymbol] = 0; currentInvestedIDR[t.parsedSymbol] = 0; }
                 if (t.type === 'invest_buy') {
                     currentQty[t.parsedSymbol] += t.parsedQty;
                     currentInvestedIDR[t.parsedSymbol] += t.parsedRealAmountIDR;
                 } else {
                     currentQty[t.parsedSymbol] -= t.parsedQty;
                     currentInvestedIDR[t.parsedSymbol] -= t.parsedRealAmountIDR;
                     if (currentQty[t.parsedSymbol] <= 0) {
                         currentQty[t.parsedSymbol] = 0;
                         currentInvestedIDR[t.parsedSymbol] = 0;
                     }
                 }
             }
         });

         let dailyValuation = 0;
         let dailyInvested = 0;

         Object.keys(currentQty).forEach(sym => {
             if (currentQty[sym] > 0) {
                 if (chartAssetFilter !== 'ALL' && sym !== chartAssetFilter) return;

                 const assetMeta = activePortfolio.find((p: any) => p.symbol === sym);
                 const ticker = assetMeta ? assetMeta.activeTicker : (tickerOverrides[sym] || sym);
                 const multiplier = assetMeta ? assetMeta.liveMultiplier : 1;
                 const livePriceFallback = livePrices[ticker];
                 const isIntradayView = chartTimeframe === '1D' || chartTimeframe === '1W';

                 let price = getPriceForDate(ticker, currentTs);
                 if ((!price || price === 0) && livePriceFallback) {
                     price = livePriceFallback;
                 }
                 if (isIntradayView && (currentTs + stepSize > endTs || !getPriceForDate(ticker, currentTs))) {
                     price = livePriceFallback || price;
                 }

                 if (!price) {
                     price = currentInvestedIDR[sym] / (currentQty[sym] * multiplier);
                 }

                 const val = currentQty[sym] * price * multiplier;
                 dailyValuation += val;
                 dailyInvested += currentInvestedIDR[sym];

                 // CEK EVENT DIVIDEN: Hanya tambah saldo dividen jika ada event real di range waktu/hari ini
                 const divs = dividendEvents[ticker] || [];
                 divs.forEach((d: any) => {
                     const divTsMs = d.date * 1000;
                     if (divTsMs > currentTs && divTsMs <= (currentTs + stepSize)) {
                         cumulativeDividend += (d.amount * currentQty[sym] * multiplier);
                     }
                 });
             }
         });

         dailyData.push({
             name: dateLabel,
             Total: dailyValuation,
             Investasi: dailyInvested,
             Dividend: cumulativeDividend
         });

         currentTs += stepSize;
     }

     return dailyData;
  }, [historyPrices, chronologicalTxs, activePortfolio, tickerOverrides, chartTimeframe, firstInvestmentDate, setupAwalBases, getPriceForDate, livePrices, chartAssetFilter, getHistoricalRate, dividendEvents]); 
  // =========================================================================
  // 🛡️ REFORMASI LOGIKA LOGIN & RE-FRESH SESSION KUNCI UTAMA PWA
  // =========================================================================
  const handleTerminalLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError("");
      setIsLoggingIn(true);
      try {
          const cleanEmail = loginEmail.trim().toLowerCase();
          await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
        
          // 1. Buka kunci gerbang UI Terminal
          localStorage.setItem("bilano_terminal_unlocked", "true");
          // 2. Pasang token & email standar PWA agar hooks internal use-finance berfungsi normal
          localStorage.setItem("bilano_auth", "true");
          localStorage.setItem("bilano_email", cleanEmail);
         
          window.location.reload(); 
      } catch (error: any) {
          if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
              setLoginError("unregistered");
          } else {
              setLoginError(error.message || "Gagal masuk. Silakan coba lagi.");
          }
      } finally {
          setIsLoggingIn(false);
      }
  };

  const handleLogout = async () => {
      await signOut(auth);
      // Hapus seluruh jejak session cache saat keluar dari terminal
      localStorage.removeItem("bilano_terminal_unlocked");
      localStorage.removeItem("bilano_auth");
      localStorage.removeItem("bilano_email");
      window.location.reload();
  };

  const formatRp = (num: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(num);
  const maskRp = (num: number) => showProfit ? formatRp(num) : "Rp ••••••••";
  const formatPct = (num: number) => `${num > 0 ? '+' : ''}${(num * 100).toFixed(2)}%`;

  const handleSaveSnapshot = () => {
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      
      const assetsDetail = activePortfolio.reduce((acc: any, p: any) => {
         const livePriceAPI = livePrices[p.activeTicker];
         const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
         acc[p.symbol] = { invested: p.totalModalIDR, valuasi: liveValuationIDR, qty: p.qty };
         return acc;
      }, {} as Record<string, {invested: number, valuasi: number, qty: number}>);

      saveSnapshotMutation.mutate({
          month, year, cashBalance, investValue: totalAssetValue, totalValue: totalWealth, assetsDetail: JSON.stringify(assetsDetail)
      }, {
          onSuccess: () => toast({ title: "Tersimpan", description: `Data portofolio bulan ${MONTH_NAMES[month-1]} ${year} berhasil direkam permanen.` })
      });
  };

  const saveTickerOverride = () => {
      if (editTickerModal && tempTicker) {
          setTickerOverrides({ ...tickerOverrides, [editTickerModal]: tempTicker.toUpperCase() });
          setEditTickerModal(null);
          toast({ title: "Ticker Diperbarui", description: `Sistem sekarang melacak ${tempTicker.toUpperCase()}` });
      }
  };

  const PrivacyToggle = () => (
    <button 
        onClick={() => setShowProfit(!showProfit)} 
        className={`ml-4 px-4 py-2 rounded-sm border transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] ${
            showProfit 
            ? 'bg-[#111] border-[#333] text-[#A1A1AA] hover:text-white' 
            : 'bg-[#00FF41]/10 border-[#00FF41]/50 text-[#00FF41]'
        }`}
    >
        {showProfit ? <><VenetianMask className="w-3 h-3"/> Privasi Mati</> : <><ShieldAlert className="w-3 h-3"/> Nominal Ditutupi</>}
    </button>
  );

  // =========================================================================
  // 🚀 INTERFACE GERBANG AUTH EXPORT TERMINAL (CYBERPUNK NEON VIEW)
  // =========================================================================
  if (!isTerminalAuth) {
      return (
          <>
          <style dangerouslySetInnerHTML={{__html: `
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=JetBrains+Mono:wght@400;700;800&display=swap');
              .font-mono { font-family: 'JetBrains Mono', monospace; }
              .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
              .terminal-grid {
                  background-size: 20px 20px;
                  background-image: linear-gradient(to right, rgba(0, 255, 65, 0.02) 1px, transparent 1px),
                                    linear-gradient(to bottom, rgba(0, 255, 65, 0.02) 1px, transparent 1px);
              }
          `}} />
          <div className="flex h-screen bg-[#000000] terminal-grid items-center justify-center p-4 font-mono text-[#E4E4E7] relative overflow-hidden">
            
              {/* Efek Garis Scanline Monitor CRT */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] z-50"></div>
 
              <div className="bg-[#050505] border-2 border-[#27272A] p-8 max-w-md w-full shadow-[0_0_40px_rgba(0,255,65,0.05)] relative z-10 before:content-[''] before:absolute before:top-0 before:left-0 before:w-full before:h-[2px] before:bg-[#00FF41]">
                
                  <div className="absolute top-2 left-2 text-[8px] text-[#333] font-bold">SYS.LOG // B_CORE_V2</div>
                  <div className="absolute top-2 right-2 text-[8px] text-[#00FF41] font-bold animate-pulse">● SECURE</div>

                  <div className="text-center mb-8 pt-4">
                      <img src="/BILANO-ICON.png" alt="BILANO" className="w-14 h-14 mx-auto mb-4 object-contain drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]" />
                      <h2 className="text-xl font-black text-white tracking-wider uppercase font-sans">BILANO EXPERT</h2>
                      <div className="inline-block bg-[#00E5FF]/10 border border-[#00E5FF]/30 px-3 py-1 rounded-sm mt-2">
                          <p className="text-[9px] text-[#00E5FF] font-bold uppercase tracking-[0.25em]">QUANT INSTITUTIONAL PORTAL</p>
                      </div>
                  </div>
                
                  <form onSubmit={handleTerminalLogin} className="space-y-5">
                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em] flex items-center gap-1.5">
                              <span>[01]</span> USER_IDENTIFIER (EMAIL)
                          </label>
                          <div className="relative">
                              <span className="absolute left-4 top-3 text-[#333] font-bold">&gt;</span>
                              <input 
                                  type="email" 
                                  value={loginEmail} 
                                  onChange={e => setLoginEmail(e.target.value)} 
                                  className="w-full bg-[#000000] border border-[#27272A] pl-9 pr-4 py-3 text-[#00FF41] text-sm outline-none focus:border-[#00FF41] focus:shadow-[0_0_10px_rgba(0,255,65,0.2)] transition-all rounded-sm tracking-wide" 
                                  placeholder="name@domain.com" 
                                  required 
                              />
                          </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em] flex items-center gap-1.5">
                              <span>[02]</span> ACCESS_CRYPTOGRAPH (PASSWORD)
                          </label>
                          <div className="relative">
                              <span className="absolute left-4 top-3 text-[#333] font-bold">#</span>
                              <input 
                                  type="password" 
                                  value={loginPassword} 
                                  onChange={e => setLoginPassword(e.target.value)} 
                                  className="w-full bg-[#000000] border border-[#27272A] pl-9 pr-4 py-3 text-[#00FF41] text-sm outline-none focus:border-[#00FF41] focus:shadow-[0_0_10px_rgba(0,255,65,0.2)] transition-all rounded-sm tracking-wide" 
                                  placeholder="••••••••" 
                                  required 
                              />
                          </div>
                      </div>

                      {loginError && (
                          <div className="bg-[#FF003C]/5 border border-[#FF003C]/40 p-4 text-[10px] font-bold text-[#FF003C] leading-relaxed text-center uppercase tracking-wider bg-black">
                              {loginError === 'unregistered' ? (
                                  <span>
                                      [TERMINAL_ERR]: AKUN TIDAK DIKENALI.<br/>
                                      SILAKAN REGISTRASI DI: <a href="https://bilano.app" target="_blank" rel="noopener noreferrer" className="text-white underline hover:text-[#00E5FF] transition-colors ml-1">BILANO.APP</a>
                                  </span>
                              ) : (
                                  <span>[ERR_SIG]: {loginError}</span>
                              )}
                          </div>
                      )}
  
                      <button 
                          disabled={isLoggingIn} 
                          type="submit" 
                          className="w-full mt-2 bg-[#00FF41] hover:bg-[#00CC33] disabled:bg-[#111] disabled:text-[#333] text-black font-black uppercase tracking-[0.2em] text-xs py-4 transition-all active:scale-[0.98] flex items-center justify-center gap-2 rounded-sm border border-[#00FF41]/50 shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                      >
                          {isLoggingIn ? (
                              <>
                                  <Orbit className="w-4 h-4 animate-spin text-black" />
                                  <span>DECRYPTING SESSIONS...</span>
                              </>
                          ) : (
                              "INITIALIZE TERMINAL"
                          )}
                      </button>
                  </form>

                  <div className="mt-6 border-t border-[#1a1a1a] pt-4 text-center">
                      <p className="text-[8px] text-[#555] uppercase tracking-widest">
                          SECURE SHELL // END-TO-END ENCRYPTED QUANT FEED
                      </p>
                  </div>
              </div>
          </div>
          </>
      );
  }
  // Engine Konteks AI (Menyatukan semua data live di layar)
  const expertAIContext = `
    INFORMASI PENTING UNTUK AI:
    Pengguna saat ini sedang berada di Expert Terminal BILANO, di tab: [${activeTab.toUpperCase()}].

    --- DATA KEUANGAN PENGGUNA (PERFORMANCE & PORTFOLIO) ---
    - Total Kas Likuid: Rp ${cashBalance}
    - Total Valuasi Aset Investasi: Rp ${totalAssetValue}
    - Laba/Rugi Keseluruhan: Rp ${totalProfitLoss}
    - Piutang (Uang di orang lain): ${debts.filter((d:any) => d.type === 'piutang').reduce((acc:number, d:any) => acc + d.amount, 0)}
    - Hutang (Uang pinjaman): ${debts.filter((d:any) => d.type === 'hutang').reduce((acc:number, d:any) => acc + d.amount, 0)}
    - Aset aktif dipegang: ${activePortfolio.map((p:any) => p.symbol).join(', ') || 'Belum ada'}

    --- KONTEKS BERITA GLOBAL SCANNER (JIKA ADA) ---
    ${newsContext 
      ? JSON.stringify(newsContext) 
      : 'Pengguna belum melakukan scan berita hari ini. Jika mereka bertanya soal berita, informasikan bahwa mereka bisa klik tab "Global Scanner" dan menekan tombol Telusuri/Eksekusi terlebih dahulu agar Anda bisa menganalisisnya secara presisi bersama-sama.'
    }

    TUGAS UTAMA ANDA: 
    Anda bebas memberikan saran trading, saran alokasi menunggu piutang cair, atau sentimen pasar berdasar berita di atas. Jangan membatasi imajinasi analitik Anda. Gunakan data di atas sebagai landasan absolut perhitungan Anda.
  `;

  // =========================================================================
  // 🚀 MAIN INTERFACE EXPERT TERMINAL
  // =========================================================================
  return (
    <>
    <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@400;700;800&display=swap');
        .font-sans { font-family: 'Plus Jakarta Sans', sans-serif; }
        .mono-font { font-family: 'JetBrains Mono', monospace; letter-spacing: -0.5px; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #000; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 0; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        input[type='number']::-webkit-inner-spin-button, 
        input[type='number']::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
        }
    `}} />
    
    <div className="flex h-screen bg-[#000000] text-[#E4E4E7] font-sans overflow-hidden selection:bg-[#00FF41]/30">
      
      {/* MODAL AUDIT HARGA & KOREKSI TICKER */}
      {editTickerModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in p-4">
             <div className="bg-[#09090B] border border-[#27272A] p-8 max-w-md w-full relative">
                <button onClick={() => setEditTickerModal(null)} className="absolute top-6 right-6 text-[#A1A1AA] hover:text-white"><X className="w-6 h-6"/></button>
                <div className="w-16 h-16 bg-[#FFD700]/10 flex items-center justify-center mb-6 border border-[#FFD700]/30">
                    <Wrench className="w-8 h-8 text-[#FFD700]"/>
                </div>
                <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Koreksi Ticker Aset</h2>
                <p className="text-xs text-[#A1A1AA] mb-6 leading-relaxed">
                   Sistem gagal menarik data dari Yahoo Finance untuk <b className="text-white">{editTickerModal}</b>. Silakan gunakan ticker yang valid.
                </p>
                <div className="space-y-2 mb-8">
                   <label className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em]">Kode Ticker Baru</label>
                   <input 
                       type="text" 
                       value={tempTicker} 
                       onChange={e => setTempTicker(e.target.value)}
                       placeholder="Cth: ANTM.JK / BTC-USD"
                       className="w-full bg-[#00] border border-[#333] px-4 py-3 text-white font-mono outline-none focus:border-[#FFD700] uppercase transition-colors"
                   />
                </div>
                <button onClick={saveTickerOverride} className="w-full bg-[#FFD700] hover:bg-[#CCAA00] text-black font-black tracking-[0.15em] py-3 transition-all active:scale-95 uppercase">
                   Simpan Ticker
                </button>
             </div>
         </div>
      )}

      {/* MODAL CEK RINCIAN HARGA */}
      {assetDetailModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in p-4">
             <div className="bg-[#09090B] border border-[#27272A] p-8 max-w-md w-full relative">
                <button onClick={() => setAssetDetailModal(null)} className="absolute top-6 right-6 text-[#A1A1AA] hover:text-white"><X className="w-6 h-6"/></button>
                <div className="w-16 h-16 bg-[#00E5FF]/10 flex items-center justify-center mb-6 border border-[#00E5FF]/30">
                    <ScanSearch className="w-8 h-8 text-[#00E5FF]"/>
                </div>
                <h2 className="text-xl font-black text-white mb-1 uppercase tracking-tight">Audit Kalkulasi API</h2>
                <p className="text-xs text-[#A1A1AA] mb-6 uppercase tracking-wider">Aset: <b className="text-white">{assetDetailModal.symbol}</b></p>
                
                <div className="space-y-4 bg-[#00] p-5 border border-[#222]">
                    <div className="flex justify-between items-center border-b border-[#222] pb-3">
                        <span className="text-[#A1A1AA] text-[10px] font-bold uppercase tracking-[0.15em]">Ticker Target</span>
                        <div className="flex items-center gap-2">
                           <span className="text-white font-mono">{assetDetailModal.activeTicker}</span>
                           <button onClick={() => { setTempTicker(assetDetailModal.activeTicker); setEditTickerModal(assetDetailModal.symbol); setAssetDetailModal(null); }} className="text-[9px] bg-[#222] px-2 py-1 text-[#00E5FF] hover:bg-[#333] transition-colors font-bold uppercase tracking-wider">EDIT</button>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#222] pb-3">
                        <span className="text-[#A1A1AA] text-[10px] font-bold uppercase tracking-[0.15em]">Volume (Qty)</span>
                        <span className="text-white font-mono">{assetDetailModal.qty}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#222] pb-3">
                        <span className="text-[#A1A1AA] text-[10px] font-bold uppercase tracking-[0.15em]">Multiplier</span>
                        <span className="text-white font-mono">x {assetDetailModal.liveMultiplier}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#222] pb-3">
                        <span className="text-[#A1A1AA] text-[10px] font-bold uppercase tracking-[0.15em]">Harga Live/Unit</span>
                        <span className="text-[#00E5FF] font-mono">{maskRp(livePrices[assetDetailModal.activeTicker] || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                        <span className="text-[#A1A1AA] text-[10px] font-bold uppercase tracking-[0.15em]">Valuasi Total</span>
                        <span className="text-[#00FF41] font-mono font-black text-lg">
                           {maskRp(assetDetailModal.qty * (livePrices[assetDetailModal.activeTicker] || 0) * assetDetailModal.liveMultiplier)}
                        </span>
                    </div>
                </div>
                <button onClick={() => setAssetDetailModal(null)} className="w-full mt-6 bg-[#222] hover:bg-[#333] text-white font-black tracking-[0.15em] py-3 transition-all active:scale-95 uppercase">
                   Tutup Audit
                </button>
             </div>
         </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#09090B] border-r border-[#27272A] flex flex-col z-20">
        <div className="p-6 flex items-center gap-3 border-b border-[#27272A]">
          <img src="/BILANO-ICON.png" alt="BILANO" className="w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(0,255,65,0.5)]" />
          <div>
            <h1 className="text-white font-black text-lg tracking-tight leading-none uppercase">BILANO</h1>
            <p className="text-[9px] text-[#00FF41] font-bold uppercase tracking-[0.2em] mt-1">Terminal Pro</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mb-4 px-2">Data Analytics</p>
          <button onClick={() => setActiveTab('alokasi')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all text-xs font-bold tracking-wide uppercase ${activeTab === 'alokasi' ? 'bg-[#111] text-[#00FF41] border-l-2 border-[#00FF41]' : 'text-[#D4D4D8] hover:bg-[#111] hover:text-white'}`}>
            <Layers className="w-4 h-4" /> Alokasi Aset
          </button>
          <button onClick={() => setActiveTab('pantauan')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all text-xs font-bold tracking-wide uppercase ${activeTab === 'pantauan' ? 'bg-[#111] text-[#00FF41] border-l-2 border-[#00FF41]' : 'text-[#D4D4D8] hover:bg-[#111] hover:text-white'}`}>
            <Radar className="w-4 h-4" /> Portofolio
          </button>
          <button onClick={() => setActiveTab('terealisasi')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all text-xs font-bold tracking-wide uppercase ${activeTab === 'terealisasi' ? 'bg-[#111] text-[#00FF41] border-l-2 border-[#00FF41]' : 'text-[#D4D4D8] hover:bg-[#111] hover:text-white'}`}>
            <Scale className="w-4 h-4" /> Terealisasi
          </button>
          
          <div className="h-px bg-[#222] my-4 mx-2"></div>
          
          <p className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mb-4 px-2 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5"/> Kuantitatif Sistem</p>
          <button onClick={() => setActiveTab('simulator')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all text-xs font-bold tracking-wide uppercase ${activeTab === 'simulator' ? 'bg-[#111] text-[#00E5FF] border-l-2 border-[#00E5FF]' : 'text-[#D4D4D8] hover:bg-[#111] hover:text-white'}`}>
            <Calculator className="w-4 h-4" /> Simulator
          </button>

          <p className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mt-6 mb-4 px-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5"/> Makroekonomi</p>
          <button onClick={() => setActiveTab('intel')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all text-xs font-bold tracking-wide uppercase ${activeTab === 'intel' ? 'bg-[#111] text-[#FFD700] border-l-2 border-[#FFD700]' : 'text-[#D4D4D8] hover:bg-[#111] hover:text-white'}`}>
            <Newspaper className="w-4 h-4" /> Market Intel
          </button>
          <button onClick={() => setActiveTab('scanner')} className={`w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-all text-xs font-bold tracking-wide uppercase ${activeTab === 'scanner' ? 'bg-[#111] text-[#B500FF] border-l-2 border-[#B500FF]' : 'text-[#D4D4D8] hover:bg-[#111] hover:text-white'}`}>
            <Search className="w-4 h-4" /> Global Scanner
          </button>
        </nav>

        {/* PROFIL & LOGOUT */}
        <div className="p-4 border-t border-[#27272A] mt-auto flex flex-col gap-4 bg-[#050505]">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 border-2 border-[#333] rounded-full overflow-hidden bg-[#111] flex items-center justify-center shrink-0 shadow-md">
              {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#00FF41] font-mono font-black text-lg">{(user?.firstName || currentUserEmail || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[11px] font-bold text-white uppercase truncate">
                {user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Trader'}
              </p>
              <p className="text-[9px] text-[#A1A1AA] font-mono truncate mt-0.5">{currentUserEmail}</p>
            </div>
            <button onClick={handleLogout} className="p-2 text-[#A1A1AA] hover:text-[#FF003C] hover:bg-[#FF003C]/10 transition-all rounded-md" title="Logout">
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full flex items-center justify-between px-3 py-2 bg-[#111] border border-[#222]">
             <span className="flex items-center gap-2 text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em]">
                <Radio className={`w-3 h-3 ${isLivePricesLoading ? 'text-[#FFD700] animate-pulse' : 'text-[#00FF41]'}`} />
                API Feed
             </span>
             <span className={`text-[9px] font-black uppercase tracking-wider ${isLivePricesLoading ? 'text-[#FFD700]' : 'text-[#00FF41]'}`}>
                 {isLivePricesLoading ? 'SYNC' : 'LIVE'}
             </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden bg-[#000000]">
        
        {/* HEADER */}
        <header className="h-20 border-b border-[#27272A] flex items-center justify-between px-8 bg-[#09090B] z-10">
          <div>
              <h2 className="text-lg font-black text-white tracking-tight uppercase">Dashboard Utama</h2>
              <div className="flex items-center gap-2 mt-1">
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E5FF] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00E5FF]"></span>
                  </span>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-[#00E5FF] font-bold">Encrypted Connection</p>
              </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right flex items-center gap-8">
              <div>
                  <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Total Kas Likuid</p>
                  <p className="text-white font-mono font-black text-lg">{maskRp(cashBalance)}</p>
              </div>
              <div className="h-8 w-px bg-[#333]"></div>
              <div>
                  <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Valuasi Investasi</p>
                  <div className="flex items-center gap-2 justify-end">
                      <p className="text-[#00FF41] font-mono font-black text-xl">{maskRp(totalAssetValue)}</p>
                      {isLivePricesLoading && <Orbit className="w-3.5 h-3.5 text-[#00FF41] animate-spin" />}
                  </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          
          {/* ================= TAB 1: ALOKASI ASET ================= */}
          {activeTab === 'alokasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-center border-b border-[#222] pb-4">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Matriks Alokasi</h2>
                  <PrivacyToggle />
              </div>
              
              {activePortfolio.length === 0 ? (
                  <div className="bg-[#0D0D0D] border border-[#222] p-12 flex flex-col items-center justify-center text-center">
                      <Layers className="w-8 h-8 text-[#555] mb-4" />
                      <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Tidak Ada Data</h3>
                      <p className="text-[#A1A1AA] text-xs max-w-sm uppercase tracking-wider">Silakan catat investasi di aplikasi mobile terlebih dahulu.</p>
                  </div>
              ) : (
                  <>
                      <div className="bg-[#0D0D0D] border border-[#222] overflow-x-auto custom-scrollbar pb-2">
                        <table className="w-full text-left">
                          <thead className="bg-[#111] text-[#A1A1AA] font-bold uppercase tracking-[0.15em] text-[10px] border-b border-[#333]">
                            <tr>
                              <th className="px-6 py-4 border-r border-[#222] sticky left-0 bg-[#111] z-10">Kategori</th>
                              <th className="px-6 py-4 text-white whitespace-nowrap">Tunai (IDR)</th>
                              {activePortfolio.map((p: any) => {
                                 const isError = livePrices[p.activeTicker] === undefined && !isLivePricesLoading;
                                 return (
                                    <th key={p.symbol} className="px-6 py-4 whitespace-nowrap">
                                       <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors" onClick={() => setAssetDetailModal(p)}>
                                           {p.symbol} 
                                           <span className="text-[8px] bg-[#222] border border-[#333] px-1.5 py-0.5 text-[#A1A1AA]">{p.activeTicker}</span>
                                           <ScanSearch className="w-3 h-3 text-[#00E5FF]" />
                                           {isError && (
                                              <button onClick={(e) => { e.stopPropagation(); setTempTicker(p.activeTicker); setEditTickerModal(p.symbol); }} className="text-[#FF003C] hover:text-white bg-[#FF003C]/10 border border-[#FF003C]/30 px-1.5 py-0.5 flex items-center gap-1">
                                                 ERR
                                              </button>
                                           )}
                                       </div>
                                    </th>
                                 );
                              })}
                            </tr>
                          </thead>
                          <tbody className="text-white font-mono text-xs">
                            <tr className="border-b border-[#222] hover:bg-[#111] transition-colors">
                              <td className="px-6 py-4 font-sans font-bold text-[#A1A1AA] uppercase tracking-wider sticky left-0 bg-[#0D0D0D] border-r border-[#222] z-10">Valuasi Live</td>
                              <td className="px-6 py-4">{maskRp(cashBalance)}</td>
                              {activePortfolio.map((p: any) => {
                                const livePriceAPI = livePrices[p.activeTicker];
                                const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
                                return <td key={p.symbol} className="px-6 py-4">{maskRp(liveValuationIDR)}</td>
                              })}
                            </tr>
                            <tr className="bg-[#00FF41]/5 hover:bg-[#00FF41]/10 transition-colors">
                              <td className="px-6 py-4 font-sans font-bold text-[#A1A1AA] uppercase tracking-wider sticky left-0 bg-[#0D0D0D] border-r border-[#222] z-10">Persentase</td>
                              <td className="px-6 py-4 text-[#00FF41] font-black">{totalWealth > 0 ? formatPct(cashBalance / totalWealth) : '0%'}</td>
                              {activePortfolio.map((p: any) => {
                                 const livePriceAPI = livePrices[p.activeTicker];
                                 const liveValuationIDR = livePriceAPI ? (p.qty * livePriceAPI * p.liveMultiplier) : p.totalModalIDR;
                                 return <td key={p.symbol} className="px-6 py-4 text-[#00E5FF] font-black">{totalWealth > 0 ? formatPct(liveValuationIDR / totalWealth) : '0%'}</td>
                              })}
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="bg-[#0D0D0D] border border-[#222] p-8 flex flex-col items-center justify-center min-h-[350px]">
                        <div className="w-full max-w-sm h-64 relative">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={2} dataKey="value" stroke="none">
                                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                 </Pie>
                                 <Tooltip formatter={(val: number) => maskRp(val)} contentStyle={{backgroundColor: '#000', borderColor: '#333', borderRadius: '0px', color: '#fff', fontFamily: 'JetBrains Mono'}} itemStyle={{color: '#fff', fontWeight: 'bold', fontSize: '12px'}} />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="flex flex-wrap gap-6 justify-center mt-6">
                            {pieData.map((d: any, i: number) => (
                                <div key={d.name} className="flex items-center gap-2 text-[10px] font-bold tracking-[0.1em] text-[#D4D4D8] uppercase">
                                   <span className="w-3 h-3" style={{backgroundColor: COLORS[i % COLORS.length]}}></span>
                                   {d.name}
                                </div>
                            ))}
                        </div>
                      </div>
                  </>
              )}
            </div>
          )}

          {/* ================= TAB 2: PANTAUAN PORTOFOLIO ================= */}
          {activeTab === 'pantauan' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-end border-b border-[#222] pb-4">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2">Performa Waktu Nyata</h2>
                  <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedYear(selectedYear - 1)} className="text-[9px] uppercase tracking-[0.15em] font-bold text-[#A1A1AA] hover:text-white bg-[#111] px-3 py-1.5 border border-[#333] transition-colors flex items-center gap-1"><ChevronUp className="w-3 h-3" /> Tahun {selectedYear - 1}</button>
                      <button onClick={() => setSelectedYear(selectedYear + 1)} className="text-[9px] uppercase tracking-[0.15em] font-bold text-[#A1A1AA] hover:text-white bg-[#111] px-3 py-1.5 border border-[#333] transition-colors flex items-center gap-1">Tahun {selectedYear + 1} <ChevronUp className="w-3 h-3 rotate-180" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-right mr-4">
                       <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Laba/Rugi Kumulatif</p>
                       <div className={`font-mono font-black text-2xl ${totalProfitLoss >= 0 ? 'text-[#00FF41]' : 'text-[#FF003C]'} flex items-center gap-1 justify-end`}>
                           {totalProfitLoss >= 0 ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownRight className="w-5 h-5"/>}
                           {maskRp(Math.abs(totalProfitLoss))}
                       </div>
                   </div>
                   <button onClick={handleSaveSnapshot} disabled={saveSnapshotMutation.isPending || activePortfolio.length === 0} className="bg-[#00FF41] hover:bg-[#00CC33] disabled:bg-[#333] disabled:text-[#666] text-[10px] text-black uppercase tracking-[0.15em] font-black px-6 py-3 transition-all flex items-center gap-2">
                       {saveSnapshotMutation.isPending ? <Orbit className="w-4 h-4 animate-spin"/> : <Database className="w-4 h-4" />} Snapshot DB
                   </button>
                </div>
              </div>

              {/* TABEL BULANAN */}
              <div className="bg-[#0D0D0D] border border-[#222] overflow-x-auto custom-scrollbar mb-8">
                <table className="w-full text-left">
                  <thead className="bg-[#111] text-[#A1A1AA] font-bold uppercase tracking-[0.15em] text-[10px] border-b border-[#333]">
                    <tr>
                      <th className="px-6 py-4 border-r border-[#222] sticky left-0 bg-[#111] z-10 text-[#00E5FF]">Bulan ({selectedYear})</th>
                      {activePortfolio.map((p: any) => (
                          <th key={p.symbol} className="px-6 py-4 whitespace-nowrap">
                              {p.symbol}
                          </th>
                      ))}
                      <th className="px-6 py-4 text-white whitespace-nowrap border-l border-[#333]">Total Modal</th>
                      <th className="px-6 py-4 text-[#00E5FF] whitespace-nowrap">Aggregated P/L</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#E4E4E7] font-mono text-xs">
                    {availableMonths.length === 0 ? (
                       <tr><td colSpan={activePortfolio.length + 3} className="px-6 py-8 text-center text-[#A1A1AA] uppercase tracking-widest text-[10px]">No Data Available</td></tr>
                    ) : (
                       availableMonths.map((m) => {
                          const data = getMonthData(m.monthNum, selectedYear);
                          const details = data.details as Record<string, {invested: number, valuasi: number, qty: number}>;
                          
                          return (
                             <tr key={m.name} className={`border-b border-[#222] hover:bg-[#111] transition-colors ${!data.isSaved ? 'opacity-80' : ''}`}>
                                <td className="px-6 py-4 font-sans font-bold text-[#D4D4D8] sticky left-0 bg-[#0D0D0D] border-r border-[#222] z-10 flex items-center justify-between">
                                    {m.name.toUpperCase()} {!data.isSaved && <span className="text-[7px] tracking-[0.2em] font-black bg-[#222] text-[#00FF41] px-1.5 py-0.5 ml-2">AUTO</span>}
                                </td>
                                {activePortfolio.map((p: any) => {
                                    const assetSnap = details[p.symbol] || { invested: 0, valuasi: 0, qty: 0 };
                                    if (assetSnap.qty === 0) return <td key={p.symbol} className="px-6 py-4 text-[#555] text-center">-</td>;
                                    
                                    const plAmount = assetSnap.valuasi - assetSnap.invested;
                                    const plPct = (plAmount / assetSnap.invested);
                                    return (
                                        <td key={p.symbol} className={`px-6 py-4 ${plAmount >= 0 ? 'text-[#00FF41]' : 'text-[#FF003C]'}`}>
                                            <div className="font-bold">{maskRp(plAmount)}</div>
                                            <div className="text-[10px] mt-1">{formatPct(plPct)}</div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 font-bold border-l border-[#333]">
                                    {data.investValue === 0 ? <span className="text-[#555]">-</span> : maskRp(data.investValue)}
                                </td>
                                <td className="px-6 py-4 bg-[#111]">
                                    {(() => {
                                        if (data.investValue === 0) return <span className="text-[#555]">-</span>;
                                        const plTotalAmount = data.totalValue - data.investValue;
                                        return (
                                            <div className={plTotalAmount >= 0 ? 'text-[#00FF41]' : 'text-[#FF003C]'}>
                                                <div className="font-black">{maskRp(plTotalAmount)}</div>
                                                <div className="text-[10px] mt-1">{formatPct(plTotalAmount / data.investValue)}</div>
                                            </div>
                                        );
                                    })()}
                                </td>
                             </tr>
                          )
                       })
                    )}
                  </tbody>
                </table>
              </div>

              {/* TABEL TAHUNAN */}
              <div className="bg-[#0D0D0D] border border-[#222] overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-[#111] text-[#A1A1AA] font-bold uppercase tracking-[0.15em] text-[10px] border-b border-[#333]">
                    <tr>
                      <th className="px-6 py-4 border-r border-[#222] sticky left-0 bg-[#111] z-10 text-[#FFD700]">Tahun</th>
                      {activePortfolio.map((p: any) => (
                          <th key={`yr-${p.symbol}`} className="px-6 py-4 whitespace-nowrap">
                              {p.symbol}
                          </th>
                      ))}
                      <th className="px-6 py-4 text-white whitespace-nowrap border-l border-[#333]">Total Modal</th>
                      <th className="px-6 py-4 text-[#FFD700] whitespace-nowrap">Yearly P/L</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#E4E4E7] font-mono text-xs">
                    {availableYears.length === 0 ? (
                       <tr><td colSpan={activePortfolio.length + 3} className="px-6 py-8 text-center text-[#A1A1AA] uppercase tracking-widest text-[10px]">No Data Available</td></tr>
                    ) : (
                       availableYears.map((y) => {
                          const data = getYearData(y);
                          const details = data.details as Record<string, {invested: number, valuasi: number, qty: number}>;
                          
                          return (
                             <tr key={`yr-row-${y}`} className={`border-b border-[#222] hover:bg-[#111] transition-colors`}>
                                <td className="px-6 py-4 font-sans font-bold text-[#FFD700] sticky left-0 bg-[#0D0D0D] border-r border-[#222] z-10">
                                    {y}
                                </td>
                                {activePortfolio.map((p: any) => {
                                    const assetSnap = details[p.symbol] || { invested: 0, valuasi: 0, qty: 0 };
                                    if (assetSnap.qty === 0) return <td key={`yr-${y}-${p.symbol}`} className="px-6 py-4 text-[#555] text-center">-</td>;
                                    
                                    const plAmount = assetSnap.valuasi - assetSnap.invested;
                                    const plPct = (plAmount / assetSnap.invested);
                                    return (
                                        <td key={`yr-${y}-${p.symbol}`} className={`px-6 py-4 ${plAmount >= 0 ? 'text-[#00FF41]' : 'text-[#FF003C]'}`}>
                                            <div className="font-bold">{maskRp(plAmount)}</div>
                                            <div className="text-[10px] mt-1">{formatPct(plPct)}</div>
                                        </td>
                                    );
                                })}
                                <td className="px-6 py-4 font-bold border-l border-[#333]">
                                    {data.investValue === 0 ? <span className="text-[#555]">-</span> : maskRp(data.investValue)}
                                </td>
                                <td className="px-6 py-4 bg-[#111]">
                                    {(() => {
                                        if (data.investValue === 0) return <span className="text-[#555]">-</span>;
                                        const plTotalAmount = data.totalValue - data.investValue;
                                        return (
                                            <div className={plTotalAmount >= 0 ? 'text-[#00FF41]' : 'text-[#FF003C]'}>
                                                <div className="font-black">{maskRp(plTotalAmount)}</div>
                                                <div className="text-[10px] mt-1">{formatPct(plTotalAmount / data.investValue)}</div>
                                            </div>
                                        );
                                    })()}
                                </td>
                             </tr>
                          )
                       })
                    )}
                  </tbody>
                </table>
              </div>

              {/* GRAFIK INTRADAY / HISTORIS KOMPREHENSIF */}
              <div className="bg-[#0D0D0D] border border-[#222] p-6 mt-6 relative shadow-2xl">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-[#222] pb-4 gap-4">
                  <div>
                    <h3 className="font-black text-white uppercase tracking-tight text-lg">Chart Historis Teragregasi</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                       <button onClick={() => setChartAssetFilter('ALL')} className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.1em] font-bold border transition-colors ${chartAssetFilter === 'ALL' ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-[#111] text-[#888] border-[#333] hover:text-white'}`}>TOTAL KESELURUHAN</button>
                       {activePortfolio.map((p: any) => (
                           <button key={p.symbol} onClick={() => setChartAssetFilter(p.symbol)} className={`px-3 py-1.5 text-[9px] uppercase tracking-[0.1em] font-bold border transition-colors ${chartAssetFilter === p.symbol ? 'bg-[#FFD700] text-black border-[#FFD700]' : 'bg-[#111] text-[#888] border-[#333] hover:text-white'}`}>{p.symbol}</button>
                       ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                      <div className="flex bg-[#111] border border-[#333]">
                         {['1D', '1W', '1M', '3M', '1Y', '5Y'].map(tf => (
                             <button key={tf} onClick={() => setChartTimeframe(tf as any)} className={`px-4 py-1.5 text-[9px] uppercase tracking-[0.15em] font-bold transition-all ${chartTimeframe===tf?'bg-[#00E5FF] text-black':'text-[#A1A1AA] hover:text-white'}`}>{tf}</button>
                         ))}
                      </div>
                      <div className="flex bg-[#111] border border-[#333]">
                         <button onClick={() => setChartLineFilter('ALL')} className={`px-3 py-1 text-[8px] uppercase tracking-[0.1em] font-bold transition-all ${chartLineFilter==='ALL'?'bg-[#333] text-white':'text-[#666] hover:text-white'}`}>SEMUA GARIS</button>
                         <button onClick={() => setChartLineFilter('MARKET_VALUE')} className={`px-3 py-1 text-[8px] uppercase tracking-[0.1em] font-bold transition-all ${chartLineFilter==='MARKET_VALUE'?'bg-[#FF003C] text-white':'text-[#666] hover:text-white'}`}>MARKET VALUE</button>
                         <button onClick={() => setChartLineFilter('MODAL')} className={`px-3 py-1 text-[8px] uppercase tracking-[0.1em] font-bold transition-all ${chartLineFilter==='MODAL'?'bg-[#FFF] text-black':'text-[#666] hover:text-white'}`}>TOTAL MODAL</button>
                         <button onClick={() => setChartLineFilter('DIVIDEND')} className={`px-3 py-1 text-[8px] uppercase tracking-[0.1em] font-bold transition-all ${chartLineFilter==='DIVIDEND'?'bg-[#FFD700] text-black':'text-[#666] hover:text-white'}`}>DIVIDEND</button>
                      </div>
                  </div>
                </div>
                
                <div className="h-[400px] w-full">
                    {chartDataDaily.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartDataDaily} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                             <XAxis dataKey="name" stroke="#64748B" fontSize={10} fontFamily="JetBrains Mono" tickLine={false} axisLine={false} minTickGap={40} />
                             <YAxis 
                                domain={[
                                  (dataMin: number, dataMax: number) => {
                                    const range = dataMax - dataMin;
                                    return range > 0 ? dataMin - range * 0.02 : dataMin * 0.98;
                                  },
                                  (dataMin: number, dataMax: number) => {
                                    const range = dataMax - dataMin;
                                    return range > 0 ? dataMax + range * 0.02 : dataMax * 1.02;
                                  }
                                ]} 
                                allowDataOverflow={true}
                                stroke="#64748B" 
                                fontSize={10} 
                                fontFamily="JetBrains Mono"
                                tickLine={false} 
                                axisLine={false} 
                                tickFormatter={(val) => showProfit ? `Rp${(val/1000000).toFixed(0)}M` : `•••`} 
                                orientation="right" 
                             />
                             <Tooltip 
                                formatter={(val: number, name: string) => [maskRp(val), name === 'Total' ? 'Nilai Portofolio (Market)' : name]} 
                                contentStyle={{backgroundColor: '#000', borderColor: '#333', borderRadius: '0', color: '#fff', fontFamily: 'JetBrains Mono'}} 
                                itemStyle={{fontWeight: 'bold', fontSize: '11px'}}
                             />
                             <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                             
                             {(chartLineFilter === 'ALL' || chartLineFilter === 'DIVIDEND') && (
                                 <Area type="stepAfter" dataKey="Dividend" name="Total Dividend" stroke="#FFD700" strokeWidth={2} fillOpacity={0.15} fill="#FFD700" isAnimationActive={false} />
                             )}

                             {(chartLineFilter === 'ALL' || chartLineFilter === 'MODAL') && (
                                 <Line type="stepAfter" dataKey="Investasi" name="Total Modal" stroke="#FFFFFF" strokeWidth={3} dot={false} isAnimationActive={false} />
                             )}
                             
                             {(chartLineFilter === 'ALL' || chartLineFilter === 'MARKET_VALUE') && (
                                 <Line type="linear" dataKey="Total" name="Nilai Portofolio" stroke="#FF003C" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#FF003C', stroke: '#000', strokeWidth: 2 }} isAnimationActive={false} />
                             )}
                          </ComposedChart>
                       </ResponsiveContainer>
                    ) : <div className="w-full h-full flex items-center justify-center text-[#555] text-[10px] font-bold uppercase tracking-[0.2em]">{isLivePricesLoading ? 'Sinkronisasi Harga Live...' : 'Memuat Data Historis...'}</div>}
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 3: INVESTASI TEREALISASI ================= */}
          {activeTab === 'terealisasi' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-center border-b border-[#222] pb-4">
                  <h2 className="text-lg font-black text-white uppercase tracking-tight">Investasi Terealisasi</h2>
                  <PrivacyToggle />
              </div>

              <div className="bg-[#0D0D0D] border border-[#222] overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-[#111] text-[#A1A1AA] font-bold uppercase tracking-[0.15em] text-[10px] border-b border-[#333]">
                    <tr>
                      <th className="px-6 py-4 border-r border-[#222]">Timestamp</th>
                      <th className="px-6 py-4">Instrumen</th>
                      <th className="px-6 py-4">Harga Eksekusi</th>
                      <th className="px-6 py-4 text-[#00E5FF]">Harga Live Saat Ini</th>
                      <th className="px-6 py-4 text-right">Analisis Keputusan</th>
                    </tr>
                  </thead>
                  <tbody className="text-white font-mono text-xs">
                    {realizedTrades.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-[#A1A1AA] font-sans font-bold uppercase tracking-widest text-[10px]">No Realized Trades</td></tr>
                    ) : (
                      realizedTrades.map((t: any) => {
                        const isLivePriceReady = t.livePriceIDR > 0;
                        const livePricePerShareIDR = t.livePriceIDR;
                        const sellPricePerShareIDR = t.sellPriceIDR;
                        
                        const isGoodSell = isLivePriceReady && livePricePerShareIDR < sellPricePerShareIDR;

                        return (
                          <tr key={t.id} className="border-b border-[#222] hover:bg-[#111] transition-colors">
                            <td className="px-6 py-4 text-[#D4D4D8] font-sans uppercase text-[10px] border-r border-[#222]">
                                {new Date(t.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4 font-sans font-black flex items-center gap-2">
                               {t.symbol} 
                               <span className="text-[8px] bg-[#222] border border-[#333] text-[#A1A1AA] px-1.5 py-0.5">{t.activeTicker}</span>
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-white">{maskRp(t.amount)}</span> <br/>
                               <span className="text-[9px] text-[#A1A1AA] font-sans font-bold">@ {maskRp(sellPricePerShareIDR)}</span>
                            </td>
                            <td className="px-6 py-4 text-[#00E5FF]">
                               {isLivePricesLoading && !isLivePriceReady ? <span className="text-[9px] text-[#FFD700] uppercase tracking-widest animate-pulse">Loading...</span> : (isLivePriceReady ? maskRp(livePricePerShareIDR) : <span className="text-[#555]">-</span>)}
                            </td>
                            <td className="px-6 py-4 text-right font-sans">
                              {!isLivePriceReady ? <span className="text-[9px] text-[#A1A1AA] uppercase tracking-[0.2em] font-bold">Menunggu...</span> : isGoodSell ? (
                                <span className="text-[9px] font-black uppercase tracking-wider text-[#00FF41] bg-[#00FF41]/10 border border-[#00FF41]/30 px-2 py-1">Tepat Waktu</span>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-wider text-[#FF003C] bg-[#FF003C]/10 border border-[#FF003C]/30 px-2 py-1">Terlalu Cepat</span>
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 4: SIMULATOR STRATEGI ================= */}
          {activeTab === 'simulator' && (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                 
                 <div className="flex justify-between items-center border-b border-[#222] pb-4">
                     <div>
                         <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                             Simulator Kuantitatif (GBM Model)
                         </h2>
                     </div>
                 </div>

                 {activePortfolio.length === 0 ? (
                     <div className="bg-[#0D0D0D] border border-[#222] p-12 flex flex-col items-center justify-center text-center">
                         <Calculator className="w-8 h-8 text-[#555] mb-4" />
                         <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Tidak Ada Portofolio Aktif</h3>
                     </div>
                 ) : (
                     <>
                         {grandTotalSimulation && (
                             <div className="bg-[#0D0D0D] border border-[#333] p-8 flex flex-col gap-6 relative overflow-hidden shadow-2xl">
                                 <div className="absolute left-0 top-0 w-1.5 h-full bg-[#00FF41]"></div>
                                 <div className="absolute -right-20 -bottom-20 w-48 h-48 bg-[#00FF41]/5 rounded-full blur-3xl pointer-events-none"></div>
                                 
                                 <div className="flex justify-between items-center z-10">
                                     <div>
                                         <h3 className="text-[#A1A1AA] font-bold text-[10px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                            <Target className="w-4 h-4 text-[#00FF41]"/> Target Kekayaan Maksimal ({grandTotalSimulation.maxHorizon} Thn)
                                         </h3>
                                         <div className="flex items-end gap-6">
                                             <p className="mono-font text-4xl font-black text-[#00FF41] leading-none">
                                                 {maskRp(grandTotalSimulation.totalAkhir)}
                                             </p>
                                             <p className="mono-font text-xs font-bold text-[#A1A1AA] mb-1">
                                                 Modal Terserap: <span className="text-white">{maskRp(grandTotalSimulation.totalModal)}</span>
                                             </p>
                                         </div>
                                     </div>
                                     <div className="text-right">
                                         <p className="text-[#A1A1AA] font-bold text-[10px] uppercase tracking-[0.2em] mb-2">Proyeksi Laba Bersih</p>
                                         <p className="mono-font text-2xl font-black text-[#00E5FF] leading-none">
                                             +{maskRp(grandTotalSimulation.laba)}
                                         </p>
                                     </div>
                                 </div>

                                 <div className="z-10 w-full bg-[#111] p-5 border border-[#222]">
                                     <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.15em] text-[#888] mb-3">
                                         <span>Pencapaian Saat Ini ({Math.min((totalAssetValue / grandTotalSimulation.totalAkhir) * 100, 100).toFixed(2)}%)</span>
                                         <span className="text-[#00FF41] font-mono tracking-normal">{maskRp(totalAssetValue)} <span className="text-[#555]">/ {maskRp(grandTotalSimulation.totalAkhir)}</span></span>
                                     </div>
                                     <div className="w-full h-2.5 bg-[#000] rounded-full overflow-hidden border border-[#333]">
                                         <div className="h-full bg-[#00FF41] transition-all duration-1000 shadow-[0_0_10px_#00FF41]" style={{ width: `${Math.min((totalAssetValue / grandTotalSimulation.totalAkhir) * 100, 100)}%` }}></div>
                                     </div>
                                 </div>

                                 {countdownToTarget && (
                                     <div className="flex justify-between items-center z-10 pt-4 border-t border-[#222]">
                                         <div>
                                             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA] mb-1 flex items-center gap-1.5">
                                                 <Hourglass className="w-3.5 h-3.5"/> Countdown Menuju Target
                                             </p>
                                             <p className="text-xs text-[#666]">
                                                Dihitung mundur sejak pembelian aset pertama: <span className="text-white font-mono ml-1">{validFirstBuyDate.toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                             </p>
                                         </div>
                                         <div className="flex gap-3 text-center">
                                             <div className="bg-[#111] border border-[#333] rounded-sm p-3 min-w-[70px]">
                                                 <p className="font-mono text-2xl font-black text-[#FFD700] leading-none">{countdownToTarget.y}</p>
                                                 <p className="text-[8px] uppercase tracking-widest text-[#888] mt-1.5">Tahun</p>
                                             </div>
                                             <div className="bg-[#111] border border-[#333] rounded-sm p-3 min-w-[70px]">
                                                 <p className="font-mono text-2xl font-black text-[#FFD700] leading-none">{countdownToTarget.m}</p>
                                                 <p className="text-[8px] uppercase tracking-widest text-[#888] mt-1.5">Bulan</p>
                                             </div>
                                             <div className="bg-[#111] border border-[#333] rounded-sm p-3 min-w-[70px]">
                                                 <p className="font-mono text-2xl font-black text-[#FFD700] leading-none">{countdownToTarget.d}</p>
                                                 <p className="text-[8px] uppercase tracking-widest text-[#888] mt-1.5">Hari</p>
                                             </div>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         )}

                         <div className="space-y-4">
                             {activePortfolio.map((asset: any) => {
                                 const isExpanded = expandedSimAsset === asset.symbol;
                                 const params = simParams[asset.symbol] || {};
                                 const currentSimData = isExpanded ? getSimDataForAsset(asset, params) : null;
                                 
                                 return (
                                     <div key={asset.symbol} className="bg-[#0D0D0D] border border-[#222] transition-all">
                                         <div 
                                             onClick={() => handleExpandSim(asset)}
                                             className="p-6 flex items-center justify-between cursor-pointer hover:bg-[#111] transition-colors"
                                         >
                                             <div className="flex items-center gap-6 flex-1">
                                                 <div className="w-12 h-12 bg-[#111] border border-[#333] flex items-center justify-center">
                                                     <span className="font-mono font-black text-[#00E5FF]">{asset.symbol.substring(0, 3)}</span>
                                                 </div>
                                                 <div className="flex-1 grid grid-cols-4 gap-4 items-center">
                                                     <div>
                                                         <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Instrumen</p>
                                                         <p className="font-black text-white text-base">{asset.symbol}</p>
                                                     </div>
                                                     <div>
                                                         <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Base Modal</p>
                                                         <p className="font-mono text-sm text-[#00FF41]">{formatRp(params.modalAwal || asset.totalModalIDR)}</p>
                                                     </div>
                                                     <div>
                                                         <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Horizon Target</p>
                                                         <p className="font-mono text-sm text-white">{params.horizonWaktu || 5} THN</p>
                                                     </div>
                                                     <div>
                                                         <p className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-[0.2em] mb-1">Data Model</p>
                                                         <p className={`font-mono text-xs uppercase ${params._isReady ? 'text-[#FFD700]' : 'text-[#888] animate-pulse'}`}>
                                                             {params._isReady ? 'Tersinkronisasi' : 'Menghitung...'}
                                                         </p>
                                                     </div>
                                                 </div>
                                             </div>
                                             <div className={`p-2 transition-transform duration-300 ${isExpanded ? 'text-[#00E5FF] rotate-180' : 'text-[#888]'}`}>
                                                 <ChevronDown className="w-5 h-5" />
                                             </div>
                                         </div>

                                         {isExpanded && currentSimData && (
                                             <div className="p-6 border-t border-[#222] bg-[#050505] flex flex-col xl:flex-row gap-8">
                                                 <div className="flex-1 space-y-6">
                                                     <div className="h-[300px] w-full bg-[#000] border border-[#222] p-4 relative">
                                                        <div className="absolute top-4 left-4 z-10">
                                                            <h4 className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em]">Proyeksi Ekstrapolasi Harga (IDR)</h4>
                                                        </div>
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={currentSimData.chartData} margin={{ top: 30, right: 10, left: 10, bottom: 0 }}>
                                                                <CartesianGrid stroke="#111" strokeDasharray="3 3" vertical={false} />
                                                                <XAxis dataKey="month" stroke="#444" fontSize={9} fontFamily="JetBrains Mono" tickLine={false} axisLine={false} tickFormatter={(v) => `M${v}`} />
                                                                <YAxis stroke="#444" fontSize={9} fontFamily="JetBrains Mono" tickLine={false} axisLine={false} tickFormatter={(v) => `Rp${(v/1000000).toFixed(0)}M`} width={60} />
                                                                <Tooltip 
                                                                    formatter={(val: number) => formatRp(val)}
                                                                    labelFormatter={(label) => `Bulan ${label}`}
                                                                    contentStyle={{backgroundColor: '#000', borderColor: '#333', borderRadius: '0', color: '#fff', fontFamily: 'JetBrains Mono'}}
                                                                />
                                                                <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'Plus Jakarta Sans', textTransform: 'uppercase', letterSpacing: '0.1em', paddingTop: '10px' }} />
                                                                <Line type="monotone" dataKey="LumpSum" name="Lump Sum" stroke="#0055FF" strokeWidth={2} dot={false} />
                                                                <Line type="monotone" dataKey="DCA" name="Dollar Cost Avg" stroke="#00FF41" strokeWidth={2} dot={false} />
                                                                <Line type="monotone" dataKey="ValueAveraging" name="Value Averaging" stroke="#FFD700" strokeWidth={2} dot={false} />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                     </div>

                                                     <div className="bg-[#000] border border-[#222]">
                                                        <table className="w-full text-left">
                                                            <thead className="bg-[#111] text-[#A1A1AA] font-bold uppercase tracking-[0.15em] text-[9px] border-b border-[#333]">
                                                                <tr>
                                                                    <th className="px-5 py-3 border-r border-[#222]">Metode</th>
                                                                    <th className="px-5 py-3">Total Injeksi Modal</th>
                                                                    <th className="px-5 py-3 text-[#00FF41]">Estimasi Akhir</th>
                                                                    <th className="px-5 py-3 text-[#00E5FF]">Laba Bersih</th>
                                                                    <th className="px-5 py-3">ROI</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="font-mono text-xs text-[#E4E4E7]">
                                                                {currentSimData.strategies.map((str: any) => {
                                                                    const isBest = currentSimData.bestStrategy.name === str.name;
                                                                    return (
                                                                        <tr key={str.name} className={`border-b border-[#222] ${isBest ? 'bg-[#00E5FF]/10' : 'hover:bg-[#111]'}`}>
                                                                            <td className={`px-5 py-4 border-r border-[#222] font-sans font-black uppercase text-[10px] tracking-wider ${isBest ? 'text-[#00E5FF]' : 'text-[#A1A1AA]'}`}>{str.name}</td>
                                                                            <td className="px-5 py-4">{formatRp(str.modal)}</td>
                                                                            <td className="px-5 py-4 text-[#00FF41] font-bold">{formatRp(str.akhir)}</td>
                                                                            <td className="px-5 py-4 text-[#00E5FF]">{formatRp(str.laba)}</td>
                                                                            <td className="px-5 py-4 text-[#FFD700]">{str.roi.toFixed(2)}%</td>
                                                                        </tr>
                                                                    )
                                                                })}
                                                            </tbody>
                                                        </table>
                                                        
                                                        <div className="bg-[#111] p-4 flex items-center justify-between border-t border-[#333]">
                                                            <div>
                                                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A1A1AA] mb-1">Rekomendasi Algoritma (Hasil Akhir Rupiah Tertinggi)</p>
                                                                <p className="text-sm font-black uppercase text-[#00E5FF]">{currentSimData.bestStrategy.name}</p>
                                                            </div>
                                                        </div>
                                                     </div>
                                                 </div>

                                                 <div className="w-full xl:w-80 bg-[#000] border border-[#222] p-6 flex flex-col gap-6">
                                                     <h3 className="font-black text-white text-sm uppercase tracking-widest border-b border-[#222] pb-3">Parameter Tuning</h3>
                                                     
                                                     <div className="flex justify-between items-center bg-[#111] border border-[#222] p-3 rounded-sm">
                                                         <div>
                                                             <p className="text-[9px] font-bold text-[#888] uppercase tracking-[0.15em] mb-1">Historikal CAGR</p>
                                                             <p className="text-xs font-mono text-[#FFD700]">{params.ekspektasiReturn}% / Thn</p>
                                                         </div>
                                                         <div className="text-right">
                                                             <p className="text-[9px] font-bold text-[#888] uppercase tracking-[0.15em] mb-1">Volatilitas (Risk)</p>
                                                             <p className="text-xs font-mono text-[#FF003C]">{params.volatilitas}%</p>
                                                         </div>
                                                     </div>
                                                     <p className="text-[9px] text-[#666] leading-relaxed -mt-4 text-center px-2">Data historis di atas dihitung murni menggunakan pergerakan harga 5 tahun terakhir oleh sistem.</p>

                                                     <div className="h-px bg-[#222] w-full mt-1 mb-1"></div>

                                                     <div>
                                                         <div className="flex justify-between items-center mb-2">
                                                             <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em]">Modal Awal (IDR)</label>
                                                             <input 
                                                                 type="number" 
                                                                 value={params.modalAwal} 
                                                                 onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, modalAwal: Number(e.target.value)}})}
                                                                 className="bg-[#111] border border-[#333] text-[#00FF41] text-[10px] font-mono p-1.5 rounded outline-none text-right w-28 appearance-none focus:border-[#00FF41] transition-colors"
                                                             />
                                                         </div>
                                                         <input 
                                                             type="range" min={0} max={Math.max(params.modalAwal * 2, 50000000)} step={100000}
                                                             value={params.modalAwal} 
                                                             onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, modalAwal: Number(e.target.value)}})}
                                                             className="w-full accent-[#00FF41]"
                                                         />
                                                     </div>

                                                     <div>
                                                         <div className="flex justify-between items-center mb-2">
                                                             <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em]">Suntikan/Bulan</label>
                                                             <input 
                                                                 type="number" 
                                                                 value={params.kontribusiBulanan} 
                                                                 onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, kontribusiBulanan: Number(e.target.value)}})}
                                                                 className="bg-[#111] border border-[#333] text-[#00E5FF] text-[10px] font-mono p-1.5 rounded outline-none text-right w-28 appearance-none focus:border-[#00E5FF] transition-colors"
                                                             />
                                                         </div>
                                                         <input 
                                                             type="range" min={0} max={Math.max(params.kontribusiBulanan * 3, 50000000)} step={100000}
                                                             value={params.kontribusiBulanan} 
                                                             onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, kontribusiBulanan: Number(e.target.value)}})}
                                                             className="w-full accent-[#00E5FF]"
                                                         />
                                                     </div>

                                                     <div>
                                                         <div className="flex justify-between items-center mb-2">
                                                             <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em]">Horizon Target</label>
                                                             <div className="relative">
                                                                <input 
                                                                    type="number" 
                                                                    value={params.horizonWaktu} 
                                                                    onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, horizonWaktu: Number(e.target.value)}})}
                                                                    className="bg-[#111] border border-[#333] text-white text-[10px] font-mono p-1.5 pr-6 rounded outline-none text-right w-16 appearance-none focus:border-white transition-colors"
                                                                />
                                                                <span className="absolute right-2 top-1.5 text-[9px] text-[#666] font-bold">TH</span>
                                                             </div>
                                                         </div>
                                                         <input 
                                                             type="range" min={1} max={30} step={1}
                                                             value={params.horizonWaktu} 
                                                             onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, horizonWaktu: Number(e.target.value)}})}
                                                             className="w-full accent-white"
                                                         />
                                                     </div>

                                                     <div>
                                                         <div className="flex justify-between items-center mb-2">
                                                             <label className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.15em]">Inflasi Setoran</label>
                                                             <div className="relative">
                                                                <input 
                                                                    type="number" 
                                                                    value={params.kenaikanSetoran} 
                                                                    onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, kenaikanSetoran: Number(e.target.value)}})}
                                                                    className="bg-[#111] border border-[#333] text-[#B500FF] text-[10px] font-mono p-1.5 pr-4 rounded outline-none text-right w-16 appearance-none focus:border-[#B500FF] transition-colors"
                                                                />
                                                                <span className="absolute right-2 top-1.5 text-[9px] text-[#666] font-bold">%</span>
                                                             </div>
                                                         </div>
                                                         <input 
                                                             type="range" min={0} max={50} step={1}
                                                             value={params.kenaikanSetoran} 
                                                             onChange={(e) => setSimParams({...simParams, [asset.symbol]: {...params, kenaikanSetoran: Number(e.target.value)}})}
                                                             className="w-full accent-[#B500FF]"
                                                         />
                                                     </div>
                                                 </div>
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>
                     </>
                 )}
             </div>
          )}

          {/* ================= TAB 5: MARKET INTEL & NEWS ================= */}
          {activeTab === 'intel' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <div className="flex justify-between items-center border-b border-[#222] pb-4">
                  <div>
                      <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                          <Globe className="w-5 h-5 text-[#FFD700]" /> Intelligence Center
                      </h2>
                      <p className="text-[10px] text-[#A1A1AA] uppercase tracking-[0.15em] mt-1 font-bold">
                          Pemindaian Isu Makroekonomi Terhadap Portofolio Aktif
                      </p>
                  </div>
                  <button onClick={() => refetchIntel()} className="text-[9px] uppercase tracking-[0.2em] font-bold text-[#A1A1AA] hover:text-[#00E5FF] bg-[#111] px-4 py-2 border border-[#333] transition-colors flex items-center gap-2">
                     <Orbit className={`w-3.5 h-3.5 ${isIntelLoading ? 'animate-spin text-[#FFD700]' : ''}`}/> Sinkronisasi Ulang
                  </button>
              </div>

              {activePortfolio.length === 0 ? (
                  <div className="bg-[#0D0D0D] border border-[#222] p-12 flex flex-col items-center justify-center text-center">
                      <Newspaper className="w-8 h-8 text-[#555] mb-4" />
                      <h3 className="text-sm font-black text-white mb-2 uppercase tracking-widest">Tidak Ada Portofolio</h3>
                      <p className="text-[#A1A1AA] text-xs max-w-sm uppercase tracking-wider">Radar algoritma membutuhkan minimal satu aset untuk dianalisis.</p>
                  </div>
              ) : isIntelLoading && !marketIntelData ? (
                  <div className="bg-[#0D0D0D] border border-[#222] flex flex-col items-center justify-center py-24 px-8 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(to_bottom,#FFD700_1px,transparent_1px)] bg-[size:100%_4px] opacity-[0.03] pointer-events-none"></div>
                      
                      <div className="w-full max-w-lg relative z-10 flex flex-col items-center text-center">
                          <Orbit className="w-12 h-12 text-[#FFD700] animate-spin mb-6 drop-shadow-[0_0_12px_rgba(255,215,0,0.4)]" />
                          
                          <h3 className="font-mono text-xl font-black text-[#FFD700] drop-shadow-[0_0_8px_rgba(255,215,0,0.5)] mb-2 uppercase tracking-widest">
                              MENGUMPULKAN DATA MASIF
                          </h3>
                          <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] mb-8 animate-pulse">
                              {intelStatus}
                          </p>

                          <div className="bg-[#111] border border-[#333] px-6 py-4 rounded-sm shadow-xl w-full text-left">
                              <p className="text-[#A1A1AA] text-[10px] uppercase tracking-widest leading-relaxed">
                                  ⚠️ Proses pemindaian global ini dapat memakan waktu <b className="text-[#FFD700]">sekitar 15 hingga 30 detik</b> karena sistem menarik puluhan berita paling mutakhir. Anda bisa meninggalkan tab ini sementara proses berjalan di latar belakang.
                              </p>
                          </div>
                      </div>
                  </div>
              ) : marketIntelData && marketIntelData.analysis ? (
                  <div className="space-y-6">
                      {/* PANEL SENTIMEN */}
                      <div className="bg-[#050505] border border-[#333] p-6 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${marketIntelData.analysis.overallSentiment === 'BULLISH' ? 'bg-[#00FF41]' : marketIntelData.analysis.overallSentiment === 'BEARISH' ? 'bg-[#FF003C]' : 'bg-[#FFD700]'}`}></div>
                          
                          <div className="flex justify-between items-start mb-6 border-b border-[#222] pb-4">
                              <div>
                                  <p className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mb-1">Kalkulasi Sentimen Agregat</p>
                                  <h3 className={`font-black text-2xl uppercase tracking-widest ${marketIntelData.analysis.overallSentiment === 'BULLISH' ? 'text-[#00FF41]' : marketIntelData.analysis.overallSentiment === 'BEARISH' ? 'text-[#FF003C]' : 'text-[#FFD700]'}`}>
                                      {marketIntelData.analysis.overallSentiment}
                                  </h3>
                              </div>
                              <div className="text-right">
                                  <p className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-[0.2em] mb-1">Confidence Score</p>
                                  <p className="font-mono text-xl font-black text-white">{marketIntelData.analysis.confidenceScore}%</p>
                              </div>
                          </div>

                          <div className="mb-6">
                              <p className="text-sm text-[#D4D4D8] leading-relaxed font-sans">
                                  {marketIntelData.analysis.marketSummary}
                              </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {marketIntelData.analysis.actionableInsights.map((insight: any, idx: number) => (
                                  <div key={idx} className="bg-[#111] border border-[#222] p-4">
                                      <div className="flex justify-between items-center mb-2">
                                          <span className="text-[10px] font-black text-white uppercase tracking-wider">{insight.sector}</span>
                                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${insight.sentiment.toLowerCase() === 'positif' ? 'text-[#00FF41] border-[#00FF41]/30 bg-[#00FF41]/10' : insight.sentiment.toLowerCase() === 'negatif' ? 'text-[#FF003C] border-[#FF003C]/30 bg-[#FF003C]/10' : 'text-[#FFD700] border-[#FFD700]/30 bg-[#FFD700]/10'}`}>
                                              {insight.sentiment}
                                          </span>
                                      </div>
                                      <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
                                          {insight.insight}
                                      </p>
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* DAFTAR BERITA RAW */}
                      <h3 className="font-black text-white text-sm uppercase tracking-widest mt-8 border-b border-[#222] pb-3 flex items-center justify-between">
                          Sumber Berita Tersaring
                          <span className="text-[10px] text-[#666] normal-case tracking-normal">({marketIntelData.articles?.length || 0} Artikel)</span>
                      </h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {marketIntelData.articles && marketIntelData.articles.map((article: any, idx: number) => (
                              <a key={idx} href={article.url} target="_blank" rel="noopener noreferrer" className="block bg-[#0D0D0D] border border-[#222] p-5 hover:bg-[#111] hover:border-[#FFD700]/50 transition-all group">
                                  <div className="flex justify-between items-start mb-3">
                                      <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-1">
                                          {article.source?.name || "Global Source"}
                                      </span>
                                      <span className="text-[10px] text-[#666] font-mono">
                                          {new Date(article.publishedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                  </div>
                                  <h4 className="text-sm font-bold text-white leading-snug group-hover:text-[#FFD700] transition-colors line-clamp-2">
                                      {article.title}
                                  </h4>
                                  <div className="mt-3 flex items-center justify-end text-[9px] text-[#A1A1AA] font-bold uppercase tracking-widest group-hover:text-white transition-colors">
                                      Buka Sumber <ArrowUpRight className="w-3 h-3 ml-1" />
                                  </div>
                              </a>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="bg-[#FF003C]/10 border border-[#FF003C]/30 p-4 text-[11px] font-medium text-[#FF003C] leading-relaxed uppercase tracking-wider text-center">
                      Terjadi kesalahan saat memproses agregasi berita atau koneksi API terputus.
                  </div>
              )}
            </div>
          )}

          {/* ================= TAB 6: GLOBAL SCANNER ================= */}
          {activeTab === 'scanner' && (
             <UniversalNewsScanner currentUserEmail={currentUserEmail} onNewsUpdate={(data) => setNewsContext(data)}/>
          )}

          {/* KOTAK CHAT AI MENGAMBANG */}
          {isTerminalAuth && (
             <TerminalAIChat financialContext={expertAIContext} />
          )}
        </div>
      </main>
    </div>
    </>
  );
}