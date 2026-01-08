// 游戏状态管理（与原版保持一致）
        class GuandanGame {
            constructor() {
                this.players = {
                    // 标准方位：南-西-北-东（逆时针）
                    // 队伍分配：A队（己方）= 南北，B队（对方）= 东西
                    east: { id: 'player2', name: '东家AI', cards: [], team: 'B', isAI: true },
                    south: { id: 'player1', name: '南家(你)', cards: [], team: 'A', isAI: false },
                    west: { id: 'player3', name: '西家AI', cards: [], team: 'B', isAI: true },
                    north: { id: 'player4', name: '北家AI', cards: [], team: 'A', isAI: true }
                };

                // 排序模式
                this.sortMode = localStorage.getItem('guandan_sortMode') || 'rank'; // 'rank' 或 'pattern'

                // 首局通过翻牌决定首出玩家
                this.isFirstGame = true;
                this.currentPlayer = null; // 将在initializeGame中设置
                this.lastPlayer = null;
                this.currentRoundCards = [];
                this.selectedCards = [];
                this.gameState = 'waiting';
                this.playHistory = [];

                // 游戏结果跟踪
                this.lastGameLoser = null; // 上局末游玩家
                this.gameResults = []; // 游戏结果记录

                // 初始化规则引擎 - 使用新的官方规则引擎
                this.ruleEngine = new RuleEngine(this);
                this.gameEngine = this; // 设置gameEngine为自身
                this.rules = this.ruleEngine; // 保持兼容性
                this.lastPlay = null;

                // 轮次管理
                this.roundActive = false;
                this.roundPlayers = new Set();
                this.roundStartPlayer = null;
                // 记录本轮已经过牌的玩家
                this.roundPassedPlayers = new Set();

                // 游戏结束相关
                this.gameRankings = []; // 玩家排名 [头游, 二游, 三游, 末游]
                this.gameEnded = false;  // 游戏是否结束
                this.finishedPlayers = []; // 已完成游戏的玩家（按完成顺序）

                // 划选手牌功能
                this.brushSelectState = {
                    isSelecting: false,      // 是否正在划选
                    startTime: 0,           // 开始时间（用于判断是否为单击）
                    startX: 0,              // 开始X坐标
                    startY: 0,              // 开始Y坐标
                    selectedIds: new Set(), // 已划选的牌ID集合
                    processedIds: new Set() // 已处理ID集合（避免重复处理）
                };

                // 智能提示功能
                this.currentHintIndex = 0;        // 当前提示索引
                this.availableHints = [];          // 所有可用提示
                this.isHintMode = false;          // 提示模式状态
                this.lastHintTime = 0;            // 防止重复点击

                // L1 缓存层（两层过滤提示系统）
                this.hintCache = new Map();       // 提示缓存
                this.hintCacheStats = {
                    hits: 0,
                    misses: 0,
                    totalRequests: 0
                };

                // 升级机制（掼蛋从2级开始）
                this.teamAScore = 2;
                this.teamBScore = 2;
                this.currentLevel = 2;
                this.gameHistory = [];
                this.currentDealer = null;

                // AI记牌系统
                this.playedCards = []; // 已出的牌
                this.cardMemory = {
                    south: [], // 记录南家出的牌
                    west: [],  // 记录西家出的牌
                    north: [], // 记录北家出的牌
                    east: []   // 记录东家出的牌
                };

                // 倒计时配置
                this.countdownConfig = {
                    enabled: true,
                    duration: 20,  // 倒计时时长20秒
                    warningThreshold: 5,  // 最后5秒显示警告
                    autoPassOnTimeout: true
                };
                this.countdownTimers = { south: null, north: null, west: null, east: null };
                this.countdownTimeoutIds = { south: null, north: null, west: null, east: null }; // 倒计时结束后的timeout ID
                this.countdownRemaining = { south: 0, north: 0, west: 0, east: 0 };

                // 音频系统
                this.audioContext = null;

                // 设置规则引擎的初始级别
                if (this.ruleEngine) {
                    this.ruleEngine.setLevel(this.currentLevel);
                }

                // 初始化进贡系统
                this.tributeSystem = new TributeSystem(this);
                this.tributePanel = new TributePanel(this);

                // 初始化AI玩家管理器
                this.aiPlayers = {};
                // 注意：initializeAIPlayers 和 initializeGame 将在 ModuleLoader 中调用

                // 检测是否是真正的触摸设备（用于区分触摸屏和鼠标）
                this.isTouchDevice = this.detectTouchDevice();
            }

            // 检测是否是真正的触摸设备
            detectTouchDevice() {
                // 检查是否支持触摸事件且有触摸硬件
                const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                // 检查是否是移动设备（排除F12模拟器）
                const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                // 检查是否有触摸硬件
                const hasTouchHardware = navigator.maxTouchPoints > 0;

                // 只有真正的移动设备或支持触摸的设备才返回true
                // F12的响应式设计模式不会通过这个检测
                return hasTouchSupport && (isMobile || hasTouchHardware);
            }

            // 辅助函数：获取牌面显示内容
            getCardDisplay(card) {
                if (card.rank === '小王') {
                    return { rank: 'JOKER', suit: '', color: 'black', isJoker: true };
                } else if (card.rank === '大王') {
                    return { rank: 'JOKER', suit: '', color: 'red', isJoker: true };
                }

                // 检查是否为普通级牌（所有花色的当前级别牌）
                const isAnyLevelCard = this.gameEngine && this.gameEngine.ruleEngine &&
                                       this.gameEngine.ruleEngine.isAnyLevelCard(card);

                // 检查是否为逢人配（红桃级牌/万能牌）
                const isWildCard = this.gameEngine && this.gameEngine.ruleEngine &&
                                  this.gameEngine.ruleEngine.isWildCard(card);

                return {
                    rank: card.rank,
                    suit: card.suit,
                    color: card.isRed ? 'red' : 'black',
                    isJoker: false,
                    isLevelCard: isWildCard,      // 向后兼容
                    isAnyLevelCard: isAnyLevelCard, // 新增：普通级牌标识
                    isWildCard: isWildCard         // 新增：逢人配标识
                };
            }

            // 调试函数：检查级牌识别
            debugLevelCards() {
                console.log('=== 级牌识别调试 ===');
                console.log('当前级别:', this.currentLevel);
                console.log('规则引擎级别:', this.ruleEngine?.currentLevel);

                // 检查南家手牌中的级牌
                const southCards = this.players.south.cards;
                console.log('南家手牌数:', southCards.length);

                southCards.forEach(card => {
                    const isAnyLevelCard = this.ruleEngine.isAnyLevelCard(card);
                    const isWildCard = this.ruleEngine.isWildCard(card);
                    if (isAnyLevelCard || isWildCard) {
                        console.log(`级牌: ${card.suit}${card.rank}`, {
                            isAnyLevelCard,
                            isWildCard,
                            cardRank: card.rank,
                            cardRankType: typeof card.rank,
                            expectedRank: this.ruleEngine.currentLevel.toString()
                        });
                    }
                });

                // 检查DOM中的类名
                const cardElements = document.querySelectorAll('#southCards .player-card');
                console.log('DOM中牌元素数:', cardElements.length);
                cardElements.forEach((el, i) => {
                    if (el.classList.contains('level-rank') || el.classList.contains('wild-card')) {
                        console.log(`第${i}张牌的类名:`, el.className);
                    }
                });
            }

            initializeGame() {
                // 初始化战绩系统
                this.initRecordsSystem();

                // 停止所有倒计时
                this.stopAllCountdowns();

                console.log('[游戏初始化] 开始发牌...');
                this.dealCards();
                console.log('[游戏初始化] 发牌完成');

                // 为AI玩家设置手牌
                console.log('[游戏初始化] 设置AI手牌...');
                for (let position in this.players) {
                    if (this.players[position].isAI) {
                        const aiPlayer = this.getAIPlayer(this.players[position].id);
                        if (aiPlayer) {
                            aiPlayer.setHandCards(this.players[position].cards);
                            console.log(`[游戏初始化] ${position} AI手牌设置完成，${this.players[position].cards.length}张牌`);
                        }
                    }
                }

                // 默认隐藏操作按钮
                const btnsContainer = document.querySelector('.hand-action-buttons');
                if (btnsContainer) {
                    btnsContainer.classList.remove('buttons-visible');
                }

                // 决定首出玩家
            this.currentPlayer = this.determineFirstPlayer();
            console.log(`游戏初始化完成，首出玩家：${this.currentPlayer}`);

            // 初始化排序按钮显示
            const sortBtn = document.getElementById('sortBtn');
            if (sortBtn) {
                if (this.sortMode === 'pattern') {
                    sortBtn.innerHTML = '牌型';
                    sortBtn.title = '切换到点数排序';
                } else {
                    sortBtn.innerHTML = '点数';
                    sortBtn.title = '切换到牌型排序';
                }
            }

            this.gameState = 'playing';
            this.updateUI();

            // 启动首出玩家倒计时
            this.startCountdown(this.currentPlayer);

            // 如果首出玩家是AI，自动出牌
            if (this.players[this.currentPlayer].isAI) {
                console.log(`首出玩家 ${this.currentPlayer} 是AI，自动出牌`);
                setTimeout(() => this.aiAutoPlay(), 1500);
            }
        }

    dealCards() {
        console.log('[dealCards] 开始发牌，清空前检查手牌数量:');
        console.log(`  - 南家: ${this.players.south.cards.length}张`);
        console.log(`  - 西家: ${this.players.west.cards.length}张`);
        console.log(`  - 北家: ${this.players.north.cards.length}张`);
        console.log(`  - 东家: ${this.players.east.cards.length}张`);

        // 播放洗牌音效
        this.playSound('shuffle');

        // 创建牌组并分发
        const deck = this.createDeck();
        const positions = ['south', 'west', 'north', 'east']; // 按逆时针顺序发牌

        // 掼蛋规则：每人27张牌，总共108张
        const cardsPerPlayer = 27;

        console.log(`[发牌] 总牌数: ${deck.length}, 每人${cardsPerPlayer}张`);

        // 清空玩家手牌
        positions.forEach(pos => {
            this.players[pos].cards = [];
            console.log(`[发牌] 已清空${pos}的手牌`);
        });

          // 直接发牌，每人27张
        let cardIndex = 0;
        positions.forEach((pos) => {
            for (let i = 0; i < cardsPerPlayer; i++) {
                this.players[pos].cards.push(deck[cardIndex]);
                cardIndex++;
            }
            console.log(`${pos} 玩家获得 ${this.players[pos].cards.length} 张牌`);
        });

        // 验证总牌数
        const totalCards = Object.values(this.players).reduce((sum, p) => sum + p.cards.length, 0);
        console.log(`总共分配 ${totalCards} 张牌，使用了 ${cardIndex} 张牌`);

        // 验证每个玩家的牌数
        console.log(`[发牌验证] 南家(玩家)手牌数: ${this.players.south.cards.length}`);
        console.log(`[发牌验证] 西家(AI)手牌数: ${this.players.west.cards.length}`);
        console.log(`[发牌验证] 北家(AI)手牌数: ${this.players.north.cards.length}`);
        console.log(`[发牌验证] 东家(AI)手牌数: ${this.players.east.cards.length}`);

        // 对手牌进行排序（只对人类玩家）
        this.sortPlayerCards('south');
    }

    createDeck() {
        const suits = ['♠', '♥', '♦', '♣'];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
        const deck = [];
        let cardIdCounter = 0; // 用于生成唯一ID

        // 创建两副牌（掼蛋使用两副牌）
        for (let deckCount = 0; deckCount < 2; deckCount++) {
            for (let suit = 0; suit < 4; suit++) {
                for (let rank = 0; rank < 13; rank++) {
                    deck.push({
                        id: `card_${cardIdCounter++}`, // 添加唯一ID
                        suit: suits[suit],
                        rank: ranks[rank],
                        value: rank + 3,
                        isRed: suit === 1 || suit === 2,
                        deckId: deckCount + 1 // 标记来自哪副牌
                    });
                }
        }
    }

    // 添加大小王（两副牌各2张，共4张王牌）
    deck.push({
        id: `card_${cardIdCounter++}`,
        suit: 'joker',
        rank: '小王',
        value: 16,
        isRed: true,
        deckId: 1
    });
    deck.push({
        id: `card_${cardIdCounter++}`,
        suit: 'joker',
        rank: '小王',
        value: 16,
        isRed: true,
        deckId: 2
    });
    deck.push({
        id: `card_${cardIdCounter++}`,
        suit: 'joker',
        rank: '大王',
        value: 17,
        isRed: true,
        deckId: 1
    });
    deck.push({
        id: `card_${cardIdCounter++}`,
        suit: 'joker',
        rank: '大王',
        value: 17,
        isRed: true,
        deckId: 2
    });

    console.log(`[createDeck] 创建了 ${deck.length} 张牌，每张都有唯一ID`);
    return this.shuffleArray(deck);
}

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    updateUI() {
        this.updatePlayerCards();
        this.updatePlayArea();
        this.updateInfoBars();
        this.updateControlButtons();
        this.updateCardCountDisplay();
        // 同步选中状态
        this.syncSelectedState();
    }

    /**
     * 更新UI但不重新渲染玩家手牌
     */
    updateUINoPlayerCards() {
        this.updatePlayArea();
        this.updateInfoBars();
        this.updateControlButtons();
        // 同步选中状态
        this.syncSelectedState();
    }

    /**
     * 同步选中状态 - 确保DOM和selectedCards数组一致
     */
    syncSelectedState() {
        // 从DOM中查找所有选中元素
        const selectedElements = document.querySelectorAll('#southCards .player-card.selected');

        // 如果DOM和数组不一致，强制同步
        if (selectedElements.length !== this.selectedCards.length) {
            console.warn(`[syncSelectedState] 状态不一致！DOM选中${selectedElements.length}张，数组中有${this.selectedCards.length}张`);
            console.log(`[syncSelectedState] 选中元素列表:`, Array.from(selectedElements).map(el => {
                const index = parseInt(el.dataset.index);
                const card = this.players.south.cards[index];
                return card ? `${card.rank}${card.suit}` : '未知';
            }));

            // 清空selectedCards数组
            this.selectedCards = [];

            // 从DOM中重新构建selectedCards数组
            selectedElements.forEach(element => {
                const index = parseInt(element.dataset.index);
                const card = this.players.south.cards[index];
                if (card) {
                    this.selectedCards.push(card);
                }
            });

            console.log(`[syncSelectedState] 强制同步完成，恢复${this.selectedCards.length}张牌`);
        }
    }

    updatePlayerCards() {
        // 使用防抖机制，避免频繁更新
        if (this.updatePlayerCardsTimer) {
            clearTimeout(this.updatePlayerCardsTimer);
        }

        this.updatePlayerCardsTimer = setTimeout(() => {
            this._doUpdatePlayerCards();
        }, 50); // 50ms防抖
    }

    _doUpdatePlayerCards(forceUpdate = false) {
        // 更新AI玩家手牌显示（优化：只在数量变化时更新）
        ['north', 'west', 'east'].forEach(pos => {
            const cardCount = this.players[pos].cards.length;
            const container = document.getElementById(pos + 'Cards');
            const currentCount = container.children.length;

            // 只有在牌数发生变化时才更新
            if (currentCount !== cardCount) {
                container.innerHTML = '';

                // 显示牌背，数量与实际手牌数对应（最多显示5张）
                const displayCount = Math.min(cardCount, 5);
                for (let i = 0; i < displayCount; i++) {
                    const cardElement = document.createElement('div');
                    cardElement.className = 'ai-card-back';
                    cardElement.innerHTML = '🂠';
                    container.appendChild(cardElement);
                }
            }

            // 更新AI玩家牌数显示
            const countElement = document.getElementById(pos + 'Count');
            if (countElement && countElement.textContent !== cardCount.toString()) {
                countElement.textContent = cardCount;
            }
        });

        // 更新玩家手牌显示（使用DocumentFragment优化性能）
        const southCards = this.players.south.cards;
        const southContainer = document.getElementById('southCards');
        const currentCount = southContainer.children.length;

        // 强制更新或牌数发生变化时才完全重新渲染
        if (forceUpdate || currentCount !== southCards.length) {
            const fragment = document.createDocumentFragment();

                    southCards.forEach((card, index) => {
                        const cardElement = document.createElement('div');
                        const display = this.getCardDisplay(card);
                        cardElement.className = `player-card ${display.color}`;

                        // 添加级牌相关类名
                        if (display.isAnyLevelCard) {
                            cardElement.classList.add('level-rank');  // 普通级牌：淡黄色背景
                        }
                        if (display.isWildCard) {
                            cardElement.classList.add('wild-card');   // 逢人配：特殊标识
                        }

                        // 生成牌的HTML内容
                        let cardHTML = '<div class="card-content">';

                        if (display.isJoker) {
                            // 大小王的特殊显示
                            const jokerImageSrc = display.color === 'black'
                                ? 'assets/images/small-joker.png'
                                : 'assets/images/big-joker.png';
                            const jokerImageClass = display.color === 'black'
                                ? 'small-joker-image'
                                : 'big-joker-image';

                            cardHTML += `
                                <div class="card-top-left">
                                    <div class="card-rank joker-text">JOKER</div>
                                </div>
                                <div class="card-bottom-right">
                                    <div class="card-rank joker-text">JOKER</div>
                                </div>
                                <div class="joker-image-container">
                                    <img src="${jokerImageSrc}" class="joker-image ${jokerImageClass}" alt="${display.color === 'black' ? '小王' : '大王'}">
                                </div>
                            `;
                        } else {
                            // 普通牌的显示
                            cardHTML += `
                                <div class="card-top-left">
                                    <div class="card-rank" data-rank="${display.rank}">${display.rank}</div>
                                    <div class="card-suit">${display.suit}</div>
                                </div>
                                <div class="card-bottom-right">
                                    <div class="card-rank" data-rank="${display.rank}">${display.rank}</div>
                                    <div class="card-suit">${display.suit}</div>
                                </div>
                            `;

                            // 如果是逢人配，修改左上角显示为🔴标记
                            if (display.isWildCard) {
                                // 修改左上角，将花色替换为红色圆圈内的"配"标记
                                cardHTML = cardHTML.replace(
                                    /<div class="card-top-left">\s*<div class="card-rank">[^<]*<\/div>\s*<div class="card-suit">[^<]*<\/div>\s*<\/div>/g,
                                    `<div class="card-top-left">
                                        <div class="card-rank">${display.rank}</div>
                                        <div class="card-suit wild-card-indicator">配</div>
                                    </div>`
                                );
                            }
                        }

                        cardHTML += '</div>';
                        cardElement.innerHTML = cardHTML;

                        cardElement.style.setProperty('--card-index', index + 1);

                        // 添加划选需要的数据属性
                        cardElement.dataset.index = index;
                        // 强制使用唯一ID，确保相同点数和花色的牌也能区分
                        cardElement.dataset.cardId = card.id;
                        cardElement.dataset.selected = 'false';

                        // 确保新发的牌没有选中状态
                        cardElement.classList.remove('selected');

                        // 绑定事件（使用一次性绑定避免内存泄漏）
                        this._bindCardEvents(cardElement, card, index);

                        fragment.appendChild(cardElement);
                    });

                    // 一次性添加到DOM
                    southContainer.innerHTML = '';
                    southContainer.appendChild(fragment);

                    // 更新南方玩家剩余牌数
                    const southCountElement = document.getElementById('southCardCountDisplay');
                    if (southCountElement) {
                        southCountElement.textContent = southCards.length;
                    }

                    // 恢复选中状态（如果是强制更新）
                    if (forceUpdate) {
                        this.syncSelectedState();
                    }
                } else {
                    // 牌数没有变化，只更新选中状态
                    this.syncSelectedState();
                }
            }

            /**
             * 绑定卡片事件（避免重复绑定）
             */
            _bindCardEvents(cardElement, card, index) {
                // 移除onclick，改用addEventListener处理点击
                cardElement.addEventListener('click', (e) => {
                    // 如果是划选操作，不处理click事件
                    if (this.brushSelectState && this.brushSelectState.isSelecting) {
                        // 如果划选来自mousedown且没有移动，说明是单击，需要清理状态
                        if (this.brushSelectState.isFromMouseDown && !this.brushSelectState.hasMoved) {
                            console.log('[点击] 清理mousedown造成的划选状态');
                            // 清理状态，让正常点击可以继续
                            this.brushSelectState.isSelecting = false;
                        } else {
                            console.log('[点击] 忽略：划选进行中');
                            return;
                        }
                    }

                    // 直接处理单击
                    e.stopPropagation();
                    console.log('[点击] 处理单击事件');
                    this.selectCard(card, cardElement);
                });

                // 添加划选事件监听器（PC端）
                cardElement.addEventListener('mousedown', (e) => this.handleBrushStart(e, cardElement, card));
                cardElement.addEventListener('mouseenter', (e) => this.handleBrushEnter(e, cardElement, card));

                // 添加划选事件监听器（移动端）- 只在真正的触摸设备上添加
                if (this.isTouchDevice) {
                    cardElement.addEventListener('touchstart', (e) => this.handleBrushStart(e, cardElement, card), { passive: false });
                }
            }

            // ========== 排序相关方法 ==========

            /**
             * 切换排序模式
             */
            toggleSortMode() {
                // 记录切换前的模式
                const oldMode = this.sortMode;

                // 切换排序模式
                this.sortMode = this.sortMode === 'rank' ? 'pattern' : 'rank';
                localStorage.setItem('guandan_sortMode', this.sortMode);

                console.log(`[toggleSortMode] 模式切换: ${oldMode} -> ${this.sortMode}`);

                // 保存已选中的牌（使用唯一标识）
                const selectedCardIds = new Set();
                console.log(`[toggleSortMode] 保存前有${this.selectedCards.length}张选中牌`);
                this.selectedCards.forEach(card => {
                    // 强制使用唯一ID
                    if (!card.id) {
                        console.warn(`[toggleSortMode] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                        return;
                    }
                    selectedCardIds.add(card.id);
                    console.log(`[toggleSortMode] 保存牌: ${card.rank}${card.suit}, ID: ${card.id}`);
                });

                console.log(`[toggleSortMode] Set中有${selectedCardIds.size}张唯一牌`, Array.from(selectedCardIds));

                // 重新排序手牌
                this.sortPlayerCards('south');

                // 恢复选中状态（在UI更新后执行）
                setTimeout(() => {
                    // 先清空selectedCards数组
                    this.selectedCards = [];
                    const usedIds = new Set(); // 跟踪已使用的ID

                    document.querySelectorAll('#southCards .player-card').forEach((cardElement, index) => {
                        const card = this.players.south.cards[index];
                        if (!card) return;

                        // 强制使用唯一ID
                        if (!card.id) {
                            console.warn(`[toggleSortMode] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                            return;
                        }

                        // 检查是否应该选中这张牌，并且该ID未被使用过
                        if (selectedCardIds.has(card.id) && !usedIds.has(card.id)) {
                            // 标记此ID已使用
                            usedIds.add(card.id);

                            // 确保DOM有选中样式
                            if (!cardElement.classList.contains('selected')) {
                                cardElement.classList.add('selected');
                            }
                            // 添加到数组
                            this.selectedCards.push(card);
                            console.log(`[toggleSortMode] 恢复选中: ${card.rank}${card.suit} (ID: ${cardId})`);
                        } else {
                            // 确保DOM没有选中样式
                            if (cardElement.classList.contains('selected')) {
                                cardElement.classList.remove('selected');
                            }
                        }
                    });

                    console.log(`[toggleSortMode] 恢复完成，共${this.selectedCards.length}张牌`);

                    // 重新渲染玩家手牌以显示新的排序
                    this.updatePlayerCards();

                    // 在同一个setTimeout内更新按钮显示
                    const sortBtn = document.getElementById('sortBtn');
                    console.log('[toggleSortMode] 获取按钮元素:', sortBtn);
                    if (sortBtn) {
                        console.log(`[toggleSortMode] 当前sortMode: ${this.sortMode}`);
                        if (this.sortMode === 'pattern') {
                            sortBtn.innerHTML = '牌型';
                            sortBtn.title = '切换到点数排序';
                            console.log('[toggleSortMode] 按钮文字更新为: 牌型');
                        } else {
                            sortBtn.innerHTML = '点数';
                            sortBtn.title = '切换到牌型排序';
                            console.log('[toggleSortMode] 按钮文字更新为: 点数');
                        }
                        console.log('[toggleSortMode] 按钮innerHTML实际值:', sortBtn.innerHTML);
                    } else {
                        console.error('[toggleSortMode] 无法找到sortBtn元素');
                    }
                }, 50);

                // 显示提示
                const modeText = this.sortMode === 'pattern' ? '牌型' : '点数';
                const message = `已切换到${modeText}排序`;
                console.log('[toggleSortMode]', message);
                this.showMessage(message, 'info');
            }

            /**
             * 排序玩家手牌
             * @param {string} playerId - 玩家ID
             */
            sortPlayerCards(playerId) {
                const player = this.players[playerId];
                if (!player || player.isAI) return;

                if (this.sortMode === 'pattern') {
                    // 按牌型排序
                    player.cards = this.sortCardsByPattern(player.cards);
                } else {
                    // 按点数排序（默认）
                    player.cards.sort((a, b) => this.getRankValue(b.rank) - this.getRankValue(a.rank));
                }

                // 如果是排序人类玩家，强制更新UI
                if (playerId === 'south') {
                    this.forceUpdatePlayerCards();
                }
            }

            /**
             * 强制更新玩家手牌显示（用于排序后刷新）
             */
            forceUpdatePlayerCards() {
                const southContainer = document.getElementById('southCards');
                if (southContainer) {
                    // 清空防抖定时器，立即更新
                    if (this.updatePlayerCardsTimer) {
                        clearTimeout(this.updatePlayerCardsTimer);
                        this.updatePlayerCardsTimer = null;
                    }

                    // 立即重新渲染（强制更新）
                    this._doUpdatePlayerCards(true);
                }
            }

            /**
             * 按牌型排序手牌
             * @param {Array} cards - 手牌数组
             * @returns {Array} 排序后的手牌
             */
            sortCardsByPattern(cards) {
                // 牌型优先级（数值越大优先级越高）- 根据掼蛋规则从大到小排列
                const patternPriority = {
                    'king_bomb': 13,      // 天王炸（4张王）- 最大
                    'bomb_8': 12,         // 8炸
                    'bomb_7': 11,         // 7炸
                    'bomb_6': 10,         // 6炸
                    'straight_flush': 9,  // 同花顺 - 大于5炸和4炸
                    'bomb_5': 8,          // 5炸
                    'bomb_4': 7,          // 4炸
                    'airplane': 6,        // 钢板（连三）
                    'consecutive_pairs': 5, // 连对
                    'straight': 4,        // 顺子
                    'three_with_pair': 3, // 三带二
                    'triple': 2,          // 三张
                    'pair': 1,            // 对子
                    'single': 0           // 单张 - 最小
                };

                // 按牌值分组
                const rankGroups = {};
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                const groups = {
                    king_bomb: [],
                    bomb_8: [],
                    bomb_7: [],
                    bomb_6: [],
                    straight_flush: [],
                    bomb_5: [],
                    bomb_4: [],
                    airplane: [],
                    consecutive_pairs: [],
                    straight: [],
                    three_with_pair: [],
                    triple: [],
                    pair: [],
                    single: []
                };

                const usedCards = new Set();

                // 1. 识别天王炸（4张王）
                const jokers = cards.filter(card => card.suit === 'joker');
                if (jokers.length === 4) {
                    groups.king_bomb.push(jokers);
                    jokers.forEach(card => usedCards.add(card));
                }

                // 2. 识别同花顺（5张以上同花色连续）- 在炸弹之前识别，因为同花顺比4炸大
                const suitGroups = {};
                cards.forEach(card => {
                    if (!usedCards.has(card) && card.suit !== 'joker' && card.rank !== '2') {
                        if (!suitGroups[card.suit]) {
                            suitGroups[card.suit] = [];
                        }
                        suitGroups[card.suit].push(card);
                    }
                });

                for (let suit in suitGroups) {
                    const suitCards = suitGroups[suit];
                    suitCards.sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));

                    // 查找所有可能的同花顺
                    for (let i = 0; i <= suitCards.length - 5; i++) {
                        for (let length = 5; length <= suitCards.length - i; length++) {
                            const straight = suitCards.slice(i, i + length);
                            let isConsecutive = true;

                            for (let j = 1; j < straight.length; j++) {
                                if (this.getRankValue(straight[j].rank) !== this.getRankValue(straight[j-1].rank) + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }

                            if (isConsecutive && !straight.some(card => usedCards.has(card))) {
                                groups.straight_flush.push(straight);
                                straight.forEach(card => usedCards.add(card));
                                break; // 只取最长的同花顺
                            }
                        }
                    }
                }

                // 3. 识别炸弹（4张及以上同点数）- 在同花顺之后识别，优先级低于同花顺
                for (let rank in rankGroups) {
                    const count = rankGroups[rank].length;
                    if (count >= 4 && rank !== '小王' && rank !== '大王') {
                        const availableCards = rankGroups[rank].filter(card => !usedCards.has(card));
                        if (availableCards.length >= 4) {
                            const bomb = availableCards.slice(0, Math.min(availableCards.length, 8));

                            // 根据张数分类
                            if (availableCards.length >= 8) {
                                groups.bomb_8.push(bomb.slice(0, 8));
                            } else if (availableCards.length >= 7) {
                                groups.bomb_7.push(bomb.slice(0, 7));
                            } else if (availableCards.length >= 6) {
                                groups.bomb_6.push(bomb.slice(0, 6));
                            } else if (availableCards.length >= 5) {
                                groups.bomb_5.push(bomb.slice(0, 5));
                            } else {
                                groups.bomb_4.push(bomb.slice(0, 4));
                            }

                            bomb.slice(0, Math.min(availableCards.length, 8)).forEach(card => usedCards.add(card));
                        }
                    }
                }

                // 4. 识别连对（3对及以上连续对子）
                const pairs = [];
                for (let rank in rankGroups) {
                    if (rankGroups[rank].length >= 2) {
                        const availableCards = rankGroups[rank].filter(card => !usedCards.has(card));
                        if (availableCards.length >= 2) {
                            pairs.push({
                                rank: rank,
                                value: this.getRankValue(rank),
                                cards: availableCards.slice(0, 2)
                            });
                        }
                    }
                }

                // 检查是否有王对（大王+小王）
                // 重用之前定义的jokers数组，但需要先过滤已使用的牌
                const availableJokers = jokers.filter(card => !usedCards.has(card));
                if (availableJokers.length === 2) {
                    // 找到大王和小王，创建王对
                    const bigJoker = availableJokers.find(c => c.rank === '大王');
                    const smallJoker = availableJokers.find(c => c.rank === '小王');
                    if (bigJoker && smallJoker) {
                        pairs.unshift({
                            rank: '王对',
                            value: 999,  // 确保王对排在最前面
                            cards: [bigJoker, smallJoker]
                        });
                        // 标记已使用
                        usedCards.add(bigJoker);
                        usedCards.add(smallJoker);
                    }
                }

                pairs.sort((a, b) => b.value - a.value);

                // 查找连续的对子
                for (let i = 0; i <= pairs.length - 3; i++) {
                    let consecutivePairs = [pairs[i]];
                    let j = i + 1;

                    while (j < pairs.length && pairs[j].value === pairs[j-1].value - 1) {
                        consecutivePairs.push(pairs[j]);
                        j++;
                    }

                    if (consecutivePairs.length >= 3) {
                        const allPairs = consecutivePairs.flatMap(p => p.cards);
                        groups.consecutive_pairs.push(allPairs);
                        allPairs.forEach(card => usedCards.add(card));
                    }
                }

                // 5. 识别钢板（连三/飞机）
                const triples = [];
                for (let rank in rankGroups) {
                    if (rankGroups[rank].length >= 3) {
                        const availableCards = rankGroups[rank].filter(card => !usedCards.has(card));
                        if (availableCards.length >= 3) {
                            triples.push({
                                rank: rank,
                                value: this.getRankValue(rank),
                                cards: availableCards.slice(0, 3)
                            });
                        }
                    }
                }
                triples.sort((a, b) => b.value - a.value);

                // 查找连续的三张
                for (let i = 0; i <= triples.length - 2; i++) {
                    let consecutiveTriples = [triples[i]];
                    let j = i + 1;

                    while (j < triples.length && triples[j].value === triples[j-1].value - 1) {
                        consecutiveTriples.push(triples[j]);
                        j++;
                    }

                    if (consecutiveTriples.length >= 2) {
                        const allTriples = consecutiveTriples.flatMap(t => t.cards);
                        groups.airplane.push(allTriples);
                        allTriples.forEach(card => usedCards.add(card));
                    }
                }

                // 6. 识别顺子（5张及以上连续单牌）
                const nonJokerCards = cards.filter(card =>
                    !usedCards.has(card) &&
                    card.suit !== 'joker' &&
                    card.rank !== '2'
                );
                nonJokerCards.sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));

                for (let i = 0; i <= nonJokerCards.length - 5; i++) {
                    for (let length = 5; length <= nonJokerCards.length - i; length++) {
                        const straight = nonJokerCards.slice(i, i + length);
                        let isConsecutive = true;

                        for (let j = 1; j < straight.length; j++) {
                            if (this.getRankValue(straight[j].rank) !== this.getRankValue(straight[j-1].rank) + 1) {
                                isConsecutive = false;
                                break;
                            }
                        }

                        if (isConsecutive && !straight.some(card => usedCards.has(card))) {
                            groups.straight.push(straight);
                            straight.forEach(card => usedCards.add(card));
                            break;
                        }
                    }
                }

                // 7. 识别剩余的牌型
                for (let rank in rankGroups) {
                    const cards = rankGroups[rank];
                    const availableCards = cards.filter(card => !usedCards.has(card));

                    // 三带二
                    if (availableCards.length >= 3) {
                        const triple = availableCards.slice(0, 3);

                        // 查找其他牌作为带牌
                        const otherCards = availableCards.slice(3);
                        if (otherCards.length >= 2) {
                            const threeWithPair = [...triple, ...otherCards.slice(0, 2)];
                            groups.three_with_pair.push(threeWithPair);
                            triple.forEach(card => usedCards.add(card));
                            otherCards.slice(0, 2).forEach(card => usedCards.add(card));
                            continue;
                        }
                    }

                    // 三张
                    if (availableCards.length >= 3) {
                        groups.triple.push(availableCards.slice(0, 3));
                        availableCards.slice(0, 3).forEach(card => usedCards.add(card));
                    } else if (availableCards.length >= 2) {
                        groups.pair.push(availableCards.slice(0, 2));
                        availableCards.slice(0, 2).forEach(card => usedCards.add(card));
                    } else if (availableCards.length >= 1) {
                        groups.single.push(availableCards[0]);
                        usedCards.add(availableCards[0]);
                    }
                }

                // 按优先级排序并从大到小排列
                const sortedCards = [];
                const sortedTypes = Object.keys(groups).sort((a, b) => patternPriority[b] - patternPriority[a]);

                // 创建一个新的Set来检测重复
                const cardSet = new Set();

                sortedTypes.forEach(type => {
                    // 同牌型内按点数从大到小排序
                    groups[type].sort((a, b) => {
                        const aValue = Array.isArray(a) ? this.getRankValue(a[0].rank) : this.getRankValue(a.rank);
                        const bValue = Array.isArray(b) ? this.getRankValue(b[0].rank) : this.getRankValue(b.rank);
                        return bValue - aValue;
                    });

                    // 展开所有牌
                    groups[type].forEach(cards => {
                        if (Array.isArray(cards)) {
                            cards.forEach(card => {
                                // 强制使用唯一ID
                                if (!card.id) {
                                    console.warn(`[sortCardsByPattern] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                                    return;
                                }
                                if (!cardSet.has(card.id)) {
                                    sortedCards.push(card);
                                    cardSet.add(card.id);
                                } else {
                                    console.warn(`[sortCardsByPattern] 发现重复牌: ${card.rank}${card.suit}`);
                                }
                            });
                        } else {
                            // 强制使用唯一ID
                            if (!cards.id) {
                                console.warn(`[sortCardsByPattern] 牌缺少唯一ID: ${cards.rank}${cards.suit}`);
                                return;
                            }
                            if (!cardSet.has(cards.id)) {
                                sortedCards.push(cards);
                                cardSet.add(cards.id);
                            } else {
                                console.warn(`[sortCardsByPattern] 发现重复牌: ${cards.rank}${cards.suit}`);
                            }
                        }
                    });
                });

                console.log(`[sortCardsByPattern] 输入${cards.length}张牌，输出${sortedCards.length}张牌`);
                return sortedCards;
            }

            updatePlayArea() {
                // 清空中央区域
                ['northPlays', 'southPlays', 'westPlays', 'eastPlays'].forEach(id => {
                    const element = document.getElementById(id);
                    if (element) {
                        element.innerHTML = '';
                        element.classList.remove('latest-group');
                    }
                });

                // 隐藏中央状态（已有倒计时，不需要文字提示）
                const centerArea = document.getElementById('playAreaCenter');
                centerArea.style.display = 'none';

                // 按出牌位置分配到中央区域的各位置
                // 确保后出牌的玩家覆盖先出牌的玩家
                this.currentRoundCards.forEach((play, index) => {
                    if (play.cards.length === 0 || play.action === 'pass') {
                        return;
                    }

                    const positionElement = document.getElementById(play.player + 'Plays');
                    if (!positionElement) return;

                    // 最新出牌突出显示
                    if (index === this.currentRoundCards.length - 1) {
                        positionElement.classList.add('latest-group');
                    }

                    // 使用时间戳确保后出牌的z-index更高
                    const playTime = play.timestamp || Date.now();
                    const baseZIndex = 1000 + playTime;

                    // 创建牌元素
                    play.cards.forEach((card, cardIndex) => {
                        const cardElement = document.createElement('div');
                        const display = this.getCardDisplay(card);
                        cardElement.className = `player-card ${display.color}`;

                        // 添加级牌相关类名
                        if (display.isAnyLevelCard) {
                            cardElement.classList.add('level-rank');  // 普通级牌：淡黄色背景
                        }
                        if (display.isWildCard) {
                            cardElement.classList.add('wild-card');   // 逢人配：特殊标识
                        }

                        // 生成牌的HTML内容
                        let cardHTML = '<div class="card-content">';

                        if (display.isJoker) {
                            // 大小王的特殊显示
                            const jokerImageSrc = display.color === 'black'
                                ? 'assets/images/small-joker.png'
                                : 'assets/images/big-joker.png';
                            const jokerImageClass = display.color === 'black'
                                ? 'small-joker-image'
                                : 'big-joker-image';

                            cardHTML += `
                                <div class="card-top-left">
                                    <div class="card-rank joker-text">JOKER</div>
                                </div>
                                <div class="card-bottom-right">
                                    <div class="card-rank joker-text">JOKER</div>
                                </div>
                                <div class="joker-image-container">
                                    <img src="${jokerImageSrc}" class="joker-image ${jokerImageClass}" alt="${display.color === 'black' ? '小王' : '大王'}">
                                </div>
                            `;
                        } else {
                            // 普通牌的显示
                            cardHTML += `
                                <div class="card-top-left">
                                    <div class="card-rank" data-rank="${display.rank}">${display.rank}</div>
                                    <div class="card-suit">${display.suit}</div>
                                </div>
                                <div class="card-bottom-right">
                                    <div class="card-rank" data-rank="${display.rank}">${display.rank}</div>
                                    <div class="card-suit">${display.suit}</div>
                                </div>
                            `;

                            // 如果是逢人配，修改左上角显示为🔴标记
                            if (display.isWildCard) {
                                // 修改左上角，将花色替换为红色圆圈内的"配"标记
                                cardHTML = cardHTML.replace(
                                    /<div class="card-top-left">\s*<div class="card-rank">[^<]*<\/div>\s*<div class="card-suit">[^<]*<\/div>\s*<\/div>/g,
                                    `<div class="card-top-left">
                                        <div class="card-rank">${display.rank}</div>
                                        <div class="card-suit wild-card-indicator">配</div>
                                    </div>`
                                );
                            }
                        }

                        cardHTML += '</div>';
                        cardElement.innerHTML = cardHTML;

                        // 设置基于时间和牌序的z-index，确保后出牌覆盖先出牌
                        cardElement.style.zIndex = baseZIndex + cardIndex;
                        positionElement.appendChild(cardElement);
                    });
                });
            }

            updateInfoBars() {
                // 更新游戏状态
                const statusElement = document.getElementById('gameStatus');
                if (statusElement) {
                    statusElement.textContent = this.gameState === 'playing' ? '进行中' : '等待';
                }

                // 更新当前级数显示
                const levelElement = document.getElementById('level');
                if (levelElement) {
                    // 获取当前全局级数
                    const globalLevel = this.gameEngine ? this.gameEngine.level : 2;
                    // 转换为显示文本
                    const levelText = this.getLevelDisplayText(globalLevel);
                    levelElement.textContent = levelText;
                }
            }

            /**
             * 获取级数的显示文本
             */
            getLevelDisplayText(level) {
                const levelMap = {
                    2: '2级', 3: '3级', 4: '4级', 5: '5级',
                    6: '6级', 7: '7级', 8: '8级', 9: '9级', 10: '10级',
                    11: 'J级', 12: 'Q级', 13: 'K级', 14: 'A级'
                };
                return levelMap[level] || `${level}级`;
            }

            updateControlButtons() {
                const isPlayerTurn = this.currentPlayer === 'south' && this.gameState === 'playing';

                // 条件显示按钮容器 - 只在南方玩家回合显示
                const btnsContainer = document.querySelector('.hand-action-buttons');
                if (btnsContainer) {
                    if (isPlayerTurn) {
                        btnsContainer.classList.add('buttons-visible');
                    } else {
                        btnsContainer.classList.remove('buttons-visible');
                    }
                }

                // 主要游戏按钮
                const playBtn = document.getElementById('playBtn');
                const passBtn = document.getElementById('passBtn');
                const hintBtn = document.getElementById('hintBtn');
                // reportBtn已被移除，不再需要获取

                // 调试输出
                console.log(`[updateControlButtons] 出牌按钮状态检查:`);
                console.log(`  - currentPlayer: ${this.currentPlayer} (需要: south)`);
                console.log(`  - gameState: ${this.gameState} (需要: playing)`);
                console.log(`  - isPlayerTurn: ${isPlayerTurn}`);
                console.log(`  - selectedCards.length: ${this.selectedCards.length}`);

                // 检查选中的牌是否可以打出
                let canPlay = false;
                if (isPlayerTurn && this.selectedCards.length > 0) {
                    const lastPlay = this.getLastPlay();
                    canPlay = this.canBeatLastPlay(this.selectedCards, lastPlay);
                    console.log(`  - canPlay: ${canPlay} (选中的牌是否能打出)`);
                }

                // 检查是否必须出牌（首轮或最大）
                const lastPlay = this.getLastPlay();
                const mustPlay = !lastPlay || !lastPlay.cards || lastPlay.cards.length === 0;
                console.log(`  - mustPlay: ${mustPlay} (是否必须出牌: ${mustPlay ? '是' : '否'})`);

                // 安全地设置按钮属性（变量已在函数开头声明）
                if (playBtn) {
                    const shouldDisable = !isPlayerTurn || this.selectedCards.length === 0 || !canPlay;
                    playBtn.disabled = shouldDisable;
                    // 重置 pointerEvents 样式（如果按钮被启用）
                    if (!shouldDisable) {
                        playBtn.style.pointerEvents = '';
                    }
                    console.log(`  - playBtn.disabled: ${playBtn.disabled} (禁用原因: ${!isPlayerTurn ? '不是玩家回合' : this.selectedCards.length === 0 ? '没有选牌' : !canPlay ? '牌不合法' : '未知错误'})`);
                }

                if (passBtn) {
                    // 只有在不是玩家回合，或者必须出牌时，才禁用"不要"按钮
                    const shouldDisable = !isPlayerTurn || mustPlay;
                    passBtn.disabled = shouldDisable;
                    // 重置 pointerEvents 样式（如果按钮被启用）
                    if (!shouldDisable) {
                        passBtn.style.pointerEvents = '';
                    }
                    console.log(`  - passBtn.disabled: ${passBtn.disabled} (禁用原因: ${!isPlayerTurn ? '不是玩家回合' : mustPlay ? '必须出牌' : '未知错误'})`);
                }

                if (hintBtn) {
                    hintBtn.disabled = !isPlayerTurn;
                }

                // reportBtn已被移除，不再需要设置

                // 更新出牌按钮提示
                this.updatePlayButtonHint();

                // 更新按钮视觉状态
                if (window.uiEnhancements) {
                    [playBtn, passBtn, hintBtn].forEach(btn => {
                        if (btn) window.uiEnhancements.updateButtonState(btn);
                    });
                }

                // 高亮当前玩家
                if (window.uiEnhancements && window.uiEnhancements.highlightCurrentPlayer) {
                    window.uiEnhancements.highlightCurrentPlayer(this.currentPlayer);
                }
            }

            /**
             * 更新出牌按钮提示
             */
            updatePlayButtonHint() {
                const playBtn = document.getElementById('playBtn');
                if (!playBtn) return;

                if (this.selectedCards.length === 0) {
                    playBtn.innerHTML = '出牌';
                    playBtn.title = '请先选择要出的牌';
                    return;
                }

                // 获取选中牌的类型
                const cardType = this.getCardType(this.selectedCards);
                console.log('[updatePlayButtonHint] 选中牌:', this.selectedCards.map(c => c.rank + c.suit).join(','));
                console.log('[updatePlayButtonHint] cardType:', cardType);

                // 处理cardType和typeName
                let typeName = '未知牌型';
                if (cardType) {
                    typeName = this.getCardTypeName(cardType);
                    console.log('[updatePlayButtonHint] 牌型名称:', typeName);
                } else if (this.selectedCards.length === 1) {
                    typeName = '单张';
                }

                // canPlay 已经在 updateControlButtons 中计算过了，这里需要重新计算来显示正确的提示
                let canPlay = false;
                if (this.currentPlayer === 'south' && this.gameState === 'playing') {
                    const lastPlay = this.getLastPlay();
                    canPlay = this.canBeatLastPlay(this.selectedCards, lastPlay);
                    console.log(`[updatePlayButtonHint] 重新检查 canPlay: ${canPlay}`);
                }

                // 更新按钮文本和提示
                if (canPlay) {
                    playBtn.innerHTML = '出牌';
                    playBtn.title = `出${this.selectedCards.length}张${typeName}`;
                } else {
                    playBtn.innerHTML = '出牌';

                    // 获取上家出牌信息
                    const lastPlay = this.getLastPlay();
                    let reason = '不合法';
                    if (lastPlay && lastPlay.cards && lastPlay.cards.length > 0) {
                        const lastTypeName = this.getCardTypeName(this.getCardType(lastPlay.cards));
                        if (this.selectedCards.length === 1 && lastPlay.cards.length === 2) {
                            reason = '单张不能打对子';
                        } else if (this.selectedCards.length === 2 && lastPlay.cards.length === 1) {
                            reason = '对子不能打单张';
                        } else if (this.selectedCards.length !== lastPlay.cards.length) {
                            reason = `牌型不匹配（${this.selectedCards.length}张 vs ${lastPlay.cards.length}张）`;
                        } else {
                            reason = '点数不够大';
                        }
                    }

                    playBtn.title = `出${this.selectedCards.length}张${typeName}（${reason}）`;
                }
            }

            /**
             * 获取上一手牌
             */
            getLastPlay() {
                if (this.currentRoundCards.length === 0) return null;

                // 找到最后一次有效出牌（非pass）
                for (let i = this.currentRoundCards.length - 1; i >= 0; i--) {
                    const play = this.currentRoundCards[i];
                    if (play.cards && play.cards.length > 0) {
                        return {
                            cards: play.cards,
                            type: play.cardType || this.getCardType(play.cards)
                        };
                    }
                }
                return null;
            }

            /**
             * 检查是否能打过上一手牌
             */
            canBeatLastPlay(cards, lastPlay) {
                if (!lastPlay || !lastPlay.cards) {
                    // 首出，任何有效牌型都可以
                    return this.getCardType(cards) !== 'invalid';
                }

                // 使用规则引擎验证
                const validation = this.rules.validatePlay(cards, lastPlay, this.players.south.cards);
                return validation.valid;
            }

  
            selectCard(card, element) {
                if (this.currentPlayer !== 'south') return;

                // 首次点击时初始化音频
                this.initAudio();

                // 检查元素是否有selected类
                const wasSelected = element.classList.contains('selected');
                console.log(`[选择牌] 点击 ${card.rank}${card.suit}, DOM选中状态: ${wasSelected}`);

                // 同步状态：确保DOM和数组一致
                if (wasSelected && this.selectedCards.length === 0) {
                    // DOM显示选中但数组为空，说明是状态不一致
                    console.warn('[选择牌] 状态不一致！清除DOM选中状态');
                    element.classList.remove('selected');
                    return;
                }

                // 从selectedCards中查找这张牌
                console.log(`[选择牌] 查找牌 ${card.rank}${card.suit}, ID: ${card.id || '无'}`);
                console.log(`[选择牌] 当前selectedCards数组:`, this.selectedCards.map(c => `${c.rank}${c.suit}(${c.id || '无'})`));

                // 强制使用唯一ID查找
                if (!card.id) {
                    console.warn(`[选择牌] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                    return;
                }

                const index = this.selectedCards.findIndex(c => c.id === card.id);

                console.log(`[选择牌] 在数组中查找结果: index=${index}`);
                console.log(`[选择牌] wasSelected=${wasSelected}, 在数组中=${index !== -1}`);

                if (wasSelected) {
                    // 应该取消选中
                    if (index !== -1) {
                        // 从数组中移除
                        this.selectedCards.splice(index, 1);
                        element.classList.remove('selected');
                        console.log(`[选择牌] 取消选中: ${card.rank}${card.suit}, 剩余: ${this.selectedCards.length}张`);
                    } else {
                        // 数组中找不到，强制清除DOM状态
                        console.warn('[选择牌] 数组中找不到，清除DOM状态');
                        element.classList.remove('selected');
                    }
                } else {
                    // 应该选中
                    if (index === -1) {
                        // 先检查选中的牌是否能打过上家（如果上家有出牌）
                        const tempSelectedCards = [...this.selectedCards, card];
                        const lastPlay = this.getLastPlay();

                        if (lastPlay && lastPlay.cards && lastPlay.cards.length > 0) {
                            const validation = this.rules.validatePlay(tempSelectedCards, lastPlay, this.players.south.cards);
                            if (!validation.valid && this.selectedCards.length > 0) {
                                // 如果已经选了牌，再加一张牌就不合法，给出提示但不阻止选择
                                console.warn(`[选择牌] 警告：当前选择可能不合法 - ${validation.message}`);
                                // 可以在这里添加视觉提示，比如边框变红
                                element.style.borderColor = 'rgba(255, 100, 100, 0.5)';
                                setTimeout(() => {
                                    element.style.borderColor = '';
                                }, 500);
                            }
                        }

                        // 数组中确实没有，添加到数组
                        this.selectedCards.push(card);
                        element.classList.add('selected');
                        console.log(`[选择牌] 选中: ${card.rank}${card.suit}, 总计: ${this.selectedCards.length}张`);
                    } else {
                        // 数组中已存在，不应该发生
                        console.error('[选择牌] 逻辑错误：数组中已存在但DOM未选中');
                    }
                }

                // 使用requestAnimationFrame确保样式正确应用
                requestAnimationFrame(() => {
                    this.updateControlButtons();
                });
            }

            /**
             * 清空所有选中的牌
             */
            clearSelection() {
                console.log('[清空选择] 开始清空选择');
                console.log(`[清空选择] 清空前 - 数组中有${this.selectedCards.length}张牌`);

                // 移除所有选中牌的样式
                const selectedElements = document.querySelectorAll('.player-card.selected');
                console.log(`[清空选择] 找到${selectedElements.length}个选中元素`);

                selectedElements.forEach(el => {
                    el.classList.remove('selected');
                });

                // 清空选中牌数组
                this.selectedCards = [];

                // 再次检查是否还有残留
                const remainingSelected = document.querySelectorAll('.player-card.selected');
                if (remainingSelected.length > 0) {
                    console.warn(`[清空选择] 警告：仍有${remainingSelected.length}个选中元素残留`);
                    remainingSelected.forEach(el => el.classList.remove('selected'));
                }

                console.log('[清空选择] 清空完成');
                this.updateControlButtons();
            }

            // ========== 划选手牌功能 ==========

            /**
             * 开始划选
             */
            handleBrushStart(e, cardElement, card) {
                if (this.currentPlayer !== 'south') return;

                // 记录初始位置，但不立即preventDefault
                const touch = e.touches ? e.touches[0] : e;

                // 初始化划选状态
                this.brushSelectState.isSelecting = true;
                this.brushSelectState.startTime = Date.now();
                this.brushSelectState.startX = touch.clientX;
                this.brushSelectState.startY = touch.clientY;
                this.brushSelectState.selectedIds.clear();
                this.brushSelectState.processedIds.clear(); // 清空已处理ID集合
                this.brushSelectState.hasMoved = false; // 标记是否已移动
                this.brushSelectState.isFromMouseDown = true; // 标记来自mousedown

                console.log('[划选开始] mousedown触发');

                // 添加brushing类到手牌区域，禁用悬浮效果
                const handArea = document.getElementById('southCards');
                if (handArea) {
                    handArea.classList.add('brushing');
                    console.log('[划选开始] 添加brushing类，禁用悬浮');
                }

                // 延迟触发起始牌的处理，给click事件留出时间
                setTimeout(() => {
                    if (this.brushSelectState.isSelecting) {
                        this.handleBrushEnter(e, cardElement, card);
                    }
                }, 100);

                // 保存正确的this引用
                const self = this;

                // 添加全局监听器
                self.brushMouseMoveHandler = self.handleBrushMove.bind(self);
                self.brushMouseUpHandler = self.handleBrushEnd.bind(self);

                document.addEventListener('mousemove', self.brushMouseMoveHandler);
                document.addEventListener('mouseup', self.brushMouseUpHandler);

                // 只在真正的触摸设备上添加触摸事件
                if (this.isTouchDevice) {
                    document.addEventListener('touchmove', self.brushMouseMoveHandler);
                    document.addEventListener('touchend', self.brushMouseUpHandler);
                }
            }

            /**
             * 划选进入某张牌
             */
            handleBrushEnter(e, cardElement, card) {
                // 允许在没有划选状态时处理起始牌
                if (!this.brushSelectState.isSelecting && e.type !== 'mousedown') return;

                const cardId = cardElement.dataset.cardId;

                // 避免重复处理同一张牌
                if (this.brushSelectState.processedIds.has(cardId)) return;

                // 标记为已处理
                this.brushSelectState.processedIds.add(cardId);
                this.brushSelectState.selectedIds.add(cardId);

                // 添加临时划选样式
                cardElement.classList.add('brushing');

                // 切换选中状态：已选中的取消，未选中的选中
                if (this.isCardSelected(card)) {
                    // 如果已选中，则取消选中
                    this.selectCard(card, cardElement); // 再次调用会取消选中
                    cardElement.classList.add('unselecting'); // 添加取消选中的样式
                    // 播放取消选中音效
                    this.playSound('deselect');
                } else {
                    // 如果未选中，则选中它
                    this.selectCard(card, cardElement);

                    // 添加推拽感延迟效果
                    const delayClass = `delay-${this.brushSelectState.selectedIds.size % 6}`;
                    if (cardElement.classList.contains('selected')) {
                        cardElement.classList.add(delayClass);
                    }

                    // 播放选中音效
                    this.playSound('select');
                }

                // 短暂延迟后移除临时样式
                setTimeout(() => {
                    cardElement.classList.remove('brushing');
                    cardElement.classList.remove('unselecting');
                    // 移除延迟类
                    for (let i = 1; i <= 5; i++) {
                        cardElement.classList.remove(`delay-${i}`);
                    }
                }, 100);
            }

            /**
             * 划选过程中的鼠标移动
             */
            handleBrushMove(e) {
                if (!this.brushSelectState.isSelecting) return;

                const touch = e.touches ? e.touches[0] : e;

                // 检查是否移动了足够的距离
                const deltaX = Math.abs(touch.clientX - this.brushSelectState.startX);
                const deltaY = Math.abs(touch.clientY - this.brushSelectState.startY);
                const hasMoved = deltaX > 5 || deltaY > 5;

                if (hasMoved && !this.brushSelectState.hasMoved) {
                    // 第一次移动时阻止默认行为（防止滚动）
                    e.preventDefault();
                    this.brushSelectState.hasMoved = true;
                    console.log('[划选移动] 开始划选，阻止默认行为');
                }

                // 持续阻止默认行为（移动端）
                if (this.brushSelectState.hasMoved && e.touches) {
                    e.preventDefault();
                }

                if (this.brushSelectState.hasMoved) {
                    // 查找触摸位置的元素
                    const element = document.elementFromPoint(touch.clientX, touch.clientY);

                    if (element) {
                        // 检查是否是牌或牌的子元素
                        const cardElement = element.closest('.player-card');
                        if (cardElement) {
                            // 获取牌的ID
                            const cardId = cardElement.dataset.cardId;

                            // 通过事件处理来选中/取消选中
                            if (cardId && !this.brushSelectState.processedIds.has(cardId)) {
                                // 直接调用 handleBrushEnter
                                const card = this.players.south.cards.find(c =>
                                    c && c.id && c.id.toString() === cardId.toString()
                                );
                                if (card) {
                                    this.handleBrushEnter({ type: 'mouseenter' }, cardElement, card);
                                }
                            }
                        }
                    }
                }
            }

            /**
             * 结束划选
             */
            handleBrushEnd(e) {
                if (!this.brushSelectState.isSelecting) return;

                // 如果没有移动，说明是单击，不执行划选逻辑
                if (!this.brushSelectState.hasMoved) {
                    // 移除brushing类，恢复悬浮效果
                    const handArea = document.getElementById('southCards');
                    if (handArea) {
                        handArea.classList.remove('brushing');
                        console.log('[划选结束] 没有移动，移除brushing类');
                    }

                    // 清理状态
                    console.log('[划选结束] 没有移动，清理划选状态');
                    this.brushSelectState.isSelecting = false;
                    this.brushSelectState.isFromMouseDown = false;
                    return;
                }

                // 划选结束
                console.log(`[划选结束] 共处理了 ${this.brushSelectState.processedIds.size} 张牌`);

                // 移除brushing类，恢复悬浮效果
                const handArea = document.getElementById('southCards');
                if (handArea) {
                    handArea.classList.remove('brushing');
                    console.log('[划选结束] 移除brushing类，恢复悬浮');
                }

                // 清理状态
                this.brushSelectState.isSelecting = false;
                this.brushSelectState.isFromMouseDown = false;
                this.brushSelectState.selectedIds.clear();
                this.brushSelectState.processedIds.clear();
                console.log('[划选结束] 已清理划选状态');

                // 移除全局监听器
                if (this.brushMouseMoveHandler) {
                    document.removeEventListener('mousemove', this.brushMouseMoveHandler);
                    document.removeEventListener('mouseup', this.brushMouseUpHandler);

                    // 只在真正的触摸设备上移除触摸事件
                    if (this.isTouchDevice) {
                        document.removeEventListener('touchmove', this.brushMouseMoveHandler);
                        document.removeEventListener('touchend', this.brushMouseUpHandler);
                    }

                    // 清理引用
                    this.brushMouseMoveHandler = null;
                    this.brushMouseUpHandler = null;
                }
            }

            /**
             * 检查某张牌是否已被选中
             */
            isCardSelected(card) {
                // 强制使用唯一ID
                if (!card.id) {
                    console.warn(`[isCardSelected] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                    return false;
                }
                return this.selectedCards.some(c => c.id === card.id);
            }

            playCards(isAutoPlay = false) {
                // 防止重复点击 - 多重检查
                const now = Date.now();
                if (this.isPlayingCards) {
                    console.log('[出牌] 正在出牌中，忽略重复点击');
                    return;
                }
                // 防止极短时间内的重复点击（100ms内）
                if (this._lastPlayTime && now - this._lastPlayTime < 100) {
                    console.log('[出牌] 点击太快，忽略');
                    return;
                }
                this._lastPlayTime = now;

                if (this.selectedCards.length === 0) return;

                // 检查倒计时是否已结束（防止时间竞态）
                // 但如果是自动操作（倒计时超时触发），则允许通过
                if (this.currentPlayer === 'south' && this.countdownRemaining.south <= 0 && !isAutoPlay) {
                    this.showMessage('出牌时间已到，自动操作中...', 'warning');
                    this.playSound('error');
                    return;
                }

                // 设置出牌中标志（必须在所有检查之后）
                this.isPlayingCards = true;

                // 立即禁用出牌和过牌按钮（防止事件冒泡导致的重复触发）
                const playBtn = document.getElementById('playBtn');
                const passBtn = document.getElementById('passBtn');
                if (playBtn) {
                    playBtn.disabled = true;
                    playBtn.style.pointerEvents = 'none'; // 禁用鼠标事件
                }
                if (passBtn) {
                    passBtn.disabled = true;
                    passBtn.style.pointerEvents = 'none';
                }

                // 清除倒计时timeout（防止与倒计时结束后的自动操作冲突）
                if (this.countdownTimeoutIds.south) {
                    clearTimeout(this.countdownTimeoutIds.south);
                    this.countdownTimeoutIds.south = null;
                }

                // 获取上一手牌
                let lastPlay = null;
                if (this.currentRoundCards.length > 0) {
                    // 找到最后一次有效出牌（非pass）
                    for (let i = this.currentRoundCards.length - 1; i >= 0; i--) {
                        const play = this.currentRoundCards[i];
                        if (play.cards && play.cards.length > 0) {
                            lastPlay = {
                                cards: play.cards,
                                type: play.cardType || this.getCardType(play.cards)
                            };
                            break;
                        }
                    }
                }

                // 使用规则引擎验证出牌
                const validation = this.rules.validatePlay(
                    this.selectedCards,
                    lastPlay,
                    this.players.south.cards
                );

                if (!validation.valid) {
                    this.showMessage(validation.message, 'error');
                    // 播放错误音效
                    this.playSound('error');
                    // 重置出牌中标志和按钮状态
                    this.isPlayingCards = false;
                    const playBtn = document.getElementById('playBtn');
                    const passBtn = document.getElementById('passBtn');
                    if (playBtn && this.currentPlayer === 'south') {
                        playBtn.disabled = false;
                        playBtn.style.pointerEvents = '';
                    }
                    if (passBtn && this.currentPlayer === 'south') {
                        passBtn.disabled = false;
                        passBtn.style.pointerEvents = '';
                    }
                    this.updateControlButtons(); // 重新检查按钮状态
                    return;
                }

                // 添加出牌动画效果
                const cardsContainer = document.getElementById('southCards');

                // 为每张要出的牌添加飞行动画
                this.selectedCards.forEach((card, idx) => {
                    // 强制使用唯一ID查找DOM元素
                    if (!card.id) {
                        console.warn(`[出牌] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                        return;
                    }

                    const cardElement = cardsContainer.querySelector(`[data-card-id="${card.id}"]`);
                    if (cardElement) {
                        // 添加飞行动画类
                        cardElement.classList.add('flying-to-center');

                        // 延迟移除，让动画播放
                        setTimeout(() => {
                            // 使用唯一ID查找
                            const index = this.players.south.cards.findIndex(c => c.id === card.id);

                            if (index !== -1) {
                                console.log(`[出牌] 移除牌: ${card.rank}${card.suit} (ID: ${card.id || '未知'})`);
                                this.players.south.cards.splice(index, 1);
                            } else {
                                console.error(`[出牌错误] 找不到要移除的牌: ${card.rank}${card.suit}`);
                            }
                        }, 300 + idx * 100); // 依次延迟，形成连击效果
                    }
                });

                // 延迟执行后续操作，等待出牌动画完成
                const totalAnimationTime = 300 + this.selectedCards.length * 100;
                setTimeout(() => {
                    // 更新记牌系统
                    this.updateCardMemory('south', [...this.selectedCards]);

                    // 添加到当前轮次
                    this.currentRoundCards.push({
                        player: 'south',
                        cards: [...this.selectedCards],
                        cardType: validation.type,
                        timestamp: Date.now()
                    });

                    // 记录本轮出牌的玩家
                    this.roundPlayers.add('south');

                    // 播放音效
                    const cardType = validation.type;
                    if (cardType && cardType.type === 'bomb') {
                        this.playSound('bomb');
                    } else {
                        this.playSound('play');
                    }

                    this.selectedCards = [];

                    // 重置提示状态
                    this.isHintMode = false;
                    this.currentHintIndex = 0;
                    this.availableHints = [];

                    // 重置出牌中标志（在切换玩家前）
                    this.isPlayingCards = false;

                    // 切换到下一个玩家（会更新UI并处理倒计时）
                    this.switchToNextPlayer();

                    // 检查游戏是否结束
                    if (this.checkGameEnd()) {
                        return;
                    }
                }, totalAnimationTime + 200); // 额外200ms缓冲时间
            }

            passTurn(isAutoPlay = false) {
                // 防止重复点击
                const now = Date.now();
                if (this.isPlayingCards) {
                    console.log('[过牌] 正在操作中，忽略重复点击');
                    return;
                }
                // 防止极短时间内的重复点击（100ms内）
                if (this._lastPassTime && now - this._lastPassTime < 100) {
                    console.log('[过牌] 点击太快，忽略');
                    return;
                }
                this._lastPassTime = now;

                // 检查倒计时是否已结束（防止时间竞态）
                // 但如果是自动操作（倒计时超时触发），则允许通过
                if (this.currentPlayer === 'south' && this.countdownRemaining.south <= 0 && !isAutoPlay) {
                    this.showMessage('过牌时间已到，自动操作中...', 'warning');
                    this.playSound('error');
                    return;
                }

                // 设置操作中标志
                this.isPlayingCards = true;

                // 禁用出牌和过牌按钮（防止事件冒泡导致的重复触发）
                const playBtn = document.getElementById('playBtn');
                const passBtn = document.getElementById('passBtn');
                if (playBtn) {
                    playBtn.disabled = true;
                    playBtn.style.pointerEvents = 'none';
                }
                if (passBtn) {
                    passBtn.disabled = true;
                    passBtn.style.pointerEvents = 'none';
                }

                // 清除倒计时timeout（防止与倒计时结束后的自动操作冲突）
                if (this.countdownTimeoutIds.south) {
                    clearTimeout(this.countdownTimeoutIds.south);
                    this.countdownTimeoutIds.south = null;
                }

                // 清空选中的牌（包括移除DOM样式）
                this.clearSelection();

                // 重置提示状态
                this.isHintMode = false;
                this.currentHintIndex = 0;
                this.availableHints = [];

                // 记录pass操作
                this.currentRoundCards.push({
                    player: this.currentPlayer,
                    cards: [],
                    timestamp: Date.now(),
                    action: 'pass'
                });

                // 添加到已过牌玩家集合
                this.roundPassedPlayers.add(this.currentPlayer);
                console.log(`[轮次] ${this.currentPlayer} 过牌，本回合永久失去出牌权`);

                // 播放过牌音效
                this.playSound('pass');

                // 重置操作中标志
                this.isPlayingCards = false;

                this.switchToNextPlayer();
            }

            switchToNextPlayer() {
                // 安全检查：确保currentPlayer存在
                if (!this.currentPlayer) {
                    console.error('[switchToNextPlayer] 错误：currentPlayer为undefined');
                    // 尝试设置默认玩家
                    this.currentPlayer = 'south';
                }

                // 逆时针顺序：南 → 西 → 北 → 东
                const order = ['south', 'west', 'north', 'east'];
                const currentIndex = order.indexOf(this.currentPlayer);

                // 安全检查：确保当前玩家对象存在
                const currentPlayerObj = this.players[this.currentPlayer];
                if (!currentPlayerObj) {
                    console.error(`[switchToNextPlayer] 错误：找不到玩家对象 ${this.currentPlayer}`);
                    // 尝试找到第一个存在的玩家
                    for (let player of order) {
                        if (this.players[player]) {
                            this.currentPlayer = player;
                            break;
                        }
                    }
                    return;
                }

                // 注意：手牌为0的玩家不应该被添加到roundPassedPlayers
                // 他们会在activePlayers过滤时被自动排除
                // 轮次结束时会在第2155-2165行处理接风规则

                // 如果所有其他玩家都过牌了，清理桌面，新一轮开始
                const activePlayers = order.filter(p => {
                    const player = this.players[p];
                    return player && player.cards && player.cards.length > 0;
                });

                // 获取最后出牌的玩家
                const lastPlayPlayer = this.getLastPlayPlayer();

                console.log(`[switchToNextPlayer] 调试信息:`);
                console.log(`  - 当前玩家: ${this.currentPlayer}`);
                console.log(`  - 最后出牌者: ${lastPlayPlayer}`);
                console.log(`  - 活跃玩家: ${activePlayers.join(', ')}`);
                console.log(`  - 过牌玩家: ${Array.from(this.roundPassedPlayers).join(', ')}`);

                // *** 简化的轮次结束逻辑 ***
                // 轮次结束的触发条件：当所有其他活跃玩家都pass时，最后出牌者可以开始新一轮
                // 注意：不需要检查currentPlayer === lastPlayPlayer，因为currentPlayer会随着轮转而变化
                const otherActivePlayers = activePlayers.filter(p => p !== lastPlayPlayer);
                const allOtherActivePassed = otherActivePlayers.length > 0 &&
                    otherActivePlayers.every(p => this.roundPassedPlayers.has(p));

                // 判断是否应该触发轮次结束：所有其他活跃玩家都pass了
                const shouldEndRound = allOtherActivePassed;

                console.log(`  - 其他活跃玩家（排除最后出牌者）: ${otherActivePlayers.join(', ')}`);
                console.log(`  - 所有其他活跃玩家都pass: ${allOtherActivePassed}`);
                console.log(`  - 应该结束轮次: ${shouldEndRound}`);

                if (shouldEndRound) {
                    console.log('[轮次结束] ========== 轮次结束！清理桌面，新一轮开始 ==========');
                    // 先获取最后出牌的玩家，再清空轮次记录
                    const lastPlayer = this.getLastPlayPlayer();
                    console.log(`[轮次结束] 最后出牌者: ${lastPlayer}`);
                    console.log(`[轮次结束] 清空前currentRoundCards长度: ${this.currentRoundCards.length}`);
                    this.currentRoundCards = [];
                    console.log(`[轮次结束] 清空后currentRoundCards长度: ${this.currentRoundCards.length}`);

                    // 检查是否触发"接风"规则：最后出牌者手牌为0
                    if (lastPlayer) {
                        const lastPlayerCards = this.players[lastPlayer]?.cards?.length || 0;
                        if (lastPlayerCards === 0) {
                            // 接风：由最后出牌者的下家先出牌
                            const lastPlayerIndex = order.indexOf(lastPlayer);
                            const nextPlayerIndex = (lastPlayerIndex + 1) % 4;
                            this.currentPlayer = order[nextPlayerIndex];
                            console.log(`[接风] ${lastPlayer} 出完牌成为头游，下家 ${this.currentPlayer} 获得出牌权`);
                        } else {
                            // 常规：由最后出牌者继续出牌
                            this.currentPlayer = lastPlayer;
                            console.log(`[轮次结束] 由最后出牌者 ${this.currentPlayer} 继续出牌`);
                        }
                    }

                    // 如果找不到最后出牌的玩家，或选中的玩家没有牌，选择第一个活跃玩家
                    if (!this.currentPlayer || this.players[this.currentPlayer]?.cards?.length === 0) {
                        console.warn('[轮次结束] 找不到合适的玩家，选择第一个活跃玩家');
                        if (activePlayers.length > 0) {
                            this.currentPlayer = activePlayers[0];
                            console.log(`[轮次结束] 选择活跃玩家: ${this.currentPlayer}`);
                        } else {
                            console.error('[轮次结束] 没有活跃玩家，游戏可能已结束');
                            return;
                        }
                    }

                    this.roundPassedPlayers.clear(); // 清空过牌记录
                    this.updateUI();

                    // 停止所有倒计时
                    this.stopAllCountdowns();

                    // 启动下一个玩家的倒计时
                    if (this.currentPlayer === 'south') {
                        this.startCountdown('south');
                    } else {
                        console.log(`[轮次结束] ${this.currentPlayer} 获得出牌权`);
                        this.startCountdown(this.currentPlayer);
                        setTimeout(() => this.aiAutoPlay(), 1000);
                    }
                    return;
                }

                // 找到下一个可以出牌的玩家
                let nextPlayer = null;
                for (let i = 1; i <= 4; i++) {
                    const candidate = order[(currentIndex + i) % 4];
                    // 如果该玩家没有过牌且还有手牌，则可以作为下一个玩家
                    const candidatePlayer = this.players[candidate];
                    if (!this.roundPassedPlayers.has(candidate) &&
                        candidatePlayer &&
                        candidatePlayer.cards &&
                        candidatePlayer.cards.length > 0) {
                        nextPlayer = candidate;
                        break;
                    }
                }

                // 防止死循环
                if (!nextPlayer) {
                    console.error('[switchToNextPlayer] 错误：找不到下一个玩家，强制清理桌面');
                    this.currentRoundCards = [];
                    const lastPlayer = this.getLastPlayPlayer();

                    console.log(`[强制清理] lastPlayer=${lastPlayer}`);

                    // 检查是否触发"接风"规则
                    if (lastPlayer) {
                        const lastPlayerCards = this.players[lastPlayer]?.cards?.length || 0;
                        if (lastPlayerCards === 0) {
                            // 接风：由最后出牌者的下家先出牌
                            const lastPlayerIndex = order.indexOf(lastPlayer);
                            const nextPlayerIndex = (lastPlayerIndex + 1) % 4;
                            this.currentPlayer = order[nextPlayerIndex];
                            console.log(`[强制清理-接风] ${lastPlayer} 出完牌，下家 ${this.currentPlayer} 获得出牌权`);
                        } else {
                            this.currentPlayer = lastPlayer;
                            console.log(`[强制清理] 由最后出牌者 ${this.currentPlayer} 继续出牌`);
                        }
                    }

                    // 如果找不到最后出牌的玩家，或lastPlayer没有牌，选择第一个活跃玩家
                    if (!this.currentPlayer || this.players[this.currentPlayer]?.cards?.length === 0) {
                        const activePlayers = order.filter(p => this.players[p] && this.players[p].cards.length > 0);
                        if (activePlayers.length > 0) {
                            this.currentPlayer = activePlayers[0];
                            console.log(`[强制清理] 选择活跃玩家: ${this.currentPlayer}`);
                        } else {
                            console.error('[强制清理] 没有活跃玩家，游戏可能已结束');
                            return;
                        }
                    }

                    this.roundPassedPlayers.clear(); // 清空过牌记录
                    this.updateUI();

                    // 停止所有倒计时
                    this.stopAllCountdowns();

                    // 启动下一个玩家的倒计时
                    if (this.currentPlayer === 'south') {
                        this.startCountdown('south');
                    } else {
                        console.log(`[强制清理] ${this.currentPlayer} 获得出牌权`);
                        this.startCountdown(this.currentPlayer);
                        setTimeout(() => this.aiAutoPlay(), 1000);
                    }
                    return;
                }

                // 正常轮转到下一个玩家
                this.currentPlayer = nextPlayer;
                console.log(`\n[轮转] ${order[currentIndex]} → ${nextPlayer}`);

                // 先停止所有倒计时，再启动新的
                this.stopAllCountdowns();
                this.startCountdown(nextPlayer);

                // 如果切换到非南家玩家，重置提示状态
                if (nextPlayer !== 'south') {
                    this.isHintMode = false;
                    this.currentHintIndex = 0;
                    this.availableHints = [];
                }

                // 检查游戏是否结束
                if (this.checkGameEnd()) {
                    return;
                }

                // 检查是否需要自动过牌（针对南家）
                if (nextPlayer === 'south' && !this.players[nextPlayer].isAI) {
                    console.log(`[自动过牌检查] 切换到south，开始检查`);
                    console.log(`[自动过牌检查] 开始检查，currentPlayer=${this.currentPlayer}`);

                    // 获取当前桌面上最大的牌
                    let currentMaxPlay = null;
                    if (this.currentRoundCards.length > 0) {
                        let maxPlay = null;
                        let maxWeight = -1;

                        for (let play of this.currentRoundCards) {
                            if (play.cards && play.cards.length > 0) {
                                const playType = play.cardType || this.getCardType(play.cards);
                                if (playType && playType.weight > maxWeight) {
                                    maxWeight = playType.weight;
                                    maxPlay = {
                                        cards: play.cards,
                                        type: playType,
                                        player: play.player
                                    };
                                }
                            }
                        }
                        currentMaxPlay = maxPlay;
                    }

                    console.log(`[自动过牌检查] currentMaxPlay=${currentMaxPlay ? currentMaxPlay.cards.map(c => c.rank).join(',') : 'null'}`);

                    // 如果有桌面上的牌，检查南家是否能管住
                    if (currentMaxPlay) {
                        const possiblePlays = this.findAllPossiblePlays(this.players.south.cards, currentMaxPlay);
                        console.log(`[自动过牌检查] 南家手牌: ${this.players.south.cards.length}张`);
                        console.log(`[自动过牌检查] 当前最大牌: ${currentMaxPlay.cards.map(c => c.rank).join(',')}`);
                        console.log(`[自动过牌检查] 找到可能的出牌: ${possiblePlays.length}个`);

                        if (possiblePlays.length === 0) {
                            // 南家无法管住，自动过牌
                            console.log('[自动过牌] 南家无法管住，自动过牌');

                            // 延迟1秒后自动过牌
                            setTimeout(() => {
                                this.passTurn();
                            }, 1000);
                            return;
                        }
                    }
                }

                this.updateUI();

                // 只有AI玩家才自动出牌
                if (this.players[this.currentPlayer].isAI) {
                    console.log(`[switchToNextPlayer] ${this.currentPlayer} 是AI，准备自动出牌`);
                    // 随机思考时间，让AI更像真人
                    const thinkingTime = this.getRandomThinkingTime();
                    console.log(`[switchToNextPlayer] 思考时间: ${thinkingTime}ms`);
                    this.showAIThinking(this.currentPlayer);
                    setTimeout(() => {
                        console.log(`[switchToNextPlayer] 开始调用 aiAutoPlay`);
                        this.aiAutoPlay();
                    }, thinkingTime);
                } else {
                    console.log(`[switchToNextPlayer] ${this.currentPlayer} 不是AI，不需要自动出牌`);
                }
            }

            // 检查是否应该清理桌面
            shouldClearTable() {
                // 必须有出牌记录
                if (this.currentRoundCards.length === 0) return false;

                // 必须有至少一次有效出牌
                const hasValidPlay = this.currentRoundCards.some(play =>
                    play.cards && play.cards.length > 0
                );
                if (!hasValidPlay) return false;

                console.log(`[shouldClearTable] 当前轮次记录: ${this.currentRoundCards.map(p => `${p.player}: ${p.cards && p.cards.length > 0 ? p.cards.map(c => c.rank).join(',') : 'pass'}`).join(' | ')}`);

                // 检查最近的玩家是否都pass了
                // 找到最后一次有效出牌
                let lastValidPlayIndex = -1;
                for (let i = this.currentRoundCards.length - 1; i >= 0; i--) {
                    if (this.currentRoundCards[i].cards && this.currentRoundCards[i].cards.length > 0) {
                        lastValidPlayIndex = i;
                        break;
                    }
                }

                if (lastValidPlayIndex === -1) return false;

                const lastPlayPlayer = this.currentRoundCards[lastValidPlayIndex].player;
                console.log(`[shouldClearTable] 最后出牌玩家: ${lastPlayPlayer}, 索引: ${lastValidPlayIndex}`);

                // 检查最后出牌之后是否所有其他玩家都pass了
                const playersAfter = this.currentRoundCards.slice(lastValidPlayIndex + 1);
                console.log(`[shouldClearTable] 之后的操作: ${playersAfter.map(p => p.player).join(', ')}`);

                const order = ['south', 'west', 'north', 'east'];
                const lastPlayerIndex = order.indexOf(lastPlayPlayer);

                // 其他3个玩家都必须pass
                for (let i = 1; i <= 3; i++) {
                    const nextPlayerIndex = (lastPlayerIndex + i) % 4;
                    const nextPlayer = order[nextPlayerIndex];
                    console.log(`[shouldClearTable] 检查玩家 ${nextPlayer}...`);

                    // 检查该玩家是否pass
                    const playerPlay = playersAfter.find(p => p.player === nextPlayer);
                    // 修复：检查action是否为pass，或者cards为空数组
                    if (!playerPlay || (!playerPlay.action && playerPlay.cards && playerPlay.cards.length > 0)) {
                        console.log(`[shouldClearTable] 玩家 ${nextPlayer} 没有pass或出了牌，不清桌`);
                        return false; // 该玩家没有pass或出了牌
                    } else {
                        console.log(`[shouldClearTable] 玩家 ${nextPlayer} 已pass`);
                    }
                }

                console.log(`[shouldClearTable] 所有玩家都pass，清理桌面`);
                return true;
            }

            // 获取最后出牌的玩家
            getLastPlayPlayer() {
                for (let i = this.currentRoundCards.length - 1; i >= 0; i--) {
                    const play = this.currentRoundCards[i];
                    if (play.cards && play.cards.length > 0) {
                        return play.player;
                    }
                }
                return null;
            }

            async aiAutoPlay() {
                if (this.gameState !== 'playing') return;

                // 停止当前玩家的倒计时（AI开始出牌）
                this.stopCountdown(this.currentPlayer);

                // 安全检查：确保currentPlayer存在
                if (!this.currentPlayer || !this.players[this.currentPlayer]) {
                    console.error('[aiAutoPlay] 错误：currentPlayer无效', {
                        currentPlayer: this.currentPlayer,
                        players: Object.keys(this.players)
                    });
                    // 尝试找到下一个有效的玩家
                    this.switchToNextPlayer();
                    return;
                }

                // 清除思考状态
                this.clearAIThinking(this.currentPlayer);

                const currentPlayer = this.players[this.currentPlayer];
                if (!currentPlayer || !currentPlayer.cards) {
                    console.error('[aiAutoPlay] 错误：currentPlayer或cards无效', currentPlayer);
                    this.switchToNextPlayer();
                    return;
                }

                console.log("\n[AI决策] === " + this.currentPlayer + " 轮到我 ===");
                console.log("手牌: " + currentPlayer.cards.length + "张");

                try {
                    // 使用模块化的AI玩家系统
                    const aiPlayer = this.getAIPlayer(currentPlayer.id);
                    if (aiPlayer) {
                        console.log(`[AI] 使用模块化AI: ${aiPlayer.constructor.name}`);

                        // 设置AI手牌
                        aiPlayer.setHandCards(currentPlayer.cards);

                        // 获取上一次出牌
                        const lastPlay = this.getLastPlay();

                        // 直接使用简单AI策略，确保AI一定会出牌
                        console.log(`[AI] 使用简单AI策略`);
                        this.simpleAIPlay(currentPlayer);
                        return;
                    } else {
                        console.log(`[AI] 找不到AI实例，使用简化逻辑`);
                        // 降级到简化AI逻辑
                        this.simpleAIPlay(currentPlayer);
                    }
                } catch (error) {
                    console.error(`[AI] 决策出错:`, error);
                    // 出错或超时时使用简化AI逻辑
                    this.simpleAIPlay(currentPlayer);
                }
            }

            /**
             * 简化版AI出牌逻辑
             */
            simpleAIPlay(currentPlayer) {
                console.log(`[简单AI] ${this.currentPlayer} 轮到我，手牌: ${currentPlayer.cards.length}张`);
                console.log(`[简单AI] 手牌内容:`, currentPlayer.cards.map(c => c.rank + c.suit).join(','));

                // 获取上一次出牌
                const lastPlay = this.getLastPlay();
                console.log(`[简单AI] 上家出牌:`, lastPlay ? lastPlay.cards.map(c => c.rank + c.suit).join(',') : '无');

                // 如果是首出，出最小的单张
                if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
                    console.log(`[简单AI] 首出，出最小的单张`);
                    if (currentPlayer.cards && currentPlayer.cards.length > 0) {
                        // 找最小的牌（2是最小，A是最大）
                        let smallestCard = currentPlayer.cards[0];
                        const valueMap = {
                            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
                            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 2, '小王': 102, '大王': 103
                        };
                        for (let card of currentPlayer.cards) {
                            if ((valueMap[card.rank] || 0) < (valueMap[smallestCard.rank] || 0)) {
                                smallestCard = card;
                            }
                        }
                        console.log(`[简单AI] 出最小牌: ${smallestCard.rank}${smallestCard.suit}`);
                        this.playAICardWithDecision(currentPlayer, [smallestCard], { type: 'single' });
                        return;
                    }
                }

                // 跟牌：必须遵循牌型匹配规则
                if (lastPlay && lastPlay.cards && lastPlay.cards.length > 0) {
                    const lastType = this.gameEngine.ruleEngine.getCardType(lastPlay.cards);
                    console.log(`[简单AI] 上家出牌型:`, lastType ? lastType.type : '未知');

                    if (!lastType) {
                        console.log(`[简单AI] 无法识别上家牌型，过牌`);
                        this.handlePass();
                        return;
                    }

                    // 单张对单张
                    if (lastType.type === 'single') {
                        // 找能打过的单张
                        for (let card of currentPlayer.cards) {
                            if (this.gameEngine.ruleEngine.canBeat([card], lastPlay.cards)) {
                                console.log(`[简单AI] 用 ${card.rank}${card.suit} 打过上家的单张`);
                                this.playAICardWithDecision(currentPlayer, [card], lastType);
                                return;
                            }
                        }
                        console.log(`[简单AI] 没有能打过的单张，过牌`);
                        this.handlePass();
                        return;
                    }

                    // 对子对对子
                    if (lastType.type === 'pair') {
                        // 找出所有的对子
                        const pairs = this.findPairs(currentPlayer.cards);
                        console.log(`[简单AI] 找到 ${pairs.length} 个对子`);

                        for (let pair of pairs) {
                            if (this.gameEngine.ruleEngine.canBeat(pair, lastPlay.cards)) {
                                console.log(`[简单AI] 用对子打过上家: ${pair.map(c => c.rank + c.suit).join(',')}`);
                                this.playAICardWithDecision(currentPlayer, pair, lastType);
                                return;
                            }
                        }
                        console.log(`[简单AI] 没有能打过的对子，过牌`);
                        this.handlePass();
                        return;
                    }

                    // 三张对三张
                    if (lastType.type === 'triple') {
                        // 找出所有的三张
                        const triples = this.findTriples(currentPlayer.cards);
                        console.log(`[简单AI] 找到 ${triples.length} 个三张`);

                        for (let triple of triples) {
                            if (this.gameEngine.ruleEngine.canBeat(triple, lastPlay.cards)) {
                                console.log(`[简单AI] 用三张打过上家: ${triple.map(c => c.rank + c.suit).join(',')}`);
                                this.playAICardWithDecision(currentPlayer, triple, lastType);
                                return;
                            }
                        }
                        console.log(`[简单AI] 没有能打过的三张，过牌`);
                        this.handlePass();
                        return;
                    }

                    // 炸弹可以打任何牌
                    if (this.hasBomb(currentPlayer.cards) && lastType.family !== 'bomb') {
                        const bomb = this.findSmallestBomb(currentPlayer.cards);
                        if (bomb && this.gameEngine.ruleEngine.canBeat(bomb, lastPlay.cards)) {
                            console.log(`[简单AI] 用炸弹打过上家: ${bomb.map(c => c.rank + c.suit).join(',')}`);
                            this.playAICardWithDecision(currentPlayer, bomb, { type: 'bomb', family: 'bomb' });
                            return;
                        }
                    }

                    // 对于其他复杂牌型，暂时过牌
                    console.log(`[简单AI] 上家出${lastType.type}，暂时过牌`);
                    this.handlePass();
                    return;
                }

                console.log(`[简单AI] 没有手牌可出`);
                this.handlePass();
                return;
            }

            /**
             * 查找对子
             */
            findPairs(cards) {
                const rankGroups = {};
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                const pairs = [];
                for (let rank in rankGroups) {
                    if (rankGroups[rank].length >= 2) {
                        pairs.push(rankGroups[rank].slice(0, 2));
                    }
                }
                return pairs;
            }

            /**
             * 查找三张
             */
            findTriples(cards) {
                const rankGroups = {};
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                const triples = [];
                for (let rank in rankGroups) {
                    if (rankGroups[rank].length >= 3) {
                        triples.push(rankGroups[rank].slice(0, 3));
                    }
                }
                return triples;
            }

            /**
             * 检查是否有炸弹
             */
            hasBomb(cards) {
                const rankGroups = {};
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                for (let rank in rankGroups) {
                    if (rankGroups[rank].length >= 4) {
                        return true;
                    }
                }
                return false;
            }

            /**
             * 查找最小的炸弹
             */
            findSmallestBomb(cards) {
                const rankGroups = {};
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                const valueMap = {
                    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
                    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 2, '小王': 102, '大王': 103
                };

                let smallestBomb = null;
                let minValue = 999;

                for (let rank in rankGroups) {
                    if (rankGroups[rank].length >= 4) {
                        const value = valueMap[rank] || 0;
                        if (value < minValue) {
                            minValue = value;
                            // 只返回前4张作为炸弹
                            smallestBomb = rankGroups[rank].slice(0, 4);
                        }
                    }
                }

                return smallestBomb;
            }

            /**
             * AI出牌（新版本，支持AI决策）
             */
            playAICardWithDecision(currentPlayer, cards, cardType) {
                // 移除出的牌
                cards.forEach(card => {
                    // 强制使用唯一ID查找
                    if (!card.id) {
                        console.warn(`[AI出牌] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                        return;
                    }

                    const index = currentPlayer.cards.findIndex(c => c.id === card.id);
                    if (index !== -1) {
                        currentPlayer.cards.splice(index, 1);
                    } else {
                        console.warn(`[AI出牌] 找不到牌: ${card.rank}${card.suit} (ID: ${card.id})`);
                    }
                });

                // 添加到当前轮次
                this.currentRoundCards.push({
                    player: this.currentPlayer,
                    cards: cards,
                    cardType: cardType,
                    timestamp: Date.now()
                });

                // 记录本轮出牌的玩家
                this.roundPlayers.add(this.currentPlayer);

                // 播放音效
                if (cardType && cardType.type === 'bomb') {
                    this.playSound('bomb');
                } else {
                    this.playSound('play');
                }

                console.log(`[AI] ${this.currentPlayer} 出牌: ${cards.map(c => c.rank + c.suit).join(',')}`);

                // 更新UI显示
                this.updateUI();

                // 检查游戏是否结束
                if (this.checkGameEnd()) {
                    return;
                }

                // 继续下一回合
                setTimeout(() => {
                    this.switchToNextPlayer();
                }, 1000);
            }

            /**
             * AI出牌（旧版本，保持兼容）
             */
            playAICard(currentPlayer, cards) {
                // 移除出的牌
                cards.forEach(card => {
                    // 强制使用唯一ID查找
                    if (!card.id) {
                        console.warn(`[AI出牌] 牌缺少唯一ID: ${card.rank}${card.suit}`);
                        return;
                    }

                    const index = currentPlayer.cards.findIndex(c => c.id === card.id);
                    if (index !== -1) {
                        currentPlayer.cards.splice(index, 1);
                    } else {
                        console.warn(`[AI出牌] 找不到牌: ${card.rank}${card.suit} (ID: ${card.id})`);
                    }
                });

                // 验证并出牌
                const validation = this.rules.validatePlay(cards, null, currentPlayer.cards);
                if (validation.valid) {
                    // 更新记牌系统
                    this.updateCardMemory(this.currentPlayer, cards);

                    // 添加到当前轮次
                    this.currentRoundCards.push({
                        player: this.currentPlayer,
                        cards: cards,
                        cardType: validation.type,
                        timestamp: Date.now()
                    });

                    // 记录本轮出牌的玩家
                    this.roundPlayers.add(this.currentPlayer);

                    // 播放音效
                    if (validation.type && validation.type.type === 'bomb') {
                        this.playSound('bomb');
                    } else {
                        this.playSound('play');
                    }

                    console.log(`[AI] ${this.currentPlayer} 出牌: ${cards.map(c => c.rank + c.suit).join(',')}`);

                    // 继续下一回合
                    setTimeout(() => {
                        this.switchToNextPlayer();
                    }, 1000);
                }
            }

            /**
             * 获取上一次出牌
             */
            getLastPlay() {
                if (this.currentRoundCards.length === 0) {
                    return null;
                }

                // 从后往前找，找到最后一次有效出牌
                for (let i = this.currentRoundCards.length - 1; i >= 0; i--) {
                    const play = this.currentRoundCards[i];
                    if (play.cards && play.cards.length > 0) {
                        return {
                            player: play.player,
                            cards: play.cards,
                            type: play.cardType || this.rules.getCardType(play.cards)
                        };
                    }
                }

                return null;
            }

            /**
             * 查找最小的牌
             */
            findSmallestCard(cards) {
                if (cards.length === 0) return null;

                let smallest = cards[0];
                for (let card of cards) {
                    if (this.getRankValue(card.rank) < this.getRankValue(smallest.rank)) {
                        smallest = card;
                    }
                }
                return smallest;
            }

            /**
             * 初始化AI玩家
             */
            initializeAIPlayers() {
                // 为每个AI玩家创建AI实例
                ['player2', 'player3', 'player4'].forEach(playerId => {
                    const position = this.getPlayerPosition(playerId);
                    if (position && this.players[position].isAI) {
                        // 创建游戏引擎代理对象
                        const gameEngineProxy = {
                            ruleEngine: this.ruleEngine,
                            playerManager: {
                                getPlayer: (pos) => this.players[pos] || null,
                                getPlayerCardCount: (player) => {
                                    if (!player || !player.cards) return 0;
                                    return player.cards.length;
                                },
                                getPlayerOpponents: (player) => {
                                    if (!player) return [];

                                    // 获取对手位置
                                    const position = player.id === 'player1' ? 'south' :
                                                    player.id === 'player2' ? 'east' :
                                                    player.id === 'player3' ? 'west' : 'north';

                                    let opponents = [];
                                    if (position === 'south' || position === 'north') {
                                        // A队的对手是B队（东、西）
                                        opponents = [this.players['east'], this.players['west']];
                                    } else {
                                        // B队的对手是A队（南、北）
                                        opponents = [this.players['south'], this.players['north']];
                                    }

                                    return opponents.filter(p => p != null);
                                }
                            }
                        };

                        // 创建AI实例
                        const aiPlayer = new AIPlayer(gameEngineProxy, playerId);
                        aiPlayer.initialize(this.players[position]);
                        aiPlayer.setDifficulty('medium'); // 设置中等难度

                        // 保存AI实例
                        this.aiPlayers[playerId] = aiPlayer;

                        console.log(`[AI初始化] ${playerId} (${position}) AI实例创建完成`);
                    }
                });
            }

            /**
             * 获取AI玩家实例
             */
            getAIPlayer(playerId) {
                return this.aiPlayers[playerId] || null;
            }

            /**
             * 获取玩家位置
             */
            getPlayerPosition(playerId) {
                for (let position in this.players) {
                    if (this.players[position].id === playerId) {
                        return position;
                    }
                }
                return null;
            }

            /**
             * 处理过牌
             */
            handlePass() {
                // AI选择过牌
                this.currentRoundCards.push({
                    player: this.currentPlayer,
                    cards: [],
                    timestamp: Date.now(),
                    action: 'pass'
                });

                // 添加到已过牌玩家集合
                this.roundPassedPlayers.add(this.currentPlayer);
                console.log(`[轮次] AI ${this.currentPlayer} 过牌，本回合永久失去出牌权`);

                // 播放过牌音效
                this.playSound('pass');

            // 继续下一回合
                setTimeout(() => {
                    this.switchToNextPlayer();
                }, 500);
            }

              // 检查是否有玩家完成游戏（手牌为0）
            checkGameEnd() {
                // 检查是否有玩家手牌为0
                for (let position in this.players) {
                    if (this.players[position].cards.length === 0) {
                        // 记录完成游戏的玩家
                        if (!this.finishedPlayers.includes(position)) {
                            this.finishedPlayers.push(position);
                            console.log(`${position} 完成游戏，当前排名: ${this.finishedPlayers.join(', ')}`);

                            // 更新排名图标显示
                            this.updateRankBadge(position, this.finishedPlayers.length);
                        }
                    }
                }

                // 检查是否头游产生（第一个完成的人）
                if (this.finishedPlayers.length === 1 && !this.gameEnded) {
                    const firstPlace = this.finishedPlayers[0];
                    console.log(`${firstPlace} 获得头游！`);
                    // 显示头游提示（持续显示，直到游戏结束）
                    this.showHeadPlayerStatus(`${this.players[firstPlace].name} 头游`);

                    // 头游产生后，继续游戏直到确定二游
                    return false;
                }

                // 检查是否已有3名玩家完成（此时剩余玩家自动成为末游）
                if (this.finishedPlayers.length === 3) {
                    // 找出未完成的玩家（末游）
                    const allPositions = ['south', 'west', 'north', 'east'];
                    const lastPlayer = allPositions.find(pos => !this.finishedPlayers.includes(pos));
                    if (lastPlayer) {
                        this.finishedPlayers.push(lastPlayer);
                        this.updateRankBadge(lastPlayer, 4);
                        console.log(`${lastPlayer} 自动成为末游（第4名）`);
                    }
                    console.log('3名玩家已完成，游戏结束！');
                    this.gameEnded = true;
                    this.endGame();
                    return true;
                }

                return false;
            }

            // 游戏结束处理
            endGame() {
                this.gameState = 'ended';

                // 隐藏头游提示
                this.hideHeadPlayerStatus();

                // 确定最终排名
                this.gameRankings = [...this.finishedPlayers]; // [头游, 二游, 三游, 末游]

                // 判定胜负
                const result = this.determineGameResult();

                // 播放胜负音效
                if (result.winner.includes('己方')) {
                    this.playSound('win');
                } else {
                    this.playSound('lose');
                }

                // 显示结果
                this.showGameResult(result);

                // 保存游戏记录并显示结��面板
                this.saveGameRecord(result);
                this.showGameResultModal(result);
            }

            // 判定游戏结果
            determineGameResult() {
                const [first, second, third, fourth] = this.gameRankings;

                // 确定队伍
                const firstTeam = this.players[first].team;
                const secondTeam = this.players[second].team;

                // 判定胜负
                if (firstTeam === secondTeam) {
                    // 头游和二游同队
                    const winnerTeam = firstTeam === 'A' ? '己方（A队）' : '对方（B队）';
                    const levelsUp = 3;
                    return {
                        winner: winnerTeam,
                        type: '头游+二游',
                        levelsUp: levelsUp,
                        description: `${winnerTeam}获胜！\n头游+二游，升${levelsUp}级`,
                        rankings: this.gameRankings
                    };
                } else {
                    // 找出三游的队伍
                    const thirdTeam = this.players[third].team;
                    if (firstTeam === thirdTeam) {
                        // 头游和三游同队
                        const winnerTeam = firstTeam === 'A' ? '己方（A队）' : '对方（B队）';
                        const levelsUp = 2;
                        return {
                            winner: winnerTeam,
                            type: '头游+三游',
                            levelsUp: levelsUp,
                            description: `${winnerTeam}获胜！\n头游+三游，升${levelsUp}级`,
                            rankings: this.gameRankings
                        };
                    } else {
                        // 头游和末游同队
                        const winnerTeam = firstTeam === 'A' ? '己方（A队）' : '对方（B队）';
                        const levelsUp = 1;
                        return {
                            winner: winnerTeam,
                            type: '头游+末游',
                            levelsUp: levelsUp,
                            description: `${winnerTeam}获胜！\n头游+末游，升${levelsUp}级`,
                            rankings: this.gameRankings
                        };
                    }
                }
            }

            // 显示游戏结果
            showGameResult(result) {
                const rankings = result.rankings.map((pos, index) => {
                    const rankNames = ['头游', '二游', '三游', '末游'];
                    return `${rankNames[index]}: ${this.players[pos].name}`;
                }).join('\n');

                console.log('=== 游戏结果 ===');
                console.log(rankings);
                console.log(result.description);
                console.log('================');

                // 应用升级结果
                this.applyLevelChange(result);
            }

            // 应用升级结果
            applyLevelChange(result) {
                // 根据胜负结果更新当前级数
                const winnerTeam = result.winner.includes('己方') ? 'A' : 'B';

                // 获取胜方的当前级数
                const currentTeamLevel = winnerTeam === 'A' ? this.teamAScore : this.teamBScore;
                const newLevel = currentTeamLevel + result.levelsUp;

                // 更新胜方级数
                if (winnerTeam === 'A') {
                    this.teamAScore = newLevel;
                } else {
                    this.teamBScore = newLevel;
                }

                // 1. 谁高打谁：取两队级数的最大值作为整桌级数
                const tableLevel = Math.max(this.teamAScore, this.teamBScore);

                // 2. 冲A关判断（到达A且双上才换级，否则退回J）
                const isLevelA = tableLevel === 14;  // 到达A
                const isDoubleUp = result.levelsUp === 3;  // 双上（头游+二游）

                if (isLevelA && isDoubleUp) {
                    // 冲关成功 → 比赛结束
                    console.log(`[冲A关] ${winnerTeam}队双上通过A关，赢得比赛！`);
                    result.gameOver = true;
                    result.winnerIsFinal = true;
                } else if (isLevelA && !isDoubleUp) {
                    // 冲关失败 → 退回J级，下一副从11重新往A爬
                    console.log(`[冲A关] ${winnerTeam}队未双上，打A失败，退回J级`);
                    if (winnerTeam === 'A') {
                        this.teamAScore = 11;  // J是第11级
                    } else {
                        this.teamBScore = 11;
                    }
                }

                // 3. 正常升级后继续打「当前最高级」
                // 重新计算整桌级数（考虑退回J的情况）
                this.currentLevel = Math.max(this.teamAScore, this.teamBScore);

                // 如果己方升级了，播放升级音效
                if (winnerTeam === 'A' && newLevel > currentTeamLevel) {
                    this.playSound('levelup');
                }

                // 更新规则引擎的级数
                if (this.ruleEngine) {
                    this.ruleEngine.setLevel(this.currentLevel);
                }

                // 更新左上角级数显示
                this.updateTeamLevelsDisplay();

                // 下一局首出玩家是末游
                this.lastGameLoser = this.gameRankings[3]; // 末游

                console.log(`[升级] ${result.winner}从${currentTeamLevel}级升到${newLevel}级`);
                console.log(`[首出] 下一局由${this.players[this.lastGameLoser].name}先出牌`);
            }

            // 更新左上角队伍级数显示
            updateTeamLevelsDisplay() {
                const teamALevelElement = document.getElementById('teamALevelNumber');
                const teamBLevelElement = document.getElementById('teamBLevelNumber');

                if (teamALevelElement) {
                    teamALevelElement.textContent = this.getLevelText(this.teamAScore);
                }
                if (teamBLevelElement) {
                    teamBLevelElement.textContent = this.getLevelText(this.teamBScore);
                }
            }

            // 获取级数文本
            getLevelText(level) {
                const levelNames = {
                    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
                    10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
                };
                return levelNames[level] || level;
            }

            // 检查是否开始新轮次
            checkNewRound() {
                if (this.currentRoundCards.length === 0) return false;

                // 只考虑最近的操作（避免数组过长）
                const recentCards = this.currentRoundCards.slice(-8);
                const currentRoundPlays = recentCards.filter(play => play.action !== 'pass');
                const passActions = recentCards.filter(play => play.action === 'pass');

                // 情况1：连续三家pass
                if (passActions.length >= 3) {
                    return true;
                }

                // 情况2：一轮结束（四家都出过牌，且最后一家是赢家）
                const uniquePlayers = new Set(recentCards.map(play => play.player));
                if (uniquePlayers.size === 4) {
                    // 检查是否回到起始玩家或最后出牌者
                    const lastPlay = recentCards[recentCards.length - 1];
                    if (lastPlay && lastPlay.cards.length > 0) {
                        return true;
                    }
                }

                // 情况3：当前轮次有有效出牌，且轮到起始玩家
                if (currentRoundPlays.length > 0 && this.currentPlayer === this.getFirstPlayerOfRound()) {
                    return true;
                }

                return false;
            }

            // 获取当前轮次的起始玩家
            getFirstPlayerOfRound() {
                if (this.currentRoundCards.length === 0) return this.currentPlayer;

                // 找到第一个非pass的玩家
                for (let play of this.currentRoundCards) {
                    if (play.action !== 'pass' && play.cards.length > 0) {
                        return play.player;
                    }
                }
                return this.currentPlayer;
            }

            // 开始新一轮（清除之前的出牌，并检查AI继续）
            startNewRound() {
                this.currentRoundCards = [];
                this.lastPlayer = null;
                this.updatePlayArea();
            }

            // 开始新游戏
            startNewGame() {
                // 关闭可能打开的模态框
                document.getElementById('gameResultModal')?.classList.add('d-none');
                document.getElementById('recordsModal')?.classList.add('d-none');

                this.isFirstGame = false;
                this.currentRoundCards = [];
                this.lastPlayer = null;
                this.selectedCards = [];
                this.lastPlay = null;

                // 重置游戏结束相关变量
                this.gameRankings = [];
                this.gameEnded = false;
                this.finishedPlayers = [];

                // 清除所有排名图标
                this.clearAllRankBadges();

                // 清空所有玩家手牌
                for (let pos in this.players) {
                    this.players[pos].cards = [];
                }

                // 更新左上角级数显示
                this.updateTeamLevelsDisplay();

                // 检查是否需要进贡
                this.checkAndProcessTribute();
            }

            // 重置整个游戏（用于通过A关后重新开始）
            resetEntireGame() {
                console.log('[重置游戏] 重置整个游戏，队伍级数回到2级');

                // 重置队伍级数
                this.teamAScore = 2;
                this.teamBScore = 2;
                this.currentLevel = 2;

                // 清空游戏记录
                this.gameHistory = [];
                this.gameResults = [];

                // 重置游戏结束相关变量
                this.gameRankings = [];
                this.gameEnded = false;
                this.finishedPlayers = [];
                this.isGameWon = false;

                // 重置首局标志
                this.isFirstGame = true;
                this.currentPlayer = null;
                this.lastPlayer = null;
                this.currentRoundCards = [];
                this.selectedCards = [];
                this.lastPlay = null;

                // 清除所有排名图标
                this.clearAllRankBadges();

                // 清空所有玩家手牌
                for (let pos in this.players) {
                    this.players[pos].cards = [];
                }

                // 更新规则引擎的级数
                if (this.ruleEngine) {
                    this.ruleEngine.setLevel(this.currentLevel);
                }

                // 更新左上角级数显示
                this.updateTeamLevelsDisplay();

                // 直接开始新游戏（不需要进贡，因为是全新游戏）
                this.initializeGame();
            }

            // 检查并处理进贡
            checkAndProcessTribute() {
                if (!this.tributeSystem) {
                    // 如果没有进贡系统，直接开始游戏
                    this.initializeGame();
                    return;
                }

                // 构建游戏状态对象
                const gameStateForTribute = this.buildTributeGameState();

                // 检查是否需要进贡
                const tributeInfo = this.tributeSystem.checkTributeNeeded(gameStateForTribute);

                if (!tributeInfo) {
                    // 不需要进贡，直接开始游戏
                    this.initializeGame();
                    return;
                }

                console.log('[游戏] 检测到进贡需求:', this.tributeSystem.getTributeStatusDescription(tributeInfo));

                if (tributeInfo.antiTribute) {
                    // 抗贡情况
                    this.handleAntiTributeResult(tributeInfo);
                } else {
                    // 正常进贡情况
                    this.startTributeRound(tributeInfo);
                }
            }

            // 构建进贡系统所需的游戏状态
            buildTributeGameState() {
                // 构建玩家排名数组
                const playerRanks = this.gameRankings.length >= 4 ?
                    this.gameRankings : ['south', 'west', 'north', 'east']; // 默认排名

                // 转换为玩家ID
                const playerIds = playerRanks.map(pos => this.players[pos].id);

                // 构建队伍信息
                const teams = [
                    { id: 'A', level: this.currentLevel, players: ['south', 'north'] },
                    { id: 'B', level: this.currentLevel, players: ['west', 'east'] }
                ];

                // 构建手牌信息
                const hands = {};
                for (let pos in this.players) {
                    hands[this.players[pos].id] = this.players[pos].cards;
                }

                return {
                    currentLevel: this.currentLevel.toString(),
                    playerRanks: playerIds,
                    teams: teams,
                    players: [
                        { id: this.players.south.id, team: 'A', position: 'south' },
                        { id: this.players.west.id, team: 'B', position: 'west' },
                        { id: this.players.north.id, team: 'A', position: 'north' },
                        { id: this.players.east.id, team: 'B', position: 'east' }
                    ],
                    hands: hands,
                    isFirstRound: this.isFirstGame,
                    roundHistory: this.gameHistory || []
                };
            }

            // 处理抗贡结果
            handleAntiTributeResult(tributeInfo) {
                console.log('[游戏] 抗贡成功，头游先出');

                // 确定头游玩家
                const firstPlayerId = tributeInfo.firstLead;
                let firstPlayerPosition = null;

                for (let pos in this.players) {
                    if (this.players[pos].id === firstPlayerId) {
                        firstPlayerPosition = pos;
                        break;
                    }
                }

                // 设置首出玩家并开始游戏
                this.initializeGame(firstPlayerPosition);
            }

            // 开始进贡回合
            startTributeRound(tributeInfo) {
                console.log('[游戏] 开始进贡流程');

                // 启动进贡系统
                const tributeResult = this.tributeSystem.startTributeRound(tributeInfo);

                if (tributeResult.antiTribute) {
                    // 处理抗贡情况
                    this.handleAntiTributeResult(tributeResult.tributeInfo);
                } else if (tributeResult.needsTribute) {
                    // 显示进贡UI或自动处理AI进贡
                    this.processTributeRound(tributeResult);
                } else {
                    // 没有进贡需求，直接开始游戏
                    this.initializeGame();
                }
            }

            // 处理进贡回合
            processTributeRound(tributeResult) {
                const tributeInfo = tributeResult.tributeInfo;
                const pendingTributes = tributeInfo.pendingTributes;

                // 自动处理AI玩家的进贡
                const aiPromises = pendingTributes.map(pair => {
                    const playerId = pair.from;
                    const playerPosition = this.getPlayerPositionById(playerId);

                    if (this.players[playerPosition].isAI) {
                        // AI自动选择进贡牌
                        const cards = this.tributeSystem.autoSelectTributeCards(playerId, tributeInfo);
                        if (cards.length > 0) {
                            return this.tributeSystem.selectTributeCards(playerId, cards, tributeInfo);
                        }
                    }
                    return null;
                }).filter(Boolean);

                // 检查是否需要人类玩家进贡
                const humanPlayerTribute = pendingTributes.find(pair => {
                    const playerPosition = this.getPlayerPositionById(pair.from);
                    return !this.players[playerPosition].isAI;
                });

                if (humanPlayerTribute) {
                    // 显示进贡UI给人类玩家
                    this.showTributeUI(humanPlayerTribute, tributeInfo);
                } else {
                    // 全部是AI，自动处理还贡并开始游戏
                    this.autoProcessAITributes(tributeInfo);
                }
            }

            // 获取玩家位置
            getPlayerPositionById(playerId) {
                for (let pos in this.players) {
                    if (this.players[pos].id === playerId) {
                        return pos;
                    }
                }
                return null;
            }

            // 显示进贡UI
            showTributeUI(tributePair, tributeInfo) {
                console.log('[游戏] 显示进贡UI给玩家');
                this.tributePanel.show(tributePair, tributeInfo);
            }

            // 自动处理人类玩家进贡（临时实现）
            autoProcessHumanTribute(tributePair, tributeInfo) {
                const cards = this.tributeSystem.autoSelectTributeCards(tributePair.from, tributeInfo);
                if (cards.length > 0) {
                    const result = this.tributeSystem.selectTributeCards(tributePair.from, cards, tributeInfo);
                    if (result.success) {
                        this.checkAndCompleteTribute();
                    }
                }
            }

            // 自动处理AI进贡
            autoProcessAITributes(tributeInfo) {
                console.log('[游戏] 自动处理AI进贡');
                // 这里应该已经自动处理完成，检查并开始游戏
                setTimeout(() => {
                    this.checkAndCompleteTribute();
                }, 1000);
            }

            // 检查并完成进贡
            checkAndCompleteTribute() {
                const tributeState = this.tributeSystem.getCurrentTributeState();

                if (!tributeState.isTributeRound) {
                    // 进贡已完成，开始游戏
                    this.initializeGame();
                } else {
                    // 仍有待处理的进贡
                    setTimeout(() => {
                        this.checkAndCompleteTribute();
                    }, 500);
                }
            }

            // 辅助函数：按点数分组
            groupCardsByRank(cards) {
                const groups = {};
                cards.forEach(card => {
                    if (!groups[card.rank]) {
                        groups[card.rank] = [];
                    }
                    groups[card.rank].push(card);
                });
                return groups;
            }

            // 辅助函数：获取牌面值大小
            getRankValue(rank) {
                // 级牌特殊处理：级牌值101，在小王(102)和A(14)之间
                if (rank === this.ruleEngine.currentLevel.toString()) {
                    return 101;
                }

                // 掼蛋规则：A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2
                const rankOrder = {
                    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
                    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '小王': 102, '大王': 103
                };

                // 王对特殊处理
                if (rank === '王对') {
                    return 999;  // 确保王对最大
                }

                return rankOrder[rank] || 0;
            }

            // 更新记牌系统
            updateCardMemory(player, cards) {
                // 记录每个玩家出的牌
                this.cardMemory[player].push(...cards);

                // 记录所有已出的牌
                this.playedCards.push(...cards);
            }

            // AI智能分析剩余牌
            analyzeRemainingCards(player) {
                const remainingCards = this.players[player].cards;
                const analysis = {
                    singles: [],
                    pairs: [],
                    triples: [],
                    bombs: [],
                    totalCards: remainingCards.length
                };

                // 按点数分组
                const rankGroups = {};
                remainingCards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                // 分析牌型
                for (let rank in rankGroups) {
                    const group = rankGroups[rank];
                    if (group.length === 1) {
                        analysis.singles.push(group[0]);
                    } else if (group.length === 2) {
                        analysis.pairs.push(group);
                    } else if (group.length === 3) {
                        analysis.triples.push(group);
                    } else if (group.length >= 4) {
                        analysis.bombs.push(group);
                    }
                }

                return analysis;
            }

            // AI智能出牌决策
            makeAIPlayDecision(cards) {
                if (!cards || cards.length === 0) return null;

                // 分析手牌结构
                const analysis = this.analyzeCards(cards);

                // 获取队友和对手信息
                const teammate = this.getTeammate(this.currentPlayer);
                const teammatesCards = this.players[teammate] ? this.players[teammate].cards.length : 0;

                // 根据不同情况选择出牌策略
                const strategies = [
                    // 策略1：如果手牌很少，优先出单张或对子
                    () => {
                        if (cards.length <= 3) {
                            // 出最小的单张
                            if (analysis.singles.length > 0) {
                                return {
                                    cards: [analysis.singles[0]],
                                    reason: '手牌较少，出小单张'
                                };
                            }
                        }
                        return null;
                    },

                    // 策略2：如果队友手牌很少，优先出小牌让队友上手
                    () => {
                        if (teammatesCards <= 5) {
                            const sortedCards = [...cards].sort((a, b) =>
                                this.getRankValue(a.rank) - this.getRankValue(b.rank)
                            );
                            // 出最小的单张，让队友有机会控制
                            if (sortedCards.length > 0) {
                                return {
                                    cards: [sortedCards[0]],
                                    reason: '队友手牌少，出小牌让其控制'
                                };
                            }
                        }
                        return null;
                    },

                    // 策略3：尝试出连对（如果有多余的对子）
                    () => {
                        const doubleStraights = this.findDoubleStraights(cards);
                        if (doubleStraights.length > 0 && doubleStraights[0].length >= 3) {
                            return {
                                cards: doubleStraights[0],
                                reason: '出连对清理手牌'
                            };
                        }
                        return null;
                    },

                    // 策略4：尝试出钢板（三连对）
                    () => {
                        if (analysis.steels && analysis.steels.length > 0) {
                            return {
                                cards: analysis.steels[0],
                                reason: '出钢板压制对手'
                            };
                        }
                        return null;
                    },

                    // 策略5：如果有多余的王，考虑出王对或王炸
                    () => {
                        const jokers = cards.filter(c => c.rank === '小王' || c.rank === '大王');
                        if (jokers.length >= 2) {
                            // 如果有王炸，除非紧急情况否则不出
                            // 只在手牌很少时考虑
                            if (cards.length <= 5) {
                                return {
                                    cards: jokers,
                                    reason: '手牌紧张，准备使用王炸'
                                };
                            }
                        }
                        return null;
                    },

                    // 策略6：尝试出顺子
                    () => {
                        const straights = this.findStraights(cards);
                        if (straights.length > 0 && straights[0].length >= 5) {
                            // 优先出长度适中的顺子（5-7张）
                            const bestStraight = straights.find(s => s.length >= 5 && s.length <= 7) || straights[0];
                            return {
                                cards: bestStraight,
                                reason: '出顺子清理手牌'
                            };
                        }
                        return null;
                    },

                    // 策略7：如果有多余的三张，考虑出三带二
                    () => {
                        if (analysis.triples.length > 0 && analysis.pairs.length > 0) {
                            const triple = analysis.triples[0];
                            const pair = analysis.pairs[0];
                            return {
                                cards: [...triple, ...pair],
                                reason: '出三带二快速减牌'
                            };
                        }
                        return null;
                    },

                    // 策略8：尝试出对子（拆散三张）
                    () => {
                        if (analysis.pairs.length > 0) {
                            // 优先出非连续的对子
                            const nonSequencePair = analysis.pairs.find(pair => {
                                const rank = this.getRankValue(pair[0].rank);
                                return !analysis.pairs.some(otherPair => {
                                    if (otherPair === pair) return false;
                                    const otherRank = this.getRankValue(otherPair[0].rank);
                                    return Math.abs(rank - otherRank) === 1;
                                });
                            });

                            const selectedPair = nonSequencePair || analysis.pairs[0];
                            return {
                                cards: selectedPair,
                                reason: '出对子控制节奏'
                            };
                        }
                        return null;
                    },

                    // 策略9：如果有三张且不是炸弹，考虑拆开
                    () => {
                        if (analysis.triples.length > 0 && analysis.bombs.length === 0) {
                            // 优先保留炸弹，拆开普通的三张
                            const triple = analysis.triples[0];
                            // 如果还有其他牌，优先出三张中的中等大小的牌
                            const sortedTriple = [...triple].sort((a, b) =>
                                this.getRankValue(a.rank) - this.getRankValue(b.rank)
                            );
                            return {
                                cards: [sortedTriple[1]], // 出中等大小的牌
                                reason: '拆三张，保留牌力'
                            };
                        }
                        return null;
                    },

                    // 策略10：默认出最小的单张
                    () => {
                        const sortedCards = [...cards].sort((a, b) =>
                            this.getRankValue(a.rank) - this.getRankValue(b.rank)
                        );
                        return {
                            cards: [sortedCards[0]],
                            reason: '出最小单张'
                        };
                    }
                ];

                // 依次尝试策略
                for (let strategy of strategies) {
                    const decision = strategy();
                    if (decision) return decision;
                }

                return null;
            }

            // 获取队友
            getTeammate(player) {
                const teams = {
                    'south': 'north',
                    'north': 'south',
                    'west': 'east',
                    'east': 'west'
                };
                return teams[player];
            }

            // 分析手牌结构
            analyzeCards(cards) {
                const ranks = {};
                cards.forEach(card => {
                    const rank = card.rank;
                    if (!ranks[rank]) {
                        ranks[rank] = [];
                    }
                    ranks[rank].push(card);
                });

                const analysis = {
                    singles: [],
                    pairs: [],
                    triples: [],
                    bombs: [],
                    steels: []
                };

                Object.values(ranks).forEach(group => {
                    if (group.length === 1) {
                        analysis.singles.push(group[0]);
                    } else if (group.length === 2) {
                        analysis.pairs.push(group);
                    } else if (group.length === 3) {
                        analysis.triples.push(group);
                    } else if (group.length >= 4) {
                        analysis.bombs.push(group);
                    }
                });

                // 排序
                analysis.singles.sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));
                analysis.pairs.sort((a, b) => this.getRankValue(a[0].rank) - this.getRankValue(b[0].rank));
                analysis.triples.sort((a, b) => this.getRankValue(a[0].rank) - this.getRankValue(b[0].rank));

                // 查找钢板
                analysis.steels = this.findSteels(cards);

                return analysis;
            }

            // 查找可能的顺子
            findStraights(cards) {
                const ranks = [...new Set(cards.map(c => this.getRankValue(c.rank)))].sort((a, b) => a - b);
                const straights = [];

                // 移除大小王和2
                const validRanks = ranks.filter(r => r < 15); // 15是2的值

                for (let i = 0; i < validRanks.length; i++) {
                    for (let j = i + 4; j < validRanks.length; j++) {
                        if (validRanks[j] - validRanks[i] === j - i) {
                            // 找到了顺子
                            const straightRanks = validRanks.slice(i, j + 1);
                            const straightCards = [];

                            straightRanks.forEach(rank => {
                                const card = cards.find(c => this.getRankValue(c.rank) === rank);
                                if (card) straightCards.push(card);
                            });

                            if (straightCards.length === straightRanks.length) {
                                straights.push(straightCards);
                            }
                        }
                    }
                }

                return straights;
            }

            // 查找连对（双顺）
            findDoubleStraights(cards) {
                const ranks = {};
                cards.forEach(card => {
                    const rank = card.rank;
                    if (!ranks[rank]) {
                        ranks[rank] = [];
                    }
                    ranks[rank].push(card);
                });

                // 找出所有对子
                const pairs = [];
                Object.keys(ranks).forEach(rank => {
                    if (ranks[rank].length >= 2) {
                        pairs.push({
                            rank: this.getRankValue(rank),
                            cards: ranks[rank].slice(0, 2)
                        });
                    }
                });

                // 排序
                pairs.sort((a, b) => a.rank - b.rank);

                // 查找连续的对子
                const doubleStraights = [];
                for (let i = 0; i < pairs.length; i++) {
                    for (let j = i + 2; j < pairs.length; j++) {
                        if (pairs[j].rank - pairs[i].rank === j - i) {
                            // 找到连对
                            const doubleStraightCards = [];
                            for (let k = i; k <= j; k++) {
                                doubleStraightCards.push(...pairs[k].cards);
                            }
                            doubleStraights.push(doubleStraightCards);
                        }
                    }
                }

                return doubleStraights;
            }

            // 查找钢板（三连对）
            findSteels(cards) {
                const ranks = {};
                cards.forEach(card => {
                    const rank = card.rank;
                    if (!ranks[rank]) {
                        ranks[rank] = [];
                    }
                    ranks[rank].push(card);
                });

                // 找出所有三张
                const triples = [];
                Object.keys(ranks).forEach(rank => {
                    if (ranks[rank].length >= 3) {
                        triples.push({
                            rank: this.getRankValue(rank),
                            cards: ranks[rank].slice(0, 3)
                        });
                    }
                });

                // 查找连续的三张
                const steels = [];
                for (let i = 0; i < triples.length - 1; i++) {
                    for (let j = i + 1; j < triples.length; j++) {
                        if (triples[j].rank - triples[i].rank === 1) {
                            // 找到钢板
                            const steelCards = [...triples[i].cards, ...triples[j].cards];
                            steels.push(steelCards);
                        }
                    }
                }

                return steels;
            }

            // AI智能决策
            makeAIDecision(player) {
                const analysis = this.analyzeRemainingCards(this.currentPlayer);
                const partner = this.getPartner(this.currentPlayer);

                // 简单策略1：如果只剩一张牌，直接出
                if (analysis.totalCards === 1) {
                    return {
                        action: 'play',
                        cards: [analysis.singles[0]]
                    };
                }

                // 简单策略2：如果是自由出牌，出最小的单张
                if (!this.roundActive || !this.lastPlay) {
                    if (analysis.singles.length > 0) {
                        // 找最小的单张
                        analysis.singles.sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));
                        return {
                            action: 'play',
                            cards: [analysis.singles[0]]
                        };
                    }
                }

                // 简单策略3：尝试打过对手
                const validPlay = this.findValidPlay(this.players[player].cards, this.lastPlay);
                if (validPlay) {
                    return {
                        action: 'play',
                        cards: validPlay
                    };
                }

                // 默认策略：过牌
                return {
                    action: 'pass'
                };
            }

            // 获取队友
            getPartner(player) {
                const partnerships = {
                    'south': 'north',
                    'north': 'south',
                    'east': 'west',
                    'west': 'east'
                };
                return partnerships[player];
            }

            // 查找合法出牌
            findValidPlay(handCards, lastPlay) {
                if (!lastPlay || !lastPlay.cards) return null;

                const possiblePlays = [];

                // 尝试所有可能的出牌组合
                // 1. 单张
                for (let card of handCards) {
                    if (this.ruleEngine.canBeat([card], lastPlay.cards)) {
                        possiblePlays.push([card]);
                    }
                }

                // 2. 对子
                const pairs = this.findPairs(handCards);
                for (let pair of pairs) {
                    if (this.ruleEngine.canBeat(pair, lastPlay.cards)) {
                        possiblePlays.push(pair);
                    }
                }

                // 3. 三张
                const triples = this.findTriples(handCards);
                for (let triple of triples) {
                    if (this.ruleEngine.canBeat(triple, lastPlay.cards)) {
                        possiblePlays.push(triple);
                    }
                }

                // 4. 炸弹
                const bombs = this.findBombs(handCards);
                for (let bomb of bombs) {
                    if (this.ruleEngine.canBeat(bomb, lastPlay.cards)) {
                        possiblePlays.push(bomb);
                    }
                }

                // 返回最小的合法出牌
                if (possiblePlays.length > 0) {
                    // 简单选择第一个，实际应该选择最优策略
                    return possiblePlays[0];
                }

                return null;
            }

            // 查找对子
            findPairs(cards) {
                const rankGroups = {};
                const pairs = [];

                // 按点数分组
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                // 提取对子
                for (let rank in rankGroups) {
                    const group = rankGroups[rank];
                    if (group.length >= 2) {
                        pairs.push([group[0], group[1]]);
                    }
                }

                return pairs;
            }

            // 查找三张
            findTriples(cards) {
                const rankGroups = {};
                const triples = [];

                // 按点数分组
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                // 提取三张
                for (let rank in rankGroups) {
                    const group = rankGroups[rank];
                    if (group.length >= 3) {
                        triples.push([group[0], group[1], group[2]]);
                    }
                }

                return triples;
            }

            // 查找炸弹
            findBombs(cards) {
                const rankGroups = {};
                const bombs = [];

                // 按点数分组
                cards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                // 提取炸弹（4张及以上）
                for (let rank in rankGroups) {
                    const group = rankGroups[rank];
                    if (group.length >= 4) {
                        bombs.push(group);
                    }
                }

                // 检查天王炸弹
                const jokers = cards.filter(c => c.suit === 'joker');
                if (jokers.length === 4) {
                    bombs.push(jokers);
                }

                return bombs;
            }

            // 初始化音频（在用户首次交互时调用）
            initAudio() {
                if (!this.audioContext) {
                    try {
                        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                        if (this.audioContext.state === 'suspended') {
                            this.audioContext.resume();
                        }
                    } catch (error) {
                        console.log('音频初始化失败');
                    }
                }
            }

            // 获取随机思考时间
            getRandomThinkingTime() {
                // 进一步优化：大幅减少AI思考时间，提升游戏流畅度
                const baseTime = 300; // 基础思考时间0.3秒
                const variation = Math.random() * 400; // 随机变化0-0.4秒

                // 第一次出牌时适当增加思考时间
                const isFirstPlay = this.currentRoundCards.length === 0 ||
                    this.currentRoundCards.every(play => play.cards.length === 0);
                const extraTime = isFirstPlay ? 200 : 0; // 额外0.2秒

                // 根据AI剩余手牌数量调整思考时间（牌少时出牌更快）
                const aiPlayer = this.players[this.currentPlayer];
                const cardCountBonus = aiPlayer && aiPlayer.cards ? Math.min(10, aiPlayer.cards.length) * 10 : 0;

                return baseTime + variation + extraTime + cardCountBonus;
            }

            // 显示AI思考状态
            showAIThinking(player) {
                const positions = {
                    'west': '西家AI',
                    'north': '北家AI',
                    'east': '东家AI'
                };

                // 在对应玩家位置显示思考动画
                const positionElement = document.getElementById(player + 'Hand');
                if (positionElement) {
                    positionElement.classList.add('thinking');
                }

                // 显示思考提示 - 倒计时已启动，不需要额外的文字提示
                // this.showMessage(`${positions[player]}正在思考...`, 'info');

                // 播放思考音效
                this.playSound('thinking');
            }

            // 清除AI思考状态
            clearAIThinking(player) {
                const positionElement = document.getElementById(player + 'Hand');
                if (positionElement) {
                    positionElement.classList.remove('thinking');
                }
            }

            // 播放音效
            playSound(soundType) {
                // 如果音频上下文未启动，则不播放
                if (!this.audioContext) {
                    this.initAudio();
                    if (!this.audioContext || this.audioContext.state === 'suspended') {
                        return;
                    }
                }

                // 播放简单的音效
                try {
                    // 根据音效类型设置不同的频率和模式
                    switch(soundType) {
                        case 'select':
                            this.playTone(600, 0.05, 0.05, 'sine');
                            break;
                        case 'deselect':
                            this.playTone(400, 0.05, 0.05, 'sine');
                            break;
                        case 'play':
                            this.playTone(800, 0.1, 0.1, 'square');
                            setTimeout(() => this.playTone(1000, 0.05, 0.05, 'square'), 50);
                            break;
                        case 'pass':
                            this.playTone(300, 0.15, 0.2, 'sawtooth');
                            break;
                        case 'bomb':
                            // 炸弹音效：多层声音叠加
                            this.playTone(200, 0.1, 0.15, 'sawtooth');
                            setTimeout(() => this.playTone(400, 0.15, 0.2, 'square'), 50);
                            setTimeout(() => this.playTone(800, 0.2, 0.25, 'sine'), 100);
                            setTimeout(() => this.playTone(1200, 0.1, 0.15, 'square'), 150);
                            break;
                        case 'win':
                            // 胜利音效：上升音阶
                            const winFreqs = [523, 659, 784, 1047]; // C, E, G, High C
                            winFreqs.forEach((freq, i) => {
                                setTimeout(() => this.playTone(freq, 0.2, 0.3, 'sine'), i * 100);
                            });
                            break;
                        case 'lose':
                            // 失败音效：下降音阶
                            const loseFreqs = [400, 350, 300, 250];
                            loseFreqs.forEach((freq, i) => {
                                setTimeout(() => this.playTone(freq, 0.15, 0.2, 'sawtooth'), i * 150);
                            });
                            break;
                        case 'levelup':
                            // 升级音效：欢快的音阶
                            const levelFreqs = [523, 659, 784, 1047, 1319]; // C, E, G, High C, High E
                            levelFreqs.forEach((freq, i) => {
                                setTimeout(() => this.playTone(freq, 0.1, 0.15, 'sine'), i * 80);
                            });
                            break;
                        case 'hint':
                            // 提示音效：柔和的提醒声
                            this.playTone(880, 0.08, 0.1, 'triangle');
                            setTimeout(() => this.playTone(660, 0.08, 0.1, 'triangle'), 100);
                            break;
                        case 'error':
                            // 错误音效：低频嗡嗡声
                            this.playTone(150, 0.2, 0.3, 'sawtooth');
                            break;
                        case 'shuffle':
                            // 洗牌音效：快速连续的声音
                            for (let i = 0; i < 5; i++) {
                                setTimeout(() => this.playTone(300 + Math.random() * 200, 0.03, 0.05, 'square'), i * 30);
                            }
                            break;
                        case 'thinking':
                            // AI思考音效：柔和的背景音
                            this.playTone(440, 0.05, 0.1, 'sine');
                            break;
                    }
                } catch (error) {
                    // 静默处理音效错误
                    console.log('音效播放失败:', error);
                }
            }

            // 辅助函数：播放单个音调
            playTone(frequency, volume, duration, type = 'sine') {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.type = type;
                oscillator.frequency.value = frequency;

                // 设置音量淡入淡出
                gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.start();
                oscillator.stop(this.audioContext.currentTime + duration);
            }

            /**
             * 生成提示（两层过滤系统：L1缓存 + L2规则引擎）
             * L1: 缓存层，相同场景直接返回缓存结果（命中率 > 80%）
             * L2: 规则引擎层，同型优先 → 最小炸弹 → 最小领出
             */
            generateSmartHints() {
                const playerCards = this.players.south.cards;
                const lastPlay = this.getLastPlay();

                // 调试：打印当前状态
                console.log(`[提示] 当前级别: ${this.currentLevel}`);
                console.log(`[提示] 上家出牌:`, lastPlay?.cards?.map(c => `${c.rank}${c.suit}`).join(','));
                if (lastPlay?.cards) {
                    const lastType = this.rules.getCardType(lastPlay.cards);
                    console.log(`[提示] 上家牌型:`, lastType);
                }
                console.log(`[提示] 手牌:`, playerCards.map(c => `${c.rank}${c.suit}(权${this.rules.getCardWeight(c)})`).join(', '));

                // L1: 检查缓存
                const cacheKey = this.generateHintCacheKey(lastPlay, playerCards);
                const cachedHint = this.hintCache.get(cacheKey);

                if (cachedHint) {
                    this.hintCacheStats.hits++;
                    this.hintCacheStats.totalRequests++;
                    console.log(`[L1缓存] 命中！命中率: ${((this.hintCacheStats.hits / this.hintCacheStats.totalRequests) * 100).toFixed(1)}%`);
                    console.log(`[L1缓存] 缓存提示:`, cachedHint.map(h => `${h.description} (${h.cards.map(c => c.rank).join(',')})`));
                    return cachedHint;
                }

                this.hintCacheStats.misses++;
                this.hintCacheStats.totalRequests++;

                // L2: 规则引擎层
                const hints = this.generateHintsByRuleEngine(lastPlay, playerCards);

                // 存入缓存
                this.hintCache.set(cacheKey, hints);
                console.log(`[L2规则] 生成 ${hints.length} 个提示:`, hints.map(h => `${h.description} (${h.cards.map(c => c.rank).join(',')})`));

                return hints;
            }

            /**
             * 生成缓存key
             * key格式: tableHash_handHash_level
             * tableHash = 尾张+长度 (无上一手时为 "null")
             * handHash = 手牌排序后的rank字符串
             */
            generateHintCacheKey(lastPlay, handCards) {
                // 生成tableHash
                let tableHash = 'null';
                if (lastPlay && lastPlay.cards && lastPlay.cards.length > 0) {
                    const sortedCards = [...lastPlay.cards].sort((a, b) => {
                        const weightA = this.rules.getCardWeight(a);
                        const weightB = this.rules.getCardWeight(b);
                        return weightA - weightB;
                    });
                    const lastCard = sortedCards[sortedCards.length - 1];
                    tableHash = `${lastCard.rank}${lastPlay.cards.length}`;
                }

                // 生成handHash
                const sortedHand = [...handCards].sort((a, b) => {
                    const weightA = this.rules.getCardWeight(a);
                    const weightB = this.rules.getCardWeight(b);
                    return weightA - weightB;
                });
                const handHash = sortedHand.map(c => c.rank).join('');

                return `${tableHash}_${handHash}_${this.currentLevel}`;
            }

            /**
             * L2规则引擎层：同型优先 → 所有炸弹 → 最小领出
             */
            generateHintsByRuleEngine(lastPlay, handCards) {
                const hints = [];

                // 1. 同型优先：找到所有相同牌型能打过的组合（按权重从小到大）
                const sameTypeHints = this.findSameTypeMinimal(lastPlay, handCards);
                if (sameTypeHints) {
                    // sameTypeHints 现在是一个数组，包含所有能打过的同类型牌
                    if (Array.isArray(sameTypeHints)) {
                        sameTypeHints.forEach(hint => hints.push(hint));
                    } else {
                        hints.push(sameTypeHints);
                    }
                }

                // 2. 所有炸弹：返回所有可用的炸弹（而不仅仅是最小的）
                const allBombs = this.findAllBombs(handCards);
                allBombs.forEach(bombHint => {
                    hints.push(bombHint);
                });

                // 3. 领出模式：返回最小牌型的最小组合
                if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
                    const minLeadOut = this.findMinimalLeadOut(handCards);
                    if (minLeadOut) {
                        // 只添加不在hints中的提示
                        const exists = hints.some(h =>
                            h.type?.type === minLeadOut.type?.type &&
                            h.cards.length === minLeadOut.cards.length
                        );
                        if (!exists) {
                            hints.push(minLeadOut);
                        }
                    }
                }

                return hints;
            }

            /**
             * 找到所有可用的炸弹（4炸、5炸、6炸、7炸、8炸、同花顺、天王炸弹）
             */
            findAllBombs(handCards) {
                const bombHints = [];

                // 统计每个点数的牌数
                const rankGroups = {};
                handCards.forEach(card => {
                    if (card.suit !== 'joker') {
                        if (!rankGroups[card.rank]) {
                            rankGroups[card.rank] = [];
                        }
                        rankGroups[card.rank].push(card);
                    }
                });

                // 找所有4-8张的普通炸弹（从小到大）
                const sortedRanks = Object.keys(rankGroups).sort((a, b) => {
                    const weightA = this.rules.getCardWeight({rank: a});
                    const weightB = this.rules.getCardWeight({rank: b});
                    return weightA - weightB;
                });

                for (const rank of sortedRanks) {
                    const count = rankGroups[rank].length;
                    for (let bombSize = 4; bombSize <= Math.min(count, 8); bombSize++) {
                        const bombCards = rankGroups[rank].slice(0, bombSize);
                        const bombType = this.rules.getCardType(bombCards);
                        if (bombType && bombType.family === 'bomb') {
                            bombHints.push({
                                cards: bombCards,
                                type: bombType,
                                description: `出炸弹 ${rank}×${bombSize}`
                            });
                        }
                    }
                }

                // 检查天王炸弹（4张王牌）
                const jokers = handCards.filter(c => c.suit === 'joker');
                if (jokers.length === 4) {
                    bombHints.push({
                        cards: jokers,
                        type: this.rules.getCardType(jokers),
                        description: `出天王炸弹`
                    });
                }

                // TODO: 同花顺炸弹（需要单独实现）

                return bombHints;
            }

            /**
             * 同型优先：找到相同牌型的最小能打过的组合
             */
            findSameTypeMinimal(lastPlay, handCards) {
                if (!lastPlay || !lastPlay.cards || lastPlay.cards.length === 0) {
                    return null;
                }

                // 识别上一手牌型
                const lastType = this.rules.getCardType(lastPlay.cards);
                if (!lastType || lastType.type === 'invalid') {
                    return null;
                }

                // 使用规则引擎验证所有可能的同型组合
                const validHints = [];

                // 根据牌型生成候选
                if (lastType.type === 'single') {
                    // 单张：优先使用"单牌"（不成对的牌），而不是从对子中拆牌
                    // 返回所有能打过的牌，而不仅仅是最小的

                    // 统计每个点数的牌数
                    const rankCounts = {};
                    handCards.forEach(card => {
                        rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
                    });

                    // 分离单牌（数量=1）和组合牌（数量>=2）
                    const singleCards = [];  // 单牌（废牌）
                    const pairCards = [];    // 组合牌（可拆）

                    handCards.forEach(card => {
                        if (rankCounts[card.rank] === 1) {
                            singleCards.push(card);
                        } else {
                            pairCards.push(card);
                        }
                    });

                    // 先从单牌中找（按权重排序）
                    singleCards.sort((a, b) => this.rules.getCardWeight(a) - this.rules.getCardWeight(b));
                    console.log(`[findSameTypeMinimal] 单牌:`, singleCards.map(c => `${c.rank}(权${this.rules.getCardWeight(c)})`).join(', '));

                    for (const card of singleCards) {
                        const validation = this.rules.validatePlay([card], lastPlay, handCards);
                        if (validation.valid && validation.type) {
                            validHints.push({
                                cards: [card],
                                type: validation.type,
                                description: `出单张 ${card.rank}${card.suit}`
                            });
                        }
                    }

                    // 如果单牌中没有能打过的，再从组合牌中找（按权重排序）
                    if (validHints.length === 0) {
                        pairCards.sort((a, b) => this.rules.getCardWeight(a) - this.rules.getCardWeight(b));
                        console.log(`[findSameTypeMinimal] 组合牌（可拆）:`, pairCards.map(c => `${c.rank}(权${this.rules.getCardWeight(c)})`).join(', '));

                        for (const card of pairCards) {
                            const validation = this.rules.validatePlay([card], lastPlay, handCards);
                            if (validation.valid && validation.type) {
                                validHints.push({
                                    cards: [card],
                                    type: validation.type,
                                    description: `出单张 ${card.rank}${card.suit}`
                                });
                            }
                        }
                    }
                } else if (lastType.type === 'pair') {
                    // 对子：找最小能打过的对子
                    const pairs = this.findPairs(handCards);
                    for (const pair of pairs) {
                        const validation = this.rules.validatePlay(pair, lastPlay, handCards);
                        if (validation.valid && validation.type) {
                            validHints.push({
                                cards: pair,
                                type: validation.type,
                                description: `出对子 ${pair[0].rank}`
                            });
                            break;
                        }
                    }
                } else if (lastType.type === 'triple') {
                    // 三张：找最小能打过的三张
                    const triples = this.findTriples(handCards);
                    for (const triple of triples) {
                        const validation = this.rules.validatePlay(triple, lastPlay, handCards);
                        if (validation.valid && validation.type) {
                            validHints.push({
                                cards: triple,
                                type: validation.type,
                                description: `出三张 ${triple[0].rank}`
                            });
                            break;
                        }
                    }
                } else if (lastType.type === 'bomb') {
                    // 炸弹：找最小能打过的炸弹
                    const bombs = this.findBombs(handCards);
                    for (const bomb of bombs) {
                        const validation = this.rules.validatePlay(bomb, lastPlay, handCards);
                        if (validation.valid && validation.type) {
                            validHints.push({
                                cards: bomb,
                                type: validation.type,
                                description: `出炸弹 ${bomb[0].rank}×${bomb.length}`
                            });
                            break;
                        }
                    }
                }

                // 返回所有能打过的同类型牌（按权重从小到大排序）
                return validHints.length > 0 ? validHints : null;
            }

            /**
             * 最小炸弹：找手牌中最小的炸弹
             */
            findMinimalBomb(handCards) {
                // 统计每个点数的牌数
                const rankGroups = {};
                handCards.forEach(card => {
                    if (card.suit !== 'joker') {
                        if (!rankGroups[card.rank]) {
                            rankGroups[card.rank] = [];
                        }
                        rankGroups[card.rank].push(card);
                    }
                });

                // 找4张及以上的点数（从小到大）
                const sortedRanks = Object.keys(rankGroups).sort((a, b) => {
                    const weightA = this.rules.getCardWeight({rank: a});
                    const weightB = this.rules.getCardWeight({rank: b});
                    return weightA - weightB;
                });

                for (const rank of sortedRanks) {
                    if (rankGroups[rank].length >= 4) {
                        const bombCards = rankGroups[rank].slice(0, 4);
                        return {
                            cards: bombCards,
                            type: this.rules.getCardType(bombCards),
                            description: `出炸弹 ${rank}×4`
                        };
                    }
                }

                // 检查天王炸弹（4张王牌）
                // 注意：2张王牌是"王对"，属于普通对子，不是炸弹！
                // 只有4张王牌才是"天王炸弹"，才是炸弹。
                const jokers = handCards.filter(c => c.suit === 'joker');
                if (jokers.length === 4) {
                    return {
                        cards: jokers,
                        type: this.rules.getCardType(jokers),
                        description: `出天王炸弹`
                    };
                }

                return null;
            }

            /**
             * 领出模式：返回最小牌型的最小组合
             */
            findMinimalLeadOut(handCards) {
                if (handCards.length === 0) return null;

                // 按权重排序
                const sortedCards = [...handCards].sort((a, b) => {
                    const weightA = this.rules.getCardWeight(a);
                    const weightB = this.rules.getCardWeight(b);
                    return weightA - weightB;
                });

                // 返回最小单张
                const minCard = sortedCards[0];
                return {
                    cards: [minCard],
                    type: {type: 'single', weight: this.rules.getCardWeight(minCard)},
                    description: `出单张 ${minCard.rank}${minCard.suit}`
                };
            }

            /**
             * 辅助函数：找对子
             */
            findPairs(handCards) {
                const rankGroups = {};
                handCards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                const pairs = [];
                for (const rank in rankGroups) {
                    if (rankGroups[rank].length >= 2) {
                        pairs.push(rankGroups[rank].slice(0, 2));
                    }
                }

                // 按权重排序
                return pairs.sort((a, b) => {
                    const weightA = this.rules.getCardWeight(a[0]);
                    const weightB = this.rules.getCardWeight(b[0]);
                    return weightA - weightB;
                });
            }

            /**
             * 辅助函数：找三张
             */
            findTriples(handCards) {
                const rankGroups = {};
                handCards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                const triples = [];
                for (const rank in rankGroups) {
                    if (rankGroups[rank].length >= 3) {
                        triples.push(rankGroups[rank].slice(0, 3));
                    }
                }

                // 按权重排序
                return triples.sort((a, b) => {
                    const weightA = this.rules.getCardWeight(a[0]);
                    const weightB = this.rules.getCardWeight(b[0]);
                    return weightA - weightB;
                });
            }

            /**
             * 辅助函数：找炸弹
             */
            findBombs(handCards) {
                const rankGroups = {};
                handCards.forEach(card => {
                    if (card.suit !== 'joker') {
                        if (!rankGroups[card.rank]) {
                            rankGroups[card.rank] = [];
                        }
                        rankGroups[card.rank].push(card);
                    }
                });

                const bombs = [];
                for (const rank in rankGroups) {
                    if (rankGroups[rank].length >= 4) {
                        bombs.push(rankGroups[rank].slice(0, 4));
                    }
                }

                // 按权重排序
                return bombs.sort((a, b) => {
                    const weightA = this.rules.getCardWeight(a[0]);
                    const weightB = this.rules.getCardWeight(b[0]);
                    return weightA - weightB;
                });
            }
            /**
             * 核心提示算法 - 严格按照优先级链
             * @param {Array} table - 上一手牌（null表示领出）
             * @param {Array} hand - 手牌
             * @param {number} level - 当前级牌点数
             * @returns {Array} - 推荐的牌组
             */
            hint(table, hand, level) {
                // 牌型优先表（由下到小）
                const TYPE_PRIORITY = [
                    'single',           // 单张
                    'pair',             // 对子
                    'triple',           // 三张
                    'tripleWithPair',   // 三带二
                    'straight',         // 顺子(5张)
                    'pairStraight',     // 连对
                    'tripleStraight',   // 钢板
                    'straightFlush',    // 同花顺
                    'bomb_4',           // 4炸
                    'bomb_5',           // 5炸
                    'bomb_6',           // 6炸
                    'bomb_7',           // 7炸
                    'bomb_8',           // 8炸
                    'kingBomb'          // 天王炸
                ];

                if (table === null) {
                    // 领出模式：从最小牌型开始找
                    for (const type of TYPE_PRIORITY) {
                        const cards = this.findSmallestOfType(hand, type, level);
                        if (cards && cards.length > 0) {
                            console.log(`[hint] 领出模式：找到最小${type}`, cards.map(c => c.rank + c.suit).join(','));
                            return cards;
                        }
                    }
                } else {
                    // 跟牌模式
                    const tableType = this.getCardType(table);
                    console.log(`[hint] 上家牌型:`, tableType ? `${tableType.type} (${table.map(c => c.rank + c.suit).join(',')})` : '未知');

                    if (!tableType) {
                        console.log(`[hint] 无法识别上家牌型`);
                        return [];
                    }

                    // 特殊情况：上家出大王或小王，优先找炸弹
                    if (tableType.type === 'single' && table.length === 1 &&
                        (table[0].rank === '大王' || table[0].rank === '小王')) {
                        console.log(`[hint] 上家出${table[0].rank}，优先找炸弹...`);
                        const bombCards = this.findSmallestBomb(hand);
                        if (bombCards && bombCards.length > 0) {
                            // 验证炸弹是否能打过上家
                            const validation = this.rules.validatePlay(bombCards, { cards: table }, hand);
                            if (validation.valid) {
                                console.log(`[hint] 炸弹：找到最小炸弹打${table[0].rank}`, bombCards.map(c => c.rank + c.suit).join(','));
                                return bombCards;
                            }
                        }
                        console.log(`[hint] 没有能打${table[0].rank}的炸弹`);
                        return []; // 没有炸弹就过牌
                    }

                    // 1. 优先找同类型最小组合
                    if (tableType.family !== 'bomb') {
                        console.log(`[hint] 上家出的是${tableType.type}，查找同类型...`);
                        const sameTypeCards = this.findSmallestOfType(hand, tableType.type, level, table);
                        if (sameTypeCards && sameTypeCards.length > 0) {
                            console.log(`[hint] 同类型：找到最小${tableType.type}`, sameTypeCards.map(c => c.rank + c.suit).join(','));
                            return sameTypeCards;
                        } else {
                            console.log(`[hint] 同类型：没找到能打过的${tableType.type}`);
                        }
                    }

                    // 2. 同型找不到，找最小炸弹
                    const bombCards = this.findSmallestBomb(hand);
                    if (bombCards && bombCards.length > 0) {
                        // 验证炸弹是否能打过上家
                        const validation = this.rules.validatePlay(bombCards, { cards: table }, hand);
                        if (validation.valid) {
                            console.log(`[hint] 炸弹：找到最小炸弹`, bombCards.map(c => c.rank + c.suit).join(','));
                            return bombCards;
                        }
                    }

                    // 3. 王牌炸弹（天王炸）
                    const jokers = hand.filter(c => c.suit === 'joker');
                    if (jokers.length === 4) {
                        console.log('[hint] 炸弹：找到天王炸');
                        return jokers;
                    }
                }

                // 找不到任何可出的牌
                return [];
            }

            /**
             * 辅助方法：检查是否能打过
             */
            canBeat(cards, targetCards) {
                if (!targetCards || targetCards.length === 0) return true;
                if (!cards || cards.length === 0) return false;

                const validation = this.rules.validatePlay(cards, { cards: targetCards }, this.players?.south?.cards || []);
                return validation.valid;
            }

            /**
             * 找到指定类型的最小牌组
             */
            findSmallestOfType(hand, type, level, targetPlay = null) {
                // 按点数分组
                const rankGroups = {};
                hand.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                switch (type) {
                    case 'single':
                        // 找最小单张
                        const singles = hand.filter(c => c.suit !== 'joker' || c.rank === '小王' || c.rank === '大王');
                        if (targetPlay) {
                            // 需要大于上家
                            const targetValue = this.getRankValue(targetPlay[0].rank);
                            const validSingles = singles.filter(c => this.getRankValue(c.rank) > targetValue);
                            if (validSingles.length > 0) {
                                return [validSingles[0]];
                            }
                        } else {
                            return singles.length > 0 ? [singles[0]] : [];
                        }
                        break;

                    case 'pair':
                        // 找最小对子
                        console.log(`[findSmallestOfType] 查找对子，手牌分组:`, Object.keys(rankGroups).map(rank => `${rank}:${rankGroups[rank].length}张`));

                        // 先按点数排序
                        const sortedRanks = Object.keys(rankGroups).sort((a, b) => this.getRankValue(a) - this.getRankValue(b));

                        for (const rank of sortedRanks) {
                            if (rankGroups[rank].length >= 2) {
                                const pair = rankGroups[rank].slice(0, 2);
                                console.log(`[findSmallestOfType] 尝试对子 ${rank}:`, pair.map(c => c.rank + c.suit).join(','));
                                if (!targetPlay || this.canBeat(pair, targetPlay)) {
                                    console.log(`[findSmallestOfType] 找到有效对子 ${rank}`);
                                    return pair;
                                } else {
                                    console.log(`[findSmallestOfType] 对子 ${rank} 不能打过上家`);
                                }
                            }
                        }

                        // 王对
                        const jokers = hand.filter(c => c.suit === 'joker');
                        if (jokers.length >= 2) {
                            const bigJoker = jokers.find(c => c.rank === '大王');
                            const smallJoker = jokers.find(c => c.rank === '小王');
                            if (bigJoker && smallJoker) {
                                console.log(`[findSmallestOfType] 找到王对`);
                                return [bigJoker, smallJoker];
                            }
                        }
                        break;

                    case 'triple':
                        // 找最小三张
                        for (const rank in rankGroups) {
                            if (rankGroups[rank].length >= 3) {
                                const triple = rankGroups[rank].slice(0, 3);
                                if (!targetPlay || this.canBeat(triple, targetPlay)) {
                                    return triple;
                                }
                            }
                        }
                        break;

                    case 'tripleWithPair':
                        // 找最小三带二
                        for (const tripleRank in rankGroups) {
                            if (rankGroups[tripleRank].length >= 3) {
                                const triple = rankGroups[tripleRank].slice(0, 3);
                                // 找最小的对子
                                for (const pairRank in rankGroups) {
                                    if (pairRank !== tripleRank && rankGroups[pairRank].length >= 2) {
                                        const pair = rankGroups[pairRank].slice(0, 2);
                                        const tripleWithPair = [...triple, ...pair];
                                        if (!targetPlay || this.canBeat(tripleWithPair, targetPlay)) {
                                            return tripleWithPair;
                                        }
                                    }
                                }
                            }
                        }
                        break;

                    // TODO: 实现其他牌型...
                    // 为了简化，先实现基本的单张和对子
                }

                return [];
            }

            /**
             * 找到指定张数的最小炸弹
             */
            findSmallestBomb(hand, count) {
                const rankGroups = {};
                hand.forEach(card => {
                    if (card.suit !== 'joker') {
                        if (!rankGroups[card.rank]) {
                            rankGroups[card.rank] = [];
                        }
                        rankGroups[card.rank].push(card);
                    }
                });

                for (const rank in rankGroups) {
                    if (rankGroups[rank].length >= count) {
                        return rankGroups[rank].slice(0, count);
                    }
                }

                return null;
            }

            showHint() {
                // 防止重复点击
                const now = Date.now();
                if (now - this.lastHintTime < 500) return;
                this.lastHintTime = now;

                // 检查是否轮到玩家
                if (this.currentPlayer !== 'south' || this.gameState !== 'playing') {
                    this.showMessage("不是你的回合");
                    return;
                }

                // 每次都重新生成提示，确保提示是最新的
                this.availableHints = this.generateSmartHints();

                // 如果已经在提示模式，切换到下一个
                if (this.isHintMode && this.availableHints.length > 1) {
                    this.currentHintIndex = (this.currentHintIndex + 1) % this.availableHints.length;
                    this.applyCurrentHint();
                    return;
                }

                // 无牌可出 - 自动过牌
                if (this.availableHints.length === 0) {
                    setTimeout(() => {
                        this.passTurn();
                    }, 500);
                    return;
                }

                // 进入提示模式
                this.isHintMode = true;
                this.currentHintIndex = 0;
                this.applyCurrentHint();
            }

            applyCurrentHint() {
                const hint = this.availableHints[this.currentHintIndex];

                // 清空之前的选择
                this.clearSelection();

                // 自动选牌 - 需要正确处理相同点数的多张牌
                const remainingCards = [...this.players.south.cards];

                hint.cards.forEach(targetCard => {
                    // 找到第一张匹配的牌
                    const cardIndex = this.players.south.cards.findIndex(c => {
                        // 使用唯一ID检查是否已经被选中
                        const isSelected = this.selectedCards.some(selected =>
                            selected.id === c.id
                        );
                        // 匹配规则 - 优先使用唯一ID
                        return !isSelected &&
                               (c.id === targetCard.id ||
                                (c.rank === targetCard.rank && c.suit === targetCard.suit));
                    });

                    if (cardIndex !== -1) {
                        this.selectCardByIndex(cardIndex);
                    }
                });

                // 强制更新UI（特别是出牌按钮状态）
                this.updateControlButtons();

                // 播放提示音效
                this.playSound('hint');
            }

            selectCardByIndex(index) {
                const cardElement = document.querySelectorAll('#southCards .player-card')[index];
                if (cardElement && !cardElement.classList.contains('selected')) {
                    cardElement.classList.add('selected');
                    this.selectedCards.push(this.players.south.cards[index]);
                    // 每次选牌后更新按钮状态
                    this.updateControlButtons();
                }
            }

            getCardTypeName(cardType) {
                if (!cardType) return '未知牌型';

                // 根据subtype和type共同判断
                if (cardType.family === 'bomb') {
                    if (cardType.subtype === 'kingBomb') {
                        return '天王炸';
                    } else if (cardType.subtype === 'straightFlush') {
                        return `${cardType.length || 5}张同花顺`;
                    } else {
                        // 普通炸弹
                        return `${cardType.count}张炸弹`;
                    }
                }

                const typeNames = {
                    'single': '单张',
                    'pair': '对子',
                    'triple': '三张',
                    'three_with_pair': '三带二',
                    'tripleWithPair': '三带二',
                    'straight': '顺子',
                    'pairStraight': '连对',
                    'consecutive_pairs': '连对',
                    'tripleStraight': '钢板',
                    'airplane': '钢板'
                };

                // 处理特殊牌型
                if (cardType.type === 'pair' && cardType.rank === '王对') {
                    return '王对';
                }
                if (cardType.type === 'triple' && cardType.rank === '王牌') {
                    return '三张王牌';
                }

                return typeNames[cardType.type] || cardType.type || '未知牌型';
            }

            reportCards() {
                const southCards = this.players.south.cards;
                const message = `你的手牌：${southCards.length}张`;
                this.showMessage(message, 'info');
            }

            // 找到所有可能的出牌
            findAllPossiblePlays(handCards, lastPlay) {
                const possiblePlays = [];

                // 准备rankGroups，供后续所有牌型使用
                const rankGroups = {};
                handCards.forEach(card => {
                    if (!rankGroups[card.rank]) {
                        rankGroups[card.rank] = [];
                    }
                    rankGroups[card.rank].push(card);
                });

                // 收集已用于其他牌型的牌（用于排除单张检查）
                const usedInOtherTypes = new Set();

                // 检查是否有单张能管住上家（如果是跟牌模式）
                let hasUsableSingle = false;
                if (lastPlay && lastPlay.cards && lastPlay.cards.length === 1) {
                    const lastType = this.rules.getCardType(lastPlay.cards);
                    if (lastType && lastType.type === 'single') {
                        const lastWeight = this.rules.getCardWeight(lastPlay.cards[0]);
                        // 检查是否有单张能管住
                        for (let rank in rankGroups) {
                            if (rankGroups[rank].length === 1) {
                                const weight = this.rules.getCardWeight(rankGroups[rank][0]);
                                if (weight > lastWeight) {
                                    hasUsableSingle = true;
                                    break;
                                }
                            }
                        }
                    }
                }

                // 智能排除策略：
                // 如果有单张能管住上家，不拆对子和三张
                // 只有在没有可用的单张时，才考虑拆对子
                for (let rank in rankGroups) {
                    const count = rankGroups[rank].length;
                    if (count >= 4) {
                        // 4张或更多：
                        // 如果有可用单张，完全不拆出单张（全部作为炸弹）
                        // 否则只保留最后一张作为单张
                        if (hasUsableSingle) {
                            // 全部标记为已使用，不拆出单张
                            rankGroups[rank].forEach(card =>
                                usedInOtherTypes.add(card.id || `${card.rank}${card.suit}`)
                            );
                        } else {
                            // 只保留最后一张作为单张
                            rankGroups[rank].slice(0, count - 1).forEach(card =>
                                usedInOtherTypes.add(card.id || `${card.rank}${card.suit}`)
                            );
                        }
                    } else if (count === 3) {
                        // 3张：如果有可用单张，不拆三张
                        if (hasUsableSingle) {
                            rankGroups[rank].slice(0, 2).forEach(card =>
                                usedInOtherTypes.add(card.id || `${card.rank}${card.suit}`)
                            );
                        }
                        // 否则允许作为单张
                    } else if (count === 2) {
                        // 2张：如果有可用单张，不拆对子
                        if (hasUsableSingle) {
                            rankGroups[rank].forEach(card =>
                                usedInOtherTypes.add(card.id || `${card.rank}${card.suit}`)
                            );
                        }
                        // 否则允许这两张作为单张或对子使用
                    }
                    // count === 1 时，可以作为单张
                }

                // 如果没有lastPlay或没有cards，说明是首出
                if (!lastPlay || !lastPlay.cards) {
                    // 首出时，优先出单张小牌
                    // 找出所有单张（排除已组成对子的牌）
                    const singles = [];
                    for (let card of handCards) {
                        const cardId = card.id || `${card.rank}${card.suit}`;
                        if (!usedInOtherTypes.has(cardId)) {
                            const type = this.rules.getCardType([card]);
                            if (type) {
                                singles.push({
                                    cards: [card],
                                    type: type,
                                    score: this.getRankValue(card.rank)
                                });
                            }
                        }
                    }
                    // 按从小到大排序
                    singles.sort((a, b) => a.score - b.score);
                    return singles;
                }

                // 获取上家牌型
                const lastType = this.rules.getCardType(lastPlay.cards);
                console.log(`[findAllPossiblePlays] 上家出牌: ${lastPlay.cards.map(c => c.rank + c.suit).join(',')}, 类型: ${lastType ? lastType.type : 'null'}`);
                if (!lastType) return [];

                // 使用规则引擎验证出牌
                // 只有当上家也是单张时，才考虑出单张
                // 注意：只考虑真正的单张，不拆对子、三张等其他牌型
                console.log(`[findAllPossiblePlays] 检查单张: 上家类型是 ${lastType.type}`);
                if (lastType.type === 'single') {
                    console.log(`[findAllPossiblePlays] 上家出的是单张，检查手牌中的单张（排除已组成对子的牌）`);
                    for (let card of handCards) {
                        const cardId = card.id || `${card.rank}${card.suit}`;
                        // 跳过已组成其他牌型的牌
                        if (usedInOtherTypes.has(cardId)) {
                            console.log(`[findAllPossiblePlays] 跳过已使用的牌: ${card.rank}${card.suit}`);
                            continue;
                        }
                        const validation = this.rules.validatePlay([card], lastPlay, handCards);
                        if (validation.valid) {
                            possiblePlays.push({
                                cards: [card],
                                type: validation.type
                            });
                            console.log(`[findAllPossiblePlays] 找到合法单张: ${card.rank}${card.suit}`);
                        }
                    }
                } else {
                    console.log(`[findAllPossiblePlays] 上家出的是 ${lastType.type}，不能出单张`);
                }

                // 之前的rankGroups已经准备好了

                // 尝试对子 - 自己查找
                // 只有当上家出的是对子或者没有限制时才能出对子
                if (!lastType || lastType.type === 'pair') {

                    // 提取对子
                    for (let rank in rankGroups) {
                        const group = rankGroups[rank];
                        if (group.length >= 2) {
                            // 尝试所有可能的组合
                            for (let i = 0; i < group.length - 1; i++) {
                                for (let j = i + 1; j < group.length; j++) {
                                    const pair = [group[i], group[j]];
                                    const validation = this.rules.validatePlay(pair, lastPlay, handCards);
                                    console.log(`[对子检查] 尝试 ${rank}: ${pair.map(c => c.rank + c.suit).join(', ')}, 验证:`, validation);
                                    if (validation.valid) {
                                        possiblePlays.push({
                                            cards: pair,
                                            type: validation.type
                                        });
                                        console.log(`[对子检查] ✓ ${rank} 可以出`);
                                    }
                                }
                            }
                        }
                    }
                }

                // 尝试三张 - 自己查找
                // 只有当上家出的是三张或者没有限制时才能出三张
                console.log(`[findAllPossiblePlays] 检查三张: lastType=${lastType ? lastType.type : 'null'}, family=${lastType ? lastType.family : 'null'}`);
                if (!lastType || lastType.type === 'triple') {
                    for (let rank in rankGroups) {
                        const group = rankGroups[rank];
                        if (group.length >= 3) {
                            const triple = [group[0], group[1], group[2]];
                            const validation = this.rules.validatePlay(triple, lastPlay, handCards);
                            if (validation.valid) {
                                possiblePlays.push({
                                    cards: triple,
                                    type: validation.type
                                });
                                console.log(`[三张检查] ✓ ${rank} 可以出`);
                            }
                        }
                    }
                }

                // 尝试三带二 - 自己查找
                // 只有当上家出的是三带二或者没有限制时才能出三带二
                if (!lastType || lastType.type === 'tripleWithPair') {
                    for (let tripleRank in rankGroups) {
                        const tripleGroup = rankGroups[tripleRank];
                        if (tripleGroup.length >= 3) {
                            const triple = [tripleGroup[0], tripleGroup[1], tripleGroup[2]];

                            // 查找所有可能的对子
                            for (let pairRank in rankGroups) {
                                if (pairRank !== tripleRank && rankGroups[pairRank].length >= 2) {
                                    const pairGroup = rankGroups[pairRank];
                                    const pair = [pairGroup[0], pairGroup[1]];

                                    // 组合成三带二
                                    const tripleWithPair = [...triple, ...pair];
                                    const validation = this.rules.validatePlay(tripleWithPair, lastPlay, handCards);
                                    if (validation.valid) {
                                        possiblePlays.push({
                                            cards: tripleWithPair,
                                            type: validation.type
                                        });
                                        console.log(`[三带二检查] ✓ ${tripleRank}带${pairRank} 可以出`);
                                    }
                                }
                            }
                        }
                    }
                }

                // 尝试顺子 - 自己查找（5张及以上连续单牌）
                // 只有当上家出的是顺子或者没有限制时才能出顺子
                if (!lastType || lastType.type === 'straight') {
                    // 首先收集所有非王牌和非2的牌
                    const nonJokerCards = handCards.filter(c =>
                        c.suit !== 'joker' &&
                        c.rank !== '2' &&
                        c.rank !== '小王' &&
                        c.rank !== '大王'
                    );

                    // 按点数排序
                    nonJokerCards.sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));

                    // 查找可能的顺子
                    for (let startIdx = 0; startIdx <= nonJokerCards.length - 5; startIdx++) {
                        for (let length = 5; length <= Math.min(nonJokerCards.length - startIdx, 12); length++) {
                            const straightCards = nonJokerCards.slice(startIdx, startIdx + length);

                            // 检查是否连续
                            let isConsecutive = true;
                            for (let i = 1; i < straightCards.length; i++) {
                                const prevValue = this.getRankValue(straightCards[i-1].rank);
                                const currValue = this.getRankValue(straightCards[i].rank);
                                if (currValue !== prevValue + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }

                            if (isConsecutive) {
                                const validation = this.rules.validatePlay(straightCards, lastPlay, handCards);
                                if (validation.valid) {
                                    possiblePlays.push({
                                        cards: straightCards,
                                        type: validation.type
                                    });
                                    console.log(`[顺子检查] ✓ ${length}张顺子可以出`);
                                }
                            }
                        }
                    }
                }

                // 尝试连对 - 自己查找（3对及以上连续对子）
                // 只有当上家出的是连对或者没有限制时才能出连对
                if (!lastType || lastType.type === 'pairStraight') {
                    // 首先收集所有可用的对子
                    const availablePairs = [];
                    for (let rank in rankGroups) {
                        if (rankGroups[rank].length >= 2) {
                            availablePairs.push({
                                rank: rank,
                                value: this.getRankValue(rank),
                                cards: [rankGroups[rank][0], rankGroups[rank][1]]
                            });
                        }
                    }

                    // 按点数排序
                    availablePairs.sort((a, b) => a.value - b.value);

                    // 查找连续的对子组合
                    for (let startIdx = 0; startIdx <= availablePairs.length - 3; startIdx++) {
                        for (let length = 3; length <= availablePairs.length - startIdx; length++) {
                            const selectedPairs = availablePairs.slice(startIdx, startIdx + length);

                            // 检查是否连续
                            let isConsecutive = true;
                            for (let i = 1; i < selectedPairs.length; i++) {
                                if (selectedPairs[i].value !== selectedPairs[i-1].value + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }

                            if (isConsecutive) {
                                // 组合所有对子的牌
                                const pairStraightCards = [];
                                selectedPairs.forEach(pair => {
                                    pairStraightCards.push(...pair.cards);
                                });

                                const validation = this.rules.validatePlay(pairStraightCards, lastPlay, handCards);
                                if (validation.valid) {
                                    possiblePlays.push({
                                        cards: pairStraightCards,
                                        type: validation.type
                                    });
                                    console.log(`[连对检查] ✓ ${length}对连对可以出`);
                                }
                            }
                        }
                    }
                }

                // 尝试钢板 - 自己查找（2个及以上连续三张）
                // 只有当上家出的是钢板或者没有限制时才能出钢板
                if (!lastType || lastType.type === 'tripleStraight') {
                    // 首先收集所有可用的三张
                    const availableTriples = [];
                    for (let rank in rankGroups) {
                        if (rankGroups[rank].length >= 3) {
                            availableTriples.push({
                                rank: rank,
                                value: this.getRankValue(rank),
                                cards: [rankGroups[rank][0], rankGroups[rank][1], rankGroups[rank][2]]
                            });
                        }
                    }

                    // 按点数排序
                    availableTriples.sort((a, b) => a.value - b.value);

                    // 查找连续的三张组合
                    for (let startIdx = 0; startIdx <= availableTriples.length - 2; startIdx++) {
                        for (let length = 2; length <= availableTriples.length - startIdx; length++) {
                            const selectedTriples = availableTriples.slice(startIdx, startIdx + length);

                            // 检查是否连续
                            let isConsecutive = true;
                            for (let i = 1; i < selectedTriples.length; i++) {
                                if (selectedTriples[i].value !== selectedTriples[i-1].value + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }

                            if (isConsecutive) {
                                // 组合所有三张的牌
                                const tripleStraightCards = [];
                                selectedTriples.forEach(triple => {
                                    tripleStraightCards.push(...triple.cards);
                                });

                                const validation = this.rules.validatePlay(tripleStraightCards, lastPlay, handCards);
                                if (validation.valid) {
                                    possiblePlays.push({
                                        cards: tripleStraightCards,
                                        type: validation.type
                                    });
                                    console.log(`[钢板检查] ✓ ${length}个三张钢板可以出`);
                                }
                            }
                        }
                    }
                }

                // 尝试炸弹 - 自己查找
                for (let rank in rankGroups) {
                    const group = rankGroups[rank];
                    // 尝试4张到8张炸弹
                    for (let bombCount = 4; bombCount <= Math.min(group.length, 8); bombCount++) {
                        const bomb = group.slice(0, bombCount);
                        console.log(`[findAllPossiblePlays] 尝试${bombCount}张${rank}: ${bomb.map(c => c.rank + c.suit).join(', ')}`);
                        const validation = this.rules.validatePlay(bomb, lastPlay, handCards);
                        console.log(`[findAllPossiblePlays] 验证结果:`, validation);
                        if (validation.valid) {
                            possiblePlays.push({
                                cards: bomb,
                                type: validation.type
                            });
                            console.log(`[findAllPossiblePlays] ✓ ${bombCount}张${rank}可以出`);
                        } else {
                            console.log(`[findAllPossiblePlays] ✗ ${bombCount}张${rank}不能出: ${validation.message}`);
                        }
                    }
                }

                // 尝试同花顺 - 自己查找（5张以上同花色连续牌）
                // 按花色分组
                const suitGroups = {};
                handCards.forEach(card => {
                    if (card.suit !== 'joker' && card.rank !== '2' &&
                        card.rank !== '小王' && card.rank !== '大王') {
                        if (!suitGroups[card.suit]) {
                            suitGroups[card.suit] = [];
                        }
                        suitGroups[card.suit].push(card);
                    }
                });

                // 每个花色查找同花顺
                for (let suit in suitGroups) {
                    const suitCards = suitGroups[suit];
                    // 按点数排序
                    suitCards.sort((a, b) => this.getRankValue(a.rank) - this.getRankValue(b.rank));

                    // 查找可能的同花顺
                    for (let startIdx = 0; startIdx <= suitCards.length - 5; startIdx++) {
                        for (let length = 5; length <= Math.min(suitCards.length - startIdx, 12); length++) {
                            const straightFlushCards = suitCards.slice(startIdx, startIdx + length);

                            // 检查是否连续
                            let isConsecutive = true;
                            for (let i = 1; i < straightFlushCards.length; i++) {
                                const prevValue = this.getRankValue(straightFlushCards[i-1].rank);
                                const currValue = this.getRankValue(straightFlushCards[i].rank);
                                if (currValue !== prevValue + 1) {
                                    isConsecutive = false;
                                    break;
                                }
                            }

                            if (isConsecutive) {
                                const validation = this.rules.validatePlay(straightFlushCards, lastPlay, handCards);
                                if (validation.valid) {
                                    possiblePlays.push({
                                        cards: straightFlushCards,
                                        type: validation.type
                                    });
                                }
                            }
                        }
                    }
                }

                // 检查天王炸弹
                const jokers = handCards.filter(c => c.suit === 'joker');
                if (jokers.length === 4) {
                    const validation = this.rules.validatePlay(jokers, lastPlay, handCards);
                    if (validation.valid) {
                        possiblePlays.push({
                            cards: jokers,
                            type: validation.type
                        });
                    }
                }

                // 过滤：只保留能打过上家的牌
                const filteredPlays = possiblePlays.filter(play => {
                    // 确保type存在
                    if (!play || !play.type) {
                        return false;
                    }
                    const playType = play.type;

                    // 使用规则引擎直接验证
                    const validation = this.rules.validatePlay(play.cards, lastPlay, handCards);
                    return validation.valid;
                });

                // 排序：按照用户需求的优先级
                const sortedPlays = filteredPlays.sort((a, b) => {
                    // 确保a和b存在
                    if (!a || !b) return 0;

                    // 确保type存在
                    const aType = a.type || {};
                    const bType = b.type || {};
                    const aFamily = aType.family || 'normal';
                    const bFamily = bType.family || 'normal';

                    // 1. 优先匹配同类型的牌
                    if (lastType && lastType.family !== 'bomb') {
                        // a与上家类型相同，b不同
                        if (aType.type === lastType.type && bType.type !== lastType.type) return -1;
                        // b与上家类型相同，a不同
                        if (bType.type === lastType.type && aType.type !== lastType.type) return 1;
                    }

                    // 2. 同类型牌中，优先推荐小牌
                    if (aType.type === bType.type) {
                        return (aType.weight || 0) - (bType.weight || 0);
                    }

                    // 3. 根据规则文档的牌型大小顺序排序（从小到大）
                    const typeOrder = {
                        'single': 1,
                        'pair': 2,
                        'triple': 3,
                        'tripleWithPair': 4,
                        'straight': 5,
                        'pairStraight': 6,
                        'tripleStraight': 7,
                        'bomb_4': 8,        // 四炸
                        'bomb_5': 9,        // 五炸
                        'straightFlush': 10, // 同花顺
                        'bomb_6': 11,       // 六炸
                        'bomb_7': 12,       // 七炸
                        'bomb_8': 13,       // 八炸
                        'kingBomb': 14      // 天王炸
                    };

                    // 获取类型顺序值
                    const getOrderValue = (type, family, count) => {
                        if (family === 'bomb') {
                            if (type === 'kingBomb') return typeOrder.kingBomb;
                            if (type === 'straightFlush') return typeOrder.straightFlush;
                            return typeOrder[`bomb_${count}`] || 8;
                        }
                        return typeOrder[type] || 0;
                    };

                    const aOrder = getOrderValue(aType.type, aFamily, aType.count);
                    const bOrder = getOrderValue(bType.type, bFamily, bType.count);

                    return aOrder - bOrder;
                });

                console.log(`[findAllPossiblePlays] 最终找到 ${sortedPlays.length} 个合法出牌`);
                sortedPlays.forEach((play, index) => {
                    console.log(`[findAllPossiblePlays] ${index}: ${play.cards.map(c => c.rank + c.suit).join(',')} (${play.type.type})`);
                });

                // 如果是首出，返回所有可能；如果有上家且filteredPlays为空，说明过牌
                return sortedPlays;
            }

            // 尝试炸弹
            tryBombs(handCards, possiblePlays, lastType, lastPlay) {
                const rankGroups = this.groupCardsByRank(handCards);

                // 检查4张炸弹
                for (let [rank, cards] of Object.entries(rankGroups)) {
                    if (cards.length >= 4) {
                        const bombCards = cards.slice(0, 4);
                        // 使用规则引擎识别炸弹
                        let bombType = null;
                        if (this.useAdvancedEngine && this.ruleEngine) {
                            bombType = this.ruleEngine.getCardType(bombCards);
                        } else {
                            bombType = this.getCardType(bombCards);
                        }

                        if (bombType && bombType.type === 'bomb') {
                            // 如果上家不是炸弹，炸弹可以打任何牌
                            if (lastType.type !== 'bomb') {
                                possiblePlays.push({
                                    cards: bombCards,
                                    type: bombType
                                });
                            } else {
                                // 如果上家也是炸弹，比较大小
                                let canBeat = false;
                                if (this.ruleEngine) {
                                    canBeat = this.ruleEngine.compareCardTypes(bombType, lastType) > 0;
                                } else {
                                    // 简单比较：比较炸弹的主牌值
                                    canBeat = this.getRankValue(bombCards[0].rank) > this.getRankValue(lastPlay.cards[0].rank);
                                }

                                if (canBeat) {
                                    possiblePlays.push({
                                        cards: bombCards,
                                        type: bombType
                                    });
                                }
                            }
                        }
                    }
                }

                // 检查王牌特殊牌型
                const jokers = handCards.filter(card => card.suit === 'joker');

                // 四张王牌 - 天王炸
                if (jokers.length === 4) {
                    possiblePlays.push({
                        cards: jokers.slice(0, 4),
                        type: { type: 'bomb', subtype: 'kingBomb', family: 'bomb' }
                    });
                }

                // 三张王牌 - 三张
                if (jokers.length === 3) {
                    possiblePlays.push({
                        cards: jokers.slice(0, 3),
                        type: { type: 'triple', family: 'normal', rank: '王牌' }
                    });
                }

                // 两张王牌 - 王对
                if (jokers.length === 2) {
                    possiblePlays.push({
                        cards: jokers.slice(0, 2),
                        type: { type: 'pair', family: 'normal', rank: '王对' }
                    });
                }
            }

            // 找单牌
            findSingles(handCards, possiblePlays, lastType, lastPlay) {
                // 如果上家出的是炸弹，不能用单牌打
                if (lastType.family === 'bomb') {
                    return;
                }

                const lastCards = lastType.cards || [];
                const lastValue = lastCards.length > 0 ? this.getRankValue(lastCards[0].rank) : (lastType.rank || lastType.highCard || 0);

                for (let card of handCards) {
                    const cardValue = this.getRankValue(card.rank);
                    if (cardValue > lastValue) {
                        const lastPlayForValidation = {
                            cards: lastCards,
                            type: lastType
                        };
                        const validation = this.rules.validatePlay([card], lastPlayForValidation, handCards);
                        if (validation.valid) {
                            possiblePlays.push({
                                cards: [card],
                                type: validation.type
                            });
                        }
                    }
                }
            }

  
            // 比较出牌大小
            comparePlayValues(play1, play2) {
                if (!play1 || !play2 || !play1.type || !play2.type) return 0;

                // 直接比较权重
                const weight1 = play1.type.weight || 0;
                const weight2 = play2.type.weight || 0;

                return weight1 - weight2;
            }

            // 显示游戏内消息
            showMessage(message, type = 'info') {
                const messageBubble = document.getElementById('messageBubble');
                if (messageBubble) {
                    messageBubble.textContent = message;
                    messageBubble.className = 'message-bubble';
                    messageBubble.style.display = 'block';

                    // 根据消息类型添加样式
                    if (type === 'error') {
                        messageBubble.style.background = '#ff4444';
                        messageBubble.style.animation = 'shake 0.5s';
                    } else if (type === 'success') {
                        messageBubble.style.background = '#4CAF50';
                    } else {
                        messageBubble.style.background = '#2196F3';
                    }

                    // 3秒后隐藏
                    setTimeout(() => {
                        messageBubble.style.display = 'none';
                        messageBubble.style.animation = '';
                    }, 3000);
                }
            }

            // 显示头游状态提示
            showHeadPlayerStatus(message) {
                const statusElement = document.getElementById('headPlayerStatus');
                if (statusElement) {
                    statusElement.textContent = message;
                    statusElement.classList.add('visible');
                }
            }

            // 隐藏头游状态提示
            hideHeadPlayerStatus() {
                const statusElement = document.getElementById('headPlayerStatus');
                if (statusElement) {
                    statusElement.classList.remove('visible');
                }
            }

            // 更新排名图标显示
            updateRankBadge(position, rank) {
                const rankBadge = document.getElementById(`${position}RankBadge`);
                if (!rankBadge) return;

                // 排名图标：🥇 🥈 🥉 🏅
                const rankIcons = ['🥇', '🥈', '🥉', '🏅'];
                const rankNames = ['头游', '二游', '三游', '末游'];

                // 设置排名图标
                rankBadge.textContent = rankIcons[rank - 1];
                rankBadge.className = `rank-badge rank-${rank}`;

                console.log(`[排名图标] ${position} 获得${rankNames[rank - 1]}`);
            }

            // 清除所有排名图标
            clearAllRankBadges() {
                const positions = ['south', 'west', 'north', 'east'];
                positions.forEach(pos => {
                    const rankBadge = document.getElementById(`${pos}RankBadge`);
                    if (rankBadge) {
                        rankBadge.textContent = '';
                        rankBadge.className = 'rank-badge';
                    }
                });
                console.log('[排名图标] 已清除所有排名图标');
            }

            // ========================================
            // CARD COUNT DISPLAY - 剩余牌数显示
            // ========================================

            // 初始化剩余牌数徽章元素
            initCardCountBadges() {
                const positions = ['north', 'west', 'east'];

                positions.forEach(pos => {
                    // 检查是否已存在
                    if (document.getElementById(`${pos}CardCount`)) return;

                    const avatar = document.querySelector(`.player-${pos} .player-avatar-simple`);
                    if (!avatar) return;

                    const badge = document.createElement('span');
                    badge.id = `${pos}CardCount`;
                    badge.className = 'card-count-badge';
                    avatar.appendChild(badge);
                });

                console.log('[剩余牌数] 徽章元素已初始化');
            }

            // 更新剩余牌数显示
            updateCardCountDisplay() {
                const positions = ['north', 'west', 'east'];

                positions.forEach(pos => {
                    const badge = document.getElementById(`${pos}CardCount`);
                    if (!badge) return;

                    const cardCount = this.players[pos].cards.length;

                    // 剩余10张或更少才显示
                    if (cardCount > 0 && cardCount <= 10) {
                        badge.textContent = cardCount;
                        badge.classList.add('show-count');
                    } else {
                        badge.textContent = '';
                        badge.classList.remove('show-count');
                    }
                });
            }

            // ========================================
            // COUNTDOWN TIMER - 倒计时管理方法
            // ========================================

            startCountdown(player) {
                if (!this.countdownConfig.enabled) return;

                this.stopCountdown(player);
                this.countdownRemaining[player] = this.countdownConfig.duration;

                // 重置urgent类（新一轮倒计时开始）
                const el = document.getElementById(player + 'Timer');
                if (el) {
                    el.classList.remove('urgent');
                }

                // 显示倒计时（南方玩家由容器控制，其他玩家由visible类控制）
                this.showCountdown(player);
                this.updateCountdownDisplay(player);

                this.countdownTimers[player] = setInterval(() => {
                    this.countdownRemaining[player]--;
                    this.updateCountdownDisplay(player);
                    if (this.countdownRemaining[player] <= 0) {
                        this.stopCountdown(player);
                        this.onCountdownTimeout(player);
                    }
                }, 1000);
            }

            stopCountdown(player) {
                // 清除倒计时interval
                if (this.countdownTimers[player]) {
                    clearInterval(this.countdownTimers[player]);
                    this.countdownTimers[player] = null;
                }
                // 清除倒计时结束后的timeout（防止竞态条件）
                if (this.countdownTimeoutIds[player]) {
                    clearTimeout(this.countdownTimeoutIds[player]);
                    this.countdownTimeoutIds[player] = null;
                }
                // 隐藏倒计时（南方玩家由容器控制，其他玩家由visible类控制）
                this.hideCountdown(player);
            }

            stopAllCountdowns() {
                ['south', 'north', 'west', 'east'].forEach(player => {
                    this.stopCountdown(player);
                });
            }

            showCountdown(player) {
                // 只对非南方玩家使用visible类控制
                if (player !== 'south') {
                    const el = document.getElementById(player + 'Timer');
                    if (el) el.classList.add('visible');
                }
            }

            hideCountdown(player) {
                // 移除visible类（保留urgent类，直到倒计时重新开始）
                const el = document.getElementById(player + 'Timer');
                if (el) {
                    el.classList.remove('visible');
                }
            }

            updateCountdownDisplay(player) {
                const el = document.getElementById(player + 'Timer');
                if (!el) return;
                const secEl = el.querySelector('.timer-seconds');
                if (secEl) secEl.textContent = this.countdownRemaining[player];
                if (this.countdownRemaining[player] <= this.countdownConfig.warningThreshold) {
                    el.classList.add('urgent');
                } else {
                    el.classList.remove('urgent');
                }
            }

            onCountdownTimeout(player) {
                if (player === 'south' && this.countdownConfig.autoPassOnTimeout) {
                    // 判断是否为首出（当前轮次没有人出牌）
                    const isFirstPlay = this.currentRoundCards.length === 0 ||
                                        !this.currentRoundCards.some(play => play.cards && play.cards.length > 0);

                    if (isFirstPlay) {
                        // 首出：自动出最小的单牌
                        const hand = this.players.south.cards;
                        if (hand && hand.length > 0) {
                            // 找出最小的一张牌（使用getRankValue正确处理级牌）
                            let smallestCard = hand[0];
                            let smallestValue = this.getRankValue(hand[0].rank);
                            for (let card of hand) {
                                const value = this.getRankValue(card.rank);
                                if (value < smallestValue) {
                                    smallestCard = card;
                                    smallestValue = value;
                                }
                            }
                            // 自动出这张最小的牌
                            // 保存timeout ID，用于后续取消
                            this.countdownTimeoutIds[player] = setTimeout(() => {
                                // 再次检查是否还是当前玩家（防止竞态条件）
                                if (this.currentPlayer === 'south' && this.gameState === 'playing') {
                                    this.selectedCards = [smallestCard];
                                    this.playCards(true); // 传入 true 表示是自动操作
                                }
                                this.countdownTimeoutIds[player] = null;
                            }, 500);
                        }
                    } else {
                        // 非首出：自动过牌
                        // 保存timeout ID，用于后续取消
                        this.countdownTimeoutIds[player] = setTimeout(() => {
                            // 再次检查是否还是当前玩家（防止竞态条件）
                            if (this.currentPlayer === 'south' && this.gameState === 'playing') {
                                this.passTurn(true); // 传入 true 表示是自动操作
                            }
                            this.countdownTimeoutIds[player] = null;
                        }, 500);
                    }
                }
            }

            // 决定首局首出玩家（随机决定）
            determineFirstPlayer() {
                // 非首局，由上局末游先出
                if (!this.isFirstGame && this.lastGameLoser) {
                    this.showMessage(`${this.players[this.lastGameLoser].name}是上局末游，优先出牌`, 'info');
                    return this.lastGameLoser;
                }

                // 首局随机决定首出玩家
                const order = ['south', 'west', 'north', 'east'];
                const firstPlayer = order[Math.floor(Math.random() * 4)];

                this.showMessage(`${this.players[firstPlayer].name}随机获得首出权`, 'info');
                return firstPlayer;
            }

            // 获取所有牌
            getAllCards() {
                const allCards = [];
                const suits = ['♠', '♥', '♣', '♦'];
                const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

                // 每种牌型4张
                for (let suit of suits) {
                    for (let rank of ranks) {
                        for (let i = 0; i < 4; i++) {
                            allCards.push({ suit, rank });
                        }
                    }
                }

                // 大小王
                allCards.push({ suit: 'joker', rank: 'small' });
                allCards.push({ suit: 'joker', rank: 'big' });

                return allCards;
            }

  
            // ========================================
            // GAME RESULT & RECORDS - 游戏结果与战绩
            // ========================================

            // 初始化战绩系统
            initRecordsSystem() {
                this.gameRecords = JSON.parse(localStorage.getItem('guandan_game_records') || '[]');
            }

            // 保存游戏记录
            saveGameRecord(result) {
                const record = {
                    gameId: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    timestamp: Date.now(),
                    date: new Date().toLocaleDateString('zh-CN'),
                    dateDetail: new Date().toLocaleString('zh-CN'),
                    winner: result.winner.includes('己方') ? 'A' : 'B',
                    resultType: result.type,
                    levelsUp: result.levelsUp,
                    rankings: result.rankings,
                    teamALevelBefore: this.teamAScore,
                    teamALevelAfter: result.winner.includes('己方') ? this.teamAScore + result.levelsUp : this.teamAScore,
                    teamBLevelBefore: this.teamBScore,
                    teamBLevelAfter: result.winner.includes('己方') ? this.teamBScore : this.teamBScore + result.levelsUp
                };

                this.gameRecords.unshift(record);

                if (this.gameRecords.length > 100) {
                    this.gameRecords = this.gameRecords.slice(0, 100);
                }

                localStorage.setItem('guandan_game_records', JSON.stringify(this.gameRecords));
            }

            // 显示游戏结果面板
            showGameResultModal(result) {
                const modal = document.getElementById('gameResultModal');
                if (!modal) return;

                // 检查是否通过A关（游戏结束）
                const isGameWon = result.gameOver === true && result.winnerIsFinal === true;

                // 胜负信息 - 简化为一行
                const winnerDiv = modal.querySelector('.result-winner');
                if (isGameWon) {
                    // 通过A关，赢得比赛
                    const winnerTeam = result.winner.includes('己方') ? '己方（A队）' : '对方（B队）';
                    winnerDiv.textContent = `🎉 ${winnerTeam}通过A关，赢得比赛！🎉`;
                    winnerDiv.classList.add('winner-our'); // 金色庆祝样式
                } else {
                    winnerDiv.textContent = result.description;
                    winnerDiv.classList.remove('winner-our', 'winner-enemy');
                    winnerDiv.classList.add(result.winner.includes('己方') ? 'winner-our' : 'winner-enemy');
                }

                // 队伍级数对比
                const teamsLevelDiv = modal.querySelector('.result-teams-level');
                const teamALevel = teamsLevelDiv.querySelector('.team-a .team-level-value');
                const teamBLevel = teamsLevelDiv.querySelector('.team-b .team-level-value');
                teamALevel.textContent = `${this.teamAScore}级`;
                teamBLevel.textContent = `${this.teamBScore}级`;

                // 保存游戏结束状态到实例变量
                this.isGameWon = isGameWon;

                // 玩家排名卡片 - 2x2网格
                const rankingsDiv = modal.querySelector('.result-rankings');
                const rankIcons = ['🥇', '🥈', '🥉', '🏅'];
                const playerAvatars = { south: '👤', north: '🌸', west: '🤴', east: '💪' };
                const allyPlayers = ['south', 'north'];
                const enemyPlayers = ['west', 'east'];

                rankingsDiv.innerHTML = result.rankings.map((pos, idx) => {
                    const player = this.players[pos];
                    const isAlly = allyPlayers.includes(pos);
                    const rankClass = `rank-${idx + 1}`;

                    return `
                        <div class="player-result-card ${isAlly ? 'ally' : 'enemy'}">
                            <div class="player-avatar">${playerAvatars[pos]}</div>
                            <div class="player-info">
                                <div class="player-name-row">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-rank-icon ${rankClass}">${rankIcons[idx]}</span>
                                </div>
                                <span class="player-cards-count">${player.cards.length}张</span>
                            </div>
                        </div>
                    `;
                }).join('');

                modal.classList.remove('d-none');
                this.bindGameResultModalEvents();
            }

            // 绑定游戏结果面板事件
            bindGameResultModalEvents() {
                const modal = document.getElementById('gameResultModal');
                const closeBtn = document.getElementById('closeGameResult');
                const backdrop = document.getElementById('gameResultBackdrop');
                const newGameBtn = document.getElementById('newGameBtn');
                const viewRecordsBtn = document.getElementById('viewRecordsBtn');

                // 根据游戏是否结束来决定按钮文字和行为
                const isGameWon = this.isGameWon === true;
                if (isGameWon) {
                    newGameBtn.textContent = '🎮 新游戏';
                } else {
                    newGameBtn.textContent = '🔄 继续游戏';
                }

                // 清理事件监听器
                const cleanup = () => {
                    closeBtn.removeEventListener('click', closeHandler);
                    backdrop.removeEventListener('click', closeHandler);
                    newGameBtn.removeEventListener('click', newGameHandler);
                    viewRecordsBtn.removeEventListener('click', viewRecordsHandler);
                };

                // 关闭面板
                const closeHandler = () => {
                    modal.classList.add('d-none');
                    cleanup();
                    if (isGameWon) {
                        this.resetEntireGame(); // 重置整个游戏
                    } else {
                        this.startNewGame();
                    }
                };

                // 继续游戏/新游戏按钮
                const newGameHandler = () => {
                    modal.classList.add('d-none');
                    cleanup();
                    if (isGameWon) {
                        this.resetEntireGame(); // 重置整个游戏
                    } else {
                        this.startNewGame();
                    }
                };

                // 查看战绩按钮 - 只关闭面板，不开始新游戏（战绩面板有自己的关闭按钮）
                const viewRecordsHandler = () => {
                    modal.classList.add('d-none');
                    cleanup();
                    this.startNewGame(); // 先开始新游戏
                    this.showRecordsModal(); // 再显示战绩面板
                };

                closeBtn.addEventListener('click', closeHandler);
                backdrop.addEventListener('click', closeHandler);
                newGameBtn.addEventListener('click', newGameHandler);
                viewRecordsBtn.addEventListener('click', viewRecordsHandler);
            }

            // 显示历史战绩面板
            showRecordsModal() {
                const modal = document.getElementById('recordsModal');
                if (!modal) {
                    this.showMessage('战绩面板组件未找到', 'error');
                    return;
                }

                const stats = this.calculateRecordsStats();

                // 统计摘要 - 使用CSS类控制颜色
                const summaryDiv = modal.querySelector('.records-summary');
                const winRateClass = stats.winRate >= 50 ? 'win-high' : 'win-low';

                summaryDiv.innerHTML = `
                    <div class="summary-card">
                        <div class="summary-value">${stats.totalGames}</div>
                        <div class="summary-label">总局数</div>
                    </div>
                    <div class="summary-card ${winRateClass}">
                        <div class="summary-value">${stats.winRate}%</div>
                        <div class="summary-label">胜率</div>
                    </div>
                    <div class="summary-card">
                        <div class="summary-value">+${stats.totalLevelsUp}</div>
                        <div class="summary-label">总升级</div>
                    </div>
                `;

                // 历史记录列表 - 使用CSS类控制样式
                const listDiv = modal.querySelector('.records-list');
                if (this.gameRecords.length === 0) {
                    listDiv.innerHTML = '<div class="records-empty">暂无游戏记录</div>';
                } else {
                    listDiv.innerHTML = this.gameRecords.map(record => {
                        const isWin = record.winner === 'A';
                        const resultClass = isWin ? 'win' : 'lose';
                        const resultText = isWin ? '🏆 胜利' : '❌ 失败';
                        return `
                            <div class="record-item ${resultClass}">
                                <div class="record-main">
                                    <div class="record-title">${resultText} - ${record.resultType}</div>
                                    <div class="record-date">${record.dateDetail}</div>
                                </div>
                                <div class="record-result">
                                    <div class="record-levels">+${record.levelsUp}级</div>
                                </div>
                            </div>
                        `;
                    }).join('');
                }

                modal.classList.remove('d-none');
                this.bindRecordsModalEvents();
            }

            // 绑定战绩面板事件
            bindRecordsModalEvents() {
                const modal = document.getElementById('recordsModal');
                const closeBtn = document.getElementById('closeRecords');
                const backdrop = document.getElementById('recordsBackdrop');
                const clearBtn = document.getElementById('clearRecordsBtn');
                const exportBtn = document.getElementById('exportRecordsBtn');

                const closeHandler = () => {
                    modal.classList.add('d-none');
                    closeBtn.removeEventListener('click', closeHandler);
                    backdrop.removeEventListener('click', closeHandler);
                    clearBtn.removeEventListener('click', clearHandler);
                    exportBtn.removeEventListener('click', exportHandler);
                };

                const clearHandler = () => {
                    if (confirm('确定要清空所有战绩记录吗？')) {
                        this.gameRecords = [];
                        localStorage.removeItem('guandan_game_records');
                        this.showMessage('战绩记录已清空', 'success');
                        this.showRecordsModal();
                    }
                };

                const exportHandler = () => {
                    const dataStr = JSON.stringify(this.gameRecords, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `掼蛋战绩_${new Date().toLocaleDateString('zh-CN')}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    this.showMessage('战绩导出成功', 'success');
                };

                closeBtn.addEventListener('click', closeHandler);
                backdrop.addEventListener('click', closeHandler);
                clearBtn.addEventListener('click', clearHandler);
                exportBtn.addEventListener('click', exportHandler);
            }

            // 计算战绩统计
            calculateRecordsStats() {
                const totalGames = this.gameRecords.length;
                if (totalGames === 0) {
                    return { totalGames: 0, winRate: 0, totalLevelsUp: 0 };
                }

                const wins = this.gameRecords.filter(r => r.winner === 'A').length;
                const totalLevelsUp = this.gameRecords.reduce((sum, r) => {
                    return sum + (r.winner === 'A' ? r.levelsUp : 0);
                }, 0);

                return {
                    totalGames,
                    wins,
                    losses: totalGames - wins,
                    winRate: Math.round((wins / totalGames) * 100),
                    totalLevelsUp
                };
            }

            // 更新后的showRecords方法
            showRecords() {
                this.showRecordsModal();
            }


            restartGame() {
                if (confirm('确定要重新开始游戏吗？')) {
                    // 清空所有状态
                    this.currentRoundCards = [];
                    this.lastPlayer = null;
                    this.selectedCards = [];
                    this.gameState = 'waiting';
                    this.roundPlayers.clear();
                    this.roundPassedPlayers.clear();

                    // 清空玩家手牌
                    for (let pos in this.players) {
                        this.players[pos].cards = [];
                    }

                    // 重新发牌
                    this.dealCards();

                    // 决定首出玩家
                    this.currentPlayer = this.determineFirstPlayer();
                    console.log(`游戏重新开始，首出玩家：${this.currentPlayer}`);

                    // 更新UI
                    this.updateUI();
                    this.gameState = 'playing';

                    // 如果首出玩家是AI，自动出牌
                    if (this.players[this.currentPlayer].isAI) {
                        setTimeout(() => this.aiAutoPlay(), 1500);
                    }
                }
            }

            showSettings() {
                alert('设置功能开发中...');
            }

            getCardType(cards) {
                if (!cards || cards.length === 0) return null;

                // 使用规则引擎识别牌型
                return this.rules.getCardType(cards);
            }

            // 验证牌型是否有效
            isValidPlayType(cardType, expectedCount) {
                if (!cardType || expectedCount <= 0) return false;

                switch (expectedCount) {
                    case 1:
                        return cardType.type === 'single';
                    case 2:
                        return cardType.type === 'pair';
                    case 3:
                        return cardType.type === 'triple';
                    default:
                        // 对于更多张的牌，这里可以扩展规则（如顺子、连对等）
                        return cardType.type !== 'invalid';
                }
            }
        }

        // 掼蛋规则引擎
        class GuandanRules {
            constructor() {
                this.cardOrder = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '小王', '大王'];
                this.currentLevel = 2;
                this.jokerCard = null;
                this.initializeLevel();

                // 使用新完善的规则引擎
                try {
                    if (typeof RuleEngine !== 'undefined') {
                        this.ruleEngine = new RuleEngine(null);
                        this.ruleEngine.setLevel(this.currentLevel);
                        this.useAdvancedEngine = true;
                        console.log('[规则引擎] 已启用高级规则引擎');
                    }
                } catch (error) {
                    console.warn('[规则引擎] 高级引擎加载失败，使用基础引擎');
                }
            }

            initializeLevel() {
                this.jokerCard = this.currentLevel === 14 ? 'A' : this.currentLevel.toString();
            }

            getCardValue(rank) {
                return this.cardOrder.indexOf(rank);
            }

            validatePlay(cards, lastPlay, playerHand) {
                try {
                    // 调试输出
                    console.log('[validatePlay] 出牌:', cards.map(c => c.rank + (c.suit === 'joker' ? '' : c.suit)).join(', '));
                    if (lastPlay) {
                        console.log('[validatePlay] 上家牌:', lastPlay.cards ? lastPlay.cards.map(c => c.rank + (c.suit === 'joker' ? '' : c.suit)).join(', ') : '未知');
                    }

                    // 使用新的官方规则引擎
                    if (this.ruleEngine) {
                        let lastPlayCards = null;
                        if (lastPlay && lastPlay.cards) {
                            lastPlayCards = lastPlay.cards;
                        } else if (lastPlay && Array.isArray(lastPlay)) {
                            lastPlayCards = lastPlay;
                        }

                        const result = this.ruleEngine.validatePlay(cards, lastPlayCards, playerHand);
                        console.log('[validatePlay] 规则引擎结果:', result);

                        return result;
                    }
                } catch (error) {
                    console.error('[出牌验证错误]', error);
                }

                // 简单验证
                if (cards.length === 0) {
                    return { valid: false, message: '没有选择牌' };
                }

                return { valid: true, message: '出牌合法', cardType: { type: 'basic' } };
            }

            getCardType(cards) {
                if (!cards || cards.length === 0) {
                    console.log('[getCardType] 无牌或空数组');
                    return null;
                }

                console.log('[getCardType] 识别牌型:', cards.map(c => `${c.rank}${c.suit}`).join(','));

                // 使用新的官方规则引擎
                if (this.ruleEngine) {
                    try {
                        const result = this.ruleEngine.getCardType(cards);
                        console.log('[getCardType] 规则引擎返回:', result);
                        if (result && result.type) {
                            return result;
                        }
                    } catch (error) {
                        console.warn('[规则引擎] 牌型识别失败:', error);
                    }
                } else {
                    console.log('[getCardType] 规则引擎未初始化，使用fallback逻辑');
                }

                // 基础牌型识别（fallback）
                const len = cards.length;
                if (len === 1) {
                    return { type: 'single' };
                } else if (len >= 5) {
                    // 检查是否为同花顺
                    console.log(`[getCardType] 检查同花顺，长度: ${len}`);
                    if (this.isStraightFlush(cards)) {
                        console.log('[getCardType] 同花顺检测通过！');
                        return { type: 'straight_flush', weight: 50 + len }; // 基础权重50 + 长度
                    }
                    console.log('[getCardType] 不是同花顺');
                } else if (len === 4) {
                    // 检查是否为天王炸（4张王牌）
                    const jokerCount = cards.filter(c => c.suit === 'joker').length;
                    if (jokerCount === 4) {
                        return { type: 'king_bomb', weight: 1000 };
                    }
                    // 检查是否为炸弹（4张同点数）
                    if (cards[0].rank === cards[1].rank &&
                        cards[1].rank === cards[2].rank &&
                        cards[2].rank === cards[3].rank) {
                        return { type: 'bomb', weight: 100 };
                    }
                } else if (len === 2) {
                    // 检查是否为对子
                    if (cards[0].rank === cards[1].rank) {
                        return { type: 'pair' };
                    }
                } else if (len === 3) {
                    // 检查是否为三张
                    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
                        return { type: 'triple' };
                    }
                }

                // 默认返回无效牌型
                console.log('[getCardType] 无法识别的牌型，返回invalid');
                return { type: 'invalid' };
            }

            /**
             * 检查是否为同花顺
             */
            isStraightFlush(cards) {
                if (cards.length < 5) return false;

                // 检查是否都是同花色
                const firstSuit = cards[0].suit;
                if (cards.some(c => c.suit !== firstSuit)) return false;
                if (firstSuit === 'joker') return false; // 王牌不能组成同花顺

                // 检查是否是连续的
                const values = cards.map(c => {
                    if (c.rank === 'A') return 14;
                    if (c.rank === 'K') return 13;
                    if (c.rank === 'Q') return 12;
                    if (c.rank === 'J') return 11;
                    if (c.rank === '10') return 10;
                    return parseInt(c.rank);
                });

                // 排序并检查连续性
                values.sort((a, b) => a - b);

                for (let i = 1; i < values.length; i++) {
                    if (values[i] - values[i-1] !== 1) {
                        return false;
                    }
                }

                console.log(`[同花顺] 检测通过: ${values.join(', ')}`);
                return true;
            }
        }

        // 全局游戏实例
        let game;

        // 全局函数
        function playCards() {
            if (game) game.playCards();
        }

        function passTurn() {
            if (game) game.passTurn();
        }

        function showHint() {
            if (game) game.showHint();
        }

        function reportCards() {
            if (game) game.reportCards();
        }

        function showRecords() {
            if (game) game.showRecords();
        }

        // 设置菜单控制函数 - 创建独立菜单绕过CSS冲突
        function toggleSettingsMenu() {
            const settingsBtn = document.getElementById('settingsBtn');

            console.log('toggleSettingsMenu called');
            console.log('settingsBtn found:', !!settingsBtn);

            // 查找并移除已存在的独立菜单
            const existingMenu = document.getElementById('independentSettingsMenu');
            if (existingMenu) {
                existingMenu.remove();
                return;
            }

            if (!settingsBtn) {
                console.warn('设置按钮未找到');
                return;
            }

            // 创建完全独立的设置菜单
            const independentMenu = document.createElement('div');
            independentMenu.id = 'independentSettingsMenu';
            independentMenu.innerHTML = '';

            // 获取按钮位置
            const btnRect = settingsBtn.getBoundingClientRect();
            const menuTop = btnRect.bottom + 2;
            const menuRight = window.innerWidth - btnRect.right;

            // 设置菜单样式 - 完全独立，不依赖任何CSS类
            independentMenu.style.cssText = `
                position: fixed;
                top: ${menuTop}px;
                right: ${menuRight}px;
                left: auto;
                z-index: 99999;
                background: linear-gradient(135deg, rgba(52, 73, 94, 0.98) 0%, rgba(44, 62, 80, 0.95) 100%);
                border-radius: 4px;
                min-width: 140px;
                max-width: 160px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.2);
                backdrop-filter: blur(10px);
                padding: 4px 0;
                font-family: Arial, sans-serif;
                overflow: hidden;
            `;

            // 创建菜单项
            const menuItems = [
                { text: '🏆 战绩', action: () => showRecords() },
                { text: '🎯 游戏设置', action: () => showGameSettings() },
                { text: 'ℹ️ 关于', action: () => showAbout() }
            ];

            menuItems.forEach((itemData, index) => {
                const menuItem = document.createElement('div');
                menuItem.textContent = itemData.text;
                menuItem.style.cssText = `
                    padding: 10px 16px;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    line-height: 1.2;
                    cursor: pointer;
                    border-bottom: ${index < menuItems.length - 1 ? '1px solid rgba(255, 255, 255, 0.15)' : 'none'};
                    transition: all 0.2s ease;
                    text-align: left;
                    white-space: nowrap;
                `;

                // 悬停效果
                menuItem.addEventListener('mouseover', () => {
                    menuItem.style.background = 'rgba(255, 255, 255, 0.1)';
                });
                menuItem.addEventListener('mouseout', () => {
                    menuItem.style.background = 'transparent';
                });

                // 点击事件
                menuItem.addEventListener('click', () => {
                    itemData.action();
                    independentMenu.remove();
                });

                independentMenu.appendChild(menuItem);
            });

            // 添加到页面
            document.body.appendChild(independentMenu);

            console.log('Independent menu created and added to body');

            // 点击外部关闭
            setTimeout(() => {
                const closeHandler = (e) => {
                    if (!independentMenu.contains(e.target) && !settingsBtn.contains(e.target)) {
                        independentMenu.remove();
                        document.removeEventListener('click', closeHandler);
                    }
                };
                document.addEventListener('click', closeHandler);
            }, 100);
        }

        // 显示浮动设置菜单（932x430模式备用）
        function showFloatingSettingsMenu() {
            // 移除已存在的浮动菜单
            const existingMenu = document.getElementById('floatingSettingsMenu');
            if (existingMenu) {
                existingMenu.remove();
                return;
            }

            // 创建浮动菜单 - 紧凑设计
            const floatingMenu = document.createElement('div');
            floatingMenu.id = 'floatingSettingsMenu';
            floatingMenu.style.cssText = `
                position: fixed;
                top: 42px;  /* 减小与按钮的间距：32px + 4px + 6px = 42px */
                right: 6px;
                background: linear-gradient(135deg, rgba(52, 73, 94, 0.98) 0%, rgba(44, 62, 80, 0.95) 100%);
                border-radius: 4px;
                backdrop-filter: blur(12px);
                min-width: 110px;
                max-width: 130px;
                z-index: 10004;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.08);
                overflow: hidden;
            `;

            // 菜单项
            const menuItems = [
                { text: '🏆 战绩', action: 'showRecords()' },
                { text: '🎯 游戏设置', action: 'showGameSettings()' },
                { text: 'ℹ️ 关于', action: 'showAbout()' }
            ];

            menuItems.forEach(item => {
                const menuItem = document.createElement('div');
                menuItem.textContent = item.text;
                menuItem.style.cssText = `
                    padding: 6px 12px;
                    color: white;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 400;
                    line-height: 1.3;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.03);
                    transition: background 0.15s ease;
                    white-space: nowrap;
                `;
                menuItem.onmouseover = () => menuItem.style.background = 'rgba(255, 255, 255, 0.08)';
                menuItem.onmouseout = () => menuItem.style.background = 'transparent';
                menuItem.onclick = () => {
                    eval(item.action);
                    floatingMenu.remove();
                };
                floatingMenu.appendChild(menuItem);
            });

            document.body.appendChild(floatingMenu);

            // 点击其他地方关闭菜单
            setTimeout(() => {
                document.addEventListener('click', function closeFloatingMenu(e) {
                    const floatingBtn = document.getElementById('floatingSettingsBtn');
                    if (!floatingBtn.contains(e.target) && !floatingMenu.contains(e.target)) {
                        floatingMenu.remove();
                        document.removeEventListener('click', closeFloatingMenu);
                    }
                });
            }, 100);
        }

        // closeSettingsMenu 函数已移除 - 现在使用独立菜单，无需此函数

        // 游戏设置（新增功能）
        function showGameSettings() {
            alert('游戏设置功能开发中...\n\n可设置选项：\n• 难度等级\n• 音效开关\n• 动画速度\n• 主题样式');
        }

        // 关于页面（新增功能）
        function showAbout() {
            alert('🎴 掼蛋游戏 v2.2.2\n\n🎮 现代化界面版本\n📱 支持932x430移动端适配\n🎨 完整的游戏控制区域重构\n\n🔧 开发者：Claude AI Assistant\n👨‍💻 项目负责人：Eason');
        }

        function restartGame() {
            if (game) game.restartGame();
        }

        function showSettings() {
            if (game) game.showSettings();
        }

        function toggleSortMode() {
            console.log('[toggleSortMode] 按钮被点击');

            // 测试按钮是否能被获取
            const sortBtn = document.getElementById('sortBtn');
            console.log('[toggleSortMode] sortBtn元素:', sortBtn);

            if (game) {
                console.log('[toggleSortMode] game对象存在，调用toggleSortMode方法');
                game.toggleSortMode();
            } else {
                console.error('[toggleSortMode] game对象不存在');
            }
        }

        // 模块化加载管理器
        class ModuleLoader {
            constructor() {
                this.modules = new Map();
                this.loadProgress = 0;
                this.totalModules = 3;
            }

            updateProgress(moduleName, status, progress = null) {
                this.loadProgress = Math.min(100, this.loadProgress + (100 / this.totalModules));

                document.getElementById('loadingProgress').style.width = this.loadProgress + '%';
                document.getElementById('loadingStatus').textContent = `正在加载 ${moduleName}...`;

                this.log(`[模块加载] ${moduleName}: ${status}`);
            }

            log(message) {
                console.log(message);
            }

            handleError(error, moduleName) {
                this.log(`[错误] ${moduleName}: ${error.message}`);
                document.getElementById('errorText').textContent = `${moduleName} 加载失败: ${error.message}`;
                document.getElementById('errorMessage').classList.add('show');
            }

            async loadAllModules() {
                try {
                    // 模拟加载模块
                    this.updateProgress('游戏引擎', 'loading');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    this.updateProgress('界面组件', 'loading');
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // 初始化游戏
                    await this.initializeGame();

                    // 隐藏加载画面，显示游戏
                    setTimeout(() => {
                        document.getElementById('loadingScreen').style.display = 'none';
                        document.getElementById('gameContainer').classList.add('loaded');
                    }, 500);

                    this.log('[系统] 所有模块加载完成，游戏初始化成功');

                } catch (error) {
                    this.handleError(error, '模块加载器');
                }
            }

            async initializeGame() {
                try {
                    // 创建游戏实例
                    game = new GuandanGame();
                    this.log('[游戏引擎] 实例创建完成');

                    // 初始化AI玩家
                    game.initializeAIPlayers();
                    this.log('[游戏引擎] AI玩家初始化完成');

                    // 初始化游戏（发牌等）
                    game.initializeGame();
                    this.log('[游戏引擎] 游戏初始化完成');

                    // 初始化剩余牌数显示徽章
                    game.initCardCountBadges();
                    this.log('[游戏引擎] 剩余牌数徽章初始化完成');

                    // 测试按钮是否存在
                    const sortBtn = document.getElementById('sortBtn');
                    console.log('[初始化] sortBtn按钮:', sortBtn);
                    console.log('[初始化] sortBtn onclick:', sortBtn ? sortBtn.onclick : 'undefined');

                    // 添加空白区域点击事件 - 清空选中的手牌
                    document.getElementById('gameContainer').addEventListener('click', (e) => {
                        // 检查点击的是否为牌
                        const isCard = e.target.classList.contains('player-card') ||
                                      e.target.closest('.player-card');
                        // 检查是否点击了按钮
                        const isButton = e.target.tagName === 'BUTTON' || e.target.closest('button');
                        // 检查是否点击了控制区域（不包括southCards）
                        const isControl = e.target.closest('.control-buttons') ||
                                         e.target.closest('.player-info') ||
                                         e.target.closest('.opponent-area');

                        // 如果点击的不是牌、不是按钮、不是控制区域，且当前有选中的牌
                        // 包括点击southCards容器内的空白处
                        if (!isCard && !isButton && !isControl && game && game.selectedCards.length > 0) {
                            // 延迟清空，避免与卡片点击冲突
                            setTimeout(() => {
                                if (game.selectedCards.length > 0) {
                                    game.clearSelection();
                                }
                            }, 100);
                        }
                    });

                    // 添加全局调试函数
                    window.debugLevelCards = () => {
                        if (game && game.debugLevelCards) {
                            game.debugLevelCards();
                        } else {
                            console.error('游戏实例或调试函数不存在');
                        }
                    };

                    console.log('[调试] 已添加全局调试函数: debugLevelCards()');
                    console.log('[调试] 在浏览器控制台输入 debugLevelCards() 来检查级牌识别状态');

                    // 自动运行调试检查
                    setTimeout(() => {
                        console.log('%c=== 自动调试检查 ===', 'color: red; font-size: 16px; font-weight: bold;');
                        console.log('当前游戏级别:', game.currentLevel);
                        console.log('规则引擎级别:', game.ruleEngine.currentLevel);

                        // 检查一张2的牌
                        const sampleCard = game.players.south.cards.find(c => c.rank === '2');
                        if (sampleCard) {
                            console.log('示例牌 (2):', sampleCard);
                            console.log('isAnyLevelCard:', game.ruleEngine.isAnyLevelCard(sampleCard));
                            console.log('isWildCard:', game.ruleEngine.isWildCard(sampleCard));
                        }

                        // 检查DOM
                        const cardElements = document.querySelectorAll('#southCards .player-card');
                        console.log('DOM中牌元素数:', cardElements.length);

                        let levelRankCount = 0;
                        let wildCardCount = 0;
                        cardElements.forEach((el, i) => {
                            if (el.classList.contains('level-rank')) levelRankCount++;
                            if (el.classList.contains('wild-card')) wildCardCount++;
                            if (el.classList.contains('level-rank') || el.classList.contains('wild-card')) {
                                console.log(`第${i}张牌:`, el.className);
                            }
                        });

                        console.log('level-rank类数量:', levelRankCount);
                        console.log('wild-card类数量:', wildCardCount);
                        console.log('预期: 应该有8张level-rank (4种花色×2副牌)');
                        console.log('预期: 应该有2张wild-card (红桃×2副牌)');
                    }, 2000);

                } catch (error) {
                    this.handleError(error, '游戏初始化');
                    throw error;
                }
            }
        }

        // 测试运行器
        let testRunner = null;

        // 运行所有测试
        async function runTests() {
            if (!testRunner) {
                testRunner = new TestRunner();

                // 创建规则引擎实例用于测试
                const testRuleEngine = new RuleEngine(null);

                // 添加所有测试套件
                testRunner.addSuite(createCardTypeTests(testRuleEngine));
                testRunner.addSuite(createComparisonTests(testRuleEngine));
                testRunner.addSuite(createRoundTests());
                testRunner.addSuite(createAITests(testRuleEngine));
            }

            // 运行测试
            console.log('\n🧪 开始运行掼蛋游戏测试套件...');
            const results = await testRunner.runAllTests();

            // 显示测试结果
            const summary = testRunner.getResultsSummary();
            if (summary.allPassed) {
                console.log('✅ 所有测试通过！');
                showTestNotification('所有测试通过！', 'success');
            } else {
                console.log('❌ 存在测试失败');
                showTestNotification(`测试失败：${summary.totalFailed}/${summary.totalTests}`, 'error');
            }

            return results;
        }

        // 运行特定测试套件
        async function runSpecificSuite(suiteName) {
            if (!testRunner) {
                await runTests();  // 先初始化
                return;
            }

            try {
                const results = await testRunner.runSpecificSuite(suiteName);
                return results;
            } catch (error) {
                console.error(`运行测试套件 "${suiteName}" 失败:`, error);
                showTestNotification(`运行测试失败: ${error.message}`, 'error');
            }
        }

        // 显示测试通知
        function showTestNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `test-notification ${type}`;
            notification.innerHTML = `
                <span class="test-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                <span class="test-message">${message}</span>
                <button class="test-close" onclick="this.parentElement.remove()">×</button>
            `;

            // 添加样式
            if (!document.querySelector('#test-notification-style')) {
                const style = document.createElement('style');
                style.id = 'test-notification-style';
                style.textContent = `
                    .test-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        background: white;
                        padding: 15px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 10000;
                        max-width: 400px;
                        animation: slideIn 0.3s ease;
                    }
                    .test-notification.success {
                        border-left: 4px solid #4CAF50;
                    }
                    .test-notification.error {
                        border-left: 4px solid #f44336;
                    }
                    .test-notification.info {
                        border-left: 4px solid #2196F3;
                    }
                    .test-icon {
                        font-size: 20px;
                    }
                    .test-message {
                        flex: 1;
                        font-family: monospace;
                    }
                    .test-close {
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: #999;
                    }
                    .test-close:hover {
                        color: #333;
                    }
                    @keyframes slideIn {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(notification);

            // 自动移除通知
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 5000);
        }

        // 保存测试报告
        function saveTestReport() {
            if (testRunner) {
                testRunner.saveHTMLReport('guandan-test-report.html');
                showTestNotification('测试报告已保存', 'success');
            } else {
                showTestNotification('请先运行测试', 'error');
            }
        }

        // 页面加载完成后开始加载模块
        document.addEventListener('DOMContentLoaded', () => {
            console.log('页面加载完成，开始模块加载流程');
            const loader = new ModuleLoader();

            setTimeout(() => {
                loader.loadAllModules();
            }, 100);

            // 添加测试快捷键支持
            document.addEventListener('keydown', (e) => {
                // Ctrl+T: 运行所有测试
                if (e.ctrlKey && e.key === 't') {
                    e.preventDefault();
                    runTests();
                }
                // Ctrl+Shift+T: 运行特定测试
                else if (e.ctrlKey && e.shiftKey && e.key === 'T') {
                    e.preventDefault();
                    const suiteNames = ['牌型识别测试', '比大小规则测试', '轮次管理测试', 'AI出牌逻辑测试'];
                    const suiteName = prompt(`请选择测试套件:\n${suiteNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}\n\n输入数字 (1-${suiteNames.length})`);
                    if (suiteName && !isNaN(suiteName)) {
                        const index = parseInt(suiteName) - 1;
                        if (index >= 0 && index < suiteNames.length) {
                            runSpecificSuite(suiteNames[index]);
                        }
                    }
                }
                // Ctrl+S: 保存测试报告
                else if (e.ctrlKey && e.key === 's' && !e.shiftKey) {
                    e.preventDefault();
                    saveTestReport();
                }
            });

            // 将测试函数添加到全局作用域，方便调试
            window.runTests = runTests;
            window.runSpecificSuite = runSpecificSuite;
            window.saveTestReport = saveTestReport;
            window.testRunner = testRunner;

            console.log('\n🎮 掼蛋游戏测试框架已加载');
            console.log('快捷键:');
            console.log('  Ctrl+T    - 运行所有测试');
            console.log('  Ctrl+Shift+T - 选择运行特定测试套件');
            console.log('  Ctrl+S    - 保存测试报告');
            console.log('  runTests() - 在控制台运行测试');
        });

        // 全局错误处理
        window.addEventListener('error', (event) => {
            console.error('[全局错误]', event.error);
        });