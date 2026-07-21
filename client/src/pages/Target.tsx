import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Target as TargetIcon, ShieldCheck, PiggyBank, Calculator, 
    Plus, Trash2, X, ListPlus, ShieldAlert, Loader2, UserRound
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
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

export default function Target() {
    const [, setLocation] = useLocation(); 
    const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useUser();
    const [target, setTarget] = useState<TargetData | null>(null);
    
    const [step, setStep] = useState<'intro' | 'target-input' | 'budget-ask' | 'budget-setup'>('intro');
    const [isTargetMode, setIsTargetMode] = useState(false); 
    
    // State baru untuk input nama lengkap di awal
    const [fullName, setFullName] = useState("");
    
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

    const handleNumberChange = (setter: (val: string) => void, value: string) => setter(formatNumber(value));
    const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

    const { data: fetchedTarget, isLoading: isTargetLoading } = useQuery({
        queryKey: ['target', userEmail],
        queryFn: async () => {
            const res = await fetch(`/api/target`, { headers: { "x-user-email": userEmail }});
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!userEmail
    });

    useEffect(() => {
        if (fetchedTarget && fetchedTarget.targetAmount !== undefined) {
            setTarget(fetchedTarget);
            setRawTargetAmount(fetchedTarget.targetAmount.toString());
            setInputDuration(fetchedTarget.durationMonths.toString());
            setRawBudgetAmount(fetchedTarget.monthlyBudget.toString());
            setBudgetType(fetchedTarget.budgetType);
        }
        if (userData) {
            setFullName(`${userData.firstName || ""} ${userData.lastName || ""}`.trim());
        }
    }, [fetchedTarget, userData]);

    const isEditMode = target && target.targetAmount !== undefined;

    const addBreakdownItem = () => {
        if (!newItemName || !newItemAmount) return;
        setBreakdownItems([...breakdownItems, { id: Date.now(), name: newItemName, amount: parseNumber(newItemAmount) }]);
        setNewItemName(""); setNewItemAmount("");
    };
    const removeBreakdownItem = (id: number) => { setBreakdownItems(breakdownItems.filter(item => item.id !== id)); };
    const saveBreakdownTotal = () => {
        const total = breakdownItems.reduce((acc, item) => acc + item.amount, 0);
        setRawBudgetAmount(total.toString()); setIsBreakdownOpen(false);
        toast({ title: "Terhitung!", description: `Budget diset ke ${formatRp(total)}` });
    };
    const breakdownTotal = breakdownItems.reduce((acc, item) => acc + item.amount, 0);

    const startSetup = async (mode: 'target' | 'saving') => {
        if (!fullName.trim()) {
            toast({
                title: "Nama Wajib Diisi",
                description: "Silakan isi Nama Lengkap Anda terlebih dahulu untuk profil utama.",
                variant: "destructive"
            });
            return;
        }

        setIsTargetMode(mode === 'target');
        if (!isEditMode) {
            if (mode === 'saving') { setRawTargetAmount("0"); setInputDuration("12"); } 
            else { setRawTargetAmount(""); setInputDuration(""); }
        }
        
        if (mode === 'target') {
            setStep('target-input');
        } else {
            setStep('budget-ask');
        }
    };
    
    const nextToBudgetAsk = () => { 
        if (!parseNumber(rawTargetAmount) || !Number(inputDuration)) { toast({title: "Data Kurang", description: "Nominal & Durasi wajib diisi.", variant: "destructive"}); return; } 
        setStep('budget-ask'); 
    };

    const handleBudgetAnswer = (answer: boolean) => { 
        if (answer) setStep('budget-setup'); 
        else handleSubmitFinal(false); 
    };

    const handleSubmitFinal = async (withBudget: boolean) => {
        const budgetVal = parseNumber(rawBudgetAmount);
        if (withBudget && !budgetVal) { toast({title: "Error", description: "Nominal batas harus diisi!", variant: "destructive"}); return; }

        setIsSubmitting(true);

        try {
            // Split nama menjadi nama depan & nama belakang
            const nameParts = fullName.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ");

            // Simpan perubahan profil nama terlebih dahulu
            await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { 
                    "Content-Type": "application/json",
                    "x-user-email": userEmail 
                },
                body: JSON.stringify({ firstName, lastName })
            });

            const payload = {
                targetAmount: parseNumber(rawTargetAmount) || 0,
                durationMonths: Number(inputDuration) || 12,
                monthlyBudget: withBudget ? budgetVal : 0,
                budgetType: withBudget ? budgetType : 'static',
                startMonth: target?.startMonth || now.getMonth() + 1,
                startYear: target?.startYear || now.getFullYear()
            };

            const res = await fetch("/api/target", {
                method: "POST", headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                trackEvent("target_setup_completed", { 
                    budgetType: withBudget ? budgetType : 'none',
                    isEditMode: isEditMode
                });
                
                await refetchUser();
                toast({ title: isEditMode ? "Target Diupdate!" : "Strategi Dibuat!", description: "Sistem telah menyesuaikan profil dan target Anda." });
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
    
    if (isUserLoading || isTargetLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;
    }

    return (
        <MobileLayout title={isEditMode ? "Edit Strategi & Target" : "Atur Strategi Baru"} showBack>
            <div className="space-y-6 pt-4 px-2 pb-20">
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

                {step === 'intro' && (
                    <div className="space-y-5 animate-in slide-in-from-bottom-4">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[32px] text-white text-center shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-2xl font-extrabold mb-1">Halo, Partner Finansial!</h2>
                                <p className="text-sm text-blue-100">Lengkapi Nama Lengkap Anda dan tentukan metode pemantauan aset hari ini.</p>
                            </div>
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        </div>

                        {/* INPUT NAMA LENGKAP UTAMA */}
                        <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 flex items-center gap-1.5">
                                <UserRound className="w-4 h-4 text-indigo-500" /> Nama Lengkap Anda
                            </label>
                            <Input 
                                placeholder="Masukkan nama lengkap untuk profil..." 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)} 
                                className="font-bold text-slate-850 h-13 rounded-xl border-slate-200"
                            />
                        </div>
                        
                        <div className="space-y-4 pt-2">
                            <button onClick={() => startSetup('target')} className="relative w-full text-left p-5 border-2 border-indigo-200 rounded-[24px] hover:border-indigo-400 hover:bg-indigo-50/50 bg-indigo-50/30 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-start sm:items-center gap-4 group">
                                <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md border border-yellow-300 flex items-center gap-1">
                                    Direkomendasikan
                                </div>
                                <div className="bg-indigo-100 p-3 rounded-full group-hover:scale-110 transition-transform mt-1 sm:mt-0 flex-shrink-0"><TargetIcon className="w-6 h-6 text-indigo-600"/></div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-lg mb-0.5">Kejar Target / Menabung</h3>
                                    <p className="text-xs text-slate-500">Saya punya impian spesifik yang ingin dicapai.</p>
                                </div>
                            </button>

                            <button onClick={() => startSetup('saving')} className="w-full text-left p-5 border border-slate-100 rounded-[24px] hover:border-emerald-400 hover:bg-emerald-50/50 transition-all bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group mt-2">
                                <div className="bg-emerald-100 p-3 rounded-full group-hover:scale-110 transition-transform flex-shrink-0"><PiggyBank className="w-6 h-6 text-emerald-600"/></div>
                                <div><h3 className="font-extrabold text-slate-800 text-lg mb-0.5">Hanya Pantau Cashflow</h3><p className="text-xs text-slate-500">Saya ingin melihat keluar masuk uang harian saja.</p></div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 'target-input' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 text-center">
                            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                                <Calculator className="w-7 h-7 text-indigo-500"/> 
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-xl">Kalkulator Target</h3>
                                <p className="text-xs text-slate-500 mt-1">Berapa besar impianmu?</p>
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

                {step === 'budget-ask' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-6">
                        <div className="bg-white p-8 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center">
                            <div className="bg-rose-50 p-5 rounded-full w-24 h-24 mx-auto flex items-center justify-center mb-6">
                                <ShieldCheck className="w-10 h-10 text-rose-500"/>
                            </div>
                            <h2 className="text-2xl font-extrabold text-slate-800">Batasi Pengeluaran?</h2>
                            <p className="text-slate-500 text-sm mt-3 leading-relaxed">Aktifkan sistem darurat agar kamu tidak boros dan {isTargetMode ? 'impian cepat tercapai' : 'uang cepat terkumpul'}.</p>
                            
                            <div className="space-y-3 pt-8">
                                <Button onClick={() => handleBudgetAnswer(true)} className="w-full bg-slate-900 hover:bg-slate-800 h-14 text-lg font-extrabold rounded-full shadow-lg">YA, PASANG BATAS</Button>
                                <Button onClick={() => handleBudgetAnswer(false)} variant="outline" className="w-full h-14 text-slate-500 border-slate-200 hover:bg-slate-50 font-bold rounded-full">TIDAK, SAYA BEBAS</Button>
                            </div>
                        </div>
                        <Button variant="ghost" onClick={() => isTargetMode ? setStep('target-input') : setStep('intro')} className="w-full text-sm text-slate-400 font-bold mt-2">KEMBALI</Button>
                    </div>
                )}

                {step === 'budget-setup' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
                            <div className="text-center pb-2 border-b border-slate-100">
                                <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <ShieldAlert className="w-7 h-7 text-rose-500"/>
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-xl">Atur Batasan</h3>
                                <p className="text-xs text-slate-500 mt-1">Maksimal uang keluar per bulan.</p>
                            </div>
                            
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1 block mb-2">Nominal Batas (Rp)</label>
                                <Input type="tel" placeholder="1.500.000" value={rawBudgetAmount} onChange={(e) => handleNumberChange(setRawBudgetAmount, e.target.value)} className="h-16 text-2xl font-extrabold text-center bg-slate-50 border-transparent focus:bg-white focus:border-rose-500 rounded-[20px]"/>
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
                                    <div><div className="font-extrabold text-sm text-slate-800 mb-0.5">Akumulasi (Rollover)</div><div className="text-[11px] text-slate-500 leading-relaxed">Sisa budget bulan ini akan ditambahkan ke jatah bulan depan.</div></div>
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