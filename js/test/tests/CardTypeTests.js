/**
 * 牌型识别测试套件
 * 测试所有掼蛋牌型的识别功能
 */

function createCardTypeTests(ruleEngine) {
    const suite = new TestSuite('牌型识别测试', ruleEngine);

    // 单张牌测试
    suite.addTest('识别单张 - 普通牌', () => {
        const card = suite.createCard('♠', 'A');
        const type = ruleEngine.getCardType([card]);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'single', '应该是单张');
        suite.assertEqual(type.rank, 'A', '应该是A');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别单张 - 小王', () => {
        const card = suite.createCard('joker', '小王');
        const type = ruleEngine.getCardType([card]);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'single', '应该是单张');
        suite.assertEqual(type.rank, '小王', '应该是小王');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别单张 - 大王', () => {
        const card = suite.createCard('joker', '大王');
        const type = ruleEngine.getCardType([card]);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'single', '应该是单张');
        suite.assertEqual(type.rank, '大王', '应该是大王');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别单张 - 级牌（当前2级）', () => {
        ruleEngine.setLevel(2);
        const card = suite.createCard('♥', '2');  // 红心2是级牌
        const type = ruleEngine.getCardType([card]);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'single', '应该是单张');
        suite.assertEqual(type.rank, '2', '应该是2');
        suite.assertEqual(type.weight, 101, '级牌权重应该是101');
    });

    // 对子测试
    suite.addTest('识别对子 - 普通对子', () => {
        const cards = suite.createCards([
            ['♠', 'K'],
            ['♥', 'K']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'pair', '应该是对子');
        suite.assertEqual(type.rank, 'K', '应该是K对');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别对子 - 不同花色', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '5']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'pair', '应该是对子');
        suite.assertEqual(type.rank, '5', '应该是5对');
    });

    // 三张测试
    suite.addTest('识别三张 - 普通三张', () => {
        const cards = suite.createCards([
            ['♠', '10'],
            ['♥', '10'],
            ['♣', '10']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'triple', '应该是三张');
        suite.assertEqual(type.rank, '10', '应该是10三张');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    // 三带二测试
    suite.addTest('识别三带二 - 标准', () => {
        const cards = suite.createCards([
            ['♠', '9'],
            ['♥', '9'],
            ['♣', '9'],
            ['♦', '3'],
            ['♠', '3']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'tripleWithPair', '应该是三带二');
        suite.assertEqual(type.mainRank, '9', '主牌应该是9');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别三带二 - 不同排列', () => {
        const cards = suite.createCards([
            ['♦', '4'],
            ['♠', 'J'],
            ['♥', '4'],
            ['♣', 'J'],
            ['♦', 'J']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'tripleWithPair', '应该是三带二');
        suite.assertEqual(type.mainRank, 'J', '主牌应该是J');
    });

    // 顺子测试
    suite.addTest('识别顺子 - 5张', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '6'],
            ['♣', '7'],
            ['♦', '8'],
            ['♠', '9']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'straight', '应该是顺子');
        suite.assertEqual(type.length, 5, '应该是5张');
        suite.assertEqual(type.highCard, 9, '尾张应该是9');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别顺子 - 6张', () => {
        const cards = suite.createCards([
            ['♠', '3'],
            ['♥', '4'],
            ['♣', '5'],
            ['♦', '6'],
            ['♠', '7'],
            ['♥', '8']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'straight', '应该是顺子');
        suite.assertEqual(type.length, 6, '应该是6张');
        suite.assertEqual(type.highCard, 8, '尾张应该是8');
    });

    suite.addTest('识别顺子 - 包含A', () => {
        const cards = suite.createCards([
            ['♠', '10'],
            ['♥', 'J'],
            ['♣', 'Q'],
            ['♦', 'K'],
            ['♠', 'A']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'straight', '应该是顺子');
        suite.assertEqual(type.length, 5, '应该是5张');
        suite.assertEqual(type.highCard, 14, '尾张应该是A');
    });

    suite.addTest('不识别顺子 - 包含2', () => {
        const cards = suite.createCards([
            ['♠', 'J'],
            ['♥', 'Q'],
            ['♣', 'K'],
            ['♦', 'A'],
            ['♠', '2']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '包含2的不应该识别为顺子');
    });

    // 连对测试
    suite.addTest('识别连对 - 3对', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '5'],
            ['♣', '6'],
            ['♦', '6'],
            ['♠', '7'],
            ['♥', '7']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'pairStraight', '应该是连对');
        suite.assertEqual(type.length, 3, '应该是3对');
        suite.assertEqual(type.highCard, 7, '尾张应该是7');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别连对 - 4对', () => {
        const cards = suite.createCards([
            ['♠', '9'],
            ['♥', '9'],
            ['♣', '10'],
            ['♦', '10'],
            ['♠', 'J'],
            ['♥', 'J'],
            ['♣', 'Q'],
            ['♦', 'Q']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'pairStraight', '应该是连对');
        suite.assertEqual(type.length, 4, '应该是4对');
        suite.assertEqual(type.highCard, 12, '尾张应该是Q');
    });

    // 钢板（连续三张）测试
    suite.addTest('识别钢板 - 2个三张', () => {
        const cards = suite.createCards([
            ['♠', '7'],
            ['♥', '7'],
            ['♣', '7'],
            ['♦', '8'],
            ['♠', '8'],
            ['♥', '8']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'tripleStraight', '应该是钢板');
        suite.assertEqual(type.length, 2, '应该是2个三张');
        suite.assertEqual(type.highCard, 8, '尾张应该是8');
        suite.assertEqual(type.family, 'normal', '应该是普通牌家族');
    });

    suite.addTest('识别钢板 - 3个三张', () => {
        const cards = suite.createCards([
            ['♠', '4'],
            ['♥', '4'],
            ['♣', '4'],
            ['♦', '5'],
            ['♠', '5'],
            ['♥', '5'],
            ['♣', '6'],
            ['♦', '6'],
            ['♠', '6']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'tripleStraight', '应该是钢板');
        suite.assertEqual(type.length, 3, '应该是3个三张');
        suite.assertEqual(type.highCard, 6, '尾张应该是6');
    });

    // 普通炸弹测试
    suite.addTest('识别炸弹 - 4张', () => {
        const cards = suite.createCards([
            ['♠', '2'],
            ['♥', '2'],
            ['♣', '2'],
            ['♦', '2']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹');
        suite.assertEqual(type.subtype, 'normalBomb', '应该是普通炸弹');
        suite.assertEqual(type.count, 4, '应该是4张');
        suite.assertEqual(type.rank, '2', '应该是2炸');
        suite.assertEqual(type.family, 'bomb', '应该是炸弹家族');
    });

    suite.addTest('识别炸弹 - 5张', () => {
        const cards = suite.createCards([
            ['♠', 'A'],
            ['♥', 'A'],
            ['♣', 'A'],
            ['♦', 'A'],
            ['♠', 'A']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹');
        suite.assertEqual(type.subtype, 'normalBomb', '应该是普通炸弹');
        suite.assertEqual(type.count, 5, '应该是5张');
        suite.assertEqual(type.rank, 'A', '应该是A炸');
    });

    suite.addTest('识别炸弹 - 6张', () => {
        const cards = suite.createCards([
            ['♠', 'K'],
            ['♥', 'K'],
            ['♣', 'K'],
            ['♦', 'K'],
            ['♠', 'K'],
            ['♥', 'K']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹');
        suite.assertEqual(type.subtype, 'normalBomb', '应该是普通炸弹');
        suite.assertEqual(type.count, 6, '应该是6张');
    });

    suite.addTest('识别炸弹 - 8张（最大普通炸弹）', () => {
        const cards = suite.createCards([
            ['♠', '7'], ['♥', '7'], ['♣', '7'], ['♦', '7'],
            ['♠', '7'], ['♥', '7'], ['♣', '7'], ['♦', '7']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹');
        suite.assertEqual(type.count, 8, '应该是8张');
    });

    // 同花顺测试
    suite.addTest('识别同花顺 - 黑桃5张', () => {
        const cards = suite.createCards([
            ['♠', '8'],
            ['♠', '9'],
            ['♠', '10'],
            ['♠', 'J'],
            ['♠', 'Q']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹（同花顺）');
        suite.assertEqual(type.subtype, 'straightFlush', '应该是同花顺');
        suite.assertEqual(type.length, 5, '应该是5张');
        suite.assertEqual(type.family, 'bomb', '应该是炸弹家族');
    });

    suite.addTest('识别同花顺 - 红心6张', () => {
        const cards = suite.createCards([
            ['♥', '6'],
            ['♥', '7'],
            ['♥', '8'],
            ['♥', '9'],
            ['♥', '10'],
            ['♥', 'J']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹（同花顺）');
        suite.assertEqual(type.subtype, 'straightFlush', '应该是同花顺');
        suite.assertEqual(type.length, 6, '应该是6张');
    });

    // 天王炸弹测试
    suite.addTest('识别天王炸弹', () => {
        const cards = suite.createCards([
            ['joker', '小王'],
            ['joker', '小王'],
            ['joker', '大王'],
            ['joker', '大王']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNotNull(type, '应该识别出牌型');
        suite.assertEqual(type.type, 'bomb', '应该是炸弹');
        suite.assertEqual(type.subtype, 'kingBomb', '应该是天王炸弹');
        suite.assertEqual(type.count, 4, '应该是4张');
        suite.assertEqual(type.weight, 1000, '权重应该是1000（最大）');
        suite.assertEqual(type.family, 'bomb', '应该是炸弹家族');
    });

    // 非法牌型测试
    suite.addTest('不识别三带一', () => {
        const cards = suite.createCards([
            ['♠', '9'],
            ['♥', '9'],
            ['♣', '9'],
            ['♦', '3']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '不应该识别三带一');
    });

    suite.addTest('不识别火箭', () => {
        const cards = suite.createCards([
            ['joker', '小王'],
            ['joker', '大王']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '不应该识别火箭（掼蛋没有这种牌型）');
    });

    suite.addTest('不识别不连续的顺子', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '6'],
            ['♣', '8'],  // 跳过7
            ['♦', '9'],
            ['♠', '10']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '不连续的不应该识别为顺子');
    });

    suite.addTest('不识别长度不够的顺子', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '6'],
            ['♣', '7'],
            ['♦', '8']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '少于5张的不应该识别为顺子');
    });

    suite.addTest('不识别不连续的连对', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '5'],
            ['♣', '6'],
            ['♦', '6'],
            ['♠', '8'],  // 跳过7
            ['♥', '8']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '不连续的不应该识别为连对');
    });

    suite.addTest('不识别长度不够的连对', () => {
        const cards = suite.createCards([
            ['♠', '5'],
            ['♥', '5'],
            ['♣', '6'],
            ['♦', '6']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '少于3对的不应该识别为连对');
    });

    // 边界情况测试
    suite.addTest('空数组', () => {
        const type = ruleEngine.getCardType([]);
        suite.assertNull(type, '空数组不应该识别出牌型');
    });

    suite.addTest('null参数', () => {
        const type = ruleEngine.getCardType(null);
        suite.assertNull(type, 'null不应该识别出牌型');
    });

    suite.addTest('undefined参数', () => {
        const type = ruleEngine.getCardType(undefined);
        suite.assertNull(type, 'undefined不应该识别出牌型');
    });

    suite.addTest('识别不存在的炸弹（9张）', () => {
        const cards = suite.createCards([
            ['♠', '5'], ['♥', '5'], ['♣', '5'], ['♦', '5'],
            ['♠', '5'], ['♥', '5'], ['♣', '5'], ['♦', '5'],
            ['♠', '5']
        ]);
        const type = ruleEngine.getCardType(cards);

        suite.assertNull(type, '超过8张的炸弹不应该被识别');
    });

    // 重量比较测试
    suite.addTest('验证牌型权重 - 单张A > 单张K', () => {
        const cardA = suite.createCard('♠', 'A');
        const cardK = suite.createCard('♠', 'K');

        const typeA = ruleEngine.getCardType([cardA]);
        const typeK = ruleEngine.getCardType([cardK]);

        suite.assertTrue(typeA.weight > typeK.weight, 'A的权重应该大于K');
    });

    suite.addTest('验证炸弹权重 - 5炸 > 4炸', () => {
        const bomb4 = suite.createCards([
            ['♠', '4'], ['♥', '4'], ['♣', '4'], ['♦', '4']
        ]);
        const bomb5 = suite.createCards([
            ['♠', '3'], ['♥', '3'], ['♣', '3'], ['♦', '3'], ['♠', '3']
        ]);

        const type4 = ruleEngine.getCardType(bomb4);
        const type5 = ruleEngine.getCardType(bomb5);

        suite.assertTrue(type5.weight > type4.weight, '5炸的权重应该大于4炸');
    });

    return suite;
}

// 导出测试创建函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createCardTypeTests;
} else if (typeof window !== 'undefined') {
    window.createCardTypeTests = createCardTypeTests;
}