import { useState } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { 
    Users, ArrowUpRight, ArrowDownLeft, Calendar, 
    CheckCircle2, Plus, HandCoins, AlertCircle, X, Loader2, 
    ArrowRight, HeartCrack, RefreshCw, ArrowLeft, Sparkles, 
    Wallet, Check, Clock, TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { useUser } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

interface DebtItem {
  id: number;
  type: 'hutang' | 'piutang';
  name: string;
  amount: number;
  dueDate: string;
  description: string;
  isPaid: boolean;
}

export default function Debts() {
  const { data: user } = useUser();
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang'>('hutang'); 

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const { toast } = useToast();
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  
  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
  const [showSetupPrompt, setShowSetupPrompt] = useState(false);
  const [showSourcePopup, setShowSourcePopup] = useState(false);
  const [pendingAction, setPendingAction] = useState<'add' | 'pay' | null>(null);

  const formatNum = (val: string, isForeign: boolean = false) => {
      if (!val) return "";
      if (isForeign) return val.replace(/[^0-9.,]/g, '');
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };

  const parseNum = (val: string, isForeign: boolean = false) => {
      if (isForeign) return parseFloat(val.replace(/,/g, ".")) || 0;
      return parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;
  };

  const { data: items = [], isLoading: isDebtsLoading, refetch: refetchDebts } = useQuery({
      queryKey: ['debts', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/debts`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: forexRates = {}, isLoading: isRatesLoading, refetch: refetchRates } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: txs = [], refetch: refetchTxs } = useQuery({
      queryKey: ['transactions', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/transactions`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const loading = isDebtsLoading || isRatesLoading;
  const activeRates = Object.keys(forexRates).length > 0 ? forexRates : DEFAULT_RATES;
  const availableCurrencies = Object.keys(activeRates);

  const fetchData = async () => {
      await refetchDebts();
      await refetchRates();
      await refetchTxs();
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries();
  };

  const checkPaywall = () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return true;
      }
      return false;
  };

  const handleAdd = async () => {
      if (checkPaywall()) return;
      const isForeign = currency !== 'IDR';
      const nominal = parseNum(amount, isForeign);

      if (!name.trim() || !nominal || nominal <= 0) { 
          toast({ title: "Form Tidak Lengkap!", description: "Isi nama pihak dan nominal yang valid.", variant: "destructive" }); 
          return; 
      }
      if (isSubmitting) return;

      if (user?.walletSources && (user.walletSources as any[]).length > 0) {
          setPendingAction('add');
          setShowSourcePopup(true);
      } else {
          executeAdd();
      }
  };

  const executeAdd = async (selectedSource?: string) => {
      const isForeign = currency !== 'IDR';
      const nominal = parseNum(amount, isForeign);
      
      setIsSubmitting(true);
      toast({ title: "Mencatat...", description: "Menyimpan catatan hutang/piutang..." });

      try {
          const nameWithCurrency = `${name.trim()}|${currency}`;
          const resDebt = await fetch("/api/debts", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ 
                  type: activeTab, 
                  name: nameWithCurrency, 
                  amount: nominal, 
                  dueDate, 
                  description: desc.trim(), 
                  isFromTransaction: false, 
                  source: selectedSource 
              })
          });
          
          if (!resDebt.ok) throw new Error("Gagal menyimpan data.");

          trackEvent("debt_tx_added", { 
              type: activeTab,
              currency: currency 
          });

          await fetchData();
          toast({ 
              title: "Tersimpan! 🎉", 
              description: `Catatan ${activeTab === 'hutang' ? 'Hutang' : 'Piutang'} berhasil ditambahkan.` 
          });
          setName(""); setAmount(""); setDueDate(""); setDesc(""); setCurrency("IDR");
          setIsFormOpen(false); 
      } catch (e: any) { 
          toast({ title: "Terjadi Kendala", description: e.message || "Gagal menyimpan data.", variant: "destructive" }); 
      } finally { 
          setIsSubmitting(false); 
      }
  };

  const handlePay = async () => {
      if (checkPaywall() || !selectedDebt) return;
      
      if (!selectedDebt.id) {
          toast({ title: "Error Sistem", description: "ID Tagihan tidak terbaca", variant: "destructive" });
          return;
      }

      const isPayForeign = selectedDebt.name.split('|')[1] !== 'IDR' && selectedDebt.name.split('|')[1] !== undefined;
      const nominal = parseNum(payAmount, isPayForeign) || selectedDebt.amount; 

      if (nominal > selectedDebt.amount) { 
          toast({ title: "Nominal Berlebih", description: "Nominal pembayaran melebihi sisa tagihan.", variant: "destructive" }); 
          return; 
      }
      if (nominal <= 0) { 
          toast({ title: "Nominal Tidak Valid", description: "Masukkan nominal pembayaran yang valid.", variant: "destructive" }); 
          return; 
      }
      
      if (user?.walletSources && (user.walletSources as any[]).length > 0) {
          setPendingAction('pay');
          setShowSourcePopup(true);
      } else {
          executePay();
      }
  };

  const executePay = async (selectedSource?: string) => {
      if (!selectedDebt) return;
      const isPayForeign = selectedDebt.name.split('|')[1] !== 'IDR' && selectedDebt.name.split('|')[1] !== undefined;
      const nominal = parseNum(payAmount, isPayForeign) || selectedDebt.amount; 

      setIsPaying(true);
      toast({ title: "Memproses...", description: "Menyinkronkan status tagihan..." });

      try {
          const res = await fetch(`/api/debts/${selectedDebt.id}/pay`, { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ amount: nominal, isWriteOff: false, source: selectedSource }) 
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server Error ${res.status}`);
          }

          trackEvent("debt_paid", { 
              isForeignCurrency: isPayForeign,
              amount: nominal 
          });
          
          await fetchData(); 
          toast({ title: "Pembayaran Berhasil! ✨", description: "Status tagihan telah diperbarui." }); 
          setPayAmount(""); setSelectedDebt(null); setPayModalOpen(false); 
      } catch (e: any) { 
          toast({ title: "Gagal Memproses", description: e.message, variant: "destructive" }); 
      } finally { 
          setIsPaying(false); 
      }
  };

  const handleWriteOff = async (debtToProcess: DebtItem) => {
      if (checkPaywall() || !debtToProcess) return;
      
      if (!debtToProcess.id) {
          toast({ title: "Error Sistem", description: "ID Tagihan tidak terbaca", variant: "destructive" });
          return;
      }

      const isPiutang = debtToProcess.type === 'piutang';
      const confirmText = isPiutang 
          ? "Ikhlaskan piutang ini? Ini akan dicatat sebagai KERUGIAN di Laporan Anda." 
          : "Hutang ini diputihkan oleh pihak lawan? Ini akan dicatat sebagai KEUNTUNGAN di Laporan Anda.";
          
      if (!confirm(confirmText)) return;
      
      setSelectedDebt(debtToProcess); 
      setIsPaying(true);
      toast({ title: "Menganulir Tagihan...", description: "Memproses pembukuan..." });

      try {
          const res = await fetch(`/api/debts/${debtToProcess.id}/pay`, { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ amount: debtToProcess.amount, isWriteOff: true }) 
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server Error ${res.status}`);
          }
          
          await fetchData(); 
          toast({ title: "Berhasil Dianulir", description: "Tercatat rapi di laporan Anda." });
      } catch (e: any) { 
          toast({ title: "Gagal Memproses", description: e.message, variant: "destructive" }); 
      } finally { 
          setIsPaying(false); setSelectedDebt(null); 
      }
  };

  const handleRestore = async (debtId: number) => {
      if (checkPaywall()) return;
      if (!confirm("Pulihkan tagihan ini? Saldo dan transaksi akan dikembalikan seperti semula.")) return;

      setIsPaying(true); 
      toast({ title: "Memulihkan...", description: "Mengembalikan data transaksi..." });

      try {
          const res = await fetch(`/api/debts/${debtId}/restore`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail }
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server Error ${res.status}`);
          }

          await fetchData();
          toast({ title: "Berhasil Dipulihkan!", description: "Tagihan kembali aktif." });
      } catch (e: any) { 
          toast({ title: "Gagal Memulihkan", description: e.message, variant: "destructive" }); 
      } finally { 
          setIsPaying(false); 
      }
  };

  const filteredItems = items.filter((i: DebtItem) => i.type === activeTab);
  
  const totalAmountIDR = filteredItems.filter((i: DebtItem) => !i.isPaid).reduce((acc: number, item: DebtItem) => {
      const parts = (item.name || "").split('|');
      const curr = parts[1] || 'IDR';
      const rate = curr === 'IDR' ? 1 : (activeRates[curr] || 1);
      return acc + (item.amount * rate);
  }, 0);

  const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");
  const displayTotalDebt = formatRp(totalAmountIDR);

  let modalSisaTagihanUI = "Rp 0";
  let isPayForeign = false;
  if (selectedDebt) {
      const curr = selectedDebt.name.split('|')[1] || 'IDR';
      isPayForeign = curr !== 'IDR';
      const rate = curr === 'IDR' ? 1 : (activeRates[curr] || 1);
      const idrNominal = selectedDebt.amount * rate;
      modalSisaTagihanUI = curr !== 'IDR' ? `${curr} ${selectedDebt.amount.toLocaleString('id-ID')} (≈ ${formatRp(idrNominal)})` : formatRp(selectedDebt.amount);
  }

  if (loading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600 mb-3" />
              <p className="text-xs font-bold text-slate-500">Memuat Data Tagihan...</p>
          </div>
      );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
          
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA ORANGE (#EA580C) & BILANO NAVY (#1D3E72) */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFF5ED] via-[#FEE9D8] to-[#FED7AA] flex flex-col relative z-10 border-b-2 border-orange-500">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(234,88,12,0.08)] flex items-center justify-between relative z-30 border-b border-orange-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            className="w-10 h-10 rounded-full bg-orange-600 hover:bg-orange-700 text-white shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            <p className="text-[10px] font-black text-orange-800 uppercase tracking-widest">
                                Arus Utang & Piutang
                            </p>
                        </div>
                        <h1 className="text-lg font-black text-slate-900 leading-tight">
                            Hutang & Piutang
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border-2 border-orange-200 text-orange-900 px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 text-[11px] font-black">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>KURS LIVE</span>
                    </div>
                </div>
            </div>

            {/* 2. HERO CARD DENGAN DUA TONE DINAMIS (ORANGE UNTUK HUTANG, NAVY UNTUK PIUTANG) */}
            <div className={`text-white p-5 rounded-[28px] shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4 transition-all duration-500 ${
                activeTab === 'hutang'
                    ? 'bg-gradient-to-br from-[#EA580C] via-[#C2410C] to-[#831843] border-l-[6px] border-l-brand-navy'
                    : 'bg-gradient-to-br from-[#1D3E72] via-[#1E40AF] to-[#0F2247] border-l-[6px] border-l-orange-500'
            }`}>
                {/* Watermark Icon */}
                {activeTab === 'hutang' ? (
                    <AlertCircle className="absolute -right-4 -bottom-4 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                ) : (
                    <HandCoins className="absolute -right-4 -bottom-4 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                )}
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20 backdrop-blur-xs flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-amber-200 fill-current" />
                            {activeTab === 'hutang' ? 'KEWAJIBAN PINJAMAN KAS' : 'HAK TAGIH PINJAMAN KAS'}
                        </span>

                        <span className="text-[10px] text-white/90 font-bold bg-black/30 px-2.5 py-0.5 rounded-full border border-white/20">
                            {filteredItems.filter((i: DebtItem) => !i.isPaid).length} Tagihan Aktif
                        </span>
                    </div>

                    <p className="text-[10px] font-bold text-orange-100 uppercase tracking-widest mb-0.5">
                        Total {activeTab === 'hutang' ? 'Kewajiban Hutang' : 'Piutang di Pihak Lain'}
                    </p>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2 tabular-nums">
                        {displayTotalDebt}
                    </h2>

                    <div className="flex items-center justify-between pt-2 border-t border-white/15 text-[10px] text-white/80 font-semibold">
                        <span>*Dikonversi otomatis ke IDR</span>
                        <span className="bg-white/20 px-2 py-0.5 rounded-md font-bold text-white">
                            {activeTab === 'hutang' ? 'Liabilitas' : 'Aset Lancar'}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-4 pb-20 bg-slate-50 flex flex-col gap-4">
            
            {/* PANDUAN PENTING ARUS KAS */}
            <div className="bg-white border-2 border-orange-200 rounded-[24px] p-4 shadow-[4px_4px_0px_0px] shadow-slate-900 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 leading-relaxed font-bold">
                        Halaman ini khusus pencatatan <strong>Pinjam Meminjam Kas</strong>.
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                        Untuk piutang dari invoice/penjualan atau hutang belanja rutin, catat langsung di:
                    </p>
                    <div className="flex gap-2 mt-2.5">
                        <Link href="/income">
                            <button className="text-[10px] font-black bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
                                Pemasukan <ArrowRight className="w-3 h-3" />
                            </button>
                        </Link>
                        <Link href="/expense">
                            <button className="text-[10px] font-black bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer">
                                Pengeluaran <ArrowRight className="w-3 h-3" />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* TAB SWITCHER DENGAN GAYA NEO-BRUTALIST */}
            <div className="bg-white p-1.5 rounded-[22px] border-2 border-orange-200 shadow-[4px_4px_0px_0px] shadow-slate-900 flex gap-1.5">
                <button 
                    onClick={() => setActiveTab('hutang')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'hutang' 
                            ? 'bg-orange-600 text-white shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-orange-600'
                    }`}
                >
                    <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
                    <span>HUTANG (PINJAMAN)</span>
                </button>

                <button 
                    onClick={() => setActiveTab('piutang')} 
                    className={`flex-1 py-3 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        activeTab === 'piutang' 
                            ? 'bg-[#1D3E72] text-white shadow-[2px_2px_0px_0px] shadow-slate-950 translate-x-[-1px] translate-y-[-1px]' 
                            : 'text-slate-600 hover:text-[#1D3E72]'
                    }`}
                >
                    <ArrowUpRight className="w-4 h-4 stroke-[3]" />
                    <span>PIUTANG (HAK KITA)</span>
                </button>
            </div>

            {/* TOMBOL BUKA FORM ATAU CARD FORMULIR */}
            {!isFormOpen ? (
                <button 
                    onClick={() => setIsFormOpen(true)} 
                    className={`w-full h-14 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-[4px_4px_0px_0px] shadow-slate-900 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        activeTab === 'hutang' 
                            ? 'bg-orange-600 hover:bg-orange-700' 
                            : 'bg-[#1D3E72] hover:bg-[#152e55]'
                    }`}
                >
                    <Plus className="w-5 h-5 stroke-[3]" />
                    <span>CATAT {activeTab === 'hutang' ? 'HUTANG PINJAMAN' : 'PIUTANG BARU'}</span>
                </button>
            ) : (
                <div className="bg-white p-5 rounded-[28px] shadow-[6px_6px_0px_0px] shadow-slate-900 border-2 border-orange-200 animate-in zoom-in-95">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${activeTab === 'hutang' ? 'bg-orange-600' : 'bg-[#1D3E72]'}`}></span>
                            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider">
                                Form Catat {activeTab === 'hutang' ? 'Hutang' : 'Piutang'}
                            </h3>
                        </div>
                        {!isSubmitting && (
                            <button 
                                onClick={() => setIsFormOpen(false)} 
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="space-y-3.5">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Nama Pihak Terkait (Wajib)
                            </label>
                            <Input 
                                disabled={isSubmitting} 
                                placeholder="Contoh: Bank BCA, Budi, PT Sukses..." 
                                value={name} 
                                onChange={e => setName(e.target.value)} 
                                className="h-13 rounded-2xl bg-slate-50 border-2 border-slate-200 font-bold text-sm text-slate-800 focus:border-orange-600"
                            />
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Nominal & Mata Uang
                            </label>
                            <div className="flex gap-2">
                                <select 
                                    disabled={isSubmitting} 
                                    value={currency} 
                                    onChange={e => setCurrency(e.target.value)} 
                                    className="w-24 px-3 bg-orange-50 text-orange-800 font-black border-2 border-orange-200 rounded-2xl outline-none text-xs"
                                >
                                    <option value="IDR">IDR (Rp)</option>
                                    {availableCurrencies.filter(c => c !== 'IDR').map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <Input 
                                    disabled={isSubmitting} 
                                    type="text" 
                                    inputMode="decimal" 
                                    placeholder="0" 
                                    value={amount} 
                                    onChange={e => setAmount(formatNum(e.target.value, currency !== 'IDR'))} 
                                    className="flex-1 h-13 rounded-2xl bg-slate-50 border-2 border-slate-200 font-black text-lg text-slate-800 focus:border-orange-600"
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Tenggat Waktu Jatuh Tempo
                            </label>
                            <Input 
                                disabled={isSubmitting} 
                                type="date" 
                                value={dueDate} 
                                onChange={e => setDueDate(e.target.value)} 
                                className="h-13 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs font-bold text-slate-800 w-full block focus:border-orange-600"
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                                Catatan / Keterangan (Opsional)
                            </label>
                            <Input 
                                disabled={isSubmitting} 
                                placeholder="Contoh: Pinjaman modal usaha, talangan..." 
                                value={desc} 
                                onChange={e => setDesc(e.target.value)} 
                                className="h-13 rounded-2xl bg-slate-50 border-2 border-slate-200 text-xs font-bold text-slate-800 focus:border-orange-600"
                            />
                        </div>
                        
                        <button 
                            type="button"
                            onClick={handleAdd} 
                            disabled={isSubmitting} 
                            className={`w-full h-13 rounded-2xl font-black text-xs uppercase tracking-wider text-white shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 ${
                                activeTab === 'hutang' 
                                    ? 'bg-orange-600 hover:bg-orange-700' 
                                    : 'bg-[#1D3E72] hover:bg-[#152e55]'
                            }`}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SIMPAN CATATAN"}
                        </button>
                    </div>
                </div>
            )}

            {/* DAFTAR KARTU TAGIHAN AKTIF */}
            <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center px-1">
                    <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'hutang' ? 'bg-orange-600' : 'bg-[#1D3E72]'}`}></span>
                        Daftar {activeTab === 'hutang' ? 'Hutang' : 'Piutang'} ({filteredItems.length})
                    </h3>
                </div>

                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-[28px] border-2 border-dashed border-slate-200 shadow-sm p-6">
                        <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <h4 className="font-black text-slate-800 text-sm">Tidak Ada {activeTab === 'hutang' ? 'Hutang' : 'Piutang'}</h4>
                        <p className="text-slate-400 text-xs font-medium mt-1">
                            Semua catatan {activeTab} telah lunas atau belum pernah ditambahkan.
                        </p>
                    </div>
                ) : (
                    filteredItems.map((item: DebtItem) => {
                        const parts = (item.name || "").split('|');
                        const displayName = parts[0];
                        const curr = parts[1] || 'IDR';
                        const rate = curr === 'IDR' ? 1 : (activeRates[curr] || 1);
                        const isForeign = curr !== 'IDR';
                        const totalIDR = item.amount * rate;

                        const isCicilan = item.description?.includes('(Sisa dari');
                        const isProcessing = isPaying && selectedDebt?.id === item.id;
                        
                        const isWrittenOff = txs.some((t: any) => 
                            t.description?.includes(`[WRITE_OFF] ${item.name}`)
                        );

                        const cleanDisplayDesc = item.description ? item.description.replace('[PIUTANG_PENDAPATAN]', '').trim() : "";

                        return (
                            <div 
                                key={item.id} 
                                className={`bg-white p-4 sm:p-5 rounded-[24px] border-2 shadow-[4px_4px_0px_0px] shadow-slate-900 flex justify-between items-center gap-3 transition-all ${
                                    item.isPaid 
                                        ? 'opacity-60 border-slate-200 bg-slate-50/70' 
                                        : (activeTab === 'hutang' ? 'border-orange-200/90' : 'border-blue-200/90')
                                }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                                            item.isPaid 
                                                ? (isWrittenOff ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300')
                                                : (isCicilan ? 'bg-amber-100 text-amber-800 border-amber-300' : (activeTab === 'hutang' ? 'bg-orange-100 text-orange-800 border-orange-300' : 'bg-blue-100 text-blue-800 border-blue-300'))
                                        }`}>
                                            {item.isPaid ? (isWrittenOff ? (activeTab === 'piutang' ? 'DI-IKHLASKAN' : 'PEMUTIHAN') : 'LUNAS') : (isCicilan ? 'DICICIL' : 'BELUM LUNAS')}
                                        </span>
                                        <h4 className="font-black text-slate-900 text-sm truncate">
                                            {displayName}
                                        </h4>
                                    </div>
                                    
                                    <div className="mt-1">
                                        {isForeign ? (
                                            <>
                                                <p className={`font-black text-base sm:text-lg ${item.isPaid ? 'text-slate-400 line-through' : (activeTab === 'hutang' ? 'text-orange-700' : 'text-blue-900')}`}>
                                                    {curr} {item.amount.toLocaleString('id-ID')}
                                                </p>
                                                <p className="text-[11px] font-bold text-slate-500">≈ {formatRp(totalIDR)}</p>
                                            </>
                                        ) : (
                                            <p className={`font-black text-base sm:text-lg tabular-nums ${item.isPaid ? 'text-slate-400 line-through' : (activeTab === 'hutang' ? 'text-orange-700' : 'text-blue-900')}`}>
                                                {formatRp(item.amount)}
                                            </p>
                                        )}
                                    </div>

                                    <div className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5 mt-2 flex-wrap">
                                        <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md">
                                            <Calendar className="w-3 h-3 text-slate-400" />
                                            Tempo: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : "-"}
                                        </span>
                                        {cleanDisplayDesc && (
                                            <span className="text-slate-400 truncate max-w-[140px]">
                                                • {cleanDisplayDesc}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Tombol Aksi Kanan */}
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    {!item.isPaid ? (
                                        <>
                                            <button 
                                                onClick={() => { setSelectedDebt(item); setPayModalOpen(true); }} 
                                                disabled={isPaying} 
                                                className={`px-3.5 py-2 rounded-xl text-white font-black text-[10px] uppercase tracking-wider shadow-[2px_2px_0px_0px] shadow-slate-900 active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                                    activeTab === 'hutang' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-[#1D3E72] hover:bg-[#152e55]'
                                                }`}
                                            >
                                                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                                <span>{activeTab === 'hutang' ? 'Bayar' : 'Tagih'}</span>
                                            </button>
                                            
                                            <button 
                                                onClick={() => handleWriteOff(item)} 
                                                disabled={isPaying} 
                                                className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer" 
                                                title={activeTab === 'piutang' ? 'Ikhlaskan (Rugi)' : 'Pemutihan (Untung)'}
                                            >
                                                <HeartCrack className="w-3 h-3 text-rose-500" />
                                                <span>{activeTab === 'piutang' ? 'Ikhlas' : 'Putih'}</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => handleRestore(item.id)} 
                                            disabled={isPaying} 
                                            className="px-3 py-1.5 bg-slate-100 hover:bg-orange-100 text-slate-700 hover:text-orange-900 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer border border-slate-200"
                                        >
                                            <RefreshCw className="w-3 h-3" />
                                            <span>Pulih</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 💳 MODAL PELUNASAN / CICILAN TAGIHAN */}
      {/* ========================================================================= */}
      {payModalOpen && selectedDebt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative border-4 border-orange-500 text-center animate-in zoom-in-95">
                  {!isPaying && (
                      <button 
                          onClick={() => { setPayModalOpen(false); setPayAmount(""); setSelectedDebt(null); }} 
                          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
                      >
                          <X className="w-4 h-4" />
                      </button>
                  )}

                  <div className="w-14 h-14 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                      <Wallet className="w-7 h-7" />
                  </div>

                  <h3 className="text-lg font-black text-slate-900 mb-1">
                      {activeTab === 'hutang' ? 'Bayar Hutang / Cicilan' : 'Terima Pembayaran Piutang'}
                  </h3>
                  
                  <p className="text-xs text-slate-500 font-semibold mb-4">
                      Sisa Tagihan: <span className="font-black text-orange-700">{modalSisaTagihanUI}</span>
                  </p>
                  
                  <div className="mb-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                          Nominal Bayar ({isPayForeign ? selectedDebt.name.split('|')[1] : 'Rp'})
                      </label>
                      <Input 
                          disabled={isPaying} 
                          type="text" 
                          inputMode="decimal" 
                          placeholder="Kosongkan jika bayar lunas penuh" 
                          value={payAmount} 
                          onChange={e => setPayAmount(formatNum(e.target.value, isPayForeign))} 
                          className="h-14 font-black text-xl text-center bg-orange-50 border-2 border-orange-200 rounded-2xl text-slate-900 focus:border-orange-600"
                      />
                  </div>
                  
                  <button 
                      type="button"
                      onClick={handlePay} 
                      disabled={isPaying} 
                      className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                      {isPaying ? <Loader2 className="w-5 h-5 animate-spin" /> : "KONFIRMASI PEMBAYARAN"}
                  </button>
              </div>
          </div>
      )}

      {/* POPUP PEMILIHAN SUMBER DANA */}
      {showSourcePopup && (
          <SourceSelectionPopup 
              type={
                  pendingAction === 'add' 
                      ? (activeTab === 'hutang' ? 'income' : 'expense') 
                      : (activeTab === 'hutang' ? 'expense' : 'income')
              }
              title={
                  pendingAction === 'add'
                      ? (activeTab === 'hutang' ? 'Pilih Dompet Penerima Utang' : 'Pilih Dompet Pengirim Piutang')
                      : (activeTab === 'hutang' ? 'Pilih Dompet Untuk Membayar' : 'Pilih Dompet Penerima Cicilan')
              }
              onCancel={() => {
                  setShowSourcePopup(false);
                  setPendingAction(null);
              }}
              onSelect={(src) => {
                  setShowSourcePopup(false);
                  if (pendingAction === 'add') {
                      executeAdd(src);
                  } else if (pendingAction === 'pay') {
                      executePay(src);
                  }
                  setPendingAction(null);
              }}
          />
      )}
    </MobileLayout>
  );
}