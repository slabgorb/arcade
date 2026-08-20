---
story_id: "pt1-2"
jira_key: "pt1-2"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-2: millipede: initial-wave spawn ramp not wired — verify early-game creature spawn tables against the ROM, escalation starts too fast

## Story Details
- **ID:** pt1-2
- **Jira Key:** pt1-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-2-millipede-spawn-ramp
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-08-20T00:43:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T22:59:29Z | 2026-08-19T23:01:13Z | 1m 44s |
| red | 2026-08-19T23:01:13Z | 2026-08-20T00:13:56Z | 1h 12m |
| green | 2026-08-20T00:13:56Z | 2026-08-20T00:43:47Z | 29m 51s |
| review | 2026-08-20T00:43:47Z | - | - |

## Sm Assessment

Setup complete for pt1-2 — a playtest bug (2026-08-19): millipede escalates too fast from
the first wave; the suspicion is the ROM's early-game spawn ramp (which creatures may spawn
at which level/score thresholds) exists in the ROM tables but was never wired into our sim.
3 pts, p1, tdd. Branch `feat/pt1-2-millipede-spawn-ramp` cut from `develop`.

**TEA (RED) — shape of the failing tests:**
- This is a verify-against-ROM story: audit the spawn gating for beetles / bees /
  dragonflies / etc. in `plugins/millipede/src/core/` against the ROM's spawn/difficulty
  tables (millipede rom-study / vendored source), then pin the correct thresholds with
  CITED tests. The `rom-fidelity-audit` skill is the tool for the audit step.
- ROM is canonical — if the audit shows a table IS wired and the ramp is authentic, the
  story closes working-as-intended with the citation as evidence (pt1-17 pattern); don't
  invent a gentler ramp.
- Citations must anchor the VALUE byte (the operand that encodes the threshold), not an
  adjacent load — mutate-to-red proof expected, and audit every constant in one pass.
- Core/shell purity holds: spawn gating is core sim; tests belong beside the other
  millipede core tests.

**AC sketch:** (1) each early-wave creature's spawn eligibility (level/score gate) matches
the ROM table, byte-cited; (2) a first-wave sim run does NOT spawn creatures the ROM gates
out of wave 1; (3) any adjacent discrepancies discovered are filed by surface as new
stories, not fixed here.

Route: TEA (red) → Dev (green) → Reviewer → SM finish.

## TEA Assessment

**Tests Required:** Yes
**Tests Written:** 13 behaviour + 5 claims = 18; **10 RED** (failing, ready for Dev), 8 green
(3 base-case/positive guards + the 5 claims). Rest of millipede **1496/1496**, orchestrator
**503/503**, `npm run lint` (tsc --noEmit) **clean**.

**Test Files:**
- `plugins/millipede/tests/wave-progression.test.ts` — the integration RED. Drives `stepGame`
  and reads the observable millipede (segment speed, `conway.active`, the CENTIS/NOCENT/BOMBV
  registers).
- `plugins/millipede/tests/audit/wave-progression-claims.test.ts` + `docs/rom-study/claims/17-wave-progression.json`
  — the WP-* dossier for the five wiring anchors (byte-verified, generated from source).
- `plugins/millipede/tests/sim.test.ts` — updated the two CONWAY-start tests to the CENTIN==9
  gate (see Design Deviations).

**The audit finding (why the RED is where it is).** The story hypothesised the *creature spawn
tables* were unwired. They are NOT: beetle/bee/dragonfly/mosquito/earwig/spider/inchworm all gate
spawn on `score2` (`mayStart*`/`*SpawnTick`/`*Allowed`), the roster is stepped every frame
(`sim.ts:231`), and `score2 = score2Of(state.score)` threads correctly. I byte-checked the ROM
thresholds (SD-13/57, BT-10/12, MQ-7, BE-5/7, EW-7). **The actually-unwired ramp is the
millipede's own per-wave CENTIS/CENTIN walk**, plus the CONWAY and BOMBS wave gates that hang off
it. The pure logic is all BUILT but ORPHANED — `stepWaveCadence` (millipede.ts:249, MT-14/15/16),
`bombModeStart`/`bombs` (ddt.ts:326-360, DD-75..101), `initConway` — nothing in the sim drives
them across waves. The comment at `sim.ts:363` ("Difficulty ramps via the wave counter") is
aspirational: nothing reads `state.wave`. I nearly filed "millipede too fast on wave 1" as a
divergence — the ROM's INIT sets `CENTIS=2` "FAST TO START WITH" (:1171), so wave 1 is *correctly*
fast; the slow reset only bites after the walk drives CENTIS to 3 below 20,000 (MT-16). Owner
directed (AskUserQuestion, this session) to build the FULL wave state machine.

**GREEN contract for Dev (the wiring):**
1. Add `centis` (init `CENTIS_FAST`), `nocent` (init 0), `bombv` (init 0) to `GameState`.
2. On wave clear (the `millipedeCleared && delay===0` edge, sim.ts:330): `centis += 1` (WP-2). Then
   **iff centis is now exactly 3** (WP-3): if `centin===9` start CONWAY (WP-6, replacing the
   unconditional `initConway()`); else if `centin ∈ BOMBSL` arm bomb mode
   (`nocent = bombModeStart(centin, score2)`, `bombv += 1`, DD-97..100); else plain.
3. At wave restart (`waveReady`, sim.ts:361): run `stepWaveCadence(centin, centis, score2)`; feed
   the walked `{centin, centis}` into `createMillipede` and store them.
4. Each frame call the existing `bombs(env)` dispatcher; while `nocent>0` enter the chosen critter
   and `nocent -= 1` (WP-7, DD-84/85/91/92).
5. **The crux — reconcile `centin`.** Today `centin` is the live-segment count that reloads to
   `NCENT` on clear (sim.ts:459/486). The walk needs it as the ROM's *preserved wave-length
   register* (walked down, reloaded to 0x0C only inside `stepWaveCadence`). This touches the
   `newCentin` logic and the `fieldColourIndex` latch — the reason the ramp "isn't wired".

### Rule Coverage (lang-review + arcade)

| Rule | Test(s) | Status |
|------|---------|--------|
| Non-vacuous assertions | `headSpeed` guards `segments.length>0`; every "differs"/positive case paired with a discriminating control | green guards |
| Boundary/edge values | the SCORE2>=2 (20,000) threshold pinned at 19,999 vs 20,000; centis==3 gate pinned at centis 1→2 vs 2→3 | RED |
| No `as any` | reads new registers via narrow `as { centis?: number }` casts, never `as any`; `tsc` clean | green |
| Citation-anchoring (arcade) | WP-* verbatims byte-re-open against the vendored .MAC; NOCENT arithmetic pins the LSR-carry value (23) | green + RED |
| Core/shell purity (arcade) | N/A — behaviour tests only; no new core value beyond the already-cited pure fns | n/a |

**Rules checked:** the applicable TS rules (vacuity, boundaries, no-`as any`) + the arcade
citation rule have coverage. **Self-check:** 0 vacuous tests — the 3 always-green behaviour tests
are deliberate non-vacuity/base-case guards, each paired with a RED discriminator.

**Handoff:** To Dev for GREEN (wire the state machine per the contract above).

## Dev Assessment

GREEN complete. pt1-2 **13/13**; full millipede **1506/1506**; `npm run lint` (tsc --noEmit)
**clean**; orchestrator **503/503**. Committed `1f1a1f77`, branch pushed.

**Review-fix pass (commit `c711b1e5`).** Owner chose "complete both gates now": the
creature-introduction ramp + continuous-scroll arm still read the LIVE segment count,
but the ROM gates read `X,CENTIN` (the walked register) with DEAD a SEPARATE gate.
Re-pointed `EnemyView.centin` and `ScrollGate.centin` onto `state.centin`/the walked
local (DEAD/`segmentsRemaining` stay the live count). Updated the 4 tests that encoded
the old live-count behaviour to the register semantics (beetle-start, both scroll-arm
cases, the BOMBS drain — now CENTIN 1 so the picked critter isn't held permanently by a
normal spawn). Added a discriminating pair (`wave-progression.test.ts`) that holds the
live count at 1 and varies only the register: CENTIN 11 admits a beetle, CENTIN 12 (FULL)
blocks it — **mutation-proven** (reverting to `liveSegments` reddens the FULL case).
Also applied the other review findings: deleted the stale CENTIN==live-count block
comment; corrected the value-byte citations (INIT `LDA I,12.` :1168, re-lay `LDY X,CENTIN`
:546, SET SIZE :1170); `Readonly<BombFlierCtx>`; de-coupled the field-recolour INTEGRATION
assertion from `g.centin` onto an independent live-segment count; fixed the `sim.test.ts`
delay-hold comment (now the `justArmed` guard, not conway) and the `field-recolour` header.
**millipede 1508/1508, tsc clean, orchestrator 503/503.** Branch pushed. The three
non-blocking follow-ups (bomb-train suppression, no-mushroom-while-nocent>0, BOMBV scoring)
remain documented Delivery Findings — untouched, as directed.

**What I wired (the between-wave state machine, all built-but-orphaned pieces).**
- `GameState.centis` / `nocent` / `bombv` added (init FAST/0/0).
- **CENTIS INC on clear** ("FASTER", :1906) + the **gated wave event** (only when CENTIS just
  reached 3, :1908): `centin===9` → `initConway()` (WP-6), else `centin ∈ BOMBSL` →
  `bombModeStart` arms `nocent`/`bombv` (DD-97..100).
- **CENTPC walk at wave start**: `stepWaveCadence(centin, centis, score2)` → DEC the register
  (reload 0x0C at 0) + reset CENTIS SLOW/FAST by SCORE2, then re-lay the train at the walked
  length/speed (was a constant full-length FAST train).
- **BOMBS dispatcher each frame** (`bombs()`, :28): on the RND0&7 gate it picks a critter by the
  register (90$ table), force-spawns it (`startBee`/`startDragonfly`/`startMosquito`) into a free
  flier slot, and DECs `nocent`.
- **`centin` is now the preserved wave-length register** (ROM: written only by CENTPC/INIT, never
  per segment-death). Decoupled the colour latch onto the LIVE length (keyed to `fieldColourIndex`)
  so ml11-1 recolour-on-death is unchanged.

**Verified the feature end-to-end** (natural multi-wave diagnostic, then removed): across 16 wave
clears the register walks **12→11→…→5**, CENTIS **oscillates** (the speed ramp), **CONWAY fires
exactly at CENTIN==9**, and **bomb mode arms** at BOMBSL levels with `nocent` draining. This is the
"escalation ramp that exists in the ROM but wasn't wired" — now wired.

**Two things for Reviewer to weigh (both Delivery Findings):**
1. Bomb-mode train suppression (the ROM re-arms DELAY=0x80 so the centipede does NOT start during a
   bomb wave, :456/:1925) is NOT modelled — my port lays a train alongside the dive-bombers. A
   robust fix (hold the countdown while `nocent>0`) risks a delay deadlock if a flier slot never
   frees, so I deferred it.
2. The two secondary bomb behaviours TEA pre-flagged (no-mushroom-plant while `nocent>0`, :141; the
   BOMBV escalating bomb-mode score, SHOOT3 :2218) remain unwired — their pure logic is unit-tested.

Route: Reviewer.

## Reviewer Assessment

**Verdict: APPROVED.** Both commits reviewed (`1f1a1f77` the state machine, `c711b1e5` the
creature-ramp re-point + review-finding sweep).

**What I verified.**
- **The re-point is ROM-correct and is the fix for the story's premise.** The ROM creature
  gates read `X,CENTIN` (the walked wave-length register) with DEAD (the live count) a
  SEPARATE gate — confirmed against `MILLI.MAC:262-266` (beetle: `LDA X,DEAD`/`BEQ` then
  `LDA X,CENTIN`/`CMP I,12.`/`BCS`). Reading the live count made beetles appear the instant
  you shot the millipede down on wave 1 — exactly the "escalates too fast from the first
  wave" bug. Now a full-length wave (register 12) admits no beetles until the register walks
  down across waves. `EnemyView.centin` and `ScrollGate.centin` were the only two live-count
  reads; both re-pointed, DEAD/`segmentsRemaining` correctly left on the live count.
- **Ordering is correct.** `EnemyView` (roster step) reads `state.centin` — the register as
  it stood entering the frame, before any same-frame walk — matching the ROM (creatures run
  before CENTPC re-lays). `ScrollGate` reads the post-walk local `centin`, matching the ROM
  (SCROLL runs after CENTPC on a restart frame). The local is unconditionally initialised
  (`let centin = state.centin`), so no read-before-assign.
- **Test integrity.** The 4 broken tests were updated to the register semantics, not reverted;
  the discriminating pair (`wave-progression.test.ts`) holds the live count at 1 and varies
  only the register — I re-ran the mutation (revert `state.centin`→`liveSegments`) and confirmed
  the FULL case reddens. All other `centin` tests are pure-gate unit tests (bee/dragonfly/
  earwig/beetle-quota) that inject `centin` directly and are untouched by the wiring.
- **Citations re-anchored to the value byte** (INIT `LDA I,12.` :1168, re-lay `LDY X,CENTIN`
  :546, SET SIZE :1170, beetle-full `CMP I,12.` :265-266) — I re-opened each against the
  vendored `.MAC`. The earlier confabulated `:2036` was caught and corrected before commit.
- **Gates green:** millipede **1508/1508**, `tsc --noEmit` clean, orchestrator **503/503**.
  Natural-wave diagnostic re-run: the register walks (11→10→9, DEC'ing as CENTIS reaches 3),
  CENTIS oscillates 1↔2 (SLOW ramp below 20k), bomb mode arms at BOMBSL and the dispatcher
  drains it.

**Non-blocking follow-ups (unchanged, correctly deferred):** bomb-train suppression
(deadlock-risky), no-mushroom-while-`nocent`>0 (:141), BOMBV escalating scoring (SHOOT3 :2218).
All three carry unit-tested pure logic and are documented Delivery Findings for a future story.

Route: SM finish.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the story premise ("creature spawn tables unwired") was refuted by
  the ROM audit — all seven creatures' score-gated spawn tables ARE correctly wired and cited
  (`sim.ts:231`, `score2Of`). The real unwired ramp is the millipede's CENTIS/CENTIN per-wave walk
  + the CONWAY/BOMBS gates. Owner reframed the scope to the full wave state machine.
  *Found by TEA during test design.*
- **Gap** (blocking for GREEN): `state.centin` currently means the live-segment count and reloads
  to `NCENT` on clear (`plugins/millipede/src/core/sim.ts:459,486`), but the CENTPC walk needs it
  as the ROM's preserved wave-length register. Dev must reconcile this (and the `fieldColourIndex`
  colour latch that reads centin) — it is the core reason the walk isn't wired.
  *Found by TEA during test design.*
- **Gap** (non-blocking): two secondary bomb-mode behaviours are NOT pinned by the integration
  RED (hard to observe cleanly): the no-mushroom-plant-while-NOCENT>0 suppression
  (`MILLI.MAC:141`) and the BOMBV escalating bomb-mode scoring (SHOOT3, `MILLI.MAC:2218-2242`).
  The pure `bombs`/`bombModeStart` logic they build on is unit-tested (`tests/ddt.test.ts`); Dev
  should wire them and Reviewer should confirm — flagged so the coverage boundary is explicit.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the story is estimated 3 pts but this is a multi-subsystem
  wiring job (3 new state fields + the centin reconciliation + CONWAY gate + BOMBS dispatch). It
  is bounded (the pure functions all exist) but larger than 3 pts — noted for SM's records; owner
  chose the full-machine scope knowingly. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): bomb-mode train suppression is unmodelled — the ROM re-arms DELAY=0x80
  during a bomb wave so the centipede does NOT start until the dive-bombers finish
  (`MILLI.MAC:456`/`:1925`), but this port lays the next millipede train after the normal 0x40
  countdown, so a bomb wave has BOTH a train and fliers (harder than the ROM's fliers-only). A
  faithful fix holds the countdown while `nocent>0`; deferred because a flier slot that never frees
  would deadlock the hold. Affects `plugins/millipede/src/core/sim.ts` (the BOMBS dispatch / wave
  loop). *Found by Dev during implementation.*
- **Gap** (non-blocking): the two secondary bomb behaviours are still unwired — the fliers'
  mushroom-plant is NOT suppressed while `nocent>0` (`MILLI.MAC:141`), and BOMBV's escalating
  bomb-mode scoring (SHOOT3, `MILLI.MAC:2218-2242`) is unused. `bombs`/`bombModeStart` (the pure
  logic) is unit-tested; only the two wirings remain. Affects `sim.ts` + the flier reducers.
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): `plugins/millipede/tests/field-recolour.test.ts:201`
  (`colourIndexOf(g) === g.centin`) now passes only incidentally — in an idle full-train game the
  register equals the live length. Under the new semantics the faithful assertion is against the
  live segment count; consider re-pointing it. Left green as-is (not a defect for that scenario).
  *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Updated existing CONWAY-start tests to the CENTIN==9 gate.**
  - Spec source: the ROM, `MILLI.MAC:1911-1914` (WP-4/5/6); the prior every-clear start was a
    documented deviation (`sim.ts:342`).
  - Spec text: "CONWAY is NOT started on every wave clear, only on the one whose CENTIN walked to 9."
  - Implementation: `tests/sim.test.ts:308,314` now set `centin: 9` so the clear opens the gate
    (centis defaults to FAST(2) → the clear INCs it to 3). They stay green today (unconditional
    start) and after GREEN (gated start) — no false break.
  - Rationale: the existing tests pinned a behaviour this story removes; left unchanged they would
    red after GREEN. Kept them green-both-ways rather than deleting coverage.
  - Severity: minor
  - Forward impact: Dev must implement the CENTIN==9 gate for these (and the new suite) to pass.
- **Bomb-mode wiring pinned at arming + dispatch-drain only.**
  - Spec source: `MILLI.MAC:141` (no-mushroom suppression) and `MILLI.MAC:2218-2242` (BOMBV scoring).
  - Spec text: full bomb-mode behaviour includes suppressed mushroom-planting and escalating scores.
  - Implementation: the integration RED pins bomb-mode ARMING (NOCENT/BOMBV) and that the
    dispatcher DRAINS NOCENT; it does not pin the two secondary behaviours above (entangled/hard to
    observe cleanly at the sim level).
  - Rationale: their pure logic is unit-tested (`tests/ddt.test.ts`); pinning their wiring with a
    stable integration assertion is disproportionate. Filed as a non-blocking Delivery Finding.
  - Severity: minor
  - Forward impact: Dev wires them; Reviewer confirms against the ROM (coverage boundary noted).

### Dev (implementation)
- **`GameState.centin`: live-count-reload-NCENT → preserved wave-length register.**
  - Spec source: the ROM — CENTIN is written only by INIT and the CENTPC walk (`MILLI.MAC:509/512/1169`), never per segment-death (surfaced in this story's audit).
  - Spec text: the wave-clear CONWAY/BOMBS gates and the CENTPC re-lay read CENTIN as the preserved wave length.
  - Implementation: `centin` is no longer recomputed from live segments each frame; the colour latch is decoupled onto the live length (keyed to `fieldColourIndex`). Updated `death-respawn.test.ts` (the "register follows the connected length" test now asserts CENTIN is NOT per-death-decremented) and `field-recolour.test.ts:189` (precondition measures live segments, not `centin`).
  - Rationale: required for the walk/gates to read the correct value; the old coupling was itself non-ROM.
  - Severity: notable (touches colour + death re-lay).
  - Forward impact: `centin` is now the register everywhere; live length lives in the segments + `fieldColourIndex`.
- **Delay countdown does not decrement on the arm frame (`justArmed`).**
  - Spec source: pre-existing behaviour (`sim.test.ts:180` expects `WAVE_DELAY`=0x40 after a clear).
  - Spec text: clearing arms the inter-wave DELAY to 0x40.
  - Implementation: an explicit `justArmed` guard skips CHKEND on the arming frame. Before pt1-2 the conway-every-clear hold masked the same-frame decrement; with CONWAY gated to CENTIN==9 the guard makes it explicit so a plain clear still reads 0x40.
  - Rationale: preserves the existing delay contract without relying on the removed deviation.
  - Severity: minor
  - Forward impact: none (behaviour identical to pre-change for the arm frame).
- **BOMBS dispatcher force-spawns fliers via `start*` with a per-critter env; the `beec` free-slot check is approximated.**
  - Spec source: `MILLI.MAC:449-488` (BOMBS scans 13 shared BEEC slots).
  - Spec text: enter the chosen critter into a free motion-object slot.
  - Implementation: this port has three typed flier slots (bee/dragonfly/mosquito), not the ROM's one shared slot 12; `beec` is built as "any flier slot free ⇒ has a 0", and the chosen critter enters its own slot if free.
  - Rationale: matches the port's existing per-flier slot model (the shared-slot deviation is the documented ml7-8 choice).
  - Severity: minor
  - Forward impact: at most one of each flier type during a bomb wave (as in normal play).