import { Timeline } from '../model/Timeline.js';
import { Clip } from '../model/Clip.js';
import { AssetStore } from '../media/AssetStore.js';
import { RenderEngine } from '../engine/RenderEngine.js';
import { Clock } from '../engine/Clock.js';
import { PlaybackEngine } from '../engine/PlaybackEngine.js';
import { WebMExporter } from '../export/WebMExporter.js';
import { downloadBlob } from '../export/download.js';

export class App {
  constructor({ canvas, logEl }) {
    this.canvas = canvas;
    this.logEl = logEl;

    this.timeline = new Timeline();
    this.assets = new AssetStore();

    this.clock = new Clock();
    this.renderer = new RenderEngine(canvas);
    this.playback = new PlaybackEngine({ assets: this.assets, timeline: this.timeline });

    this._raf = null;
  }

  log(msg) {
    if (!this.logEl) return;
    this.logEl.textContent += msg + '\n';
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  start() {
    const loop = () => {
      const dt = this.clock.tick();
      const dur = this.timeline.duration();
      if (this.clock.t > dur) {
        this.clock.seek(dur);
        this.pause();
      }

      // preview: draw current time
      this.renderer.renderAtTime(this.clock.t, this.timeline, this.assets, { mode: 'preview' });

      // realtime media sync only while playing
      if (this.clock.playing && dt > 0) this.playback.syncToTime(this.clock.t);

      this._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  }

  play() { this.clock.play(); }
  pause() { this.clock.pause(); this.playback.pauseAll(); }
  stop() { this.clock.stop(); this.playback.pauseAll(); }

  seek(t) {
    this.clock.seek(t);
    // On scrub: do a “stronger” sync once to update audio/video to new time
    this.playback.syncToTime(this.clock.t);
  }

  autoAddAssetToTimeline(assetId) {
    const asset = this.assets.get(assetId);
    if (!asset) return;

    // choose a track based on asset kind
    const kind = asset.kind === 'audio' ? 'audio' : 'video';
    let trackIndex = this.timeline.tracks.findIndex(t => t.kind === kind);
    if (trackIndex === -1) trackIndex = this.timeline.tracks.push(this.timeline.addTrack(kind, `${kind} ${this.timeline.tracks.length + 1}`)) - 1;
    const tr = this.timeline.tracks[trackIndex];

    const id = this.timeline.nextClipId();
    const start = 0;
    const duration = asset.duration || (asset.kind === 'image' ? 5 : 3);

    tr.addClip(new Clip({
      id,
      type: asset.kind,
      assetId: asset.id,
      name: asset.name,
      start,
      duration,
      trim: 0,
      volume: 1,
      opacity: 1,
    }));
  }

  addTextClip() {
    let tr = this.timeline.tracks.find(t => t.kind === 'text');
    if (!tr) tr = this.timeline.addTrack('text', 'Text');

    tr.addClip(new Clip({
      id: this.timeline.nextClipId(),
      type: 'text',
      name: 'Text',
      start: this.clock.t,
      duration: 3,
      opacity: 1,
      text: { value: 'Hello WebM', x: this.canvas.width / 2, y: this.canvas.height / 2, size: 56, color: '#fff', align: 'center' }
    }));
  }

  async exportWebM({ fps = 30, bitrate = 4_000_000 }) {
    this.pause();

    const exporter = new WebMExporter({
      renderer: this.renderer,
      timeline: this.timeline,
      assets: this.assets,
      log: (m) => this.log(m),
    });

    const durationSec = this.timeline.duration();
    this.log(`Exporting ${durationSec.toFixed(2)}s @ ${fps}fps...`);

    const blob = await exporter.export({ fps, bitrate, durationSec });
    downloadBlob(blob, 'wasmforge_export.webm');

    this.log(`Done. ${(blob.size / 1048576).toFixed(1)} MB`);
  }
}
