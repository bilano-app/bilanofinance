import { useEffect } from 'react';

export function useNotifications() {
  useEffect(() => {
    // 1. Cek apakah perangkat mendukung notifikasi
    if (!("Notification" in window)) return;

    const checkAndNotify = () => {
      // 2. Hanya jalankan jika izin sudah diberikan (Granted)
      if (Notification.permission === "granted") {
        const lastNotif = localStorage.getItem("bilano_last_notif");
        const now = Date.now();
        
        // --- PENGATURAN DURASI ---
        // 5 Menit = 5 * 60 detik * 1000 milidetik = 300.000 ms
        // (Jika mau dikembalikan ke 5 jam nanti, ganti jadi: 5 * 60 * 60 * 1000)
        const INTERVAL = 5 * 60 * 1000; 

        // 3. Cek apakah sudah lewat 5 menit dari notif terakhir
        if (!lastNotif || now - parseInt(lastNotif) > INTERVAL) {
          
          // 4. Tembakkan Notifikasi!
          new Notification("Waktunya Cek Dompet! 💰", {
            body: "Sudah 5 menit berlalu. Ada pengeluaran atau pemasukan yang belum dicatat?",
            icon: "/BILANO-ICON.png",
            badge: "/BILANO-ICON.png" // Icon kecil untuk Android
          });

          // 5. Catat waktu notifikasi terakhir agar tidak spam
          localStorage.setItem("bilano_last_notif", now.toString());
        }
      }
    };

    // Jalankan pengecekan pertama kali saat aplikasi dibuka
    checkAndNotify();

    // Pasang radar yang mengecek setiap 1 menit (60.000 ms)
    // untuk memastikan notif tetap muncul jika HP dibiarkan menyala
    const intervalId = setInterval(checkAndNotify, 60000);

    // Bersihkan radar jika komponen ditutup
    return () => clearInterval(intervalId);
  }, []);
}