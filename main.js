const fileInput = document.getElementById("file-input");
const mediaList = document.getElementById("media-list");
const previewVideo = document.getElementById("preview-video");

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files);

  mediaList.innerHTML = "";

  files.forEach(file => {
    const li = document.createElement("li");
    li.textContent = file.name;

    li.addEventListener("click", () => {
      const url = URL.createObjectURL(file);
      previewVideo.src = url;
      previewVideo.play();
    });

    mediaList.appendChild(li);
  });
});
