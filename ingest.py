import os
import re
import time
import psycopg2
from dotenv import load_dotenv
from google import genai # MENGGUNAKAN SDK TERBARU
from google.genai import errors

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
GEMINI_API_KEY = os.getenv("GEMINI_INGEST_KEY")

def process_direct():
    if not DATABASE_URL or not GEMINI_API_KEY:
        print("❌ ERROR: DATABASE_URL atau GEMINI_INGEST_KEY hilang di .env!")
        return

    # Inisialisasi Client versi GenAI terbaru
    client = genai.Client(api_key=GEMINI_API_KEY)
    FOLDER_BUKU = "books_source"

    LIBRARY_CONFIG = {
        "the Wealth of Nations.txt": {
            "title": "The Wealth of Nations",
            "author": "Adam Smith",
            "description": "Buku klasik tentang ekonomi makro fundamental yang merevolusi cara dunia memandang pasar bebas."
        },
        "Lombard Street - A Description of the Money Market.txt": {
            "title": "Lombard Street",
            "author": "Walter Bagehot",
            "description": "Membedah cara kerja pasar uang dan perbankan modern."
        },
        "Extraordinary Popular Delusions and the Madness of Crowds.txt": {
            "title": "Extraordinary Popular Delusions and the Madness of Crowds",
            "author": "Charles Mackay",
            "description": "Studi mendalam tentang psikologi pasar dan gelembung spekulasi."
        },
        "The art of money getting.txt": {
            "title": "The Art of Money Getting",
            "author": "P. T. Barnum",
            "description": "Aturan emas mengenai manajemen keuangan pribadi."
        }
    }

    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    print("🔌 Berhasil terhubung langsung ke Database PostgreSQL lu!")

    for filename, metadata in LIBRARY_CONFIG.items():
        file_path = os.path.join(FOLDER_BUKU, filename)
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            full_text = f.read()

        start_match = re.search(r'\*\*\*\s*START OF .*?\*\*\*', full_text)
        end_match = re.search(r'\*\*\*\s*END OF .*?\*\*\*', full_text)
        core_text = full_text[start_match.end():end_match.start()].strip() if start_match and end_match else full_text.strip()

        # Membersihkan hard-wrap (enter gantung dari teks asli Gutenberg)
        core_text = re.sub(r'(?<!\n)\n(?!\n)', ' ', core_text)

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

        cursor.execute("SELECT id FROM ebooks WHERE title = %s;", (metadata["title"],))
        res = cursor.fetchone()
        
        if res:
            ebook_id = res[0]
            print(f"📖 Buku '{metadata['title']}' ditemukan dengan ID: {ebook_id}")
        else:
            cursor.execute(
                "INSERT INTO ebooks (title, author, description, is_premium) VALUES (%s, %s, %s, %s) RETURNING id;",
                (metadata["title"], metadata["author"], metadata["description"], False)
            )
            ebook_id = cursor.fetchone()[0]
            conn.commit()

        # 🔥 HAPUS SELURUH BAB LAMA karena format chunking baru membuat susunan teks berbeda
        print(f"🧹 Membersihkan seluruh data bab lama agar terjemahan tidak tumpang tindih...")
        cursor.execute("DELETE FROM ebook_chapters WHERE ebook_id = %s;", (ebook_id,))
        conn.commit()

        for index, text_chunk in enumerate(valid_chunks, start=1):
            print(f"[{metadata['title']}] Menerjemahkan & Menyimpan Bagian {index}/{len(valid_chunks)}...")
            
            prompt = (
                "[PERINTAH KETAT: TERJEMAHKAN SELURUH TEKS BERIKUT KE BAHASA INDONESIA SECARA AKURAT KATA DEMI KATA. "
                "DILARANG KERAS MERINGKAS ATAU MEMOTONG ISI. JANGAN MENAMBAHKAN JUDUL BAB BARU. "
                "PENTING: PERTAHANKAN FORMAT MARKDOWN ASLI SEPERTI **TEBAL** ATAU *MIRING*. "
                "LANGSUNG KELUARKAN HASIL TERJEMAHAN UTUH NYA]\n\n" + text_chunk
            )

            retries = 0
            max_retries = 3
            success = False

            while retries < max_retries:
                try:
                    # Menggunakan metode pemanggilan SDK yang baru
                    response = client.models.generate_content(
                        model='gemini-2.5-flash',
                        contents=prompt
                    )
                    translated_text = response.text

                    cursor.execute(
                        """
                        INSERT INTO ebook_chapters (ebook_id, chapter_number, title, content)
                        VALUES (%s, %s, %s, %s);
                        """,
                        (ebook_id, index, f"Bagian {index}", translated_text)
                    )
                    conn.commit()
                    print(f"  ✅ Sukses tertulis di Database!")
                    time.sleep(8) # Jeda aman 8 detik (~7-8 request per menit)
                    success = True
                    break
                    
                except Exception as e:
                    error_msg = str(e)
                    if "429" in error_msg or "quota" in error_msg.lower():
                        retries += 1
                        wait_time = 60 * retries # Tunggu 60s, lalu 120s, lalu 180s
                        print(f"  ⚠️ Limit Quota Terdeteksi! Istirahat {wait_time} detik... (Percobaan {retries}/{max_retries})")
                        time.sleep(wait_time)
                    else:
                        print(f"  ❌ Gagal pada Bagian {index} karena error lain: {e}")
                        conn.rollback()
                        time.sleep(5)
                        break 
            
            if not success:
                print("\n🚨 PROSES DIHENTIKAN: Gagal menembus limit setelah 3 kali percobaan berturut-turut.")
                print("💡 Kemungkinan besar KOTA HARIAN API Anda sudah habis. Silakan gunakan API Key baru atau tunggu 24 jam.")
                cursor.close()
                conn.close()
                return

    cursor.close()
    conn.close()
    print("\n🎉 SELESAI TOTAL! Semua data masuk murni tanpa perantara Vercel.")

if __name__ == "__main__":
    process_direct()