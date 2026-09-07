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

export function getTrialInfo(user?: any): TrialInfo {
  const isPro = Boolean(user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true"));
  const email = typeof window !== "undefined" ? (localStorage.getItem("bilano_email") || user?.email || "").trim().toLowerCase() : "";

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

  if (user?.trialEndDate) {
    trialEnd = new Date(user.trialEndDate).getTime();
    trialStart = user.trialStartDate ? new Date(user.trialStartDate).getTime() : trialEnd - 7 * 24 * 60 * 60 * 1000;
  } else if (typeof window !== "undefined" && email) {
    const localStart = localStorage.getItem(`bilano_trial_start_${email}`);
    const localEnd = localStorage.getItem(`bilano_trial_end_${email}`);
    if (localStart && localEnd) {
      trialStart = parseInt(localStart, 10);
      trialEnd = parseInt(localEnd, 10);
    }
  }

  if (!trialEnd && user?.createdAt) {
    trialStart = new Date(user.createdAt).getTime();
    trialEnd = trialStart + 7 * 24 * 60 * 60 * 1000;
  }

  // Jika akun terdaftar belum punya timestamp trial sama sekali, aktifkan 7 hari
  if (!trialEnd && email && email !== "guest" && email !== "guest@bilano.app") {
    trialStart = now;
    trialEnd = now + 7 * 24 * 60 * 60 * 1000;
    if (typeof window !== "undefined") {
      localStorage.setItem(`bilano_trial_start_${email}`, trialStart.toString());
      localStorage.setItem(`bilano_trial_end_${email}`, trialEnd.toString());
    }
  }

  if (!trialEnd) {
    return {
      isPro: false,
      isTrialActive: false,
      isTrialExpired: false,
      daysLeft: 0,
      trialStartDate: null,
      trialEndDate: null,
      formattedEndDate: "",
      reminderTime: "malam",
      monthlyScanCount: 0,
      remainingFreeScans: 5,
      maxFreeMonthlyScans: 5
    };
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
