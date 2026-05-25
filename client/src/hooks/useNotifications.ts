import { useEffect } from "react";

export function useNotifications() {
    useEffect(() => {
        // KOSONGKAN SAJA!
        // Fitur notifikasi lokal di frontend telah dimatikan sepenuhnya 
        // agar tidak membingungkan Service Worker OneSignal.
        // PWA sekarang murni mengandalkan Push Notification otomatis dari Vercel Cron.
    }, []);
}