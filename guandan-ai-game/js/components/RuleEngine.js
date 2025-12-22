/**
 * 掼蛋规则引擎 - 修正版
 * 根据标准掼蛋规则重新实现
 */

class RuleEngine {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.currentLevel = 2; // 当前级数

        // 导入A级规则
        if (typeof LevelARules !== 'undefined') {
            this.levelARules = new LevelARules(this);
        } else {
            this.levelARules = null;
        }

        // 牌型权重定义（掼蛋规则：A是最大的普通牌，2是最小的）
        this.cardWeights = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 2,  // 重要：2是最小的
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
        this.straightFlushWeight = 650;
    }

    /**
     * 设置当前级数
     */
    setLevel(level) {
        this.currentLevel = level;
        // 同时更新A级规则
        if (this.levelARules) {
            this.levelARules.setLevel(level);
        }
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

        // 级牌在作为普通牌使用时，按实际点数计算权重
        // 只有在需要作为逢人配时才使用level权重
        return this.cardWeights[card.rank] || 0;
    }

    /**
     * 处理万能牌（逢人配和王牌）的替换
     */
    replaceWildCards(cards, targetType) {
        const levelCards = cards.filter(c => this.isLevelCard(c));
        const jokers = cards.filter(c => c.suit === 'joker');
        const normalCards = cards.filter(c => !this.isLevelCard(c) && c.suit !== 'joker');

        // 根据目标牌型进行万能牌替换
        switch (targetType) {
            case 'single':
                return this.replaceForSingle(cards, normalCards, levelCards, jokers);
            case 'pair':
                return this.replaceForPair(cards, normalCards, levelCards, jokers);
            case 'triple':
                return this.replaceForTriple(cards, normalCards, levelCards, jokers);
            case 'straight':
                return this.replaceForStraight(cards, normalCards, levelCards, jokers);
            case 'bomb':
                return this.replaceForBomb(cards, normalCards, levelCards, jokers);
            default:
                return { valid: false, message: '不支持的牌型' };
        }
    }

    /**
     * 替换单张
     */
    replaceForSingle(cards, normalCards, levelCards, jokers) {
        // 如果只有一张牌，无需替换
        if (cards.length === 1) {
            return { valid: true, cards: cards };
        }
        return { valid: false, message: '单张牌型不能有万能牌' };
    }

    /**
     * 替换对子
     */
    replaceForPair(cards, normalCards, levelCards, jokers) {
        if (cards.length !== 2) return { valid: false, message: '对子必须为2张' };

        // 如果两张都是普通牌且点数相同
        if (normalCards.length === 2 && normalCards[0].rank === normalCards[1].rank) {
            return { valid: true, cards: cards };
        }

        // 如果有一张万能牌
        if ((normalCards.length === 1 && levelCards.length === 1) ||
            (normalCards.length === 1 && jokers.length === 1)) {
            return { valid: true, cards: cards };
        }

        // 如果两张都是万能牌
        if ((levelCards.length === 2) || (jokers.length === 2) ||
            (levelCards.length === 1 && jokers.length === 1)) {
            return { valid: true, cards: cards };
        }

        return { valid: false, message: '无法组成对子' };
    }

    /**
     * 替换三张
     */
  replaceForTriple(cards, normalCards, levelCards, jokers) {
      if (cards.length !== 3) return { valid: false, message: '三张必须为3张' };

      // 如果三张都是普通牌且点数相同
      if (normalCards.length === 3 && normalCards[0].rank === normalCards[1].rank && normalCards[1].rank === normalCards[2].rank) {
          return { valid: true, cards: cards };
      }

      // 如果有万能牌，检查是否可以组成三张
      const wildCardCount = levelCards.length + jokers.length;
      if (wildCardCount > 0) {
          const normalRank = normalCards.length > 0 ? normalCards[0].rank : null;
          // 计算相同点数的牌数量
          const sameRankCount = normalCards.filter(c => c.rank === normalRank).length;

          // 如果有2张普通牌+1张万能牌，或1张普通牌+2张万能牌
          if ((sameRankCount === 2 && wildCardCount === 1) ||
              (sameRankCount === 1 && wildCardCount === 2) ||
              (sameRankCount === 0 && wildCardCount === 3)) {
              return { valid: true, cards: cards };
          }
      }

      return { valid: false, message: '无法组成三张' };
  }

  /**
   * 替换顺子
   */
  replaceForStraight(cards, normalCards, levelCards, jokers) {
      if (cards.length < 5) return { valid: false, message: '顺子至少需要5张' };

      // 过滤掉2和王牌（不能参与顺子）
      const validNormalCards = normalCards.filter(c => c.rank !== '2' && c.suit !== 'joker');
      const wildCardCount = levelCards.length + jokers.length;

      // 如果没有万能牌，检查是否为天然顺子
      if (wildCardCount === 0) {
          return this.checkStraight(cards) ? { valid: true, cards: cards } : { valid: false, message: '不是顺子' };
      }

      // 有万能牌的情况，尝试组成顺子
      // TODO: 实现复杂的顺子替换逻辑
      return { valid: false, message: '暂不支持万能牌组成顺子' };
  }

  /**
   * 替换炸弹
   */
  replaceForBomb(cards, normalCards, levelCards, jokers) {
      const totalCount = cards.length;

      // 检查是否可以组成炸弹
      if (totalCount < 4 || totalCount > 8) {
          return { valid: false, message: '炸弹必须为4-8张' };
      }

      // 统计各点数的牌数
      const rankCounts = {};
      cards.forEach(card => {
          const rank = this.isLevelCard(card) || card.suit === 'joker' ? 'wild' : card.rank;
          rankCounts[rank] = (rankCounts[rank] || 0) + 1;
      });

      // 检查是否可以组成炸弹
      const normalCount = Object.entries(rankCounts).filter(([rank, count]) => rank !== 'wild').reduce((sum, [rank, count]) => sum + count, 0);
      const wildCount = rankCounts['wild'] || 0;

      if (normalCount + wildCount === totalCount && normalCount + wildCount >= 4) {
          return { valid: true, cards: cards };
      }

      return { valid: false, message: '无法组成炸弹' };
  }

  /**
   * 识别牌型 - 核心方法
   */
  getCardType(cards) {
      if (!cards || cards.length === 0) {
          return null;
      }

      const count = cards.length;

      // 分离逢人配、王牌和普通牌
      const levelCards = cards.filter(c => this.isLevelCard(c));
      const jokerCount = cards.filter(c => c.suit === 'joker').length;
      const wildCardCount = levelCards.length + jokerCount;

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

        // 王牌特殊牌型（仅王牌）
        if (jokerCount === count) {
            // 所有牌都是王牌
            if (count === 2) {
                // 两张王牌组成王对
                return {
                    type: 'pair',
                    family: 'normal',
                    rank: '王对',
                    weight: 20 + 103  // 王对的权重基于大王（103）
                };
            } else if (count === 3) {
                // 三张王牌按普通三张处理，只能管三张的牌
                return {
                    type: 'triple',
                    family: 'normal',
                    rank: '王牌',
                    weight: 30 + 103  // 基于大王的权重
                };
            }
        }

        // 普通炸弹（4-8张同点数）
        if (count >= 4 && count <= 8) {
            if (this.isNormalBomb(cards)) {
                const mainRank = this.getMainRank(cards);
                // 炸弹专用权重：A=14, K=13, Q=12, J=11, 10=10, 9=9, 8=8, 7=7, 6=6, 5=5, 4=4, 3=3, 2=2
                // 注意：在炸弹中2是最小的！
                const bombRankWeights = {
                    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
                    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 2
                };
                return {
                    type: 'bomb',
                    subtype: 'normalBomb',
                    family: 'bomb',
                    rank: mainRank,
                    count: count,
                    weight: this.bombWeights[count] + (bombRankWeights[mainRank] || 0)
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
                // 特殊处理：任意两张王牌都是王对
                const jokerCount = cards.filter(c => c.suit === 'joker').length;
                if (jokerCount === 2) {
                    return {
                        type: 'pair',
                        family: 'normal',
                        rank: '王对',
                        weight: 20 + 103  // 王对的权重基于大王（103）
                    };
                }

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

        // 特殊处理：任意两张王牌都可以组成王对
        const jokerCount = cards.filter(c => c.suit === 'joker').length;
        if (jokerCount === 2) {
            return true;
        }

        // 普通对子：点数必须相同
        return cards[0].rank === cards[1].rank;
    }

    /**
     * 检查是否为三张
     */
    isTriple(cards) {
        if (cards.length !== 3) return false;

        // 特殊处理：三张王牌
        const jokerCount = cards.filter(c => c.suit === 'joker').length;
        if (jokerCount === 3) {
            return true;
        }

        // 普通三张：点数必须相同
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

        // 检查所有牌是否符合顺子要求
        for (let i = 0; i < sorted.length; i++) {
            const card = sorted[i];
            const weight = this.getCardWeight(card);

            // 2、王牌和级牌不能参与顺子
            if (card.suit === 'joker' || this.isLevelCard(card) || card.rank === '2') {
                return null;
            }

            // 顺子只能使用3-A的牌
            if (weight < 3 || weight > 14) {
                return null;
            }
        }

        // 检查连续性
        for (let i = 1; i < sorted.length; i++) {
            const prevWeight = this.getCardWeight(sorted[i - 1]);
            const currWeight = this.getCardWeight(sorted[i]);

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

        // 检查每组的数量和牌的合法性
        const pairs = [];
        for (let rank in rankGroups) {
            if (rankGroups[rank].length !== 2) {
                return null;
            }

            // 检查是否为非法牌（2、王牌、级牌）
            const card = rankGroups[rank][0];
            if (card.suit === 'joker' || this.isLevelCard(card) || card.rank === '2') {
                return null;
            }

            // 连对只能使用3-A的牌
            const weight = this.getCardWeight(card);
            if (weight < 3 || weight > 14) {
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

        // 检查每组的数量和牌的合法性
        const triples = [];
        for (let rank in rankGroups) {
            if (rankGroups[rank].length !== 3) {
                return null;
            }

            // 检查是否为非法牌（2、王牌、级牌）
            const card = rankGroups[rank][0];
            if (card.suit === 'joker' || this.isLevelCard(card) || card.rank === '2') {
                return null;
            }

            // 钢板只能使用3-A的牌
            const weight = this.getCardWeight(card);
            if (weight < 3 || weight > 14) {
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

        console.log(`[canBeat] 比较: ${cards1.map(c => c.rank + c.suit).join(',')} vs ${cards2.map(c => c.rank + c.suit).join(',')}`);
        console.log(`[canBeat] 类型: ${type1.type} vs ${type2.type}`);
        console.log(`[canBeat] 家族: ${type1.family} vs ${type2.family}`);
        console.log(`[canBeat] 权重: ${type1.weight} vs ${type2.weight}`);

        // 掼蛋规则严格检查：非炸弹不能打任何炸弹
        if (type1.family !== 'bomb' && type2.family === 'bomb') {
            console.log(`[canBeat] 非炸弹(${type1.family})不能打炸弹(${type2.family})，返回false`);
            return false;
        }

        // 炸弹可以打任何非炸弹牌型
        if (type1.family === 'bomb' && type2.family !== 'bomb') {
            console.log(`[canBeat] 炸弹可以打非炸弹，返回true`);
            return true;
        }

        // 注意：这一行被移除，因为炸弹可以打任何非炸弹牌型
        // 炸弹vs非炸弹的逻辑在上面已经处理

        // 相同牌型比大小
        if (type1.family === 'bomb') {
            // 天王炸弹最大
            if (type1.subtype === 'kingBomb') {
                console.log(`[canBeat] 天王炸弹最大`);
                return true;
            }
            if (type2.subtype === 'kingBomb') {
                console.log(`[canBeat] 对方是天王炸弹`);
                return false;
            }

    
            // 同花顺 vs 普通炸弹
            if (type1.subtype === 'straightFlush' && type2.subtype !== 'straightFlush') {
                // 同花顺 > 5炸 和 4炸，但 < 6炸及以上
                console.log(`[canBeat] 同花顺 vs 普通炸弹: ${type2.count <= 5 ? '胜' : '败'}`);
                return type2.count <= 5;
            }
            if (type2.subtype === 'straightFlush' && type1.subtype !== 'straightFlush') {
                // 普通炸弹 vs 同花顺
                console.log(`[canBeat] 普通炸弹 vs 同花顺: ${type1.count > 5 ? '胜' : '败'}`);
                return type1.count > 5;  // 6炸及以上才能打同花顺
            }

            // 普通炸弹之间比较
            if (type1.count !== type2.count) {
                console.log(`[canBeat] 炸弹张数比较: ${type1.count} vs ${type2.count}, ${type1.count > type2.count ? '胜' : '败'}`);
                return type1.count > type2.count;
            }
            // 张数相同比点数
            console.log(`[canBeat] 炸弹点数比较: ${type1.weight} vs ${type2.weight}, ${type1.weight > type2.weight ? '胜' : '败'}`);
            return type1.weight > type2.weight;
        } else {
            // 普通牌型比较：必须相同类型才能比较
            if (type1.type !== type2.type) {
                return false;
            }

            // 相同类型比大小，但需要特殊处理某些牌型
            if (type1.type === 'straight' || type1.type === 'pairStraight' || type1.type === 'tripleStraight') {
                // 顺子、连对、钢板必须长度相同才能比较
                if (type1.length !== type2.length) {
                    return false;
                }
            }

            // 相同类型且长度允许，比较权重
            return type1.weight > type2.weight;
        }
    }

    /**
     * 验证出牌是否合法
     */
    validatePlay(cards, lastPlay, playerHand) {
        if (!cards || cards.length === 0) {
            return { valid: false, message: '请选择要出的牌' };
        }

        // A级特殊规则检查
        if (this.levelARules && this.levelARules.isLevelA()) {
            const playContext = {
                lastPlay: lastPlay,
                isFirstPlay: !lastPlay || lastPlay.length === 0
            };
            const levelAValidation = this.levelARules.validatePlay(cards, playContext);
            if (!levelAValidation.valid) {
                return levelAValidation;
            }
        }

        const currentType = this.getCardType(cards);
        if (!currentType) {
            return { valid: false, message: '无效的牌型' };
        }

        // 处理lastPlay参数格式
        let lastCards = null;
        if (lastPlay) {
            if (Array.isArray(lastPlay)) {
                lastCards = lastPlay;
            } else if (lastPlay.cards) {
                lastCards = lastPlay.cards;
            }
        }

        // 如果是第一手牌，任何有效牌型都可以
        if (!lastCards || lastCards.length === 0) {
            return { valid: true, type: currentType };
        }

        const lastType = this.getCardType(lastCards);
        if (!lastType) {
            return { valid: false, message: '上家出牌无效' };
        }

        // 使用canBeat方法判断
        if (this.canBeat(cards, lastCards)) {
            return { valid: true, type: currentType };
        }

        return { valid: false, message: '出牌必须大于上家' };
    }
}