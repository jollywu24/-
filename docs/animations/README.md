# 动画

## 目录说明

本目录目前只用于说明动画领域。通用动画工具位于 `web/animations.js`，领域动画编排主要集中在 `web/app.js` 和 `web/style.css`，美术资源位于 `art/vfx/`。

## 当前动画类型

### CSS 状态动画

通过添加 class 触发 transition 或 `@keyframes`：

- 手牌选中与筹码闪动。
- 红眼进入、退出、临界和爆牌。
- 赌鬼触发。
- 商店选中状态。
- 全局红色闪光。
- 红眼美术 VFX。

通用触发函数：

- `pulseElement`
- `playArtVfx`
- `animateValue`
- `animateTextNumber`

### 克隆 DOM 飞行动画

`web/app.js` 创建临时 DOM 克隆承载运动：

- `makeFlyingCard`
- `makeFlyingDrawCard`
- `animateCardsToTable`
- `animateDiscardedCards`
- `animateDrawnCardsFromDeck`
- `clearPlayedCardsAfterScore`

真实手牌负责最终状态，克隆牌负责飞行，避免收尾跳动。

### 数字和结算动画

- `animateNumber`
- `animateMultiplierNumber`
- `animateMoney`
- `animateMultiplierSettlement`
- `animateRoundRewardRows`

### 暗涌和红眼动画

- `animateSurgeReveal`
- `playRedEyeEntryAnimation`
- `playRedEyeExitAnimation`
- `animateBustCard`
- `animateHouseTakes`

## 美术资源

当前运行时 VFX：

- `art/vfx/red-eye-awakening.png`
- `art/vfx/red-eye-wager-seal.png`

它们通过 `web/index.html` 中的 `.art-vfx-layer` 加载，由 `playArtVfx` 触发。资源层设置为 `pointer-events: none`，资源加载失败时不阻塞游戏流程。

## 当前时序方式

动画编排主要使用：

- `requestAnimationFrame`
- `window.setTimeout`
- `wait(ms)`
- CSS transition
- CSS animation

`settling` 用于动画和结算期间锁定主要输入。

`settling` 只是输入锁，不是动画任务管理器：当前动画开始后没有统一取消、跳过或回滚接口。

## 已知问题

- 动画时长散落在 CSS 和 JavaScript 中。
- 多个定时器没有统一取消机制。
- 临时 DOM 和 class 依赖各流程自行清理。
- 动画行为没有自动化测试。
- GitHub Pages 当前只发布 `web/`，可能缺失 `art/vfx/` 资源。
- 动画时序与 `showdown`、换牌和阶段切换直接串联，调整等待时间可能影响流程提交时机。

## 建议后续重构

- 建立统一、可取消的动画调度器。
- 集中维护动画时长和资源清单。
- 为阶段切换、重开和资源加载失败增加清理验证。
- 将关键演出和玩法状态分离，确保动画调整不改变结算逻辑。
