// Preview Renderer for Timeline
// Simplified version without FFmpeg dependency initially

class PreviewRenderer {
  constructor() {
    this.currentTime = 0;
    this.isPlaying = false;
    this.canvas = null;
    this.ctx = null;
    this.animationFrame = null;
    this.videoElements = new Map();
    this.audioContext = null;
    this.audioSources = new Map();
  }

  // Initialize preview canvas
  init(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.updateCanvasSize();
  }

  // Update canvas size based on project aspect ratio
  updateCanvasSize() {
    if (!this.canvas) return;

    // Default to 16:9 if no project is available
    let aspectRatio = '16:9';
    
    // Try to get from global project if available
    if (typeof window !== 'undefined' && window.project && window.project.aspectRatio) {
      aspectRatio = window.project.aspectRatio;
    }

    const [w, h] = aspectRatio.split(':').map(Number);
    const ratio = w / h;
    
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

  // Render frame at specific time
  async renderFrame(time) {
    if (!this.canvas || !this.ctx) return;

    this.currentTime = time;

    // Clear canvas
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Placeholder - actual rendering would happen here
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
    
    this.videoElements.forEach(video => {
      URL.revokeObjectURL(video.src);
    });
    this.videoElements.clear();
  }
}

const previewRenderer = new PreviewRenderer();

export default previewRenderer;
export { PreviewRenderer };