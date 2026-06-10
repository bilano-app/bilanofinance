import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { useUser, useTransactions, useTarget } from "@/hooks/use-finance";
import { CheckCircle2, Sparkles, Crown, ArrowRight, Loader2, X, ShieldCheck, CreditCard, Lock, Bot, Hourglass, Activity, Target as TargetIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  
  const { data: user } = useUser();
  const { data: transactions = [] } = useTransactions();
  const { data: target } = useTarget();

  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  // 🚀 KALKULASI STATUS TRIAL
  const startTime = new Date(user?.createdAt || Date.now()).getTime();
  const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
  const isTrialExpired = daysPassed >= 3 || (typeof window !== 'undefined' && localStorage.getItem(`bilano_trial_expired_${userEmail}`) === "true");

  // 🚀 KALKULASI REKAP DATA (FOMO)
  const txCount = transactions.length;
  const aiProgress = Math.min(30, txCount);
  const aiPercent = (aiProgress / 30) * 100;
  
  const currentWealth = user?.cashBalance || 0;
  const targetGoal = target?.targetAmount || 0;
  const progressPercent = targetGoal > 0 ? Math.min(100, Math.max(0, (currentWealth / targetGoal) * 100)) : 0;

  const handleUpgradeExecution = async () => {
    setIsProcessing(true);
    try {
      // Simulasi aktivasi status akun PRO Mayar payment gateway webhook
      const res = await fetch("/api/subscriptions/upgrade-mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail })
      });

      if (!res.ok) throw new Error("Gagal memproses transaksi dengan payment gateway.");

      localStorage.removeItem(`bilano_trial_expired_${userEmail}`);
      
      toast({
        title: "Akses PRO Aktif!",
        description: "Selamat, sistem kendali #NalarCuan Anda telah terbuka sepenuhnya.",
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

  return (
    <MobileLayout hideNav>
      <div className="min-h-screen bg-slate-900 text-white px-4 py-6 flex flex-col justify-between relative overflow-hidden overflow-y-auto custom-scrollbar">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl -z-10"></div>

        {/* TOP INTERACTIVE EXITS */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setLocation("/")} className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-900/40">
            BILANO PREMIUM
          </span>
        </div>

        {/* 📊 EMOTIONAL CHECKPOINT AREA (CONDITIONAL RENDERING) */}
        {!isTrialExpired ? (
            <div className="my-auto py-2 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-950/50">
                  <Crown className="w-7 h-7 text-slate-900" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                  Amankan Progress Kendali<br />Arsitektur Finansial Anda
                </h1>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
                  Jangan biarkan konsistensi yang telah Anda bangun terputus di tengah jalan.
                </p>
              </div>

              {/* Rangkuman Riwayat Pengguna Aktif */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-[24px] p-4.5 grid grid-cols-2 gap-3 text-left">
                <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-900/50">
                  <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider mb-0.5">Histori Transaksi</span>
                  <span className="text-base font-black text-indigo-400">{txCount} Data Tercatat</span>
                </div>
                <div className="bg-slate-950/40 rounded-xl p-3 border border-slate-900/50">
                  <span className="text-[9px] text-slate-500 font-black uppercase block tracking-wider mb-0.5">Target Keuangan</span>
                  <span className="text-base font-black text-emerald-400">{targetGoal > 0 ? "100% Terpasang" : "Siap Dikonfigurasi"}</span>
                </div>
              </div>
            </div>
        ) : (
            <div className="my-auto py-2 space-y-5 animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-rose-900/20 mb-2 border border-rose-500/20">
                        <Hourglass className="w-8 h-8 text-rose-400 animate-pulse" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                        Waktu Uji Coba Habis ⏳
                    </h1>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto font-medium leading-relaxed">
                        Sayang banget kalau berhenti di sini! Lihat seberapa jauh perjalanan kamu membangun fondasi keuangan sejauh ini:
                    </p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700 rounded-[24px] p-5 space-y-5 shadow-xl">
                    {/* Transaksi */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
                            <Activity className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1">
                                <h4 className="text-sm font-bold text-slate-200">Data Transaksi</h4>
                                <span className="text-xs font-black text-indigo-400">{txCount} Tercatat</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Rekam jejak keuanganmu sudah mulai terbentuk rapi.</p>
                        </div>
                    </div>

                    {/* Target */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                            <TargetIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1.5">
                                <h4 className="text-sm font-bold text-slate-200">Progress Target</h4>
                                <span className="text-xs font-black text-emerald-400">{progressPercent.toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(16,185,129,0.6)]" style={{width: `${progressPercent}%`}}></div>
                            </div>
                        </div>
                    </div>

                    {/* AI */}
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
                            <Bot className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-end mb-1.5">
                                <h4 className="text-sm font-bold text-slate-200">Aktivasi AI Strategi</h4>
                                <span className="text-xs font-black text-amber-400">{aiProgress} / 30</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(245,158,11,0.6)]" style={{width: `${aiPercent}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center">
                    <p className="text-[11px] text-amber-300 font-bold bg-amber-500/10 inline-block px-4 py-2 rounded-full border border-amber-500/20">
                        🔥 Lanjut gas dengan Premium untuk amankan data ini!
                    </p>
                </div>
            </div>
        )}

        <div className="mt-4 mb-4">
          {/* PAKET PEMBINGKAIAN HARGA (#NalarCuan LOGIC FRAMING) */}
          <div className="space-y-3 mb-5">
            <div 
              onClick={() => setSelectedPlan('yearly')}
              className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400' : 'border-slate-800 bg-slate-950/20'}`}
            >
              <div className="flex gap-3">
                <div className={`w-5 h-5 rounded-full border-4 mt-0.5 ${selectedPlan === 'yearly' ? 'border-amber-400 bg-slate-900' : 'border-slate-700'}`}></div>
                <div>
                  <h4 className="font-black text-sm text-white flex items-center gap-1.5">
                    Paket Akses Tahunan <span className="text-[9px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.5 rounded uppercase">HEMAT 50%</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Kunci harga selamanya di angka Rp 99.000 / tahun
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-amber-400 block">Rp 500<span className="text-[9px] font-medium text-slate-400"> / hari</span></span>
                <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Tagihan Rp 99rb/thn</span>
              </div>
            </div>

            <div 
              onClick={() => setSelectedPlan('monthly')}
              className={`p-4 rounded-2xl border text-left flex items-center justify-between cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500' : 'border-slate-800 bg-slate-950/20'}`}
            >
              <div className="flex gap-3">
                <div className={`w-5 h-5 rounded-full border-4 mt-0.5 ${selectedPlan === 'monthly' ? 'border-indigo-500 bg-slate-900' : 'border-slate-700'}`}></div>
                <div>
                  <h4 className="font-black text-sm text-white">Paket Akses Bulanan</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">Evaluasi fleksibel dari bulan ke bulan</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-black text-slate-200 block">Rp 14.900<span className="text-[9px] font-medium text-slate-500"> / bln</span></span>
              </div>
            </div>
          </div>

          {/* BENEFIT CHECKLISTS MURNI VALUE-DRIVEN */}
          <div className="space-y-2.5 px-2 mb-6">
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Buka Semua Fitur Analisis Performa & Grafik Evaluasi</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
              <Bot className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Aktifkan Komputasi Penuh AI Strategi Penghasilan</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Proteksi Kunci Garansi Harga Perpanjangan Selamanya</span>
            </div>
          </div>

          {/* PROMPT ACTION FOOTER BUTTONS */}
          <div className="space-y-3">
            <Button 
              disabled={isProcessing}
              onClick={handleUpgradeExecution}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-full tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-950"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : (
                <>UPGRADE KE AKSES PREMIUM NOW <ArrowRight className="w-4 h-4" /></>
              )}
            </Button>
            
            <button 
              type="button" 
              onClick={() => setShowVisionModal(true)} 
              className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-slate-400 tracking-wider uppercase transition-colors pt-2 pb-1"
            >
              BACA KOMITMEN GARANSI LOCK HARGA BILANO
            </button>
          </div>
        </div>

        {/* VISION MODAL / VALUE LOCK PROTECTION STATEMENT */}
        {showVisionModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 w-full max-w-sm shadow-2xl relative text-left animate-in zoom-in-95">
              <button onClick={() => setShowVisionModal(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5"/>
              </button>
              
              <div className="flex items-center gap-2 text-amber-400 mb-3">
                <Sparkles className="w-5 h-5" />
                <h3 className="text-base font-black tracking-tight text-white">Garansi Nilai Kunci Permanen</h3>
              </div>
              
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium mb-4">
                Seiring bertambahnya modul edukasi keuangan premium, integrasi otomasi scan nota, dan pengembangan arsitektur kecerdasan AI di masa mendatang, nominal tarif bagi pengguna baru akan terus disesuaikan naik secara berkala.
              </p>
              <p className="text-[11px] text-slate-300 bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl leading-relaxed font-semibold">
                Namun bagi Anda yang mengamankan akun hari ini, tarif perpanjangan langganan di tahun-tahun berikutnya akan dikunci mati selamanya di nominal awal pendaftaran Anda tanpa dibebani biaya tambahan apa pun.
              </p>

              <Button onClick={() => setShowVisionModal(false)} className="w-full h-11 bg-white hover:bg-slate-100 text-slate-950 font-black text-xs rounded-full mt-4">
                SAYA MENGERTI
              </Button>
            </div>
          </div>
        )}
      </div>
    </MobileLayout>
  );
}