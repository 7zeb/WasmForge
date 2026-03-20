export class Track {
  constructor({ id, kind, name }) {
    this.id = id;
    this.kind = kind; // 'video' | 'audio' | 'text'
    this.name = name;
    this.muted = false;
    this.hidden = false; // for visual tracks
    this.clips = [];
  }

  addClip(clip) {
    this.clips.push(clip);
    this.clips.sort((a, b) => a.start - b.start);
  }
}
