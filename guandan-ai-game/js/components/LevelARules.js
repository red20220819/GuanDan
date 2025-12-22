/**
 * A级特殊规则
 * 处理掼蛋游戏A级时的特殊规则限制
 */

class LevelARules {
    constructor(ruleEngine) {
        this.ruleEngine = ruleEngine;
        this.currentLevel = null;

        // A级规则配置
        this.rules = {
            no2InTricks: true,        // 不能打含有2的牌型
            no2AsMain: true,          // 2不能作为主牌（如炸弹、三带二的主牌）
            restrictedSingles: true,  // 单张受限
            skipTurn: false           // 是否跳过回合（某些地方规则）
        };
    }

    /**
     * 设置当前级数
     * @param {string|number} level - 当前级数
     */
    setLevel(level) {
        this.currentLevel = level.toString().toUpperCase();
        console.log(`[LevelARules] 设置当前级数为: ${this.currentLevel}`);
    }

    /**
     * 检查是否为A级
     * @returns {boolean}
     */
    isLevelA() {
        return this.currentLevel === 'A';
    }

    /**
     * 验证出牌是否符合A级规则
     * @param {Array} cards - 要出的牌
     * @param {Object} playContext - 出牌上下文（上家出牌、是否首出等）
     * @returns {Object} 验证结果
     */
    validatePlay(cards, playContext = {}) {
        // 如果不是A级，直接通过
        if (!this.isLevelA()) {
            return { valid: true, message: '非A级，无特殊限制' };
        }

        // 获取牌型
        const cardType = this.ruleEngine.getCardType(cards);
        if (!cardType) {
            return { valid: false, message: '无效牌型' };
        }

        // 检查牌中是否含有2
        const has2s = cards.some(card => card.rank === '2');

        // 规则1：不能打含有2的牌型
        if (has2s && this.rules.no2InTricks) {
            // 特殊情况：如果是天王炸弹或三张王牌炸弹，可以包含2
            if (cardType.family === 'bomb' &&
                (cardType.subtype === 'kingBomb' || cardType.subtype === 'jokerBomb')) {
                // 这些是特殊炸弹，允许
            } else {
                return {
                    valid: false,
                    message: 'A级规则：不能出含有2的牌型（特殊炸弹除外）',
                    rule: 'no2InTricks'
                };
            }
        }

        // 规则2：2不能作为主牌
        if (has2s && this.rules.no2AsMain) {
            const mainRankViolation = this.checkMainRankViolation(cards, cardType);
            if (mainRankViolation) {
                return {
                    valid: false,
                    message: 'A级规则：2不能作为牌型的主牌',
                    rule: 'no2AsMain',
                    details: mainRankViolation
                };
            }
        }

        // 规则3：单张限制（某些地方规则：A级只能单出A或炸弹）
        if (this.rules.restrictedSingles && cardType.type === 'single') {
            const singleValidation = this.validateSinglePlay(cards, playContext);
            if (!singleValidation.valid) {
                return singleValidation;
            }
        }

        // 所有检查通过
        return {
            valid: true,
            message: '符合A级规则',
            cardType: cardType
        };
    }

    /**
     * 检查2是否作为主牌
     * @param {Array} cards - 牌
     * @param {Object} cardType - 牌型
     * @returns {string|null} 违规详情或null
     */
    checkMainRankViolation(cards, cardType) {
        const rankCounts = {};
        cards.forEach(card => {
            rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
        });

        switch (cardType.type) {
            case 'single':
                if (cards[0].rank === '2') {
                    return '单张2';
                }
                break;

            case 'pair':
                if (cards[0].rank === '2') {
                    return '对2';
                }
                break;

            case 'triple':
                if (cards[0].rank === '2') {
                    return '三个2';
                }
                break;

            case 'tripleWithPair':
                if (cardType.mainRank === '2') {
                    return '三带二的主牌是2';
                }
                break;

            case 'straight':
                // 顺子本来就不能包含2，这里应该不会触发
                if (cards.some(c => c.rank === '2')) {
                    return '顺子包含2（不应该发生）';
                }
                break;

            case 'pairStraight':
                // 连对本来就不能包含2
                if (cards.some(c => c.rank === '2')) {
                    return '连对包含2（不应该发生）';
                }
                break;

            case 'tripleStraight':
                // 钢板本来就不能包含2
                if (cards.some(c => c.rank === '2')) {
                    return '钢板包含2（不应该发生）';
                }
                break;

            case 'bomb':
                if (cardType.subtype === 'normalBomb' && cardType.rank === '2') {
                    return '四个2炸弹';
                }
                break;
        }

        return null;
    }

    /**
     * 验证单张出牌
     * @param {Array} cards - 牌
     * @param {Object} playContext - 出牌上下文
     * @returns {Object} 验证结果
     */
    validateSinglePlay(cards, playContext) {
        const card = cards[0];

        // 如果是王牌，允许
        if (card.suit === 'joker') {
            return { valid: true };
        }

        // 如果是A级，允许
        if (card.rank === 'A') {
            return { valid: true };
        }

        // 如果是首出，只能出A或炸弹
        if (playContext isFirstPlay) {
            return {
                valid: false,
                message: 'A级首出：只能出A或炸弹',
                rule: 'restrictedSingles'
            };
        }

        // 如果不是首出，需要检查是否能打过上家
        if (playContext.lastPlay && playContext.lastPlay.length > 0) {
            const lastType = this.ruleEngine.getCardType(playContext.lastPlay);

            // 如果上家也是单张
            if (lastType && lastType.type === 'single') {
                // 只有用更大的单张才能打
                const canBeat = this.ruleEngine.canBeat(cards, playContext.lastPlay);
                if (!canBeat) {
                    return {
                        valid: false,
                        message: '牌太小，不能打过上家',
                        rule: 'general'
                    };
                }
            }
        }

        return { valid: true };
    }

    /**
     * 获取A级规则说明
     * @returns {Array} 规则说明列表
     */
    getRulesDescription() {
        if (!this.isLevelA()) {
            return [];
        }

        const descriptions = [];

        if (this.rules.no2InTricks) {
            descriptions.push({
                rule: 'no2InTricks',
                description: '不能出含有2的牌型',
                examples: ['不能出单张2', '不能出对2', '不能出三个2', '不能出4个2炸弹'],
                exceptions: ['天王炸', '三张王牌炸弹']
            });
        }

        if (this.rules.no2AsMain) {
            descriptions.push({
                rule: 'no2AsMain',
                description: '2不能作为牌型的主牌',
                examples: ['三带二不能用2作为三张', '钢板不能用2作为主牌']
            });
        }

        if (this.rules.restrictedSingles) {
            descriptions.push({
                rule: 'restrictedSingles',
                description: '单张限制（某些地方规则）',
                examples: ['首出只能出A或炸弹', '不能用小单张']
            });
        }

        return descriptions;
    }

    /**
     * 检查玩家手牌是否还有合法出牌
     * @param {Array} handCards - 手牌
     * @param {Object} playContext - 出牌上下文
     * @returns {Object} 检查结果
     */
    checkHasValidPlay(handCards, playContext) {
        if (!this.isLevelA()) {
            return { hasValidPlay: true };
        }

        // 尝试所有可能的出牌组合
        const validPlays = [];

        // 检查单张
        handCards.forEach(card => {
            const validation = this.validatePlay([card], playContext);
            if (validation.valid) {
                validPlays.push({
                    cards: [card],
                    type: 'single',
                    description: `单张${card.rank}`
                });
            }
        });

        // 检查对子
        const rankGroups = {};
        handCards.forEach(card => {
            if (!rankGroups[card.rank]) {
                rankGroups[card.rank] = [];
            }
            rankGroups[card.rank].push(card);
        });

        Object.values(rankGroups).forEach(group => {
            if (group.length >= 2) {
                const validation = this.validatePlay(group.slice(0, 2), playContext);
                if (validation.valid) {
                    validPlays.push({
                        cards: group.slice(0, 2),
                        type: 'pair',
                        description: `对${group[0].rank}`
                    });
                }
            }

            if (group.length >= 3) {
                const validation = this.validatePlay(group.slice(0, 3), playContext);
                if (validation.valid) {
                    validPlays.push({
                        cards: group.slice(0, 3),
                        type: 'triple',
                        description: `三个${group[0].rank}`
                    });
                }
            }

            if (group.length >= 4) {
                const validation = this.validatePlay(group.slice(0, 4), playContext);
                if (validation.valid) {
                    validPlays.push({
                        cards: group.slice(0, 4),
                        type: 'bomb',
                        description: `四个${group[0].rank}炸弹`
                    });
                }
            }
        });

        return {
            hasValidPlay: validPlays.length > 0,
            validPlays: validPlays,
            message: validPlays.length === 0 ? '没有符合A级规则的合法出牌' : `找到${validPlays.length}种合法出牌`
        };
    }

    /**
     * 更新规则配置
     * @param {Object} newRules - 新的规则配置
     */
    updateRules(newRules) {
        this.rules = { ...this.rules, ...newRules };
        console.log(`[LevelARules] 更新规则配置:`, this.rules);
    }

    /**
     * 重置规则
     */
    reset() {
        this.currentLevel = null;
        console.log('[LevelARules] 规则已重置');
    }
}

// 导出类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelARules;
}