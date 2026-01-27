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

// Menu buttons
const saveBtn = document.getElementById("save-btn");
const loadBtn = document.getElementById("load-btn");
const loadFileInput = document.getElementById("load-file-input");
const fileButton = document.getElementById("file-button");
const darkModeToggle = document.getElementById("dark-mode-toggle");

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

// --- SAVE PROJECT ---
saveBtn.addEventListener("click", () => {
  const data = getProjectData();
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title || "project"}.wasmforge`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// --- LOAD PROJECT ---
loadBtn.addEventListener("click", () => {
  loadFileInput.click();
});

loadFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    loadProject(data);
  } catch (err) {
    alert("Failed to load project: " + err.message);
  }
  
  // Reset file input so the same file can be loaded again
  loadFileInput.value = "";
});

// --- FILE BUTTON (Dropdown Menu) ---
let fileMenuOpen = false;
const fileMenu = document.createElement("div");
fileMenu.id = "file-menu";
fileMenu.innerHTML = `
  <button id="menu-new">New Project</button>
  <button id="menu-save">Save Project</button>
  <button id="menu-load">Load Project</button>
  <button id="menu-export">Export Video</button>
`;
fileMenu.style.display = "none";
document.body.appendChild(fileMenu);

fileButton.addEventListener("click", (e) => {
  e.stopPropagation();
  fileMenuOpen = !fileMenuOpen;
  fileMenu.style.display = fileMenuOpen ? "block" : "none";
  
  // Position the menu below the button
  const rect = fileButton.getBoundingClientRect();
  fileMenu.style.top = rect.bottom + "px";
  fileMenu.style.left = rect.left + "px";
});

// Close menu when clicking outside
document.addEventListener("click", () => {
  fileMenuOpen = false;
  fileMenu.style.display = "none";
});

// File menu actions
document.getElementById("menu-new")?.addEventListener("click", () => {
  if (confirm("Create new project? Unsaved changes will be lost.")) {
    location.reload();
  }
});

document.getElementById("menu-save")?.addEventListener("click", () => {
  saveBtn.click();
});

document.getElementById("menu-load")?.addEventListener("click", () => {
  loadBtn.click();
});

document.getElementById("menu-export")?.addEventListener("click", () => {
  alert("Export feature coming soon! FFmpeg integration required.");
});

// --- DARK MODE TOGGLE ---
function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.remove("light-mode");
    darkModeToggle.textContent = "Light Mode";
  } else {
    document.body.classList.add("light-mode");
    darkModeToggle.textContent = "Dark Mode";
  }
  localStorage.setItem("wasmforge-dark-mode", isDark ? "dark" : "light");
}

// Load saved preference
const savedMode = localStorage.getItem("wasmforge-dark-mode");
const prefersDark = savedMode === "dark" || (savedMode === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
applyDarkMode(prefersDark);

darkModeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("light-mode");
  applyDarkMode(!isDark);
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

  // Save (Ctrl+S)
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    saveBtn.click();
    return;
  }

  // Open/Load (Ctrl+O)
  if (e.ctrlKey && e.key === "o") {
    e.preventDefault();
    loadBtn.click();
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

  // Clear the media list UI
  mediaList.innerHTML = "";

  loadTimeline();
}

// --- SAVE PROJECT ---
export function getProjectData() {
  return JSON.stringify(project, null, 2);
}
