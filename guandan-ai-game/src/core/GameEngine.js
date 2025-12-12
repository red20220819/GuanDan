/**
 * 🎮 游戏引擎核心 - 重构版本
 * 负责游戏状态管理、事件协调和流程控制
 * 支持多种游戏类型的插件化架构
 */

import { EventEmitter } from 'events';
import { GameState } from './GameState.js';
import { EventManager } from './EventManager.js';
import { GAME_EVENTS, GAME_PHASES, PLAYER_POSITIONS } from './Constants.js';

/**
 * 游戏引擎主类
 * 采用观察者模式和事件驱动架构
 */
export class GameEngine extends EventEmitter {
    constructor(config = {}) {
        super();

        // 配置
        this.config = {
            gameType: 'guandan',           // 游戏类型
            playerCount: 4,                // 玩家数量
            deckSize: 108,                // 牌堆大小
            level: 2,                       // 起始等级
            aiDifficulty: 'medium',          // AI难度
            enableAnimations: true,         // 启用动画
            enableSound: true,             // 启用音效
            ...config
        };

        // 游戏状态
        this.gameState = new GameState();
        this.eventManager = new EventManager();

        // 玩家管理
        this.players = new Map();
        this.currentPlayer = null;
        this.playerOrder = [];

        // 牌堆管理
        this.deck = null;
        this.discardPile = [];

        // 游戏流程
        this.currentPhase = GAME_PHASES.WAITING;
        this.currentRound = 1;
        this.consecutivePasses = 0;

        // 历史记录
        this.gameHistory = [];
        this.moveHistory = [];

        // UI组件引用
        this.ui = null;

        // 游戏规则引擎（插件化）
        this.rules = null;

        // 初始化标志
        this.isInitialized = false;
        this.isGameActive = false;

        console.log('🎮 游戏引擎初始化完成');
    }

    /**
     * 初始化游戏引擎
     */
    async initialize(gameType = 'guandan') {
        if (this.isInitialized) {
            console.warn('⚠️ 游戏引擎已经初始化');
            return;
        }

        try {
            console.log(`🚀 开始初始化 ${gameType} 游戏...`);

            // 加载游戏规则
            await this.loadGameRules(gameType);

            // 初始化玩家
            this.initializePlayers();

            // 创建牌堆
            this.createDeck();

            // 发牌
            this.dealCards();

            // 设置初始状态
            this.gameState.setPhase(GAME_PHASES.READY);
            this.currentPlayer = this.playerOrder[0];

            this.isInitialized = true;

            console.log('✅ 游戏引擎初始化完成');

            // 触发初始化完成事件
            this.eventManager.emit(GAME_EVENTS.GAME_INITIALIZED, {
                gameType,
                playerCount: this.players.size,
                deckSize: this.deck.length
            });

        } catch (error) {
            console.error('❌ 游戏引擎初始化失败:', error);
            this.eventManager.emit(GAME_EVENTS.ERROR, { error: error.message });
        }
    }

    /**
     * 加载游戏规则
     */
    async loadGameRules(gameType) {
        try {
            // 动态导入游戏规则模块
            const rulesModule = await import(`../games/${gameType}/${gameType}Rules.js`);
            this.rules = new rulesModule.default(this);

            console.log(`📋 已加载 ${gameType} 游戏规则`);

            this.eventManager.emit(GAME_EVENTS.RULES_LOADED, { gameType });

        } catch (error) {
            console.error(`❌ 加载 ${gameType} 游戏规则失败:`, error);
            throw error;
        }
    }

    /**
     * 初始化玩家
     */
    initializePlayers() {
        this.players.clear();
        this.playerOrder = [];

        const positions = Object.values(PLAYER_POSITIONS);

        for (let i = 0; i < this.config.playerCount; i++) {
            const position = positions[i];
            const player = {
                id: `player_${i + 1}`,
                position: position,
                name: `玩家${i + 1}`,
                cards: [],
                score: 0,
                isActive: false,
                isAI: i !== 0, // 第一个玩家为人类玩家
                team: i % 2 === 0 ? 'A' : 'B' // A队: 位置0,2， B队: 位置1,3
            };

            this.players.set(player.id, player);
            this.playerOrder.push(player.id);
        }

        console.log('👥 玩家初始化完成:', this.playerOrder);
        this.eventManager.emit(GAME_EVENTS.PLAYERS_INITIALIZED, {
            players: Array.from(this.players.values()),
            order: this.playerOrder
        });
    }

    /**
     * 创建牌堆
     */
    createDeck() {
        // 使用规则引擎创建牌堆
        if (this.rules && this.rules.createDeck) {
            this.deck = this.rules.createDeck();
        } else {
            // 默认掼蛋牌堆
            this.deck = this.createDefaultDeck();
        }

        console.log('🎴 牌堆创建完成:', this.deck.length, '张牌');
        this.eventManager.emit(GAME_EVENTS.DECK_CREATED, {
            size: this.deck.length
        });
    }

    /**
     * 创建默认牌堆（掼蛋）
     */
    createDefaultDeck() {
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
                        value: ranks.indexOf(rank) + 3,
                        display: rank + suit,
                        isRed: suit === '♥' || suit === '♦',
                        deckNum: deckNum
                    });
                }
            }
        }

        // 添加大小王
        const jokers = [
            { id: 'joker_small_1', suit: 'joker', rank: '小王', value: 16, display: '🃟', isRed: true },
            { id: 'joker_big_1', suit: 'joker', rank: '大王', value: 17, display: '🃏', isRed: true },
            { id: 'joker_small_2', suit: 'joker', rank: '小王', value: 16, display: '🃟', isRed: true },
            { id: 'joker_big_2', suit: 'joker', rank: '大王', value: 17, display: '🃏', isRed: true }
        ];

        deck.push(...jokers);

        // 洗牌
        this.shuffleDeck(deck);

        return deck;
    }

    /**
     * 洗牌
     */
    shuffleDeck(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    /**
     * 发牌
     */
    dealCards() {
        if (!this.deck || this.deck.length === 0) {
            throw new Error('牌堆为空，无法发牌');
        }

        const cardsPerPlayer = Math.floor(this.deck.length / this.players.size);

        // 清空玩家手牌
        for (const player of this.players.values()) {
            player.cards = [];
        }

        // 逐张发牌
        for (let i = 0; i < cardsPerPlayer; i++) {
            for (const playerId of this.playerOrder) {
                const player = this.players.get(playerId);
                const card = this.deck.pop();
                if (card) {
                    player.cards.push(card);
                }
            }
        }

        console.log('🎴 发牌完成，每人', cardsPerPlayer, '张');
        this.eventManager.emit(GAME_EVENTS.CARDS_DEALT, {
            cardsPerPlayer,
            remainingCards: this.deck.length
        });
    }

    /**
     * 开始游戏
     */
    startGame() {
        if (!this.isInitialized) {
            console.error('❌ 游戏引擎未初始化');
            return;
        }

        if (this.isGameActive) {
            console.warn('⚠️ 游戏已经在进行中');
            return;
        }

        this.isGameActive = true;
        this.gameState.setPhase(GAME_PHASES.PLAYING);
        this.currentRound = 1;

        console.log('🎮 游戏开始！');
        this.eventManager.emit(GAME_EVENTS.GAME_STARTED, {
            round: this.currentRound,
            startingPlayer: this.currentPlayer
        });
    }

    /**
     * 处理玩家出牌
     */
    playCards(playerId, cards) {
        if (!this.isGameActive) {
            console.warn('⚠️ 游戏未激活');
            return false;
        }

        const player = this.players.get(playerId);
        if (!player) {
            console.error(`❌ 玩家 ${playerId} 不存在`);
            return false;
        }

        try {
            // 验证出牌合法性
            if (this.rules && this.rules.validatePlay) {
                const isValid = this.rules.validatePlay(cards, this.getLastPlay(), player.cards);
                if (!isValid.valid) {
                    console.warn(`⚠️ 玩家 ${playerId} 出牌无效:`, isValid.message);
                    this.eventManager.emit(GAME_EVENTS.INVALID_PLAY, {
                        playerId,
                        cards,
                        reason: isValid.message
                    });
                    return false;
                }
            }

            // 执行出牌
            this.executePlay(player, cards);

            console.log(`🎯 玩家 ${player.name} 出牌:`, cards.map(c => c.display));

            // 触发出牌事件
            this.eventManager.emit(GAME_EVENTS.CARDS_PLAYED, {
                playerId,
                cards: [...cards],
                playType: this.rules.getCardType(cards)
            });

            // 切换到下一个玩家
            this.nextTurn();

            return true;

        } catch (error) {
            console.error(`❌ 玩家 ${playerId} 出牌失败:`, error);
            this.eventManager.emit(GAME_EVENTS.ERROR, {
                playerId,
                error: error.message,
                action: 'playCards'
            });
            return false;
        }
    }

    /**
     * 执行出牌逻辑
     */
    executePlay(player, cards) {
        // 从玩家手牌中移除
        cards.forEach(card => {
            const index = player.cards.findIndex(c =>
                c.id === card.id ||
                (c.suit === card.suit && c.rank === card.rank)
            );
            if (index !== -1) {
                player.cards.splice(index, 1);
            }
        });

        // 添加到弃牌堆
        this.discardPile.push({
            playerId: player.id,
            cards: [...cards],
            timestamp: Date.now()
        });

        // 更新玩家状态
        this.checkPlayerGameState(player);
    }

    /**
     * 玩家过牌
     */
    pass(playerId) {
        if (!this.isGameActive) {
            console.warn('⚠️ 游戏未激活');
            return false;
        }

        console.log(`⏭️ 玩家 ${this.players.get(playerId)?.name} 过牌`);

        // 增加连续过牌数
        this.consecutivePasses++;

        // 触发过牌事件
        this.eventManager.emit(GAME_EVENTS.PASS, {
            playerId,
            consecutivePasses: this.consecutivePasses
        });

        // 切换到下一个玩家
        this.nextTurn();

        return true;
    }

    /**
     * 切换到下一个玩家
     */
    nextTurn() {
        const currentIndex = this.playerOrder.indexOf(this.currentPlayer);
        const nextIndex = (currentIndex + 1) % this.playerOrder.length;
        this.currentPlayer = this.playerOrder[nextIndex];

        // 检查是否所有玩家都过牌了
        if (this.consecutivePasses >= this.players.size - 1) {
            this.startNewRound();
        }

        // 触发回合切换事件
        this.eventManager.emit(GAME_EVENTS.TURN_CHANGED, {
            currentPlayer: this.currentPlayer,
            nextPlayer: this.players.get(this.currentPlayer)
        });
    }

    /**
     * 开始新一轮
     */
    startNewRound() {
        this.consecutivePasses = 0;
        this.discardPile = [];

        console.log(`🔄 开始第 ${this.currentRound + 1} 轮`);

        // 触发新轮事件
        this.eventManager.emit(GAME_EVENTS.NEW_ROUND, {
            round: this.currentRound,
            startingPlayer: this.currentPlayer
        });
    }

    /**
     * 检查玩家游戏状态
     */
    checkPlayerGameState(player) {
        // 检查玩家是否还有牌
        const hasCards = player.cards.length > 0;

        if (!hasCards) {
            this.endGameForPlayer(player);
        }

        return hasCards;
    }

    /**
     * 玩家游戏结束
     */
    endGameForPlayer(player) {
        player.isActive = false;
        this.eventManager.emit(GAME_EVENTS.PLAYER_FINISHED, {
            playerId: player.id,
            cards: player.cards.length
        });

        // 检查是否只剩下一个玩家
        const activePlayers = Array.from(this.players.values()).filter(p => p.isActive);
        if (activePlayers.length <= 1) {
            this.endGame();
        }
    }

    /**
     * 游戏结束
     */
    endGame() {
        this.isGameActive = false;
        this.gameState.setPhase(GAME_PHASES.FINISHED);

        console.log('🏁 游戏结束！');

        // 计算最终分数
        const scores = this.calculateFinalScores();

        // 触发游戏结束事件
        this.eventManager.emit(GAME_EVENTS.GAME_ENDED, {
            winner: this.determineWinner(scores),
            scores,
            rounds: this.currentRound
        });
    }

    /**
     * 获取最后出牌
     */
    getLastPlay() {
        return this.discardPile.length > 0 ?
            this.discardPile[this.discardPile.length - 1].cards :
            null;
    }

    /**
     * 计算最终分数
     */
    calculateFinalScores() {
        const scores = new Map();

        for (const player of this.players.values()) {
            scores.set(player.id, {
                score: player.score,
                cardsLeft: player.cards.length,
                team: player.team
            });
        }

        return scores;
    }

    /**
     * 确定获胜者
     */
    determineWinner(scores) {
        const teamAScores = Array.from(scores.values())
            .filter(s => s.team === 'A')
            .reduce((sum, s) => sum + s.score, 0);

        const teamBScores = Array.from(scores.values())
            .filter(s => s.team === 'B')
            .reduce((sum, s) => sum + s.score, 0);

        return teamAScores > teamBScores ? 'A' : 'B';
    }

    /**
     * 设置UI组件引用
     */
    setUI(uiComponents) {
        this.ui = uiComponents;
        console.log('🎨 UI组件已设置');
    }

    /**
     * 获取游戏状态
     */
    getState() {
        return {
            gamePhase: this.gameState.getPhase(),
            currentPlayer: this.currentPlayer,
            players: Array.from(this.players.values()),
            round: this.currentRound,
            isGameActive: this.isGameActive,
            deckSize: this.deck.length,
            config: this.config
        };
    }

    /**
     * 获取玩家信息
     */
    getPlayer(playerId) {
        return this.players.get(playerId);
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer() {
        return this.players.get(this.currentPlayer);
    }

    /**
     * 重置游戏
     */
    reset() {
        this.players.clear();
        this.playerOrder = [];
        this.currentPlayer = null;
        this.deck = null;
        this.discardPile = [];
        this.gameState.reset();
        this.consecutivePasses = 0;
        this.currentRound = 1;
        this.isGameActive = false;

        console.log('🔄 游戏已重置');
        this.eventManager.emit(GAME_EVENTS.GAME_RESET);
    }

    /**
     * 销毁游戏引擎
     */
    destroy() {
        this.players.clear();
        this.playerOrder = [];
        this.currentPlayer = null;
        this.deck = null;
        this.discardPile = [];
        this.gameState.reset();
        this.eventManager.removeAllListeners();
        this.isInitialized = false;
        this.isGameActive = false;

        console.log('💥 游戏引擎已销毁');
    }
}