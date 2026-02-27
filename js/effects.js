// effects.js - Video/Image effects and text animations

const Effects = {
    // Apply CSS filter-style effects to canvas context
    applyFilter(ctx, canvas, effect, intensity) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const factor = intensity / 100;

        switch (effect) {
            case 'brightness':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, data[i] * (0.5 + factor));
                    data[i + 1] = Math.min(255, data[i + 1] * (0.5 + factor));
                    data[i + 2] = Math.min(255, data[i + 2] * (0.5 + factor));
                }
                break;

            case 'contrast':
                const contrastFactor = (259 * (factor * 255 + 255)) / (255 * (259 - factor * 255));
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, contrastFactor * (data[i] - 128) + 128));
                    data[i + 1] = Math.min(255, Math.max(0, contrastFactor * (data[i + 1] - 128) + 128));
                    data[i + 2] = Math.min(255, Math.max(0, contrastFactor * (data[i + 2] - 128) + 128));
                }
                break;

            case 'saturation':
                for (let i = 0; i < data.length; i += 4) {
                    const gray = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    data[i] = Math.min(255, Math.max(0, gray + factor * 2 * (data[i] - gray)));
                    data[i + 1] = Math.min(255, Math.max(0, gray + factor * 2 * (data[i + 1] - gray)));
                    data[i + 2] = Math.min(255, Math.max(0, gray + factor * 2 * (data[i + 2] - gray)));
                }
                break;

            case 'grayscale':
                for (let i = 0; i < data.length; i += 4) {
                    const avg = 0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                    const mixed = factor;
                    data[i] = data[i] * (1 - mixed) + avg * mixed;
                    data[i + 1] = data[i + 1] * (1 - mixed) + avg * mixed;
                    data[i + 2] = data[i + 2] * (1 - mixed) + avg * mixed;
                }
                break;

            case 'sepia':
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    const sr = Math.min(255, (r * 0.393 + g * 0.769 + b * 0.189));
                    const sg = Math.min(255, (r * 0.349 + g * 0.686 + b * 0.168));
                    const sb = Math.min(255, (r * 0.272 + g * 0.534 + b * 0.131));
                    data[i] = r * (1 - factor) + sr * factor;
                    data[i + 1] = g * (1 - factor) + sg * factor;
                    data[i + 2] = b * (1 - factor) + sb * factor;
                }
                break;

            case 'invert':
                for (let i = 0; i < data.length; i += 4) {
                    data[i] = data[i] * (1 - factor) + (255 - data[i]) * factor;
                    data[i + 1] = data[i + 1] * (1 - factor) + (255 - data[i + 1]) * factor;
                    data[i + 2] = data[i + 2] * (1 - factor) + (255 - data[i + 2]) * factor;
                }
                break;

            case 'hue-rotate':
                const angle = factor * 360 * Math.PI / 180;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i], g = data[i + 1], b = data[i + 2];
                    data[i] = Math.min(255, Math.max(0, r * (0.213 + cos * 0.787 - sin * 0.213) + g * (0.715 - cos * 0.715 - sin * 0.715) + b * (0.072 - cos * 0.072 + sin * 0.928)));
                    data[i + 1] = Math.min(255, Math.max(0, r * (0.213 - cos * 0.213 + sin * 0.143) + g * (0.715 + cos * 0.285 + sin * 0.140) + b * (0.072 - cos * 0.072 - sin * 0.283)));
                    data[i + 2] = Math.min(255, Math.max(0, r * (0.213 - cos * 0.213 - sin * 0.787) + g * (0.715 - cos * 0.715 + sin * 0.715) + b * (0.072 + cos * 0.928 + sin * 0.072)));
                }
                break;

            case 'blur':
                this.applyBlur(data, canvas.width, canvas.height, Math.floor(factor * 10));
                break;

            case 'sharpen':
                this.applySharpen(data, canvas.width, canvas.height, factor);
                break;

            case 'vignette':
                this.applyVignette(data, canvas.width, canvas.height, factor);
                break;
        }

        ctx.putImageData(imageData, 0, 0);
    },

    applyBlur(data, width, height, radius) {
        if (radius < 1) return;
        radius = Math.min(radius, 20);
        const copy = new Uint8ClampedArray(data);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const nx = x + dx, ny = y + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            const idx = (ny * width + nx) * 4;
                            r += copy[idx];
                            g += copy[idx + 1];
                            b += copy[idx + 2];
                            count++;
                        }
                    }
                }
                const idx = (y * width + x) * 4;
                data[idx] = r / count;
                data[idx + 1] = g / count;
                data[idx + 2] = b / count;
            }
        }
    },

    applySharpen(data, width, height, factor) {
        const copy = new Uint8ClampedArray(data);
        const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
        const strength = factor;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                for (let c = 0; c < 3; c++) {
                    let val = 0;
                    for (let ky = -1; ky <= 1; ky++) {
                        for (let kx = -1; kx <= 1; kx++) {
                            val += copy[((y + ky) * width + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
                        }
                    }
                    const idx = (y * width + x) * 4 + c;
                    data[idx] = Math.min(255, Math.max(0, copy[idx] * (1 - strength) + val * strength));
                }
            }
        }
    },

    applyVignette(data, width, height, factor) {
        const cx = width / 2, cy = height / 2;
        const maxDist = Math.sqrt(cx * cx + cy * cy);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
                const vignette = 1 - (dist / maxDist) * factor;
                const idx = (y * width + x) * 4;
                data[idx] *= vignette;
                data[idx + 1] *= vignette;
                data[idx + 2] *= vignette;
            }
        }
    },

    // Get CSS filter string for canvas rendering (faster for preview)
    getCSSFilter(effects) {
        if (!effects || effects.length === 0) return 'none';
        let filters = [];
        effects.forEach(e => {
            const v = e.intensity / 100;
            switch (e.type) {
                case 'brightness': filters.push(`brightness(${0.5 + v})`); break;
                case 'contrast': filters.push(`contrast(${v * 2})`); break;
                case 'saturation': filters.push(`saturate(${v * 2})`); break;
                case 'grayscale': filters.push(`grayscale(${v})`); break;
                case 'sepia': filters.push(`sepia(${v})`); break;
                case 'invert': filters.push(`invert(${v})`); break;
                case 'hue-rotate': filters.push(`hue-rotate(${v * 360}deg)`); break;
                case 'blur': filters.push(`blur(${v * 10}px)`); break;
            }
        });
        return filters.join(' ') || 'none';
    },

    // Text animation calculations
    getTextAnimation(animation, progress, duration) {
        const animDuration = 0.5; // animation takes 0.5 seconds
        const t = Math.min(1, progress / animDuration);
        const eased = 1 - Math.pow(1 - t, 3); // ease out cubic

        switch (animation) {
            case 'fadeIn':
                return { opacity: eased, offsetX: 0, offsetY: 0, scale: 1, visibleChars: -1 };
            case 'slideUp':
                return { opacity: eased, offsetX: 0, offsetY: 50 * (1 - eased), scale: 1, visibleChars: -1 };
            case 'slideLeft':
                return { opacity: eased, offsetX: 100 * (1 - eased), offsetY: 0, scale: 1, visibleChars: -1 };
            case 'scale':
                return { opacity: eased, offsetX: 0, offsetY: 0, scale: 0.3 + 0.7 * eased, visibleChars: -1 };
            case 'typewriter':
                return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1, visibleChars: Math.floor(t * 100) };
            default:
                return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1, visibleChars: -1 };
        }
    },

    // Transition rendering
    applyTransition(ctx, canvas, transitionType, progress) {
        if (!transitionType || transitionType === 'none') return;
        
        ctx.save();
        switch (transitionType) {
            case 'fade':
                ctx.globalAlpha = progress;
                break;
            case 'wipeLeft':
                ctx.beginPath();
                ctx.rect(0, 0, canvas.width * progress, canvas.height);
                ctx.clip();
                break;
            case 'wipeRight':
                ctx.beginPath();
                ctx.rect(canvas.width * (1 - progress), 0, canvas.width * progress, canvas.height);
                ctx.clip();
                break;
            case 'dissolve':
                ctx.globalAlpha = progress;
                break;
        }
    },

    endTransition(ctx) {
        ctx.restore();
    }
};