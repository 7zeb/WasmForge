// Preview Renderer for Timeline
import ffmpegManager from './ffmpeg.js';
import { project } from '../projects.js';

class PreviewRenderer {
  constructor() {
    this.currentTime = 0;
    this.isPlaying = false;
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.videoElements = new Map(); // Cache for video elements
    this.audioContext = null;
    this.audioSources = new Map();
  }

  // Initialize preview canvas
  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size based on aspect ratio
    this.updateCanvasSize();
  }

  // Update canvas size based on project aspect ratio
  updateCanvasSize() {
    if (!this.canvas) return;

    const [w, h] = project.aspectRatio.split(':').map(Number);
    const ratio = w / h;
    
    // Set a reasonable resolution
    this.canvas.width = 1280;
    this.canvas.height = Math.round(1280 / ratio);
  }

  // Load video element for a clip
  async loadVideo(mediaId, file) {
    if (this.videoElements.has(mediaId)) {
      return this.videoElements.get(mediaId);
    }

    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
    });

    this.videoElements.set(mediaId, video);
    return video;
  }

  // Get clips at current time
  getActiveClips(time) {
    return project.timeline.filter(clip => {
      return time >= clip.start && time <= clip.end;
    });
  }

  // Render frame at specific time
  async renderFrame(time) {
    if (!this.canvas || !this.ctx) return;

    this.currentTime = time;

    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Get active clips
    const activeClips = this.getActiveClips(time);

    // Sort by track (render bottom to top)
    activeClips.sort((a, b) => {
      const trackOrder = ['audio-2', 'audio-1', 'video-1', 'video-2'];
      return trackOrder.indexOf(a.track) - trackOrder.indexOf(b.track);
    });

    // Render each clip
    for (const clipData of activeClips) {
      const media = project.media.find(m => m.id === clipData.mediaId);
      if (!media) continue;

      // Only render video/image clips
      if (media.mediaType === 'video' || media.mediaType === 'image') {
        await this.renderClip(clipData, media, time);
      }
    }
  }

  // Render a single clip
  async renderClip(clipData, media, currentTime) {
    // Calculate local time within clip
    const localTime = currentTime - clipData.start;
    
    // Get video element (would need actual file reference)
    // For now, this is a placeholder
    // In reality, you'd need to track the file objects
    
    // Draw to canvas
    // this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
  }

  // Start playback
  play() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    const startTime = performance.now();
    const initialTime = this.currentTime;

    const animate = (timestamp) => {
      if (!this.isPlaying) return;

      const elapsed = (timestamp - startTime) / 1000;
      this.currentTime = initialTime + elapsed;

      this.renderFrame(this.currentTime);

      this.animationFrame = requestAnimationFrame(animate);
    };

    this.animationFrame = requestAnimationFrame(animate);
  }

  // Pause playback
  pause() {
    this.isPlaying = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Seek to time
  seek(time) {
    this.currentTime = time;
    this.renderFrame(time);
  }

  // Clean up
  destroy() {
    this.pause();
    
    // Revoke video URLs
    this.videoElements.forEach(video => {
      URL.revokeObjectURL(video.src);
    });
    this.videoElements.clear();
  }
}

const previewRenderer = new PreviewRenderer();

export default previewRenderer;
export { PreviewRenderer };
