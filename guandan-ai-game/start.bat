@echo off
echo 🚀 启动掼蛋游戏服务器...
echo.

REM 检查Node.js是否安装
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到Node.js
    echo.
    echo 请先安装Node.js:
    echo 📥 访问: https://nodejs.org/
    echo 📖 下载并安装LTS版本
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js 已安装
echo.

REM 启动服务器
echo 📦 启动HTTP服务器...
node server.js

echo.
echo 👋 服务器已停止
pause