import { useState } from "react";
import { useAddTransaction, useUser } from "@/hooks/use-finance";
import { MobileLayout } from "@/components/Layout";
import { Button, Input } from "@/components/UIComponents";
import { Loader2, Wallet } from "lucide-react";
import { queryClient } from "@/lib/queryClient";

export default function Income() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const addTransaction = useAddTransaction();
  
  const [amountStr, setAmountStr] = useState("");
  const [category, setCategory] = useState("Gaji");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatRp = (val: number) => "Rp " + val.toLocaleString("id-ID");
  const currentCash = user?.cashBalance || 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    if (rawValue === "") {
        setAmountStr("");
    } else {
        const numberValue = parseInt(rawValue, 10);
        setAmountStr(new Intl.NumberFormat("id-ID").format(numberValue));
    }
  };

  const handleSubmit = async () => {
    const cleanAmount = parseInt(amountStr.replace(/\./g, ""), 10);

    if (!cleanAmount || cleanAmount <= 0) {
        alert("Masukkan jumlah uang yang valid");
        return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction.mutateAsync({
        amount: cleanAmount, 
        type: "income",
        category,
        description: description || "Pemasukan Rutin",
        date: new Date().toISOString(),
      });
      
      await queryClient.invalidateQueries();
      window.location.href = "/";
      
    } catch (error) {
      alert("Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isUserLoading) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
              <img src="/BILANO-ICON.png" alt="Loading BILANO" className="w-24 h-24 mb-6 animate-pulse object-contain drop-shadow-lg" />
              <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-sm bg-indigo-50 px-4 py-2 rounded-full shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin"/>
                  <span>Memuat Data...</span>
              </div>
          </div>
      );
  }

  return (
    <MobileLayout title="Catat Pemasukan" showBack>
      <div className="space-y-6 pt-4 relative pb-20 px-2">
        
        {/* INFO SALDO UTAMA */}
        <div className="text-center space-y-2 animate-in slide-in-from-top-4 pb-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
                <Wallet className="w-3.5 h-3.5" /> Saldo Tunai (Cash)
            </div>
            <div className="text-4xl font-extrabold text-slate-800 tracking-tight">
                {formatRp(currentCash)}
            </div>
            <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 inline-block px-4 py-1.5 rounded-full font-bold">
                + Tambah Pemasukan
            </div>
        </div>

        {/* FORM INPUT */}
        <div className="bg-white p-6 rounded-[32px] space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            <div className="space-y-5">
              
              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 block mb-2 ml-1">Nominal Pemasukan</label>
                <div className="relative">
                    <span className="absolute left-4 top-4 font-extrabold text-slate-400 text-lg">Rp</span>
                    <Input
                      type="tel" 
                      inputMode="numeric"
                      placeholder="0"
                      value={amountStr}
                      onChange={handleAmountChange}
                      className="pl-14 h-16 text-2xl font-extrabold text-slate-800 bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-emerald-500 rounded-[20px] transition-all"
                    />
                </div>
              </div>

              <div>
                <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 block mb-2 ml-1">Kategori</label>
                <div className="grid grid-cols-2 gap-3 mb-3">
                    {["Gaji", "Bonus", "Bisnis", "Hadiah"].map((cat) => (
                        <button key={cat} type="button" onClick={() => setCategory(cat)} className={`text-sm py-3.5 px-4 rounded-[16px] font-bold border transition-all ${category === cat ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>{cat}</button>
                    ))}
                </div>
                <Input placeholder="Ketik kategori lainnya..." value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm font-medium mb-3 h-14 rounded-[16px] bg-slate-50 border-transparent focus:bg-white focus:border-emerald-500"/>
                
                <textarea
                  placeholder="Catatan Tambahan (Opsional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-transparent rounded-[16px] px-4 py-4 outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm min-h-[100px] resize-none"
                />
              </div>

            </div>

            <Button 
                onClick={() => handleSubmit()} 
                className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-extrabold shadow-lg shadow-emerald-200 rounded-full active:scale-95 transition-transform"
                disabled={isSubmitting}
            >
                {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : "SIMPAN PEMASUKAN"}
            </Button>
        </div>

      </div>
    </MobileLayout>
  );
}