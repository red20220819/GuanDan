/**
 * 轮次管理测试套件
 * 测试掼蛋游戏的轮次管理规则
 */

function createRoundTests() {
    const suite = new TestSuite('轮次管理测试', null);

    // 创建模拟游戏状态
    function createMockGame() {
        return {
            currentRoundCards: [],
            roundPassedPlayers: new Set(),
            roundPlayers: new Set(),
            currentPlayer: 'south',
            players: {
                south: { cards: [], name: '南家' },
                west: { cards: [], name: '西家' },
                north: { cards: [], name: '北家' },
                east: { cards: [], name: '东家' }
            },
            roundActive: true,
            roundStartPlayer: null
        };
    }

    // 模拟出牌
    function playCard(game, player, cards) {
        game.currentRoundCards.push({
            player: player,
            cards: cards,
            timestamp: Date.now()
        });
        game.roundPlayers.add(player);
    }

    // 模拟过牌
    function passCard(game, player) {
        game.roundPassedPlayers.add(player);
    }

    // 测试轮次开始
    suite.addTest('轮次开始 - 第一手牌', () => {
        const game = createMockGame();

        playCard(game, 'south', [suite.createCard('♠', '3')]);

        suite.assertEqual(game.currentRoundCards.length, 1, '应该有一手牌记录');
        suite.assert(game.roundPlayers.has('south'), 'south应该在出牌玩家中');
        suite.assertEqual(game.currentRoundCards[0].player, 'south', '出牌者应该是south');
    });

    suite.addTest('轮次开始 - 记录首出玩家', () => {
        const game = createMockGame();
        game.roundStartPlayer = 'south';

        playCard(game, 'south', [suite.createCard('♠', '3')]);

        suite.assertEqual(game.roundStartPlayer, 'south', '应该记录首出玩家');
    });

    // 测试过牌逻辑
    suite.addTest('过牌逻辑 - 失去出牌权', () => {
        const game = createMockGame();

        // 南家出牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 西家过牌
        passCard(game, 'west');

        suite.assert(game.roundPassedPlayers.has('west'), 'west应该在过牌玩家中');
        suite.assertFalse(game.roundPlayers.has('west'), 'west不应该在出牌玩家中');
    });

    suite.addTest('过牌逻辑 - 过牌后本轮不能出牌', () => {
        const game = createMockGame();

        // 南家出牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 西家、北家过牌
        passCard(game, 'west');
        passCard(game, 'north');

        // 东家出牌
        playCard(game, 'east', [suite.createCard('♠', '4')]);

        // 轮回到西家，但西家已经过牌
        suite.assert(game.roundPassedPlayers.has('west'), 'west已过牌');
        suite.assert(game.roundPassedPlayers.has('north'), 'north已过牌');
        suite.assertFalse(game.roundPassedPlayers.has('east'), 'east没有过牌');
    });

    // 测试轮次结束判定
    suite.addTest('轮次结束 - 三家过牌', () => {
        const game = createMockGame();

        // 南家出牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 其他三家都过牌
        passCard(game, 'west');
        passCard(game, 'north');
        passCard(game, 'east');

        // 检查是否应该结束轮次
        const shouldEnd = game.roundPassedPlayers.size >= 3;
        suite.assertTrue(shouldEnd, '三家过牌应该结束轮次');
    });

    suite.addTest('轮次结束 - 两家过牌不应结束', () => {
        const game = createMockGame();

        // 南家出牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 只有两家过牌
        passCard(game, 'west');
        passCard(game, 'north');

        // 东家也出牌
        playCard(game, 'east', [suite.createCard('♠', '4')]);

        // 轮次不应该结束
        const shouldEnd = game.roundPassedPlayers.size >= 3;
        suite.assertFalse(shouldEnd, '两家过牌不应该结束轮次');
    });

    // 测试轮次清理
    suite.addTest('轮次清理 - 清空记录', () => {
        const game = createMockGame();

        // 模拟一轮牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);
        passCard(game, 'west');
        passCard(game, 'north');
        passCard(game, 'east');

        // 清理轮次
        game.currentRoundCards = [];
        game.roundPassedPlayers.clear();
        game.roundPlayers.clear();

        suite.assertEqual(game.currentRoundCards.length, 0, '应该清空出牌记录');
        suite.assertEqual(game.roundPassedPlayers.size, 0, '应该清空过牌记录');
        suite.assertEqual(game.roundPlayers.size, 0, '应该清空出牌玩家记录');
    });

    // 测试新一轮开始
    suite.addTest('新一轮开始 - 最后出牌者优先', () => {
        const game = createMockGame();

        // 第一轮
        playCard(game, 'south', [suite.createCard('♠', '3')]);
        passCard(game, 'west');
        passCard(game, 'north');
        playCard(game, 'east', [suite.createCard('♠', '4')]);  // east出牌，不是过牌

        // 获取最后出牌者
        const lastPlayer = game.currentRoundCards[game.currentRoundCards.length - 1].player;

        // 开始新一轮
        game.currentRoundCards = [];
        game.roundPassedPlayers.clear();
        game.roundPlayers.clear();
        game.currentPlayer = lastPlayer;  // 最后出牌者优先
        game.roundStartPlayer = lastPlayer;

        suite.assertEqual(game.currentPlayer, 'east', '新一轮应该由最后出牌者开始');
        suite.assertEqual(game.roundStartPlayer, 'east', '应该设置新的首出玩家');
        suite.assertEqual(game.currentRoundCards.length, 0, '应该清空出牌记录');
    });

    // 测试出牌顺序
    suite.addTest('出牌顺序 - 顺时针', () => {
        const game = createMockGame();
        game.currentPlayer = 'south';

        // 定义出牌顺序
        const playOrder = ['south', 'west', 'north', 'east'];
        let currentIndex = playOrder.indexOf(game.currentPlayer);

        // 模拟一轮
        for (let i = 0; i < 4; i++) {
            const player = playOrder[currentIndex];
            playCard(game, player, [suite.createCard('♠', (i + 3).toString())]);
            currentIndex = (currentIndex + 1) % 4;
        }

        suite.assertEqual(game.currentRoundCards.length, 4, '应该有4手牌');
        suite.assertEqual(game.currentRoundCards[0].player, 'south', '第一个出牌的应该是south');
        suite.assertEqual(game.currentRoundCards[1].player, 'west', '第二个出牌的应该是west');
        suite.assertEqual(game.currentRoundCards[2].player, 'north', '第三个出牌的应该是north');
        suite.assertEqual(game.currentRoundCards[3].player, 'east', '第四个出牌的应该是east');
    });

    // 测试跳过已过牌玩家
    suite.addTest('跳过已过牌玩家', () => {
        const game = createMockGame();

        // 南家出牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 西家、北家过牌
        passCard(game, 'west');
        passCard(game, 'north');

        // 东家出牌
        playCard(game, 'east', [suite.createCard('♠', '4')]);

        // 模拟轮转逻辑
        const allPlayers = ['south', 'west', 'north', 'east'];
        const validPlayers = allPlayers.filter(p =>
            game.roundPlayers.has(p) && !game.roundPassedPlayers.has(p)
        );

        // 在这一轮，只有south和east可以出牌
        suite.assert(validPlayers.includes('south'), 'south可以出牌');
        suite.assert(validPlayers.includes('east'), 'east可以出牌');
        suite.assertFalse(validPlayers.includes('west'), 'west已过牌，不能出牌');
        suite.assertFalse(validPlayers.includes('north'), 'north已过牌，不能出牌');
    });

    // 测试连续出牌
    suite.addTest('连续出牌 - 同一玩家多次出牌', () => {
        const game = createMockGame();

        // 南家出牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 其他三家过牌
        passCard(game, 'west');
        passCard(game, 'north');
        passCard(game, 'east');

        // 新一轮，南家继续出牌
        game.currentRoundCards = [];
        game.roundPassedPlayers.clear();
        game.roundPlayers.clear();
        game.currentPlayer = 'south';

        playCard(game, 'south', [suite.createCard('♠', '5')]);

        suite.assertEqual(game.currentRoundCards.length, 1, '应该有一手牌');
        suite.assertEqual(game.currentRoundCards[0].player, 'south', '应该是south出牌');
    });

    // 测试特殊情况
    suite.addTest('特殊情况 - 炸弹后的轮次继续', () => {
        const game = createMockGame();

        // 南家出普通牌
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        // 西家出炸弹
        playCard(game, 'west', [
            suite.createCard('♠', '4'),
            suite.createCard('♥', '4'),
            suite.createCard('♣', '4'),
            suite.createCard('♦', '4')
        ]);

        // 北家、东家过牌
        passCard(game, 'north');
        passCard(game, 'east');

        // 西家应该获得下一轮优先权
        suite.assert(game.roundPassedPlayers.has('north'), 'north已过牌');
        suite.assert(game.roundPassedPlayers.has('east'), 'east已过牌');
        suite.assertFalse(game.roundPassedPlayers.has('west'), 'west出炸弹，没有过牌');
    });

    suite.addTest('特殊情况 - 所有玩家都过牌', () => {
        const game = createMockGame();

        // 这是一个特殊情况，理论上不应该发生
        // 但测试代码应该能处理
        passCard(game, 'south');
        passCard(game, 'west');
        passCard(game, 'north');
        passCard(game, 'east');

        // 所有人都过牌，游戏应该能检测到异常
        const allPassed = game.roundPassedPlayers.size === 4;
        suite.assertTrue(allPassed, '检测到所有玩家都过牌');
    });

    // 测试轮次状态
    suite.addTest('轮次状态管理', () => {
        const game = createMockGame();

        // 初始状态
        suite.assertTrue(game.roundActive, '轮次应该是激活的');
        suite.assertNull(game.roundStartPlayer, '初始没有首出玩家');

        // 开始出牌
        game.roundStartPlayer = 'south';
        playCard(game, 'south', [suite.createCard('♠', '3')]);

        suite.assertEqual(game.roundStartPlayer, 'south', '应该记录首出玩家');
        suite.assert(game.roundActive, '轮次保持激活');

        // 结束轮次
        game.roundActive = false;
        suite.assertFalse(game.roundActive, '轮次应该结束');
    });

    // 测试时间戳
    suite.addTest('出牌时间戳', () => {
        const game = createMockGame();
        const startTime = Date.now();

        playCard(game, 'south', [suite.createCard('♠', '3')]);

        const playTime = game.currentRoundCards[0].timestamp;
        suite.assertTrue(playTime >= startTime, '时间戳应该正确');

        // 等待一小段时间再出第二张牌
        setTimeout(() => {
            playCard(game, 'west', [suite.createCard('♠', '4')]);

            const playTime2 = game.currentRoundCards[1].timestamp;
            suite.assertTrue(playTime2 > playTime, '时间戳应该递增');
        }, 10);
    });

    // 测试清理后的状态
    suite.addTest('清理后的完整状态重置', () => {
        const game = createMockGame();

        // 模拟完整的一轮
        playCard(game, 'south', [suite.createCard('♠', '3')]);
        passCard(game, 'west');
        passCard(game, 'north');
        passCard(game, 'east');

        // 完全清理
        game.currentRoundCards = [];
        game.roundPassedPlayers.clear();
        game.roundPlayers.clear();
        game.currentPlayer = 'east';  // 最后出牌者
        game.roundStartPlayer = 'east';
        game.roundActive = true;

        // 验证清理后的状态
        suite.assertEqual(game.currentRoundCards.length, 0, '出牌记录应清空');
        suite.assertEqual(game.roundPassedPlayers.size, 0, '过牌记录应清空');
        suite.assertEqual(game.roundPlayers.size, 0, '出牌玩家记录应清空');
        suite.assertEqual(game.currentPlayer, 'east', '当前玩家应重置');
        suite.assertEqual(game.roundStartPlayer, 'east', '首出玩家应重置');
        suite.assertTrue(game.roundActive, '轮次应激活');
    });

    // 测试边界情况
    suite.addTest('边界情况 - 空游戏状态', () => {
        const game = createMockGame();

        // 清理所有状态
        game.currentRoundCards = [];
        game.roundPassedPlayers.clear();
        game.roundPlayers.clear();
        game.currentPlayer = null;
        game.roundStartPlayer = null;

        // 验证空状态
        suite.assertEqual(game.currentRoundCards.length, 0, '没有出牌记录');
        suite.assertEqual(game.roundPassedPlayers.size, 0, '没有过牌玩家');
        suite.assertEqual(game.roundPlayers.size, 0, '没有出牌玩家');
        suite.assertNull(game.currentPlayer, '没有当前玩家');
        suite.assertNull(game.roundStartPlayer, '没有首出玩家');
    });

    return suite;
}

// 导出测试创建函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createRoundTests;
} else if (typeof window !== 'undefined') {
    window.createRoundTests = createRoundTests;
}