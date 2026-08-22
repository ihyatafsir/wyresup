const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(exec);

class YouTubeStreamer {
  static getCacheDir() {
    const dir = path.join(__dirname, '../../public/cached_videos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static getPresets() {
    return [
      {
        videoId: 'BrPffpg9KFM',
        title: 'Gorillaz - Damascus ft. Omar Souleyman & Yasiin Bey (Official Visualiser)',
        uploader: 'Gorillaz / Yasiin Bey',
        duration: '4:04',
        thumbnail: 'https://i.ytimg.com/vi/BrPffpg9KFM/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=BrPffpg9KFM',
        streamUrl: '/cached_videos/BrPffpg9KFM.mp4'
      },
      {
        videoId: 'X4YSNpSYX0g',
        title: 'Yasiin Bey (Mos Def) - Supermagic',
        uploader: 'Yasiin Bey',
        duration: '3:58',
        thumbnail: 'https://i.ytimg.com/vi/X4YSNpSYX0g/maxresdefault.jpg',
        url: 'https://www.youtube.com/watch?v=X4YSNpSYX0g',
        streamUrl: '/cached_videos/X4YSNpSYX0g.mp4'
      },
      {
        videoId: 'ms_fat_booty',
        title: 'Mos Def (Yasiin Bey) - Ms. Fat Booty (Official Video)',
        uploader: 'Yasiin Bey / Rawkus',
        duration: '3:45',
        thumbnail: 'https://i.ytimg.com/vi/B9TlvrPgTm8/maxresdefault.jpg',
        url: '/ms_fat_booty.mp4',
        streamUrl: '/ms_fat_booty.mp4'
      }
    ];
  }

  static async prepareStream(inputUrlOrQuery) {
    const cacheDir = this.getCacheDir();
    let query = (inputUrlOrQuery || '').trim();
    if (!query) {
      throw new Error('No YouTube URL or query provided');
    }

    const qLower = query.toLowerCase();

    // Check presets first for instant response
    if (qLower.includes('damas') || qLower.includes('brpffpg9kfm')) {
      return {
        status: 'ready',
        videoId: 'BrPffpg9KFM',
        title: 'Gorillaz - Damascus ft. Omar Souleyman & Yasiin Bey (Official Visualiser)',
        uploader: 'Gorillaz / Yasiin Bey',
        duration: '4:04',
        thumbnail: 'https://i.ytimg.com/vi/BrPffpg9KFM/maxresdefault.jpg',
        streamUrl: '/cached_videos/BrPffpg9KFM.mp4'
      };
    }

    if (qLower.includes('supermagic') || qLower.includes('x4ysnpsyx0g')) {
      return {
        status: 'ready',
        videoId: 'X4YSNpSYX0g',
        title: 'Yasiin Bey - Supermagic',
        uploader: 'Yasiin Bey',
        duration: '3:58',
        thumbnail: 'https://i.ytimg.com/vi/X4YSNpSYX0g/maxresdefault.jpg',
        streamUrl: '/cached_videos/X4YSNpSYX0g.mp4'
      };
    }

    if (qLower.includes('fat_booty') || qLower.includes('ms_fat_booty')) {
      return {
        status: 'ready',
        videoId: 'ms_fat_booty',
        title: 'Mos Def (Yasiin Bey) - Ms. Fat Booty',
        uploader: 'Yasiin Bey',
        duration: '3:45',
        thumbnail: 'https://i.ytimg.com/vi/B9TlvrPgTm8/maxresdefault.jpg',
        streamUrl: '/ms_fat_booty.mp4'
      };
    }

    const isUrl = query.startsWith('http://') || query.startsWith('https://') || query.startsWith('www.') || query.includes('youtube.com') || query.includes('youtu.be');
    const targetUrl = isUrl ? query : `ytsearch1:${query}`;

    console.log(`[YouTubeStreamer] Preparing: ${targetUrl}`);
    const metaCmd = `yt-dlp --dump-json --no-playlist "${targetUrl}"`;
    const { stdout: metaStdout } = await execPromise(metaCmd, { maxBuffer: 10 * 1024 * 1024 });

    const meta = JSON.parse(metaStdout.trim().split('\n')[0]);
    const videoId = meta.id || 'video_' + Date.now();
    const title = meta.title || meta.fulltitle || 'YouTube Stream';
    const uploader = meta.uploader || meta.channel || 'YouTube';
    const duration = meta.duration_string || `${Math.floor((meta.duration || 0) / 60)}:${String((meta.duration || 0) % 60).padStart(2, '0')}`;
    const thumbnail = meta.thumbnail || '';

    const outputFile = path.join(cacheDir, `${videoId}.mp4`);
    const streamUrl = `/cached_videos/${videoId}.mp4`;

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100000) {
      console.log(`[YouTubeStreamer] Cache hit: ${outputFile}`);
      return { status: 'ready', videoId, title, uploader, duration, thumbnail, streamUrl };
    }

    console.log(`[YouTubeStreamer] Downloading: ${outputFile}`);
    const downloadCmd = `yt-dlp -f "18/best[height<=720][ext=mp4]/best" -o "${outputFile}" "https://www.youtube.com/watch?v=${videoId}"`;
    await execPromise(downloadCmd, { maxBuffer: 50 * 1024 * 1024 });

    return { status: 'ready', videoId, title, uploader, duration, thumbnail, streamUrl };
  }

  static async searchVideos(query) {
    const q = (query || '').trim().toLowerCase();
    const presets = this.getPresets();
    if (!q) return presets;

    const matchedPresets = presets.filter(p => p.title.toLowerCase().includes(q) || p.uploader.toLowerCase().includes(q) || q.includes('damas') || q.includes('yasiin') || q.includes('bey') || q.includes('mos'));
    if (matchedPresets.length > 0) {
      return matchedPresets;
    }

    try {
      const searchCmd = `yt-dlp --dump-json --no-playlist "ytsearch5:${q}"`;
      const { stdout } = await execPromise(searchCmd, { maxBuffer: 20 * 1024 * 1024 });
      const lines = stdout.trim().split('\n').filter(Boolean);
      return lines.map(line => {
        try {
          const item = JSON.parse(line);
          return {
            videoId: item.id,
            title: item.title || item.fulltitle,
            uploader: item.uploader || item.channel,
            duration: item.duration_string,
            thumbnail: item.thumbnail,
            url: `https://www.youtube.com/watch?v=${item.id}`
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      return presets;
    }
  }
}

module.exports = YouTubeStreamer;
