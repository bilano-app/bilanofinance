import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, ShieldCheck, CheckCircle, Download } from "lucide-react";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [billingPlan, setBillingPlan] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false); // Mode Layar Sukses
  
  // State Form User
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: ""
  });

  // Logika PWA Installer Native
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); 
      setDeferredPrompt(e); 
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('BILANO sedang diinstall...');
      }
      setDeferredPrompt(null);
    } else {
      alert("PEMBERITAHUAN:\n\nSistem perangkat Anda mungkin memblokir popup otomatis atau aplikasi sudah terpasang. Silakan buka menu browser (titik tiga atau ikon Share) lalu pilih 'Install App' atau 'Tambahkan ke Layar Utama' (Add to Home Screen) untuk memasang BILANO.");
    }
  };

  const plans = {
    monthly: {
      name: "Paket Bulanan Premium",
      price: 19000,
      displayPrice: "Rp 19.000",
      desc: "Akses seluruh fitur esensial BILANO, diperbarui otomatis setiap bulan."
    },
    yearly: {
      name: "Paket Tahunan Premium",
      price: 99000,
      displayPrice: "Rp 99.000",
      desc: "Hemat besar dengan akses fitur premium penuh selama satu tahun penuh."
    }
  };

  const currentPlan = plans[billingPlan];

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) {
      alert("Harap lengkapi semua bidang kontak support pembeli.");
      return;
    }

    setLoading(true);

    // Simulasi jeda pemrosesan ke Duitku
    setTimeout(() => {
      setLoading(false);
      // Ubah layar menjadi mode sukses pembayaran
      setPaymentSuccess(true);
    }, 1500); 
  };

  // =========================================================
  // 🟢 LAYAR 2: SUKSES & INSTALL APLIKASI
  // =========================================================
  if (paymentSuccess) {
    return (
      <div className="min-h-[100dvh] bg-[#0a1128] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden text-center animate-in fade-in duration-500">
        <div className="absolute top-[10%] w-96 h-96 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="w-10 h-10 text-emerald-500" />
        </div>
        
        <h2 className="text-3xl font-black tracking-tight mb-3">Pembayaran Berhasil!</h2>
        <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
          Akun Premium BILANO Anda sudah aktif. Tahap terakhir, silakan install aplikasi ke perangkat Anda untuk melacak keuangan secara brutal.
        </p>

        <button
          onClick={handleInstallApp}
          className="w-full max-w-[320px] bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-lg py-4 px-6 rounded-2xl shadow-[0_10px_30px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[4px] border-amber-600 active:border-b-0 active:translate-y-[4px]"
        >
          <Download strokeWidth={3} className="w-6 h-6" />
          INSTALL BILANO SEKARANG
        </button>

        <button 
          onClick={() => setLocation('/dashboard')}
          className="mt-6 text-slate-500 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors"
        >
          Masuk via Web Browser Saja
        </button>
      </div>
    );
  }

  // =========================================================
  // 🟡 LAYAR 1: FORM CHECKOUT DUITKU
  // =========================================================
  return (
    <div className="min-h-[100dvh] bg-[#0a1128] text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[500px] bg-[#121c3a]/90 backdrop-blur-md border border-white/10 rounded-[32px] p-6 lg:p-8 shadow-2xl relative z-10 animate-in slide-in-from-bottom-4">
        
        <button 
          onClick={() => setLocation(-1)} // Kembali ke halaman sebelumnya (Paywall/Onboarding)
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        <h2 className="text-2xl font-black tracking-tight mb-2">Checkout Premium</h2>
        <p className="text-slate-400 text-xs mb-6">Selesaikan registrasi akun Anda. Pembayaran diamankan oleh Duitku.</p>

        {/* 🔄 SWITCH PILIHAN PLAN (Bisa disembunyikan nanti jika data dikirim dari Onboarding) */}
        <div className="grid grid-cols-2 bg-[#040814] p-1.5 rounded-2xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => setBillingPlan("monthly")}
            className={`py-3 rounded-xl font-bold text-sm transition-all ${billingPlan === "monthly" ? "bg-amber-500 text-[#0a1128] shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            Per Bulan
          </button>
          <button
            type="button"
            onClick={() => setBillingPlan("yearly")}
            className={`py-3 rounded-xl font-bold text-sm transition-all ${billingPlan === "yearly" ? "bg-amber-500 text-[#0a1128] shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            Per Tahun
          </button>
        </div>

        {/* 📦 KOTAK DETAIL PRODUK & HARGA */}
        <div className="bg-[#040814]/60 border border-white/5 rounded-2xl p-4 mb-6">
          <div className="flex justify-between items-start mb-2">
            <span className="text-amber-400 text-xs font-black uppercase tracking-wider bg-amber-400/10 px-2.5 py-1 rounded-md">
              {billingPlan === "monthly" ? "Esensial" : "Terpopuler"}
            </span>
            <div className="text-right">
              <span className="text-xl font-black text-white">{currentPlan.displayPrice}</span>
              <span className="text-[11px] text-slate-500 block">IDR (Rupiah)</span>
            </div>
          </div>
          <h4 className="font-bold text-sm text-white mb-1">{currentPlan.name}</h4>
          <p className="text-xs text-slate-400 leading-relaxed">{currentPlan.desc}</p>
        </div>

        {/* 📝 FORM INFORMASI PELANGGAN */}
        <form onSubmit={handlePay} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nama Lengkap</label>
            <input
              type="text"
              required
              placeholder="Masukkan nama Anda"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Alamat Email</label>
            <input
              type="email"
              required
              placeholder="nama@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nomor Telepon</label>
            <input
              type="tel"
              required
              placeholder="08123456789"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-[#040814] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
            />
          </div>

          {/* 🔘 TOMBOL SUBMIT PEMBAYARAN */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-[#0a1128] font-black text-sm py-4 rounded-xl shadow-lg shadow-amber-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            {loading ? "MEMPROSES..." : `BAYAR ${currentPlan.displayPrice}`}
          </button>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 mt-5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Koneksi Enkripsi Sandbox Aktif & Terlindungi
        </div>

      </div>
    </div>
  );
}