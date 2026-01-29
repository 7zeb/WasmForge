// ========================================
// WASMFORGE v8-beta - FFmpeg WASM Integration
// Single-threaded version for GitHub Pages
// ========================================

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
    this.loadAttempts = [];
  }

  // Log with timestamp
  log(message, data = null) {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    if (data) {
      console.log(`[FFmpeg ${timestamp}] ${message}`, data);
    } else {
      console.log(`[FFmpeg ${timestamp}] ${message}`);
    }
  }

  // Load FFmpeg modules dynamically
  async loadModules() {
    if (this.FFmpegClass && this.toBlobURL) {
      this.log('Modules already loaded');
      return true;
    }

    this.log('Starting module load (single-threaded mode for GitHub Pages)...');

    // Try UMD builds first - better compatibility
    const strategies = [
      {
        name: 'unpkg-umd',
        load: async () => {
          this.log('Trying unpkg UMD...');
          const ffmpegModule = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
          const utilModule = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/umd/index.js');
          
          this.FFmpegClass = ffmpegModule.FFmpeg || ffmpegModule.default?.FFmpeg || window.FFmpeg;
          this.toBlobURL = utilModule.toBlobURL || utilModule.default?.toBlobURL;
          this.fetchFile = utilModule.fetchFile || utilModule.default?.fetchFile;
          
          // Handle case where entire module is exported as default
          if (!this.toBlobURL && utilModule.default) {
            this.toBlobURL = utilModule.default.toBlobURL;
            this.fetchFile = utilModule.default.fetchFile;
          }
          
          this.log('unpkg UMD loaded');
        }
      },
      {
        name: 'jsdelivr-umd',
        load: async () => {
          this.log('Trying jsdelivr UMD...');
          const ffmpegModule = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.12.10/dist/umd/ffmpeg.js');
          const utilModule = await import('https://cdn.jsdelivr.net/npm/@ffmpeg/util@0.12.1/dist/umd/index.js');
          
          this.FFmpegClass = ffmpegModule.FFmpeg || ffmpegModule.default?.FFmpeg || window.FFmpeg;
          this.toBlobURL = utilModule.toBlobURL || utilModule.default?.toBlobURL;
          this.fetchFile = utilModule.fetchFile || utilModule.default?.fetchFile;
          
          if (!this.toBlobURL && utilModule.default) {
            this.toBlobURL = utilModule.default.toBlobURL;
            this.fetchFile = utilModule.default.fetchFile;
          }
          
          this.log('jsdelivr UMD loaded');
        }
      },
      {
        name: 'unpkg-esm',
        load: async () => {
          this.log('Trying unpkg ESM...');
          const ffmpegModule = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
          const utilModule = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
          
          this.FFmpegClass = ffmpegModule.FFmpeg;
          this.toBlobURL = utilModule.toBlobURL;
          this.fetchFile = utilModule.fetchFile;
          
          this.log('unpkg ESM loaded');
        }
      }
    ];

    // Try each strategy
    for (const strategy of strategies) {
      try {
        this.log(`Attempting strategy: ${strategy.name}`);
        this.loadAttempts.push({ strategy: strategy.name, status: 'trying', time: Date.now() });
        
        await strategy.load();
        
        // Verify we got what we need
        if (this.FFmpegClass && typeof this.toBlobURL === 'function') {
          this.log(`✓ Success with ${strategy.name}`);
          this.loadAttempts[this.loadAttempts.length - 1].status = 'success';
          return true;
        } else {
          throw new Error(`Missing required exports (FFmpegClass: ${!!this.FFmpegClass}, toBlobURL: ${typeof this.toBlobURL})`);
        }
      } catch (error) {
        this.log(`✗ ${strategy.name} failed: ${error.message}`);
        this.loadAttempts[this.loadAttempts.length - 1].status = 'failed';
        this.loadAttempts[this.loadAttempts.length - 1].error = error.message;
        continue;
      }
    }

    this.log('❌ All strategies failed', this.loadAttempts);
    return false;
  }

  // Create blob URL from fetch
  async createBlobURL(url, mimeType) {
    this.log(`Creating blob URL: ${url}`);
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.blob();
      this.log(`Fetched ${data.size} bytes`);
      const blob = new Blob([data], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      this.log(`Failed to create blob URL: ${error.message}`);
      throw error;
    }
  }

  // Load FFmpeg WASM (SINGLE-THREADED ONLY)
  async load() {
    if (this.loaded) {
      this.log('Already loaded');
      return true;
    }
    
    if (this.loading) {
      this.log('Already loading, waiting...');
      return new Promise((resolve) => {
        this.onLoadCallbacks.push(resolve);
      });
    }

    this.loading = true;
    this.loaded = false;
    this.log('==== Starting FFmpeg Load (Single-Threaded Mode) ====');

    try {
      // Step 1: Load modules
      this.log('Step 1: Loading modules...');
      const modulesLoaded = await this.loadModules();
      
      if (!modulesLoaded) {
        throw new Error('Failed to load FFmpeg modules from any CDN');
      }
      this.log('✓ Modules loaded successfully');

      // Step 2: Create FFmpeg instance
      this.log('Step 2: Creating FFmpeg instance...');
      this.ffmpeg = new this.FFmpegClass();
      
      if (!this.ffmpeg) {
        throw new Error('FFmpeg instance is null');
      }
      this.log('✓ FFmpeg instance created');

      // Step 3: Set up event listeners
      this.log('Step 3: Setting up event listeners...');
      this.ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg LOG]', message);
      });

      this.ffmpeg.on('progress', ({ progress, time }) => {
        this.loadProgress = progress * 100;
        this.notifyProgress(progress, time);
      });
      this.log('✓ Event listeners set up');

      // Step 4: Load SINGLE-THREADED core files only
      this.log('Step 4: Loading FFmpeg core (single-threaded, no workers)...');
      
      // ONLY use @ffmpeg/core (NOT @ffmpeg/core-mt)
      const coreStrategies = [
        {
          name: 'unpkg-st',
          baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
        },
        {
          name: 'jsdelivr-st',
          baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd'
        }
        // DO NOT include @ffmpeg/core-mt - it requires workers
      ];

      let coreLoaded = false;
      for (const coreStrategy of coreStrategies) {
        try {
          this.log(`Trying core from ${coreStrategy.name}: ${coreStrategy.baseURL}`);
          
          const coreURL = await this.createBlobURL(
            `${coreStrategy.baseURL}/ffmpeg-core.js`,
            'text/javascript'
          );
          
          const wasmURL = await this.createBlobURL(
            `${coreStrategy.baseURL}/ffmpeg-core.wasm`,
            'application/wasm'
          );

          this.log('Blob URLs created, calling ffmpeg.load()...');
          
          // CRITICAL: NO workerURL - single-threaded only
          await this.ffmpeg.load({
            coreURL,
            wasmURL
            // NO workerURL property
          });
          
          coreLoaded = true;
          this.log(`✓ Core loaded successfully from ${coreStrategy.name} (SINGLE-THREADED)`);
          break;
        } catch (error) {
          this.log(`✗ Core load failed from ${coreStrategy.name}: ${error.message}`);
          continue;
        }
      }

      if (!coreLoaded) {
        throw new Error('Failed to load single-threaded FFmpeg core from any CDN');
      }

      // Step 5: Verify FFmpeg is ready
      this.log('Step 5: Verifying FFmpeg is ready...');
      if (!this.ffmpeg || typeof this.ffmpeg.exec !== 'function') {
        throw new Error('FFmpeg loaded but exec method not available');
      }
      this.log('✓ FFmpeg verified and ready');

      // Set loaded to true
      this.loaded = true;
      this.loading = false;
      
      this.log('==== FFmpeg Load Complete (Single-Threaded) ====');
      this.log('⚠️  Running in single-threaded mode (slower but GitHub Pages compatible)');
      this.log('Final status:', {
        loaded: this.loaded,
        hasFFmpeg: !!this.ffmpeg,
        hasExec: !!(this.ffmpeg && this.ffmpeg.exec)
      });

      this.onLoadCallbacks.forEach(cb => cb(true));
      this.onLoadCallbacks = [];

      return true;
    } catch (error) {
      this.log('❌ Load FAILED:', error);
      this.log('Error stack:', error.stack);
      
      this.loaded = false;
      this.loading = false;
      this.ffmpeg = null;
      
      this.onLoadCallbacks.forEach(cb => cb(false));
      this.onLoadCallbacks = [];
      
      return false;
    }
  }

  // Extract frame from video at specific time
  async extractFrame(videoFile, timeInSeconds = 0) {
    if (!this.isLoaded()) {
      this.log('Cannot extract frame - FFmpeg not loaded');
      return null;
    }

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
      this.log('Extract frame failed:', error);
      return null;
    }
  }

  async generateThumbnail(videoFile, width = 160, height = 90, timeInSeconds = 1) {
    if (!this.isLoaded()) {
      this.log('Cannot generate thumbnail - FFmpeg not loaded');
      return null;
    }

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
      this.log('Generate thumbnail failed:', error);
      return null;
    }
  }

  async trimVideo(videoFile, startTime, endTime, outputFormat = 'mp4') {
    if (!this.isLoaded()) {
      this.log('Cannot trim video - FFmpeg not loaded');
      return null;
    }

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
      this.log('Trim video failed:', error);
      return null;
    }
  }

  async cropVideo(videoFile, width, height, x = 0, y = 0) {
    if (!this.isLoaded()) {
      this.log('Cannot crop video - FFmpeg not loaded');
      return null;
    }

    const inputFileName = 'input_video';
    const outputFileName = 'output.mp4';

    try {
      this.log('Crop video start:', { width, height, x, y });
      
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));
      this.log('Input file written');

      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-vf', `crop=${width}:${height}:${x}:${y}`,
        '-c:a', 'copy',
        outputFileName
      ]);
      this.log('FFmpeg exec complete');

      const data = await this.ffmpeg.readFile(outputFileName);
      this.log('Output file read:', data.length, 'bytes');
      
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      this.log('Crop video complete');
      return blob;
    } catch (error) {
      this.log('Crop video failed:', error);
      return null;
    }
  }

  async fetchFileData(file) {
    if (file instanceof File || file instanceof Blob) {
      return new Uint8Array(await file.arrayBuffer());
    } else if (typeof file === 'string') {
      const response = await fetch(file);
      return new Uint8Array(await response.arrayBuffer());
    }
    throw new Error('Invalid file type');
  }

  onProgress(callback) {
    this.onProgressCallbacks.push(callback);
  }

  notifyProgress(progress, time) {
    this.onProgressCallbacks.forEach(cb => cb(progress, time));
  }

  isLoaded() {
    const isActuallyLoaded = this.loaded && 
                            this.ffmpeg !== null && 
                            typeof this.ffmpeg.exec === 'function';
    
    if (!isActuallyLoaded && this.loaded) {
      this.log('WARNING: loaded flag is true but FFmpeg is not actually ready!');
      this.loaded = false;
    }
    
    return isActuallyLoaded;
  }

  getLoadProgress() {
    return this.loadProgress;
  }

  getDebugInfo() {
    return {
      mode: 'single-threaded (GitHub Pages)',
      loaded: this.loaded,
      loading: this.loading,
      hasFFmpeg: !!this.ffmpeg,
      hasFFmpegClass: !!this.FFmpegClass,
      hasToBlobURL: !!this.toBlobURL,
      hasExec: !!(this.ffmpeg && this.ffmpeg.exec),
      isActuallyReady: this.isLoaded(),
      loadAttempts: this.loadAttempts
    };
  }
}

const ffmpegManager = new FFmpegManager();

window.ffmpegDebug = () => {
  console.log('=== FFmpeg Debug Info ===');
  console.log(ffmpegManager.getDebugInfo());
  console.log('Load attempts:', ffmpegManager.loadAttempts);
};

export default ffmpegManager;
export { FFmpegManager };
