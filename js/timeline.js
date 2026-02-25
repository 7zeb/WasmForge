// timeline.js - Timeline management, clips, tracks, drag & drop

class TimelineManager {
    constructor(app) {
        this.app = app;
        this.tracks = [];
        this.selectedClip = null;
        this.zoom = 100; // pixels per second
        this.scrollLeft = 0;
        this.isDragging = false;
        this.isResizing = false;
        this.dragData = null;
        this.snapEnabled = true;
        this.clipIdCounter = 0;

        this.container = document.getElementById('timelineContainer');
        this.scrollEl = document.getElementById('timelineScroll');
        this.tracksEl = document.getElementById('timelineTracks');
        this.labelsEl = document.getElementById('timelineLabels');
        this.rulerEl = document.getElementById('timelineRuler');
        this.playheadEl = document.getElementById('playhead');

        this.initDefaultTracks();
        this.bindEvents();
        this.render();
    }

    initDefaultTracks() {
        this.tracks = [
            { id: 0, name: 'Video 1', type: 'video', clips: [], muted: false, hidden: false },
            { id: 1, name: 'Video 2', type: 'video', clips: [], muted: false, hidden: false },
            { id: 2, name: 'Text', type: 'text', clips: [], muted: false, hidden: false },
            { id: 3, name: 'Audio 1', type: 'audio', clips: [], muted: false, hidden: false },
        ];
    }

    addTrack(name, type) {
        const id = this.tracks.length;
        this.tracks.push({
            id,
            name: name || `Track ${id + 1}`,
            type: type || 'video',
            clips: [],
            muted: false,
            hidden: false
        });
        this.render();
    }

    removeTrack(trackIndex) {
        if (this.tracks.length <= 1) return;
        this.tracks.splice(trackIndex, 1);
        this.tracks.forEach((t, i) => t.id = i);
        this.render();
    }

    addClip(trackIndex, clipData) {
        const clip = {
            id: this.clipIdCounter++,
            ...clipData,
            effects: clipData.effects || [],
            opacity: clipData.opacity !== undefined ? clipData.opacity : 1,
            volume: clipData.volume !== undefined ? clipData.volume : 1,
            transition: clipData.transition || null,
            transitionDuration: clipData.transitionDuration || 0.5,
        };

        if (trackIndex >= 0 && trackIndex < this.tracks.length) {
            this.tracks[trackIndex].clips.push(clip);
            this.tracks[trackIndex].clips.sort((a, b) => a.startTime - b.startTime);
        }

        this.render();
        return clip;
    }

    removeClip(clipId) {
        for (const track of this.tracks) {
            const idx = track.clips.findIndex(c => c.id === clipId);
            if (idx !== -1) {
                track.clips.splice(idx, 1);
                if (this.selectedClip && this.selectedClip.id === clipId) {
                    this.selectedClip = null;
                }
                this.render();
                return true;
            }
        }
        return false;
    }

    findClip(clipId) {
        for (const track of this.tracks) {
            const clip = track.clips.find(c => c.id === clipId);
            if (clip) return { clip, track };
        }
        return null;
    }

    splitClip(clipId, time) {
        const found = this.findClip(clipId);
        if (!found) return;

        const { clip, track } = found;
        const splitPoint = time - clip.startTime;

        if (splitPoint <= 0.05 || splitPoint >= clip.duration - 0.05) return;

        const newClip = {
            ...JSON.parse(JSON.stringify(clip)),
            id: this.clipIdCounter++,
            startTime: time,
            duration: clip.duration - splitPoint,
            trimStart: (clip.trimStart || 0) + splitPoint,
        };

        clip.duration = splitPoint;
        track.clips.push(newClip);
        track.clips.sort((a, b) => a.startTime - b.startTime);

        this.render();
    }

    duplicateClip(clipId) {
        const found = this.findClip(clipId);
        if (!found) return;

        const { clip, track } = found;
        const newClip = {
            ...JSON.parse(JSON.stringify(clip)),
            id: this.clipIdCounter++,
            startTime: clip.startTime + clip.duration + 0.1,
        };

        track.clips.push(newClip);
        track.clips.sort((a, b) => a.startTime - b.startTime);

        this.render();
        return newClip;
    }

    getTotalDuration() {
        let max = 10;
        this.tracks.forEach(track => {
            track.clips.forEach(clip => {
                max = Math.max(max, clip.startTime + clip.duration);
            });
        });
        return max + 5; // extra padding
    }

    timeToPixel(time) {
        return time * this.zoom;
    }

    pixelToTime(pixel) {
        return pixel / this.zoom;
    }

    snapTime(time) {
        if (!this.snapEnabled) return time;
        const snapThreshold = 5 / this.zoom; // 5 pixels

        // Snap to clip edges
        for (const track of this.tracks) {
            for (const clip of track.clips) {
                if (Math.abs(time - clip.startTime) < snapThreshold) return clip.startTime;
                if (Math.abs(time - (clip.startTime + clip.duration)) < snapThreshold) return clip.startTime + clip.duration;
            }
        }

        // Snap to playhead
        const playheadTime = this.app.currentTime;
        if (Math.abs(time - playheadTime) < snapThreshold) return playheadTime;

        // Snap to whole seconds
        const rounded = Math.round(time * 2) / 2;
        if (Math.abs(time - rounded) < snapThreshold / 2) return rounded;

        return time;
    }

    checkOverlap(trackIndex, clipId, startTime, duration) {
        const track = this.tracks[trackIndex];
        if (!track) return false;
        for (const clip of track.clips) {
            if (clip.id === clipId) continue;
            if (startTime < clip.startTime + clip.duration && startTime + duration > clip.startTime) {
                return true;
            }
        }
        return false;
    }

    render() {
        this.renderLabels();
        this.renderTracks();
        this.renderRuler();
        this.updatePlayhead();
        this.app.updateAudioControls();
    }

    renderLabels() {
        this.labelsEl.innerHTML = '';
        this.tracks.forEach((track, index) => {
            const label = document.createElement('div');
            label.className = 'track-label';
            label.innerHTML = `
                <span>${track.name}</span>
                <div class="track-label-actions">
                    <button class="track-mute-btn ${track.muted ? 'muted' : ''}" data-track="${index}" title="Mute">
                        <i class="fas fa-volume-${track.muted ? 'mute' : 'up'}"></i>
                    </button>
                    <button class="track-hide-btn ${track.hidden ? 'muted' : ''}" data-track="${index}" title="Hide">
                        <i class="fas fa-eye${track.hidden ? '-slash' : ''}"></i>
                    </button>
                    <button class="track-delete-btn" data-track="${index}" title="Delete Track">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            this.labelsEl.appendChild(label);
        });

        // Event listeners for label buttons
        this.labelsEl.querySelectorAll('.track-mute-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.track);
                this.tracks[idx].muted = !this.tracks[idx].muted;
                this.render();
            });
        });

        this.labelsEl.querySelectorAll('.track-hide-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.track);
                this.tracks[idx].hidden = !this.tracks[idx].hidden;
                this.render();
            });
        });

        this.labelsEl.querySelectorAll('.track-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(btn.dataset.track);
                if (confirm(`Delete track "${this.tracks[idx].name}"?`)) {
                    this.removeTrack(idx);
                }
            });
        });
    }

    renderTracks() {
        const totalDuration = this.getTotalDuration();
        const totalWidth = this.timeToPixel(totalDuration);

        this.tracksEl.innerHTML = '';
        this.tracksEl.style.width = totalWidth + 'px';

        this.tracks.forEach((track, trackIndex) => {
            const trackEl = document.createElement('div');
            trackEl.className = 'timeline-track';
            trackEl.dataset.trackIndex = trackIndex;
            trackEl.style.width = totalWidth + 'px';

            track.clips.forEach(clip => {
                const clipEl = this.createClipElement(clip, trackIndex);
                trackEl.appendChild(clipEl);
            });

            // Drop target
            trackEl.addEventListener('dragover', (e) => {
                e.preventDefault();
                trackEl.classList.add('drag-over');
            });

            trackEl.addEventListener('dragleave', () => {
                trackEl.classList.remove('drag-over');
            });

            trackEl.addEventListener('drop', (e) => {
                e.preventDefault();
                trackEl.classList.remove('drag-over');
                this.handleDrop(e, trackIndex);
            });

            this.tracksEl.appendChild(trackEl);
        });
    }

    createClipElement(clip, trackIndex) {
        const el = document.createElement('div');
        el.className = `timeline-clip ${clip.type}`;
        if (this.selectedClip && this.selectedClip.id === clip.id) {
            el.classList.add('selected');
        }

        const left = this.timeToPixel(clip.startTime);
        const width = this.timeToPixel(clip.duration);

        el.style.left = left + 'px';
        el.style.width = width + 'px';
        el.dataset.clipId = clip.id;

        const icon = clip.type === 'video' ? 'fa-film' :
                     clip.type === 'audio' ? 'fa-music' :
                     clip.type === 'image' ? 'fa-image' : 'fa-font';

        el.innerHTML = `
            <div class="clip-handle clip-handle-left"></div>
            <span class="clip-label"><i class="fas ${icon}"></i> ${clip.name || 'Clip'}</span>
            <div class="clip-handle clip-handle-right"></div>
        `;

        // Click to select
        el.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('clip-handle')) {
                this.startResize(e, clip, trackIndex, e.target.classList.contains('clip-handle-left') ? 'left' : 'right');
            } else {
                this.selectClip(clip);
                this.startDrag(e, clip, trackIndex);
            }
            e.stopPropagation();
        });

        // Right click context menu
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.selectClip(clip);
            this.showContextMenu(e, clip);
        });

        return el;
    }

    selectClip(clip) {
        this.selectedClip = clip;
        this.render();
        this.app.showClipProperties(clip);
    }

    deselectAll() {
        this.selectedClip = null;
        this.render();
        this.app.hideClipProperties();
    }

    startDrag(e, clip, trackIndex) {
        this.isDragging = true;
        const startX = e.clientX;
        const startTime = clip.startTime;

        const onMove = (e2) => {
            const dx = e2.clientX - startX;
            let newTime = startTime + this.pixelToTime(dx);
            newTime = Math.max(0, newTime);
            newTime = this.snapTime(newTime);

            if (!this.checkOverlap(trackIndex, clip.id, newTime, clip.duration)) {
                clip.startTime = newTime;
                this.render();
            }
        };

        const onUp = () => {
            this.isDragging = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    startResize(e, clip, trackIndex, side) {
        this.isResizing = true;
        const startX = e.clientX;
        const startTime = clip.startTime;
        const startDuration = clip.duration;
        const startTrimStart = clip.trimStart || 0;

        const onMove = (e2) => {
            const dx = e2.clientX - startX;
            const dt = this.pixelToTime(dx);

            if (side === 'left') {
                let newStart = startTime + dt;
                let newDuration = startDuration - dt;
                let newTrimStart = startTrimStart + dt;

                newStart = Math.max(0, newStart);
                newDuration = Math.max(0.1, newDuration);
                newTrimStart = Math.max(0, newTrimStart);

                newStart = this.snapTime(newStart);

                if (!this.checkOverlap(trackIndex, clip.id, newStart, startDuration - (newStart - startTime))) {
                    clip.startTime = newStart;
                    clip.duration = startDuration - (newStart - startTime);
                    clip.trimStart = startTrimStart + (newStart - startTime);
                    if (clip.duration < 0.1) {
                        clip.startTime = startTime;
                        clip.duration = startDuration;
                        clip.trimStart = startTrimStart;
                    }
                    this.render();
                }
            } else {
                let newDuration = startDuration + dt;
                newDuration = Math.max(0.1, newDuration);

                const newEnd = this.snapTime(clip.startTime + newDuration);
                newDuration = newEnd - clip.startTime;

                // Limit to media duration if applicable
                const asset = this.app.mediaAssets[clip.assetId];
                if (asset && asset.duration) {
                    const maxDur = asset.duration - (clip.trimStart || 0);
                    newDuration = Math.min(newDuration, maxDur);
                }

                newDuration = Math.max(0.1, newDuration);

                if (!this.checkOverlap(trackIndex, clip.id, clip.startTime, newDuration)) {
                    clip.duration = newDuration;
                    this.render();
                }
            }
        };

        const onUp = () => {
            this.isResizing = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    handleDrop(e, trackIndex) {
        const mediaId = e.dataTransfer.getData('mediaId');
        if (!mediaId) return;

        const asset = this.app.mediaAssets[mediaId];
        if (!asset) return;

        const rect = this.scrollEl.getBoundingClientRect();
        const x = e.clientX - rect.left + this.scrollEl.scrollLeft;
        let startTime = this.pixelToTime(x);
        startTime = Math.max(0, this.snapTime(startTime));

        const duration = asset.duration || 5;

        const clipData = {
            type: asset.type,
            name: asset.name,
            assetId: mediaId,
            startTime,
            duration,
            trimStart: 0,
        };

        if (asset.type === 'text') {
            clipData.textData = { ...asset.textData };
        }

        if (!this.checkOverlap(trackIndex, -1, startTime, duration)) {
            this.addClip(trackIndex, clipData);
            this.app.saveState();
        }
    }

    renderRuler() {
        const totalDuration = this.getTotalDuration();
        const totalWidth = this.timeToPixel(totalDuration);
        this.rulerEl.style.width = totalWidth + 'px';
        this.rulerEl.innerHTML = '';

        const step = this.zoom >= 80 ? 1 : this.zoom >= 40 ? 2 : 5;

        for (let t = 0; t <= totalDuration; t += step) {
            const mark = document.createElement('div');
            mark.className = 'ruler-mark major';
            mark.style.left = this.timeToPixel(t) + 'px';
            mark.textContent = this.formatTime(t);
            this.rulerEl.appendChild(mark);

            // Sub-marks
            if (step <= 2) {
                for (let st = 0.5; st < step; st += 0.5) {
                    if (t + st <= totalDuration) {
                        const subMark = document.createElement('div');
                        subMark.className = 'ruler-mark';
                        subMark.style.left = this.timeToPixel(t + st) + 'px';
                        this.rulerEl.appendChild(subMark);
                    }
                }
            }
        }
    }

    updatePlayhead() {
        const x = this.timeToPixel(this.app.currentTime);
        this.playheadEl.style.left = x + 'px';
    }

    formatTime(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }

    showContextMenu(e, clip) {
        // Remove existing
        document.querySelectorAll('.context-menu').forEach(m => m.remove());

        const menu = document.createElement('div');
        menu.className = 'context-menu';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';

        menu.innerHTML = `
            <div class="context-menu-item" data-action="split"><i class="fas fa-cut"></i> Split at Playhead</div>
            <div class="context-menu-item" data-action="duplicate"><i class="fas fa-copy"></i> Duplicate</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="properties"><i class="fas fa-sliders-h"></i> Properties</div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item danger" data-action="delete"><i class="fas fa-trash"></i> Delete</div>
        `;

        document.body.appendChild(menu);

        menu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                switch (item.dataset.action) {
                    case 'split':
                        this.splitClip(clip.id, this.app.currentTime);
                        this.app.saveState();
                        break;
                    case 'duplicate':
                        this.duplicateClip(clip.id);
                        this.app.saveState();
                        break;
                    case 'delete':
                        this.removeClip(clip.id);
                        this.app.saveState();
                        break;
                    case 'properties':
                        this.app.showClipProperties(clip);
                        break;
                }
                menu.remove();
            });
        });

        const closeMenu = (e2) => {
            if (!menu.contains(e2.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };

        setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
    }

    setZoom(newZoom) {
        this.zoom = Math.max(10, Math.min(500, newZoom));
        this.render();
    }

    bindEvents() {
        // Ruler click to seek
        this.rulerEl.addEventListener('mousedown', (e) => {
            const rect = this.scrollEl.getBoundingClientRect();
            const x = e.clientX - rect.left + this.scrollEl.scrollLeft;
            this.app.seek(this.pixelToTime(x));

            const onMove = (e2) => {
                const x2 = e2.clientX - rect.left + this.scrollEl.scrollLeft;
                this.app.seek(Math.max(0, this.pixelToTime(x2)));
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Playhead drag
        this.playheadEl.querySelector('.playhead-handle').addEventListener('mousedown', (e) => {
            e.stopPropagation();
            const rect = this.scrollEl.getBoundingClientRect();

            const onMove = (e2) => {
                const x = e2.clientX - rect.left + this.scrollEl.scrollLeft;
                this.app.seek(Math.max(0, this.pixelToTime(x)));
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });

        // Click empty area to deselect
        this.tracksEl.addEventListener('mousedown', (e) => {
            if (e.target === this.tracksEl || e.target.classList.contains('timeline-track')) {
                this.deselectAll();
            }
        });

        // Snap toggle
        document.getElementById('snapToggle').addEventListener('change', (e) => {
            this.snapEnabled = e.target.checked;
        });

        // Zoom buttons
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.setZoom(this.zoom * 1.3);
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.setZoom(this.zoom / 1.3);
        });

        document.getElementById('fitTimelineBtn').addEventListener('click', () => {
            const duration = this.getTotalDuration();
            const availableWidth = this.scrollEl.clientWidth - 50;
            this.setZoom(availableWidth / duration);
        });

        // Timeline toolbar actions
        document.getElementById('splitBtn').addEventListener('click', () => {
            if (this.selectedClip) {
                this.splitClip(this.selectedClip.id, this.app.currentTime);
                this.app.saveState();
            }
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            if (this.selectedClip) {
                this.removeClip(this.selectedClip.id);
                this.app.saveState();
            }
        });

        document.getElementById('duplicateBtn').addEventListener('click', () => {
            if (this.selectedClip) {
                this.duplicateClip(this.selectedClip.id);
                this.app.saveState();
            }
        });

        document.getElementById('addTrackBtn').addEventListener('click', () => {
            const name = prompt('Track name:', `Track ${this.tracks.length + 1}`);
            if (name) {
                const type = prompt('Track type (video/audio/text):', 'video') || 'video';
                this.addTrack(name, type);
                this.app.saveState();
            }
        });

        // Scroll synchronization
        this.scrollEl.addEventListener('scroll', () => {
            this.labelsEl.scrollTop = this.scrollEl.scrollTop;
        });
    }

    getState() {
        return {
            tracks: JSON.parse(JSON.stringify(this.tracks)),
            zoom: this.zoom,
            clipIdCounter: this.clipIdCounter,
        };
    }

    loadState(state) {
        this.tracks = state.tracks;
        this.zoom = state.zoom;
        this.clipIdCounter = state.clipIdCounter;
        this.selectedClip = null;
        this.render();
    }
}