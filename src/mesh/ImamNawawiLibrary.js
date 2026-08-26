const fs = require('fs');
const path = require('path');

class ImamNawawiLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      hadithAndCreed: [],
      devotionalAndFiqh: []
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const downloadUrl = `/epubs/${file}`;

      if (
        file.startsWith('al_arbain_') ||
        file.startsWith('riyad_') ||
        file.startsWith('sharh_sahih_')
      ) {
        let title = file.replace('.epub', '').replace(/_/g, ' ');
        let arabicTitle = 'كتب الحديث للإمام النووي';
        let category = 'Hadith & Sunnah (الحديث النبوي الشريف)';

        if (file.startsWith('al_arbain')) {
          title = "The Forty Hadith of Imam al-Nawawi (Al-Arba'in al-Nawawiyyah)";
          arabicTitle = 'الأربعون النووية مع الشرح والفوائد';
          category = 'Foundational Hadith & Islamic Creed (أصول الحديث والعقيدة)';
        } else if (file.startsWith('riyad')) {
          title = "Gardens of the Righteous (Riyad al-Salihin — Complete Edition)";
          arabicTitle = 'رياض الصالحين من كلام سيد المرسلين';
          category = 'Prophetic Ethics & Righteous Conduct (الأخلاق والآداب النبوية)';
        } else if (file.startsWith('sharh_sahih')) {
          title = "Al-Minhaj: Commentary on Sahih Muslim (Sharh Sahih Muslim)";
          arabicTitle = 'المنهاج شرح صحيح مسلم بن الحجاج';
          category = 'Comprehensive Hadith Commentary (شروح كتب السنة)';
        }

        catalog.hadithAndCreed.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)',
          category,
          size: sizeStr,
          downloadUrl
        });
      } else if (
        file.startsWith('kitab_al_adhkar_') ||
        file.startsWith('al_tibyan_') ||
        file.startsWith('minhaj_al_talibin_')
      ) {
        let title = file.replace('.epub', '').replace(/_/g, ' ');
        let arabicTitle = 'مصنفات الإمام النووي';
        let category = 'Fiqh, Adab & Invocations (الفقه والآداب والأذكار)';

        if (file.startsWith('kitab_al_adhkar')) {
          title = "The Book of Remembrances (Kitab al-Adhkar)";
          arabicTitle = 'حلية الأبرار وشعار الأخيار في تلخيص الدعوات والأذكار (الأذكار النووية)';
          category = 'Supplications & Daily Litanies (الأذكار والأوراد النبوية)';
        } else if (file.startsWith('al_tibyan')) {
          title = "Etiquette with the Quran (Al-Tibyan fi Adab Hamalat al-Quran)";
          arabicTitle = 'التبيان في آداب حملة القرآن';
          category = 'Quranic Etiquette & Sacred Sciences (آداب تلاوة وحملة القرآن)';
        } else if (file.startsWith('minhaj_al_talibin')) {
          title = "The Path of Seekers (Minhaj al-Talibin wa 'Umdat al-Muftin)";
          arabicTitle = 'منهاج الطالبين وعمدة المفتين في فقه الإمام الشافعي';
          category = 'Shafi\'i Jurisprudence & Legal Rulings (الفقه الشافعي المعتمد)';
        }

        catalog.devotionalAndFiqh.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Muhyi al-Din Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي)',
          category,
          size: sizeStr,
          downloadUrl
        });
      }
    });

    return catalog;
  }
}

module.exports = ImamNawawiLibrary;
