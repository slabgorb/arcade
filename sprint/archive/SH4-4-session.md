---
story_id: "SH4-4"
jira_key: "SH4-4"
epic: "SH4"
workflow: "tdd"
---
# Story SH4-4: Extract the generic clamp(v,lo,hi) into the shared pure core

## Story Details
- **ID:** SH4-4
- **Jira Key:** SH4-4
- **Workflow:** tdd
- **Points:** 2
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** feat/SH4-4-extract-shared-clamp
- **PR:** https://github.com/slabgorb/arcade/pull/253 (MERGED into develop, merge commit a71569ef)

## Context Background

**Measured Premise (SM verified):**

The story extracts a generic 3-argument `clamp(v,lo,hi)` into `src/shared` (pure core). Verification confirms:

1. **No generic `clamp` exists in `src/shared` yet** — this is a genuine extraction, not already-satisfied.

2. **The four cited games each carry a generic 3-arg clamp, in three spellings — all present as claimed:**
   - `Math.max(lo, Math.min(hi, v))` nest — red-baron ×4: `core/returning-ace.ts:115`, `core/flight.ts:155`, `core/score-countup.ts:96`, `core/lives.ts:65`
   - `Math.min(Math.max(x, lo), hi)` — asteroids `core/rocks.ts:124`
   - ternary `v < lo ? lo : v > hi ? hi : v` — star-wars `core/gameRules.ts:130` AND missile-command `core/cursor.ts:66`
   - guarded NaN form `Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))` — red-baron `core/enemy.ts:379`

3. **NaN Divergence (DESIGN GATE input):** The three generic spellings ALL AGREE on NaN — every one returns `NaN` for `clamp(NaN,lo,hi)`. The ONLY divergence is red-baron `enemy.ts`'s guarded form, which returns `lo`. The DESIGN GATE must pick the NaN policy explicitly; red-baron `enemy.ts` is the sole site with an explicit `Number.isNaN(v) -> lo` intent, and the story recommends that guarded form. TEA should design the RED test against the right divergence: NaN-guarded vs. unguarded behavior.

4. **Out-of-Scope Fences (leave local, do NOT fold):** `clampVel` (asteroids/bullet), `clamp01` (battlezone/difficulty), `clampIndex` (tempest/glyphs), `clampAxis` (asteroids/ship, battlezone/sim), 1-arg `clamp(v)` (battlezone/input), and inline index-clamps (centipede/player, mc/score, star-wars/hud, star-wars/gameRules-adjacent). Fold ONLY the generic 3-arg form.

## Acceptance Criteria

- **AC-1:** Generic `clamp(v,lo,hi)` function added to `src/shared/` with explicit NaN policy (guarded form: `Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))`)
- **AC-2:** All four adopting games (red-baron, star-wars, missile-command, asteroids) import and use the shared clamp
- **AC-3:** Each adopting game's existing test suite remains green (determinism/render unchanged)
- **AC-4:** All shared clamp usage is pinned by shared tests (RED test covers the NaN policy and boundary behavior)
- **AC-5:** Out-of-scope clamp variants (clampVel, clamp01, clampIndex, clampAxis, 1-arg clamp, inline index-clamps) remain local

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-11T19:06:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T18:27:38Z | 2026-08-11T18:30:42Z | 3m 4s |
| red | 2026-08-11T18:30:42Z | 2026-08-11T18:37:39Z | 6m 57s |
| green | 2026-08-11T18:37:39Z | 2026-08-11T18:49:07Z | 11m 28s |
| review | 2026-08-11T18:49:07Z | 2026-08-11T19:06:56Z | 17m 49s |
| finish | 2026-08-11T19:06:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

### Reviewer (code review)
- **Improvement** (non-blocking): `stripComments` in `src/shared/tests/clamp-adoption.test.ts` is a naive `//` / `/* */` regex strip with no string/regex/template-literal awareness — the repo's documented lexer-leak pattern (`source-text-guard-lexer-leaks-use-ast`). Not exploitable against the 13 files it scans today (grep-checked), so left as-is; if these guards are reused or one of the scanned files gains a `//` inside a string/regex literal, switch to the TS compiler API. Affects `src/shared/tests/clamp-adoption.test.ts` (no change required now). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No deviations logged yet

### Reviewer (audit)
- Dev/TEA logged no deviations. One UNDOCUMENTED spec nuance surfaced and is now pinned: the story premise "the three spellings agree except on NaN" is not strictly true — for an **inverted range (lo > hi)** the `min-max` spelling (asteroids/rocks) returns `hi` while the shared `nest` form returns `lo`. Severity: **Low** — no adopted call site passes an inverted range (every range is an ordered MIN/MAX constant or `[0,1]`/`[-1,1]`, verified at each call site), so the extraction is behavior-preserving in practice. Pinned by a new `clamp.test.ts` describe so a future refactor toward the min-max spelling can't silently flip it. Not a blocking deviation; documented for the record.
- The fleet-wide NaN policy change (unguarded → guarded, NaN→lo) at the 7 previously-unguarded sites is the story's explicit DESIGN GATE decision, applied uniformly and pinned by the "SOLE divergence on NaN" test → ✓ ACCEPTED by Reviewer.

## Sm Assessment

**Story SH4-4** — extract the generic 3-arg `clamp(v,lo,hi)` into `src/shared` pure core. 2pt, tdd (phased), p3. Setup complete and routed to TEA for RED.

### Premise verified against the current tree (not just copied from the description)
- **No generic `clamp` exists in `src/shared` yet** — genuine extraction, not already-satisfied (grep of `src/shared` returns only prose/comments).
- **Four games carry a generic 3-arg clamp in three spellings, all present as claimed:**
  - `Math.max(lo, Math.min(hi, v))` — red-baron ×4: returning-ace.ts:115, flight.ts:155, score-countup.ts:96, lives.ts:65
  - `Math.min(Math.max(x, lo), hi)` — asteroids rocks.ts:124
  - ternary `v<lo?lo:v>hi?hi:v` — star-wars gameRules.ts:130 AND missile-command cursor.ts:66
  - guarded form `Number.isNaN(v)?lo:…` — red-baron enemy.ts:379
- **NaN refinement for the DESIGN GATE:** the description says the spellings "agree except on NaN." Strictly, the THREE generic spellings all AGREE on NaN (each returns NaN). The sole divergence is red-baron enemy.ts's guarded form (returns lo). TEA should design the RED test against the real divergence (NaN-guarded → lo vs. unguarded → NaN), and the DESIGN GATE picks the NaN policy explicitly — the story recommends the guarded form.
- **Out-of-scope fences verified distinct (leave local):** clampVel, clamp01, clampIndex, clampAxis, 1-arg clamp (battlezone/input), inline index-clamps. Fold ONLY the generic 3-arg form.

### Setup state
- Session, epic context, and story context written; ACs AC-1..AC-5 copied verbatim.
- Branch `feat/SH4-4-extract-shared-clamp` cut from current `develop` (gitflow; PRs target develop), claim committed and pushed — sibling probe `git branch -r | grep SH4-4` now lights up.
- Sibling probes at setup were clean (no rival branch, no live sessions). Story stamped `in_progress`.

**Next:** TEA (Tyr One-Handed) — RED phase.

## Tea Assessment

RED tests written and confirmed failing for the right reasons (commit `ab558e77`).

### Interface pinned by the RED tests (Dev must build to THIS)
- **New module:** `src/shared/clamp.ts` exporting `export function clamp(v, lo, hi)` (or `export const clamp =`). Imported as `@shared/clamp` — the `@shared/*` glob alias resolves a new file automatically, no registration in vite/vitest/tsconfig or `index.ts` needed (games import `@shared/<module>` directly, not through the barrel).
- **NaN policy (the design gate, AC-1):** the GUARDED form `Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))`. NaN -> `lo`. Byte-equivalent to red-baron `enemy.ts`, and equal to all three unguarded spellings (nest / min-max / ternary) on every finite input — the tests prove both halves.
- **Purity:** clamp is trivially DOM-free; `purity.test.ts`'s catch-all scans it automatically, so no PURE_SUBPATHS classification is required.

### Test files (both new, under the `shared` vitest project)
- `src/shared/tests/clamp.test.ts` — basic clamping, inclusive boundaries, degenerate lo===hi, negative ranges, ±Infinity, the NaN->lo policy (incl. "returns lo specifically, not 0/hi"), and a cross-spelling equivalence block that pins "agrees on all finite inputs, diverges ONLY on NaN". Currently a load-error RED (module absent); ~13 assertions activate on GREEN.
- `src/shared/tests/clamp-adoption.test.ts` — de-dup/wiring (AC-2): each of the 8 sites (red-baron returning-ace/flight/score-countup/lives/enemy, asteroids rocks, star-wars gameRules, missile-command cursor) must import `@shared/clamp` AND drop its local generic `clamp` definition. Plus the AC-5 fence: `clampVel`/`clamp01`/`clampIndex`/`clampAxis`/battlezone 1-arg `clamp(v)` stay local and are NOT exported by `@shared/clamp`.

### RED evidence
`npx vitest run --project shared clamp` → **18 failed / 6 passed**. The 6 green are the AC-5 fence guards (pass-on-arrival, must stay green). `clamp.test.ts` = "Cannot find module '../clamp'" (correct RED). No vacuous assertions (Phase C self-check done).

### GREEN checklist for Dev (Loki)
1. Create `src/shared/clamp.ts` with the guarded `clamp` (header-comment convention like `rng.ts`).
2. In all 8 sites: delete the local generic `clamp` def, add `import { clamp } from '@shared/clamp'`.
3. **AC-3 watch:** the 7 previously-UNGUARDED sites change NaN behavior from NaN->NaN to NaN->lo. Adoption is safe only where no NaN actually reaches those clamps. Run each game's suite (`npx vitest run --project <id>`) after swapping; if a game reddens on NaN, that game may need to keep a local unguarded clamp (log it as a Design Deviation rather than force it).
4. Leave the out-of-scope variants untouched.

### Rule Coverage
- No `.pennyfarthing/gates/lang-review/typescript.md` checklist applies beyond general test-quality (verified every test has a meaningful, flip-on-wrong-behavior assertion; no `let _ =`, no `assert(true)`, no always-None checks).
- Project rule — **pure-core boundary:** clamp lands in `src/shared` as a pure function; purity guard covers it (no new PURE_SUBPATHS entry needed).
- Project rule — **eligibility bar** (extract only proven cross-game duplication): SM verified 8 real duplicate sites across 4 games; the adoption test enforces the de-dup actually happens rather than just adding a parallel copy.

**Next:** Dev (Loki Silvertongue) — GREEN phase.

## Dev Assessment

GREEN. Implementation commit `bab7876a` (on top of RED `ab558e77`).

### What was built (minimal)
- **New module `src/shared/clamp.ts`** — one exported `clamp(v, lo, hi)` with the design-gate NaN policy: `Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))`. Header comment reworded to describe the fenced variants without spelling their exact identifiers (the AC-5 fold-check does a raw `includes` on the module text, so naming `clampVel`/etc. in a comment tripped it — see below).
- **Adopted across all 8 sites**, deleting each local generic copy and adding `import { clamp } from '@shared/clamp'`:
  red-baron `returning-ace.ts`, `flight.ts`, `score-countup.ts`, `lives.ts`, `enemy.ts`; asteroids `rocks.ts`; star-wars `gameRules.ts`; missile-command `cursor.ts`.
- **enemy.ts comment reframe (comment-only):** the NaN-totality note previously documented the *local* guarded implementation; reworded it to reference `@shared/clamp` while preserving every rb4-6/rb4-16 provenance pin. No test pins that text (grep-checked); red-baron suite re-verified green after the +1-line shift.
- Diff: 8 files, 10 insertions / 22 deletions — pure de-dup.

### Two RED-round fixes worth flagging for the Reviewer
1. **cursor.ts initially kept its local `clamp` alongside the new import** (I missed its deletion in the first pass) — a duplicate-identifier collision. Caught by the adoption test + would have failed lint. Fixed; lint now clean.
2. **AC-5 fold-check is a raw `shared.includes('clampVel'|…)`** on `clamp.ts` text — a legitimate doc-comment naming the variants trips it. Resolved by rewording the comment (not by weakening the test). The check remains meaningful against actually folding a variant's code.

### AC verification
- **AC-1** ✓ shared guarded clamp exists and exports only the generic form.
- **AC-2** ✓ all 8 sites import `@shared/clamp`, no local generic clamp remains (adoption test green).
- **AC-3** ✓ **full vitest 969 files / 14,659 passed, 0 failed**; orchestrator 463/0; `npm run lint` clean. The 7 previously-UNGUARDED sites now floor NaN→lo instead of leaking NaN — no game's suite observed a NaN reaching those clamps, so the fleet-wide guarded policy is behavior-preserving. **No design deviation needed.**
- **AC-4** ✓ shared tests pin NaN policy + boundaries + cross-spelling equivalence (`clamp.test.ts`, 39 tests across the two files green).
- **AC-5** ✓ fence guards green — `clampVel`/`clamp01`/`clampIndex`/`clampAxis`/battlezone 1-arg `clamp(v)` stay local and are not folded.

### For the Reviewer (Heimdall)
- Adversarial angle worth a look: is there any runtime path in the 7 unguarded-turned-guarded sites where NaN→lo (vs NaN→NaN) could change a *shipped* outcome the suite doesn't cover? The suites are green, but the behavior change is real by construction.
- The enemy.ts guarded copy was byte-equivalent to the shared one, so red-baron's NaN totality contract (rb4-6 R3) is preserved exactly.

**Next:** Reviewer (Heimdall) — review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (green: lint + 14659 vitest + 463 orch) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (compensated: Reviewer's own inverted-range/NaN-reachability pass) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (N/A — no error-handling surface in a pure clamp) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 4, dismissed 1, deferred 1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (N/A — fully-typed numeric signature, no type surface) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (N/A — no external input; internal numeric game state) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (compensated: Reviewer confirmed the extraction is already minimal) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (26 rules checked) | confirmed 1 (== test-analyzer #1), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 6 confirmed, 1 dismissed (with rationale), 1 deferred — **all 6 confirmed were FIXED in-session at user request** (commit `0501fbe5`).

### Finding disposition (all fixed in-review; verdict reflects post-fix tree)

| # | Src | Finding | Severity | Disposition |
|---|-----|---------|----------|-------------|
| A1 | [TEST][RULE] | `importsSharedClamp(read(site))` not comment-stripped — a commented-out import satisfied AC-2 (confirmed by 2 subagents + mutation) | Medium | FIXED — now `stripComments(read(site))`; verified rejects a commented import, accepts a real one |
| A2 | [TEST] | `definesLocalClamp` missed typed-const / `let` / `var` local redefs | Medium | FIXED — regex broadened to `(?:const\|let\|var)\s+clamp\s*[:=]`; verified catches typed-const/let, not `clampVel` |
| A3 | [TEST] | AC-5 fold-check `shared.includes(variant)` on raw text (fragile — the GREEN-phase comment collision) | Medium | FIXED — now `stripComments(read('src/shared/clamp.ts'))` |
| B1 | [TEST]+own | Inverted-range (`lo>hi`) behavior untested/unpinned (the one input where spellings diverged) | Medium | FIXED — new `clamp.test.ts` describe pins `lo>hi → lo` |
| C1 | [DOC] | `cursor.ts:92-97` comment stated the OPPOSITE of the guarded clamp's NaN behavior (introduced by this change) | Medium | FIXED — comment corrected to describe NaN→lo flooring |
| C2 | [DOC] | `enemy.ts` reframed NaN-totality comment orphaned above `levelIndex` (introduced by the reframe) | Low | FIXED — relocated to the `step()` clamp it describes |
| A4 | [TEST] | `stripComments` naive (no string/regex-literal awareness) | Low | DEFERRED — not exploitable today; filed as non-blocking Delivery Finding |
| D1 | [TEST] | "matches enemy.ts guarded intent" test near-redundant; no `-0` case | Low | DISMISSED — not vacuous (would catch a divergent NaN-branch edit) and harmless; `-0` normalizes via `Math.max(+0,-0)` |

### Rule Compliance (TypeScript lang-review checklist, `.pennyfarthing/gates/lang-review/typescript.md`)

Enumerated every applicable rule against the changed `.ts` files (rule-checker cross-verified all 26; corroborated here):
- **#1 Type-safety escapes** — 11 files, 0 violations: no `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, or `!` anywhere in the diff. `[VERIFIED]` — `src/shared/clamp.ts:22` is a plain typed numeric expression.
- **#2 Generic/interface pitfalls** — `clamp(v:number,lo:number,hi:number):number` fully typed; no `Record<string,any>`/`object`/`Function`; no mutable array/object params. Compliant.
- **#5 Module/declaration** — 8 `import { clamp } from '@shared/clamp'` are value imports (runtime fn, not `import type`); no `.js` extension is the established `@shared` convention (all existing shared imports omit it). Compliant.
- **#8 Test quality** — both new test files import real `clamp` from `../clamp` (src, not dist), no `as any`; guards hardened this round (A1/A2/A3). Compliant post-fix.
- **#15 / #25 Source-text token vs claim / whole-file positive anchor** — the ONE violation the rule-checker found (A1) is FIXED.
- **#21 Degenerate non-nullish numeric input** — this change IS the remedy: NaN (non-nullish, previously silently propagated by 3 of 4 spellings) is now explicitly guarded to `lo`; ±Infinity documented + tested. Compliant.
- **#22 Reject-style rewrite inverting NaN safety** — the ternary→guarded swap is NOT a silent inversion; it's the named DESIGN GATE, pinned by the "SOLE divergence on NaN" test. Compliant.
- **#3/#4/#6/#7/#9/#10/#11/#12/#13/#14/#16–#20/#23/#24/#26** — no applicable surface in the diff (no enums, async, JSX, config, error-handling, tenant/security, mutation tables). Verified N/A by rule-checker.

### Observations (≥5)

- `[VERIFIED]` Extraction is exhaustive and accurate — rule-checker grepped the pre-story commit `4fc65a63` for every `function clamp(`/`const clamp =` in `plugins/*/src/`: exactly 8 generic 3-arg hits, matching `ADOPTING_SITES`; no un-migrated 9th duplicate, no over-folded variant.
- `[VERIFIED]` Purity — `src/shared/clamp.ts` uses only `Number.isNaN`/`Math.max`/`Math.min`; DOM-free, so `purity.test.ts`'s catch-all covers it with no classification change. Evidence: `src/shared/clamp.ts:22`.
- `[VERIFIED]` No behavior regression at the two spelling-divergent sites — `rocks.ts:153` clamps with `ROCK_SPEED_MIN`/`MAX` constants (lo<hi always) and a finite `v`; `gameRules.ts:126` guards the zero-length segment (`if (abLen2===0) return`) BEFORE the division, so `t` is never NaN and lo=0<hi=1. Both cases the min-max/ternary and nest forms agree.
- `[VERIFIED]` red-baron's 5 sites: 4 were the nest form (byte-identical to shared) and `enemy.ts` was already the guarded form (byte-identical) — zero behavior change; the rb4-6 R3 NaN-totality contract is preserved exactly.
- `[TEST]/[RULE]` A1 confirmed by two independent subagents + a reproduced mutation — the strongest finding; fixed and re-verified to bite.
- `[DOC]` C1 — a real correctness-of-documentation defect my own dependency swap introduced in an *unedited* file; fixed.
- `[MUTATION]` Test rigor independently confirmed: flipping the NaN guard `lo`→`hi` kills 4 tests; an identity-clamp mutant kills 12. Non-vacuous.

### Devil's Advocate

Argue the change is broken. First attack: the NaN policy flip is a silent semantic change at seven sites, and "the suite is green" only proves the *tested* inputs are unaffected — a NaN reaching `gameRules.sweptCollides` or `cursor.placeCursor` at runtime now yields `lo` instead of poisoning downstream with NaN, and if some caller *relied* on NaN propagation as an error signal, that signal is now swallowed. Rebuttal: I traced both. `sweptCollides` guards `abLen2===0` before the only division, so `t` cannot be NaN from a degenerate segment; and even if a NaN arrived, `NaN→0` yields the segment's start point — a defined, bounded result strictly better than a NaN that would make `length(...) <= radius` return `false` unpredictably. `placeCursor` guards its divisors to 0, so the ratio is finite before clamp. NaN→lo is the design gate and an improvement, not a regression. Second attack: the inverted-range divergence — `rocks.ts` used `min-max` (returns `hi` for lo>hi) and now uses the nest form (returns `lo`); a rock tier with `ROCK_SPEED_MIN > ROCK_SPEED_MAX` would silently change child speed from MAX to MIN. Rebuttal: MIN/MAX are named speed bounds; MIN>MAX would be a data corruption unrelated to this change, and I pinned the behavior with a test so the divergence is now visible, not silent. Third attack: the adoption guard is theater — a Dev could comment out the import and the test would pass. Rebuttal: that was A1; fixed and mutation-verified this round, and `tsc` is a second backstop (an undefined `clamp` fails lint). Fourth attack: a confused maintainer reads `cursor.ts` and removes the divisor guard believing clamp handles NaN. Rebuttal: the comment now states exactly that clamp floors NaN AND why the divisor guard stays (explicit intent, finite ratio) — the previously-misleading text was the actual hazard and is corrected. Fifth: could `import { clamp }` collide with a local symbol anywhere? `tsc --noEmit` is clean across the repo, and the one real collision (cursor.ts kept a local copy in the first GREEN pass) was caught by the adoption test and fixed. No attack survives.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** internal numeric game state (e.g. `cursor.h + delta.dh`, `dot(...)/abLen2`, altitude `yi`) → `clamp(v, lo, hi)` → bounded result. Safe: NaN→lo by design; divisor/zero-length guards keep inputs finite; ranges are ordered constants.
**Pattern observed:** faithful shared extraction — one guarded implementation, 8 call sites de-duplicated, out-of-scope variants fenced. `src/shared/clamp.ts:22`, adoption pinned by `src/shared/tests/clamp-adoption.test.ts`.
**Error handling:** N/A (pure total function; NaN and ±Infinity both defined and tested).
**Confirmed specialist findings (all fixed in-session, commit `0501fbe5`):**
- `[TEST]` adoption-guard hardening — comment-strip the import check + AC-5 fold-check, broaden local-def detection to typed-const/`let`/`var`, and pin the inverted-range (`lo>hi`) behavior (A1/A2/A3/B1) in `src/shared/tests/clamp-adoption.test.ts` and `clamp.test.ts`.
- `[RULE]` source-text token-vs-claim / whole-file positive anchor (checklist #15 & #25) — `importsSharedClamp` ran on raw text; same defect as `[TEST]` A1, confirmed by reviewer-rule-checker and reproduced by mutation. Fixed.
- `[DOC]` stale/misleading comments — `cursor.ts` comment asserted the OPPOSITE of the guarded clamp's NaN behavior (C1), and the `enemy.ts` NaN-totality note was orphaned above `levelIndex` (C2). Both corrected.

**Note:** Round-1 review surfaced 6 confirmed findings (0 Critical/High; all Medium/Low) + 1 deferred + 1 dismissed. Per the user's instruction ("fix them here"), all 6 were fixed in-session rather than routed back to Dev — commit `0501fbe5`, full suite 14,660 green, lint clean, hardened guards mutation-verified. Approving the post-fix tree.
**Handoff:** To SM for finish-story.
## Impact Summary

**Shipped:** generic `clamp(v,lo,hi)` extracted into `src/shared/clamp.ts` (guarded NaN→lo), adopted at 8 sites across red-baron/asteroids/star-wars/missile-command, 8 local copies deleted. Out-of-scope variants fenced.
**Review:** 1 round, APPROVED. 4 enabled specialist subagents (5 disabled) + adversarial + mutation battery. 6 confirmed findings (all Medium/Low), all FIXED in-session at user request (commit `0501fbe5`): adoption-guard hardening (comment-strip + typed-const/let detection), inverted-range pin, one stale comment (cursor.ts), one orphaned comment (enemy.ts). 1 deferred (naive stripComments — filed non-blocking), 1 dismissed.
**Verification:** full suite 14,660 green, orchestrator 463 green, lint clean — on the merged-with-develop tree. PR #253 merged into develop (merge commit a71569ef).
**Blocking:** 0.
