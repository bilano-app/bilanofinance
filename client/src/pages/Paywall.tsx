import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { CheckCircle2, Sparkles, Crown, ArrowRight, Loader2, X, ShieldCheck, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [hasStartedTrial, setHasStartedTrial] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // === STATE UNTUK MODAL PEMBAYARAN CUSTOM ===
  const [showModal, setShowModal] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrUrl, setQrUrl] = useState("");

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

  const handleBerlangganan = () => {
      setShowModal(true);
      setQrUrl(""); // Reset barcode setiap kali modal dibuka
  };

  // === API CALL KE BACKEND KITA (CORE API MIDTRANS) ===
  const handleGenerateQR = async () => {
      setIsGeneratingQr(true);
      try {
          const res = await fetch("/api/payment/midtrans/charge", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": userEmail }
          });

          const data = await res.json();

          if (res.ok && data.qrUrl) {
              setQrUrl(data.qrUrl);
              toast({ title: "QRIS Dibuat!", description: "Silakan scan kode untuk menyelesaikan pembayaran." });
          } else {
              toast({ title: "Sistem Sibuk", description: data.error || "Gagal memuat QRIS.", variant: "destructive" });
          }
      } catch (error) {
          toast({ title: "Koneksi Terputus", description: "Gagal menyambung ke server pembayaran.", variant: "destructive" });
      } finally {
          setIsGeneratingQr(false);
      }
  };

  return (
    <MobileLayout>
        <div className="min-h-screen bg-slate-900 text-white relative overflow-y-auto overflow-x-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-1/4 left-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

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
                    <p className="text-[10px] text-indigo-300 flex items-center gap-1 font-medium">✨ Setara hanya Rp 8.250 / bulan.</p>
                </div>

                <div className="w-full relative z-10 animate-in slide-in-from-bottom-8 delay-500">
                    <Button 
                        onClick={handleBerlangganan} 
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

        {/* MODAL PEMBAYARAN CUSTOM UI */}
        {showModal && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
                    
                    {/* Header Modal */}
                    <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-500" />
                            <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">Checkout Aman</h3>
                        </div>
                        <button onClick={() => setShowModal(false)} className="p-2 bg-slate-100 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-full transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Konten Modal */}
                    <div className="p-6 bg-slate-50/50">
                        {/* Ringkasan Tagihan */}
                        <div className="text-center mb-6">
                            <p className="text-sm text-slate-500 font-medium mb-1">Total Tagihan Final</p>
                            <h2 className="text-4xl font-black text-slate-800 tracking-tight">Rp99.000</h2>
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full mt-3">
                                <Crown className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[11px] font-bold text-indigo-700">BILANO PRO (1 Tahun)</span>
                            </div>
                        </div>

                        {!qrUrl ? (
                            /* TAHAP 1: PILIH METODE BAYAR */
                            <div className="space-y-3">
                                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-center">Pilih Metode Pembayaran</p>
                                
                                {/* Tombol QRIS Aktif */}
                                <button
                                    onClick={handleGenerateQR}
                                    disabled={isGeneratingQr}
                                    className="w-full flex items-center justify-between p-4 border-2 border-slate-200 hover:border-indigo-500 rounded-2xl transition-all active:scale-[0.98] group bg-white shadow-sm"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                            <QrCode className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-extrabold text-slate-800 text-sm">QRIS Auto-Scan</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">GoPay, OVO, DANA, M-Banking</p>
                                        </div>
                                    </div>
                                    {isGeneratingQr ? <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /> : <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />}
                                </button>
                                
                                {/* Desain Dummy Bank Transfer (Memberi Kesan Enterprise/Corporate) */}
                                <div className="w-full flex items-center justify-between p-4 border border-slate-100 rounded-2xl opacity-50 bg-slate-50 cursor-not-allowed">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <p className="font-bold text-slate-600 text-sm">Transfer Bank (VA)</p>
                                            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Sedang Pemeliharaan Sistem</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* TAHAP 2: TAMPILAN BARCODE QRIS */
                            <div className="animate-in fade-in zoom-in-95 duration-500">
                                <div className="bg-white border-2 border-slate-100 p-4 rounded-[24px] mx-auto w-fit mb-5 shadow-lg">
                                    <img src={qrUrl} alt="QRIS Barcode" className="w-48 h-48 object-contain mix-blend-multiply" />
                                </div>
                                <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-xl mb-6">
                                    <p className="text-[11px] text-amber-800 font-semibold text-center leading-relaxed">
                                        Scan kode QR di atas menggunakan aplikasi E-Wallet atau M-Banking Anda sebelum menutup jendela ini.
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => {
                                        toast({ title: "Memverifikasi...", description: "Sistem sedang mengecek pembayaran Anda." });
                                        // Pura-pura memproses karena webhook akan bekerja di belakang layar
                                        setTimeout(() => {
                                            localStorage.setItem("bilano_pro", "true");
                                            localStorage.setItem(`bilano_trial_expired_${userEmail}`, "false");
                                            localStorage.setItem("bilano_trial_expired", "false");
                                            window.location.href = "/";
                                        }, 1500);
                                    }}
                                    className="w-full h-14 bg-slate-900 hover:bg-black text-white rounded-full font-extrabold shadow-xl flex items-center justify-center gap-2 text-sm transition-transform active:scale-95"
                                >
                                    SAYA SUDAH MEMBAYAR
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </MobileLayout>
  );
}