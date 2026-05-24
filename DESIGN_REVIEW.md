# 深渊引擎 Demo v0.1 评审（可直接复用项）

基于你提供的单文件 HTML/CSS/JS 原型，这一版**非常有价值**，并且已经具备继续做成「小丑牌-like」Web MVP 的基础。

## 可以直接复用（建议保留）

1. **UI 架构完整**
   - 左侧资源/日志、中间引擎与槽位、右侧模块区 + 拉杆区，已经形成清晰的游戏信息架构。
2. **交互主循环具备雏形**
   - `drawHand -> placeModule -> pullLever -> resolve -> finishRun` 的链路已经成型。
3. **模块系统可扩展**
   - `catalog` 数据驱动 + `apply/preview` 双函数模式很适合迭代平衡性。
4. **可视反馈优秀**
   - 压力表、倍率显示、日志、音效、震屏、toast 都已经有了玩家反馈闭环。

## 需要优先收敛的问题（避免后续维护成本爆炸）

1. **单文件过大**
   - CSS/JS 与结构耦合，后续难维护、难测试。
2. **数值系统偏硬编码**
   - 目标曲线、模块数值、风险阈值写死，后续平衡调参效率低。
3. **随机性不可复现**
   - 目前依赖 `Math.random()`，无法稳定复盘同一局。
4. **逻辑与渲染强耦合**
   - `state`、动画、结算混在一起，不利于加自动化测试。

## 建议的最小重构路线（不改玩法，只提可维护性）

1. 拆分文件：
   - `index.html`
   - `styles/main.css`
   - `src/constants.js`
   - `src/game-logic.js`
   - `src/ui.js`
   - `src/main.js`
2. 抽出纯逻辑层（无 DOM）：
   - `evaluateIgnitionSequence`
   - `applyIgnitionSequence`
   - `resolveModule`
   - `simulatePreview`
3. 加入 seed 随机：
   - 实现 `createRng(seed)`，替换 `Math.random()`。
4. 加 5~8 个最小单测（Vitest/Jest 任选）：
   - 点火序列判定
   - 过压/熔断/保险分支
   - 预览与结算一致性

## 结论

你的这版不是“废稿”，而是一个**可直接演进的高保真玩法原型**。建议下一步不要大改美术，而是先做「拆分 + 可复现 + 纯逻辑测试」，这样能最快把它变成可持续迭代的 MVP 基线。
