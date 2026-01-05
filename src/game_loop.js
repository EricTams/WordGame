// AIDEV-NOTE: Game loop manager using requestAnimationFrame
// Handles timing, delta time calculation, and frame updates

export class GameLoop {
    constructor(updateCallback, renderCallback) {
        this.updateCallback = updateCallback;
        this.renderCallback = renderCallback;
        this.lastTime = 0;
        this.running = false;
        this.animationFrameId = null;
        
        // Bind the loop function to preserve context
        this.loop = this.loop.bind(this);
    }
    
    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.animationFrameId = requestAnimationFrame(this.loop);
    }
    
    stop() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    loop(currentTime) {
        if (!this.running) return;
        
        // Calculate delta time in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Cap delta time to prevent spiral of death
        const cappedDelta = Math.min(deltaTime, 0.1);
        
        // Update game logic
        if (this.updateCallback) {
            this.updateCallback(cappedDelta);
        }
        
        // Render frame
        if (this.renderCallback) {
            this.renderCallback();
        }
        
        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(this.loop);
    }
    
    isRunning() {
        return this.running;
    }
}

export default GameLoop;

