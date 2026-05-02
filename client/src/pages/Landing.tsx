import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ShieldCheck, ChevronDown, Star, LayoutDashboard, ChevronRight, Download, Instagram 
} from "lucide-react";

export default function Landing() {
  const [, setLocation] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
  // 🚀 DATA NARASI MULTI-TARGET
  // =======================================================
  const narratives = [
    {
      badge: "Untuk Mahasiswa & Fresh Graduate",
      title: "Lulus S1 = Pengangguran Tanpa Tabungan?",
      desc: "Realita kerja brutal. Tanpa 'Dana Darurat Pasca-Kampus', Anda tak punya biaya untuk bertahan hidup saat mencari kerja. BILANO memandu Anda men-set target 'Dana Lulus' sejak awal, sementara Konsultan AI akan merem pengeluaran nongkrong Anda secara rasional.",
      img: "/pelamar-kerja.jpg" 
    },
    {
      badge: "Untuk Pekerja & Profesional",
      title: "Jebakan Self-Reward & Kebocoran Halus",
      desc: "Menabung di awal bulan tapi aset stagnan? Anda mungkin buta terhadap akumulasi pengeluaran kecil (micro-transactions) dan dalih self-reward. BILANO merekam kebocoran ini tanpa ampun, dan AI akan memberikan teguran logis berbasis hitungan kerugian masa depan.",
      img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=800&auto=format&fit=crop"
    },
    {
      badge: "Untuk Keluarga & Umum",
      title: "Lubang Hitam Pengeluaran Siluman",
      desc: "Uang belanja sering bocor tanpa jejak ke iuran dadakan atau jajan, memicu argumen keluarga. Jadikan BILANO buku besar (ledger) yang 100% transparan. AI akan memberi peringatan dini jika tren pengeluaran mengancam target krusial seperti Dana Pendidikan Anak.",
      img: "https://images.unsplash.com/photo-1604594849809-dfedbc827105?q=80&w=800&auto=format&fit=crop"
    }
  ];

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

  const faqs = [
    { q: "Mengapa aplikasi ini tidak ada di Play Store?", a: "BILANO menggunakan teknologi masa depan berbasis PWA (Progressive Web App). Anda tidak perlu mengunduh file APK yang berat atau menunggu update dari Play Store. Aplikasi langsung terhubung, lebih cepat, dan sangat hemat memori HP." },
    { q: "Apakah data keuangan saya aman di sini?", a: "Sangat aman. BILANO berfungsi sebagai jurnal cerdas pribadi. Kami menggunakan enkripsi penuh dan TIDAK terhubung langsung ke rekening asli Anda untuk mencegah risiko peretasan saldo." },
    { q: "Apakah aplikasi ini benar-benar gratis?", a: "Ya! Jurnal pencatatan arus kas dan fitur dasar gratis selamanya. Anda hanya perlu upgrade jika ingin membuka Asisten AI, Portofolio Valas, dan akses ke Pustaka E-book Finansial." }
  ];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a1128] to-[#040814] w-full selection:bg-blue-900 font-sans relative overflow-x-hidden flex flex-col items-center">
      
      {/* ✨ CAHAYA NEON */}
      <div className="absolute top-[-5%] left-[-20%] lg:left-[5%] w-96 lg:w-[700px] h-96 lg:h-[700px] bg-blue-600/10 lg:bg-blue-600/15 rounded-full blur-[100px] lg:blur-[180px] pointer-events-none"></div>
      <div className="absolute top-[30%] right-[-20%] lg:right-[5%] w-80 lg:w-[600px] h-80 lg:h-[600px] bg-amber-500/5 lg:bg-amber-500/10 rounded-full blur-[100px] lg:blur-[180px] pointer-events-none"></div>

      <div className="w-full max-w-[480px] lg:max-w-[1100px] flex flex-col relative z-10 flex-1">
        
        {/* 🚀 HEADER (OPSI WEB DIHAPUS) */}
        <header className="px-5 lg:px-10 pt-6 pb-2 animate-in slide-in-from-top-4 fade-in duration-500 w-full lg:pt-10">
          <div className="bg-white rounded-[20px] p-3.5 lg:p-4 flex items-center justify-center shadow-lg shadow-black/20 border border-slate-100 w-full max-w-7xl mx-auto">
            <img src="/Bilano_horiz_rbg.png" alt="Bilano Logo" className="h-8 md:h-10 object-contain" />
          </div>
        </header>

        {/* 🚀 MAIN CONTENT */}
        <main className="px-6 lg:px-10 pt-6 pb-12 flex flex-col gap-16 lg:gap-24 w-full items-center">
          
          <section className="flex flex-col gap-5 w-full text-left lg:text-center animate-in slide-in-from-bottom-6 fade-in duration-700 delay-100 fill-mode-both items-start lg:items-center max-w-5xl">
            <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-2 rounded-full w-fit shadow-inner">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="text-amber-400 text-xs font-bold tracking-wide">Akses Eksklusif Khusus Hari Ini</span>
            </div>
            
            <h2 className={`w-full text-left lg:text-center text-[2.5rem] lg:text-[4.5rem] lg:min-h-[10rem] leading-[1.1] font-black tracking-tight drop-shadow-md transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-white">{headlines[headlineIdx].top}</span> <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">
                {headlines[headlineIdx].bottom}
              </span>
            </h2>
          </section>

          {/* 🔥 STORYTELLING SLIDER */}
          <section className="animate-in slide-in-from-bottom-8 fade-in duration-700 delay-200 fill-mode-both w-full max-w-7xl">
             <div className="flex items-center justify-between mb-4 pr-4 lg:mb-6">
               <h3 className="text-lg lg:text-xl font-black text-white flex items-center gap-2">
                 Fakta Pahit Finansial
               </h3>
               <div className="flex items-center gap-1 text-xs text-slate-400 font-bold bg-white/5 px-3 py-1 rounded-full">
                 Geser <ChevronRight className="w-3 h-3" />
               </div>
             </div>

             <div className="flex overflow-x-auto gap-4 pb-6 snap-x snap-mandatory -mx-6 px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] lg:justify-center">
               {narratives.map((item, i) => (
                 <div key={i} className="snap-center shrink-0 w-[85%] lg:w-[32%] bg-[#121c3a]/60 backdrop-blur-md border border-white/10 rounded-[28px] overflow-hidden shadow-xl relative group flex flex-col transition-all hover:border-white/20 hover:scale-[1.01]">
                    <div className="h-[180px] lg:h-[200px] w-full relative overflow-hidden">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 mix-blend-luminosity group-hover:mix-blend-normal" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#121c3a]/90 to-transparent"></div>
                      <div className="absolute bottom-4 left-5 right-5 lg:bottom-5 lg:left-6 lg:right-6">
                        <span className="bg-amber-400 text-[#0a1128] text-[10px] font-black px-2.5 py-1 rounded-lg mb-2 inline-block tracking-widest uppercase">
                          {item.badge}
                        </span>
                        <h4 className="text-white font-bold text-lg lg:text-xl leading-tight drop-shadow-md">{item.title}</h4>
                      </div>
                    </div>
                    <div className="p-5 lg:p-6 flex-1 flex items-start">
                      <p className="text-[13px] lg:text-[14.5px] text-slate-300 leading-relaxed font-medium">
                        {item.desc}
                      </p>
                    </div>
                 </div>
               ))}
             </div>
          </section>

          {/* 🔥 LANGKAH INSTALL & FAQ */}
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
                          <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)} className="w-full text-left p-4 flex items-center justify-between font-bold text-sm text-slate-200 lg:p-5 lg:text-base">
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

          {/* 🔥 TOMBOL INSTALL DESKTOP (OPSI WEB DIHAPUS) */}
          <div className="hidden lg:flex w-full flex-col items-center animate-in slide-in-from-bottom-10 fade-in duration-700 delay-500 fill-mode-both">
            <button
              onClick={handlePwaInstall}
              className="w-full max-w-[400px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.2rem] tracking-wide py-5 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
            >
              <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
              INSTALL SEKARANG
            </button>
          </div>

        </main>

        {/* 🟡 STICKY TOMBOL HP (OPSI WEB DIHAPUS) */}
        <div className="lg:hidden sticky bottom-6 px-6 z-50 animate-in slide-in-from-bottom-12 fade-in duration-700 delay-700 fill-mode-both">
          <button
            onClick={handlePwaInstall}
            className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-[1.1rem] tracking-wide py-4 px-6 rounded-[24px] shadow-[0_15px_40px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[5px] border-amber-600 active:border-b-0 active:translate-y-[5px]"
          >
            <Download strokeWidth={3} className="w-6 h-6 animate-bounce" />
            INSTALL SEKARANG
          </button>
        </div>

        <footer className="mt-auto pb-10 pt-10 text-center relative z-10 border-t border-white/5 w-full">
            <img src="/Bilano_horiz_rbg.png" alt="Bilano" className="h-5 mx-auto mb-4 opacity-50 grayscale mix-blend-screen" />
            <p className="text-[10px] md:text-xs text-slate-600 mt-1 font-medium">© {new Date().getFullYear()} Bilano Official</p>
        </footer>

      </div>
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
  )
}