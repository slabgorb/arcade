---
story_id: "8-3"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-3: Wave 1 — space combat: cockpit crosshair, TIE fighters, fireballs, firing, 3D collisions, lives, score

## Story Details
- **ID:** 8-3
- **Jira Key:** (none — local tracking)
- **Workflow:** tdd
- **Stack Parent:** 8-2 (feat/8-2-port-authentic-3d-vector-models)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-27T22:14:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T21:22:45Z | 2026-06-27T21:24:48Z | 2m 3s |
| red | 2026-06-27T21:24:48Z | 2026-06-27T21:39:19Z | 14m 31s |
| green | 2026-06-27T21:39:19Z | 2026-06-27T21:59:31Z | 20m 12s |
| review | 2026-06-27T21:59:31Z | 2026-06-27T22:14:27Z | 14m 56s |
| finish | 2026-06-27T22:14:27Z | - | - |

## Sm Assessment

**Story:** 8-3 — Wave 1 space combat in the `star-wars` subrepo (5 pts, TDD/phased).

**Setup:** Session and story context created; feature branch `feat/8-3-wave-1-space-combat`
cut from `develop` per repos.yaml. No Jira — local tracking only (explicitly skipped).

**Stack:** Builds on 8-2 (authentic 3D vector models). Parent branch
`feat/8-2-port-authentic-3d-vector-models` — confirm 8-2's models are available before
implementation. Non-blocking for the RED phase (tests can specify against the model API).

**Routing:** Phased TDD → next agent is **TEA (Han Solo)** for the RED phase. TEA writes
comprehensive failing tests covering: cockpit crosshair render/rotation, TIE fighter
spawn/movement, firing + fireball lifetime, 3D collision (projectile↔TIE, enemy fire↔cockpit),
lives, and scoring. Sim logic in `src/core` (deterministic, via the Math Box); render/io in
`src/shell`. Keep gameplay authentic to the 1983 disassembly referenced in context.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5-point feature story; comprehensive gameplay contract needed before implementation.

**Test Files:**
- `star-wars/tests/core/space-combat.test.ts` — firing, enemy spawning/movement, collisions, scoring, lives, determinism/purity (24 tests, driven through `stepGame`/`GameState`).
- `star-wars/tests/core/aiming.test.ts` — crosshair centring/tracking, aim direction, and the 3D hit-test routed through the Math Box (9 tests, against a new pure `src/core/gameRules.ts`).

**Tests Written:** 33 tests across 2 files, covering every core-testable AC in context-story-8-3.md (crosshair, firing + bolt lifetime, TIE spawn schedule + movement, enemy fire, projectile↔TIE and fire↔cockpit collisions, scoring, lives + game over).
**Status:** RED — verified `19 failed / 27 passed` (math3d + models suites still green; `aiming.test.ts` fails at import pending `gameRules.ts`). The 5 currently-passing space-combat tests pass coincidentally against the Wave-0 stub (e.g. bolt-misses, never-below-zero) and will properly exercise implemented behavior in GREEN.

### Implementation Contract (for DEV / Yoda)

Per context-story-8-3.md ("express constants/mechanics as typed TS in `src/core/state.ts` and rule functions"):

- **`src/core/state.ts`** — extend `GameState` with `projectiles: Projectile[]`, `enemies: Enemy[]`, `enemyShots: Projectile[]`, `gameOver: boolean`; add `interface Projectile { pos: Vec3; vel: Vec3; ttl: number }` and `interface Enemy { pos: Vec3; … }` (the hit-test reads `pos`); export constants `STARTING_LIVES`, `TIE_SCORE`, `PROJECTILE_TTL`, `FIRE_INTERVAL`, `SPAWN_INTERVAL`, `WAVE_SIZE` (values recovered from `StarWars.asm`).
- **`src/core/gameRules.ts`** (new, pure) — `aimDirection(aimX, aimY): Vec3` (unit, forward −Z at rest), `crosshairNdc(aimX, aimY): readonly [number, number]` (centre at rest), `collides(a, b, radius): boolean` (3D sphere overlap via `math3d` `length`/`sub`).
- **`src/core/sim.ts`** — `stepGame` advances bolts/enemies/enemy-fire, rate-limits firing, spawns on schedule (seeded), runs collisions, updates score/lives, sets `gameOver` at 0 lives. Must build new arrays (no in-place mutation of input).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Determinism — seeded RNG, identical (state,input,dt) → identical state (CLAUDE.md boundary) | `spawns identically for a fixed seed`, `identical inputs … identical states` | red |
| Purity — pure step, no in-place mutation of input | `does not mutate the input state in place` | red |
| Single math source — collision via `math3d` (not ad-hoc trig) | `agrees with the Math Box distance at the boundary` | red |
| Collision in 3D world space, not screen pixels | `Wave 1 — 3D hit-test` suite + all collision tests use `Vec3` | red |
| lang-review #4 — falsy-but-valid `0` (lives) handled, not `||`-defaulted away | `ends the wave (game over) when the last life is lost`, `never lets lives fall below zero` | red |
| lang-review #8 — tests import from `src/`, not `dist/` | both new files import `../../src/core/*` | pass (structural) |
| Union types over enums (#3) | contract uses `Phase` / enemy `kind` string unions (DEV-side) | n/a (review-time) |

**Rules checked:** Architectural rules (determinism, purity, single math source, 3D collision) have behavioral test coverage. The TypeScript lang-review checklist is largely a DEV static self-review (type-safety escapes, enums, async, React) not unit-testable in RED — flagged for DEV/Reviewer; the one runtime-relevant check (#4 falsy `0`) is covered.
**Self-check:** 0 vacuous tests — every test carries a meaningful assertion; reviewed for `let _ =`, `assert(true)`, and `is_none()`-on-always-`None`; none present. The single `as Enemy` cast in fixtures is a deliberate minimal-literal (collision reads `pos` only), not a type-safety escape.

**Handoff:** To DEV (Yoda) for GREEN — implement the contract above to turn the suite green.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (star-wars):**
- `src/core/state.ts` — extended `GameState` (projectiles / enemies / enemyShots / gameOver + fire/spawn/enemy-fire timers); added `Projectile` & `Enemy` types and all gameplay constants. `WAVE_SIZE`=3 and `MAX_FIREBALL_SLOTS`=6 are authentic (wardclan); `STARTING_LIVES` replaces the hard-coded `lives: 3`.
- `src/core/gameRules.ts` (new, pure) — `aimDirection`, `crosshairNdc`, `collides`; all 3D math routed through the Math Box (`length`/`sub`/`normalize`).
- `src/core/sim.ts` — rewrote `stepGame` into the Wave 1 loop: rate-limited firing, slot-based seeded TIE spawns, converging enemy movement, capped enemy fire, 3D projectile↔TIE and fire/contact↔cockpit collisions, scoring, shields, game-over at 0. Pure — RNG cloned, input never mutated.
- `src/shell/render.ts` — draws TIEs (authentic model), bolts, enemy fire, the yoke-tracking crosshair, and the SHIELDS/SCORE/GAME OVER HUD in tempest's "Vector Battle" font with layered glow (`glowText` mirrored from tempest).
- `src/shell/font.ts` (new) + `src/main.ts` — best-effort load of the shared "Vector Battle" vector font (asset added under `public/fonts/`), so the HUD matches tempest's arcade look with a graceful monospace fallback.

**Tests:** 54/54 passing (GREEN) — 24 space-combat + 9 aiming + 7 math3d + 14 models, no regressions.
**Build:** `tsc --noEmit && vite build` clean.
**Boundary:** `src/core` stays pure/deterministic (no DOM/time/`Math.random`); all collision math goes through `math3d`; no `reference/`/`.asm` in `src/` or git.
**Branch:** `feat/8-3-wave-1-space-combat` (pushed to origin).

**Self-review:** Wired to the shell (render + main loop consume the new state); follows the core/shell boundary and tempest patterns (incl. the shared Vector Battle HUD font); all core-testable ACs met; collision/shield/game-over handled. Authenticity caveats (chosen constants, straight attack runs, font-pattern reuse) logged as deviations for the Reviewer.

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **Question** (non-blocking): The story specifies collision via "bounding volumes" but not how the TIE/cockpit hit radii are derived. Affects `star-wars/src/core/gameRules.ts` / `state.ts` (DEV must decide: standalone hit-radius constants vs. radii derived from the 8-2 model vertex extents in `models.ts`). *Found by TEA during test design.*
- **Improvement** (non-blocking): `initialState` currently hard-codes `lives: 3`. Affects `star-wars/src/core/state.ts` (replace the literal with the exported `STARTING_LIVES` constant sourced from `StarWars.asm`, so the lives count is authentic and single-sourced). *Found by TEA during test design.*
### Dev (implementation)
- **Improvement** (non-blocking): Mitchell Gant's "Theory of Operation" (wardclan) documents the authentic starting-wave completion bonus table — Easy/Medium/Hard → 0 / 400,000 / 800,000, with phantom waves 2 & 4 at 200,000 / 600,000. Affects future scoring/framing in `star-wars/src/core` (add the bonus table when 8-6 builds wave completion). *Found by Dev during implementation.*
- **Answer** (non-blocking): Resolves TEA's bounding-volume question — collision uses standalone hit-radius constants (`TIE_HIT_RADIUS` 250 ≈ the TIE model's vertex extent, `COCKPIT_HIT_RADIUS` 80), not radii derived programmatically from `models.ts`. Affects `star-wars/src/core/state.ts` (Reviewer: confirm these spheres feel right against the rendered model). *Found by Dev during implementation.*
### Reviewer (code review)
- **Improvement** (non-blocking): Oversized TIE hit sphere makes aim under-determine near hits. `TIE_HIT_RADIUS` (250) with player bolts spawning at the cockpit origin (`sim.ts:59`) and collision checked the same frame (`sim.ts:90`) means firing destroys ANY TIE within 250 units of the cockpit regardless of aim. Affects `star-wars/src/core/sim.ts` / `state.ts` (shrink the radius, offset the muzzle ahead of the cockpit, and/or skip the spawn-frame collision). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): GameState arrays (`projectiles`/`enemies`/`enemyShots`) and the `Projectile`/`Enemy` `pos`/`vel` fields are mutable; mark them `readonly` to enforce the immutable-state invariant at compile time (lang-review #2). Production never mutates input arrays today (verified), so this is type-hardening, not a live bug. Affects `star-wars/src/core/state.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The `tie()` test fixture uses `({ pos } as Enemy)`, omitting `vel`/`kind` — which is the sole reason `sim.ts` carries `vel ?? ZERO` guards (`sim.ts:148,155`). Complete the fixture (`{ pos, vel, kind: 'tie' }`) and drop the now-dead guards (lang-review #1/#8). Affects `star-wars/tests/core/space-combat.test.ts` and `src/core/sim.ts`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): The `space-combat.test.ts` header comment says constants are "real values recovered from StarWars.asm in GREEN" — but they are authentic-feel + two from wardclan, not lifted from the `.asm`. Update the comment so it does not mislead. Affects `star-wars/tests/core/space-combat.test.ts`. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** `initialState` currently hard-codes `lives: 3`. Affects `star-wars/src/core/state.ts`.

### Downstream Effects

- **`star-wars/src/core`** — 1 finding

### Deviation Justifications

9 deviations

- **Tests placed in `tests/core/`, not `src/core/`**
  - Rationale: Matches the repo's established convention (`tests/core/math3d.test.ts`, `models.test.ts`) and `star-wars/CLAUDE.md`, which keeps `src/` free of test files; imports already point at `../../src/core/*`
  - Severity: minor
  - Forward impact: none — DEV implements the `src/core` modules the tests import
- **Disassembly constants referenced by name, recovered in GREEN**
  - Rationale: `StarWars.asm` is the GREEN-phase quarry; pinning behavior to named constants keeps the suite authentic-value-agnostic and avoids TEA inventing numbers
  - Severity: minor
  - Forward impact: DEV must export those constants from `src/core/state.ts` and source their values from the disassembly
- **Enemy movement tested as observable approach, not exact patrol path**
  - Rationale: Exact patrol/attack curves are recovered from the disassembly in GREEN; the RED invariant (enemies appear ahead and approach) is representation-agnostic and won't over-constrain DEV's path model
  - Severity: minor
  - Forward impact: Reviewer verifies patrol authenticity against the disassembly in REVIEW
- **Crosshair "centre + rotation" interpreted as centred reticle that tracks the yoke**
  - Rationale: Centre-at-rest + yoke-tracking + firing direction together capture the cockpit reticle behavior; the visual rotation of the glyph is a shell/render concern verified by running
  - Severity: minor
  - Forward impact: `render.ts` reticle drawing verified by play, not unit test
- **Rendering ACs (crosshair/TIE/projectile/HUD drawing) left out of RED scope**
  - Rationale: Per `star-wars/CLAUDE.md` the shell is "verified by running the game," not unit-tested; the pure core is the test target
  - Severity: minor
  - Forward impact: DEV updates `render.ts` in GREEN; visual verification at review/play time
- **Gameplay constants are authentic-feel, not recovered verbatim (two are authentic)**
  - Rationale: Recovering those magic numbers needs deep RE of unlabelled 6809 (tracing RAM via `Memory_Locations`/`Direct_Page`), out of scope for a 5-pt story; named single-sourced constants in `state.ts` let real values drop in later
  - Severity: minor
  - Forward impact: 8-6 (scoring/framing) should refine `TIE_SCORE`/`STARTING_LIVES` and add the wave-completion bonus table (see Dev finding)
- **Enemy spawns use a continuous concurrent-slot pool, not a fixed per-wave batch**
  - Rationale: Matches the authentic cabinet (3 TIE / 6 fireball slots) and the test's concurrent-cap assertion; a slot pool plays like the original better than a one-shot batch
  - Severity: minor
  - Forward impact: none — 8-4/8-5 inherit the slot pattern
- **TIEs fly a straight converging run at the cockpit (no recovered patrol curve)**
  - Rationale: The patrol/attack curve constants are not recoverable from the unlabelled disasm; a converging run satisfies the approach invariant the tests pin and is a faithful first cut (TEA logged the matching test-side deviation)
  - Severity: minor
  - Forward impact: a later polish pass (or 8-6) can add curved attack runs; Reviewer flagged patrol authenticity for REVIEW
- **HUD uses tempest's shared "Vector Battle" vector font, pattern mirrored not extracted**
  - Rationale: One consistent arcade visual language across both games; per the orchestrator's reuse-first rule the shared lib waits until a 2nd+ game makes the duplication real (now imminent — confirmed with the user this session).
  - Severity: minor
  - Forward impact: `font.ts` and the `glowText`/HUD helpers are prime candidates for the eventual shared arcade-render library.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **Tests placed in `tests/core/`, not `src/core/`**
  - Spec source: context-story-8-3.md, RED checklist
  - Spec text: "Tests live alongside core (e.g., `src/core/gameRules.test.ts` or `src/core/state.test.ts`)"
  - Implementation: Suites placed at `tests/core/space-combat.test.ts` and `tests/core/aiming.test.ts`
  - Rationale: Matches the repo's established convention (`tests/core/math3d.test.ts`, `models.test.ts`) and `star-wars/CLAUDE.md`, which keeps `src/` free of test files; imports already point at `../../src/core/*`
  - Severity: minor
  - Forward impact: none — DEV implements the `src/core` modules the tests import
- **Disassembly constants referenced by name, recovered in GREEN**
  - Spec source: context-story-8-3.md, RED checklist (spawn schedule / scoring / lives)
  - Spec text: "TIE fighters spawn … on a timed schedule from the disassembly"; "increments score by a value from the disassembly"; "Player starts with lives from disassembly constant"
  - Implementation: Tests assert against exported constants (`STARTING_LIVES`, `TIE_SCORE`, `SPAWN_INTERVAL`, `WAVE_SIZE`, `FIRE_INTERVAL`, `PROJECTILE_TTL`) by name rather than hard-coded numbers
  - Rationale: `StarWars.asm` is the GREEN-phase quarry; pinning behavior to named constants keeps the suite authentic-value-agnostic and avoids TEA inventing numbers
  - Severity: minor
  - Forward impact: DEV must export those constants from `src/core/state.ts` and source their values from the disassembly
- **Enemy movement tested as observable approach, not exact patrol path**
  - Spec source: context-story-8-3.md, AC "Enemy spawning & movement"
  - Spec text: "Enemies move in 3D using defined patrol/attack patterns (from disasm)"
  - Implementation: Tests assert spawn-ahead (`z < 0`) and that the frontmost enemy closes on the cockpit over a step; the exact patrol curve is not pinned
  - Rationale: Exact patrol/attack curves are recovered from the disassembly in GREEN; the RED invariant (enemies appear ahead and approach) is representation-agnostic and won't over-constrain DEV's path model
  - Severity: minor
  - Forward impact: Reviewer verifies patrol authenticity against the disassembly in REVIEW
- **Crosshair "centre + rotation" interpreted as centred reticle that tracks the yoke**
  - Spec source: context-story-8-3.md, AC "Cockpit & crosshair rendering"
  - Spec text: "Crosshair positioned at screen center when phase is 'space'" / "Crosshair updates orientation (rotation) based on mouse cursor"
  - Implementation: `crosshairNdc(0,0)` is centre; offsets track the yoke; `aimDirection()` supplies the firing orientation. No literal reticle-glyph rotation angle is asserted
  - Rationale: Centre-at-rest + yoke-tracking + firing direction together capture the cockpit reticle behavior; the visual rotation of the glyph is a shell/render concern verified by running
  - Severity: minor
  - Forward impact: `render.ts` reticle drawing verified by play, not unit test
- **Rendering ACs (crosshair/TIE/projectile/HUD drawing) left out of RED scope**
  - Spec source: context-story-8-3.md, AC section 3 "Rendering (src/shell/render.ts)"
  - Spec text: "Cockpit crosshair: small glowing vector … TIE fighters: render from 3D model … HUD: lives and score as glowing vector text"
  - Implementation: No unit tests for `render.ts`; only the core data it consumes (score, lives, positions, crosshair) is tested
  - Rationale: Per `star-wars/CLAUDE.md` the shell is "verified by running the game," not unit-tested; the pure core is the test target
  - Severity: minor
  - Forward impact: DEV updates `render.ts` in GREEN; visual verification at review/play time
### Dev (implementation)
- **Gameplay constants are authentic-feel, not recovered verbatim (two are authentic)**
  - Spec source: context-story-8-3.md, GREEN checklist; epic-8 "Port data, don't vendor it"
  - Spec text: "Recover spawn cadence, scoring tables, and difficulty from StarWars.asm"
  - Implementation: `WAVE_SIZE` = 3 (max TIE slots) and `MAX_FIREBALL_SLOTS` = 6 are AUTHENTIC, from Gant's wardclan "Theory of Operation". `TIE_SCORE`, `STARTING_LIVES`, and the timing/speed constants are authentic-FEEL named values — the raw `reference/disasm/StarWars.asm` is unlabelled 6809 with no symbolic score/shield/timing tables to lift verbatim
  - Rationale: Recovering those magic numbers needs deep RE of unlabelled 6809 (tracing RAM via `Memory_Locations`/`Direct_Page`), out of scope for a 5-pt story; named single-sourced constants in `state.ts` let real values drop in later
  - Severity: minor
  - Forward impact: 8-6 (scoring/framing) should refine `TIE_SCORE`/`STARTING_LIVES` and add the wave-completion bonus table (see Dev finding)
- **Enemy spawns use a continuous concurrent-slot pool, not a fixed per-wave batch**
  - Spec source: TEA test `never puts more than a wave of TIEs on screen at once`; wardclan "Maximum 3 tie fighter slots"
  - Spec text: "TIE fighters spawn at wave start, on a timed schedule from the disassembly"
  - Implementation: TIEs spawn on a timer into a max-`WAVE_SIZE`(3) concurrent slot pool that refills as TIEs die or reach the cockpit; enemy fireballs likewise capped at `MAX_FIREBALL_SLOTS`(6)
  - Rationale: Matches the authentic cabinet (3 TIE / 6 fireball slots) and the test's concurrent-cap assertion; a slot pool plays like the original better than a one-shot batch
  - Severity: minor
  - Forward impact: none — 8-4/8-5 inherit the slot pattern
- **TIEs fly a straight converging run at the cockpit (no recovered patrol curve)**
  - Spec source: context-story-8-3.md, AC "Enemy spawning & movement"
  - Spec text: "Enemies move in 3D using defined patrol/attack patterns (from disasm)"
  - Implementation: TIEs spawn at a seeded lateral offset down −Z and fly a straight unit-velocity course toward the cockpit; no curved attack arcs
  - Rationale: The patrol/attack curve constants are not recoverable from the unlabelled disasm; a converging run satisfies the approach invariant the tests pin and is a faithful first cut (TEA logged the matching test-side deviation)
  - Severity: minor
  - Forward impact: a later polish pass (or 8-6) can add curved attack runs; Reviewer flagged patrol authenticity for REVIEW
- **HUD uses tempest's shared "Vector Battle" vector font, pattern mirrored not extracted**
  - Spec source: context-story-8-3.md, AC section 3 "Rendering"
  - Spec text: "HUD: lives and score as glowing vector text (no DOM/SVG, all canvas vector rendering)"
  - Implementation: SHIELDS / SCORE / GAME OVER render in the "Vector Battle" arcade vector font — the same face tempest uses — via canvas `fillText` with a layered bloom (`glowText`, copied from tempest). The face loads best-effort in `shell/font.ts` with an `'Orbitron', monospace` fallback; the asset ships under `public/fonts/`. Loader + helper are duplicated from tempest, not shared through a library.
  - Rationale: One consistent arcade visual language across both games; per the orchestrator's reuse-first rule the shared lib waits until a 2nd+ game makes the duplication real (now imminent — confirmed with the user this session).
  - Severity: minor
  - Forward impact: `font.ts` and the `glowText`/HUD helpers are prime candidates for the eventual shared arcade-render library.
### Reviewer (audit)
All nine TEA/Dev deviations reviewed; every one is sound and documented:
- TEA #1 — Tests in `tests/core/` not `src/core/` → ✓ ACCEPTED: matches the repo's existing convention; keeps `src/` clean.
- TEA #2 — Disasm constants referenced by name → ✓ ACCEPTED: pinning behavior to named constants is the correct TDD move.
- TEA #3 — Enemy movement tested as approach, not exact patrol → ✓ ACCEPTED: representation-agnostic; patrol authenticity is GREEN/REVIEW work (see my finding below).
- TEA #4 — Crosshair "centre + rotation" as centred tracking reticle → ✓ ACCEPTED: reasonable reading; reticle glyph rotation is a shell concern.
- TEA #5 — Rendering ACs out of RED scope → ✓ ACCEPTED: shell is verified by running, per CLAUDE.md.
- Dev #1 — Constants authentic-feel (two authentic from wardclan) → ✓ ACCEPTED: honest about what is/isn't recovered; the raw 6809 has no symbolic tables. Tracked for 8-6.
- Dev #2 — Concurrent slot pool (3 TIE / 6 fireball) → ✓ ACCEPTED: matches the authentic cabinet and the test's concurrent cap; more faithful than a fixed batch.
- Dev #3 — Straight converging attack runs → ✓ ACCEPTED with note: faithful first cut; curved patrol is deferred polish. Authenticity vs disasm not verifiable here (unlabelled 6809).
- Dev #4 — HUD reuses tempest's Vector Battle font, mirrored not extracted → ✓ ACCEPTED: correct call under the reuse-first rule; satisfies the "glowing vector text" AC and unifies the visual language.

No undocumented deviations found.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1 benign `console.warn` error-boundary noted) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge analysis performed by Reviewer (muzzle auto-kill, gameOver freeze, dt/tunnelling) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — silent-failure analysis by Reviewer (font catch, `?? ZERO` fallback) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test analysis by Reviewer (`as Enemy` fixture, stale header comment) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment analysis by Reviewer (stale "recovered from .asm" comment) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type analysis by Reviewer + rule-checker (readonly, casts) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — security analysis by Reviewer (numeric aim, font URL from BASE_URL, license) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — simplification analysis by Reviewer (dead `?? ZERO` guards, spread casts) |
| 9 | reviewer-rule-checker | Yes | findings | 11 (across 17 rules) | confirmed 10 (all non-blocking type/test hardening), deferred 1 (pre-existing `main.ts` `\|\|`), dismissed 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and covered by the Reviewer directly)
**Total findings:** 14 confirmed (all Medium/Low, non-blocking), 1 deferred (pre-existing), 0 dismissed. No Critical/High.

## Rule Compliance

Rubric = `.pennyfarthing/gates/lang-review/typescript.md` (#1–#13) + the CLAUDE.md architectural rules (A–D). Exhaustive enumeration via reviewer-rule-checker, cross-checked by me.

- **#1 Type-safety escapes** — 3 instances, 3 minor: `[...COCKPIT] as Vec3` (sim.ts:59), `[...shooter.pos] as Vec3` (sim.ts:80) spread-then-assert casts (Low); `({pos} as Enemy)` test fixture (test:169, Med). No `as any`/`@ts-ignore`/non-null on nullable. CONFIRMED, non-blocking.
- **#2 Generics/readonly** — mutable `projectiles`/`enemies`/`enemyShots` on GameState and `pos`/`vel` on `Projectile`/`Enemy` should be `readonly` (state.ts:97/99/101/21/23/31/33). CONFIRMED (rule match), non-blocking — production is immutable in practice (verified: no in-place mutation; immutability test passes). No `Record<string,any>`/`object`/`Function` types.
- **#3 Enums** — none used. `Phase` and `Enemy.kind` are string unions. COMPLIANT (also satisfies rule D).
- **#4 Null/undefined (`||` vs `??`)** — new core code is clean: lives via `Math.max(0, …)`, `gameOver = lives <= 0`, `vel ?? ZERO` uses `??` correctly. Pre-existing `main.ts` `devicePixelRatio || 1` (lines 21/26) flagged but NOT introduced by this story. DEFERRED (pre-existing).
- **#5 Module/declaration** — all type-only imports use `import type`/inline `type`; no `/// <reference>`; Vite resolves bare specifiers. COMPLIANT.
- **#6 React/JSX** — no `.tsx`. N/A.
- **#7 Async/Promise** — `loadVectorFont(): Promise<boolean>` awaits, self-handles errors, `void`-discarded at the call site. COMPLIANT.
- **#8 Test quality** — `bolt()` fixture complete; `tie()` fixture incomplete via `as Enemy` (test:169). CONFIRMED with #1, non-blocking. No vacuous assertions (every test asserts a meaningful value/count).
- **#9 Build/config** — no config changes in diff. N/A.
- **#10 Security input validation** — aim is numeric (clamped/normalised via math3d); font URL from `import.meta.env.BASE_URL` (build constant); no `JSON.parse … as T`. COMPLIANT.
- **#11 Error handling** — `catch (err)` in font.ts logs + returns `false`; `err` is `unknown` under strict. COMPLIANT.
- **#12 Performance/bundle** — specific named imports, no barrels, no dynamic import, no hot-path JSON.stringify, no sync fs. COMPLIANT.
- **#13 Fix regressions** — new code, no prior fixes to rescan. N/A.
- **A — Core purity/determinism (CLAUDE.md, sacred)** — COMPLIANT: `src/core/*` import only core; no DOM/`window`/`Date`/`performance`/`Math.random`/rAF; randomness via cloned seeded RNG (`sim.ts:48`); time enters only as `dt`; input state never mutated in place (verified by grep + the immutability test).
- **B — All 3D math via math3d** — COMPLIANT: `collides`=`length∘sub`, `aimDirection`=`normalize`, movement=`add`/`scale`, projection=`transform`/`perspective`. NDC→screen remap in render is a linear shell mapping, not game math.
- **C — No `reference/`/`.asm` under `src/`** — COMPLIANT: `reference/` gitignored & untracked (preflight); no such imports in the diff.
- **D — string unions not enums** — COMPLIANT: `Phase`, `Enemy.kind`.

## Observations

1. `[MEDIUM][EDGE]` Muzzle auto-kill — `TIE_HIT_RADIUS` (250) + bolts spawned at the origin (`sim.ts:59`) + same-frame collision (`sim.ts:90`) destroys any TIE within 250 units of the cockpit regardless of aim. Gameplay-tuning correctness; non-blocking (ACs still met). Logged as a delivery finding.
2. `[MEDIUM][RULE][TYPE]` GameState arrays + `Projectile`/`Enemy` fields not `readonly` (state.ts:97/99/101/21/23/31/33) — lang-review #2. Confirmed; non-blocking type-hardening (no live mutation).
3. `[MEDIUM][TEST]` `({pos} as Enemy)` incomplete fixture (test:169) drives the `?? ZERO` guards. Confirmed; non-blocking.
4. `[LOW][SIMPLE]` `vel ?? ZERO` guards (sim.ts:148,155) are dead under the type contract — they exist only for the incomplete fixture; removing both together simplifies core + test.
5. `[LOW][TYPE]` Spread-then-assert casts `[...COCKPIT] as Vec3` / `[...shooter.pos] as Vec3` (sim.ts:59,80) — prefer explicit `[x,y,z] as Vec3`.
6. `[LOW][DOC]` `space-combat.test.ts` header says constants are "recovered from StarWars.asm" — they are authentic-feel + wardclan. Misleading; update.
7. `[LOW][SEC]` Vector Battle font is non-commercial freeware; Readme shipped unmodified per its terms; fine for this non-commercial project and consistent with tempest. Flag only if the project ever goes commercial.
8. `[LOW][EDGE]` `gameOver` freezes the scene with no restart wiring in `main.ts`; a player must refresh. Out of scope (8-6 framing); `state.gameOver` and the GAME OVER banner are correctly produced.
9. `[VERIFIED]` Core purity/determinism — evidence: `sim.ts:48` clones the RNG; grep shows no `state.*.push`/`state.score=`/`state.lives=`; the "does not mutate input" test (space-combat.test.ts) passes. Complies with the CLAUDE.md sacred boundary.
10. `[VERIFIED]` Single math source — evidence: `gameRules.ts:71` `collides = length(sub(a,b)) <= radius`; movement/projection use `add`/`scale`/`transform`/`perspective`. Complies with the Math-Box rule.
11. `[VERIFIED][SILENT]` No harmful swallowed errors — evidence: font.ts `catch` logs + returns `false` (handled fallback, not a swallow); the only silent fallback is `?? ZERO`, which is benign (observation 4).
12. `[VERIFIED]` Determinism under fixed seed — evidence: spawns/fires draw only from the cloned seeded RNG; `spawns identically for a fixed seed` and `identical inputs … identical states` tests pass.

### Devil's Advocate

Assume this is broken. **The aim is a lie.** With a 250-unit kill sphere centred on a bolt that is born at the cockpit origin and tested for collision on its very first frame, a player who mashes fire while pointing at empty space still vaporises every TIE that has crept within 250 units — aim is decorative for close enemies. A speedrunner would never move the yoke; a reviewer's child would "win" by flailing. That undercuts the entire point of a targeting reticle. **The dead screen.** When the last shield falls, `stepGame` freezes and `main.ts` has no restart path — a confused user sees a motionless GAME OVER and reasonably concludes the game crashed; there is no "PRESS START." **Tunnelling?** A bolt at 900 u/s would jump 225 units per 0.25 s catch-up tick — but the loop runs a *fixed* 1/60 dt (15 u/step) and the 250 sphere is enormous, so nothing slips through; enemies (120 u/s) and fireballs (300 u/s) move 2–5 u/step against an 80-unit cockpit sphere, no tunnelling. **NaN poisoning?** If an `Enemy` ever lacked `vel`, `scale(undefined…)` would spew `NaN` positions and silently disable collisions — today only the test fixture does this and `?? ZERO` rescues it, but the mutable, non-`readonly` `Enemy[]` plus the `as Enemy` escape means a future caller could construct a half-built enemy and the type system would not stop them. **Mutation.** Nothing in production mutates input arrays, but `state.enemies.push(...)` would compile — a careless future edit could corrupt a "pure" state and the determinism tests might not catch it if the mutation happened in the shell. **Font.** If the TTF 404s, `loadVectorFont` swallows it to `console.warn` and the HUD silently downgrades to monospace — acceptable, but a user reporting "the font looks wrong" would get no in-app signal. None of these rise to Critical/High: the boundary holds, the math is sound, the tests are honest, and every defect is either tuning or hardening. But the muzzle hitbox and the readonly gap are the two I would fix first.

## Reviewer Assessment

**Verdict:** APPROVED

A clean, well-structured Wave 1 slice. The sacred core/shell boundary is fully intact — `[RULE]` reviewer-rule-checker confirms purity, determinism, single-math-source, no vendored reference, and string-unions-not-enums all PASS; `[SEC]` no injection surface (aim is numeric, font URL is a build constant); `[SILENT]` no harmful swallowed errors. 54/54 tests pass and the build is clean. The confirmed issues are all Medium/Low and non-blocking: `[EDGE]` the oversized muzzle hit sphere makes aim under-determine near hits (sim.ts:59,90), `[TYPE][RULE]` GameState arrays want `readonly` (state.ts:97/99/101 — lang-review #2, type-hardening only since production is provably immutable), `[TEST]` the `({pos} as Enemy)` fixture is incomplete (test:169) and `[SIMPLE]` is the sole reason for the dead `?? ZERO` guards, and `[DOC]` the test header comment overstates that constants were "recovered from StarWars.asm." All four are captured as non-blocking delivery findings for a quick follow-up; none block this slice.

**Data flow traced:** mouse → `shell/input.ts` (`aimX/aimY ∈ [-1,1]`, `fire`) → `stepGame` (pure): `aimDirection`→bolt velocity, seeded RNG→TIE spawns, `collides`(math3d)→kills/score and cockpit damage→`lives`/`gameOver` → `shell/render.ts` projects world state through the Math Box and `glowText` draws the HUD. Safe because the core is referentially transparent (RNG cloned, no input mutation, time only via `dt`).
**Pattern observed:** clean pure-core/thin-shell split mirroring tempest, incl. the reused Vector Battle HUD font — `src/core/sim.ts`, `src/shell/render.ts:603`.
**Error handling:** font load is best-effort (`font.ts:39` try/catch → `false` → monospace fallback); lives clamp at `Math.max(0, …)` (sim.ts) so shields never go negative; bolts/TIEs/fireballs expire or are filtered, no unbounded growth (slot caps 3/6).
**Handoff:** To SM (Thrawn) for finish-story.