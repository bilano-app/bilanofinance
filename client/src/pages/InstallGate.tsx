import { useState, useEffect } from 'react';
import { Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/UIComponents';

// Ini komponen Satpam penjaga pintu
export default function InstallGate({ children }: { children: React.ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(true); 
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. DETEKSI: Apakah ini dibuka dari Icon Homescreen?
    const checkIsStandalone = () => {
      return window.matchMedia('(display-mode: standalone)').matches || 
             (window.navigator as any).standalone === true;
    };
    
    // Kalau dibukanya pakai browser biasa, statusnya false (Terkunci)
    setIsInstalled(checkIsStandalone());

    // 2. Tangkap tombol Install dari sistem HP
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
      // Begitu selesai install, ilusi selesai, aplikasi reload dari Homescreen
    }
  };

  // JIKA SUDAH DI-INSTALL (Buka dari icon HP): Tampilkan Aplikasi Asli
  if (isInstalled) {
    return <>{children}</>;
  }

  // JIKA BUKA VIA BROWSER: Tampilkan Tembok Paksaan Install
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center z-[9999] fixed inset-0">
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