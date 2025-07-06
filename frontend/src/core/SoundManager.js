/**
 * Sound Manager
 * Simple audio system for JazzyPop
 * Handles sound effects and background audio
 */

class SoundManager {
    constructor() {
        this.sounds = new Map();
        this.enabled = true;
        this.volume = 0.7;
        this.audioContext = null;
        this.initialized = false;
        
        // Sound library paths - we'll use placeholder sounds for now
        this.soundLibrary = {
            // Knock-knock sounds
            'knock': { type: 'effect', variations: ['knock1', 'knock2', 'knock3'] },
            'laugh_track': { type: 'effect', variations: ['laugh1', 'laugh2', 'laugh3'] },
            'whos_there': { type: 'voice', variations: ['whos_there1', 'whos_there2'] },
            'wa_wa_who': { type: 'voice', variations: ['wa_wa_who1'] },
            
            // Stingers
            'tada': { type: 'stinger', variations: ['tada1'] },
            'slide_whistle': { type: 'stinger', variations: ['slide1'] },
            'drum_roll': { type: 'stinger', variations: ['drum1'] },
            'rimshot': { type: 'stinger', variations: ['rimshot1'] },
            'sad_trombone': { type: 'stinger', variations: ['trombone1'] },
            
            // UI sounds
            'click': { type: 'ui', variations: ['click1'] },
            'success': { type: 'ui', variations: ['success1'] },
            'error': { type: 'ui', variations: ['error1'] },
            'flip_card': { type: 'ui', variations: ['flip1'] }
        };
        
        this.init();
    }
    
    init() {
        // Load settings
        const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        this.enabled = settings.soundEnabled !== false; // Default to true
        this.volume = settings.soundVolume || 0.7;
        
        // Listen for settings changes
        window.addEventListener('settingsChanged', (e) => {
            if (e.detail.soundEnabled !== undefined) {
                this.enabled = e.detail.soundEnabled;
            }
            if (e.detail.soundVolume !== undefined) {
                this.volume = e.detail.soundVolume;
            }
        });
        
        // Initialize on first user interaction
        ['click', 'touchstart'].forEach(eventType => {
            document.addEventListener(eventType, () => {
                if (!this.initialized) {
                    this.initAudioContext();
                }
            }, { once: true });
        });
    }
    
    initAudioContext() {
        if (this.initialized) return;
        
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.initialized = true;
            console.log('Audio system initialized');
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    }
    
    /**
     * Play a sound effect
     * @param {string} soundName - Name from the sound library
     * @param {Object} options - { volume: 0-1, loop: boolean, variation: index }
     */
    async play(soundName, options = {}) {
        if (!this.enabled || !this.initialized) return null;
        
        const sound = this.soundLibrary[soundName];
        if (!sound) {
            console.warn(`Sound not found: ${soundName}`);
            return null;
        }
        
        // For now, use Web Audio API oscillators to create placeholder sounds
        const audioBuffer = await this.createPlaceholderSound(soundName, sound.type);
        if (!audioBuffer) return null;
        
        return this.playBuffer(audioBuffer, {
            volume: options.volume || this.volume,
            loop: options.loop || false
        });
    }
    
    /**
     * Create placeholder sounds using Web Audio API
     * In production, these would be replaced with actual audio files
     */
    async createPlaceholderSound(soundName, type) {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const duration = this.getSoundDuration(soundName);
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        switch (soundName) {
            case 'knock':
                // Simulate knock sound with low frequency pulses
                this.generateKnock(data, sampleRate);
                break;
                
            case 'laugh_track':
                // Simple white noise burst to simulate laughter
                this.generateLaughTrack(data, sampleRate);
                break;
                
            case 'whos_there':
            case 'wa_wa_who':
                // Distorted voice effect
                this.generateDistortedVoice(data, sampleRate);
                break;
                
            case 'tada':
                // Rising tone
                this.generateTada(data, sampleRate);
                break;
                
            case 'slide_whistle':
                // Sliding tone
                this.generateSlideWhistle(data, sampleRate);
                break;
                
            case 'rimshot':
                // Quick percussion
                this.generateRimshot(data, sampleRate);
                break;
                
            case 'sad_trombone':
                // Descending tone
                this.generateSadTrombone(data, sampleRate);
                break;
                
            case 'click':
            case 'flip_card':
                // Short click
                this.generateClick(data, sampleRate);
                break;
                
            case 'success':
                // Pleasant chime
                this.generateSuccess(data, sampleRate);
                break;
                
            case 'error':
                // Error buzz
                this.generateError(data, sampleRate);
                break;
                
            default:
                // Generic beep
                this.generateBeep(data, sampleRate, 440);
        }
        
        return buffer;
    }
    
    getSoundDuration(soundName) {
        const durations = {
            'knock': 0.3,
            'laugh_track': 2.0,
            'whos_there': 0.8,
            'wa_wa_who': 1.0,
            'tada': 0.8,
            'slide_whistle': 1.0,
            'rimshot': 0.5,
            'sad_trombone': 1.5,
            'click': 0.1,
            'flip_card': 0.2,
            'success': 0.6,
            'error': 0.4
        };
        
        return durations[soundName] || 0.5;
    }
    
    // Sound generation functions
    generateKnock(data, sampleRate) {
        const frequency = 80; // Low frequency for knock
        for (let i = 0; i < data.length; i++) {
            if (i < sampleRate * 0.05) {
                // Short burst
                data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 
                         Math.exp(-i / (sampleRate * 0.01));
            }
        }
    }
    
    generateLaughTrack(data, sampleRate) {
        // Filtered noise to simulate crowd laughter
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.random() - 0.5) * 0.3 * 
                     Math.sin(i / sampleRate * Math.PI); // Fade in/out
        }
    }
    
    generateDistortedVoice(data, sampleRate) {
        // Wah-wah effect using modulated frequency
        const baseFreq = 200;
        for (let i = 0; i < data.length; i++) {
            const modulation = Math.sin(2 * Math.PI * 3 * i / sampleRate);
            const frequency = baseFreq + modulation * 50;
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
        }
    }
    
    generateTada(data, sampleRate) {
        // Rising chord
        const frequencies = [261.63, 329.63, 392.00]; // C, E, G
        for (let i = 0; i < data.length; i++) {
            let sample = 0;
            frequencies.forEach(freq => {
                sample += Math.sin(2 * Math.PI * freq * i / sampleRate) / 3;
            });
            data[i] = sample * Math.exp(-i / (sampleRate * 0.8));
        }
    }
    
    generateSlideWhistle(data, sampleRate) {
        // Sliding frequency
        for (let i = 0; i < data.length; i++) {
            const progress = i / data.length;
            const frequency = 400 + progress * 800; // 400Hz to 1200Hz
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.5;
        }
    }
    
    generateRimshot(data, sampleRate) {
        // Two quick hits
        for (let i = 0; i < data.length; i++) {
            if (i < sampleRate * 0.05 || (i > sampleRate * 0.1 && i < sampleRate * 0.15)) {
                data[i] = (Math.random() - 0.5) * Math.exp(-i / (sampleRate * 0.01));
            }
        }
    }
    
    generateSadTrombone(data, sampleRate) {
        // Descending notes
        for (let i = 0; i < data.length; i++) {
            const progress = i / data.length;
            const frequency = 200 - progress * 50; // Descending
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.4;
        }
    }
    
    generateClick(data, sampleRate) {
        // Short click
        for (let i = 0; i < data.length; i++) {
            if (i < sampleRate * 0.005) {
                data[i] = (Math.random() - 0.5) * 0.5;
            }
        }
    }
    
    generateSuccess(data, sampleRate) {
        // Pleasant chime - major third
        const freq1 = 523.25; // C5
        const freq2 = 659.25; // E5
        for (let i = 0; i < data.length; i++) {
            const envelope = Math.exp(-i / (sampleRate * 0.4));
            data[i] = (Math.sin(2 * Math.PI * freq1 * i / sampleRate) +
                       Math.sin(2 * Math.PI * freq2 * i / sampleRate)) * 0.25 * envelope;
        }
    }
    
    generateError(data, sampleRate) {
        // Dissonant buzz
        const freq1 = 220;
        const freq2 = 233; // Slightly off for dissonance
        for (let i = 0; i < data.length; i++) {
            data[i] = (Math.sin(2 * Math.PI * freq1 * i / sampleRate) +
                      Math.sin(2 * Math.PI * freq2 * i / sampleRate)) * 0.3;
        }
    }
    
    generateBeep(data, sampleRate, frequency) {
        // Simple sine wave
        for (let i = 0; i < data.length; i++) {
            data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        }
    }
    
    playBuffer(buffer, options) {
        if (!this.audioContext || !buffer) return null;
        
        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.value = options.volume;
        source.loop = options.loop;
        
        source.start(0);
        
        return source;
    }
    
    /**
     * Play a random variation of a sound
     */
    playRandom(soundName, options = {}) {
        const sound = this.soundLibrary[soundName];
        if (!sound || !sound.variations) return null;
        
        const variation = Math.floor(Math.random() * sound.variations.length);
        return this.play(soundName, { ...options, variation });
    }
    
    /**
     * Stop all sounds
     */
    stopAll() {
        // In a real implementation, we'd track active sources
        // For now, this is a placeholder
    }
    
    /**
     * Preload sounds for better performance
     */
    async preload(soundNames) {
        // In production, this would load actual audio files
        // For now, we can pre-generate the buffers
        for (const soundName of soundNames) {
            if (this.soundLibrary[soundName]) {
                // Pre-generate the sound buffer
                await this.createPlaceholderSound(soundName, this.soundLibrary[soundName].type);
            }
        }
    }
}

// Create singleton instance
window.soundManager = new SoundManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SoundManager;
}