// AIDEV-NOTE: Enemy entity with health, sprite, and weakness system

import { CONFIG, ENEMY_DATA } from '../config.js';

export class Enemy {
    constructor(enemyType) {
        const data = ENEMY_DATA[enemyType];
        if (!data) {
            throw new Error(`Unknown enemy type: ${enemyType}`);
        }
        
        this.type = enemyType;
        this.name = data.name;
        this.spritePath = data.sprite;
        this.maxHealth = data.health;
        this.health = data.health;
        this.weaknesses = data.weaknesses || [];
        this.relics = data.relics || [];
        
        // Position (set by board)
        this.x = 0;
        this.y = 0;
        
        // Visual size
        this.width = 128;
        this.height = 128;
        
        // Animation state
        this.scale = 1;
        this.shaking = false;
        this.shakeOffset = 0;
        
        // Sprite (loaded by game)
        this.sprite = null;
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }
    
    setSprite(sprite) {
        this.sprite = sprite;
    }
    
    // Take damage and return true if defeated
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
        this.shake();
        return this.health <= 0;
    }
    
    // Heal the enemy
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    // Check if a word triggers weakness (returns multiplier)
    getWeaknessMultiplier(word) {
        // AIDEV-TODO: Implement proper weakness word lists
        // For now, return 1 (no weakness)
        return 1;
    }
    
    // Start shake animation (when taking damage)
    shake(duration = 300) {
        this.shaking = true;
        this.shakeStartTime = performance.now();
        this.shakeDuration = duration;
    }
    
    update(dt) {
        // Handle shake animation
        if (this.shaking) {
            const elapsed = performance.now() - this.shakeStartTime;
            const progress = elapsed / this.shakeDuration;
            
            if (progress >= 1) {
                this.shaking = false;
                this.shakeOffset = 0;
            } else {
                const amplitude = 8 * (1 - progress);
                this.shakeOffset = Math.sin(progress * Math.PI * 10) * amplitude;
            }
        }
    }
    
    draw(ctx, assets) {
        const drawX = this.x + this.shakeOffset;
        const drawY = this.y;
        
        // Try to get sprite from assets
        const sprite = assets?.images?.enemies?.[this.type];
        
        if (sprite) {
            ctx.drawImage(
                sprite,
                drawX,
                drawY,
                this.width * this.scale,
                this.height * this.scale
            );
        } else {
            // Fallback: draw placeholder
            ctx.fillStyle = CONFIG.COLORS.RED;
            ctx.fillRect(drawX, drawY, this.width, this.height);
            
            // Draw name
            ctx.fillStyle = CONFIG.COLORS.TEXT_WHITE;
            ctx.font = '14px Nunito';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, drawX + this.width / 2, drawY + this.height / 2);
        }
    }
    
    // Check if the enemy is defeated
    isDefeated() {
        return this.health <= 0;
    }
    
    // Get health percentage (0-1)
    getHealthPercent() {
        return this.health / this.maxHealth;
    }
}

// Get available enemies for a specific level
export function getEnemiesForLevel(level) {
    const levelIndex = Math.min(level - 1, CONFIG.LEVEL_ENEMIES?.length - 1 || 0);
    const enemyTypes = CONFIG.LEVEL_ENEMIES?.[levelIndex] || Object.keys(ENEMY_DATA).slice(0, 3);
    return enemyTypes;
}

// Get a random enemy from the available enemies for a level
export function getRandomEnemyForLevel(level) {
    const enemies = getEnemiesForLevel(level);
    const randomIndex = Math.floor(Math.random() * enemies.length);
    return enemies[randomIndex];
}

export default Enemy;

