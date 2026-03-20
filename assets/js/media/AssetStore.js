export class AssetStore {
  constructor() {
    this._assets = new Map(); // id -> asset
    this._id = 1;
  }

  createId() { return `A${this._id++}`; }

  add(asset) {
    this._assets.set(asset.id, asset);
  }

  get(id) { return this._assets.get(id) || null; }

  list() { return [...this._assets.values()]; }

  pauseAll() {
    for (const a of this._assets.values()) {
      if (a.el && typeof a.el.pause === 'function') {
        try { a.el.pause(); } catch {}
      }
    }
  }

  /**
   * For export: force media elements to reflect timeline time.
   * This is not used for realtime playback (too expensive).
   */
  seekAllToTimelineTime(t, timeline) {
    const active = timeline.activeAudioClips(t); // includes video clips too
    const activeSet = new Set(active.map(x => x.clip.assetId).filter(Boolean));

    for (const { clip } of active) {
      if (!clip.assetId) continue;
      const asset = this.get(clip.assetId);
      if (!asset?.el) continue;

      if (asset.kind === 'audio' || asset.kind === 'video') {
        const mt = clip.localTime(t);
        if (Number.isFinite(mt) && Math.abs(asset.el.currentTime - mt) > 0.06) {
          try { asset.el.currentTime = mt; } catch {}
        }
      }
    }

    // Pause anything not active (prevents runaway audio during export)
    for (const a of this._assets.values()) {
      if ((a.kind === 'audio' || a.kind === 'video') && a.el) {
        if (!activeSet.has(a.id)) {
          try { a.el.pause(); } catch {}
        }
      }
    }
  }
}
