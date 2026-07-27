import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-finance";
import { 
    CheckCircle2, Crown, ArrowRight, Loader2, 
    X, ShieldCheck, CreditCard, Lock, RefreshCw, 
    AlertCircle, Copy, Clock, Zap
} from "lucide-react";

const paymentOptions = [
  { id: "SQ", name: "QRIS (GoPay/OVO/Dana)", icon: "/QRIS.png" }, 
  { id: "M2", name: "Mandiri Virtual Account", icon: "/Mandiri.png" },
  { id: "I1", name: "BNI Virtual Account", icon: "/BNI.png" },
  { id: "BR", name: "BRI Virtual Account", icon: "/BRI.png" },
  { id: "B1", name: "CIMB Niaga Virtual Account", icon: "/CIMB.png" },
  { id: "BT", name: "Permata Virtual Account", icon: "/Permata.png" },
  { id: "BSI", name: "BSI Virtual Account", icon: "/BSI.png" },
];

export default function Paywall() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user } = useUser();
  
  const [phase, setPhase] = useState<'select_plan' | 'select_method' | 'waiting_payment' | 'success'>('select_plan');
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedMethod, setSelectedMethod] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [checkoutData, setCheckoutData] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [showPaymentAlert, setShowPaymentAlert] = useState(false);
  const [dynamicAmount, setDynamicAmount] = useState("");

  const timerRef = useRef<any>(null);
  const pollingRef = useRef<any>(null);

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  // 🚀 FITUR GRANDFATHERED PRICE-LOCK GUARANTEE
  const GLOBAL_PRICES = { monthly: 19900, yearly: 120000 };
  const userYearlyPrice = user?.lockedYearlyPrice || GLOBAL_PRICES.yearly;
  const isYearlyLocked = Boolean(user?.lockedYearlyPrice);

  const userMonthlyPrice = user?.lockedMonthlyPrice || GLOBAL_PRICES.monthly;
  const isMonthlyLocked = Boolean(user?.lockedMonthlyPrice);

  useEffect(() => {
      if (phase === 'waiting_payment' && checkoutData?.expired_time) {
          const updateTimer = () => {
              const now = Math.floor(Date.now() / 1000);
              const remaining = checkoutData.expired_time - now;
              if (remaining <= 0) {
                  setTimeLeft(0);
                  toast({ title: "Waktu Habis", description: "Sesi transfer kedaluwarsa.", variant: "destructive" });
                  setPhase('select_plan');
              } else {
                  setTimeLeft(remaining);
              }
          };
          updateTimer();
          timerRef.current = setInterval(updateTimer, 1000);
          return () => clearInterval(timerRef.current);
      }
  }, [phase, checkoutData]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreatePayment = async () => {
      if (!selectedMethod) {
          toast({ title: "Metode Wajib Dipilih", description: "Silakan pilih bank transfer atau QRIS.", variant: "destructive" });
          return;
      }

      setIsProcessing(true);
      try {
          const planCode = selectedPlan === 'yearly' ? 'B12' : 'B1';
          const response = await fetch("/api/payment/create-transaction", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": userEmail },
              body: JSON.stringify({ method: selectedMethod, plan: planCode })
          });

          const resJson = await response.json();
          if (response.ok && resJson.success) {
              setCheckoutData(resJson.data);
              setPhase('waiting_payment');
          } else {
              toast({ title: "Gagal memproses", description: resJson.error || "Gagal membangun invoice jalur perbankan.", variant: "destructive" });
          }
      } catch (error) {
          toast({ title: "Koneksi Terputus", variant: "destructive" });
      } finally {
          setIsProcessing(false);
      }
  };

  const checkPaymentStatus = async (isManual = false) => {
      if (!checkoutData?.reference) return;
      if (isManual) setIsCheckingPayment(true);

      try {
          const response = await fetch(`/api/payment/check-status?ref=${checkoutData.reference}`, {
              headers: { "x-user-email": userEmail }
          });
          const statusRes = await response.json();

          if (statusRes.success && statusRes.data.status === 'PAID') {
              localStorage.setItem("bilano_pro", "true");
              if (pollingRef.current) clearInterval(pollingRef.current);
              if (timerRef.current) clearInterval(timerRef.current);
              setPhase('success');
          } else if (isManual) {
              setShowPaymentAlert(true);
          }
      } catch (error) {
          console.error(error);
      } finally {
          if (isManual) setIsCheckingPayment(false);
      }
  };

  useEffect(() => {
      if (phase === 'waiting_payment') {
          pollingRef.current = setInterval(() => checkPaymentStatus(false), 5000);
          return () => clearInterval(pollingRef.current);
      }
  }, [phase, checkoutData]);

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast({ title: "Berhasil Disalin! 📋" });
  };

  if (phase === 'select_plan') {
      return (
          <MobileLayout title="Perpanjang Lisensi" showBack={false}>
              <div className="pt-4 pb-24 px-4 min-h-screen bg-slate-50 flex flex-col relative animate-in fade-in">
                  <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-700 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden mb-6">
                      <div className="relative z-10 text-center">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-inner">
                              <Lock className="w-8 h-8 text-white" />
                          </div>
                          <h2 className="text-2xl font-black tracking-tight mb-2">Masa Aktif Paket Habis</h2>
                          <p className="text-xs text-indigo-100 font-medium leading-relaxed px-4">
                              Pembukuan otomatis terkunci sementara. Perpanjang akses lisensi BILANO PRO Anda untuk mengaktifkan kembali modul chart performa, riwayat investasi, valas, dan ekspor laporan PDF.
                          </p>
                      </div>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-sm mb-4 px-1 uppercase tracking-widest flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-500" /> Pilih Siklus Perpanjangan
                  </h3>

                  <div className="space-y-4 mb-8">
                      {/* Kartu Tahunan */}
                      <div 
                          onClick={() => setSelectedPlan('yearly')}
                          className={`relative p-5 rounded-[24px] border-2 cursor-pointer transition-all bg-white ${selectedPlan === 'yearly' ? 'border-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.15)] ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-200 shadow-sm'}`}
                      >
                          <div className="absolute -top-3 right-4 flex gap-1">
                              {isYearlyLocked ? (
                                  <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">👑 HARGA TERKUNCI AWAL</span>
                              ) : (
                                  <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md"><Zap className="w-3 h-3 inline mr-1"/>PALING HEMAT</span>
                              )}
                          </div>
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="font-black text-lg text-slate-800">Paket 1 Tahun (Lisensi Penuh)</h4>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                  {selectedPlan === 'yearly' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                              </div>
                          </div>
                          <p className="text-3xl font-black text-slate-800 tracking-tight">Rp {userYearlyPrice.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">/ tahun</span></p>
                          <p className="text-[11px] text-emerald-600 font-bold mt-2 bg-emerald-50 inline-block px-2.5 py-1 rounded-md">Setara Rp {Math.round(userYearlyPrice / 12).toLocaleString('id-ID')} / bulan</p>
                      </div>

                      {/* Kartu Bulanan */}
                      <div 
                          onClick={() => setSelectedPlan('monthly')}
                          className={`relative p-5 rounded-[24px] border-2 cursor-pointer transition-all bg-white ${selectedPlan === 'monthly' ? 'border-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.15)] ring-4 ring-indigo-50' : 'border-slate-200 hover:border-indigo-200 shadow-sm'}`}
                      >
                          {isMonthlyLocked && (
                              <div className="absolute -top-3 right-4">
                                  <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-md">👑 HARGA TERKUNCI AWAL</span>
                              </div>
                          )}
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="font-black text-lg text-slate-800">Paket 1 Bulan (Siklus Pendek)</h4>
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                  {selectedPlan === 'monthly' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                              </div>
                          </div>
                          <p className="text-3xl font-black text-slate-800 tracking-tight">Rp {userMonthlyPrice.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-400">/ bulan</span></p>
                      </div>
                  </div>

                  <div className="mt-auto">
                      <Button onClick={() => setPhase('select_method')} className="w-full h-14 bg-slate-900 text-white font-black rounded-full text-sm flex items-center justify-center gap-2 tracking-wide shadow-xl active:scale-95 transition-transform">
                          LANJUT JALUR PEMBAYARAN <ArrowRight className="w-5 h-5"/>
                      </Button>
                  </div>
              </div>
          </MobileLayout>
      );
  }

  if (phase === 'select_method') {
      return (
          <MobileLayout title="Jalur Pembayaran" showBack={false}>
              <div className="pt-4 pb-24 px-4 min-h-screen bg-slate-50 flex flex-col relative animate-in slide-in-from-right-6">
                  <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-[20px] shadow-sm border border-slate-100">
                      <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><CreditCard className="w-5 h-5"/></div>
                      <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Biaya Perpanjangan</p>
                          <p className="font-black text-xl text-slate-800">Rp {selectedPlan === 'yearly' ? userYearlyPrice.toLocaleString('id-ID') : userMonthlyPrice.toLocaleString('id-ID')}</p>
                      </div>
                  </div>

                  <h3 className="font-extrabold text-slate-800 text-sm mb-4 px-1 uppercase tracking-widest">Pilih Metode Transfer</h3>
                  <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm mb-8">
                      {paymentOptions.map((opt, idx) => (
                          <div 
                              key={opt.id} onClick={() => setSelectedMethod(opt.id)}
                              className={`flex justify-between items-center p-4 cursor-pointer transition-colors ${idx !== paymentOptions.length - 1 ? 'border-b border-slate-100' : ''} ${selectedMethod === opt.id ? 'bg-indigo-50/40' : 'hover:bg-slate-50'}`}
                          >
                              <div className="flex items-center gap-4">
                                  <div className="w-12 h-8 bg-white border border-slate-200 rounded flex items-center justify-center p-1 overflow-hidden">
                                      <img src={opt.icon} alt={opt.name} className="max-w-full max-h-full object-contain" />
                                  </div>
                                  <span className="font-bold text-sm text-slate-700">{opt.name}</span>
                              </div>
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod === opt.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                  {selectedMethod === opt.id && <div className="w-2 h-2 bg-white rounded-full"></div>}
                              </div>
                          </div>
                      ))}
                  </div>

                  <div className="mt-auto space-y-3">
                      <Button onClick={handleCreatePayment} disabled={isProcessing || !selectedMethod} className="w-full h-14 bg-indigo-600 text-white font-black rounded-full flex items-center justify-center shadow-xl active:scale-95 transition-transform">
                          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : "KONFIRMASI BUAT TAGIHAN"}
                      </Button>
                      <Button variant="ghost" onClick={() => setPhase('select_plan')} className="w-full h-12 font-bold text-slate-500 rounded-full">Kembali</Button>
                  </div>
              </div>
          </MobileLayout>
      );
  }

  if (phase === 'waiting_payment' && checkoutData) {
      const isQRIS = checkoutData.payment_method?.includes('QRIS') || checkoutData.payment_method === 'SQ';
      return (
          <MobileLayout title="Kirim Pembayaran" showBack={false}>
              <div className="pt-4 pb-24 px-4 min-h-screen bg-slate-50 relative animate-in slide-in-from-right-6">
                  {showPaymentAlert && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                          <div className="bg-white border border-slate-100 rounded-[32px] w-full max-w-sm p-6 relative text-center shadow-2xl">
                              <button onClick={() => setShowPaymentAlert(false)} className="absolute top-5 right-5 text-slate-400"><X className="w-6 h-6" /></button>
                              <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4"><AlertCircle className="w-8 h-8" /></div>
                              <h3 className="text-xl font-black mb-2 text-slate-800">Dana Belum Terdeteksi</h3>
                              <p className="text-xs text-slate-500 mb-6 leading-relaxed">Mutasi dana transaksi masuk belum disinkronisasikan ke server. Mohon tunggu 1-2 menit setelah transfer selesai dilakukan.</p>
                              <Button onClick={() => setShowPaymentAlert(false)} className="w-full bg-slate-900 text-white font-bold rounded-full h-12">Saya Mengerti, Saya Akan Menunggu</Button>
                          </div>
                      </div>
                  )}

                  <div className="bg-white rounded-[32px] p-6 shadow-xl border border-slate-100 text-center mb-6">
                      <div className="flex items-center justify-center gap-2 text-rose-500 mb-4 bg-rose-50 w-max mx-auto px-4 py-1.5 rounded-full border border-rose-100 font-bold text-sm tracking-wider">
                          <Clock className="w-4 h-4"/><span>{formatTime(timeLeft)}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Nominal Transfer Harus Sesuai</p>
                      <h2 className="text-4xl font-black text-slate-800 flex items-center justify-center gap-2 mb-6">
                          Rp {checkoutData.amount.toLocaleString('id-ID')}
                          <button onClick={() => copyToClipboard(checkoutData.amount.toString())} className="text-slate-300 hover:text-slate-500"><Copy className="w-5 h-5"/></button>
                      </h2>

                      <div className="border-t border-dashed border-slate-200 pt-6">
                          {isQRIS ? (
                              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                  <img src={checkoutData.qr_url} alt="QRIS" className="w-44 h-44 mx-auto bg-white p-2 rounded-xl shadow-sm border border-slate-200" />
                                  <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">Scan QRIS menggunakan aplikasi Bank atau dompet digital favorit Anda.</p>
                              </div>
                          ) : (
                              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-left">
                                  <p className="text-xs font-bold text-slate-400 uppercase mb-1">Nomor Rekening Virtual Account</p>
                                  <div className="flex justify-between items-center">
                                      <p className="text-2xl font-black text-indigo-600 tracking-wider">{checkoutData.pay_code}</p>
                                      <button onClick={() => copyToClipboard(checkoutData.pay_code)} className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Copy className="w-4 h-4"/></button>
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="mt-auto">
                      <Button onClick={() => checkPaymentStatus(true)} disabled={isCheckingPayment} className="w-full h-14 bg-indigo-600 text-white font-black rounded-full flex items-center justify-center gap-2 shadow-xl shadow-indigo-100">
                          {isCheckingPayment ? <Loader2 className="w-5 h-5 animate-spin"/> : <RefreshCw className="w-5 h-5"/>} CHECK REFRESH STATUS TRANSAKSI
                      </Button>
                  </div>
              </div>
          </MobileLayout>
      );
  }

  if (phase === 'success') {
      return (
          <MobileLayout title="Sukses" showBack={false}>
              <div className="px-6 min-h-screen bg-emerald-50 flex flex-col items-center justify-center text-center animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200"><CheckCircle2 className="w-12 h-12" /></div>
                  <h2 className="text-2xl font-black text-emerald-900 mb-2">Aktivasi Pro Berhasil!</h2>
                  <p className="text-xs text-emerald-700 font-medium leading-relaxed mb-8 px-4">Selamat! Paket lisensi akun BILANO PRO Anda berhasil diaktifkan kembali. Seluruh data neraca pembukuan cerdas Anda telah terbuka utuh.</p>
                  <Button onClick={() => window.location.href = '/'} className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full text-sm">MASUK KE DASBOR UTAMA</Button>
              </div>
          </MobileLayout>
      );
  }

  return null;
}