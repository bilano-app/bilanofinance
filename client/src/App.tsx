import { Switch, Route, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { WifiOff, RefreshCw, Lock } from "lucide-react";
import { useNotifications } from "./hooks/useNotifications"; // Pastikan file ini sudah Anda buat

import NotFound from "@/pages/not-found";
import Security from "./pages/Security";

// Import Halaman Utama
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

// Simpan fungsi fetch asli browser agar tidak tertimpa berulang kali
const originalFetch = window.fetch;

function Router() {
  const [location, setLocation] = useLocation();
  
  // State untuk Fitur Offline & Gembok
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPaywallAlert, setShowPaywallAlert] = useState(false);

  // 0. Nyalakan Mesin Notifikasi Pengingat Catat Keuangan
  useNotifications();

  useEffect(() => {
    // 1. SISTEM KEAMANAN (Tendang ke Auth jika belum login)
    const isAuth = localStorage.getItem("bilano_auth");
    if (!isAuth && location !== "/auth") {
      setLocation("/auth");
    }

    // 2. DETEKTOR SINYAL (Internet Putus/Nyala)
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 3. PENCEGAT LALU LINTAS DATA (Gabungan Email & Gembok Trial)
    window.fetch = async (input, init = {}) => {
      const url = typeof input === 'string' ? input : (input as Request).url;
      const method = init.method ? init.method.toUpperCase() : 'GET';
      const email = localStorage.getItem("bilano_email");

      // A. Selipkan header email pengguna secara otomatis ke server
      if (email && url.startsWith('/api')) {
        init.headers = { ...init.headers, 'x-user-email': email };
      }

      // B. Cek Gembok Trial (Apakah masa coba gratis habis?)
      // Kita cegat hanya untuk aksi MENGUBAH/MENAMBAH data (POST/PATCH/DELETE) di luar halaman Auth
      const isWriteAction = ['POST', 'PATCH', 'PUT', 'DELETE'].includes(method);
      const isAuthRoute = url.includes('/api/auth');

      if (isWriteAction && !isAuthRoute && localStorage.getItem('bilano_trial_expired') === 'true') {
          setShowPaywallAlert(true); // Munculkan Modal Merah!
          return Promise.reject(new Error("TRIAL_EXPIRED_LOCKED")); // Gagalkan proses pengiriman data
      }

      return originalFetch(input, init);
    };

    // 4. PEMICU MANUAL GEMBOK TRIAL (Untuk PDF/Aksi tanpa server)
    const handleCustomLock = () => setShowPaywallAlert(true);
    window.addEventListener('trigger-paywall-lock', handleCustomLock);

    // Pembersihan sistem jika pengguna berpindah/keluar
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('trigger-paywall-lock', handleCustomLock);
      window.fetch = originalFetch; // Kembalikan fetch ke normal
    };
  }, [location, setLocation]);

  // === RENDER LAYAR OFFLINE (Bila internet putus di tengah jalan) ===
  if (isOffline) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header Palsu yang menyamar jadi aplikasi */}
        <div className="bg-slate-50 py-4 text-center w-full flex justify-center items-center">
            <img alt="BILANO" src="/bilano_logo_horiz.png" className="h-8 w-auto object-contain" />
        </div>
        
        {/* Konten Peringatan */}
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
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3.5 rounded-full text-sm font-extrabold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center gap-2"
          >
              <RefreshCw className="w-4 h-4" /> COBA LAGI
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
        <Route component={NotFound} />
      </Switch>

      {/* === POP-UP GEMBOK TRIAL === */}
      {showPaywallAlert && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[24px] p-6 max-w-sm w-full shadow-2xl text-center border-t-8 border-rose-500 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8"/>
                </div>
                <h3 className="text-xl font-extrabold text-slate-800 mb-2">Akses Terkunci</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed font-medium">
                    Anda tidak bisa melanjutkan karena masa percobaan gratis telah habis. Silakan{' '}
                    <button 
                        onClick={() => { setShowPaywallAlert(false); setLocation('/paywall'); }} 
                        className="text-indigo-600 font-extrabold underline underline-offset-2 hover:text-indigo-800 cursor-pointer"
                    >
                        berlangganan
                    </button> 
                    {' '}untuk membuka semua fitur kembali.
                </p>
                <button onClick={() => setShowPaywallAlert(false)} className="w-full py-3.5 rounded-full bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors">
                    Tutup
                </button>
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