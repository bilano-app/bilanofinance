import { useEffect } from "react";

// Variasi pesan notifikasi dengan bahasa kasual/asik
const NOTIF_MESSAGES = [
    "Halo Bos! Duit aman? Jangan lupa catat pengeluaran hari ini ya! 💸",
    "Waktunya ngecek dompet! Ada jajan yang belum dicatat? 🤔",
    "BILANO kangen nih. Yuk update catatan keuanganmu biar target aman! 🚀",
    "Hari ini udah nabung atau malah boncos? Yuk catat dulu! 📊",
    "Ada struk nganggur? Jangan lupa masukin ke BILANO ya! 🧾",
    "Cek target keuanganmu yuk! Sedikit lagi kecapai tuh! 🎯",
    "Satu langkah kecil mencatat, satu lompatan besar buat masa depanmu! ✨",
    "Lagi ngopi santai? Masukin pengeluarannya ke BILANO yuk biar AI bisa nganalisa! ☕"
];

export function useNotifications() {
    useEffect(() => {
        // 1. Minta Izin ke HP Pengguna untuk mengirim Notifikasi
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        const checkAndSendNotification = () => {
            if ("Notification" in window && Notification.permission === "granted") {
                const lastNotif = localStorage.getItem("bilano_last_notif");
                const now = Date.now();
                
                // Waktu Jeda: 5 Jam (5 jam * 60 menit * 60 detik * 1000 milidetik)
                const FIVE_HOURS = 5 * 60 * 60 * 1000; 

                // Jika belum pernah dikirim, ATAU sudah lewat 5 jam dari notif terakhir
                if (!lastNotif || now - parseInt(lastNotif) >= FIVE_HOURS) {
                    // Pilih pesan acak dari daftar di atas
                    const randomMsg = NOTIF_MESSAGES[Math.floor(Math.random() * NOTIF_MESSAGES.length)];

                    // Tembak Notifikasi ke HP!
                    new Notification("BILANO Finance", {
                        body: randomMsg,
                        icon: "/BILANO-ICON.png",
                        badge: "/BILANO-ICON.png",
                        vibrate: [200, 100, 200] // HP akan bergetar
                    });

                    // Catat waktu notifikasi ini dikirim ke database HP
                    localStorage.setItem("bilano_last_notif", now.toString());
                }
            }
        };

        // 2. Langsung cek saat aplikasi pertama kali dibuka
        checkAndSendNotification();

        // 3. Pasang Alarm Latar Belakang (Mengecek setiap 1 menit)
        const interval = setInterval(checkAndSendNotification, 60000);

        return () => clearInterval(interval);
    }, []);
}