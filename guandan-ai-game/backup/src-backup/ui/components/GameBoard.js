/**
 * 🎯 游戏桌面组件 - 重构版本
 * 负责游戏主界面的渲染和事件处理
 */

export class GameBoard {
    constructor(container, gameEngine) {
        this.container = container;
        this.gameEngine = gameEngine;
        this.element = null;
    }

    /**
     * 渲染游戏桌面
     */
    async render() {
        console.log('🎯 渲染游戏桌面...');

        // 创建桌面元素
        this.element = document.createElement('div');
        this.element.className = 'game-board';
        this.element.style.cssText = `
            width: 100%;
            height: calc(100vh - 200px);
            position: relative;
            background: radial-gradient(ellipse at center,
                rgba(39, 174, 96, 0.3) 0%,
                rgba(22, 160, 133, 0.5) 50%,
                rgba(52, 73, 94, 0.7) 80%,
                rgba(44, 62, 80, 0.9) 100%);
            border: 3px solid rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            display: grid;
            grid-template-areas:
                "player-west central-play-area player-east"
                "player-north"
                "player-south control-panel";
            grid-template-columns: 1fr 2fr 1fr;
            grid-template-rows: 1fr auto 1fr;
            gap: 20px;
            padding: 20px;
            box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
        `;

        // 创建各个区域
        this.createPlayerAreas();
        this.createCentralPlayArea();
        this.createControlPanelArea();

        // 添加到容器
        this.container.appendChild(this.element);

        // 监听游戏引擎事件
        this.setupEventListeners();

        console.log('✅ 游戏桌面渲染完成');
    }

    /**
     * 创建玩家区域
     */
    createPlayerAreas() {
        const positions = ['west', 'north', 'east', 'south'];

        positions.forEach(position => {
            const playerArea = document.createElement('div');
            playerArea.className = `player-position player-${position}`;
            playerArea.setAttribute('data-position', position);

            this.element.appendChild(playerArea);
        });
    }

    /**
     * 创建中央出牌区域
     */
    createCentralPlayArea() {
        const centralPlayArea = document.createElement('div');
        centralPlayArea.className = 'central-play-area';
        centralPlayArea.style.cssText = `
            grid-area: central-play-area;
            background: radial-gradient(ellipse at center,
                rgba(46, 204, 113, 0.2) 0%,
                rgba(52, 152, 219, 0.8) 100%);
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 25px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 300px;
            padding: 20px;
            position: relative;
        `;

        this.element.appendChild(centralPlayArea);
    }

    /**
     * 创建控制面板区域
     */
    createControlPanelArea() {
        const controlPanelArea = document.createElement('div');
        controlPanelArea.className = 'control-panel-area';
        controlPanelArea.setAttribute('grid-area', 'control-panel');
        controlPanelArea.style.cssText = `
            background: rgba(52, 73, 94, 0.9);
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        this.element.appendChild(controlPanelArea);
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 游戏初始化
        this.gameEngine.on('gameInitialized', () => {
            console.log('🎮 游戏初始化完成 - 游戏桌面');
        });

        // 玩家加入
        this.gameEngine.on('playerJoined', (player, position) => {
            console.log('👤 玩家加入:', player.name);
            this.renderPlayer(position, player);
        });

        // 玩家状态更新
        this.gameEngine.on('playerUpdated', (player) => {
            console.log('🔄 玩家状态更新:', player.name);
            this.updatePlayer(player);
        });

        // 卡牌分发
        this.gameEngine.on('cardsDealt', (player, cards) => {
            console.log('🎴 卡牌分发:', player.name, cards.length);
            this.updatePlayerHand(player);
        });

        // 出牌事件
        this.gameEngine.on('cardPlayed', (player, cards, playArea) => {
            console.log('🃏 玩家出牌:', player.name, cards.length);
            this.renderPlayedCards(playArea, cards);
        });

        // 游戏状态变化
        this.gameEngine.on('gameStateChanged', (gameState) => {
            console.log('🎮 游戏状态变化:', gameState);
            this.updateGameStatus(gameState);
        });
    }

    /**
     * 渲染玩家
     */
    renderPlayer(position, player) {
        const playerArea = this.element.querySelector(`[data-position="${position}"]`);
        if (!playerArea) return;

        // 清空并重新渲染
        playerArea.innerHTML = '';

        // 创建玩家信息
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        playerInfo.innerHTML = `
            <div class="player-avatar">${player.avatar || '👤'}</div>
            <div class="player-details">
                <div class="player-name">${player.name}</div>
                <div class="player-status">
                    <span class="card-count">${player.cards.length} 张</span>
                    <span class="player-role">${player.isAI ? 'AI' : '玩家'}</span>
                </div>
            </div>
        `;

        playerArea.appendChild(playerInfo);

        // 创建手牌区域或牌背
        if (player.cards.length > 0) {
            const handCards = document.createElement('div');
            handCards.className = 'player-hand-cards';
            handCards.style.cssText = `
                display: flex;
                flex-wrap: wrap;
                gap: -20px;
                justify-content: center;
                padding: 15px;
            `;

            player.cards.forEach((card, index) => {
                const cardElement = this.createCardElement(card, index);
                handCards.appendChild(cardElement);
            });

            playerArea.appendChild(handCards);
        } else {
            // 显示牌背
            const cardBacks = document.createElement('div');
            cardBacks.className = 'player-hand-backs';
            cardBacks.style.cssText = `
                display: flex;
                gap: -10px;
            `;

            for (let i = 0; i < Math.min(player.cards.length || 8, 8); i++) {
                const cardBack = this.createCardBackElement(i);
                cardBacks.appendChild(cardBack);
            }

            playerArea.appendChild(cardBacks);
        }
    }

    /**
     * 创建牌元素
     */
    createCardElement(card, index) {
        const cardElement = document.createElement('div');
        cardElement.className = `game-card ${card.isRed ? 'red' : 'black'}`;
        cardElement.style.cssText = `
            width: 60px;
            height: 84px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%);
            border: 2px solid #dee2e6;
            border-radius: 10px;
            cursor: pointer;
            margin-left: ${index > 0 ? '-20px' : '0'};
            position: relative;
            z-index: ${index + 1};
            transition: all 0.25s ease;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            padding: 4px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        `;

        cardElement.innerHTML = `
            <div class="card-content">
                <div class="card-top-left">
                    <div class="card-rank-top">${card.rank}</div>
                    <div class="card-suit-top">${card.suit}</div>
                </div>
                <div class="card-bottom-right">
                    <div class="card-rank-bottom">${card.rank}</div>
                    <div class="card-suit-bottom">${card.suit}</div>
                </div>
            </div>
        `;

        // 添加交互事件
        cardElement.addEventListener('click', () => {
            this.gameEngine.emit('playerCardSelected', card);
        });

        cardElement.addEventListener('mouseenter', () => {
            cardElement.style.transform = 'translateY(-8px)';
            cardElement.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.25)';
        });

        cardElement.addEventListener('mouseleave', () => {
            cardElement.style.transform = 'translateY(0)';
            cardElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
        });

        return cardElement;
    }

    /**
     * 创建牌背元素
     */
    createCardBackElement(index) {
        const cardBack = document.createElement('div');
        cardBack.className = 'game-card-back';
        cardBack.style.cssText = `
            width: 60px;
            height: 84px;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%);
            border: 2px solid #d4af37;
            border-radius: 8px;
            position: relative;
            z-index: ${index + 1};
            transform: translateX(${index * 2}px) translateY(${index * 0.5}px);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            color: #d4af37;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        `;

        cardBack.textContent = '🂠';

        return cardBack;
    }

    /**
     * 渲染出牌区域
     */
    renderPlayedCards(playArea, cards) {
        const playAreaElement = this.element.querySelector('.central-play-area');
        if (!playAreaElement) return;

        // 清空并重新渲染
        playAreaElement.innerHTML = '';

        cards.forEach((card, index) => {
            const cardElement = this.createPlayedCardElement(card, index);
            playAreaElement.appendChild(cardElement);
        });
    }

    /**
     * 创建已出牌元素
     */
    createPlayedCardElement(card, index) {
        const cardElement = this.createElement('div');
        cardElement.className = `played-card ${card.isRed ? 'red' : 'black'}`;
        cardElement.style.cssText = `
            width: 50px;
            height: 70px;
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%);
            border: 2px solid #dee2e6;
            border-radius: 8px;
            margin: 0 5px;
            position: relative;
            z-index: ${index + 1};
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        `;

        cardElement.innerHTML = `
            <div class="played-card-content">
                <div class="played-rank">${card.rank}</div>
                <div class="played-suit">${card.suit}</div>
            </div>
        `;

        return cardElement;
    }

    /**
     * 更新玩家状态
     */
    updatePlayer(player) {
        const playerArea = this.element.querySelector(`[data-position="${player.position}"]`);
        if (!playerArea) return;

        const playerInfo = playerArea.querySelector('.player-info');
        if (!playerInfo) return;

        // 更新手牌数
        const cardCountElement = playerInfo.querySelector('.card-count');
        if (cardCountElement) {
            cardCountElement.textContent = `${player.cards.length} 张`;
        }
    }

    /**
     * 更新游戏状态
     */
    updateGameStatus(gameState) {
        const statusElement = this.element.querySelector('.game-status');
        if (!statusElement) return;

        statusElement.textContent = this.getGameStatusText(gameState);
    }

    /**
     * 获取游戏状态文本
     */
    getGameStatusText(gameState) {
        switch (gameState.phase) {
            case 'waiting': return '等待开始';
            case 'ready': return '准备开始';
            case 'playing': return '游戏进行中';
            case 'finished': return '游戏结束';
            default: return '未知状态';
        }
    }
}