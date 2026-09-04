// =========================================================================
// BILANO INTERACTIVE TRIAL DATA & SANDBOX STORE
// Menyediakan state mandiri untuk calon pengguna yang mencoba di browser.
// Data terisi lengkap seperti akun yang sudah berjalan: Kas 10jt, BCA,
// GoPay, Cash, Valas USD, Investasi (Saham, Reksadana, Emas - TANPA CRYPTO),
// Piutang, Hutang, Kas Tertahan, Amal, Target Impian, dan Limit Bulanan.
// =========================================================================

export interface TrialWalletSource {
  id: string;
  name: string;
  balance: number;
  type: "bank" | "ewallet" | "cash";
}

export interface TrialTransaction {
  id: number;
  userId: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  source: string;
  note?: string;
  date: string;
}

export interface TrialInvestment {
  id: number;
  userId: number;
  symbol: string;
  name: string;
  type: "saham" | "reksadana" | "emas";
  quantity: number;
  avgPrice: number;
  currentPrice: number;
}

export interface TrialForexAsset {
  id: number;
  userId: number;
  currency: string;
  amount: number;
}

export interface TrialDebt {
  id: number;
  userId: number;
  name: string;
  type: "hutang" | "piutang";
  amount: number;
  dueDate: string;
  isPaid: boolean;
}

export interface TrialRetained {
  id: number;
  source: string;
  amount: number;
  currency: string;
}

export interface TrialTarget {
  id: number;
  userId: number;
  targetName: string;
  targetAmount: number;
  durationMonths: number;
  startMonth: number;
  startYear: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  savingRequired?: number;
}

export interface TrialUser {
  id: number;
  username: string;
  email: string;
  cashBalance: number;
  isPro: boolean;
  walletSources: TrialWalletSource[];
}

export interface TrialData {
  user: TrialUser;
  transactions: TrialTransaction[];
  investments: TrialInvestment[];
  forexAssets: TrialForexAsset[];
  debts: TrialDebt[];
  retained: TrialRetained[];
  target: TrialTarget;
  subscriptions: any[];
}

const TRIAL_STORAGE_KEY = "bilano_trial_sandbox_data";

export function isTrialMode(): boolean {
  if (typeof window === "undefined") return false;

  const hasTrialSession = sessionStorage.getItem("bilano_trial_session") === "true";
  const isGuest =
    localStorage.getItem("bilano_guest_mode") === "true" ||
    localStorage.getItem("bilano_trial_mode") === "true" ||
    localStorage.getItem("bilano_email") === "guest@bilano.app";

  // Jika pernah coba di browser tapi tab/browser sudah pernah ditutup,
  // maka sesi trial sudah hangus -> bersihkan agar kembali ke Landing page
  if (isGuest && !hasTrialSession) {
    clearTrialMode();
    return false;
  }

  return isGuest && hasTrialSession;
}

export function createInitialTrialData(): TrialData {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Transaksi realistis beberapa hari lalu
  const d1 = new Date(now.getTime() - 4 * 86400000).toISOString();
  const d2 = new Date(now.getTime() - 3 * 86400000).toISOString();
  const d3 = new Date(now.getTime() - 2 * 86400000).toISOString();
  const d4 = new Date(now.getTime() - 1 * 86400000).toISOString();
  const d5 = new Date().toISOString();

  return {
    user: {
      id: 999999,
      username: "Tamu Eksplorasi",
      email: "guest@bilano.app",
      cashBalance: 10000000, // Total Kas Rp 10.000.000
      isPro: true,
      walletSources: [
        { id: "w_bca", name: "BCA", balance: 6500000, type: "bank" },
        { id: "w_gopay", name: "GoPay", balance: 2000000, type: "ewallet" },
        { id: "w_cash", name: "Cash", balance: 1500000, type: "cash" },
      ],
    },
    transactions: [
      {
        id: 101,
        userId: 999999,
        type: "income",
        amount: 12000000,
        category: "Gaji",
        source: "BCA",
        note: "Gaji Bulanan & Tunjangan",
        date: d1,
      },
      {
        id: 102,
        userId: 999999,
        type: "expense",
        amount: 850000,
        category: "Belanja",
        source: "BCA",
        note: "Belanja Bulanan & Supermarket",
        date: d2,
      },
      {
        id: 103,
        userId: 999999,
        type: "expense",
        amount: 120000,
        category: "Makanan",
        source: "GoPay",
        note: "Makan Siang & Es Kopi",
        date: d3,
      },
      {
        id: 104,
        userId: 999999,
        type: "expense",
        amount: 150000,
        category: "Transportasi",
        source: "Cash",
        note: "Bahan Bakar Bensin Pertamax",
        date: d4,
      },
      {
        id: 105,
        userId: 999999,
        type: "expense",
        amount: 100000,
        category: "Amal",
        source: "GoPay",
        note: "Infaq Jumat Berkah",
        date: d5,
      },
    ],
    // Aset Investasi: Saham, Reksadana, Emas (TIDAK ADA CRYPTO!)
    investments: [
      {
        id: 201,
        userId: 999999,
        symbol: "BBCA",
        name: "PT Bank Central Asia Tbk",
        type: "saham",
        quantity: 5, // 5 lot = 500 lembar
        avgPrice: 9000,
        currentPrice: 10100, // Nilai modal Rp 4.500.000
      },
      {
        id: 202,
        userId: 999999,
        symbol: "SUCOR-MMF",
        name: "Sucorinvest Money Market Fund",
        type: "reksadana",
        quantity: 3000,
        avgPrice: 1000,
        currentPrice: 1058, // Nilai modal Rp 3.000.000
      },
      {
        id: 203,
        userId: 999999,
        symbol: "EMAS-ANTAM",
        name: "Emas Batangan Antam Logam Mulia (2 gr)",
        type: "emas",
        quantity: 2,
        avgPrice: 1250000,
        currentPrice: 1350000, // Nilai modal Rp 2.500.000
      },
    ],
    // Valas USD 150 (~Rp 2.437.500 kurs 16.250)
    forexAssets: [
      {
        id: 301,
        userId: 999999,
        currency: "USD",
        amount: 150,
      },
    ],
    // Utang Piutang
    debts: [
      {
        id: 401,
        userId: 999999,
        name: "Pinjaman Rekan Kerja",
        type: "piutang",
        amount: 500000,
        dueDate: "2026-10-15",
        isPaid: false,
      },
      {
        id: 402,
        userId: 999999,
        name: "Cicilan Laptop Kantor",
        type: "hutang",
        amount: 1200000,
        dueDate: "2026-11-20",
        isPaid: false,
      },
    ],
    retained: [
      {
        id: 501,
        source: "DP Pekerjaan Desain",
        amount: 350000,
        currency: "IDR",
      },
    ],
    // Target Impian & Limit Pengeluaran
    target: {
      id: 601,
      userId: 999999,
      targetName: "Dana Darurat & Rumah Impian",
      targetAmount: 50000000, // Goal Rp 50.000.000
      durationMonths: 12,
      startMonth: Math.max(1, currentMonth - 2),
      startYear: currentYear,
      monthlyExpenses: 4000000, // Limit Pengeluaran Rp 4.000.000 / bulan
      monthlyIncome: 12000000,
      savingRequired: 4166667,
    },
    subscriptions: [
      {
        id: 701,
        userId: 999999,
        name: "iCloud Storage",
        cost: 15000,
        category: "Cloud",
        billingCycle: "monthly",
        billingDate: 15,
        isActive: true,
      },
    ],
  };
}

export function initTrialSession(): void {
  if (typeof window === "undefined") return;

  // Catat sesi aktif di sessionStorage (otomatis terhapus saat tab/browser ditutup)
  sessionStorage.setItem("bilano_trial_session", "true");
  localStorage.setItem("bilano_guest_mode", "true");
  localStorage.setItem("bilano_trial_mode", "true");
  localStorage.setItem("bilano_auth", "true");
  localStorage.setItem("bilano_email", "guest@bilano.app");
  localStorage.setItem("bilano_migration_completed", "true");
  localStorage.setItem("bilano_permissions_prompted", "true");
  localStorage.setItem("bilano_access_tier", "premium");

  // Hapus trigger onboarding yang mengganggu
  localStorage.removeItem("onboarding_just_finished");
  sessionStorage.removeItem("bilano_trial_visited_performance");
  sessionStorage.removeItem("bilano_trial_simulated");

  // Set fresh trial dummy data
  const initial = createInitialTrialData();
  localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(initial));
}

export function getTrialData(): TrialData {
  if (typeof window === "undefined") return createInitialTrialData();

  try {
    const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
    if (!raw) {
      const initial = createInitialTrialData();
      localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return createInitialTrialData();
  }
}

export function saveTrialData(data: TrialData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TRIAL_STORAGE_KEY, JSON.stringify(data));
}

export function recordTrialExpense(
  amount: number,
  category: string,
  sourceName: string,
  note: string = "Simulasi Pengeluaran"
): TrialData {
  const current = getTrialData();

  // Kurangi saldo sumber dana yang dipilih
  const updatedSources = current.user.walletSources.map((w) => {
    if (w.name.toLowerCase() === sourceName.toLowerCase()) {
      return { ...w, balance: Math.max(0, w.balance - amount) };
    }
    return w;
  });

  // Kurangi total saldo kas
  const newCashBalance = Math.max(0, current.user.cashBalance - amount);

  // Buat catatan transaksi baru di paling atas
  const newTx: TrialTransaction = {
    id: Date.now(),
    userId: current.user.id,
    type: "expense",
    amount,
    category,
    source: sourceName,
    note,
    date: new Date().toISOString(),
  };

  const updatedData: TrialData = {
    ...current,
    user: {
      ...current.user,
      cashBalance: newCashBalance,
      walletSources: updatedSources,
    },
    transactions: [newTx, ...current.transactions],
  };

  saveTrialData(updatedData);
  sessionStorage.setItem("bilano_trial_simulated", "true");
  return updatedData;
}

export function clearTrialMode(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("bilano_trial_session");
  localStorage.removeItem("bilano_guest_mode");
  localStorage.removeItem("bilano_trial_mode");
  localStorage.removeItem("bilano_auth");
  localStorage.removeItem("bilano_email");
  localStorage.removeItem(TRIAL_STORAGE_KEY);
  sessionStorage.removeItem("bilano_trial_visited_performance");
  sessionStorage.removeItem("bilano_trial_simulated");
}

export function triggerPwaInstallOrGuide(navigate?: (path: string) => void): void {
  if (typeof window === "undefined") return;

  const deferredPrompt = (window as any).deferredPwaPrompt;

  // Jika browser mendukung native install prompt PWA
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === "accepted") {
          clearTrialMode();
          if (navigate) navigate("/auth?mode=signup");
          else window.location.href = "/auth?mode=signup";
        }
      });
      return;
    } catch (err) {
      console.error("PWA prompt error:", err);
    }
  }

  // Cek apakah di Android WebView (Instagram/FB/TikTok)
  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);
  const isInApp = /Instagram|FBAN|FBAV|TikTok/i.test(ua);

  if (isAndroid && isInApp) {
    const targetUrl = `${window.location.origin}/?action=install`;
    const cleanUrl = targetUrl.replace(/^https?:\/\//, "");
    window.location.href = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    return;
  }

  // Browser biasa: Bersihkan trial mode dan arahkan ke landing page dengan trigger scroll ke install guide
  clearTrialMode();
  if (navigate) {
    navigate("/?action=install");
  } else {
    window.location.href = "/?action=install";
  }
}
