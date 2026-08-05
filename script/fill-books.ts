import fetch from "node-fetch";

// Konfigurasi target server Bilano Anda
const SERVER_URL = "http://localhost:5173";
const ADMIN_EMAIL = "adrienfandra14@gmail.com"; 

// Data teks mentah bahasa Inggris (Anda bisa salin dari Project Gutenberg)
// Di bawah ini adalah contoh struktur data untuk otomatisasi loop
const bookDataToIngest = [
  {
    title: "Kekayaan Bangsa-Bangsa (The Wealth of Nations)",
    author: "Adam Smith",
    description: "Karya fundamental yang mendekonstruksi lahirnya pasar bebas, konsep 'tangan tak terlihat', dan dasar ekonomi kapitalis modern.",
    isPremium: true,
    chapters: [
      {
        number: 2,
        titleEn: "Chapter 2: Of the Principle which gives Occasion to the Division of Labour",
        textEn: "This division of labour, from which so many advantages are derived, is not originally the effect of any human wisdom, which foresees and intends that general opulence to which it gives occasion. It is the necessary, though very slow and gradual consequence of a certain propensity in human nature..."
      },
      {
        number: 3,
        titleEn: "Chapter 3: That the Division of Labour is Limited by the Extent of the Market",
        textEn: "As it is the power of exchanging that gives occasion to the division of labour, so the extent of this division must always be limited by the extent of that power, or, in other words, by the extent of the market..."
      }
      // Tambahkan bab-bab selanjutnya di sini...
    ]
  }
];

async function startIngestion() {
    console.log("🚀 Memulai proses sinkronisasi dan penerjemahan buku via AI...");
    
    for (const book of bookDataToIngest) {
        console.log(`\n📚 Memproses Buku: ${book.title}`);
        
        for (const chapter of book.chapters) {
            console.log(`⏳ Menerjemahkan Bab ${chapter.number}: ${chapter.titleEn}...`);
            
            try {
                const response = await fetch(`${SERVER_URL}/api/admin/ebooks/ingest`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-user-email": ADMIN_EMAIL
                    },
                    body: JSON.stringify({
                        title: book.title,
                        author: book.author,
                        description: book.description,
                        isPremium: book.isPremium,
                        chapterNumber: chapter.number,
                        chapterTitleEn: chapter.titleEn,
                        rawTextEn: chapter.textEn
                    })
                });
                
                // BACA SEBAGAI TEKS MENTAH DULU AGAR TIDAK CRASH
                const rawText = await response.text(); 
                
                if (!response.ok) {
                    console.error(`❌ Server menolak (Status ${response.status}): ${rawText}`);
                    continue; // Lanjut ke bab berikutnya jika ini gagal
                }

                try {
                    const result = JSON.parse(rawText);
                    if (result.success) {
                        console.log(`✅ Sukses: ${result.message}`);
                    } else {
                        console.error(`❌ Gagal di server: ${result.error}`);
                    }
                } catch (parseError) {
                    console.error(`❌ Balasan server kosong/terputus. Teks mentah:`, rawText);
                }

            } catch (error: any) {
                console.error(`❌ Gagal koneksi ke server: ${error.message}`);
            }
            
            // Beri jeda 2 detik per bab agar API Gemini tidak terkena Rate Limit (anti-spam)
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    console.log("\n🎉 Seluruh bab e-book telah lengkap dan siap dibaca di Bilano!");
}

startIngestion();