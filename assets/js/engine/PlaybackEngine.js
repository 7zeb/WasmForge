export class PlaybackEngine {
  constructor({ assets, timeline }) {
    this.assets = assets;
    this.timeline = timeline;
  }

  /**
   * Realtime sync strategy:
   * - For audio/video elements, we try to keep them playing when their clip is active.
   * - We only seek if drift is large (avoid per-frame seeking).
   */
  syncToTime(t) {
    const active = this.timeline.activeAudioClips(t);

    // Map assetId -> desired mediaTime + volume
    const desired = new Map();
    for (const { clip, track } of active) {
      if (!clip.assetId) continue;
      const asset = this.assets.get(clip.assetId);
      if (!asset?.el) continue;
      if (asset.kind !== 'audio' && asset.kind !== 'video') continue;

      desired.set(asset.id, {
        asset,
        mediaTime: clip.localTime(t),
        volume: (clip.volume ?? 1) * (track.muted ? 0 : 1),
      });
    }

    // Update desired ones
    for (const { asset, mediaTime, volume } of desired.values()) {
      const el = asset.el;

      // volume (for preview only; export uses AudioContext mixdown)
      try { el.volume = Math.max(0, Math.min(1, volume)); } catch {}

      // seek only if drift is large
      if (Number.isFinite(mediaTime) && Math.abs(el.currentTime - mediaTime) > 0.25) {
        try { el.currentTime = mediaTime; } catch {}
      }

      // play if should be playing
      if (el.paused) {
        el.play().catch(() => {});
      }
    }

    // Pause non-active media
    for (const a of this.assets.list()) {
      if (a.kind !== 'audio' && a.kind !== 'video') continue;
      if (!a.el) continue;
      if (!desired.has(a.id)) {
        try { a.el.pause(); } catch {}
      }
    }
  }

  pauseAll() { this.assets.pauseAll(); }
}
