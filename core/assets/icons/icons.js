\// ========================================
// WASMFORGE - Icons.js
// Fluent icon system
// ========================================

const icons = {
  // Playback controls
  play: '<svg viewBox="0 0 20 20"><path d="M6 4.5v11l9-5.5L6 4.5z"/></svg>',
  pause: '<svg viewBox="0 0 20 20"><path d="M6 4h3v12H6V4zm5 0h3v12h-3V4z"/></svg>',
  skipBack: '<svg viewBox="0 0 20 20"><path d="M11 5v10l-7-5 7-5zM13 5h2v10h-2V5z"/></svg>',
  skipForward: '<svg viewBox="0 0 20 20"><path d="M9 5v10l7-5-7-5zM5 5h2v10H5V5z"/></svg>',
  previous: '<svg viewBox="0 0 20 20"><path d="M12 4l-8 6 8 6V4z"/></svg>',
  next: '<svg viewBox="0 0 20 20"><path d="M8 4v12l8-6-8-6z"/></svg>',
  
  // Tools
  cursor: '<svg viewBox="0 0 20 20"><path d="M4 3l12 7-5 1-2 5-5-13z"/></svg>',
  scissors: '<svg viewBox="0 0 20 20"><path d="M7 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9l5-5 1 1-5 5-1-1zm0 2l5 5 1-1-5-5-1 1z"/></svg>',
  
  // Actions
  add: '<svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  subtract: '<svg viewBox="0 0 20 20"><path d="M4 10h12" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  delete: '<svg viewBox="0 0 20 20"><path d="M7 4V3h6v1h4v2H3V4h4zm1 4v8h1V8H8zm3 0v8h1V8h-1zM5 6v11h10V6H5z"/></svg>',
  undo: '<svg viewBox="0 0 20 20"><path d="M8 6V3L3 8l5 5v-3h5c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v2h2c3.3 0 6-2.7 6-6s-2.7-6-6-6H8z"/></svg>',
  redo: '<svg viewBox="0 0 20 20"><path d="M12 6V3l5 5-5 5v-3H7c-2.2 0-4 1.8-4 4s1.8 4 4 4h2v2H7c-3.3 0-6-2.7-6-6s2.7-6 6-6h5z"/></svg>',
  
  // Files & Documents
  folderOpen: '<svg viewBox="0 0 20 20"><path d="M2 4v12h16V7h-8L8 4H2zm0-1h6l2 3h8c.6 0 1 .4 1 1v9c0 .6-.4 1-1 1H2c-.6 0-1-.4-1-1V4c0-.6.4-1 1-1z"/></svg>',
  documentAdd: '<svg viewBox="0 0 20 20"><path d="M12 2H4c-.6 0-1 .4-1 1v14c0 .6.4 1 1 1h12c.6 0 1-.4 1-1V6l-5-4zm3 13h-4v4H9v-4H5v-2h4V9h2v4h4v2z"/></svg>',
  save: '<svg viewBox="0 0 20 20"><path d="M15 2H3c-.6 0-1 .4-1 1v14c0 .6.4 1 1 1h14c.6 0 1-.4 1-1V5l-3-3zM6 3h6v3H6V3zm8 14H6v-6h8v6zm1-8H5V4h1v4h8V4h.6l1.4 1.4V9z"/></svg>',
  arrowImport: '<svg viewBox="0 0 20 20"><path d="M10 2v8m0 0l-3-3m3 3l3-3M4 12v5h12v-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  arrowExport: '<svg viewBox="0 0 20 20"><path d="M10 12V4m0 0l-3 3m3-3l3 3M4 12v5h12v-5" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  home: '<svg viewBox="0 0 20 20"><path d="M10 2L2 8v9h5v-5h6v5h5V8l-8-6z"/></svg>',
  
  // Edit
  cut: '<svg viewBox="0 0 20 20"><path d="M7 7c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3-9l5-5 1 1-5 5-1-1zm0 2l5 5 1-1-5-5-1 1z"/></svg>',
  copy: '<svg viewBox="0 0 20 20"><path d="M7 2h10v10h-2V4H7V2zm-2 4h10v10H5V6zm1 1v8h8V7H6z"/></svg>',
  paste: '<svg viewBox="0 0 20 20"><path d="M10 2c-.6 0-1 .4-1 1H6v2h8V3h-3c0-.6-.4-1-1-1zM5 6v11h10V6H5zm1 1h8v9H6V7z"/></svg>',
  checkmark: '<svg viewBox="0 0 20 20"><path d="M7 13L3 9l1-1 3 3 7-7 1 1-8 8z"/></svg>',
  dismiss: '<svg viewBox="0 0 20 20"><path d="M6 6l8 8m0-8l-8 8" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  
  // Media
  video: '<svg viewBox="0 0 20 20"><path d="M2 5v10h12V5H2zm13 2l3-2v10l-3-2V7z"/></svg>',
  
  // UI
  eye: '<svg viewBox="0 0 20 20"><path d="M10 6c-3.3 0-6.2 2-7.4 5 1.2 3 4.1 5 7.4 5s6.2-2 7.4-5c-1.2-3-4.1-5-7.4-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm0-5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>',
  eyeOff: '<svg viewBox="0 0 20 20"><path d="M10 6c3.3 0 6.2 2 7.4 5-.5 1.2-1.3 2.3-2.4 3.1l1.4 1.4c1.4-1.1 2.5-2.6 3.2-4.5-1.2-3-4.1-5-7.4-5-1.1 0-2.2.2-3.2.6l1.5 1.5c.6-.1 1.1-.2 1.7-.2zM2 3l2.3 2.3C3 6.4 1.8 8 1 10c1.2 3 4.1 5 7.4 5 1.3 0 2.6-.3 3.7-.9L15 17l1-1L3 2 2 3zm5.5 5.5l1.2 1.2c0 .1 0 .2 0 .3 0 1.1.9 2 2 2 .1 0 .2 0 .3 0l1.2 1.2c-.5.2-1 .3-1.5.3-1.7 0-3-1.3-3-3 0-.5.1-1 .3-1.5z"/></svg>',
  lock: '<svg viewBox="0 0 20 20"><path d="M10 2c-2.2 0-4 1.8-4 4v2H5c-.6 0-1 .4-1 1v8c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V9c0-.6-.4-1-1-1h-1V6c0-2.2-1.8-4-4-4zm-2 4c0-1.1.9-2 2-2s2 .9 2 2v2H8V6zm2 7c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1z"/></svg>',
  unlock: '<svg viewBox="0 0 20 20"><path d="M10 2c-2.2 0-4 1.8-4 4v2h8V6c0-1.1-.9-2-2-2s-2 .9-2 2v1H8V6c0-2.2 1.8-4 4-4s4 1.8 4 4v2h-1c-.6 0-1 .4-1 1v8c0 .6.4 1 1 1H5c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1h10v8H5V9h8v8zm-2 4c-.6 0-1 .4-1 1s.4 1 1 1

