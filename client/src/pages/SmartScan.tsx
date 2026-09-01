import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { 
    Mic, ImagePlus, Check, X, Globe, AlertTriangle, RefreshCw, 
    Loader2, HandCoins, Wallet, AlertCircle, ArrowLeft, 
    Camera, ScanLine, CheckCircle2, ChevronRight, Info, ShieldAlert,
    HelpCircle, Banknote, Plus, Trash2, ArrowUpRight, ArrowDownLeft,
    Layers, Sparkles
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser, getAccessTier } from "@/hooks/use-finance";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/tracking";

interface ScannedItem {
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    currency: string;
    source?: string;
}

export default function SmartScan() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();
    const { data: user } = useUser();
    
    // Voice State
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    
    // Scan Status
    const [isScanning, setIsScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState("Menyiapkan Sistem AI...");
    
    // Images State
    const [imagePreviews, setImagePreviews] = useState<{ id: string; url: string; base64: string }[]>([]);
    
    // Confirmation Dashboard State
    const [showResultForm, setShowResultForm] = useState(false);
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [selectedGlobalSource, setSelectedGlobalSource] = useState<string>("");
    
    // Rates & Budget Data
    const [liveRates, setLiveRates] = useState<Record<string, number>>({});
    const [targetData, setTargetData] = useState<any>(null);
    const [currentExpense, setCurrentExpense] = useState(0);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [emergencyDetails, setEmergencyDetails] = useState({ deficit: 0, nextMonthLimit: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
    const accessTier = getAccessTier(user);
    const isPro = accessTier !== "free";

    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isLocked = accessTier === "free"; 
    
    const getAuthHeaders = () => ({ "x-user-email": currentUserEmail });

    const formatNum = (val: string | number) => {
        if (val === undefined || val === null || val === "") return "";
        let raw = val.toString().replace(/\./g, "").replace(/[^0-9]/g, "");
        if (raw.length > 1) {
            raw = raw.replace(/^0+/, '');
        }
        return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };
    const parseNum = (val: string | number) => {
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(/\./g, "").replace(/,/g, ".")) || 0;
    };
    const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

    useEffect(() => {
        const loadData = async () => {
            try {
                fetch("/api/forex/rates", { headers: getAuthHeaders() }).then(r => r.json()).then(d => {
                    setLiveRates(d);
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

    // Set default wallet source if available
    useEffect(() => {
        if (user?.walletSources && (user.walletSources as any[]).length > 0 && !selectedGlobalSource) {
            setSelectedGlobalSource((user.walletSources as any[])[0].name);
        }
    }, [user, selectedGlobalSource]);

    // Available wallet sources
    const availableSources = user?.walletSources && Array.isArray(user.walletSources) && (user.walletSources as any[]).length > 0
        ? (user.walletSources as any[]).map((w: any) => w.name)
        : ["Cash (Uang Kertas)", "BCA", "Mandiri", "GoPay", "OVO"];

    // Totals calculations
    const totalIncome = scannedItems.filter(i => i.type === 'income').reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpense = scannedItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + (i.amount || 0), 0);
    const netTotal = totalIncome - totalExpense;

    // VOICE PROCESSING
    const processAudioWithAI = async (text: string) => {
        setIsScanning(true);
        setScanStatus("AI sedang menganalisis rekaman suara & membedah transaksi...");
        try {
            const response = await fetch("/api/voice/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ text })
            });
            
            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error || "Gagal memproses suara.");
            
            const aiData = resData.data;
            const items: ScannedItem[] = (aiData.items || []).map((it: any, idx: number) => ({
                id: it.id || `${Date.now()}_${idx}`,
                title: it.title || (it.type === 'income' ? "Pemasukan Suara" : "Pengeluaran Suara"),
                amount: Math.round(it.amount || 0),
                type: it.type === 'income' ? 'income' : 'expense',
                category: it.category || (it.type === 'income' ? "Pemasukan Lain" : "Belanja"),
                currency: it.currency || "IDR",
                source: selectedGlobalSource || availableSources[0]
            }));

            if (items.length === 0) {
                items.push({
                    id: Date.now().toString(),
                    title: aiData.category || "Catatan Suara",
                    amount: Math.round(aiData.totalAmount || 0),
                    type: aiData.type === 'income' ? 'income' : 'expense',
                    category: aiData.category || "Lainnya",
                    currency: aiData.currency || "IDR",
                    source: selectedGlobalSource || availableSources[0]
                });
            }

            setScannedItems(items);
            toast({ 
                title: "Dikte Suara Berhasil Dideteksi! 🎙️", 
                description: `Ditemukan ${items.length} transaksi (${formatRp(totalIncome)} Masuk / ${formatRp(totalExpense)} Keluar).` 
            });
            setShowResultForm(true);
        } catch (error: any) {
            toast({ title: "Gagal Menganalisa Suara", description: error.message, variant: "destructive" });
        } finally {
            setIsScanning(false);
        }
    };

    const startListening = () => {
        if (isLocked) { setLocation('/paywall'); return; }

        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) { 
                toast({ title: "Gunakan Browser Chrome / Safari", description: "Fitur mikrofon membutuhkan dukungan web Speech API.", variant: "destructive" }); 
                return; 
            }
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'id-ID'; 
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;

            recognitionRef.current.onstart = () => setIsListening(true);
            recognitionRef.current.onend = () => setIsListening(false);
            
            recognitionRef.current.onresult = async (e: any) => {
                const text = e.results[0][0].transcript;
                setTranscript(text);
                stopListening();
                await processAudioWithAI(text);
            };
            
            recognitionRef.current.onerror = (e: any) => {
                setIsListening(false);
                toast({ title: "Gagal Menangkap Suara", description: "Coba berbicara lebih jelas dan dekat ke mic.", variant: "destructive" });
            };

            recognitionRef.current.start();
        } catch (e) { 
            toast({ title: "Izin Mic Diperlukan", description: "Izinkan akses mikrofon di peramban Anda.", variant: "destructive" }); 
        }
    };
    
    const stopListening = () => { if (recognitionRef.current) recognitionRef.current.stop(); };

    // MULTI-PHOTO PROCESSING
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isLocked) { setLocation('/paywall'); return; }

        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsScanning(true);
        setScanStatus(`Menyiapkan ${files.length} foto struk...`);

        try {
            const newPreviews: { id: string; url: string; base64: string }[] = [];

            for (const file of files) {
                const blobUrl = URL.createObjectURL(file);
                
                const compressedBase64 = await new Promise<string>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        let width = img.width;
                        let height = img.height;
                        const MAX_WIDTH = 900;
                        const MAX_HEIGHT = 900;

                        if (width > height) {
                            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                        } else {
                            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                        }
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL("image/jpeg", 0.6));
                    };
                    img.src = blobUrl;
                });

                newPreviews.push({
                    id: `${Date.now()}_${Math.random()}`,
                    url: blobUrl,
                    base64: compressedBase64
                });
            }

            const allPreviews = [...imagePreviews, ...newPreviews];
            setImagePreviews(allPreviews);
            
            // Start scanning immediately with all selected photos
            await executeImageScan(allPreviews.map(p => p.base64));

        } catch (error: any) {
            console.error(error);
            toast({ title: "Scan Gagal", description: error.message, variant: "destructive" });
            setIsScanning(false);
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ""; 
        }
    };

    const executeImageScan = async (base64Array: string[]) => {
        setIsScanning(true);
        setScanStatus(`AI sedang membaca & merekap ${base64Array.length} struk/dokumen...`);
        try {
            const response = await fetch("/api/vision/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ images: base64Array })
            });

            const resData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(resData.error || "Gagal memproses gambar. Pastikan teks struk terlihat jelas.");
            }

            const aiData = resData.data; 
            const items: ScannedItem[] = (aiData.items || []).map((it: any, idx: number) => ({
                id: it.id || `${Date.now()}_${idx}`,
                title: it.title || (it.type === 'income' ? "Bukti Masuk" : `Struk Belanja ${idx + 1}`),
                amount: Math.round(it.amount || 0),
                type: it.type === 'income' ? 'income' : 'expense',
                category: it.category || (it.type === 'income' ? "Pemasukan Lain" : "Belanja"),
                currency: it.currency || "IDR",
                source: selectedGlobalSource || availableSources[0]
            }));

            if (items.length === 0) {
                items.push({
                    id: Date.now().toString(),
                    title: aiData.category || "Pindai Struk",
                    amount: Math.round(aiData.totalAmount || 0),
                    type: aiData.type === 'income' ? 'income' : 'expense',
                    category: aiData.category || "Belanja",
                    currency: aiData.currency || "IDR",
                    source: selectedGlobalSource || availableSources[0]
                });
            }

            setScannedItems(items);
            toast({ 
                title: "Scan Struk Berhasil! 📸", 
                description: `Ditemukan ${items.length} transaksi (${formatRp(items.filter(i=>i.type==='income').reduce((s,i)=>s+i.amount,0))} Masuk / ${formatRp(items.filter(i=>i.type==='expense').reduce((s,i)=>s+i.amount,0))} Keluar).` 
            });
            setShowResultForm(true);
        } catch (error: any) {
            toast({ title: "Gagal Pindai Foto", description: error.message, variant: "destructive" });
        } finally {
            setIsScanning(false);
        }
    };

    // ITEM MANIPULATION IN CONFIRMATION DASHBOARD
    const updateItem = (id: string, field: keyof ScannedItem, val: any) => {
        setScannedItems(scannedItems.map(item => {
            if (item.id === id) {
                return { ...item, [field]: val };
            }
            return item;
        }));
    };

    const toggleItemType = (id: string) => {
        setScannedItems(scannedItems.map(item => {
            if (item.id === id) {
                const nextType = item.type === 'income' ? 'expense' : 'income';
                return { ...item, type: nextType };
            }
            return item;
        }));
    };

    const removeItem = (id: string) => {
        setScannedItems(scannedItems.filter(item => item.id !== id));
    };

    const addNewItem = () => {
        const newItem: ScannedItem = {
            id: Date.now().toString(),
            title: "Pos Baru",
            amount: 0,
            type: 'expense',
            category: "Lainnya",
            currency: "IDR",
            source: selectedGlobalSource || availableSources[0]
        };
        setScannedItems([...scannedItems, newItem]);
    };

    const applyGlobalSource = (sourceName: string) => {
        setSelectedGlobalSource(sourceName);
        setScannedItems(scannedItems.map(item => ({ ...item, source: sourceName })));
    };

    // SAVE ALL TRANSACTIONS
    const handleConfirmAndSaveAll = async (isEmergencyOverride = false) => {
        if (isLocked) { setLocation('/paywall'); return; }

        if (scannedItems.length === 0) {
            toast({ title: "Daftar Kosong", description: "Tidak ada transaksi untuk disimpan.", variant: "destructive" });
            return;
        }

        const validItems = scannedItems.filter(i => (i.amount || 0) > 0);
        if (validItems.length === 0) {
            toast({ title: "Nominal Masih 0", description: "Pastikan nominal transaksi telah terisi.", variant: "destructive" });
            return;
        }

        // Check Budget Deficit Warning for total expenses
        const totalExp = validItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0);
        if (!isEmergencyOverride && isDataLoaded && totalExp > 0 && targetData?.monthlyBudget > 0) {
            const remainingBudget = targetData.monthlyBudget - currentExpense;
            if (totalExp > remainingBudget) {
                const deficit = totalExp - (remainingBudget > 0 ? remainingBudget : 0);
                const nextMonthPred = targetData.monthlyBudget - deficit;
                setEmergencyDetails({ deficit, nextMonthLimit: nextMonthPred });
                setShowEmergencyModal(true); 
                return; 
            }
        }

        setIsSubmitting(true);
        try {
            const payloadTransactions = validItems.map(item => ({
                type: item.type,
                amount: Math.round(item.amount),
                category: item.category || (item.type === 'income' ? 'Pemasukan Lain' : 'Pengeluaran Lain'),
                description: item.title || (item.type === 'income' ? 'Pemasukan AI Scan' : 'Pengeluaran AI Scan'),
                date: new Date(),
                source: item.source || selectedGlobalSource || availableSources[0]
            }));

            const res = await fetch("/api/transactions/batch", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                body: JSON.stringify({ transactions: payloadTransactions })
            });

            if (!res.ok) {
                // Fallback: post one by one if batch route fails
                for (const tx of payloadTransactions) {
                    await fetch("/api/transactions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                        body: JSON.stringify(tx)
                    });
                }
            }

            if (isEmergencyOverride && emergencyDetails.deficit > 0) {
                try {
                    await fetch("/api/target/penalty", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
                        body: JSON.stringify({ amount: emergencyDetails.deficit })
                    });
                } catch (err) {}
            }

            trackEvent("smart_scan_batch_saved", { 
                itemCount: validItems.length,
                totalIncome,
                totalExpense
            });

            await queryClient.invalidateQueries();
            toast({ 
                title: "Semua Transaksi Tercatat! 🎉", 
                description: `${validItems.length} transaksi (${formatRp(totalIncome)} Masuk & ${formatRp(totalExpense)} Keluar) sukses disimpan ke kas.` 
            });

            setShowEmergencyModal(false);
            setShowResultForm(false);
            setScannedItems([]);
            setImagePreviews([]);
            setTranscript("");
            
            setTimeout(() => {
                setLocation("/");
            }, 600);

        } catch (e: any) {
            toast({ title: "Gagal Menyimpan", description: e.message || "Periksa koneksi Anda.", variant: "destructive" });
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
                                        Vision & Voice Engine
                                    </p>
                                </div>
                                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                                    Smart Scan & Suara
                                </h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="bg-brand-navy text-brand-gold text-[10px] font-extrabold px-3 py-1.5 rounded-full border border-brand-gold/30 shadow-xs">
                                AI 2.0
                            </span>
                        </div>
                    </div>

                    {/* FLAGSHIP HERO CARD */}
                    <div className="bg-gradient-to-br from-[#1D3E72] via-[#16386D] to-[#0A162B] text-white p-6 rounded-[28px] border-l-[6px] border-l-brand-gold shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                        <ScanLine className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-gold/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                        <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/15 rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 fill-current" /> AUTO DETEKSI MULTI-ARUS
                                </span>
                                <span className="text-[10px] text-amber-200 font-bold bg-black/40 px-2.5 py-0.5 rounded-full border border-white/20">
                                    Pemasukan & Pengeluaran
                                </span>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-1.5 leading-tight">
                                Dikte Suara & Multi-Foto Struk
                            </h2>
                            <p className="text-xs text-blue-100 font-medium leading-relaxed">
                                Sebutkan banyak catatan masuk & keluar sekaligus atau upload tumpukan struk. AI memisahkan pos dan totalnya secara otomatis.
                            </p>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* 2. BODY CONTENT SECTION */}
                {/* ========================================================================= */}
                <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
                    
                    {/* MODAL EMERGENCY DEFISIT BUDGET */}
                    {showEmergencyModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                            <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 space-y-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowEmergencyModal(false)} 
                                    className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                                
                                <div className="text-center space-y-2">
                                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
                                        <AlertTriangle className="w-7 h-7"/>
                                    </div>
                                    <h3 className="text-lg font-extrabold text-slate-900">Batas Anggaran Terlewati!</h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Sisa limit budget saat ini: <strong className="text-slate-900">{formatRp(remainingBudget < 0 ? 0 : remainingBudget)}</strong>
                                    </p>
                                </div>

                                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-left space-y-2 text-xs">
                                    <div className="flex justify-between font-bold">
                                        <span className="text-slate-600">Defisit Pengeluaran:</span>
                                        <span className="text-rose-700">{formatRp(emergencyDetails.deficit)}</span>
                                    </div>
                                    <p className="text-[11px] text-rose-800 font-medium leading-relaxed">
                                        Jika dilanjutkan, sistem akan mengaktifkan <strong>Dana Cadangan</strong> dan memotong batas budget bulan depan.
                                    </p>
                                    <div className="flex justify-between font-bold bg-white p-2.5 rounded-xl border border-rose-200 mt-1">
                                        <span className="text-slate-600">Limit Bulan Depan:</span>
                                        <span className="text-brand-navy">{formatRp(emergencyDetails.nextMonthLimit)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2.5 pt-1">
                                    <button 
                                        type="button"
                                        onClick={() => setShowEmergencyModal(false)} 
                                        className="flex-1 h-12 bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl active:scale-95 transition-all cursor-pointer"
                                    >
                                        BATALKAN
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => handleConfirmAndSaveAll(true)} 
                                        disabled={isSubmitting}
                                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                                    >
                                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : "PAKAI DARURAT"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <input type="file" multiple ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange}/>

                    {/* METHOD SELECTION CARDS (WHEN NOT IN CONFIRMATION DASHBOARD) */}
                    {!showResultForm && (
                        <div className="space-y-4 animate-in fade-in">
                            
                            {/* CARD 1: DIKTE SUARA MULTI-ARUS */}
                            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs text-center space-y-4">
                                <div>
                                    <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        METODE 1 • SUARA BEBAS
                                    </span>
                                    <h3 className="text-base font-extrabold text-slate-900 mt-1.5">Dikte Suara Masuk & Keluar</h3>
                                    <p className="text-xs text-slate-500 font-medium px-2 mt-0.5">
                                        Sebutkan banyak transaksi sekaligus, contoh: <br/>
                                        <i className="text-slate-600 font-bold">"Dapat transferan gaji 5 juta, terus beli bensin 100 ribu sama makan 50 ribu"</i>
                                    </p>
                                </div>

                                <div className="relative flex items-center justify-center py-2">
                                    {isListening && (
                                        <span className="absolute w-24 h-24 rounded-full bg-rose-400 opacity-30 animate-ping"></span>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={isListening ? stopListening : startListening} 
                                        className={`w-20 h-20 rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer ${
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
                                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 animate-pulse flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                                            Mendengarkan suara Anda... (Bicara santai)
                                        </span>
                                    ) : transcript ? (
                                        <p className="text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-2xl max-w-xs truncate border border-slate-200">
                                            "{transcript}"
                                        </p>
                                    ) : (
                                        <span className="text-[11px] text-slate-400 font-medium">
                                            Tekan tombol mikrofon untuk mulai berbicara
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* SEPARATOR */}
                            <div className="flex items-center gap-3 px-6">
                                <div className="h-px bg-slate-200 flex-1"></div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ATAU</span>
                                <div className="h-px bg-slate-200 flex-1"></div>
                            </div>

                            {/* CARD 2: SCAN BANYAK STRUK / FOTO KAMERA */}
                            <div 
                                onClick={() => fileInputRef.current?.click()} 
                                className="bg-white rounded-3xl p-6 border border-dashed border-amber-300 hover:border-amber-400 shadow-xs flex flex-col items-center justify-center gap-3 text-center cursor-pointer active:scale-[0.99] transition-all group"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-brand-navy flex items-center justify-center border border-amber-200 shadow-xs group-hover:scale-105 transition-transform">
                                    <ImagePlus className="w-8 h-8 text-brand-navy stroke-[2.5]" />
                                </div>
                                <div>
                                    <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                        METODE 2 • MULTI-FOTO
                                    </span>
                                    <h4 className="font-extrabold text-slate-900 text-base mt-1">Scan Banyak Foto / Struk Sekaligus</h4>
                                    <p className="text-xs text-slate-500 font-medium max-w-xs mt-0.5">
                                        Pilih 1 atau beberapa struk/dokumen sekaligus. AI akan membedah rincian pos dan menjumlahkan totalnya.
                                    </p>
                                </div>
                            </div>

                            {/* SCANNING OVERLAY PROGRESS */}
                            {isScanning && (
                                <div className="fixed inset-0 z-[120] bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in">
                                    <img src="/BILANO-ICON-NEW.png" alt="Scanning" className="w-20 h-20 mb-4 animate-bounce object-contain drop-shadow-xl" />
                                    <Loader2 className="w-8 h-8 text-brand-gold animate-spin mb-3"/>
                                    <h3 className="font-extrabold text-xl text-white mb-1">{scanStatus}</h3>
                                    <p className="text-xs text-slate-300 font-medium max-w-xs mb-5">
                                        AI sedang mengekstrak nama pos, nominal, dan jenis pemasukan/pengeluaran...
                                    </p>
                                    
                                    {imagePreviews.length > 0 && (
                                        <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                                            {imagePreviews.map((p, i) => (
                                                <img key={p.id} src={p.url} className="w-16 h-16 object-cover rounded-xl border-2 border-brand-gold/60 shrink-0 opacity-70 animate-pulse" />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* DIRECT INLINE CONFIRMATION DASHBOARD (DI HALAMAN INI LANGSUNG) */}
                    {/* ========================================================================= */}
                    {showResultForm && (
                        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-sm space-y-5 animate-in slide-in-from-bottom-6 duration-300">
                            
                            {/* Header Panel */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <h3 className="font-black text-slate-900 text-base uppercase tracking-wider">
                                            Konfirmasi Rekapitulasi AI
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        Periksa dan sesuaikan transaksi sebelum disimpan ke buku kas.
                                    </p>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => { setShowResultForm(false); setImagePreviews([]); setTranscript(""); setScannedItems([]); }} 
                                    className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                                    title="Tutup & Pindai Ulang"
                                >
                                    <X className="w-4 h-4"/>
                                </button>
                            </div>

                            {/* REKAP TOTAL BANNER */}
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="bg-emerald-50/80 border border-emerald-200/80 p-3.5 rounded-2xl flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                                            <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Pemasukan
                                        </span>
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                            {scannedItems.filter(i => i.type === 'income').length} item
                                        </span>
                                    </div>
                                    <p className="text-lg font-black text-emerald-700 tabular-nums leading-tight">
                                        +{formatRp(totalIncome)}
                                    </p>
                                </div>

                                <div className="bg-rose-50/80 border border-rose-200/80 p-3.5 rounded-2xl flex flex-col justify-between">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-800 flex items-center gap-1">
                                            <ArrowUpRight className="w-3 h-3 text-rose-600" /> Pengeluaran
                                        </span>
                                        <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                            {scannedItems.filter(i => i.type === 'expense').length} item
                                        </span>
                                    </div>
                                    <p className="text-lg font-black text-rose-700 tabular-nums leading-tight">
                                        -{formatRp(totalExpense)}
                                    </p>
                                </div>
                            </div>

                            {/* NET CASH IMPACT BOX */}
                            <div className="bg-brand-navy text-white p-4 rounded-2xl flex items-center justify-between border border-white/10 shadow-xs">
                                <div>
                                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Dampak Arus Kas Bersih</p>
                                    <p className="text-[11px] text-blue-100/80 font-medium mt-0.5">
                                        Total {scannedItems.length} transaksi terdeteksi
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-base font-black tabular-nums ${netTotal >= 0 ? 'text-emerald-400' : 'text-rose-300'}`}>
                                        {netTotal >= 0 ? `+${formatRp(netTotal)}` : `-${formatRp(Math.abs(netTotal))}`}
                                    </span>
                                </div>
                            </div>

                            {/* GLOBAL WALLET SOURCE SELECTOR */}
                            <div className="space-y-1.5 pt-1">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1 block">
                                    Sumber Dana Dompet / Rekening
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedGlobalSource}
                                        onChange={(e) => applyGlobalSource(e.target.value)}
                                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-xs font-bold text-slate-800 outline-none focus:border-brand-navy"
                                    >
                                        {availableSources.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* LIST OF SCANNED ITEMS (EDITABLE CARD PER ITEM) */}
                            <div className="space-y-3 pt-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                        Rincian Pos Transaksi ({scannedItems.length})
                                    </span>
                                    <button 
                                        type="button" 
                                        onClick={addNewItem}
                                        className="text-[11px] font-bold text-brand-navy hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Tambah Pos
                                    </button>
                                </div>

                                {scannedItems.map((item, idx) => (
                                    <div 
                                        key={item.id} 
                                        className={`p-4 rounded-2xl border transition-all space-y-3 relative ${
                                            item.type === 'income' 
                                                ? 'bg-emerald-50/40 border-emerald-200/90' 
                                                : 'bg-rose-50/30 border-rose-200/90'
                                        }`}
                                    >
                                        {/* Top Row: Type Pill Toggle + Delete */}
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleItemType(item.id)}
                                                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-transform active:scale-95 shadow-xs ${
                                                        item.type === 'income'
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                            : 'bg-rose-600 text-white hover:bg-rose-700'
                                                    }`}
                                                    title="Klik untuk ubah jenis Pemasukan / Pengeluaran"
                                                >
                                                    {item.type === 'income' ? (
                                                        <><ArrowDownLeft className="w-3 h-3" /> PEMASUKAN</>
                                                    ) : (
                                                        <><ArrowUpRight className="w-3 h-3" /> PENGELUARAN</>
                                                    )}
                                                </button>
                                                <span className="text-[10px] text-slate-400 font-bold">
                                                    #{idx + 1}
                                                </span>
                                            </div>

                                            {scannedItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                                                    title="Hapus pos ini"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Name & Amount Row */}
                                        <div className="flex gap-2">
                                            <div className="flex-1">
                                                <input 
                                                    type="text"
                                                    value={item.title}
                                                    onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                                                    placeholder="Nama Toko / Barang / Pos"
                                                    className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-brand-navy"
                                                />
                                            </div>
                                            <div className="w-36 relative">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">Rp</span>
                                                <input 
                                                    type="text"
                                                    inputMode="numeric"
                                                    value={formatNum(item.amount)}
                                                    onChange={(e) => updateItem(item.id, 'amount', parseNum(e.target.value))}
                                                    placeholder="0"
                                                    className="w-full h-11 pl-8 pr-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900 text-right outline-none focus:border-brand-navy tabular-nums"
                                                />
                                            </div>
                                        </div>

                                        {/* Category & Source Row */}
                                        <div className="flex gap-2 text-xs">
                                            <input 
                                                type="text"
                                                value={item.category}
                                                onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                                                placeholder="Kategori (Makan, Gaji, dll)"
                                                className="flex-1 h-9 px-3 bg-white/80 border border-slate-200 rounded-xl text-[11px] font-semibold text-slate-700 outline-none focus:border-brand-navy"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="space-y-2 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => handleConfirmAndSaveAll(false)} 
                                    disabled={isSubmitting || scannedItems.length === 0}
                                    className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin"/>
                                            <span>MENYIMPAN SEMUA TRANSAKSI...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4 stroke-[2.5]"/>
                                            <span>KONFIRMASI & SIMPAN ({scannedItems.length} TRANSAKSI)</span>
                                        </>
                                    )}
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => { setShowResultForm(false); setImagePreviews([]); setTranscript(""); }} 
                                    className="w-full h-11 text-slate-500 font-bold text-xs uppercase tracking-wider hover:text-slate-800 transition-colors cursor-pointer text-center"
                                >
                                    PINDAI ULANG / BATAL
                                </button>
                            </div>

                        </div>
                    )}
                </div>

            </div>
        </MobileLayout>
    );
}