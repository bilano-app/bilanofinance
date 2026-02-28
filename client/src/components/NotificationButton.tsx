import { useState } from 'react';

export default function NotificationButton() {
    const [status, setStatus] = useState("🔔 Aktifkan Notifikasi Otomatis");

    // Fungsi wajib untuk menerjemahkan kunci rahasia
    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const aktifkan = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            alert("Maaf, browser ini tidak mendukung notifikasi otomatis.");
            return;
        }

        try {
            setStatus("Meminta izin...");
            
            // 1. Minta Izin Pop-up ke Pengguna
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                alert("Izin ditolak. Anda bisa mengaktifkannya lewat ikon gembok di sebelah link website.");
                setStatus("🔔 Aktifkan Notifikasi Otomatis");
                return;
            }

            // 2. Bangunkan Service Worker (sw.js)
            const register = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;

            // 3. Buat Tiket Langganan (PASTE PUBLIC KEY ANDA DI SINI)
            const publicVapidKey = 'BPrOUqqkMk4GUjKpAc6M4rxub3VNoUoVVoi56BdDkQYoC5Yo04f8r9sll_4JGTTrOYSaEZhQ8kElCs-0D3DCmOI';
            
            const subscription = await register.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
            });

            // 4. Kirim Tiket ke Server BILANO (Vercel)
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: { 'Content-Type': 'application/json' }
            });

            setStatus("✅ Notifikasi Aktif!");
            alert("Mantap Bos! HP ini sekarang akan menerima pengingat otomatis dari BILANO.");
        } catch (error) {
            console.error("Gagal:", error);
            setStatus("❌ Gagal, coba lagi");
        }
    };

    return (
        <button 
            onClick={aktifkan}
            disabled={status === "✅ Notifikasi Aktif!"}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
            {status}
        </button>
    );
}