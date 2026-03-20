import { importFileToAssets } from '../media/importers.js';

export class UI {
  constructor({ app, fileInput, playBtn, stopBtn, exportBtn, timeLabel, scrub, mediaList, timelineView }) {
    this.app = app;
    this.fileInput = fileInput;
    this.playBtn = playBtn;
    this.stopBtn = stopBtn;
    this.exportBtn = exportBtn;
    this.timeLabel = timeLabel;
    this.scrub = scrub;
    this.mediaList = mediaList;
    this.timelineView = timelineView;

    this._uiRaf = null;
  }

  mount() {
    this.fileInput.addEventListener('change', async (e) => {
      const files = [...(e.target.files || [])];
      for (const f of files) {
        try {
          const asset = await importFileToAssets(f, this.app.assets);
          this.app.log(`Imported: ${asset.name}`);
        } catch (err) {
          this.app.log(`Import error: ${err.message || err}`);
        }
      }
      this.fileInput.value = '';
      this.renderMediaList();
      this.renderTimeline();
      this.refreshScrubMax();
    });

    this.playBtn.onclick = () => {
      if (this.app.clock.playing) {
        this.app.pause();
        this.playBtn.textContent = 'Play';
      } else {
        this.app.play();
        this.playBtn.textContent = 'Pause';
      }
    };

    this.stopBtn.onclick = () => {
      this.app.stop();
      this.playBtn.textContent = 'Play';
    };

    this.exportBtn.onclick = async () => {
      // you can expose UI for fps/bitrate later
      await this.app.exportWebM({ fps: 30, bitrate: 4_000_000 });
    };

    this.scrub.oninput = (e) => {
      this.app.seek(Number(e.target.value));
    };

    // lightweight UI refresh loop
    const tick = () => {
      this.timeLabel.textContent = formatTime(this.app.clock.t);
      if (!this.scrub.matches(':active')) {
        this.scrub.value = String(this.app.clock.t);
      }
      this._uiRaf = requestAnimationFrame(tick);
    };
    this._uiRaf = requestAnimationFrame(tick);

    this.renderMediaList();
    this.renderTimeline();
    this.refreshScrubMax();
  }

  refreshScrubMax() {
    const d = this.app.timeline.duration();
    this.scrub.max = String(Math.max(1, d));
  }

  renderMediaList() {
    this.mediaList.innerHTML = '';
    for (const asset of this.app.assets.list()) {
      const div = document.createElement('div');
      div.className = 'asset';
      div.textContent = `${asset.kind.toUpperCase()}: ${asset.name} (${asset.duration ? asset.duration.toFixed(2) + 's' : ''})`;
      div.onclick = () => {
        this.app.autoAddAssetToTimeline(asset.id);
        this.renderTimeline();
        this.refreshScrubMax();
      };
      this.mediaList.appendChild(div);
    }
  }

  renderTimeline() {
    this.timelineView.innerHTML = '';
    const tl = this.app.timeline;

    tl.tracks.forEach((tr, idx) => {
      const row = document.createElement('div');
      row.style.marginBottom = '6px';
      row.innerHTML = `<div style="opacity:.8;font-size:12px;margin-bottom:4px;">${idx + 1}. ${tr.name} (${tr.kind})</div>`;

      const clipsWrap = document.createElement('div');
      for (const cl of tr.clips) {
        const el = document.createElement('span');
        el.className = `clip ${cl.type}`;
        el.textContent = `${cl.name || cl.type} [${cl.start.toFixed(1)}..${cl.end().toFixed(1)}]`;
        clipsWrap.appendChild(el);
      }
      row.appendChild(clipsWrap);
      this.timelineView.appendChild(row);
    });
  }
}

function formatTime(s) {
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  const ms = String(Math.floor((s % 1) * 1000)).padStart(3, '0');
  return `${mm}:${ss}.${ms}`;
}
