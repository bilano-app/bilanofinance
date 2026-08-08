import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, BookOpen, Lock, Star, Search, Crown } from "lucide-react";
import { MobileLayout } from "@/components/Layout"; // Asumsi Anda punya komponen ini
import { useUser } from "@/hooks/use-finance"; 

export default function AcademyList() {
    const [, setLocation] = useLocation();
    const { data: user } = useUser();
    const [ebooks, setEbooks] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Fetch data dari API Backend yang sudah kita buat sebelumnya
    useEffect(() => {
        const fetchEbooks = async () => {
            try {
                const res = await fetch("/api/ebooks");
                const result = await res.json();
                if (result.success) setEbooks(result.data);
            } catch (e) {
                console.error("Gagal memuat ebook:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEbooks();
    }, []);

    const filteredEbooks = ebooks.filter(book => 
        book.title.toLowerCase().includes(search.toLowerCase()) || 
        book.author.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0B0F19] text-slate-200 flex flex-col font-sans">
            {/* Header VIP */}
            <div className="sticky top-0 z-50 bg-[#0B0F19]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <button onClick={() => setLocation("/")} className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded-full transition-colors">
                        <ChevronLeft className="w-5 h-5 text-slate-300" />
                    </button>
                    <div>
                        <h1 className="font-black text-white text-lg tracking-tight flex items-center gap-2">
                            BILANO Academy
                        </h1>
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Premium Library</p>
                    </div>
                </div>
                {user?.isPro ? (
                    <div className="bg-amber-500/20 p-2 rounded-full border border-amber-500/30">
                        <Crown className="w-5 h-5 text-amber-400" />
                    </div>
                ) : null}
            </div>

            {/* Search Bar */}
            <div className="px-4 mt-6">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-1 flex items-center">
                    <div className="pl-4 text-slate-400"><Search className="w-5 h-5" /></div>
                    <input 
                        type="text" 
                        placeholder="Cari e-book ekonomi, investasi..."
                        className="w-full bg-transparent text-sm text-white px-3 py-3 outline-none placeholder:text-slate-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* List Katalog */}
            <div className="px-4 py-6 flex flex-col gap-4">
                {isLoading ? (
                    <div className="text-center py-10 text-slate-500 text-sm">Memuat koleksi buku...</div>
                ) : filteredEbooks.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">E-book tidak ditemukan.</div>
                ) : (
                    filteredEbooks.map((book) => (
                        <Link key={book.id} href={`/academy/${book.id}/read`}>
                            <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-2xl border border-slate-700 flex gap-4 cursor-pointer active:scale-[0.98] transition-transform relative overflow-hidden group">
                                {/* Cover Placeholder */}
                                <div className="w-20 h-28 bg-slate-800 rounded-lg shrink-0 border border-slate-700 flex flex-col items-center justify-center overflow-hidden relative shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
                                    {book.coverUrl ? (
                                        <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <BookOpen className="w-8 h-8 text-slate-600 mb-2" />
                                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-black/60"></div>
                                        </>
                                    )}
                                </div>

                                {/* Info E-Book */}
                                <div className="flex flex-col justify-center flex-1">
                                    {book.isPremium && (
                                        <span className="bg-amber-500/10 text-amber-400 text-[9px] font-black px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider w-max mb-1.5 flex items-center gap-1">
                                            <Star className="w-2.5 h-2.5 fill-amber-400" /> Premium
                                        </span>
                                    )}
                                    <h3 className="font-extrabold text-white text-sm line-clamp-2 leading-tight mb-1 group-hover:text-amber-400 transition-colors">{book.title}</h3>
                                    <p className="text-[11px] text-slate-400 mb-2">{book.author}</p>
                                    
                                    <div className="mt-auto flex items-center justify-between">
                                        <p className="text-[10px] text-slate-500 line-clamp-1 flex-1 pr-2">{book.description}</p>
                                        {/* Gembok jika buku premium dan user belum bayar */}
                                        {book.isPremium && !user?.isPro && (
                                            <Lock className="w-4 h-4 text-rose-500 shrink-0" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}