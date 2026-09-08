import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { useUser } from "@/hooks/use-finance";
import { 
  CheckCircle2, Crown, ArrowRight, Loader2, X, AlertCircle,
  ChevronDown, Copy, RefreshCw, BookOpen, Clock, ShieldCheck, Sparkles, Gift, Smartphone
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useWelcomeCountdown, getStoredUserGoal, getGoalPitchDetails } from "@/lib/welcome-deal";
import { getTrialInfo } from "@/lib/trial-manager";

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
  const trial = getTrialInfo(user);
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
          productDetail: `Paket PREMIUM BILANO (${cycle === 'annual' ? (countdown.isPromoActive ? 'Tahunan 99k + Bonus Ebook' : 'Tahunan 99k') : 'Bulanan'})`,
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
      <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 flex flex-col items-center">
        
        {/* TOP BAR */}
        <div className="w-full flex items-center justify-between px-5 pt-6 mb-5 max-w-md">
          <button 
            onClick={handleContinueFree} 
            className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 shadow-xs flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors border border-slate-200 cursor-pointer"
            title="Tutup & Lanjut ke Beranda"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="bg-amber-50 text-brand-navy border border-amber-300/80 text-[10px] font-black px-3.5 py-1.5 rounded-full tracking-wider uppercase flex items-center gap-1.5 shadow-xs">
            <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>BILANO VIP ACCESS</span>
          </div>
        </div>

        {!paymentDetails ? (
          <div className="w-full px-5 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-md">
            
            {/* STATUS BADGE: AKTIF TRIAL (HARI 1-7) ATAU 24H COUNTDOWN (HARI 8+) */}
            {trial.isTrialActive ? (
              <div className="border-2 border-amber-300/80 bg-gradient-to-r from-amber-500/15 via-yellow-400/10 to-amber-500/5 rounded-2xl p-3.5 mb-5 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-300 text-brand-navy flex items-center justify-center font-black shrink-0 shadow-xs">
                      <Crown className="w-4 h-4 fill-brand-navy" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-slate-800">Mode Trial Akses Penuh</span>
                        <span className="bg-amber-400 text-brand-navy text-[9px] font-black px-2 py-0.5 rounded-full">
                          {trial.daysLeft} Hari Lagi
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Fitur aktif gratis s.d. {trial.formattedEndDate}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-200/60 text-[10px] text-slate-600 leading-relaxed flex items-start gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Anda sedang menikmati uji coba gratis. Anda dapat mengaktifkan <strong>Paket VIP Tahunan</strong> sekarang untuk akses permanen tanpa batas.
                  </span>
                </div>
              </div>
            ) : (
              <div className={`border-2 rounded-2xl p-3.5 mb-5 shadow-xs transition-all ${
                countdown.isExpired 
                  ? 'bg-slate-100 border-slate-200 text-slate-600' 
                  : 'bg-amber-50/90 border-amber-300 text-slate-800'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black shrink-0 ${
                      countdown.isExpired 
                        ? 'bg-slate-200 text-slate-500' 
                        : 'bg-amber-400 text-brand-navy'
                    }`}>
                      {countdown.isExpired ? <Clock className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 ${
                          countdown.isExpired 
                            ? 'bg-slate-200 text-slate-600' 
                            : 'bg-amber-100 text-amber-900 border border-amber-200'
                        }`}>
                          <Smartphone className="w-2.5 h-2.5" />
                          Khusus Perangkat Ini
                        </span>
                        {!countdown.isExpired && (
                          <span className="text-[9px] font-bold text-amber-800">
                            1x Hari Ini
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-900 mt-0.5 truncate">
                        {countdown.isExpired 
                          ? 'Promo E-Book Telah Berakhir' 
                          : 'Gratis Bundle 5 E-Book Finansial Academy'}
                      </p>
                    </div>
                  </div>
                  <div className={`border px-2.5 py-1.5 rounded-xl text-center shrink-0 ${
                    countdown.isExpired 
                      ? 'bg-slate-200 border-slate-300 text-slate-500' 
                      : 'bg-brand-navy border-amber-400/50 text-amber-300 shadow-xs'
                  }`}>
                    <span className="text-xs font-black font-mono tracking-wider block">
                      {countdown.formatted}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-wider block opacity-90">
                      {countdown.isExpired ? 'Hangus' : 'Sisa Waktu'}
                    </span>
                  </div>
                </div>

                {/* Explicit device-locking notice */}
                <div className={`mt-2.5 pt-2 border-t text-[10px] leading-relaxed flex items-start gap-1.5 ${
                  countdown.isExpired ? 'border-slate-200 text-slate-500' : 'border-amber-200 text-amber-900/90'
                }`}>
                  <Smartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    {countdown.isExpired ? (
                      <>Promo bonus bundle e-book gratis telah berakhir untuk perangkat ini. Anda tetap dapat mengaktifkan Paket VIP Tahunan untuk akses tanpa batas seluruh fitur finansial cerdas.</>
                    ) : (
                      <><strong>Pemberitahuan:</strong> Promo gratis e-book ini dikunci khusus pada <strong>perangkat ini</strong> selama 24 jam hari ini. Tidak dapat diulang atau di-reset dengan mendaftar email baru di perangkat yang sama.</>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* DYNAMIC PERSONALIZED HEADER */}
            <div className="text-center mb-5">
              <span className="inline-block bg-blue-50 text-brand-navy border border-blue-200 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2">
                {pitch.badge}
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 mb-1.5 leading-tight">
                {pitch.headline}
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed px-1">
                {pitch.subheadline}
              </p>
            </div>

            {/* CYCLE TOGGLE (BULANAN vs TAHUNAN) */}
            <div className="flex justify-center mb-5">
              <div className="bg-slate-200/80 p-1 rounded-full flex relative border border-slate-200 shadow-inner">
                {cycle === 'annual' && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2">
                    <div className="bg-amber-400 text-[9px] font-black text-brand-navy px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap uppercase tracking-wider">
                      {countdown.isPromoActive ? 'Hemat 57% + 5 E-Book' : 'Hemat Rp 129.000'}
                    </div>
                  </div>
                )}
                <button 
                  onClick={() => setCycle('annual')}
                  className={`px-5 py-2 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${cycle === 'annual' ? 'bg-brand-navy text-brand-gold shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  TAHUNAN (VIP PRO)
                </button>
                <button 
                  onClick={() => setCycle('monthly')}
                  className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${cycle === 'monthly' ? 'bg-white text-slate-900 shadow-md font-black' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  BULANAN
                </button>
              </div>
            </div>

            {/* MAIN PREMIUM VIP CARD */}
            <div className="bg-gradient-to-b from-[#14234b] to-[#0c1735] rounded-[28px] p-5.5 border-2 border-brand-gold/60 shadow-xl relative overflow-hidden mb-4 text-white">
              {cycle === 'annual' && (
                <div className="absolute top-0 right-0 bg-brand-gold text-brand-navy text-[9px] font-black px-3.5 py-1 rounded-bl-xl uppercase tracking-widest shadow-xs">
                  Paling Hemat
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[9px] font-black text-brand-gold bg-brand-navy/80 border border-brand-gold/40 px-2.5 py-1 rounded-lg uppercase tracking-wider inline-block">
                    Akses Penuh VIP
                  </span>
                  <h3 className="text-lg font-black mt-2 flex items-center gap-1.5 text-white">
                    BILANO Premium <Crown className="w-4 h-4 fill-brand-gold text-brand-gold" />
                  </h3>
                </div>

                <div className="text-right">
                  {cycle === 'annual' ? (
                    <div>
                      <p className="text-[11px] text-slate-400 line-through font-bold">
                        Rp 228.000
                      </p>
                      <div className="flex items-baseline justify-end gap-1 mt-0.5">
                        <span className="text-2xl sm:text-3xl font-black text-brand-gold tracking-tight leading-none">
                          Rp 99.000
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          / tahun
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 font-medium mt-1">
                        (Rp 8.250 / bulan)
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-brand-gold tracking-tight leading-none">
                          Rp 19.000
                        </span>
                        <span className="text-xs text-slate-300 font-medium">
                          / bulan
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* BENEFIT LIST */}
              <div className="space-y-2.5 pt-3.5 border-t border-white/10 mb-3.5">
                <BenefitItem 
                  dark 
                  active 
                  highlight 
                  icon={<Crown className="w-3.5 h-3.5 text-brand-gold"/>} 
                  text={pitch.heroFeature} 
                />
                <BenefitItem dark active text="Konsultasi Asisten Finansial AI 24/7 Tanpa Batas" />
                <BenefitItem dark active text="Laporan Neraca & Radar Kebocoran Kas Lengkap" />
                <BenefitItem dark active text="Pemindai Struk Instan (OCR) & Dikte Suara AI" />
                <BenefitItem dark active text="Portofolio Saham, Kripto & Valas Multi-Mata Uang" />
                
                {/* E-BOOK BUNDLE HIGHLIGHT */}
                {cycle === 'annual' ? (
                  !countdown.isExpired ? (
                    <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl p-2.5 flex items-start gap-2.5 mt-2">
                      <Gift className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-black text-amber-300 leading-snug">
                          Bonus Spesial: Paket 5 E-Book Finansial Academy
                        </p>
                        <p className="text-[10px] text-slate-300 leading-normal mt-0.5 font-medium">
                          Harga normal Rp 29.000/tahun — <strong className="text-white font-bold">GRATIS</strong> khusus Paket Tahunan hari ini!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 flex items-start gap-2.5 mt-2 opacity-80">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-300 leading-snug">
                          Diskon Paket Tahunan 57% Aktif
                        </p>
                      </div>
                    </div>
                  )
                ) : (
                  <BenefitItem dark active={false} text="Paket 5 E-Book Finansial Academy (Khusus Paket Tahunan)" />
                )}
              </div>
            </div>

            {/* TRUST BADGE NOTICE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-3 mb-4 flex items-center gap-2.5 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-[11px] text-slate-600 leading-snug font-medium">
                <strong className="text-slate-800 font-bold">Jaminan Aman:</strong> Bayar 1 kali via QRIS/VA. <span className="text-emerald-700 font-bold">Tanpa auto-debit</span> & tanpa biaya tersembunyi.
              </p>
            </div>

            {/* PAYMENT SELECTOR */}
            <div className="flex flex-col gap-1.5 mb-5 relative" ref={dropdownRef}>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Metode Pembayaran
              </label>
              <button 
                onClick={() => setIsDropdownOpen(!isDropdownOpen)} 
                className="w-full bg-white border border-slate-200 hover:border-slate-300 rounded-2xl px-4 py-3 flex items-center justify-between shadow-xs group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-8 h-8 bg-slate-50 rounded-lg p-1 flex items-center justify-center shrink-0 border border-slate-100">
                    <PaymentIcon src={selectedMethodDetails.icon} name={selectedMethodDetails.name} />
                  </div>
                  <span className="font-bold text-slate-800 text-xs truncate">{selectedMethodDetails.name}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 transition-transform shrink-0 ml-2" />
              </button>

              {isDropdownOpen && (
                <ul className="absolute bottom-full left-0 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 mb-2 max-h-60 overflow-y-auto animate-in slide-in-from-bottom-2">
                  {PAYMENT_OPTIONS.map((opt) => (
                    <li 
                      key={opt.id} 
                      onClick={() => { setPaymentMethod(opt.id); setIsDropdownOpen(false); }} 
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${paymentMethod === opt.id ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'hover:bg-slate-50 text-slate-700'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 bg-slate-50 rounded-lg p-1 flex items-center justify-center shrink-0 border border-slate-100">
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
              className="w-full h-14 rounded-2xl text-xs font-black tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md bg-gradient-to-r from-brand-gold to-[#f5d77a] text-brand-navy hover:from-[#f2ce5d] hover:to-brand-gold cursor-pointer"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                <>AKTIFKAN {cycle === 'annual' ? 'PAKET TAHUNAN (RP 99.000)' : 'PAKET BULANAN (RP 19.000)'} <ArrowRight className="w-4 h-4 stroke-[2.5]" /></>
              )}
            </Button>
            
            {/* TRANSPARENT CONTINUE FREE BUTTON */}
            <div className="text-center mt-3">
              <button 
                type="button"
                onClick={handleContinueFree}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors py-1.5 px-4 cursor-pointer"
              >
                Lanjutkan dengan Versi Gratis Terbatas
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-3 font-semibold uppercase tracking-widest">
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