# 赌鬼

## 目录说明

本目录目前只用于说明赌鬼领域。赌鬼商品与展示定义已集中到 `web/game-content.js`，实际规则位于 `web/logic-pure.js`，状态提交与 UI 位于 `web/app.js`。

## 当前五张赌鬼

| 赌鬼 | 当前规则 |
| --- | --- |
| 血丝眼镜 | 普通状态结算额外增加上头值；进入红眼叠加血丝，提高红眼基础倍率 |
| 红眼借据 | 使用红眼赌注时额外提高倍率，暗涌后额外增加上头值 |
| 小牌壮胆 | 低点数暗涌牌为本手增加倍率 |
| 烂命保险 | 红眼状态下拦截一次爆牌，设置上头值为 `120`，随后摧毁并封锁本轮赌注 |
| 戒断反弹 | 退出红眼叠加戒断，下次进入红眼后强化第一次红眼赌注 |

## 当前实现位置

### 商店和展示定义

`web/game-content.js`：

- `GHOSTS` / `GHOST_RULES`：名称、价格、短效果、星级、稀有度、画像、规则 ID、关键规则参数、说明和术语解释。
- `ghostEffect` / `ghostDescription` / `ghostRarityLabel`：动态展示说明。

`web/app.js`：

- `renderOwnedGhosts`：顶部持有赌鬼牌。
- `renderShopGhostOffers` / `buyShopGhost`：商店展示与购买。
- `bloodshotStacks` / `withdrawalStacks` / `pendingWithdrawalBonusStacks`：部分赌鬼运行时层数。

### 纯规则

`web/logic-pure.js`：

- `RED_EYE_GHOSTS`：当前五张赌鬼的规则 ID。
- `applyRedHeatCore`：血丝眼镜和红眼进入相关触发。
- `applyRedEyeBet`：红眼借据、小牌壮胆、戒断反弹。
- `handlePressureLimit`：烂命保险。
- `applySimpleJokers`：早期通用 Joker 接口，包含部分当前 UI 未使用的历史规则。

### 状态提交

`simulatePreview` 返回血丝、戒断消费和保险触发结果；`web/app.js` 再通过 `updateTilt`、`commitRedEyeGhostResults` 等函数提交浏览器中的持久状态。赌鬼规则不是由单一状态对象统一管理。

## 当前触发与表现

规则核心通过 `multiplierEvents` 返回倍率变化来源。`web/app.js` 根据 `sourceType` 和 `jokerId` 找到顶部赌鬼牌，播放触发动画与倍率飘字。

顶部持有赌鬼牌默认只显示画像，选中后显示详情 Tips。商店赌鬼牌同样默认只显示画像，选中后显示 Tips 与购买按钮。

## 已知问题

- 同一张赌鬼的信息分散在商品数据、动态文案、术语解释和规则核心中。
- `jokerId`、商品 `id` 和 DOM `data-ghost` 是三套相关标识。
- `applySimpleJokers` 中存在早期原型规则，当前商店不会提供这些赌鬼。
- 血丝、戒断和待爆发层数位于统一 `state` 对象，但仍由 `app.js` 分散提交。

## 建议后续重构

- 建立单一赌鬼注册表，统一 ID、规则、价格和展示字段。
- 将运行时层数放入统一赌鬼状态对象。
- 明确区分“当前正式赌鬼”和“历史/测试用 Joker”。
