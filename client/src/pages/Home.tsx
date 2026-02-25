import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  useUser, useTransactions, useTarget, 
  useForexAssets 
} from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents"; // <-- Ini tambahan baru
import { 
  ArrowUpCircle, ArrowDownCircle, 
  TrendingUp, Sparkles, DollarSign, 
  HandCoins, RefreshCcw, FileText, LogOut, User, BarChart3, ChevronRight,
  MoreVertical, ShieldCheck, ScanLine, Crown
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: transactions } = useTransactions();
  const { data: forexAssets } = useForexAssets(); 
  const { data: target, isLoading: isTargetLoading } = useTarget(); 

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileZoomed, setIsProfileZoomed] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false); // <-- State pop-up target
  const [forexRates, setForexRates] = useState<Record<string, number>>({});
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  const userEmail = localStorage.getItem("bilano_email") || "Pengguna";
  const greetingName = user?.firstName ? user.firstName : userEmail.split("@")[0];

  const isUserPro = user?.isPro || user?.plan === 'pro' || localStorage.getItem("bilano_pro") === "true";

  useEffect(() => {
      if (isUserPro) return;
      const trialStart = localStorage.getItem("bilano_trial_start");
      if (trialStart) {
          const startTime = parseInt(trialStart);
          const currentTime = Date.now();
          const daysPassed = (currentTime - startTime) / (1000 * 60 * 60 * 24);
          const TRIAL_DURATION_DAYS = 3; 

          if (daysPassed >= TRIAL_DURATION_DAYS) {
              setLocation("/paywall");
          } else {
              setTrialDaysLeft(Math.ceil(TRIAL_DURATION_DAYS - daysPassed));
          }
      }
  }, [setLocation, isUserPro]);

  useEffect(() => {
      if (!isUserLoading && !isTargetLoading) {
          const isTargetEmpty = !target || (typeof target === 'object' && Object.keys(target).length === 0);
          if (isTargetEmpty) {
              setLocation("/target");
          }
      }
  }, [target, isUserLoading, isTargetLoading, setLocation]);

  useEffect(() => {
    const fetchRates = async () => {
        try {
            const res = await fetch("/api/forex/rates");
            if (res.ok) {
                const rates = await res.json();
                setForexRates(rates);
            }
        } catch (e) { console.error("Gagal fetch rates home", e); }
    };
    fetchRates();
  }, []);

  const calculateForexTotal = () => {
      if (!forexAssets || Object.keys(forexRates).length === 0) return 0;
      return forexAssets.reduce((acc, asset) => {
          const rate = forexRates[asset.currency] || 0; 
          return acc + (asset.amount * rate);
      }, 0);
  };

  const forexValue = calculateForexTotal();
  const cashRupiah = (user?.cashBalance || 0); 
  const totalBalance = cashRupiah + forexValue; 

  // ==========================================
  // LOGIKA DETEKSI TARGET TERCAPAI
  // ==========================================
  useEffect(() => {
    if (target && target.targetAmount > 0 && totalBalance >= target.targetAmount) {
        // Cek apakah user sudah pernah memencet "Biarkan Saja" untuk target ini
        const isDismissed = localStorage.getItem(`bilano_target_done_${target.id}`);
        if (!isDismissed) {
            setShowTargetModal(true);
        }
    }
  }, [target, totalBalance]);

  const dismissTargetModal = () => {
      if (target?.id) {
          localStorage.setItem(`bilano_target_done_${target.id}`, "true");
      }
      setShowTargetModal(false);
  };

  const handleLogout = async () => {
    try {
        await signOut(auth); 
        localStorage.removeItem("bilano_auth");
        localStorage.removeItem("bilano_email");
        toast({ title: "Berhasil Keluar", description: "Sampai jumpa lagi!" });
        setLocation("/auth"); 
    } catch (error) { console.error(error); }
  };

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const income = transactions?.filter(t => {
      const d = new Date(t.date);
      return t.type === 'income' && (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, t) => acc + t.amount, 0) || 0;

  const expense = transactions?.filter(t => {
      const d = new Date(t.date);
      return t.type === 'expense' && (d.getMonth() + 1) === currentMonth && d.getFullYear() === currentYear;
  }).reduce((acc, t) => acc + t.amount, 0) || 0;
  
  if (isUserLoading || isTargetLoading) {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 animate-pulse">Memuat Data...</div>;
  }

  const isTargetEmpty = !target || (typeof target === 'object' && Object.keys(target).length === 0);
  if (isTargetEmpty) return null;

  return (
    <MobileLayout>
      {/* ========================================== */}
      {/* MODAL / POP-UP TARGET TERCAPAI */}
      {/* ========================================== */}
      {showTargetModal && (
          <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white rounded-[32px] p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 border-4 border-emerald-100">
                  <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Crown className="w-10 h-10" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Target Tercapai! 🎉</h2>
                  <p className="text-slate-500 text-sm mb-8">Luar biasa! Saldo kamu sudah melebihi impian yang kamu targetkan. Ingin membuat target baru?</p>
                  <div className="space-y-3">
                      <Button onClick={() => { dismissTargetModal(); setLocation('/target'); }} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 font-bold rounded-full text-lg shadow-lg shadow-emerald-200">BUAT TARGET BARU</Button>
                      <Button variant="ghost" onClick={dismissTargetModal} className="w-full h-14 font-bold text-slate-400 hover:text-slate-600 rounded-full">BIARKAN SAJA</Button>
                  </div>
              </div>
          </div>
      )}

      {isProfileZoomed && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsProfileZoomed(false)}>
            <div className="relative animate-in fade-in zoom-in duration-200">
                {user?.profilePicture ? (
                    <img src={user.profilePicture} alt="Profile Large" className="max-w-full max-h-[80vh] rounded-full border-4 border-white shadow-2xl" />
                ) : (
                    <div className="w-64 h-64 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-6xl border-4 border-white">
                        {greetingName.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-2 pt-2">
            <div className="flex items-center gap-3">
                <div onClick={() => setIsProfileZoomed(true)} className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer hover:scale-105 transition-transform active:scale-95 bg-slate-100">
                    {user?.profilePicture ? (
                        <img src={user.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                            {greetingName.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-slate-500">Selamat datang,</p>
                        {isUserPro && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </div>
                    <h2 className="text-lg font-extrabold text-slate-800 capitalize leading-tight">{greetingName}</h2>
                </div>
            </div>

            <div className="relative">
                <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                    <MoreVertical className="w-5 h-5"/>
                </button>

                {isMenuOpen && (
                    <div className="absolute top-12 right-0 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 py-2 z-50 animate-in slide-in-from-top-2">
                        <Link href="/profile">
                            <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3">
                                <User className="w-4 h-4 text-slate-400"/> Edit Profil
                            </button>
                        </Link>
                        <button className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 font-medium flex items-center gap-3">
                            <ShieldCheck className="w-4 h-4 text-slate-400"/> Keamanan
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-3 font-bold">
                            <LogOut className="w-4 h-4 text-rose-500"/> Keluar
                        </button>
                    </div>
                )}
            </div>
        </div>

        {/* BANNER TRIAL */}
        {!isUserPro && trialDaysLeft !== null && (
            <div className="mx-1 mt-[-10px] bg-gradient-to-r from-amber-400 to-yellow-500 rounded-[20px] p-4 shadow-lg flex items-center justify-between text-amber-950 animate-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-full">
                        <Crown className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-widest mb-0.5">Masa Coba Gratis</p>
                        <p className="text-xs font-medium opacity-90">Sisa waktu: <b>{trialDaysLeft} Hari</b></p>
                    </div>
                </div>
                <Link href="/paywall">
                    <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full text-[10px] font-extrabold backdrop-blur-sm transition-all active:scale-95 shadow-sm">
                        UPGRADE PRO
                    </button>
                </Link>
            </div>
        )}
        
        {/* KARTU SALDO */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden group transition-all hover:scale-[1.01]">
           <div className="relative z-10 flex flex-col pt-2 pb-4">
              <p className="text-[11px] font-bold text-blue-100 mb-1 uppercase tracking-widest">Total Cash</p>
              <h2 className="text-4xl font-extrabold tracking-tight text-white mb-6 drop-shadow-sm">
                 {formatCurrency(totalBalance).split(",")[0]}
              </h2>
              <div className="flex gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                      <span>IDR:</span> <span className="font-bold text-white">{formatCurrency(cashRupiah).split(",")[0]}</span>
                  </div>
                  {forexValue > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-100 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
                          <span>Valas:</span> <span className="font-bold text-white">{formatCurrency(forexValue).split(",")[0]}</span>
                      </div>
                  )}
              </div>
           </div>
           <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-tl-full pointer-events-none"></div>
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
           <div className="absolute left-0 bottom-0 w-24 h-24 bg-blue-400/20 rounded-tr-full blur-xl pointer-events-none"></div>
        </div>

        {/* MASUK / KELUAR */}
        <div className="grid grid-cols-2 gap-4 px-1">
           <Link href="/income">
               <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 cursor-pointer flex flex-col justify-between h-28 active:scale-95 transition-all group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mb-2 group-hover:bg-emerald-100 transition-colors">
                        <ArrowDownCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pemasukan</p>
                        <p className="text-base font-extrabold text-slate-800 leading-tight">{formatCurrency(income).split(",")[0]}</p>
                    </div>
               </div>
           </Link>
           <Link href="/expense">
               <div className="bg-white p-4 rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 cursor-pointer flex flex-col justify-between h-28 active:scale-95 transition-all group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center mb-2 group-hover:bg-rose-100 transition-colors">
                        <ArrowUpCircle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pengeluaran</p>
                        <p className="text-base font-extrabold text-slate-800 leading-tight">{formatCurrency(expense).split(",")[0]}</p>
                    </div>
               </div>
           </Link>
        </div>

        {/* GRID MENU */}
        <div className="px-1 mt-2">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Fitur Pilihan</h3>
            <div className="grid grid-cols-3 gap-y-6 gap-x-3">
                <MenuIconBox href="/forex" icon={DollarSign} bg="bg-blue-500" label="Valas" />
                <MenuIconBox href="/debts" icon={HandCoins} bg="bg-pink-500" label="Hutang" />
                <MenuIconBox href="/subscriptions" icon={RefreshCcw} bg="bg-teal-400" label="Langganan" />
                <MenuIconBox href="/investment" icon={TrendingUp} bg="bg-emerald-500" label="Investasi" />
                <MenuIconBox href="/reports" icon={FileText} bg="bg-orange-400" label="Laporan" />
                <MenuIconBox href="/scan" icon={ScanLine} bg="bg-indigo-500" label="Scan" />
            </div>
        </div>

        {/* AI & PERFORMA */}
        <div className="flex flex-col gap-4 mt-2 px-1">
            <Link href="/chat-ai">
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all relative overflow-hidden group">
                    <div className="flex items-center gap-4 z-10">
                        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6 text-indigo-600"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Tanya AI Assistant</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Konsultasi cerdas 24/7</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 z-10"/>
                    <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-indigo-50 to-transparent pointer-events-none"></div>
                </div>
            </Link>

            <Link href="/performance">
                <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-slate-100 cursor-pointer flex items-center justify-between active:scale-[0.98] transition-all group">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <BarChart3 className="w-6 h-6 text-orange-500"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-base">Analisa Performa</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Pantau target & grafikmu</p>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300"/>
                </div>
            </Link>
        </div>

      </div>
    </MobileLayout>
  );
}

function MenuIconBox({ href, icon: Icon, bg, label }: any) {
    return (
        <Link href={href}>
            <div className="flex flex-col items-center justify-start gap-2 cursor-pointer active:scale-95 transition-transform group">
                <div className={`${bg} w-14 h-14 rounded-full flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:shadow-lg transition-all`}>
                    <Icon className="w-6 h-6"/>
                </div>
                <span className="text-[11px] font-bold text-slate-700 text-center">{label}</span>
            </div>
        </Link>
    )
}