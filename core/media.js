export async function generateThumbnail(file) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;

    video.currentTime = 0.1;

    video.addEventListener("loadeddata", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 90;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      resolve(canvas.toDataURL("image/png"));
    });
  });
}

export function createMediaTile(file, thumbnail) {
  const tile = document.createElement("div");
  tile.className = "media-tile";

  tile.innerHTML = `
    <img src="${thumbnail}" class="media-thumb">
    <span class="media-name">${file.name}</span>
  `;

  return tile;
}

export async function handleImportedFiles(files, mediaListElement) {
  for (const file of files) {
    const thumb = await generateThumbnail(file);
    const tile = createMediaTile(file, thumb);

    tile.onclick = () => {
      window.addClipToTimeline(file, thumb);
    };

    mediaListElement.appendChild(tile);
  }
}
