const fs = require('fs');
const path = require('path');

class ImamRaziLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return { tafsirKabirUnified: [], matalib: [], kalamTreatises: [], legacyArchive: [] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    // Group catalog into official v4/v5 masterworks vs legacy archive
    const catalog = {
      tafsirKabirUnified: [],
      matalib: [],
      kalamTreatises: [],
      legacyArchive: []
    };

    files.sort().forEach(file => {
      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
      const downloadUrl = '/epubs/' + file;
      const isBilingual = file.includes('bilingual') || file.includes('ar_lex');
      const editionLabel = isBilingual ? ' (Bilingual Apparatus Edition)' : ' (Pure English Edition)';

      // -------------------------------------------------------------
      // 1. Tafsir al-Kabir (Mafatih al-Ghayb)
      // -------------------------------------------------------------
      if (file.startsWith('razi_tafsir_kabir_')) {
        // OFFICIAL v4/v5 UNIFIED 32-IN-1 MASTERWORK
        catalog.tafsirKabirUnified.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Tafsir al-Kabir (Mafatih al-Ghayb) — Complete 32-in-1 Masterwork Edition${editionLabel}`,
          arabicTitle: 'التفسير الكبير (مفاتيح الغيب) — المجلد الشامل الجامع (٣٢ مجلداً في كتاب واحد)',
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Tafsir & Quranic Sciences (التفسير وعلوم القرآن)',
          size: sizeStr,
          downloadUrl,
          edition: 'AynEngine v4/v5 Official'
        });
      } 
      else if (file.startsWith('tafsir_kabir_v2_vol_')) {
        // LEGACY v2 SPLIT VOLUMES
        const volMatch = file.match(/vol_(\d+)/);
        const volNum = volMatch ? parseInt(volMatch[1], 10) : 1;
        catalog.legacyArchive.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Tafsir al-Kabir (Mafatih al-Ghayb) — Volume ${volNum} [v2 Legacy Split Edition]`,
          arabicTitle: `التفسير الكبير (مفاتيح الغيب) — المجلد ${volNum}`,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Tafsir al-Kabir (v2 Split Drafts)',
          volume: volNum,
          size: sizeStr,
          downloadUrl,
          edition: 'v2 Legacy Split'
        });
      }

      // -------------------------------------------------------------
      // 2. Al-Matalib al-'Aliyyah min al-'Ilm al-Ilahi
      // -------------------------------------------------------------
      else if (file.startsWith('matalib_vol_')) {
        // OFFICIAL v4/v5 MASTERWORK VOLUMES 1 TO 9
        const volMatch = file.match(/vol_0?(\d+)/);
        const volNum = volMatch ? parseInt(volMatch[1], 10) : 1;
        
        const matalibVolNames = {
          1: "Tawhid & Transcendence (في دلائل التوحيد والتنزيه)",
          2: "Divine Attributes of Majesty (في صفات الجلال والإكرام)",
          3: "Origination of the Cosmos & Time (في حدوث العالم والزمان)",
          4: "Space, Void & Plenitude (في المكان والخلأ والملاء)",
          5: "The Indivisible Atom (في مسألة الجوهر الفرد)",
          6: "Prime Matter, Form & Bodies (في الهيولى والصورة والأجسام)",
          7: "The Rational Soul (في النفس الناطقة وأحوالها)",
          8: "Prophethood & Miracles (في النبوات ومعجزاتها)",
          9: "Eschatology & Return (في المعاد وأحوال الآخرة)"
        };
        const subTitle = matalibVolNames[volNum] ? ` — Vol. ${volNum}: ${matalibVolNames[volNum]}` : ` — Vol. ${volNum}`;

        catalog.matalib.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Al-Matalib al-'Aliyyah min al-'Ilm al-Ilahi${subTitle}${editionLabel}`,
          arabicTitle: `المطالب العالية من العلم الإلهي (الجزء ${volNum})`,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Theology & Metaphysics (العلم الإلهي والميتافيزيقا)',
          volume: volNum,
          size: sizeStr,
          downloadUrl,
          edition: 'AynEngine v4/v5 Official'
        });
      }
      else if (file.startsWith('al_matalib_')) {
        // LEGACY PRE-v4 MATALIB FILES
        catalog.legacyArchive.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Al-Matalib al-'Aliyyah [Pre-v4 Draft: ${file.replace('.epub', '').replace(/_/g, ' ')}]`,
          arabicTitle: 'المطالب العالية من العلم الإلهي (مسودة قديمة)',
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Al-Matalib (Pre-v4 Drafts)',
          size: sizeStr,
          downloadUrl,
          edition: 'pre-v4 Draft'
        });
      }

      // -------------------------------------------------------------
      // 3. Classical Kalam, Usul al-Fiqh & Heresiography Masterworks (v4/v5)
      // -------------------------------------------------------------
      else if (
        file.startsWith('razi_arbain_') ||
        file.startsWith('razi_asas_') ||
        file.startsWith('razi_lawami_') ||
        file.startsWith('razi_mahsul_') ||
        file.startsWith('razi_asrar_') ||
        file.startsWith('razi_ismat_') ||
        file.startsWith('itiqadat_firaq_al_muslimin_') ||
        file.startsWith('al_qada_wal_qadar_pure_') ||
        file.startsWith('al_qada_wal_qadar_bilingual_') ||
        file.startsWith('risalah_fi_al_itiqad_') ||
        file.startsWith('jami_al_tafsir_')
      ) {
        let title = '';
        let arabicTitle = '';
        let category = 'Kalam & Philosophical Theology (علم الكلام وأصول الدين)';

        if (file.includes('arbain')) {
          title = `Kitab al-Arba'in fi Usul al-Din (Forty Principles of Religion)${editionLabel}`;
          arabicTitle = 'كتاب الأربعين في أصول الدين';
        } else if (file.includes('asas')) {
          title = `Asas al-Taqdis (Foundations of Divine Sanctification)${editionLabel}`;
          arabicTitle = 'أساس التقديس في علم الكلام';
        } else if (file.includes('lawami')) {
          title = `Lawami' al-Bayyinat (The Radiant Proofs on Divine Names & Attributes)${editionLabel}`;
          arabicTitle = 'لوامع البينات شرح أسماء الله تعالى والصفات';
        } else if (file.includes('mahsul')) {
          title = `Al-Mahsul fi 'Ilm Usul al-Fiqh (The Sum Total in Jurisprudence)${editionLabel}`;
          arabicTitle = 'المحصول في علم أصول الفقه';
          category = 'Usul al-Fiqh & Legal Methodology (أصول الفقه)';
        } else if (file.includes('asrar')) {
          title = `Asrar al-Tanzil wa Anwar al-Ta'wil${editionLabel}`;
          arabicTitle = 'أسرار التنزيل وأنوار التأويل';
        } else if (file.includes('ismat')) {
          title = `'Ismat al-Anbiya' (The Infallibility of the Prophets)${editionLabel}`;
          arabicTitle = 'عصمة الأنبياء عليهم السلام';
        } else if (file.includes('itiqadat')) {
          title = `I'tiqadat Firaq al-Muslimin wa'l-Mushrikin (Beliefs of Muslim & Non-Muslim Sects)${editionLabel}`;
          arabicTitle = 'اعتقادات فرق المسلمين والمشركين';
          category = 'Comparative Heresiography & Sects (الفِرَق والمذاهب)';
        } else if (file.includes('qada')) {
          title = `Al-Qada' wa'l-Qadar (Treatise on Divine Decree & Predestination)${editionLabel}`;
          arabicTitle = 'الرسالة الكمالية في مسألة القضاء والقدر';
        } else if (file.includes('risalah_fi_al_itiqad')) {
          title = `Risalah fi al-I'tiqad (Epistle on Creed)${editionLabel}`;
          arabicTitle = 'رسالة في الاعتقاد';
        } else if (file.includes('jami_al_tafsir')) {
          title = `Jami' al-Tafsir (The Comprehensive Quranic Commentary Excerpts)${editionLabel}`;
          arabicTitle = 'جامع التفسير للإمام الرازي';
          category = 'Tafsir & Quranic Sciences (التفسير وعلوم القرآن)';
        }

        catalog.kalamTreatises.push({
          id: file.replace('.epub', ''),
          filename: file,
          title,
          arabicTitle,
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category,
          size: sizeStr,
          downloadUrl,
          edition: 'AynEngine v4/v5 Official'
        });
      }

      // -------------------------------------------------------------
      // 4. Pre-v4 Historical Kalam & Trial Drafts (< v4)
      // -------------------------------------------------------------
      else if (
        file.startsWith('arbain_') ||
        file.startsWith('asas_') ||
        file.startsWith('lawami_') ||
        file.startsWith('ismat_') ||
        file.startsWith('macalim_') ||
        file.startsWith('asrar_') ||
        file.startsWith('qada_') ||
        file.startsWith('al_qada_wal_qadar_v3_') ||
        file.startsWith('itiqadat_')
      ) {
        catalog.legacyArchive.push({
          id: file.replace('.epub', ''),
          filename: file,
          title: `Razi Treatise [Pre-v4 Draft: ${file.replace('.epub', '').replace(/_/g, ' ')}]`,
          arabicTitle: 'رسائل الإمام الرازي (مسودات تاريخية قديمة)',
          author: 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي)',
          category: 'Kalam Treatises (Pre-v4 Drafts)',
          size: sizeStr,
          downloadUrl,
          edition: 'pre-v4 Draft'
        });
      }
    });

    // Sort volumes numerically
    catalog.matalib.sort((a, b) => (a.volume || 0) - (b.volume || 0));
    catalog.legacyArchive.sort((a, b) => {
      if (a.volume && b.volume) return a.volume - b.volume;
      return a.filename.localeCompare(b.filename);
    });

    return catalog;
  }
}

module.exports = ImamRaziLibrary;
