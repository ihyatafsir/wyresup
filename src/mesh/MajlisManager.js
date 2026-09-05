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
          id: 'chan-imam-razi',
          name: 'imam-razi',
          type: 'text',
          icon: '#',
          topic: "🏛️ Sovereign Library of Imam Fakhr al-Din al-Razi — Official AynEngine AI v4 & v5 Complete Masterworks (Tafsir al-Kabir 32-in-1, Al-Matalib Vols 1-9, Asas al-Taqdis, Lawami', etc.)"
        },
        {
          id: 'chan-imam-razi-archive',
          name: 'razi-archive',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-razi',
          topic: "📦 Historical & Legacy Archive of Imam Fakhr al-Din al-Razi — Early v2 translations (Tafsir al-Kabir individual Vols 1–32 drafts)."
        },
        {
          id: 'chan-imam-abuhamidd',
          name: 'imam-abuhamid',
          type: 'text',
          icon: '#',
          topic: "🏛️ Sovereign Library of Imam Abu Hamid al-Ghazali — Official AynEngine AI v4 & v5 Complete Translations (Al-Mustasfa, Tahafut al-Falasifa, Al-Iqtisad, etc.)"
        },
        {
          id: 'chan-imam-abuhamid-archive',
          name: 'abuhamid-archive',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-abuhamidd',
          topic: "📦 Historical & Legacy Archive of Imam Abu Hamid al-Ghazali — Early drafts (< v4), prior un-harmonized versions, and 4-volume Ihya split editions."
        },
        {
          id: 'chan-imam-nawawi',
          name: 'imam-nawawi',
          type: 'text',
          icon: '#',
          topic: "🏛️ Sovereign Library of Imam Yahya ibn Sharaf al-Nawawi — Official AynEngine AI v4 & v5 Translations (Al-Arba'in, Riyad al-Salihin, Al-Tibyan, Kitab al-Adhkar, Minhaj al-Talibin, etc.)"
        },
        {
          id: 'chan-imam-nawawi-archive',
          name: 'nawawi-archive',
          type: 'text',
          icon: '└─',
          isSubChannel: true,
          parentChannelId: 'chan-imam-nawawi',
          topic: "📦 Historical & Legacy Archive of Imam Yahya al-Nawawi — Prior translation drafts (< v4) and early split editions."
        },
        {
          id: 'chan-imam-raghib',
          name: 'imam-raghib-al-isfahani',
          type: 'text',
          icon: '#',
          topic: "Library of Imam al-Raghib al-Isfahani (d. 502 AH) — Complete Classical English & Bilingual Editions (Al-Mufradat fi Gharib al-Quran, Al-Dhari'ah ila Makarim al-Shari'ah, Tafsil al-Nash'atayn, Adab Ikhtilat al-Nas, Jami' al-Tafsir, etc.)"
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
