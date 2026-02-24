// export.js - Video export using MediaRecorder and canvas capture

class VideoExporter {
    constructor(app) {
        this.app = app;
        this.isExporting = false;
        this.progress = 0;
    }

    async exportVideo(options = {}) {
        if (this.isExporting) return;
        this.isExporting = true;

        const format = options.format || 'webm';
        const qualityMap = { high: 8000000, medium: 4000000, low: 2000000 };
        const bitrate = qualityMap[options.quality] || 4000000;
        const includeAudio = options.includeAudio !== false;
        const fps = parseInt(document.getElementById('fpsSelect').value) || 30;

        const canvas = this.app.renderer.canvas;
        const duration = this.app.timeline.getTotalDuration() - 5; // remove padding

        const progressBar = document.getElementById('exportProgress');
        const progressFill = document.getElementById('exportProgressFill');
        const progressText = document.getElementById('exportProgressText');
        const startBtn = document.getElementById('startExportBtn');
        
        progressBar.style.display = 'block';
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';

        try {
            // Determine MIME type
            let mimeType = 'video/webm;codecs=vp8';
            if (format === 'mp4') {
                if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
                    mimeType = 'video/mp4;codecs=h264';
                } else if (MediaRecorder.isTypeSupported('video/webm;codecs=h264')) {
                    mimeType = 'video/webm;codecs=h264';
                }
            }

            if (includeAudio && MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
                mimeType = 'video/webm;codecs=vp8,opus';
            }

            // Create audio context for mixing if needed
            let audioDestination = null;
            let audioContext = null;
            let audioSources = [];

            if (includeAudio) {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                audioDestination = audioContext.createMediaStreamDestination();
            }

            // Canvas stream
            const canvasStream = canvas.captureStream(fps);
            let combinedStream;

            if (includeAudio && audioDestination) {
                const tracks = [...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()];
                combinedStream = new MediaStream(tracks);
            } else {
                combinedStream = canvasStream;
            }

            const recorder = new MediaRecorder(combinedStream, {
                mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
                videoBitsPerSecond: bitrate,
            });

            const chunks = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            const exportPromise = new Promise((resolve, reject) => {
                recorder.onstop = () => resolve(chunks);
                recorder.onerror = (e) => reject(e);
            });

            recorder.start(100); // Collect data every 100ms

            // Render frames
            const totalFrames = Math.ceil(duration * fps);
            const wasPlaying = this.app.isPlaying;
            if (wasPlaying) this.app.pause();

            // Setup audio sources for export
            if (includeAudio && audioContext) {
                this.setupAudioForExport(audioContext, audioDestination);
            }

            for (let frame = 0; frame <= totalFrames; frame++) {
                const time = frame / fps;
                this.app.currentTime = time;
                this.app.renderer.renderFrame(time, this.app.timeline.tracks, this.app.mediaAssets);

                // Update audio positions
                if (includeAudio) {
                    this.updateAudioForExport(time);
                }

                // Update progress
                const pct = Math.round((frame / totalFrames) * 100);
                progressFill.style.width = pct + '%';
                progressText.textContent = pct + '%';

                // Allow UI to update
                await new Promise(r => setTimeout(r, 1000 / fps));
            }

            recorder.stop();

            // Cleanup audio
            if (audioContext) {
                audioSources.forEach(s => { try { s.disconnect(); } catch(e) {} });
                audioContext.close();
            }

            const result = await exportPromise;
            const blob = new Blob(result, { type: recorder.mimeType });

            // Download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `clipforge_export.${format === 'mp4' ? 'mp4' : 'webm'}`;
            a.click();
            URL.revokeObjectURL(url);

            progressText.textContent = 'Done!';
            progressFill.style.width = '100%';

        } catch (err) {
            console.error('Export error:', err);
            alert('Export failed: ' + err.message);
        } finally {
            this.isExporting = false;
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fas fa-download"></i> Start Export';
            setTimeout(() => {
                progressBar.style.display = 'none';
                progressFill.style.width = '0';
            }, 2000);
        }
    }

    setupAudioForExport(audioContext, destination) {
        // Connect audio/video elements to audio context
        this.app.timeline.tracks.forEach(track => {
            if (track.muted) return;
            track.clips.forEach(clip => {
                if (clip.type === 'audio' || clip.type === 'video') {
                    const asset = this.app.mediaAssets[clip.assetId];
                    if (asset && asset.element && asset.element.captureStream) {
                        try {
                            const source = audioContext.createMediaElementSource(asset.element);
                            const gain = audioContext.createGain();
                            gain.gain.value = clip.volume || 1;
                            source.connect(gain);
                            gain.connect(destination);
                        } catch (e) {
                            // Already connected or can't connect
                        }
                    }
                }
            });
        });
    }

    updateAudioForExport(time) {
        this.app.timeline.tracks.forEach(track => {
            if (track.muted) return;
            track.clips.forEach(clip => {
                if (clip.type === 'audio' || clip.type === 'video') {
                    const asset = this.app.mediaAssets[clip.assetId];
                    if (!asset || !asset.element) return;

                    const clipEnd = clip.startTime + clip.duration;
                    if (time >= clip.startTime && time < clipEnd) {
                        const mediaTime = (time - clip.startTime) + (clip.trimStart || 0);
                        asset.element.currentTime = mediaTime;
                        if (asset.element.paused) {
                            asset.element.play().catch(() => {});
                        }
                    } else {
                        if (!asset.element.paused) {
                            asset.element.pause();
                        }
                    }
                }
            });
        });
    }
}