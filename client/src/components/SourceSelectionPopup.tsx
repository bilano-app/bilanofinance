import { useState } from "react";
import { Button, Input } from "@/components/UIComponents";
import { 
    Wallet, X, ArrowDown, ArrowUp, Plus, Check, Loader2, 
    Sparkles, CheckCircle2 
} from "lucide-react";
import { useUser } from "@/hooks/use-finance";
import { getWalletLogo } from "@/lib/wallet-sources";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import WalletSourceSelect from "@/components/WalletSourceSelect";

interface SourceSelectionPopupProps {
    type: 'income' | 'expense' | 'piutang' | 'hutang';
    title?: string;
    description?: string;
    onSelect: (sourceName: string) => void;
    onCancel: () => void;
}

export default function SourceSelectionPopup({ type, title, description, onSelect, onCancel }: SourceSelectionPopupProps) {
    const { data: user, refetch: refetchUser } = useUser();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    
    const walletSources = (user?.walletSources as any[]) || [];
    const [selected, setSelected] = useState("");
    
    // State untuk mode tambah dompet baru langsung di pop-up
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newSourceName, setNewSourceName] = useState("");
    const [isCustomSource, setIsCustomSource] = useState(false);
    const [isSavingNew, setIsSavingNew] = useState(false);

    const isIncome = type === 'income' || type === 'piutang';
    const defaultTitle = isIncome ? 'Pilih Dompet Penerima' : 'Pilih Dompet Asal';
    const defaultDesc = isIncome ? 'Dana ini akan masuk dan menambah saldo di dompet mana?' : 'Dana ini akan diambil dan memotong saldo di dompet mana?';

    const handleCreateAndSelectNew = async () => {
        const nameToSave = newSourceName.trim();
        if (!nameToSave) {
            toast({ title: "Nama Dompet Kosong", description: "Pilih atau ketikkan nama dompet baru.", variant: "destructive" });
            return;
        }

        // Cek duplikasi
        const existing = walletSources.find(w => w.name.toLowerCase() === nameToSave.toLowerCase());
        if (existing) {
            setSelected(existing.name);
            setIsCreatingNew(false);
            onSelect(existing.name);
            return;
        }

        setIsSavingNew(true);
        try {
            const updatedSources = [
                ...walletSources,
                {
                    id: Date.now().toString(),
                    name: nameToSave,
                    isCustomSource: isCustomSource,
                    currency: 'IDR',
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
                toast({ title: "Dompet Baru Ditambahkan! ✨", description: `${nameToSave} siap digunakan.` });
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
                    onClick={onCancel} 
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors z-10 text-white cursor-pointer"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Banner */}
                <div className={`p-6 text-white text-center relative ${
                    isIncome ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-rose-600 to-red-700'
                }`}>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/30 shadow-inner">
                        {isIncome ? <ArrowDown className="w-7 h-7 stroke-[2.5]" /> : <ArrowUp className="w-7 h-7 stroke-[2.5]" />}
                    </div>
                    <h2 className="text-xl font-black mb-0.5 tracking-tight">{title || defaultTitle}</h2>
                    <p className="text-xs text-white/90 font-medium max-w-[240px] mx-auto leading-relaxed">
                        {description || defaultDesc}
                    </p>
                </div>

                {/* Content Body */}
                <div className="p-4 max-h-[52vh] overflow-y-auto space-y-2.5 bg-slate-50">
                    
                    {/* KHUSUS PEMASUKAN / PENAMBAHAN SALDO: OPSI BUAT SUMBER BARU TANPA KELUAR HALAMAN */}
                    {isIncome && !isCreatingNew && (
                        <button
                            type="button"
                            onClick={() => setIsCreatingNew(true)}
                            className="w-full flex items-center justify-center gap-2 p-3 bg-amber-50 hover:bg-amber-100/80 border border-dashed border-amber-300 rounded-2xl text-amber-900 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xs cursor-pointer mb-2"
                        >
                            <Plus className="w-4 h-4 stroke-[2.5] text-amber-700" />
                            <span>+ BUAT AKUN / DOMPET BARU</span>
                        </button>
                    )}

                    {/* BOX FORM BUAT AKUN BARU SECARA INLINE */}
                    {isIncome && isCreatingNew && (
                        <div className="bg-white p-4 rounded-2xl border border-amber-300 shadow-xs space-y-3 animate-in fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                <div className="flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-600 fill-current" />
                                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Tambah Dompet Baru</h4>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setIsCreatingNew(false)}
                                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                                >
                                    Batal
                                </button>
                            </div>

                            <WalletSourceSelect
                                value={newSourceName}
                                isCustom={isCustomSource}
                                onChange={(val, isCustom) => {
                                    setNewSourceName(val);
                                    setIsCustomSource(!!isCustom);
                                }}
                                placeholder="Pilih Bank / E-Wallet / Sekuritas..."
                            />

                            <button
                                type="button"
                                onClick={handleCreateAndSelectNew}
                                disabled={isSavingNew || !newSourceName.trim()}
                                className="w-full h-11 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-bold text-xs uppercase tracking-wider rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isSavingNew ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Check className="w-4 h-4 stroke-[2.5]" />
                                )}
                                <span>SIMPAN & PILIH DOMPET INI</span>
                            </button>
                        </div>
                    )}

                    {/* LIST DOMPET TERDAFTAR */}
                    {walletSources.length > 0 ? (
                        walletSources.map((wallet) => {
                            const logo = getWalletLogo(wallet.name);
                            const isSelected = selected === wallet.name;
                            return (
                                <button
                                    key={wallet.name}
                                    type="button"
                                    onClick={() => setSelected(wallet.name)}
                                    className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                                        isSelected 
                                            ? 'border-brand-navy bg-white shadow-xs ring-1 ring-brand-navy' 
                                            : 'border-slate-200/80 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center p-1.5 shadow-xs border ${
                                            isSelected ? 'bg-white border-brand-navy' : 'bg-slate-50 border-slate-200'
                                        }`}>
                                            {logo ? (
                                                <img src={logo} alt={wallet.name} className="w-full h-full object-contain" />
                                            ) : (
                                                <Wallet className="w-5 h-5 text-slate-500" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-extrabold text-slate-900 text-xs sm:text-sm">{wallet.name}</div>
                                            <div className="text-[11px] text-slate-500 font-medium">
                                                Saldo: Rp {Number(wallet.balance || 0).toLocaleString('id-ID')}
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
                        <div className="text-center p-5 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 font-medium">
                            Belum ada dompet terdaftar. Klik tombol di atas untuk membuat akun dompet baru.
                        </div>
                    )}
                </div>

                {/* Footer Action Button */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <button 
                        type="button"
                        onClick={() => selected && onSelect(selected)} 
                        disabled={!selected} 
                        className={`w-full h-13 font-bold rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all text-xs uppercase tracking-wider cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isIncome ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-brand-navy hover:bg-[#152e55] text-brand-gold'
                        }`}
                    >
                        PILIH DOMPET INI
                    </button>
                </div>
            </div>
        </div>
    );
}
