import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, Transaction, InsertTransaction, Investment, InsertInvestment, 
  Target, InsertTarget, Category, InsertCategory, ForexAsset, Debt, Subscription 
} from "@shared/schema";

const getHeaders = () => {
    const email = localStorage.getItem("bilano_email");
    return { 
        "Content-Type": "application/json",
        "x-user-email": email || "guest" 
    };
};

const CACHE_TIME = 1000 * 60; // 1 Menit

// 1. USER
export function useUser() {
  const email = localStorage.getItem("bilano_email") || "";
  return useQuery({
    queryKey: ["/api/user", email],
    queryFn: async () => {
      const res = await fetch("/api/user", {
        headers: { "x-user-email": email }
      });
      if (!res.ok) throw new Error("Gagal mengambil data user");
      
      const data = await res.json();

      // =======================================================
      // VIP KETAT & ANTI BOCOR: HANYA EMAIL INI YANG JADI PRO
      // =======================================================
      const vipEmails = [
          "adrienfandra14@gmail.com",
          "bilanotech@gmail.com" // Tambahkan email VVIP lain di sini
      ]; 
      
      if (data) {
          // Jika dia VIP (atau jika dari database dia memang bayar)
          if (vipEmails.includes(email) || data.isPro) {
              data.isPro = true;
              data.plan = "pro";
              localStorage.setItem("bilano_pro", "true"); // Stempel PRO
          } 
          // Jika BUKAN VIP (Akun Biasa)
          else {
              data.isPro = false;
              data.plan = "free";
              localStorage.removeItem("bilano_pro"); // CABUT STEMPEL PRO DARI BROWSER!
          }
      }
      // =======================================================

      return data;
    }
  });
}

// 2. TRANSACTIONS
export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await fetch("/api/transactions", { headers: getHeaders() });
      return res.json();
    },
    staleTime: CACHE_TIME,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: InsertTransaction) => {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(tx),
      });
      if (!res.ok) throw new Error("Gagal buat transaksi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// 3. INVESTMENTS
export function useInvestments() {
  return useQuery<Investment[]>({
    queryKey: ["investments"],
    queryFn: async () => {
      const res = await fetch("/api/investments", { headers: getHeaders() });
      return res.json();
    },
    staleTime: CACHE_TIME,
  });
}

export function useBuyInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/investments/buy", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal beli investasi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useSellInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/investments/sell", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal jual investasi");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investments"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// 4. TARGET
export function useTarget() {
  return useQuery<Target | null>({
    queryKey: ["target"],
    queryFn: async () => {
      const res = await fetch("/api/target", { headers: getHeaders() });
      const data = await res.json();
      return data || null; 
    },
    staleTime: CACHE_TIME,
  });
}

export function useUpdateTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/target", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal update target");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["target"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

// 5. LAIN-LAIN
export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories", { headers: getHeaders() });
      return res.json();
    },
    staleTime: Infinity,
  });
}

export function useForexAssets() {
    return useQuery<ForexAsset[]>({
        queryKey: ["forex"],
        queryFn: async () => {
            const res = await fetch("/api/forex", { headers: getHeaders() });
            return res.json();
        },
        staleTime: CACHE_TIME,
    });
}

export function useDebts() {
    return useQuery<Debt[]>({
        queryKey: ["debts"],
        queryFn: async () => {
            const res = await fetch("/api/debts", { headers: getHeaders() });
            return res.json();
        },
        staleTime: CACHE_TIME,
    });
}

export function useSubscriptions() {
    return useQuery<Subscription[]>({
        queryKey: ["subscriptions"],
        queryFn: async () => {
            const res = await fetch("/api/subscriptions", { headers: getHeaders() });
            return res.json();
        },
        staleTime: CACHE_TIME,
    });
}

// --- BARU: HOOK UNTUK LAPORAN ---
export function useReportsData() {
    return useQuery({
        queryKey: ["reports"],
        queryFn: async () => {
            const res = await fetch("/api/reports/data", { headers: getHeaders() });
            if (!res.ok) throw new Error("Gagal ambil data laporan");
            return res.json();
        },
        staleTime: CACHE_TIME,
    });
}