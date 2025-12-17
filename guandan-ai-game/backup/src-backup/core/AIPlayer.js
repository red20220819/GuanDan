/**
 * 🤖 AI玩家基类 - 重构版本
 * 支持多种AI难度、记忆系统和策略模式
 */

import { GAME_TYPES, GAME_PHASES, CARD_TYPES, CARD_VALUES } from './Constants.js';

export class AIPlayer {
    constructor(id, name, position, team, difficulty = 'medium', gameState) {
        this.id = id;
        this.name = name;
        this.position = position;
        this.team = team;
        this.difficulty = difficulty;
        this.gameState = gameState;
        this.cards = [];
        this.selectedCards = [];
        this.memory = new Map();
        this.thinkingTime = this.getThinkingTime();

        console.log(`🤖 AI玩家初始化: ${name} (${position}, 难度: ${difficulty})`);
    }

    /**
     * 获取思考时间
     */
    getThinkingTime() {
        const times = {
            easy: 2000,
            medium: 1500,
            hard: 1000
        };
        return times[this.difficulty] || times.medium;
    }

    /**
     * 设置手牌
     */
    setCards(cards) {
        this.cards = [...cards];
        this.selectedCards = [];
        this.sortCards();
        console.log(`🃏 AI ${this.name} 收到 ${cards.length} 张牌`);
    }

    /**
     * 排序手牌
     */
    sortCards() {
        this.cards.sort((a, b) => {
            // 先按牌值排序
            if (CARD_VALUES[a.rank] !== CARD_VALUES[b.rank]) {
                return CARD_VALUES[a.rank] - CARD_VALUES[b.rank];
            }
            return CARD_VALUES[a.rank] - CARD_VALUES[b.rank];
        });

        // 再按花色排序（相同牌值时）
        this.cards.sort((a, b) => {
            const suitOrder = { '♠': 0, '♣': 1, '♥': 2, '♦': 3 };
            if (CARD_VALUES[a.rank] === CARD_VALUES[b.rank]) {
                return suitOrder[a.suit] - suitOrder[b.suit];
            }
            return 0;
        });
    }

    /**
     * 开始思考
     */
    async startThinking() {
        console.log(`🤔 AI ${this.name} 开始思考...`);

        // 记忆对手出的牌
        this.recordMemory();

        // 触发思考动画
        this.onThinkingStart && this.onThinkingStart();
    }

    /**
     * 停止思考
     */
    stopThinking() {
        console.log(`✅ AI ${this.name} 思考完成`);
        this.onThinkingEnd && this.onThinkingEnd();
    }

    /**
     * 记忆游戏信息
     */
    recordMemory() {
        if (!this.gameState) return;

        const currentTurn = this.gameState.currentTurn;
        const lastPlay = this.gameState.getLastPlay();

        // 记忆最近5轮的出牌
        if (lastPlay && currentTurn > 0) {
            const memoryKey = `turn_${currentTurn - 1}`;
            this.memory.set(memoryKey, {
                cards: lastPlay.cards,
                player: lastPlay.player,
                type: lastPlay.type
            });

            // 清理旧记忆
            if (this.memory.size > 10) {
                const oldKeys = Array.from(this.memory.keys())
                    .filter(key => parseInt(key.split('_')[1]) < currentTurn - 5)
                    .sort((a, b) => parseInt(b.split('_')[1]) - parseInt(a.split('_')[1]));

                oldKeys.slice(0, oldKeys.length - 5).forEach(key => {
                    this.memory.delete(key);
                });
            }
        }
    }

    /**
     * 获取记忆中的信息
     */
    getMemory(key) {
        return this.memory.get(key);
    }

    /**
     * 获取可出的牌型
     */
    getPlayablePlays(lastPlay = null) {
        const plays = [];

        // 单张
        this.cards.forEach(card => {
            plays.push({
                type: CARD_TYPES.SINGLE,
                cards: [card],
                value: this.calculatePlayValue([card])
            });
        });

        // 对子
        for (let i = 0; i < this.cards.length - 1; i++) {
            if (this.cards[i].rank === this.cards[i + 1].rank) {
                plays.push({
                    type: CARD_TYPES.PAIR,
                    cards: [this.cards[i], this.cards[i + 1]],
                    value: this.calculatePlayValue([this.cards[i], this.cards[i + 1]])
                });
            }
        }

        // 三张（相同牌值）
        for (let i = 0; i < this.cards.length - 2; i++) {
            if (this.cards[i].rank === this.cards[i + 1].rank &&
                this.cards[i + 1].rank === this.cards[i + 2].rank) {
                plays.push({
                    type: CARD_TYPES.TRIPLE,
                    cards: [this.cards[i], this.cards[i + 1], this.cards[i + 2]],
                    value: this.calculatePlayValue([this.cards[i], this.cards[i + 1], this.cards[i + 2]])
                });
            }
        }

        // 炸弹（根据难度）
        const bombPlays = this.getBombPlays();

        // 过滤掉比上家小的牌型
        if (lastPlay) {
            return plays.filter(play =>
                this.comparePlays(play, lastPlay) > 0
            );
        }

        return [...plays, ...bombPlays];
    }

    /**
     * 获取炸弹出法
     */
    getBombPlays() {
        const bombPlays = [];
        const rankCounts = new Map();

        // 统计每种牌值的数量
        this.cards.forEach(card => {
            const count = rankCounts.get(card.rank) || 0;
            rankCounts.set(card.rank, count + 1);
        });

        // 检查可能的炸弹
        for (const [rank, count] of rankCounts) {
            if (count >= 4) {
                const bombCards = this.cards.filter(card => card.rank === rank);
                bombPlays.push({
                    type: CARD_TYPES.BOMB,
                    cards: bombCards,
                    value: this.calculatePlayValue(bombCards)
                });
            }
        }

        // 根据难度决定是否出炸弹
        if (this.difficulty === 'easy') {
            return []; // 简单模式少出炸弹
        } else if (this.difficulty === 'hard') {
            return bombPlays; // 困难模式多出炸弹
        }

        return bombPlays.slice(0, 2); // 中等模式适量出炸弹
    }

    /**
     * 计算出牌价值
     */
    calculatePlayValue(cards) {
        if (!cards || cards.length === 0) return 0;

        // 简化计算：牌值总和 + 牌型加成
        let value = cards.reduce((sum, card) => {
            const cardValue = CARD_VALUES[card.rank] || 0;
            return sum + cardValue + (cards.length > 1 ? 5 : 0); // 多张牌加成
        }, 0);

        // 特殊牌型加成
        if (cards.length === 1) {
            value += 10; // 单张基础分
        } else if (cards.length === 2) {
            value += 20; // 对子基础分
        } else if (cards.length === 3) {
            value += 30; // 三张基础分
        }

        return value;
    }

    /**
     * 比较两个出牌
     */
    comparePlays(play1, play2) {
        // 先比较牌型大小
        const typeOrder = [
            CARD_TYPES.ROCKET,
            CARD_TYPES.BOMB,
            CARD_TYPES.FOUR_KINGS,
            CARD_TYPES.STRAIGHT,
            CARD_TYPES.TRIPLE,
            CARD_TYPES.PAIR,
            CARD_TYPES.SINGLE
        ];

        const type1Index = typeOrder.indexOf(play1.type);
        const type2Index = typeOrder.indexOf(play2.type);

        if (type1Index !== type2Index) {
            return type1Index - type2Index;
        }

        // 同类型比较牌值
        if (play1.type === play2.type) {
            return this.compareSameTypePlays(play1, play2);
        }

        return 0;
    }

    /**
     * 比较同类型出牌
     */
    compareSameTypePlays(play1, play2) {
        if (play1.type === CARD_TYPES.BOMB) {
            // 炸弹比较张数
            return play1.cards.length - play2.cards.length;
        }

        // 其他类型比较主要牌值
        return play1.value - play2.value;
    }

    /**
     * 决定出牌策略
     */
    async makeDecision(lastPlay) {
        await this.startThinking();

        try {
            const validPlays = this.getPlayablePlays(lastPlay);

            if (validPlays.length === 0) {
                this.stopThinking();
                return null;
            }

            let selectedPlay;

            // 根据难度选择策略
            if (this.difficulty === 'easy') {
                // 简单：优先出小牌
                selectedPlay = validPlays[0];
            } else if (this.difficulty === 'medium') {
                // 中等：平衡策略
                selectedPlay = this.selectBalancedPlay(validPlays, lastPlay);
            } else {
                // 困难：智能策略
                selectedPlay = this.selectSmartPlay(validPlays, lastPlay);
            }

            this.selectedCards = selectedPlay.cards;
            this.stopThinking();

            console.log(`🎯 AI ${this.name} 选择出牌:`, selectedPlay);
            return selectedPlay;

        } catch (error) {
            this.stopThinking();
            console.error(`❌ AI ${this.name} 决策错误:`, error);
            return null;
        }
    }

    /**
     * 选择平衡的出牌
     */
    selectBalancedPlay(validPlays, lastPlay) {
        // 根据上家出牌调整策略
        if (lastPlay) {
            // 如果上家出了大牌，我们也出大牌
            const hasBigPlay = lastPlay.value > 50;
            const bigPlays = validPlays.filter(play => play.value > 40);
            if (hasBigPlay && bigPlays.length > 0) {
                return bigPlays[0];
            }
        }

        // 优先出中等大小的牌
        const mediumPlays = validPlays.filter(play =>
            play.value >= 20 && play.value <= 40
        );

        if (mediumPlays.length > 0) {
            return mediumPlays[0];
        }

        // 否则出最小的牌
        return validPlays[0];
    }

    /**
     * 选择智能的出牌
     */
    selectSmartPlay(validPlays, lastPlay) {
        // 分析牌面信息
        const analysis = this.analyzeGameState(lastPlay);

        // 根据情况选择策略
        if (analysis.shouldAggressive) {
            return this.selectAggressivePlay(validPlays);
        } else if (analysis.shouldDefensive) {
            return this.selectDefensivePlay(validPlays);
        } else {
            return this.selectOptimalPlay(validPlays);
        }
    }

    /**
     * 分析游戏状态
     */
    analyzeGameState(lastPlay) {
        const remainingCards = this.countRemainingCards();
        const ourTeamCards = remainingCards[this.team] || 0;
        const enemyTeamCards = remainingCards[this.team === 'A' ? 'B' : 'A'] || 0;

        return {
            shouldAggressive: ourTeamCards > enemyTeamCards + 5,
            shouldDefensive: ourTeamCards < enemyTeamCards - 3,
            canWin: ourTeamCards > 15,
            pressure: remainingCards.total < 20
        };
    }

    /**
     * 选择激进出牌
     */
    selectAggressivePlay(validPlays) {
        // 优先出炸弹或大牌
        const bombPlays = validPlays.filter(play =>
            play.type === CARD_TYPES.BOMB || play.value > 40
        );

        if (bombPlays.length > 0) {
            return bombPlays.reduce((best, play) =>
                play.value > best.value ? play : best
            );
        }

        return validPlays[validPlays.length - 1]; // 出最大的牌
    }

    /**
     * 选择防守出牌
     */
    selectDefensivePlay(validPlays) {
        // 优先出小牌，保留大牌
        return validPlays.reduce((best, play) => {
            // 守势：优先出小牌
            if (play.value < best.value) {
                return play;
            }
            return best;
        });
    }

    /**
     * 选择最优出牌
     */
    selectOptimalPlay(validPlays) {
        // 使用简单的启发式算法
        return validPlays.reduce((best, play) => {
            const playScore = this.evaluatePlay(play);
            const bestScore = this.evaluatePlay(best);

            return playScore > bestScore ? play : best;
        });
    }

    /**
     * 评估出牌
     */
    evaluatePlay(play) {
        let score = 0;

        // 牌型价值
        const typeScores = {
            [CARD_TYPES.SINGLE]: 10,
            [CARD_TYPES.PAIR]: 20,
            [CARD_TYPES.TRIPLE]: 30,
            [CARD_TYPES.BOMB]: 60,
            [CARD_TYPES.STRAIGHT]: 40
        };

        score += typeScores[play.type] || 0;

        // 牌值价值
        score += play.value;

        // 策略加分
        if (play.type === CARD_TYPES.BOMB) {
            score += 20; // 炸弹额外加分
        }

        return score;
    }

    /**
     * 统计剩余牌数
     */
    countRemainingCards() {
        if (!this.gameState) return { total: 0 };

        const remaining = new Map();
        const allPlayers = this.gameState.getPlayers();

        allPlayers.forEach(player => {
            const team = player.team;
            const currentCount = remaining.get(team) || 0;
            remaining.set(team, currentCount + player.cards.length);
        });

        const total = Array.from(remaining.values())
            .reduce((sum, count) => sum + count, 0);

        return {
            ...Object.fromEntries(remaining),
            total
        };
    }

    /**
     * 销毁AI玩家
     */
    destroy() {
        this.cards = [];
        this.selectedCards = [];
        this.memory.clear();
        console.log(`💥 AI玩家 ${this.name} 已销毁`);
    }
}