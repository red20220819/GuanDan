/**
 * 牌堆管理组件
 * 负责掼蛋游戏的牌堆创建、洗牌、发牌和万能牌管理
 */

class DeckManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.deck = [];
        this.currentLevel = 2; // 当前级数（从2开始）
        this.jokerCard = null; // 当前万能牌
        this.discardPile = []; // 弃牌堆
    }

    /**
     * 创建掼蛋牌堆（两副牌 + 大小王）
     */
    createDeck() {
        this.deck = [];
        const suits = ['♠', '♥', '♣', '♦'];
        const ranks = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];

        // 创建两副完整扑克牌（104张）
        for (let deckNum = 0; deckNum < 2; deckNum++) {
            for (let suit of suits) {
                for (let rank of ranks) {
                    this.deck.push({
                        suit: suit,
                        rank: rank,
                        display: rank + suit,
                        value: this.getCardValue(rank),
                        suitOrder: this.getSuitOrder(suit),
                        deckNum: deckNum,
                        id: `card_${deckNum}_${suit}_${rank}` // 唯一标识符
                    });
                }
            }

            // 添加大小王（每副牌各一张）
            this.deck.push({
                suit: 'joker',
                rank: 'small',
                display: '🃟',
                value: 102,  // 小王权重，与规则文档一致
                deckNum: deckNum,
                id: `card_${deckNum}_joker_small`
            });

            this.deck.push({
                suit: 'joker',
                rank: 'big',
                display: '🃏',
                value: 103,  // 大王权重，与规则文档一致
                deckNum: deckNum,
                id: `card_${deckNum}_joker_big`
            });
        }

        // 设置当前万能牌
        this.updateJokerCard();

        console.log(`创建牌堆完成：${this.deck.length}张牌`);
        return this.deck;
    }

    /**
     * 获取牌值
     */
    getCardValue(rank) {
        const valueMap = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15
        };
        return valueMap[rank] || 0;
    }

    /**
     * 获取花色顺序
     */
    getSuitOrder(suit) {
        const orderMap = {
            '♠': 4, '♥': 3, '♣': 2, '♦': 1, 'joker': 0
        };
        return orderMap[suit] || 0;
    }

    /**
     * 更新万能牌（逢人配）
     */
    updateJokerCard() {
        this.jokerCard = {
            suit: '♥',
            rank: this.currentLevel.toString(),
            display: this.currentLevel + '♥',
            value: this.getCardValue(this.currentLevel.toString()),
            isJoker: true
        };
    }

    /**
     * 设置级数
     */
    setLevel(level) {
        this.currentLevel = level;
        this.updateJokerCard();
        console.log(`级数更新为：${level}，万能牌：${this.jokerCard.display}`);
    }

    /**
     * 检查是否为万能牌
     */
    isJokerCard(card) {
        return card.suit === '♥' && card.rank === this.currentLevel.toString();
    }

    /**
     * 洗牌
     */
    shuffleDeck() {
        // Fisher-Yates 洗牌算法
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
        console.log('洗牌完成');
        return this.deck;
    }

    /**
     * 发牌（每人27张）
     */
    dealCards(playerCount = 4) {
        const cardsPerPlayer = Math.floor(this.deck.length / playerCount);
        const hands = {};

        // 发牌给每个玩家
        for (let i = 0; i < playerCount; i++) {
            const playerId = this.getPlayerIdByIndex(i);
            hands[playerId] = this.deck.splice(0, cardsPerPlayer);

            // 排序手牌
            this.sortCards(hands[playerId]);
        }

        console.log(`发牌完成：每人${cardsPerPlayer}张`);
        return hands;
    }

    /**
     * 根据索引获取玩家ID
     */
    getPlayerIdByIndex(index) {
        const playerIds = ['south', 'west', 'north', 'east'];
        return playerIds[index] || 'south';
    }

    /**
     * 排序牌组
     */
    sortCards(cards) {
        cards.sort((a, b) => {
            // 按点数排序（从大到小）
            if (a.value !== b.value) {
                return b.value - a.value;
            }
            // 相同点数按花色排序
            return b.suitOrder - a.suitOrder;
        });
        return cards;
    }

    /**
     * 分离万能牌和普通牌
     */
    separateJokers(cards) {
        const jokers = cards.filter(card => this.isJokerCard(card));
        const normals = cards.filter(card => !this.isJokerCard(card));
        return { jokers, normals };
    }

    /**
     * 获取剩余牌数
     */
    getRemainingCards() {
        return this.deck.length;
    }

    /**
     * 添加弃牌
     */
    addToDiscardPile(cards) {
        this.discardPile.push(...cards);
    }

    /**
     * 清空弃牌堆
     */
    clearDiscardPile() {
        this.discardPile = [];
    }

    /**
     * 重新洗牌（将弃牌堆重新加入）
     */
    reshuffleFromDiscard() {
        if (this.discardPile.length > 0) {
            this.deck.push(...this.discardPile);
            this.clearDiscardPile();
            this.shuffleDeck();
            console.log('从弃牌堆重新洗牌');
        }
    }

    /**
     * 统计特定牌的数量
     */
    countCardsByRank(rank, cards) {
        return cards.filter(card => card.rank === rank).length;
    }

    /**
     * 检查是否有足够数量的牌
     */
    hasEnoughCards(count) {
        return this.deck.length >= count;
    }

    /**
     * 抽取指定数量的牌
     */
    drawCards(count) {
        if (!this.hasEnoughCards(count)) {
            console.warn(`牌堆不足，需要${count}张，剩余${this.deck.length}张`);
            return null;
        }
        return this.deck.splice(0, count);
    }

    /**
     * 抽取单张牌
     */
    drawCard() {
        return this.deck.shift();
    }

    /**
     * 验证牌的合法性（是否在当前牌池中）
     */
    validateCard(card) {
        return this.deck.some(c =>
            c.suit === card.suit &&
            c.rank === card.rank &&
            c.deckNum === card.deckNum
        );
    }

    /**
     * 获取牌堆统计信息
     */
    getDeckStats() {
        const stats = {
            totalCards: this.deck.length,
            jokerCards: 0,
            levelCards: 0,
            discardPileSize: this.discardPile.length,
            suitsCount: {}
        };

        for (let card of this.deck) {
            // 统计万能牌
            if (this.isJokerCard(card)) {
                stats.jokerCards++;
            }

            // 统计级牌
            if (card.rank === this.currentLevel.toString()) {
                stats.levelCards++;
            }

            // 统计花色
            stats.suitsCount[card.suit] = (stats.suitsCount[card.suit] || 0) + 1;
        }

        return stats;
    }

    /**
     * 创建指定牌型的测试牌组
     */
    createTestCards(cardType) {
        const testCards = [];

        switch (cardType) {
            case 'bomb':
                // 创建炸弹（4张相同点数）
                const bombRank = '7';
                for (let suit of ['♠', '♥', '♣', '♦']) {
                    testCards.push({
                        suit: suit,
                        rank: bombRank,
                        display: bombRank + suit,
                        value: this.getCardValue(bombRank),
                        suitOrder: this.getSuitOrder(suit)
                    });
                }
                break;

            case 'rocket':
                // 创建火箭（大小王）
                testCards.push({
                    suit: 'joker',
                    rank: 'small',
                    display: '🃟',
                    value: 17
                });
                testCards.push({
                    suit: 'joker',
                    rank: 'big',
                    display: '🃏',
                    value: 18
                });
                break;

            case 'straight':
                // 创建顺子（5张连续）
                const straightRanks = ['6', '7', '8', '9', '10'];
                for (let rank of straightRanks) {
                    testCards.push({
                        suit: '♠',
                        rank: rank,
                        display: rank + '♠',
                        value: this.getCardValue(rank),
                        suitOrder: this.getSuitOrder('♠')
                    });
                }
                break;
        }

        return testCards;
    }

    /**
     * 导出牌堆状态供保存
     */
    exportDeckState() {
        return {
            deck: [...this.deck],
            currentLevel: this.currentLevel,
            jokerCard: { ...this.jokerCard },
            discardPile: [...this.discardPile],
            stats: this.getDeckStats()
        };
    }

    /**
     * 加载牌堆状态
     */
    importDeckState(state) {
        this.deck = [...state.deck];
        this.currentLevel = state.currentLevel;
        this.jokerCard = { ...state.jokerCard };
        this.discardPile = [...state.discardPile];
        console.log('牌堆状态加载完成');
    }

    /**
     * 重置牌堆
     */
    reset() {
        this.deck = [];
        this.currentLevel = 2;
        this.jokerCard = null;
        this.discardPile = [];
        console.log('牌堆已重置');
    }
}

// 导出牌堆管理器
window.DeckManager = DeckManager;