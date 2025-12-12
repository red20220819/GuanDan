/**
 * 🚀 简易HTTP服务器 - 解决CORS和文件协议问题
 * 用于在本地开发环境中测试Web应用
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

class SimpleHTTPServer {
    constructor(options = {}) {
        this.port = options.port || 8080;
        this.host = options.host || 'localhost';
        this.rootDir = options.rootDir || __dirname;
        this.enableCORS = options.enableCORS !== false;
        this.enableLogging = options.enableLogging !== false;

        this.mimeTypes = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.ico': 'image/x-icon',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.eot': 'application/vnd.ms-fontobject'
        };

        this.server = null;
        this.init();
    }

    init() {
        this.createServer();
        this.start();
    }

    createServer() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`❌ 端口 ${this.port} 被占用，尝试使用端口 ${this.port + 1}`);
                this.port++;
                this.start();
            } else {
                console.error('❌ 服务器错误:', err);
            }
        });
    }

    handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        const pathname = parsedUrl.pathname;

        if (this.enableLogging) {
            console.log(`📨 ${req.method} ${pathname}`);
        }

        // 设置CORS头
        if (this.enableCORS) {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }

        // 处理预检请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // 特殊处理Chrome DevTools请求
        if (pathname === '/.well-known/appspecific/com.chrome.devtools.json') {
            this.serveChromeDevToolsJson(res);
            return;
        }

        // 安全路径检查
        const safePath = this.getSafePath(pathname);
        if (!safePath) {
            this.sendError(res, 400, 'Bad Request: Invalid path');
            return;
        }

        const filePath = path.join(this.rootDir, safePath);

        // 检查文件是否存在
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                if (pathname === '/' || pathname === '/index.html') {
                    // 尝试提供index-new.html
                    this.serveIndexPage(res);
                } else {
                    this.sendError(res, 404, 'File not found');
                }
                return;
            }

            this.serveFile(res, filePath);
        });
    }

    getSafePath(pathname) {
        // 移除查询参数和哈希
        pathname = pathname.split('?')[0].split('#')[0];

        // 解码URL
        pathname = decodeURIComponent(pathname);

        // 规范化路径
        pathname = path.normalize(pathname);

        // 防止目录遍历攻击
        if (pathname.includes('..')) {
            return null;
        }

        // 确保路径不以/开头
        if (pathname.startsWith('/')) {
            pathname = pathname.slice(1);
        }

        return pathname || 'index-modern.html';
    }

    serveIndexPage(res) {
        const indexPath = path.join(this.rootDir, 'index-modern.html');

        fs.readFile(indexPath, 'utf8', (err, data) => {
            if (err) {
                this.sendError(res, 500, 'Error reading index file');
                return;
            }

            // 修改预加载标签以解决CORS问题
            data = this.fixPreloadTags(data);

            res.setHeader('Content-Type', 'text/html');
            res.writeHead(200);
            res.end(data);
        });
    }

    fixPreloadTags(html) {
        // 为预加载标签添加crossorigin属性
        return html.replace(
            /<link rel="preload"([^\u003e]*)>/g,
            '<link rel="preload"$1 crossorigin="anonymous">'
        );
    }

    serveFile(res, filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = this.mimeTypes[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, data) => {
            if (err) {
                this.sendError(res, 500, 'Error reading file');
                return;
            }

            // 为JS模块添加CORS头
            if (ext === '.js' && contentType === 'application/javascript') {
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }

            // 设置缓存头
            if (ext.match(/\.(css|js|png|jpg|jpeg|gif|ico|woff|woff2)$/)) {
                res.setHeader('Cache-Control', 'public, max-age=3600'); // 1小时缓存
            }

            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Length', data.length);
            res.writeHead(200);
            res.end(data);
        });
    }

    /**
     * 提供Chrome DevTools JSON响应
     */
    serveChromeDevToolsJson(res) {
        const response = {
            status: "ok",
            message: "This endpoint is for Chrome DevTools compatibility"
        };

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.writeHead(200);
        res.end(JSON.stringify(response));

        if (this.enableLogging) {
            console.log('📋 提供Chrome DevTools JSON响应');
        }
    }

    sendError(res, statusCode, message) {
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(statusCode);
        res.end(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>错误 ${statusCode}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    .error-container {
                        text-align: center;
                        padding: 2rem;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    }
                    .error-code {
                        font-size: 6rem;
                        font-weight: bold;
                        margin: 0;
                        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
                    }
                    .error-message {
                        font-size: 1.5rem;
                        margin: 1rem 0;
                    }
                    .back-link {
                        color: white;
                        text-decoration: none;
                        padding: 0.5rem 1rem;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 5px;
                        transition: background 0.3s ease;
                    }
                    .back-link:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }
                </style>
            </head>
            <body>
                <div class="error-container">
                    <h1 class="error-code">${statusCode}</h1>
                    <p class="error-message">${message}</p>
                    <a href="/" class="back-link">返回首页</a>
                </div>
            </body>
            </html>
        `);
    }

    start() {
        this.server.listen(this.port, this.host, () => {
            console.log(`🚀 服务器启动成功！`);
            console.log(`📍 访问地址: http://${this.host}:${this.port}`);
            console.log(`🎯 掼蛋游戏: http://${this.host}:${this.port}/index.html`);
            console.log(`📁 根目录: ${this.rootDir}`);
            console.log(`🌐 CORS: ${this.enableCORS ? '已启用' : '已禁用'}`);
            console.log(`📝 日志: ${this.enableLogging ? '已启用' : '已禁用'}`);
            console.log('');
            console.log('💡 提示:');
            console.log('  - 在浏览器中访问上述地址');
            console.log('  - 按 Ctrl+C 停止服务器');
            console.log('  - 支持热重载，修改文件后刷新页面即可');
            console.log('');

            // 自动打开浏览器（可选）
            if (process.argv.includes('--open')) {
                this.openBrowser();
            }
        });
    }

    openBrowser() {
        const open = require('child_process');
        const url = `http://${this.host}:${this.port}/index.html`;

        switch (process.platform) {
            case 'darwin': // macOS
                open.exec(`open ${url}`);
                break;
            case 'win32': // Windows
                open.exec(`start ${url}`);
                break;
            default: // Linux
                open.exec(`xdg-open ${url}`);
        }
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                console.log('👋 服务器已停止');
                process.exit(0);
            });
        }
    }
}

// 创建并启动服务器
function startServer(options = {}) {
    const server = new SimpleHTTPServer({
        port: options.port || 8080,
        host: options.host || 'localhost',
        rootDir: __dirname,
        enableCORS: true,
        enableLogging: true,
        ...options
    });

    return server;
}

// 处理进程退出
process.on('SIGINT', () => {
    console.log('\n🛑 正在停止服务器...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在停止服务器...');
    process.exit(0);
});

// 如果是直接运行此文件，启动服务器
if (require.main === module) {
    const server = startServer({
        port: process.env.PORT || 8080,
        host: process.env.HOST || 'localhost'
    });

    // 导出供其他模块使用
    module.exports = server;
} else {
    // 导出服务器类供测试使用
    module.exports = { SimpleHTTPServer, startServer };
}
