import { project, snapshot } from "./projects.js";

let tracksContainer = null;
let zoom = 1.0;
let selectedClip = null;
const PIXELS_PER_SECOND = 50;

// Track management
let trackCounter = {
  video: 2,
  audio: 2
};

// Called from main.js to initialize timeline
export function initTimeline(domElement) {
  tracksContainer = domElement;
  
  // Initialize default tracks if not in project
  if (!project.tracks || project.tracks.length === 0) {
    project.tracks = [
      { id: 'video-2', name: 'Video 2', type: 'video', visible: true, muted: false, locked: false },
      { id: 'video-1', name: 'Video 1', type: 'video', visible: true, muted: false, locked: false },
      { id: 'audio-1', name: 'Audio 1', type: 'audio', visible: true, muted: false, locked: false },
      { id: 'audio-2', name: 'Audio 2', type: 'audio', visible: true, muted: false, locked: false }
    ];
  }
  
  renderTracks();
}

// Render all tracks
export function renderTracks() {
  if (!tracksContainer) return;
  
  const trackHeaders = document.getElementById('track-headers');
  if (!trackHeaders) return;
  
  // Clear existing tracks
  tracksContainer.innerHTML = '';
  trackHeaders.innerHTML = '';
  
  // Add track controls
  const videoControls = document.createElement('div');
  videoControls.className = 'track-controls-row';
  videoControls.innerHTML = `
    <button class="add-track-btn" data-type="video" title="Add Video Track">
      <span class="btn-icon">+</span> Video Track
    </button>
  `;
  trackHeaders.appendChild(videoControls);
  
  // Render video tracks
  const videoTracks = project.tracks.filter(t => t.type === 'video');
  videoTracks.forEach(track => {
    renderTrackHeader(track, trackHeaders);
    renderTrack(track, tracksContainer);
  });
  
  // Add audio controls
  const audioControls = document.createElement('div');
  audioControls.className = 'track-controls-row';
  audioControls.innerHTML = `
    <button class="add-track-btn" data-type="audio" title="Add Audio Track">
      <span class="btn-icon">+</span> Audio Track
    </button>
  `;
  trackHeaders.appendChild(audioControls);
  
  // Render audio tracks
  const audioTracks = project.tracks.filter(t => t.type === 'audio');
  audioTracks.forEach(track => {
    renderTrackHeader(track, trackHeaders);
    renderTrack(track, tracksContainer);
  });
  
  // Load clips
  loadTimeline();
  
  // Setup add track buttons
  document.querySelectorAll('.add-track-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      addTrack(type);
    });
  });
}

// Render track header
function renderTrackHeader(track, container) {
  const header = document.createElement('div');
  header.className = 'track-header';
  header.dataset.track = track.id;
  
  const icon = track.type === 'video' ? '🎬' : '🔊';
  const controlBtn = track.type === 'video' ? 
    `<button class="track-btn visibility-btn" data-visible="${track.visible}" title="Toggle Visibility">${track.visible ? '👁' : '👁‍🗨'}</button>` :
    `<button class="track-btn mute-btn" data-muted="${track.muted}" title="Mute">${track.muted ? '🔇' : '🔊'}</button>`;
  
  header.innerHTML = `
    <span class="track-icon">${icon}</span>
    <input type="text" class="track-name-input" value="${track.name}" spellcheck="false">
    <div class="track-controls">
      ${controlBtn}
      <button class="track-btn delete-track-btn" title="Delete Track">🗑</button>
    </div>
  `;
  
  container.appendChild(header);
  
  // Setup event listeners
  const nameInput = header.querySelector('.track-name-input');
  nameInput.addEventListener('change', (e) => {
    track.name = e.target.value || `${track.type.charAt(0).toUpperCase() + track.type.slice(1)} Track`;
    snapshot();
  });
  
  nameInput.addEventListener('blur', (e) => {
    if (!e.target.value.trim()) {
      e.target.value = track.name;
    }
  });
  
  const visibilityBtn = header.querySelector('.visibility-btn');
  if (visibilityBtn) {
    visibilityBtn.addEventListener('click', () => {
      track.visible = !track.visible;
      visibilityBtn.dataset.visible = track.visible;
      visibilityBtn.textContent = track.visible ? '👁' : '👁‍🗨';
      snapshot();
    });
  }
  
  const muteBtn = header.querySelector('.mute-btn');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      track.muted = !track.muted;
      muteBtn.dataset.muted = track.muted;
      muteBtn.textContent = track.muted ? '🔇' : '🔊';
      snapshot();
    });
  }
  
  const deleteBtn = header.querySelector('.delete-track-btn');
  deleteBtn.addEventListener('click', () => {
    deleteTrack(track.id);
  });
}

// Render track
function renderTrack(track, container) {
  const trackElement = document.createElement('div');
  trackElement.className = 'track';
  trackElement.dataset.track = track.id;
  trackElement.dataset.type = track.type;
  
  container.appendChild(trackElement);
  
  // Setup drag and drop
  trackElement.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    trackElement.classList.add('dragover');
  });
  
  trackElement.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === trackElement) {
      trackElement.classList.remove('dragover');
    }
  });
  
  trackElement.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    trackElement.classList.remove('dragover');
    
    const mediaId = e.dataTransfer.getData('wasmforge-media-id');
    if (mediaId && window.addClipToTimeline) {
      window.addClipToTimeline(mediaId, track.id);
    }
  });
}

// Add new track
export function addTrack(type) {
  snapshot();
  
  trackCounter[type]++;
  const trackId = `${type}-${trackCounter[type]}`;
  const trackName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${trackCounter[type]}`;
  
  const newTrack = {
    id: trackId,
    name: trackName,
    type: type,
    visible: true,
    muted: false,
    locked: false
  };
  
  // Insert in the right position (videos at top, audio at bottom)
  if (type === 'video') {
    const firstAudioIndex = project.tracks.findIndex(t => t.type === 'audio');
    if (firstAudioIndex !== -1) {
      project.tracks.splice(firstAudioIndex, 0, newTrack);
    } else {
      project.tracks.push(newTrack);
    }
  } else {
    project.tracks.push(newTrack);
  }
  
  renderTracks();
  console.log(`[Timeline] Added track: ${trackName}`);
}

// Delete track
export function deleteTrack(trackId) {
  // Don't allow deleting if it's the last track of its type
  const track = project.tracks.find(t => t.id === trackId);
  if (!track) return;
  
  const tracksOfSameType = project.tracks.filter(t => t.type === track.type);
  if (tracksOfSameType.length <= 1) {
    alert(`Cannot delete the last ${track.type} track.`);
    return;
  }
  
  // Check if track has clips
  const clipsOnTrack = project.timeline.filter(c => c.track === trackId);
  if (clipsOnTrack.length > 0) {
    if (!confirm(`Track "${track.name}" has ${clipsOnTrack.length} clip(s). Delete anyway?`)) {
      return;
    }
    // Remove clips on this track
    project.timeline = project.timeline.filter(c => c.track !== trackId);
  }
  
  snapshot();
  project.tracks = project.tracks.filter(t => t.id !== trackId);
  renderTracks();
  
  console.log(`[Timeline] Deleted track: ${track.name}`);
}

// Get current zoom
export function getZoom() {
  return zoom;
}

// Set zoom level
export function setZoom(newZoom) {
  zoom = Math.max(0.2, Math.min(2, newZoom));
  loadTimeline();
}

// Get pixels per second considering zoom
export function getPixelsPerSecond() {
  return PIXELS_PER_SECOND * zoom;
}

// Find track element
function getTrackElement(trackId) {
  return tracksContainer.querySelector(`.track[data-track="${trackId}"]`);
}

// Create a DOM element for a clip
export function renderClip(clipData, media) {
  const track = getTrackElement(clipData.track);
  if (!track) {
    console.warn(`[Timeline] Track not found: ${clipData.track}`);
    return null;
  }

  const clip = document.createElement("div");
  clip.className = "timeline-clip";
  clip.dataset.clipId = clipData.id;
  clip.dataset.type = media.mediaType;

  const pps = getPixelsPerSecond();
  const width = (clipData.end - clipData.start) * pps;
  const left = clipData.start * pps;

  clip.style.left = left + "px";
  clip.style.width = width + "px";

  const icon = media.mediaType === "video" ? "🎬" : 
               media.mediaType === "audio" ? "🔊" : "🖼️";

  clip.innerHTML = `
    <div class="clip-content">
      <span class="clip-icon">${icon}</span>
      <span class="clip-label">${media.name}</span>
    </div>
    <button class="clip-delete">×</button>
    <div class="clip-resize-handle left"></div>
    <div class="clip-resize-handle right"></div>
  `;

  track.appendChild(clip);

  wireClipInteractions(clip, clipData);

  return clip;
}

// Add a new clip to the timeline
export function addClip(media, trackId = "video-1") {
  // Check if track exists
  const trackExists = project.tracks.find(t => t.id === trackId);
  if (!trackExists) {
    console.warn(`[Timeline] Track ${trackId} doesn't exist, using default`);
    trackId = media.mediaType === 'audio' ? 
      project.tracks.find(t => t.type === 'audio')?.id || 'audio-1' :
      project.tracks.find(t => t.type === 'video')?.id || 'video-1';
  }
  
  // Find the rightmost position on the track
  let maxEnd = 0;
  project.timeline.forEach(c => {
    if (c.track === trackId && c.end > maxEnd) {
      maxEnd = c.end;
    }
  });

  const duration = 5; // Default 5 seconds
  const clipData = {
    id: crypto.randomUUID(),
    mediaId: media.id,
    track: trackId,
    start: maxEnd,
    end: maxEnd + duration
  };

  project.timeline.push(clipData);
  renderClip(clipData, media);
}

// Load all clips from project.timeline
export function loadTimeline() {
  if (!tracksContainer) return;

  // Clear all tracks
  tracksContainer.querySelectorAll(".timeline-clip").forEach(clip => clip.remove());

  // Render all clips
  project.timeline.forEach(clipData => {
    const media = project.media.find(m => m.id === clipData.mediaId);
    if (media) renderClip(clipData, media);
  });
}

// Delete selected clip
export function deleteSelectedClip() {
  if (!selectedClip) return;

  const clipId = selectedClip.dataset.clipId;
  selectedClip.remove();
  project.timeline = project.timeline.filter(c => c.id !== clipId);
  selectedClip = null;

  // Hide inspector
  const clipProperties = document.getElementById("clip-properties");
  const noSelection = document.getElementById("no-selection");
  if (clipProperties) clipProperties.style.display = "none";
  if (noSelection) noSelection.style.display = "flex";
}

// Select a clip
export function selectClip(clip) {
  // Deselect all
  document.querySelectorAll(".timeline-clip").forEach(c => c.classList.remove("selected"));
  
  if (clip) {
    clip.classList.add("selected");
    selectedClip = clip;

    // Show inspector
    const clipProperties = document.getElementById("clip-properties");
    const noSelection = document.getElementById("no-selection");
    if (clipProperties) clipProperties.style.display = "block";
    if (noSelection) noSelection.style.display = "none";
  } else {
    selectedClip = null;
    const clipProperties = document.getElementById("clip-properties");
    const noSelection = document.getElementById("no-selection");
    if (clipProperties) clipProperties.style.display = "none";
    if (noSelection) noSelection.style.display = "flex";
  }
}

// Wire up clip interactions
function wireClipInteractions(clip, clipData) {
  const deleteBtn = clip.querySelector(".clip-delete");
  const leftHandle = clip.querySelector(".clip-resize-handle.left");
  const rightHandle = clip.querySelector(".clip-resize-handle.right");

  // Click to select
  clip.addEventListener("click", (e) => {
    if (e.target === deleteBtn) return;
    selectClip(clip);
  });

  // Delete
  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    snapshot();
    const clipId = clip.dataset.clipId;
    clip.remove();
    project.timeline = project.timeline.filter(c => c.id !== clipId);
    if (selectedClip === clip) {
      selectClip(null);
    }
  });

  // Drag to move
  clip.addEventListener("mousedown", (e) => {
    if (e.target === deleteBtn || e.target.classList.contains("clip-resize-handle")) return;

    snapshot();
    const startX = e.clientX;
    const startLeft = parseFloat(clip.style.left);
    const pps = getPixelsPerSecond();

    function onMove(ev) {
      const deltaX = ev.clientX - startX;
      const newLeft = Math.max(0, startLeft + deltaX);
      clip.style.left = newLeft + "px";
      
      const newStart = newLeft / pps;
      const duration = clipData.end - clipData.start;
      clipData.start = newStart;
      clipData.end = newStart + duration;
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });

  // Resize handles
  function setupResize(handle, isLeft) {
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      snapshot();

      const startX = e.clientX;
      const startWidth = parseFloat(clip.style.width);
      const startLeft = parseFloat(clip.style.left);
      const pps = getPixelsPerSecond();

      function onMove(ev) {
        const deltaX = ev.clientX - startX;
        
        if (isLeft) {
          const newLeft = Math.max(0, startLeft + deltaX);
          const newWidth = Math.max(20, startWidth - deltaX);
          clip.style.left = newLeft + "px";
          clip.style.width = newWidth + "px";
          
          clipData.start = newLeft / pps;
        } else {
          const newWidth = Math.max(20, startWidth + deltaX);
          clip.style.width = newWidth + "px";
          
          clipData.end = clipData.start + (newWidth / pps);
        }
      }

      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      }

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  setupResize(leftHandle, true);
  setupResize(rightHandle, false);
}
