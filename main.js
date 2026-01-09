// --- THEME: APPLY SAVED THEME BEFORE ANYTHING ---
if (localStorage.getItem("theme") === "light") {
  document.body.classList.add("light-mode");
}

// --- DOM ELEMENTS ---
const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const mediaPanel = document.getElementById("media-panel");

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
  timeline: []    // { mediaId, start, end }
};

let mediaFiles = []; // store actual File objects

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
    project.media.push({
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type.startsWith("image") ? "image" : "video"
    });
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

// --- SAVE PROJECT ---
function saveProject() {
  const data = JSON.stringify(project, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title}.wasmforge`;
  a.click();

  URL.revokeObjectURL(url);
}

// --- LOAD PROJECT ---
function loadProject(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const data = JSON.parse(reader.result);
    Object.assign(project, data);
    renderMediaList();
  };

  reader.readAsText(file);
}

// --- TEMP TIMELINE ---
function renderTimeline() {}

// --- SAVE / LOAD BUTTONS ---
document.getElementById("save-btn").addEventListener("click", saveProject);

document.getElementById("load-btn").addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".wasmforge";

  input.onchange = (e) => {
    const file = e.target.files[0];
    if (file) loadProject(file);
  };

  input.click();
});
