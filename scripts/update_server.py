with open('/home/absolut7/Documents/news/wyresup-mesh-app/server.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
old_imp = "const ImamRaziLibrary = require('./src/mesh/ImamRaziLibrary');"
new_imp = """const ImamRaziLibrary = require('./src/mesh/ImamRaziLibrary');
const ImamGhazaliLibrary = require('./src/mesh/ImamGhazaliLibrary');
const ImamNawawiLibrary = require('./src/mesh/ImamNawawiLibrary');"""
content = content.replace(old_imp, new_imp)

# 2. API Routes
old_api = """  if (pathname === '/api/library/razi' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamRaziLibrary.getCatalog()));
    return;
  }"""

new_api = """  if (pathname === '/api/library/razi' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamRaziLibrary.getCatalog()));
    return;
  }

  if ((pathname === '/api/library/ghazali' || pathname === '/api/library/abuhami') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamGhazaliLibrary.getCatalog()));
    return;
  }

  if (pathname === '/api/library/nawawi' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ImamNawawiLibrary.getCatalog()));
    return;
  }

  if (pathname === '/api/library/manifest' && req.method === 'GET') {
    const manifestPath = path.join(__dirname, 'public/epubs/wyrenet_classical_corpus_l1_manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(fs.readFileSync(manifestPath, 'utf8'));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Manifest not found' }));
    }
    return;
  }"""
content = content.replace(old_api, new_api)

# 3. Seed Functions
seed_code = """
// Seed Imam Abu Hamid al-Ghazali EPUB Library Catalog into #imam-abuhami channel
function seedImamGhazaliLibrary() {
  const channelId = 'chan-imam-abuhami';
  const spaceId = 'space-public-mesh';
  const catalog = ImamGhazaliLibrary.getCatalog();

  const channelMsgs = gossipMesh.getChannelHistory(channelId);
  if (channelMsgs && channelMsgs.length > 0) {
    gossipMesh.messages.set(channelId, []);
  }

  // 1. Welcome Message
  gossipMesh.publish(spaceId, channelId, {
    content: "📖 **مَكْتَبَة حُجَّة الإِسْلَام الإِمَام أَبِي حَامِد الغَزَالِي (450–505 هـ / 1058–1111 م)**\\n\\nWelcome to the official digital library of **Imam Abu Hamid al-Ghazali's** translated corpus and spiritual masterworks. All volumes are available below as standalone EPUB e-books sealed and verified on **WyreNet Sovereign L1** for offline reading and direct P2P mesh distribution."
  }, { senderId: 'ibn-manzur@lisan' });

  // 2. Ihya 'Ulum al-Din (Volumes 1-4 / Books 1-40)
  if (catalog.ihyaVolumes && catalog.ihyaVolumes.length > 0) {
    const atts = catalog.ihyaVolumes.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 1400000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "🌟 **Ihya 'Ulum al-Din (The Revival of the Religious Sciences) — Volumes 1 to 4 (Complete 40 Books)**\\n*The foundational spiritual masterpiece spanning Acts of Devotion ('Ibadat), Norms of Daily Life ('Adat), Ways to Perdition (Muhlikat), and Ways to Salvation (Munjiyat).* ",
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 3. Classical Spiritual & Philosophical Treatises
  if (catalog.spiritualTreatises && catalog.spiritualTreatises.length > 0) {
    const atts = catalog.spiritualTreatises.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 600000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "📜 **Core Spiritual, Epistemological & Philosophical Treatises**\\n*Including Al-Munqidh min al-Dalal (Deliverance from Error), Mishkat al-Anwar (The Niche of Lights), Bidayat al-Hidayah (The Beginning of Guidance), Tahafut al-Falasifa (Incoherence of Philosophers), and Kimiya-yi Sa'adat (The Alchemy of Happiness).* ",
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }
}

// Seed Imam al-Nawawi EPUB Library Catalog into #imam-nawawi channel
function seedImamNawawiLibrary() {
  const channelId = 'chan-imam-nawawi';
  const spaceId = 'space-public-mesh';
  const catalog = ImamNawawiLibrary.getCatalog();

  const channelMsgs = gossipMesh.getChannelHistory(channelId);
  if (channelMsgs && channelMsgs.length > 0) {
    gossipMesh.messages.set(channelId, []);
  }

  // 1. Welcome Message
  gossipMesh.publish(spaceId, channelId, {
    content: "📜 **مَكْتَبَة الإِمَام مُحْيِي الدِّين يَحْيَى بْن شَرَف النَّوَوِي (631–676 هـ / 1233–1277 م)**\\n\\nWelcome to the digital classical library of **Imam al-Nawawi's** revered hadith, devotional, and legal masterworks. Sealed and authenticated on **WyreNet Sovereign L1** for direct offline P2P download."
  }, { senderId: 'ibn-manzur@lisan' });

  // 2. Hadith & Creed
  if (catalog.hadithAndCreed && catalog.hadithAndCreed.length > 0) {
    const atts = catalog.hadithAndCreed.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 1100000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "📚 **Hadith Collections & Prophetic Traditions**\\n*Al-Arba'in al-Nawawiyyah (The 40 Hadith with commentary), Riyad al-Salihin (Gardens of the Righteous — Complete Collection), and Sharh Sahih Muslim (Al-Minhaj Commentary).* ",
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }

  // 3. Devotional Adhkar, Quranic Adab & Fiqh
  if (catalog.devotionalAndFiqh && catalog.devotionalAndFiqh.length > 0) {
    const atts = catalog.devotionalAndFiqh.map(item => ({
      name: item.filename,
      type: 'application/epub+zip',
      size: 800000,
      data: item.downloadUrl,
      title: item.title,
      arabicTitle: item.arabicTitle
    }));

    gossipMesh.publish(spaceId, channelId, {
      content: "🕊️ **Devotional Invocations, Quranic Etiquette & Shafi'i Jurisprudence**\\n*Kitab al-Adhkar (The Book of Remembrances), Al-Tibyan fi Adab Hamalat al-Quran (Etiquette with the Quran), and Minhaj al-Talibin (Manual of Shafi'i Law).* ",
      attachments: atts
    }, { senderId: 'ibn-manzur@lisan' });
  }
}
"""

old_listen = """server.listen(PORT, () => {
  seedImamRaziLibrary();"""
new_listen = seed_code + """
server.listen(PORT, () => {
  seedImamRaziLibrary();
  seedImamGhazaliLibrary();
  seedImamNawawiLibrary();"""
content = content.replace(old_listen, new_listen)

with open('/home/absolut7/Documents/news/wyresup-mesh-app/server.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('server.js updated successfully!')
