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
     * 数字级数转换为牌面rank
     * 2-10 对应 '2'-'10', 11='J', 12='Q', 13='K', 14='A'
     */
    levelNumToRank(levelNum) {
        const levelRankMap = {
            2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
            11: 'J', 12: 'Q', 13: 'K', 14: 'A'
        };
        return levelRankMap[levelNum] || levelNum.toString();
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
     * 获取当前级数的牌面rank
     */
    getCurrentLevelRank() {
        return this.levelNumToRank(this.currentLevel);
    }

    /**
     * 检查是否为级牌（逢人配/万能牌）
     * 注意：这只识别红桃级牌（逢人配），不识别其他花色的级牌
     */
    isLevelCard(card) {
        return this.isWildCard(card);  // 逢人配 = 红桃级牌
    }

    /**
     * 检查是否为级牌（所有花色）
     * 用于识别当前级别的所有牌，方便显示样式
     */
    isAnyLevelCard(card) {
        return card.rank === this.levelNumToRank(this.currentLevel);
    }

    /**
     * 检查是否为逢人配（红桃级牌）
     * 万能牌，可以替代任意牌
     */
    isWildCard(card) {
        if (card.suit === '♥' && card.rank === this.levelNumToRank(this.currentLevel)) {
            return true;
        }
        return false;
    }

    /**
     * 获取牌的权重
     */
    getCardWeight(card) {
        // 王牌权重
        if (card.rank === '小王') {
            return this.cardWeights['小王'];  // 102
        }
        if (card.rank === '大王') {
            return this.cardWeights['大王'];  // 103
        }

        // 级牌权重：101（永远大于A的14）
        // 级牌是当前级别的所有牌（如打2时，♠2♥2♣2♦2都是级牌）
        if (this.isAnyLevelCard(card)) {
            return this.cardWeights['level'];  // 101
        }

        // 普通牌权重
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
            // 先检查天然顺子
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
            // 再检查含逢人配的顺子
            const straightWithWild = this.checkStraightWithWildCard(cards);
            if (straightWithWild) {
                return {
                    type: 'straight',
                    family: 'normal',
                    length: count,
                    highCard: straightWithWild.highCard,
                    weight: 100 + straightWithWild.highCard + count,
                    wildUsed: straightWithWild.wildUsed
                };
            }
        }

        // 连对（3-5对连续对子，即6-10张牌）
        if (count >= 6 && count <= 10 && count % 2 === 0) {
            // 先检查天然连对
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
            // 再检查含逢人配的连对
            const pairStraightWithWild = this.checkPairStraightWithWildCard(cards);
            if (pairStraightWithWild) {
                return {
                    type: 'pairStraight',
                    family: 'normal',
                    length: count / 2,
                    highCard: pairStraightWithWild.highCard,
                    weight: 200 + pairStraightWithWild.highCard + count,
                    wildUsed: pairStraightWithWild.wildUsed
                };
            }
        }

        // 钢板（2个以上连续三张）
        if (count >= 6 && count % 3 === 0) {
            // 先检查天然钢板
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
            // 再检查含逢人配的钢板
            const tripleStraightWithWild = this.checkTripleStraightWithWildCard(cards);
            if (tripleStraightWithWild) {
                return {
                    type: 'tripleStraight',
                    family: 'normal',
                    length: count / 3,
                    highCard: tripleStraightWithWild.highCard,
                    weight: 300 + tripleStraightWithWild.highCard + count,
                    wildUsed: tripleStraightWithWild.wildUsed
                };
            }
        }

        return null; // 无效牌型
    }

    /**
     * 检查是否为普通炸弹（支持逢人配）
     */
    isNormalBomb(cards) {
        if (cards.length < 4 || cards.length > 8) {
            return false;
        }

        // 过滤出逢人配（级牌）
        const wildCards = cards.filter(c => this.isWildCard(c));
        const normalCards = cards.filter(c => !this.isWildCard(c));

        // 如果全是逢人配，算炸弹
        if (wildCards.length === cards.length) {
            return true;
        }

        // 检查普通牌是否点数相同
        const firstRank = normalCards[0].rank;
        const allSameRank = normalCards.every(card => card.rank === firstRank);

        // 如果普通牌点数相同，加上逢人配后总数>=4，算炸弹
        return allSameRank && (normalCards.length + wildCards.length >= 4);
    }

    /**
     * 获取主要牌级（支持逢人配）
     */
    getMainRank(cards) {
        // 过滤掉王牌和逢人配，找普通牌的主rank
        const normalCards = cards.filter(c => c.suit !== 'joker' && !this.isWildCard(c));
        if (normalCards.length > 0) {
            return normalCards[0].rank;
        }
        // 如果全是王牌或逢人配，返回第一张牌的rank
        return cards[0].rank;
    }

    /**
     * 检查是否为对子（支持逢人配）
     */
    isPair(cards) {
        if (cards.length !== 2) return false;

        // 特殊处理：任意两张王牌都可以组成王对
        const jokerCount = cards.filter(c => c.suit === 'joker').length;
        if (jokerCount === 2) {
            return true;
        }

        // 检查是否有万能牌（逢人配或王牌）
        const wildCards = cards.filter(c => this.isWildCard(c) || c.suit === 'joker');
        const normalCards = cards.filter(c => !this.isWildCard(c) && c.suit !== 'joker');

        // 如果2张都是普通牌，点数必须相同
        if (normalCards.length === 2) {
            return cards[0].rank === cards[1].rank;
        }

        // 如果有1张万能牌 + 1张普通牌，算对子
        if (wildCards.length === 1 && normalCards.length === 1) {
            return true;
        }

        // 如果2张都是万能牌，算对子
        if (wildCards.length === 2) {
            return true;
        }

        return false;
    }

    /**
     * 检查是否为三张（支持逢人配）
     */
    isTriple(cards) {
        if (cards.length !== 3) return false;

        // 特殊处理：三张王牌
        const jokerCount = cards.filter(c => c.suit === 'joker').length;
        if (jokerCount === 3) {
            return true;
        }

        // 过滤出逢人配和普通牌
        const wildCards = cards.filter(c => this.isWildCard(c) || c.suit === 'joker');
        const normalCards = cards.filter(c => !this.isWildCard(c) && c.suit !== 'joker');

        // 如果3张都是普通牌且点数相同
        if (normalCards.length === 3) {
            return cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank;
        }

        // 如果有万能牌（逢人配或王牌）
        if (wildCards.length > 0) {
            // 检查普通牌是否点数相同
            if (normalCards.length > 0) {
                const firstRank = normalCards[0].rank;
                const allSameRank = normalCards.every(c => c.rank === firstRank);
                // 如果普通牌点数相同，加上万能牌后总数为3，算三张
                return allSameRank && (normalCards.length + wildCards.length === 3);
            }
            // 全是万能牌，算三张
            return true;
        }

        return false;
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
     * 获取牌的原始点数权重（用于连续牌型：顺子、连对、钢板）
     * 在这些牌型中，级牌使用其原始点数而非权重101
     */
    getCardWeightForSequence(card) {
        // 王牌权重
        if (card.rank === 'small' || card.rank === '小王') {
            return 102;
        }
        if (card.rank === 'big' || card.rank === '大王') {
            return 103;
        }

        // 级牌使用原始点数（如7就是7，不是101）
        if (this.isAnyLevelCard(card)) {
            // 将级牌rank转换为数字
            const rankToNum = {
                '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
                'J': 11, 'Q': 12, 'K': 13, 'A': 14
            };
            return rankToNum[card.rank] || 0;
        }

        // 普通牌权重
        return this.cardWeights[card.rank] || 0;
    }

    /**
     * 检查顺子（不含逢人配）
     * 级牌可以参与，使用其原始点数
     */
    checkStraight(cards) {
        if (cards.length < 5) return null;

        // 排序（使用连续牌型权重）
        const sorted = [...cards].sort((a, b) => this.getCardWeightForSequence(a) - this.getCardWeightForSequence(b));

        // 检查所有牌是否符合顺子要求
        for (let i = 0; i < sorted.length; i++) {
            const card = sorted[i];
            const weight = this.getCardWeightForSequence(card);

            // 王牌不能参与天然顺子
            if (card.suit === 'joker') {
                return null;
            }

            // 2不能参与顺子
            if (card.rank === '2') {
                return null;
            }

            // 顺子只能使用3-A的牌
            if (weight < 3 || weight > 14) {
                return null;
            }
        }

        // 检查连续性
        for (let i = 1; i < sorted.length; i++) {
            const prevWeight = this.getCardWeightForSequence(sorted[i - 1]);
            const currWeight = this.getCardWeightForSequence(sorted[i]);

            if (currWeight !== prevWeight + 1) {
                return null;
            }
        }

        return {
            highCard: this.getCardWeightForSequence(sorted[sorted.length - 1])
        };
    }

    /**
     * 检查含逢人配的顺子
     * 逢人配（红桃级牌）可以代任意非王牌参与顺子
     * 其他花色级牌可以作为普通牌参与顺子
     */
    checkStraightWithWildCard(cards) {
        if (cards.length < 5) return null;

        // 分离普通牌、逢人配、王牌
        const normalCards = cards.filter(c => !this.isLevelCard(c) && c.suit !== 'joker');
        const wildCards = cards.filter(c => this.isLevelCard(c));  // 逢人配（红桃级牌）
        const jokers = cards.filter(c => c.suit === 'joker');

        // 王牌不能参与顺子
        if (jokers.length > 0) return null;

        // 过滤掉不能参与顺子的普通牌（只有2不能参与）
        const validNormalCards = normalCards.filter(c => {
            // 2不能参与顺子
            if (c.rank === '2') return false;
            // 必须在3-A范围内（使用连续牌型权重）
            const weight = this.getCardWeightForSequence(c);
            return weight >= 3 && weight <= 14;
        });

        // 总牌数
        const totalCards = validNormalCards.length + wildCards.length;

        // 必须至少5张
        if (totalCards < 5) return null;

        // 获取普通牌的权重（已排序，使用连续牌型权重）
        const baseWeights = validNormalCards.map(c => this.getCardWeightForSequence(c)).sort((a, b) => a - b);

        // 用逢人配填补缺失的牌，尝试组成顺子
        // 遍历所有可能的顺子起始位置
        for (let start = 3; start <= 14; start++) {
            // 复制一份权重数组用于本次检查
            const weights = [...baseWeights];
            let wildUsed = 0;

            for (let i = 0; i < totalCards; i++) {
                const needed = start + i;

                // 检查是否有这张牌
                const idx = weights.indexOf(needed);
                if (idx !== -1) {
                    // 有这张牌，移除已使用的
                    weights.splice(idx, 1);
                } else {
                    // 没有这张牌，使用逢人配
                    wildUsed++;
                }
            }

            // 检查逢人配数量是否足够
            if (wildUsed <= wildCards.length) {
                return {
                    highCard: start + totalCards - 1,
                    wildUsed: wildUsed
                };
            }
        }

        return null;
    }

    /**
     * 检查连对（掼蛋规则：3-5对连续对子，即6-10张牌）
     * 级牌可以参与，使用其原始点数
     */
    checkPairStraight(cards) {
        // 连对必须是3-5对（6-10张牌）
        if (cards.length < 6 || cards.length > 10 || cards.length % 2 !== 0) return null;

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

            // 检查是否为非法牌（2、王牌）
            const card = rankGroups[rank][0];
            if (card.suit === 'joker' || card.rank === '2') {
                return null;
            }

            // 连对只能使用3-A的牌（使用连续牌型权重）
            const weight = this.getCardWeightForSequence(card);
            if (weight < 3 || weight > 14) {
                return null;
            }

            pairs.push(rank);
        }

        // 检查连续性（使用连续牌型权重）
        pairs.sort((a, b) => this.getCardWeightForSequence({rank: a}) - this.getCardWeightForSequence({rank: b}));

        for (let i = 1; i < pairs.length; i++) {
            const prevWeight = this.getCardWeightForSequence({rank: pairs[i - 1]});
            const currWeight = this.getCardWeightForSequence({rank: pairs[i]});

            if (currWeight !== prevWeight + 1) {
                return null;
            }
        }

        return {
            highCard: this.getCardWeightForSequence({rank: pairs[pairs.length - 1]})
        };
    }

    /**
     * 检查含逢人配的连对
     * 连对是3-5对连续对子（6-10张牌），逢人配可以代任意牌
     * 其他花色级牌可以作为普通牌参与连对
     */
    checkPairStraightWithWildCard(cards) {
        // 连对必须是6-10张牌（3-5对）
        if (cards.length < 6 || cards.length > 10 || cards.length % 2 !== 0) return null;

        // 分离普通牌、逢人配、王牌
        const normalCards = cards.filter(c => !this.isLevelCard(c) && c.suit !== 'joker');
        const wildCards = cards.filter(c => this.isLevelCard(c));  // 逢人配（红桃级牌）
        const jokers = cards.filter(c => c.suit === 'joker');

        // 王牌不能参与连对
        if (jokers.length > 0) return null;

        // 过滤掉不能参与连对的普通牌（只有2不能参与）
        const validNormalCards = normalCards.filter(c => {
            // 2不能参与连对
            if (c.rank === '2') return false;
            // 必须在3-A范围内（使用连续牌型权重）
            const weight = this.getCardWeightForSequence(c);
            return weight >= 3 && weight <= 14;
        });

        // 统计每个点数的牌数量
        const rankCounts = {};
        validNormalCards.forEach(c => {
            rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
        });

        // 计算需要的对数（3-5对）
        const pairCount = cards.length / 2;

        // 尝试所有可能的连对组合
        // 起始点数从3开始，最大到14-pairCount+1（保证不超出A）
        for (let start = 3; start <= 14 - pairCount + 1; start++) {
            let wildUsed = 0;
            let valid = true;

            for (let i = 0; i < pairCount; i++) {
                const rankStr = this.weightToRank(start + i);
                const haveCount = rankCounts[rankStr] || 0;

                if (haveCount === 0) {
                    // 完全没有这张牌，需要用2张逢人配
                    wildUsed += 2;
                } else if (haveCount === 1) {
                    // 有1张，需要用1张逢人配
                    wildUsed += 1;
                }
                // haveCount === 2 不需要逢人配

                // 检查逢人配数量是否足够
                if (wildUsed > wildCards.length) {
                    valid = false;
                    break;
                }
            }

            if (valid && wildUsed <= wildCards.length) {
                return {
                    highCard: start + pairCount - 1,
                    wildUsed: wildUsed
                };
            }
        }

        return null;
    }

    /**
     * 权重转点数（用于逢人配连对/钢板计算）
     */
    weightToRank(weight) {
        const rankMap = {
            3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
            11: 'J', 12: 'Q', 13: 'K', 14: 'A'
        };
        return rankMap[weight] || null;
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

            // 检查是否为非法牌（2、王牌）
            const card = rankGroups[rank][0];
            if (card.suit === 'joker' || card.rank === '2') {
                return null;
            }

            // 钢板只能使用3-A的牌（使用连续牌型权重）
            const weight = this.getCardWeightForSequence(card);
            if (weight < 3 || weight > 14) {
                return null;
            }

            triples.push(rank);
        }

        // 检查连续性（使用连续牌型权重）
        triples.sort((a, b) => this.getCardWeightForSequence({rank: a}) - this.getCardWeightForSequence({rank: b}));

        for (let i = 1; i < triples.length; i++) {
            const prevWeight = this.getCardWeightForSequence({rank: triples[i - 1]});
            const currWeight = this.getCardWeightForSequence({rank: triples[i]});

            if (currWeight !== prevWeight + 1) {
                return null;
            }
        }

        return {
            highCard: this.getCardWeightForSequence({rank: triples[triples.length - 1]})
        };
    }

    /**
     * 检查含逢人配的钢板
     * 钢板是2个或更多连续三张，逢人配可以代任意牌
     * 其他花色级牌可以作为普通牌参与钢板
     */
    checkTripleStraightWithWildCard(cards) {
        if (cards.length < 6 || cards.length % 3 !== 0) return null;

        // 分离普通牌、逢人配、王牌
        const normalCards = cards.filter(c => !this.isLevelCard(c) && c.suit !== 'joker');
        const wildCards = cards.filter(c => this.isLevelCard(c));  // 逢人配（红桃级牌）
        const jokers = cards.filter(c => c.suit === 'joker');

        // 王牌不能参与钢板
        if (jokers.length > 0) return null;

        // 过滤掉不能参与钢板的普通牌（只有2不能参与）
        const validNormalCards = normalCards.filter(c => {
            // 2不能参与钢板
            if (c.rank === '2') return false;
            // 必须在3-A范围内（使用连续牌型权重）
            const weight = this.getCardWeightForSequence(c);
            return weight >= 3 && weight <= 14;
        });

        // 计算钢板需要的连续三张数量
        const tripleCount = cards.length / 3;

        // 统计每个点数的牌数量
        const rankCounts = {};
        validNormalCards.forEach(c => {
            // 对于级牌，使用其实际点数（不是权重101）
            const rank = c.rank;
            rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });

        // 尝试所有可能的钢板组合
        // 起始点数从3开始，最大到14-tripleCount+1
        for (let start = 3; start <= 14 - tripleCount + 1; start++) {
            let wildUsed = 0;

            for (let i = 0; i < tripleCount; i++) {
                const rankStr = this.weightToRank(start + i);
                const haveCount = rankCounts[rankStr] || 0;

                if (haveCount === 0) {
                    // 完全没有这张牌，需要用3张逢人配
                    wildUsed += 3;
                } else if (haveCount === 1) {
                    // 有1张，需要用2张逢人配
                    wildUsed += 2;
                } else if (haveCount === 2) {
                    // 有2张，需要用1张逢人配
                    wildUsed += 1;
                }
                // haveCount === 3 不需要逢人配
            }

            if (wildUsed <= wildCards.length) {
                return {
                    highCard: start + tripleCount - 1,
                    wildUsed: wildUsed
                };
            }
        }

        return null;
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