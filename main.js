import { project, snapshot, undo, redo } from "./core/projects.js";
import { initTimeline, addClip, loadTimeline } from "./core/timeline.js";
import { handleImportedFiles } from "./core/media.js";

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const mediaPanel = document.getElementById("media-panel");
const timelineContent = document.getElementById("timeline-content");
const aspectSelect = document.getElementById("aspect-select");
const resizeBtn = document.getElementById("resize-media-btn");

// --- INIT TIMELINE ---
initTimeline(timelineContent);

// --- PREVIEW HELPER ---
function previewMediaFile(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;

  previewVideo.onloadedmetadata = () => {
    previewVideo.play();
  };
}
window.previewMediaFile = previewMediaFile;

// --- REGISTER IMPORTED FILE ---
function registerImportedFile(file) {
  const mediaObj = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type
  };

  snapshot(); // project changes
  project.media.push(mediaObj);

  return mediaObj;
}

// --- ADD CLIP TO TIMELINE ---
window.addClipToTimeline = (mediaId) => {
  const media = project.media.find(m => m.id === mediaId);
  if (!media) return;

  snapshot(); // project changes
  addClip(media);
};

// --- FILE IMPORT ---
fileInput.addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  handleImportedFiles(event.target.files, mediaList, registerImportedFile);
});

// --- DRAG/DROP IMPORT ---
mediaPanel.addEventListener("dragover", (e) => {
  e.preventDefault();
  mediaPanel.classList.add("dragover");
});

mediaPanel.addEventListener("dragleave", () => {
  mediaPanel.classList.remove("dragover");
});

mediaPanel.addEventListener("drop", (event) => {
  event.preventDefault();
  mediaPanel.classList.remove("dragover");

  if (!event.dataTransfer.files.length) return;
  handleImportedFiles(event.dataTransfer.files, mediaList, registerImportedFile);
});

// --- ASPECT RATIO LOGIC ---
function setAspect(ratio) {
  const container = document.getElementById("preview-container");
  if (!container) return;

  const [w, h] = ratio.split(":").map(Number);
  container.style.aspectRatio = `${w} / ${h}`;
}

aspectSelect.addEventListener("change", (e) => {
  snapshot(); // project changes
  project.aspectRatio = e.target.value;
  setAspect(project.aspectRatio);
});

setAspect(project.aspectRatio);

// --- RESIZE MEDIA BUTTON ---
resizeBtn.addEventListener("click", () => {
  if (!previewVideo.videoWidth || !previewVideo.videoHeight) return;

  const [pw, ph] = project.aspectRatio.split(":").map(Number);
  const projectRatio = pw / ph;
  const mediaRatio = previewVideo.videoWidth / previewVideo.videoHeight;

  // Reset styles first
  previewVideo.style.width = "";
  previewVideo.style.height = "";
  previewVideo.style.transform = "translate(-50%, -50%)";

  if (mediaRatio > projectRatio) {
    // Media is wider → fill by height, crop sides
    previewVideo.style.height = "100%";
    previewVideo.style.width = "auto";
  } else {
    // Media is taller → fill by width, crop top/bottom
    previewVideo.style.width = "100%";
    previewVideo.style.height = "auto";
  }
});

// --- KEYBOARD SHORTCUTS ---
document.addEventListener("keydown", (e) => {
  // Undo
  if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
    loadTimeline();
    return;
  }

  // Redo (Ctrl+Y)
  if (e.ctrlKey && e.key === "y") {
    e.preventDefault();
    redo();
    loadTimeline();
    return;
  }

  // Redo (Ctrl+Shift+Z)
  if (e.ctrlKey && e.shiftKey && e.key === "Z") {
    e.preventDefault();
    redo();
    loadTimeline();
    return;
  }
});

// --- LOAD PROJECT ---
export function loadProject(data) {
  project.version = data.version ?? project.version;
  project.title = data.title ?? project.title;
  project.media = data.media ?? [];
  project.timeline = data.timeline ?? [];

  if (data.aspectRatio) {
    project.aspectRatio = data.aspectRatio;
    setAspect(project.aspectRatio);
    aspectSelect.value = project.aspectRatio;
  }

  loadTimeline();
}

// --- SAVE PROJECT ---
export function getProjectData() {
  return JSON.stringify(project, null, 2);
}

