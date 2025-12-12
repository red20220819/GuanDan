/**
 * 玩家管理组件
 * 负责管理4个玩家的信息、状态和交互
 */

class PlayerManager {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.players = [];
        this.currentPlayer = null;
        this.teams = {
            A: [], // 队伍A: 南北
            B: []  // 队伍B: 东西
        };
    }

    /**
     * 初始化玩家
     */
    initializePlayers() {
        // 4个玩家：东南西北，南与北同队，东与西同队
        this.players = [
            {
                id: 'south',
                name: '玩家1',
                position: 'south',
                team: 'A',
                isAI: false,
                avatar: '🌟',
                score: 0,
                totalCards: 27
            },
            {
                id: 'north',
                name: 'AI玩家2',
                position: 'north',
                team: 'A',
                isAI: true,
                avatar: '🤖',
                score: 0,
                totalCards: 27
            },
            {
                id: 'west',
                name: 'AI玩家3',
                position: 'west',
                team: 'B',
                isAI: true,
                avatar: '🎯',
                score: 0,
                totalCards: 27
            },
            {
                id: 'east',
                name: 'AI玩家4',
                position: 'east',
                team: 'B',
                isAI: true,
                avatar: '⚡',
                score: 0,
                totalCards: 27
            }
        ];

        // 设置队伍
        this.teams.A = [this.players[0], this.players[1]]; // 南北
        this.teams.B = [this.players[2], this.players[3]]; // 东西

        this.currentPlayer = this.players[0]; // 南方玩家先开始
    }

    /**
     * 获取所有玩家
     */
    getAllPlayers() {
        return this.players;
    }

    /**
     * 获取当前玩家
     */
    getCurrentPlayer() {
        return this.currentPlayer;
    }

    /**
     * 设置当前玩家
     */
    setCurrentPlayer(player) {
        if (typeof player === 'string') {
            player = this.getPlayerById(player);
        }
        this.currentPlayer = player;
    }

    /**
     * 根据ID获取玩家
     */
    getPlayerById(playerId) {
        return this.players.find(p => p.id === playerId);
    }

    /**
     * 根据位置获取玩家
     */
    getPlayerByPosition(position) {
        return this.players.find(p => p.position === position);
    }

    /**
     * 获取玩家队伍
     */
    getPlayerTeam(player) {
        if (typeof player === 'string') {
            player = this.getPlayerById(player);
        }
        return player ? player.team : null;
    }

    /**
     * 获取玩家队友
     */
    getPlayerTeammate(player) {
        const team = this.getPlayerTeam(player);
        if (!team) return null;

        return this.teams[team].find(p => p.id !== player.id);
    }

    /**
     * 获取玩家对手
     */
    getPlayerOpponents(player) {
        const team = this.getPlayerTeam(player);
        if (!team) return [];

        return team === 'A' ? this.teams.B : this.teams.A;
    }

    /**
     * 检查是否为队友
     */
    isTeammate(player1, player2) {
        return this.getPlayerTeam(player1) === this.getPlayerTeam(player2);
    }

    /**
     * 检查是否为对手
     */
    isOpponent(player1, player2) {
        return this.getPlayerTeam(player1) !== this.getPlayerTeam(player2);
    }

    /**
     * 更新玩家分数
     */
    updatePlayerScore(player, score) {
        if (typeof player === 'string') {
            player = this.getPlayerById(player);
        }
        if (player) {
            player.score += score;
        }
    }

    /**
     * 获取玩家手牌数量
     */
    getPlayerCardCount(player) {
        if (typeof player === 'string') {
            player = this.getPlayerById(player);
        }

        const gameState = this.gameEngine.getGameState();
        const hand = gameState.playerHands[player.id];
        return hand ? hand.length : 0;
    }

    /**
     * 获取队伍总牌数
     */
    getTeamCardCount(team) {
        const gameState = this.gameEngine.getGameState();
        let totalCards = 0;

        for (let player of this.teams[team]) {
            const hand = gameState.playerHands[player.id];
            if (hand) {
                totalCards += hand.length;
            }
        }

        return totalCards;
    }

    /**
     * 获取玩家信息面板HTML
     */
    getPlayerInfoHTML(player) {
        if (typeof player === 'string') {
            player = this.getPlayerById(player);
        }
        if (!player) return '';

        const teammate = this.getPlayerTeammate(player);
        const isTeammate = player && teammate;

        const teamIcon = isTeammate ? '🤝' : '⚔️';
        const teamClass = isTeammate ? 'teammate-indicator' : 'opponent-indicator';

        return `
            <div class="player-avatar">${player.avatar}</div>
            <div class="player-details">
                <div class="player-name-row">
                    <div class="player-name">${player.name}</div>
                    <div class="team-indicator ${teamClass}">${teamIcon}</div>
                </div>
                <div class="player-status">
                    <span class="card-count-info">剩余: ${this.getPlayerCardCount(player)}张</span>
                </div>
            </div>
        `;
    }

    /**
     * 更新玩家信息面板
     */
    updatePlayerInfoPanel(player) {
        const infoElements = document.querySelectorAll(`.player-info[data-player="${player.id}"]`);
        if (infoElements.length > 0) {
            infoElements.forEach(element => {
                element.innerHTML = this.getPlayerInfoHTML(player);
            });
        }
    }

    /**
     * 更新所有玩家信息面板
     */
    updateAllPlayerInfoPanels() {
        for (let player of this.players) {
            this.updatePlayerInfoPanel(player);
        }
    }

    /**
     * 设置玩家高亮状态
     */
    highlightPlayer(player, highlight = true) {
        if (typeof player === 'string') {
            player = this.getPlayerById(player);
        }

        const infoElements = document.querySelectorAll(`.player-info[data-player="${player.id}"]`);
        infoElements.forEach(element => {
            if (highlight) {
                element.style.boxShadow = '0 0 20px rgba(255, 215, 0, 0.5)';
                element.style.border = '2px solid #FFD700';
            } else {
                element.style.boxShadow = '';
                element.style.border = '';
            }
        });
    }

    /**
     * 移除所有玩家高亮
     */
    clearAllHighlights() {
        for (let player of this.players) {
            this.highlightPlayer(player, false);
        }
    }

    /**
     * 设置下一玩家
     */
    nextPlayer() {
        const currentIndex = this.players.findIndex(p => p.id === this.currentPlayer.id);
        this.currentPlayer = this.players[(currentIndex + 1) % 4];
        this.clearAllHighlights();
        this.highlightPlayer(this.currentPlayer);
    }

    /**
     * 随机选择首发玩家
     */
    randomizeFirstPlayer() {
        const randomIndex = Math.floor(Math.random() * 4);
        this.currentPlayer = this.players[randomIndex];
        console.log(`${this.currentPlayer.name} 获得首发`);
    }

    /**
     * 根据牌数选择首发玩家（抽牌决定）
     */
    selectFirstPlayerByCard() {
        // 简化实现：随机选择
        this.randomizeFirstPlayer();
    }

    /**
     * 显示玩家信息
     */
    showPlayerInfo() {
        for (let player of this.players) {
            const teammate = this.getPlayerTeammate(player);
            const opponentCount = this.getPlayerOpponents(player).length;

            console.log(`${player.name} (${player.team}队)`);
            console.log(`  - 手牌数: ${this.getPlayerCardCount(player)}`);
            console.log(`  - 队友: ${teammate ? teammate.name : '无'}`);
            console.log(`  - 对手数: ${opponentCount}`);
            console.log(`  - 是否AI: ${player.isAI ? '是' : '否'}`);
        }
    }

    /**
     * 获取玩家统计信息
     */
    getPlayerStats() {
        const stats = {};

        for (let player of this.players) {
            stats[player.id] = {
                name: player.name,
                team: player.team,
                isAI: player.isAI,
                score: player.score,
                cardCount: this.getPlayerCardCount(player),
                position: player.position,
                avatar: player.avatar,
                teammate: this.getPlayerTeammate(player),
                opponents: this.getPlayerOpponents(player).map(p => p.id)
            };
        }

        return stats;
    }

    /**
     * 导出玩家数据供保存
     */
    exportPlayerData() {
        return {
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                position: p.position,
                team: p.team,
                isAI: p.isAI,
                avatar: p.avatar,
                score: p.score
            })),
            teams: this.teams,
            currentPlayer: this.currentPlayer.id
        };
    }
}

// 导出玩家管理器
window.PlayerManager = PlayerManager;