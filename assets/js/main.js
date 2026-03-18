import { App } from './app/App.js';
import { UI } from './ui/UI.js';

const app = new App({
  canvas: document.getElementById('previewCanvas'),
  logEl: document.getElementById('log'),
});

const ui = new UI({
  app,
  fileInput: document.getElementById('fileInput'),
  playBtn: document.getElementById('playBtn'),
  stopBtn: document.getElementById('stopBtn'),
  exportBtn: document.getElementById('exportBtn'),
  timeLabel: document.getElementById('timeLabel'),
  scrub: document.getElementById('scrub'),
  mediaList: document.getElementById('mediaList'),
  timelineView: document.getElementById('timelineView'),
});

ui.mount();
app.start();
