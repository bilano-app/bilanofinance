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

def clean_and_parse_book(raw_text):
    # 1. Bersihkan Lisensi Gutenberg & Markdown
    text = raw_text.replace('**', '')
    
    start_m = re.search(r"\*\*\* AWAL DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not start_m:
        start_m = re.search(r"\*\*\* START OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_m:
        text = text[start_m.end():]

    end_m = re.search(r"\*\*\* AKHIR DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not end_m:
        end_m = re.search(r"\*\*\* END OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_m:
        text = text[:end_m.start()]

    text = text.strip()

    # 2. Cari pemisah Bab (BAB I, BAB II, ... atau PRAKATA / PREFACE)
    pattern = r'(?=\n+(?:BAB|CHAPTER)\s+[IVXLCDM0-9]+|\n+(?:PRAKATA|PREFACE)\b)'
    raw_sections = re.split(pattern, "\n\n" + text, flags=re.IGNORECASE)

    chapters = []
    chap_num = 1

    for sec in raw_sections:
        sec_clean = sec.strip()
        if len(sec_clean) < 30: 
            continue

        # Menyertakan paragraf utuh (\n\n)
        raw_paras = re.split(r'\n\s*\n', sec_clean)
        clean_paras = []
        for p in raw_paras:
            p_single_line = re.sub(r'\s+', ' ', p.strip())
            if p_single_line:
                clean_paras.append(p_single_line)

        final_content = "\n\n".join(clean_paras)
        first_line = clean_paras[0] if clean_paras else f"Bagian {chap_num}"
        
        if len(first_line) < 100:
            title = first_line
        else:
            title = f"Bagian {chap_num}"

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
        raw_text = f.read()

    chapters = clean_and_parse_book(raw_text)

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
    print(f"🎉 SUKSES! '{TARGET_BUKU['title']}' berhasil di-ingest ({len(chapters)} bab utuh).")

if __name__ == "__main__":
    process()