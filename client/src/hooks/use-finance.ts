import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  User, Transaction, InsertTransaction, Investment, InsertInvestment, 
  Target, InsertTarget, Category, InsertCategory, ForexAsset, Debt, Subscription 
} from "@shared/schema";

import { isTrialMode, getTrialData } from "@/lib/trial-data";

const getHeaders = (emailOverride?: string) => {
    const email = emailOverride || (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "guest";
    return { 
        "Content-Type": "application/json",
        "x-user-email": email.trim().toLowerCase() 
    };
};

const CACHE_TIME = 1000 * 60; // 1 Menit

let globalFetchPromise: Promise<any> | null = null;
let globalFetchTime = 0;
let globalFetchEmail = "";

export const fetchSuperData = async (forceEmail?: string) => {
    const email = (forceEmail || (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "guest").trim().toLowerCase();

    // Jika dalam mode uji coba browser (Trial Mode) dan BUKAN user berakun
    if (isTrialMode()) {
        const trial = getTrialData();
        return {
            user: trial.user,
            transactions: trial.transactions || [],
            investments: trial.investments || [],
            debts: trial.debts || [],
            forexAssets: trial.forexAssets || [],
            subscriptions: trial.subscriptions || [],
            target: trial.target,
            retained: trial.retained || [],
        };
    }

    const now = Date.now();
    if (globalFetchPromise && (now - globalFetchTime < 3000) && globalFetchEmail === email) {
        return globalFetchPromise;
    }

    globalFetchTime = now;
    globalFetchEmail = email;
    globalFetchPromise = (async () => {
        const headers = getHeaders(email);
        const [resReports, resTarget] = await Promise.all([
            fetch("/api/reports/data", { headers }),
            fetch("/api/target", { headers })
        ]);

        if (!resReports.ok) throw new Error("Gagal memuat data dari server.");

        const reportsData = await resReports.json();
        const targetData = resTarget.ok ? await resTarget.json() : null;

        return {
            user: reportsData.user,
            transactions: reportsData.transactions || [],
            investments: reportsData.investments || [],
            debts: reportsData.debts || [],
            forexAssets: reportsData.forexAssets || [],
            subscriptions: reportsData.subscriptions || [],
            retained: reportsData.retained || [],
            target: targetData
        };
    })();

    return globalFetchPromise;
};

import { getTrialInfo } from "@/lib/trial-manager";

export type AccessTier = "free" | "premium";

export function getAccessTier(user?: any): AccessTier {
  if (isTrialMode()) return "premium";

  const savedTier = typeof window !== "undefined" ? localStorage.getItem("bilano_access_tier") : null;
  const explicitTier = user?.plan || savedTier;

  if (explicitTier === "premium" || explicitTier === "standard") return "premium";
  if (user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true")) return "premium";

  // 👑 Akses Penuh 7 Hari Trial untuk seluruh fitur premium
  const trial = getTrialInfo(user);
  if (trial.isTrialActive) return "premium";

  if (explicitTier === "free") return "free";
  return "free";
}

export function hasAccess(user: any, requiredTier: AccessTier): boolean {
  const currentTier = getAccessTier(user);
  if (requiredTier === "free") return true;
  return currentTier === "premium";
}

export function isPremiumFeatureLocked(user: any): boolean {
  return !hasAccess(user, "premium");
}

export function useUser() {
  const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
  const cleanEmail = email.trim().toLowerCase();
  return useQuery({
    queryKey: ["user", cleanEmail],
    queryFn: async () => {
      const allData = await fetchSuperData(cleanEmail);
      const data = allData.user;
      const vipEmails = ["adrienfandra14@gmail.com", "bilanotech@gmail.com"]; 
      
      if (data) {
          let isReallyPro = false;
          if (vipEmails.includes(cleanEmail)) {
              isReallyPro = true;
          } else if (data.isPro) {
              if (data.proValidUntil) {
                  const validUntilTime = new Date(data.proValidUntil).getTime();
                  if (Date.now() <= validUntilTime) isReallyPro = true; 
              } else {
                  isReallyPro = true;
              }
          }

          if (isReallyPro) {
              data.isPro = true;
              data.plan = "premium";
              if (typeof window !== "undefined") {
                  localStorage.setItem("bilano_pro", "true");
                  localStorage.setItem("bilano_access_tier", "premium");
              }
          } else {
              data.isPro = false;
              data.plan = "free";
              if (typeof window !== "undefined") {
                  localStorage.removeItem("bilano_pro");
                  localStorage.setItem("bilano_access_tier", "free");
              }
          }
      }
      return data;
    },
    retry: 3,
    retryDelay: 1500,
  });
}

export function useTransactions() {
  const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
  const cleanEmail = email.trim().toLowerCase();
  return useQuery<Transaction[]>({
    queryKey: ["transactions", cleanEmail],
    queryFn: async () => {
      const allData = await fetchSuperData(cleanEmail);
      return allData.transactions || [];
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
      const res = await fetch("/api/transactions", { method: "POST", headers: getHeaders(), body: JSON.stringify(tx) });
      if (!res.ok) throw new Error("Gagal buat transaksi");
      return res.json();
    },
    onSuccess: () => {
      globalFetchPromise = null;
      globalFetchTime = 0;
      globalFetchEmail = "";
      queryClient.invalidateQueries();
    },
  });
}

export function useInvestments() {
  const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
  const cleanEmail = email.trim().toLowerCase();
  return useQuery<Investment[]>({
    queryKey: ["investments", cleanEmail],
    queryFn: async () => {
      const allData = await fetchSuperData(cleanEmail);
      return allData.investments || [];
    },
    staleTime: CACHE_TIME,
    retry: 3,
  });
}

export function useBuyInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/investments/buy", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Gagal beli investasi");
      return res.json();
    },
    onSuccess: () => {
      globalFetchPromise = null;
      globalFetchTime = 0;
      globalFetchEmail = "";
      queryClient.invalidateQueries();
    },
  });
}

export function useSellInvestment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/investments/sell", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Gagal jual investasi");
      return res.json();
    },
    onSuccess: () => {
      globalFetchPromise = null;
      globalFetchTime = 0;
      globalFetchEmail = "";
      queryClient.invalidateQueries();
    },
  });
}

export function useTarget() {
  const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
  const cleanEmail = email.trim().toLowerCase();
  return useQuery<Target | null>({
    queryKey: ["target", cleanEmail],
    queryFn: async () => {
      const allData = await fetchSuperData(cleanEmail);
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
      const res = await fetch("/api/target", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Gagal update target");
      return res.json();
    },
    onSuccess: () => {
      globalFetchPromise = null;
      globalFetchTime = 0;
      globalFetchEmail = "";
      queryClient.invalidateQueries();
    },
  });
}

export function useCategories() {
  const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
  const cleanEmail = email.trim().toLowerCase();
  return useQuery<Category[]>({
    queryKey: ["categories", cleanEmail],
    queryFn: async () => {
      const res = await fetch("/api/categories", { headers: getHeaders(cleanEmail) });
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: CACHE_TIME,
    retry: 3,
  });
}

export function useForexAssets() {
    const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
    const cleanEmail = email.trim().toLowerCase();
    return useQuery<ForexAsset[]>({
        queryKey: ["forex", cleanEmail],
        queryFn: async () => {
            const allData = await fetchSuperData(cleanEmail);
            return allData.forexAssets || [];
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

export function useDebts() {
    const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
    const cleanEmail = email.trim().toLowerCase();
    return useQuery<Debt[]>({
        queryKey: ["debts", cleanEmail],
        queryFn: async () => {
            const allData = await fetchSuperData(cleanEmail);
            return allData.debts || [];
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

export function useSubscriptions() {
    const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
    const cleanEmail = email.trim().toLowerCase();
    return useQuery<Subscription[]>({
        queryKey: ["subscriptions", cleanEmail],
        queryFn: async () => {
            const allData = await fetchSuperData(cleanEmail);
            return allData.subscriptions || [];
        },
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

export function useUndoTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const email = typeof window !== "undefined" ? localStorage.getItem("bilano_email") || "guest" : "guest";
      const res = await fetch("/api/transactions/undo", { method: "POST", headers: { "Content-Type": "application/json", "x-user-email": email.trim().toLowerCase() } });
      if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membatalkan transaksi");
      }
      return res.json();
    },
    onSuccess: () => {
      globalFetchPromise = null;
      globalFetchTime = 0;
      globalFetchEmail = "";
      queryClient.invalidateQueries();
    },
  });
}

export function useReportsData() {
    const email = (typeof window !== "undefined" ? localStorage.getItem("bilano_email") : "") || "";
    const cleanEmail = email.trim().toLowerCase();
    return useQuery({
        queryKey: ["reports", cleanEmail],
        queryFn: async () => await fetchSuperData(cleanEmail),
        staleTime: CACHE_TIME,
        retry: 3,
    });
}

// 🚀 HOOK PENGAMBILAN HARGA LIVE
export function useLiveQuotes(symbols: string[]) {
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  return useQuery({
    queryKey: ['liveQuotes', symbols.join(',')],
    queryFn: async () => {
      if (!symbols || symbols.length === 0) return {};
      const res = await fetch('/api/finance/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-email': currentUserEmail }, body: JSON.stringify({ symbols }) });
      if (!res.ok) throw new Error('Gagal mengambil data harga live');
      const json = await res.json();
      return json.data || {}; 
    },
    enabled: symbols.length > 0 && !!currentUserEmail,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
    staleTime: 15000,
  });
}

// 🚀 HOOK BARU: MENGAMBIL DATA CHART HARIAN
export function useHistoricalQuotes(symbols: string[], range: string = '5y') {
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  const refreshInterval = range === '1d' ? 15000 : range === '5d' ? 30000 : range === '1mo' ? 60000 : range === '3mo' ? 120000 : range === '1y' ? 300000 : 600000;
  const staleTime = range === '1d' ? 15000 : range === '5d' ? 30000 : 60000;
  return useQuery({
    queryKey: ['historicalQuotes', symbols.join(','), range],
    queryFn: async () => {
      if (!symbols || symbols.length === 0) return {};
      const res = await fetch('/api/finance/history', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-email': currentUserEmail }, body: JSON.stringify({ symbols, range }) });
      if (!res.ok) throw new Error('Gagal mengambil data chart historis');
      const json = await res.json();
      return json.data || {}; 
    },
    enabled: symbols.length > 0 && !!currentUserEmail,
    refetchInterval: refreshInterval,
    refetchOnWindowFocus: true,
    staleTime,
  });
}

export function usePortfolioSnapshots() {
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  return useQuery({
      queryKey: ["portfolioSnapshots", currentUserEmail],
      queryFn: async () => {
          const res = await fetch("/api/portfolio/snapshots", { headers: getHeaders() });
          if (!res.ok) return [];
          const json = await res.json();
          return json.data || [];
      },
      enabled: !!currentUserEmail,
      staleTime: CACHE_TIME,
  });
}

export function useSaveSnapshot() {
  const queryClient = useQueryClient();
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  return useMutation({
      mutationFn: async (data: any) => {
          const res = await fetch("/api/portfolio/snapshots", { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
          if (!res.ok) throw new Error("Gagal menyimpan data historis bulan ini");
          return res.json();
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["portfolioSnapshots", currentUserEmail] }),
  });
}

export function useForexRates() {
  const currentUserEmail = typeof window !== 'undefined' ? localStorage.getItem("bilano_email") || "" : "";
  return useQuery<Record<string, number>>({
    queryKey: ["forex-rates", currentUserEmail],
    queryFn: async () => {
      const res = await fetch("/api/forex/rates", { headers: getHeaders() });
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: CACHE_TIME,
    refetchInterval: 60000,
  });
}