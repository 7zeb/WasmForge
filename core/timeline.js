import { project, snapshot } from "./projects.js";

let tracksContainer = null;
let zoom = 1.0;
let selectedClip = null;
let activeTool = 'select'; // 'select' or 'razor'
const PIXELS_PER_SECOND = 50;

// Calculate the highest track number for each type
function getMaxTrackNumber(type) {
  const tracksOfType = project.tracks.filter(t => t.type === type);
  if (tracksOfType.length === 0) return 0;
  
  const numbers = tracksOfType.map(t => {
    const match = t.id.match(/-(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  });
  
  return Math.max(...numbers);
}

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

// Set active tool
export function setActiveTool(tool) {
  activeTool = tool;
  
  // Update cursor for all clips
  if (tracksContainer) {
    const clips = tracksContainer.querySelectorAll('.timeline-clip');
    clips.forEach(clip => {
      if (tool === 'razor') {
        clip.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'white\' stroke=\'black\' stroke-width=\'1\' d=\'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z\'/%3E%3C/svg%3E") 12 12, auto';
      } else {
        clip.style.cursor = 'grab';
      }
    });
  }
  
  console.log('[Timeline] Active tool:', tool);
}

// Get active tool
export function getActiveTool() {
  return activeTool;
}

// Split clip at position
function splitClip(clip, clickX) {
  const clipId = clip.dataset.clipId;
  const clipData = project.timeline.find(c => c.id === clipId);
  
  if (!clipData) return;
  
  // Calculate the split position
  const clipRect = clip.getBoundingClientRect();
  const clickOffset = clickX - clipRect.left;
  const pps = getPixelsPerSecond();
  const splitTime = clipData.start + (clickOffset / pps);
  
  // Don't split if too close to edges (minimum 0.5 seconds on each side)
  const minDuration = 0.5;
  if (splitTime - clipData.start < minDuration || clipData.end - splitTime < minDuration) {
    console.log('[Timeline] Clip too small to split at this position');
    return;
  }
  
  snapshot();
  
  // Create the second clip
  const newClipData = {
    id: crypto.randomUUID(),
    mediaId: clipData.mediaId,
    track: clipData.track,
    start: splitTime,
    end: clipData.end
  };
  
  // Update the original clip
  clipData.end = splitTime;
  
  // Add the new clip to the timeline
  project.timeline.push(newClipData);
  
  console.log('[Timeline] Split clip:', {
    original: `${clipData.start.toFixed(2)}s - ${clipData.end.toFixed(2)}s`,
    new: `${newClipData.start.toFixed(2)}s - ${newClipData.end.toFixed(2)}s`
  });
  
  // Re-render the timeline
  loadTimeline();
}

// Add new track
export function addTrack(type) {
  snapshot();
  
  // Get the next available track number
  const maxNumber = getMaxTrackNumber(type);
  const trackNumber = maxNumber + 1;
  const trackId = `${type}-${trackNumber}`;
  const trackName = `${type.charAt(0).toUpperCase() + type.slice(1)} ${trackNumber}`;
  
  const newTrack = {
    id: trackId,
    name: trackName,
    type: type,
    visible: true,
    muted: false,
    locked: false
  };
  
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
}

// Render all tracks
export function renderTracks() {
  if (!tracksContainer) return;
  
  const trackHeaders = document.getElementById('track-headers');
  if (!trackHeaders) return;
  
  // Clear existing tracks
  tracksContainer.innerHTML = '';
  trackHeaders.innerHTML = '';
  
  // Separate video and audio tracks
  const videoTracks = project.tracks.filter(t => t.type === 'video');
  const audioTracks = project.tracks.filter(t => t.type === 'audio');
  
  // === VIDEO SECTION ===
  trackHeaders.insertAdjacentHTML('beforeend', `
    <div class="track-controls-row">
      <button class="add-track-btn add-video-track">
        <span class="btn-icon">+</span> Video Track
      </button>
    </div>
  `);
  
  // Render video tracks
  videoTracks.forEach(track => {
    renderTrackHeader(track, trackHeaders);
    renderTrack(track, tracksContainer);
  });
  
  // === AUDIO SECTION ===
  trackHeaders.insertAdjacentHTML('beforeend', `
    <div class="track-controls-row">
      <button class="add-track-btn add-audio-track">
        <span class="btn-icon">+</span> Audio Track
      </button>
    </div>
  `);
  
  // Render audio tracks
  audioTracks.forEach(track => {
    renderTrackHeader(track, trackHeaders);
    renderTrack(track, tracksContainer);
  });
  
  // Attach event listeners AFTER all HTML is added
  const videoBtn = trackHeaders.querySelector('.add-video-track');
  const audioBtn = trackHeaders.querySelector('.add-audio-track');
  
  if (videoBtn) {
    videoBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTrack('video');
    }, true);
  }
  
  if (audioBtn) {
    audioBtn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTrack('audio');
    }, true);
    
    audioBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTrack('audio');
    }, true);
    
    audioBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      addTrack('audio');
    }, true);
  }
  
  // Load clips
  loadTimeline();
}

// Render track header
function renderTrackHeader(track, container) {
  const header = document.createElement('div');
  header.className = 'track-header';
  header.dataset.track = track.id;
  header.style.position = 'relative';
  header.style.zIndex = '10';
  
  const icon = track.type === 'video' ? '🎬' : '🔊';
  
  const iconSpan = document.createElement('span');
  iconSpan.className = 'track-icon';
  iconSpan.textContent = icon;
  
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'track-name-input';
  nameInput.value = track.name;
  nameInput.spellcheck = false;
  
  const controls = document.createElement('div');
  controls.className = 'track-controls';
  
  const controlBtn = document.createElement('button');
  controlBtn.className = 'track-btn';
  
  if (track.type === 'video') {
    controlBtn.classList.add('visibility-btn');
    controlBtn.dataset.visible = track.visible;
    controlBtn.textContent = track.visible ? '👁' : '👁‍🗨';
    controlBtn.title = 'Toggle Visibility';
  } else {
    controlBtn.classList.add('mute-btn');
    controlBtn.dataset.muted = track.muted;
    controlBtn.textContent = track.muted ? '🔇' : '🔊';
    controlBtn.title = 'Mute';
  }
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'track-btn delete-track-btn';
  deleteBtn.textContent = '🗑';
  deleteBtn.title = 'Delete Track';
  
  header.appendChild(iconSpan);
  header.appendChild(nameInput);
  controls.appendChild(controlBtn);
  controls.appendChild(deleteBtn);
  header.appendChild(controls);
  
  container.appendChild(header);
  
  nameInput.addEventListener('change', (e) => {
    track.name = e.target.value || `${track.type.charAt(0).toUpperCase() + track.type.slice(1)} Track`;
    snapshot();
  });
  
  nameInput.addEventListener('blur', (e) => {
    if (!e.target.value.trim()) {
      e.target.value = track.name;
    }
  });
  
  if (track.type === 'video') {
    controlBtn.addEventListener('click', () => {
      track.visible = !track.visible;
      controlBtn.dataset.visible = track.visible;
      controlBtn.textContent = track.visible ? '👁' : '👁‍🗨';
      snapshot();
    });
  } else {
    controlBtn.addEventListener('click', () => {
      track.muted = !track.muted;
      controlBtn.dataset.muted = track.muted;
      controlBtn.textContent = track.muted ? '🔇' : '🔊';
      snapshot();
    });
  }
  
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

// Delete track
export function deleteTrack(trackId) {
  const track = project.tracks.find(t => t.id === trackId);
  if (!track) return;
  
  const tracksOfSameType = project.tracks.filter(t => t.type === track.type);
  if (tracksOfSameType.length <= 1) {
    alert(`Cannot delete the last ${track.type} track.`);
    return;
  }
  
  const clipsOnTrack = project.timeline.filter(c => c.track === trackId);
  if (clipsOnTrack.length > 0) {
    if (!confirm(`Track "${track.name}" has ${clipsOnTrack.length} clip(s). Delete anyway?`)) {
      return;
    }
    project.timeline = project.timeline.filter(c => c.track !== trackId);
  }
  
  snapshot();
  project.tracks = project.tracks.filter(t => t.id !== trackId);
  renderTracks();
}

export function getZoom() {
  return zoom;
}

export function setZoom(newZoom) {
  zoom = Math.max(0.2, Math.min(2, newZoom));
  loadTimeline();
}

export function getPixelsPerSecond() {
  return PIXELS_PER_SECOND * zoom;
}

function getTrackElement(trackId) {
  return tracksContainer.querySelector(`.track[data-track="${trackId}"]`);
}

export function renderClip(clipData, media) {
  const track = getTrackElement(clipData.track);
  if (!track) return null;

  const clip = document.createElement("div");
  clip.className = "timeline-clip";
  clip.dataset.clipId = clipData.id;
  clip.dataset.type = media.mediaType;

  const pps = getPixelsPerSecond();
  const width = (clipData.end - clipData.start) * pps;
  const left = clipData.start * pps;

  clip.style.left = left + "px";
  clip.style.width = width + "px";
  
  // Set cursor based on active tool
  if (activeTool === 'razor') {
    clip.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'%3E%3Cpath fill=\'white\' stroke=\'black\' stroke-width=\'1\' d=\'M9.64 7.64c.23-.5.36-1.05.36-1.64 0-2.21-1.79-4-4-4S2 3.79 2 6s1.79 4 4 4c.59 0 1.14-.13 1.64-.36L10 12l-2.36 2.36C7.14 14.13 6.59 14 6 14c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4c0-.59-.13-1.14-.36-1.64L12 14l7 7h3v-1L9.64 7.64zM6 8c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm0 12c-1.1 0-2-.89-2-2s.9-2 2-2 2 .89 2 2-.9 2-2 2zm6-7.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5.5.22.5.5-.22.5-.5.5zM19 3l-6 6 2 2 7-7V3z\'/%3E%3C/svg%3E") 12 12, auto';
  } else {
    clip.style.cursor = 'grab';
  }

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

export function addClip(media, trackId = "video-1") {
  const trackExists = project.tracks.find(t => t.id === trackId);
  if (!trackExists) {
    trackId = media.mediaType === 'audio' ? 
      project.tracks.find(t => t.type === 'audio')?.id || 'audio-1' :
      project.tracks.find(t => t.type === 'video')?.id || 'video-1';
  }
  
  let maxEnd = 0;
  project.timeline.forEach(c => {
    if (c.track === trackId && c.end > maxEnd) {
      maxEnd = c.end;
    }
  });

  const duration = 5;
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

export function loadTimeline() {
  if (!tracksContainer) return;
  tracksContainer.querySelectorAll(".timeline-clip").forEach(clip => clip.remove());
  project.timeline.forEach(clipData => {
    const media = project.media.find(m => m.id === clipData.mediaId);
    if (media) renderClip(clipData, media);
  });
}

export function deleteSelectedClip() {
  if (!selectedClip) return;
  const clipId = selectedClip.dataset.clipId;
  selectedClip.remove();
  project.timeline = project.timeline.filter(c => c.id !== clipId);
  selectedClip = null;
  const clipProperties = document.getElementById("clip-properties");
  const noSelection = document.getElementById("no-selection");
  if (clipProperties) clipProperties.style.display = "none";
  if (noSelection) noSelection.style.display = "flex";
}

export function selectClip(clip) {
  document.querySelectorAll(".timeline-clip").forEach(c => c.classList.remove("selected"));
  
  if (clip) {
    clip.classList.add("selected");
    selectedClip = clip;
    
    // Show inspector panel
    const clipProperties = document.getElementById("clip-properties");
    const noSelection = document.getElementById("no-selection");
    if (clipProperties) clipProperties.style.display = "block";
    if (noSelection) noSelection.style.display = "none";
    
    // Preview the media in the preview section
    const clipId = clip.dataset.clipId;
    const clipData = project.timeline.find(c => c.id === clipId);
    
    if (clipData) {
      const media = project.media.find(m => m.id === clipData.mediaId);
      
      if (media && media.file) {
        if (window.previewMediaFile && typeof window.previewMediaFile === 'function') {
          console.log('[Timeline] Previewing clip:', media.name);
          window.previewMediaFile(media.file);
        }
      }
    }
  } else {
    selectedClip = null;
    const clipProperties = document.getElementById("clip-properties");
    const noSelection = document.getElementById("no-selection");
    if (clipProperties) clipProperties.style.display = "none";
    if (noSelection) noSelection.style.display = "flex";
  }
}

function wireClipInteractions(clip, clipData) {
  const deleteBtn = clip.querySelector(".clip-delete");
  const leftHandle = clip.querySelector(".clip-resize-handle.left");
  const rightHandle = clip.querySelector(".clip-resize-handle.right");

  clip.addEventListener("click", (e) => {
    if (e.target === deleteBtn) return;
    
    // Handle based on active tool
    if (activeTool === 'razor') {
      splitClip(clip, e.clientX);
    } else {
      selectClip(clip);
    }
  });

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

  // Only allow dragging with select tool
  clip.addEventListener("mousedown", (e) => {
    if (e.target === deleteBtn || e.target.classList.contains("clip-resize-handle")) return;
    if (activeTool === 'razor') return; // Don't drag with razor tool
    
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

  function setupResize(handle, isLeft) {
    handle.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      if (activeTool === 'razor') return; // Don't resize with razor tool
      
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
