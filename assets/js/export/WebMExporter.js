import { pickWebMMime } from './mime.js';
import { AudioMixer } from './AudioMixer.js';

export class WebMExporter {
  constructor({ renderer, timeline, assets, log }) {
    this.renderer = renderer;
    this.timeline = timeline;
    this.assets = assets;
    this.log = log || (() => {});
  }

  async export({ fps = 30, bitrate = 4_000_000, durationSec }) {
    const canvas = this.renderer.canvas;

    const { mimeType, reason } = pickWebMMime();
    if (reason) this.log(reason);

    // Video track from canvas
    const videoStream = canvas.captureStream(fps);

    // Audio track from AudioContext mixdown
    const mixer = new AudioMixer();
    await mixer.init();

    // Connect ALL media elements that can output audio (audio + video assets)
    for (const asset of this.assets.list()) {
      if (asset.kind === 'audio' || asset.kind === 'video') {
        // Ensure element exists
        if (asset.el) mixer.connectElement(asset.el, 1.0);
      }
    }

    // Combine tracks
    const tracks = [
      ...videoStream.getVideoTracks(),
      ...mixer.stream.getAudioTracks(),
    ];
    const combined = new MediaStream(tracks);

    const recorder = new MediaRecorder(combined, {
      mimeType,
      videoBitsPerSecond: bitrate,
    });

    const chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    const stopped = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = (e) => reject(e.error || e);
    });

    recorder.start(100);

    // Deterministic frame loop + deterministic audio positioning
    const totalFrames = Math.ceil(durationSec * fps);

    // Pause any currently playing media
    this.assets.pauseAll();

    for (let f = 0; f <= totalFrames; f++) {
      const t = f / fps;

      // Render frame
      this.renderer.renderAtTime(t, this.timeline, this.assets, { mode: 'export' });

      // Sync audio/video elements to time t (seeking is OK here)
      this.assets.seekAllToTimelineTime(t, this.timeline);

      if (f % 4 === 0) await new Promise((r) => setTimeout(r, 0));
    }

    recorder.stop();
    await stopped;

    await mixer.close();

    return new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' });
  }
}
