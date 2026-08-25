import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    Mic, ImagePlus, Check, X, Globe, AlertTriangle, RefreshCw, 
    Loader2, HandCoins, Wallet, AlertCircle, ArrowLeft, Sparkles, 
    Camera, ScanLine, CheckCircle2, ChevronRight, Info, ShieldAlert,
    HelpCircle, Banknote
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";

export default function SmartScan() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();
    const { data: user } = useUser();
    
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState("Menyiapkan Sistem AI...");
    
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [liveRates, setLiveRates] = useState<Record<string, number>>({});
    
    const [targetData, setTargetData] = useState<any>(null);
    const [currentExpense, setCurrentExpense] = useState(0);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    const [showResultForm, setShowResultForm] = useState(false);
    const [detectedType, setDetectedType] = useState<'income' | 'expense' | 'debt' | 'receivable'>('expense');
    
    const [paymentMode, setPaymentMode] = useState<'cash' | 'pending'>('cash');
    
    const [isForex, setIsForex] = useState(false);
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [desc, setDesc] = useState("");
    const [currency, setCurrency] = useState("USD");
    const [rate, setRate] = useState("16.000");
    const [debtName, setDebtName] = useState("");

    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [emergencyDetails, setEmergencyDetails] = useState({ deficit: 0, nextMonthLimit: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    const isPro = user?.isPro || (typeof window !== 'undefined' && localStorage.getItem("bilano_pro") === "true");

    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;
    const isLocked = !isPro && isTrialExpired; 
    
    const getAuthHeaders = () => ({ "x-user-email": currentUserEmail });

    const formatNum = (val: string) => {
        if (!val) return "";
        let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
        const parts = raw.split(",");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        return parts.slice(0, 2).join(",");
    };
    const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

    useEffect(() => {
        const loadData = async () => {
            try {
                fetch("/api/forex/rates", { headers: getAuthHeaders() }).then(r => r.json()).then(d => {
                    setLiveRates(d);
                    if(d['USD']) setRate(formatNum(Math.floor(d['USD']).toString()));
                }).catch(() => {});

                const [resTarget, resTx] = await Promise.all([
                    fetch("/api/target", { headers: getAuthHeaders() }), 
                    fetch("/api/transactions", { headers: getAuthHeaders() })
                ]);
                
                if (resTarget.ok && resTx.ok) {
                    const target = await resTarget.json();
                    const txs = await resTx.json();
                    
                    setTargetData(target);

                    const now = new Date();
                    const exp = (Array.isArray(txs) ? txs : []).filter((t: any) => {
                        const d = new Date(t.date);
                        return t.type === 'expense' && 
                               d.getMonth() === now.getMonth() && 
                               d.getFullYear() === now.getFullYear();
                    }).reduce((acc: number, t: any) => acc + t.amount, 0);
                    
                    setCurrentExpense(exp);
                    setIsDataLoaded(true);
                } else {
                    setIsDataLoaded(true); 
                }
            } catch (e) {
                setIsDataLoaded(true); 
            }
        };
        loadData();
    }, []);

    const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

    const processAudioWithAI = async (text: string) => {
        setIsScanning(true);
        setScanStatus("AI sedang menganalisa dikte suara...");
        try {
            const response = await fetch("/api/voice/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ text })
            });
            
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error || "Gagal memproses suara.");
            
            const aiData = resData.data;

            setDetectedType(aiData.type || 'expense');
            setPaymentMode('cash');
            
            const currCode = (aiData.currency || "IDR").toUpperCase();
            if (currCode !== "IDR") {
                setIsForex(true); 
                setCurrency(currCode);
                if (liveRates[currCode]) setRate(formatNum(Math.floor(liveRates[currCode]).toString()));
            } else {
                setIsForex(false); 
                setCurrency("IDR");
            }
            
            setAmount(aiData.totalAmount ? formatNum(aiData.totalAmount.toString()) : "");
            setCategory(aiData.category || "Lainnya");
            setDesc(aiData.description || text);
            
            toast({ title: "Analisa Suara Berhasil! 🎙️", description: "Rincian dan total tagihan telah direkap otomatis." });
            setShowResultForm(true);
        } catch (error: any) {
            toast({ title: "Gagal Menganalisa", description: error.message, variant: "destructive" });
        } finally {
            setIsScanning(false);
        }
    };

    const startListening = () => {
        if (isLocked) { setLocation('/paywall'); return; }

        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) { 
                toast({ title: "Gunakan Browser Chrome", description: "Fitur mikrofon membutuhkan dukungan web Speech API.", variant: "destructive" }); 
                return; 
            }
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'id-ID'; 
            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);
            
            recognitionRef.current.onresult = async (e: any) => {
                const text = e.results[0][0].transcript;
                setTranscript(text);
                stopListening();
                await processAudioWithAI(text);
            };
            
            recognitionRef.current.start();
        } catch (e) { 
            toast({ title: "Izin Mic Diperlukan", description: "Izinkan akses mikrofon di peramban Anda.", variant: "destructive" }); 
        }
    };
    
    const stopListening = () => { if (recognitionRef.current) recognitionRef.current.stop(); };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) { setLocation('/paywall'); return; }

        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsScanning(true);
        setScanStatus("Menyiapkan dokumen struk...");

        try {
            const base64Images: string[] = [];
            const previews: string[] = [];

            for (const file of files) {
                previews.push(URL.createObjectURL(file));
                
                const compressedBase64 = await new Promise<string>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        let width = img.width;
                        let height = img.height;
                        const MAX_WIDTH = 800;
                        const MAX_HEIGHT = 800;

                        if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                        } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL("image/jpeg", 0.5));
                    };
                    img.src = URL.createObjectURL(file);
                });

                base64Images.push(compressedBase64);
            }

            setImagePreviews(previews);
            setScanStatus("AI sedang membaca dan menjumlahkan seluruh struk...");

            const response = await fetch("/api/vision/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ images: base64Images })
            });

            const resData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(resData.error || "Gagal memproses gambar. Pastikan teks struk terlihat jelas.");
            }

            const aiData = resData.data; 

            setDetectedType(aiData.type || 'expense'); 
            setPaymentMode('cash');
            
            const currCode = (aiData.currency || "IDR").toUpperCase();
            if (currCode !== "IDR") {
                setIsForex(true);
                setCurrency(currCode);
                if (liveRates[currCode]) setRate(formatNum(Math.floor(liveRates[currCode]).toString()));
            } else {
                setIsForex(false);
                setCurrency("IDR");
            }

            setAmount(aiData.totalAmount ? formatNum(aiData.totalAmount.toString()) : "");
            setCategory(aiData.category || "Belanja");
            setDesc(aiData.description || `Hasil pindai struk otomatis.`);

            toast({ title: "Scan Struk Sukses! 📸", description: "Data angka dan pos pengeluaran telah diakumulasikan." });
            setShowResultForm(true);

        } catch (error: any) {
            console.error(error);
            toast({ title: "Scan Gagal", description: error.message, variant: "destructive" });
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
    };

    const handleSave = async (isEmergencyOverride = false) => {
        if (isLocked) { setLocation('/paywall'); return; }

        if (!amount) { 
            toast({ title: "Nominal Kosong", description: "Masukkan nominal angka yang valid.", variant: "destructive" }); 
            return; 
        }
        
        const finalAmount = parseNum(amount); 

        if (!isEmergencyOverride && isDataLoaded && detectedType === 'expense' && !isForex && targetData?.monthlyBudget > 0) {
            const remainingBudget = targetData.monthlyBudget - currentExpense;
            if (finalAmount > remainingBudget) {
                const deficit = finalAmount - (remainingBudget > 0 ? remainingBudget : 0);
                const nextMonthPred = targetData.monthlyBudget - deficit;
                setEmergencyDetails({ deficit, nextMonthLimit: nextMonthPred });
                setShowEmergencyModal(true); 
                return; 
            }
        }

        if ((paymentMode === 'pending' || detectedType === 'debt' || detectedType === 'receivable') && !debtName.trim()) {
            toast({ title: "Nama Pihak Wajib Diisi", description: "Sebutkan nama pihak yang berhutang / dihutangi.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);

        const postHeaders = { 
            "Content-Type": "application/json",
            ...getAuthHeaders() 
        };

        try {
            if (isForex && paymentMode === 'cash' && (detectedType === 'income' || detectedType === 'expense')) {
                await fetch("/api/forex/transaction", {
                    method: "POST", headers: postHeaders,
                    body: JSON.stringify({ type: detectedType, currency, amount: finalAmount, description: desc })
                });
                toast({ title: "Transaksi Valas Tersimpan!", description: `${currency} ${finalAmount.toLocaleString('id-ID')}` });
            } 
            else if (paymentMode === 'pending' && (detectedType === 'income' || detectedType === 'expense')) {
                const debtType = detectedType === 'income' ? 'piutang' : 'hutang';
                
                await fetch("/api/debts", {
                    method: "POST", headers: postHeaders,
                    body: JSON.stringify({ 
                        type: debtType, 
                        name: `${debtName}|${isForex ? currency : 'IDR'}`, 
                        amount: finalAmount, 
                        description: `[${debtType === 'piutang' ? 'Piutang Pemasukan' : 'Hutang Pengeluaran'}: ${category || 'Lainnya'}] ${desc}`,
                        isPaid: false
                    })
                });

                await fetch("/api/transactions", {
                    method: "POST", headers: postHeaders,
                    body: JSON.stringify({ 
                        type: detectedType, 
                        amount: finalAmount, 
                        category: `${debtType === 'piutang' ? 'Piutang' : 'Hutang'}: ${category || 'Lainnya'}`, 
                        description: `Belum Dibayar - ${debtName}`, 
                        date: new Date() 
                    })
                });
                toast({ title: "Tersimpan!", description: `Dicatat sebagai ${debtType.toUpperCase()}.` });
            }
            else if (detectedType === 'debt' || detectedType === 'receivable') {
                await fetch("/api/debts", {
                    method: "POST", headers: postHeaders,
                    body: JSON.stringify({ type: detectedType === 'debt' ? 'hutang' : 'piutang', name: `${debtName}|${isForex ? currency : 'IDR'}`, amount: finalAmount, description: desc, isPaid: false })
                });
                toast({ title: "Tercatat!", description: "Daftar hutang/piutang telah diperbarui." });
            } 
            else {
                await fetch("/api/transactions", {
                    method: "POST", headers: postHeaders,
                    body: JSON.stringify({ type: detectedType, amount: finalAmount, category: category || "Lainnya", description: desc, date: new Date() })
                });
                toast({ title: "Berhasil Disimpan! ✨", description: "Transaksi masuk ke buku kas." });
            }

            if (isEmergencyOverride) {
                try {
                    await fetch("/api/target/penalty", {
                        method: "PATCH",
                        headers: postHeaders,
                        body: JSON.stringify({ amount: emergencyDetails.deficit })
                    });
                } catch (err) {}
            }

            trackEvent("smart_scan_used", { 
                type: detectedType, 
                isForex: isForex,
                paymentMode: paymentMode 
            });

            queryClient.invalidateQueries();
            setShowEmergencyModal(false);
            setLocation("/");
            
        } catch (e) { 
            toast({ title: "Gagal Menyimpan", description: "Cek koneksi server Anda.", variant: "destructive" }); 
        } finally {
            setIsSubmitting(false);
        }
    };

    const remainingBudget = targetData ? targetData.monthlyBudget - currentExpense : 0;

    if (!isDataLoaded) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
                <img src="/BILANO-ICON-NEW.png" alt="Loading" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
                <div className="flex items-center gap-2 text-brand-navy font-black text-sm bg-amber-50 border border-amber-200 px-5 py-2.5 rounded-full shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-brand-gold"/>
                    <span>Menyiapkan Mesin Scanner AI...</span>
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
                <div className="px-5 pt-5 pb-7 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b-2 border-amber-400">
                    
                    {/* Top Navigation Bar */}
                    <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(29,62,114,0.08)] flex items-center justify-between relative z-30 border-b border-amber-100">
                        <div className="flex items-center gap-3">
                            <Link href="/">
                                <button 
                                    type="button"
                                    className="w-10 h-10 rounded-full bg-brand-navy hover:bg-[#152e55] text-brand-gold shadow-[2px_2px_0px_0px] shadow-slate-900 active:shadow-[0px_0px_0px_0px] active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                                    title="Kembali ke Beranda"
                                >
                                    <ArrowLeft className="w-5 h-5 text-brand-gold" strokeWidth={2.5} />
                                </button>
                            </Link>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">
                                        Vision & Voice Engine
                                    </p>
                                </div>
                                <h1 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                    Smart Scan & Suara
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="bg-brand-navy text-brand-gold text-[10px] font-black px-3 py-1.5 rounded-full shadow-[2px_2px_0px_0px] shadow-slate-900 border border-brand-gold/30">
                                AI 2.0
                            </span>
                        </div>
                    </div>

                    {/* FLAGSHIP HERO CARD: SMART SCAN INFO */}
                    <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                        <ScanLine className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 fill-current" /> AUTO REKAPITULASI
                                </span>
                                <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                                    Multi-Receipt & Voice
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2 leading-tight">
                                Pemindaian Struk & Dikte AI
                            </h2>
                            <p className="text-xs text-blue-100 font-medium leading-relaxed">
                                Foto tumpukan struk belanja atau sebutkan transaksi secara lisan. AI akan membaca rincian barang dan menjumlahkan totalnya secara otomatis.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. BODY CONTENT SECTION */}
                {/* ========================================================================= */}
                <div className="px-5 pt-4 pb-24 bg-slate-50 flex flex-col gap-4">
                    
                    {/* MODAL EMERGENCY DEFISIT BUDGET */}
                    {showEmergencyModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-[8px_8px_0px_0px] shadow-slate-900 border-2 border-slate-900 relative animate-in zoom-in-95 space-y-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowEmergencyModal(false)} 
                                    className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border-2 border-rose-300 shadow-xs">
                                        <AlertTriangle className="w-7 h-7"/>
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900">Batas Anggaran Terlewati!</h3>
                                    <p className="text-xs text-slate-500 font-bold">
                                        Sisa limit budget saat ini: <strong className="text-slate-900">{formatRp(remainingBudget < 0 ? 0 : remainingBudget)}</strong>
                                    </p>
                                </div>

                                <div className="bg-rose-50 border-2 border-rose-200 p-4 rounded-2xl text-left space-y-2 text-xs">
                                    <div className="flex justify-between font-black">
                                        <span className="text-slate-600">Defisit Kelebihan:</span>
                                        <span className="text-rose-700">{formatRp(emergencyDetails.deficit)}</span>
                                    </div>
                                    <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                                        Jika dilanjutkan, sistem akan mengaktifkan <strong>Dana Cadangan</strong> dan memotong batas budget bulan depan.
                                    </p>
                                    <div className="flex justify-between font-black bg-white p-2.5 rounded-xl border border-rose-200 mt-1">
                                        <span className="text-slate-600">Limit Bulan Depan:</span>
                                        <span className="text-brand-navy">{formatRp(emergencyDetails.nextMonthLimit)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2.5 pt-1">
                                    <button 
                                        type="button"
                                        onClick={() => setShowEmergencyModal(false)} 
                                        className="flex-1 h-12 bg-slate-100 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all cursor-pointer"
                                    >
                                        BATALKAN
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleSave(true)} 
                                        disabled={isSubmitting}
                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-[2px_2px_0px_0px] shadow-slate-900 active:scale-95 transition-all cursor-pointer"
                                    >
                                        {isSubmitting ? "MEMPROSES..." : "PAKAI DARURAT"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <input type="file" multiple ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange}/>

                    {/* METHOD SELECTION CARDS (JIKA HASIL FORM BELUM MUNCUL) */}
                    {!showResultForm && (
                        <div className="space-y-4 animate-in fade-in">
                            
                            {/* CARD 1: DIKTE SUARA MULTI-TRANSAKSI */}
                            <div className="bg-white rounded-[28px] p-6 border-2 border-amber-200/90 shadow-[6px_6px_0px_0px] shadow-slate-900 text-center space-y-4">
                                <div>
                                    <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        METODE 1
                                    </span>
                                    <h3 className="text-base font-black text-brand-navy mt-1.5">Dikte Suara Percakapan</h3>
                                    <p className="text-xs text-slate-500 font-bold px-2 mt-0.5">
                                        "Tadi pagi beli bensin 30 ribu, terus makan siang sama teman 45 ribu, beli kopi 20 ribu."
                                    </p>
                                </div>

                                <div className="relative flex items-center justify-center py-2">
                                    {isListening && (
                                        <span className="absolute w-24 h-24 rounded-full bg-rose-400 opacity-30 animate-ping"></span>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={isListening ? stopListening : startListening} 
                                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px] shadow-slate-900 border-2 border-slate-900 transition-all active:translate-x-[2px] active:translate-y-[2px] cursor-pointer ${
                                            isListening 
                                                ? 'bg-rose-500 text-white scale-105' 
                                                : 'bg-brand-gold hover:bg-[#e5a825] text-brand-navy'
                                        }`}
                                    >
                                        {isListening ? (
                                            <div className="w-6 h-6 bg-white rounded-md animate-pulse" />
                                        ) : (
                                            <Mic className="w-8 h-8 text-brand-navy stroke-[2.5]" />
                                        )}
                                    </button>
                                </div>

                                <div className="min-h-7 flex items-center justify-center">
                                    {isListening ? (
                                        <span className="text-xs font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 animate-pulse">
                                            Mendengarkan suara Anda... (Bicara santai)
                                        </span>
                                    ) : transcript ? (
                                        <p className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-2xl max-w-xs truncate border border-slate-200">
                                            "{transcript}"
                                        </p>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 font-bold">
                                            Tekan tombol mikrofon untuk mulai berbicara
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* SEPARATOR */}
                            <div className="flex items-center gap-3 px-6">
                                <div className="h-0.5 bg-slate-200 flex-1"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ATAU</span>
                                <div className="h-0.5 bg-slate-200 flex-1"></div>
                            </div>

                            {/* CARD 2: SCAN BANYAK STRUK / FOTO KAMERA */}
                            <div 
                                onClick={() => fileInputRef.current?.click()} 
                                className="bg-white rounded-[28px] p-6 border-2 border-dashed border-amber-300 hover:border-amber-500 shadow-[5px_5px_0px_0px] shadow-slate-900 flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:translate-x-[2px] active:translate-y-[2px] transition-all group"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-brand-navy flex items-center justify-center border-2 border-amber-200 shadow-xs group-hover:scale-105 transition-transform">
                                    <ImagePlus className="w-8 h-8 text-brand-navy stroke-[2.5]" />
                                </div>
                                <div>
                                    <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        METODE 2
                                    </span>
                                    <h4 className="font-black text-brand-navy text-base mt-1">Scan Struk Kamera / Galeri</h4>
                                    <p className="text-xs text-slate-500 font-bold max-w-xs mt-0.5">
                                        Pilih satu atau beberapa foto struk sekaligus. AI akan memindai barang & menghitung totalnya.
                                    </p>
                                </div>
                            </div>

                            {/* SCANNING OVERLAY PROGRESS */}
                            {isScanning && (
                                <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in">
                                    <img src="/BILANO-ICON-NEW.png" alt="Scanning" className="w-20 h-20 mb-4 animate-bounce object-contain drop-shadow-xl" />
                                    <Loader2 className="w-8 h-8 text-brand-gold animate-spin mb-3"/>
                                    <h3 className="font-black text-xl text-white mb-1">{scanStatus}</h3>
                                    <p className="text-xs text-slate-300 font-medium max-w-xs mb-5">
                                        AI sedang mengekstrak nama toko, pos kategori, dan total nominal tagihan...
                                    </p>
                                    
                                    {imagePreviews.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                                            {imagePreviews.map((src, i) => (
                                                <img key={i} src={src} className="w-16 h-16 object-cover rounded-xl border-2 border-brand-gold/60 shrink-0 opacity-70 animate-pulse" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* FORM HASIL REKAPITULASI AI */}
                    {showResultForm && (
                        <div className="bg-white rounded-[28px] p-5 border-2 border-amber-200/90 shadow-[6px_6px_0px_0px] shadow-slate-900 space-y-4 animate-in slide-in-from-bottom-6">
                            
                            <div className="flex justify-between items-start border-b-2 border-slate-100 pb-3">
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <Sparkles className="w-4 h-4 text-amber-500 fill-current" />
                                        <h3 className="font-black text-brand-navy text-sm uppercase tracking-wider">
                                            Hasil Rekapitulasi AI
                                        </h3>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                        Periksa kembali data sebelum dicatat ke buku kas.
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => { setShowResultForm(false); setImagePreviews([]); setTranscript(""); }} 
                                    className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>

                            {/* TIPE TRANSAKSI PILLS */}
                            <div className="grid grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                                {[
                                    { id: 'expense', label: 'Pengeluaran' },
                                    { id: 'income', label: 'Pemasukan' },
                                    { id: 'debt', label: 'Hutang' },
                                    { id: 'receivable', label: 'Piutang' }
                                ].map((tab) => (
                                    <button 
                                        key={tab.id} 
                                        type="button"
                                        onClick={() => { setDetectedType(tab.id as any); setPaymentMode('cash'); }} 
                                        className={`py-2 text-[10px] rounded-xl font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            detectedType === tab.id 
                                                ? 'bg-brand-navy text-brand-gold shadow-sm' 
                                                : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* MODE PEMBAYARAN: TUNAI VS BELUM BAYAR/CAIR */}
                            {(detectedType === 'income' || detectedType === 'expense') && (
                                <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMode('cash')} 
                                        className={`flex-1 py-2 flex justify-center items-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            paymentMode === 'cash' 
                                                ? (detectedType === 'income' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-rose-600 text-white shadow-xs') 
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <Wallet className="w-3.5 h-3.5"/> TUNAI (LUNAS)
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMode('pending')} 
                                        className={`flex-1 py-2 flex justify-center items-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                            paymentMode === 'pending' 
                                                ? 'bg-amber-500 text-slate-950 shadow-xs' 
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <HandCoins className="w-3.5 h-3.5"/> {detectedType === 'income' ? 'PIUTANG (BELUM CAIR)' : 'HUTANG (BELUM BAYAR)'}
                                    </button>
                                </div>
                            )}

                            {/* VALAS TOGGLE */}
                            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-2xl border border-amber-200">
                                <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-amber-700"/>
                                    <span className="text-xs font-black text-brand-navy">Mata Uang Asing (Valas)</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    checked={isForex} 
                                    onChange={e => setIsForex(e.target.checked)} 
                                    className="w-5 h-5 accent-brand-navy rounded cursor-pointer"
                                />
                            </div>

                            {/* VALAS CURRENCY & RATE INPUTS */}
                            {isForex && (
                                <div className="grid grid-cols-2 gap-2.5 p-3 bg-sky-50 rounded-2xl border border-sky-200 animate-in fade-in">
                                    <div>
                                        <label className="text-[10px] font-black text-sky-900 uppercase tracking-wider block mb-1">Mata Uang</label>
                                        <select 
                                            value={currency} 
                                            onChange={e => setCurrency(e.target.value)} 
                                            className="w-full text-xs font-black bg-white rounded-xl border border-sky-300 p-2.5 h-11"
                                        >
                                            {Object.keys(liveRates).length > 0 ? Object.keys(liveRates).map(c => <option key={c} value={c}>{c}</option>) : <option>USD</option>}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-sky-900 uppercase tracking-wider block mb-1">Kurs Saat Ini</label>
                                        <input 
                                            type="text" 
                                            inputMode="decimal" 
                                            value={rate} 
                                            onChange={e => setRate(formatNum(e.target.value))} 
                                            className="w-full text-xs font-black bg-white rounded-xl border border-sky-300 p-2.5 h-11"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* TOTAL NOMINAL INPUT */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Total Nominal Keseluruhan {isForex ? currency : '(IDR)'}
                                </label>
                                <input 
                                    type="text" 
                                    inputMode="decimal" 
                                    value={amount} 
                                    onChange={e => setAmount(formatNum(e.target.value))} 
                                    placeholder="0" 
                                    className="w-full h-14 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-black text-xl text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all tabular-nums"
                                />
                            </div>

                            {/* NAMA PIHAK JIKA HUTANG / PIUTANG */}
                            {(detectedType === 'debt' || detectedType === 'receivable' || paymentMode === 'pending') && (
                                <div className="space-y-1.5 animate-in fade-in">
                                    <label className="text-[10px] font-black text-amber-800 uppercase tracking-widest ml-1">
                                        {paymentMode === 'pending' ? (detectedType === 'income' ? 'Ditagihkan Kepada Siapa?' : 'Berhutang Kepada Siapa?') : 'Nama Pihak'}
                                    </label>
                                    <input 
                                        type="text"
                                        value={debtName} 
                                        onChange={e => setDebtName(e.target.value)} 
                                        placeholder="Contoh: Klien A / Toko Sumber Makmur" 
                                        className="w-full h-12 px-4 bg-amber-50 border-2 border-amber-300 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                                    />
                                </div>
                            )}
                            
                            {/* KATEGORI */}
                            {(detectedType === 'income' || detectedType === 'expense') && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                        Kategori / Pos Anggaran
                                    </label>
                                    <input 
                                        type="text"
                                        value={category} 
                                        onChange={e => setCategory(e.target.value)} 
                                        className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-200 rounded-2xl font-bold text-xs text-slate-900 outline-none focus:border-amber-500 focus:bg-white transition-all"
                                    />
                                </div>
                            )}
                            
                            {/* RINCIAN PER ITEM / CATATAN */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    Rincian Lengkap per Item
                                </label>
                                <textarea 
                                    value={desc} 
                                    onChange={e => setDesc(e.target.value)} 
                                    rows={4}
                                    className="w-full border-2 border-slate-200 rounded-2xl p-3.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white outline-none focus:border-amber-500 transition-all resize-none"
                                />
                            </div>

                            {/* TOMBOL SIMPAN TRANSAKSI */}
                            <button 
                                type="button"
                                onClick={() => handleSave(false)} 
                                disabled={!isDataLoaded || isSubmitting}
                                className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin"/>
                                        <span>MEMPROSES PENYIMPANAN...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 stroke-[2.5]"/>
                                        <span>SIMPAN TRANSAKSI KE BUKU KAS</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </MobileLayout>
    );
}