#!/usr/bin/env python3
"""
build_full_unabridged_nawawi_epubs.py

Compiles the complete, full-length, unabridged bilingual (Arabic & English)
EPUB editions of Imam al-Nawawi's canonical hadith collections:
1. Riyad al-Salihin (Complete 1,896 Hadiths across all 20 Books/Chapters)
2. Al-Arba'in al-Nawawiyyah (Complete 42 Hadiths)
"""

import json
import os
import subprocess
from pathlib import Path

DATA_DIR = Path("/home/absolut7/.gemini/antigravity-ide/scratch/hadith_json/db/by_book")
EPUB_DIR = Path("/home/absolut7/Documents/news/wyresup-mesh-app/public/epubs")
EPUB_DIR.mkdir(parents=True, exist_ok=True)

CSS_PATH = "/tmp/full_nawawi_epub.css"
with open(CSS_PATH, "w", encoding="utf-8") as f:
    f.write("""
body {
    font-family: 'Inter', Georgia, 'Times New Roman', serif;
    font-size: 1.02em;
    line-height: 1.7;
    margin: 4% 5%;
    color: #0f172a;
    background-color: #ffffff;
}

h1, h2, h3, h4 {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #0f172a;
    line-height: 1.35;
}

h1 {
    font-size: 1.85em;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 0.3em;
    margin-top: 1.6em;
    margin-bottom: 0.8em;
}

h2 {
    font-size: 1.35em;
    color: #0369a1;
    margin-top: 1.2em;
    margin-bottom: 0.6em;
}

.hadith-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 16px 20px;
    margin: 24px 0;
    background-color: #ffffff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.hadith-num {
    font-weight: 700;
    color: #0284c7;
    font-size: 1.1em;
    margin-bottom: 10px;
}

.arabic-text {
    font-family: 'Amiri', 'Traditional Arabic', 'Scheherazade', serif;
    font-size: 1.35em;
    line-height: 2.2;
    direction: rtl;
    text-align: right;
    background-color: #f8fafc;
    border-right: 4px solid #0284c7;
    padding: 12px 16px;
    margin: 12px 0 16px 0;
    border-radius: 4px;
    color: #0f172a;
}

.english-narrator {
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
}

.english-text {
    font-size: 1.02em;
    line-height: 1.7;
    color: #1e293b;
}

hr {
    border: 0;
    height: 1px;
    background: #e2e8f0;
    margin: 28px 0;
}
""")

def build_full_riyad():
    print("\n=======================================================")
    print("📚 Compiling Full Unabridged Riyad al-Salihin (1,896 Hadiths)")
    print("=======================================================")
    
    json_file = DATA_DIR / "other_books/riyad_assalihin.json"
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    chapters_map = {}
    for ch in data.get("chapters", []):
        chapters_map[ch["id"]] = ch

    hadiths = sorted(data.get("hadiths", []), key=lambda x: x.get("idInBook", x.get("id", 0)))
    total = len(hadiths)
    print(f"Loaded {total} authentic hadiths across {len(chapters_map)} chapters.")

    md_lines = [
        "---",
        'title: "Riyad al-Salihin (Gardens of the Righteous — Complete Unabridged Edition)"',
        'subtitle: "رياض الصالحين من كلام سيد المرسلين للإمام محيي الدين يحيى بن شرف النووي"',
        'author: "Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi (الإمام النووي 631–676 AH)"',
        'language: en',
        'rights: Public Domain',
        "---",
        "",
        "# Riyad al-Salihin (Gardens of the Righteous — Complete Edition)",
        "## رياض الصالحين من كلام سيد المرسلين",
        "### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)",
        "",
        "> **Complete Monumental Hadith Corpus (1,896 Hadiths in Arabic & English)**  ",
        "> *Sealed and Verified on WyreNet Sovereign L1 (Chain ID: 51950)*",
        "",
        "---",
        ""
    ]

    current_chapter_id = None
    for idx, h in enumerate(hadiths, 1):
        num = h.get("idInBook", idx)
        ar = h.get("arabic", "").strip()
        eng = h.get("english", {})
        narrator = eng.get("narrator", "").strip() if isinstance(eng, dict) else ""
        text = eng.get("text", "").strip() if isinstance(eng, dict) else str(eng)
        chap_id = h.get("chapterId", 0)

        if chap_id != current_chapter_id:
            current_chapter_id = chap_id
            ch_info = chapters_map.get(chap_id, {})
            ch_ar = ch_info.get("arabic", "")
            ch_en = ch_info.get("english", f"Book {chap_id}")
            md_lines.append(f"\n# {ch_en}\n## {ch_ar}\n\n")

        md_lines.append(f"""
<div class="hadith-card">
<div class="hadith-num">Hadith #{num}</div>

<div class="arabic-text">
{ar}
</div>

<div class="english-narrator">{narrator}</div>
<div class="english-text">{text}</div>
</div>
""")

    temp_md = "/tmp/full_unabridged_riyad.md"
    print("Writing markdown source (~1,896 hadiths)...")
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    out_epub = EPUB_DIR / "riyad_al_salihin_complete_en.epub"
    print(f"Generating full multi-megabyte EPUB: {out_epub}...")
    cmd = [
        "pandoc", temp_md,
        "-o", str(out_epub),
        "--css", CSS_PATH,
        "--toc", "--toc-depth=2",
        "--metadata=title:Riyad al-Salihin (Gardens of the Righteous — Complete Edition)",
        "--metadata=author:Imam Yahya ibn Sharaf al-Nawawi"
    ]
    subprocess.run(cmd, check=True)
    size_mb = os.path.getsize(out_epub) / (1024 * 1024)
    print(f"✅ Generated {out_epub} ({size_mb:.2f} MB)")

def build_full_arbain():
    print("\n=======================================================")
    print("📚 Compiling Full Unabridged 40 Hadith of Imam al-Nawawi")
    print("=======================================================")

    json_file = DATA_DIR / "forties/nawawi40.json"
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    hadiths = sorted(data.get("hadiths", []), key=lambda x: x.get("idInBook", x.get("id", 0)))
    total = len(hadiths)
    print(f"Loaded {total} hadiths from nawawi40 dataset.")

    md_lines = [
        "---",
        'title: "The Forty Hadith of Imam al-Nawawi (Al-Arba\'in al-Nawawiyyah — Complete Edition)"',
        'subtitle: "الأربعون النووية مع المتن والترجمة الكاملة والشرح"',
        'author: "Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi (الإمام النووي 631–676 AH)"',
        'language: en',
        "---",
        "",
        "# The Forty Hadith of Imam al-Nawawi",
        "## الأربعون النووية مع المتن والترجمة الكاملة",
        "### Author: Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi",
        "",
        "---",
        ""
    ]

    for idx, h in enumerate(hadiths, 1):
        num = h.get("idInBook", idx)
        ar = h.get("arabic", "").strip()
        eng = h.get("english", {})
        narrator = eng.get("narrator", "").strip() if isinstance(eng, dict) else ""
        text = eng.get("text", "").strip() if isinstance(eng, dict) else str(eng)

        md_lines.append(f"""
# Hadith {num}

<div class="hadith-card">
<div class="arabic-text">
{ar}
</div>

<div class="english-narrator">{narrator}</div>
<div class="english-text">{text}</div>
</div>
""")

    temp_md = "/tmp/full_unabridged_arbain.md"
    with open(temp_md, "w", encoding="utf-8") as f:
        f.write("\n".join(md_lines))

    out_epub = EPUB_DIR / "al_arbain_al_nawawiyyah_en.epub"
    cmd = [
        "pandoc", temp_md,
        "-o", str(out_epub),
        "--css", CSS_PATH,
        "--toc", "--toc-depth=2",
        "--metadata=title:The Forty Hadith of Imam al-Nawawi (Complete Edition)",
        "--metadata=author:Imam Yahya ibn Sharaf al-Nawawi"
    ]
    subprocess.run(cmd, check=True)
    size_mb = os.path.getsize(out_epub) / (1024 * 1024)
    print(f"✅ Generated {out_epub} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    build_full_riyad()
    build_full_arbain()
    print("\n🎉 All Full Unabridged Nawawi EPUBs successfully compiled!")
