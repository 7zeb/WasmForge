// FFmpeg WASM Integration for WasmForge
import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/ffmpeg.js';
import { toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

class FFmpegManager {
  constructor() {
    this.ffmpeg = null;
    this.loaded = false;
    this.loading = false;
    this.loadProgress = 0;
    this.onProgressCallbacks = [];
    this.onLoadCallbacks = [];
  }

  // Load FFmpeg WASM
  async load() {
    if (this.loaded) return true;
    if (this.loading) {
      // Wait for current load to complete
      return new Promise((resolve) => {
        this.onLoadCallbacks.push(resolve);
      });
    }

    this.loading = true;
    this.ffmpeg = new FFmpeg();

    // Progress callback
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress, time }) => {
      this.loadProgress = progress * 100;
      this.notifyProgress(progress, time);
    });

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });

      this.loaded = true;
      this.loading = false;
      console.log('[FFmpeg] Loaded successfully');

      // Notify all waiting callbacks
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
    await this.load();

    const inputFileName = 'input_video';
    const outputFileName = 'output_frame.jpg';

    try {
      // Write input file to FFmpeg virtual filesystem
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      // Extract frame at specified time
      await this.ffmpeg.exec([
        '-ss', timeInSeconds.toString(),
        '-i', inputFileName,
        '-vframes', '1',
        '-q:v', '2',
        outputFileName
      ]);

      // Read the output
      const data = await this.ffmpeg.readFile(outputFileName);
      
      // Clean up
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      // Convert to blob URL
      const blob = new Blob([data.buffer], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('[FFmpeg] Extract frame failed:', error);
      return null;
    }
  }

  // Generate thumbnail with specific dimensions
  async generateThumbnail(videoFile, width = 160, height = 90, timeInSeconds = 1) {
    await this.load();

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

  // Get video metadata
  async getVideoMetadata(videoFile) {
    await this.load();

    const inputFileName = 'input_video';

    try {
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      // Run ffprobe-like command to get metadata
      let metadata = {
        duration: 0,
        width: 0,
        height: 0,
        fps: 0,
        codec: '',
        bitrate: 0
      };

      // For now, we'll extract basic info from ffmpeg output
      // A more robust solution would use ffprobe
      
      await this.ffmpeg.deleteFile(inputFileName);

      return metadata;
    } catch (error) {
      console.error('[FFmpeg] Get metadata failed:', error);
      return null;
    }
  }

  // Trim video
  async trimVideo(videoFile, startTime, endTime, outputFormat = 'mp4') {
    await this.load();

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

  // Concatenate multiple videos
  async concatenateVideos(videoFiles, outputFormat = 'mp4') {
    await this.load();

    try {
      // Create concat list file
      let concatList = '';
      const inputFiles = [];

      for (let i = 0; i < videoFiles.length; i++) {
        const fileName = `input${i}.mp4`;
        inputFiles.push(fileName);
        await this.ffmpeg.writeFile(fileName, await this.fetchFileData(videoFiles[i]));
        concatList += `file '${fileName}'\n`;
      }

      // Write concat list
      await this.ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(concatList));

      const outputFileName = `output.${outputFormat}`;

      await this.ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        outputFileName
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      
      // Clean up
      for (const file of inputFiles) {
        await this.ffmpeg.deleteFile(file);
      }
      await this.ffmpeg.deleteFile('concat_list.txt');
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });
      return blob;
    } catch (error) {
      console.error('[FFmpeg] Concatenate videos failed:', error);
      return null;
    }
  }

  // Apply filter to video
  async applyFilter(videoFile, filter, outputFormat = 'mp4') {
    await this.load();

    const inputFileName = 'input_video';
    const outputFileName = `output.${outputFormat}`;

    try {
      await this.ffmpeg.writeFile(inputFileName, await this.fetchFileData(videoFile));

      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-vf', filter,
        '-c:a', 'copy',
        outputFileName
      ]);

      const data = await this.ffmpeg.readFile(outputFileName);
      
      await this.ffmpeg.deleteFile(inputFileName);
      await this.ffmpeg.deleteFile(outputFileName);

      const blob = new Blob([data.buffer], { type: `video/${outputFormat}` });
      return blob;
    } catch (error) {
      console.error('[FFmpeg] Apply filter failed:', error);
      return null;
    }
  }

  // Helper to fetch file data
  async fetchFileData(file) {
    if (file instanceof File || file instanceof Blob) {
      return new Uint8Array(await file.arrayBuffer());
    } else if (typeof file === 'string') {
      // URL
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