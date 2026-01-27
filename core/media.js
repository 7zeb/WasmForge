import ffmpegManager from './wasm/ffmpeg.js';

// Helper: format seconds → mm:ss
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Generate thumbnail + duration (videos) or direct thumbnail (images)
export async function generateThumbnail(file, useFFmpeg = true) {
  // IMAGE SUPPORT
  if (file.type.startsWith("image")) {
    return {
      thumbnail: URL.createObjectURL(file),
      durationSeconds: null
    };
  }

  // VIDEO SUPPORT with FFmpeg
  if (file.type.startsWith("video") && useFFmpeg && ffmpegManager.isLoaded()) {
    try {
      // Get video metadata first
      const video = document.createElement("video");
      video.src = URL.createObjectURL(file);
      video.muted = true;
      
      const duration = await new Promise((resolve) => {
        video.onloadedmetadata = () => resolve(video.duration);
      });

      // Generate thumbnail at 10% into the video or 1 second, whichever is less
      const thumbnailTime = Math.min(1, duration * 0.1);
      const thumbnail = await ffmpegManager.generateThumbnail(file, 160, 90, thumbnailTime);

      URL.revokeObjectURL(video.src);

      return {
        thumbnail: thumbnail || URL.createObjectURL(file),
        durationSeconds: duration
      };
    } catch (error) {
      console.warn('[Media] FFmpeg thumbnail failed, falling back to canvas:', error);
      // Fall through to canvas method
    }
  }

  // VIDEO SUPPORT (Fallback to canvas method)
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.load();

    video.addEventListener("loadedmetadata", () => {
      const durationSeconds = video.duration;
      video.currentTime = Math.min(0.1, durationSeconds / 2 || 0);

      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        resolve({
          thumbnail: canvas.toDataURL("image/png"),
          durationSeconds
        });
      });
    });
  });
}

// Rest of your existing media.js code...
// (createMediaTile, handleImportedFiles, etc.)
