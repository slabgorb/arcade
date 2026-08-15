---
story_id: "df3-2"
jira_key: "df3-2"
epic: "df3"
workflow: "tdd"
---
# Story df3-2: World-wrap coordinate model + camera slide (the epic's riskiest seam)

## Story Details
- **ID:** df3-2
- **Jira Key:** df3-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Assignee:** slabgorb
- **Repos:** arcade
- **Branch:** feat/df3-2-world-wrap-camera-slide
- **PR:** #425 (code, feat → develop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T18:23:34Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T17:40:48Z | 2026-08-15T17:43:01Z | 2m 13s |
| red | 2026-08-15T17:43:01Z | 2026-08-15T17:55:47Z | 12m 46s |
| green | 2026-08-15T17:55:47Z | 2026-08-15T18:05:37Z | 9m 50s |
| review | 2026-08-15T18:05:37Z | 2026-08-15T18:23:34Z | 17m 57s |
| finish | 2026-08-15T18:23:34Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA/RED] AC6 constants are NOT yet enrolled in `claims/*.json`.** Grepping
  `plugins/defender/docs/rom-study/claims/` for the world constants (`YMIN`, `YMAX`,
  `BGL`, `BGLX`, `BGDELT`, `PLABX`, the `$20`/`$70`/`$40`/`$100` slide values) finds
  ONLY `YMAX` — and only incidentally, inside `02-dialect.json`'s radix example
  (`"YMAX\tEQU\t240"`). So GREEN must ADD claim entries for every constant `world.ts`
  introduces or `tests/audit/citations.test.ts` reddens (it byte-verifies each claim's
  `source.{file,line,verbatim}` against the vendored ROM). Verified verbatim lines to
  cite: `PHR6.SRC:21` = `YMIN\tEQU\t42\tMIN Y COORD`, `PHR6.SRC:20` = `YMAX\tEQU\t240`,
  `PHR6.SRC:215` = `BGL\tRMB\t2\tTERRAIN LEFT POINTER`, `PHR6.SRC:216` =
  `BGLX\tRMB\t2\tOLD TERRAIN LEFT`, `PHR6.SRC:335` = `PLABX\tRMB\t2`, `DEFA7.SRC:2385`
  = `LDA\t#$20\t+BASE`, `DEFA7.SRC:2389` = `LDA\t#$70\t-BASE`, `DEFA7.SRC:2402` =
  `LDD\t#$40`, `DEFA7.SRC:2400` = `CMPD\t#$100\tIN RANGE?`.

- **Gap** (non-blocking): `df3-2`'s `clampPlayerY` models the player-Y band as a stateless
  clamp to `[YMIN+1,238]` (AC5), but the ROM's real vertical MOTION (PLAUP/PLADN/PYV1,
  `defender/DEFA7.SRC:2441-2476`) FREEZES on the pre-move Y and adds velocity with no
  post-add clamp, so a ±$200 step can overshoot to `Y=YMIN(42)` and freeze there — a
  reachable state the clamp would not preserve. Affects `plugins/defender/src/core/ship.ts`
  (df3-3, which owns the vertical-motion integration): df3-3 should reproduce the
  freeze/overshoot dynamics rather than post-hoc-clamping `oldY+velocity` through
  `clampPlayerY`, or the boundary will disagree with the ROM by up to ~2px.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Corrected a wrong expected value in the RED negative-clamp test (`-$300` → `-$200`)**
  - Spec source: `plugins/defender/tests/world.test.ts`, "clamps plaxv to −$100" test (TEA/RED)
  - Spec text: RED pinned `slide({plaxv:-0x0300,facing:'right',plax16:0x2000}).bgl === 0x0000`
  - Implementation: changed the input to `plaxv: -0x0200`; expectations (`plaxv=-0x100`, `bgl=0`) unchanged
  - Rationale: the test's INTENT is to isolate the ±$100 velocity clamp with no slide (BGDELT 0).
    That requires `targetColumn(plaxv,'right')` to be the bare base `$2000` so `diff==0`. But the
    sign-gate in PLAY1 (DEFA7.SRC:2386-2393) tests the COLUMN BYTE after the ASRA/RORB/CLRA/ASRB
    shifts, not the raw velocity sign. For `-$300` that byte is POSITIVE (`0x20`), so facing-right
    does NOT clear it → `targetColumn(-0x300,'right')=0x4000` → `diff=0x2000` → a `+$40` slide, so
    the pinned `bgl=0x0000` is unreachable by ANY faithful port (it would be `0xFEC0`). `-$200`'s
    column byte is negative (`0xC0`) → cleared → bare base → `diff=0` → clamp isolated cleanly.
  - Severity: minor (test-only correction; the constant it pins — the −$100 clamp — is unchanged
    and still verified, now by a non-self-contradictory input)
  - Forward impact: none — no production behaviour or sibling story assumption changes; the other
    21 tests are untouched. It reinforces the df3-2 lesson that the velocity column's sign is a
    post-shift property, not the raw velocity direction.

## Sm Assessment

**Setup complete — handing off to TEA (Leeloo) for the RED phase.**

**Story:** df3-2, 5pt, defender, tdd, p2. The world-wrap coordinate model + camera
slide — the epic's self-declared riskiest seam. Predecessor df3-1 (scheduler core) is
`done` and `scheduler.ts` is on disk; df3-3 (ship) depends on this one.

**Board check (sibling probes, before setup):** clean. `git fetch --prune` + `git
branch -r | grep df3-2` showed no remote branch; the only live sibling session is a-3
on `ml9-2` (millipede, different game). No contention on `plugins/defender/`.

**Context is Architect-authored — protected, not regenerated.** A hand-authored,
anchor-verified `sprint/context/context-story-df3-2.md` (committed on develop, md5
`e2d5d14d53c30c6fb51e0d71c18b9543`) already existed. I passed `sm-setup` an explicit
DO-NOT-REGENERATE override and verified afterward: `context_file_touched: false`, md5
unchanged on disk, clean git status. Its Acceptance Criteria and Technical Approach are
authoritative; the epic YAML's `acceptance_criteria: null` is deliberate (ACs live in
the context file — do NOT derive new ones).

**For TEA:** The single load-bearing trap is **routing != geometry** — pin the
COORDINATES of the camera slide, not just "did it scroll?". The context's ACs already
name the exact pins: `BGL` after N ticks of a known thrust; target screen column
`$20`-base facing-right vs `$70`-base facing-left; `BGDELT ±$40` step / `±$100` window
mutants must redden; the two vertical rules (player Y CLAMP `[YMIN+1,238]` vs object Y
WRAP `[YMIN,YMAX]`, `YMIN=42`/`YMAX=240` decimal) both pinned; every constant backed by
a `claims/*.json` entry that `citations.test.ts` byte-verifies; `purity.test.ts` stays
green. The Architect's verified anchors are in the context footer — re-pin at RED
against the current tree, and expect a Reviewer mutation battery over the slide math.

**Claim pushed:** branch `feat/df3-2-world-wrap-camera-slide` pushed (commit `06bd42c5`,
status stamped `in_progress`) so any sibling probe lights up.

## Tea Assessment

**RED complete — handing to Dev (Korben) for GREEN.** One new file:
`plugins/defender/tests/world.test.ts` (commit `49d0d4d2`), 22 coordinate-exact tests,
all failing with the self-describing `loadWorld()` shim (`Cannot find module
'/src/core/world.js'` → "not built yet" error). RED verified DIRECTLY (not just via
testing-runner, which confabulated the total): `npx vitest run --project defender` →
**`Tests 22 failed | 326 passed (348)`, `Test Files 1 failed | 18 passed`**. `world.test.ts`
is the ONLY failing file; every other defender suite stays green.

**Every anchor re-pinned at RED against the current tree** (TEA's job — the Architect's
footer held): `PHR6.SRC:20` `YMAX EQU 240`, `:21` `YMIN EQU 42`, `:215` `BGL … TERRAIN
LEFT POINTER`, `:216` `BGLX … OLD TERRAIN LEFT`, `:335` `PLABX RMB 2`; `DEFA7.SRC:2385`
`LDA #$20 +BASE`, `:2389` `LDA #$70 -BASE`, `:2400` `CMPD #$100`, `:2402/2409` `#$40/#-$40`,
`:2421-2428` velocity clamp, `:2429-2431` `ADDD BGL / SUBD BGDELT / STD BGL`,
`:2450/2461` player clamp, `:2490-2496` object wrap.

### The API contract this suite pins (Dev builds `src/core/world.ts` to match)

The context/spec ruled the MODEL but left the TS signature open; RED commits it (mirrors
`scheduler.ts` style — pure functions, no clock, no surface):

```ts
export type Facing = 'right' | 'left'            // PLADIR sign; BMI (negative) = left
export const YMIN = 42, YMAX = 240               // DECIMAL (PHR6.SRC:20-21)
export function wrap16(x: number): number        // 16-bit cylinder; handles x<0 (→ high end)
export function worldX(onscreenX: number, bgl: number): number      // (onscreen+bgl) wrap16
export function targetColumn(plaxv: number, facing: Facing): number // PCX (PLAY1)
export function clampPlayerY(y: number): number  // → [YMIN+1, 238]
export function wrapObjectY(y: number): number   // single-step wrap on [YMIN, YMAX]
export interface SlideResult { bgl; bglx; plax16; bgdelt; plaxv }   // all numbers
export function slide(input: { bgl; plax16; plaxv; facing: Facing }): SlideResult
```

### Traps Dev must not step on (all pinned, so a wrong choice reddens)

1. **`targetColumn` velocity column is SIGN-GATED** (DEFA7.SRC:2386-2393): the column
   applies ONLY when `facing` agrees with the velocity sign; when they disagree the
   column is CLEARED (`CLR PCX`) and the target is the bare base. Pinned:
   `targetColumn(+$100,'left')=$7000`, `targetColumn(-$100,'right')=$2000`. The exact
   forward-lead magnitudes (`+$100,'right'→$4000`; `-$100,'left'→$5000`) are hand-traced
   through the ASRA/RORB/CLRA/ASRB shift block — **the derivation is in the test comment
   above each assertion**; audit it against `DEFA7.SRC:2373-2396` rather than trusting me.
2. **The slide window is ASYMMETRIC** (the load-bearing mutant): `diff == +$100` is IN
   range (no slide, `BLS`); `diff == -$100` is OUT of range (DOES slide `-$40`, `BGT`).
   Both boundaries pinned, plus one-past on each side.
3. **In range, `plax16` SNAPS to the target `PCX`** (PV9 `LDD PCX / STD PLAX16`), it does
   NOT keep the input; out of range it steps by `±$100` off the INPUT.
4. **Two vertical rules, never one shared helper** (guardrail 2): `clampPlayerY` and
   `wrapObjectY` are pinned to DIFFER at the same input (41 → 43 vs 240; 250 → 238 vs 42).
5. **`YMIN/YMAX` are decimal** — a re-radixed `$42/$240` fails the constants test.
6. **AC6/AC7 are the existing armed gates** — `purity.test.ts` reddens if `world.ts`
   touches a clock/surface; `citations.test.ts` reddens until every new constant is
   enrolled in `claims/*.json` (see the Delivery Finding above for the verbatim lines).
   NOT duplicated in `world.test.ts` (the scheduler/framebuffer precedent).

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

- **#8 Test quality** — every test asserts an exact `.toBe(coordinate)` on a real
  return; no vacuous `is-some`/`assert(true)`, no `let _ =`.
- **#18 fails-by-passing** — the `loadWorld()` shim guarantees RED means feature-absence;
  distinct-value assertions (e.g. `$2000` vs `$7000`, two durations of the slide) mean a
  fixed/echo stub cannot satisfy them.
- **#20 / #26 no self-reference** — every expected value is derived from the ROM
  (`DEFA7.SRC`/`PHR6.SRC`), never from `world.ts` (which the same diff would create);
  terms are ROM constants, not test-locals.
- **#21 degenerate-but-not-nullish geometry** — boundaries pinned exactly: `wrap16` at
  `$10000` and at `-1`; slide `diff` at `±$100` and one-past; `clampPlayerY`/`wrapObjectY`
  at `YMIN`/`YMAX` and one-outside.
- **#29 ordering-standing-in-for-magnitude (== routing≠geometry, guardrail 1)** — the
  whole suite pins MAGNITUDES (exact `BGL` after N ticks, exact `targetColumn`, exact
  `bgdelt`), never a `scrolled-in-some-direction` proxy.

### For the Reviewer (mutation battery expected on the slide)

The mutants are pre-pinned: flip `BLS`↔`BLT` (the `+$100` boundary), `BGT`↔`BGE` (the
`-$100` boundary), drop the `SUBD BGDELT`, drop the `+ plaxv` integration, widen the
`±$100` velocity clamp, share one Y helper across both axes, re-radix `YMIN/YMAX`. Each
already has a red-on-mutation test. The residual soft spot is the exact nonzero-velocity
`targetColumn` magnitudes (`$4000`/`$5000`) — verify those against the shift-block trace
in the source, since they're the one place a wrong golden could hide.

## Dev Assessment

**GREEN complete — ready for Reviewer (Zorg).** Two new files + one test correction:

- **`plugins/defender/src/core/world.ts`** (new) — the pure, clock-free world/camera
  model. `wrap16`, `worldX`, `targetColumn` (PLAY1 velocity→column), `slide` (PLAY1
  camera update), `clampPlayerY`, `wrapObjectY`, and the `YMIN`/`YMAX` constants. Every
  routine cites its `defender/<FILE>.SRC:<line>` in a comment; the 6809 shift math
  (`asr16`/`asr8Byte`/`isNegByte`) is transcribed as behaviour.
- **`plugins/defender/docs/rom-study/claims/10-world.json`** (new) — the AC6 constant
  enrollment: `WD-1..WD-8` covering `YMIN`(42)/`YMAX`(240) decimal, `BGL`/`BGLX`,
  base `$20`/`$70`, slide window `$100`, slide step `$40`. `loadClaims()` globs the whole
  `claims/` dir, so these are picked up and byte-verified automatically by
  `citations.test.ts` — no wiring needed. `purity.test.ts` and `citations.test.ts` are
  the AC6/AC7 gates; both green with the new file present.
- **`world.test.ts`** — one input corrected (`-$300` → `-$200`); see the Dev deviation.
  This was a real RED bug: the pinned `bgl=0` was unreachable by any faithful port
  because `-$300`'s velocity column is positive, so it slides. `-$200` isolates the clamp.

**Verification (run directly — evidence, not assertion):**
- `npx vitest run --project defender` → **`349 passed (349)`, `Test Files 19 passed`**
  (world.test.ts 22/22; purity gained + passed one case for world.ts; citations green).
- `npm run lint` (`tsc --noEmit`, repo-wide) → **clean, zero errors**.
- `npx vitest run` (full cabinet) → **`16615 passed | 1 todo (16616)`, 1093 files**, no
  regressions in any sibling game.

**Minimalism:** no scheduler dependency (world.ts is a standalone pure module, as the
context ruled — df3-3 wires the ship process to it); no `@shared` extraction (no second
consumer); no abstractions beyond what the 22 tests demand.

**For the Reviewer** — the ROM anchors and the mutation targets are in the TEA Assessment
above; the one place to spend scrutiny is the `targetColumn` shift-block trace behind the
`$4000`/`$5000` goldens (re-derive from `DEFA7.SRC:2373-2396`), and the boundary
asymmetry (`+$100` in-range via `>` on line ~181 of world.ts, `-$100` out-of-range via
`<=`). The `diff` uses a signed displacement rather than the ROM's BLO/CMPD unsigned
dance — equivalent for all in-screen `|diff| < $8000`, which is the only regime the ship
occupies; noted here so it's a conscious review point, not a hidden one.

Commits: RED test `49d0d4d2`, GREEN `e87466a3`, both pushed to
`feat/df3-2-world-wrap-camera-slide`.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | GREEN: 349/349, tsc clean, citations 28/28, purity 24/24, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (boundaries all pinned + mutation-proven) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no catch/swallow; pure total functions) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (mutation battery: 9/9 mutants killed) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (drove finding F3 comment fix) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (closed Facing union, readonly SlideResult) |
| 7 | reviewer-security | Yes | clean | none | Pure math, no surface; independently byte-verified all claims |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (minimal; no dead code / over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 1 (F3 substance → df3-3); 3 fixed in-round, 1 accepted-as-convention |

**All received:** Yes (3 enabled returned, 6 disabled pre-filled; disabled dimensions hand-covered)
**Total findings:** 4 confirmed, 0 dismissed, 1 deferred (F3 substance to df3-3)

## Reviewer Assessment

**Verdict:** APPROVED

The world-wrap coordinate model + camera slide is a faithful, mutation-proven port of the
ROM. The epic's riskiest seam is pinned as COORDINATES, not directions (guardrail 1); the
four confirmed findings were all minor and fixed in this round (or correctly deferred to
df3-3). Core correctness was verified INDEPENDENTLY, not on the author's testimony.

**Data flow traced:** `slide(input)` → pure `SlideResult` (numbers only) → consumed by
df3-3 (ship) / df3-4 (stars). No surface, no clock, no I/O — `purity.test.ts` scans
`src/core/world.ts` and passes. Safe because the module is total integer arithmetic.

**Pattern observed:** mirrors `plugins/defender/src/core/scheduler.ts` (df3-1) — cited
header, exported pure functions, `defender/<FILE>.SRC:<line>` comments. Consistent.

**Error handling:** none needed — total functions over `number`; JS `& 0xffff` coerces
any degenerate input to a finite 16-bit value. The `loadWorld()` `catch (e)` in the test
(`world.test.ts:115`) is the repo-wide RED-loader idiom (~15 sibling helpers).

### Independent verification (not the author's word)

- **Mutation battery — 9/9 mutants killed.** I mutated `world.ts` and confirmed each
  reddens ≥1 test: `>`→`>=` on the +$100 boundary (1), `<=`→`<` on the −$100 boundary (1),
  `- bgdelt`→`+ bgdelt` (2), base $20→$21 (5), slide-step $40→$41 (2), YMIN 42→0x42 (4),
  velocity clamp $100→$200 (2), drop the `+ plaxv` integration (3), share the two Y
  helpers (2). No surviving mutant on any load-bearing constant or boundary.
- **Independent ROM re-derivation** of the two nonzero `targetColumn` goldens
  (`$0100,'right'→$4000`; `-$0100,'left'→$5000`) by hand-tracing `defender/DEFA7.SRC:2373-2396`
  byte-by-byte — both correct. The matched-wrong-golden risk (same author wrote test +
  impl) is cleared.
- **rule-checker** independently cross-checked the slide boundaries against the ROM
  instruction-by-instruction; **security** independently byte-verified all claims.

### Findings (all from rule-checker; hand-covered dimensions clean)

[SEC] **No security findings.** `reviewer-security` returned clean: pure integer math,
no I/O / network / secrets / auth / injection surface; it independently byte-verified all
claims against the vendored ROM. `purity.test.ts` confirms no clock/entropy/browser
surface in `world.ts`. Nothing to confirm, dismiss, or defer.

[PRE] **Preflight clean.** `reviewer-preflight`: 349/349 defender, tsc clean, citations
28/28, purity 24/24, zero code smells.


[RULE] **F1 — citation prefix (minor).** `world.ts` had 18 bare `FILE.SRC:N` citations,
zero `defender/`-prefixed, the sole `src/core` outlier vs guardrail 6 + repo convention.
Confirmed by grep. **FIXED this round** (commit `865a406b`): all 18 prefixed, both files.

[RULE] **F2 — missing PLABX claim (minor).** The story's own RED contract said enroll
`BGL/BGLX/PLABX`; `10-world.json` had BGL/BGLX but not PLABX, though `worldX()` implements
it. Confirmed. **FIXED this round**: added WD-9 (`PHR6.SRC:335`), byte-verified green.

[RULE][DOC] **F3 — clampPlayerY freeze-vs-clamp (ROM fidelity; the substantive one).**
Verified against `defender/DEFA7.SRC:2441-2476`: PLAUP/PLADN freeze on the PRE-move Y and
add velocity with no post-clamp, so a ±$200 step can overshoot to Y=YMIN(42) and freeze
there — a state the stateless `[YMIN+1,238]` clamp would not preserve. BUT this is the
ship's VERTICAL MOTION, which the epic assigns to **df3-3** (`DEFA7.SRC:2441-2476`);
df3-2's `clampPlayerY` correctly implements AC5's stated `[YMIN+1,238]` band. **Comment
tightened this round** so it no longer asserts a "freeze" the clamp doesn't reproduce;
**substance DEFERRED to df3-3** as a Delivery Finding.

[RULE] **#11 — `catch (e)` cast without `instanceof` narrowing (nit, accepted).** Matches
lang-review #11 mechanically, but is the identical RED-loader idiom in ~15 sibling
`plugins/defender/tests/*.ts` helpers. Changing world.test.ts alone would make it the
inconsistent one. Non-blocking; accepted for consistency, not dismissed.

### Rule Compliance (lang-review typescript.md + df3 guardrails)

- **#3 enum anti-patterns** — `Facing` is a string-literal union (recommended over enum). PASS.
- **#8 test quality** — exact `.toBe()` assertions, no mocks, imports from `src/`. PASS.
- **#14 derived edges in one branch** — `slide`/`targetColumn` cover the whole domain via
  exhaustive if/else-if/else into a single return. PASS.
- **#29 ordering-for-magnitude (== guardrail 1)** — every pin is an exact coordinate,
  never an ordering proxy. PASS (explicitly compliant).
- **Guardrail 2 (two vertical rules)** — `clampPlayerY` ≠ `wrapObjectY`, pinned to differ.
  PASS. **Guardrail 7 (radix)** — YMIN/YMAX decimal, $-constants hex. PASS.
- **Guardrail 6 (citation format)** — was F1; now compliant.
- **Purity / citations (AC6/AC7)** — `purity.test.ts` + `citations.test.ts` green with
  world.ts + 9 claims present. PASS.

Tags with no findings from their (hand-covered) dimension: [EDGE] boundaries pinned &
mutation-proven — clean. [SILENT] no swallowed errors; total functions — clean. [TEST]
mutation battery 9/9 — clean. [TYPE] closed union + readonly result, no `any`/unsafe cast
— clean. [SIMPLE] minimal, no dead code — clean.

**Handoff:** To SM for finish-story.
## Impact Summary

**df3-2 — World-wrap coordinate model + camera slide — DONE.** The epic's riskiest seam,
shipped clean.

**Delivered:** `plugins/defender/src/core/world.ts` (pure, clock-free port of the ROM's
world/camera model — `wrap16` cylinder, `worldX`/PLABX, the ship-leads `targetColumn` and
`slide` with the `±$40`/`±$100` boundary-asymmetric camera math, the two vertical rules),
`docs/rom-study/claims/10-world.json` (9 byte-verified constant claims, WD-1..9), and
`tests/world.test.ts` (22 coordinate-exact, mutation-aware tests).

**Quality:** TDD RED→GREEN→review. Reviewer **APPROVED round 1**. Independent
verification: mutation battery **9/9 mutants killed**, independent byte-by-byte ROM
re-derivation of the nonzero `targetColumn` goldens (`$4000`/`$5000`), all 9 claims
byte-verified. Defender **349/349**, full cabinet **16616 green**, `tsc` clean.

**Findings (all minor, none blocking):** 4 confirmed by the rule-checker — citation
`defender/` prefix (fixed), missing PLABX claim WD-9 (fixed), `clampPlayerY` comment
overclaim (fixed), `catch(e)` cast (accepted — repo-wide idiom). One Dev deviation: a
self-contradictory RED test input corrected (`-$300`→`-$200`).

**Blockers:** none.

**Forward to df3-3:** `clampPlayerY` is a stateless band-clamp; the ROM's real vertical
motion (PLAUP/PLADN/PYV1, `defender/DEFA7.SRC:2441-2476`) freezes-with-overshoot (Y=YMIN
reachable). df3-3 owns that motion and should reproduce the freeze dynamics rather than
post-hoc-clamping through `clampPlayerY`. (Recorded as a Delivery Finding.)

**Merge:** PR #425 merged into develop (`--merge`, merge commit `ff6070d8`).
