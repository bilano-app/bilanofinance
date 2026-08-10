import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

    // Infinite Scroll saat mencapai halaman akhir
    const lastPageRef = useCallback((node: HTMLDivElement | null) => {
        if (isFetchingMore || !hasMore) return;
        if (observer.current) observer.current.disconnect();

        observer.current = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                setNextChapterNum((prev) => prev + 1);
            }
        });

        if (node) observer.current.observe(node);
    }, [isFetchingMore, hasMore]);

    useEffect(() => {
        const fetchChapter = async () => {
            if (!ebookId || !hasMore) return;
            chapters.length === 0 ? setIsLoading(true) : setIsFetchingMore(true);

            try {
                const res = await fetch(`/api/ebooks/${ebookId}/chapters/${nextChapterNum}`);
                if (res.status === 402) {
                    if (chapters.length === 0) setErrorMsg("Akses Premium Diperlukan.");
                    setHasMore(false);
                    return;
                }
                const result = await res.json();
                if (result.success && result.data) {
                    setChapters((prev) => prev.some(c => c.chapter_number === result.data.chapter_number) ? prev : [...prev, result.data]);
                } else {
                    setHasMore(false);
                }
            } catch (err) {
                if (chapters.length === 0) setErrorMsg("Gagal memuat dokumen.");
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setIsFetchingMore(false);
            }
        };
        fetchChapter();
    }, [ebookId, nextChapterNum]);

    // 🔥 ALGORITMA PAGINASI PARAGRAF UTUH (MENCEGAH TEKS TERPOTONG & KELONGKAP)
    const pages = useMemo(() => {
        const MAX_CAPACITY = 850; // Kapasitas aman karakter per lembar A5
        const allPages: any[][] = [];
        let currentPage: any[] = [];
        let currentCapacity = 0;

        chapters.forEach((chap) => {
            // Memisah berdasarkan PARAGRAF UTUH (\n\n), bukan baris tunggal
            const rawParagraphs = chap.content.replace(/\*\*/g, '').split(/\n\s*\n/);

            rawParagraphs.forEach((paraStr: string) => {
                const trimmedPara = paraStr.trim();
                if (!trimmedPara) return;

                const lower = trimmedPara.toLowerCase();
                if (lower.includes("gutenberg") || lower.includes("produced by") || lower.includes("project gutenberg")) return;

                // Deteksi tipe judul / bab / paragraf
                const isMainBook = /^(buku|book|part|volume)\s+([ivx0-9]+|one|two|three|four|five)\b/i.test(trimmedPara);
                const isChapter = /^(bab|chapter|section)\s+([ivx0-9]+)\b/i.test(trimmedPara) || /^[IVXLCDM]+\.\s+/i.test(trimmedPara);
                const isHeading = isMainBook || isChapter || (trimmedPara.length < 80 && trimmedPara === trimmedPara.toUpperCase() && !trimmedPara.endsWith('.'));

                let weight = trimmedPara.length;
                if (isHeading) weight += 150;
                else weight += 40;

                if (currentCapacity + weight > MAX_CAPACITY && currentPage.length > 0) {
                    allPages.push(currentPage);
                    currentPage = [];
                    currentCapacity = 0;
                }

                currentPage.push({
                    text: trimmedPara,
                    isMainBook,
                    isChapter,
                    isHeading,
                    chapterTitle: chap.title,
                    chapterNum: chap.chapter_number
                });
                currentCapacity += weight;
            });
        });

        if (currentPage.length > 0) allPages.push(currentPage);
        return allPages;
    }, [chapters]);

    return (
        <div className="min-h-screen bg-slate-400 flex flex-col font-sans select-none">
            {/* Header Sticky Atas */}
            <div className="sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center gap-3 shadow-md">
                <button onClick={() => setLocation("/academy")} className="w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <div>
                    <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">Bilano Academy</p>
                    <h1 className="font-bold text-xs line-clamp-1">{chapters[0]?.title || "Memuat..."}</h1>
                </div>
            </div>

            {/* Container Lembaran Kertas A5 */}
            <div className="flex-1 flex flex-col items-center p-4 md:p-6 gap-6 md:gap-8">
                {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-slate-800 mt-20" />
                ) : errorMsg ? (
                    <div className="mt-20 p-6 bg-white rounded-xl text-center shadow-xl">
                        <BookOpen className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                        <p className="text-sm font-bold text-slate-700">{errorMsg}</p>
                    </div>
                ) : (
                    <>
                        {pages.map((pageContent, pageIdx) => {
                            const isLastPage = pageIdx === pages.length - 1;
                            const dominantChapterNum = pageContent[0]?.chapterNum;
                            const dominantChapterTitle = pageContent[0]?.chapterTitle || "Bilano Academy";

                            return (
                                <div
                                    key={`page-${pageIdx}`}
                                    ref={isLastPage ? lastPageRef : null}
                                    /* 🔥 DIMENSI KERTAS A5 DIKUNCI PRESISI */
                                    className="bg-[#FFFDF9] shadow-xl w-full max-w-[420px] h-[640px] p-6 md:p-7 rounded-sm border border-stone-300 flex flex-col justify-between font-serif relative overflow-hidden"
                                >
                                    {/* Running Header */}
                                    <div className="w-full text-center border-b border-stone-200 pb-2 text-[9px] text-stone-400 tracking-widest uppercase line-clamp-1">
                                        {dominantChapterTitle}
                                    </div>

                                    {/* Area Teks Paragraf */}
                                    <div className="flex-1 my-3 select-text overflow-hidden flex flex-col justify-start">
                                        {pageContent.map((item, idx) => {
                                            if (item.isMainBook) {
                                                return <h2 key={idx} className="text-base md:text-lg font-black text-slate-900 text-center uppercase font-serif mt-2 mb-3 border-b-2 border-slate-800 pb-1.5">{item.text}</h2>;
                                            }
                                            if (item.isHeading) {
                                                return <h3 key={idx} className="text-sm md:text-base font-extrabold text-slate-800 uppercase font-serif mt-2 mb-2 border-b border-slate-300 pb-1">{item.text}</h3>;
                                            }

                                            // Teks bermode daftar isi atau dengan line break
                                            if (item.text.includes('\n')) {
                                                return (
                                                    <div key={idx} className="my-2 text-[11px] text-slate-700 font-serif leading-relaxed pl-3 border-l-2 border-slate-300 bg-slate-50/50 py-1.5 px-2 rounded-r">
                                                        {item.text.split('\n').map((lineStr: string, i: number) => (
                                                            <div key={i}>{lineStr.trim()}</div>
                                                        ))}
                                                    </div>
                                                );
                                            }

                                            // Paragraf Utuh Biasa
                                            return <p key={idx} className="text-slate-800 text-[11px] md:text-xs leading-relaxed text-justify mb-2.5 font-serif indent-6">{item.text}</p>;
                                        })}
                                    </div>

                                    {/* Footer Kertas */}
                                    <div className="w-full flex justify-between pt-2 text-[9px] text-stone-400 tracking-widest border-t border-stone-200">
                                        <span>BAGIAN {dominantChapterNum}</span>
                                        <span>HAL {pageIdx + 1}</span>
                                    </div>
                                </div>
                            );
                        })}
                        
                        {isFetchingMore && <Loader2 className="w-5 h-5 animate-spin text-slate-700 my-4" />}
                        {!hasMore && chapters.length > 0 && <div className="py-8 text-slate-700 italic text-xs font-serif">• Akhir Dokumen •</div>}
                    </>
                )}
            </div>
        </div>
    );
}