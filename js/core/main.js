// ========================================
// WasmForge v9 - Main Application
// ========================================

import ffmpegManager from './core/ffmpeg.js';

// ========================================
// STATE
// ========================================

const state = {
  project: {
    title: 'Untitled Project',
    aspectRatio: '16:9',
    media: [],
    timeline: [],
    tracks: []
  },
  ui: {
    currentTool: 'select',
    selectedClip: null,
    zoom: 100,
    isPlaying: false
  },
  ffmpeg: {
    status: 'loading', // 'loading', 'ready', 'error'
    progress: 0
  }
};

// ========================================
// DOM ELEMENTS
// ========================================

const elements = {
  // File input
  fileInput: document.getElementById('file-input'),
  
  // Top bar
  projectName: document.querySelector('.project-name'),
  ffmpegStatus: document.getElementById('ffmpeg-status'),
  
  // Media panel
  importZone: document.getElementById('import-zone'),
  mediaGrid: document.getElementById('media-grid'),
  
  // Preview
  previewVideo: document.getElementById('preview-video'),
  previewPlaceholder: document.getElementById('preview-placeholder'),
  previewContainer: document.getElementById('preview-container'),
  aspectRatio: document.getElementById('aspect-ratio'),
  
  // Transport
  btnPlay: document.getElementById('btn-play'),
  btnStart: document.getElementById('btn-start'),
  btnEnd: document.getElementById('btn-end'),
  btnPrev: document.getElementById('btn-prev'),
  btnNext: document.getElementById('btn-next'),
  currentTime: document.getElementById('current-time'),
  totalTime: document.getElementById('total-time'),
  
  // Timeline
  timelineContainer: document.getElementById('timeline-container'),
  timelineTracks: document.getElementById('timeline-tracks'),
  playhead: document.getElementById('playhead'),
  
  // Tools
  toolSelect: document.getElementById('tool-select'),
  toolRazor: document.getElementById('tool-razor'),
  btnUndo: document.getElementById('btn-undo'),
  btnRedo: document.getElementById('btn-redo'),
  
  // Zoom
  zoomSlider: document.getElementById('zoom-slider'),
  zoomLevel: document.getElementById('zoom-level'),
  btnZoomIn: document.getElementById('btn-zoom-in'),
  btnZoomOut: document.getElementById('btn-zoom-out'),
  
  // Inspector
  inspectorEmpty: document.getElementById('inspector-empty'),
  inspectorProperties: document.getElementById('inspector-properties'),
  
  // Modal
  loadingModal: document.getElementById('loading-modal'),
  loadingStatus: document.getElementById('loading-status'),
  loadingProgress: document.getElementById('loading-progress')
};

// ========================================
// INITIALIZATION
// ========================================

async function init() {
  console.log('🚀 WasmForge v9 initializing...');
  
  // Set up event listeners
  setupEventListeners();
  
  // Initialize timeline
  initTimeline();
  
  // Update UI
  updateAspectRatio();
  
  // Load FFmpeg
  await loadFFmpeg();
  
  console.log('✅ WasmForge v9 ready!');
}

// ========================================
// FFMPEG LOADING
// ========================================

async function loadFFmpeg() {
  updateFFmpegStatus('loading', 'Loading FFmpeg...');
  elements.loadingModal.classList.add('visible');
  
  ffmpegManager.onProgress((progress) => {
    elements.loadingProgress.style.width = progress + '%';
    elements.loadingStatus.textContent = `Loading: ${progress}%`;
  });
  
  const success = await ffmpegManager.load();
  
  elements.loadingModal.classList.remove('visible');
  
  if (success) {
    updateFFmpegStatus('ready', 'Ready');
  } else {
    updateFFmpegStatus('error', 'Failed to load');
    alert('FFmpeg failed to load. Some features will be unavailable.');
  }
}

function updateFFmpegStatus(status, text) {
  state.ffmpeg.status = status;
  elements.ffmpegStatus.className = `status-indicator ${status}`;
  elements.ffmpegStatus.querySelector('.status-text').textContent = text;
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Import zone
  elements.importZone.addEventListener('click', () => {
    elements.fileInput.click();
  });
  
  elements.importZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.importZone.classList.add('dragover');
  });
  
  elements.importZone.addEventListener('dragleave', () => {
    elements.importZone.classList.remove('dragover');
  });
  
  elements.importZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.importZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  
  // File input
  elements.fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    elements.fileInput.value = '';
  });
  
  // Project name
  elements.projectName.addEventListener('change', (e) => {
    state.project.title = e.target.value || 'Untitled Project';
  });
  
  // Aspect ratio
  elements.aspectRatio.addEventListener('change', (e) => {
    state.project.aspectRatio = e.target.value;
    updateAspectRatio();
  });
  
  // Transport controls
  elements.btnPlay.addEventListener('click', togglePlay);
  elements.btnStart.addEventListener('click', () => seekTo(0));
  elements.btnEnd.addEventListener('click', () => seekTo(elements.previewVideo.duration));
  elements.btnPrev.addEventListener('click', () => frameStep(-1));
  elements.btnNext.addEventListener('click', () => frameStep(1));
  
  // Video events
  elements.previewVideo.addEventListener('timeupdate', updateTimeDisplay);
  elements.previewVideo.addEventListener('loadedmetadata', () => {
    elements.totalTime.textContent = formatTimecode(elements.previewVideo.duration);
  });
  
  // Tools
  elements.toolSelect.addEventListener('click', () => selectTool('select'));
  elements.toolRazor.addEventListener('click', () => selectTool('razor'));
  
  // Zoom
  elements.zoomSlider.addEventListener('input', (e) => {
    state.ui.zoom = parseInt(e.target.value);
    elements.zoomLevel.textContent = state.ui.zoom + '%';
    updateTimelineZoom();
  });
  
  elements.btnZoomIn.addEventListener('click', () => {
    state.ui.zoom = Math.min(200, state.ui.zoom + 20);
    elements.zoomSlider.value = state.ui.zoom;
    elements.zoomLevel.textContent = state.ui.zoom + '%';
    updateTimelineZoom();
  });
  
  elements.btnZoomOut.addEventListener('click', () => {
    state.ui.zoom = Math.max(20, state.ui.zoom - 20);
    elements.zoomSlider.value = state.ui.zoom;
    elements.zoomLevel.textContent = state.ui.zoom + '%';
    updateTimelineZoom();
  });
  
  // Panel tabs
  document.querySelectorAll('.panel-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      const panel = tab.closest('.sidebar');
      
      panel.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
      panel.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// ========================================
// FILE HANDLING
// ========================================

async function handleFiles(files) {
  for (const file of files) {
    const mediaItem = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      file: file,
      duration: 0,
      thumbnail: null
    };
    
    // Get video duration and thumbnail
    if (file.type.startsWith('video/')) {
      try {
        mediaItem.duration = await getVideoDuration(file);
        if (ffmpegManager.isLoaded()) {
          mediaItem.thumbnail = await ffmpegManager.generateThumbnail(file);
        }
      } catch (error) {
        console.error('Failed to process video:', error);
      }
    }
    
    state.project.media.push(mediaItem);
    renderMediaItem(mediaItem);
  }
}

function renderMediaItem(media) {
  const div = document.createElement('div');
  div.className = 'media-item';
  div.dataset.id = media.id;
  div.draggable = true;
  
  const thumbnail = document.createElement('div');
  thumbnail.className = 'media-thumbnail';
  
  if (media.thumbnail) {
    const img = document.createElement('img');
    img.src = media.thumbnail;
    thumbnail.appendChild(img);
  } else {
    thumbnail.textContent = media.type.startsWith('video/') ? '🎬' : '🎵';
  }
  
  const info = document.createElement('div');
  info.className = 'media-info';
  
  const name = document.createElement('div');
  name.className = 'media-name';
  name.textContent = media.name;
  name.title = media.name;
  
  const duration = document.createElement('div');
  duration.className = 'media-duration';
  duration.textContent = media.duration ? formatTimecode(media.duration) : '--:--:--';
  
  info.appendChild(name);
  info.appendChild(duration);
  
  div.appendChild(thumbnail);
  div.appendChild(info);
  
  // Preview on click
  div.addEventListener('click', () => {
    previewMedia(media);
  });
  
  // Drag events
  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('media-id', media.id);
  });
  
  elements.mediaGrid.appendChild(div);
}

// ========================================
// PREVIEW
// ========================================

function previewMedia(media) {
  const url = URL.createObjectURL(media.file);
  elements.previewVideo.src = url;
  elements.previewVideo.classList.add('visible');
  elements.previewPlaceholder.classList.add('hidden');
}

function updateAspectRatio() {
  const [w, h] = state.project.aspectRatio.split(':').map(Number);
  elements.previewContainer.style.aspectRatio = `${w} / ${h}`;
}

// ========================================
// PLAYBACK
// ========================================

function togglePlay() {
  if (!elements.previewVideo.src) return;
  
  if (state.ui.isPlaying) {
    elements.previewVideo.pause();
    elements.btnPlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
  } else {
    elements.previewVideo.play();
    elements.btnPlay.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>';
  }
  
  state.ui.isPlaying = !state.ui.isPlaying;
}

function seekTo(time) {
  if (!elements.previewVideo.src) return;
  elements.previewVideo.currentTime = time;
}

function frameStep(direction) {
  if (!elements.previewVideo.src) return;
  const frameTime = 1 / 30; // Assuming 30fps
  elements.previewVideo.currentTime += direction * frameTime;
}

function updateTimeDisplay() {
  elements.currentTime.textContent = formatTimecode(elements.previewVideo.currentTime);
  updatePlayheadPosition();
}

// ========================================
// TIMELINE
// ========================================

function initTimeline() {
  // Create default tracks
  state.project.tracks = [
    { id: 'video-1', type: 'video', name: 'Video 1' },
    { id: 'audio-1', type: 'audio', name: 'Audio 1' }
  ];
  
  renderTracks();
}

function renderTracks() {
  elements.timelineTracks.innerHTML = '';
  
  state.project.tracks.forEach(track => {
    const trackEl = document.createElement('div');
    trackEl.className = 'timeline-track';
    trackEl.dataset.trackId = track.id;
    
    // Allow drop
    trackEl.addEventListener('dragover', (e) => e.preventDefault());
    trackEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const mediaId = e.dataTransfer.getData('media-id');
      if (mediaId) {
        addClipToTimeline(mediaId, track.id, e.offsetX);
      }
    });
    
    elements.timelineTracks.appendChild(trackEl);
  });
}

function addClipToTimeline(mediaId, trackId, position) {
  const media = state.project.media.find(m => m.id === mediaId);
  if (!media) return;
  
  const clip = {
    id: crypto.randomUUID(),
    mediaId: mediaId,
    trackId: trackId,
    start: position / (state.ui.zoom / 100) / 50, // Convert pixels to seconds
    duration: media.duration || 5
  };
  
  state.project.timeline.push(clip);
  renderClip(clip);
}

function renderClip(clip) {
  const media = state.project.media.find(m => m.id === clip.mediaId);
  const track = elements.timelineTracks.querySelector(`[data-track-id="${clip.trackId}"]`);
  if (!track || !media) return;
  
  const clipEl = document.createElement('div');
  clipEl.className = 'timeline-clip';
  clipEl.dataset.clipId = clip.id;
  clipEl.textContent = media.name;
  
  const pixelsPerSecond = 50 * (state.ui.zoom / 100);
  clipEl.style.left = (clip.start * pixelsPerSecond) + 'px';
  clipEl.style.width = (clip.duration * pixelsPerSecond) + 'px';
  
  track.appendChild(clipEl);
}

function updateTimelineZoom() {
  // Re-render all clips with new zoom
  state.project.timeline.forEach(clip => {
    const clipEl = elements.timelineTracks.querySelector(`[data-clip-id="${clip.id}"]`);
    if (clipEl) {
      const pixelsPerSecond = 50 * (state.ui.zoom / 100);
      clipEl.style.left = (clip.start * pixelsPerSecond) + 'px';
      clipEl.style.width = (clip.duration * pixelsPerSecond) + 'px';
    }
  });
}

function updatePlayheadPosition() {
  const pixelsPerSecond = 50 * (state.ui.zoom / 100);
  const position = elements.previewVideo.currentTime * pixelsPerSecond;
  elements.playhead.style.left = position + 'px';
}

// ========================================
// TOOLS
// ========================================

function selectTool(tool) {
  state.ui.currentTool = tool;
  
  document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  if (tool === 'select') {
    elements.toolSelect.classList.add('active');
  } else if (tool === 'razor') {
    elements.toolRazor.classList.add('active');
  }
}

// ========================================
// UTILITIES
// ========================================

function formatTimecode(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00:00:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30); // 30fps
  
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

function pad(num) {
  return num.toString().padStart(2, '0');
}

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    
    video.onerror = reject;
    video.src = URL.createObjectURL(file);
  });
}

// ========================================
// START APP
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}