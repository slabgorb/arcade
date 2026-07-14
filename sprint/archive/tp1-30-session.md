---
story_id: "tp1-30"
jira_key: "tp1-30"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-30: THE PALETTE, part 2 — enemies + starfield resolve colour through the COLTAB bank (V-019, DB-017)

## Story Details
- **ID:** tp1-30
- **Jira Key:** tp1-30
- **Workflow:** tdd
- **Stack Parent:** tp1-12

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T18:07:15Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T16:50:35Z | 2026-07-14T16:53:59Z | 3m 24s |
| red | 2026-07-14T16:53:59Z | 2026-07-14T17:16:12Z | 22m 13s |
| green | 2026-07-14T17:16:12Z | 2026-07-14T17:35:54Z | 19m 42s |
| review | 2026-07-14T17:35:54Z | 2026-07-14T17:51:27Z | 15m 33s |
| red | 2026-07-14T17:51:27Z | 2026-07-14T17:58:57Z | 7m 30s |
| green | 2026-07-14T17:58:57Z | 2026-07-14T18:00:17Z | 1m 20s |
| review | 2026-07-14T18:00:17Z | 2026-07-14T18:07:15Z | 6m 58s |
| finish | 2026-07-14T18:07:15Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the AC's "pulsar white/cyan STROBE" is bank-0-specific; the ROM resolves BOTH pulsar states through the bank. PULPIC (ALDISP.MAC:861-867) does `LDA I,TURQOI`(=COLRAM slot 4)/`LDA I,WHITE`(=slot 0) → `STA COLOR`, and WHITE/TURQOI are SLOT INDICES (ALCOMN.MAC:351-358), not hues. So a DORMANT pulsar draws in slot 4 (per-bank: cyan/yellow/purple/yellow/cyan/cyan), a PULSING one in slot 0 (white, every bank). Affects `src/shell/glyphs.ts` (`pulsarColor(bright)` → must take `level`) and `src/shell/render.ts:386-395` (the comment claims fixed hues — correct it). *Found by TEA during test design.*
- **Improvement** (non-blocking): finding V-004 (CONFIRMED "pulsar turquoise idle / white pulsing") is bank-0 TRUE and stays true after tp1-30 — do NOT `remediated_by` it; it is not a fix. But its `ours` quote (the old `pulsarColor`) will move, so run `node tools/audit/reanchor-citations.mjs --write` after editing glyphs.ts. Affects `docs/audit/findings/pair-2-alvrom-shapes-font.json`. *Found by TEA during test design.*
- **Gap** (non-blocking): `starfield.ts` COMPACTS the planes array on retire, so a plane's array index shifts across its life, whereas the ROM keys star colour on a FIXED plane slot (INDEX1). The RED tests pin the pure `starColor(level, planeIndex)` MAPPING only; Dev chooses what index `drawStarfield` feeds it (array position is the natural, acceptable choice for eye-candy). Affects `src/shell/render.ts` (`drawStarfield`) / `src/shell/starfield.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the `asGlyphColor` helper's `black` branch is unreachable for the enemy slots (0-5,7 are never the bank-4 invisible-well black) — it is a required TS narrowing to keep `GlyphStroke.color = GlyphColor` and the "no glyph is ever black" invariant true. The simplify/type-design reviewer may flag it as dead; it is intentional and commented. Affects `src/shell/glyphs.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): star planes at array index 6 during the invisible-well waves 65-80 (bank 4 slot 6 = ZBLACK) now render as background via `paletteHex` — ROM-faithful (those stars vanish) but unit-tests do not cover it and stars only show during the warp dive; a visual/playtest check at wave 65+ would confirm it reads right. Affects `src/shell/render.ts` (`drawStarfield`). *Found by Dev during implementation.*
- No other upstream findings.

### Reviewer (code review)
- **Improvement** (non-blocking): `drawEnemy`'s `switch (e.kind)` (render.ts:358) has no `default: assertNever(e)` — a 6th EnemyKind would fall through silently (lang-review #3). PRE-EXISTING (tp1-30 did not touch the case structure), so out of scope for this story; worth a small exhaustiveness-hardening story across drawEnemy + the tankerGlyph cargo `if/else` chain. Affects `src/shell/render.ts`, `src/shell/glyphs.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `resolveWellColor` is now a PUBLIC export but its `zapFlash % LEVEL_COLORS.length` has no negative guard (a negative arg would index from the end → undefined). Unreachable today (`fx.zapFlash` is `e.color & 7`), pre-existing logic, and out of AC4's `level`/`slot` scope — but a public function invites future callers; consider clamping or documenting the 0-7 contract. Affects `src/shell/render.ts`. *Found by Reviewer during code review.*
- **Question** (non-blocking): the starfield colours each plane by its ARRAY index, which shifts as planes retire (compaction), so a live plane's colour changes mid-dive — a flicker the ROM's fixed PLANEY slots never show. TEA documented this as accepted eye-candy; a playtest should confirm it reads acceptably, else a stable per-plane colour index (assigned at spawn) in `starfield.ts` would remove it. Affects `src/shell/render.ts` (`drawStarfield`) / `src/shell/starfield.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Dormant pulsar recolours per bank (slot 4), pulsing stays white (slot 0) — not a pair of fixed hues**
  - Spec source: context-story-tp1-30.md, AC2
  - Spec text: "the tanker CARGO EMBLEM and the pulsar white/cyan STROBE demonstrably survive (guarded by RED tests)"
  - Implementation: RED tests pin `pulsarColor(level, false)` = `paletteColor(level, 4)` (cyan/yellow/purple/yellow/cyan/cyan) and `pulsarColor(level, true)` = slot 0 ('white', every bank), encoding PULPIC (ALDISP.MAC:861-867) as a slot SELECTOR over COLRAM indices (ALCOMN.MAC:351-358). "white/cyan" is treated as bank 0's instance of slots 0/4, not two fixed hues.
  - Rationale: The ROM is canonical for this epic. PULPIC does not override slot 4 — it chooses between slot 4 (idle) and slot 0 (pulsing), both resolved through the bank; V-019 ("recolouring EVERY enemy") requires the pulsar to recolour. A fixed cyan is correct only in bank 0. The two-state STROBE still "survives" (pulse-on ≠ pulse-off).
  - Severity: minor
  - Forward impact: `pulsarColor` gains a `level` param; render.ts:386-395 comment corrected; V-004 reanchored (not remediated). See Delivery Findings.
- No other deviations from spec.

### Dev (implementation)
- **Re-seated the Story 6-8 sibling tests (glyphs.test.ts) to the new level-keyed signatures**
  - Spec source: tests/shell/glyphs.test.ts (pre-existing Story 6-8 suite)
  - Spec text: `flipperGlyph()`, `tankerGlyph('flipper')`, `pulsarColor(true)` (old signatures)
  - Implementation: updated the calls to `flipperGlyph(1)`, `tankerGlyph(1, 'flipper')`, `pulsarColor(1, true)` (level 1 = bank 0) + fixed the stale signature docs in that file's header
  - Rationale: the tp1-30 signature change (adding `level`) is a contract change; `tsc` (which type-checks `tests/`) rejects the old arg counts, and at bank 0 the resolved colours are IDENTICAL to the pre-tp1-30 constants, so every assertion (shape, distinct cargo emblems, cyan/white strobe) is preserved. This is the sibling re-seat that ideally lands in RED.
  - Severity: minor
  - Forward impact: none — behaviour at bank 0 unchanged.
- **Corrected the tanker-body bank-3 golden literal in the tp1-30 RED test (green → purple)**
  - Spec source: tests/shell/tp1-30.palette-enemies-starfield.test.ts, AC2 tanker-body test
  - Spec text: `wantByBank = ['purple','blue','cyan','green','purple','purple']`
  - Implementation: changed bank 3 from `'green'` to `'purple'` — COLTAB bank 3 slot 2 is ZPURPL (tp1-12-pinned table), a transcription slip in the RED literal; the same test's `=== paletteColor(level, SLOT_TANKER)` assertion already proved the implementation resolves slot 2 correctly.
  - Rationale: the golden was factually wrong against the already-pinned table; the fix aligns the literal with the ROM, it does not weaken the test.
  - Severity: minor
  - Forward impact: none.
- **Citation handling: remediated_by V-004/DA-014/DA-016 (reversing the TEA note to "reanchor, not remediate")**
  - Spec source: TEA Delivery Finding (this session) + CLAUDE.md citation convention
  - Spec text: "do NOT remediated_by V-004 … run reanchor after editing glyphs.ts"
  - Implementation: marked the three CONFIRMED single-hue colour findings (V-004 pulsar, DA-014 flipper, DA-016 tanker) `remediated_by: tp1-30`, alongside the DIVERGENCE umbrella findings V-019 + DB-017.
  - Rationale: the TEA note assumed reanchor could re-home them, but reanchor only fixes LINE moves for quotes whose TEXT survives — tp1-30 changes the EXACT lines these three cite (fixed hue → `paletteColor(level, slot)`), so their text is gone and reanchor reports LOST. `remediated_by` freezes the old quote as accurate HISTORY (what our code said at audit — still true at bank 0), which is precisely this case; the ROM `source` side stays checked. WD-013 (unrelated starfield-gating finding) only gained a call param, so its `ours` was updated in place, not remediated.
  - Severity: minor
  - Forward impact: none — citation gate green; the findings' claims remain valid ROM history.

## Sm Assessment

**Routing:** tdd (phased) → RED phase → **TEA** (Imperator Furiosa). Story set up, branch cut, story context carries ROM-cited ACs. Handing off for failing tests.

**What survives, what gets cut — the triage for TEA:**

- **Dependency is real and landed.** tp1-12 is merged to tempest `develop` (commit `bad7f12`): `COLTAB_BANKS` / `paletteBank(level)` / `paletteColor(level, slot)` / `WELL_SLOT` live in `src/shell/glyphs.ts`. tp1-30 builds on that surface — do not re-derive the bank mechanism, consume it.

- **CRITICAL first move is a WRITTEN ROM ruling, not code.** Before any pulsar wiring, resolve: does the pulsar read COLTAB slot 4, or does the PULPIC two-state turquoise/white toggle (established tp1-3 / DA-020) OVERRIDE slot 4? AC #1 demands this be cited in writing (ALDISP.MAC refs) before the mechanism is trusted. If the answer is "PULPIC overrides," the pulsar is NOT a palette caller and the RED test must pin the strobe surviving — not a slot-4 recolour. This is the story's own stated landmine; TEA writes the test that encodes whichever ruling the source gives.

- **This is per-enemy, per-sub-stroke — NOT a blanket glyph override.** The tanker recolours BODY only; the cargo emblem (which signals cargo type) must demonstrably survive. Tests must guard the survivors (cargo emblem, pulsar strobe), not just assert the recolour.

- **Two guards were unreachable in tp1-12 and become reachable here:** `paletteColor`/`paletteBank` input guards (Number.isFinite level, slot bounds) were flagged by 3 review specialists but had no callers to exercise them. The enemy/starfield callers land them — RED tests should drive a non-finite level + out-of-range slot.

- **Kill the gameable test.** tp1-12's well wiring was a source-scan that mutation-testing proved gameable. Extract a pure `resolveWellColor(level, zapFlash)` and test it BEHAVIOURALLY. (See memory: guards must be mutation-tested, not asserted against a token.)

- **Bookkeeping on finish:** V-019 + DB-017 are subsumed — mark both `remediated_by: tp1-30`, reanchor citations, keep `npm test -- citations` green.

**Base branch is `develop`, not main** (tempest ships releases to main via CI). All PRs target develop.

Witness me.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5-pt behaviour change across enemies + starfield + a pure extraction; the story explicitly names tp1-12's gameable source-scan as the thing to replace.

**Test Files:**
- `tests/shell/tp1-30.palette-enemies-starfield.test.ts` — 33 tests, all BEHAVIOURAL (call the pure function, assert the return; NO `?raw` source-scan). Header resolves AC1's ROM question in writing with citations.

**Tests Written:** 33 tests covering all 6 ACs.
**Status:** RED — **27 failing / 6 passing**, full suite 27 failed / 1101 passed (RED isolated to this file). The 6 pre-GREEN passes are all intended keep-behavior/structural guards (flipper-is-one-stroke; fuseball-emblem-stays-yellow; pulsarColor-returns-a-ROM-colour; pulsing-is-white [true in old AND new]; slot-0-not-swallowed; resolvers-survive-NaN). Every new-behavior assertion is RED.

**AC → coverage map:**
| AC | What the RED test pins | Key failing test |
|----|------------------------|------------------|
| 1 (ROM question in writing) | test-file header + Design Deviation: PULPIC selects slot 4 (idle)/slot 0 (pulsing); tanker BODY recolours, emblem survives | pulsar + tanker describes |
| 2 (enemies through palette, emblem+strobe survive) | flipper=slot 3, tanker body=slot 2 (emblem cyan/yellow invariant), pulsar slot 0/4 — per bank | flipper/tanker/pulsar |
| 3 (starfield from wave 5, 7→4) | `starColor(level, plane)`: blue <5; per-plane `idx&7` (7→4) ≥5; DB-017's bank-0 golden sequence | AC3 / DB-017 |
| 4 (input guards) | `paletteColor(NaN,·)`/`(·,99)`/`(·,-1)` no-throw + ROM colour; `paletteBank(NaN)` finite | AC4 |
| 5 (`resolveWellColor` extraction) | pure `resolveWellColor(level, zapFlash)`: well vs strobe, invisible-well=`#000000`, override, cycle, wrap | AC5 |
| 6 (V-019/DB-017 remediated) | both findings `remediated_by == tp1-30` | AC6 |
| wiring | `drawEnemy` recording-ctx: flipper pixel differs wave 1 vs 17; tanker emblem pixel survives both | WIRING |

### Rule Coverage (lang-review/typescript.md)
| Rule | Test | Status |
|------|------|--------|
| #4 `??` not `||` (falsy 0) | `slot 0 is NOT swallowed by a falsy guard` (slot 0 → white) | passing guard |
| #4 optional/undefined handling | AC4 non-finite level + out-of-range slot no-throw | failing |
| #1 no `as any` | test uses a scoped, commented `as unknown as GameState` for the mock only — no `as any` | n/a (self) |
| #8 test quality — no vacuous asserts | self-check below | done |

**Rules checked:** the two TS rules with real surface here (#4 nullish/guard, #8 test-quality) both have coverage; the rest (#3 enum, #6 JSX, #7 async, #10 input-validation) are N/A to a pure colour-lookup change.
**Self-check:** 3 vacuous tests (passed via `undefined === undefined` while the new fn was absent) found and hardened with `.toBeDefined()`/`.toMatch(HEX)` so they fail RED and are meaningful post-GREEN. Also removed an unused local (`noUnusedLocals` would break the post-GREEN `tsc`).

**Dev notes (The Word Burgers):**
- `pulsarColor` and the enemy glyphs gain a `level` param → `tsc` will FORCE `drawEnemy` to thread `s.level`; the WIRING test proves it isn't a constant.
- Read the Delivery Findings + Design Deviation before touching the pulsar — the ROM answer INVERTS the "always turquoise/white" reading.
- Touching cited files (render.ts, glyphs.ts) → run `node tools/audit/reanchor-citations.mjs --write` and `npm test -- citations` BEFORE commit; mark V-019 + DB-017 `remediated_by: tp1-30`; do NOT remediate V-004 (reanchor it).

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/glyphs.ts` — `flipperGlyph(level)` (slot 3), `tankerGlyph(level, cargo)` (body slot 2, emblem untouched), `pulsarColor(level, bright)` (PULPIC slot 0/4) now resolve through the palette; new `starColor(level, planeIndex)` (DB-017); `asGlyphColor` narrowing preserves "no glyph is black"; input guards on `paletteBank` (non-finite → bank 0) and `paletteColor` (slot clamped to [0,7]).
- `src/shell/render.ts` — `drawEnemy` threads `s.level` into the three enemy glyphs; `drawStarfield(ctx, W, H, level)` recolours each plane via `paletteHex(starColor(level, i))` (STAR_COLOR removed); `resolveWellColor(level, zapFlash)` extracted + used for the tube well; pulsar comment corrected to the slot-selector reading.
- `tests/shell/glyphs.test.ts` — Story 6-8 sibling calls re-seated to the level-keyed signatures at level 1 (bank 0); stale signature docs fixed. (see Deviations)
- `tests/shell/tp1-30.palette-enemies-starfield.test.ts` — one golden literal corrected (tanker body bank 3, green → purple). (see Deviations)
- `docs/audit/findings/*.json` — V-019, DB-017, V-004, DA-014, DA-016 marked `remediated_by: tp1-30`; WD-013 `ours` updated in place; 38 findings reanchored (line shifts), **0 lost**.

**Tests:** 1128/1128 passing (GREEN). `tsc --noEmit` clean · `vite build` OK · `npm test -- citations` green.

**AC status:** 1 (ROM ruling written + cited) ✓ · 2 (enemies through palette, emblem+strobe survive) ✓ · 3 (starfield DB-017) ✓ · 4 (input guards) ✓ · 5 (pure `resolveWellColor`) ✓ · 6 (V-019/DB-017 remediated, citations green) ✓.

**For the Reviewer (Immortan Joe):** the load-bearing judgment call is the pulsar — PULPIC selects COLRAM slot 0 (pulsing) / slot 4 (idle), both per-bank; "white/cyan" is bank 0's instance (see TEA Deviation + Delivery Finding). And the citation reversal: three CONFIRMED colour findings were `remediated_by` (not reanchored) because tp1-30 changes their exact cited lines (see Dev Deviation). A visual/playtest pass on the recoloured enemies + the invisible-well-wave stars is recommended.

**Handoff:** To Reviewer.

## Subagent Results — Round 1

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1128/1128 green, tsc clean, citations 12/12, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — edge/guard boundaries covered by Reviewer + rule-checker |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — guard-fallback analysis covered by Reviewer + security |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — comment accuracy spot-checked by Reviewer (pulsar/flicker comments verified) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — asGlyphColor narrowing + PaletteColor/GlyphColor split covered by rule-checker #1 |
| 7 | reviewer-security | Yes | clean | none | N/A — no security surface; guards fully close the undefined-array crash path |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — asGlyphColor dead-branch + forEach reviewed by Reviewer (accepted: required TS narrowing) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 0 (in-scope), dismissed 1 (pre-existing, out of scope) |

**All received:** Yes (4 ran, 5 disabled)
**Total findings:** 3 confirmed (all [TEST]), 1 dismissed (pre-existing rule gap, out of scope), 0 deferred.

### Rule Compliance (lang-review/typescript.md + tempest CLAUDE.md)

- **#1 type-safety escapes:** COMPLIANT. `asGlyphColor` (glyphs.ts:30) is a real runtime narrowing (`c === 'black' ? 'white' : c`), NOT a cast — independently confirmed by rule-checker. Test casts (`as unknown as GameState/CanvasRenderingContext2D`, `as Enemy`) are comment-justified, scoped to test doubles, and match the render.tube-glow.test.ts house pattern. No `as any` anywhere.
- **#3 enum exhaustiveness:** drawEnemy `switch (e.kind)` (render.ts:358) has no `default: assertNever` — **PRE-EXISTING** (tp1-30 edited case bodies only, added/removed no case). DISMISSED for this story (not a regression); recorded as a Delivery Finding for a future story.
- **#4 `??` vs `||` / falsy-0:** COMPLIANT across paletteBank, paletteColor, starColor, resolveWellColor. Slot 0 is NOT swallowed (`Number.isFinite(slot) ? clamp : 0` returns 0 for slot 0 correctly); zapFlash 0 treated as active (`!= null`). Verified by the AC4 slot-0 test and rule-checker #4.
- **#5 module/type imports:** COMPLIANT — inline `type` modifiers, namespace imports NOT `import type` (called at runtime).
- **#10 input validation:** COMPLIANT — level/slot defensively `Number.isFinite`-validated; the AC6 `JSON.parse` reads a trusted local fixture with `Record<string, unknown>`, matching the citations.test.ts house pattern.
- **core/shell boundary (CLAUDE.md):** COMPLIANT — diff touches only src/shell + tests/shell; grep confirms no Math.random/Date.now/performance.now/new Date() introduced; no core file in the diff.
- **citation gate (CLAUDE.md):** COMPLIANT — V-019/DB-017 `remediated_by: tp1-30`; reanchor reports 0 lost; citations 12/12 green on clean runs.

### Devil's Advocate

Assume this code is broken. Where does it fail? First, the starfield: `drawStarfield` is a private function that the test suite never calls. Its one job for this story — feed `s.level` and the per-plane index into `starColor` — is guarded by NOTHING. The test-analyzer mutated `paletteHex(starColor(level, i))` to `starColor(1, i)` and the entire 1128-test suite stayed green. So a careless refactor that hardcodes the wave, or swaps `i` for `plane.picture`, ships a starfield that is permanently bank-0 or wrongly-indexed, and no gate fires. The story's own header brags that it kills tp1-12's "mutation-gameable" coverage — yet it recreates that exact hole for its own DB-017 deliverable. That is not a hypothetical; it is a demonstrated, reproducible gap.

Second, a confused maintainer reading the AC4 NaN-survival test (line 317) would believe the resolvers are proven crash-safe on bad input — but the test only asserts `.not.toThrow()` through optional chaining, so if `starColor` or `resolveWellColor` were ever deleted, the `?.()` silently returns `undefined`, the assertion passes, and the "guard" evaporates. It never checks that `flipperGlyph(NaN)` actually returns bank-0 red — only that it doesn't explode. Third, a stressed render path: the flipper WIRING test compares `lo[0]` to `hi[0]` but never checks `hi.length > 0`; a regression that dropped wave-17 strokes to zero would make `hi[0]` undefined, and `'#ff2f4f' !== undefined` passes — masking the very regression the test exists to catch. Fourth, the starfield plane-index shift: because `starfield.planes` compacts on retire, a live plane's colour changes when an older plane retires ahead of it — a colour flicker the ROM (fixed PLANEY slots) never shows; TEA documented this as accepted eye-candy, and it is non-blocking, but it is a real fidelity nuance a playtest should confirm reads acceptably. None of these are data-corruption or security holes — this is a pure client-side rendering change with no untrusted input — but the first three are coverage failures on a story whose entire reason for existing is coverage integrity.

### Reviewer (audit) — Deviation Audit

- **TEA: dormant pulsar per-bank (slot 4), pulsing white (slot 0)** → ✓ ACCEPTED by Reviewer: independently byte-verified against the ROM — ALCOMN.MAC:357-368 (WHITE=0, PURPLE=2, RED=3, TURQOI=4, BLUE=6 are COLRAM SLOT indices; FLICOL=RED, TANCOL=PURPLE), ALDISP.MAC:861-867 (PULPIC `LDA I,WHITE`/`LDA I,TURQOI` → `STA COLOR`). PULPIC selects slots, both resolved through the bank. The ruling is correct and the "white/cyan" AC wording is bank-0's instance. Sound.
- **Dev: re-seated Story 6-8 glyphs.test.ts to level-keyed signatures (level 1)** → ✓ ACCEPTED by Reviewer: forced by the contract change (tsc type-checks tests); bank 0 == the historic constants, so intent is preserved. Confirmed by rule-checker + preflight (glyphs.test.ts green).
- **Dev: corrected tanker-body bank-3 golden literal (green → purple)** → ✓ ACCEPTED by Reviewer: COLTAB bank 3 slot 2 IS ZPURPL (verified against the tp1-12-pinned table); the RED literal was a transcription slip and the table-derived assertion already proved the impl. A correction toward the ROM, not a weakening.
- **Dev: remediated_by V-004/DA-014/DA-016 (reversing the TEA "reanchor" note)** → ✓ ACCEPTED by Reviewer: mechanically necessary — tp1-30 changes the EXACT lines these three CONFIRMED findings cite, so their quote text is gone and reanchor cannot re-home them (reanchor only fixes line SHIFTS for surviving text). `remediated_by` freezes the old quote as accurate history; the ROM `source` side stays checked; reanchor reports 0 lost. The reversal is correct given the checker mechanics.

## Round 1 Review Verdict (REJECTED — superseded by the Round 2 APPROVED verdict below)

**Verdict:** REJECTED

The implementation is correct and every mechanical gate is green (1128/1128, tsc, citations, ROM slots byte-verified). But the story's defining purpose — eliminate mutation-gameable coverage — is violated on its own DB-017 starfield deliverable, and the new suite carries two further test-quality gaps. These are all testable/coverage issues, so this returns to TEA for a rework of the tests (the production code is sound and does not need to change for the blocker, though the starfield guard likely needs `drawStarfield` exported or a pure `starPlaneHex` extracted).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [TEST] | Starfield wiring is untested and mutation-proven gameable — `starColor(level, i)` → `starColor(1, i)` leaves all 1128 tests green. The story's core DB-017 deliverable has the exact gameable-coverage hole the story exists to eliminate (well got `resolveWellColor`, enemies got the drawEnemy WIRING test; the starfield got neither). | `src/shell/render.ts:194` (`paletteHex(starColor(level, i))`); no covering test | Export `drawStarfield` OR extract a pure `starPlaneHex(level, planeIndex)` and unit-test it; add a recording-ctx WIRING test asserting the star `fillStyle` differs by level (mirror the drawEnemy WIRING test) so hardcoding the level/index fails a test. |
| [MEDIUM] [TEST] | The AC4 "resolvers survive a non-finite level" test asserts only `.not.toThrow()` through `?.` optional chaining — vacuous in isolation (a deleted export would silently no-op); never checks the NaN fallback VALUE. | `tests/shell/tp1-30.palette-enemies-starfield.test.ts:317` | Call the resolvers directly (no `?.`) and assert the concrete bank-0 fallback (e.g. `flipperGlyph(NaN)[0].color === 'red'`, `starColor(NaN, 3)` returns a ROM colour). |
| [LOW] [TEST] | Flipper WIRING test compares `lo[0]` vs `hi[0]` but never guards `hi.length > 0`; zero wave-17 strokes would make `hi[0]` undefined and pass trivially. | `tests/shell/tp1-30.palette-enemies-starfield.test.ts:404` | Add `expect(hi.length).toBeGreaterThan(0)` (the tanker WIRING test already guards both sides). |

**Dispatch tags:** [TEST] 3 confirmed (above). [RULE] 1 dismissed — drawEnemy `switch` lacks `default: assertNever` (render.ts:358), pre-existing and out of scope for tp1-30 (case structure untouched); filed as a Delivery Finding. [SEC] clean — no security surface; guards close the crash path (one informational, unreachable `resolveWellColor` negative-zapFlash note, out of AC4 scope). [EDGE] not run (disabled) — guard boundaries covered by rule-checker #4 + security. [SILENT] not run (disabled) — no swallowed errors; guards return valid fallbacks by design. [DOC] not run (disabled) — pulsar + flicker comments spot-verified accurate. [TYPE] not run (disabled) — asGlyphColor narrowing + PaletteColor split confirmed sound by rule-checker #1. [SIMPLE] not run (disabled) — asGlyphColor's dead `black` branch is a required TS narrowing (accepted), `forEach` is same-cost.

**Data flow traced:** `s.level` (sim GameState) → drawEnemy → flipperGlyph/tankerGlyph/pulsarColor → paletteColor(level, slot) → COLTAB_BANKS[clamp][clamp] (safe: both indices clamped, verified). Starfield: `s.level` → drawStarfield (call-site pinned by WD-013) → starColor(level, i) → paletteColor (safe) — but the drawStarfield→starColor link is untested (the blocker).

**Handoff:** Back to TEA for test rework (RED).

## TEA Assessment — Rework Round 1

**Tests Required:** Yes (rework of the 3 Reviewer findings — all [TEST])
**Status:** RED — 2 failing / 1128 passing (full suite 1130 tests; RED isolated to the two new starfield-wiring tests).

**What I changed (tests only; no source change needed from TEA):**
- **[HIGH] starfield wiring guard (finding 1):** added `describe('WIRING — drawStarfield threads level + plane index …')` — populates the module-global starfield via the exported `advanceStarfield`, strokes it onto a recording ctx at wave 5 vs wave 21, and asserts (a) ≥2 distinct plane hues at wave 5 (index wired) and (b) wave 5 ≠ wave 21 pixels (level wired). **RED because `drawStarfield` is not exported** — Dev's GREEN is to add `export` to `function drawStarfield` (render.ts:178); no other code change.
  - **Mutation-proved it bites** (serial, no subagents live): with `drawStarfield` temporarily exported — correct code → PASS; `starColor(level,i)→starColor(1,i)` → FAIL (level assert); `starColor(level,i)→starColor(level,0)` → FAIL ("expected 1 to be >= 2", index assert). Reverted render.ts. This closes the exact mutation-gameable hole the Reviewer found.
- **[MEDIUM] NaN-survival test (finding 2):** replaced the `.not.toThrow()` + `?.` assertions (vacuous in isolation) with concrete fallback-VALUE checks — `flipperGlyph(NaN)[0].color === 'red'`, tanker body `=== 'purple'`, `pulsarColor(NaN,false) === 'cyan'`, `starColor(NaN,3)` ∈ ROM palette, `resolveWellColor(NaN,null)` matches a hex. Called directly (no `?.`).
- **[LOW] flipper WIRING (finding 3):** added `expect(hi.length).toBeGreaterThan(0)` so the wave-17 side can't be vacuously undefined.

**Dev notes (The Word Burgers):** the ONLY production change is `export function drawStarfield` (render.ts:178). That call site is WD-013's citation verbatim (`drawStarfield(pctx, W, H, s.level)`) — adding `export` to the DEFINITION does not touch the call site, so no citation churn. Run the suite; all 1130 should go green.

**Handoff:** To Dev for GREEN (one-word export).

## Dev Assessment — Rework Round 1

**Implementation Complete:** Yes

**Files Changed:**
- `src/shell/render.ts` — added `export` to `function drawStarfield` (line 178). One word. No signature/behaviour change, so the WD-013 call-site citation (`drawStarfield(pctx, W, H, s.level)`) is untouched — reanchor not needed, citations stay green.

**Tests:** 1130/1130 passing (GREEN). The two rework RED tests (starfield wiring) now pass; TEA's mutation-proof confirmed they catch a hardcoded level or index. `tsc --noEmit` clean · `vite build` OK.

**No deviations from spec.** No new upstream findings.

**Handoff:** To Reviewer.

## Subagent Results

_Round 2 (re-review of the rework). Rework delta since Round 1: `src/shell/render.ts` +1 (`export function drawStarfield`) and the tp1-30 test file (3 findings)._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1130/1130 green, tsc clean, citations 12/12, diff scoped to the 2 expected files, zero smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | clean | 0 | All 3 Round-1 findings verified RESOLVED by independent mutation (starColor(1,i) and starColor(level,0) both fail); no new vacuous assertions |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — exporting a pure render helper adds no security surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (Round 1) | findings | 1 (pre-existing) | Carried forward — the only production delta is one `export` keyword (a correct runtime-used named export, lang-review #5 compliant); no new type surface, Round-1 verdict holds |

**All received:** Yes (3 re-run this round, 1 carried forward, 5 disabled)
**Total findings:** 0 new; the 3 Round-1 [TEST] findings are all RESOLVED and mutation-verified.

### Rule Compliance

- **#5 module/export (the one production change):** `export function drawStarfield` — a named export consumed at runtime by the WIRING test (`Render.drawStarfield(...)`), correctly NOT `export type`; no `.js`-extension issue (bundler resolution). COMPLIANT.
- **#8 test quality:** the new `WIRING — drawStarfield threads level + plane index` block is behavioural and non-vacuous — mutation-proven to fail on a hardcoded level OR index. The tightened AC4 test asserts concrete fallback VALUES (no bare `.not.toThrow()`/`?.`). The added `hi.length` guard removes the vacuous-compare risk. COMPLIANT.
- All Round-1 rule verdicts (asGlyphColor narrowing, `??`/falsy-0 guards, core/shell purity, citation gate) are unchanged by the rework and stand.

### Devil's Advocate

Assume the rework is broken. The new starfield WIRING test drives `drawStarfield`, which reads the module-global `starfield` singleton — so is the test deterministic and isolated? It populates the field via 40 `advanceStarfield(1/ROM_FPS)` calls. If a sibling test in the same file had already advanced or reset that singleton, the plane count could differ — but vitest isolates the module graph per test FILE, and no other block in this file touches the starfield, so the singleton starts empty and the population is deterministic (no RNG in `starfield.ts`; z-lifecycle is pure arithmetic). Could the two `starStyles` calls see DIFFERENT planes and produce a false `not.toEqual`? No — `drawStarfield` only reads `planes.forEach`, it never mutates, and I do not advance between the wave-5 and wave-21 calls, so both stroke the identical plane set; the arrays can differ ONLY by the level-keyed hue. Could the `≥2 distinct hues` assertion pass vacuously if only one plane exists? Only if the population produced <2 planes — but 40 ROM frames reaches steady-state ~8 planes (indices 0-7), and the `at5.length > 0` guard plus the `.size >= 2` assertion would both fail loudly on an empty/degenerate field, which is the correct RED, not a false green. I re-ran the level-hardcode mutation myself: it fails (1 failed), and reverting restores 2 passed with a clean tree — so the guard is not merely green-as-written, it BITES. The one residual risk I can name is the plane-index-compaction flicker (already a logged non-blocking Question) and the invisible-well-wave stars going black (logged Question) — both cosmetic, warp-only, and flagged for playtest; neither is a correctness defect. There is no data path from untrusted input, no error-handling surface, and no concurrency. The rework is sound.

### Reviewer (audit) — Round 2

- No new Design Deviations were logged in the rework (Dev: "No deviations from spec"), and none are undocumented — the rework was test-only plus a one-word export, both within the Round-1-accepted approach. All four Round-1 deviation stamps (pulsar per-bank ruling, sibling re-seat, tanker-golden correction, remediated_by reversal) remain ✓ ACCEPTED and unchanged.

## Reviewer Assessment

**Verdict:** APPROVED

The Round-1 rejection was for a single mutation-proven-gameable gap — the starfield wiring, the story's own DB-017 deliverable, left unguarded against the exact regression the story exists to prevent. The rework closes it with a real behavioural guard (independently mutation-verified to fail on a hardcoded level AND a hardcoded index), and tightens the two lesser test-quality findings. All mechanical gates are green (1130/1130, tsc, `vite build`, citations 12/12), and the ROM slot assignments were byte-verified against the source in Round 1 (FLICOL=3, TANCOL=2, WHITE=0, TURQOI=4, BLUE=6).

**Dispatch tags:**
- [TEST] — all 3 Round-1 findings CONFIRMED RESOLVED and mutation-verified (test-analyzer clean; I re-ran the level-hardcode mutation myself → fails → reverts green).
- [RULE] — one carried-forward pre-existing dismissal (drawEnemy `switch` lacks `default: assertNever`, render.ts:358; out of scope, filed as a Delivery Finding); the rework's `export` is lang-review #5 compliant.
- [SEC] — clean; exporting a pure render helper adds no security surface (no untrusted input, no new cast).
- [SIMPLE] — no unnecessary complexity added; the WIRING test reuses the existing recording-ctx pattern.
- [EDGE] — not run (disabled); the guard boundaries (non-finite level, out-of-range slot, plane `& 7` mask) were verified compliant in Round 1 and are unchanged.
- [SILENT] — not run (disabled); no swallowed errors — the tightened NaN test now asserts fallback VALUES, so a silent no-op fails loudly.
- [DOC] — not run (disabled); the new test's header comment accurately describes the guard's purpose (spot-verified).
- [TYPE] — not run (disabled); no new type surface beyond a visibility change (confirmed by rule-checker #5).

**[VERIFIED] the starfield wiring is now guarded** — evidence: mutating `src/shell/render.ts` `starColor(level, i)` → `starColor(1, i)` fails `tests/shell/tp1-30.palette-enemies-starfield.test.ts` "drawStarfield threads level + plane index"; reverting → green, tree clean. Complies with lang-review #8 (behavioural, non-vacuous test).
**[VERIFIED] the AC4 fallback test is non-vacuous** — evidence: it now calls `flipperGlyph(NaN)`/`pulsarColor(NaN,false)`/`Render.resolveWellColor(NaN,null)` directly and asserts `'red'`/`'cyan'`/a hex (test file lines ~318-327). Complies with lang-review #8 (no `?.`-masked no-op).

**Data flow traced:** `s.level` (sim GameState) → drawStarfield (call-site pinned by WD-013) → starColor(level, i) → paletteColor(clamped bank, clamped slot) → COLTAB_BANKS — now guarded end-to-end by the WIRING test.
**Error handling:** non-finite level and out-of-range slot are clamped (never throw/undefined); verified by the AC4 guard tests and the security guard-completeness audit.

**Handoff:** To SM for finish-story.