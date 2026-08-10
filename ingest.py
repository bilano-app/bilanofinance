import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

TARGET_BUKU = {
    "file": "the Wealth of Nations.txt",
    "title": "The Wealth of Nations",
    "author": "Adam Smith",
    "description": "Karya monumental Adam Smith tentang fondasi ekonomi pasar bebas.",
    "cover_url": "/Cover/Cover/Wealth.jpg",
    "is_premium": True
}

def find_file(filename):
    for root, dirs, files in os.walk(os.getcwd()):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.git' in dirs: dirs.remove('.git')
        if filename in files: return os.path.join(root, filename)
    return None

def process():
    file_path = find_file(TARGET_BUKU["file"])
    if not file_path:
        return print("❌ File tidak ditemukan.")

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    # Hapus Lisensi Gutenberg
    start_m = re.search(r"\*\*\* START OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_m: text = text[start_m.end():]
    end_m = re.search(r"\*\*\* END OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_m: text = text[:end_m.start()]

    text = text.strip()

    # 🔥 TRIK MENGAMANKAN DAFTAR ISI:
    # Samarkan kata "BAB" dan "BUKU" di 3500 karakter pertama (area daftar isi)
    # Agar skrip tidak mencincang daftar isi menjadi bab-bab palsu.
    area_daftar_isi = text[:3500]
    area_naskah_asli = text[3500:]
    
    area_daftar_isi = area_daftar_isi.replace("BUKU", "Bag-Buku").replace("BAB", "Bag-Bab")
    text_aman = area_daftar_isi + area_naskah_asli

    # Sekarang aman untuk dipotong berdasarkan BAB / BUKU
    pattern = r'(?=\n+(?:BUKU|BOOK|CHAPTER|BAB|PART|SECTION)\s+[IVXLCDM0-9]+)'
    raw_chapters = re.split(pattern, "\n\n" + text_aman, flags=re.IGNORECASE)

    chapters = []
    chap_num = 1
    for ch in raw_chapters:
        ch_t = ch.strip()
        if len(ch_t) < 50: continue
        
        # Kembalikan lagi teks daftar isi ke bentuk aslinya (opsional untuk estetika)
        ch_t = ch_t.replace("Bag-Buku", "BUKU").replace("Bag-Bab", "BAB")
        
        title = ch_t.split('\n')[0].strip()[:100]
        chapters.append({"chapter_number": chap_num, "title": title, "content": ch_t})
        chap_num += 1

    # MASUKKAN KE DATABASE
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM ebooks WHERE title ILIKE %s LIMIT 1;", (f"%{TARGET_BUKU['title']}%",))
    row = cursor.fetchone()
    
    if row:
        ebook_id = row[0]
        cursor.execute("DELETE FROM ebook_chapters WHERE ebook_id = %s;", (ebook_id,))
    else:
        cursor.execute("INSERT INTO ebooks (title, author, description, cover_url, is_premium) VALUES (%s, %s, %s, %s, %s) RETURNING id;", 
                       (TARGET_BUKU["title"], TARGET_BUKU["author"], TARGET_BUKU["description"], TARGET_BUKU["cover_url"], TARGET_BUKU["is_premium"]))
        ebook_id = cursor.fetchone()[0]

    for ch in chapters:
        cursor.execute("INSERT INTO ebook_chapters (ebook_id, chapter_number, title, content) VALUES (%s, %s, %s, %s);", 
                       (ebook_id, ch["chapter_number"], ch["title"], ch["content"]))

    conn.commit()
    cursor.close()
    conn.close()
    print(f"🎉 SUKSES! 'The Wealth of Nations' dirapikan jadi {len(chapters)} bagian.")

if __name__ == "__main__":
    process()