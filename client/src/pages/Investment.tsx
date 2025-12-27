import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Card, CurrencyInput, Input, StatCard } from "@/components/UIComponents";
import { useBuyInvestment, useSellInvestment, useInvestments, useUser } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, Layers } from "lucide-react";

export default function Investment() {
  const { data: investments } = useInvestments();
  const { data: user } = useUser();
  const buy = useBuyInvestment();
  const sell = useSellInvestment();

  // Buy State
  const [buySymbol, setBuySymbol] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [buyQty, setBuyQty] = useState("");

  // Sell State
  const [sellSymbol, setSellSymbol] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [sellQty, setSellQty] = useState("");

  const handleBuy = async () => {
    if (!buySymbol || !buyPrice || !buyQty) return;
    await buy.mutateAsync({
      symbol: buySymbol.toUpperCase(),
      price: Math.round(parseFloat(buyPrice) * 100),
      quantity: parseInt(buyQty),
    });
    setBuySymbol(""); setBuyPrice(""); setBuyQty("");
  };

  const handleSell = async () => {
    if (!sellSymbol || !sellPrice || !sellQty) return;
    await sell.mutateAsync({
      symbol: sellSymbol,
      price: Math.round(parseFloat(sellPrice) * 100),
      quantity: parseInt(sellQty),
    });
    setSellSymbol(""); setSellPrice(""); setSellQty("");
  };

  const totalPortfolioValue = investments?.reduce((acc, inv) => acc + (inv.quantity * inv.avgPrice), 0) || 0;

  return (
    <MobileLayout title="Investments">
      <div className="space-y-6">
        
        {/* Portfolio Summary */}
        <StatCard 
          label="Portfolio Value (At Cost)" 
          value={formatCurrency(totalPortfolioValue / 100)} 
          type="brand"
          icon={<Layers className="w-5 h-5 text-primary-foreground/70" />}
        />

        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1 rounded-2xl h-14">
            <TabsTrigger value="buy" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm h-12 font-semibold">
              <TrendingUp className="w-4 h-4 mr-2 text-emerald-600" /> Buy
            </TabsTrigger>
            <TabsTrigger value="sell" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm h-12 font-semibold">
              <TrendingDown className="w-4 h-4 mr-2 text-rose-600" /> Sell
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy">
            <Card className="space-y-4">
              <div className="mb-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 text-sm text-emerald-800 flex justify-between">
                 <span>Available Cash:</span>
                 <span className="font-bold">{formatCurrency((user?.cashBalance || 0) / 100)}</span>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Asset Symbol</label>
                <Input 
                  placeholder="e.g. AAPL, BTC" 
                  value={buySymbol} 
                  onChange={e => setBuySymbol(e.target.value)}
                  className="uppercase"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <CurrencyInput 
                  label="Price per Unit"
                  value={buyPrice}
                  onChange={setBuyPrice}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">Quantity</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={buyQty}
                    onChange={e => setBuyQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                 <div className="flex justify-between text-sm mb-4 px-1">
                    <span className="text-muted-foreground">Total Cost:</span>
                    <span className="font-bold">{formatCurrency((parseFloat(buyPrice || "0") * parseInt(buyQty || "0")))}</span>
                 </div>
                 <Button 
                   onClick={handleBuy} 
                   className="w-full bg-emerald-600 hover:bg-emerald-700"
                   isLoading={buy.isPending}
                   disabled={!buySymbol || !buyPrice || !buyQty}
                 >
                   Execute Buy Order
                 </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sell">
             <Card className="space-y-4">
               <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Select Asset</label>
                <Select onValueChange={setSellSymbol} value={sellSymbol}>
                  <SelectTrigger className="w-full h-12 rounded-xl bg-muted/50 border-transparent">
                    <SelectValue placeholder="Select from portfolio..." />
                  </SelectTrigger>
                  <SelectContent>
                    {investments?.map(inv => (
                      <SelectItem key={inv.id} value={inv.symbol}>
                        {inv.symbol} ({inv.quantity} units)
                      </SelectItem>
                    ))}
                    {(!investments || investments.length === 0) && (
                      <SelectItem value="none" disabled>No assets owned</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <CurrencyInput 
                  label="Sell Price"
                  value={sellPrice}
                  onChange={setSellPrice}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground ml-1">Quantity</label>
                  <Input 
                    type="number"
                    placeholder="0"
                    value={sellQty}
                    onChange={e => setSellQty(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                 <div className="flex justify-between text-sm mb-4 px-1">
                    <span className="text-muted-foreground">Est. Proceeds:</span>
                    <span className="font-bold">{formatCurrency((parseFloat(sellPrice || "0") * parseInt(sellQty || "0")))}</span>
                 </div>
                 <Button 
                   variant="danger"
                   onClick={handleSell} 
                   className="w-full"
                   isLoading={sell.isPending}
                   disabled={!sellSymbol || !sellPrice || !sellQty}
                 >
                   Execute Sell Order
                 </Button>
              </div>
             </Card>
          </TabsContent>
        </Tabs>

        <div className="space-y-3">
          <h3 className="font-display font-bold px-1">Your Assets</h3>
          {investments?.map(inv => (
             <div key={inv.id} className="bg-card border border-border/50 p-4 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs">
                      {inv.symbol.substring(0, 2)}
                   </div>
                   <div>
                      <p className="font-bold">{inv.symbol}</p>
                      <p className="text-xs text-muted-foreground">{inv.quantity} units @ {formatCurrency(inv.avgPrice / 100)}</p>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-bold text-emerald-600">{formatCurrency((inv.quantity * inv.avgPrice) / 100)}</p>
                   <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total Cost</p>
                </div>
             </div>
          ))}
          {(!investments || investments.length === 0) && (
             <p className="text-center text-muted-foreground py-8 text-sm">No investments yet.</p>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
