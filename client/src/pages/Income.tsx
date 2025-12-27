import { useState } from "react";
import { MobileLayout } from "@/components/Layout";
import { Button, Card, CurrencyInput, Input } from "@/components/UIComponents";
import { useCreateTransaction } from "@/hooks/use-finance";
import { useLocation } from "wouter";
import { Plus, Tag, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

export default function Income() {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [, setLocation] = useLocation();
  
  const createTx = useCreateTransaction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    await createTx.mutateAsync({
      type: "income",
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      category: category,
      description: "Income entry",
    });
    
    setLocation("/");
  };

  const categories = ["Salary", "Freelance", "Gift", "Investment Return", "Bonus"];

  return (
    <MobileLayout title="Add Income" showBack>
      <div className="space-y-6 mt-4">
        
        {/* Header Icon */}
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 animate-in zoom-in duration-300">
             <DollarSign className="w-10 h-10" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="space-y-6 border-emerald-100 dark:border-emerald-900/30 shadow-lg shadow-emerald-500/5">
            <CurrencyInput 
              label="Amount Received"
              value={amount}
              onChange={setAmount}
              placeholder="0.00"
            />

            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground ml-1 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Category
              </label>
              
              {!isCustomCategory ? (
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`p-3 rounded-xl text-sm font-medium transition-all ${
                        category === cat 
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" 
                          : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => { setIsCustomCategory(true); setCategory(""); }}
                    className="p-3 rounded-xl text-sm font-medium bg-muted/50 border border-dashed border-border hover:bg-muted text-muted-foreground flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" /> Custom
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Enter source name..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => setIsCustomCategory(false)}
                    className="px-4"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Button 
            type="submit" 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
            disabled={!amount || !category}
            isLoading={createTx.isPending}
          >
            Add Income
          </Button>
        </form>
      </div>
    </MobileLayout>
  );
}
