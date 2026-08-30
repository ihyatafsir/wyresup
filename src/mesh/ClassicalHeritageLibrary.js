const fs = require('fs');
const path = require('path');

class ClassicalHeritageLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return { shamailAndSira: [], irfanAndMetaphysics: [], spiritualConduct: [] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      shamailAndSira: [],
      irfanAndMetaphysics: [],
      spiritualConduct: []
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const downloadUrl = '/epubs/' + file;

      // 1. Qadi Iyad - Kitab al-Shifa
      if (file.startsWith('al_shifa_')) {
        const isAlbanian = file.endsWith('_sq.epub');
        const lang = isAlbanian ? 'Albanian (Shqip)' : 'English';
        catalog.shamailAndSira.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: 'Kitab al-Shifa bi-Ta\'rif Huquq al-Mustafa (' + lang + ')',
          arabicTitle: 'كتاب الشفا بتعريف حقوق المصطفى صلى الله عليه وسلم',
          author: 'Qadi \'Iyad al-Yahsubi (القاضي عياض بن موسى اليحصبي 476–544 AH)',
          category: 'Prophetic Biography & Shama\'il (السيرة والشمائل المحمدية)',
          language: lang,
          size: sizeStr,
          downloadUrl
        });
      }
      // 2. Shaykh al-Akbar Ibn Arabi - Al-Futuhat al-Makkiyya
      else if (file.startsWith('al_futuhat_')) {
        const isAlbanian = file.endsWith('_sq.epub');
        const lang = isAlbanian ? 'Albanian (Shqip)' : 'English';
        catalog.irfanAndMetaphysics.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: 'Al-Futuhat al-Makkiyya — The Meccan Revelations (' + lang + ')',
          arabicTitle: 'الفتوحات المكية في معرفة الأسرار المالكية والملكية',
          author: 'Shaykh al-Akbar Muhyi al-Din Ibn \'Arabi (الشيخ الأكبر محيي الدين بن عربي 560–638 AH)',
          category: 'Islamic Metaphysics, Tasawwuf & \'Irfan (التصوف والعرفان الإلهي)',
          language: lang,
          size: sizeStr,
          downloadUrl
        });
      }
      // 3. Imam al-Mawwaq - Sunan al-Muhtadin
      else if (file.startsWith('sunan_al_muhtadin_')) {
        let edition = 'Pure English Scholarly Translation';
        if (file.includes('bilingual')) edition = 'Bilingual Classical Arabic + Lexical Edition';
        if (file.includes('oversight')) edition = 'Critical Oversight & Comparative Apparatus Edition';

        catalog.spiritualConduct.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: 'Sunan al-Muhtadin fi Maqamat al-Din — ' + edition,
          arabicTitle: 'سنن المهتدين في مقامات الدين',
          author: 'Imam Abu Abd Allah al-Mawwaq al-Gharnati (الإمام أبو عبد الله المواق الغرناطي 797–897 AH)',
          category: 'Spiritual Conduct, Jurisprudence & Ethics (السلوك والفقه والأخلاق)',
          edition,
          size: sizeStr,
          downloadUrl
        });
      }
    });

    return catalog;
  }
}

module.exports = ClassicalHeritageLibrary;
