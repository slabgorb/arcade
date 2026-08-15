# Story Context: ml9-1

## Story Identity
- **Story ID:** ml9-1
- **Type:** bug
- **Points:** 3
- **Epic:** ml9
- **Workflow:** tdd
- **Repository:** arcade

## Title
Attract-mode enemy-showcase screen is missing (the 'cast of characters' + high-scores + 1 COIN 1 PLAY screen)

## Background
Playthrough finding (owner). The ROM attract-mode enemy-showcase screen (reference: sprint/planning/ml9-playthrough-refs/attract-mame-reference.png — blue background, HIGH SCORES table of 8 initials, one labelled panel per creature: DRAGONFLY MOSQUITO BEE EARWIG GROWTH INCHWORM BEETLE DDT-BOMB MILLIPEDE SPIDER, and the '1 COIN 1 PLAY' / 'BONUS EVERY 15000' / 'COPYRIGHT ATARI 1982' footer) does not exist in our cabinet. MEASURED 2026-08-15 by SM pre-setup: grep found NO creature-name panels, NO COIN/COPYRIGHT text, NO render path for this screen anywhere in plugins/millipede/src. This is a NEW render surface to BUILD, not a wiring fix. Do NOT conflate with two things that DO already exist: core/attract.ts is the self-playing silent demo (lobby carousel), and ml7-3 hud.ts is the in-game HUD (score/lives/hi-score/DDT). The build can REUSE existing assets: shell/gfx-rom.ts sprite decoders, the font/charTile stamps in shell/render.ts, and the highscore table data. Cite the ROM source for the showcase layout, colours and label text before pinning. Seams: shell/render.ts (new draw path) and possibly a new attract-showcase phase in core if the screen must cycle with the demo.

## Acceptance Criteria
1. A render path draws the attract enemy-showcase screen matching attract-mame-reference.png: blue background, HIGH SCORES table, one labelled panel per creature, and the '1 COIN 1 PLAY' / 'BONUS EVERY 15000' / 'COPYRIGHT ATARI 1982' footer.
2. Layout, colours and label text are pinned to the ROM/MAME source with citations, not eyeballed.
3. The showcase screen is reachable in attract mode (cycles with or replaces the existing silent demo per ROM behaviour) and does not regress the in-game HUD or the self-playing attract demo.

## Key Considerations
- This is a NEW screen BUILD, not a wiring fix
- Reference screenshot at: sprint/planning/ml9-playthrough-refs/attract-mame-reference.png
- Do NOT conflate with core/attract.ts (self-playing silent demo) or hud.ts (in-game HUD)
- Can REUSE: shell/gfx-rom.ts decoders, font/charTile stamps in shell/render.ts, highscore table data
- Must cite ROM source for layout, colours, and label text
- Primary seam: shell/render.ts (new draw path)
- Possible secondary: new attract-showcase phase in core if screen must cycle with demo

## Definition of Done
- Render path created and functional
- All visual elements match MAME reference exactly
- Citations documented for layout, colours, and text
- Attract mode integration tested
- No regression in in-game HUD or self-playing demo
