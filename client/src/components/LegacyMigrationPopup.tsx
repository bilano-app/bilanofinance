import { useState, useMemo, useEffect } from "react";
import { Button, Input } from "@/components/UIComponents";
import { Wallet, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import WalletSourceSelect from "@/components/WalletSourceSelect";
import { formatCurrencyInput, formatDecimalInput, parseFormattedNumber, formatRp } from "@/lib/utils";
import { getForexPresetsForCurrency } from "@/lib/wallet-sources";
import { useQueryClient } from "@tanstack/react-query";

interface UnallocatedAsset {
  currency: string;
  amount: number;
  allocated?: number;
  remaining?: number;
}

interface LegacyMigrationPopupProps {
  onComplete: () => void;
  currency?: string;
  totalAmount?: number;
  unallocatedAssets?: UnallocatedAsset[];
}

interface WalletEntry {
  id: string;
  source: string;
  isCustomSource: boolean;
  balance: string;
}

export default function LegacyMigrationPopup({ 
  onComplete, 
  currency = 'IDR', 
  totalAmount, 
  unallocatedAssets 
}: LegacyMigrationPopupProps) {
  const { data: user, refetch: refetchUser } = useUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [accumulatedSources, setAccumulatedSources] = useState<any[]>([]);

  // Current active asset info
  const activeAsset = unallocatedAssets && unallocatedAssets.length > 0
    ? unallocatedAssets[stepIndex] || unallocatedAssets[0]
    : null;

  const activeCurrency = (activeAsset ? activeAsset.currency : currency || 'IDR').toUpperCase();
  const isValas = activeCurrency !== 'IDR';

  const currentTotal = activeAsset 
    ? (activeAsset.remaining ?? activeAsset.amount ?? 0)
    : (totalAmount !== undefined ? totalAmount : (user?.cashBalance || 0));

  const presets = useMemo(() => {
    return isValas ? getForexPresetsForCurrency(activeCurrency) : [];
  }, [isValas, activeCurrency]);

  const [entries, setEntries] = useState<WalletEntry[]>(() => {
    if (isValas) {
      const defaultSource = getForexPresetsForCurrency(activeCurrency)[0]?.name || `Wise (${activeCurrency})`;
      return [{ id: Date.now().toString(), source: defaultSource, isCustomSource: false, balance: "" }];
    }
    return [{ id: Date.now().toString(), source: "BCA", isCustomSource: false, balance: "" }];
  });

  // When step changes (for multi-currency valas), reset entries for that currency
  useEffect(() => {
    if (isValas) {
      const defaultSource = getForexPresetsForCurrency(activeCurrency)[0]?.name || `Wise (${activeCurrency})`;
      setEntries([{ id: Date.now().toString(), source: defaultSource, isCustomSource: false, balance: "" }]);
    }
  }, [stepIndex, activeCurrency, isValas]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddEntry = () => {
    if (isValas) {
      const defaultNext = presets[entries.length % (presets.length || 1)]?.name || `Rekening ${activeCurrency} ${entries.length + 1}`;
      setEntries([...entries, { id: Date.now().toString(), source: defaultNext, isCustomSource: false, balance: "" }]);
    } else {
      setEntries([...entries, { id: Date.now().toString(), source: "GoPay", isCustomSource: false, balance: "" }]);
    }
  };

  const handleRemoveEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };
  
  const updateEntry = (id: string, field: string, value: any) => {
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

  const distributedTotal = useMemo(() => {
    return entries.reduce((sum, e) => sum + (parseFormattedNumber(e.balance) || 0), 0);
  }, [entries]);

  const remainingTotal = Math.round((currentTotal - distributedTotal) * 10000) / 10000;

  const formatBalanceDisplay = (val: number) => {
    if (!isValas) return formatRp(val);
    return `${val.toLocaleString('en-US')} ${activeCurrency}`;
  };

  const handleSubmit = async () => {
    const invalidEntries = entries.filter(e => !e.source.trim() || parseFormattedNumber(e.balance) <= 0);
    if (invalidEntries.length > 0) {
      toast({ 
        title: "Form Belum Lengkap", 
        description: `Pastikan semua sumber dan saldo ${activeCurrency} terisi dengan benar (tidak boleh 0).`, 
        variant: "destructive" 
      });
      return;
    }
    if (remainingTotal < -0.0001) {
      toast({ 
        title: isValas ? "Total Melebihi Saldo Valas" : "Total Melebihi Kas", 
        description: isValas 
          ? `Jumlah rincian tidak boleh melebihi saldo total ${activeCurrency} Anda (${formatBalanceDisplay(currentTotal)}).`
          : "Jumlah rincian tidak boleh melebihi total kas lama Anda.", 
        variant: "destructive" 
      });
      return;
    }

    // Compile current step's sources
    const stepSources = entries.map(e => ({
      id: e.id,
      name: e.source.trim(),
      isCustomSource: e.isCustomSource,
      currency: activeCurrency,
      balance: parseFormattedNumber(e.balance) || 0,
      type: isValas ? 'valas' : undefined
    }));

    if (remainingTotal > 0.0001) {
      stepSources.push({
        id: Date.now().toString() + "_" + activeCurrency + "_remaining",
        name: isValas ? `Dompet Utama (${activeCurrency})` : "Cash (Lainnya)",
        isCustomSource: true,
        currency: activeCurrency,
        balance: remainingTotal,
        type: isValas ? 'valas' : undefined
      });
    }

    // If there are more assets in unallocatedAssets, advance step
    if (unallocatedAssets && stepIndex < unallocatedAssets.length - 1) {
      setAccumulatedSources([...accumulatedSources, ...stepSources]);
      setStepIndex(stepIndex + 1);
      return;
    }

    // Final submission
    setIsSubmitting(true);
    try {
      const allCompiledSources = [...accumulatedSources, ...stepSources];

      if (isValas) {
        // Merge with existing wallet sources
        const existingWS = ((user?.walletSources as any[]) || []);
        const migratedCurrencies = new Set(allCompiledSources.map(s => s.currency.toUpperCase()));
        const preservedWS = existingWS.filter(w => !migratedCurrencies.has((w.currency || 'IDR').toUpperCase()));
        const finalWalletSources = [...preservedWS, ...allCompiledSources];

        const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
        const res = await fetch("/api/user/wallet-sources", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": userEmail
          },
          body: JSON.stringify({ walletSources: finalWalletSources })
        });
        
        if (!res.ok) throw new Error("Gagal menyimpan data rekening valas.");
        
        localStorage.setItem("bilano_forex_migration_completed", "true");
        toast({ title: "Migrasi Selesai", description: "Rincian dompet valas berhasil disimpan." });
      } else {
        const totalFromSources = allCompiledSources.reduce((acc, w) => acc + (Number(w.balance) || 0), 0);
        const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
        const res = await fetch("/api/user/wallet-sources", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-user-email": userEmail
          },
          body: JSON.stringify({ walletSources: allCompiledSources, cashBalance: totalFromSources })
        });
        
        if (!res.ok) throw new Error("Gagal menyimpan data sumber dana.");
        
        localStorage.setItem("bilano_migration_completed", "true");
        toast({ title: "Migrasi Selesai", description: "Rincian dompet berhasil disimpan." });
      }

      await refetchUser();
      queryClient.invalidateQueries();
      onComplete();
    } catch (e: any) {
      toast({ title: "Terjadi Kesalahan", description: e.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Navy Banner Header */}
        <div className="p-6 bg-brand-navy text-white text-center rounded-t-[32px] border-b-[6px] border-brand-gold relative">
          <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Wallet className="w-8 h-8 text-brand-gold" />
          </div>
          <h2 className="text-xl font-black mb-1">
            {isValas ? `Rincikan Dompet Valas (${activeCurrency})` : "Rincikan Dompetmu"}
          </h2>
          <p className="text-xs text-blue-100/80 font-medium">
            {isValas 
              ? `Sistem baru BILANO kini mendukung Multi-Sumber Uang untuk Valas! Rincikan total saldo ${activeCurrency} Anda (${formatBalanceDisplay(currentTotal)}) ke berbagai dompet di bawah.`
              : `Sistem baru BILANO kini mendukung Multi-Sumber Uang! Rincikan total kas lama-mu (${formatRp(currentTotal)}) ke berbagai dompet di bawah.`
            }
          </p>
          {unallocatedAssets && unallocatedAssets.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {unallocatedAssets.map((asset, idx) => (
                <div
                  key={asset.currency}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === stepIndex ? 'w-6 bg-brand-gold' : 'w-2 bg-white/30'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50">
          
          {/* Sticky Sisa Bar */}
          <div className={`sticky top-0 z-10 mb-4 p-3 rounded-2xl flex justify-between items-center text-sm font-bold shadow-sm ${
            remainingTotal === 0 
              ? 'bg-emerald-100 text-emerald-700' 
              : remainingTotal < 0 
                ? 'bg-rose-100 text-rose-700' 
                : 'bg-blue-100 text-blue-700'
          }`}>
            <span>Sisa untuk dirincikan:</span>
            <span className="text-lg">{formatBalanceDisplay(remainingTotal)}</span>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={entry.id} className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-200 relative">
                {entries.length > 1 && (
                  <button 
                    type="button"
                    onClick={() => handleRemoveEntry(entry.id)} 
                    className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="mb-3 pr-8">
                  <label className="text-xs font-bold text-slate-500 mb-1.5 block">
                    {isValas ? `Dompet / Rekening ${index + 1} (${activeCurrency})` : `Dompet ${index + 1}`}
                  </label>
                  <WalletSourceSelect
                    value={entry.source}
                    isCustom={entry.isCustomSource}
                    currency={activeCurrency}
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
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Saldo di Dalamnya</label>
                  <Input 
                    type="text" 
                    inputMode="decimal" 
                    placeholder="0" 
                    value={entry.balance} 
                    onChange={(e) => updateEntry(entry.id, 'balance', isValas ? formatDecimalInput(e.target.value) : formatCurrencyInput(e.target.value))} 
                    className="h-12 font-black text-lg bg-slate-50 border-slate-200 rounded-xl focus:border-indigo-500" 
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            type="button"
            onClick={handleAddEntry} 
            className="w-full flex items-center justify-center gap-2 h-12 border-2 border-dashed border-slate-300 text-slate-500 font-bold rounded-[20px] hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95 mt-4"
          >
            <Plus className="w-5 h-5" /> TAMBAH SUMBER
          </button>
        </div>

        {/* Footer Button */}
        <div className="p-4 bg-white border-t border-slate-100">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || remainingTotal < -0.0001} 
            className="w-full h-14 bg-brand-navy hover:bg-slate-800 text-brand-gold font-black rounded-full shadow-[4px_4px_0px_0px] shadow-slate-300 active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0px_0px] transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin"/>
            ) : unallocatedAssets && stepIndex < unallocatedAssets.length - 1 ? (
              <span className="flex items-center gap-2">LANJUT KE MATA UANG BERIKUTNYA <ArrowRight className="w-4 h-4" /></span>
            ) : (
              <span className="flex items-center gap-2">SIMPAN PERUBAHAN <ArrowRight className="w-4 h-4" /></span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
