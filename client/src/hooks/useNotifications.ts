import { useEffect } from "react";

export function useNotifications() {
    useEffect(() => {
        if (typeof window === "undefined" || !("Notification" in window)) return;

        const checkAndSendReminder = () => {
            if (Notification.permission !== "granted") return;

            const now = new Date();
            const hour = now.getHours();
            const todayStr = now.toISOString().split("T")[0]; // YYYY-MM-DD

            let sessionKey = "";
            let title = "";
            let body = "";

            if (hour >= 6 && hour < 11) {
                sessionKey = `bilano_notif_${todayStr}_morning`;
                title = "☀️ Semangat Pagi dari BILANO!";
                body = "Awali hari dengan cek pos anggaran & alokasi dompetmu hari ini.";
            } else if (hour >= 12 && hour < 15) {
                sessionKey = `bilano_notif_${todayStr}_lunch`;
                title = "🍱 Cek Arus Kas Siang";
                body = "Habis makan siang atau jajan kopi? Catat pengeluaranmu dalam 5 detik di BILANO.";
            } else if (hour >= 17 && hour < 20) {
                sessionKey = `bilano_notif_${todayStr}_evening`;
                title = "🌇 Tinjauan Finansial Sore";
                body = "Aktivitas sore selesai! Yuk cek & rekap pengeluaran harianmu sebelum malam.";
            } else if (hour >= 20 && hour < 23) {
                sessionKey = `bilano_notif_${todayStr}_night`;
                title = "🌙 Rekap Keuangan Malam";
                body = "Luangkan 1 menit untuk evaluasi arus kas & kesehatan finansialmu hari ini.";
            }

            if (sessionKey && !localStorage.getItem(sessionKey)) {
                localStorage.setItem(sessionKey, "true");

                const options: NotificationOptions = {
                    body,
                    icon: "/BILANO-ICON-NEW.png",
                    badge: "/BILANO-ICON-NEW.png",
                    tag: sessionKey,
                    renotify: false
                };

                if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then((reg) => {
                        reg.showNotification(title, options as any);
                    }).catch(() => {
                        try { new Notification(title, options); } catch (e) {}
                    });
                } else {
                    try { new Notification(title, options); } catch (e) {}
                }
            }
        };

        // Cek pengingat 5 detik setelah aplikasi dibuka
        const timeoutId = setTimeout(checkAndSendReminder, 5000);

        // Dan cek secara berkala setiap 15 menit jika tab / PWA tetap aktif
        const intervalId = setInterval(checkAndSendReminder, 15 * 60 * 1000);

        return () => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
        };
    }, []);
}