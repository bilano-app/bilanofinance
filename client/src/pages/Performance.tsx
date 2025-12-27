import { MobileLayout } from "@/components/Layout";
import { Button, Card, StatCard } from "@/components/UIComponents";
import { useUser, useTransactions, useInvestments, useTarget, useResetMonth } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Award, RefreshCw } from "lucide-react";

export default function Performance() {
  const { data: user } = useUser();
  const { data: transactions } = useTransactions();
  const { data: investments } = useInvestments();
  const { data: target } = useTarget();
  const resetMonth = useResetMonth();

  const fcf = user?.cashBalance || 0;
  const investmentValue = investments?.reduce((acc, inv) => acc + (inv.quantity * inv.avgPrice), 0) || 0;
  const totalWealth = fcf + investmentValue;

  const totalIncome = transactions?.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) || 0;
  const totalExpense = transactions?.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0) || 0;

  // Chart Data
  const data = [
    { name: 'Income', amount: totalIncome / 100 },
    { name: 'Expense', amount: totalExpense / 100 },
  ];

  // Top Income Sources
  const incomeMap = new Map<string, number>();
  transactions?.filter(t => t.type === 'income').forEach(t => {
     incomeMap.set(t.category, (incomeMap.get(t.category) || 0) + t.amount);
  });
  const topIncome = Array.from(incomeMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Target Progress
  const targetProgress = target ? Math.min(100, (totalWealth / target.targetAmount) * 100) : 0;

  return (
    <MobileLayout title="Performance">
       <div className="space-y-6">
          
          {/* Progress to Target */}
          {target && (
             <Card className="bg-primary text-primary-foreground border-none">
                <div className="flex justify-between items-center mb-2">
                   <h3 className="font-bold">Goal Progress</h3>
                   <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{targetProgress.toFixed(1)}%</span>
                </div>
                <div className="h-4 bg-black/20 rounded-full overflow-hidden mb-2">
                   <div 
                     className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
                     style={{ width: `${targetProgress}%` }}
                   ></div>
                </div>
                <div className="flex justify-between text-xs opacity-80">
                   <span>Current: {formatCurrency(totalWealth / 100)}</span>
                   <span>Target: {formatCurrency(target.targetAmount / 100)}</span>
                </div>
             </Card>
          )}

          {/* Monthly Stats */}
          <div className="grid grid-cols-2 gap-4">
             <StatCard 
               label="Total Income" 
               value={formatCurrency(totalIncome / 100)} 
               type="positive"
             />
             <StatCard 
               label="Total Expense" 
               value={formatCurrency(totalExpense / 100)} 
               type="negative"
             />
          </div>

          {/* Chart */}
          <Card className="h-64 pt-6">
             <h3 className="font-bold mb-4 px-2">Cash Flow Overview</h3>
             <ResponsiveContainer width="100%" height="80%">
                <BarChart data={data}>
                   <XAxis dataKey="name" axisLine={false} tickLine={false} />
                   <YAxis hide />
                   <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                   />
                   <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                   </Bar>
                </BarChart>
             </ResponsiveContainer>
          </Card>

          {/* Top Sources */}
          {topIncome.length > 0 && (
            <Card>
               <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" /> Top Income Sources
               </h3>
               <div className="space-y-3">
                  {topIncome.map(([category, amount], i) => (
                     <div key={category} className="flex items-center justify-between pb-2 border-b border-border/50 last:border-0 last:pb-0">
                        <div className="flex items-center gap-3">
                           <span className="font-mono text-sm text-muted-foreground w-4">#{i + 1}</span>
                           <span className="font-medium">{category}</span>
                        </div>
                        <span className="font-bold text-emerald-600">{formatCurrency(amount / 100)}</span>
                     </div>
                  ))}
               </div>
            </Card>
          )}

          {/* Reset Month Button */}
          <div className="pt-4 pb-8">
             <Button 
               variant="outline" 
               className="w-full border-dashed border-2 hover:bg-muted"
               onClick={() => {
                  if(confirm("Are you sure? This will archive current month stats.")) {
                     resetMonth.mutate();
                  }
               }}
               isLoading={resetMonth.isPending}
             >
               <RefreshCw className="w-4 h-4 mr-2" /> Start Next Month
             </Button>
             <p className="text-xs text-center text-muted-foreground mt-2">
               Resets tracking for the new period. Balance remains.
             </p>
          </div>
       </div>
    </MobileLayout>
  );
}
