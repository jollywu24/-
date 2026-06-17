# 结算

## 目录说明

本目录目前只用于说明结算领域。当前没有独立的 `scoring` 运行时代码目录，也没有移动任何实现。

## 当前实现位置

### 纯规则

`web/logic-pure.js`：

- `SEQUENCES`：牌型基础筹码、倍率、上头值和成长数值。
- `evaluateIgnitionSequence`：识别最佳牌型。
- `effectiveScoringCards`：确定实际参与单牌计分的牌。
- `sequenceAtLevel`：计算牌型等级成长。
- `applyIgnitionSequence`：应用牌型筹码与倍率。
- `simulatePreview`：执行单手计分与风险计算并返回结果。
- `recordMultiplierEvent`：记录倍率变化事件。

### 浏览器流程与表现

`web/app.js`：

- `handOnlyPreview` / `updatePreview`：选择手牌时的简化预览。
- `previewFor`：组装当前浏览器状态并调用单手规则计算。
- `showdown`：摊牌流程总编排。
- `animateCardChipScoring`：逐张展示有效计分牌筹码。
- `animateMultiplierSettlement`：按事件顺序展示倍率变化。
- `calculateRoundReward`：通关收益。
- `checkFailureAfterScoring`：按爆牌优先、庄家通吃次之判断失败。
- `canStealLineClear` / `calculateFlipDealerBonus`：处理依赖回合结果的红眼赌注。

`web/round-rules.js`：

- `checkFailureAfterScoring`：爆牌和庄家通吃的纯判定。
- `canStealLineClear` / `redEyeRoundCostOnClear` / `calculateFlipDealerBonus`：依赖回合结果的红眼赌注规则。
- `calculateRoundReward`：纯收益计算。

## 当前数据契约

`simulatePreview` 的关键返回值：

- `sequence`：当前牌型及等级数据。
- `scoringCardIds`：实际参与单牌计分的牌。
- `base`：最终筹码。
- `multiplier`：最终倍率。
- `profit`：`round(base * multiplier)`。
- `pressure`：结算后的上头值。
- `multiplierEvents`：供动画层按顺序播放的倍率事件。
- `riskText`：风险描述。

## 当前结算顺序

1. 识别牌型与实际计分牌。
2. 应用牌型基础筹码和倍率。
3. 应用赌鬼与红眼初始修正。
4. 逐张应用有效计分牌筹码。
5. 应用红眼赌注和暗涌相关修正。
6. 汇总上头值。
7. 处理红眼状态变化、保险与爆牌。
8. 生成最终分数和倍率事件。

普通摊牌仍按有效牌点数和牌型上头汇总风险；红眼赌注生效时，上头风险改为只取暗涌牌点数，不再叠加牌型上头。

此顺序不包括分数提交、失败判断、通关收益和跨轮代价；这些步骤由 `web/app.js` 在 `showdown` 中完成。

## 测试

当前测试位于 `web/tests/logic-pure.test.mjs`，覆盖牌型、有效计分牌、最终分数、上头值、红眼、暗涌、赌鬼和倍率事件顺序。

## 已知问题

- `handOnlyPreview` 是简化预览，不包含完整赌鬼、红眼赌注和暗涌结果。
- 单手计算、回合判定和动画编排分属两个文件，行为理解需要交叉阅读。
- `logic-pure.js` 中仍保留部分早期工业原型术语和规则接口。

## 建议后续重构

- 为结算输入和输出定义稳定的数据结构。
- 将规则结算与动画事件生成继续保持纯函数化。
- 在拆分前先为完整摊牌流程增加回归测试。
