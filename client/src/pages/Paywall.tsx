import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { useUser, useTransactions } from "@/hooks/use-finance";
import { 
  CheckCircle2, Crown, ArrowRight, Loader2, X, AlertCircle,
  Bot, ShieldCheck, ChevronDown, Copy, RefreshCw, Zap, Star
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// =======================================================
// DATABASE METODE PEMBAYARAN & LOGO (DARI ONBOARDING)
// =======================================================
const PAYMENT_OPTIONS = [
  { id: "SQ", name: "QRIS (GoPay/OVO/Dana)", icon: "/QRIS.png" }, 
  { id: "M2", name: "Mandiri Virtual Account", icon: "/Mandiri.png" },
  { id: "I1", name: "BNI Virtual Account", icon: "/BNI.png" },
  { id: "BR", name: "BRI Virtual Account", icon: "/BRI.png" },
  { id: "B1", name: "CIMB Niaga Virtual Account", icon: "/CIMB.png" },
  { id: "BT", name: "Permata Virtual Account", icon: "/Permata.png" },
  { id: "BSI", name: "BSI Virtual Account", icon: "/BSI.png" },
  { id: "A1", name: "ATM Bersama", icon: "/ATM.png" },
  { id: "FT", name: "Alfamart / Pegadaian / Pos", icon: "/Alfa.png" }
];

const PaymentIcon = ({ src, name }: { src: string, name: string }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError || !src) {
    const initial = name.replace(/Virtual Account/i, "").replace(/Bank/i, "").trim().substring(0, 2).toUpperCase();
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center rounded text-[10px] font-black text-slate-400 tracking-tighter">
        {initial}
      </div>
    );
  }
  return <img src={src} alt={name} className="w-full h-full object-contain" onError={() => setHasError(true)} />;
};

export default function Paywall() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const { data: user } = useUser();
  const { data: transactions = [] } = useTransactions();

  // State Manajemen Paket (Gemini Tier Style)
  const [activeTier, setActiveTier] = useState<'free' | 'standard' | 'premium'>('premium');
  
  // State Alur Pembayaran
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("SQ");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // State Post-Inquiry (Duitku Output)
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  // Klik luar untuk menutup dropdown metode pembayaran
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMethodDetails = PAYMENT_OPTIONS.find(p => p.id === paymentMethod) || PAYMENT_OPTIONS[0];
  const userEmail = localStorage.getItem("bilano_email") || user?.email || "";

  // Target Harga Final & Detil Produk Berdasarkan Tier Pilihan
  const getTierPriceAndDetails = () => {
    if (activeTier === 'standard') {
      return { price: 85000, title: 'Paket Standard BILANO (Pancingan)', desc: 'Akses Fitur Pilihan & Grafik + Kuota AI Terbatas' };
    }
    return { price: 99000, title: 'Paket Premium VIP BILANO', desc: 'Akses Penuh Tanpa Batas + Wealth Blueprint & Academy' };
  };

  const { price: finalPrice, title: productDetail } = getTierPriceAndDetails();

  // Eksekusi Pembuatan Faktur Pembayaran Langsung ke Duitku Gateway
  const handleCheckoutExecution = async () => {
    if (activeTier === 'free') {
      setLocation("/");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/payment/duitku-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          price: finalPrice,
          plan: activeTier === 'premium' ? 'year' : 'month', 
          productDetail: productDetail,
          customerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : "Member BILANO",
          email: userEmail,
          phone: "080000000000", 
          paymentMethod: paymentMethod
        })
      });

      const data = await response.json();

      if (data.success && data.paymentData) {
        setPaymentDetails({ ...data.paymentData, merchantOrderId: data.merchantOrderId });
      } else {
        throw new Error(data.error || "Gagal terhubung ke modul perbankan Duitku.");
      }
    } catch (err: any) {
      toast({
        title: "Gagal Memproses Pembayaran",
        description: err.message || "Koneksi terputus.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Verifikasi Pembayaran Sukses di Sisi Klien
  const handleRefreshPaymentStatus = async () => {
    setIsCheckingPayment(true);
    try {
      const response = await fetch('/api/payment/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          merchantOrderId: paymentDetails?.merchantOrderId
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.isPaid) {
        // Otomatis claim dan sinkronisasi status PRO di server
        await fetch('/api/payment/claim-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: user?.firstName || "Member",
              email: userEmail,
              plan: activeTier === 'premium' ? 'year' : 'month',
              amount: finalPrice
            })
        });

        toast({ title: "Pembayaran Berhasil! 🎉", description: "Akses VIP Premium Anda langsung aktif." });
        setPaymentDetails(null);
        setLocation("/");
        window.location.reload();
      } else {
        setShowPaymentAlert(true);
      }
    } catch (error) {
      toast({ title: "Gagal Sinkronisasi", description: "Jaringan perbankan sibuk.", variant: "destructive" });
    } finally {
      setIsCheckingPayment(false);
    }
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-slate-950 text-white px-4 py-6 flex flex-col justify-between relative overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] -z-10"></div>

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setLocation("/")} className="w-9 h-9 rounded-full bg-slate-900/80 flex items-center justify-center text-slate-400 hover:text-white border border-slate-800/60 transition-colors">
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase bg-blue-950/60 px-3 py-1.5 rounded-full border border-blue-900/40">
            BILANO UPGRADE HUB
          </span>
        </div>

        {/* JIKA BELUM MELAKUKAN INQUIRY TAGIHAN */}
        {!paymentDetails ? (
          <>
            {/* INTRO TITLE */}
            <div className="text-center mb-6 space-y-1.5">
              <h1 className="text-2xl font-black tracking-tight text-white">Pilih Paket Akses Anda</h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">Sesuaikan kapasitas manajemen dan kecerdasan AI untuk portfolio Anda</p>
            </div>

            {/* MODEL TIERED PRICING (GEMINI HP COMPATIBLE STYLE) */}
            <div className="space-y-4 mb-6">
              
              {/* TIER 1: FREE */}
              <div 
                onClick={() => setActiveTier('free')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${activeTier === 'free' ? 'border-slate-400 bg-slate-900/50 ring-1 ring-slate-400' : 'border-slate-900 bg-slate-900/20'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-300">Fitur Dasar (Free)</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Catatan kas manual harian sederhana.</p>
                  </div>
                  <span className="text-sm font-black text-slate-400">Rp 0</span>
                </div>
                <div className="h-px bg-slate-800 my-2.5"></div>
                <div className="space-y-1.5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-slate-500 shrink-0" /> <span>Catat Kas Masuk & Keluar</span></div>
                  <div className="flex items-center gap-2 text-slate-600"><X className="w-3.5 h-3.5 text-rose-900 shrink-0" /> <span>Seluruh Fitur Pilihan Terkunci</span></div>
                </div>
              </div>

              {/* TIER 2: STANDARD (DECOY PANCINGAN) */}
              <div 
                onClick={() => setActiveTier('standard')}
                className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${activeTier === 'standard' ? 'border-indigo-500 bg-indigo-950/10 ring-1 ring-indigo-500' : 'border-slate-900 bg-slate-900/20'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-1.5">Standard <Zap className="w-3 h-3 text-indigo-400 fill-indigo-400"/></h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Untuk tracking aset skala menengah.</p>
                  </div>
                  <span className="text-sm font-black text-indigo-400">Rp 85.000<span className="text-[9px] font-normal text-slate-500">/thn</span></span>
                </div>
                <div className="h-px bg-slate-800 my-2.5"></div>
                <div className="space-y-1.5 text-[11px] text-slate-300">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> <span>Buka Fitur Pilihan (Valas, Investasi, Hutang, dll)</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> <span>Akses Grafik Analisa Performa Lengkap</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0" /> <span>Tanya AI Assistant <b>(Terbatas 3x Sehari)</b></span></div>
                  <div className="flex items-center gap-2 text-slate-600"><X className="w-3.5 h-3.5 text-rose-900 shrink-0" /> <span>Tanpa Blueprint Kekayaan & Academy</span></div>
                </div>
              </div>

              {/* TIER 3: PREMIUM PRO (CORE TARGET - DECOY EFFECT WINNER) */}
              <div 
                onClick={() => setActiveTier('premium')}
                className={`p-4 rounded-3xl border text-left transition-all relative overflow-hidden cursor-pointer ${activeTier === 'premium' ? 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'border-slate-900 bg-slate-900/20'}`}
              >
                {/* Visual Label Paling Populer */}
                <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-yellow-400 text-slate-950 text-[9px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                  PILIHAN TERBAIK
                </div>

                <div className="flex justify-between items-start mb-2 pt-2">
                  <div>
                    <h3 className="font-black text-sm text-amber-400 flex items-center gap-1.5">PREMIUM VIP <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400"/></h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">Kontrol akselerasi arsitektur keuangan total.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 line-through block decoration-rose-600 font-bold">Rp 199.000</span>
                    <span className="text-base font-black text-amber-400">Rp 99.000<span className="text-[9px] font-normal text-slate-500">/thn</span></span>
                  </div>
                </div>
                <div className="h-px bg-slate-800 my-2.5"></div>
                <div className="space-y-1.5 text-[11px] text-slate-200 font-medium">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <span>Semua Keunggulan Paket Standard Termasuk</span></div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> <span><b>Konsultasi Cerdas AI Tanpa Batas 24/7</b></span></div>
                  <div className="flex items-center gap-2 bg-amber-500/10 p-1.5 rounded-lg border border-amber-500/20 text-amber-300"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" /> <span><b>Buka Akses Wealth Blueprint & AI Peta Cuan</b></span></div>
                  <div className="flex items-center gap-2 text-amber-300"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" /> <span><b>Buka Akses BILANO Academy (E-Book VIP)</b></span></div>
                </div>
              </div>

            </div>

            {/* SELEKSI METODE PEMBAYARAN INSTAN (Bypass Data Diri) */}
            {activeTier !== 'free' && (
              <div className="flex flex-col gap-1.5 mb-6 text-left relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Metode Pembayaran (Duitku Gateway)
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-md p-1 flex items-center justify-center shrink-0">
                      <PaymentIcon src={selectedMethodDetails.icon} name={selectedMethodDetails.name} />
                    </div>
                    <span className="font-semibold text-left line-clamp-1 text-slate-200">
                      {selectedMethodDetails.name}
                    </span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isDropdownOpen && (
                  <ul className="absolute bottom-[105%] left-0 w-full bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 max-h-48 overflow-y-auto custom-scrollbar overflow-x-hidden flex flex-col p-2 gap-1">
                    {PAYMENT_OPTIONS.map((option) => (
                      <li 
                        key={option.id}
                        onClick={() => {
                          setPaymentMethod(option.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${paymentMethod === option.id ? 'bg-amber-400/10 border border-amber-400/20' : 'hover:bg-white/5 border border-transparent'}`}
                      >
                        <div className="w-8 h-8 bg-white rounded-md p-1 shrink-0 flex items-center justify-center">
                          <PaymentIcon src={option.icon} name={option.name} />
                        </div>
                        <span className={`text-sm ${paymentMethod === option.id ? 'text-amber-400 font-bold' : 'text-slate-300 font-medium'}`}>
                          {option.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* ACTION TOMBOL KONFIRMASI UTAMA */}
            <div className="space-y-2">
              <Button 
                disabled={isProcessing}
                onClick={handleCheckoutExecution}
                className={`w-full h-14 font-black text-xs rounded-full tracking-widest flex items-center justify-center gap-2 shadow-lg ${activeTier === 'free' ? 'bg-slate-800 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-950'}`}
              >
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                  activeTier === 'free' ? "KEMBALI KE BERANDA KAS" : <>AKTIFKAN AKSES PADA AKUN SEKARANG <ArrowRight className="w-4 h-4" /></>
                )}
              </Button>
            </div>
          </>
        ) : (
          /* =======================================================
             SCREEN PROSES SINKRONISASI FAKTUR / INVOICE DUITKU
             ======================================================= */
          <div className="my-auto py-4 w-full flex flex-col items-center animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 text-center w-full max-w-sm shadow-2xl">
              <h2 className="text-xl font-black mb-1 text-white">Selesaikan Pembayaran</h2>
              <p className="text-slate-400 text-xs mb-5">
                {paymentDetails.qrString || paymentDetails.paymentUrl?.includes("qris") 
                  ? "Scan barcode QRIS otomatis di bawah via e-Wallet/M-Banking:" 
                  : "Silakan transfer langsung menuju rekening Virtual Account:"}
              </p>

              <div className="bg-slate-950 rounded-2xl p-4.5 border border-slate-800/60 mb-5 shadow-inner">
                {paymentDetails.qrString || paymentDetails.paymentUrl?.includes("qris") ? (
                  <div className="flex flex-col items-center justify-center bg-white p-3 rounded-xl mb-3">
                    <img 
                      src={paymentDetails.qrString 
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentDetails.qrString)}` 
                        : paymentDetails.paymentUrl
                      } 
                      alt="QRIS Code Tagihan Bilano" 
                      className="w-44 h-44 object-contain"
                    />
                    <span className="text-slate-900 text-[9px] font-black mt-1 tracking-wider">VERIFIKASI OTOMATIS LIVE</span>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                      Nomor Virtual Account ({selectedMethodDetails.name})
                    </p>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3.5 mb-3">
                      <span className="text-xl font-black tracking-widest text-white">
                        {paymentDetails.vaNumber}
                      </span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(paymentDetails.vaNumber);
                          toast({ description: "Nomor VA berhasil disalin!" });
                        }} 
                        className="p-2 bg-amber-400/10 text-amber-400 rounded-lg hover:bg-amber-400 hover:text-black transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Total Tagihan Paket</p>
                  <span className="text-2xl font-black text-amber-400">
                    Rp {parseInt(paymentDetails.amount).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleRefreshPaymentStatus}
                disabled={isCheckingPayment}
                className="w-full h-12 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black text-xs tracking-widest rounded-xl shadow-lg shadow-amber-950/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isCheckingPayment ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isCheckingPayment ? "MENYINGKRONKAN DATA..." : "REFRESH STATUS PEMBAYARAN"}
              </button>

              <button
                onClick={() => setPaymentDetails(null)}
                className="mt-4 text-[11px] font-bold text-slate-500 hover:text-white transition-colors underline underline-offset-4 block w-full text-center"
              >
                Ganti Metode / Pilih Paket Ulang
              </button>
            </div>
          </div>
        )}

        {/* MODAL PERINGATAN DANA DARI SERVER SINKRONISASI */}
        {showPaymentAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-[32px] w-full max-w-sm p-6 text-center shadow-2xl">
              <div className="w-14 h-14 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-black mb-2">Mutasi Belum Ditemukan</h3>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Jaringan perbankan membutuhkan waktu <b>1-3 menit</b> untuk menyelesaikan pelaporan kliring mutasi. Harap tunggu sebentar, lalu tekan kembali tombol refresh.
              </p>
              <Button onClick={() => setShowPaymentAlert(false)} className="w-full h-12 bg-slate-100 hover:bg-white text-slate-950 font-black text-xs rounded-xl shadow-lg active:scale-95 transition-transform">
                SAYA MENGERTI
              </Button>
            </div>
          </div>
        )}

        {/* BRADING FOOTER */}
        <div className="mt-4 opacity-40 text-center">
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase">© Bilano Official Secure Payment Terminal</p>
        </div>
      </div>
    </MobileLayout>
  );
}