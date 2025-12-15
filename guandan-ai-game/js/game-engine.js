/**
 * 🎮 掼蛋游戏引擎 - 重构后的模块化设计
 * 支持多种4人扑克游戏的可配置游戏引擎
 */

class GameEngine {
    constructor(rules) {
        // 安全地设置规则，避免ReferenceError
        try {
            this.rules = rules || (typeof GuandanRules !== 'undefined' ? GuandanRules : null);
        } catch (error) {
            console.warn('GuandanRules 未定义，使用默认规则');
            this.rules = rules || null;
        }

        // 初始化基本属性
        this.gameState = 'waiting';
        this.players = [];
        this.currentPlayer = null;
        this.deck = [];
        this.playerHands = {};
        this.currentTrick = [];
        this.scores = {};
        this.teams = {};
        this.round = 1;
        this.level = 2; // 默认从2级开始
        this.gameMode = 'standard';
        this.aiDifficulty = 'medium';
        this.turnTimer = 30;
        this.lastPlay = null;
        this.consecutivePasses = 0;

        // 组件容器
        this.playerManager = null;
        this.deckManager = null;
        this.ruleEngine = null;
        this.gameUI = null;
        this.aiPlayers = {};

        // 升级系统组件
        this.levelManager = null;
        this.gameRanking = null;
        this.upgradeRuleEngine = null;

        // 事件监听器
        this.eventListeners = new Map();

        console.log('✅ GameEngine 初始化完成');
        console.log(`游戏模式: ${this.gameMode}, 难度: ${this.aiDifficulty}, 等级: ${this.level}`);
    }

    /**
     * 游戏初始化别名方法 - 兼容HTML中的调用
     */
    async initializeGame() {
        return await this.init();
    }

    /**
     * 游戏主初始化流程
     */
    async init() {
        console.log('🚀 开始初始化掼蛋游戏...');

        try {
            // 1. 初始化游戏环境
            await this.initStandardEnvironment();

            // 2. 初始化组件
            await this.initializeComponents();

            // 3. 设置玩家
            this.setupPlayers();

            // 4. 初始化AI玩家
            this.initializeAIPlayers();

            // 5. 创建并洗牌
            this.createDeck();

            // 6. 发牌
            this.shuffleAndDeal();

            // 7. 初始化游戏UI（如果存在）
            if (this.gameUI) {
                await this.gameUI.initialize();
            }

            // 8. 设置游戏状态为准备就绪
            this.gameState = 'ready';

            // 9. 设置升级系统
            this.setupPlayerTeamMapping();

            console.log('🎯 游戏初始化完成!');
            console.log(`玩家数量: ${this.players.length}`);
            console.log(`牌堆大小: ${this.deck.length}`);
            console.log(`当前等级: ${this.level}`);
            if (this.levelManager) {
                console.log('升级系统已初始化');
            }

        } catch (error) {
            console.error('❌ 游戏初始化失败:', error);
            this.gameState = 'error';
            throw error;
        }
    }

    /**
     * 初始化标准游戏环境
     */
    async initStandardEnvironment() {
        console.log('🔧 初始化游戏环境...');

        // 测试环境检测
        const isTestEnvironment = window.location && (
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('test')
        );

        const isProductionEnvironment = window.location && (
            window.location.hostname !== 'localhost' &&
            window.location.hostname !== '127.0.0.1' &&
            !window.location.hostname.includes('test')
        );

        // 环境配置
        if (isTestEnvironment) {
            console.log('🧪 检测到测试环境');
            this.aiDifficulty = 'easy'; // 测试环境使用简单AI
            this.turnTimer = 60; // 测试环境延长思考时间
            this.enableDebugMode();
        } else if (isProductionEnvironment) {
            console.log('🚀 检测到生产环境');
            this.aiDifficulty = 'medium';
            this.turnTimer = 30;
            this.disableDebugMode();
        }

        // 浏览器兼容性检查
        this.checkBrowserCompatibility();

        // 设置全局错误处理
        this.setupGlobalErrorHandling();

        console.log('✅ 游戏环境初始化完成');
    }

    /**
     * 检查浏览器兼容性
     */
    checkBrowserCompatibility() {
        // 检查ES6支持
        const supportsClasses = (() => {
            try {
                eval('class Test {}');
                return true;
            } catch (e) {
                return false;
            }
        })();

        const features = {
            'ES6 Classes': supportsClasses,
            'Arrow Functions': (() => {}).toString().includes('=>'),
            'Promises': typeof Promise !== 'undefined',
            'Map': typeof Map !== 'undefined',
            'Set': typeof Set !== 'undefined'
        };

        const unsupported = Object.entries(features)
            .filter(([name, supported]) => !supported)
            .map(([name]) => name);

        if (unsupported.length > 0) {
            console.warn(`⚠️ 浏览器不支持: ${unsupported.join(', ')}`);
            console.warn('建议使用现代浏览器获得最佳体验');
        } else {
            console.log('✅ 浏览器兼容性检查通过');
        }
    }

    /**
     * 设置全局错误处理
     */
    setupGlobalErrorHandling() {
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise拒绝:', event.reason);
            event.preventDefault();
        });

        // 捕获全局错误
        window.addEventListener('error', (event) => {
            console.error('全局错误:', event.error);
            // 可以在这里添加错误上报逻辑
        });
    }

    /**
     * 初始化组件 - 使用快速检查和占位机制
     */
    async initializeComponents() {
        console.log('🔧 开始快速组件初始化...');

        // 向全局发送初始化开始事件
        this.sendProgress('组件初始化开始');

        // 快速检查所有组件，创建占位对象
        const components = [
            { name: 'PlayerManager', key: 'playerManager', timeout: 1000 },
            { name: 'DeckManager', key: 'deckManager', timeout: 1000 },
            { name: 'RuleEngine', key: 'ruleEngine', timeout: 1000 },
            { name: 'GameUI', key: 'gameUI', timeout: 1000 },
            { name: 'LevelManager', key: 'levelManager', timeout: 1000, isUpgradeSystem: true },
            { name: 'GameRanking', key: 'gameRanking', timeout: 1000, isUpgradeSystem: true },
            { name: 'UpgradeRuleEngine', key: 'upgradeRuleEngine', timeout: 1000, isUpgradeSystem: true }
        ];

        for (const component of components) {
            await this.initializeComponent(component);
        }

        console.log('✅ 组件初始化完成');
        this.sendProgress('组件初始化完成');
    }

    /**
     * 初始化单个组件
     */
    async initializeComponent({ name, key, timeout, isUpgradeSystem }) {
        try {
            this.sendProgress(`检查 ${name}...`);

            if (window[name]) {
                console.log(`✅ ${name} 已找到`);

                if (isUpgradeSystem) {
                    // 升级系统组件的特殊初始化
                    this.initializeUpgradeComponent(name, key);
                } else {
                    // 普通组件初始化
                    this[key] = new window[name](this);
                }

                console.log(`✅ ${name} 初始化完成`);
                this.sendProgress(`${name} 初始化完成`);
            } else {
                console.warn(`⚠️ ${name} 未找到，等待 ${timeout}ms...`);

                // 快速等待
                await this.waitForComponent(name, timeout);

                if (window[name]) {
                    if (isUpgradeSystem) {
                        this.initializeUpgradeComponent(name, key);
                    } else {
                        this[key] = new window[name](this);
                    }
                    console.log(`✅ ${name} 延迟加载成功`);
                    this.sendProgress(`${name} 延迟加载成功`);
                } else {
                    this[key] = this.createPlaceholderComponent(name);
                    console.log(`🔧 ${name} 使用占位组件`);
                    this.sendProgress(`${name} 使用占位组件`);
                }
            }
        } catch (error) {
            console.warn(`❌ ${name} 初始化失败: ${error.message}`);
            this[key] = this.createPlaceholderComponent(name);
            this.sendProgress(`${name} 创建占位组件`);
        }
    }

    /**
     * 初始化升级系统组件
     */
    initializeUpgradeComponent(name, key) {
        switch (name) {
            case 'LevelManager':
                this.levelManager = new window[name]();
                break;
            case 'GameRanking':
                this.gameRanking = new window[name]();
                break;
            case 'UpgradeRuleEngine':
                // UpgradeRuleEngine 依赖 LevelManager 和 GameRanking
                if (this.levelManager && this.gameRanking) {
                    this.upgradeRuleEngine = new window[name](this.levelManager, this.gameRanking);
                } else {
                    throw new Error('LevelManager 和 GameRanking 必须先初始化');
                }
                break;
            default:
                this[key] = new window[name](this);
        }

        // 如果所有升级系统组件都初始化完成，则设置事件绑定
        if (this.levelManager && this.gameRanking && this.upgradeRuleEngine) {
            this.bindUpgradeEvents();
        }
    }

    /**
     * 快速等待组件加载
     */
    async waitForComponent(componentName, maxWaitTime = 1000) {
        const startTime = Date.now();
        const checkInterval = 50; // 更快的检查间隔

        while (!window[componentName]) {
            if (Date.now() - startTime > maxWaitTime) {
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        return true;
    }

    /**
     * 创建占位组件
     */
    createPlaceholderComponent(name) {
        console.warn(`🔧 创建 ${name} 占位组件`);

        return {
            initialize: () => console.log(`🔧 ${name} 占位组件初始化`),
            start: () => console.log(`🔧 ${name} 占位组件启动`),
            update: () => console.log(`🔧 ${name} 占位组件更新`),
            reset: () => console.log(`🔧 ${name} 占位组件重置`)
        };
    }

    /**
     * 绑定升级系统事件
     */
    bindUpgradeEvents() {
        if (!this.upgradeRuleEngine) return;

        // 监听游戏结果
        this.upgradeRuleEngine.addEventListener('gameResult', (e) => {
            this.onGameResult(e.detail);
        });

        // 监听到达A关
        this.levelManager.addEventListener('reachAGate', (e) => {
            this.onReachAGate(e.detail);
        });

        // 监听A关失败
        this.levelManager.addEventListener('aGateFailed', (e) => {
            this.onAGateFailed(e.detail);
        });

        // 监听游戏胜利
        this.levelManager.addEventListener('gameWon', (e) => {
            this.onGameWon(e.detail);
        });

        console.log('✅ 升级系统事件绑定完成');
    }

    /**
     * 处理游戏结果
     */
    onGameResult(result) {
        console.log('游戏结果:', result);

        // 更新UI显示
        if (this.gameUI) {
            this.gameUI.showGameResult(result);
        }

        // 触发游戏结果事件
        this.emit('gameResult', result);

        // 检查游戏是否可以结束
        if (result.upgradeResult.gameWon) {
            this.endGame(result);
        }
    }

    /**
     * 处理到达A关
     */
    onReachAGate(detail) {
        console.log(`${detail.team} 队到达A关！`);

        if (this.gameUI) {
            this.gameUI.showMessage(`${detail.team === 'A' ? '己方' : '对方'}到达A关，需要双上才能通过！`, 'info');
        }

        this.emit('reachAGate', detail);
    }

    /**
     * 处理A关失败
     */
    onAGateFailed(detail) {
        console.log(`${detail.team} 队打A失败，退回J级（第${detail.attempts}次尝试）`);

        if (this.gameUI) {
            this.gameUI.showMessage(`${detail.team === 'A' ? '己方' : '对方'}打A失败，退回J级`, 'warning');
        }

        this.emit('aGateFailed', detail);
    }

    /**
     * 处理游戏胜利
     */
    onGameWon(detail) {
        console.log(`🎉 ${detail.team === 'A' ? '己方' : '对方'}赢得整场比赛！`);

        if (this.gameUI) {
            this.gameUI.showVictory(detail);
        }

        this.emit('gameWon', detail);
    }

    /**
     * 玩家出完牌时调用
     */
    onPlayerOut(playerPosition) {
        if (this.gameRanking) {
            const result = this.gameRanking.recordPlayerFinish(playerPosition);
            console.log(`玩家 ${playerPosition} 出完牌，当前排名:`, this.gameRanking.getCurrentStatus());
        }
    }

    /**
     * 发送进度信息
     */
    sendProgress(message) {
        // 发送给全局监听器
        window.dispatchEvent(new CustomEvent('gameProgress', {
            detail: { message, timestamp: Date.now() }
        }));

        // 如果有UI更新方法，调用它
        if (window.app && window.app.updateLoadingText) {
            window.app.updateLoadingText(message);
        }

        console.log(`📊 进度: ${message}`);
    }

    /**
     * 设置玩家
     */
    setupPlayers() {
        console.log('设置玩家...');

        // 使用PlayerManager初始化玩家
        if (this.playerManager) {
            try {
                this.playerManager.initializePlayers();
                this.players = this.playerManager.getAllPlayers();
                this.currentPlayer = this.playerManager.getCurrentPlayer();
                console.log('✓ 玩家设置完成');
            } catch (error) {
                console.warn('PlayerManager 初始化失败，使用默认玩家:', error);
                this.createDefaultPlayers();
            }
        } else {
            console.warn('PlayerManager未初始化，使用默认玩家');
            this.createDefaultPlayers();
        }

        // 初始化AI玩家
        this.initializeAIPlayers();
    }

    /**
     * 创建默认玩家
     */
    createDefaultPlayers() {
        console.log('创建默认玩家...');
        this.players = [
            { id: 'south', name: '您', position: 'south', isAI: false, team: 'A' },
            { id: 'north', name: '北家', position: 'north', isAI: true, team: 'A' },
            { id: 'east', name: '东家', position: 'east', isAI: true, team: 'B' },
            { id: 'west', name: '西家', position: 'west', isAI: true, team: 'B' }
        ];
        this.currentPlayer = this.players[0]; // 南家（用户）先手
        console.log('✅ 默认玩家创建完成');
    }

    /**
     * 初始化AI玩家
     */
    initializeAIPlayers() {
        console.log('初始化AI玩家...');
        const aiPlayers = this.players.filter(player => player.isAI);

        for (const player of aiPlayers) {
            this.aiPlayers[player.id] = new AIPlayer(player.id, this.aiDifficulty);
            this.aiPlayers[player.id].initialize(player);
            this.aiPlayers[player.id].setDifficulty(this.aiDifficulty);
        }

        console.log(`✓ 初始化了 ${aiPlayers.length} 个AI玩家`);
    }

    /**
     * 创建牌堆
     */
    createDeck() {
        console.log('创建牌堆...');

        if (this.deckManager && typeof this.deckManager.createDeck === 'function') {
            try {
                this.deck = this.deckManager.createDeck();
                console.log(`✓ 牌堆创建完成，共 ${this.deck.length} 张牌`);
            } catch (error) {
                console.warn('DeckManager 创建牌堆失败，使用默认牌堆:', error);
                this.deck = this.createDefaultDeck();
            }
        } else {
            console.warn('DeckManager 未初始化或未实现 createDeck，使用默认牌堆');
            this.deck = this.createDefaultDeck();
        }
    }

    /**
     * 创建默认牌堆
     */
    createDefaultDeck() {
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        const deck = [];

        // 创建基本牌
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push({
                    suit,
                    rank,
                    value: this.getCardValue(rank),
                    display: `${rank}${suit}`
                });
            }
        }

        // 添加大小王
        deck.push({ suit: '🃏', rank: '小王', value: 16, display: '🃏' });
        deck.push({ suit: '🃏', rank: '大王', value: 17, display: '🎭' });

        console.log(`✅ 默认牌堆创建完成，共 ${deck.length} 张牌`);
        return deck;
    }

    /**
     * 获取牌值
     */
    getCardValue(rank) {
        const valueMap = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11,
            'Q': 12, 'K': 13, 'A': 14, '2': 15
        };
        return valueMap[rank] || 0;
    }

    /**
     * 发牌
     */
    shuffleAndDeal() {
        console.log('开始发牌...');

        if (this.deckManager) {
            try {
                // 洗牌
                if (this.deckManager.shuffleDeck) {
                    this.deckManager.shuffleDeck();
                }

                // 发牌给每个玩家
                if (this.deckManager.dealCards) {
                    this.playerHands = this.deckManager.dealCards(this.players.length);
                    console.log('使用DeckManager发牌完成');
                } else {
                    console.warn('DeckManager.dealCards 方法不存在，使用默认发牌逻辑');
                    this.shuffleAndDealDefault();
                }
            } catch (error) {
                console.warn('DeckManager 发牌失败，使用默认发牌逻辑:', error);
                this.shuffleAndDealDefault();
            }
        } else {
            console.warn('DeckManager未初始化，使用默认发牌逻辑');
            this.shuffleAndDealDefault();
        }

        try {
            // 洗牌
            if (this.deckManager.shuffleDeck) {
                this.deckManager.shuffleDeck();
            }

            // 发牌给每个玩家
            if (this.deckManager.dealCards) {
                this.playerHands = this.deckManager.dealCards(this.players.length);
            } else {
                this.shuffleAndDealDefault();
            }
        } catch (error) {
            console.warn('DeckManager 发牌失败，使用默认发牌逻辑:', error);
            this.shuffleAndDealDefault();
        }
    }

    /**
     * 默认发牌逻辑
     */
    shuffleAndDealDefault() {
        console.log('使用默认发牌逻辑...');

        // 使用 this.deck 中的牌堆
        if (!this.deck || this.deck.length === 0) {
            console.warn('牌堆为空，重新创建');
            this.createDeck();
        }

        // 洗牌
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = this.deck[i];
            this.deck[i] = this.deck[j];
            this.deck[j] = temp;
        }

        // 简单发牌（每人27张）
        this.playerHands = [];
        const cardsPerPlayer = 27;

        for (let i = 0; i < this.players.length; i++) {
            const hand = this.deck.splice(0, cardsPerPlayer);
            this.playerHands.push(hand);
            console.log(`发给玩家${i} ${hand.length} 张牌`);
        }

        console.log(`✅ 发牌完成，剩余 ${this.deck.length} 张底牌`);
    }

    /**
     * 开始游戏
     */
    startGame() {
        console.log('🎮 开始游戏...');
        this.gameState = 'playing';

        // 通知所有玩家游戏开始
        this.players.forEach(player => {
            this.notifyPlayer(player.id, 'gameStart', {
                round: this.round,
                level: this.level,
                hand: this.playerHands[player.id]
            });

            // 直接更新UI显示手牌
            if (this.gameUI) {
                this.gameUI.updatePlayerHand(player.id, this.playerHands[player.id]);
            }
        });

        // 设置当前玩家
        this.currentPlayer = this.players[0];
        this.startTurn();
    }

    /**
     * 开始回合
     */
    startTurn() {
        console.log(`轮到 ${this.currentPlayer.name} 出牌`);

        // 如果是AI玩家，自动出牌
        if (this.currentPlayer.isAI) {
            setTimeout(() => {
                this.aiPlay();
            }, 1000);
        } else {
            // 通知UI轮到玩家出牌
            this.notifyUI('turnStart', {
                player: this.currentPlayer.id,
                timer: this.turnTimer
            });
        }
    }

    /**
     * AI出牌
     */
    aiPlay() {
        if (!this.currentPlayer.isAI || !this.aiPlayers[this.currentPlayer.id]) {
            return;
        }

        const aiPlayer = this.aiPlayers[this.currentPlayer.id];
        const hand = this.playerHands[this.currentPlayer.id];
        const play = aiPlayer.makeDecision(hand, this.currentTrick, this.lastPlay);

        if (play) {
            this.playCards(this.currentPlayer.id, play.cards, play.type);
        } else {
            this.pass(this.currentPlayer.id);
        }
    }

    /**
     * 玩家出牌
     */
    playCards(playerId, cards, type) {
        console.log(`${playerId} 出牌: ${cards.map(c => c.display).join(' ')}`);

        const player = this.getPlayerById(playerId);
        if (!player) {
            console.error('玩家不存在:', playerId);
            return;
        }

        // 从手牌中移除出的牌
        const hand = this.playerHands[playerId];
        cards.forEach(card => {
            const index = hand.findIndex(c =>
                c.suit === card.suit && c.rank === card.rank
            );
            if (index !== -1) {
                hand.splice(index, 1);
            }
        });

        // 检查玩家是否出完牌
        if (hand.length === 0) {
            console.log(`玩家 ${playerId} 出完所有牌！`);
            this.onPlayerOut(playerId);
        }

        // 添加到当前墩
        this.currentTrick.push({
            player: playerId,
            cards: cards,
            type: type
        });

        this.lastPlay = {
            player: playerId,
            cards: cards,
            type: type
        };

        this.consecutivePasses = 0;

        // 通知UI更新
        this.notifyUI('cardsPlayed', {
            player: playerId,
            cards: cards,
            type: type,
            remainingCards: hand.length
        });

        // 检查是否该回合结束
        if (this.currentTrick.length === this.players.length) {
            setTimeout(() => {
                this.endTrick();
            }, 1500);
        } else {
            this.nextTurn();
        }
    }

    /**
     * 玩家过牌
     */
    pass(playerId) {
        console.log(`${playerId} 选择过牌`);

        this.consecutivePasses++;

        // 通知UI更新
        this.notifyUI('playerPass', {
            player: playerId
        });

        // 检查是否所有其他玩家都过牌了
        if (this.consecutivePasses >= this.players.length - 1) {
            this.currentTrick = [];
            this.notifyUI('trickCleared', {
                lastPlay: this.lastPlay
            });
        }

        this.nextTurn();
    }

    /**
     * 结束墩
     */
    endTrick() {
        console.log('墩结束，判断赢家...');

        // 判断赢家
        const winner = this.determineTrickWinner(this.currentTrick);

        // 通知UI
        this.notifyUI('trickEnd', {
            winner: winner,
            trick: this.currentTrick
        });

        // 清空当前墩
        this.currentTrick = [];

        // 设置下一轮先手
        this.currentPlayer = this.getPlayerById(winner);

        setTimeout(() => {
            this.startTurn();
        }, 1000);
    }

    /**
     * 判断墩赢家
     */
    determineTrickWinner(trick) {
        // 简化版本：第一个出牌的玩家赢
        return trick[0].player;
    }

    /**
     * 下一回合
     */
    nextTurn() {
        const currentIndex = this.players.findIndex(p => p.id === this.currentPlayer.id);
        const nextIndex = (currentIndex + 1) % this.players.length;
        this.currentPlayer = this.players[nextIndex];

        this.startTurn();
    }

    /**
     * 获取玩家信息
     */
    getPlayerById(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    /**
     * 通知玩家
     */
    notifyPlayer(playerId, event, data) {
        // 这里可以实现玩家通知逻辑
        console.log(`通知玩家 ${playerId}: ${event}`, data);
    }

    /**
     * 通知UI
     */
    notifyUI(event, data) {
        if (this.gameUI && this.gameUI.update) {
            this.gameUI.update(event, data);
        }

        // 发送自定义事件
        window.dispatchEvent(new CustomEvent('gameUpdate', {
            detail: { event, data }
        }));
    }

    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(event, callback) {
        if (this.eventListeners.has(event)) {
            const callbacks = this.eventListeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理错误 (${event}):`, error);
                }
            });
        }
    }

    /**
     * 设置游戏等级
     */
    setLevel(level) {
        this.level = level;
        console.log(`游戏等级设置为: ${level}`);
    }

    /**
     * 获取游戏状态
     */
    getGameState() {
        return {
            gameState: this.gameState,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                position: p.position,
                isAI: p.isAI,
                team: p.team,
                cardCount: this.playerHands[p.id] ? this.playerHands[p.id].length : 0
            })),
            currentPlayer: this.currentPlayer ? this.currentPlayer.id : null,
            round: this.round,
            level: this.level,
            scores: this.scores,
            lastPlay: this.lastPlay,
            currentTrick: this.currentTrick
        };
    }

    /**
     * 结束游戏
     */
    endGame(result) {
        console.log('游戏结束:', result);
        this.gameState = 'ended';

        // 触发游戏结束事件
        this.emit('gameEnd', result);

        // 禁用UI控制
        if (this.gameUI) {
            this.gameUI.enableControls(false);
        }
    }

    /**
     * 重新开始游戏
     */
    restartGame() {
        console.log('重新开始游戏...');

        // 重置升级系统
        if (this.upgradeRuleEngine) {
            this.upgradeRuleEngine.reset();
        }

        // 重置游戏引擎
        this.resetGame();

        // 重新初始化
        this.init().then(() => {
            this.startGame();
        }).catch(error => {
            console.error('重新开始游戏失败:', error);
        });
    }

    /**
     * 重置游戏
     */
    resetGame() {
        console.log('重置游戏...');

        this.gameState = 'waiting';
        this.currentPlayer = null;
        this.deck = [];
        this.playerHands = {};
        this.currentTrick = [];
        this.lastPlay = null;
        this.consecutivePasses = 0;

        // 重置AI玩家
        Object.values(this.aiPlayers).forEach(ai => {
            if (ai.reset) {
                ai.reset();
            }
        });

        console.log('游戏已重置');
    }

    /**
     * 获取升级系统状态
     */
    getUpgradeSystemStatus() {
        if (!this.levelManager || !this.gameRanking) {
            return null;
        }

        return {
            teams: this.levelManager.getAllTeamStatus(),
            rankings: this.gameRanking.getCurrentStatus(),
            rules: this.upgradeRuleEngine ? this.upgradeRuleEngine.getUpgradeRules() : null
        };
    }

    /**
     * 设置初始玩家队伍映射到GameRanking
     */
    setupPlayerTeamMapping() {
        if (this.gameRanking && this.players) {
            const mapping = {};
            this.players.forEach(player => {
                mapping[player.id] = player.team;
            });
            this.gameRanking.setPlayerTeams(mapping);
            console.log('玩家队伍映射设置完成:', mapping);
        }
    }

    /**
     * 调试模式
     */
    enableDebugMode() {
        this.debugMode = true;
        console.log('🔧 调试模式已启用');

        // 添加调试方法
        this.debug = {
            getDeck: () => [...this.deck],
            getHands: () => ({...this.playerHands}),
            getCurrentPlayer: () => this.currentPlayer,
            getState: () => this.getGameState()
        };
    }

    /**
     * 关闭调试模式
     */
    disableDebugMode() {
        this.debugMode = false;
        delete this.debug;
        console.log('🔒 调试模式已关闭');
    }

    /**
     * 销毁游戏引擎
     */
    destroy() {
        console.log('销毁游戏引擎...');

        this.gameState = 'destroyed';
        this.eventListeners.clear();

        // 清理AI玩家
        Object.values(this.aiPlayers).forEach(ai => {
            if (ai.destroy) {
                ai.destroy();
            }
        });

        // 清理组件
        if (this.gameUI && this.gameUI.destroy) {
            this.gameUI.destroy();
        }

        console.log('游戏引擎已销毁');
    }
}

// 导出到全局
window.GameEngine = GameEngine;
console.log('✅ GameEngine 已设置为全局变量');

// AMD/CommonJS 支持（可选）
if (typeof define === 'function' && define.amd) {
    define(function() { return GameEngine; });
} else if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameEngine;
}