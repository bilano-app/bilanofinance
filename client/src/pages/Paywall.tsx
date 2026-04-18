import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { CheckCircle2, Sparkles, Crown, ArrowRight, Loader2, X, ShieldCheck, CreditCard, ChevronRight, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedTrial, setHasStartedTrial] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("");

  const userEmail = localStorage.getItem("bilano_email") || "";
  const trialKey = `bilano_trial_start_${userEmail}`;
  const expiredKey = `bilano_trial_expired_${userEmail}`;

  useEffect(() => {
      if (localStorage.getItem(trialKey)) {
          setHasStartedTrial(true);
      }
      if (localStorage.getItem(expiredKey) === "true") {
          setIsExpired(true);
      }
  }, [trialKey, expiredKey]);

  const handleMulaiCoba = () => {
      if (!localStorage.getItem(trialKey)) {
          localStorage.setItem(trialKey, Date.now().toString());
      }
      window.location.href = "/";
  };

  const handleBukaModal = () => {
      setShowModal(true);
  };

  // 🚀 UPDATE: MENGGUNAKAN LINK MANUAL BOS (JENIUS & ANTI-ERROR)
  const handleLanjutBayar = () => {
      setIsProcessing(true);
      
      // Buka gembok di penyimpanan lokal sementara
      localStorage.setItem("bilano_pro", "true");
      localStorage.setItem(`bilano_trial_expired_${userEmail}`, "false");
      localStorage.setItem("bilano_trial_expired", "false");

      // Langsung arahkan ke Link Mayar Bos, ditambah email agar Auto-Fill!
      const mayarLink = `https://adrienfandra.myr.id/pl/langganan-bilano-pro-1-tahun?email=${encodeURIComponent(userEmail)}`;
      
      window.location.href = mayarLink;
  };

  const handleCloseIframe = () => {
      setIframeUrl("");
      toast({ title: "Mengecek Pembayaran...", description: "Status akun Anda sedang diperbarui." });
      setTimeout(() => window.location.href = "/", 1000);
  };

  return (
    <MobileLayout>
        {/* KANDANG IFRAME MIDTRANS */}
        {iframeUrl && (
            <div className="fixed inset-0 z-[999999] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className="h-14 bg-slate-900 flex items-center justify-between px-4 text-white shadow-md z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-sm tracking-wide">Kasir Pembayaran Aman</span>
                    </div>
                    <button onClick={handleCloseIframe} className="p-1.5 bg-white/10 hover:bg-rose-500 rounded-full transition-colors active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 w-full bg-slate-50 relative">
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                    <iframe src={iframeUrl} className="w-full h-full border-none relative z-10 bg-transparent" allow="payment" title="Midtrans Checkout" />
                </div>
            </div>
        )}

        <div className="min-h-screen bg-slate-900 text-white relative overflow-y-auto overflow-x-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {hasStartedTrial && !iframeUrl && (
                <button onClick={() => window.location.href = "/"} className="absolute top-6 right-6 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors shadow-lg">
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

                {/* 💳 KARTU HARGA */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-5 rounded-[24px] border border-indigo-400/30 shadow-2xl relative animate-in zoom-in-95 delay-300 mb-5">
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
                    <p className="text-[10px] text-indigo-300 flex items-center gap-1 font-medium">✨ Setara hanya Rp 8.250 / bulan.</p>
                </div>

                <button 
                    onClick={() => setShowVisionModal(true)}
                    className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 hover:border-amber-500/50 p-4 rounded-2xl mb-8 active:scale-95 transition-all text-left shadow-lg group relative overflow-hidden"
                >
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="bg-amber-400/10 p-2.5 rounded-full flex-shrink-0 border border-amber-400/20 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-white">Kenapa harga ini menguntungkan Anda?</p>
                            <p className="text-[10px] text-amber-400 font-bold mt-1 tracking-wider uppercase flex items-center gap-1">
                                Baca Penjelasannya <ArrowRight className="w-3 h-3" />
                            </p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-400 transition-colors relative z-10 shadow-inner">
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-950" />
                    </div>
                </button>

                <div className="w-full relative z-10 animate-in slide-in-from-bottom-8 delay-500">
                    <Button 
                        onClick={handleBukaModal} 
                        className={`w-full h-16 text-lg font-extrabold rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2 ${isExpired ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_30px_rgba(225,29,72,0.3)]' : 'bg-amber-400 hover:bg-amber-500 text-amber-950 shadow-[0_0_30px_rgba(251,191,36,0.3)]'}`}
                    >
                        <Sparkles className="w-5 h-5"/>
                        {isExpired ? "BUKA KUNCI AKSES" : "BERLANGGANAN SEKARANG"}
                    </Button>
                    
                    {!hasStartedTrial && (
                        <button onClick={handleMulaiCoba} className="w-full mt-4 h-12 text-slate-400 hover:text-white text-xs font-bold rounded-full transition-colors flex items-center justify-center gap-1">
                            Nanti Saja, Saya Mau Coba Gratis Dulu <ArrowRight className="w-4 h-4"/>
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* MODAL KONFIRMASI PEMBAYARAN */}
        {showModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Checkout Aman</h3>
                        </div>
                        <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-6 bg-slate-50/50">
                        <div className="text-center mb-8">
                            <p className="text-sm text-slate-500 font-medium mb-1">Total Tagihan Final</p>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Rp99.000</h2>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mt-3">
                                <Crown className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[11px] font-bold text-indigo-700">BILANO PRO (1 Tahun)</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <button onClick={handleLanjutBayar} disabled={isProcessing} className="w-full flex items-center justify-between p-4 border-2 border-indigo-200 hover:border-indigo-500 rounded-2xl transition-all active:scale-[0.98] group bg-white shadow-md shadow-indigo-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-indigo-700 transition-colors">
                                        <CreditCard className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-extrabold text-slate-800 text-sm">Lanjutkan Pembayaran</p>
                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">Semua Bank (QRIS, E-Wallet, VA, Gerai)</p>
                                    </div>
                                </div>
                                {isProcessing ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {showVisionModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-5 animate-in fade-in duration-200">
                <div className="bg-slate-900 w-full max-w-sm rounded-[28px] overflow-hidden shadow-2xl border border-slate-700 relative animate-in zoom-in-95">
                    
                    <button onClick={() => setShowVisionModal(false)} className="absolute top-4 right-4 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors z-10">
                        <X className="w-5 h-5" />
                    </button>
                    
                    <div className="p-6 pt-8 text-left relative">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="w-12 h-12 bg-amber-400/10 text-amber-400 rounded-full flex items-center justify-center mb-5 border border-amber-400/20">
                            <Lock className="w-6 h-6" />
                        </div>
                        
                        <h3 className="text-xl font-black text-white mb-3 tracking-tight">Garansi Harga Tetap</h3>
                        
                        <p className="text-[13px] text-slate-300 leading-relaxed mb-8">
                            Aplikasi BILANO akan terus mengadakan update, <b>merilis kumpulan E-Book Premium</b> (mengandung edukasi untuk menghasilkan uang dan mengelola uang), serta fitur tambahan lainnya.<br/><br/>
                            Seiring bertambahnya fitur, harga langganan akan terus <b>NAIK</b> untuk pengguna baru. <span className="text-amber-400 font-bold">NAMUN, khusus Anda yang bergabung hari ini</span>, harga perpanjangan Anda tahun depan dan seterusnya akan <b>DIKUNCI SELAMANYA</b> di angka Rp 99.000. Anda mendapatkan semua update masa depan tanpa membayar lebih.
                        </p>
                        
                        <Button 
                            onClick={() => { setShowVisionModal(false); setShowModal(true); }} 
                            className="w-full py-4 rounded-full bg-amber-400 hover:bg-amber-500 text-amber-950 font-extrabold text-sm transition-all active:scale-95 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                        >
                            SAYA MENGERTI
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </MobileLayout>
  );
}