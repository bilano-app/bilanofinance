import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { useUser, useTransactions, useTarget } from "@/hooks/use-finance";
import { 
  CheckCircle, Star, Award, ArrowRight, Loader2, X, 
  Cpu, TrendingUp, Lock, ChevronRight 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// =========================================================================
// 🚀 PAYWALL v2 — "Checkpoint Perjalanan" bukan "Tembok Biaya"
// =========================================================================

export default function Paywall() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [showComingSoonModal, setShowComingSoonModal] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState("");
  
  const { data: user } = useUser();
  const { data: transactions = [] } = useTransactions();
  const { data: target } = useTarget();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  // ── Hitung data progress user ──────────────────────────────────────────
  const txCount = transactions.length;
  const daysPassed = parseInt(localStorage.getItem("bilano_trial_days_passed") || "0");
  const daysRemaining = parseInt(localStorage.getItem("bilano_trial_days_remaining") || "14");
  const hasTarget = !!target;

  // Simpan tx count ke localStorage untuk dipakai di PaywallLockAlert di App.tsx
  useEffect(() => {
    if (txCount > 0) {
      localStorage.setItem("bilano_cached_tx_count", String(txCount));
    }
    if (hasTarget) {
      localStorage.setItem("bilano_has_target", "true");
    }
  }, [txCount, hasTarget]);

  // AI Strategi countdown — butuh 30 hari data
  const aiDaysRemaining = Math.max(0, 30 - daysPassed);
  const aiProgressPercent = Math.min(100, Math.round((daysPassed / 30) * 100));

  // Apakah ini user baru (baru selesai setup) atau trial expired?
  const isTrialExpired = localStorage.getItem("bilano_trial_expired") === "true";
  const isNewUserFlow = !isTrialExpired && daysRemaining >= 13; // baru daftar

  // ── Handler upgrade ────────────────────────────────────────────────────
  const handleUpgradeExecution = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/subscriptions/upgrade-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });

      if (!res.ok) throw new Error("Gagal memproses transaksi dengan payment gateway.");

      localStorage.removeItem(`bilano_trial_expired_${userEmail}`);
      localStorage.setItem("bilano_pro", "true");
      
      toast({
        title: "Akses PRO Aktif! 🎉",
        description: "Selamat, harga kamu sudah terkunci selamanya. Selamat datang di Bilano Premium!",
      });
      
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Gagal Sinkronisasi",
        description: err.message || "Koneksi terputus.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComingSoon = (featureName: string) => {
    setComingSoonFeature(featureName);
    setShowComingSoonModal(true);
  };

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-slate-900 text-white px-4 py-6 flex flex-col relative overflow-hidden">
        
        {/* Background atmosphere */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        {/* ── TOP BAR ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <button 
            onClick={() => setLocation("/")} 
            className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/40">
            BILANO PREMIUM
          </span>
          <div className="w-8"></div>
        </div>

        {/* ── HERO ────────────────────────────────────────────────── */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-amber-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-950/50">
            <Award className="w-8 h-8 text-slate-900" />
          </div>
          
          {isNewUserFlow ? (
            <>
              <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                Selamat Datang di Bilano!<br />
                <span className="text-indigo-400">Kamu Sudah Mulai Langkah Pertama</span>
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">
                Targetmu sudah tercatat. Amankan perjalananmu sebelum harga naik.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                Perjalananmu Belum Selesai.<br />
                <span className="text-indigo-400">Jangan Berhenti di Sini.</span>
              </h1>
              <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium leading-relaxed">
                Semua progress yang kamu bangun selama {daysPassed} hari ini menunggu untuk dilanjutkan.
              </p>
            </>
          )}
        </div>

        {/* ── PROGRESS CHECKPOINT ─────────────────────────────────── */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-[24px] p-4 mb-5">
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 text-center">
            Progress yang Sudah Kamu Bangun
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-900/50">
              <span className="text-2xl font-black text-indigo-400 block">{txCount}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide leading-tight block mt-0.5">Transaksi<br/>Tercatat</span>
            </div>
            <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-900/50">
              <span className="text-2xl font-black text-emerald-400 block">{daysPassed}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide leading-tight block mt-0.5">Hari<br/>Aktif</span>
            </div>
            <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-900/50">
              <span className="text-2xl font-black text-amber-400 block">{hasTarget ? "✓" : "–"}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wide leading-tight block mt-0.5">Target<br/>Terpasang</span>
            </div>
          </div>
        </div>

        {/* ── AI STRATEGI — LOCKED BUT VISIBLE ────────────────────── */}
        <div 
          onClick={() => handleComingSoon("AI Strategi Penghasilan")}
          className="bg-gradient-to-r from-indigo-900/60 to-indigo-800/40 border border-indigo-700/50 rounded-[20px] p-4 mb-5 cursor-pointer active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-black text-white uppercase tracking-wider">AI Strategi Penghasilan</p>
                <span className="text-[8px] bg-amber-400 text-amber-950 font-black px-1.5 py-0.5 rounded uppercase">PREMIUM</span>
              </div>
              <p className="text-[10px] text-indigo-300 font-medium mt-0.5">
                Rekomendasi personal berdasarkan data keuanganmu
              </p>
            </div>
            <Lock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wide">Progress Data</span>
              <span className="text-[9px] text-indigo-300 font-black">
                {aiDaysRemaining > 0 ? `${aiDaysRemaining} hari lagi siap` : "Siap diakses!"}
              </span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-700"
                style={{ width: `${Math.max(5, aiProgressPercent)}%` }}
              ></div>
            </div>
            <p className="text-[9px] text-slate-500 font-medium">
              Butuh data 30 hari untuk kalkulasi strategi yang akurat. {aiProgressPercent}% selesai.
            </p>
          </div>
        </div>

        {/* ── COMING SOON FEATURES ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button 
            onClick={() => handleComingSoon("E-Book Keuangan Premium")}
            className="bg-slate-800/40 border border-slate-700/50 rounded-[16px] p-3 text-left hover:border-amber-500/40 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📚</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] bg-amber-400/20 text-amber-400 border border-amber-400/30 font-black px-1.5 py-0.5 rounded uppercase">Soon</span>
                <Lock className="w-3 h-3 text-slate-500" />
              </div>
            </div>
            <p className="text-[10px] font-black text-white">E-Book Keuangan</p>
            <p className="text-[9px] text-slate-500 font-medium mt-0.5">Panduan finansial premium</p>
          </button>

          <button 
            onClick={() => handleComingSoon("Analisis Saham & Portofolio")}
            className="bg-slate-800/40 border border-slate-700/50 rounded-[16px] p-3 text-left hover:border-amber-500/40 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">📈</span>
              <div className="flex items-center gap-1">
                <span className="text-[7px] bg-amber-400/20 text-amber-400 border border-amber-400/30 font-black px-1.5 py-0.5 rounded uppercase">Soon</span>
                <Lock className="w-3 h-3 text-slate-500" />
              </div>
            </div>
            <p className="text-[10px] font-black text-white">Analisis Saham</p>
            <p className="text-[9px] text-slate-500 font-medium mt-0.5">Portofolio & rekomendasi</p>
          </button>
        </div>

        {/* ── PAKET HARGA ──────────────────────────────────────────── */}
        <div className="space-y-3 mb-5">
          <div 
            onClick={() => setSelectedPlan('yearly')}
            className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
              selectedPlan === 'yearly' 
                ? 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400' 
                : 'border-slate-800 bg-slate-950/20'
            }`}
          >
            <div className="flex gap-3">
              <div className={`w-5 h-5 rounded-full border-4 mt-0.5 flex-shrink-0 ${selectedPlan === 'yearly' ? 'border-amber-400 bg-slate-900' : 'border-slate-700'}`}></div>
              <div>
                <h4 className="font-black text-sm text-white flex items-center gap-1.5 flex-wrap">
                  Tahunan
                  <span className="text-[8px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">HEMAT 45%</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Kunci harga Rp 99.000/tahun selamanya
                </p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <span className="text-sm font-black text-amber-400 block">Rp 500<span className="text-[9px] font-medium text-slate-400">/hari</span></span>
              <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Rp 99rb/tahun</span>
            </div>
          </div>

          <div 
            onClick={() => setSelectedPlan('monthly')}
            className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${
              selectedPlan === 'monthly' 
                ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500' 
                : 'border-slate-800 bg-slate-950/20'
            }`}
          >
            <div className="flex gap-3">
              <div className={`w-5 h-5 rounded-full border-4 mt-0.5 flex-shrink-0 ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-slate-900' : 'border-slate-700'}`}></div>
              <div>
                <h4 className="font-black text-sm text-white">Bulanan</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Fleksibel, evaluasi setiap bulan</p>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <span className="text-sm font-black text-slate-200 block">Rp 14.900<span className="text-[8px] font-medium text-slate-500">/bln</span></span>
            </div>
          </div>
        </div>

        {/* ── BENEFIT LIST ─────────────────────────────────────────── */}
        <div className="space-y-2 mb-6 px-1">
          {[
            { icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />, text: "Semua fitur lengkap: Valas, Investasi, Piutang, PDF Report" },
            { icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />, text: "AI Konsultasi berdasarkan kondisi keuangan riil kamu" },
            { icon: <Cpu className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />, text: "AI Strategi Penghasilan (aktif setelah 30 hari data)" },
            { icon: <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />, text: "Garansi harga terkunci selamanya di angka sekarang" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2.5 text-[11px] font-semibold text-slate-300">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* ── DATA SAFETY NOTICE ───────────────────────────────────── */}
        {isTrialExpired && (
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-[16px] p-3 mb-4 text-center">
            <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
              🔒 Data dan progressmu <span className="text-slate-300 font-bold">tetap aman selama 30 hari</span> ke depan. 
              Lanjutkan kapan pun kamu siap.
            </p>
          </div>
        )}

        {/* ── CTA BUTTONS ──────────────────────────────────────────── */}
        <div className="space-y-3 pb-6">
          <Button 
            disabled={isProcessing}
            onClick={handleUpgradeExecution}
            className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-full tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-950"
          >
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin"/>
            ) : (
              <>
                {isNewUserFlow ? "AMANKAN HARGA SEKARANG" : "LANJUTKAN PERJALANAN"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
          
          <button 
            type="button" 
            onClick={() => setShowVisionModal(true)} 
            className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-slate-400 tracking-wider uppercase transition-colors"
          >
            BACA KOMITMEN GARANSI LOCK HARGA BILANO
          </button>
        </div>
      </div>

      {/* ── MODAL: GRANDFATHERED PRICING COMMITMENT ──────────────── */}
      {showVisionModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl relative text-left animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setShowVisionModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5"/>
            </button>
            
            <div className="flex items-center gap-2 text-amber-400 mb-4">
              <Star className="w-5 h-5" />
              <h3 className="text-base font-black tracking-tight text-white">Garansi Harga Terkunci Selamanya</h3>
            </div>
            
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-4">
              Bilano terus berkembang. E-Book Keuangan Premium, Analisis Saham, dan fitur AI yang lebih canggih 
              sedang dalam pengembangan aktif. Setiap fitur baru yang hadir akan menaikkan harga berlangganan 
              untuk pengguna baru.
            </p>
            
            <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-2xl mb-4">
              <p className="text-[11px] text-slate-300 leading-relaxed font-semibold">
                Tapi bagi kamu yang berlangganan hari ini — harga perpanjanganmu di tahun-tahun berikutnya 
                dikunci permanen di angka ini. <span className="text-amber-400">Tidak ada kenaikan. Tidak ada biaya tambahan.</span> Selamanya.
              </p>
            </div>

            <p className="text-[10px] text-slate-500 leading-relaxed font-medium mb-4">
              Ini bukan taktik marketing. Ini adalah cara Bilano menghargai orang-orang yang percaya lebih awal.
            </p>

            <Button onClick={() => setShowVisionModal(false)} className="w-full h-11 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs rounded-full">
              SAYA MENGERTI — AMANKAN HARGA SAYA
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL: COMING SOON FEATURES ──────────────────────────── */}
      {showComingSoonModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-end justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl relative animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setShowComingSoonModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
              <X className="w-5 h-5"/>
            </button>

            <div className="text-center mb-5">
              <div className="w-14 h-14 bg-indigo-900/60 border border-indigo-700/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-base font-black text-white mb-1">{comingSoonFeature}</h3>
              <span className="text-[9px] bg-amber-400/20 text-amber-400 border border-amber-400/30 font-black px-2 py-0.5 rounded uppercase tracking-wide">
                Segera Hadir
              </span>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/40 rounded-2xl p-4 mb-4">
              <p className="text-[11px] text-slate-300 leading-relaxed font-semibold text-center">
                Fitur ini sedang dalam pengembangan aktif.
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-medium text-center mt-1.5">
                Saat fitur ini hadir, <span className="text-amber-400 font-bold">harga Bilano akan naik</span> untuk pengguna baru. 
                Subscriber sekarang? Hargamu <span className="text-emerald-400 font-bold">terkunci selamanya</span>.
              </p>
            </div>

            <Button 
              onClick={() => { setShowComingSoonModal(false); handleUpgradeExecution(); }} 
              disabled={isProcessing}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-full mb-2"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin"/> : "KUNCI HARGA SAYA SEKARANG"}
            </Button>
            <button 
              onClick={() => setShowComingSoonModal(false)} 
              className="w-full text-center text-[10px] text-slate-500 font-bold py-2"
            >
              Nanti saja
            </button>
          </div>
        </div>
      )}
    </MobileLayout>
  );
}