import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { Hourglass, Plus, Trash2, Edit2, ArrowDownToLine, Loader2, X, AlertTriangle, Crown, ShieldCheck, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@/hooks/use-finance";

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
    const { data: user, isLoading: isUserLoading } = useUser();
    
    const userEmail = localStorage.getItem("bilano_email") || "";
    const isPro = user?.isPro || localStorage.getItem("bilano_pro") === "true";
    
    const startTime = new Date(user?.createdAt || Date.now()).getTime();
    const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
    const isTrialExpired = daysPassed >= 3;

    // 🚀 KUNCI LOCKOUT: Hanya pengguna aktif (Trial & Pro) yang bisa masuk
    const isLocked = !isUserLoading && !isPro && isTrialExpired;

    const [items, setItems] = useState<RetainedBalance[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCharging, setIsCharging] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState<RetainedBalance | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState<RetainedBalance | null>(null);

    const [tempSource, setTempSource] = useState("");
    const [tempAmount, setTempAmount] = useState("");
    const [tempCurrency, setTempCurrency] = useState("IDR");
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    // Cek Status Setup & State Modal Pop-up
    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    const [showSetupPrompt, setShowSetupPrompt] = useState(false);

    const { data: forexRates = {} } = useQuery({
        queryKey: ['forexRates', userEmail],
        queryFn: async () => {
            const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": userEmail }});
            if (!res.ok) return {};
            return res.json();
        },
        enabled: !!userEmail && !isLocked
    });

    const safeForexRates = typeof forexRates === 'object' && forexRates !== null ? forexRates : {};
    const availableCurrencies = Object.keys(safeForexRates).length > 0 ? Object.keys(safeForexRates) : FALLBACK_CURRENCIES;

    const fetchRetained = async () => {
        if (isLocked) return;
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
        if (!isLocked) fetchRetained();
    }, [isLocked]);

    const handleLanjutBayar = async () => {
      if (!currentUserEmail) { toast({ title: "Email required", variant: "destructive" }); return; }
      setIsCharging(true);
      try {
          const res = await fetch("/api/payment/mayar/charge", { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ plan: selectedPlan }) 
          });
          const data = await res.json();
          if (res.ok && data.redirectUrl) {
              window.location.href = data.redirectUrl; 
          } else { 
              toast({ title: "Gagal memuat kasir", description: data.error || "Coba lagi nanti.", variant: "destructive" }); 
          }
      } catch (error) { 
          toast({ title: "Error koneksi", variant: "destructive" }); 
      } finally { 
          setIsCharging(false); 
      }
    };

    // 🚀 PERBAIKAN PEMBACAAN INPUT UANG ALAMAT INDONESIA
    const formatNumber = (val: string) => {
        let cleaned = val.replace(/[^0-9.,]/g, '');
        // Cegah pengguna memasukkan koma lebih dari satu
        const parts = cleaned.split(',');
        if (parts.length > 2) {
            cleaned = parts[0] + ',' + parts.slice(1).join('');
        }
        return cleaned;
    };
    
    const parseNumber = (val: string) => {
        if (!val) return 0;
        // Hapus titik ribuan, ubah koma menjadi titik desimal standar
        const clean = val.replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(clean) || 0;
    };

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
            setShowEditModal(null); setTempAmount("");
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
                setShowWithdrawModal(null); setTempAmount("");
                fetchRetained();
            } else {
                toast({ title: "Gagal", description: "Terjadi kesalahan server.", variant: "destructive" });
            }
        } catch (e) { toast({ title: "Error", variant: "destructive" }); }
        setIsSubmitting(false);
    };

    // 🚀 TAMPILAN LOCKOUT UNTUK PENGGUNA NON-PREMIUM & EXPIRED
    if (isLocked) {
        return (
            <MobileLayout title="Saldo Tertahan" showBack>
                <div className="relative min-h-screen bg-slate-50 overflow-hidden pb-24 overflow-y-auto">
                    <div className="p-4 space-y-6 blur-md opacity-40 select-none pointer-events-none mt-2">
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 h-48 rounded-[32px] w-full shadow-lg"></div>
                        <div className="bg-white h-72 rounded-[32px] shadow-sm border border-slate-200 w-full"></div>
                    </div>
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center px-4 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-500 rounded-full flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(251,191,36,0.4)] mt-8">
                            <Crown className="w-10 h-10 text-amber-950" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">Fitur Premium 👑</h2>
                        <p className="text-sm text-slate-600 mb-6 max-w-xs leading-relaxed font-medium">
                            Pelacakan Saldo Tertahan (AdSense, AdMob, Platform Freelance) eksklusif untuk pengguna <b className="text-slate-800">BILANO PRO</b>.
                        </p>
                        <div className="w-full max-w-sm space-y-3 mb-6">
                            <div onClick={() => setSelectedPlan('yearly')} className={`relative p-5 rounded-[20px] border-2 cursor-pointer transition-all text-left ${selectedPlan === 'yearly' ? 'border-amber-400 bg-gradient-to-br from-slate-900 to-indigo-950 shadow-xl' : 'border-slate-200 bg-white'}`}>
                                {selectedPlan === 'yearly' && <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl z-10 shadow-sm">PALING HEMAT</div>}
                                <div className="flex justify-between items-center mb-1">
                                    <h4 className={`font-black text-lg ${selectedPlan === 'yearly' ? 'text-amber-400' : 'text-slate-800'}`}>Paket 1 Tahun</h4>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400' : 'border-slate-300'}`}></div>
                                </div>
                                <p className={`text-3xl font-black tracking-tight ${selectedPlan === 'yearly' ? 'text-white' : 'text-slate-800'}`}>Rp 8.250 <span className="text-xs font-bold opacity-60">/ bulan</span></p>
                            </div>
                        </div>
                        <Button onClick={handleLanjutBayar} disabled={isCharging} className="w-full max-w-sm h-14 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-full shadow-2xl flex items-center justify-center gap-2">
                            {isCharging ? <Loader2 className="w-5 h-5 animate-spin"/> : "BUKA AKSES PREMIUM"}
                        </Button>
                        <p className="mt-4 text-[10px] text-slate-400 font-medium flex items-center gap-1.5 pb-8">
                            <ShieldCheck className="w-4 h-4 text-emerald-500"/> Integrasi Checkout Aman Terverifikasi Mayar
                        </p>
                    </div>
                </div>
            </MobileLayout>
        );
    }

    if (isUserLoading || isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-amber-500"/></div>;

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
                                {formatRp(totalRetainedIDR)}
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
                                                    <div className="text-[10px] text-slate-400">Diperbarui: {lastUpdate}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-extrabold text-slate-800 text-lg">{item.amount.toLocaleString('id-ID')}</div>
                                                <div className="text-[10px] text-slate-400">≈ {formatRp(idrVal)}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-3 border-t border-slate-50">
                                            <button onClick={() => { setShowEditModal(item); setTempAmount(item.amount.toString().replace('.', ',')); }} className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                                                <Edit2 className="w-3 h-3"/> UPDATE
                                            </button>
                                            <button onClick={() => { setShowWithdrawModal(item); setTempAmount(""); }} className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                                                <ArrowDownToLine className="w-3 h-3"/> TARIK
                                            </button>
                                            <button onClick={() => handleDelete(item.id)} className="w-10 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg">
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {showAddModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border-t-8 border-amber-500">
                            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-4">Tambah Saldo</h3>
                            <div className="space-y-4">
                                <Input placeholder="Nama Sumber (Cth: AdSense)" value={tempSource} onChange={e => setTempSource(e.target.value)} className="h-12 text-sm bg-slate-50 rounded-xl"/>
                                <div className="flex gap-2">
                                    <select value={tempCurrency} onChange={e => setTempCurrency(e.target.value)} className="w-1/3 h-12 px-3 text-sm font-bold rounded-xl bg-amber-50 text-amber-700 outline-none border border-amber-100">
                                        <option value="IDR">IDR</option>
                                        {availableCurrencies.filter(c => c !== "IDR").map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <Input type="text" inputMode="decimal" placeholder="0" value={tempAmount} onChange={e => setTempAmount(formatNumber(e.target.value))} className="flex-1 h-12 font-bold text-sm bg-slate-50 rounded-xl"/>
                                </div>
                                <Button disabled={isSubmitting} onClick={handleAdd} className="w-full h-12 bg-amber-500 hover:bg-amber-600 font-bold rounded-full mt-2 shadow-lg">SIMPAN</Button>
                            </div>
                        </div>
                    </div>
                )}

                {showEditModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border-t-8 border-blue-500">
                            <button onClick={() => setShowEditModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Update Saldo</h3>
                            <p className="text-xs text-slate-500 mb-4">Sesuaikan nilai baru dari platform <b className="text-slate-700">{showEditModal.source}</b></p>
                            <div className="space-y-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 font-bold text-slate-400">{showEditModal.currency}</span>
                                    <Input type="text" inputMode="decimal" value={tempAmount} onChange={e => setTempAmount(formatNumber(e.target.value))} className="pl-14 h-12 font-bold text-lg bg-slate-50 rounded-xl"/>
                                </div>
                                <Button disabled={isSubmitting} onClick={handleEdit} className="w-full h-12 bg-blue-600 hover:bg-blue-700 font-bold rounded-full">PERBARUI</Button>
                            </div>
                        </div>
                    </div>
                )}

                {showWithdrawModal && (
                    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-white rounded-[24px] p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 border-t-8 border-emerald-500">
                            <button onClick={() => setShowWithdrawModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Tarik Saldo</h3>
                            <p className="text-xs text-slate-500 mb-4">Cairkan dana dari <b className="text-slate-700">{showWithdrawModal.source}</b> ke Saldo Kas Utama.</p>
                            <div className="space-y-4">
                                <div className="relative">
                                    <span className="absolute left-4 top-3.5 font-bold text-slate-400">{showWithdrawModal.currency}</span>
                                    <Input type="text" inputMode="decimal" placeholder="Masukkan jumlah penarikan..." value={tempAmount} onChange={e => setTempAmount(formatNumber(e.target.value))} className="pl-14 h-12 font-bold text-lg bg-slate-50 rounded-xl"/>
                                </div>
                                <Button disabled={isSubmitting} onClick={handleWithdraw} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold rounded-full">KONFIRMASI PENCAIRAN</Button>
                            </div>
                        </div>
                    </div>
                )}
                
            </div>
{/* 🚀 Pop-up Penghalang Submit (Belum Setup) */}
            {showSetupPrompt && (
                <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-[32px] p-6 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border border-slate-100">
                        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5">
                            <AlertCircle className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Aksi Tertahan</h2>
                        <p className="text-[13px] text-slate-500 mb-6 leading-relaxed">
                            Untuk memastikan laporan tetap akurat, Anda harus menyelesaikan Setup Saldo Awal sebelum mencatat transaksi.
                        </p>
                        <div className="space-y-3">
                            <Button onClick={() => window.location.href = '/target'} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-full shadow-lg">LAKUKAN SETUP SEKARANG</Button>
                            <Button variant="ghost" onClick={() => setShowSetupPrompt(false)} className="w-full h-12 font-bold text-slate-400 hover:text-slate-600 rounded-full">Tutup</Button>
                        </div>
                    </div>
                </div>
            )}
        </MobileLayout>
    );
}