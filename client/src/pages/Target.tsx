import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { 
    Target as TargetIcon, ShieldCheck, PiggyBank, Calculator, Wallet, 
    Globe, Plus, Trash2, X, ListPlus, HandCoins, Briefcase, Landmark, ChevronDown, ChevronUp, ShieldAlert, Loader2 
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
    
    const [step, setStep] = useState<'intro' | 'assets-setup' | 'target-input' | 'budget-ask' | 'budget-setup'>('intro');
    const [isTargetMode, setIsTargetMode] = useState(false); 
    
    const [rawCurrentCash, setRawCurrentCash] = useState("");
    
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

    const { data: forexRates = {}, isLoading: isRatesLoading } = useQuery({
        queryKey: ['forexRates', userEmail],
        queryFn: async () => {
            const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": userEmail }});
            return res.json();
        },
        enabled: !!userEmail
    });
    
    const availableCurrencies = Object.keys(forexRates);

    const { data: fetchedTarget, isLoading: isTargetLoading } = useQuery({
        queryKey: ['target', userEmail],
        queryFn: async () => {
            const res = await fetch(`/api/target`, { headers: { "x-user-email": userEmail }});
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

    const addForexItem = () => {
        if (!tempForexAmount || parseNumber(tempForexAmount) <= 0) return;
        setForexItems([...forexItems, { id: Date.now(), currency: tempForexCurrency, amount: tempForexAmount }]);
        setTempForexAmount(""); 
    };
    const removeForexItem = (id: number) => { setForexItems(forexItems.filter(item => item.id !== id)); };

    const addRecvItem = () => {
        if (!tempRecvName || !tempRecvAmount) return;
        setRecvItems([...recvItems, { id: Date.now(), name: tempRecvName, amount: tempRecvAmount, currency: tempRecvCurrency }]);
        setTempRecvName(""); setTempRecvAmount(""); setTempRecvCurrency("IDR");
    };
    const removeRecvItem = (id: number) => setRecvItems(recvItems.filter(i => i.id !== id));

    const addInvItem = () => {
        if (!tempInvSymbol || !tempInvQty || !tempInvPrice) return;
        setInvItems([...invItems, { id: Date.now(), type: tempInvType, symbol: tempInvSymbol, quantity: tempInvQty, price: tempInvPrice, currency: tempInvCurrency }]);
        setTempInvSymbol(""); setTempInvQty(""); setTempInvPrice(""); setTempInvCurrency("IDR");
    };
    const removeInvItem = (id: number) => setInvItems(invItems.filter(i => i.id !== id));

    const addDebtItem = () => {
        if (!tempDebtName || !tempDebtAmount) return;
        setDebtItems([...debtItems, { id: Date.now(), name: tempDebtName, amount: tempDebtAmount, currency: tempDebtCurrency }]);
        setTempDebtName(""); setTempDebtAmount(""); setTempDebtCurrency("IDR");
    };
    const removeDebtItem = (id: number) => setDebtItems(debtItems.filter(i => i.id !== id));

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

    const cashPreview = parseNumber(rawCurrentCash);
    const totalForexInIDR = forexItems.reduce((acc, item) => acc + (parseNumber(item.amount) * (forexRates[item.currency] || 0)), 0) + (parseNumber(tempForexAmount) * (forexRates[tempForexCurrency] || 0));
    
    const getRate = (curr: string) => curr === 'IDR' ? 1 : (forexRates[curr] || 1);
    
    const totalRecvInIDR = recvItems.reduce((acc, i) => acc + (parseNumber(i.amount) * getRate(i.currency)), 0) + (parseNumber(tempRecvAmount) * getRate(tempRecvCurrency));
    const totalDebtInIDR = debtItems.reduce((acc, i) => acc + (parseNumber(i.amount) * getRate(i.currency)), 0) + (parseNumber(tempDebtAmount) * getRate(tempDebtCurrency));
    
    const calcInv = (type: string, symbol: string, qty: string, price: string, curr: string) => {
        const isSaham = type.toLowerCase() === 'saham' || (symbol.length === 4 && type.toLowerCase() !== 'crypto');
        const m = isSaham && curr === 'IDR' ? 100 : 1;
        return parseNumber(qty) * parseNumber(price) * m * getRate(curr);
    };
    const totalInvInIDR = invItems.reduce((acc, i) => acc + calcInv(i.type, i.symbol, i.quantity, i.price, i.currency), 0) + calcInv(tempInvType, tempInvSymbol, tempInvQty, tempInvPrice, tempInvCurrency);

    const totalStart = cashPreview + totalForexInIDR + totalRecvInIDR + totalInvInIDR - totalDebtInIDR;

    // 🚀 FITUR BARU: AUTO-SHRINK TEXT AGAR TIDAK OFFSIDE (TARGET/ASET AWAL)
    const displayTotalStart = formatRp(totalStart);
    const getBalanceTextSize = (text: string) => {
        if (text.length >= 20) return "text-xl"; 
        if (text.length >= 15) return "text-2xl"; 
        return "text-3xl"; 
    };

    const startSetup = (mode: 'target' | 'saving') => {
        setIsTargetMode(mode === 'target');
        if (!isEditMode) {
            if (mode === 'saving') { setRawTargetAmount("0"); setInputDuration("12"); } 
            else { setRawTargetAmount(""); setInputDuration(""); }
        }
        if (isEditMode) { mode === 'target' ? setStep('target-input') : setStep('budget-ask'); } 
        else { setStep('assets-setup'); }
    };
    
    const nextToTarget = () => { 
        if (hasForex && tempForexAmount) addForexItem();
        if (hasRecv && tempRecvName && tempRecvAmount) addRecvItem();
        if (hasInv && tempInvSymbol && tempInvQty && tempInvPrice) addInvItem();
        if (hasDebt && tempDebtName && tempDebtAmount) addDebtItem();

        if (isTargetMode) setStep('target-input'); else setStep('budget-ask'); 
    };

    const nextToBudgetAsk = () => { 
        if (!parseNumber(rawTargetAmount) || !Number(inputDuration)) { toast({title: "Data Kurang", description: "Nominal & Durasi wajib diisi.", variant: "destructive"}); return; } 
        setStep('budget-ask'); 
    };
    const handleBudgetAnswer = (answer: boolean) => { if (answer) setStep('budget-setup'); else handleSubmitFinal(false); };

    const handleSubmitFinal = async (withBudget: boolean) => {
        const budgetVal = parseNumber(rawBudgetAmount);
        if (withBudget && !budgetVal) { toast({title: "Error", description: "Nominal batas harus diisi!", variant: "destructive"}); return; }

        setIsSubmitting(true);

        try {
            const payload = {
                targetAmount: parseNumber(rawTargetAmount),
                durationMonths: Number(inputDuration) || 12,
                monthlyBudget: withBudget ? budgetVal : 0,
                budgetType: withBudget ? budgetType : 'static',
                
                addCurrentCash: !isEditMode ? parseNumber(rawCurrentCash) : 0,
                initialForexList: !isEditMode && hasForex ? forexItems.map(f => ({ currency: f.currency, amount: parseNumber(f.amount) })) : [],
                initialReceivables: !isEditMode && hasRecv ? recvItems.map(r => ({ name: `${r.name}|${r.currency}`, amount: parseNumber(r.amount) })) : [],
                initialDebts: !isEditMode && hasDebt ? debtItems.map(d => ({ name: `${d.name}|${d.currency}`, amount: parseNumber(d.amount) })) : [],
                
                initialInvestments: !isEditMode && hasInv ? invItems.map(i => ({ 
                    type: i.type, 
                    symbol: `${i.symbol}|${i.currency}`, 
                    quantity: parseNumber(i.quantity), 
                    price: parseNumber(i.price),
                    avgPrice: parseNumber(i.price) 
                })) : [],
                
                startMonth: target?.startMonth || now.getMonth() + 1,
                startYear: target?.startYear || now.getFullYear()
            };

            const res = await fetch("/api/target", {
                method: "POST", headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                toast({ title: isEditMode ? "Target Diupdate!" : "Strategi Dibuat!", description: "Sistem telah menyesuaikan." });
                window.location.href = "/"; 
            } else { 
                toast({ title: "Gagal", description: "Terjadi kesalahan pada server saat memproses data.", variant: "destructive" }); 
            }
        } catch (e) { 
            toast({ title: "Error Koneksi", variant: "destructive" }); 
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isUserLoading || isTargetLoading || isRatesLoading) {
        return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;
    }

    const CurrencySelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => (
        <select value={value} onChange={e => onChange(e.target.value)} className="w-20 p-2 text-xs font-bold rounded-[16px] bg-indigo-50 text-indigo-700 outline-none border border-indigo-100">
            <option value="IDR">IDR</option>
            {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
        </select>
    );

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
                                <h2 className="text-2xl font-extrabold mb-1">Halo, {userData?.firstName || 'Partner'}!</h2>
                                <p className="text-sm text-blue-100">{isEditMode ? "Silakan edit target dan strategi keuanganmu." : "Pilih gaya keuangan yang paling cocok denganmu hari ini."}</p>
                            </div>
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                        </div>
                        
                        <div className="space-y-4 pt-4">
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

                {step === 'assets-setup' && !isEditMode && (
                    <div className="space-y-6 animate-in slide-in-from-right pt-2">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 space-y-6">
                            <div className="text-center pb-2 border-b border-slate-100">
                                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Wallet className="w-7 h-7 text-emerald-500"/>
                                </div>
                                <h3 className="font-extrabold text-slate-800 text-xl">Cek Dompet Dulu!</h3>
                                <p className="text-xs text-slate-500 mt-1">Catat semua harta & kewajibanmu saat ini.</p>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Saldo Rupiah (IDR)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-4 font-extrabold text-slate-400 text-lg">Rp</span>
                                    <Input type="tel" placeholder="0" value={rawCurrentCash} onChange={(e) => handleNumberChange(setRawCurrentCash, e.target.value)} className="pl-14 h-16 text-2xl font-extrabold text-slate-800 bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500 rounded-[20px] transition-all"/>
                                </div>
                            </div>
                            
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
                                                        <div className="flex items-center gap-3"><span className="text-[10px] font-bold text-slate-400">≈ {formatRp(parseNumber(item.amount) * (forexRates[item.currency] || 0))}</span><button onClick={() => removeForexItem(item.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button></div>
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
                                                <CurrencySelector value={tempRecvCurrency} onChange={setTempRecvCurrency} />
                                                <Input type="text" placeholder="Nominal" value={tempRecvAmount} onChange={(e) => handleNumberChange(setTempRecvAmount, e.target.value)} className="flex-1 font-bold h-12 rounded-[16px] border-slate-100"/>
                                                <button onClick={addRecvItem} className="bg-emerald-600 text-white p-3 rounded-[16px] hover:bg-emerald-700 shadow-sm"><Plus className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                                <Input type="text" placeholder="Simbol (Cth: BBCA / AAPL)" value={tempInvSymbol} onChange={(e) => setTempInvSymbol(e.target.value.toUpperCase())} className="flex-1 text-sm h-11 rounded-[16px] border-slate-100"/>
                                            </div>
                                            <div className="flex gap-2">
                                                <Input type="tel" placeholder="Lot/Unit" value={tempInvQty} onChange={(e) => handleNumberChange(setTempInvQty, e.target.value)} className="w-1/3 text-sm h-11 rounded-[16px] border-slate-100"/>
                                                <CurrencySelector value={tempInvCurrency} onChange={setTempInvCurrency} />
                                                <Input type="tel" placeholder="Harga Beli" value={tempInvPrice} onChange={(e) => handleNumberChange(setTempInvPrice, e.target.value)} className="flex-1 text-sm h-11 rounded-[16px] border-slate-100 font-bold"/>
                                            </div>
                                            <Button onClick={addInvItem} className="w-full bg-indigo-50 text-indigo-700 font-bold h-11 rounded-[16px] hover:bg-indigo-100 text-xs">TAMBAHKAN ASET INI</Button>
                                        </div>
                                    </div>
                                )}
                            </div>

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
                                                <CurrencySelector value={tempDebtCurrency} onChange={setTempDebtCurrency} />
                                                <Input type="tel" placeholder="Nominal" value={tempDebtAmount} onChange={(e) => handleNumberChange(setTempDebtAmount, e.target.value)} className="flex-1 font-bold h-12 rounded-[16px] border-slate-100 text-rose-600"/>
                                                <button onClick={addDebtItem} className="bg-rose-500 text-white p-3 rounded-[16px] hover:bg-rose-600 shadow-sm"><Plus className="w-5 h-5"/></button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-slate-900 text-white p-5 rounded-[24px] shadow-lg flex flex-col items-center justify-center mt-2">
                                <span className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-1">Estimasi Kekayaan Bersih</span>
                                
                                {/* 🚀 AUTO SHRINK DITERAPKAN DI SINI */}
                                <span className={`font-extrabold ${getBalanceTextSize(displayTotalStart)} ${totalStart >= 0 ? 'text-emerald-400' : 'text-rose-400'} whitespace-nowrap transition-all duration-300`}>
                                    {displayTotalStart}
                                </span>
                            </div>

                        </div>
                        <div className="pt-2 space-y-3">
                            <Button onClick={nextToTarget} className="w-full bg-emerald-500 hover:bg-emerald-600 h-16 text-lg font-extrabold rounded-full shadow-lg shadow-emerald-200">LANJUTKAN</Button>
                            <Button variant="ghost" onClick={() => setStep('intro')} className="w-full text-slate-400 font-bold">KEMBALI</Button>
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
                            <Button variant="ghost" onClick={() => setStep(isEditMode ? 'intro' : 'assets-setup')} className="w-full text-slate-400 font-bold">KEMBALI</Button>
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
                        <Button variant="ghost" onClick={() => isTargetMode ? setStep('target-input') : setStep(isEditMode ? 'intro' : 'assets-setup')} className="w-full text-sm text-slate-400 font-bold mt-2">KEMBALI</Button>
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