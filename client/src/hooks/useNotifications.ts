import { useEffect } from "react";

export function useNotifications() {
    useEffect(() => {
        if (typeof window === "undefined") return;

        // 1. Pastikan Service Worker terdaftar untuk menangani Push Notifikasi di Background
        if ("serviceWorker" in navigator) {
            navigator.serviceWorker.register("/sw.js").then((reg) => {
                // Service worker siap menerima push background
            }).catch((err) => {
                console.log("SW Registration notice:", err);
            });
        }

        // 2. Sinkronkan ID OneSignal ke database user jika sudah diizinkan
        try {
            const syncPushId = () => {
                const OneSignal = (window as any).OneSignal;
                if (OneSignal && OneSignal.User && OneSignal.User.PushSubscription) {
                    const subId = OneSignal.User.PushSubscription.id;
                    if (subId) {
                        const email = localStorage.getItem("bilano_email") || "guest";
                        fetch("/api/user/onesignal", {
                            method: "POST",
                            headers: { "Content-Type": "application/json", "x-user-email": email },
                            body: JSON.stringify({ onesignalId: subId })
                        }).catch(() => {});
                    }
                }
            };

            const OneSignalDeferred = ((window as any).OneSignalDeferred = (window as any).OneSignalDeferred || []);
            OneSignalDeferred.push(function (OneSignal: any) {
                syncPushId();
                if (OneSignal.User && OneSignal.User.PushSubscription) {
                    OneSignal.User.PushSubscription.addEventListener("change", function () {
                        syncPushId();
                    });
                }
            });
        } catch (e) {
            // Abaikan error background push init
        }
    }, []);
}