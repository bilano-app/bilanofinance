// =========================================================================
// 👑 BILANO 7-DAY FULL ACCESS TRIAL MANAGER
// =========================================================================

export interface TrialInfo {
  isPro: boolean;
  isTrialActive: boolean;
  isTrialExpired: boolean;
  daysLeft: number;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  formattedEndDate: string;
  reminderTime: string;
  monthlyScanCount: number;
  remainingFreeScans: number;
  maxFreeMonthlyScans: number;
}

// 🔄 Sinkronisasi & migrasi reset skema trial 7 hari mulai hari ini untuk semua device yang terlanjur jalan countdownnya
export function syncAndResetTrialForDevices(email?: string) {
  if (typeof window === "undefined") return;
  const SYNC_KEY = "bilano_trial_countdown_sync_v6";
  if (localStorage.getItem(SYNC_KEY) === "true") return;

  const now = Date.now();
  const trialEnd = now + 7 * 24 * 60 * 60 * 1000;

  // 1. Bersihkan semua countdown & deadline promo 24 jam yang terlanjur jalan prematur
  const keysToRemove = [
    "bilano_device_welcome_deal_deadline_v2",
    "bilano_device_welcome_deal_deadline_v1",
    "bilano_global_welcome_deal_deadline",
    "bilano_device_promo_notified_v2",
    "bilano_device_post_trial_notified_v3",
    "bilano_device_post_trial_deal_deadline_v3"
  ];

  keysToRemove.forEach(k => {
    try {
      localStorage.removeItem(k);
      document.cookie = `${k}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
    } catch (_) {}
  });

  // Hapus user deadline lama jika ada
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith("bilano_welcome_deal_deadline_")) {
        localStorage.removeItem(key);
      }
    });
  } catch (_) {}

  // 2. Terapkan skema trial 7 hari mulai hari ini jika belum Pro
  const isPro = localStorage.getItem("bilano_pro") === "true";
  if (!isPro) {
    const cleanEmail = (email || localStorage.getItem("bilano_email") || "").trim().toLowerCase();
    if (cleanEmail && cleanEmail !== "guest" && cleanEmail !== "guest@bilano.app") {
      localStorage.setItem(`bilano_trial_start_${cleanEmail}`, now.toString());
      localStorage.setItem(`bilano_trial_end_${cleanEmail}`, trialEnd.toString());
    }
    localStorage.setItem("bilano_device_trial_start", now.toString());
    localStorage.setItem("bilano_device_trial_end", trialEnd.toString());
  }

  localStorage.setItem(SYNC_KEY, "true");
}

export function getTrialInfo(user?: any): TrialInfo {
  const isPro = Boolean(user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true"));
  const email = typeof window !== "undefined" ? (localStorage.getItem("bilano_email") || user?.email || "").trim().toLowerCase() : "";

  // Jalankan auto-sync & reset jika belum diterapkan di browser ini
  if (typeof window !== "undefined") {
    syncAndResetTrialForDevices(email);
  }

  if (isPro) {
    return {
      isPro: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysLeft: 0,
      trialStartDate: null,
      trialEndDate: null,
      formattedEndDate: "",
      reminderTime: user?.reminderTime || "malam",
      monthlyScanCount: 0,
      remainingFreeScans: 999,
      maxFreeMonthlyScans: 5
    };
  }

  const now = Date.now();
  let trialStart: number | null = null;
  let trialEnd: number | null = null;

  // Cek timestamp aktif dari local/device terlebih dahulu untuk menjamin durasi 7 hari fresh
  const localStart = typeof window !== "undefined" && email ? localStorage.getItem(`bilano_trial_start_${email}`) : null;
  const localEnd = typeof window !== "undefined" && email ? localStorage.getItem(`bilano_trial_end_${email}`) : null;
  const devStart = typeof window !== "undefined" ? localStorage.getItem("bilano_device_trial_start") : null;
  const devEnd = typeof window !== "undefined" ? localStorage.getItem("bilano_device_trial_end") : null;

  if (localEnd && parseInt(localEnd, 10) > now) {
    trialEnd = parseInt(localEnd, 10);
    trialStart = localStart ? parseInt(localStart, 10) : trialEnd - 7 * 24 * 60 * 60 * 1000;
  } else if (devEnd && parseInt(devEnd, 10) > now) {
    trialEnd = parseInt(devEnd, 10);
    trialStart = devStart ? parseInt(devStart, 10) : trialEnd - 7 * 24 * 60 * 60 * 1000;
  } else if (user?.trialEndDate && new Date(user.trialEndDate).getTime() > now) {
    trialEnd = new Date(user.trialEndDate).getTime();
    trialStart = user.trialStartDate ? new Date(user.trialStartDate).getTime() : trialEnd - 7 * 24 * 60 * 60 * 1000;
  } else if (user?.trialEndDate) {
    trialEnd = new Date(user.trialEndDate).getTime();
    trialStart = user.trialStartDate ? new Date(user.trialStartDate).getTime() : trialEnd - 7 * 24 * 60 * 60 * 1000;
  } else if (localEnd) {
    trialEnd = parseInt(localEnd, 10);
    trialStart = localStart ? parseInt(localStart, 10) : trialEnd - 7 * 24 * 60 * 60 * 1000;
  } else if (devEnd) {
    trialEnd = parseInt(devEnd, 10);
    trialStart = devStart ? parseInt(devStart, 10) : trialEnd - 7 * 24 * 60 * 60 * 1000;
  }

  if (!trialEnd && user?.createdAt) {
    trialStart = new Date(user.createdAt).getTime();
    trialEnd = trialStart + 7 * 24 * 60 * 60 * 1000;
  }

  // Jika akun terdaftar belum punya timestamp trial sama sekali, aktifkan 7 hari mulai sekarang
  if (!trialEnd) {
    trialStart = now;
    trialEnd = now + 7 * 24 * 60 * 60 * 1000;
    if (typeof window !== "undefined") {
      if (email && email !== "guest" && email !== "guest@bilano.app") {
        localStorage.setItem(`bilano_trial_start_${email}`, trialStart.toString());
        localStorage.setItem(`bilano_trial_end_${email}`, trialEnd.toString());
      }
      localStorage.setItem("bilano_device_trial_start", trialStart.toString());
      localStorage.setItem("bilano_device_trial_end", trialEnd.toString());
    }
  }

  const isTrialActive = now <= trialEnd;
  const isTrialExpired = now > trialEnd;
  const daysLeft = isTrialActive ? Math.max(1, Math.ceil((trialEnd - now) / (24 * 60 * 60 * 1000))) : 0;

  const endDateObj = new Date(trialEnd);
  const formattedEndDate = endDateObj.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  const scanCount = user?.monthlyScanCount || 0;
  const remainingFreeScans = isTrialActive ? 999 : Math.max(0, 5 - scanCount);

  return {
    isPro: false,
    isTrialActive,
    isTrialExpired,
    daysLeft,
    trialStartDate: trialStart ? new Date(trialStart) : null,
    trialEndDate: endDateObj,
    formattedEndDate,
    reminderTime: user?.reminderTime || (typeof window !== "undefined" ? localStorage.getItem(`bilano_reminder_time_${email}`) : "") || "malam",
    monthlyScanCount: scanCount,
    remainingFreeScans,
    maxFreeMonthlyScans: 5
  };
}

export async function saveUserCommitment(params: { reminderTime: string; phone?: string; userEmail?: string }) {
  const email = params.userEmail || (typeof window !== "undefined" ? localStorage.getItem("bilano_email") || "" : "");
  
  const now = Date.now();
  const trialEnd = now + 7 * 24 * 60 * 60 * 1000;

  if (typeof window !== "undefined" && email) {
    localStorage.setItem(`bilano_reminder_time_${email}`, params.reminderTime);
    localStorage.setItem(`bilano_trial_start_${email}`, now.toString());
    localStorage.setItem(`bilano_trial_end_${email}`, trialEnd.toString());
  }

  try {
    const res = await fetch("/api/user/commitment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-email": email
      },
      body: JSON.stringify({
        reminderTime: params.reminderTime,
        phone: params.phone
      })
    });
    return await res.json();
  } catch (e) {
    console.warn("Failed to persist commitment to server:", e);
    return { success: true, localOnly: true };
  }
}

// 🏷️ Per-feature first-time toast tracker
export function hasSeenTrialFeatureTip(featureKey: string): boolean {
  if (typeof window === "undefined") return true;
  return !!localStorage.getItem(`bilano_seen_trial_tip_${featureKey}`);
}

export function markTrialFeatureTipSeen(featureKey: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`bilano_seen_trial_tip_${featureKey}`, "true");
}

