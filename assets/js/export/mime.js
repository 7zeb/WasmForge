export function pickWebMMime() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];

  if (!window.MediaRecorder) return { mimeType: '', reason: 'MediaRecorder not available' };

  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType, reason: '' };
  }
  return { mimeType: 'video/webm', reason: 'Falling back to video/webm' };
}
