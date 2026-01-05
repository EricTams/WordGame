// AIDEV-NOTE: Game board - manages lanes, racks, turns, and combat
// Drag logic moved to DragManager

import { CONFIG } from './config.js';
import { Rack } from './entities/rack.js';
import { Lane } from './entities/lane.js';
import { Enemy } from './entities/enemy.js';
import { TileSet } from './systems/tile_set.js';
import { dictionary } from './systems/dictionary.js';
import { animationManager } from './systems/animation.js';
import { AI } from './systems/ai.js';
import { relicManager } from './systems/relics.js';
import { dragManager } from './systems/drag_manager.js';

export class Board {
    constructor(canvas, assets) {
        this.canvas = canvas;
        this.assets = assets;
        this.width = canvas.width;
        this.height = canvas.height;
        
        // Game state
        this.currentPlayer = 1;
        this.state = 'playing';
        
        // Health
        this.playerHealth = CONFIG.STARTING_HEALTH;
        this.playerMaxHealth = CONFIG.STARTING_HEALTH;
        this.enemyHealth = CONFIG.STARTING_HEALTH;
        this.enemyMaxHealth = CONFIG.STARTING_HEALTH;
        
        // Mulligan
        this.mulliganCount = CONFIG.MULLIGAN_COUNT;
        this.hasUsedMulligan = false;
        
        // Turn state
        this.turnStartState = null;
        
        // Tile sets
        this.playerTileSet = new TileSet();
        this.enemyTileSet = new TileSet();
        
        // Create lanes
        this.lanes = [];
        this.createLanes();
        
        // Create racks
        this.playerRack = new Rack(1);
        this.enemyRack = new Rack(2);
        this.positionRacks();
        
        // Register containers with drag manager
        dragManager.registerContainer(this.playerRack);
        for (const lane of this.lanes) {
            dragManager.registerContainer(lane);
        }
        
        // Enemy
        this.enemy = null;
        
        // AI
        this.ai = new AI(this, 3);
        
        // Track lane tile counts
        this.laneTileCounts = [];
    }
    
    createLanes() {
        const laneSpacing = CONFIG.LANE_SPACING;
        const totalHeight = CONFIG.LANE_COUNT * CONFIG.LANE_HEIGHT + 
                           (CONFIG.LANE_COUNT - 1) * laneSpacing;
        const startY = (this.height - totalHeight) / 2 - 40;
        
        for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
            const lane = new Lane(i);
            const laneWidth = lane.width;
            const laneX = (this.width - laneWidth) / 2;
            const laneY = startY + i * (CONFIG.LANE_HEIGHT + laneSpacing);
            
            lane.setPosition(laneX, laneY);
            this.lanes.push(lane);
        }
    }
    
    positionRacks() {
        const rackY = this.height - 170;
        const padding = 20;
        
        this.playerRack.setPosition(padding, rackY);
        this.enemyRack.setPosition(
            this.width - this.enemyRack.width - padding,
            rackY
        );
    }
    
    setupBattle(enemyType) {
        this.enemy = new Enemy(enemyType);
        this.enemy.setPosition(this.width - 180, 80);
        this.enemy.setSprite(this.assets?.images?.enemies?.[enemyType]);
        
        this.enemyHealth = this.enemy.health;
        this.enemyMaxHealth = this.enemy.maxHealth;
        
        relicManager.clearRelics(2);
        for (const relicName of this.enemy.relics) {
            relicManager.activateRelic(relicName, 2);
        }
        
        this.playerTileSet.reset();
        this.enemyTileSet.reset();
        
        for (const lane of this.lanes) {
            lane.clear();
            lane.unlock();
            lane.show();
        }
        
        this.fillRack(this.playerRack, this.playerTileSet);
        this.fillRack(this.enemyRack, this.enemyTileSet);
        
        this.mulliganCount = CONFIG.MULLIGAN_COUNT;
        this.hasUsedMulligan = false;
        
        this.currentPlayer = 1;
        this.state = 'playing';
        this.startTurn();
    }
    
    fillRack(rack, tileSet, playerNumber = 1) {
        const requiredLetters = relicManager.getListOfResults('getRequiredRackLetters', playerNumber);
        const currentLetters = rack.getLetters();
        
        // Starting position for animation (tiles come from off-screen)
        const isPlayerRack = rack === this.playerRack;
        const startX = isPlayerRack ? rack.x : this.width + 50;
        const startY = rack.y + rack.height / 2 - CONFIG.TILE_SIZE / 2;
        
        for (const required of requiredLetters) {
            if (!required) continue;
            const letter = required.toUpperCase();
            
            if (!currentLetters.includes(letter) && !rack.isFull()) {
                const tile = tileSet.drawTile(letter);
                if (tile) {
                    tile.setPosition(startX, startY);
                    rack.addTile(tile);
                }
            }
        }
        
        while (!rack.isFull()) {
            const tile = tileSet.drawTile();
            if (!tile) break;
            tile.setPosition(startX, startY);
            rack.addTile(tile);
        }
    }
    
    startTurn() {
        this.hasUsedMulligan = false;
        
        this.fillRack(this.playerRack, this.playerTileSet);
        this.fillRack(this.enemyRack, this.enemyTileSet);
        
        for (const lane of this.lanes) {
            for (const tile of lane.tiles) {
                tile.type = CONFIG.TILE_TYPES.STEEL;
            }
            lane.clearTemporaryOwner();
            lane.saveTurnStartState();
        }
        
        this.shiftLanes();
        this.updateLaneVisibility();
        this.saveTurnStartState();
        this.laneTileCounts = this.lanes.map(l => l.tiles.length);
    }
    
    shiftLanes() {
        if (this.lanes[0].isEmpty() && !this.lanes[1].isEmpty()) {
            this.moveLaneTiles(1, 0);
        }
        if (this.lanes[1].isEmpty() && !this.lanes[2].isEmpty()) {
            this.moveLaneTiles(2, 1);
        }
        if (this.lanes[0].isEmpty() && !this.lanes[1].isEmpty()) {
            this.moveLaneTiles(1, 0);
        }
    }
    
    moveLaneTiles(fromIndex, toIndex) {
        const fromLane = this.lanes[fromIndex];
        const toLane = this.lanes[toIndex];
        
        const owner = fromLane.owner;
        const tiles = fromLane.clear();
        
        for (const tile of tiles) {
            toLane.addTile(tile);
        }
        
        toLane.setOwner(owner);
        toLane.repositionTiles(true);
    }
    
    updateLaneVisibility() {
        for (const lane of this.lanes) {
            lane.show();
        }
    }
    
    saveTurnStartState() {
        this.turnStartState = {
            playerRackLetters: this.playerRack.getLetters(),
            laneTiles: this.lanes.map(lane => ({
                letters: lane.tiles.map(t => ({ letter: t.letter, type: t.type })),
                owner: lane.owner
            }))
        };
    }
    
    restoreTurnStartState() {
        if (!this.turnStartState || this.hasUsedMulligan) return;
        if (this.state !== 'playing') return;
        
        // Cancel any active drag
        dragManager.cancel();
        
        const playerTilesFromLanes = [];
        for (let i = 0; i < this.lanes.length; i++) {
            const lane = this.lanes[i];
            const savedCount = this.turnStartState.laneTiles[i].letters.length;
            
            while (lane.tiles.length > savedCount) {
                const tile = lane.tiles.pop();
                if (tile) playerTilesFromLanes.push(tile);
            }
            
            lane.clearTemporaryOwner();
            lane.repositionTiles();
        }
        
        for (const tile of playerTilesFromLanes) {
            this.playerTileSet.returnTile(tile);
        }
        
        for (const tile of this.playerRack.clear()) {
            this.playerTileSet.returnTile(tile);
        }
        
        for (const letter of this.turnStartState.playerRackLetters) {
            const tile = this.playerTileSet.drawTile(letter);
            if (tile) {
                this.playerRack.addTile(tile);
            }
        }
        
        this.laneTileCounts = this.lanes.map(l => l.tiles.length);
    }
    
    endTurn() {
        if (this.state !== 'playing') return false;
        
        const invalidLanes = this.validateAllWords();
        
        if (invalidLanes.length > 0) {
            for (const laneIndex of invalidLanes) {
                for (const tile of this.lanes[laneIndex].tiles) {
                    animationManager.shake(tile);
                }
            }
            return false;
        }
        
        for (let i = 0; i < this.lanes.length; i++) {
            const lane = this.lanes[i];
            if (lane.hasNewTiles()) {
                lane.setOwner(this.currentPlayer);
                this.processSpecialEffects(lane);
            }
            lane.clearTemporaryOwner();
        }
        
        if (this.playerRack.isFull() && this.currentPlayer === 1) {
            this.mulligan(true);
        } else {
            this.fillRack(this.playerRack, this.playerTileSet);
        }
        
        this.state = 'end_turn';
        return true;
    }
    
    validateAllWords() {
        const invalid = [];
        
        for (let i = 0; i < this.lanes.length; i++) {
            const lane = this.lanes[i];
            
            if (!lane.hasNewTiles()) continue;
            
            const word = lane.getWord();
            if (word.length < CONFIG.MIN_WORD_LENGTH) {
                invalid.push(i);
                continue;
            }
            
            if (!dictionary.wordExists(word, this.currentPlayer)) {
                invalid.push(i);
            }
        }
        
        return invalid;
    }
    
    processSpecialEffects(lane) {
        const effects = lane.getSpecialEffects();
        
        if (effects.shield > 0 && this.currentPlayer === 1) {
            this.playerMaxHealth += effects.shield;
            this.playerHealth += effects.shield;
        }
        
        if (effects.heal > 0 && this.currentPlayer === 1) {
            this.playerHealth = Math.min(
                this.playerHealth + effects.heal,
                this.playerMaxHealth
            );
        }
        
        if (effects.meteor > 0) {
            if (this.currentPlayer === 1) {
                this.dealDamage(2, effects.meteor);
            } else {
                this.dealDamage(1, effects.meteor);
            }
        }
        
        for (const tile of lane.tiles) {
            if (tile.type !== CONFIG.TILE_TYPES.STEEL) {
                tile.type = CONFIG.TILE_TYPES.MAIN;
            }
        }
    }
    
    processCombat() {
        let playerDamage = 0;
        let enemyDamage = 0;
        
        for (const lane of this.lanes) {
            const word = lane.getWord();
            let baseDamage = lane.calculateDamage();
            
            if (lane.owner === 1 && baseDamage > 0) {
                let mult = relicManager.getMultResult('getWordScoreMult', 1, word);
                let additive = relicManager.getAdditiveResult('getWordScoreAdditive', 1, word);
                let vulnMult = relicManager.getMultResult('getWordVulnerabilityMult', 2, word);
                
                playerDamage += Math.floor((baseDamage * mult + additive) * vulnMult);
            } else if (lane.owner === 2 && baseDamage > 0) {
                let mult = relicManager.getMultResult('getWordScoreMult', 2, word);
                let additive = relicManager.getAdditiveResult('getWordScoreAdditive', 2, word);
                
                enemyDamage += Math.floor(baseDamage * mult + additive);
            }
        }
        
        if (playerDamage > 0) this.dealDamage(2, playerDamage);
        if (enemyDamage > 0) this.dealDamage(1, enemyDamage);
    }
    
    dealDamage(target, amount) {
        if (target === 1) {
            this.playerHealth = Math.max(0, this.playerHealth - amount);
        } else {
            this.enemyHealth = Math.max(0, this.enemyHealth - amount);
            if (this.enemy) this.enemy.shake();
        }
    }
    
    mulligan(fullMulligan = false) {
        if (this.currentPlayer !== 1) return;
        
        const tiles = this.playerRack.clear();
        for (const tile of tiles) {
            this.playerTileSet.returnTile(tile);
        }
        
        this.fillRack(this.playerRack, this.playerTileSet);
        
        if (!fullMulligan) {
            this.mulliganCount--;
            this.hasUsedMulligan = true;
        }
    }
    
    // Update temporary ownership based on new tiles
    updateTemporaryOwnership() {
        for (let i = 0; i < this.lanes.length; i++) {
            const lane = this.lanes[i];
            if (lane.visible) {
                if (lane.tiles.length > this.laneTileCounts[i]) {
                    lane.setTemporaryOwner(this.currentPlayer);
                } else {
                    lane.clearTemporaryOwner();
                }
            }
        }
    }
    
    checkGameOver() {
        if (this.playerHealth <= 0) return 'lose';
        if (this.enemyHealth <= 0) return 'win';
        return null;
    }
    
    update(dt) {
        animationManager.update(dt);
        
        for (const tile of this.playerRack.tiles) {
            tile.update(dt);
        }
        for (const tile of this.enemyRack.tiles) {
            tile.update(dt);
        }
        for (const lane of this.lanes) {
            lane.update(dt);
        }
        
        if (this.enemy) {
            this.enemy.update(dt);
        }
        
        // Update temporary ownership when playing
        if (this.state === 'playing') {
            this.updateTemporaryOwnership();
        }
        
        // State machine
        if (this.state === 'end_turn') {
            if (!animationManager.isAnimating()) {
                this.state = 'combat';
            }
        } else if (this.state === 'combat') {
            this.processCombat();
            this.state = 'post_combat';
        } else if (this.state === 'post_combat') {
            if (!animationManager.isAnimating()) {
                const result = this.checkGameOver();
                if (result) {
                    this.state = 'game_over';
                    return result;
                }
                
                this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                
                if (this.currentPlayer === 2) {
                    this.state = 'ai_turn';
                    this.ai.startTurn();
                } else {
                    this.startTurn();
                    this.state = 'playing';
                }
            }
        } else if (this.state === 'ai_turn') {
            const aiState = this.ai.update(dt);
            
            if (aiState === 'complete') {
                this.ai.reset();
                
                for (const lane of this.lanes) {
                    if (lane.owner === 2 && lane.hasNewTiles()) {
                        this.processSpecialEffects(lane);
                    }
                }
                
                this.fillRack(this.enemyRack, this.enemyTileSet);
                this.state = 'end_turn';
            }
        }
        
        return null;
    }
    
    draw(ctx) {
        // Draw lanes
        for (const lane of this.lanes) {
            lane.draw(ctx, this.assets);
        }
        
        // Draw racks
        this.playerRack.draw(ctx, this.assets);
        this.enemyRack.draw(ctx, this.assets);
        
        // Draw enemy
        if (this.enemy) {
            this.enemy.draw(ctx, this.assets);
        }
        
        // Draw dragged tile on top
        dragManager.draw(ctx, this.assets);
    }
}

export default Board;
