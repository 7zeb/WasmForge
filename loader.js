// ========================================
// WASMFORGE v8.0.0 - Legacy Script Tag Loader
// ChromeOS-Compatible (ES Module Support)
// ========================================

(function loadScriptsSequentially() {
  console.log('[WasmForge] Starting legacy loader for ChromeOS...');

  const scripts = [
    './core/projects.js',
    './core/timeline.js',
    './core/media.js',
    './core/assets/icons/icons.js',
    './core/wasm/ffmpeg.js',
    './core/wasm/preview.js',
    './main.js',
  ];

  let loadedCount = 0;

  function loadScript(src, callback) {
    const script = document.createElement('script');
    script.src = src;
    script.type = 'module'; // ✅ Changed to 'module' to support ES6 export/import
    script.onload = () => {
      loadedCount++;
      console.log(`[WasmForge] Loaded ${loadedCount}/${scripts.length}: ${src}`);
      callback();
    };
    script.onerror = (error) => {
      console.error(`[WasmForge] Failed to load script: ${src}`, error);
      alert(`Error loading script: ${src}. Please reload the page.`);
    };
    document.head.appendChild(script);
  }

  function loadNext(index) {
    if (index >= scripts.length) {
      console.log('[WasmForge] All scripts loaded successfully');
      return;
    }

    loadScript(scripts[index], () => loadNext(index + 1));
  }

  function startLoading() {
    loadNext(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoading);
  } else {
    startLoading();
  }
})();
