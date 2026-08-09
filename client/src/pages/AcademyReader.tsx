import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";
import { useUser } from "@/hooks/use-finance";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [match, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    const { data: user } = useUser();
    
    const ebookId = params?.ebookId;
    const initialChapterNum = parseInt(params?.chapterNum || "1");

    const [chapters, setChapters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    
    const [nextChapter, setNextChapter] = useState(initialChapterNum);
    const [hasMore, setHasMore] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);
    
    // 🔥 INFINITE SCROLL: Memicu pemanggilan bab berikutnya saat mencapai akhir kertas
    const lastElementRef = useCallback((node: any) => {
        if (isFetching || !hasMore) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setNextChapter(prev => prev + 1);
            }
        });
        
        if (node) observer.current.observe(node);
    }, [isFetching, hasMore]);

    useEffect(() => {
        const fetchChapter = async () => {
            if (!ebookId || !hasMore) return;
            
            setIsFetching(true);
            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${nextChapter}`);
                const result = await res.json();
                
                if (res.status === 402) {
                    if (chapters.length === 0) setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro.");
                    setHasMore(false);
                    return;
                }

                if (result.success && result.data) {
                    setChapters(prev => {
                        // Mencegah duplikasi data jika di-render ulang
                        if (prev.some(c => c.chapter_number === result.data.chapter_number)) return prev;
                        return [...prev, result.data];
                    });
                } else {
                    setHasMore(false);
                }
            } catch (e) {
                if (chapters.length === 0) setErrorMsg("Terjadi kesalahan koneksi saat memuat buku.");
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setIsFetching(false);
            }
        };
        
        fetchChapter();
    }, [ebookId, nextChapter]);

    // 🔥 PARSER HIRARKI PINTAR: Merapikan format teks, otomatisasi judul tingkat tinggi, tebal, dan spasi
    const renderContent = (content: string) => {
        if (!content) return null;

        // Memisahkan teks berdasarkan baris baru bawaan database
        const lines = content.split('\n');

        return lines.map((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return <div key={index} className="h-3" />; // Jarak spasi paragraf ideal

            // Bersihkan sisa metadata Gutenberg yang lolos di database
            if (
                trimmedLine.toLowerCase().includes("gutenberg") || 
                trimmedLine.toLowerCase().includes("produced by") ||
                trimmedLine.toLowerCase().includes("release date") ||
                trimmedLine.toLowerCase().includes("tanggal rilis") ||
                trimmedLine.toLowerCase().includes("terakhir diperbarui") ||
                trimmedLine.toLowerCase().includes("kredit :") ||
                trimmedLine.toLowerCase().includes("bahasa :")
            ) {
                return null; 
            }

            // 1. HIRARKI TINGKAT 1: BUKU UTAMA / BAGIAN BESAR (Center & Sangat Besar)
            // Mendeteksi pola: "BUKU I.", "BUKU II", "BOOK ONE", "PART 1", dsb.
            const isMainBook = /^(buku|book|part|volume)\s+([ivx0-9]+|one|two|three|four|five)\b/i.test(trimmedLine);

            if (isMainBook) {
                return (
                    <h2 
                        key={index} 
                        className="text-base md:text-lg font-black text-slate-900 tracking-tight mt-8 mb-4 text-center block uppercase font-serif border-b-2 border-slate-800 pb-2 leading-snug"
                    >
                        {trimmedLine}
                    </h2>
                );
            }

            // 2. HIRARKI TINGKAT 2: BAB / CHAPTER UTAMA (Tebal & Rata Kiri-Kanan/Kiri)
            // Mendeteksi pola: "BAB I.", "CHAPTER IV", "BAB 1", "BAB XI."
            const isChapter = /^(bab|chapter|section)\s+([ivx0-9]+)\b/i.test(trimmedLine);

            if (isChapter) {
                return (
                    <h3 
                        key={index} 
                        className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight mt-6 mb-3 block uppercase font-serif border-b border-slate-300 pb-1.5 text-left leading-normal"
                    >
                        {trimmedLine}
                    </h3>
                );
            }

            // 3. HIRARKI TINGKAT 3: SUB-BAB / PENGANTAR (Miring & Semi-bold)
            // Mendeteksi kata transisi kunci, atau baris pendek (< 75 karakter) bertipe kapital awal tanpa diakhiri titik
            const isSubChapter = /^(prakata|pendahuluan|intro|kesimpulan|daftar isi|rencana pekerjaan)\b/i.test(trimmedLine) || 
                                 (trimmedLine.length < 75 && /^[A-Z]/.test(trimmedLine) && !trimmedLine.endsWith('.'));

            if (isSubChapter) {
                return (
                    <h4 
                        key={index} 
                        className="text-xs md:text-sm font-bold italic text-slate-700 mt-4 mb-2 block font-serif leading-normal"
                    >
                        {trimmedLine}
                    </h4>
                );
            }

            // 4. PARAGRAF BUKU STANDAR (Justify & Indentasi Masuk Khas Buku Cetak Resmi)
            return (
                <p 
                    key={index} 
                    className="text-slate-800 text-[11px] md:text-xs leading-relaxed text-justify mb-2.5 font-serif tracking-normal indent-6"
                >
                    {trimmedLine}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen bg-slate-400 flex flex-col font-sans select-none">
            {/* Header Navigasi */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-300 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setLocation("/academy")} className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">
                        <ChevronLeft className="w-4 h-4 text-slate-600" />
                    </button>
                    <div>
                        <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Bilano Academy Reader</p>
                        <h1 className="font-extrabold text-slate-900 text-xs line-clamp-1 max-w-[220px]">
                            {chapters.length > 0 ? chapters[0].title : "Memuat dokumen..."}
                        </h1>
                    </div>
                </div>
            </div>

            {/* AREA BACA UTAMA: Layout Kertas Cetak A5 Premium */}
            <div className="flex-1 flex flex-col items-center p-4 md:p-6 gap-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mb-3" />
                        <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Menyiapkan lembaran buku...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
                        <BookOpen className="w-12 h-12 text-rose-500 mb-4 opacity-40" />
                        <h2 className="text-base font-black text-slate-800 mb-1">Akses Terkunci</h2>
                        <p className="text-xs text-slate-600 max-w-[240px] leading-relaxed">{errorMsg}</p>
                        <button onClick={() => setLocation("/paywall")} className="mt-5 px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-full text-xs transition-transform active:scale-95 shadow-md shadow-amber-500/20">
                            Upgrade Ke Pro
                        </button>
                    </div>
                ) : (
                    <>
                        {chapters.map((chap, index) => {
                            const isLastElement = chapters.length === index + 1;
                            
                            return (
                                <div 
                                    key={chap.id || index}
                                    ref={isLastElement ? lastElementRef : null}
                                    // 🔥 INTEGRASI RASIO A5 MUTLAK: Lebar 560px, Tinggi 792px, lengkap dengan pembagian halaman otomatis internal
                                    className="bg-white shadow-2xl w-full max-w-[560px] min-h-[792px] max-h-[792px] overflow-y-auto px-8 py-10 md:px-12 md:py-12 rounded-sm border border-slate-200 relative transition-all duration-300 font-serif flex flex-col"
                                    style={{ contentVisibility: 'auto' }}
                                >
                                    {/* Judul Atas Halaman Buku (Running Header) */}
                                    <div className="w-full text-center border-b border-slate-100 pb-2 mb-4 text-[9px] text-slate-400 font-sans tracking-widest uppercase">
                                        {chapters.length > 0 ? chapters[0].title : "Bilano Academy"}
                                    </div>

                                    {/* Isi Konten Halaman */}
                                    <div className="tracking-normal text-black flex-1 select-text selection:bg-amber-100">
                                        {renderContent(chap.content)}
                                    </div>

                                    {/* Indikator Nomor Halaman Cetak di Bagian Bawah Kertas */}
                                    <div className="w-full text-center pt-4 mt-2 text-[10px] text-slate-400 font-sans tracking-wider border-t border-slate-50">
                                        Halaman {chap.chapter_number}
                                    </div>
                                </div>
                            );
                        })}
                        
                        {/* Status Loading di bawah saat auto-fetch halaman berikutnya */}
                        {isFetching && hasMore && (
                            <div className="py-4 flex flex-col items-center">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-500 mb-1.5" />
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Membuka lembar berikutnya...</p>
                            </div>
                        )}

                        {/* Indikator Buku Tamat */}
                        {!hasMore && chapters.length > 0 && (
                            <div className="py-8 text-slate-500 italic text-xs font-serif mt-2 w-full text-center max-w-[560px] tracking-wide">
                                • Akhir dari Koleksi Dokumen •
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}