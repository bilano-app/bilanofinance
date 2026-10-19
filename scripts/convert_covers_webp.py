import os
from PIL import Image

akuntansi_dir = r"c:\Users\ADRIEN AHZA\Downloads\Python-Finance-App\Python-Finance-App\client\public\Akuntansi"

images = [
    ("Mockup Buku Logika Akuntansi.png", "Mockup_Buku_Logika_Akuntansi.webp"),
    ("Tiga Buku Akuntansi Interaktif.png", "Tiga_Buku_Akuntansi_Interaktif.webp"),
    ("Mockup Buku Full Accounting Tebal.png", "Mockup_Buku_Full_Accounting_Tebal.webp"),
    ("Mockup Buku Gudang Soal Akuntansi.png", "Mockup_Buku_Gudang_Soal_Akuntansi.webp"),
]

for src_name, dst_name in images:
    src_path = os.path.join(akuntansi_dir, src_name)
    dst_path = os.path.join(akuntansi_dir, dst_name)
    if os.path.exists(src_path):
        with Image.open(src_path) as img:
            # Resize if very large (max width 800px is more than enough for retina display on 300px card)
            max_size = (800, 1000)
            img.thumbnail(max_size, Image.Resampling.LANCZOS)
            # Save as WebP
            img.save(dst_path, "WEBP", quality=85, method=6)
            src_size = os.path.getsize(src_path) // 1024
            dst_size = os.path.getsize(dst_path) // 1024
            print(f"Converted {src_name} ({src_size} KB) -> {dst_name} ({dst_size} KB)")
    else:
        print(f"File not found: {src_path}")
