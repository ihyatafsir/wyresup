const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execFilePromise = util.promisify(execFile);

class YouTubeStreamer {
  static getCacheDir() {
    const dir = path.join(__dirname, '../../public/cached_videos');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    // Strip control characters, null bytes, and limit length
    return input.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 500);
  }

  static sanitizeVideoId(id) {
    if (typeof id !== 'string') return null;
    const clean = id.trim();
    // Standard YouTube video IDs are alphanumeric + underscore/dash
    if (/^[a-zA-Z0-9_-]{3,64}$/.test(clean)) {
      return clean;
    }
    return null;
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
      }
    ];
  }

  static async prepareStream(inputUrlOrQuery) {
    const cacheDir = this.getCacheDir();
    const query = this.sanitizeInput(inputUrlOrQuery);
    if (!query) {
      throw new Error('No valid YouTube URL or search query provided');
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

    let targetUrl;
    const isUrl = query.startsWith('http://') || query.startsWith('https://') || query.includes('youtube.com') || query.includes('youtu.be');
    
    if (isUrl) {
      try {
        const parsed = new URL(query.startsWith('http') ? query : `https://${query}`);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid URL protocol');
        }
        targetUrl = parsed.toString();
      } catch (err) {
        throw new Error('Malformed URL provided');
      }
    } else {
      targetUrl = `ytsearch1:${query}`;
    }

    console.log(`[YouTubeStreamer] Securely querying metadata for: ${targetUrl}`);
    // Safe execution: execFile passes arguments as direct argv array without subshell invocation
    const { stdout: metaStdout } = await execFilePromise('yt-dlp', [
      '--dump-json',
      '--no-playlist',
      '--no-warnings',
      targetUrl
    ], { maxBuffer: 10 * 1024 * 1024, timeout: 30000 });

    const firstLine = metaStdout.trim().split('\n')[0];
    if (!firstLine) {
      throw new Error('Could not retrieve video metadata');
    }

    const meta = JSON.parse(firstLine);
    const rawVideoId = meta.id || '';
    const videoId = this.sanitizeVideoId(rawVideoId) || `video_${Date.now()}`;
    const title = meta.title || meta.fulltitle || 'YouTube Stream';
    const uploader = meta.uploader || meta.channel || 'YouTube';
    const duration = meta.duration_string || `${Math.floor((meta.duration || 0) / 60)}:${String((meta.duration || 0) % 60).padStart(2, '0')}`;
    const thumbnail = meta.thumbnail || '';

    const outputFile = path.resolve(cacheDir, `${videoId}.mp4`);
    // Ensure outputFile does not escape the cache directory
    if (!outputFile.startsWith(path.resolve(cacheDir))) {
      throw new Error('Invalid cache file path');
    }

    const streamUrl = `/cached_videos/${videoId}.mp4`;

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100000) {
      console.log(`[YouTubeStreamer] Cache hit: ${outputFile}`);
      return { status: 'ready', videoId, title, uploader, duration, thumbnail, streamUrl };
    }

    console.log(`[YouTubeStreamer] Securely downloading video: ${videoId}`);
    await execFilePromise('yt-dlp', [
      '-f', '18/best[height<=720][ext=mp4]/best',
      '-o', outputFile,
      '--no-playlist',
      '--no-warnings',
      `https://www.youtube.com/watch?v=${videoId}`
    ], { maxBuffer: 50 * 1024 * 1024, timeout: 120000 });

    return { status: 'ready', videoId, title, uploader, duration, thumbnail, streamUrl };
  }

  static async searchVideos(rawQuery) {
    const query = this.sanitizeInput(rawQuery).toLowerCase();
    const presets = this.getPresets();
    if (!query) return presets;

    const matchedPresets = presets.filter(p => 
      p.title.toLowerCase().includes(query) || 
      p.uploader.toLowerCase().includes(query) || 
      query.includes('damas') || 
      query.includes('yasiin') || 
      query.includes('bey') || 
      query.includes('mos')
    );
    if (matchedPresets.length > 0) {
      return matchedPresets;
    }

    try {
      const { stdout } = await execFilePromise('yt-dlp', [
        '--dump-json',
        '--no-playlist',
        '--no-warnings',
        `ytsearch5:${query}`
      ], { maxBuffer: 20 * 1024 * 1024, timeout: 30000 });

      const lines = stdout.trim().split('\n').filter(Boolean);
      return lines.map(line => {
        try {
          const item = JSON.parse(line);
          const safeId = this.sanitizeVideoId(item.id);
          if (!safeId) return null;
          return {
            videoId: safeId,
            title: item.title || item.fulltitle,
            uploader: item.uploader || item.channel,
            duration: item.duration_string,
            thumbnail: item.thumbnail,
            url: `https://www.youtube.com/watch?v=${safeId}`
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
    } catch (e) {
      console.error('[YouTubeStreamer Search Error]:', e.message);
      return presets;
    }
  }
}

module.exports = YouTubeStreamer;
