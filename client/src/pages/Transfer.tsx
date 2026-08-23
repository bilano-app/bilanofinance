import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowRightLeft, Loader2, Plus, ArrowDown, ArrowUp, 
  Wallet, Check, ChevronDown, Sparkles, Building2, Smartphone, TrendingUp 
} from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import WalletSourceSelect from "@/components/WalletSourceSelect";
import { getWalletLogo, ALL_WALLET_SOURCES } from "@/lib/wallet-sources";

const formatNumber = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
        clean = clean.replace(/^0+/, ''); 
    }
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

export default function Transfer() {
  const { data: user } = useUser();
  const { toast } = useToast();
  
  const [fromSource, setFromSource] = useState("");
  const [toSource, setToSource] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Source Mode: 'existing' vs 'new'
  const [destinationMode, setDestinationMode] = useState<'existing' | 'new'>('existing');
  const [newSourceName, setNewSourceName] = useState("");
  const [isNewCustom, setIsNewCustom] = useState(false);
  
  const walletSources = (user?.walletSources as any[]) || [];
  const selectedFromWallet = walletSources.find(w => w.name === fromSource);

  const setPresetAmount = (val: number) => {
    setAmount(formatNumber(val.toString()));
  };

  const handleMaxAmount = () => {
    if (selectedFromWallet) {
      setAmount(formatNumber(selectedFromWallet.balance.toString()));
    }
  };
  
  const handleSubmit = async () => {
      const numAmount = parseNumber(amount);
      const isAddingNew = destinationMode === 'new';
      const actualToSource = isAddingNew ? newSourceName.trim() : toSource;

      if (numAmount <= 0) {
          toast({ title: "Nominal tidak valid", description: "Masukkan jumlah uang yang ingin ditransfer.", variant: "destructive" });
          return;
      }
      if (!fromSource || !actualToSource) {
          toast({ title: "Sumber belum lengkap", description: "Pastikan dompet asal dan tujuan transfer sudah dipilih.", variant: "destructive" });
          return;
      }
      if (fromSource === actualToSource) {
          toast({ title: "Sumber sama", description: "Sumber asal dan tujuan tidak boleh sama.", variant: "destructive" });
          return;
      }

      const fromWallet = walletSources.find(w => w.name === fromSource);
      if (fromWallet && fromWallet.balance < numAmount) {
          toast({ title: "Saldo tidak cukup", description: `Saldo di ${fromSource} tidak mencukupi (${formatRp(fromWallet.balance)}).`, variant: "destructive" });
          return;
      }

      setIsSubmitting(true);
      try {
          // 1. Transaction Keluar (Dari)
          await fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  type: "expense",
                  category: "Transfer Keluar",
                  amount: numAmount,
                  description: `Transfer ke ${actualToSource}: ${notes || 'Pindah Saldo'}`,
                  source: fromSource,
                  date: new Date().toISOString()
              })
          });

          // 2. Transaction Masuk (Ke)
          await fetch("/api/transactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                  type: "income",
                  category: "Transfer Masuk",
                  amount: numAmount,
                  description: `Terima dari ${fromSource}: ${notes || 'Pindah Saldo'}`,
                  source: actualToSource,
                  date: new Date().toISOString()
              })
          });

          // 3. Update / Create Wallet Sources
          if (walletSources.length > 0) {
              const updatedSources = [...walletSources];
              
              // Kurangi asal
              const fromIdx = updatedSources.findIndex(w => w.name === fromSource);
              if (fromIdx !== -1) {
                  updatedSources[fromIdx] = {
                      ...updatedSources[fromIdx],
                      balance: Math.max(0, updatedSources[fromIdx].balance - numAmount)
                  };
              }

              // Tambah tujuan
              const toIdx = updatedSources.findIndex(w => w.name === actualToSource);
              if (toIdx !== -1) {
                  updatedSources[toIdx] = {
                      ...updatedSources[toIdx],
                      balance: updatedSources[toIdx].balance + numAmount
                  };
              } else {
                  // Dompet Baru
                  updatedSources.push({
                      id: Date.now().toString(),
                      name: actualToSource,
                      isCustomSource: isNewCustom,
                      currency: 'IDR',
                      balance: numAmount
                  });
              }

              await fetch("/api/user/wallet-sources", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ walletSources: updatedSources })
              });
          }

          queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

          toast({ 
              title: "Transfer Berhasil! 🚀", 
              description: `Berhasil memindahkan dana ${formatRp(numAmount)} dari ${fromSource} ke ${actualToSource}.` 
          });

          setAmount("");
          setNotes("");
          setFromSource("");
          setToSource("");
          setNewSourceName("");
          setDestinationMode('existing');
      } catch (e: any) {
          toast({ title: "Transfer Gagal", description: e.message, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  const fromLogo = getWalletLogo(fromSource);
  const toLogo = getWalletLogo(toSource);

  return (
    <MobileLayout title="Transfer Antar Dompet" showBack>
      <div className="p-4 space-y-5 pb-28 animate-in fade-in duration-300">
            
            {/* Header Banner - Theme Seirama dengan Home */}
            <div className="bg-brand-navy rounded-[28px] p-5 text-white relative overflow-hidden border-l-[6px] border-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900">
                <ArrowRightLeft className="absolute -right-3 -bottom-3 w-28 h-28 text-white/[0.05] -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-brand-goldTintMed text-brand-gold text-[9px] font-black px-2.5 py-0.5 rounded-md border border-brand-gold uppercase tracking-wider">
                                INTERNAL TRANSFER
                            </span>
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-white">Pindah Saldo Dompet</h2>
                        <p className="text-xs text-blue-200/80 font-medium max-w-[210px] mt-0.5">
                            Atur perputaran dana antar bank, e-wallet, atau sekuritasmu
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-brand-gold rounded-2xl flex items-center justify-center text-brand-navy shadow-inner shrink-0">
                        <ArrowRightLeft className="w-7 h-7" strokeWidth={2.5} />
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="space-y-4">
                
                {/* 1. DARI SUMBER ASAL */}
                <div className="bg-white p-5 rounded-[24px] border-2 border-slate-100 shadow-[4px_4px_0px_0px] shadow-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-rose-100 flex items-center justify-center">
                                <ArrowUp className="w-3.5 h-3.5 text-rose-600" />
                            </div>
                            Dari Sumber (Tarik Dana)
                        </label>
                        {selectedFromWallet && (
                            <span className="text-[11px] font-bold text-slate-500">
                                Saldo: <strong className="text-slate-800">{formatRp(selectedFromWallet.balance)}</strong>
                            </span>
                        )}
                    </div>

                    <div className="relative">
                        <select
                            value={fromSource}
                            onChange={(e) => setFromSource(e.target.value)}
                            className="w-full h-14 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl pl-12 pr-10 focus:ring-2 focus:ring-brand-navy focus:outline-none appearance-none cursor-pointer"
                        >
                            <option value="">-- Pilih Sumber Asal --</option>
                            {walletSources.map((w) => (
                                <option key={w.name} value={w.name}>
                                    {w.name} — {formatRp(w.balance)}
                                </option>
                            ))}
                        </select>
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center pointer-events-none shadow-2xs">
                            {fromLogo ? (
                                <img src={fromLogo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <Wallet className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* 2. KE TUJUAN (DENGAN DROPDOWN FULL SUMBER BARU) */}
                <div className="bg-white p-5 rounded-[24px] border-2 border-slate-100 shadow-[4px_4px_0px_0px] shadow-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            Ke Tujuan (Terima Dana)
                        </label>
                    </div>

                    {/* Mode Toggle: Dompet Terdaftar vs Tambah Baru */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setDestinationMode('existing')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                destinationMode === 'existing'
                                    ? 'bg-brand-navy text-brand-gold shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Wallet className="w-3.5 h-3.5" /> Dompet Terdaftar
                        </button>
                        <button
                            type="button"
                            onClick={() => setDestinationMode('new')}
                            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                destinationMode === 'new'
                                    ? 'bg-brand-navy text-brand-gold shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <Plus className="w-3.5 h-3.5" /> + Sumber Baru
                        </button>
                    </div>

                    {/* Tampilan Sesuai Mode */}
                    {destinationMode === 'existing' ? (
                        <div className="space-y-2 pt-1">
                            <div className="relative">
                                <select
                                    value={toSource}
                                    onChange={(e) => setToSource(e.target.value)}
                                    className="w-full h-14 bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-2xl pl-12 pr-10 focus:ring-2 focus:ring-brand-navy focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="">-- Pilih Dompet Tujuan --</option>
                                    {walletSources.filter(w => w.name !== fromSource).map((w) => (
                                        <option key={w.name} value={w.name}>
                                            {w.name} — {formatRp(w.balance)}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center pointer-events-none shadow-2xs">
                                    {toLogo ? (
                                        <img src={toLogo} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <Wallet className="w-4 h-4 text-slate-400" />
                                    )}
                                </div>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    ) : (
                        /* Full Dropdown 3 Kategori untuk Sumber Baru */
                        <div className="space-y-2 pt-1">
                            <p className="text-[11px] text-indigo-900 font-bold">
                                Pilih Bank, E-Wallet, atau Sekuritas baru dari daftar lengkap:
                            </p>
                            <WalletSourceSelect
                                value={newSourceName}
                                isCustom={isNewCustom}
                                onChange={(val, isCustom) => {
                                    setNewSourceName(val);
                                    setIsNewCustom(!!isCustom);
                                }}
                                placeholder="Klik untuk buka daftar Bank / E-Wallet / Sekuritas..."
                            />
                        </div>
                    )}
                </div>

                {/* 3. NOMINAL TRANSFER */}
                <div className="bg-white p-5 rounded-[24px] border-2 border-slate-100 shadow-[4px_4px_0px_0px] shadow-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-slate-800 uppercase tracking-wider">Nominal Transfer</label>
                        {selectedFromWallet && (
                            <button
                                type="button"
                                onClick={handleMaxAmount}
                                className="text-[11px] font-black text-brand-navy hover:underline flex items-center gap-1"
                            >
                                <Sparkles className="w-3 h-3 text-brand-gold" /> Transfer Semua Saldo
                            </button>
                        )}
                    </div>

                    <div className="relative flex items-center">
                        <span className="absolute left-4 font-black text-slate-400 text-lg">Rp</span>
                        <Input 
                            type="tel"
                            placeholder="0" 
                            value={amount} 
                            onChange={(e) => setAmount(formatNumber(e.target.value))}
                            className="h-16 pl-12 font-black text-2xl bg-slate-50 border-slate-200 rounded-2xl focus:border-brand-navy text-slate-900"
                        />
                    </div>

                    {/* Quick Preset Nominal Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {[50000, 100000, 250000, 500000, 1000000].map((preset) => (
                            <button
                                key={preset}
                                type="button"
                                onClick={() => setPresetAmount(preset)}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all"
                            >
                                +{preset >= 1000000 ? `${preset / 1000000} Jt` : `${preset / 1000} rb`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 4. CATATAN */}
                <div className="bg-white p-5 rounded-[24px] border-2 border-slate-100 shadow-[4px_4px_0px_0px] shadow-slate-200 space-y-2">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wider block">Catatan (Opsional)</label>
                    <Input 
                        placeholder="Cth: Pindah dana ke RDN untuk beli saham" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)}
                        className="h-14 font-semibold text-sm bg-slate-50 border-slate-200 rounded-2xl text-slate-800"
                    />
                </div>
            </div>

            {/* Floating Action Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-slate-100 z-50 pb-safe">
                <div className="max-w-md mx-auto">
                    <Button 
                        onClick={handleSubmit} 
                        disabled={isSubmitting || !fromSource || (!toSource && destinationMode === 'existing') || (destinationMode === 'new' && !newSourceName.trim()) || !amount} 
                        className="w-full h-14 bg-brand-gold hover:bg-brand-gold/90 text-brand-navy text-base font-black rounded-full shadow-[5px_5px_0px_0px] shadow-brand-navy active:shadow-[2px_2px_0px_0px] active:translate-x-[3px] active:translate-y-[3px] transition-all disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-6 h-6 animate-spin"/> 
                        ) : (
                            <span className="flex items-center gap-2 uppercase tracking-wide">
                                PROSES PINDAH DANA <Check className="w-5 h-5 stroke-[3]" />
                            </span>
                        )}
                    </Button>
                </div>
            </div>
      </div>
    </MobileLayout>
  );
}
