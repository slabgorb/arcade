---
story_id: "sw3-8"
jira_key: ""
epic: "sw3"
workflow: "tdd"
---
# Story sw3-8: Port TIE wing-fragment death models (Obj_Tie_Wing_Frag_1/2/3) and wire to the TIE-destroyed animation

## Story Details
- **ID:** sw3-8
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** star-wars
- **Assignee:** Keith Avery
- **Branch:** feat/sw3-8-tie-wing-frag-models
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG} off develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T22:05:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T21:07:13Z | 2026-07-11T21:12:42Z | 5m 29s |
| red | 2026-07-11T21:12:42Z | 2026-07-11T21:42:10Z | 29m 28s |
| green | 2026-07-11T21:42:10Z | 2026-07-11T21:59:39Z | 17m 29s |
| review | 2026-07-11T21:59:39Z | 2026-07-11T22:05:54Z | 6m 15s |
| finish | 2026-07-11T22:05:54Z | - | - |

## Acceptance Criteria

TEA (RED phase) will formalize the acceptance criteria during the RED phase. The story intent is:
- Port the ROM's TIE wing-fragment death models from the Star Wars **object-table** source `WSOBJ.MAC`
  (ROM labels `TIE`/`TIENT`/`WING`; the story-title `Obj_Tie_Wing_Frag_1/2/3` are disassembly names)
- Wire the fragment models into the existing TIE-destroyed animation lifecycle so fragments spawn and animate on TIE destruction

## SM Assessment

**Setup verified — routing to TEA (O'Brien) for RED.** This is a 2-pt phased `tdd` story in `star-wars`,
no Jira (local tracking). Session, context, and branch (`feat/sw3-8-tie-wing-frag-models`, off
`origin/develop`) are all in place; story is `in_progress`; merge gate was clear (no open PRs across the
fleet). ACs are intentionally deferred to TEA per this repo's convention (TEA formalizes pinning tests in RED).

**ROM quarry located and staged (the key input for RED):**
- The models are in the Star Wars object-table source **`WSOBJ.MAC`** (`OBJECT TABLES AND VECTOR DRAW
  ROUTINES`), *not* `WSVROM.MAC`. A clean LF copy is staged for TEA at
  `…/a-1/…/scratchpad/WSOBJ.txt` (see `sprint/context/context-story-sw3-8.md` for the full path).
- **Read gotcha:** the file has embedded **NUL bytes** → plain `grep` reports "binary" and returns
  nothing. TEA must read via the **Read tool / awk** (or `LC_ALL=C grep -a`).
- **Label mapping:** story title `Obj_Tie_Wing_Frag_1/2/3` → ROM labels **`TIE` / `TIENT` / `WING`**
  under `.SBTTL OBJECT DRAW`. Transcribe geometry by ROM label, cited — do not invent.
- Cross-check `sprint/archive/sw2-6-session.md` for any prior-pass quarry extract.

**Handoff:** RED phase, owner **TEA**. No blockers.

## TEA Assessment

**Tests Required:** Yes
**Reason:** N/A — a model-port + behavioural-wiring story; both halves are unit/integration testable on the pure core and the render seam.

**Test Files:**
- `star-wars/tests/core/tie-wing-fragments.test.ts` — the MODEL PORT: exactly 3 exploded-TIE fragment models exist and are registered in `MODELS`; authentic vertex counts 18/18/28 (ROM `TI1`/`TI2`/`TI3`, anchor dropped); the 28-vert cabin fragment is byte-identical to `TIE_FIGHTER`'s aft half (verts 25–52); the two wings are congruent (equal edge-length multisets) but built from different points; every fragment well-formed (Vec3 tuples, in-range edges, no self-loops/dup-edges/orphans).
- `star-wars/tests/shell/render.tie-death-fragments.test.ts` — the WIRING: a destroyed TIE renders a **bounded** burst of extra geometry (seam-agnostic — drives the REAL kill path via `stepGame`, then compares total stroked segments against a matched empty baseline; never names a new state field).

**Tests Written:** 14 (9 RED + 5 supporting: 3 helper self-checks, 1 kill-fixture sanity, 1 boundedness guard) across 2 files, covering both ACs (port the models; wire them to the TIE death).
**Status:** RED — 9 failing, ready for Dev. Full star-wars suite **755 green, 0 regressions** (RUN_ID `sw3-8-tea-red`; cache `.session/test-runs/sw3-8-tea-red.md`). Key RED signal: the post-kill frame draws **447** segments vs an identical empty baseline's **447** — the TIE vanishes with zero replacement.

### Rule Coverage
| Rule | Test(s) | Status |
|------|---------|--------|
| TS #8 test-quality (no vacuous assertions) | Phase-C self-check: every assertion guarded by a non-vacuous existence/length check; typed `mkModel` fixtures (no `as any`/double-cast) | pass (self) |
| TS #2 generic/interface (readonly `Vec3` tuples, in-range edges) | `each fragment is a well-formed Model3D` | failing (RED) |
| Repo model contract (no orphan verts / no duplicate edges) | `no self-loops, no duplicate edges, no orphan vertices` | failing (RED) |
| Core purity (animation must live in `GameState`, advanced by `dt`; no shell reach-back) | both wiring tests read only public API + drive `stepGame`; never name a new field | failing (RED) |
| Provenance (no verbatim ROM source committed) | tests cite ROM labels + recovered counts as our own prose; coordinates transcribed by Dev into `models.ts` (reviewed practice) | pass (self) |

**Rules checked:** the TS lang-review checklist is largely a DEV implementation-pattern list (as-any, enums, null-handling) that applies to the GREEN code, not to data-porting tests; the applicable entries (#8 test-quality, #2 generic/interface) plus the load-bearing project rules for this story (model-data well-formedness, core purity, provenance) are pinned.
**Self-check:** 1 vacuous test found ("proper piece" looped an empty set) → fixed with an existence guard; 3 `as unknown as Model3D` fixtures found → replaced with a typed `mkModel` factory.

**Handoff:** To Dev (Julia) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/models.ts` — added `TIE_WING_FRAG_1/2/3` (`Obj_Tie_Wing_Frag` `TI1`/`TI2`/`TI3`): 18/18/28 verts at the `.S=13` scale (raw ROM ×13, matching `TIE_FIGHTER`); the two wings share one ROM-derived edge list (`.WL TI1`/`.WL2 TI2`); the cabin's vertices are sliced off `TIE_FIGHTER`'s aft half (byte-identical to TI3). Registered in `MODELS`.
- `src/core/state.ts` — `DyingTie` type + `dyingTies` field on `GameState`; `TIE_DEATH_SECONDS` (0.7) / `TIE_DEATH_SPREAD` (520) consts; `initialState` init.
- `src/core/sim.ts` — spawn a `dyingTie` on each bolt-vs-TIE kill; age/prune the list by `dt` in `stepGame`; clear on phase entry (`enterPhase`). Reused the existing `enemy-death` event — **no new GameEvent**, so `main.ts` + the events census are untouched (tsc confirms exhaustiveness intact).
- `src/shell/render.ts` — the space branch draws the three fragments flying apart over `TIE_DEATH_SECONDS`.
- `src/shell/wireframe.ts` — `GLOW_FOR` entries (enemy green) for the three fragment names (contact-sheet colour).

**Tests:** 764/764 passing (GREEN) — both sw3-8 files (11/11 core + 3/3 wiring); build (tsc + vite) passes. RUN_ID `sw3-8-dev-green`. No regressions.

**Visual eyeball (contact sheet):** confirmed on `/models.html` that the three fragment models render as clean, recognizable TIE pieces — the left/right wing fins (`V:18 E:29` each, the same shape at rotated orientations) and the faceted cockpit ball (`V:28 E:43`, matching the TIE fighter's central sphere). No garbled geometry; V/E counts match spec. The in-game death-burst MOTION is left for the playtest/Reviewer eyeball (see Delivery Findings).

**Branch:** `feat/sw3-8-tie-wing-frag-models` (pushed)

**Handoff:** To Reviewer for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells (764/764 green, build pass, tree clean, core purity confirmed) | confirmed 0, dismissed 0, deferred 0; raised 1 "verify" note (FRAG_2 separate table) → addressed in obs [SIMPLE]/[VERIFIED] |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter=false`; edge cases assessed by Reviewer (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings; no error paths in a pure data transform (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings; test quality assessed by Reviewer (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings; comment accuracy assessed by Reviewer (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings; type design assessed by Reviewer (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings; N/A (client-only game) + provenance assessed by Reviewer (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings; complexity assessed by Reviewer (see [SIMPLE]) |
| 9 | reviewer-rule-checker | No | Skipped | disabled | Disabled via settings; lang-review + core-purity + provenance enumerated by Reviewer (see Rule Compliance) |

**All received:** Yes (1 enabled returned clean, 8 disabled pre-filled; disabled domains assessed by Reviewer)
**Total findings:** 0 confirmed blocking, 0 dismissed, 0 deferred (13 observations recorded: 8 VERIFIED, 1 LOW, plus per-domain tags)

## Reviewer Assessment

**Verdict:** APPROVED

A tightly-scoped, faithful port: three authentic exploded-TIE models + a pure, dt-driven death-cue wired through the existing kill path. Tests are comprehensive and the geometry is eyeball-confirmed. No Critical/High issues.

**Data flow traced:** player bolt → `stepGame` bolt-vs-TIE loop (`collides(enemy.pos, bolt.pos, TIE_HIT_RADIUS)`, sim.ts:229) → on hit, `spawnedDying.push({pos, age:0})` (sim.ts:239) → merged with the aged/pruned `dyingTies` list (sim.ts:244) → returned in `GameState` (sim.ts:308) → `render` space branch draws `TIE_WING_FRAG_1/2/3` at `d.pos` offset by `age×TIE_DEATH_SPREAD` (render.ts:320-327). Safe because the cue is pure state, advanced only by `dt`, and the shell reads it read-only. The wiring is proven end-to-end by `render.tie-death-fragments.test.ts` (real kill → render → bounded burst).

**Pattern observed:** the `deathStarDestroyedAt`-style sim-stamped, shell-rendered effect (Dev-sidecar prescribed) applied as a per-entity list — models the multi-simultaneous-death case correctly. `render.ts:320-327`.

**Error handling:** N/A for pure data transforms — no error paths, no I/O, no external input. Divide-guard `TIE_DEATH_SECONDS > 0 ? … : 1` (render.ts:321) defends against a zeroed const.

### Observations (13)
- [VERIFIED] Core purity intact — `dyingTies` is pure state aged only by `dt` (sim.ts:246 `d.age + dt`); no `Date.now`/`Math.random`/`performance.now`/`new Date` in core (preflight: 0); render consumes state read-only. Complies with CLAUDE.md's core/shell boundary.
- [VERIFIED] [SEC] Provenance honored — no verbatim ROM source committed. `models.ts` cites ROM labels (`TI1`/`TI2`/`TI3`, `.WL TI1`) and describes geometry as our own prose; the vertex numbers are ported data exactly as `TIE_FIGHTER` already is. No 6809 mnemonics, no code fences of ROM source. Complies with the star-wars provenance rule.
- [VERIFIED] `TIE_WING_FRAG_2` as a separate literal table (not a computed `rot(FRAG_1)`) is correct ROM fidelity — the cabinet stores `.WP TI2` as its own point table, and every model in `models.ts` is a literal ported table; a computed transform would be inconsistent and could drift. The `tests/core` congruence test (equal edge-length multisets) + distinct-points test guard the authentic relationship without coupling. (Answers preflight's verify-note.)
- [VERIFIED] `TIE_WING_FRAG_3.vertices = TIE_FIGHTER.vertices.slice(-28)` is DRY and guaranteed-authentic — ROM `TI3` == `Obj_Tie_Fighter` verts 25–52 byte-identical; the shared readonly `Vec3` refs are safe because `Model3D`s are never mutated. Evidence: `models.ts` + the aft-half test. `models.ts:225` region.
- [VERIFIED] `dyingTies` is bounded — pruned each space step when `age > TIE_DEATH_SECONDS` (sim.ts:247); max concurrent = kills within 0.7s. The wiring "bounded" test proves it clears (no permanent cloud).
- [LOW] The quota-completing (final) TIE kill's burst is dropped: `progress()`→`enterPhase` resets `dyingTies:[]` in the same step (sim.ts:766, :809), so that one kill shows no fragments. Masked by the immediate warp to the surface phase (render switches branches), so it is invisible — acceptable, non-blocking. Filed as a non-blocking Delivery Finding.
- [TYPE] `[...enemies[ei].pos] as Vec3` (sim.ts:239) mirrors the adjacent existing `enemy-death` event cast (sim.ts:238) — consistent file convention, not an `as any`/double-cast. Compliant with TS lang-review #1.
- [TEST] The wiring tests are seam-agnostic (drive the real kill + `render`, never naming `dyingTies`) so they survive a different cue implementation; non-vacuous (guarded by existence/length asserts); typed `mkModel` fixtures avoid casts. Good.
- [EDGE] A *rammed* TIE (cockpit-damage pass) spawns no `dyingTie` — only bolt-killed TIEs do (the death cue lives in the bolt-vs-TIE loop). Correct: the death burst is a "destroyed by fire" tell, and a ram is a player hit, not a scored kill.
- [SILENT] No swallowed errors / empty catches / silent fallbacks — pure data transforms, no error paths.
- [SIMPLE] No dead code or over-engineering. The per-`dyingTie` `at()` closure (render.ts:322) is trivial allocation on a tiny list; the divide-guard is mildly defensive but harmless.
- [DOC] Comments accurate and cite the story + ROM correctly (`DyingTie` doc, const docs, the `models.ts` fragment block, the `sim`/`render` comments). No stale/misleading docs.
- [VERIFIED] No new `GameEvent` variant — the existing `enemy-death` event is reused, so `main.ts` + the `events.test.ts` census are untouched (the sidecar's exhaustiveness trap is avoided); `tsc` confirms.

### Rule Compliance
Rules that apply: the TS lang-review checklist + CLAUDE.md's core-purity boundary + the star-wars provenance rule. (No `SOUL.md`/`.claude/rules/` in this repo.)
- **#1 type-safety escapes** — enumerated every cast in the diff: `as Vec3` on spread tuples (sim.ts:239, matches convention); `as Mat4` — none; no `as any`, no `@ts-ignore`, no non-null `!`. COMPLIANT.
- **#2 generic/interface** — `DyingTie` is a proper interface (not `Record<string,any>`/`object`/`Function`); fields mutable-by-convention like every `GameState` collection. COMPLIANT.
- **#3 enums** — none added. N/A.
- **#4 null/undefined** — no `||`-vs-`??` hazard; `TIE_DEATH_SECONDS > 0` is an explicit guard, not falsy coercion. COMPLIANT.
- **#5 module/declaration** — `import type { …, DyingTie }` used for the type-only import (sim.ts:15); no `.js`-extension regressions (project uses bundler resolution throughout). COMPLIANT.
- **#7 async** — all synchronous. N/A.
- **#8 test quality** — non-vacuous, typed fixtures, no `as any` in assertions. COMPLIANT.
- **#10/#11 input-validation/error-handling** — no external input, no error paths (pure sim). N/A.
- **Core purity (CLAUDE.md)** — enumerated the two core files touched (`state.ts`, `sim.ts`): no DOM/`window`/`document`/`canvas`, no wall-clock, no RNG; `dyingTies` advanced solely by `dt`. COMPLIANT.
- **Provenance** — enumerated all committed prose/data: labels + recovered numbers only, no verbatim assembler. COMPLIANT.

### Devil's Advocate
Suppose this is broken. Where would it hide? First, determinism: `dyingTies` now rides in core `GameState`, and star-wars leans on same-seed reproducibility (the fingerprint suites). If the death cue introduced any non-determinism the whole sim would rot — but the list is spawned from deterministic collisions, carries only `{pos, age}`, and advances purely by `dt`; there is no `Date.now`, no RNG draw, no ordering non-determinism (kills are enumerated in array order). The 764-test suite, including determinism fingerprints, is green. Second, state leaks: could a stale `dyingTies` entry survive a phase change and render in the wrong place? `enterPhase` zeroes it and `render` only draws it in the space branch, so even a hypothetically-carried entry is invisible outside space and cleared on the next space entry — double-covered. Third, unbounded growth: rapid fire could pile up entries — but each is pruned past 0.7s, so the list is bounded by kills-per-0.7s; no leak. Fourth, aliasing: the aging map reuses `pos: d.pos` (shared ref) and `FRAG_3` shares `TIE_FIGHTER`'s vertex tuples — a mutation would corrupt the source, but models and `pos` are readonly-by-use and never mutated; safe. Fifth, the confused-user/visual angle: the final wave-kill shows no fragments (the warp eats it) and rammed TIEs show none (by design) — both are defensible, and the former is invisible. Sixth, a malicious/huge input: there is no external input surface here — it is offline client geometry. The one genuine soft spot is subjective: the in-game "fragments fly apart" *motion* (spread direction/scale/duration) is unverified beyond the contact-sheet model eyeball and the burst-exists test; but that is an explicitly-deferred playtest tunable (sw2-7), logged by TEA and Dev, not a correctness defect. I could not manufacture a failing case that isn't either invisible or an eyeball tunable. The code holds.

**Deviation audit:** 2 deviations (TEA: behavioural wiring; Dev: motion tunables) → both ACCEPTED (see Design Deviations → Reviewer (audit)).

**Handoff:** To SM (Winston Smith) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): the TIE death-animation SEAM is undesigned — recommend the repo's existing precedent, a core `GameState` stamp like `deathStarDestroyedAt` (e.g. a short-lived `dyingTies` list of `{pos, age}`, or a `tieDestroyedAt`+pos), advanced by `stepGame(dt)` and drawn shell-side by stroking the three fragment models at the dead TIE's position for a brief window. `render()` has no clock and core purity forbids a shell timer, so the animation MUST live in state — the wiring tests rely on exactly this and stay seam-agnostic otherwise. Affects `star-wars/src/core/state.ts`, `src/core/sim.ts` (the player-bolt-vs-TIE kill loop, ~`sim.ts:222-238`), `src/shell/render.ts` (space branch, ~`307-312`). *Found by TEA during test design.*
- **Gap** (non-blocking): the authentic fragment geometry is in the gitignored ROM object-table source `WSOBJ.MAC` (clean LF copy staged at `<a-1 scratchpad>/WSOBJ.txt`; disasm cross-name `reference/disasm/Object_3D_Data.asm:55/75/95` = `Obj_Tie_Wing_Frag_1/2/3` = ROM `TI1/TI2/TI3`). Recovered anchors: Frag_3's 28 verts are byte-identical to `TIE_FIGHTER` verts 25–52 (aft half); Frag_1→Frag_2 is the rotation `(x,y,z)→(x,z,−y)`; connectivity is in the ROM draw routines `.WL TI1`/`.WL2 TI2`/`.WL TI3` (edges are AUTHORED per the `models.ts` contract). Read the file via Read/awk — it has embedded NUL bytes so plain `grep` reports "binary". Affects `star-wars/src/core/models.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the wiring tests pin that a *bounded fragment burst renders* on TIE death, but leave the VISUAL fidelity (fragments flying apart / spin / fade / colour) to the mandatory dev-server + `/models.html` eyeball, per repo convention (render visuals are not core-pinned). Reviewer should eyeball the in-game TIE death. *Found by TEA during test design.*

### Dev (implementation)
- **Question** (non-blocking): the in-game death-burst MOTION (fragments spread ∓X for the wings / +Z for the cabin, `TIE_DEATH_SPREAD`=520 over `TIE_DEATH_SECONDS`=0.7s) is a Dev-chosen eyeball tunable — verified only that the three fragment MODELS render clean on `/models.html` (correct V/E, recognizable TIE pieces). The "fragments fly apart" beat in actual gameplay should be confirmed at the sw2-7 playtest / by the Reviewer. Affects `star-wars/src/shell/render.ts` + `TIE_DEATH_SECONDS`/`TIE_DEATH_SPREAD` in `state.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `dyingTies` is aged/pruned only in the SPACE step and cleared on phase entry, so a leftover cue is harmless (never renders outside space). If a future story wants TIE death cues to persist across a phase change, the aging pass would need to move out of the space branch. Affects `star-wars/src/core/sim.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the wave-completing (final) TIE kill shows no death burst — `progress()`→`enterPhase` clears `dyingTies` in the same step, and the immediate warp to the surface phase makes the drop invisible (render only draws the burst in the space branch). Harmless today; if a future story wants the final kill's fragments to linger through the warp, the cue would need to survive `enterPhase`. Affects `star-wars/src/core/sim.ts` (`progress`/`enterPhase`). *Found by Reviewer during code review.*
- **Question** (non-blocking): the in-game death-burst MOTION (spread direction/scale, 0.7s) remains an eyeball tunable — the three fragment MODELS are contact-sheet-verified and the burst is proven to render + be bounded, but the "fragments fly apart" feel should be confirmed at the sw2-7 playtest (already flagged by TEA + Dev; Reviewer concurs, non-blocking). Affects `star-wars/src/shell/render.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Wiring pinned behaviourally (burst appears + bounded), not the death mechanism**
  - Spec source: context-story-sw3-8.md / epic-sw3.yaml sw3-8 title
  - Spec text: "wire to the TIE-destroyed animation"
  - Implementation: the shell wiring test drives the real kill path and asserts a destroyed TIE renders a bounded burst of extra geometry (seam-agnostic, via total stroked segments); it does NOT pin the animation's motion/spin/fade/colour or per-fragment trajectories.
  - Rationale: the death seam is undesigned (left to Dev) and render visuals are an eyeball concern by repo convention (sw3-9/sw3-13); pinning the mechanism would over-couple the test and dictate the implementation. Existence + boundedness is the load-bearing anti-orphan guard; visual fidelity is verified by the mandatory eyeball (see Delivery Findings).
  - Severity: minor
  - Forward impact: Reviewer/Dev own the in-game visual check; the fragment MODEL geometry itself is fully pinned in the core test.

### Dev (implementation)
- **Death-burst motion parameters are Dev-chosen tunables (spec left them open)**
  - Spec source: context-story-sw3-8.md; tests/shell/render.tie-death-fragments.test.ts (TEA)
  - Spec text: "wire to the TIE-destroyed animation" — TEA pinned only that a BOUNDED fragment burst renders, deferring motion/duration to the eyeball.
  - Implementation: the three fragments fly apart along ∓X (wings) / +Z (cabin) over `TIE_DEATH_SECONDS`=0.7s, spreading `TIE_DEATH_SPREAD`=520 world units; direction/scale/duration are named consts.
  - Rationale: the exact motion is a render-visual eyeball concern per repo convention (sw3-9/sw3-13); the tests intentionally pin only existence + boundedness, so these are reasonable defaults to tune at the sw2-7 playtest, not spec requirements.
  - Severity: minor
  - Forward impact: none — pure render tunables; core determinism and the ported model geometry are unaffected.

### Reviewer (audit)
- **TEA: wiring pinned behaviourally (burst appears + bounded), not the death mechanism** → ✓ ACCEPTED by Reviewer: sound. The seam-agnostic render integration is the right level — it guards the anti-orphan wiring end-to-end without dictating the implementation, and the fragment MODEL geometry is fully pinned in the core suite. Visual fidelity is an eyeball concern by repo convention (sw3-9/sw3-13). No forward impact.
- **Dev: death-burst motion parameters are Dev-chosen tunables** → ✓ ACCEPTED by Reviewer: sound. `TIE_DEATH_SECONDS`/`TIE_DEATH_SPREAD` and the ∓X/+Z split are named render consts with zero core/determinism impact; the spec deliberately left motion open, and the models + boundedness are independently verified. Correct place to leave a playtest tunable.
- No UNDOCUMENTED deviations found: the diff matches the story scope (port the three fragments + wire a bounded death burst); nothing diverged from spec that TEA/Dev did not log.