const fs = require('fs');
const path = require('path');

class ImamNawawiLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return { pureEditions: [], bilingualEditions: [], legacyArchive: [] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      pureEditions: [],
      bilingualEditions: [],
      legacyArchive: []
    };

    const nawawiTitles = {
      "al_arbaun_al_nawawiyya": { en: "The Forty Hadith (Al-Arba'in al-Nawawiyyah)", ar: "الأربعون النووية" },
      "riyad_al_salihin": { en: "Gardens of the Righteous (Riyad al-Salihin)", ar: "رياض الصالحين من كلام سيد المرسلين" },
      "al_tibyan_fi_adab_hamalat_al_quran": { en: "Etiquette with the Quran (Al-Tibyan)", ar: "التبيان في آداب حملة القرآن" },
      "kitab_al_adhkar": { en: "The Book of Remembrances (Kitab al-Adhkar)", ar: "الأذكار المنتخبة من كلام سيد الأبرار" },
      "minhaj_al_talibin": { en: "The Path of the Seekers (Minhaj al-Talibin)", ar: "منهاج الطالبين وعمدة المفتين" },
      "bustan_al_arifin": { en: "Garden of the Gnostics (Bustan al-'Arifin)", ar: "بستان العارفين" },
      "sharh_sahih_muslim": { en: "Commentary on Sahih Muslim (Al-Minhaj)", ar: "المنهاج شرح صحيح مسلم بن الحجاج" },
      "al_majmu_sharh_al_muhadhdhab": { en: "The Vast Compendium in Fiqh (Al-Majmu')", ar: "المجموع شرح المهذب" },
      "rawdat_al_talibin": { en: "The Meadow of the Seekers (Rawdat al-Talibin)", ar: "روضة الطالبين وعمدة المفتين" },
      "tahdhib_al_asma_wa_al_lughat": { en: "Refinement of Names and Lexicon", ar: "تهذيب الأسماء واللغات" },
      "al_taqrib_wa_al_taysir": { en: "Introduction to Hadith Sciences (Al-Taqrib)", ar: "التقريب والتيسير لمعرفة سنن البشير النذير" },
      "al_idah_fi_manasik_al_hajj": { en: "Clarification of Rites of Hajj (Al-Idah)", ar: "الإيضاح في مناسك الحج والعمرة" },
      "adab_al_fatwa_wa_al_mufti": { en: "The Decorum of Legal Rulings (Adab al-Fatwa)", ar: "أدب الفتوى والمفتي والمستفتي" },
      "daqaiq_al_minhaj": { en: "Subtleties of the Minhaj (Daqaiq al-Minhaj)", ar: "دقائق المنهاج" },
      "khulasat_al_ahkam": { en: "Epitome of Legal Judgments (Khulasat al-Ahkam)", ar: "خلاصة الأحكام في مهمات السنن" },
      "irshad_tullab_al_haqaiq": { en: "Guiding the Seekers of Truth (Irshad Tullab)", ar: "إرشاد طلاب الحقائق" },
      "tahrir_alfaz_al_tanbih": { en: "Lexical Gloss on Al-Tanbih (Tahrir Alfaz)", ar: "تحرير ألفاظ التنبيه" },
      "al_masail_al_manthurah": { en: "Collected Legal Edicts (Fatawa al-Nawawi)", ar: "الفتاوى أو المسائل المنثورة" },
      "al_ijaz_fi_sharh_sunan_abi_dawud": { en: "Commentary on Sunan Abi Dawud (Al-Ijaz)", ar: "الإيجاز في شرح سنن أبي داود" },
      "risalah_fi_al_itiqad": { en: "Treatise on the Creed of the Forebears", ar: "رسالة في الاعتقاد وأهل السنة" },
      "al_usul_wa_al_dawabit": { en: "Legal Principles and Maxims (Al-Usul)", ar: "الأصول والضوابط" },
      "takhmis_al_ghanima": { en: "Quintipartition of Spoils (Takhmis al-Ghanima)", ar: "تخميس الغنيمة" }
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / 1024).toFixed(1) + ' KB';
      const downloadUrl = `/epubs/${file}`;

      if (file.startsWith('sanan') || file.startsWith('senan')) {
        catalog.legacyArchive.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Sunan Early Trial Draft [${file}]`,
          arabicTitle: 'مسودة السنن المبكرة',
          author: 'Imam Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)',
          size: sizeStr,
          downloadUrl,
          edition: 'pre-v4 Trial'
        });
        return;
      }

      for (const [slug, info] of Object.entries(nawawiTitles)) {
        if (file.startsWith(slug)) {
          const isBilingual = file.includes('_bilingual_lexical_en.epub');
          const isPure = file.includes('_pure_en.epub');
          if (!isBilingual && !isPure) continue;

          const item = {
            id: file.replace('.epub', ''),
            slug,
            filename: file,
            title: isBilingual ? `${info.en} (Bilingual Apparatus Edition)` : `${info.en} (Pure English Edition)`,
            arabicTitle: info.ar,
            author: 'Imam Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)',
            size: sizeStr,
            downloadUrl,
            edition: 'AynEngine v4/v5 Official'
          };

          if (isBilingual) {
            catalog.bilingualEditions.push(item);
          } else if (isPure) {
            catalog.pureEditions.push(item);
          }
          break;
        }
      }
    });

    return catalog;
  }
}

module.exports = ImamNawawiLibrary;
