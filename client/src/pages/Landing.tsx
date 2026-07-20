import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ShieldCheck, ChevronDown, Star, LayoutDashboard, Download, Mail, Phone, MapPin 
} from "lucide-react";
import { trackEvent } from "@/lib/tracking";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // =======================================================
  // 🚀 MESIN TEKS DINAMIS
  // =======================================================
  // =======================================================
  // 🚀 MESIN TEKS DINAMIS (VERSI VISI KEKAYAAN)
  // =======================================================
  const headlines = [
    { top: "Bukan Sekadar Mengelola Uang,", bottom: "Saatnya Bangun Visi Kekayaan." },
    { top: "Jangan Cuma Catat Saldo,", bottom: "Eksekusi Target Nominal Besarmu." },
    { top: "Kunci Visi Jangka Panjang,", bottom: "Wujudkan Angka Kekayaan Nyata." },
    { top: "Berhenti Mengatur Uang Secara Pasif,", bottom: "Mulai Kawal Tujuan Finansialmu." }
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

  // 🔥 TRACKING: Mencatat Kunjungan Halaman Pertama Kali Berdasarkan Device
  useEffect(() => {
    trackEvent("landing_page_viewed", { 
      device: typeof window !== 'undefined' && window.innerWidth < 1024 ? "mobile" : "desktop" 
    });
  }, []);

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
<main className="px-5 sm:px-6 lg:px-10 pt-6 pb-16 lg:pb-12 flex flex-col gap-10 sm:gap-12 lg:gap-24 w-full items-center">
          
          {/* 🔥 1. HERO SECTION */}
          <section className="w-full min-w-0 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-4 animate-in slide-in-from-bottom-6 fade-in duration-700 delay-100 fill-mode-both max-w-6xl mx-auto mt-2 px-2 sm:px-4 lg:px-0">
            
            {/* KIRI/ATAS: TEKS UTAMA */}
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

            {/* KANAN/BAWAH: FOTO & LABEL BRUTALIST */}
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

          {/* 🔥 3. KARTU BENEFIT */}
          <section className="grid grid-cols-3 gap-3 lg:gap-6 animate-in slide-in-from-bottom-8 fade-in duration-700 delay-300 fill-mode-both w-full max-w-7xl">
            <FeatureCard imgUrl="https://img.icons8.com/color/96/artificial-intelligence.png" title="Konsultasi AI" desc="Strategi cerdas pelunasan hutang." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/barcode-scanner.png" title="Smart Scanner" desc="Foto struk, saldo auto-potong." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/business-report.png" title="Laporan PDF" desc="Cetak neraca akurasi tinggi." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/bullish.png" title="Multi Aset" desc="Pantau Valas, Crypto, & Saham." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/e-learning.png" title="Pustaka Finansial" desc="E-book panduan kekayaan (Segera)." />
            <FeatureCard imgUrl="https://img.icons8.com/color/96/multiple-devices.png" title="Akses Universal" desc="PWA: Ringan di semua perangkat." />
          </section>

          {/* 🔥 4. UI SCREENSHOT GALLERY */}
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

          {/* 🔥 5. LANGKAH INSTALL & FAQ */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 w-full max-w-7xl">
            <section className="bg-[#121c3a]/50 backdrop-blur-xl border border-white/5 rounded-[28px] p-6 text-white shadow-2xl animate-in slide-in-from-bottom-10 fade-in duration-700 delay-400 fill-mode-both lg:p-8 flex-1">
              <h3 className="text-lg font-black mb-5 text-amber-400 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5"/> Cara Cepat Pasang
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

          {/* 🔥 6. TOMBOL INSTALL DESKTOP (MENGARAH KE ONBOARDING) */}
          <div className="hidden lg:flex w-full flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-700 delay-500 fill-mode-both">
            <button
              onClick={() => {
                trackEvent("cta_landing_clicked", { placement: "mobile_sticky" });
                setLocation('/preview'); // Arahkan ke Video Preview dulu
              }}
              className="w-full max-w-[400px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.2rem] tracking-wide py-5 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
            >
              <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
              DAPATKAN APLIKASI SEKARANG
            </button>
          </div>

        </main>

        {/* 🟡 STICKY TOMBOL HP (MENGARAH KE ONBOARDING) */}
        <div className="lg:hidden sticky bottom-6 px-6 z-50 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-700 fill-mode-both">
          <button
            onClick={() => {
              trackEvent("cta_landing_clicked", { placement: "mobile_sticky" });
              setLocation('/onboarding');
            }}
            className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.1rem] tracking-wide py-4 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
          >
            <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
            DAPATKAN APLIKASI SEKARANG
          </button>
        </div>

        {/* 🚀 FOOTER DENGAN KONTAK */}
        <footer className="mt-auto pb-10 pt-10 text-center relative z-10 border-t border-white/5 w-full flex flex-col items-center px-4">
            <img src="/Bilano_horiz_rbg.png" alt="Bilano" className="h-5 mx-auto mb-6 opacity-50 grayscale mix-blend-screen" />
            
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
                  Jl. Melati Raya No. 3, Bumi Malaka Asri 1<br />
                  Duren Sawit, Jakarta Timur<br />
                  13460
                </span>
              </div>
            </div>

            <p className="text-[10px] md:text-xs text-slate-600 font-medium">© {new Date().getFullYear()} Bilano Official</p>
        </footer>

      </div>
    </div>
  );
}

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