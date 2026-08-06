import requests
import time
import re
import os

# ==========================================
# 1. KONFIGURASI TARGET API & FOLDER
# ==========================================
API_URL = "https://bilano.app/api/admin/ebooks/ingest" 
EMAIL_ADMIN = "adrienfandra14@gmail.com"
FOLDER_BUKU = "books_source"

# ==========================================
# 2. KATALOG BUKU
# Pastikan nama di sebelah kiri SAMA PERSIS dengan nama file .txt Anda
# ==========================================
LIBRARY_CONFIG = {
    "the Wealth of Nations.txt": {
        "title": "The Wealth of Nations",
        "author": "Adam Smith",
        "description": "Buku klasik tentang ekonomi makro fundamental yang merevolusi cara dunia memandang pasar bebas. (Sumber naskah: Project Gutenberg)"
    },
    "The Science of Getting Rich.txt": {
        "title": "The Science of Getting Rich",
        "author": "W. D. Wattles",
        "description": "Panduan filosofis klasik tentang mentalitas kelimpahan dan logika penciptaan kekayaan secara saintifik. (Sumber naskah: Project Gutenberg)"
    },
    "Lombard Street - A Description of the Money Market.txt": {
        "title": "Lombard Street",
        "author": "Walter Bagehot",
        "description": "Membedah cara kerja pasar uang dan perbankan yang menjadi dasar sistem finansial modern. (Sumber naskah: Project Gutenberg)"
    },
    "Extraordinary Popular Delusions and the Madness of Crowds.txt": {
        "title": "Extraordinary Popular Delusions and the Madness of Crowds",
        "author": "Charles Mackay",
        "description": "Studi mendalam tentang psikologi pasar, euforia keuangan, dan gelembung spekulasi dalam sejarah. (Sumber naskah: Project Gutenberg)"
    },
    "The art of money getting.txt": {
        "title": "The Art of Money Getting",
        "author": "P. T. Barnum",
        "description": "Aturan emas dari pebisnis legendaris mengenai manajemen keuangan pribadi dan efisiensi modal. (Sumber naskah: Project Gutenberg)"
    }
}

# ==========================================
# 3. FUNGSI UTAMA AUTO-PILOT
# ==========================================
def process_all_books():
    print(f"🚀 Sistem Auto-Pilot aktif! Menemukan {len(LIBRARY_CONFIG)} buku antrean.")
    print(f"Mencari file di dalam folder: '{FOLDER_BUKU}'\n")

    # Mengecek apakah folder books_source sudah dibuat
    if not os.path.exists(FOLDER_BUKU):
        os.makedirs(FOLDER_BUKU)
        print(f"⚠️ Folder '{FOLDER_BUKU}' belum ada, jadi otomatis saya buatkan.")
        print("Silakan pindahkan ke-5 file .txt Anda ke dalam folder tersebut, lalu jalankan ulang script ini!")
        return

    # Mulai membaca satu per satu buku di katalog
    for filename, metadata in LIBRARY_CONFIG.items():
        file_path = os.path.join(FOLDER_BUKU, filename)
        
        # Mengecek apakah file txt benar-benar ada di dalam folder
        if not os.path.exists(file_path):
            print(f"⚠️ File '{filename}' TIDAK DITEMUKAN di folder '{FOLDER_BUKU}'. Lewati buku ini...\n")
            continue
            
        print("========================================")
        print(f"📚 MEMULAI PROSES: {metadata['title']}")
        print("========================================")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            full_text = file.read()

        # LOGIKA BARU: Cari posisi index setiap kata "CHAPTER [Nomor]"
        matches = list(re.finditer(r'(?i)chapter\s+[0-9IVXLCDM]+', full_text))
        
        valid_chapters = []
        
        # Ambil teks di antara penanda Chapter
        for i in range(len(matches)):
            start_pos = matches[i].start()
            # Jika ini bab terakhir, ambil sampai ujung file teks
            end_pos = matches[i+1].start() if i + 1 < len(matches) else len(full_text)
            
            chapter_content = full_text[start_pos:end_pos].strip()
            
            # Kita filter jika ada potongan yang tidak sengaja terambil sangat pendek
            if len(chapter_content) > 500:
                valid_chapters.append(chapter_content)
        
        if len(valid_chapters) == 0:
            print("⚠️ Gagal menemukan bab yang valid. Pastikan format buku sesuai.")
            continue
            
        print(f"Ditemukan {len(valid_chapters)} bab asli yang utuh. Mulai memproses...")
        
        # Penomoran sekarang dijamin urut dan hanya berlaku untuk bab asli
        for index, chapter_text in enumerate(valid_chapters, start=1):
            
            payload = {
                "title": metadata["title"],
                "author": metadata["author"],
                "description": metadata["description"],
                "isPremium": False,
                "chapterNumber": index,
                "chapterTitleEn": f"Bab {index}", 
                "rawTextEn": chapter_text
            }

            headers = {
                "Content-Type": "application/json",
                "x-user-email": EMAIL_ADMIN
            }
            
            print(f"[{metadata['title']}] -> Mengirim Bab {index} ke AI untuk diterjemahkan...")
            try:
                response = requests.post(API_URL, json=payload, headers=headers)
                if response.status_code == 200:
                    print(f"  ✅ Sukses tersimpan ke database!")
                else:
                    print(f"  ❌ Gagal: {response.text}")
            except Exception as e:
                print(f"  ⚠️ Error koneksi: {e}")

            # Jeda 10 detik per bab agar AI Gemini tidak terkena limit
            time.sleep(10)
            
        print(f"🏁 BUKU SELESAI DITERJEMAHKAN: {metadata['title']}\n")
        
        # Jeda ekstra 30 detik sebelum pindah memproses buku baru
        time.sleep(30) 
            
    print("🎉 SEMUA BUKU SELESAI DIPROSES! Silakan buka aplikasi Bilano dan cek katalog Academy.")
# ==========================================
# 4. TITIK MULAI PROGRAM
# ==========================================
if __name__ == "__main__":
    process_all_books()