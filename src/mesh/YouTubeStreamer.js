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

  static async prepareStream(inputUrlOrQuery) {
    const cacheDir = this.getCacheDir();
    let query = (inputUrlOrQuery || '').trim();
    if (!query) {
      throw new Error('No YouTube URL or query provided');
    }

    const isUrl = query.startsWith('http://') || query.startsWith('https://') || query.startsWith('www.') || query.includes('youtube.com') || query.includes('youtu.be');
    const targetUrl = isUrl ? query : `ytsearch1:${query}`;

    // 1. Fetch metadata
    console.log(`[YouTubeStreamer] Fetching metadata for: ${targetUrl}`);
    const metaCmd = `yt-dlp --dump-json --no-playlist --extractor-args "youtube:player_client=android" "${targetUrl}"`;
    const { stdout: metaStdout } = await execPromise(metaCmd, { maxBuffer: 10 * 1024 * 1024 });

    const meta = JSON.parse(metaStdout.trim().split('\n')[0]);
    const videoId = meta.id || 'video_' + Date.now();
    const title = meta.title || meta.fulltitle || 'YouTube Stream';
    const uploader = meta.uploader || meta.channel || 'YouTube';
    const duration = meta.duration_string || `${Math.floor((meta.duration || 0) / 60)}:${String((meta.duration || 0) % 60).padStart(2, '0')}`;
    const thumbnail = meta.thumbnail || '';

    const outputFile = path.join(cacheDir, `${videoId}.mp4`);
    const streamUrl = `/cached_videos/${videoId}.mp4`;

    // 2. Check if already cached
    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 100000) {
      console.log(`[YouTubeStreamer] Cached video hit: ${outputFile}`);
      return {
        status: 'ready',
        videoId,
        title,
        uploader,
        duration,
        thumbnail,
        streamUrl
      };
    }

    // 3. Download fast streamable MP4 format
    console.log(`[YouTubeStreamer] Downloading video to cache: ${outputFile}`);
    const downloadCmd = `yt-dlp --extractor-args "youtube:player_client=android" -f "18/best[height<=720][ext=mp4]/best" -o "${outputFile}" "https://www.youtube.com/watch?v=${videoId}"`;
    await execPromise(downloadCmd, { maxBuffer: 50 * 1024 * 1024 });

    return {
      status: 'ready',
      videoId,
      title,
      uploader,
      duration,
      thumbnail,
      streamUrl
    };
  }

  static async searchVideos(query) {
    const q = (query || '').trim();
    if (!q) return [];
    const searchCmd = `yt-dlp --dump-json --no-playlist --extractor-args "youtube:player_client=android" "ytsearch5:${q}"`;
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
  }
}

module.exports = YouTubeStreamer;
