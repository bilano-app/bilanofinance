import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    
    // Rute tetap tidak berubah agar sistem tidak error
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const ebookId = params?.ebookId;

    const [ebook, setEbook] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

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

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none overflow-hidden">
            
            {/* Header Atas (Tidak Berubah) */}
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shadow-md border-b border-slate-800">
                <button 
                    onClick={() => setLocation("/academy")} 
                    className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 text-slate-300 transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy</p>
                    <h1 className="font-bold text-xs line-clamp-1">{ebook?.title || "Memuat Dokumen..."}</h1>
                </div>
            </div>

            {/* Container Pembaca (Diperbaiki agar PDF Full Layar) */}
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