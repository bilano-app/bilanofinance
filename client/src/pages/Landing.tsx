import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  ShieldCheck, ChevronDown, Star, LayoutDashboard, Download, Mail, Phone, MapPin,
  Play, Volume2, VolumeX, X, ExternalLink, MoreVertical, Share2, Sparkles
} from "lucide-react";
import { trackEvent } from "@/lib/tracking";
import { isInAppBrowser, isIOS, buildChromeIntentUrl } from "@/lib/browserDetect";
import { initTrialSession } from "@/lib/trial-data";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  // =======================================================
  // 🕵️ DETEKSI WEBVIEW INSTAGRAM/FACEBOOK & PLATFORM
  // PWA tidak bisa diinstall sama sekali dari dalam webview IG/FB -
  // ini batasan platform mereka, bukan sesuatu yang bisa ditambal
  // dari sisi kode kita. Jadi kita deteksi dulu sebelum coba install.
  // =======================================================
  const [inAppBrowser] = useState(isInAppBrowser);
  const [onIOS] = useState(isIOS);
  const [showOpenExternal, setShowOpenExternal] = useState(false);
  const [justEscapedWebview, setJustEscapedWebview] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("src") === "ig_redirect") {
      setJustEscapedWebview(true);
      trackEvent("escaped_ig_webview_success");
      params.delete("src");
      const cleanUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : "");
      window.history.replaceState(null, "", cleanUrl);
    }
  }, []);

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
  const [isInstallSuccess, setIsInstallSuccess] = useState(false); // State untuk Pop-up Sukses Pemasangan PWA
  const [isBottomBtnVisible, setIsBottomBtnVisible] = useState(false);
  const bottomInstallBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBottomBtnVisible(entry.isIntersecting);
      },
      { threshold: 0.15 }
    );

    if (bottomInstallBtnRef.current) {
      observer.observe(bottomInstallBtnRef.current);
    }

    return () => observer.disconnect();
  }, []);

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

  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalling(false);
      setShowManualInstall(false);
      setIsInstallSuccess(true);
      trackEvent("pwa_app_installed_celebration");
    };

    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  // 🔥 Khusus skema perpindahan dari webview Instagram/Facebook ke Chrome atau trigger install dari app:
  // Otomatis scroll mulus ke tombol install di bagian bawah
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isFromInApp = searchParams.get("from_inapp") === "true" || searchParams.get("from") === "inapp" || searchParams.get("from") === "instagram" || searchParams.get("action") === "install";
    
    if (isFromInApp) {
      const scrollTimer = setTimeout(() => {
        if (bottomInstallBtnRef.current) {
          bottomInstallBtnRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 600);
      return () => clearTimeout(scrollTimer);
    }
  }, []);

  const handlePwaInstall = async () => {
    trackEvent("pwa_install_button_clicked", { inAppBrowser, onIOS });

    // 🚧 Kalau masih di dalam webview Instagram/Facebook, instalasi PWA
    // TIDAK MUNGKIN dilakukan dari sini - browser bawaan mereka tidak
    // mendukungnya sama sekali. Arahkan keluar dulu sebelum lanjut install.
    if (inAppBrowser) {
      trackEvent("open_external_browser_prompted");
      setShowOpenExternal(true);
      return;
    }

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
          setIsInstallSuccess(true);
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

  // Khusus Android: paksa pindah dari webview IG/FB ke Chrome asli.
  // Tidak ada equivalent-nya di iOS (lihat komentar di browserDetect.ts).
  const handleOpenInChrome = () => {
    trackEvent("open_in_chrome_tapped");
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("from_inapp", "true");
    window.location.href = buildChromeIntentUrl(currentUrl.toString());
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
            <img src="/BILANO-LOGO-NEW.png" alt="Bilano Logo" className="h-8 md:h-10 object-contain" />
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
                <LayoutDashboard className="w-5 h-5 text-amber-400" /> Intip Dalamnya BILANO
              </h3>
              <p className="text-slate-400 text-sm mt-1 lg:text-base">Geser untuk melihat UI Poster Premium kami.</p>
            </div>

            <div className="flex overflow-x-auto gap-5 pb-6 snap-x snap-mandatory -mx-6 px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] lg:justify-center">
              {[
                { img: "Home.png", title: "Dasbor Utama" },
                { img: "Penghasilan.png", title: "Asisten AI Cerdas" },
                { img: "Konsultasi.png", title: "Scan Struk Otomatis" },
                { img: "Valas.png", title: "Portofolio Valas" },
                { img: "E-Book.png", title: "Analisa Performa" },
                { img: "Analisis.png", title: "Analisa Performa" }
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

            <div className="w-full aspect-video bg-slate-900 rounded-[32px] overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.5)] border border-white/10 relative">
              <div className="absolute inset-0 z-0">
                <video
                  ref={videoRef}
                  playsInline
                  muted={isMuted}
                  preload="auto"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-cover"
                >
                  <source src="/Bilano-Preview.mp4" type="video/mp4" />
                  Browser Anda tidak mendukung pemutar video.
                </video>
                <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/50 via-transparent to-transparent h-24 z-10 pointer-events-none"></div>
              </div>

              {!isPlaying && (
                <div className="absolute inset-0 z-40 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all">
                  <button
                    onClick={handlePlayVideo}
                    className="w-16 h-16 md:w-20 md:h-20 bg-amber-400 text-[#0a1128] rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(251,191,36,0.4)] hover:scale-110 hover:bg-amber-300 active:scale-95 transition-all mb-4"
                  >
                    <Play fill="currentColor" size={32} className="ml-2 md:w-9 md:h-9" />
                  </button>
                  <p className="text-white font-bold tracking-widest text-xs md:text-sm drop-shadow-md">PUTAR VIDEO</p>
                </div>
              )}

              <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30">
                <div className="bg-black/60 backdrop-blur-md text-white font-mono font-bold text-xs md:text-sm px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 flex items-center gap-2 shadow-md">
                  <span className={`w-2 h-2 bg-red-500 rounded-full ${isPlaying ? 'animate-pulse' : ''}`}></span>
                  {formatTime(timeLeft)}
                </div>
              </div>

              <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !isMuted;
                      setIsMuted(!isMuted);
                    }
                  }}
                  className="p-2 md:p-3 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 active:scale-95 transition-transform hover:bg-black/60"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              </div>
            </div>
          </section>

          {/* 🚀 BANNER: MUNCUL SETELAH USER BERHASIL PINDAH DARI WEBVIEW IG KE CHROME */}
          {justEscapedWebview && (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full shadow-inner">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-[11px] md:text-xs font-bold tracking-wide">Sip, sudah di browser! Tinggal 1 tombol lagi di bawah.</span>
              </div>
            </div>
          )}

          {/* 🔥 4. TOMBOL INSTALL PWA UTAMA (DI ATAS FAQ) */}
          <div ref={bottomInstallBtnRef} className="w-full flex flex-col items-center justify-center animate-in slide-in-from-bottom-10 fade-in duration-700 delay-400 fill-mode-both max-w-7xl px-4 lg:px-0 mb-8 gap-3">
            <button
              onClick={handlePwaInstall}
              className="w-full max-w-[400px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.1rem] md:text-[1.2rem] tracking-wide py-5 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px] cursor-pointer"
            >
              <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
              <span>INSTALL BILANO SEKARANG</span>
            </button>

            <button
              onClick={() => {
                trackEvent("try_in_browser_clicked", { source: "main_cta" });
                initTrialSession();
                window.location.href = "/?trial=true";
              }}
              type="button"
              className="w-full max-w-[400px] bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white font-bold text-sm tracking-wide py-3.5 px-6 rounded-[20px] border border-white/15 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer shadow-sm"
            >
              <span>Atau Coba Langsung di Browser →</span>
            </button>
          </div>

          {/* 🚀 FLOATING STICKY INSTALL BUTTON (MUNCUL KETIKA TOMBOL UTAMA TIDAK DI AREA PANDANG) */}
          {!isBottomBtnVisible && (
            <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none animate-in fade-in slide-in-from-bottom-5 duration-300">
              <div className="pointer-events-auto w-full max-w-[440px] bg-[#0c142c]/95 backdrop-blur-xl border border-amber-400/30 p-2.5 rounded-[26px] shadow-[0_15px_40px_rgba(0,0,0,0.7)] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 pl-2">
                  <img src="/BILANO-ICON-NEW.png" alt="Bilano" className="w-8 h-8 object-contain rounded-lg shrink-0" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-white uppercase tracking-wider leading-tight">BILANO PWA</span>
                    <span className="text-[9px] text-amber-400 font-bold">Kawal Visi Finansial</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      trackEvent("try_in_browser_clicked", { source: "sticky_bar" });
                      initTrialSession();
                      window.location.href = "/?trial=true";
                    }}
                    type="button"
                    className="text-[11px] font-bold text-slate-300 hover:text-white px-2 py-2 transition-colors cursor-pointer"
                  >
                    Coba di Web
                  </button>
                  <button
                    onClick={handlePwaInstall}
                    className="bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-xs md:text-sm tracking-wide py-2.5 px-3.5 md:px-5 rounded-2xl shadow-md active:scale-95 transition-all flex items-center gap-1.5 border-b-2 border-amber-600 cursor-pointer shrink-0"
                  >
                    <Download strokeWidth={3} className="w-3.5 h-3.5 animate-bounce" />
                    <span>INSTALL</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🔥 5. LANGKAH INSTALL & FAQ */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 w-full max-w-7xl">
            <section className="bg-[#121c3a]/50 backdrop-blur-xl border border-white/5 rounded-[28px] p-6 text-white shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-700 delay-400 fill-mode-both lg:p-8 flex-1">
              <h3 className="text-lg font-black mb-5 text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5" /> Cara Cepat Pasang
              </h3>
              <div className="space-y-5 lg:space-y-6">
                <Step num="1" text="Tekan tombol INSTALL SEKARANG yang berwarna kuning di halaman ini." />
                <Step num="2" text="Sistem akan langsung menampilkan jendela konfirmasi instalasi aplikasi." />
                <Step num="3" text="Selesai! Ikon BILANO akan muncul di HP Anda layaknya aplikasi asli, tanpa memakan memori." />
              </div>
            </section>

            <section className="animate-in slide-in-from-bottom-10 fade-in duration-700 delay-500 fill-mode-both lg:flex-1">
              <h3 className="text-lg lg:text-xl font-black mb-5 text-white">Sering Ditanyakan</h3>
              <div className="space-y-3 lg:space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="bg-[#121c3a] border border-white/5 rounded-2xl overflow-hidden transition-all hover:border-white/10">
                    <button
                      onClick={() => {
                        const isOpening = openFaq !== idx;
                        setOpenFaq(isOpening ? idx : null);
                        if (isOpening) {
                          trackEvent("faq_toggled", { question: faq.q });
                        }
                      }}
                      className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-slate-200 lg:p-5 lg:text-base"
                    >
                      {faq.q}
                      <ChevronDown className={`w-4 h-4 lg:w-5 lg:h-5 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-amber-400' : 'text-slate-500'}`} />
                    </button>
                    {openFaq === idx && (
                      <div className="px-4 pb-4 text-[13px] text-slate-400 leading-relaxed border-t border-white/5 pt-3 lg:px-5 lg:pb-5 lg:text-[14.5px]">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>

        {/* 🚀 FOOTER */}
        <footer className="mt-auto pb-10 pt-10 text-center relative z-10 border-t border-white/5 w-full flex flex-col items-center px-4">
          <img src="/BILANO-LOGO-NEW.png" alt="Bilano" className="h-5 mx-auto mb-6 opacity-50 grayscale mix-blend-screen" />
          <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-8 mb-8 text-slate-400 text-xs md:text-[13px] font-medium">
            <div className="flex items-center gap-2 hover:text-amber-400 transition-colors cursor-default">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>bilanotech@gmail.com</span>
            </div>
            <div className="flex items-center gap-2 hover:text-amber-400 transition-colors cursor-default">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>+6289688113210</span>
            </div>
            <div className="flex items-start gap-2 hover:text-amber-400 transition-colors cursor-default">
              <MapPin className="mt-1 w-4 h-4 text-slate-500" />
              <span className="leading-5 text-center">
                Jakarta, Indonesia
              </span>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-slate-600 font-medium">© {new Date().getFullYear()} Bilano Official</p>
        </footer>
      </div>

      {/* 🚀 MODAL 1: SEDANG MENGINSTALL (Ditampilkan pertama kali saat klik tombol) */}
      {isInstalling && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200 text-center shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setIsInstalling(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-5">
              <Download className="w-8 h-8 animate-bounce" />
            </div>

            <h3 className="text-xl font-black mb-2 text-white">Memproses Instalasi...</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Mohon ikuti instruksi pemasangan pada pop-up sistem di layar perangkat Anda (jika muncul).
            </p>

            <button
              onClick={() => {
                setIsInstalling(false);
                setShowManualInstall(true); // Memanggil modal langkah alternatif
              }}
              className="text-[13px] font-bold text-slate-400 hover:text-amber-400 underline underline-offset-4 transition-colors p-2"
            >
              Apakah ada kendala saat instalasi? Klik di sini
            </button>
          </div>
        </div>
      )}

      {/* 🛠️ MODAL 2: LANGKAH ALTERNATIF (Hanya muncul jika tulisan kendala di atas dipencet) */}
      {showManualInstall && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200 text-center shadow-2xl">
            <button
              onClick={() => setShowManualInstall(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black mb-3 text-white">Langkah Alternatif</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed text-left">
              {onIOS ? (
                <>
                  Safari di iPhone/iPad memang tidak punya pop-up instal otomatis. Cara pasang manual:
                  <br /><br />
                  1. Ketuk ikon <strong>Share (kotak dengan panah ke atas)</strong> di bagian bawah Safari.<br />
                  2. Geser ke bawah, pilih <strong>"Tambah ke Layar Utama"</strong>.<br />
                  3. Ketuk <strong>"Tambah"</strong> di pojok kanan atas.
                </>
              ) : (
                <>
                  Browser Anda mungkin membatasi instalasi otomatis (biasanya Mode Incognito). Cara pasang manual:
                  <br /><br />
                  1. Ketuk ikon <strong>Titik Tiga (⋮)</strong> di pojok kanan atas browser.<br />
                  2. Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install App"</strong>.
                </>
              )}
            </p>

            <button
              onClick={() => setShowManualInstall(false)}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a1128] font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center"
            >
              SAYA MENGERTI
            </button>
          </div>
        </div>
      )}

      {/* 🚧 MODAL 3: BUKA DI BROWSER DULU (Khusus webview Instagram/Facebook) */}
      {showOpenExternal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#121c3a] border border-white/10 rounded-[32px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-200 text-center shadow-2xl">
            <button
              onClick={() => setShowOpenExternal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-16 h-16 mx-auto bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
              <ExternalLink className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black mb-2 text-white">Buka di Browser Dulu, Yuk</h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Instagram membatasi instalasi aplikasi langsung dari dalamnya. Tenang, cuma butuh satu langkah tambahan kok.
            </p>

            {onIOS ? (
              <div className="text-left bg-white/5 rounded-2xl p-4 mb-6 space-y-3">
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center font-black text-[11px] border border-amber-400/20">1</span>
                  <p className="text-slate-300 text-[13px] leading-relaxed pt-0.5">
                    Ketuk ikon <MoreVertical className="w-3.5 h-3.5 inline -mt-0.5" /> <strong className="text-white">Titik Tiga</strong> di pojok kanan atas layar ini.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center font-black text-[11px] border border-amber-400/20">2</span>
                  <p className="text-slate-300 text-[13px] leading-relaxed pt-0.5">
                    Pilih <strong className="text-white">"Buka di Safari"</strong>.
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center font-black text-[11px] border border-amber-400/20">3</span>
                  <p className="text-slate-300 text-[13px] leading-relaxed pt-0.5">
                    Di Safari, ketuk <Share2 className="w-3.5 h-3.5 inline -mt-0.5" /> <strong className="text-white">Share</strong>, lalu <strong className="text-white">"Tambah ke Layar Utama"</strong>.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mb-6">
                Tekan tombol di bawah, lalu tekan sekali lagi tombol kuning "INSTALL BILANO" begitu Chrome terbuka.
              </p>
            )}

            <button
              onClick={onIOS ? () => setShowOpenExternal(false) : handleOpenInChrome}
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-500 text-[#0a1128] font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              {onIOS ? "SAYA MENGERTI" : (
                <>Buka di Chrome <ExternalLink className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 🎉 MODAL 4: SELAMAT APLIKASI BERHASIL TERPASANG (DI CHROME) */}
      {isInstallSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-amber-400/30 rounded-[36px] w-full max-w-md p-7 relative animate-in zoom-in-95 duration-300 text-center shadow-2xl flex flex-col items-center">
            
            <button
              onClick={() => setIsInstallSuccess(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Icon */}
            <div className="relative mb-5 mt-2">
              <div className="absolute inset-0 bg-amber-400/20 rounded-3xl blur-xl animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-900 via-[#121c3a] to-black border-2 border-amber-400/40 p-2 flex items-center justify-center shadow-2xl">
                <img src="/BILANO-ICON-NEW.png" alt="BILANO Icon" className="w-18 h-18 object-contain rounded-2xl drop-shadow-md" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg border-2 border-[#0f172a]">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <span className="bg-amber-400/10 border border-amber-400/30 text-amber-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-inner">
              Pemasangan Berhasil! 🚀
            </span>

            <h3 className="text-2xl font-black text-white leading-tight mb-2 tracking-tight">
              Aplikasi BILANO Telah Terpasang!
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Ikon <b className="text-amber-300">BILANO</b> kini sudah tersedia di Layar Utama (<i>Home Screen</i>) perangkat Anda layaknya aplikasi resmi.
            </p>

            {/* Langkah Selanjutnya Box */}
            <div className="w-full bg-[#1e293b]/80 border border-slate-700/70 rounded-2xl p-4 text-left mb-6 space-y-2.5">
              <p className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                Aplikasi Siap Digunakan! 🚀
              </p>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-[#0a1128] font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <span>Ikon <b className="text-white">BILANO</b> sudah terpasang di Layar Utama HP Anda.</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs text-slate-200">
                <span className="w-5 h-5 rounded-full bg-amber-400 text-[#0a1128] font-black flex items-center justify-center text-[10px] shrink-0 mt-0.5">✓</span>
                <span>Anda bisa langsung masuk sekarang tanpa perlu keluar dari browser.</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsInstallSuccess(false);
                setLocation('/auth');
              }}
              className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-sm tracking-wide py-4 px-6 rounded-2xl shadow-[0_10px_25px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-600 cursor-pointer"
            >
              <span>BUKA & MASUK SEKARANG →</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚀 MODAL 5: COBA LANGSUNG DI BROWSER (MODE TAMU / DEMO) */}
      {showGuestModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0f172a] border border-amber-400/40 rounded-[36px] w-full max-w-sm p-6 relative animate-in zoom-in-95 duration-300 text-center shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setShowGuestModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mb-4 border border-amber-400/30 shadow-inner">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-xl font-black mb-2 text-white">Coba Langsung di Browser</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              Mulai eksplorasi BILANO seketika dalam <strong>Mode Tamu</strong> tanpa perlu daftar akun atau mengisi password terlebih dahulu.
            </p>

            <div className="w-full space-y-3">
              <button
                onClick={() => {
                  trackEvent("guest_mode_entered", { source: "landing_modal" });
                  initTrialSession();
                  window.location.href = "/?trial=true";
                }}
                className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-xs md:text-sm tracking-wide py-4 px-5 rounded-2xl shadow-[0_10px_25px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-amber-600 cursor-pointer"
              >
                <span>🚀 MASUK SEBAGAI TAMU (COBA DULU)</span>
              </button>

              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setLocation('/auth?mode=signup');
                }}
                className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Sudah punya akun? Masuk / Daftar Permanen →
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Step({ num, text }: { num: string, text: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="shrink-0 w-6 h-6 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center font-black text-[11px] md:text-sm lg:text-base border border-amber-400/20">
        {num}
      </div>
      <p className="text-slate-300 font-medium leading-relaxed pt-0.5 text-[13px] md:text-[14.5px] lg:text-[15.5px]">
        {text}
      </p>
    </div>
  );
}