# Design Tokens

## Color Tokens

Background:

- `main-bg`: `#080604`
- `table-bg`: `#10100b`
- `panel-bg`: `#14100b`
- `panel-bg-deep`: `#090705`

Borders:

- `gold-border`: `#7a5524`
- `muted-gold`: `#b98538`
- `dark-gold`: `#4a3318`

Text:

- `text-main`: `#ead8b0`
- `text-muted`: `#9f8a64`
- `text-dim`: `#665742`

Score:

- `chips-blue`: `#4aa3ff`
- `mult-red`: `#ff4545`
- `money-gold`: `#e0ad45`

Danger:

- `red-eye`: `#b71919`
- `deep-red`: `#4a0909`
- `warning-orange`: `#d56a24`

Card:

- `paper`: `#d6c6a5`
- `paper-dark`: `#a58f68`
- `card-ink`: `#17120d`
- `red-suit`: `#7b2016`
- `black-suit`: `#080705`

## Visual Direction

The current UI direction is:

- Dark gambling table.
- Worn poker cards.
- Dark gold borders.
- Muted red highlights.
- Red-eye motif.
- Restrained glow.
- Dirty, old, dangerous materials rather than clean neon.

Avoid:

- Cyberpunk HUD style.
- Bright rainbow effects.
- Colorful noise.
- Always-on particles.
- Overly bright ghost cards.
- Repeated information in multiple places.

## Intensity Rules

Default UI should be dark and calm.

Strong glow is reserved for:

- Selected hand card.
- Currently scoring card.
- Red Eye state.
- Active Red Eye Bet modal.
- Triggered ghost card.

Do not use strong glow on static ghost cards, inactive locked entries, or background decoration.

## Typography

- Use available system fonts only.
- Serif-style Chinese display type is acceptable for title and button labels.
- Keep button and card text short.
- Do not use external fonts.

## Shape And Layout

- Primary canvas is `1600 x 900`.
- Cards should have worn paper texture from CSS gradients only.
- Main panels use dark frames with subtle gold borders.
- Cards, buttons, and locked entries can use clipped corners.
- Avoid large rounded SaaS-style cards.

## Asset Constraints

Current UI spec forbids:

- External images.
- External fonts.
- Canvas rendering.
- External frameworks.

Allowed tools:

- DOM.
- CSS gradients.
- CSS shadows.
- CSS pseudo-elements.
- Unicode suit symbols.
