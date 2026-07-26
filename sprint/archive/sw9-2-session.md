---
story_id: "sw9-2"
jira_key: "sw9-2"
epic: "sw9"
workflow: "tdd"
---
# Story sw9-2: SELECT-A-DEATH-STAR difficulty picker — countdown start-wave select EASY/MEDIUM/HARD with the real 200k/400k/600k/800k start bonuses (reinstated in their correct home after sw7-4 removed them from a mis-attributed mechanic); sets starting wave, banks the bonus

## Story Details
- **ID:** sw9-2
- **Jira Key:** sw9-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-26T17:01:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-26T16:03:37Z | 2026-07-26T16:05:00Z | 1m 23s |
| red | 2026-07-26T16:05:00Z | 2026-07-26T16:35:15Z | 30m 15s |
| green | 2026-07-26T16:35:15Z | 2026-07-26T16:50:12Z | 14m 57s |
| review | 2026-07-26T16:50:12Z | 2026-07-26T17:01:46Z | 11m 34s |
| finish | 2026-07-26T17:01:46Z | - | - |

## Sm Assessment

**Setup complete — sw9-2 cleared for RED.**

- **Merge gate:** PASS — sw9-1 merged (star-wars#125, 60b876c) and finished; zero open PRs.
- **Race check:** PASS — no sw9-2 work upstream (`git log --all --grep sw9-2` empty, no sw9 remote branches); re-check at review.
- **Branch:** `feat/sw9-2-select-a-death-star` cut from origin/develop at 60b876c (includes sw9-1's canopy frame).
- **Context:** `sprint/context/context-story-sw9-2.md` is a fresh stub — no ACs in YAML; **TEA defines ACs during RED**. Design source: `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`.
- **History that shapes scope:** sw7-4 (S-015 "BOOK_WAS_WRONG") REMOVED invented 400k/800k *extra-shield* thresholds after an exhaustive BCD hunt refuted them. The epic rules the 200k/400k/600k/800k figures' correct home is the SELECT-A-DEATH-STAR start-wave bonuses — this story reinstates them THERE, with primary-source proof. TEA must ground the bonus values, the EASY/MEDIUM/HARD→starting-wave mapping, and the countdown behaviour in the 1983 source (start/select logic likely WSMAIN.MAC; check sw7-4's archive for the S-015 refutation trail so we don't re-invent what it disproved).
- **Scope note:** unlike sw9-1 (shell-only), this story is core+shell: game-start state machine (starting wave, banked bonus — pure core) + select screen render/input (shell). Purity boundary applies.
- **Execution mode:** peloton sw9-2, inline unnamed subagents (tea/reviewer=opus, dev=sonnet), SM orchestrates, no TeamCreate.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — full star-wars suite **40 failed / 1846 passed (1886)**. All 40
failures are in the 7 sw9-2 files (2 new + 5 re-seated); **zero unintended breakage**
(baseline was 1854 passing). Commit `a9299bb` — **tests only, no src touched**.

### Provenance rulings (1983 "Warp Speed" source, all re-verified against `~/Projects/star-wars-1983-source-text`)

- **Start bonus values & mechanism.** `TSCBN` (WSGAS.MAC:526-530) is the full table,
  read as packed BCD digit-pairs (added by `ADUSCR`/`DAA`, same as `TSCFRC`): "NO BONUS
  FOR CHOOSING DETH STAR 0", then `.BYTE 20/40/60/80,00,00` = **200k / 400k / 600k /
  800k** indexed by the 0-based ROM wave `GM.WAV`. `SCRWAV` (WSGAS.MAC:327-343, called
  WSMAIN.MAC:1982) banks `TSCBN[GM.WAV]` once — a pure function of the STARTING wave.
- **Wave mapping.** The shipped picker draws **THREE** Death Stars (`TDTH`, WSMAIN.MAC
  has 3 active `.WORD X,Y` rows; **two are commented out**). `PHESDS`'s hit math
  `SUBD #TDTH / LSRB` (";CONVERT 0->0,4->2,8->4") maps them to `GM.WAV` **0 / 2 / 4**.
  Labels EASY / MEDIUM / HARD (TCMES.MAC:585-587). GM.WAV is 0-based → clone waves
  **1 / 3 / 5** (`romWave0 = wave-1`, the `forceBonusForWave` convention). So the
  reachable banked bonuses are `TSCBN[0/2/4]` = **{0, 400,000, 800,000}**.
- **Four-vs-three resolved — THE ROM WINS.** The epic's "200k/400k/600k/800k" IS the
  full `TSCBN` table (waves 1-4), but the shipped three-star picker cannot reach waves
  1 or 3, so **200,000 and 600,000 are present in ROM but UNREACHABLE** via any choice.
  Tests pin the ROM truth; the discrepancy is a Delivery Finding. This is NOT a
  re-introduction of the sw7-4/S-015 mechanic (that was a refuted recurring *score-
  threshold extra shield*; this is a one-time *selection* bonus with its own evidence).
- **Countdown.** `PH.TIM` inits `LDD #0100` (0x100 = **256 game frames**, WSMAIN.MAC:1019),
  decrements each frame in `PHESDS`; going negative → "PLAYER DIDN'T DECIDE, START AT
  EASY" (`GM.WAV←0`, start). ≈ **12.48 s** at TICK_HZ. Firing (`GN.SWE & FIREBT!THMBT`)
  on a hovered Death Star commits early. Displayed digit `PH.TIM/32` (8→0) is a shell detail.
- **Screen copy** (TCMES.MAC:582-587): title `SELECT A DEATH STAR` (MS.DS1), instruction
  `FIRE LASER AT DESIRED DEATH STAR`, labels `EASY` / `MEDIUM` / `HARD`.

### The GREEN contract (what Dev must build)

- `Mode` gains `'select'`; `state.select: SelectState | null` where `SelectState =
  { countdown: number; hover: number | null }` (null unless in select mode).
- `state.ts` exports: `SELECT_COUNTDOWN_SECONDS = 0x100 / TICK_HZ`;
  `START_WAVE_BONUS: readonly number[] = [0, 200000, 400000, 600000, 800000]`;
  `DEATH_STAR_CHOICES: readonly {label; wave; bonus; aim:[x,y]}[]` = EASY/MEDIUM/HARD →
  wave 1/3/5, bonus 0/400000/800000, each with a normalised-aim position.
- `stepGame`: attract+start → `mode:'select'` (armed countdown, run-start cues **NOT**
  emitted yet); in select, decrement countdown by dt, set `hover` from aim, and on
  `fire && hover!==null` OR countdown expiry begin the run at the chosen wave, banking
  the bonus into `score` and emitting `player-spawn` + `redFiveStandingBy` + `music`.
  Timeout always defaults to EASY (wave 1, no bonus) regardless of last hover.
- Shell `render.ts`: add a `mode==='select'` branch (currently falls through to the
  playing HUD) drawing the five strings above.
- The exact `DEATH_STAR_CHOICES[i].aim` values are Dev's tunable — tests reference the
  table's own positions (via `tests/support/select.ts`), so they don't pin magic coords.

### Test Files

- **new** `tests/support/select.ts` — the single coupling point (namespace-cast reads
  so it loads pre-GREEN).
- **new** `tests/core/select-death-star.test.ts` — 27 tests, AC-1..AC-7.
- **new** `tests/shell/render.select-death-star.test.ts` — 4 tests, screen copy.
- **re-seated** `framing` (attract+start → picker; EASY → wave-1 run), `events`,
  `music-cue`, `speech-cues`, `wave-parity-gates` (run-start cues now on the
  select→play edge); `tune-cue` (comment-only — its negative still holds through select).

**Tests Written:** 31 new + 8 re-seated assertions across 7 ACs. **Self-check:** three
new tests were passing vacuously pre-GREEN (`enterSelect` returns a playing state until
Dev adds the mode) — anchored each on `mode==='select'` so the whole select suite is
27/27 RED for the right reason; no `let _ =`, no `assert(true)`.

### Rule Coverage (TS lang-review + star-wars sacred boundary)

| Rule / check | Test(s) | Status |
|---|---|---|
| BCD digit-pairs, not raw hex (`.RADIX 16` trap) | AC-4 `START_WAVE_BONUS is [0,200000,...]` | RED |
| Table walk-off / unreachable entries pinned | AC-4 `200k & 600k unreachable via any choice` | RED |
| Falsy-zero not dropped (EASY bonus is 0, a valid bank) | AC-3 `EASY banks nothing`, AC-4 index-0 | RED |
| 0-based ROM wave ↔ 1-based clone (`romWave0`) | AC-4 `GM.WAV 0/2/4 → waves 1/3/5` | RED |
| `readonly` array export | AC-4 `START_WAVE_BONUS` deep-equal (Dev declares `readonly`) | RED |
| Core purity/determinism (sacred boundary) | AC-7 determinism/no-mutation/RNG-untouched | RED |
| Framing consumes no randomness | AC-1 & AC-7 `rng` deep-equal across the crossing | RED |
| Meaningful assertions (no vacuous) | all — 3 vacuous greens found & anchored | fixed |

**Handoff:** To Dev (Julia) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `star-wars/src/core/state.ts` — `Mode` gains `'select'`; new `SelectState` /
  `DeathStarChoice` interfaces; `GameState.select: SelectState | null`;
  `initialState` seeds `select: null`; new exports `SELECT_COUNTDOWN_SECONDS`
  (`0x100 / TICK_HZ`, placed textually after `TICK_HZ`'s own `const` — module
  top-level consts evaluate in file order, so referencing `TICK_HZ` from a spot
  above its declaration would throw a temporal-dead-zone ReferenceError at
  import time), `START_WAVE_BONUS` (the full ROM
  `TSCBN` table `[0,200000,400000,600000,800000]`), `DEATH_STAR_CHOICES` (EASY
  wave 1/bonus 0, MEDIUM wave 3/bonus 400000, HARD wave 5/bonus 800000, each
  with a normalised `aim` position).
- `star-wars/src/core/sim.ts` — attract+start now calls `openSelect` (arms the
  countdown, mode→`'select'`, no RNG touch, no run-start cue) instead of the
  old `startRun`. New `stepSelect` (countdown decrements by `dt`; `hoverFromAim`
  hit-tests the live aim against `DEATH_STAR_CHOICES` within a
  `SELECT_HIT_RADIUS = 0.18` normalised-aim radius; a real fire on a hovered
  choice commits it, countdown exhaustion defaults to `DEATH_STAR_CHOICES[0]`
  = EASY). `startRun` generalised into `beginRun(state, wave, bonus)` — builds
  a fresh `initialState(seed)` at the chosen wave, banks the bonus into
  `score`, and fires the same run-start events (`player-spawn`,
  `redFiveStandingBy`, `music` for the STARTING wave via the existing
  `musicTrackFor`).
- `star-wars/src/shell/render.ts` — new `mode === 'select'` render branch
  (`drawSelect`) drawing the title, fire instruction, and the three
  EASY/MEDIUM/HARD labels via the existing `glowText`/`layoutText` seam;
  positions derive from `DEATH_STAR_CHOICES[i].aim` so the drawn cursor always
  agrees with the core's own hit-test; the hovered choice (`state.select.hover`)
  draws brighter/wider-glow.
- `star-wars/docs/audit/findings/*.json` (10 files) — re-anchored `ours` line
  numbers via `tools/audit/reanchor-citations.mjs --write` after the new code
  shifted existing cited lines in `state.ts`/`sim.ts`/`render.ts`; verbatim text
  unchanged, 0 lost.

**Tests:** 1886/1886 passing (GREEN) — full suite, up from the RED baseline's
1846 passed / 40 failed. `npm run build` (tsc --noEmit + vite build) clean.
Citation gate (`npm test -- citations`) green after re-anchoring.

**Handoff:** To Reviewer

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the epic's "200k/400k/600k/800k start bonuses" is the full ROM `TSCBN` table (waves 1-4), but the SHIPPED SELECT-A-DEATH-STAR screen draws only THREE Death Stars (two `TDTH` rows are commented out), reaching `GM.WAV` 0/2/4 → banked bonuses **{0, 400k, 800k}** only. **200,000 and 600,000 are in ROM but unreachable via any choice.** Tests pin the ROM truth; the epic figure is the design table, not the shipped picker. Affects the epic's phrasing / any future "re-enable the 5-star picker" story. *Found by TEA during test design.*
- **Gap** (non-blocking, future story): the two commented-out Death Stars (`TDTH`, WSMAIN.MAC:1043-1046 — waves 2/4 → GM.WAV 1/3 → 200k/600k) are an authentic-but-disabled feature; re-enabling them (a five-star picker) is its own story, explicitly out of sw9-2 scope. *Found by TEA during test design.*
- **Gap** (non-blocking, future story): the HARD start (GM.WAV 4 = "selected space wave five") triggers the "look at the size of that thing" / SPKSIZ speech and special growing-Death-Star processing (WSMAIN.MAC:1508/1548). The clone will start HARD at wave 5 but does NOT model that speech/beat. Affects `src/core/sim.ts` speech cues on a wave-5 start. *Found by TEA during test design.*
- **Question** (non-blocking): the ROM banks the start bonus at FIRST-WAVE COMPLETION (`SCRWAV` gated by `SC.FWV`), not at selection; the sw9-2 tests bank it at selection (see the deviation). If a future story wants the ROM-exact "die before completing the first wave → no bonus" behaviour, it needs an `SC.FWV` first-wave flag threaded through the progression. Affects `src/core/sim.ts`. *Found by TEA during test design.*

### Dev (implementation)
- No upstream findings — TEA's provenance ruling and GREEN contract mapped onto the implementation cleanly; no new conflicts, gaps, or questions surfaced during GREEN. *Found by Dev during implementation.*

## Impact Summary

**Shipped:** star-wars PR #126 (squash 4be3388 on develop) — the SELECT-A-DEATH-STAR boot screen: `mode:'select'` core state machine (256-frame countdown → EASY on expiry; fire-over-hovered-star early commit; EASY/MEDIUM/HARD → wave 1/3/5; `START_WAVE_BONUS` full 5-entry ROM TSCBN table, reachable {0, 400k, 800k} banked at selection) + shell select-screen render. 31 new tests, 5 existing files re-seated (reviewer ruled the re-seating *strengthened* them); suite 1886/1886; tsc/build clean; citations 12/12 (52 re-anchors, verbatim unchanged). Reviewer verdict: **APPROVED**, no Critical/High/Medium; mutation battery 6/6 caught.

**Blocking:** none.

**Carried forward (non-blocking):**
- [Conflict → future story] ROM ships a three-star picker (two TDTH rows commented out) — 200k/600k bonuses exist in TSCBN but are unreachable; a five-star picker story would reinstate them.
- [Question → future story] ROM banks the bonus at first-wave COMPLETION (`SCRWAV`/`SC.FWV`), ours at selection (logged deviation) — ROM-exact "die before wave-1 complete → no bonus" needs an SC.FWV flag.
- [Gap → future story] HARD start skips the "look at the size of that thing" SPKSIZ speech + growing-Death-Star beat (WSMAIN.MAC:1508/1548).
- [LOW ×3 from review] tune-cue negative narrowed to attract→select; render test 4 asserts title not HUD-absence; MEDIUM/HARD bank bypasses `finalizeScore` (no bonusFlash — correct for bank-at-selection; revisit with SC.FWV).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **The start bonus is banked at SELECTION, not at first-wave completion**
  - Spec source: WSGAS.MAC `SCRWAV` (:327-343), called WSMAIN.MAC:1982
  - Spec text: the ROM adds `TSCBN[GM.WAV]` once, gated by `SC.FWV` — i.e. when the FIRST wave completes, not at game start
  - Implementation: sw9-2 tests bank the bonus into `score` at the moment the Death Star is chosen / the run begins (AC-3), matching the story's "sets starting wave, banks the bonus" and the sw7-4 characterisation ("awarded once at game start")
  - Rationale: banking at selection is behaviourally equivalent for a completed first wave and avoids threading an `SC.FWV` first-wave flag through the entire phase progression (out of a 5-pt scope); the only divergence is "die before completing the first wave" — recorded as a Delivery Finding for a future ROM-exact story
  - Severity: minor
  - Forward impact: a follow-up can defer the bank to first-wave completion; the AC-3/AC-6 tests would move the score/cue assertions to that later edge
- **The countdown is pinned as a DURATION (`0x100 / TICK_HZ`), not the displayed 8→0 digit**
  - Spec source: WSMAIN.MAC:1019 (`LDD #0100`), :1048-1054 (display `PH.TIM/32`)
  - Spec text: PH.TIM = 256 frames; the on-screen number is `(PH.TIM<<3)>>8`
  - Implementation: tests pin `SELECT_COUNTDOWN_SECONDS ≈ 0x100/TICK_HZ` and the expiry→EASY behaviour; the displayed countdown DIGIT is left as a shell detail (not asserted)
  - Rationale: the digit rendering is a shell concern with no clean text seam; the countdown MECHANIC (duration + expiry) is what the sim owns and what the ACs pin
  - Severity: minor
  - Forward impact: none — a shell story could add the digit later
- **Cursor→choice hit positions are Dev's tunable; tests reference the table, not magic coords**
  - Spec source: WSMAIN.MAC:1082-1112 (`TDTH` screen coords + distance thresholds `$72/$52/$80`)
  - Spec text: the ROM hit-tests the cursor against fixed screen positions with pixel thresholds
  - Implementation: the ROM screen coords don't port to normalised aim; `DEATH_STAR_CHOICES[i].aim` positions are Dev's design and the tests aim AT the table's own positions (via `tests/support/select.ts`), asserting only the resulting selection
  - Rationale: pinning ported pixel coords would be a false-precision port of a value that doesn't survive the screen-space change (the sw3-15/sw5-4 lesson)
  - Severity: minor
  - Forward impact: reviewer should not expect ROM-exact select-cursor geometry

### Dev (implementation)
- **Concrete `aim`/hit-radius values chosen for `DEATH_STAR_CHOICES` and the cursor hit-test**
  - Spec source: context-story-sw9-2.md Scope + TEA's deviation above (this session, "Cursor→choice hit positions are Dev's tunable")
  - Spec text: "the exact `DEATH_STAR_CHOICES[i].aim` values are Dev's tunable — tests reference the table's own positions … so they don't pin magic coords"
  - Implementation: `EASY [-0.5,-0.3]`, `MEDIUM [0,-0.3]`, `HARD [0.5,-0.3]` (normalised aim, spread apart and off `[0,0]` so a neutral/centred yoke never hovers one), picked by the closest choice within `SELECT_HIT_RADIUS = 0.18`; `render.ts`'s `drawSelect` draws each label at the same `aim`-derived screen position so the drawn cursor always agrees with the hit-test
  - Rationale: TEA explicitly delegated this value; spacing them off the origin was necessary so `NO_INPUT`'s default `(0,0)` aim reports no hover (AC-5), and 0.18 is generous enough for an exact-aim fire to register while staying well inside the 0.5-unit choice spacing so the three choices' hit zones never overlap
  - Severity: minor
  - Forward impact: none for this story; a future shell polish story is free to retune the geometry (e.g. real crosshair-shaped hit zones) without touching the core contract, since the picker's behaviour is defined by `DEATH_STAR_CHOICES`, not by these specific numbers

### Reviewer (code review)
- **Improvement** (non-blocking): `beginRun` returns its state directly (like the old
  `startRun`), bypassing `finalizeScore`, so the MEDIUM/HARD banked bonus (400k/800k)
  does NOT arm the `bonusFlash` HUD highlight — it is the run's *initial* score, not a
  mid-frame change, so there is nothing to flash. Correct for "bank at selection", but
  the future "defer the bank to first-wave completion" story (TEA's SC.FWV Delivery
  Finding) must route that later award through `finalizeScore` if it wants the ROM's
  `byte_4B2C` flash. Affects `src/core/sim.ts` `beginRun`. *Found by Reviewer during code review.*

## Subagent Results

| # | Subagent | Status | Findings | Confirmed | Notes |
|---|----------|--------|----------|-----------|-------|
| 1 | reviewer-preflight | Received | 0 | N/A | 1886/1886 pass, build clean, citations 12/12, tree clean, 0 code smells; independently confirms Dev's numbers |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed directly by Reviewer (mutation battery + boundary analysis) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no swallowed errors in diff (no try/catch added; no silent fallbacks beyond the defensive `select ?? {…}` default) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed directly; 6-mutation battery proves no vacuous assertions, re-seated tests strengthened not weakened |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — docblocks are accurate ROM citations; no stale comments (sw7-4 comment updated to point at the new home) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — `readonly` exports, `readonly [number,number]` aim, clean `Mode` union + `SelectState \| null`; no stringly-typed gaps |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — client-only pure core, no auth/injection/secret surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — `hoverFromAim`/`stepSelect`/`beginRun` are minimal; no over-engineering or dead code |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — core purity boundary held (AC-7 scan clean); no core→shell import, no DOM/Date/Math.random in core |

**All received: Yes** (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`, pre-filled as Skipped — they do not block the gate.)

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `input.start` (attract) → `openSelect` arms `select={countdown:0x100/TICK_HZ, hover:null}`, mode→`'select'`, RNG untouched, no run-start cues → per-frame `stepSelect` decrements `countdown -= dt` and sets `hover` from live aim via `hoverFromAim` (closest choice within `SELECT_HIT_RADIUS=0.18`) → on `fire && hover!==null` OR `countdown<=0` → `beginRun(wave, bonus)` builds a fresh `initialState(seed)`, overrides `wave`, banks `bonus` into `score`, emits `player-spawn`+`redFiveStandingBy`+`music(space,wave)`. Safe: framing consumes no randomness (verified `finalizeFrame` is pure; `beginRun` re-seeds `createRng(s.rng.seed)` from the unchanged seed → deterministic and RNG-untouched across the whole crossing).

**Pattern observed:** table-driven picker — `DEATH_STAR_CHOICES` maps EASY/MEDIUM/HARD → GM.WAV 0/2/4 → waves 1/3/5, bonuses `START_WAVE_BONUS[0/2/4]`, and both core hit-test and shell `drawSelect` read the same `aim` array so cursor and render never drift (`src/core/state.ts:349-363`, `src/shell/render.ts:1558-1573`).

**Error handling:** no new failure surface (pure core, no I/O). Defensive `state.select ?? {…}` default in `stepSelect` guards a null-in-select-mode impossibility; huge `dt` (tab-away) simply expires the countdown → EASY, no crash; off-target fire never indexes an undefined choice (guarded by `hover !== null`, mutation-proven).

**ROM spot-check (primary source `~/Projects/star-wars-1983-source-text`, all re-verified):**
- `TSCBN` (WSGAS.MAC:526-530) — `.BYTE 20/40/60/80,00,00` under `.RADIX 16` (WSGAS `.INCLUDE WSCOMN` → WSCOMN.MAC:5), read as packed BCD → 200k/400k/600k/800k, entry 0 = "NO BONUS FOR CHOOSING DETH STAR 0". BCD reading corroborated by neighbours (TSCA1D `00,10,00`=TIE 1000, TSCTRT `00,01,00`=turret 100, TSCPRT `02,50,00`=port 250000). ✓
- `TDTH` (WSMAIN.MAC:1039-1045) — exactly THREE active `.WORD` rows, TWO commented out (`;;;`). ✓ `PHESDS` cursor math `TFR X,D / SUBD #TDTH / LSRB` (";CONVERT 0->0,4->2,8->4", :1119-1123) → GM.WAV 0/2/4. ✓
- `PH.TIM` init `LDD #0100` (:1019) = 0x100 = 256 frames; `SUBD #0001 / IFMI` → "PLAYER DIDN'T DECIDE, START AT EASY" `GM.WAV←0` (:1047-1055). ✓ Radix discipline clean: bare `0100` hex, dotted `#0072.`/`100.` decimal — sw9-1's radix dispute NOT repeated.
- `SCRWAV` (WSGAS.MAC:327-340) confirms the ROM banks at first-wave completion (`LDA SC.FWV / IFEQ`), not at selection — matching TEA's logged deviation exactly.
- Labels EASY/MEDIUM/HARD (TCMES.MAC:585-587), plus the ROM literally prints `WAVE 1`/`WAVE 3`/`WAVE 5` in red beside them (TCMES.MAC:588-590) — direct on-screen corroboration of the wave mapping.

**Re-seated tests (charge 2 — did re-seating weaken the guards?):** No. `events`/`speech-cues` are STRONGER (add a `mode==='select'` assertion before the fire-select edge, still assert the cue). `framing` split into two tests — the RNG-untouched guard is preserved (moved to the attract→select edge) and additionally covered by AC-7's full-crossing test; no assertion dropped without replacement. `music-cue` preserves the exactly-once edge test (edge fires → idle frame emits none) via `beginRunAt(0)`. `wave-parity-gates` still pins wave-1 plain space theme / no Imperial March. `tune-cue` (comment + body) now checks the "no descent" negative on the attract→select step; structurally sound because `beginRun`'s events are a fixed `[player-spawn, speech, music]` triple that cannot emit `descent` (LOW note, non-blocking).

**Mutation battery (8 specialists disabled → adversarial probe): 6/6 caught**
| # | Mutation | Result |
|---|----------|--------|
| 1 | expiry defaults to HARD not EASY | 2 fail (AC-2) |
| 2 | fire commits with no hover | 1 fail (AC-5) |
| 3 | drop the banked bonus (`score:0`) | 3 fail (AC-3) |
| 4 | `nextInt(state.rng)` during select | 2 fail (AC-7 mutation + crossing) |
| 5 | full `START_WAVE_BONUS` table corrupted at unreachable idx 1 | 2 fail (AC-4) — proves the FULL table is pinned, not just the reachable set |
| 6 | countdown never decrements | 4 fail (AC-2/AC-6) |
Every core guard is load-bearing; no vacuous assertions. Tree restored + `git status` clean after each.

**Other verified-good:** TDZ ordering correct (`SELECT_COUNTDOWN_SECONDS` sits below `TICK_HZ`; `DEATH_STAR_CHOICES` below `START_WAVE_BONUS`) — a forward reference in a *comment* only, which does not execute. Geometry sane: neutral `(0,0)` aim is 0.3 from MEDIUM > 0.18 radius → no hover (AC-5 dependency holds); adjacent hit zones 0.36 apart < 0.5 spacing → never overlap.

**Findings**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| — | No Critical/High/Medium found. | — | — |
| [LOW] | `tune-cue` "no descent on run start" negative now checks only the attract→select step, not the select→playing edge (structurally safe — `beginRun` cannot emit `descent`). | `tests/core/tune-cue.test.ts:226` | Optional: assert on `beginRunAt(0)` too. Non-blocking. |
| [LOW] | render test 4 ("does NOT fall through to playing HUD") re-asserts the title rather than the absence of a playing-HUD string. | `tests/shell/render.select-death-star.test.ts:103-109` | Optional: assert a playing-only string is absent. Non-blocking. |
| [LOW] | MEDIUM/HARD banked bonus bypasses `finalizeScore` → no `bonusFlash` (see Delivery Finding). | `src/core/sim.ts` `beginRun` | None now; note for the future SC.FWV story. |

**Deviation audit:** all four Design Deviations (bank-at-selection vs SCRWAV/SC.FWV; countdown-as-duration vs 8→0 digit; aims-as-tunable; concrete aim/hit-radius values) — ACCEPTED, each grounded in primary source I re-verified. The three future-story flags (five-star picker, HARD-start "size of that thing" speech, die-before-first-wave-completion) are correctly parked in Delivery Findings, not lost.

**Independent verification:** full suite 1886/1886 (preflight, independent of Dev); `npm run build` clean; citation gate 12/12 green (10 findings files re-anchored — line-numbers only, `verbatim` byte-identical, spot-checked `pair-score-shields.json`); working tree clean. **Race check:** PASS — only `feat/sw9-2-select-a-death-star` carries sw9-2 commits (`a9299bb`, `c59832e`); no sibling landed sw9-2 work on `origin`.

**Handoff:** To SM (Winston Smith) for finish-story.