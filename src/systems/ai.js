// AIDEV-NOTE: AI system for enemy turns
// Finds valid words using available tiles and lane letters

import { CONFIG } from '../config.js';
import { dictionary } from './dictionary.js';
import { animationManager } from './animation.js';

export class AI {
    constructor(board, difficulty = 3) {
        this.board = board;
        this.difficulty = difficulty;
        
        // State machine for AI turn
        this.state = 'idle';  // idle, thinking, playing, complete
        this.currentLaneIndex = 0;
        this.thinkTimer = 0;
        this.laneOrder = [];
    }
    
    // Start AI turn
    startTurn() {
        this.state = 'thinking';
        this.currentLaneIndex = 0;
        this.thinkTimer = CONFIG.AI.THINK_DELAY;
        
        // Randomize lane order
        this.laneOrder = [0, 1, 2];
        this.shuffleArray(this.laneOrder);
        
        console.log('AI turn started, lane order:', this.laneOrder);
    }
    
    // Update AI (called each frame)
    update(dt) {
        if (this.state === 'idle' || this.state === 'complete') {
            return this.state;
        }
        
        // Wait for animations
        if (animationManager.isAnimating()) {
            return this.state;
        }
        
        // Thinking delay
        if (this.state === 'thinking') {
            this.thinkTimer -= dt * 1000;
            if (this.thinkTimer <= 0) {
                this.tryPlayLane();
            }
        }
        
        return this.state;
    }
    
    // Try to play in the current lane
    tryPlayLane() {
        if (this.currentLaneIndex >= this.laneOrder.length) {
            // Done with all lanes
            this.state = 'complete';
            return;
        }
        
        const laneIndex = this.laneOrder[this.currentLaneIndex];
        const lane = this.board.lanes[laneIndex];
        
        // Skip hidden or locked lanes
        if (!lane.visible || lane.locked) {
            this.currentLaneIndex++;
            this.thinkTimer = CONFIG.AI.MOVE_DELAY;
            this.state = 'thinking';
            return;
        }
        
        // Try to find and play a word
        const played = this.playBestWord(laneIndex);
        
        // Move to next lane
        this.currentLaneIndex++;
        this.thinkTimer = CONFIG.AI.MOVE_DELAY;
        this.state = 'thinking';
        
        if (played) {
            console.log(`AI played word in lane ${laneIndex}`);
        } else {
            console.log(`AI couldn't play in lane ${laneIndex}`);
        }
    }
    
    // Find and play the best word in a lane
    playBestWord(laneIndex) {
        const lane = this.board.lanes[laneIndex];
        const rack = this.board.enemyRack;
        
        // Get available letters
        const rackLetters = rack.getLetters();
        const laneLetters = lane.tiles.map(t => t.letter);
        
        // Determine how many tiles AI will use (based on difficulty)
        const numTiles = this.calculateNumTiles(rackLetters.length);
        
        // Select random subset of rack tiles
        const selectedRackLetters = this.selectRandomLetters(rackLetters, numTiles);
        
        // Combine with lane letters
        const allLetters = [...laneLetters, ...selectedRackLetters];
        
        console.log(`AI trying lane ${laneIndex} with letters: ${allLetters.join('')}`);
        console.log(`  Lane: ${laneLetters.join('')}, Rack selection: ${selectedRackLetters.join('')}`);
        
        // Find valid words
        const word = this.findBestWord(allLetters, laneLetters);
        
        if (!word) {
            return false;
        }
        
        console.log(`AI found word: ${word}`);
        
        // Play the word
        return this.playWord(laneIndex, word, laneLetters, selectedRackLetters);
    }
    
    // Calculate how many tiles to use based on difficulty
    calculateNumTiles(maxTiles) {
        const diffSettings = Object.values(CONFIG.DIFFICULTY)[this.difficulty - 1] || CONFIG.DIFFICULTY.MEDIUM;
        
        // Random binomial distribution
        let count = CONFIG.AI.MIN_TILES;
        for (let i = 0; i < 3; i++) {
            if (Math.random() < diffSettings.tileProb) {
                count++;
            }
        }
        
        return Math.min(count, maxTiles, CONFIG.AI.MAX_TILES);
    }
    
    // Calculate how far into dictionary to search based on difficulty
    calculateDictLimit() {
        const diffSettings = Object.values(CONFIG.DIFFICULTY)[this.difficulty - 1] || CONFIG.DIFFICULTY.MEDIUM;
        const maxSize = dictionary.getSize();
        return Math.floor(maxSize / diffSettings.dictDivisor);
    }
    
    // Select random letters from available
    selectRandomLetters(letters, count) {
        const available = [...letters];
        const selected = [];
        
        for (let i = 0; i < count && available.length > 0; i++) {
            const index = Math.floor(Math.random() * available.length);
            selected.push(available.splice(index, 1)[0]);
        }
        
        return selected;
    }
    
    // Find the best word that can be formed from letters
    findBestWord(allLetters, requiredLetters) {
        const dictLimit = this.calculateDictLimit();
        const requiredCounts = this.getLetterCounts(requiredLetters);
        const availableCounts = this.getLetterCounts(allLetters);
        
        let bestWord = null;
        let bestLength = 0;
        
        // Search dictionary up to limit
        for (let i = 0; i < dictLimit; i++) {
            const entry = dictionary.getWordByRank(i);
            if (!entry) break;
            
            const word = entry.word;
            
            // Skip if word is same length as required (can't steal without adding)
            if (word.length <= requiredLetters.length && requiredLetters.length > 0) {
                continue;
            }
            
            // Skip short words
            if (word.length < CONFIG.MIN_WORD_LENGTH) continue;
            
            // Check if word can be formed
            if (!this.canFormWord(entry.letters, availableCounts)) continue;
            
            // Check if word contains all required letters
            if (!this.containsAllLetters(entry.letters, requiredCounts)) continue;
            
            // Prefer longer words
            if (word.length > bestLength) {
                bestWord = word;
                bestLength = word.length;
            }
        }
        
        return bestWord;
    }
    
    // Play a word in a lane
    playWord(laneIndex, word, laneLetters, rackLetters) {
        const lane = this.board.lanes[laneIndex];
        const rack = this.board.enemyRack;
        const tileSet = this.board.enemyTileSet;
        
        // Track which letters we've used
        const usedLane = {};
        const usedRack = {};
        
        // Clear the lane
        const oldTiles = lane.clear();
        
        // Return old tiles to tile set
        for (const tile of oldTiles) {
            tileSet.returnTile(tile);
        }
        
        // Build the word using available tiles
        for (const letter of word.toUpperCase()) {
            // Try to use lane letter first
            let found = false;
            for (let i = 0; i < laneLetters.length; i++) {
                if (!usedLane[i] && laneLetters[i] === letter) {
                    const tile = tileSet.drawTile(letter);
                    if (tile) {
                        lane.addTile(tile);
                        usedLane[i] = true;
                        found = true;
                        break;
                    }
                }
            }
            
            // Try rack letters
            if (!found) {
                for (let i = 0; i < rackLetters.length; i++) {
                    if (!usedRack[i] && rackLetters[i] === letter) {
                        // Remove from rack
                        const rackIndex = rack.tiles.findIndex((t, idx) => 
                            t.letter === letter && !usedRack[idx]);
                        
                        if (rackIndex !== -1) {
                            const tile = rack.removeTile(rackIndex);
                            lane.addTile(tile);
                            usedRack[i] = true;
                            found = true;
                            break;
                        }
                    }
                }
            }
            
            // If we couldn't find the letter, something went wrong
            if (!found) {
                console.error(`AI couldn't find letter ${letter} to play word ${word}`);
                return false;
            }
        }
        
        // Set lane ownership
        lane.setOwner(2);  // AI is player 2
        
        return true;
    }
    
    // Get letter counts for an array or word
    getLetterCounts(letters) {
        const counts = {};
        const arr = Array.isArray(letters) ? letters : letters.split('');
        
        for (const letter of arr) {
            const l = letter.toLowerCase();
            counts[l] = (counts[l] || 0) + 1;
        }
        
        return counts;
    }
    
    // Check if word can be formed from available letters
    canFormWord(wordLetters, availableCounts) {
        for (const [letter, count] of Object.entries(wordLetters)) {
            if ((availableCounts[letter] || 0) < count) {
                return false;
            }
        }
        return true;
    }
    
    // Check if word contains all required letters
    containsAllLetters(wordLetters, requiredCounts) {
        for (const [letter, count] of Object.entries(requiredCounts)) {
            if ((wordLetters[letter] || 0) < count) {
                return false;
            }
        }
        return true;
    }
    
    // Shuffle array in place
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    // Reset AI state
    reset() {
        this.state = 'idle';
        this.currentLaneIndex = 0;
        this.thinkTimer = 0;
    }
}

export default AI;

