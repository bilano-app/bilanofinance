import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, CreditCard, ShieldCheck, CheckCircle, Download, ChevronRight } from "lucide-react";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Pilih Paket, Step 2: Form Data, Step 3: Sukses & Install
  const [billingPlan, setBillingPlan] = useState<"demo" | "monthly" | "yearly">("demo");
  const [loading, setLoading] = useState(false);
  
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

  // Daftar Pilihan Paket Finansial (Syarat Mata Uang Rupiah Duitku)
  const plans = {
    demo: {
      name: "Paket Kustom / Uji Coba",
      price: 8250,
      displayPrice: "Rp 8.250",
      desc: "Paket simulasi sandbox akses instan fitur premium BILANO."
    },
    monthly: {
      name: "Paket Bulanan Premium",
      price: 19000,
      displayPrice: "Rp 19.000",
      desc: "Akses seluruh fitur pelacakan kuangan, diperbarui otomatis setiap bulan."
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

    // Jeda simulasi pemrosesan ke gateway
    setTimeout(() => {
      setLoading(false);
      setStep(3); // Masuk ke tahap sukses & install
    }, 1500); 
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a1128] text-white font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[500px] bg-[#121c3a]/90 backdrop-blur-md border border-white/10 rounded-[32px] p-6 lg:p-8 shadow-2xl relative z-10">
        
        {/* =========================================================
            🟢 TAHAP 1: PILIHAN HARGA / PAKET
            ========================================================= */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <button 
              onClick={() => setLocation('/')}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Kembali ke Utama
            </button>

            <h2 className="text-2xl font-black tracking-tight mb-2">Pilih Paket Anda</h2>
            <p className="text-slate-400 text-xs mb-6">Silakan pilih nominal plan terdaftar untuk melanjutkan proses registrasi.</p>

            <div className="flex flex-col gap-3 mb-6">
              {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => (
                <div
                  key={key}
                  onClick={() => setBillingPlan(key)}
                  className={`border p-4 rounded-2xl cursor-pointer transition-all flex justify-between items-center bg-[#040814]/40 ${billingPlan === key ? "border-amber-400 bg-[#172447]" : "border-white/5 hover:border-white/20"}`}
                >
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-sm text-white mb-0.5">{plans[key].name}</h4>
                    <p className="text-[11px] text-slate-400 leading-snug">{plans[key].desc}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-base font-black text-white block">{plans[key].displayPrice}</span>
                    <span className="text-[9px] text-slate-500 block font-bold uppercase">IDR</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="w-full bg-amber-500 hover:bg-amber-400 text-[#0a1128] font-black text-sm py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Lanjutkan Ke Pembayaran <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* =========================================================
            🟡 TAHAP 2: PENGISIAN DATA DIRI & TOMBOL BAYAR
            ========================================================= */}
        {step === 2 && (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm font-semibold mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Ganti Paket
            </button>

            <h2 className="text-2xl font-black tracking-tight mb-1">Informasi Pembeli</h2>
            <p className="text-slate-400 text-xs mb-4">
              Mengonfirmasi pembelian: <span className="text-amber-400 font-bold">{currentPlan.name} ({currentPlan.displayPrice})</span>
            </p>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-[#0a1128] font-black text-sm py-4 rounded-xl shadow-lg shadow-amber-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {loading ? "MEMPROSES..." : `BAYAR SEKARANG (${currentPlan.displayPrice})`}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 mt-5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Koneksi Enkripsi Sandbox Aktif & Terlindungi
            </div>
          </div>
        )}

        {/* =========================================================
            🔵 TAHAP 3: PEMBAYARAN BERHASIL & TOMBOL INSTALL APP
            ========================================================= */}
        {step === 3 && (
          <div className="text-center p-2 animate-in zoom-in-95 duration-400">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
              <CheckCircle className="w-9 h-9 text-emerald-500" />
            </div>
            
            <h2 className="text-2xl font-black tracking-tight mb-2">Pembayaran Berhasil!</h2>
            <p className="text-slate-400 text-xs max-w-sm mx-auto mb-6 leading-relaxed">
              Registrasi sukses terverifikasi oleh sistem sandbox. Silakan pasang aplikasi langsung ke layar utama perangkat Anda sekarang.
            </p>

            <button
              onClick={handleInstallApp}
              className="w-full bg-gradient-to-b from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-[#0a1128] font-black text-base py-4 px-6 rounded-xl shadow-[0_10px_30px_rgba(251,191,36,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 border-b-[4px] border-amber-600 active:border-b-0 active:translate-y-[4px]"
            >
              <Download strokeWidth={3} className="w-5 h-5" />
              INSTALL BILANO SEKARANG
            </button>

            <button 
              onClick={() => setLocation('/dashboard')}
              className="mt-6 block text-slate-500 text-[10px] font-bold uppercase tracking-wider hover:text-white transition-colors mx-auto"
            >
              Lanjutkan via Web Browser
            </button>
          </div>
        )}

      </div>
    </div>
  );
}