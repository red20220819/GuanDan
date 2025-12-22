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

        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 10px 20px;
            border-radius: 4px;
            font-weight: bold;
            z-index: 1000;
            animation: slideDown 0.3s ease-out;
        `;

        // 设置颜色
        switch(type) {
            case 'success':
                notification.style.background = '#d4edda';
                notification.style.color = '#155724';
                notification.style.border = '1px solid #c3e6cb';
                break;
            case 'error':
                notification.style.background = '#f8d7da';
                notification.style.color = '#721c24';
                notification.style.border = '1px solid #f5c6cb';
                break;
            default:
                notification.style.background = '#d1ecf1';
                notification.style.color = '#0c5460';
                notification.style.border = '1px solid #bee5eb';
        }

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
        // 创建烟花效果或其他视觉特效
        const effect = document.createElement('div');
        effect.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 999;
            background: ${isWin ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)'};
            animation: fadeInOut 2s ease-out;
        `;

        document.body.appendChild(effect);

        setTimeout(() => {
            if (effect.parentNode) {
                effect.parentNode.removeChild(effect);
            }
        }, 2000);
    }
}

// 添加必要的CSS动画
const style = document.createElement('style');
style.textContent = `
    .team-levels-container {
        display: flex;
        gap: 20px;
        padding: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        margin: 10px 0;
    }

    .team-level {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 15px;
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
    }

    .team-a {
        border: 2px solid #28a745;
    }

    .team-b {
        border: 2px solid #dc3545;
    }

    .team-label {
        font-size: 14px;
        opacity: 0.8;
    }

    .level-value {
        font-size: 18px;
        font-weight: bold;
    }

    .a-gate-indicator {
        font-size: 12px;
        padding: 2px 6px;
        background: #ffc107;
        color: #000;
        border-radius: 10px;
        animation: pulse 1s infinite;
    }

    .at-a-gate {
        background: rgba(255, 193, 7, 0.1) !important;
        box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
    }

    .level-up-animation {
        animation: levelUp 1s ease-out;
    }

    @keyframes levelUp {
        0% { transform: scale(1); }
        50% { transform: scale(1.3); color: #28a745; }
        100% { transform: scale(1); }
    }

    @keyframes slideDown {
        0% { transform: translate(-50%, -100%); opacity: 0; }
        100% { transform: translate(-50%, 0); opacity: 1; }
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    @keyframes fadeInOut {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

// 导出类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelDisplay;
}