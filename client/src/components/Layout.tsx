import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
}

export function MobileLayout({ children, title, showBack = false }: LayoutProps) {
  return (
    // WRAPPER UTAMA: Kunci tinggi layar (h-screen) tapi konten boleh scroll
    <div className="h-screen bg-slate-50 text-foreground font-sans flex flex-col mx-auto max-w-md shadow-2xl border-x border-slate-200 overflow-hidden relative">
      
      {/* --- HEADER (LOGO TENGAH) --- */}
      <header className="shrink-0 h-16 bg-white/95 backdrop-blur-md border-b border-slate-100 flex items-center justify-center relative z-40 px-4">
        
        {/* Tombol Back (Hanya muncul di sub-halaman) */}
        {showBack && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Link href="/">
              <button className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600">
                <ArrowLeft className="h-6 w-6" />
              </button>
            </Link>
          </div>
        )}

        {/* LOGO TENGAH MUTLAK */}
        <div className="flex items-center justify-center">
           {title ? (
               <h1 className="font-bold text-lg text-slate-800">{title}</h1>
           ) : (
               <img 
                 src="/bilano_logo_horiz.png" 
                 alt="BILANO" 
                 className="h-9 w-auto object-contain" 
               />
           )}
        </div>
      </header>

      {/* --- CONTENT AREA --- */}
      {/* flex-1 & overflow-y-auto: Agar konten mengisi sisa ruang & bisa discroll jika panjang */}
      <main className="flex-1 overflow-y-auto scrollbar-hide p-5 pb-8 relative">
        {children}
      </main>
      
    </div>
  );
}