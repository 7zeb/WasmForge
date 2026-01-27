import { project, snapshot, undo, redo } from "./core/projects.js";
import { initTimeline, addClip, loadTimeline, setZoom, getZoom, deleteSelectedClip, selectClip } from "./core/timeline.js";
import { handleImportedFiles } from "./core/media.js";

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const previewPlaceholder = document.getElementById("preview-placeholder");
const mediaPanel = document.getElementById("media-panel");
const aspectSelect = document.getElementById("aspect-select");
const projectTitleInput = document.getElementById("project-title-input");
const loadFileInput = document.getElementById("load-file-input");
const tracksContainer = document.getElementById("tracks-container");
const filePickerLabel = document.getElementById("file-picker-label");

// Menu buttons
const fileButton = document.getElementById("file-button");
const editButton = document.getElementById("edit-button");
const viewButton = document.getElementById("view-button");
const helpButton = document.getElementById("help-button");
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Menus
const fileMenu = document.getElementById("file-menu");
const editMenu = document.getElementById("edit-menu");
const viewMenu = document.getElementById("view-menu");
const helpMenu = document.getElementById("help-menu");

// Timeline controls
const timelineZoom = document.getElementById("timeline-zoom");
const zoomLevel = document.getElementById("zoom-level");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut = document.getElementById("btn-zoom-out");

// Transport controls
const btnPlay = document.getElementById("btn-play");
const btnStart = document.getElementById("btn-start");
const btnEnd = document.getElementById("btn-end");
const btnPrevFrame = document.getElementById("btn-prev-frame");
const btnNextFrame = document.getElementById("btn-next-frame");
const currentTimeDisplay = document.getElementById("current-time");
const totalTimeDisplay = document.getElementById("total-time");

// Toolbar
const btnUndo = document.getElementById("btn-undo");
const btnRedo = document.getElementById("btn-redo");
const btnDelete = document.getElementById("btn-delete");
const btnSnap = document.getElementById("btn-snap");
const toolSelect = document.getElementById("tool-select");
const toolRazor = document.getElementById("tool-razor");

// Inspector
const propScale = document.getElementById("prop-scale");
const propOpacity = document.getElementById("prop-opacity");
const propSpeed = document.getElementById("prop-speed");
const propVolume = document.getElementById("prop-volume");

// Modal
const shortcutsModal = document.getElementById("shortcuts-modal");

// --- STATE ---
let isPlaying = false;
let currentTool = "select";
let snappingEnabled = true;
let activeMenu = null;

// --- INIT ---
initTimeline(tracksContainer);

// --- TIME FORMATTING ---
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// --- PREVIEW FUNCTIONS ---
function previewMediaFile(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  previewVideo.classList.add("visible");
  previewPlaceholder.classList.add("hidden");

  previewVideo.onloadedmetadata = () => {
    totalTimeDisplay.textContent = formatTime(previewVideo.duration);
  };
}
window.previewMediaFile = previewMediaFile;

previewVideo.addEventListener("timeupdate", () => {
  currentTimeDisplay.textContent = formatTime(previewVideo.currentTime);
});

previewVideo.addEventListener("ended", () => {
  isPlaying = false;
  btnPlay.textContent = "▶";
});

// --- REGISTER IMPORTED FILE ---
function registerImportedFile(file) {
  const mediaType = file.type.startsWith("video") ? "video" : 
                    file.type.startsWith("audio") ? "audio" : "image";
  
  const mediaObj = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    mediaType: mediaType
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
  const targetTrack = trackId || (media.mediaType === "audio" ? "audio-1" : "video-1");
  addClip(media, targetTrack);
};

// --- FILE PICKER LABEL CLICK ---
filePickerLabel.addEventListener("click", (e) => {
  e.preventDefault();
  fileInput.click();
});

// --- FILE INPUT ---
fileInput.addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  handleImportedFiles(event.target.files, mediaList, registerImportedFile);
  fileInput.value = "";
});

// --- DRAG & DROP ON MEDIA PANEL ---
mediaPanel.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  mediaPanel.classList.add("dragover");
});

mediaPanel.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (e.target === mediaPanel) {
    mediaPanel.classList.remove("dragover");
  }
});

mediaPanel.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  mediaPanel.classList.remove("dragover");

  // Handle files dropped from OS
  if (e.dataTransfer.files.length > 0) {
    handleImportedFiles(e.dataTransfer.files, mediaList, registerImportedFile);
  }
});

// --- DRAG & DROP ON TRACKS ---
document.querySelectorAll(".track").forEach(track => {
  track.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    track.classList.add("dragover");
  });

  track.addEventListener("dragleave", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === track) {
      track.classList.remove("dragover");
    }
  });

  track.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    track.classList.remove("dragover");

    const mediaId = e.dataTransfer.getData("wasmforge-media-id");
    if (mediaId) {
      const trackId = track.dataset.track;
      window.addClipToTimeline(mediaId, trackId);
    }
  });
});

// --- ASPECT RATIO ---
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
function updateZoom(value) {
  zoomLevel.textContent = value + "%";
  setZoom(value / 100);
  timelineZoom.value = value;
}

timelineZoom.addEventListener("input", (e) => {
  updateZoom(parseInt(e.target.value));
});

btnZoomIn.addEventListener("click", () => {
  const current = parseInt(timelineZoom.value);
  updateZoom(Math.min(200, current + 20));
});

btnZoomOut.addEventListener("click", () => {
  const current = parseInt(timelineZoom.value);
  updateZoom(Math.max(20, current - 20));
});

// --- PLAY/PAUSE ---
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

btnPlay.addEventListener("click", togglePlay);

// --- TRANSPORT CONTROLS ---
btnStart.addEventListener("click", () => {
  previewVideo.currentTime = 0;
});

btnEnd.addEventListener("click", () => {
  if (previewVideo.duration) {
    previewVideo.currentTime = previewVideo.duration;
  }
});

btnPrevFrame.addEventListener("click", () => {
  previewVideo.currentTime = Math.max(0, previewVideo.currentTime - 1/30);
});

btnNextFrame.addEventListener("click", () => {
  if (previewVideo.duration) {
    previewVideo.currentTime = Math.min(previewVideo.duration, previewVideo.currentTime + 1/30);
  }
});

// --- TOOLBAR BUTTONS ---
btnUndo.addEventListener("click", () => {
  undo();
  loadTimeline();
});

btnRedo.addEventListener("click", () => {
  redo();
  loadTimeline();
});

btnDelete.addEventListener("click", () => {
  snapshot();
  deleteSelectedClip();
});

btnSnap.addEventListener("click", () => {
  snappingEnabled = !snappingEnabled;
  btnSnap.classList.toggle("active", snappingEnabled);
});

// --- TOOL SELECTION ---
toolSelect.addEventListener("click", () => {
  currentTool = "select";
  toolSelect.classList.add("active");
  toolRazor.classList.remove("active");
});

toolRazor.addEventListener("click", () => {
  currentTool = "razor";
  toolRazor.classList.add("active");
  toolSelect.classList.remove("active");
});

// --- TRACK BUTTONS ---
document.querySelectorAll(".visibility-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const visible = btn.dataset.visible === "true";
    btn.dataset.visible = !visible;
    btn.textContent = visible ? "👁‍🗨" : "👁";
    btn.classList.toggle("hidden", visible);
  });
});

document.querySelectorAll(".mute-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const muted = btn.dataset.muted === "true";
    btn.dataset.muted = !muted;
    btn.textContent = muted ? "🔊" : "🔇";
    btn.classList.toggle("muted", !muted);
  });
});

// --- INSPECTOR CONTROLS ---
if (propScale) {
  propScale.addEventListener("input", () => {
    document.getElementById("scale-value").textContent = propScale.value + "%";
  });
}

if (propOpacity) {
  propOpacity.addEventListener("input", () => {
    document.getElementById("opacity-value").textContent = propOpacity.value + "%";
  });
}

if (propSpeed) {
  propSpeed.addEventListener("input", () => {
    const speed = (propSpeed.value / 100).toFixed(1);
    document.getElementById("speed-value").textContent = speed + "x";
  });
}

if (propVolume) {
  propVolume.addEventListener("input", () => {
    document.getElementById("volume-value").textContent = propVolume.value + "%";
  });
}

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

// --- DROPDOWN MENUS ---
function showMenu(menu, button) {
  hideAllMenus();
  const rect = button.getBoundingClientRect();
  menu.style.top = rect.bottom + 4 + "px";
  menu.style.left = rect.left + "px";
  menu.classList.add("visible");
  activeMenu = menu;
}

function hideAllMenus() {
  [fileMenu, editMenu, viewMenu, helpMenu].forEach(m => m?.classList.remove("visible"));
  activeMenu = null;
}

fileButton.addEventListener("click", (e) => {
  e.stopPropagation();
  activeMenu === fileMenu ? hideAllMenus() : showMenu(fileMenu, fileButton);
});

editButton.addEventListener("click", (e) => {
  e.stopPropagation();
  activeMenu === editMenu ? hideAllMenus() : showMenu(editMenu, editButton);
});

viewButton.addEventListener("click", (e) => {
  e.stopPropagation();
  activeMenu === viewMenu ? hideAllMenus() : showMenu(viewMenu, viewButton);
});

helpButton.addEventListener("click", (e) => {
  e.stopPropagation();
  activeMenu === helpMenu ? hideAllMenus() : showMenu(helpMenu, helpButton);
});

document.addEventListener("click", hideAllMenus);

// --- MENU ACTIONS ---
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
    case "import":
      fileInput.click();
      break;
    case "export":
      alert("Export feature coming soon! FFmpeg WASM integration required.");
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
      snapshot();
      deleteSelectedClip();
      break;
    case "select-all":
      document.querySelectorAll(".timeline-clip").forEach(clip => {
        clip.classList.add("selected");
      });
      break;
  }
});

viewMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  hideAllMenus();
  
  switch (action) {
    case "zoom-in":
      const currentIn = parseInt(timelineZoom.value);
      updateZoom(Math.min(200, currentIn + 20));
      break;
    case "zoom-out":
      const currentOut = parseInt(timelineZoom.value);
      updateZoom(Math.max(20, currentOut - 20));
      break;
    case "fit-timeline":
      updateZoom(100);
      break;
    case "toggle-snap":
      btnSnap.click();
      break;
  }
});

helpMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  hideAllMenus();
  
  switch (action) {
    case "shortcuts":
      shortcutsModal.classList.add("visible");
      break;
    case "about":
      alert("WasmForge - Open Source Video Editor\nVersion 3.0\nCreated by 7Zeb");
      break;
    case "github":
      window.open("https://github.com/7zeb/WasmForge", "_blank");
      break;
  }
});

// --- MODAL CLOSE ---
const modalClose = document.querySelector(".modal-close");
if (modalClose) {
  modalClose.addEventListener("click", () => {
    shortcutsModal.classList.remove("visible");
  });
}

shortcutsModal.addEventListener("click", (e) => {
  if (e.target === shortcutsModal) {
    shortcutsModal.classList.remove("visible");
  }
});

// --- SAVE/LOAD PROJECT ---
function saveProject() {
  const data = JSON.stringify(project, null, 2);
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

function loadProject(data) {
  project.version = data.version ?? project.version;
  project.title = data.title ?? project.title;
  project.media = data.media ?? [];
  project.timeline = data.timeline ?? [];

  if (data.aspectRatio) {
    project.aspectRatio = data.aspectRatio;
    setAspect(project.aspectRatio);
    aspectSelect.value = project.aspectRatio;
  }

  projectTitleInput.value = project.title;
  mediaList.innerHTML = "";
  loadTimeline();
}

// --- DARK MODE ---
function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.remove("light-mode");
    darkModeToggle.querySelector(".icon").textContent = "🌙";
  } else {
    document.body.classList.add("light-mode");
    darkModeToggle.querySelector(".icon").textContent = "☀️";
  }
  localStorage.setItem("wasmforge-dark-mode", isDark ? "dark" : "light");
}

const savedMode = localStorage.getItem("wasmforge-dark-mode");
const prefersDark = savedMode === "dark" || (savedMode === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
applyDarkMode(prefersDark);

darkModeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("light-mode");
  applyDarkMode(!isDark);
});

// --- KEYBOARD SHORTCUTS ---
document.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" && e.target.id === "project-title-input") return;
  
  // Space - Play/Pause
  if (e.code === "Space") {
    e.preventDefault();
    togglePlay();
    return;
  }

  // Arrow keys - Frame navigation
  if (e.code === "ArrowLeft") {
    e.preventDefault();
    btnPrevFrame.click();
    return;
  }

  if (e.code === "ArrowRight") {
    e.preventDefault();
    btnNextFrame.click();
    return;
  }

  // Home/End
  if (e.code === "Home") {
    e.preventDefault();
    btnStart.click();
    return;
  }

  if (e.code === "End") {
    e.preventDefault();
    btnEnd.click();
    return;
  }

  // Delete
  if (e.code === "Delete" || e.code === "Backspace") {
    e.preventDefault();
    snapshot();
    deleteSelectedClip();
    return;
  }

  // Ctrl shortcuts
  if (e.ctrlKey || e.metaKey) {
    // Undo
    if (e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      loadTimeline();
      return;
    }

    // Redo
    if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
      e.preventDefault();
      redo();
      loadTimeline();
      return;
    }

    // Save
    if (e.key === "s") {
      e.preventDefault();
      saveProject();
      return;
    }

    // Open
    if (e.key === "o") {
      e.preventDefault();
      loadFileInput.click();
      return;
    }

    // Import
    if (e.key === "i") {
      e.preventDefault();
      fileInput.click();
      return;
    }

    // Select All
    if (e.key === "a") {
      e.preventDefault();
      document.querySelectorAll(".timeline-clip").forEach(clip => {
        clip.classList.add("selected");
      });
      return;
    }
  }

  // Tool shortcuts
  if (e.key === "v" || e.key === "V") {
    toolSelect.click();
    return;
  }

  if (e.key === "c" || e.key === "C") {
    toolRazor.click();
    return;
  }
});
