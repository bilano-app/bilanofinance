import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Target as TargetIcon, ShieldCheck, PiggyBank, Calculator, 
    Plus, Trash2, X, ListPlus, ShieldAlert, Loader2, Wallet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { useQuery } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";

interface TargetData {
    id: number;
    targetAmount: number;
    durationMonths: number;
    monthlyBudget: number;
    budgetType: 'static' | 'rollover';
    startMonth?: number;
    startYear?: number;
}

interface ExpenseItem { id: number; name: string; amount: number; }

const formatNumber = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.toString().replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

export default function Target() {
    const [, setLocation] = useLocation(); 
    const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useUser();
    const [target, setTarget] = useState<TargetData | null>(null);
    
    // 🚀 Alur baru: Memulai langsung dari pengisian Saldo Kas Awal saja
    const [step, setStep] = useState<'balance-entry' | 'intro' | 'target-input' | 'budget-ask' | 'budget-setup'>('balance-entry');
    const [isTargetMode, setIsTargetMode] = useState(false); 
    
    const [rawCurrentCash, setRawCurrentCash] = useState("");
    const [rawTargetAmount, setRawTargetAmount] = useState("");
    const [inputDuration, setInputDuration] = useState(""); 
    const [rawBudgetAmount, setRawBudgetAmount] = useState("");
    const [budgetType, setBudgetType] = useState<'static' | 'rollover'>('static');

    const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
    const [breakdownItems, setBreakdownItems] = useState<ExpenseItem[]>([]);
    const [newItemName, setNewItemName] = useState("");
    const [newItemAmount, setNewItemAmount] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false); 

    const { toast } = useToast();
    const now = new Date();

    const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

    const { data: fetchedTarget } = useQuery({
        queryKey: ['target', userEmail],
        queryFn: async () => {
            const res = await fetch(`/api/target`, { headers: { "x-user-email": userEmail }});
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!userEmail,
        retry: false,
        staleTime: 1000 * 60 * 5
    });

    useEffect(() => {
        if (fetchedTarget && fetchedTarget.targetAmount !== undefined) {
            setTarget(fetchedTarget);
            setRawTargetAmount(fetchedTarget.targetAmount.toString());
            setInputDuration(fetchedTarget.durationMonths.toString());
            setRawBudgetAmount(fetchedTarget.monthlyBudget.toString());
            setBudgetType(fetchedTarget.budgetType);
        }
    }, [fetchedTarget]);

    useEffect(() => {
        if (userData && userData.cashBalance !== undefined && userData.cashBalance !== null && !rawCurrentCash) {
            setRawCurrentCash(userData.cashBalance.toString());
        }
    }, [userData, rawCurrentCash]);

    const isEditMode = target && target.targetAmount !== undefined;

    // 🔥 FIX: Menghapus bug angka nol di depan secara otomatis (Mencegah format '030.000.000')
    const handleNumberChange = (setter: (val: string) => void, value: string) => {
        let clean = value.replace(/\D/g, '');
        if (clean.length > 1) {
            clean = clean.replace(/^0+/, ''); 
        }
        setter(formatNumber(clean));
    };

    const addBreakdownItem = () => {
        if (!newItemName || !newItemAmount) return;
        setBreakdownItems([...breakdownItems, { id: Date.now(), name: newItemName, amount: parseNumber(newItemAmount) }]);
        setNewItemName(""); setNewItemAmount("");
    };

    const removeBreakdownItem = (id: number) => { 
        setBreakdownItems(breakdownItems.filter(item => item.id !== id)); 
    };

    const saveBreakdownTotal = () => {
        const total = breakdownItems.reduce((acc, item) => acc + item.amount, 0);
        setRawBudgetAmount(total.toString()); 
        setIsBreakdownOpen(false);
        toast({ title: "Terhitung!", description: `Budget diset ke ${formatRp(total)}` });
    };

    const breakdownTotal = breakdownItems.reduce((acc, item) => acc + item.amount, 0);

    const startSetup = async (mode: 'target' | 'saving') => {
        setIsTargetMode(mode === 'target');
        if (!isEditMode) {
            if (mode === 'saving') { 
                setRawTargetAmount("0"); 
                setInputDuration("12"); 
            } else { 
                setRawTargetAmount(""); 
                setInputDuration(""); 
            }
        }
        
        if (mode === 'target') setStep('target-input');
        else setStep('budget-ask');
    };
    
    const nextToBudgetAsk = () => { 
        if (!parseNumber(rawTargetAmount) || !Number(inputDuration)) { 
            toast({title: "Data Kurang", description: "Nominal Target & Durasi wajib diisi.", variant: "destructive"}); 
            return; 
        } 
        setStep('budget-ask'); 
    };

    const handleBudgetAnswer = (answer: boolean) => { 
        if (answer) setStep('budget-setup'); 
        else handleSubmitFinal(false); 
    };

    const handleSubmitFinal = async (withBudget: boolean) => {
        const budgetVal = parseNumber(rawBudgetAmount);
        if (withBudget && !budgetVal) { 
            toast({title: "Error", description: "Nominal batas harus diisi!", variant: "destructive"}); 
            return; 
        }

        setIsSubmitting(true);

        try {
            const payload = {
                addCurrentCash: parseNumber(rawCurrentCash) || 0,
                targetAmount: parseNumber(rawTargetAmount) || 0,
                durationMonths: Number(inputDuration) || 12,
                monthlyBudget: withBudget ? budgetVal : 0,
                budgetType: withBudget ? budgetType : 'static',
                startMonth: target?.startMonth || now.getMonth() + 1,
                startYear: target?.startYear || now.getFullYear()
            };

            const res = await fetch("/api/target", {
                method: "POST", 
                headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                trackEvent("target_setup_completed", { 
                    budgetType: withBudget ? budgetType : 'none',
                    isEditMode: isEditMode
                });
                
                await refetchUser();
                toast({ title: isEditMode ? "Target Diupdate!" : "Strategi Dibuat!", description: "Sistem telah menyesuaikan saldo kas dan target Anda." });
                
                // 🚀 Transaksi super cepat dan instan menuju Home menggunakan hard reload ringan
                window.location.href = "/"; 
            } else { 
                const errText = await res.text();
                toast({ title: "Gagal Menyimpan", description: errText || "Kesalahan server.", variant: "destructive" }); 
            }
        } catch (e) { 
            toast({ title: "Error Koneksi", description: "Periksa jaringan internet Anda.", variant: "destructive" }); 
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500"/>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Menyiapkan Lembar Strategi...</p>
            </div>
        );
    }

    return (
        <MobileLayout title={isEditMode ? "Edit Strategi & Target" : "Atur Strategi Baru"} showBack>
            <div className="space-y-6 pt-4 px-2 pb-20">
                
                {/* MODAL RINCIAN ESTIMASI PENGELUARAN */}
                {isBreakdownOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in p-4">
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 border border-slate-100">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><ListPlus className="w-5 h-5 text-indigo-600"/> Rincian Pengeluaran</h3>
                                <button onClick={() => setIsBreakdownOpen(false)} className="p-1.5 bg-slate-100 rounded-full hover:bg-rose-100 hover:text-rose-600"><X className="w-5 h-5"/></button>
                            </div>
                            <div className="space-y-3 mb-4">
                                <div className="flex gap-2">
                                    <Input placeholder="Nama (Cth: Makan)" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-1 text-sm h-12 rounded-[16px]"/>
                                    <Input placeholder="Rp" value={newItemAmount} onChange={(e) => handleNumberChange(setNewItemAmount, e.target.value)} className="w-24 text-sm h-12 font-bold rounded-[16px]"/>
                                    <button onClick={addBreakdownItem} className="bg-indigo-600 text-white w-12 h-12 flex items-center justify-center rounded-[16px] hover:bg-indigo-700 shadow-md"><Plus className="w-5 h-5"/></button>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
                                    {breakdownItems.length === 0 && (<div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200"><p className="text-xs text-slate-400">Belum ada item rincian.</p></div>)}
                                    {breakdownItems.map((item) => (
                                        <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-[16px] border border-slate-100 group"><span className="text-sm font-medium text-slate-700 pl-1">{item.name}</span><div className="flex items-center gap-3"><span className="text-sm font-bold text-slate-900">{formatRp(item.amount)}</span><button onClick={() => removeBreakdownItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4"/></button></div></div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-slate-900 text-white p-4 rounded-[20px] flex justify-between items-center mb-4 shadow-lg"><span className="text-xs text-slate-300 font-medium">Total Estimasi</span><span className="font-bold text-lg text-emerald-400">{formatRp(breakdownTotal)}</span></div>
                            <Button onClick={saveBreakdownTotal} className="w-full bg-emerald-500 hover:bg-emerald-600 h-14 font-extrabold shadow-md rounded-full">GUNAKAN TOTAL INI</Button>
                        </div>
                    </div>
                )}

                {/* STEP 1: HALAMAN SALDO AWAL (SEKARANG MANDIRI & PERTAMA KALI MASUK) */}
                {step === 'balance-entry' && (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 pt-4">
                        <div className="bg-gradient-to-br from-[#0a1128] to-[#121c3a] p-8 rounded-[32px] text-white text-center shadow-2xl border border-blue-500/20">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                                <Wallet className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-black mb-2">Saldo Kas Awal</h2>
                            <p className="text-sm text-slate-400">Berapa uang tunai / saldo bank yang Anda miliki saat ini untuk dikawal?</p>
                        </div>

                        <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-200">
                            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-1 block mb-3 text-center">Nominal Rupiah (IDR)</label>
                            <Input 
                                type="tel"
                                placeholder="0" 
                                value={rawCurrentCash} 
                                onChange={(e) => handleNumberChange(setRawCurrentCash, e.target.value)} 
                                className="font-black text-slate-800 h-16 rounded-2xl border-slate-200 text-3xl text-center focus:border-indigo-500 transition-all shadow-inner"
                            />
                        </div>

                        <Button 
                            onClick={() => setStep('intro')} 
                            className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-black rounded-full shadow-lg shadow-indigo-200 transition-transform active:scale-95"
                        >
                            LANJUTKAN
                        </Button>
                    </div>
                )}

                {/* STEP 2: PILIHAN METODE / INTRO */}
                {step === 'intro' && (
                    <div className="space-y-5 animate-in slide-in-from-right">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[32px] text-white text-center shadow-xl relative overflow-hidden">
                            <h2 className="text-2xl font-extrabold mb-1">Pilih Arsitektur Keuangan</h2>
                            <p className="text-sm text-blue-100">Tentukan metode pemantauan visi aset jangka panjangmu.</p>
                        </div>
                        
                        <div className="space-y-4 pt-2">
                            <button onClick={() => startSetup('target')} className="relative w-full text-left p-5 border-2 border-indigo-200 rounded-[24px] hover:border-indigo-400 hover:bg-indigo-50/50 bg-indigo-50/30 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-start gap-4 group">
                                <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md border border-yellow-300">
                                    Direkomendasikan
                                </div>
                                <div className="bg-indigo-100 p-3 rounded-full group-hover:scale-110 transition-transform flex-shrink-0"><TargetIcon className="w-6 h-6 text-indigo-600"/></div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-lg mb-0.5">Kejar Target / Menabung</h3>
                                    <p className="text-xs text-slate-500">Saya punya impian angka nominal spesifik yang ingin dicapai.</p>
                                </div>
                            </button>

                            <button onClick={() => startSetup('saving')} className="w-full text-left p-5 border border-slate-100 rounded-[24px] hover:border-emerald-400 hover:bg-emerald-50/50 transition-all bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group mt-2">
                                <div className="bg-emerald-100 p-3 rounded-full group-hover:scale-110 transition-transform flex-shrink-0"><PiggyBank className="w-6 h-6 text-emerald-600"/></div>
                                <div><h3 className="font-extrabold text-slate-800 text-lg mb-0.5">Hanya Pantau Cashflow</h3><p className="text-xs text-slate-500">Saya ingin melihat keluar masuk uang harian secara bebas.</p></div>
                            </button>
                        </div>
                        <Button variant="ghost" onClick={() => setStep('balance-entry')} className="w-full text-slate-400 font-bold">KEMBALI KE SALDO AWAL</Button>
                    </div>
                )}

                {/* STEP 3: INPUT DETAIL TARGET */}
                {step === 'target-input' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 text-center">
                            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                                <Calculator className="w-7 h-7 text-indigo-500"/> 
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-xl">Kalkulator Target</h3>
                                <p className="text-xs text-slate-500 mt-1">Berapa besar nominal impian besarmu?</p>
                            </div>
                            <div className="space-y-4 text-left">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Target Nominal (Rp)</label>
                                    <Input type="tel" placeholder="100.000.000" value={rawTargetAmount} onChange={(e) => handleNumberChange(setRawTargetAmount, e.target.value)} className="h-16 text-2xl font-extrabold text-indigo-600 bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-[20px] text-center"/>
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Dicapai Dalam (Bulan)</label>
                                    <Input type="number" placeholder="12" value={inputDuration} onChange={e => setInputDuration(e.target.value)} className="h-14 font-bold text-lg bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500 rounded-[20px] text-center"/>
                                </div>
                            </div>
                        </div>
                        <div className="pt-2 space-y-3">
                            <Button onClick={nextToBudgetAsk} className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 text-lg font-extrabold rounded-full shadow-lg shadow-indigo-200">LANJUTKAN</Button>
                            <Button variant="ghost" onClick={() => setStep('intro')} className="w-full text-slate-400 font-bold">KEMBALI</Button>
                        </div>
                    </div>
                )}

                {/* STEP 4: PERTANYAAN PEMBATASAN BUDGET */}
                {step === 'budget-ask' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-6">
                        <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center">
                            <div className="bg-rose-50 p-5 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
                                <ShieldCheck className="w-10 h-10 text-rose-500"/>
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-800">Batasi Pengeluaran Bulanan?</h2>
                            <p className="text-slate-500 text-sm mt-3 leading-relaxed">Aktifkan batas darurat otomatis agar arus kasmu tidak bocor halus.</p>
                            
                            <div className="space-y-3 pt-8">
                                <Button onClick={() => handleBudgetAnswer(true)} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-lg font-extrabold rounded-full shadow-lg">YA, PASANG BATAS</Button>
                                <Button onClick={() => handleBudgetAnswer(false)} variant="outline" className="w-full h-14 text-slate-500 border-slate-200 hover:bg-slate-50 font-bold rounded-full">TIDAK, SAYA BEBAS</Button>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => isTargetMode ? setStep('target-input') : setStep('intro')} className="w-full text-sm text-slate-400 font-bold mt-2">KEMBALI</Button>
                    </div>
                )}

                {/* STEP 5: PENGATURAN LIMIT BUDGET & ROLLOVER */}
                {step === 'budget-setup' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
                            <div className="text-center pb-2 border-b border-slate-100">
                                <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <ShieldAlert className="w-7 h-7 text-rose-500"/>
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-xl">Atur Batasan Jatah</h3>
                                <p className="text-xs text-slate-500 mt-1">Maksimal uang keluar per bulan.</p>
                            </div>
                            
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Nominal Batas (Rp)</label>
                                <Input type="tel" placeholder="1.500.000" value={rawBudgetAmount} onChange={(e) => handleNumberChange(setRawBudgetAmount, e.target.value)} className="h-16 text-2xl font-black text-center bg-slate-50 border-transparent focus:bg-white focus:border-rose-500 rounded-[20px]"/>
                                <button onClick={() => setIsBreakdownOpen(true)} className="mt-4 text-xs font-bold text-indigo-500 bg-indigo-50 p-3 rounded-[16px] w-full flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"><Calculator className="w-4 h-4"/> BANTU SAYA HITUNG RINCIAN</button>
                            </div>

                            <div className="space-y-3 pt-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Metode Sisa Budget</label>
                                <button onClick={() => setBudgetType('static')} className={`w-full text-left p-4 rounded-[20px] border-2 transition-all flex gap-4 items-start ${budgetType === 'static' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                                    <div className={`w-5 h-5 rounded-full border-4 mt-0.5 flex-shrink-0 ${budgetType === 'static' ? 'border-indigo-600 bg-white' : 'border-slate-200'}`}></div>
                                    <div><div className="font-extrabold text-sm text-slate-800 mb-0.5">Hangus / Ditabung (Statis)</div><div className="text-[11px] text-slate-500 leading-relaxed">Sisa budget bulan ini tidak ditambahkan ke bulan depan.</div></div>
                                </button>
                                <button onClick={() => setBudgetType('rollover')} className={`w-full text-left p-4 rounded-[20px] border-2 transition-all flex gap-4 items-start ${budgetType === 'rollover' ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}>
                                    <div className={`w-5 h-5 rounded-full border-4 mt-0.5 flex-shrink-0 ${budgetType === 'rollover' ? 'border-indigo-600 bg-white' : 'border-slate-200'}`}></div>
                                    <div><div className="font-extrabold text-sm text-slate-800 mb-0.5">Akumulasi (Rollover)</div><div className="text-[11px] text-slate-500 leading-relaxed">Sisa budget bulan ini akan ditambahkan otomatis ke jatah bulan depan.</div></div>
                                </button>
                            </div>
                        </div>
                        <div className="pt-2 space-y-3">
                            <Button 
                                onClick={() => handleSubmitFinal(true)} 
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 hover:bg-slate-800 h-16 text-lg font-extrabold rounded-full shadow-lg shadow-slate-900/20"
                            >
                                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : (isEditMode ? "SIMPAN PERUBAHAN" : "SIMPAN STRATEGI")}
                            </Button>
                            <Button variant="ghost" onClick={() => setStep('budget-ask')} className="w-full text-slate-400 font-bold">KEMBALI</Button>
                        </div>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}