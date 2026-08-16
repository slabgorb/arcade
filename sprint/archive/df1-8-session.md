---
story_id: "df1-8"
jira_key: "df1-8"
epic: "df1"
workflow: "tdd"
---
# Story df1-8: Harden joust inline loadClaims (citations.test.ts:641)

## Story Details
- **ID:** df1-8
- **Jira Key:** df1-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** feat/df1-8-harden-joust-inline-loadclaims
- **PR:** https://github.com/slabgorb/arcade/pull/449 (MERGED — merge commit 1f1eab4b)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T09:58:17Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T09:21:32Z | 2026-08-16T09:23:48Z | 2m 16s |
| red | 2026-08-16T09:23:48Z | 2026-08-16T09:31:44Z | 7m 56s |
| green | 2026-08-16T09:31:44Z | 2026-08-16T09:39:07Z | 7m 23s |
| review | 2026-08-16T09:39:07Z | 2026-08-16T09:51:09Z | 12m 2s |
| green | 2026-08-16T09:51:09Z | 2026-08-16T09:54:03Z | 2m 54s |
| review | 2026-08-16T09:54:03Z | 2026-08-16T09:58:17Z | 4m 14s |
| finish | 2026-08-16T09:58:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap · non-blocking · TEA]** The shared helper `plugins/joust/tests/helpers/claims.ts`
  `loadClaims()` narrows every entry via `asClaim` (shape-checked, file-named) but does
  NOT wrap `JSON.parse` in a try/catch — so a *syntactically* broken `claims/*.json` still
  throws a raw `SyntaxError` naming no file (df1-6's defender loader DOES wrap it). This gap
  is fleet-wide (40+ joust source-audit tests already lean on this loader) and is NOT made
  worse by df1-8 — adopting the shared loader simply makes `citations.test.ts` consistent
  with the fleet. Recording it so it is not lost; a follow-up could add the JSON.parse wrap
  to the helper (would harden all 40+ callers at once). Out of df1-8 scope as ruled below.

### Reviewer (code review)

- **Gap (non-blocking):** the story's "last fleet residue" framing is inaccurate.
  `plugins/centipede/tests/audit/sound-dossier.test.ts:399` carries a LIVE
  `JSON.parse(readFileSync(soundClaimsPath, 'utf8')) as Claim | Claim[]` — its own inline
  sound-claims loader with the exact defect df1-8 retires in joust. centipede already owns a
  hardened `dossier-sweep.ts` loader to adopt. **File a follow-up story** (centipede epic:
  retire the inline `sound-dossier.test.ts` loader, adopt the hardened dossier-sweep loader),
  mirroring df1-8. Out of df1-8 scope (different game/file). *Found by Reviewer (rule-checker #24).*
- **Improvement (non-blocking):** `plugins/joust/tests/audit/load-claims-hardening.test.ts:135-149`
  — the `no live \`as Claim | Claim[]\` cast survives` guard exact-string-matches the union type
  text, so a reversed-union (`Claim[] | Claim`) or parenthesised cast would evade it. It is
  redundant with the no-local-def + must-import guards (which already drive the story), so this
  is a robustness nicety, not a live vacuity. A future tweak could normalise the union members
  before comparing. *Found by Reviewer (test-analyzer).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] Kept the strict `check-citations` `Claim`, bridged via `committedClaims()` — did
  NOT retype the file to the helper's `Claim`.** TEA offered two reconciliations ("import
  Claim from the helper, or keep a local alias"). I tried the first (retype to helper-`Claim`)
  and lint caught it: the strict `check-citations.d.mts` `Claim` is genuinely *richer* — it
  has a `corroboration` field and a required `source` — and this file's checker-test literals
  depend on both (`citations.test.ts:177,185` set `corroboration`; the drift test at ~:828
  needs a required-`source` shape). Retyping loses `corroboration` and breaks those. So GREEN
  keeps the strict `Claim` as the file's type contract and adds ONE commented bridge,
  `committedClaims() { return loadClaims() as Claim[] }`, cast at a single chokepoint. The
  cast is sound at runtime: the shared `loadClaims` already narrows every entry via `asClaim`
  (naming the file on a bad shape). The 9 loader call sites now read `committedClaims()`. No
  behavior change on the real committed claims (same `docs/rom-study/claims/` dir).

### Reviewer (audit)

- **Dev's `committedClaims()` bridge (keep strict `Claim`, cast once)** → ✓ ACCEPTED by Reviewer.
  Independently verified: the strict `check-citations` `Claim` genuinely carries fields the
  file's checker literals use (`corroboration` at citations.test.ts:188; required `source`),
  so retyping to the helper's looser `Claim` would break them — Dev's lint failure was real.
  The `loadClaims() as Claim[]` cast is a plain widening (not `as any`/`as unknown as`),
  commented, and runtime-sound: `checkClaims` reads every field defensively (`c?.id`,
  `isCitation(c?.source)`) and the AC-2 suite proves every committed claim fits the strict
  shape. rule-checker #1 concurred (PASS). No spec deviations went undocumented.

## SM Assessment

**Premise verified before setup — the story is CURRENT, not stale.** I opened the cited
line against the current tree (2026-08-16). `plugins/joust/tests/audit/citations.test.ts`
lines 641-647 are genuinely the unhardened `loadClaims()`: a per-file
`JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[]` with no
controlled error naming the file and no shape-assertion of `source`. This is a separate,
un-narrowed copy from the plugin's own hardened helper — the story's description is
accurate word for word. No correction banner was needed and none was added.

**Reference model for TEA/Dev (all confirmed present):**
- Unhardened loader to fix: `plugins/joust/tests/audit/citations.test.ts:641-647`.
- Mirror this: `plugins/joust/tests/helpers/claims.ts:40` `asClaim(value, file)` — throws
  `claims/${file}: …` and shape-asserts `id`/`claim`/`source`. The inline loader does NOT
  call it; the clean fix is to route each parsed entry through `asClaim`.
- df1-6 precedent (the "mirror df1-6" phrasing): `plugins/defender/tests/audit/dossier-sweep.ts:149`.

**Scope:** exactly one function in one file. joust and missile-command `helpers/claims.ts`
are already hardened; this is the last fleet residue. Routed from df1-6 reviewer round 1.

**ACs:** df1-8 carries `acceptance_criteria: null` in the epic YAML; sm-setup derived none
and I added none. The detailed story description IS the spec — TEA should derive the RED
from it (per-file controlled error + `source` shape-assert, mirroring `asClaim`).

**Board:** clean. No sibling owns df1-8 (a-2 → ml10-5, a-3 → ml10-3), no remote branch
existed, no blocking PRs. Claim now pushed on `feat/df1-8-harden-joust-inline-loadclaims`
and status stamped `in_progress`.

Handoff to TEA (Tyr One-Handed) for the RED phase.

## TEA Assessment (RED)

**RED landed: `plugins/joust/tests/audit/load-claims-hardening.test.ts` (commit `ddbddfc7`).**
Focused run: **3 failing / 9 passing**. Modeled on the proven `rng-shared-adoption.test.ts`
("retire an inlined copy, adopt the shared module") — AST-based, not grep-based.

**Scope ruling I made (Dev must follow):** this story is a **DEDUP / ADOPTION**, not a
harden-in-place. On investigation the helper `../helpers/claims.ts` is already the
fully-hardened, mutation-pinned fleet chokepoint (jt9-31's `claims-helper-source.test.ts`
guards every `asClaim` throw), and 40+ joust source-audit tests import `loadClaims` from it.
`citations.test.ts` is the ONE file that kept a private un-narrowed copy — "the last fleet
residue." So GREEN = **delete the inline `loadClaims` (:641-647) and import the shared
`loadClaims` from `../helpers/claims`**, exactly as SH3-1 retired the inlined mulberry32.

**The 3 failing tests (the deliverable), all PART 1:**
1. `defines NO local loadClaims` — the inline `function loadClaims` must leave the file.
2. `imports loadClaims from ../helpers/claims` — the shared loader must be adopted.
3. `no live \`as Claim | Claim[]\` cast survives` — the unhardened tell (a live AsExpression)
   is retired. Pinned via the TS AST so a commented-out copy can't fake green.

**The 9 passing (keep them green):**
- PART 2 anchors that the adopted `asClaim` names the file on a bad shape (a non-object and a
  malformed `source`) — what the inline copy never did. Green now and after.
- **PART 2 control (the schema trap):** a claim with **no `source` is legal joust data** and
  must NOT throw. Do **not** copy df1-6's defender cases that reject a source-less claim —
  defender's `isValidClaimSource` requires a citation; joust's `asClaim` deliberately does
  not ("a claim missing source is legal data, not an error", claims.ts). Over-hardening to
  defender's rule reddens this control.
- PART 3 pins the AST guard teeth (a real def is flagged; an import binding, a comment, and a
  string are not; the import matcher rejects wrong-binding / wrong-module / commented).

**Type plumbing for Dev (trivial, not a blocker):** the inline loader typed its result as
`Claim` from `../../tools/audit/check-citations.mjs`; the helper returns its own `Claim`
(an optional-field superset). `checkClaims` in the `.mjs` is untyped JS, so the call sites
(`loadClaims()` at :672,:684,:703,:781,:808,:816,:821,:826,:970) type-check with the helper's
`Claim`. Reconcile the local `import type { Claim }` as needed (import from the helper, or
keep a local alias). The helper reads the **same** `docs/rom-study/claims/` dir, so the
existing AC-2 coverage assertions stay behavior-identical on the real committed claims.

**Rule Coverage:** `plugins/joust` is TS/vitest; the applicable project rule here is the
repo-wide "source-text guards must parse, not grep" discipline — honored: every structural
assertion walks the TypeScript AST (`ts.createSourceFile`) and counts only live nodes, with
PART 3 proving comments/strings/import-bindings can neither satisfy nor defeat the guard. No
core/shell purity boundary is touched (this is test-only tooling). Self-check: no vacuous
assertions — every test asserts a concrete AST fact, a thrown message regex, or a value
equality; the "has teeth" sanity test guards against a vacuous file-mention pass.

Handoff to Dev (Loki Silvertongue) for GREEN.

## Dev Assessment (GREEN)

**GREEN landed (commit `863ef328`).** Followed TEA's DEDUP/ADOPTION ruling exactly: deleted
the inline `loadClaims` (was `citations.test.ts:641-647`) and its now-orphaned `claimsDir`
const + `readdirSync` import, and sourced `loadClaims` from the shared hardened
`../helpers/claims.js` (jt9-2/jt9-31 chokepoint). The one nuance TEA under-weighted — the two
`Claim` types genuinely differ (the strict `check-citations` one has `corroboration` +
required `source`, which this file's checker literals need) — is handled by a single commented
bridge `committedClaims()` rather than by retyping the whole file (see Design Deviation).

**Verification (all run, all green):**
- df1-8 RED → GREEN: `load-claims-hardening.test.ts` now **12/12** (was 3 failing / 9 passing).
- Full joust project: **3691/3691** (195 files — the new file bumped the README's derived
  count 194→195, updated per the `audio-seam-scope` census guard; that guard reddened first
  and I updated `plugins/joust/README.md:48`).
- Orchestrator suite: **498/498**. Lint (`tsc --noEmit`): **clean**.

**Scope held:** test-tooling only, one function retired + one bridge added + a doc count. The
shared helper's own missing JSON.parse-wrap (TEA's non-blocking Delivery Finding) is untouched
and out of scope — adopting the shared loader simply makes `citations.test.ts` consistent with
the 40+ other callers.

Handoff to Reviewer (Heimdall).

## Subagent Results (Round 1 — superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all suites green (joust 3691/3691, orchestrator 498/498), lint clean, zero smells/orphans |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (LOW) | 1 confirmed non-blocking (cast-guard exact-string brittleness → filed as improvement); it also mutation-verified all guards bite |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | 3 confirmed (2 #17 overclaims blocking-this-round, 1 "40+" minor) — all doc-precision |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — I covered the `as Claim[]` cast myself: VERIFIED sound (rule-checker #1 concurred) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no security surface (test tooling, no user input/auth/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — I judged the `committedClaims()` bridge (1 helper + 9 renames) simpler than scattered casts: reasonable |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation | 1 confirmed (#5 missing `.js`); exhaustively PASSed #1/#15/#20/#23/#24/#25 with live mutation |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 4 confirmed blocking-this-round (doc/lint), 2 confirmed non-blocking (filed as follow-ups), 0 dismissed

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED (green rework — all findings are doc/lint-class; no test logic changes)

The **code is correct and mutation-verified** three independent ways (my decoy-import mutation,
test-analyzer's revert-to-develop mutation, rule-checker's live reinstatement of both retired
patterns) — every PART 1 guard reddens when the retirement is undone, and PART 3 proves the AST
helpers themselves. The `committedClaims()` cast is sound (`[TYPE]` verified). I am rejecting
**only** on confirmed lang-review rule violations in the prose/imports of a claim-fidelity story,
all trivially fixable, because shipping them writes a permanent overclaim into the record.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[DOC]` | #17 — import comment says "a malformed claims/*.json names its own file"; true only for WRONG-SHAPE data. The shared loader's `JSON.parse` is unguarded, so a syntactically-broken JSON still throws an unnamed `SyntaxError`. Contradicts the correctly-scoped comment ~13 lines below. | `plugins/joust/tests/audit/citations.test.ts` df1-8 import comment (lines ~59-64) | Narrow to "a wrong-SHAPE claims/*.json names its own file (via `asClaim`); a syntactically-broken JSON still throws an unnamed `SyntaxError` from the shared loader's unguarded `JSON.parse` — a known fleet-wide residual (see TEA Delivery Finding), out of df1-8 scope." |
| [MEDIUM] `[DOC]` | #17 — the test-file header lists BOTH retired defects and, with PART 2's title "THE ADOPTED LOADER IS HARDENED", implies adoption closes both. The unguarded-`JSON.parse`→unnamed-`SyntaxError` defect survives fleet-wide in the shared loader and PART 2 never tests it. | `plugins/joust/tests/audit/load-claims-hardening.test.ts:8-23` (header) + PART 2 framing (~:157) | Scope honestly: adoption closes the shape/cast defect only; the `JSON.parse` defect is a KNOWN residual (filed), NOT closed here. **Do NOT add a JSON-syntax test** — hardening the shared helper is out of df1-8 scope (one function, one file). |
| [LOW] `[RULE]` | #5 — relative import missing `.js` extension; inconsistent with this diff's own `citations.test.ts:65` and 40 sibling joust files. (No build break under `bundler` resolution, but a same-diff inconsistency and a checklist violation.) | `plugins/joust/tests/audit/load-claims-hardening.test.ts:47` | `import { asClaim } from '../helpers/claims.js'` |
| [LOW] `[DOC]` | #17 — "40+ joust source-audit tests import it" is imprecise (39 pre-df1-8 `loadClaims` importers; rule-checker counted 41 helper-module importers — the number depends on what is counted). | `plugins/joust/tests/audit/load-claims-hardening.test.ts:22` | State the measured count precisely, or hedge to `~40`. |

**Dispatch tags:** `[EDGE]` disabled · `[SILENT]` disabled · `[TEST]` 1 non-blocking (cast-guard
brittleness, filed) · `[DOC]` 3 confirmed (above) · `[TYPE]` disabled → I verified the cast sound ·
`[SEC]` disabled → no security surface · `[SIMPLE]` disabled → bridge judged reasonable · `[RULE]`
1 confirmed (#5, above).

**Data flow traced:** committed `claims/*.json` → shared `loadClaims`/`asClaim` (shape-checked,
file-named) → `committedClaims()` widening cast → `checkClaims`/`coveredBy` (defensive field
reads). Safe: AC-2 suite green on real data, cast runtime-sound.

**Two non-blocking findings filed** (see Delivery Findings → Reviewer): the centipede
`sound-dossier.test.ts:399` live residue (refutes "last fleet residue" — needs its own story) and
the cast-guard exact-string brittleness (redundant guard, robustness nicety).

**Handoff:** Back to Dev (Loki Silvertongue) for the four doc/lint fixes above. No behavior or
test-logic changes; re-review should be fast.

## Dev Assessment (GREEN — rework round 1, commit `382fb097`)

All four Reviewer fixes applied; doc/lint only, no logic or test-behavior change:
1. **[RULE #5]** `load-claims-hardening.test.ts:47` — added `.js`: `'../helpers/claims.js'`.
2. **[DOC #17]** header + PART 2 now scope honestly: adoption closes the wrong-SHAPE/cast
   defect (2) ONLY; the unguarded-`JSON.parse`→unnamed-`SyntaxError` defect (1) survives
   fleet-wide in the shared loader and stays a filed residual, explicitly out of df1-8 scope.
   **Did NOT add a JSON-syntax test** (would require hardening the shared helper — out of
   scope, as ruled). PART 2 header retitled "SHAPE-CHECKS" with an explicit note that the
   JSON-syntax half is untested here.
3. **[DOC #17]** `citations.test.ts` import comment narrowed: "malformed" → "WRONG-SHAPE",
   with the syntactically-broken-JSON caveat.
4. **[DOC]** "40+" → "39" pre-df1-8 importers; "last fleet residue" → "last joust residue"
   (the centipede residue is filed as a follow-up Delivery Finding).

Verification: `npm run lint` clean; full joust project **3691/3691** (195 files). The two
non-blocking findings (centipede residue, cast-guard brittleness) remain filed for follow-up,
not addressed here (out of scope / non-blocking by ruling).

Handoff to Reviewer (Heimdall) for round 2.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — round 2: lint clean, joust 3691/3691, zero smells in the rework delta |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (LOW, R1) | Carried from R1 — rework changed NO test logic (comments + 1 import extension only); its LOW cast-guard note remains filed non-blocking |
| 5 | reviewer-comment-analyzer | Yes | resolved | 0 new | Re-run R2: all 3 R1 #17 findings RESOLVED (high confidence), no new overclaims; centipede residue + .js independently confirmed |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — cast unchanged since R1 (verified sound) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — no security surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — no structural change |
| 9 | reviewer-rule-checker | Yes | resolved | 0 new | Re-run R2: #5 FIXED (`.js` present, all relative imports swept); no new #1–#30 violation; #17 claims re-verified accurate |

**All received:** Yes (3 enabled re-run in R2 + test-analyzer carried from R1; 5 disabled)
**Total findings:** 0 blocking, 2 non-blocking carried from R1 (both filed as follow-ups)

## Reviewer Assessment

**Verdict:** APPROVED

Round 2. All four Round-1 doc/lint findings are RESOLVED and independently re-verified by
three specialists (preflight, comment-analyzer, rule-checker), each of which ran the code
rather than only reading it:

- **[DOC] #17 ×2 (import comment + test-file header/PART 2)** — RESOLVED. The prose now scopes
  the guarantee honestly: adoption closes the wrong-SHAPE/cast defect only; the unguarded-
  `JSON.parse`→unnamed-`SyntaxError` defect is stated as a known fleet-wide residual, out of
  scope, and PART 2 is retitled "SHAPE-CHECKS" with an explicit note it does not test the
  JSON-syntax path. comment-analyzer confirmed both comment locations are internally consistent
  (no contradicting claims) and accurate against `helpers/claims.ts`.
- **[RULE] #5 (missing `.js`)** — FIXED at `load-claims-hardening.test.ts:54`; rule-checker swept
  every relative import in both files — all carry `.js`/`.mjs`. (The bare `'../helpers/claims'`
  strings that remain are AST-fixture literals fed to the guard's own helpers, correct by design.)
- **[DOC] minor ("40+"→"39"; "last fleet residue"→"last joust residue")** — FIXED and verified;
  39 is the exact pre-df1-8 importer count.
- **[TYPE]/[SIMPLE]** (disabled specialists, covered by me): the `committedClaims()` widening cast
  is unchanged and remains sound (rule-checker #1 concurred R1); the bridge is the simpler option.
- **[EDGE]/[SILENT]/[SEC]**: N/A — test-tooling only, no runtime error paths, no security surface.

**Code correctness** was established in Round 1 and is unchanged: the retirement guard is
mutation-proven three independent ways (my decoy-import mutation, test-analyzer's revert-to-
develop, rule-checker's live reinstatement), and the dedup is behavior-identical on the real
committed claims (joust **3691/3691**, orchestrator **498/498**, lint clean).

**Data flow traced:** committed `claims/*.json` → shared `loadClaims`/`asClaim` (shape-checked,
file-named) → `committedClaims()` widening cast → `checkClaims`/`coveredBy` (defensive reads).
Safe: AC-2 suite green on real data.

**Two non-blocking findings remain filed** (Delivery Findings → Reviewer): the centipede
`sound-dossier.test.ts:399` live residue (needs its own follow-up story) and the cast-guard
exact-string brittleness (redundant guard, robustness nicety). Neither blocks df1-8.

**Handoff:** To SM (Baldur the Bright) for finish-story.