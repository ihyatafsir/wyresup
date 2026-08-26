const fs = require('fs');
const path = require('path');

class ImamGhazaliLibrary {
  static getLibraryDir() {
    return path.join(__dirname, '../../public/epubs');
  }

  static getCatalog() {
    const dir = this.getLibraryDir();
    if (!fs.existsSync(dir)) return { ihyaVolumes: [], pureEditions: [], bilingualEditions: [] };

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.epub'));
    
    const catalog = {
      ihyaVolumes: [],
      pureEditions: [],
      bilingualEditions: []
    };

    // 1. The 4 Monumental Volumes of Ihya 'Ulum al-Din (Full 40 Books)
    const ihyaVols = [
      {
        filename: 'ihya_ulum_al_din_vol_01_ibadat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 1: Rub' al-'Ibadat (Acts of Devotion, Books 1–10)",
        arabicTitle: "إحياء علوم الدين — الجزء الأول: ربع العبادات (الكتب ١ - ١٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
        description: 'Complete unabridged translation of Books 1 through 10 covering Knowledge, Foundations of Faith, Purity, Prayer, Zakat, Fasting, Pilgrimage, Quran Etiquette, Adhkar, and Daily Vigils.'
      },
      {
        filename: 'ihya_ulum_al_din_vol_02_adat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 2: Rub' al-'Adat (Norms of Daily Life, Books 11–20)",
        arabicTitle: "إحياء علوم الدين — الجزء الثاني: ربع العادات (الكتب ١١ - ٢٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
        description: 'Complete unabridged translation of Books 11 through 20 covering Manners of Eating, Marriage, Earning, Halal & Haram, Companionship, Seclusion, Travel, Music & Audition, Enjoining Good, and Prophetic Character.'
      },
      {
        filename: 'ihya_ulum_al_din_vol_03_muhlikat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 3: Rub' al-Muhlikat (The Ways to Perdition, Books 21–30)",
        arabicTitle: "إحياء علوم الدين — الجزء الثالث: ربع المهلكات (الكتب ٢١ - ٣٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
        description: 'Complete unabridged translation of Books 21 through 30 covering The Marvels of the Heart, Disciplining the Soul, Evils of the Tongue, Anger & Rancor, Love of the World, Wealth & Greed, Status & Ostentation, Pride & Conceit, and Delusion.'
      },
      {
        filename: 'ihya_ulum_al_din_vol_04_munjiyat_en.epub',
        title: "Ihya 'Ulum al-Din — Vol 4: Rub' al-Munjiyat (The Ways to Salvation, Books 31–40)",
        arabicTitle: "إحياء علوم الدين — الجزء الرابع: ربع المنجيات (الكتب ٣١ - ٤٠)",
        author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
        description: 'Complete unabridged translation of Books 31 through 40 covering Repentance, Patience & Gratitude, Fear & Hope, Poverty & Asceticism, Divine Unity & Trust, Love & Yearning, Sincerity, Meditation, Contemplation, and Remembrance of Death.'
      }
    ];

    ihyaVols.forEach(iv => {
      const fullPath = path.join(dir, iv.filename);
      if (fs.existsSync(fullPath)) {
        const stats = fs.statSync(fullPath);
        catalog.ihyaVolumes.push({
          id: iv.filename.replace('.epub', ''),
          filename: iv.filename,
          title: iv.title,
          arabicTitle: iv.arabicTitle,
          author: iv.author,
          description: iv.description,
          size: (stats.size / 1024).toFixed(1) + ' KB',
          downloadUrl: `/epubs/${iv.filename}`
        });
      }
    });

    // 2. The 25 Other Classical Masterworks
    const ghazaliTitles = {
      "al_munqidh_min_al_dalal": { en: "Deliverance from Error (Al-Munqidh min al-Dalal)", ar: "المنقذ من الضلال والمفصح عن الأحوال" },
      "tahafut_al_falasifa": { en: "The Incoherence of the Philosophers (Tahafut al-Falasifa)", ar: "تهافت الفلاسفة" },
      "bidayat_al_hidayah": { en: "The Beginning of Guidance (Bidayat al-Hidayah)", ar: "بداية الهداية" },
      "mishkat_al_anwar": { en: "The Niche of Lights (Mishkat al-Anwar)", ar: "مشكاة الأنوار" },
      "al_iqtisad_fi_al_itiqad": { en: "Moderation in Belief (Al-Iqtisad fi al-I'tiqad)", ar: "الاقتصاد في الاعتقاد" },
      "kimiya_yi_saadat": { en: "The Alchemy of Happiness (Kimiya-yi Sa'adat)", ar: "كيمياء السعادة" },
      "al_mustasfa": { en: "The Distilled Principles of Legal Theory (Al-Mustasfa)", ar: "المستصفى من علم الأصول" },
      "maqasid_al_falasifah": { en: "The Aims of the Philosophers (Maqasid al-Falasifah)", ar: "مقاصد الفلاسفة" },
      "mizan_al_amal": { en: "The Criterion of Moral Action (Mizan al-'Amal)", ar: "ميزان العمل" },
      "al_maqsad_al_asna": { en: "The Noblest Goal in the Divine Names (Al-Maqsad al-Asna)", ar: "المقصد الأسنى في شرح أسماء الله الحسنى" },
      "jawahir_al_quran": { en: "Jewels of the Quran (Jawahir al-Quran)", ar: "جواهر القرآن ودرره" },
      "minhaj_al_abidin": { en: "The Path of the Worshippers (Minhaj al-'Abidin)", ar: "منهاج العابدين إلى جنة رب العالمين" },
      "qawaid_al_aqaid": { en: "Foundations of Articles of Faith (Qawa'id al-'Aqa'id)", ar: "قواعد العقائد" },
      "miyar_al_ilm": { en: "The Standard Measure of Logic (Mi'yar al-'Ilm)", ar: "معيار العلم في فن المنطق" },
      "mihakk_al_nazar": { en: "The Touchstone of Reasoning (Mihakk al-Nazar)", ar: "محك النظر في المنطق" },
      "maarij_al_quds": { en: "The Ascents of Holiness (Ma'arij al-Quds)", ar: "معارج القدس في مدارج معرفة النفس" },
      "fadaih_al_batiniyya": { en: "The Infamies of the Batinites (Fada'ih al-Batiniyya)", ar: "فضائح الباطنية وفضائل المستظهرية" },
      "al_radd_al_jamil": { en: "The Elegant Refutation (Al-Radd al-Jamil)", ar: "الرد الجميل لإلهية عيسى بصريح الإنجيل" },
      "majmuat_rasail_al_ghazali": { en: "Collected Treatises & Epistles of Imam al-Ghazali", ar: "مجموعة رسائل الإمام الغزالي" },
      "al_mankhul": { en: "The Sifted Treatise on Legal Theory (Al-Mankhul)", ar: "المنخول من تعليقات الأصول" },
      "shifa_al_ghalil": { en: "Healing the Thirst on Legal Causality (Shifa al-Ghalil)", ar: "شفاء الغليل في بيان الشبه والمخيل" },
      "asnaf_al_maghrurin": { en: "The Categories of the Deluded (Asnaf al-Maghrurin)", ar: "كشف المناهج والأصناف في حظوظ أهل الغرور" },
      "sirr_al_alamin": { en: "The Secret of the Two Worlds (Sirr al-'Alamin)", ar: "سر العالمين وكشف ما في الدارين" },
      "al_tibr_al_masbuk": { en: "Counsel for Kings (Al-Tibr al-Masbuk)", ar: "التبر المسبوك في نصيحة الملوك" },
      "al_wasit": { en: "The Intermediate Compendium in Jurisprudence (Al-Wasit)", ar: "الوسيط في المذهب" }
    };

    files.sort().forEach(file => {
      // Skip Ihya volume files as they are handled in ihyaVolumes
      if (file.startsWith('ihya_ulum_al_din_vol_')) return;
      if (file === 'ihya_ulum_al_din_pure_en.epub' || file === 'ihya_ulum_al_din_bilingual_lexical_en.epub') return;

      const fullPath = path.join(dir, file);
      const stats = fs.statSync(fullPath);
      const sizeStr = (stats.size / 1024).toFixed(1) + ' KB';
      const downloadUrl = `/epubs/${file}`;

      for (const [slug, info] of Object.entries(ghazaliTitles)) {
        if (file.startsWith(slug)) {
          const isBilingual = file.includes('_bilingual_lexical_en.epub');
          const isPure = file.includes('_pure_en.epub');

          const item = {
            id: file.replace('.epub', ''),
            slug,
            filename: file,
            title: isBilingual ? `${info.en} (Bilingual Apparatus Edition)` : `${info.en} (Pure English Edition)`,
            arabicTitle: info.ar,
            author: 'Imam Abu Hamid al-Ghazali (حجة الإسلام الإمام أبو حامد الغزالي)',
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

module.exports = ImamGhazaliLibrary;
