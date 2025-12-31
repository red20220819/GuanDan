/**
 * AI玩家组件 v2.2
 * 负责掼蛋AI的决策逻辑，包括出牌策略、记牌和团队协作
 * 修复版本：解决getAllPlayers方法错误
 */

class AIPlayer {
    constructor(gameEngine, playerId) {
        this.gameEngine = gameEngine;
        this.playerId = playerId;
        this.player = null; // 玩家对象
        this.handCards = []; // 手牌
        this.memory = new AIMemory(); // 记忆系统
        this.strategy = new AIStrategy(this); // 策略系统
        this.difficulty = 'medium'; // 难度等级
        this.thinkingTime = 1500; // 思考时间
    }

    /**
     * 初始化AI玩家
     */
    initialize(player) {
        this.player = player;
        this.memory.reset();
        // 注意：不在这里设置手牌，手牌将在发牌后设置
        console.log(`AI玩家 ${player.name} 初始化完成`);
    }

    /**
     * 设置手牌（优化版本，延迟分析）
     */
    setHandCards(cards) {
        // 复制手牌
        this.handCards = [...cards];

        // 对手牌进行排序（从大到小），使用规则引擎获取权重
        if (this.gameEngine && this.gameEngine.ruleEngine) {
            this.handCards.sort((a, b) => {
                const weightA = this.gameEngine.ruleEngine.getCardWeight(a);
                const weightB = this.gameEngine.ruleEngine.getCardWeight(b);
                return weightB - weightA; // 从大到小排序
            });
        }

        this.memory.updateHandCards(cards);

        // 延迟分析手牌，避免阻塞初始化
        setTimeout(() => {
            this.analyzeHand();
        }, 100);
    }

    /**
     * 分析手牌（优化版本，避免组合爆炸）
     */
    analyzeHand() {
        console.log(`[AIPlayer] 开始分析手牌，牌数: ${this.handCards.length}`);

        const analysis = {
            totalCards: this.handCards.length,
            cardTypes: this.getBasicCardTypes(), // 使用简化版本
            bombs: this.findBombs(),
            strength: this.evaluateHandStrength(),
            potential: this.evaluatePotential()
        };

        this.memory.setHandAnalysis(analysis);
        console.log(`[AIPlayer] 手牌分析完成`);
        return analysis;
    }

    /**
     * 获取基本牌型（优化版本，避免组合爆炸）
     */
    getBasicCardTypes() {
        const cardTypes = {
            singles: [],
            pairs: [],
            triples: [],
            straights: [],
            bombs: [],
            other: []
        };

        try {
            // 按等级分组
            const rankGroups = {};
            this.handCards.forEach(card => {
                if (!rankGroups[card.rank]) {
                    rankGroups[card.rank] = [];
                }
                rankGroups[card.rank].push(card);
            });

            // 只查找基本的单张、对子、三张、炸弹
            for (let rank in rankGroups) {
                const group = rankGroups[rank];
                // 使用规则引擎获取牌权重（模块化，不内嵌）
                const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                    this.ruleEngine.getCardWeight(group[0]) :
                    this.getBasicCardValue(rank);

                if (group.length >= 1) {
                    // 单张
                    cardTypes.singles.push({
                        type: { type: 'single', power: cardWeight },
                        cards: [group[0]]
                    });
                }

                if (group.length >= 2) {
                    // 对子
                    cardTypes.pairs.push({
                        type: { type: 'pair', power: cardWeight * 2 },
                        cards: [group[0], group[1]]
                    });
                }

                if (group.length >= 3) {
                    // 三张
                    cardTypes.triples.push({
                        type: { type: 'triple', power: cardWeight * 3 },
                        cards: [group[0], group[1], group[2]]
                    });
                }

                if (group.length >= 4) {
                    // 炸弹
                    cardTypes.bombs.push({
                        type: { type: 'bomb', power: cardWeight * 4 },
                        cards: group.slice(0, 4)
                    });
                }
            }

            console.log(`[getBasicCardTypes] 找到牌型: 单张${cardTypes.singles.length}, 对子${cardTypes.pairs.length}, 三张${cardTypes.triples.length}, 炸弹${cardTypes.bombs.length}`);

        } catch (error) {
            console.error('[getBasicCardTypes] 分析出错:', error);
        }

        return cardTypes;
    }

    /**
     * 添加牌型到分析结果
     */
    addCardTypeToAnalysis(cardTypes, type, cards) {
        const cardTypeEntry = { type, cards, power: type.power };

        switch (type.type) {
            case 'single':
                cardTypes.singles.push(cardTypeEntry);
                break;
            case 'pair':
                cardTypes.pairs.push(cardTypeEntry);
                break;
            case 'triple':
                cardTypes.triples.push(cardTypeEntry);
                break;
            case 'straight':
                cardTypes.straights.push(cardTypeEntry);
                break;
            case 'bomb':
            case 'rocket':
                cardTypes.bombs.push(cardTypeEntry);
                break;
            default:
                cardTypes.other.push(cardTypeEntry);
        }
    }

    /**
     * 查找炸弹
     */
    findBombs() {
        const bombs = [];
        const cardGroups = this.groupCardsByRank();

        for (let rank in cardGroups) {
            const cards = cardGroups[rank];
            if (cards.length >= 4) {
                bombs.push({
                    rank: parseInt(rank),
                    count: cards.length,
                    cards: cards,
                    type: this.gameEngine.ruleEngine.getCardType(cards)
                });
            }
        }

        return bombs.sort((a, b) => b.count - a.count || b.rank - a.rank);
    }

    /**
     * 按等级分组牌
     */
    groupCardsByRank() {
        const groups = {};

        for (let card of this.handCards) {
            const rank = card.rank; // 直接使用card.rank
            if (!groups[rank]) {
                groups[rank] = [];
            }
            groups[rank].push(card);
        }

        return groups;
    }

    /**
     * 获取基础牌值（降级处理）
     */
    getBasicCardValue(rank) {
        const valueMap = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 2, 'small': 102, 'big': 103
        };
        return valueMap[rank] || 0;
    }

    /**
     * 评估手牌强度
     */
    evaluateHandStrength() {
        let strength = 0;

        // 基础分数：手牌数量
        strength += (27 - this.handCards.length) * 10;

        // 炸弹加分
        const bombs = this.findBombs();
        for (let bomb of bombs) {
            strength += bomb.count * 50 + bomb.rank * 10;
        }

        // 大牌加分（使用规则引擎获取权重）
        for (let card of this.handCards) {
            try {
                // 使用规则引擎获取牌权重（模块化，不内嵌）
                const weight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                    this.ruleEngine.getCardWeight(card) :
                    this.getBasicCardValue(card.rank);
                if (weight >= 13) { // A, 级牌, 王牌
                    strength += weight * 5;
                }
            } catch (error) {
                // 降级处理
                const basicValue = this.getBasicCardValue(card.rank);
                if (basicValue >= 13) {
                    strength += basicValue * 5;
                }
            }
        }

        // 万能牌加分（添加安全检查）
        try {
            if (this.gameEngine && this.gameEngine.ruleEngine && this.gameEngine.ruleEngine.isJokerCard) {
                const jokers = this.handCards.filter(card =>
                    this.gameEngine.ruleEngine.isJokerCard(card)
                );
                strength += jokers.length * 30;
            } else {
                // 降级处理：只检查王牌
                const jokers = this.handCards.filter(card => card.suit === 'joker');
                strength += jokers.length * 30;
            }
        } catch (error) {
            // 如果出错，只检查王牌
            const jokers = this.handCards.filter(card => card.suit === 'joker');
            strength += jokers.length * 30;
        }

        return Math.min(1000, Math.max(0, strength));
    }

    /**
     * 评估潜在能力
     */
    evaluatePotential() {
        const analysis = {
            firstPlayWin: false,    // 是否有首出必胜牌
            controlPower: 0,       // 控制力（0-100）
            cooperationScore: 0,   // 协作分数
            adaptability: 0        // 适应性
        };

        // 检查首出必胜牌
        if (this.hasWinningFirstPlay()) {
            analysis.firstPlayWin = true;
            analysis.controlPower += 50;
        }

        // 计算控制力
        const bombs = this.findBombs();
        analysis.controlPower += bombs.length * 20;

        // 协作分数（基于队友状态）
        const teammate = this.getTeammate();
        if (teammate) {
            analysis.cooperationScore = this.evaluateCooperation(teammate);
        }

        // 适应性（基于游戏进程）
        analysis.adaptability = this.evaluateAdaptability();

        return analysis;
    }

    /**
     * 检查是否有首出必胜牌
     */
    hasWinningFirstPlay() {
        // 火箭必胜
        if (this.hasRocket()) {
            return true;
        }

        // 大炸弹也可能必胜
        const bombs = this.findBombs();
        return bombs.some(bomb => bomb.count >= 6);
    }

    /**
     * 检查是否有火箭
     */
    hasRocket() {
        const jokers = this.handCards.filter(card => card.suit === 'joker');
        if (jokers.length !== 2) {
            return false;
        }

        const ranks = jokers.map(card => card.rank);
        return ranks.includes('big') && ranks.includes('small');
    }

    /**
     * 获取队友
     */
    getTeammate() {
        if (!this.player) return null;

        // 根据玩家的team和位置直接计算队友
        // 掼蛋规则：南-北一队，东-西一队
        const position = this.player.id === 'player1' ? 'south' :
                        this.player.id === 'player2' ? 'east' :
                        this.player.id === 'player3' ? 'west' : 'north';

        let teammateId = null;
        if (position === 'south') {
            teammateId = 'north';
        } else if (position === 'north') {
            teammateId = 'south';
        } else if (position === 'east') {
            teammateId = 'west';
        } else if (position === 'west') {
            teammateId = 'east';
        }

        // 返回真实的玩家对象
        if (teammateId && this.gameEngine && this.gameEngine.playerManager) {
            return this.gameEngine.playerManager.getPlayer(teammateId);
        }

        return null;
    }

    /**
     * 评估协作能力
     */
    evaluateCooperation(teammate) {
        let score = 50; // 基础分;

        // 根据队友剩余牌数调整 - 降级处理，使用默认值
        const teammateCardCount = teammate ? (teammate.cardCount || 20) : 20; // 估算值
        const myCardCount = this.handCards.length;

        if (teammateCardCount < myCardCount) {
            score += 20; // 队友牌少，应该配合
        } else if (teammateCardCount > myCardCount * 1.5) {
            score -= 20; // 队友牌多，应该主动出击
        }

        return Math.min(100, Math.max(0, score));
    }

    /**
     * 评估适应性
     */
    evaluateAdaptability() {
        // 基于当前游戏阶段和手牌状态评估适应性
        const gameProgress = this.getGameProgress();
        const handStrength = this.evaluateHandStrength();

        if (gameProgress < 0.3) {
            // 早期阶段，更关注手牌强度
            return Math.min(100, handStrength / 10);
        } else if (gameProgress < 0.7) {
            // 中期阶段，需要平衡发展
            return Math.min(100, 50 + handStrength / 20);
        } else {
            // 后期阶段，需要冲刺
            return Math.min(100, 30 + handStrength / 15);
        }
    }

    /**
     * 获取游戏进度（简化版本）
     */
    getGameProgress() {
        const totalCards = 108; // 总牌数
        const myCards = this.handCards.length;

        // 简单估算：根据自己手牌数估算游戏进度
        const estimatedPlayed = (27 - myCards) * 4; // 假设其他玩家出牌速度类似
        const progress = Math.min(estimatedPlayed / totalCards, 0.9); // 最高90%

        return progress;
    }

    /**
     * 执行AI出牌
     */
    makePlay(lastPlay) {
        return new Promise((resolve) => {
            setTimeout(() => {
                const play = this.decidePlay(lastPlay);
                this.updateMemory(play);
                resolve(play);
            }, this.getThinkingTime());
        });
    }

    /**
     * 决策出牌
     */
    decidePlay(lastPlay) {
        const situation = this.analyzeSituation(lastPlay);
        const strategy = this.strategy.selectStrategy(situation);
        const play = this.executeStrategy(strategy, situation);

        console.log(`${this.player.name} 决策：${strategy}`, play);
        return play;
    }

    /**
     * 分析当前局面
     */
    analyzeSituation(lastPlay) {
        return {
            handCards: this.handCards,
            cardTypes: this.getBasicCardTypes(), // 修复方法名
            bombs: this.findBombs(),
            handStrength: this.evaluateHandStrength(),
            teammates: this.getTeammateInfo(),
            opponents: this.getOpponentInfo(),
            lastPlay: lastPlay,
            isFirstPlay: !lastPlay,
            gameProgress: this.getGameProgress(),
            mustWin: this.mustWinNow(),
            canPass: this.canPass(lastPlay)
        };
    }

    /**
     * 获取队友信息
     */
    getTeammateInfo() {
        const teammate = this.getTeammate();
        if (!teammate) return null;

        return {
            player: teammate,
            cardCount: this.gameEngine.playerManager.getPlayerCardCount(teammate),
            status: this.getPlayerStatus(teammate)
        };
    }

    /**
     * 获取对手信息
     */
    getOpponentInfo() {
        if (!this.player) return [];

        const playerManager = this.gameEngine.playerManager;
        const opponents = playerManager.getPlayerOpponents(this.player);

        return opponents.filter(opponent => opponent != null).map(opponent => ({
            player: opponent,
            cardCount: playerManager.getPlayerCardCount(opponent),
            status: this.getPlayerStatus(opponent)
        }));
    }

    /**
     * 获取玩家状态
     */
    getPlayerStatus(player) {
        const cardCount = this.gameEngine.playerManager.getPlayerCardCount(player);

        if (cardCount <= 3) {
            return 'dangerous'; // 危险，可能要赢了
        } else if (cardCount <= 8) {
            return 'alert';     // 警惕
        } else if (cardCount <= 15) {
            return 'normal';    // 正常
        } else {
            return 'safe';      // 安全
        }
    }

    /**
     * 检查是否必须现在赢
     */
    mustWinNow() {
        const cardCount = this.handCards.length;

        // 剩余牌很少时，必须全力争取
        if (cardCount <= 3) {
            return true;
        }

        // 有绝杀牌时也应该争取
        return this.hasWinningFirstPlay();
    }

    /**
     * 检查是否可以过牌
     */
    canPass(lastPlay) {
        // 如果是首出，不能过牌
        if (!lastPlay) {
            return false;
        }

        // 如果有炸弹，一般不建议过
        const bombs = this.findBombs();
        if (bombs.length > 0 && this.shouldUseBomb()) {
            return false;
        }

        return true;
    }

    /**
     * 检查是否应该使用炸弹
     */
    shouldUseBomb() {
        const situation = this.analyzeSituation(null);
        const teammate = this.getTeammateInfo();
        const opponents = this.getOpponentInfo();

        // 如果对手危险，应该使用炸弹
        const dangerousOpponents = opponents.filter(opp => opp.status === 'dangerous');
        if (dangerousOpponents.length > 0) {
            return true;
        }

        // 如果队友快赢了，应该配合
        if (teammate && teammate.cardCount <= 5) {
            return true;
        }

        return false;
    }

    /**
     * 执行策略
     */
    executeStrategy(strategy, situation) {
        switch (strategy) {
            case 'pass':
                return { action: 'pass', cards: [], reason: 'strategic_pass' };

            case 'first_attack':
                return this.makeFirstAttack(situation);

            case 'follow_attack':
                return this.makeFollowAttack(situation);

            case 'defensive_play':
                return this.makeDefensivePlay(situation);

            case 'cooperative_play':
                return this.makeCooperativePlay(situation);

            case 'emergency_play':
                return this.makeEmergencyPlay(situation);

            default:
                return this.makeRandomPlay(situation);
        }
    }

    /**
     * 首次出牌
     */
    makeFirstAttack(situation) {
        // 寻找最有利的首出牌型
        const candidates = this.findBestFirstPlays(situation);

        if (candidates.length > 0) {
            // 选择控制力最强的牌型
            candidates.sort((a, b) => b.controlValue - a.controlValue);
            return {
                action: 'play',
                cards: candidates[0].cards,
                type: candidates[0].type,
                reason: 'optimal_first_play'
            };
        }

        // 没有合适的首出牌，出最小的
        return this.makeSmallestPlay(situation);
    }

    /**
     * 跟随出牌
     */
    makeFollowAttack(situation) {
        if (!situation.lastPlay) {
            return this.makeFirstAttack(situation);
        }

        const lastType = this.gameEngine.ruleEngine.getCardType(situation.lastPlay);
        const candidates = this.findBeatingPlays(lastType, situation);

        if (candidates.length > 0) {
            // 选择代价最小的出牌
            candidates.sort((a, b) => a.cost - b.cost);
            return {
                action: 'play',
                cards: candidates[0].cards,
                type: candidates[0].type,
                reason: 'minimal_beating_play'
            };
        }

        // 打不过，选择过牌
        return { action: 'pass', cards: [], reason: 'cannot_beat' };
    }

    /**
     * 防守性出牌
     */
    makeDefensivePlay(situation) {
        // 优先保留强力牌型，出最小的牌
        return this.makeSmallestPlay(situation);
    }

    /**
     * 协作出牌
     */
    makeCooperativePlay(situation) {
        const teammate = situation.teammates;
        if (!teammate) {
            return this.makeFollowAttack(situation);
        }

        // 如果队友危险，配合队友
        if (teammate.status === 'dangerous') {
            return this.helpTeammate(situation);
        }

        // 如果队友状态好，可以正常出牌
        return this.makeFollowAttack(situation);
    }

    /**
     * 紧急出牌
     */
    makeEmergencyPlay(situation) {
        // 情况紧急，使用最强的牌
        const strongestPlays = this.findStrongestPlays(situation);

        if (strongestPlays.length > 0) {
            return {
                action: 'play',
                cards: strongestPlays[0].cards,
                type: strongestPlays[0].type,
                reason: 'emergency_response'
            };
        }

        return this.makeSmallestPlay(situation);
    }

    /**
     * 帮助队友
     */
    helpTeammate(situation) {
        // 尝试用小牌帮助队友消耗对手的强力牌
        const helpPlays = this.findHelpPlays(situation);

        if (helpPlays.length > 0) {
            return {
                action: 'play',
                cards: helpPlays[0].cards,
                type: helpPlays[0].type,
                reason: 'helping_teammate'
            };
        }

        return { action: 'pass', cards: [], reason: 'save_for_teammate' };
    }

    /**
     * 随机出牌
     */
    makeRandomPlay(situation) {
        const allPlays = this.getAllPossiblePlays(situation);

        if (allPlays.length > 0) {
            const randomIndex = Math.floor(Math.random() * allPlays.length);
            return {
                action: 'play',
                cards: allPlays[randomIndex].cards,
                type: allPlays[randomIndex].type,
                reason: 'random_play'
            };
        }

        return { action: 'pass', cards: [], reason: 'no_play_available' };
    }

    /**
     * 查找最佳首出牌
     */
    findBestFirstPlays(situation) {
        const candidates = [];

        for (let cardType of situation.cardTypes.singles) {
            candidates.push({
                ...cardType,
                controlValue: this.evaluateControlValue(cardType),
                cost: this.evaluateCost(cardType.cards)
            });
        }

        for (let pair of situation.cardTypes.pairs) {
            candidates.push({
                ...pair,
                controlValue: this.evaluateControlValue(pair),
                cost: this.evaluateCost(pair.cards)
            });
        }

        return candidates.filter(candidate => candidate.controlValue > 0);
    }

    /**
     * 查找能打过指定牌型的牌
     */
    findBeatingPlays(targetType, situation) {
        const candidates = [];
        const allTypes = [...situation.cardTypes.singles, ...situation.cardTypes.pairs,
                        ...situation.cardTypes.straights, ...situation.cardTypes.bombs];

        for (let cardType of allTypes) {
            const comparison = this.gameEngine.ruleEngine.compareCardTypes(cardType.type, targetType);
            if (comparison > 0) {
                candidates.push({
                    ...cardType,
                    cost: this.evaluateCost(cardType.cards)
                });
            }
        }

        return candidates;
    }

    /**
     * 查找强力牌
     */
    findStrongestPlays(situation) {
        return [...situation.cardTypes.bombs].filter(bomb => bomb.power >= 500);
    }

    /**
     * 查找辅助牌
     */
    findHelpPlays(situation) {
        // 返回消耗较小的牌型
        const allPlays = [...situation.cardTypes.singles, ...situation.cardTypes.pairs];
        return allPlays.filter(play => this.evaluateCost(play.cards) <= 20);
    }

    /**
     * 查找最小出牌
     */
    makeSmallestPlay(situation) {
        const allPlays = this.getAllPossiblePlays(situation);

        if (allPlays.length > 0) {
            allPlays.sort((a, b) => this.evaluateCost(a.cards) - this.evaluateCost(b.cards));
            return {
                action: 'play',
                cards: allPlays[0].cards,
                type: allPlays[0].type,
                reason: 'smallest_play'
            };
        }

        return { action: 'pass', cards: [], reason: 'no_small_play' };
    }

    /**
     * 获取所有可能的出牌
     */
    getAllPossiblePlays(situation) {
        return [...situation.cardTypes.singles, ...situation.cardTypes.pairs,
                ...situation.cardTypes.bombs];
    }

    /**
     * 评估控制价值
     */
    evaluateControlValue(cardType) {
        // 简化实现，实际需要复杂的策略分析
        const baseValue = cardType.power / 10;

        // 根据牌型调整
        switch (cardType.type.type) {
            case 'bomb':
            case 'rocket':
                return baseValue * 3;
            case 'straight':
                return baseValue * 1.5;
            default:
                return baseValue;
        }
    }

    /**
     * 评估出牌代价
     */
    evaluateCost(cards) {
        return cards.reduce((total, card) => {
            const value = this.getCardWeight ? this.getCardWeight(card) : this.getBasicCardValue(card.rank);
            return total + value;
        }, 0);
    }

    /**
     * 获取思考时间
     */
    getThinkingTime() {
        switch (this.difficulty) {
            case 'easy':
                return 800;
            case 'medium':
                return this.thinkingTime;
            case 'hard':
                return 2500;
            default:
                return this.thinkingTime;
        }
    }

    /**
     * 获取组合
     */
    getCombinations(array, size) {
        const result = [];

        function combine(start, combo) {
            if (combo.length === size) {
                result.push([...combo]);
                return;
            }

            for (let i = start; i < array.length; i++) {
                combo.push(array[i]);
                combine(i + 1, combo);
                combo.pop();
            }
        }

        combine(0, []);
        return result;
    }

    /**
     * 更新记忆
     */
    updateMemory(play) {
        if (play.action === 'play') {
            this.memory.recordPlay(this.playerId, play.cards, play.type);
        }
        this.memory.updateHandCards(this.handCards);
    }

    /**
     * 设置难度
     */
    setDifficulty(level) {
        this.difficulty = level;
        this.strategy.setDifficulty(level);
    }

    /**
     * 获取AI统计信息
     */
    getStats() {
        return {
            playerId: this.playerId,
            playerName: this.player?.name,
            difficulty: this.difficulty,
            handAnalysis: this.memory.getHandAnalysis(),
            playsCount: this.memory.getPlaysCount(),
            accuracy: this.memory.getAccuracy()
        };
    }
}

/**
 * AI记忆系统
 */
class AIMemory {
    constructor() {
        this.reset();
    }

    reset() {
        this.handCards = [];
        this.playedCards = [];
        this.handAnalysis = null;
        this.playsHistory = [];
        this.opponentPatterns = new Map();
        this.teammatePatterns = new Map();
    }

    updateHandCards(cards) {
        this.handCards = [...cards];
    }

    setHandAnalysis(analysis) {
        this.handAnalysis = analysis;
    }

    recordPlay(playerId, cards, type) {
        this.playedCards.push(...cards);
        this.playsHistory.push({
            playerId,
            cards: [...cards],
            type,
            timestamp: Date.now()
        });
    }

    getHandAnalysis() {
        return this.handAnalysis;
    }

    getPlaysCount() {
        return this.playsHistory.length;
    }

    getAccuracy() {
        // 简化实现
        return 0.85;
    }
}

/**
 * AI策略系统
 */
class AIStrategy {
    constructor(aiPlayer) {
        this.aiPlayer = aiPlayer;
        this.difficulty = 'medium';
    }

    setDifficulty(level) {
        this.difficulty = level;
    }

    selectStrategy(situation) {
        const strategies = this.getPossibleStrategies(situation);

        // 根据难度选择策略
        switch (this.difficulty) {
            case 'easy':
                return this.selectEasyStrategy(strategies, situation);
            case 'medium':
                return this.selectMediumStrategy(strategies, situation);
            case 'hard':
                return this.selectHardStrategy(strategies, situation);
            default:
                return strategies[0] || 'pass';
        }
    }

    getPossibleStrategies(situation) {
        const strategies = [];

        if (situation.canPass) {
            strategies.push('pass');
        }

        if (situation.isFirstPlay) {
            strategies.push('first_attack');
        } else {
            strategies.push('follow_attack');
        }

        if (situation.mustWin) {
            strategies.push('emergency_play');
        }

        if (this.shouldCooperate(situation)) {
            strategies.push('cooperative_play');
        }

        if (this.shouldDefend(situation)) {
            strategies.push('defensive_play');
        }

        return strategies;
    }

    selectEasyStrategy(strategies, situation) {
        // 简单策略：优先过牌
        if (strategies.includes('pass')) {
            return 'pass';
        }
        return strategies[0];
    }

    selectMediumStrategy(strategies, situation) {
        // 中等策略：平衡进攻和防守
        if (situation.mustWin && strategies.includes('emergency_play')) {
            return 'emergency_play';
        }

        if (this.shouldCooperate(situation) && strategies.includes('cooperative_play')) {
            return 'cooperative_play';
        }

        return strategies[0];
    }

    selectHardStrategy(strategies, situation) {
        // 困难策略：复杂的策略选择
        // 这里可以实现更复杂的策略分析
        return this.selectOptimalStrategy(strategies, situation);
    }

    selectOptimalStrategy(strategies, situation) {
        // 实现最优策略选择算法
        // 简化实现
        return strategies[0];
    }

    shouldCooperate(situation) {
        if (!situation.teammates) {
            return false;
        }

        return situation.teammates.status === 'dangerous' ||
               situation.teammates.cardCount <= 5;
    }

    shouldDefend(situation) {
        return situation.handStrength < 300 ||
               (situation.opponents &&
                situation.opponents.some(opp => opp.status === 'dangerous'));
    }

    /**
     * 使用新的决策引擎进行出牌
     * @param {Object} lastPlay - 上家出牌
     * @returns {Promise} 出牌决策
     */
    async makePlay(lastPlay) {
        console.log(`[AIPlayer] makePlay 被调用，lastPlay:`, lastPlay);

        // 简单策略：有牌就出，让游戏更有趣
        const simplePlay = this.makeSimplePlay(lastPlay);
        if (simplePlay) {
            console.log(`[AIPlayer] 简单策略返回:`, simplePlay);
            return simplePlay;
        }

        // 如果简单策略找不到可出的牌，使用原始逻辑
        try {
            const decisionEngine = new AIDecisionEngine(this);
            console.log(`[AIPlayer] 调用 makeSmartPlay...`);
            const play = await decisionEngine.makeSmartPlay(this.player, lastPlay);
            console.log(`[AIPlayer] makeSmartPlay 返回:`, play);

            // 更新记忆系统
            if (play.cards && play.cards.length > 0) {
                this.memory.recordPlay(this.playerId, play.cards, play.type);
            }

            return play;
        } catch (error) {
            console.error('AI决策失败:', error);
            console.error('错误堆栈:', error.stack);
            // 降级策略：使用简单的出牌逻辑
            const fallback = this.makeFallbackPlay(lastPlay);
            console.log(`[AIPlayer] 降级策略返回:`, fallback);
            return fallback;
        }
    }

    /**
     * 简单出牌策略：尽量出牌，让游戏更有趣
     */
    makeSimplePlay(lastPlay) {
        console.log(`[AIPlayer] 使用简单策略...`);
        console.log(`[AIPlayer] 手牌数量: ${this.handCards ? this.handCards.length : 0}`);
        console.log(`[AIPlayer] 手牌:`, this.handCards ? this.handCards.map(c => c.rank + c.suit).join(',') : 'none');

        // 首出：出最小的单张
        if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
            console.log(`[AIPlayer] 首出模式`);

            // 直接出第一张牌
            if (this.handCards && this.handCards.length > 0) {
                const card = this.handCards[0];
                console.log(`[AIPlayer] 出牌: ${card.rank}${card.suit}`);
                return {
                    action: 'play',
                    cards: [card],
                    type: { type: 'single' },
                    reason: 'simple_first_play'
                };
            }
            console.log(`[AIPlayer] 没有手牌可出`);
        }

        // 跟牌：尝试找到能打过的牌
        if (lastPlay && lastPlay.cards && this.gameEngine && this.gameEngine.ruleEngine) {
            const lastType = this.gameEngine.ruleEngine.getCardType(lastPlay.cards);
            if (!lastType) {
                return null;
            }

            // 对于单张：找更大的单张
            if (lastType.type === 'single') {
                const handCards = this.handCards || [];
                const biggerCards = handCards.filter(card => {
                    try {
                        return this.gameEngine.ruleEngine.canBeat([card], lastPlay.cards);
                    } catch (e) {
                        return false;
                    }
                });
                if (biggerCards.length > 0) {
                    // 选择最小的能打过的牌（使用规则引擎权重）
                    biggerCards.sort((a, b) => {
                        const weightA = this.gameEngine.ruleEngine.getCardWeight(a);
                        const weightB = this.gameEngine.ruleEngine.getCardWeight(b);
                        return weightA - weightB;
                    });
                    return {
                        action: 'play',
                        cards: [biggerCards[0]],
                        type: this.gameEngine.ruleEngine.getCardType([biggerCards[0]]),
                        reason: 'simple_single_follow'
                    };
                }
            }

            // 对于对子：找对子
            if (lastType.type === 'pair') {
                const pairs = this.findPairs();
                for (let pair of pairs) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(pair, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: pair,
                                type: this.gameEngine.ruleEngine.getCardType(pair),
                                reason: 'simple_pair_follow'
                            };
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            // 对于炸弹：总是出更大的炸弹
            if (lastType.family === 'bomb') {
                const bombs = this.findBombs();
                for (let bomb of bombs) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(bomb.cards, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: bomb.cards,
                                type: this.gameEngine.ruleEngine.getCardType(bomb.cards),
                                reason: 'simple_bomb_counter'
                            };
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            // 对于任何牌型，都尝试出炸弹（让游戏更激烈）
            const bombs = this.findBombs();
            console.log(`[AIPlayer] 检查炸弹，找到 ${bombs.length} 个炸弹`);
            if (bombs.length > 0) {
                // 用最小的炸弹打（使用规则引擎权重）
                bombs.sort((a, b) => {
                    if (a.count !== b.count) {
                        return a.count - b.count;
                    }
                    // 使用规则引擎获取权重
                    const weightA = this.gameEngine.ruleEngine.getCardWeight(a.cards[0]);
                    const weightB = this.gameEngine.ruleEngine.getCardWeight(b.cards[0]);
                    return weightA - weightB;
                });
                console.log(`[AIPlayer] 出炸弹: ${bombs[0].cards.map(c => c.rank + c.suit).join(',')}`);
                return {
                    action: 'play',
                    cards: bombs[0].cards,
                    type: this.gameEngine.ruleEngine.getCardType(bombs[0].cards),
                    reason: 'simple_bomb_attack'
                };
            }

            // 如果没有炸弹，出最大的单张（即使打不过也出）
            if (this.handCards && this.handCards.length > 0) {
                console.log(`[AIPlayer] 没有炸弹，出最大的单张`);
                const card = this.handCards[0]; // 手牌已经排序，第一张是最大的
                return {
                    action: 'play',
                    cards: [card],
                    type: { type: 'single' },
                    reason: 'simple_max_card'
                };
            }
        }

        console.log(`[AIPlayer] 真的没有牌可出了`);
        return null; // 找不到可出的牌
    }

    /**
     * 降级出牌策略
     */
    makeFallbackPlay(lastPlay) {
        // 严格遵循掼蛋规则的降级逻辑
        if (!lastPlay || !lastPlay.cards) {
            // 首出最小的牌
            const smallest = this.findSmallestCard();
            if (smallest) {
                let cardType = null;
                try {
                    if (this.gameEngine && this.gameEngine.ruleEngine) {
                        cardType = this.gameEngine.ruleEngine.getCardType([smallest]);
                    }
                } catch (error) {
                    console.warn('获取牌型失败，使用默认值');
                }

                // 使用规则引擎获取权重（模块化，不内嵌）
                const cardWeight = this.getCardWeight(smallest);

                return {
                    action: 'play',
                    cards: [smallest],
                    type: cardType || { type: 'single', power: cardWeight },
                    reason: 'fallback_first_play'
                };
            }
        }

        // 跟牌情况：必须严格遵循牌型匹配规则
        if (this.gameEngine && this.gameEngine.ruleEngine && lastPlay && lastPlay.cards) {
            const lastType = this.gameEngine.ruleEngine.getCardType(lastPlay.cards);
            if (!lastType) {
                console.warn('无法识别上家牌型，过牌');
                return { action: 'pass', cards: [], reason: 'invalid_last_type' };
            }

            // 根据上家牌型查找对应的牌
            const handCards = this.handCards || [];

            if (lastType.family === 'bomb') {
                // 上家出炸弹，只能用更大的炸弹打
                const possibleBombs = this.findBombs();
                for (let bomb of possibleBombs) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(bomb.cards, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: bomb.cards,
                                type: this.gameEngine.ruleEngine.getCardType(bomb.cards),
                                reason: 'fallback_bomb_counter'
                            };
                        }
                    } catch (error) {
                        console.warn('炸弹验证失败:', error);
                    }
                }
            } else if (lastType.type === 'single') {
                // 上家出单张，只能用单张跟
                for (let card of handCards) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat([card], lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: [card],
                                type: this.gameEngine.ruleEngine.getCardType([card]),
                                reason: 'fallback_single_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('单张跟牌验证失败:', error);
                    }
                }
            } else if (lastType.type === 'pair') {
                // 上家出对子，找对子跟
                const pairs = this.findPairs();
                for (let pair of pairs) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(pair, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: pair,
                                type: this.gameEngine.ruleEngine.getCardType(pair),
                                reason: 'fallback_pair_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('对子跟牌验证失败:', error);
                    }
                }
            } else if (lastType.type === 'triple') {
                // 上家出三张，找三张跟
                const triples = this.findTriples();
                for (let triple of triples) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(triple, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: triple,
                                type: this.gameEngine.ruleEngine.getCardType(triple),
                                reason: 'fallback_triple_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('三张跟牌验证失败:', error);
                    }
                }
            } else if (lastType.type === 'tripleWithPair') {
                // 上家出三带二，找三带二跟
                const tripleWithPairs = this.findTripleWithPairs();
                for (let play of tripleWithPairs) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(play, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: play,
                                type: this.gameEngine.ruleEngine.getCardType(play),
                                reason: 'fallback_triple_with_pair_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('三带二跟牌验证失败:', error);
                    }
                }
            } else if (lastType.type === 'straight') {
                // 上家出顺子，找相同长度的顺子跟
                const straights = this.findStraights(lastType.length);
                for (let straight of straights) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(straight, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: straight,
                                type: this.gameEngine.ruleEngine.getCardType(straight),
                                reason: 'fallback_straight_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('顺子跟牌验证失败:', error);
                    }
                }
            } else if (lastType.type === 'pairStraight') {
                // 上家出连对，找相同长度的连对跟
                const pairStraights = this.findPairStraights(lastType.length);
                for (let pairStraight of pairStraights) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(pairStraight, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: pairStraight,
                                type: this.gameEngine.ruleEngine.getCardType(pairStraight),
                                reason: 'fallback_pair_straight_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('连对跟牌验证失败:', error);
                    }
                }
            } else if (lastType.type === 'tripleStraight') {
                // 上家出钢板，找相同长度的钢板跟
                const tripleStraights = this.findTripleStraights(lastType.length);
                for (let tripleStraight of tripleStraights) {
                    try {
                        if (this.gameEngine.ruleEngine.canBeat(tripleStraight, lastPlay.cards)) {
                            return {
                                action: 'play',
                                cards: tripleStraight,
                                type: this.gameEngine.ruleEngine.getCardType(tripleStraight),
                                reason: 'fallback_triple_straight_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('钢板跟牌验证失败:', error);
                    }
                }
            }
        }

        // 过牌
        return {
            action: 'pass',
            cards: [],
            reason: 'fallback_pass'
        };
    }

    /**
     * 查找最小的牌
     */
    findSmallestCard() {
        if (!this.handCards || this.handCards.length === 0) {
            return null;
        }

        let smallest = this.handCards[0];
        let minWeight = this.getCardWeight(smallest);

        for (let card of this.handCards) {
            const weight = this.getCardWeight(card);
            if (weight < minWeight) {
                smallest = card;
                minWeight = weight;
            }
        }

        return smallest;
    }

    /**
     * 获取牌的权重（降级处理）
     */
    getCardWeight(card) {
        // 优先使用规则引擎
        if (this.gameEngine && this.gameEngine.ruleEngine && this.gameEngine.ruleEngine.getCardWeight) {
            try {
                return this.gameEngine.ruleEngine.getCardWeight(card);
            } catch (error) {
                console.warn('规则引擎获取牌权失败:', error);
            }
        }

        // 降级到基础值
        return this.getBasicCardValue(card.rank);
    }
}

// ===== AI决策引擎类 =====
/**
 * AI决策引擎
 * 负责整合所有AI决策逻辑，包括牌型查找、策略选择等
 */
class AIDecisionEngine {
    constructor(aiPlayer) {
        this.aiPlayer = aiPlayer;
        this.ruleEngine = aiPlayer.gameEngine.ruleEngine;
        this.cardTypeCache = new Map(); // 牌型缓存
    }

    /**
     * 主要的AI决策方法
     * @param {Object} player - 玩家对象
     * @param {Object} lastPlay - 上家出牌
     * @returns {Promise} 决策结果
     */
    async makeSmartPlay(player, lastPlay) {
        console.log(`[AIDecisionEngine] makeSmartPlay 开始，player:`, player, 'lastPlay:', lastPlay);
        const handCards = this.aiPlayer.handCards;
        console.log(`[AIDecisionEngine] 手牌数量:`, handCards.length);
        console.log(`[AIDecisionEngine] 规则引擎:`, this.ruleEngine ? '已加载' : '未加载');

        try {
            // 如果是首出
            if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
                console.log(`[AIDecisionEngine] 首出模式`);
                return this.makeFirstPlay(player, handCards);
            }

            // 跟牌情况
            console.log(`[AIDecisionEngine] 跟牌模式，上家出牌:`, lastPlay.cards.map(c => c.rank + c.suit).join(','));
            const possiblePlays = this.findAllPossiblePlays(handCards, lastPlay);
            console.log(`[AIDecisionEngine] 找到 ${possiblePlays.length} 个可能的出牌`);

            if (possiblePlays.length === 0) {
                // 没有能打过的牌，过牌
                console.log(`[AIDecisionEngine] 没有能打过的牌，选择过牌`);
                return { action: 'pass', cards: [], reason: 'cannot_beat' };
            }

            // 选择最优的出牌
            const selectedPlay = this.selectOptimalPlay(possiblePlays, player, lastPlay);
            console.log(`[AIDecisionEngine] 选择最优出牌:`, selectedPlay.cards.map(c => c.rank + c.suit).join(','));
            return {
                action: 'play',
                cards: selectedPlay.cards,
                type: selectedPlay.type,
                reason: 'optimal_play'
            };
        } catch (error) {
            console.error(`[AIDecisionEngine] 决策出错:`, error);
            console.error(`[AIDecisionEngine] 错误堆栈:`, error.stack);

            // 降级到简单策略
            return this.makeFallbackPlay(handCards, lastPlay);
        }
    }

    /**
     * 首出决策
     */
    makeFirstPlay(player, handCards) {
        console.log(`[AIDecisionEngine] 首出决策，手牌数:`, handCards.length);

        try {
            // 分析手牌，找出最佳首出牌型
            const candidates = this.findFirstPlayCandidates(handCards);
            console.log(`[AIDecisionEngine] 找到 ${candidates.length} 个首出候选`);

            if (candidates.length > 0) {
                // 选择最小的牌型作为首出
                candidates.sort((a, b) => this.getPlayValue(a) - this.getPlayValue(b));
                const selected = candidates[0];
                console.log(`[AIDecisionEngine] 选择首出:`, selected.cards.map(c => c.rank + c.suit).join(','));
                return {
                    action: 'play',
                    cards: selected.cards,
                    type: selected.type,
                    reason: 'optimal_first_play'
                };
            }

            // 默认出最小的单张
            const smallestSingle = this.findSmallestSingle(handCards);
            if (smallestSingle) {
                console.log(`[AIDecisionEngine] 默认首出最小单张: ${smallestSingle.rank}${smallestSingle.suit}`);
                let cardType = null;
                try {
                    if (this.ruleEngine) {
                        cardType = this.ruleEngine.getCardType([smallestSingle]);
                    }
                } catch (error) {
                    console.warn('获取牌型失败:', error);
                }

                // 使用规则引擎获取权重（模块化，不内嵌）
                const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                    this.ruleEngine.getCardWeight(smallestSingle) :
                    this.aiPlayer.getBasicCardValue(smallestSingle.rank);

                return {
                    action: 'play',
                    cards: [smallestSingle],
                    type: cardType || { type: 'single', power: cardWeight },
                    reason: 'default_first_play'
                };
            }

            // 如果所有方法都失败，过牌（虽然首出不应该过牌）
            console.warn(`[AIDecisionEngine] 首出决策失败，意外情况`);
            return { action: 'pass', cards: [], reason: 'first_play_failed' };

        } catch (error) {
            console.error(`[AIDecisionEngine] 首出决策出错:`, error);
            // 降级到最简单的策略
            return this.makeFallbackPlay(handCards, null);
        }
    }

    /**
     * 查找所有可能的出牌（从index-modern.html迁移并优化）
     */
    findAllPossiblePlays(handCards, lastPlay) {
        const possiblePlays = [];
        const lastType = this.ruleEngine.getCardType(lastPlay.cards);

        if (!lastType) return [];

        // 准备rankGroups
        const rankGroups = {};
        handCards.forEach(card => {
            if (!rankGroups[card.rank]) {
                rankGroups[card.rank] = [];
            }
            rankGroups[card.rank].push(card);
        });

        // 检查相同类型的牌型
        switch (lastType.type) {
            case 'single':
                this.findPossibleSingles(handCards, lastPlay, possiblePlays);
                break;
            case 'pair':
                this.findPossiblePairs(rankGroups, lastPlay, possiblePlays);
                break;
            case 'triple':
                this.findPossibleTriples(rankGroups, lastPlay, possiblePlays);
                break;
            case 'tripleWithPair':
                this.findPossibleTripleWithPairs(rankGroups, lastPlay, possiblePlays);
                break;
            case 'straight':
                this.findPossibleStraights(handCards, lastPlay, possiblePlays);
                break;
            case 'pairStraight':
                this.findPossiblePairStraights(rankGroups, lastPlay, possiblePlays);
                break;
            case 'tripleStraight':
                this.findPossibleTripleStraights(rankGroups, lastPlay, possiblePlays);
                break;
        }

        // 炸弹可以打任何牌型
        this.findPossibleBombs(rankGroups, lastPlay, possiblePlays);

        // 按从小到大排序
        possiblePlays.sort((a, b) => this.getPlayValue(a) - this.getPlayValue(b));

        return possiblePlays;
    }

    /**
     * 查找可能的单张
     */
    findPossibleSingles(handCards, lastPlay, possiblePlays) {
        for (let card of handCards) {
            const validation = this.ruleEngine.validatePlay([card], lastPlay, handCards);
            if (validation.valid) {
                possiblePlays.push({
                    cards: [card],
                    type: validation.type
                });
            }
        }
    }

    /**
     * 查找可能的对子
     */
    findPossiblePairs(rankGroups, lastPlay, possiblePlays) {
        for (let rank in rankGroups) {
            const group = rankGroups[rank];
            if (group.length >= 2) {
                for (let i = 0; i < group.length - 1; i++) {
                    for (let j = i + 1; j < group.length; j++) {
                        const pair = [group[i], group[j]];
                        const validation = this.ruleEngine.validatePlay(pair, lastPlay, this.aiPlayer.handCards);
                        if (validation.valid) {
                            possiblePlays.push({
                                cards: pair,
                                type: validation.type
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * 查找可能的三张
     */
    findPossibleTriples(rankGroups, lastPlay, possiblePlays) {
        for (let rank in rankGroups) {
            const group = rankGroups[rank];
            if (group.length >= 3) {
                const triple = [group[0], group[1], group[2]];
                const validation = this.ruleEngine.validatePlay(triple, lastPlay, this.aiPlayer.handCards);
                if (validation.valid) {
                    possiblePlays.push({
                        cards: triple,
                        type: validation.type
                    });
                }
            }
        }
    }

    /**
     * 查找可能的三带二
     */
    findPossibleTripleWithPairs(rankGroups, lastPlay, possiblePlays) {
        for (let tripleRank in rankGroups) {
            const tripleGroup = rankGroups[tripleRank];
            if (tripleGroup.length >= 3) {
                const triple = [tripleGroup[0], tripleGroup[1], tripleGroup[2]];

                for (let pairRank in rankGroups) {
                    if (pairRank !== tripleRank && rankGroups[pairRank].length >= 2) {
                        const pair = [rankGroups[pairRank][0], rankGroups[pairRank][1]];
                        const tripleWithPair = [...triple, ...pair];
                        const validation = this.ruleEngine.validatePlay(tripleWithPair, lastPlay, this.aiPlayer.handCards);
                        if (validation.valid) {
                            possiblePlays.push({
                                cards: tripleWithPair,
                                type: validation.type
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * 查找可能的顺子
     */
    findPossibleStraights(handCards, lastPlay, possiblePlays) {
        const nonJokerCards = handCards.filter(c =>
            c.suit !== 'joker' &&
            c.rank !== '2' &&
            c.rank !== '小王' &&
            c.rank !== '大王'
        );

        nonJokerCards.sort((a, b) => this.ruleEngine.getCardWeight(a) - this.ruleEngine.getCardWeight(b));

        const lastLength = lastPlay.cards.length;
        const lastType = this.ruleEngine.getCardType(lastPlay.cards);

        for (let startIdx = 0; startIdx <= nonJokerCards.length - 5; startIdx++) {
            for (let length = Math.max(5, lastLength); length <= Math.min(nonJokerCards.length - startIdx, 12); length++) {
                const straightCards = nonJokerCards.slice(startIdx, startIdx + length);

                if (this.isConsecutive(straightCards)) {
                    const validation = this.ruleEngine.validatePlay(straightCards, lastPlay, handCards);
                    if (validation.valid) {
                        possiblePlays.push({
                            cards: straightCards,
                            type: validation.type
                        });
                    }
                }
            }
        }
    }

    /**
     * 查找可能的连对
     */
    findPossiblePairStraights(rankGroups, lastPlay, possiblePlays) {
        const availablePairs = [];
        for (let rank in rankGroups) {
            if (rankGroups[rank].length >= 2) {
                availablePairs.push({
                    rank: rank,
                    value: this.ruleEngine.getCardWeight({rank: rank}),
                    cards: [rankGroups[rank][0], rankGroups[rank][1]]
                });
            }
        }

        availablePairs.sort((a, b) => a.value - b.value);

        const lastLength = lastPlay.cards.length / 2; // 连对的长度

        for (let startIdx = 0; startIdx <= availablePairs.length - 3; startIdx++) {
            for (let length = Math.max(3, lastLength); length <= availablePairs.length - startIdx; length++) {
                const selectedPairs = availablePairs.slice(startIdx, startIdx + length);

                if (this.isConsecutivePairs(selectedPairs)) {
                    const pairStraightCards = [];
                    selectedPairs.forEach(p => pairStraightCards.push(...p.cards));

                    const validation = this.ruleEngine.validatePlay(pairStraightCards, lastPlay, this.aiPlayer.handCards);
                    if (validation.valid) {
                        possiblePlays.push({
                            cards: pairStraightCards,
                            type: validation.type
                        });
                    }
                }
            }
        }
    }

    /**
     * 查找可能的钢板（连续三张）
     */
    findPossibleTripleStraights(rankGroups, lastPlay, possiblePlays) {
        const availableTriples = [];
        for (let rank in rankGroups) {
            if (rankGroups[rank].length >= 3) {
                availableTriples.push({
                    rank: rank,
                    value: this.ruleEngine.getCardWeight({rank: rank}),
                    cards: [rankGroups[rank][0], rankGroups[rank][1], rankGroups[rank][2]]
                });
            }
        }

        availableTriples.sort((a, b) => a.value - b.value);

        const lastLength = lastPlay.cards.length / 3; // 钢板的长度

        for (let startIdx = 0; startIdx <= availableTriples.length - 2; startIdx++) {
            for (let length = Math.max(2, lastLength); length <= availableTriples.length - startIdx; length++) {
                const selectedTriples = availableTriples.slice(startIdx, startIdx + length);

                if (this.isConsecutiveTriples(selectedTriples)) {
                    const tripleStraightCards = [];
                    selectedTriples.forEach(t => tripleStraightCards.push(...t.cards));

                    const validation = this.ruleEngine.validatePlay(tripleStraightCards, lastPlay, this.aiPlayer.handCards);
                    if (validation.valid) {
                        possiblePlays.push({
                            cards: tripleStraightCards,
                            type: validation.type
                        });
                    }
                }
            }
        }
    }

    /**
     * 查找可能的炸弹
     */
    findPossibleBombs(rankGroups, lastPlay, possiblePlays) {
        // 普通炸弹
        for (let rank in rankGroups) {
            const group = rankGroups[rank];
            if (group.length >= 4) {
                for (let count = 4; count <= group.length; count++) {
                    const bomb = group.slice(0, count);
                    const validation = this.ruleEngine.validatePlay(bomb, lastPlay, this.aiPlayer.handCards);
                    if (validation.valid) {
                        possiblePlays.push({
                            cards: bomb,
                            type: validation.type
                        });
                    }
                }
            }
        }

        // 王炸
        const jokers = this.aiPlayer.handCards.filter(c => c.suit === 'joker');
        if (jokers.length >= 2) {
            const validation = this.ruleEngine.validatePlay(jokers, lastPlay, this.aiPlayer.handCards);
            if (validation.valid) {
                possiblePlays.push({
                    cards: jokers,
                    type: validation.type
                });
            }
        }
    }

    /**
     * 辅助方法：检查是否连续
     */
    isConsecutive(cards) {
        for (let i = 1; i < cards.length; i++) {
            const prevWeight = this.ruleEngine.getCardWeight(cards[i-1]);
            const currWeight = this.ruleEngine.getCardWeight(cards[i]);
            if (currWeight !== prevWeight + 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * 辅助方法：检查对子是否连续
     */
    isConsecutivePairs(pairs) {
        for (let i = 1; i < pairs.length; i++) {
            if (pairs[i].value !== pairs[i-1].value + 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * 辅助方法：检查三张是否连续
     */
    isConsecutiveTriples(triples) {
        for (let i = 1; i < triples.length; i++) {
            if (triples[i].value !== triples[i-1].value + 1) {
                return false;
            }
        }
        return true;
    }

    /**
     * 查找首出候选牌型
     */
    findFirstPlayCandidates(handCards) {
        const candidates = [];

        try {
            // 按等级分组
            const rankGroups = {};
            handCards.forEach(card => {
                if (!rankGroups[card.rank]) {
                    rankGroups[card.rank] = [];
                }
                rankGroups[card.rank].push(card);
            });

            // 查找单张作为候选
            for (let rank in rankGroups) {
                if (rankGroups[rank].length >= 1) {
                    const card = rankGroups[rank][0];
                    let cardType = null;
                    try {
                        if (this.ruleEngine) {
                            cardType = this.ruleEngine.getCardType([card]);
                        }
                    } catch (error) {
                        console.warn('获取单张牌型失败:', error);
                    }

                    // 使用规则引擎获取权重（模块化，不内嵌）
                    const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                        this.ruleEngine.getCardWeight(card) :
                        this.aiPlayer.getBasicCardValue(rank);

                    candidates.push({
                        cards: [card],
                        type: cardType || { type: 'single', power: cardWeight }
                    });
                }
            }

            // 查找对子作为候选
            for (let rank in rankGroups) {
                if (rankGroups[rank].length >= 2) {
                    const pair = [rankGroups[rank][0], rankGroups[rank][1]];
                    let cardType = null;
                    try {
                        if (this.ruleEngine) {
                            cardType = this.ruleEngine.getCardType(pair);
                        }
                    } catch (error) {
                        console.warn('获取对子牌型失败:', error);
                    }

                    // 使用规则引擎获取权重（模块化，不内嵌）
                    const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                        this.ruleEngine.getCardWeight(pair[0]) :
                        this.aiPlayer.getBasicCardValue(rank);

                    candidates.push({
                        cards: pair,
                        type: cardType || { type: 'pair', power: cardWeight * 2 }
                    });
                }
            }

            // 查找三张作为候选
            for (let rank in rankGroups) {
                if (rankGroups[rank].length >= 3) {
                    const triple = [rankGroups[rank][0], rankGroups[rank][1], rankGroups[rank][2]];
                    let cardType = null;
                    try {
                        if (this.ruleEngine) {
                            cardType = this.ruleEngine.getCardType(triple);
                        }
                    } catch (error) {
                        console.warn('获取三张牌型失败:', error);
                    }

                    // 使用规则引擎获取权重（模块化，不内嵌）
                    const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                        this.ruleEngine.getCardWeight(triple[0]) :
                        this.aiPlayer.getBasicCardValue(rank);

                    candidates.push({
                        cards: triple,
                        type: cardType || { type: 'triple', power: cardWeight * 3 }
                    });
                }
            }

            // 查找炸弹作为候选
            for (let rank in rankGroups) {
                if (rankGroups[rank].length >= 4) {
                    const bomb = rankGroups[rank].slice(0, 4);
                    let cardType = null;
                    try {
                        if (this.ruleEngine) {
                            cardType = this.ruleEngine.getCardType(bomb);
                        }
                    } catch (error) {
                        console.warn('获取炸弹牌型失败:', error);
                    }

                    // 使用规则引擎获取权重（模块化，不内嵌）
                    const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                        this.ruleEngine.getCardWeight(bomb[0]) :
                        this.aiPlayer.getBasicCardValue(rank);

                    candidates.push({
                        cards: bomb,
                        type: cardType || { type: 'bomb', power: cardWeight * 4 }
                    });
                }
            }

            console.log(`[findFirstPlayCandidates] 找到 ${candidates.length} 个候选牌型`);
            return candidates;

        } catch (error) {
            console.error('查找首出候选牌型出错:', error);
            return [];
        }
    }

    /**
     * 查找最小的单张
     */
    findSmallestSingle(handCards) {
        let smallest = handCards[0];
        for (let card of handCards) {
            if (this.ruleEngine.getCardWeight(card) < this.ruleEngine.getCardWeight(smallest)) {
                smallest = card;
            }
        }
        return smallest;
    }

    /**
     * 获取出牌的价值（用于排序）
     */
    getPlayValue(play) {
        try {
            // 简单实现：计算牌的总权重
            if (this.ruleEngine && this.ruleEngine.getCardWeight) {
                return play.cards.reduce((sum, card) => sum + this.ruleEngine.getCardWeight(card), 0);
            } else {
                // 降级到基础值计算
                return play.cards.reduce((sum, card) => {
                    const basicValue = this.aiPlayer.getBasicCardValue(card.rank);
                    return sum + basicValue;
                }, 0);
            }
        } catch (error) {
            console.warn('计算出牌价值失败:', error);
            return 0;
        }
    }

    /**
     * 选择最优出牌
     */
    selectOptimalPlay(possiblePlays, player, lastPlay) {
        if (possiblePlays.length === 0) {
            return null;
        }

        // 如果上家出的是炸弹，选择最小但能打赢的炸弹
        if (lastPlay && lastPlay.type && lastPlay.type.family === 'bomb') {
            // 过滤出炸弹类型的应对方案
            const bombPlays = possiblePlays.filter(play =>
                play.type && play.type.family === 'bomb'
            );

            if (bombPlays.length > 0) {
                // 选择最小的炸弹（节约大牌）
                return bombPlays[0];
            }
        }

        // 其他情况：选择第一个能打过的牌
        return possiblePlays[0];
    }

    /**
     * 降级出牌策略
     */
    makeFallbackPlay(handCards, lastPlay) {
        console.log(`[AIDecisionEngine] 使用降级出牌策略（严格遵循掼蛋规则）`);

        // 如果是首出，出最小的单张
        if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
            const smallestCard = this.findSmallestSingle(handCards);
            if (smallestCard) {
                console.log(`[AIDecisionEngine] 降级首出: ${smallestCard.rank}${smallestCard.suit}`);
                let cardType = null;
                try {
                    if (this.ruleEngine) {
                        cardType = this.ruleEngine.getCardType([smallestCard]);
                    }
                } catch (error) {
                    console.warn('获取牌型失败:', error);
                }

                // 使用规则引擎获取权重（模块化，不内嵌）
                const cardWeight = this.ruleEngine && this.ruleEngine.getCardWeight ?
                    this.ruleEngine.getCardWeight(smallestCard) :
                    this.aiPlayer.getBasicCardValue(smallestCard.rank);

                return {
                    action: 'play',
                    cards: [smallestCard],
                    type: cardType || { type: 'single', power: cardWeight },
                    reason: 'fallback_first_play'
                };
            }
        }

        // 跟牌情况：严格遵循牌型匹配规则
        if (lastPlay && lastPlay.cards && this.ruleEngine) {
            const lastType = this.ruleEngine.getCardType(lastPlay.cards);
            if (!lastType) {
                console.warn('[AIDecisionEngine] 无法识别上家牌型，过牌');
                return { action: 'pass', cards: [], reason: 'invalid_last_type' };
            }

            console.log(`[AIDecisionEngine] 上家出牌型: ${lastType.type}，需要匹配相同牌型`);

            // 根据上家牌型查找对应的牌
            if (lastType.family === 'bomb') {
                // 上家出炸弹，只能用更大的炸弹打
                console.log(`[AIDecisionEngine] 上家出炸弹，查找更大的炸弹`);
                const possibleBombs = this.aiPlayer.findBombs();
                for (let bomb of possibleBombs) {
                    try {
                        if (this.ruleEngine.canBeat(bomb.cards, lastPlay.cards)) {
                            console.log(`[AIDecisionEngine] 找到更大炸弹: ${bomb.cards.map(c => c.rank + c.suit).join(',')}`);
                            return {
                                action: 'play',
                                cards: bomb.cards,
                                type: this.ruleEngine.getCardType(bomb.cards),
                                reason: 'fallback_bomb_counter'
                            };
                        }
                    } catch (error) {
                        console.warn('炸弹验证失败:', error);
                    }
                }
            } else if (lastType.type === 'single') {
                // 上家出单张，只能用单张跟
                console.log(`[AIDecisionEngine] 上家出单张，查找更大的单张`);
                for (let card of handCards) {
                    try {
                        if (this.ruleEngine.canBeat([card], lastPlay.cards)) {
                            console.log(`[AIDecisionEngine] 找到更大单张: ${card.rank}${card.suit}`);
                            return {
                                action: 'play',
                                cards: [card],
                                type: this.ruleEngine.getCardType([card]),
                                reason: 'fallback_single_follow'
                            };
                        }
                    } catch (error) {
                        console.warn('单张跟牌验证失败:', error);
                    }
                }
            } else {
                // 对于其他牌型（对子、三张、顺子等），不使用降级策略
                // 因为这些牌型需要复杂的组合逻辑，降级策略容易出错
                console.log(`[AIDecisionEngine] 上家出${lastType.type}，降级策略无法处理，过牌`);
            }
        }

        // 过牌
        console.log(`[AIDecisionEngine] 降级过牌`);
        return { action: 'pass', cards: [], reason: 'fallback_pass' };
    }
}

// 导出AI玩家和决策引擎
window.AIPlayer = AIPlayer;
window.AIDecisionEngine = AIDecisionEngine;