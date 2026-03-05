import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button } from "@/components/UIComponents";
import { CheckCircle2, Sparkles, ShieldCheck, X, QrCode, Loader2, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
    const { toast } = useToast();
    const userEmail = localStorage.getItem("bilano_email") || "";
    
    // State untuk Custom Modal UI kita
    const [showModal, setShowModal] = useState(false);
    const [isGeneratingQr, setIsGeneratingQr] = useState(false);
    const [qrUrl, setQrUrl] = useState("");

    const handleBukaModal = () => {
        setShowModal(true);
        setQrUrl(""); // Reset QR Code jika user buka tutup modal
    };

    const handleGenerateQR = async () => {
        setIsGeneratingQr(true);
        try {
            const res = await fetch("/api/payment/midtrans/charge", {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-user-email": userEmail }
            });

            const data = await res.json();

            if (res.ok && data.qrUrl) {
                setQrUrl(data.qrUrl); // Tampilkan Barcode QRIS ke layar
                toast({ title: "QRIS Siap!", description: "Silakan scan menggunakan aplikasi E-Wallet atau M-Banking Anda." });
            } else {
                toast({ title: "Gagal memuat QRIS", description: data.error || "Coba lagi nanti.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Koneksi Terputus", description: "Gagal menyambung ke server.", variant: "destructive" });
        } finally {
            setIsGeneratingQr(false);
        }
    };

    return (
        <MobileLayout title="BILANO Premium" showBack={false}>
            <div className="space-y-6 pt-4 pb-24 px-4 min-h-screen bg-slate-50 flex flex-col justify-center">
                
                {/* Header Paywall Utama */}
                <div className="text-center animate-in fade-in slide-in-from-bottom-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/30">
                        <Crown className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 mb-2 tracking-tight">BILANO <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">PRO</span></h1>
                    <p className="text-sm text-slate-500 font-medium px-4">Buka kunci semua fitur eksklusif dan capai kebebasan finansial Anda lebih cepat.</p>
                </div>

                {/* List Fitur Premium */}
                <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 animate-in fade-in slide-in-from-bottom-6 duration-500">
                    <div className="space-y-4">
                        {[
                            "Akses Chatbot AI Tanpa Batas",
                            "Sistem Pencatatan Valas Real-time",
                            "Cetak Laporan PDF 12 Bulan",
                            "Analisis Portofolio Investasi",
                            "Tanpa Iklan & Prioritas Server"
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                </div>
                                <span className="text-sm font-bold text-slate-700">{feature}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tombol Utama (Pemicu Modal) */}
                <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
                    <Button 
                        onClick={handleBukaModal} 
                        className="w-full h-14 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold shadow-xl shadow-orange-500/30 border-none rounded-full text-[15px] flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <Sparkles className="w-5 h-5"/>
                        BERLANGGANAN SEKARANG
                    </Button>
                    <p className="text-[11px] text-center text-slate-400 mt-4 font-medium flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3"/> Pembayaran Aman & Terverifikasi
                    </p>
                </div>
            </div>

            {/* ========================================================= */}
            {/* POP-UP CUSTOM UI KITA SENDIRI (PENGGANTI SNAP MIDTRANS) */}
            {/* ========================================================= */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        
                        {/* Header Promo di dalam Modal */}
                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white text-center relative">
                            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/10 rounded-full p-1 transition-colors">
                                <X className="w-5 h-5"/>
                            </button>
                            <Sparkles className="w-10 h-10 mx-auto mb-2 text-yellow-300 drop-shadow-md" />
                            <h3 className="text-xl font-black mb-1">Promo Terbatas!</h3>
                            <p className="text-xs opacity-90 font-medium">Investasi sekali, nikmati fitur PRO selamanya (1 Tahun).</p>
                        </div>

                        {/* Harga Coret Marketing */}
                        <div className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
                            <div className="text-slate-400 font-bold text-sm mb-1 line-through decoration-red-500 decoration-2">Rp 299.000</div>
                            <div className="text-5xl font-black text-slate-800 flex items-center justify-center gap-1">
                                <span className="text-2xl mt-1">Rp</span>99.000
                            </div>
                            <div className="mt-3 inline-block px-4 py-1 bg-emerald-100 text-emerald-700 text-xs font-black rounded-full border border-emerald-200">
                                HEMAT 66% HARI INI
                            </div>
                        </div>

                        {/* Area Pembayaran Dinamis */}
                        <div className="p-6">
                            {!qrUrl ? (
                                /* Tahap 1: Pilih Metode Bayar */
                                <div className="space-y-4">
                                    <p className="text-[11px] font-black text-slate-400 mb-2 text-center tracking-widest uppercase">Pilih Metode Pembayaran</p>
                                    
                                    <button 
                                        onClick={handleGenerateQR} 
                                        disabled={isGeneratingQr} 
                                        className="w-full h-16 bg-white border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 text-slate-700 rounded-2xl flex items-center justify-between px-4 transition-all active:scale-95 group"
                                    >
                                        <div className="flex items-center gap-3 text-left">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                                <QrCode className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm">QRIS Auto-Scan</div>
                                                <div className="text-[10px] text-slate-500">GoPay, OVO, Dana, M-Banking</div>
                                            </div>
                                        </div>
                                        {isGeneratingQr && <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />}
                                    </button>
                                </div>
                            ) : (
                                /* Tahap 2: Muncul Barcode QRIS */
                                <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                                    <div className="bg-white p-3 rounded-2xl border-2 border-indigo-100 inline-block mx-auto mb-4 shadow-sm">
                                        <img src={qrUrl} alt="QRIS Code" className="w-48 h-48 object-contain" />
                                    </div>
                                    <p className="text-xs text-slate-600 mb-6 font-medium leading-relaxed px-4">
                                        Screenshot atau scan kode QR di atas menggunakan aplikasi E-Wallet pilihan Anda.
                                    </p>
                                    <Button 
                                        onClick={() => {
                                            toast({ title: "Mengecek Pembayaran", description: "Sistem sedang memverifikasi..."});
                                            setTimeout(() => { window.location.href="/"; }, 1500);
                                        }} 
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold h-14 rounded-full shadow-lg shadow-emerald-500/30"
                                    >
                                        SAYA SUDAH BAYAR
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </MobileLayout>
    );
}