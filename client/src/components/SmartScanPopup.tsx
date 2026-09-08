import { useState, useRef, useEffect } from "react";
import { 
    Mic, Camera, Loader2, Check, X, AlertCircle, Plus, Trash2,
    Sparkles, ArrowUpRight, ArrowDownLeft, CheckCircle2, Wallet,
    RotateCcw, ImagePlus, FolderOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

export interface ScannedItem {
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    currency: string;
    source?: string;
}

const COMMON_CATEGORIES = [
    "Makanan & Minum",
    "Belanja",
    "Transportasi",
    "Tagihan Bulanan",
    "Gaji",
    "Bonus / THR",
    "Kesehatan",
    "Pendidikan",
    "Hiburan",
    "Amal",
    "Investasi",
    "Lainnya"
];

interface SmartScanPopupProps {
    isOpen: boolean;
    initialMode?: 'voice' | 'photo' | null;
    onClose: () => void;
}

export default function SmartScanPopup({ isOpen, initialMode = null, onClose }: SmartScanPopupProps) {
    const { toast } = useToast();
    const { data: user } = useUser();

    // Voice recording states
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const transcriptRef = useRef("");
    const recognitionRef = useRef<any>(null);

    // AI scan loading states
    const [isScanning, setIsScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState("");

    // Confirmation pop up states
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
    const [selectedGlobalSource, setSelectedGlobalSource] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);

    // Photo source picker modal state
    const [showPhotoSourcePicker, setShowPhotoSourcePicker] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const currentUserEmail = typeof window !== 'undefined' ? (localStorage.getItem("bilano_email") || "").trim().toLowerCase() : "";
    const getAuthHeaders = () => ({ 
        "Content-Type": "application/json", 
        "x-user-email": currentUserEmail || "guest" 
    });

    const availableSources = user?.walletSources && Array.isArray(user.walletSources) && (user.walletSources as any[]).length > 0
        ? (user.walletSources as any[]).map((w: any) => w.name)
        : ["Cash (Uang Kertas)", "BCA", "Mandiri", "GoPay", "OVO"];

    useEffect(() => {
        if (availableSources.length > 0 && !selectedGlobalSource) {
            setSelectedGlobalSource(availableSources[0]);
        }
    }, [availableSources, selectedGlobalSource]);

    const formatNumInput = (val: string | number) => {
        let clean = val.toString().replace(/\D/g, '');
        if (clean.length > 1) {
            clean = clean.replace(/^0+/, '');
        }
        return clean.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };
    const parseNumInput = (val: string | number) => {
        if (typeof val === 'number') return val;
        return parseFloat(val.toString().replace(/\./g, '')) || 0;
    };

    // Trigger initial mode if passed
    useEffect(() => {
        if (isOpen && initialMode === 'voice') {
            transcriptRef.current = "";
            setTranscript("");
            setShowPhotoSourcePicker(false);
            startListening();
        } else if (isOpen && initialMode === 'photo') {
            setShowPhotoSourcePicker(true);
        }
    }, [isOpen, initialMode]);

    // 🎙️ VOICE RECORDING & AI ANALYSIS
    const startListening = () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                toast({
                    title: "Browser Tidak Didukung",
                    description: "Gunakan browser Google Chrome / Safari untuk fitur rekam suara.",
                    variant: "destructive"
                });
                onClose();
                return;
            }

            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.lang = 'id-ID';
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onstart = () => {
                setIsListening(true);
                transcriptRef.current = "";
                setTranscript("");
            };

            recognitionRef.current.onresult = (e: any) => {
                const currentText = Array.from(e.results)
                    .map((result: any) => result[0].transcript)
                    .join('');
                transcriptRef.current = currentText;
                setTranscript(currentText);
            };

            recognitionRef.current.onend = async () => {
                setIsListening(false);
                const text = transcriptRef.current.trim();
                if (text) {
                    await processVoiceWithAI(text);
                }
            };

            recognitionRef.current.onerror = (e: any) => {
                setIsListening(false);
                if (e.error !== 'no-speech') {
                    toast({
                        title: "Gagal Menangkap Suara",
                        description: "Pastikan izin mikrofon aktif dan berbicara dekat ke mikrofon.",
                        variant: "destructive"
                    });
                }
            };

            recognitionRef.current.start();
        } catch (e: any) {
            setIsListening(false);
            toast({
                title: "Izin Mikrofon Dibutuhkan",
                description: "Izinkan akses mikrofon di browser Anda.",
                variant: "destructive"
            });
            onClose();
        }
    };

    const stopListeningAndProcess = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
        const text = transcriptRef.current.trim();
        if (text) {
            processVoiceWithAI(text);
        }
    };

    const processVoiceWithAI = async (text: string) => {
        setIsScanning(true);
        setScanMessage("AI sedang memahami instruksi suara Anda...");
        try {
            const response = await fetch("/api/voice/scan", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ text })
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error || "Gagal memproses rekaman suara.");

            const aiData = resData.data;
            const items: ScannedItem[] = (aiData.items || []).map((it: any, idx: number) => ({
                id: it.id || `${Date.now()}_${idx}`,
                title: it.title || (it.type === 'income' ? "Pemasukan Suara" : "Pengeluaran Suara"),
                amount: Math.round(it.amount || 0),
                type: it.type === 'income' ? 'income' : 'expense',
                category: it.category || (it.type === 'income' ? "Gaji" : "Makanan & Minum"),
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
            setShowConfirmModal(true);
        } catch (err: any) {
            toast({
                title: "Gagal Menganalisa",
                description: err.message || "Pastikan Anda mendiktekan nominal transaksi dengan jelas.",
                variant: "destructive"
            });
            onClose();
        } finally {
            setIsScanning(false);
        }
    };

    // 📷 PHOTO RECEIPT & AI VISION ANALYSIS
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setShowPhotoSourcePicker(false);
        const files = Array.from(e.target.files || []);
        if (files.length === 0) {
            onClose();
            return;
        }

        setIsScanning(true);
        setScanMessage("Mengompres & memproses foto struk...");

        try {
            const base64List: string[] = [];

            for (const file of files) {
                const blobUrl = URL.createObjectURL(file);
                const compressedBase64 = await new Promise<string>((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement("canvas");
                        let width = img.width;
                        let height = img.height;
                        const MAX_SIZE = 900;

                        if (width > height) {
                            if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                        } else {
                            if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext("2d");
                        ctx?.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL("image/jpeg", 0.65));
                    };
                    img.src = blobUrl;
                });
                base64List.push(compressedBase64);
            }

            setScanMessage("AI sedang membaca item & total nominal struk...");
            const response = await fetch("/api/vision/scan", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ images: base64List })
            });

            const resData = await response.json();
            if (!response.ok) throw new Error(resData.error || "Gagal memindai foto struk.");

            const aiData = resData.data;
            const items: ScannedItem[] = (aiData.items || []).map((it: any, idx: number) => ({
                id: it.id || `${Date.now()}_${idx}`,
                title: it.title || `Item Belanja ${idx + 1}`,
                amount: Math.round(it.amount || 0),
                type: it.type === 'income' ? 'income' : 'expense',
                category: it.category || "Belanja",
                currency: it.currency || "IDR",
                source: selectedGlobalSource || availableSources[0]
            }));

            if (items.length === 0) {
                items.push({
                    id: Date.now().toString(),
                    title: aiData.category || "Struk Belanja",
                    amount: Math.round(aiData.totalAmount || 0),
                    type: aiData.type === 'income' ? 'income' : 'expense',
                    category: aiData.category || "Belanja",
                    currency: aiData.currency || "IDR",
                    source: selectedGlobalSource || availableSources[0]
                });
            }

            setScannedItems(items);
            setShowConfirmModal(true);
        } catch (err: any) {
            toast({
                title: "Gagal Pindai Struk",
                description: err.message || "Pastikan foto struk memiliki tulisan yang terbaca jelas.",
                variant: "destructive"
            });
            onClose();
        } finally {
            setIsScanning(false);
            if (galleryInputRef.current) galleryInputRef.current.value = "";
            if (cameraInputRef.current) cameraInputRef.current.value = "";
        }
    };

    // ITEM MANIPULATION IN CONFIRMATION POP UP
    const updateItemField = (id: string, field: keyof ScannedItem, value: any) => {
        setScannedItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const toggleItemType = (id: string) => {
        setScannedItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, type: item.type === 'income' ? 'expense' : 'income' };
            }
            return item;
        }));
    };

    const removeItem = (id: string) => {
        setScannedItems(prev => prev.filter(item => item.id !== id));
    };

    const addItem = () => {
        const newItem: ScannedItem = {
            id: Date.now().toString(),
            title: "Item Baru",
            amount: 0,
            type: 'expense',
            category: "Lainnya",
            currency: "IDR",
            source: selectedGlobalSource || availableSources[0]
        };
        setScannedItems(prev => [...prev, newItem]);
    };

    const applyGlobalSourceToAll = (sourceName: string) => {
        setSelectedGlobalSource(sourceName);
        setScannedItems(prev => prev.map(item => ({ ...item, source: sourceName })));
    };

    // SAVE CONFIRMED TRANSACTIONS
    const handleSaveTransactions = async () => {
        const validItems = scannedItems.filter(item => item.amount > 0);
        if (validItems.length === 0) {
            toast({
                title: "Nominal Belum Terisi",
                description: "Pastikan nominal transaksi lebih dari 0.",
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        try {
            const payloadTransactions = validItems.map(item => ({
                type: item.type,
                amount: Math.round(item.amount),
                category: item.category || (item.type === 'income' ? 'Gaji' : 'Makanan & Minum'),
                description: item.title || (item.type === 'income' ? 'Pemasukan AI Scan' : 'Pengeluaran AI Scan'),
                date: new Date(),
                source: item.source || selectedGlobalSource || availableSources[0]
            }));

            const res = await fetch("/api/transactions/batch", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify({ transactions: payloadTransactions })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Gagal menyimpan transaksi.");
            }

            // Invalidate React Query cache for instant live update on dashboard
            queryClient.invalidateQueries();

            const countIncome = validItems.filter(i => i.type === 'income').length;
            const countExpense = validItems.filter(i => i.type === 'expense').length;

            toast({
                title: "Transaksi Berhasil Dicatat! 🎉",
                description: `${validItems.length} transaksi (${countIncome} Masuk, ${countExpense} Keluar) berhasil disimpan.`
            });

            setShowConfirmModal(false);
            onClose();
        } catch (err: any) {
            toast({
                title: "Gagal Menyimpan",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen && !isListening && !isScanning && !showConfirmModal && !showPhotoSourcePicker) {
        return null;
    }

    const totalIncome = scannedItems.filter(i => i.type === 'income').reduce((sum, i) => sum + (i.amount || 0), 0);
    const totalExpense = scannedItems.filter(i => i.type === 'expense').reduce((sum, i) => sum + (i.amount || 0), 0);

    return (
        <>
            {/* Hidden File Inputs: Gallery & Direct Camera */}
            <input 
                type="file" 
                ref={galleryInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                multiple
                className="hidden" 
            />
            <input 
                type="file" 
                ref={cameraInputRef} 
                onChange={handleFileSelect} 
                accept="image/*" 
                capture="environment"
                multiple
                className="hidden" 
            />

            {/* 📷 POP UP PILIH SUMBER FOTO STRUK (GALERI ATAU KAMERA) */}
            {showPhotoSourcePicker && !isScanning && !showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#0b1329] text-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-sm p-6 shadow-2xl border-t sm:border border-white/10 animate-in slide-in-from-bottom-6 duration-200">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-sky-500/20">
                                    <Camera className="w-5 h-5 stroke-[2.5]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white">Scan Foto Struk AI</h3>
                                    <p className="text-[10px] text-slate-400">Pilih sumber pengambilan foto</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setShowPhotoSourcePicker(false); onClose(); }} 
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed mb-4">
                            Pilih foto struk yang sudah ada dari galeri perangkat Anda atau ambil foto baru langsung dengan kamera.
                        </p>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            {/* Opsi 1: Dari Galeri HP */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPhotoSourcePicker(false);
                                    galleryInputRef.current?.click();
                                }}
                                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-amber-400/40 active:scale-95 transition-all text-center group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-brand-navy flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-amber-500/20">
                                    <ImagePlus className="w-6 h-6 stroke-[2.5]" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-white block">Pilih Galeri</span>
                                    <span className="text-[10px] text-slate-400">Dari memori HP</span>
                                </div>
                            </button>

                            {/* Opsi 2: Buka Kamera */}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPhotoSourcePicker(false);
                                    cameraInputRef.current?.click();
                                }}
                                className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-sky-400/40 active:scale-95 transition-all text-center group cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-sky-500/20">
                                    <Camera className="w-6 h-6 stroke-[2.5]" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-white block">Buka Kamera</span>
                                    <span className="text-[10px] text-slate-400">Ambil foto baru</span>
                                </div>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => { setShowPhotoSourcePicker(false); onClose(); }}
                            className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                            Batal
                        </button>
                    </div>
                </div>
            )}

            {/* 🎙️ 1. POP UP / OVERLAY MENDENGARKAN SUARA (VOICE RECORDING) */}
            {isListening && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0b1329] border border-amber-400/40 rounded-[32px] w-full max-w-sm p-6 text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center relative overflow-hidden">
                        
                        {/* Glowing Background Ring */}
                        <div className="absolute -top-12 inset-x-0 h-32 bg-amber-400/20 blur-3xl pointer-events-none" />

                        {/* Animated Microphone Pulse */}
                        <div className="relative mb-5 mt-2">
                            <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
                            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-[#0a1128] flex items-center justify-center shadow-[0_0_32px_rgba(251,191,36,0.6)] relative z-10">
                                <Mic className="w-10 h-10 stroke-[2.5]" />
                            </div>
                        </div>

                        <span className="bg-amber-400/10 text-amber-300 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full border border-amber-400/30 mb-2">
                            MENDENGARKAN SUARA...
                        </span>

                        <h3 className="text-lg font-black text-white mb-2">
                            Sebutkan Transaksi Anda
                        </h3>

                        <p className="text-xs text-slate-300 leading-relaxed max-w-xs mb-4">
                            Contoh: <i className="text-amber-200 font-medium">"Beli bensin 50 ribu pakai GoPay, terus makan siang 35 ribu"</i>
                        </p>

                        {/* Transcript Bubble */}
                        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-3.5 min-h-[64px] mb-5 flex items-center justify-center text-center">
                            {transcript ? (
                                <p className="text-sm font-bold text-amber-300 leading-snug animate-in fade-in">
                                    "{transcript}"
                                </p>
                            ) : (
                                <p className="text-xs text-slate-400 italic">
                                    Silakan berbicara sekarang...
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2.5 w-full">
                            <button
                                type="button"
                                onClick={() => {
                                    if (recognitionRef.current) recognitionRef.current.stop();
                                    setIsListening(false);
                                    onClose();
                                }}
                                className="flex-1 h-12 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={stopListeningAndProcess}
                                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-[#0a1128] font-black text-xs shadow-lg shadow-amber-400/30 active:scale-95 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <Check className="w-4 h-4 stroke-[3]" />
                                Selesai
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ⏳ 2. POP UP LOADING ANALISIS AI */}
            {isScanning && !isListening && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-[#0b1329] border border-sky-400/40 rounded-[32px] w-full max-w-sm p-7 text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                        <h3 className="text-base font-black text-white mb-1.5">
                            Memproses AI Scan
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                            {scanMessage || "AI sedang membedah transaksi..."}
                        </p>
                    </div>
                </div>
            )}

            {/* 📋 3. POP UP MODAL KONFIRMASI HASIL SCAN TRANSAKSI */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 duration-300 border border-slate-100 overflow-hidden">
                        
                        {/* Header Pop up */}
                        <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1D3E72] to-[#2563EB] text-white flex items-center justify-center shadow-md">
                                    <Sparkles className="w-5 h-5 text-[#F6B93B]" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="font-black text-slate-800 text-base">Konfirmasi Hasil Scan</h3>
                                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                                            {scannedItems.length} Pos
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium">Periksa & edit sebelum disimpan ke laporan</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    onClose();
                                }}
                                className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            
                            {/* Global Wallet Selector */}
                            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-indigo-600 shrink-0" />
                                    <span className="text-xs font-bold text-slate-700">Sumber Dompet:</span>
                                </div>
                                <select
                                    value={selectedGlobalSource}
                                    onChange={(e) => applyGlobalSourceToAll(e.target.value)}
                                    className="bg-white border border-slate-200 text-xs font-extrabold text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                                >
                                    {availableSources.map(source => (
                                        <option key={source} value={source}>{source}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Scanned Items List */}
                            <div className="space-y-3">
                                {scannedItems.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="p-4 rounded-2xl border bg-white shadow-sm transition-all relative space-y-3"
                                        style={{
                                            borderColor: item.type === 'income' ? '#86efac' : '#fca5a5'
                                        }}
                                    >
                                        {/* Top Row: Type toggle & Delete */}
                                        <div className="flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => toggleItemType(item.id)}
                                                className={`px-3 py-1 rounded-full text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                                                    item.type === 'income'
                                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                }`}
                                            >
                                                {item.type === 'income' ? (
                                                    <><ArrowDownLeft className="w-3.5 h-3.5" /> Pemasukan (Masuk)</>
                                                ) : (
                                                    <><ArrowUpRight className="w-3.5 h-3.5" /> Pengeluaran (Keluar)</>
                                                )}
                                            </button>

                                            {scannedItems.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeItem(item.id)}
                                                    className="text-slate-400 hover:text-rose-500 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                                                    title="Hapus pos ini"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Title & Amount Inputs */}
                                        <div className="grid grid-cols-1 gap-2.5">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                    Nama Pos Transaksi
                                                </label>
                                                <input
                                                    type="text"
                                                    value={item.title}
                                                    onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                    placeholder="Deskripsi..."
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                        Nominal (Rp)
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            value={formatNumInput(item.amount)}
                                                            onChange={(e) => updateItemField(item.id, 'amount', parseNumInput(e.target.value))}
                                                            className="w-full h-10 pl-8 pr-2.5 rounded-xl border border-slate-200 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                        Kategori
                                                    </label>
                                                    <select
                                                        value={item.category}
                                                        onChange={(e) => updateItemField(item.id, 'category', e.target.value)}
                                                        className="w-full h-10 px-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                    >
                                                        {COMMON_CATEGORIES.map(cat => (
                                                            <option key={cat} value={cat}>{cat}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Wallet selector per item */}
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                                    Dompet / Rekening
                                                </label>
                                                <select
                                                    value={item.source || selectedGlobalSource}
                                                    onChange={(e) => updateItemField(item.id, 'source', e.target.value)}
                                                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                                >
                                                    {availableSources.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Add Item Button */}
                            <button
                                type="button"
                                onClick={addItem}
                                className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Tambah Pos Transaksi Lain
                            </button>

                            {/* Summary Totals */}
                            <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-400">Total Pengeluaran:</span>
                                    <span className="font-extrabold text-rose-400">
                                        {formatCurrency(totalExpense)}
                                    </span>
                                </div>
                                {totalIncome > 0 && (
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-400">Total Pemasukan:</span>
                                        <span className="font-extrabold text-emerald-400">
                                            {formatCurrency(totalIncome)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Action Buttons */}
                        <div className="p-4 border-t border-slate-100 flex gap-2.5 shrink-0 bg-white">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmModal(false);
                                    onClose();
                                }}
                                className="flex-1 h-12 rounded-2xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTransactions}
                                disabled={isSaving}
                                className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-[#1D3E72] to-[#2563EB] text-white font-black text-xs shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Menyimpan...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 text-[#F6B93B]" />
                                        <span>SIMPAN TRANSAKSI</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
