const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');

const EPUB_DIR = path.join(__dirname, '../public/epubs');
const LEDGER_PATH = '/home/absolut7/wyrenet_ledger.json';
const MANIFEST_PATH = path.join(EPUB_DIR, 'wyrenet_classical_corpus_l1_manifest.json');

const ADMIN_DID = 'did:wyre:0x471c852d254a67f36c129f2386ca21c31840dea4';

function getSha256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function anchorAllCorpus() {
  console.log('================================================================');
  console.log('🔺 WYRENET L1: ANCHORING GHAZALI, NAWAWI & RAZI CORPUS');
  console.log('================================================================\n');

  let ledger = { dids: {}, notarizations: {}, updatedAt: new Date().toISOString() };
  if (fs.existsSync(LEDGER_PATH)) {
    try {
      ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'));
    } catch (e) {}
  }

  const epubs = fs.readdirSync(EPUB_DIR).filter(f => f.endsWith('.epub')).sort();
  console.log(`Found ${epubs.length} EPUB manuscripts in distribution directory.`);

  let blockHeight = 640;
  const manifestBooks = [];

  epubs.forEach((file, idx) => {
    const fullPath = path.join(EPUB_DIR, file);
    const stats = fs.statSync(fullPath);
    const hash = getSha256(fullPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';
    
    // Determine Author & Category
    let author = 'Classical Islamic Masterworks';
    let category = 'Sacred Sciences & Classical Heritage';
    let channelId = 'chan-general';

    if (
      file.startsWith('tafsir_kabir_') ||
      file.startsWith('al_matalib_') ||
      file.startsWith('asas_') ||
      file.startsWith('lawami_') ||
      file.startsWith('ismat_') ||
      file.startsWith('macalim_') ||
      file.startsWith('asrar_') ||
      file.startsWith('al_qada_') ||
      file.startsWith('qada_') ||
      file.startsWith('itiqadat_') ||
      file.startsWith('al_mahsul_')
    ) {
      author = 'Imam Fakhr al-Din al-Razi (الإمام فخر الدين الرازي 544–606 AH)';
      category = 'Tafsir, Philosophical Kalam & Usul al-Fiqh';
      channelId = 'chan-imam-razi';
    } else if (
      file.startsWith('ihya_ulum_') ||
      file.startsWith('al_munqidh_') ||
      file.startsWith('mishkat_') ||
      file.startsWith('bidayat_') ||
      file.startsWith('tahafut_') ||
      file.startsWith('kimiya_')
    ) {
      author = 'Imam Abu Hamid al-Ghazali (حجة الإسلام أبو حامد الغزالي 450–505 AH)';
      category = 'Ihya, Tasawwuf, Ethics & Epistemology';
      channelId = 'chan-imam-abuhamidd';
    } else if (
      file.startsWith('al_arbain_') ||
      file.startsWith('riyad_') ||
      file.startsWith('kitab_al_adhkar_') ||
      file.startsWith('al_tibyan_') ||
      file.startsWith('minhaj_al_talibin_') ||
      file.startsWith('sharh_sahih_')
    ) {
      author = 'Imam Yahya ibn Sharaf al-Nawawi (الإمام يحيى بن شرف النووي 631–676 AH)';
      category = 'Hadith, Adhkar, Quranic Etiquette & Fiqh';
      channelId = 'chan-imam-nawawi';
    } else if (file.startsWith('al_shifa_')) {
      author = "Qadi 'Iyad al-Yahsubi (القاضي عياض)";
      category = "Prophetic Biography & Shama'il";
      channelId = 'chan-classical-heritage';
    } else if (file.startsWith('al_futuhat_')) {
      author = "Shaykh al-Akbar Ibn 'Arabi (محيي الدين بن عربي)";
      category = "Islamic Metaphysics & Spiritual Illumination";
      channelId = 'chan-classical-heritage';
    } else if (file.startsWith('sunan_al_muhtadin_')) {
      author = "Imam al-Mawwaq al-Gharnati (الإمام المواق الغرناطي)";
      category = "Spiritual Conduct & Ethics";
      channelId = 'chan-classical-heritage';
    }

    const txHash = '0x' + crypto.createHash('sha256').update(hash + idx + 'wyrenet').digest('hex');
    blockHeight += 1;

    // Record on ledger
    ledger.notarizations[hash] = {
      hash,
      txHash,
      channelId,
      filename: file,
      author,
      category,
      fileSizeBytes: stats.size,
      senderDid: ADMIN_DID,
      blockHeight,
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString(),
      chainId: 51950,
      status: 'CONFIRMED',
      confirmations: 12,
      type: 'EPUB_CONTENT_PROOF'
    };

    manifestBooks.push({
      index: idx + 1,
      filename: file,
      author,
      category,
      channelId,
      sha256: hash,
      sizeMb,
      txHash,
      blockHeight
    });
  });

  ledger.updatedAt = new Date().toISOString();
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2));
  console.log(`✅ Saved ${Object.keys(ledger.notarizations).length} total notarizations to ${LEDGER_PATH}`);

  // Create unified Master Manifest
  const manifest = {
    space: {
      spaceId: 'space-public-mesh',
      channels: ['chan-imam-razi', 'chan-imam-abuhamidd', 'chan-imam-nawawi', 'chan-classical-heritage'],
      name: 'WyreSup Classical Digital Corpus (مَكْتَبَة التُّرَاث الإِسْلَامِي اللَّامَرْكَزِيَّة)',
      description: 'Sovereign on-chain corpus of Imam Fakhr al-Din al-Razi, Imam Abu Hamid al-Ghazali, and Imam al-Nawawi',
      creatorDid: ADMIN_DID,
      encryption: 'ZBAT_THAQB_L1_SEALED',
      blockchain: 'WyreNet Sovereign L1 (Chain ID: 51950)',
      totalBooks: manifestBooks.length
    },
    totalBooks: manifestBooks.length,
    publisherDid: ADMIN_DID,
    anchoredAt: new Date().toISOString(),
    books: manifestBooks
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`✅ Written unified manifest to ${MANIFEST_PATH}`);
}

anchorAllCorpus();
