/**
 * 掼蛋规则引擎 - 修正版
 * 根据标准掼蛋规则重新实现
 */

class RuleEngine {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.currentLevel = 2; // 当前级数

        // 牌型权重定义
        this.cardWeights = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14,
            // 级牌权重
            'level': 101,
            // 王牌权重
            '小王': 102,
            '大王': 103
        };

        // 炸弹权重（官方顺序：天王炸 > 8炸 > 7炸 > 6炸 > 同花顺 > 5炸 > 4炸）
        this.bombWeights = {
            8: 800,   // 8炸
            7: 700,   // 7炸
            6: 600,   // 6炸
            5: 500,   // 5炸
            4: 400    // 4炸
        };

        // 同花顺炸弹权重（介于6炸和5炸之间）
        this.straightFlushWeight = 550;
    }

    /**
     * 设置当前级数
     */
    setLevel(level) {
        this.currentLevel = level;
    }

    /**
     * 获取当前级数
     */
    getCurrentLevel() {
        return this.currentLevel;
    }

    /**
     * 检查是否为级牌（逢人配）
     */
    isLevelCard(card) {
        if (card.suit === '♥' && card.rank === this.currentLevel.toString()) {
            return true;
        }
        return false;
    }

    /**
     * 获取牌的权重
     */
    getCardWeight(card) {
        if (card.rank === '小王' || card.rank === '大王') {
            return this.cardWeights[card.rank];
        }

        if (this.isLevelCard(card)) {
            return this.cardWeights['level'];
        }

        return this.cardWeights[card.rank] || 0;
    }

    /**
     * 识别牌型 - 核心方法
     */
    getCardType(cards) {
        if (!cards || cards.length === 0) {
            return null;
        }

        const count = cards.length;

        // 王牌特殊处理
        const jokerCount = cards.filter(c => c.suit === 'joker').length;

        // 天王炸弹（4张王牌）- 官方最大牌型
        if (count === 4 && jokerCount === 4) {
            return {
                type: 'bomb',
                subtype: 'kingBomb',
                family: 'bomb',
                count: 4,
                weight: 1000  // 最大
            };
        }

        // 普通炸弹（4-8张同点数）
        if (count >= 4 && count <= 8) {
            if (this.isNormalBomb(cards)) {
                const mainRank = this.getMainRank(cards);
                return {
                    type: 'bomb',
                    subtype: 'normalBomb',
                    family: 'bomb',
                    rank: mainRank,
                    count: count,
                    weight: this.bombWeights[count] + this.getCardWeight({rank: mainRank})
                };
            }
        }

        // 同花顺炸弹（5张以上同花色连续）
        if (count >= 5) {
            const straightFlush = this.checkStraightFlush(cards);
            if (straightFlush) {
                return {
                    type: 'bomb',
                    subtype: 'straightFlush',
                    family: 'bomb',
                    length: count,
                    highCard: straightFlush.highCard,
                    weight: this.straightFlushWeight + straightFlush.highCard + count
                };
            }
        }

        // 普通牌型
        // 单张
        if (count === 1) {
            return {
                type: 'single',
                family: 'normal',
                rank: cards[0].rank,
                weight: this.getCardWeight(cards[0])
            };
        }

        // 对子
        if (count === 2) {
            if (this.isPair(cards)) {
                return {
                    type: 'pair',
                    family: 'normal',
                    rank: cards[0].rank,
                    weight: 20 + this.getCardWeight(cards[0])
                };
            }
        }

        // 三张
        if (count === 3) {
            if (this.isTriple(cards)) {
                return {
                    type: 'triple',
                    family: 'normal',
                    rank: cards[0].rank,
                    weight: 30 + this.getCardWeight(cards[0])
                };
            }
        }

        // 三带二（官方规则）
        if (count === 5) {
            const triplePair = this.checkTripleWithPair(cards);
            if (triplePair) {
                return {
                    type: 'tripleWithPair',
                    family: 'normal',
                    mainRank: triplePair.tripleRank,
                    weight: 50 + this.getCardWeight({rank: triplePair.tripleRank})
                };
            }
        }

        // 顺子（5张以上连续单牌）
        if (count >= 5) {
            const straight = this.checkStraight(cards);
            if (straight) {
                return {
                    type: 'straight',
                    family: 'normal',
                    length: count,
                    highCard: straight.highCard,
                    weight: 100 + straight.highCard + count
                };
            }
        }

        // 连对（3对以上连续对子）
        if (count >= 6 && count % 2 === 0) {
            const pairStraight = this.checkPairStraight(cards);
            if (pairStraight) {
                return {
                    type: 'pairStraight',
                    family: 'normal',
                    length: count / 2,
                    highCard: pairStraight.highCard,
                    weight: 200 + pairStraight.highCard + count
                };
            }
        }

        // 钢板（2个以上连续三张）
        if (count >= 6 && count % 3 === 0) {
            const tripleStraight = this.checkTripleStraight(cards);
            if (tripleStraight) {
                return {
                    type: 'tripleStraight',
                    family: 'normal',
                    length: count / 3,
                    highCard: tripleStraight.highCard,
                    weight: 300 + tripleStraight.highCard + count
                };
            }
        }

        return null; // 无效牌型
    }

    /**
     * 检查是否为普通炸弹
     */
    isNormalBomb(cards) {
        if (cards.length < 4 || cards.length > 8) {
            return false;
        }

        const firstRank = cards[0].rank;
        return cards.every(card => card.rank === firstRank);
    }

    /**
     * 获取主要牌级
     */
    getMainRank(cards) {
        // 过滤掉王牌，找其他牌的主rank
        const nonJokers = cards.filter(c => c.suit !== 'joker');
        if (nonJokers.length > 0) {
            return nonJokers[0].rank;
        }
        return cards[0].rank;
    }

    /**
     * 检查是否为对子
     */
    isPair(cards) {
        if (cards.length !== 2) return false;
        return cards[0].rank === cards[1].rank;
    }

    /**
     * 检查是否为三张
     */
    isTriple(cards) {
        if (cards.length !== 3) return false;
        return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
    }

    /**
     * 检查三带二
     */
    checkTripleWithPair(cards) {
        const rankCounts = {};
        cards.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        });

        const ranks = Object.keys(rankCounts);
        if (ranks.length !== 2) return null;

        const [rank1, rank2] = ranks;
        const count1 = rankCounts[rank1];
        const count2 = rankCounts[rank2];

        if ((count1 === 3 && count2 === 2)) {
            return { tripleRank: rank1, pairRank: rank2 };
        }
        if ((count2 === 3 && count1 === 2)) {
            return { tripleRank: rank2, pairRank: rank1 };
        }

        return null;
    }

    /**
     * 检查顺子
     */
    checkStraight(cards) {
        if (cards.length < 5) return null;

        // 排序
        const sorted = [...cards].sort((a, b) => this.getCardWeight(a) - this.getCardWeight(b));

        // 检查连续性
        for (let i = 1; i < sorted.length; i++) {
            const prevWeight = this.getCardWeight(sorted[i - 1]);
            const currWeight = this.getCardWeight(sorted[i]);

            // 王牌和级牌不能参与顺子
            if (sorted[i].suit === 'joker' || this.isLevelCard(sorted[i])) {
                return null;
            }

            if (currWeight !== prevWeight + 1) {
                return null;
            }
        }

        return {
            highCard: this.getCardWeight(sorted[sorted.length - 1])
        };
    }

    /**
     * 检查连对
     */
    checkPairStraight(cards) {
        if (cards.length < 6 || cards.length % 2 !== 0) return null;

        // 先按点数分组
        const rankGroups = {};
        cards.forEach(card => {
            if (!rankGroups[card.rank]) {
                rankGroups[card.rank] = [];
            }
            rankGroups[card.rank].push(card);
        });

        // 检查每组的数量
        const pairs = [];
        for (let rank in rankGroups) {
            if (rankGroups[rank].length !== 2) {
                return null;
            }
            pairs.push(rank);
        }

        // 检查连续性
        pairs.sort((a, b) => this.getCardWeight({rank: a}) - this.getCardWeight({rank: b}));

        for (let i = 1; i < pairs.length; i++) {
            const prevWeight = this.getCardWeight({rank: pairs[i - 1]});
            const currWeight = this.getCardWeight({rank: pairs[i]});

            if (currWeight !== prevWeight + 1) {
                return null;
            }
        }

        return {
            highCard: this.getCardWeight({rank: pairs[pairs.length - 1]})
        };
    }

    /**
     * 检查钢板（连续三张）
     */
    checkTripleStraight(cards) {
        if (cards.length < 6 || cards.length % 3 !== 0) return null;

        // 先按点数分组
        const rankGroups = {};
        cards.forEach(card => {
            if (!rankGroups[card.rank]) {
                rankGroups[card.rank] = [];
            }
            rankGroups[card.rank].push(card);
        });

        // 检查每组的数量
        const triples = [];
        for (let rank in rankGroups) {
            if (rankGroups[rank].length !== 3) {
                return null;
            }
            triples.push(rank);
        }

        // 检查连续性
        triples.sort((a, b) => this.getCardWeight({rank: a}) - this.getCardWeight({rank: b}));

        for (let i = 1; i < triples.length; i++) {
            const prevWeight = this.getCardWeight({rank: triples[i - 1]});
            const currWeight = this.getCardWeight({rank: triples[i]});

            if (currWeight !== prevWeight + 1) {
                return null;
            }
        }

        return {
            highCard: this.getCardWeight({rank: triples[triples.length - 1]})
        };
    }

    /**
     * 检查同花顺
     */
    checkStraightFlush(cards) {
        if (cards.length < 5) return null;

        // 检查花色是否相同
        const suit = cards[0].suit;
        if (!cards.every(card => card.suit === suit)) {
            return null;
        }

        // 检查是否为顺子
        return this.checkStraight(cards);
    }

    /**
     * 比较两个牌型的大小
     * 规则：只有同类型或炸弹才能比较
     */
    canBeat(cards1, cards2) {
        const type1 = this.getCardType(cards1);
        const type2 = this.getCardType(cards2);

        if (!type1 || !type2) {
            return false;
        }

        // 炸弹可以打任何非炸弹牌型
        if (type1.family === 'bomb' && type2.family !== 'bomb') {
            return true;
        }

        // 非炸弹不能打炸弹
        if (type1.family !== 'bomb' && type2.family === 'bomb') {
            return false;
        }

        // 必须是相同牌型
        if (type1.type !== type2.type) {
            return false;
        }

        // 相同牌型比大小
        if (type1.family === 'bomb') {
            // 天王炸弹最大
            if (type1.subtype === 'kingBomb') return true;
            if (type2.subtype === 'kingBomb') return false;

            // 同花顺 vs 普通炸弹
            if (type1.subtype === 'straightFlush' && type2.subtype !== 'straightFlush') {
                // 同花顺 > 5炸 和 4炸，但 < 6炸及以上
                return type2.count <= 5;
            }
            if (type2.subtype === 'straightFlush' && type1.subtype !== 'straightFlush') {
                return type1.count <= 5;
            }

            // 普通炸弹之间比较
            if (type1.count !== type2.count) {
                return type1.count > type2.count;
            }
            // 张数相同比点数
            return type1.weight > type2.weight;
        } else {
            // 普通牌型比较
            return type1.weight > type2.weight;
        }
    }

    /**
     * 验证出牌是否合法
     */
    validatePlay(cards, lastPlay) {
        if (!cards || cards.length === 0) {
            return { valid: false, message: '请选择要出的牌' };
        }

        const currentType = this.getCardType(cards);
        if (!currentType) {
            return { valid: false, message: '无效的牌型' };
        }

        // 如果是第一手牌，任何有效牌型都可以
        if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
            return { valid: true, type: currentType };
        }

        const lastType = this.getCardType(lastPlay.cards);
        if (!lastType) {
            return { valid: false, message: '上家出牌无效' };
        }

        // 使用canBeat方法判断
        if (this.canBeat(cards, lastPlay.cards)) {
            return { valid: true, type: currentType };
        }

        return { valid: false, message: '出牌必须大于上家' };
    }
}