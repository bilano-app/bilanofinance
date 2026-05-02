import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card, Button, Input } from "@/components/UIComponents";
import { useUser, useTransactions, useAddTransaction } from "@/hooks/use-finance"; 
import { formatCurrency } from "@/lib/utils";
import { HeartHandshake, Loader2, CheckCircle2, History, Settings, Info, PieChart, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Amal() {
  const { data: user } = useUser();
  const { data: transactions } = useTransactions();
  const addTransaction = useAddTransaction();
  const { toast } = useToast();

  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "default" : "default";
  const isLocked = !user?.isPro && localStorage.getItem(`bilano_trial_expired_${userEmail}`) === "true";

  const [amalPct, setAmalPct] = useState<number>(2.5);
  const [amalDict, setAmalDict] = useState<Record<string, number>>({});
  const [showSettings, setShowSettings] = useState(false);
  const [tempPct, setTempPct] = useState("");
  const [isRetroactive, setIsRetroactive] = useState(false);
  
  const [excessData, setExcessData] = useState<{amount: number, excess: number, desc: string} | null>(null);

  useEffect(() => {
      const savedPct = localStorage.getItem(`bilano_amal_pct_${userEmail}`);
      if (savedPct) setAmalPct(parseFloat(savedPct));
      
      const savedDict = localStorage.getItem(`bilano_amal_dict_${userEmail}`);
      if (savedDict) setAmalDict(JSON.parse(savedDict));
  }, [userEmail]);

  const formatNum = (val: string) => {
      if (!val) return "";
      let raw = val.replace(/\./g, "").replace(/[^0-9,]/g, "");
      const parts = raw.split(",");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
      return parts.slice(0, 2).join(",");
  };
  const parseNum = (val: string) => parseFloat(val.replace(/\./g, "").replace(/,/g, ".")) || 0;

  const handleSaveSettings = () => {
      const newPct = parseFloat(tempPct);
      if (isNaN(newPct) || newPct < 0 || newPct > 100) {
          toast({ title: "Error", description: "Masukkan persentase valid (0-100).", variant: "destructive" });
          return;
      }

      if (isRetroactive) {
          setAmalDict({});
          localStorage.setItem(`bilano_amal_dict_${userEmail}`, JSON.stringify({}));
      } else {
          const newDict = { ...amalDict };
          // 🚀 FIX: Masukkan juga piutang yang sudah cair ke memori persentase
          const incomes = transactions?.filter(t => 
              t.type === 'income' || 
              (t.type === 'debt_receive' && t.description?.includes('[Pemasukan Cair]'))
          ) || [];
          incomes.forEach(inc => {
              if (newDict[inc.id] === undefined) newDict[inc.id] = amalPct;
          });
          setAmalDict(newDict);
          localStorage.setItem(`bilano_amal_dict_${userEmail}`, JSON.stringify(newDict));
      }

      setAmalPct(newPct);
      localStorage.setItem(`bilano_amal_pct_${userEmail}`, newPct.toString());
      setShowSettings(false);
      toast({ title: "Berhasil", description: `Persentase diubah menjadi ${newPct}%` });
  };

  // 🚀 UPDATE CASH BASIS: Tangkap 'debt_receive' yang berlabel [Pemasukan Cair]
  const pureIncomes = (transactions || []).filter(t => 
      (
          (t.type === 'income' && !t.description?.includes('Belum Dibayar')) || 
          (t.type === 'debt_receive' && t.description?.includes('[Pemasukan Cair]'))
      ) && 
      !t.description?.includes('[Offset') && !t.description?.includes('[WRITE_OFF]') && 
      !t.description?.includes('[Catat Awal]') && t.category !== 'Penyesuaian Sistem' && 
      t.category !== 'Pemutihan Hutang'
  ).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

  const amalTxs = (transactions || []).filter(t => t.category === 'Amal').sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  let totalAmalPaid = amalTxs.reduce((acc, t) => {
      let val = t.amount;
      const match = t.description?.match(/\[Ekstra:\s*([0-9.,]+)\]/i);
      if (match) {
          const extraAmt = parseFloat(match[1].replace(/[^0-9.-]+/g, ""));
          val -= isNaN(extraAmt) ? 0 : extraAmt;
      }
      return acc + val;
  }, 0);

  const totalKebaikan = amalTxs.reduce((acc, t) => acc + t.amount, 0); 

  const allocationDetails: any[] = [];
  let totalSisaAnggaran = 0;

  pureIncomes.forEach(inc => {
      const pctToUse = amalDict[inc.id] !== undefined ? amalDict[inc.id] : amalPct;
      if (pctToUse <= 0) return;

      const allocatedAmount = inc.amount * (pctToUse / 100);
      let remainingForThis = allocatedAmount;
      let status = 'Belum';

      if (totalAmalPaid >= allocatedAmount) {
          remainingForThis = 0;
          totalAmalPaid -= allocatedAmount;
          status = 'Lunas';
      } else if (totalAmalPaid > 0) {
          remainingForThis = allocatedAmount - totalAmalPaid;
          totalAmalPaid = 0;
          status = 'Sebagian';
      }

      totalSisaAnggaran += remainingForThis;
      
      // 🚀 Bersihkan teks [Pemasukan Cair] agar UI tetap rapi
      const displayDesc = inc.type === 'debt_receive' 
          ? `Pencairan: ${inc.description?.replace('[Pemasukan Cair]', '').trim()}` 
          : (inc.description || inc.category);

      allocationDetails.push({ ...inc, displayDesc, pctUsed: pctToUse, allocatedAmount, remainingForThis, status });
  });

  allocationDetails.reverse();
  
  const sisaDepositAmal = Math.max(0, totalAmalPaid);

  const checkAndSaveAmal = () => {
      if (isLocked) { window.dispatchEvent(new Event('trigger-paywall-lock')); return; }
      
      const finalAmount = parseNum(amount);
      if (finalAmount <= 0) { toast({ title: "Kosong", description: "Masukkan jumlah amal.", variant: "destructive" }); return; }
      if (user && finalAmount > user.cashBalance) { toast({ title: "Saldo Kurang", variant: "destructive" }); return; }

      const excess = finalAmount - totalSisaAnggaran;
      
      if (excess > 0) {
          setExcessData({ amount: finalAmount, excess, desc: desc || "Amal / Sedekah" });
      } else {
          executeSaveAmal(finalAmount, desc || "Amal / Sedekah", false, 0);
      }
  };

  const executeSaveAmal = async (finalAmt: number, description: string, ikhlasEkstra: boolean, excessAmt: number) => {
      setIsSubmitting(true);
      setExcessData(null);
      
      let finalDesc = description;
      if (ikhlasEkstra && excessAmt > 0) {
          finalDesc = `${description} [Ekstra: ${excessAmt}]`.trim();
      }

      try {
          await addTransaction.mutateAsync({
              type: 'expense', 
              amount: finalAmt,
              category: 'Amal', 
              description: finalDesc,
              date: new Date().toISOString()
          } as any);

          toast({ title: "Amal Tercatat! 🤲", description: "Semoga berkah dan diganti berlipat ganda." });
          setAmount(""); setDesc("");
      } catch (e) {
          toast({ title: "Gagal Mencatat", variant: "destructive" });
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <MobileLayout title="Amal & Sedekah" showBack>
      <div className="pt-4 pb-24 px-4 space-y-6 animate-in fade-in">
          
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-[32px] p-6 text-white shadow-xl shadow-emerald-200 relative overflow-hidden">
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                            <HeartHandshake className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Total Kebaikan</p>
                            <p className="font-extrabold text-lg">{formatCurrency(totalKebaikan).split(',')[0]}</p>
                        </div>
                    </div>
                    <button onClick={() => { setTempPct(amalPct.toString()); setShowSettings(true); }} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md">
                        <Settings className="w-5 h-5 text-white"/>
                    </button>
                </div>

                <div className="text-center bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-100 mb-1">Anggaran Amal Tertunda</p>
                    <h2 className="text-3xl font-black mb-1">{formatCurrency(totalSisaAnggaran).split(',')[0]}</h2>
                    <div className="flex items-center justify-center gap-1.5 mt-2 text-[10px] text-emerald-50 bg-emerald-800/40 w-max mx-auto px-3 py-1 rounded-full">
                        <PieChart className="w-3 h-3"/><span>Alokasi saat ini: <b>{amalPct}%</b> dari pemasukan</span>
                    </div>
                </div>

                {sisaDepositAmal > 0 && (
                    <div className="mt-4 bg-emerald-800/30 border border-emerald-400/30 rounded-xl p-3 text-left flex items-start gap-2 animate-in slide-in-from-bottom-2">
                        <Info className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5"/>
                        <div>
                            <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider mb-0.5">Deposit Amal Aktif</p>
                            <p className="text-sm font-black text-emerald-300">{formatCurrency(sisaDepositAmal).split(',')[0]}</p>
                            <p className="text-[9px] text-emerald-100/70 leading-relaxed mt-1">
                                Ini adalah kelebihan sedekah masa lalu Anda. Deposit ini akan <b>otomatis mencoret (melunasi)</b> kewajiban amal dari pemasukan baru Anda di masa depan sampai habis.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-tr-full blur-2xl pointer-events-none"></div>
        </div>

        <Card className="p-6 rounded-[32px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-base mb-5 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500"/> Catat Amal Baru
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Nominal (Rp)</label>
                    <Input 
                        type="text" inputMode="decimal" value={amount} 
                        onChange={e => setAmount(formatNum(e.target.value))}
                        className="h-14 text-2xl font-black text-slate-800 bg-slate-50 border-slate-200 rounded-2xl placeholder:text-slate-300" placeholder="0"
                    />
                </div>
                <div>
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest block mb-1.5">Tujuan / Catatan (Opsional)</label>
                    <Input 
                        value={desc} onChange={e => setDesc(e.target.value)}
                        className="h-12 bg-slate-50 border-slate-200 rounded-2xl" placeholder="Contoh: Panti Asuhan, Masjid, dll"
                    />
                </div>
                <Button 
                    onClick={checkAndSaveAmal} disabled={isSubmitting}
                    className="w-full h-14 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-full shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin"/> : "KELUARKAN DANA AMAL"}
                </Button>
            </div>
        </Card>

        <div className="bg-white rounded-[32px] p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100">
            <h3 className="font-extrabold text-slate-800 text-sm mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-sky-500"/> Rincian Alokasi (Metode FIFO)
            </h3>
            <div className="bg-slate-50 rounded-[20px] p-1 border border-slate-100 max-h-72 overflow-y-auto hide-scrollbar">
                <style>{`.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
                {allocationDetails.length > 0 ? allocationDetails.map((inc, i) => (
                    <div key={inc.id || i} className={`p-4 bg-white rounded-[16px] mb-1.5 border border-slate-50 shadow-sm transition-opacity ${inc.status === 'Lunas' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-bold w-2/3 line-clamp-1 ${inc.status === 'Lunas' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{inc.displayDesc}</span>
                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{new Date(inc.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg mb-2">
                            <span className="text-[11px] font-medium text-slate-500 font-mono">{formatCurrency(inc.amount).replace('Rp ', '')} × {inc.pctUsed}%</span>
                            <span className="text-[11px] font-bold text-slate-700">= {formatCurrency(inc.allocatedAmount).split(',')[0]}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                            {inc.status === 'Lunas' && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-md font-extrabold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> TERCAPAI</span>}
                            {inc.status === 'Sebagian' && <span className="text-[10px] bg-amber-100 text-amber-600 px-2.5 py-1 rounded-md font-extrabold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> SISA: {formatCurrency(inc.remainingForThis).split(',')[0]}</span>}
                            {inc.status === 'Belum' && <span className="text-[10px] bg-slate-200 text-slate-500 px-2.5 py-1 rounded-md font-extrabold">BELUM TERCAPAI</span>}
                        </div>
                    </div>
                )) : (
                    <div className="text-center py-8"><p className="text-xs text-slate-400 font-medium">Belum ada data pemasukan untuk dialokasikan.</p></div>
                )}
            </div>
        </div>

        <div>
            <h3 className="font-extrabold text-slate-800 text-sm mb-4 px-2 flex items-center gap-2"><History className="w-4 h-4 text-slate-400"/> Riwayat Pengeluaran Amal</h3>
            <div className="space-y-3">
                {amalTxs.length > 0 ? amalTxs.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-[20px] shadow-sm border border-slate-100 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600"><HeartHandshake className="w-5 h-5"/></div>
                            <div>
                                <p className="font-bold text-slate-800 text-sm line-clamp-1">{t.description}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{new Date(t.date).toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                            </div>
                        </div>
                        <p className="font-extrabold text-emerald-600 text-sm">{formatCurrency(t.amount).split(',')[0]}</p>
                    </div>
                )) : (
                    <div className="text-center py-10 bg-slate-50 rounded-[24px] border border-dashed border-slate-200">
                        <HeartHandshake className="w-8 h-8 text-slate-300 mx-auto mb-2"/>
                        <p className="text-xs text-slate-400 font-medium">Belum ada catatan amal.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
              <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-t-8 border-emerald-500">
                  <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full transition-colors z-10"><X className="w-5 h-5"/></button>
                  <div className="w-16 h-16 mx-auto bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4"><PieChart className="w-8 h-8" /></div>
                  <h3 className="text-xl font-extrabold text-slate-800 mb-2">Target Persentase</h3>
                  <p className="text-xs text-slate-500 mb-6 leading-relaxed px-2">Berapa persen dari setiap pemasukan yang ingin dialokasikan untuk sedekah?</p>
                  <div className="flex items-center justify-center gap-2 mb-6">
                      <Input type="number" step="0.1" value={tempPct} onChange={e => setTempPct(e.target.value)} className="h-16 w-32 font-black text-3xl text-center bg-slate-50 border-slate-200 rounded-[20px]"/>
                      <span className="text-2xl font-black text-slate-400">%</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-[20px] p-4 text-left mb-6 cursor-pointer" onClick={() => setIsRetroactive(!isRetroactive)}>
                      <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center mt-0.5 border ${isRetroactive ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                              {isRetroactive && <CheckCircle2 className="w-4 h-4 text-white"/>}
                          </div>
                          <div>
                              <p className="text-sm font-bold text-slate-800">Ubah Data Masa Lalu</p>
                              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Centang ini jika Anda ingin sistem menghitung ulang alokasi dari <b>seluruh pemasukan lama</b> menggunakan persentase yang baru ini. Jika tidak dicentang, ini hanya berlaku untuk pemasukan baru.</p>
                          </div>
                      </div>
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold shadow-lg shadow-emerald-200 active:scale-95 transition-transform">SIMPAN PENGATURAN</Button>
              </div>
          </div>
      )}

      {excessData && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in zoom-in-95">
              <div className="bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl relative text-center border-t-8 border-amber-400">
                  <div className="w-16 h-16 mx-auto bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 mb-2">Kelebihan Sedekah</h3>
                  <p className="text-xs text-slate-600 mb-5 leading-relaxed px-1">
                      Anggaran tertunda Anda saat ini adalah <b>{formatCurrency(totalSisaAnggaran).split(',')[0]}</b>, namun Anda beramal sebesar <b>{formatCurrency(excessData.amount).split(',')[0]}</b>. 
                      Ada kelebihan <b>{formatCurrency(excessData.excess).split(',')[0]}</b>.
                  </p>
                  <p className="text-[11px] font-bold text-amber-600 mb-6 bg-amber-50 p-3 rounded-xl border border-amber-100">
                      Apakah kelebihan ini ingin dijadikan pemotong otomatis untuk pemasukan Anda di masa depan?
                  </p>
                  
                  <div className="space-y-3">
                      <Button onClick={() => executeSaveAmal(excessData.amount, excessData.desc, false, 0)} className="w-full h-12 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg active:scale-95 transition-transform">
                          YA, JADIKAN PEMOTONG MASA DEPAN
                      </Button>
                      <Button variant="ghost" onClick={() => executeSaveAmal(excessData.amount, excessData.desc, true, excessData.excess)} className="w-full h-12 rounded-full font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 text-xs transition-colors">
                          TIDAK, SAYA IKHLASKAN SEPENUHNYA
                      </Button>
                      <button onClick={() => setExcessData(null)} className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline pt-2">Batal & Kembali</button>
                  </div>
              </div>
          </div>
      )}

    </MobileLayout>
  );
}