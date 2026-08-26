import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    Target as TargetIcon, ShieldCheck, Calculator, Plus, Trash2, 
    X, ListPlus, ShieldAlert, Loader2, ArrowLeft, Compass, 
    Gauge, Scale, Layers, CheckCircle2, ArrowRight, Milestone,
    Coins, Receipt, HelpCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

export default function Target() {
    const [, setLocation] = useLocation(); 
    const queryClient = useQueryClient();
    const { data: userData, isLoading: isUserLoading, refetch: refetchUser } = useUser();
    const [target, setTarget] = useState<TargetData | null>(null);
    
    const [step, setStep] = useState<'intro' | 'target-input' | 'budget-ask' | 'budget-setup'>('intro');
    const [isTargetMode, setIsTargetMode] = useState(false);
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
            setBudgetType(fetchedTarget.budgetType || 'static');
        }
    }, [fetchedTarget]);

    const isEditMode = target && target.targetAmount !== undefined;

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
        setNewItemName(""); 
        setNewItemAmount("");
    };

    const removeBreakdownItem = (id: number) => { 
        setBreakdownItems(breakdownItems.filter(item => item.id !== id)); 
    };

    const saveBreakdownTotal = () => {
        const total = breakdownItems.reduce((acc, item) => acc + item.amount, 0);
        setRawBudgetAmount(total.toString()); 
        setIsBreakdownOpen(false);
        toast({ title: "Terhitung!", description: `Batas pengeluaran diset ke ${formatRp(total)}` });
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
            toast({title: "Data Belum Lengkap", description: "Nominal target & durasi bulan wajib diisi.", variant: "destructive"}); 
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
            toast({title: "Nominal Kosong", description: "Nominal batas pengeluaran harus diisi!", variant: "destructive"}); 
            return; 
        }

        setIsSubmitting(true);

        try {
            const payload = {
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
                queryClient.invalidateQueries();
                toast({ title: isEditMode ? "Target Diperbarui! ✨" : "Arsitektur Finansial Dibuat! 🎉", description: "Sistem telah menyelaraskan kalkulasi performa Anda." });
                
                setTimeout(() => {
                    window.location.href = "/"; 
                }, 600);
            } else { 
                const errText = await res.text();
                toast({ title: "Gagal Menyimpan", description: errText || "Kesalahan server.", variant: "destructive" }); 
            }
        } catch (e) { 
            toast({ title: "Kendala Koneksi", description: "Periksa jaringan internet Anda.", variant: "destructive" }); 
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
                <img src="/BILANO-ICON-NEW.png" alt="Loading" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
                <div className="flex items-center gap-2 text-brand-navy font-black text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                    <span>Menyiapkan Lembar Strategi...</span>
                </div>
            </div>
        );
    }

    return (
        <MobileLayout>
            <div className="flex flex-col -mx-5 -mt-5">
                
                {/* ========================================================================= */}
                {/* 1. TOP HEADER BANNER DENGAN TEMA BILANO NAVY & GOLD */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b border-amber-300/60">
                    
                    {/* Top Navigation Bar */}
                    <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <button 
                                    type="button"
                                    className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                                    title="Kembali ke Beranda"
                                >
                                    <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                                </button>
                            </Link>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                                        Perencanaan & Disiplin
                                    </p>
                                </div>
                                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                                    {isEditMode ? "Ubah Target & Budget" : "Atur Target Baru"}
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="bg-brand-navy text-brand-gold text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-brand-gold/30 shadow-xs">
                                STRATEGY ARCHITECT
                            </span>
                        </div>
                    </div>

                    {/* FLAGSHIP HERO CARD - SATU-SATUNYA YANG MEMAKAI SOLID SHADOW KHAS BILANO */}
                    <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                        <Compass className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                                    <Milestone className="w-3 h-3 fill-current" /> KOMPAS VISI
                                </span>
                                <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                                    {isEditMode ? "Mode Edit" : "Setup Awal"}
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1.5 leading-tight">
                                Arsitektur Visi Keuangan
                            </h2>
                            <p className="text-xs text-blue-100 font-medium leading-relaxed">
                                Tentukan batas toleransi pengeluaran dan target kekayaan impian agar setiap rupiah yang Anda kumpulkan bekerja secara terarah.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. BODY CONTENT SECTION - REFINED, CLEAN & CRISP */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
                    
                    {/* MODAL RINCIAN ESTIMASI PENGELUARAN */}
                    {isBreakdownOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-in fade-in p-4">
                            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 space-y-4">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <ListPlus className="w-5 h-5 text-amber-600"/>
                                        <h3 className="font-extrabold text-base text-slate-900">Kalkulator Pos Beban</h3>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => setIsBreakdownOpen(false)} 
                                        className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 cursor-pointer"
                                    >
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="Nama Pos (Cth: Makan)" 
                                            value={newItemName} 
                                            onChange={(e) => setNewItemName(e.target.value)} 
                                            className="flex-1 text-xs font-semibold px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-navy focus:bg-white"
                                        />
                                        <input 
                                            placeholder="Nominal" 
                                            value={newItemAmount} 
                                            onChange={(e) => handleNumberChange(setNewItemAmount, e.target.value)} 
                                            className="w-28 text-xs font-bold px-3 h-11 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-navy focus:bg-white tabular-nums"
                                        />
                                        <button 
                                            type="button"
                                            onClick={addBreakdownItem} 
                                            className="bg-brand-navy text-brand-gold w-11 h-11 flex items-center justify-center rounded-xl shadow-xs hover:bg-[#152e55] shrink-0 active:scale-95 cursor-pointer"
                                        >
                                            <Plus className="w-4 h-4 stroke-[2.5]"/>
                                        </button>
                                    </div>

                                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                                        {breakdownItems.length === 0 && (
                                            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <p className="text-xs text-slate-400 font-medium">Belum ada pos rincian ditambahkan.</p>
                                            </div>
                                        )}
                                        {breakdownItems.map((item) => (
                                            <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                                                <span className="text-xs font-bold text-slate-800 truncate pr-2">{item.name}</span>
                                                <div className="flex items-center gap-2.5 shrink-0">
                                                    <span className="text-xs font-bold text-slate-900 tabular-nums">{formatRp(item.amount)}</span>
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeBreakdownItem(item.id)} 
                                                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-brand-navy text-white p-4 rounded-2xl flex justify-between items-center border border-white/10 shadow-xs">
                                    <span className="text-xs text-blue-100 font-medium">Total Estimasi Beban:</span>
                                    <span className="font-extrabold text-base text-brand-gold tabular-nums">{formatRp(breakdownTotal)}</span>
                                </div>

                                <button 
                                    type="button"
                                    onClick={saveBreakdownTotal} 
                                    className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                                >
                                    TERAPKAN SEBAGAI BUDGET BULANAN
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: PILIHAN INTRO / STRATEGI METODE */}
                    {step === 'intro' && (
                        <div className="space-y-3.5 animate-in fade-in">
                            
                            {/* OPTION 1: KEJAR TARGET NOMINAL */}
                            <div 
                                onClick={() => startSetup('target')} 
                                className="relative bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-amber-400 shadow-xs hover:shadow-sm cursor-pointer active:scale-[0.99] transition-all group flex items-start gap-3.5"
                            >
                                <div className="absolute -top-2.5 right-4 bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                                    DIREKOMENDASIKAN
                                </div>
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-brand-navy flex items-center justify-center border border-amber-200 shrink-0 group-hover:scale-105 transition-transform">
                                    <TargetIcon className="w-6 h-6 text-brand-navy stroke-[2.5]" />
                                </div>
                                <div className="min-w-0 pr-1">
                                    <h3 className="font-extrabold text-slate-900 text-sm mb-0.5">Kejar Target Impian (Akumulasi)</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Saya memiliki target nominal spesifik yang ingin dicapai dalam kurun waktu tertentu.
                                    </p>
                                </div>
                            </div>

                            {/* OPTION 2: HANYA PANTAU CASHFLOW */}
                            <div 
                                onClick={() => startSetup('saving')} 
                                className="bg-white rounded-3xl p-5 border border-slate-200/90 hover:border-amber-400 shadow-xs hover:shadow-sm cursor-pointer active:scale-[0.99] transition-all group flex items-start gap-3.5"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-brand-navy flex items-center justify-center border border-slate-200 shrink-0 group-hover:scale-105 transition-transform">
                                    <Gauge className="w-6 h-6 text-brand-navy stroke-[2.5]" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-extrabold text-slate-900 text-sm mb-0.5">Disiplin Batas Pengeluaran</h3>
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Saya ingin fokus menjaga arus kas bulanan agar tidak bocor tanpa memasang nominal target.
                                    </p>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* STEP 2: INPUT NOMINAL TARGET & DURASI BULAN */}
                    {step === 'target-input' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5 text-center">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 text-brand-navy">
                                    <Calculator className="w-7 h-7 stroke-[2.5]"/> 
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-lg">Kalkulator Target Impian</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">Berapa besar nominal aset yang ingin Anda capai?</p>
                                </div>

                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 block mb-1.5">
                                            Nominal Target (Rp)
                                        </label>
                                        <input 
                                            type="tel" 
                                            placeholder="100.000.000" 
                                            value={rawTargetAmount} 
                                            onChange={(e) => handleNumberChange(setRawTargetAmount, e.target.value)} 
                                            className="w-full h-16 text-2xl font-black text-brand-navy bg-slate-50 border border-slate-200 rounded-2xl text-center outline-none focus:border-brand-navy focus:bg-white transition-all tabular-nums"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 block mb-1.5">
                                            Dicapai Dalam Berapa Bulan?
                                        </label>
                                        <input 
                                            type="number" 
                                            placeholder="12" 
                                            value={inputDuration} 
                                            onChange={e => setInputDuration(e.target.value)} 
                                            className="w-full h-14 text-lg font-extrabold text-slate-800 bg-slate-50 border border-slate-200 rounded-2xl text-center outline-none focus:border-brand-navy focus:bg-white transition-all tabular-nums"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button 
                                    type="button"
                                    onClick={nextToBudgetAsk} 
                                    className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    <span>LANJUT KE PENGATURAN ANGGARAN</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setStep('intro')} 
                                    className="w-full h-11 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-800 transition-colors cursor-pointer text-center"
                                >
                                    KEMBALI
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PERTANYAAN PEMASANGAN BATAS BUDGET */}
                    {step === 'budget-ask' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 text-center">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 text-brand-navy">
                                    <ShieldAlert className="w-7 h-7 stroke-[2.5]"/> 
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-slate-900 text-lg">Pasang Batas Pengeluaran?</h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5 leading-relaxed">
                                        Memasang batas anggaran bulanan akan mengunci pengeluaran agar rencana akumulasi target Anda tidak terganggu.
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-3">
                                    <button 
                                        type="button"
                                        onClick={() => handleBudgetAnswer(true)} 
                                        className="w-full h-14 bg-brand-navy hover:bg-[#152e55] text-brand-gold font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]"/>
                                        <span>YA, PASANG BATAS ANGGARAN</span>
                                    </button>
                                    
                                    <button 
                                        type="button"
                                        onClick={() => handleBudgetAnswer(false)} 
                                        className="w-full h-14 bg-white border border-slate-200 text-slate-700 font-extrabold text-xs uppercase tracking-wider rounded-2xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
                                    >
                                        TIDAK PERLU, BIARKAN BEBAS
                                    </button>
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={() => isTargetMode ? setStep('target-input') : setStep('intro')} 
                                className="w-full h-11 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-800 transition-colors cursor-pointer text-center"
                            >
                                KEMBALI
                            </button>
                        </div>
                    )}

                    {/* STEP 4: FORM ATUR LIMIT BUDGET BULANAN & ROLLOVER */}
                    {step === 'budget-setup' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
                                <div className="text-center pb-3 border-b border-slate-100">
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-200 text-brand-navy flex items-center justify-center mx-auto mb-2">
                                        <ShieldAlert className="w-6 h-6 stroke-[2.5]"/>
                                    </div>
                                    <h3 className="font-extrabold text-slate-900 text-lg">Batas Pengeluaran Bulanan</h3>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Maksimal kas keluar per bulan</p>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 block mb-1.5">
                                        Nominal Batas Maksimal (Rp)
                                    </label>
                                    <input 
                                        type="tel" 
                                        placeholder="1.500.000" 
                                        value={rawBudgetAmount} 
                                        onChange={(e) => handleNumberChange(setRawBudgetAmount, e.target.value)} 
                                        className="w-full h-16 text-2xl font-black text-center bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 outline-none focus:border-brand-navy focus:bg-white transition-all tabular-nums"
                                    />
                                    
                                    <button 
                                        type="button"
                                        onClick={() => setIsBreakdownOpen(true)} 
                                        className="mt-3 text-xs font-bold text-slate-700 bg-amber-50/80 border border-amber-200/80 p-3 rounded-2xl w-full flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors cursor-pointer"
                                    >
                                        <Calculator className="w-4 h-4 text-amber-700"/> 
                                        <span>BANTU SAYA HITUNG RINCIAN POS BELANJA</span>
                                    </button>
                                </div>

                                <div className="space-y-2.5 pt-1">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 block">
                                        Perlakuan Sisa Budget Akhir Bulan
                                    </label>
                                    
                                    {/* OPSI 1: STATIS / HANGUS */}
                                    <div 
                                        onClick={() => setBudgetType('static')} 
                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex gap-3.5 items-start cursor-pointer ${
                                            budgetType === 'static' 
                                                ? 'border-brand-navy bg-amber-50/40 shadow-xs' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                            budgetType === 'static' ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300'
                                        }`}>
                                            {budgetType === 'static' && <div className="w-2 h-2 bg-brand-gold rounded-full" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-extrabold text-xs text-slate-900 mb-0.5">Statis (Reset Normal)</div>
                                            <div className="text-[11px] font-medium text-slate-500 leading-snug">Sisa uang tidak diakumulasikan ke limit bulan depan.</div>
                                        </div>
                                    </div>

                                    {/* OPSI 2: ROLLOVER / AKUMULASI */}
                                    <div 
                                        onClick={() => setBudgetType('rollover')} 
                                        className={`w-full text-left p-4 rounded-2xl border transition-all flex gap-3.5 items-start cursor-pointer ${
                                            budgetType === 'rollover' 
                                                ? 'border-brand-navy bg-amber-50/40 shadow-xs' 
                                                : 'border-slate-200 bg-white hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                            budgetType === 'rollover' ? 'border-brand-navy bg-brand-navy text-white' : 'border-slate-300'
                                        }`}>
                                            {budgetType === 'rollover' && <div className="w-2 h-2 bg-brand-gold rounded-full" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-extrabold text-xs text-slate-900 mb-0.5">Akumulasi (Rollover)</div>
                                            <div className="text-[11px] font-medium text-slate-500 leading-snug">Sisa hemat bulan ini otomatis menambah jatah jajan bulan berikutnya.</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <button 
                                    type="button"
                                    onClick={() => handleSubmitFinal(true)} 
                                    disabled={isSubmitting}
                                    className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin"/>
                                            <span>MENYIMPAN STRATEGI...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]"/>
                                            <span>{isEditMode ? "SIMPAN PERUBAHAN TARGET" : "AKTIFKAN STRATEGI SEKARANG"}</span>
                                        </>
                                    )}
                                </button>
                                
                                <button 
                                    type="button"
                                    onClick={() => setStep('budget-ask')} 
                                    className="w-full h-11 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-800 transition-colors cursor-pointer text-center"
                                >
                                    KEMBALI
                                </button>
                            </div>
                        </div>
                    )}

                </div>

            </div>
        </MobileLayout>
    );
}