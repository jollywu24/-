# Changelog

## 2026-05-30

### Current State

- Web MVP moved from an early slot/module prototype toward a poker-hand prototype.
- Basic cards now use a true 52-card deck with ranks `2-10 / J / Q / K / A`.
- Draw pile and discard pile behavior are implemented.
- Standard poker hand recognition is implemented.
- Shop purchase, refresh, sell, hand upgrades, card packs, and boss blind negative rules are implemented.
- Initial run no longer starts with free Joker-style modifiers.
- Red/tilt-focused modifiers enter through the shop.
- Clearing a blind enters a payout/cashout step before the shop.
- Payout includes blind reward, remaining showdown reward, and interest.
- Selection and committed played cards were separated: selecting a hand card does not immediately copy it into the played-card area.
- Seeded randomness can be reproduced with `?seed=`.
- Round-clear behavior now preserves `上头值`, relieves `30` on clear, resets the selected `红眼赌注`, and keeps Red Eye Bet costs through the persistent `上头值` total.

### UI Changes

- Main screen was refocused into five persistent areas:
  - Left information panel.
  - Top ghost area.
  - Center played-card area.
  - Bottom hand area.
  - Right action area.
- Left HUD was redesigned around target score, current score, current hand, chips x multiplier, money/stake, tilt value, and remaining actions.
- The current visual direction became dark gambling table, worn poker cards, ghost cards, red eye, and locked Red Eye Bet.
- Permanent shop, log, and extra panels were removed from the main play screen.
- Main UI canvas uses fixed `1600 x 900` proportional scaling.
- A pure DOM/CSS static mock was created for the current effect-image target without external images, external fonts, frameworks, or Canvas.

### Design Lessons

- UI information must serve the core loop: can the player pass, how many actions remain, how dangerous the tilt is, and how much money can be spent later.
- Preview and resolution should stay separated. Preview helps decision-making; resolution should reveal card scoring, modifier triggers, and risk step by step.
- Selected hand cards and committed played cards must not be visually mixed.
- Basic cards must remain plain. Complexity belongs to ghost modifiers, boss rules, shop, packs, and Red Eye Bet.
- Static ghost cards should not be brighter than the active played-card area.
- When matching a reference image, information structure and screen proportions matter more than individual border decoration.

### Verification Habits

- Syntax check: `node --check web/app.js`.
- Logic tests: `node --test web/tests/logic-pure.test.mjs`.
- Diff hygiene: `git diff --check`.
- Fixed seeds should be used for balance and UI regression checks.

### Next Suggested Work

1. Use several fixed seeds to test whether players naturally chase high `上头值`.
2. Strengthen the feedback at `80`, `90`, `95`, and failure thresholds.
3. Add DOM-level regression checks for shop, payout, selection, and played-card separation.
4. Calibrate target curve, tilt gain, tilt relief, and ghost modifier strength.
