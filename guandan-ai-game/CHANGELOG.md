# 开发日志 (CHANGELOG)

## [2026-01-03] 提示系统优化

### 问题描述
提示系统优先级不正确，会拆对子/三张来出单张，而不是优先使用已有的单张牌。

**用户反馈示例**：
- 对方出单张3，手牌有7, 44 → 提示了4（拆了对子），应该提示7
- 对方出单张3，手牌有7, 4444 → 提示了4（拆了四张），应该提示7

### 修复内容

#### 1. 逻辑优化
**文件**: `index-modern.html` (第4764-4836行)

在 `findAllPossiblePlays` 函数中添加智能判断逻辑：

1. **检测可用单张**：检查是否有单张牌能管住上家的牌
2. **标记策略**：如果有可用单张，将以下牌标记为"已用于其他牌型"：
   - 对子(2张)：全部标记，不拆对子
   - 三张(3张)：标记2张，保留最后1张
   - 四张或更多：全部标记，不拆单张（全部保留给炸弹）

#### 2. 代码实现
```javascript
// 检查是否有单张能管住上家
let hasUsableSingle = false;
if (lastPlay && lastPlay.cards && lastPlay.cards.length === 1) {
    const lastType = this.rules.getCardType(lastPlay.cards);
    if (lastType && lastType.type === 'single') {
        const lastWeight = this.rules.getCardWeight(lastPlay.cards[0]);
        for (let rank in rankGroups) {
            if (rankGroups[rank].length === 1) {
                const weight = this.rules.getCardWeight(rankGroups[rank][0]);
                if (weight > lastWeight) {
                    hasUsableSingle = true;
                    break;
                }
            }
        }
    }
}

// 根据hasUsableSingle决定是否拆对子/三张/四张
if (count >= 4) {
    if (hasUsableSingle) {
        // 全部标记为已使用，不拆出单张
        rankGroups[rank].forEach(card =>
            usedInOtherTypes.add(card.id || `${card.rank}${card.suit}`)
        );
    }
    // ...
}
```

### 预期行为
| 场景 | 手牌 | 对方出牌 | 应提示 |
|------|------|----------|--------|
| 有单张 + 对子 | 7, 8, 9, 44 | 单张3 | 7（不拆44） |
| 有单张 + 四张 | 7, 4444 | 单张3 | 7（不拆4444） |
| 只有对子 | 44 | 单张3 | 4（必须拆对子） |
| 只有四张 | 4444 | 单张3 | 4（必须拆四张） |

### 待测试
- 刷新页面后测试各种场景是否符合预期

---

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
