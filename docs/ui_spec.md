# UI Spec

## Canvas

- Base canvas: `1600 x 900`.
- The whole game board is centered and scaled proportionally to fit the browser viewport.
- The page does not scroll.
- This is a fixed game UI canvas, not a responsive website layout. Individual panels should not reflow independently.

## Main Screen Layout

The main play screen has exactly five persistent regions:

1. Left information panel.
2. Top ghost area.
3. Center played-card area.
4. Bottom hand area.
5. Right action area.

Do not add always-visible shop, log, popup, map, or extra side panels to the main play screen.

## Left Information Panel

Purpose: show all critical run information in a fixed order.

Required order:

1. Game title: `深渊赌局`.
2. Button: `比赛信息`.
3. Target score: `目标分数`.
4. Current score: `当前分数`.
5. Current hand type: `当前牌型`.
6. Hand level: `等级`.
7. Chips x multiplier: `筹码 × 倍率`.
8. Stake: `赌资`.
9. Tilt value: `上头值`.
10. Tilt stages: `冷手`, `热手`, `红眼`, `鬼压桌`.
11. Showdown count: `摊牌`.
12. Discard count: `换牌`.

The left panel order is protected. Do not rearrange it during visual polish.

## Top Ghost Area

- Title: `赌鬼`.
- Shows 5 ghost cards.
- Ghost cards represent long-term rule modifiers.
- They should be visible but darker than the played-card area.
- They should only become bright when triggered.

Current ghost card names:

- `诡笑庄家`
- `借命赌徒`
- `命运荷官`
- `血债收账人`
- `厄运撒票者`

## Center Played-Card Area

- Shows cards that have already been committed by `摊牌`.
- Played cards are straighter and slightly brighter than hand cards.
- Do not show hand name, formula, duplicate score text, or preview math in this area.
- Selected hand cards must not appear here before showdown.

## Bottom Hand Area

- Shows 8 current hand cards in a fan.
- The selected card rises slightly and uses a gold/orange highlight.
- The hand counter displays `8 / 8`.
- The fan must stay inside the center play area and must not overlap the right action panel.

## Right Action Area

Required order:

1. Deck pile.
2. Remaining cards count.
3. `摊牌` button.
4. `换牌` button.
5. Locked `红眼赌注` entry.

The `红眼赌注` entry is locked by default. It should look dangerous but inactive, and it must not visually overpower the `摊牌` button.

## Protected Main-Screen Rules

- Do not add a permanent shop UI to the main play screen.
- Do not show Red Eye Bet choices permanently.
- Red Eye Bet choices appear only as a center modal when triggered.
- After choosing Red Eye Bet, show only a small status icon; details appear via tooltip.
- Do not reintroduce the industrial lever or pull-machine UI unless explicitly requested.
