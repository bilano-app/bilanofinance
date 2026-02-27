import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
    Crown, CheckCircle2, X, Sparkles, 
    Globe, FileText, ScanLine, Bot, ShieldCheck, Loader2
} from "lucide-react";
import { Button } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { MobileLayout } from "@/components/Layout";

export default function Paywall() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    
    // === LOGIKA PINTAR TOMBOL ===
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [isExpired, setIsExpired] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
    const [isProcessing, setIsProcessing] = useState(false);

    const userEmail = localStorage.getItem("bilano_email") || "guest";

    useEffect(() => {
        const seenKey = `bilano_paywall_seen_${userEmail}`;
        const hasSeen = localStorage.getItem(seenKey);
        const expired = localStorage.getItem("bilano_trial_expired") === "true";

        if (!hasSeen) {
            setIsFirstTime(true);
        }
        if (expired) {
            setIsExpired(true);
        }
        
        setIsLoading(false);
    }, [userEmail]);

    const handleStartTrial = () => {
        localStorage.setItem(`bilano_paywall_seen_${userEmail}`, "true");
        toast({ 
            title: "Masa Coba Dimulai! 🎉", 
            description: "Selamat menikmati seluruh fitur BILANO Pro selama 3 hari ke depan." 
        });
        setLocation("/"); 
    };

    const handleClose = () => {
        localStorage.setItem(`bilano_paywall_seen_${userEmail}`, "true");
        setLocation("/");
    };

    const handleSubscribe = () => {
        setIsProcessing(true);
        toast({ title: "Mengarahkan ke Pembayaran...", description: "Menyiapkan gerbang aman." });
        
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
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4"/>
                <p className="text-sm font-bold text-slate-500">Membuka Akses Premium...</p>
            </div>
        );
    }

    return (
        // Menggunakan desain putih/bersih agar selaras dengan keseluruhan aplikasi
        <div className="min-h-screen bg-slate-50 text-slate-800 relative pb-28 animate-in fade-in duration-500">
            
            {/* EFEK CAHAYA LATAR */}
            <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-indigo-100/50 to-transparent pointer-events-none"></div>

            {/* TOMBOL CLOSE (MUNCUL JIKA BUKAN FIRST TIME) */}
            {!isFirstTime && (
                <button 
                    onClick={handleClose} 
                    className="absolute top-6 right-4 z-50 p-2.5 bg-white shadow-sm rounded-full hover:bg-slate-100 transition-colors"
                >
                    <X className="w-5 h-5 text-slate-400"/>
                </button>
            )}

            <div className="relative z-10 pt-16 px-5 max-w-md mx-auto">
                
                {/* HEADER */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-white shadow-md">
                        <Crown className="w-10 h-10 text-indigo-600"/>
                    </div>
                    <h1 className="text-3xl font-extrabold text-slate-800 mb-2 tracking-tight">BILANO <span className="text-indigo-600">PRO</span></h1>
                    <p className="text-sm text-slate-500 font-medium px-4">
                        {isFirstTime ? "Buka potensi penuh pengelolaan keuanganmu. Coba gratis sekarang." : isExpired ? "Masa coba gratis telah habis. Lanjutkan dengan Pro." : "Satu langkah untuk menguasai harta Anda sepenuhnya."}
                    </p>
                </div>

                {/* FITUR PREMIUM LIST */}
                <div className="space-y-4 mb-8 bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm">
                    <FeatureItem icon={Globe} title="Real-Time Valas" desc="Harga aset otomatis berfluktuasi ikuti pasar global."/>
                    <FeatureItem icon={ScanLine} title="Smart Scan Receipt" desc="Foto struk belanja, biarkan AI membaca nominalnya."/>
                    <FeatureItem icon={Bot} title="BILANO Intelligence" desc="Konsultan AI pribadi baca isi dompet Anda 24/7."/>
                    <FeatureItem icon={FileText} title="Export PDF Premium" desc="Cetak laporan kekayaan tanpa watermark."/>
                    <FeatureItem icon={ShieldCheck} title="Kunci Privasi Ganda" desc="Amankan aplikasi dengan PIN rahasia."/>
                </div>

                {/* PILIHAN PAKET (HANYA JIKA BUKAN FIRST TIME ATAU EXPIRED) */}
                {(!isFirstTime || isExpired) && (
                    <div className="space-y-3 mb-6">
                        <div 
                            onClick={() => setSelectedPlan('yearly')}
                            className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPlan === 'yearly' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-extrabold text-slate-800">Tahunan</h4>
                                    <span className="bg-emerald-100 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Hemat 40%</span>
                                </div>
                                <p className="text-sm text-slate-500">Rp 199.000 / tahun</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'yearly' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                {selectedPlan === 'yearly' && <CheckCircle2 className="w-4 h-4 text-white"/>}
                            </div>
                        </div>

                        <div 
                            onClick={() => setSelectedPlan('monthly')}
                            className={`p-4 rounded-[24px] border-2 cursor-pointer transition-all flex items-center justify-between ${selectedPlan === 'monthly' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
                        >
                            <div>
                                <h4 className="font-extrabold text-slate-800 mb-1">Bulanan</h4>
                                <p className="text-sm text-slate-500">Rp 29.000 / bulan</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === 'monthly' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}`}>
                                {selectedPlan === 'monthly' && <CheckCircle2 className="w-4 h-4 text-white"/>}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* STICKY BOTTOM ACTION BAR */}
            <div className="fixed bottom-0 left-0 right-0 p-5 bg-white border-t border-slate-100 z-50 animate-in slide-in-from-bottom-10 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                <div className="max-w-md mx-auto">
                    {/* LOGIKA TOMBOL UTAMA */}
                    {isFirstTime && !isExpired ? (
                        <Button 
                            onClick={handleStartTrial} 
                            className="w-full h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-lg font-extrabold shadow-lg shadow-indigo-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Sparkles className="w-5 h-5"/> MULAI COBA GRATIS 3 HARI
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubscribe} 
                            disabled={isProcessing}
                            className={`w-full h-14 rounded-full text-lg font-extrabold transition-transform active:scale-95 flex items-center justify-center gap-2 ${isExpired ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-200' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'}`}
                        >
                            {isProcessing ? <Loader2 className="w-5 h-5 animate-spin"/> : <Crown className="w-5 h-5"/>}
                            {isProcessing ? "MEMPROSES..." : isExpired ? "BUKA KUNCI AKSES" : "LANGGANAN SEKARANG"}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon: Icon, title, desc }: any) {
    return (
        <div className="flex gap-4 items-start">
            <div className="bg-slate-50 p-2.5 rounded-full flex-shrink-0 mt-0.5">
                <Icon className="w-5 h-5 text-indigo-500"/>
            </div>
            <div>
                <h4 className="font-extrabold text-slate-800 text-sm mb-0.5">{title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}