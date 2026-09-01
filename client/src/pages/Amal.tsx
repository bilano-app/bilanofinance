import { useState, useEffect } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { useUser, useTransactions, useAddTransaction, getAccessTier } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import {
    HeartHandshake, Loader2, CheckCircle2, History, Settings, Info,
    PieChart, X, AlertTriangle, AlertCircle, ArrowLeft, Sparkles,
    Check, Wallet, ChevronRight, Share2, HelpCircle, Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import SourceSelectionPopup from "@/components/SourceSelectionPopup";
import { trackEvent } from "@/lib/tracking";
import { queryClient } from "@/lib/queryClient";

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];

const AMAL_CATEGORIES = [
    { id: "Sedekah", label: "Sedekah Subuh / Harian", icon: "🌱" },
    { id: "Infaq", label: "Infaq Masjid & Sosial", icon: "🕌" },
    { id: "Zakat", label: "Zakat Mal (2.5%)", icon: "⚖️" },
    { id: "Donasi", label: "Donasi Kemanusiaan", icon: "🤝" },
    { id: "Wakaf", label: "Wakaf Produktif", icon: "🏛️" },
];

export default function Amal() {
    const { data: user } = useUser();
    const { data: transactions } = useTransactions();
    const addTransaction = useAddTransaction();
    const { toast } = useToast();

    const [amount, setAmount] = useState("");
    const [desc, setDesc] = useState("");
    const [selectedAmalCategory, setSelectedAmalCategory] = useState("Sedekah");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validationError, setValidationError] = useState("");

    const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "default" : "default";
    const accessTier = getAccessTier(user);
    const isLocked = accessTier === "free" && localStorage.getItem(`bilano_trial_expired_${userEmail}`) === "true";

    const [amalPct, setAmalPct] = useState<number>(2.5);
    const [amalDict, setAmalDict] = useState<Record<string, number>>({});
    const [showSettings, setShowSettings] = useState(false);
    const [tempPct, setTempPct] = useState("");
    const [isRetroactive, setIsRetroactive] = useState(false);

    // State Modal Kelebihan Amal & Sukses
    const [excessData, setExcessData] = useState<{ amount: number, excess: number, desc: string } | null>(null);
    const [successData, setSuccessData] = useState<{ amount: number, desc: string, source?: string } | null>(null);
    const [showSourcePopup, setShowSourcePopup] = useState(false);
    const [pendingAmalArgs, setPendingAmalArgs] = useState<{
        finalAmt: number;
        description: string;
        ikhlasEkstra: boolean;
        excessAmt: number;
    } | null>(null);

    useEffect(() => {
        const savedPct = localStorage.getItem(`bilano_amal_pct_${userEmail}`);
        if (savedPct) setAmalPct(parseFloat(savedPct));

        const savedDict = localStorage.getItem(`bilano_amal_dict_${userEmail}`);
        if (savedDict) setAmalDict(JSON.parse(savedDict));
    }, [userEmail]);

    const formatNum = (val: string) => {
        if (!val) return "";
        let raw = val.replace(/\./g, "").replace(/[^0-9]/g, "");
        if (raw.length > 1) {
            raw = raw.replace(/^0+/, '');
        }
        return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };

    const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

    const handleSaveSettings = () => {
        const newPct = parseFloat(tempPct);
        if (isNaN(newPct) || newPct < 0 || newPct > 100) {
            toast({ title: "Error", description: "Masukkan persentase valid (0-100%).", variant: "destructive" });
            return;
        }

        if (isRetroactive) {
            setAmalDict({});
            localStorage.setItem(`bilano_amal_dict_${userEmail}`, JSON.stringify({}));
        } else {
            const newDict = { ...amalDict };
            const incomes = transactions?.filter(t =>
                (t.type === 'income' && !t.description?.includes('[PIUTANG_PENDAPATAN]') && !t.description?.includes('Belum Dibayar')) ||
                (t.type === 'debt_receive' && t.description?.includes('[Pemasukan Cair]'))
            ) || [];
            incomes.forEach(inc => {
                if (newDict[inc.id] === undefined) newDict[inc.id] = amalPct;
            });
            setAmalDict(newDict);
            localStorage.setItem(`bilano_amal_dict_${userEmail}`, JSON.stringify(newDict));
        }

        setAmalPct(newPct);
        localStorage.setItem(`bilano_amal_pct_${userEmail}`, newPct.toString());
        setShowSettings(false);
        toast({ title: "Pengaturan Disimpan! ✨", description: `Alokasi amal disetel menjadi ${newPct}%` });
    };

    // 🚀 FILTER TRANSAKSI PEMASUKAN MURNI
    const pureIncomes = (transactions || []).filter(t => {
        const isPureIncome = t.type === 'income' &&
            !t.description?.includes('[PIUTANG_PENDAPATAN]') &&
            !t.description?.includes('Belum Dibayar');

        const isCairReceivable = t.type === 'debt_receive' &&
            t.description?.includes('[Pemasukan Cair]');

        const isValidIncomeArrive = isPureIncome || isCairReceivable;

        const isSystemLog = t.description?.includes('[Offset') ||
            t.description?.includes('[WRITE_OFF]') ||
            t.description?.includes('[Catat Awal]') ||
            t.category === 'Penyesuaian Sistem' ||
            t.category === 'Pemutihan Hutang';

        return isValidIncomeArrive && !isSystemLog;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const amalTxs = (transactions || []).filter(t => t.category === 'Amal').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let totalAmalPaid = amalTxs.reduce((acc, t) => {
        let val = t.amount;
        const match = t.description?.match(/\[Ekstra:\s*([0-9.,]+)\]/i);
        if (match) {
            const extraAmt = parseFloat(match[1].replace(/[^0-9.-]+/g, ""));
            val -= isNaN(extraAmt) ? 0 : extraAmt;
        }
        return acc + val;
    }, 0);

    const totalKebaikan = amalTxs.reduce((acc, t) => acc + t.amount, 0);

    const allocationDetails: any[] = [];
    let totalSisaAnggaran = 0;

    pureIncomes.forEach(inc => {
        const pctToUse = amalDict[inc.id] !== undefined ? amalDict[inc.id] : amalPct;
        if (pctToUse <= 0) return;

        const allocatedAmount = inc.amount * (pctToUse / 100);
        let remainingForThis = allocatedAmount;
        let status = 'Belum';

        if (totalAmalPaid >= allocatedAmount) {
            remainingForThis = 0;
            totalAmalPaid -= allocatedAmount;
            status = 'Lunas';
        } else if (totalAmalPaid > 0) {
            remainingForThis = allocatedAmount - totalAmalPaid;
            totalAmalPaid = 0;
            status = 'Sebagian';
        }

        totalSisaAnggaran += remainingForThis;

        const displayDesc = inc.type === 'debt_receive'
            ? `Pencairan: ${inc.description?.replace('[PIUTANG_PENDAPATAN]', '').replace('[Pemasukan Cair]', '').trim()}`
            : (inc.description || inc.category);

        allocationDetails.push({ ...inc, displayDesc, pctUsed: pctToUse, allocatedAmount, remainingForThis, status });
    });

    allocationDetails.reverse();

    const sisaDepositAmal = Math.max(0, totalAmalPaid);

    // 🚀 VALIDASI SEBELUM SUBMIT
    const checkAndSaveAmal = () => {
        setValidationError("");
        if (isLocked) { window.dispatchEvent(new Event('trigger-paywall-lock')); return; }

        const finalAmount = parseNum(amount);
        if (finalAmount <= 0) {
            setValidationError("Masukkan nominal amal yang ingin dikeluarkan.");
            toast({ title: "Nominal Kosong", description: "Masukkan jumlah nominal amal.", variant: "destructive" });
            return;
        }

        const currentBalance = user?.cashBalance || 0;
        if (user && finalAmount > currentBalance) {
            setValidationError(`Saldo Kas tidak mencukupi (Maksimal: ${formatCurrency(currentBalance).split(',')[0]}).`);
            toast({ title: "Saldo Kurang", description: "Nominal melebihi total saldo kas Anda.", variant: "destructive" });
            return;
        }

        const cleanPurpose = desc.trim() ? `${selectedAmalCategory}: ${desc.trim()}` : `${selectedAmalCategory}`;
        const excess = finalAmount - totalSisaAnggaran;

        // Jika ada kelebihan dibanding sisa anggaran kewajiban FIFO, munculkan opsi konfirmasi
        if (excess > 0 && totalSisaAnggaran > 0) {
            setExcessData({ amount: finalAmount, excess, desc: cleanPurpose });
        } else {
            executeSaveAmalInit(finalAmount, cleanPurpose, false, 0);
        }
    };

    const executeSaveAmalInit = (finalAmt: number, description: string, ikhlasEkstra: boolean, excessAmt: number) => {
        // Tutup modal excess terlebih dahulu agar tidak menumpuk
        setExcessData(null);

        if (user?.walletSources && (user.walletSources as any[]).length > 0) {
            setPendingAmalArgs({ finalAmt, description, ikhlasEkstra, excessAmt });
            setShowSourcePopup(true);
        } else {
            executeSaveAmal(finalAmt, description, ikhlasEkstra, excessAmt);
        }
    };

    const executeSaveAmal = async (finalAmt: number, description: string, ikhlasEkstra: boolean, excessAmt: number, selectedSource?: string) => {
        setIsSubmitting(true);
        setValidationError("");

        let finalDesc = description;
        if (ikhlasEkstra && excessAmt > 0) {
            finalDesc = `${description} [Ekstra: ${excessAmt}]`.trim();
        }

        try {
            await addTransaction.mutateAsync({
                type: 'expense',
                amount: finalAmt,
                category: 'Amal',
                description: finalDesc,
                date: new Date(),
                source: selectedSource
            } as any);

            trackEvent("amal_tx_added", {
                isExtra: ikhlasEkstra,
                amount: finalAmt
            });

            // Refresh query cache secara menyeluruh
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["user"] });
            queryClient.invalidateQueries();

            // Tampilkan Modal Sukses Besar yang Jelas & Mantap
            setSuccessData({
                amount: finalAmt,
                desc: finalDesc,
                source: selectedSource
            });

            // Reset Form Input
            setAmount("");
            setDesc("");
            setExcessData(null);
            setPendingAmalArgs(null);

            toast({
                title: "Terima kasih! Amal Tercatat 🤲",
                description: `Pengeluaran ${formatCurrency(finalAmt).split(',')[0]} berhasil dibukukan.`
            });
        } catch (e: any) {
            console.error("Gagal mencatat amal:", e);
            toast({
                title: "Gagal Mencatat",
                description: e.message || "Terjadi kesalahan sistem, silakan coba lagi.",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <MobileLayout>
            <div className="flex flex-col -mx-5 -mt-5">

                {/* ========================================================================= */}
                {/* 1. TOP HEADER BANNER DENGAN TEMA EMERALD GREEN (#059669) & GOLD ACCENTS */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#ECFDF5] via-[#D1FAE5] to-[#A7F3D0] flex flex-col relative z-10 border-b-2 border-emerald-500">

                    {/* Top Navigation Bar */}
                    <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(5,150,105,0.08)] flex items-center justify-between relative z-30 border-b border-emerald-100">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <button
                                    className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                    title="Kembali ke Beranda"
                                >
                                    <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                                </button>
                            </Link>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                                        Manajemen Kebaikan
                                    </p>
                                </div>
                                <h1 className="text-lg font-black text-slate-900 leading-tight">
                                    Amal & Sedekah
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => { setTempPct(amalPct.toString()); setShowSettings(true); }}
                                className="flex items-center gap-1.5 bg-white border-2 border-emerald-200 hover:bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                                title="Pengaturan Alokasi Amal"
                            >
                                <Settings className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[11px] font-black">{amalPct}%</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. HERO CARD EMERALD — FORMAT PERSIS CARD HOME */}
                    <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white p-5 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                        {/* Watermark Icon */}
                        <HeartHandshake className="absolute -right-4 -bottom-4 w-36 h-36 text-white/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-white/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex justify-between items-center mb-3">
                                <span className="bg-white/20 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-white/20 backdrop-blur-xs flex items-center gap-1">
                                    <HeartHandshake className="w-3 h-3 text-emerald-200" />
                                    TABUNGAN AKHIRAT
                                </span>

                                <span className="text-[10px] text-emerald-100 font-bold bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                                    FIFO System
                                </span>
                            </div>

                            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest mb-0.5">
                                Total Kebaikan Terkumpul
                            </p>
                            <h2 className="text-3xl font-black tracking-tight text-white mb-4">
                                {formatCurrency(totalKebaikan).split(',')[0]}
                            </h2>

                            {/* Box Anggaran Tertunda */}
                            <div className="bg-emerald-950/50 backdrop-blur-md p-3.5 rounded-2xl border border-emerald-400/30 text-center">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                                        Anggaran Tertunda Saat Ini:
                                    </span>
                                    <span className="text-[10px] font-black text-brand-gold bg-brand-gold/15 px-2 py-0.5 rounded-md border border-brand-gold/30">
                                        {amalPct}% dari Masuk
                                    </span>
                                </div>
                                <h3 className="text-2xl font-black text-white tabular-nums">
                                    {formatCurrency(totalSisaAnggaran).split(',')[0]}
                                </h3>
                            </div>

                            {/* Deposit Info jika ada surplus sedekah masa lalu */}
                            {sisaDepositAmal > 0 && (
                                <div className="mt-3 bg-white/15 border border-white/25 rounded-2xl p-2.5 text-left flex items-start gap-2.5 animate-in slide-in-from-bottom-2">
                                    <Info className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-[10px] text-brand-gold font-black uppercase tracking-wider">
                                            Deposit Amal Aktif: {formatCurrency(sisaDepositAmal).split(',')[0]}
                                        </p>
                                        <p className="text-[9px] text-emerald-100/90 leading-relaxed mt-0.5">
                                            Kelebihan sedekah Anda otomatis memotong kewajiban dari pemasukan baru mendatang.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. FORM CATAT AMAL BARU (EMERALD STYLE) */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-20 bg-slate-50 flex flex-col gap-6">

                    {/* Card Form Input */}
                    <div className="bg-white rounded-[28px] p-5 border-2 border-emerald-200 shadow-[5px_5px_0px_0px] shadow-slate-900 relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-slate-900 text-sm flex items-center uppercase tracking-wider">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
                                Catat Pengeluaran Amal
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400">Kas Langsung</span>
                        </div>

                        {/* Kategori Pilihan */}
                        <div className="mb-4">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                                Pilih Jenis Kebaikan
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {AMAL_CATEGORIES.map(cat => {
                                    const isSelected = selectedAmalCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setSelectedAmalCategory(cat.id)}
                                            className={`p-2.5 rounded-2xl text-left border-2 transition-all flex items-center gap-2 cursor-pointer ${isSelected
                                                    ? "bg-emerald-50 border-emerald-600 text-emerald-950 font-black shadow-[2px_2px_0px_0px] shadow-emerald-900"
                                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300 font-bold"
                                                }`}
                                        >
                                            <span className="text-base">{cat.icon}</span>
                                            <span className="text-xs truncate">{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Input Nominal */}
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Nominal Amal (Rp)
                                    </label>
                                    {totalSisaAnggaran > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setAmount(formatNum(String(Math.round(totalSisaAnggaran))))}
                                            className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 underline underline-offset-2 cursor-pointer"
                                        >
                                            Pas Sisa Anggaran ({formatCurrency(totalSisaAnggaran).split(',')[0]})
                                        </button>
                                    )}
                                </div>

                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">Rp</span>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        value={amount}
                                        onChange={e => {
                                            setAmount(formatNum(e.target.value));
                                            setValidationError("");
                                        }}
                                        className="pl-12 h-14 text-2xl font-black text-slate-800 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-300"
                                        placeholder="0"
                                    />
                                </div>

                                {/* Tombol Nominal Cepat */}
                                <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-hide">
                                    {QUICK_AMOUNTS.map((amt) => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => {
                                                setAmount(formatNum(String(amt)));
                                                setValidationError("");
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-100 border border-slate-200 text-[11px] font-black text-slate-700 hover:text-emerald-800 shrink-0 transition-all active:scale-95 cursor-pointer"
                                        >
                                            +{amt / 1000}rb
                                        </button>
                                    ))}
                                </div>

                                {validationError && (
                                    <p className="text-[11px] text-rose-500 font-bold mt-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                        {validationError}
                                    </p>
                                )}
                            </div>

                            {/* Input Catatan / Tujuan */}
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1.5">
                                    Tujuan / Keterangan (Opsional)
                                </label>
                                <Input
                                    value={desc}
                                    onChange={e => setDesc(e.target.value)}
                                    className="h-12 bg-slate-50 border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-emerald-600"
                                    placeholder="Contoh: Kotak Amal Masjid, Panti Asuhan, Sahabat..."
                                />
                            </div>

                            {/* Tombol Eksekusi Submit */}
                            <button
                                type="button"
                                onClick={checkAndSaveAmal}
                                disabled={isSubmitting}
                                className="w-full h-14 mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>MEMBUKUKAN AMAL...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                                        <span>KELUARKAN DANA AMAL</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 3. RINCIAN ALOKASI FIFO PEMASUKAN */}
                    {/* ========================================================================= */}
                    <div className="bg-white rounded-[28px] p-5 border-2 border-slate-200 shadow-[4px_4px_0px_0px] shadow-slate-900">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-black text-slate-900 text-xs flex items-center gap-2 uppercase tracking-wider">
                                <Info className="w-4 h-4 text-emerald-600" />
                                Alokasi Pemasukan (FIFO)
                            </h3>
                            <span className="text-[10px] text-slate-400 font-bold">{allocationDetails.length} Transaksi</span>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-hide">
                            {allocationDetails.length > 0 ? (
                                allocationDetails.map((inc, i) => (
                                    <div
                                        key={inc.id || i}
                                        className={`p-3.5 rounded-2xl border transition-all ${inc.status === 'Lunas'
                                                ? 'bg-emerald-50/50 border-emerald-200 opacity-70'
                                                : inc.status === 'Sebagian'
                                                    ? 'bg-amber-50/70 border-amber-200'
                                                    : 'bg-slate-50 border-slate-200'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1.5">
                                            <span className={`text-xs font-bold w-2/3 line-clamp-1 ${inc.status === 'Lunas' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                                {inc.displayDesc}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">
                                                {new Date(inc.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center bg-white/80 p-2 rounded-xl border border-slate-100 mb-2">
                                            <span className="text-[10px] font-mono text-slate-500">
                                                {formatCurrency(inc.amount).replace('Rp ', '')} × {inc.pctUsed}%
                                            </span>
                                            <span className="text-[11px] font-black text-slate-800">
                                                = {formatCurrency(inc.allocatedAmount).split(',')[0]}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            {inc.status === 'Lunas' && (
                                                <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-emerald-300">
                                                    <Check className="w-3 h-3 stroke-[3]" /> TERCAPAI
                                                </span>
                                            )}
                                            {inc.status === 'Sebagian' && (
                                                <span className="text-[9px] bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md font-black flex items-center gap-1 border border-amber-300">
                                                    <AlertTriangle className="w-3 h-3" /> SISA: {formatCurrency(inc.remainingForThis).split(',')[0]}
                                                </span>
                                            )}
                                            {inc.status === 'Belum' && (
                                                <span className="text-[9px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md font-black">
                                                    BELUM TERCAPAI
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-xs text-slate-400 font-medium">Belum ada catatan pemasukan yang dialokasikan.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 4. RIWAYAT PENGELUARAN AMAL */}
                    {/* ========================================================================= */}
                    <div>
                        <h3 className="font-black text-slate-900 text-sm mb-3 px-1 flex items-center gap-2 uppercase tracking-wider">
                            <History className="w-4 h-4 text-emerald-600" />
                            Riwayat Pengeluaran Amal
                        </h3>

                        <div className="space-y-2.5">
                            {amalTxs.length > 0 ? (
                                amalTxs.map(t => (
                                    <div
                                        key={t.id}
                                        className="bg-white p-4 rounded-[22px] border-2 border-slate-200 shadow-[3px_3px_0px_0px] shadow-slate-900 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                                                <HeartHandshake className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-xs sm:text-sm line-clamp-1">
                                                    {t.description || "Amal / Sedekah"}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                    {new Date(t.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                    {t.source ? ` • ${t.source}` : ""}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="font-black text-emerald-600 text-sm tabular-nums">
                                            -{formatCurrency(t.amount).split(',')[0]}
                                        </p>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-white rounded-[24px] border-2 border-dashed border-slate-200">
                                    <HeartHandshake className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-400 font-bold">Belum ada catatan amal yang dikeluarkan.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 🌟 MODAL SUKSES CATAT AMAL (BERSIH, JELAS, TIDAK BIKIN STUCK) */}
            {/* ========================================================================= */}
            {successData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl text-center border-4 border-emerald-500 relative overflow-hidden animate-in zoom-in-95">
                        <div className="w-20 h-20 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-emerald-200">
                            <HeartHandshake className="w-10 h-10 stroke-[2.5]" />
                        </div>

                        <span className="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 border border-emerald-300">
                            ALHAMDULILLAH TERCATAT! 🤲
                        </span>

                        <h3 className="text-2xl font-black text-slate-900 mb-1">
                            {formatCurrency(successData.amount).split(',')[0]}
                        </h3>
                        <p className="text-xs text-slate-500 font-bold mb-4">
                            {successData.desc}
                        </p>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-5 text-left text-xs font-semibold text-emerald-900 leading-relaxed">
                            🌟 Semoga sedekah ini menjadi pembuka pintu rezeki yang berlipat ganda, penolak bala, dan pemberat timbangan kebaikan.
                        </div>

                        <div className="space-y-2">
                            <Button
                                onClick={() => setSuccessData(null)}
                                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                            >
                                Selesai & Catat Lagi
                            </Button>
                            <Link href="/">
                                <button
                                    onClick={() => setSuccessData(null)}
                                    className="w-full h-10 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors"
                                >
                                    Kembali ke Beranda
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ⚙️ MODAL PENGATURAN TARGET ALOKASI PERSENTASE */}
            {/* ========================================================================= */}
            {showSettings && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-4 border-emerald-500">
                        <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-10">
                            <X className="w-5 h-5" />
                        </button>

                        <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                            <PieChart className="w-8 h-8" />
                        </div>

                        <h3 className="text-xl font-black text-slate-900 mb-1">Target Persentase Amal</h3>
                        <p className="text-xs text-slate-500 font-semibold mb-5 leading-relaxed px-2">
                            Berapa persen dari setiap pemasukan yang ingin dialokasikan untuk sedekah & zakat?
                        </p>

                        <div className="flex items-center justify-center gap-2 mb-5">
                            <Input
                                type="number"
                                step="0.1"
                                value={tempPct}
                                onChange={e => setTempPct(e.target.value)}
                                className="h-14 w-32 font-black text-3xl text-center bg-slate-50 border-2 border-emerald-200 rounded-2xl focus:border-emerald-600"
                            />
                            <span className="text-2xl font-black text-slate-600">%</span>
                        </div>

                        <div
                            className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-left mb-6 cursor-pointer"
                            onClick={() => setIsRetroactive(!isRetroactive)}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5 border ${isRetroactive ? 'bg-emerald-600 border-emerald-600' : 'bg-white border-slate-300'}`}>
                                    {isRetroactive && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-800">Ubah Data Masa Lalu (Retroaktif)</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                                        Hitung ulang alokasi dari <b>seluruh pemasukan lama</b> dengan persentase baru ini.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSaveSettings}
                            className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all"
                        >
                            SIMPAN PENGATURAN
                        </Button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* ⚠️ MODAL KELEBIHAN AMAL (SURPLUS SEDEKAH) */}
            {/* ========================================================================= */}
            {excessData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/85 backdrop-blur-sm animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-4 border-amber-400">
                        <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-1">Kelebihan Sedekah</h3>
                        <p className="text-xs text-slate-600 mb-4 leading-relaxed px-1 font-medium">
                            Anggaran kewajiban tertunda saat ini: <b>{formatCurrency(totalSisaAnggaran).split(',')[0]}</b>, Anda beramal <b>{formatCurrency(excessData.amount).split(',')[0]}</b> (Kelebihan: <b>{formatCurrency(excessData.excess).split(',')[0]}</b>).
                        </p>

                        <div className="space-y-2.5">
                            <button
                                onClick={() => executeSaveAmalInit(excessData.amount, excessData.desc, false, 0)}
                                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-[3px_3px_0px_0px] shadow-slate-900 active:translate-x-[1px] active:translate-y-[1px] transition-all cursor-pointer"
                            >
                                JADIKAN DEPOSIT PEMOTONG MASA DEPAN
                            </button>
                            <button
                                onClick={() => executeSaveAmalInit(excessData.amount, excessData.desc, true, excessData.excess)}
                                className="w-full h-12 rounded-2xl font-black text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-xs transition-colors cursor-pointer"
                            >
                                IKHLASKAN SEPENUHNYA (EKSTRA SEDEKAH)
                            </button>
                            <button
                                onClick={() => setExcessData(null)}
                                className="text-xs font-bold text-slate-400 hover:text-slate-600 py-1"
                            >
                                Batal & Kembali
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 💼 POPUP PEMILIHAN SUMBER DANA DOMPET */}
            {/* ========================================================================= */}
            {showSourcePopup && (
                <SourceSelectionPopup
                    type="expense"
                    title="Pilih Sumber Dana Amal"
                    description="Pilih dompet atau rekening yang digunakan untuk beramal ini."
                    onCancel={() => {
                        setShowSourcePopup(false);
                        setPendingAmalArgs(null);
                    }}
                    onSelect={(src) => {
                        setShowSourcePopup(false);
                        if (pendingAmalArgs) {
                            executeSaveAmal(
                                pendingAmalArgs.finalAmt,
                                pendingAmalArgs.description,
                                pendingAmalArgs.ikhlasEkstra,
                                pendingAmalArgs.excessAmt,
                                src
                            );
                        }
                        setPendingAmalArgs(null);
                        setExcessData(null);
                    }}
                />
            )}

        </MobileLayout>
    );
}