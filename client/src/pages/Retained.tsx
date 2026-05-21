import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { Hourglass, Plus, Trash2, Edit2, ArrowDownToLine, Loader2, X, AlertTriangle, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";

const FALLBACK_CURRENCIES = ["USD", "EUR", "SGD", "JPY", "AUD", "GBP", "CNY", "MYR", "SAR", "KRW", "THB"];

interface RetainedBalance {
    id: number;
    source: string;
    amount: number;
    currency: string;
    updatedAt: string;
}

export default function Retained() {
    const { toast } = useToast();
    const userEmail = localStorage.getItem("bilano_email") || "";
    const isTrialExpired = localStorage.getItem(`bilano_trial_expired_${userEmail}`) === "true";

    const [items, setItems] = useState<RetainedBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<RetainedBalance | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState<RetainedBalance | null>(null);

    const [tempSource, setTempSource] = useState("");
    const [tempAmount, setTempAmount] = useState("");
    const [tempCurrency, setTempCurrency] = useState("IDR");
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: forexRates = {} } = useQuery({
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

    const fetchRetained = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/retained", { headers: { "x-user-email": userEmail } });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRetained();
    }, []);

    const formatNumber = (val: string) => {
        const clean = val.replace(/[^0-9.,]/g, '');
        return clean;
    };
    
    const parseNumber = (val: string) => parseFloat(val.replace(/,/g, '.')) || 0;
    const formatRp = (val: number) => "Rp " + Math.round(val).toLocaleString("id-ID");

    const getRate = (curr: string) => curr === 'IDR' ? 1 : (safeForexRates[curr] || 15000);
    const totalRetainedIDR = items.reduce((acc, item) => acc + (item.amount * getRate(item.currency)), 0);

    const handleAdd = async () => {
        if (!tempSource || !tempAmount) return toast({ title: "Error", description: "Sumber & Nominal wajib diisi", variant: "destructive" });
        setIsSubmitting(true);
        try {
            await fetch("/api/retained", {
                method: "POST", headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify({ source: tempSource, amount: parseNumber(tempAmount), currency: tempCurrency })
            });
            toast({ title: "Tersimpan", description: "Saldo tertahan berhasil ditambahkan." });
            setShowAddModal(false);
            setTempSource(""); setTempAmount(""); setTempCurrency("IDR");
            fetchRetained();
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        setIsSubmitting(false);
    };

    const handleEdit = async () => {
        if (!showEditModal || !tempAmount) return;
        setIsSubmitting(true);
        try {
            await fetch(`/api/retained/${showEditModal.id}`, {
                method: "PUT", headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify({ amount: parseNumber(tempAmount) })
            });
            toast({ title: "Diperbarui", description: "Jumlah saldo tertahan berhasil diubah." });
            setShowEditModal(null);
            setTempAmount("");
            fetchRetained();
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Yakin ingin menghapus catatan saldo ini?")) return;
        try {
            await fetch(`/api/retained/${id}`, { method: "DELETE", headers: { "x-user-email": userEmail } });
            toast({ title: "Dihapus", description: "Catatan berhasil dihapus." });
            fetchRetained();
        } catch (e) {}
    };

    const handleWithdraw = async () => {
        if (!showWithdrawModal || !tempAmount) return;
        const wAmount = parseNumber(tempAmount);
        if (wAmount > showWithdrawModal.amount) return toast({ title: "Error", description: "Jumlah tarik melebihi saldo!", variant: "destructive" });
        if (wAmount <= 0) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/retained/${showWithdrawModal.id}/withdraw`, {
                method: "POST", headers: { "Content-Type": "application/json", "x-user-email": userEmail },
                body: JSON.stringify({ amount: wAmount })
            });
            
            if (res.ok) {
                toast({ title: "Pencairan Berhasil!", description: "Dana telah masuk ke Saldo Kas Utama." });
                setShowWithdrawModal(null);
                setTempAmount("");
                fetchRetained();
            } else {
                toast({ title: "Gagal", description: "Terjadi kesalahan server.", variant: "destructive" });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        setIsSubmitting(false);
    };

    if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500"/></div>;

    return (
        <MobileLayout title="Saldo Tertahan" showBack>
            <div className="space-y-6 pt-4 px-2 pb-20">
                
                <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl relative overflow-hidden">
                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <Hourglass className="w-3 h-3"/> Total Tertahan (Estimasi)
                            </p>
                            <h2 className="text-3xl font-bold text-amber-400 whitespace-nowrap transition-all duration-300">
                                {isTrialExpired ? "✨ Premium" : formatRp(totalRetainedIDR)}
                            </h2>
                        </div>
                    </div>
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl"></div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Daftar Sumber Dana</h3>
                        <Button onClick={() => setShowAddModal(true)} className="bg-amber-500 hover:bg-amber-600 text-[10px] h-8 rounded-full font-bold px-3 shadow-md shadow-amber-200">
                            + TAMBAH SALDO
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {items.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Hourglass className="w-8 h-8 mx-auto mb-2 opacity-30"/>
                                <p className="text-sm">Belum ada saldo tertahan.</p>
                            </div>
                        ) : (
                            items.map((item) => {
                                const idrVal = item.amount * getRate(item.currency);
                                const lastUpdate = new Date(item.updatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
                                
                                return (
                                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 transition-all hover:shadow-md">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-amber-50 text-amber-600 font-bold w-10 h-10 rounded-full flex items-center justify-center border border-amber-100 text-xs shadow-sm">
                                                    {item.currency}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-800 text-base">{item.source}</div>
                                                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                                        Diperbarui: {lastUpdate}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-extrabold text-slate-800 text-lg">{item.amount.toLocaleString('id-ID')}</div>
                                                <div className="text-[10px] text-slate-400">≈ {formatRp(idrVal)}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-3 border-t border-slate-50">
                                            <button onClick={() => { setShowEditModal(item); setTempAmount(item.amount.toString()); }} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                                                <Edit2 className="w-3 h-3"/> UPDATE
                                            </button>
                                            <button onClick={() => { setShowWithdrawModal(item); setTempAmount(""); }} className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-colors">
                                                <ArrowDownToLine className="w-3 h-3"/> TARIK
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="w-10 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* MODAL TAMBAH */}
                {showAddModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border-t-8 border-amber-500">
                            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-4">Tambah Saldo Tertahan</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block">Sumber Dana (Cth: AdSense)</label>
                                    <Input placeholder="Nama Sumber" value={tempSource} onChange={e => setTempSource(e.target.value)} className="h-12 text-sm bg-slate-50 rounded-xl"/>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1/3">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block">Mata Uang</label>
                                        <select value={tempCurrency} onChange={e => setTempCurrency(e.target.value)} className="w-full h-12 px-3 text-sm font-bold rounded-xl bg-amber-50 text-amber-700 outline-none border border-amber-100">
                                            <option value="IDR">IDR</option>
                                            {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1 block">Nominal</label>
                                        <Input type="text" inputMode="decimal" placeholder="0" value={tempAmount} onChange={e => setTempAmount(formatNumber(e.target.value))} className="h-12 font-bold text-sm bg-slate-50 rounded-xl"/>
                                    </div>
                                </div>
                                <Button disabled={isSubmitting} onClick={handleAdd} className="w-full h-12 bg-amber-500 hover:bg-amber-600 font-bold rounded-full mt-2 shadow-lg shadow-amber-200">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "SIMPAN"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL EDIT */}
                {showEditModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border-t-8 border-blue-500">
                            <button onClick={() => setShowEditModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Update Saldo</h3>
                            <p className="text-xs text-slate-500 mb-4">Sesuaikan saldo dari <b className="text-slate-700">{showEditModal.source}</b></p>
                            
                            <div className="space-y-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 font-bold text-slate-400">{showEditModal.currency}</span>
                                    <Input type="text" inputMode="decimal" value={tempAmount} onChange={e => setTempAmount(formatNumber(e.target.value))} className="pl-14 h-12 font-bold text-lg bg-slate-50 rounded-xl"/>
                                </div>
                                <Button disabled={isSubmitting} onClick={handleEdit} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-full shadow-lg shadow-blue-200">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "PERBARUI"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL WITHDRAW */}
                {showWithdrawModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border-t-8 border-emerald-500">
                            <button onClick={() => setShowWithdrawModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3">
                                <ArrowDownToLine className="w-6 h-6"/>
                            </div>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Tarik Saldo</h3>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Berapa {showWithdrawModal.currency} yang ingin Anda tarik dari <b className="text-slate-700">{showWithdrawModal.source}</b> ke Kas Utama?
                            </p>
                            
                            <div className="space-y-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 font-bold text-slate-400">{showWithdrawModal.currency}</span>
                                    <Input type="text" inputMode="decimal" placeholder="Maks: ..." value={tempAmount} onChange={e => setTempAmount(formatNumber(e.target.value))} className="pl-14 h-12 font-bold text-lg bg-slate-50 rounded-xl"/>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"/>
                                    <p className="text-[10px] text-emerald-800 font-medium">Uang ini akan ditambahkan ke Saldo Kas Anda dan otomatis terkonversi ke Rupiah.</p>
                                </div>
                                <Button disabled={isSubmitting} onClick={handleWithdraw} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-full shadow-lg shadow-emerald-200">
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "CAIRKAN KE KAS"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </MobileLayout>
    );
}