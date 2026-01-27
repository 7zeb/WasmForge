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
export function createMediaTile(file, thumbnail, durationSeconds, mediaID, mediaType) {
  const tile = document.createElement("div");
  tile.className = "media-tile";
  tile.draggable = true;

  const hasDuration = typeof durationSeconds === "number" && !isNaN(durationSeconds);

  const typeIcon = mediaType === "video" ? "🎬" : 
                   mediaType === "audio" ? "🔊" : "🖼️";

  tile.innerHTML = `
    <div class="media-thumb-wrapper">
      <img src="${thumbnail}" class="media-thumb" alt="${file.name}">
      ${hasDuration ? `<span class="media-duration">${formatDuration(durationSeconds)}</span>` : ""}
      <span class="media-type-badge">${typeIcon} ${mediaType}</span>
    </div>
    <span class="media-name" title="${file.name}">${file.name}</span>
  `;

  // Drag start
  tile.addEventListener("dragstart", (e) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("wasmforge-media-id", mediaID);
    tile.classList.add("dragging");
  });

  tile.addEventListener("dragend", () => {
    tile.classList.remove("dragging");
  });

  // Click to preview
  tile.addEventListener("click", () => {
    if (window.previewMediaFile) {
      window.previewMediaFile(file);
    }
  });

  // Double click to add to timeline
  tile.addEventListener("dblclick", () => {
    if (window.addClipToTimeline) {
      window.addClipToTimeline(mediaID);
    }
  });

  return tile;
}

// Main entry: handle imported files, create tiles, register with project
export async function handleImportedFiles(files, mediaListElement, onMediaRegistered) {
  const fileArray = Array.from(files);

  for (const file of fileArray) {
    // Skip non-media files
    if (!file.type.startsWith("video") && 
        !file.type.startsWith("audio") && 
        !file.type.startsWith("image")) {
      console.warn("Skipping non-media file:", file.name);
      continue;
    }

    let mediaObj = null;

    if (typeof onMediaRegistered === "function") {
      mediaObj = onMediaRegistered(file);
    }

    const { thumbnail, durationSeconds } = await generateThumbnail(file);

    const tile = createMediaTile(
      file,
      thumbnail,
      durationSeconds,
      mediaObj.id,
      mediaObj.mediaType
    );

    mediaListElement.appendChild(tile);
  }
}
