/**
 * 级别显示UI组件
 * 负责显示队伍级数、打A状态等信息
 */

class LevelDisplay {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.levelManager = gameEngine.levelManager;
        this.upgradeRuleEngine = gameEngine.upgradeRuleEngine;

        // 绑定事件监听器
        this.bindEvents();

        // 初始化显示
        this.updateDisplay();

        // 初始化左上角级数显示
        this.updateTeamLevelsDisplay();
    }

    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听升级事件
        if (this.levelManager) {
            this.levelManager.addEventListener('levelUp', (e) => {
                this.onLevelUp(e.detail);
            });

            this.levelManager.addEventListener('reachAGate', (e) => {
                this.onReachAGate(e.detail);
            });

            this.levelManager.addEventListener('aGateFailed', (e) => {
                this.onAGateFailed(e.detail);
            });

            this.levelManager.addEventListener('gameWon', (e) => {
                this.onGameWon(e.detail);
            });
        }

        // 监听游戏结果
        if (this.upgradeRuleEngine) {
            this.upgradeRuleEngine.addEventListener('gameResult', (e) => {
                this.onGameResult(e.detail);
            });
        }
    }

    /**
     * 更新显示
     */
    updateDisplay() {
        if (!this.levelManager) return;

        const teamStatus = this.levelManager.getAllTeamStatus();
        this.displayTeamLevels(teamStatus);

        // 更新左上角级数显示
        this.updateTeamLevelsDisplay();
    }

    /**
     * 显示队伍级数
     */
    displayTeamLevels(teamStatus) {
        // 更新主级数显示
        const levelElement = document.getElementById('level');
        if (levelElement) {
            const globalLevel = teamStatus.globalLevel;
            const levelText = this.getLevelText(globalLevel);
            levelElement.textContent = levelText;
        }

        // 创建或更新队伍级数显示
        this.createOrUpdateTeamDisplay(teamStatus);
    }

    /**
     * 获取级数文本
     */
    getLevelText(level) {
        const levelNames = {
            2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
            10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
        };
        return levelNames[level] || level;
    }

    /**
     * 更新左上角队伍级数显示
     */
    updateTeamLevelsDisplay() {
        if (!this.levelManager) return;

        const teamStatus = this.levelManager.getAllTeamStatus();
        const dealerTeam = this.levelManager.getDealerTeam();

        // 更新A队级数
        const teamALevelElement = document.getElementById('teamALevelNumber');
        if (teamALevelElement) {
            teamALevelElement.textContent = this.getLevelText(teamStatus.teamA.level);
        }

        // 更新B队级数
        const teamBLevelElement = document.getElementById('teamBLevelNumber');
        if (teamBLevelElement) {
            teamBLevelElement.textContent = this.getLevelText(teamStatus.teamB.level);
        }

        // 更新庄家指示器
        this.updateDealerIndicator(dealerTeam);
    }

    /**
     * 更新庄家指示器
     */
    updateDealerIndicator(dealerTeam) {
        const teamAIndicator = document.getElementById('teamAActiveIndicator');
        const teamBIndicator = document.getElementById('teamBActiveIndicator');
        const teamADisplay = document.getElementById('teamALevelDisplay');
        const teamBDisplay = document.getElementById('teamBLevelDisplay');

        // 移除所有庄家标记
        if (teamAIndicator) teamAIndicator.classList.remove('active');
        if (teamBIndicator) teamBIndicator.classList.remove('active');
        if (teamADisplay) teamADisplay.classList.remove('is-dealer');
        if (teamBDisplay) teamBDisplay.classList.remove('is-dealer');

        // 添加庄家标记
        if (dealerTeam === 'A') {
            if (teamAIndicator) teamAIndicator.classList.add('active');
            if (teamADisplay) teamADisplay.classList.add('is-dealer');
        } else if (dealerTeam === 'B') {
            if (teamBIndicator) teamBIndicator.classList.add('active');
            if (teamBDisplay) teamBDisplay.classList.add('is-dealer');
        }
    }

    /**
     * 创建或更新队伍显示区域
     */
    createOrUpdateTeamDisplay(teamStatus) {
        let teamDisplayElement = document.getElementById('team-levels-display');

        if (!teamDisplayElement) {
            // 创建队伍显示区域
            teamDisplayElement = document.createElement('div');
            teamDisplayElement.id = 'team-levels-display';
            teamDisplayElement.className = 'team-levels-container';

            // 插入到合适的位置（在info-display后面）
            const infoDisplay = document.querySelector('.info-display');
            if (infoDisplay) {
                infoDisplay.parentNode.insertBefore(teamDisplayElement, infoDisplay.nextSibling);
            } else {
                // 如果找不到info-display，添加到body
                document.body.appendChild(teamDisplayElement);
            }
        }

        // 更新显示内容
        teamDisplayElement.innerHTML = `
            <div class="team-level team-a ${teamStatus.teamA.isAtAGate ? 'at-a-gate' : ''}">
                <span class="team-label">己方队伍</span>
                <span class="level-value">${teamStatus.teamA.levelDisplay}</span>
                ${teamStatus.teamA.isAtAGate ? '<span class="a-gate-indicator">打A中</span>' : ''}
            </div>
            <div class="team-level team-b ${teamStatus.teamB.isAtAGate ? 'at-a-gate' : ''}">
                <span class="team-label">对方队伍</span>
                <span class="level-value">${teamStatus.teamB.levelDisplay}</span>
                ${teamStatus.teamB.isAtAGate ? '<span class="a-gate-indicator">打A中</span>' : ''}
            </div>
        `;
    }

    /**
     * 处理升级事件
     */
    onLevelUp(detail) {
        console.log('[LevelDisplay] 升级:', detail);
        this.updateDisplay();
        this.showUpgradeAnimation(detail);

        // 更新左上角级数显示
        this.updateTeamLevelsDisplay();
    }

    /**
     * 处理到达A关事件
     */
    onReachAGate(detail) {
        console.log('[LevelDisplay] 到达A关:', detail);
        this.updateDisplay();
        this.showNotification(`${detail.team === 'A' ? '己方' : '对方'}队伍到达A关！`, 'info');
    }

    /**
     * 处理A关失败事件
     */
    onAGateFailed(detail) {
        console.log('[LevelDisplay] A关失败:', detail);
        this.updateDisplay();
        this.showNotification(
            `${detail.team === 'A' ? '己方' : '对方'}打A失败，退回J级`,
            'error'
        );
    }

    /**
     * 处理游戏胜利事件
     */
    onGameWon(detail) {
        console.log('[LevelDisplay] 游戏胜利:', detail);
        this.showVictoryAnimation(detail.winnerTeam);
    }

    /**
     * 处理游戏结果
     */
    onGameResult(detail) {
        console.log('[LevelDisplay] 游戏结果:', detail);
        this.showGameResult(detail);
    }

    /**
     * 显示升级动画
     */
    showUpgradeAnimation(detail) {
        const levelElement = document.getElementById('level');
        if (levelElement) {
            levelElement.classList.add('level-up-animation');
            setTimeout(() => {
                levelElement.classList.remove('level-up-animation');
            }, 1000);
        }
    }

    /**
     * 显示通知
     */
    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // 添加到页面
        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    /**
     * 显示胜利动画
     */
    showVictoryAnimation(winnerTeam) {
        const message = winnerTeam === 'A' ? '🎉 己方队伍获胜！🎉' : '😔 对方队伍获胜';
        this.showNotification(message, 'success');

        // 创建胜利特效
        this.createVictoryEffect(winnerTeam === 'A');
    }

    /**
     * 显示游戏结果
     */
    showGameResult(detail) {
        const message = detail.fullDescription || detail.description;
        this.showNotification(message, detail.upgradeResult.success ? 'success' : 'error');
    }

    /**
     * 创建胜利特效
     */
    createVictoryEffect(isWin) {
        // 创建胜利特效
        const effect = document.createElement('div');
        effect.className = `victory-effect ${isWin ? 'victory-win' : 'victory-lose'}`;

        document.body.appendChild(effect);

        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
}

// 动画样式已移至 css/features/animations.css

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelDisplay;
}