# Story jt13-3: Entry screen 'new mount every' line: read the setting or remove it

> ## ⚠ RULED SPEC — the either/or is decided: READ THE SETTING
>
> The story description presented an either/or: read the actual value and display it, OR remove the line. The either/or was RULED per the ROM ground truth before setup — the "remove the line" half is DEAD.
>
> **ROM authority (ATT.SRC:63-79):** The authentic attract routine prints the FULL line and reads the operator replay level:
> ```asm
> LDX #REPLAY            ; get replay level        (ATT.SRC:63,72)
> LDD #MSW17*256+$33     ; MSW17 = "EXTRA MOUNT EVERY " (MESSEQU.SRC:158)
> JSR OUTBCD             ; DISPLAY THOUSANDS OF REPLAY POINTS  (ATT.SRC:78)
> LDA #MSW18             ; MSW18 = ",000 POINTS"    (MESSEQU.SRC:157)
> ```
> So the authentic line is: **"EXTRA MOUNT EVERY <N>,000 POINTS"** where N = the replay/extra-man level in thousands.
>
> **Port defaults:** The port's default replay/extra-man interval is `REPLAY_INTERVAL = 20_000` (plugins/joust/src/core/game.ts:223; `extraManAt` seeds to it, game.ts:295). So the authentic default line is **"EXTRA MOUNT EVERY 20,000 POINTS"**.
>
> **Strings already exist:** Both text fragments are already core data:
> - `TITLE_EXTRA_MOUNT = 'EXTRA MOUNT EVERY '` (plugins/joust/src/core/title.ts:26)
> - `TITLE_POINTS_SUFFIX = ',000 POINTS'` (plugins/joust/src/core/title.ts:28)
> And both are laid out as `extraMount` and `pointsSuffix` by `layoutTitleScreen()` (plugins/joust/src/shell/titleScreen.ts:42-43).
>
> **The actual defect:** `renderTitleScreen()` in plugins/joust/src/main.ts:312-318 paints only `screen.extraMount` ("EXTRA MOUNT EVERY ") at main.ts:317. It **NEVER paints the BCD thousands value AND never paints `screen.pointsSuffix`** (",000 POINTS"). The line renders as a dangling "EXTRA MOUNT EVERY" with no number and no suffix — fidelity regression against the ROM.
>
> **RULING:** Branch chosen: READ THE SETTING and display the full line. Removing the line would be a fidelity regression — the ROM shows it by default (a nonzero replay level, default 20,000). This story will implement the full phrase including the numeric thousands value (seeded from the replay/extra-man setting) and the ",000 POINTS" suffix.

## Story Summary
**Type:** bug  
**Points:** 2  
**Priority:** p2  
**Workflow:** tdd  
**Repo:** arcade

## Description
The entry/attract screen shows a 'new mount every' line that is wrong. The line should display the full ROM phrase: "EXTRA MOUNT EVERY <N>,000 POINTS", where N is the replay/extra-man threshold in thousands (default 20,000). Currently it renders only "EXTRA MOUNT EVERY " with no number and no suffix, a fidelity regression.

## Acceptance Criteria
1. **AC-1: Render the full extra-mount line** — The attract screen "EXTRA MOUNT EVERY" line renders the complete phrase as "EXTRA MOUNT EVERY <N>,000 POINTS" where N is the tens-of-thousands digit from the replay/extra-man setting (default 20 for 20,000 points), with no gaps between the three parts (prefix, number, suffix).

2. **AC-2: Source the value from the setting** — The thousands digit (N) is sourced from the game's `extraManAt` / `REPLAY_INTERVAL` setting in the core, not hardcoded or invented in the shell. The default is 20,000 (N=20), and the value is READ from the replay level at title-screen boot time, not stamped into the string template.

3. **AC-3: No fidelity regression** — The attract screen MUST NOT hide or omit the suffix (",000 POINTS") or the numeric value. Both must render in their ROM positions alongside the prefix ("EXTRA MOUNT EVERY ").

4. **AC-4: Use the existing core strings** — Implement using the committed core data: `TITLE_EXTRA_MOUNT` and `TITLE_POINTS_SUFFIX` from `plugins/joust/src/core/title.ts`, and `REPLAY_INTERVAL` / `extraManAt` from `plugins/joust/src/core/game.ts`. Do not duplicate or invent new strings.

## Core/Shell Boundary
**Core/Shell:** The number/string SELECTION is pure DATA (core); pixel PLACEMENT is the shell's job (per jt1-7). TEA/Dev will decide the exact seam — where the BCD value conversion happens (core or shell logic) — and how the display glyphs are routed to the renderer. The core exports the value; the shell paints it.

## Related Code References
- **Core title strings:** `plugins/joust/src/core/title.ts:26-28` (TITLE_EXTRA_MOUNT, TITLE_POINTS_SUFFIX)
- **Core replay setting:** `plugins/joust/src/core/game.ts:223` (REPLAY_INTERVAL = 20_000), game.ts:295 (`extraManAt` seeded)
- **Shell title screen:** `plugins/joust/src/shell/titleScreen.ts:42-43` (`extraMount`, `pointsSuffix` layout slots)
- **Render entry point:** `plugins/joust/src/main.ts:312-318` (renderTitleScreen function)
- **ROM authority:** JOUSTRV4.SRC:63-79 (ATTRCT attract routine, MSW17/MSW18 phrase output); MESSEQU.SRC:157-158 (MESSEQU message strings); TB12REV3.SRC:134 ("REPLAY @20,000" default)

## Test Strategy
- **Rendering test:** Boot the attract title screen, verify the on-screen "EXTRA MOUNT EVERY" line displays all three parts: prefix, digit (default 20), and suffix.
- **Setting source test:** Change the replay setting (if configurable) and verify the digit updates.
- **Default behavior test:** Confirm the default 20,000 replay interval displays as "EXTRA MOUNT EVERY 20,000 POINTS".
- **Regression:** Ensure the change does not break other title-screen text or layout (copyright line, logo, etc.).
