// ========================================
// WASMFORGE v8.0.0 - ChromeOS Loader
// ========================================

(function loadForChromeOS() {
  console.log('[WasmForge] Starting ChromeOS-compatible loader...');

  function startLoading() {
    // Simply load main.js as a module and let it handle all imports
    const mainScript = document.createElement('script');
    mainScript.src = './main.js';
    mainScript.type = 'module';
    
    mainScript.onload = () => {
      console.log('[WasmForge] Main module loaded successfully');
    };
    
    mainScript.onerror = (error) => {
      console.error('[WasmForge] Failed to load main module:', error);
      
      // Show user-friendly error
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
            <h1>⚠️ Loading Error</h1>
            <p>WasmForge failed to load on this device.</p>
            <p style="color: #ff6b6b; margin: 20px 0;">Please check your internet connection and try again.</p>
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
    };
    
    document.head.appendChild(mainScript);
  }

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startLoading);
  } else {
    startLoading();
  }
})();
