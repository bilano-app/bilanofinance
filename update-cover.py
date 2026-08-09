import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def update_Covers():
    # Jalur folder disesuaikan: Murni pakai '/Cover/' sesuai folder asli lu!
    koleksi_Cover = {
        "Extraordinary Popular Delusions and the Madness of Crowds": "/Cover/Cover/Delusions.png",
        "The Wealth of Nations": "/Cover/Cover/Wealth.jpg",
        "Lombard Street": "/Cover/Cover/Description.png",
        "The Art of Money Getting": "/Cover/Cover/The Art.png",
        "The Science of Getting Rich": "/Cover/Cover/Science.jpg"
    }

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("Memulai tembak update Cover ke database...")
        
        for judul, url_Cover in koleksi_Cover.items():
            # Menggunakan ILIKE agar pencarian judul fleksibel dan gak sensitif huruf besar/kecil
            cursor.execute(
                "UPDATE ebooks SET Cover_url = %s WHERE title ILIKE %s;", 
                (url_Cover, f"%{judul}%")
            )
            print(f"✅ Cover '{judul}' sukses diset ke: {url_Cover}")
                
        conn.commit()
        cursor.close()
        conn.close()
        print("\n🎉 MANTAP! Semua Cover buku sudah aman tercatat di database.")
        
    except Exception as e:
        print(f"❌ Terjadi kesalahan: {e}")

if __name__ == "__main__":
    update_Covers()