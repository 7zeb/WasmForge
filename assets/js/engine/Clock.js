export class Clock {
  constructor() {
    this.t = 0;
    this.playing = false;
    this._last = 0;
  }

  play() { this.playing = true; this._last = performance.now(); }
  pause() { this.playing = false; }
  stop() { this.pause(); this.t = 0; }

  tick() {
    if (!this.playing) return 0;
    const now = performance.now();
    const dt = (now - this._last) / 1000;
    this._last = now;
    this.t += dt;
    return dt;
  }

  seek(t) { this.t = Math.max(0, t); }
}
