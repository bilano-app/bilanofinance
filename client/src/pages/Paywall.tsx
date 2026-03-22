import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { CheckCircle2, Sparkles, Crown, ArrowRight, Loader2, X, ShieldCheck, CreditCard, Gift, BookOpen, AlertCircle, ChevronRight, Target, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedTrial, setHasStartedTrial] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const [showModal, setShowModal] = useState(false);
  
  // 🚀 STATE BARU UNTUK KANDANG LAYAR PENUH (VISION MODAL)
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

  const handleLanjutBayar = async () => {
      setIsProcessing(true);
      try {
          const res = await fetch("/api/payment/midtrans/charge", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": userEmail }
          });

          const data = await res.json();

          if (res.ok && data.redirectUrl) {
              // Bypass lokal
              localStorage.setItem("bilano_pro", "true");
              localStorage.setItem(`bilano_trial_expired_${userEmail}`, "false");
              localStorage.setItem("bilano_trial_expired", "false");

              setIframeUrl(data.redirectUrl);
              setShowModal(false); 
          } else {
              alert("⚠️ GAGAL MEMUAT KASIR:\n" + (data.error || "Sistem Bank Sibuk."));
          }
      } catch (error: any) {
          alert("⚠️ KONEKSI TERPUTUS:\n" + error.message);
      } finally {
          setIsProcessing(false);
      }
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

                {/* 💳 KARTU HARGA (CONTEK DARI POSTER) */}
                <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 rounded-[28px] border border-indigo-500 shadow-2xl relative animate-in zoom-in-95 delay-300 mb-5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-10 -mt-10"></div>
                    <div className="absolute -top-3 right-4 bg-amber-400 text-amber-950 text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-md z-10">
                        Penawaran Spesial
                    </div>
                    <p className="text-indigo-200 text-xs font-bold mb-1 relative z-10">Paket Tahunan BILANO PRO</p>
                    <div className="flex items-center gap-2 mb-1.5 relative z-10">
                        <span className="text-sm font-bold text-indigo-300 line-through decoration-rose-500 decoration-2">Rp 249.000</span>
                        <span className="text-[9px] bg-rose-500 text-white px-2.5 py-1 rounded-full font-extrabold animate-pulse tracking-wider">HEMAT 60%</span>
                    </div>
                    <div className="flex items-end gap-1.5 relative z-10">
                        <span className="text-5xl font-extrabold drop-shadow-md text-white font-display">Rp 99.000</span>
                        <span className="text-xs text-indigo-100 font-medium mb-1.5">/ tahun</span>
                    </div>
                    <p className="text-[10px] text-emerald-200 flex items-center gap-1.5 font-bold mt-3 bg-emerald-950/40 p-2.5 rounded-lg relative z-10 border border-emerald-500/20">✨ Setara hanya Rp 8.250 / bulan.</p>
                </div>

                {/* ========================================================= */}
                {/* 🚀 PEMICU BARU (DI BAWAH HARGA, STYLE INDIGO PREDIKSI TAP) */}
                {/* ========================================================= */}
                <button 
                    onClick={() => setShowVisionModal(true)}
                    className="w-full flex items-center justify-between bg-slate-800 hover:bg-slate-700 border border-slate-700 p-4 rounded-2xl mb-8 self-start active:scale-95 transition-all shadow-lg text-left"
                >
                    <div className="flex items-center gap-3.5">
                        <div className="bg-amber-400/10 p-2.5 rounded-xl border border-amber-500/20 flex-shrink-0">
                            <TrendingUp className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-white">Inilah Kenapa Gabung Sekarang Adalah Keputusan Cerdas</p>
                            <p className="text-[11px] text-slate-300 font-medium mt-0.5 leading-relaxed">Amankan Harga Tetap Selamanya & Bonus E-Book Premium.</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 flex-shrink-0 ml-3" />
                </button>
                {/* ========================================================= */}

                <div className="w-full relative z-10 animate-in slide-in-from-bottom-8 delay-500">
                    <Button 
                        onClick={handleBukaModal} 
                        className={`w-full h-16 text-lg font-extrabold rounded-full active:scale-95 transition-transform flex items-center justify-center gap-2 ${isExpired ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-[0_0_30px_rgba(225,29,72,0.3)]' : 'bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 shadow-[0_0_30px_rgba(251,191,36,0.3)]'}`}
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
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
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

        {/* ========================================================= */}
        {/* 🚀 KANDANG LAYAR PENUH (FULL-SCREEN MOBILE VISION MODAL) */}
        {/* ========================================================= */}
        {showVisionModal && (
            <div className="fixed inset-0 z-[999999] bg-slate-950 flex flex-col animate-in slide-in-from-bottom duration-300 overflow-hidden text-white">
                
                {/* Header Custom */}
                <div className="h-16 bg-slate-900 flex items-center justify-between px-5 text-white shadow-md z-10 shrink-0 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                        <Gift className="w-5 h-5 text-amber-400" />
                        <span className="font-extrabold text-base tracking-tight">Investasi Anda Aman</span>
                    </div>
                    <button onClick={() => setShowVisionModal(false)} className="p-2 bg-white/10 hover:bg-rose-500 rounded-full transition-colors active:scale-95">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Teks Penjelasan (Full Screen Scrollable) */}
                <div className="flex-1 w-full bg-slate-950 relative overflow-y-auto custom-scrollbar p-6 pt-8 pb-24">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <h2 className="text-2xl font-black text-white mb-3 tracking-tighter leading-snug relative z-10">Keuntungan Eksklusif <br/>Pengguna Awal BILANO PRO</h2>
                    <p className="text-sm text-slate-400 mb-10 leading-relaxed font-medium relative z-10">Berikut adalah alasan kenapa bergabung sekarang adalah keputusan finansial terbaik Anda.</p>
                    
                    <div className="space-y-8 relative z-10">
                        {[
                            { icon: Sparkles, title: "Update Fitur Berkelanjutan", desc: "Akses gratis selamanya ke semua inovasi analisa AI terbaru & alat pelacak aset canggih di masa depan." },
                            { icon: BookOpen, title: "Segera Hadir: E-Book Premium ALA Bank Statement!", desc: "Dapatkan seri E-Book eksklusif 'Mastering Money'. Panduan taktis menghasilkan, mengelola, & menabung uang ala PRO." },
                            { icon: AlertCircle, title: "Garansi Harga Tetap Selamanya", desc: "Seiring bertambahnya fitur, harga untuk pengguna baru akan terus naik. Namun, sebagai pengguna hari ini, harga perpanjangan Anda dikunci di Rp 99rb selamanya (tidak akan naik)." }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 mt-1 flex-shrink-0">
                                    <item.icon className="w-5 h-5 text-indigo-300" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm text-white">{item.title}</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sticky Button di Bawah */}
                <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-10 z-20">
                    <Button 
                        onClick={() => { setShowVisionModal(false); setShowModal(true); }} 
                        className="w-full h-15 text-base font-extrabold rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-amber-950 shadow-[0_0_30px_rgba(251,191,36,0.3)] active:scale-95 transition-transform"
                    >
                        Paham, Saya Ambil Penawaran Ini!
                    </Button>
                </div>
            </div>
        )}
        {/* ========================================================= */}
    </MobileLayout>
  );
}