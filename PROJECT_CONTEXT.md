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
node --check web/logic-pure.js
node --check web/round-rules.js
node --test web/tests/logic-pure.test.mjs web/tests/architecture-modules.test.mjs web/tests/deploy-assets.test.mjs
git diff --check
```

浏览器流程测试位于 `web/tests/browser-flow.test.mjs`。它会自动查找 `CHROME_BIN`、Chrome 或 Edge，并允许启动本地 HTTP 服务与无头浏览器；在 Codex 桌面沙箱中可能因为子进程/浏览器启动限制失败，应结合本机环境判断。

浏览器流程测试会在 `?debug=1` 下启用 `window.AbyssDebug`，用于把局面稳定推进到红眼、通关、商店和失败分支。正常游玩 URL 不会暴露该调试接口。

## 新对话阅读顺序

任意新对话接手项目时，不需要从代码重头读起。先按这个顺序建立全局理解：

1. 读本文件，确认项目边界、目录职责、改动导航和验证命令。
2. 读 `docs/component_rules.md`，确认当前玩法、UI、经济、红眼和上头值规则。
3. 如果要改流程或状态流，再读 `ARCHITECTURE.md`。
4. 如果只改某个领域，按下方“改动导航”进入对应领域 README 和代码位置。
5. 最后只读改动表指向的相关代码文件，不要为了小改动全量扫代码。

文档定位原则：

- “现在规则是什么”优先看 `docs/component_rules.md`。
- “为什么这么设计”看 `docs/decision_log.md`。
- “最近改过什么”看 `docs/changelog.md`，但它不是当前规则来源。
- “该改哪个代码文件、同步哪个文档”看本文件的“改动导航”。

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
| `docs/` | 当前规则、UI 规范、设计令牌、决策记录、历史变更和领域说明 |
| `src/jokermvp/` | 独立的早期 Python CLI 原型，规则和数值与 Web 版本不同 |
| `.github/workflows/deploy-pages.yml` | GitHub Pages 发布流程 |

## 改动导航

如果只想快速定位修改点，先看这张表：

| 要改的内容 | 先读 | 主要改动位置 | 同步文档 |
| --- | --- | --- | --- |
| 牌型、有效牌、筹码、倍率、普通上头 | `docs/component_rules.md`、`docs/scoring/README.md` | `web/logic-pure.js`、`web/tests/logic-pure.test.mjs` | `docs/component_rules.md`、`docs/scoring/README.md` |
| 红眼阈值、红眼倍率、暗涌、红眼赌注本手效果 | `docs/component_rules.md`、`docs/redEye/README.md`、`docs/surge/README.md` | `web/logic-pure.js`、`web/game-content.js`、`web/app.js` | `docs/component_rules.md`、`docs/redEye/README.md`、`docs/surge/README.md` |
| 欠命、偷过线、翻庄、跨轮上头债务 | `docs/component_rules.md`、`docs/scoring/README.md` | `web/round-rules.js`、`web/app.js`、`web/tests/architecture-modules.test.mjs` | `docs/component_rules.md`、`docs/scoring/README.md` |
| 发牌、摊牌、换牌、牌堆/弃牌堆流程 | `ARCHITECTURE.md` | `web/app.js`、`web/runtime-state.js`、`web/tests/browser-flow.test.mjs` | `ARCHITECTURE.md`、`docs/component_rules.md` |
| 商店、赌鬼商品、卡包入口、刷新 | `docs/component_rules.md`、`docs/jokers/README.md` | `web/app.js`、`web/game-content.js`、`web/runtime-state.js` | `docs/component_rules.md`、`docs/jokers/README.md` |
| Boss 盲注负面规则 | `ARCHITECTURE.md`、`docs/component_rules.md` | `web/logic-pure.js` 的 `bossRule` 接口，后续 UI 在 `web/app.js` | `ARCHITECTURE.md`、`docs/component_rules.md` |
| 主界面布局、左侧顺序、弹窗层级 | `docs/ui_spec.md` | `web/index.html`、`web/style.css`、`web/app.js` | `docs/ui_spec.md` |
| 视觉令牌、美术资源、发光强度 | `docs/design_tokens.md` | `web/style.css`、`web/asset-map.js`、`public/assets/`、`art/` | `docs/design_tokens.md`、`public/assets/manifest/ASSET_MANIFEST.md` |
| 自动化测试、部署检查和 QA 覆盖 | `TASKS.md`、`ARCHITECTURE.md`、`docs/launch_goal.md` | `web/tests/` | `TASKS.md`、`ARCHITECTURE.md`、`docs/launch_goal.md` |
| 上线 MVP、Steam 愿望单材料、发布 QA | `docs/launch_goal.md` | `.github/workflows/deploy-pages.yml`、`web/tests/`、发布素材 | `docs/launch_goal.md`、`TASKS.md`、`ARCHITECTURE.md` |

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
- 普通摊牌按有效牌点数和牌型上头增加上头值。
- 红眼赌注生效时，上头风险只取暗涌牌点数，不再叠加有效牌点数或牌型上头。
- 暗涌牌、红眼倍率、欠命救命和当前五张赌鬼的单手规则。

`web/app.js` 决定规则如何进入实际游戏流程、DOM 和演出。目标分、次数与赌资仍由统一 `state` 持有；纯回合判定已提取到 `web/round-rules.js`，由 `app.js` 提交结果：

- 目标分、摊牌/换牌次数和赌资。
- `偷过线`、`翻庄`、`欠命` 等依赖回合结果的红眼赌注效果。
- 通关收益、商店购买、过关减压、下一轮上头值代价。
- 爆牌和庄家通吃的失败流程。

因此当前没有一份代码文件单独构成“全部玩法逻辑”。日常接手先用本文件和 `docs/component_rules.md` 建立地图，再按“改动导航”只阅读相关代码：单手规则主要在 `web/logic-pure.js`，回合判定主要在 `web/round-rules.js`，实际 UI 流程主要在 `web/app.js`。

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

## 固定维护流程

改完代码后按以下顺序收尾：

1. 判断是否改变了规则、流程、UI 约束、资源路径或测试方式。
2. 如果改变了，按“改动导航”同步对应文档；如果没有改变，也在交付说明中写明“文档无需更新”。
3. 规则变更至少跑 `logic-pure.test.mjs` 和 `architecture-modules.test.mjs`。
4. UI 或流程变更优先补固定 seed 浏览器测试；若当前环境无法跑浏览器测试，要在交付说明中记录原因。
5. 最终说明里列出：代码改了什么、文档改了什么、验证跑了什么。

## 文档职责

为了避免规则散落，当前文档按以下职责维护：

- `docs/component_rules.md`：当前玩法、UI 和经济规则的主要事实来源。
- `docs/ui_spec.md`：布局与主界面保护规则。
- `docs/design_tokens.md`：视觉令牌、资源使用和表现强度。
- `docs/decision_log.md`：为什么这样设计，避免写成最新功能清单。
- `docs/changelog.md`：按时间记录变更，不作为当前规则来源。
- 领域目录 README：说明实现位置、边界和后续维护风险。

代码改动若改变规则、流程、UI 约束、资源路径或测试方式，必须同步更新对应文档，并在交付说明里写明更新了哪些文档。若只是纯重构且行为不变，也要确认文档无需更新。

## 进一步阅读

- [架构说明](ARCHITECTURE.md)
- [任务清单](TASKS.md)
- [上线 MVP 目标](docs/launch_goal.md)
- [结算说明](docs/scoring/README.md)
- [红眼说明](docs/redEye/README.md)
- [暗涌说明](docs/surge/README.md)
- [赌鬼说明](docs/jokers/README.md)
- [动画说明](docs/animations/README.md)
