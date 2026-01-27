// ========================================
// WASMFORGE - Timeline.js
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

// Called from main.js to initialize timeline
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

  // Setup drag and drop
  setupDragAndDrop();

  // Initial render
  renderTracks();

  console.log('[Timeline] Initialized');
}

// ========================================
// DRAG AND DROP SETUP
// ========================================

function setupDragAndDrop() {
  if (!tracksContainer) return;

  // Prevent default drag behavior on the entire timeline
  tracksContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });

  tracksContainer.addEventListener('dragenter', (e) => {
    e.preventDefault();
  });

  tracksContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    handleDrop(e);
  });

  console.log('[Timeline] Drag and drop enabled');
}

function handleDrop(e) {
  const mediaId = e.dataTransfer.getData('wasmforge-media-id');
  if (!mediaId) {
    console.warn('[Timeline] No media ID in drop data');
    return;
  }

  const media = project.media.find(m => m.id === mediaId);
  if (!media) {
    console.warn('[Timeline] Media not found:', mediaId);
    return;
  }

  // Find which track was dropped on
  const trackElement = e.target.closest('.track');
  let trackId = trackElement?.dataset.track;

  // If not dropped on a track, use default track based on media type
  if (!trackId) {
    trackId = media.mediaType === 'audio' ? 'audio-1' : 'video-1';
  }

  // Verify the track exists
  const track = project.tracks.find(t => t.id === trackId);
  if (!track) {
    console.warn('[Timeline] Track not found:', trackId);
    return;
  }

  // Calculate drop position in seconds
  const trackRect = trackElement?.getBoundingClientRect() || tracksContainer.getBoundingClientRect();
  const relativeX = e.clientX - trackRect.left;
  const timePosition = Math.max(0, relativeX / getPixelsPerSecond());

  console.log('[Timeline] Drop detected:', {
    mediaId,
    trackId,
    position: timePosition
  });

  // Add the clip
  snapshot();
  addClip(media, trackId, timePosition);
}

// ========================================
// TRACK MANAGEMENT
// ========================================

// Add new track
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

// Delete track
export function deleteTrack(trackId) {
  const trackIndex = project.tracks.findIndex(t => t.id === trackId);
  if (trackIndex === -1) return;

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
  if (!tracksContainer) return;

  tracksContainer.innerHTML = '';

  // Render track headers container
  const headersContainer = document.createElement('div');
  headersContainer.className = 'track-headers';
  tracksContainer.appendChild(headersContainer);

  // Render tracks container
  const tracksArea = document.createElement('div');
  tracksArea.className = 'tracks-area';
  tracksContainer.appendChild(tracksArea);

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
}

// Render track header
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

// Render track
function renderTrack(track, container) {
  const trackElement = document.createElement('div');
  trackElement.className = 'track';
  trackElement.dataset.track = track.id;
  
  if (!track.visible) {
    trackElement.classList.add('track-hidden');
  }

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
}

// ========================================
// CLIP RENDERING
// ========================================

export function renderClip(clipData, media) {
  const clip = document.createElement('div');
  clip.className = 'timeline-clip';
  clip.dataset.clipId = clipData.id;
  clip.dataset.mediaId = media.id;
  
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
  // Find the track
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
    duration: 5, // Default duration
    inPoint: 0,
    outPoint: 5,
    effects: []
  };

  project.timeline.push(clipData);
  renderTracks();

  console.log('[Timeline] Clip added:', clipData.id);
}

export function deleteSelectedClip() {
  if (!selectedClipId) return;

  const clipIndex = project.timeline.findIndex(c => c.id === selectedClipId);
  if (clipIndex !== -1) {
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
  
  // Validate split time
  if (splitTime <= clipData.start || splitTime >= clipEnd) {
    console.warn('[Timeline] Invalid split time');
    return;
  }

  // Calculate durations for both parts
  const firstDuration = splitTime - clipData.start;
  const secondDuration = clipEnd - splitTime;

  // Update first clip
  clipData.duration = firstDuration;
  clipData.outPoint = clipData.inPoint + firstDuration;

  // Create second clip
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
  
  console.log('[Timeline] Clip split:', {
    original: clipData.id,
    new: secondClip.id,
    splitTime
  });

  renderTracks();
}

// ========================================
// CLIP INTERACTIONS
// ========================================

function wireClipInteractions(clip, clipData) {
  // Click handler - select or split
  clip.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('clip-resize-handle')) return;
    
    e.stopPropagation();

    if (activeTool === 'razor') {
      // Split the clip at click position
      const clipRect = clip.getBoundingClientRect();
      const relativeX = e.clientX - clipRect.left;
      const splitTime = clipData.start + (relativeX / getPixelsPerSecond());
      
      snapshot();
      splitClip(clipData, splitTime);
    } else {
      // Select the clip
      selectClip(clip);
      
      // Preview the clip
      if (window.previewClipFromTimeline) {
        window.previewClipFromTimeline(clipData.id);
      }
      
      // Setup dragging
      setupClipDrag(clip, clipData, e);
    }
  });

  // Setup resize handles
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
  
  // Update cursor
  if (tracksContainer) {
    if (tool === 'razor') {
      tracksContainer.style.cursor = 'crosshair';
    } else {
      tracksContainer.style.cursor = 'default';
    }
  }
  
  console.log('[Timeline] Active tool:', tool);
}

// ========================================
// ZOOM MANAGEMENT
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

// ========================================
// TIMELINE LOADING
// ========================================

export function loadTimeline() {
  renderTracks();
}
