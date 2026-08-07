import os
import re
import time
import psycopg2
from dotenv import load_dotenv
import google.generativeai as genai

# 1. Load string koneksi database langsung dari file .env lu
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# 2. MASUKKAN GEMINI API KEY LU DI SINI
GEMINI_API_KEY = os.getenv("GEMINI_INGEST_KEY")

genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel('gemini-2.5-flash')

FOLDER_BUKU = "books_source"

# 🔥 SEKARANG DAFTAR BUKUNYA UDAH LENGKAP SEMUA DI SINI!
LIBRARY_CONFIG = {
    "the Wealth of Nations.txt": {
        "title": "The Wealth of Nations",
        "author": "Adam Smith",
        "description": "Buku klasik tentang ekonomi makro fundamental yang merevolusi cara dunia memandang pasar bebas."
    },
    "Lombard Street - A Description of the Money Market.txt": {
        "title": "Lombard Street",
        "author": "Walter Bagehot",
        "description": "Membedah cara kerja pasar uang dan perbankan modern. (Sumber naskah: Project Gutenberg)"
    },
    "Extraordinary Popular Delusions and the Madness of Crowds.txt": {
        "title": "Extraordinary Popular Delusions and the Madness of Crowds",
        "author": "Charles Mackay",
        "description": "Studi mendalam tentang psikologi pasar dan gelembung spekulasi. (Sumber naskah: Project Gutenberg)"
    },
    "The art of money getting.txt": {
        "title": "The Art of Money Getting",
        "author": "P. T. Barnum",
        "description": "Aturan emas mengenai manajemen keuangan pribadi. (Sumber naskah: Project Gutenberg)"
    }
}

def process_direct():
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL tidak ditemukan di file .env lu! Periksa file .env.")
        return

    # KONEKSI LANGSUNG KE POSTGRESQL (TANPA LEWAT VERCEL API)
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    print("🔌 Berhasil terhubung langsung ke Database PostgreSQL lu!")

    for filename, metadata in LIBRARY_CONFIG.items():
        file_path = os.path.join(FOLDER_BUKU, filename)
        if not os.path.exists(file_path):
            print(f"⚠️ File {filename} tidak ada di folder '{FOLDER_BUKU}'. Skip ke buku berikutnya.")
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            full_text = f.read()

        start_match = re.search(r'\*\*\*\s*START OF .*?\*\*\*', full_text)
        end_match = re.search(r'\*\*\*\s*END OF .*?\*\*\*', full_text)
        core_text = full_text[start_match.end():end_match.start()].strip() if start_match and end_match else full_text.strip()

        paragraphs = re.split(r'\n\s*\n', core_text)
        valid_chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            clean_p = p.strip()
            if not clean_p: continue
            current_chunk += clean_p + "\n\n"
            if len(current_chunk) >= 3000:
                valid_chunks.append(current_chunk.strip())
                current_chunk = ""
        if current_chunk: 
            valid_chunks.append(current_chunk.strip())

        print(f"\n📚 Memproses: {metadata['title']} ({len(valid_chunks)} Bagian)")

        # Pastikan data buku ada di tabel ebooks
        cursor.execute(
            "INSERT INTO ebooks (title, author, description, \"isPremium\") VALUES (%s, %s, %s, %s) ON CONFLICT DO NOTHING RETURNING id;",
            (metadata["title"], metadata["author"], metadata["description"], False)
        )
        conn.commit()
        
        cursor.execute("SELECT id FROM ebooks WHERE title = %s;", (metadata["title"],))
        res = cursor.fetchone()
        ebook_id = res[0] if res else 1

        # KITA BERSIHKAN DATA SAMPAH/ERROR YANG SEBELUMNYA NYANGKUT DI DATABASE UNTUK BUKU INI
        print(f"🧹 Membersihkan data bab lama yang error untuk buku: {metadata['title']}...")
        cursor.execute("DELETE FROM ebook_chapters WHERE \"ebookId\" = %s;", (ebook_id,))
        conn.commit()

        # LOOP TRANSLATE & INSERT
        for index, text_chunk in enumerate(valid_chunks, start=1):
            print(f"[{metadata['title']}] Menerjemahkan & Menyimpan Bagian {index}/{len(valid_chunks)}...")
            
            prompt = (
                "[PERINTAH KETAT: TERJEMAHKAN SELURUH TEKS BERIKUT KE BAHASA INDONESIA SECARA AKURAT KATA DEMI KATA. "
                "DILARANG KERAS MERINGKAS ATAU MEMOTONG ISI. JANGAN MENAMBAHKAN JUDUL BAB BARU. JANGAN MENGGUNAKAN FORMAT MARKDOWN BINTANG ATAU PAGAR. "
                "LANGSUNG KELUARKAN HASIL TERJEMAHAN UTUH NYA]\n\n" + text_chunk
            )

            try:
                # Panggilan AI dilakukan di laptop lu (Bebas dari limit 10 detik Vercel)
                response = model.generate_content(prompt)
                translated_text = response.text

                # Nembak langsung ke tabel database lu
                cursor.execute(
                    """
                    INSERT INTO ebook_chapters (\"ebookId\", \"chapterNumber\", \"chapterTitleEn\", \"rawTextEn\")
                    VALUES (%s, %s, %s, %s);
                    """,
                    (ebook_id, index, f"Bagian {index}", translated_text)
                )
                conn.commit()
                print(f"  ✅ Sukses murni tertulis di Database!")
            except Exception as e:
                print(f"  ❌ Gagal pada Bagian {index}: {e}")
                conn.rollback()

            # Jeda 4 detik biar gak kena rate limit dari Google API gratisan
            time.sleep(4)

    cursor.close()
    conn.close()
    print("\n🎉 SELESAI TOTAL! Semua data masuk murni dan bersih tanpa perantara Vercel.")

if __name__ == "__main__":
    process_direct()