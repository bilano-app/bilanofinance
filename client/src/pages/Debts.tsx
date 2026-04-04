import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { 
    Users, ArrowUpRight, ArrowDownLeft, Calendar, 
    CheckCircle2, Plus, HandCoins, AlertCircle, X, Loader2, ArrowRight, HeartCrack, RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const DEFAULT_RATES: Record<string, number> = {
    "USD": 16200, "EUR": 17500, "SGD": 12100, "JPY": 108, "AUD": 10500, 
    "GBP": 20500, "CNY": 2250, "MYR": 3450, "SAR": 4300, "KRW": 12, "THB": 450, "IDR": 1
};

interface DebtItem {
  id: number;
  type: 'hutang' | 'piutang';
  name: string;
  amount: number;
  dueDate: string;
  description: string;
  isPaid: boolean;
}

export default function Debts() {
  const [activeTab, setActiveTab] = useState<'hutang' | 'piutang'>('piutang'); 

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [dueDate, setDueDate] = useState("");
  const [desc, setDesc] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const { toast } = useToast();
  const currentUserEmail = localStorage.getItem("bilano_email") || "";
  const isTrialExpired = currentUserEmail ? localStorage.getItem(`bilano_trial_expired_${currentUserEmail}`) === "true" : false;

  const formatNum = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };
  const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

  const { data: items = [], isLoading: isDebtsLoading, refetch: refetchDebts } = useQuery({
      queryKey: ['debts', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/debts`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: forexRates = {}, isLoading: isRatesLoading, refetch: refetchRates } = useQuery({
      queryKey: ['forexRates', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/forex/rates`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const { data: txs = [], refetch: refetchTxs } = useQuery({
      queryKey: ['transactions', currentUserEmail],
      queryFn: async () => {
          const res = await fetch(`/api/transactions`, { headers: { "x-user-email": currentUserEmail } });
          return res.json();
      },
      enabled: !!currentUserEmail
  });

  const loading = isDebtsLoading || isRatesLoading;
  const activeRates = Object.keys(forexRates).length > 0 ? forexRates : DEFAULT_RATES;
  const availableCurrencies = Object.keys(activeRates);

  const fetchData = async () => {
      await refetchDebts();
      await refetchRates();
      await refetchTxs();
  };

  const checkPaywall = () => {
      if (isTrialExpired) {
          window.dispatchEvent(new Event('trigger-paywall-lock'));
          return true;
      }
      return false;
  };

  const handleAdd = async () => {
      if (checkPaywall()) return;
      const nominal = parseNum(amount);
      if (!name || !nominal || nominal <= 0) { 
          toast({ title: "Form Tidak Lengkap!", variant: "destructive" }); 
          return; 
      }
      if (isSubmitting) return;
      
      setIsSubmitting(true);
      toast({ title: "Mencatat...", description: "Mohon tunggu sebentar." });

      try {
          const nameWithCurrency = `${name}|${currency}`;
          const resDebt = await fetch("/api/debts", {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ type: activeTab, name: nameWithCurrency, amount: nominal, dueDate, description: desc, isFromTransaction: false })
          });
          
          if (!resDebt.ok) throw new Error("Gagal menyimpan data.");

          await fetchData();
          toast({ title: "Tersimpan", description: "Catatan berhasil ditambahkan." });
          setName(""); setAmount(""); setDueDate(""); setDesc(""); setCurrency("IDR");
          setIsFormOpen(false); 
      } catch (e: any) { 
          toast({ title: "Terjadi Kendala", variant: "destructive" }); 
      } finally { 
          setIsSubmitting(false); 
      }
  };

  const handlePay = async () => {
      if (checkPaywall() || !selectedDebt) return;
      
      if (!selectedDebt.id) {
          toast({ title: "Error Sistem", description: "ID Tagihan tidak terbaca", variant: "destructive" });
          return;
      }

      const nominal = parseNum(payAmount) || selectedDebt.amount; 
      if (nominal > selectedDebt.amount) { toast({title: "Nominal Berlebih", variant: "destructive"}); return; }
      if (nominal <= 0) { toast({title: "Nominal tidak valid", variant: "destructive"}); return; }
      
      setIsPaying(true);
      toast({ title: "Memproses Pembayaran...", description: "Harap tunggu..." });

      try {
          const res = await fetch(`/api/debts/${selectedDebt.id}/pay`, { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ amount: nominal, isWriteOff: false }) 
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server Error ${res.status}`);
          }
          
          await fetchData(); 
          toast({ title: "Berhasil!", description: "Tagihan telah diperbarui." }); 
          setPayAmount(""); setSelectedDebt(null); setPayModalOpen(false); 
      } catch (e: any) { 
          toast({ title: "Gagal Memproses", description: e.message, variant: "destructive" }); 
      } finally { 
          setIsPaying(false); 
      }
  };

  const handleWriteOff = async (debtToProcess: DebtItem) => {
      if (checkPaywall() || !debtToProcess) return;
      
      if (!debtToProcess.id) {
          toast({ title: "Error Sistem", description: "ID Tagihan tidak terbaca", variant: "destructive" });
          return;
      }

      const isPiutang = debtToProcess.type === 'piutang';
      const confirmText = isPiutang 
          ? "Ikhlaskan piutang ini? Ini akan dicatat sebagai KERUGIAN di Laporan Anda." 
          : "Hutang ini diputihkan oleh pihak lawan? Ini akan dicatat sebagai KEUNTUNGAN di Laporan Anda.";
          
      if (!confirm(confirmText)) return;
      
      setSelectedDebt(debtToProcess); 
      setIsPaying(true);
      toast({ title: "Menganulir Tagihan...", description: "Menghitung kerugian/keuntungan..." });

      try {
          const res = await fetch(`/api/debts/${debtToProcess.id}/pay`, { 
              method: "POST", 
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail },
              body: JSON.stringify({ amount: debtToProcess.amount, isWriteOff: true }) 
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server Error ${res.status}`);
          }
          
          await fetchData(); 
          toast({ title: "Selesai!", description: "Tercatat di Laporan PDF Anda." });
      } catch (e: any) { 
          toast({ title: "Gagal Memproses", description: e.message, variant: "destructive" }); 
      } finally { 
          setIsPaying(false); setSelectedDebt(null); 
      }
  };

  // 🚀 FITUR BARU: TOMBOL PULIHKAN (RESTORE)
  const handleRestore = async (debtId: number) => {
      if (checkPaywall()) return;
      if (!confirm("Pulihkan tagihan ini? Saldo dan transaksi akan dikembalikan seperti semula.")) return;

      setIsPaying(true); 
      toast({ title: "Memulihkan...", description: "Menarik uang kembali..." });

      try {
          const res = await fetch(`/api/debts/${debtId}/restore`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "x-user-email": currentUserEmail }
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Server Error ${res.status}`);
          }

          await fetchData();
          toast({ title: "Berhasil!", description: "Tagihan berhasil dipulihkan." });
      } catch (e: any) {
          toast({ title: "Gagal Memulihkan", description: e.message, variant: "destructive" });
      } finally {
          setIsPaying(false);
      }
  };

  const filteredItems = items.filter((i: DebtItem) => i.type === activeTab);
  
  const totalAmountIDR = filteredItems.filter((i: DebtItem) => !i.isPaid).reduce((acc: number, item: DebtItem) => {
      const parts = (item.name || "").split('|');
      const curr = parts[1] || 'IDR';
      const rate = curr === 'IDR' ? 1 : (activeRates[curr] || 1);
      return acc + (item.amount * rate);
  }, 0);

  const formatRp = (val: number) => "Rp " + Math.round(val || 0).toLocaleString("id-ID");

  const displayTotalDebt = formatRp(totalAmountIDR);
  const getBalanceTextSize = (text: string) => {
      if (text.length >= 20) return "text-2xl"; 
      if (text.length >= 15) return "text-3xl"; 
      return "text-4xl"; 
  };

  let modalSisaTagihanUI = "Rp 0";
  if (selectedDebt) {
      const curr = selectedDebt.name.split('|')[1] || 'IDR';
      const rate = curr === 'IDR' ? 1 : (activeRates[curr] || 1);
      const idrNominal = selectedDebt.amount * rate;
      modalSisaTagihanUI = curr !== 'IDR' ? `${curr} ${selectedDebt.amount.toLocaleString('id-ID')} (≈ ${formatRp(idrNominal)})` : formatRp(selectedDebt.amount);
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;

  return (
    <MobileLayout title="Hutang & Piutang" showBack>
      <div className="space-y-6 pt-4 pb-24 px-2">

        {payModalOpen && selectedDebt && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative">
                    {!isPaying && <button onClick={() => {setPayModalOpen(false); setPayAmount(""); setSelectedDebt(null);}} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-6 h-6"/></button>}
                    <h3 className="text-lg font-extrabold text-slate-800 mb-2">Pelunasan / Cicilan</h3>
                    
                    <p className="text-xs text-slate-500 mb-4">Sisa Tagihan: <span className="font-bold text-rose-600">{modalSisaTagihanUI}</span></p>
                    
                    <Input disabled={isPaying} type="text" inputMode="decimal" placeholder="Nominal Bayar (Kosongkan jika lunas)" value={payAmount} onChange={e => setPayAmount(formatNum(e.target.value))} className="h-14 font-bold text-lg mb-4"/>
                    
                    <Button onClick={handlePay} disabled={isPaying} className="w-full h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg transition-transform active:scale-95">
                        {isPaying ? <Loader2 className="w-5 h-5 animate-spin"/> : "KONFIRMASI PEMBAYARAN"}
                    </Button>
                </div>
            </div>
        )}

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"/>
            <div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                    <strong className="font-extrabold">PENTING:</strong> Halaman ini khusus untuk aktivitas <strong>Pinjam Meminjam Uang KAS</strong>. Jika ini adalah piutang/hutang dari hasil <strong>Pemasukan/Pengeluaran</strong>, silakan catat di:
                </p>
                <div className="flex gap-2 mt-3">
                    <button onClick={() => window.location.href='/income'} className="flex-1 text-[10px] font-bold bg-white border border-amber-200 text-amber-700 py-1.5 rounded-lg flex justify-center items-center gap-1 hover:bg-amber-100">Catat Pemasukan <ArrowRight className="w-3 h-3"/></button>
                    <button onClick={() => window.location.href='/expense'} className="flex-1 text-[10px] font-bold bg-white border border-amber-200 text-amber-700 py-1.5 rounded-lg flex justify-center items-center gap-1 hover:bg-amber-100">Catat Pengeluaran <ArrowRight className="w-3 h-3"/></button>
                </div>
            </div>
        </div>

        <div className={`p-6 rounded-[32px] text-white shadow-xl relative overflow-hidden transition-colors duration-500 ${activeTab === 'piutang' ? 'bg-gradient-to-br from-emerald-500 to-teal-700' : 'bg-gradient-to-br from-rose-500 to-pink-700'}`}>
            <div className="relative z-10">
                <p className="text-[11px] font-bold uppercase tracking-widest text-white/80 mb-1 flex items-center gap-2">
                    {activeTab === 'piutang' ? <HandCoins className="w-4 h-4"/> : <AlertCircle className="w-4 h-4"/>}
                    Total {activeTab === 'piutang' ? 'Uang di Orang (Piutang)' : 'Kewajiban (Hutang)'}
                </p>
                <h2 className={`${getBalanceTextSize(displayTotalDebt)} font-extrabold tracking-tight whitespace-nowrap transition-all duration-300`}>
                    {displayTotalDebt}
                </h2>
                <p className="text-[10px] mt-2 opacity-80">*Mengikuti kurs live harian</p>
            </div>
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/10 rounded-tl-full pointer-events-none"></div>
        </div>

        <div className="flex bg-slate-100 p-1.5 rounded-full">
            <button onClick={() => setActiveTab('piutang')} className={`flex-1 py-2.5 rounded-full text-[11px] font-extrabold transition-all flex items-center justify-center gap-1 ${activeTab === 'piutang' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ArrowUpRight className="w-3.5 h-3.5"/> PIUTANG (Uang Kita)
            </button>
            <button onClick={() => setActiveTab('hutang')} className={`flex-1 py-2.5 rounded-full text-[11px] font-extrabold transition-all flex items-center justify-center gap-1 ${activeTab === 'hutang' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                <ArrowDownLeft className="w-3.5 h-3.5"/> HUTANG (Pinjaman)
            </button>
        </div>

        {!isFormOpen ? (
            <Button onClick={() => setIsFormOpen(true)} className={`w-full h-14 rounded-full font-extrabold shadow-lg transition-transform active:scale-95 ${activeTab === 'piutang' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-emerald-100' : 'bg-rose-100 text-rose-700 hover:bg-rose-200 shadow-rose-100'}`}>
                <Plus className="w-5 h-5 mr-2"/> CATAT {activeTab.toUpperCase()} BARU
            </Button>
        ) : (
            <div className="bg-white p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="font-extrabold text-slate-800">Form {activeTab === 'hutang' ? 'Hutang' : 'Piutang'}</h3>
                    {!isSubmitting && <button onClick={() => setIsFormOpen(false)} className="p-1.5 bg-slate-50 text-slate-400 rounded-full hover:bg-rose-50 hover:text-rose-500"><X className="w-5 h-5"/></button>}
                </div>
                <div className="space-y-4">
                    <Input disabled={isSubmitting} placeholder="Nama Pihak (Cth: Budi)" value={name} onChange={e => setName(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent font-bold"/>
                    
                    <div className="flex gap-2">
                        <select disabled={isSubmitting} value={currency} onChange={e => setCurrency(e.target.value)} className="w-24 px-3 bg-indigo-50 text-indigo-700 font-bold border-transparent rounded-[20px] outline-none text-sm">
                            <option value="IDR">IDR</option>
                            {availableCurrencies.filter(c => c !== 'IDR').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <Input disabled={isSubmitting} type="text" inputMode="decimal" placeholder="Nominal" value={amount} onChange={e => setAmount(formatNum(e.target.value))} className="flex-1 h-14 rounded-[20px] bg-slate-50 border-transparent font-bold text-lg"/>
                    </div>
                    
                    <div className="space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 ml-1">Tenggat Waktu (Wajib)</label>
                        <Input disabled={isSubmitting} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent text-sm w-full block"/>
                    </div>

                    <Input disabled={isSubmitting} placeholder="Catatan Tambahan (Opsional)" value={desc} onChange={e => setDesc(e.target.value)} className="h-14 rounded-[20px] bg-slate-50 border-transparent text-sm"/>
                    
                    <Button onClick={handleAdd} disabled={isSubmitting} className={`w-full h-14 rounded-full font-extrabold text-white mt-2 shadow-lg transition-transform active:scale-95 ${activeTab === 'piutang' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'}`}>
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto"/> : "SIMPAN"}
                    </Button>
                </div>
            </div>
        )}

        <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm ml-2 px-1">Daftar Tagihan</h3>
            {filteredItems.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-slate-200 shadow-sm">
                    <p className="text-slate-400 text-sm font-medium">Yeay! Tidak ada {activeTab} tercatat.</p>
                </div>
            ) : (
                filteredItems.map((item: DebtItem) => {
                    const parts = (item.name || "").split('|');
                    const displayName = parts[0];
                    const curr = parts[1] || 'IDR';
                    const rate = curr === 'IDR' ? 1 : (activeRates[curr] || 1);
                    const isForeign = curr !== 'IDR';
                    const totalIDR = item.amount * rate;

                    const isCicilan = item.description?.includes('(Sisa dari');
                    const isProcessing = isPaying && selectedDebt?.id === item.id;
                    
                    const isWrittenOff = txs.some((t:any) => 
                        t.description?.includes(`[WRITE_OFF] ${item.name}`)
                    );

                    return (
                        <div key={item.id} className={`bg-white p-5 rounded-[24px] border shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex justify-between items-center transition-all ${item.isPaid ? 'opacity-60 border-slate-100' : (activeTab === 'piutang' ? 'border-emerald-50' : 'border-rose-50')}`}>
                            <div className="flex-1 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${item.isPaid ? (isWrittenOff ? (activeTab === 'piutang' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600') : 'bg-slate-100 text-slate-500') : (activeTab === 'piutang' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700')}`}>
                                        {item.isPaid ? (isWrittenOff ? (activeTab === 'piutang' ? 'WRITE-OFF' : 'PEMUTIHAN') : 'LUNAS') : (isCicilan ? 'DICICIL' : 'BELUM LUNAS')}
                                    </span>
                                    <span className="font-extrabold text-slate-800 text-base">{displayName}</span>
                                </div>
                                
                                <div className="mt-1">
                                    {isForeign ? (
                                        <>
                                            <p className={`font-extrabold text-lg ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                {curr} {item.amount.toLocaleString('id-ID')}
                                            </p>
                                            <p className="text-xs font-bold text-slate-500">≈ {formatRp(totalIDR)}</p>
                                        </>
                                    ) : (
                                        <p className={`font-extrabold text-lg ${item.isPaid ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                            {formatRp(item.amount)}
                                        </p>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 mt-2">
                                    <Calendar className="w-3 h-3"/> Tempo: {item.dueDate ? new Date(item.dueDate).toLocaleDateString('id-ID') : "-"} 
                                    {item.description && <span className="ml-1 text-slate-400 truncate max-w-[120px]">• {item.description}</span>}
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-2">
                                {!item.isPaid ? (
                                    <>
                                        <button onClick={() => { setSelectedDebt(item); setPayModalOpen(true); }} disabled={isPaying} className={`p-3 rounded-[16px] text-white shadow-md active:scale-95 transition-transform flex flex-col items-center justify-center ${activeTab === 'hutang' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                                            {isProcessing ? <Loader2 className="w-5 h-5 mb-0.5 animate-spin"/> : <CheckCircle2 className="w-5 h-5 mb-0.5"/>}
                                            <span className="text-[9px] font-extrabold uppercase tracking-wider">{activeTab === 'hutang' ? 'Bayar' : 'Tagih'}</span>
                                        </button>
                                        
                                        <button onClick={() => handleWriteOff(item)} disabled={isPaying} className={`p-2 rounded-[16px] shadow-sm active:scale-95 transition-transform flex flex-col items-center justify-center border ${activeTab === 'piutang' ? 'bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600 border-emerald-100'}`} title={activeTab === 'piutang' ? 'Ikhlaskan (Rugi)' : 'Pemutihan (Untung)'}>
                                            {isProcessing ? <Loader2 className="w-4 h-4 mb-0.5 animate-spin"/> : <HeartCrack className="w-4 h-4 mb-0.5"/>}
                                            <span className="text-[8px] font-extrabold uppercase tracking-wider">{activeTab === 'piutang' ? 'Ikhlas' : 'Putihkan'}</span>
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={() => handleRestore(item.id)} disabled={isPaying} className="px-3 py-2 bg-slate-200 text-slate-600 hover:bg-indigo-100 hover:text-indigo-600 rounded-[12px] text-[10px] font-extrabold uppercase tracking-widest flex items-center justify-center gap-1 transition-colors">
                                        <RefreshCw className="w-3.5 h-3.5"/> Pulihkan
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })
            )}
        </div>

      </div>
    </MobileLayout>
  );
}