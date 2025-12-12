#!/usr/bin/env node

/**
 * 🎮 掼蛋游戏启动脚本
 * 快速启动本地开发服务器
 */

const { startServer } = require('./server.js');

console.log('🎮 掼蛋游戏启动器');
console.log('==================');

// 解析命令行参数
const args = process.argv.slice(2);
const port = args.find(arg => arg.startsWith('--port='))?.split('=')[1] || 8080;
const host = args.find(arg => arg.startsWith('--host='))?.split('=')[1] || 'localhost';
const open = args.includes('--open');

// 启动服务器
const server = startServer({
    port: parseInt(port),
    host: host,
    enableCORS: true,
    enableLogging: true
});

// 如果指定了--open参数，自动打开浏览器
if (open) {
    setTimeout(() => {
        server.openBrowser();
    }, 1000);
}

console.log('🎯 游戏功能状态:');
console.log('  ✅ 基础游戏界面');
console.log('  ✅ 四人玩家布局');
console.log('  ✅ 发牌和出牌');
console.log('  ✅ AI自动出牌');
console.log('  ✅ 无动画静态界面');
console.log('  🔄 规则引擎（基础版）');
console.log('  🔄 AI智能策略');
console.log('  🔄 完整掼蛋规则');
console.log('');
console.log('📝 下一步开发建议:');
console.log('  1. 完善掼蛋规则（顺子、连对、炸弹）');
console.log('  2. 提升AI智能水平');
console.log('  3. 添加游戏音效和提示');
console.log('  4. 实现胜负判断和升级机制');
console.log('');
