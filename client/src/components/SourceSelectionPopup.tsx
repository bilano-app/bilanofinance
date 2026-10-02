import { useState } from "react";
import { Button, Input } from "@/components/UIComponents";
import { 
    Wallet, X, ArrowDown, ArrowUp, Plus, Check, Loader2, 
    Sparkles, CheckCircle2, Globe, Building2, Smartphone, TrendingUp
} from "lucide-react";
import { useUser } from "@/hooks/use-finance";
import { getWalletLogo, getForexPresetsForCurrency } from "@/lib/wallet-sources";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import WalletSourceSelect from "@/components/WalletSourceSelect";

interface SourceSelectionPopupProps {
    type?: 'income' | 'expense' | 'piutang' | 'hutang';
    currency?: string; // e.g. 'IDR', 'USD', 'EUR', 'SGD'
    title?: string;
    description?: string;
    onSelect: (sourceName: string) => void;
    onCancel?: () => void;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function SourceSelectionPopup({ 
    type = 'income', 
    currency = 'IDR',
    title, 
    description, 
    onSelect, 
    onCancel, 
    isOpen, 
    onClose 
}: SourceSelectionPopupProps) {
    if (isOpen !== undefined && !isOpen) return null;
    const handleClose = onCancel || onClose || (() => {});

    const { data: user, refetch: refetchUser } = useUser();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const activeCurrency = (currency || 'IDR').toUpperCase();
    const isIDR = activeCurrency === 'IDR';

    const allWalletSources = ((user?.walletSources as any[]) || []);
    
    // Filter wallet sources strictly by matching currency
    const filteredWalletSources = allWalletSources.filter((w: any) => {
        const itemCurr = (w.currency || 'IDR').toUpperCase();
        return itemCurr === activeCurrency;
    });

    const [selected, setSelected] = useState("");
    
    // State untuk mode tambah dompet baru langsung di pop-up
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newSourceName, setNewSourceName] = useState("");
    const [isCustomSource, setIsCustomSource] = useState(false);
    const [isSavingNew, setIsSavingNew] = useState(false);

    const isIncome = type === 'income' || type === 'piutang';
    const defaultTitle = isIncome 
        ? (isIDR ? 'Pilih Dompet Penerima Rupiah' : `Pilih Rekening Penerima ${activeCurrency}`)
        : (isIDR ? 'Pilih Dompet Asal Rupiah' : `Pilih Rekening Asal ${activeCurrency}`);
    const defaultDesc = isIncome 
        ? `Dana ${activeCurrency} akan masuk dan menambah saldo di rekening mana?` 
        : `Dana ${activeCurrency} akan ditarik dan memotong saldo di rekening mana?`;

    const forexPresets = !isIDR ? getForexPresetsForCurrency(activeCurrency) : [];

    const handleCreateAndSelectNew = async () => {
        const nameToSave = newSourceName.trim();
        if (!nameToSave) {
            toast({ title: "Nama Rekening Kosong", description: "Pilih atau ketikkan nama rekening baru.", variant: "destructive" });
            return;
        }

        // Cek duplikasi di mata uang yang sama
        const existing = filteredWalletSources.find(w => w.name.toLowerCase() === nameToSave.toLowerCase());
        if (existing) {
            setSelected(existing.name);
            setIsCreatingNew(false);
            onSelect(existing.name);
            return;
        }

        setIsSavingNew(true);
        try {
            const updatedSources = [
                ...allWalletSources,
                {
                    id: Date.now().toString(),
                    name: nameToSave,
                    isCustomSource: isCustomSource,
                    currency: activeCurrency,
                    balance: 0
                }
            ];

            const userEmail = localStorage.getItem("bilano_email") || "";
            const res = await fetch("/api/user/wallet-sources", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": userEmail
                },
                body: JSON.stringify({ walletSources: updatedSources })
            });

            if (res.ok) {
                toast({ 
                    title: `Rekening ${activeCurrency} Ditambahkan! ✨`, 
                    description: `${nameToSave} siap digunakan untuk transaksi ${activeCurrency}.` 
                });
                await refetchUser();
                queryClient.invalidateQueries();
                setIsCreatingNew(false);
                setSelected(nameToSave);
                onSelect(nameToSave);
            } else {
                toast({ title: "Gagal Menambahkan", variant: "destructive" });
            }
        } catch (e) {
            toast({ title: "Error Koneksi", variant: "destructive" });
        } finally {
            setIsSavingNew(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[32px] w-full max-w-sm shadow-2xl border border-slate-150 flex flex-col overflow-hidden relative animate-in zoom-in-95">
                
                {/* Tombol Tutup */}
                <button 
                    onClick={handleClose} 
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10 text-white cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Banner */}
                <div className={`p-6 text-white text-center relative ${
                    isIncome 
                        ? (isIDR ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-emerald-700 via-teal-800 to-cyan-900') 
                        : (isIDR ? 'bg-gradient-to-br from-rose-600 to-red-700' : 'bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B]')
                }`}>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
                        {!isIDR ? (
                            <Globe className="w-7 h-7 stroke-[2.2] text-amber-300" />
                        ) : isIncome ? (
                            <ArrowDown className="w-7 h-7 stroke-[2.5]" />
                        ) : (
                            <ArrowUp className="w-7 h-7 stroke-[2.5]" />
                        )}
                    </div>
                    
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-[10px] font-black uppercase tracking-wider mb-1.5 text-amber-200">
                        <span>Mata Uang: {activeCurrency}</span>
                    </div>

                    <h2 className="text-xl font-black mb-0.5 tracking-tight">{title || defaultTitle}</h2>
                    <p className="text-xs text-white/90 font-medium max-w-[250px] mx-auto leading-relaxed">
                        {description || defaultDesc}
                    </p>
                </div>

                {/* Content Body */}
                <div className="p-4 max-h-[52vh] overflow-y-auto space-y-2.5 bg-slate-50">
                    
                    {/* OPSI BUAT SUMBER BARU */}
                    {!isCreatingNew ? (
                        <button
                            type="button"
                            onClick={() => setIsCreatingNew(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100/80 border border-dashed border-amber-300 rounded-2xl text-amber-900 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer mb-2"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5] text-amber-700" />
                            <span>+ TAMBAH REKENING {activeCurrency} BARU</span>
                        </button>
                    ) : (
                        /* BOX FORM BUAT AKUN / REKENING BARU SECARA INLINE */
                        <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-xs space-y-3 animate-in fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <Wallet className="w-4 h-4 text-amber-600" />
                                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                        Tambah Rekening {activeCurrency}
                                    </h4>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setIsCreatingNew(false)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    Batal
                                </button>
                            </div>

                            {isIDR ? (
                                <WalletSourceSelect
                                    value={newSourceName}
                                    isCustom={isCustomSource}
                                    onChange={(val, isCustom) => {
                                        setNewSourceName(val);
                                        setIsCustomSource(!!isCustom);
                                    }}
                                    placeholder="Pilih Bank / E-Wallet / Sekuritas..."
                                />
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Pilihan Preset Rekening Valas:
                                    </p>
                                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                                        {forexPresets.map((preset) => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => {
                                                    setNewSourceName(preset.name);
                                                    setIsCustomSource(false);
                                                }}
                                                className={`text-left p-2 rounded-lg border text-[11px] font-bold transition-all truncate flex items-center gap-1.5 cursor-pointer ${
                                                    newSourceName === preset.name 
                                                        ? 'bg-amber-100/80 border-amber-300 text-amber-900 ring-1 ring-amber-400' 
                                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                                }`}
                                            >
                                                <img src={preset.logo} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
                                                <span className="truncate">{preset.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <Input
                                        value={newSourceName}
                                        onChange={(e) => {
                                            setNewSourceName(e.target.value);
                                            setIsCustomSource(true);
                                        }}
                                        placeholder={`Atau ketik nama rekening / dompet ${activeCurrency}...`}
                                        className="h-11 text-xs font-semibold bg-white border-slate-200 rounded-xl"
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleCreateAndSelectNew}
                                disabled={isSavingNew || !newSourceName.trim()}
                                className="w-full h-12 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isSavingNew ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                )}
                                <span>SIMPAN & PILIH REKENING INI</span>
                            </button>
                        </div>
                    )}

                    {/* LIST REKENING TERDAFTAR SESUAI MATA UANG */}
                    {filteredWalletSources.length > 0 ? (
                        filteredWalletSources.map((wallet) => {
                            const logo = getWalletLogo(wallet.name);
                            const isSelected = selected === wallet.name;
                            const bal = Number(wallet.balance || 0);
                            return (
                                <button
                                    key={wallet.name}
                                    type="button"
                                    onClick={() => setSelected(wallet.name)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left cursor-pointer ${
                                        isSelected 
                                            ? 'border-brand-navy bg-white shadow-xs ring-2 ring-brand-navy/20' 
                                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center p-2 shadow-xs border shrink-0 ${
                                            isSelected ? 'bg-white border-brand-navy' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            {logo ? (
                                                <img src={logo} alt={wallet.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Wallet className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                                                {wallet.name}
                                            </div>
                                            <div className="text-[11px] text-slate-500 font-medium mt-0.5 tabular-nums">
                                                Saldo: {isIDR ? `Rp ${bal.toLocaleString('id-ID')}` : `${activeCurrency} ${bal.toLocaleString('en-US')}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                        isSelected ? 'border-brand-navy bg-brand-gold' : 'border-slate-300'
                                    }`}>
                                        {isSelected && <div className="w-2 h-2 bg-brand-navy rounded-full" />}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="text-center p-5 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium space-y-1">
                            <p className="font-bold text-slate-700">Belum ada rekening {activeCurrency} terdaftar</p>
                            <p className="text-[11px] text-slate-400">
                                Klik tombol <strong>+ TAMBAH REKENING {activeCurrency}</strong> di atas untuk membuat kantong/rekening {activeCurrency} pertama Anda.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Action Button */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <button 
                        type="button"
                        onClick={() => selected && onSelect(selected)} 
                        disabled={!selected} 
                        className={`w-full h-14 font-black rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center ${
                            isIncome ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-brand-navy hover:bg-[#152e55] text-brand-gold'
                        }`}
                    >
                        PILIH REKENING INI
                    </button>
                </div>
            </div>
        </div>
    );
}
