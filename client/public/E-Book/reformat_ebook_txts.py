import os
import re
from pathlib import Path

def find_ebook_directory():
    """Mencari folder 'File Ebook' secara otomatis di seluruh proyek."""
    search_root = Path.cwd() 
    
    for root, dirs, files in os.walk(search_root):
        if 'node_modules' in dirs: dirs.remove('node_modules')
        if '.git' in dirs: dirs.remove('.git')
        
        if 'File Ebook' in dirs:
            target_path = Path(root) / 'File Ebook'
            # Pastikan folder tersebut benar-benar berisi file .txt
            if list(target_path.glob("*.txt")):
                return target_path
    return None

EBOOK_DIR = find_ebook_directory()

def clean_gutenberg_garbage(text: str) -> str:
    """Membersihkan header/footer lisensi Gutenberg secara aman."""
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    start_match = re.search(r"\*\*\* START OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if start_match: text = text[start_match.end():]
        
    end_match = re.search(r"\*\*\* END OF (THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text, re.IGNORECASE)
    if end_match: text = text[:end_match.start()]
        
    return text.strip()

def is_list_or_toc(lines: list) -> bool:
    """Mendeteksi apakah baris-baris ini adalah Daftar Isi atau Daftar Poin."""
    if len(lines) <= 1: return False
    short_lines = sum(1 for l in lines if len(l) < 60)
    has_dots = sum(1 for l in lines if '...' in l or '   ' in l)
    return (short_lines / len(lines) > 0.5) or (has_dots > 0)

def reformat_text(raw_text: str) -> str:
    text_body = clean_gutenberg_garbage(raw_text)
    
    # Memecah berdasarkan blok yang dipisahkan oleh baris kosong
    blocks = re.split(r'\n[ \t]*\n+', text_body)
    formatted_blocks = []
    
    for block in blocks:
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if not lines: continue
            
        text_joined = " ".join(lines)
        
        # Deteksi Judul Utama / Sub-Judul (Huruf kapital semua)
        if len(text_joined) < 100 and text_joined.isupper():
            formatted_blocks.append(text_joined.upper())
        # Deteksi Daftar Isi / Puisi
        elif is_list_or_toc(lines):
            formatted_blocks.append("\n".join(lines)) # Biarkan turun ke bawah
        # Paragraf normal
        else:
            formatted_blocks.append(text_joined)

    # Pisahkan setiap blok dengan tepat 2 ENTER agar rapi di frontend
    return "\n\n".join(formatted_blocks).strip()

def process_files():
    if not EBOOK_DIR or not EBOOK_DIR.exists():
        print("❌ Gagal menemukan folder 'File Ebook' yang berisi file .txt di proyek ini!")
        return

    print(f"🚀 Memulai perapihan naskah E-book di: {EBOOK_DIR}")
    for path in sorted(EBOOK_DIR.glob("*.txt")):
        content = path.read_text(encoding="utf-8", errors="ignore")
        new_content = reformat_text(content)
        path.write_text(new_content, encoding="utf-8")
        print(f"  ✅ {path.name} dirapikan!")

if __name__ == "__main__":
    process_files()