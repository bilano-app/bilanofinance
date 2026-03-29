import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button } from "@/components/UIComponents";
import { useToast } from "@/hooks/use-toast";
import { LifeBuoy, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react"; 

export default function Help() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!subject || !message) return toast({ title: "Gagal", description: "Subjek dan Pesan harus diisi.", variant: "destructive" });

      setIsSubmitting(true);
      try {
          const res = await fetch("/api/help/submit", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": userEmail },
              body: JSON.stringify({ subject, message })
          });

          if (!res.ok) throw new Error("Gagal mengirim laporan");
          
          setIsSuccess(true);
      } catch (error: any) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <MobileLayout title="Pusat Bantuan" showBack={true}>
      <div className="p-1 pb-20 space-y-6 animate-in fade-in slide-in-from-bottom-4 mt-4">
          
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-white/30">
                      <LifeBuoy className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-black mb-1">Ada Kendala?</h2>
                  <p className="text-sm text-blue-100 font-medium leading-relaxed">
                      Tim dukungan BILANO siap membantu Anda. Silakan tuliskan keluhan atau pertanyaan Anda di bawah ini.
                  </p>
              </div>
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          </div>

          {isSuccess ? (
              <Card className="p-8 text-center rounded-[32px] shadow-lg border-2 border-blue-100 animate-in zoom-in-95">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 mb-2">Laporan Terkirim!</h3>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      Terima kasih telah menghubungi kami. Tim kami sedang meninjau laporan Anda dan akan <b>membalasnya langsung via Email</b> yang terdaftar pada akun Anda.
                  </p>
                  <Button onClick={() => {setIsSuccess(false); setSubject(""); setMessage("");}} variant="outline" className="w-full rounded-full font-bold h-12">
                      Kirim Pesan Lain
                  </Button>
              </Card>
          ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Subjek Bantuan</label>
                      <select 
                          value={subject} 
                          onChange={(e) => setSubject(e.target.value)}
                          className="w-full h-14 px-4 bg-white border border-slate-200 rounded-[20px] font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
                      >
                          <option value="" disabled>-- Pilih Kategori --</option>
                          <option value="Kendala Transaksi / Saldo">Kendala Transaksi / Saldo</option>
                          <option value="Kendala Pembayaran PRO">Kendala Pembayaran PRO</option>
                          <option value="Pertanyaan Fitur">Pertanyaan Fitur Aplikasi</option>
                          <option value="Saran & Masukan">Saran & Masukan</option>
                          <option value="Lainnya">Lainnya</option>
                      </select>
                  </div>

                  <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Jelaskan Detailnya</label>
                      <textarea 
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Ceritakan detail kendala yang Anda alami..."
                          className="w-full min-h-[150px] p-4 bg-white border border-slate-200 rounded-[24px] text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                      />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex gap-3 items-start mt-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
                          Balasan dari tim kami akan dikirimkan ke email <b>{userEmail}</b>. Pastikan untuk mengecek kotak masuk (Inbox/Spam) Anda secara berkala.
                      </p>
                  </div>

                  <Button disabled={isSubmitting} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base shadow-lg shadow-indigo-200 rounded-[20px] mt-4">
                      {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin"/> : <><Send className="w-5 h-5 mr-2"/> KIRIM LAPORAN</>}
                  </Button>
              </form>
          )}
      </div>
    </MobileLayout>
  );
}