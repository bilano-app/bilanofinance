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

// Jam-jam tertentu untuk notifikasi (Format 24 Jam)
const TARGET_HOURS = [8, 12, 20]; // Pagi, Siang, Malam

export function useNotifications() {
    useEffect(() => {
        const checkAndSendNotification = async () => {
            // Pastikan izin sudah dikasih oleh user
            if ("Notification" in window && Notification.permission === "granted") {
                const now = new Date();
                const currentHour = now.getHours();
                const todayDate = now.toLocaleDateString();
                
                const lastNotifData = JSON.parse(localStorage.getItem("bilano_notif_log") || "{}");

                // Cek apakah jam saat ini adalah jam target DAN belum dikirim hari ini pada jam tersebut
                if (TARGET_HOURS.includes(currentHour) && lastNotifData[todayDate] !== currentHour) {
                    const randomMsg = NOTIF_MESSAGES[Math.floor(Math.random() * NOTIF_MESSAGES.length)];

                    try {
                        let sent = false;

                        // Coba pakai OneSignal SDK jika terdeteksi di global window
                        if (window.OneSignal && typeof window.OneSignal.showNotification === 'function') {
                           // Biarkan OneSignal yang handle jika memungkinkan (opsional frontend SDK)
                           console.log("OneSignal terdeteksi di frontend.");
                        }

                        if ('serviceWorker' in navigator && !sent) {
                            // Ambil paksa semua Service Worker, dan gunakan yang paling aktif!
                            const registrations = await navigator.serviceWorker.getRegistrations();
                            const activeReg = registrations.find(reg => reg.active) || registrations[0];

                            if (activeReg && 'showNotification' in activeReg) {
                                // Dibungkus try-catch spesifik karena OneSignal SW sering melempar error disini
                                try {
                                    await activeReg.showNotification("BILANO Finance", {
                                        body: randomMsg,
                                        icon: "/BILANO-ICON.png",
                                        badge: "/BILANO-ICON.png",
                                        vibrate: [200, 100, 200],
                                        tag: "bilano-reminder", // Mencegah notif menumpuk
                                        requireInteraction: true
                                    });
                                    sent = true;
                                } catch (swError) {
                                    console.warn("Service Worker diblokir (kemungkinan oleh OneSignal), mencoba fallback...", swError);
                                }
                            }
                        }

                        // 🛡️ FALLBACK: Kalau Service Worker benar-benar mati/dibajak, pakai notif klasik!
                        if (!sent) {
                            new Notification("BILANO Finance", {
                                body: randomMsg,
                                icon: "/BILANO-ICON.png",
                                tag: "bilano-reminder"
                            });
                        }

                        // Catat log pengiriman agar tidak spam di jam yang sama
                        localStorage.setItem("bilano_notif_log", JSON.stringify({ [todayDate]: currentHour }));

                    } catch (e) {
                        console.error("Gagal menembak notifikasi PWA:", e);
                    }
                }
            }
        };

        // Tunggu 3 detik setelah buka app baru dicek (agar tidak lag)
        const initialTimer = setTimeout(checkAndSendNotification, 3000);

        // Radar mengecek setiap 1 menit (karena kita mengecek berdasarkan Jam, tidak perlu per 30 detik)
        const interval = setInterval(checkAndSendNotification, 60000);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
    }, []);
}