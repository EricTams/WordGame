// AIDEV-NOTE: Player's tile rack - holds up to 7 tiles
// Extends TileContainer with rack-specific drawing

import { CONFIG } from '../config.js';
import { TileContainer } from './tile_container.js';

export class Rack extends TileContainer {
    constructor(playerNumber) {
        super(CONFIG.RACK_CAPACITY);
        
        this.playerNumber = playerNumber;
        this.containerType = 'rack';
        this.tileSpacing = CONFIG.RACK_TILE_SPACING;
        this.padding = CONFIG.RACK_PADDING;
        
        // Set tile offset for padding
        this.tileOffsetX = this.padding;
        this.tileOffsetY = this.padding;
    }
    
    get width() {
        const tileCount = Math.max(this.maxTiles, 1);
        return (tileCount * CONFIG.TILE_SIZE) + 
               ((tileCount - 1) * this.tileSpacing) + 
               (this.padding * 2);
    }
    
    get height() {
        return CONFIG.TILE_SIZE + (this.padding * 2);
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.tileOffsetX = this.padding;
        this.tileOffsetY = this.padding;
        this.repositionTiles(false);
    }
    
    draw(ctx, assets) {
        // Draw rack background
        ctx.fillStyle = this.playerNumber === 1 
            ? CONFIG.COLORS.BROWN_LIGHT 
            : CONFIG.COLORS.BROWN;
        
        const radius = 12;
        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, radius);
        ctx.fill();
        
        // Border
        ctx.strokeStyle = CONFIG.COLORS.BROWN_DARK;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw gap indicator
        this.drawGapIndicator(ctx);
        
        // Draw tiles
        super.draw(ctx, assets);
    }
}

export default Rack;
