// =======================================================
// 🕵️ DETEKSI IN-APP BROWSER & PLATFORM
// Dipakai untuk menangani kasus link Bilano dibuka dari dalam
// webview Instagram/Facebook, di mana PWA TIDAK BISA diinstall
// sama sekali (event beforeinstallprompt tidak pernah muncul
// di dalam webview pihak ketiga - ini batasan browser, bukan bug).
// =======================================================

export function isInAppBrowser(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    // Instagram -> "Instagram" di UA
    // Facebook   -> "FBAN" / "FBAV" / "FB_IAB"
    // Line       -> "Line/"
    return /Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(ua);
}

export function isIOS(): boolean {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isAppleMobileUA = /iPhone|iPad|iPod/i.test(ua);
    // iPadOS 13+ menyamar sebagai "Macintosh" di UA, bedanya ada touch point
    const isModernIpad = navigator.platform === "MacIntel" && (navigator as any).maxTouchPoints > 1;
    return isAppleMobileUA || isModernIpad;
}

export function isAndroid(): boolean {
    if (typeof navigator === "undefined") return false;
    return /Android/i.test(navigator.userAgent);
}

/**
 * Membangun intent:// URL agar tab yang sedang terbuka di webview
 * Instagram/Facebook di Android dipindah paksa ke Chrome asli.
 * Menambahkan penanda ?src=ig_redirect supaya begitu mendarat di
 * Chrome, halaman tahu bahwa user baru saja berhasil "kabur" dari
 * webview dan bisa langsung menyapa dengan pesan lanjutan.
 *
 * Tidak ada versi iOS untuk fungsi ini - Apple sengaja tidak
 * mengizinkan aplikasi pihak ketiga memindahkan tab browser secara
 * paksa di iOS, jadi di iOS harus tetap manual (lihat modal "Buka di
 * Browser Dulu" di Landing.tsx).
 */
export function buildChromeIntentUrl(targetUrl: string, redirectMarker = "ig_redirect"): string {
    const url = new URL(targetUrl);
    url.searchParams.set("src", redirectMarker);
    const fallback = url.toString();
    const withoutScheme = fallback.replace(/^https?:\/\//, "");
    return `intent://${withoutScheme}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}