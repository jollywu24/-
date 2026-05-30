\# AGENTS.md



\## Project identity



This project is a pure Web HTML/CSS/JS prototype for a dark poker roguelike game named 《深渊赌局》.



The current UI direction is fixed:



\- 黑暗赌桌

\- 扑克牌

\- 赌鬼

\- 上头值

\- 红眼赌注

\- 左侧信息栏

\- 顶部赌鬼区

\- 中央出牌区

\- 底部手牌区

\- 右侧操作区



Do not redesign the core concept unless explicitly asked.



\## Critical design principle



This is not a responsive website.

This is a fixed game UI canvas.



Use a fixed 16:9 canvas:

\- Base size: 1600 × 900

\- Scale the whole canvas to fit viewport

\- Do not let individual panels reflow independently



\## Hard rules



Never change these unless explicitly requested:



1\. Do not move the left information panel.

2\. Do not change the order of items in the left information panel.

3\. Do not add a permanent shop UI to the main play screen.

4\. Do not show the Red Eye Bet choices permanently.

5\. The Red Eye Bet choices must appear as a center modal only when triggered.

6\. After selecting a Red Eye Bet, show only a small status icon; details appear via tooltip.

7\. Do not add new always-visible panels.

8\. Do not reintroduce the lever/pull-machine UI.

9\. Do not rename the core terms:

&#x20;  - 赌鬼

&#x20;  - 上头值

&#x20;  - 红眼

&#x20;  - 鬼压桌

&#x20;  - 红眼赌注

&#x20;  - 摊牌

&#x20;  - 换牌

10\. Do not introduce industrial module terminology such as 插件、模块、压力、红温 unless explicitly asked.



\## Visual rules



The UI should be dark, readable, and restrained.



Use:

\- dark table background

\- worn paper cards

\- dark gold borders

\- muted red highlights

\- red eye motif

\- subtle glow only for selected or active states



Avoid:

\- excessive neon

\- cyberpunk HUD style

\- colorful noise

\- always-on particle effects

\- overly bright Joker/Ghost cards

\- repeated information in multiple places



\## UI workflow



When asked to modify UI:



1\. First identify which existing component is being changed.

2\. Modify only that component.

3\. Keep all unrelated layout, text, and visual hierarchy unchanged.

4\. Do not “improve” unrelated areas.

5\. If the instruction is ambiguous, ask before moving major layout blocks.

6\. After implementation, summarize exactly what changed and what was intentionally left untouched.



\## Implementation rules



Use:

\- vanilla HTML

\- vanilla CSS

\- vanilla JavaScript



Prefer DOM elements so cards, buttons, tooltips, and modals are easy to inspect and modify.



\## Verification checklist



Before finishing any UI task, check:



\- Left panel order unchanged

\- No duplicated score/hand information

\- Hand area and played-card area are visually distinct

\- Red Eye Bet is hidden unless triggered

\- Red Eye Bet locked entry is less visually dominant than 摊牌 / 换牌

\- Joker/Ghost cards do not overpower the play area

\- Current selected card is visually clear

\- Layout still fits within 1600 × 900 without scrolling



\## Documentation update discipline



Do not create new documentation files unless explicitly requested.



Only these documentation files may be edited:



\- docs/ui\_spec.md

\- docs/component\_rules.md

\- docs/design\_tokens.md

\- docs/decision\_log.md

\- docs/changelog.md



Do not create files such as:

\- \*\_notes.md

\- \*\_summary.md

\- \*\_final.md

\- \*\_v2.md

\- implementation\_notes.md

\- update\_report.md



For small visual tweaks, do not update documentation.



Update docs only when one of these changes occurs:



1\. A stable UI layout rule changes.

2\. A component contract changes.

3\. A core term changes.

4\. A gameplay state definition changes.

5\. A design decision should be remembered for future tasks.



When updating documentation:



\- Prefer editing existing sections.

\- Do not duplicate information across files.

\- Keep changes short.

\- Add at most one entry to docs/changelog.md.

\- Add to docs/decision\_log.md only for real design decisions, not routine implementation changes.



After finishing a task, summarize changes in the chat response instead of creating a new markdown report.

