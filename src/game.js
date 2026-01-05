// AIDEV-NOTE: Main game controller - entry point for the application
// Manages game state, screens, and coordinates all systems

import { CONFIG, ENEMY_DATA, LEVEL_ENEMIES } from './config.js';
import { GameLoop } from './game_loop.js';
import { InputManager } from './input.js';
import { Board } from './board.js';
import { relicManager } from './systems/relics.js';
import { audioManager } from './systems/audio.js';
import { dragManager } from './systems/drag_manager.js';

// Game states
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    RELIC_SELECT: 'relic_select',
    ENEMY_SELECT: 'enemy_select',
    PLAYING: 'playing',
    PAUSED: 'paused',
    REWARD: 'reward',
    GAME_OVER: 'game_over'
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.state = GameState.LOADING;
        this.currentLevel = 1;
        this.playerGold = 0;
        this.difficulty = 3;
        
        // Game systems
        this.input = null;
        this.gameLoop = null;
        this.board = null;
        
        // Current enemy selection
        this.selectedEnemy = null;
        
        // Asset loading
        this.assets = {
            images: {},
            sounds: {},
            loaded: false
        };
        
        // UI element references
        this.ui = {
            loadingScreen: document.getElementById('loading-screen'),
            loadingFill: document.querySelector('.loading-fill'),
            loadingStatus: document.getElementById('loading-status'),
            menuScreen: document.getElementById('menu-screen'),
            enemySelectScreen: document.getElementById('enemy-select-screen'),
            enemyOptions: document.getElementById('enemy-options'),
            relicSelectScreen: document.getElementById('relic-select-screen'),
            relicOptions: document.getElementById('relic-options'),
            rewardScreen: document.getElementById('reward-screen'),
            endScreen: document.getElementById('end-screen'),
            mulliganModal: document.getElementById('mulligan-modal'),
            mulliganTiles: document.getElementById('mulligan-tiles'),
            turnIndicator: document.getElementById('turn-indicator'),
            goldAmount: document.getElementById('gold-amount'),
            playerHealthFill: document.querySelector('.health-bar-fill.player'),
            playerHealthText: document.querySelector('#player-health .health-text'),
            enemyHealthFill: document.querySelector('.health-bar-fill.enemy'),
            enemyHealthText: document.querySelector('#enemy-health .health-text'),
            mulliganBtn: document.getElementById('mulligan-btn')
        };
        
        this.init();
    }
    
    async init() {
        console.log('Initializing Word Battle...');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.input = new InputManager(this.canvas);
        this.setupInputCallbacks();
        this.setupUIHandlers();
        
        await this.loadAssets();
        
        this.board = new Board(this.canvas, this.assets);
        
        this.gameLoop = new GameLoop(
            (dt) => this.update(dt),
            () => this.render()
        );
        
        this.hideLoadingScreen();
        this.showEnemySelectScreen();
        this.gameLoop.start();
        
        console.log('Game initialized!');
    }
    
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const width = Math.max(container.clientWidth, CONFIG.CANVAS_MIN_WIDTH);
        const height = Math.max(container.clientHeight, CONFIG.CANVAS_MIN_HEIGHT);
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        if (this.board) {
            this.board.width = width;
            this.board.height = height;
            this.board.positionRacks();
        }
    }
    
    setupInputCallbacks() {
        // Mouse down - try to pick up a tile
        this.input.onMouseDown = (x, y, button) => {
            if (button !== 0 || this.state !== GameState.PLAYING) return;
            if (this.board.state !== 'playing' || this.board.currentPlayer !== 1) return;
            
            const hit = dragManager.getTileAt(x, y);
            if (hit) {
                dragManager.moveTo(x, y);
                dragManager.pickUp(hit.container, hit.index);
                audioManager.play('tile-pickup');
            }
        };
        
        // Mouse move - update drag position
        this.input.onMouseMove = (x, y) => {
            if (this.state !== GameState.PLAYING) return;
            dragManager.moveTo(x, y);
        };
        
        // Mouse up - drop tile
        this.input.onMouseUp = (x, y, button) => {
            if (this.state !== GameState.PLAYING) return;
            
            if (dragManager.isDragging()) {
                const result = dragManager.drop();
                if (result) {
                    if (result.type === 'returned') {
                        audioManager.play('tile-slide');
                    } else {
                        audioManager.play('tile-place');
                    }
                }
            }
        };
        
        // Keyboard
        this.input.onKeyDown = (key, code, ctrl) => {
            this.handleKeyDown(key, code, ctrl);
        };
    }
    
    setupUIHandlers() {
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.showMenu();
        });
        
        document.getElementById('resume-btn').addEventListener('click', () => {
            this.hideMenu();
        });
        
        document.getElementById('end-turn-btn').addEventListener('click', () => {
            if (this.state === GameState.PLAYING) {
                this.endTurn();
            }
        });
        
        document.getElementById('restart-btn').addEventListener('click', () => {
            if (this.state === GameState.PLAYING) {
                this.restartTurn();
            }
        });
        
        document.getElementById('mulligan-btn').addEventListener('click', () => {
            if (this.state === GameState.PLAYING) {
                this.handleMulligan();
            }
        });
        
        document.getElementById('mulligan-confirm-btn').addEventListener('click', () => {
            this.confirmMulligan();
        });
        
        document.getElementById('mulligan-cancel-btn').addEventListener('click', () => {
            this.hideMulliganModal();
        });
        
        document.getElementById('claim-rewards-btn').addEventListener('click', () => {
            this.claimRewards();
        });
        
        document.getElementById('continue-btn').addEventListener('click', () => {
            this.continueAfterBattle();
        });
        
        document.getElementById('new-game-btn').addEventListener('click', () => {
            this.startNewGame();
        });
        
        document.getElementById('quit-btn').addEventListener('click', () => {
            this.hideMenu();
            this.state = GameState.ENEMY_SELECT;
            this.showEnemySelectScreen();
        });
    }
    
    async loadAssets() {
        const totalAssets = 8;
        let loadedCount = 0;
        
        const updateProgress = (status) => {
            loadedCount++;
            const progress = (loadedCount / totalAssets) * 100;
            this.ui.loadingFill.style.width = `${progress}%`;
            this.ui.loadingStatus.textContent = status;
        };
        
        try {
            updateProgress('Loading tiles...');
            await this.loadTileSprites();
            
            updateProgress('Loading lanes...');
            await this.loadLaneSprites();
            
            updateProgress('Loading enemies...');
            await this.loadEnemySprites();
            
            updateProgress('Loading relics...');
            await this.loadRelicSprites();
            
            updateProgress('Loading backgrounds...');
            await this.loadBackgroundSprites();
            
            updateProgress('Loading dictionary...');
            
            updateProgress('Loading sounds...');
            await this.loadSounds().catch(() => console.warn('Sound loading skipped'));
            
            updateProgress('Ready!');
            this.assets.loaded = true;
            
        } catch (error) {
            console.error('Failed to load assets:', error);
            this.ui.loadingStatus.textContent = 'Error loading assets!';
        }
    }
    
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => {
                console.warn(`Failed to load image: ${src}`);
                resolve(null);
            };
            img.src = src;
        });
    }
    
    async loadTileSprites() {
        // Tiles are now drawn programmatically - no sprites needed
        this.assets.images.tiles = {};
    }
    
    async loadLaneSprites() {
        const laneTypes = ['Player', 'Enemy', 'Unclaimed'];
        
        this.assets.images.lanes = {};
        for (const type of laneTypes) {
            this.assets.images.lanes[type] = await this.loadImage(
                `${CONFIG.PATHS.LANE_TILESET}Lane Tileset-${type}.png`
            );
        }
    }
    
    async loadEnemySprites() {
        this.assets.images.enemies = {};
        
        for (const [key, data] of Object.entries(ENEMY_DATA)) {
            this.assets.images.enemies[key] = await this.loadImage(
                `${CONFIG.PATHS.ENEMIES}${data.sprite}`
            );
        }
    }
    
    async loadRelicSprites() {
        this.assets.images.relics = {};
        
        const relicFiles = [
            'Ankh', 'Axe', 'Box', 'Calculator', 'Dino Egg', 'Geode', 'Gift',
            'Letter', 'Lime', 'Log', 'Magnet', 'Orange', 'Pillar', 'Pizza',
            'Rock', 'Ruler', 'Simple Square', 'Skull', 'Snake', 'Teapot',
            'Watermelon', 'Worm'
        ];
        
        for (const name of relicFiles) {
            this.assets.images.relics[name] = await this.loadImage(
                `${CONFIG.PATHS.RELICS}Relics-${name}.png`
            );
        }
    }
    
    async loadBackgroundSprites() {
        this.assets.images.background = await this.loadImage(
            `${CONFIG.PATHS.BACKGROUNDS}Background-BG.png`
        );
    }
    
    async loadSounds() {
        await audioManager.loadAllSounds();
        this.assets.sounds = audioManager.sounds;
    }
    
    hideLoadingScreen() {
        this.ui.loadingScreen.classList.add('hidden');
    }
    
    showMenu() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            this.ui.menuScreen.classList.remove('hidden');
        }
    }
    
    hideMenu() {
        this.ui.menuScreen.classList.add('hidden');
        if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
        }
    }
    
    showEnemySelectScreen() {
        this.state = GameState.ENEMY_SELECT;
        this.ui.enemySelectScreen.classList.remove('hidden');
        this.populateEnemyOptions();
    }
    
    hideEnemySelectScreen() {
        this.ui.enemySelectScreen.classList.add('hidden');
    }
    
    populateEnemyOptions() {
        const container = this.ui.enemyOptions;
        container.innerHTML = '';
        
        const levelIndex = Math.min(this.currentLevel - 1, LEVEL_ENEMIES.length - 1);
        const availableEnemies = LEVEL_ENEMIES[levelIndex] || Object.keys(ENEMY_DATA).slice(0, 3);
        
        for (const enemyType of availableEnemies) {
            const enemyData = ENEMY_DATA[enemyType];
            if (!enemyData) continue;
            
            const card = document.createElement('div');
            card.className = 'selection-card';
            card.dataset.enemy = enemyType;
            
            const sprite = this.assets.images.enemies?.[enemyType];
            
            card.innerHTML = `
                ${sprite ? `<img src="${CONFIG.PATHS.ENEMIES}${enemyData.sprite}" alt="${enemyData.name}">` : ''}
                <h3>${enemyData.name}</h3>
                <p>HP: ${enemyData.health}</p>
            `;
            
            card.addEventListener('click', () => {
                container.querySelectorAll('.selection-card').forEach(c => 
                    c.classList.remove('selected'));
                card.classList.add('selected');
                this.selectedEnemy = enemyType;
                
                setTimeout(() => this.startBattle(enemyType), 300);
            });
            
            container.appendChild(card);
        }
    }
    
    showRelicSelectScreen() {
        this.state = GameState.RELIC_SELECT;
        this.ui.relicSelectScreen.classList.remove('hidden');
        this.populateRelicOptions();
    }
    
    hideRelicSelectScreen() {
        this.ui.relicSelectScreen.classList.add('hidden');
    }
    
    populateRelicOptions() {
        const container = this.ui.relicOptions;
        container.innerHTML = '';
        
        const relics = relicManager.getRandomInactiveRelics(3, 1);
        
        for (const relic of relics) {
            const card = document.createElement('div');
            card.className = 'selection-card';
            card.dataset.relic = relic.name;
            
            card.innerHTML = `
                <img src="${CONFIG.PATHS.RELICS}${relic.imagePath}" alt="${relic.name}" 
                     onerror="this.style.display='none'">
                <h3>${relic.name}</h3>
                <p>${relic.description}</p>
            `;
            
            card.addEventListener('click', () => {
                container.querySelectorAll('.selection-card').forEach(c => 
                    c.classList.remove('selected'));
                card.classList.add('selected');
                
                setTimeout(() => {
                    relicManager.activateRelic(relic.name, 1);
                    this.hideRelicSelectScreen();
                    this.showEnemySelectScreen();
                }, 300);
            });
            
            container.appendChild(card);
        }
        
        if (relics.length === 0) {
            const skipBtn = document.createElement('button');
            skipBtn.className = 'ui-button';
            skipBtn.textContent = 'Continue';
            skipBtn.addEventListener('click', () => {
                this.hideRelicSelectScreen();
                this.showEnemySelectScreen();
            });
            container.appendChild(skipBtn);
        }
    }
    
    showRewardScreen(rewards) {
        this.state = GameState.REWARD;
        this.ui.rewardScreen.classList.remove('hidden');
        
        const display = document.getElementById('reward-display');
        display.innerHTML = '';
        
        const goldReward = 10 + this.currentLevel * 5;
        this.pendingRewards = { gold: goldReward };
        
        const goldItem = document.createElement('div');
        goldItem.className = 'reward-item';
        goldItem.innerHTML = `
            <span style="font-size: 32px;">💰</span>
            <div class="reward-item-info">
                <div class="reward-item-name">${goldReward} Gold</div>
                <div class="reward-item-desc">Victory bonus</div>
            </div>
        `;
        display.appendChild(goldItem);
        
        if (Math.random() < 0.5) {
            const relics = relicManager.getRandomInactiveRelics(1, 1);
            if (relics.length > 0) {
                this.pendingRewards.relic = relics[0].name;
                
                const relicItem = document.createElement('div');
                relicItem.className = 'reward-item';
                relicItem.innerHTML = `
                    <img src="${CONFIG.PATHS.RELICS}${relics[0].imagePath}" alt="${relics[0].name}"
                         onerror="this.style.display='none'" style="width:48px;height:48px;">
                    <div class="reward-item-info">
                        <div class="reward-item-name">${relics[0].name}</div>
                        <div class="reward-item-desc">${relics[0].description}</div>
                    </div>
                `;
                display.appendChild(relicItem);
            }
        }
    }
    
    hideRewardScreen() {
        this.ui.rewardScreen.classList.add('hidden');
    }
    
    showEndScreen(isVictory) {
        this.state = GameState.GAME_OVER;
        this.ui.endScreen.classList.remove('hidden');
        
        const title = document.getElementById('end-title');
        const message = document.getElementById('end-message');
        const continueBtn = document.getElementById('continue-btn');
        
        if (isVictory) {
            title.textContent = 'Victory!';
            message.textContent = 'You defeated the enemy!';
            continueBtn.style.display = 'block';
        } else {
            title.textContent = 'Defeat';
            message.textContent = 'You have been defeated...';
            continueBtn.style.display = 'none';
        }
    }
    
    hideEndScreen() {
        this.ui.endScreen.classList.add('hidden');
    }
    
    showMulliganModal() {
        this.ui.mulliganModal.classList.remove('hidden');
        this.populateMulliganTiles();
    }
    
    hideMulliganModal() {
        this.ui.mulliganModal.classList.add('hidden');
    }
    
    populateMulliganTiles() {
        const container = this.ui.mulliganTiles;
        container.innerHTML = '';
        
        if (!this.board) return;
        
        const tiles = this.board.playerRack.tiles;
        for (let i = 0; i < tiles.length; i++) {
            const tile = tiles[i];
            const item = document.createElement('div');
            item.className = 'tile-select-item';
            item.dataset.index = i;
            item.style.backgroundColor = '#D4A574';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.justifyContent = 'center';
            item.style.fontSize = '24px';
            item.style.fontWeight = 'bold';
            item.textContent = tile.letter;
            
            item.addEventListener('click', () => {
                item.classList.toggle('selected');
                this.updateMulliganConfirmButton();
            });
            
            container.appendChild(item);
        }
    }
    
    updateMulliganConfirmButton() {
        const selected = this.ui.mulliganTiles.querySelectorAll('.selected').length;
        const confirmBtn = document.getElementById('mulligan-confirm-btn');
        confirmBtn.disabled = selected === 0;
    }
    
    showTurnIndicator(text) {
        const indicator = this.ui.turnIndicator;
        const turnText = document.getElementById('turn-text');
        turnText.textContent = text;
        indicator.classList.remove('hidden');
        
        setTimeout(() => {
            indicator.classList.add('hidden');
        }, CONFIG.ANIM.TURN_INDICATOR);
    }
    
    updateHealthDisplay() {
        if (!this.board) return;
        
        const playerPercent = (this.board.playerHealth / this.board.playerMaxHealth) * 100;
        this.ui.playerHealthFill.style.width = `${playerPercent}%`;
        this.ui.playerHealthText.textContent = `${this.board.playerHealth}/${this.board.playerMaxHealth}`;
        
        const enemyPercent = (this.board.enemyHealth / this.board.enemyMaxHealth) * 100;
        this.ui.enemyHealthFill.style.width = `${enemyPercent}%`;
        this.ui.enemyHealthText.textContent = `${this.board.enemyHealth}/${this.board.enemyMaxHealth}`;
    }
    
    updateMulliganButton() {
        if (!this.board) return;
        this.ui.mulliganBtn.textContent = `Mulligan (${this.board.mulliganCount})`;
        this.ui.mulliganBtn.disabled = this.board.mulliganCount <= 0;
    }
    
    updateGoldDisplay() {
        this.ui.goldAmount.textContent = this.playerGold;
    }
    
    startBattle(enemyType) {
        this.hideEnemySelectScreen();
        this.board.setupBattle(enemyType);
        this.state = GameState.PLAYING;
        this.updateHealthDisplay();
        this.updateMulliganButton();
        this.updateActiveRelicsDisplay();
        this.showTurnIndicator('Your Turn');
        
        audioManager.playMusic(`${CONFIG.PATHS.MUSIC}Tile Game Music.mp3`);
    }
    
    updateActiveRelicsDisplay() {
        const container = document.getElementById('active-relics');
        if (!container) return;
        
        container.innerHTML = '';
        
        const activeRelics = relicManager.getActiveRelics(1);
        
        for (const relic of activeRelics) {
            const relicEl = document.createElement('div');
            relicEl.className = 'active-relic';
            relicEl.title = `${relic.name}: ${relic.description}`;
            relicEl.innerHTML = `<img src="${CONFIG.PATHS.RELICS}${relic.imagePath}" alt="${relic.name}" onerror="this.parentElement.remove()">`;
            container.appendChild(relicEl);
        }
        
        const enemy = this.board.enemy;
        if (enemy && enemy.relics && enemy.relics.length > 0) {
            const hint = document.createElement('div');
            hint.className = 'weakness-hint';
            hint.innerHTML = `<small>Enemy weak to: ${enemy.relics.join(', ')}</small>`;
            container.appendChild(hint);
        }
    }
    
    endTurn() {
        if (!this.board) return;
        
        if (this.board.currentPlayer !== 1) return;
        if (this.board.state !== 'playing') return;
        
        // Cancel any active drag
        dragManager.cancel();
        
        const success = this.board.endTurn();
        if (success) {
            console.log('Turn ended successfully');
        }
    }
    
    restartTurn() {
        if (!this.board || this.board.hasUsedMulligan) return;
        dragManager.cancel();
        this.board.restoreTurnStartState();
    }
    
    handleMulligan() {
        if (!this.board) return;
        
        if (this.board.mulliganCount > 0) {
            this.showMulliganModal();
        } else {
            this.board.mulligan(false);
            this.updateMulliganButton();
            this.endTurn();
        }
    }
    
    confirmMulligan() {
        if (!this.board) return;
        
        const selected = this.ui.mulliganTiles.querySelectorAll('.selected');
        if (selected.length === 0) return;
        
        this.board.mulligan(false);
        this.updateMulliganButton();
        this.hideMulliganModal();
    }
    
    claimRewards() {
        if (this.pendingRewards) {
            if (this.pendingRewards.gold) {
                this.playerGold += this.pendingRewards.gold;
                this.updateGoldDisplay();
            }
            if (this.pendingRewards.relic) {
                relicManager.activateRelic(this.pendingRewards.relic, 1);
                this.updateActiveRelicsDisplay();
            }
            this.pendingRewards = null;
        }
        
        this.hideRewardScreen();
        this.currentLevel++;
        
        if (this.currentLevel % 2 === 0) {
            this.showRelicSelectScreen();
        } else {
            this.showEnemySelectScreen();
        }
    }
    
    continueAfterBattle() {
        this.hideEndScreen();
        this.currentLevel++;
        this.showEnemySelectScreen();
    }
    
    startNewGame() {
        this.currentLevel = 1;
        this.playerGold = 0;
        this.board.playerHealth = CONFIG.STARTING_HEALTH;
        this.board.playerMaxHealth = CONFIG.STARTING_HEALTH;
        this.updateGoldDisplay();
        this.hideEndScreen();
        this.showEnemySelectScreen();
    }
    
    handleKeyDown(key, code, ctrl) {
        if (key === 'Escape') {
            if (this.state === GameState.PLAYING) {
                dragManager.cancel();
                this.showMenu();
            } else if (this.state === GameState.PAUSED) {
                this.hideMenu();
            }
        }
        
        if (ctrl && key === 'w' && this.state === GameState.PLAYING) {
            this.board.enemyHealth = 0;
        }
    }
    
    update(dt) {
        if (this.state !== GameState.PLAYING) return;
        if (!this.board) return;
        
        const gameResult = this.board.update(dt);
        
        this.updateHealthDisplay();
        this.updateMulliganButton();
        
        if (gameResult === 'win') {
            this.showRewardScreen();
        } else if (gameResult === 'lose') {
            this.showEndScreen(false);
        }
        
        if (this.board.state === 'playing' && this.board.currentPlayer === 1) {
            if (this._lastPlayer !== 1) {
                this.showTurnIndicator('Your Turn');
            }
        } else if (this.board.state === 'ai_turn' && this._lastPlayer !== 2) {
            this.showTurnIndicator('Enemy Turn');
        }
        
        this._lastPlayer = this.board.currentPlayer;
    }
    
    render() {
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Clear canvas
        ctx.fillStyle = CONFIG.COLORS.CREAM;
        ctx.fillRect(0, 0, width, height);
        
        // Draw background pattern
        if (this.assets.images.background) {
            const bg = this.assets.images.background;
            const pattern = ctx.createPattern(bg, 'repeat');
            if (pattern) {
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, width, height);
            }
        }
        
        // Draw board (all canvas rendering - tiles included)
        if (this.state === GameState.PLAYING || this.state === GameState.PAUSED) {
            if (this.board) {
                this.board.draw(ctx);
            }
        }
    }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
