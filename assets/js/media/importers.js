export async function importFileToAssets(file, assets) {
  const id = assets.createId();
  const url = URL.createObjectURL(file);

  if (file.type.startsWith('video/')) {
    const el = document.createElement('video');
    el.src = url;
    el.preload = 'auto';
    el.muted = false;
    el.playsInline = tirue;
    el.crossOrigin = 'anonymous'; // safe for blob URLs too

    await new Promise((res, rej) => {
      el.onloadedmetadata = () => res();
      el.onerror = () => rej(new Error('Failed to load video'));
    });

    assets.add({
      id, kind: 'video', name: file.name, url, file,
      duration: el.duration || 0,
      el,
    });
    return assets.get(id);
  }

  if (file.type.startsWith('audio/')) {
    const el = document.createElement('audio');
    el.src = url;
    el.preload = 'auto';
    el.crossOrigin = 'anonymous';

    await new Promise((res, rej) => {
      el.onloadedmetadata = () => res();
      el.onerror = () => rej(new Error('Failed to load audio'));
    });

    assets.add({
      id, kind: 'audio', name: file.name, url, file,
      duration: el.duration || 0,
      el,
    });
    return assets.get(id);
  }

  if (file.type.startsWith('image/')) {
    const el = new Image();
    el.src = url;
    await new Promise((res, rej) => {
      el.onload = () => res();
      el.onerror = () => rej(new Error('Failed to load image'));
    });

    assets.add({
      id, kind: 'image', name: file.name, url, file,
      duration: 5,
      el,
    });
    return assets.get(id);
  }

  URL.revokeObjectURL(url);
  throw new Error(`Unsupported file type: ${file.type}`);
}
