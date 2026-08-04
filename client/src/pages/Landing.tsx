import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  ShieldCheck, ChevronDown, Star, LayoutDashboard, Download, Mail, Phone, MapPin,
  Play, Volume2, VolumeX, X
} from "lucide-react";
import { trackEvent } from "@/lib/tracking";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // =======================================================
  // 🚀 MESIN TEKS DINAMIS (VERSI VISI KEKAYAAN)
  // =======================================================
  const headlines = [
    { top: "Bukan Sekadar Mengelola Uang,", bottom: "Saatnya Bangun Visi Kekayaan." },
    { top: "Jangan Cuma Catat Saldo,", bottom: "Eksekusi Target Nominal Besarmu." },
    { top: "Kunci Visi Jangka Panjang,", bottom: "Wujudkan Angka Kekayaan Nyata." },
    { top: "Berhenti Mengatur Uang Pasif,", bottom: "Mulai Kawal Tujuan Finansialmu." }
  ];
  const [headlineIdx, setHeadlineIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); 
      setTimeout(() => {
        setHeadlineIdx((prev) => (prev + 1) % headlines.length);
        setFade(true); 
      }, 300); 
    }, 3500); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    trackEvent("landing_page_viewed", { 
      device: typeof window !== 'undefined' && window.innerWidth < 1024 ? "mobile" : "desktop" 
    });
  }, []);

  // =======================================================
  // 🚀 STATE PWA INSTALLATION (Pembaruan Flow)
  // =======================================================
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false); // State untuk Pop-up Proses Install
  const [showManualInstall, setShowManualInstall] = useState(false); // State untuk Pop-up Langkah Alternatif

  useEffect(() => {
    if ((window as any).deferredPwaPrompt) {
      setDeferredPrompt((window as any).deferredPwaPrompt);
    }
    const handler = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e);
      (window as any).deferredPwaPrompt = e; 
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handlePwaInstall = async () => {
    trackEvent("pwa_install_prompted");
    setIsInstalling(true); // 1. Tampilkan Pop-up "Sedang menginstall..."

    const promptEvent = deferredPrompt || (window as any).deferredPwaPrompt;
    
    // 2. Usahakan SECARA MAKSIMAL trigger install bawaan browser
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        if (outcome === 'accepted') {
          trackEvent("pwa_install_accepted");
          setDeferredPrompt(null);
          (window as any).deferredPwaPrompt = null;
          setIsInstalling(false);
          setTimeout(() => setLocation('/auth'), 500); 
        } else {
          trackEvent("pwa_install_dismissed");
          // Jika ditolak, pop-up "Sedang menginstall" dibiarkan agar user bisa klik opsi kendala
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    } else {
      // Jika prompt tidak ada (iOS/Incognito), pop-up "Sedang menginstall" akan tetap muncul
      // sehingga user bisa secara sadar mengklik tulisan kendala
      trackEvent("pwa_manual_install_needed");
    }
  };

  // =======================================================
  // 🎥 STATE VIDEO PLAYER
  // =======================================================
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isMuted, setIsMuted] = useState(false); 
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      videoRef.current.muted = false; 
      setIsMuted(false);
      setIsPlaying(true);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    setTimeLeft(e.currentTarget.duration);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const remaining = Math.max(0, video.duration - video.currentTime);
    setTimeLeft(remaining);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const faqs = [
    { 
      q: "Apa bedanya BILANO dengan aplikasi keuangan biasa?", 
      a: "BILANO bukan sekadar aplikasi pencatat uang biasa. Kami hadir untuk memandu dan memastikan visi finansial jangka panjangmu benar-benar tercapai. Jika aplikasi lain hanya mencatat ke mana uang pergi, BILANO fokus membangun kebiasaan agar uangmu terkumpul untuk masa depan." 
    },
    { 
      q: "Apakah data keuangan saya aman di sini?", 
      a: "Sangat aman. BILANO berfungsi sebagai jurnal cerdas pribadi. Kami menggunakan enkripsi penuh dan TIDAK terhubung langsung ke rekening asli Anda untuk mencegah risiko peretasan saldo." 
    },
    { 
      q: "Mengapa aplikasi ini tidak ada di Play Store?", 
      a: "BILANO menggunakan teknologi masa depan berbasis PWA (Progressive Web App). Anda tidak perlu mengunduh file APK yang berat atau menunggu update dari Play Store. Aplikasi langsung terhubung, lebih cepat, dan sangat hemat memori HP." 
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a1128] to-[#040814] w-full selection:bg-blue-900 font-sans relative overflow-x-hidden flex flex-col items-center">
      
      {/* ✨ CAHAYA NEON */}
      <div className="absolute top-[-5%] left-[-20%] lg:left-[5%] w-96 lg:w-[700px] h-96 lg:h-[700px] bg-blue-600/10 lg:bg-blue-600/15 rounded-full blur-[100px] lg:blur-[180px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-20%] lg:right-[5%] w-80 lg:w-[600px] h-80 lg:h-[600px] bg-amber-500/5 lg:bg-amber-500/10 rounded-full blur-[100px] lg:blur-[180px] pointer-events-none"></div>

      <div className="w-full max-w-[100vw] lg:max-w-[1100px] mx-auto flex flex-col relative z-10 flex-1">
        
        {/* 🚀 HEADER */}
        <header className="px-5 sm:px-6 lg:px-10 pt-6 pb-2 animate-in slide-in-from-top-4 fade-in duration-500 w-full lg:pt-10">
          <div className="bg-white rounded-[20px] p-3.5 lg:p-4 flex items-center justify-center shadow-lg shadow-black/20 border border-slate-100 w-full max-w-7xl mx-auto">
            <img src="/Bilano_horiz_rbg.png" alt="Bilano Logo" className="h-8 md:h-10 object-contain" />
          </div>
        </header>

        {/* 🚀 MAIN CONTENT */}
        <main className="px-5 sm:px-6 lg:px-10 pt-6 pb-16 lg:pb-12 flex flex-col gap-10 sm:gap-14 lg:gap-20 w-full items-center">
          
          {/* 🔥 1. HERO SECTION */}
          <section className="w-full min-w-0 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-100 fill-mode-both max-w-6xl mx-auto mt-2 px-2 sm:px-4 lg:px-0">
            
            <div className="flex-1 min-w-0 flex flex-col gap-3 lg:gap-4 text-center lg:text-left items-center lg:items-start z-20 w-full pt-4 lg:pt-0">
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full w-fit shadow-inner">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-amber-400 text-[10px] md:text-xs font-bold tracking-wide">Akses Eksklusif Khusus Hari Ini</span>
              </div>
              
              <h2 className={`w-full text-center lg:text-left text-[2.2rem] sm:text-[2.7rem] md:text-[3.5rem] lg:text-[4.2rem] leading-[1.05] font-black tracking-tight drop-shadow-md transition-opacity duration-300 px-2 lg:px-0 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-white block">{headlines[headlineIdx].top}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 block">
                  {headlines[headlineIdx].bottom}
                </span>
              </h2>
            </div>

            <div className="flex-1 relative w-full flex justify-center lg:justify-end z-10 -mt-6 md:-mt-8 lg:mt-0">
              <div className="relative inline-flex flex-col items-center w-full max-w-[460px]">
                  <img 
                    src="/adrienfandra_photos.png" 
                    alt="Adrien Fandra" 
                    className="w-[95%] h-auto object-contain drop-shadow-[-25px_15px_25px_rgba(0,0,0,0.65)] hover:-translate-y-2 transition-transform duration-700 ease-out relative z-10" 
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080d20] to-transparent z-20 pointer-events-none"></div>
                  
                  <div className="absolute bottom-[5%] left-1/2 lg:left-auto right-auto lg:right-[5%] flex flex-col items-center lg:items-start animate-in zoom-in slide-in-from-bottom-6 fade-in duration-700 delay-500 z-30 hover:scale-105 transition-transform cursor-default scale-[0.75] origin-bottom lg:scale-100 -translate-x-1/2 lg:translate-x-0">
                    <div className="bg-[#1111aa] text-white px-5 py-2 lg:px-6 lg:py-3 shadow-xl relative z-10 translate-y-1.5 -translate-x-3 border border-blue-900/50">
                      <p className="text-[20px] lg:text-[24px] font-black tracking-wide">Adrien Fandra</p>
                    </div>
                    <div className="bg-[#ffcc44] text-[#0a1128] px-5 py-2.5 lg:px-6 lg:py-3 shadow-2xl relative z-0 border border-amber-500/50">
                      <p className="text-[14px] lg:text-[16px] font-extrabold tracking-wide">
                        Content Creator & <br className="lg:hidden" />Founder BILANO
                      </p>
                    </div>
                  </div>
              </div>
            </div>

          </section>

          {/* 🔥 2. UI SCREENSHOT GALLERY */}
          <section className="animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300 fill-mode-both w-full max-w-7xl">
            <div className="mb-4 lg:mb-6 lg:text-center max-w-lg lg:mx-auto">
              <h3 className="text-lg lg:text-xl font-black text-white flex items-center gap-2 lg:justify-center">
                  <LayoutDashboard className="w-5 h-5 text-amber-400"/> Intip Dalamnya BILANO
              </h3>
              <p className="text-slate-400 text-sm mt-1 lg:text-base">Geser untuk melihat UI Poster Premium kami.</p>
            </div>
            
            <div className="flex overflow-x-auto gap-5 pb-6 snap-x snap-mandatory -mx-6 px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] lg:justify-center">
                {[
                  { img: "Home.jpg", title: "Dasbor Utama" },
                  { img: "ChatAI.jpg", title: "Asisten AI Cerdas" },
                  { img: "Scan.jpg", title: "Scan Struk Otomatis" },
                  { img: "Valas.jpg", title: "Portofolio Valas" },
                  { img: "Performa.jpg", title: "Analisa Performa" }
                ].map((item, i) => (
                  <div key={i} className="snap-center shrink-0 w-[80%] sm:w-[65%] lg:w-[220px] aspect-[9/16] bg-[#040814] rounded-[24px] overflow-hidden border-[4px] border-white/10 shadow-2xl relative group">
                    <img src={`/${item.img}`} alt={item.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x700/121c3a/475569?text=Poster+UI' }} />
                  </div>
                ))}
            </div>
          </section>

          {/* 🔥 3. VIDEO PREVIEW */}
          <section className="animate-in slide-in-from-bottom-10 fade-in duration-700 delay-300 fill-mode-both w-full max-w-4xl mx-auto flex flex-col items-center">
            <div className="w-full text-center mb-6">
              <span className="text-xs font-black tracking-widest text-amber-400 uppercase drop-shadow">Eksklusif Preview</span>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md mt-2">Kawal Visi Finansialmu</h2>
            </div>

            <div className="w-full aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.5)] border border-white