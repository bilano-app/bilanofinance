import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Daftar file e-book dan metadata resmi
# URL Cover sudah disesuaikan dengan struktur folder ganda /Cover/Cover/
EBOOKS_DATA = [
    {
        "file": "the Wealth of Nations.txt",
        "title": "The Wealth of Nations",
        "author": "Adam Smith",
        "description": "Karya monumental Adam Smith tentang fondasi ekonomi pasar bebas dan kapitalisme modern.",
        "cover_url": "/Cover/Cover/Wealth.jpg",
        "is_premium": True
    },
    {
        "file": "Extraordinary Popular Delusions and the Madness of Crowds.txt",
        "title": "Extraordinary Popular Delusions and the Madness of Crowds",
        "author": "Charles Mackay",
        "description": "Studi klasik tentang psikologi massa, gelembung finansial, dan kebiasaan konyol manusia.",
        "cover_url": "/Cover/Cover/Delusions.png",
        "is_premium": True
    },
    {
        "file": "Lombard Street - A Description of the Money Market.txt",
        "title": "Lombard Street",
        "author": "Walter Bagehot",
        "description": "Analisis mendalam mengenai sistem perbankan dan pasar uang London.",
        "cover_url": "/Cover/Cover/Description.png",
        "is_premium": False
    },
    {
        "file": "The art of money getting.txt",
        "title": "The Art of Money Getting",
        "author": "P. T. Barnum",
        "description": "Panduan pragmatis tentang akumulasi kekayaan dan etika bisnis dari P.T. Barnum.",
        "cover_url": "/Cover/Cover/The Art.png",
        "is_premium": False
    },
    {
        "file": "The Science of Getting Rich.txt",
        "title": "The Science of Getting Rich",
        "author": "Wallace D. Wattles",
        "description": "Buku filosofi kemakmuran yang menginspirasi pemikiran finansial modern.",
        "cover_url": "/Cover/Cover/Science.jpg",
        "is_premium": False
    }
]

def clean_gutenberg_text(raw_text):
    """Membersihkan header/footer Gutenberg & menggabungkan baris terputus."""
    # 1. Potong Header Gutenberg
    start_match = re.search(r"\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", raw_text, re.IGNORECASE)
    if start_match:
        raw_text = raw_text[start_match.end():]

    # 2. Potong Footer Gutenberg
    end_match = re.search(r"\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK.*?\*\*\*", raw_text, re.IGNORECASE)
    if end_match:
        raw_text = raw_text[:end_match.start()]

    raw_text = raw_text.strip()

    # 3. Normalisasi Line Breaks (Un-wrapping Gutenberg Line Breaks)
    paragraphs = re.split(r'\n\s*\n', raw_text)
    clean_paragraphs = []
    
    for p in paragraphs:
        # Hapus newline tunggal di dalam paragraf agar kalimat menyatu utuh
        cleaned_p = re.sub(r'\s+', ' ', p.strip())
        if cleaned_p:
            clean_paragraphs.append(cleaned_p)

    return "\n\n".join(clean_paragraphs)

def split_into_chapters(full_text):
    """Memecah naskah menjadi bab-bab terstruktur."""
    pattern = r'(?=\n\n(?:BOOK|BUKU|CHAPTER|BAB|PART|SECTION)\s+[IVXLCDM0-9]+)'
    raw_chapters = re.split(pattern, full_text, flags=re.IGNORECASE)

    structured_chapters = []
    chapter_num = 1

    for ch in raw_chapters:
        ch_text = ch.strip()
        if not ch_text or len(ch_text) < 100:
            continue

        lines = ch_text.split('\n\n')
        first_line = lines[0].strip()
        
        if re.match(r'^(BOOK|BUKU|CHAPTER|BAB|PART|SECTION)\s+[IVXLCDM0-9]+', first_line, re.IGNORECASE):
            title = first_line[:100]
        else:
            title = f"Bab {chapter_num}"

        structured_chapters.append({
            "chapter_number": chapter_num,
            "title": title,
            "content": ch_text
        })
        chapter_num += 1

    if not structured_chapters:
        structured_chapters.append({
            "chapter_number": 1,
            "title": "Isi Lengkap",
            "content": full_text
        })

    return structured_chapters

def run_ingest():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        print("🚀 Memulai Ingestion E-book Ke Database...")

        # Bersihkan tabel lama
        cursor.execute("TRUNCATE TABLE ebook_chapters RESTART IDENTITY CASCADE;")
        cursor.execute("TRUNCATE TABLE ebooks RESTART IDENTITY CASCADE;")

        # 🔥 PERBAIKAN LOKASI FOLDER: Mengarah langsung ke client/public/Cover/Cover/File Ebook
        base_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.abspath(os.path.join(base_dir, ".."))
        books_dir = os.path.join(project_root, "client", "public", "Cover", "Cover", "File Ebook")

        for book in EBOOKS_DATA:
            file_path = os.path.join(books_dir, book["file"])
            if not os.path.exists(file_path):
                print(f"⚠️ File tidak ditemukan di: {file_path}")
                continue

            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_content = f.read()

            clean_text = clean_gutenberg_text(raw_content)
            chapters = split_into_chapters(clean_text)

            cursor.execute("""
                INSERT INTO ebooks (title, author, description, cover_url, is_premium)
                VALUES (%s, %s, %s, %s, %s) RETURNING id;
            """, (book["title"], book["author"], book["description"], book["cover_url"], book["is_premium"]))
            
            ebook_id = cursor.fetchone()[0]

            for ch in chapters:
                cursor.execute("""
                    INSERT INTO ebook_chapters (ebook_id, chapter_number, title, content)
                    VALUES (%s, %s, %s, %s);
                """, (ebook_id, ch["chapter_number"], ch["title"], ch["content"]))

            print(f"✅ Sukses memasukkan '{book['title']}' ({len(chapters)} Bab/Bagian)")

        conn.commit()
        cursor.close()
        conn.close()
        print("\n🎉 SELURUH E-BOOK BERHASIL DIBERSIHKAN DAN DIMASUKKAN KE DATABASE!")

    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    run_ingest()