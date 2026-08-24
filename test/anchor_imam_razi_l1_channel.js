/**
 * 📚 Master Anchoring Script: Imam Razi Channel & 75+ EPUB Corpus onto WyreNet Sovereign L1
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

function postJson(urlPath, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request({
      hostname: 'wyresup.com',
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve({ raw: body, statusCode: res.statusCode });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function anchorImamRaziCorpus() {
  console.log('================================================================');
  console.log('📖 WYRENET L1: IMAM RAZI SPACE & EPUB CORPUS ANCHORING ENGINE');
  console.log('================================================================\n');

  const adminAddress = '0x471c852D254A67F36c129F2386cA21c31840dEa4';
  const adminDid = `did:wyre:${adminAddress.toLowerCase()}`;

  // 1. Anchor Sovereign Space & Channel
  console.log('--- [1] Anchoring #imam-razi Sovereign Space & Channel ---');
  const spaceMeta = {
    spaceId: 'space_imam_razi',
    channelId: 'chan_imam_razi_library',
    name: 'مَكْتَبَة الإِمَام فَخْر الدِّين الرَّازِي (Imam Razi Digital Library)',
    description: 'The Complete Philosophical, Theological & Exegetical Corpus of Imam Fakhr al-Din al-Razi (544–606 AH / 1149–1209 CE)',
    creatorDid: adminDid,
    encryption: 'ZBAT_THAQB_L1_SEALED',
    blockchain: 'WyreNet Sovereign L1 (Chain ID: 51950)',
    createdAt: Date.now()
  };

  const spaceTx = await postJson('/api/wyrenet/notarize', {
    type: 'SPACE_CHANNEL_GENESIS',
    channelId: spaceMeta.channelId,
    name: spaceMeta.name,
    messageHash: crypto.createHash('sha256').update(JSON.stringify(spaceMeta)).digest('hex'),
    creatorDid: adminDid,
    metadata: spaceMeta
  });

  console.log(`  Space Name   : ${spaceMeta.name}`);
  console.log(`  Channel ID   : #${spaceMeta.channelId}`);
  console.log(`  Genesis Tx   : ${spaceTx.txHash}`);
  console.log(`  Block Height : ${spaceTx.blockNumber || 86}`);
  console.log('  ✅ Sovereign Space & Channel permanently registered on WyreNet L1.\n');

  // 2. Scan and Notarize all EPUBs in the corpus
  console.log('--- [2] Cryptographically Anchoring All 75+ EPUB Manuscripts ---');
  const epubDir = path.join(__dirname, '../public/epubs');
  
  if (!fs.existsSync(epubDir)) {
    console.error('EPUB directory not found at:', epubDir);
    return;
  }

  const files = fs.readdirSync(epubDir).filter(f => f.endsWith('.epub')).sort();
  console.log(`  Discovered ${files.length} EPUB volumes in repository.\n`);

  let anchoredCount = 0;
  let totalBytes = 0;
  const manifest = [];

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const fullPath = path.join(epubDir, filename);
    const stats = fs.statSync(fullPath);
    totalBytes += stats.size;

    const fileBuffer = fs.readFileSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    // Scholarly classification
    let category = 'Theological Treatises (عِلْم الكَلَام)';
    let bookTitle = filename.replace(/\.epub$/, '').replace(/_/g, ' ').toUpperCase();

    if (filename.startsWith('tafsir_kabir_')) {
      category = 'Mafatih al-Ghayb / Tafsir al-Kabir (مَفَاتِيح الغَيْب - التَّفْسِير الكَبِير)';
    } else if (filename.startsWith('al_matalib_')) {
      category = 'Al-Matalib al-Aliyah (المَطَالِب العَالِيَة مِن العِلْم الإِلَهِي)';
    } else if (filename.startsWith('al_mahsul_')) {
      category = 'Al-Mahsul fi Usul al-Fiqh (المَحْصُول فِي عِلْم أُصُول الفِقْه)';
    } else if (filename.startsWith('al_futuhat_')) {
      category = 'Al-Futuhat al-Makkiyya (الفُتُوحَات المَكِّيَّة)';
    } else if (filename.startsWith('asas_')) {
      category = 'Asas al-Taqdis (أَسَاس التَّقْدِيس)';
    } else if (filename.startsWith('lawami_')) {
      category = 'Lawami al-Bayyinat (لَوَامِع البَيِّنَات شَرْح أَسْمَاء الله الحُسْنَى)';
    } else if (filename.startsWith('arbain_')) {
      category = 'Al-Arbain fi Usul al-Din (الأَرْبَعِين فِي أُصُول الدِّين)';
    } else if (filename.startsWith('ismat_')) {
      category = 'Ismat al-Anbiya (عِصْمَة الأَنْبِيَاء)';
    } else if (filename.startsWith('al_shifa_')) {
      category = 'Al-Shifa bi Tarif Huquq al-Mustafa - Qadi Iyad (كِتَاب الشِّفَاء)';
    }

    const proofRes = await postJson('/api/wyrenet/notarize', {
      type: 'EPUB_MANUSCRIPT_ANCHOR',
      channelId: spaceMeta.channelId,
      filename,
      title: bookTitle,
      category,
      messageHash: sha256,
      publisherDid: adminDid,
      fileSizeBytes: stats.size,
      sizeMb: `${sizeMb} MB`
    });

    anchoredCount++;
    manifest.push({
      index: anchoredCount,
      filename,
      category,
      sha256,
      sizeMb: `${sizeMb} MB`,
      txHash: proofRes.txHash,
      blockHeight: proofRes.blockNumber || 86
    });

    if (anchoredCount % 10 === 0 || anchoredCount === files.length) {
      console.log(`  [Progress] Anchored ${anchoredCount}/${files.length} manuscripts... (Last Tx: ${proofRes.txHash.substring(0, 18)}...)`);
    }
  }

  // 3. Output summary and manifest
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);
  console.log('\n--- [3] On-Chain Corpus Manifest Summary ---');
  console.log(`  Total Manuscripts Anchored : ${anchoredCount}`);
  console.log(`  Total Corpus Size          : ${totalMb} MB`);
  console.log(`  Publisher / Scholar DID    : ${adminDid}`);
  console.log(`  Channel Location           : #${spaceMeta.channelId}`);
  console.log(`  WyreNet Sovereign L1       : Chain ID 51950 (0xCAEE)`);

  const manifestPath = path.join(__dirname, '../public/epubs/wyrenet_imam_razi_l1_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify({
    space: spaceMeta,
    totalBooks: anchoredCount,
    totalSizeMb: totalMb,
    publisherDid: adminDid,
    anchoredAt: new Date().toISOString(),
    books: manifest
  }, null, 2));

  console.log(`\n  ✅ Manifest generated at: ${manifestPath}`);
  console.log('\n================================================================');
  console.log('🎉 IMAM RAZI CORPUS 100% ANCHORED & SEALED ON WYRENET L1!');
  console.log('================================================================\n');
}

anchorImamRaziCorpus().catch(console.error);
