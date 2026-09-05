/**
 * WyreSup Majlis & Ghurfa Manager (إِدَارَة المَجَالِس و الغُرَف)
 * Manages Discord-style Spaces (Majalis) and Channels (Ghuraf),
 * including text channels, voice lounges, and announcement boards (Nashr).
 */

class MajlisManager {
  constructor() {
    // Map of spaceId -> Space Object
    this.spaces = new Map();
    // Default channels in memory
    this.initDefaultSpaces();
  }

  initDefaultSpaces() {
    // 1. Global Public Mesh
    this.createSpace({
      id: 'space-public-mesh',
      name: 'WYRESUP',
      arabicName: 'مَجْلِس وَايِرْسَب',
      icon: '🌐',
      description: 'The root decentralized gossip mesh for WyreSup nodes.',
      channels: [
        {
          id: 'dm-antigravity',
          name: '🤖 antigravity',
          type: 'text',
          icon: '🤖',
          topic: '🔒 Private AI Pair-Programming Session (رَفِيقُكَ المُسَاعِد) — Prompt Antigravity directly in DM.'
        },
        {
          id: 'chan-general',
          name: 'general',
          type: 'text',
          icon: '#',
          topic: 'General mesh discussions, tests, and pings.'
        },
        {
          id: 'chan-protocol-dev',
          name: 'protocol-dev',
          type: 'text',
          icon: '#',
          topic: '13-layer stack discussions (ZBAT, Miftah, Barq, Wasam).'
        },
        {
          id: 'chan-announcements',
          name: 'announcements-nashr',
          type: 'text',
          icon: '#',
          topic: 'Decentralized broadcast channel (Nashr al-Akhbar).'
        },
        {
          id: 'chan-aynengineai',
          name: 'aynengineai',
          type: 'text',
          icon: '#',
          topic: 'AynEngine AI Sovereign Translation & Coding Engine — Architecture, version releases (v1–v5), GitHub pushes, and classical morphological AI research.'
        },
        {
          id: 'chan-imam-razi',
          name: 'imam-razi',
          type: 'text',
          icon: '#',
          hasSubChannels: true,
          topic: "Sovereign Library of Imam Fakhr al-Din al-Razi (544–606 AH) — Complete classical portal. Click to open topical sub-channels (Tafsir, Kalam) and legacy archive."
        },
        {
          id: 'chan-razi-tafsir-matalib',
          name: 'tafsir-matalib',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-razi',
          topic: "Tafsir al-Kabir 32-in-1 Unified Masterwork & Al-Matalib al-'Aliyyah Vols 1-9 (Official AynEngine AI v4 Editions)."
        },
        {
          id: 'chan-razi-kalam-usul',
          name: 'kalam-usul',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-razi',
          topic: "Classical Kalam, Usul al-Fiqh & Heresiography (Asas al-Taqdis, Lawami' al-Bayyinat, Kitab al-Arba'in, Al-Mahsul, etc. — Official v4 Editions)."
        },
        {
          id: 'chan-imam-razi-archive',
          name: 'archive',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-razi',
          topic: "Historical & Legacy Archive of Imam Fakhr al-Din al-Razi — Pre-v4 drafts (< v4) including individual 32-volume split drafts of Tafsir al-Kabir."
        },
        {
          id: 'chan-imam-abuhamidd',
          name: 'imam-abuhamid',
          type: 'text',
          icon: '#',
          hasSubChannels: true,
          topic: "Sovereign Library of Hujjat al-Islam Imam Abu Hamid al-Ghazali (450–505 AH) — Complete classical portal. Click to open topical sub-channels (Kalam, Usul, Suluk) and legacy archive."
        },
        {
          id: 'chan-ghazali-kalam-falsafa',
          name: 'kalam-falsafa',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-abuhamidd',
          topic: "Kalam, Philosophy & Theological Polemics (Tahafut al-Falasifa, Al-Iqtisad fi al-I'tiqad, Maqasid al-Falasifah, Qawaid al-Aqaid, Fadaih al-Batiniyya — Official v4 Editions)."
        },
        {
          id: 'chan-ghazali-usul-mantiq',
          name: 'usul-mantiq',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-abuhamidd',
          topic: "Legal Theory & Classical Logic (Al-Mustasfa min 'Ilm al-Usul, Al-Mankhul, Shifa al-Ghalil, Mi'yar al-'Ilm, Mihakk al-Nazar — Official v4 Editions)."
        },
        {
          id: 'chan-ghazali-suluk-adab',
          name: 'suluk-adab',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-abuhamidd',
          topic: "Spiritual Path, Ethics & Divine Wisdom (Al-Munqidh min al-Dalal, Mishkat al-Anwar, Bidayat al-Hidayah, Minhaj al-'Abidin, Mizan al-'Amal, etc. — Official v4 Editions)."
        },
        {
          id: 'chan-imam-abuhamid-archive',
          name: 'archive',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-abuhamidd',
          topic: "Historical & Legacy Archive of Imam Abu Hamid al-Ghazali — Ihya 'Ulum al-Din (Complete 40 Books v3 single-corpus & 4-volume split drafts) and pre-v4 trials (< v4)."
        },
        {
          id: 'chan-imam-nawawi',
          name: 'imam-nawawi',
          type: 'text',
          icon: '#',
          hasSubChannels: true,
          topic: "Library of Imam Yahya ibn Sharaf al-Nawawi (631–676 AH) — Official Portal & Pipeline Status. Official v4 & v5 translations are queued; all 22 existing complete translations (< v4) are housed in the dedicated archive sub-channel #archive."
        },
        {
          id: 'chan-imam-nawawi-archive',
          name: 'archive',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-nawawi',
          topic: "Complete 22-Volume Legacy Corpus of Imam Yahya al-Nawawi — Translations completed in AynEngine v3 (< v4: Al-Arba'in, Riyad al-Salihin, Al-Tibyan, Kitab al-Adhkar, Minhaj al-Talibin, Sharh Sahih Muslim, Rawdat al-Talibin, etc.)."
        },
        {
          id: 'chan-imam-raghib',
          name: 'imam-raghib-al-isfahani',
          type: 'text',
          icon: '#',
          hasSubChannels: true,
          topic: "Library of Imam al-Raghib al-Isfahani (d. 502 AH) — Complete Classical English & Bilingual Editions. Click to open topical sub-channels."
        },
        {
          id: 'chan-raghib-lexicon-tafsir',
          name: 'lexicon-tafsir',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-raghib',
          topic: "Quranic Lexicography & Exegesis (Al-Mufradat fi Gharib al-Quran, Jami' al-Tafsir — Official v4 Editions)."
        },
        {
          id: 'chan-raghib-akhlaq-adab',
          name: 'akhlaq-adab',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-raghib',
          topic: "Ethical Philosophy & Adab (Al-Dhari'ah ila Makarim al-Shari'ah, Tafsil al-Nash'atayn, Adab Ikhtilat al-Nas, Muhadarat al-Udaba — Official v4 Editions)."
        },
        {
          id: 'chan-classical-heritage',
          name: 'classical-heritage',
          type: 'text',
          icon: '#',
          topic: "Classical Islamic Heritage, 'Irfan & Shama'il Library — Featuring Kitab al-Shifa (Qadi 'Iyad), Al-Futuhat al-Makkiyya (Ibn 'Arabi), and Sunan al-Muhtadin (Al-Mawwaq) in English & Shqip editions."
        },
        {
          id: 'chan-voice-lounge',
          name: 'voice-lounge-sawt',
          type: 'voice',
          icon: '🔊',
          topic: 'P2P voice notes & Sawt transmission exchange.'
        }
      ]
    });

    // 2. Cyber Citadel (Security & Cryptography)
    this.createSpace({
      id: 'space-cyber-citadel',
      name: 'Miftah Citadel',
      arabicName: 'قَلْعَة المِفْتَاح',
      icon: '🛡️',
      description: 'Forward-secrecy, Thaqb puncturable keys & Nagham DTMF experiments.',
      channels: [
        {
          id: 'chan-keys-thaqb',
          name: 'keys-thaqb',
          type: 'text',
          icon: '#',
          topic: 'Puncturable encryption & forward-secrecy ratchets.'
        },
        {
          id: 'chan-nagham-dtmf',
          name: 'nagham-acoustic',
          type: 'voice',
          icon: '🎵',
          topic: 'DTMF acoustic voice-channel key exchange.'
        }
      ]
    });
  }

  createSpace(data) {
    const spaceId = data.id || `space-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const space = {
      id: spaceId,
      name: data.name,
      arabicName: data.arabicName || data.name,
      icon: data.icon || '💬',
      description: data.description || '',
      createdAt: Date.now(),
      creatorId: data.creatorId || 'system',
      channels: data.channels || [
        {
          id: `chan-${Date.now()}-gen`,
          name: 'general',
          type: 'text',
          icon: '#',
          topic: 'General chat'
        }
      ]
    };
    this.spaces.set(spaceId, space);
    return space;
  }

  getSpace(spaceId) {
    return this.spaces.get(spaceId);
  }

  getAllSpaces() {
    return Array.from(this.spaces.values());
  }

  addChannel(spaceId, channelData) {
    const space = this.spaces.get(spaceId);
    if (!space) return null;

    const channelId = channelData.id || `chan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = {
      id: channelId,
      name: channelData.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      type: channelData.type || 'text', // 'text' | 'voice' | 'announcement'
      icon: channelData.icon || (channelData.type === 'voice' ? '🔊' : '#'),
      topic: channelData.topic || ''
    };

    space.channels.push(channel);
    return channel;
  }

  getChannel(spaceId, channelId) {
    const space = this.spaces.get(spaceId);
    if (!space) return null;
    return space.channels.find(c => c.id === channelId);
  }
}

module.exports = MajlisManager;
