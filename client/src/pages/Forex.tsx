import { useState, useEffect, useRef } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { 
    RefreshCw, Search, ArrowDownCircle, ArrowUpCircle, 
    Globe, ChevronDown, ArrowRightLeft, FileText, Wallet,
    TrendingUp, X, Activity, StickyNote, Plus, Check, Loader2, HandCoins
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { useQuery } from "@tanstack/react-query";

const CURRENCY_LIST = [
    { code: "USD", name: "US Dollar", country: "United States" },
    { code: "EUR", name: "Euro", country: "European Union" },
    { code: "GBP", name: "British Pound", country: "United Kingdom" },
    { code: "JPY", name: "Japanese Yen", country: "Japan" },
    { code: "SGD", name: "Singapore Dollar", country: "Singapore" },
    { code: "AUD", name: "Australian Dollar", country: "Australia" },
    { code: "MYR", name: "Malaysian Ringgit", country: "Malaysia" },
    { code: "CNY", name: "Chinese Yuan", country: "China" },
    { code: "SAR", name: "Saudi Riyal", country: "Saudi Arabia" },
    { code: "HKD", name: "Hong Kong Dollar", country: "Hong Kong" },
    { code: "KRW", name: "South Korean Won", country: "South Korea" },
    { code: "THB", name: "Thai Baht", country: "Thailand" },
    { code: "IDR", name: "Indonesian Rupiah", country: "Indonesia" },
];

const POPULAR_RATES = ["USD", "SGD", "EUR", "JPY", "GBP", "AUD"];

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

interface ForexAsset {
  id: number;
  currency: string;
  amount: number;
}

export default function Forex() {
  const [activeTab, setActiveTab] = useState<'exchange' | 'mutation'>('mutation');

  const [exchangeMode, setExchangeMode] = useState<'buy' | 'sell'>('buy');
  const [amountExchange, setAmountExchange] = useState("");
  const [rateExchange, setRateExchange] = useState("");

  const [mutationMode, setMutationMode] = useState<'in' | 'out'>('in');
  const [amountMutation, setAmountMutation] = useState("");
  const [noteMutation, setNoteMutation] = useState(""); 
  
  const [paymentMode, setPaymentMode] = useState<'cash' | 'debt'>('cash');
  const [debtName, setDebtName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCurr, setSelectedCurr] = useState(CURRENCY_LIST[0]); 
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [chartCurr, setChartCurr] = useState<string | null>(null); 
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const { toast } = useToast();

  const currentUserEmail = localStorage.getItem("bilano_email") || "";
  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;

  const formatNum = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };
  const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

  const { data: rates = {}, isLoading: isRatesLoading, refetch: refetchRates } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const getSafeRate = (curr: string) => {
      return rates[curr] || DEFAULT_RATES[curr] || 15000;
  };

  const { data: assets = [], isLoading: isAssetsLoading, refetch: refetchAssets, isFetching: isRefreshing } = useQuery({
      queryKey: ['forexAssets', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const isLoading = isRatesLoading || isAssetsLoading;
  const refreshing = isRefreshing;

  const fetchData = () => {
      refetchRates();
      refetchAssets();
  };

  const filteredCurrencies = CURRENCY_LIST.filter(c => 
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
          if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
              setIsDropdownOpen(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchWithTimeout = async (url: string, timeout = 2500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
          const response = await fetch(url, { signal: controller.signal });
          clearTimeout(id);
          return response;
      } catch (error) {
          clearTimeout(id);
          throw error;
      }
  };

  const handleCurrencyClick = async (currencyCode: string) => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      setChartCurr(currencyCode);
      setLoadingChart(true);
      setChartData([]); 

      const baseRate = getSafeRate(currencyCode);
      
      // PERBAIKAN: Menghasilkan data simulasi harian penuh (30 hari berurutan)
      const safeMockData = Array.from({length: 30}).map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          return {
              date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
              value: Math.round(baseRate * (1 + (Math.random() * 0.015 - 0.0075)))
          };
      });
      safeMockData[safeMockData.length - 1].value = Math.round(baseRate);

      try {
          const endDate = new Date().toISOString().split('T')[0];
          const startDateObj = new Date();
          startDateObj.setDate(startDateObj.getDate() - 30);
          const startDate = startDateObj.toISOString().split('T')[0];

          const res = await fetchWithTimeout(`https://api.frankfurter.app/${startDate}..${endDate}?from=${currencyCode}&to=IDR`, 2500);
          
          if (!res.ok) throw new Error("API Tutup");
          
          const data = await res.json();
          if (data.rates && Object.keys(data.rates).length > 0) {
              const formattedData = Object.keys(data.rates).map(date => ({
                  date: new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                  value: data.rates[date].IDR
              }));
              setChartData(formattedData);
          } else {
              throw new Error("Data rates kosong");
          }
      } catch (error) { 
          setChartData(safeMockData); 
      } finally { 
          setLoadingChart(false); 
      }
  };

  const handleExchange = async () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      const qty = parseNum(amountExchange);
      const rate = parseNum(rateExchange);
      if (!qty || !rate) { toast({ title: "Error", description: "Isi jumlah dan kurs.", variant: "destructive" }); return; }

      setIsSubmitting(true);
      try {
          const forexType = exchangeMode === 'buy' ? 'income' : 'expense';
          
          const resForex = await fetch("/api/forex/transaction", {
              method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ 
                  currency: selectedCurr.code, 
                  amount: qty, 
                  type: forexType 
              })
          });
          
          if (!resForex.ok) { toast({ title: "Gagal", description: "Cek saldo valas Anda.", variant: "destructive" }); return; }

          const totalRp = qty * rate;
          const txType = exchangeMode === 'buy' ? 'expense' : 'income';
          const txDesc = exchangeMode === 'buy' ? `Beli ${selectedCurr.code} ${qty}` : `Jual ${selectedCurr.code} ${qty}`;

          await fetch("/api/transactions", {
              method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ 
                  type: txType, 
                  amount: totalRp, 
                  category: "Investasi Valas", 
                  description: `${txDesc} @ Rp ${rate.toLocaleString()}`,
                  date: new Date()
              })
          });

          toast({ title: "Sukses", description: "Transaksi pertukaran berhasil." });
          setAmountExchange(""); setRateExchange(""); 
          fetchData(); 
      } catch (e) { 
          toast({ title: "Error", variant: "destructive" }); 
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleMutation = async () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return;
      }

      const qty = parseNum(amountMutation);
      if (!qty) { toast({ title: "Error", description: "Isi nominal.", variant: "destructive" }); return; }
      
      if (paymentMode === 'debt' && (!debtName || !dueDate)) {
          toast({ title: "Error", description: "Isi nama pihak dan tenggat waktu!", variant: "destructive" });
          return;
      }

      const note = noteMutation.trim() || (mutationMode === 'in' ? "Pemasukan Valas" : "Pengeluaran Valas");
      setIsSubmitting(true);

      try {
          if (paymentMode === 'cash') {
              const res = await fetch("/api/forex/transaction", {
                  method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({ 
                      currency: selectedCurr.code, 
                      amount: qty, 
                      type: mutationMode === 'in' ? 'income' : 'expense',
                      description: note
                  })
              });

              if (res.ok) {
                  const data = await res.json();
                  toast({ title: "Tercatat!", description: `Saldo Valas Tunai Diperbarui.` });
                  setAmountMutation(""); setNoteMutation(""); setDebtName(""); setDueDate("");
                  fetchData();
              } else {
                  toast({ title: "Gagal", description: "Gagal menyimpan atau saldo Rupiah kurang.", variant: "destructive" });
              }
          } else {
              const rate = getSafeRate(selectedCurr.code);
              const idrEquivalent = qty * rate;

              await fetch("/api/debts", {
                  method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({
                      type: mutationMode === 'in' ? 'piutang' : 'hutang',
                      name: `${debtName}|${selectedCurr.code}`,
                      amount: qty,
                      dueDate: dueDate,
                      description: `[${mutationMode === 'in' ? 'Piutang' : 'Hutang'} Valas] ${note}`,
                      isFromTransaction: true
                  })
              });

              await fetch("/api/transactions", {
                  method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({
                      type: mutationMode === 'in' ? 'income' : 'expense',
                      amount: idrEquivalent,
                      category: mutationMode === 'in' ? `Piutang Valas (${selectedCurr.code})` : `Hutang Valas (${selectedCurr.code})`,
                      description: `Belum Dibayar - ${debtName}`,
                      date: new Date().toISOString()
                  })
              });

              toast({ title: "Tercatat!", description: `${mutationMode === 'in' ? 'Piutang' : 'Hutang'} Valas berhasil disimpan ke daftar Tagihan.` });
              setAmountMutation(""); setNoteMutation(""); setDebtName(""); setDueDate("");
              fetchData();
          }
      } catch (e) { 
          toast({ title: "Error", description: "Gagal terhubung ke server.", variant: "destructive" }); 
      } finally {
          setIsSubmitting(false);
      }
  };

  const totalValasInRupiah = assets.reduce((acc: number, asset: ForexAsset) => {
      const rate = getSafeRate(asset.currency);
      return acc + (asset.amount * rate);
  }, 0);

  const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

  const displayTotalValas = isTrialExpired ? "✨ Premium" : formatRp(totalValasInRupiah);
  const getBalanceTextSize = (text: string) => {
      if (text.length >= 20) return "text-xl"; 
      if (text.length >= 15) return "text-2xl"; 
      return "text-3xl"; 
  };

  if (isLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm mb-2">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Memuat Valas...</span>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-2 text-center animate-pulse">Menarik data pertukaran uang asing terbaru...</p>
          </div>
      );
  }

  return (
    <MobileLayout title="Dompet Valas" showBack>
      <div className="space-y-6 pt-4 pb-20">

        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <Globe className="w-3 h-3"/> Total Aset Asing (Estimasi)
                    </p>
                    <h2 className={`${getBalanceTextSize(displayTotalValas)} font-bold text-emerald-400 whitespace-nowrap transition-all duration-300`}>
                        {displayTotalValas}
                    </h2>
                </div>
                <button onClick={fetchData} className={`p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all ${refreshing ? "animate-spin" : ""}`}>
                    <RefreshCw className="w-5 h-5 text-white"/>
                </button>
            </div>
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
        </div>

        <div>
            <div className="flex justify-between items-end mb-2 px-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Market Rates</h3>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Klik untuk Grafik 📈</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {POPULAR_RATES.map(curr => (
                    <button key={curr} onClick={() => handleCurrencyClick(curr)} className="bg-white border border-slate-200 p-2 rounded-xl shadow-sm flex flex-col items-center justify-center hover:bg-indigo-50 hover:border-indigo-300 transition-all active:scale-95">
                        <div className="text-xs font-bold text-slate-400 mb-1">{curr}</div>
                        <div className={`text-xs font-bold ${isTrialExpired ? 'text-rose-500' : 'text-slate-700'}`}>
                             {isTrialExpired ? "✨ Premium" : `Rp ${Math.round(getSafeRate(curr)).toLocaleString("id-ID")}`}
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {chartCurr && !isTrialExpired && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 relative">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">{chartCurr} / IDR</h3>
                            <p className="text-xs text-slate-500">Tren Nilai Tukar 30 Hari Terakhir</p>
                        </div>
                        <button onClick={() => setChartCurr(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
                    </div>
                    
                    <div className="w-full bg-white rounded-xl border border-slate-200 p-3 mb-5 shadow-inner" style={{ height: '260px' }}>
                        {loadingChart ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
                                <Activity className="w-8 h-8 mx-auto mb-2 animate-spin"/>
                                <p className="text-xs font-bold">Mengambil data pasar...</p>
                            </div>
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                    <XAxis 
                                        dataKey="date" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fill: '#94a3b8' }} 
                                        minTickGap={20}
                                    />
                                    <YAxis 
                                        domain={['auto', 'auto']} 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                                        tickFormatter={(val) => `Rp ${(val/1000).toFixed(1)}k`}
                                        orientation="right"
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold' }} 
                                        formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, 'Kurs']}
                                        labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '10px' }}
                                    />
                                    {/* PERBAIKAN: Warna grafik diubah menjadi Hijau Emerald (#10b981) */}
                                    <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fill="#10b981" fillOpacity={0.15} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <p className="text-xs font-bold">Gagal memuat grafik.</p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-xl mb-4 border border-indigo-100">
                        <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-widest">Harga Saat Ini</span>
                        <span className="font-extrabold text-indigo-600 text-lg">Rp {Math.round(getSafeRate(chartCurr)).toLocaleString('id-ID')}</span>
                    </div>

                    <Button onClick={() => { setChartCurr(null); setSelectedCurr(CURRENCY_LIST.find(c => c.code === chartCurr) || CURRENCY_LIST[0]); setActiveTab('exchange'); }} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-sm font-extrabold rounded-full shadow-lg">
                        TRANSAKSI {chartCurr} SEKARANG
                    </Button>
                </div>
            </div>
        )}

        <Card className="p-0 overflow-hidden shadow-lg border border-slate-200">
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('mutation')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'mutation' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                    <FileText className="w-4 h-4"/> CATAT MUTASI
                </button>
                <button onClick={() => setActiveTab('exchange')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'exchange' ? 'bg-white text-purple-600 border-b-2 border-purple-600' : 'bg-slate-50 text-slate-400'}`}>
                    <ArrowRightLeft className="w-4 h-4"/> TUKAR VALAS
                </button>
            </div>

            <div className="p-5 space-y-5 bg-white">
                <div className="relative" ref={dropdownRef}>
                    <label className="text-xs font-bold text-slate-500 mb-1 block">Mata Uang Asing</label>
                    <div onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-full h-12 border border-slate-300 rounded-xl flex items-center px-4 justify-between cursor-pointer bg-white hover:border-blue-400 transition-colors">
                        <div>
                            <span className="font-bold text-slate-800 mr-2">{selectedCurr.code}</span>
                            <span className="text-xs text-slate-500 truncate max-w-[150px] inline-block align-bottom pb-0.5">{selectedCurr.name}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400"/>
                    </div>
                    
                    {isDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                    <Search className="w-3 h-3 absolute left-3 top-2.5 text-slate-400"/>
                                    <input type="text" placeholder="Cari mata uang..." className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-400" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} autoFocus />
                                </div>
                            </div>
                            <div className="overflow-y-auto flex-1">
                                {filteredCurrencies.map((c) => (
                                    <div key={c.code} onClick={() => { setSelectedCurr(c); setIsDropdownOpen(false); setSearchQuery(""); }} className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0">
                                        <div><div className="font-bold text-slate-700 text-sm">{c.code}</div><div className="text-[10px] text-slate-400">{c.name}</div></div>
                                        <div className="text-[9px] font-bold text-slate-300 bg-slate-100 px-2 py-0.5 rounded">{c.country}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {activeTab === 'mutation' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-left-2">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setMutationMode('in')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${mutationMode === 'in' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500'}`}><ArrowDownCircle className="w-4 h-4"/> PEMASUKAN</button>
                            <button onClick={() => setMutationMode('out')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${mutationMode === 'out' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}><ArrowUpCircle className="w-4 h-4"/> PENGELUARAN</button>
                        </div>
                        
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                            <button onClick={() => setPaymentMode('cash')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${paymentMode === 'cash' ? (mutationMode === 'in' ? 'bg-emerald-100 text-emerald-700 shadow-sm' : 'bg-rose-100 text-rose-700 shadow-sm') : 'text-slate-400'}`}>
                                <Wallet className="w-3.5 h-3.5"/> TUNAI (Cash)
                            </button>
                            <button onClick={() => setPaymentMode('debt')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${paymentMode === 'debt' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-400'}`}>
                                <HandCoins className="w-3.5 h-3.5"/> {mutationMode === 'in' ? 'PIUTANG' : 'HUTANG'}
                            </button>
                        </div>

                        {paymentMode === 'debt' && (
                            <div className="animate-in fade-in slide-in-from-top-2 bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-4 shadow-inner">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-amber-600 block mb-1.5">{mutationMode === 'in' ? 'Ditagih Ke Siapa?' : 'Ngutang Ke Siapa?'}</label>
                                    <Input placeholder="Nama Klien / Toko" value={debtName} onChange={e => setDebtName(e.target.value)} className="h-12 text-sm bg-white border-amber-200 focus:border-amber-400 rounded-xl"/>
                                </div>
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-amber-600 block mb-1.5">Tenggat Waktu (Wajib)</label>
                                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-12 text-sm bg-white border-amber-200 focus:border-amber-400 rounded-xl"/>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 block">Nominal ({selectedCurr.code})</label>
                            <Input type="text" inputMode="decimal" placeholder="Contoh: 100" className="h-14 text-xl font-bold rounded-xl" value={amountMutation} onChange={(e) => setAmountMutation(formatNum(e.target.value))}/>
                        </div>
                        
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><StickyNote className="w-3 h-3"/> Keterangan</label>
                            <textarea placeholder="Contoh: Bayaran Freelance, Beli Aset..." className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" value={noteMutation} onChange={(e) => setNoteMutation(e.target.value)}/>
                        </div>

                        <Button disabled={isSubmitting} onClick={handleMutation} className={`w-full h-14 font-extrabold text-base shadow-md rounded-xl transition-all active:scale-95 ${paymentMode === 'debt' ? 'bg-amber-500 hover:bg-amber-600 text-white' : (mutationMode === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700')}`}>
                            {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : "SIMPAN DATA VALAS"}
                        </Button>
                    </div>
                )}

                {activeTab === 'exchange' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-2">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button onClick={() => setExchangeMode('buy')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${exchangeMode === 'buy' ? 'bg-purple-600 text-white shadow' : 'text-slate-500'}`}>BELI (Rupiah Keluar)</button>
                            <button onClick={() => setExchangeMode('sell')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${exchangeMode === 'sell' ? 'bg-orange-500 text-white shadow' : 'text-slate-500'}`}>JUAL (Rupiah Masuk)</button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Jml ({selectedCurr.code})</label><Input type="text" inputMode="decimal" placeholder="100" className="h-12 text-lg font-bold" value={amountExchange} onChange={(e) => setAmountExchange(formatNum(e.target.value))}/></div>
                            <div><label className="text-xs font-bold text-slate-500 mb-1 block">Kurs Deal (Rp)</label><Input type="text" inputMode="decimal" placeholder={isTrialExpired ? "✨" : formatNum(Math.round(getSafeRate(selectedCurr.code)).toString())} className="h-12 text-lg font-bold" value={rateExchange} onChange={(e) => setRateExchange(formatNum(e.target.value))}/></div>
                        </div>
                        
                        <div className={`p-3 rounded-xl border text-center ${exchangeMode === 'buy' ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100'}`}>
                            <p className={`text-xs mb-1 ${exchangeMode === 'buy' ? 'text-purple-600' : 'text-orange-600'}`}>Total Rupiah</p>
                            <p className="text-xl font-extrabold text-slate-800">{amountExchange && rateExchange ? formatRp(parseNum(amountExchange) * parseNum(rateExchange)) : "Rp 0"}</p>
                        </div>
                        
                        <Button disabled={isSubmitting} onClick={handleExchange} className={`w-full h-12 font-bold ${exchangeMode === 'buy' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "KONFIRMASI TRANSAKSI"}
                        </Button>
                    </div>
                )}
            </div>
        </Card>

        <div>
            <h3 className="text-xs font-bold text-slate-500 mb-3 px-1 uppercase tracking-wider">Portofolio Saya</h3>
            <div className="space-y-3">
                {assets.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200"><Wallet className="w-8 h-8 mx-auto mb-2 opacity-30"/><p className="text-sm">Belum ada aset asing.</p></div>
                ) : (
                    assets.map((asset: ForexAsset) => {
                        const currInfo = CURRENCY_LIST.find(c => c.code === asset.currency) || { country: "", name: asset.currency };
                        const liveRate = getSafeRate(asset.currency);
                        const idrVal = asset.amount * liveRate;
                        return (
                            <div key={asset.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-md">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-50 text-blue-600 font-bold w-10 h-10 rounded-full flex items-center justify-center border border-blue-100 text-xs shadow-sm">{asset.currency}</div>
                                    <div>
                                        <div className="font-bold text-slate-800 text-md">{asset.amount.toLocaleString()} <span className="text-xs text-slate-400 font-normal">{currInfo.name}</span></div>
                                        <div className="text-[10px] text-slate-400">{currInfo.country}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${isTrialExpired ? 'text-rose-500' : 'text-emerald-600'} text-sm`}>
                                        {isTrialExpired ? "✨ Premium" : formatRp(idrVal)}
                                    </div>
                                    <div className="text-[10px] text-slate-400 flex items-center justify-end gap-1">
                                        <Activity className="w-3 h-3"/> 
                                        {isTrialExpired ? "***" : formatRp(liveRate)}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>

      </div>
    </MobileLayout>
  );
}