import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { CheckCircle2, Sparkles, Crown, ArrowRight, Loader2, X } from "lucide-react";

export default function Paywall() {
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartedTrial, setHasStartedTrial] = useState(false);

  // Kunci spesifik per email agar tidak bocor ke akun testing lain
  const userEmail = localStorage.getItem("bilano_email") || "";
  const trialKey = `bilano_trial_start_${userEmail}`;

  useEffect(() => {
      if (localStorage.getItem(trialKey)) {
          setHasStartedTrial(true);
      }
  }, [trialKey]);

  const handleMulaiCoba = () => {
      if (!localStorage.getItem(trialKey)) {
          localStorage.setItem(trialKey, Date.now().toString());
      }
      window.location.href = "/";
  };

  const handleBerlangganan = () => {
      setIsLoading(true);
      const mayarLink = "https://adrienfandra.myr.id/pl/langganan-bilano-pro-1-tahun"; 
      setTimeout(() => { window.location.href = mayarLink; }, 800);
  };

  return (
    <MobileLayout>
        <div className="min-h-screen bg-slate-900 text-white relative overflow-y-auto overflow-x-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* TOMBOL CLOSE (X) - HANYA MUNCUL JIKA SUDAH PERNAH TRIAL */}
            {hasStartedTrial && (
                <button 
                    onClick={() => window.location.href = "/"}
                    className="absolute top-6 right-6 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors shadow-lg"
                >
                    <X className="w-5 h-5 text-white opacity-90" />
                </button>
            )}

            <div className={`px-6 relative z-10 flex flex-col pb-12 ${hasStartedTrial ? 'pt-8' : 'pt-12'}`}>
                
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest text-amber-400 mb-4 backdrop-blur-md self-start">
                    <Crown className="w-3.5 h-3.5" /> Akses Eksklusif
                </div>
                
                <h1 className="text-3xl font-extrabold leading-tight mb-3">
                    Buka Potensi Penuh <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-500">BILANO PRO</span>
                </h1>
                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8 pr-4">
                    Catat lebih cepat, analisa lebih tajam, dan capai target keuanganmu tanpa batas.
                </p>

                <div className="space-y-4 mb-8">
                    {[
                        { title: "Tanya AI Assistant 24/7", desc: "Konsultasi keuangan cerdas tanpa batas kuota harian." },
                        { title: "Tracking Investasi Terpadu", desc: "Pantau portofolio saham, crypto, reksadana, hingga emas." },
                        { title: "Cetak PDF Premium", desc: "Export mutasi dan kekayaan bersih ala Bank Statement." },
                        { title: "Multi-Currency (Valas) Live", desc: "Pantau aset mata uang asing dengan kurs real-time." },
                        { title: "Scan Struk Otomatis", desc: "Tidak perlu ketik manual, cukup foto struk belanja." }
                    ].map((feature, idx) => (
                        <div key={idx} className="flex gap-4 items-start animate-in slide-in-from-bottom-4" style={{ animationDelay: `${idx * 100}ms` }}>
                            <div className="bg-white/10 p-1.5 rounded-full text-amber-400 mt-0.5">
                                <CheckCircle2 className="w-4 h-4"/>
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm text-white">{feature.title}</h3>
                                <p className="text-[11px] text-slate-400 mt-0.5">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-5 rounded-[24px] border border-indigo-400/30 shadow-2xl relative animate-in zoom-in-95 delay-300 mb-6">
                    <div className="absolute -top-3 right-4 bg-amber-400 text-amber-950 text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">
                        Penawaran Spesial
                    </div>
                    <p className="text-indigo-200 text-xs font-bold mb-1">Paket Tahunan BILANO PRO</p>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-indigo-300 line-through decoration-rose-500 decoration-2">Rp 249.000</span>
                        <span className="text-[9px] bg-rose-500 text-white px-2 py-0.5 rounded-full font-extrabold animate-pulse tracking-wider">HEMAT 60%</span>
                    </div>
                    <div className="flex items-end gap-1 mb-2">
                        <span className="text-4xl font-extrabold drop-shadow-md text-white">Rp 99.000</span>
                        <span className="text-xs text-indigo-200 font-medium mb-1.5">/ tahun</span>
                    </div>
                    <p className="text-[10px] text-indigo-300 flex items-center gap-1 font-medium">✨ Setara hanya Rp 8.250 / bulan. Aman didukung Mayar.id</p>
                </div>

                <div className="w-full relative z-10 animate-in slide-in-from-bottom-8 delay-500">
                    <Button 
                        onClick={handleBerlangganan} 
                        disabled={isLoading}
                        className="w-full h-16 bg-amber-400 hover:bg-amber-500 text-amber-950 text-lg font-extrabold rounded-full shadow-[0_0_30px_rgba(251,191,36,0.3)] active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5"/>}
                        {isLoading ? "Menyiapkan..." : "BERLANGGANAN SEKARANG"}
                    </Button>
                    
                    {/* TOMBOL "COBA DULU" HANYA MUNCUL JIKA BELUM PERNAH TRIAL */}
                    {!hasStartedTrial && (
                        <button onClick={handleMulaiCoba} className="w-full mt-4 h-12 text-slate-400 hover:text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1">
                            Nanti Saja, Saya Mau Coba Gratis Dulu <ArrowRight className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>
    </MobileLayout>
  );
}