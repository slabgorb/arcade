# Story cp2-13 Context

## Title
Per-round colour cycling — transcribe the ROM's per-wave palette and apply it on wave change

## Metadata
- **Story ID:** cp2-13
- **Type:** feature
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** centipede
- **Epic:** Centipede — the train (MOTION/OBSTAC/NEWHD/EXPLOD, poisoned dives, death + RESTOR) + cp1 escape fixes

## Problem
USER-REPORTED (2026-07-19): colours should change per round, as the arcade does. Pulled forward from cp4 by user instruction (the wave-1 loop shipped in cp2-5, so rounds already advance). ROM ANCHORS (verified 2026-07-19): the cycle is the LCOLOR index (CENDE4.MAC:208, one byte per player) advanced in the IRQ at CENIR4.MAC:310-325 — '+3 per wave' stepping through the 42-byte (decimal, CMP I,42.) triple-table 99$ (CENTI4.MAC:898-901), wrapping to 0 → exactly 14 distinct palettes cycling by round. The advance flag (bit7, ORA I,80) is set at new-wave CENTPC (CENTI4.MAC:461-463 ';TIME TO CHANGE COLORS'); 2-player swap uses bit6 (:715-717); game start resets to scheme 0 (INITSC :1201-1209 → JSR CLRCH with X=0). CLRCH (:879-895) loads 99$[X],[X+1],[X+2] into the COLORR pens (body/legs/eyes + mushroom/gun/alphanumerics — static mapping already claimed CL-1..CL-11; CL-11 explicitly deferred THIS cycling, which this story now claims). 0x06/0x07 RESOLVED AT THE TABLE: 99$ contains exactly one 0x06 (CENTI4.MAC:900, scheme X=30, the [X+2] eyes/mushroom-outline/alphanumerics pen) and NO 0x07 anywhere — the ROM stores 0x06; the decode to RGB is adapter policy (MAME centiped_v.cpp:211 corroboration per CL-1/CL-10). Any 0x07 in our CLRCH transcription is uncited and must be corrected to 0x06 with citation. Deterministic: colour = pure function of wave number + player; no rng.

## Technical Approach

**Current colour code (surveyed 2026-07-19, pre-implementation):**

- `src/shell/palette.ts` is the ONLY colour module. `decodeClrchColor(nibble)`
  is the hardware resistor-DAC decode (adapter policy, MAME
  `centiped_v.cpp:211` corroboration, CL-1). `PLAYFIELD_PENS`/`SPRITE_PENS`
  are two **hardcoded 4-element arrays**, each entry a literal
  `decodeClrchColor(0x0d|0x00|0x0e|0x0f)` call — i.e. only **scheme 0**
  (99$[0..2] = `[0x0D, 0x00, 0x0E]`, CL-9) is transcribed. There is **no 99$
  table object in code at all** — no array of 14 schemes, no advance
  index, nothing to index by wave. This story adds the table and the
  wave→scheme lookup from scratch; it does not edit an existing broken one.
  `rgbCss()` is the only place a colour becomes a canvas literal string —
  the AC-3 "no invented colours" denylist scan (cp1-6) presumably still
  scans for CSS keywords/hex/rgb literals outside this path, so a new
  `SCHEME_TABLE` of raw nibbles run through the existing `decodeClrchColor`
  stays clean under that scan; do not invent RGB literals in the new table.
- **0x07 check (story mandate): NONE FOUND.** Grepped
  `src/shell/palette.ts`, `docs/rom-study/claims/08-render-color.json`,
  and the whole `src/` tree for `0x07`/`0X07` — the only `07` hits anywhere
  in the claims corpus are unrelated (RESTOR's `FRAME & 0x07` cadence in
  `06-playfield-mushrooms.json`, a pointer bound `CMP I,07` in
  `09-centipede-train.json`). **Existing code contains zero colour nibbles
  at all beyond scheme 0's three** (`0x0d`, `0x00`, `0x0e`, plus background
  `0x0f`) — none of which is `0x07`. So there is nothing to *correct*
  0x07→0x06 in; the mandate instead falls on **this story's own new 99$
  transcription**: when TEA/Dev type in the 42-byte table from
  `CENTI4.MAC:898-901`, the byte at scheme X=30 (`[X+2]`, the
  eyes/mushroom-outline/alphanumerics pen) must be entered as `0x06` — get
  it right the first time rather than "correcting" a pre-existing error
  that doesn't exist yet. CL-11 already flags the deferral in its own
  words: *"Scheme index advances per wave (CENIR4.MAC:325 JSR CLRCH — out
  of scope until cp4)"* — this story is that promised follow-up (pulled
  forward from cp4).
- **`SimState.wave` (core, `src/core/sim.ts`):** starts at `1`
  (`createSim`, line ~98), advances by exactly `wave: state.wave + 1` on a
  wave-clear transition (line ~276, cp2-5's wave loop / cp2-10's
  factory-inclusive clear). It is a plain field on the stepped, pure sim
  state — read-only from the shell's point of view, already exactly the
  input this story's palette lookup needs (`wave` + player, no new core
  field required).
- **Hook point — shell only, no core changes expected (confirmed):** the
  palette module is 100% shell-side (`src/shell/palette.ts`), consumed by
  `src/shell/render.ts` via the two hardcoded pen arrays. The natural shape
  is a pure function `schemeForWave(wave: number): [number, number,
  number]` (or `colorIndexForWave`) that reproduces the ROM's `+3
  wrap-at-42` stepping (`floor over waves` — confirm exact per-wave vs.
  per-death semantics against CENIR4.MAC:310-325 before coding: the IRQ
  advances a *flag-gated* index, not a raw `wave*3`, so a naive
  `(wave-1)*3 % 42` needs to be checked against the bit7/CENTPC trigger
  and the bit6 2-player-swap semantics, not assumed), then
  `render.ts` calls it with `state.wave` (and `state.player` if a 2-player
  swap is ever modeled — this clone is 1-player only per cp2-12's Sm
  Assessment, so bit6 is likely quarry-only, not implemented) each frame
  instead of importing the static `PLAYFIELD_PENS`/`SPRITE_PENS` constants
  directly. `PLAYFIELD_PENS`/`SPRITE_PENS` likely become functions of the
  scheme index rather than module-level constants — a design question for
  TEA: keep them as arrays indexed by scheme (`SCHEMES[wave-1 mod 14]`)
  computed once at table-definition time (14 precomputed RGB triples,
  cheapest and keeps `render.ts` a one-line lookup change) vs. a decode
  call per frame (also fine, `decodeClrchColor` is cheap and pure). Either
  way: **colour = pure function of wave number (+ player) — confirmed, no
  RNG, no core-state widening, no `SimState` changes anticipated.**
- **AC-2 screenshot pair (wave 1 vs wave 2) — reachability flag:** the live
  shell (`src/main.ts`) has **no debug/dev key, no level-skip, no seed
  override** exposed to the browser — `createSim()` is called with no
  wave-jump hook (confirmed by grep: no `debug`/`seed`/`skipWave` handling
  in `main.ts`). The ONLY way to reach wave 2 in *live play* (as AC-2
  literally requires, distinct from AC-1's explicitly-permitted
  "debug-seeded wave state" for the pinned unit tests) is to actually clear
  wave 1 — kill all 12 live segments (cp2-5/cp2-10's wave-clear condition,
  now factory-head-inclusive) — through real input, which Playwright MCP
  can attempt (rapid-fire the shot at each segment) but is nontrivial and
  slow with no dev shortcut. Flagging for TEA/Dev to decide between: (a)
  earn it via a scripted Playwright play-through, (b) add a minimal,
  explicitly-scoped debug hook (e.g. a `?wave=2` query param or a hidden
  keybind) if the team judges that within this story's shell-only surface,
  or (c) revisit whether AC-2's "in live play" phrasing tolerates the same
  debug-seed leniency AC-1 states outright — this is a scope call, not
  mine to make in setup.
- **Port-ownership trap (repeat of cp2-12's note, still live):** the dev
  port (5278, or whichever spare port is used) may be bound to a *sibling
  checkout* (`a-2`/`a-3`), not this tree — verify with
  `PID=$(lsof -ti tcp:<port> | head -1); lsof -a -p "$PID" -d cwd -Fn |
  grep '^n'` before trusting a screenshot, or serve this checkout on an
  explicit spare port (`npx vite --port <spare> --strictPort`) rather than
  risk capturing someone else's code.

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- The LCOLOR advance (+3, wrap at 42, 14 palettes; bit7 trigger at CENTPC) transcribed with radix-cited comments + claims entries filling CL-11's deferral; citations green; colour = pure function of wave number + player, pinned across at least waves 1-4 and the wrap at palette 14 (debug-seeded wave state acceptable).
- On wave change in live play the field/enemy colours visibly change per the ROM's cycle; screenshot pair (wave 1 vs wave 2) from THIS checkout committed.
- The clone's CLRCH table matches 99$ byte-for-byte (one 0x06 at scheme X=30, NO 0x07 anywhere — any 0x07 is uncited and corrected); no invented colours (the denylist scans stay green).

---
_Generated by `pf context create story cp2-13` from the sprint YAML._
