import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def reset_database():
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL tidak ditemukan di .env!")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("🔌 Terhubung ke Database PostgreSQL...")
        print("🧹 Membersihkan seluruh tabel 'ebook_chapters' dan 'ebooks'...")
        
        # Hapus seluruh isi tabel bab dan buku
        cursor.execute("DELETE FROM ebook_chapters;")
        cursor.execute("DELETE FROM ebooks;")
        
        # Reset urutan ID (PRIMARY KEY) ke angka 1 lagi
        cursor.execute("ALTER SEQUENCE IF EXISTS ebooks_id_seq RESTART WITH 1;")
        cursor.execute("ALTER SEQUENCE IF EXISTS ebook_chapters_id_seq RESTART WITH 1;")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✨ SELESAI! Seluruh data e-book di database sekarang sudah BERSIH TOTAL (0 data).")
        print("💡 Sekarang Anda bisa menjalankan 'python ingest.py' untuk ingest data bersih.")

    except Exception as e:
        print(f"❌ Terjadi kesalahan saat membersihkan database: {e}")

if __name__ == "__main__":
    reset_database()