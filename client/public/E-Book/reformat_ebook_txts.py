import re
from pathlib import Path

EBOOK_DIR = Path(__file__).resolve().parent / "File Ebook"

HEADING_KEYWORDS = [
    r'^(BAB|CHAPTER|CONTENTS|LIST OF|PREFACE|VOLUME|VOL\.|BOOK|THE|PROLOGUE|EPILOGUE)\b',
    r'^[IVXLCDM]+\.$',
]

def normalize_line(line: str) -> str:
    line = line.replace("\r\n", "\n").replace("\r", "\n")
    line = re.sub(r'\s+', ' ', line).strip()
    return line

def is_heading(line: str) -> bool:
    if not line:
        return False
    normalized = line.strip()
    if len(normalized) < 4:
        return False
    if normalized.isupper():
        return any(re.match(pattern, normalized, re.IGNORECASE) for pattern in HEADING_KEYWORDS)
    return bool(re.match(r'^(BAB|CHAPTER)\s+\d+', normalized, re.IGNORECASE))

def format_heading(line: str) -> str:
    return f"**{line.strip()}**"

def reformat_text(text: str) -> str:
    lines = [normalize_line(l) for l in text.splitlines()]
    output = []
    paragraph = []

    def flush_paragraph():
        if paragraph:
            output.append(" ".join(paragraph))
            paragraph.clear()

    for line in lines:
        if not line:
            flush_paragraph()
            output.append("")
            continue

        if is_heading(line):
            flush_paragraph()
            output.append(format_heading(line))
            output.append("")
            continue

        if line.endswith("-"):
            paragraph.append(line[:-1])
            continue

        if paragraph:
            paragraph.append(line)
        else:
            paragraph.append(line)

    flush_paragraph()
    return "\n".join(output).strip() + "\n"

def process_files():
    if not EBOOK_DIR.exists():
        raise FileNotFoundError(f"EBOOK_DIR not found: {EBOOK_DIR}")
    for path in sorted(EBOOK_DIR.glob("*.txt")):
        content = path.read_text(encoding="utf-8")
        new_content = reformat_text(content)
        path.write_text(new_content, encoding="utf-8")
        print(f"Reformatted: {path.name}")

if __name__ == "__main__":
    process_files()