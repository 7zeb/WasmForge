// --- THEME: APPLY SAVED THEME BEFORE ANYTHING ---
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
}

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const mediaPanel = document.getElementById("media-panel");
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
  timeline: []    // later: { id, mediaId, start, end, x, width }
};

let mediaFiles = []; // actual File objects, parallel to project.media

// --- TIMELINE ---
// Create a clip block in the timeline for a given media item
function addClipToTimeline(media) {
  const clip = document.createElement("div");
  clip.className = "timeline-clip";
  clip.textContent = media.name;

  // temporary position + width
  clip.style.left = "100px";
  clip.style.width = "200px";

  const timelineContent = document.getElementById("timeline-content");
  if (!timelineContent) {
    console.warn("timeline-content element not found");
    return null;
  }

  timelineContent.appendChild(clip);
  makeClipDraggable(clip);

  return clip;
}

// Make a clip draggable horizontally
function makeClipDraggable(clip) {
  let offsetX = 0;

  clip.addEventListener("mousedown", (e) => {
    offsetX = e.clientX - clip.offsetLeft;
    clip.style.cursor = "grabbing";

    function onMouseMove(eMove) {
      clip.style.left = `${eMove.clientX - offsetX}px`;
    }

    function onMouseUp() {
      clip.style.cursor = "grab";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  });
}

// --- FILE IMPORT (INPUT + DRAG/DROP) ---
fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
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
  handleFiles(event.dataTransfer.files);
});

// --- CORE FILE HANDLER ---
function handleFiles(fileList) {
  const newFiles = Array.from(fileList);

  mediaFiles.push(...newFiles);

  newFiles.forEach(file => {
    const mediaObj = {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type.startsWith("image") ? "image" : "video"
    };

    project.media.push(mediaObj);

    // For now: add one clip per imported media item
    addClipToTimeline(mediaObj);
  });

  renderMediaList();
}

// --- RENDER MEDIA LIST ---
function renderMediaList() {
  mediaList.innerHTML = "";

  mediaFiles.forEach((file) => {
    const li = document.createElement("li");
    li.textContent = file.name;

    li.addEventListener("click", () => {
      const url = URL.createObjectURL(file);
      previewVideo.src = url;
      previewVideo.play();
    });

    mediaList.appendChild(li);
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

  // Replace current project state
  project.version = data.version ?? project.version;
  project.title = data.title ?? project.title;
  project.media = Array.isArray(data.media) ? data.media : [];
  project.timeline = Array.isArray(data.timeline) ? data.timeline : [];

  // Re-render UI parts
  renderMediaList();
  renderTimeline();
  checkMissingMedia();
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

// --- TEMP TIMELINE RENDERER ---
function renderTimeline() {
  const timelineContent = document.getElementById("timeline-content");
  if (!timelineContent) return;

  timelineContent.innerHTML = "";

  project.media.forEach(media => {
    addClipToTimeline(media);
  });
}

// --- BUTTONS ---
document.getElementById("save-btn").addEventListener("click", saveProject);
document.getElementById("load-btn").addEventListener("click", loadProjectFromDisk);
