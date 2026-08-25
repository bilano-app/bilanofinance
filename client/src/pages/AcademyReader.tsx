import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { 
    ChevronLeft, BookOpen, Loader2, Bookmark, Crown, 
    Check, X, Sparkles, RefreshCw, AlertTriangle, ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const ebookId = params?.ebookId;
    const { toast } = useToast();

    const [ebook, setEbook] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // Modal state untuk simpan halaman saat keluar / manual bookmark
    const [showExitModal, setShowExitModal] = useState(false);
    const [showQuickBookmarkModal, setShowQuickBookmarkModal] = useState(false);
    const [inputPage, setInputPage] = useState("");
    const [savedBookmark, setSavedBookmark] = useState<string | null>(null);
    const isExitingRef = useRef(false);

    // =========================================================================
    // 1. FETCH DATA EBOOK
    // =========================================================================
    useEffect(() => {
        const fetchEbook = async () => {
            if (!ebookId) return;
            setIsLoading(true);

            try {
                const res = await fetch(`/api/ebooks`);
                
                if (res.status === 402) {
                    setErrorMsg("Akses VIP Premium Diperlukan.");
                    setIsLoading(false);
                    return;
                }

                const result = await res.json();
                
                if (result.success && result.data) {
                    const currentBook = result.data.find((b: any) => b.id === Number(ebookId));
                    
                    if (currentBook) {
                        if (!currentBook.pdf_url) {
                            setErrorMsg("File PDF untuk buku ini belum diunggah.");
                        } else {
                            setEbook(currentBook);
                        }
                    } else {
                        setErrorMsg("Buku tidak ditemukan di perpustakaan.");
                    }
                } else {
                    setErrorMsg("Gagal mengambil data dari server.");
                }
            } catch (err) {
                console.error("Fetch error:", err);
                setErrorMsg("Gagal memuat dokumen PDF.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEbook();
    }, [ebookId]);

    // =========================================================================
    // 2. AMBIL BOOKMARK DARI LOCALSTORAGE
    // =========================================================================
    useEffect(() => {
        if (ebook?.title) {
            const memory = localStorage.getItem(`bookmark_bilano_${ebook.title}`);
            if (memory) {
                setSavedBookmark(memory);
                setInputPage(memory);
            }
        }
    }, [ebook?.title]);

    // =========================================================================
    // 3. LOGIKA TOMBOL BACK BAWAAN HP / SWIPE (ANTI-LOOPING)
    // =========================================================================
    useEffect(() => {
        // Dorong satu riwayat unik saat pertama kali reader dibuka
        window.history.pushState({ bilanoReader: true }, "");

        const handlePopState = (event: PopStateEvent) => {
            // Jika sedang dalam proses exit navigasi, biarkan berjalan
            if (isExitingRef.current) return;

            // Tampilkan modal konfirmasi bookmark tanpa menduplikasi riwayat browser
            setShowExitModal(true);
        };

        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    // Navigasi keluar bersih
    const handleExitAction = (shouldSave: boolean) => {
        isExitingRef.current = true;
        if (shouldSave && inputPage.trim() && ebook?.title) {
            localStorage.setItem(`bookmark_bilano_${ebook.title}`, inputPage.trim());
            setSavedBookmark(inputPage.trim());
            toast({
                title: "Bookmark Disimpan!",
                description: `Progres baca halaman ${inputPage.trim()} telah dicatat.`
            });
        }
        setShowExitModal(false);
        setLocation("/academy");
    };

    const handleCancelExit = () => {
        setShowExitModal(false);
        // Dorong kembali state penjaga agar penekanan tombol back berikutnya tetap dicegat
        window.history.pushState({ bilanoReader: true }, "");
    };

    const handleSaveQuickBookmark = () => {
        if (inputPage.trim() && ebook?.title) {
            localStorage.setItem(`bookmark_bilano_${ebook.title}`, inputPage.trim());
            setSavedBookmark(inputPage.trim());
            setShowQuickBookmarkModal(false);
            toast({
                title: "Halaman Ditandai!",
                description: `Tersimpan di halaman ${inputPage.trim()}`
            });
        }
    };

    // Format URL Google Drive dengan parameter viewer bersih
    const getCleanPdfUrl = (url?: string) => {
        if (!url) return "";
        let clean = url.trim();
        // Pastikan menggunakan format /preview
        if (clean.includes("/view")) {
            clean = clean.replace("/view", "/preview");
        }
        // Tambahkan parameter pelindung toolbar
        if (!clean.includes("#")) {
            clean = `${clean}#toolbar=0&navpanes=0&scrollbar=0`;
        }
        return clean;
    };

    const pdfEmbedSrc = getCleanPdfUrl(ebook?.pdf_url);

    return (
        <div className="h-screen w-full bg-slate-950 flex flex-col font-sans select-none overflow-hidden relative max-w-md mx-auto shadow-2xl border-x border-slate-900">
            
            {/* ========================================================================= */}
            {/* 🔴 MODAL EXIT / KONFIRMASI SIMPAN HALAMAN (BILANO GOLD THEME) */}
            {/* ========================================================================= */}
            {showExitModal && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border-4 border-brand-gold text-center relative overflow-hidden">
                        
                        {/* Golden Icon Badge */}
                        <div className="w-16 h-16 bg-brand-gold text-brand-navy rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
                            <Bookmark className="w-8 h-8 fill-current" />
                        </div>

                        <h2 className="text-xl font-black text-slate-900 mb-1 tracking-tight">
                            Tandai Halaman Baca? 🔖
                        </h2>
                        <p className="text-xs text-slate-500 font-semibold mb-4 leading-relaxed">
                            Simpan nomor halaman terakhir agar kamu bisa langsung melanjutkan baca nanti.
                        </p>

                        <div className="mb-5">
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 text-center">
                                Nomor Halaman Terakhir
                            </label>
                            <input
                                type="number"
                                inputMode="numeric"
                                placeholder="Contoh: 42"
                                value={inputPage}
                                onChange={(e) => setInputPage(e.target.value)}
                                className="w-full h-14 bg-amber-50/70 border-2 border-amber-200 focus:border-brand-navy rounded-2xl px-4 font-black text-2xl text-center text-slate-900 focus:outline-none transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="space-y-2.5">
                            <button
                                onClick={() => handleExitAction(true)}
                                className="w-full h-12 bg-brand-gold hover:bg-brand-goldDark text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-brand-navy active:shadow-[1px_1px_0px_0px] active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Simpan & Keluar</span>
                            </button>

                            <button
                                onClick={() => handleExitAction(false)}
                                className="w-full h-11 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-xs uppercase tracking-wider rounded-2xl active:scale-95 transition-all cursor-pointer"
                            >
                                Keluar Tanpa Menyimpan
                            </button>

                            <button
                                onClick={handleCancelExit}
                                className="text-xs font-bold text-slate-400 hover:text-slate-700 py-1.5 transition-colors cursor-pointer"
                            >
                                Batal (Lanjut Membaca)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 🟡 MODAL CEPAT SET BOOKMARK MANUAL DARI HEADER */}
            {/* ========================================================================= */}
            {showQuickBookmarkModal && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 border-4 border-brand-navy text-center relative overflow-hidden">
                        <button 
                            onClick={() => setShowQuickBookmarkModal(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="w-14 h-14 bg-brand-navy text-brand-gold rounded-full flex items-center justify-center mx-auto mb-3 shadow-md">
                            <Bookmark className="w-7 h-7 fill-current" />
                        </div>

                        <h2 className="text-lg font-black text-slate-900 mb-1">
                            Set Penanda Halaman
                        </h2>
                        <p className="text-xs text-slate-500 font-semibold mb-4">
                            Tandai halaman aktif saat ini untuk buku <b>{ebook?.title}</b>.
                        </p>

                        <input
                            type="number"
                            inputMode="numeric"
                            placeholder="Ketik nomor halaman..."
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            className="w-full h-12 bg-slate-50 border-2 border-slate-200 focus:border-brand-navy rounded-2xl px-4 font-black text-xl text-center text-slate-900 focus:outline-none mb-4"
                            autoFocus
                        />

                        <button
                            onClick={handleSaveQuickBookmark}
                            className="w-full h-12 bg-brand-navy hover:bg-slate-900 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-900 active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                        >
                            Simpan Penanda
                        </button>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 👑 HEADER READER — BILANO NAVY (#1D3E72) & AKSEN GOLD (#F6B93B) */}
            {/* ========================================================================= */}
            <header className="shrink-0 bg-brand-navy text-white px-4 py-3 border-b-2 border-brand-gold shadow-lg flex items-center justify-between relative z-30">
                <div className="flex items-center gap-3 min-w-0 pr-2">
                    <button
                        onClick={() => setShowExitModal(true)}
                        className="w-9 h-9 rounded-full bg-brand-gold hover:bg-brand-goldDark text-brand-navy shadow-[2px_2px_0px_0px] shadow-slate-950 active:translate-x-[1px] active:translate-y-[1px] flex items-center justify-center transition-all shrink-0 cursor-pointer"
                        title="Kembali ke Daftar Buku"
                    >
                        <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
                    </button>

                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></span>
                            <span className="text-[9px] font-black text-brand-gold uppercase tracking-widest truncate">
                                BILANO ACADEMY
                            </span>
                        </div>
                        <h1 className="font-black text-xs sm:text-sm text-white truncate max-w-[200px]">
                            {ebook?.title || "Memuat Dokumen..."}
                        </h1>
                    </div>
                </div>

                {/* Indikator / Tombol Bookmark Cepat di Kanan Atas */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setShowQuickBookmarkModal(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer ${
                            savedBookmark
                                ? "bg-brand-gold text-brand-navy shadow-[2px_2px_0px_0px] shadow-slate-950"
                                : "bg-white/10 hover:bg-white/20 text-brand-gold border border-brand-gold/40"
                        }`}
                        title="Tandai Halaman"
                    >
                        <Bookmark className={`w-3.5 h-3.5 ${savedBookmark ? "fill-current" : ""}`} />
                        <span className="text-[10px] whitespace-nowrap">
                            {savedBookmark ? `Hal ${savedBookmark}` : "Tandai"}
                        </span>
                    </button>
                </div>
            </header>

            {/* ========================================================================= */}
            {/* 📖 CONTAINER PEMBACA PDF GOOGLE DRIVE (DENGAN PRECISION CLIPPING ANTI-POPOUT) */}
            {/* ========================================================================= */}
            <div className="flex-1 w-full relative bg-slate-950 overflow-hidden">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950">
                        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-brand-gold/20 flex items-center justify-center mb-4">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
                        </div>
                        <p className="text-sm font-black text-white tracking-wide">Membuka Lembaran E-Book...</p>
                        <p className="text-xs text-slate-400 mt-1 font-medium">Resolusi tinggi sedang dimuat</p>
                    </div>
                ) : errorMsg ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950">
                        <div className="p-7 bg-slate-900 rounded-[32px] text-center shadow-2xl border-2 border-brand-gold/30 max-w-sm w-full">
                            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-black text-white mb-2">Gagal Memuat E-Book</h3>
                            <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">
                                {errorMsg}
                            </p>
                            <button
                                onClick={() => setLocation("/academy")}
                                className="w-full h-12 bg-brand-gold hover:bg-brand-goldDark text-brand-navy font-black text-xs uppercase tracking-wider rounded-2xl shadow-[4px_4px_0px_0px] shadow-slate-950 active:translate-x-[2px] active:translate-y-[2px] transition-all cursor-pointer"
                            >
                                Kembali ke Rak Buku
                            </button>
                        </div>
                    </div>
                ) : (
                    /* WADAH IFRAME GOOGLE DRIVE DENGAN POTONGAN HEADER (-56px) */
                    <div className="relative w-full h-full overflow-hidden bg-slate-950 select-none">
                        
                        {/* Iframe diposisikan dengan offset negatif di atas agar toolbar Google Drive terpotong penuh */}
                        <div className="absolute inset-0 overflow-hidden">
                            <iframe
                                src={pdfEmbedSrc}
                                className="w-full border-none select-none"
                                style={{
                                    position: "absolute",
                                    top: "-56px", // Memotong dan menyembunyikan seluruh header & tanda panah keluar GDrive
                                    left: "0",
                                    width: "100%",
                                    height: "calc(100% + 56px)",
                                }}
                                title={ebook?.title}
                                allow="autoplay"
                            />
                        </div>

                        {/* Top corner invisible shield: Mencegah klik tidak sengaja di area pojok atas */}
                        <div 
                            className="absolute top-0 right-0 w-32 h-14 z-20 pointer-events-auto bg-transparent"
                            title="Bilano Secure Reader" 
                        />
                    </div>
                )}
            </div>

            {/* Bottom Mini Control Bar */}
            <div className="shrink-0 bg-slate-900/95 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400 relative z-30">
                <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="font-bold text-slate-300">Mode Baca VIP</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (savedBookmark) {
                                toast({ title: `Bookmark Terakhir`, description: `Buku ini ditandai pada halaman ${savedBookmark}` });
                            } else {
                                setShowQuickBookmarkModal(true);
                            }
                        }}
                        className="text-[10px] font-black text-brand-gold hover:underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                    >
                        <Bookmark className="w-3 h-3 fill-current" />
                        {savedBookmark ? `Tersimpan: Hal ${savedBookmark}` : "Pasang Bookmark"}
                    </button>
                </div>
            </div>
        </div>
    );
}