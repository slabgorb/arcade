---
story_id: "bz3-7"
jira_key: "bz3-7"
epic: "bz3"
workflow: "tdd"
---
# Story bz3-7: RADAR SWEEP MECHANISM — the scanner computes a sweep angle but never uses it to gate blips

## Story Details
- **ID:** bz3-7
- **Jira Key:** bz3-7
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-18T01:06:19Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T01:06:19Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): the ROM cadence mismatch TEA flagged (sweep must NOT tick at the shell's 60 Hz sub-step, or it lands on the ruled-out 388 ms/rev) needed an actual wiring decision the spec didn't spell out: `stepRadar` takes no `dt`, so something has to fire it at exactly 15.625 Hz while `createLoop` drives `stepFrame` at a fixed 1/60 s. Resolved by giving `GameState` its own `radarClock` accumulator (mirrors `@arcade/shared/loop`'s `advanceFixedSteps` pattern, just at the ROM's own rate) inside a new `sim.ts` `advanceRadar(state, dt)` wrapper — called around `stepBattle`'s result in both the `attract` and `playing` branches of `stepGame`, never inside `stepBattle` itself (so none of its 3 return points needed touching). Worth the Reviewer double-checking the accumulator math (`RADAR_FRAME_SECONDS = 1/GAME_FRAME_HZ`, while-loop drains `radarClock`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): `drawRadar`'s existing test (`tests/shell/hud-palette.test.ts:131`) calls it with a bare `{bearing, range}` literal (no `brightness`), so the new blip param type is `RadarBlip & { readonly brightness?: number }` (optional) rather than requiring `LitBlip` — keeps that pre-bz3-7 test green without editing it, and `drawRadar` treats a missing brightness as full strength. *Found by Dev during implementation.*

### TEA (test design)
- **Improvement** (non-blocking): D-005's "world-unit threshold TBD from TRACK" is **resolvable** — the clone already carries `RADAR_RANGE = 32768 = 0x8000` (`src/shell/render.ts:74`), whose **high byte is exactly `0x80`**, the ROM's TDIST out-of-range threshold (BZONE.MAC:3977). So `range ≥ 0x8000 ⇔ TDIST ≥ 0x80`. The bug is not a missing value; it's that the shell **clamps** to that radius (`Math.min(b.range/RADAR_RANGE, 1)`, `render.ts:202`) instead of **dropping**. GREEN should lift `RADAR_MAX_RANGE = 0x8000` into core and drop past it. *Found by TEA during test design.*
- **Conflict** (non-blocking, for Dev/Reviewer): `docs/audit/findings/pair-radar.json` pins `ours:` line anchors into `src/core/radar.ts` (D-001 → line 58, D-005 → 87, D-002 → 88, D-003 → 98). Editing radar.ts in GREEN **will shift those lines and break `npm test -- citations`**. After the GREEN edit, re-anchor with `node tools/audit/reanchor-citations.mjs`, and set `remediated_by: bz3-7` **only** on the divergences actually removed (not on the CONFIRMED matches D-006/7/8). *Found by TEA during test design.*
- **Improvement** (non-blocking): SH-5 previously made the sweep a **cosmetic wall-clock render animation** (`sweepAngle(performance.now())`, `main.ts:234`). This story **reverses** that: the sweep is now deterministic core sim state that gates blips. GREEN must stop feeding `performance.now()` to the sweep and drive `stepRadar` once per game frame instead. *Found by TEA during test design.*
- **Question** (non-blocking): all four findings (D-001/002/003/005) verified CONFIRMED against BZONE.MAC with **no `remediated_by`, no REFUTATION/CORRECTION flips** — cluster-C7 labels are accurate as written. D-004 (ROM shows exactly ONE blip / TRACK) is `accept`, correctly **out of scope** for this story. *Found by TEA during test design.*

### Reviewer (code review)
- **Improvement** (non-blocking): `stepRadar` keys per-contact afterglow by **positional index** into `deriveRadar`'s output (`state.brightness?.[i]`). Sound under D-004 (one hostile at a time), but if the visible-contact list order ever changes between frames (e.g. a tank dies the same frame a missile spawns into slot 0), the new contact inherits the old one's afterglow. Cosmetic, single-hostile-unreachable today; when D-004 (one-blip-per-TRACK) is taken up, key brightness by a stable contact identity instead of index. Affects `src/core/radar.ts` `stepRadar`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Kept `deriveRadar` + `sweepAngle`/`SWEEP_PERIOD_MS`; added a new stepper instead of mutating them:** Spec says "gate the blip list with the sweep." Rather than change `deriveRadar`'s `{bearing,range}` return (which would break the 29 existing bz1-6 radar tests), tests pin a NEW frame-driven state machine (`initRadarState`/`stepRadar`) layered on `deriveRadar`, and only re-derive `SWEEP_PERIOD_MS` 2000 → 1489. Reason: preserve the existing pure-geometry contract; localise the mechanism change.
- **Max-range pinned as `RADAR_MAX_RANGE === 0x8000` (world units), not the raw `0x80` byte:** Spec/AC states "TDIST ≥ 0x80." `0x8000` is the smallest distance whose high byte reaches `0x80`, and equals the existing shell `RADAR_RANGE`. Reason: our core uses world-unit `hypot` distance, not the ROM's 16-bit magnitude; the value pin lives in its own test while the drop-mechanism tests stay value-agnostic (they use the exported constant).
- **Blip lifecycle asserted handedness-agnostically:** D-008 notes the byte-angle sign/handedness is NOT byte-verified. Tests therefore assert the OBSERVABLE pulse (peak 240, −8/frame decay, ~once-per-rev re-light, never continuous) rather than predicting the exact sweep byte at which a given bearing lights.

### Dev (implementation)
- **`RadarState.brightness` typed optional, not `readonly number[]`:** the map's spec suggested a plain array. Made it `readonly brightness?: readonly number[]` because the RED test file defensively casts the imported module `as RadarModule`, whose own local `RadarState` type is `{ sweep: number }` only — a required `brightness` field made that cast fail `tsc --noEmit` ("neither type sufficiently overlaps"). `stepRadar` treats a missing entry as brightness 0 (`state.brightness?.[i] ?? 0`); runtime behaviour is unchanged, only the public type got looser. Reason: satisfy the test file's static typing without editing the RED-committed test.
- **Per-frame relight/decay is if/else, not "relight then decay all" as the map's step (c)/(d) ordering literally reads:** read literally, "(c) re-light to 240; (d) decay ALL −8" would knock a just-relit blip to 232 the same frame, but the tests require `Math.max(...seq) === BLIP_PEAK` exactly. Implemented as: a contact in-window this frame → `brightness = BLIP_PEAK`; otherwise → decay. Matches the ROM's actual branch structure (a separate SET-vs-SBC path) and the "every transition is a −8 decay or a →240 re-light" test. Reason: the tests are the authority over the prose step ordering.
- **Radar's game-frame accumulator lives in `GameState`/`sim.ts` (`radar`, `radarBlips`, `radarClock` fields + `advanceRadar` wrapper around `stepBattle`'s result), not in the shell:** the map said "the shell drives `stepRadar` once per game frame," but `stepRadar` takes no `dt` and the shell's `createLoop` only offers a fixed 1/60 s sub-step (not the ROM's 64 ms). Keeping the accumulator inside core keeps `stepGame` a pure function of its arguments (the epic's standing architecture rule) and keeps the radar sweep part of the deterministic, replayable battle state instead of a shell-local mutable closure. The shell (`main.ts`) now only reads `game.radar.sweep` / `game.radarBlips` and converts byte-angle → radians for `drawRadar`. Reason: preserve determinism/testability of `stepGame`; avoid a second, shell-side source of sim truth.

### Reviewer (audit)
- **D-001/002/003/005 remediation ACCEPTED** — each `remediated_by: bz3-7` marker corresponds to a genuinely-removed divergence: D-001 sweep 2000→1489 (`SWEEP_PERIOD_MS` now derived from `GAME_FRAME_HZ`), D-002 afterglow (`BLIP_PEAK`/`BLIP_DECAY_PER_FRAME`), D-003 sweep-gating (`inWindow`), D-005 max-range drop (`RADAR_MAX_RANGE`). D-004 and the D-006/007/008 "Match" confirmations correctly carry NO marker. No phantom fix.
- **Reindent churn ACCEPTED** — `pair-cadence.json`, `pair-score-hud.json`, `pair-doc-reconcile.json` diffs are line-number + 2-space re-serialization only (verified via whitespace-insensitive JSON compare: zero content changes beyond `"line":`). `pair-radar.json`'s only non-line content change is the 4 `remediated_by` additions. `ours:` verbatims for the remediated findings are frozen historical quotes, unchanged, consistent with the citation gate's remediated-finding rule.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (15 failing — ready for Dev)

**Test Files:**
- `battlezone/tests/core/radar-sweep.test.ts` — 15 tests, ROM-cited, defensively loaded (mirrors bz1-6 `radar.test.ts` pattern). Committed `d4fa849` on `feat/bz3-7-radar-sweep-mechanism`.

**Tests Written:** 15 tests covering all 3 ACs.
- **AC-2 sweep rate (4):** `SWEEP_STEP_PER_FRAME === 11` (0x0B, :3895); `SWEEP_BYTE_TURN === 256`; `stepRadar` advances `state.sweep` by exactly +11 (mod 256) every frame incl. empty contacts; derived period `256/11/15.625*1000 ≈ 1489 ms/rev`, and `SWEEP_PERIOD_MS ≈ 1489`, NOT 2000, NOT the 60 Hz false-match 388.
- **AC-1 sweep-gate + afterglow (6):** `BLIP_PEAK === 240` (0xF0, :3947), `BLIP_DECAY_PER_FRAME === 8` (:4058), `BLIP_WINDOW === 12` (0x0C, :3945); afterglow `240/8 === 30` frames `≈ 1.92 s`; in-range target PULSES (peaks 240, fades between, <30% of frames at peak); every brightness transition is a −8 decay or →240 re-light with **nothing constant** (kills the continuous model), ~once-per-rev re-light + long decay tails; `stepRadar` deterministic & non-mutating.
- **AC-3 max-range drop (4):** `RADAR_MAX_RANGE === 0x8000` (32768; high byte 0x80, :3977); target beyond max **dropped** (no blip across a full rev — not edge-clamped); target within max **is** painted; boundary exclusive at top (`≥` drops).

**Proof RED:** `npx vitest run tests/core/radar-sweep.test.ts` → 15 failed / 15, each a clean contract error (`radar.ts must export a numeric SWEEP_STEP_PER_FRAME` … `RADAR_MAX_RANGE`, `initRadarState()`, `stepRadar()`). `tsc --noEmit` clean; `npm test -- citations` 12/12 green; existing `radar.test.ts` + `radar-purity.test.ts` 29/29 green (no regression).

**ROM citations verified** against `~/Projects/battlezone-source-text/BZONE.MAC` (LF, citable; .RADIX 16 region lines 3–4878 so 0B/0C/0F0/80 are hex): +0x0B sweep (:3895), SANGLE per-frame (:3898), [0,0x0C) gate (:3943 BMI / :3945 CMP I,0C), BLIP=0xF0 (:3947-3948), −8/frame (:4058-4059), TDIST≥0x80 drop (:3977 / EIRNGE :3980), DRADAR JSRed once/frame (:510). No REFUTATION/CORRECTION flips, no `remediated_by`.

### GREEN-phase guidance for Dev (Julia)

**Module:** `src/core/radar.ts` (core — must stay PURE; `radar-purity.test.ts` scans the whole file source text incl. comments for `window.`/`document.`/`Date.now`/`Math.random`/etc., so don't even name them). **Do not** touch `deriveRadar` geometry or the existing 29 tests.

1. **Add ROM constants** (all cited): `SWEEP_STEP_PER_FRAME = 11`, `SWEEP_BYTE_TURN = 256`, `BLIP_PEAK = 240`, `BLIP_DECAY_PER_FRAME = 8`, `BLIP_WINDOW = 12`, `RADAR_MAX_RANGE = 0x8000`. Give each a `// BZONE.MAC:NNNN` comment.
2. **Re-derive** `SWEEP_PERIOD_MS = SWEEP_BYTE_TURN / SWEEP_STEP_PER_FRAME / GAME_FRAME_HZ * 1000` (import `GAME_FRAME_HZ` from `./timebase`) → 1489.45. Keep `sweepAngle`/`SWEEP_PERIOD_MS` exported (existing tests + optional render use).
3. **Add the frame state machine** — the analog of ROM `DRADAR` (one call/frame):
   - `interface RadarState { readonly sweep: number /* byte-angle [0,256) */ }` + private per-target brightness carried across frames (single-target keying is fine — D-004: gameplay has one hostile at a time).
   - `interface LitBlip { bearing; range; brightness }`.
   - `initRadarState()`; `stepRadar(state, pose, contacts) → { state, blips }` that: (a) `sweep = (sweep + 11) mod 256` FIRST (before the target logic, per :3895); (b) run `deriveRadar` for bearing/range; (c) re-light `brightness = 240` for any target whose relative bearing is within `[0, 12)` byte-units trailing `sweep`; (d) decay ALL brightnesses `−8`/frame, floor 0; (e) **drop** (omit from `blips`) any contact with `range ≥ RADAR_MAX_RANGE` **and** any with `brightness ≤ 0`; return only lit, in-range blips. Pure — new state out, inputs untouched.
4. **Core/shell split:** all gating/afterglow/drop lives in core (above). The **shell** (`src/main.ts:231-236`, `src/shell/render.ts:159-207`) only renders: drive `stepRadar` once per game frame, draw the arm from `state.sweep`, draw each `LitBlip` at its `brightness`, and **remove the `Math.min(b.range/RADAR_RANGE, 1)` edge-clamp** (render.ts:202) — out-of-range blips no longer arrive. Stop passing `sweepAngle(performance.now())`.
5. **After editing radar.ts:** re-anchor audit citations — `node tools/audit/reanchor-citations.mjs` — then `npm test -- citations` must be green again, and set `remediated_by: bz3-7` on D-001/002/003/005 in `docs/audit/findings/pair-radar.json` (only those; not D-006/7/8).

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/radar.ts` — added the 6 ROM constants (`SWEEP_STEP_PER_FRAME`, `SWEEP_BYTE_TURN`, `BLIP_PEAK`, `BLIP_DECAY_PER_FRAME`, `BLIP_WINDOW`, `RADAR_MAX_RANGE`), re-derived `SWEEP_PERIOD_MS` from `GAME_FRAME_HZ` (2000 → ≈1489.45), and added `RadarState`/`LitBlip` + `initRadarState()`/`stepRadar()` — the pure, frame-driven DRADAR analog. `deriveRadar`/`sweepAngle` untouched.
- `src/core/state.ts` — `GameState` gained `radar: RadarState`, `radarBlips: readonly LitBlip[]`, `radarClock: number`; `initGame()` seeds them fresh.
- `src/core/sim.ts` — new `advanceRadar(state, dt)`: a 15.625 Hz accumulator (`RADAR_FRAME_SECONDS = 1/GAME_FRAME_HZ`) that calls `stepRadar` off the already-stepped `enemies`/`saucer` contacts and the post-move `player` pose. Wrapped around `stepBattle`'s result in both the `attract` and `playing` arms of `stepGame` (gameover/entry freeze the radar along with everything else, unchanged).
- `src/main.ts` — `renderFrame` now reads `game.radarBlips` and converts `game.radar.sweep` (byte-angle) to radians for `drawRadar`; dropped the `deriveRadar`/`sweepAngle(performance.now())` call and its now-unused imports (`deriveRadar`, `sweepAngle`, `radarContacts`, `saucerContacts`).
- `src/shell/render.ts` — `drawRadar`'s blip param widened to `RadarBlip & { readonly brightness?: number }`; each dot's `ctx.globalAlpha` now follows `brightness/BLIP_PEAK` (reset to 1 after the loop) so blips visibly pulse; deleted the `Math.min(b.range/RADAR_RANGE, 1)` edge-clamp (D-005) — range is stroked as-is since core now drops anything ≥ `RADAR_MAX_RANGE` before it ever reaches the shell.
- `docs/audit/findings/pair-radar.json` — `remediated_by: "bz3-7"` set on D-001, D-002, D-003, D-005 only; their `ours` citations are frozen historical quotes (unchanged, per the citation gate's own rule for remediated findings).
- `docs/audit/findings/{pair-cadence,pair-doc-reconcile,pair-score-hud}.json` — line numbers re-anchored by `node tools/audit/reanchor-citations.mjs --write` for citations whose target lines shifted (C-002/003/004/006/010, B-022, D-004/006/007/008, S-018/S-024); text unchanged for all of these. Note: the tool re-serializes any file it touches at 2-space indent, so these three show as large diffs — only line numbers actually changed (known tool behaviour, not a content edit).

**Tests:** 858/858 passing (GREEN) — all 15 new `radar-sweep.test.ts` tests, the 29 pre-existing `radar.test.ts` + `radar-purity.test.ts` tests, and the full suite including `core-purity-sweep.test.ts` and `citations.test.ts` (12/12). `tsc --noEmit` clean. `npm run lint` clean.
**Branch:** `feat/bz3-7-radar-sweep-mechanism` (pushed)

**For the Reviewer to scrutinize:**
- The `advanceRadar` accumulator in `sim.ts` (the loop-wiring) — confirm the 15.625 Hz cadence is actually decoupled from the 60 Hz sub-step and can't drift (it can't: `dt` is always a fixed `1/60` from `createLoop`, well under the 0.064 s threshold, so the `while` fires 0–1 times per call).
- The deleted `render.ts:202` edge-clamp — confirm nothing else still relies on out-of-range blips being clamped rather than absent (checked: `RADAR_MAX_RANGE = 0x8000` exactly equals the pre-existing shell `RADAR_RANGE`, so the visual scope radius is unchanged).
- `RadarState.brightness` made optional at the type level for the RED test file's defensive cast (Design Deviations above) — worth confirming this doesn't mask a real bug path (it doesn't: `stepRadar` always populates a real array; `?? 0` only matters for the very first frame of any never-before-seen index, which is correctly "unlit").
- `drawRadar`'s widened blip type (`brightness?`) — the pre-bz3-7 `hud-palette.test.ts` call still exercises the no-brightness path; worth eyeballing that a real game frame never accidentally takes that path (it can't: `main.ts` always passes `LitBlip[]`, which always carries `brightness`).

**Handoff:** To Reviewer.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** enemy/saucer world positions → `radarContacts`/`saucerContacts` (sim.ts `advanceRadar`, off the already-stepped battle state) → `stepRadar` (byte-angle sweep +11/frame, `[0,0x0C)` trailing-window relight to 240, −8/frame decay, drop range ≥ `0x8000`) → `game.radarBlips` → `drawRadar` (main.ts converts `sweep` byte→radians; render.ts strokes each dot at `globalAlpha = brightness/240`). Safe end-to-end: the only path that produces blips is `stepRadar`, which drops out-of-range contacts before they reach the shell, so the removed `render.ts:202` edge-clamp has nothing to clamp.

**DRADAR ordering conclusion (judgment call #1 — settled against the assembler):** Julia is **correct**; the tests are ROM-faithful. In `BZONE.MAC` DRADAR the blip is DRAWN (`LDA BLIP; AND I,0E0; JSR VGDOT`, :4036-4038) *before* the `SBC I,8` decrement at DR.BLP (:4058-4059). The relight `LDA I,0F0; STA BLIP` (:3947-3948) therefore reaches the screen at exactly 0xF0=240 on the pass frame; the −8 only affects the NEXT frame's displayed value. So the ROM's displayed sequence is 240, 232, 224, … — exactly what Julia's if/else `next = inWindow ? 240 : max(0, prev−8)` produces (verified for 1- and 2-frame window straddles). The map prose's "literal order knocks a just-lit blip to 232 the same frame" conflated the BLIP *variable* mutation order with the *display* order; draw-before-decrement means the observable peak is 240. `Math.max(...seq) === BLIP_PEAK` is the right assertion.

**Cadence/purity (judgment call #2):** deterministic and replayable. `advanceRadar` accumulator lives in `GameState.radarClock`; `createLoop` feeds a fixed `dt = 1/60` (confirmed in `@arcade/shared/loop`), always < `RADAR_FRAME_SECONDS = 1/15.625 = 0.064`, so the `while` fires 0–1×/call — no drift, no double-step. `stepGame` stays pure (spread-return, no mutation); `radar-purity.test.ts` scans the full `radar.ts` source (comments included) for wall-clock/DOM/randomness/type-escapes and passes.

**Edge-clamp deletion (judgment call #3):** safe. `RADAR_MAX_RANGE = 0x8000` equals shell `RADAR_RANGE = 32768`; the drop is strict `<`, so every surviving blip has `range/RADAR_RANGE < 1`. `game.radarBlips` is the sole production feed to `drawRadar` (only other caller is a test literal). Out-of-range targets truly drop — no blip across a full revolution (AC-3 tests confirm).

**Citation honesty (judgment call #4):** `remediated_by: bz3-7` sits on exactly D-001/002/003/005 (all genuinely fixed); D-004 and D-006/007/008 unmarked. The three reanchored JSONs are line-number/reindent only (whitespace-insensitive JSON compare = zero content diff); `pair-radar.json`'s only content change is the 4 markers. No phantom fix.

**Type calls (judgment call #5):** `RadarState.brightness?` and `drawRadar`'s `RadarBlip & {brightness?}` are deliberate accommodations for pre-existing tests. Runtime always populates a real `brightness` array / passes `LitBlip[]`; the `?? 0` / `?? BLIP_PEAK` fallbacks are only reachable by test literals, never a real game frame. No harmful invariant weakening.

**Error handling:** no null-input path; `deriveRadar` tolerates empty contacts; `state.brightness?.[i] ?? 0` correctly treats a first-seen index as unlit; `Math.max(0, prev−8)` floors decay. No swallowed errors.

**Pattern observed:** fixed-step accumulator (`sim.ts:246-268`) mirrors `@arcade/shared/loop`'s `advanceFixedSteps` at the ROM's own 15.625 Hz — correct reuse of an established pattern.

**Security:** N/A — deterministic offline game core, no I/O, no auth surface, no secrets.

**Observations:** (1) DRADAR ordering verified in Julia's favor against the citable assembler. (2) Accumulator deterministic, fixed dt, no drift. (3) Edge-clamp deletion safe; out-of-range drop end-to-end. (4) Citation markers honest, churn formatting-only, 12/12 green. (5) Positional brightness-carry is the one latent wrinkle — LOW, unreachable under D-004's single-hostile reality, logged as a non-blocking finding for the future D-004 story. (6) Type looseness is test-scoped, not invariant-weakening.

**Independent verification (my own run):** `npx vitest run` → 62 files / **858 passed, 0 failed**; `npx tsc --noEmit` → exit 0; `npm test -- citations` → **12/12**; `npm run lint` → clean.

**Findings by severity:** Critical 0 · High 0 · Medium 0 · Low 1 (positional brightness-carry, non-blocking).

**Handoff:** To SM for finish-story.
