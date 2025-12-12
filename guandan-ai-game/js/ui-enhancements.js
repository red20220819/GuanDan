/**
 * 🎮 掼蛋游戏 - 界面增强功能
 * 提供更好的视觉反馈和用户体验
 */

class UIEnhancements {
    constructor() {
        this.init();
    }

    init() {
        this.setupCardAnimations();
        this.setupButtonEffects();
        this.setupPlayerHighlights();
        this.setupPlayAreaEffects();
        this.setupTooltips();
        this.setupKeyboardShortcuts();
    }

    /**
     * 设置卡牌动画效果
     */
    setupCardAnimations() {
        // 卡牌选中时的波纹效果
        document.addEventListener('click', (e) => {
            if (e.target.closest('.player-card')) {
                this.createRippleEffect(e.target.closest('.player-card'), e);
            }
        });

        // 卡牌悬停时的发光效果
        const style = document.createElement('style');
        style.textContent = `
            .player-card::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg,
                    transparent 30%,
                    rgba(255, 255, 255, 0.3) 50%,
                    transparent 70%);
                border-radius: inherit;
                opacity: 0;
                transition: opacity 0.3s ease;
                z-index: -1;
            }

            .player-card:hover::before {
                opacity: 1;
                animation: glow 2s ease-in-out infinite;
            }

            @keyframes glow {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }

            .card-select-animation {
                animation: cardSelect 0.3s ease;
            }

            @keyframes cardSelect {
                0% { transform: scale(1); }
                50% { transform: scale(1.1) rotate(5deg); }
                100% { transform: scale(1); }
            }

            .card-play-animation {
                /* 禁用出牌动画 */
                animation: none;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 创建波纹效果
     */
    createRippleEffect(element, event) {
        const ripple = document.createElement('span');
        ripple.style.position = 'absolute';
        ripple.style.borderRadius = '50%';
        ripple.style.background = 'rgba(255, 255, 255, 0.6)';
        ripple.style.transform = 'scale(0)';
        ripple.style.animation = 'ripple 0.6s linear';
        ripple.style.pointerEvents = 'none';

        const rect = element.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';

        ripple.style.left = (event.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (event.clientY - rect.top - size / 2) + 'px';

        element.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    }

    /**
     * 设置按钮效果
     */
    setupButtonEffects() {
        // 按钮点击音效模拟（视觉反馈）
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // 添加点击缩放效果
                btn.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    btn.style.transform = '';
                }, 100);

                // 创建波纹效果
                this.createRippleEffect(btn, e);
            });

            // 按钮可用性状态指示
            this.updateButtonState(btn);
        });

        // 添加按钮状态样式
        const style = document.createElement('style');
        style.textContent = `
            .btn {
                position: relative;
                overflow: hidden;
            }

            .btn::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 0;
                height: 0;
                border-radius: 50%;
                background: rgba(255, 255, 255, 0.3);
                transform: translate(-50%, -50%);
                transition: width 0.6s, height 0.6s;
            }

            .btn:active::after {
                width: 300px;
                height: 300px;
            }

            .btn-available {
                box-shadow: 0 0 20px rgba(46, 204, 113, 0.4);
                animation: pulse-available 2s infinite;
            }

            @keyframes pulse-available {
                0%, 100% {
                    transform: scale(1);
                    box-shadow: 0 0 20px rgba(46, 204, 113, 0.4);
                }
                50% {
                    transform: scale(1.02);
                    box-shadow: 0 0 30px rgba(46, 204, 113, 0.6);
                }
            }

            .btn-unavailable {
                filter: grayscale(0.5) brightness(0.7);
                cursor: not-allowed;
            }

            .btn-loading {
                position: relative;
                color: transparent !important;
                pointer-events: none;
            }

            .btn-loading::before {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                margin: -10px 0 0 -10px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-top: 2px solid #fff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 更新按钮状态
     */
    updateButtonState(btn) {
        if (!btn.disabled) {
            btn.classList.add('btn-available');
            btn.classList.remove('btn-unavailable');
        } else {
            btn.classList.remove('btn-available');
            btn.classList.add('btn-unavailable');
        }
    }

    /**
     * 设置玩家高亮效果
     */
    setupPlayerHighlights() {
        // 当前玩家高亮
        const highlightCurrentPlayer = (playerPosition) => {
            // 移除所有高亮
            document.querySelectorAll('.player-position').forEach(pos => {
                pos.style.filter = 'brightness(0.7)';
                pos.style.transform = pos.style.transform.replace('scale(1.05)', 'scale(1)');
            });

            // 高亮当前玩家
            const currentPlayer = document.querySelector(`.player-${playerPosition}`);
            if (currentPlayer) {
                currentPlayer.style.filter = 'brightness(1.1)';
                currentPlayer.style.transform = currentPlayer.style.transform.replace('scale(1)', 'scale(1.05)');
            }
        };

        // 添加玩家高亮样式
        const style = document.createElement('style');
        style.textContent = `
            .player-position {
                transition: all 0.3s ease;
            }

            .player-position.active {
                filter: brightness(1.1);
                transform: scale(1.05);
            }

            .player-position.active::after {
                content: '';
                position: absolute;
                top: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 40px;
                height: 4px;
                background: linear-gradient(90deg, transparent, #f39c12, transparent);
                border-radius: 2px;
                animation: slideDown 0.3s ease;
            }

            @keyframes slideDown {
                from {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }

            .player-info {
                transition: all 0.3s ease;
            }

            .player-info.active-turn {
                box-shadow: 0 0 30px rgba(46, 204, 113, 0.5);
                transform: translateY(-5px);
            }
        `;
        document.head.appendChild(style);

        // 监听游戏状态变化
        this.highlightCurrentPlayer = highlightCurrentPlayer;
    }

    /**
     * 设置出牌区域效果
     */
    setupPlayAreaEffects() {
        const style = document.createElement('style');
        style.textContent = `
            .central-play-area {
                transition: all 0.3s ease;
            }

            .central-play-area.active {
                box-shadow: 0 0 50px rgba(46, 204, 113, 0.4),
                           inset 0 0 40px rgba(0, 0, 0, 0.2);
            }

            .plays-group {
                /* 移除过渡动画 */
            }

            .latest-group {
                /* 移除最新出牌的动画 */
                filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.5));
            }

            .play-area-center {
                transition: all 0.3s ease;
            }

            .play-area-center hiding {
                opacity: 0;
                transform: scale(0.8);
            }

            .combo-indicator {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 2rem;
                font-weight: bold;
                color: #f39c12;
                text-shadow: 0 0 20px rgba(243, 156, 18, 0.8);
                animation: comboEffect 1s ease forwards;
                pointer-events: none;
                z-index: 1000;
            }

            @keyframes comboEffect {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.5);
                }
                50% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1.5);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(2);
                }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * 设置工具提示
     */
    setupTooltips() {
        const style = document.createElement('style');
        style.textContent = `
            .tooltip {
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px 12px;
                border-radius: 6px;
                font-size: 14px;
                white-space: nowrap;
                z-index: 1000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .tooltip::after {
                content: '';
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 5px solid transparent;
                border-top-color: rgba(0, 0, 0, 0.9);
            }

            .tooltip.show {
                opacity: 1;
            }

            .card-hint {
                position: absolute;
                bottom: 110%;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(46, 204, 113, 0.9);
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                white-space: nowrap;
                opacity: 0;
                transition: opacity 0.3s ease;
                pointer-events: none;
                z-index: 100;
            }

            .card-hint.show {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);

        // 为按钮添加工具提示
        this.addTooltips();
    }

    /**
     * 添加工具提示
     */
    addTooltips() {
        const tooltips = {
            '.btn-play': '出牌：打出选中的牌',
            '.btn-pass': '不要：跳过本轮出牌',
            '.btn-hint': '提示：获取出牌建议',
            '.btn-report': '报牌：显示剩余牌数',
            '.btn-records': '战绩：查看历史记录',
            '.btn-restart': '重新开始游戏'
        };

        Object.entries(tooltips).forEach(([selector, text]) => {
            const element = document.querySelector(selector);
            if (element) {
                element.setAttribute('data-tooltip', text);
                element.addEventListener('mouseenter', (e) => this.showTooltip(e, text));
                element.addEventListener('mouseleave', () => this.hideTooltip());
            }
        });
    }

    /**
     * 显示工具提示
     */
    showTooltip(event, text) {
        let tooltip = document.querySelector('.tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);
        }

        tooltip.textContent = text;
        tooltip.classList.add('show');

        const rect = event.target.getBoundingClientRect();
        tooltip.style.left = rect.left + rect.width / 2 + 'px';
        tooltip.style.top = rect.top - 40 + 'px';
    }

    /**
     * 隐藏工具提示
     */
    hideTooltip() {
        const tooltip = document.querySelector('.tooltip');
        if (tooltip) {
            tooltip.classList.remove('show');
        }
    }

    /**
     * 设置键盘快捷键
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // 空格键：出牌
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                const playBtn = document.getElementById('playBtn');
                if (playBtn && !playBtn.disabled) {
                    playBtn.click();
                }
            }

            // P键：过牌
            if (e.key === 'p' || e.key === 'P') {
                const passBtn = document.getElementById('passBtn');
                if (passBtn && !passBtn.disabled) {
                    passBtn.click();
                }
            }

            // H键：提示
            if (e.key === 'h' || e.key === 'H') {
                const hintBtn = document.getElementById('hintBtn');
                if (hintBtn && !hintBtn.disabled) {
                    hintBtn.click();
                }
            }

            // R键：重新开始
            if (e.key === 'r' || e.key === 'R') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const restartBtn = document.getElementById('restartBtn');
                    if (restartBtn) {
                        restartBtn.click();
                    }
                }
            }

            // ESC键：取消选牌
            if (e.key === 'Escape') {
                this.clearSelection();
            }
        });

        // 显示快捷键提示
        this.showShortcutsHelp();
    }

    /**
     * 显示快捷键帮助
     */
    showShortcutsHelp() {
        const help = document.createElement('div');
        help.id = 'shortcuts-help';
        help.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 8px;
            font-size: 12px;
            z-index: 999;
            display: none;
        `;
        help.innerHTML = `
            <div>快捷键：</div>
            <div>空格 - 出牌</div>
            <div>P - 过牌</div>
            <div>H - 提示</div>
            <div>ESC - 取消选牌</div>
        `;
        document.body.appendChild(help);

        // 按F1显示/隐藏帮助
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F1') {
                e.preventDefault();
                help.style.display = help.style.display === 'none' ? 'block' : 'none';
            }
        });
    }

    /**
     * 清除选牌
     */
    clearSelection() {
        // 清除所有选中的牌
        document.querySelectorAll('.player-card.selected').forEach(card => {
            card.classList.remove('selected');
        });

        // 清空选中数组
        if (window.game) {
            window.game.selectedCards = [];
            window.game.updateControlButtons();
        }

        // 添加清除动画
        const southCards = document.getElementById('southCards');
        if (southCards) {
            southCards.style.animation = 'pulse 0.3s ease';
            setTimeout(() => {
                southCards.style.animation = '';
            }, 300);
        }
    }

    /**
     * 显示出牌动画
     */
    showPlayAnimation(cards, fromPlayer) {
        // 禁用出牌动画，直接显示牌
        return;
    }

    /**
     * 查找卡牌元素
     */
    findCardElement(card) {
        const cards = document.querySelectorAll('.player-card');
        for (let cardElement of cards) {
            const rank = cardElement.querySelector('.card-rank');
            const suit = cardElement.querySelector('.card-suit');
            if (rank && suit && rank.textContent === card.rank && suit.textContent === card.suit) {
                return cardElement;
            }
        }
        return null;
    }

    /**
     * 显示连击效果
     */
    showComboEffect(text) {
        const combo = document.createElement('div');
        combo.className = 'combo-indicator';
        combo.textContent = text;
        document.querySelector('.central-play-area').appendChild(combo);

        setTimeout(() => combo.remove(), 1000);
    }

    /**
     * 更新游戏状态显示
     */
    updateGameStatus(status) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = status;
            statusElement.style.animation = 'pulse 0.5s ease';
            setTimeout(() => {
                statusElement.style.animation = '';
            }, 500);
        }
    }

    /**
     * 显示消息提示
     */
    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'error' ? 'rgba(231, 76, 60, 0.95)' :
                         type === 'success' ? 'rgba(46, 204, 113, 0.95)' :
                         'rgba(52, 152, 219, 0.95)'};
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 16px;
            z-index: 10000;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: slideInUp 0.3s ease;
        `;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.style.animation = 'slideOutDown 0.3s ease';
            setTimeout(() => messageDiv.remove(), 300);
        }, 2000);
    }
}

// 初始化UI增强功能
document.addEventListener('DOMContentLoaded', () => {
    window.uiEnhancements = new UIEnhancements();
});