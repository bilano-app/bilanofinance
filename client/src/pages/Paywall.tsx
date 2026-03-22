import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { CheckCircle2, Sparkles, Crown, ArrowRight, Loader2, X, ShieldCheck, CreditCard, Gift, BookOpen, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasStartedTrial, setHasStartedTrial] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const [showModal, setShowModal] = useState(false);
  
  // 🚀 STATE BARU UNTUK MENAMPILKAN KOTAK KEBERUNTUNGAN
  const [showLuckyModal, setShowLuckyModal] = useState(false);
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
          // 🚀 HARGA DI SINI MASIH HARDCODED 99RB SESUAI routes.ts
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
        {iframeUrl && (
            <div className="fixed inset-0 z-[999999] bg-slate-50 flex flex-col animate-in slide-in-from-bottom duration-300">
                <div className="h-14 bg-slate-900 flex items-center justify-between px-4 text-white shadow-md z-10 shrink-0">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                        <span className="font-bold text-sm tracking-wide">Kasir Pembayaran Aman</span>
                    </div>
                    <button 
                        onClick={handleCloseIframe}
                        className="p-1.5 bg-white/10 hover:bg-rose-500 rounded-full transition-colors active:scale-95"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 w-full bg-slate-50 relative">
                    <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                    <iframe 
                        src={iframeUrl} 
                        className="w-full h-full border-none relative z-10 bg-transparent"
                        allow="payment"
                        title="Midtrans Checkout"
                    />
                </div>
            </div>
        )}

        <div className="min-h-screen bg-slate-900 text-white relative overflow-y-auto overflow-x-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {hasStartedTrial && !iframeUrl && (
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
                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6 pr-4">
                    Catat lebih cepat, analisa lebih tajam, dan capai target keuanganmu tanpa batas.
                </p>

                {/* ========================================================= */}
                {/* 🚀 TOMBOL PEMICU KOTAK KEBERUNTUNGAN (ANTI-RUGI)          */}
                {/* ========================================================= */}
                <button 
                    onClick={() => setShowLuckyModal(true)}
                    className="flex items-center gap-3 bg-gradient-to-r from-emerald-950 to-slate-800 p-4 rounded-2xl border border-emerald-500/30 mb-8 self-start active:scale-95 transition-transform shadow-lg"
                >
                    <div className="bg-emerald-500/20 p-2.5 rounded-full border border-emerald-500/50">
                        <Gift className="w-5 h-5 text-emerald-300 animate-pulse" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-extrabold text-white">Kenapa Bergabung Hari Ini Adalah Keputusan Terbaik?</p>
                        <p className="text-[11px] text-emerald-200 font-bold mt-0.5">💡 Lihat Garansi Harga Tetap & Bonus Eksklusif Anda di Sini.</p>
                    </div>
                </button>
                {/* ========================================================= */}

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
                    <p className="text-[10px] text-indigo-300 flex items-center gap-1 font-medium">✨ Setara hanya Rp 8.250 / bulan.</p>
                </div>

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
                            <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-center">Terima Semua Pembayaran</p>
                            
                            <button
                                onClick={handleLanjutBayar}
                                disabled={isProcessing}
                                className="w-full flex items-center justify-between p-4 border-2 border-indigo-200 hover:border-indigo-500 rounded-2xl transition-all active:scale-[0.98] group bg-white shadow-md shadow-indigo-100"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-inner group-hover:bg-indigo-700 transition-colors">
                                        <CreditCard className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-extrabold text-slate-800 text-sm">Lanjutkan Pembayaran</p>
                                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">BCA, Mandiri, QRIS, GoPay, DANA, Alfamart</p>
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
        {/* 🚀 KOTAK KEBERUNTUNGAN (MODAL PENJELASAN PRICE LOCK)       */}
        {/* ========================================================= */}
        {showLuckyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-5 animate-in fade-in duration-300">
                <div className="bg-slate-900 w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 border border-emerald-500/20 relative">
                    
                    <button onClick={() => setShowLuckyModal(false)} className="absolute top-5 right-5 z-20 p-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full transition-colors">
                        <X className="w-4 h-4" />
                    </button>

                    <div className="relative p-7 pb-5">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
                        <Gift className="w-12 h-12 text-emerald-400 mb-5 relative z-10"/>
                        <h2 className="text-2xl font-extrabold text-white mb-2 relative z-10 leading-snug">Visi Kami & Garansi <br/>Investasi Finansial Anda</h2>
                        <p className="text-xs text-slate-400 font-medium relative z-10 leading-relaxed">Bergabung hari ini bukan sekadar berlangganan, tapi mengunci nilai terbaik untuk masa depan keuangan Anda.</p>
                    </div>

                    <div className="p-7 pt-2 space-y-6">
                        {[
                            { icon: Sparkles, color: 'emerald', title: "Inovasi & Update Fitur Tanpa Henti", desc: "Kami berkomitmen terus memperbarui BILANO PRO dengan analisa AI yang lebih cerdas, alat pelacak aset terbaru, dan integrasi bank yang lebih luas di masa mendatang." },
                            { icon: BookOpen, color: 'blue', title: "Segera Hadir: E-Book Premium!", desc: "Dapatkan seri E-Book eksklusif 'Mastering Money' bergaya ALA Bank Statement. Panduan praktis cara menghasilkan uang tambahan, mengelola hutang, hingga strategi investasi untuk pemula." },
                            { icon: AlertCircle, color: 'amber', title: "Kebijakan Garansi Harga (Price Lock)", desc: "Seiring bertambahnya fitur, harga BILANO PRO untuk pengguna baru akan terus NAIK di masa mendatang. NAMUN, sebagai pengguna hari ini, harga perpanjangan Anda tahun depan dan seterusnya TETAP SAMA (tidak akan naik). Nikmati semua update selamanya tanpa biaya tambahan." }
                        ].map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-start">
                                <div className={`p-2.5 rounded-full bg-${item.color}-500/10 border border-${item.color}-500/30 flex-shrink-0 mt-1`}>
                                    <item.icon className={`w-5 h-5 text-${item.color}-300`} />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-sm text-white">{item.title}</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-7 pt-0">
                        <Button 
                            onClick={() => { setShowLuckyModal(false); setShowModal(true); }} 
                            className="w-full h-14 text-base font-extrabold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] active:scale-95 transition-transform"
                        >
                            Saya Paham, Ambil Penawaran Ini!
                        </Button>
                    </div>
                </div>
            </div>
        )}
        {/* ========================================================= */}
    </MobileLayout>
  );
}