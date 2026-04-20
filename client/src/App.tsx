import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WifiOff, RefreshCw, Lock, Download, Smartphone } from "lucide-react"; 
import { useNotifications } from "./hooks/useNotifications"; 
import { useUser } from "./hooks/use-finance"; 
import { Button } from "@/components/UIComponents"; 

// =========================================================================
// 🚀 KUNCI MEMORI AGAR ANGKA TIDAK BERKEDIP
// =========================================================================
queryClient.setDefaultOptions({
  queries: {
    refetchOnWindowFocus: false, 
    refetchOnMount: false,
    refetchOnReconnect: false, 
    staleTime: 1000 * 60 * 60, 
  },
});

// =========================================================================
// 🛡️ SATPAM API: BLOKIR SEMUA TRANSAKSI JIKA TRIAL HABIS
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

  if (isWriteAction && !isAllowedRoute && localStorage.getItem('bilano_trial_expired') === 'true') {
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

import NotFound from "@/pages/not-found";
import Security from "./pages/Security";
import Home from "@/pages/Home";
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

// =========================================================================
// 🚧 SATPAM PWA: INSTALL GATE (Wajib Install, Dilarang Pakai Browser)
// =========================================================================
function InstallGate({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(() => {
      if (typeof window !== 'undefined') {
          return window.matchMedia('(display-mode: standalone)').matches || 
                 (window.navigator as any).standalone === true;
      }
      return true;
  }); 
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const checkIsStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    };
    
    setIsInstalled(checkIsStandalone());

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
        alert("Tekan tombol Share/Menu di browser Anda, lalu pilih 'Add to Home Screen' / 'Tambahkan ke Layar Utama'.");
        return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // ⚠️ BYPASS UNTUK DEVELOPMENT DI LAPTOP (Hapus / Comment kode if ini kalau mau tes ketat di laptop)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return <>{children}</>;
  }

  if (isInstalled) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-[999999] fixed inset-0">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[32px] flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(99,102,241,0.4)] animate-bounce-slow">
            <Smartphone className="w-12 h-12 text-white" />
        </div>
        
        <h1 className="text-3xl font-black text-white mb-3">Install BILANO</h1>
        <p className="text-slate-400 text-sm mb-10 max-w-xs leading-relaxed">
            Demi keamanan dan performa maksimal, BILANO hanya dapat digunakan sebagai Aplikasi. Silakan install ke HP Anda sekarang.
        </p>

        <Button 
            onClick={handleInstallClick}
            className="w-full max-w-sm h-14 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black rounded-full shadow-lg"
        >
            <Download className="w-5 h-5 mr-2" />
            INSTALL APLIKASI SEKARANG
        </Button>
    </div>
  );
}

// =========================================================================
// ROUTER UTAMA
// =========================================================================
function Router() {
  const [location, setLocation] = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPaywallAlert, setShowPaywallAlert] = useState(false);
  const [isSessionRefreshing, setIsSessionRefreshing] = useState(false); 

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
          localStorage.removeItem("bilano_pro"); 
          
          const startTime = new Date(user.createdAt || "2024-01-01").getTime();
          const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
          const TRIAL_DURATION_DAYS = 3;

          if (daysPassed >= TRIAL_DURATION_DAYS) {
              localStorage.setItem("bilano_trial_expired", "true");
              localStorage.setItem(`bilano_trial_expired_${currentUserEmail}`, "true");
          } else {
              localStorage.setItem("bilano_trial_expired", "false");
              localStorage.setItem(`bilano_trial_expired_${currentUserEmail}`, "false");
          }
      }
  }, [user, currentUserEmail, location]); 

  useNotifications();

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_auth");
    if (!isAuth && location !== "/auth") {
      setLocation("/auth");
    }

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    const handleCustomLock = () => setShowPaywallAlert(true);
    window.addEventListener('trigger-paywall-lock', handleCustomLock);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('trigger-paywall-lock', handleCustomLock);
    };
  }, [location, setLocation]);

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
        <Route path="/" component={Home} />
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
        <Route component={NotFound} />
      </Switch>

      {showPaywallAlert && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-2xl text-center border-t-8 border-rose-500 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8"/>
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">Akses Terkunci</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">
                    Masa percobaan gratis Anda telah habis. Fitur ini eksklusif untuk pengguna Premium BILANO.
                </p>
                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => { setShowPaywallAlert(false); setLocation('/paywall'); }} 
                        className="w-full py-3.5 rounded-full bg-indigo-600 text-white font-extrabold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
                    >
                        BERLANGGANAN SEKARANG
                    </button>
                    <button 
                        onClick={() => setShowPaywallAlert(false)} 
                        className="w-full py-3.5 rounded-full bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                    >
                        TUTUP
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
}

// =========================================================================
// APP UTAMA (BUNGKUS ROUTER DENGAN INSTALL GATE)
// =========================================================================
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <InstallGate>
        <Router />
        <Toaster />
      </InstallGate>
    </QueryClientProvider>
  );
}

export default App;