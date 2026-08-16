import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def update_pdf_database():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("Mempersiapkan database...")
        # 1. Pastikan kolom pdf_url ada di tabel ebooks (Aman kalau sudah ada)
        cursor.execute("ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS pdf_url TEXT;")
        
        # 2. Tembak URL PDF ke buku The Wealth of Nations
        # PERHATIKAN: URL ini persis dengan nama file kamu (tanpa 's' di kata Nation)
        url_pdf = "/E-Book/Wealth_of_Nations.pdf"
        
        cursor.execute(
            "UPDATE ebooks SET pdf_url = %s WHERE title ILIKE %s;", 
            (url_pdf, "%Wealth of Nations%")
        )
            
        conn.commit()
        cursor.close()
        conn.close()
        print(f"✅ SUKSES! PDF berhasil disambungkan ke: {url_pdf}")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    update_pdf_database()