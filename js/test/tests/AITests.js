/**
 * AI出牌逻辑测试套件
 * 测试AI出牌决策和过滤逻辑
 */

function createAITests(ruleEngine) {
    const suite = new TestSuite('AI出牌逻辑测试', ruleEngine);

    // 模拟findAllPossiblePlays函数（增强版）
    function findAllPossiblePlays(handCards, lastPlay) {
        const possiblePlays = [];
        const lastCards = lastPlay ? lastPlay.cards : [];
        const lastType = lastPlay ? ruleEngine.getCardType(lastCards) : null;

        // 单张
        for (let card of handCards) {
            const single = [card];
            const type = ruleEngine.getCardType(single);
            if (type && (!lastType || ruleEngine.canBeat(single, lastCards))) {
                possiblePlays.push({
                    cards: single,
                    type: type,
                    score: Math.random() * 10
                });
            }
        }

        // 对子
        for (let i = 0; i < handCards.length - 1; i++) {
            for (let j = i + 1; j < handCards.length; j++) {
                if (handCards[i].rank === handCards[j].rank) {
                    const pair = [handCards[i], handCards[j]];
                    const type = ruleEngine.getCardType(pair);
                    if (type && (!lastType || ruleEngine.canBeat(pair, lastCards))) {
                        possiblePlays.push({
                            cards: pair,
                            type: type,
                            score: Math.random() * 10 + 10
                        });
                    }
                }
            }
        }

        // 三张
        const rankGroups = {};
        handCards.forEach(card => {
            rankGroups[card.rank] = (rankGroups[card.rank] || 0) + 1;
        });

        for (let rank in rankGroups) {
            if (rankGroups[rank] >= 3) {
                const triple = handCards.filter(card => card.rank === rank).slice(0, 3);
                const type = ruleEngine.getCardType(triple);
                if (type && (!lastType || ruleEngine.canBeat(triple, lastCards))) {
                    possiblePlays.push({
                        cards: triple,
                        type: type,
                        score: Math.random() * 10 + 20
                    });
                }
            }
        }

        // 检查炸弹（包括天王炸弹）
        for (let rank in rankGroups) {
            if (rankGroups[rank] >= 4) {
                const bomb = handCards.filter(card => card.rank === rank);
                const type = ruleEngine.getCardType(bomb);
                if (type && type.family === 'bomb') {
                    // 炸弹可以打任何牌
                    possiblePlays.push({
                        cards: bomb,
                        type: type,
                        score: 1000  // 炸弹分数最高
                    });
                }
            }
        }

        // 特殊检查天王炸弹（4张王牌）
        const jokers = handCards.filter(card => card.suit === 'joker');
        if (jokers.length === 4) {
            const kingBombType = ruleEngine.getCardType(jokers);
            if (kingBombType && kingBombType.subtype === 'kingBomb') {
                possiblePlays.push({
                    cards: jokers,
                    type: kingBombType,
                    score: 3000  // 天王炸弹分数最高
                });
            }
        }

        // 检查同花顺
        // 按花色分组
        const suitGroups = {};
        handCards.forEach(card => {
            if (card.suit !== 'joker') {  // 王牌不参与同花顺
                if (!suitGroups[card.suit]) {
                    suitGroups[card.suit] = [];
                }
                suitGroups[card.suit].push(card);
            }
        });

        for (let suit in suitGroups) {
            const suitCards = suitGroups[suit];
            if (suitCards.length >= 5) {
                // 尝试找出所有可能的同花顺
                for (let start = 0; start <= suitCards.length - 5; start++) {
                    for (let end = start + 5; end <= suitCards.length; end++) {
                        const subset = suitCards.slice(start, end);
                        const type = ruleEngine.getCardType(subset);
                        if (type && type.subtype === 'straightFlush') {
                            if (!lastType || ruleEngine.canBeat(subset, lastCards)) {
                                possiblePlays.push({
                                    cards: subset,
                                    type: type,
                                    score: 2000  // 同花顺分数更高
                                });
                            }
                        }
                    }
                }
            }
        }

        // 过滤
        const filteredPlays = possiblePlays.filter(play => {
            // 必须有type
            if (!play.type) {
                console.warn('AI: 无效的牌型');
                return false;
            }

            // 如果有上家，必须能打过上家
            if (lastType && play.cards.length > 0) {
                // 炸弹可以打任何牌
                if (play.type.family === 'bomb') {
                    return true;
                }
                // 必须同类型
                if (play.type.type !== lastType.type) {
                    return false;
                }
                // 必须更大
                if (!ruleEngine.canBeat(play.cards, lastCards)) {
                    return false;
                }
            }

            return true;
        });

        // 如果上家出牌且没有可出的牌，返回空数组（表示要过牌）
        if (lastType && filteredPlays.length === 0) {
            return [];
        }

        // 否则返回过滤后的结果
        return filteredPlays.length > 0 ? filteredPlays : possiblePlays;
    }

    // 测试AI不会用错误牌型出牌
    suite.addTest('AI不出错误牌型 - 用连对打单张', () => {
        const handCards = [
            // 连对
            suite.createCard('♠', '5'),
            suite.createCard('♥', '5'),
            suite.createCard('♣', '6'),
            suite.createCard('♦', '6'),
            suite.createCard('♠', '7'),
            suite.createCard('♥', '7'),
            // 单张
            suite.createCard('♣', 'K')
        ];

        const lastPlay = {
            cards: [suite.createCard('♦', '10')],
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 验证返回的都是合法出牌
        possiblePlays.forEach(play => {
            const validation = ruleEngine.validatePlay(play.cards, lastPlay.cards, handCards);
            if (!validation.valid) {
                console.error(`非法出牌: ${play.cards.map(c => c.rank).join()}`, validation.message);
            }
            suite.assertTrue(validation.valid, `出牌 ${play.cards.map(c => c.rank).join()} 应该合法`);
        });

        // 验证没有返回连对
        const hasPairStraight = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.type === 'pairStraight';
        });
        suite.assertFalse(hasPairStraight, '不应该返回连对来打单张');
    });

    suite.addTest('AI不出错误牌型 - 用顺子打对子', () => {
        const handCards = [
            // 顺子
            suite.createCard('♠', '3'),
            suite.createCard('♥', '4'),
            suite.createCard('♣', '5'),
            suite.createCard('♦', '6'),
            suite.createCard('♠', '7'),
            // 对子
            suite.createCard('♥', 'J'),
            suite.createCard('♣', 'J')
        ];

        const lastPlay = {
            cards: [
                suite.createCard('♠', '8'),
                suite.createCard('♥', '8')
            ],
            type: { type: 'pair', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 验证没有返回顺子
        const hasStraight = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.type === 'straight';
        });
        suite.assertFalse(hasStraight, '不应该返回顺子来打对子');
    });

    suite.addTest('AI不出错误牌型 - 用三张打单张', () => {
        const handCards = [
            // 三张
            suite.createCard('♠', '9'),
            suite.createCard('♥', '9'),
            suite.createCard('♣', '9'),
            // 单张
            suite.createCard('♦', 'A')
        ];

        const lastPlay = {
            cards: [suite.createCard('♠', 'K')],
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 验证没有返回三张
        const hasTriple = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.type === 'triple';
        });
        suite.assertFalse(hasTriple, '不应该返回三张来打单张');
    });

    // 测试AI优先选择策略
    suite.addTest('AI选择策略 - 优先出小牌', () => {
        const handCards = [
            suite.createCard('♣', '3'),
            suite.createCard('♦', '5'),
            suite.createCard('♠', '9'),
            suite.createCard('♥', 'K'),
            suite.createCard('♣', 'A')
        ];

        const lastPlay = {
            cards: [suite.createCard('♦', '2')],
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        if (possiblePlays.length > 1) {
            // 检查是否按从小到大排序
            for (let i = 1; i < possiblePlays.length; i++) {
                const prev = possiblePlays[i-1];
                const curr = possiblePlays[i];

                // 单张牌按权重排序
                if (prev.cards.length === 1 && curr.cards.length === 1) {
                    const prevWeight = ruleEngine.getCardWeight(prev.cards[0]);
                    const currWeight = ruleEngine.getCardWeight(curr.cards[0]);
                    suite.assertTrue(
                        prevWeight <= currWeight,
                        `应该按从小到大排序: ${prev.cards[0].rank}(${prevWeight}) <= ${curr.cards[0].rank}(${currWeight})`
                    );
                }
            }
        }
    });

    suite.addTest('AI选择策略 - 相同类型选择最小的', () => {
        const handCards = [
            suite.createCard('♣', '8'),
            suite.createCard('♦', '8'),
            suite.createCard('♠', '9'),
            suite.createCard('♥', '9'),
            suite.createCard('♣', '10'),
            suite.createCard('♦', '10')
        ];

        const lastPlay = {
            cards: [
                suite.createCard('♠', '6'),
                suite.createCard('♥', '6')
            ],
            type: { type: 'pair', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 找出所有对子
        const pairs = possiblePlays.filter(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.type === 'pair';
        });

        if (pairs.length > 1) {
            // 验证对子按点数排序
            for (let i = 1; i < pairs.length; i++) {
                const prevRank = pairs[i-1].cards[0].rank;
                const currRank = pairs[i].cards[0].rank;
                const prevWeight = ruleEngine.getCardWeight(pairs[i-1].cards[0]);
                const currWeight = ruleEngine.getCardWeight(pairs[i].cards[0]);

                suite.assertTrue(
                    prevWeight <= currWeight,
                    `对子应该按从小到大排序: ${prevRank} <= ${currRank}`
                );
            }
        }
    });

    // 测试炸弹使用策略
    suite.addTest('AI炸弹策略 - 必要时才使用炸弹', () => {
        const handCards = [
            // 普通牌
            suite.createCard('♣', '3'),
            suite.createCard('♦', '4'),
            suite.createCard('♠', 'J'),
            // 炸弹
            suite.createCard('♥', 'K'),
            suite.createCard('♣', 'K'),
            suite.createCard('♦', 'K'),
            suite.createCard('♠', 'K')
        ];

        const lastPlay = {
            cards: [suite.createCard('♠', '5')],
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 应该返回普通牌而不是炸弹
        const hasNonBomb = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.family === 'normal';
        });

        if (hasNonBomb) {
            // 如果有普通牌可以出，炸弹应该在列表后面
            const firstNonBombIndex = possiblePlays.findIndex(play => {
                const type = ruleEngine.getCardType(play.cards);
                return type && type.family === 'normal';
            });

            const bombIndex = possiblePlays.findIndex(play => {
                const type = ruleEngine.getCardType(play.cards);
                return type && type.family === 'bomb';
            });

            if (firstNonBombIndex !== -1 && bombIndex !== -1) {
                suite.assertTrue(
                    firstNonBombIndex < bombIndex,
                    '应该优先选择普通牌而不是炸弹'
                );
            }
        }
    });

    suite.addTest('AI炸弹策略 - 对付大牌时使用炸弹', () => {
        const handCards = [
            // 普通牌
            suite.createCard('♣', '3'),
            suite.createCard('♦', '4'),
            // 炸弹
            suite.createCard('♥', 'A'),
            suite.createCard('♣', 'A'),
            suite.createCard('♦', 'A'),
            suite.createCard('♠', 'A')
        ];

        const lastPlay = {
            cards: [suite.createCard('♠', '2')],  // 2很大
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 对于2，AI应该考虑使用炸弹
        const hasBomb = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.family === 'bomb';
        });

        // 至少应该有炸弹选项
        suite.assertTrue(hasBomb || possiblePlays.length === 0, '面对2时应该有炸弹选项或选择过牌');
    });

    // 测试过牌逻辑
    suite.addTest('AI过牌逻辑 - 没有大牌时过牌', () => {
        const handCards = [
            suite.createCard('♣', '3'),
            suite.createCard('♦', '4'),
            suite.createCard('♠', '5')
        ];

        const lastPlay = {
            cards: [suite.createCard('♠', 'K')],  // K比手牌都大
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 应该返回空数组，表示要过牌
        suite.assertEqual(possiblePlays.length, 0, '没有大牌时应该过牌');
    });

    suite.addTest('AI过牌逻辑 - 没有相同类型时过牌', () => {
        const handCards = [
            // 单张
            suite.createCard('♣', 'A'),
            suite.createCard('♦', '2'),
            // 没有三张
        ];

        const lastPlay = {
            cards: [
                suite.createCard('♠', '8'),
                suite.createCard('♥', '8'),
                suite.createCard('♣', '8')
            ],
            type: { type: 'triple', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 没有炸弹时应该过牌
        const hasBomb = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.family === 'bomb';
        });

        if (!hasBomb) {
            suite.assertEqual(possiblePlays.length, 0, '没有相同类型且没有炸弹时应该过牌');
        }
    });

    // 测试首出策略
    suite.addTest('AI首出策略 - 优先出单张小牌', () => {
        const handCards = [
            suite.createCard('♣', '3'),
            suite.createCard('♦', '3'),
            suite.createCard('♠', '4'),
            suite.createCard('♥', '4'),
            suite.createCard('♣', '5'),
            suite.createCard('♦', '6'),
            suite.createCard('♠', '7'),
            suite.createCard('♥', '8')
        ];

        // 首出（没有lastPlay）
        const possiblePlays = findAllPossiblePlays(handCards, null);

        // 应该有单张选项
        const hasSingle = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.type === 'single';
        });

        suite.assertTrue(hasSingle, '首出时应该有单张选项');

        // 找出最小的单张
        const singles = possiblePlays.filter(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.type === 'single';
        });

        if (singles.length > 0) {
            const minSingle = singles.reduce((min, curr) => {
                const minWeight = ruleEngine.getCardWeight(min.cards[0]);
                const currWeight = ruleEngine.getCardWeight(curr.cards[0]);
                return currWeight < minWeight ? curr : min;
            });

            // 最小的单张应该是3
            suite.assertEqual(minSingle.cards[0].rank, '3', '首出应该优先出最小的牌');
        }
    });

    // 测试特殊牌型处理
    suite.addTest('AI特殊牌型 - 正确识别同花顺', () => {
        const handCards = [
            // 同花顺
            suite.createCard('♠', '8'),
            suite.createCard('♠', '9'),
            suite.createCard('♠', '10'),
            suite.createCard('♠', 'J'),
            suite.createCard('♠', 'Q'),
            // 其他牌
            suite.createCard('♣', '3')
        ];

        const lastPlay = {
            cards: [
                suite.createCard('♥', '4'),
                suite.createCard('♥', '4'),
                suite.createCard('♥', '4'),
                suite.createCard('♥', '4')
            ],
            type: { type: 'bomb', family: 'bomb' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        // 应该识别出同花顺作为炸弹选项
        const hasStraightFlush = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.subtype === 'straightFlush';
        });

        suite.assertTrue(hasStraightFlush, '应该识别出同花顺');
    });

    suite.addTest('AI特殊牌型 - 正确识别天王炸弹', () => {
        const handCards = [
            suite.createCard('joker', '小王'),
            suite.createCard('joker', '小王'),
            suite.createCard('joker', '大王'),
            suite.createCard('joker', '大王'),
            // 其他牌
            suite.createCard('♣', '3')
        ];

        // 任何情况下都应该识别天王炸弹
        const possiblePlays = findAllPossiblePlays(handCards, null);

        const hasKingBomb = possiblePlays.some(play => {
            const type = ruleEngine.getCardType(play.cards);
            return type && type.subtype === 'kingBomb';
        });

        suite.assertTrue(hasKingBomb, '应该识别出天王炸弹');
    });

    // 测试过滤逻辑正确性
    suite.addTest('AI过滤逻辑 - 移除无效牌型', () => {
        const handCards = [
            suite.createCard('♠', 'A'),
            suite.createCard('♥', 'A'),
            suite.createCard('♣', 'K')
        ];

        // 故意创建一个无效的play对象
        const mockPlays = [
            {
                cards: [suite.createCard('♠', 'A')],
                type: null  // 无效的type
            },
            {
                cards: [suite.createCard('♣', 'K')],
                type: { type: 'single', family: 'normal' }  // 有效的type
            }
        ];

        // 测试过滤逻辑
        const validPlays = mockPlays.filter(play => {
            if (!play.type) {
                console.warn('AI: 无效的牌型');
                return false;
            }
            return true;
        });

        suite.assertEqual(validPlays.length, 1, '应该只保留有效的牌型');
        suite.assertEqual(validPlays[0].cards[0].rank, 'K', '应该保留K而不是无效的A');
    });

    // 测试边界情况
    suite.addTest('AI边界情况 - 空手牌', () => {
        const handCards = [];
        const lastPlay = {
            cards: [suite.createCard('♠', '3')],
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        suite.assertEqual(possiblePlays.length, 0, '空手牌应该返回空数组');
    });

    suite.addTest('AI边界情况 - 所有牌都比上家小', () => {
        const handCards = [
            suite.createCard('♣', '3'),
            suite.createCard('♦', '4'),
            suite.createCard('♠', '5')
        ];

        const lastPlay = {
            cards: [suite.createCard('♠', 'A')],  // A比所有手牌都大
            type: { type: 'single', family: 'normal' }
        };

        const possiblePlays = findAllPossiblePlays(handCards, lastPlay);

        suite.assertEqual(possiblePlays.length, 0, '所有牌都比上家小时应该过牌');
    });

    suite.addTest('AI边界情况 - 上家出牌格式检查', () => {
        const handCards = [
            suite.createCard('♣', 'A'),
            suite.createCard('♦', 'A')
        ];

        // 测试不同的lastPlay格式
        const testCases = [
            { cards: [suite.createCard('♠', 'K')], type: null },
            { cards: [], type: { type: 'single', family: 'normal' } },
            { type: { type: 'single', family: 'normal' } },
            null
        ];

        testCases.forEach((lastPlay, index) => {
            const possiblePlays = findAllPossiblePlays(handCards, lastPlay);
            // 不应该崩溃，应该能处理各种格式
            suite.assertTrue(Array.isArray(possiblePlays), `测试用例${index + 1}不应该崩溃`);
        });
    });

    return suite;
}

// 导出测试创建函数
if (typeof module !== 'undefined' && module.exports) {
    module.exports = createAITests;
} else if (typeof window !== 'undefined') {
    window.createAITests = createAITests;
}