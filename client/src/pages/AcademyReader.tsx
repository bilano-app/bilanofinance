import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-finance";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    // Route disederhanakan: tidak butuh lagi /:chapterNum
    const [match, params] = useRoute("/academy/:ebookId/read");
    const { data: user } = useUser();
    
    const ebookId = params?.ebookId;

    const [chapters, setChapters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingNext, setIsFetchingNext] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [hasMore, setHasMore] = useState(true);
    const [nextChapter, setNextChapter] = useState(1);

    // Fetcher Otomatis: Memuat bab secara berurutan dan menumpuknya ke bawah
    useEffect(() => {
        const fetchChapter = async () => {
            if (!ebookId || !hasMore) return;

            try {
                if (nextChapter === 1) setIsLoading(true);
                else setIsFetchingNext(true);

                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${nextChapter}`);
                const result = await res.json();
                
                if (res.status === 402) {
                    setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro.");
                    setHasMore(false);
                    return;
                }

                if (result.success && result.data) {
                    setChapters(prev => [...prev, result.data]);
                    setNextChapter(prev => prev + 1); // Otomatis trigger muat bab berikutnya
                } else {
                    setHasMore(false); // Mentok, seluruh buku sudah dimuat
                }
            } catch (e) {
                if (nextChapter === 1) setErrorMsg("Terjadi kesalahan koneksi saat memuat buku.");
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setIsFetchingNext(false);
            }
        };
        
        fetchChapter();
    }, [ebookId, nextChapter, hasMore]);

    // Parser Pintar untuk Markdown dan Paragraf
    const renderContent = (content: string) => {
        if (!content) return null;

        // Pisahkan berdasarkan ENTER GANDA (Paragraf sesungguhnya)
        const blocks = content.split(/\n\s*\n/);

        return blocks.map((block, idx) => {
            let trimmed = block.trim();
            if (!trimmed) return null;

            if (trimmed.startsWith('#')) {
                const cleanTitle = trimmed.replace(/^#+\s*/, '');
                return (
                    <h3 key={`h-${idx}`} className="text-xl font-bold text-slate-900 mt-8 mb-4 border-b border-slate-300 pb-2 font-serif">
                        {cleanTitle}
                    </h3>
                );
            }

            // Memperbaiki buku lama yang terlanjur terpotong enter tunggal di database
            // Ganti enter tunggal menjadi spasi, lalu proses **tebal** dan *miring*
            let formattedHtml = trimmed
                .replace(/\n/g, ' ') 
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            return (
                <p key={`p-${idx}`} 
                   className="mb-4 text-slate-900 text-justify leading-relaxed"
                   style={{ fontSize: '12pt', lineHeight: '1.7' }}
                   dangerouslySetInnerHTML={{ __html: formattedHtml }}
                />
            );
        });
    };

    return (
        <div className="min-h-screen bg-slate-200 flex flex-col font-sans">
            {/* Header Sticky */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-300 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setLocation("/academy")} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Bilano PDF Reader</p>
                        <h1 className="font-extrabold text-slate-900 text-sm line-clamp-1 max-w-[200px]">
                            {chapters.length > 0 ? chapters[0].title : "Memuat dokumen..."}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Area Baca - Efek Kertas A4 Panjang */}
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
                    <div className="animate-in fade-in duration-500 w-full flex flex-col items-center gap-4">
                        <div 
                            className="bg-white shadow-[0_10px_40px_rgba(0,0,0,0.15)] w-full max-w-[794px] min-h-[1123px] px-6 py-10 md:px-16 md:py-16"
                            style={{ fontFamily: '"Times New Roman", Times, serif' }}
                        >
                            {chapters.map((chap, index) => (
                                <div key={chap.id || index} className="mb-12">
                                    {/* Sembunyikan judul jika isinya cuma tulisan generik "Bagian X" */}
                                    {!/^Bagian \d+$/i.test(chap.title) && (
                                        <h2 className="text-2xl font-bold text-black mb-10 border-b-2 border-black pb-4 text-center">
                                            {chap.title}
                                        </h2>
                                    )}
                                    <div className="tracking-wide">
                                        {renderContent(chap.content)}
                                    </div>
                                </div>
                            ))}

                            {isFetchingNext && (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                </div>
                            )}
                            
                            {!hasMore && !errorMsg && chapters.length > 0 && (
                                <div className="text-center text-slate-400 italic text-sm mt-16 pt-8 border-t border-slate-200">
                                    - Akhir dari Dokumen -
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}