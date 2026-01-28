// ========================================
// WASMFORGE - Timeline.js v6.0
// Timeline rendering and clip management
// ========================================

import { project, snapshot } from './projects.js';
import { getIcon } from './assets/icons/icons.js';

// Timeline DOM reference
let tracksContainer = null;

// Timeline state
let zoom = 1;
let selectedClipId = null;
let activeTool = "select"; // "select" or "razor"

const PIXELS_PER_SECOND = 50;
const SNAP_THRESHOLD = 10;

// Track color mapping
const TRACK_COLORS = {
  video: '#8b5cf6',
  audio: '#22c55e',
  image: '#f59e0b'
};

// ========================================
// UTILITY FUNCTIONS
// ========================================

function getMaxTrackNumber(type) {
  const tracks = project.tracks.filter(t => t.type === type);
  if (tracks.length === 0) return 0;
  const numbers = tracks.map(t => {
    const match = t.id.match(/-(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  });
  return Math.max(...numbers);
}

// ========================================
// TIMELINE INITIALIZATION
// ========================================

export function initTimeline(domElement) {
  tracksContainer = domElement;
  
  if (!tracksContainer) {
    console.error('[Timeline] Tracks container not found');
    return;
  }

  // Initialize with default tracks if empty
  if (project.tracks.length === 0) {
    project.tracks = [
      { id: 'video-1', type: 'video', name: 'Video 1', locked: false, visible: true },
      { id: 'audio-1', type: 'audio', name: 'Audio 1', locked: false, visible: true }
    ];
  }

  // Initial render
  renderTracks();

  console.log('[Timeline] Initialized with', project.tracks.length, 'tracks');
}

// ========================================
// TRACK MANAGEMENT
// ========================================

export function addTrack(type) {
  const nextNumber = getMaxTrackNumber(type) + 1;
  const trackId = `${type}-${nextNumber}`;
  
  const newTrack = {
    id: trackId,
    type: type,
    name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${nextNumber}`,
    locked: false,
    visible: true
  };

  snapshot();
  project.tracks.push(newTrack);
  renderTracks();

  console.log('[Timeline] Track added:', trackId);
}

export function deleteTrack(trackId) {
  const trackIndex = project.tracks.findIndex(t => t.id === trackId);
  if (trackIndex === -1) return;

  snapshot();

  // Remove all clips on this track
  project.timeline = project.timeline.filter(clip => clip.track !== trackId);

  // Remove the track
  project.tracks.splice(trackIndex, 1);

  renderTracks();
  console.log('[Timeline] Track deleted:', trackId);
}

// ========================================
// RENDERING
// ========================================

export function renderTracks() {
  if (!tracksContainer) {
    console.error('[Timeline] No tracks container');
    return;
  }

  tracksContainer.innerHTML = '';

  // Create wrapper structure
  const wrapper = document.createElement('div');
  wrapper.className = 'timeline-content';
  wrapper.innerHTML = `
    <div class="track-headers"></div>
    <div class="tracks-area"></div>
  `;
  
  tracksContainer.appendChild(wrapper);

  const headersContainer = wrapper.querySelector('.track-headers');
  const tracksArea = wrapper.querySelector('.tracks-area');

  // Render each track
  project.tracks.forEach(track => {
    renderTrackHeader(track, headersContainer);
    renderTrack(track, tracksArea);
  });

  // Add "Add Track" buttons
  const addTrackHeader = document.createElement('div');
  addTrackHeader.className = 'track-header add-track-header';
  addTrackHeader.innerHTML = `
    <button class="add-track-btn" data-type="video" title="Add Video Track">
      ${getIcon('add')} Video
    </button>
    <button class="add-track-btn" data-type="audio" title="Add Audio Track">
      ${getIcon('add')} Audio
    </button>
  `;
  headersContainer.appendChild(addTrackHeader);

  // Wire up add track buttons
  addTrackHeader.querySelectorAll('.add-track-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addTrack(btn.dataset.type);
    });
  });

  console.log('[Timeline] Rendered', project.tracks.length, 'tracks');
}

function renderTrackHeader(track, container) {
  const header = document.createElement('div');
  header.className = 'track-header';
  header.dataset.trackId = track.id;
  
  const color = TRACK_COLORS[track.type] || '#666';
  
  header.innerHTML = `
    <div class="track-indicator" style="background: ${color};"></div>
    <input type="text" class="track-name-input" value="${track.name}" data-track="${track.id}">
    <div class="track-controls">
      <button class="track-control-btn" data-action="toggle-lock" title="${track.locked ? 'Unlock' : 'Lock'}">
        ${getIcon(track.locked ? 'lock' : 'unlock')}
      </button>
      <button class="track-control-btn" data-action="toggle-visibility" title="${track.visible ? 'Hide' : 'Show'}">
        ${getIcon(track.visible ? 'eye' : 'eyeOff')}
      </button>
      <button class="track-control-btn track-delete-btn" data-action="delete" title="Delete Track">
        ${getIcon('delete')}
      </button>
    </div>
  `;

  container.appendChild(header);

  // Wire up track controls
  const nameInput = header.querySelector('.track-name-input');
  nameInput.addEventListener('change', (e) => {
    track.name = e.target.value || `${track.type} ${track.id.split('-')[1]}`;
  });

  header.querySelectorAll('.track-control-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      
      snapshot();
      
      switch (action) {
        case 'toggle-lock':
          track.locked = !track.locked;
          break;
        case 'toggle-visibility':
          track.visible = !track.visible;
          break;
        case 'delete':
          if (confirm(`Delete track "${track.name}"?`)) {
            deleteTrack(track.id);
          }
          return;
      }
      
      renderTracks();
    });
  });
}

function renderTrack(track, container) {
  const trackElement = document.createElement('div');
  trackElement.className = 'track';
  trackElement.dataset.track = track.id;
  trackElement.dataset.trackType = track.type;
  
  // Give track a minimum height for drop target
  trackElement.style.minHeight = '60px';
  trackElement.style.position = 'relative';
  
  if (!track.visible) {
    trackElement.classList.add('track-hidden');
  }

  // Setup drag and drop IMMEDIATELY
  enableDragDrop(trackElement, track);

  // Render clips on this track
  const clips = project.timeline.filter(clip => clip.track === track.id);
  clips.forEach(clipData => {
    const media = project.media.find(m => m.id === clipData.mediaId);
    if (media) {
      const clipElement = renderClip(clipData, media);
      trackElement.appendChild(clipElement);
    }
  });

  container.appendChild(trackElement);
  
  console.log('[Timeline] Track rendered:', track.id, 'with', clips.length, 'clips');
}

// ========================================
// DRAG AND DROP - CRITICAL SECTION
// ========================================

function enableDragDrop(trackElement, track) {
  // DRAGOVER - Must prevent default to allow drop
  trackElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    trackElement.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  });

  // DRAGLEAVE - Remove highlight
  trackElement.addEventListener('dragleave', (e) => {
    // Only remove if we're actually leaving the track
    if (e.target === trackElement) {
      trackElement.style.backgroundColor = '';
    }
  });

  // DROP - Handle the drop
  trackElement.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    trackElement.style.backgroundColor = '';
    
    const mediaId = e.dataTransfer.getData('wasmforge-media-id');
    
    if (!mediaId) {
      console.warn('[Drop] No media ID');
      return;
    }

    const media = project.media.find(m => m.id === mediaId);
    if (!media) {
      console.warn('[Drop] Media not found:', mediaId);
      return;
    }

    // Calculate drop position
    const rect = trackElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timePosition = Math.max(0, x / getPixelsPerSecond());

    console.log('[Drop] Media:', media.name, 'Track:', track.name, 'Time:', timePosition.toFixed(2) + 's');

    // Add clip
    snapshot();
    addClip(media, track.id, timePosition);
  });

  console.log('[DragDrop] Enabled for track:', track.id);
}

// ========================================
// CLIP RENDERING
// ========================================

export function renderClip(clipData, media) {
  const clip = document.createElement('div');
  clip.className = 'timeline-clip';
  clip.dataset.clipId = clipData.id;
  clip.dataset.mediaId = media.id;
  clip.draggable = false; // Prevent clip from interfering with media drag
  
  if (clipData.id === selectedClipId) {
    clip.classList.add('selected');
  }

  const duration = clipData.duration || 5;
  const left = clipData.start * getPixelsPerSecond();
  const width = duration * getPixelsPerSecond();
  
  const color = TRACK_COLORS[media.mediaType] || '#666';

  clip.style.left = left + 'px';
  clip.style.width = width + 'px';
  clip.style.background = color;
  clip.style.position = 'absolute';
  clip.style.top = '0';

  // Clip content
  const typeIcon = media.mediaType === 'video' ? '🎬' :
                   media.mediaType === 'audio' ? '🔊' : '🖼️';

  clip.innerHTML = `
    <div class="clip-resize-handle clip-resize-left"></div>
    <div class="clip-content">
      <span class="clip-icon">${typeIcon}</span>
      <span class="clip-name">${media.name}</span>
    </div>
    <div class="clip-resize-handle clip-resize-right"></div>
  `;

  wireClipInteractions(clip, clipData);

  return clip;
}

// ========================================
// CLIP MANAGEMENT
// ========================================

export function addClip(media, trackId = "video-1", startTime = null) {
  const track = project.tracks.find(t => t.id === trackId);
  if (!track) {
    console.error('[Timeline] Track not found:', trackId);
    return;
  }

  // Calculate start time if not provided
  if (startTime === null) {
    const clipsOnTrack = project.timeline.filter(c => c.track === trackId);
    if (clipsOnTrack.length === 0) {
      startTime = 0;
    } else {
      const lastClip = clipsOnTrack.reduce((max, clip) => {
        const end = clip.start + (clip.duration || 5);
        return end > max ? end : max;
      }, 0);
      startTime = lastClip;
    }
  }

  const clipData = {
    id: crypto.randomUUID(),
    mediaId: media.id,
    track: trackId,
    start: startTime,
    duration: 5,
    inPoint: 0,
    outPoint: 5,
    effects: []
  };

  project.timeline.push(clipData);
  renderTracks();

  console.log('[Timeline] Clip added:', media.name, '@', startTime.toFixed(2) + 's');
}

export function deleteSelectedClip() {
  if (!selectedClipId) return;

  const clipIndex = project.timeline.findIndex(c => c.id === selectedClipId);
  if (clipIndex !== -1) {
    snapshot();
    project.timeline.splice(clipIndex, 1);
    selectedClipId = null;
    renderTracks();
    
    // Hide inspector
    const inspector = document.getElementById('clip-properties');
    const noSelection = document.getElementById('no-selection');
    if (inspector) inspector.style.display = 'none';
    if (noSelection) noSelection.style.display = 'flex';
    
    console.log('[Timeline] Clip deleted');
  }
}

export function selectClip(clip) {
  selectedClipId = clip.dataset.clipId;
  
  // Update UI
  document.querySelectorAll('.timeline-clip').forEach(c => {
    c.classList.remove('selected');
  });
  clip.classList.add('selected');

  // Show inspector
  const inspector = document.getElementById('clip-properties');
  const noSelection = document.getElementById('no-selection');
  if (inspector) inspector.style.display = 'block';
  if (noSelection) noSelection.style.display = 'none';

  console.log('[Timeline] Clip selected:', selectedClipId);
}

// ========================================
// CLIP SPLITTING
// ========================================

function splitClip(clipData, splitTime) {
  const clipIndex = project.timeline.findIndex(c => c.id === clipData.id);
  if (clipIndex === -1) return;

  const clipEnd = clipData.start + clipData.duration;
  
  if (splitTime <= clipData.start || splitTime >= clipEnd) {
    console.warn('[Timeline] Invalid split time');
    return;
  }

  const firstDuration = splitTime - clipData.start;
  const secondDuration = clipEnd - splitTime;

  clipData.duration = firstDuration;
  clipData.outPoint = clipData.inPoint + firstDuration;

  const secondClip = {
    id: crypto.randomUUID(),
    mediaId: clipData.mediaId,
    track: clipData.track,
    start: splitTime,
    duration: secondDuration,
    inPoint: clipData.outPoint,
    outPoint: clipData.outPoint + secondDuration,
    effects: [...clipData.effects]
  };

  project.timeline.push(secondClip);
  
  console.log('[Timeline] Clip split at', splitTime.toFixed(2) + 's');

  renderTracks();
}

// ========================================
// CLIP INTERACTIONS
// ========================================

function wireClipInteractions(clip, clipData) {
  clip.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('clip-resize-handle')) return;
    
    e.stopPropagation();

    if (activeTool === 'razor') {
      const clipRect = clip.getBoundingClientRect();
      const relativeX = e.clientX - clipRect.left;
      const splitTime = clipData.start + (relativeX / getPixelsPerSecond());
      
      snapshot();
      splitClip(clipData, splitTime);
    } else {
      selectClip(clip);
      
      if (window.previewClipFromTimeline) {
        window.previewClipFromTimeline(clipData.id);
      }
      
      setupClipDrag(clip, clipData, e);
    }
  });

  const leftHandle = clip.querySelector('.clip-resize-left');
  const rightHandle = clip.querySelector('.clip-resize-right');
  
  if (leftHandle) setupResize(leftHandle, true, clip, clipData);
  if (rightHandle) setupResize(rightHandle, false, clip, clipData);
}

function setupClipDrag(clip, clipData, startEvent) {
  const startX = startEvent.clientX;
  const startTime = clipData.start;
  const track = project.tracks.find(t => t.id === clipData.track);
  
  if (track?.locked) return;

  function onMove(ev) {
    const deltaX = ev.clientX - startX;
    const deltaTime = deltaX / getPixelsPerSecond();
    const newStart = Math.max(0, startTime + deltaTime);
    
    clipData.start = newStart;
    clip.style.left = (newStart * getPixelsPerSecond()) + 'px';
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function setupResize(handle, isLeft, clip, clipData) {
  handle.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    
    const startX = e.clientX;
    const startTime = clipData.start;
    const startDuration = clipData.duration;

    function onMove(ev) {
      const deltaX = ev.clientX - startX;
      const deltaTime = deltaX / getPixelsPerSecond();

      if (isLeft) {
        const newStart = Math.max(0, startTime + deltaTime);
        const newDuration = startDuration - (newStart - startTime);
        
        if (newDuration > 0.1) {
          clipData.start = newStart;
          clipData.duration = newDuration;
          clip.style.left = (newStart * getPixelsPerSecond()) + 'px';
          clip.style.width = (newDuration * getPixelsPerSecond()) + 'px';
        }
      } else {
        const newDuration = Math.max(0.1, startDuration + deltaTime);
        clipData.duration = newDuration;
        clip.style.width = (newDuration * getPixelsPerSecond()) + 'px';
      }
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ========================================
// TOOL MANAGEMENT
// ========================================

export function setActiveTool(tool) {
  activeTool = tool;
  
  if (tracksContainer) {
    if (tool === 'razor') {
      tracksContainer.style.cursor = 'crosshair';
    } else {
      tracksContainer.style.cursor = 'default';
    }
  }
  
  console.log('[Timeline] Tool:', tool);
}

// ========================================
// ZOOM
// ========================================

export function getZoom() {
  return zoom;
}

export function setZoom(newZoom) {
  zoom = Math.max(0.2, Math.min(2, newZoom));
  renderTracks();
}

export function getPixelsPerSecond() {
  return PIXELS_PER_SECOND * zoom;
}

export function loadTimeline() {
  renderTracks();
}
