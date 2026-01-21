import { project } from "./core/projects.js";
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

  project.media.push(mediaObj);
  return mediaObj;
}

// --- ADD CLIP FROM TILE OR DRAG ---
window.addClipToTimeline = (mediaId) => {
  const media = project.media.find(m => m.id === mediaId);
  if (media) addClip(media);
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

  const videoEl = previewVideo;

  if (mediaRatio > projectRatio) {
    // Media is wider → scale by height
    videoEl.style.height = "100%";
    videoEl.style.width = "auto";
  } else {
    // Media is taller → scale by width
    videoEl.style.width = "100%";
    videoEl.style.height = "auto";
  }

  videoEl.style.transform = "translate(-50%, -50%)";
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
