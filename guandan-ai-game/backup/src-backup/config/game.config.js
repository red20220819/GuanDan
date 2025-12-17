/**
 * 🎯 游戏配置 - 重构版本
 * 支持多种游戏类型的配置管理
 */

export const GAME_CONFIG = {
    // 游戏基础配置
    game: {
        type: 'guandan',
        name: '掼蛋',
        version: '2.0.0',
        description: '现代化的掼蛋游戏，支持多种游戏规则',
        rules: {
            // 级牌配置
            level: {
                currentLevel: 2,            // 当前级数（从2开始）
                levelCardRank: '2',         // 级牌的点数
                levelCardSuit: '♥',         // 级牌的花色（红桃）
                displayAs: '主',             // 级牌的显示标记
                getLevelCardValue: function(level) {
                    // 级牌值比2大，比小王小
                    return 15.5;
                },
                isLevelCard: function(card, level) {
                    // 判断是否为级牌
                    const levelRank = this.getLevelCardRank(level);
                    return card.rank === levelRank && card.suit === '♥';
                },
                getLevelCardRank: function(level) {
                    // 根据级数返回对应的点数
                    const levelMap = {
                        2: '2', 3: '3', 4: '4', 5: '5', 6: '6',
                        7: '7', 8: '8', 9: '9', 10: '10',
                        J: 'J', Q: 'Q', K: 'K', A: 'A'
                    };
                    return levelMap[level] || '2';
                },
                updateLevel: function(newLevel) {
                    this.currentLevel = newLevel;
                    this.levelCardRank = this.getLevelCardRank(newLevel);
                }
            },
            // 牌堆配置
            deck: {
                totalCards: 108,        // 两副牌 + 4张大小王
                suits: ['♠', '♥', '♣', '♦'],
                ranks: ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'],
                jokers: {
                    small: { display: '🃟', value: 16 },
                    big: { display: '🃏', value: 17 }
                }
            },
            // 玩家配置
            players: {
                count: 4,
                positions: ['west', 'north', 'east', 'south'],
                teams: {
                    A: ['south', 'north'],   // 队友
                    B: ['west', 'east']       // 对手
                }
            },
            // 发牌配置
            dealing: {
                cardsPerPlayer: 27,
                enableAnimations: true,
                autoSort: true
            },
            // AI配置
            ai: {
                difficulties: ['easy', 'medium', 'hard'],
                defaultDifficulty: 'medium',
                thinkingTime: 1500,      // AI思考时间(ms)
                enableHints: true,
                enableMemory: true
            },
            // UI配置
            ui: {
                theme: 'default',
                enableAnimations: true,
                enableSound: true,
                showCardCount: true,
                showTimer: true,
                responsive: true
            },
            // 事件配置
            events: {
                enableDebugMode: false,
                enableEventLogging: true
            }
        }
    },

    // 构建配置
    build: {
        development: {
            port: 8080,
            open: true,
            hotReload: true,
            sourceMap: true
        },
        production: {
            optimization: true,
            minification: true,
            sourceMap: false
        }
    },

    // 调试配置
    debug: {
        enableConsole: true,
        enableSourceMap: true,
        showStateChanges: true,
        enableEventLogging: true
    }
};

export default GAME_CONFIG;