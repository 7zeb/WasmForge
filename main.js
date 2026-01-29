// ========================================
// WASMFORGE - VIDEO EDITOR v8.0.0
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
import { initTimeline, addClip, loadTimeline, setZoom, getZoom, deleteSelectedClip, selectClip, renderTracks, updatePlayheadPosition } from "./core/timeline.js";
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
const resizeMediaBtn = document.getElementById("resize-media-btn");

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
    features.push('✓ Video Resize');
    features.push('✓ Advanced Effects');
    features.push('✓ Video Trimming');
    features.push('✓ Format Conversion');
    features.push('✓ Audio Mixing');
  } else {
    features.push('✗ Video Export (unavailable)');
    features.push('✗ Video Resize (CSS preview only)');
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
  features.push('✓ Synced Playhead');

  const modeText = wasmStatus.mode === 'full' ? 'Full (All Features)' : 
                   wasmStatus.mode === 'loading' ? 'Loading...' : 
                   'Basic (Core Features Only)';

  alert(
    `WasmForge Status - Version 8.0.0\n\n` +
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
  console.log('[WasmForge] Initializing version 8.0.0...');
  
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

// Preview clip from timeline
function previewClipFromTimeline(clipId) {
  const clip = project.timeline.find(c => c.id === clipId);
  if (!clip) {
    console.warn('[Preview] Clip not found:', clipId);
    return;
  }

  const media = project.media.find(m => m.id === clip.mediaId);
  if (!media) {
    console.warn('[Preview] Media not found for clip:', clipId);
    return;
  }

  const file = mediaFileCache.get(media.id);
  if (!file) {
    console.warn('[Preview] File not found in cache for media:', media.id);
    return;
  }

  // Preview the file
  previewMediaFile(file);
  
  // Set the video to the clip's start position
  previewVideo.onloadedmetadata = () => {
    previewVideo.currentTime = clip.start || 0;
    totalTimeDisplay.textContent = formatTime(previewVideo.duration);
    updatePlayheadPosition(previewVideo.currentTime);
  };
  
  console.log('[Preview] Showing clip:', media.name, 'at', clip.start + 's');
}

// Expose globally for media tiles and timeline clips
window.previewMediaFile = previewMediaFile;
window.previewClipFromTimeline = previewClipFromTimeline;

// Update time display and playhead position
previewVideo.addEventListener("timeupdate", () => {
  currentTimeDisplay.textContent = formatTime(previewVideo.currentTime);
  
  // Update playhead position on timeline
  updatePlayheadPosition(previewVideo.currentTime);
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
  
  // Auto-load first video clip into preview if preview is empty
  if (media.mediaType === 'video' && (!previewVideo.src || previewVideo.src === window.location.href)) {
    const file = mediaFileCache.get(media.id);
    if (file) {
      console.log('[WasmForge] Auto-loading clip into preview:', media.name);
      previewMediaFile(file);
    }
  }
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
  
  // Reset video transform when aspect ratio changes
  if (previewVideo) {
    previewVideo.style.transform = '';
    previewVideo.style.objectFit = 'contain';
  }
});

setAspect(project.aspectRatio);

// ========================================
// VIDEO RESIZE FEATURE
// ========================================

// Resize video to match aspect ratio
async function resizeVideoToAspect() {
  // Check if video is loaded
  if (!previewVideo.src || previewVideo.src === window.location.href) {
    alert("No video loaded in preview.\n\nPlease import and preview a video first.");
    return;
  }

  // Check if video metadata is loaded
  if (!previewVideo.videoWidth || !previewVideo.videoHeight) {
    alert("Video not ready. Please wait for the video to load.");
    return;
  }

  const selectedRatio = aspectSelect.value;
  const [targetW, targetH] = selectedRatio.split(":").map(Number);
  const targetRatio = targetW / targetH;

  const currentW = previewVideo.videoWidth;
  const currentH = previewVideo.videoHeight;
  const currentRatio = currentW / currentH;

  console.log('[Resize] Current video:', currentW, 'x', currentH, '(ratio:', currentRatio.toFixed(2) + ')');
  console.log('[Resize] Target aspect:', selectedRatio, '(ratio:', targetRatio.toFixed(2) + ')');

  // Check if already correct ratio
  if (Math.abs(currentRatio - targetRatio) < 0.01) {
    alert(`Video is already ${selectedRatio}!\n\nNo resize needed.`);
    return;
  }

  // Show options
  const useFFmpeg = wasmStatus.ffmpegLoaded && confirm(
    `Resize Video to ${selectedRatio}?\n\n` +
    `Current: ${currentW}x${currentH} (${currentRatio.toFixed(2)}:1)\n` +
    `Target: ${selectedRatio}\n\n` +
    `Click OK to re-encode with FFmpeg (slow but permanent)\n` +
    `Click Cancel for CSS preview only (fast)`
  );

  if (useFFmpeg) {
    await resizeWithFFmpeg(currentW, currentH, targetW, targetH, selectedRatio);
  } else {
    resizeWithCSS(currentRatio, targetRatio, selectedRatio);
  }
}

// CSS-based resize (fast, preview only)
function resizeWithCSS(currentRatio, targetRatio, selectedRatio) {
  // Reset any previous transforms
  previewVideo.style.transform = '';
  previewVideo.style.transformOrigin = '';
  previewVideo.style.objectFit = 'cover';
  
  // Calculate scale to fill container while maintaining aspect
  let videoScale = 1;
  let resizeType = '';
  
  if (currentRatio > targetRatio) {
    // Video wider - scale up to fill height, crop sides
    videoScale = currentRatio / targetRatio;
    resizeType = 'sides';
  } else {
    // Video taller - scale up to fill width, crop top/bottom
    videoScale = targetRatio / currentRatio;
    resizeType = 'top/bottom';
  }

  previewVideo.style.transform = `scale(${videoScale})`;
  previewVideo.style.transformOrigin = 'center center';
  
  alert(
    `✓ Preview Resized!\n\n` +
    `Target: ${selectedRatio}\n` +
    `Crop: ${resizeType}\n` +
    `Scale: ${videoScale.toFixed(2)}x\n\n` +
    `This is a CSS preview.\n` +
    `Use FFmpeg resize for permanent change.`
  );

  console.log('[Resize] CSS applied - scale:', videoScale, 'crop:', resizeType);
}

// FFmpeg-based resize (slow, permanent)
async function resizeWithFFmpeg(currentW, currentH, targetW, targetH, selectedRatio) {
  if (!ffmpegManager || !ffmpegManager.isLoaded()) {
    alert("FFmpeg not loaded. Using CSS preview instead.");
    const currentRatio = currentW / currentH;
    const targetRatio = targetW / targetH;
    resizeWithCSS(currentRatio, targetRatio, selectedRatio);
    return;
  }

  // Calculate output dimensions
  const currentRatio = currentW / currentH;
  const targetRatio = targetW / targetH;
  
  let outputW, outputH, cropX, cropY;
  
  if (currentRatio > targetRatio) {
    // Crop sides
    outputH = currentH;
    outputW = Math.round(currentH * targetRatio);
    cropX = Math.round((currentW - outputW) / 2);
    cropY = 0;
  } else {
    // Crop top/bottom
    outputW = currentW;
    outputH = Math.round(currentW / targetRatio);
    cropX = 0;
    cropY = Math.round((currentH - outputH) / 2);
  }

  // Update modal text
  if (ffmpegLoadingModal) {
    ffmpegLoadingModal.querySelector('h3').textContent = 'Resizing Video...';
    ffmpegLoadingModal.querySelector('p').textContent = `Cropping to ${outputW}x${outputH}`;
    ffmpegLoadingModal.classList.add('visible');
  }

  try {
    // Get the current video file
    const videoBlob = await fetch(previewVideo.src).then(r => r.blob());
    
    const inputFileName = 'input.mp4';
    const outputFileName = 'output.mp4';

    await ffmpegManager.ffmpeg.writeFile(inputFileName, await ffmpegManager.fetchFileData(videoBlob));

    // Execute FFmpeg crop command
    await ffmpegManager.ffmpeg.exec([
      '-i', inputFileName,
      '-vf', `crop=${outputW}:${outputH}:${cropX}:${cropY}`,
      '-c:a', 'copy',
      outputFileName
    ]);

    const data = await ffmpegManager.ffmpeg.readFile(outputFileName);
    const outputBlob = new Blob([data.buffer], { type: 'video/mp4' });
    
    // Clean up
    await ffmpegManager.ffmpeg.deleteFile(inputFileName);
    await ffmpegManager.ffmpeg.deleteFile(outputFileName);

    // Load the resized video into preview
      // Revoke any previous object URL to prevent memory leaks
      if (previewVideo && typeof previewVideo.src === 'string' && previewVideo.src.startsWith('blob:')) {
        URL.revokeObjectURL(previewVideo.src);
      }
    
    const url = URL.createObjectURL(outputBlob);
    previewVideo.src = url;
    // Reset any inline transforms or object-fit styles from previous CSS resizing
    if (previewVideo && previewVideo.style) {
      previewVideo.style.transform = '';
      previewVideo.style.objectFit = '';
    }
    
    if (ffmpegLoadingModal) {
      ffmpegLoadingModal.classList.remove('visible');
    }

    alert(
      `✓ Video Resized Successfully!\n\n` +
      `New dimensions: ${outputW}x${outputH}\n` +
      `Aspect ratio: ${selectedRatio}\n\n` +
      `The resized video is now in the preview.`
    );

    console.log('[Resize] FFmpeg complete - output:', outputW, 'x', outputH);

  } catch (error) {
    console.error('[Resize] FFmpeg failed:', error);
    
    if (ffmpegLoadingModal) {
      ffmpegLoadingModal.classList.remove('visible');
    }
    
    alert(
      `Resize failed!\n\n` +
      `Error: ${error.message}\n\n` +
      `Falling back to CSS preview.`
    );
    
    // Fallback to CSS
    const currentRatio = currentW / currentH;
    const targetRatio = targetW / targetH;
    resizeWithCSS(currentRatio, targetRatio, selectedRatio);
  }
}

// Add click handler
if (resizeMediaBtn) {
  resizeMediaBtn.addEventListener("click", resizeVideoToAspect);
}

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
  // Check if preview has media loaded
  if (!previewVideo.src || previewVideo.src === window.location.href) {
    // If no media in preview, try to load first clip from timeline
    if (project.timeline.length > 0) {
      const firstClip = project.timeline[0];
      const media = project.media.find(m => m.id === firstClip.mediaId);
      
      if (media && mediaFileCache.has(media.id)) {
        const file = mediaFileCache.get(media.id);
        console.log('[WasmForge] Auto-loading first timeline clip:', media.name);
        previewMediaFile(file);
        
        // Set video to clip's start position after it loads
        previewVideo.onloadedmetadata = () => {
          previewVideo.currentTime = firstClip.start || 0;
          totalTimeDisplay.textContent = formatTime(previewVideo.duration);
          updatePlayheadPosition(previewVideo.currentTime);
          
          // Now play the video
          previewVideo.play().catch(err => {
            console.error('[WasmForge] Play failed:', err);
          });
          isPlaying = true;
          updatePlayButton();
        };
        
        return; // Exit early, let onloadedmetadata handle play
      } else {
        console.warn('[WasmForge] No media file cached for first clip');
        return;
      }
    } else {
      console.warn('[WasmForge] No media in preview and no clips on timeline');
      return;
    }
  }

  // Normal play/pause toggle
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
    updatePlayheadPosition(0);
  }
});

btnEnd.addEventListener("click", () => {
  if (previewVideo.duration) {
    previewVideo.currentTime = previewVideo.duration;
    updatePlayheadPosition(previewVideo.duration);
  }
});

btnPrevFrame.addEventListener("click", () => {
  if (previewVideo.src) {
    const newTime = Math.max(0, previewVideo.currentTime - 1/30);
    previewVideo.currentTime = newTime;
    updatePlayheadPosition(newTime);
  }
});

btnNextFrame.addEventListener("click", () => {
  if (previewVideo.duration) {
    const newTime = Math.min(previewVideo.duration, previewVideo.currentTime + 1/30);
    previewVideo.currentTime = newTime;
    updatePlayheadPosition(newTime);
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
    "Version 8.0.0\n\n" +
    `Current Mode: ${mode}\n` +
    `FFmpeg: ${wasmStatus.ffmpegLoaded ? 'Active' : 'Not Loaded'}\n\n` +
    "Created by 7zeb\n" +
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
    
    // Reset playhead
    updatePlayheadPosition(0);
    
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
  
  // Reset playhead
  updatePlayheadPosition(0);
  
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

  // Tool shortcuts (V and C)
  if (e.key.toLowerCase() === "v" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    toolSelect.click();
    return;
  }

  if (e.key.toLowerCase() === "c" && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    toolRazor.click();
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

console.log('[WasmForge] Module loaded (v8.0.0)');




