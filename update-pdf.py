import os
import psycopg2
from dotenv import load_dotenv

# Load environment variables dari file .env lu
load_dotenv()

def update_pdf_database():
    print("Mempersiapkan database...")
    
    # Mencari URL Database di file .env lu. 
    # Sesuaikan jika nama variabel lu berbeda (misal: SUPABASE_URL atau DATABASE_URL)
    db_url = os.environ.get("DATABASE_URL") or os.environ.get("POSTGRES_URL")
    
    if not db_url:
        print("❌ ERROR: URL Database tidak ditemukan di file .env!")
        return

    try:
        # Buka koneksi ke database
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()

        # 1. Pastikan kolom pdf_url ada di tabel ebooks (Aman kalau sudah ada)
        cursor.execute("ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS pdf_url TEXT;")

        print("Mempersiapkan update massal database...")

        # 2. Daftar kata kunci judul buku dan link GDrive-nya (sudah diset ke /preview)
        daftar_buku = [
            ("%Wealth of Nations%", "https://drive.google.com/file/d/1KscLhETCvD8bsuqlRyL2vqRO5AhZwdXb/preview"),
            ("%Delusion%", "https://drive.google.com/file/d/1nXKZYk_VTxGfNfILabpBv_JPcpcvqBnu/preview"),
            ("%Lombard%", "https://drive.google.com/file/d/1rXOkS9YyjFgLc9tZe3_nbkXJtJTtQioj/preview"),
            ("%art of money%", "https://drive.google.com/file/d/11ux23feWItiqF5jKqp7MIxIaSjDcCyBM/preview"),
            ("%Science%", "https://drive.google.com/file/d/1QfEByOwlBJ-jNpgfTLr9aCTyh1LUMtV7/preview")
        ]

        # 3. Looping untuk mengupdate semua buku sekaligus
        for kata_kunci, url_pdf in daftar_buku:
            cursor.execute(
                "UPDATE ebooks SET pdf_url = %s WHERE title ILIKE %s;",
                (url_pdf, kata_kunci)
            )
            # Menampilkan nama yang lebih rapi di terminal tanpa tanda %
            nama_tampil = kata_kunci.replace('%', '')
            print(f"✅ Berhasil menautkan buku: {nama_tampil}")

        # 4. Simpan permanen semua perubahan ke database
        conn.commit()
        print("🎉 SEMUA EBOOK BERHASIL DISIMPAN KE DATABASE!")

    except Exception as e:
        print(f"❌ Terjadi kesalahan pada database: {e}")
        
    finally:
        # Pastikan koneksi selalu ditutup agar tidak membebani server
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Koneksi ke database selesai dan ditutup.")

# Mengeksekusi fungsi saat file dijalankan
if __name__ == "__main__":
    update_pdf_database()