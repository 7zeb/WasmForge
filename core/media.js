// find duration for the different files.
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export async function generateThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.addEventListener("loadedmetadata", () => {
      const duration = video.duration;

      // Seek slightly in to avoid black frame
      video.currentTime = 0.1;

      video.addEventListener("loadeddata", () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        resolve({
          thumbnail: canvas.toDataURL("image/png"),
          duration: formatDuration(duration)
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


