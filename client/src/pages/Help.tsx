import { useState } from "react";
import { Link } from "wouter";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { 
    LifeBuoy, Send, Loader2, CheckCircle2, AlertCircle, 
    ArrowLeft, MessageSquare, HelpCircle, Mail,
    ChevronDown, Check, ShieldCheck, HeartHandshake
} from "lucide-react"; 
import { trackEvent } from "@/lib/tracking";

const QUICK_TOPICS = [
    { label: "Kendala Saldo", subject: "Kendala Transaksi / Saldo" },
    { label: "Pembayaran PRO", subject: "Kendala Pembayaran PRO" },
    { label: "Pertanyaan Fitur", subject: "Pertanyaan Fitur" },
    { label: "Saran & Masukan", subject: "Saran & Masukan" },
];

export default function Help() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subject || !message.trim()) {
          toast({ 
              title: "Form Belum Lengkap", 
              description: "Silakan pilih subjek dan tuliskan detail pesan kendala Anda.", 
              variant: "destructive" 
          });
          return;
      }

      setIsSubmitting(true);
      try {
          const res = await fetch("/api/help/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": userEmail },
              body: JSON.stringify({ subject, message: message.trim() })
          });

          if (!res.ok) throw new Error("Gagal mengirim laporan tiket bantuan");
          
          trackEvent("help_ticket_submitted", { 
              issueSubject: subject 
          });
          
          setIsSuccess(true);
          toast({
              title: "Laporan Terkirim! 🎉",
              description: "Tim BILANO akan segera menindaklanjuti pesan Anda."
          });
      } catch (error: any) {
          toast({ title: "Terjadi Kendala", description: error.message || "Gagal mengirim pesan.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <MobileLayout>
      <div className="flex flex-col -mx-5 -mt-5">
        
        {/* ========================================================================= */}
        {/* 1. TOP HEADER BANNER DENGAN TEMA DOMINAN KUNING / EMAS (#F6B93B) */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-8 bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7] to-[#FDE68A] flex flex-col relative z-10 border-b border-amber-300/60">
            
            {/* Top Navigation Bar */}
            <div className="-mx-5 -mt-5 px-5 pt-6 pb-4 bg-white/95 backdrop-blur-md rounded-b-[28px] shadow-[0_4px_16px_rgba(245,158,11,0.06)] flex items-center justify-between relative z-30 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <button 
                            type="button"
                            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs active:scale-95"
                            title="Kembali ke Beranda"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-800" strokeWidth={2.5} />
                        </button>
                    </Link>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <p className="text-[10px] font-bold text-amber-900 uppercase tracking-widest">
                                Layanan & Bantuan
                            </p>
                        </div>
                        <h1 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                            Pusat Bantuan
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white border border-amber-200 text-brand-navy px-3 py-1.5 rounded-full shadow-xs text-[11px] font-bold">
                        <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
                        <span>SUPPORT 24/7</span>
                    </div>
                </div>
            </div>

            {/* 2. HERO CARD KUNING/EMAS (SATU-SATUNYA DENGAN SOLID SHADOW KHAS BILANO) */}
            <div className="bg-gradient-to-br from-[#F6B93B] via-[#E5A825] to-[#D97706] text-brand-navy p-6 rounded-[28px] border-l-[6px] border-l-brand-navy shadow-[6px_6px_0px_0px] shadow-slate-900 relative overflow-hidden mt-4">
                <HelpCircle className="absolute -right-4 -bottom-4 w-36 h-36 text-brand-navy/10 -rotate-12 pointer-events-none" strokeWidth={1} />
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/20 rounded-full blur-xl pointer-events-none" />

                <div className="relative z-10 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                        <span className="bg-brand-navy text-brand-gold text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                            <MessageSquare className="w-3 h-3 text-brand-gold" />
                            KONSULTASI & KELUHAN
                        </span>

                        <span className="text-[10px] text-amber-950 font-bold bg-white/30 px-2.5 py-0.5 rounded-full border border-amber-900/10">
                            Respon Cepat
                        </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-brand-navy mb-1 leading-tight">
                        Ada Kendala Akun?
                    </h2>
                    <p className="text-xs text-amber-950/80 font-medium leading-relaxed mb-3">
                        Tim dukungan BILANO siap membantu Anda. Sampaikan kendala transaksi, langganan PRO, maupun saran pengembangan.
                    </p>

                    <div className="flex items-center justify-between pt-2.5 border-t border-brand-navy/15 text-[10px] text-brand-navy font-bold">
                        <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5" /> Balasan via Email Terdaftar
                        </span>
                        <span className="bg-brand-navy text-brand-gold px-2 py-0.5 rounded-md font-black">
                            BILANO Care
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT SECTION - CLEAN, CRISP & MODERN ELEVATION */}
        {/* ========================================================================= */}
        <div className="px-5 pt-5 pb-28 bg-slate-50 flex flex-col gap-4">
            
            {/* QUICK TOPIC CHIPS */}
            <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">
                    Pilihan Topik Cepat
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {QUICK_TOPICS.map((topic, idx) => {
                        const isSelected = subject === topic.subject;
                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSubject(topic.subject)}
                                className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                                    isSelected
                                        ? "bg-amber-100 text-brand-navy border-amber-500 shadow-xs"
                                        : "bg-white text-slate-700 border-slate-200/80 hover:border-slate-300 shadow-xs"
                                }`}
                            >
                                <span className="truncate">{topic.label}</span>
                                {isSelected && <Check className="w-4 h-4 text-amber-700 shrink-0" strokeWidth={3} />}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* CARD FORM LAPORAN ATAU STATE SUKSES */}
            {isSuccess ? (
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 text-center animate-in zoom-in-95 space-y-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div>
                        <h3 className="text-lg font-black text-slate-900 mb-1">
                            Laporan Berhasil Terkirim!
                        </h3>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                            Terima kasih telah menghubungi kami. Tim BILANO sedang meninjau tiket Anda dan akan membalas langsung ke alamat email:
                        </p>
                        <p className="text-xs font-bold text-brand-navy bg-amber-50 border border-amber-200 py-1.5 px-3 rounded-xl inline-block mt-2">
                            {userEmail || "Email Terdaftar"}
                        </p>
                    </div>

                    <div className="pt-2 space-y-2">
                        <button 
                            type="button"
                            onClick={() => { setIsSuccess(false); setSubject(""); setMessage(""); }}
                            className="w-full h-12 rounded-2xl bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                        >
                            Kirim Pesan Lain
                        </button>
                        <Link href="/">
                            <button 
                                type="button"
                                className="w-full h-10 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                                Kembali ke Beranda
                            </button>
                        </Link>
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="bg-white p-5 rounded-3xl shadow-xs border border-slate-200/80 space-y-4">
                    
                    {/* Subjek Dropdown */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                            Subjek Kendala / Kategori
                        </label>
                        <div className="relative">
                            <select 
                                value={subject} 
                                onChange={(e) => setSubject(e.target.value)}
                                className="w-full h-13 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs text-slate-800 outline-none focus:border-brand-navy focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="" disabled>-- Pilih Kategori Kendala --</option>
                                <option value="Kendala Transaksi / Saldo">Kendala Transaksi / Saldo</option>
                                <option value="Kendala Pembayaran PRO">Kendala Pembayaran PRO</option>
                                <option value="Pertanyaan Fitur">Pertanyaan Fitur Aplikasi</option>
                                <option value="Saran & Masukan">Saran & Masukan Fitur</option>
                                <option value="Lainnya">Kendala Lainnya</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </div>

                    {/* Detail Pesan */}
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 ml-1">
                            Ceritakan Detail Kendala
                        </label>
                        <textarea 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Ceritakan detail kendala atau saran Anda secara jelas..."
                            className="w-full min-h-[140px] p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 outline-none focus:border-brand-navy focus:bg-white transition-all resize-none"
                        />
                    </div>

                    {/* Info Notice Box */}
                    <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-2xl flex gap-2.5 items-start">
                        <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                            Balasan dari tim support akan dikirimkan ke email <strong>{userEmail || "akun Anda"}</strong>. Pastikan untuk memeriksa Inbox / Spam secara berkala.
                        </p>
                    </div>

                    {/* Tombol Kirim Laporan */}
                    <button 
                        type="submit"
                        disabled={isSubmitting} 
                        className="w-full h-14 bg-brand-gold hover:bg-[#e5a825] text-brand-navy font-bold text-xs uppercase tracking-wider rounded-2xl shadow-sm hover:shadow active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>MENGIRIM LAPORAN...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4 stroke-[2.5]" />
                                <span>KIRIM TIKET BANTUAN</span>
                            </>
                        )}
                    </button>
                </form>
            )}

        </div>
      </div>
    </MobileLayout>
  );
}