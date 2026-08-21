import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Card } from "@/components/UIComponents";
import { useTransactions } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { ArrowUpCircle, ArrowDownCircle, Filter, CalendarDays, Loader2 } from "lucide-react";
import { useLocation } from "wouter";

export default function TransactionDetail() {
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialType = searchParams.get("type") || "all";
  const [filterType, setFilterType] = useState(initialType);
  
  const { data: transactions = [], isLoading } = useTransactions();

  const filteredByType = transactions.filter(t => 
    filterType === 'all' ? true : t.type === filterType
  );

  const groupedTransactions = filteredByType.reduce((groups, tx) => {
    const date = new Date(tx.date);
    const monthYear = date.toLocaleDateString("id-ID", { month: 'long', year: 'numeric' });
    
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(tx);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const sortedMonthKeys = Object.keys(groupedTransactions); 

  const totalInList = filteredByType.reduce((acc, t) => acc + t.amount, 0);

  // === LOADING SCREEN KUSTOM BILANO ===
  if (isLoading) {
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
    <MobileLayout title="Riwayat Transaksi" showBack>
      <div className="space-y-4 mt-2">
        
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm sticky top-0 z-10">
           <div className="flex justify-between items-center">
               <span className="text-sm text-slate-500 font-medium">Total Terfilter:</span>
               <span className={`text-xl font-bold ${filterType === 'expense' ? 'text-rose-600' : filterType === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                   {formatCurrency(totalInList)}
               </span>
           </div>
           
           <div className="flex p-1 bg-slate-100 rounded-xl mt-3">
             {['all', 'income', 'expense'].map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${filterType === type ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {type === 'all' ? 'Semua' : type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                </button>
             ))}
           </div>
        </div>

        <div className="space-y-6 pb-32">
           {sortedMonthKeys.length === 0 ? (
             <div className="text-center py-16 space-y-3 opacity-50">
                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto">
                    <Filter className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm font-medium">Belum ada transaksi.</p>
             </div>
           ) : (
             sortedMonthKeys.map((monthKey) => (
               <div key={monthKey} className="space-y-2">
                  <div className="flex items-center gap-2 px-2 pt-2 pb-1 bg-slate-50/90 backdrop-blur-sm rounded-lg sticky top-[130px] z-0 shadow-sm border-b border-slate-100">
                     <CalendarDays className="w-4 h-4 text-slate-500" />
                     <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wide">{monthKey}</h3>
                  </div>

                  {groupedTransactions[monthKey].map((t) => {
                     const isIncome = t.type === 'income';
                     return (
                       <Card key={t.id} className="flex justify-between items-center p-4 border-l-4 border-l-transparent hover:border-l-primary transition-all shadow-sm bg-white">
                          <div className="flex items-center gap-4">
                             <div className={`p-2.5 rounded-full ${isIncome ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                {isIncome ? <ArrowUpCircle className="w-5 h-5"/> : <ArrowDownCircle className="w-5 h-5"/>}
                             </div>
                             <div>
                                <p className="font-bold text-sm text-slate-800">{t.category}</p>
                                <p className="text-xs text-slate-500">{t.description || "Tanpa keterangan"}</p>
                                <p className="text-[10px] text-slate-400 mt-1">
                                   {new Date(t.date).toLocaleDateString("id-ID", { day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                             </div>
                          </div>
                          <p className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                       </Card>
                     );
                  })}
               </div>
             ))
           )}
        </div>

        <div className="fixed bottom-6 right-6 flex flex-col gap-3 animate-in slide-in-from-right duration-500 z-50">
            <button 
              onClick={() => setLocation('/income')}
              className="bg-emerald-600 text-white w-14 h-14 rounded-full shadow-lg shadow-emerald-600/30 hover:scale-105 transition-transform flex items-center justify-center"
              title="Catat Pemasukan"
            >
               <ArrowUpCircle className="w-7 h-7" />
            </button>
            <button 
              onClick={() => setLocation('/expense')}
              className="bg-rose-600 text-white w-14 h-14 rounded-full shadow-lg shadow-rose-600/30 hover:scale-105 transition-transform flex items-center justify-center"
              title="Catat Pengeluaran"
            >
               <ArrowDownCircle className="w-7 h-7" />
            </button>
        </div>

      </div>
    </MobileLayout>
  );
}