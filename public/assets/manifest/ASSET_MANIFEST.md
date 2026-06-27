# 美术资源清单

本清单用于约束《深渊赌局》的低耦合美术接入。图片只负责氛围、材质、插图、牌背和特效；数值、文字、点击区域、状态与结算逻辑继续由 Web 元素和 JavaScript 控制。

当前已生成并接入：

- `art/shop.png` 商店阶段环境背景；
- `stress-eye/` 四个上头阶段眼睛主体；
- `red-eye/` 四个红眼赌注入口状态底板；
- `surge/` 暗涌牌背、未知牌背、牌面模板和翻牌辉光。
- `cards/deck_back.png` 普通牌堆卡背。

这些资源由项目现有红眼原画派生，确保与当前黑暗赌桌、暗金、暗红视觉方向一致。

## art/shop.png / 商店阶段背景

用途：
- 通关后商店阶段的整屏环境底图。

使用位置：
- `web/style.css` 的 `--shop-art` 与 `.game-board.shop-phase::before`。
- `.shop-frame`、`.shop-actions` 与 `.shop-shelves` 保持透明，使图片柜体成为实际商店装饰层。

可替换性：
- 中。

替换注意：
- 保持 `1600 x 900` 和 `16:9`；
- 不包含文字、价格、按钮、卡牌、赌鬼人物或固定商品；
- 左侧信息栏、中央商品区和右侧操作区保留低对比留白；
- 动态商品、交互与状态继续由 DOM 和 JavaScript 控制。

## red-eye / 红眼赌注资源

### red_eye_inactive.png

用途：
- 右侧红眼赌注入口的未激活底板。

使用位置：
- `web/index.html` 的 `.red-eye-entry`
- `web/app.js`

可替换性：
- 高

替换注意：
- 保持约 `250:185` 比例；
- 不要写入“红眼赌注”、状态文字或具体数值；
- 不要改变点击区域。

### red_eye_active.png

用途：
- 红眼已激活、已解锁或已选择时的入口底板。

使用位置：
- `web/index.html` 的 `.red-eye-entry`
- `web/app.js`

可替换性：
- 高

替换注意：
- 保持与未激活底板相同尺寸比例；
- 中心区域应给动态文字留出可读空间。

### red_eye_trigger.png

用途：
- 暗涌翻牌触发期间的红眼入口底板。

使用位置：
- `web/app.js` 的暗涌翻牌表现。

可替换性：
- 高

替换注意：
- 不要写入暗涌点数；
- 不要改变入口尺寸。

### red_eye_burst.png

用途：
- 红眼结算或危险瞬间的短暂爆发底板。

使用位置：
- `web/app.js` 的红眼结算表现。

可替换性：
- 高

替换注意：
- 只作为短暂状态，不应长期遮挡文字。

## stress-eye / 左侧上头眼睛资源

### stress_eye_cold.png

用途：
- 冷手阶段的眼睛主体。

使用位置：
- `web/index.html` 的 `.eye-meter`
- `web/app.js`

可替换性：
- 高

替换注意：
- 使用透明背景；
- 保持正方形比例；
- 不要写入刻度、阶段名称和上头值。

### stress_eye_hot.png

用途：
- 热手阶段的眼睛主体。

使用位置：
- `web/index.html` 的 `.eye-meter`
- `web/app.js`

可替换性：
- 高

替换注意：
- 与其他眼睛状态保持相同构图和视线中心。

### stress_eye_red.png

用途：
- 红眼阶段的眼睛主体。

使用位置：
- `web/index.html` 的 `.eye-meter`
- `web/app.js`

可替换性：
- 高

替换注意：
- 发光应克制，避免盖过指针和刻度。

### stress_eye_overload.png

用途：
- 鬼压桌阶段的眼睛主体。

使用位置：
- `web/index.html` 的 `.eye-meter`
- `web/app.js`

可替换性：
- 高

替换注意：
- 与爆牌失败表现区分，不要表现成已经失败。

## surge / 暗涌牌资源

### surge_card_back.png

用途：
- 暗涌牌翻开前的牌背。

使用位置：
- `web/surge-card-view.js`

可替换性：
- 高

替换注意：
- 保持扑克牌纵向比例；
- 翻开前不能泄露点数或花色。

### surge_card_face_template.png

用途：
- 暗涌牌翻开后的牌面材质模板。

使用位置：
- `web/surge-card-view.js`

可替换性：
- 中

替换注意：
- 不要写入具体点数、花色或上头值；
- 给 Web 动态文字保留清晰区域。

### surge_reveal_glow.png

用途：
- 暗涌牌翻开瞬间的短暂辉光。

使用位置：
- `web/surge-card-view.js`

可替换性：
- 高

替换注意：
- 使用透明背景；
- 不要长期遮挡牌面。

### surge_unknown_back.png

用途：
- 尚未揭示暗涌信息时的备用牌背。

使用位置：
- `web/surge-card-view.js`

可替换性：
- 高

替换注意：
- 不包含具体数值。

## joker / 赌鬼牌资源

### ghost_bloodshot_glasses.jpg

用途：
- `血丝眼镜` 赌鬼牌头像。

规格：
- `512 x 768`，JPG。

使用位置：
- 顶部赌鬼区和商店赌鬼卡。

### ghost_red_eye_iou.jpg

用途：
- `红眼借据` 赌鬼牌头像。

规格：
- `512 x 768`，JPG。

使用位置：
- 顶部赌鬼区和商店赌鬼卡。

### ghost_small_card_courage.jpg

用途：
- `小牌壮胆` 赌鬼牌头像。

规格：
- `512 x 768`，JPG。

使用位置：
- 顶部赌鬼区和商店赌鬼卡。

### ghost_rotten_life_insurance.jpg

用途：
- `烂命保险` 赌鬼牌头像。

规格：
- `512 x 768`，JPG。

使用位置：
- 顶部赌鬼区和商店赌鬼卡。

### ghost_withdrawal_rebound.jpg

用途：
- `戒断反弹` 赌鬼牌头像。

规格：
- `512 x 768`，JPG。

使用位置：
- 顶部赌鬼区和商店赌鬼卡。

### joker_frame.png

用途：
- 赌鬼牌通用卡框。

使用位置：
- 预留给顶部赌鬼区。

可替换性：
- 中

替换注意：
- 名称、效果描述、星级和稀有度必须继续由 Web 渲染。

### joker_portrait_fallback.png

用途：
- 赌鬼插图缺失时的通用占位图。

使用位置：
- 预留给顶部赌鬼区。

可替换性：
- 高

替换注意：
- 不包含赌鬼名称和效果文字。

## cards / 普通扑克牌资源

### deck_back.png

用途：
- 普通牌堆的通用牌背。

使用位置：
- `web/index.html` 的右侧牌堆
- `web/app.js` 的右侧牌堆挂载和抽牌进入手牌的飞行卡背

可替换性：
- 高

替换注意：
- 剩余牌数继续由 Web 文本显示；
- 不改变牌堆点击区域。

## fx / 特效资源

### red_beam.png

用途：
- 红眼相关能量流或瞬时光束。

使用位置：
- 预留给通用特效层。

可替换性：
- 高

替换注意：
- 使用透明背景，不绑定固定坐标。

### ember.png

用途：
- 少量暗红余烬氛围。

使用位置：
- 预留给通用特效层。

可替换性：
- 高

替换注意：
- 不做常驻高亮，不影响可读性。

### multiplier_burst.png

用途：
- 倍率结算瞬间的短暂爆发。

使用位置：
- 预留给倍率动画。

可替换性：
- 高

替换注意：
- 不写入具体倍率。

### card_flip_glow.png

用途：
- 卡牌翻开瞬间的辉光。

使用位置：
- 预留给翻牌动画。

可替换性：
- 高

替换注意：
- 使用透明背景，不遮挡动态点数。

## panel / UI 面板背景资源

### left_panel_bg.png

用途：
- 左侧信息栏的装饰性背景。

使用位置：
- 预留给 `.left-panel`。

可替换性：
- 中

替换注意：
- 不包含文字、数值、仪表和按钮。

### right_panel_bg.png

用途：
- 右侧操作区的装饰性背景。

使用位置：
- 预留给 `.right-panel`。

可替换性：
- 中

替换注意：
- 不包含按钮文字和状态信息。

### table_bg.png

用途：
- 中央赌桌区域的装饰性背景。

使用位置：
- 预留给 `.table-zone`。

可替换性：
- 中

替换注意：
- 不绑定卡牌位置，不降低牌面可读性。

### hand_area_bg.png

用途：
- 手牌区域的装饰性背景。

使用位置：
- 预留给 `.hand-zone`。

可替换性：
- 中

替换注意：
- 不包含固定手牌或数量。

### joker_row_bg.png

用途：
- 顶部赌鬼区的装饰性背景。

使用位置：
- 预留给 `.joker-zone`。

可替换性：
- 中

替换注意：
- 不包含固定赌鬼卡或效果文字。

## 统一接入规则

- 所有路径从 `web/asset-map.js` 读取，不在业务组件中散落硬编码路径。
- 所有图片通过 `web/safe-image.js` 挂载；加载失败时保留原有 CSS 表现。
- 动态文字、动态数值、按钮、tooltip、牌型、卡牌效果描述不得写入图片。
- 替换图片时优先保持原始比例和透明区域，避免影响现有布局与点击范围。

使用示例：

```js
const redEyeSource = window.GameAssets.redEye.active;
window.SafeImage.mount(document.querySelector(".red-eye-panel-art"), {
  src: redEyeSource,
  className: "state-art-image red-eye-panel-image"
});
```
