---
story_id: "8-12"
jira_key: "8-12"
epic: "8"
workflow: "tdd"
---
# Story 8-12: Render player shots as cyan laser beams (pew pew) — replace '+' placeholder with cabinet-style converging laser lines (Wave 1)

## Story Details
- **ID:** 8-12
- **Jira Key:** 8-12
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T19:59:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T19:20:35Z | 2026-06-28T19:22:54Z | 2m 19s |
| red | 2026-06-28T19:22:54Z | 2026-06-28T19:32:55Z | 10m 1s |
| green | 2026-06-28T19:32:55Z | 2026-06-28T19:48:06Z | 15m 11s |
| review | 2026-06-28T19:48:06Z | 2026-06-28T19:59:56Z | 11m 50s |
| finish | 2026-06-28T19:59:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Improvement** (non-blocking): The green bolt colour `BOLT_GLOW = '#9dff00'` is
  still consumed by the "PRESS START" prompt in `drawAttract`/`drawGameOver`
  (`star-wars/src/shell/render.ts:251,276`), so do NOT delete it when switching the
  player laser to cyan — introduce/reuse the cockpit cyan (`#00e5ff`, the existing
  `GLOW`) for the beams instead. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The 3D phase scene (Death Star surface relief +
  towers) renders BEHIND the attract/GAME-OVER framing screens — `render()` draws the
  phase branch before the framing overlay — so on game-over a frozen surface/tower
  shows through instead of the "empty starfield" the code comment intends. Pre-existing
  (NOT introduced by 8-12; the player laser correctly no longer bleeds through). Affects
  `star-wars/src/shell/render.ts` (gate the phase scene to `mode === 'playing'`, or clear
  to a starfield on framing screens). Worth a small follow-up story. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): Test-hardening pass on `star-wars/tests/shell/render.player-laser.test.ts`
  — all LOW, the production code is correct: (1) `shotAt` hardcodes `ttl: 2` with a now-stale
  comment "vel/ttl are irrelevant to the render" — import `PROJECTILE_TTL` and use `ttl: PROJECTILE_TTL`,
  fix the comment ([TEST]+[RULE], both subagents); (2) the "tracks the shot" test asserts only
  `to[0] > CENTER[0]+20`, which (with the 60px centred tolerance) a fixed `[450,300]` convergence would
  still pass — assert `dist(to, project(p.pos)) <= CONVERGE_TOL` in both axes to truly pin tracking;
  (3) add a "just-expired" bolt (`ttl = PROJECTILE_TTL - LASER_FLASH_SECONDS - ε`) to pin the flash
  upper bound; (4) drop the redundant `expect(b.color).not.toBe('#9dff00')` (implied by `toBe('#00e5ff')`).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

4 deviations

- **Structural mechanism tests instead of "live game state" visual verification**
  - Rationale: render.ts's own note says orientation/scale (and by extension exact glow) "escape structural tests" and must be eyeballed; vitest runs headless in node with no real canvas, so "live visual" verification isn't automatable. Structural guards lock the testable contract; the eyeball pass covers the rest.
  - Severity: minor
  - Forward impact: Dev must still eyeball the beams in the dev server (port 5274) before sign-off — recorded as an explicit GREEN-phase step.
- **Asserting the exact laser colour (`#00e5ff`)**
  - Rationale: The green→cyan change is story-central and discrete (not a subtle shade), and `#00e5ff` is the already-established cockpit cyan (`GLOW` / `DEFAULT_GLOW`). Pinning it prevents the laser silently shipping in the wrong colour.
  - Severity: minor
  - Forward impact: If Dev deliberately picks a different cyan, this test must be updated as a conscious decision.
- **Player laser is a brief muzzle FLASH gated to an active run (not a beam trailing the bolt)**
  - Rationale: The cabinet laser is a transient "pew", not a persistent line. The flash window + playing-mode gate make it transient and keep it off the attract/game-over screens.
  - Severity: minor
  - Forward impact: `LASER_FLASH_SECONDS` is an authentic-FEEL value, eyeball-tuned and single-sourced for easy adjustment.
- **Added a transience test during the GREEN phase (normally TEA's RED-phase domain)**
  - Rationale: The persistence bug surfaced from live user feedback mid-GREEN; pinning it with a test before fixing keeps the suite honest rather than fixing blind.
  - Severity: trivial
  - Forward impact: none — Reviewer (The Big Lebowski) should sanity-check the added guard like any other.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Structural mechanism tests instead of "live game state" visual verification**
  - Spec source: context-story-8-12.md, Acceptance Criteria hint
  - Spec text: "test the render against live game state with active shots; verify laser convergence visually matches the cabinet longplay"
  - Implementation: Headless mock-canvas tests that record stroked segments + colour and assert the MECHANISM (beams originate at the four screen-corner cannon tips and converge on the projected shot), mirroring the repo convention (render.tie-orient.test.ts). Visual convergence/glow fidelity is left to a dev-server eyeball.
  - Rationale: render.ts's own note says orientation/scale (and by extension exact glow) "escape structural tests" and must be eyeballed; vitest runs headless in node with no real canvas, so "live visual" verification isn't automatable. Structural guards lock the testable contract; the eyeball pass covers the rest.
  - Severity: minor
  - Forward impact: Dev must still eyeball the beams in the dev server (port 5274) before sign-off — recorded as an explicit GREEN-phase step.
- **Asserting the exact laser colour (`#00e5ff`)**
  - Spec source: context-story-8-12.md, Title + Problem
  - Spec text: "cyan converging laser beams"
  - Implementation: One test asserts the beam stroke colour is exactly `#00e5ff` (and not the old green `#9dff00`), where the repo convention generally leaves exact colour to eyeball.
  - Rationale: The green→cyan change is story-central and discrete (not a subtle shade), and `#00e5ff` is the already-established cockpit cyan (`GLOW` / `DEFAULT_GLOW`). Pinning it prevents the laser silently shipping in the wrong colour.
  - Severity: minor
  - Forward impact: If Dev deliberately picks a different cyan, this test must be updated as a conscious decision.

### Dev (implementation)
- **Player laser is a brief muzzle FLASH gated to an active run (not a beam trailing the bolt)**
  - Spec source: context-story-8-12.md (Title/Problem) + live user feedback during GREEN
  - Spec text: "cyan converging laser beams" — the ACs only required the converging-beam geometry/colour; they did not specify the beam's lifetime.
  - Implementation: Beams draw only while a bolt is freshly fired (`PROJECTILE_TTL - ttl <= LASER_FLASH_SECONDS = 0.12s`) AND only when `state.mode === 'playing'`. Without this, every in-flight bolt drew full corner→bolt lines for its whole 2s life — under rapid fire that built a static cyan web, and the sim FREEZES in-flight bolts on the game-over screen so the web bled over the framing screens (caught in the eyeball pass; user confirmed "stays visible which is wrong").
  - Rationale: The cabinet laser is a transient "pew", not a persistent line. The flash window + playing-mode gate make it transient and keep it off the attract/game-over screens.
  - Severity: minor
  - Forward impact: `LASER_FLASH_SECONDS` is an authentic-FEEL value, eyeball-tuned and single-sourced for easy adjustment.
- **Added a transience test during the GREEN phase (normally TEA's RED-phase domain)**
  - Spec source: TDD phase ownership (TEA writes tests, Dev makes them pass)
  - Spec text: RED tests are authored by TEA before GREEN.
  - Implementation: Dev appended one test ("is a transient flash…") to `render.player-laser.test.ts` to lock the user-surfaced behaviour, then implemented against it.
  - Rationale: The persistence bug surfaced from live user feedback mid-GREEN; pinning it with a test before fixing keeps the suite honest rather than fixing blind.
  - Severity: trivial
  - Forward impact: none — Reviewer (The Big Lebowski) should sanity-check the added guard like any other.

### Reviewer (audit)
- **TEA — Structural mechanism tests instead of "live visual"** → ✓ ACCEPTED by Reviewer: sound and
  matches the repo convention (render.tie-orient.test.ts); the visual was covered by Dev's dev-server
  eyeball pass. Agrees with author reasoning.
- **TEA — Asserting the exact laser colour `#00e5ff`** → ✓ ACCEPTED by Reviewer: the green→cyan change
  is story-central and `#00e5ff` is the established cockpit cyan (`GLOW`/`DEFAULT_GLOW`); pinning it is
  correct. (The redundant `not.toBe('#9dff00')` companion line is a LOW test nit — see Delivery Findings.)
- **Dev — Player laser is a brief muzzle FLASH gated to an active run** → ✓ ACCEPTED by Reviewer: this is
  the correct cabinet behaviour and resolves the user-reported persistence ("stays visible"). Verified the
  gate `PROJECTILE_TTL - p.ttl <= LASER_FLASH_SECONDS` + `mode === 'playing'` (render.ts) reads sim state
  only (no game math in the shell) and confirmed clean by eyeball on both play and game-over screens.
- **Dev — Added a transience test during the GREEN phase (TEA's domain)** → ✓ ACCEPTED by Reviewer:
  pragmatic and correct — pinning a live user-surfaced bug before fixing is sound. Sanity-checked the
  guard; it is valid (fresh→beams, aged→none, game-over→none), though its boundary coverage could be
  tightened (non-blocking — see Delivery Findings).
- No UNDOCUMENTED spec deviations found: the implementation matches the (rescoped + user-refined) spec.

## Sm Assessment

**Story (rescoped):** Replace the `+` placeholder render for the *player's* shots
with cabinet-style **cyan converging laser beams** ("pew pew"). This is a
render-layer story in `star-wars/src/shell/render.ts` only.

**Why the rescope:** The story originally read "render player shots as expanding
fireballs," which is backwards. Verified against the Atari Star Wars cabinet
(arcade longplay youtube `nJv94FPRddA`): player shots are cyan laser beams that
converge from the four cannon tips at the screen corners; **fireballs are ENEMY
projectiles** (TIE fighters), and are shootable. The fireball work is a separate
story, **8-18**. See `sprint/context/context-story-8-12.md` for the full approach
and ACs.

**Scope guardrails for TEA/Dev:**
- Player-laser *render* only. Do **not** touch enemy fireballs / projectiles (8-18).
- Do **not** re-implement firing or hit-detection — those already exist (shipped
  in 8-3, fixed in 8-16). This is the visual layer over the existing shot entity.
- Visual fidelity is the AC driver; pair structural tests with a real eyeball pass
  on the rendered beams (converging from corner cannon tips).

**Routing:** Phased TDD → handing off to **TEA (The Jesus)** for the RED phase.
Branch `feat/8-12-player-laser-beams` is cut from `develop` in star-wars.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New observable render behaviour (player shot becomes converging cyan
laser beams) — a clear, falsifiable contract.

**Test Files:**
- `star-wars/tests/shell/render.player-laser.test.ts` — 5 tests (4 AC + 1 scope guard),
  headless mock-canvas recording stroked segments + colour (mirrors `render.tie-orient.test.ts`).

**Tests Written:** 5 tests covering 4 ACs + 1 scope guard.
**Status:** RED (4 failing as designed; 1 scope guard passing) — verified by testing-runner
(284 total, 280 pass, 4 fail; all 20 pre-existing files green, no regressions/compile errors).

### Acceptance Criteria (defined this phase)
1. **Cannon-tip origins** — with a player bolt in flight, render strokes a beam from each
   of the four screen-corner cannon tips. *(RED: today draws a `+` at the bolt only.)*
2. **Converges on the shot** — every cannon-tip beam reaches the bolt's projected position
   (screen centre for a centred bolt). *(RED.)*
3. **Tracks the shot** — an off-centre bolt converges off-centre, not at a hardcoded centre.
   *(RED — guards against a "always converge to centre" cheat.)*
4. **Cockpit cyan** — beams stroke `#00e5ff`, not the green `#9dff00` placeholder. *(RED.)*
5. **Scope guard (8-18)** — enemy fireballs (`enemyShots`) stay amber sparks with NO
   converging beams. *(GREEN — pins the scope boundary; Dev must not route fireballs here.)*

### Rule Coverage

| Rule (typescript.md) | Test/Measure | Status |
|------|---------|--------|
| #8 test-quality — meaningful assertions | every test has a concrete geometric/colour assertion; no `let _=`, no `assert(true)`, no always-None | satisfied |
| #8 test-quality — no `as any` in tests | mock uses the precedent's `as unknown as CanvasRenderingContext2D` stub idiom only (no `as any`) | satisfied |
| #4 null/undefined | bolts placed safely in front of NEAR so `project()` never returns null in the fixtures | satisfied |
| #1 type-safety | no `@ts-ignore`/non-null assertions; typed `Seg`/`Projectile`/`Vec3` throughout | satisfied |

**Rules checked:** 4 of 13 lang-review rules are render-test-applicable; the rest (React/JSX,
async, enums, input-validation, bundle) don't apply to a pure headless render guard.
**Self-check:** 0 vacuous tests (each asserts beam geometry or colour, not existence alone).

### GREEN-phase guidance for Dev (Walter)
- Replace the **player** `drawSpark(...BOLT_GLOW)` call for `state.projectiles` (render.ts:151)
  with converging beams: four fixed **screen-corner** cannon-tip origins → `project(p.pos)`
  convergence point, stroked in cockpit cyan `#00e5ff` (`GLOW`). Reuse `project()` from wireframe.
- **Do NOT** touch the `state.enemyShots` line (render.ts:152) — fireballs stay amber `+` (8-18).
- **Do NOT** delete `BOLT_GLOW` — still used by the PRESS START prompt (see Delivery Findings).
- After GREEN, **eyeball** the beams in the dev server (port 5274): cyan, converging from the
  corner cannon tips onto the shot — exact glow/blur is yours to judge against the longplay.

**Handoff:** To Dev (Walter) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `star-wars/src/shell/render.ts` — new `drawPlayerLaser()` strokes four cyan beams from
  the corner cannon tips to `project(bolt)`; the player-projectile loop now draws it as a
  brief flash (`LASER_FLASH_SECONDS = 0.12`) gated to `mode === 'playing'`. `drawSpark`
  (enemy fireballs) and `BOLT_GLOW` (PRESS START) untouched.
- `star-wars/tests/shell/render.player-laser.test.ts` — added the transience guard (6 tests total).

**Tests:** 285/285 passing (GREEN), `tsc --noEmit` clean, no regressions (21 files). Verified by testing-runner.
**Branch:** `feat/8-12-player-laser-beams` (pushed to origin).

**Acceptance Criteria:** All met —
1. Beams fire from the four corner cannon tips ✓
2. Converge on the projected shot ✓
3. Convergence tracks the shot (not hardcoded centre) ✓
4. Cockpit cyan `#00e5ff`, not the green placeholder ✓
5. Enemy fireballs untouched (scope guard for 8-18) ✓
   plus the transience refinement from live user feedback (brief flash, no game-over bleed).

**Eyeball pass (dev server on a throwaway port 5280 — prod on 5274 untouched):**
- Converging cyan beams render from all four corner cannon tips onto the shot ✓
- During play: no persistent cyan web — only the crosshair + (amber) enemy sparks between flashes ✓
- GAME OVER screen: no laser bleed ✓ (the steel-grey relief behind it is the pre-existing
  Death-Star-surface-behind-framing scene — see Delivery Findings, out of 8-12 scope)

**Handoff:** To Reviewer (The Big Lebowski) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 285/285 green; tsc clean; tree clean | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (2 medium, 2 low) | confirmed 4 (all LOW/non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 0 | N/A (no attack surface — pure client render) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 (1 high-conf cast, 2 type/test) | confirmed 2 (LOW), dismissed 1 (mock idiom) |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 5 confirmed (all LOW/non-blocking, test-quality only), 1 dismissed (with rationale), 0 deferred

## Rule Compliance (lang-review/typescript.md, enumerated against the diff)

- **#1 Type-safety escapes:** Production `render.ts` — none. `drawPlayerLaser` nullable `project()`
  return guarded by `if (!tip) return`. Test mock uses `as unknown as CanvasRenderingContext2D`
  (the rule's named pattern) — **DISMISSED**: established codebase idiom (wireframe.test.ts:18,
  render.tie-orient.test.ts:54), test-only, no type-safe alternative for Canvas's ~200-method
  surface, no exploitable path (security confirmed). Documented in-file. → compliant (1 accepted exception).
- **#2 Generics/interfaces:** `cannons: ReadonlyArray<readonly [number,number]>` ✓; `Vec3`/`Mat4`
  inherently readonly ✓. `scene(over: Partial<GameState>)` — LOW nit (loses required-field constraint
  on the override bag); acceptable for a controlled in-file test helper. → compliant (1 LOW noted).
- **#3 Enums:** none in diff. N/A.
- **#4 Null/undefined:** `if (!tip) return` before `tip[0]/tip[1]` ✓; `PROJECTILE_TTL - p.ttl` are both
  `number` (no `||`/`??` hazard) ✓. → compliant.
- **#5 Modules/declarations:** `PROJECTILE_TTL` added to existing `../core/state` import; `type`-only
  imports correctly qualified; extensionless imports consistent with the Vite/Vitest project. → compliant.
- **#6 React/JSX:** no .tsx. N/A.  **#7 Async:** none. N/A.  **#9 Build/config:** no config changed. N/A.
  **#10 Input validation:** no external input. N/A.  **#11 Error handling:** no try/catch. N/A.
- **#8 Test quality:** 6 tests, all with meaningful assertions; import from `src/`, no `as any` in
  assertions, no `.skip`. LOW findings: stale `shotAt` comment + `ttl` coupling, loose tracking
  assertion, unpinned flash upper bound, redundant `not.toBe` (see Delivery Findings). → compliant with LOW notes.
- **#12 Performance:** per-frame `cannons` 4-tuple alloc — negligible for a 60fps loop. → compliant.
- **#13 Fix-introduced regressions:** new const/function/import introduce no `as any`, `||`-on-nullable,
  or `JSON.parse`. → compliant.
- **Arch boundary (CLAUDE.md):** `render.ts` (shell) does NO game math; the flash gate READS sim state
  (`p.ttl`, `PROJECTILE_TTL`) to make a display decision and feeds nothing back into the sim; no
  DOM/time/random in core. → compliant.
- **Scope guard (8-18):** enemy-fireball line (`drawSpark`/`FIRE_GLOW`) UNCHANGED; `drawPlayerLaser`
  called only for `state.projectiles`. → compliant.

## Observations (≥5)

1. `[VERIFIED]` Flash + mode gate correct — render.ts: `if (state.mode === 'playing') for (...) if (PROJECTILE_TTL - p.ttl <= LASER_FLASH_SECONDS) drawPlayerLaser(...)`. Makes the laser transient AND keeps it off attract/game-over screens. Reads sim state only; complies with the core/shell boundary. Confirmed clean by eyeball on both play and game-over.
2. `[VERIFIED]` Null-safety — `drawPlayerLaser` guards `project()`'s nullable return (`if (!tip) return`) before `tip[0]/tip[1]`. No crash on behind-camera bolts. (render.ts)
3. `[VERIFIED]` `[SEC]` Security clean — pure Canvas 2D render fed only by the typed `GameState` from the deterministic core; no user input, network, auth, secrets, or DOM injection. (reviewer-security: status clean)
4. `[VERIFIED]` `[RULE]` Scope + boundary intact — enemy fireballs (`drawSpark`/`FIRE_GLOW`) unchanged, `BOLT_GLOW` still used by PRESS START, `drawSpark` still used; no dead code; no game math in the shell. (reviewer-rule-checker: 0 arch violations)
5. `[LOW]` `[TEST]`+`[RULE]` `shotAt` hardcodes `ttl: 2` with the now-stale comment "vel/ttl are irrelevant to the render" — `ttl` is now read by the flash gate; import/use `PROJECTILE_TTL`. Non-blocking. (test:122 / 130)
6. `[LOW]` `[TEST]` "tracks the shot" assertion (`to[0] > CENTER[0]+20`) plus the 60px centred tolerance leave a gap where a fixed `[450,300]` convergence passes both tests; pin to `project(p.pos)` in both axes. Implementation is correct (uses `project(p.pos)`, eyeball-confirmed), test merely under-constrains. Non-blocking. (test:162)
7. `[LOW]` `[TEST]` Transient test uses only ttl=2 and ttl=0.01 — an over-wide flash window wouldn't be caught; add a "just-expired" case. Non-blocking. (test:184)
8. `[LOW]` `[DOC]` Test header comment is written in RED-phase present tense ("Today render.ts draws every player bolt as a small green '+'… These guards fail until GREEN") — stale post-GREEN. Non-blocking. (comment-analyzer disabled; caught manually.)
9. `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SIMPLE]` subagents disabled via settings — manual pass found no boundary/silent-failure/type-invariant/over-engineering issues in this 52-line render change; the one type nit (`Partial<GameState>`) is captured above.

### Devil's Advocate

Argue the code is broken. **Timing/boundary:** the flash gate is `PROJECTILE_TTL - p.ttl <= LASER_FLASH_SECONDS`. If the sim ever set `ttl` slightly above `PROJECTILE_TTL` on spawn, `age` goes negative — still ≤ 0.12, so it flashes (harmless). If floating-point drift puts a bolt exactly on the 0.12 boundary, it could flicker on/off for a single frame — invisible at 60fps. A freshly-fired bolt spawns near the cockpit (z≈0); `project()` returns null until z < −NEAR, so the very first frame after firing may draw nothing — but at 900 u/s the bolt clears NEAR in ~1ms, so the flash is effectively always visible within its window (eyeball confirmed beams render). **Confused user:** someone reading `shotAt`'s "ttl is irrelevant" comment could author a test with an arbitrary ttl and be baffled when beams vanish — a real documentation trap, captured as a finding. **Malicious input:** there is none — every value originates in the deterministic core; Canvas 2D does not interpret strings as HTML, so the literal `#00e5ff` strokeStyle is inert. **Stressed conditions:** under rapid fire the OLD code built an unbounded cyan web (the very bug this story fixes); the new gate bounds it to one ~0.12s flash per 0.25s trigger — verified gone. **Resize:** the cannon tips are recomputed from `w,h` each call, so they track window resizes correctly (not a stale module constant). **The sharpest real weakness:** the test suite does not fully *prove* the "tracks the shot" AC — a non-tracking fixed-convergence implementation slips through the loose `x > 420` threshold. But the shipped implementation demonstrably tracks (`project(p.pos)`, eyeball-confirmed off-centre), so this is a test-strength gap, not a code defect. Nothing here rises to a runtime bug; all genuine findings are LOW test-quality items.

## Reviewer Assessment

**Verdict:** APPROVED

**Rationale:** The production change (`render.ts`) is correct, minimal, and verified three ways —
285/285 tests green, `tsc` clean, and a live dev-server eyeball confirming converging cyan beams that
flash transiently and no longer bleed onto the framing screens (the user's reported bug). It honours the
hard core/shell boundary (consumes `p.ttl`/`PROJECTILE_TTL`, does no game math) and the 8-18 scope guard
(enemy fireballs untouched). Security is clean (no attack surface). All confirmed findings are LOW,
test-quality only, with one dismissal (`as unknown as` mock — established idiom). No Critical/High issues.

**Data flow traced:** `input.fire` → sim `stepGame` pushes a `Projectile{ttl: PROJECTILE_TTL}` →
`render()` gates on `mode==='playing'` + freshness → `drawPlayerLaser` projects `pos` and strokes four
cyan corner→shot beams. Safe: all values are typed core state; nullable projection is guarded.

**Pattern observed:** `drawPlayerLaser` mirrors `drawSpark`/`drawWireframe` (lineWidth/strokeStyle/
shadowBlur/beginPath/stroke) and uses shared `project()` — consistent with the shell's render style. (render.ts)

**Error handling:** behind-camera/off-screen bolts produce no projection and draw nothing
(`if (!tip) return`) — no throw, no NaN strokes.

**Tags dispatched:** `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` `[RULE]`
(enabled: preflight/test-analyzer/security/rule-checker; the rest disabled via settings and checked manually).

**Non-blocking follow-up:** a test-hardening pass on `render.player-laser.test.ts` (see Delivery Findings) —
recommended for the next touch of that file, not required for merge.

**Handoff:** To SM (The Dude) for finish-story.