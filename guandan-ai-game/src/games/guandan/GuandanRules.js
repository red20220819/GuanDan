/**
 * 🎯 掼蛋游戏规则 - 重构版本
 * 统一的游戏规则处理逻辑
 */

import { GAME_TYPES, CARD_TYPES, CARD_VALUES } from '../../core/Constants.js';

/**
 * 掼蛋游戏规则引擎
 */
export class GuandanRules {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.currentLevel = gameEngine.config.level || 2;
        console.log(`🎯 掼蛋规则引擎初始化，当前等级: ${this.currentLevel}`);
    }

    /**
     * 创建牌堆
     */
    createDeck() {
        console.log('🎴 创建掼蛋牌堆...');

        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        const deck = [];

        // 创建两副牌
        for (let deckNum = 0; deckNum < 2; deckNum++) {
            for (const suit of suits) {
                for (const rank of ranks) {
                    deck.push({
                        id: `${suit}_${rank}_${deckNum}`,
                        suit: suit,
                        rank: rank,
                        display: rank + suit,
                        value: CARD_VALUES[rank],
                        isRed: suit === '♥' || suit === '♦',
                        deckNum: deckNum
                    });
                }
            }
        }

        // 添加大小王
        const jokers = [
            { id: `joker_small_1`, suit: 'joker', rank: '小王', display: '🃟', value: CARD_VALUES.small_joker, isRed: true, deckNum: 0 },
            { id: `joker_big_1`, suit: 'joker', rank: '大王', display: '🃏', value: CARD_VALUES.big_joker, isRed: true, deckNum: 0 },
            { id: `joker_small_2`, suit: 'joker', rank: '小王', display: '🃟', value: CARD_VALUES.small_joker, isRed: true, deckNum: 1 },
            { id: `joker_big_2`, suit: 'joker', rank: '大王', display: '🃏', value: CARD_VALUES.big_joker, isRed: true, deckNum: 1 }
        ];

        deck.push(...jokers);

        console.log(`✅ 掼蛋牌堆创建完成: ${deck.length} 张牌`);
        this.gameEngine.deck = deck;

        return deck;
    }

    /**
     * 洗牌
     */
    shuffleDeck(deck) {
        console.log('🔀 洗牌中...');

        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        console.log('✅ 洗牌完成');
    }

    /**
     * 验证出牌合法性
     */
    validatePlay(cards, lastPlay, playerCards) {
        if (!cards || cards.length === 0) {
            return { valid: false, message: '没有选择牌' };
        }

        // 检查牌型
        const cardType = this.getCardType(cards);
        if (!cardType) {
            return { valid: false, message: '无效的牌型' };
        }

        // 检查是否轮到该玩家出牌
        if (lastPlay && lastPlay.playerId !== this.getCurrentPlayerId()) {
            return { valid: false, message: '不是你的出牌轮次' };
        }

        // 基本规则验证
        return this.validateByCardType(cards, cardType, lastPlay, playerCards);
    }

    /**
     * 根据牌型验证出牌
     */
    validateByCardType(cards, cardType, lastPlay, playerCards) {
        const cardCount = cards.length;

        switch (cardType.type) {
            case CARD_TYPES.SINGLE:
                return this.validateSingle(cards, lastPlay);

            case CARD_TYPES.PAIR:
                return this.validatePair(cards, lastPlay);

            case CARD_TYPES.TRIPLE:
                return this.validateTriple(cards, lastPlay);

            case CARD_TYPES.TRIPLE_WITH_PAIR:
                return this.validateTripleWithPair(cards, lastPlay);

            case CARD_TYPES.STRAIGHT:
                return this.validateStraight(cards, lastPlay);

            case CARD_TYPES.CONSECUTIVE_PAIRS:
                return this.validateConsecutivePairs(cards, lastPlay);

            case CARD_TYPES.STEEL_PLATE:
                return this.validateSteelPlate(cards, lastPlay);

            case CARD_TYPES.STRAIGHT_FLUSH:
                return this.validateStraightFlush(cards, lastPlay);

            case CARD_TYPES.BOMB:
                return this.validateBomb(cards, lastPlay);

            case CARD_TYPES.FOUR_KINGS:
                return this.validateFourKings(cards, lastPlay);

            default:
                return { valid: false, message: '未知的牌型' };
        }
    }

    /**
     * 验证单张
     */
    validateSingle(cards, lastPlay) {
        if (cards.length !== 1) {
            return { valid: false, message: '单张只能出1张牌' };
        }

        return this.validateCardValue(cards, lastPlay);
    }

    /**
     * 验证对子
     */
    validatePair(cards, lastPlay) {
        if (cards.length !== 2) {
            return { valid: false, message: '对子必须出2张牌' };
        }

        // 检查是否为对子
        const isPair = cards[0].rank === cards[1].rank;
        if (!isPair) {
            return { valid: false, message: '两张牌必须相同' };
        }

        return this.validateCardValue(cards, lastPlay);
    }

    /**
     * 验证三张
     */
    validateTriple(cards, lastPlay) {
        if (cards.length !== 3) {
            return { valid: false, message: '三张必须出3张牌' };
        }

        // 检查是否为三张
        const isTriple = cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
        if (!isTriple) {
            return { valid: false, message: '三张牌必须相同' };
        }

        return this.validateCardValue(cards, lastPlay);
    }

    
    /**
     * 验证三带二（三带对）
     */
    validateTripleWithPair(cards, lastPlay) {
        if (cards.length !== 5) {
            return { valid: false, message: '三带二必须出5张牌' };
        }

        // 统计每个点数的张数
        const rankCounts = {};
        for (const card of cards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }

        // 找到三张的牌和对子的牌
        const ranks = Object.keys(rankCounts);
        let tripleRank = null;
        let pairRank = null;

        for (const rank of ranks) {
            if (rankCounts[rank] === 3) {
                tripleRank = rank;
            } else if (rankCounts[rank] === 2) {
                pairRank = rank;
            }
        }

        // 检查是否为有效的三带二
        if (!tripleRank || !pairRank) {
            return { valid: false, message: '必须是三张相同 + 两张相同（对子）' };
        }

        return this.validateCardValue(cards, lastPlay);
    }

    /**
     * 验证顺子
     */
    validateStraight(cards, lastPlay) {
        if (cards.length < 5) {
            return { valid: false, message: '顺子至少需要5张牌' };
        }

        const sortedCards = [...cards].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
        const isSequential = this.checkSequential(sortedCards);
        if (!isSequential) {
            return { valid: false, message: '牌值必须是连续的' };
        }

        return this.validateCardValue(cards, lastPlay);
    }

    /**
     * 验证连续对子
     */
    validateConsecutivePairs(cards, lastPlay) {
        if (cards.length % 2 !== 0 || cards.length < 6) {
            return { valid: false, message: '连续对子必须是偶数张' };
        }

        // 检查是否为连续对子
        const sortedCards = [...cards].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
        const pairs = [];

        for (let i = 0; i < sortedCards.length - 1; i += 2) {
            if (sortedCards[i].rank === sortedCards[i + 1].rank) {
                pairs.push([sortedCards[i], sortedCards[i + 1]]);
            } else {
                return { valid: false, message: '必须是对子' };
            }
        }

        return this.validateCardValue(cards, lastPlay);
    }

    /**
     * 验证钢板（连续三张）
     */
    validateSteelPlate(cards, lastPlay) {
        // 钢板必须是6张牌（两个连续的三张）
        if (cards.length !== 6) {
            return { valid: false, message: '钢板必须是6张牌（两个连续的三张）' };
        }

        // 统计每个点数的张数
        const rankCounts = {};
        for (const card of cards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }

        // 检查是否为两个连续的三张
        const ranks = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 3);

        if (ranks.length !== 2) {
            return { valid: false, message: '钢板必须由两个三张组成' };
        }

        // 检查是否连续
        const values = ranks.map(rank => CARD_VALUES[rank]).sort((a, b) => a - b);
        if (values[1] - values[0] !== 1) {
            return { valid: false, message: '两个三张必须连续' };
        }

        // 返回较大的三张的值进行比较
        const maxValue = Math.max(values[0], values[1]);
        return this.validateCardValue(cards, lastPlay);
    }

    /**
     * 验证炸弹
     */
    validateBomb(cards, lastPlay) {
        if (cards.length < 4) {
            return { valid: false, message: '炸弹至少需要4张牌' };
        }

        const ranks = cards.map(card => card.rank);
        const isAllSame = ranks.every(rank => rank === ranks[0]);
        if (!isAllSame) {
            return { valid: false, message: '炸弹必须所有牌相同' };
        }

        return { valid: true, type: CARD_TYPES.BOMB, count: cards.length };
    }

    /**
     * 验证王炸（4张王牌）
     */
    validateFourKings(cards, lastPlay) {
        if (cards.length !== 4) {
            return { valid: false, message: '王炸必须是4张牌' };
        }

        // 检查是否都是王牌
        const allJokers = cards.every(card => card.suit === 'JOKER');
        if (!allJokers) {
            return { valid: false, message: '王炸必须由4张王牌组成' };
        }

        // 检查是否有2大王2小王
        const bigJokerCount = cards.filter(card => card.rank === '大王').length;
        const smallJokerCount = cards.filter(card => card.rank === '小王').length;

        if (bigJokerCount !== 2 || smallJokerCount !== 2) {
            return { valid: false, message: '王炸必须由2大王和2小王组成' };
        }

        return { valid: true, type: CARD_TYPES.FOUR_KINGS };
    }

    /**
     * 验证同花顺
     */
    validateStraightFlush(cards, lastPlay) {
        // 同花顺至少5张
        if (cards.length < 5) {
            return { valid: false, message: '同花顺至少需要5张牌' };
        }

        // 检查是否同花色
        const suit = cards[0].suit;
        const sameSuit = cards.every(card => card.suit === suit);
        if (!sameSuit) {
            return { valid: false, message: '同花顺必须所有牌同花色' };
        }

        // 检查是否是顺子
        const sortedCards = [...cards].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
        let isSequential = true;
        for (let i = 1; i < sortedCards.length; i++) {
            if (CARD_VALUES[sortedCards[i].rank] - CARD_VALUES[sortedCards[i-1].rank] !== 1) {
                isSequential = false;
                break;
            }
        }

        if (!isSequential) {
            return { valid: false, message: '同花顺必须是连续的牌' };
        }

        return { valid: true, type: CARD_TYPES.STRAIGHT_FLUSH, length: cards.length };
    }

    /**
     * 检查是否为连续数字
     */
    checkSequential(cards) {
        for (let i = 1; i < cards.length; i++) {
            if (cards[i] - cards[i-1] !== 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * 验证牌值大小 - 两层校验架构
     */
    validateCardValue(currentPlay, lastPlay) {
        if (!lastPlay) {
            return { valid: true };
        }

        // 获取牌型
        const currentType = this.getCardType(currentPlay);
        const lastType = this.getCardType(lastPlay);

        if (!currentType || !lastType) {
            return { valid: false, message: '无法识别牌型' };
        }

        // 第一层：牌型关 - 判断是否有资格比较
        if (!this.canCompareType(lastType, currentType)) {
            return { valid: false, message: '牌型不同，无法比较' };
        }

        // 第二层：大小关 - 比较权重
        if (this.compareWeight(lastType, currentType)) {
            return { valid: true };
        } else {
            return { valid: false, message: '牌值太小，不能打过' };
        }
    }

    /**
     * 判断是否有资格比较（牌型关）
     */
    canCompareType(lastPlay, currentPlay) {
        // 同型才能比较
        if (lastPlay.type === currentPlay.type) {
            return true;
        }

        // 炸弹可以打任何牌
        if (this.isBombType(currentPlay.type)) {
            return true;
        }

        // 非炸弹不能打炸弹
        if (this.isBombType(lastPlay.type)) {
            return false;
        }

        // 其他情况不能比较
        return false;
    }

    /**
     * 判断是否为炸弹类型
     */
    isBombType(type) {
        return [CARD_TYPES.BOMB, CARD_TYPES.STRAIGHT_FLUSH, CARD_TYPES.FOUR_KINGS].includes(type);
    }

    /**
     * 比较权重（大小关）
     */
    compareWeight(lastPlay, currentPlay) {
        // 都是炸弹的情况
        if (this.isBombType(lastPlay.type) && this.isBombType(currentPlay.type)) {
            return this.compareBombs(lastPlay, currentPlay);
        }

        // 同类型普通牌比较
        return this.compareSameType(lastPlay, currentPlay);
    }

    /**
     * 比较炸弹
     */
    compareBombs(lastPlay, currentPlay) {
        // 王炸最大
        if (currentPlay.type === CARD_TYPES.FOUR_KINGS) {
            return true;
        }
        if (lastPlay.type === CARD_TYPES.FOUR_KINGS) {
            return false;
        }

        // 同花顺
        if (currentPlay.type === CARD_TYPES.STRAIGHT_FLUSH && lastPlay.type !== CARD_TYPES.STRAIGHT_FLUSH) {
            return true;
        }
        if (lastPlay.type === CARD_TYPES.STRAIGHT_FLUSH && currentPlay.type !== CARD_TYPES.STRAIGHT_FLUSH) {
            return false;
        }

        // 普通炸弹比较
        if (currentPlay.type === CARD_TYPES.BOMB && lastPlay.type === CARD_TYPES.BOMB) {
            // 张数多的炸弹大
            if (currentPlay.count !== lastPlay.count) {
                return currentPlay.count > lastPlay.count;
            }
            // 张数相同比较点数
            return currentPlay.value > lastPlay.value;
        }

        return false;
    }

    /**
     * 比较相同类型
     */
    compareSameType(lastPlay, currentPlay) {
        // 钢板、连对、顺子需要相同长度
        if ([CARD_TYPES.STEEL_PLATE, CARD_TYPES.CONSECUTIVE_PAIRS, CARD_TYPES.STRAIGHT].includes(currentPlay.type)) {
            if (currentPlay.length !== lastPlay.length) {
                return false; // 长度不同不能比较
            }
        }

        // 比较权重值
        return currentPlay.value > lastPlay.value;
    }

    /**
     * 获取牌值
     */
    getCardValue(cards) {
        if (!cards || cards.length === 0) {
            return 0;
        }

        // 单张牌的处理
        if (cards.length === 1) {
            const card = cards[0];

            // 检查是否为级牌
            if (this.isLevelCard(card)) {
                return CARD_VALUES.level_card;
            }

            // 普通牌
            return CARD_VALUES[card.rank] || 0;
        }

        // 多张牌的处理
        return cards.reduce((sum, card) => {
            if (this.isLevelCard(card)) {
                return sum + CARD_VALUES.level_card;
            }
            return sum + (CARD_VALUES[card.rank] || 0);
        }, 0);
    }

    /**
     * 判断是否为级牌（红桃级牌）
     */
    isLevelCard(card) {
        if (!card) return false;

        // 获取当前级数对应的点数
        const levelRanks = {
            2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
            7: '7', 8: '8', 9: '9', 10: '10',
            J: 'J', Q: 'Q', K: 'K', A: 'A'
        };

        const levelRank = levelRanks[this.currentLevel] || '2';
        return card.rank === levelRank && card.suit === '♥';
    }

    /**
     * 获取牌型
     */
    getCardType(cards) {
        if (!cards || cards.length === 0) {
            return null;
        }

        const cardCount = cards.length;

        // 1. 王炸（4张王牌）
        if (cardCount === 4) {
            const allJokers = cards.every(card => card.suit === 'JOKER');
            if (allJokers) {
                const bigJokers = cards.filter(card => card.rank === '大王').length;
                const smallJokers = cards.filter(card => card.rank === '小王').length;
                if (bigJokers === 2 && smallJokers === 2) {
                    return { type: CARD_TYPES.FOUR_KINGS, value: 100000 };
                }
            }
        }

        // 2. 同花顺（5张及以上）
        if (cardCount >= 5) {
            if (this.isStraightFlush(cards)) {
                return { type: CARD_TYPES.STRAIGHT_FLUSH, value: 50000 + this.getMainValue(cards) };
            }
        }

        // 3. 炸弹（4张及以上）
        if (cardCount >= 4) {
            const ranks = cards.map(card => card.rank);
            const allSame = ranks.every(rank => rank === ranks[0]);
            if (allSame) {
                return { type: CARD_TYPES.BOMB, value: 10000 + cardCount * 1000 + this.getMainValue(cards), count: cardCount };
            }
        }

        // 4. 钢板（6张：两个连续三张）
        if (cardCount === 6) {
            const steelPlate = this.checkSteelPlate(cards);
            if (steelPlate) {
                return { type: CARD_TYPES.STEEL_PLATE, value: 4000 + steelPlate.mainValue, length: 2 };
            }
        }

        // 5. 连对（6张及以上）
        if (cardCount >= 6 && cardCount % 2 === 0) {
            if (this.isConsecutivePairs(cards)) {
                return { type: CARD_TYPES.CONSECUTIVE_PAIRS, value: 3000 + this.getMainValue(cards), length: cardCount / 2 };
            }
        }

        // 6. 顺子（5张及以上）
        if (cardCount >= 5) {
            if (this.isStraight(cards)) {
                return { type: CARD_TYPES.STRAIGHT, value: 2000 + this.getMainValue(cards), length: cardCount };
            }
        }

        // 7. 三带二（5张）
        if (cardCount === 5) {
            const triplePair = this.checkTripleWithPair(cards);
            if (triplePair) {
                return { type: CARD_TYPES.TRIPLE_WITH_PAIR, value: 1000 + triplePair.mainValue };
            }
        }

        // 8. 三张（3张）
        if (cardCount === 3) {
            const ranks = cards.map(card => card.rank);
            if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) {
                return { type: CARD_TYPES.TRIPLE, value: 800 + this.getMainValue(cards) };
            }
        }

        // 9. 对子（2张）
        if (cardCount === 2) {
            if (cards[0].rank === cards[1].rank) {
                return { type: CARD_TYPES.PAIR, value: 500 + this.getMainValue(cards) };
            }
        }

        // 10. 单张（1张）
        if (cardCount === 1) {
            return { type: CARD_TYPES.SINGLE, value: 100 + this.getMainValue(cards) };
        }

        return null;
    }

    /**
     * 检查是否为同花顺
     */
    isStraightFlush(cards) {
        if (cards.length < 5) return false;

        // 检查同花色
        const suit = cards[0].suit;
        const sameSuit = cards.every(card => card.suit === suit);
        if (!sameSuit) return false;

        // 检查连续
        return this.isStraight(cards);
    }

    /**
     * 检查是否为顺子
     */
    isStraight(cards) {
        const sortedCards = [...cards].sort((a, b) => CARD_VALUES[a.rank] - CARD_VALUES[b.rank]);
        for (let i = 1; i < sortedCards.length; i++) {
            if (CARD_VALUES[sortedCards[i].rank] - CARD_VALUES[sortedCards[i-1].rank] !== 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查是否为连对
     */
    isConsecutivePairs(cards) {
        if (cards.length < 6 || cards.length % 2 !== 0) return false;

        // 统计每个点数的张数
        const rankCounts = {};
        for (const card of cards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }

        // 检查是否都是对子
        const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2);
        if (pairs.length !== cards.length / 2) return false;

        // 检查是否连续
        const sortedRanks = pairs.sort((a, b) => CARD_VALUES[a] - CARD_VALUES[b]);
        for (let i = 1; i < sortedRanks.length; i++) {
            if (CARD_VALUES[sortedRanks[i]] - CARD_VALUES[sortedRanks[i-1]] !== 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查钢板
     */
    checkSteelPlate(cards) {
        const rankCounts = {};
        for (const card of cards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }

        // 找出三张的牌
        const triples = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 3);
        if (triples.length !== 2) return null;

        // 检查是否连续
        const values = triples.map(rank => CARD_VALUES[rank]).sort((a, b) => a - b);
        if (values[1] - values[0] !== 1) return null;

        return { mainValue: Math.max(values[0], values[1]) };
    }

    /**
     * 检查三带二
     */
    checkTripleWithPair(cards) {
        const rankCounts = {};
        for (const card of cards) {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        }

        let tripleRank = null;
        let pairRank = null;

        for (const rank in rankCounts) {
            if (rankCounts[rank] === 3) tripleRank = rank;
            if (rankCounts[rank] === 2) pairRank = rank;
        }

        if (tripleRank && pairRank) {
            return { mainValue: CARD_VALUES[tripleRank] };
        }
        return null;
    }

    /**
     * 获取主要牌值
     */
    getMainValue(cards) {
        // 级牌特殊处理
        if (cards.length === 1 && this.isLevelCard(cards[0])) {
            return CARD_VALUES.level_card;
        }

        // 其他情况取最大值
        return Math.max(...cards.map(card => {
            if (this.isLevelCard(card)) {
                return CARD_VALUES.level_card;
            }
            return CARD_VALUES[card.rank] || 0;
        }));
    }

    /**
     * 获取当前玩家ID
     */
    getCurrentPlayerId() {
        return this.gameEngine.currentPlayer;
    }
}