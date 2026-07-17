---
story_id: "sw7-6"
jira_key: "sw7-6"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-6: R6a Trench structure & pacing — panel-grid wall model (B-010), wedge-chain length (B-009), fixed authored waves 0-10 (B-011), 31x scroll speed (B-008), drop fabricated rails (M-013)

## Story Details
- **ID:** sw7-6
- **Jira Key:** sw7-6
- **Workflow:** tdd
- **Stack Parent:** sw7-17 (DONE — hitscan laser landed)
- **Epic:** sw7

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T23:10:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T21:05:18Z | 2026-07-17T21:07:45Z | 2m 27s |
| red | 2026-07-17T21:07:45Z | 2026-07-17T21:37:40Z | 29m 55s |
| green | 2026-07-17T21:37:40Z | 2026-07-17T22:57:37Z | 1h 19m |
| review | 2026-07-17T22:57:37Z | 2026-07-17T23:10:35Z | 12m 58s |
| finish | 2026-07-17T23:10:35Z | - | - |

## Sm Assessment

Setup complete for sw7-6 — R6a Trench structure & pacing, the STRUCTURAL half of the
old 14-pt R6 flagship (split 2026-07-16; catwalk → R6b, wall guns → R6c). 8 pts,
size-l rewrite, star-wars, `tdd` workflow → routes to TEA for the RED phase.

**Pre-dispatch gate checks (all clear):**
- Merge gate: no open PRs in star-wars.
- Dependency: sw7-17 (R11b hitscan laser) is **done** — this unblocks B-008. At the ROM
  scroll speed (~15,750 u/s) the old 12,000 u/s projectile bolt was out-run, so the 31×
  speed-up was unplayable under the projectile gun; the hitscan gun resolved that.

**Acceptance surface (ROM findings — the story has no separate AC list):**
- B-010 (KEYSTONE): 4-slot × 2-bit wall-panel grid; 49 wedges / 11 pies. Our 8-entity
  trench list cannot express it — this is the foundational rewrite R6b/R6c plug into.
- B-009: wedge-chain trench length; DOFAR $8000 is a look-ahead window, not total length.
- B-011: waves 0-10 are FIXED authored runs; ours randomizes every run.
- B-008: scroll 500 vs ~15,750 u/s (31×), render-scale-independent, single caller
  S1MVBS in PHEBS. Length ÷ speed is ONE traversal system — bundled here (as R11c did).
- M-013: drop the 4 fabricated rails; B-019 floor lines stay accepted.
- B-018 (miss re-flies whole trench): ACCEPTED — recorded as house rule.

**Guidance for TEA:** src/core (deterministic sim) vs src/shell (render/input) boundary is
the single most important rule. Watch the ROM-fidelity citations gate — editing a src file
cited by docs/audit/findings/*.json shifts line numbers; reanchor with
`tools/audit/reanchor-citations.mjs --write`. Primary geometry source is the historicalsource
AVG picture ROM (WSVROM.MAC) plus the rom-fidelity-audit skill.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 8-pt size-l ROM-fidelity rewrite — five findings, each with concrete decoded ROM values.

**Test Files (new):**
- `tests/core/trench-panel-grid.test.ts` — B-010: the 4×2-bit panel-column encoding
  (64·A1+16·A2+4·A3+A4), the wedge record + type/length model, 53 wedge groups, and concrete
  divider/port content (TWDG01/29/54/92/95/98/99).
- `tests/core/trench-pies-waves.test.ts` — B-011: the 11 predefined pies (PIE1 verbatim), wave
  selection (BS.WAV 0-10 FIXED/run-identical, ≥11 RANDOM), seeded determinism, falsy-seed guard.
- `tests/core/trench-traversal-speed.test.ts` — B-008: scroll = $300/frame = 0x300×TICK_HZ
  (≈15,750 u/s, 31.5×), frame-true, pinned as a constant AND behaviourally through stepGame.
- `tests/core/trench-length.test.ts` — B-009: the trench is a variable wedge chain with a dynamic
  port and an end wall beyond it (not the fixed −2400), with the DOFAR-$8000-is-a-window refutation.
- `tests/core/trench-wpn-rails.test.ts` — M-013: TRENCH matches `.WGD WPN` (two rectangles, no 4
  fabricated rails); TRENCH_SQUARE reconciled onto WPN geometry (not the flat 80×80 square).

**Test File (re-seated):**
- `tests/core/models.test.ts` — inverted the story-8-5 "single connected wireframe / ≥1 catwalk rail"
  guard to the M-013 truth (two DISJOINT rings, ZERO cross-ring rails). Per-ring closure guard untouched.

**Tests Written:** 37 across 5 new files + 2 re-seated, covering B-008/B-009/B-010/B-011/M-013.
**Status:** RED — verified via testing-runner + a direct ground-truth run (the haiku runner mislabelled
3 traversal tests as passing that mathematically cannot pass against 500; direct run confirmed 6 RED / 1
keep-behavior pass). The 4 wedge-model suites are import-RED (`src/core/trench-wedges.ts` is Dev's to build,
the intended RED for a unit suite). All RED tests are GREEN-satisfiable against the decoded ROM values.

### Rule Coverage

| Rule (lang-review typescript.md) | Test(s) | Status |
|----------------------------------|---------|--------|
| #4 `??` vs `\|\|` on falsy-but-valid (seed 0) | trench-pies-waves "seed 0 is a valid, non-degenerate seed" | failing (import-RED) |
| core purity — seeded RNG only, no Math.random | trench-pies-waves "DETERMINISTIC per seed" + fixed-wave invariance | failing (import-RED) |
| #3 numeric consts with explicit values | trench-panel-grid `WEDGE_*` / `PANEL_*` value pins | failing (import-RED) |
| #2 `readonly` on shared arrays | `PanelColumn`/`PIES`/`WEDGE_GROUP_IDS` typed readonly; consumed as such | (type-enforced) |
| frame-true constant (no magic number) | trench-traversal-speed "0x300 × TICK_HZ" | failing |

**Rules checked:** 4 of the applicable lang-review rules have RED coverage (most of the checklist targets
Dev implementation patterns not yet written). No `.claude/rules`/`SOUL.md` in star-wars.
**Self-check:** 1 vacuous test found and fixed (the "old 500 ≠ ROM byte" literal-only assertion → re-tied
to `TRENCH_SCROLL_SPEED`); 1 fragile behavioural test fixed (per-second scroll measured as a RATE, not a
fixed-frame-count sum that overshot 1s and would false-RED under GREEN).

**Handoff:** To Dev (Yoda) for implementation.

## Dev Assessment

GREEN complete. All six RED suites pass and the FULL suite is green: **1574 tests /
136 files, `tsc --noEmit` clean, `vite build` clean.** Branch
`feat/sw7-6-r6a-trench-structure-pacing` pushed (commit `3a03719`).

**The five findings:**

- **B-010 (KEYSTONE):** new `src/core/trench-wedges.ts` — the ROM's 4-slot × 2-bit
  wall-panel grid. Consts (`PANEL_*`/`WEDGE_*`), `PanelColumn`/`Wedge`,
  `decodePanelColumn` (64·A1+16·A2+4·A3+A4), `wedgeLength`, 53 wedge groups, 11 pies,
  `WEDGE_GROUP_IDS`, `PIES`, `buildTrench(baseWave, rng)`. The 53-group / 11-pie bulk
  data is a **1:1 transcription of `WSBASE.MAC` BASE PIE AND WEDGE TABLES**, produced by
  a parser (scratchpad `gen-wedges.mjs`) so it can be diff-traced line-for-line; the
  `S(…)/L(…)/PORT(…)/NEXT/END` table mirrors the ROM macros. 6 anchor groups
  (TWDG54/92/95/29/98/99) verified against the RED pins.
- **B-011:** `buildTrench` selects a FIXED authored pie for BS.WAV 0..10
  (run-identical, RNG ignored) and a seeded RANDOM pie for ≥11 (RPIE template + TWDGXX
  pool, `nextInt` per XX slot).
- **B-009:** `spawnPort` derives the port from the wedge chain
  (`trenchPortDistance` = BS.PLC), clamped into the beam's `#7000` reach; `EXHAUST_PORT_DISTANCE`
  is that value. **Emergent ROM fact:** every pie is balanced to the SAME budget
  (port at 0x50000 = 327,680, END $1000 beyond) — see Design Deviation.
- **B-008:** `TRENCH_SCROLL_SPEED = 0x300 × TICK_HZ` (~15,750 u/s, 31.5×, frame-true).
- **M-013:** `TRENCH` drops the 4 fabricated rails (two disjoint WPN rings);
  `TRENCH_SQUARE` reconciled onto the same WPN concentric-rectangle geometry.

**Traversal correctness the 31.5× speed exposed** (all dt-independent, in-scope B-008
work — the port/obstacle now move up to 768 u/frame):

- port-miss and catwalk-crash now detect the cockpit CROSSING (z≥0 + lateral radius)
  instead of a sphere the target leaps clean over in one frame;
- trench-obstacle beam ranging resolves against the SIGHTED (pre-scroll) position, so
  "aim at it, hit it" (WYSIWYG) survives the fast scroll.

**Sibling migration** (per the TEA map + the re-seat list): `trench-length` (the one
false-premise RED — see Deviation), `hitscan-laser` clip margin (re-derived off the
6,144-unit sweep scroll), `swept-port-collision` near range, `tune-cue` window gate,
`exhaust-port-outcome` stray-shot distance. Citations reanchored (line-number only,
legit); B-008/9/10/11 + M-013 marked `remediated_by: sw7-6`; B-012/B-014/B-018
re-anchored to their new lines (not remediated — out of R6a scope / accepted).

**Handoff:** To Reviewer (Obi-Wan). The big review target is the **bulk wedge/pie
data** in `trench-wedges.ts` (the TEA Gap: not CI-testable since `WSBASE.MAC` is
gitignored) — diff-trace it against `~/Projects/star-wars-1983-source-text/WSBASE.MAC`.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

The five new RED suites intentionally leave the large sibling MIGRATION surface for Dev
to fix during GREEN (pre-editing mechanically-churned siblings steals Dev's green work —
the lb2-8 rule). Only inverted-intent guards that would TRAP Dev were re-seated in RED
(`models.test.ts` rails). The migration surface below was mapped exhaustively; Dev should
expect these to redden as the old model is removed:

- **Conflict** (non-blocking): B-010/B-011 REPLACE the whole `src/core/trench-obstacles.ts`
  model (`TRENCH_OBSTACLE_STATIONS`, `spawnTrenchObstacles`, `TrenchObstacle` {turret|square|catwalk},
  `TRENCH_HEAD_COUNT`, `TRENCH_TAIL_POOL`, `OBSTACLE_HIT_RADIUS`). Every importer goes module-RED and
  must be migrated to the panel-grid model: `tests/core/trench-variation.test.ts` (its whole "every run
  varies" thesis is INVERTED by B-011 — becomes fixed for waves 0-10; my `trench-pies-waves.test.ts` is
  its replacement), `trench-obstacles.test.ts`, `trench-catwalk-hazard.test.ts`, `trench-viewpoint.test.ts`,
  `trench-furniture-anchoring.test.ts`, `trench-aim-wysiwyg.test.ts`, `hitscan-laser.test.ts` (its own header
  already anticipates this), `trench-voice-timer.test.ts:329`.
  *Found by TEA during test design.*
- **Conflict** (non-blocking): B-009 removes/re-values `EXHAUST_PORT_DISTANCE` (2400) and the fixed
  `spawnPort()`. The KEYSTONE `tests/support/aim.ts` computes `FIRE_AT_PORT`/`HOLD_AT_PORT` from it at
  module load — migrate it FIRST or a cascade of files fail to load. Direct fixed-distance assertions to
  re-seat (keep "far + centred", drop exact −2400): `trench.test.ts:165`, `phase-jump.test.ts:85`,
  `tests/shell/render.exhaust-port-orient.test.ts:262` (AC "the port doesn't move" → keep centred/on-floor),
  `tune-cue.test.ts:90`. *Found by TEA during test design.*
- **Conflict** (non-blocking): `tests/core/events.test.ts`'s `TrenchObstacleDestroyedEvent {kind:'turret'|'square'}`
  exhaustiveness switch (`const _exhaustive: never = e`) fails to TYPECHECK — a compile-time break, not a runtime
  assertion — the moment the destroyable-kind union changes shape. Affects `src/core/events.ts` + `events.test.ts`.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): B-008's 31× speed-up makes two behavioural MARGINS stale (they still pass by
  luck of a loose budget, so they won't redden but no longer measure what they claim): `hitscan-laser.test.ts:454`
  `MARGIN=400` (< one 8-frame sweep's ~2,100u of scroll now) and `trench-viewpoint.test.ts` dive-dodge timing
  (~0.2s crossing vs ~0.21s dive). Re-derive both from the new speed. *Found by TEA during test design.*
- **Gap** (non-blocking): full 53-group / 11-pie BYTE completeness is NOT CI-testable — WSBASE.MAC is
  machine-local/gitignored, so a source-reading test skips silently in CI (the skipIf trap). The RED suites pin
  the encoding (64·A1+16·A2+4·A3+A4), the wedge/type model, PIE1 verbatim, wave selection, and anchor groups
  (TWDG01/29/54/92/95/98/99); the REVIEWER must diff-trace the remaining wedge/pie transcription against
  `~/Projects/star-wars-1983-source-text/WSBASE.MAC`. Affects `src/core/trench-wedges.ts` (the bulk data).
  *Found by TEA during test design.*
- **Question** (non-blocking): does the PORT wedge occupy channel length (BS.ELC strictly beyond BS.PLC)? I found
  no ROM pin for the PORT wedge's own length, so `trench-length.test.ts` uses `endAt >= portAt` (tolerant), not
  strict `>`. Affects `src/core/trench-wedges.ts` (`wedgeLength(WEDGE_PORT)`). *Found by TEA during test design.*
- **Improvement** (non-blocking): the whole trench editing this story shifts line numbers in `docs/audit/findings/*.json`
  citations — run `node tools/audit/reanchor-citations.mjs --write` in GREEN and keep `npm test -- citations` green,
  and mark B-008/B-009/B-010/B-011/M-013 `remediated_by: sw7-6`. *Found by TEA during test design.*

### Dev (implementation)

- **Conflict → resolved in-scope** (was non-blocking): the 31.5× scroll (B-008) makes trench objects
  advance up to 768 u/frame, which broke the pilot-facing collision/aim of the EXISTING trench-obstacle
  model (catwalk-crash + port-miss spheres tunnelled; obstacle beam-aim lagged the scroll). I fixed these
  as **B-008 traversal correctness** (dt-independent crossing detection; sighted/pre-scroll obstacle
  ranging) rather than retiring the obstacle model. **The full retirement of the fabricated
  `trench-obstacles.ts` entity model (per B-010's "the model is replaced") is DEFERRED to R6b/R6c**, which
  the scope guard already owns (catwalk collision = R6b, wall guns = R6c). Retiring it in R6a means either
  a vestigial always-empty `trenchObstacles`/`TrenchObstacle` field or a ~20-file `GameState`-shape cascade
  — disproportionate to "data model + traversal + drop rails", and it would build nothing R6b/R6c doesn't
  rebuild. So the panel-grid DATA MODEL landed (B-010) and the old content model still runs, correctly, at
  the new speed. *For the Reviewer: this is the one place I did NOT follow the "migrate/retire" line in the
  handoff notes; I judged it out of R6a scope. Flag if you disagree.*
- **Improvement** (non-blocking): the ROM's own `#7000` beam clip (WSLAZR CLBLZ / `TRENCH_FAR`) is the real
  ceiling on the port's interactive distance — anything past 28,672 is not under the beam. So the port's
  chain BS.PLC (327,680) is CLAMPED into that window for the STATE object; the full length lives in the
  pure `buildTrench` model. This is why several sibling suites needed re-derivation, not just relabelling
  (the port is now genuinely far, and the beam-aim/scroll interaction is real). Affects `state.ts`
  `EXHAUST_PORT_DISTANCE`, `sim.ts` `spawnPort`. *Found by Dev during GREEN.*
- **Question** (non-blocking): `wedgeLength(WEDGE_PORT)` — TEA flagged no ROM pin. DOFAR (WSBASE.MAC:1091-1103)
  computes `#800` for SHORT, `#0` for END, and `#1000` for **all else** ("ALL ELSE NEEDS 1000 SPACE FOR
  SAFETY"), so LONG **and PORT** reserve $1000. I set PORT = $1000, which puts the END wall a strict $1000
  beyond the port (BS.ELC > BS.PLC). Reviewer: confirm the "all else" reading covers the PORT wedge.
  *Found by Dev during GREEN.*

### Reviewer (code review)

- **Question** (non-blocking): B-010/B-011 are marked `remediated_by: sw7-6`, but the fabricated
  `src/core/trench-obstacles.ts` 8-entity list (`TRENCH_OBSTACLE_STATIONS`, cited as B-010's `ours`) is
  STILL the live wall-content model — the new panel grid (`trench-wedges.ts`) drives only the port DISTANCE
  so far; nothing yet renders/collides wall content FROM the grid. "Remediated" here reasonably means "the
  data model the finding demanded now exists", with consumption deferred to R6b/R6c — but that reading should
  be explicit at the epic level so a later audit doesn't read B-010 as fully closed while the fabricated model
  is live. Affects the audit record + `docs/audit/findings/pair-trench.json`
  (confirm the epic tracks B-010/B-011 consumption under R6b/R6c). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): M-013 reconciling `TRENCH_SQUARE` onto the WPN geometry changes the RENDERED
  'square' trench obstacle from a vertical 80×80 square (x/y plane) to the horizontal ±256/±128 WPN panel (x/z
  plane, y=0) — an orientation flip + ~6× size. It is mandated by the finding and pinned by
  `trench-wpn-rails.test.ts`, and the obstacle model is transient (R6b/R6c replace it), but it is a
  user-visible change with NO render-test coverage. Affects `src/shell/render.ts:390` (maps `square` →
  `TRENCH_SQUARE`); R6b/R6c should reconcile the wall-panel appearance when it builds real panel-content
  rendering. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the trench beam's one-object-per-frame "nearest wins" contest now compares
  an obstacle range measured PRE-scroll (`o.pos`, sim.ts:887) against a port range measured POST-scroll
  (`portPos`, sim.ts:869) — a ≤768-unit asymmetry. In practice the port always sits at the far `#7000` clip
  and obstacles are downrange, so the obstacle is always the clear nearest when both are hit; the asymmetry
  cannot flip the winner today. Worth aligning (range the port pre-scroll too, or note it) if R6b puts
  shootable panel content out near the clip. Affects `src/core/sim.ts:869,887,897`. *Found by Reviewer during
  code review.*
- **Improvement** (non-blocking, `[SIMPLE]`): `TRENCH.edges` (models.ts:567-570) and `TRENCH_SQUARE.edges`
  (models.ts:689-692) are byte-identical hand-repeated 8-edge arrays; `TRENCH_SQUARE.vertices` already reuses
  `TRENCH.vertices` by reference, so the edges could too. Trivial DRY, left as-is is fine. Affects
  `src/core/models.ts`. *Found by Reviewer during code review (preflight).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

B-018 (miss re-flies whole trench) — ACCEPTED (recorded as house rule)
M-013 (drop fabricated rails) — ACCEPTED (floor/wall geometry rewritten in this story anyway)

### TEA (test design)
- **B-010 full 53-wedge byte-completeness is anchor-sampled, not exhaustively pinned**
  - Spec source: context-story-sw7-6.md, B-010 (KEYSTONE, "49/53 wedges, 11 pies")
  - Spec text: "4-slot × 2-bit wall-panel grid, 53 wedge groups / 11 pies"
  - Implementation: RED pins the ENCODING (64·A1+16·A2+4·A3+A4), the wedge/type model, wave selection,
    counts (53 groups, 11 pies), PIE1 verbatim, and anchor groups (TWDG01/29/54/92/95/98/99). The remaining
    ~46 groups' bytes are NOT pinned in a CI test.
  - Rationale: WSBASE.MAC is machine-local/gitignored — a source-reading completeness test skips silently in
    CI (the skipIf trap). Byte-completeness is routed to the Reviewer diff-trace (Delivery Finding) rather than
    faked with a CI-only-green source read.
  - Severity: minor
  - Forward impact: Reviewer must diff-trace `trench-wedges.ts` bulk data against WSBASE.MAC.
- **The panel-grid contract is defined via a NEW module seam (`src/core/trench-wedges.ts`)**
  - Spec source: context-story-sw7-6.md, B-010 ("our 8-entity list cannot express it; size-l rewrite")
  - Spec text: "the foundation R6b/R6c panel content plugs into"
  - Implementation: the RED tests pin a specific API — `decodePanelColumn`, `wedgeGroup`, `WEDGE_GROUP_IDS`,
    `PIES`, `buildTrench(baseWave, rng)`, `PANEL_*`/`WEDGE_*` consts. B-008/B-009 are pinned behaviourally
    through the existing `GameState`/`stepGame` seam.
  - Rationale: TDD RED must define the shape of a data model that does not exist yet; the 8-entity list
    genuinely cannot express per-wall 4-slot columns.
  - Severity: minor
  - Forward impact: Dev builds `trench-wedges.ts` to this contract; a different internal shape needs coordination.
- **The M-013 "single connected component" guard in models.test.ts was INVERTED, not preserved**
  - Spec source: M-013 (finding), tests/core/models.test.ts:610-628 (story 8-5 guard)
  - Spec text: "`.WGD WPN` strokes ONLY the two rectangles … the 4 catwalk rails the ROM never draws"
  - Implementation: re-seated the 8-5 "trench is a single connected wireframe / ≥1 cross-ring rail" guard to
    "two rings are DISJOINT / ZERO cross-ring rails".
  - Rationale: the 8-5 rails ARE the fabrication M-013 removes; leaving the guard would trap Dev between M-013's
    new tests and an old assertion Dev cannot satisfy without violating the story.
  - Severity: minor
  - Forward impact: none — correct inversion; the per-ring closure guard (:596-608) is untouched and stays green.
- **Sibling migration for the retired trench-obstacles / EXHAUST_PORT_DISTANCE surfaces was DEFERRED to Dev**
  - Spec source: B-009, B-010, B-011 (findings); the re-seat map (Delivery Findings)
  - Spec text: replace the 8-entity obstacle model and the fixed −2400 port
  - Implementation: those ~10 sibling suites were left untouched in RED (module-RED under GREEN), flagged as
    non-blocking Conflict findings, not re-seated here.
  - Rationale: they fail by module-REMOVAL (a clean failure Dev resolves by migration), not by contradicting a
    new test; pre-editing them steals Dev's green work (lb2-8). Only trap-inducing inverted guards were re-seated.
  - Severity: minor
  - Forward impact: Dev migrates/deletes them in GREEN; my new suites provide the replacement coverage.

### Dev (implementation)
- **`trench-length.test.ts` "length varies by wave" RED was a FALSE premise about the ROM — corrected**
  - Spec source: `trench-length.test.ts` (TEA RED), the B-009 finding
  - Spec text: the RED asserted `new Set(perWaveLength).size > 1` — "length is DYNAMIC, varies across the
    fixed waves"
  - Implementation: replaced with `size === 1` — every fixed pie sums to the SAME balanced budget
    (0x50000 = 327,680 before the PORT), verified by computing all 11 pies from the decoded ROM data (114 vs
    131 wedges yet identical length; even the random-pool groups are length-equal).
  - Rationale: Atari authored every pie to one channel budget. Making `buildTrench` produce varying lengths
    would mean FABRICATING numbers the cabinet doesn't have — the exact fidelity sin this epic fights. The
    B-009 finding itself declines to pin the length and rests on the STRUCTURE ("a variable data-driven wedge
    chain with a dynamic BS.PLC port + BS.ELC end wall … stands independent of the exact length figure"), which
    a data-driven port landing on one balanced budget fully satisfies. The "varies by wave" phrasing was a TEA
    inference; the ROM refutes it. This is the one RED test I changed rather than satisfied.
  - Severity: minor (test premise, not a behaviour change)
  - Forward impact: none — the corrected test positively documents the balanced-budget ROM fact.
- **The STATE exhaust port is CLAMPED to the beam window; the full chain length lives only in the pure model**
  - Spec source: B-009 wiring ("port position derived from the wedge chain, via buildTrench")
  - Spec text: literal reading = seat the port at its full BS.PLC (327,680)
  - Implementation: `spawnPort` = `-min(trenchPortDistance(wave,rng), TRENCH_FAR)`; the port is seated at the
    farthest point still under the ROM's `#7000` beam (WSLAZR CLBLZ). The full 0x50000 length is the pure
    `buildTrench`/`trench-length.test.ts` model.
  - Rationale: the ROM's own beam clip makes anything past 28,672 un-shootable, and our non-streaming sim
    carries ONE port object that must exist to scroll. Seating it at the full absolute offset would make it a
    non-interactive dot for ~19 s and force a rewrite of the entire arming ecosystem — and TEA's own
    `tune-cue.test.ts` expects the far port to ARM at `-EXHAUST_PORT_DISTANCE`, i.e. within the window.
    Streaming the wedges in one-by-one is R6b/R6c.
  - Severity: minor
  - Forward impact: R6b/R6c render/collide the streamed panel content; the pure length model is ready for it.

### Reviewer (audit)

- **B-018 (miss re-flies whole trench) — ACCEPTED** → ✓ ACCEPTED by Reviewer: the finding's own recommendation
  is `accept`; the sim re-primes a fresh port on the miss path (`spawnPort` re-fly, sim.ts:1115), which is the
  documented house-rule divergence. Sound.
- **M-013 (drop fabricated rails) — ACCEPTED** → ✓ ACCEPTED by Reviewer: independently confirmed the 4 rails
  `[0,4],[1,5],[2,6],[3,7]` are NOT in `.WGD WPN` (which strokes only DRAWTO 1,2,3,0 + BDRAWTO 4,5,6,7,4). The
  two rings are correctly disjoint now. Correct fabrication removal.
- **Dev: `trench-length.test.ts` "length varies by wave" was a FALSE premise — corrected** → ✓ ACCEPTED by
  Reviewer: INDEPENDENTLY VERIFIED — re-parsed WSBASE.MAC and computed all 11 fixed pies' chain length; every
  one is 0x50000 (327,680) before the PORT, END $1000 beyond. The pies are Atari-balanced to a constant budget
  (even the random-pool groups are length-equal). Making `buildTrench` vary the length would fabricate ROM
  data. The correction is faithful and the finding B-009 explicitly declines to pin the figure. Correct call.
- **Dev: STATE port CLAMPED to the beam window (`min(BS.PLC, TRENCH_FAR)`); full length in the pure model** →
  ✓ ACCEPTED by Reviewer: the ROM's own `#7000` beam clip (WSLAZR CLBLZ) makes anything past 28,672
  un-shootable, so a port seated at the full 327,680 would be non-interactive and would break TEA's own
  `tune-cue`/`swept-port` arming expectations. Clamping the STATE object into the interactive window while the
  full length lives in `buildTrench` is the sound reconciliation; streaming the wedges is genuinely R6b/R6c.
- **Dev: obstacle model NOT retired (kept + made collisions speed-robust), deferring full retirement to
  R6b/R6c** → ✓ ACCEPTED by Reviewer, with the non-blocking Question logged above. Dev's own handoff notes
  suggested "migrate/retire", but the STORY scope guard is explicit — "R6a = data model + traversal + drop
  rails; catwalk collision = R6b, wall guns = R6c, OUT of scope". Retiring+rebuilding the wall-content model
  IS that R6b/R6c work; a partial retirement in R6a would mean either a vestigial always-empty field or a
  ~20-file `GameState`-shape cascade, disproportionate to the story and building nothing R6b/R6c doesn't
  rebuild. Keeping the model working (correctly, at ROM speed) is the lower-risk, in-scope choice. Sound
  judgment; the only residue is the audit-record accuracy Question (B-010 consumption tracked at epic level).
- **UNDOCUMENTED (Reviewer):** none — every spec divergence I found was already logged by TEA or Dev.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (DRY nit) + facts | 1 confirmed (LOW), 0 dismissed |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — covered by Reviewer (see [EDGE] observations) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — covered by Reviewer (see [SILENT] observations) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | N/A — covered by Reviewer (see [TEST] observations) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — covered by Reviewer (see [DOC] observations) |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — covered by Reviewer + rule-checker (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | N/A — pure sim, no external input (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — covered by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (2 informational) | 0 confirmed-blocking, 2 noted |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`, covered by Reviewer directly)
**Total findings:** 0 blocking, 4 non-blocking (all logged as Delivery Findings), 2 informational (rule-checker Rule #8 seam-tolerant guards)

## Reviewer Assessment

**Verdict:** APPROVED

The five findings are all delivered and the KEYSTONE data is faithful. The full suite is green
(1574/1574), `tsc --noEmit` and `vite build` are clean, and both enabled specialists corroborate
a clean bill: rule-checker found **zero** violations across 13 checklist rules + purity + 4 project
rules; preflight found zero smells but one trivial DRY nit. No Critical or High issues.

**The KEYSTONE, independently verified.** The one thing no CI test can check (WSBASE.MAC is
gitignored — the TEA byte-completeness Gap) I verified myself with a from-scratch re-parser that
compares the ROM against the COMMITTED `trench-wedges.ts`: **all 53 wedge groups, all 11 pies, the
RPIE template, and the 17-entry random pool match WSBASE.MAC exactly.** The data path stores the
decoded A-values directly (the `S/L/PORT` rows are the ROM's own `SHORT a,b,c,d e,f,g,h` args), so
there is no pack/unpack step that could drift; `decodePanelColumn` is a correct inverse of the
`64·A1+16·A2+4·A3+A4` packing (verified: `(byte>>6)&3 … byte&3`) and is exercised only by its own
round-trip test.

### Observations

- **[VERIFIED] KEYSTONE ROM data is a faithful 1:1 transcription** — evidence: independent re-parse of
  `~/Projects/star-wars-1983-source-text/WSBASE.MAC` vs committed `src/core/trench-wedges.ts` → PERFECT
  MATCH on 53 groups + 11 pies + RPIE template + pool. Closes the TEA Gap.
- **[RULE] Zero rule violations** — rule-checker exhaustively checked every exported const/type/fn against
  all 13 lang-review rules + core purity + the 4 project rules; all compliant (readonly shared arrays,
  ROM-cited numeric consts, seeded-RNG determinism, no `.js`-extension issue under bundler resolution).
- **[VERIFIED] Core purity intact** — evidence: no `window.`/DOM/`Date`/`performance`/`Math.random`/`shell`
  import in `trench-wedges.ts` or the sim/state edits; `createRng(state.rng.seed)` copies the primitive seed
  into a LOCAL cursor (sim.ts:1115,1368), never aliasing/mutating `state.rng`. Determinism preserved.
- **[EDGE] Collision crossing-detection is correct and dt-independent** — port-miss `reachedCockpit =
  port[2]>=0 && hypot(port[0],port[1])<=80` (sim.ts:1093) and catwalk `spanCrash||crossCrash` (sim.ts:926)
  both close the B-008 tunneling hole (target now moves ≤768 u/frame). Verified the dive-dodge survives
  (dived pilot at TRENCH_EYE_MIN → vertical offset 376 > 240 → no crash) and real ports are always centred
  (spawnPort → x=0), so the off-axis "never miss" is a test-only artifact (exhaust-port-outcome:257), not a
  live stuck-state — evidence: COCKPIT=[0,0,0] (sim.ts:105), spawnPort seats x=0 (sim.ts:1429).
- **[EDGE] `spawnPort` clamp is sound** — `-min(trenchPortDistance(wave,rng), TRENCH_FAR)` (sim.ts:1429):
  the port is seated at the far edge of the `#7000` beam reach; `beamHit`'s `along > maxRange` is inclusive
  at the boundary and the post-scroll ranging (kept deliberately for the port) lets `flyTheRun` arm at the
  clip. Confirmed Dev's PORT=$1000 DOFAR reading — WSBASE.MAC:1091-1103 "ALL ELSE NEEDS 1000" covers LONG
  AND PORT, so BS.ELC lands a strict $1000 beyond BS.PLC.
- **[TEST] Re-derived sibling tests pass for the right reason, not vacuously** — the corrected
  `trench-length` asserts one balanced budget across all pies AND `>0x8000` (discriminating, ROM-true); the
  `hitscan` clip guard tracks `everDied` over the whole coast and pins the ROM-exact 6,144-unit sweep scroll;
  `swept` near-range 2000 exercises real reach; `tune-cue:159` and `exhaust-port-outcome:304` are re-anchored
  to constants. The rule-checker's two seam-tolerant `if (s.exhaustPort)` guards (trench-length:102,
  traversal:86) are TEA's, non-vacuous today (enterPhase always spawns the port) — informational only.
- **[TYPE] Type design is clean** — `PanelColumn` readonly tuple, `Wedge` all-readonly, `GROUPS:
  Record<number, readonly Wedge[]>` (not `Record<string,any>`), `rng: Rng` correctly NOT readonly (it is a
  mutable cursor). No stringly-typed API; `wedgeGroup` throws loudly on an unknown id (sim never catches it).
- **[SILENT] No swallowed errors** — `wedgeGroup` throws on a bad id (fails fast on programmer error);
  `trenchPortDistance` returns the full length if a chain has no PORT — a defensive fallback that can only be
  reached with corrupt data (every real pie ends on a PORT-bearing group, independently verified). Acceptable.
- **[DOC] Comments are accurate and richly ROM-cited** — spot-checked the new headers against the code they
  describe (the `wedgeLength` DOFAR note, the `spawnPort`/`EXHAUST_PORT_DISTANCE` clamp rationale, the
  crossing-detection comments); each matches the behaviour and cites the right WSBASE/WSMAIN/WSLAZR line.
- **[SEC] N/A** — a deterministic pure sim with no external/user input, no `JSON.parse`, no network, no
  secrets, no tenant data. Nothing to isolate.
- **[SIMPLE] One trivial DRY nit (LOW, non-blocking)** — `TRENCH.edges` and `TRENCH_SQUARE.edges` are
  byte-identical (models.ts:567/689); the vertices already share by reference. Cosmetic; logged as a finding.
- **[MEDIUM→non-blocking] B-010 marked remediated while the fabricated obstacle model is still live** — the
  panel grid drives only the port distance so far; wall content is still `TRENCH_OBSTACLE_STATIONS`. Sound as
  "the data model now exists" with consumption in R6b/R6c, but flagged for epic-level tracking accuracy.

### Rule Compliance

Mapped to the lang-review TypeScript checklist (rule-checker's exhaustive pass, cross-checked by me):
- **#1 type-safety escapes:** compliant — no `as any`/`@ts-ignore`/`as unknown`; the 2 `!` in tests are
  guarded by a prior `toBeDefined()`.
- **#2 generics/interface:** compliant — `PanelColumn`/`PIES`/`WEDGE_GROUP_IDS` readonly; `Record<number,
  readonly Wedge[]>`; no `object`/`Function`/`Record<string,any>`.
- **#3 enum patterns:** compliant — `PANEL_*`/`WEDGE_*` are numeric consts with EXPLICIT ROM-cited values;
  `wedgeLength`/`buildTrench` use functionally-exhaustive if/else over the 5 types (no discriminated-union
  switch, so no `assertNever` expected — matches the project's numeric-constant fidelity convention).
- **#4 null/undefined:** compliant — `wedgeGroup` null-checks the `Record` lookup; no `||`-on-falsy bug
  (`everDied ||` is boolean; `selectPie` guards the index).
- **#5 module/declaration:** compliant — inline `type` modifiers on mixed imports; `.js`-extension rule is
  N/A for `src/core` relative imports under `moduleResolution: bundler` (it applies to the published
  `@arcade/shared` package only).
- **#6 React/JSX:** N/A (no `.tsx`).
- **#7 async:** N/A (no async introduced — pure sync core).
- **#8 test quality:** compliant — no `as any` in assertions, all imports from `src/` not `dist/`; 2
  seam-tolerant guards are non-vacuous today (informational).
- **#9 build/config:** N/A for a feature diff; `tsc`/`vite build` clean.
- **#10 input validation:** N/A (no external input).
- **#11 error handling:** compliant — one loud `throw` on an invariant; no `catch(e:any)`.
- **#12 perf/bundle:** compliant — `JSON.stringify` is test-only; `buildTrench` runs once per trench entry /
  port respawn, not per-frame.
- **#13 fix regressions:** compliant — the collision-fix hunks introduced no `||`/`??`/`as any` regressions.
- **Purity (project rule #1):** compliant — verified independently and by rule-checker.

### Data flow traced

`state.wave` → `romWave0(wave)` → `spawnPort(baseWave, createRng(seed))` → `trenchPortDistance` walks
`buildTrench(baseWave, rng)` (fixed pie 0..10 / seeded random ≥11) summing `$800/$1000` wedge lengths to the
PORT wedge → `-min(offset, TRENCH_FAR)` → `state.exhaustPort.pos`. Each frame `stepTrench` scrolls it by
`TRENCH_SCROLL_SPEED*dt`, the hitscan beam arms it against the scrolled position (bounded by the `#7000`
clip), and it detonates in the `$800` window or crosses the cockpit (`reachedCockpit`). Safe: pure,
seed-deterministic, and every distance is ROM-cited — no wall-clock, no ambient randomness, no unbounded
recursion (buildTrench terminates at the first END).

### Wiring

`buildTrench`/`trenchPortDistance` are consumed by `state.ts` (`EXHAUST_PORT_DISTANCE = TRENCH_PORT_OFFSET`)
and `sim.ts` (`spawnPort` at both call sites: enterPhase:1368 and the miss re-fly:1115). `TRENCH`/
`TRENCH_SQUARE` are consumed by `render.ts:390`. All connections resolve (tsc clean, suite green). The panel
grid's WALL CONTENT is deliberately not yet wired into render/collision — that is the R6b/R6c seam.

### Devil's Advocate

Assume this is broken. Where would it bite? First, the wedge data: it is 745 lines of hand-transcribable ROM
numbers, and a single wrong digit is invisible to CI (WSBASE.MAC is gitignored, so the source-reading test
skips). This is the scariest surface — but I neutralised it by re-parsing the ROM from scratch with a
different parser and diffing against the committed table; a one-digit error would have surfaced as a group
mismatch, and none did. Second, the port magnitude: a malicious/confused future dev who "fixes" the port to
seat at the true 327,680 BS.PLC would make it un-shootable for ~19 seconds and silently break every arming
test — but Dev's clamp and the documented rationale guard against that, and `beamHit`'s inclusive boundary
means the seated-at-`TRENCH_FAR` port still arms on the scroll. Third, the crossing tests: an off-axis port
scrolls forever un-missed because there is no port despawn — could a stressed run leak ports? No: `spawnPort`
always seats x=0, so a real port always satisfies `hypot(0,0)≤80` at z≥0; only a hand-built test fixture can
be off-axis, and that fixture explicitly expects no miss. Fourth, the mixed pre/post-scroll nearest contest:
could an obstacle steal the beam from the port, unearning a shield or stealing a kill? Only if an obstacle
and the port were within 768 units of beam-distance while both under the `#7000` clip — impossible today
(port at the clip, obstacles downrange), logged for R6b. Fifth, the `tune-cue:159` band is only ~63 units
wide; a future FOV/eye-height change could redden it — but it is tied to constants and is a test, not
runtime. Sixth, `TRENCH_SQUARE` sharing `TRENCH.vertices` by reference: a mutation would corrupt both — but
models are read-only render data, never mutated. Nothing here rises to a correctness defect; the residue is
audit-record accuracy (B-010) and R6b/R6c forward-work, both logged as non-blocking findings.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.