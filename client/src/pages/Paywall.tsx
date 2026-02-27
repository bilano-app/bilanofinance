import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
    Crown, CheckCircle2, X, Sparkles, 
    Globe, FileText, ScanLine, Bot, ShieldCheck, Loader2
} from "lucide-react";
import { Button } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";

export default function Paywall() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);

    const userEmail = localStorage.getItem("bilano_email") || "guest";

    useEffect(() => {
        // Cek status pengguna saat ini
        const seenKey = `bilano_paywall_seen_${userEmail}`;
        const hasSeen = localStorage.getItem(seenKey);
        const expired = localStorage.getItem("bilano_trial_expired") === "true";

        if (!hasSeen) {
            setIsFirstTime(true);
        }
        if (expired) {
            setIsExpired(true);
        }
        
        // Timeout kecil agar transisi lebih mulus (UX)
        setTimeout(() => setIsLoading(false), 400);
    }, [userEmail]);

    const handleStartTrial = () => {
        localStorage.setItem(`bilano_paywall_seen_${userEmail}`, "true");
        toast({ 
            title: "Masa Coba Dimulai! 🎉", 
            description: "Selamat menikmati seluruh fitur BILANO Pro selama 3 hari ke depan." 
        });
        setLocation("/"); // Lempar ke Home
    };

    const handleClose = () => {
        localStorage.setItem(`bilano_paywall_seen_${userEmail}`, "true");
        setLocation("/");
    };

    const handleSubscribe = () => {
        setIsProcessing(true);
        toast({ title: "Mengarahkan ke Pembayaran...", description: "Menyiapkan gerbang aman." });
        
        // --- SIMULASI PEMBAYARAN SUKSES (Bisa Anda ganti dengan link Midtrans/WhatsApp nanti) ---
        setTimeout(() => {
            localStorage.setItem("bilano_pro", "true");
            localStorage.setItem("bilano_trial_expired", "false");
            setIsProcessing(false);
            toast({ title: "Pembayaran Berhasil! 👑", description: "Akun Anda sekarang adalah BILANO PRO." });
            window.location.href = "/";
        }, 2000);
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4"/>
                <p className="text-sm font-bold animate-pulse text-amber-100">Membuka Akses Premium...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-slate-50 relative pb-28 animate-in fade-in duration-500">
            
            {/* EFEK CAHAYA LATAR */}
            <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-amber-500/20 to-transparent pointer-events-none"></div>
            <div className="fixed top-[-100px] right-[-100px] w-64 h-64 bg-amber-500/30 rounded-full blur-[100px] pointer-events-none"></div>

            {/* TOMBOL CLOSE (HANYA MUNCUL JIKA BUKAN FIRST TIME) */}
            {!isFirstTime && (
                <button 
                    onClick={handleClose} 
                    className="absolute top-6 right-4 z-50 p-2.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors"
                >
                    <X className="w-5 h-5 text-slate-300"/>
                </button>
            )}

            <div className="relative z-10 pt-12 px-5 max-w-md mx-auto">
                
                {/* HEADER */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-yellow-600 rounded-[24px] flex items-center justify-center mx-auto mb-5 shadow-[0_0_40px_rgba(245,158,11,0.4)] transform rotate-3">
                        <Crown className="w-10 h-10 text-yellow-950 transform -rotate-3"/>
                    </div>
                    <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">BILANO <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-500">PRO</span></h1>
                    <p className="text-sm text-slate-400 font-medium">
                        {isFirstTime ? "Buka potensi penuh pengelolaan keuanganmu. Coba gratis sekarang." : isExpired ? "Masa coba gratis telah habis. Lanjutkan dengan Pro." : "Satu langkah untuk menguasai harta Anda sepenuhnya."}
                    </p>
                </div>

                {/* FITUR PREMIUM LIST */}
                <div className="space-y-4 mb-8 bg-white/5 border border-white/10 p-6 rounded-[32px] backdrop-blur-sm">
                    <FeatureItem icon={Globe} title="Real-Time Valas" desc="Harga aset mata uang asing otomatis berfluktuasi mengikuti pasar global."/>
                    <FeatureItem icon={ScanLine} title="Smart Scan Receipt" desc="Foto struk belanja, biarkan AI membaca dan mencatat nominalnya."/>
                    <FeatureItem icon={Bot} title="BILANO Intelligence" desc="Konsultan AI pribadi yang membaca isi dompet Anda secara presisi 24/7."/>
                    <FeatureItem icon={FileText} title="Export PDF Premium" desc="Cetak laporan kekayaan super profesional tanpa watermark."/>
                    <FeatureItem icon={ShieldCheck} title="Kunci Privasi Ganda" desc="Amankan aplikasi dengan PIN dan sembunyikan saldo di tempat umum."/>
                </div>

                {/* PILIHAN PAKET (HANYA JIKA BUKAN FIRST TIME ATAU EXPIRED) */}
                {(!isFirstTime || isExpired) && (
                    <div className="space-y-3 mb-6">
                        <div 
                            onClick={() => setSelectedPlan('yearly')}
                            className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-extrabold text-white">Tahunan</h4>
                                    <span className="bg-amber-400 text-amber-950 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Hemat 40%</span>
                                </div>
                                <p className="text-sm text-slate-400">Rp 199.000 / tahun</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-amber-400 bg-amber-400' : 'border-slate-500'}`}>
                                {selectedPlan === 'yearly' && <CheckCircle2 className="w-4 h-4 text-amber-950"/>}
                            </div>
                        </div>

                        <div 
                            onClick={() => setSelectedPlan('monthly')}
                            className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPlan === 'monthly' ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                        >
                            <div>
                                <h4 className="font-extrabold text-white mb-1">Bulanan</h4>
                                <p className="text-sm text-slate-400">Rp 29.000 / bulan</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-amber-400 bg-amber-400' : 'border-slate-500'}`}>
                                {selectedPlan === 'monthly' && <CheckCircle2 className="w-4 h-4 text-amber-950"/>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 z-50 animate-in slide-in-from-bottom-10">
                <div className="max-w-md mx-auto">
                    {isFirstTime && !isExpired ? (
                        <Button 
                            onClick={handleStartTrial} 
                            className="w-full h-16 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-yellow-950 text-lg font-extrabold shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-6 h-6"/> MULAI COBA GRATIS 3 HARI
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubscribe} 
                            disabled={isProcessing}
                            className={`w-full h-16 rounded-full text-lg font-extrabold transition-transform active:scale-95 flex items-center justify-center gap-2 ${isExpired ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-[0_0_30px_rgba(225,29,72,0.3)] hover:from-rose-600 hover:to-red-700' : 'bg-gradient-to-r from-amber-400 to-yellow-500 text-yellow-950 shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:from-amber-500 hover:to-yellow-600'}`}
                        >
                            {isProcessing ? <Loader2 className="w-6 h-6 animate-spin"/> : <Crown className="w-6 h-6"/>}
                            {isProcessing ? "MEMPROSES..." : isExpired ? "BUKA KUNCI AKSES" : "LANGGANAN SEKARANG"}
                        </Button>
                    )}
                    
                    {/* Teks Jaminan Batal Kapan Saja */}
                    <p className="text-center text-[10px] text-slate-500 mt-4 font-medium uppercase tracking-widest">
                        Batalkan kapan saja. Bebas komitmen.
                    </p>
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
    return (
        <div className="flex gap-4 items-start">
            <div className="bg-amber-400/20 p-2.5 rounded-full flex-shrink-0 mt-0.5">
                <Icon className="w-5 h-5 text-amber-400"/>
            </div>
            <div>
                <h4 className="font-extrabold text-white text-sm mb-0.5">{title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}