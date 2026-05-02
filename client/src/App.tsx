import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WifiOff, RefreshCw, Lock } from "lucide-react"; 
import { useNotifications } from "./hooks/useNotifications"; 
import { useUser } from "./hooks/use-finance"; 

// Import Halaman
import NotFound from "@/pages/not-found";
import Security from "./pages/Security";
import Home from "@/pages/Home";
import Landing from "@/pages/Landing"; // 🚀 Import Landing Page Baru
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
  const isAllowedRoute = url.includes('/api/auth') || url.includes('/api/user/onesignal') || url.includes('/api/payment');
  const isTrialExpired = localStorage.getItem('bilano_trial_expired') === 'true';
  const isPro = localStorage.getItem('bilano_pro') === 'true';

  if (isWriteAction && !isAllowedRoute && isTrialExpired && !isPro) {
      window.dispatchEvent(new Event('trigger-paywall-lock'));
      return Promise.reject(new Error("TRIAL_EXPIRED_LOCKED")); 
  }
  return originalFetch(input, init);
};

// Interseptor XMLHttpRequest tetap sama
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
        if (email) { this.setRequestHeader('x-user-email', email); }
    }
    return originalXhrSend.apply(this, args as any);
};

// =========================================================================

function Router() {
  const [location, setLocation] = useLocation();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPaywallAlert, setShowPaywallAlert] = useState(false);
  
  // 🚀 DETEKSI MODE: Apakah dibuka sebagai Aplikasi terinstall atau Website?
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;

  const { data: user } = useUser();
  const currentUserEmail = localStorage.getItem("bilano_email") || "";

  // Logika Notifikasi & Trial (Tetap dipertahankan dari versi asli)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('from_notif') === 'true') {
        window.history.replaceState(null, '', '/');
        setLocation('/');
        setTimeout(() => { window.location.reload(); }, 100);
    }
  }, [setLocation]);

  useEffect(() => {
    const vipEmails = ["adrienfandra14@gmail.com", "bilanotech@gmail.com"];
    if (!currentUserEmail) return;
    if (vipEmails.includes(currentUserEmail) || user?.isPro) {
        localStorage.setItem("bilano_trial_expired", "false");
    } else if (user && !user.isPro) {
        const startTime = new Date(user.createdAt || "2024-01-01").getTime();
        const daysPassed = (Date.now() - startTime) / (1000 * 60 * 60 * 24);
        if (daysPassed >= 3) {
            localStorage.setItem("bilano_trial_expired", "true");
        } else {
            localStorage.setItem("bilano_trial_expired", "false");
        }
    }
  }, [user, currentUserEmail]);

  useNotifications();

  useEffect(() => {
    const isAuth = localStorage.getItem("bilano_auth");
    
    // 🛡️ SATPAM ROUTE:
    // Izinkan "/" tanpa login HANYA jika dibuka di browser (bukan standalone)
    if (!isAuth && location !== "/auth" && (isStandalone || location !== "/")) {
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
  }, [location, setLocation, isStandalone]);

  if (isOffline) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <WifiOff className="w-12 h-12 text-rose-600 mb-4" />
        <h2 className="text-xl font-extrabold text-slate-800 mb-2">Koneksi Terputus</h2>
        <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-8 py-3 rounded-full font-bold shadow-lg mt-4">COBA LAGI</button>
      </div>
    );
  }

  return (
    <>
      <Switch>
        {/* 🚀 LOGIKA DUA WAJAH BILANO */}
        <Route path="/">
          {isStandalone ? <Home /> : <Landing />}
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
        <Route component={NotFound} />
      </Switch>

      {showPaywallAlert && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-2xl text-center border-t-8 border-rose-500 animate-in zoom-in-95">
                <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4"/>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">Akses Terkunci</h3>
                <p className="text-sm text-slate-600 mb-6">Masa percobaan habis. Fitur ini eksklusif untuk pengguna Premium BILANO.</p>
                <div className="flex flex-col gap-3">
                    <button onClick={() => { setShowPaywallAlert(false); setLocation('/paywall'); }} className="w-full py-3.5 rounded-full bg-indigo-600 text-white font-extrabold shadow-lg">BERLANGGANAN</button>
                    <button onClick={() => { setShowPaywallAlert(false); setLocation('/'); }} className="w-full py-3.5 rounded-full bg-slate-100 text-slate-600 font-bold">KEMBALI</button>
                </div>
            </div>
        </div>
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