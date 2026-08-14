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
(`attractScreen.ts:44`, painted every attract page at `main.ts:358-359`) — but the attract start
branch throws the specific choice away:

```
// main.ts:554-556 (attract branch)
const want = readSelectInput(held)          // 'one-player' for Digit1, 'two-player' for Digit2
const startHeld = want !== null
if (startHeld && !prevStartHeld) cabinet = toSelect(cabinet)   // <-- only non-null-ness used; count DISCARDED
```

`toSelect` (`cabinet.ts:90-92`) merely flips `mode` to `'select'` and carries no count. So the
`'select'` screen re-asks the same 1P/2P question — `SEL_ONE_PLAYER` / `SEL_TWO_PLAYER`
(`select.ts:36,39`; laid out `selectScreen.ts:35-36`; painted `main.ts:225-226`) — and a game only
starts on a **second** digit press at the select door (`main.ts:564-574` →
`selectPlayerCount(want)` → `enterPlaying`).

**Nothing is missing** — the pieces to start directly already exist and are simply bypassed on the
attract keypress:
- `selectPlayerCount(want)` (`select.ts:51-55`) already maps `'one-player'`/`'two-player'` → `1`/`2`.
- `enterPlaying(count)` (`main.ts:432-438`) / `startPlaying(cab, seed, count)` (`cabinet.ts:99-101`)
  already start a game for a specific count via `createGame(seed, playerCount)`.

**Line-drift note:** jt11-1 cited the start-input at `main.ts:422-426,500-503`; those have shifted.
Live logic today: `readSelectInput` `main.ts:465-470`, attract press `main.ts:552-556`, select door
`main.ts:564-574`, `prevStartHeld` declared `main.ts:419-422`. Re-anchor before editing.

## Design decision (Architect) — honour the advertised CTA: direct start

The prompt promises "PRESS 1 OR 2 TO START", so pressing 1 should **start a 1-player game** and
pressing 2 a 2-player game — no intervening re-selection. Thread the pressed count from the attract
keypress straight into `startPlaying`:

```
// main.ts:554-556
const want = readSelectInput(held)
const startHeld = want !== null
if (startHeld && !prevStartHeld) {
  const count = selectPlayerCount(want)     // already imported (main.ts:29)
  if (count !== null) enterPlaying(count)    // start directly; skip the re-ask
}
prevStartHeld = startHeld                     // keep the rising-edge discipline
```

The `'select'` screen becomes reachable only if a **distinct** coin-up gesture is kept (see Open
question). This is the reuse-first fix — no new functions, both symbols already imported.

### Open question for the groomer / owner
Does the cabinet still want a separate coin-up **select** screen at all? Two coherent end-states:
- **(a) No select screen** — attract 1/2 is the only start path; retire the `'select'` mode's 1P/2P
  re-prompt (or the whole select screen) so there is one source of truth for player count.
- **(b) Keep select for a different gesture** — e.g. a coin/insert key opens select, while attract
  1/2 still direct-starts. Then the CTA and the select screen are not redundant.

Recommend **(a)** unless the ROM/owner wants a coin-up select step; either way the attract 1/2 press
must direct-start, which is the whole of this story. Coordinate the shared `main.ts` door with
jt11-16 (which also touches the title→start transition).

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

### AC-5 — the select screen's remaining role is coherent (per the Open question)
If (a): the redundant 1P/2P re-prompt is removed and a test pins that attract is the sole start path.
If (b): a distinct coin-up gesture opens select, and a test pins attract-1/2 still direct-starts.
Do not leave two mutually-contradicting start paths.

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
5. The select screen's remaining role is made coherent (removed, or gated behind a distinct coin-up
   gesture) — no contradictory dual start paths.

## Out of scope
- Numpad/click start sources (jt11-8, canceled) — do not revive here unless the owner asks.
- The title screen wiring (jt11-16) beyond sharing the `main.ts` start door.

---
_Authored by Architect (design). Evidence gathered against `plugins/joust/src/{core,shell}` and `src/main.ts` on 2026-08-13._
