import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  ArrowRight, CheckCircle2, X, Target, Zap, ShieldAlert, Sparkles, 
  Clock, Crown, Gift, Loader2, ShieldCheck, ChevronRight
} from "lucide-react";
import { Button } from "@/components/UIComponents";
import { setStoredUserGoal, useWelcomeCountdown, UserGoal, getGoalPitchDetails } from "@/lib/welcome-deal";
import { useUser } from "@/hooks/use-finance";

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const userEmail = localStorage.getItem("bilano_email") || user?.email || "";

  const countdown = useWelcomeCountdown(userEmail);

  const [step, setStep] = useState<1 | 2 | 3 | "analyzing" | "result">(1);
  const [selectedGoal, setSelectedGoal] = useState<UserGoal>("income");
  const [selectedChallenge, setSelectedChallenge] = useState<string>("Uang sering habis tanpa sadar");
  const [selectedPace, setSelectedPace] = useState<string>("Akselerasi cepat dalam 1-3 bulan");

  // Ketika masuk step "analyzing", beri delay 1.5 detik agar terasa diproses oleh AI
  useEffect(() => {
    if (step === "analyzing") {
      const timer = setTimeout(() => {
        setStoredUserGoal(selectedGoal, userEmail);
        setStep("result");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [step, selectedGoal, userEmail]);

  const handleSkip = () => {
    setStoredUserGoal(selectedGoal, userEmail);
    setLocation("/setup-balance");
  };

  const handleNextStep1 = (goal: UserGoal) => {
    setSelectedGoal(goal);
    setStep(2);
  };

  const handleNextStep2 = (challenge: string) => {
    setSelectedChallenge(challenge);
    setStep(3);
  };

  const handleNextStep3 = (pace: string) => {
    setSelectedPace(pace);
    setStep("analyzing");
  };

  const pitch = getGoalPitchDetails(selectedGoal);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1128] via-[#0f1d40] to-[#0a1128] text-white flex flex-col items-center justify-between p-5">
      
      {/* HEADER / NAVIGATION BAR */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand-navy border border-brand-gold/40 flex items-center justify-center shadow-xs">
            <img src="/BILANO-ICON-NEW.png" alt="BILANO" className="w-5 h-5 object-contain" />
          </div>
          <span className="text-xs font-black tracking-widest text-slate-200 uppercase">
            BILANO ONBOARDING
          </span>
        </div>

        {/* TOMBOL LEWATI (ALWAYS VISIBLE & CLEAR) */}
        <button
          onClick={handleSkip}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 transition-colors cursor-pointer border border-white/10"
        >
          <span>Lewati</span>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* STEP 1: TUJUAN UTAMA */}
      {step === 1 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              Langkah 1 dari 3
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-3 mb-2 leading-tight">
            Apa target finansial terbesarmu saat ini?
          </h1>
          <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
            Pilih satu fokus agar BILANO dapat menyesuaikan sistem dan rekomendasi strategis akun Anda.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleNextStep1("income")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-brand-gold/20 hover:to-white/10 border-2 border-white/10 hover:border-brand-gold rounded-2xl p-4 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                    Cari Pemasukan & Cuan Baru
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Butuh ide & strategi praktis untuk melipatgandakan penghasilan
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-300 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleNextStep1("leakage")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-emerald-500/20 hover:to-white/10 border-2 border-white/10 hover:border-emerald-400 rounded-2xl p-4 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                    Stop Kebocoran Kas Halus
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Gaji sering numpang lewat, ingin uang terkontrol & tabungan aman
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-300 transition-colors shrink-0" />
            </button>

            <button
              onClick={() => handleNextStep1("debt")}
              className="w-full bg-gradient-to-r from-white/10 to-white/5 hover:from-blue-500/20 hover:to-white/10 border-2 border-white/10 hover:border-blue-400 rounded-2xl p-4 text-left transition-all group cursor-pointer active:scale-98 flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white group-hover:text-blue-300 transition-colors">
                    Bebas Utang & Bangun Aset
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Lunasi kewajiban lebih cepat dan mulai kumpulkan portofolio
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-300 transition-colors shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: TANTANGAN TERBESAR */}
      {step === 2 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              Langkah 2 dari 3
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-3 mb-2 leading-tight">
            Apa kendala terbesarmu saat mengelola uang?
          </h1>
          <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
            BILANO memiliki fitur otomatisasi untuk menyelesaikan titik lemah ini.
          </p>

          <div className="space-y-3">
            {[
              { title: "Sering lupa & ga tahu uang habis ke mana", desc: "Perlu audit otomatis dan radar peringatan kas" },
              { title: "Malas mencatat struk satu per satu secara manual", desc: "Butuh Smart OCR untuk scan struk instan" },
              { title: "Punya tabungan tapi bingung cara memutarnya", desc: "Perlu bimbingan strategi dan edukasi finansial" }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNextStep2(item.title)}
                className="w-full bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-brand-gold/50 rounded-2xl p-4 text-left transition-all cursor-pointer flex items-center justify-between active:scale-98"
              >
                <div>
                  <h3 className="text-xs font-black text-white">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: KOMMITMEN WAKTU */}
      {step === 3 && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mb-2">
            <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest bg-brand-gold/10 px-3 py-1 rounded-full border border-brand-gold/20">
              Langkah 3 dari 3
            </span>
          </div>
          <h1 className="text-2xl font-black text-white mt-3 mb-2 leading-tight">
            Seberapa cepat kamu ingin melihat perubahan finansial?
          </h1>
          <p className="text-xs text-slate-400 mb-6 font-medium leading-relaxed">
            Pilih ritme yang paling sesuai dengan gaya hidupmu saat ini.
          </p>

          <div className="space-y-3">
            {[
              { title: "Akselerasi Cepat (1 - 3 Bulan ke Depan)", desc: "Siap berkomitmen untuk disiplin dan mencoba strategi baru", badge: "Direkomendasikan" },
              { title: "Santai & Bertahap", desc: "Mulai pelan-pelan dari pencatatan dasar terlebih dahulu", badge: "Fleksibel" }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleNextStep3(item.title)}
                className="w-full bg-white/5 hover:bg-white/10 border-2 border-white/10 hover:border-brand-gold/50 rounded-2xl p-4 text-left transition-all cursor-pointer flex items-center justify-between active:scale-98"
              >
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-md">
                    {item.badge}
                  </span>
                  <h3 className="text-xs font-black text-white mt-1.5">{item.title}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP: ANALYZING ANIMATION */}
      {step === "analyzing" && (
        <div className="w-full max-w-md flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-brand-gold/20 border-2 border-brand-gold flex items-center justify-center mb-6 animate-spin">
            <Sparkles className="w-8 h-8 text-brand-gold" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">
            Menganalisis Profil Finansial Anda...
          </h2>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Menyusun formula alokasi kas, kalkulasi risiko, dan menyiapkan rekomendasi blueprint personal.
          </p>
        </div>
      )}

      {/* STEP: RESULT & DYNAMIC PAYWALL REVEAL */}
      {step === "result" && (
        <div className="w-full max-w-md flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 py-2">
          
          {/* RAPOR PROFIL FINANSIAL (GRATIS) */}
          <div className="bg-white/10 border border-white/15 rounded-3xl p-5 mb-5 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Rapor Finansial Selesai Disiapkan
              </span>
              <span className="text-[10px] font-bold text-slate-400">Tersimpan di Akun</span>
            </div>

            <h3 className="text-lg font-black text-white mb-1">
              {pitch.badge.replace("Rekomendasi Profil: ", "")}
            </h3>
            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3">
              Fokus Utama: <strong className="text-amber-300">{pitch.featureTag}</strong>. Ritme: {selectedPace.split("(")[0].trim()}.
            </p>

            <div className="bg-black/30 rounded-2xl p-3 border border-white/5 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Skor Kesiapan Finansial:</span>
                <span className="font-black text-emerald-400">88 / 100 (Sangat Potensial)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tindakan Kunci:</span>
                <span className="font-bold text-white">Eksekusi Blueprint + Kontrol Kas Harian</span>
              </div>
            </div>
          </div>

          {/* ⏱️ WELCOME DEAL 24 JAM OFFER */}
          <div className="bg-gradient-to-b from-[#14234b] to-[#0c1735] border-2 border-brand-gold rounded-3xl p-5 mb-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black">
                <Clock className="w-4 h-4 animate-pulse" />
                <span>WELCOME DEAL: {countdown.formatted}</span>
              </div>
              <span className="bg-brand-gold text-brand-navy text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                HEMAT 57%
              </span>
            </div>

            <h2 className="text-base font-black text-white mb-1 leading-snug">
              {pitch.headline}
            </h2>
            <p className="text-[11px] text-slate-300 mb-3.5 leading-relaxed">
              {pitch.subheadline}
            </p>

            {/* HARGA TAHUNAN PROMO */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 mb-3.5 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 line-through font-bold">Rp 228.000</p>
                <p className="text-xl font-black text-brand-gold leading-none mt-0.5">
                  Rp 99.000 <span className="text-[10px] text-slate-300 font-bold">/ tahun</span>
                </p>
                <p className="text-[9px] text-emerald-300 font-bold mt-0.5">Hanya Rp 8.250 / bulan</p>
              </div>

              {/* BONUS EBOOK ANCHOR */}
              <div className="bg-amber-400/15 border border-amber-300/30 rounded-xl p-2 text-right max-w-[150px]">
                <div className="flex items-center justify-end gap-1 text-[9px] font-black text-amber-300 uppercase">
                  <Gift className="w-3 h-3" /> Gratis E-Book
                </div>
                <p className="text-[9px] text-slate-300 leading-tight mt-0.5">
                  Termasuk 5 E-Book Finansial Academy (Normal Rp 29.000)
                </p>
              </div>
            </div>

            {/* TRUST NOTICE */}
            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bayar 1x via QRIS/VA • Tanpa auto-debit diam-diam</span>
            </p>
          </div>

          {/* ACTION BUTTONS */}
          <div className="space-y-2.5">
            <Button
              onClick={() => setLocation("/paywall")}
              className="w-full h-14 rounded-2xl text-xs font-black tracking-widest flex items-center justify-center gap-2 bg-gradient-to-r from-brand-gold to-[#f5d77a] text-brand-navy hover:from-[#f2ce5d] hover:to-brand-gold shadow-xl cursor-pointer"
            >
              <span>AKTIFKAN PAKET TAHUNAN (RP 99.000)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <button
              type="button"
              onClick={handleSkip}
              className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer text-center"
            >
              Lanjutkan dengan Akun Gratis (Atur Saldo Dulu)
            </button>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div className="w-full max-w-md text-center py-2">
        <p className="text-[10px] text-slate-500 font-semibold">
          BILANO Finance App • Privasi & Data Terenkripsi
        </p>
      </div>
    </div>
  );
}