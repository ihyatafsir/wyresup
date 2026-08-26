const fs = require('fs');
const path = require('path');

class ImamGhazaliLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      ihyaVolumes: [],
      spiritualTreatises: []
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const downloadUrl = `/epubs/${file}`;

      if (file.startsWith('ihya_ulum_al_din_')) {
        let title = "Ihya 'Ulum al-Din (Revival of the Religious Sciences)";
        let arabicTitle = 'إحياء علوم الدين';
        let volNum = 1;

        if (file.includes('vol_01')) {
          title = "Ihya 'Ulum al-Din — Vol 1: Rub' al-'Ibadat (Acts of Devotion, Books 1–10)";
          arabicTitle = 'إحياء علوم الدين — الجزء الأول: ربع العبادات (الكتب ١ - ١٠)';
          volNum = 1;
        } else if (file.includes('vol_02')) {
          title = "Ihya 'Ulum al-Din — Vol 2: Rub' al-'Adat (Norms of Daily Life, Books 11–20)";
          arabicTitle = 'إحياء علوم الدين — الجزء الثاني: ربع العادات (الكتب ١١ - ٢٠)';
          volNum = 2;
        } else if (file.includes('vol_03')) {
          title = "Ihya 'Ulum al-Din — Vol 3: Rub' al-Muhlikat (Ways to Perdition, Books 21–30)";
          arabicTitle = 'إحياء علوم الدين — الجزء الثالث: ربع المهلكات (الكتب ٢١ - ٣٠)';
          volNum = 3;
        } else if (file.includes('vol_04')) {
          title = "Ihya 'Ulum al-Din — Vol 4: Rub' al-Munjiyat (Ways to Salvation, Books 31–40)";
          arabicTitle = 'إحياء علوم الدين — الجزء الرابع: ربع المنجيات (الكتب ٣١ - ٤٠)';
          volNum = 4;
        }

        catalog.ihyaVolumes.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
          category: 'Tasawwuf, Ethics & Heart Purification (الإحياء والتزكية)',
          volume: volNum,
          size: sizeStr,
          downloadUrl
        });
      } else if (
        file.startsWith('al_munqidh_') ||
        file.startsWith('mishkat_') ||
        file.startsWith('bidayat_') ||
        file.startsWith('tahafut_') ||
        file.startsWith('kimiya_')
      ) {
        let title = file.replace('.epub', '').replace(/_/g, ' ');
        let arabicTitle = 'رسائل الإمام الغزالي';
        let category = 'Kalam, Mysticism & Epistemology (العرفان وعلم الكلام)';

        if (file.startsWith('al_munqidh')) {
          title = "Deliverance from Error (Al-Munqidh min al-Dalal)";
          arabicTitle = 'المنقذ من الضلال والمفصح عن الأحوال';
          category = 'Spiritual Autobiography & Epistemology (السيرة المعرفية واليقين)';
        } else if (file.startsWith('mishkat')) {
          title = "The Niche of Lights (Mishkat al-Anwar)";
          arabicTitle = 'مشكاة الأنوار في أسرار الأنوار الإلهية';
          category = 'Mystical Metaphysics & Divine Illumination (التصوف النوري)';
        } else if (file.startsWith('bidayat')) {
          title = "The Beginning of Guidance (Bidayat al-Hidayah)";
          arabicTitle = 'بداية الهداية في آداب السلوك والتقوى';
          category = 'Spiritual Ethics & Daily Devotions (آداب السلوك والتقوى)';
        } else if (file.startsWith('tahafut')) {
          title = "The Incoherence of the Philosophers (Tahafut al-Falasifa)";
          arabicTitle = 'تهافت الفلاسفة في نقد الفلسفة المشائية';
          category = 'Philosophical Critique & Rational Theology (نقد الفلسفة المشائية)';
        } else if (file.startsWith('kimiya')) {
          title = "The Alchemy of Happiness (Kimiya-yi Sa'adat)";
          arabicTitle = 'كيمياء السعادة';
          category = 'Spiritual Purification & Happiness (تزكية النفس وسعادة الدارين)';
        }

        catalog.spiritualTreatises.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
          category,
          size: sizeStr,
          downloadUrl
        });
      }
    });

    catalog.ihyaVolumes.sort((a, b) => a.volume - b.volume);
    return catalog;
  }
}

module.exports = ImamGhazaliLibrary;
