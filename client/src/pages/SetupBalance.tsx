import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Wallet, Plus, Trash2, ChevronDown, Check, Loader2, ArrowRight, TrendingUp, HandCoins, Users, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";

// Constants
const SOURCES = [
  "Cash (Uang Kertas)",
  "BCA", "Mandiri", "BNI", "BRI", "BSI",
  "GoPay", "OVO", "DANA", "ShopeePay", "LinkAja",
  "RDN", "Stockbit", "Pluang", "Ajaib", "Bareksa", "Bibit"
];

const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "JPY", "GBP", "AUD", "MYR", "CNY"];

interface WalletEntry {
  id: string;
  source: string;
  isCustomSource: boolean;
  currency: string;
  amount: string;
}

interface InvestmentEntry {
  id: string;
  name: string;
  quantity: string;
  avgPrice: string;
  broker: string;
  isCustomBroker: boolean;
}

interface DebtEntry {
  id: string;
  name: string;
  amount: string;
  notes: string;
}

interface SubEntry {
  id: string;
  name: string;
  cost: string;
  cycle: string;
  nextBilling: string;
  source: string;
}

// Helpers
const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

export default function SetupBalance() {
  // Global Step Tracker
  const [step, setStep] = useState(0);
  const { toast } = useToast();

  // ==========================================
  // STEP 0: SALDO AWAL
  // ==========================================
  const [entries, setEntries] = useState<WalletEntry[]>([
    { id: Date.now().toString(), source: "Cash (Uang Kertas)", isCustomSource: false, currency: "IDR", amount: "" }
  ]);
  const [isSubmittingBalance, setIsSubmittingBalance] = useState(false);

  const handleAddEntry = () => {
    setEntries([...entries, { id: Date.now().toString(), source: "BCA", isCustomSource: false, currency: "IDR", amount: "" }]);
  };
  const handleRemoveEntry = (id: string) => { setEntries(entries.filter(e => e.id !== id)); };
  const updateEntry = (id: string, field: keyof WalletEntry, value: any) => {
    setEntries(entries.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        if (field === 'source' && value === 'custom') {
          updated.isCustomSource = true;
          updated.source = '';
        }
        return updated;
      }
      return e;
    }));
  };
  const handleAmountChange = (id: string, value: string) => updateEntry(id, 'amount', formatNumber(value));

  const totalIDR = useMemo(() => {
    return entries.filter(e => e.currency === 'IDR').reduce((sum, e) => sum + (parseNumber(e.amount) || 0), 0);
  }, [entries]);

  const handleSubmitBalance = async () => {
    const invalidEntries = entries.filter(e => !e.source.trim());
    if (invalidEntries.length > 0) {
      toast({ title: "Form Belum Lengkap", description: "Pastikan semua sumber terisi.", variant: "destructive" });
      return;
    }

    setIsSubmittingBalance(true);
    try {
      const forexList = entries
        .filter(e => e.currency !== 'IDR' && parseNumber(e.amount) > 0)
        .map(e => ({ currency: e.currency, amount: parseNumber(e.amount) }));

      localStorage.setItem("bilano_initial_sources", JSON.stringify(entries));
      const userEmail = localStorage.getItem("bilano_email") || "";

      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({
          setCashBalance: totalIDR,
          initialForexList: forexList,
        })
      });

      if (!res.ok) throw new Error("Gagal menyimpan saldo");
      trackEvent("initial_balance_setup", { totalIDR, forexCount: forexList.length });
      
      setIsSubmittingBalance(false);
      setStep(1); // Lanjut ke pertanyaan investasi
    } catch (e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message || "Gagal menghubungi server", variant: "destructive" });
      setIsSubmittingBalance(false);
    }
  };

  // ==========================================
  // STEP 1: INVESTASI ASET
  // ==========================================
  const [invViewState, setInvViewState] = useState<'question' | 'form'>('question');
  const [investments, setInvestments] = useState<InvestmentEntry[]>([
    { id: Date.now().toString(), name: "", quantity: "", avgPrice: "", broker: "", isCustomBroker: false }
  ]);
  const [isSubmittingInv, setIsSubmittingInv] = useState(false);

  // Derive broker list dynamically from Step 0 sources
  const availableBrokers = useMemo(() => {
    const sources = entries.map(e => e.source).filter(s => s.trim() !== "" && s !== "Cash (Uang Kertas)");
    const unique = Array.from(new Set(sources));
    if (unique.length === 0) return ["BCA Sekuritas", "Stockbit", "Pluang", "Ajaib", "Bareksa"];
    return unique;
  }, [entries]);

  const handleAnswerInv = (hasAsset: boolean) => {
    if (hasAsset) {
      setInvestments([{ ...investments[0], broker: availableBrokers[0] }]);
      setInvViewState('form'); // Memicu animasi transisi form masuk
    } else {
      setStep(2); // Lanjut ke Prompt 3
    }
  };

  const handleAddInv = () => {
    setInvestments([...investments, { id: Date.now().toString(), name: "", quantity: "", avgPrice: "", broker: availableBrokers[0], isCustomBroker: false }]);
  };
  const handleRemoveInv = (id: string) => { setInvestments(investments.filter(e => e.id !== id)); };
  const updateInv = (id: string, field: keyof InvestmentEntry, value: any) => {
    setInvestments(investments.map(e => {
      if (e.id === id) {
        const updated = { ...e, [field]: value };
        if (field === 'broker' && value === 'custom') {
          updated.isCustomBroker = true;
          updated.broker = '';
        }
        return updated;
      }
      return e;
    }));
  };

  const handleSubmitInv = async () => {
    const invalid = investments.filter(i => !i.name.trim() || !i.quantity.trim() || !i.avgPrice.trim() || !i.broker.trim());
    if (invalid.length > 0) {
      toast({ title: "Data Belum Lengkap", description: "Pastikan semua nama aset, kuantitas, harga, dan sekuritas terisi.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingInv(true);
    try {
      const initialInvestments = investments.map(i => ({
          symbol: i.name.toUpperCase(),
          quantity: parseFloat(i.quantity.replace(/,/g, '.')),
          price: parseNumber(i.avgPrice),
          type: 'saham',
          broker: i.broker // Bisa disimpan/digunakan di alur Jual Beli (Prompt 12)
      }));

      const userEmail = localStorage.getItem("bilano_email") || "";
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({
          addCurrentCash: 0,
          initialInvestments: initialInvestments
        })
      });

      if (!res.ok) throw new Error("Gagal menyimpan portofolio");
      trackEvent("initial_investment_setup", { count: initialInvestments.length });
      
      setIsSubmittingInv(false);
      setStep(2);
    } catch(e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message || "Gagal menghubungi server", variant: "destructive" });
      setIsSubmittingInv(false);
    }
  };

  // ==========================================
  // STEP 2: UTANG PERSONAL
  // ==========================================
  const [debtViewState, setDebtViewState] = useState<'question' | 'form'>('question');
  const [debts, setDebts] = useState<DebtEntry[]>([
    { id: Date.now().toString(), name: "", amount: "", notes: "" }
  ]);
  const [isSubmittingDebt, setIsSubmittingDebt] = useState(false);

  const handleAnswerDebt = (hasDebt: boolean) => {
    if (hasDebt) setDebtViewState('form');
    else setStep(3); // Langsung ke piutang
  };

  const handleAddDebt = () => setDebts([...debts, { id: Date.now().toString(), name: "", amount: "", notes: "" }]);
  const handleRemoveDebt = (id: string) => setDebts(debts.filter(d => d.id !== id));
  const updateDebt = (id: string, field: keyof DebtEntry, value: string) => {
    setDebts(debts.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleSubmitDebt = async () => {
    const invalid = debts.filter(d => !d.name.trim() || !d.amount.trim());
    if (invalid.length > 0) {
      toast({ title: "Data Belum Lengkap", description: "Pastikan nama pemberi pinjaman dan nominal terisi.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingDebt(true);
    try {
      const initialDebts = debts.map(d => ({
          name: d.name,
          amount: parseNumber(d.amount)
      }));

      const userEmail = localStorage.getItem("bilano_email") || "";
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({ addCurrentCash: 0, initialDebts })
      });

      if (!res.ok) throw new Error("Gagal menyimpan utang");
      trackEvent("initial_debt_setup", { count: initialDebts.length });
      
      setIsSubmittingDebt(false);
      setStep(3);
    } catch(e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message || "Gagal menghubungi server", variant: "destructive" });
      setIsSubmittingDebt(false);
    }
  };

  // ==========================================
  // STEP 3: PIUTANG PERSONAL
  // ==========================================
  const [recViewState, setRecViewState] = useState<'question' | 'form'>('question');
  const [receivables, setReceivables] = useState<DebtEntry[]>([
    { id: Date.now().toString(), name: "", amount: "", notes: "" }
  ]);
  const [isSubmittingRec, setIsSubmittingRec] = useState(false);

  const handleAnswerRec = (hasRec: boolean) => {
    if (hasRec) setRecViewState('form');
    else setStep(4);
  };

  const handleAddRec = () => setReceivables([...receivables, { id: Date.now().toString(), name: "", amount: "", notes: "" }]);
  const handleRemoveRec = (id: string) => setReceivables(receivables.filter(r => r.id !== id));
  const updateRec = (id: string, field: keyof DebtEntry, value: string) => {
    setReceivables(receivables.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSubmitRec = async () => {
    const invalid = receivables.filter(r => !r.name.trim() || !r.amount.trim());
    if (invalid.length > 0) {
      toast({ title: "Data Belum Lengkap", description: "Pastikan nama peminjam dan nominal terisi.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingRec(true);
    try {
      const initialReceivables = receivables.map(r => ({
          name: r.name,
          amount: parseNumber(r.amount)
      }));

      const userEmail = localStorage.getItem("bilano_email") || "";
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({ addCurrentCash: 0, initialReceivables })
      });

      if (!res.ok) throw new Error("Gagal menyimpan piutang");
      trackEvent("initial_rec_setup", { count: initialReceivables.length });
      
      setIsSubmittingRec(false);
      setStep(4); // Lanjut ke prompt 4
    } catch(e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message || "Gagal menghubungi server", variant: "destructive" });
      setIsSubmittingRec(false);
    }
  };

  // ==========================================
  // STEP 4: LANGGANAN / TAGIHAN
  // ==========================================
  const [subViewState, setSubViewState] = useState<'question' | 'form'>('question');
  const [subscriptions, setSubscriptions] = useState<SubEntry[]>([
    { id: Date.now().toString(), name: "", cost: "", cycle: "bulanan", nextBilling: "", source: "" }
  ]);
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Re-use availableBrokers logic for sources, or use entries directly
  const availableSources = useMemo(() => {
    const sources = entries.map(e => e.source).filter(s => s.trim() !== "");
    const unique = Array.from(new Set(sources));
    return unique.length > 0 ? unique : ["Cash (Uang Kertas)", "BCA"];
  }, [entries]);

  const handleAnswerSub = (hasSub: boolean) => {
    if (hasSub) {
      setSubscriptions([{ ...subscriptions[0], source: availableSources[0] }]);
      setSubViewState('form');
    } else {
      setStep(5); // Selesai / Home
    }
  };

  const handleAddSub = () => setSubscriptions([...subscriptions, { id: Date.now().toString(), name: "", cost: "", cycle: "bulanan", nextBilling: "", source: availableSources[0] }]);
  const handleRemoveSub = (id: string) => setSubscriptions(subscriptions.filter(s => s.id !== id));
  const updateSub = (id: string, field: keyof SubEntry, value: string) => {
    setSubscriptions(subscriptions.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmitSub = async () => {
    const invalid = subscriptions.filter(s => !s.name.trim() || !s.cost.trim());
    if (invalid.length > 0) {
      toast({ title: "Data Belum Lengkap", description: "Pastikan nama langganan dan nominal terisi.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingSub(true);
    try {
      const initialSubscriptions = subscriptions.map(s => ({
          name: s.source ? `${s.name} (${s.source})` : s.name, // Append source to name since schema lacks source col
          cost: parseNumber(s.cost),
          cycle: s.cycle,
          nextBilling: s.nextBilling
      }));

      const userEmail = localStorage.getItem("bilano_email") || "";
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({ addCurrentCash: 0, initialSubscriptions })
      });

      if (!res.ok) throw new Error("Gagal menyimpan langganan");
      trackEvent("initial_sub_setup", { count: initialSubscriptions.length });
      
      setIsSubmittingSub(false);
      setStep(5); // Selesai
    } catch(e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message || "Gagal menghubungi server", variant: "destructive" });
      setIsSubmittingSub(false);
    }
  };


  return (
    <MobileLayout title={step === 0 ? "Saldo Awal" : step === 1 ? "Aset Portofolio" : "Langkah Selanjutnya"} showBack>
      
      {/* ========================================================
          RENDER STEP 0: SALDO AWAL (PROMPT 1)
          ======================================================== */}
      {step === 0 && (
        <div className="space-y-6 pt-4 px-2 pb-32 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-gradient-to-br from-[#0a1128] to-[#121c3a] p-8 rounded-[32px] text-white text-center shadow-xl border border-blue-500/20 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
            <div className="absolute -left-4 -bottom-4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Wallet className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black mb-2 tracking-tight">Kumpulkan Kekuatanmu</h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-[250px] mx-auto">
                Berapa uang yang kamu miliki saat ini? Masukkan dari semua rekening, dompet digital, & tunai.
              </p>
            </div>
          </div>

          <div className="sticky top-2 z-40 bg-white/90 backdrop-blur-xl p-5 rounded-[28px] shadow-[0_8px_30px_rgb(15,23,42,0.06)] border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Kas Utama (IDR)</p>
              <h3 className="text-2xl font-black text-slate-800">{formatRp(totalIDR)}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shrink-0">
              <Check className="w-6 h-6" strokeWidth={3} />
            </div>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
                <div className="absolute -top-3 left-5 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Sumber {index + 1}
                </div>
                {entries.length > 1 && (
                  <button onClick={() => handleRemoveEntry(entry.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nama Sumber Uang</label>
                    {!entry.isCustomSource ? (
                      <div className="relative">
                        <select
                          value={entry.source}
                          onChange={(e) => updateEntry(entry.id, 'source', e.target.value)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl h-14 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="custom">+ Ketik Manual (Lainnya)</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    ) : (
                      <Input placeholder="Ketik nama sumber..." value={entry.source} onChange={(e) => updateEntry(entry.id, 'source', e.target.value)} className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-bold text-sm" autoFocus />
                    )}
                  </div>
                  <div className="flex gap-3">
                    <div className="w-2/5">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Mata Uang</label>
                      <div className="relative">
                        <select
                          value={entry.currency}
                          onChange={(e) => updateEntry(entry.id, 'currency', e.target.value)}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl h-14 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        >
                          {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nominal</label>
                      <Input type="tel" placeholder="0" value={entry.amount} onChange={(e) => handleAmountChange(entry.id, e.target.value)} className="h-14 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl focus:border-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={handleAddEntry} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-[24px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95">
            <Plus className="w-5 h-5" /> TAMBAH SUMBER LAIN
          </button>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
            <div className="max-w-md mx-auto">
              <Button onClick={handleSubmitBalance} disabled={isSubmittingBalance} className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all">
                {isSubmittingBalance ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">LANJUTKAN <ArrowRight className="w-4 h-4" /></span>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RENDER STEP 1: INVESTASI ASET (PROMPT 2)
          ======================================================== */}
      {step === 1 && (
        <div className="relative w-full min-h-[80vh] overflow-hidden pt-4 px-2 pb-32">
          
          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center h-[70vh] ${
            invViewState === 'question' ? 'translate-y-0 opacity-100 relative' : '-translate-y-[100%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/30">
              <TrendingUp className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 text-center leading-tight">Kamu ada berinvestasi<br/>ke suatu aset?</h2>
            <p className="text-slate-500 text-center mb-10 text-sm max-w-[260px] leading-relaxed">
              Seperti saham, reksa dana, crypto, atau emas yang ingin terus kamu pantau pergerakannya.
            </p>

            <div className="w-full max-w-sm space-y-4 px-4 mt-8">
              <button 
                onClick={() => handleAnswerInv(true)} 
                className="w-full h-16 bg-brand-navy text-white font-black text-[15px] rounded-full shadow-[5px_5px_0px_0px] shadow-slate-900 active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center"
              >
                YA, SAYA PUNYA
              </button>
              <button 
                onClick={() => handleAnswerInv(false)} 
                className="w-full h-14 bg-white border-2 border-slate-200 text-slate-500 font-black text-[13px] rounded-full hover:bg-slate-50 transition-all shadow-[3px_3px_0px_0px] shadow-slate-200 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px]"
              >
                TIDAK ADA ASET
              </button>
            </div>
          </div>

          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            invViewState === 'form' ? 'translate-y-0 opacity-100 relative' : 'translate-y-[150%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            
            <div className="bg-brand-navy p-6 rounded-[24px] shadow-[8px_8px_0px_0px] shadow-slate-900 border-l-[6px] border-brand-gold text-white text-center relative overflow-hidden mb-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">Daftar Aset Investasi</h2>
                <p className="text-sm text-blue-100 max-w-[250px] mx-auto leading-relaxed font-medium">
                  Catat semua aset agar kekayaan bersihmu akurat.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {investments.map((inv, index) => (
                <div key={inv.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
                  <div className="absolute -top-3 left-5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Aset {index + 1}
                  </div>
                  
                  {investments.length > 1 && (
                    <button onClick={() => handleRemoveInv(inv.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="mt-3 space-y-4">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nama / Kode Aset</label>
                        <Input 
                          placeholder="BBCA / BTC" 
                          value={inv.name} 
                          onChange={(e) => updateInv(inv.id, 'name', e.target.value)}
                          className="h-14 font-black text-lg bg-slate-50 border-slate-200 rounded-2xl focus:border-indigo-500 uppercase placeholder:normal-case"
                        />
                      </div>
                      <div className="w-1/3">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Kuantitas</label>
                        <Input 
                          type="tel"
                          placeholder="0.00" 
                          value={inv.quantity} 
                          onChange={(e) => updateInv(inv.id, 'quantity', e.target.value)}
                          className="h-14 font-black text-lg bg-slate-50 border-slate-200 rounded-2xl focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Harga Beli Rata-rata (Avg Price) per Unit</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 font-bold text-slate-400">Rp</span>
                        <Input 
                          type="tel"
                          placeholder="0" 
                          value={inv.avgPrice} 
                          onChange={(e) => updateInv(inv.id, 'avgPrice', formatNumber(e.target.value))}
                          className="h-14 pl-12 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Sekuritas / Platform (Tempat Penyimpanan)</label>
                      {!inv.isCustomBroker ? (
                        <div className="relative">
                          <select
                            value={inv.broker}
                            onChange={(e) => updateInv(inv.id, 'broker', e.target.value)}
                            className="w-full appearance-none bg-indigo-50 border border-indigo-100 text-indigo-800 text-sm font-bold rounded-2xl h-14 px-4 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                          >
                            {availableBrokers.map(b => <option key={b} value={b}>{b}</option>)}
                            <option value="custom">+ Ketik Manual Platform Lainnya</option>
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                        </div>
                      ) : (
                        <Input 
                          placeholder="Ketik nama aplikasi/sekuritas..."
                          value={inv.broker}
                          onChange={(e) => updateInv(inv.id, 'broker', e.target.value)}
                          className="h-14 bg-indigo-50 border-indigo-100 rounded-2xl font-bold text-sm text-indigo-800"
                          autoFocus
                        />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddInv} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-indigo-200 text-indigo-500 font-bold rounded-[24px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 mt-4">
              <Plus className="w-5 h-5" /> TAMBAH ASET LAIN
            </button>
            
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
              <div className="max-w-md mx-auto">
                <Button onClick={handleSubmitInv} disabled={isSubmittingInv} className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all">
                  {isSubmittingInv ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">SIMPAN PORTOFOLIO <ArrowRight className="w-4 h-4" /></span>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RENDER STEP 2: UTANG PERSONAL (PROMPT 3)
          ======================================================== */}
      {step === 2 && (
        <div className="relative w-full min-h-[80vh] overflow-hidden pt-4 px-2 pb-32">
          
          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center h-[70vh] ${
            debtViewState === 'question' ? 'translate-y-0 opacity-100 relative' : '-translate-y-[100%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            <div className="w-24 h-24 bg-gradient-to-br from-rose-500 to-red-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-rose-500/30">
              <HandCoins className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 text-center leading-tight">Apakah kamu punya<br/>utang ke orang lain?</h2>
            <p className="text-slate-500 text-center mb-10 text-sm max-w-[260px] leading-relaxed">
              Utang personal (uang milik orang/teman yang kamu pegang atau pinjam). 
            </p>

            <div className="w-full max-w-sm space-y-4 px-4 mt-8">
              <button 
                onClick={() => handleAnswerDebt(true)} 
                className="w-full h-16 bg-brand-navy text-white font-black text-[15px] rounded-full shadow-[5px_5px_0px_0px] shadow-slate-900 active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center"
              >
                YA, SAYA PUNYA
              </button>
              <button 
                onClick={() => handleAnswerDebt(false)} 
                className="w-full h-14 bg-white border-2 border-slate-200 text-slate-500 font-black text-[13px] rounded-full hover:bg-slate-50 transition-all shadow-[3px_3px_0px_0px] shadow-slate-200 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px]"
              >
                TIDAK ADA
              </button>
            </div>
          </div>

          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            debtViewState === 'form' ? 'translate-y-0 opacity-100 relative' : 'translate-y-[150%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            
            <div className="bg-brand-navy p-6 rounded-[24px] shadow-[8px_8px_0px_0px] shadow-slate-900 border-l-[6px] border-brand-gold text-white text-center relative overflow-hidden mb-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">Daftar Utang</h2>
                <p className="text-sm text-blue-100 max-w-[250px] mx-auto leading-relaxed font-medium">
                  Uang teman/saudara yang perlu kamu kembalikan nanti.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {debts.map((debt, index) => (
                <div key={debt.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
                  <div className="absolute -top-3 left-5 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Utang {index + 1}
                  </div>
                  
                  {debts.length > 1 && (
                    <button onClick={() => handleRemoveDebt(debt.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="mt-3 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nama Pemberi Pinjaman</label>
                      <Input 
                        placeholder="Misal: Budi / Kakak" 
                        value={debt.name} 
                        onChange={(e) => updateDebt(debt.id, 'name', e.target.value)}
                        className="h-14 font-bold text-base bg-slate-50 border-slate-200 rounded-2xl focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nominal Utang</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 font-bold text-slate-400">Rp</span>
                        <Input 
                          type="tel"
                          placeholder="0" 
                          value={debt.amount} 
                          onChange={(e) => updateDebt(debt.id, 'amount', formatNumber(e.target.value))}
                          className="h-14 pl-12 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl focus:border-rose-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Catatan Tambahan (Opsional)</label>
                      <Input 
                        placeholder="Misal: Janji bayar bulan depan" 
                        value={debt.notes} 
                        onChange={(e) => updateDebt(debt.id, 'notes', e.target.value)}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddDebt} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-rose-200 text-rose-500 font-bold rounded-[24px] hover:border-rose-400 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95 mt-4">
              <Plus className="w-5 h-5" /> TAMBAH UTANG LAIN
            </button>
            
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
              <div className="max-w-md mx-auto">
                <Button onClick={handleSubmitDebt} disabled={isSubmittingDebt} className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all">
                  {isSubmittingDebt ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">SIMPAN UTANG <ArrowRight className="w-4 h-4" /></span>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          RENDER STEP 3: PIUTANG PERSONAL (PROMPT 3)
          ======================================================== */}
      {step === 3 && (
        <div className="relative w-full min-h-[80vh] overflow-hidden pt-4 px-2 pb-32">
          
          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center h-[70vh] ${
            recViewState === 'question' ? 'translate-y-0 opacity-100 relative' : '-translate-y-[100%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/30">
              <Users className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 text-center leading-tight">Apakah ada orang<br/>yang berutang kepadamu?</h2>
            <p className="text-slate-500 text-center mb-10 text-sm max-w-[260px] leading-relaxed">
              Catat piutangmu di sini (uangmu yang dipinjam oleh orang lain).
            </p>

            <div className="w-full max-w-sm space-y-4 px-4 mt-8">
              <button 
                onClick={() => handleAnswerRec(true)} 
                className="w-full h-16 bg-brand-navy text-white font-black text-[15px] rounded-full shadow-[5px_5px_0px_0px] shadow-slate-900 active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center"
              >
                YA, ADA
              </button>
              <button 
                onClick={() => handleAnswerRec(false)} 
                className="w-full h-14 bg-white border-2 border-slate-200 text-slate-500 font-black text-[13px] rounded-full hover:bg-slate-50 transition-all shadow-[3px_3px_0px_0px] shadow-slate-200 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px]"
              >
                TIDAK ADA
              </button>
            </div>
          </div>

          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            recViewState === 'form' ? 'translate-y-0 opacity-100 relative' : 'translate-y-[150%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            
            <div className="bg-brand-navy p-6 rounded-[24px] shadow-[8px_8px_0px_0px] shadow-slate-900 border-l-[6px] border-brand-gold text-white text-center relative overflow-hidden mb-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">Daftar Piutang</h2>
                <p className="text-sm text-blue-100 max-w-[250px] mx-auto leading-relaxed font-medium">
                  Uang milikmu yang sedang dipinjam atau dipegang orang lain.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {receivables.map((rec, index) => (
                <div key={rec.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
                  <div className="absolute -top-3 left-5 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Piutang {index + 1}
                  </div>
                  
                  {receivables.length > 1 && (
                    <button onClick={() => handleRemoveRec(rec.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="mt-3 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nama Peminjam</label>
                      <Input 
                        placeholder="Misal: Andi / Koperasi" 
                        value={rec.name} 
                        onChange={(e) => updateRec(rec.id, 'name', e.target.value)}
                        className="h-14 font-bold text-base bg-slate-50 border-slate-200 rounded-2xl focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nominal Piutang</label>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 font-bold text-slate-400">Rp</span>
                        <Input 
                          type="tel"
                          placeholder="0" 
                          value={rec.amount} 
                          onChange={(e) => updateRec(rec.id, 'amount', formatNumber(e.target.value))}
                          className="h-14 pl-12 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Catatan Tambahan (Opsional)</label>
                      <Input 
                        placeholder="Misal: Janji bayar bulan depan" 
                        value={rec.notes} 
                        onChange={(e) => updateRec(rec.id, 'notes', e.target.value)}
                        className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-medium text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddRec} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-emerald-200 text-emerald-500 font-bold rounded-[24px] hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-95 mt-4">
              <Plus className="w-5 h-5" /> TAMBAH PIUTANG LAIN
            </button>
            
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
              <div className="max-w-md mx-auto">
                <Button onClick={handleSubmitRec} disabled={isSubmittingRec} className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all">
                  {isSubmittingRec ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">SIMPAN PIUTANG <ArrowRight className="w-4 h-4" /></span>}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          RENDER STEP 4: LANGGANAN / TAGIHAN (PROMPT 4)
          ======================================================== */}
      {step === 4 && (
        <div className="relative w-full min-h-[80vh] overflow-hidden pt-4 px-2 pb-32">
          
          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col items-center justify-center h-[70vh] ${
            subViewState === 'question' ? 'translate-y-0 opacity-100 relative' : '-translate-y-[100%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            <div className="w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-8 shadow-xl shadow-violet-500/30">
              <CalendarClock className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-4 text-center leading-tight">Apakah kamu ada<br/>berlangganan?</h2>
            <p className="text-slate-500 text-center mb-10 text-sm max-w-[260px] leading-relaxed">
              Misal langganan Netflix, Spotify, gym, tagihan listrik, internet, kos bulanan, dsb.
            </p>

            <div className="w-full max-w-sm space-y-4 px-4 mt-8">
              <button 
                onClick={() => handleAnswerSub(true)} 
                className="w-full h-16 bg-brand-navy text-white font-black text-[15px] rounded-full shadow-[5px_5px_0px_0px] shadow-slate-900 active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all flex items-center justify-center"
              >
                YA, SAYA PUNYA
              </button>
              <button 
                onClick={() => handleAnswerSub(false)} 
                className="w-full h-14 bg-white border-2 border-slate-200 text-slate-500 font-black text-[13px] rounded-full hover:bg-slate-50 transition-all shadow-[3px_3px_0px_0px] shadow-slate-200 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px]"
              >
                TIDAK ADA
              </button>
            </div>
          </div>

          <div className={`w-full transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            subViewState === 'form' ? 'translate-y-0 opacity-100 relative' : 'translate-y-[150%] opacity-0 absolute top-0 pointer-events-none'
          }`}>
            
            <div className="bg-brand-navy p-6 rounded-[24px] shadow-[8px_8px_0px_0px] shadow-slate-900 border-l-[6px] border-brand-gold text-white text-center relative overflow-hidden mb-6">
              <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
              <div className="relative z-10">
                <h2 className="text-2xl font-black mb-2">Daftar Tagihan & Langganan</h2>
                <p className="text-sm text-blue-100 max-w-[250px] mx-auto leading-relaxed font-medium">
                  Catat pengeluaran rutinmu agar arus kas tetap aman.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {subscriptions.map((sub, index) => (
                <div key={sub.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
                  <div className="absolute -top-3 left-5 bg-violet-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    Tagihan {index + 1}
                  </div>
                  
                  {subscriptions.length > 1 && (
                    <button onClick={() => handleRemoveSub(sub.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <div className="mt-3 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nama Langganan / Tagihan</label>
                      <Input 
                        placeholder="Misal: Netflix / Listrik Kos" 
                        value={sub.name} 
                        onChange={(e) => updateSub(sub.id, 'name', e.target.value)}
                        className="h-14 font-bold text-base bg-slate-50 border-slate-200 rounded-2xl focus:border-violet-500"
                      />
                    </div>

                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nominal Tagihan</label>
                        <div className="relative flex items-center">
                          <span className="absolute left-4 font-bold text-slate-400">Rp</span>
                          <Input 
                            type="tel"
                            placeholder="0" 
                            value={sub.cost} 
                            onChange={(e) => updateSub(sub.id, 'cost', formatNumber(e.target.value))}
                            className="h-14 pl-12 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl focus:border-violet-500"
                          />
                        </div>
                      </div>
                      <div className="w-2/5">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Siklus</label>
                        <div className="relative">
                          <select
                            value={sub.cycle}
                            onChange={(e) => updateSub(sub.id, 'cycle', e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl h-14 px-4 focus:ring-2 focus:ring-violet-500 focus:outline-none"
                          >
                            <option value="bulanan">Bulanan</option>
                            <option value="tahunan">Tahunan</option>
                            <option value="mingguan">Mingguan</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Tanggal Tagihan (Opsional)</label>
                        <Input 
                          type="date"
                          value={sub.nextBilling} 
                          onChange={(e) => updateSub(sub.id, 'nextBilling', e.target.value)}
                          className="h-14 bg-slate-50 border-slate-200 rounded-2xl font-medium text-sm focus:border-violet-500"
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="text-xs font-bold text-slate-500 mb-1.5 block">Sumber Pembayaran</label>
                        <div className="relative">
                          <select
                            value={sub.source}
                            onChange={(e) => updateSub(sub.id, 'source', e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl h-14 px-4 pr-8 truncate focus:ring-2 focus:ring-violet-500 focus:outline-none"
                          >
                            {availableSources.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              ))}
            </div>

            <button onClick={handleAddSub} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-violet-200 text-violet-500 font-bold rounded-[24px] hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all active:scale-95 mt-4">
              <Plus className="w-5 h-5" /> TAMBAH TAGIHAN LAIN
            </button>
            
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
              <div className="max-w-md mx-auto">
                <Button onClick={handleSubmitSub} disabled={isSubmittingSub} className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all">
                  {isSubmittingSub ? <Loader2 className="w-6 h-6 animate-spin"/> : <span className="flex items-center gap-2">SIMPAN TAGIHAN <ArrowRight className="w-4 h-4" /></span>}
                </Button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================
          RENDER STEP 5: SELESAI / REDIRECT TO HOME (PROMPT 5)
          ======================================================== */}
      {step === 5 && (
        <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in zoom-in-95 duration-500">
           <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <Check className="w-10 h-10 text-emerald-600" />
           </div>
           <h2 className="text-3xl font-black text-slate-800 text-center mb-2 tracking-tight">Onboarding Selesai!</h2>
           <p className="text-slate-500 text-sm font-medium text-center px-6">Menyiapkan dasbor utama BILANO untuk Anda...</p>
           
           {/* Temporary redirect simulation, Prompt 5 will handle real redirect */}
           <Button onClick={() => {
             localStorage.setItem('onboarding_just_finished', 'true');
             window.location.href = '/';
           }} className="mt-8 bg-slate-900 hover:bg-slate-800 text-white rounded-full px-8 h-12">
             Mulai Gunakan BILANO
           </Button>
        </div>
      )}

    </MobileLayout>
  );
}
