import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def setup_database():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("Mencoba menambahkan kolom cover_url...")
        # IF NOT EXISTS memastikan tidak akan error kalau kolomnya ternyata udah ada
        cursor.execute("ALTER TABLE ebooks ADD COLUMN IF NOT EXISTS cover_url TEXT;")
        conn.commit()
        
        print("✅ SUKSES! Kolom cover_url sudah siap di database.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    setup_database()