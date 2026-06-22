# 深渊赌局 MVP Demo

这是一个可运行的黑暗扑克肉鸽 Web 原型。

当前目标不是完整商业版本，而是验证核心体验：

> 玩家明知道再贪一手可能爆牌，但还是想继续摊牌。

## 网页原型

可玩入口：

```text
web/index.html
```

本地快速运行：

```bash
python -m http.server 8000
```

然后访问：

```text
http://localhost:8000/web/
```

可复现调试：

```text
http://localhost:8000/web/?seed=balance-42
```

公开试玩反馈：

```text
https://github.com/jollywu24/-/issues/new?template=playtest_feedback.yml
```

反馈说明页：

```text
http://localhost:8000/web/feedback.html
```

## 当前核心内容

- 固定 `1600 x 900` 游戏画布，整体等比缩放。
- 标准 52 张牌组，点数为 `2-10 / J / Q / K / A`。
- 8 张手牌，最多选择 5 张摊牌。
- 真实抽牌堆和弃牌堆。
- 基础扑克牌型识别。
- 目标分数、摊牌次数、换牌次数。
- 上头值、红眼区、红眼赌注。
- 上头值达到 `100` 进入红眼，红眼时本手倍率 `×1.5`；降至 `80` 或以下退出红眼。
- 上头值最大为 `160`，达到 `160` 立即爆牌失败。
- 普通关、精英关、Boss 关过关后分别降低 `25`、`35`、`50` 上头值。
- 通关结算后进入商店，可购买赌鬼、刷新赌鬼、购买卡包入口或降压道具，并进入下一局。
- 摊牌次数耗尽且未达标时，庄家通吃失败。
- 公开试玩反馈通过 GitHub Issue Form 收集，覆盖版本信息、玩法理解、红眼使用、重开欲望和愿望单意愿。

## 有效设计文档

当前有效设计文档统一放在 `docs/`。文档职责如下：

- `PROJECT_CONTEXT.md`：新对话接手项目的全局入口，包含目录职责、改动导航和验证命令。
- `ARCHITECTURE.md`：实现分层、状态流、流程边界和测试边界。
- `docs/ui_spec.md`：主界面布局、固定画布、五区结构和受保护信息顺序。
- `docs/component_rules.md`：当前玩法和 UI 规则的主要事实来源。
- `docs/design_tokens.md`：颜色、材质、强度、字体和资源约束。
- `docs/decision_log.md`：核心设计决策和原因，不作为最新功能清单。
- `docs/changelog.md`：开发记录，不作为最新规则来源。

`docs/scoring/`、`docs/redEye/`、`docs/surge/`、`docs/jokers/`、`docs/animations/` 是领域说明，描述当前实现位置和维护注意事项。若数值规则冲突，以 `docs/component_rules.md` 和对应测试为准。

## 语言约定

除非另有特殊说明，后续文档、说明和面向用户的回复默认使用中文。

代码标识符、命令、文件名、API 名称和必要的英文专有名词可以保留英文。
