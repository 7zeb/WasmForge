export class RenderEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });

    this.off = document.createElement('canvas');
    this.off.width = canvas.width;
    this.off.height = canvas.height;
    this.offCtx = this.off.getContext('2d', { alpha: false });
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
    this.off.width = w;
    this.off.height = h;
  }

  renderAtTime(t, timeline, assets, { mode = 'preview' } = {}) {
    const W = this.off.width, H = this.off.height;
    const c = this.offCtx;

    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);

    const active = timeline.activeVisualClips(t);
    for (const { clip } of active) {
      if (clip.type === 'text') this.#drawText(c, clip, W, H);
      else if (clip.type === 'video' || clip.type === 'image') this.#drawMedia(c, clip, t, assets, W, H, mode);
    }

    this.ctx.drawImage(this.off, 0, 0);
  }

  #fit(sw, sh, dw, dh) {
    const sr = sw / sh, dr = dw / dh;
    let w, h;
    if (sr > dr) { w = dw; h = w / sr; }
    else { h = dh; w = h * sr; }
    return { x: (dw - w) / 2, y: (dh - h) / 2, w, h };
  }

  #applyEffects(ctx, effects) {
    if (!effects?.length) { ctx.filter = 'none'; return; }
    const parts = [];
    for (const e of effects) {
      switch (e.type) {
        case 'brightness': parts.push(`brightness(${e.amount}%)`); break;
        case 'contrast': parts.push(`contrast(${e.amount}%)`); break;
        case 'saturate': parts.push(`saturate(${e.amount}%)`); break;
        case 'blur': parts.push(`blur(${(e.amount || 0) / 10}px)`); break;
        case 'grayscale': parts.push(`grayscale(${Math.min(e.amount || 0, 100)}%)`); break;
      }
    }
    ctx.filter = parts.join(' ') || 'none';
  }

  #drawMedia(ctx, clip, t, assets, W, H, mode) {
    const asset = assets.get(clip.assetId);
    if (!asset?.el) return;

    const el = asset.el;

    // Export mode: we allow forced seeking (deterministic)
    if (mode === 'export' && asset.kind === 'video') {
      const mt = clip.localTime(t);
      if (Number.isFinite(mt) && Math.abs(el.currentTime - mt) > 0.04) {
        try { el.currentTime = mt; } catch {}
      }
    }

    let sw = W, sh = H;
    if (asset.kind === 'video') { sw = el.videoWidth || W; sh = el.videoHeight || H; }
    if (asset.kind === 'image') { sw = el.naturalWidth || W; sh = el.naturalHeight || H; }

    const f = this.#fit(sw, sh, W, H);

    ctx.save();
    ctx.globalAlpha = clip.opacity ?? 1;
    this.#applyEffects(ctx, clip.effects);

    try { ctx.drawImage(el, f.x, f.y, f.w, f.h); } catch {}
    ctx.restore();
  }

  #drawText(ctx, clip, W, H) {
    const td = clip.text || { value: clip.name || 'Text' };
    const value = td.value ?? 'Text';
    const x = td.x ?? W / 2;
    const y = td.y ?? H / 2;
    const size = td.size ?? 48;
    const color = td.color ?? '#ffffff';
    const font = td.font ?? 'Inter, system-ui, sans-serif';
    const align = td.align ?? 'center';

    ctx.save();
    ctx.globalAlpha = clip.opacity ?? 1;
    ctx.filter = 'none';
    ctx.font = `${size}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
    ctx.restore();
  }
}
