import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, BookOpen, Loader2 } from "lucide-react";

export default function AcademyReader() {
    const [, setLocation] = useLocation();
    const [, params] = useRoute("/academy/:ebookId/read/:chapterNum");
    
    const ebookId = params?.ebookId;
    const initialChapterNum = parseInt(params?.chapterNum || "1");

    const [chapters, setChapters] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    
    const [nextChapterNum, setNextChapterNum] = useState(initialChapterNum);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const observer = useRef<IntersectionObserver | null>(null);

    // 🔥 INFINITE SCROLL: Memicu pemuatan bab berikutnya saat di-scroll ke paling bawah
    const lastChapterRef = useCallback((node: HTMLDivElement | null) => {
        if (isFetchingMore || !hasMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setNextChapterNum((prev) => prev + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [isFetchingMore, hasMore]);

    // Fetch Bab dari API
    useEffect(() => {
        const fetchChapter = async () => {
            if (!ebookId || !hasMore) return;

            if (chapters.length === 0) {
                setIsLoading(true);
            } else {
                setIsFetchingMore(true);
            }

            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${nextChapterNum}`);
                
                if (res.status === 402) {
                    if (chapters.length === 0) setErrorMsg("Akses Premium Diperlukan. Silakan upgrade ke Bilano Pro.");
                    setHasMore(false);
                    return;
                }

                const result = await res.json();

                if (result.success && result.data) {
                    setChapters((prev) => {
                        if (prev.some((c) => c.chapter_number === result.data.chapter_number)) {
                            return prev;
                        }
                        return [...prev, result.data];
                    });
                } else {
                    setHasMore(false);
                }
            } catch (err) {
                if (chapters.length === 0) setErrorMsg("Gagal memuat dokumen e-book.");
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setIsFetchingMore(false);
            }
        };

        fetchChapter();
    }, [ebookId, nextChapterNum]);

    // Parser Teks & Typography
    const renderContent = (content: string) => {
        if (!content) return null;

        // Otomatis hapus tanda bintang (**) jika ada sisa markdown
        const cleanContent = content.replace(/\*\*/g, '');
        const lines = cleanContent.split('\n');

        return lines.map((line, index) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={index} className="h-3" />;

            // Filter metadata Gutenberg
            const lower = trimmed.toLowerCase();
            if (
                lower.includes("gutenberg") ||
                lower.includes("produced by") ||
                lower.includes("release date") ||
                lower.includes("tanggal rilis") ||
                lower.includes("terakhir diperbarui") ||
                lower.includes("kredit :") ||
                lower.includes("bahasa :")
            ) {
                return null;
            }

            // 1. Judul Utama / Book
            const isMainBook = /^(buku|book|part|volume)\s+([ivx0-9]+|one|two|three|four|five)\b/i.test(trimmed);
            if (isMainBook) {
                return (
                    <h2
                        key={index}
                        className="text-base md:text-lg font-black text-slate-900 tracking-tight mt-6 mb-4 text-center block uppercase font-serif border-b-2 border-slate-800 pb-2 leading-snug"
                    >
                        {trimmed}
                    </h2>
                );
            }

            // 2. Bab / Chapter
            const isChapter = /^(bab|chapter|section)\s+([ivx0-9]+)\b/i.test(trimmed);
            if (isChapter) {
                return (
                    <h3
                        key={index}
                        className="text-sm md:text-base font-extrabold text-slate-800 tracking-tight mt-5 mb-3 block uppercase font-serif border-b border-slate-300 pb-1 text-left leading-normal"
                    >
                        {trimmed}
                    </h3>
                );
            }

            // 3. Sub-bab / Pengantar
            const isSubChapter = /^(prakata|pendahuluan|intro|kesimpulan|daftar isi|rencana pekerjaan)\b/i.test(trimmed) ||
                (trimmed.length < 75 && /^[A-Z]/.test(trimmed) && !trimmed.endsWith('.'));

            if (isSubChapter) {
                return (
                    <h4
                        key={index}
                        className="text-xs md:text-sm font-bold italic text-slate-700 mt-4 mb-2 block font-serif leading-normal"
                    >
                        {trimmed}
                    </h4>
                );
            }

            // 4. Paragraf Standar
            return (
                <p
                    key={index}
                    className="text-slate-800 text-xs md:text-sm leading-relaxed text-justify mb-3 font-serif tracking-normal indent-6"
                >
                    {trimmed}
                </p>
            );
        });
    };

    return (
        <div className="min-h-screen bg-slate-400 flex flex-col font-sans select-none">
            {/* Header Sticky Atas */}
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shadow-md">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setLocation("/academy")}
                        className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-300"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                        <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy Reader</p>
                        <h1 className="font-bold text-xs line-clamp-1 max-w-[220px] text-slate-100">
                            {chapters.length > 0 ? chapters[0].title : "Memuat E-Book..."}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Container Scroll Utama (Vertikal Ke Bawah) */}
            <div className="flex-1 flex flex-col items-center p-3 md:p-6 gap-6">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-800">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-700 mb-3" />
                        <p className="text-xs font-semibold uppercase tracking-wider">Menyiapkan dokumen...</p>
                    </div>
                ) : errorMsg ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-2xl p-6 max-w-sm shadow-2xl my-auto">
                        <BookOpen className="w-12 h-12 text-rose-500 mb-3 opacity-60" />
                        <h2 className="text-base font-black text-slate-800 mb-1">Akses Terkunci</h2>
                        <p className="text-xs text-slate-600 mb-4">{errorMsg}</p>
                        <button
                            onClick={() => setLocation("/paywall")}
                            className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-full text-xs transition-transform active:scale-95 shadow-md"
                        >
                            Upgrade Ke Pro
                        </button>
                    </div>
                ) : (
                    <>
                        {chapters.map((chap, index) => {
                            const isLast = index === chapters.length - 1;

                            return (
                                <div
                                    key={chap.id || index}
                                    ref={isLast ? lastChapterRef : null}
                                    /* WADAH KERTAS A5 FISIK (Scroll Vertikal Mulus) */
                                    className="bg-[#FFFDF9] shadow-xl w-full max-w-[450px] min-h-[620px] h-auto p-6 md:p-8 rounded-sm border border-stone-300 relative font-serif flex flex-col justify-between"
                                >
                                    {/* Running Header Kertas */}
                                    <div className="w-full text-center border-b border-stone-200/70 pb-2 mb-4 text-[9px] text-stone-400 font-sans tracking-widest uppercase line-clamp-1">
                                        {chapters[0]?.title || "Bilano Academy"}
                                    </div>

                                    {/* Konten Utama */}
                                    <div className="flex-1 select-text">
                                        {renderContent(chap.content)}
                                    </div>

                                    {/* Footer Bab Kertas */}
                                    <div className="w-full text-center pt-3 mt-6 text-[9px] text-stone-400 font-sans tracking-widest border-t border-stone-200/70">
                                        — BAGIAN {chap.chapter_number} —
                                    </div>
                                </div>
                            );
                        })}

                        {/* Indikator Loading Saat Membaca Ke Bawah */}
                        {isFetchingMore && hasMore && (
                            <div className="py-4 flex flex-col items-center">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-700 mb-1.5" />
                                <p className="text-[10px] text-slate-700 font-bold uppercase tracking-widest">Membuka lembar berikutnya...</p>
                            </div>
                        )}

                        {/* Akhir Dokumen */}
                        {!hasMore && chapters.length > 0 && (
                            <div className="py-8 text-slate-600 italic text-xs font-serif text-center max-w-[450px] tracking-wide">
                                • Akhir dari Dokumen •
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}