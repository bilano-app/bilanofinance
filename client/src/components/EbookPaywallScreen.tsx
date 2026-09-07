import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Crown, ArrowRight, Loader2, BookOpen, Clock, ShieldCheck, Lock } from "lucide-react";

const PAYMENT_OPTIONS = [
  { id: "SQ", name: "QRIS (GoPay/OVO/Dana)", icon: "/QRIS.png" }, 
  { id: "M2", name: "Mandiri Virtual Account", icon: "/Mandiri.png" },
  { id: "I1", name: "BNI Virtual Account", icon: "/BNI.png" },
  { id: "BR", name: "BRI Virtual Account", icon: "/BRI.png" },
  { id: "B1", name: "CIMB Niaga Virtual Account", icon: "/CIMB.png" },
  { id: "BT", name: "Permata Virtual Account", icon: "/Permata.png" },
  { id: "BSI", name: "BSI Virtual Account", icon: "/BSI.png" },
  { id: "A1", name: "ATM Bersama", icon: "/ATM.png" },
  { id: "FT", name: "Alfamart / Pegadaian / Pos", icon: "/Alfa.png" }
];

const PaymentIcon = ({ src, name }: { src: string, name: string }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError || !src) {
    const initial = name.substring(0, 2).toUpperCase();
    return <div className="w-full h-full bg-slate-100 flex items-center justify-center rounded text-[10px] font-bold text-slate-400">{initial}</div>;
  }
  return <img src={src} alt={name} className="w-full h-full object-contain" onError={() => setHasError(true)} />;
};

export default function EbookPaywallScreen({ user, email }: { user: any, email: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("SQ");
  
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);

  const selectedMethodDetails = PAYMENT_OPTIONS.find(p => p.id === paymentMethod) || PAYMENT_OPTIONS[0];

  const handleCheckout = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/payment/duitku-production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          price: 29000,
          plan: 'ebook',
          productDetail: `Akses E-Book VIP BILANO (Bundle)`,
          customerName: `${user?.firstName || 'User'} ${user?.lastName || ''}`.trim(),
          email: email,
          paymentMethod: paymentMethod,
          tier: 'ebook'
        })
      });
      const data = await response.json();
      if (data.success && data.paymentData) setPaymentDetails({ ...data.paymentData, merchantOrderId: data.merchantOrderId });
      else throw new Error(data.error || "Gagal membuat tagihan.");
    } catch (err: any) {
      toast({ title: "Gagal Proses", description: err.message, variant: "destructive" });
    } finally { setIsProcessing(false); }
  };

  const handleRefreshStatus = async () => {
    setIsCheckingPayment(true);
    try {
      const res = await fetch('/api/payment/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, merchantOrderId: paymentDetails?.merchantOrderId })
      });
      const data = await res.json();
      if (data.success && data.isPaid) {
        await fetch('/api/payment/claim-ebook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-email': email },
          body: JSON.stringify({ email })
        });
        toast({ title: "E-Book Terbuka! 🎉", description: "Selamat membaca koleksi E-Book VIP BILANO." });
        window.location.reload();
      } else { 
        setShowPaymentAlert(true); 
      }
    } catch (e) { 
      toast({ title: "Error", description: "Cek koneksi bank Anda.", variant: "destructive" });
    } finally { 
      setIsCheckingPayment(false); 
    }
  };

  if (paymentDetails) {
    return (
      <div className="flex flex-col -mx-5 -mt-5 bg-white min-h-[80vh] animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-brand-navy p-6 rounded-b-[32px] text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <h2 className="text-xl font-black mb-1 flex items-center gap-2">
              Selesaikan Pembayaran <Clock className="w-5 h-5 text-brand-gold" />
            </h2>
            <p className="text-sm text-blue-200">Akses E-Book VIP BILANO</p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5 -mt-4 relative z-20">
          {showPaymentAlert && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 text-sm font-bold flex items-start gap-2">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <p>Pembayaran belum terdeteksi. Jika Anda sudah transfer, mohon tunggu 1-2 menit dan tekan tombol Refresh.</p>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-slate-500">Total Tagihan</span>
              <span className="text-xl font-black text-brand-navy">Rp 29.000</span>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-5">
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center p-1 border border-slate-200">
                <PaymentIcon src={selectedMethodDetails.icon} name={selectedMethodDetails.name} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Metode Pembayaran</p>
                <p className="text-sm font-black text-slate-800">{selectedMethodDetails.name}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-bold text-slate-500 mb-2">Kode Pembayaran / VA / Link QRIS</p>
              <div className="bg-amber-50 p-4 rounded-xl border-2 border-brand-gold border-dashed flex justify-between items-center">
                <span className="font-mono text-lg font-black text-brand-navy truncate mr-2">
                  {paymentDetails.paymentUrl ? "Klik Tombol Bayar" : paymentDetails.vaNumber}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {paymentDetails.paymentUrl ? (
                <a 
                  href={paymentDetails.paymentUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full bg-brand-gold hover:bg-brand-goldDark text-brand-navy text-center py-3.5 rounded-xl font-black text-sm transition-all shadow-[0_4px_14px_0_rgba(246,185,59,0.39)]"
                >
                  Buka Halaman Pembayaran
                </a>
              ) : (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(paymentDetails.vaNumber);
                    toast({ title: "Tersalin!", description: "Kode VA disalin ke clipboard." });
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-black text-sm transition-all"
                >
                  Salin Kode VA
                </button>
              )}

              <button 
                onClick={handleRefreshStatus}
                disabled={isCheckingPayment}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2"
              >
                {isCheckingPayment ? <Loader2 className="w-5 h-5 animate-spin" /> : "Refresh Status"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="w-20 h-20 bg-brand-gold/20 text-brand-gold rounded-full flex items-center justify-center mb-4 relative">
        <Lock className="w-10 h-10" />
        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-md">
          <BookOpen className="w-4 h-4 text-brand-navy" />
        </div>
      </div>

      <h2 className="text-2xl font-black text-brand-navy mb-2 text-center">E-Book VIP Terkunci</h2>
      <p className="text-sm text-slate-500 text-center mb-6 max-w-xs">
        Promo 24 jam gratis telah berakhir. Dapatkan akses tak terbatas ke seluruh koleksi E-Book Finansial & Investasi eksklusif BILANO.
      </p>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 overflow-hidden mb-6">
        <div className="bg-brand-navy p-4 text-center">
          <span className="inline-block bg-brand-gold text-brand-navy text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2">Akses Seumur Hidup</span>
          <h3 className="text-white text-3xl font-black">Rp 29.000</h3>
        </div>
        
        <div className="p-5">
          <ul className="space-y-3 mb-6">
            <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
              <CheckCircle2 className="w-5 h-5 text-brand-gold shrink-0" />
              <span>Akses penuh ke 5+ E-Book Finansial Premium</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
              <CheckCircle2 className="w-5 h-5 text-brand-gold shrink-0" />
              <span>Format PDF Interaktif Resolusi Tinggi</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-slate-600 font-medium">
              <CheckCircle2 className="w-5 h-5 text-brand-gold shrink-0" />
              <span>Akses selamanya (Tanpa biaya bulanan)</span>
            </li>
          </ul>

          <div className="mb-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pilih Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_OPTIONS.slice(0, 3).map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2 rounded-xl border-2 transition-all flex items-center justify-center h-12 bg-white ${paymentMethod === m.id ? 'border-brand-gold shadow-[0_0_0_3px_rgba(246,185,59,0.2)]' : 'border-slate-100 hover:border-slate-300 grayscale opacity-70 hover:grayscale-0 hover:opacity-100'}`}
                >
                  <PaymentIcon src={m.icon} name={m.name} />
                </button>
              ))}
            </div>
            
            <div className="mt-2 text-center">
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-xs text-brand-navy font-bold bg-transparent border-none focus:ring-0 cursor-pointer w-full text-center"
              >
                {PAYMENT_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={isProcessing}
            className="w-full bg-brand-gold hover:bg-brand-goldDark text-brand-navy font-black py-3.5 rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(246,185,59,0.39)]"
          >
            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buka Kunci E-Book - Rp 29k"}
            {!isProcessing && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5" /> Pembayaran Aman & Terenkripsi
      </div>
    </div>
  );
}
