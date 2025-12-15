/**
 * 升级规则引擎
 * 协调 LevelManager 和 GameRanking，实现完整的升级规则和打A关特殊规则
 */

class UpgradeRuleEngine {
    constructor(levelManager, gameRanking) {
        this.levelManager = levelManager;
        this.gameRanking = gameRanking;
        this.eventEmitter = new EventTarget();

        // 绑定游戏排名事件
        this.bindEvents();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听游戏结束事件
        this.gameRanking.addEventListener('gameEnded', (e) => {
            this.onGameEnded(e.detail);
        });

        // 监听玩家完成事件
        this.gameRanking.addEventListener('playerFinished', (e) => {
            this.onPlayerFinished(e.detail);
        });
    }

    /**
     * 处理游戏结束
     * @param {object} result - 游戏排名结果
     */
    onGameEnded(result) {
        // 应用升级规则
        const upgradeResult = this.levelManager.handleUpgrade(
            result.winnerTeam,
            result.levelsUp
        );

        // 创建完整的游戏结果
        const finalResult = {
            ...result,
            upgradeResult: upgradeResult,
            teamStatus: this.levelManager.getAllTeamStatus()
        };

        // 生成详细描述
        finalResult.fullDescription = this.generateFullDescription(finalResult);

        // 触发游戏结果事件
        this.eventEmitter.dispatchEvent(new CustomEvent('gameResult', {
            detail: finalResult
        }));
    }

    /**
     * 处理玩家完成
     * @param {object} detail - 玩家完成详情
     */
    onPlayerFinished(detail) {
        // 可以在这里添加额外的逻辑，如播放音效、显示动画等
        console.log(`玩家 ${detail.playerPosition} 完成游戏，排名第 ${detail.rank}`);
    }

    /**
     * 生成完整的游戏结果描述
     * @param {object} result - 游戏结果
     * @returns {string} 完整描述
     */
    generateFullDescription(result) {
        const { winnerTeam, resultType, levelsUp, upgradeResult } = result;

        let description = `${winnerTeam === 'A' ? '己方' : '对方'}获胜！\n${resultType}，升${levelsUp}级`;

        // 检查是否通过A关
        if (upgradeResult.isAGatePassed) {
            description = `🎉 ${winnerTeam === 'A' ? '己方' : '对方'}通过A关，赢得整场比赛！🎉`;
        }
        // 检查是否打A失败
        else if (upgradeResult.success === false &&
                 (this.levelManager.teamLevels[winnerTeam].isAtAGate ||
                  upgradeResult.newLevel === 11)) {
            description = `❌ ${winnerTeam === 'A' ? '己方' : '对方'}打A失败，退回J级`;
        }

        return description;
    }

    /**
     * 获取升级规则说明
     * @returns {object} 规则说明
     */
    getUpgradeRules() {
        return {
            basicRules: {
                "头游+二游": "升3级（双上）",
                "头游+三游": "升2级（单上）",
                "头游+末游": "升1级（平上）"
            },
            aGateRules: {
                "到达A": "进入打A关模式",
                "打A成功": "必须双上（升3级）才能通过A关，赢得比赛",
                "打A失败": "退回到J级，下一局从J级重新开始"
            },
            tips: [
                "打A时只有双上才能过关",
                "打A失败会退回到J级",
                "先通过A关的队伍赢得整场比赛"
            ]
        };
    }

    /**
     * 检查游戏是否可以结束
     * @returns {boolean} 是否可以结束
     */
    checkGameCanEnd() {
        // 如果有队伍已经通过A关，游戏可以结束
        const teamStatus = this.levelManager.getAllTeamStatus();
        if (teamStatus.teamA.level === 14 || teamStatus.teamB.level === 14) {
            // 需要检查是否确实通过A关（不是刚到达）
            return false; // 到达A只是开始，需要通过A关才算结束
        }
        return false;
    }

    /**
     * 获取当前游戏状态
     * @returns {object} 游戏状态
     */
    getCurrentGameStatus() {
        const rankingStatus = this.gameRanking.getCurrentStatus();
        const teamStatus = this.levelManager.getAllTeamStatus();

        return {
            ranking: rankingStatus,
            teams: teamStatus,
            gameInProgress: !rankingStatus.gameEnded && rankingStatus.finishedCount < 4,
            canEnd: this.checkGameCanEnd()
        };
    }

    /**
     * 预测升级结果（用于AI决策）
     * @param {string} playerPosition - 玩家位置
     * @returns {object} 预测结果
     */
    predictUpgradeResult(playerPosition) {
        const currentStatus = this.gameRanking.getCurrentStatus();
        const team = this.gameRanking.playerTeams[playerPosition];

        // 简单的预测逻辑
        if (currentStatus.finishedCount >= 2) {
            // 已经有玩家完成，可以预测
            const currentRankings = [...currentStatus.finishedPlayers];

            // 假设该玩家会是下一个完成的
            if (!currentRankings.includes(playerPosition)) {
                currentRankings.push(playerPosition);
            }

            // 填充剩余位置（简单模拟）
            while (currentRankings.length < 4) {
                const allPositions = ['south', 'north', 'east', 'west'];
                const remaining = allPositions.filter(pos => !currentRankings.includes(pos));
                currentRankings.push(remaining[0]);
            }

            // 计算预测结果
            const [first, second, third] = currentRankings;
            const firstTeam = this.gameRanking.playerTeams[first];
            const secondTeam = this.gameRanking.playerTeams[second];

            let predictedLevelsUp = 0;
            if (firstTeam === secondTeam) {
                predictedLevelsUp = 3;
            } else if (firstTeam === team) {
                predictedLevelsUp = 2;
            } else {
                predictedLevelsUp = 1;
            }

            return {
                willWin: team === firstTeam,
                predictedLevelsUp: predictedLevelsUp,
                isAtAGate: this.levelManager.teamLevels[team].isAtAGate
            };
        }

        return null;
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

    /**
     * 重置规则引擎（用于新游戏开始）
     */
    reset() {
        this.gameRanking.resetRanking();
        this.levelManager.resetGame();
    }
}

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UpgradeRuleEngine;
}