import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def process_direct():
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL hilang di .env!")
        return

    FOLDER_BUKU = "books_source"

    LIBRARY_CONFIG = {
        "Extraordinary Popular Delusions and the Madness of Crowds.txt": {
            "title": "Extraordinary Popular Delusions and the Madness of Crowds",
            "author": "Charles Mackay",
            "description": "Buku legendaris yang membedah psikologi massa, gelembung spekulasi, dan bagaimana manusia mudah tertipu oleh tren pasar sesaat.",
            "cover_url": "https://www.gutenberg.org/cache/epub/24518/pg24518.cover.medium.jpg" # CONTOH LINK COVER DARI GUTENBERG
        }
    }

    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    print("🔌 Berhasil terhubung langsung ke Database PostgreSQL!")

    for filename, metadata in LIBRARY_CONFIG.items():
        file_path = os.path.join(FOLDER_BUKU, filename)
        if not os.path.exists(file_path):
            continue

        with open(file_path, 'r', encoding='utf-8') as f:
            core_text = f.read().strip()

        paragraphs = re.split(r'\n\s*\n', core_text)
        valid_chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            clean_p = p.strip()
            if not clean_p: continue
            current_chunk += clean_p + "\n\n"
            # Ukuran diperbesar ke 4000 karakter karena kita tidak memanggil API limit
            if len(current_chunk) >= 4000:
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

        # BARIS DELETE LAMA SUDAH DIHAPUS AGAR BISA RESUME KAPAN SAJA

        for index, text_chunk in enumerate(valid_chunks, start=1):
            
            # FITUR RESUME: Cek apakah bagian ini sudah sukses masuk database sebelumnya
            cursor.execute("SELECT id FROM ebook_chapters WHERE ebook_id = %s AND chapter_number = %s;", (ebook_id, index))
            if cursor.fetchone():
                print(f"⏩ Bagian {index} sudah aman di database, skip...")
                continue

            print(f"[{metadata['title']}] Menyimpan Bagian {index}/{len(valid_chunks)}...")
            
            try:
                cursor.execute(
                    """
                    INSERT INTO ebook_chapters (ebook_id, chapter_number, title, content)
                    VALUES (%s, %s, %s, %s);
                    """,
                    (ebook_id, index, f"Bagian {index}", text_chunk)
                )
                conn.commit()
                print(f"  ✅ Sukses tertulis di Database!")
            except Exception as e:
                print(f"  ❌ Gagal pada Bagian {index}: {e}")
                conn.rollback()
                break 

    cursor.close()
    conn.close()
    print("\n🎉 SELESAI TOTAL! Semua data masuk murni.")

if __name__ == "__main__":
    process_direct()