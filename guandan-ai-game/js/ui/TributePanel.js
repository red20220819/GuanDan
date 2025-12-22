/**
 * 进贡UI组件
 * 处理进贡还贡的用户界面交互
 */

class TributePanel {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.isVisible = false;
        this.currentTributeInfo = null;
        this.selectedCards = [];
        this.tributePair = null;

        // 创建UI元素
        this.createElements();
        this.bindEvents();
    }

    /**
     * 创建UI元素
     */
    createElements() {
        // 主容器
        this.container = document.createElement('div');
        this.container.className = 'tribute-panel';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 30px;
            color: white;
            z-index: 10000;
            min-width: 400px;
            max-width: 600px;
            display: none;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        `;

        // 标题
        this.titleElement = document.createElement('h2');
        this.titleElement.style.cssText = `
            margin: 0 0 20px 0;
            text-align: center;
            color: #ffd700;
            font-size: 24px;
        `;
        this.titleElement.textContent = '进贡';

        // 描述信息
        this.descriptionElement = document.createElement('p');
        this.descriptionElement.style.cssText = `
            margin: 0 0 20px 0;
            text-align: center;
            font-size: 16px;
            line-height: 1.5;
        `;

        // 牌选择区域
        this.cardSelectionArea = document.createElement('div');
        this.cardSelectionArea.className = 'tribute-card-selection';
        this.cardSelectionArea.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin: 20px 0;
            min-height: 80px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            justify-content: center;
            align-items: center;
        `;

        // 提示信息
        this.hintElement = document.createElement('div');
        this.hintElement.style.cssText = `
            text-align: center;
            font-size: 14px;
            color: #aaa;
            margin: 10px 0;
        `;

        // 按钮区域
        this.buttonArea = document.createElement('div');
        this.buttonArea.style.cssText = `
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
        `;

        // 确认按钮
        this.confirmButton = document.createElement('button');
        this.confirmButton.textContent = '确认进贡';
        this.confirmButton.style.cssText = `
            padding: 12px 24px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        // 自动选择按钮
        this.autoButton = document.createElement('button');
        this.autoButton.textContent = '自动选择';
        this.autoButton.style.cssText = `
            padding: 12px 24px;
            background: #17a2b8;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

        // 组装UI
        this.buttonArea.appendChild(this.autoButton);
        this.buttonArea.appendChild(this.confirmButton);

        this.container.appendChild(this.titleElement);
        this.container.appendChild(this.descriptionElement);
        this.container.appendChild(this.cardSelectionArea);
        this.container.appendChild(this.hintElement);
        this.container.appendChild(this.buttonArea);

        // 添加到页面
        document.body.appendChild(this.container);
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        this.confirmButton.addEventListener('click', () => this.onConfirm());
        this.autoButton.addEventListener('click', () => this.onAutoSelect());

        // 按钮悬停效果
        this.confirmButton.addEventListener('mouseenter', () => {
            this.confirmButton.style.background = '#218838';
        });
        this.confirmButton.addEventListener('mouseleave', () => {
            this.confirmButton.style.background = '#28a745';
        });

        this.autoButton.addEventListener('mouseenter', () => {
            this.autoButton.style.background = '#138496';
        });
        this.autoButton.addEventListener('mouseleave', () => {
            this.autoButton.style.background = '#17a2b8';
        });
    }

    /**
     * 显示进贡面板
     */
    show(tributePair, tributeInfo) {
        this.currentTributeInfo = tributeInfo;
        this.tributePair = tributePair;
        this.selectedCards = [];

        // 获取玩家信息
        const fromPlayer = this.gameEngine.getPlayerPositionById(tributePair.from);
        const toPlayer = this.gameEngine.getPlayerPositionById(tributePair.to);

        // 更新UI内容
        this.titleElement.textContent = '🎁 进贡';
        this.descriptionElement.textContent =
            `您需要向${toPlayer}进贡${tributePair.cardCount}张最大的牌（不能是王牌和级牌）`;

        // 显示玩家手牌供选择
        this.displayPlayerCards(tributePair.from);

        // 更新提示信息
        this.hintElement.textContent = '请点击选择要进贡的牌';

        // 显示面板
        this.container.style.display = 'block';
        this.isVisible = true;

        // 初始化确认按钮状态
        this.updateConfirmButton();
    }

    /**
     * 显示玩家手牌
     */
    displayPlayerCards(playerId) {
        this.cardSelectionArea.innerHTML = '';

        const playerPosition = this.gameEngine.getPlayerPositionById(playerId);
        const playerCards = this.gameEngine.players[playerPosition].cards;

        if (!playerCards || playerCards.length === 0) {
            this.cardSelectionArea.innerHTML = '<div style="color: #ff6b6b;">没有可选择的牌</div>';
            return;
        }

        // 过滤出可进贡的牌
        const validCards = playerCards.filter(card => {
            return card.rank !== '大王' &&
                   card.rank !== '小王' &&
                   card.rank !== this.currentTributeInfo.currentLevel;
        });

        if (validCards.length === 0) {
            this.cardSelectionArea.innerHTML = '<div style="color: #ff6b6b;">没有可进贡的牌</div>';
            return;
        }

        // 按牌值从大到小排序
        validCards.sort((a, b) => this.getCardValue(b.rank) - this.getCardValue(a.rank));

        // 创建牌元素
        validCards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            this.cardSelectionArea.appendChild(cardElement);
        });
    }

    /**
     * 创建牌元素
     */
    createCardElement(card, index) {
        const cardDiv = document.createElement('div');
        const isSelected = this.selectedCards.some(c =>
            c.rank === card.rank && c.suit === card.suit
        );

        const cardDisplay = this.gameEngine.getCardDisplay(card);

        cardDiv.style.cssText = `
            width: 50px;
            height: 70px;
            background: ${isSelected ? '#ffd700' : 'white'};
            border: 2px solid ${isSelected ? '#ff6b6b' : '#333'};
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            color: ${cardDisplay.color === 'red' ? '#e74c3c' : 'black'};
        `;

        cardDiv.innerHTML = `
            <div style="font-size: 16px;">${cardDisplay.rank}</div>
            ${cardDisplay.suit ? `<div style="font-size: 18px;">${cardDisplay.suit}</div>` : ''}
        `;

        // 添加点击事件
        cardDiv.addEventListener('click', () => this.onCardClick(card, cardDiv));

        return cardDiv;
    }

    /**
     * 牌点击事件
     */
    onCardClick(card, cardElement) {
        const index = this.selectedCards.findIndex(c =>
            c.rank === card.rank && c.suit === card.suit
        );

        if (index >= 0) {
            // 取消选择
            this.selectedCards.splice(index, 1);
            cardElement.style.background = 'white';
            cardElement.style.borderColor = '#333';
        } else {
            // 检查是否还能选择更多牌
            if (this.selectedCards.length >= this.tributePair.cardCount) {
                this.gameEngine.showMessage(`只能选择${this.tributePair.cardCount}张牌`);
                return;
            }

            // 选择牌
            this.selectedCards.push(card);
            cardElement.style.background = '#ffd700';
            cardElement.style.borderColor = '#ff6b6b';
        }

        this.updateHint();
        this.updateConfirmButton();
    }

    /**
     * 更新提示信息
     */
    updateHint() {
        const selected = this.selectedCards.length;
        const needed = this.tributePair.cardCount;

        if (selected === 0) {
            this.hintElement.textContent = `请选择${needed}张最大的牌`;
        } else if (selected < needed) {
            this.hintElement.textContent = `已选择${selected}张，还需选择${needed - selected}张`;
        } else {
            this.hintElement.textContent = `已选择${selected}张牌`;
        }
    }

    /**
     * 更新确认按钮状态
     */
    updateConfirmButton() {
        const canConfirm = this.selectedCards.length === this.tributePair.cardCount;

        this.confirmButton.disabled = !canConfirm;
        this.confirmButton.style.opacity = canConfirm ? '1' : '0.5';
        this.confirmButton.style.cursor = canConfirm ? 'pointer' : 'not-allowed';
    }

    /**
     * 自动选择进贡牌
     */
    onAutoSelect() {
        const cards = this.gameEngine.tributeSystem.autoSelectTributeCards(
            this.tributePair.from,
            this.currentTributeInfo
        );

        if (cards.length === 0) {
            this.gameEngine.showMessage('无法自动选择进贡牌');
            return;
        }

        // 清除之前的选择
        this.selectedCards = [];

        // 重新显示牌并标记选中的牌
        this.displayPlayerCards(this.tributePair.from);

        // 延迟标记选中的牌，确保DOM已更新
        setTimeout(() => {
            const cardElements = this.cardSelectionArea.children;
            for (let cardElement of cardElements) {
                const cardData = this.extractCardFromElement(cardElement);
                if (cardData && cards.some(c => c.rank === cardData.rank && c.suit === cardData.suit)) {
                    this.selectedCards.push(cardData);
                    cardElement.style.background = '#ffd700';
                    cardElement.style.borderColor = '#ff6b6b';
                }
            }

            this.updateHint();
            this.updateConfirmButton();
        }, 100);
    }

    /**
     * 从元素中提取牌信息
     */
    extractCardFromElement(cardElement) {
        const rankText = cardElement.querySelector('div').textContent;
        const suitText = cardElement.querySelector('div:last-child')?.textContent || '';

        // 处理王牌
        if (rankText === 'JOKER') {
            const isRed = cardElement.style.color === '#e74c3c';
            return { rank: isRed ? '大王' : '小王', suit: 'joker' };
        }

        return { rank: rankText, suit: suitText };
    }

    /**
     * 确认进贡
     */
    onConfirm() {
        if (this.selectedCards.length !== this.tributePair.cardCount) {
            this.gameEngine.showMessage(`请选择${this.tributePair.cardCount}张牌`);
            return;
        }

        // 执行进贡
        const result = this.gameEngine.tributeSystem.selectTributeCards(
            this.tributePair.from,
            this.selectedCards,
            this.currentTributeInfo
        );

        if (result.success) {
            this.gameEngine.showMessage('进贡成功！');
            this.hide();

            // 检查是否完成所有进贡
            if (result.waitingFor === undefined || result.waitingFor === 0) {
                // 进贡完成，继续处理
                this.gameEngine.checkAndCompleteTribute();
            }
        } else {
            this.gameEngine.showMessage(`进贡失败：${result.message}`);
        }
    }

    /**
     * 隐藏面板
     */
    hide() {
        this.container.style.display = 'none';
        this.isVisible = false;
        this.selectedCards = [];
        this.currentTributeInfo = null;
        this.tributePair = null;
    }

    /**
     * 获取牌的数值
     */
    getCardValue(rank) {
        const values = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
            '小王': 16, '大王': 17
        };
        return values[rank] || 0;
    }

    /**
     * 显示还贡面板
     */
    showReturnTribute(returnInfo) {
        this.currentTributeInfo = returnInfo;

        // 更新UI内容为还贡
        this.titleElement.textContent = '📤 还贡';
        this.descriptionElement.textContent = '请选择一张≤10的牌还贡给进贡者';

        // 显示还贡牌选择
        this.displayReturnCards(returnInfo.from);

        this.hintElement.textContent = '请选择1张还贡牌（≤10，非王牌）';

        this.container.style.display = 'block';
        this.isVisible = true;

        // 更新确认按钮文本
        this.confirmButton.textContent = '确认还贡';
    }

    /**
     * 显示还贡牌选择
     */
    displayReturnCards(playerId) {
        this.cardSelectionArea.innerHTML = '';

        const playerPosition = this.gameEngine.getPlayerPositionById(playerId);
        const playerCards = this.gameEngine.players[playerPosition].cards;

        if (!playerCards || playerCards.length === 0) {
            this.cardSelectionArea.innerHTML = '<div style="color: #ff6b6b;">没有可选择的牌</div>';
            return;
        }

        // 过滤出可还贡的牌（≤10，非王牌）
        const validCards = playerCards.filter(card => {
            const cardValue = this.getCardValue(card.rank);
            return cardValue <= 10 &&
                   card.rank !== '大王' &&
                   card.rank !== '小王' &&
                   card.rank !== this.currentTributeInfo.currentLevel;
        });

        if (validCards.length === 0) {
            // 如果没有≤10的牌，显示最小的非王牌
            const nonJokerCards = playerCards.filter(card =>
                card.rank !== '大王' && card.rank !== '小王'
            );
            validCards.push(...nonJokerCards.slice(0, 5)); // 最多显示5张
        }

        // 按牌值从小到大排序（还贡要选最小的）
        validCards.sort((a, b) => this.getCardValue(a.rank) - this.getCardValue(b.rank));

        // 创建牌元素
        validCards.forEach((card, index) => {
            const cardElement = this.createCardElement(card, index);
            this.cardSelectionArea.appendChild(cardElement);
        });
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}