export class AudioMixer {
  constructor() {
    this.ctx = null;
    this.dest = null;
    this.sources = new Map(); // element -> MediaElementSourceNode
    this.gains = new Map();   // element -> GainNode
  }

  async init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.dest = this.ctx.createMediaStreamDestination();
  }

  connectElement(el, gainValue = 1.0) {
    // Important: a HTMLMediaElement can only be connected once to an AudioContext
    if (this.sources.has(el)) return;

    const src = this.ctx.createMediaElementSource(el);
    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;

    src.connect(gain);
    gain.connect(this.dest);

    // (Optional) also monitor locally (not needed for export):
    // gain.connect(this.ctx.destination);

    this.sources.set(el, src);
    this.gains.set(el, gain);
  }

  setGain(el, gainValue) {
    const g = this.gains.get(el);
    if (g) g.gain.value = gainValue;
  }

  get stream() {
    return this.dest.stream;
  }

  async close() {
    try { await this.ctx?.close(); } catch {}
    this.ctx = null;
    this.dest = null;
    this.sources.clear();
    this.gains.clear();
  }
}
