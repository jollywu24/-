# Component Rules

## Core Terms

Use these current terms consistently:

- `赌鬼`
- `上头值`
- `红眼`
- `鬼压桌`
- `红眼赌注`
- `摊牌`
- `换牌`

Avoid legacy industrial terms such as `模块`, `插件`, `压力`, and `红温` in the current gambling-table UI unless explicitly requested.

## Resource Model

All systems should map back to a small set of resources:

1. Chips: base score added by poker hands, basic cards, and some ghost effects.
2. Multiplier: score leverage applied after chips.
3. Tilt value: risk pressure, shown as `上头值`.
4. Money: long-term shop resource, shown as `赌资` or cash depending on context.

Do not introduce new permanent resources without a clear reason.

## Basic Playing Cards

Basic cards are simple poker cards.

Each card displays:

- Rank.
- Suit.
- Worn paper background.

Current rank range:

```text
2 / 3 / 4 / 5 / 6 / 7 / 8 / 9 / 10 / J / Q / K / A
```

Current suits:

```text
♠ / ♥ / ♦ / ♣
```

Basic cards should not contain long effect text, random effects, defensive skills, or special red-eye effects. Complexity belongs to ghost cards, shop choices, boss rules, and Red Eye Bet.

## Poker Hand System

Current hand table:

| Hand | Condition | Chips | Mult |
| --- | --- | ---: | ---: |
| High Card | Any other played hand | 5 | x1 |
| Pair | 2 cards of the same rank | 10 | x2 |
| Two Pair | 2 separate pairs | 20 | x2 |
| Three of a Kind | 3 cards of the same rank | 30 | x3 |
| Straight | 5 consecutive ranks | 30 | x4 |
| Flush | 5 cards of the same suit | 35 | x4 |
| Full House | Three of a Kind + Pair | 40 | x4 |
| Four of a Kind | 4 cards of the same rank | 60 | x7 |
| Straight Flush | Straight + Flush | 100 | x8 |

Scoring order:

1. Identify best poker hand.
2. Add hand chips.
3. Apply hand multiplier.
4. Resolve played cards.
5. Apply ghost, boss, and red-eye modifiers.
6. Final score is rounded after chips and multiplier are combined.

## Deck And Run Structure

- Use a true 52-card deck.
- Use draw pile and discard pile behavior, not random replacement from a template pool.
- Hand size is 8.
- A play can commit up to 5 cards.
- Current blind structure uses small blind, big blind, and boss blind.
- Boss blinds can add negative rules.

## Ghost Cards

Ghost cards replace Joker cards in the current UI language.

They represent long-term rule modifiers and should show:

- Name.
- Dark portrait or icon.
- Short effect.
- Small rarity or stars.

Card text must stay short. Detailed rules should live in tooltip, modal, or documentation.

## Tilt Value

`上头值` replaces the older pressure presentation.

Stages:

- `冷手`
- `热手`
- `红眼`
- `鬼压桌`

It should be represented by an eye gauge:

- Cold: closed or dim.
- Warm: half-open.
- Red Eye: red and open.
- Ghost Pressing Table: intense and unstable.

High `上头值` is the project’s core risk emotion: the player should want the danger because the payout looks tempting.

## Red Eye Bet

Red Eye Bet is a temporary dangerous choice.

Default state:

- Locked entry on the right side.
- No options visible.
- Lower visual weight than the `摊牌` button.

Triggered state:

- Center modal.
- Dimmed background.
- 3 options.
- One-time choice affecting current hand or next hand.

After choosing:

- Modal disappears.
- A small icon appears near the right action area.
- Tooltip shows details.

Round persistence:

- `上头值` carries across rounds.
- Clearing the current target reduces `上头值` by `30`, but never below `0`.
- The selected `红眼赌注` itself does not carry into the next round.
- Any special cost written on the Red Eye Bet card, such as `上头值 +10` or `上头值 +15`, is already part of `上头值` and therefore carries across rounds unless later reduced by round-clear relief or another rule.
- At the start of the next round, the right-side `红眼赌注` entry returns to locked state and can be offered again later.

## Shop And Economy

The shop is not a permanent main-screen panel.

Current shop features:

- Buy ghost/Joker-style modifiers.
- Refresh shop.
- Sell owned modifiers.
- Buy hand upgrades.
- Open card packs.

Economy sources:

- Blind reward.
- Remaining showdown count reward.
- Interest.
- Special modifier rewards.

## UI Modification Workflow

When modifying UI:

1. Identify the target component.
2. Modify only that component.
3. Keep unrelated layout, text, and hierarchy unchanged.
4. Do not improve unrelated areas opportunistically.
5. If a request is ambiguous, ask before moving major layout blocks.
6. Report changed files, changed components, and protected components left untouched.

Allowed edit types:

- Layout edit: move or resize only the named component.
- Visual edit: change color, border, glow, shadow, texture, or emphasis only for the named component.
- Interaction edit: add behavior to the named component without redesigning unrelated UI.
- Copy edit: change only specified text labels.

## Verification Checklist

Before finishing UI work, check:

- Left panel order is unchanged.
- No duplicated score or hand information appears in the center.
- Hand area and played-card area are visually distinct.
- Hand fan does not overlap the right action panel.
- No permanent shop/log/extra panel was added to the main screen.
