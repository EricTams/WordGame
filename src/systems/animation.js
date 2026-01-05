// AIDEV-NOTE: Animation system for tweening and effects
// Manages position animations, shakes, fades, etc.

export class AnimationManager {
    constructor() {
        this.animations = [];
    }
    
    // Add a new animation
    animate(target, options) {
        const anim = {
            target,
            startTime: performance.now(),
            duration: options.duration || 300,
            delay: options.delay || 0,
            properties: {},
            easing: options.easing || 'easeOutCubic',
            onComplete: options.onComplete || null,
            allowMultiple: options.allowMultiple || false,
            started: false
        };
        
        // Store start and end values for each property
        for (const [key, endValue] of Object.entries(options)) {
            if (['duration', 'delay', 'easing', 'onComplete', 'allowMultiple'].includes(key)) {
                continue;
            }
            
            if (typeof endValue === 'number' && typeof target[key] === 'number') {
                anim.properties[key] = {
                    start: target[key],
                    end: endValue
                };
            }
        }
        
        // Remove existing animations on same target unless allowMultiple
        if (!anim.allowMultiple) {
            this.animations = this.animations.filter(a => a.target !== target);
        }
        
        this.animations.push(anim);
        return anim;
    }
    
    // Shake animation (oscillates around current position)
    shake(target, options = {}) {
        const duration = options.duration || 300;
        const amplitude = options.amplitude || 6;
        const originalX = target.x;
        
        const anim = {
            target,
            startTime: performance.now(),
            duration,
            type: 'shake',
            amplitude,
            originalX,
            onComplete: options.onComplete || null
        };
        
        this.animations.push(anim);
        return anim;
    }
    
    // Update all animations
    update(dt) {
        const now = performance.now();
        const completed = [];
        
        for (const anim of this.animations) {
            if (anim.type === 'shake') {
                this.updateShake(anim, now);
            } else {
                this.updateTween(anim, now);
            }
            
            // Check if complete
            const elapsed = now - anim.startTime - (anim.delay || 0);
            if (elapsed >= anim.duration) {
                completed.push(anim);
            }
        }
        
        // Remove completed animations and call callbacks
        for (const anim of completed) {
            const index = this.animations.indexOf(anim);
            if (index !== -1) {
                this.animations.splice(index, 1);
            }
            
            // Reset shake position
            if (anim.type === 'shake') {
                anim.target.x = anim.originalX;
            }
            
            if (anim.onComplete) {
                anim.onComplete();
            }
        }
    }
    
    updateTween(anim, now) {
        const elapsed = now - anim.startTime - (anim.delay || 0);
        
        // Wait for delay
        if (elapsed < 0) return;
        
        // Mark as started
        if (!anim.started) {
            anim.started = true;
            // Capture actual start values at animation start
            for (const [key, prop] of Object.entries(anim.properties)) {
                prop.start = anim.target[key];
            }
        }
        
        const progress = Math.min(elapsed / anim.duration, 1);
        const eased = this.ease(progress, anim.easing);
        
        // Update properties
        for (const [key, prop] of Object.entries(anim.properties)) {
            anim.target[key] = prop.start + (prop.end - prop.start) * eased;
        }
    }
    
    updateShake(anim, now) {
        const elapsed = now - anim.startTime;
        const progress = Math.min(elapsed / anim.duration, 1);
        
        if (progress < 1) {
            const decay = 1 - progress;
            const offset = Math.sin(progress * Math.PI * 8) * anim.amplitude * decay;
            anim.target.x = anim.originalX + offset;
        }
    }
    
    // Easing functions
    ease(t, type) {
        switch (type) {
            case 'linear':
                return t;
            case 'easeInQuad':
                return t * t;
            case 'easeOutQuad':
                return t * (2 - t);
            case 'easeInOutQuad':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeInCubic':
                return t * t * t;
            case 'easeOutCubic':
                return 1 - Math.pow(1 - t, 3);
            case 'easeInOutCubic':
                return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case 'easeOutBounce':
                if (t < 1 / 2.75) {
                    return 7.5625 * t * t;
                } else if (t < 2 / 2.75) {
                    return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
                } else if (t < 2.5 / 2.75) {
                    return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
                } else {
                    return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
                }
            case 'easeOutElastic':
                if (t === 0 || t === 1) return t;
                return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
            default:
                return 1 - Math.pow(1 - t, 3); // Default to easeOutCubic
        }
    }
    
    // Check if any animations are running
    isAnimating() {
        return this.animations.length > 0;
    }
    
    // Check if a specific target is animating
    isTargetAnimating(target) {
        return this.animations.some(a => a.target === target);
    }
    
    // Stop all animations on a target
    stopAnimations(target) {
        this.animations = this.animations.filter(a => a.target !== target);
    }
    
    // Clear all animations
    clear() {
        this.animations = [];
    }
}

// Singleton instance
export const animationManager = new AnimationManager();

export default animationManager;

