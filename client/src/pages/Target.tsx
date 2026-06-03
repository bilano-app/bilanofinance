import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Target as TargetIcon, ShieldCheck, PiggyBank, Calculator, Wallet, 
    Globe, Plus, Trash2, X, ListPlus, HandCoins, Briefcase, Landmark, ChevronDown, ChevronUp, ShieldAlert, Loader2, ChevronRight 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { useQuery } from "@tanstack/react-query";

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
interface ForexItem { id: number; currency: string; amount: string; }
interface DebtRecvItem { id: number; name: string; amount: string; currency: string; }
interface InvItem { id: number; type: string; symbol: string; quantity: string; price: string; currency: string; }

const INV_TYPES = ["Saham", "Crypto", "Reksadana", "Emas", "P2P", "Obligasi"];
const FALLBACK_CURRENCIES = ["USD", "EUR", "SGD", "JPY", "AUD", "GBP", "CNY", "MYR", "SAR", "KRW", "THB"];

// 🚀 MARKETING: Opsi Quick Win
const QUICK_GOALS = [
    { label: "Beli Rumah / KPR", icon: "🏡" },
    { label: "Dana Darurat Aman", icon: "🛡️" },
    { label: "Beli Kendaraan", icon: "🚗" },
    { label: "Menikah / Keluarga", icon: "💍" },
    { label: "Bebas Finansial", icon: "🏖️" },
    { label: "Lainnya", icon: "✨" }
];

const BALANCE_RANGES = [
    { label: "< Rp 5 Juta", value: 2500000 },
    { label: "Rp 5 - 20 Juta", value: 12500000 },
    { label: "Rp 20 - 50 Juta", value: 35000000 },
    { label: "Rp 50 - 100 Juta", value: 75000000 },
    { label: "> Rp 100 Juta", value: 150000000 }
];

const formatNumber = (val: string) => {
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const parseNumber = (val: string) => parseFloat(val.replace(/\./g, '')) || 0;
const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

export default function Target() {
    const [, setLocation] = useLocation(); 
    const { data: userData, isLoading: isUserLoading } = useUser();
    const [target, setTarget] = useState<TargetData | null>(null);
    
    // 🚀 ALUR BARU: Quick Win & Guided Deep Setup
    const [step, setStep] = useState<'intro' | 'quick-goal' | 'quick-balance' | 'aha-moment' | 'guided-intro' | 'guided-1' | 'guided-2' | 'guided-3' | 'guided-4' | 'guided-5' | 'target-input' | 'budget-ask' | 'budget-setup' | 'assets-setup'>('intro');
    const [isTargetMode, setIsTargetMode] = useState(false); 
    
    // Quick Win State
    const [quickGoal, setQuickGoal] = useState("");
    const [quickRange, setQuickRange] = useState(0);

    // Guided Calculation State
    const [rekUtama, setRekUtama] = useState("");
    const [rekLain, setRekLain] = useState("");
    const [ewallet, setEwallet] = useState("");
    const [uangCash, setUangCash] = useState("");
    
    // Advanced Assets
    const [hasForex, setHasForex] = useState(false);
    const [forexItems, setForexItems] = useState<ForexItem[]>([]);
    const [tempForexCurrency, setTempForexCurrency] = useState("USD");
    const [tempForexAmount, setTempForexAmount] = useState("");

    const [hasRecv, setHasRecv] = useState(false);
    const [recvItems, setRecvItems] = useState<DebtRecvItem[]>([]);
    const [tempRecvName, setTempRecvName] = useState("");
    const [tempRecvAmount, setTempRecvAmount] = useState("");
    const [tempRecvCurrency, setTempRecvCurrency] = useState("IDR");

    const [hasInv, setHasInv] = useState(false);
    const [invItems, setInvItems] = useState<InvItem[]>([]);
    const [tempInvType, setTempInvType] = useState("Saham");
    const [tempInvSymbol, setTempInvSymbol] = useState("");
    const [tempInvQty, setTempInvQty] = useState("");
    const [tempInvPrice, setTempInvPrice] = useState("");
    const [tempInvCurrency, setTempInvCurrency] = useState("IDR");

    const [hasDebt, setHasDebt] = useState(false);
    const [debtItems, setDebtItems] = useState<DebtRecvItem[]>([]);
    const [tempDebtName, setTempDebtName] = useState("");
    const [tempDebtAmount, setTempDebtAmount] = useState("");
    const [tempDebtCurrency, setTempDebtCurrency] = useState("IDR");
    
    // Target & Budget
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
    const isTrialExpired = userEmail ? localStorage.getItem(`bilano_trial_expired_${userEmail}`) === "true" : false;

    const { data: forexRates = {}, isLoading: isRatesLoading } = useQuery({
        queryKey: ['forexRates', userEmail],
        queryFn: async () => {
            const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": userEmail }});
            if (!res.ok) return {};
            return res.json();
        },
        enabled: !!userEmail
    });
    
    const safeForexRates = typeof forexRates === 'object' && forexRates !== null ? forexRates : {};
    const availableCurrencies = Object.keys(safeForexRates).length > 0 ? Object.keys(safeForexRates) : FALLBACK_CURRENCIES;

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
    }, [fetchedTarget]);

    const isEditMode = target && target.targetAmount !== undefined;

    // Aset Addition Logic
    const addForexItem = () => { if (!tempForexAmount || parseNumber(tempForexAmount) <= 0) return; setForexItems([...forexItems, { id: Date.now(), currency: tempForexCurrency, amount: tempForexAmount }]); setTempForexAmount(""); };
    const removeForexItem = (id: number) => setForexItems(forexItems.filter(item => item.id !== id));
    const addRecvItem = () => { if (!tempRecvName || !tempRecvAmount) return; setRecvItems([...recvItems, { id: Date.now(), name: tempRecvName, amount: tempRecvAmount, currency: tempRecvCurrency }]); setTempRecvName(""); setTempRecvAmount(""); setTempRecvCurrency("IDR"); };
    const removeRecvItem = (id: number) => setRecvItems(recvItems.filter(i => i.id !== id));
    const addInvItem = () => { if (!tempInvSymbol || !tempInvQty || !tempInvPrice) return; setInvItems([...invItems, { id: Date.now(), type: tempInvType, symbol: tempInvSymbol, quantity: tempInvQty, price: tempInvPrice, currency: tempInvCurrency }]); setTempInvSymbol(""); setTempInvQty(""); setTempInvPrice(""); setTempInvCurrency("IDR"); };
    const removeInvItem = (id: number) => setInvItems(invItems.filter(i => i.id !== id));
    const addDebtItem = () => { if (!tempDebtName || !tempDebtAmount) return; setDebtItems([...debtItems, { id: Date.now(), name: tempDebtName, amount: tempDebtAmount, currency: tempDebtCurrency }]); setTempDebtName(""); setTempDebtAmount(""); setTempDebtCurrency("IDR"); };
    const removeDebtItem = (id: number) => setDebtItems(debtItems.filter(i => i.id !== id));

    // Breakdown Logic
    const addBreakdownItem = () => { if (!newItemName || !newItemAmount) return; setBreakdownItems([...breakdownItems, { id: Date.now(), name: newItemName, amount: parseNumber(newItemAmount) }]); setNewItemName(""); setNewItemAmount(""); };
    const removeBreakdownItem = (id: number) => setBreakdownItems(breakdownItems.filter(item => item.id !== id));
    const breakdownTotal = breakdownItems.reduce((acc, item) => acc + item.amount, 0);
    const saveBreakdownTotal = () => { setRawBudgetAmount(breakdownTotal.toString()); setIsBreakdownOpen(false); toast({ title: "Terhitung!", description: `Budget diset ke ${formatRp(breakdownTotal)}` }); };

    const getRate = (curr: string) => curr === 'IDR' ? 1 : (safeForexRates[curr] || 1);
    
    // Hitung Estimasi Kekayaan (Untuk Mode Guided & Edit)
    const totalCashDeep = parseNumber(rekUtama) + parseNumber(rekLain) + parseNumber(ewallet) + parseNumber(uangCash);
    const totalForexInIDR = forexItems.reduce((acc, item) => acc + (parseNumber(item.amount) * getRate(item.currency)), 0) + (parseNumber(tempForexAmount) * getRate(tempForexCurrency));
    const totalRecvInIDR = recvItems.reduce((acc, i) => acc + (parseNumber(i.amount) * getRate(i.currency)), 0) + (parseNumber(tempRecvAmount) * getRate(tempRecvCurrency));
    const totalDebtInIDR = debtItems.reduce((acc, i) => acc + (parseNumber(i.amount) * getRate(i.currency)), 0) + (parseNumber(tempDebtAmount) * getRate(tempDebtCurrency));
    const calcInv = (type: string, symbol: string, qty: string, price: string, curr: string) => {
        const isSaham = type.toLowerCase() === 'saham' || (symbol.length === 4 && type.toLowerCase() !== 'crypto');
        return parseNumber(qty) * parseNumber(price) * (isSaham && curr === 'IDR' ? 100 : 1) * getRate(curr);
    };
    const totalInvInIDR = invItems.reduce((acc, i) => acc + calcInv(i.type, i.symbol, i.quantity, i.price, i.currency), 0) + calcInv(tempInvType, tempInvSymbol, tempInvQty, tempInvPrice, tempInvCurrency);
    const totalStart = totalCashDeep + totalForexInIDR + totalRecvInIDR + totalInvInIDR - totalDebtInIDR;
    const displayTotalStart = formatRp(totalStart);

    // --- NAVIGATION ---
    const startSetup = (mode: 'target' | 'saving') => {
        setIsTargetMode(mode === 'target');
        if (!isEditMode) {
            if (mode === 'saving') { setRawTargetAmount("0"); setInputDuration("12"); } 
            else { setRawTargetAmount(""); setInputDuration(""); }
        }
        if (isEditMode) { 
            mode === 'target' ? setStep('target-input') : setStep('budget-ask'); 
        } else { 
            setStep('quick-goal'); // Langsung hajar pertanyaan emosional
        }
    };
    
    const nextFromGuided5 = () => { 
        if (hasForex && tempForexAmount) addForexItem();
        if (hasRecv && tempRecvName && tempRecvAmount) addRecvItem();
        if (hasInv && tempInvSymbol && tempInvQty && tempInvPrice) addInvItem();
        if (hasDebt && tempDebtName && tempDebtAmount) addDebtItem();
        
        if (!rawTargetAmount) setRawTargetAmount((quickRange * 3).toString());
        if (!inputDuration) setInputDuration("12");
        
        if (isTargetMode) setStep('target-input'); else setStep('budget-ask'); 
    };

    const nextToBudgetAsk = () => { 
        if (!parseNumber(rawTargetAmount) || !Number(inputDuration)) { toast({title: "Data Kurang", description: "Nominal & Durasi wajib diisi.", variant: "destructive"}); return; } 
        setStep('budget-ask'); 
    };
    const handleBudgetAnswer = (answer: boolean) => { if (answer) setStep('budget-setup'); else handleSubmitFinal(false, false); };

    // --- SUBMIT FINAL (QUICK WIN vs DEEP SETUP) ---
    const handleSubmitFinal = async (withBudget: boolean, isQuickWin = false) => {
        if (isTrialExpired) {
            window.dispatchEvent(new Event('trigger-paywall-lock'));
            return;
        }

        const budgetVal = parseNumber(rawBudgetAmount);
        if (!isQuickWin && withBudget && !budgetVal) { toast({title: "Error", description: "Nominal batas harus diisi!", variant: "destructive"}); return; }

        setIsSubmitting(true);

        try {
            const payload = {
                targetAmount: isQuickWin ? quickRange * 3 : (parseNumber(rawTargetAmount) || 0),
                durationMonths: isQuickWin ? 12 : (Number(inputDuration) || 12),
                monthlyBudget: isQuickWin ? 0 : (withBudget ? budgetVal : 0),
                budgetType: isQuickWin ? 'static' : (withBudget ? budgetType : 'static'),
                
                addCurrentCash: !isEditMode ? (isQuickWin ? quickRange : totalCashDeep) : 0,
                initialForexList: !isEditMode && !isQuickWin && hasForex ? forexItems.map(f => ({ currency: f.currency, amount: parseNumber(f.amount) })) : [],
                initialReceivables: !isEditMode && !isQuickWin && hasRecv ? recvItems.map(r => ({ name: `${r.name}|${r.currency}`, amount: parseNumber(r.amount) })) : [],
                initialDebts: !isEditMode && !isQuickWin && hasDebt ? debtItems.map(d => ({ name: `${d.name}|${d.currency}`, amount: parseNumber(d.amount) })) : [],
                initialInvestments: !isEditMode && !isQuickWin && hasInv ? invItems.map(i => ({ 
                    type: i.type, symbol: `${i.symbol}|${i.currency}`, quantity: parseNumber(i.quantity), price: parseNumber(i.price), avgPrice: parseNumber(i.price) 
                })) : [],
                
                startMonth: target?.startMonth || now.getMonth() + 1,
                startYear: target?.startYear || now.getFullYear()
            };

            // Simpan status estimasi agar Banner di Dashboard Muncul
            localStorage.setItem(`bilano_is_balance_estimated_${userEmail}`, isQuickWin ? "true" : "false");
            
            // Coba update profile di backend (Fire and Forget)
            try {
                await fetch("/api/user/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                    body: JSON.stringify({ isBalanceEstimated: isQuickWin, financialGoal: quickGoal })
                });
            } catch(e) {}

            const res = await fetch("/api/target", {
                method: "POST", headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast({ title: isEditMode ? "Target Diupdate!" : "Strategi Dibuat!", description: "Sistem telah menyesuaikan data." });
                
                if (!isEditMode) {
                    // Trial 14 hari dimulai SEKARANG
                    localStorage.setItem(`bilano_setup_completed_${userEmail}`, new Date().toISOString());
                    localStorage.setItem(`bilano_welcomed_paywall_${userEmail}`, "true");
                    window.location.href = "/paywall"; 
                } else {
                    window.location.href = "/"; 
                }
            } else { 
                toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan server.", variant: "destructive" }); 
            }
        } catch (e) { 
            toast({ title: "Error Koneksi", description: "Periksa jaringan internet Anda.", variant: "destructive" }); 
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading || isTargetLoading || isRatesLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;
    }

    return (
        <MobileLayout title={isEditMode ? "Edit Strategi & Target" : "Atur Strategi Baru"} showBack={isEditMode}>
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

                {/* --- FASE A: PENCOCOKAN EMOSIONAL & QUICK WIN --- */}
                {step === 'intro' && (
                    <div className="space-y-5 animate-in slide-in-from-bottom-4 pt-4">
                        <div className="text-center px-4 mb-8">
                            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Halo, {userData?.firstName || 'Partner'}! 👋</h2>
                            <p className="text-sm text-slate-500">{isEditMode ? "Silakan edit target dan strategi keuanganmu." : "Pilih gaya keuangan yang paling cocok denganmu hari ini."}</p>
                        </div>
                        
                        <div className="space-y-4 pt-2">
                            <button onClick={() => startSetup('target')} className="relative w-full text-left p-5 border-2 border-indigo-200 rounded-[24px] hover:border-indigo-400 hover:bg-indigo-50/50 bg-indigo-50/30 transition-all shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-start sm:items-center gap-4 group">
                                <div className="absolute -top-3 right-4 bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-md border border-yellow-300 flex items-center gap-1">
                                    Direkomendasikan
                                </div>
                                <div className="bg-indigo-100 p-3 rounded-full group-hover:scale-110 transition-transform mt-1 sm:mt-0 flex-shrink-0"><TargetIcon className="w-6 h-6 text-indigo-600"/></div>
                                <div>
                                    <h3 className="font-extrabold text-slate-800 text-lg mb-0.5">Kejar Target / Menabung</h3>
                                    <p className="text-xs text-slate-500 leading-relaxed">Saya punya impian spesifik yang ingin dicapai dalam waktu dekat.</p>
                                </div>
                            </button>

                            <button onClick={() => startSetup('saving')} className="w-full text-left p-5 border border-slate-100 rounded-[24px] hover:border-emerald-400 hover:bg-emerald-50/50 transition-all bg-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex items-center gap-4 group mt-2">
                                <div className="bg-emerald-100 p-3 rounded-full group-hover:scale-110 transition-transform flex-shrink-0"><PiggyBank className="w-6 h-6 text-emerald-600"/></div>
                                <div><h3 className="font-extrabold text-slate-800 text-lg mb-0.5">Hanya Pantau Cashflow</h3><p className="text-xs text-slate-500">Saya cuma mau lihat keluar masuk uang harian saja.</p></div>
                            </button>
                        </div>
                    </div>
                )}

                {step === 'quick-goal' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-4 px-2">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Mimpi Finansialmu</h2>
                            <p className="text-sm text-slate-500">Apa tujuan finansial terbesarmu dalam 1 tahun ke depan?</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {QUICK_GOALS.map(g => (
                                <button key={g.label} onClick={() => { setQuickGoal(g.label); setStep('quick-balance'); }} className="p-5 bg-white border border-slate-100 shadow-[0_4px_15px_rgb(0,0,0,0.03)] rounded-[20px] hover:border-indigo-500 hover:bg-indigo-50 hover:-translate-y-1 text-left transition-all group">
                                    <span className="text-3xl block mb-3 group-hover:scale-110 transition-transform origin-left">{g.icon}</span>
                                    <span className="font-extrabold text-slate-800 text-sm leading-tight block">{g.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'quick-balance' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-4 px-2">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Kondisi Saat Ini</h2>
                            <p className="text-sm text-slate-500">Berapa kira-kira total seluruh uangmu saat ini? (Tabungan + Cash + E-Wallet). <b>Pilih range saja, tidak perlu angka pasti.</b></p>
                        </div>
                        <div className="space-y-3">
                            {BALANCE_RANGES.map(r => (
                                <button key={r.label} onClick={() => { setQuickRange(r.value); setStep('aha-moment'); }} className="w-full p-5 bg-white border border-slate-100 shadow-[0_4px_15px_rgb(0,0,0,0.03)] rounded-[20px] hover:border-indigo-500 hover:bg-indigo-50 text-left font-extrabold text-slate-800 text-lg transition-all flex items-center justify-between group">
                                    {r.label} 
                                    <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600"/>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 'aha-moment' && (
                    <div className="space-y-6 animate-in zoom-in-95 pt-6">
                        <div className="bg-gradient-to-br from-indigo-700 to-indigo-950 p-8 rounded-[32px] text-white text-center shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="relative z-10 space-y-6">
                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                                    <TargetIcon className="w-8 h-8 text-white" />
                                </div>
                                
                                <div>
                                    <p className="text-[11px] text-indigo-300 font-bold mb-1 uppercase tracking-widest">Untuk mencapai impian</p>
                                    <h3 className="text-2xl font-black text-amber-300">{quickGoal}</h3>
                                </div>

                                <div className="bg-white/10 p-5 rounded-[24px] backdrop-blur-sm border border-white/20 shadow-lg">
                                    <p className="text-[11px] text-indigo-200 font-bold mb-2">Kamu perlu mengumpulkan sekitar</p>
                                    <h2 className="text-4xl font-black text-white mb-1">{formatRp(quickRange * 3 / 12).split(',')[0]}<span className="text-sm text-indigo-200 font-medium">/bln</span></h2>
                                    <p className="text-xs font-bold text-indigo-100 mt-3 bg-white/10 py-1.5 px-3 rounded-full inline-block">Atau <span className="text-emerald-300 font-black">{formatRp((quickRange * 3 / 12) / 30).split(',')[0]} / hari</span></p>
                                </div>

                                <p className="text-[13px] text-indigo-200 italic leading-relaxed px-2 font-medium">
                                    "Angka yang masuk akal, bukan? Mulai hari ini, Bilano akan jadi saksi komitmenmu mewujudkannya."
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <Button onClick={() => setStep('guided-intro')} className="w-full bg-emerald-500 hover:bg-emerald-600 h-16 text-[14px] font-black rounded-full shadow-lg shadow-emerald-200 active:scale-95 transition-transform">
                                LENGKAPI DATA SEKARANG (AKURAT)
                            </Button>
                            <Button onClick={() => handleSubmitFinal(false, true)} variant="ghost" disabled={isSubmitting} className="w-full h-12 text-slate-400 font-bold hover:bg-slate-100 hover:text-slate-600 rounded-full">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "Nanti Saja (Masuk Dashboard)"}
                            </Button>
                        </div>
                    </div>
                )}

                {/* --- FASE B: GUIDED CALCULATION (DEEP SETUP) --- */}
                {step === 'guided-intro' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-10 text-center px-4">
                        <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <Wallet className="w-12 h-12" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-800">Mari Berkenalan Lebih Jauh</h2>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
                            Sekarang saatnya Bilano benar-benar mengenal kondisi keuanganmu. Siapkan 3 menit dan buka aplikasi m-banking kamu — hasilnya akan jauh lebih personal dan akurat.
                        </p>
                        <div className="pt-8 space-y-3">
                            <Button onClick={() => setStep('guided-1')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-16 text-[15px] font-black rounded-full shadow-lg shadow-indigo-200">MULAI SETUP MENDALAM</Button>
                        </div>
                    </div>
                )}

                {step === 'guided-1' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-6">
                        <div className="text-center mb-10">
                            <p className="text-[10px] font-extrabold text-indigo-500 tracking-widest uppercase mb-3 bg-indigo-50 px-3 py-1 rounded-full inline-block">Langkah 1 dari 5</p>
                            <h2 className="text-2xl font-extrabold text-slate-800">Berapa saldo di rekening bank UTAMA kamu?</h2>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-5 font-extrabold text-slate-400 text-xl">Rp</span>
                            <Input type="tel" placeholder="0" value={rekUtama} onChange={(e) => handleNumberChange(setRekUtama, e.target.value)} className="pl-16 h-20 text-3xl font-extrabold text-indigo-600 bg-white border-2 border-slate-100 focus:border-indigo-500 rounded-[24px] shadow-sm transition-all"/>
                        </div>
                        <div className="pt-8 space-y-3">
                            <Button onClick={() => setStep('guided-2')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-sm font-extrabold rounded-full shadow-lg shadow-indigo-200">LANJUTKAN</Button>
                            <Button onClick={() => setStep('guided-2')} variant="ghost" className="w-full text-slate-400 font-bold">Lewati Saja (Tidak Ada)</Button>
                        </div>
                    </div>
                )}

                {step === 'guided-2' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-6">
                        <div className="text-center mb-10">
                            <p className="text-[10px] font-extrabold text-indigo-500 tracking-widest uppercase mb-3 bg-indigo-50 px-3 py-1 rounded-full inline-block">Langkah 2 dari 5</p>
                            <h2 className="text-2xl font-extrabold text-slate-800">Ada rekening lain? (Tabungan / Deposito)</h2>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-5 font-extrabold text-slate-400 text-xl">Rp</span>
                            <Input type="tel" placeholder="0" value={rekLain} onChange={(e) => handleNumberChange(setRekLain, e.target.value)} className="pl-16 h-20 text-3xl font-extrabold text-emerald-600 bg-white border-2 border-slate-100 focus:border-emerald-500 rounded-[24px] shadow-sm transition-all"/>
                        </div>
                        <div className="pt-8 space-y-3">
                            <Button onClick={() => setStep('guided-3')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-sm font-extrabold rounded-full shadow-lg shadow-indigo-200">LANJUTKAN</Button>
                            <Button onClick={() => setStep('guided-3')} variant="ghost" className="w-full text-slate-400 font-bold">Lewati Saja</Button>
                        </div>
                    </div>
                )}

                {step === 'guided-3' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-6">
                        <div className="text-center mb-10">
                            <p className="text-[10px] font-extrabold text-indigo-500 tracking-widest uppercase mb-3 bg-indigo-50 px-3 py-1 rounded-full inline-block">Langkah 3 dari 5</p>
                            <h2 className="text-2xl font-extrabold text-slate-800">Berapa total saldo E-Wallet mu? (GoPay, OVO, dll)</h2>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-5 font-extrabold text-slate-400 text-xl">Rp</span>
                            <Input type="tel" placeholder="0" value={ewallet} onChange={(e) => handleNumberChange(setEwallet, e.target.value)} className="pl-16 h-20 text-3xl font-extrabold text-blue-600 bg-white border-2 border-slate-100 focus:border-blue-500 rounded-[24px] shadow-sm transition-all"/>
                        </div>
                        <div className="pt-8 space-y-3">
                            <Button onClick={() => setStep('guided-4')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-sm font-extrabold rounded-full shadow-lg shadow-indigo-200">LANJUTKAN</Button>
                            <Button onClick={() => setStep('guided-4')} variant="ghost" className="w-full text-slate-400 font-bold">Lewati Saja</Button>
                        </div>
                    </div>
                )}

                {step === 'guided-4' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-6">
                        <div className="text-center mb-10">
                            <p className="text-[10px] font-extrabold text-indigo-500 tracking-widest uppercase mb-3 bg-indigo-50 px-3 py-1 rounded-full inline-block">Langkah 4 dari 5</p>
                            <h2 className="text-2xl font-extrabold text-slate-800">Ada uang Cash di tangan kira-kira?</h2>
                        </div>
                        <div className="relative">
                            <span className="absolute left-5 top-5 font-extrabold text-slate-400 text-xl">Rp</span>
                            <Input type="tel" placeholder="0" value={uangCash} onChange={(e) => handleNumberChange(setUangCash, e.target.value)} className="pl-16 h-20 text-3xl font-extrabold text-amber-600 bg-white border-2 border-slate-100 focus:border-amber-500 rounded-[24px] shadow-sm transition-all"/>
                        </div>
                        <div className="pt-8 space-y-3">
                            <Button onClick={() => setStep('guided-5')} className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-sm font-extrabold rounded-full shadow-lg shadow-indigo-200">LANJUTKAN</Button>
                            <Button onClick={() => setStep('guided-5')} variant="ghost" className="w-full text-slate-400 font-bold">Lewati Saja</Button>
                        </div>
                    </div>
                )}

                {/* --- ASET LAIN (PENGGANTI ASSETS-SETUP) --- */}
                {step === 'guided-5' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
                            <div className="text-center pb-2 border-b border-slate-100">
                                <p className="text-[10px] font-extrabold text-indigo-500 tracking-widest uppercase mb-2">Langkah Terakhir</p>
                                <h3 className="font-extrabold text-slate-800 text-xl">Aset Lain & Hutang</h3>
                                <p className="text-xs text-slate-500 mt-1">Punya valas, investasi, atau tanggungan hutang? (Boleh dilewati)</p>
                            </div>
                            
                            {/* Accordion Valas */}
                            <div className="border border-slate-100 rounded-[24px] bg-slate-50 overflow-hidden transition-all">
                                <div onClick={() => setHasForex(!hasForex)} className="flex justify-between items-center cursor-pointer p-4 hover:bg-slate-100 transition">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-3 pointer-events-none">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Globe className="w-4 h-4"/></div> Punya Valas Tunai?
                                    </label>
                                    {hasForex ? <ChevronUp className="w-5 h-5 text-slate-400"/> : <ChevronDown className="w-5 h-5 text-slate-400"/>}
                                </div>
                                {hasForex && (
                                    <div className="p-4 bg-white space-y-4 animate-in fade-in border-t border-slate-100">
                                        {forexItems.length > 0 && (
                                            <div className="space-y-2">
                                                {forexItems.map((item) => (
                                                    <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-[16px] border border-slate-100 text-sm">
                                                        <div className="flex items-center gap-2"><span className="font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">{item.currency}</span><span className="font-bold text-slate-700">{formatNumber(item.amount)}</span></div>
                                                        <div className="flex items-center gap-3"><span className="text-[10px] font-bold text-slate-400">≈ {formatRp(parseNumber(item.amount) * (safeForexRates[item.currency] || 0))}</span><button onClick={() => removeForexItem(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <select value={tempForexCurrency} onChange={(e) => setTempForexCurrency(e.target.value)} className="p-3 rounded-[16px] border-transparent bg-slate-50 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none w-28">
                                                {availableCurrencies.filter(c => c !== 'IDR').map(curr => <option key={curr} value={curr}>{curr}</option>)}
                                            </select>
                                            <Input type="tel" placeholder="Nominal" value={tempForexAmount} onChange={(e) => handleNumberChange(setTempForexAmount, e.target.value)} className="flex-1 font-bold h-12 rounded-[16px] border-transparent bg-slate-50 focus:bg-white focus:border-blue-500"/>
                                            <button onClick={addForexItem} className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-[16px] hover:bg-blue-700 shadow-sm"><Plus className="w-5 h-5"/></button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Accordion Piutang */}
                            <div className="border border-slate-100 rounded-[24px] bg-slate-50 overflow-hidden transition-all">
                                <div onClick={() => setHasRecv(!hasRecv)} className="flex justify-between items-center cursor-pointer p-4 hover:bg-slate-100 transition">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-3 pointer-events-none">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-full"><HandCoins className="w-4 h-4"/></div> Punya Piutang?
                                    </label>
                                    {hasRecv ? <ChevronUp className="w-5 h-5 text-slate-400"/> : <ChevronDown className="w-5 h-5 text-slate-400"/>}
                                </div>
                                {hasRecv && (
                                    <div className="p-4 bg-white space-y-4 animate-in fade-in border-t border-slate-100">
                                        {recvItems.length > 0 && (
                                            <div className="space-y-2">
                                                {recvItems.map((item) => (
                                                    <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-[16px] border border-slate-200 text-sm">
                                                        <div>
                                                            <span className="font-bold text-slate-700">{item.name}</span>
                                                            {item.currency !== 'IDR' && <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-bold">{item.currency} {formatNumber(item.amount)}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-bold text-emerald-600">{formatRp(parseNumber(item.amount) * getRate(item.currency))}</span>
                                                            <button onClick={() => removeRecvItem(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <Input type="text" placeholder="Nama Pihak" value={tempRecvName} onChange={(e) => setTempRecvName(e.target.value)} className="h-12 rounded-[16px] border-slate-100"/>
                                            <div className="flex gap-2">
                                                <select value={tempRecvCurrency} onChange={e => setTempRecvCurrency(e.target.value)} className="w-20 p-2 text-xs font-bold rounded-[16px] bg-indigo-50 text-indigo-700 outline-none border border-indigo-100">
                                                    <option value="IDR">IDR</option>
                                                    {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <Input type="text" placeholder="Nominal" value={tempRecvAmount} onChange={(e) => handleNumberChange(setTempRecvAmount, e.target.value)} className="flex-1 font-bold h-12 rounded-[16px] border-slate-100"/>
                                                <button onClick={addRecvItem} className="bg-emerald-600 text-white p-3 rounded-[16px] hover:bg-emerald-700 shadow-sm"><Plus className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Accordion Investasi */}
                            <div className="border border-slate-100 rounded-[24px] bg-slate-50 overflow-hidden transition-all">
                                <div onClick={() => setHasInv(!hasInv)} className="flex justify-between items-center cursor-pointer p-4 hover:bg-slate-100 transition">
                                    <label className="text-sm font-bold text-slate-700 flex items-center gap-3 pointer-events-none">
                                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full"><Briefcase className="w-4 h-4"/></div> Aset Investasi?
                                    </label>
                                    {hasInv ? <ChevronUp className="w-5 h-5 text-slate-400"/> : <ChevronDown className="w-5 h-5 text-slate-400"/>}
                                </div>
                                {hasInv && (
                                    <div className="p-4 bg-white space-y-4 animate-in fade-in border-t border-slate-100">
                                        {invItems.length > 0 && (
                                            <div className="space-y-3">
                                                {invItems.map((item) => (
                                                    <div key={item.id} className="bg-slate-50 p-3 rounded-[16px] border border-slate-100 text-sm relative">
                                                        <button onClick={() => removeInvItem(item.id)} className="absolute top-3 right-3 text-slate-300 hover:text-rose-500"><X className="w-4 h-4"/></button>
                                                        <div className="font-extrabold text-indigo-600 mb-1">{item.symbol} <span className="text-[10px] font-medium text-slate-400">({item.type}) {item.currency !== 'IDR' ? ` - ${item.currency}` : ''}</span></div>
                                                        <div className="text-[11px] font-bold text-slate-500 flex justify-between">
                                                            <span>Jml: {formatNumber(item.quantity)}</span>
                                                            <span>@ {item.currency !== 'IDR' ? item.currency : 'Rp'} {formatNumber(item.price)}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <select value={tempInvType} onChange={(e) => setTempInvType(e.target.value)} className="p-3 border-slate-100 rounded-[16px] text-xs w-1/3 outline-none focus:ring-2 focus:ring-indigo-500">
                                                    {INV_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                                <Input type="text" placeholder="Simbol (Cth: BBCA)" value={tempInvSymbol} onChange={(e) => setTempInvSymbol(e.target.value.toUpperCase())} className="flex-1 text-sm h-11 rounded-[16px] border-slate-100"/>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input type="tel" placeholder="Lot/Unit" value={tempInvQty} onChange={(e) => handleNumberChange(setTempInvQty, e.target.value)} className="w-1/3 text-sm h-11 rounded-[16px] border-slate-100"/>
                                                
                                                <select value={tempInvCurrency} onChange={e => setTempInvCurrency(e.target.value)} className="w-20 p-2 text-xs font-bold rounded-[16px] bg-indigo-50 text-indigo-700 outline-none border border-indigo-100">
                                                    <option value="IDR">IDR</option>
                                                    {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>

                                                <Input type="tel" placeholder="Harga Beli" value={tempInvPrice} onChange={(e) => handleNumberChange(setTempInvPrice, e.target.value)} className="flex-1 text-sm h-11 rounded-[16px] border-slate-100 font-bold"/>
                                            </div>
                                            <Button onClick={addInvItem} className="w-full bg-indigo-50 text-indigo-700 font-bold h-11 rounded-[16px] hover:bg-indigo-100 text-xs">TAMBAHKAN ASET INI</Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Accordion Hutang */}
                            <div className="border border-rose-100 rounded-[24px] bg-rose-50/30 overflow-hidden transition-all">
                                <div onClick={() => setHasDebt(!hasDebt)} className="flex justify-between items-center cursor-pointer p-4 hover:bg-rose-50 transition">
                                    <label className="text-sm font-bold text-rose-700 flex items-center gap-3 pointer-events-none">
                                        <div className="p-2 bg-rose-100 text-rose-600 rounded-full"><Landmark className="w-4 h-4"/></div> Punya Hutang?
                                    </label>
                                    {hasDebt ? <ChevronUp className="w-5 h-5 text-rose-400"/> : <ChevronDown className="w-5 h-5 text-rose-400"/>}
                                </div>
                                {hasDebt && (
                                    <div className="p-4 bg-white space-y-4 animate-in fade-in border-t border-rose-100">
                                        {debtItems.length > 0 && (
                                            <div className="space-y-2">
                                                {debtItems.map((item) => (
                                                    <div key={item.id} className="flex justify-between items-center bg-rose-50 p-3 rounded-[16px] border border-rose-100 text-sm">
                                                        <div>
                                                            <span className="font-bold text-slate-700">{item.name}</span>
                                                            {item.currency !== 'IDR' && <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">{item.currency} {formatNumber(item.amount)}</span>}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-extrabold text-rose-600">- {formatRp(parseNumber(item.amount) * getRate(item.currency))}</span>
                                                            <button onClick={() => removeDebtItem(item.id)} className="text-rose-300 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2">
                                            <Input type="text" placeholder="Hutang ke Siapa?" value={tempDebtName} onChange={(e) => setTempDebtName(e.target.value)} className="h-12 rounded-[16px] border-slate-100 text-sm"/>
                                            <div className="flex gap-2">
                                                
                                                <select value={tempDebtCurrency} onChange={e => setTempDebtCurrency(e.target.value)} className="w-20 p-2 text-xs font-bold rounded-[16px] bg-indigo-50 text-indigo-700 outline-none border border-indigo-100">
                                                    <option value="IDR">IDR</option>
                                                    {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>

                                                <Input type="tel" placeholder="Nominal" value={tempDebtAmount} onChange={(e) => handleNumberChange(setTempDebtAmount, e.target.value)} className="flex-1 font-bold h-12 rounded-[16px] border-slate-100 text-rose-600"/>
                                                <button onClick={addDebtItem} className="bg-rose-500 text-white p-3 rounded-[16px] hover:bg-rose-600 shadow-sm"><Plus className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900 text-white p-5 rounded-[24px] shadow-lg flex flex-col items-center justify-center mt-2">
                                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-1">Kekayaan Bersih Anda</span>
                                <span className={`font-extrabold text-2xl ${totalStart >= 0 ? 'text-emerald-400' : 'text-rose-400'} whitespace-nowrap transition-all duration-300`}>
                                    {displayTotalStart}
                                </span>
                            </div>

                        </div>
                        <div className="pt-2 space-y-3">
                            <Button onClick={nextFromGuided5} className="w-full bg-emerald-500 hover:bg-emerald-600 h-16 text-lg font-extrabold rounded-full shadow-lg shadow-emerald-200">LANJUTKAN</Button>
                        </div>
                    </div>
                )}

                {/* --- TARGET & BUDGET LAMA --- */}
                {step === 'target-input' && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6 text-center">
                            <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center mx-auto">
                                <Calculator className="w-7 h-7 text-indigo-500"/> 
                            </div>
                            <div>
                                <h3 className="font-extrabold text-slate-800 text-xl">Penyesuaian Target</h3>
                                <p className="text-xs text-slate-500 mt-1">Sesuaikan nominal impianmu di sini.</p>
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
                                <Button onClick={() => handleBudgetAnswer(false)} disabled={isSubmitting} variant="outline" className="w-full h-14 text-slate-500 border-slate-200 hover:bg-slate-50 font-bold rounded-full">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "TIDAK, SAYA BEBAS"}
                                </Button>
                            </div>
                        </div>
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
                                onClick={() => handleSubmitFinal(true, false)} 
                                disabled={isSubmitting}
                                className="w-full bg-slate-900 hover:bg-slate-800 h-16 text-lg font-extrabold rounded-full shadow-lg shadow-slate-900/20"
                            >
                                {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : (isEditMode ? "SIMPAN PERUBAHAN" : "SIMPAN STRATEGI & ASET")}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </MobileLayout>
    );
}