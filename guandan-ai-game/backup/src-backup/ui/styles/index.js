/**
 * 🎨 UI主样式 - 重构版本
 * 统一管理所有UI组件样式
 */

export const CSS_VARS = {
    // 颜色
    primary: {
        red: '#DC143C',
        blue: '#3498DB',
        green: '#27AE60',
        gold: '#FFD700'
    },
    background: {
        table: {
            primary: 'radial-gradient(ellipse at center, rgba(39, 174, 96, 0.8) 0%, rgba(22, 160, 133, 0.9) 30%)',
            secondary: 'linear-gradient(135deg, rgba(52, 73, 94, 0.95) 60%, rgba(44, 62, 80, 1) 100%)'
        },
        card: {
            face: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #e9ecef 100%)',
            back: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #1e3c72 100%)',
            red: '#DC143C',
            black: '#000000'
        },
        button: {
            primary: 'linear-gradient(135deg, #27AE60 0%, #2ecc71 50%, #27AE60 100%)',
            secondary: 'linear-gradient(135deg, #3498DB 0%, #2980B9 50%, #3498DB 100%)',
            danger: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 50%, #E74C3C 100%)',
            success: 'linear-gradient(135deg, #27AE60 0%, #2ecc71 50%, #27AE60 100%)'
        }
    },
    shadow: {
        small: '0 2px 8px rgba(0, 0, 0, 0.15)',
        medium: '0 4px 16px rgba(0, 0, 0, 0.2)',
        large: '0 8px 32px rgba(0, 0, 0, 0.3)',
        card: '0 4px 12px rgba(0, 0, 0, 0.2)'
    },
    animation: {
        duration: {
            fast: '0.15s',
            normal: '0.25s',
            slow: '0.4s'
        },
        easing: {
            ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
            bounce: 'cubic-bezier(0.68, -0.55, 0.265, 0.55)'
        }
    },
    spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
    },
    breakpoint: {
        mobile: '768px',
        tablet: '1024px',
        desktop: '1200px'
    },
    border: {
        radius: {
            sm: '8px',
            md: '12px',
            lg: '16px',
            xl: '20px'
        },
        width: {
            sm: '1px',
            md: '2px',
            lg: '3px',
            xl: '4px'
        }
    }
};

// 创建全局样式
export const createGlobalStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: ${CSS_VARS.background.table.primary};
            color: ${CSS_VARS.primary.white};
            height: 100vh;
            overflow: hidden;
        }

        .guandan-game-v2 {
            width: 100vw;
            height: 100vh;
            position: relative;
            overflow: hidden;
        }
    `;

    document.head.appendChild(style);
    return style;
};