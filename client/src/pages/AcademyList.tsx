import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { BookOpen, Lock, Loader2, ChevronRight, TrendingUp } from "lucide-react";

// Definisi Tipe Data Buku
interface Ebook {
    id: number;
    title: string;
    author: string;
    description: string;
    is_premium: boolean;
    cover_url?: string; // Menangkap cover dari database
}

export default function AcademyList() {
    const [, setLocation] = useLocation();
    const [ebooks, setEbooks] = useState<Ebook[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchEbooks = async () => {
            try {
                const response = await fetch("/api/ebooks");
                const result = await response.json();
                if (result.success) {
                    setEbooks(result.data);
                }
            } catch (error) {
                console.error("Gagal mengambil data buku:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchEbooks();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header Mewah */}
            <div className="bg-slate-900 text-white pt-12 pb-20 px-6 rounded-b-[40px] shadow-lg">
                <div className="max-w-6xl mx-auto flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                        <TrendingUp className="w-6 h-6 text-slate-900" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Bilano Academy</h1>
                        <p className="text-slate-400 text-sm mt-1">Perpustakaan Eksklusif Ilmu Keuangan</p>
                    </div>
                </div>
            </div>

            {/* Kontainer Grid Buku */}
            <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-10">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
                        <p className="text-sm text-slate-500 font-medium">Memuat koleksi buku...</p>
                    </div>
                ) : ebooks.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-700">Belum Ada Buku</h3>
                        <p className="text-slate-500 text-sm">Koleksi buku sedang dalam proses unggah.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
                        {ebooks.map((ebook) => (
                            <div 
                                key={ebook.id}
                                onClick={() => setLocation(`/academy/${ebook.id}/read/1`)}
                                className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-slate-100 overflow-hidden"
                            >
                                {/* Wadah Cover Gambar (Rasio Buku Standar 2:3) */}
                                <div className="w-full aspect-[2/3] relative overflow-hidden bg-slate-200">
                                    {ebook.cover_url ? (
                                        <img 
                                            src={ebook.cover_url} 
                                            alt={ebook.title}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    ) : (
                                        // Fallback kalau cover_url kosong/gagal muat
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-slate-800 p-4">
                                            <span className="text-white font-serif font-bold text-center text-lg drop-shadow-md line-clamp-4">
                                                {ebook.title}
                                            </span>
                                        </div>
                                    )}

                                    {/* Overlay Gradient Hitam di bawah cover biar dramatis */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    {/* Badge Premium (Jika ada) */}
                                    {ebook.is_premium && (
                                        <div className="absolute top-3 right-3 bg-amber-500 text-slate-900 p-1.5 rounded-full shadow-lg">
                                            <Lock className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>

                                {/* Area Teks Info Buku */}
                                <div className="p-4 flex flex-col flex-grow">
                                    <h3 className="font-bold text-slate-800 text-sm md:text-base leading-tight line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">
                                        {ebook.title}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mb-3">
                                        {ebook.author}
                                    </p>
                                    
                                    {/* Tombol Aksi di Bawah (Mendorong ke bawah) */}
                                    <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                                        <span className="text-[11px] font-bold text-amber-500 tracking-wider uppercase">
                                            Baca Sekarang
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}