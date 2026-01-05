// AIDEV-NOTE: Centralized drag-and-drop manager
// Single source of truth for all drag state and logic

import { CONFIG } from '../config.js';

export class DragManager {
    constructor() {
        // Drag state
        this.draggedTile = null;
        this.sourceContainer = null;
        this.sourceIndex = -1;
        
        // Current mouse position
        this.mouseX = 0;
        this.mouseY = 0;
        
        // Current hover target
        this.hoverContainer = null;
        this.hoverIndex = -1;
        
        // All containers that can receive drops
        this.containers = [];
    }
    
    // Register a container (rack or lane) that can participate in drag-drop
    registerContainer(container) {
        if (!this.containers.includes(container)) {
            this.containers.push(container);
        }
    }
    
    // Unregister a container
    unregisterContainer(container) {
        const index = this.containers.indexOf(container);
        if (index !== -1) {
            this.containers.splice(index, 1);
        }
    }
    
    // Check if currently dragging
    isDragging() {
        return this.draggedTile !== null;
    }
    
    // Pick up a tile from a container
    pickUp(container, index) {
        if (this.draggedTile) return false; // Already dragging
        
        const tile = container.removeTile(index);
        if (!tile) return false;
        
        this.draggedTile = tile;
        this.sourceContainer = container;
        this.sourceIndex = index;
        
        // Position tile at current mouse
        tile.setPosition(this.mouseX - CONFIG.TILE_SIZE / 2, this.mouseY - CONFIG.TILE_SIZE / 2);
        
        return true;
    }
    
    // Update drag position and find hover target
    moveTo(x, y) {
        this.mouseX = x;
        this.mouseY = y;
        
        if (!this.draggedTile) return;
        
        // Update tile position to follow mouse
        this.draggedTile.setPosition(x - CONFIG.TILE_SIZE / 2, y - CONFIG.TILE_SIZE / 2);
        
        // Find which container we're hovering over
        let newHoverContainer = null;
        let newHoverIndex = -1;
        
        for (const container of this.containers) {
            // Skip locked lanes
            if (container.locked) continue;
            
            if (container.containsPoint(x, y)) {
                // Don't show gap if container is full
                if (container.isFull()) continue;
                
                newHoverContainer = container;
                newHoverIndex = container.getInsertionIndex(x);
                break;
            }
        }
        
        // Update gap preview if hover target changed
        if (newHoverContainer !== this.hoverContainer || newHoverIndex !== this.hoverIndex) {
            // Hide gap on old container
            if (this.hoverContainer && this.hoverContainer !== newHoverContainer) {
                this.hoverContainer.hideGap();
            }
            
            // Show gap on new container
            if (newHoverContainer) {
                newHoverContainer.showGapAt(newHoverIndex);
            }
            
            this.hoverContainer = newHoverContainer;
            this.hoverIndex = newHoverIndex;
        }
    }
    
    // Drop the tile at current position
    drop() {
        if (!this.draggedTile) return null;
        
        const tile = this.draggedTile;
        let result = null;
        
        // Try to drop at hover target
        if (this.hoverContainer && this.hoverIndex >= 0) {
            this.hoverContainer.insertTileAt(tile, this.hoverIndex);
            this.hoverContainer.hideGap();
            result = {
                type: this.hoverContainer.containerType || 'container',
                container: this.hoverContainer,
                index: this.hoverIndex
            };
        } else {
            // Return to source
            this.sourceContainer.insertTileAt(tile, this.sourceIndex);
            result = { type: 'returned', container: this.sourceContainer };
        }
        
        // Clear all gaps
        for (const container of this.containers) {
            container.hideGap();
        }
        
        // Clear drag state
        this.draggedTile = null;
        this.sourceContainer = null;
        this.sourceIndex = -1;
        this.hoverContainer = null;
        this.hoverIndex = -1;
        
        return result;
    }
    
    // Cancel drag and return tile to source
    cancel() {
        if (!this.draggedTile) return;
        
        // Return to source
        this.sourceContainer.insertTileAt(this.draggedTile, this.sourceIndex);
        
        // Clear all gaps
        for (const container of this.containers) {
            container.hideGap();
        }
        
        // Clear drag state
        this.draggedTile = null;
        this.sourceContainer = null;
        this.sourceIndex = -1;
        this.hoverContainer = null;
        this.hoverIndex = -1;
    }
    
    // Draw the dragged tile (call this last in render loop)
    draw(ctx, assets) {
        if (!this.draggedTile) return;
        
        this.draggedTile.draw(ctx, assets);
    }
    
    // Get tile at position from any registered container
    getTileAt(x, y) {
        for (const container of this.containers) {
            if (container.locked) continue;
            
            const hit = container.getTileAtPosition(x, y);
            if (hit) {
                return {
                    container,
                    tile: hit.tile,
                    index: hit.index
                };
            }
        }
        return null;
    }
}

// Singleton instance
export const dragManager = new DragManager();
export default dragManager;

