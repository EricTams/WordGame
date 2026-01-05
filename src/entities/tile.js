// AIDEV-NOTE: Letter tile entity with type-based sprites
// Tile types: main, steel, ice (shield), flower (heal), gold (meteor)

import { CONFIG } from '../config.js';

export class Tile {
    constructor(letter, type = 'main') {
        this.letter = letter.toUpperCase();
        this.type = type;
        
        // Position (set by container)
        this.x = 0;
        this.y = 0;
        
        // Visual size
        this.width = CONFIG.TILE_SIZE;
        this.height = CONFIG.TILE_SIZE;
        
        // Animation state
        this.targetX = 0;
        this.targetY = 0;
        this.isAnimating = false;
        this.shaking = false;
        this.shakeOffset = 0;
        this.selected = false;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.targetX = x;
        this.targetY = y;
    }
    
    // Animate to a new position
    animateTo(x, y, duration = CONFIG.ANIM.TILE_MOVE) {
        this.targetX = x;
        this.targetY = y;
        this.isAnimating = true;
        this.animDuration = duration;
        this.animStartTime = performance.now();
        this.animStartX = this.x;
        this.animStartY = this.y;
    }
    
    // Start shake animation (for invalid word)
    shake(duration = CONFIG.ANIM.TILE_SHAKE) {
        this.shaking = true;
        this.shakeStartTime = performance.now();
        this.shakeDuration = duration;
    }
    
    update(dt) {
        // Handle position animation
        if (this.isAnimating) {
            const elapsed = performance.now() - this.animStartTime;
            const progress = Math.min(elapsed / this.animDuration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.x = this.animStartX + (this.targetX - this.animStartX) * eased;
            this.y = this.animStartY + (this.targetY - this.animStartY) * eased;
            
            if (progress >= 1) {
                this.isAnimating = false;
                this.x = this.targetX;
                this.y = this.targetY;
            }
        }
        
        // Handle shake animation
        if (this.shaking) {
            const elapsed = performance.now() - this.shakeStartTime;
            const progress = elapsed / this.shakeDuration;
            
            if (progress >= 1) {
                this.shaking = false;
                this.shakeOffset = 0;
            } else {
                // Shake back and forth with decreasing amplitude
                const amplitude = 6 * (1 - progress);
                this.shakeOffset = Math.sin(progress * Math.PI * 8) * amplitude;
            }
        }
    }
    
    draw(ctx, assets) {
        const drawX = this.x + this.shakeOffset;
        const drawY = this.y;
        const radius = 8;
        
        // Draw tile background - simple rounded rectangle
        const colors = this.getTileColors();
        
        // Main fill
        ctx.fillStyle = colors.fill;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, this.width, this.height, radius);
        ctx.fill();
        
        // Inner highlight (top-left lighter)
        const gradient = ctx.createLinearGradient(drawX, drawY, drawX, drawY + this.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, this.width, this.height, radius);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(drawX, drawY, this.width, this.height, radius);
        ctx.stroke();
        
        // Draw letter
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${Math.floor(this.width * 0.5)}px Nunito`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
            this.letter,
            drawX + this.width / 2,
            drawY + this.height / 2 + 1
        );
        
        // Draw selection highlight
        if (this.selected) {
            ctx.strokeStyle = CONFIG.COLORS.GREEN;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(drawX - 2, drawY - 2, this.width + 4, this.height + 4, radius + 2);
            ctx.stroke();
        }
    }
    
    getTileColors() {
        // Cozy color schemes for each tile type
        const colorSchemes = {
            'main': {
                fill: '#E8C9A0',      // Warm wood
                border: '#8B7355',     // Brown border
                text: '#4A3728'        // Dark brown text
            },
            'steel': {
                fill: '#B8B8B8',       // Silver/gray
                border: '#666666',     // Dark gray border
                text: '#2A2A2A'        // Near black text
            },
            'ice': {
                fill: '#C5E8F7',       // Light ice blue
                border: '#6BA3C7',     // Medium blue border
                text: '#2B5A7A'        // Dark blue text
            },
            'flower': {
                fill: '#C8E6B8',       // Soft green
                border: '#6B9B5A',     // Green border
                text: '#2A4A20'        // Dark green text
            },
            'gold': {
                fill: '#FFE066',       // Bright gold
                border: '#CC9900',     // Dark gold border
                text: '#664400'        // Brown text
            }
        };
        return colorSchemes[this.type] || colorSchemes.main;
    }
    
    // Check if a point is inside this tile
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height;
    }
    
    // Get the power associated with this tile type
    getPower() {
        const power = CONFIG.TILE_POWERS[this.type];
        return power ? power.type : null;
    }
    
    // Clone this tile
    clone() {
        const tile = new Tile(this.letter, this.type);
        tile.setPosition(this.x, this.y);
        return tile;
    }
}

export default Tile;

