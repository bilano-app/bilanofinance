import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def update_covers():
    # DAFTAR BUKU DAN LINK COVER-NYA
    # Ganti "LINK_GAMBAR_..." dengan link gambar asli berawalan https://
    koleksi_cover = {
        "Extraordinary Popular Delusions and the Madness of Crowds": "Delusions.png",
        "The Wealth of Nations": "Wealth.jpg",
        "Lombard Street": "Description.png",
        "The Art of Money Getting": "The Art.png",
        "The Science of Getting Rich": "Science.jpg"
    }

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("Memulai update cover buku...")
        
        for judul, url_cover in koleksi_cover.items():
            if url_cover.startswith("http"): # Pastikan link-nya valid
                cursor.execute("UPDATE ebooks SET cover_url = %s WHERE title = %s;", (url_cover, judul))
                print(f"✅ Cover '{judul}' berhasil di-update!")
            else:
                print(f"⏩ Cover '{judul}' dilewati (link belum diisi).")
                
        conn.commit()
        cursor.close()
        conn.close()
        print("\n🎉 SEMUA COVER BERHASIL DIMASUKKAN!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    update_covers()