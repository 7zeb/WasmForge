// ALTERNATIVE: core/wasm/ffmpeg.js (Robust Multi-CDN Fallback)

class FFmpegManager {
  constructor() {
    this.ffmpeg = null;
    this.FFmpegClass = null;
    this.toBlobURL = null;
    this.fetchFile = null;
    this.loaded = false;
    this.loading = false;
    this.loadProgress = 0;
    this.onProgressCallbacks = [];
    this.onLoadCallbacks = [];
    this.cdnAttempts = [];
  }

  // Try multiple CDNs in order
  async loadModules() {
    if (this.FFmpegClass && this.toBlobURL) return true;

    const cdnSources = [
      {
        name: 'cdnjs',
        ffmpeg: 'https://cdnjs.cloudflare.com/ajax/libs/@ffmpeg/ffmpeg/0.12.10/umd/ffmpeg.js',
        util: 'https://cdnjs.cloudflare.com/ajax/libs/@ffmpeg/util/0.12.1/umd/index.js'
      },
      {
        name: 'unpkg',
        ffmpeg: 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
        util: 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js'
      },
      {
        name: 'jsdelivr',
        ffmpeg: 'https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js',
        util: 'https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js'
      },
      {
        name: 'esm.sh',
        ffmpeg: 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10',
        util: 'https://esm.sh/@ffmpeg/util@0.12.1'
      }
    ];

    for (const cdn of cdnSources) {
      try {
        console.log(`[FFmpeg] Trying ${cdn.name}...`);
        this.cdnAttempts.push({ cdn: cdn.name, status: 'attempting' });

        const ffmpegModule = await import(cdn.ffmpeg);
        const utilModule = await import(cdn.util);
        
        this.FFmpegClass = ffmpegModule.FFmpeg || ffmpegModule.default?.FFmpeg || ffmpegModule.default;
        this.toBlobURL = utilModule.toBlobURL || utilModule.default?.toBlobURL || utilModule.default;
        this.fetchFile = utilModule.fetchFile || utilModule.default?.fetchFile;
        
        if (this.FFmpegClass && this.toBlobURL) {
          console.log(`[FFmpeg] Successfully loaded from ${cdn.name}`);
          this.cdnAttempts[this.cdnAttempts.length - 1].status = 'success';
          return true;
        }
      } catch (error) {
        console.warn(`[FFmpeg] ${cdn.name} failed:`, error.message);
        this.cdnAttempts[this.cdnAttempts.length - 1].status = 'failed';
        this.cdnAttempts[this.cdnAttempts.length - 1].error = error.message;
        continue;
      }
    }

    console.error('[FFmpeg] All CDN sources failed:', this.cdnAttempts);
    return false;
  }

  // Create blob URL from fetch
  async createBlobURL(url, mimeType) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.blob();
      const blob = new Blob([data], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('[FFmpeg] Failed to create blob URL:', error);
      throw error;
    }
  }

  // Load FFmpeg WASM
  async load() {
    if (this.loaded) return true;
    if (this.loading) {
      return new Promise((resolve) => {
        this.onLoadCallbacks.push(resolve);
      });
    }

    this.loading = true;

    try {
      const modulesLoaded = await this.loadModules();
      if (!modulesLoaded) {
        throw new Error('Failed to load FFmpeg modules from any CDN');
      }

      this.ffmpeg = new this.FFmpegClass();

      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        this.loadProgress = progress * 100;
        this.notifyProgress(progress, time);
      });

      // Try multiple CDNs for core files
      const coreCDNs = [
        'https://cdnjs.cloudflare.com/ajax/libs/@ffmpeg/core@0.12.6/dist',
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
      ];

      let coreLoaded = false;
      for (const baseURL of coreCDNs) {
        try {
          console.log(`[FFmpeg] Trying core from: ${baseURL}`);
          await this.ffmpeg.load({
            coreURL: await this.createBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await this.createBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          coreLoaded = true;
          console.log(`[FFmpeg] Core loaded from: ${baseURL}`);
          break;
        } catch (error) {
          console.warn(`[FFmpeg] Core failed from ${baseURL}:`, error.message);
          continue;
        }
      }

      if (!coreLoaded) {
        throw new Error('Failed to load FFmpeg core from any CDN');
      }

      this.loaded = true;
      this.loading = false;
      console.log('[FFmpeg] Fully loaded and ready');

      this.onLoadCallbacks.forEach(cb => cb(true));
      this.onLoadCallbacks = [];

      return true;
    } catch (error) {
      console.error('[FFmpeg] Load failed:', error);
      this.loading = false;
      this.onLoadCallbacks.forEach(cb => cb(false));
      this.onLoadCallbacks = [];
      return false;
    }
  }

  // Extract frame from video at specific time
  async extractFrame(videoFile, timeInSeconds = 0) {
    if (!await this.load()) return null;

    const inputFileName = 'input_video';
    const outputFileName = 'output_frame.jpg';

    try {
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      await this.ffmpeg.exec([
        '-ss', timeInSeconds.toString(),
        '-i', inputFileName,
        '-vframes', '1',
        '-q:v', '2',
        outputFileName
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('[FFmpeg] Extract frame failed:', error);
      return null;
    }
  }

  // Generate thumbnail with specific dimensions
  async generateThumbnail(videoFile, width = 160, height = 90, timeInSeconds = 1) {
    if (!await this.load()) return null;

    const inputFileName = 'input_video';
    const outputFileName = 'thumbnail.jpg';

    try {
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      await this.ffmpeg.exec([
        '-ss', timeInSeconds.toString(),
        '-i', inputFileName,
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
        '-vframes', '1',
        '-q:v', '2',
        outputFileName
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('[FFmpeg] Generate thumbnail failed:', error);
      return null;
    }
  }

  // Trim video
  async trimVideo(videoFile, startTime, endTime, outputFormat = 'mp4') {
    if (!await this.load()) return null;

    const inputFileName = 'input_video';
    const outputFileName = `output.${outputFormat}`;

    try {
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      const duration = endTime - startTime;

      await this.ffmpeg.exec([
        '-ss', startTime.toString(),
        '-i', inputFileName,
        '-t', duration.toString(),
        '-c', 'copy',
        outputFileName
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });
      return blob;
    } catch (error) {
      console.error('[FFmpeg] Trim video failed:', error);
      return null;
    }
  }

  // Crop/Resize video
  async cropVideo(videoFile, width, height, x = 0, y = 0) {
    if (!await this.load()) return null;

    const inputFileName = 'input_video';
    const outputFileName = 'output.mp4';

    try {
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-vf', `crop=${width}:${height}:${x}:${y}`,
        '-c:a', 'copy',
        outputFileName
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      return blob;
    } catch (error) {
      console.error('[FFmpeg] Crop video failed:', error);
      return null;
    }
  }

  // Helper to fetch file data
  async fetchFileData(file) {
    if (file instanceof File || file instanceof Blob) {
      return new Uint8Array(await file.arrayBuffer());
    } else if (typeof file === 'string') {
      const response = await fetch(file);
      return new Uint8Array(await response.arrayBuffer());
    }
    throw new Error('Invalid file type');
  }

  // Add progress listener
  onProgress(callback) {
    this.onProgressCallbacks.push(callback);
  }

  // Notify progress
  notifyProgress(progress, time) {
    this.onProgressCallbacks.forEach(cb => cb(progress, time));
  }

  // Check if loaded
  isLoaded() {
    return this.loaded;
  }

  // Get load progress
  getLoadProgress() {
    return this.loadProgress;
  }

  // Get CDN attempt history (for debugging)
  getCDNAttempts() {
    return this.cdnAttempts;
  }
}

// Singleton instance
const ffmpegManager = new FFmpegManager();

export default ffmpegManager;
export { FFmpegManager };
