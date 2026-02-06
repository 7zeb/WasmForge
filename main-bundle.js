// ========================================
// WASMFORGE v8.0.0 - Modern Loader
// ========================================

(function() {
  console.log('[WasmForge] Modern loader starting...');
  
  // Wait for DOM, then load main module
  function load() {
    const script = document.createElement('script');
    script.src = './main.js';
    script.type = 'module';
    document.head.appendChild(script);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
