---
story_id: "sw3-9"
jira_key: "sw3-9"
epic: "sw3"
workflow: "tdd"
---
# Story sw3-9: Authentic enemy fireball render

## Story Details
- **ID:** sw3-9
- **Jira Key:** sw3-9
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** bug
- **Points:** 3

## Acceptance Criteria
1. Enemy fireballs render with the authentic 1983 shape + color taken from the ROM disassembly (documented with the sub_/vector-address citation), replacing the concentric-ring `drawFireball` shape.
2. PRESERVE the sw2-2 behavior that must not regress: the fireball is still a WORLD-sized, depth-scaled, billboarded body sized by `ENEMY_SHOT_HIT_RADIUS` (what you see is what you shoot — a near fireball swells, a far one shrinks), and it remains visually distinct from the muzzle starburst (story 9-6, whose rays radiate from the point).
3. Existing enemy-fireball tests still pass; add/adjust a render test that pins the new authentic shape (avoid the sw2-4 test-quality findings — assert the real shape, not a tautology).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-11T14:50:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-11T13:37:45.137788Z | 2026-07-11T13:41:37Z | 3m 51s |
| red | 2026-07-11T13:41:37Z | 2026-07-11T14:26:49Z | 45m 12s |
| green | 2026-07-11T14:26:49Z | 2026-07-11T14:39:51Z | 13m 2s |
| review | 2026-07-11T14:39:51Z | 2026-07-11T14:50:51Z | 11m |
| finish | 2026-07-11T14:50:51Z | - | - |
| red | - | 2026-07-11T14:26:49Z | unknown |
| green | 2026-07-11T14:26:49Z | 2026-07-11T14:39:51Z | 13m 2s |
| review | 2026-07-11T14:39:51Z | 2026-07-11T14:50:51Z | 11m |
| finish | 2026-07-11T14:50:51Z | - | - |

## Sm Assessment

**Setup complete — routing to Han Solo (TEA) for red.**

**Origin:** Live playtest 2026-07-11 surfaced three render-fidelity defects. Two filed into epic sw3 (this story + sw3-10 Death Star inside-out); the third — the static red X-wing cockpit struts — was retired as intentional flavor (the vector frame the laser bolts fire from), not a defect.

**The defect:** Enemy fireballs render as a hollow 14-sided **double concentric amber ring** — `drawFireball`, `star-wars/src/shell/render.ts:511` (`FIREBALL_FACETS=14`, `FIREBALL_INNER=0.55`, `FIRE_GLOW='#ffd60a'`). That shape is not how the 1983 cabinet drew enemy fire. It was introduced by the completed sw2-2, which correctly retired the old `+` glyph but chose the wrong replacement shape.

**Fidelity source (authoritative — cite, do not invent):** the ROM disassembly in `star-wars/reference/disasm/` — fireball routines `sub_A849` (movement) / `sub_AAE4` (processing) / timers `sub_987F`,`sub_9886`,`sub_9890` in `StarWars_annotated.lst`; 3D vector data in `Object_3D_Data.asm`; data-structure + scoring notes in `docs/star-wars-1983-source-findings.md` (`byte_494B` fireball table, `byte_985C` fireball score 33). reference/disasm is gitignored but present in this checkout.

**Scope:** shell-only render change is the expectation — `drawFireball` is pure render; no core/sim change. Preserve the sw2-2 world-sizing / billboard / depth-scale behavior and the muzzle-flash distinction (AC2).

**Gate (sm_setup_exit):** session ✓ (relocated from `star-wars/.session/` where sm-setup mis-placed it; Phase corrected red→setup) · fields ✓ (tdd / setup / star-wars) · context ✓ (`sprint/context/context-story-sw3-9.md`) · branch ✓ (`feat/sw3-9-enemy-fireball-render` from develop@v0.0.5) · Jira N/A (local tracking).

## Tea Assessment

**RED complete — failing tests pin the authentic red-sparkle fireball. Routing to Yoda (Dev) for GREEN.**

**What the fireball must become (authentic spec, sourced):** `WSVROM.MAC` `GNB0–3` (base sparkle) + `GNT0–3` (tip fuse-ball) — `COLOR VGCRED`; ~8 spikes from `CXY 0,0` outward via `AON dx,dy` with `FUSE` ball-dots; `ASPECT` round; 4 flicker frames. A **red, centre-radiating sparkle**, distance-scaled — replacing the amber concentric double-ring in `drawFireball` (`src/shell/render.ts:511`).

**Tests written (RED — 4 assertions fail vs the current amber-ring impl; verified by testing-runner, zero compile/type errors, no collateral):**
- `tests/shell/render.enemy-fireball.test.ts` (rewritten from sw2-2's ring contract): (1) body is RED near the shot, not amber; (2) SPARKLE — ≥4 red strokes anchored at the projected centre (a ring has zero); (3) depth-scaled — near red extent > far (sw2-2 invariant kept).
- `tests/shell/render.enemy-muzzle-flash.test.ts` (story 9-6): aged-fireball assertion updated amber→red body; other 3 muzzle tests unchanged/green.

**GREEN guidance for Dev (Yoda):**
- Shell-only; `drawFireball` is pure render — no core/sim change.
- Add a red fireball colour (`VGCRED`). Any saturated red passes the test's `isRed` (r≥150, g≤100, b≤100); reuse the cabinet red family. Keep the muzzle flash amber (`FIRE_GLOW`) so the two stay colour-separable.
- Draw spikes FROM the projected centre outward (`moveTo(centre) → lineTo(tip)`, repeat) so strokes are centre-anchored — matching the ROM `AON 0,0`/`AON dx,dy` pattern, NOT perimeter rings. ~8 spikes; fuse-ball dots + frame flicker are eyeball nice-to-haves (not pinned).
- Preserve sw2-2 world-sizing/billboard/depth-scale (project a body-radius offset; near swells, far shrinks).
- Do NOT draw centre-spoked AMBER strokes (they'd be miscounted as muzzle rays by 9-6's test).

**Rule coverage (`.pennyfarthing/gates/lang-review/typescript.md`):** a pure render function — structural TS rules (validated constructors, newtypes, exhaustive enums) don't apply. The load-bearing check is TEST QUALITY / non-vacuous assertions: the first testing-runner pass caught a vacuous whole-screen `some(isRed)` that HUD red satisfied; hardened by isolating every red check to the shot region (`FIREBALL_WINDOW` / centre-anchored), so each assertion can only be met by the fireball itself. No tautological/always-true assertions remain.

**Deviations:** 2 logged under `### TEA (test design)`.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/render.ts` — `drawFireball` now draws the authentic **red sparkle**: 8 `GNB0` spike deltas radiating from the projected centre, in `FIREBALL_GLOW = '#ff3b30'` (cabinet vector red / VGCRED), depth-scaled by `ENEMY_SHOT_HIT_RADIUS`. Replaced the amber double concentric ring (`FIREBALL_FACETS`/`FIREBALL_INNER` removed). `FIRE_GLOW` retained ONLY for the amber muzzle flash — the two are now colour-separable.
- `tests/shell/render.player-laser.test.ts` — updated the stale 8-18 scope-guard amber assertion + header to the red sparkle at the shot (a TEA RED-sweep gap; see Delivery Findings).

**Tests:** 609/609 passing (GREEN, verified by testing-runner). `tsc --noEmit` clean; `npm run build` (tsc + vite) passes.

**Env:** synced `@arcade/shared` to the pinned `v0.11.0` (fixes a pre-existing `/view` build break; node_modules only, not tracked).

**Not done (out of scope, unpinned):** the ROM's 4-frame flicker (`GNB0–3`) and `FUSE` tip-balls (`GNT0–3`) — a static single-frame sparkle ships; see the Dev deviation. Visual/playtest confirmation recommended (natural fit for sw2-7).

**Branch:** `feat/sw3-9-enemy-fireball-render` (pushed)

**Handoff:** To review — Obi-Wan Kenobi (Reviewer).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap · blocking] Authentic fireball *geometry* is not recoverable from `reference/`.** TEA traced the fireball render to `sub_AC52` (ROM:AC52 "Fireball animation"): the body is drawn as a **single distance-scaled AVG vector picture** — `JSRL $A015` (normal) / `$A017` (hit-variant) — plus a scale word (`DPbyte_1`, magnitude 1..8 from projected distance) and a colour/STAT word. This *confirms* the current `drawFireball` **double concentric ring** (`src/shell/render.ts:511`, `FIREBALL_FACETS=14` + `FIREBALL_INNER=0.55`) is structurally wrong — authentic is ONE scaled picture, not two nested hollow rings. **However** the picture's actual line geometry lives in the **AVG vector ROM**, which is NOT in the quarry: `reference/README.md` lists only the 6809 game/sound boards + `Object_3D_Data.asm` (3D models — no fireball object); the AVG vector disassembler/data trace to "wardclan (now offline)" and are not vendored. So AC1 ("authentic shape … from the disassembly, with a vector-address citation") cannot be met literally — we can cite the draw routine and confirm "single scaled ball, not concentric rings," but not the exact vertices. ~~**Blocks writing a faithful pinning test until the target is decided**~~ **RESOLVED 2026-07-11** — the user pointed to the preserved original Atari source (GitHub `historicalsource/star-wars`, codename "Warp Speed", commit `5355b76`), which DOES contain the AVG vector pictures the local disasm lacks. The enemy fireball is `WSVROM.MAC` `.SBTTLE GUNSHOT PICTURES` → **`GNB0–3`** (base sparkle) + **`GNT0–3`** (tip fuse-ball): an animated **red radial sparkle** — `COLOR VGCRED,0FF`; ~8 spikes drawn from center `CXY 0,0` outward via `AON dx,dy` (draw) / `AOFF` (move) with `FUSE` ball-dots; `ASPECT` for a round envelope; 4 flicker frames. So the authentic fireball is **red + spiky-from-center**, NOT the current amber concentric rings. Source repo documented for future sessions in `star-wars/docs/star-wars-1983-source-findings.md`, the tea/architect/dev sidecars, and auto-memory. **No longer blocking** — RED can pin the real geometry.

  **Scope note for GREEN (Dev/Yoda):** the authentic shape differs on TWO axes — SHAPE (radial sparkle vs concentric rings) AND COLOR (red `VGCRED` vs our amber `#ffd60a`). This cascades: (a) the existing sw2-2 test `render.enemy-fireball.test.ts` keys on amber `FIRE_GLOW` and asserts a perimeter ring — it must be updated to the red sparkle; (b) `render.enemy-muzzle-flash.test.ts` distinguishes the amber muzzle flash from the fireball by assuming the fireball has NO center-anchored rays — but the authentic fireball IS center-anchored spikes. Turning the fireball red actually *separates* the two by color (muzzle amber vs fireball red), which resolves the conflict, but the muzzle-flash test's mechanism must be revisited. TEA is updating both tests as part of RED; logged under Design Deviations.

### Dev (implementation)
- **Gap** (non-blocking): the RED amber→red sweep missed a THIRD spot — `render.player-laser.test.ts` (the 8-18 scope guard) asserted the fireball is amber (`#ffd60a`) in both a test body and the file-header comment. It surfaced only in the GREEN full-suite run (the focused RED run covered just the two changed files, and the initial full RED run predated the colour change). Dev updated it to the red sparkle, isolated to the shot's projected point. Affects `tests/shell/render.player-laser.test.ts` (already fixed).
- **Improvement** (non-blocking): this checkout's `node_modules` held a stale `@arcade/shared@0.10.0` while `package.json` pins `github:slabgorb/arcade-shared#v0.11.0` (which adds `/view`), so `tsc`/`npm run build` failed on `@arcade/shared/view` *before* any sw3-9 change. Fixed by forcing the pinned ref: `npm install @arcade/shared@github:slabgorb/arcade-shared#v0.11.0`. CI does a clean install so it is unaffected; other local checkouts may hit the same staleness (plain `npm install` won't re-resolve a changed git ref). Affects the local dev environment only (node_modules is gitignored — no tracked change).

### Reviewer (code review)
- **Improvement** (non-blocking): `render.player-laser.test.ts:224` hardcodes the fireball-red literal `'#ff3b30'` in the 8-18 scope guard instead of the tolerance-based `isRed()` idiom THIS SAME diff introduces in both sibling files (`render.enemy-fireball.test.ts:105`, `render.enemy-muzzle-flash.test.ts:85`). It would spuriously break on any future `FIREBALL_GLOW` hue tweak that the siblings are explicitly built to tolerate. Affects `tests/shell/render.player-laser.test.ts` (swap the exact-match for an `isRed()`-style red-dominant check near the shot). *Found by Reviewer during code review — confirmed via reviewer-rule-checker (TS check #8, high confidence). LOW severity, non-blocking.*
- **Improvement** (non-blocking): eyeball/feel items best judged in the sw2-7 live playtest, none requiring a code change to approve: (a) the static single-frame sparkle vs the ROM's 4-frame flicker (accepted Dev deviation) — watch it doesn't read as fixed decoration; (b) `FIREBALL_GLOW '#ff3b30'` is identical to the Surface-Tower red (`wireframe.ts:29`) — authentic (both VGCRED) but fireballs and towers share a hue in the surface phase; (c) the longest spike tips reach ~1.06× the projected `ENEMY_SHOT_HIT_RADIUS`, a marginal "see-vs-shoot" overshoot on thin tips. Affects gameplay legibility (star-wars render). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Rewrote the sw2-2 fireball render contract from concentric ring to red sparkle**
  - Spec source: .session/sw3-9-session.md, AC-3
  - Spec text: "Existing enemy-fireball tests still pass; add/adjust a render test that pins the new authentic shape"
  - Implementation: rewrote `tests/shell/render.enemy-fireball.test.ts` — replaced sw2-2's "large round body / concentric ring" assertions with the authentic red-sparkle contract (red-dominant ink near the shot; ≥4 centre-anchored spikes; depth-scaled), keeping only sw2-2's still-true 3D-scaling invariant.
  - Rationale: the sw2-2 test pinned a shape (two amber concentric perimeter rings) now proven wrong against the ROM picture (`WSVROM.MAC` `GNB0-3`/`GNT0-3`), so leaving it green would lock in the defect this story fixes.
  - Severity: major
  - Forward impact: none
- **Fireball↔muzzle-flash distinction moved from geometry to colour; 9-6 test updated**
  - Spec source: .session/sw3-9-session.md, AC-2
  - Spec text: "it remains visually distinct from the muzzle starburst (story 9-6, whose rays radiate from the point)"
  - Implementation: the authentic fireball body ALSO radiates spikes from its projected point (it is a sparkle), so geometry can no longer separate it from the muzzle flash; the discriminator is now COLOUR — fireball red (`VGCRED`) vs muzzle-flash amber (`#ffd60a`). Updated `render.enemy-muzzle-flash.test.ts`'s aged-fireball assertion from "still draws amber" to "draws red sparkle body," isolated to the shot region.
  - Rationale: the ROM's enemy fireball is itself a centre-radiating sparkle, making the sw2-2-era "perimeter-only body" premise obsolete; colour is the faithful discriminator.
  - Severity: major
  - Forward impact: minor — story 9-6's separate amber muzzle flash may now be redundant/superseded by the authentic sparkle; recommend a follow-on to reconcile (keep amber tell vs remove). No 9-6 behaviour changed in this story.

### Dev (implementation)
- **Static single-frame sparkle — no fuse-ball dots or 4-frame flicker**
  - Spec source: .session/sw3-9-session.md, AC-1
  - Spec text: "Enemy fireballs render with the authentic 1983 shape + color taken from the ROM ... replacing the concentric-ring `drawFireball` shape"
  - Implementation: `drawFireball` draws ONE static frame — the 8 `GNB0` spike deltas radiating from the projected centre in red (`FIREBALL_GLOW = '#ff3b30'`, the cabinet vector red), depth-scaled by `ENEMY_SHOT_HIT_RADIUS`. The ROM's 4-frame flicker (`GNB0–3`) and the `FUSE` tip-balls (`GNT0–3`) are omitted.
  - Rationale: minimalist GREEN — the pinned contract is red + centre-radiating sparkle + depth-scale; TEA pinned neither flicker nor fuse-balls (eyeball follow-ons), and flicker needs a signature change (the shot's age into `drawFireball`) for eyeball-only gain.
  - Severity: minor
  - Forward impact: minor — a follow-on can add the 4-frame flicker + fuse-ball tips for full animation fidelity (`drawFireball` would take the shot's `ttl`/age).

### Reviewer (audit)
- **TEA — Rewrote the sw2-2 ring contract → red sparkle** → ✓ ACCEPTED by Reviewer: the sw2-2 concentric-ring contract was demonstrably wrong against the ROM picture (`WSVROM.MAC GNB0-3`); rewriting the test to the red sparkle corrects the pinned spec rather than working around it — not scope creep.
- **TEA — Fireball↔muzzle distinction moved geometry → colour** → ✓ ACCEPTED by Reviewer: the authentic fireball genuinely radiates from its centre, so geometry can no longer separate it from the 9-6 muzzle flash; colour (red body vs amber flash) is the sound discriminator, and it IS asserted (the muzzle test filters amber, the fireball/aged tests filter red-dominant). The recommended 9-6 reconciliation follow-on is reasonable and non-blocking.
- **Dev — Static single-frame sparkle (no flicker/fuse-balls)** → ✓ ACCEPTED by Reviewer: TEA pinned neither flicker nor fuse-balls, and they add per-frame state (a `drawFireball` signature change) for eyeball-only gain; a faithful static frame is a defensible minimal GREEN. Full-animation fidelity is a fair follow-on; flagged for the sw2-7 eyeball pass.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 609/609 green, `tsc` clean, tree clean, 0 code smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — self-assessed (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — self-assessed (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered by rule-checker check #8 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — self-assessed (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker checks #1/#2 |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — self-assessed (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — self-assessed (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (TS check #8, LOW) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents`, pre-filled as Skipped and self-assessed)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `state.enemyShots[i].pos` (sim world coord) → `transform(view, …)` → `drawFireball(camPos)` (render.ts:526) → `project()` → 8 red spikes stroked from the projected centre. Safe: `drawFireball` is a pure function of `(camPos, proj, w, h)`, guards both `project()` nulls (render.ts:531,534), mutates no sim state, and uses no time/RNG — the core/shell boundary holds.

**Pattern observed:** the amber concentric double-ring was replaced by a centre-radiating spike table (`FIREBALL_SPIKES`, render.ts:502) scaled by `k = projected_radius / FIREBALL_SPIKE_NOM` — the authentic AVG `GNB0` gunshot picture, re-expressed. Simpler than the code it replaced (one stroke loop, two constants removed).

**Error handling:** null-projection early-returns (render.ts:531,534); no throwing paths; `k` divides by the constant 16 (no div-by-zero). Pure Canvas-2D geometry — no I/O, network, or input surface.

### Rule Compliance (TS lang-review, 13 checks)
- **#1 Type-safety escapes** — PASS. Only `as unknown as CanvasRenderingContext2D` (the documented shell-test mock idiom; justified at render.player-laser.test.ts:39-40). No `as any`, `@ts-ignore`, or non-null on nullable.
- **#2 Generic/interface** — PASS. `FIREBALL_SPIKES: ReadonlyArray<readonly [number, number]>` (render.ts:502); helpers take `ReadonlyArray<Seg>`; `Partial<GameState>` in `scene()` is the established fixture idiom.
- **#3 Enum / #6 JSX / #7 Async / #9 Config / #10 Input-validation / #11 Error-handling / #12 Perf-bundle** — N/A (no such code touched; pure render geometry).
- **#4 Null/undefined** — PASS. `rgb()`/`isRed()` guard `regex.exec()` (`if (!m) return …`) before destructuring; `drawFireball` guards both projections.
- **#5 Module/declaration** — PASS. `import type` for `Vec3`/`HighScoreTable`; extensionless relative imports correct under `moduleResolution: bundler`.
- **#8 Test quality** — PASS with one LOW nit. Red checks are scoped to the shot (`FIREBALL_WINDOW=120`, `AT_CENTRE_TOL=4`, 60px near-shot), non-vacuous; mock signatures cover the exercised paths. Nit: player-laser.test.ts:224 hardcoded hex (see [RULE]).
- **#13 Fix-regressions** — PASS. Re-scan clean; the nit is fresh, not a reintroduced class.

### Observations
- `[RULE][TEST]` **LOW** — `render.player-laser.test.ts:224` hardcodes `'#ff3b30'` vs the sibling `isRed()` idiom the same diff introduces — fragile to hue drift. Confirmed (rule-checker, high confidence). Non-blocking; captured as a Delivery Finding.
- `[VERIFIED]` `drawFireball` guards both `project()` nulls (render.ts:531,534) and `k` divides by const `FIREBALL_SPIKE_NOM=16` — no null deref, no div-by-zero. Complies with TS #4.
- `[VERIFIED]` `FIREBALL_SPIKES` is immutable `ReadonlyArray<readonly [number,number]>` (render.ts:502). Complies with TS #2.
- `[VERIFIED]` colour separation is real AND tested: `FIRE_GLOW` amber only at the muzzle (render.ts:440-441), `FIREBALL_GLOW` red at the body (535-536); the muzzle test isolates amber, the fireball/aged tests isolate red-dominant — the geometry-overlap risk (both radiate from centre) is disambiguated by colour.
- `[VERIFIED]` tests are non-vacuous — the rule-checker traced the discrimination (8 centre-anchored red segments for the sparkle vs 0 for a ring vs HUD red filtered out by the window). Complies with TS #8.
- `[SIMPLE]` **LOW** — longest spike tips reach ~1.06×`sr` (max magnitude 17 in a ±16 nominal), extending thin tips ~6% past the projected `ENEMY_SHOT_HIT_RADIUS`. Marginal "see-vs-shoot" drift; eyeball, non-blocking.
- `[LOW]` `FIREBALL_GLOW '#ff3b30'` == Surface-Tower red (`wireframe.ts:29`) — authentic (both VGCRED) but shares a hue with towers in the surface phase. Eyeball (sw2-7).
- `[LOW]` static single-frame sparkle (accepted Dev deviation) — reads as a fixed red star vs the ROM's flicker. Eyeball (sw2-7).
- `[EDGE]` (subagent disabled — self-assessed): `drawFireball` paths enumerated — both `project()` nulls early-return; empty `enemyShots` draws nothing; `sr=0` → invisible (same as the prior impl, not a regression). No unhandled boundary.
- `[SILENT]` (disabled — self-assessed): no swallowed errors — no `try/catch`; the only failure path is an intentional early-return on null projection, matching every sibling draw fn.
- `[DOC]` (disabled — self-assessed): docstrings rewritten to the sparkle (render.ts:514-525); stale "concentric ring / distinct-by-geometry" comments removed; test headers updated (player-laser 13-15, muzzle-flash 127); the docs findings addition is accurate to `WSVROM.MAC`. No stale comments left.
- `[TYPE]` (disabled — self-assessed): covered by rule-checker #1/#2 — readonly tuple table, no type escapes beyond the justified mock cast.
- `[SEC]` (disabled — self-assessed): pure Canvas-2D geometry — no user input, network, storage, or injection surface. N/A.
- `[SIMPLE]` (disabled — self-assessed): `drawFireball` is simpler post-change (one stroke loop vs two ring loops; `FIREBALL_FACETS`/`FIREBALL_INNER` removed). The only duplication is the player-laser hardcoded hex (see `[RULE]`).

### Devil's Advocate
Assume this is broken. First, legibility: on the Death Star surface the fireball red is byte-identical to the tower red (`#ff3b30`) — a player under fire could fail to parse incoming ordnance from static turrets and eat hits they never saw as threats. That is exactly the kind of "reads as HUD furniture" failure sw2-2 was created to kill (the old `+` read as a reticle tick); a *static, never-rotating* red asterisk risks sliding back toward that — a field of identical fixed stars can read as decoration, not live fire. Second, aim honesty: the sim hit-tests at `ENEMY_SHOT_HIT_RADIUS`, but the longest spikes paint ~6% beyond it, so a player who aims at a spike's visible outer edge may log "phantom misses" under fast play — small, but real, and the story's own AC2 pledges "what you see is what you shoot." Third, the fresh-shot instant overlays amber muzzle rays and red spikes at the same point for the flash window; to a player that momentary amber-over-red mush could read as a render glitch. Fourth, robustness: `enemyShots` is ROM-bounded (≤6), so no unbounded draw loop; a `NaN` in `camPos` would fail `project()`'s guards and early-return rather than crash — checked. Fifth, the depth-scale test leans on `sr` shrinking monotonically with distance; it does at the tested −500 vs −5000, but a future projection clamp at extreme-near range could flatten near≈far and flake the test. None of these rise to Critical/High — they are legibility/feel risks, and the right forum for them is the sw2-7 live playtest, which this epic already schedules. Verdict stands: APPROVED.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.