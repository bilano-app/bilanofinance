import { useState, useEffect } from "react";

export type UserGoal = "income" | "leakage" | "debt" | "general";

const DEAL_STORAGE_KEY_PREFIX = "bilano_welcome_deal_deadline_";
const GOAL_STORAGE_KEY_PREFIX = "bilano_user_goal_";

export function getWelcomeDeadline(userEmail?: string): number {
  if (typeof window === "undefined") return Date.now() + 24 * 60 * 60 * 1000;
  
  const key = DEAL_STORAGE_KEY_PREFIX + (userEmail || "guest");
  const stored = localStorage.getItem(key) || localStorage.getItem("bilano_global_welcome_deal_deadline");
  
  if (stored) {
    const parsed = parseInt(stored, 10);
    if (!isNaN(parsed)) return parsed;
  }

  // Jika belum ada, buat 24 jam dari sekarang
  const newDeadline = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(key, newDeadline.toString());
  localStorage.setItem("bilano_global_welcome_deal_deadline", newDeadline.toString());
  return newDeadline;
}

export function useWelcomeCountdown(userEmail?: string) {
  const [deadline] = useState(() => getWelcomeDeadline(userEmail));
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
    return diff;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const hours = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
  const seconds = String(timeLeft % 60).padStart(2, "0");
  const isExpired = timeLeft <= 0;

  return {
    timeLeft,
    hours,
    minutes,
    seconds,
    formatted: `${hours}:${minutes}:${seconds}`,
    isExpired
  };
}

export function getStoredUserGoal(userEmail?: string): UserGoal {
  if (typeof window === "undefined") return "general";
  const key = GOAL_STORAGE_KEY_PREFIX + (userEmail || "guest");
  const stored = (localStorage.getItem(key) || localStorage.getItem("bilano_user_goal")) as UserGoal;
  if (stored === "income" || stored === "leakage" || stored === "debt") return stored;
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
