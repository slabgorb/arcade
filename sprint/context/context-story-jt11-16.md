# Story jt11-16: Boot drops into the attract self-play demo and never shows the Joust logo/title — wire the present-but-unreachable title screen

## Story Details
- **Story ID:** jt11-16
- **Epic:** jt11 (Joust — cabinet experience)
- **Type:** bug
- **Points:** 3
- **Repos:** arcade (`plugins/joust/src/core/attract-scheduler.ts`, `src/core/cabinet.ts`, `src/main.ts`)
- **Workflow:** tdd
- **Sequencing:** edits the `main.ts` start-input / attract door shared with **jt11-17** — sequence, do not run in parallel checkouts. Independent of jt11-15 (`flight.ts`).

## The felt bug (player report)

> "What happened to the start cabinet? We are launching into the attract [demo self-play] instead of
> showing the Joust logo, etc."

## Problem / Root Cause — the recurring jt11 "present but unwired" shape

The title-screen machinery is **complete across all three tiers** and reachable **only from tests**:

- **Core data** — `src/core/title.ts`: the `JOUST_LOGO` vector wordmark (`:60-141`),
  `TITLE_COPYRIGHT` / `TITLE_EXTRA_MOUNT` / `TITLE_POINTS_SUFFIX` (`:24-28`), and the
  `TITLE_PALETTE` + `titleColorRow` colour-cycle (`:150-174`).
- **Shell layout** — `src/shell/titleScreen.ts`: `layoutTitleScreen()` (`:39-46`) lays out the three
  phrase lines and passes the logo geometry through.
- **Render** — `src/main.ts`: `renderTitleScreen()` (`:311-318`) and `strokeLogo()` (`:287-303`) are
  written, imported (`:51-52`), and already dispatched by the render switch:
  `else if (cabinet.mode === 'title') { renderTitleScreen() }` (`:609-612`).
- **The mode exists** — `'title'` is in the `CabinetMode` union (`cabinet.ts:48`).

**The only missing link is a transition that ever sets `mode === 'title'`:**

- Boot hardwires `mode: 'attract'`: `main.ts:382` — `let cabinet = { mode: 'attract', game: createGame(SEED) }`.
- The attract page cycle carries **no title page**: `PAGE_ORDER = ['demo', 'pteroBanner', 'lavaBanner']`
  (`attract-scheduler.ts:77`), boot page = `PAGE_ORDER[0]` = `'demo'` (`attract-scheduler.ts:98-100`).
- On the demo page the attract loop immediately pumps the self-play sim (`main.ts:546-562`) — so boot
  lands directly in demo self-play.
- `toTitle` (`cabinet.ts:84-86`) has **zero production callers**; the gap is self-admitted in-code at
  `main.ts:277-280` ("`toTitle` has no caller … wiring title into the attract cycle is deferred").

## Design decision (Architect) — title as the FIRST attract page (Option 2)

Two candidate wirings exist. **Recommend Option 2**, with the ROM AMODE sequence as the tiebreaker to
place it (verify before building — an AC below).

- **Option 1 — boot into `'title'` mode, dwell → attract.** Change `main.ts:382` to `mode: 'title'`,
  add a title branch near the coin-up door (`main.ts:564-575`) that hands to attract after a dwell and
  to select on a start press. Reuses the existing `mode === 'title'` render dispatch (`:609-612`).
- **Option 2 — add `'title'` as an attract PAGE_ORDER page (RECOMMENDED).** Add `'title'` to
  `AttractPage` (`attract-scheduler.ts:29`) and make it the **first** entry of `PAGE_ORDER`
  (`:77`) so boot shows the logo first (boot already starts at `PAGE_ORDER[0]`, `:98-100`); give it a
  `dwellFor` case (`:93-95`); and in `renderAttract` (`main.ts:349-360`) call `renderTitleScreen()`
  for that page.

**Why Option 2:** the real cabinet's attract is a *rotating* sequence (marquee/logo → demo → high
scores → …), not a one-shot pre-attract screen, and putting the logo first in that rotation is exactly
the player's ask ("show the logo … etc."). It keeps a single `'attract'` cabinet mode, adds no new
render code, and reuses `renderTitleScreen` through the `renderAttract` path. If Option 2 is taken,
decide whether the now-unused `'title'` cabinet mode + its `:609-612` dispatch are retired or kept for
a future coin-up title — note it as a deviation either way; do not leave two live title-render doors
undocumented.

## Test Design

Core transitions are pure (`attract-scheduler.ts`, `cabinet.ts`); the render is shell. Test the seam,
not the pixels.

### AC-1 — boot shows the title, not demo self-play
Assert the boot attract page (or cabinet mode) is the title page, and that the demo sim is **not**
pumped on frame 0. RED today: boot page is `'demo'` and `stepGame` runs immediately (`main.ts:558-560`).
- **Non-vacuity control:** a later frame in the rotation IS the demo page and DOES pump — otherwise a
  fix that simply never runs the demo would pass.

### AC-2 — the attract rotation still reaches demo and the banners
`advanceAttract` cycles `title → demo → pteroBanner → lavaBanner → title …`. Pin the full order and
each page's dwell so the title does not swallow the cycle. This is the guard the "boot shows logo"
change must not break.

### AC-3 — the logo/copy content is laid out on the title page
`layoutTitleScreen` receives the `JOUST_LOGO` geometry and the three phrase lines
(`TITLE_COPYRIGHT`/`TITLE_EXTRA_MOUNT`/`TITLE_POINTS_SUFFIX`) when the title page is active. A
shell-level test that the title render path is invoked for the title page (the jt11-7 lesson: a
drawList/mode with no shell consumer is invisible — assert the consumer runs).

### AC-4 — a start press from the title enters the player-select flow
Pressing 1/2 on the title routes to select/play (do not dead-end on the logo). Coordinate with
**jt11-17**, which is rewiring that same door — land jt11-17 first or share the branch.

### AC-5 — ROM attract sequence verified before placement
Read the ROM AMODE/MARQUE attract ordering in the joust source and cite it; place `'title'` in the
rotation to match (this is what fixes "logo first" faithfully rather than by guess).

### Rule coverage
| Rule | Test |
|------|------|
| core/shell boundary | `purity` — `title.ts`/`attract-scheduler.ts`/`cabinet.ts` stay pure; DOM only in `main.ts`/shell |
| frame-loop source pins slice to a bounded region (jt11-10 ruling) | if a `main.ts` wiring pin is added, bound the slice, don't slice-to-EOF |
| test-file count anchor | bump `plugins/joust/README.md` file count if a test file is added |

## Acceptance Criteria
1. At boot the cabinet shows the Joust logo/title (the `JOUST_LOGO` wordmark + copyright/points
   phrases), not the demo self-play field.
2. The attract sequence still rotates through demo and the ptero/lava banners; no page is starved.
3. The title render path is actually invoked when the title is active (not just present in a switch).
4. A start press (1/2) from the title reaches the player-select/start flow (coordinate with jt11-17).
5. `'title'` placement matches the ROM AMODE/MARQUE attract order, cited.
6. The `main.ts:277-280` deferral comment is retired; if Option 2 leaves the `'title'` cabinet mode
   unused, that is documented (retire or justify keeping).

## Out of scope
- High-score-table attract page (if the ROM rotation includes one and it is not yet built) — file
  separately, do not absorb.
- Any change to demo self-play behaviour beyond no-longer-being-frame-0.

---
_Authored by Architect (design). Evidence gathered against `plugins/joust/src/{core,shell}` and `src/main.ts` on 2026-08-13._
