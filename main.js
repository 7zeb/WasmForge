// /WasmForge/main.js

import { project } from "./core/project.js";
import { initTimeline, addClip, loadTimeline } from "./core/timeline.js";
import { handleImportedFiles } from "./core/media.js";

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const mediaPanel = document.getElementById("media-panel");
const timelineContent = document.getElementById("timeline-content");

// --- INIT TIMELINE ---
initTimeline(timelineContent);

// --- PREVIEW HELPER ---
function previewMediaFile(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  previewVideo.play();
}
window.previewMediaFile = previewMediaFile;

// --- REGISTER IMPORTED FILE ---
function registerImportedFile(file) {
  const mediaObj = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type
  };

  // Attach ID to the file so media.js can use it
  file._id = mediaObj.id;

  project.media.push(mediaObj);
}


// --- ADD CLIP FROM TILE ---
window.addClipToTimeline = (mediaInfo) => {
  const media = project.media.find(m => m.name === mediaInfo.name);
  if (media) addClip(media);
};

// --- FILE IMPORT ---
fileInput.addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  handleImportedFiles(event.target.files, mediaList, registerImportedFile);
});

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

// --- LOAD PROJECT ---
export function loadProject(data) {
  project.version = data.version ?? project.version;
  project.title = data.title ?? project.title;
  project.media = data.media ?? [];
  project.timeline = data.timeline ?? [];
  loadTimeline();
}

// --- SAVE PROJECT ---
export function getProjectData() {
  return JSON.stringify(project, null, 2);
}

