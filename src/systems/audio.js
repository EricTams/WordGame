// AIDEV-NOTE: Audio system for sound effects and music
// Handles loading, playing, and managing audio

import { CONFIG } from '../config.js';

class AudioManager {
    constructor() {
        this.sounds = {};
        this.music = null;
        this.musicVolume = 0.5;
        this.soundVolume = 0.7;
        this.isMuted = false;
        this.musicPlaying = false;
    }
    
    // Load a sound effect
    async loadSound(name, path) {
        try {
            const audio = new Audio(path);
            audio.preload = 'auto';
            this.sounds[name] = audio;
            return true;
        } catch (error) {
            console.warn(`Failed to load sound: ${path}`, error);
            return false;
        }
    }
    
    // Load all game sounds
    async loadAllSounds() {
        const soundFiles = {
            'tile-pickup': 'Tile-Pickup.mp3',
            'tile-place': 'Tile-Place.mp3',
            'tile-slide': 'Tile-SlidingV3.mp3',
            'word-accepted': 'Word-Accepted.mp3',
            'button-click': 'Button-Click.mp3',
            'win': 'Win.mp3',
            'lose': 'Lose.mp3',
            'relic-get': 'Relic-GetandSell.mp3',
            'relic-play': 'Relic-Play.mp3'
        };
        
        const promises = Object.entries(soundFiles).map(([name, file]) => 
            this.loadSound(name, `${CONFIG.PATHS.SOUNDS}${file}`)
        );
        
        await Promise.allSettled(promises);
        console.log('Audio loaded');
    }
    
    // Play a sound effect
    play(name) {
        if (this.isMuted) return;
        
        const sound = this.sounds[name];
        if (sound) {
            // Clone the audio to allow overlapping plays
            const clone = sound.cloneNode();
            clone.volume = this.soundVolume;
            clone.play().catch(() => {});
        }
    }
    
    // Load and play background music
    async playMusic(path) {
        if (this.music) {
            this.music.pause();
        }
        
        try {
            this.music = new Audio(path);
            this.music.loop = true;
            this.music.volume = this.musicVolume;
            
            if (!this.isMuted) {
                await this.music.play().catch(() => {
                    console.warn('Music autoplay blocked - waiting for user interaction');
                });
                this.musicPlaying = true;
            }
        } catch (error) {
            console.warn('Failed to load music:', error);
        }
    }
    
    // Stop background music
    stopMusic() {
        if (this.music) {
            this.music.pause();
            this.musicPlaying = false;
        }
    }
    
    // Pause music
    pauseMusic() {
        if (this.music && this.musicPlaying) {
            this.music.pause();
        }
    }
    
    // Resume music
    resumeMusic() {
        if (this.music && this.musicPlaying && !this.isMuted) {
            this.music.play().catch(() => {});
        }
    }
    
    // Set sound volume (0-1)
    setSoundVolume(volume) {
        this.soundVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Set music volume (0-1)
    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.music) {
            this.music.volume = this.musicVolume;
        }
    }
    
    // Toggle mute
    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            this.pauseMusic();
        } else {
            this.resumeMusic();
        }
        
        return this.isMuted;
    }
    
    // Set mute state
    setMuted(muted) {
        this.isMuted = muted;
        
        if (this.isMuted) {
            this.pauseMusic();
        } else {
            this.resumeMusic();
        }
    }
}

// Singleton instance
export const audioManager = new AudioManager();

export default audioManager;

