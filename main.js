import { project, snapshot, undo, redo } from "./core/projects.js";
import { initTimeline, addClip, loadTimeline, setZoom, getPixelsPerSecond } from "./core/timeline.js";
import { handleImportedFiles } from "./core/media.js";

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const previewPlaceholder = document.getElementById("preview-placeholder");
const mediaPanel = document.getElementById("media-panel");
const aspectSelect = document.getElementById("aspect-select");
const projectTitleInput = document.getElementById("project-title-input");

// Menu buttons
const loadFileInput = document.getElementById("load-file-input");
const fileButton = document.getElementById("file-button");
const editButton = document.getElementById("edit-button");
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Timeline elements
const timelineZoom = document.getElementById("timeline-zoom");
const zoomLevel = document.getElementById("zoom-level");
const tracksContainer = document.getElementById("tracks-container");

// Transport controls
const btnPlay = document.getElementById("btn-play");
const currentTimeDisplay = document.getElementById("current-time");
const totalTimeDisplay = document.getElementById("total-time");

// Menus
const fileMenu = document.getElementById("file-menu");
const editMenu = document.getElementById("edit-menu");

// --- STATE ---
let isPlaying = false;
let currentTool = "select";
let activeMenu = null;

// --- INIT TIMELINE ---
initTimeline(tracksContainer);
drawRuler();

// --- TIME FORMATTING ---
function formatTimecode(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const f = Math.floor((seconds % 1) * 30); // assuming 30fps
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}:${f.toString().padStart(2, "0")}`;
}

// --- RULER DRAWING ---
function drawRuler() {
  const canvas = document.getElementById("ruler-canvas");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.parentElement.clientWidth;
  const height = 28;
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + "px";
  canvas.style.height = height + "px";
  ctx.scale(dpr, dpr);
  
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--bg-dark");
  ctx.fillRect(0, 0, width, height);
  
  const pps = getPixelsPerSecond();
  const majorInterval = pps >= 50 ? 1 : pps >= 20 ? 5 : 10;
  const minorInterval = majorInterval / 5;
  
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--border-light");
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text-muted");
  ctx.font = "10px -apple-system, sans-serif";
  
  for (let t = 0; t < 300; t += minorInterval) {
    const x = t * pps;
    const isMajor = t % majorInterval === 0;
    
    ctx.beginPath();
    ctx.moveTo(x, isMajor ? 8 : 18);
    ctx.lineTo(x, height);
    ctx.stroke();
    
    if (isMajor) {
      const minutes = Math.floor(t / 60);
      const seconds = Math.floor(t % 60);
      const label = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      ctx.fillText(label, x + 4, 18);
    }
  }
}

// --- PREVIEW HELPER ---
function previewMediaFile(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  previewPlaceholder.style.display = "none";
  previewVideo.style.display = "block";

  previewVideo.onloadedmetadata = () => {
    totalTimeDisplay.textContent = formatTimecode(previewVideo.duration);
  };
}
window.previewMediaFile = previewMediaFile;

// --- UPDATE TIME DISPLAY ---
previewVideo.addEventListener("timeupdate", () => {
  currentTimeDisplay.textContent = formatTimecode(previewVideo.currentTime);
});

// --- REGISTER IMPORTED FILE ---
function registerImportedFile(file) {
  const mediaObj = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    mediaType: file.type.startsWith("video") ? "video" : 
               file.type.startsWith("audio") ? "audio" : "image"
  };

  snapshot();
  project.media.push(mediaObj);

  return mediaObj;
}

// --- ADD CLIP TO TIMELINE ---
window.addClipToTimeline = (mediaId, trackId = null) => {
  const media = project.media.find(m => m.id === mediaId);
  if (!media) return;

  snapshot();
  
  // Determine which track to add to
  const targetTrack = trackId || (media.mediaType === "audio" ? "audio-1" : "video-1");
  addClip(media, targetTrack);
};

// --- FILE IMPORT ---
fileInput.addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  handleImportedFiles(event.target.files, mediaList, registerImportedFile);
  fileInput.value = "";
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
  snapshot();
  project.aspectRatio = e.target.value;
  setAspect(project.aspectRatio);
});

setAspect(project.aspectRatio);

// --- PROJECT TITLE ---
projectTitleInput.addEventListener("change", (e) => {
  project.title = e.target.value || "Untitled Project";
});

// --- TIMELINE ZOOM ---
timelineZoom.addEventListener("input", (e) => {
  const value = parseInt(e.target.value);
  zoomLevel.textContent = value + "%";
  setZoom(value / 100);
  drawRuler();
});

// --- PLAY/PAUSE ---
btnPlay.addEventListener("click", togglePlay);

function togglePlay() {
  if (isPlaying) {
    previewVideo.pause();
    btnPlay.textContent = "▶";
  } else {
    previewVideo.play();
    btnPlay.textContent = "⏸";
  }
  isPlaying = !isPlaying;
}

previewVideo.addEventListener("ended", () => {
  isPlaying = false;
  btnPlay.textContent = "▶";
});

// --- TRANSPORT CONTROLS ---
document.getElementById("btn-start")?.addEventListener("click", () => {
  previewVideo.currentTime = 0;
});

document.getElementById("btn-end")?.addEventListener("click", () => {
  previewVideo.currentTime = previewVideo.duration || 0;
});

document.getElementById("btn-prev-frame")?.addEventListener("click", () => {
  previewVideo.currentTime = Math.max(0, previewVideo.currentTime - 1/30);
});

document.getElementById("btn-next-frame")?.addEventListener("click", () => {
  previewVideo.currentTime = Math.min(previewVideo.duration || 0, previewVideo.currentTime + 1/30);
});

// --- UNDO/REDO BUTTONS ---
document.getElementById("btn-undo")?.addEventListener("click", () => {
  undo();
  loadTimeline();
});

document.getElementById("btn-redo")?.addEventListener("click", () => {
  redo();
  loadTimeline();
});

// --- TOOL SELECTION ---
document.querySelectorAll(".tool-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTool = btn.id.replace("tool-", "");
  });
});

// --- DROPDOWN MENUS ---
function showMenu(menu, button) {
  hideAllMenus();
  const rect = button.getBoundingClientRect();
  menu.style.top = rect.bottom + 4 + "px";
  menu.style.left = rect.left + "px";
  menu.style.display = "block";
  activeMenu = menu;
}

function hideAllMenus() {
  fileMenu.style.display = "none";
  editMenu.style.display = "none";
  activeMenu = null;
}

fileButton.addEventListener("click", (e) => {
  e.stopPropagation();
  if (activeMenu === fileMenu) {
    hideAllMenus();
  } else {
    showMenu(fileMenu, fileButton);
  }
});

editButton.addEventListener("click", (e) => {
  e.stopPropagation();
  if (activeMenu === editMenu) {
    hideAllMenus();
  } else {
    showMenu(editMenu, editButton);
  }
});

document.addEventListener("click", hideAllMenus);

// Menu actions
fileMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  
  hideAllMenus();
  
  switch (action) {
    case "new":
      if (confirm("Create new project? Unsaved changes will be lost.")) {
        location.reload();
      }
      break;
    case "open":
      loadFileInput.click();
      break;
    case "save":
      saveProject();
      break;
    case "save-as":
      saveProject(true);
      break;
    case "import":
      fileInput.click();
      break;
    case "export":
      alert("Export feature coming soon! FFmpeg integration required.");
      break;
    case "home":
      window.location.href = "./index.html";
      break;
  }
});

editMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  
  hideAllMenus();
  
  switch (action) {
    case "undo":
      undo();
      loadTimeline();
      break;
    case "redo":
      redo();
      loadTimeline();
      break;
    case "delete":
      // Delete selected clip
      break;
  }
});

// --- SAVE PROJECT ---
function saveProject(saveAs = false) {
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
}

// --- LOAD PROJECT ---
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
  
  loadFileInput.value = "";
});

// --- DARK MODE TOGGLE ---
function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.remove("light-mode");
    darkModeToggle.querySelector(".icon").textContent = "🌙";
  } else {
    document.body.classList.add("light-mode");
    darkModeToggle.querySelector(".icon").textContent = "☀️";
  }
  localStorage.setItem("wasmforge-dark-mode", isDark ? "dark" : "light");
  drawRuler();
}

const savedMode = localStorage.getItem("wasmforge-dark-mode");
const prefersDark = savedMode === "dark" || (savedMode === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
applyDarkMode(prefersDark);

darkModeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("light-mode");
  applyDarkMode(!isDark);
});

// --- PANEL TABS ---
document.querySelectorAll(".panel-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    const tabName = tab.dataset.tab;
    const panel = tab.closest("#media-panel, #inspector-panel");
    
    panel.querySelectorAll(".panel-tab").forEach(t => t.classList.remove("active"));
    panel.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    
    tab.classList.add("active");
    document.getElementById(`${tabName}-tab`)?.classList.add("active");
  });
});

// --- KEYBOARD SHORTCUTS ---
document.addEventListener("keydown", (e) => {
  // Prevent shortcuts when typing in input
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  
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
  if (e.ctrlKey && e.shiftKey && e
