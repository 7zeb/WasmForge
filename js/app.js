// app.js - Main application controller

class VideoEditorApp {
    constructor() {
        this.mediaAssets = {};
        this.mediaIdCounter = 0;
        this.currentTime = 0;
        this.isPlaying = false;
        this.animationFrame = null;
        this.lastFrameTime = 0;
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoSteps = 50;
        this.masterVolume = 1;

        // Initialize canvas
        this.canvas = document.getElementById('previewCanvas');
        this.renderer = new CanvasRenderer(this.canvas);

        // Initialize timeline
        this.timeline = new TimelineManager(this);

        // Initialize exporter
        this.exporter = new VideoExporter(this);

        this.bindEvents();
        this.render();

        console.log('ClipForge Video Editor initialized');
    }

    // ===== MEDIA MANAGEMENT =====

    importFile(file) {
        return new Promise((resolve, reject) => {
            const id = 'media_' + (this.mediaIdCounter++);
            const type = this.getMediaType(file);
            const url = URL.createObjectURL(file);

            const asset = {
                id,
                name: file.name,
                type,
                url,
                file,
                duration: type === 'image' ? 5 : 0,
                element: null,
            };

            if (type === 'video') {
                const video = document.createElement('video');
                video.src = url;
                video.preload = 'auto';
                video.muted = true;
                video.playsInline = true;

                video.addEventListener('loadedmetadata', () => {
                    asset.duration = video.duration;
                    asset.width = video.videoWidth;
                    asset.height = video.videoHeight;
                    asset.element = video;
                    this.mediaAssets[id] = asset;
                    this.renderMediaLibrary();
                    resolve(asset);
                });

                video.addEventListener('error', () => reject(new Error('Failed to load video')));
            } else if (type === 'audio') {
                const audio = document.createElement('audio');
                audio.src = url;
                audio.preload = 'auto';

                audio.addEventListener('loadedmetadata', () => {
                    asset.duration = audio.duration;
                    asset.element = audio;
                    this.mediaAssets[id] = asset;
                    this.renderMediaLibrary();
                    resolve(asset);
                });

                audio.addEventListener('error', () => reject(new Error('Failed to load audio')));
            } else if (type === 'image') {
                const img = new Image();
                img.src = url;

                img.addEventListener('load', () => {
                    asset.width = img.naturalWidth;
                    asset.height = img.naturalHeight;
                    asset.element = img;
                    this.mediaAssets[id] = asset;
                    this.renderMediaLibrary();
                    resolve(asset);
                });

                img.addEventListener('error', () => reject(new Error('Failed to load image')));
            } else {
                reject(new Error('Unsupported file type'));
            }
        });
    }

    getMediaType(file) {
        if (file.type.startsWith('video/')) return 'video';
        if (file.type.startsWith('audio/')) return 'audio';
        if (file.type.startsWith('image/')) return 'image';
        return 'unknown';
    }

    removeMedia(mediaId) {
        const asset = this.mediaAssets[mediaId];
        if (asset) {
            if (asset.url) URL.revokeObjectURL(asset.url);
            delete this.mediaAssets[mediaId];
            this.renderMediaLibrary();
        }
    }

    renderMediaLibrary() {
        const library = document.getElementById('mediaLibrary');
        library.innerHTML = '';

        Object.values(this.mediaAssets).forEach(asset => {
            const item = document.createElement('div');
            item.className = 'media-item';
            item.draggable = true;

            let thumbHtml = '';
            if (asset.type === 'video') {
                thumbHtml = `<video src="${asset.url}" muted></video>`;
            } else if (asset.type === 'image') {
                thumbHtml = `<img src="${asset.url}" alt="${asset.name}">`;
            } else if (asset.type === 'audio') {
                thumbHtml = `<i class="fas fa-music"></i>`;
            }

            const durationStr = asset.duration ? this.formatTimeDetailed(asset.duration) : '';

            item.innerHTML = `
                <div class="media-thumb">${thumbHtml}</div>
                <div class="media-info">
                    <div class="name">${asset.name}</div>
                    <div class="meta">${asset.type} ${durationStr ? '• ' + durationStr : ''}</div>
                </div>
                <div class="media-item-actions">
                    <button class="add-to-timeline" data-id="${asset.id}" title="Add to timeline">
                        <i class="fas fa-plus"></i>
                    </button>
                    <button class="remove-media" data-id="${asset.id}" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            // Drag start
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('mediaId', asset.id);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            // Add to timeline button
            item.querySelector('.add-to-timeline').addEventListener('click', () => {
                this.addMediaToTimeline(asset.id);
            });

            // Remove button
            item.querySelector('.remove-media').addEventListener('click', () => {
                this.removeMedia(asset.id);
            });

            library.appendChild(item);
        });
    }

    addMediaToTimeline(mediaId) {
        const asset = this.mediaAssets[mediaId];
        if (!asset) return;

        // Find appropriate track
        let trackIndex = 0;
        if (asset.type === 'audio') {
            trackIndex = this.timeline.tracks.findIndex(t => t.type === 'audio');
            if (trackIndex === -1) {
                this.timeline.addTrack('Audio', 'audio');
                trackIndex = this.timeline.tracks.length - 1;
            }
        } else if (asset.type === 'image') {
            trackIndex = this.timeline.tracks.findIndex(t => t.type === 'video');
        } else {
            trackIndex = this.timeline.tracks.findIndex(t => t.type === 'video');
        }

        // Find first available time
        let startTime = 0;
        const track = this.timeline.tracks[trackIndex];
        if (track && track.clips.length > 0) {
            const lastClip = track.clips[track.clips.length - 1];
            startTime = lastClip.startTime + lastClip.duration;
        }

        this.timeline.addClip(trackIndex, {
            type: asset.type === 'audio' ? 'audio' : asset.type,
            name: asset.name,
            assetId: mediaId,
            startTime,
            duration: asset.duration || 5,
            trimStart: 0,
        });

        this.saveState();
    }

    // ===== TEXT =====

    addTextClip() {
        const text = document.getElementById('textContent').value || 'Hello World';
        const font = document.getElementById('textFont').value;
        const size = parseInt(document.getElementById('textSize').value) || 48;
        const color = document.getElementById('textColor').value;
        const strokeColor = document.getElementById('textStroke').value;
        const strokeWidth = parseInt(document.getElementById('textStrokeWidth').value) || 0;
        const bgColor = document.getElementById('textBgColor').value;
        const bgOpacity = parseInt(document.getElementById('textBgOpacity').value) || 0;
        const animation = document.getElementById('textAnimation').value;
        const bold = document.getElementById('textBold').classList.contains('active');
        const italic = document.getElementById('textItalic').classList.contains('active');

        let align = 'center';
        document.querySelectorAll('.align-btn').forEach(btn => {
            if (btn.classList.contains('active')) align = btn.dataset.align;
        });

        // Find text track
        let trackIndex = this.timeline.tracks.findIndex(t => t.type === 'text');
        if (trackIndex === -1) {
            this.timeline.addTrack('Text', 'text');
            trackIndex = this.timeline.tracks.length - 1;
        }

        let startTime = this.currentTime;
        const track = this.timeline.tracks[trackIndex];
        // Check for overlap and adjust
        if (this.timeline.checkOverlap(trackIndex, -1, startTime, 5)) {
            const lastClip = track.clips[track.clips.length - 1];
            if (lastClip) startTime = lastClip.startTime + lastClip.duration;
        }

        this.timeline.addClip(trackIndex, {
            type: 'text',
            name: text.substring(0, 20),
            startTime,
            duration: 5,
            textData: {
                text, fontFamily: font, fontSize: size, color,
                strokeColor, strokeWidth, bgColor, bgOpacity,
                align, bold, italic, animation,
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
            }
        });

        this.saveState();
    }

    // ===== PLAYBACK =====

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-pause"></i>';

        // Start audio playback
        this.syncAudio();

        this.tick();
    }

    pause() {
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        document.getElementById('playBtn').innerHTML = '<i class="fas fa-play"></i>';

        // Pause all audio
        this.pauseAllAudio();
    }

    stop() {
        this.pause();
        this.currentTime = 0;
        this.render();
        this.updateTimeDisplay();
    }

    tick() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const delta = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        this.currentTime += delta;

        const totalDuration = this.timeline.getTotalDuration() - 5;
        if (this.currentTime >= totalDuration) {
            this.currentTime = totalDuration;
            this.pause();
            return;
        }

        this.render();
        this.syncAudio();
        this.updateTimeDisplay();
        this.timeline.updatePlayhead();

        this.animationFrame = requestAnimationFrame(() => this.tick());
    }

    seek(time) {
        this.currentTime = Math.max(0, time);
        this.render();
        this.updateTimeDisplay();
        this.timeline.updatePlayhead();

        if (this.isPlaying) {
            this.syncAudio();
        }
    }

    render() {
        this.renderer.renderFrame(this.currentTime, this.timeline.tracks, this.mediaAssets);
    }

    syncAudio() {
        this.timeline.tracks.forEach(track => {
            if (track.muted) return;
            track.clips.forEach(clip => {
                if (clip.type !== 'audio' && clip.type !== 'video') return;

                const asset = this.mediaAssets[clip.assetId];
                if (!asset || !asset.element) return;

                const el = asset.element;
                const clipEnd = clip.startTime + clip.duration;

                if (this.currentTime >= clip.startTime && this.currentTime < clipEnd) {
                    const mediaTime = (this.currentTime - clip.startTime) + (clip.trimStart || 0);

                    if (Math.abs(el.currentTime - mediaTime) > 0.3) {
                        el.currentTime = mediaTime;
                    }

                    // Volume with fade
                    let vol = (clip.volume !== undefined ? clip.volume : 1) * this.masterVolume;

                    // Fade in
                    if (clip.fadeIn && this.currentTime - clip.startTime < clip.fadeIn) {
                        vol *= (this.currentTime - clip.startTime) / clip.fadeIn;
                    }

                    // Fade out
                    if (clip.fadeOut && clipEnd - this.currentTime < clip.fadeOut) {
                        vol *= (clipEnd - this.currentTime) / clip.fadeOut;
                    }

                    el.volume = Math.max(0, Math.min(1, vol));

                    if (clip.type === 'audio') {
                        el.muted = false;
                    }

                    if (el.paused && this.isPlaying) {
                        el.play().catch(() => {});
                    }
                } else {
                    if (!el.paused) {
                        el.pause();
                    }
                }
            });
        });
    }

    pauseAllAudio() {
        Object.values(this.mediaAssets).forEach(asset => {
            if (asset.element && typeof asset.element.pause === 'function') {
                asset.element.pause();
            }
        });
    }

    updateTimeDisplay() {
        document.getElementById('currentTime').textContent = this.formatTimeDetailed(this.currentTime);
        const totalDuration = Math.max(0, this.timeline.getTotalDuration() - 5);
        document.getElementById('totalTime').textContent = this.formatTimeDetailed(totalDuration);
    }

    formatTimeDetailed(seconds) {
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    // ===== PROPERTIES PANEL =====

    showClipProperties(clip) {
        const panel = document.getElementById('propertiesContent');
        const found = this.timeline.findClip(clip.id);
        if (!found) return;

        let html = `<h4 style="margin-bottom:12px;">${clip.name || 'Clip'}</h4>`;

        // Common properties
        html += `
            <div class="tool-group">
                <label>Start Time (s)</label>
                <input type="number" id="propStartTime" value="${clip.startTime.toFixed(2)}" step="0.1" min="0">
            </div>
            <div class="tool-group">
                <label>Duration (s)</label>
                <input type="number" id="propDuration" value="${clip.duration.toFixed(2)}" step="0.1" min="0.1">
            </div>
            <div class="tool-group">
                <label>Opacity</label>
                <input type="range" id="propOpacity" min="0" max="100" value="${(clip.opacity || 1) * 100}">
                <span id="propOpacityVal">${Math.round((clip.opacity || 1) * 100)}%</span>
            </div>
        `;

        if (clip.type === 'video' || clip.type === 'audio') {
            html += `
                <div class="tool-group">
                    <label>Volume</label>
                    <input type="range" id="propVolume" min="0" max="100" value="${(clip.volume || 1) * 100}">
                    <span id="propVolumeVal">${Math.round((clip.volume || 1) * 100)}%</span>
                </div>
                <div class="tool-group">
                    <label>Trim Start (s)</label>
                    <input type="number" id="propTrimStart" value="${(clip.trimStart || 0).toFixed(2)}" step="0.1" min="0">
                </div>
                <div class="tool-group">
                    <label>Fade In (s)</label>
                    <input type="number" id="propFadeIn" value="${clip.fadeIn || 0}" step="0.1" min="0">
                </div>
                <div class="tool-group">
                    <label>Fade Out (s)</label>
                    <input type="number" id="propFadeOut" value="${clip.fadeOut || 0}" step="0.1" min="0">
                </div>
            `;
        }

        if (clip.type === 'video' || clip.type === 'image') {
            html += `
                <div class="tool-group">
                    <label>Transition</label>
                    <select id="propTransition">
                        <option value="" ${!clip.transition ? 'selected' : ''}>None</option>
                        <option value="fade" ${clip.transition === 'fade' ? 'selected' : ''}>Fade</option>
                        <option value="wipeLeft" ${clip.transition === 'wipeLeft' ? 'selected' : ''}>Wipe Left</option>
                        <option value="wipeRight" ${clip.transition === 'wipeRight' ? 'selected' : ''}>Wipe Right</option>
                        <option value="dissolve" ${clip.transition === 'dissolve' ? 'selected' : ''}>Dissolve</option>
                    </select>
                </div>
                <div class="tool-group">
                    <label>Transition Duration (s)</label>
                    <input type="number" id="propTransDuration" value="${clip.transitionDuration || 0.5}" step="0.1" min="0.1" max="3">
                </div>
            `;

            // Effects list
            html += `<h4 style="margin-top:12px; margin-bottom:8px;">Applied Effects</h4>`;
            if (clip.effects && clip.effects.length > 0) {
                clip.effects.forEach((eff, idx) => {
                    html += `
                        <div class="tool-row" style="margin-bottom:4px;">
                            <span style="flex:1; font-size:12px;">${eff.type} (${eff.intensity}%)</span>
                            <button class="remove-effect-btn" data-idx="${idx}" style="background:none; border:none; color:var(--danger); cursor:pointer;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
                });
            } else {
                html += `<p style="font-size:12px; color:var(--text-muted);">No effects applied</p>`;
            }
        }

        if (clip.type === 'text' && clip.textData) {
            html += `
                <div class="tool-group">
                    <label>Position X</label>
                    <input type="number" id="propTextX" value="${Math.round(clip.textData.x || 0)}">
                </div>
                <div class="tool-group">
                    <label>Position Y</label>
                    <input type="number" id="propTextY" value="${Math.round(clip.textData.y || 0)}">
                </div>
                <div class="tool-group">
                    <label>Text Content</label>
                    <textarea id="propTextContent" rows="2">${clip.textData.text || ''}</textarea>
                </div>
                <div class="tool-group">
                    <label>Font Size</label>
                    <input type="number" id="propFontSize" value="${clip.textData.fontSize || 48}" min="8" max="200">
                </div>
                <div class="tool-group">
                    <label>Color</label>
                    <input type="color" id="propTextColor" value="${clip.textData.color || '#ffffff'}">
                </div>
            `;
        }

        panel.innerHTML = html;

        // Bind property change events
        this.bindPropertyEvents(clip);
    }

    bindPropertyEvents(clip) {
        const bindInput = (id, callback) => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => {
                    callback(e.target.value);
                    this.render();
                    this.timeline.render();
                });
                el.addEventListener('change', () => this.saveState());
            }
        };

        bindInput('propStartTime', (v) => { clip.startTime = Math.max(0, parseFloat(v) || 0); });
        bindInput('propDuration', (v) => { clip.duration = Math.max(0.1, parseFloat(v) || 1); });
        bindInput('propOpacity', (v) => {
            clip.opacity = parseInt(v) / 100;
            const span = document.getElementById('propOpacityVal');
            if (span) span.textContent = v + '%';
        });
        bindInput('propVolume', (v) => {
            clip.volume = parseInt(v) / 100;
            const span = document.getElementById('propVolumeVal');
            if (span) span.textContent = v + '%';
        });
        bindInput('propTrimStart', (v) => { clip.trimStart = Math.max(0, parseFloat(v) || 0); });
        bindInput('propFadeIn', (v) => { clip.fadeIn = Math.max(0, parseFloat(v) || 0); });
        bindInput('propFadeOut', (v) => { clip.fadeOut = Math.max(0, parseFloat(v) || 0); });
        bindInput('propTransition', (v) => { clip.transition = v || null; });
        bindInput('propTransDuration', (v) => { clip.transitionDuration = parseFloat(v) || 0.5; });

        // Text properties
        bindInput('propTextX', (v) => { if (clip.textData) clip.textData.x = parseInt(v) || 0; });
        bindInput('propTextY', (v) => { if (clip.textData) clip.textData.y = parseInt(v) || 0; });
        bindInput('propTextContent', (v) => {
            if (clip.textData) {
                clip.textData.text = v;
                clip.name = v.substring(0, 20);
            }
        });
        bindInput('propFontSize', (v) => { if (clip.textData) clip.textData.fontSize = parseInt(v) || 48; });
        bindInput('propTextColor', (v) => { if (clip.textData) clip.textData.color = v; });

        // Remove effect buttons
        document.querySelectorAll('.remove-effect-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                if (clip.effects) {
                    clip.effects.splice(idx, 1);
                    this.showClipProperties(clip);
                    this.render();
                    this.saveState();
                }
            });
        });
    }

    hideClipProperties() {
        document.getElementById('propertiesContent').innerHTML =
            '<p class="placeholder-text">Select a clip on the timeline to edit its properties.</p>';
    }

    // ===== AUDIO CONTROLS =====

    updateAudioControls() {
        const container = document.getElementById('trackVolumeControls');
        container.innerHTML = '';

        this.timeline.tracks.forEach((track, idx) => {
            if (track.type !== 'audio') return;
            track.clips.forEach(clip => {
                const div = document.createElement('div');
                div.className = 'tool-group';
                div.innerHTML = `
                    <label>${clip.name || 'Audio'} Volume</label>
                    <input type="range" min="0" max="100" value="${(clip.volume || 1) * 100}" data-clip-id="${clip.id}">
                `;
                div.querySelector('input').addEventListener('input', (e) => {
                    clip.volume = parseInt(e.target.value) / 100;
                });
                container.appendChild(div);
            });
        });
    }

    // ===== EFFECTS =====

    applyEffectToSelected(effectType, intensity) {
        const clip = this.timeline.selectedClip;
        if (!clip) {
            alert('Select a clip first');
            return;
        }
        if (clip.type !== 'video' && clip.type !== 'image') {
            alert('Effects can only be applied to video or image clips');
            return;
        }

        if (!clip.effects) clip.effects = [];
        clip.effects.push({ type: effectType, intensity });

        this.render();
        this.showClipProperties(clip);
        this.saveState();
    }

    applyTransitionToSelected(transitionType) {
        const clip = this.timeline.selectedClip;
        if (!clip) {
            alert('Select a clip first');
            return;
        }

        clip.transition = transitionType;
        clip.transitionDuration = 0.5;

        this.render();
        this.showClipProperties(clip);
        this.saveState();
    }

    // ===== UNDO/REDO =====

    saveState() {
        const state = this.timeline.getState();
        this.undoStack.push(JSON.stringify(state));
        if (this.undoStack.length > this.maxUndoSteps) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        if (this.undoStack.length === 0) return;
        const currentState = JSON.stringify(this.timeline.getState());
        this.redoStack.push(currentState);
        const prevState = JSON.parse(this.undoStack.pop());
        this.timeline.loadState(prevState);
        this.render();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        const currentState = JSON.stringify(this.timeline.getState());
        this.undoStack.push(currentState);
        const nextState = JSON.parse(this.redoStack.pop());
        this.timeline.loadState(nextState);
        this.render();
    }

    // ===== PROJECT SAVE/LOAD =====

    saveProject() {
        const project = {
            version: 1,
            canvasSize: document.getElementById('canvasSize').value,
            fps: document.getElementById('fpsSelect').value,
            timeline: this.timeline.getState(),
            // Note: media files can't be saved in JSON, only references
            mediaNames: Object.entries(this.mediaAssets).map(([id, a]) => ({ id, name: a.name, type: a.type })),
        };

        const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'clipforge_project.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    loadProject(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target.result);

                if (project.canvasSize) {
                    document.getElementById('canvasSize').value = project.canvasSize;
                    const [w, h] = project.canvasSize.split('x').map(Number);
                    this.renderer.resize(w, h);
                }

                if (project.fps) {
                    document.getElementById('fpsSelect').value = project.fps;
                }

                if (project.timeline) {
                    this.timeline.loadState(project.timeline);
                }

                this.render();
                alert('Project loaded! Note: Media files need to be re-imported.');
            } catch (err) {
                alert('Failed to load project: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    newProject() {
        if (!confirm('Create a new project? Unsaved changes will be lost.')) return;

        // Clear everything
        Object.values(this.mediaAssets).forEach(a => {
            if (a.url) URL.revokeObjectURL(a.url);
        });
        this.mediaAssets = {};
        this.mediaIdCounter = 0;
        this.currentTime = 0;
        this.pause();
        this.undoStack = [];
        this.redoStack = [];

        this.timeline.initDefaultTracks();
        this.timeline.clipIdCounter = 0;
        this.timeline.render();
        this.renderMediaLibrary();
        this.render();
        this.updateTimeDisplay();
        this.hideClipProperties();
    }

    // ===== EVENTS =====

    bindEvents() {
        // File import
        const importArea = document.getElementById('importArea');
        const fileInput = document.getElementById('fileInput');

        importArea.addEventListener('click', () => fileInput.click());

        importArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            importArea.classList.add('drag-over');
        });

        importArea.addEventListener('dragleave', () => {
            importArea.classList.remove('drag-over');
        });

        importArea.addEventListener('drop', (e) => {
            e.preventDefault();
            importArea.classList.remove('drag-over');
            const files = Array.from(e.dataTransfer.files);
            files.forEach(f => this.importFile(f).catch(err => console.error(err)));
        });

        fileInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(f => this.importFile(f).catch(err => console.error(err)));
            fileInput.value = '';
        });

        // Panel tabs
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.panel-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab + '-tab').classList.add('active');
            });
        });

        // Playback controls
        document.getElementById('playBtn').addEventListener('click', () => {
            if (this.isPlaying) this.pause();
            else this.play();
        });

        document.getElementById('stopBtn').addEventListener('click', () => this.stop());

        document.getElementById('skipStartBtn').addEventListener('click', () => {
            this.seek(0);
        });

        document.getElementById('skipEndBtn').addEventListener('click', () => {
            this.seek(this.timeline.getTotalDuration() - 5);
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    if (this.isPlaying) this.pause();
                    else this.play();
                    break;
                case 'Delete':
                case 'Backspace':
                    if (this.timeline.selectedClip) {
                        this.timeline.removeClip(this.timeline.selectedClip.id);
                        this.saveState();
                    }
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) this.redo();
                        else this.undo();
                    }
                    break;
                case 'y':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.redo();
                    }
                    break;
                case 's':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.saveProject();
                    }
                    break;
                case 'ArrowLeft':
                    this.seek(this.currentTime - (e.shiftKey ? 1 : 0.1));
                    break;
                case 'ArrowRight':
                    this.seek(this.currentTime + (e.shiftKey ? 1 : 0.1));
                    break;
            }
        });

        // Canvas size
        document.getElementById('canvasSize').addEventListener('change', (e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            this.renderer.resize(w, h);
            this.render();
        });

        // Text controls
        document.getElementById('addTextBtn').addEventListener('click', () => this.addTextClip());

        document.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                btn.classList.toggle('active');
            });
        });

        document.getElementById('textBgOpacity').addEventListener('input', (e) => {
            document.getElementById('textBgOpacityVal').textContent = e.target.value + '%';
        });

        // Effects
        let selectedEffect = null;

        document.querySelectorAll('.effect-card:not(.transition-card)').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.effect-card:not(.transition-card)').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                selectedEffect = card.dataset.effect;

                const controls = document.getElementById('effectControls');
                controls.style.display = 'block';
                document.getElementById('effectName').textContent = selectedEffect;
                document.getElementById('effectIntensity').value = 100;
                document.getElementById('effectIntensityVal').textContent = '100%';
            });
        });

        document.getElementById('effectIntensity').addEventListener('input', (e) => {
            document.getElementById('effectIntensityVal').textContent = e.target.value + '%';
        });

        document.getElementById('applyEffectBtn').addEventListener('click', () => {
            if (selectedEffect) {
                const intensity = parseInt(document.getElementById('effectIntensity').value);
                this.applyEffectToSelected(selectedEffect, intensity);
            }
        });

        // Transitions
        document.querySelectorAll('.transition-card').forEach(card => {
            card.addEventListener('click', () => {
                this.applyTransitionToSelected(card.dataset.transition);
            });
        });

        // Audio controls
        document.getElementById('masterVolume').addEventListener('input', (e) => {
            this.masterVolume = parseInt(e.target.value) / 100;
            document.getElementById('masterVolumeVal').textContent = e.target.value + '%';
        });

        document.getElementById('applyAudioEffects').addEventListener('click', () => {
            const clip = this.timeline.selectedClip;
            if (!clip || (clip.type !== 'audio' && clip.type !== 'video')) {
                alert('Select an audio or video clip first');
                return;
            }
            clip.fadeIn = parseFloat(document.getElementById('audioFadeIn').value) || 0;
            clip.fadeOut = parseFloat(document.getElementById('audioFadeOut').value) || 0;
            this.showClipProperties(clip);
            this.saveState();
        });

        // Top bar buttons
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('newProjectBtn').addEventListener('click', () => this.newProject());
        document.getElementById('saveProjectBtn').addEventListener('click', () => this.saveProject());
        document.getElementById('loadProjectBtn').addEventListener('click', () => {
            document.getElementById('loadProjectInput').click();
        });
        document.getElementById('loadProjectInput').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadProject(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Export
        document.getElementById('exportBtn').addEventListener('click', () => {
            document.getElementById('exportModal').style.display = 'flex';
        });

        document.getElementById('closeExportModal').addEventListener('click', () => {
            document.getElementById('exportModal').style.display = 'none';
        });

        document.getElementById('startExportBtn').addEventListener('click', () => {
            this.exporter.exportVideo({
                format: document.getElementById('exportFormat').value,
                quality: document.getElementById('exportQuality').value,
                includeAudio: document.getElementById('exportAudio').checked,
            });
        });

        // Close modal on outside click
        document.getElementById('exportModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('exportModal')) {
                document.getElementById('exportModal').style.display = 'none';
            }
        });

        // Prevent default drag behavior on body
        document.body.addEventListener('dragover', (e) => e.preventDefault());
        document.body.addEventListener('drop', (e) => e.preventDefault());
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new VideoEditorApp();
});