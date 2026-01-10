// find duration for the different files.
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function generateThumbnail(file) {
  // IMAGE SUPPORT
  if (file.type.startsWith("image")) {
    return {
      thumbnail: URL.createObjectURL(file),
      duration: null
    };
  }

  // VIDEO SUPPORT
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.load(); // important

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;

      // seek slightly in
      video.currentTime = Math.min(0.1, duration / 2);

      video.addEventListener("seeked", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        resolve({
          thumbnail: canvas.toDataURL("image/png"),
          duration
        });
      });
    });
  });
}



export function createMediaTile(file, thumbnail, duration) {
  const tile = document.createElement("div");
  tile.className = "media-tile";

  tile.innerHTML = `
    <div class="media-thumb-wrapper">
      <img src="${thumbnail}" class="media-thumb">
      <span class="media-duration">${duration}</span>
    </div>
    <span class="media-name">${file.name}</span>
  `;

  return tile;
}


export async function handleImportedFiles(files, mediaListElement) {
  for (const file of files) {
    const { thumbnail, duration } = await generateThumbnail(file);
    const tile = createMediaTile(file, thumbnail, duration);

    tile.onclick = () => {
      window.addClipToTimeline(file, thumbnail);
    };

    mediaListElement.appendChild(tile);
  }
}



