const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");
const mediaPanel = document.getElementById("media-panel");

let mediaFiles = []; // store all imported files

// Handle normal file input
fileInput.addEventListener("change", (event) => {
  handleFiles(event.target.files);
});

// Handle drag over
mediaPanel.addEventListener("dragover", (event) => {
  event.preventDefault();
  mediaPanel.classList.add("dragover");
});

// Handle drag leave
mediaPanel.addEventListener("dragleave", () => {
  mediaPanel.classList.remove("dragover");
});

// Handle drop
mediaPanel.addEventListener("drop", (event) => {
  event.preventDefault();
  mediaPanel.classList.remove("dragover");

  const files = event.dataTransfer.files;
  handleFiles(files);
});

// Core function that handles multiple files
function handleFiles(fileList) {
  const newFiles = Array.from(fileList);

  // Add to global list
  mediaFiles.push(...newFiles);

  renderMediaList();
}

// Render media list
function renderMediaList() {
  mediaList.innerHTML = "";

  mediaFiles.forEach((file, index) => {
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

function loadProject(file) {
  const reader = new FileReader();

  reader.onload = () => {
    const data = JSON.parse(reader.result);
    Object.assign(project, data);
    renderMediaList();
    renderTimeline();
  };

  reader.readAsText(file);
}

