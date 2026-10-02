import { useState, useMemo } from "react";
import { Button, Input } from "@/components/UIComponents";
import { 
    Globe, Wallet, Plus, Trash2, ArrowRight, Loader2, 
    CheckCircle2, Sparkles, Check, ChevronRight 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { getForexPresetsForCurrency, getWalletLogo } from "@/lib/wallet-sources";
import { formatDecimalInput, parseFormattedNumber } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

interface UnallocatedForex {
    currency: string;
    amount: number;
    allocated: number;
    remaining: number;
}

interface ForexMigrationPopupProps {
    unallocatedAssets: UnallocatedForex[];
    onComplete: () => void;
}

export default function ForexMigrationPopup({ unallocatedAssets, onComplete }: ForexMigrationPopupProps) {
    const { data: user, refetch: refetchUser } = useUser();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Step index if user has multiple currencies to migrate (e.g. USD then EUR)
    const [currentStep, setCurrentStep] = useState(0);
    const activeAsset = unallocatedAssets[currentStep] || unallocatedAssets[0];

    const targetCurr = (activeAsset?.currency || 'USD').toUpperCase();
    const presets = useMemo(() => getForexPresetsForCurrency(targetCurr), [targetCurr]);

    // Initial entry for the active currency
    const [entries, setEntries] = useState<Record<string, Array<{ id: string; source: string; isCustomSource: boolean; balance: string }>>>({
        [targetCurr]: [
            { 
                id: Date.now().toString(), 
                source: presets[0]?.name || `Wise (${targetCurr})`, 
                isCustomSource: false, 
                balance: (activeAsset?.remaining || activeAsset?.amount || 0).toString() 
            }
        ]
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Current currency entries
    const currentEntries = entries[targetCurr] || [
        { 
            id: Date.now().toString(), 
            source: presets[0]?.name || `Wise (${targetCurr})`, 
            isCustomSource: false, 
            balance: (activeAsset?.remaining || activeAsset?.amount || 0).toString() 
        }
    ];

    const handleAddEntry = () => {
        const defaultNext = presets[currentEntries.length % presets.length]?.name || `Rekening ${targetCurr} ${currentEntries.length + 1}`;
        const updated = [
            ...currentEntries,
            { id: Date.now().toString(), source: defaultNext, isCustomSource: false, balance: "" }
        ];
        setEntries({ ...entries, [targetCurr]: updated });
    };

    const handleRemoveEntry = (id: string) => {
        const updated = currentEntries.filter(e => e.id !== id);
        setEntries({ ...entries, [targetCurr]: updated });
    };

    const updateEntry = (id: string, field: string, value: any) => {
        const updated = currentEntries.map(e => {
            if (e.id === id) {
                return { ...e, [field]: value };
            }
            return e;
        });
        setEntries({ ...entries, [targetCurr]: updated });
    };

    const totalToAllocate = activeAsset?.remaining || activeAsset?.amount || 0;
    const distributedTotal = useMemo(() => {
        return currentEntries.reduce((sum: number, e: any) => sum + (parseFormattedNumber(e.balance) || 0), 0);
    }, [currentEntries]);

    const remainingTotal = Math.round((totalToAllocate - distributedTotal) * 10000) / 10000;

    const handleNextOrSubmit = async () => {
        // Validation
        const invalidEntries = currentEntries.filter(e => !e.source.trim() || parseFormattedNumber(e.balance) <= 0);
        if (invalidEntries.length > 0) {
            toast({
                title: "Rincian Belum Lengkap",
                description: `Pastikan semua nama rekening dan saldo ${targetCurr} terisi dengan benar (lebih dari 0).`,
                variant: "destructive"
            });
            return;
        }

        if (remainingTotal < -0.0001) {
            toast({
                title: "Total Melebihi Saldo Valas",
                description: `Jumlah rincian tidak boleh melebihi saldo total ${targetCurr} Anda (${totalToAllocate.toLocaleString('en-US')} ${targetCurr}).`,
                variant: "destructive"
            });
            return;
        }

        // If there are more currencies, advance to the next step
        if (currentStep < unallocatedAssets.length - 1) {
            const nextStep = currentStep + 1;
            const nextAsset = unallocatedAssets[nextStep];
            const nextCurr = nextAsset.currency.toUpperCase();
            const nextPresets = getForexPresetsForCurrency(nextCurr);

            if (!entries[nextCurr]) {
                setEntries({
                    ...entries,
                    [nextCurr]: [
                        {
                            id: Date.now().toString(),
                            source: nextPresets[0]?.name || `Wise (${nextCurr})`,
                            isCustomSource: false,
                            balance: (nextAsset.remaining || nextAsset.amount || 0).toString()
                        }
                    ]
                });
            }
            setCurrentStep(nextStep);
            return;
        }

        // All currencies are configured, save everything to backend!
        setIsSubmitting(true);
        try {
            const allWS = ((user?.walletSources as any[]) || []);
            const newSources: any[] = [];

            // Compile all configured forex sources
            Object.keys(entries).forEach(currKey => {
                const currEntries = entries[currKey] || [];
                const currAsset = unallocatedAssets.find(a => a.currency.toUpperCase() === currKey);
                const currTotal = currAsset?.remaining || currAsset?.amount || 0;
                const currDistributed = currEntries.reduce((sum, e) => sum + (parseFormattedNumber(e.balance) || 0), 0);
                const currRemaining = Math.round((currTotal - currDistributed) * 10000) / 10000;

                currEntries.forEach(e => {
                    newSources.push({
                        id: e.id,
                        name: e.source.trim(),
                        isCustomSource: e.isCustomSource,
                        currency: currKey.toUpperCase(),
                        balance: parseFormattedNumber(e.balance) || 0,
                        type: 'valas'
                    });
                });

                // Auto-fill remaining if any
                if (currRemaining > 0.0001) {
                    newSources.push({
                        id: Date.now().toString() + "_" + currKey + "_rem",
                        name: `Dompet Utama (${currKey.toUpperCase()})`,
                        isCustomSource: true,
                        currency: currKey.toUpperCase(),
                        balance: currRemaining,
                        type: 'valas'
                    });
                }
            });

            // Merge with existing wallet sources (preserving IDR and other wallets)
            const combinedWalletSources = [...allWS, ...newSources];

            const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
            const res = await fetch("/api/user/wallet-sources", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": userEmail
                },
                body: JSON.stringify({ walletSources: combinedWalletSources })
            });

            if (!res.ok) throw new Error("Gagal menyimpan rincian rekening valas.");

            localStorage.setItem("bilano_forex_migration_completed", "true");
            toast({
                title: "Migrasi Rekening Valas Selesai! 🌍✨",
                description: "Semua saldo valas Anda telah berhasil dirincikan ke rekening masing-masing."
            });

            await refetchUser();
            queryClient.invalidateQueries();
            onComplete();
        } catch (e: any) {
            toast({ title: "Terjadi Kesalahan", description: e.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!activeAsset) return null;

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                
                {/* Header Banner Bilano Valas Theme */}
                <div className="p-6 bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white text-center rounded-t-[32px] border-b-[6px] border-brand-gold relative">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20 shadow-inner">
                        <Globe className="w-8 h-8 text-amber-300 stroke-[2.2]" />
                    </div>
                    
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-gold/20 border border-brand-gold/30 text-[10px] font-black uppercase tracking-wider mb-2 text-brand-gold">
                        <span>Pembaruan Multi-Rekening Valas</span>
                    </div>

                    <h2 className="text-xl font-black mb-1 tracking-tight">Rincikan Rekening Valas</h2>
                    <p className="text-xs text-blue-100/90 font-medium max-w-[320px] mx-auto leading-relaxed">
                        Sistem kini mendukung pemisahan rekening per mata uang. Masukkan rekening tempat Anda menyimpan saldo <strong className="text-amber-300">{totalToAllocate.toLocaleString('en-US')} {targetCurr}</strong> Anda.
                    </p>

                    {unallocatedAssets.length > 1 && (
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                            {unallocatedAssets.map((asset, idx) => (
                                <div
                                    key={asset.currency}
                                    className={`h-1.5 rounded-full transition-all ${
                                        idx === currentStep ? 'w-6 bg-brand-gold' : 'w-2 bg-white/30'
                                    }`}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto flex-1 bg-slate-50 space-y-4">
                    
                    {/* Status Alokasi Sisa Saldo */}
                    <div className={`sticky top-0 z-10 p-3.5 rounded-2xl flex justify-between items-center text-xs font-bold shadow-xs border transition-all ${
                        remainingTotal === 0 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                            : remainingTotal < 0 
                                ? 'bg-rose-50 border-rose-300 text-rose-800' 
                                : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                        <div className="flex items-center gap-2">
                            {remainingTotal === 0 ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            ) : (
                                <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                            )}
                            <span>{remainingTotal === 0 ? 'Semua saldo teralokasi pas' : 'Sisa untuk dirincikan:'}</span>
                        </div>
                        <span className="text-sm font-black tabular-nums">
                            {remainingTotal.toLocaleString('en-US')} {targetCurr}
                        </span>
                    </div>

                    {/* List Form Input Rekening */}
                    <div className="space-y-3.5">
                        {currentEntries.map((entry, index) => {
                            const logo = getWalletLogo(entry.source);
                            return (
                                <div key={entry.id} className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 relative space-y-3">
                                    {currentEntries.length > 1 && (
                                        <button 
                                            type="button"
                                            onClick={() => handleRemoveEntry(entry.id)} 
                                            className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                                            title="Hapus Rekening Ini"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                            Rekening {index + 1} ({targetCurr})
                                        </label>

                                        {/* Pilihan Preset Cepat */}
                                        <div className="grid grid-cols-2 gap-1.5 mb-2 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-150">
                                            {presets.map((preset) => (
                                                <button
                                                    key={preset.id}
                                                    type="button"
                                                    onClick={() => updateEntry(entry.id, 'source', preset.name)}
                                                    className={`text-left p-1.5 rounded-lg border text-[10px] font-bold transition-all truncate flex items-center gap-1.5 cursor-pointer ${
                                                        entry.source === preset.name 
                                                            ? 'bg-amber-100/90 border-amber-400 text-amber-950 ring-1 ring-amber-400' 
                                                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    <img src={preset.logo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                                                    <span className="truncate">{preset.name}</span>
                                                </button>
                                            ))}
                                        </div>

                                        <Input
                                            value={entry.source}
                                            onChange={(e) => updateEntry(entry.id, 'source', e.target.value)}
                                            placeholder={`Atau ketik nama rekening ${targetCurr}...`}
                                            className="h-11 text-xs font-bold bg-white border-slate-200 rounded-xl"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                            Saldo di Rekening Ini ({targetCurr})
                                        </label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={entry.balance}
                                            onChange={(e) => updateEntry(entry.id, 'balance', formatDecimalInput(e.target.value))}
                                            className="w-full h-11 px-3.5 font-black text-base bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-brand-navy focus:bg-white transition-all tabular-nums"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button 
                        type="button"
                        onClick={handleAddEntry} 
                        className="w-full flex items-center justify-center gap-2 h-12 border-2 border-dashed border-amber-300 bg-amber-50/50 text-amber-900 font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-amber-100/80 transition-all active:scale-95 cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-amber-700 stroke-[3]" />
                        <span>+ TAMBAH REKENING {targetCurr} LAINNYA</span>
                    </button>
                </div>

                {/* Footer Submit Button */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <button 
                        type="button"
                        onClick={handleNextOrSubmit} 
                        disabled={isSubmitting} 
                        className="w-full h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-black rounded-2xl shadow-sm active:scale-[0.98] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : currentStep < unallocatedAssets.length - 1 ? (
                            <>
                                <span>LANJUT KE MATA UANG BERIKUTNYA</span>
                                <ChevronRight className="w-4 h-4 stroke-[3]" />
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>SIMPAN & SELESAIKAN RINCIAN VALAS</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
