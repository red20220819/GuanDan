/**
 * 🎮 控制面板组件 - 重构版本
 * 负责游戏操作按钮和状态显示
 * 支持主题切换、动画效果和响应式设计
 */

import { CSS_VARS, ANIMATIONS } from '../styles/index.js';

export class ControlPanel {
    constructor(container, gameEngine, eventManager) {
        this.container = container;
        this.gameEngine = gameEngine;
        this.eventManager = eventManager;
        this.element = null;
        this.buttons = new Map();
        this.statusElement = null;
        this.timerElement = null;
        this.currentTheme = 'default';

        console.log('🎮 控制面板初始化...');
    }

    /**
     * 渲染控制面板
     */
    render() {
        if (this.element) {
            this.element.remove();
        }

        this.element = document.createElement('div');
        this.element.className = 'control-panel';
        this.element.style.cssText = `
            background: rgba(52, 73, 94, 0.9);
            border-radius: 15px;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
            min-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
        `;

        // 创建游戏状态
        this.createStatusArea();

        // 创建按钮组
        this.createButtonGroup();

        // 添加到容器
        this.container.appendChild(this.element);

        console.log('✅ 控制面板渲染完成');
    }

    /**
     * 创建状态显示区域
     */
    createStatusArea() {
        const statusArea = document.createElement('div');
        statusArea.className = 'control-status';
        statusArea.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        `;

        this.statusElement = document.createElement('div');
        this.statusElement.className = 'status-text';
        this.statusElement.textContent = '等待开始';

        this.timerElement = document.createElement('div');
        this.timerElement.className = 'status-timer';
        this.timerElement.textContent = '30s';

        statusArea.appendChild(this.statusElement);
        statusArea.appendChild(this.timerElement);
        this.element.appendChild(statusArea);

        // 监听游戏状态变化
        this.eventManager.on('stateChanged', (gameState) => {
            this.updateStatus(gameState);
        });
    }

    /**
     * 创建按钮组
     */
    createButtonGroup() {
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'control-buttons';
        buttonGroup.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
        `;

        // 创建按钮
        this.createButton('hint', '💡', '提示', 'secondary', () => this.onHint());
        this.createButton('play', '🚀', '出牌', 'primary', () => this.onPlay(), true);
        this.createButton('pass', '⏭️', '不出', 'secondary', () => this.onPass());
        this.createButton('report', '📋', '牌型', 'info', () => this.onReport());
        this.createButton('restart', '🔄', '重新开始', 'warning', () => this.onRestart());

        this.element.appendChild(buttonGroup);
    }

    /**
     * 创建按钮
     */
    createButton(type, icon, text, style = 'secondary', onClick, disabled = false) {
        const button = document.createElement('button');
        button.className = `btn btn-${style}`;
        button.setAttribute('type', 'button');
        button.setAttribute('title', text);
        button.disabled = disabled;
        button.style.cssText = `
            background: ${style === 'primary' ? CSS_VARS.button.primary : CSS_VARS.button.secondary};
            color: white;
            border: none;
            border-radius: 12px;
            padding: 15px 25px;
            font-size: 16px;
            cursor: ${disabled ? 'not-allowed' : 'pointer'};
            transition: all ${ANIMATIONS.duration.normal} ease;
            display: flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: ${disabled ? '0.6' : '1'};
        `;

        button.innerHTML = `
            <span class="btn-icon" aria-hidden="true">${icon}</span>
            <span class="btn-text">${text}</span>
        `;

        button.addEventListener('click', (e) => {
            if (!disabled) {
                // 添加点击动画
                button.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    button.style.transform = 'scale(1)';
                    onClick();
                }, ANIMATIONS.duration.fast);
            }
        });

        // 悬停效果
        button.addEventListener('mouseenter', () => {
            if (!disabled) {
                button.style.transform = 'translateY(-2px)';
                button.style.boxShadow = `0 8px 24px rgba(0, 0, 0, 0.25)`;
            }
        });

        button.addEventListener('mouseleave', () => {
            if (!disabled) {
                button.style.transform = 'translateY(0)';
                button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            }
        });

        this.buttons.set(type, button);
        return button;
    }

    /**
     * 更新状态
     */
    updateStatus(gameState) {
        if (!this.statusElement) return;

        let statusText = '等待开始';
        let timerText = '30s';

        switch (gameState.phase) {
            case 'waiting':
                statusText = '等待玩家加入';
                timerText = '∞';
                break;
            case 'ready':
                statusText = '准备开始';
                timerText = '30s';
                break;
            case 'playing':
                statusText = `轮到${gameState.currentPlayer || '您'}出牌`;
                timerText = `${gameState.remainingTime || 30}s`;
                break;
            case 'finished':
                statusText = '游戏结束';
                timerText = '∞';
                break;
        }

        this.statusElement.textContent = statusText;
        this.timerElement.textContent = timerText;

        // 更新按钮状态
        this.updateButtons(gameState);
    }

    /**
     * 更新按钮状态
     */
    updateButtons(gameState) {
        const isPlayerTurn = gameState.phase === 'playing';
        const canPlay = isPlayerTurn && this.hasSelectedCards();
        const canPass = isPlayerTurn;

        // 更新出牌按钮
        const playButton = this.buttons.get('play');
        if (playButton) {
            playButton.disabled = !canPlay;
            playButton.style.background = canPlay ? CSS_VARS.button.primary : CSS_VARS.button.secondary;
        }

        // 更新不出按钮
        const passButton = this.buttons.get('pass');
        if (passButton) {
            passButton.disabled = !canPass;
            passButton.style.background = canPass ? CSS_VARS.button.danger : CSS_VARS.button.secondary;
        }

        // 更新提示按钮
        const hintButton = this.buttons.get('hint');
        if (hintButton) {
            hintButton.disabled = !isPlayerTurn;
        }

        // 更新重新开始按钮
        const restartButton = this.buttons.get('restart');
        if (restartButton) {
            restartButton.disabled = gameState.phase !== 'finished';
            restartButton.style.background = gameState.phase === 'finished' ?
                CSS_VARS.button.success : CSS_VARS.button.warning;
        }
    }

    /**
     * 检查是否有选中的牌
     */
    hasSelectedCards() {
        const selectedCards = document.querySelectorAll('.game-card.selected');
        return selectedCards.length > 0;
    }

    /**
     * 按钮事件处理
     */
    onHint() {
        console.log('💡 请求提示');
        this.eventManager.emit('requestHint');
    }

    onPlay() {
        console.log('🚀 请求出牌');

        // 获取选中的牌
        const selectedCards = Array.from(document.querySelectorAll('.game-card.selected'))
            .map(card => this.getCardFromElement(card));

        if (selectedCards.length === 0) {
            console.warn('⚠️ 没有选择牌');
            return;
        }

        this.eventManager.emit('requestPlay', selectedCards);
    }

    onPass() {
        console.log('⏭️ 请求过牌');
        this.eventManager.emit('requestPass');
    }

    onReport() {
        console.log('📋 请求查看牌型');
        this.eventManager.emit('requestReport');
    }

    onRestart() {
        console.log('🔄 请求重新开始');
        this.eventManager.emit('requestRestart');
    }

    /**
     * 从DOM元素获取牌信息
     */
    getCardFromElement(cardElement) {
        const rank = cardElement.querySelector('.card-rank-top, .card-rank-bottom');
        const suit = cardElement.querySelector('.card-suit-top, .card-suit-bottom');

        if (rank && suit) {
            return {
                rank: rank.textContent,
                suit: suit.textContent.replace(/[♠♥♦♣]/g, '')
            };
        }
        return null;
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }

        this.buttons.clear();
        console.log('💥 控制面板已销毁');
    }
}