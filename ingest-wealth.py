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
    "description": "Karya monumental Adam Smith tentang fondasi ekonomi pasar bebas dan kapitalisme modern.",
    "cover_url": "/Cover/Cover/Wealth.jpg",
    "is_premium": True
}

def find_file(filename):
    for root, dirs, files in os.walk(os.getcwd()):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.git' in dirs: dirs.remove('.git')
        if filename in files: return os.path.join(root, filename)
    return None

def clean_and_parse_wealth(raw_text):
    text = raw_text.replace('**', '')
    
    # Hapus Lisensi Gutenberg
    start_m = re.search(r"\*\*\* START OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_m: text = text[start_m.end():]
    end_m = re.search(r"\*\*\* END OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_m: text = text[:end_m.start()]

    text = text.strip()
    chapters = []

    # 🔥 PISAHKAN DAFTAR ISI DAN PENDAHULUAN SECARA PRESISI
    # Mencari titik di mana naskah asli "Pendahuluan" dimulai (kemunculan kedua)
    parts = re.split(r'\n+(?=PENDAHULUAN DAN RENCANA PEKERJAAN|INTRODUCTION AND PLAN OF THE WORK)', text, flags=re.IGNORECASE)

    if len(parts) >= 2:
        # Bagian Pertama: Murni Daftar Isi (TOC)
        toc_block = parts[0].strip()
        # Bersihkan spasi kosong ganda di Daftar Isi agar rapat ke bawah (\n tunggal)
        toc_lines = [re.sub(r'\s+', ' ', l.strip()) for l in toc_block.split('\n') if l.strip()]
        chapters.append({
            "chapter_number": 1,
            "title": "Daftar Isi",
            "content": "\n".join(toc_lines) 
        })
        
        # Bagian Kedua: Naskah Utama (dimulai dari Pendahuluan)
        body_text = "\n\n".join(parts[1:])
    else:
        body_text = text

    # Potong sisa naskah berdasarkan BUKU atau BAB
    pattern = r'(?=\n+(?:BUKU|BOOK|BAB|CHAPTER)\s+[IVXLCDM0-9]+)'
    raw_sections = re.split(pattern, "\n\n" + body_text, flags=re.IGNORECASE)

    chap_num = len(chapters) + 1
    for sec in raw_sections:
        sec_clean = sec.strip()
        if len(sec_clean) < 50: continue

        # Gabungkan paragraf
        paras = re.split(r'\n\s*\n', sec_clean)
        clean_paras = [re.sub(r'\s+', ' ', p.strip()) for p in paras if p.strip()]
        final_content = "\n\n".join(clean_paras)

        first_line = clean_paras[0] if clean_paras else f"Bagian {chap_num}"
        title = first_line if len(first_line) < 100 else f"Bagian {chap_num}"

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

    chapters = clean_and_parse_wealth(raw_text)

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
    print(f"🎉 SUKSES! 'The Wealth of Nations' tertata sempurna menjadi {len(chapters)} bagian.")

if __name__ == "__main__":
    process()