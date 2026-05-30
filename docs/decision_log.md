# Decision Log

## Current Product Direction

The project is now framed as `深渊赌局`: a dark poker roguelike about gambling pressure, ghost modifiers, and the temptation to keep pushing danger.

The current hook:

> The player knows one more greedy play may ruin the run, but still wants to press `摊牌`.

The project should not drift into a large industrial world, story-heavy roguelite, or map-based adventure before the core gambling loop is proven.

## Main Differentiation

The project should not compete with Balatro only on combinatorial card math.

The desired emotional niche is:

- Risk management.
- Greed.
- Collapse edge.
- Self-inflicted regret.
- Dangerous payout chasing.

The current UI language expresses this through:

- `上头值`
- `红眼`
- `鬼压桌`
- `红眼赌注`
- Dark gambling-table presentation.

## Fixed Canvas Decision

The main UI is a fixed game board:

- `1600 x 900` base size.
- Whole-board proportional scaling.
- No independent responsive panel reflow.

Reason: the screen is a composed game table, not a web page.

## Main-Screen Scope Decision

The main screen keeps only five persistent regions:

- Left information panel.
- Top ghost area.
- Center played-card area.
- Bottom hand area.
- Right action area.

Permanent shop, log, extra popups, and duplicated score panels are excluded from the main play screen.

## Terminology Decision

The current visual direction uses gambling terms:

- `赌鬼`, not Joker in visible UI.
- `上头值`, not pressure in visible UI.
- `摊牌`, not pull/lever.
- `换牌`, not refresh.
- `红眼赌注`, not overload module.

Legacy industrial terms can remain in historical code or internal logic, but should not dominate the player-facing UI unless intentionally reintroduced.

## Poker Foundation Decision

Basic cards use a standard poker foundation:

- 52-card deck.
- 4 suits.
- 13 ranks from 2 through A.
- Draw pile and discard pile.

Reason: poker hands give an intuitive mathematical anchor. The player can understand pair, two pair, straight, flush, and full house without learning a custom symbol system.

## Complexity Layering Decision

Complexity is layered:

1. Basic cards are plain inputs.
2. Poker hands provide base chips and multiplier.
3. Ghost/Joker modifiers bend rules.
4. Shop, packs, hand upgrades, and boss blinds add long-term decisions.
5. Red Eye systems create dangerous short-term temptation.

Basic cards should stay simple so rule-breaking cards feel special.

## Red Eye And Tilt Decision

The key validation is whether players voluntarily chase danger.

`上头值` should not be a decorative meter. It should affect payout, risk, and player emotion. The best moments should feel like:

- "I can pass safely, but this risky play pays more."
- "I know this might collapse."
- "That loss was my fault."

Round persistence rule:

- `上头值` is a cross-round pressure resource.
- Clearing a target relieves `30` `上头值`.
- `红眼赌注` choices are not cross-round buffs; they reset when the next round starts.
- Red Eye Bet costs stay meaningful because their stated `上头值` increase is added to the persistent `上头值` pool.
- The next round starts with the `红眼赌注` entry locked again, so the player must re-enter danger before choosing another bet.

## Shop Visibility Decision

The shop exists between blind states, not as a permanent main-screen region.

Reason: the main screen must stay focused on the hand, score, tilt, deck, and action buttons. Shop decisions are important but should not compete with the core table during play.

## Current MVP Status

Implemented systems include:

- 52-card deck.
- Draw pile and discard pile.
- Standard poker hand recognition.
- Blind score targets.
- Limited showdowns and discards.
- Small blind, big blind, and boss blind.
- Boss negative rules.
- Shop purchase, refresh, and sell.
- Hand upgrades.
- Card packs.
- Cashout/payout after clearing a blind.
- Seeded random sequence through `?seed=`.

## Next Design Priority

Highest priority remains proving the emotional loop:

1. The player understands the hand quickly.
2. The player sees a safe option and a greedy option.
3. The player voluntarily chooses danger.
4. The player regrets overreaching but wants another run.
