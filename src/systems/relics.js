// AIDEV-NOTE: Relic system - provides special abilities and word bonuses
// Relics can modify damage, add words to dictionary, require letters, etc.

import { CONFIG } from '../config.js';

// Base Relic class
class Relic {
    constructor(name, description, imagePath) {
        this.name = name;
        this.description = description;
        this.imagePath = imagePath;
        this.wordList = [];
        this.assignedOnly = false;  // If true, can't be selected by player
    }
    
    setWordList(words) {
        this.wordList = words.map(w => w.toLowerCase());
        return this;
    }
    
    isWordInList(word) {
        return this.wordList.includes(word.toLowerCase());
    }
    
    // Override these methods in specific relics
    getWordScoreMult(word) { return 1; }
    getWordScoreAdditive(word) { return 0; }
    getWordVulnerabilityMult(word) { return 1; }
    getWordHealthPercentDamage(word) { return 0; }
    getWordIsUnblockable(word) { return false; }
    getWordAcceptedHealing(word) { return 0; }
    getRequiredRackLetters() { return null; }
    getAdditionalWordList() { return []; }
}

// Relic Manager - handles active relics for each player
class RelicManager {
    constructor() {
        this.relics = {};  // All registered relics
        this.activeRelics = {
            1: {},  // Player 1's active relics
            2: {}   // Player 2's active relics (enemy)
        };
        this.images = {};  // Cached relic images
    }
    
    registerRelic(relic) {
        this.relics[relic.name] = relic;
    }
    
    getRelic(name) {
        return this.relics[name];
    }
    
    activateRelic(name, playerNumber) {
        const relic = this.getRelic(name);
        if (relic) {
            this.activeRelics[playerNumber][name] = true;
            return true;
        }
        return false;
    }
    
    deactivateRelic(name, playerNumber) {
        delete this.activeRelics[playerNumber][name];
    }
    
    isRelicActive(name, playerNumber) {
        return this.activeRelics[playerNumber][name] === true;
    }
    
    getActiveRelics(playerNumber) {
        const active = [];
        for (const name in this.activeRelics[playerNumber]) {
            const relic = this.relics[name];
            if (relic) active.push(relic);
        }
        return active;
    }
    
    getActiveRelicNames(playerNumber) {
        return Object.keys(this.activeRelics[playerNumber]);
    }
    
    // Get all selectable relics (not assignedOnly)
    getSelectableRelics() {
        return Object.values(this.relics).filter(r => !r.assignedOnly);
    }
    
    // Get random inactive relics for selection
    getRandomInactiveRelics(count, playerNumber) {
        const inactive = Object.values(this.relics).filter(r => 
            !r.assignedOnly && !this.activeRelics[playerNumber][r.name]
        );
        
        // Shuffle and take count
        for (let i = inactive.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [inactive[i], inactive[j]] = [inactive[j], inactive[i]];
        }
        
        return inactive.slice(0, count);
    }
    
    // Aggregate methods - combine effects from all active relics
    
    getAdditiveResult(methodName, playerNumber, ...args) {
        let result = 0;
        for (const relic of this.getActiveRelics(playerNumber)) {
            if (typeof relic[methodName] === 'function') {
                result += relic[methodName](...args);
            }
        }
        return result;
    }
    
    getMultResult(methodName, playerNumber, ...args) {
        let result = 1;
        for (const relic of this.getActiveRelics(playerNumber)) {
            if (typeof relic[methodName] === 'function') {
                result *= relic[methodName](...args);
            }
        }
        return result;
    }
    
    getMaxResult(methodName, playerNumber, ...args) {
        let result = 0;
        for (const relic of this.getActiveRelics(playerNumber)) {
            if (typeof relic[methodName] === 'function') {
                result = Math.max(result, relic[methodName](...args));
            }
        }
        return result;
    }
    
    getAnyTrueResult(methodName, playerNumber, ...args) {
        for (const relic of this.getActiveRelics(playerNumber)) {
            if (typeof relic[methodName] === 'function') {
                if (relic[methodName](...args) === true) {
                    return true;
                }
            }
        }
        return false;
    }
    
    getListOfResults(methodName, playerNumber, ...args) {
        const results = [];
        for (const relic of this.getActiveRelics(playerNumber)) {
            if (typeof relic[methodName] === 'function') {
                const result = relic[methodName](...args);
                if (result !== null && result !== undefined) {
                    results.push(result);
                }
            }
        }
        return results;
    }
    
    // Clear all relics for a player
    clearRelics(playerNumber) {
        this.activeRelics[playerNumber] = {};
    }
}

// Create relic manager instance
export const relicManager = new RelicManager();

// ============================================
// Relic Definitions
// ============================================

// Rock Relic - "rock" is unblockable and deals 50% max health
class RockRelic extends Relic {
    constructor() {
        super('Rock', 'The word "rock" is unblockable and deals 50% of target\'s max health.', 'Relics-Rock.png');
        this.setWordList(['rock']);
    }
    
    getWordHealthPercentDamage(word) {
        return this.isWordInList(word) ? 0.5 : 0;
    }
    
    getWordIsUnblockable(word) {
        return this.isWordInList(word);
    }
}

// Alpha Relic - Words starting with 'a' deal double damage
class AlphaRelic extends Relic {
    constructor() {
        super('Alpha', 'Words starting with "a" deal double damage.', 'Relics-Axe.png');
    }
    
    getWordScoreMult(word) {
        return word.toLowerCase().startsWith('a') ? 2 : 1;
    }
}

// Worm Relic - Words starting with 'w' deal double damage
class WormRelic extends Relic {
    constructor() {
        super('Worm', 'Words starting with "w" deal double damage.', 'Relics-Worm.png');
    }
    
    getWordScoreMult(word) {
        return word.toLowerCase().startsWith('w') ? 2 : 1;
    }
}

// Hiss Relic - Always have an 's' on your rack
class HissRelic extends Relic {
    constructor() {
        super('Hiss', 'You always have an "s" on your rack.', 'Relics-Snake.png');
    }
    
    getRequiredRackLetters() {
        return 's';
    }
}

// Yolk Relic - Gain 1 HP for every 3-letter word
class YolkRelic extends Relic {
    constructor() {
        super('Yolk', 'Gain 1 HP every time you play a 3-letter word.', 'Relics-Dino Egg.png');
    }
    
    getWordAcceptedHealing(word) {
        return word.length === 3 ? 1 : 0;
    }
}

// Straight and Narrow - Bonus for words with no curved letters
class StraightRelic extends Relic {
    constructor() {
        super('Straight and Narrow', 'Bonus damage for words with no curved letters.', 'Relics-Ruler.png');
        this.curvedLetters = new Set(['b', 'c', 'd', 'g', 'j', 'o', 'p', 'q', 'r', 's', 'u']);
    }
    
    getWordScoreMult(word) {
        for (const char of word.toLowerCase()) {
            if (this.curvedLetters.has(char)) {
                return 1;
            }
        }
        return 2;  // Double damage for words with no curved letters
    }
}

// Alphabet Relic - Damage multiplied by sequential letters
class AlphabetRelic extends Relic {
    constructor() {
        super('Alphabet', 'Damage is multiplied by the number of sequential letters.', 'Relics-Letter.png');
    }
    
    getWordScoreMult(word) {
        const lower = word.toLowerCase();
        let maxSeq = 1;
        let currentSeq = 1;
        
        for (let i = 1; i < lower.length; i++) {
            if (lower.charCodeAt(i) === lower.charCodeAt(i - 1) + 1) {
                currentSeq++;
                maxSeq = Math.max(maxSeq, currentSeq);
            } else {
                currentSeq = 1;
            }
        }
        
        return maxSeq;
    }
}

// ABCs Relic - Bonus if all letters in alphabetical order
class ABCsRelic extends Relic {
    constructor() {
        super('ABCs', 'Bonus damage if all letters are in alphabetical order.', 'Relics-Calculator.png');
    }
    
    getWordScoreMult(word) {
        const lower = word.toLowerCase();
        
        for (let i = 1; i < lower.length; i++) {
            if (lower.charCodeAt(i) < lower.charCodeAt(i - 1)) {
                return 1;
            }
        }
        
        return 2;  // Double damage for alphabetical words
    }
}

// Tacocat Relic - Palindromes deal bonus damage
class TacocatRelic extends Relic {
    constructor() {
        super('Tacocat', 'Add "tacocat" to your dictionary. Palindromes deal bonus damage.', 'Relics-Pizza.png');
        this.setWordList(['tacocat']);
    }
    
    getAdditionalWordList() {
        return this.wordList;
    }
    
    getWordScoreMult(word) {
        const lower = word.toLowerCase();
        const reversed = lower.split('').reverse().join('');
        return lower === reversed ? 2 : 1;
    }
}

// Treble Cleft - Musical notes deal 8 damage
class TrebleCleftRelic extends Relic {
    constructor() {
        super('Treble Cleft', 'Add musical notes to the dictionary. They deal 8 damage.', 'Relics-Teapot.png');
        this.setWordList(['do', 're', 'mi', 'fa', 'so', 'la', 'ti']);
    }
    
    getAdditionalWordList() {
        return this.wordList;
    }
    
    getWordScoreAdditive(word) {
        return this.isWordInList(word) ? 6 : 0;  // +6 to make total ~8
    }
}

// Bomb Relic - Damage based on most common letter
class BombRelic extends Relic {
    constructor() {
        super('Bomb', 'Words deal more damage based on their most common letter.', 'Relics-Box.png');
    }
    
    getWordScoreMult(word) {
        const counts = {};
        for (const char of word.toLowerCase()) {
            if (/[a-z]/.test(char)) {
                counts[char] = (counts[char] || 0) + 1;
            }
        }
        return Math.max(...Object.values(counts), 1);
    }
}

// ============================================
// Weakness Relics (enemy-only)
// ============================================

// Cold Words Weakness
class ColdWordsRelic extends Relic {
    constructor() {
        super('Cold Words', 'Words about cold and ice deal bonus damage.', 'Relics-Snake.png');
        this.setWordList(['ice', 'snow', 'chill', 'frost', 'cold', 'freeze', 'frozen', 'arctic', 'polar', 'winter']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Bug Words Weakness
class BugWordsRelic extends Relic {
    constructor() {
        super('Bug Words', 'Words about insects deal bonus damage.', 'Relics-Worm.png');
        this.setWordList(['ant', 'fly', 'bug', 'bee', 'moth', 'wasp', 'pest', 'grub', 'mite', 'flea']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Clean Words Weakness
class CleanWordsRelic extends Relic {
    constructor() {
        super('Clean Words', 'Words about cleanliness deal bonus damage.', 'Relics-Teapot.png');
        this.setWordList(['clean', 'wash', 'soap', 'scrub', 'tidy', 'neat', 'pure', 'fresh', 'wipe', 'rinse']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Dry Words Weakness
class DryWordsRelic extends Relic {
    constructor() {
        super('Dry Words', 'Words about dryness deal bonus damage.', 'Relics-Rock.png');
        this.setWordList(['dry', 'arid', 'dust', 'sand', 'desert', 'parch', 'thirst', 'crack', 'wilt', 'drought']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Smart Words Weakness (Walrump)
class SmartWordsRelic extends Relic {
    constructor() {
        super('Smart Words', 'Words about intelligence deal bonus damage.', 'Relics-Calculator.png');
        this.setWordList(['bright', 'sharp', 'brainy', 'witty', 'wise', 'savvy', 'adept', 'quick', 'keen', 'lucid', 'smart', 'erudite', 'studious']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Gross Words Weakness (Mr. Moneybags)
class GrossWordsRelic extends Relic {
    constructor() {
        super('Gross Words', 'Words about filth and disgust deal bonus damage.', 'Relics-Skull.png');
        this.setWordList(['snot', 'slime', 'odor', 'stink', 'filth', 'germ', 'muck', 'mold', 'pus', 'scum', 'vomit', 'garbage']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Museum Words Weakness (Moai)
class MuseumWordsRelic extends Relic {
    constructor() {
        super('Museum Words', 'Words about museums and artifacts deal bonus damage.', 'Relics-Pillar.png');
        this.setWordList(['relic', 'idol', 'stone', 'case', 'docent', 'label', 'plaque', 'room', 'vault', 'rope', 'glass', 'gallery', 'artifact']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Wind Words Weakness (Stonestack)
class WindWordsRelic extends Relic {
    constructor() {
        super('Wind Words', 'Words about wind and air deal bonus damage.', 'Relics-Box.png');
        this.setWordList(['gust', 'gale', 'blow', 'draft', 'breeze', 'swirl', 'puff', 'blast', 'air', 'wisp', 'eddy', 'cyclone', 'tempest']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// Gardening Words Weakness (Mushmangler)
class GardeningWordsRelic extends Relic {
    constructor() {
        super('Gardening Words', 'Words about gardening deal bonus damage.', 'Relics-Lime.png');
        this.setWordList(['seed', 'root', 'stem', 'leaf', 'weed', 'soil', 'grow', 'prune', 'water', 'mulch', 'compost', 'garden', 'plant']);
        this.assignedOnly = true;
    }
    
    getWordVulnerabilityMult(word) {
        return this.isWordInList(word) ? 2 : 1;
    }
}

// "The" Relic - Word replacement
class TheRelic extends Relic {
    constructor() {
        super('The', 'When you spell "the", replace it with "ubiquitous" for bonus damage.', 'Relics-Magnet.png');
        this.setWordList(['the']);
        this.replaceList = ['the'];
        this.replacementWords = ['ubiquitous'];
    }
    
    getWordReplacement(word) {
        const lower = word.toLowerCase();
        const index = this.replaceList.indexOf(lower);
        if (index >= 0) {
            return this.replacementWords[index];
        }
        return null;
    }
}

// Register all relics
relicManager.registerRelic(new RockRelic());
relicManager.registerRelic(new AlphaRelic());
relicManager.registerRelic(new WormRelic());
relicManager.registerRelic(new HissRelic());
relicManager.registerRelic(new YolkRelic());
relicManager.registerRelic(new StraightRelic());
relicManager.registerRelic(new AlphabetRelic());
relicManager.registerRelic(new ABCsRelic());
relicManager.registerRelic(new TacocatRelic());
relicManager.registerRelic(new TrebleCleftRelic());
relicManager.registerRelic(new BombRelic());

// Weakness relics
relicManager.registerRelic(new ColdWordsRelic());
relicManager.registerRelic(new BugWordsRelic());
relicManager.registerRelic(new CleanWordsRelic());
relicManager.registerRelic(new DryWordsRelic());
relicManager.registerRelic(new SmartWordsRelic());
relicManager.registerRelic(new GrossWordsRelic());
relicManager.registerRelic(new MuseumWordsRelic());
relicManager.registerRelic(new WindWordsRelic());
relicManager.registerRelic(new GardeningWordsRelic());
relicManager.registerRelic(new TheRelic());

export { Relic, RelicManager };
export default relicManager;

