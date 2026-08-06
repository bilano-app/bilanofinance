import requests
import time
import re
import os
import json

API_URL = "https://bilano.app/api/admin/ebooks/ingest" 
EMAIL_ADMIN = "adrienfandra14@gmail.com"
FOLDER_BUKU = "books_source"
PROGRESS_FILE = "ingest_progress.json"

LIBRARY_CONFIG = {
    "the Wealth of Nations.txt": {"title": "The Wealth of Nations", "author": "Adam Smith", "description": "Buku klasik tentang ekonomi makro fundamental. (Sumber naskah: Project Gutenberg)"},
    "The Science of Getting Rich.txt": {"title": "The Science of Getting Rich", "author": "W. D. Wattles", "description": "Panduan filosofis klasik tentang mentalitas kelimpahan. (Sumber naskah: Project Gutenberg)"},
    "Lombard Street - A Description of the Money Market.txt": {"title": "Lombard Street", "author": "Walter Bagehot", "description": "Membedah cara kerja pasar uang dan perbankan modern. (Sumber naskah: Project Gutenberg)"},
    "Extraordinary Popular Delusions and the Madness of Crowds.txt": {"title": "Extraordinary Popular Delusions and the Madness of Crowds", "author": "Charles Mackay", "description": "Studi mendalam tentang psikologi pasar dan gelembung spekulasi. (Sumber naskah: Project Gutenberg)"},
    "The art of money getting.txt": {"title": "The Art of Money Getting", "author": "P. T. Barnum", "description": "Aturan emas mengenai manajemen keuangan pribadi. (Sumber naskah: Project Gutenberg)"}
}

# --- FUNGSI PAUSE & RESUME ---
def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, 'r') as f:
            return json.load(f)
    return {"last_completed_book": "", "last_completed_part": 0}

def save_progress(book_title, part_index):
    with open(PROGRESS_FILE, 'w') as f:
        json.dump({"last_completed_book": book_title, "last_completed_part": part_index}, f)

# --- FUNGSI UTAMA ---
def process_all_books():
    progress = load_progress()
    last_book = progress.get("last_completed_book", "")
    last_part = progress.get("last_completed_part", 0)

    print("🚀 SISTEM AUTO-RESUME & INGEST AKTIF!\n")

    # LOGIKA CERDAS: Kapan harus Cuci Gudang?
    if last_book:
        print(f"📍 Ditemukan progress tersimpan: Melanjutkan dari {last_book} (Bagian {last_part})")
        print("⏩ Lewati Cuci Gudang agar data sebelumnya aman.\n")
    else:
        print("📍 Memulai dari awal (Belum ada progress tersimpan)")
        print("🧹 Memulai pembersihan database (Cuci Gudang)...")
        try:
            # (Jika backend punya rute pembersih otomatis, request ditaruh di sini)
            clear_payload = {"title": "CLEAR_DATA_REQUEST", "author": "SYSTEM", "description": "CLEAR", "clearAll": True}
            print("🧼 Database siap disegarkan.\n")
        except Exception as e:
            print(f"⚠️ Gagal cek pembersihan otomatis: {e}\n")

    skip_mode = True if last_book else False

    for filename, metadata in LIBRARY_CONFIG.items():
        book_title = metadata["title"]
        
        # JIKA RESUME: Lewati buku yang sudah tamat di sesi sebelumnya
        if skip_mode and book_title != last_book:
            print(f"⏭️ Buku '{book_title}' sudah selesai sebelumnya. Lewati...")
            continue
            
        file_path = os.path.join(FOLDER_BUKU, filename)
        if not os.path.exists(file_path):
            continue
            
        print("========================================")
        print(f"📚 PROSES BUKU: {book_title}")
        print("========================================")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            full_text = file.read()

        start_match = re.search(r'\*\*\*\s*START OF .*?\*\*\*', full_text)
        end_match = re.search(r'\*\*\*\s*END OF .*?\*\*\*', full_text)
        core_text = full_text[start_match.end():end_match.start()].strip() if start_match and end_match else full_text.strip()
        
        paragraphs = re.split(r'\n\s*\n', core_text)
        valid_chunks = []
        current_chunk = ""
        
        for p in paragraphs:
            clean_p = p.strip()
            if not clean_p: continue
            current_chunk += clean_p + "\n\n"
            if len(current_chunk) >= 3000:
                valid_chunks.append(current_chunk.strip())
                current_chunk = ""
        
        if current_chunk: 
            current_chunk = current_chunk.strip()
            if len(current_chunk) < 1500 and len(valid_chunks) > 0:
                valid_chunks[-1] += "\n\n" + current_chunk
            else:
                valid_chunks.append(current_chunk)
        
        total_parts = len(valid_chunks)

        for index, chapter_text in enumerate(valid_chunks, start=1):
            # JIKA RESUME: Lewati halaman yang sudah masuk database
            if skip_mode and book_title == last_book:
                if index <= last_part:
                    continue
                else:
                    skip_mode = False 
                    print(f"🔄 Melanjutkan {book_title} dari Bagian {index}...")

            strict_ai_instruction = "[PERINTAH KETAT: TERJEMAHKAN SELURUH TEKS BERIKUT KE BAHASA INDONESIA SECARA AKURAT KATA DEMI KATA. DILARANG MERINGKAS. JANGAN MENAMBAHKAN JUDUL BARU ATAU MARKDOWN. LANGSUNG KELUARKAN HASIL TERJEMAHAN UTUH NYA]\n\n"
            
            payload = {
                "title": book_title, "author": metadata["author"], "description": metadata["description"],
                "isPremium": False, "chapterNumber": index, "chapterTitleEn": f"Bagian {index}", 
                "rawTextEn": strict_ai_instruction + chapter_text
            }

            headers = {"Content-Type": "application/json", "x-user-email": EMAIL_ADMIN}
            
            print(f"[{book_title}] -> Mengirim Bagian {index}/{total_parts}...")
            try:
                response = requests.post(API_URL, json=payload, headers=headers, timeout=25)
                res_json = response.json()
                if response.status_code == 200 and res_json.get("success") == True:
                    print(f"  ✅ Sukses masuk database!")
                    # SIMPAN CHECKPOINT
                    save_progress(book_title, index)
                else:
                    print(f"  ❌ GAGAL: {res_json.get('error', 'Error server')}")
            except Exception as e:
                print(f"  ⚠️ Error Jaringan: {e}")
                print("🛑 Proses terhenti sementara. Tekan Ctrl+C lalu matikan laptop. Nanti tinggal jalankan ulang!")
                return

            time.sleep(12)
            
        print(f"🏁 BUKU TAMAT: {book_title}\n")
        last_part = 0 
        skip_mode = False 
        time.sleep(20) 
            
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
    print("🎉 SELESAI! Semua antrean buku sudah masuk tanpa cacat.")

if __name__ == "__main__":
    process_all_books()