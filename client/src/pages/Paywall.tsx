import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { 
  CheckCircle2, Crown, ArrowRight, Loader2, X, AlertCircle,
  ChevronDown, Copy, RefreshCw, BookOpen, Clock, ShieldCheck, Sparkles, Gift
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWelcomeCountdown, getStoredUserGoal, getGoalPitchDetails } from "@/lib/welcome-deal";

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

  const userEmail = localStorage.getItem("bilano_email") || user?.email || "";
  const countdown = useWelcomeCountdown(userEmail);
  const userGoal = getStoredUserGoal(userEmail);
  const pitch = getGoalPitchDetails(userGoal);

  const [cycle, setCycle] = useState<'annual' | 'monthly'>('annual');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("SQ");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMethodDetails = PAYMENT_OPTIONS.find(p => p.id === paymentMethod) || PAYMENT_OPTIONS[0];

  const prices = {
    total: cycle === 'annual' ? 99000 : 19000,
    monthlyRate: cycle === 'annual' ? 8250 : 19000
  };

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/payment/duitku-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          price: prices.total,
          plan: cycle === 'annual' ? 'year' : 'month',
          productDetail: `Paket PREMIUM BILANO (${cycle === 'annual' ? 'Tahunan 99k + Bonus Ebook' : 'Bulanan'})`,
          customerName: `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim(),
          email: userEmail,
          paymentMethod: paymentMethod,
          tier: 'premium'
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
        localStorage.setItem('bilano_access_tier', 'premium');
        localStorage.setItem('bilano_pro', 'true');
        toast({ title: "VIP Aktif! 🎉", description: "Selamat datang di ekosistem Premium BILANO." });
        setLocation("/"); 
        window.location.reload();
      } else { 
        setShowPaymentAlert(true); 
      }
    } catch (e) { 
      toast({ title: "Error", description: "Cek koneksi bank Anda.", variant: "destructive" });
    } finally { 
      setIsCheckingPayment(false); 
    }
  };

  const handleContinueFree = () => {
    localStorage.setItem('bilano_access_tier', 'free');
    localStorage.removeItem('bilano_pro');
    setLocation('/');
  };

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gradient-to-b from-[#0a1128] via-[#0f1d40] to-[#0a1128] text-white pb-12 flex flex-col items-center">
        
        {/* TOP BAR */}
        <div className="w-full flex items-center justify-between px-5 pt-6 mb-6">
          <button 
            onClick={handleContinueFree} 
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 shadow-sm flex items-center justify-center text-slate-300 hover:text-white transition-colors border border-white/10 cursor-pointer"
            title="Tutup & Lanjut ke Beranda"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="bg-brand-gold/15 text-brand-gold border border-brand-gold/30 text-[10px] font-black px-4 py-1.5 rounded-full tracking-widest uppercase flex items-center gap-1.5 shadow-sm">
            <Crown className="w-3.5 h-3.5 fill-current" />
            <span>BILANO VIP ACCESS</span>
          </div>
        </div>

        {!paymentDetails ? (
          <div className="w-full px-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md">
            
            {/* ⏱️ PERSISTENT WELCOME DEAL TIMER BOX */}
            <div className="bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-2 border-amber-400/40 rounded-2xl p-3.5 mb-5 shadow-lg backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-brand-navy flex items-center justify-center font-black shrink-0 animate-pulse">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Penawaran Sambutan 24 Jam
                    </p>
                    <p className="text-xs font-extrabold text-white">
                      Gratis Bundle E-Book Finansial
                    </p>
                  </div>
                </div>
                <div className="bg-brand-navy/90 border border-amber-400/50 px-3 py-1.5 rounded-xl text-center shrink-0">
                  <span className="text-xs font-black text-amber-300 font-mono tracking-widest">
                    {countdown.formatted}
                  </span>
                </div>
              </div>
            </div>

            {/* DYNAMIC PERSONALIZED HEADER */}
            <div className="text-center mb-6">
              <span className="inline-block bg-blue-500/15 text-blue-300 border border-blue-400/20 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2.5">
                {pitch.badge}
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white mb-2 leading-tight">
                {pitch.headline}
              </h1>
              <p className="text-xs text-slate-300 font-medium leading-relaxed px-2">
                {pitch.subheadline}
              </p>
            </div>

            {/* CYCLE TOGGLE (BULANAN vs TAHUNAN) */}
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 p-1.5 rounded-full flex relative border border-white/15">
                {cycle === 'annual' && (
                  <div className="absolute -top-9 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-300 text-[10px] font-black text-brand-navy px-3 py-1 rounded-xl shadow-md relative animate-bounce whitespace-nowrap uppercase tracking-wider">
                      🔥 Hemat Rp 158.000 + Ebook
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-amber-400"></div>
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setCycle('annual')}
                  className={`px-6 py-2.5 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${cycle === 'annual' ? 'bg-gradient-to-r from-brand-gold to-[#f5d77a] text-brand-navy shadow-md' : 'text-slate-300 hover:text-white'}`}
                >
                  TAHUNAN (VIP PRO)
                </button>
                <button 
                  onClick={() => setCycle('monthly')}
                  className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${cycle === 'monthly' ? 'bg-white text-brand-navy shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                  BULANAN
                </button>
              </div>
            </div>

            {/* MAIN PREMIUM VIP CARD */}
            <div className="bg-gradient-to-b from-[#14234b] to-[#0c1735] rounded-[32px] p-6 border-2 border-brand-gold shadow-[0_12px_35px_rgba(246,185,59,0.25)] relative overflow-hidden mb-5">
              <div className="absolute top-0 right-0 bg-gradient-to-r from-brand-gold to-[#f5d77a] text-brand-navy text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest shadow-md">
                Paling Hemat
              </div>

              <div className="flex justify-between items-start mb-4 mt-2">
                <div>
                  <span className="text-[10px] font-black text-brand-navy bg-brand-gold px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    Akses Penuh Tanpa Batas
                  </span>
                  <h3 className="text-xl font-black mt-2 flex items-center gap-2 text-white">
                    BILANO Premium <Crown className="w-5 h-5 fill-brand-gold text-brand-gold"/>
                  </h3>
                </div>
                <div className="text-right">
                  {cycle === 'annual' ? (
                    <>
                      <p className="text-[11px] text-slate-400 line-through font-bold">
                        Rp 228.000
                      </p>
                      <p className="text-2xl font-black text-brand-gold leading-none mt-0.5">
                        Rp 99.000
                      </p>
                      <span className="text-[10px] text-slate-300 font-bold mt-1 block">
                        / tahun (Rp 8.250/bln)
                      </span>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-black text-brand-gold leading-none">
                        Rp 19.000
                      </p>
                      <span className="text-[10px] text-slate-300 font-bold mt-1 block">
                        / bulan
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* BENEFIT LIST */}
              <div className="space-y-3 pt-4 border-t border-slate-700/60 mb-4">
                <BenefitItem 
                  dark 
                  active 
                  highlight 
                  icon={<Crown className="w-4 h-4 text-brand-gold"/>} 
                  text={pitch.heroFeature} 
                />
                <BenefitItem dark active text="Konsultasi Asisten Finansial AI Tanpa Batas" />
                <BenefitItem dark active text="Laporan Neraca & Audit Kebocoran Kas Lengkap" />
                <BenefitItem dark active text="Pemindai Struk Instan (Smart Scan OCR)" />
                <BenefitItem dark active text="Multi-Mata Uang (Forex) & Pelacak Investasi Real-Time" />
                
                {/* E-BOOK BUNDLE HIGHLIGHT */}
                {cycle === 'annual' ? (
                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-3 flex items-start gap-2.5 mt-2">
                    <Gift className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-300 leading-snug">
                        Bonus Spesial: Paket E-Book Finansial Academy
                      </p>
                      <p className="text-[11px] text-slate-300 leading-normal mt-0.5">
                        Harga normal Rp 29.000/tahun — <strong className="text-white">GRATIS</strong> khusus Paket Tahunan hari ini!
                      </p>
                    </div>
                  </div>
                ) : (
                  <BenefitItem dark active={false} text="Paket E-Book Finansial Academy (Hanya di Paket Tahunan)" />
                )}
              </div>
            </div>

            {/* TRUST BADGE NOTICE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-6 flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
              <p className="text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white">Jaminan Aman:</strong> Bayar 1 kali via QRIS/VA. <span className="text-emerald-300 font-bold">Tanpa auto-debit</span> / tanpa perpanjangan otomatis diam-diam.
              </p>
            </div>

            {/* PAYMENT SELECTOR */}
            <div className="flex flex-col gap-2 mb-6 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-1">
                Pilih Metode Pembayaran
              </label>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="w-full bg-white/10 border border-white/15 rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm group hover:border-amber-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 shadow-sm">
                    <PaymentIcon src={selectedMethodDetails.icon} name={selectedMethodDetails.name} />
                  </div>
                  <span className="font-bold text-white text-xs truncate">{selectedMethodDetails.name}</span>
                </div>
                <ChevronDown className="w-5 h-5 text-slate-400 transition-transform shrink-0 ml-2" />
              </button>

              {isDropdownOpen && (
                <ul className="absolute bottom-full left-0 w-full bg-[#0e1730] border border-white/20 rounded-3xl shadow-2xl z-50 p-2 mb-2 max-h-60 overflow-y-auto animate-in slide-in-from-bottom-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <li 
                      key={opt.id} 
                      onClick={() => { setPaymentMethod(opt.id); setIsDropdownOpen(false); }} 
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${paymentMethod === opt.id ? 'bg-amber-400/20 border border-amber-300/40 text-amber-300' : 'hover:bg-white/5 text-slate-300'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0">
                          <PaymentIcon src={opt.icon} name={opt.name} />
                        </div>
                        <span className="text-xs font-bold truncate">
                          {opt.name}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* PRIMARY CTA BUTTON */}
            <Button 
              onClick={handleCheckout} 
              disabled={isProcessing}
              className="w-full h-15 rounded-[22px] text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl bg-gradient-to-r from-brand-gold to-[#f5d77a] text-brand-navy hover:from-[#f2ce5d] hover:to-brand-gold cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                <>AKTIFKAN {cycle === 'annual' ? 'PAKET TAHUNAN (RP 99.000)' : 'PAKET BULANAN (RP 19.000)'} <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
            
            {/* TRANSPARENT CONTINUE FREE BUTTON */}
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={handleContinueFree}
                className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors py-2 px-4 cursor-pointer"
              >
                Lanjutkan dengan Versi Gratis Terbatas
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
              Secure 256-bit Encrypted Payment Gateway
            </p>
          </div>
        ) : (
          /* PAYMENT PROCESSING VIEW */
          <div className="w-full px-5 flex flex-col items-center animate-in zoom-in-95 duration-300 my-auto max-w-sm">
            <div className="bg-white text-slate-900 rounded-[36px] p-7 w-full shadow-2xl text-center border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-brand-navy border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-6 h-6 text-brand-gold fill-current" />
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-1">Selesaikan Pembayaran</h2>
              <p className="text-xs text-slate-500 mb-5 font-medium">Scan QRIS atau transfer menuju Virtual Account berikut:</p>

              <div className="bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-200">
                {paymentDetails.qrString || paymentDetails.paymentUrl?.includes("qris") ? (
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-3">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(paymentDetails.qrString || paymentDetails.paymentUrl)}`} alt="QRIS" className="w-44 h-44" />
                    </div>
                    <span className="text-emerald-600 text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Verifikasi Otomatis
                    </span>
                  </div>
                ) : (
                  <div className="text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Nomor Virtual Account</p>
                    <div className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center mb-3">
                      <span className="text-lg font-black tracking-widest text-slate-800">{paymentDetails.vaNumber}</span>
                      <button onClick={() => { navigator.clipboard.writeText(paymentDetails.vaNumber); toast({ description: "Nomor VA disalin!" }); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"><Copy className="w-4 h-4"/></button>
                    </div>
                  </div>
                )}
                <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pembayaran</span>
                  <span className="text-lg font-black text-brand-navy">Rp {parseInt(paymentDetails.amount).toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button onClick={handleRefreshStatus} disabled={isCheckingPayment} className="w-full h-13 bg-brand-navy text-white rounded-xl font-black text-xs tracking-wider flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors cursor-pointer">
                  {isCheckingPayment ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4"/>}
                  CEK STATUS PEMBAYARAN
                </Button>
                <button onClick={() => setPaymentDetails(null)} className="text-[11px] font-bold text-slate-400 hover:text-slate-800 transition-colors py-1 cursor-pointer">
                  Ganti Metode Pembayaran
                </button>
              </div>
            </div>
          </div>
        )}

        {showPaymentAlert && (
          <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
            <div className="bg-white rounded-[32px] p-7 w-full max-w-sm text-center shadow-2xl border border-slate-100 text-slate-900">
              <div className="w-14 h-14 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-3"><AlertCircle className="w-7 h-7"/></div>
              <h3 className="text-lg font-black text-slate-900 mb-1.5">Pembayaran Belum Terdeteksi</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium mb-5">Sistem sedang menunggu mutasi dari bank/e-wallet Anda. Tunggu sekitar 1 menit lalu tekan Cek Status Pembayaran kembali.</p>
              <Button onClick={() => setShowPaymentAlert(false)} className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-colors cursor-pointer">SAYA MENGERTI</Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function BenefitItem({ active, text, highlight, icon, dark }: { active?: boolean, text: string, highlight?: boolean, icon?: React.ReactNode, dark?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 w-full">
      <div className="shrink-0 w-4 h-4 flex items-center justify-center mt-0.5">
        {active ? (
          <CheckCircle2 className={`w-4 h-4 ${highlight ? 'text-amber-400' : 'text-emerald-400'}`} />
        ) : (
          <X className="w-4 h-4 text-slate-500" />
        )}
      </div>
      <div className="flex items-start gap-1.5 min-w-0 flex-1">
        {icon && <span className="text-amber-400 shrink-0 mt-0.5">{icon}</span>}
        <span className={`text-xs font-bold leading-normal break-words ${
          active 
            ? (highlight ? 'text-amber-300' : (dark ? 'text-slate-200' : 'text-slate-700')) 
            : 'text-slate-500 line-through'
        }`}>{text}</span>
      </div>
    </div>
  );
}