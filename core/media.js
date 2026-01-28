// ========================================
// WASMFORGE - Media.js
// Handles media imports, thumbnails, and tiles
// ========================================

// Helper: format seconds → mm:ss
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Generate thumbnail + duration for media files
export async function generateThumbnail(file, useFFmpeg = false) {
  // IMAGE SUPPORT
  if (file.type.startsWith("image")) {
    return {
      thumbnail: URL.createObjectURL(file),
      durationSeconds: null
    };
  }

  // AUDIO SUPPORT
  if (file.type.startsWith("audio")) {
    return {
      thumbnail: generateAudioPlaceholder(file.name),
      durationSeconds: await getAudioDuration(file)
    };
  }

  // VIDEO SUPPORT - Canvas method (reliable, works offline)
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.load();

    video.addEventListener("loadedmetadata", () => {
      const durationSeconds = video.duration;
      
      video.currentTime = Math.max(0.5, Math.min(1, durationSeconds * 0.1));

      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(video.src);

        resolve({
          thumbnail: canvas.toDataURL("image/jpeg", 0.85),
          durationSeconds
        });
      }, { once: true });

      video.addEventListener("error", () => {
        console.warn("[Media] Failed to generate thumbnail for:", file.name);
        URL.revokeObjectURL(video.src);
        
        resolve({
          thumbnail: generateVideoPlaceholder(file.name),
          durationSeconds: 0
        });
      }, { once: true });
    });

    video.addEventListener("error", () => {
      console.warn("[Media] Failed to load video metadata for:", file.name);
      URL.revokeObjectURL(video.src);
      
      resolve({
        thumbnail: generateVideoPlaceholder(file.name),
        durationSeconds: 0
      });
    }, { once: true });
  });
}

// Get audio duration
async function getAudioDuration(file) {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.src = URL.createObjectURL(file);

    audio.addEventListener("loadedmetadata", () => {
      const duration = audio.duration;
      URL.revokeObjectURL(audio.src);
      resolve(duration);
    });

    audio.addEventListener("error", () => {
      URL.revokeObjectURL(audio.src);
      resolve(0);
    });
  });
}

// Generate placeholder for audio files
function generateAudioPlaceholder(filename) {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#3b82f6";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🔊", canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/png");
}

// Generate placeholder for video files that fail to load
function generateVideoPlaceholder(filename) {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 90;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ef4444";
  ctx.font = "40px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎬", canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL("image/png");
}

// Create a tile DOM element for a media file
export function createMediaTile(file, thumbnail, durationSeconds, mediaID, mediaType) {
  const tile = document.createElement("div");
  tile.className = "media-tile";
  tile.draggable = true; // CRITICAL: Make it draggable
  tile.dataset.mediaId = mediaID;
  tile.dataset.mediaType = mediaType;

  const hasDuration = typeof durationSeconds === "number" && !isNaN(durationSeconds) && durationSeconds > 0;

  const typeIcon = mediaType === "video" ? "🎬" : 
                   mediaType === "audio" ? "🔊" : "🖼️";

  tile.innerHTML = `
    <div class="media-thumb-wrapper">
      <img src="${thumbnail}" class="media-thumb" alt="${file.name}" loading="lazy" draggable="false">
      ${hasDuration ? `<span class="media-duration">${formatDuration(durationSeconds)}</span>` : ""}
      <span class="media-type-badge">${typeIcon} ${mediaType}</span>
    </div>
    <span class="media-name" title="${file.name}">${file.name}</span>
  `;

  // DRAG START - CRITICAL FOR DRAG AND DROP
  tile.addEventListener("dragstart", (e) => {
    e.stopPropagation();
    
    // Set the data to transfer
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("wasmforge-media-id", mediaID);
    e.dataTransfer.setData("text/plain", mediaID); // Fallback
    
    // Visual feedback
    tile.classList.add("dragging");
    tile.style.opacity = "0.5";
    
    console.log('[Media] Drag started:', file.name, 'ID:', mediaID);
  });

  // DRAG END - Clean up
  tile.addEventListener("dragend", (e) => {
    tile.classList.remove("dragging");
    tile.style.opacity = "1";
    console.log('[Media] Drag ended');
  });

  // Single click to preview
  tile.addEventListener("click", (e) => {
    // Don't trigger if dragging
    if (tile.classList.contains("dragging")) return;
    
    if (window.previewMediaFile) {
      window.previewMediaFile(file);
    }
  });

  // Double click to add to timeline
  tile.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (window.addClipToTimeline) {
      window.addClipToTimeline(mediaID);
    }
  });

  return tile;
}

// Main entry: handle imported files, create tiles, register with project
export async function handleImportedFiles(files, mediaListElement, onMediaRegistered) {
  const fileArray = Array.from(files);
  
  // Filter and validate files
  const validFiles = fileArray.filter(file => {
    if (file.type.startsWith("video") || 
        file.type.startsWith("audio") || 
        file.type.startsWith("image")) {
      return true;
    }
    console.warn("[Media] Skipping non-media file:", file.name);
    return false;
  });

  if (validFiles.length === 0) {
    console.warn("[Media] No valid media files to import");
    return;
  }

  console.log(`[Media] Importing ${validFiles.length} file(s)...`);

  // Process files
  for (const file of validFiles) {
    try {
      // Register file with project
      let mediaObj = null;
      if (typeof onMediaRegistered === "function") {
        mediaObj = onMediaRegistered(file);
      }

      if (!mediaObj) {
        console.error("[Media] Failed to register file:", file.name);
        continue;
      }

      // Generate thumbnail
      const { thumbnail, durationSeconds } = await generateThumbnail(file);

      // Create and add tile
      const tile = createMediaTile(
        file,
        thumbnail,
        durationSeconds,
        mediaObj.id,
        mediaObj.mediaType
      );

      mediaListElement.appendChild(tile);
      
      console.log(`[Media] Imported: ${file.name} (${mediaObj.mediaType}) - ID: ${mediaObj.id}`);
    } catch (error) {
      console.error(`[Media] Failed to import ${file.name}:`, error);
    }
  }

  console.log("[Media] Import complete");
}

// Export utility functions for external use
export { formatDuration, getAudioDuration };
