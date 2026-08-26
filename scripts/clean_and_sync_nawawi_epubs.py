import os
import shutil
from pathlib import Path

source_dir = Path("/home/absolut7/.gemini/antigravity/scratch/translation_engine_framework/data/epubs/nawawi")
target_dir = Path("/home/absolut7/Documents/news/wyresup-mesh-app/public/epubs")

nawawi_slugs = [
    "adab_al_fatwa_wa_al_mufti",
    "al_arbaun_al_nawawiyya",
    "al_idah_fi_manasik_al_hajj",
    "al_ijaz_fi_sharh_sunan_abi_dawud",
    "al_majmu_sharh_al_muhadhdhab",
    "al_masail_al_manthurah",
    "al_taqrib_wa_al_taysir",
    "al_tibyan_fi_adab_hamalat_al_quran",
    "al_usul_wa_al_dawabit",
    "bustan_al_arifin",
    "daqaiq_al_minhaj",
    "irshad_tullab_al_haqaiq",
    "khulasat_al_ahkam",
    "kitab_al_adhkar",
    "minhaj_al_talibin",
    "rawdat_al_talibin",
    "risalah_fi_al_itiqad",
    "riyad_al_salihin",
    "sharh_sahih_muslim",
    "tahdhib_al_asma_wa_al_lughat",
    "tahrir_alfaz_al_tanbih",
    "takhmis_al_ghanima"
]

# 1. Remove old/stale Nawawi files
removed = 0
for f in target_dir.glob("*.epub"):
    for slug in nawawi_slugs:
        if f.name.startswith(slug):
            # Check if this is an authentic dual edition
            if not (f.name == f"{slug}_pure_en.epub" or f.name == f"{slug}_bilingual_lexical_en.epub"):
                print(f"🗑️ Removing legacy/stale file: {f.name}")
                f.unlink()
                removed += 1
            break

print(f"Cleaned {removed} legacy Nawawi files.")

# 2. Copy all authentic 44 EPUBs from source
copied = 0
for epub in source_dir.glob("*.epub"):
    dest = target_dir / epub.name
    shutil.copy2(epub, dest)
    copied += 1

print(f"✅ Successfully copied {copied} authentic Nawawi dual-edition EPUBs to {target_dir}")

