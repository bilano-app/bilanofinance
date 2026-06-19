import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WifiOff, RefreshCw, Lock } from "lucide-react"; 
import { useNotifications } from "./hooks/useNotifications"; 
import { useUser, useTransactions } from "./hooks/use-finance"; 

// =========================================================================
// 🚀 KUNCI MEMORI AGAR ANGKA TIDAK BERKEDIP
// =========================================================================
queryClient.setDefaultOptions({
  queries: {
    refetchOnWindowFocus: true, 
    refetchOnMount: true,       
    refetchOnReconnect: true,
    staleTime: 1000 * 60 * 5,   
    retry: 1                    
  },
});

// =========================================================================
// 🛡️ SATPAM API: BLOKIR SEMUA TRANSAKSI JIKA TRIAL HABIS / NON PREMIUM
// =========================================================================
const originalFetch = window.fetch;
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : (input as Request).url;
  const method = init.method ? init.method.toUpperCase() : 'GET';
  const email = localStorage.getItem("bilano_email");

  const newHeaders = new Headers(init.headers);
  if (email && url.includes('/api')) {
    newHeaders.set('x-user-email', email);
  }
  init.headers = newHeaders;

  const isWriteAction = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
  
  const isAllowedRoute = url.includes('/api/auth') || 
                         url.includes('/api/user/onesignal') || 
                         url.includes('/api/payment');

  const isTrialExpired = localStorage.getItem('bilano_trial_expired') === 'true';
  const isPro = localStorage.getItem('bilano_pro') === 'true';

  if (isWriteAction && !isAllowedRoute && isTrialExpired && !isPro) {
      window.dispatchEvent(new Event('trigger-paywall-lock'));
      return Promise.reject(new Error("TRIAL_EXPIRED_LOCKED")); 
  }

  return originalFetch(input, init);
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

// @ts-ignore
XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
    (this as any)._url = url;
    return originalXhrOpen.apply(this, [method, url, ...args] as any);
};

// @ts-ignore
XMLHttpRequest.prototype.send = function(...args: any[]) {
    if ((this as any)._url && typeof (this as any)._url === 'string' && (this as any)._url.includes('/api')) {
        const email = localStorage.getItem("bilano_email");
        if (email) {
            this.setRequestHeader('x-user-email', email);
        }
    }
    return originalXhrSend.apply(this, args as any);
};
// =========================================================================

// =========================================================================
// 🚀 PAYWALL LOCK ALERT — Checkpoint Perjalanan
// =========================================================================
function PaywallLockAlert({ onClose, onUpgrade, onDismiss }: { onClose: () => void; onUpgrade: () => void; onDismiss: () => void; }) {
  const txCount = parseInt(localStorage.getItem("bilano_cached_tx_count") || "0");
  const daysPassed = parseInt(localStorage.getItem("bilano_trial_days_passed") || "0");
  const hasTarget = localStorage.getItem("bilano_has_target") === "true";
  
  const aiDaysRemaining = Math.max(0, 30 - daysPassed);

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-[28px] max-w-sm w-full shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 text-white text-center">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-6 h-6 text-white"/>
          </div>
          <h3 className="text-lg font-black tracking-tight">Perjalananmu Belum Selesai</h3>
          <p className="text-[11px] text-indigo-200 mt-1 font-medium">Masa trial telah habis — tapi progresmu tetap tersimpan.</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <span className="text-xl font-black text-indigo-600 block">{txCount}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Transaksi</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <span className="text-xl font-black text-emerald-600 block">{daysPassed}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Hari Aktif</span>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
              <span className="text-xl font-black text-amber-500 block">{hasTarget ? "✓" : "–"}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">Target</span>
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs">🤖</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">AI Strategi Penghasilan</p>
              <p className="text-[10px] text-indigo-500 font-semibold">
                {aiDaysRemaining > 0 ? `Siap dalam ${aiDaysRemaining} hari lagi` : "Siap diakses — upgrade sekarang!"}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed font-medium">
            Lanjutkan seharga <span className="font-black text-slate-800">Rp 500/hari</span> — kurang dari secangkir kopi.
          </p>

          <div className="space-y-2">
            <button 
              onClick={onUpgrade}
              className="w-full py-3.5 rounded-full bg-indigo-600 text-white font-extrabold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              LANJUTKAN PERJALANAN
            </button>
            <button 
              onClick={onDismiss}
              className="w-full py-3 rounded-full bg-slate-100 text-slate-500 font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// 🚀 GATEKEEPER KHUSUS TERMINAL EXPERT (Blokir akses dari HP)
// =========================================================================
function DesktopRequiredGate({ children }: { children: React.ReactNode }) {
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  if (isMobileScreen) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center text-center p-6 text-slate-300">
        <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mb-6 border border-rose-500/20">
           <Lock className="w-8 h-8 text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Gunakan PC/Laptop</h2>
        <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-8">
          BILANO Expert Terminal membutuhkan layar lebar untuk merender chart dan analisis skala besar secara optimal. Buka akun Anda melalui browser PC.
        </p>
        <button onClick={() => window.location.href = '/'} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors">
          Kembali ke Versi Mobile
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

import NotFound from "@/pages/not-found";
import Security from "./pages/Security";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing"; 
import Target from "@/pages/Target";
import Income from "@/pages/Income";
import Expense from "@/pages/Expense";
import Reports from "@/pages/Reports";
import Investment from "@/pages/Investment";
import Forex from "@/pages/Forex";
import Subscriptions from "@/pages/Subscriptions";
import Categories from "@/pages/Categories";
import Auth from "@/pages/Auth";
import ChatAI from "@/pages/ChatAI";
import Profile from "@/pages/Profile";
import Performance from "@/pages/Performance";
import Paywall from "@/pages/Paywall";
import Debts from "@/pages/Debts"; 
import SmartScan from "@/pages/SmartScan"; 
import AdminPremium from "@/pages/AdminPremium";
import Help from "@/pages/Help";
import Guide from "@/pages/Guide";
import Amal from "@/pages/Amal"; 
import Retained from "@/pages/Retained";
import ExpertTerminal from "@/pages/ExpertTerminal"; 
import Onboarding from "@/pages/Onboarding"; 
import Checkout from "@/pages/Checkout"; // 🔥 Import Checkout ditambahkan di sini

function Router() {
  const [location, setLocation] = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPaywallAlert, setShowPaywallAlert] = useState(false);
  const [isSessionRefreshing, setIsSessionRefreshing] = useState(false); 

  const isStandalone = typeof window !== 'undefined' && 
    (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from_notif') === 'true') {
        window.history.replaceState(null, '', '/');
        setLocation('/');
        setTimeout(() => { window.location.reload(); }, 100);
    }
  }, [setLocation]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
         queryClient.invalidateQueries();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const { data: user } = useUser();
  const currentUserEmail = localStorage.getItem("bilano_email") || "";

  useEffect(() => {
      const vipEmails = [
          "adrienfandra14@gmail.com", 
          "bilanotech@gmail.com" 
      ];
      
      if (!currentUserEmail) return;

      if (vipEmails.includes(currentUserEmail) || user?.isPro) {
          localStorage.setItem(`bilano_trial_expired_${currentUserEmail}`, "false");
          localStorage.setItem("bilano_trial_expired", "false");
          localStorage.setItem("bilano_pro", "true"); 
      } 
      else if (user && !user.isPro) {
          localStorage.setItem("bilano_pro", "false"); 

          const TRIAL_DURATION_DAYS = 14;

          const setupCompletedAt = localStorage.getItem(`bilano_setup_completed_${currentUserEmail}`);
          const trialStartTime = setupCompletedAt 
              ? new Date(setupCompletedAt).getTime()
              : new Date(user.createdAt || "2024-01-01").getTime();
          
          const daysPassed = (Date.now() - trialStartTime) / (1000 * 60 * 60 * 24);
          const daysRemaining = Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - daysPassed));

          localStorage.setItem("bilano_trial_days_remaining", String(daysRemaining));
          localStorage.setItem("bilano_trial_days_passed", String(Math.floor(daysPassed)));

          const isNewAccount = (Date.now() - new Date(user.createdAt || "2024-01-01").getTime()) < 15000; 
          const hasRedirected = sessionStorage.getItem("bilano_first_paywall_redirect");
          
          if (isStandalone && isNewAccount && !hasRedirected && location !== '/paywall') {
              sessionStorage.setItem("bilano_first_paywall_redirect", "true");
              setLocation("/paywall");
          }

          if (daysPassed >= TRIAL_DURATION_DAYS) {
              localStorage.setItem("bilano_trial_expired", "true");
              localStorage.setItem(`bilano_trial_expired_${currentUserEmail}`, "true");
          } else {
              localStorage.setItem("bilano_trial_expired", "false");
              localStorage.setItem(`bilano_trial_expired_${currentUserEmail}`, "false");
          }
      }
  }, [user, currentUserEmail, location, setLocation, isStandalone]);

  useNotifications();

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_auth");
    
    if (!isAuth && location !== "/auth") {
      if (isStandalone) {
        setLocation("/auth");
      } else if (location !== "/") {
        setLocation("/auth");
      }
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const handleCustomLock = () => {
      if (isStandalone) {
        setShowPaywallAlert(true);
      }
    };
    window.addEventListener('trigger-paywall-lock', handleCustomLock);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('trigger-paywall-lock', handleCustomLock);
    };
  }, [location, setLocation, isStandalone]);

  if (isSessionRefreshing) {
    return (
      <div className="fixed inset-0 z-[999999] bg-slate-900 flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
         <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
         <h2 className="text-2xl font-extrabold mb-2 tracking-tight">Menyegarkan Sesi...</h2>
         <p className="text-sm text-slate-400 font-medium">Sinkronisasi data terbaru Anda.</p>
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-slate-50 py-4 text-center w-full flex justify-center items-center">
            <img alt="BILANO" src="/bilano_logo_horiz.png" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center -mt-16 animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-rose-100 p-5 rounded-full mb-6 shadow-sm">
              <WifiOff className="w-10 h-10 text-rose-600" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 mb-2">Koneksi Terputus</h2>
          <p className="text-slate-500 text-sm mb-8 max-w-[260px] leading-relaxed font-medium">
              Aplikasi tidak dapat memuat data. Periksa jaringan internet Anda dan coba lagi.
          </p>
          <button 
              onClick={() => window.location.reload()} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full text-sm font-extrabold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center"
          >
              COBA LAGI
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Switch>
        <Route path="/">
          {isStandalone ? <Home /> : <Landing />}
        </Route>
        
        <Route path="/terminal">
           <DesktopRequiredGate>
              <ExpertTerminal />
           </DesktopRequiredGate>
        </Route>
        
        <Route path="/dashboard" component={Home} />
        <Route path="/target" component={Target} />
        <Route path="/income" component={Income} />
        <Route path="/expense" component={Expense} />
        <Route path="/reports" component={Reports} />
        <Route path="/investment" component={Investment} />
        <Route path="/debts" component={Debts} />
        <Route path="/forex" component={Forex} />
        <Route path="/subscriptions" component={Subscriptions} />
        <Route path="/categories" component={Categories} />
        <Route path="/auth" component={Auth} />
        <Route path="/chat-ai" component={ChatAI} />
        <Route path="/profile" component={Profile} />
        <Route path="/performance" component={Performance} />
        <Route path="/scan" component={SmartScan} />
        <Route path="/paywall" component={Paywall} />
        <Route path="/security" component={Security} />
        <Route path="/admin-premium" component={AdminPremium} />
        <Route path="/help" component={Help} />
        <Route path="/guide" component={Guide} />
        <Route path="/amal" component={Amal} /> 
        <Route path="/retained" component={Retained} />
        
        {/* 🚀 PERBAIKAN: Rute onboarding HARUS berada di atas NotFound */}
        <Route path="/onboarding" component={Onboarding} />
        
        {/* 🔥 Route Checkout ditambahkan di sini */}
        <Route path="/checkout" component={Checkout} />

        {/* 🚀 PERBAIKAN: NotFound HARUS diletakkan paling ujung sebagai Catch-All */}
        <Route component={NotFound} />
      </Switch>

      {isStandalone && showPaywallAlert && (
        <PaywallLockAlert onClose={() => setShowPaywallAlert(false)} onUpgrade={() => { setShowPaywallAlert(false); setLocation('/paywall'); }} onDismiss={() => { setShowPaywallAlert(false); setLocation('/'); }} />
      )}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;