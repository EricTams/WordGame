// AIDEV-NOTE: Central configuration file for all game constants
// All magic numbers should be defined here with descriptive names

export const CONFIG = {
    // Canvas and display
    CANVAS_MIN_WIDTH: 800,
    CANVAS_MIN_HEIGHT: 600,
    
    // Tile dimensions
    TILE_SIZE: 40,           // Visual size of tiles in pixels
    
    // Rack configuration
    RACK_CAPACITY: 7,        // Maximum tiles in player's rack
    RACK_TILE_SPACING: 4,    // Pixels between tiles in rack
    RACK_PADDING: 12,        // Padding around rack edges
    
    // Lane configuration
    LANE_COUNT: 3,           // Number of lanes on the board
    LANE_MAX_TILES: 12,      // Maximum tiles that fit in a lane
    LANE_TILE_SPACING: 4,    // Pixels between tiles in lane
    LANE_HEIGHT: 80,         // Height of each lane
    LANE_SPACING: 16,        // Vertical spacing between lanes
    
    // Gameplay
    STARTING_HEALTH: 30,     // Player starting health
    MULLIGAN_COUNT: 3,       // Number of mulligans per level
    MIN_WORD_LENGTH: 2,      // Minimum valid word length
    
    // Scrabble-style letter distribution
    LETTER_DISTRIBUTION: {
        a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9,
        j: 1, k: 1, l: 4, m: 2, n: 6, o: 8, p: 2, q: 1, r: 6,
        s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1
    },
    
    // Tile types and their associated powers
    TILE_TYPES: {
        MAIN: 'main',
        STEEL: 'steel',
        ICE: 'ice',        // Shield power
        FLOWER: 'flower',  // Heal power
        GOLD: 'gold'       // Meteor power
    },
    
    // Power effects when word is accepted
    TILE_POWERS: {
        ice: { type: 'shield', effect: 1 },    // +1 max health
        flower: { type: 'heal', effect: 1 },   // +1 health
        gold: { type: 'meteor', effect: 1 }    // +1 damage to enemy
    },
    
    // Animation timings (in milliseconds)
    ANIM: {
        TILE_MOVE: 200,
        TILE_SHAKE: 300,
        DAMAGE_FLASH: 150,
        TURN_INDICATOR: 1500,
        PANEL_SLIDE: 500
    },
    
    // AI configuration
    AI: {
        THINK_DELAY: 500,        // Delay before AI starts thinking
        MOVE_DELAY: 300,         // Delay between AI moves
        MIN_TILES: 3,            // Minimum tiles AI will try to use
        MAX_TILES: 7             // Maximum tiles AI will try to use
    },
    
    // Difficulty settings (affects AI dictionary depth)
    DIFFICULTY: {
        VERY_EASY: { dictDivisor: 128, tileProb: 0.3 },
        EASY: { dictDivisor: 32, tileProb: 0.35 },
        MEDIUM: { dictDivisor: 16, tileProb: 0.4 },
        HARD: { dictDivisor: 4, tileProb: 0.45 },
        VERY_HARD: { dictDivisor: 1, tileProb: 0.5 }
    },
    
    // Colors (for canvas drawing, matches CSS variables)
    COLORS: {
        CREAM: '#FFF8E7',
        CREAM_DARK: '#F5EBD6',
        BROWN: '#8B7355',
        BROWN_DARK: '#6B5344',
        BROWN_LIGHT: '#A89078',
        AMBER: '#FFB347',
        GREEN: '#7D9B76',
        GREEN_LIGHT: '#9DBB96',
        RED: '#D4726A',
        TEXT: '#4A3F35'
    },
    
    // Asset paths
    PATHS: {
        IMAGES: 'Images/',
        SOUNDS: 'sound/',
        MUSIC: 'music/',
        ENEMIES: 'Images/Enemies/',
        TILES: 'Images/Tiles/',
        RELICS: 'Images/Relics/',
        BACKGROUNDS: 'Images/Backgrounds/',
        LANE_TILESET: 'Images/Lane Tileset/'
    }
};

// AIDEV-NOTE: Enemy definitions with stats and weakness relics
// Weakness relics deal double damage when player spells related words
export const ENEMY_DATA = {
    'candle_ghost': {
        name: 'Candle Ghost',
        sprite: 'Enemies-Candle Ghost.png',
        health: 15,
        weaknesses: ['cold'],
        relics: ['Cold Words']
    },
    'cloud_man': {
        name: 'Cloud Man',
        sprite: 'Enemies-Cloud Man.png',
        health: 18,
        weaknesses: ['wind'],
        relics: ['Wind Words']
    },
    'floating_snail': {
        name: 'Floating Snail',
        sprite: 'Enemies-Floating Snail.png',
        health: 20,
        weaknesses: ['dry'],
        relics: ['Dry Words']
    },
    'little_alien': {
        name: 'Little Alien',
        sprite: 'Enemies-Little Alien.png',
        health: 22,
        weaknesses: ['smart'],
        relics: ['Smart Words']
    },
    'mushroom_mage': {
        name: 'Mushroom Mage',
        sprite: 'Enemies-Mushroom Mage.png',
        health: 25,
        weaknesses: ['gardening'],
        relics: ['Gardening Words']
    },
    'potion': {
        name: 'Potion',
        sprite: 'Enemies-Potion.png',
        health: 20,
        weaknesses: ['dry'],
        relics: ['Dry Words']
    },
    'rabid_lemon': {
        name: 'Rabid Lemon',
        sprite: 'Enemies-Rabid Lemon.png',
        health: 18,
        weaknesses: ['bugs'],
        relics: ['Bug Words']
    },
    'slime': {
        name: 'Slime',
        sprite: 'Enemies-Slime.png',
        health: 15,
        weaknesses: ['clean'],
        relics: ['Clean Words']
    },
    'smog_mage': {
        name: 'Smog Mage',
        sprite: 'Enemies-Smog Mage.png',
        health: 28,
        weaknesses: ['clean'],
        relics: ['Clean Words']
    },
    'tree_trunk': {
        name: 'Tree Trunk',
        sprite: 'Enemies-Tree Trunk.png',
        health: 30,
        weaknesses: ['gardening'],
        relics: ['Gardening Words']
    },
    'worm': {
        name: 'Worm',
        sprite: 'Enemies-Worm.png',
        health: 12,
        weaknesses: ['bugs'],
        relics: ['Bug Words']
    }
};

// AIDEV-NOTE: Level progression - which enemies appear at each level
export const LEVEL_ENEMIES = [
    ['slime', 'worm', 'candle_ghost'],                    // Level 1
    ['rabid_lemon', 'potion', 'floating_snail'],          // Level 2
    ['cloud_man', 'little_alien', 'mushroom_mage'],       // Level 3
    ['smog_mage', 'tree_trunk']                           // Level 4+
];

// Add LEVEL_ENEMIES to CONFIG for easy access
CONFIG.LEVEL_ENEMIES = LEVEL_ENEMIES;

export default CONFIG;

