const fs = require('fs');
const path = require('path');

class ImamRaziLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    // Group catalog
    const catalog = {
      tafsirKabir: [],
      matalib: [],
      kalamTreatises: [],
      companions: []
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const downloadUrl = `/epubs/${file}`;

      if (file.startsWith('tafsir_kabir_')) {
        const volMatch = file.match(/vol_(\d+)/);
        const volNum = volMatch ? parseInt(volMatch[1], 10) : 1;
        catalog.tafsirKabir.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Tafsir al-Kabir (Mafatih al-Ghayb) — Volume ${volNum}`,
          arabicTitle: `التفسير الكبير (مفاتيح الغيب) — المجلد ${volNum}`,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Tafsir & Quranic Sciences',
          volume: volNum,
          size: sizeStr,
          downloadUrl
        });
      } else if (file.startsWith('al_matalib_')) {
        const volMatch = file.match(/vol_(\d+)/);
        const volNum = volMatch ? parseInt(volMatch[1], 10) : 'Complete';
        const isLex = file.includes('ar_lex');
        catalog.matalib.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Al-Matalib al-'Aliyyah min al-'Ilm al-Ilahi ${volNum === 'Complete' ? '— Complete Edition' : `— Volume ${volNum}`} ${isLex ? '(Arabic Lexicon Edition)' : '(Pure English)'}`,
          arabicTitle: `المطالب العالية من العلم الإلهي ${volNum === 'Complete' ? '(المجموعة الكاملة)' : `(الجزء ${volNum})`}`,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Theology & Metaphysics',
          volume: volNum,
          size: sizeStr,
          downloadUrl
        });
      } else if (file.startsWith('al_shifa_') || file.startsWith('al_futuhat_')) {
        const isShifa = file.startsWith('al_shifa_');
        const lang = file.endsWith('_sq.epub') ? 'Albanian (Shqip)' : 'English';
        catalog.companions.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: isShifa ? `Al-Shifa bi-Ta'rif Huquq al-Mustafa (${lang})` : `Al-Futuhat al-Makkiyya (${lang})`,
          arabicTitle: isShifa ? 'الشفا بتعريف حقوق المصطفى' : 'الفتوحات المكية',
          author: isShifa ? "Qadi 'Iyad al-Yahsubi (القاضي عياض)" : "Shaykh al-Akbar Ibn 'Arabi (الشيخ الأكبر ابن عربي)",
          category: isShifa ? 'Prophetic Biography & Shama\'il' : 'Islamic Metaphysics & Sufism',
          size: sizeStr,
          downloadUrl
        });
      } else {
        // Other treaties of Imam Razi
        let title = file.replace('.epub', '').replace(/_/g, ' ');
        let arabicTitle = 'رسائل الإمام الرازي';
        
        if (file.includes('itiqadat') || file.includes('firaq') || file.includes('firqa')) {
          const isLex = file.includes('ar_lex');
          const isGuided = file.includes('guided');
          title = "I'tiqadat Firaq al-Muslimin wa'l-Mushrikin (Beliefs of Muslim & Non-Muslim Sects) " + (isLex ? '[Arabic Lexicon Edition]' : (isGuided ? '[Guided Translation]' : '[Standard Complete Edition]'));
          arabicTitle = 'اعتقادات فرق المسلمين والمشركين';
        } else if (file.includes('mahsul')) {
          title = "Al-Mahsul fi 'Ilm Usul al-Fiqh (The Sum Total in Jurisprudence) [Arabic Lexicon Edition]";
          arabicTitle = 'المحصول في علم أصول الفقه';
        } else if (file.startsWith('al_qada') || file.startsWith('qada_')) {
          title = "Al-Qada' wa'l-Qadar (Treatise on Divine Decree & Destiny)";
          arabicTitle = 'رسالة في القضاء والقدر';
        } else if (file.includes('asas')) {
          title = "Asas al-Taqdis (Foundations of Transcendence)";
          arabicTitle = 'أساس التقديس في علم الكلام';
        } else if (file.includes('lawami')) {
          title = "Lawami' al-Bayyinat (The Radiant Proofs on Divine Names)";
          arabicTitle = 'لوامع البينات شرح أسماء الله تعالى والصفات';
        } else if (file.includes('arbain')) {
          title = "Kitab al-Arba'in fi Usul al-Din (Forty Principles of Religion)";
          arabicTitle = 'كتاب الأربعين في أصول الدين';
        } else if (file.includes('ismat')) {
          title = "'Ismat al-Anbiya' (The Infallibility of the Prophets)";
          arabicTitle = 'عصمة الأنبياء عليهم السلام';
        } else if (file.includes('macalim')) {
          title = "Ma'alim Usul al-Din (Landmarks of the Principles of Religion)";
          arabicTitle = 'معالم أصول الدين';
        } else if (file.includes('asrar')) {
          title = "Asrar al-Tanzil wa Anwar al-Ta'wil";
          arabicTitle = 'أسرار التنزيل وأنوار التأويل';
        }

        catalog.kalamTreatises.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Kalam & Philosophical Theology',
          size: sizeStr,
          downloadUrl
        });
      }
    });

    // Sort volumes numerically
    catalog.tafsirKabir.sort((a, b) => a.volume - b.volume);

    return catalog;
  }
}

module.exports = ImamRaziLibrary;
