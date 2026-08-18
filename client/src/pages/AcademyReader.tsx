import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
// Tambahan ikon Bookmark dari lucide-react
import { ChevronLeft, BookOpen, Loader2, Bookmark } from "lucide-react";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    
    // Rute tetap tidak berubah agar sistem tidak error
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const ebookId = params?.ebookId;

    const [ebook, setEbook] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    // ==========================================
    // STATE BARU UNTUK FITUR BOOKMARK MANUAL
    // ==========================================
    const [showExitModal, setShowExitModal] = useState(false);
    const [inputPage, setInputPage] = useState("");
    const [savedBookmark, setSavedBookmark] = useState<string | null>(null);

    // ==========================================
    // LOGIKA FETCH DATA ASLI BAWAAN LU
    // ==========================================
    useEffect(() => {
        const fetchEbook = async () => {
            if (!ebookId) return;
            setIsLoading(true);

            try {
                // Tembak ke API utama yang sudah pasti ada di backend
                const res = await fetch(`/api/ebooks`);
                
                if (res.status === 402) {
                    setErrorMsg("Akses Premium Diperlukan.");
                    setIsLoading(false);
                    return;
                }

                const result = await res.json();
                
                if (result.success && result.data) {
                    // Cari buku spesifik yang sedang diklik user
                    const currentBook = result.data.find((b: any) => b.id === Number(ebookId));
                    
                    if (currentBook) {
                        // Cek apakah URL PDF-nya sudah dimasukkan dari database
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

    // ==========================================
    // LOGIKA MEMORI BROWSER UNTUK BOOKMARK
    // ==========================================
    useEffect(() => {
        // Cek apakah ada halaman tersimpan saat buku selesai dimuat
        if (ebook?.title) {
            const memori = localStorage.getItem(`bookmark_bilano_${ebook.title}`);
            if (memori) {
                setSavedBookmark(memori);
            }
        }
    }, [ebook?.title]);

    // ==========================================
    // LOGIKA CEGAT TOMBOL BACK HP / SWIPE BACK
    // ==========================================
    useEffect(() => {
        // Trik: Kita tambah riwayat "palsu" ke dalam browser
        window.history.pushState(null, "", window.location.href);

        const handlePopState = (event: PopStateEvent) => {
            // Ketika user swipe back di HP, munculkan pop-up kita
            setShowExitModal(true);
            
            // Dorong lagi riwayat palsu agar user tidak benar-benar terlempar keluar dari halaman
            window.history.pushState(null, "", window.location.href);
        };

        // Pasang pendeteksi tombol back bawaan HP
        window.addEventListener("popstate", handlePopState);

        return () => {
            // Bersihkan memori saat aplikasi ditutup
            window.removeEventListener("popstate", handlePopState);
        };
    }, []);

    const handleBackClick = () => {
        setShowExitModal(true); // Memunculkan pop-up saat mau kembali
    };

    const handleSaveAndExit = () => {
        if (inputPage.trim() !== "" && ebook?.title) {
            // Simpan angka halaman ke memori lokal browser
            localStorage.setItem(`bookmark_bilano_${ebook.title}`, inputPage);
        }
        setLocation("/academy"); 
    };

    const handleSkipAndExit = () => {
        setLocation("/academy"); // Keluar tanpa menyimpan
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none overflow-hidden relative">
            
            {/* ========================================== */}
            {/* MODAL POP-UP EXIT (TAMPIL JIKA DITEKAN KEMBALI) */}
            {/* ========================================== */}
            {showExitModal && (
                <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4 text-amber-400">
                            <Bookmark className="w-6 h-6" />
                            <h2 className="font-bold text-lg text-white">Tandai Halaman?</h2>
                        </div>
                        <p className="text-sm text-slate-300 mb-6">
                            Mau simpan halaman berapa buat dibaca nanti? (Kosongkan kalau tidak perlu).
                        </p>
                        
                        <input 
                            type="number" 
                            placeholder="Contoh: 45"
                            value={inputPage}
                            onChange={(e) => setInputPage(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white mb-6 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                            autoFocus
                        />
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={handleSkipAndExit}
                                className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                                Lewati
                            </button>
                            <button 
                                onClick={handleSaveAndExit}
                                className="flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-900 bg-amber-500 hover:bg-amber-400 transition-colors"
                            >
                                Simpan & Keluar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header Atas */}
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center shadow-md border-b border-slate-800">
                <button 
                    onClick={handleBackClick} 
                    className="w-8 h-8 flex flex-shrink-0 items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300 transition-colors mr-3"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy</p>
                    <h1 className="font-bold text-xs truncate">{ebook?.title || "Memuat Dokumen..."}</h1>
                </div>

                {/* INDIKATOR BOOKMARK DI KANAN ATAS */}
                {savedBookmark && (
                    <div className="flex-shrink-0 flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-full">
                        <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-bold text-slate-300 whitespace-nowrap">Hal: {savedBookmark}</span>
                    </div>
                )}
            </div>

            {/* Container Pembaca */}
            <div className="flex-1 w-full relative bg-[#525659]">
                {isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                        <p className="text-xs text-slate-300 font-medium tracking-wide">Membuka lembaran buku...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-8 bg-slate-900 rounded-2xl text-center shadow-2xl border border-slate-800 max-w-sm mx-4">
                            <BookOpen className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                            <p className="text-sm font-bold text-slate-300 mb-6">{errorMsg}</p>
                            <button 
                                onClick={() => setLocation("/academy")}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-300 transition-colors uppercase tracking-wider"
                            >
                                Kembali ke Rak Buku
                            </button>
                        </div>
                    </div>
                ) : (
                    <iframe 
                        src={`${ebook?.pdf_url}#toolbar=0&navpanes=0`} 
                        className="absolute inset-0 w-full h-full border-none"
                        title={ebook?.title}
                    />
                )}
            </div>
            
        </div>
    );
}