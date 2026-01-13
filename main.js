// --- GLOBAL UNDO/REDO STACKS ---
const undoStack = []; // for the undo (Ctrl + Z)
const redoStack = []; // for the redo (Ctrl + Y)

// --- MODULE IMPORTS ---
import { handleImportedFiles } from "./core/media.js";

// --- THEME: APPLY SAVED THEME BEFORE ANYTHING ---
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
}

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const mediaPanel = document.getElementById("media-panel");
const timelineContent = document.getElementById("timeline-content");
let projectFileHandle = null;

// --- THEME TOGGLE ---
document.getElementById("dark-mode-toggle").addEventListener("click", () => {
  document.body.classList.toggle("light-mode");

  const isLight = document.body.classList.contains("light-mode");
  localStorage.setItem("theme", isLight ? "light" : "dark");
});

// --- PROJECT STATE ---
const project = {
  version: 1,
  title: "Untitled Project",
  media: [],      // { id, name, type }
  timeline: [],   // later: { id, mediaId, start, end, x, width }
  aspectRatio: "16:9"
};

let mediaFiles = []; // actual File objects, parallel to project.media by name

// --- PREVIEW HELPER (USED BY TILES) ---
function previewMediaFile(file) {
  const url = URL.createObjectURL(file);
  previewVideo.src = url;
  previewVideo.play();
}
window.previewMediaFile = previewMediaFile;

// --- REGISTER IMPORTED FILE INTO PROJECT STATE ---
function registerImportedFile(file) {
  mediaFiles.push(file);

  const mediaObj = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type.startsWith("image") ? "image" : "video"
  };

  project.media.push(mediaObj);
}

// --- UNDO & REDO CORE ---
function executeCommand(cmd) {
  cmd.do();
  undoStack.push(cmd);
  redoStack.length = 0; // clear redo on new action
}

function undo() {
  const cmd = undoStack.pop();
  if (!cmd) return;
  cmd.undo();
  redoStack.push(cmd);
}

function redo() {
  const cmd = redoStack.pop();
  if (!cmd) return;
  cmd.do();
  undoStack.push(cmd);
}

// keyboard shortcuts for the undo/redo commands
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    undo();
  }

  if ((e.ctrlKey && e.key === "y") || (e.ctrlKey && e.shiftKey && e.key === "Z")) {
    e.preventDefault();
    redo();
  }
});

// --- OPEN PROJECT FROM HOMEPAGE ---
const savedProjectText = sessionStorage.getItem("wasmforge-project");
if (savedProjectText) {
  try {
    const data = JSON.parse(savedProjectText);

    project.version = data.version ?? project.version;
    project.title = data.title ?? project.title;
    project.media = Array.isArray(data.media) ? data.media : [];
    project.timeline = Array.isArray(data.timeline) ? data.timeline : [];

    renderTimeline();
    checkMissingMedia();
    applyAspectRatio();
  } catch (err) {
    console.error("Failed to load project from homepage:", err);
  }

  sessionStorage.removeItem("wasmforge-project");
}

// --- TIMELINE CLIP CREATION (NO UNDO HERE) ---
function createTimelineClipElement(media) {
  const clip = document.createElement("div");
  clip.className = "timeline-clip";

  // basic structure: label + delete button
  clip.innerHTML = `
    <span class="clip-label">${media.name}</span>
    <button class="clip-delete">×</button>
  `;

  // temporary position + width
  clip.style.left = "100px";
  clip.style.width = "200px";

  if (!timelineContent) {
    console.warn("timeline-content element not found");
    return null;
  }

  timelineContent.appendChild(clip);
  makeClipDraggable(clip);
  wireClipDeleteWithUndo(clip);

  return clip;
}

// --- TIMELINE: PUBLIC ADD CLIP (WITH UNDO) ---
function addClipToTimeline(media) {
  // Ensure we have some identity to store on the clip
  const clipMedia = {
    name: media.name,
    type: media.type
  };

  executeCommand({
    do() {
      const clip = createTimelineClipElement(clipMedia);
      clipMedia._clipElement = clip;
    },
    undo() {
      if (clipMedia._clipElement && clipMedia._clipElement.parentElement) {
        clipMedia._clipElement.parentElement.removeChild(clipMedia._clipElement);
      }
    }
  });

  return clipMedia._clipElement || null;
}

// expose globally so tiles can call it
window.addClipToTimeline = addClipToTimeline;

// --- CLIP DELETE (WITH UNDO) ---
function wireClipDeleteWithUndo(clip) {
  const deleteBtn = clip.querySelector(".clip-delete");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", (e) => {
    e.stopPropagation();

    const parent = clip.parentElement;
    if (!parent) return;
    const nextSibling = clip.nextSibling;

    executeCommand({
      do() {
        if (clip.parentElement) {
          clip.parentElement.removeChild(clip);
        }
      },
      undo() {
        if (!parent) return;
        if (nextSibling && nextSibling.parentElement === parent) {
          parent.insertBefore(clip, nextSibling);
        } else {
          parent.appendChild(clip);
        }
      }
    });
  });
}

// --- Make a clip draggable horizontally within the timeline ---
function makeClipDraggable(clip) {
  let offsetX = 0;
  let startLeftPx = 0;
  let hasMoved = false;

  clip.style.cursor = "grab";

  clip.addEventListener("mousedown", (e) => {
    // ignore if clicking the delete button
    if (e.target.closest(".clip-delete")) return;

    offsetX = e.clientX - clip.offsetLeft;
    startLeftPx = clip.offsetLeft;
    hasMoved = false;
    clip.style.cursor = "grabbing";

    function onMouseMove(eMove) {
      const newLeft = eMove.clientX - offsetX;
      clip.style.left = `${newLeft}px`;
      hasMoved = true;
    }

    function onMouseUp() {
      clip.style.cursor = "grab";

      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);

      const endLeftPx = clip.offsetLeft;
      if (!hasMoved || endLeftPx === startLeftPx) return;

      const oldLeft = `${startLeftPx}px`;
      const newLeft = `${endLeftPx}px`;

      executeCommand({
        do() {
          clip.style.left = newLeft;
        },
        undo() {
          clip.style.left = oldLeft;
        }
      });
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });
}

// --- TIMELINE DROP SUPPORT (DRAG TILE → TIMELINE) ---
if (timelineContent) {
  timelineContent.addEventListener("dragover", (e) => {
    e.preventDefault(); // allow drop
    timelineContent.classList.add("dragover");
  });

  timelineContent.addEventListener("dragleave", () => {
    timelineContent.classList.remove("dragover");
  });

  timelineContent.addEventListener("drop", (e) => {
    e.preventDefault();
    timelineContent.classList.remove("dragover");

    const name = e.dataTransfer.getData("wasmforge-media-name");
    const type = e.dataTransfer.getData("wasmforge-media-type");

    if (!name) return;

    const mediaObj = { name, type };
    addClipToTimeline(mediaObj);
  });
}

// --- FILE IMPORT (INPUT + DRAG/DROP TO MEDIA PANEL) ---
fileInput.addEventListener("change", (event) => {
  if (!event.target.files || event.target.files.length === 0) return;
  handleImportedFiles(event.target.files, mediaList, registerImportedFile);
});

mediaPanel.addEventListener("dragover", (event) => {
  event.preventDefault();
  mediaPanel.classList.add("dragover");
});

mediaPanel.addEventListener("dragleave", () => {
  mediaPanel.classList.remove("dragover");
});

mediaPanel.addEventListener("drop", (event) => {
  event.preventDefault();
  mediaPanel.classList.remove("dragover");
  if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return;
  handleImportedFiles(event.dataTransfer.files, mediaList, registerImportedFile);
});

// --- ASPECT RATIOS ---
function applyAspectRatio() {
  const previewContainer = document.getElementById("preview-container");
  if (!previewContainer) return;

  const [w, h] = project.aspectRatio.split(":").map(Number);

  const width = previewContainer.clientWidth;
  const height = (width * h) / w;

  previewContainer.style.height = height + "px";
}

document.getElementById("aspect-select").addEventListener("change", (e) => {
  project.aspectRatio = e.target.value;
  applyAspectRatio();
});

// --- TEMP TIMELINE RENDERER ---
function renderTimeline() {
  if (!timelineContent) return;

  timelineContent.innerHTML = "";

  // For now, just render one clip per media item
  project.media.forEach(media => {
    addClipToTimeline(media);
  });
}

// --- SAVE AS ---
async function saveProjectAs() {
  const options = {
    suggestedName: `${project.title}.wasmforge`,
    types: [
      {
        description: "WasmForge Project",
        accept: { "application/json": [".wasmforge"] }
      }
    ]
  };

  projectFileHandle = await window.showSaveFilePicker(options);
  await writeProjectFile(projectFileHandle);
}

// --- SAVE ---
async function saveProject() {
  if (!projectFileHandle) {
    await saveProjectAs();
    return;
  }

  await writeProjectFile(projectFileHandle);
}

// Warn on close if project has content
window.addEventListener("beforeunload", (e) => {
  if (project.timeline.length > 0 || project.media.length > 0) {
    e.preventDefault();
    e.returnValue = ""; // Required for Chrome
  }
});

// --- WRITE PROJECT FILE ---
async function writeProjectFile(handle) {
  const writable = await handle.createWritable();
  const data = JSON.stringify(project, null, 2);
  await writable.write(data);
  await writable.close();
}

// --- LOAD PROJECT ---
async function loadProjectFromDisk() {
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: "WasmForge Project",
        accept: { "application/json": [".wasmforge"] }
      }
    ],
    multiple: false
  });

  projectFileHandle = handle;

  const file = await handle.getFile();
  const text = await file.text();
  const data = JSON.parse(text);

  project.version = data.version ?? project.version;
  project.title = data.title ?? project.title;
  project.media = Array.isArray(data.media) ? data.media : [];
  project.timeline = Array.isArray(data.timeline) ? data.timeline : [];

  renderTimeline();
  checkMissingMedia();
  applyAspectRatio();
}

// --- CHECK MISSING MEDIA ---
function checkMissingMedia() {
  const missing = project.media.filter(m => {
    return !mediaFiles.some(f => f.name === m.name);
  });

  if (missing.length === 0) return;

  alert(
    "Some media files are missing:\n\n" +
    missing.map(m => "- " + m.name).join("\n") +
    "\n\nPlease re-import them."
  );
}

// --- BUTTONS ---
document.getElementById("save-btn").addEventListener("click", saveProject);
document.getElementById("load-btn").addEventListener("click", loadProjectFromDisk);
