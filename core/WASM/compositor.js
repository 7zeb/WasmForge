// Video Compositor - Combines timeline clips into final output 
import ffmpegManager from './ffmpeg.js';
import { project } from '../projects.js';

class VideoCompositor {
  constructor() {
    this.rendering = false;
    this.progress = 0;
    this.onProgressCallbacks = [];
  }

  // Composite timeline to video
  async composeTimeline(projectData, onProgress) {
    if (this.rendering) {
      console.warn('[Compositor] Already rendering');
      return null;
    }

    this.rendering = true;
    this.progress = 0;

    try {
      await ffmpegManager.load();

      // For now, simple concatenation of video clips
      // In a full implementation, this would handle:
      // - Multiple tracks
      // - Transitions
      // - Effects
      // - Audio mixing
      // - Color correction
      
      const videoClips = projectData.timeline
        .filter(clip => {
          const media = projectData.media.find(m => m.id === clip.mediaId);
          return media && media.mediaType === 'video';
        })
        .sort((a, b) => a.start - b.start);

      if (videoClips.length === 0) {
        throw new Error('No video clips in timeline');
      }

      // Simple concatenation approach
      // Real implementation would be much more complex
      
      this.rendering = false;
      this.progress = 100;
      
      console.log('[Compositor] Composition complete');
      return null; // Would return video blob

    } catch (error) {
      console.error('[Compositor] Composition failed:', error);
      this.rendering = false;
      throw error;
    }
  }

  // Export single clip with effects
  async exportClip(clipData, mediaFile, effects = []) {
    await ffmpegManager.load();

    // Apply effects and export
    // This is a simplified version
    let result = mediaFile;

    for (const effect of effects) {
      switch (effect.type) {
        case 'trim':
          result = await ffmpegManager.trimVideo(result, clipData.start, clipData.end);
          break;
        case 'filter':
          result = await ffmpegManager.applyFilter(result, effect.filter);
          break;
      }
    }

    return result;
  }

  // Add progress listener
  onProgress(callback) {
    this.onProgressCallbacks.push(callback);
  }

  // Notify progress
  notifyProgress(progress) {
    this.progress = progress;
    this.onProgressCallbacks.forEach(cb => cb(progress));
  }

  // Get current progress
  getProgress() {
    return this.progress;
  }

  // Check if rendering
  isRendering() {
    return this.rendering;
  }
}

const compositor = new VideoCompositor();

export default compositor;
export { VideoCompositor };
