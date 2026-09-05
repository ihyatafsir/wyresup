const fs = require('fs');
const path = require('path');

class ImamRaghibLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return { pureEditions: [], bilingualEditions: [] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      pureEditions: [],
      bilingualEditions: []
    };

    const raghibTitles = {
      "al_mufradat_fi_gharib_al_quran": {
        en: "The Lexicon of Quranic Vocabulary (Al-Mufradat fi Gharib al-Qur'an)",
        ar: "المفردات في غريب القرآن"
      },
      "al_dhariah_ila_makarim_al_shariah": {
        en: "The Means to the Noble Excellences of Divine Law (Al-Dhari'ah ila Makarim al-Shari'ah)",
        ar: "الذريعة إلى مكارم الشريعة"
      },
      "tafsil_al_nashatayn": {
        en: "The Elucidation of the Two Existences (Tafsil al-Nash'atayn)",
        ar: "تفصيل النشأتين وتحصيل السعادتين"
      },
      "adab_ikhtilat_al_nas": {
        en: "The Decorum of Interacting with People (Adab Ikhtilat al-Nas)",
        ar: "أدب اختلاط الناس"
      },
      "muhadarat_al_udaba": {
        en: "Lectures of the Literati and Dialogues of the Eloquent (Muhadarat al-Udaba')",
        ar: "محاضرات الأدباء ومحاورات الشعراء والبلغاء"
      },
      "jami_al_tafsir": {
        en: "The Comprehensive Exegesis (Jami' al-Tafsir)",
        ar: "جامع التفسير"
      }
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / 1024).toFixed(1) + ' KB';
      const downloadUrl = `/epubs/${file}`;

      for (const [slug, info] of Object.entries(raghibTitles)) {
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
            author: 'Imam al-Raghib al-Isfahani (الإمام الراغب الأصفهاني d. 502 AH)',
            size: sizeStr,
            downloadUrl
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

module.exports = ImamRaghibLibrary;
