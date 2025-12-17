/**
 * 🎮 应用入口 - 重构版本
 * 采用模块化架构，支持多种游戏类型
 */

import { GameEngine } from './core/GameEngine';
import { createApp } from './ui';
import { GAME_CONFIG } from '../config/game.config';

/**
 * 主应用类
 */
class GuandanGameApp {
    constructor() {
        this.gameEngine = null;
        this.ui = null;
        this.isInitialized = false;
    }

    /**
     * 初始化应用
     */
    async initialize() {
        try {
            console.log('🚀 初始化掼蛋游戏V2...');

            // 创建游戏引擎
            this.gameEngine = new GameEngine(GAME_CONFIG);

            // 初始化UI
            this.ui = await createApp(this.gameEngine);

            // 设置UI事件监听
            this.setupUIEventListeners();

            // 初始化完成
            this.isInitialized = true;

            console.log('✅ 掼蛋游戏V2初始化完成');

        } catch (error) {
            console.error('❌ 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 设置UI事件监听
     */
    setupUIEventListeners() {
        // 监听游戏引擎事件
        this.gameEngine.on('gameInitialized', () => {
            console.log('🎮 游戏初始化完成');
            this.ui.showGame();
        });

        this.gameEngine.on('gameStarted', () => {
            console.log('🎮 游戏开始');
            this.ui.updateStatus('游戏进行中');
        });

        this.gameEngine.on('playerChanged', (player) => {
            console.log('👤 玩家切换:', player.name);
            this.ui.updateCurrentPlayer(player);
        });

        this.gameEngine.on('cardsDealt', (player) => {
            console.log('🎴 发牌完成:', player.name);
            this.ui.updatePlayerHand(player);
        });

        this.gameEngine.on('cardPlayed', (player, cards) => {
            console.log('🃏 玩家出牌:', player.name, cards);
            this.ui.updatePlayedCards(player, cards);
        });

        this.gameEngine.on('gameEnded', (result) => {
            console.log('🏁 游戏结束:', result);
            this.ui.showGameResult(result);
        });
    }

    /**
     * 启动应用
     */
    start() {
        if (!this.isInitialized) {
            throw new Error('应用未初始化，请先调用 initialize()');
        }

        console.log('🎯 启动掼蛋游戏...');
        this.gameEngine.startGame();
    }

    /**
     * 重置游戏
     */
    reset() {
        console.log('🔄 重置游戏...');
        this.gameEngine.reset();
    }

    /**
     * 获取游戏状态
     */
    getState() {
        return this.gameEngine.getState();
    }
}

/**
 * 启动应用
 */
async function main() {
    const app = new GuandanGameApp();

    await app.initialize();
    await app.start();
}

// 启动应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}