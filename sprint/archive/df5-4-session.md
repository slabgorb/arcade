---
story_id: "df5-4"
jira_key: "df5-4"
epic: "df5"
workflow: "tdd"
---
# Story df5-4: Humanoid rescue + the planet-explodes-to-mutant-space panic

## Story Details
- **ID:** df5-4
- **Jira Key:** df5-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-4-humanoid-rescue-panic
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T02:07:12Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T20:24:31Z | 2026-08-18T20:26:00Z | 1m 29s |
| red | 2026-08-18T20:26:00Z | 2026-08-18T21:12:55Z | 46m 55s |
| green | 2026-08-18T21:12:55Z | 2026-08-18T21:40:29Z | 27m 34s |
| review | 2026-08-18T21:40:29Z | 2026-08-18T22:11:05Z | 30m 36s |
| red | 2026-08-18T22:11:05Z | 2026-08-18T22:32:17Z | 21m 12s |
| green | 2026-08-18T22:32:17Z | 2026-08-18T23:17:52Z | 45m 35s |
| review | 2026-08-18T23:17:52Z | 2026-08-18T23:43:32Z | 25m 40s |
| green | 2026-08-18T23:43:32Z | 2026-08-18T23:52:23Z | 8m 51s |
| review | 2026-08-18T23:52:23Z | 2026-08-19T02:07:12Z | 2h 14m |
| finish | 2026-08-19T02:07:12Z | - | - |

## Story Description

Close the df4-3 abduction loop by adding the RESCUE catch mechanic and the all-humanoids-lost PANIC that mass-transforms remaining landers into df4-4 mutants (SCZ).

### Technical Approach

The story delivers two interconnected mechanics:

1. **RESCUE Mechanic (AC1):** A falling humanoid (AFALL, defender/DEFB6.SRC:927) caught by the ship before it hits the ground (GETALT ground test :933) is returned to the surface. This reuses the df4-1 collision system for the catch test — no re-derived overlap. Every constant gated by a claims/*.json entry under the df1-1 gate.

2. **PANIC Trigger (AC2, AC3):** When the humanoid count reaches zero, the planet explodes and every remaining lander transforms into a df4-4 mutant (SCZ) en masse. The transform reuses the existing df4-4 SCZ reducer (no re-model). The planet-explosion presentation obeys ADR-0005 (no full-framebuffer inversion) — if it's a full-screen effect, render it as the safe freeze/fade/particle variant and log a 6-field Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md. A test pins the mass-transform fires exactly once on the zero-humanoid transition, not per frame.

3. **Scheduler Integration (AC4):** Humanoids and falling/caught states are df3 scheduler processes (NEWP,STYPE) killed via the df3 kill path — no per-humanoid rAF/tick. Purity.test.ts stays green. Every new constant cited under the df1-1 gate.

### Dependencies
- **df4-3:** Abduction/AFALL mechanics already in place
- **df4-4:** SCZ (mutant) transform reducer already available
- **df4-1:** Collision system for catch detection
- **df4-2:** Effect-policy classifier and ADR-0005 render guard (for PANIC presentation)
- **df3:** Scheduler, kill path, and NEWP,STYPE process spawning

### Design Notes
- **Scoring:** The rescue point values (P250/P500) are delivered in df5-3 (score.ts), not here. This story delivers the MECHANIC only.
- **Colour:** All blips/HUD figures reach colour by df2 palette index only.
- **Accessibility:** The planet-explosion effect must not violate ADR-0005 (no full-framebuffer strobe).

## Acceptance Criteria

**AC1:** The RESCUE mechanic — a falling humanoid (AFALL, defender/DEFB6.SRC:927) caught by the ship before it hits the ground (GETALT ground test :933) is returned to the surface — is a PURE reducer; the catch uses df4-1 collision, not a re-derived overlap test; every constant gated by a claims/*.json entry.

**AC2:** The PANIC trigger — humanoid count reaching zero -> planet explodes -> every remaining lander transforms into a df4-4 mutant (SCZ) — is modelled and cited to the ROM trigger; the transform REUSES the df4-4 SCZ reducer (no re-model), and a test pins that the mass-transform fires exactly once on the zero-humanoid transition, not per frame.

**AC3:** The planet-explosion presentation obeys ADR-0005 (no full-framebuffer inversion in a single frame) — the df4-2 render guard stays GREEN with the panic live; if the explosion is a full-screen effect it renders as the safe freeze/fade/particle variant and the substitution is logged as a 6-field Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md.

**AC4:** Humanoids and the falling/caught states are df3 scheduler processes (NEWP,STYPE) killed via the df3 kill path — no per-humanoid rAF/tick; purity.test.ts stays green; every new constant cited under the df1-1 gate.

## Sm Assessment

Setup clean, branch cut, ACs are precise and testable. Routing to TEA for the RED phase.

**Focus for TEA (RED):**
- **AC1 (RESCUE):** Write the catch-a-falling-humanoid → return-to-surface reducer test. The catch MUST assert it goes through the df4-1 collision path, not a fresh overlap test. Constants gated by `claims/*.json`.
- **AC2 (PANIC):** The load-bearing edge — pin that the mass-transform fires **exactly once** on the zero-humanoid transition, never per frame. The transform must reuse the df4-4 SCZ reducer; assert no re-model.
- **AC3 (accessibility):** ADR-0005 is a hard gate that OUTRANKS ROM fidelity — the df4-2 render guard must stay GREEN with PANIC live. If the explosion is full-screen, it renders as the safe freeze/fade/particle variant with a 6-field Design Deviation logged. Test the guard, not just the mechanic.
- **AC4 (purity):** Falling/caught humanoids are df3 scheduler processes killed via the df3 kill path — no per-humanoid rAF/tick. purity.test.ts stays green.

Reuse (df4-1 collision, df4-4 SCZ, df4-2 guard, df3 scheduler) is the whole point — no re-modelling. Every new constant cited under the df1-1 gate.

## TEA Assessment

RED landed. 15 failing tests across all 4 ACs in `tests/df5-4-rescue-panic.test.ts`
(contract loader in `tests/helpers/df5-4-rescue-panic-contract.ts`). The failures read
as an ABSENT FEATURE ("df5-4 rescue+panic is not built yet — ..."), never a broken harness.
Full defender suite: **15 failed | 688 passed** — only this suite is red. `npm run lint`
green.

**The RED-defined contract GREEN (Julia) must satisfy** — df5-4 EXTENDS `landers.ts`
`EnemyBank`, it does not add a module, and it RIDES four shipped seams (no re-model):

- **AC1 `catchFalling(ship: Query): readonly Humanoid[]`** — run the df4-1 collision
  seam (`collision.ts`, `collide`/`shipVsObject`) over the FALLING humanoids; each box
  overlap returns that astro to the terrain (`state:'walking'`, `alive`, `y =
  HUMANOID_GROUND_Y`). WALKING/grabbed astros are NOT catchable. Reject a non-finite
  ship coord (`[]`). Export `HUMANOID_GROUND_Y = 0xE0` (ASTS2 `LDA #$E0`,
  DEFA7.SRC:1529) with a `claims/*.json` entry — the df1-1 gate + `citations.test.ts`
  byte-verify it. The catch MUST import `./collision.js` (a source-scan test enforces it;
  a hand-rolled AABB would pass the behavioural tests yet violate AC1).
- **AC2 `panic(): PanicResult | null`** — a ONE-SHOT edge. Fires only the frame the LIVE
  humanoid population first transitions to zero (ASTCLR `DEC ASTCNT`→0 → `BNE ASTCX` →
  `NEWP TERBLO,STYPE`, DEFB6.SRC:432-434). It freaks EVERY alive lander
  (`reachedTop ← true`, the df4-4 trigger; ROM path GTARG-EQ `:631-633` → `LBEQ SCZ00`
  `:710`) and returns `{ landersFreaked, effectEvent:'terrain-blow' }`. Returns `null`
  while any humanoid lives, on a field that NEVER had one (the `LNDST0 JMP SCZS0`
  fresh-wave case is NOT the panic — a level-only `count===0` check is wrong), and once
  already fired (idempotent, not per-frame). The mass transform REUSES
  `mutants.ts` `transformLander` — the freaked landers become mutants through it, no
  re-model.
- **AC3** — the planet explosion IS the ROM's TERBLO (`effectEvent:'terrain-blow'`);
  `effects.ts` `classify` already maps it to `full-frame-strobe`/`particle`. Do NOT add
  a new EffectEvent or re-decide ADR-0005 — route through the existing classifier and log
  the **6-field Design Deviation** citing `docs/adr/0005-...md` (the substitution is real:
  the ROM planet-blow is a full-frame strobe). The `assertNoFullFrameStrobe` guard must
  stay GREEN — the panic renders no whole-frame invert/white-fill.
- **AC4** — falling/caught astros stay df3 scheduler processes (the existing AFALL
  process); no per-humanoid rAF/tick. A rescued astro's AFALL process must RETIRE (it
  must not resume falling past `$E0`). `purity.test.ts` auto-scans the edited `landers.ts`.

### Rule Coverage (lang-review/typescript.md + epic guardrails)
- **#21 module boundary** — `catchFalling` non-finite-coord rejection is pinned (mirrors
  `spawnHumanoid`/`spawnMutant`).
- **#29 exact-constant** — `HUMANOID_GROUND_Y` pinned to `0xE0`, not "> YMIN" (a wrong
  ground row would ship GREEN).
- **#3/#34 exhaustiveness** — AC3 deliberately REUSES `'terrain-blow'` rather than adding
  an EffectEvent, so `classify`'s `assertNever` stays intact. If GREEN adds a new event
  instead, it must extend the union + the switch (a test will be needed).
- **Reuse mandate (epic)** — collision, `transformLander`, and the effect policy are each
  proven consumed (source-scan + behavioural), not re-derived.
- **#8/#18 no vacuous asserts** — every test asserts a concrete value/state; the one
  currently-green test (AC3 guard sanity) exercises the shipped df4-2 guard on purpose.
- **Citations (df1-1)** — every new constant needs a `claims/*.json` entry; the only new
  one is `HUMANOID_GROUND_Y`. Effect/scoring constants are already cited.

**Scope fence (do not creep):** P250/P500 VALUES are df5-3 (`score.ts`) — df5-4 delivers
only the MECHANIC. Fatal-vs-survivable fall arithmetic (GETALT altitude math) beyond
"caught before ground" is out. HUD/render is df7.

## Dev Assessment

GREEN. All 16 df5-4 tests pass; full defender suite **703 passed (47 files)**, orchestrator
**503 passed**, `npm run lint` clean. The mechanic is pure-core only (epic Decision C,
"pure-first, wired-after") — no sim/shell wiring, exactly like df4-3/df4-4's bank methods
that df5-10 later wired.

**Implemented** (all in `plugins/defender/src/core/landers.ts`, extending the df4-3 `EnemyBank`):
- **AC1 `catchFalling(ship: Query)`** — runs the df4-1 `collide` seam over the FALLING
  astros (one-object COLIDE list per astro), re-grounds each catch to `HUMANOID_GROUND_Y`
  ('walking'), and re-arms the ASTRO walk process (extracted `armWalk`, so a rescued astro
  actually walks again — not a frozen 'walking' ghost). Rejects a non-finite ship (`[]`).
  Imports `./collision.js` (the AC1 source-scan passes — reuse, not a re-derived overlap).
- **AC2 `panic()`** — a one-shot: `panicFired` latch (fires once, not per-frame) +
  `humanoidEverSpawned` arm (a 0-count START is the fresh-wave `JMP SCZS0` case, not the
  panic). On the zero-alive-humanoid transition it latches `reachedTop` on every surviving
  lander; those landers then transform through the UNCHANGED mutants.ts `transformLander`
  (reuse proven by the AC2 test).
- **AC3** — `panic()` returns `effectEvent: 'terrain-blow'` (the ROM TERBLO), which the
  shipped df4-2 `classify` already maps to the SAFE `particle` variant; `assertNoFullFrameStrobe`
  stays green. Substitution logged as a 6-field Design Deviation (below).
- **AC4** — falling/caught astros stay df3 scheduler processes; the rescued astro's AFALL
  process self-retires (state-guard); `purity.test.ts` green over the edited file.
- **Citations (df1-1)** — added claims **EN-42...EN-46** to `docs/rom-study/claims/15-enemies.json`
  (ground row $E0, DEC ASTCNT, NEWP TERBLO, GTARG→SCZ00 freak, AKIL1 catch), each
  byte-verified by `citations.test.ts`.

**Scope held:** P250/P500 VALUES stay in df5-3 (`score.ts`); no HUD/render; no fatal-fall
arithmetic. The one small judgment call beyond a bare test-pass — re-arming the walk process
on rescue — is a correctness fix (a rescued human must walk), not scope creep, and no test
regressed.

## TEA Assessment — rework cycle 1

Re-baselined against the round-1 review (RTC 1). Defender suite: **1 failed | 704 passed** —
the single red is the new F2 determinism test (drives GREEN); `npm run lint` green.

**Response to each finding:**
- **F1 (HIGH) — citation + simplification.** Root cause: `$E0` IS correct — it is the
  TERRAIN-SURFACE base (BGALT ROFF `LDA #$E0`, BLK71.SRC:380 = `terrain.ts BASE_OFFSET`, the
  same flat ground `sim.ts` spawns humanoids at) — but it was cited to `ASTS2` (wave-spawn) and
  the comments falsely claimed `ALAND0` re-grounds at `$E0` (it does not; the ROM catch tracks
  the ship via `AFALL2` :945 and lands at a per-column `GETALT` altitude). I stripped the false
  `ASTS2`/`ALAND0` attribution from the test + contract headers, the AC1 ground-row test, and the
  loader spec message, and re-cited the value to BGALT. **GREEN must:** (a) fix claim **EN-42** to
  cite BGALT (BLK71.SRC:380) — or reuse `terrain.ts BASE_OFFSET` — not `DEFA7.SRC:1529`; (b) fix
  the four `landers.ts` comment sites; (c) log a 6-field Design Deviation for the flat-base deposit
  (vs per-column GETALT) + the omitted `AFALL2` ride-down descent. No behaviour change (`y===$E0`).
- **F2 (HIGH) — determinism.** New AC4 test `a rescue re-arm leaves EXACTLY ONE live movement
  process` is RED now (`expected 2 to be 1` — the stale walk process revives because the rescue
  cycles `state` back to `'walking'`). **GREEN must:** give the movement process a generation token
  or store the live handle so a stale process cannot revive on a `falling→walking` cycle (retire it,
  don't trust `state`). The existing y-only "stops falling" test could not see this.
- **F3 (MEDIUM) — test gap.** New AC1 boundary test pins the catch box as the df4-1 EXCLUSIVE box
  (edge-touch misses, one unit of overlap catches). Passes on the current `collide`-based catch —
  closes the coverage hole so a future hand-rolled/inclusive overlap would redden.
- **F4 (MINOR) — done.** `context-story-df5-4.md` restored from `develop` (enriched Architect
  content + the DO-NOT-REGENERATE banner back).
- **F5 (MINOR) — deferred, reviewer-sanctioned.** The uncaught-fall ground outcome (`AFALL0`
  fatal / `ALAND` survivable, DEFB6.SRC:933-960) — which would also make the panic reachable after a
  botched rescue — is a df5-later unit (the reviewer's own Delivery Finding: "treat the whole AFALL
  ground resolution as the unit"). Encoded in the test scope fence as a known gap; **GREEN logs a
  Design Deviation** noting a botched rescue can currently leave an astro resting at the floor and
  block the panic, deferred to the AFALL-ground-outcome story.

### Rule Coverage (delta this cycle)
- **#29 exact-magnitude:** F3 now pins the catch box extent, not just ordering.
- **Determinism (epic):** F2 pins single-process / stable entropy across a rescue re-arm.
- **Citation honesty (#17/#24):** test-side false attributions removed; the JSON claim fix is GREEN's.

## Dev Assessment — rework cycle 1

GREEN on the rework. df5-4 suite **18/18**; full defender **707 passed**; orchestrator **503
passed**; `npm run lint` clean; `citations.test.ts` byte-verifies the corrected EN-42. All in
`plugins/defender/src/core/landers.ts` + the EN-42 claim.

- **F2 (BLOCKING) — fixed.** Added a `moveGen` generation token to `HumanoidRecord`. `armWalk`
  and `makeFall` each bump it and capture their generation; both process guards now check
  `rec.moveGen !== gen` (not `state` alone). A rescue re-arm supersedes any prior walk/fall
  process, so a stale process retires even when the record cycles `falling→walking`. The F2
  test (`EXACTLY ONE live movement process`) is green; this also closes the mirror double-`AFALL`
  case the reviewer flagged.
- **F1 (BLOCKING) — fixed.** `$E0` is the terrain-surface base — re-cited claim **EN-42** to
  BGALT ROFF `LDA #$E0 SET BASE OFFSET` (BLK71.SRC:380 = `terrain.ts BASE_OFFSET`), and corrected
  the `HUMANOID_GROUND_Y` docstring + the two `catchFalling` comment sites that falsely credited
  `ASTS2`/`ALAND0`. Logged a 6-field Design Deviation for the flat-base deposit vs the ROM's
  per-column `GETALT` landing + `AFALL2` ride-down descent.
- **F5 (MINOR) — deviation logged.** The uncaught-fall ground outcome is documented as deferred
  (a botched rescue can strand an astro at the floor and block the panic; the panic remains
  reachable via abduction).
- **F3 / F4** — TEA's boundary test is green; the context file is restored.

Kept scope tight: no terrain/world/camera wiring (the per-column landing + ride-down are the
logged deviation, deferred to df7/the AFALL-ground unit). No behaviour change to the observable
catch (`y===$E0`); the fix was the determinism token + honest citations.

## Subagent Results

**Cycle: 1**

| # | Subagent | Received | Confidence | Decision | Notes |
|---|----------|----------|-----------|----------|-------|
| 1 | reviewer-preflight | Yes | — | No findings | lint clean; defender 703/703; orchestrator 503/503; EN-42..46 byte-verify; purity green. (Mischaracterised the context-file change as benign "pruning" — overridden by F4.) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | high | Confirmed → F1 | ROM trace: ASTS2/$E0 is the wave-spawn row, not the rescue path (AFALL2/ALAND0). Verified against source by me. |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | high | Confirmed → F2 | Empirically reproduced the armWalk double-process race (3 live procs, doubled rand()). Verified by my trace. Its low-confidence `ship.picture` note: dismissed — picture is a caller-fixed constant, not injected. |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | high/medium | Confirmed → F1, F3 | Independently confirmed F1 (lang-review #17/#24 + ROM-always-wins); flagged HUMANOID_BOX boundary-test gap (#29) → F3. All other 30 checks compliant. |

**All received: Yes**

Working-tree audit (`pf reviewer audit-tree`): **CLEAN** (exit 0) — no mutation left behind.

## Reviewer Assessment

**Verdict:** REJECTED — 2 blocking (HIGH) findings: a ROM-fidelity/citation defect in the rescue re-ground, and a determinism-breaking double-process race.

The panic (AC2) and the ADR-0005 explosion substitution (AC3) are correct, faithful, and well-cited — those hold. The failure is concentrated in the **rescue catch (AC1)**: it is both behaviourally simplified away from the ROM *and* mis-cited, and its re-walk re-arm introduces an entropy-determinism bug. Two independent subagents plus my own ROM read converge on the citation defect; the security subagent empirically reproduced the race. This costs a rework cycle, and the evidence is below.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **HIGH** | Rescue re-ground is mis-cited & behaviourally simplified. `catchFalling` teleports the caught astro to `y=$E0` walking. But `ASTS2 LDA #$E0` (DEFA7.SRC:1529) is the **wave-start SPAWN** row (`ASTST`, `*START ASTROS`), never reached from the catch path. The ROM catch is `AFALL2` (DEFB6.SRC:945-956): the astro **tracks the ship** (`OY16=PLAY16+10`, `OX16=PLABX+$80`) and rides down until `GETALT` (per-column terrain lookup, :933-934 — the test AC1 itself names) reports ground, then `ALAND0` (:961) resolves it **at that position** and never writes `$E0`. Claim **EN-42** is therefore behaviourally false (byte-accurate line, wrong routine) — a load-bearing df1-1 gate entry — and **no Design Deviation** documents the simplification. `terrain.ts` `decodeAltitudes` (a GETALT equivalent) was available and unused (reuse-first). | `landers.ts:46-49,129,233,350`; `15-enemies.json` EN-42; `df5-4-rescue-panic.test.ts:8,93` header/tests; contract header:12 | **Preferred:** implement the faithful `AFALL2`→`GETALT`(terrain)→`ALAND0` catch (astro tracks the ship, lands at the terrain column, resolves there) — needs the ship pose + terrain injected into the bank. **Or**, if a fixed-row simplification is intentional: (a) log a 6-field Design Deviation for it, (b) rewrite EN-42 to describe `$E0`/ASTS2 correctly as the **spawn** row and cite the real rescue path (`AFALL2`/`ALAND0`/`GETALT`), (c) fix the 4 comment sites that falsely say "ALAND0 re-grounds at $E0". |
| **HIGH** | `armWalk` re-arm creates a duplicate live walk process (state-as-liveness race). The walk guard `rec.state !== 'walking'` assumes state only moves *forward*; `catchFalling` is the first path that cycles it **back** to `'walking'`. If the original walk process is still asleep (grab→`killLander`→`catchFalling` with no ticks between — exactly what the shipped tests do, and reachable on a fast in-play catch), it revives alongside the freshly-armed one → **two** walk processes → doubled `rand()` draws → entropy consumption that depends on catch timing (breaks the sim's determinism guarantee). Empirically: 3 live `HUMANOID_PTYPE` procs and 20 `rand()`/20 ticks vs ~10. The AC4 "rescued stops falling" test only checks `y`, so it stays green. Same defect class threatens a re-grab→re-drop double `AFALL`. | `landers.ts:235-245` (guard :237), call sites :255 & :366 | Give `HumanoidRecord` a generation token (or store the live `Process` handle); the process closure captures its token and acts only if it is still current — or `catchFalling`/`killLander` explicitly retire the prior process before arming a new one. Add a test that pins single-process / stable `rand()` consumption after a same-tick grab→drop→catch. |
| MEDIUM | `HUMANOID_BOX` (4×8) catch radius is only ordering-tested (exact-coord catch, `0x2000`-away miss); no boundary assertion (edge overlap catches, one unit past does not) — lang-review #29 applied to a spatial magnitude. | `landers.ts:51-55`; `df5-4-rescue-panic.test.ts:100-121` | Add a boundary test once F1's catch mechanic is settled (the surface may change to terrain-based). |
| MINOR | `context-story-df5-4.md` regressed on this branch: the Architect-enriched Technical Approach / Scope / Dependencies / Design Notes and the "DO NOT REGENERATE" banner were replaced with placeholders (confirmed vs `develop`: 4 rich markers → 0). An `sm-setup` `pf context create` overwrote the enriched file. | `sprint/context/context-story-df5-4.md` | Restore from develop: `git checkout develop -- sprint/context/context-story-df5-4.md`. |
| MINOR | Panic unreachable after an uncaught drop (same root as F1). An uncaught faller rests **alive** at `YMAX` (`state:'falling'`), so `panic()`'s `humanoids.some(h=>h.alive)` blocks the planet explosion **permanently** after a single botched rescue. df5-4 implemented only the caught outcome (simplified); the ROM's uncaught ground outcome (`AFALL0` fatal / `ALAND` survivable, DEFB6.SRC:933-960) is absent. | `landers.ts` `makeFall`/`panic` | Resolve the uncaught faller at the ground (fatal → lost/decrement, or survivable → walking) so "all humanoids lost" is reachable in play. Likely folds into F1's AFALL-ground-outcome work. |

### Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (30 checks) + df5 epic guardrails. No `.claude/rules/*.md` or `SOUL.md` present.

- **#17 / #24 (comment asserts a mechanism nobody re-ran / citation unrelated to its sentence):** **VIOLATION** — the `HUMANOID_GROUND_Y`/EN-42 citation attributes the rescue re-ground to `ASTS2`/`ALAND0`, neither of which does it. → F1.
- **#29 (exact-magnitude pinning, not ordering):** **VIOLATION (medium)** — `HUMANOID_BOX` extent only ordering-tested. → F3. `HUMANOID_GROUND_Y` itself *is* exactly pinned (`toBe(0xe0)`) — compliant on that constant.
- **#21 (degenerate-but-finite input guard):** COMPLIANT — `catchFalling` guards non-finite `ship.x/y`, mirroring `spawnHumanoid`; the NaN case is tested.
- **#1 (type-safety escapes):** COMPLIANT — the `as unknown as` double-cast in the contract matches the repo RED-harness idiom, with rationale.
- **#3 (enum exhaustiveness):** N/A — no new enum; `EffectEvent` is reused with its existing `assertNever`.
- **#4 (`||` vs `??`):** COMPLIANT — no nullable-default `||` introduced.
- **#5 (`.js` import specifiers / `export type`):** COMPLIANT.
- **#8 (test quality — no `as any`/`.only`/`.skip`/vacuous):** COMPLIANT — exact-value assertions; but see F3 for a coverage gap and F2 for a test that masks a real bug (checks `y`, not process count / entropy).
- **ROM-always-wins (epic):** **VIOLATION** — the rescue simplifies ROM behaviour undocumented. → F1.
- **Citation gate (df1-1):** claims EN-43/44/45/46 byte-verify AND their prose is accurate (I re-read each cited line); **EN-42 byte-verifies but its prose is false** → F1.
- **Reuse-first (epic):** COMPLIANT on collision/`transformLander`/`classify`; **MISS** on `terrain.ts` `decodeAltitudes` (GETALT) for the catch → folded into F1.
- **PURE core / colour-by-index / no-count-guards:** COMPLIANT.

### Devil's Advocate

Assume this rescue is broken and a player is trying to break it. First: I shoot a lander carrying the last humanoid and immediately fly into the falling astro to catch it. In the real machine the astro would dangle under my ship and I'd carry it down to the terrain; here it *teleports* to row `$E0` and starts walking — a visibly different, "snappier" feel, and if `$E0` is below the actual terrain silhouette at that column the astro pops *inside the ground*, because the code never consults `GETALT`/terrain altitude the way the ROM (and AC1's own text) demands. Second: I botch that catch. The astro falls, hits `YMAX`, and — because df5-4 never resolves an uncaught landing — sits there `alive` and `falling` forever. Now I abduct or lose every *other* humanoid: the planet should explode (the whole point of the mode), but `panic()` sees one `alive` humanoid stuck at the floor and never fires. The signature terror is unreachable, permanently, from one missed rescue. Third, the determinism angle a speed-runner or a replay system would hit: catch a humanoid fast and the shared RNG stream is now consumed at a rate that depends on *when* I caught it, because a stale walk process revived next to the fresh one — two `rand()` draws per cycle instead of one. Any system that assumes a deterministic sim from a fixed seed (fingerprint tests, attract-mode replays, the df3 scheduler contract) diverges, and nothing in the suite notices because the only rescue test checks the astro's `y`. A confused *future maintainer* is the fourth victim: they read EN-42 in the citation gate — the repo's source of truth — and "learn" that the ROM re-grounds caught astros at `$E0` via `ALAND0`, which is simply not true, and they'll carry that false fact into df5-later/df7. The through-line: AC1 was implemented as a plausible-looking shortcut, the tests were written to that shortcut, and the citation was back-filled to a line that contains the right bytes for the wrong reason — so lint, the citation gate, and 703 green tests all pass while the mechanic diverges from the machine. That is exactly the failure mode this project's citation discipline exists to prevent.

**Handoff:** Back to TEA (red rework) — the blocking findings are testable (correct catch behaviour + single-process/entropy invariant).

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **The AFALL ground-outcome is the real "close the loop" and is only half-built** — non-blocking (scope signal for the epic)
  - The ROM's `AFALL0`/`ALAND`/`AFALL2`/`ALAND0` (DEFB6.SRC:933-965) is one coherent mechanic: a dropped astro either lands fatally, lands safely (P250, resumes walking), or is caught (rides down with the ship, P500). df5-4 shipped a simplified *caught* branch and no *uncaught* branch. Whoever picks up the rework (or a df5-later story) should treat the whole AFALL ground resolution — with `GETALT`/terrain reuse — as the unit, so both F1 and F5 close together and the panic becomes reachable in real play.

### Reviewer (code review) — rework cycle 1 re-review
- **Improvement** (non-blocking): `panic()` latches `reachedTop` on landers still in `phase:'descend'` without retiring their scheduler process.
  Affects `plugins/defender/src/core/landers.ts` (when a later story wires `panic()` to `mutants.ts transformLander`, retire the freaked lander's descend/carry process the way `killLander` retires humanoid processes — a dual-ownership trap otherwise). Harmless in df5-4 (no `rand()` draw with humanoids gone; `panic()` not yet called from `sim.ts`).
  *Found by Reviewer during code review (corroborated by reviewer-security).*
- **Gap** (non-blocking): the `landers.ts` module header (line 3 "Story df4-3"; lines 17/236 "the ground outcome ALAND is df5") predates df5-4 and now reads as misleading, since df5-4 shipped the CAUGHT rescue half in this same file.
  Affects `plugins/defender/src/core/landers.ts` (add a df5-4 header line; narrow the "is df5" comments to the still-deferred UNCAUGHT `AFALL0`/`ALAND` path).
  *Found by Reviewer during code review (corroborated by reviewer-comment-analyzer).*

### Dev (implementation) — rework cycle 2
- No upstream findings during implementation. (The Reviewer's header-staleness Gap was fixed this cycle; the `panic()` descend-lander dual-ownership note remains a deferred forward-integration item for the later wiring story.)

### Reviewer (code review) — rework cycle 2 re-review
- **Improvement** (non-blocking): two ROM-trace COMMENT citations point at the wrong lines for the DEFERRED AFALL ground-outcome path. The enforced df1-1 gate claims (EN-42..EN-46) are themselves byte- AND prose-correct — this is comment prose only, not a gate defect.
  Affects `plugins/defender/tests/df5-4-rescue-panic.test.ts` (line 9 describes AFALL2's ship-tracking GETALT ride-down but cites `:933-934`, which is AFALL0's *uncaught* hit-ground GETALT — AFALL2's own GETALT is `DEFB6.SRC:954-956`) and `plugins/defender/src/core/landers.ts` (lines 19, 246) plus the test scope-fence (line 33), where the `:933-960` range labelled "the UNCAUGHT ground outcome" double-books AFALL2 (`:945-957`, the CAUGHT path this story ships). Best folded into the AFALL-ground-outcome story, which rewrites these comments when it implements those routines.
  *Found by Reviewer during code review (corroborated by reviewer-comment-analyzer).*
- **Improvement** (non-blocking): `df5-4-rescue-panic-contract.ts:95` `as unknown as Partial<RescuePanicModule>` is now an unnecessary double-cast — a single-step `as Partial<...>` compiles clean (`tsc --noEmit` verified) because landers.ts's `EnemyBank` now declares `catchFalling`/`panic`, so module and contract overlap in one step. The justifying comment at `:92-94` ("the widened contract does not overlap it") is stale/false as of GREEN. Harmless (sanctioned RED-harness idiom), but drop the `unknown` hop or correct the rationale.
  Affects `plugins/defender/tests/helpers/df5-4-rescue-panic-contract.ts`.
  *Found by Reviewer during code review (corroborated by reviewer-rule-checker).*
- **Improvement** (non-blocking): the AC1 reuse guard's final assertion is a plain `/collide\(/` regex over `catchFalling`'s sliced body — it catches a hand-rolled-AABB mutant (verified) but as a text match could be satisfied by a decoy comment containing the literal `collide(`. Narrow residual (lang-review #15); not the defect this cycle closed.
  Affects `plugins/defender/tests/df5-4-rescue-panic.test.ts`.
  *Found by Reviewer during code review (corroborated by reviewer-rule-checker).*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

2 deviations

- **Planet explosion renders as the ADR-0005 SAFE variant, not the ROM's whole-page invert**
  - Rationale: the full AFALL ground resolution (fatal/survivable, per-column `GETALT`) is a coherent unit the round-1 reviewer recommended treating together (its Delivery Finding); it is a df5-later scope item, not part of df5-4's catch+panic MECHANIC.
  - Severity: minor
  - Forward impact: minor — the AFALL-ground-outcome story must resolve an uncaught faller (survive→walking or fatal→lost) so "all humanoids lost" is reachable after a botched rescue; no contract change here.
- **AC1 rescue re-ground deviation ("flat terrain BASE, not per-column GETALT") — ACCEPTED.**

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Planet explosion renders as the ADR-0005 SAFE variant, not the ROM's whole-page invert**
  - Spec source: context-story-df5-4.md, AC3
  - Spec text: "if the explosion is a full-screen effect it renders as the safe freeze/fade/particle variant and the substitution is logged as a 6-field Design Deviation citing docs/adr/0005-photosensitivity-accessibility-exception.md"
  - Implementation: `panic()` reports the planet explosion as the df4-2 effect event `'terrain-blow'` — the ROM's TERBLO (NEWP TERBLO,STYPE, DEFB6.SRC:434; the TERBLO body is a full-page `PCRAM` colour cycle / `COM`-style strobe). `effects.classify('terrain-blow')` maps it to `{ class: 'full-frame-strobe', presentation: 'particle' }`, so it renders as the non-strobing PARTICLE burst; the ROM full-frame strobe is never emitted, and `assertNoFullFrameStrobe` stays green (AC3 test pins both).
  - Rationale: ADR-0005 (docs/adr/0005-photosensitivity-accessibility-exception.md) — a whole-framebuffer invert/white-fill in a single frame is a photosensitive-seizure hazard that OUTRANKS ROM fidelity; the trigger and timing are ported and cited (claim EN-44), only the presentation is substituted, per the df4-2 policy this story reuses rather than re-decides (epic Decision B).
  - Severity: minor
  - Forward impact: none — the substitution is inherited from the shipped df4-2 classifier; df7 (HUD/render) will paint the `'terrain-blow'` presentation the classifier already dictates, no new assumption.
- **Rescue catch deposits at the flat terrain BASE, not the ROM's per-column GETALT landing + AFALL2 ship-tracking descent** (round-1 review F1)
  - Spec source: context-story-df5-4.md, AC1
  - Spec text: "a falling humanoid (AFALL, defender/DEFB6.SRC:927) caught by the ship before it hits the ground (GETALT ground test :933) is returned to the surface"
  - Implementation: `catchFalling` deposits the caught astro at `HUMANOID_GROUND_Y` — the flat terrain-surface base `$E0` (BGALT ROFF `LDA #$E0`, BLK71.SRC:380 = `terrain.ts BASE_OFFSET`, claim EN-42), walking, immediately on catch. The ROM (`AKIL1` :398 → `AFALL2` :945) instead rides the astro down with the ship (`OY16←PLAY16`, `OX16←PLABX`) to its per-column `GETALT` altitude, then `ALAND0` (:961) leaves it there.
  - Rationale: the per-column terrain landing + the multi-tick ship-tracking descent need the ship pose + world/terrain wiring (df7 territory); df5-4 is the pure MECHANIC and models humanoids on the flat base `$E0`, exactly as `sim.ts` already spawns them. `$E0` IS the correct terrain-surface base, so the row is faithful — only the terrain-following + ride-down presentation is simplified.
  - Severity: minor
  - Forward impact: minor — the world/terrain wiring (df7 or the AFALL-ground-outcome unit) should replace the flat-base deposit with the per-column `GETALT` landing; `catchFalling`'s contract (returns the caught astros, walking) is unchanged.
- **Uncaught-fall ground outcome deferred — a botched rescue can strand an astro and block the panic** (round-1 review F5)
  - Spec source: context-story-df5-4.md, AC2
  - Spec text: "humanoid count reaching zero -> planet explodes -> every remaining lander transforms into a df4-4 mutant (SCZ)"
  - Implementation: an UNCAUGHT falling humanoid rests alive at `YMAX` (the df4-3 placeholder floor); df5-4 does not implement the ROM's `AFALL0` ground outcome (fatal `ASTK1` / survivable `ALAND`, DEFB6.SRC:933-960). Since `panic()` waits while any humanoid is alive, one dropped-and-not-caught astro resting at the floor blocks the planet explosion permanently. The panic IS reachable via the primary abduction path (all humanoids abducted), which the tests exercise.
  - Rationale: the full AFALL ground resolution (fatal/survivable, per-column `GETALT`) is a coherent unit the round-1 reviewer recommended treating together (its Delivery Finding); it is a df5-later scope item, not part of df5-4's catch+panic MECHANIC.
  - Severity: minor
  - Forward impact: minor — the AFALL-ground-outcome story must resolve an uncaught faller (survive→walking or fatal→lost) so "all humanoids lost" is reachable after a botched rescue; no contract change here.

### Reviewer (audit)
- **AC3 planet-explosion deviation — ACCEPTED.** All 6 fields present and specific; the ROM
  trace (TERBLO full-page invert → df4-2 `'terrain-blow'` → SAFE `particle`) is accurate and
  cited (EN-44 verified), the substitution is genuinely ADR-0005-mandated (accessibility
  outranks fidelity), and the AC3 tests pin both the classification and the guard. Sound.
- **MISSING deviation — AC1 rescue re-ground (BLOCKING, see F1).** `catchFalling` simplifies
  the ROM's `AFALL2` ship-tracking descent + `GETALT` terrain landing (`ALAND0`) into an
  instant teleport to a fixed `$E0`, and no Design Deviation covers it — while the AC3
  substitution *was* logged, this equally-real substitution was not, and its citation (EN-42)
  attributes the value to the wrong routine. Either implement the faithful behaviour or add
  the missing 6-field deviation and correct the citation (per F1) before re-review.

### Reviewer (audit) — rework cycle 1 re-review
- **AC1 rescue re-ground deviation ("flat terrain BASE, not per-column GETALT") — ACCEPTED.**
  The round-1 MISSING deviation is now logged with all 6 fields, and its citation is corrected:
  claim EN-42 re-cites `$E0` to BGALT ROFF `LDA #$E0 SET BASE OFFSET` (BLK71.SRC:380) — byte-verified,
  and independently confirmed to be the genuine terrain base (`= terrain.ts BASE_OFFSET = 0xe0`). I
  re-read the ROM catch path (AKIL1 :398 → AFALL2 :945 rides the ship down `OY16←PLAY16+10` → GETALT
  per-column → ALAND0 :961, which makes the P500 walking process and never writes `$E0`): the
  deviation's description of what the ROM does vs what df5-4 does is accurate. Sound.
- **F5 uncaught-fall deviation — ACCEPTED.** Correctly scoped as deferred to the AFALL-ground-outcome
  unit; the panic remains reachable via the abduction path (tests exercise it). Consistent with my
  round-1 Delivery Finding. Sound.
- **No new undocumented deviations found this cycle.** The rework introduced only the `moveGen`
  determinism token, the (ineffective) boundary test, and the citation corrections — no new spec
  divergence.

### Reviewer (audit) — rework cycle 2 re-review
- **No new Design Deviations this cycle, and none newly required.** Commit a573547e changed only
  tests, comments, and `const`→`export const` on `HUMANOID_BOX`; `catchFalling`/`panic`/`armWalk`/
  `makeFall`/the `moveGen` guards are byte-identical to the cycle-1-resolved commit `6da1d9c3`
  (confirmed by diff + reviewer-security). The three logged deviations — AC3 planet-explosion SAFE
  variant, AC1 flat-base deposit vs per-column GETALT, and F5 uncaught-fall deferred — all remain
  **ACCEPTED**, unchanged and still accurate. No undocumented divergence introduced.

## Subagent Results

**Cycle: 1**

Method: FULL re-run of all enabled subagents (`workflow.reviewer_subagents`) against the true
df5-4 diff. NB: local `develop` is STALE (at PR #564); the real diff is `git diff origin/develop...HEAD`
— 4 files only (`landers.ts`, `claims/15-enemies.json`, the test + contract). All subagents were
pointed at `origin/develop`.

Working-tree audit (`pf reviewer audit-tree`): reported DIRTY on `sprint/epic-df5.yaml` — but that
is NOT a mutation leftover. It is the round-1 `review_verdict: rejected` / `review_findings` tracking
written by `pf sprint story update`, present in the working tree since SESSION START (confirmed in the
session-start git snapshot). All SOURCE files are clean: my own `HUMANOID_BOX` mutation-probe was
reverted (`git status` verified), and the diff-subagents mutation-tested in disposable `git worktree`
checkouts that never touched the live tree. No source corruption — proceeding is correct; running
`git checkout -- .` would wrongly discard legitimate uncommitted sprint tracking.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint clean; defender 707/707; orchestrator 503/503; citations 28/28 byte-verify; no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 0 blocking; F1 confirmed RESOLVED (all citations byte-accurate); 2 pre-existing header-staleness notes (LOW/MED) → non-blocking Delivery Findings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | F2 confirmed CLOSED (traced single + chained re-grab/re-drop/re-catch races, no double `rand()` path); 1 LOW forward-integration note → deferred (Delivery Finding) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | 1 HIGH CONFIRMED — F3 box-test vacuous, which I independently mutation-reproduced (box→{400,800} and →{1,1} both leave all 18 tests GREEN); 1 MED (#25 reuse guard anchors to import not call site); F1/#29-on-HUMANOID_GROUND_Y and 27 other checks compliant |

**All received:** Yes (4 enabled returned with results; 5 disabled, pre-filled)
**Total findings:** 1 confirmed blocking (HIGH), 1 confirmed non-blocking (MED), 2 informational (LOW). Round-1 F1, F2, F4, F5 all verified RESOLVED.

## Reviewer Assessment

**Verdict:** REJECTED — 1 blocking finding: the round-1 F3 boundary test is vacuous. It is titled to pin the catch-radius magnitude but passes for ANY box value (mutation-verified), so the rework's claim that F3 is closed is false, and a lang-review #29/#18 "fails-by-passing" test would ship.

The substance of this story is correct, and I want that on the record: **both round-1 HIGH blockers are genuinely resolved.** I verified each first-hand, corroborated by the specialists:

- **F1 (citation / ROM-fidelity) — RESOLVED.** `HUMANOID_GROUND_Y = 0xe0` is re-cited from the false `ASTS2` attribution to BGALT ROFF `LDA #$E0 SET BASE OFFSET` (BLK71.SRC:380) — I byte-verified the line, and it is the genuine terrain base (`= terrain.ts BASE_OFFSET = 0xe0`). I re-read the real ROM catch path (AKIL1 :398 → AFALL2 :945 rides the ship down → GETALT per-column → ALAND0 :961, which never writes `$E0`); the corrected comments and the newly-logged 6-field Design Deviation describe it accurately. Claims EN-42..EN-46 all byte-verify AND their prose is now honest. [DOC][RULE]
- **F2 (determinism race) — RESOLVED.** The `moveGen` generation token supersedes both the stale walk process and the AFALL process: each `armWalk`/`makeFall` bumps `rec.moveGen` and captures its generation, and both process guards retire on `rec.moveGen !== gen` rather than trusting `state`. I traced the same-tick grab→drop→catch sequence and the chained re-grab/re-drop cycles; the security specialist reached the same conclusion and confirmed the new determinism test is real (it reddens when the guard is reverted). [SEC]

What blocks is a defect the rework *introduced* while responding to F3:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **HIGH** | The AC1 boundary test "the catch radius is the df4-1 EXCLUSIVE box" does NOT pin `HUMANOID_BOX`. It constructs its edge from the SHIP's fixed 8×6 box (`ship.x + SHIP_W === astro.x`), which exercises `collide()`'s `astro.x < ship.x + ship.picture.width` clause — a clause that depends on the SHIP box, not `HUMANOID_BOX`. The complementary edge that WOULD depend on `HUMANOID_BOX.width` (`astro.x + HUMANOID_BOX.width > ship.x`) is never built. **Mutation-verified by me:** `HUMANOID_BOX`→`{400,800}` and →`{1,1}` each leave all 18 df5-4 tests GREEN. Round-1 F3 ("pin the box EXTENT") is therefore NOT closed, despite the rework commit + TEA/Dev asserting it is. lang-review #29 (loose test standing in for a magnitude) + #18 (test fails by passing). *The shipped value 4×8 is itself correct (ASTP1), so no wrong magnitude ships today — the defect is the vacuous guard plus the false "F3 closed" certification.* | `landers.ts:59`; `df5-4-rescue-panic.test.ts:156-180` | Rewrite the boundary test to build the edge on the ASTRO's own box (coincident Y): edge-touch MISS at `ship.x = at.x + HUMANOID_BOX.width`, one-unit-overlap CATCH at `... - 1`; or export `HUMANOID_BOX` and assert its value directly. **Prove it by mutation** — box→`{1,1}`/`{400,800}` MUST redden. |
| MEDIUM | The reuse-mandate guard `expect(landersSrc).toMatch(/from ['"]\.\/collision\.js['"]/)` anchors to the IMPORT declaration, not the `collide(` call inside `catchFalling` — it proves the module imports collision.js, not that the catch logic consumes it. Only one occurrence exists today so it is not a false positive now, but its coverage is narrower than its title ("rides the df4-1 collision seam ... not a re-derived overlap"). lang-review #25. | `df5-4-rescue-panic.test.ts:182-189` | Anchor inside `catchFalling`'s body (a source window from `const catchFalling` to its close requiring a `collide(` call). |
| LOW | `landers.ts` module header (line 3 "Story df4-3"; lines 17/236 "the ground outcome ALAND ... is df5") predates df5-4 but now misleads — df5-4 shipped the CAUGHT rescue half in this file. Pre-existing; outside the diff hunks. | `landers.ts:3,17,236` | Add a df5-4 header line; narrow "is df5" to the still-deferred UNCAUGHT `AFALL0`/`ALAND` path. |
| LOW | `panic()` latches `reachedTop` on descend-phase landers without retiring their scheduler process — harmless now, latent dual-ownership trap for the future `panic()`→`transformLander` wiring. | `landers.ts:396-406` | Retire the freaked lander's process when wiring `panic()` into sim/mutants (mirror `killLander`). |

**Dispatch tags:** [EDGE] disabled · [SILENT] disabled · [TEST] disabled · [TYPE] disabled · [SIMPLE] disabled · [DOC] F1 comments verified accurate; header staleness (LOW) · [SEC] F2 CLOSED + descend-lander dual-ownership forward note (LOW) · [RULE] **F3 box-test vacuous (HIGH, mutation-verified)** + #25 reuse guard (MED).

**Data flow traced:** ship pose (`Query`) → `catchFalling` non-finite guard → `collide(ship, [{x,y,picture: HUMANOID_BOX}])` over FALLING astros → on overlap: `state←'walking'`, `y←$E0`, `armWalk` (bumps `moveGen`, supersedes AFALL). Correct end-to-end; the only gap is that the test suite does not constrain the `HUMANOID_BOX` half of that `collide` box.

### Rule Compliance
Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (30 checks) + df5 epic guardrails. No `.claude/rules/*.md` or `SOUL.md`.
- **#29 (exact-magnitude, not ordering/loose):** **VIOLATION (HIGH)** — `HUMANOID_BOX` extent unpinned; the boundary test passes for any value (mutation-proven). `HUMANOID_GROUND_Y` itself IS exactly pinned (`toBe(0xe0)`) — compliant on that constant.
- **#18 (test fails by passing):** **VIOLATION** — same test; it certifies coverage it does not provide.
- **#25 (whole-file source guard):** **VIOLATION (MED)** — reuse guard anchors to the import, not the call site.
- **#17 / #24 (citation prose matches the cited line):** COMPLIANT now — EN-42 re-cited to BGALT; all five claims byte-verify and read honestly (round-1 F1 defect fixed).
- **ROM-always-wins + reuse-first (epic):** COMPLIANT — the flat-base simplification is now a logged 6-field deviation; collision / `transformLander` / `classify` genuinely reused.
- **Determinism (epic):** COMPLIANT — `moveGen` closes the F2 race (traced + specialist-confirmed).
- **#21 (degenerate-but-finite guard):** COMPLIANT — `catchFalling` NaN guard tested.
- **#3/#34 (enum exhaustiveness):** COMPLIANT — `EffectEvent` reused, `assertNever` intact.
- **#1/#8 (type escapes / test quality):** COMPLIANT — the `as unknown as` is the documented RED-harness idiom; no `.only`/`.skip`/`as any`.
- **PURE core / colour-by-index / no-count-guards:** COMPLIANT.

### Devil's Advocate
Assume this is broken. The scariest thing here is not the shipped code — it is the *green test suite lying about it*. A future maintainer re-tunes the catch feel and widens `HUMANOID_BOX` to `{width: 40}` so the ship scoops astros from half a screen away; they run the suite, see the test literally named "the catch radius is the df4-1 EXCLUSIVE box" pass, and ship a catch radius 10× the machine's. Nothing reddens — I proved that by mutation. That is precisely the failure this project's citation-and-magnitude discipline exists to prevent, and the round-1 review named it (F3) as a MEDIUM to fix. The rework *responded* to F3 with a test that looks like it pins the box (it even reasons about exclusive edges and one-unit overlaps) but keys entirely off the SHIP's box, so the astro box it claims to bound is a free variable. A test that cannot fail for the reason in its title is worse than no test: it converts an open gap into a false assurance, and it invites the next reader to trust it. Second angle: the delivery record now asserts "F3 ... is green" and "TEA's boundary test is green" — true statements that imply a false one (that the box is pinned). Approving would let that stand and would reward a non-functional fix, exactly the rubber-stamp the reviewer role exists to refuse. Third, a subtler confusion: `panic()` mutates `reachedTop` on descend-phase landers whose own scheduler process keeps running; today it draws no entropy so determinism holds, but the moment someone wires `panic()`→`transformLander` without retiring those processes, two owners will fight over one lander's position — the same state-as-liveness trap F2 just closed for humanoids, re-opened for landers. None of these are live crashes; the story's mechanic is faithful and its two hard bugs are genuinely fixed. But the blocking one is a fixable, testable, 4-line gap, and letting a fails-by-passing test through would quietly erode the one thing this repo cannot afford to lose: trust that a green test means what it says.

**Handoff:** Back to TEA (red rework) — the blocking finding is testable: a real boundary test that pins `HUMANOID_BOX` (proven by mutation), plus hardening the reuse guard to the call site. The two LOW comment/wiring notes are captured as non-blocking Delivery Findings.

## Dev Assessment — rework cycle 2

**Implementation Complete:** Yes

GREEN on the rework. Addressed the reviewer's blocking HIGH + the MED + the LOW doc finding; left the explicitly-deferred forward note. df5-4 suite **19/19**; full defender **708 passed**; orchestrator **503 passed**; `npm run lint` clean; purity + citations **68 passed**.

**Files Changed:**
- `plugins/defender/src/core/landers.ts` — exported `HUMANOID_BOX` (so the suite can pin its extent directly); fixed the stale df4-3 header + `makeFall` floor comment to say the CAUGHT rescue ships in df5-4 while the UNCAUGHT `AFALL0`/`ALAND` ground outcome stays a later df5 unit.
- `plugins/defender/tests/df5-4-rescue-panic.test.ts` — replaced the vacuous boundary test with (a) a DIRECT extent pin `expect(HUMANOID_BOX).toEqual({width:4,height:8})` and (b) a behavioural boundary built on the ASTRO's OWN right edge (`collide` clause `astro.x + HUMANOID_BOX.width > ship.x`) using FIXED literal offsets, so a wrong box width reddens; hardened the reuse guard to anchor `collide(` INSIDE `catchFalling`'s body, not just the import line.
- `plugins/defender/tests/helpers/df5-4-rescue-panic-contract.ts` — added `HUMANOID_BOX` to `RescuePanicModule`.

**Response to each finding:**
- **HIGH (F3 — vacuous box test) — FIXED, mutation-proven.** The old test keyed off the SHIP's 8×6 box, so `HUMANOID_BOX` was a free variable. The new tests key off the astro box and pin the value directly. Verified by mutation: `HUMANOID_BOX`→`{400,800}` and →`{1,1}` each now REDDEN 2 tests; restored `{4,8}` → 19/19 green. The false "F3 closed" claim is now a real, mutation-sensitive pin.
- **MED (#25 — reuse guard) — FIXED.** The guard now slices `catchFalling`'s body (`const catchFalling` → `const panic`) and asserts it contains `collide(`, in addition to the import check — a hand-rolled AABB in `catchFalling` that dropped the `collide()` call would now redden.
- **LOW (header staleness) — FIXED.** The module header now records that df5-4 shipped the CAUGHT rescue half in this file; the "is df5" comments are narrowed to the still-deferred UNCAUGHT ground outcome.
- **LOW (`panic()` descend-lander dual-ownership) — DEFERRED (unchanged).** Explicitly a forward-integration note for the later `panic()`→`sim.ts`/`transformLander` wiring; no live defect in df5-4 (no `rand()` draw with humanoids gone, and `panic()` is not yet wired). Left as the Reviewer's non-blocking Delivery Finding.

No behaviour change to the shipped mechanic: `HUMANOID_BOX` value, `catchFalling`, `panic`, and `moveGen` are untouched — the fix was strengthening the tests + honest comments. No new Design Deviations.

**Tests:** 19/19 df5-4 (708 defender, 503 orchestrator) passing (GREEN)
**Branch:** feat/df5-4-humanoid-rescue-panic (pushed)

**Handoff:** To review (re-review).

## Subagent Results

**Cycle: 2**

Method: FULL re-run of all enabled subagents (`workflow.reviewer_subagents`: preflight, comment_analyzer,
security, rule_checker) against the true df5-4 diff — local `develop` is 38 commits STALE, so the real diff
is `git diff origin/develop...HEAD` (4 files: `landers.ts`, `claims/15-enemies.json`, the test + contract).
Plus my own first-hand mutation verification of the round-1-re-review blocking finding (F3).

Working-tree audit (`pf reviewer audit-tree`): reported DIRTY on `sprint/epic-df5.yaml` ONLY — NOT a
mutation leftover. Its diff is purely the round-1-re-review `review_verdict: rejected` / `review_findings`
tracking written by `pf sprint story update`, present in the working tree since SESSION START (the
session-start git snapshot shows `M sprint/epic-df5.yaml`; the file is sprint tracking, not source). All
SOURCE files are clean: my `HUMANOID_BOX` mutation probes were reverted (`git status` shows only the YAML;
`HUMANOID_BOX` restored to `{4,8}`), and the diff-subagents mutation-tested in disposable `git worktree`
checkouts that never touched the live tree. `git checkout -- .` would wrongly discard legitimate sprint
tracking — proceeding is correct.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint clean; defender 775/775 (df5-4 19/19); orchestrator 503/503; citations + purity green; no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 0 blocking; F3-adjacent comments + EN-42..46 verified accurate; 2 ROM-trace citation-precision notes on the DEFERRED AFALL path (MED/LOW) → non-blocking Delivery Findings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (1 carried LOW) | F2 determinism CONFIRMED still closed (mechanic byte-identical to 6da1d9c3); `panic()` descend-lander draws no `rand()` — carried LOW forward note |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 (+1 info) | F3 CONFIRMED CLOSED by independent mutation ({400,800}/{1,1} redden; hand-rolled-AABB reddens the reuse guard); #29/#18/#25/#26 now all compliant; 1 LOW #1/#17 stale double-cast+comment in the test helper; 1 info #15 regex residual; all 34 checks otherwise compliant |

**All received:** Yes (4 enabled returned with results; 5 disabled, pre-filled)
**Total findings:** 0 confirmed blocking. 1 MEDIUM + 3 LOW non-blocking (captured as Delivery Findings). Round-1 F1/F2 and round-1-re-review F3 all VERIFIED RESOLVED.

## Reviewer Assessment

**Verdict:** APPROVED — the sole round-1-re-review blocker (the vacuous AC1 boundary test, F3) is genuinely closed, mutation-proven first-hand and independently by the rule-checker; both round-1 HIGH blockers (F1 citation, F2 determinism) remain resolved and their code is untouched this cycle. Every residual finding is Medium/Low comment-citation precision or a harmless stale test-helper cast — none Critical or High.

This is rework cycle 2 (Round-Trip Count 2). I verified the substance first-hand rather than trusting the delivery record:

- **F3 (round-1-re-review HIGH blocker — the vacuous box test) — RESOLVED, mutation-proven.** The old test keyed off the SHIP's 8×6 box, leaving `HUMANOID_BOX` a free variable. The rework (commit a573547e) replaced it with (a) a DIRECT extent pin `expect(loadRescuePanic().HUMANOID_BOX).toEqual({width:4,height:8})` and (b) a behavioural boundary built on the ASTRO's own right edge — `collide()`'s `astro.x + HUMANOID_BOX.width > ship.x` clause, the one clause that actually depends on the astro box — with fixed literal offsets (`ASTRO_W = 4`, not read back from the constant). I re-injected the exact round-1 mutants myself: `HUMANOID_BOX`→`{400,800}` and →`{1,1}` each redden 2 tests; restoring `{4,8}` → 19/19 green. reviewer-rule-checker reproduced this independently. A wrong catch-radius can no longer ship green. [RULE]
- **#25 reuse guard (round-1-re-review MEDIUM) — RESOLVED.** The guard now slices `catchFalling`'s body (`const catchFalling`→`const panic`, verified to contain the `collide(` call at `landers.ts:395`) and asserts `collide(` inside it, not merely the import line. rule-checker confirmed a hand-rolled-AABB mutant inside that slice reddens it. [RULE]
- **F1 (citation) & F2 (determinism) — remain RESOLVED, code untouched.** The ONLY non-comment change to `landers.ts` since the cycle-1-resolved commit `6da1d9c3` is `const`→`export const` on `HUMANOID_BOX` (verified by filtered diff). `catchFalling`/`panic`/`armWalk`/`makeFall`/the `moveGen` guards are byte-identical; reviewer-security re-traced the determinism guard (only the walk `step` closure draws `rand()`; a superseded process cannot revive), and both it and rule-checker byte-and-prose-verified claims EN-42..EN-46. [SEC][DOC]

**Data flow traced:** ship pose (`Query`) → `catchFalling` non-finite guard (`!Number.isFinite`) → `collide(ship, [{x, y, picture: HUMANOID_BOX}])` over the FALLING astros → on box overlap: `state←'walking'`, `y←$E0`, `armWalk` bumps `moveGen` and supersedes the AFALL process. Correct end-to-end; the test suite now constrains BOTH the astro-box half of that `collide` box (the F3 fix) and the reuse of the seam (the #25 fix).

**Pattern observed:** the rework strengthened the tests and honesty of the comments without touching the mechanic (`landers.ts:59` export + `landers.ts:243-246`/`:13-31` comment edits; `df5-4-rescue-panic.test.ts:156-202` test rewrite). Good pattern — a test-only response to a test-quality finding, mutation-proven.

**Error handling:** `catchFalling` rejects a non-finite ship coord with `[]` (tested); `panic()` returns `null` while any humanoid is alive or on a field that never spawned one (`humanoidEverSpawned`), and is idempotent via `panicFired` (tested). No new failure paths introduced this cycle.

### Non-blocking findings (captured as Delivery Findings — do not block the approval)

| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| MEDIUM | `test:9` cites AFALL0's GETALT lines (`:933-934`) for AFALL2's ship-tracking ground check; AFALL2's own GETALT is `DEFB6.SRC:954-956`. Comment prose about the DEFERRED path — the enforced EN-42..46 gate claims are correct. | `df5-4-rescue-panic.test.ts:9` | Fold into the AFALL-ground-outcome story (which rewrites these comments). |
| LOW | `:933-960` range for "the UNCAUGHT ground outcome" double-books AFALL2 (`:945-957`, the CAUGHT path) — 3 sites. | `landers.ts:19,246`; `test:33` | Narrow the range to `:933-944,958-960` or note the interleave. |
| LOW | `as unknown as` double-cast now unnecessary (single-step compiles clean) and its `:92-94` rationale comment is stale/false. Harmless test-helper idiom. | `contract.ts:92-95` | Drop the `unknown` hop or fix the comment. |
| LOW | reuse-guard `/collide\(/` regex could match a decoy comment substring (lang-review #15 residual). | `df5-4-rescue-panic.test.ts:195-202` | Strip comments from the slice, or match a call pattern. |
| LOW (carried) | `panic()` latches `reachedTop` on descend-phase landers without retiring their scheduler process — no live defect (no `rand()` drawn; not yet wired into sim). | `landers.ts:408-421` | Retire the freaked lander's process when wiring `panic()`→`transformLander`. |

### Rule Compliance
Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (30 checks) + df5 epic guardrails. No `.claude/rules/*.md` or `SOUL.md`.
- **#29 (exact-magnitude, not ordering/loose):** **COMPLIANT** — `HUMANOID_BOX` now pinned by a direct `.toEqual({width:4,height:8})` AND a mutation-sensitive boundary test (both round-1 mutants redden, verified by me and rule-checker). `HUMANOID_GROUND_Y` `.toBe(0xe0)` compliant. (Round-1-re-review VIOLATION closed.)
- **#18 (test fails by passing):** **COMPLIANT** — the boundary test now fails for the right reason (astro-box clause). (Round-1-re-review VIOLATION closed.)
- **#25 (whole-file source guard) / #26 (all-local assertion):** **COMPLIANT** — reuse guard anchored to the call site; boundary offsets are independent literals paired with a direct anchor.
- **#17 / #24 (comment/citation matches its cited line):** COMPLIANT on the enforced gate (EN-42..46 byte+prose verified). Two comment-prose citation-precision issues on the DEFERRED path (MED/LOW) and one stale test-helper comment (LOW) captured as non-blocking Delivery Findings — none in the df1-1 gate.
- **#1 (type-safety escapes):** one now-unnecessary `as unknown as` in the test helper (LOW, non-blocking); the pattern remains the sanctioned RED-harness idiom, only its rationale is stale.
- **ROM-always-wins + reuse-first (epic):** COMPLIANT — the flat-base simplification stays a logged 6-field deviation; collision / `transformLander` / `classify` genuinely reused (mutation-confirmed for `collide`).
- **Determinism (epic):** COMPLIANT — `moveGen` guard unchanged and re-traced.
- **#21 (degenerate-but-finite guard):** COMPLIANT — `catchFalling` NaN guard tested.
- **#3/#34 (enum exhaustiveness):** COMPLIANT — `EffectEvent` reused, `assertNever` intact.
- **PURE core / colour-by-index / no-count-guards:** COMPLIANT (purity 47/47 green).

### Devil's Advocate
Assume the approval is wrong. The scariest possibility last cycle was a green suite that lied about the catch radius; the rework's whole job was to make that lie impossible, so the sharpest attack is: did it actually? I did not take the commit message's word — I re-ran the exact two mutants the round-1 review named (`{400,800}` and `{1,1}`) against the live tree, and both redden two tests, and the rule-checker did the same independently in its own worktree. The direct `toEqual` pin alone forecloses ANY value drift, and the behavioural test additionally proves `collide()` consumes the astro box at the boundary. So the one thing I most feared — a future maintainer widening `HUMANOID_BOX` and shipping a half-screen scoop under a green "EXCLUSIVE box" test — is now caught. Second attack: did the test-only rework quietly perturb the mechanic and reopen F2's determinism race or F1's citation? No — the filtered diff since `6da1d9c3` is a single `export` keyword plus comments; `catchFalling`/`panic`/`moveGen` are byte-identical, and security re-traced the guard. Third, the subtler worry: am I waving through citation sloppiness the way round-1 correctly refused to? This is where I pushed hardest, because the wrong-GETALT-line in `test:9` is genuinely the SAME CLASS as round-1's F1. The distinction that makes it Medium, not High, is concrete and consistent: F1 was a df1-1 GATE claim (enforced source of truth, byte-verified by `citations.test.ts`) that was behaviourally FALSE about the SHIPPED constant, with NO deviation — three aggravating factors. Here the gate claims are all correct (verified twice over), the defect is in explanatory comments about the DEFERRED AFALL ground path that this story deliberately does not implement, the routine names and their anchor lines are right, and the simplification IS documented. A maintainer misled by `:933-934` looks two routines down, finds AFALL2's own GETALT at `:954`, and corrects it — friction, not a false fact about shipped behaviour. Blocking a third full cycle on a comment line-number for code that will be rewritten by the very next story would be perfectionism, not quality control; the severity ladder exists precisely so Medium/Low gets recorded and routed, not gated. Fourth: the `panic()` descend-lander process is a latent dual-ownership trap — but it draws no entropy today and `panic()` is not wired into `sim.ts`, so it is a forward note, correctly deferred. Nothing here rises to Critical/High; the mechanic is faithful, its two hard bugs stay fixed, and the blocking test-quality gap is closed with proof.

**Dispatch tags:** [EDGE] disabled · [SILENT] disabled · [TEST] disabled (test_analyzer) — F3 test-quality covered first-hand + by [RULE] · [DOC] comment-analyzer: EN-42..46 accurate; 2 deferred-path citation-precision notes (MED/LOW) · [TYPE] disabled — stale test-helper cast covered by [RULE] · [SEC] security: F2 still closed, descend-lander forward note (LOW) · [SIMPLE] disabled · [RULE] rule-checker: **F3 CLOSED (mutation-verified)**, #25 closed, all 34 checks compliant, 1 LOW #1/#17 + 1 info #15.

**Handoff:** To SM for finish-story.