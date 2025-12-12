/**
 * AI玩家组件
 * 负责掼蛋AI的决策逻辑，包括出牌策略、记牌和团队协作
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
        console.log(`AI玩家 ${player.name} 初始化完成`);
    }

    /**
     * 设置手牌
     */
    setHandCards(cards) {
        this.handCards = [...cards];
        this.memory.updateHandCards(cards);
        this.analyzeHand();
    }

    /**
     * 分析手牌
     */
    analyzeHand() {
        const analysis = {
            totalCards: this.handCards.length,
            cardTypes: this.getCardTypes(),
            bombs: this.findBombs(),
            strength: this.evaluateHandStrength(),
            potential: this.evaluatePotential()
        };

        this.memory.setHandAnalysis(analysis);
        return analysis;
    }

    /**
     * 获取所有可能的牌型
     */
    getCardTypes() {
        const cardTypes = {
            singles: [],
            pairs: [],
            triples: [],
            straights: [],
            bombs: [],
            other: []
        };

        // 获取所有牌型组合
        for (let i = 1; i <= this.handCards.length; i++) {
            const combinations = this.getCombinations(this.handCards, i);
            for (let combo of combinations) {
                const type = this.gameEngine.ruleEngine.getCardType(combo);
                if (type) {
                    this.addCardTypeToAnalysis(cardTypes, type, combo);
                }
            }
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
            const rank = this.gameEngine.ruleEngine.getCardRank(card);
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
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15, 'joker': 16
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

        // 大牌加分（添加安全检查）
        for (let card of this.handCards) {
            try {
                if (this.gameEngine && this.gameEngine.ruleEngine && this.gameEngine.ruleEngine.getCardRank) {
                    const rank = this.gameEngine.ruleEngine.getCardRank(card);
                    if (rank >= 13) { // A, 2, 王牌
                        strength += rank * 5;
                    }
                } else {
                    // 降级处理：使用基础牌值计算
                    const basicValue = this.getBasicCardValue(card.rank);
                    if (basicValue >= 13) {
                        strength += basicValue * 5;
                    }
                }
            } catch (error) {
                // 如果出错，使用基础牌值
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

        const playerManager = this.gameEngine.playerManager;
        return playerManager.getPlayerTeammate(this.player);
    }

    /**
     * 评估协作能力
     */
    evaluateCooperation(teammate) {
        let score = 50; // 基础分

        // 根据队友剩余牌数调整
        const teammateCardCount = this.gameEngine.playerManager.getPlayerCardCount(teammate);
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
     * 获取游戏进度
     */
    getGameProgress() {
        const totalCards = 108; // 总牌数
        let playedCards = 0;

        // 估算已出牌数
        const players = this.gameEngine.playerManager.getAllPlayers();
        for (let player of players) {
            const cardCount = this.gameEngine.playerManager.getPlayerCardCount(player);
            playedCards += (27 - cardCount);
        }

        return playedCards / totalCards;
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
            cardTypes: this.getCardTypes(),
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
        const playerManager = this.gameEngine.playerManager;
        const opponents = playerManager.getPlayerOpponents(this.player);

        return opponents.map(opponent => ({
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
            const rank = this.gameEngine.ruleEngine.getCardRank(card);
            return total + rank;
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
}

// 导出AI玩家
window.AIPlayer = AIPlayer;