// FFmpeg WASM Integration for WasmForge
// This will lazy-load FFmpeg.wasm only when needed

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
  }

  // Load FFmpeg modules dynamically
  async loadModules() {
    if (this.FFmpegClass && this.toBlobURL) return true;

    try {
      // Dynamically import FFmpeg modules from jsDelivr CDN
      const ffmpegModule = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
      const utilModule = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/esm/index.js');
      
      this.FFmpegClass = ffmpegModule.FFmpeg;
      this.toBlobURL = utilModule.toBlobURL;
      this.fetchFile = utilModule.fetchFile;
      
      console.log('[FFmpeg] Modules loaded successfully');
      return true;
    } catch (error) {
      console.error('[FFmpeg] Failed to load modules:', error);
      return false;
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
      // First load the modules
      const modulesLoaded = await this.loadModules();
      if (!modulesLoaded) {
        throw new Error('Failed to load FFmpeg modules');
      }

      this.ffmpeg = new this.FFmpegClass();

      // Progress callback
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg]', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        this.loadProgress = progress * 100;
        this.notifyProgress(progress, time);
      });

      // Use jsDelivr CDN for core files
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: await this.toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await this.toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
      this.loading = false;
      console.log('[FFmpeg] Loaded successfully');

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
}

// Singleton instance
const ffmpegManager = new FFmpegManager();

export default ffmpegManager;
export { FFmpegManager };