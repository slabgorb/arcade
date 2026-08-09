# Story mc6-1 Context

## Title
Phase machine (state.ts): extend Phase from play|between|over to add attract|setup|pause and a pure MAINLINE dispatch (attract -> setup -> play -> [pause] -> over -> attract). Pure transition fn, seeded, no clock. REV-01 W3MAIN.MAC:475 MAINLINE / :539 PLAY / :561 SETUP / :615 PAUSE

## Metadata
- **Story ID:** mc6-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Missile Command — attract + state machine + pause (REV-01): the full MAINLINE attract/setup/play/pause loop

## Problem
The title IS the spec (no separate YAML description). Missile Command's `src/core/state.ts`
today models only the combat-relevant slice of the phase machine: `Phase = 'play' | 'between' | 'over'`
(state.ts:13). Its own header already names mc6 as the owner of "the full attract/setup/pause
machine" (state.ts:6, :12). mc6-1 is the **pure-core** story that lands that machine: extend the
`Phase` union with `'attract' | 'setup' | 'pause'` and add a pure, seeded, clock-free MAINLINE
dispatch transition implementing the full cycle attract → setup → play → [pause] → over → attract.

Grounded against ROM (SM measured all citations before setup — they resolve EXACTLY in
`plugins/missile-command/reference/source/W3MAIN.MAC`, a CRLF file in the a-1 reference tree):
- `:475` = `.SBTTL MAINLINE` (START:) — the top-level dispatch loop
- `:539` = `.SBTTL PLAY` (PLAY:) — the play state
- `:561` = `.SBTTL SETUP STATE` (SETUP:) — the setup state
- `:615` = `.SBTTL PAUSE STATE` (PAUSE:) — the pause state

## Technical Approach
Edit `plugins/missile-command/src/core/state.ts` only (pure core — no shell/render/wiring):
1. Extend the `Phase` union to `'attract' | 'setup' | 'play' | 'pause' | 'between' | 'over'`.
2. Add a pure `mainline(...)` transition fn implementing the cycle attract → setup → play →
   [pause] → over → attract. It must be **seeded** (take an RNG where randomness is needed),
   **clock-free** (no `Date`/`performance`/timers — the core purity scanner asserts this), and
   deterministic. `'over' → 'attract'` closes the loop (attract-mode restart with no external reset).
3. Cite each ROM section (475 MAINLINE / 539 PLAY / 561 SETUP / 615 PAUSE) as **`//` line
   comments**, NOT `/** */` JSDoc — the mc un-cited-literal gate is line-based and JSDoc leaks
   numbers (see memory: "mc citations scanner leaks JSDoc numbers").
4. Leave existing fns (`nextPhase`, `nextWavePhase`, `resumePlay`, `allCitiesDead`) and their
   consumer `game.ts:324` (`nextPhase(state.phase, impact.cities)`) behaviorally unchanged.

## Scope
- **In scope:** `Phase` union extension + a pure seeded no-clock `mainline` dispatch fn in
  `state.ts`, with ROM line-comment citations.
- **Out of scope:** shell/render/input wiring of the new phases, attract-mode content, pause UI,
  and any `game.ts` step-loop integration — those are later mc6 stories.

## Acceptance Criteria
1. **Phase union extended:** `export type Phase` includes 'attract', 'setup', 'pause' alongside the
   existing 'play', 'between', 'over' — existing states' behavior unchanged.
2. **Pure MAINLINE dispatch:** a pure, seeded, clock-free transition fn implements
   attract → setup → play → [pause] → over → attract.
3. **Loop closure:** 'over' → 'attract' restarts attract mode without an external reset.
4. **ROM citations:** W3MAIN.MAC:475/:539/:561/:615 preserved as `//` line comments (not JSDoc),
   per the mc citations rule.
5. **Regression safety:** `nextPhase`, `nextWavePhase`, `resumePlay`, `allCitiesDead` remain
   exported and behave identically; `game.ts` continues to compile and run unchanged.

---
_SM-authored from measured facts (title-only story). Session mirror: `.session/mc6-1-session.md`._
