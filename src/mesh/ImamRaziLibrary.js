const fs = require('fs');
const path = require('path');

class ImamRaziLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return { tafsirKabir: [], matalib: [], firaqAndFiqh: [], kalamTreatises: [] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    // Group catalog into rigorous scholarly classifications
    const catalog = {
      tafsirKabir: [],
      matalib: [],
      firaqAndFiqh: [],
      kalamTreatises: []
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const downloadUrl = '/epubs/' + file;

      // 1. Tafsir al-Kabir (Mafatih al-Ghayb)
      if (file.startsWith('tafsir_kabir_')) {
        const volMatch = file.match(/vol_(\d+)/);
        const volNum = volMatch ? parseInt(volMatch[1], 10) : 1;
        catalog.tafsirKabir.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: 'Tafsir al-Kabir (Mafatih al-Ghayb) — Volume ' + volNum,
          arabicTitle: 'التفسير الكبير (مفاتيح الغيب) — المجلد ' + volNum,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Tafsir & Quranic Sciences (التفسير وعلوم القرآن)',
          volume: volNum,
          size: sizeStr,
          downloadUrl
        });
      } 
      // 2. Al-Matalib al-\'Aliyyah min al-\'Ilm al-Ilahi
      else if (file.startsWith('al_matalib_')) {
        const volMatch = file.match(/vol_(\d+)/);
        const volNum = volMatch ? parseInt(volMatch[1], 10) : 'Complete';
        const isLex = file.includes('ar_lex');
        catalog.matalib.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: 'Al-Matalib al-\'Aliyyah min al-\'Ilm al-Ilahi ' + (volNum === 'Complete' ? '— Complete Edition' : '— Volume ' + volNum) + ' ' + (isLex ? '(Arabic Lexicon Edition)' : '(Pure English)'),
          arabicTitle: 'المطالب العالية من العلم الإلهي ' + (volNum === 'Complete' ? '(المجموعة الكاملة)' : '(الجزء ' + volNum + ')'),
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Theology & Metaphysics (العلم الإلهي والميتافيزيقا)',
          volume: volNum,
          size: sizeStr,
          downloadUrl
        });
      }
      // 3. Firaq (Sects & Heresiography) & Usul al-Fiqh
      else if (file.startsWith('itiqadat_') || file.startsWith('al_mahsul_')) {
        let title = '';
        let arabicTitle = '';
        let category = 'Comparative Heresiography & Usul al-Fiqh (الفرق وأصول الفقه)';

        if (file.startsWith('al_mahsul_')) {
          title = "Al-Mahsul fi 'Ilm Usul al-Fiqh (The Sum Total in Jurisprudence) [Arabic Lexicon Edition]";
          arabicTitle = 'المحصول في علم أصول الفقه';
          category = 'Usul al-Fiqh & Legal Methodology (أصول الفقه)';
        } else {
          const isLex = file.includes('ar_lex');
          const isGuided = file.includes('guided');
          title = "I'tiqadat Firaq al-Muslimin wa'l-Mushrikin (Beliefs of Muslim & Non-Muslim Sects) " + (isLex ? '[Arabic Lexicon Edition]' : (isGuided ? '[Guided Translation]' : '[Standard Complete Edition]'));
          arabicTitle = 'اعتقادات فرق المسلمين والمشركين';
          category = 'Comparative Heresiography & Sects (الفِرَق والمذاهب)';
        }

        catalog.firaqAndFiqh.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category,
          size: sizeStr,
          downloadUrl
        });
      }
      // 4. Core Kalam & Philosophical Theology Treatises of Imam Razi
      else if (
        file.startsWith('al_qada') ||
        file.startsWith('qada_') ||
        file.startsWith('asas_') ||
        file.startsWith('lawami_') ||
        file.startsWith('arbain_') ||
        file.startsWith('ismat_') ||
        file.startsWith('macalim_') ||
        file.startsWith('asrar_')
      ) {
        let title = file.replace('.epub', '').replace(/_/g, ' ');
        let arabicTitle = 'رسائل الإمام الرازي';
        
        if (file.startsWith('al_qada') || file.startsWith('qada_')) {
          title = "Al-Qada' wa'l-Qadar (Treatise on Divine Decree & Destiny)";
          arabicTitle = 'رسالة في القضاء والقدر';
        } else if (file.startsWith('asas_')) {
          title = "Asas al-Taqdis (Foundations of Transcendence)";
          arabicTitle = 'أساس التقديس في علم الكلام';
        } else if (file.startsWith('lawami_')) {
          title = "Lawami' al-Bayyinat (The Radiant Proofs on Divine Names)";
          arabicTitle = 'لوامع البينات شرح أسماء الله تعالى والصفات';
        } else if (file.startsWith('arbain_')) {
          title = "Kitab al-Arba'in fi Usul al-Din (Forty Principles of Religion)";
          arabicTitle = 'كتاب الأربعين في أصول الدين';
        } else if (file.startsWith('ismat_')) {
          title = "'Ismat al-Anbiya' (The Infallibility of the Prophets)";
          arabicTitle = 'عصمة الأنبياء عليهم السلام';
        } else if (file.startsWith('macalim_')) {
          title = "Ma'alim Usul al-Din (Landmarks of the Principles of Religion)";
          arabicTitle = 'معالم أصول الدين';
        } else if (file.startsWith('asrar_')) {
          title = "Asrar al-Tanzil wa Anwar al-Ta'wil";
          arabicTitle = 'أسرar التنزيل وأنوار التأويل';
        }

        catalog.kalamTreatises.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Kalam & Philosophical Theology (علم الكلام وأصول الدين)',
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
