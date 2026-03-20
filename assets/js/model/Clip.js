export class Clip {
  constructor({
    id,
    type,           // 'video' | 'audio' | 'image' | 'text'
    assetId = null, // for media-backed clips
    name = '',
    start = 0,
    duration = 5,
    trim = 0,       // start offset inside the asset (seconds)
    volume = 1,
    opacity = 1,
    effects = [],   // { type, amount }
    text = null,    // { value, x, y, size, color, font, align }
  }) {
    this.id = id;
    this.type = type;
    this.assetId = assetId;
    this.name = name;
    this.start = start;
    this.duration = duration;
    this.trim = trim;

    this.volume = volume;
    this.opacity = opacity;

    this.effects = effects;
    this.text = text;
  }

  end() { return this.start + this.duration; }

  activeAt(t) { return t >= this.start && t < this.end(); }

  localTime(t) { return (t - this.start) + (this.trim || 0); }
}
