# 红眼

## 目录说明

本目录目前只用于说明红眼领域。当前红眼代码分布在规则核心、浏览器流程、样式和美术资源中。

## 当前实现位置

### 纯规则

`web/logic-pure.js`：

- `TILT_RULES`：最大上头值、红眼进入/退出阈值、基础倍率和过关减压。
- `updateRedEyeState`：带迟滞的红眼状态判断。
- `applyRedHeatCore`：进入红眼后的倍率与赌鬼触发。
- `applyRedEyeBet`：应用 `再押一手`、`红眼翻倍`、`借鬼钱` 的本手计分效果，以及相关赌鬼修正。
- `redEyeHypePreview`：暗涌风险范围。
- `tiltReliefForRound`：不同轮次的过关减压。

### 浏览器状态与流程

`web/app.js`：

- `currentTilt` / `redEyeActive`：当前上头值和红眼状态。
- `activeRedEyeBet` / `redEyeUnlocked` / `redEyeUsedThisRound`：赌注生命周期。
- `updateTilt` / `animateTilt`：更新数值、状态 class 和演出。
- `renderRedEyeOptions` / `openRedEyeModal`：红眼赌注选择。
- `showRedEyeStatus` / `consumeActiveRedEyeBetAfterShowdown` / `resetRedEyeForNextRound`：赌注状态流转。
- `checkFailureAfterScoring`：爆牌优先级。
- `canStealLineClear` / `applyRedEyeRoundCostOnClear` / `calculateFlipDealerBonus`：依赖回合结果和跨轮状态的赌注效果。

### 集中定义与回合规则

- `web/game-content.js`：六种红眼赌注的 ID、名称、图标、展示文案和关键规则参数。
- `web/round-rules.js`：偷过线、借鬼钱、翻庄、欠命涉及的纯回合判定。
- `web/runtime-state.js`：红眼赌注生命周期相关状态的初始值与重置。

### UI 与演出

- `web/index.html`：右侧入口、红眼弹窗、全局 VFX 层。
- `web/style.css`：`normal`、`preheat`、`red-eye`、`critical`、`betting`、`bust` 等状态表现。
- `art/vfx/red-eye-awakening.png`：进入红眼演出资源。
- `art/vfx/red-eye-wager-seal.png`：选择红眼赌注演出资源。

## 当前状态规则

- 最大上头值：`160`。
- 达到 `100`：进入红眼。
- 已在红眼时降至 `80` 或以下：退出红眼。
- 红眼基础倍率：`×1.5`。
- 达到 `160`：爆牌失败。
- 普通/精英/Boss 过关减压：`25/35/50`。

## 红眼赌注生命周期

```text
未解锁
  -> 进入红眼后解锁
  -> 点击入口打开候选弹窗
  -> 选择一个赌注
  -> 下一次摊牌生效
  -> 若本关继续，摊牌后标记本轮已使用
  -> 下一轮重置
```

当前六种赌注定义位于 `web/game-content.js`。其中本手计分效果位于 `web/logic-pure.js`，回合判定位于 `web/round-rules.js`，状态提交与表现仍由 `web/app.js` 负责。

红眼赌注生效时，本手上头值不再叠加牌型上头，也不再叠加实际计分牌点数。当前只翻 1 张 `暗涌牌`，并以该暗涌牌点数作为本手红眼风险。`J/Q/K = 10`，`A = 11`。

`欠命` 的救命规则：

- 本手不会爆牌。
- 如果本手本应爆牌，结算上头设为 `120`。
- 只有在确实救下爆牌后，才会登记下一轮上头至少为 `90`；如果当前赌局随后失败，则没有下一轮可生效。
- 仍然会翻 1 张暗涌牌。

## 已知问题

- 红眼赌注定义、规则效果、跨轮效果和展示文案分散在多个位置。
- `logic-pure.js` 内部仍使用 `pressure`、`redline` 等历史术语。
- 红眼动画由多个 class、定时器和美术资源共同驱动，没有统一调度器。

## 建议后续重构

- 建立单一红眼赌注定义表，包含规则、跨轮代价和展示文案。
- 将红眼状态机与 DOM 表现解耦。
- 为解锁、选择、消费、跨轮重置和爆牌优先级增加流程测试。
