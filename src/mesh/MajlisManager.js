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
          icon: '📢',
          topic: 'Decentralized broadcast channel (Nashr al-Akhbar).'
        },
        {
          id: 'chan-imam-razi',
          name: 'imam-razi',
          type: 'text',
          icon: '📚',
          topic: "Library of Imam Fakhr al-Din al-Razi's Masterworks — Complete English EPUB Translations (Tafsir al-Kabir Vols 1-32, Al-Matalib Vols 1-9, Asas al-Taqdis, Lawami', etc.)"
        },
        {
          id: 'chan-imam-abuhami',
          name: 'imam-abuhami',
          type: 'text',
          icon: '📖',
          topic: "Library of Imam Abu Hamid al-Ghazali — Complete English EPUB Translations (Ihya 'Ulum al-Din Books 1-40, Al-Munqidh min al-Dalal, Mishkat al-Anwar, Bidayat al-Hidayah, etc.)"
        },
        {
          id: 'chan-imam-nawawi',
          name: 'imam-nawawi',
          type: 'text',
          icon: '📜',
          topic: "Library of Imam Yahya ibn Sharaf al-Nawawi — Complete English EPUB Translations (Al-Arba'in al-Nawawiyyah, Riyad al-Salihin, Al-Tibyan, Kitab al-Adhkar, Minhaj al-Talibin, etc.)"
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
