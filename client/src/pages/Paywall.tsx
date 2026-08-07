import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { 
  CheckCircle2, Crown, ArrowRight, Loader2, X, AlertCircle,
  ChevronDown, Copy, RefreshCw, Sparkles, BookOpen
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    const initial = name.substring(0, 2).toUpperCase();
    return <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded text-[10px] font-bold text-slate-400">{initial}</div>;
  }
  return <img src={src} alt={name} className="w-full h-full object-contain" onError={() => setHasError(true)} />;
};

export default function Paywall() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useUser();

  const [cycle, setCycle] = useState<'annual' | 'monthly'>('annual');
  const [activeTier, setActiveTier] = useState<'free' | 'standard' | 'premium'>('premium');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("SQ");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const premiumRef = useRef<HTMLDivElement>(null); // Ref baru untuk kotak Premium
  
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  // Effect untuk klik di luar dropdown metode pembayaran
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Effect baru untuk Auto-Scroll ke kotak Premium VIP saat halaman dibuka
  useEffect(() => {
    if (!paymentDetails) {
      // Diberi jeda 300ms agar animasi halaman selesai terlebih dahulu
      const timer = setTimeout(() => {
        premiumRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [paymentDetails]);

  const selectedMethodDetails = PAYMENT_OPTIONS.find(p => p.id === paymentMethod) || PAYMENT_OPTIONS[0];
  const userEmail = localStorage.getItem("bilano_email") || user?.email || "";

  const prices = {
    standard: cycle === 'annual' ? 7000 : 14900,
    premium: cycle === 'annual' ? 8250 : 19000,
    total: activeTier === 'standard' ? (cycle === 'annual' ? 84000 : 14900) : (cycle === 'annual' ? 99000 : 19000)
  };

  const handleCheckout = async () => {
    if (activeTier === 'free') return setLocation("/");
    setIsProcessing(true);
    try {
      const response = await fetch("/api/payment/duitku-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          price: prices.total,
          plan: cycle === 'annual' ? 'year' : 'month',
          productDetail: `Paket ${activeTier.toUpperCase()} BILANO (${cycle})`,
          customerName: `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim(),
          email: userEmail,
          paymentMethod: paymentMethod
        })
      });
      const data = await response.json();
      if (data.success && data.paymentData) setPaymentDetails({ ...data.paymentData, merchantOrderId: data.merchantOrderId });
      else throw new Error(data.error || "Gagal membuat tagihan.");
    } catch (err: any) {
      toast({ title: "Gagal Proses", description: err.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const handleRefreshStatus = async () => {
    setIsCheckingPayment(true);
    try {
      const res = await fetch('/api/payment/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, merchantOrderId: paymentDetails?.merchantOrderId })
      });
      const data = await res.json();
      if (data.success && data.isPaid) {
        await fetch('/api/payment/claim-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: user?.firstName || "User", email: userEmail, plan: cycle === 'annual' ? 'year' : 'month', amount: prices.total })
        });
        toast({ title: "VIP Aktif!", description: "Selamat datang di ekosistem Premium." });
        setLocation("/"); window.location.reload();
      } else { setShowPaymentAlert(true); }
    } catch (e) { toast({ title: "Error", description: "Cek koneksi bank Anda.", variant: "destructive" });
    } finally { setIsCheckingPayment(false); }
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-10 flex flex-col items-center">
        
        {/* TOP BAR */}
        <div className="w-full flex items-center justify-between px-6 pt-6 mb-8">
          <button onClick={() => setLocation("/")} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <div className="bg-blue-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase">
            Bilano Upgrade Hub
          </div>
        </div>

        {!paymentDetails ? (
          <div className="w-full px-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* INTRO TEXT */}
            <div className="text-center mb-10">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Pilih Paket Akses</h1>
              <p className="text-sm text-slate-500 font-medium px-4">Maksimalkan asisten AI dan arsitektur finansial Anda hari ini.</p>
            </div>

            {/* TOGGLE SIKLUS */}
            <div className="flex justify-center mb-10">
              <div className="bg-slate-200 p-1.5 rounded-full flex relative">
                {cycle === 'annual' && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                    <div className="bg-white text-[10px] font-black text-blue-600 px-3 py-1.5 rounded-xl shadow-md border border-blue-50 relative animate-bounce whitespace-nowrap">
                      Hemat 36%
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white"></div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setCycle('monthly')}
                  className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${cycle === 'monthly' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                >
                  BULANAN
                </button>
                <button 
                  onClick={() => setCycle('annual')}
                  className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${cycle === 'annual' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                >
                  TAHUNAN
                </button>
              </div>
            </div>

            {/* TIER CARDS */}
            <div className="space-y-6 mb-10">
              
              {/* TIER: GRATIS */}
              <div onClick={() => setActiveTier('free')} className={`bg-white rounded-[32px] p-6 border-2 transition-all ${activeTier === 'free' ? 'border-emerald-400 shadow-xl scale-[1.02]' : 'border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Tanpa Biaya</span>
                    <h3 className="text-xl font-black mt-2">Paket Gratis</h3>
                  </div>
                  <p className="text-2xl font-black">Rp 0</p>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <BenefitItem active text="Pencatatan kas dan piutang masuk" />
                  <BenefitItem active text="Pencatatan kas dan utang keluar" />
                  <BenefitItem text="Akses fitur pilihan" />
                  <BenefitItem text="AI Assistant" />
                  <BenefitItem text="Analisa Performa lengkap" />
                </div>
              </div>

              {/* TIER: STANDARD */}
              <div onClick={() => setActiveTier('standard')} className={`bg-white rounded-[32px] p-6 border-2 transition-all relative ${activeTier === 'standard' ? 'border-blue-500 shadow-xl scale-[1.02]' : 'border-slate-200 shadow-sm'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">Pilihan Dasar</span>
                    <h3 className="text-xl font-black mt-2">Paket Standard</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-blue-600">Rp {prices.standard.toLocaleString('id-ID')}</p>
                    <span className="text-[10px] text-slate-400 font-bold">/ bulan</span>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <BenefitItem active text="Pencatatan kas dan piutang masuk" />
                  <BenefitItem active text="Pencatatan kas dan utang keluar" />
                  <BenefitItem active text="Akses fitur pilihan" />
                  <BenefitItem active text="AI Assistant" />
                  <BenefitItem active text="Analisa Performa lengkap" />
                  <BenefitItem text="Fitur Panduan Penghasilan (Premium)" />
                  <BenefitItem text="Fitur Bilano Academy (Premium)" />
                </div>
              </div>

              {/* TIER: PREMIUM VIP - REF DITAMBAHKAN DI SINI */}
              <div 
                ref={premiumRef}
                onClick={() => setActiveTier('premium')} 
                className={`bg-slate-900 rounded-[32px] p-6 border-2 transition-all relative overflow-hidden ${activeTier === 'premium' ? 'border-amber-400 shadow-2xl scale-[1.03]' : 'border-slate-800 shadow-sm'}`}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-200 to-amber-500 text-amber-950 text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-lg">Rekomendasi</div>
                <div className="flex justify-between items-center mb-4 mt-2">
                  <div>
                    <span className="text-[10px] font-black text-amber-950 bg-amber-400 px-2.5 py-1 rounded-lg uppercase tracking-wider">Akses Penuh</span>
                    <h3 className="text-xl font-black mt-2 flex items-center gap-2 text-white">Premium VIP <Crown className="w-5 h-5 fill-amber-400 text-amber-400"/></h3>
                  </div>
                  <div className="flex flex-col items-end justify-center min-h-[50px]">
                    {cycle === 'annual' && (
                      <p className="text-xs text-slate-400 line-through font-bold mb-0.5 leading-none">
                        Rp 12.900
                      </p>
                    )}
                    <p className="text-2xl font-black text-amber-400 leading-none">
                      Rp {prices.premium.toLocaleString('id-ID')}
                    </p>
                    <span className="text-[10px] text-slate-400 font-bold mt-1 leading-none">/ bulan</span>
                  </div>
                </div>
                <div className="space-y-4 pt-4 border-t border-slate-700/50">
                  <BenefitItem dark active text="Pencatatan kas dan piutang masuk" />
                  <BenefitItem dark active text="Pencatatan kas dan utang keluar" />
                  <BenefitItem dark active text="Akses fitur pilihan" />
                  <BenefitItem dark active text="AI Assistant" />
                  <BenefitItem dark active text="Analisa Performa lengkap" />
                  <BenefitItem dark active highlight icon={<Sparkles className="w-4 h-4"/>} text="Fitur Panduan Penghasilan (Premium)" />
                  <BenefitItem dark active highlight icon={<BookOpen className="w-4 h-4"/>} text="Fitur Bilano Academy (Premium)" />
                </div>
              </div>
            </div>

            {/* PAYMENT SELECTOR */}
            {activeTier !== 'free' && (
              <div className="flex flex-col gap-2 mb-8 relative" ref={dropdownRef}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Metode Pembayaran</label>
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between shadow-sm group hover:border-blue-300 transition-colors overflow-hidden"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 bg-slate-50 rounded-lg p-1.5 flex items-center justify-center shrink-0 border border-slate-100">
                      <PaymentIcon src={selectedMethodDetails.icon} name={selectedMethodDetails.name} />
                    </div>
                    <span className="font-bold text-slate-700 text-xs truncate">{selectedMethodDetails.name}</span>
                  </div>
                  <ChevronDown className="w-5 h-5 text-slate-400 transition-transform shrink-0 ml-2" />
                </button>
                {isDropdownOpen && (
                  <ul className="absolute bottom-full left-0 w-full bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 p-2 mb-2 max-h-60 overflow-y-auto animate-in slide-in-from-bottom-2">
                    {PAYMENT_OPTIONS.map((opt) => (
                      <li 
                        key={opt.id} 
                        onClick={() => { setPaymentMethod(opt.id); setIsDropdownOpen(false); }} 
                        className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${paymentMethod === opt.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 shadow-sm border border-slate-100">
                            <PaymentIcon src={opt.icon} name={opt.name} />
                          </div>
                          <span className={`text-xs truncate ${paymentMethod === opt.id ? 'text-blue-600 font-bold' : 'text-slate-600 font-medium'}`}>
                            {opt.name}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* CTA BUTTON */}
            <Button 
              onClick={handleCheckout} 
              disabled={isProcessing}
              className={`w-full h-16 rounded-[24px] text-sm font-black tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${activeTier === 'premium' ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 hover:from-amber-300 hover:to-amber-400' : (activeTier === 'standard' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-slate-900 text-white')}`}
            >
              {isProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : (
                activeTier === 'free' ? "LANJUTKAN GRATIS" : <>AKTIFKAN VIP SEKARANG <ArrowRight className="w-5 h-5" /></>
              )}
            </Button>
            
            <p className="text-center text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest">Secure 256-bit Encrypted Payment Gateway</p>
          </div>
        ) : (
          /* PAYMENT PROCESSING VIEW */
          <div className="w-full px-5 flex flex-col items-center animate-in zoom-in-95 duration-300 my-auto">
            <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl text-center border border-slate-100">
              <h2 className="text-xl font-black text-slate-900 mb-2">Selesaikan Tagihan</h2>
              <p className="text-xs text-slate-400 mb-6 font-medium">Scan QRIS atau transfer menuju Virtual Account di bawah:</p>

              <div className="bg-slate-50 rounded-3xl p-6 mb-6 border border-slate-200">
                {paymentDetails.qrString || paymentDetails.paymentUrl?.includes("qris") ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentDetails.qrString || paymentDetails.paymentUrl)}`} alt="QRIS" className="w-48 h-48" />
                    </div>
                    <span className="text-slate-400 text-[10px] font-black tracking-widest uppercase">Verifikasi Instan</span>
                  </div>
                ) : (
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nomor Virtual Account</p>
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex justify-between items-center mb-4">
                      <span className="text-xl font-black tracking-widest text-slate-800">{paymentDetails.vaNumber}</span>
                      <button onClick={() => { navigator.clipboard.writeText(paymentDetails.vaNumber); toast({ description: "Berhasil disalin!" }); }} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"><Copy className="w-4 h-4"/></button>
                    </div>
                  </div>
                )}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bayar</span>
                  <span className="text-xl font-black text-slate-900">Rp {parseInt(paymentDetails.amount).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <Button onClick={handleRefreshStatus} disabled={isCheckingPayment} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors">
                  {isCheckingPayment ? <Loader2 className="w-5 h-5 animate-spin"/> : <RefreshCw className="w-5 h-5"/>}
                  CEK STATUS PEMBAYARAN
                </Button>
                <button onClick={() => setPaymentDetails(null)} className="text-[11px] font-bold text-slate-400 hover:text-slate-800 underline underline-offset-4 transition-colors">Ganti Metode Pembayaran</button>
              </div>
            </div>
          </div>
        )}

        {showPaymentAlert && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl border border-slate-100">
              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8"/></div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Belum Terbayar</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-6">Mutasi bank belum masuk. Tunggu 1-2 menit lalu klik Refresh kembali. Jika sudah bayar tapi gagal, hubungi Bantuan.</p>
              <Button onClick={() => setShowPaymentAlert(false)} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-colors">SAYA MENGERTI</Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function BenefitItem({ active, text, highlight, icon, dark }: { active?: boolean, text: string, highlight?: boolean, icon?: React.ReactNode, dark?: boolean }) {
  return (
    <div className="flex items-start gap-3 w-full">
      <div className="shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
        {active ? (
          <CheckCircle2 className={`w-4 h-4 ${highlight ? 'text-amber-400' : (dark ? 'text-emerald-400' : 'text-emerald-500')}`} />
        ) : (
          <X className={`w-4 h-4 ${dark ? 'text-slate-500' : 'text-slate-400'}`} />
        )}
      </div>
      <div className="flex items-start gap-2 min-w-0 flex-1">
        {icon && <span className="text-amber-400 shrink-0 mt-0.5">{icon}</span>}
        <span className={`text-xs font-bold leading-normal break-words ${
          active 
            ? (highlight ? 'text-amber-400' : (dark ? 'text-slate-100' : 'text-slate-700')) 
            : (dark ? 'text-slate-500 line-through' : 'text-slate-400 line-through')
        }`}>{text}</span>
      </div>
    </div>
  );
}