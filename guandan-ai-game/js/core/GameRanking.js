/**
 * 游戏排名系统
 * 负责记录玩家排名、计算胜负结果
 */

class GameRanking {
    constructor() {
        // 玩家排名顺序 [头游, 二游, 三游, 末游]
        this.rankings = [];

        // 已完成游戏的玩家（按完成顺序记录）
        this.finishedPlayers = [];

        // 玩家位置到队伍的映射
        this.playerTeams = {
            south: 'A',  // 玩家
            north: 'A',  // AI队友
            east: 'B',   // AI对手
            west: 'B'    // AI对手
        };

        // 事件发射器
        this.eventEmitter = new EventTarget();

        // 游戏是否结束
        this.gameEnded = false;
    }

    /**
     * 设置玩家队伍映射
     * @param {object} mapping - 玩家位置到队伍的映射
     */
    setPlayerTeams(mapping) {
        this.playerTeams = { ...this.playerTeams, ...mapping };
    }

    /**
     * 记录玩家完成游戏
     * @param {string} playerPosition - 玩家位置 ('south', 'north', 'east', 'west')
     * @returns {object|null} 如果游戏结束返回结果，否则返回null
     */
    recordPlayerFinish(playerPosition) {
        // 检查游戏是否已经结束
        if (this.gameEnded) {
            return null;
        }

        // 记录完成的玩家
        if (!this.finishedPlayers.includes(playerPosition)) {
            this.finishedPlayers.push(playerPosition);

            // 触发玩家完成事件
            this.eventEmitter.dispatchEvent(new CustomEvent('playerFinished', {
                detail: { playerPosition, rank: this.finishedPlayers.length }
            }));
        }

        // 检查是否所有玩家都完成了游戏
        if (this.finishedPlayers.length === 4) {
            this.rankings = [...this.finishedPlayers];
            this.gameEnded = true;

            // 计算游戏结果
            const result = this.calculateGameResult();

            // 触发游戏结束事件
            this.eventEmitter.dispatchEvent(new CustomEvent('gameEnded', {
                detail: result
            }));

            return result;
        }

        return null;
    }

    /**
     * 计算游戏结果
     * @returns {object} 游戏结果
     */
    calculateGameResult() {
        const [first, second, third, fourth] = this.rankings;
        const rankNames = ['头游', '二游', '三游', '末游'];

        // 获取队伍
        const firstTeam = this.playerTeams[first];
        const secondTeam = this.playerTeams[second];
        const thirdTeam = this.playerTeams[third];
        const fourthTeam = this.playerTeams[fourth];

        // 判断升级数和结果类型
        let levelsUp = 0;
        let resultType = '';
        let winnerTeam = firstTeam;

        if (firstTeam === secondTeam) {
            // 头游和二游同队 - 双上 - 升3级
            levelsUp = 3;
            resultType = '头游+二游';
            winnerTeam = firstTeam;
        } else if (firstTeam === thirdTeam) {
            // 头游和三游同队 - 单上 - 升2级
            levelsUp = 2;
            resultType = '头游+三游';
            winnerTeam = firstTeam;
        } else {
            // 头游和末游同队 - 平上 - 升1级
            levelsUp = 1;
            resultType = '头游+末游';
            winnerTeam = firstTeam;
        }

        // 构建结果对象
        const result = {
            rankings: this.rankings,
            rankNames: rankNames,
            playerTeams: {
                first: { position: first, team: firstTeam },
                second: { position: second, team: secondTeam },
                third: { position: third, team: thirdTeam },
                fourth: { position: fourth, team: fourthTeam }
            },
            winnerTeam: winnerTeam,
            resultType: resultType,
            levelsUp: levelsUp,
            description: `${winnerTeam === 'A' ? '己方' : '对方'}获胜！${resultType}，升${levelsUp}级`,

            // 详细的排名信息
            details: {
                firstPlace: { position: first, team: firstTeam, rank: rankNames[0] },
                secondPlace: { position: second, team: secondTeam, rank: rankNames[1] },
                thirdPlace: { position: third, team: thirdTeam, rank: rankNames[2] },
                fourthPlace: { position: fourth, team: fourthTeam, rank: rankNames[3] }
            }
        };

        return result;
    }

    /**
     * 检查玩家是否已完成游戏
     * @param {string} playerPosition - 玩家位置
     * @returns {boolean} 是否已完成
     */
    isPlayerFinished(playerPosition) {
        return this.finishedPlayers.includes(playerPosition);
    }

    /**
     * 获取玩家当前排名
     * @param {string} playerPosition - 玩家位置
     * @returns {number|null} 排名（1-4），未完成返回null
     */
    getPlayerRank(playerPosition) {
        const index = this.finishedPlayers.indexOf(playerPosition);
        return index >= 0 ? index + 1 : null;
    }

    /**
     * 重置排名（用于新游戏开始）
     */
    resetRanking() {
        this.rankings = [];
        this.finishedPlayers = [];
        this.gameEnded = false;
    }

    /**
     * 获取当前排名状态
     * @returns {object} 当前状态
     */
    getCurrentStatus() {
        return {
            rankings: [...this.rankings],
            finishedPlayers: [...this.finishedPlayers],
            gameEnded: this.gameEnded,
            finishedCount: this.finishedPlayers.length
        };
    }

    /**
     * 获取队伍在当前局的表现
     * @param {string} team - 队伍标识
     * @returns {object} 队伍表现
     */
    getTeamPerformance(team) {
        const teamPlayers = Object.entries(this.playerTeams)
            .filter(([pos, t]) => t === team)
            .map(([pos]) => pos);

        const ranks = teamPlayers.map(pos => this.getPlayerRank(pos)).filter(rank => rank !== null);

        return {
            players: teamPlayers,
            ranks: ranks,
            bestRank: ranks.length > 0 ? Math.min(...ranks) : null,
            avgRank: ranks.length > 0 ? ranks.reduce((a, b) => a + b, 0) / ranks.length : null
        };
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
    module.exports = GameRanking;
}