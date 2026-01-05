// AIDEV-NOTE: Simplified input handling - just mouse/touch coordinates
// Drag logic moved to DragManager

export class InputManager {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Mouse state
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;
        
        // Simple callbacks
        this.onMouseDown = null;
        this.onMouseUp = null;
        this.onMouseMove = null;
        this.onKeyDown = null;
        
        // Bind handlers
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        
        this.setupListeners();
    }
    
    setupListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        
        // Touch events
        this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        
        // Keyboard events
        window.addEventListener('keydown', this.handleKeyDown);
        
        // Prevent context menu
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }
    
    destroy() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchend', this.handleTouchEnd);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('keydown', this.handleKeyDown);
    }
    
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    handleMouseDown(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.mouseX = coords.x;
        this.mouseY = coords.y;
        this.mouseDown = true;
        
        if (this.onMouseDown) {
            this.onMouseDown(coords.x, coords.y, e.button);
        }
    }
    
    handleMouseUp(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.mouseX = coords.x;
        this.mouseY = coords.y;
        this.mouseDown = false;
        
        if (this.onMouseUp) {
            this.onMouseUp(coords.x, coords.y, e.button);
        }
    }
    
    handleMouseMove(e) {
        const coords = this.getCanvasCoordinates(e.clientX, e.clientY);
        this.mouseX = coords.x;
        this.mouseY = coords.y;
        
        if (this.onMouseMove) {
            this.onMouseMove(coords.x, coords.y);
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            this.mouseDown = true;
            
            if (this.onMouseDown) {
                this.onMouseDown(coords.x, coords.y, 0);
            }
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.mouseDown = false;
        
        if (this.onMouseUp) {
            this.onMouseUp(this.mouseX, this.mouseY, 0);
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length > 0) {
            const touch = e.touches[0];
            const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            
            if (this.onMouseMove) {
                this.onMouseMove(coords.x, coords.y);
            }
        }
    }
    
    handleKeyDown(e) {
        if (this.onKeyDown) {
            this.onKeyDown(e.key, e.code, e.ctrlKey, e.shiftKey, e.altKey);
        }
    }
}

export default InputManager;
