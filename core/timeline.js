import { project } from "/WasmForge/core/projects.js";

let timelineContent = null;

// Called from main.js to initialize timeline
export function initTimeline(domElement) {
  timelineContent = domElement;
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

  return clip;
}

// Add a new clip to the timeline
export function addClip(media) {
  const clipData = {
    id: crypto.randomUUID(),
    mediaId: media.id,
    x: 100,
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

  btn.addEventListener("click", () => {
    clip.remove();
    project.timeline = project.timeline.filter(c => c.id !== clipData.id);
  });
}

// Drag clip
function wireDrag(clip, clipData) {
  let offsetX = 0;

  clip.addEventListener("mousedown", (e) => {
    if (e.target.closest(".clip-delete")) return;

    offsetX = e.clientX - clip.offsetLeft;

    function onMove(ev) {
      const newX = ev.clientX - offsetX;
      clip.style.left = newX + "px";
      clipData.x = newX;
    }

    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

