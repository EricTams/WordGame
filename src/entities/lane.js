// AIDEV-NOTE: Word lane - holds tiles to form words
// Extends TileContainer with ownership and damage calculation

import { CONFIG } from '../config.js';
import { TileContainer } from './tile_container.js';

export class Lane extends TileContainer {
    constructor(index) {
        super(CONFIG.LANE_MAX_TILES);
        
        this.index = index;
        this.containerType = 'lane';
        this.tileSpacing = CONFIG.LANE_TILE_SPACING;
        this.height = CONFIG.LANE_HEIGHT;
        
        // Ownership: null (neutral), 1 (player), 2 (enemy)
        this.owner = null;
        this.temporaryOwner = null;
        
        // State
        this.visible = true;
        this.locked = false;
        
        // Track tile count at turn start
        this.startTurnTileCount = 0;
    }
    
    get width() {
        return (this.maxTiles * CONFIG.TILE_SIZE) + 
               ((this.maxTiles - 1) * this.tileSpacing) + 32;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.repositionTiles(false);
    }
    
    // Override to center tiles in lane
    repositionTiles(animate = true) {
        const slotWidth = CONFIG.TILE_SIZE + this.tileSpacing;
        const numSlots = this.tiles.length + (this.gapIndex >= 0 ? 1 : 0);
        const totalWidth = numSlots > 0 ? numSlots * slotWidth - this.tileSpacing : 0;
        const startX = this.x + (this.width - totalWidth) / 2;
        const tileY = this.y + (this.height - CONFIG.TILE_SIZE) / 2;
        
        for (let i = 0; i < this.tiles.length; i++) {
            let adjustedIndex = i;
            
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
    
    // Override to respect locked state
    removeTile(index) {
        if (this.locked) return null;
        return super.removeTile(index);
    }
    
    // Override to account for centered tiles
    getInsertionIndex(x) {
        const slotWidth = CONFIG.TILE_SIZE + this.tileSpacing;
        const numSlots = this.tiles.length + 1; // +1 for the gap we're inserting
        const totalWidth = numSlots * slotWidth - this.tileSpacing;
        const startX = this.x + (this.width - totalWidth) / 2;
        
        const relativeX = x - startX;
        let index = Math.floor((relativeX + slotWidth / 2) / slotWidth);
        return Math.max(0, Math.min(index, this.tiles.length));
    }
    
    // Get the word formed by tiles
    getWord() {
        return this.tiles.map(t => t.letter).join('');
    }
    
    // Set owner and convert tiles to steel
    setOwner(playerNumber) {
        this.owner = playerNumber;
        this.temporaryOwner = null;
        
        for (const tile of this.tiles) {
            tile.type = CONFIG.TILE_TYPES.STEEL;
        }
    }
    
    setTemporaryOwner(playerNumber) {
        this.temporaryOwner = playerNumber;
    }
    
    clearTemporaryOwner() {
        this.temporaryOwner = null;
    }
    
    getEffectiveOwner() {
        return this.temporaryOwner !== null ? this.temporaryOwner : this.owner;
    }
    
    calculateDamage() {
        if (!this.getEffectiveOwner()) return 0;
        return this.tiles.length;
    }
    
    getSpecialEffects() {
        const effects = { shield: 0, heal: 0, meteor: 0 };
        for (const tile of this.tiles) {
            const power = tile.getPower();
            if (power && effects.hasOwnProperty(power)) {
                effects[power]++;
            }
        }
        return effects;
    }
    
    hasNewTiles() {
        return this.tiles.length > this.startTurnTileCount;
    }
    
    saveTurnStartState() {
        this.startTurnTileCount = this.tiles.length;
    }
    
    lock() { this.locked = true; }
    unlock() { this.locked = false; }
    show() { this.visible = true; }
    hide() { this.visible = false; }
    
    clear() {
        const removed = super.clear();
        this.owner = null;
        this.temporaryOwner = null;
        return removed;
    }
    
    draw(ctx, assets) {
        if (!this.visible) return;
        
        // Background color based on ownership
        const effectiveOwner = this.getEffectiveOwner();
        let bgColor, borderColor;
        
        if (effectiveOwner === 1) {
            bgColor = 'rgba(125, 155, 118, 0.3)';
            borderColor = '#7D9B76';
        } else if (effectiveOwner === 2) {
            bgColor = 'rgba(212, 114, 106, 0.3)';
            borderColor = '#D4726A';
        } else {
            bgColor = 'rgba(168, 144, 120, 0.2)';
            borderColor = CONFIG.COLORS.BROWN;
        }
        
        // Draw background
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 12);
        ctx.fill();
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 12);
        ctx.stroke();
        
        // Locked overlay
        if (this.locked) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.beginPath();
            ctx.roundRect(this.x, this.y, this.width, this.height, 12);
            ctx.fill();
        }
        
        // Gap indicator
        if (this.gapIndex >= 0) {
            const slotWidth = CONFIG.TILE_SIZE + this.tileSpacing;
            const numSlots = this.tiles.length + 1;
            const totalWidth = numSlots * slotWidth - this.tileSpacing;
            const startX = this.x + (this.width - totalWidth) / 2;
            const gapX = startX + this.gapIndex * slotWidth;
            const gapY = this.y + (this.height - CONFIG.TILE_SIZE) / 2;
            
            ctx.fillStyle = 'rgba(125, 155, 118, 0.4)';
            ctx.fillRect(gapX, gapY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }
        
        // Draw tiles
        super.draw(ctx, assets);
        
        // Damage indicator
        if (effectiveOwner && this.tiles.length > 0) {
            this.drawDamageIndicator(ctx, effectiveOwner);
        }
    }
    
    drawDamageIndicator(ctx, owner) {
        const damage = this.calculateDamage();
        
        const indicatorX = owner === 1 
            ? this.x + this.width + 8
            : this.x - 48;
        const indicatorY = this.y + this.height / 2;
        
        // Damage circle
        ctx.beginPath();
        ctx.arc(indicatorX + 20, indicatorY, 20, 0, Math.PI * 2);
        ctx.fillStyle = owner === 1 ? CONFIG.COLORS.GREEN : CONFIG.COLORS.RED;
        ctx.fill();
        ctx.strokeStyle = CONFIG.COLORS.BROWN_DARK;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Damage number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px Nunito';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(damage.toString(), indicatorX + 20, indicatorY);
    }
}

export default Lane;
