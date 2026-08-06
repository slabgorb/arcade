# mc2 — Missile Command: ground truth + the guardrail that comes before gameplay

**Architect design doc.** Successor to the `mc1` skeleton (boot → field → cursor →
fire→blast, archived 2026-08-06). Ground truth: [`../rom-study/brief.md`](../rom-study/brief.md).
Owner decision (2026-08-06): **fidelity guardrail first**, gameplay epics behind it.

## Why the dossier is the next leg, not enemies

The skeleton hardcodes real cited constants — but every citation lives in a **code
comment**, checked by nobody. `field.ts` CITIES/BASES, `cursor.ts` IHMIN/IHMAX/IVMIN/
IVMAX, `explosion.ts` EXDONE, `abm.ts` velocity, `render.ts` LOGICAL_HEIGHT: all
faithful, none enforced. The moment mc3 (enemies) and mc4 (waves/scoring) land, that
comment-only surface multiplies — ICBM speed-per-wave, MIRV split, score multiplier,
city bonus, colour cycle. The fleet's entire scar history is what happens next:
tempest, red-baron and star-wars all paid for **citation drift and reanchoring** after
the constants were already written (see the sprint's memory sidecars). The sprint goal
is *ROM fidelity*. So we install the checker **before** the big constant surface, and
write mc3/mc4 constants *under* it instead of retrofitting them.

Two open questions are also **hard prerequisites** for mc3 and belong here: O-2 (the
exact sim tick — the time unit enemy descent speed is expressed in) and O-4 (the actual
starting-city count — how many cities you defend and when the game is lost).

## Reuse-first: copy the raster siblings, invent nothing

Missile Command is the joust/centipede shape (raster, 6502+POKEY). Both siblings
already carry the dossier machinery this epic stands up — **copy their shapes, do not
design new ones**:

- `plugins/joust/tools/audit/check-citations.mjs` + `plugins/centipede/…` — the
  citation checker.
- `plugins/joust/tests/helpers/claims.ts` — the claim loader/asserter.
- `plugins/joust/docs/rom-study/{subsystems.md, glossary.md, claims/}` +
  `plugins/centipede/…` — the source-of-record docs and the per-claim JSON.

No `src/shared` extraction. No new pattern. This epic is a **port of an existing
guardrail onto an existing skeleton**, plus three source-reading resolutions.

## The three traps this epic runs straight into

1. **W3MAIN is double-spaced** — cite by *logical* (non-blank) line, ≈ physical/2; the
   checker must resolve `.SBTTL`/symbol logical lines, not physical offsets. (memory:
   `mc-w3main-cite-double-spaced`)
2. **Radix** — `.RADIX 16` at `W3COMN.MAC:1`, inherited everywhere; a bare number is
   HEX, a trailing `.` is DECIMAL (`MAXMIS=10.` vs `CITY2H=0B4`). The checker must be
   radix-aware or it will flag every correct hex claim.
3. **`grep -a`** — the vendored `.MAC` are CR-terminated / non-UTF8; a naive grep reads
   them as binary and returns false-empty.

## Stories

### mc2-1 — Citation checker + claims format, guarding the skeleton — 5pt
Port joust/centipede's `tools/audit/check-citations.mjs` + `tests/helpers/claims.ts`
into `plugins/missile-command/`. Establish `docs/rom-study/claims/*.json`. Retrofit
**every** constant the skeleton hardcoded into a claim the checker verifies against the
vendored `reference/source/*.MAC`. This is the guardrail — from here, no un-cited magic
number enters core.

- **AC1** `tools/audit/check-citations.mjs` + `tests/helpers/claims.ts` exist, adapted
  from the joust/centipede shape; a `claims/*.json` set encodes each skeleton constant
  as `{symbol, value, module, line, meaning}`.
- **AC2** The checker reads the vendored source and **fails** when a claimed
  symbol/value/line disagrees with it — radix-aware (hex default, trailing-`.`
  decimal), W3MAIN logical-line-aware, `grep -a`-safe. Proven by a deliberately-wrong
  claim reddening it, then reverted.
- **AC3** Every constant currently hardcoded in `src/core` and `src/shell`
  (`field.ts`, `cursor.ts`, `explosion.ts`, `abm.ts`, `render.ts`) is represented by a
  claim; a guard test asserts no un-cited numeric literal remains in `src/core`.
- **AC4** Wired as a `missile-command` vitest surface; `npx vitest run --project
  missile-command`, `npm run lint`, `npm run test:orchestrator` all green.

### mc2-2 — subsystems.md + glossary.md source-of-record — 3pt
Expand `brief.md`'s subsystem map and constant table into the two standing reference
docs (joust/centipede shape).

- **AC1** `docs/rom-study/subsystems.md` lists every subsystem from `brief.md`'s map
  with its module + `.SBTTL` line anchor and a one-line behaviour, cross-checked
  against the vendored source.
- **AC2** `docs/rom-study/glossary.md` defines every `W3COMN` constant in `brief.md`'s
  table **plus** those surfaced while resolving O-2/O-4 (e.g. `MXICON`, `MAXMUL`,
  `SPUTWV`, `MIRVWV`, `STUPID`, `LAUHGT`, `SCITYM`), each with as-written value,
  decoded value, radix note, meaning, and line — under the mc2-1 checker where
  mechanically checkable.

### mc2-3 — O-2: pin the exact sim tick from W3INT — 3pt
Read `W3INT.MAC` in full; derive the game-logic tick from the interrupt handler and the
`FRAME` counter, reconciled against MAME's 61.0076 Hz + 4-IRQ/frame model
(`missile.cpp:485–497,528–532`). **Unblocks mc3 enemy descent speed.**

- **AC1** A `docs/rom-study` note derives the sim tick — which IRQ advances game logic,
  how `FRAME` increments — cited to `W3INT` lines and the `missile.cpp` anchors; exact
  Hz and ticks/frame recorded, nominal-60 fallback documented.
- **AC2** The tick is encoded as a claim/const that `shell/timebase.ts` (or a core
  constant) consumes, replacing any nominal-60 placeholder; **O-2 marked resolved** in
  `brief.md`.

### mc2-4 — O-4: pin the actual starting-city count — 2pt
Resolve `NCITY=6` (max) vs `SCITYM` "5 cities at start" vs MAME's 6-city dip default:
read where the option is consumed at setup (`W3MAIN:281 SETUP STATE`, `:1916 NEW GAME
SETUP`). **Needed by mc3 damage/end-game.**

- **AC1** A `docs/rom-study` note pins the REV-01 default starting-city count, citing
  where `SCITYM`/`NCITY` are read at setup and documenting the option-2 "5 cities"
  path; **O-4 resolved** in `brief.md`.
- **AC2** The starting count is a cited claim `field.ts` (or a setup/wave module) can
  consume in mc3.

### mc2-5 — O-1: decode the A35820.1C binary object — 2pt
Decode / identify `reference/source/A35820.1C.bin` (present in the CPU link, not yet
identified) so the module inventory is provably complete.

- **AC1** `A35820.1C.bin` is identified — what data/ROM it is and its role in the
  link — with the decode method recorded; `PROVENANCE.md` and `brief.md` updated;
  **O-1 resolved**.

**Not stories.** O-3 (REV-01 vs MAME REV-03 behavioural deltas) is a *running* open
question — catalogue deltas as they surface in mc3/mc4, don't try to enumerate them
now. O-5 (palette / per-wave colour cycle, `W3DSUP:792`) belongs with mc4's render/wave
work, not here.

**Epic size:** 5+3+3+2+2 = **15 pt** — parallel to mc1.

## Roadmap beyond mc2 (the gameplay epics, now built on the guardrail)

- **mc3 — The threat loop (a game you can lose).** `game.ts` grows the state machine
  (ATTRACT / PLAY / END-WAVE / END-GAME — `W3MAIN:238,270,281,1916,2074,2308`);
  `enemy.ts` (ICBM spawn/descent/targeting `W3MAIN:722,1137`; MIRV split `:1342`);
  `damage.ts` (blast kills incoming, a hit destroys a city/base `W3MAIN:963,1084`);
  losable — all cities gone → END-GAME. Consumes mc2-3's tick and mc2-4's city count;
  every new constant written under the mc2-1 checker.
- **mc4 — Waves + scoring + colour.** `wave.ts` (per-wave ICBM count/speed
  `W3MAIN:1951,2025`, colour cycle `W3DSUP:792` + the O-5 palette); `score.ts` (points ×
  `MAXMUL=6`, city bonus `:2162`, regenerate cities `:2383`); high-score ladder + name
  entry via `@shared/highscore`+`name-entry` (`W3DSUP:1862,2032`).
- **Later, single-purpose epics.** Attract mode + scroll (`W3MAIN:446,2639,2666`);
  audio bake (POKEY sfx — **asset ≠ green test**: acceptance is a live 200 on the
  bucket, and *file the story*, don't let a Delivery Finding die in the archive);
  exotic threats (cruise missiles `STUPID` wave 9, Sputnik `SPUTWV` wave 2, MIRV/smart
  tuning).

## Handoff

To **Grand Admiral Thrawn (SM)**: mc2 is five stories, ~15 pt, one epic. mc2-1 is the
keystone (the checker every later story leans on) and should land first; mc2-3 and mc2-4
are the source-reading resolutions mc3 blocks on. Copy the joust/centipede dossier
shapes — this epic invents no new machinery.
