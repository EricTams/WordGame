// AIDEV-NOTE: TileSet manages the pool of letter tiles with Scrabble distribution
// Tracks powered tiles across levels and handles drawing/returning tiles

import { CONFIG } from '../config.js';
import { Tile } from '../entities/tile.js';

export class TileSet {
    constructor() {
        // Persistent collection (accumulates powered tiles across levels)
        this.persistentTiles = [];
        
        // Current level draw pile (shuffled from persistent)
        this.remainingTiles = [];
        
        // Initialize with standard Scrabble distribution
        this.initializePersistentCollection();
    }
    
    // Initialize the base tile collection from Scrabble distribution
    initializePersistentCollection() {
        this.persistentTiles = [];
        
        for (const [letter, count] of Object.entries(CONFIG.LETTER_DISTRIBUTION)) {
            for (let i = 0; i < count; i++) {
                // Store as simple letter string (no power)
                this.persistentTiles.push(letter.toUpperCase());
            }
        }
        
        // Shuffle to start
        this.reset();
    }
    
    // Reset for a new level (shuffle persistent collection)
    reset() {
        // Copy persistent tiles to remaining
        this.remainingTiles = [...this.persistentTiles];
        this.shuffle();
    }
    
    // Shuffle the remaining tiles
    shuffle() {
        for (let i = this.remainingTiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.remainingTiles[i], this.remainingTiles[j]] = 
            [this.remainingTiles[j], this.remainingTiles[i]];
        }
    }
    
    // Draw a random tile from the set
    drawTile(specificLetter = null) {
        if (this.remainingTiles.length === 0) {
            return null;
        }
        
        // If requesting a specific letter, find it
        if (specificLetter) {
            const letter = specificLetter.toUpperCase();
            const index = this.remainingTiles.findIndex(t => {
                const tileLetter = typeof t === 'object' ? t.letter : t;
                return tileLetter.toUpperCase() === letter;
            });
            
            if (index === -1) return null;
            
            const tileData = this.remainingTiles.splice(index, 1)[0];
            return this.createTileFromData(tileData);
        }
        
        // Draw random tile
        const index = Math.floor(Math.random() * this.remainingTiles.length);
        const tileData = this.remainingTiles.splice(index, 1)[0];
        return this.createTileFromData(tileData);
    }
    
    // Create a Tile object from stored data
    createTileFromData(tileData) {
        if (typeof tileData === 'object' && tileData.power) {
            // Powered tile
            const type = this.getTileTypeForPower(tileData.power);
            return new Tile(tileData.letter, type);
        } else {
            // Regular tile (stored as string)
            return new Tile(tileData, CONFIG.TILE_TYPES.MAIN);
        }
    }
    
    // Check if a specific letter is available to draw
    canDrawLetter(letter) {
        const target = letter.toUpperCase();
        return this.remainingTiles.some(t => {
            const tileLetter = typeof t === 'object' ? t.letter : t;
            return tileLetter.toUpperCase() === target;
        });
    }
    
    // Return a tile to the draw pile
    returnTile(tile) {
        if (!tile || !tile.letter) return;
        
        const power = this.getPowerForTileType(tile.type);
        if (power) {
            // Return as powered tile
            this.remainingTiles.push({ letter: tile.letter, power: power });
        } else {
            // Return as regular letter
            this.remainingTiles.push(tile.letter);
        }
    }
    
    // Add powered tiles to the persistent collection (from rewards)
    addPoweredTiles(letterDataList) {
        if (!letterDataList) return;
        
        for (const data of letterDataList) {
            this.persistentTiles.push({
                letter: data.letter.toUpperCase(),
                power: data.power
            });
        }
    }
    
    // Get tile type for a power
    getTileTypeForPower(power) {
        const mapping = {
            'shield': CONFIG.TILE_TYPES.ICE,
            'heal': CONFIG.TILE_TYPES.FLOWER,
            'meteor': CONFIG.TILE_TYPES.GOLD
        };
        return mapping[power] || CONFIG.TILE_TYPES.MAIN;
    }
    
    // Get power for a tile type
    getPowerForTileType(tileType) {
        const mapping = {
            [CONFIG.TILE_TYPES.ICE]: 'shield',
            [CONFIG.TILE_TYPES.FLOWER]: 'heal',
            [CONFIG.TILE_TYPES.GOLD]: 'meteor'
        };
        return mapping[tileType] || null;
    }
    
    // Get count of remaining tiles
    getRemainingCount() {
        return this.remainingTiles.length;
    }
    
    // Get total tiles in persistent collection
    getTotalCount() {
        return this.persistentTiles.length;
    }
    
    // Get count of powered tiles in persistent collection
    getPoweredTileCount() {
        return this.persistentTiles.filter(t => typeof t === 'object' && t.power).length;
    }
    
    // Get breakdown of powered tiles by type
    getPoweredTileBreakdown() {
        const breakdown = { shield: 0, heal: 0, meteor: 0 };
        
        for (const tile of this.persistentTiles) {
            if (typeof tile === 'object' && tile.power) {
                breakdown[tile.power] = (breakdown[tile.power] || 0) + 1;
            }
        }
        
        return breakdown;
    }
    
    // Get random unupgraded (non-powered) tiles for selection UI
    getRandomUnupgradedTiles(count) {
        const unupgraded = this.persistentTiles
            .filter(t => typeof t === 'string')
            .map(t => t.toUpperCase());
        
        // Shuffle and take requested count
        for (let i = unupgraded.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [unupgraded[i], unupgraded[j]] = [unupgraded[j], unupgraded[i]];
        }
        
        return unupgraded.slice(0, count);
    }
}

export default TileSet;

