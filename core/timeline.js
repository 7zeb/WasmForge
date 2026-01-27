import { project, snapshot } from "./projects.js";

let timelineContent = null;

// Called from main.js to initialize timeline
export function initTimeline(domElement) {
  timelineContent = domElement;
  
  // Enable drop on timeline
  timelineContent.addEventListener("dragover", (e) => {
    e.preventDefault();
    timelineContent.classList.add("dragover");
  });
  
  timelineContent.addEventListener("dragleave", () => {
    timelineContent.classList.remove("dragover");
  });
  
  timelineContent.addEventListener("drop", (e) => {
    e.preventDefault();
    timelineContent.classList.remove("dragover");
    
    const mediaId = e.dataTransfer.getData("wasmforge-media-id");
    if (mediaId && window.addClipToTimeline) {
      window.addClipToTimeline(mediaId);
    }
  });
}

// Create a DOM element for a clip
export function renderClip(clipData, media) {
  const clip = document.createElement("div");
  clip.className = "timeline-clip";

  clip.style.left = clipData.x + "px";
  clip.style.width = clipData.width + "px";

  clip.innerHTML = `
    <span class="clip-label">${media.name}</span>
    <button class="clip-delete">×</button>
  `;

  timelineContent.appendChild(clip);

  wireDelete(clip, clipData);
  wireDrag(clip, clipData);
  wireResize(clip, clipData);

  return clip;
}

// Add a new clip to the timeline
export function addClip(media) {
  // Calculate position based on existing clips
  let maxRight = 0;
  project.timeline.forEach(c => {
    const right = c.x + c.width;
    if (right > maxRight) maxRight = right;
  });

  const clipData = {
    id: crypto.randomUUID(),
    mediaId: media.id,
    x: maxRight + 10, // Add small gap between clips
    width: 200,
    start: 0,
    end: 5
  };

  project.timeline.push(clipData);

  return renderClip(clipData, media);
}

// Load all clips from project.timeline
export function loadTimeline() {
  if (!timelineContent) return;

  timelineContent.innerHTML = "";

  project.timeline.forEach(clipData => {
    const media = project.media.find(m => m.id === clipData.mediaId);
    if (media) renderClip(clipData, media);
  });
}

// Delete clip
function wireDelete(clip, clipData) {
  const btn = clip.querySelector(".clip-delete");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    snapshot(); // Save state before deleting
    clip.remove();
    project.timeline = project.timeline.filter(c => c.id !== clipData.id);
  });
}

// Drag clip
function wireDrag(clip, clipData) {
  let offsetX = 0;
  let isDragging = false;

  clip.addEventListener("mousedown", (e) => {
    if (e.target.closest(".clip-delete") || e.target.closest(".clip-resize-handle")) return;

    isDragging = true;
    offsetX = e.clientX - clip.offsetLeft;
    clip.style.cursor = "grabbing";
    
    snapshot(); // Save state before dragging

    function onMove(ev) {
      if (!isDragging) return;
      const newX = Math.max(0, ev.clientX - offsetX);
      clip.style.left = newX + "px";
      clipData.x = newX;
    }

    function onUp() {
      isDragging = false;
      clip.style.cursor = "grab";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

// Resize clip
function wireResize(clip, clipData) {
  // Add resize handle
  const handle = document.createElement("div");
  handle.className = "clip-resize-handle";
  clip.appendChild(handle);

  let isResizing = false;

  handle.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    isResizing = true;
    
    snapshot(); // Save state before resizing

    const startX = e.clientX;
    const startWidth = clipData.width;

    function onMove(ev) {
      if (!isResizing) return;
      const delta = ev.clientX - startX;
      const newWidth = Math.max(50, startWidth + delta);
      clip.style.width = newWidth + "px";
      clipData.width = newWidth;
    }

    function onUp() {
      isResizing = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}
