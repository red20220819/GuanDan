/**
 * 掼蛋游戏测试运行器 - TestRunner
 * 管理多个测试套件的运行和报告
 */

class TestRunner {
    constructor() {
        this.testSuites = [];
        this.globalResults = {
            totalSuites: 0,
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            startTime: null,
            endTime: null,
            suiteResults: []
        };
        this.config = {
            verbose: true,
            stopOnFirstFailure: false,
            showStackTrace: false
        };
    }

    /**
     * 添加测试套件
     * @param {TestSuite} suite - 测试套件
     */
    addSuite(suite) {
        if (!(suite instanceof TestSuite)) {
            throw new Error('必须添加TestSuite实例');
        }
        this.testSuites.push(suite);
    }

    /**
     * 配置测试运行器
     * @param {Object} config - 配置选项
     */
    configure(config) {
        this.config = { ...this.config, ...config };
    }

    /**
     * 运行所有测试套件
     * @returns {Promise<Object>} 全局测试结果
     */
    async runAllTests() {
        this.globalResults.startTime = Date.now();
        this.globalResults.totalSuites = this.testSuites.length;

        console.log('\n🚀 开始运行掼蛋游戏测试套件');
        console.log('=====================================');
        console.log(`测试套件数量: ${this.testSuites.length}`);
        console.log('=====================================\n');

        for (let i = 0; i < this.testSuites.length; i++) {
            const suite = this.testSuites[i];

            try {
                const suiteResult = await suite.runAll();

                // 累计结果
                this.globalResults.totalTests += suiteResult.total;
                this.globalResults.totalPassed += suiteResult.passed;
                this.globalResults.totalFailed += suiteResult.failed;

                // 保存套件结果
                this.globalResults.suiteResults.push({
                    name: suite.name,
                    summary: suite.getSummary()
                });

                // 如果配置为遇到失败就停止
                if (this.config.stopOnFirstFailure && suiteResult.failed > 0) {
                    console.log('\n⚠️ 检测到失败，停止运行剩余测试套件');
                    break;
                }

            } catch (error) {
                console.error(`\n💥 测试套件 "${suite.name}" 运行出错:`, error.message);
                this.globalResults.totalFailed += 1;
                this.globalResults.suiteResults.push({
                    name: suite.name,
                    error: error.message
                });

                if (this.config.stopOnFirstFailure) {
                    break;
                }
            }
        }

        this.globalResults.endTime = Date.now();
        this.printFinalSummary();

        return this.globalResults;
    }

    /**
     * 运行指定的测试套件
     * @param {string} suiteName - 套件名称
     * @returns {Promise<Object>} 测试结果
     */
    async runSpecificSuite(suiteName) {
        const suite = this.testSuites.find(s => s.name === suiteName);
        if (!suite) {
            throw new Error(`找不到测试套件: ${suiteName}`);
        }

        console.log(`\n🎯 运行指定测试套件: ${suiteName}`);
        const result = await suite.runAll();
        return result;
    }

    /**
     * 获取所有测试套件名称
     * @returns {Array} 套件名称数组
     */
    getSuiteNames() {
        return this.testSuites.map(suite => suite.name);
    }

    /**
     * 打印最终汇总报告
     */
    printFinalSummary() {
        const duration = this.globalResults.endTime - this.globalResults.startTime;
        const successRate = this.globalResults.totalTests > 0
            ? (this.globalResults.totalPassed / this.globalResults.totalTests * 100).toFixed(1)
            : 0;

        console.log('\n=====================================');
        console.log('📊 最终测试结果');
        console.log('=====================================');
        console.log(`测试套件: ${this.globalResults.totalSuites}`);
        console.log(`总测试数: ${this.globalResults.totalTests}`);
        console.log(`通过: ${this.globalResults.totalPassed} ✅`);
        console.log(`失败: ${this.globalResults.totalFailed} ❌`);
        console.log(`成功率: ${successRate}%`);
        console.log(`总耗时: ${duration}ms`);

        // 打印各套件摘要
        if (this.config.verbose) {
            console.log('\n📋 各套件详情:');
            console.log('-------------------------------------');
            this.globalResults.suiteResults.forEach(result => {
                if (result.error) {
                    console.log(`❌ ${result.name}: 运行错误 - ${result.error}`);
                } else {
                    const status = result.summary.failed === 0 ? '✅' : '❌';
                    console.log(`${status} ${result.name}: ${result.summary.passed}/${result.summary.total} 通过 (${result.summary.successRate.toFixed(1)}%)`);
                }
            });
        }

        // 失败统计
        if (this.globalResults.totalFailed > 0) {
            console.log('\n⚠️ 失败统计:');
            let totalErrors = 0;
            this.globalResults.suiteResults.forEach(result => {
                if (result.summary && result.summary.failed > 0) {
                    console.log(`  - ${result.name}: ${result.summary.failed} 个失败`);
                    totalErrors += result.summary.failed;
                }
            });
            console.log(`  总计: ${totalErrors} 个失败测试`);
        }

        console.log('=====================================\n');

        // 根据结果显示不同的结束语
        if (this.globalResults.totalFailed === 0) {
            console.log('🎉 所有测试通过！游戏规则验证成功！');
        } else {
            console.log('❌ 存在测试失败，请检查并修复相关问题');
        }
    }

    /**
     * 生成HTML格式的测试报告
     * @returns {string} HTML报告
     */
    generateHTMLReport() {
        const successRate = this.globalResults.totalTests > 0
            ? (this.globalResults.totalPassed / this.globalResults.totalTests * 100).toFixed(1)
            : 0;

        let html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>掼蛋游戏测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; margin-bottom: 30px; }
        .summary { display: flex; justify-content: space-around; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 5px; }
        .summary-item { text-align: center; }
        .summary-item h3 { margin: 0; color: #666; }
        .summary-item .value { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .suite-results { margin-top: 30px; }
        .suite-item { margin-bottom: 15px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .suite-name { font-weight: bold; font-size: 1.1em; margin-bottom: 10px; }
        .suite-stats { display: flex; gap: 20px; }
        .stat-item { display: flex; align-items: center; gap: 5px; }
        .status-icon { font-size: 1.2em; }
        .errors { margin-top: 10px; padding: 10px; background: #f8d7da; border-radius: 3px; }
        .error-item { margin-bottom: 5px; }
        .timestamp { text-align: center; color: #999; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>掼蛋游戏测试报告</h1>

        <div class="summary">
            <div class="summary-item">
                <h3>总测试数</h3>
                <div class="value">${this.globalResults.totalTests}</div>
            </div>
            <div class="summary-item">
                <h3>通过</h3>
                <div class="value passed">${this.globalResults.totalPassed}</div>
            </div>
            <div class="summary-item">
                <h3>失败</h3>
                <div class="value failed">${this.globalResults.totalFailed}</div>
            </div>
            <div class="summary-item">
                <h3>成功率</h3>
                <div class="value">${successRate}%</div>
            </div>
        </div>

        <div class="suite-results">
            <h2>测试套件详情</h2>`;

        this.globalResults.suiteResults.forEach(result => {
            const status = result.error || (result.summary && result.summary.failed > 0) ? '❌' : '✅';
            const statusClass = result.error || (result.summary && result.summary.failed > 0) ? 'failed' : 'passed';

            html += `
            <div class="suite-item">
                <div class="suite-name">${status} ${result.name}</div>`;

            if (result.summary) {
                html += `
                <div class="suite-stats">
                    <div class="stat-item">
                        <span>总计:</span>
                        <span>${result.summary.total}</span>
                    </div>
                    <div class="stat-item">
                        <span>通过:</span>
                        <span class="passed">${result.summary.passed}</span>
                    </div>
                    <div class="stat-item">
                        <span>失败:</span>
                        <span class="failed">${result.summary.failed}</span>
                    </div>
                    <div class="stat-item">
                        <span>耗时:</span>
                        <span>${result.summary.duration}ms</span>
                    </div>
                </div>`;
            }

            if (result.error) {
                html += `
                <div class="errors">
                    <div class="error-item">错误: ${result.error}</div>
                </div>`;
            }

            html += `</div>`;
        });

        const timestamp = new Date(this.globalResults.endTime).toLocaleString('zh-CN');
        html += `
        </div>

        <div class="timestamp">
            报告生成时间: ${timestamp}
        </div>
    </div>
</body>
</html>`;

        return html;
    }

    /**
     * 保存HTML报告到文件
     * @param {string} filename - 文件名
     */
    saveHTMLReport(filename = 'test-report.html') {
        // 在浏览器环境中，可以创建下载链接
        if (typeof document !== 'undefined') {
            const html = this.generateHTMLReport();
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } else {
            // Node.js环境中，需要使用fs模块
            console.log('HTML报告生成功能仅在浏览器环境中可用');
        }
    }

    /**
     * 清空所有测试套件
     */
    clearSuites() {
        this.testSuites = [];
        this.resetResults();
    }

    /**
     * 重置结果
     */
    resetResults() {
        this.globalResults = {
            totalSuites: 0,
            totalTests: 0,
            totalPassed: 0,
            totalFailed: 0,
            startTime: null,
            endTime: null,
            suiteResults: []
        };
    }

    /**
     * 获取测试结果摘要
     * @returns {Object} 测试结果摘要
     */
    getResultsSummary() {
        const duration = this.globalResults.endTime - this.globalResults.startTime;
        const successRate = this.globalResults.totalTests > 0
            ? (this.globalResults.totalPassed / this.globalResults.totalTests * 100)
            : 0;

        return {
            totalSuites: this.globalResults.totalSuites,
            totalTests: this.globalResults.totalTests,
            totalPassed: this.globalResults.totalPassed,
            totalFailed: this.globalResults.totalFailed,
            successRate: successRate,
            duration: duration,
            allPassed: this.globalResults.totalFailed === 0
        };
    }
}

// 导出TestRunner类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TestRunner;
} else if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
}