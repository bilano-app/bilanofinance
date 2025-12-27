import { MobileLayout } from "@/components/Layout";
import { Button, Card, StatCard } from "@/components/UIComponents";
import { useUser, useTarget } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data: user, isLoading } = useUser();
  const { data: target } = useTarget();

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </MobileLayout>
    );
  }

  const fcf = user?.cashBalance || 0;
  
  return (
    <MobileLayout>
      {/* Hero Section */}
      <section className="mb-8">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-gradient-to-br from-primary to-emerald-600 rounded-[2rem] p-8 text-white shadow-xl shadow-primary/30 relative overflow-hidden">
            {/* Abstract Background Decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2 text-white/80">
                <Wallet className="w-5 h-5" />
                <span className="font-medium text-sm tracking-wide uppercase">Free Cash Flow</span>
              </div>
              <h2 className="text-5xl font-display font-bold tracking-tight mb-2">
                {formatCurrency(fcf / 100)}
              </h2>
              <p className="text-white/70 text-sm font-medium">Available for spending or investing</p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Main Actions Grid */}
      <section className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/income" className="col-span-1">
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
              <ArrowUpCircle className="w-6 h-6" />
            </div>
            <span className="font-bold text-emerald-900 dark:text-emerald-100">Income</span>
          </div>
        </Link>
        
        <Link href="/expense" className="col-span-1">
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 p-6 rounded-3xl flex flex-col items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
              <ArrowDownCircle className="w-6 h-6" />
            </div>
            <span className="font-bold text-rose-900 dark:text-rose-100">Expense</span>
          </div>
        </Link>

        <Link href="/investment" className="col-span-2">
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 p-6 rounded-3xl flex items-center justify-between hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shadow-sm group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-blue-900 dark:text-blue-100 text-lg">Investments</span>
                <span className="text-sm text-blue-700 dark:text-blue-300">Manage portfolio</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          </div>
        </Link>
      </section>

      {/* Goal Summary */}
      <section className="mb-8">
        <h3 className="text-lg font-bold font-display mb-4 px-2">Goals & Targets</h3>
        <Card className="bg-gradient-to-br from-card to-secondary/50">
          <div className="flex justify-between items-center mb-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600">
                 <PiggyBank className="w-5 h-5" />
               </div>
               <div>
                 <p className="font-bold">Monthly Target</p>
                 <p className="text-xs text-muted-foreground">{target ? `${target.durationMonths} month plan` : "Not set"}</p>
               </div>
             </div>
             <Link href="/target">
               <Button variant="outline" className="h-10 px-4 text-xs">Manage</Button>
             </Link>
          </div>
          
          {target ? (
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-bold font-display">{formatCurrency(target.targetAmount / 100)}</span>
                <span className="text-sm font-medium text-muted-foreground mb-1">Goal</span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                {/* A simple progress bar visualization - real math in Performance page */}
                <div className="h-full bg-primary w-[35%] rounded-full"></div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground text-sm mb-4">No financial target set yet.</p>
              <Link href="/target">
                <Button className="w-full">Set a Target</Button>
              </Link>
            </div>
          )}
        </Card>
      </section>
      
      <div className="px-2 pb-4">
        <Link href="/performance">
           <Button variant="secondary" className="w-full">View Detailed Performance</Button>
        </Link>
      </div>

    </MobileLayout>
  );
}
