/**
 * 比大小规则测试套件
 * 测试掼蛋牌型的大小比较规则
 */

function createComparisonTests(ruleEngine) {
    const suite = new TestSuite('比大小规则测试', ruleEngine);

    // 单张比较测试
    suite.addTest('单张比较 - A > K', () => {
        const cardA = suite.createCard('♠', 'A');
        const cardK = suite.createCard('♠', 'K');

        suite.assertTrue(ruleEngine.canBeat([cardA], [cardK]), 'A应该大于K');
        suite.assertFalse(ruleEngine.canBeat([cardK], [cardA]), 'K不应该大于A');
    });

    suite.addTest('单张比较 - 2 > A', () => {
        const card2 = suite.createCard('♠', '2');
        const cardA = suite.createCard('♠', 'A');

        suite.assertTrue(ruleEngine.canBeat([card2], [cardA]), '2应该大于A');
        suite.assertFalse(ruleEngine.canBeat([cardA], [card2]), 'A不应该大于2');
    });

    suite.addTest('单张比较 - 小王 > 2', () => {
        const cardJoker = suite.createCard('joker', '小王');
        const card2 = suite.createCard('♠', '2');

        suite.assertTrue(ruleEngine.canBeat([cardJoker], [card2]), '小王应该大于2');
        suite.assertFalse(ruleEngine.canBeat([card2], [cardJoker]), '2不应该大于小王');
    });

    suite.addTest('单张比较 - 大王 > 小王', () => {
        const cardBigJoker = suite.createCard('joker', '大王');
        const cardSmallJoker = suite.createCard('joker', '小王');

        suite.assertTrue(ruleEngine.canBeat([cardBigJoker], [cardSmallJoker]), '大王应该大于小王');
        suite.assertFalse(ruleEngine.canBeat([cardSmallJoker], [cardBigJoker]), '小王不应该大于大王');
    });

    // 对子比较测试
    suite.addTest('对子比较 - AA > KK', () => {
        const pairA = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A']
        ]);
        const pairK = suite.createCards([
            ['♠', 'K'],
            ['♥', 'K']
        ]);

        suite.assertTrue(ruleEngine.canBeat(pairA, pairK), 'AA应该大于KK');
        suite.assertFalse(ruleEngine.canBeat(pairK, pairA), 'KK不应该大于AA');
    });

    suite.addTest('对子比较 - 相同对子不能比较', () => {
        const pair1 = suite.createCards([
            ['♠', 'Q'],
            ['♥', 'Q']
        ]);
        const pair2 = suite.createCards([
            ['♣', 'Q'],
            ['♦', 'Q']
        ]);

        suite.assertFalse(ruleEngine.canBeat(pair1, pair2), '相同的对子不能比较大小');
        suite.assertFalse(ruleEngine.canBeat(pair2, pair1), '相同的对子不能比较大小');
    });

    // 三张比较测试
    suite.addTest('三张比较 - 999 > 888', () => {
        const triple9 = suite.createCards([
            ['♠', '9'],
            ['♥', '9'],
            ['♣', '9']
        ]);
        const triple8 = suite.createCards([
            ['♠', '8'],
            ['♥', '8'],
            ['♣', '8']
        ]);

        suite.assertTrue(ruleEngine.canBeat(triple9, triple8), '999应该大于888');
        suite.assertFalse(ruleEngine.canBeat(triple8, triple9), '888不应该大于999');
    });

    // 三带二比较测试
    suite.addTest('三带二比较 - 主牌大小决定', () => {
        const tripleWithPair1 = suite.createCards([
            ['♠', 'J'],
            ['♥', 'J'],
            ['♣', 'J'],
            ['♦', '3'],
            ['♠', '3']
        ]);
        const tripleWithPair2 = suite.createCards([
            ['♠', '10'],
            ['♥', '10'],
            ['♣', '10'],
            ['♦', '4'],
            ['♥', '4']
        ]);

        suite.assertTrue(ruleEngine.canBeat(tripleWithPair1, tripleWithPair2), 'JJJ应该大于101010');
        suite.assertFalse(ruleEngine.canBeat(tripleWithPair2, tripleWithPair1), '101010不应该大于JJJ');
    });

    // 顺子比较测试
    suite.addTest('顺子比较 - 必须长度相同', () => {
        const straight5 = suite.createCards([
            ['♠', '3'],
            ['♥', '4'],
            ['♣', '5'],
            ['♦', '6'],
            ['♠', '7']
        ]);
        const straight6 = suite.createCards([
            ['♠', '4'],
            ['♥', '5'],
            ['♣', '6'],
            ['♦', '7'],
            ['♠', '8'],
            ['♥', '9']
        ]);

        suite.assertFalse(ruleEngine.canBeat(straight6, straight5), '长度不同的顺子不能比较');
        suite.assertFalse(ruleEngine.canBeat(straight5, straight6), '长度不同的顺子不能比较');
    });

    suite.addTest('顺子比较 - 相同长度比大小', () => {
        const straight1 = suite.createCards([
            ['♠', '5'],
            ['♥', '6'],
            ['♣', '7'],
            ['♦', '8'],
            ['♠', '9']
        ]);
        const straight2 = suite.createCards([
            ['♠', '4'],
            ['♥', '5'],
            ['♣', '6'],
            ['♦', '7'],
            ['♠', '8']
        ]);

        suite.assertTrue(ruleEngine.canBeat(straight1, straight2), '56789应该大于45678');
        suite.assertFalse(ruleEngine.canBeat(straight2, straight1), '45678不应该大于56789');
    });

    // 连对比较测试
    suite.addTest('连对比较 - 必须长度相同', () => {
        const pairStraight3 = suite.createCards([
            ['♠', '5'], ['♥', '5'],
            ['♣', '6'], ['♦', '6'],
            ['♠', '7'], ['♥', '7']
        ]);
        const pairStraight4 = suite.createCards([
            ['♠', '4'], ['♥', '4'],
            ['♣', '5'], ['♦', '5'],
            ['♠', '6'], ['♥', '6'],
            ['♣', '7'], ['♦', '7']
        ]);

        suite.assertFalse(ruleEngine.canBeat(pairStraight4, pairStraight3), '长度不同的连对不能比较');
        suite.assertFalse(ruleEngine.canBeat(pairStraight3, pairStraight4), '长度不同的连对不能比较');
    });

    suite.addTest('连对比较 - 相同长度比大小', () => {
        const pairStraight1 = suite.createCards([
            ['♠', '8'], ['♥', '8'],
            ['♣', '9'], ['♦', '9'],
            ['♠', '10'], ['♥', '10']
        ]);
        const pairStraight2 = suite.createCards([
            ['♠', '7'], ['♥', '7'],
            ['♣', '8'], ['♦', '8'],
            ['♠', '9'], ['♥', '9']
        ]);

        suite.assertTrue(ruleEngine.canBeat(pairStraight1, pairStraight2), '88991010应该大于778899');
        suite.assertFalse(ruleEngine.canBeat(pairStraight2, pairStraight1), '778899不应该大于88991010');
    });

    // 钢板比较测试
    suite.addTest('钢板比较 - 必须长度相同', () => {
        const tripleStraight2 = suite.createCards([
            ['♠', '7'], ['♥', '7'], ['♣', '7'],
            ['♦', '8'], ['♠', '8'], ['♥', '8']
        ]);
        const tripleStraight3 = suite.createCards([
            ['♠', '5'], ['♥', '5'], ['♣', '5'],
            ['♦', '6'], ['♠', '6'], ['♥', '6'],
            ['♣', '7'], ['♦', '7'], ['♠', '7']
        ]);

        suite.assertFalse(ruleEngine.canBeat(tripleStraight3, tripleStraight2), '长度不同的钢板不能比较');
        suite.assertFalse(ruleEngine.canBeat(tripleStraight2, tripleStraight3), '长度不同的钢板不能比较');
    });

    // 炸弹特殊规则测试
    suite.addTest('炸弹打普通牌 - 4炸打顺子', () => {
        const bomb = suite.createCards([
            ['♠', '4'],
            ['♥', '4'],
            ['♣', '4'],
            ['♦', '4']
        ]);
        const straight = suite.createCards([
            ['♠', '10'],
            ['♥', 'J'],
            ['♣', 'Q'],
            ['♦', 'K'],
            ['♠', 'A']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bomb, straight), '炸弹应该能打顺子');
        suite.assertFalse(ruleEngine.canBeat(straight, bomb), '顺子不应该能打炸弹');
    });

    suite.addTest('炸弹打普通牌 - 5炸打三带二', () => {
        const bomb = suite.createCards([
            ['♠', '5'],
            ['♥', '5'],
            ['♣', '5'],
            ['♦', '5'],
            ['♠', '5']
        ]);
        const tripleWithPair = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A'],
            ['♣', 'A'],
            ['♦', 'K'],
            ['♠', 'K']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bomb, tripleWithPair), '5炸应该能打三带二');
        suite.assertFalse(ruleEngine.canBeat(tripleWithPair, bomb), '三带二不应该能打5炸');
    });

    suite.addTest('同花顺打普通牌', () => {
        const straightFlush = suite.createCards([
            ['♠', '8'],
            ['♠', '9'],
            ['♠', '10'],
            ['♠', 'J'],
            ['♠', 'Q']
        ]);
        const pair = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A']
        ]);

        suite.assertTrue(ruleEngine.canBeat(straightFlush, pair), '同花顺应该能打对子');
        suite.assertFalse(ruleEngine.canBeat(pair, straightFlush), '对子不应该能打同花顺');
    });

    // 炸弹之间比较测试
    suite.addTest('炸弹比较 - 5炸 > 4炸', () => {
        const bomb5 = suite.createCards([
            ['♠', '5'],
            ['♥', '5'],
            ['♣', '5'],
            ['♦', '5'],
            ['♠', '5']
        ]);
        const bomb4 = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A'],
            ['♣', 'A'],
            ['♦', 'A']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bomb5, bomb4), '5炸应该大于4炸');
        suite.assertFalse(ruleEngine.canBeat(bomb4, bomb5), '4炸不应该大于5炸');
    });

    suite.addTest('炸弹比较 - 6炸 > 5炸', () => {
        const bomb6 = suite.createCards([
            ['♠', 'K'],
            ['♥', 'K'],
            ['♣', 'K'],
            ['♦', 'K'],
            ['♠', 'K'],
            ['♥', 'K']
        ]);
        const bomb5 = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A'],
            ['♣', 'A'],
            ['♦', 'A'],
            ['♠', 'A']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bomb6, bomb5), '6炸应该大于5炸');
        suite.assertFalse(ruleEngine.canBeat(bomb5, bomb6), '5炸不应该大于6炸');
    });

    suite.addTest('炸弹比较 - 7炸 > 6炸', () => {
        const bomb7 = suite.createCards([
            ['♠', 'Q'],
            ['♥', 'Q'],
            ['♣', 'Q'],
            ['♦', 'Q'],
            ['♠', 'Q'],
            ['♥', 'Q'],
            ['♣', 'Q']
        ]);
        const bomb6 = suite.createCards([
            ['♠', 'K'],
            ['♥', 'K'],
            ['♣', 'K'],
            ['♦', 'K'],
            ['♠', 'K'],
            ['♥', 'K']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bomb7, bomb6), '7炸应该大于6炸');
        suite.assertFalse(ruleEngine.canBeat(bomb6, bomb7), '6炸不应该大于7炸');
    });

    suite.addTest('炸弹比较 - 8炸 > 7炸', () => {
        const bomb8 = suite.createCards([
            ['♠', 'J'],
            ['♥', 'J'],
            ['♣', 'J'],
            ['♦', 'J'],
            ['♠', 'J'],
            ['♥', 'J'],
            ['♣', 'J'],
            ['♦', 'J']
        ]);
        const bomb7 = suite.createCards([
            ['♠', 'Q'],
            ['♥', 'Q'],
            ['♣', 'Q'],
            ['♦', 'Q'],
            ['♠', 'Q'],
            ['♥', 'Q'],
            ['♣', 'Q']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bomb8, bomb7), '8炸应该大于7炸');
        suite.assertFalse(ruleEngine.canBeat(bomb7, bomb8), '7炸不应该大于8炸');
    });

    suite.addTest('炸弹比较 - 同张数比点数', () => {
        const bombA = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A'],
            ['♣', 'A'],
            ['♦', 'A']
        ]);
        const bombK = suite.createCards([
            ['♠', 'K'],
            ['♥', 'K'],
            ['♣', 'K'],
            ['♦', 'K']
        ]);

        suite.assertTrue(ruleEngine.canBeat(bombA, bombK), '4个A应该大于4个K');
        suite.assertFalse(ruleEngine.canBeat(bombK, bombA), '4个K不应该大于4个A');
    });

    suite.addTest('炸弹比较 - 同花顺的特殊位置', () => {
        // 同花顺应该在6炸和5炸之间
        const straightFlush = suite.createCards([
            ['♥', '6'],
            ['♥', '7'],
            ['♥', '8'],
            ['♥', '9'],
            ['♥', '10']
        ]);
        const bomb6 = suite.createCards([
            ['♠', '6'],
            ['♥', '6'],
            ['♣', '6'],
            ['♦', '6'],
            ['♠', '6'],
            ['♥', '6']
        ]);
        const bomb5 = suite.createCards([
            ['♠', '9'],
            ['♥', '9'],
            ['♣', '9'],
            ['♦', '9'],
            ['♠', '9']
        ]);

        // 同花顺应该小于6炸
        suite.assertFalse(ruleEngine.canBeat(straightFlush, bomb6), '同花顺不应该能打6炸');
        suite.assertTrue(ruleEngine.canBeat(bomb6, straightFlush), '6炸应该能打同花顺');

        // 同花顺应该大于5炸
        suite.assertTrue(ruleEngine.canBeat(straightFlush, bomb5), '同花顺应该能打5炸');
        suite.assertFalse(ruleEngine.canBeat(bomb5, straightFlush), '5炸不应该能打同花顺');
    });

    // 天王炸弹测试
    suite.addTest('天王炸弹最大 - 打任何炸弹', () => {
        const kingBomb = suite.createCards([
            ['joker', '小王'],
            ['joker', '小王'],
            ['joker', '大王'],
            ['joker', '大王']
        ]);
        const bomb8 = suite.createCards([
            ['♠', '2'],
            ['♥', '2'],
            ['♣', '2'],
            ['♦', '2'],
            ['♠', '2'],
            ['♥', '2'],
            ['♣', '2'],
            ['♦', '2']
        ]);

        suite.assertTrue(ruleEngine.canBeat(kingBomb, bomb8), '天王炸弹应该能打8炸');
        suite.assertFalse(ruleEngine.canBeat(bomb8, kingBomb), '8炸不应该能打天王炸弹');
    });

    // 不同牌型不能比较测试
    suite.addTest('不同类型不能比较 - 单张 vs 对子', () => {
        const single = suite.createCards([['♠', 'A']]);
        const pair = suite.createCards([['♠', '3'], ['♥', '3']]);

        suite.assertFalse(ruleEngine.canBeat(single, pair), '单张不能打对子');
        suite.assertFalse(ruleEngine.canBeat(pair, single), '对子不能打单张');
    });

    suite.addTest('不同类型不能比较 - 三张 vs 顺子', () => {
        const triple = suite.createCards([
            ['♠', '9'],
            ['♥', '9'],
            ['♣', '9']
        ]);
        const straight = suite.createCards([
            ['♠', '3'],
            ['♥', '4'],
            ['♣', '5'],
            ['♦', '6'],
            ['♠', '7']
        ]);

        suite.assertFalse(ruleEngine.canBeat(triple, straight), '三张不能打顺子');
        suite.assertFalse(ruleEngine.canBeat(straight, triple), '顺子不能打三张');
    });

    suite.addTest('不同类型不能比较 - 三带二 vs 连对', () => {
        const tripleWithPair = suite.createCards([
            ['♠', '10'],
            ['♥', '10'],
            ['♣', '10'],
            ['♦', '4'],
            ['♠', '4']
        ]);
        const pairStraight = suite.createCards([
            ['♠', '5'], ['♥', '5'],
            ['♣', '6'], ['♦', '6'],
            ['♠', '7'], ['♥', '7']
        ]);

        suite.assertFalse(ruleEngine.canBeat(tripleWithPair, pairStraight), '三带二不能打连对');
        suite.assertFalse(ruleEngine.canBeat(pairStraight, tripleWithPair), '连对不能打三带二');
    });

    // 边界情况测试
    suite.addTest('空数组比较', () => {
        const card = suite.createCard('♠', 'A');

        suite.assertFalse(ruleEngine.canBeat([], [card]), '空数组不能打任何牌');
        suite.assertFalse(ruleEngine.canBeat([card], []), '任何牌不能打空数组');
        suite.assertFalse(ruleEngine.canBeat([], []), '空数组不能打空数组');
    });

    suite.addTest('null参数比较', () => {
        const card = suite.createCard('♠', 'A');

        suite.assertFalse(ruleEngine.canBeat(null, [card]), 'null不能打任何牌');
        suite.assertFalse(ruleEngine.canBeat([card], null), '任何牌不能打null');
        suite.assertFalse(ruleEngine.canBeat(null, null), 'null不能打null');
    });

    // 权重验证测试
    suite.addTest('验证权重系统 - 单张', () => {
        const cards = [
            suite.createCard('♠', '3'),
            suite.createCard('♠', '4'),
            suite.createCard('♠', '5'),
            suite.createCard('♠', '6'),
            suite.createCard('♠', '7'),
            suite.createCard('♠', '8'),
            suite.createCard('♠', '9'),
            suite.createCard('♠', '10'),
            suite.createCard('♠', 'J'),
            suite.createCard('♠', 'Q'),
            suite.createCard('♠', 'K'),
            suite.createCard('♠', 'A'),
            suite.createCard('♠', '2'),
            suite.createCard('♥', '2'),  // 级牌
            suite.createCard('joker', '小王'),
            suite.createCard('joker', '大王')
        ];

        const weights = cards.map(card => {
            const type = ruleEngine.getCardType([card]);
            return type.weight;
        });

        // 验证权重严格递增
        for (let i = 1; i < weights.length; i++) {
            suite.assertTrue(weights[i] > weights[i-1], `权重应该递增: ${cards[i].rank} > ${cards[i-1].rank}`);
        }
    });

    suite.addTest('验证权重系统 - 炸弹', () => {
        // 测试炸弹的权重顺序
        const bomb4 = suite.createCards([['♠', '4'], ['♥', '4'], ['♣', '4'], ['♦', '4']]);
        const bomb5 = suite.createCards([['♠', '5'], ['♥', '5'], ['♣', '5'], ['♦', '5'], ['♠', '5']]);
        const bomb6 = suite.createCards([['♠', '6'], ['♥', '6'], ['♣', '6'], ['♦', '6'], ['♠', '6'], ['♥', '6']]);

        const type4 = ruleEngine.getCardType(bomb4);
        const type5 = ruleEngine.getCardType(bomb5);
        const type6 = ruleEngine.getCardType(bomb6);

        suite.assertTrue(type6.weight > type5.weight, '6炸权重应该大于5炸');
        suite.assertTrue(type5.weight > type4.weight, '5炸权重应该大于4炸');
    });

    return suite;
}

// 导出测试创建函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createComparisonTests;
} else if (typeof window !== 'undefined') {
    window.createComparisonTests = createComparisonTests;
}