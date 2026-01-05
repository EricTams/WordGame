// AIDEV-NOTE: Dictionary system for word validation
// Supports player-specific dictionaries with relic word additions

import { DICTIONARY } from '../data/dictionary_data.js';

class DictionarySystem {
    constructor() {
        // Main dictionary (loaded from data file)
        this.mainDictionary = DICTIONARY;
        
        // Player-specific additional words (from relics)
        this.playerWords = {
            1: [],  // Player 1's extra words
            2: []   // Player 2's extra words
        };
        
        // Word lookup set for fast checking
        this.mainWordSet = new Set(DICTIONARY.map(entry => entry.word.toLowerCase()));
        
        console.log(`Dictionary loaded with ${this.mainDictionary.length} words`);
    }
    
    // Check if a word exists in the dictionary
    wordExists(word, playerNumber = null) {
        const lowerWord = word.toLowerCase();
        
        // Check player-specific words first if player specified
        if (playerNumber !== null) {
            for (const entry of this.playerWords[playerNumber]) {
                if (entry.word.toLowerCase() === lowerWord) {
                    return true;
                }
            }
        }
        
        // Check main dictionary
        return this.mainWordSet.has(lowerWord);
    }
    
    // Get full word entry (with letter counts) if it exists
    getWordEntry(word, playerNumber = null) {
        const lowerWord = word.toLowerCase();
        
        // Check player words first
        if (playerNumber !== null) {
            for (const entry of this.playerWords[playerNumber]) {
                if (entry.word.toLowerCase() === lowerWord) {
                    return entry;
                }
            }
        }
        
        // Check main dictionary
        for (const entry of this.mainDictionary) {
            if (entry.word.toLowerCase() === lowerWord) {
                return entry;
            }
        }
        
        return null;
    }
    
    // Get the complete dictionary for a player (main + player words)
    getPlayerDictionary(playerNumber) {
        return [...this.playerWords[playerNumber], ...this.mainDictionary];
    }
    
    // Add words to a player's dictionary (from relics)
    addPlayerWords(playerNumber, words) {
        for (const word of words) {
            const entry = {
                word: word.toLowerCase(),
                letters: this.getLetterCounts(word)
            };
            this.playerWords[playerNumber].push(entry);
        }
    }
    
    // Clear a player's additional words
    clearPlayerWords(playerNumber) {
        this.playerWords[playerNumber] = [];
    }
    
    // Get letter counts for a word
    getLetterCounts(word) {
        const counts = {};
        for (const char of word.toLowerCase()) {
            if (/[a-z]/.test(char)) {
                counts[char] = (counts[char] || 0) + 1;
            }
        }
        return counts;
    }
    
    // Check if a word can be formed from available letters
    canFormWord(word, availableLetters) {
        const wordCounts = this.getLetterCounts(word);
        const available = this.getLetterCounts(availableLetters.join(''));
        
        for (const [letter, count] of Object.entries(wordCounts)) {
            if ((available[letter] || 0) < count) {
                return false;
            }
        }
        
        return true;
    }
    
    // Find valid words from available letters
    findValidWords(availableLetters, requiredLetters = [], minLength = 2, maxResults = 100) {
        const available = this.getLetterCounts(availableLetters.join(''));
        const required = this.getLetterCounts(requiredLetters.join(''));
        const results = [];
        
        for (const entry of this.mainDictionary) {
            if (entry.word.length < minLength) continue;
            if (results.length >= maxResults) break;
            
            // Check if word contains all required letters
            let hasRequired = true;
            for (const [letter, count] of Object.entries(required)) {
                if ((entry.letters[letter] || 0) < count) {
                    hasRequired = false;
                    break;
                }
            }
            
            if (!hasRequired) continue;
            
            // Check if word can be formed from available letters
            let canForm = true;
            for (const [letter, count] of Object.entries(entry.letters)) {
                if ((available[letter] || 0) < count) {
                    canForm = false;
                    break;
                }
            }
            
            if (canForm) {
                results.push(entry);
            }
        }
        
        return results;
    }
    
    // Get word by rank (index in dictionary)
    getWordByRank(rank) {
        if (rank < 0 || rank >= this.mainDictionary.length) {
            return null;
        }
        return this.mainDictionary[rank];
    }
    
    // Get dictionary size
    getSize() {
        return this.mainDictionary.length;
    }
}

// Singleton instance
export const dictionary = new DictionarySystem();

export default dictionary;

