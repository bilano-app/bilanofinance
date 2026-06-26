// Lokasi file: src/lib/tracking.ts

export const trackEvent = async (eventName: string, properties: any = {}) => {
  try {
    // 1. Buat ID unik untuk pengunjung anonim jika belum ada di browser mereka
    let anonymousId = localStorage.getItem("bilano_anon_id");
    if (!anonymousId) {
      anonymousId = "anon_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("bilano_anon_id", anonymousId);
    }

    // 2. Ambil email jika user sudah login (opsional, agar nyambung dengan data user)
    const email = localStorage.getItem("bilano_email");
    const headers: any = { "Content-Type": "application/json" };
    if (email) {
      headers["x-user-email"] = email;
    }

    // 3. Tembak data ke backend secara diam-diam
    fetch("/api/track", {
      method: "POST",
      headers,
      body: JSON.stringify({ anonymousId, eventName, properties }),
      keepalive: true // Mencegah request terputus jika user tiba-tiba pindah halaman/tutup tab
    });
  } catch (error) {
    // Gagal mencatat tidak boleh membuat aplikasi pengguna menjadi error atau macet
    console.error("BILANO Tracking System Error:", error);
  }
};