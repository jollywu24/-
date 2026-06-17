# 架构说明

## 总览

当前项目是一个无构建步骤的原生 Web 单页原型。

```text
index.html
  ├─ style.css
  ├─ game-content.js
  ├─ runtime-state.js
  ├─ round-rules.js
  ├─ animations.js
  ├─ game-dom.js
  ├─ logic-pure.js -> window.GameLogic
  └─ app.js        -> 浏览器运行时 IIFE
```

核心分层实际如下：

1. **集中内容定义层**：`web/game-content.js`
2. **可测试规则层**：`web/logic-pure.js`、`web/round-rules.js`
3. **运行时状态层**：`web/runtime-state.js`
4. **DOM 与通用动画工具层**：`web/game-dom.js`、`web/animations.js`
5. **流程编排层**：`web/app.js`
6. **结构与表现层**：`web/index.html`、`web/style.css` 与 `art/`
7. **测试层**：`web/tests/`

目前没有模块打包器、组件框架、状态管理库或资源管线。

## 运行入口

`web/index.html` 先加载内容、状态、回合规则、动画和 DOM 工具，再加载 `logic-pure.js` 与 `app.js`。

`logic-pure.js` 使用 IIFE 暴露 `window.GameLogic`，同时兼容 Node `module.exports`，因此测试可以直接加载同一份规则代码。

`app.js` 也是 IIFE。它读取各全局模块，通过 `GameDom` 获取 DOM 节点，初始化牌堆与状态，绑定事件并播放初始发牌动画。

当前分层仍不是严格边界：`logic-pure.js` 负责大部分单手计算，`round-rules.js` 负责纯回合判定，`app.js` 仍负责状态提交、商店流程和领域动画编排。

## 状态所有权

### `web/logic-pure.js`

无长期可变游戏状态。函数接收输入并返回计算结果。

主要输入：

- 已选牌。
- 当前上头值和红眼状态。
- 已拥有赌鬼。
- 当前红眼赌注。
- 暗涌牌。
- 可选 Boss 规则。

主要输出：

- 牌型和有效计分牌。
- 筹码、倍率和最终分数。
- 上头值变化与风险状态。
- 赌鬼触发结果。
- 倍率事件序列，供 UI 按顺序播放。

### `web/runtime-state.js` 与 `web/app.js`

`runtime-state.js` 创建并重置网页版本的统一 `state` 对象；`app.js` 在流程中提交其可变状态，包括：

- 牌堆、弃牌堆、手牌、选中牌。
- 当前分数、目标分数、赌资、轮次。
- 摊牌/换牌次数。
- 当前上头值和红眼状态。
- 红眼赌注解锁、选择和使用状态。
- 已拥有赌鬼及其层数。
- 商店报价和购买状态。
- 当前流程阶段与动画锁。

重要阶段值包括：

- `playing`
- `roundClear`
- `shop`
- `failed`

`settling` 用于阻止结算或动画期间重复输入。

### 关键数据流

```text
app.js 中的浏览器状态
  -> runState / previewFor 组装单手输入
  -> GameLogic.simulatePreview 计算单手结果
  -> app.js 播放结算演出
  -> app.js 提交分数、赌鬼层数、上头值和回合结果
```

`simulatePreview` 不直接修改浏览器运行时状态。`app.js` 根据返回结果决定何时提交状态。

## 核心流程

### 初始化

```text
init
  -> fitBoard
  -> drawInitialHand
  -> renderOwnedGhosts
  -> updateTilt
  -> bindEvents
  -> dealHandFromDeck
  -> unlockRedEyeIfNeeded
```

### 选牌预览

```text
点击手牌
  -> 更新 selectedIds
  -> updatePreview
  -> handOnlyPreview
  -> 更新左侧牌型、筹码、倍率
  -> 更新选中牌 Tips
```

该预览只展示基础牌型；摊牌时的单手计分与风险结果由 `simulatePreview` 计算。

### 摊牌结算

```text
showdown
  -> 收集选中牌
  -> 若有红眼赌注，从牌堆抽取暗涌牌并进入弃牌堆
  -> previewFor / GameLogic.simulatePreview
  -> animateCardsToTable
  -> animateSurgeReveal
  -> 播放牌型、单牌筹码、倍率事件
  -> animateTilt
  -> 检查爆牌
  -> 提交分数与补牌
  -> 检查过关或庄家通吃
```

失败优先级：

1. 上头值达到 `160`，触发爆牌。
2. 未爆牌时才提交本手分数。
3. 分数未达标且摊牌次数耗尽，触发庄家通吃。

### 红眼赌注职责分布

六种红眼赌注的定义和展示文案位于 `web/game-content.js`，效果落点如下：

| 赌注 | 当前主要实现位置 |
| --- | --- |
| `再押一手`、`红眼翻倍`、`借鬼钱` 的本手计分效果 | `web/logic-pure.js` 的 `applyRedEyeBet` |
| `借鬼钱` 的下一轮上头值代价 | `web/round-rules.js` 计算，`web/app.js` 提交 |
| `偷过线`、`翻庄`、`欠命` | `web/round-rules.js` 计算，`web/app.js` 编排流程 |
| 所有赌注触发的暗涌抽牌 | `web/app.js` 的 `showdown` |

### 通关、商店与下一轮

```text
达标
  -> calculateRoundReward
  -> showRoundClearOverlay
  -> 玩家领取收益
  -> 根据轮次降低上头值
  -> enterShopPhase
  -> 购买/重掷/跳过
  -> advanceRound
  -> 重置本轮红眼赌注
  -> 发新手牌
```

### 换牌

```text
discardSelectedCards
  -> 选中牌进入弃牌堆
  -> 从牌堆补牌
  -> 手牌排序
  -> 播放补牌动画
  -> 消耗一次换牌
```

## 规则计算顺序

`GameLogic.simulatePreview` 当前大致顺序如下。此流程只覆盖单手计分与风险计算，不覆盖通关奖励、商店和跨轮代价：

1. 识别牌型。
2. 识别实际计分牌。
3. 应用牌型基础筹码与倍率。
4. 应用通用赌鬼和红眼核心。
5. 逐张结算有效计分牌。
6. 应用红眼赌注与赌鬼修正。
7. 汇总上头值。普通摊牌汇总有效牌点数和牌型上头；红眼赌注生效时只取暗涌牌点数。
8. 再次应用红眼状态变化。
9. 检查爆牌保险和风险状态。
10. 返回最终分数、上头值和倍率事件。

详细数值规则见 [组件规则](docs/component_rules.md)，结算实现位置见 [结算目录](docs/scoring/README.md)。

## DOM 与布局

`web/index.html` 预先声明绝大多数长期 DOM：

- `.left-panel`
- `.joker-zone`
- `.table-zone`
- `.hand-zone`
- `.right-panel`
- `.shop-stage`
- `.red-eye-modal`
- `.round-clear-overlay`
- `.failure-overlay`
- `.art-vfx-layer`

运行时动态创建的主要元素：

- 手牌和出牌的克隆动画牌。
- 筹码飘字和倍率事件飘字。
- 暗涌牌揭示牌。
- 商店报价和赌鬼牌。

## 动画与资源

动画分为三类：

1. CSS class 和 `@keyframes` 驱动的短动画。
2. `app.js` 创建克隆 DOM，并通过坐标和 transition 播放的飞牌动画。
3. `art/vfx/` 透明 PNG 叠层，通过 `.art-vfx-layer` 播放。

动画通过 `wait`、`requestAnimationFrame` 和 class 切换串联。当前没有统一时间轴或动画控制器。

## 测试边界

当前 Node 测试覆盖：

- 牌型识别。
- 标准牌组。
- 上头值计算。
- 红眼阈值与倍率。
- 暗涌牌。
- 欠命救命和跨轮保底。
- 五张当前赌鬼。
- Boss 规则接口。
- 倍率事件顺序。
- 集中内容定义、运行时状态和纯回合规则。
- GitHub Pages artifact 的目录策略和关键运行时图片资源路径。

固定 seed 浏览器测试 `web/tests/browser-flow.test.mjs` 的用例已覆盖初始化、选牌、换牌、摊牌、同 seed 重载一致性、红眼赌注入口、通关结算、商店购买、商店进入下一轮、爆牌失败、庄家通吃和失败后重开。测试会自动查找 `CHROME_BIN`、Chrome 或 Edge，并使用独立 DevTools 端口连接浏览器。后续仍应继续扩充红眼不同赌注、Boss 盲注和多 seed 分支。

该浏览器测试在 `?debug=1` 下启用 `window.AbyssDebug`，只用于测试环境稳定设置目标分、上头值、剩余次数和选中手牌。正常游玩不会暴露该接口。

## Python CLI 原型

`src/jokermvp/` 是独立早期原型：

- 使用 Python 数据类和终端输入。
- 有自己的牌型数值、商店和 Joker。
- 不被网页引用。
- 规则数值与网页版本不同。

建议后续重构时明确将其标记为历史原型、测试工具或删除候选；当前不要把 Web 规则同步到该目录。

## 部署

`.github/workflows/deploy-pages.yml` 当前会先准备 `dist-pages/`，再上传该目录作为 Pages artifact。

发布 artifact 包含：

- `web/`
- `art/`
- `public/`

因此线上入口应使用 `/web/` 路径，例如 `https://<用户名>.github.io/<仓库名>/web/`。这样 `web/` 内的 `../art/` 和 `../public/assets/` 引用会指向同一个 Pages artifact 中的资源目录。

后续如果调整资源目录或改为构建产物，必须同步检查 `web/asset-map.js`、`web/style.css`、`web/index.html` 和发布工作流。

`web/tests/deploy-assets.test.mjs` 会保护当前发布策略：Pages artifact 必须包含 `web/`、`art/`、`public/`，并确认主要背景、牌背、红眼、上头眼睛和暗涌资源在仓库中存在。

## 建议后续重构边界

第一阶段已在 `web/` 下形成内容、状态、回合规则、DOM 和通用动画模块。后续可在测试继续补齐后逐步形成更完整的领域边界：

- `scoring`：纯结算规则和结果数据结构。
- `redEye`：红眼状态机与赌注生命周期。
- `surge`：暗涌抽牌、风险计算和演出编排。
- `jokers`：赌鬼定义、规则与显示文案。
- `animations`：统一动画调度和资源播放。

这些目录目前只包含说明文档，真实实现位置以各目录 README 为准。
