export const project = {
  version: 7,
  title: "Untitled Project",
  media: [],
  timeline: [],
  tracks: [], // Dynamic tracks
  aspectRatio: "16:9"
};

// --- UNDO / REDO STACKS ---
export const undoStack = [];
export const redoStack = [];

// Save a snapshot BEFORE modifying the project
export function snapshot() {
  undoStack.push(JSON.parse(JSON.stringify(project)));
  redoStack.length = 0; // clear redo history
}

// Undo last action
export function undo() {
  if (undoStack.length === 0) return;

  // Save current state to redo stack
  redoStack.push(JSON.parse(JSON.stringify(project)));

  // Restore previous state
  const prev = undoStack.pop();
  Object.assign(project, prev);
}

// Redo last undone action
export function redo() {
  if (redoStack.length === 0) return;

  // Save current state to undo stack
  undoStack.push(JSON.parse(JSON.stringify(project)));

  // Restore next state
  const next = redoStack.pop();
  Object.assign(project, next);
}


