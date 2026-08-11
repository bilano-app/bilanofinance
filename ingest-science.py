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

def clean_and_parse_science(raw_text):
    text = raw_text.replace('**', '')
    
    # Bersihkan Lisensi Gutenberg
    start_m = re.search(r"\*\*\* AWAL DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not start_m: start_m = re.search(r"\*\*\* START OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_m: text = text[start_m.end():]

    end_m = re.search(r"\*\*\* AKHIR DARI EBOOK PROYEK GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if not end_m: end_m = re.search(r"\*\*\* END OF.*?GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_m: text = text[:end_m.start()]

    text = text.strip()

    chapters = []
    
    # 🔥 STRATEGI EKSTRASI AWALAN SECARA PRESISI
    # 1. Ambil Blok Daftar Isi
    toc_match = re.search(r'\bDAFTAR\s+ISI\b', text, re.IGNORECASE)
    # 2. Ambil Blok Prakata
    prakata_match = re.search(r'\b(PRAKATA|PREFACE)\b', text, re.IGNORECASE)
    # 3. Ambil Titik Awal Bab I
    first_bab_match = re.search(r'\n+(?:BAB|CHAPTER)\s+I\b', text, re.IGNORECASE)

    current_idx = 0

    # Bagian 1: Informasi Judul & Penerbit Awal
    if toc_match:
        info_block = text[current_idx:toc_match.start()].strip()
        if len(info_block) > 20:
            lines = [l.strip() for l in info_block.split('\n') if l.strip()]
            chapters.append({
                "chapter_number": len(chapters) + 1,
                "title": "Halaman Judul & Hak Cipta",
                "content": "\n\n".join(lines)
            })
        current_idx = toc_match.start()

    # Bagian 2: Blok Khusus Daftar Isi (TOC)
    if prakata_match and current_idx < prakata_match.start():
        toc_block = text[current_idx:prakata_match.start()].strip()
        # Bersihkan spasi berlebih pada tiap item daftar isi agar kompak ke bawah (\n tunggal)
        toc_lines = [re.sub(r'\s+', ' ', l.strip()) for l in toc_block.split('\n') if l.strip()]
        chapters.append({
            "chapter_number": len(chapters) + 1,
            "title": "Daftar Isi",
            "content": "\n".join(toc_lines) # Sengaja pakai \n tunggal agar tidak renggang di CSS
        })
        current_idx = prakata_match.start()

    # Bagian 3: Prakata / Pendahuluan
    if first_bab_match and current_idx < first_bab_match.start():
        prakata_block = text[current_idx:first_bab_match.start()].strip()
        prakata_paras = [re.sub(r'\s+', ' ', p.strip()) for p in prakata_block.split('\n\s*\n') if p.strip()]
        chapters.append({
            "chapter_number": len(chapters) + 1,
            "title": "Prakata Penulis",
            "content": "\n\n".join(prakata_paras)
        })
        current_idx = first_bab_match.start()

    # Bagian 4: Ekstraksi Bab-Bab Utama Buku (BAB I - BAB XVII)
    body_text = text[current_idx:].strip()
    pattern = r'(?=\n+(?:BAB|CHAPTER)\s+[IVXLCDM0-9]+)'
    raw_sections = re.split(pattern, "\n\n" + body_text, flags=re.IGNORECASE)

    for sec in raw_sections:
        sec_clean = sec.strip()
        if len(sec_clean) < 50: continue

        paragraphs = re.split(r'\n\s*\n', sec_clean)
        clean_paras = [re.sub(r'\s+', ' ', p.strip()) for p in paragraphs if p.strip()]
        
        final_content = "\n\n".join(clean_paras)
        first_line = clean_paras[0] if clean_paras else f"Bab {len(chapters) + 1}"
        title = first_line if len(first_line) < 100 else f"Bab {len(chapters) + 1}"

        chapters.append({
            "chapter_number": len(chapters) + 1,
            "title": title,
            "content": final_content
        })

    return chapters

def process():
    file_path = find_file(TARGET_BUKU["file"])
    if not file_path:
        return print(f"❌ File '{TARGET_BUKU['file']}' tidak ditemukan.")

    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        raw_text = f.read()

    chapters = clean_and_parse_science(raw_text)

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
    print(f"🎉 SUKSES! '{TARGET_BUKU['title']}' tertata sempurna menjadi {len(chapters)} bagian.")

if __name__ == "__main__":
    process()