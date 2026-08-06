import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, ChevronRight, BookOpen, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-finance";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [match, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const { data: user } = useUser();
    
    const ebookId = params?.ebookId;
    const chapterNum = parseInt(params?.chapterNum || "1");

    const [chapterData, setChapterData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");

    useEffect(() => {
        const fetchChapter = async () => {
            setIsLoading(true);
            setErrorMsg("");
            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${chapterNum}`);
                const result = await res.json();
                
                if (res.status === 402) {
                    setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro untuk membaca koleksi elit ini.");
                    return;
                }

                if (result.success) {
                    setChapterData(result.data);
                } else {
                    setErrorMsg(result.error || "Gagal memuat isi bab.");
                }
            } catch (e) {
                setErrorMsg("Terjadi kesalahan koneksi saat memuat buku.");
            } finally {
                setIsLoading(false);
            }
        };
        
        if (ebookId && chapterNum) fetchChapter();
    }, [ebookId, chapterNum]);

    // Fungsi render teks dengan spesifikasi Times New Roman 12pt dan Justify
    const renderContent = (content: string) => {
        return content.split('\n').map((paragraph, idx) => (
            paragraph.trim() ? (
                <p key={idx} 
                   className="mb-4 text-black text-justify"
                   style={{ fontSize: '12pt', lineHeight: '1.6' }}>
                    {paragraph}
                </p>
            ) : <br key={idx} />
        ));
    };

    return (
        // Latar belakang diubah menjadi abu-abu seperti aplikasi PDF Reader (slate-200)
        <div className="min-h-screen bg-slate-200 flex flex-col font-sans">
            
            {/* Header Navigasi Atas */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-300 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setLocation("/academy")} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Bilano PDF Reader</p>
                        <h1 className="font-extrabold text-slate-900 text-sm line-clamp-1 max-w-[200px]">
                            {chapterData ? chapterData.title : "Memuat dokumen..."}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Area Baca - Efek Kertas A4 */}
            <div className="flex-1 flex justify-center p-4 md:p-8">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                        <p className="text-sm font-medium text-slate-600">Menyiapkan dokumen...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <BookOpen className="w-12 h-12 text-rose-500 mb-4 opacity-50" />
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Akses Ditolak</h2>
                        <p className="text-sm text-slate-600 max-w-[250px]">{errorMsg}</p>
                        <button onClick={() => setLocation("/paywall")} className="mt-6 px-6 py-3 bg-amber-500 text-slate-900 font-bold rounded-full text-sm active:scale-95 transition-transform">
                            Upgrade Sekarang
                        </button>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500 w-full flex justify-center">
                        {/* ILUSI KERTAS A4 (max-width setara A4 web, putih, shadow tebal) */}
                        <div 
                            className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] w-full max-w-[794px] min-h-[1123px] px-6 py-10 md:px-16 md:py-16"
                            style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                            <h2 className="text-2xl font-bold text-black mb-10 border-b-2 border-black pb-4 text-center">
                                {chapterData.title}
                            </h2>
                            <div className="tracking-wide">
                                {renderContent(chapterData.content)}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Navigasi Pindah Bab */}
            {!isLoading && !errorMsg && chapterData && (
                <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-300 px-4 py-4 flex items-center justify-between shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
                    <button 
                        onClick={() => setLocation(`/academy/${ebookId}/read/${chapterNum - 1}`)}
                        disabled={chapterNum <= 1}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${chapterNum <= 1 ? 'opacity-30 cursor-not-allowed text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                    >
                        <ChevronLeft className="w-4 h-4" /> Bab Sebelumnya
                    </button>
                    
                    <span className="text-xs font-bold text-slate-500">Hal {chapterNum}</span>

                    <button 
                        onClick={() => setLocation(`/academy/${ebookId}/read/${chapterNum + 1}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        Bab Selanjutnya <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}