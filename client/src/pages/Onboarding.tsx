import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  ArrowRight, Download, CheckCircle2, X, Target, Fingerprint, Activity, Radar, Copy, RefreshCw, AlertCircle, ShieldCheck, Sparkles, LockKeyhole, ChevronDown
} from "lucide-react";
import { trackEvent } from "@/lib/tracking";

// =======================================================
// 🚀 DATABASE METODE PEMBAYARAN & LOGO (STABIL)
// =======================================================
const paymentOptions = [
  { id: "NQ", name: "QRIS (GoPay/OVO/Dana)", icon: "https://img.icons8.com/color/96/qr-code.png" },
  { id: "M2", name: "Mandiri Virtual Account", icon: "https://logo.clearbit.com/bankmandiri.co.id" },
  { id: "I1", name: "BNI Virtual Account", icon: "https://logo.clearbit.com/bni.co.id" },
  { id: "BR", name: "BRI Virtual Account", icon: "https://logo.clearbit.com/bri.co.id" },
  { id: "B1", name: "CIMB Niaga Virtual Account", icon: "https://logo.clearbit.com/cimbniaga.co.id" },
  { id: "BT", name: "Permata Virtual Account", icon: "https://logo.clearbit.com/permatabank.com" },
  { id: "BSI", name: "BSI Virtual Account", icon: "https://logo.clearbit.com/bankbsi.co.id" },
  { id: "D1", name: "Danamon Virtual Account", icon: "https://logo.clearbit.com/danamon.co.id" },
  { id: "VA", name: "Maybank Virtual Account", icon: "https://logo.clearbit.com/maybank.co.id" },
  { id: "SA", name: "Bank Sampoerna", icon: "https://logo.clearbit.com/banksampoerna.com" },
  { id: "NC", name: "Bank Neo Commerce", icon: "https://logo.clearbit.com/bankneocommerce.co.id" },
  { id: "AG", name: "Bank Artha Graha", icon: "https://logo.clearbit.com/arthagraha.com" },
  { id: "A1", name: "ATM Bersama", icon: "https://logo.clearbit.com/atmbersama.com" },
  { id: "FT", name: "Alfamart / Pegadaian / Pos", icon: "https://logo.clearbit.com/alfamart.co.id" }
];

// 🛡️ KOMPONEN PENGAMAN GAMBAR RUSAK (FALLBACK UI)
const PaymentIcon = ({ src, name }: { src: string, name: string }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError || !src) {
    // Jika gagal load, ambil 2 huruf depan sebagai inisial (Contoh: BNI -> BN)
    const initial = name.replace(/Virtual Account/i, "").replace(/Bank/i, "").trim().substring(0, 2).toUpperCase();
    return (
      <div className="w-full h-full bg-slate-200 flex items-center justify-center rounded text-[10px] font-black text-slate-800 tracking-tighter">
        {initial}
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt={name} 
      className="w-full h-full object-contain" 
      onError={() => setHasError(true)} 
    />
  );
};

export default function Onboarding() {
  const [, setLocation] = useLocation();
  
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState(true);
  
  const [answers, setAnswers] = useState({
    q1: "",
    q2: "",
    q3: "",
    q4: 0
  });

  const [selectedPlan, setSelectedPlan] = useState<"year" | "month" | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  // State Metode Pembayaran (Default ke NQ - NusaPay QRIS)
  const [paymentMethod, setPaymentMethod] = useState("NQ"); 
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false); 

  // State Khusus Custom Dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showManualInstall, setShowManualInstall] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);

  // Efek untuk menutup dropdown jika klik di luar area
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedMethodDetails = paymentOptions.find(p => p.id === paymentMethod) || paymentOptions[0];

  const getAssessment = () => {
    const { q1, q2, q3, q4 } = answers;
    const score = Number(q4);
    const yesCount = [q1, q2, q3].filter(a => a === 'Ya').length;

    if (yesCount === 3 && score >= 8) {
      return {
        title: "👑 Sang Visioner Finansial!",
        desc: `Luar biasa! Skor kamu (${score}/10) menunjukkan kamu sudah 100% siap untuk level up. Kamu punya visi yang tajam dan tekad baja. BILANO hadir bukan untuk menceramahi, tapi sebagai senjata rahasia kamu untuk mengakselerasi aset dan mewujudkan targetmu dengan presisi tinggi. Let's go!`,
        icon: <Target className="w-10 h-10 animate-pulse" />,
        highlight: "Mari kita eksekusi mahakarya finansialmu sekarang."
      };
    } else if (yesCount >= 2 && score >= 6) {
      return {
        title: "🚀 Sang Arsitek Kebiasaan!",
        desc: `Keren banget! Dengan skor ${score}/10, kamu sudah punya pondasi mindset yang super solid. Kamu sadar kekayaan dibangun dari konsistensi. BILANO akan jadi sahabat autopilot-mu untuk mengunci kebiasaan baik itu setiap hari. Siap melihat uangmu bertumbuh secara eksponensial?`,
        icon: <Fingerprint className="w-10 h-10 animate-pulse" />,
        highlight: "Mari mulai bangun kerajaan kecilmu hari ini."
      };
    } else if (q3 === 'Tidak' && score >= 7) {
      return {
        title: "⚡ Sang Pemikir Strategis!",
        desc: `Menarik! Kamu sangat sadar pentingnya masa depan (Skor: ${score}/10), tapi mungkin kamu tipe yang nggak mau ribet dengan rutinitas manual. Nggak masalah! Di situlah keajaiban BILANO bekerja. Biarkan sistem pintar kami yang melacak keuanganmu, sementara kamu tetap santai menikmati hidup!`,
        icon: <Activity className="w-10 h-10 animate-pulse" />,
        highlight: "Mari delegasikan keribetan finansialmu pada kami."
      };
    } else {
      return {
        title: "🌱 Penjelajah Potensi Baru!",
        desc: `Selamat datang di garis start! (Skor: ${score}/10). Nggak perlu overthinking kalau tujuanmu belum terlalu spesifik. Jadikan BILANO sebagai kompas ajaib yang akan merapikan arus kasmu tanpa tekanan. Santai saja, kita petakan masa depanmu pelan-pelan bersama!`,
        icon: <Radar className="w-10 h-10 animate-pulse" />,
        highlight: "Mari ambil langkah pertama yang paling menentukan."
      };
    }
  };

  const assessment = getAssessment();

  useEffect(() => {
    if (step === 0) trackEvent("onboarding_started");
    else if (step === 4) trackEvent("assessment_viewed", { profile: assessment.title });
    else if (step === 5) trackEvent("pricing_viewed");
    else if (step === 6) trackEvent("success_page_viewed");
  }, [step, assessment.title]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      const pendingDataStr = localStorage.getItem('bilano_pending_checkout');
      const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : {};
      
      fetch('/api/payment/claim-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pendingData)
      })
      .then(res => res.json())
      .then(data => {
          if (data.success && data.tempCode) {
              setAccessCode(data.tempCode);
              trackEvent("payment_success", pendingData); 
              localStorage.removeItem('bilano_pending_checkout'); 
              setStep(6);
              window.history.replaceState({}, '', '/onboarding');
          }
      }).catch(err => console.error("Gagal claim akun:", err));
    }
  }, []);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e); 
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = async () => {
    trackEvent("pwa_install_prompted");
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        trackEvent("pwa_install_accepted");
        setTimeout(() => setLocation('/auth'), 1500); 
      } else {
        trackEvent("pwa_install_dismissed");
      }
      setDeferredPrompt(null);
    } else {
      setShowManualInstall(true);
      trackEvent("pwa_manual_install_viewed");
    }
  };

  const handleAnswer = (key: string, value: any) => {
    trackEvent("quiz_step_answered", { question: key, answer: value });
    setAnswers(prev => ({ ...prev, [key]: value }));
    setFade(false);
    
    setTimeout(() => {
      setStep(prev => prev + 1);
      setFade(true);
    }, 300);
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    
    if (!formData.name || !formData.email || !formData.phone) {
      alert("Harap lengkapi semua data pembeli!");
      return;
    }

    setLoading(true);
    const price = selectedPlan === 'year' ? 99000 : 14900;

    // ❌ HAPUS ATAU KOMENTARI BARIS INI UNTUK MENCEGAH AUTO-LOGIN:
    // localStorage.setItem("bilano_email", formData.email.trim().toLowerCase());

    // SIMPAN DI SINI SAJA (Sudah aman mencakup seluruh data checkout)
    localStorage.setItem('bilano_pending_checkout', JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      plan: selectedPlan,
      amount: price,
      method: paymentMethod
    }));

    trackEvent("checkout_initiated", { plan: selectedPlan, method: paymentMethod });
    // ... sisa kode fetch payment tetap sama ...
    try {
      const productDetail = selectedPlan === 'year' ? 'Paket Tahunan BILANO' : 'Paket Bulanan BILANO';

      const response = await fetch('/api/payment/duitku-production', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          price,
          productDetail,
          customerName: formData.name,
          email: formData.email,
          phone: formData.phone,
          paymentMethod: paymentMethod 
        }),
      });

      const data = await response.json();

      if (data.success && data.paymentData) {
        setPaymentDetails(data.paymentData);
        setSelectedPlan(null); 
        setStep(7); 
      } else {
        alert(data.error || "Gagal terhubung ke sistem pembayaran Duitku.");
      }
    } catch (error) {
      console.error(error);
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPaymentStatus = async () => {
    setIsCheckingPayment(true);
    
    try {
      const pendingDataStr = localStorage.getItem('bilano_pending_checkout');
      const pendingData = pendingDataStr ? JSON.parse(pendingDataStr) : { email: formData.email };

      const response = await fetch('/api/payment/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingData)
      });
      
      const data = await response.json();
      
      if (data.success && data.isPaid) {
        const claimRes = await fetch('/api/payment/claim-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pendingData)
        });
        const claimData = await claimRes.json();
        
        if (claimData.success && claimData.tempCode) {
            setAccessCode(claimData.tempCode);
            trackEvent("payment_success", pendingData);
            localStorage.removeItem('bilano_pending_checkout');
            setStep(6);
        }
      } else {
        setShowPaymentAlert(true);
      }
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan pengecekan data ke server keuangan."); 
    } finally {
      setIsCheckingPayment(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#040814] w-full text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-lg z-10 flex flex-col items-center">
        
        {step < 4 && (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-2 mb-10">
              {[0, 1, 2, 3].map((idx) => (
                <div 
                  key={idx} 
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    step >= idx ? "w-8 bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "w-4 bg-slate-700"
                  }`}
                />
              ))}
            </div>
            
            <span className="text-amber-400 font-bold text-sm tracking-widest mb-6 uppercase">
              Pertanyaan {step + 1} / 4
            </span>

            <div className={`transition-opacity duration-300 w-full flex flex-col items-center text-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
              
              {step === 0 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-10">
                    Apakah kamu ingin masa depan finansialmu lebih terencana dibanding sekarang?
                  </h2>
                  <div className="w-full space-y-4">
                    <button onClick={() => handleAnswer('q1', 'Ya')} className="w-full py-4 rounded-2xl bg-[#121c3a] border border-white/10 hover:border-amber-400/50 hover:bg-[#172447] text-lg font-bold transition-all active:scale-95">Ya</button>
                    <button onClick={() => handleAnswer('q1', 'Tidak')} className="w-full py-4 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 text-lg font-bold transition-all active:scale-95">Tidak</button>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-10">
                    Apakah kamu termasuk orang yang ingin punya visi/arah keuangan yang jelas untuk masa depan?
                  </h2>
                  <div className="w-full space-y-4">
                    <button onClick={() => handleAnswer('q2', 'Ya')} className="w-full py-4 rounded-2xl bg-[#121c3a] border border-white/10 hover:border-amber-400/50 hover:bg-[#172447] text-lg font-bold transition-all active:scale-95">Ya</button>
                    <button onClick={() => handleAnswer('q2', 'Tidak')} className="w-full py-4 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 text-lg font-bold transition-all active:scale-95">Tidak</button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-10">
                    Apakah kamu bersedia membangun kebiasaan kecil setiap hari demi tujuan finansialmu, dengan bantuan BILANO?
                  </h2>
                  <div className="w-full space-y-4">
                    <button onClick={() => handleAnswer('q3', 'Ya')} className="w-full py-4 rounded-2xl bg-[#121c3a] border border-white/10 hover:border-amber-400/50 hover:bg-[#172447] text-lg font-bold transition-all active:scale-95">Ya</button>
                    <button onClick={() => handleAnswer('q3', 'Tidak')} className="w-full py-4 rounded-2xl bg-transparent border border-white/10 hover:bg-white/5 text-slate-400 text-lg font-bold transition-all active:scale-95">Tidak</button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h2 className="text-2xl md:text-3xl font-black leading-snug mb-4">
                    Seberapa penting bagi kamu untuk punya target keuangan yang jelas dan terarah?
                  </h2>
                  <p className="text-slate-400 mb-8 text-sm">Pilih skala 1 (Tidak Penting) hingga 10 (Sangat Penting)</p>
                  
                  <div className="flex flex-wrap justify-center gap-3 w-full">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <button 
                        key={num}
                        onClick={() => handleAnswer('q4', num)}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-[#121c3a] border border-white/10 text-white font-black text-lg hover:bg-amber-400 hover:text-black hover:border-amber-400 transition-all active:scale-90 flex items-center justify-center"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </>
              )}

            </div>
          </div>
        )}

        {step === 4 && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center text-center bg-gradient-to-b from-[#121c3a]/90 to-[#0a1128]/95 p-8 rounded-[32px] border border-amber-400/30 backdrop-blur-xl shadow-[0_15px_50px_rgba(251,191,36,0.15)] ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-20 h-20 bg-amber-400/20 text-amber-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_25px_rgba(251,191,36,0.25)]">
              {assessment.icon}
            </div>
            <h2 className="text-2xl md:text-3xl font-black mb-4 text-white drop-shadow-md">
              {assessment.title}
            </h2>
            <p className="text-slate-300 leading-relaxed mb-8 text-[15px] md:text-base max-w-sm">
              {assessment.desc}
              <br/><br/>
              <span className="font-black text-amber-400 tracking-wide">{assessment.highlight}</span>
            </p>
            <button 
              onClick={() => {
                setFade(false);
                setTimeout(() => { setStep(5); setFade(true); }, 300);
              }}
              className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-lg py-4 rounded-2xl shadow-[0_10px_30px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 border-b-[4px] border-amber-600 active:border-b-0 active:translate-y-[4px]"
            >
              🚀 GAS, MULAI SEKARANG! <ArrowRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {step === 5 && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black mb-2">Investasi Masa Depan</h2>
              <p className="text-slate-400 text-sm">Pilih paket akses penuh untuk menggunakan BILANO.</p>
            </div>

            <button 
              onClick={() => {
                trackEvent("plan_selected", { type: "year" }); 
                setSelectedPlan('year');
              }}
              className="relative w-full bg-[#121c3a] border-2 border-amber-400/80 rounded-[28px] p-6 text-left hover:bg-[#172447] hover:border-amber-400 transition-all mb-4 group overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-amber-400 text-black text-[10px] font-black px-4 py-1.5 rounded-bl-xl rounded-tr-[24px] uppercase tracking-wider">
                Paling Hemat
              </div>
              <h3 className="text-xl font-black text-white mb-1">Paket Akses Setahun</h3>
              <div className="flex items-end gap-1 mb-4">
                <span className="text-3xl font-black text-amber-400">Rp8.250</span>
                <span className="text-slate-400 text-sm mb-1">/ bulan</span>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Akses penuh 12 Bulan</li>
                <li className="flex items-center gap-2 text-sm text-slate-300"><CheckCircle2 className="w-4 h-4 text-emerald-400"/> Fitur Asisten AI & Scanner</li>
              </ul>
            </button>

            <button 
              onClick={() => {
                trackEvent("plan_selected", { type: "month" }); 
                setSelectedPlan('month');
              }}
              className="text-slate-400 text-sm font-semibold hover:text-white transition-colors underline decoration-slate-600 underline-offset-4 mb-8"
            >
              "Saya mau coba dulu" (Paket Sebulan Rp14.900)
            </button>

            <div className="w-full max-w-md space-y-3 text-left">
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 md:p-5">
                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                  <h4 className="font-bold text-sm tracking-wide">Garansi Kunci Harga Permanen</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  Seiring bertambahnya fitur AI ke depannya, harga untuk pengguna baru akan terus dinaikkan. Namun bagi Anda yang mengamankan akun hari ini, tarif perpanjangan akan <strong>dikunci mati selamanya di nominal awal</strong> tanpa biaya tambahan apa pun.
                </p>
              </div>

              <div className="bg-[#121c3a]/50 border border-white/5 rounded-2xl p-4 md:p-5">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-bold text-sm">Kenapa aplikasi ini berbayar?</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-2">
                  Kami menerapkan prinsip <em>"Skin in the Game"</em>. Sadarkah Anda, aplikasi gratisan seringkali hanya diunduh lalu diabaikan? 
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Dengan mengeluarkan biaya yang jauh lebih murah dari secangkir kopi, Anda sedang <strong>menciptakan komitmen psikologis</strong> pada diri sendiri untuk benar-benar disiplin merubah nasib keuangan Anda.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* 🚀 TAMPILAN KODE 6 DIGIT BARU */}
        {step === 6 && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center text-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black mb-2">Pembayaran Berhasil!</h2>
            <p className="text-slate-300 mb-8 leading-relaxed text-[15px]">
              Akun Premium Anda telah aktif. Berikut adalah <span className="font-bold text-amber-400">Kode Akses Rahasia</span> Anda.
            </p>

            <div className="bg-[#121c3a] border-2 border-rose-500/50 rounded-[28px] p-6 w-full max-w-sm mb-8 relative overflow-hidden shadow-[0_0_30px_rgba(244,63,94,0.15)]">
               <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-xl rounded-tr-[24px] uppercase tracking-wider flex items-center gap-1">
                 <LockKeyhole className="w-3 h-3" /> PENTING
               </div>
               <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3">Password Sementara Anda</p>
               
               <div className="bg-[#040814] py-4 px-6 rounded-2xl border border-slate-800 flex justify-between items-center mb-4 group">
                  <span className="text-4xl font-black tracking-[0.3em] text-white">
                    {accessCode || "------"}
                  </span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(accessCode || "");
                      alert('Kode Akses berhasil disalin!');
                    }} 
                    className="p-3 bg-amber-400/10 text-amber-400 rounded-xl hover:bg-amber-400 hover:text-black transition-colors"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
               </div>

               <p className="text-xs text-slate-300 leading-relaxed font-medium">
                 Silakan <strong>Simpan/Screenshot kode ini</strong> sekarang juga. Kode ini digunakan untuk login masuk aplikasi pertama kali.
               </p>
            </div>

            <button
              onClick={handlePwaInstall}
              className="w-full max-w-[400px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.1rem] tracking-wide py-5 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
            >
              <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
              SAYA SUDAH SIMPAN & INSTALL PWA
            </button>
            <p className="text-[10px] text-slate-500 mt-4 max-w-xs text-center">
              Setelah install, aplikasi akan meminta Anda memasukkan email dan kode di atas untuk masuk.
            </p>
          </div>
        )}

        {step === 7 && paymentDetails && (
          <div className={`transition-opacity duration-500 w-full flex flex-col items-center ${fade ? 'opacity-100' : 'opacity-0'}`}>
            <div className="bg-[#121c3a]/90 border border-white/10 rounded-[32px] p-6 lg:p-8 text-center w-full max-w-md shadow-2xl relative">
              <h2 className="text-2xl font-black mb-2 text-white">Selesaikan Pembayaran</h2>
              <p className="text-slate-400 text-sm mb-6">
                {paymentDetails.qrString || paymentDetails.paymentUrl?.includes("qris") 
                  ? "Scan kode QR di bawah menggunakan e-Wallet atau M-Banking kamu:" 
                  : "Silakan lakukan transfer ke rekening Virtual Account berikut:"}
              </p>

              <div className="bg-[#040814] rounded-2xl p-6 border border-white/5 mb-6 shadow-inner">
                {paymentDetails.qrString || paymentDetails.paymentUrl?.includes("qris") ? (
                  <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl mb-4">
                    <img 
                      src={paymentDetails.qrString 
                        ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(paymentDetails.qrString)}` 
                        : paymentDetails.paymentUrl
                      } 
                      alt="QRIS Code BILANO" 
                      className="w-48 h-48 object-contain"
                    />
                    <span className="text-slate-800 text-[10px] font-bold mt-2 tracking-wider">QRIS AUTOMATIC VERIFY</span>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                      Nomor Virtual Account ({selectedMethodDetails.name})
                    </p>
                    <div className="flex items-center justify-between bg-[#121c3a] border border-white/10 rounded-xl p-4 mb-4 group">
                      <span className="text-xl lg:text-2xl font-black tracking-widest text-white">
                        {paymentDetails.vaNumber}
                      </span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(paymentDetails.vaNumber);
                          alert('Nomor VA berhasil disalin!');
                        }} 
                        className="p-2 bg-amber-400/10 text-amber-400 rounded-lg hover:bg-amber-400 hover:text-black transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}

                <div className="pt-2 border-t border-white/5">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Tagihan</p>
                  <span className="text-3xl font-black text-amber-400">
                    Rp {parseInt(paymentDetails.amount).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                onClick={handleRefreshPaymentStatus}
                disabled={isCheckingPayment}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-[#0a1128] font-black text-sm py-4 rounded-xl shadow-[0_10px_30px_rgba(251,191,36,0.3)] transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-75"
              >
                {isCheckingPayment ? (
                  <RefreshCw className="w-5 h-5 animate-spin" /> 
                ) : (
                  <RefreshCw className="w-5 h-5" />
                )}
                {isCheckingPayment ? "MENYINGKRONKAN DATA..." : "REFRESH STATUS PEMBAYARAN"}
              </button>

              <button
                onClick={() => {
                  setPaymentDetails(null);
                  setStep(5); 
                }}
                className="mt-5 text-[13px] font-semibold text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-4 block w-full text-center"
              >
                Ganti Metode Pembayaran
              </button>

            </div>
          </div>
        )}

      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200">
            
            <button 
              onClick={() => setSelectedPlan(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-xl font-black mb-4 pr-8">Konfirmasi Pembayaran</h3>
            
            <div className="bg-[#0a1128] rounded-2xl p-4 mb-5 border border-white/5">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-400 text-sm">Paket Dipilih</span>
                <span className="font-bold text-white text-sm">
                  {selectedPlan === 'year' ? '12 Bulan' : '1 Bulan'}
                </span>
              </div>
              <div className="h-[1px] w-full bg-white/10 mb-3"></div>
              <div className="flex justify-between items-end">
                <span className="text-slate-300 font-medium text-sm">Total Tagihan</span>
                <span className="text-2xl font-black text-amber-400">
                  {selectedPlan === 'year' ? 'Rp99.000' : 'Rp14.900'}
                </span>
              </div>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-3">
              <input
                type="text"
                required
                placeholder="Nama Lengkap"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              />
              
              <div className="flex flex-col gap-1 w-full">
                <input
                  type="email"
                  required
                  placeholder="Alamat Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
                />
                <p className="text-[10px] text-amber-400/90 text-left pl-1 leading-normal">
                  *Penting: Alamat email ini akan dikunci sebagai satu-satunya akun akses login kamu ke sistem PWA BILANO setelah verifikasi selesai.
                </p>
              </div>

              <input
                type="tel"
                required
                placeholder="Nomor Telepon"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors mb-2"
              />

              {/* 🔥 CUSTOM DROPDOWN UI UNTUK METODE PEMBAYARAN DENGAN LOGO */}
              <div className="flex flex-col gap-1 mb-2 relative" ref={dropdownRef}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Metode Pembayaran
                </label>
                
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-md p-1 flex items-center justify-center shrink-0">
                      <PaymentIcon src={selectedMethodDetails.icon} name={selectedMethodDetails.name} />
                    </div>
                    <span className="font-semibold text-left line-clamp-1">{selectedMethodDetails.name}</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown List Items */}
                {isDropdownOpen && (
                  <ul className="absolute top-[105%] left-0 w-full bg-[#121c3a] border border-white/10 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden flex flex-col p-2 gap-1">
                    {paymentOptions.map((option) => (
                      <li 
                        key={option.id}
                        onClick={() => {
                          setPaymentMethod(option.id);
                          setIsDropdownOpen(false);
                        }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${paymentMethod === option.id ? 'bg-amber-400/10 border border-amber-400/20' : 'hover:bg-white/5 border border-transparent'}`}
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

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center mt-2"
              >
                {loading ? "MEMPROSES..." : "BAYAR SEKARANG"}
              </button>
            </form>

          </div>
        </div>
      )}

      {showManualInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200 text-center">
            <button 
              onClick={() => setShowManualInstall(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black mb-3">Install Manual</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed text-left">
              Browser Anda saat ini membatasi instalasi otomatis (biasanya terjadi pada mode penyamaran/Incognito, atau jika aplikasi sudah terpasang di perangkat). Untuk memasang BILANO:
              <br/><br/>
              1. Ketuk ikon <strong>Titik Tiga (⋮)</strong> atau <strong>Share</strong> di ujung browser Anda.<br/>
              2. Pilih opsi <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home Screen) atau <strong>"Install App"</strong>.<br/>
            </p>

            <button 
              onClick={() => setShowManualInstall(false)}
              className="w-full bg-slate-100 hover:bg-white text-black font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            >
              SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {showPaymentAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200 text-center shadow-2xl">
            <button 
              onClick={() => setShowPaymentAlert(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <h3 className="text-xl font-black mb-3">Dana Belum Masuk</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Sistem belum mendeteksi mutasi masuk pada Virtual Account atau QRIS Anda.
              <br/><br/>
              Jika baru saja mentransfer, mohon tunggu <strong>1-3 menit</strong> untuk proses sinkronisasi perbankan, lalu ketuk kembali tombol Refresh Status.
            </p>

            <button 
              onClick={() => setShowPaymentAlert(false)}
              className="w-full bg-slate-100 hover:bg-white text-black font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            >
              SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

    </div>
  );
}