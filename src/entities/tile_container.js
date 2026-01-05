// AIDEV-NOTE: Base class for tile containers (Rack, Lane)
// Handles tile management and gap preview for drag-drop

import { CONFIG } from '../config.js';

export class TileContainer {
    constructor(maxTiles) {
        this.tiles = [];
        this.maxTiles = maxTiles;
        this.containerType = 'container'; // Override in subclasses
        
        // Position and dimensions (set by subclass)
        this.x = 0;
        this.y = 0;
        
        // Tile layout
        this.tileSpacing = CONFIG.RACK_TILE_SPACING;
        this.tileOffsetX = 0;
        this.tileOffsetY = 0;
        
        // Gap preview (controlled by DragManager)
        this.gapIndex = -1;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.repositionTiles(false);
    }
    
    // Add a tile to the end
    addTile(tile) {
        if (this.tiles.length >= this.maxTiles) {
            return false;
        }
        this.tiles.push(tile);
        this.repositionTiles(true);
        return true;
    }
    
    // Insert a tile at a specific index
    insertTileAt(tile, index) {
        if (this.tiles.length >= this.maxTiles) {
            return false;
        }
        
        const clampedIndex = Math.max(0, Math.min(index, this.tiles.length));
        this.tiles.splice(clampedIndex, 0, tile);
        this.gapIndex = -1; // Clear gap after insertion
        this.repositionTiles(true);
        return true;
    }
    
    // Remove tile at index and return it
    removeTile(index) {
        if (index < 0 || index >= this.tiles.length) {
            return null;
        }
        const tile = this.tiles.splice(index, 1)[0];
        this.repositionTiles(true);
        return tile;
    }
    
    // Get tile at screen position
    getTileAtPosition(x, y) {
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            if (this.tiles[i].containsPoint(x, y)) {
                return { tile: this.tiles[i], index: i };
            }
        }
        return null;
    }
    
    // Calculate insertion index for a given x position
    getInsertionIndex(x) {
        const relativeX = x - this.x - this.tileOffsetX;
        const slotWidth = CONFIG.TILE_SIZE + this.tileSpacing;
        
        let index = Math.floor((relativeX + slotWidth / 2) / slotWidth);
        return Math.max(0, Math.min(index, this.tiles.length));
    }
    
    // Show gap at index (called by DragManager)
    showGapAt(index) {
        if (this.gapIndex !== index) {
            this.gapIndex = index;
            this.repositionTiles(true);
        }
    }
    
    // Hide gap (called by DragManager)
    hideGap() {
        if (this.gapIndex !== -1) {
            this.gapIndex = -1;
            this.repositionTiles(true);
        }
    }
    
    // Reposition all tiles (subclasses can override for custom layout)
    repositionTiles(animate = true) {
        const slotWidth = CONFIG.TILE_SIZE + this.tileSpacing;
        const startX = this.x + this.tileOffsetX;
        const tileY = this.y + this.tileOffsetY;
        
        for (let i = 0; i < this.tiles.length; i++) {
            let adjustedIndex = i;
            
            // Shift tiles after gap position to the right
            if (this.gapIndex >= 0 && i >= this.gapIndex) {
                adjustedIndex = i + 1;
            }
            
            const tileX = startX + adjustedIndex * slotWidth;
            
            if (animate) {
                this.tiles[i].animateTo(tileX, tileY);
            } else {
                this.tiles[i].setPosition(tileX, tileY);
            }
        }
    }
    
    // Check if container is full
    isFull() {
        return this.tiles.length >= this.maxTiles;
    }
    
    // Check if container is empty
    isEmpty() {
        return this.tiles.length === 0;
    }
    
    // Check if point is inside container bounds
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
    
    // Get all letters
    getLetters() {
        return this.tiles.map(t => t.letter);
    }
    
    // Clear all tiles
    clear() {
        const removed = [...this.tiles];
        this.tiles = [];
        this.gapIndex = -1;
        return removed;
    }
    
    // Update tile animations
    update(dt) {
        for (const tile of this.tiles) {
            tile.update(dt);
        }
    }
    
    // Draw all tiles
    draw(ctx, assets) {
        for (const tile of this.tiles) {
            tile.draw(ctx, assets);
        }
    }
    
    // Draw gap indicator (if showing)
    drawGapIndicator(ctx) {
        if (this.gapIndex < 0) return;
        
        const slotWidth = CONFIG.TILE_SIZE + this.tileSpacing;
        const gapX = this.x + this.tileOffsetX + (this.gapIndex * slotWidth);
        const gapY = this.y + this.tileOffsetY;
        
        ctx.fillStyle = 'rgba(125, 155, 118, 0.4)';
        ctx.fillRect(gapX, gapY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
    }
}

export default TileContainer;
