const fs = require('fs');
const path = require('path');

class ImamGhazaliLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return {
      kalamAndPhilosophy: [],
      usulAndLogic: [],
      sulukAndEthics: [],
      legacyArchive: []
    };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      kalamAndPhilosophy: [],
      usulAndLogic: [],
      sulukAndEthics: [],
      legacyArchive: []
    };

    // 1. Ihya 'Ulum al-Din 4-volume split editions (< v4, Aug 2026)
    const ihyaVols = [
      {
        filename: 'ihya_ulum_al_din_vol_01_ibadat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 1: Rub' al-'Ibadat (The Acts of Worship, Books 1–10) [Legacy Split Edition]",
        arabicTitle: "إحياء علوم الدين — الجزء الأول: ربع العبادات (الكتب ١ - ١٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)'
      },
      {
        filename: 'ihya_ulum_al_din_vol_02_adat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 2: Rub' al-'Adat (The Norms of Daily Life, Books 11–20) [Legacy Split Edition]",
        arabicTitle: "إحياء علوم الدين — الجزء الثاني: ربع العادات (الكتب ١١ - ٢٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)'
      },
      {
        filename: 'ihya_ulum_al_din_vol_03_muhlikat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 3: Rub' al-Muhlikat (The Destructive Vices, Books 21–30) [Legacy Split Edition]",
        arabicTitle: "إحياء علوم الدين — الجزء الثالث: ربع المهلكات (الكتب ٢١ - ٣٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)'
      },
      {
        filename: 'ihya_ulum_al_din_vol_04_munjiyat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 4: Rub' al-Munjiyat (The Ways to Salvation, Books 31–40) [Legacy Split Edition]",
        arabicTitle: "إحياء علوم الدين — الجزء الرابع: ربع المنجيات (الكتب ٣١ - ٤٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)'
      }
    ];

    ihyaVols.forEach(iv => {
      const fullPath = path.join(dir, iv.filename);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        catalog.legacyArchive.push({
          id: iv.filename.replace('.epub', ''),
          filename: iv.filename,
          title: iv.title,
          arabicTitle: iv.arabicTitle,
          author: iv.author,
          size: (stats.size / 1024).toFixed(1) + ' KB',
          downloadUrl: `/epubs/${iv.filename}`,
          edition: 'AynEngine v2/v3 Legacy Split (< v4)'
        });
      }
    });

    // 2. Pre-v4 Historical 76-sections drafts of Tahafut (< v4, Aug 2026)
    ['tahafut_al_falasifa_complete_76sections_pure_en.epub', 'tahafut_al_falasifa_complete_76sections_bilingual_en.epub'].forEach(f => {
      const fullPath = path.join(dir, f);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const isBilingual = f.includes('bilingual');
        catalog.legacyArchive.push({
          id: f.replace('.epub', ''),
          filename: f,
          title: `Tahafut al-Falasifa (Complete 76 Sections Draft) [${isBilingual ? 'Bilingual Apparatus' : 'Pure English'}]`,
          arabicTitle: 'تهافت الفلاسفة (مسودة الـ ٧٦ مسألة)',
          author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
          size: (stats.size / 1024).toFixed(1) + ' KB',
          downloadUrl: `/epubs/${f}`,
          edition: 'AynEngine pre-v4 Draft (< v4)'
        });
      }
    });

    // 3. Ihya 'Ulum al-Din 40-Book Complete Omnibus (< v4, August 28, 2026) -> In legacyArchive
    ['ihya_ulum_al_din_pure_en.epub', 'ihya_ulum_al_din_bilingual_lexical_en.epub'].forEach(f => {
      const fullPath = path.join(dir, f);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        const isBilingual = f.includes('bilingual');
        catalog.legacyArchive.push({
          id: f.replace('.epub', ''),
          filename: f,
          title: isBilingual ? "Revival of the Religious Sciences (Ihya 'Ulum al-Din) [Complete 40 Books Masterwork] (Bilingual Apparatus Edition)" : "Revival of the Religious Sciences (Ihya 'Ulum al-Din) [Complete 40 Books Masterwork] (Pure English Edition)",
          arabicTitle: 'إحياء علوم الدين (الأربعون كتاباً كاملة)',
          author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
          size: (stats.size / 1024).toFixed(1) + ' KB',
          downloadUrl: `/epubs/${f}`,
          edition: 'AynEngine v3.0 Masterwork (< v4)'
        });
      }
    });

    // 4. Official AynEngine AI v4 & v5 Complete Masterworks (Pure & Bilingual)
    const ghazaliTitles = {
      // Topic 1: Kalam, Philosophy & Polemics
      "tahafut_al_falasifa": { topic: 'kalam', en: "The Incoherence of the Philosophers (Tahafut al-Falasifa)", ar: "تهافت الفلاسفة" },
      "al_iqtisad_fi_al_itiqad": { topic: 'kalam', en: "Moderation in Belief (Al-Iqtisad fi al-I'tiqad)", ar: "الاقتصاد في الاعتقاد" },
      "maqasid_al_falasifah": { topic: 'kalam', en: "The Aims of the Philosophers (Maqasid al-Falasifah)", ar: "مقاصد الفلاسفة" },
      "qawaid_al_aqaid": { topic: 'kalam', en: "Foundations of Articles of Faith (Qawa'id al-'Aqa'id)", ar: "قواعد العقائد" },
      "fadaih_al_batiniyya": { topic: 'kalam', en: "The Infamies of the Batinites (Fada'ih al-Batiniyya)", ar: "فضائح الباطنية وفضائل المستظهرية" },
      "al_radd_al_jamil": { topic: 'kalam', en: "The Elegant Refutation (Al-Radd al-Jamil)", ar: "الرد الجميل لإلهية عيسى بصريح الإنجيل" },

      // Topic 2: Usul al-Fiqh & Logic
      "al_mustasfa": { topic: 'usul', en: "The Distilled Principles of Legal Theory (Al-Mustasfa)", ar: "المستصفى من علم الأصول" },
      "al_mankhul": { topic: 'usul', en: "The Sifted Treatise on Legal Theory (Al-Mankhul)", ar: "المنخول من تعليقات الأصول" },
      "shifa_al_ghalil": { topic: 'usul', en: "Healing the Thirst on Legal Causality (Shifa al-Ghalil)", ar: "شفاء الغليل في بيان الشبه والمخيل" },
      "miyar_al_ilm": { topic: 'usul', en: "The Standard Measure of Logic (Mi'yar al-'Ilm)", ar: "معيار العلم في فن المنطق" },
      "mihakk_al_nazar": { topic: 'usul', en: "The Touchstone of Reasoning (Mihakk al-Nazar)", ar: "محك النظر في المنطق" },

      // Topic 3: Suluk, Ethics & Wisdom
      "al_munqidh_min_al_dalal": { topic: 'suluk', en: "Deliverance from Error (Al-Munqidh min al-Dalal)", ar: "المنقذ من الضلال والمفصح عن الأحوال" },
      "bidayat_al_hidayah": { topic: 'suluk', en: "The Beginning of Guidance (Bidayat al-Hidayah)", ar: "بداية الهداية" },
      "mishkat_al_anwar": { topic: 'suluk', en: "The Niche of Lights (Mishkat al-Anwar)", ar: "مشكاة الأنوار" },
      "kimiya_yi_saadat": { topic: 'suluk', en: "The Alchemy of Happiness (Kimiya-yi Sa'adat)", ar: "كيمياء السعادة" },
      "mizan_al_amal": { topic: 'suluk', en: "The Criterion of Moral Action (Mizan al-'Amal)", ar: "ميزان العمل" },
      "al_maqsad_al_asna": { topic: 'suluk', en: "The Noblest Goal in the Divine Names (Al-Maqsad al-Asna)", ar: "المقصد الأسنى في شرح أسماء الله الحسنى" },
      "jawahir_al_quran": { topic: 'suluk', en: "Jewels of the Quran (Jawahir al-Quran)", ar: "جواهر القرآن ودرره" },
      "minhaj_al_abidin": { topic: 'suluk', en: "The Path of the Worshippers (Minhaj al-'Abidin)", ar: "منهاج العابدين إلى جنة رب العالمين" },
      "maarij_al_quds": { topic: 'suluk', en: "The Ascents of Holiness (Ma'arij al-Quds)", ar: "معارج القدس في مدارج معرفة النفس" },
      "majmuat_rasail_al_ghazali": { topic: 'suluk', en: "Collected Treatises & Epistles of Imam al-Ghazali", ar: "مجموعة رسائل الإمام الغزالي" },
      "asnaf_al_maghrurin": { topic: 'suluk', en: "The Categories of the Deluded (Asnaf al-Maghrurin)", ar: "كشف المناهج والأصناف في حظوظ أهل الغرور" },
      "sirr_al_alamin": { topic: 'suluk', en: "The Secret of the Two Worlds (Sirr al-'Alamin)", ar: "سر العالمين وكشف ما في الدارين" },
      "al_tibr_al_masbuk": { topic: 'suluk', en: "Counsel for Kings (Al-Tibr al-Masbuk)", ar: "التبر المسبوك في نصيحة الملوك" },
      "al_wasit": { topic: 'suluk', en: "The Intermediate Compendium in Jurisprudence (Al-Wasit)", ar: "الوسيط في المذهب" }
    };

    files.sort().forEach(file => {
      // Exclude split files, 76sections, and Ihya from main v4 topics
      if (file.startsWith('ihya_ulum_al_din')) return;
      if (file.includes('76sections')) return;

      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / 1024).toFixed(1) + ' KB';
      const downloadUrl = `/epubs/${file}`;

      for (const [slug, info] of Object.entries(ghazaliTitles)) {
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
            author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
            size: sizeStr,
            downloadUrl,
            edition: 'AynEngine v4/v5 Official'
          };

          if (info.topic === 'kalam') {
            catalog.kalamAndPhilosophy.push(item);
          } else if (info.topic === 'usul') {
            catalog.usulAndLogic.push(item);
          } else {
            catalog.sulukAndEthics.push(item);
          }
          break;
        }
      }
    });

    return catalog;
  }
}

module.exports = ImamGhazaliLibrary;
