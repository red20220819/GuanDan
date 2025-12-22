/**
 * 进贡还贡系统
 * 处理掼蛋游戏中的进贡和还贡规则
 */

class TributeSystem {
    constructor(gameEngine) {
        this.gameEngine = gameEngine;
        this.tributeConfig = {
            // 进贡规则
            giveTribute: {
                threshold: 4,          // 落后4级或以上需要进贡
                doubleThreshold: 8,    // 落后8级或以上需要双进贡
                cardCount: 1,          // 单进贡张数
                doubleCardCount: 2     // 双进贡张数
            },
            // 还贡规则
            returnTribute: {
                mustReturn: true,      // 是否必须还贡
                returnCard: 'joker'    // 还贡牌型（默认王牌）
            },
            // A级特殊规则
            levelARules: {
                no2s: true,            // A级不打2
                noTrickWith2: true     // 不能用2组成牌型
            }
        };

        this.currentTributeState = {
            // 游戏状态
            isTributeRound: false,
            tributeLevel: null,

            // 进贡信息
            tributes: [],              // 进贡记录 [{from: player, to: player, cards: [cards]}]

            // 还贡信息
            returns: [],               // 还贡记录 [{from: player, to: player, cards: [cards]}]

            // 玩家记录
            playerRecords: {}          // 每个玩家的进贡还贡记录
        };
    }

    /**
     * 检查是否需要进贡
     * @param {Object} gameState - 当前游戏状态
     * @returns {Object|null} 进贡配置或null
     */
    checkTributeNeeded(gameState) {
        if (!gameState) {
            return null;
        }

        // 1. 检查是否首副游戏 - 首副跳过进贡
        if (this.isFirstRound(gameState)) {
            return null;
        }

        // 2. 检查是否有玩家名次信息
        if (!gameState.playerRanks || gameState.playerRanks.length < 4) {
            return null;
        }

        // 3. 获取玩家排名 (0=头游, 1=二游, 2=三游, 3=末游)
        const playerRanks = gameState.playerRanks;
        const firstPlayer = playerRanks[0];  // 头游
        const secondPlayer = playerRanks[1]; // 二游
        const thirdPlayer = playerRanks[2];  // 三游
        const lastPlayer = playerRanks[3];   // 末游

        // 4. 判断是否需要进贡 - 基于级差
        const levelDiff = this.calculateLevelDiff(gameState);
        if (levelDiff < 4) {
            return null; // 级差小于4级不需要进贡
        }

        // 5. 判断双下 vs 单下
        const isDoubleDown = this.isDoubleDown(lastPlayer, thirdPlayer, gameState);

        // 6. 判断抗贡 - 检查末游是否持有双王
        let antiTribute = false;
        if (isDoubleDown) {
            // 双下情况下，两个末游都需要检查抗贡
            antiTribute = this.checkAntiTribute(lastPlayer, gameState) ||
                          this.checkAntiTribute(thirdPlayer, gameState);
        } else {
            // 单下情况下，只检查末游
            antiTribute = this.checkAntiTribute(lastPlayer, gameState);
        }

        // 7. 构建进贡信息
        const tributeInfo = {
            needsTribute: true,
            isDoubleTribute: isDoubleDown,
            antiTribute: antiTribute,
            levelDiff: levelDiff,
            currentLevel: gameState.currentLevel,
            playerRanks: playerRanks,
            // 抗贡后头游先出
            firstLead: antiTribute ? firstPlayer : null
        };

        if (antiTribute) {
            // 抗贡情况：无进贡无还贡，头游先出
            tributeInfo.needsTribute = false;
            tributeInfo.antiTributePlayers = isDoubleDown ?
                [lastPlayer, thirdPlayer].filter(p => this.checkAntiTribute(p, gameState)) :
                [lastPlayer];
        } else {
            // 正常进贡情况
            tributeInfo.tributePairs = this.buildTributePairs(
                isDoubleDown, firstPlayer, secondPlayer, thirdPlayer, lastPlayer, gameState
            );
        }

        return tributeInfo;
    }

    /**
     * 检查是否首副游戏
     */
    isFirstRound(gameState) {
        // 首副判断：当前级数为2且没有升级记录
        return gameState.currentLevel === '2' &&
               (!gameState.roundHistory || gameState.roundHistory.length === 0);
    }

    /**
     * 计算级差
     */
    calculateLevelDiff(gameState) {
        // 获取两个队伍的级数
        const team1Level = this.getTeamLevel('A', gameState);
        const team2Level = this.getTeamLevel('B', gameState);
        return Math.abs(team1Level - team2Level);
    }

    /**
     * 获取指定队伍的级数
     */
    getTeamLevel(teamId, gameState) {
        // 从游戏状态获取队伍级数
        if (gameState.teams) {
            const team = gameState.teams.find(t => t.id === teamId);
            if (team) return this.getLevelValue(team.level);
        }

        // 备用：从玩家级数推断
        const teamPlayers = gameState.players ?
            gameState.players.filter(p => p.team === teamId) : [];
        if (teamPlayers.length > 0) {
            return this.getLevelValue(teamPlayers[0].level);
        }

        return 2; // 默认级数
    }

    /**
     * 获取级数对应的数值
     */
    getLevelValue(level) {
        const values = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
                        '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return values[level] || 2;
    }

    /**
     * 判断是否双下（两个末游在同一队）
     */
    isDoubleDown(lastPlayer, thirdPlayer, gameState) {
        if (!gameState.players) return false;

        const lastPlayerData = gameState.players.find(p => p.id === lastPlayer);
        const thirdPlayerData = gameState.players.find(p => p.id === thirdPlayer);

        if (!lastPlayerData || !thirdPlayerData) return false;

        return lastPlayerData.team === thirdPlayerData.team;
    }

    /**
     * 检查抗贡（双王抗贡）
     */
    checkAntiTribute(playerId, gameState) {
        if (!gameState.hands || !gameState.hands[playerId]) {
            return false;
        }

        const playerHand = gameState.hands[playerId];
        const jokerCount = playerHand.filter(card =>
            card.rank === '大王' || card.rank === '小王'
        ).length;

        return jokerCount >= 2; // 双王抗贡
    }

    /**
     * 构建进贡对子（谁给谁进贡）
     */
    buildTributePairs(isDoubleDown, firstPlayer, secondPlayer, thirdPlayer, lastPlayer, gameState) {
        const pairs = [];

        if (isDoubleDown) {
            // 双下：末游向头游，三游向二游
            pairs.push({
                from: lastPlayer,    // 末游 → 头游
                to: firstPlayer,
                cardCount: 1
            });
            pairs.push({
                from: thirdPlayer,   // 三游 → 二游
                to: secondPlayer,
                cardCount: 1
            });
        } else {
            // 单下：末游向头游
            pairs.push({
                from: lastPlayer,    // 末游 → 头游
                to: firstPlayer,
                cardCount: 1
            });
        }

        return pairs;
    }

    /**
     * 获取队伍的当前级数
     */
    getTeamLevel(team, gameState) {
        // 简化实现：假设每个队伍有level属性
        return team.level || gameState.currentLevel || 2;
    }

    /**
     * 开始进贡流程
     * @param {Object} tributeInfo - 进贡信息
     */
    startTributeRound(tributeInfo) {
        this.currentTributeState.isTributeRound = true;
        this.currentTributeState.tributeLevel = tributeInfo.currentLevel;
        this.currentTributeState.tributes = [];
        this.currentTributeState.returns = [];

        // 检查是否抗贡
        if (tributeInfo.antiTribute) {
            // 抗贡：无进贡无还贡，头游先出
            return this.handleAntiTribute(tributeInfo);
        }

        // 正常进贡流程
        // 为每个玩家初始化记录
        if (tributeInfo.tributePairs) {
            tributeInfo.tributePairs.forEach(pair => {
                this.currentTributeState.playerRecords[pair.from] = {
                    gave: [],
                    received: []
                };
                this.currentTributeState.playerRecords[pair.to] = {
                    gave: [],
                    received: []
                };
            });
        }

        console.log(`[TributeSystem] 开始进贡流程：${tributeInfo.isDoubleTribute ? '双下' : '单下'}进贡`);

        return {
            success: true,
            needsTribute: true,
            message: `${tributeInfo.isDoubleTribute ? '双下' : '单下'}进贡：需要进贡`,
            tributeInfo: tributeInfo,
            pendingTributes: tributeInfo.tributePairs || []
        };
    }

    /**
     * 处理抗贡情况
     */
    handleAntiTribute(tributeInfo) {
        console.log(`[TributeSystem] 抗贡成功：${tributeInfo.antiTributePlayers.join(', ')}抗贡`);

        this.endTributeRound();

        return {
            success: true,
            needsTribute: false,
            antiTribute: true,
            message: `${tributeInfo.antiTributePlayers.join(', ')}用双王抗贡成功`,
            firstLead: tributeInfo.firstLead,  // 抗贡后头游先出
            tributeInfo: tributeInfo
        };
    }

    /**
     * 玩家选择进贡牌
     * @param {string} playerId - 玩家ID
     * @param {Array} cards - 选择的牌
     * @param {Object} tributeInfo - 进贡信息
     */
    selectTributeCards(playerId, cards, tributeInfo) {
        // 验证玩家是否在需要进贡的列表中
        const tributePair = tributeInfo.pendingTributes.find(pair => pair.from === playerId);
        if (!tributePair) {
            return {
                success: false,
                message: '您不需要进贡'
            };
        }

        // 验证进贡牌数量
        if (cards.length !== tributePair.cardCount) {
            return {
                success: false,
                message: `需要进贡${tributePair.cardCount}张牌，您选择了${cards.length}张`
            };
        }

        // 验证进贡牌的合法性
        const tributeValidation = this.validateTributeCards(cards, tributeInfo.currentLevel);
        if (!tributeValidation.valid) {
            return tributeValidation;
        }

        // 记录进贡
        const tribute = {
            from: playerId,
            to: tributePair.to,  // 直接指定接收者
            cards: cards,
            timestamp: Date.now()
        };

        this.currentTributeState.tributes.push(tribute);
        this.currentTributeState.playerRecords[playerId].gave.push(cards);

        // 从待处理列表中移除
        const index = tributeInfo.pendingTributes.findIndex(pair => pair.from === playerId);
        tributeInfo.pendingTributes.splice(index, 1);

        // 检查是否所有进贡都已完成
        if (tributeInfo.pendingTributes.length === 0) {
            return this.processReturnTributes(tributeInfo);
        }

        return {
            success: true,
            message: '进贡牌已记录',
            waitingFor: tributeInfo.pendingTributes.length
        };
    }

    /**
     * 验证进贡牌的合法性
     */
    validateTributeCards(cards, currentLevel) {
        if (!cards || cards.length === 0) {
            return { valid: false, message: '请选择进贡牌' };
        }

        // 规则1：不能进贡王牌
        const hasJoker = cards.some(c => c.rank === '大王' || c.rank === '小王');
        if (hasJoker) {
            return { valid: false, message: '不能进贡王牌（大王、小王）' };
        }

        // 规则2：不能进贡级牌
        const hasLevelCard = cards.some(c => c.rank === currentLevel);
        if (hasLevelCard) {
            return { valid: false, message: `不能进贡级牌${currentLevel}` };
        }

        // 规则3：必须进贡最大的牌（简化版本，实际游戏中需要更复杂的判断）
        // 这里做基本验证，实际的最大牌判断需要游戏引擎支持

        return { valid: true };
    }

    /**
     * 处理还贡流程
     */
    processReturnTributes(tributeInfo) {
        console.log('[TributeSystem] 所有进贡完成，开始还贡流程');

        // 收集所有收贡的玩家
        const receivers = new Set();
        this.currentTributeState.tributes.forEach(tribute => {
            receivers.add(tribute.to);
        });

        // 为每个收贡者选择还贡牌
        const returnPromises = Array.from(receivers).map(receiverId => {
            return this.selectAndGiveReturnCard(receiverId, tributeInfo);
        });

        // 等待所有还贡完成（同步处理）
        const returns = returnPromises.filter(result => result.success);

        this.currentTributeState.returns = returns;

        // 结束进贡流程
        this.endTributeRound();

        return {
            success: true,
            message: '进贡还贡完成',
            tributes: this.currentTributeState.tributes,
            returns: returns,
            firstLead: null // 正常进贡后，进贡者先出
        };
    }

      /**
     * 选择并给出还贡牌
     */
    selectAndGiveReturnCard(receiverId, tributeInfo) {
        // 找到给此玩家进贡的人
        const tributeGiver = this.currentTributeState.tributes.find(t => t.to === receiverId);
        if (!tributeGiver) {
            return { success: false, message: '找不到进贡者' };
        }

        // 从接收者的手牌中选择还贡牌
        const returnCard = this.selectReturnCard(receiverId, tributeInfo.currentLevel);
        if (!returnCard) {
            return { success: false, message: '无法选择还贡牌' };
        }

        const tributeReturn = {
            from: receiverId,
            to: tributeGiver.from,
            cards: [returnCard],
            timestamp: Date.now()
        };

        this.currentTributeState.playerRecords[receiverId].received.push(tributeGiver.cards);
        this.currentTributeState.playerRecords[tributeGiver.from].received.push([returnCard]);

        return tributeReturn;
    }

    /**
     * 选择还贡牌（≤10的牌）
     */
    selectReturnCard(playerId, currentLevel) {
        if (!this.gameEngine.gameState.hands[playerId]) {
            return null;
        }

        const playerHand = this.gameEngine.gameState.hands[playerId];

        // 过滤出≤10的牌（不包括王牌）
        const validReturnCards = playerHand.filter(card => {
            const cardValue = this.getCardValue(card.rank);
            return cardValue <= 10 &&
                   card.rank !== '大王' &&
                   card.rank !== '小王' &&
                   card.rank !== currentLevel;
        });

        if (validReturnCards.length === 0) {
            // 如果没有≤10的牌，选择最小的牌
            const nonJokerCards = playerHand.filter(card =>
                card.rank !== '大王' &&
                card.rank !== '小王'
            );
            if (nonJokerCards.length === 0) {
                // 如果只有王牌，选择小王
                const smallJoker = playerHand.find(card => card.rank === '小王');
                return smallJoker || playerHand[0];
            }
            return this.getSmallestCard(nonJokerCards);
        }

        // 从有效牌中选择最小的
        return this.getSmallestCard(validReturnCards);
    }

    /**
     * 获取牌的数值
     */
    getCardValue(rank) {
        const values = {
            '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14, '2': 15,
            '小王': 16, '大王': 17
        };
        return values[rank] || 0;
    }

    /**
     * 从一组牌中选择最小的牌
     */
    getSmallestCard(cards) {
        if (!cards || cards.length === 0) return null;

        return cards.reduce((min, card) => {
            return this.getCardValue(card.rank) < this.getCardValue(min.rank) ? card : min;
        });
    }

    /**
     * 结束进贡流程
     */
    endTributeRound() {
        this.currentTributeState.isTributeRound = false;

        // 清理临时状态，但保留记录
        const records = JSON.parse(JSON.stringify(this.currentTributeState.playerRecords));
        this.currentTributeState = {
            isTributeRound: false,
            tributeLevel: null,
            tributes: [],
            returns: [],
            playerRecords: records
        };

        console.log('[TributeSystem] 进贡流程结束');
    }

    /**
     * 检查A级特殊规则
     * @param {number} currentLevel - 当前级数
     * @param {Array} cards - 出牌
     * @returns {Object} 验证结果
     */
    checkLevelARules(currentLevel, cards) {
        // 只有A级才适用特殊规则
        if (currentLevel !== 'A') {
            return { valid: true };
        }

        const has2s = cards.some(c => c.rank === '2');

        // 规则1：A级不打2
        if (has2s && this.tributeConfig.levelARules.no2s) {
            return {
                valid: false,
                message: 'A级规则：不能打2'
            };
        }

        // 规则2：不能用2组成牌型
        if (has2s && this.tributeConfig.levelARules.noTrickWith2) {
            return {
                valid: false,
                message: 'A级规则：不能用2组成牌型'
            };
        }

        return { valid: true };
    }

    /**
     * 获取当前进贡状态
     */
    getCurrentTributeState() {
        return {
            ...this.currentTributeState,
            isTributeRound: this.currentTributeState.isTributeRound
        };
    }

    /**
     * 获取进贡状态描述
     */
    getTributeStatusDescription(tributeInfo) {
        if (!tributeInfo) {
            return "无需进贡";
        }

        if (tributeInfo.antiTribute) {
            return `${tributeInfo.antiTributePlayers.join(', ')}抗贡成功，头游先出`;
        }

        if (tributeInfo.isDoubleTribute) {
            return "双下进贡：末游向头游，三游向二游";
        }

        return "单下进贡：末游向头游";
    }

    /**
     * 检查玩家是否需要进贡
     */
    doesPlayerNeedToGiveTribute(playerId, tributeInfo) {
        if (!tributeInfo || !tributeInfo.pendingTributes) {
            return false;
        }

        return tributeInfo.pendingTributes.some(pair => pair.from === playerId);
    }

    /**
     * 检查玩家是否需要还贡
     */
    doesPlayerNeedToReturnTribute(playerId) {
        return this.currentTributeState.tributes.some(tribute => tribute.to === playerId) &&
               !this.currentTributeState.returns.some(return_ => return_.from === playerId);
    }

    /**
     * 获取玩家应该进贡给的对手
     */
    getPlayerTributeTarget(playerId, tributeInfo) {
        if (!tributeInfo || !tributeInfo.tributePairs) {
            return null;
        }

        const pair = tributeInfo.tributePairs.find(p => p.from === playerId);
        return pair ? pair.to : null;
    }

    /**
     * 自动选择进贡牌（AI使用）
     */
    autoSelectTributeCards(playerId, tributeInfo) {
        if (!this.gameEngine.gameState.hands[playerId]) {
            return [];
        }

        const playerHand = this.gameEngine.gameState.hands[playerId];
        const currentLevel = tributeInfo.currentLevel;

        // 过滤掉不能进贡的牌
        const validCards = playerHand.filter(card => {
            return card.rank !== '大王' &&
                   card.rank !== '小王' &&
                   card.rank !== currentLevel;
        });

        if (validCards.length === 0) {
            return []; // 没有可进贡的牌
        }

        // 按牌值从大到小排序
        validCards.sort((a, b) => this.getCardValue(b.rank) - this.getCardValue(a.rank));

        const pair = tributeInfo.tributePairs.find(p => p.from === playerId);
        const cardCount = pair ? pair.cardCount : 1;

        return validCards.slice(0, cardCount);
    }

    /**
     * 重置进贡系统
     */
    reset() {
        this.currentTributeState = {
            isTributeRound: false,
            tributeLevel: null,
            tributes: [],
            returns: [],
            playerRecords: {}
        };
    }

    /**
     * 获取进贡历史记录
     */
    getTributeHistory() {
        return {
            tributes: this.currentTributeState.tributes,
            returns: this.currentTributeState.returns,
            playerRecords: this.currentTributeState.playerRecords
        };
    }
}

// 导出类（如果使用模块系统）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TributeSystem;
}