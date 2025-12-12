/**
 * 🎯 游戏常量 - 重构版本
 * 定义游戏中使用的所有常量
 */

// 游戏状态枚举
export const GAME_PHASES = {
    WAITING: 'waiting',
    INITIALIZING: 'initializing',
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    FINISHED: 'finished'
};

// 玩家位置枚举
export const PLAYER_POSITIONS = {
    SOUTH: 'south',
    WEST: 'west',
    NORTH: 'north',
    EAST: 'east'
};

// 玩家队伍枚举
export const PLAYER_TEAMS = {
    A: 'A',
    B: 'B'
};

// 游戏事件枚举
export const GAME_EVENTS = {
    // 游戏引擎事件
    GAME_INITIALIZED: 'gameInitialized',
    GAME_STARTED: 'gameStarted',
    GAME_ENDED: 'gameEnded',
    PLAYER_JOINED: 'playerJoined',
    PLAYER_LEFT: 'playerLeft',
    CARDS_DEALT: 'cardsDealt',
    GAME_RESET: 'gameReset',

    // 玩家事件
    PLAYER_UPDATED: 'playerUpdated',
    PLAYER_CHANGED: 'playerChanged',
    CARD_SELECTED: 'cardSelected',
    CARD_PLAYED: 'cardPlayed',
    CARDS_DISCARDED: 'cardsDiscarded',

    // UI事件
    UI_READY: 'uiReady',
    STATE_CHANGED: 'stateChanged',
    ERROR: 'error'
};

// 游戏规则枚举
export const GAME_TYPES = {
    GUANDAN: 'guandan',
    DOUDIZHU: 'doudizhu',
    FIGHT_THE_LANDLORD: 'fight_the_landlord'
};

// 牌型枚举
export const CARD_TYPES = {
    // 普通牌型
    SINGLE: 'single',                    // 单张
    PAIR: 'pair',                        // 对子
    TRIPLE: 'triple',                    // 三张
    TRIPLE_WITH_PAIR: 'triple_with_pair', // 三带二
    STRAIGHT: 'straight',                // 顺子（5张及以上）
    CONSECUTIVE_PAIRS: 'consecutive_pairs', // 连对（3对及以上）
    STEEL_PLATE: 'steel_plate',          // 钢板（连续三张）

    // 炸弹牌型
    STRAIGHT_FLUSH: 'straight_flush',    // 同花顺
    BOMB: 'bomb',                        // 普通炸弹（4张及以上）
    FOUR_KINGS: 'four_kings'             // 王炸（4张王牌）
};

// 牌值映射
export const CARD_VALUES = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
    'level_card': 15.5, // 级牌，比2大，比小王小
    'small_joker': 16, 'big_joker': 17
};

// 动画配置
export const ANIMATIONS = {
    CARD_HOVER: 'card_hover',
    CARD_SELECT: 'card_select',
    CARD_PLAY: 'card_play',
    CARD_DEAL: 'card_deal',
    SHUFFLE: 'shuffle'
};

// 颜色配置
export const COLORS = {
    RED: '#DC143C',
    BLACK: '#000000',
    GOLD: '#FFD700',
    BLUE: '#3498DB',
    GREEN: '#27AE60',
    WHITE: '#FFFFFF'
};

// 断点配置
export const BREAKPOINTS = {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200
};