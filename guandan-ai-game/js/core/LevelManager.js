/**
 * 级别管理器
 * 负责管理队伍级数、升级逻辑、打A关状态
 */

class LevelManager {
    constructor() {
        // 级数序列
        this.levelRanks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        // 队伍级数状态
        this.teamLevels = {
            A: {
                level: 2,           // 当前级数索引 (2-14)
                isAtAGate: false,   // 是否在打A关
                aGateAttempts: 0    // 打A尝试次数
            },
            B: {
                level: 2,
                isAtAGate: false,
                aGateAttempts: 0
            }
        };

        // 事件发射器
        this.eventEmitter = new EventTarget();

        // 当前全局级数（两个队伍级数的较大值）
        this.currentGlobalLevel = 2;

        // 花色循环（用于级牌显示）
        this.levelSuits = ['♠', '♥', '♣', '♦'];
    }

    /**
     * 获取当前级数显示
     * @param {string} team - 队伍标识 ('A' 或 'B')
     * @returns {string} 级数显示（如：2♠, A♥）
     */
    getLevelDisplay(team) {
        const teamData = this.teamLevels[team];
        const levelIndex = teamData.level - 2;
        const rank = this.levelRanks[levelIndex] || teamData.level;

        // 计算花色（循环变化）
        const suitIndex = levelIndex % this.levelSuits.length;
        const suit = this.levelSuits[suitIndex];

        return `${rank}${suit}`;
    }

    /**
     * 获取当前级数（数字）
     * @param {string} team - 队伍标识
     * @returns {number} 级数（2-14）
     */
    getCurrentLevel(team) {
        return this.teamLevels[team].level;
    }

    /**
     * 获取当前全局级数
     * @returns {number} 全局级数
     */
    getCurrentGlobalLevel() {
        this.currentGlobalLevel = Math.max(this.teamLevels.A.level, this.teamLevels.B.level);
        return this.currentGlobalLevel;
    }

    /**
     * 检查是否到达A关
     * @param {string} team - 队伍标识
     * @returns {boolean} 是否到达A关
     */
    checkReachAGate(team) {
        const level = this.teamLevels[team].level;
        if (level === 14) { // A是第14级
            this.teamLevels[team].isAtAGate = true;
            this.eventEmitter.dispatchEvent(new CustomEvent('reachAGate', {
                detail: { team }
            }));
            return true;
        }
        return false;
    }

    /**
     * 处理升级
     * @param {string} team - 队伍标识
     * @param {number} levelsUp - 升级数
     * @returns {object} 升级结果
     */
    handleUpgrade(team, levelsUp) {
        const currentLevel = this.teamLevels[team].level;
        const isAtAGate = this.teamLevels[team].isAtAGate;

        if (isAtAGate) {
            // 打A关特殊处理
            return this.handleAGateUpgrade(team, levelsUp);
        } else {
            // 普通升级
            let newLevel = Math.min(currentLevel + levelsUp, 14);
            this.teamLevels[team].level = newLevel;

            // 检查是否到达A关
            if (newLevel === 14) {
                this.teamLevels[team].isAtAGate = true;
                this.eventEmitter.dispatchEvent(new CustomEvent('reachAGate', {
                    detail: { team }
                }));
            }

            // 触发升级事件
            this.eventEmitter.dispatchEvent(new CustomEvent('levelUp', {
                detail: { team, oldLevel: currentLevel, newLevel, levelsUp }
            }));

            return {
                success: true,
                newLevel,
                isAGatePassed: false,
                gameWon: false
            };
        }
    }

    /**
     * 处理打A关升级
     * @param {string} team - 队伍标识
     * @param {number} levelsUp - 升级数
     * @returns {object} 升级结果
     */
    handleAGateUpgrade(team, levelsUp) {
        // 打A关必须双上（升3级）才能通过
        if (levelsUp === 3) {
            // 通过A关，赢得游戏
            this.eventEmitter.dispatchEvent(new CustomEvent('gameWon', {
                detail: { team, winnerTeam: team }
            }));
            return {
                success: true,
                newLevel: 14,
                isAGatePassed: true,
                gameWon: true
            };
        } else {
            // 打A失败，退回J级
            this.teamLevels[team].level = 11; // J是第11级
            this.teamLevels[team].isAtAGate = false;
            this.teamLevels[team].aGateAttempts++;

            this.eventEmitter.dispatchEvent(new CustomEvent('aGateFailed', {
                detail: { team, fallbackLevel: 11, attempts: this.teamLevels[team].aGateAttempts }
            }));

            return {
                success: false,
                newLevel: 11,
                isAGatePassed: false,
                gameWon: false
            };
        }
    }

    /**
     * 重置游戏（用于新游戏开始）
     */
    resetGame() {
        this.teamLevels = {
            A: { level: 2, isAtAGate: false, aGateAttempts: 0 },
            B: { level: 2, isAtAGate: false, aGateAttempts: 0 }
        };
        this.currentGlobalLevel = 2;
    }

    /**
     * 获取队伍状态
     * @param {string} team - 队伍标识
     * @returns {object} 队伍状态
     */
    getTeamStatus(team) {
        return {
            ...this.teamLevels[team],
            levelDisplay: this.getLevelDisplay(team),
            isAtAGate: this.teamLevels[team].isAtAGate
        };
    }

    /**
     * 获取所有队伍状态
     * @returns {object} 所有队伍状态
     */
    getAllTeamStatus() {
        return {
            teamA: this.getTeamStatus('A'),
            teamB: this.getTeamStatus('B'),
            globalLevel: this.getCurrentGlobalLevel()
        };
    }

    /**
     * 获取庄家队伍
     * 规则：当前级数较高的队伍，如果相同则返回A队（默认）
     * @returns {string} 'A' 或 'B'
     */
    getDealerTeam() {
        const teamALevel = this.teamLevels.A.level;
        const teamBLevel = this.teamLevels.B.level;

        if (teamALevel > teamBLevel) {
            return 'A';
        } else if (teamBLevel > teamALevel) {
            return 'B';
        } else {
            // 级数相同时，默认返回A队
            return 'A';
        }
    }

    /**
     * 添加事件监听器
     * @param {string} eventType - 事件类型
     * @param {function} callback - 回调函数
     */
    addEventListener(eventType, callback) {
        this.eventEmitter.addEventListener(eventType, callback);
    }

    /**
     * 移除事件监听器
     * @param {string} eventType - 事件类型
     * @param {function} callback - 回调函数
     */
    removeEventListener(eventType, callback) {
        this.eventEmitter.removeEventListener(eventType, callback);
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelManager;
}