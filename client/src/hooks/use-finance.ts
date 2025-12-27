import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// ============================================
// USER & BALANCE
// ============================================

export function useUser() {
  return useQuery({
    queryKey: [api.user.get.path],
    queryFn: async () => {
      const res = await fetch(api.user.get.path);
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error("Failed to fetch user");
      }
      return api.user.get.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateBalance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch(api.user.updateBalance.path, {
        method: api.user.updateBalance.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed to update balance");
      return api.user.updateBalance.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.user.get.path] });
      toast({ title: "Success", description: "Balance updated successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// TRANSACTIONS
// ============================================

export function useTransactions() {
  return useQuery({
    queryKey: [api.transactions.list.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.list.path);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.transactions.create.input>) => {
      const res = await fetch(api.transactions.create.path, {
        method: api.transactions.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create transaction");
      }
      return api.transactions.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.transactions.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.user.get.path] }); // Balance changes
      toast({ title: "Success", description: "Transaction recorded" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// INVESTMENTS
// ============================================

export function useInvestments() {
  return useQuery({
    queryKey: [api.investments.list.path],
    queryFn: async () => {
      const res = await fetch(api.investments.list.path);
      if (!res.ok) throw new Error("Failed to fetch investments");
      return api.investments.list.responses[200].parse(await res.json());
    },
  });
}

export function useBuyInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.investments.buy.input>) => {
      const res = await fetch(api.investments.buy.path, {
        method: api.investments.buy.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to buy investment");
      }
      return api.investments.buy.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.investments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.user.get.path] });
      toast({ title: "Purchase Successful", description: "Investment added to your portfolio" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useSellInvestment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.investments.sell.input>) => {
      const res = await fetch(api.investments.sell.path, {
        method: api.investments.sell.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to sell investment");
      }
      return api.investments.sell.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.investments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.user.get.path] });
      toast({ title: "Sale Successful", description: "Funds added to your balance" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ============================================
// TARGETS
// ============================================

export function useTarget() {
  return useQuery({
    queryKey: [api.target.get.path],
    queryFn: async () => {
      const res = await fetch(api.target.get.path);
      if (!res.ok) throw new Error("Failed to fetch target");
      return api.target.get.responses[200].parse(await res.json());
    },
  });
}

export function useSetTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: z.infer<typeof api.target.set.input>) => {
      const res = await fetch(api.target.set.path, {
        method: api.target.set.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to set target");
      return api.target.set.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.target.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.user.get.path] });
      toast({ title: "Target Set", description: "Your financial goals have been updated" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

export function useResetMonth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.target.resetMonth.path, {
        method: api.target.resetMonth.method,
      });
      if (!res.ok) throw new Error("Failed to reset month");
      return api.target.resetMonth.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.target.get.path] });
      toast({ title: "New Month Started", description: "Good luck with your goals this month!" });
    },
  });
}
