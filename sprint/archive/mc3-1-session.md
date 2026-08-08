---
story_id: "mc3-1"
jira_key: "mc3-1"
epic: "mc3"
workflow: "tdd"
---
# Story mc3-1: Enemy warheads: ICBM straight-flight reducer, stateful cities/bases, and the minimal spawner

## Story Details
- **ID:** mc3-1
- **Jira Key:** mc3-1
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Branch:** none
**Phase:** finish
**Phase Started:** 2026-08-07T12:40:17Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T11:43:59Z | 2026-08-07T11:47:24Z | 3m 25s |
| red | 2026-08-07T11:47:24Z | 2026-08-07T12:07:17Z | 19m 53s |
| green | 2026-08-07T12:07:17Z | 2026-08-07T12:15:50Z | 8m 33s |
| review | 2026-08-07T12:15:50Z | 2026-08-07T12:30:14Z | 14m 24s |
| green | 2026-08-07T12:30:14Z | 2026-08-07T12:32:43Z | 2m 29s |
| review | 2026-08-07T12:32:43Z | 2026-08-07T12:40:17Z | 7m 34s |
| finish | 2026-08-07T12:40:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Conflict, non-blocking (AC5 premise is STALE — affects Dev directly).** The story
  description and the plan (Task 3, Step 1) call `MC-NICBMS`/`MC-MXICON`/`MC-LAUHGT`
  "new claims" and instruct Dev to create `docs/rom-study/claims/spawn.json` carrying
  them. They are **not new** — all three are already committed in
  `docs/rom-study/claims/config.json` (mc2), with exactly the byte-exact verbatims the
  plan quotes (`W3COMN.MAC:35`/`193`/`171`). **If Dev follows the plan literally and
  writes a `spawn.json` re-declaring these ids, `check-citations` fails with
  `duplicate id`.** Dev must REUSE the existing claims. No new claim file is needed
  unless spawn.ts introduces a numeric literal not already claimed — and it should not
  (see the Improvement below). The SM setup note asserted the opposite; it grepped the
  nonexistent `plugins/missile-command/claims/` path instead of `docs/rom-study/claims/`.
  The context file's setup note now carries a visible ⚠ TEA CORRECTION.
- **Improvement, non-blocking (top-edge consts for spawn.ts / AC5 + AC3 guard).** The
  AC3 no-uncited-literal guard is VALUE-based and sweeps every `src/core/*.ts`. For the
  top-edge launch origin, Dev should derive H and V from ALREADY-CLAIMED values rather
  than bare literals: `TOPSCR=222` (`config.json`, top-of-screen V) for the launch band,
  and a claimed H bound such as `IHMAX=247` for the random column — both are committed.
  A bare `256`/`210` (as the plan's illustrative impl uses) is uncited and reddens the
  guard. `spawn.test.ts` asserts `origin.v > LAUHGT (202)` and `origin.h ∈ [0,256]`,
  which `TOPSCR`/`IHMAX`-derived placement satisfies.
- **Gap, non-blocking (nothing byte-verified the COMMITTED claims until now).** The suite
  had no test running `check-citations` over the committed claim set — §3 of
  `citations.test.ts` only probes throwaways, and the coverage tests only check line
  pinning, not verbatim. `spawn-claims.test.ts` §3 closes that gap (it runs the real
  checker over the committed set), so AC5's "byte-exact verbatim" is now actually
  enforced for `config.json` (and any `spawn.json`).

### Dev (implementation)
- **Improvement** (non-blocking): `spawn.ts` declares a local `const TOPSCR = 222` because
  no core module exports it (cursor.ts exports HMAX but not TOPSCR). Value is claim-backed
  (MC-TOPSCR) so the guard passes, but the top-of-screen V now lives as a literal in two
  places. Affects `plugins/missile-command/src/core/` (a future story could export TOPSCR
  from a shared constants module and have cursor/spawn import it). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): `tests/icbm.test.ts:264` AC2 citation guard is toothless — `/UPDATE ICBM POSITIONS|UPDPOS|ICBM/` where the bare `ICBM` alt matches the module's own name, so the "cites the motion routine" assertion can never fail. Affects `plugins/missile-command/tests/icbm.test.ts` (drop the bare `ICBM` alternative → `/UPDATE ICBM POSITIONS|UPDPOS/`; icbm.ts's header still passes, stays green). *Found by Reviewer during code review ([RULE]/[TEST], rule_checker #15/#25).*
- **Gap** (blocking): `tests/spawn.test.ts:169` loose bound — `toBeGreaterThan(1)` where the scenario deterministically yields exactly 7 (1 existing + min(MXICON-1, 8)=6). A non-empty-cleared under-launch bug passes. Affects `plugins/missile-command/tests/spawn.test.ts` (pin `toBe(MXICON)` and `r.remaining` `toBe(2)`; stays green). *Found by Reviewer during code review ([RULE]/[TEST], rule_checker #8/#15).*
- **Improvement** (non-blocking): `tests/icbm.test.ts:257` `/W3MAIN/` is a whole-file positive anchor (has teeth — W3MAIN only appears in the citation — but unbounded). Affects `plugins/missile-command/tests/icbm.test.ts` (optionally bound to the source-of-truth comment block). *Found by Reviewer during code review ([RULE], rule_checker #25).*
- **Improvement** (non-blocking): `tests/icbm.test.ts:78` & `tests/spawn.test.ts:89` `(e as Error).message` unchecked cast in the RED loader catch. This is the established fleet idiom (identical in `tests/abm.test.ts`/`tests/cursor.test.ts`), test-only, cosmetic; a non-Error throw would append `(undefined)`. Affects the two test files (optionally narrow with `instanceof Error`, or leave for fleet consistency). *Found by Reviewer during code review ([RULE], rule_checker #1/#11).*
- **Improvement** (non-blocking): missing JSDoc parity — `icbm.ts` `Icbm`/`Vec` interfaces dropped the per-field docs the mirrored `abm.ts` carries, and `spawn.ts`'s sole public function `spawnIcbms` has no param/return JSDoc (the module header documents the contract in prose). Affects `plugins/missile-command/src/core/{icbm,spawn}.ts`. *Found by Reviewer during code review ([DOC], comment_analyzer).*
- **Improvement** (non-blocking): `icbm.ts` source-of-truth comment's "(UPDPOS for enemy warheads)" parenthetical is imprecise — UPDPOS (W3MAIN:1735) is a SHARED position-stepper; the ICBM-specific routine is ICPOSI / "UPDATE ICBM OR CM POSITION" (W3MAIN:1547/1557). Not false (UPDPOS does step enemy warheads) but could name ICPOSI. Affects `plugins/missile-command/src/core/icbm.ts`. *Found by Reviewer during code review ([DOC]).*
- **Improvement** (non-blocking, round 2): `tests/icbm.test.ts:264-266` rework comment says the retired bare-`ICBM` regex alt matched "the module's own name and type identifiers" — it matches the uppercase PROSE (`icbm.ts:3,13,37`), not the mixed-case type identifiers (`Icbm`/`launchIcbm`, and the regex is case-sensitive). Substantive claim (unfalsifiable) is true and mutation-proven; only the phrase overstates. Affects `plugins/missile-command/tests/icbm.test.ts` (reword "type identifiers" → "prose"). *Found by Reviewer during round-2 review ([RULE] #17).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

- **AC5 tested as satisfied-by-existing, not as "create spawn.json".** The spec (AC5 +
  plan Task 3 Step 1) reads literally as "create `docs/rom-study/claims/spawn.json`
  carrying MC-NICBMS/MC-MXICON/MC-LAUHGT". Reality: those claims already exist in
  `config.json` (see Delivery Findings). I wrote `spawn-claims.test.ts` to enforce AC5's
  **substance** — the three constants are claimed, cited at their physical W3COMN lines,
  and byte-exact — file-agnostically (`loadClaims()` reads every `claims/*.json`), rather
  than forcing a redundant new file that would risk `duplicate id`. Why: literal
  compliance (a MOVE of the claims into spawn.json) is pure churn the plan author did not
  intend — the plan believed the claims were absent — and the AC3 guard + `check-citations`
  are file-location-agnostic anyway. This is a factual correction to the implementation
  path, not a change to the story's deliverables (icbm.ts, field structures, spawn.ts).

### Dev (implementation)
- **Did not create `docs/rom-study/claims/spawn.json`; reused the committed claims.**
  - Spec source: plan `2026-08-07-missile-command-mc3-core-loop.md`, Task 3 Step 1; AC5.
  - Spec text: "Write the claims file — docs/rom-study/claims/spawn.json … MC-NICBMS/MC-MXICON/MC-LAUHGT".
  - Implementation: created no spawn.json; `spawn.ts` reuses the three claims already committed in `config.json` (mc2).
  - Rationale: those claims already exist byte-exact (TEA Delivery Finding); re-declaring their ids fails `check-citations` with `duplicate id`. The AC3 guard is value-based and `check-citations` reads every `claims/*.json`, so location is immaterial. AC5's substance (constants claimed + byte-exact) is satisfied and guarded by `spawn-claims.test.ts`.
  - Severity: minor.
  - Forward impact: none — mc3-2/3/4 consume the exports, not a spawn.json. If a later story adds a genuinely new spawn constant, author a claim then (any `claims/*.json`).
- **Spawner launch gate is `max(current V) < LAUHGT`, not the plan sketch's `min`.**
  - Spec source: context-story-mc3-1.md AC4; `tests/spawn.test.ts` (two-ICBM hold test).
  - Spec text: "holds fire while a live ICBM is still above LAUHGT"; ROM `W3COMN.MAC:171` "HEIGHT OF HIGHEST ICBM < THIS LAUNCHES MORE".
  - Implementation: `clearToLaunch = current.length === 0 || Math.max(...v) < LAUHGT`.
  - Rationale: the plan's illustrative impl used `Math.min(...v) <= LAUHGT`, which launches while a freshly-launched high ICBM is still above LAUHGT — contradicting AC4 and the ROM's "highest". The AC/test is the higher-authority spec.
  - Severity: minor.
  - Forward impact: none — matches the ROM; mc4's wave schedule replaces this spawner wholesale.
- **Top-edge origin uses cited `TOPSCR`(222)/`HMAX`(247), not the plan sketch's bare `256`/`210`.**
  - Spec source: plan Task 3 Step 4 note; AC5 ("any top-edge column/height constant is claim-backed"); AC3 guard.
  - Spec text: "Do not ship a bare 256/210 — the AC3 guard will red … reuse the cursor's cited HMAX … derive the top-edge v from the cited TOPSCR band."
  - Implementation: `v: TOPSCR (=222, MC-TOPSCR)`, `h: nextInt(rng, HMAX)` (HMAX=247 imported from `cursor.js`, claim MC-IHMAX).
  - Rationale: exactly what the plan's own note instructs; 256/210 are unclaimed and would redden the AC3 guard.
  - Severity: minor.
  - Forward impact: none.

### Reviewer (audit)
- **Did not create spawn.json; reused committed claims** → ✓ ACCEPTED by Reviewer: rule-checker independently confirmed MC-NICBMS/MC-MXICON/MC-LAUHGT/MC-TOPSCR all committed with matching values; a re-declaring spawn.json would indeed trip `check-citations` duplicate-id. Sound.
- **Launch gate `max(v) < LAUHGT`, not `min`** → ✓ ACCEPTED by Reviewer: matches AC4's wording and the ROM's "HEIGHT OF HIGHEST ICBM < THIS LAUNCHES MORE" (W3COMN.MAC:171). The two-ICBM test proves it. Correct call over the plan's buggy sketch.
- **Cited TOPSCR(222)/HMAX(247) placement, not bare 256/210** → ✓ ACCEPTED by Reviewer: rule-checker confirmed every src/core literal is claim-backed (AC3 guard green); TOPSCR from cursor.json, HMAX reused via import. Exactly the plan's own instruction.

## Sm Assessment

**Story:** mc3-1 (5pt, p1, tdd/phased) — the enemy-side data model mc3-2/3/4 all build on. Targets `plugins/missile-command/`.

**Board probes (clean):** `git fetch --prune` + `git branch -r | grep -Ei mc3` → no mc3 branches. Sibling `.session/` sweep → only a-1 owns jt9-50. No local session, no branch clash. Story was `backlog` on arrival; stamped `in_progress` and pushed the claim (branch + epic stamp + context) so it is now visible to every checkout.

**Premise measured before setup (all falsifiable claims SOUND):**
- Plan doc present: `docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md` (tasks 1-3).
- `abm.ts` exports `launchAbm(origin,target)` / `stepAbm(abm)` — the mirror template for the new `icbm.ts`.
- `field.ts` already exports `NCITY, START_CITIES, NMISBA, CITIES, BASES` — story APPENDS City/Base/createCities/createBases/MAXMIS; do not alter the existing cited exports.
- `spawn.ts` does not yet exist (new file, correct).
- Reuse claim `MC-MAXMIS` exists (glossary + citations, `W3COMN.MAC:29` = `MAXMIS=10.` decimal). New claims MC-NICBMS / MC-MXICON / MC-LAUHGT do not yet exist — expected.

**Two clarifications handed to context (measured-note blockquote, ACs left verbatim):**
1. **Claims path:** the description's `claims/spawn.json` is shorthand — this game's claims live at `plugins/missile-command/docs/rom-study/claims/`. The new claim file is `.../docs/rom-study/claims/spawn.json`; do NOT create a top-level `plugins/missile-command/claims/` dir.
2. **The "replace bare 256/210" clause is a FORWARD guard, not a cleanup:** there is currently NO bare `256`/`210` literal in `src/core/`. The new spawner must use cited top-edge consts (TOPSCR=222 decimal / HMAX) rather than introducing magic numbers, so the AC3 guard stays green.

**Handoff:** → TEA (Han Solo) for RED. Write failing tests for: `launchIcbm/stepIcbm` straight-flight-to-target-and-snap at unit speed (cite UPDATE ICBM POSITIONS, W3MAIN); stateful cities/bases + createCities(6 live)/createBases(3 live, ammo=MAXMIS); and the minimal seeded spawner (≤MXICON=7 on screen, launch while NICBMS=8 budget remains and highest ICBM below LAUHGT=202/0xCA, seeded `@shared/rng`). Keep `core/` pure — the purity guard will scan the new source text.

## Tea Assessment

RED phase complete (the phase pointer above read `red` on my arrival and I advanced it
to `green` on exit). Four failing test files added and committed (`test(mc3-1): …`,
on `feat/mc3-1-enemy-warheads-icbm-cities-bases-spawner`).

**RED evidence (full `missile-command` project):** `31 failed | 376 passed (407)`,
`3 failed files | 16 passed`. Every failure is a self-describing "…not built yet…"
message (never a bare module-resolution trace), and `npm run lint` (tsc --noEmit) is
GREEN — the not-yet-built modules are loaded via the `const SPEC` + `import(/* @vite-ignore */)`
idiom, so the release gate stays green while the modules are absent. **No pre-existing
missile-command test regressed.**

**Test files → ACs:**
| File | ACs | Failing? | Notes |
|------|-----|----------|-------|
| `tests/icbm.test.ts` | AC1, AC2 | 15/15 RED | launch-at-origin, straight-line (perpDist≤1.5), monotonic close, snap-on-arrival, idempotent + non-mutating, constant unit speed (farther⇒more ticks), field fuzz, W3MAIN/UPDPOS citation scan |
| `tests/structures.test.ts` | AC3 | 6/7 RED | createCities(6 live @CITIES)/createBases(3 live @BASES, ammo=MAXMIS=10); pure-factory (fresh array each call); the 1 pass is the append-only guard proving CITIES/BASES still stand |
| `tests/spawn.test.ts` | AC4 | 10/10 RED | MXICON cap (fills to 7), budget cap + budget=0 no-op, no-live-targets no-op, hold-fire while any ICBM above LAUHGT, **two-ICBM max()-not-min() hold test**, top-edge placement + budget decrement, determinism, non-mutation |
| `tests/spawn-claims.test.ts` | AC5 | 0/9 — GREEN guard | claims exist (config.json) + physical-line coverage + **byte-exact `check-citations` over the committed set** (the first test to do so) + a tampered-verbatim teeth probe |

**The one non-obvious test to defend (spawn.test.ts):** AC4's launch gate is "hold fire
while a live ICBM is still above LAUHGT". Cabinet V grows UPWARD (TOPSCR=222 is the top),
so the "highest ICBM" is `max(pos.v)` and the ROM launches only once `max(v) < LAUHGT`.
The illustrative impl in the plan uses `min(v) <= LAUHGT`, which would (wrongly) launch
whenever the LOWEST missile drops below LAUHGT even while another is freshly launched high.
I added a two-ICBM test (one above LAUHGT, one below, room on screen ⇒ MUST hold) that
distinguishes max from min. Dev must gate on the maximum height, not the minimum.

**Rule coverage (project rules beyond ACs):**
- **core/shell purity** (`purity.test.ts`, the repo's cardinal rule) — auto-swept on every
  new `src/core/*.ts`; the RED loaders explicitly forbid clock/entropy/shell-import, and
  the spawner takes seeded `@shared/rng` only. No re-assertion needed (the sweep bites the
  moment the modules land).
- **no un-cited numeric literal** (`citations.test.ts` §4, AC3 guard) — value-based, auto.
  The spawn constants 8/7/202 are already claimed; `spawn-claims.test.ts` adds the missing
  byte-exact enforcement over the committed set. Top-edge consts must reuse claimed
  `TOPSCR`/`IHMAX` (Delivery Findings › Improvement).
- **immutability / determinism** — every reducer test asserts non-mutation of its input and
  seed-determinism (icbm, spawn), matching the abm.ts precedent.
- **RED import idiom / tsc-green** — verified `npm run lint` passes with all three modules
  absent.

**Self-check (vacuous assertions):** none — every test asserts a concrete value or a
structural equality; no `assert(true)`, no `is_some()`-on-always-None, no `let _ =`.

**Handoff → Dev (Yoda) for GREEN.** Implement icbm.ts, append to field.ts, create spawn.ts
per the plan's Tasks 1–3, with TWO corrections from the Delivery Findings: (1) do **not**
create `spawn.json` re-declaring MC-NICBMS/MC-MXICON/MC-LAUHGT — reuse the committed
`config.json` claims; (2) gate the spawner on `max(v) < LAUHGT`, and place origins using
claimed `TOPSCR`/`IHMAX`-derived values, not bare `256`/`210`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/icbm.ts` (new) — pure `launchIcbm`/`stepIcbm` straight-flight reducer at unit speed (UPDATE ICBM POSITIONS, W3MAIN).
- `plugins/missile-command/src/core/field.ts` (append) — `MAXMIS=10`, `City`/`Base` types, `createCities()`/`createBases()`. The pre-existing `FieldPos`/`NCITY`/`START_CITIES`/`NMISBA`/`CITIES`/`BASES` exports are byte-for-byte untouched.
- `plugins/missile-command/src/core/spawn.ts` (new) — `NICBMS`/`MXICON`/`LAUHGT` + `spawnIcbms`. Reuses the committed claims; NO `spawn.json` created.

**Tests:** 411/411 passing (GREEN) — full `missile-command` project (19 files). `npm run lint` (tsc --noEmit) GREEN. `npm run test:orchestrator` 408/0. Purity sweep + the AC3 no-uncited-literal guard both pass over the three new/changed core modules; `spawn-claims.test.ts` byte-verifies the committed claim set.

Feature branch `feat/mc3-1-enemy-warheads-icbm-cities-bases-spawner` (pushed) — merged into develop via PR #48.

**Minimalism note:** implemented exactly the five ACs / TEA tests — three leaf/near-leaf core modules, no wiring into `game.ts`/render/input (those are Tasks 7–9 = sibling stories mc3-2/3/4, explicitly out of mc3-1 scope). No error handling beyond the pure guards the tests exercise (empty screen / no targets / zero budget / arrived-idempotence / divide-by-zero at coincident origin-target).

**Corrections applied vs the plan sketch** (see Design Deviations › Dev): reused committed claims instead of a new `spawn.json` (avoids `duplicate id`); `max(v) < LAUHGT` launch gate (ROM's "highest ICBM", matches AC4's two-ICBM test) rather than the sketch's `min`; cited `TOPSCR`/`HMAX` placement rather than bare `256`/`210`.

**Handoff:** → Reviewer (Obi-Wan) for the review phase.

### Dev (rework round 1)
Addressed the Reviewer's two blocking `[TEST]` findings — both test-only, both stay green (the code was correct):
- `tests/icbm.test.ts:264` — dropped the bare `ICBM` regex alt; AC2's motion-routine citation guard can now fail if the citation is removed (`/UPDATE ICBM POSITIONS|UPDPOS/`).
- `tests/spawn.test.ts:169` — pinned the non-empty-cleared launch to `toBe(MXICON)` and `remaining` `toBe(8 - (MXICON-1))` (=2), replacing the loose `> 1`.
Non-blocking notes (JSDoc parity, UPDPOS→ICPOSI citation precision, whole-file `/W3MAIN/` anchor, cast idiom) left for a follow-up per Reviewer's non-blocking classification — no code change. Full suite 411/411, lint clean. Commit `087e0390`, pushed. No new deviations.

## Subagent Results (Round 1)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: missile-command 411/411, orchestrator 408/0, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — I covered edge/boundary myself (see Assessment) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no swallowed errors in pure reducers (self-checked) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality covered by rule_checker #8/#15 + my own pass |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (both non-blocking LOW: missing JSDoc parity, spawnIcbms undoc) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types checked by rule_checker #1/#2 (readonly, no escapes): clean |
| 7 | reviewer-security | Yes | clean | none | N/A — pure sim, no external surface; entropy only via seeded Rng |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — code is minimal (3 leaf reducers); no over-engineering seen |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 5 (2 blocking test-tooth: #2 icbm:264, #4 spawn:169; 3 non-blocking) |

**All received:** Yes (4 enabled returned: preflight+security clean, comment_analyzer+rule_checker with findings; 5 disabled pre-filled)
**Total findings:** 7 confirmed (2 blocking, 5 non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment (Round 1)

**Verdict:** REJECTED

The shipped `src/core` code is correct and fully rule-compliant — but two TDD guards are toothless, and in a TDD deliverable an AC whose test cannot fail is a blocking gap. Both fixes are trivial assertion-tightenings that stay green (the code already satisfies them), so this is a fast red-rework loop, not a redesign.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[RULE]`/`[TEST]` | AC2 citation guard is a no-op: `/…\|ICBM/` bare-`ICBM` alt matches the module's own name, so the "cites the motion routine" test can never fail | `tests/icbm.test.ts:264` | Drop the bare `ICBM` alt → `/UPDATE ICBM POSITIONS\|UPDPOS/` (icbm.ts header still passes) |
| [MEDIUM] `[RULE]`/`[TEST]` | Loose bound: `toBeGreaterThan(1)` where the non-empty-cleared launch deterministically yields exactly 7; an under-launch bug on this path passes | `tests/spawn.test.ts:169` | Pin `toBe(MXICON)` and `r.remaining` `toBe(2)` |

**Data flow traced:** seeded `Rng` → `spawnIcbms` `nextInt(rng, HMAX)`/`nextInt(rng, len)` → ICBM origin/target; `stepIcbm` advances head along recomputed unit vector → snaps at `remaining ≤ 1`. Deterministic and pure end-to-end (safe: no clock/entropy/mutation — confirmed `[SEC]` clean and rule_checker #27 purity clean).

**Findings by source tag:**
- `[RULE]` rule_checker (29 rules / 71 instances): 5 findings. **2 blocking** (above). 3 non-blocking: whole-file `/W3MAIN/` anchor (icbm:257), and the `(e as Error).message` cast idiom (icbm:78 / spawn:89 — the established fleet pattern, also in abm/cursor tests). **0 source-code violations** — purity ✓, no un-cited literal ✓ (MAXMIS/NICBMS/MXICON/LAUHGT/TOPSCR all claim-confirmed), append-only field.ts ✓, `.js` imports ✓, `readonly` params ✓, degenerate-input (origin===target) handled ✓.
- `[DOC]` comment_analyzer: 2 non-blocking — missing JSDoc parity (icbm interfaces / spawnIcbms). Plus my own: the `(UPDPOS for enemy warheads)` parenthetical is imprecise (ICPOSI is the ICBM-specific routine); non-blocking.
- `[SEC]` security: clean — no external surface, seeded entropy only.
- `[EDGE]`/`[SILENT]`/`[TEST]`/`[TYPE]`/`[SIMPLE]`: specialists disabled via settings; I covered these domains directly — edge cases (empty screen, no targets, zero budget, coincident origin/target, spread-of-empty guard) all handled; no swallowed errors; types are `readonly` with no escapes; the three reducers are minimal with no over-engineering.

**Devil's Advocate:** Could a malicious/confused caller break these reducers? `spawnIcbms` with a non-integer `remaining` would make `launches` fractional and the loop count diverge from the decrement — but `remaining` is sourced from `NICBMS` (int) and only ever decremented by integer launches, so the domain forecloses it; not reachable, noted not filed. `Math.max(...current.map())` spreads the ICBM array — bounded by MXICON in the real loop, so no arg-count blow-up. `stepIcbm` on a hand-built ICBM with `pos` already past `target` still converges (recomputes the vector each tick). Floating-point `pos.v` vs integer `LAUHGT` compares fine. The real weaknesses are not in the code — they are the two toothless tests: a future refactor that deleted the ICBM routine citation, or broke the non-empty-cleared launch count, would ship green. That is precisely why AC2's and AC4's guards must have teeth before this merges. Nothing else rises above LOW.

**Handoff:** Back to Dev (Yoda) — green rework (gate recovery_config target_phase: green), two assertion tightenings (both stay green).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — Round 2 GREEN: missile-command 411/411, orchestrator 408/0, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge/boundary self-covered (unchanged from R1) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no swallowed errors (self-checked) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality covered by rule_checker + my own pass |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — the two new explanatory comments are arithmetically accurate; R1 JSDoc notes remain open (non-blocking) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — no type change this round |
| 7 | reviewer-security | Yes | clean | none | N/A — delta is test-only; no new entropy/shell/injection surface; src/core byte-identical to R1 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — no complexity added |
| 9 | reviewer-rule-checker | Yes | findings | 1 (+2 resolved) | confirmed: both R1 blocking findings RESOLVED (mutation-tested live); 1 new non-blocking #17 wording nit |

**All received:** Yes (4 enabled re-run on the round-2 tree: preflight+comment+security clean, rule_checker confirmed both fixes resolved; 5 disabled pre-filled)
**Total findings:** 1 confirmed non-blocking (comment wording nit), 0 blocking, 2 prior-blocking RESOLVED, 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

Round 2 addressed both round-1 blocking findings, and the fixes were **mutation-verified**, not merely re-read: the rule_checker deleted the citation paragraph from `icbm.ts` (guard test reddened, 14 others unaffected) and capped the spawner's launches at 1 (the pinned `toBe(MXICON)` assertion reddened where the old `> 1` would have passed) — both probes reverted, tree clean. The `src/core` code is byte-identical to round 1 (already confirmed correct and fully rule-compliant), so no correctness surface changed.

**Data flow traced:** unchanged from round 1 and re-confirmed — seeded `Rng` → `spawnIcbms` → ICBM origin/target; `stepIcbm` straight-line to snap. Pure, deterministic, no external surface (`[SEC]` clean again this round).

**Findings by source tag:**
- `[RULE]` rule_checker: the two round-1 blocking findings **RESOLVED** (mutation-tested). One new **non-blocking** #17 note — the rework comment at `icbm.test.ts:264-266` says the retired bare-`ICBM` alt matched "type identifiers"; it actually matches the uppercase prose (identifiers are mixed-case `Icbm`/`launchIcbm`, regex is case-sensitive). The substantive unfalsifiability claim is TRUE and mutation-proven; only the phrase overstates the mechanism. LOW — filed, not blocked (a third round over a one-word comment whose point is correct would be disproportionate).
- `[DOC]` comment_analyzer: clean this round — the two new explanatory comments are arithmetically accurate. Round-1 JSDoc-parity and `UPDPOS`→`ICPOSI` notes remain open, non-blocking.
- `[SEC]` security: clean — delta is test-only.
- `[TEST]`: the previously-toothless guards now have teeth (mutation-proven).
- `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SIMPLE]`: specialists disabled; self-covered — no change this round (2 test-assertion tightenings only).

**Devil's Advocate:** Could the tightened assertions be *wrong* (too strict, pinning an accident)? The pinned values come from the production module's real export (`MXICON` destructured from `loadSpawn()`) and the ROM-derived formula `min(MXICON-length, remaining)` — the rule_checker re-derived 6 launches / total 7 / remaining 2 against `spawn.ts`'s actual arithmetic and mutation-proved the assertion distinguishes a broken implementation. So the pin reflects the spec, not a coincidence. The only residual imperfection is a one-word comment imprecision (`type identifiers` vs `prose`), which changes nothing a test or user relies on. Nothing rises to blocking.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.
## Impact Summary

**BLOCKING FINDINGS:** 0 · **NON-BLOCKING:** 6 · **Verdict:** approved (round 2) · **Suite:** missile-command 411/411, orchestrator 408/408, tsc clean.

### Resolved round-1 blocking (now verified)
1. **AC2 citation guard** — `tests/icbm.test.ts:264` bare-`ICBM` regex alt made the motion-routine citation unfalsifiable. Fixed in `087e0390` → `/UPDATE ICBM POSITIONS|UPDPOS/`; mutation-verified (citation-delete reddens the guard).
2. **AC4 launch bound** — `tests/spawn.test.ts:169` loose `toBeGreaterThan(1)` would miss a non-empty-cleared under-launch. Fixed in `087e0390` → `toBe(MXICON)` + `remaining toBe(8-(MXICON-1))`; mutation-verified (launch-cap-at-1 reddens it).

### Current non-blocking (follow-ups)
- Stale AC5 premise — claims already in `config.json`; Dev correctly reused them (no `spawn.json`). Accepted.
- Top-edge consts — origins placed via cited `TOPSCR`(222)/`HMAX`(247), not bare 256/210. Accepted.
- Gap closed — `spawn-claims.test.ts` §3 byte-verifies the committed claim set (first test to enforce AC5 verbatim).
- `spawn.ts` local `const TOPSCR = 222` duplication (no core module exports TOPSCR) — future const-export.
- `tests/icbm.test.ts:257` whole-file `/W3MAIN/` anchor — optional bounding.
- `(e as Error).message` fleet cast idiom; round-2 comment wording (`type identifiers`→`prose`).

### Forward impact
mc3-2/3/4/5 consume mc3-1's exports (`Icbm`, `City`, `Base`, `spawnIcbms`, the constants). The byte-exact claim set is production-ready. No non-blocking finding blocks a dependent story.
