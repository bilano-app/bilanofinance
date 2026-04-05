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

// ============================================================================
// 🚀 JURUS SUPER REQUEST (ANTI VERCEL COLD START)
// ============================================================================
let globalFetchPromise: Promise<any> | null = null;
let globalFetchTime = 0;

const fetchSuperData = async () => {
    const now = Date.now();
    // Jika ada request dalam 3 detik terakhir, gabung ke request yang sama!
    // Ini mencegah 6 request menembak server Vercel secara brutal saat awal buka aplikasi.
    if (globalFetchPromise && (now - globalFetchTime < 3000)) {
        return globalFetchPromise;
    }

    globalFetchTime = now;
    globalFetchPromise = (async () => {
        const headers = getHeaders();
        
        // 1 Tembakan cerdas memborong 90% data aplikasi dari server!
        const [resReports, resTarget] = await Promise.all([
            fetch("/api/reports/data", { headers }),
            fetch("/api/target", { headers })
        ]);

        if (!resReports.ok) throw new Error("Gagal membangunkan server Vercel.");

        const reportsData = await resReports.json();
        const targetData = resTarget.ok ? await resTarget.json() : null;

        return {
            user: reportsData.user,
            transactions: reportsData.transactions,
            investments: reportsData.investments,
            debts: reportsData.debts,
            forexAssets: reportsData.forexAssets,
            subscriptions: reportsData.subscriptions,
            target: targetData
        };
    })();

    return globalFetchPromise;
};

// 1. USER
export function useUser() {
  const email = localStorage.getItem("bilano_email") || "";
  return useQuery({
    queryKey: ["user", email],
    queryFn: async () => {
      const allData = await fetchSuperData();
      const data = allData.user;

      // VIP KETAT & ANTI BOCOR: HANYA EMAIL INI YANG JADI PRO
      const vipEmails = [
          "adrienfandra14@gmail.com",
          "bilanotech@gmail.com" 
      ]; 
      
      if (data) {
          if (vipEmails.includes(email) || data.isPro) {
              data.isPro = true;
              data.plan = "pro";
              localStorage.setItem("bilano_pro", "true"); 
          } else {
              data.isPro = false;
              data.plan = "free";
              localStorage.removeItem("bilano_pro"); 
          }
      }
      return data;
    },
    // Auto-Retry cerdas jika server Vercel butuh waktu pemanasan
    retry: 3,
    retryDelay: 1500,
  });
}

// 2. TRANSACTIONS
export function useTransactions() {
  return useQuery<Transaction[]>({
    queryKey: ["transactions"],
    queryFn: async () => {
      const allData = await fetchSuperData();
      return allData.transactions;
    },
    staleTime: CACHE_TIME,
    retry: 3,
    retryDelay: 1500,
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
      const allData = await fetchSuperData();
      return allData.investments;
    },
    staleTime: CACHE_TIME,
    retry: 3,
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
      const allData = await fetchSuperData();
      return allData.target;
    },
    staleTime: CACHE_TIME,
    retry: 3,
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
    retry: 3,
  });
}

export function useForexAssets() {
    return useQuery<ForexAsset[]>({
        queryKey: ["forex"],
        queryFn: async () => {
            const allData = await fetchSuperData();
            return allData.forexAssets;
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

export function useDebts() {
    return useQuery<Debt[]>({
        queryKey: ["debts"],
        queryFn: async () => {
            const allData = await fetchSuperData();
            return allData.debts;
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

export function useSubscriptions() {
    return useQuery<Subscription[]>({
        queryKey: ["subscriptions"],
        queryFn: async () => {
            const allData = await fetchSuperData();
            return allData.subscriptions;
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

// --- HOOK UNTUK LAPORAN ---
export function useReportsData() {
    return useQuery({
        queryKey: ["reports"],
        queryFn: async () => {
            const allData = await fetchSuperData();
            return allData;
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}