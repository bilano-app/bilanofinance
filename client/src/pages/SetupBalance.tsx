import { useState, useMemo } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Wallet, Plus, Trash2, ChevronDown, Check, Loader2, ArrowRight } from "lucide-react";
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

  const totalIDR = useMemo(() => {
    return entries.filter(e => e.currency === 'IDR').reduce((sum, e) => sum + (parseNumber(e.amount) || 0), 0);
  }, [entries]);

  const handleFinishAndRedirect = () => {
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

        {/* Input Sumber-sumber Saldo Kas */}
        <div className="space-y-4">
          {entries.map((entry, index) => (
            <div key={entry.id} className="bg-white p-5 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 relative group">
              <div className="absolute -top-3 left-5 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Sumber {index + 1}
              </div>
              {entries.length > 1 && (
                <button 
                  onClick={() => handleRemoveEntry(entry.id)} 
                  className="absolute top-3 right-3 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                  title="Hapus sumber ini"
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
                        if (e.id === entry.id) {
                          return { ...e, source: val, isCustomSource: !!isCustom };
                        }
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
        </div>

        {/* Tombol Tambah Sumber Uang Lain */}
        <button 
          onClick={handleAddEntry} 
          className="w-full flex items-center justify-center gap-2 h-14 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-[24px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> TAMBAH SUMBER DANA LAIN
        </button>

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
              onClick={handleFinishAndRedirect}
              type="button"
              className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
            >
              Lewati dulu, saya atur nanti di Beranda →
            </button>
          </div>
        </div>

      </div>
    </MobileLayout>
  );
}
