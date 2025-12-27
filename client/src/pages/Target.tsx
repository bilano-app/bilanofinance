import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Card, CurrencyInput, Input } from "@/components/UIComponents";
import { useTarget, useSetTarget, useUpdateBalance } from "@/hooks/use-finance";
import { formatCurrency } from "@/lib/utils";
import { Target as TargetIcon, Calendar } from "lucide-react";

export default function Target() {
  const { data: target } = useTarget();
  const setTarget = useSetTarget();
  const updateBalance = useUpdateBalance();

  const [targetAmount, setTargetAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [initialCash, setInitialCash] = useState("");

  useEffect(() => {
    if (target) {
      setTargetAmount((target.targetAmount / 100).toString());
      setDuration(target.durationMonths.toString());
    }
  }, [target]);

  const monthlyRequired = (parseFloat(targetAmount || "0") * 100) / (parseInt(duration || "1"));

  const handleSave = async () => {
    if (!targetAmount || !duration) return;
    
    // Set Target
    await setTarget.mutateAsync({
      targetAmount: Math.round(parseFloat(targetAmount) * 100),
      durationMonths: parseInt(duration),
    });

    // Optionally Add Initial Cash if provided
    if (initialCash) {
       await updateBalance.mutateAsync(Math.round(parseFloat(initialCash) * 100));
       setInitialCash("");
    }
  };

  return (
    <MobileLayout title="Set Target" showBack>
      <div className="space-y-6 mt-4">
        
        <div className="flex items-center gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
           <div className="p-3 bg-primary rounded-xl text-white">
              <TargetIcon className="w-6 h-6" />
           </div>
           <div>
              <h3 className="font-bold text-primary">Financial Goal</h3>
              <p className="text-xs text-muted-foreground">Define what you want to achieve.</p>
           </div>
        </div>

        <Card className="space-y-6">
           <CurrencyInput 
             label="Total Target Amount"
             value={targetAmount}
             onChange={setTargetAmount}
           />
           
           <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-2">
                 <Calendar className="w-4 h-4" /> Duration (Months)
              </label>
              <Input 
                type="number"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                placeholder="e.g. 12"
              />
           </div>

           {!target && (
              <div className="pt-4 border-t border-border">
                <CurrencyInput 
                    label="Add Starting Cash (Optional)"
                    value={initialCash}
                    onChange={setInitialCash}
                    placeholder="One-time deposit"
                />
                <p className="text-xs text-muted-foreground mt-2 ml-1">This will be added to your current Free Cash Flow.</p>
              </div>
           )}
        </Card>

        {targetAmount && duration && parseInt(duration) > 0 && (
           <div className="bg-card p-4 rounded-2xl border border-border/50 text-center space-y-1 shadow-sm">
              <p className="text-sm text-muted-foreground">Required Monthly Savings</p>
              <p className="text-3xl font-display font-bold text-primary">
                 {formatCurrency(monthlyRequired / 100)}<span className="text-sm font-medium text-muted-foreground">/mo</span>
              </p>
           </div>
        )}

        <Button 
          className="w-full" 
          onClick={handleSave}
          disabled={!targetAmount || !duration}
          isLoading={setTarget.isPending || updateBalance.isPending}
        >
          {target ? "Update Target" : "Set Financial Goal"}
        </Button>

      </div>
    </MobileLayout>
  );
}
