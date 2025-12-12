/**
 * 🎨 UI模块主入口 - 修复版本
 * 避免动态导入问题，直接使用简化的游戏引擎
 */

import { GAME_CONFIG } from '../config/game.config';

/**
 * 创建简化的UI组件
 */
export async function createApp(gameEngine) {
    console.log('🎨 开始创建简化UI...');

    // 创建主UI容器
    const appContainer = document.createElement('div');
    appContainer.className = 'guandan-game-v2';
    appContainer.style.cssText = `
        width: 100vw;
        height: 100vh;
        background: radial-gradient(ellipse at center,
            rgba(39, 174, 96, 0.8) 0%,
            rgba(22, 160, 133, 0.9) 30%,
            rgba(52, 152, 219, 1) 100%);
        font-family: 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
        color: white;
        position: relative;
        overflow: hidden;
    `;

    // 创建游戏桌面
    const gameBoard = document.createElement('div');
    gameBoard.className = 'game-board';
    gameBoard.style.cssText = `
        width: 100%;
        height: calc(100vh - 200px);
        position: relative;
        background: radial-gradient(ellipse at center,
            rgba(39, 174, 96, 0.8) 0%,
            rgba(22, 160, 133, 0.9) 30%,
            rgba(52, 73, 94, 0.95) 60%,
            rgba(44, 62, 80, 1) 100%);
        border: 3px solid rgba(255, 255, 255, 0.2);
        border-radius: 20px;
        padding: 20px;
        display: grid;
        grid-template-areas:
            "player-west central-play-area player-east"
            "player-south control-panel";
        grid-template-columns: 1fr 2fr 1fr;
        grid-template-rows: 1fr auto;
        gap: 20px;
        box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
    `;

    // 创建中央出牌区域
    const playArea = document.createElement('div');
    playArea.className = 'central-play-area';
    playArea.style.cssText = `
        background: rgba(46, 204, 113, 0.2);
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

    const instructionArea = document.createElement('div');
    instructionArea.style.cssText = `
        text-align: center;
        color: white;
        margin-bottom: 15px;
    `;

    instructionArea.innerHTML = '<p>请选择要出的牌，然后点击"出牌"按钮</p>';

    // 创建控制面板
    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    controlPanel.style.cssText = `
        background: rgba(52, 73, 94, 0.9);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 15px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 15px;
        position: relative;
        z-index: 10;
    `;

    // 添加到游戏桌面
    gameBoard.appendChild(playArea);
    gameBoard.appendChild(controlPanel);
    appContainer.appendChild(gameBoard);

    // 创建玩家区域
    const positions = ['west', 'north', 'east', 'south'];
    const playerNames = ['AI玩家1', 'AI玩家2', 'AI玩家3', '您'];
    const playerCards = [
        document.getElementById('westCards'),
        document.getElementById('northCards'),
        document.getElementById('eastCards'),
        document.getElementById('southCards')
    ];

    positions.forEach((position, index) => {
        // 创建玩家区域
        const playerArea = document.createElement('div');
        playerArea.className = `player-position player-${position}`;
        playerArea.setAttribute('data-position', position);

        // 创建玩家信息
        const playerInfo = document.createElement('div');
        playerInfo.className = 'player-info';
        playerInfo.innerHTML = `
            <div class="player-avatar">${playerNames[index] === '您' ? '🌟' : '🤖'}</div>
            <div class="player-details">
                <div class="player-name">${playerNames[index]}</div>
                <div class="player-status">
                    <span class="card-count">27 张</span>
                    <span class="player-role">${index === 3 ? '您' : '对手'}</span>
                </div>
            </div>
        `;

        // 创建手牌区域或牌背
        const cardsArea = document.createElement('div');
        cardsArea.className = 'player-hand-cards';
        cardsArea.id = position + 'Cards';

        // 如果是南方玩家，显示真实手牌
        if (position === 'south') {
            // 创建简化手牌
            const cards = generateSimpleDeck().slice(0, 27);
            cards.forEach((card, cardIndex) => {
                const cardElement = createSimpleCardElement(card, cardIndex);
                cardsArea.appendChild(cardElement);
            });
        } else {
            // 显示牌背
            for (let i = 0; i < 8; i++) {
                const cardBack = document.createElement('div');
                cardBack.className = 'game-card-back';
                cardBack.style.cssText = `
                    width: 60px;
                    height: 84px;
                    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%);
                    border: 2px solid #d4af37;
                    border-radius: 8px;
                    position: relative;
                    z-index: ${i + 1};
                    transform: translateX(${i * 2}px) translateY(${i * 0.5}px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: #d4af37;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                `;
                cardBack.textContent = '🂠';
                cardsArea.appendChild(cardBack);
            }
        }

        // 创建操作按钮
        const buttonsArea = document.createElement('div');
        buttonsArea.className = 'control-buttons';
        buttonsArea.style.cssText = `
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-top: 15px;
        `;

        // 创建出牌按钮
        const playButton = createButton('🚀', '出牌', 'primary', () => {
            console.log('🎮 点击出牌');
            alert('功能开发中，请期待后续更新！');
        });

        // 创建提示按钮
        const hintButton = createButton('💡', '提示', 'secondary', () => {
            console.log('💡 点击提示');
            alert('提示功能开发中，请期待后续更新！');
        });

        // 创建不出按钮
        const passButton = createButton('⏭️', '不出', 'secondary', () => {
            console.log('⏭️ 点击不出');
            alert('不出功能开发中，请期待后续更新！');
        });

        buttonsArea.appendChild(playButton);
        buttonsArea.appendChild(hintButton);
        buttonsArea.appendChild(passButton);

        // 添加到玩家区域
        playerArea.appendChild(playerInfo);
        playerArea.appendChild(cardsArea);
        playerArea.appendChild(buttonsArea);

        // 添加到游戏桌面
        gameBoard.appendChild(playerArea);

        // 添加中央说明
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            text-align: center;
            color: white;
            font-size: 16px;
            margin-top: 20px;
            grid-column: 1 / -1;
        `;
        instructions.innerHTML = '<p>🎯 简化版掼蛋游戏 - 模块化架构重构</p><p>✨ 功能正在开发中，请期待后续更新！</p>';
        playArea.appendChild(instructions);

        // 添加到主容器
        appContainer.appendChild(playerArea);

        return {
            gameBoard,
            controlPanel
        };
    }

    /**
     * 创建简化牌元素
     */
    function createSimpleCardElement(card, index) {
        const cardElement = document.createElement('div');
        const isRed = card.suit === '♥' || card.suit === '♦';
        cardElement.className = `game-card ${isRed ? 'red' : 'black'}`;
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
                    <div class="card-suit-top">${isRed ? card.suit.replace(/[♠♥♦♣]/g, '♥♦♣') : card.suit}</div>
                </div>
                <div class="card-bottom-right">
                    <div class="card-rank-bottom">${card.rank}</div>
                    <div class="card-suit-bottom">${isRed ? card.suit.replace(/[♠♥♦♣]/g, '♥♦♣') : card.suit}</div>
                </div>
            </div>
        `;

        cardElement.addEventListener('click', () => {
            cardElement.style.transform = 'translateY(-12px)';
            cardElement.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.25)';
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
     * 创建按钮
     */
    function createButton(text, title, style, onClick) {
        const button = document.createElement('button');
        button.className = `btn btn-${style}`;
        button.setAttribute('type', 'button');
        button.setAttribute('title', title);
        button.textContent = text;
        button.onclick = onClick;
        button.style.cssText = `
            background: ${style === 'primary' ? '#27AE60' : '#3498DB'};
            color: white;
            border: none;
            border-radius: 12px;
            padding: 15px 25px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;
        return button;
    }

    /**
     * 生成简化牌堆
     */
    function generateSimpleDeck() {
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
                        display: rank + suit,
                        value: ranks.indexOf(rank) + 3,
                        isRed: suit === '♥' || suit === '♦'
                    });
                }
            }
        }

        // 添加大小王
        deck.push(
            { id: 'joker_1', suit: 'joker', rank: '小王', display: '🃟', value: 16, isRed: true },
            { id: 'joker_2', suit: 'joker', rank: '大王', display: '🃏', value: 17, isRed: true }
        );

        // 洗牌
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }

        return deck;
    }
}