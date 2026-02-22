import { MobileLayout } from "@/components/Layout";
import { Card } from "@/components/UIComponents";
import { useTransactions } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

export default function InvestmentDetail() {
  const { data: transactions = [] } = useTransactions();

  const realizedItems = transactions.filter(t => 
      t.category === 'Investasi' && t.description?.includes("| Modal:")
  );

  return (
    <MobileLayout title="Riwayat Realisasi Aset" showBack>
      <div className="space-y-4 mt-2 pb-20">
        
        {realizedItems.length === 0 ? (
            <div className="text-center py-20 text-slate-400 italic">
                Belum ada aset yang dijual (Realisasi).
            </div>
        ) : (
            realizedItems.map((t) => {
                const isProfit = t.type === 'income';
                
                const nameMatch = t.description?.match(/Realized (.*?) \|/);
                const modalMatch = t.description?.match(/Modal:(\d+)/);
                
                const assetName = nameMatch ? nameMatch[1] : "Aset Investasi";
                const modalBeli = modalMatch ? parseInt(modalMatch[1]) : 0;
                
                // FIX: HAPUS / 100 DISINI AGAR NILAI RUPIAH AKURAT
                const profitOrLoss = t.amount; 
                const hargaJual = isProfit 
                    ? modalBeli + profitOrLoss 
                    : modalBeli - profitOrLoss;

                const percent = modalBeli > 0 ? (profitOrLoss / modalBeli) * 100 : 0;

                return (
                    <Card key={t.id} className="p-4 border-l-4 border-l-transparent hover:border-l-slate-300 transition-all">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{assetName}</h3>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Status: Terjual</p>
                            </div>
                            <div className={`text-right ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                                <span className="font-bold text-lg flex items-center justify-end gap-1">
                                    {isProfit ? <TrendingUp className="w-4 h-4"/> : <TrendingDown className="w-4 h-4"/>}
                                    {isProfit ? '+' : '-'}{formatCurrency(profitOrLoss)}
                                </span>
                                <span className="text-xs font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                                    {isProfit ? '+' : '-'}{percent.toFixed(2)}%
                                </span>
                            </div>
                        </div>

                        {/* Rincian Modal & Jual */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs space-y-1">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Modal Beli:</span>
                                <span className="font-medium text-slate-700">{formatCurrency(modalBeli)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Harga Jual:</span>
                                <span className="font-bold text-slate-800">{formatCurrency(hargaJual)}</span>
                            </div>
                        </div>
                    </Card>
                );
            })
        )}

      </div>
    </MobileLayout>
  );
}