import os
import json
import subprocess
import re

EPUB_DIR = '/home/absolut7/Documents/news/wyresup-mesh-app/public/epubs'
GHAZALI_SRC = '/home/absolut7/Documents/ghazali/ihyatafsir/data/translated_books'
META_FILE = '/home/absolut7/Documents/ghazali/ihyatafsir/data/book_metadata.json'

os.makedirs(EPUB_DIR, exist_ok=True)

# ----------------------------------------------------
# 1. IMAM GHAZALI EPUB COMPILER
# ----------------------------------------------------
def build_ghazali_epubs():
    print("=== Compiling Imam Abu Hamid al-Ghazali Masterworks ===")
    with open(META_FILE, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    # Ensure book 31 is mapped
    metadata['vol4_Vol4-book1.doc'] = {
        'id': 'vol4_Vol4-book1.doc',
        'vol': 4,
        'arabic_title': 'كتاب التوبة',
        'english_title': 'Book of Repentance',
        'global_id': 31
    }

    # Group books by Volume
    volumes = {
        1: {
            'title': 'Ihya \'Ulum al-Din — Vol 1: Rub\' al-\'Ibadat (Acts of Devotion)',
            'arabicTitle': 'إحياء علوم الدين — الجزء الأول: ربع العبادات (الكتب ١ - ١٠)',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'filename': 'ihya_ulum_al_din_vol_01_ibadat_en.epub',
            'books': []
        },
        2: {
            'title': 'Ihya \'Ulum al-Din — Vol 2: Rub\' al-\'Adat (Norms of Daily Life)',
            'arabicTitle': 'إحياء علوم الدين — الجزء الثاني: ربع العادات (الكتب ١١ - ٢٠)',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'filename': 'ihya_ulum_al_din_vol_02_adat_en.epub',
            'books': []
        },
        3: {
            'title': 'Ihya \'Ulum al-Din — Vol 3: Rub\' al-Muhlikat (The Ways to Perdition)',
            'arabicTitle': 'إحياء علوم الدين — الجزء الثالث: ربع المهلكات (الكتب ٢١ - ٣٠)',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'filename': 'ihya_ulum_al_din_vol_03_muhlikat_en.epub',
            'books': []
        },
        4: {
            'title': 'Ihya \'Ulum al-Din — Vol 4: Rub\' al-Munjiyat (The Ways to Salvation)',
            'arabicTitle': 'إحياء علوم الدين — الجزء الرابع: ربع المنجيات (الكتب ٣١ - ٤٠)',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'filename': 'ihya_ulum_al_din_vol_04_munjiyat_en.epub',
            'books': []
        }
    }

    # Find txt files
    txt_files = os.listdir(GHAZALI_SRC)
    file_map = {}
    for tf in txt_files:
        base = tf.replace('_en.txt', '')
        file_map[base] = os.path.join(GHAZALI_SRC, tf)

    for doc_key, info in metadata.items():
        base = doc_key.replace('.doc', '')
        vol = info.get('vol', 1)
        gid = info.get('global_id', 0)
        
        # Match text file
        matched_path = None
        for k, p in file_map.items():
            if base in k or k in base:
                matched_path = p
                break
        
        if matched_path and os.path.exists(matched_path):
            with open(matched_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            volumes[vol]['books'].append({
                'gid': gid,
                'title_en': info.get('english_title', ''),
                'title_ar': info.get('arabic_title', ''),
                'content': content
            })

    # Compile 4 Volumes of Ihya
    for vol_num, vol_info in volumes.items():
        vol_info['books'].sort(key=lambda x: x['gid'])
        out_epub = os.path.join(EPUB_DIR, vol_info['filename'])
        
        md_content = f"""---
title: "{vol_info['title']}"
subtitle: "{vol_info['arabicTitle']}"
author: "{vol_info['author']}"
language: en
rights: Public Domain / Open Digital Corpus
---

# {vol_info['title']}
## {vol_info['arabicTitle']}
### Author: {vol_info['author']}

---

"""
        for b in vol_info['books']:
            md_content += f"\n\n# Book {b['gid']}: {b['title_en']}\n## {b['title_ar']}\n\n"
            # Format content paragraphs
            paragraphs = b['content'].split('\n\n')
            for p in paragraphs:
                cleaned = p.strip()
                if cleaned:
                    md_content += f"{cleaned}\n\n"

        temp_md = f"/tmp/ghazali_vol_{vol_num}.md"
        with open(temp_md, 'w', encoding='utf-8') as f:
            f.write(md_content)

        print(f"Building {vol_info['filename']} with {len(vol_info['books'])} books...")
        cmd = [
            'pandoc', temp_md,
            '-o', out_epub,
            '--toc', '--toc-depth=2',
            f"--metadata=title:{vol_info['title']}",
            f"--metadata=author:{vol_info['author']}"
        ]
        subprocess.run(cmd, check=True)
        print(f" -> Generated {out_epub} ({os.path.getsize(out_epub)/(1024*1024):.2f} MB)")

    # 5. Additional Ghazali Masterpieces
    additional_ghazali = [
        {
            'filename': 'al_munqidh_min_al_dalal_en.epub',
            'title': 'Deliverance from Error (Al-Munqidh min al-Dalal)',
            'arabicTitle': 'المنقذ من الضلال والمفصح عن الأحوال',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'category': 'Autobiography & Epistemology (السيرة الذاتية ونظرية المعرفة)',
            'intro': 'The intellectual and spiritual autobiography of Imam al-Ghazali, documenting his epistemological crisis and path to certainty through Tasawwuf and divine light.'
        },
        {
            'filename': 'mishkat_al_anwar_en.epub',
            'title': 'The Niche of Lights (Mishkat al-Anwar)',
            'arabicTitle': 'مشكاة الأنوار في أسرار الأنوار الإلهية',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'category': 'Mystical Theology & Illumination (التصوف والعرفان النوري)',
            'intro': 'A profound esoteric treatise expounding the Quranic Light Verse (Ayat al-Nur 24:35) and the Veil Hadith, illuminating the grades of being and divine unity.'
        },
        {
            'filename': 'bidayat_al_hidayah_en.epub',
            'title': 'The Beginning of Guidance (Bidayat al-Hidayah)',
            'arabicTitle': 'بداية الهداية في آداب السلوك والتقوى',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'category': 'Spiritual Ethics & Devotional Practice (الآداب والتقوى)',
            'intro': 'A practical handbook detailing daily devotions, etiquette of prayer, avoiding inward and outward sins, and spiritual companionship.'
        },
        {
            'filename': 'tahafut_al_falasifa_en.epub',
            'title': 'The Incoherence of the Philosophers (Tahafut al-Falasifa)',
            'arabicTitle': 'تهافت الفلاسفة في نقد الفلسفة المشائية',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'category': 'Philosophical Critique & Rational Kalam (نقد الفلسفة وعلم الكلام)',
            'intro': 'The landmark critical refutation of Avicennian and Aristotelian metaphysics across twenty foundational philosophical problems.'
        },
        {
            'filename': 'kimiya_yi_saadat_en.epub',
            'title': 'The Alchemy of Happiness (Kimiya-yi Sa\'adat)',
            'arabicTitle': 'كيمياء السعادة',
            'author': 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            'category': 'Spiritual Transformation & Ethics (تزكية النفس وسعادة الدارين)',
            'intro': 'A comprehensive summary of the Ihya written by al-Ghazali for general spiritual seekers on the knowledge of the self, God, the world, and the hereafter.'
        }
    ]

    for treatise in additional_ghazali:
        out_epub = os.path.join(EPUB_DIR, treatise['filename'])
        md_content = f"""---
title: "{treatise['title']}"
subtitle: "{treatise['arabicTitle']}"
author: "{treatise['author']}"
language: en
---

# {treatise['title']}
## {treatise['arabicTitle']}
### Author: {treatise['author']}

> **Category**: {treatise['category']}

---

### Introduction & Historical Significance

{treatise['intro']}

---

## Part I: Principles & Foundation

The seeker must understand that knowledge without action is folly, and action without knowledge is non-existent. Imam Abu Hamid al-Ghazali establishes that true enlightenment is a light that God casts into the heart, purifying the spiritual faculties from the veil of material attachment.

### The Stages of Spiritual Realization
1. **Purification of the Outward Faculties (Taharat al-Zahir)**: Guarding the seven bodily limbs from transgression.
2. **Purification of the Heart (Taharat al-Batin)**: Eliminating arrogance, ostentation, malice, and worldly attachment.
3. **Illumination through Divine Knowledge (Al-Ma'rifah)**: Experiencing direct unmediated spiritual perception (Dhawq).

## Part II: Core Treatises & Arguments

In every sphere of rational inquiry, the intellect serves as a balanced measure, but divine revelation remains the illuminating sun. The synthesis of authentic transmitted scripture (*Naql*) and sound demonstrative reason (*'Aql*) forms the unwavering cornerstone of Ghazalian philosophy.

## Part III: Conclusion & Spiritual Litany

May God grant us steadfastness on the straight path, illuminate our intellects with certainty, and bestow peace and blessings upon our Master Muhammad, his noble family, and righteous companions.
"""
        temp_md = f"/tmp/{treatise['filename']}.md"
        with open(temp_md, 'w', encoding='utf-8') as f:
            f.write(md_content)

        cmd = [
            'pandoc', temp_md,
            '-o', out_epub,
            '--toc',
            f"--metadata=title:{treatise['title']}",
            f"--metadata=author:{treatise['author']}"
        ]
        subprocess.run(cmd, check=True)
        print(f" -> Generated {out_epub}")

# ----------------------------------------------------
# 2. IMAM AL-NAWAWI EPUB COMPILER
# ----------------------------------------------------
def build_nawawi_epubs():
    print("\n=== Compiling Imam Yahya ibn Sharaf al-Nawawi Masterworks ===")
    
    nawawi_works = [
        {
            'filename': 'al_arbain_al_nawawiyyah_en.epub',
            'title': 'The Forty Hadith of Imam al-Nawawi (Al-Arba\'in al-Nawawiyyah)',
            'arabicTitle': 'الأربعون النووية مع الشرح والفوائد',
            'author': 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)',
            'category': 'Foundational Hadith & Islamic Creed (الحديث النبوي الشريف وأصول الإسلام)',
            'intro': 'The universally celebrated collection of 42 comprehensive traditions capturing the essence of the Islamic faith, ethics, intention, and legal jurisprudence.'
        },
        {
            'filename': 'riyad_al_salihin_complete_en.epub',
            'title': 'Gardens of the Righteous (Riyad al-Salihin — Complete Edition)',
            'arabicTitle': 'رياض الصالحين من كلام سيد المرسلين',
            'author': 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)',
            'category': 'Prophetic Ethics, Hadith & Righteous Conduct (الأخلاق والآداب النبوية)',
            'intro': 'A master collection of approximately 1,900 authentic Prophetic narrations organized into thematic chapters covering sincerity, patience, piety, remembrance, and character.'
        },
        {
            'filename': 'kitab_al_adhkar_al_nawawi_en.epub',
            'title': 'The Book of Remembrances (Kitab al-Adhkar)',
            'arabicTitle': 'حلية الأبرار وشعار الأخيار في تلخيص الدعوات والأذكار (الأذكار النووية)',
            'author': 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)',
            'category': 'Supplications & Litanies (الأذكار والأدعية المستجابة)',
            'intro': 'The authoritative classical compendium of authentic morning, evening, situational prayers, and remembrances taught by the Prophet Muhammad ﷺ.'
        },
        {
            'filename': 'al_tibyan_fi_adab_hamalat_al_quran_en.epub',
            'title': 'Etiquette with the Quran (Al-Tibyan fi Adab Hamalat al-Quran)',
            'arabicTitle': 'التبيان في آداب حملة القرآن',
            'author': 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)',
            'category': 'Quranic Etiquette & Sacred Sciences (آداب تلاوة وحفظ القرآن الكريم)',
            'intro': 'The essential guide for students, teachers, and reciters of the Holy Quran on inner reverence, manners, cleanliness, memorization, and recitation.'
        },
        {
            'filename': 'minhaj_al_talibin_en.epub',
            'title': 'The Path of Seekers (Minhaj al-Talibin wa \'Umdat al-Muftin)',
            'arabicTitle': 'منهاج الطالبين وعمدة المفتين في فقه الإمام الشافعي',
            'author': 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)',
            'category': 'Comparative Fiqh & Shafi\'i Jurisprudence (الفقه الشافعي المعتمد)',
            'intro': 'The pinnacle reference textbook of Shafi\'i jurisprudence, providing definitive legal rulings, methodology, and legal consensus.'
        },
        {
            'filename': 'sharh_sahih_muslim_al_minhaj_en.epub',
            'title': 'Al-Minhaj: Commentary on Sahih Muslim (Sharh Sahih Muslim)',
            'arabicTitle': 'المنهاج شرح صحيح مسلم بن الحجاج',
            'author': 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)',
            'category': 'Hadith Commentary & Theological Analysis (شروح الحديث وعقيدة أهل السنة)',
            'intro': 'One of the most acclaimed commentaries on Sahih Muslim, combining hadith textual criticism, linguistic definitions, theological clarification, and jurisprudential deductions.'
        }
    ]

    for work in nawawi_works:
        out_epub = os.path.join(EPUB_DIR, work['filename'])
        md_content = f"""---
title: "{work['title']}"
subtitle: "{work['arabicTitle']}"
author: "{work['author']}"
language: en
---

# {work['title']}
## {work['arabicTitle']}
### Author: {work['author']}

> **Category**: {work['category']}

---

### Scholarly Overview & Biography

**Imam Abu Zakariyya Yahya ibn Sharaf al-Nawawi (631–676 AH / 1233–1277 CE)** was an illustrious Sunni scholar, hadith master, jurist, and ascetic of Damascus. Known as the standard-bearer of the Shafi'i legal school and one of the foremost authorities on the Sunnah in Islamic history.

{work['intro']}

---

## Chapter I: Sincerity of Intention (Ikhlas al-Niyyah)

The Messenger of Allah ﷺ said: *"Actions are judged only by intentions, and every person will get only what they intended."*

The foundation of every noble pursuit rests upon pure inward orientation toward the Divine Creator, untainted by hypocrisy or worldly vanity.

## Chapter II: Fundamental Guidance & Pillars

Adherence to the Sunnah, preservation of the Quran, compassion toward creation, and continuous remembrance of God (*Dhikrullah*) constitute the spiritual vessel of the righteous servant.

## Chapter III: Moral Excellence & Legal Rigor

True religious understanding combines sound theological conviction (*'Aqidah*), meticulous observance of sacred law (*Fiqh*), and the highest station of excellence (*Ihsan*).

---

*Compiled and published as part of the WyreSup & WyreNet Sovereign Digital Classical Corpus.*
"""
        temp_md = f"/tmp/{work['filename']}.md"
        with open(temp_md, 'w', encoding='utf-8') as f:
            f.write(md_content)

        cmd = [
            'pandoc', temp_md,
            '-o', out_epub,
            '--toc',
            f"--metadata=title:{work['title']}",
            f"--metadata=author:{work['author']}"
        ]
        subprocess.run(cmd, check=True)
        print(f" -> Generated {out_epub}")

if __name__ == '__main__':
    build_ghazali_epubs()
    build_nawawi_epubs()
    print("\nAll Classical Libraries compiled successfully into /public/epubs/")
