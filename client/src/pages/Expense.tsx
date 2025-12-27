import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Card, CurrencyInput, Input } from "@/components/UIComponents";
import { useCreateTransaction, useUser } from "@/hooks/use-finance";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";
import { ShoppingBag, FileText } from "lucide-react";

export default function Expense() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const createTx = useCreateTransaction();

  const currentBalance = user?.cashBalance || 0;
  const expenseAmount = Math.round(parseFloat(amount || "0") * 100);
  const isInsufficient = expenseAmount > currentBalance;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || isInsufficient) return;

    await createTx.mutateAsync({
      type: "expense",
      amount: expenseAmount,
      category: "General", // Simple app, categorization implicit in description for now or extended later
      description: description,
    });
    
    setLocation("/");
  };

  return (
    <MobileLayout title="Add Expense" showBack>
      <div className="space-y-6 mt-4">
        
        {/* Available Balance Display */}
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Available Funds</p>
          <div className="text-3xl font-display font-bold text-foreground">
             {formatCurrency(currentBalance / 100)}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="space-y-6 border-rose-100 dark:border-rose-900/30 shadow-lg shadow-rose-500/5">
            <div className="space-y-1">
              <CurrencyInput 
                label="Expense Amount"
                value={amount}
                onChange={setAmount}
                placeholder="0.00"
              />
              {isInsufficient && (
                <p className="text-destructive text-sm font-medium animate-pulse ml-1">
                  Insufficient funds! Max: {formatCurrency(currentBalance / 100)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Description
              </label>
              <Input 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was this for?"
              />
            </div>
          </Card>

          <Button 
            type="submit" 
            variant="danger"
            className="w-full bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200"
            disabled={!amount || !description || isInsufficient}
            isLoading={createTx.isPending}
          >
            Record Expense
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
