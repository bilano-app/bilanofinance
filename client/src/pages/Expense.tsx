import { useState } from "react";
import { useUser, useTarget, useAddTransaction, useTransactions } from "@/hooks/use-finance"; 
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents"; 
import { Wallet, AlertTriangle, ShieldCheck, X, AlertOctagon, Loader2, HandCoins } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Expense() {
  const { toast } = useToast();
  
  const { data: user, isLoading: isUserLoading } = useUser();
  const { data: target, isLoading: isTargetLoading } = useTarget();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const addTransactionMutation = useAddTransaction();

  const [amountStr, setAmountStr] = useState(""); 
  const [category, setCategory] = useState("Makan/Minum");
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState({ deficit: 0, nextMonthLimit: 0 });

  const [paymentMode, setPaymentMode] = useState<'cash' | 'hutang'>('cash');
  const [debtName, setDebtName] = useState("");

  const formatNumber = (value: string) => value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => setAmountStr(formatNumber(e.target.value));
  const parseNumber = (value: string) => Number(value.replace(/,/g, "")) || 0;
  const formatRp = (val: number) => "Rp " + val.toLocaleString("id-ID");

  const now = new Date();
  const currentMonthIdx = now.getMonth(); 
  const currentYear = now.getFullYear();
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;

  let remainingBudget = 0;     
  let budgetLabel = "Batas Bulan Ini";

  if (target && target.monthlyBudget > 0) {
      if (target.budgetType === 'rollover') {
          const startMonthIdx = (target.startMonth || 1) - 1; 
          const startYear = target.startYear || currentYear;
          const diffYear = currentYear - startYear;
          const diffMonth = currentMonthIdx - startMonthIdx;
          const totalMonthsActive = Math.max(1, (diffYear * 12) + diffMonth + 1);
          
          const totalBudgetPool = target.monthlyBudget * totalMonthsActive;
          
          const allExpensesSinceStart = transactions?.filter(t => {
              const tDate = new Date(t.date);
              return t.type === 'expense' && tDate >= new Date(startYear, startMonthIdx, 1);
          }).reduce((acc, t) => acc + t.amount, 0) || 0;

          remainingBudget = totalBudgetPool - allExpensesSinceStart;
          budgetLabel = "Sisa Akumulasi";
      } else {
          const expensesThisMonth = transactions?.filter(t => {
              const d = new Date(t.date);
              return t.type === 'expense' && d.getMonth() === currentMonthIdx && d.getFullYear() === currentYear;
          }).reduce((acc, t) => acc + t.amount, 0) || 0;

          remainingBudget = target.monthlyBudget - expensesThisMonth;
          budgetLabel = "Sisa Jatah Bulan Ini";
      }
  }

  const handleSubmit = async (isEmergencyOverride = false) => {
      const nominal = parseNumber(amountStr);
      if (!nominal || nominal <= 0) {
          toast({ title: "Error", description: "Isi nominal pengeluaran!", variant: "destructive" });
          return;
      }

      if (paymentMode === 'hutang' && !debtName) { 
          toast({ title: "Error", description: "Isi nama pihak yang dihutangi!", variant: "destructive" }); 
          return; 
      }
      
      const spendingAmount = nominal; 

      if (paymentMode === 'cash' && user && spendingAmount > user.cashBalance) {
          alert(`⛔ TRANSAKSI DITOLAK!\n\nUang tunai Anda kurang.\nSaldo: ${formatRp(user.cashBalance)}\nMau keluar: ${formatRp(spendingAmount)}`);
          return;
      }

      if (target && target.monthlyBudget > 0 && !isEmergencyOverride && paymentMode === 'cash') {
          if (spendingAmount > remainingBudget) {
             const deficit = spendingAmount - remainingBudget;
             const nextMonthPred = target.monthlyBudget - deficit;
             setEmergencyDetails({ deficit, nextMonthLimit: nextMonthPred });
             setShowEmergencyModal(true);
             return;
          }
      }

      setIsSubmitting(true);
      
      try {
          if (paymentMode === 'cash') {
              await addTransactionMutation.mutateAsync({
                  type: 'expense',
                  amount: spendingAmount, 
                  category: category,
                  description: desc || "Pengeluaran Rutin",
                  date: new Date().toISOString()
              });

              if (isEmergencyOverride) {
                  try {
                      await fetch("/api/target/penalty", {
                          method: "PATCH",
                          headers: { 
                              "Content-Type": "application/json",
                              "x-user-email": currentUserEmail 
                          },
                          body: JSON.stringify({ amount: emergencyDetails.deficit })
                      });
                      toast({ title: "Dana Darurat Dipakai", description: "Budget bulan depan telah dikurangi." });
                  } catch (err) {
                      console.error("Gagal update penalti, tapi transaksi tersimpan.", err);
                  }
              } else {
                  toast({ title: "Tercatat!", description: "Pengeluaran berhasil disimpan." });
              }
          } else {
              await fetch("/api/debts", {
                  method: "POST", headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
                  body: JSON.stringify({ 
                      type: 'hutang', 
                      name: `${debtName}|IDR`, 
                      amount: spendingAmount, 
                      description: `[Hutang Pengeluaran: ${category}] ${desc}`,
                      isFromTransaction: true 
                  })
              });
              await addTransactionMutation.mutateAsync({ 
                  type: 'expense', 
                  amount: spendingAmount, 
                  category: `Hutang: ${category}`, 
                  description: `Belum Dibayar - ${debtName}`, 
                  date: new Date().toISOString() 
              });
              toast({ title: "Tercatat!", description: "Hutang pengeluaran berhasil disimpan." });
          }

          setShowEmergencyModal(false);
          window.location.href = "/"; 

      } catch (error) {
          toast({ title: "Gagal", description: "Terjadi kesalahan sistem.", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
          setShowEmergencyModal(false);
      }
  };

  const currentCash = user?.cashBalance || 0;

  // 🚀 FITUR BARU: AUTO-SHRINK TEXT AGAR TIDAK OFFSIDE
  const displayBalance = formatRp(currentCash);
  const getBalanceTextSize = (text: string) => {
      if (text.length >= 20) return "text-2xl"; 
      if (text.length >= 15) return "text-3xl"; 
      return "text-4xl"; 
  };

  if (isUserLoading || isTargetLoading || isTxLoading) {
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
    <MobileLayout title="Catat Pengeluaran" showBack>
      <div className="space-y-6 pt-4 relative pb-20 px-2">
        
        {showEmergencyModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95">
                    <button onClick={() => setShowEmergencyModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                        <X className="w-6 h-6"/>
                    </button>
                    
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertOctagon className="w-8 h-8 text-rose-600"/>
                        </div>
                        
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800">Budget Tidak Cukup!</h3>
                            <p className="text-slate-500 text-sm mt-1">
                                Sisa limit budget: <span className="font-bold text-slate-700">{formatRp(remainingBudget < 0 ? 0 : remainingBudget)}</span>
                            </p>
                        </div>

                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-[20px] text-left space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Kekurangan:</span>
                                <span className="font-bold text-rose-600">{formatRp(emergencyDetails.deficit)}</span>
                            </div>
                            <div className="h-px bg-rose-200 w-full"></div>
                            <p className="text-xs text-rose-700 leading-relaxed">
                                Jika lanjut, Anda akan menggunakan <strong>Dana Darurat</strong>. 
                                Konsekuensinya, budget bulan depan akan otomatis dipotong.
                            </p>
                            <div className="flex justify-between text-xs font-bold bg-white p-3 rounded-[16px] border border-rose-100 mt-2">
                                <span className="text-slate-500">Budget Bulan Depan Jadi:</span>
                                <span className="text-indigo-600">{formatRp(emergencyDetails.nextMonthLimit)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowEmergencyModal(false)} className="flex-1 rounded-full border-slate-200">
                                Batalkan
                            </Button>
                            <Button 
                                onClick={() => handleSubmit(true)} 
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-lg shadow-rose-200"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Memproses..." : "Pakai Darurat"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="text-center space-y-2 animate-in slide-in-from-top-4 pb-4">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">
                <Wallet className="w-3.5 h-3.5" /> Saldo Tunai (Cash)
            </div>
            {/* 🚀 AUTO SHRINK DITERAPKAN DI SINI */}
            <div className={`${getBalanceTextSize(displayBalance)} font-extrabold text-slate-800 tracking-tight whitespace-nowrap transition-all duration-300`}>
                {displayBalance}
            </div>

            {target && target.monthlyBudget > 0 ? (
                <div className={`mt-4 border p-3.5 rounded-[20px] shadow-sm max-w-[85%] mx-auto transition-colors ${remainingBudget < 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">{budgetLabel}</span>
                        {target.budgetType === 'rollover' && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Rollover</span>}
                    </div>
                    <div className={`text-xl font-extrabold ${remainingBudget < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {formatRp(remainingBudget)}
                    </div>
                </div>
            ) : (
                <div className="mt-2 text-xs text-slate-400 bg-white border border-slate-200 inline-block px-4 py-1.5 rounded-full">
                    Mode Bebas (Tanpa Limit)
                </div>
            )}
        </div>

        <div className="bg-white p-6 rounded-[32px] space-y-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
            
            <div className="flex bg-slate-100 p-1.5 rounded-xl">
                <button onClick={() => setPaymentMode('cash')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${paymentMode === 'cash' ? 'bg-rose-500 text-white shadow' : 'text-slate-500'}`}>TUNAI (Cash)</button>
                <button onClick={() => setPaymentMode('hutang')} className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${paymentMode === 'hutang' ? 'bg-amber-500 text-white shadow' : 'text-slate-500'}`}><HandCoins className="w-4 h-4"/> HUTANG (Ngutang Dulu)</button>
            </div>

            <div className="space-y-5">
                <div>
                    <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 block mb-2 ml-1">Nominal Pengeluaran</label>
                    <div className="relative">
                        <span className="absolute left-4 top-4 font-extrabold text-slate-400 text-lg">Rp</span>
                        <Input type="tel" value={amountStr} onChange={handleAmountChange} placeholder="0" className="pl-14 h-16 text-2xl font-extrabold text-slate-800 bg-slate-50 border-transparent focus:bg-white focus:border-rose-500 focus:ring-rose-500 rounded-[20px] transition-all"/>
                    </div>
                </div>

                {paymentMode === 'hutang' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="text-[11px] uppercase tracking-widest font-bold text-amber-500 block mb-2 ml-1">Ngutang Ke Siapa?</label>
                        <Input placeholder="Nama Toko / Teman" value={debtName} onChange={e => setDebtName(e.target.value)} className="h-14 bg-amber-50 border-transparent focus:border-amber-400 rounded-[16px]"/>
                    </div>
                )}

                <div>
                    <label className="text-[11px] uppercase tracking-widest font-bold text-slate-400 block mb-2 ml-1">Kategori</label>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        {["Makan", "Transport", "Belanja", "Tagihan"].map((cat) => (
                            <button key={cat} onClick={() => setCategory(cat)} className={`text-sm py-3.5 px-4 rounded-[16px] font-bold border transition-all ${category === cat ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>{cat}</button>
                        ))}
                    </div>
                    <Input placeholder="Ketik kategori lainnya..." value={category} onChange={(e) => setCategory(e.target.value)} className="text-sm font-medium mb-3 h-14 rounded-[16px] bg-slate-50 border-transparent focus:bg-white focus:border-rose-500"/>
                    <textarea placeholder="Catatan Tambahan (Opsional)" value={desc} onChange={(e) => setDesc(e.target.value)} className="w-full bg-slate-50 border border-transparent rounded-[16px] px-4 py-4 outline-none focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all text-sm min-h-[100px] resize-none"/>
                </div>
            </div>

            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting} className={`w-full h-16 text-white text-lg font-extrabold shadow-lg rounded-full active:scale-95 transition-transform ${paymentMode === 'hutang' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}>
                {isSubmitting ? "MENYIMPAN..." : (paymentMode === 'hutang' ? "SIMPAN HUTANG" : "SIMPAN PENGELUARAN")}
            </Button>
        </div>
      </div>
    </MobileLayout>
  );
}