# Story jt11-17: The attract CTA "PRESS 1 OR 2 TO START" discards the count and routes to a select screen that re-asks — carry the count straight into startPlaying

## Story Details
- **Story ID:** jt11-17
- **Epic:** jt11 (Joust — cabinet experience)
- **Type:** bug
- **Points:** 2
- **Repos:** arcade (`plugins/joust/src/main.ts`; reads `src/core/select.ts`, `src/core/cabinet.ts`)
- **Workflow:** tdd
- **Sequencing:** edits the `main.ts` start-input / attract door shared with **jt11-16** — sequence, do not run in parallel checkouts. Independent of jt11-15 (`flight.ts`).

## The felt bug (player report)

> "The attract invites a CTA of '1 for one player' but that leads you to ANOTHER screen to choose the
> number of players again."

## Problem / Root Cause

The attract CTA names the digits — `START_PROMPT = 'PRESS 1 OR 2 TO START'`
(`plugins/joust/src/shell/attractScreen.ts:44`, painted every attract page at `main.ts`) — but the attract start
branch throws the specific choice away:

```
// plugins/joust/src/main.ts:557-563 (attract branch)
const want = readSelectInput(held)          // 'one-player' for Digit1, 'two-player' for Digit2
const startHeld = want !== null
if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)   // <-- only non-null-ness used; count DISCARDED
prevStartHeld = startHeld
```

`toSelect` (`plugins/joust/src/core/cabinet.ts:90`) merely flips `mode` to `'select'` and carries no count. So the
`'select'` screen re-asks the same 1P/2P question — `SEL_ONE_PLAYER` / `SEL_TWO_PLAYER`
(`plugins/joust/src/core/select.ts:36,39`) — and a game only
starts on a **second** digit press at the select door (`plugins/joust/src/main.ts:587-593` →
`selectPlayerCount(want)` → `enterPlaying`).

**Nothing is missing** — the pieces to start directly already exist and are simply bypassed on the
attract keypress:
- `selectPlayerCount(want)` (`plugins/joust/src/core/select.ts:51`) already maps `'one-player'`/`'two-player'` → `1`/`2`.
- `enterPlaying(count)` (`plugins/joust/src/main.ts:438`) / `startPlaying(cab, seed, count)` (`plugins/joust/src/core/cabinet.ts:99`)
  already start a game for a specific count.

**Live anchors (verified 2026-08-14):**
- CTA text: `plugins/joust/src/shell/attractScreen.ts:44` (START_PROMPT)
- `readSelectInput`: `plugins/joust/src/main.ts:472`
- attract start bug site: `plugins/joust/src/main.ts:557-563`
- select door model (direct-start pattern): `plugins/joust/src/main.ts:587-593`
- `selectPlayerCount`: `plugins/joust/src/core/select.ts:51`
- `SEL_ONE_PLAYER`/`SEL_TWO_PLAYER`: `plugins/joust/src/core/select.ts:36,39`
- `enterPlaying`: `plugins/joust/src/main.ts:438`
- `startPlaying`/`toSelect`: `plugins/joust/src/core/cabinet.ts:99`, `:90`
- `prevStartHeld`: `plugins/joust/src/main.ts:422`

## Design decision (Architect) — honour the advertised CTA: direct start

The prompt promises "PRESS 1 OR 2 TO START", so pressing 1 should **start a 1-player game** and
pressing 2 a 2-player game — no intervening re-selection. Thread the pressed count from the attract
keypress straight into `startPlaying`:

```
// plugins/joust/src/main.ts:557-563 (FIXED)
const want = readSelectInput(held)
const startHeld = want !== null
if (startHeld && !prevStartHeld) {
  const count = selectPlayerCount(want)     // already imported
  if (count !== null) enterPlaying(count)    // start directly; skip the re-ask
}
prevStartHeld = startHeld                     // keep the rising-edge discipline
```

This pattern is already proven at `main.ts:587-593` (the select door that direct-starts after a
select screen choice). The `'select'` screen becomes reachable only if a **distinct** coin-up gesture is kept (see Open
question). This is the reuse-first fix — no new functions, both symbols already imported.

### Open question for the groomer / owner — ⚠ RULED, then CORRECTED 2026-08-14 (attract-only)

> **⚠ OWNER RULING v2 (2026-08-14, via TEA) — SUPERSEDES v1:** **Attract only; keep the title
> coin-up.** Change ONLY the `attract` pump branch to direct-start; leave jt11-16's `title`→`select`
> coin-up UNTOUCHED and keep the `select` mode. TEA falsified the v1 premise: jt11-16 (merged after
> this story was filed) wired the `title` start-press to `toSelect`, so `toSelect` still has a caller
> after the attract fix — the select mode is NOT orphaned, and retiring it would break jt11-16's
> merged title coin-up and its passing tests (`title-boot-jt11-16-wiring.test.ts` AC-C). Accepted
> asymmetry: after this fix, an attract start-press direct-starts while a title start-press still
> opens the two-press select coin-up; unifying them is a separate follow-up.
>
> **⚠ OWNER RULING v1 (2026-08-14, via SM) — SUPERSEDED, kept for provenance:** Option (a) "retire
> the re-prompt / whole select mode; attract 1/2 the sole start path." Made on the premise that
> `toSelect` would lose its only caller — which jt11-16 falsified. Do not act on v1.

Original framing (kept for provenance): does the cabinet still want a separate coin-up **select**
screen at all? Two coherent end-states were —
- **(a) No select screen** — attract 1/2 is the only start path; retire the `'select'` mode's 1P/2P
  re-prompt (or the whole select screen) so there is one source of truth for player count. ← CHOSEN
- **(b) Keep select for a different gesture** — e.g. a coin/insert key opens select, while attract
  1/2 still direct-starts. ← rejected

Either way the attract 1/2 press must direct-start, which is the whole of this story. Coordinate the
shared `main.ts` door with jt11-16 (which also touches the title→start transition).

## Test Design

The seam is the attract start-press branch in `main.ts`; the count-mapping helpers are pure core.

### AC-1 — pressing 1 on attract starts a 1-player game directly
Drive the frame loop in attract, feed a Digit1 rising edge, and assert the cabinet is in `'playing'`
with a **1-player** game on the next frame — never in `'select'`. RED today: it enters `'select'`.
- **Non-vacuity control:** pressing **2** starts a **2-player** game (proves the count is carried, not
  hard-coded to 1).

### AC-2 — no second selection screen is interposed
Assert the `'select'` mode is not entered on the attract start press (mode goes attract → playing).
Guards the exact double-ask the player reported.

### AC-3 — rising-edge discipline preserved
A held digit starts exactly one game (no repeat on subsequent frames while held); `prevStartHeld`
gates it. Reuse jt11-1/jt11-8's edge pattern.

### AC-4 — count mapping is honoured end to end
`selectPlayerCount('one-player') === 1`, `('two-player') === 2`, and the started game's ledger sizes
to that count (ties to jt11-1's `createGame(playerCount)` path). A pure-unit check plus one
integration assertion that a 1P start spawns one knight.

### AC-5 — jt11-16's title coin-up and the select mode are PRESERVED (owner ruling v2 — attract-only)
CORRECTED: the fix touches ONLY the `attract` pump branch. A regression fence pins that the `title`
branch still routes its start-press to `toSelect` (jt11-16, unchanged) and that the `select` mode is
not removed. Do NOT retire the select mode or edit `title-boot-jt11-16-wiring.test.ts`. (v1's "remove
the re-prompt / sole start path" is superseded — see the CORRECTED ruling banner above.)

### Rule coverage
| Rule | Test |
|------|------|
| core/shell boundary | `select.ts` pure; input/DOM only in `main.ts`/shell |
| frame-loop source pins bounded (jt11-10) | if a `main.ts` wiring pin is added, bound the slice |
| test-file count anchor | bump `plugins/joust/README.md` file count if a test file is added |

## Acceptance Criteria
1. Pressing **1** on the attract screen starts a **1-player** game directly; pressing **2** starts a
   **2-player** game — no second player-count screen.
2. The `'select'` re-prompt is not interposed on the attract start press (attract → playing).
3. The rising-edge discipline holds — one press starts exactly one game.
4. The started game's player count matches the pressed digit end to end (one knight for 1P).
5. jt11-16's `title`→`select` coin-up and the `select` mode are **preserved** (owner ruling v2,
   2026-08-14) — only the `attract` branch changes; the `title` branch still routes to `toSelect`,
   and the select mode is not removed. (The attract-direct vs title-coin-up asymmetry is accepted;
   unifying them is a separate follow-up.)

## Out of scope
- Numpad/click start sources (jt11-8, canceled) — do not revive here unless the owner asks.
- The title screen wiring (jt11-16) beyond sharing the `main.ts` start door.

---
_Authored by Architect (design). Evidence gathered against `plugins/joust/src/{core,shell}` and `src/main.ts` on 2026-08-13._
