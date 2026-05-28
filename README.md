# Joker-like MVP Demo

一个可运行的“小丑牌-like”最小演示：
- 3个 Ante 回合目标
- 每回合从 8 张手牌中选 5 张结算牌型
- Joker 提供 chips/mult 加成
- 回合后进入商店购买 Joker

## 运行

```bash
PYTHONPATH=src python -m jokermvp --seed 42
```


## 设计评审

已新增 `DESIGN_REVIEW.md`，总结了你提供的 Web 原型里可复用部分与最小重构路线。


## Web MVP（GitHub Pages）

已提供无美术版可玩网页 MVP：`web/index.html`。

本地快速打开：
```bash
python -m http.server 8000
# 然后访问 http://localhost:8000/web/
```

发布为 GitHub 可访问链接的步骤见：`.github_pages.md`。


## 一键自动发布（GitHub Pages）

仓库已包含工作流：`.github/workflows/deploy-pages.yml`。

发布方法：
1. 把默认分支设为 `main`（或把工作流里的分支名改成你的默认分支）。
2. 在 GitHub 仓库 Settings → Pages，把 **Source** 设为 **GitHub Actions**。
3. 合并到 `main` 后，Actions 会自动发布 `web/` 目录。
4. 链接格式通常是：`https://<你的用户名>.github.io/<仓库名>/`。


## MVP 资源宪法

已新增 `DESIGN_RULES.md`，定义四资源（Power/Multiplier/Pressure/Credits）、统一结算顺序与复杂度隔离分层。

## 最新设计文档

- `DESIGN_NOTES_FROM_SHARE.md`：从分享对话沉淀出的设计要点。
- `BALATRO_HAND_SYSTEM.md`：Balatro 牌型系统拆解和当前照抄规则。
- `BALATRO_FULL_DESIGN_BREAKDOWN.md`：完整拆解 Balatro 设计框架，并记录本项目当前核心循环落地。
- `MVP_PLAN.md`：当前 MVP 优先级、验收标准和暂不做范围。
