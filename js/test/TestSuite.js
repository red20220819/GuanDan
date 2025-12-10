/**
 * 掼蛋游戏测试框架 - TestSuite
 * 提供测试运行的核心功能和断言方法
 */

class TestSuite {
    /**
     * 创建测试套件
     * @param {string} name - 测试套件名称
     * @param {RuleEngine} ruleEngine - 规则引擎实例
     */
    constructor(name, ruleEngine = null) {
        this.name = name;
        this.ruleEngine = ruleEngine;
        this.tests = [];
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }

    /**
     * 添加测试用例
     * @param {string} description - 测试描述
     * @param {Function} testFn - 测试函数
     */
    addTest(description, testFn) {
        this.tests.push({
            description,
            testFn,
            timeout: 5000 // 默认5秒超时
        });
    }

    /**
     * 添加带超时的测试用例
     * @param {string} description - 测试描述
     * @param {Function} testFn - 测试函数
     * @param {number} timeout - 超时时间（毫秒）
     */
    addTestWithTimeout(description, testFn, timeout) {
        this.tests.push({
            description,
            testFn,
            timeout
        });
    }

    /**
     * 运行所有测试
     * @returns {Promise<Object>} 测试结果
     */
    async runAll() {
        this.results.startTime = Date.now();
        console.log(`\n🧪 === ${this.name} 测试开始 ===`);

        for (let i = 0; i < this.tests.length; i++) {
            const test = this.tests[i];
            this.results.total++;

            try {
                // 使用Promise.race实现超时机制
                await Promise.race([
                    this.runSingleTest(test),
                    this.createTimeoutPromise(test.timeout)
                ]);

                this.results.passed++;
                console.log(`✅ ${test.description}`);
            } catch (error) {
                this.results.failed++;
                const errorInfo = {
                    test: test.description,
                    error: error.message,
                    stack: error.stack
                };
                this.results.errors.push(errorInfo);

                if (error.name === 'TestTimeoutError') {
                    console.error(`⏰ ${test.description}: 测试超时`);
                } else {
                    console.error(`❌ ${test.description}: ${error.message}`);
                }
            }
        }

        this.results.endTime = Date.now();
        this.printSummary();

        return this.results;
    }

    /**
     * 运行单个测试
     * @param {Object} test - 测试对象
     */
    async runSingleTest(test) {
        return new Promise(async (resolve, reject) => {
            try {
                await test.testFn();
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 创建超时Promise
     * @param {number} timeout - 超时时间
     */
    createTimeoutPromise(timeout) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('TestTimeoutError'));
            }, timeout);
        });
    }

    /**
     * 断言方法 - 验证条件为真
     * @param {boolean} condition - 要验证的条件
     * @param {string} message - 错误消息
     */
    assert(condition, message = '断言失败') {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * 断言相等
     * @param {*} actual - 实际值
     * @param {*} expected - 期望值
     * @param {string} message - 错误消息
     */
    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            const errorMsg = message || `期望 ${expected}，实际 ${actual}`;
            throw new Error(errorMsg);
        }
    }

    /**
     * 断言不相等
     * @param {*} actual - 实际值
     * @param {*} expected - 期望值
     * @param {string} message - 错误消息
     */
    assertNotEqual(actual, expected, message) {
        if (actual === expected) {
            const errorMsg = message || `期望不等于 ${expected}，但实际相等`;
            throw new Error(errorMsg);
        }
    }

    /**
     * 断言为真
     * @param {*} value - 要验证的值
     * @param {string} message - 错误消息
     */
    assertTrue(value, message) {
        this.assert(value === true, message || '期望为true');
    }

    /**
     * 断言为假
     * @param {*} value - 要验证的值
     * @param {string} message - 错误消息
     */
    assertFalse(value, message) {
        this.assert(value === false, message || '期望为false');
    }

    /**
     * 断言为null
     * @param {*} value - 要验证的值
     * @param {string} message - 错误消息
     */
    assertNull(value, message) {
        this.assert(value === null, message || '期望为null');
    }

    /**
     * 断言不为null
     * @param {*} value - 要验证的值
     * @param {string} message - 错误消息
     */
    assertNotNull(value, message) {
        this.assert(value !== null, message || '期望不为null');
    }

    /**
     * 断言为undefined
     * @param {*} value - 要验证的值
     * @param {string} message - 错误消息
     */
    assertUndefined(value, message) {
        this.assert(value === undefined, message || '期望为undefined');
    }

    /**
     * 断言不为undefined
     * @param {*} value - 要验证的值
     * @param {string} message - 错误消息
     */
    assertDefined(value, message) {
        this.assert(value !== undefined, message || '期望不为undefined');
    }

    /**
     * 断言数组包含元素
     * @param {Array} array - 数组
     * @param {*} element - 要检查的元素
     * @param {string} message - 错误消息
     */
    assertContains(array, element, message) {
        if (!Array.isArray(array)) {
            throw new Error('第一个参数必须是数组');
        }
        if (!array.includes(element)) {
            const errorMsg = message || `数组不包含元素 ${element}`;
            throw new Error(errorMsg);
        }
    }

    /**
     * 断言抛出错误
     * @param {Function} fn - 要执行的函数
     * @param {string} expectedMessage - 期望的错误消息（可选）
     * @param {string} message - 错误消息
     */
    async assertThrows(fn, expectedMessage = null, message = '期望抛出错误') {
        let threw = false;
        let actualMessage = null;

        try {
            await fn();
        } catch (error) {
            threw = true;
            actualMessage = error.message;
        }

        if (!threw) {
            throw new Error(message);
        }

        if (expectedMessage && actualMessage !== expectedMessage) {
            throw new Error(`期望错误消息 "${expectedMessage}"，实际 "${actualMessage}"`);
        }
    }

    /**
     * 断言对象包含属性
     * @param {Object} obj - 对象
     * @param {string} property - 属性名
     * @param {string} message - 错误消息
     */
    assertHasProperty(obj, property, message) {
        if (!(property in obj)) {
            const errorMsg = message || `对象不包含属性 ${property}`;
            throw new Error(errorMsg);
        }
    }

    /**
     * 创建测试卡牌
     * @param {string} suit - 花色
     * @param {string} rank - 点数
     * @returns {Object} 卡牌对象
     */
    createCard(suit, rank) {
        return {
            suit: suit,
            rank: rank,
            selected: false
        };
    }

    /**
     * 创建多张卡牌
     * @param {Array} cards - 卡牌数组，每个元素是[suit, rank]
     * @returns {Array} 卡牌对象数组
     */
    createCards(cards) {
        return cards.map(([suit, rank]) => this.createCard(suit, rank));
    }

    /**
     * 打印测试汇总
     */
    printSummary() {
        const duration = this.results.endTime - this.results.startTime;
        console.log(`\n--- ${this.name} 测试汇总 ---`);
        console.log(`总计: ${this.results.total}`);
        console.log(`通过: ${this.results.passed} ✅`);
        console.log(`失败: ${this.results.failed} ❌`);
        console.log(`耗时: ${duration}ms`);
        console.log(`成功率: ${((this.results.passed/this.results.total)*100).toFixed(1)}%`);

        if (this.results.failed > 0) {
            console.log('\n错误详情:');
            this.results.errors.forEach((e, index) => {
                console.log(`\n${index + 1}. ${e.test}`);
                console.log(`   错误: ${e.error}`);
            });
        }
    }

    /**
     * 获取测试结果摘要
     * @returns {Object} 测试结果摘要
     */
    getSummary() {
        const duration = this.results.endTime - this.results.startTime;
        return {
            name: this.name,
            total: this.results.total,
            passed: this.results.passed,
            failed: this.results.failed,
            successRate: this.results.total > 0 ? (this.results.passed/this.results.total)*100 : 0,
            duration: duration,
            hasErrors: this.results.failed > 0
        };
    }

    /**
     * 清空测试结果
     */
    reset() {
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: [],
            startTime: null,
            endTime: null
        };
    }
}

// 导出TestSuite类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestSuite;
} else if (typeof window !== 'undefined') {
    window.TestSuite = TestSuite;
}