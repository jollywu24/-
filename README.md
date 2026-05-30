# Joker-like MVP Demo

一个可运行的“小丑牌-like”最小演示：


## 运行

```bash
PYTHONPATH=src python -m jokermvp --seed 42
```

## Web MVP

可玩入口文件：`web/index.html`。

本地快速打开：

```bash
python -m http.server 8000
# 然后访问 http://localhost:8000/web/
```

可复现调试：

```text
http://localhost:8000/web/?seed=balance-42
```

发布为 GitHub Pages 的步骤见：`.github_pages.md`。

## 设计文档

当前有效设计文档统一收敛到 `docs/`：

- `docs/ui_spec.md`：主界面布局、固定画布、五区结构和受保护信息顺序。
- `docs/component_rules.md`：基础牌、牌型、赌鬼、上头值、红眼赌注、商店与 UI 修改规则。
- `docs/design_tokens.md`：颜色、材质、强度、字体和资源约束。
- `docs/decision_log.md`：核心设计决策、术语切换和当前 MVP 状态。
- `docs/changelog.md`：开发记录、UI 调整和后续建议。
