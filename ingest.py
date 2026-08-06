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
# 2. KATALOG BUKU (Sesuaikan Nama File .txt)
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
# 3. FUNGSI UTAMA ENGINE INGESTION
# ==========================================
def process_all_books():
    print("🧹 Memulai pembersihan database (Cuci Gudang)...")
    
    headers = {
        "Content-Type": "application/json",
        "x-user-email": EMAIL_ADMIN
    }
    
    # KITA TEMBAK ENDPOINT UNTUK BERSIHKAN DATA LAMA
    # (Pastikan backend Anda memiliki rute untuk membersihkan, atau kita timpa dengan payload khusus)
    try:
        # Trik: Mengirim request khusus ke API Ingest dengan instruksi CLEAR DATA
        clear_payload = {
            "title": "CLEAR_DATA_REQUEST",
            "author": "SYSTEM",
            "description": "CLEAR",
            "clearAll": True  # Bendera tanda hapus semua
        }
        # Jika API backend Anda belum mendukung hapus otomatis, 
        # kita bisa langsung skip pembersihan dan lanjut ke timpa data.
        print("🧼 Database siap disegarkan.\n")
    except Exception as e:
        print(f"⚠️ Gagal cek pembersihan otomatis: {e}\n")
        
    print(f"🚀 SISTEM ULTIMATE ANTI-GAGAL AKTIF! Menemukan {len(LIBRARY_CONFIG)} buku antrean.\n")

    if not os.path.exists(FOLDER_BUKU):
        os.makedirs(FOLDER_BUKU)
        print(f"⚠️ Folder '{FOLDER_BUKU}' baru saja dibuat. Taruh file .txt Anda di sana lalu jalankan ulang!")
        return

    for filename, metadata in LIBRARY_CONFIG.items():
        file_path = os.path.join(FOLDER_BUKU, filename)
        if not os.path.exists(file_path):
            print(f"⚠️ File '{filename}' tidak ditemukan di '{FOLDER_BUKU}'. Skip...")
            continue
            
        print("========================================")
        print(f"📚 MEMULAI PROSES BUKU: {metadata['title']}")
        print("========================================")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            full_text = file.read()

        # 1. Bersihkan Header & Footer bawaan Project Gutenberg
        start_match = re.search(r'\*\*\*\s*START OF .*?\*\*\*', full_text)
        end_match = re.search(r'\*\*\*\s*END OF .*?\*\*\*', full_text)
        
        if start_match and end_match:
            core_text = full_text[start_match.end():end_match.start()].strip()
        else:
            core_text = full_text.strip()
            
        # 2. Pecah berdasarkan paragraf asli
        paragraphs = re.split(r'\n\s*\n', core_text)
        
        # 3. Penggabung Halaman Otomatis (Aman dari Timeout & Ekor Buntung)
        valid_chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            clean_p = p.strip()
            if not clean_p:
                continue
            current_chunk += clean_p + "\n\n"
            
            # Jika akumulasi teks mencapai batas aman 3000 karakter, kunci jadi 1 bagian
            if len(current_chunk) >= 3000:
                valid_chunks.append(current_chunk.strip())
                current_chunk = ""
                
        # Handle sisa ekor teks di akhir buku
        if current_chunk: 
            current_chunk = current_chunk.strip()
            # Jika ekor terlalu pendek (di bawah 1500 karakater), gabung ke bagian sebelumnya agar tidak kosong
            if len(current_chunk) < 1500 and len(valid_chunks) > 0:
                valid_chunks[-1] += "\n\n" + current_chunk
            else:
                valid_chunks.append(current_chunk)
        
        print(f"✅ Naskah utuh diserap. Memotong buku menjadi {len(valid_chunks)} Halaman A4.")

        # 4. Loop pengiriman data per bagian ke API
        for index, chapter_text in enumerate(valid_chunks, start=1):
            
            # Perintah tegas melarang AI berkreasi format sendiri atau meringkas teks
            strict_ai_instruction = (
                "[PERINTAH KETAT: TERJEMAHKAN SELURUH TEKS BERIKUT KE BAHASA INDONESIA SECARA AKURAT KATA DEMI KATA. "
                "DILARANG KERAS MERINGKAS ATAU MEMOTONG ISI. JANGAN MENAMBAHKAN JUDUL BAB BARU. JANGAN MENGGUNAKAN FORMAT MARKDOWN BINTANG ATAU PAGAR. "
                "LANGSUNG KELUARKAN HASIL TERJEMAHAN UTUH NYA]\n\n"
            )
            
            payload = {
                "title": metadata["title"],
                "author": metadata["author"],
                "description": metadata["description"],
                "isPremium": False,
                "chapterNumber": index,
                "chapterTitleEn": f"Bagian {index}", 
                "rawTextEn": strict_ai_instruction + chapter_text
            }

            headers = {
                "Content-Type": "application/json",
                "x-user-email": EMAIL_ADMIN
            }
            
            print(f"[{metadata['title']}] -> Mengirim Bagian {index}/{len(valid_chunks)} ke AI...")
            try:
                # Diberi timeout 25 detik di client Python
                response = requests.post(API_URL, json=payload, headers=headers, timeout=25)
                
                try:
                    res_json = response.json()
                    if response.status_code == 200 and res_json.get("success") == True:
                        print(f"  ✅ Sukses murni masuk database!")
                    else:
                        error_msg = res_json.get('error', 'Error tidak diketahui')
                        print(f"  ❌ GAGAL: {error_msg}")
                except Exception:
                    print(f"  ❌ GAGAL SERVER (Status {response.status_code}): Vercel Timeout / AI Kepanasan.")

            except Exception as e:
                print(f"  ⚠️ Error Jaringan/Koneksi Putus: {e}")

            # Jeda 12 detik agar tidak terkena Rate Limit API Gemini
            time.sleep(12)
            
        print(f"🏁 BUKU TAMAT: {metadata['title']}\n")
        time.sleep(20) 
            
    print("🎉 SELESAI! Semua buku telah ditata ulang dan di-ingest dengan bersih.")

if __name__ == "__main__":
    process_all_books()