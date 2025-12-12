/**
 * 游戏UI组件
 * 负责管理游戏界面的显示、更新和用户交互
 */

class GameUI {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.selectedCards = []; // 当前选中的牌
        this.isProcessing = false; // 防止重复操作
        this.animations = new Map(); // 动画状态管理
        this.init();
    }

    /**
     * 初始化UI
     */
    init() {
        this.setupEventListeners();
        this.initializeCardContainers();
        this.hideAllGameElements();
        console.log('GameUI 初始化完成');
    }

    /**
     * 初始化方法别名 - 兼容游戏引擎调用
     */
    async initialize() {
        await this.init();
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 按钮事件
        this.setupButtonListeners();

        // 牌点击事件
        this.setupCardClickListeners();

        // 键盘快捷键
        this.setupKeyboardListeners();
    }

    /**
     * 设置按钮监听器
     */
    setupButtonListeners() {
        // 出牌按钮
        const playBtn = document.getElementById('playBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.handlePlayCards());
        }

        // 提示按钮
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) {
            hintBtn.addEventListener('click', () => this.handleShowHint());
        }

        // 过牌按钮
        const passBtn = document.getElementById('passBtn');
        if (passBtn) {
            passBtn.addEventListener('click', () => this.handlePass());
        }

        // 重新开始按钮
        const restartBtn = document.getElementById('restartBtn');
        if (restartBtn) {
            restartBtn.addEventListener('click', () => this.handleRestart());
        }

        // 规则按钮
        const rulesBtn = document.getElementById('rulesBtn');
        if (rulesBtn) {
            rulesBtn.addEventListener('click', () => this.handleShowRules());
        }
    }

    /**
     * 设置牌点击监听器
     */
    setupCardClickListeners() {
        document.addEventListener('click', (event) => {
            const card = event.target.closest('.player-card');
            if (card && !this.isProcessing) {
                this.handleCardClick(card);
            }
        });
    }

    /**
     * 设置键盘监听器
     */
    setupKeyboardListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'Enter':
                    this.handlePlayCards();
                    break;
                case ' ':
                    event.preventDefault();
                    this.handlePass();
                    break;
                case 'h':
                case 'H':
                    this.handleShowHint();
                    break;
                case 'Escape':
                    this.clearSelection();
                    break;
            }
        });
    }

    /**
     * 初始化牌容器
     */
    initializeCardContainers() {
        const playerIds = ['south', 'north', 'west', 'east'];

        playerIds.forEach(playerId => {
            const container = document.getElementById(`${playerId}Cards`);
            if (container) {
                container.innerHTML = '';
                container.dataset.playerId = playerId;
            }
        });

        // 初始化出牌区域
        const playArea = document.getElementById('playedCards');
        if (playArea) {
            playArea.innerHTML = '';
        }
    }

    /**
     * 隐藏所有游戏元素
     */
    hideAllGameElements() {
        const elements = [
            '.player-hand-cards',
            '.player-info',
            '.central-play-area',
            '.control-panel'
        ];

        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.opacity = '0';
                element.style.visibility = 'hidden';
            }
        });
    }

    /**
     * 显示游戏元素
     */
    showGameElements() {
        const elements = [
            '.player-hand-cards',
            '.player-info',
            '.central-play-area',
            '.control-panel'
        ];

        elements.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.opacity = '1';
                element.style.visibility = 'visible';
            }
        });
    }

    /**
     * 更新玩家手牌显示
     */
    updatePlayerHand(playerId, cards) {
        const container = document.getElementById(`${playerId}Cards`);
        if (!container) return;

        container.innerHTML = '';

        cards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index, playerId);
            container.appendChild(cardElement);
        });

        // 更新牌数显示
        this.updateCardCount(playerId, cards.length);
    }

    /**
     * 创建牌元素
     */
    createCardElement(card, index, playerId) {
        const cardElement = document.createElement('div');
        cardElement.className = 'player-card';
        cardElement.dataset.cardId = card.id || `${playerId}_${index}`;
        cardElement.dataset.suit = card.suit;
        cardElement.dataset.rank = card.rank;
        cardElement.dataset.value = card.value;

        // 设置花色颜色
        if (card.suit === '♥' || card.suit === '♦') {
            cardElement.classList.add('red');
        } else {
            cardElement.classList.add('black');
        }

        // 设置z-index
        cardElement.style.setProperty('--card-index', index);

        // 添加牌内容
        if (this.isHumanPlayer(playerId)) {
            // 人类玩家显示牌面
            cardElement.innerHTML = this.getCardFaceHTML(card);
        } else {
            // AI玩家显示牌背
            cardElement.classList.add('ai-card-back');
            cardElement.innerHTML = this.getCardBackHTML();
        }

        return cardElement;
    }

    /**
     * 获取牌面HTML
     */
    getCardFaceHTML(card) {
        return `
            <div class="card-content">
                <div class="card-rank">${card.rank}</div>
                <div class="card-suit">${card.display}</div>
                ${card.isJoker ? '<div class="card-level">配</div>' : ''}
            </div>
        `;
    }

    /**
     * 获取牌背HTML
     */
    getCardBackHTML() {
        return `
            <div class="card-back-pattern">
                <div class="card-back-center">🎴</div>
            </div>
        `;
    }

    /**
     * 检查是否为人类玩家
     */
    isHumanPlayer(playerId) {
        return playerId === 'south';
    }

    /**
     * 处理牌点击事件
     */
    handleCardClick(cardElement) {
        const playerId = cardElement.parentElement.dataset.playerId;
        if (!this.isHumanPlayer(playerId)) return;

        if (!this.gameEngine.currentPlayer || this.gameEngine.currentPlayer.id !== playerId) {
            this.showMessage('还不是你的回合！', 'warning');
            return;
        }

        this.toggleCardSelection(cardElement);
    }

    /**
     * 切换牌选中状态
     */
    toggleCardSelection(cardElement) {
        if (cardElement.classList.contains('selected')) {
            this.deselectCard(cardElement);
        } else {
            this.selectCard(cardElement);
        }
    }

    /**
     * 选中牌
     */
    selectCard(cardElement) {
        cardElement.classList.add('selected');
        this.selectedCards.push(cardElement);
        this.playCardSound('select');
    }

    /**
     * 取消选中牌
     */
    deselectCard(cardElement) {
        cardElement.classList.remove('selected');
        this.selectedCards = this.selectedCards.filter(card => card !== cardElement);
    }

    /**
     * 清空选择
     */
    clearSelection() {
        this.selectedCards.forEach(card => {
            card.classList.remove('selected');
        });
        this.selectedCards = [];
    }

    /**
     * 处理出牌
     */
    handlePlayCards() {
        if (this.selectedCards.length === 0) {
            this.showMessage('请先选择要出的牌！', 'warning');
            return;
        }

        this.isProcessing = true;
        this.disableControls();

        // 获取选中的牌数据
        const cards = this.getSelectedCardData();
        const currentPlayer = this.gameEngine.currentPlayer;

        // 验证并出牌
        if (this.gameEngine.validatePlay(cards, currentPlayer)) {
            this.playCards(cards, currentPlayer);
        } else {
            this.showMessage('出牌无效！', 'error');
            this.isProcessing = false;
            this.enableControls();
        }
    }

    /**
     * 获取选中牌的数据
     */
    getSelectedCardData() {
        return this.selectedCards.map(cardElement => ({
            suit: cardElement.dataset.suit,
            rank: cardElement.dataset.rank,
            value: parseInt(cardElement.dataset.value),
            id: cardElement.dataset.cardId,
            display: cardElement.dataset.rank + cardElement.dataset.suit
        }));
    }

    /**
     * 出牌动画
     */
    playCards(cards, player) {
        this.showPlayedCards(cards, player);
        this.clearSelection();

        setTimeout(() => {
            this.gameEngine.processPlay(cards, player);
            this.isProcessing = false;
            this.enableControls();
        }, 1000);
    }

    /**
     * 显示出的牌
     */
    showPlayedCards(cards, player) {
        const playArea = document.getElementById('playedCards');
        if (!playArea) return;

        playArea.innerHTML = '';

        // 创建牌元素
        cards.forEach((card, index) => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card played-card';
            cardElement.style.animationDelay = `${index * 0.1}s`;

            if (card.suit === '♥' || card.suit === '♦') {
                cardElement.classList.add('red');
            } else {
                cardElement.classList.add('black');
            }

            cardElement.innerHTML = `
                <div class="card-content">
                    <div class="card-rank">${card.rank}</div>
                    <div class="card-suit">${card.display}</div>
                </div>
            `;

            playArea.appendChild(cardElement);
        });

        // 更新状态显示
        this.updatePlayAreaStatus(`${player.name} 出牌`);
    }

    /**
     * 更新出牌区域状态
     */
    updatePlayAreaStatus(message) {
        const statusElement = document.getElementById('playAreaStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                statusElement.style.animation = '';
            }, 500);
        }
    }

    /**
     * 处理提示
     */
    handleShowHint() {
        if (!this.gameEngine.currentPlayer || this.gameEngine.currentPlayer.id !== 'south') {
            this.showMessage('还不是你的回合！', 'warning');
            return;
        }

        const hint = this.gameEngine.getPlayHint();
        if (hint) {
            this.highlightHintCards(hint.cards);
            this.showMessage(`建议出牌：${hint.type}`, 'info');
        } else {
            this.showMessage('没有找到合适的出牌！', 'warning');
        }
    }

    /**
     * 高亮提示的牌
     */
    highlightHintCards(cards) {
        // 清除之前的高亮
        document.querySelectorAll('.hint-highlight').forEach(card => {
            card.classList.remove('hint-highlight');
        });

        // 高亮新提示
        cards.forEach(card => {
            const cardElement = document.querySelector(`[data-card-id="${card.id}"]`);
            if (cardElement) {
                cardElement.classList.add('hint-highlight');
            }
        });
    }

    /**
     * 处理过牌
     */
    handlePass() {
        if (!this.gameEngine.currentPlayer || this.gameEngine.currentPlayer.id !== 'south') {
            this.showMessage('还不是你的回合！', 'warning');
            return;
        }

        this.isProcessing = true;
        this.disableControls();

        setTimeout(() => {
            this.gameEngine.processPass();
            this.isProcessing = false;
            this.enableControls();
        }, 500);
    }

    /**
     * 处理重新开始
     */
    handleRestart() {
        if (confirm('确定要重新开始游戏吗？')) {
            this.gameEngine.restartGame();
        }
    }

    /**
     * 处理显示规则
     */
    handleShowRules() {
        this.showRulesModal();
    }

    /**
     * 显示规则弹窗
     */
    showRulesModal() {
        const modal = document.createElement('div');
        modal.className = 'rules-modal';
        modal.innerHTML = `
            <div class="rules-content">
                <h2>掼蛋游戏规则</h2>
                <div class="rules-summary">
                    <h3>基本规则</h3>
                    <ul>
                        <li>4人游戏，2v2对战</li>
                        <li>使用两副牌（108张）</li>
                        <li>每人27张牌</li>
                        <li>先出完牌的队伍获胜</li>
                    </ul>

                    <h3>牌型介绍</h3>
                    <ul>
                        <li>单张、对子、三张、三带一、三带二</li>
                        <li>顺子（≥5张）、连对（≥3对）、飞机（≥2个三张）</li>
                        <li>炸弹（4张+）、火箭（大小王）</li>
                        <li>红桃级牌为万能牌（逢人配）</li>
                    </ul>

                    <h3>升级规则</h3>
                    <ul>
                        <li>双上：+3级</li>
                        <li>单上：+2级</li>
                        <li>平上：+1级</li>
                    </ul>
                </div>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">关闭</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * 更新牌数显示
     */
    updateCardCount(playerId, count) {
        const countElement = document.getElementById(`${playerId}Count`);
        if (countElement) {
            countElement.textContent = count;
            countElement.style.animation = 'pulse 0.3s ease';
            setTimeout(() => {
                countElement.style.animation = '';
            }, 300);
        }
    }

    /**
     * 更新玩家信息面板
     */
    updatePlayerInfo(player) {
        const playerManager = this.gameEngine.playerManager;
        if (playerManager) {
            playerManager.updatePlayerInfoPanel(player);
        }
    }

    /**
     * 更新游戏状态显示
     */
    updateGameStatus(status) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * 更新当前玩家指示
     */
    updateCurrentPlayerIndicator(currentPlayer) {
        // 清除所有高亮
        document.querySelectorAll('.current-player-indicator').forEach(element => {
            element.classList.remove('current-player-indicator');
        });

        // 高亮当前玩家
        const currentPlayerElement = document.querySelector(`[data-player="${currentPlayer.id}"]`);
        if (currentPlayerElement) {
            currentPlayerElement.classList.add('current-player-indicator');
        }
    }

    /**
     * 禁用控制按钮
     */
    disableControls() {
        const buttons = document.querySelectorAll('.control-buttons .btn');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
    }

    /**
     * 启用控制按钮
     */
    enableControls() {
        const buttons = document.querySelectorAll('.control-buttons .btn');
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
    }

    /**
     * 显示消息
     */
    showMessage(message, type = 'info') {
        const messageElement = document.createElement('div');
        messageElement.className = `game-message ${type}`;
        messageElement.textContent = message;

        document.body.appendChild(messageElement);

        setTimeout(() => {
            messageElement.remove();
        }, 3000);
    }

    /**
     * 播放音效
     */
    playCardSound(type) {
        // 这里可以添加音效播放逻辑
        console.log(`Playing sound: ${type}`);
    }

    /**
     * 显示游戏结束界面
     */
    showGameEnd(winner, stats) {
        const modal = document.createElement('div');
        modal.className = 'game-end-modal';
        modal.innerHTML = `
            <div class="game-end-content">
                <h2>游戏结束！</h2>
                <div class="winner-announcement">
                    <div class="winner-icon">🏆</div>
                    <div class="winner-text">${winner}队获胜！</div>
                </div>
                <div class="game-stats">
                    <h3>游戏统计</h3>
                    ${this.generateStatsHTML(stats)}
                </div>
                <div class="end-buttons">
                    <button class="btn btn-restart" onclick="gameEngine.restartGame()">再来一局</button>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">查看结果</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    /**
     * 生成统计信息HTML
     */
    generateStatsHTML(stats) {
        let html = '<table>';
        for (let playerId in stats) {
            const player = stats[playerId];
            html += `
                <tr>
                    <td>${player.name}</td>
                    <td>得分：${player.score}</td>
                    <td>剩余牌：${player.remainingCards}</td>
                </tr>
            `;
        }
        html += '</table>';
        return html;
    }

    /**
     * 更新所有UI元素
     */
    updateAllUI() {
        const gameState = this.gameEngine.getGameState();

        // 更新玩家手牌
        for (let playerId in gameState.playerHands) {
            this.updatePlayerHand(playerId, gameState.playerHands[playerId]);
        }

        // 更新玩家信息
        gameState.players.forEach(player => {
            this.updatePlayerInfo(player);
        });

        // 更新游戏状态
        this.updateGameStatus(this.getStatusText(gameState.gameState));

        // 更新当前玩家
        this.updateCurrentPlayerIndicator(gameState.currentPlayer);
    }

    /**
     * 获取状态文本
     */
    getStatusText(gameState) {
        const statusMap = {
            'waiting': '等待开始',
            'playing': '游戏进行中',
            'ended': '游戏结束'
        };
        return statusMap[gameState] || '未知状态';
    }
}

// 导出游戏UI管理器
window.GameUI = GameUI;