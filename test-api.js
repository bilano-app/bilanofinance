const APP_ID = "b45b3256-b290-4a98-b5fa-afa0501a6b1c";

// Kunci Anda yang ada karakter hantunya
const REST_KEY = "os_v2_app_wrntevvssbfjrnp2v6qfagtldryge6syz5fedgfg3hr3tv5ia7nvdfbb764wp7tcoasbfisq4jerw2esxhhdt5ahxfsv6cehlms3yhy";

// SINAR LASER: Hancurkan APAPUN selain huruf (a-z), angka (0-9), dan garis bawah (_)
const cleanKey = REST_KEY.replace(/[^a-zA-Z0-9_]/g, '');

async function tembakOneSignal() {
    console.log("1. Panjang Kunci Super Bersih:", cleanKey.length, "karakter (SEKARANG PASTI 112)");
    
    const headerAuth = `Key ${cleanKey}`;
    console.log("2. Format Header:", headerAuth.substring(0, 15) + "...");

    try {
        const response = await fetch("https://onesignal.com/api/v1/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": headerAuth
            },
            body: JSON.stringify({
                app_id: APP_ID,
                included_segments: ["Total Subscriptions"], 
                headings: { "en": "Tes Debug Lokal 🚀" },
                contents: { "en": "Akhirnya Siluman Spasi Berhasil Dikalahkan!" }
            })
        });

        const data = await response.json();
        console.log("\n3. HASIL DARI ONESIGNAL:");
        console.log(data);
    } catch (error) {
        console.error("Gagal Request:", error);
    }
}

tembakOneSignal();