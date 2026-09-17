// =========================================================================
// 👑 BILANO 24-HOUR EXPLORATION ACCESS MANAGER (MODE EKSPLORASI 24 JAM)
// =========================================================================

export const EXPLORATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Jam (1 Hari)

export interface TrialInfo {
  isPro: boolean;
  isTrialActive: boolean; // Alias untuk isExplorationActive
  isTrialExpired: boolean; // Alias untuk isExplorationExpired
  daysLeft: number;
  hoursLeft: number;
  minutesLeft: number;
  secondsLeft: number;
  totalSecondsLeft: number;
  formattedTimeLeft: string;
  trialStartDate: Date | null;
  trialEndDate: Date | null;
  formattedEndDate: string;
  reminderTime: string;
  monthlyScanCount: number;
  remainingFreeScans: number;
  maxFreeMonthlyScans: number;
}

// Helper persisten cookie agar tahan jika localStorage parsial terhapus
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

// 🔄 Sinkronisasi skema eksplorasi (Device-Level) TANPA memotong trial aktif akun yang sudah berjalan
export function syncAndResetTrialForDevices(email?: string, user?: any) {
  if (typeof window === "undefined") return;
  const SYNC_KEY = "bilano_scheme_v7_1day_exploration_v2";
  if (localStorage.getItem(SYNC_KEY) === "true") return;

  const now = Date.now();

  // Cek apakah akun atau perangkat ini sudah memiliki masa trial aktif yang sedang berjalan (> now)
  const cleanEmail = (email || localStorage.getItem("bilano_email") || "").trim().toLowerCase();
  const existingLocalEnd = cleanEmail ? localStorage.getItem(`bilano_trial_end_${cleanEmail}`) : null;
  const existingDevEnd = localStorage.getItem("bilano_device_trial_end") || getCookie("bilano_device_trial_end");
  const existingServerEnd = user?.trialEndDate ? new Date(user.trialEndDate).getTime() : null;

  const maxExistingEnd = Math.max(
    existingServerEnd && !isNaN(existingServerEnd) ? existingServerEnd : 0,
    existingLocalEnd && !isNaN(parseInt(existingLocalEnd, 10)) ? parseInt(existingLocalEnd, 10) : 0,
    existingDevEnd && !isNaN(parseInt(existingDevEnd, 10)) ? parseInt(existingDevEnd, 10) : 0
  );

  // 🛡️ JIKA AKUN/DEVICE SUDAH MEMILIKI TRIAL 7 HARI AKTIF, JANGAN DIPOTONG SAMA SEKALI!
  if (maxExistingEnd > now) {
    if (cleanEmail && cleanEmail !== "guest" && cleanEmail !== "guest@bilano.app") {
      localStorage.setItem(`bilano_trial_end_${cleanEmail}`, maxExistingEnd.toString());
    }
    localStorage.setItem("bilano_device_trial_end", maxExistingEnd.toString());
    setCookie("bilano_device_trial_end", maxExistingEnd.toString());
    localStorage.setItem(SYNC_KEY, "true");
    return;
  }

  // 1. Bersihkan kunci trial & deadline promo lama yang sudah expired
  const keysToRemove = [
    "bilano_trial_countdown_sync_v6",
    "bilano_trial_countdown_sync_v5",
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

  // 2. Terapkan skema baru Akses Eksplorasi 24 Jam hanya untuk perangkat baru / yang belum punya trial aktif
  const isPro = localStorage.getItem("bilano_pro") === "true";
  if (!isPro && !user?.isPro) {
    const explorationEnd = now + EXPLORATION_DURATION_MS;
    if (cleanEmail && cleanEmail !== "guest" && cleanEmail !== "guest@bilano.app") {
      localStorage.setItem(`bilano_trial_start_${cleanEmail}`, now.toString());
      localStorage.setItem(`bilano_trial_end_${cleanEmail}`, explorationEnd.toString());
    }
    localStorage.setItem("bilano_device_trial_start", now.toString());
    localStorage.setItem("bilano_device_trial_end", explorationEnd.toString());
    setCookie("bilano_device_trial_start", now.toString());
    setCookie("bilano_device_trial_end", explorationEnd.toString());
  }

  localStorage.setItem(SYNC_KEY, "true");
}

export function getTrialInfo(user?: any): TrialInfo {
  const isPro = Boolean(user?.isPro || (typeof window !== "undefined" && localStorage.getItem("bilano_pro") === "true"));
  const email = typeof window !== "undefined" ? (localStorage.getItem("bilano_email") || user?.email || "").trim().toLowerCase() : "";

  // Jalankan auto-sync tanpa memotong masa trial yang sedang berjalan
  if (typeof window !== "undefined") {
    syncAndResetTrialForDevices(email, user);
  }

  if (isPro) {
    return {
      isPro: true,
      isTrialActive: false,
      isTrialExpired: false,
      daysLeft: 0,
      hoursLeft: 0,
      minutesLeft: 0,
      secondsLeft: 0,
      totalSecondsLeft: 0,
      formattedTimeLeft: "00:00:00",
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

  const serverStart = user?.trialStartDate ? new Date(user.trialStartDate).getTime() : null;
  const serverEnd = user?.trialEndDate ? new Date(user.trialEndDate).getTime() : null;
  const devStart = typeof window !== "undefined" ? (localStorage.getItem("bilano_device_trial_start") || getCookie("bilano_device_trial_start")) : null;
  const devEnd = typeof window !== "undefined" ? (localStorage.getItem("bilano_device_trial_end") || getCookie("bilano_device_trial_end")) : null;
  const localStart = typeof window !== "undefined" && email ? localStorage.getItem(`bilano_trial_start_${email}`) : null;
  const localEnd = typeof window !== "undefined" && email ? localStorage.getItem(`bilano_trial_end_${email}`) : null;

  const devEndNum = devEnd ? parseInt(devEnd, 10) : 0;
  const localEndNum = localEnd ? parseInt(localEnd, 10) : 0;
  const serverEndNum = serverEnd && !isNaN(serverEnd) ? serverEnd : 0;

  // 🛡️ Utamakan masa trial aktif terpanjang (misal 7 hari bagi akun yang sudah berjalan)
  const activeEndCandidates = [
    serverEndNum > now ? serverEndNum : 0,
    localEndNum > now ? localEndNum : 0,
    devEndNum > now ? devEndNum : 0
  ].filter(t => t > 0);

  if (activeEndCandidates.length > 0) {
    trialEnd = Math.max(...activeEndCandidates);
    if (trialEnd === serverEndNum && serverStart) {
      trialStart = serverStart;
    } else if (trialEnd === localEndNum && localStart) {
      trialStart = parseInt(localStart, 10);
    } else if (trialEnd === devEndNum && devStart) {
      trialStart = parseInt(devStart, 10);
    } else {
      trialStart = trialEnd - EXPLORATION_DURATION_MS;
    }

    // 🛡️ Pastikan device storage & cookie disinkronkan dengan masa trial aktif terpanjang (Grandfathering)
    if (typeof window !== "undefined") {
      if (email && email !== "guest" && email !== "guest@bilano.app") {
        localStorage.setItem(`bilano_trial_start_${email}`, (trialStart || now).toString());
        localStorage.setItem(`bilano_trial_end_${email}`, trialEnd.toString());
      }
      localStorage.setItem("bilano_device_trial_start", (trialStart || now).toString());
      localStorage.setItem("bilano_device_trial_end", trialEnd.toString());
      setCookie("bilano_device_trial_start", (trialStart || now).toString());
      setCookie("bilano_device_trial_end", trialEnd.toString());
    }
  } else if (serverEndNum > 0) {
    trialEnd = serverEndNum;
    trialStart = serverStart || (trialEnd - EXPLORATION_DURATION_MS);
  } else if (localEndNum > 0) {
    trialEnd = localEndNum;
    trialStart = localStart ? parseInt(localStart, 10) : (trialEnd - EXPLORATION_DURATION_MS);
  } else if (devEndNum > 0) {
    trialEnd = devEndNum;
    trialStart = devStart ? parseInt(devStart, 10) : (trialEnd - EXPLORATION_DURATION_MS);
  }

  // Jika belum pernah punya timestamp eksplorasi sama sekali di perangkat ini, aktifkan 24 jam mulai detik ini
  if (!trialEnd) {
    trialStart = now;
    trialEnd = now + EXPLORATION_DURATION_MS;
    if (typeof window !== "undefined") {
      if (email && email !== "guest" && email !== "guest@bilano.app") {
        localStorage.setItem(`bilano_trial_start_${email}`, trialStart.toString());
        localStorage.setItem(`bilano_trial_end_${email}`, trialEnd.toString());
      }
      localStorage.setItem("bilano_device_trial_start", trialStart.toString());
      localStorage.setItem("bilano_device_trial_end", trialEnd.toString());
      setCookie("bilano_device_trial_start", trialStart.toString());
      setCookie("bilano_device_trial_end", trialEnd.toString());
    }
  }

  const isTrialActive = now < trialEnd;
  const isTrialExpired = now >= trialEnd;
  const totalSecondsLeft = isTrialActive ? Math.max(0, Math.floor((trialEnd - now) / 1000)) : 0;
  const daysLeft = isTrialActive ? Math.max(1, Math.ceil(totalSecondsLeft / (24 * 3600))) : 0;

  const hoursLeft = Math.floor(totalSecondsLeft / 3600);
  const minutesLeft = Math.floor((totalSecondsLeft % 3600) / 60);
  const secondsLeft = totalSecondsLeft % 60;

  // Format dinamis: jika sisa > 24 jam (pengguna 7 hari lama), tampilkan sisa hari; jika <= 24 jam tampilkan HH:MM:SS
  let formattedTimeLeft = "00:00:00";
  if (isTrialActive) {
    if (totalSecondsLeft > 24 * 3600) {
      formattedTimeLeft = `${daysLeft} Hari Lagi`;
    } else {
      formattedTimeLeft = `${String(hoursLeft).padStart(2, "0")}:${String(minutesLeft).padStart(2, "0")}:${String(secondsLeft).padStart(2, "0")}`;
    }
  }

  const endDateObj = new Date(trialEnd);
  const formattedEndDate = totalSecondsLeft > 24 * 3600
    ? endDateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : endDateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + ", " + endDateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  const scanCount = user?.monthlyScanCount || 0;
  const remainingFreeScans = isTrialActive ? 999 : Math.max(0, 5 - scanCount);

  return {
    isPro: false,
    isTrialActive,
    isTrialExpired,
    daysLeft,
    hoursLeft,
    minutesLeft,
    secondsLeft,
    totalSecondsLeft,
    formattedTimeLeft,
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
  const cleanEmail = (email || "").trim().toLowerCase();
  const existingLocalEnd = typeof window !== "undefined" && cleanEmail ? localStorage.getItem(`bilano_trial_end_${cleanEmail}`) : null;
  const existingDevEnd = typeof window !== "undefined" ? (localStorage.getItem("bilano_device_trial_end") || getCookie("bilano_device_trial_end")) : null;
  const maxExistingEnd = Math.max(
    existingLocalEnd && !isNaN(parseInt(existingLocalEnd, 10)) ? parseInt(existingLocalEnd, 10) : 0,
    existingDevEnd && !isNaN(parseInt(existingDevEnd, 10)) ? parseInt(existingDevEnd, 10) : 0
  );

  // 🛡️ Jika akun/device sudah punya trial aktif yang lebih lama (misal 7 hari), pertahankan!
  const trialEnd = maxExistingEnd > now ? maxExistingEnd : (now + EXPLORATION_DURATION_MS);
  const existingStart = typeof window !== "undefined" ? (localStorage.getItem("bilano_device_trial_start") || getCookie("bilano_device_trial_start")) : null;
  const trialStart = maxExistingEnd > now && existingStart ? parseInt(existingStart, 10) : now;

  if (typeof window !== "undefined") {
    if (email) {
      localStorage.setItem(`bilano_reminder_time_${email}`, params.reminderTime);
      localStorage.setItem(`bilano_trial_start_${email}`, trialStart.toString());
      localStorage.setItem(`bilano_trial_end_${email}`, trialEnd.toString());
    }
    localStorage.setItem("bilano_device_trial_start", trialStart.toString());
    localStorage.setItem("bilano_device_trial_end", trialEnd.toString());
    setCookie("bilano_device_trial_start", trialStart.toString());
    setCookie("bilano_device_trial_end", trialEnd.toString());
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

