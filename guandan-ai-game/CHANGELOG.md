# 开发日志 (CHANGELOG)

## [2025-01-XX] 记分牌UI优化

### 改进内容

#### 1. HTML结构重构
- 新增 `.team-wrapper` 包装容器，将卡片与三角形分离为独立兄弟元素
- 移除"VS"分隔符，卡片直接并排显示

#### 2. CSS样式优化
**文件**: `css/components/team-levels-bar.css`

| 改动项 | 说明 |
|--------|------|
| 卡片布局 | 上下分层设计：橙色头部（我方）+ 蓝色头部（对方），白色数字区 |
| 三角形位置 | 从卡片内部移至外部下方，作为独立区域显示 |
| 三角形方向 | 尖端朝上（`border-bottom: 14px solid currentColor`） |
| 显示逻辑 | 仅打级队伍显示三角形（`visibility: hidden/visible`） |
| 位置保持 | 三角形隐藏时仍占据空间，卡片位置不移动 |
| 外层容器 | 移除背景、边框、阴影等装饰效果 |

#### 3. 模块化开发
**文件**: `js/ui/LevelDisplay.js`
- 移除所有内嵌CSS样式
- 创建 `css/components/level-display.css` 独立样式文件

#### 4. 可调参数
```css
/* 卡片间距 */
.team-levels-bar { gap: 3px; }

/* 数字上下位置 */
.level-number { transform: translateY(-6px); }

/* 三角形大小 */
.indicator-triangle {
    border-left: 10px;
    border-right: 10px;
    border-bottom: 14px;
}

/* 卡片与三角形间距 */
.team-wrapper { gap: 2px; }
```

#### 5. 最终效果
```
┌───────────┐       ┌───────────┐
│   我方    │       │   对方    │  ← 橙色/蓝色头部
├───────────┤       ├───────────┤
│           │       │           │
│     2     │       │     2     │  ← 白色数字区
│           │       │           │
└───────────┘       └───────────┘
     △                     △      ← 独立三角形区域
  (橙色显示)            (隐藏)
```

---

## [更早的版本历史]
（省略旧版本记录）
