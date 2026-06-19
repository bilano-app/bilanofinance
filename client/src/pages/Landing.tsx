import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { 
  Star, Download, ChevronRight, ChevronLeft, PlayCircle, Play
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();

  // =======================================================
  // 🚀 MESIN TEKS DINAMIS
  // =======================================================
  const headlines = [
    { top: "Gaji Naik Terus,", bottom: "Tapi Net Worth Stagnan?" },
    { top: "Kerja Keras Tiap Hari,", bottom: "Cuma Buat Bayar Paylater?" },
    { top: "Bocor Halus Transaksi,", bottom: "Menyabotase Masa Depan?" },
    { top: "Berhenti Nabung Buta,", bottom: "Mulai Tracking Brutal." }
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

  // =======================================================
  // 🚀 DATA 15 VIDEO (PLACEHOLDER)
  // =======================================================
  const featureVideos = Array.from({ length: 15 }).map((_, i) => ({
    id: i + 1,
    title: `Fitur Unggulan ${i + 1}`,
    desc: "Deskripsi singkat yang menjelaskan kecanggihan fitur BILANO ini untuk menyelamatkan finansial Anda.",
    poster: `https://placehold.co/600x338/121c3a/475569?text=Video+Fitur+${i + 1}`
  }));

  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentVidIdx, setCurrentVidIdx] = useState(0);

  // 💡 REAL-TIME TRACKING SAAT USER SWIPE / GESER DI HP
  const handleScroll = () => {
    if (sliderRef.current) {
      const container = sliderRef.current;
      const scrollLeft = container.scrollLeft;
      const itemWidth = container.children[0]?.getBoundingClientRect().width || 340;
      const gap = 20; // Sesuai dengan konfigurasi gap-5 (1.25rem = 20px)
      const index = Math.round(scrollLeft / (itemWidth + gap));
      if (index >= 0 && index < 15) {
        setCurrentVidIdx(index);
      }
    }
  };

  const scrollNext = () => {
    if (sliderRef.current) {
      const container = sliderRef.current;
      const itemWidth = container.children[0]?.getBoundingClientRect().width || 340;
      const gap = 20;
      container.scrollBy({ left: itemWidth + gap, behavior: 'smooth' });
    }
  };

  const scrollPrev = () => {
    if (sliderRef.current) {
      const container = sliderRef.current;
      const itemWidth = container.children[0]?.getBoundingClientRect().width || 340;
      const gap = 20;
      container.scrollBy({ left: -(itemWidth + gap), behavior: 'smooth' });
    }
  };

  // =======================================================
  // 🚀 LOGIKA PWA INSTALLER NATIVE
  // =======================================================
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('BILANO sedang diinstall...');
      }
      setDeferredPrompt(null);
    } else {
      alert("PEMBERITAHUAN:\n\nSistem perangkat Anda memblokir popup otomatis. Silakan buka menu browser (titik tiga atau ikon Share) lalu pilih 'Install App' atau 'Tambahkan ke Layar Utama' (Add to Home Screen) untuk memasang BILANO.");
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a1128] to-[#040814] w-full selection:bg-blue-900 font-sans relative overflow-x-hidden flex flex-col items-center">
      
      {/* ✨ CAHAYA NEON */}
      <div className="absolute top-[-5%] left-[-20%] lg:left-[5%] w-96 lg:w-[700px] h-96 lg:h-[700px] bg-blue-600/10 lg:bg-blue-600/15 rounded-full blur-[100px] lg:blur-[180px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-20%] lg:right-[5%] w-80 lg:w-[600px] h-80 lg:h-[600px] bg-amber-500/5 lg:bg-amber-500/10 rounded-full blur-[100px] lg:blur-[180px] pointer-events-none"></div>

      <div className="w-full max-w-[480px] lg:max-w-[1100px] flex flex-col relative z-10 flex-1">
        
        {/* 🚀 HEADER */}
        <header className="px-5 lg:px-10 pt-6 pb-2 animate-in slide-in-from-top-4 fade-in duration-500 w-full lg:pt-10">
          <div className="bg-white rounded-[20px] p-3.5 lg:p-4 flex items-center justify-center shadow-lg shadow-black/20 border border-slate-100 w-full max-w-7xl mx-auto">
            <img src="/Bilano_horiz_rbg.png" alt="Bilano Logo" className="h-8 md:h-10 object-contain" />
          </div>
        </header>

        {/* 🚀 MAIN CONTENT */}
        <main className="px-6 lg:px-10 pt-6 pb-12 flex flex-col gap-12 w-full items-center">
          
          {/* 🔥 1. HERO SECTION */}
          <section className="w-full flex flex-col lg:flex-row items-center justify-between gap-0 lg:gap-4 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-100 fill-mode-both max-w-6xl mx-auto mt-2 px-2 lg:px-0">
            
            {/* KIRI/ATAS: TEKS UTAMA */}
            <div className="flex-1 flex flex-col gap-3 lg:gap-4 text-center lg:text-left items-center lg:items-start z-20 w-full pt-4 lg:pt-0">
              <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full w-fit shadow-inner">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-amber-400 text-[10px] md:text-xs font-bold tracking-wide">Akses Eksklusif Khusus Hari Ini</span>
              </div>
              
              <h2 className={`w-full text-center lg:text-left text-[2.7rem] md:text-[3.5rem] lg:text-[4.2rem] leading-[1.05] font-black tracking-tight drop-shadow-md transition-opacity duration-300 px-2 lg:px-0 ${fade ? 'opacity-100' : 'opacity-0'}`}>
                <span className="text-white block">{headlines[headlineIdx].top}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500 block">
                  {headlines[headlineIdx].bottom}
                </span>
              </h2>
            </div>

            {/* KANAN/BAWAH: FOTO & LABEL BRUTALIST */}
            <div className="flex-1 relative w-full flex justify-center lg:justify-end z-10 -mt-6 md:-mt-8 lg:mt-0">
              <div className="relative inline-flex flex-col items-center w-full max-w-[460px]">
                  <img 
                    src="/adrienfandra_photos.png" 
                    alt="Adrien Fandra" 
                    className="w-[95%] h-auto object-contain drop-shadow-[-25px_15px_25px_rgba(0,0,0,0.65)] hover:-translate-y-2 transition-transform duration-700 ease-out relative z-10" 
                  />
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#080d20] to-transparent z-20 pointer-events-none"></div>
                  
                  <div className="absolute bottom-[5%] right-[0%] lg:right-[5%] flex flex-col items-start animate-in zoom-in slide-in-from-bottom-6 fade-in duration-700 delay-500 z-30 hover:scale-105 transition-transform cursor-default scale-[0.75] origin-bottom-right lg:scale-100">
                    <div className="bg-[#1111aa] text-white px-5 py-2 lg:px-6 lg:py-3 shadow-xl relative z-10 translate-y-1.5 -translate-x-3 border border-blue-900/50">
                      <p className="text-[20px] lg:text-[24px] font-black tracking-wide">
                        Adrien Fandra
                      </p>
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

          {/* 🔥 2. KARTU BENEFIT */}
          <section className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300 fill-mode-both w-full max-w-7xl mt-4">
            <FeatureCard imgUrl="https://img.icons8.com/color/96/artificial-intelligence.png" title="Konsultasi AI" desc="Strategi cerdas pelunasan hutang." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/barcode-scanner.png" title="Smart Scanner" desc="Foto struk, saldo auto-potong." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/business-report.png" title="Laporan PDF" desc="Cetak neraca akurasi tinggi." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/bullish.png" title="Multi Aset" desc="Pantau Valas, Crypto, & Saham." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/e-learning.png" title="Pustaka Finansial" desc="E-book panduan kekayaan (Segera)." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/multiple-devices.png" title="Akses Universal" desc="PWA: Ringan di semua perangkat." />
          </section>

          {/* 🔥 PEMBATAS ELEGANT */}
          <div className="w-full max-w-5xl h-[1px] bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mt-4 mb-2"></div>

          {/* 🔥 3. SECTION VIDEO SHOWCASE FITUR */}
          <section className="w-full max-w-7xl flex flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-700 delay-400 fill-mode-both">
            <div className="mb-6 lg:mb-10 text-center max-w-2xl mx-auto px-4">
              <h3 className="text-2xl lg:text-3xl font-black text-white flex items-center justify-center gap-3">
                <PlayCircle className="w-8 h-8 text-amber-400"/> Kenali Lebih Dalam
              </h3>
              <p className="text-slate-400 text-sm mt-2 lg:text-base leading-relaxed">
                Temukan 15 video eksklusif perkenalan fitur BILANO yang dirancang khusus untuk memotong kebocoran dana Anda secara brutal.
              </p>
            </div>

            <div className="relative w-full group">
              {/* Tombol Kiri (Desktop) */}
              <button 
                onClick={scrollPrev} 
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-[#0a1128]/80 border border-white/10 text-white p-3 rounded-full backdrop-blur-md hidden lg:flex hover:bg-amber-500 hover:text-black transition-colors -ml-5 shadow-xl"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Container Scroll Video */}
              <div 
                ref={sliderRef} 
                onScroll={handleScroll}
                className="flex overflow-x-auto gap-5 pb-6 snap-x snap-mandatory px-2 md:px-6 lg:px-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] scroll-smooth"
              >
                {featureVideos.map((vid) => (
                  <div 
                    key={vid.id} 
                    className="snap-center shrink-0 w-[85vw] md:w-[380px] lg:w-[420px] bg-[#121c3a]/80 backdrop-blur-sm border border-white/10 rounded-[24px] overflow-hidden shadow-2xl flex flex-col group/card cursor-pointer hover:border-amber-400/50 hover:bg-[#172447] transition-all"
                  >
                    {/* Area Placeholder Video */}
                    <div className="w-full aspect-video bg-[#040814] relative flex items-center justify-center overflow-hidden">
                       <img src={vid.poster} alt={vid.title} className="w-full h-full object-cover opacity-70 group-hover/card:scale-105 group-hover/card:opacity-100 transition-all duration-500" />
                       
                       <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 bg-amber-500/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-[0_0_20px_rgba(251,191,36,0.4)] group-hover/card:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
                          </div>
                       </div>
                    </div>
                    {/* Text Area */}
                    <div className="p-5 lg:p-6">
                      <h4 className="text-white font-bold text-lg mb-2 drop-shadow-sm">{vid.title}</h4>
                      <p className="text-slate-400 text-[13px] leading-relaxed">{vid.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tombol Kanan (Desktop) */}
              <button 
                onClick={scrollNext} 
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-[#0a1128]/80 border border-white/10 text-white p-3 rounded-full backdrop-blur-md hidden lg:flex hover:bg-amber-500 hover:text-black transition-colors -mr-5 shadow-xl"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {/* 📱 CONTROLLER & INDICATOR PRESET UNTUK HP */}
            <div className="flex lg:hidden items-center justify-between w-full px-3 mt-1 mb-4">
              {/* Keterangan Angka Model Capsule Premium */}
              <div className="bg-[#121c3a] border border-white/10 px-4 py-2 rounded-full backdrop-blur-md shadow-inner flex items-center gap-1.5">
                <span className="text-amber-400 font-black text-sm">{currentVidIdx + 1}</span>
                <span className="text-slate-500 text-xs font-semibold">/</span>
                <span className="text-slate-400 text-xs font-bold">15 Video</span>
              </div>
              
              {/* Tombol Navigasi Mini Ringan untuk HP */}
              <div className="flex gap-2">
                <button 
                  onClick={scrollPrev} 
                  disabled={currentVidIdx === 0}
                  className={`border p-2.5 rounded-full transition-all backdrop-blur-sm ${currentVidIdx === 0 ? 'border-white/5 text-slate-600 bg-white/20 opacity-30' : 'border-white/10 text-white bg-[#121c3a] active:bg-amber-400 active:text-black'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={scrollNext} 
                  disabled={currentVidIdx === 14}
                  className={`border p-2.5 rounded-full transition-all backdrop-blur-sm ${currentVidIdx === 14 ? 'border-white/5 text-slate-600 bg-white/20 opacity-30' : 'border-white/10 text-white bg-[#121c3a] active:bg-amber-400 active:text-black'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 🔥 TOMBOL DAPATKAN APLIKASI (UTAMA DESKTOP) */}
            <div className="hidden lg:flex mt-6 w-full justify-center animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500">
              <button
                onClick={() => setLocation('/onboarding')}
                className="w-full max-w-[420px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.15rem] tracking-wide py-5 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.25)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
              >
                <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
                DAPATKAN APLIKASI SEKARANG
              </button>
            </div>
          </section>

          {/* 🔥 4. SECTION HARGA & CHECKOUT (SYARAT DUITKU) */}
          <section className="w-full max-w-4xl mx-auto mt-12 animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="bg-gradient-to-br from-[#121c3a] to-[#080d20] border border-amber-500/30 p-8 rounded-[32px] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
              {/* Dekorasi Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none"></div>
              
              <div className="flex-1 z-10 text-center md:text-left">
                <h3 className="text-2xl lg:text-3xl font-black text-white mb-2">
                  Akses Penuh <span className="text-amber-400">BILANO</span>
                </h3>
                <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-4">
                  Dapatkan seluruh fitur pelacakan brutal, konsultasi AI, dan laporan PDF tanpa batas. Lisensi seumur hidup, tanpa biaya bulanan terselubung.
                </p>
                <div className="text-4xl font-black text-white tracking-tight">
                  Rp 99.000 <span className="text-sm text-slate-500 font-medium tracking-normal">/ selamanya</span>
                </div>
              </div>

              <div className="w-full md:w-auto z-10">
                <button
                  onClick={() => setLocation('/checkout')} 
                  className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 text-[#0a1128] font-black text-[1.1rem] py-4 px-8 rounded-full shadow-[0_10px_30px_rgba(251,191,36,0.3)] transition-all flex items-center justify-center gap-2"
                >
                  Beli Sekarang
                </button>
              </div>
            </div>
          </section>

        </main>

        {/* 🟡 STICKY TOMBOL HP */}
        <div className="lg:hidden sticky bottom-6 px-6 z-50 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-700 fill-mode-both">
          <button
            onClick={() => setLocation('/onboarding')}
            className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.1rem] tracking-wide py-4 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
          >
            <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
            DAPATKAN APLIKASI SEKARANG
          </button>
        </div>

        {/* 🔥 FOOTER & KONTAK SUPPORT (SYARAT DUITKU) */}
        <footer className="mt-16 pb-10 pt-10 px-6 w-full max-w-7xl mx-auto border-t border-white/10 relative z-10 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <img src="/Bilano_horiz_rbg.png" alt="Bilano" className="h-6 mb-4 opacity-80" />
            <p className="text-slate-400 text-xs max-w-xs leading-relaxed">
              Aplikasi personal finance untuk tracking brutal dan menyelamatkan masa depan finansial Anda.
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end text-center md:text-right">
            <h4 className="text-white font-bold text-sm mb-3">Layanan Pelanggan (Support)</h4>
            <p className="text-slate-400 text-xs mb-1">
              <span className="font-semibold text-slate-300">Email:</span> bilanotech@gmail.com
            </p>
            <p className="text-slate-400 text-xs mb-1">
              <span className="font-semibold text-slate-300">Telepon/WA:</span> +6289688113210
            </p>
            <p className="text-slate-400 text-xs max-w-[250px] mt-2 leading-relaxed">
              <span className="font-semibold text-slate-300">Alamat Usaha:</span><br/>
              Jl. [Nama Jalan/Kelurahan], RT.XX/RW.XX, [Kecamatan], Jakarta [Timur/Selatan/dll], 12345
            </p>
          </div>
        </footer>

      </div>
    </div>
  );
}

// Sub-komponen Feature Card
function FeatureCard({ imgUrl, title, desc }: any) {
  return (
    <div className="bg-[#121c3a]/80 backdrop-blur-sm border border-white/5 p-4 md:p-5 lg:p-6 rounded-[24px] shadow-lg hover:bg-[#172447] hover:border-white/10 hover:scale-[1.03] transition-all cursor-pointer flex flex-col">
      <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden mb-3 p-2.5">
        <img src={imgUrl} alt={title} className="w-full h-full object-contain opacity-90 drop-shadow-md" />
      </div>
      <h4 className="font-bold text-white text-[14px] md:text-base lg:text-lg leading-tight mb-1 drop-shadow-sm">{title}</h4>
      <p className="text-[11px] md:text-xs lg:text-[13px] text-slate-400 font-medium leading-snug">{desc}</p>
    </div>
  );
}