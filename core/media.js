// /WasmForge/core/media.js

// Helper: format seconds → mm:ss
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Generate thumbnail + duration (videos) or direct thumbnail (images)
export async function generateThumbnail(file) {
  // IMAGE SUPPORT
  if (file.type.startsWith("image")) {
    return {
      thumbnail: URL.createObjectURL(file),
      durationSeconds: null
    };
  }

  // VIDEO SUPPORT
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.load();

    video.addEventListener("loadedmetadata", () => {
      const durationSeconds = video.duration;

      // seek slightly in (or middle if very short)
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

// Create a tile DOM element for a media file
export function createMediaTile(file, thumbnail, durationSeconds, mediaID) {
  const tile = document.createElement("div");
  const mediaObj = onMediaRegistered(file);
  tile.className = "media-tile";

  const hasDuration = typeof durationSeconds === "number" && !isNaN(durationSeconds);

  tile.innerHTML = `
    <div class="media-thumb-wrapper">
      <img src="${thumbnail}" class="media-thumb">
      ${hasDuration
        ? `<span class="media-duration">${formatDuration(durationSeconds)}</span>`
        : ""}
    </div>
    <span class="media-name">${file.name}</span>
  `;

  // Drag support: dragging tile → timeline
  tile.draggable = true;

  tile.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("wasmforge-media-id", file._id);
  });

  // Click behavior: preview + add to timeline
  tile.addEventListener("click", () => {
    if (window.previewMediaFile) {
      window.previewMediaFile(file);
    }

    if (window.addClipToTimeline) {
      window.addClipToTimeline(file._id);
    }
  });

  return tile;
}

// Main entry: handle imported files, create tiles, register with project
export async function handleImportedFiles(files, mediaListElement, onMediaRegistered) {
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    // Let main.js update project/mediaFiles
    if (typeof onMediaRegistered === "function") {
      onMediaRegistered(file);
    }

    const { thumbnail, durationSeconds } = await generateThumbnail(file);
    const tile = createMediaTile(file, thumbnail, durationSeconds);

    mediaListElement.appendChild(tile);
  }
}


