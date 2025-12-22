/**
 * 🎮 控制面板932x430适配模块
 * 模块化的控制面板修复解决方案
 */
class ControlPanel932x430 {
    constructor() {
        this.is932x430 = this.checkResolution();
        this.init();
    }

    checkResolution() {
        return window.innerWidth === 932 && window.innerHeight === 430;
    }

    init() {
        // 页面加载时执行
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                if (this.checkResolution()) {
                    this.applyFixes();
                    this.setupEmojiRemovalMonitor();
                }
            }, 100);
        });

        // 窗口改变时执行
        window.addEventListener('resize', () => {
            if (this.checkResolution()) {
                this.applyFixes();
            }
        });

        // 立即检查
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.applyFixes();
                this.setupEmojiRemovalMonitor();
            });
        } else {
            this.applyFixes();
            this.setupEmojiRemovalMonitor();
        }
    }

    setupEmojiRemovalMonitor() {
        // 持续监控按钮内容，防止其他代码重新添加emoji
        setInterval(() => {
            if (this.checkResolution()) {
                const buttons = document.querySelectorAll('.control-panel.simplified .btn');
                buttons.forEach((btn) => {
                    const currentText = btn.textContent || btn.innerHTML;
                    if (currentText && /[🔀🔄🎯♠♥♦♣]/.test(currentText)) {
                        const cleanText = currentText.replace(/[🔀🔄🎯♠♥♦♣]/g, '').trim();
                        btn.textContent = cleanText;
                        console.log(`🔄 移除重新出现的emoji: ${currentText} -> ${cleanText}`);
                    }
                });
            }
        }, 500); // 每0.5秒检查一次
    }

    applyFixes() {
        if (!this.checkResolution()) return;

        console.log('🎮 932x430控制面板适配模块启动');

        const controlPanel = document.querySelector('.control-panel.simplified');
        if (!controlPanel) {
            console.log('❌ 未找到控制面板');
            return;
        }

        // 应用控制面板样式
        this.applyPanelStyles(controlPanel);

        // 应用按钮样式
        const buttons = controlPanel.querySelectorAll('button.btn');
        this.applyButtonStyles(buttons);

        // 应用容器样式
        const buttonContainer = controlPanel.querySelector('.control-buttons');
        this.applyContainerStyles(buttonContainer);

        console.log('✅ 932x430控制面板适配完成');
    }

    applyPanelStyles(panel) {
        Object.assign(panel.style, {
            position: 'fixed',
            right: '5px',
            bottom: '5px',
            minWidth: '190px',
            maxWidth: '210px',
            height: '30px',
            padding: '2px 3px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: '99999',
            boxSizing: 'border-box'
        });
    }

    applyButtonStyles(buttons) {
        buttons.forEach((btn, index) => {
            Object.assign(btn.style, {
                width: '85px',
                height: '22px',
                minWidth: '85px',
                maxWidth: '85px',
                minHeight: '22px',
                maxHeight: '22px',
                fontSize: '13px',
                padding: '0px 3px',
                margin: '0 1px',
                flex: 'none',
                display: 'inline-block',
                textAlign: 'center',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                boxSizing: 'content-box',
                lineHeight: '22px',
                verticalAlign: 'top',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '2px',
                fontFamily: 'Arial, sans-serif',
                letterSpacing: '0',
                wordSpacing: '0',
                transform: 'none',
                position: 'static',
                float: 'none',
                clear: 'none',
                background: 'rgba(52,73,94,0.8)',
                color: 'white',
                cursor: 'pointer'
            });

            // 移除emoji图标
            const text = btn.textContent.replace(/[🔀🔄🎯♠♥♦♣]/g, '').trim();
            btn.textContent = text;

            console.log(`✅ 按钮 ${index + 1}: ${text}`);
        });
    }

    applyContainerStyles(container) {
        if (!container) return;

        Object.assign(container.style, {
            display: 'flex',
            flexDirection: 'row',
            gap: '3px',
            justifyContent: 'center',
            alignItems: 'center',
            width: '100%',
            height: '26px',
            padding: '0 3px',
            margin: '0',
            boxSizing: 'border-box'
        });
    }
}

// 创建实例
window.controlPanel932x430 = new ControlPanel932x430();