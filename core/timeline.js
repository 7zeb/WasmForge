import { project, snapshot } from "./projects.js";

let tracksContainer = null;
let zoom = 1.0;
let selectedClip = null;
const PIXELS_PER_SECOND = 50;

// Called from main.js to initialize timeline
export function initTimeline(domElement) {
  tracksContainer = domElement;
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
  document.getElementById("clip-properties").style.display = "none";
  document.getElementById("no-selection").style.display = "flex";
}

// Select a clip
export function selectClip(clip) {
  // Deselect all
  document.querySelectorAll(".timeline-clip").forEach(c => c.classList.remove("selected"));
  
  if (clip) {
    clip.classList.add("selected");
    selectedClip = clip;

    // Show inspector
    document.getElementById("clip-properties").style.display = "block";
    document.getElementById("no-selection").style.display = "none";
  } else {
    selectedClip = null;
    document.getElementById("clip-properties").style.display = "none";
    document.getElementById("no-selection").style.display = "flex";
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
