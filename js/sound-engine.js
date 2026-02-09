// Sound Engine - Web Audio API Procedural Sound Generation
// Generates all sounds dynamically without external audio files

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = this._loadSoundEnabled();
        this.volume = 0.3;
        this.masterGain = null;
        this.initialized = false;
    }

    _loadSoundEnabled() {
        try {
            return localStorage.getItem('sfx_enabled') !== 'false';
        } catch (e) {
            console.warn('localStorage not available (private/incognito mode)', e);
            return true;
        }
    }

    // Initialize AudioContext on first user interaction
    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.enabled ? this.volume : 0;
            this.masterGain.connect(this.ctx.destination);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    // Save preference
    toggle() {
        this.enabled = !this.enabled;
        try {
            localStorage.setItem('sfx_enabled', this.enabled);
        } catch (e) {
            console.warn('Could not save sound preference', e);
        }
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.enabled ? this.volume : 0, this.ctx.currentTime);
        }
        return this.enabled;
    }

    // === Utility Functions ===
    playOscillator(freq, duration, type = 'sine', envelope = {}) {
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.connect(this.masterGain);
        osc.connect(gain);

        // Default envelope
        const attackTime = envelope.attack || 0.01;
        const decayTime = envelope.decay || duration * 0.5;
        const sustain = envelope.sustain || 0.3;
        const releaseTime = envelope.release || 0.1;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + attackTime);
        gain.gain.linearRampToValueAtTime(sustain, now + attackTime + decayTime);
        gain.gain.linearRampToValueAtTime(0, now + duration - releaseTime);

        osc.start(now);
        osc.stop(now + duration);
    }

    playNoise(duration, color = 'white', envelope = {}) {
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        // Generate noise
        for (let i = 0; i < buffer.length; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        // Apply filter for colored noise
        const source = this.ctx.createBufferSource();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        if (color === 'pink') {
            filter.type = 'highpass';
            filter.frequency.value = 200;
        } else if (color === 'brown') {
            filter.type = 'lowpass';
            filter.frequency.value = 500;
        }

        source.buffer = buffer;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        // Envelope
        const attackTime = envelope.attack || 0.01;
        const decayTime = envelope.decay || duration * 0.3;
        const releaseTime = envelope.release || 0.1;

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(1, now + attackTime);
        gain.gain.linearRampToValueAtTime(0, now + duration - releaseTime);

        source.start(now);
        source.stop(now + duration);
    }

    // === Sound Effects ===

    click() {
        // Short click/tap
        this.playOscillator(600, 0.08, 'sine', { attack: 0.001, decay: 0.05, sustain: 0 });
    }

    flip() {
        // Card flip sound
        this.playOscillator(800, 0.12, 'sine', { attack: 0.005, decay: 0.1, sustain: 0 });
    }

    match() {
        // Match/success sound - ascending notes
        this.playOscillator(1000, 0.1, 'sine', { attack: 0.005, decay: 0.08, sustain: 0 });
        setTimeout(() => {
            this.playOscillator(1400, 0.12, 'sine', { attack: 0.005, decay: 0.1, sustain: 0 });
        }, 70);
    }

    error() {
        // Error/wrong match sound
        this.playOscillator(300, 0.2, 'sine', { attack: 0.01, decay: 0.15, sustain: 0.05 });
    }

    levelUp() {
        // Level up fanfare - ascending notes
        const notes = [400, 500, 600, 800];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator(freq, 0.15, 'sine', { attack: 0.01, decay: 0.1, sustain: 0 });
            }, i * 80);
        });
    }

    gameOver() {
        // Game over - descending notes
        const notes = [800, 600, 400, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator(freq, 0.2, 'sine', { attack: 0.02, decay: 0.15, sustain: 0.1 });
            }, i * 100);
        });
    }

    stageClear() {
        // Stage clear/victory fanfare
        const notes = [600, 800, 1000, 1200, 1000, 800];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator(freq, 0.2, 'sine', { attack: 0.02, decay: 0.12, sustain: 0.3 });
            }, i * 100);
        });
    }

    combo(n) {
        // Combo sound - pitch increases with n
        const baseFreq = 400 + n * 50;
        this.playOscillator(Math.min(baseFreq, 1200), 0.12, 'triangle',
            { attack: 0.01, decay: 0.08, sustain: 0.2 });
    }

    perfect() {
        // Perfect timing "sparkle"
        this.playOscillator(1500, 0.08, 'sine', { attack: 0.002, decay: 0.06, sustain: 0 });
        setTimeout(() => {
            this.playOscillator(1800, 0.1, 'sine', { attack: 0.002, decay: 0.08, sustain: 0 });
        }, 50);
    }

    pop() {
        // Pop/burst sound
        this.playNoise(0.08, 'white', { attack: 0.01, decay: 0.06, release: 0.01 });
    }

    pause() {
        // Pause sound
        this.playOscillator(500, 0.1, 'sine', { attack: 0.01, decay: 0.08, sustain: 0 });
    }

    resume() {
        // Resume sound
        this.playOscillator(600, 0.1, 'sine', { attack: 0.01, decay: 0.08, sustain: 0 });
    }

    record() {
        // New record/achievement sound
        const notes = [800, 1000, 1200, 1400, 1200, 1000, 800];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.playOscillator(freq, 0.15, 'sine', { attack: 0.01, decay: 0.1, sustain: 0.2 });
            }, i * 120);
        });
    }
}

// Global instance
const sfx = new SoundEngine();
window.sfx = sfx;

// Auto-initialize on user interaction
document.addEventListener('click', () => sfx.init(), { once: true });
document.addEventListener('touchstart', () => sfx.init(), { once: true });

// Sync button icon with stored preference
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('sound-toggle');
    if (btn) btn.textContent = sfx.enabled ? '🔊' : '🔇';
});
