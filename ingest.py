import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Metadata Resmi Buku
TARGET_BUKU = {
    "file": "The Science of Getting Rich.txt",
    "title": "The Science of Getting Rich",
    "author": "Wallace D. Wattles",
    "description": "Panduan klasik filosofis dan praktis tentang cara mengubah pola pikir serta tindakan untuk menarik kemakmuran finansial.",
    "cover_url": "/Cover/Cover/Science.jpg",
    "is_premium": False
}

def find_file(filename):
    """Mencari file naskah .txt secara otomatis di dalam folder proyek."""
    search_root = os.getcwd()
    for root, dirs, files in os.walk(search_root):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.git' in dirs: dirs.remove('.git')
        if filename in files:
            return os.path.join(root, filename)
    return None

def clean_and_split_science(text):
    """Membersihkan lisensi Gutenberg, merapikan paragraf, dan memotong bab secara presisi."""
    # 1. Bersihkan sisa simbol markdown **
    text = text.replace('**', '')

    # 2. Potong Header Lisensi Gutenberg
    start_match = re.search(r"\*\*\* AWAL DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not start_match:
        start_match = re.search(r"\*\*\* START OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_match:
        text = text[start_match.end():]

    # 3. Potong Footer Lisensi Gutenberg
    end_match = re.search(r"\*\*\* AKHIR DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not end_match:
        end_match = re.search(r"\*\*\* END OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_match:
        text = text[:end_match.start()]

    text = text.strip()

    # 4. Potong Berdasarkan Penanda BAB / CHAPTER
    pattern = r'(?=\n+(?:BAB|CHAPTER)\s+[IVXLCDM0-9]+)'
    raw_sections = re.split(pattern, "\n\n" + text, flags=re.IGNORECASE)

    chapters = []
    chap_num = 1

    for sec in raw_sections:
        sec_clean = sec.strip()
        if len(sec_clean) < 50:
            continue

        # 5. Un-wrap Paragraf: Menyatu-padukan baris terputus dalam 1 paragraf
        paragraphs = re.split(r'\n\s*\n', sec_clean)
        clean_paragraphs = []
        for p in paragraphs:
            p_inline = re.sub(r'\s+', ' ', p.strip())
            if p_inline:
                clean_paragraphs.append(p_inline)

        final_content = "\n\n".join(clean_paragraphs)

        # 6. Tentukan Judul Bab
        first_line = clean_paragraphs[0] if clean_paragraphs else f"Bab {chap_num}"
        if len(first_line) > 100:
            title = f"Bab {chap_num}"
        else:
            title = first_line

        chapters.append({
            "chapter_number": chap_num,
            "title": title,
            "content": final_content
        })
        chap_num += 1

    return chapters

def run():
    if not DATABASE_URL:
        print("❌ DATABASE_URL tidak ditemukan di file .env!")
        return

    file_path = find_file(TARGET_BUKU["file"])
    if not file_path:
        print(f"❌ File '{TARGET_BUKU['file']}' tidak ditemukan di folder proyek!")
        return

    print(f"📖 Membaca & memproses file: {file_path}")
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw_text = f.read()

    chapters = clean_and_split_science(raw_text)
    print(f"✂️ Berhasil memecah naskah menjadi {len(chapters)} bab/bagian rapi.")

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()

        # Cek apakah buku sudah ada di database
        cursor.execute("SELECT id FROM ebooks WHERE title ILIKE %s LIMIT 1;", (f"%{TARGET_BUKU['title']}%",))
        row = cursor.fetchone()

        if row:
            ebook_id = row[0]
            print(f"🔄 Memperbarui buku ID {ebook_id}: Menghapus bab lama...")
            cursor.execute("DELETE FROM ebook_chapters WHERE ebook_id = %s;", (ebook_id,))
            cursor.execute("""
                UPDATE ebooks 
                SET author = %s, description = %s, cover_url = %s, is_premium = %s 
                WHERE id = %s;
            """, (TARGET_BUKU["author"], TARGET_BUKU["description"], TARGET_BUKU["cover_url"], TARGET_BUKU["is_premium"], ebook_id))
        else:
            print("✨ Menambahkan buku baru ke database...")
            cursor.execute("""
                INSERT INTO ebooks (title, author, description, cover_url, is_premium)
                VALUES (%s, %s, %s, %s, %s) RETURNING id;
            """, (TARGET_BUKU["title"], TARGET_BUKU["author"], TARGET_BUKU["description"], TARGET_BUKU["cover_url"], TARGET_BUKU["is_premium"]))
            ebook_id = cursor.fetchone()[0]

        for ch in chapters:
            cursor.execute("""
                INSERT INTO ebook_chapters (ebook_id, chapter_number, title, content)
                VALUES (%s, %s, %s, %s);
            """, (ebook_id, ch["chapter_number"], ch["title"], ch["content"]))

        conn.commit()
        cursor.close()
        conn.close()
        print(f"\n🎉 SUKSES! Buku '{TARGET_BUKU['title']}' berhasil di-ingest ({len(chapters)} bab tersusun ideal).")

    except Exception as e:
        print(f"❌ Error Database: {e}")

if __name__ == "__main__":
    run()