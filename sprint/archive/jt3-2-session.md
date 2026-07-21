---
story_id: jt3-2
jira_key: jt3-2
epic: jt3
workflow: tdd
---
# Story jt3-2: Bridge + cliff destruction — TBRIDGE wave-3 burn, high-nibble cliff destruction as behaviour, arena mutation, second-variant + wave-numbering trace

## Story Details
- **ID:** jt3-2
- **Jira Key:** jt3-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-21T14:20:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T14:20:43Z | - | - |

## Story Summary

jt2-5 recorded the wave table's HIGH NIBBLE (cliff destruction, JOUSTRV4.SRC:185-192) as DATA; this story makes it BEHAVIOUR. The bridge burns after wave 3 (TBRIDGE, JOUSTRV4.SRC:954-957): its solid-fill (JOUSTRV4.SRC:1126-1127, jt1-4) is removed and the landing/background-collision geometry mutates so an entity no longer lands or bounces on the gone bridge. High-nibble cliff destruction mutates the NAMED cliff's surfaces per wave.

## Acceptance Criteria

- The bridge burns on the cited wave: its solid-fill is removed and an entity that would have landed/collided on the bridge no longer does; the wave-numbering trace (JOUSTRV4.SRC:4719 vs TBRIDGE/TTROLL) is documented in the story notes.
- High-nibble cliff destruction mutates the named cliff's landing + background-collision geometry per the transcribed table; claims entries; citations suite green.
- The cliff second-variant consumer is traced: either this destruction path consumes it (wired + cited) or it is documented as still-unfound/dead with the evidence (open-questions §5 updated).
- Determinism: a seeded run through the wave-3 bridge burn and a cliff-destruction wave replays bit-for-bit; purity guard green.

## Technical Approach

### Wave Destruction Mechanics

**TBRIDGE wave-3 burn:** The bridge exists as a navigable platform in waves 1-3 and burns away after wave 3 (TBRIDGE value: JOUSTRV4.SRC:954-957). This is a one-time arena mutation driven by a wave event, not a per-frame check.

### High-Nibble Cliff Destruction

The wave table's high nibbles (JOUSTRV4.SRC:185-192) encode cliff destruction behaviours per wave. For each cliff, the high nibble determines the surface-type mutations:
- Landing surface mutation
- Background-collision surface mutation
Each cliff is named in the wave table and destruction is keyed by that name.

### Architecture: Arena Mutation Through Events

Arena mutation must go through the wave event system, NOT by unfreezing jt1-5's frozen arena exports. If needed, add a mutable arena-state seam (e.g., a runtime table keyed by wave) that the event handler updates.

### Trace Obligations

**(1) Cliff second-variant records:** Every cliff record has a variant one scanline shorter (JOUSTI.SRC:54/55 et al.; open-questions §5, "consumer NOT FOUND, possibly an erase variant"). This destruction path is the prime suspect consumer. Trace it and record the finding:
- If it IS the consumer: wire it, cite the usage, and prove the variant applies per the wave table's destruction nibble.
- If it is NOT the consumer or still unfound: document the evidence and update open-questions §5.

**(2) TBRIDGE/TTROLL wave-numbering vs '1ST, 2ND, OR 3RD WAVE?' comment:** The JOUSTRV4.SRC:4719 comment says "1ST, 2ND, OR 3RD WAVE?" but the arithmetic of TBRIDGE (wave 3) and TTROLL (wave 4, jt3-2 gates jt3-3) needs to be verified against that comment's context. Trace it and document the finding in story notes.

### Purity & Determinism

- No wall-clock calls in core (purity guard).
- Seeded playthrough through wave 3 bridge burn + a cliff-destruction wave replays bit-for-bit.

### Constants & Citations

Every constant must carry:
- Radix citation (Motorola syntax: bare DECIMAL, $ hex, @ octal, % binary)
- Fully-qualified FILE:LINE claim from the vendored source tree

### Constraints

- Do NOT invent ROM citations — copy them verbatim from the epic YAML / design spec only.
- Do NOT unfreeze jt1-5's frozen arena exports — mutate through events.
- Arena state seam is OK if needed; purity must hold.

## Delivery Findings

### TEA (test design)

- **TRACE §4 — wave numbering (RESOLVED)** (non-blocking): The `:4719` "1ST, 2ND,
  OR 3RD WAVE?" comment reads `TTROLL`, and `:2202` "1ST, OR 2ND WAVE?" reads
  `TBRIDGE` — both are COUNTDOWNS gating the `EMYTIM`=2 early-game enemy slowdown
  after a player death (`LDA <ctr> / BEQ / LDA #2 / STA EMYTIM`), NOT wave numbers.
  `TBRIDGE` (seeded 3, `JOUSTRV4.SRC:955`) is pre-decremented once per inter-wave
  pass in `IWAVE2` (`:1934-1936`) BEFORE `WAVBCD` increments (`:2001-2004`), so it
  reaches 0 — `JSR STBRID` burns the bridge (`:1938`) — as **wave 3** begins
  (present in waves 1-2, gone from wave 3; = `arena.BRIDGE_WAVE`, matches the
  `wave >= 3` hook). `TTROLL` (seeded 1) reaches 0 as **wave 4** begins
  (`TTROLL = TBRIDGE + 1`, the jt3-3 gate). The comments are ACCURATE once the
  pre-decrement is accounted for; the "don't obviously agree" tension is closed.
  open-questions §4 updated. *Found by TEA during the jt3-2 trace.*
- **TRACE §5 — cliff second variant (RESOLVED, prime suspect FALSIFIED)**
  (non-blocking): Every cliff record is a 4-word DMA block followed by a 3-word
  variant one scanline shorter with its collision pointer dropped
  (`JOUSTI.SRC:54/55`=`$1107`→`$1106`; `:78/79`=`$1807`→`$1806`;
  `:106/107`=`$2C09`→`$2C08`). jt3-2's destruction path was the prime suspect
  consumer — the trace FALSIFIES it. Cliff destruction runs entirely through the
  `LNDXD1`/`BCKXD1` RAM bit-tables (`WCLFEW`, `JOUSTRV4.SRC:2301-2325`) and the
  `CLFDES` crumble animation (`:4562-4599`); neither reads the shorter variant.
  Every game-code reference to a destructible cliff targets offset 0 — no line
  computes `CLIFxx+8`, so nothing reaches the variant. Consumer STILL NOT FOUND;
  it stays an unconsumed erase-variant candidate. open-questions §5 updated;
  pinned by `tests/arena-destruction-source.test.ts`. *Found by TEA during trace.*
- **Improvement** (non-blocking): The cliff-destruction table (`WCLFTB`,
  `JOUSTRV4.SRC:2407-2414`) decodes cleanly as
  `FCB <statusBit>,<landingBit>,<backgroundBits>` + `FDB <cliffPic>,<transporter>`.
  The three FCB bytes ARE the geometry mutation (landing bit + background bit
  cleared from the RAM tables); the FDB pair (crumble picture + transporter
  disable) are jt3-later. jt3-2 transcribes only the FCB triple. *Found by TEA.*

### Dev (implementation)

- **Built the seam; TEA's CLIFF_DESTRUCTION mapping re-derived cleanly**
  (non-blocking): Created `src/core/arena-state.ts` — a mutable per-run
  `ArenaState` (`bridgeBurned`, `destroyedCliffs`, `destroyedLandingBits`,
  `destroyedBackgroundBits`) with `applyWaveDestruction(state, wave, status)`,
  `groundOutcomeInState`, `bridgeGroundOutcome`, `backgroundActive`,
  `initialArenaState`, `CLIFF_DESTRUCTION`, `SECOND_VARIANT_TRACE`. I independently
  verified TEA's WCLFTB re-derivation against the vendored source (`JOUSTRV4.SRC`
  equates :189-192 + table :2405-2415): CLIF1L `FCB WBCL1L($10),$01,$03`, CLIF1R
  `$20,$00,$00`, CLIF2 `$40,$02,$04`, CLIF4 `$80,$10,$40` — matches byte-for-byte,
  no correction needed. Bridge LATCHES via OR of prior state (not a bare
  `wave >= 3`); cliffs REFLECT `status & $F0` (recomputed each wave, so a rebuild
  drops them). *Found by Dev during implementation.*
- **Frozen exports stayed frozen; determinism holds** (non-blocking): The module
  IMPORTS arena.ts's frozen `PLATFORMS`/`BRIDGE_WAVE`/`groundOutcome` and never
  writes through them — `groundOutcomeInState` VETOES a destroyed cliff's landing to
  airborne rather than mutating any table. The AC-4 tests confirm `PLATFORMS` stays
  `Object.isFrozen` + JSON-unchanged, the arg state is untouched, and a seeded
  wave-1→wave-3-burn→cliff-destruction→rebuild sequence replays bit-for-bit. Purity
  scanner sweeps the new module clean. *Found by Dev during implementation.*
- **Call-site wired minimally onto DemoState (the wiring TEA left to Dev)**
  (non-blocking): Per SM's instruction to "wire the wave event", `DemoState` now
  carries `arena: ArenaState` (parallel to `budget`), seeded from wave 1 in
  `createWaveDemo` and re-applied on each wave advance in `stepDemo`. This is
  UNPINNED by tests (TEA pinned the reducer, not the call site) — flagged for
  Reviewer. It is demo-local and the demo determinism tests (self-compare via
  `JSON.stringify`) stay green. jt3-3 (troll gate) and jt3-7 (render) will READ this
  field. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking for jt3-3, non-blocking for jt3-2): the `DemoState.arena`
  call-site in `createWaveDemo`/`stepDemo` (`src/core/demo.ts:345,583`) is
  UNPINNED — deleting the per-wave `applyWaveDestruction` line leaves all 1145
  tests green (confirmed by mutation). It is also WRITE-ONLY this story: nothing
  under `src/` reads `bridgeGroundOutcome`/`groundOutcomeInState`/`backgroundActive`,
  and the physics path (`src/core/frame.ts:202,211`; `demo.ts:363`) still calls
  the arena-UNAWARE `groundOutcome`, so a burned bridge / destroyed cliff has NO
  gameplay effect yet. jt3-3 MUST pin the call-site (drive `stepDemo` across the
  wave-3 burn, assert `demo.arena.bridgeBurned`); jt3-7 MUST route landing/physics
  through the seam so an entity actually drops through the burned span. *Found by
  Reviewer during code review.*
- **Question** (non-blocking): `stepDemo` feeds the BCD wave byte straight into
  `waveRowAt`/`applyWaveDestruction` (`src/core/demo.ts:578-583`). `nextWaveBcd(9)`
  returns `16` (`$10`), so from the 10th wave the demo indexes `waveRowAt(16)` and
  `DemoState.wave` desyncs from waves-cleared. PRE-EXISTING (lines 578/580 are
  unchanged by this diff) and unreachable in current tests, but jt3-2 now
  propagates it into arena state. Confirm `WAVE_TABLE` is meant to be BCD-indexed,
  or decode BCD→decimal before any `waveRowAt` lookup. Affects `src/core/demo.ts`
  + `src/core/wave.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `applyWaveDestruction` (`src/core/arena-state.ts:154-155`)
  accepts a non-integer / out-of-range `wave` and `status` silently, unlike its
  sibling `groundOutcome` (imported into the same file) and `waveRowAt`, which
  throw. A negative `status` (e.g. `-16`) ANDs to `$f0` = "all four cliffs
  destroyed"; `wave=NaN` reads as "bridge intact". Add a `Number.isInteger`/range
  guard matching the module convention. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)

- **Bridge modeled at bit/surface granularity, not per-column X-map:** Spec asks
  for "an entity that would have landed/collided on the bridge no longer does."
  The ROM's bridge footing is an X-COLUMN fact — the flame sweep (`LAVAB`,
  `JOUSTRV4.SRC:5258-5264`) clears the CLIF5 landing bit `$20` column-by-column
  across the bridge span. jt1-5 transcribed the LNDYTB/BCKYTB **Y**-maps but NOT
  the LNDXTB/BCKXTB **X**-maps, so the seam represents the bridge as a latching
  `bridgeBurned` + a bridge-span landing query (`bridgeGroundOutcome`: CLIF5
  footing while intact → airborne once burned), NOT the per-column X-map or the
  visible flame sweep. Reason: the full X-column transcription + render sweep is
  demo/render scope (jt3-7); this story keeps the seam at the surface/bit
  granularity the frozen arena exposes. The CLIF5 ISLAND stays intact through the
  burn (only the span loses footing) — pinned so a wholesale-CLIF5-clear is caught.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New behaviour (bridge burn + high-nibble cliff destruction as a core
state change through a wave event) plus a transcribed data table and two ROM
trace obligations. Not a chore.

**Test Files:**
- `tests/helpers/arena-state-contract.ts` — the `ArenaState` seam contract +
  loader (the frozen-arena mutable-copy shape; new module `src/core/arena-state.ts`).
- `tests/arena-destruction.test.ts` — behaviour: bridge burn (AC-1), cliff
  destruction landing + background geometry (AC-2), purity + frozen-exports +
  determinism (AC-4).
- `tests/arena-destruction-source.test.ts` — the WCLFTB byte-gate (AC-2), both
  traces (AC-1 §4, AC-3 §5), and JT32-* claim coverage.
- `docs/rom-study/claims/arena-destruction.json` — 25 JT32-* claims (byte-verified).
- `docs/rom-study/open-questions.md` — §4 and §5 updated with the trace findings.

**Tests Written:** 32 tests across 4 ACs.
**Status:** RED — `npx vitest run tests/arena-destruction.test.ts
tests/arena-destruction-source.test.ts` → 19 failed | 13 passed. The 19 reds all
fail on "arena-state module not built yet" (the absent seam); the 13 greens are the
pure-source trace proofs + claim coverage (present locally, SKIP on CI). Full suite:
19 failed | 1125 passed (only the intended new reds). `tsc --noEmit` clean;
citations gate green (56).

**The seam Dev must build (`src/core/arena-state.ts`):** a MUTABLE `ArenaState`
(plain data: `bridgeBurned`, `destroyedCliffs`, `destroyedLandingBits`,
`destroyedBackgroundBits`) that the wave EVENT `applyWaveDestruction(state, wave,
status)` mutates — WITHOUT unfreezing arena.ts's exports (mirror the ROM's
LNDXD1/BCKXD1 RAM copy vs the frozen ROM source). Bridge LATCHES on `wave >= 3`;
cliffs REFLECT the current wave's `status & $F0` (rebuilt when the bit clears).
`CLIFF_DESTRUCTION` (4 rows, re-derived from WCLFTB) + `SECOND_VARIANT_TRACE`
(the §5 verdict as data). Purity scanner auto-sweeps the new module.

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/arena-state.ts` (NEW) - the mutable `ArenaState` seam: reducer
  `applyWaveDestruction` (latching bridge / reflecting cliffs), `CLIFF_DESTRUCTION`
  (WCLFTB), `SECOND_VARIANT_TRACE`, `groundOutcomeInState`, `bridgeGroundOutcome`,
  `backgroundActive`, `initialArenaState`. Pure core; imports arena.ts's frozen data.
- `src/core/demo.ts` (MODIFIED) - `DemoState` carries `arena: ArenaState`, seeded at
  wave 1 in `createWaveDemo` and re-applied on each wave advance in `stepDemo` (+16/-2).

**Tests:** 1145/1145 passing (GREEN). The jt3-2 suites: 32/32
(`arena-destruction.test.ts` + `arena-destruction-source.test.ts`). Frozen-exports,
purity, and determinism tests all green. RED baseline was 19 failed | 1125 passed.

**Build:** `tsc --noEmit && vite build` green.

**Branch:** feat/jt3-2-bridge-cliff-destruction (pushed to origin).

**Touched no test/contract/claim files** — only `src/`.

**Handoff:** To Reviewer (Thought Police) for review.

## Reviewer Assessment

**Verdict:** APPROVED

Specialist tags: [RULE] pass · [TEST] pass · [SEC] n/a (pure core, no I/O surface)

**Data flow traced:** wave status byte (WSTATUS high nibble) -> `applyWaveDestruction`
-> `ArenaState.{bridgeBurned,destroyedCliffs,destroyedLandingBits,destroyedBackgroundBits}`
-> query fns. SAFE because the reducer imports arena.ts's frozen
`PLATFORMS`/`BRIDGE_WAVE`/`groundOutcome` and never writes through them: a destroyed
cliff's landing is VETOED to airborne, and `PLATFORMS` stays `Object.isFrozen` +
JSON-unchanged through a destruction gauntlet (`tests/arena-destruction.test.ts:197-219`).

**ROM fidelity — independently re-derived from the vendored tree (not the impl):**
- All four WCLFTB mappings match byte-for-byte vs equates `JOUSTRV4.SRC:189-192` +
  table `:2407-2413` — CLIF1L{$10,$01,$03} CLIF1R{$20,$00,$00} CLIF2{$40,$02,$04}
  CLIF4{$80,$10,$40}. No correction needed.
- §4 wave-numbering: TBRIDGE seeded 3 ("WAVE NBR TO DESTROY BRIDGE", `:955`); the
  pre-decrement (`:1936`) precedes the WAVBCD increment (`:2001-2004`) in the same
  inter-wave routine, so the bridge burns as wave 3 begins. The `:2202`/`:4719`
  comments read COUNTDOWNS feeding EMYTIM, not wave numbers. open-questions §4
  updated (not stale).
- §5 negative CONFIRMED: no consumer computes `CLIFxx+8`. The `LDU #CLIF1L`
  background loop (`:1008-1012`) walks the 7-entry vector table (CLIF1L->CLIF5 =
  14 bytes); CLFDES reads offset 4 (`:4590`); collision indirection reads offset 0
  (`:6817-6919`); WCLFTB targets offset 0 (`:2407-2414`). Interspersed bitmap data
  (`JOUSTI.SRC:56-63`) rules out any word-walk reaching the variant. open-questions
  §5 updated.

**Test quality [TEST]:** the bridge latch is mutation-closed (`>=`->`===`, `>=`->`>`,
and dropping the `|| state.bridgeBurned` OR are each killed — the old `>=`/`===`
hazard is genuinely closed); the cliff filter/reduces and all three query fns are
mutation-closed; the source byte-gate is a genuine double-entry
(`tests/helpers/joust-source.ts` is imported nowhere under `src/`, enforced
fleet-wide by the pictures-gate). Citations: 56 green; 25 JT32-* claims, no bare
`:N`, unique ids, verbatim fields match source.

**Preflight:** 1145/1145 tests pass; `tsc --noEmit && vite build` clean; working
tree clean at 43c17ba; the vendored source-gated blocks RAN (not skipped).

**Deviation audit — TEA's bit/surface-granularity bridge model: ACCEPTED.**
Reasonable and correctly bounded — the CLIF5 island stays intact (pinned,
`arena-destruction.test.ts:98-108`), only the bridge SPAN loses footing, and the
per-column LNDXTB X-map + visible flame sweep are legitimately jt3-7 (render). It
does NOT drop AC-1: the "an entity that would have landed on the bridge no longer
does" observable is proven at the seam via `bridgeGroundOutcome` flipping
platform->airborne through a real `applyWaveDestruction(wave 3)` burn — independent
of the deferred X-map.

**Accepted deferral (the flagship caveat):** `DemoState.arena` is WRITE-ONLY this
story and the physics path never consults the seam, so the mutation has no gameplay
effect YET. This matches the epic's seam-story framing (consumption is jt3-3 troll
gate + jt3-7 render). AC-1/AC-4 are met at the SEAM granularity this story owns.
The downstream obligations are recorded as blocking-for-jt3-3 Delivery Findings so
they cannot be silently dropped.

**Observations (non-blocking):** (1) demo call-site unpinned + write-only [see
Delivery Findings]; (2) `applyWaveDestruction` lacks the integer/range guards its
sibling fns throw with; (3) pre-existing BCD wave-index divergence at wave>=10;
(4) `SECOND_VARIANT_TRACE.cliffs` floor is `>0` rather than the enumerated 3 —
weak, but the negative it records is independently proven by the mutation-tested
regex; (5) the CLIF1R-alone status (`$20` without `$10`) is untested but is
unreachable via `WAVE_TABLE` and faithful to the ROM's `$00,$00` record.

**Handoff:** To SM for finish-story. jt3-3 owes the call-site pin; jt3-7 owes the
physics/render wiring — both in Delivery Findings.

## Sm Assessment

**Outcome:** APPROVED and merging — 2 commits (RED `8b1c70b`, GREEN `43c17ba`). Full suite 1145/1145, build green.

**Pipeline (peloton, subagents):** setup → TEA RED (19 reds, all "arena-state module not built yet") → Dev GREEN (built the mutable `arena-state.ts` seam; independently re-derived TEA's CLIFF_DESTRUCTION mapping byte-for-byte; correctly kept the jt1-5 frozen exports frozen) → Reviewer APPROVED [RULE][TEST] (independently re-derived every load-bearing claim from vendored source: WCLFTB mappings, §4 countdowns, §5 negative — even the risky `LDU #CLIF1L` candidate :1008-1012; AC-4 frozen-exports/latch tests mutation-confirmed to have teeth).

**Both TRACE OBLIGATIONS resolved:** §4 wave-numbering — the "1ST/2ND/3RD WAVE?" comments (`JOUSTRV4.SRC:4719`, `:2202`) read TBRIDGE/TTROLL *countdowns* feeding EMYTIM, not wave numbers; bridge burns as wave 3 (pre-decrement :1936 precedes WAVBCD :2001), troll as wave 4. §5 second-variant — the prime-suspect destruction path is FALSIFIED (no game-code path computes `CLIFxx+8`; the shorter variant is an unconsumed erase-variant candidate). open-questions.md §4/§5 updated with the evidence.

**Scope deviation (ACCEPTED):** bridge modeled at bit/surface granularity, not the per-column LNDXTB X-map; the flame-sweep column-clear + render belong to jt3-7; CLIF5 island stays intact through the burn. Reasonable — the X-tables were never transcribed (jt1-5) and column-render is jt3-7's job.

**CARRIED-FORWARD OBLIGATIONS (Reviewer-recorded, I am threading these into the dependent stories):** `DemoState.arena` is WRITE-ONLY this story — the physics path still calls the arena-unaware `groundOutcome`, so a burned bridge has no running-game effect yet and the `applyWaveDestruction` call-site is unpinned. This is an acceptable deferral that SELF-PINS at jt3-3 (the troll gate structurally must consume `arena.bridgeBurned`) — **jt3-3 MUST pin the demo call-site + read the seam**, and **jt3-7 MUST route physics/render through the seam**. Non-blocking nits deferred: `applyWaveDestruction` lacks the integer/range guards its siblings throw; a pre-existing BCD wave-index divergence at wave ≥10 (`demo.ts:578-583`, NOT introduced here).
