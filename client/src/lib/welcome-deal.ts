import { useState, useEffect } from "react";
import { getTrialInfo } from "./trial-manager";

export type UserGoal = "income" | "leakage" | "debt" | "invest" | "emergency" | "general";

const POST_TRIAL_DEADLINE_KEY = "bilano_device_post_trial_deal_deadline_v3";
const POST_TRIAL_NOTIFIED_KEY = "bilano_device_post_trial_notified_v3";
const GOAL_STORAGE_KEY_PREFIX = "bilano_user_goal_";
const DEVICE_ID_KEY = "bilano_device_uuid";

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

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server-device";
  let deviceId = localStorage.getItem(DEVICE_ID_KEY) || getCookie(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now().toString(36);
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    setCookie(DEVICE_ID_KEY, deviceId);
  } else {
    if (!localStorage.getItem(DEVICE_ID_KEY)) localStorage.setItem(DEVICE_ID_KEY, deviceId);
    if (!getCookie(DEVICE_ID_KEY)) setCookie(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// Dapatkan atau inisialisasi deadline 24 jam Pasca-Trial (HANYA AKTIF MULAI HARI KE-8 / TEPAT SAAT TRIAL HABIS)
export function getWelcomeDeadline(userEmail?: string): number {
  if (typeof window === "undefined") return Date.now() + 24 * 60 * 60 * 1000;

  const trial = getTrialInfo();
  if (trial.isTrialActive || !trial.isTrialExpired) {
    return 0;
  }

  const stored = localStorage.getItem(POST_TRIAL_DEADLINE_KEY) || getCookie(POST_TRIAL_DEADLINE_KEY);
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed) && parsed > Date.now()) {
      if (!localStorage.getItem(POST_TRIAL_DEADLINE_KEY)) localStorage.setItem(POST_TRIAL_DEADLINE_KEY, stored);
      if (!getCookie(POST_TRIAL_DEADLINE_KEY)) setCookie(POST_TRIAL_DEADLINE_KEY, stored);
      return parsed;
    }
  }

  // Inisialisasi deadline 24 jam tepat ketika masa trial habis (Hari ke-8)
  const newDeadline = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(POST_TRIAL_DEADLINE_KEY, newDeadline.toString());
  setCookie(POST_TRIAL_DEADLINE_KEY, newDeadline.toString());
  return newDeadline;
}

export function hasSeenDevicePromoNotification(): boolean {
  if (typeof window === "undefined") return true;
  return !!(localStorage.getItem(POST_TRIAL_NOTIFIED_KEY) || getCookie(POST_TRIAL_NOTIFIED_KEY));
}

export function markDevicePromoNotificationSeen() {
  if (typeof window === "undefined") return;
  localStorage.setItem(POST_TRIAL_NOTIFIED_KEY, "true");
  setCookie(POST_TRIAL_NOTIFIED_KEY, "true");
}

export function useWelcomeCountdown(userEmail?: string) {
  const trial = getTrialInfo();
  const [deviceId] = useState(() => getOrCreateDeviceId());

  // Selama trial masih aktif, countdown promo 24 jam SAMA SEKALI BELUM berjalan
  const isTrialActive = trial.isTrialActive;
  const isTrialExpired = trial.isTrialExpired;

  const [deadline, setDeadline] = useState<number>(() => {
    if (isTrialExpired && !isTrialActive) {
      return getWelcomeDeadline(userEmail);
    }
    return 0;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (isTrialActive || !isTrialExpired || deadline === 0) return 0;
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
  });

  useEffect(() => {
    if (isTrialActive || !isTrialExpired) {
      setTimeLeft(0);
      try {
        localStorage.removeItem(POST_TRIAL_DEADLINE_KEY);
        document.cookie = `${POST_TRIAL_DEADLINE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
      } catch (_) {}
      return;
    }

    let targetDeadline = deadline;
    if (targetDeadline === 0) {
      targetDeadline = getWelcomeDeadline(userEmail);
      setDeadline(targetDeadline);
    }

    const initial = Math.max(0, Math.floor((targetDeadline - Date.now()) / 1000));
    setTimeLeft(initial);

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((targetDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [isTrialActive, isTrialExpired, deadline, userEmail]);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const isExpired = isTrialExpired && timeLeft <= 0;

  return {
    timeLeft,
    hours,
    minutes,
    seconds,
    formatted: isExpired ? "00:00:00" : `${hours}:${minutes}:${seconds}`,
    isExpired,
    isTrialActive,
    isTrialExpired,
    isPromoActive: isTrialExpired && timeLeft > 0,
    deadline,
    deviceId
  };
}

export function getStoredUserGoal(userEmail?: string): UserGoal {
  if (typeof window === "undefined") return "general";
  const key = GOAL_STORAGE_KEY_PREFIX + (userEmail || "guest");
  const stored = (localStorage.getItem(key) || localStorage.getItem("bilano_user_goal")) as UserGoal;
  if (stored === "income" || stored === "leakage" || stored === "debt" || stored === "invest" || stored === "emergency") return stored;
  return "general";
}

export function setStoredUserGoal(goal: UserGoal, userEmail?: string) {
  if (typeof window === "undefined") return;
  const key = GOAL_STORAGE_KEY_PREFIX + (userEmail || "guest");
  localStorage.setItem(key, goal);
  localStorage.setItem("bilano_user_goal", goal);
}

export function getGoalPitchDetails(goal: UserGoal) {
  switch (goal) {
    case "income":
      return {
        badge: "Rekomendasi Profil: Pencari Sumber Cuan",
        headline: "Buka Blueprint & Ide Penghasilan Tambahan Anda",
        subheadline: "Jangan biarkan penghasilan Anda pas-pasan. Dapatkan rekomendasi aliran cuan baru yang terpersonalisasi + asistensi AI tanpa batas.",
        heroFeature: "Akses Penuh Ide & Pembimbing Penghasilan (Income Strategy)",
        featureTag: "Mesin Pencetak Pemasukan"
      };
    case "leakage":
      return {
        badge: "Rekomendasi Profil: Disiplin & Anti Bocor",
        headline: "Hentikan Kebocoran Kas Halus & Kuasai Tabungan",
        subheadline: "Ketahui ke mana larinya setiap sen uang Anda dengan radar audit neraca otomatis dan pemindaian struk instan (Smart OCR).",
        heroFeature: "Laporan Neraca Mendalam & Smart Scan OCR Tanpa Batas",
        featureTag: "Radar Kebocoran Uang"
      };
    case "debt":
      return {
        badge: "Rekomendasi Profil: Perencana Bebas Utang",
        headline: "Akselerasi Pelunasan Bebas Utang & Bangun Aset",
        subheadline: "Gunakan strategi pelunasan kalkulasi terarah dan simulasikan kapan Anda mencapai kebebasan finansial seutuhnya.",
        heroFeature: "Pelacak & Strategi Pelunasan Utang-Piutang Terintegrasi",
        featureTag: "Bebas Utang Terencana"
      };
    case "invest":
      return {
        badge: "Rekomendasi Profil: Pembangun Portofolio Aset",
        headline: "Kembangkan Portofolio & Ciptakan Passive Income",
        subheadline: "Pantau multi-aset saham, kripto, dan valas secara realtime, dan biarkan modal Anda bertumbuh dengan kalkulasi ROI akurat.",
        heroFeature: "Portofolio Multi-Aset Live & Analisis ROI Realisasi",
        featureTag: "Mesin Akumulasi Aset"
      };
    case "emergency":
      return {
        badge: "Rekomendasi Profil: Benteng Dana Darurat",
        headline: "Bentuk Cadangan Kas Darurat & Raih Ketenangan",
        subheadline: "Ketahui durasi ketahanan kas (Runway) Anda dan bangun dana darurat 3-6 bulan tanpa mengorbankan kebutuhan harian.",
        heroFeature: "Kalkulator Financial Runway & Proteksi Cashflow",
        featureTag: "Benteng Perlindungan Kas"
      };
    default:
      return {
        badge: "Rekomendasi Profil: Akselerasi Finansial",
        headline: "Kuasai Keuangan Pribadi & Buka Potensi Kekayaan",
        subheadline: "Nikmati ekosistem lengkap: manajemen multi-rekening, konsultasi AI 24/7, ide penghasilan baru, dan perpustakaan e-book finansial.",
        heroFeature: "Seluruh Fitur Eksekutif + Asisten AI Cerdas Tanpa Batas",
        featureTag: "Akses VIP Komplit"
      };
  }
}

