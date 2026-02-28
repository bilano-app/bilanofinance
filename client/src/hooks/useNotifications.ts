import { useEffect } from "react";

// Variasi pesan notifikasi dengan bahasa kasual/asik
const NOTIF_MESSAGES = [
    "Halo Bos! Duit aman? Jangan lupa catat pengeluaran hari ini ya! 💸",
    "Waktunya ngecek dompet! Ada jajan yang belum dicatat? 🤔",
    "BILANO kangen nih. Yuk update catatan keuanganmu biar target aman! 🚀",
    "Hari ini udah nabung atau malah boncos? Yuk catat dulu! 📊",
    "Ada struk nganggur? Jangan lupa masukin ke BILANO ya! 🧾",
    "Satu langkah kecil mencatat, satu lompatan besar buat masa depanmu! ✨",
    "Lagi ngopi santai? Masukin pengeluarannya ke BILANO yuk biar AI bisa nganalisa! ☕"
];

export function useNotifications() {
    useEffect(() => {
        const checkAndSendNotification = () => {
            // Pastikan izin sudah dikasih oleh user
            if ("Notification" in window && Notification.permission === "granted") {
                const lastNotif = localStorage.getItem("bilano_last_notif");
                const now = Date.now();
                
                // Waktu Jeda: 5 Menit (5 * 60 * 1000)
                const FIVE_MINUTES = 5 * 60 * 1000; 

                // Jika belum pernah dikirim, ATAU sudah lewat 5 menit
                if (!lastNotif || now - parseInt(lastNotif) >= FIVE_MINUTES) {
                    const randomMsg = NOTIF_MESSAGES[Math.floor(Math.random() * NOTIF_MESSAGES.length)];

                    try {
                        // Tembak Notifikasi ke Layar!
                        new Notification("BILANO Finance", {
                            body: randomMsg,
                            icon: "/BILANO-ICON.png",
                            badge: "/BILANO-ICON.png"
                        });
                        
                        // Catat waktu di memori HP
                        localStorage.setItem("bilano_last_notif", now.toString());
                    } catch (e) {
                        console.error("Gagal menembak notifikasi:", e);
                    }
                }
            }
        };

        // Tunggu 3 detik setelah buka app baru dicek (agar tidak lag)
        const initialTimer = setTimeout(checkAndSendNotification, 3000);

        // Radar mengecek setiap 30 detik
        const interval = setInterval(checkAndSendNotification, 30000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);
}