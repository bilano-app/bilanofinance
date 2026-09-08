import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Wallet, Plus, Trash2, ChevronDown, Check, Loader2, ArrowRight, TrendingUp, HandCoins, Landmark, ChevronRight, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/tracking";
import WalletSourceSelect from "@/components/WalletSourceSelect";
import { ALL_WALLET_NAMES } from "@/lib/wallet-sources";

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
  symbol: string;
  quantity: string;
  price: string;
  type: string;
}

interface DebtEntry {
  id: string;
  name: string;
  amount: string;
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
  const { toast } = useToast();

  const [entries, setEntries] = useState<WalletEntry[]>([
    { id: Date.now().toString(), source: "Cash (Uang Kertas)", isCustomSource: false, currency: "IDR", amount: "" }
  ]);
  const [isSubmittingBalance, setIsSubmittingBalance] = useState(false);

  const [investments, setInvestments] = useState<InvestmentEntry[]>([]);
  const [debts, setDebts] = useState<DebtEntry[]>([]);
  const [receivables, setReceivables] = useState<DebtEntry[]>([]);
  const [openSection, setOpenSection] = useState<'kas' | 'investasi' | 'piutang' | 'hutang'>('kas');

  const handleAddEntry = () => {
    setEntries([...entries, { id: Date.now().toString(), source: "BCA", isCustomSource: false, currency: "IDR", amount: "" }]);
  };
  
  const handleRemoveEntry = (id: string) => { 
    setEntries(entries.filter(e => e.id !== id)); 
  };
  
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

  const handleAddInvestment = () => {
    setInvestments([...investments, { id: Date.now().toString(), symbol: "", quantity: "", price: "", type: "saham" }]);
  };
  const updateInvestment = (id: string, field: keyof InvestmentEntry, value: any) => {
    if (field === 'quantity' || field === 'price') value = formatNumber(value);
    setInvestments(investments.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  const removeInvestment = (id: string) => setInvestments(investments.filter(e => e.id !== id));

  const handleAddDebt = () => setDebts([...debts, { id: Date.now().toString(), name: "", amount: "" }]);
  const updateDebt = (id: string, field: keyof DebtEntry, value: any) => {
    if (field === 'amount') value = formatNumber(value);
    setDebts(debts.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  const removeDebt = (id: string) => setDebts(debts.filter(e => e.id !== id));

  const handleAddReceivable = () => setReceivables([...receivables, { id: Date.now().toString(), name: "", amount: "" }]);
  const updateReceivable = (id: string, field: keyof DebtEntry, value: any) => {
    if (field === 'amount') value = formatNumber(value);
    setReceivables(receivables.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  const removeReceivable = (id: string) => setReceivables(receivables.filter(e => e.id !== id));

  const totalIDR = useMemo(() => {
    return entries.filter(e => e.currency === 'IDR').reduce((sum, e) => sum + (parseNumber(e.amount) || 0), 0);
  }, [entries]);

  const handleFinishAndRedirect = () => {
    localStorage.removeItem('bilano_setup_balance_skipped');
    localStorage.setItem('onboarding_just_finished', 'true');
    window.location.href = '/';
  };

  const handleSkip = () => {
    localStorage.setItem('bilano_setup_balance_skipped', 'true');
    localStorage.setItem('onboarding_just_finished', 'true');
    window.location.href = '/';
  };

  const handleSubmitBalance = async () => {
    const invalidEntries = entries.filter(e => !e.source.trim());
    if (invalidEntries.length > 0) {
      toast({ title: "Form Belum Lengkap", description: "Pastikan semua nama sumber kas/rekening terisi.", variant: "destructive" });
      return;
    }

    setIsSubmittingBalance(true);
    try {
      const forexList = entries
        .filter(e => e.currency !== 'IDR' && parseNumber(e.amount) > 0)
        .map(e => ({ currency: e.currency, amount: parseNumber(e.amount) }));

      const idrWalletSources = entries
        .filter(e => e.currency === 'IDR' && parseNumber(e.amount) > 0)
        .map(e => ({
          id: e.id,
          name: e.source,
          type: 'bank',
          balance: parseNumber(e.amount)
        }));

      localStorage.removeItem('bilano_setup_balance_skipped');
      localStorage.setItem("bilano_initial_sources", JSON.stringify(entries));
      localStorage.setItem("bilano_migration_completed", "true");
      const userEmail = localStorage.getItem("bilano_email") || "";

      // 1. Simpan Saldo Kas & Valas Awal
      const res = await fetch("/api/target", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-email": userEmail },
        body: JSON.stringify({
          setCashBalance: totalIDR,
          initialForexList: forexList,
          initialDebts: debts.filter(d => parseNumber(d.amount) > 0).map(d => ({ name: d.name, amount: parseNumber(d.amount) })),
          initialReceivables: receivables.filter(r => parseNumber(r.amount) > 0).map(r => ({ name: r.name, amount: parseNumber(r.amount) })),
          initialInvestments: investments.filter(i => parseNumber(i.quantity) > 0 && parseNumber(i.price) > 0).map(i => ({ symbol: i.symbol, quantity: parseNumber(i.quantity), price: parseNumber(i.price), type: i.type })),
        })
      });

      // 2. Simpan Rincian Multi-Dompet
      if (idrWalletSources.length > 0) {
        await fetch("/api/user/wallet-sources", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-email": userEmail },
          body: JSON.stringify({ walletSources: idrWalletSources })
        });
      }

      if (!res.ok) throw new Error("Gagal menyimpan saldo");
      trackEvent("initial_balance_setup", { totalIDR, forexCount: forexList.length });
      
      toast({ title: "Saldo Awal Berhasil Disimpan! 🎉", description: "Selamat datang di dasbor BILANO." });
      handleFinishAndRedirect();
    } catch (e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message || "Gagal menghubungi server", variant: "destructive" });
      setIsSubmittingBalance(false);
    }
  };

  return (
    <MobileLayout title="Saldo Awal" showBack={false}>
      <div className="space-y-6 pt-2 px-1 pb-36 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* Banner Motivasi Singkat */}
        <div className="bg-gradient-to-br from-[#0a1128] to-[#121c3a] p-6 rounded-[28px] text-white text-center shadow-xl border border-blue-500/20 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="absolute -left-4 -bottom-4 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 border border-white/20">
              <Wallet className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black mb-1.5 tracking-tight">Mulai dari Saldo Kasmu</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-[280px] mx-auto">
              Berapa perkiraan uang kas/rekeningmu saat ini? Catat untuk mulai memantau arus keuangan.
            </p>
          </div>
        </div>

        {/* Sticky Total Kas Counter */}
        <div className="sticky top-2 z-40 bg-white/95 backdrop-blur-xl p-4 rounded-[24px] shadow-[0_8px_25px_rgb(15,23,42,0.06)] border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Saldo Kas</p>
            <h3 className="text-2xl font-black text-slate-800 tabular-nums">{formatRp(totalIDR)}</h3>
          </div>
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shrink-0">
            <Check className="w-5 h-5" strokeWidth={3} />
          </div>
        </div>

        {/* TAB ACCORDION NAVIGATION */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x mt-2">
          <button onClick={() => setOpenSection('kas')} className={`shrink-0 snap-start px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center ${openSection === 'kas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <Wallet className="w-4 h-4 mr-1.5" /> Kas & Valas
          </button>
          <button onClick={() => setOpenSection('investasi')} className={`shrink-0 snap-start px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center ${openSection === 'investasi' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <TrendingUp className="w-4 h-4 mr-1.5" /> Investasi
          </button>
          <button onClick={() => setOpenSection('piutang')} className={`shrink-0 snap-start px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center ${openSection === 'piutang' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <HandCoins className="w-4 h-4 mr-1.5" /> Piutang
          </button>
          <button onClick={() => setOpenSection('hutang')} className={`shrink-0 snap-start px-4 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center ${openSection === 'hutang' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
            <Landmark className="w-4 h-4 mr-1.5" /> Hutang
          </button>
        </div>

        {openSection === 'kas' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            {entries.map((entry, index) => (
              <div key={entry.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
                <div className="absolute -top-3 left-5 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Sumber {index + 1}
                </div>
                {entries.length > 1 && (
                  <button 
                    onClick={() => handleRemoveEntry(entry.id)} 
                    className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="mt-3 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nama Dompet / Bank</label>
                    <WalletSourceSelect
                      value={entry.source}
                      isCustom={entry.isCustomSource}
                      onChange={(val, isCustom) => {
                        setEntries(entries.map(e => {
                          if (e.id === entry.id) return { ...e, source: val, isCustomSource: !!isCustom };
                          return e;
                        }));
                      }}
                    />
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
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nominal Saldo</label>
                      <Input 
                        type="tel" 
                        placeholder="0" 
                        value={entry.amount} 
                        onChange={(e) => handleAmountChange(entry.id, e.target.value)} 
                        className="h-14 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl focus:border-indigo-500" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={handleAddEntry} 
              className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-[24px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
            >
              <Plus className="w-5 h-5" /> TAMBAH SUMBER KAS LAIN
            </button>
          </div>
        )}

        {openSection === 'investasi' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-indigo-50 p-4 rounded-[20px] border border-indigo-100 flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-indigo-600 mt-0.5" />
              <p className="text-xs text-indigo-800 font-medium">Catat portofolio investasi kamu seperti saham, crypto, reksadana, atau deposito.</p>
            </div>
            {investments.map((entry, index) => (
              <div key={entry.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative">
                <div className="absolute -top-3 left-5 bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Aset {index + 1}
                </div>
                <button 
                  onClick={() => removeInvestment(entry.id)} 
                  className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="mt-3 space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Simbol / Nama Aset</label>
                      <Input placeholder="BBCA" value={entry.symbol} onChange={(e) => updateInvestment(entry.id, 'symbol', e.target.value.toUpperCase())} className="h-14 font-black bg-slate-50 border-slate-200 rounded-2xl" />
                    </div>
                    <div className="w-1/3">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Tipe Aset</label>
                      <div className="relative">
                        <select value={entry.type} onChange={(e) => updateInvestment(entry.id, 'type', e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl h-14 px-4 focus:ring-2 focus:ring-indigo-500">
                          <option value="saham">Saham</option>
                          <option value="crypto">Crypto</option>
                          <option value="reksadana">Reksadana</option>
                          <option value="deposito">Deposito</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Jumlah Lembar/Unit</label>
                      <Input type="tel" placeholder="100" value={entry.quantity} onChange={(e) => updateInvestment(entry.id, 'quantity', e.target.value)} className="h-14 font-black bg-slate-50 border-slate-200 rounded-2xl" />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 mb-1.5 block">Harga Beli Rata-Rata</label>
                      <Input type="tel" placeholder="0" value={entry.price} onChange={(e) => updateInvestment(entry.id, 'price', e.target.value)} className="h-14 font-black bg-slate-50 border-slate-200 rounded-2xl" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button onClick={handleAddInvestment} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-emerald-300 text-emerald-600 font-bold rounded-[24px] hover:bg-emerald-50 transition-all">
              <Plus className="w-5 h-5" /> TAMBAH ASET INVESTASI
            </button>
          </div>
        )}

        {openSection === 'piutang' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-amber-50 p-4 rounded-[20px] border border-amber-100 flex items-start gap-3">
              <HandCoins className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">Uang kamu yang dipinjam oleh orang lain atau belum dibayarkan kepadamu.</p>
            </div>
            {receivables.map((entry, index) => (
              <div key={entry.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative">
                <button onClick={() => removeReceivable(entry.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Siapa yang Berhutang Padamu?</label>
                    <Input placeholder="Nama Orang/Instansi" value={entry.name} onChange={(e) => updateReceivable(entry.id, 'name', e.target.value)} className="h-14 font-bold bg-slate-50 border-slate-200 rounded-2xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Nominal Uang</label>
                    <Input type="tel" placeholder="0" value={entry.amount} onChange={(e) => updateReceivable(entry.id, 'amount', e.target.value)} className="h-14 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl text-amber-600" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={handleAddReceivable} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-amber-300 text-amber-600 font-bold rounded-[24px] hover:bg-amber-50 transition-all">
              <Plus className="w-5 h-5" /> TAMBAH PIUTANG
            </button>
          </div>
        )}

        {openSection === 'hutang' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="bg-rose-50 p-4 rounded-[20px] border border-rose-100 flex items-start gap-3">
              <Landmark className="w-5 h-5 text-rose-600 mt-0.5" />
              <p className="text-xs text-rose-800 font-medium">Uang yang kamu pinjam dari bank, pinjol, teman, KPR, dll.</p>
            </div>
            {debts.map((entry, index) => (
              <div key={entry.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative">
                <button onClick={() => removeDebt(entry.id)} className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"><Trash2 className="w-4 h-4" /></button>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Kepada Siapa Kamu Berhutang?</label>
                    <Input placeholder="Bank BCA / Teman" value={entry.name} onChange={(e) => updateDebt(entry.id, 'name', e.target.value)} className="h-14 font-bold bg-slate-50 border-slate-200 rounded-2xl" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 mb-1.5 block">Sisa Hutang</label>
                    <Input type="tel" placeholder="0" value={entry.amount} onChange={(e) => updateDebt(entry.id, 'amount', e.target.value)} className="h-14 font-black text-xl bg-slate-50 border-slate-200 rounded-2xl text-rose-600" />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={handleAddDebt} className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-rose-300 text-rose-600 font-bold rounded-[24px] hover:bg-rose-50 transition-all">
              <Plus className="w-5 h-5" /> TAMBAH HUTANG
            </button>
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
          <div className="max-w-md mx-auto space-y-2.5">
            <Button 
              onClick={handleSubmitBalance} 
              disabled={isSubmittingBalance} 
              className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all cursor-pointer"
            >
              {isSubmittingBalance ? (
                <Loader2 className="w-6 h-6 animate-spin"/>
              ) : (
                <span className="flex items-center gap-2">
                  SIMPAN & MULAI GUNAKAN <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {/* Tombol Lewati Dulu */}
            <button
              onClick={handleSkip}
              type="button"
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Lewati dulu, saya atur nanti di Beranda →
            </button>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
