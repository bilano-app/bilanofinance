import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

TARGET_BUKU = {
    "file": "The Science of Getting Rich.txt",
    "title": "The Science of Getting Rich",
    "author": "Wallace D. Wattles",
    "description": "Panduan filosofis dan praktis tentang cara mengubah pola pikir serta tindakan untuk menarik kemakmuran finansial.",
    "cover_url": "/Cover/Cover/Science.jpg",
    "is_premium": False
}

def find_file(filename):
    for root, dirs, files in os.walk(os.getcwd()):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.git' in dirs: dirs.remove('.git')
        if filename in files: return os.path.join(root, filename)
    return None

def clean_toc_and_frontmatter(text):
    """Merapikan bagian awal (Copyright/Penerbit) dan memformat Daftar Isi dengan elegan."""
    # 1. Bersihkan Lisensi Gutenberg
    start_m = re.search(r"\*\*\* AWAL DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not start_m:
        start_m = re.search(r"\*\*\* START OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_m: text = text[start_m.end():]

    end_m = re.search(r"\*\*\* AKHIR DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not end_m:
        end_m = re.search(r"\*\*\* END OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_m: text = text[:end_m.start()]

    text = text.replace('**', '').strip()

    # 2. Pisahkan Bagian Depan (Daftar Isi & Prakata) dari Bab Utama
    # Mencari titik masuk BAB I pertama
    first_bab = re.search(r'\n+(?:BAB|CHAPTER)\s+I\b', text, re.IGNORECASE)
    
    chapters = []

    if first_bab:
        front_matter = text[:first_bab.start()].strip()
        body_text = text[first_bab.start():].strip()

        # Merapikan Daftar Isi di bagian front matter
        lines = front_matter.split('\n')
        clean_front_lines = []
        for line in lines:
            l = line.strip()
            if not l or "HALAMAN" in l or "_______" in l: continue
            # Hapus angka halaman fisik di ujung kanan (misal '9', '15', '109')
            l_clean = re.sub(r'\s+\d+$', '', l)
            l_clean = re.sub(r'^\t+', '', l_clean)
            clean_front_lines.append(l_clean)

        front_formatted = "\n\n".join(clean_front_lines)
        
        chapters.append({
            "chapter_number": 1,
            "title": "Pengantar & Daftar Isi",
            "content": front_formatted
        })
    else:
        body_text = text

    # 3. Potong Bab Utama (BAB I sampai BAB XVII)
    pattern = r'(?=\n+(?:BAB|CHAPTER)\s+[IVXLCDM0-9]+)'
    raw_sections = re.split(pattern, "\n\n" + body_text, flags=re.IGNORECASE)

    chap_num = len(chapters) + 1
    for sec in raw_sections:
        sec_clean = sec.strip()
        if len(sec_clean) < 50: continue

        # Merapikan paragraf terputus
        paragraphs = re.split(r'\n\s*\n', sec_clean)
        clean_p = [re.sub(r'\s+', ' ', p.strip()) for p in paragraphs if p.strip()]
        final_content = "\n\n".join(clean_p)

        first_line = clean_p[0] if clean_p else f"Bab {chap_num}"
        title = first_line if len(first_line) < 100 else f"Bab {chap_num}"

        chapters.append({
            "chapter_number": chap_num,
            "title": title,
            "content": final_content
        })
        chap_num += 1

    return chapters

def process():
    file_path = find_file(TARGET_BUKU["file"])
    if not file_path:
        return print(f"❌ File '{TARGET_BUKU['file']}' tidak ditemukan.")

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        text = f.read()

    chapters = clean_toc_and_frontmatter(text)

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
    print(f"🎉 SUKSES! '{TARGET_BUKU['title']}' dirapikan menjadi {len(chapters)} bab utuh.")

if __name__ == "__main__":
    process()