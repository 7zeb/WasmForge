// ========================================
// WASMFORGE v8.0.0 - Modern ES6 Module Loader
// ========================================

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Main app entry point
async function initApp() {
  console.log('[WasmForge] Starting app in modern mode...');

  // Load all modules
  try {
    const [projectsModule, timelineModule, mediaModule, iconsModule, ffmpegModule, previewModule, mainModule] =
      await Promise.all([
        import('./core/projects.js'),
        import('./core/timeline.js'),
        import('./core/media.js'),
        import('./core/assets/icons/icons.js'),
        import('./core/wasm/ffmpeg.js'),
        import('./core/wasm/preview.js'),
        import('./main.js'),
      ]);

    console.log('[WasmForge] All modules loaded in modern mode');
  } catch (error) {
    console.error('[WasmForge] Failed to load modules:', error);

    // Show a user-friendly error in case of failure
    document.body.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #1a1a2e;
        color: white;
        font-family: system-ui, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <div>
          <h1>⚠️ Modern Loader Error</h1>
          <p>WasmForge failed to load.</p>
          <p style="color: #ff6b6b; margin: 20px 0;">${error.message}</p>
          <button onclick="location.reload()" style="
            margin-top: 20px;
            padding: 12px 24px;
            background: #3b82f6;
            border: none;
            border-radius: 6px;
            color: white;
            cursor: pointer;
            font-size: 16px;
          ">
            Retry
          </button>
        </div>
      </div>
    `;
  }
}
