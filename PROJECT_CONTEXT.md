# 项目上下文

## 项目身份

《深渊赌局》是一个黑暗扑克肉鸽 Web 原型。当前目标是验证以下核心体验：

> 玩家明知道再贪一手可能爆牌，但仍想继续摊牌。

当前主产品是 `web/` 下的原生 HTML/CSS/JavaScript 原型。`src/jokermvp/` 是较早的 Python CLI 原型，不参与网页运行，也不应被视为当前玩法规则的唯一来源。

## 快速开始

项目没有构建步骤，也没有前端依赖管理器。

```bash
python3 -m http.server 8000
```

访问：

```text
http://localhost:8000/web/
http://localhost:8000/web/?seed=balance-42
```

验证：

```bash
node --check web/app.js
node --test web/tests/logic-pure.test.mjs web/tests/architecture-modules.test.mjs
node --test web/tests/browser-flow.test.mjs
git diff --check
```

浏览器流程测试需要本机存在 `google-chrome`，并允许启动本地 HTTP 服务与无头浏览器。

## 当前目录角色

| 路径 | 当前角色 |
| --- | --- |
| `web/index.html` | 固定 `1600 x 900` 游戏画布和全部常驻/弹窗 DOM 结构 |
| `web/style.css` | 全部布局、视觉状态、交互状态和动画关键帧 |
| `web/app.js` | DOM 渲染、输入事件、流程编排、商店和领域动画编排 |
| `web/game-content.js` | 红眼赌注、赌鬼、卡包和赌鬼展示说明的集中定义 |
| `web/runtime-state.js` | 浏览器运行时状态的初始化、商店状态和重置 |
| `web/round-rules.js` | 不依赖 DOM 的胜负、红眼跨轮代价和收益规则 |
| `web/animations.js` | 通用等待、数值动画、脉冲 class 和美术 VFX 工具 |
| `web/game-dom.js` | 主页面 DOM 节点的集中查询 |
| `web/logic-pure.js` | 可在浏览器和 Node 中运行的纯规则计算核心 |
| `web/tests/` | 单手规则、架构模块和固定 seed 浏览器流程测试 |
| `art/` | 主界面参考图、商店图和运行时 VFX 图片资源 |
| `docs/` | 当前设计规范、决策记录以及架构概念说明 |
| `src/jokermvp/` | 独立的早期 Python CLI 原型，规则和数值与 Web 版本不同 |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 发布流程 |

## 当前产品边界

主游玩界面固定为五个常驻区域：

1. 左侧信息栏。
2. 顶部赌鬼区。
3. 中央出牌区。
4. 底部手牌区。
5. 右侧操作区。

非常驻流程包括：

- 红眼赌注选择弹窗。
- 通关收益结算弹窗。
- 商店阶段。
- 爆牌或庄家通吃失败弹窗。

不要把它改造成响应式网站。画布始终按 `1600 x 900` 整体等比缩放。

## 当前核心规则来源

单手牌型、计分和上头值计算以 `web/logic-pure.js` 和对应测试为准：

- 标准 52 张牌。
- 手牌 8 张，最多选择 5 张摊牌。
- 标准牌型识别和有效计分牌识别。
- 筹码、倍率、上头值和最终分数计算。
- 红眼 `100` 进入、`80` 或以下退出。
- 上头值达到 `160` 爆牌。
- 普通/精英/Boss 过关分别降低 `25/35/50` 上头值。
- 暗涌牌、红眼倍率和当前五张赌鬼的单手规则。

`web/app.js` 决定规则如何进入实际游戏流程、DOM 和演出。目标分、次数与赌资仍由统一 `state` 持有；纯回合判定已提取到 `web/round-rules.js`，由 `app.js` 提交结果：

- 目标分、摊牌/换牌次数和赌资。
- `偷过线`、`翻庄`、`欠命` 等依赖回合结果的红眼赌注效果。
- 通关收益、商店购买、过关减压、下一轮上头值代价。
- 爆牌和庄家通吃的失败流程。

因此当前没有一份文件单独构成“全部玩法逻辑”；理解完整回合主要阅读 `web/logic-pure.js`、`web/round-rules.js` 和 `web/app.js`。

## 术语映射

玩家可见术语固定使用：

- 赌鬼
- 上头值
- 红眼
- 鬼压桌
- 红眼赌注
- 摊牌
- 换牌

代码中仍存在早期内部术语，例如 `pressure`、`module`、`redline`、`ignitionSequence`。这些是历史命名，不代表玩家可见文案。建议后续重构时统一，但当前不要为改名而改名。

## 修改原则

- 不移动左侧信息栏，不改变其信息顺序。
- 不增加主界面常驻面板。
- 红眼赌注选项只在触发时显示。
- 规则修改优先落在 `web/logic-pure.js` 并补测试。
- UI 和流程修改主要落在 `web/app.js`、`web/index.html`、`web/style.css`。
- 动画和美术资源不能阻塞玩法逻辑，资源加载失败时应允许现有流程继续。
- 当前工作区可能存在未提交修改，不要回退与任务无关的变更。

## 已知文档偏差

部分历史文档仍包含旧状态，应以当前代码和测试为准：

- `docs/component_rules.md` 仍记录了当前代码未应用的部分红眼赌注固定上头代价。
- `docs/decision_log.md` 对商店接入状态的描述早于当前实现。
- `docs/design_tokens.md` 仍写着禁止外部图片，但当前项目已经接入 `art/` 图片资源。

这些偏差只在此记录，本次架构整理不修改历史文档。

## 进一步阅读

- [架构说明](ARCHITECTURE.md)
- [任务清单](TASKS.md)
- [结算说明](docs/scoring/README.md)
- [红眼说明](docs/redEye/README.md)
- [暗涌说明](docs/surge/README.md)
- [赌鬼说明](docs/jokers/README.md)
- [动画说明](docs/animations/README.md)
