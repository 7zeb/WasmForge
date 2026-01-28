// ========================================
// WASMFORGE - VIDEO EDITOR v6.0.1
// Main Application Entry Point
// ========================================

// WASM Module Handling - Load dynamically
let ffmpegManager = null;
let previewRenderer = null;

// WASM Status Tracking
const wasmStatus = {
  ffmpegAvailable: false,
  ffmpegLoaded: false,
  previewAvailable: false,
  mode: 'basic' // 'basic', 'loading', 'full'
};

// Try to load WASM modules, but don't fail if they're not available
async function loadWasmModules() {
  try {
    const ffmpegModule = await import("./core/wasm/ffmpeg.js");
    const previewModule = await import("./core/wasm/preview.js");
    
    ffmpegManager = ffmpegModule.default;
    previewRenderer = previewModule.default;
    
    wasmStatus.ffmpegAvailable = true;
    wasmStatus.previewAvailable = true;
    
    return true;
  } catch (error) {
    console.warn('[WasmForge] WASM modules not available:', error);
    wasmStatus.ffmpegAvailable = false;
    wasmStatus.previewAvailable = false;
    return false;
  }
}

// Core imports
import { project, snapshot, undo, redo } from "./core/projects.js";
import { initTimeline, addClip, loadTimeline, setZoom, getZoom, deleteSelectedClip, selectClip, renderTracks } from "./core/timeline.js";
import { handleImportedFiles } from "./core/media.js";
import { getIcon, createIcon } from "./core/assets/icons/icons.js";

// ========================================
// DOM ELEMENTS
// ========================================

// File inputs
const fileInput = document.getElementById("file-input");
const loadFileInput = document.getElementById("load-file-input");
const filePickerLabel = document.getElementById("file-picker-label");

// Media panel
const mediaList = document.getElementById("media-list");
const mediaPanel = document.getElementById("media-panel");
const importArea = document.getElementById("import-area");

// Preview section
const previewVideo = document.getElementById("preview-video");
const previewPlaceholder = document.getElementById("preview-placeholder");
const aspectSelect = document.getElementById("aspect-select");

// Project
const projectTitleInput = document.getElementById("project-title-input");

// Timeline
const tracksContainer = document.getElementById("tracks-container");
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

// Toolbar buttons
const btnUndo = document.getElementById("btn-undo");
const btnRedo = document.getElementById("btn-redo");
const btnDelete = document.getElementById("btn-delete");
const btnSnap = document.getElementById("btn-snap");
const toolSelect = document.getElementById("tool-select");
const toolRazor = document.getElementById("tool-razor");

// Menu buttons
const fileButton = document.getElementById("file-button");
const editButton = document.getElementById("edit-button");
const viewButton = document.getElementById("view-button");
const helpButton = document.getElementById("help-button");
const darkModeToggle = document.getElementById("dark-mode-toggle");

// Dropdown menus
const fileMenu = document.getElementById("file-menu");
const editMenu = document.getElementById("edit-menu");
const viewMenu = document.getElementById("view-menu");
const helpMenu = document.getElementById("help-menu");

// Inspector controls
const propScale = document.getElementById("prop-scale");
const propOpacity = document.getElementById("prop-opacity");
const propSpeed = document.getElementById("prop-speed");
const propVolume = document.getElementById("prop-volume");

// Modals
const shortcutsModal = document.getElementById("shortcuts-modal");
const ffmpegLoadingModal = document.getElementById("ffmpeg-loading");

// ========================================
// STATE
// ========================================

let isPlaying = false;
let currentTool = "select";
let snappingEnabled = true;
let activeMenu = null;
let mediaFileCache = new Map(); // Cache for imported media files

// ========================================
// STATUS INDICATOR
// ========================================

// Update the status indicator in the UI
function updateStatusIndicator() {
  let statusElement = document.getElementById('wasm-status');
  
  // Create status indicator if it doesn't exist
  if (!statusElement) {
    statusElement = document.createElement('div');
    statusElement.id = 'wasm-status';
    statusElement.className = 'wasm-status-indicator';
    document.body.appendChild(statusElement);
  }

  let statusHTML = '';
  let statusClass = '';

  if (wasmStatus.mode === 'loading') {
    statusClass = 'status-loading';
    statusHTML = `
      <span class="status-icon">⏳</span>
      <span class="status-text">Loading Video Engine...</span>
    `;
  } else if (wasmStatus.mode === 'full') {
    statusClass = 'status-full';
    statusHTML = `
      <span class="status-icon">✓</span>
      <span class="status-text">Full Mode</span>
      <span class="status-detail">FFmpeg Active</span>
    `;
  } else {
    statusClass = 'status-basic';
    statusHTML = `
      <span class="status-icon">⚠</span>
      <span class="status-text">Basic Mode</span>
      <span class="status-detail">Limited Features</span>
    `;
  }

  statusElement.className = `wasm-status-indicator ${statusClass}`;
  statusElement.innerHTML = statusHTML;
  statusElement.title = "Click for details";
  
  // Add click handler to show details
  statusElement.onclick = showStatusDetails;
}

// Show detailed status information
function showStatusDetails() {
  const features = [];
  
  if (wasmStatus.ffmpegLoaded) {
    features.push('✓ Video Export');
    features.push('✓ Advanced Effects');
    features.push('✓ Video Trimming');
    features.push('✓ Format Conversion');
    features.push('✓ Audio Mixing');
  } else {
    features.push('✗ Video Export (unavailable)');
    features.push('✗ Advanced Effects (unavailable)');
    features.push('✗ Video Trimming (unavailable)');
    features.push('✗ Format Conversion (unavailable)');
    features.push('✗ Audio Mixing (unavailable)');
  }
  
  features.push('');
  features.push('✓ Media Import');
  features.push('✓ Timeline Editing');
  features.push('✓ Preview Playback');
  features.push('✓ Project Save/Load');
  features.push('✓ Drag & Drop');
  features.push('✓ Undo/Redo');
  features.push('✓ Dynamic Tracks');

  const modeText = wasmStatus.mode === 'full' ? 'Full (All Features)' : 
                   wasmStatus.mode === 'loading' ? 'Loading...' : 
                   'Basic (Core Features Only)';

  alert(
    `WasmForge Status - Version 6.0.1\n\n` +
    `Mode: ${modeText}\n` +
    `FFmpeg WASM: ${wasmStatus.ffmpegLoaded ? 'Loaded ✓' : wasmStatus.mode === 'loading' ? 'Loading...' : 'Not Available ✗'}\n\n` +
    `Features:\n${features.join('\n')}\n\n` +
    `${!wasmStatus.ffmpegLoaded && wasmStatus.mode !== 'loading' ? 
      'ℹ️ Some advanced features require FFmpeg WASM.\nTry refreshing the page to load it.' : 
      wasmStatus.mode === 'loading' ? 
      '⏳ Please wait while the video engine loads...' :
      '✓ All features available!'}`
  );
}

// ========================================
// INITIALIZATION
// ========================================

// Initialize icons
function initIcons() {
  document.querySelectorAll('[data-icon]').forEach(element => {
    const iconName = element.dataset.icon;
    const iconHTML = getIcon(iconName);
    
    if (element.tagName === 'BUTTON') {
      const textContent = element.textContent.trim();
      element.innerHTML = iconHTML;
    } else {
      element.innerHTML = iconHTML;
    }
  });
}

// Initialize FFmpeg
async function initFFmpeg() {
  wasmStatus.mode = 'loading';
  updateStatusIndicator();

  if (!ffmpegLoadingModal) {
    console.warn('[WasmForge] FFmpeg loading modal not found');
    wasmStatus.mode = 'basic';
    updateStatusIndicator();
    return false;
  }

  if (!ffmpegManager) {
    console.warn('[WasmForge] FFmpeg manager not loaded');
    if (ffmpegLoadingModal) {
      ffmpegLoadingModal.style.display = 'none';
    }
    wasmStatus.mode = 'basic';
    updateStatusIndicator();
    return false;
  }

  const progressBar = document.getElementById('ffmpeg-progress');
  const progressText = document.getElementById('ffmpeg-progress-text');
  
  ffmpegLoadingModal.classList.add('visible');
  
  ffmpegManager.onProgress((progress) => {
    const percent = Math.round(progress * 100);
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressText) progressText.textContent = percent + '%';
  });
  
  try {
    await ffmpegManager.load();
    console.log('[WasmForge] FFmpeg loaded successfully');
    
    wasmStatus.ffmpegLoaded = true;
    wasmStatus.mode = 'full';
    updateStatusIndicator();
    
    setTimeout(() => {
      ffmpegLoadingModal.classList.remove('visible');
    }, 500);
    
    return true;
  } catch (error) {
    console.error('[WasmForge] FFmpeg load failed:', error);
    ffmpegLoadingModal.classList.remove('visible');
    
    wasmStatus.ffmpegLoaded = false;
    wasmStatus.mode = 'basic';
    updateStatusIndicator();
    
    const shouldContinue = confirm(
      'Failed to load video engine. Basic features will still work.\n\n' +
      'Advanced features like video export will be unavailable.\n\n' +
      'Continue anyway?'
    );
    
    if (!shouldContinue) {
      window.location.href = './index.html';
    }
    
    return false;
  }
}

// Initialize dark mode
function initDarkMode() {
  const savedMode = localStorage.getItem("wasmforge-dark-mode");
  const prefersDark = savedMode === "dark" || (savedMode === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
  applyDarkMode(prefersDark);
}

// Initialize application
async function init() {
  console.log('[WasmForge] Initializing version 6.0.1...');
  
  initIcons();
  initTimeline(tracksContainer);
  initDarkMode();
  
  // Show initial status
  wasmStatus.mode = 'basic';
  updateStatusIndicator();
  
  // Try to load WASM modules asynchronously
  const wasmLoaded = await loadWasmModules();
  
  if (wasmLoaded) {
    console.log('[WasmForge] WASM modules loaded, initializing FFmpeg...');
    // Don't await - let FFmpeg load in background
    initFFmpeg().catch(err => {
      console.warn('[WasmForge] FFmpeg initialization failed:', err);
      wasmStatus.mode = 'basic';
      updateStatusIndicator();
    });
  } else {
    console.log('[WasmForge] Running without WASM support');
    wasmStatus.mode = 'basic';
    updateStatusIndicator();
  }
  
  console.log('[WasmForge] Ready');
}

// ========================================
// TIME FORMATTING
// ========================================

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "00:00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ========================================
// PREVIEW FUNCTIONS
// ========================================

function previewMediaFile(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  previewVideo.classList.add("visible");
  previewPlaceholder.classList.add("hidden");

  previewVideo.onloadedmetadata = () => {
    totalTimeDisplay.textContent = formatTime(previewVideo.duration);
  };
}

// Expose globally for media tiles
window.previewMediaFile = previewMediaFile;

// Update time display
previewVideo.addEventListener("timeupdate", () => {
  currentTimeDisplay.textContent = formatTime(previewVideo.currentTime);
});

previewVideo.addEventListener("ended", () => {
  isPlaying = false;
  updatePlayButton();
});

// Update play button icon
function updatePlayButton() {
  btnPlay.innerHTML = isPlaying ? getIcon('pause') : getIcon('play');
}

// ========================================
// MEDIA MANAGEMENT
// ========================================

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
  
  // Cache the file for later use
  mediaFileCache.set(mediaObj.id, file);

  return mediaObj;
}

// Add clip to timeline
window.addClipToTimeline = (mediaId, trackId = null) => {
  const media = project.media.find(m => m.id === mediaId);
  if (!media) return;

  snapshot();
  const targetTrack = trackId || (media.mediaType === "audio" ? "audio-1" : "video-1");
  addClip(media, targetTrack);
};

// ========================================
// FILE IMPORT
// ========================================

// File picker click
filePickerLabel.addEventListener("click", (e) => {
  e.preventDefault();
  fileInput.click();
});

// File input change
fileInput.addEventListener("change", (event) => {
  if (!event.target.files.length) return;
  handleImportedFiles(event.target.files, mediaList, registerImportedFile);
  fileInput.value = "";
});

// ========================================
// DRAG & DROP - MEDIA IMPORT
// ========================================

// Drag & drop on media panel
mediaPanel.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  mediaPanel.classList.add("dragover");
});

mediaPanel.addEventListener("dragleave", (e) => {
  e.preventDefault();
  e.stopPropagation();
  // Only remove dragover if we're leaving the media panel itself
  if (e.target === mediaPanel) {
    mediaPanel.classList.remove("dragover");
  }
});

mediaPanel.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  mediaPanel.classList.remove("dragover");

  if (e.dataTransfer.files.length > 0) {
    handleImportedFiles(e.dataTransfer.files, mediaList, registerImportedFile);
  }
});

// Also add handlers to the import area to prevent event blocking
if (importArea) {
  importArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    mediaPanel.classList.add("dragover");
  });

  importArea.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    mediaPanel.classList.remove("dragover");
    
    if (e.dataTransfer.files.length > 0) {
      handleImportedFiles(e.dataTransfer.files, mediaList, registerImportedFile);
    }
  });
}

// Also add to file picker label
if (filePickerLabel) {
  filePickerLabel.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.stopPropagation();
    mediaPanel.classList.add("dragover");
  });
  
  filePickerLabel.addEventListener("drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    mediaPanel.classList.remove("dragover");
    
    if (e.dataTransfer.files.length > 0) {
      handleImportedFiles(e.dataTransfer.files, mediaList, registerImportedFile);
    }
  });
}

// ========================================
// ASPECT RATIO
// ========================================

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

// ========================================
// PROJECT TITLE
// ========================================

projectTitleInput.addEventListener("change", (e) => {
  project.title = e.target.value || "Untitled Project";
});

projectTitleInput.addEventListener("blur", (e) => {
  if (!e.target.value.trim()) {
    e.target.value = "Untitled Project";
    project.title = "Untitled Project";
  }
});

// ========================================
// TIMELINE ZOOM
// ========================================

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

// ========================================
// PLAYBACK CONTROLS
// ========================================

function togglePlay() {
  if (!previewVideo.src || previewVideo.src === window.location.href) {
    console.warn('[WasmForge] No media loaded in preview');
    return;
  }

  if (isPlaying) {
    previewVideo.pause();
  } else {
    previewVideo.play().catch(err => {
      console.error('[WasmForge] Play failed:', err);
    });
  }
  isPlaying = !isPlaying;
  updatePlayButton();
}

btnPlay.addEventListener("click", togglePlay);

btnStart.addEventListener("click", () => {
  if (previewVideo.src) {
    previewVideo.currentTime = 0;
  }
});

btnEnd.addEventListener("click", () => {
  if (previewVideo.duration) {
    previewVideo.currentTime = previewVideo.duration;
  }
});

btnPrevFrame.addEventListener("click", () => {
  if (previewVideo.src) {
    previewVideo.currentTime = Math.max(0, previewVideo.currentTime - 1/30);
  }
});

btnNextFrame.addEventListener("click", () => {
  if (previewVideo.duration) {
    previewVideo.currentTime = Math.min(previewVideo.duration, previewVideo.currentTime + 1/30);
  }
});

// ========================================
// TOOLBAR BUTTONS
// ========================================

btnUndo.addEventListener("click", () => {
  undo();
  renderTracks();
});

btnRedo.addEventListener("click", () => {
  redo();
  renderTracks();
});

btnDelete.addEventListener("click", () => {
  snapshot();
  deleteSelectedClip();
});

btnSnap.addEventListener("click", () => {
  snappingEnabled = !snappingEnabled;
  btnSnap.classList.toggle("active", snappingEnabled);
});

// ========================================
// TOOL SELECTION
// ========================================

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

// ========================================
// INSPECTOR CONTROLS
// ========================================

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

// ========================================
// PANEL TABS
// ========================================

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

// ========================================
// DROPDOWN MENUS
// ========================================

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

// ========================================
// MENU ACTIONS - FILE
// ========================================

fileMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  hideAllMenus();
  
  switch (action) {
    case "new":
      createNewProject();
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
      exportProject();
      break;
    case "home":
      if (confirm("Return to home? Unsaved changes will be lost.")) {
        window.location.href = "./index.html";
      }
      break;
  }
});

// ========================================
// MENU ACTIONS - EDIT
// ========================================

editMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  hideAllMenus();
  
  switch (action) {
    case "undo":
      undo();
      renderTracks();
      break;
    case "redo":
      redo();
      renderTracks();
      break;
    case "cut":
      console.log('[WasmForge] Cut not yet implemented');
      break;
    case "copy":
      console.log('[WasmForge] Copy not yet implemented');
      break;
    case "paste":
      console.log('[WasmForge] Paste not yet implemented');
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

// ========================================
// MENU ACTIONS - VIEW
// ========================================

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

// ========================================
// MENU ACTIONS - HELP
// ========================================

helpMenu.addEventListener("click", (e) => {
  const action = e.target.closest("button")?.dataset.action;
  if (!action) return;
  hideAllMenus();
  
  switch (action) {
    case "shortcuts":
      shortcutsModal.classList.add("visible");
      break;
    case "about":
      showAboutDialog();
      break;
    case "github":
      window.open("https://github.com/7zeb/WasmForge", "_blank");
      break;
  }
});

function showAboutDialog() {
  const mode = wasmStatus.mode === 'full' ? 'Full Mode' : 
               wasmStatus.mode === 'loading' ? 'Loading...' :
               'Basic Mode';
  
  alert(
    "WasmForge - Open Source Video Editor\n" +
    "Version 6.0.1\n\n" +
    `Current Mode: ${mode}\n` +
    `FFmpeg: ${wasmStatus.ffmpegLoaded ? 'Active' : 'Not Loaded'}\n\n` +
    "Created by 7Zeb\n" +
    "Powered by FFmpeg.wasm\n\n" +
    "MIT License\n" +
    "© 2026"
  );
}

// ========================================
// MODAL MANAGEMENT
// ========================================

const modalClose = document.querySelector(".modal-close");
if (modalClose) {
  modalClose.addEventListener("click", () => {
    shortcutsModal.classList.remove("visible");
  });
}

shortcutsModal?.addEventListener("click", (e) => {
  if (e.target === shortcutsModal) {
    shortcutsModal.classList.remove("visible");
  }
});

// ========================================
// PROJECT MANAGEMENT
// ========================================

function createNewProject() {
  if (confirm("Create new project? Unsaved changes will be lost.")) {
    project.title = "Untitled Project";
    project.media = [];
    project.timeline = [];
    project.tracks = [];
    project.aspectRatio = "16:9";
    
    projectTitleInput.value = "Untitled Project";
    mediaList.innerHTML = "";
    mediaFileCache.clear();
    
    // Re-initialize timeline
    initTimeline(tracksContainer);
    
    previewVideo.src = "";
    previewVideo.classList.remove("visible");
    previewPlaceholder.classList.remove("hidden");
    
    console.log('[WasmForge] New project created');
  }
}

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
  
  console.log('[WasmForge] Project saved:', project.title);
}

loadFileInput.addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    loadProject(data);
    console.log('[WasmForge] Project loaded:', data.title);
  } catch (err) {
    console.error('[WasmForge] Load failed:', err);
    alert("Failed to load project: " + err.message);
  }
  
  loadFileInput.value = "";
});

function loadProject(data) {
  project.version = data.version ?? project.version;
  project.title = data.title ?? project.title;
  project.media = data.media ?? [];
  project.timeline = data.timeline ?? [];
  project.tracks = data.tracks ?? [];

  if (data.aspectRatio) {
    project.aspectRatio = data.aspectRatio;
    setAspect(project.aspectRatio);
    aspectSelect.value = project.aspectRatio;
  }

  projectTitleInput.value = project.title;
  mediaList.innerHTML = "";
  mediaFileCache.clear();
  
  // Re-render timeline with loaded tracks
  renderTracks();
  
  previewVideo.src = "";
  previewVideo.classList.remove("visible");
  previewPlaceholder.classList.remove("hidden");
  
  console.log('[WasmForge] Project loaded successfully');
}

async function exportProject() {
  if (!ffmpegManager) {
    alert(
      "Video Export Not Available\n\n" +
      "FFmpeg WASM module failed to load.\n" +
      "You're currently in Basic Mode.\n\n" +
      "Try refreshing the page or check your internet connection."
    );
    return;
  }

  if (!ffmpegManager.isLoaded()) {
    alert(
      "Video Engine Not Ready\n\n" +
      "FFmpeg is still loading. Please wait a moment.\n\n" +
      "Check the status indicator in the bottom right corner."
    );
    return;
  }
  
  if (project.timeline.length === 0) {
    alert("Timeline is empty. Add some clips before exporting.");
    return;
  }
  
  alert(
    "Export Feature Coming Soon!\n\n" +
    "This will use FFmpeg.wasm to composite your timeline into a final video.\n\n" +
    "Planned Features:\n" +
    "• Multiple track composition\n" +
    "• Effects and transitions\n" +
    "• Audio mixing\n" +
    "• Custom export settings\n" +
    "• Multiple output formats"
  );
  
  console.log('[WasmForge] Export requested');
}

// ========================================
// DARK MODE
// ========================================

function applyDarkMode(isDark) {
  if (isDark) {
    document.body.classList.remove("light-mode");
    darkModeToggle.querySelector(".icon").innerHTML = getIcon('darkMode');
  } else {
    document.body.classList.add("light-mode");
    darkModeToggle.querySelector(".icon").innerHTML = getIcon('lightMode');
  }
  localStorage.setItem("wasmforge-dark-mode", isDark ? "dark" : "light");
}

darkModeToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("light-mode");
  applyDarkMode(!isDark);
});

// ========================================
// KEYBOARD SHORTCUTS
// ========================================

document.addEventListener("keydown", (e) => {
  // Ignore if typing in input
  if (e.target.tagName === "INPUT" && (e.target.id === "project-title-input" || e.target.classList.contains("track-name-input"))) return;
  
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

  // Delete/Backspace
  if (e.code === "Delete" || e.code === "Backspace") {
    e.preventDefault();
    snapshot();
    deleteSelectedClip();
    return;
  }

  // Ctrl/Cmd shortcuts
  if (e.ctrlKey || e.metaKey) {
    switch (e.key.toLowerCase()) {
      case "z":
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        renderTracks();
        return;
        
      case "y":
        e.preventDefault();
        redo();
        renderTracks();
        return;
        
      case "s":
        e.preventDefault();
        saveProject();
        return;
        
      case "o":
        e.preventDefault();
        loadFileInput.click();
        return;
        
      case "n":
        e.preventDefault();
        createNewProject();
        return;
        
      case "i":
        e.preventDefault();
        fileInput.click();
        return;
        
      case "e":
        e.preventDefault();
        exportProject();
        return;
        
      case "a":
        e.preventDefault();
        document.querySelectorAll(".timeline-clip").forEach(clip => {
          clip.classList.add("selected");
        });
        return;
    }
  }

  // Tool shortcuts
  if (e.key.toLowerCase() === "v") {
    toolSelect.click();
    return;
  }

  if (e.key.toLowerCase() === "c") {
    toolRazor.click();
    return;
  }
});

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('error', (e) => {
  console.error('[WasmForge] Error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[WasmForge] Unhandled rejection:', e.reason);
});

// ========================================
// START APPLICATION
// ========================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

console.log('[WasmForge] Module loaded');
