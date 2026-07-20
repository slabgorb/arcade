---
story_id: "jt1-11"
jira_key: "jt1-11"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-11: Purity-scanner evasion tail — unwrap trivia nodes, element-access bans, documented dataflow limits, line numbers

## Story Details
- **ID:** jt1-11
- **Jira Key:** jt1-11
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 1
- **Priority:** p3

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T04:38:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T04:27:48Z | 2026-07-20T04:29:21Z | 1m 33s |
| red | 2026-07-20T04:29:21Z | 2026-07-20T04:32:22Z | 3m 1s |
| green | 2026-07-20T04:32:22Z | 2026-07-20T04:36:23Z | 4m 1s |
| review | 2026-07-20T04:36:23Z | 2026-07-20T04:38:26Z | 2m 3s |
| finish | 2026-07-20T04:38:26Z | - | - |

## Acceptance Criteria

The story carries three ACs from epic-jt1.yaml:

1. **Paren/NonNull/satisfies-wrapped banned expressions are caught** (each proven red once); Math['random']() is caught via the member table.
2. **The dataflow-shaped evasions and the shadowing strictness are documented as stated limits** in the scanner header, not half-implemented.
3. **Scanner failure messages name file + line**; suite green.

## Story Context

**From jt1-7 review's Reviewer Addendum — fold-back list (post-approval fixes):**

The remaining evasion tail deliberately not smuggled into jt1-7:

1. **Unwrap Parenthesized/NonNull/satisfies expressions** before identifier checks
   - `const M = (Math)` is one refactor away from accidental evasion
   - `Math!.random()` is a TypeScript NonNull assertion
   - `x satisfies TypeShape` wraps an identifier in a type assertion
   - Each must be unwrapped before checking the inner identifier

2. **Route ElementAccessExpression with string-literal argument through BANNED_MEMBERS**
   - `Math['random']()` is caught via computed property access
   - Generalizes to `obj['member']` pattern; optional-chaining form also applies

3. **Document spread/Object.assign/Reflect.get/reassignment-aliasing/class-extends as stated limits**
   - These require dataflow analysis (binding-graph traversal)
   - Half-implementing dataflow is worse than an honest boundary (Reviewer's ruling)
   - Document them in the scanner header as known limits, not holes to fix

4. **Failure messages carry line numbers via node.getStart()**
   - AST provides this for free
   - Real cost on the 1800-line generated module (pictures.ts)
   - Not a regression from jt1-7 (old scanner had same limitation)
   - Note for fold-back when next touching this file

5. **Scanner-shadowing false positive documented as limitation**
   - A local parameter named Math with a banned member IS flagged
   - Overly strict (~nil impact in core sim code where nobody shadows Math/Date)
   - Document as a stated limitation, not a hole

**From jt1-7 Reviewer's four deliberate-evasion misses (post-verdict list):**

Beyond the original five false negatives (jt1-7), the Reviewer found:
- `Math["random"]()` (computed member) — MISSED
- `const m = {...Math}; m.random()` (spread) — MISSED
- `Object.assign({}, Math).random()` — MISSED
- `Reflect.get(Math,'random')()` — MISSED

All require dataflow. The Reviewer's ruling: cheapest close is `Math["random"]` via ElementAccessExpression with string-literal (one of the ACs); the rest need documenting as known limits.

**Reviewer's guidance on threat model:**

The original five holes from jt1-1 were **accidental** (innocent string containing `/*` silently disabled the guard over unrelated code). The deliberate-evasion cases require **deliberate circumvention** — a purity lint is defence-in-depth against absent-mindedness, not an adversary. Therefore: fix the cheap accidental channels (already done in jt1-7: case-insensitivity on SHELL_SPECIFIER, bare Function in BANNED_CALLS, anti-fallback fixture). Document the dataflow-shaped ones as stated limits.

**Fold-back note (from jt1-7 close):**

The evasion tail should land in joust FIRST so centipede/tempest port the finished shape. Both games carry the same five ban tables + case table from jt1-7; they will adopt this tail once this story lands.

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): **the four "different" evasions are one defect seen four ways.** Parenthesis, `satisfies`, non-null assertion and string-literal element access all defeat the scanner for the same reason — it matches the SYNTAX it expects (a bare identifier, a dotted member), so any wrapper or re-spelling walks past. Worth fixing as one unwrap-then-match step rather than four special cases, which is also how it stays closed against the next wrapper TypeScript adds. *Found by TEA during test design.*
- **Improvement** (non-blocking): **element access needs the ban list keyed by member, not by dotted text.** `Math['random']()` and `Math[\`random\`]()` are the same member as `Math.random()`; a fix that only unwraps parentheses will not catch them. Both forms are in the flip table so the two halves cannot be done separately and called finished. *Found by TEA during test design.*
- **Question** (non-blocking): **the unwrap fix can trade a false negative for a false positive.** Unwrapping parentheses and assertions means innocent expressions — `(frameCount).toFixed(2)`, `(state satisfies object).posX`, `table['random']` — start flowing through the matcher too. A companion hold-test pins all five clean forms; without it the story could ship a scanner that reddens legitimate core code, which on a 1800-line data module is a worse outcome than the hole. *Found by TEA during test design.*
- **Improvement** (non-blocking): **line numbers are the difference between a usable and a decorative sweep.** Today a report is the rule name alone, so `pictures.ts` failing tells you 92KB of data is dirty somewhere. The rails require file AND line AND distinct lines per violation — a single number for a file with several is barely better than none. *Found by TEA during test design.*

## Design Deviations

### TEA (test design)
- **Extended jt1-7's existing flip/hold tables; built nothing new.** One point, and the file already had the loader, the table idiom and the control discipline.
- **Added a false-positive hold block the story does not ask for.** The three named flip cases all push toward unwrapping, and unwrapping is exactly the change that can start flagging innocent code. Pinning the clean forms is what makes the fix safe to make quickly.
- **Mutation-checked the documentation rail in BOTH directions rather than asserting it.** Text matches have passed vacuously on me three times across this epic (the arena header's "differently", the jsdom pragma, and the near-miss on PPOSX scope), so for the last story I added the limitations block to the scanner header, confirmed the two doc rails PASS, reverted, and confirmed they return to RED. Scanner restored byte-identical. The claim in the comment is earned, not promised.

## Sm Assessment

**Story:** jt1-11 (1pt, p3, tdd) — the LAST story of epic jt1: scanner evasion tail. Unwrap Parenthesized/NonNull/satisfies before identifier checks; Math['random'] via BANNED_MEMBERS; dataflow evasions DOCUMENTED as stated limits (Reviewer's ruling — never half-implemented); node.getStart() line numbers in failures; shadowing strictness documented. Lands in joust before any fleet fold-back.

**Setup verified:** session + context + branch off develop (eb5663d, 385/385). Proportionality: 1 point — extend the jt1-7 flip/hold tables and the scanner; no new machinery.

**Routing:** setup → red, owner tea.
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — every flip is a reproduced scanner defect. No chore bypass.

**Test Files:**
- `joust/tests/purity-scanner.test.ts` — modified. Eleven rails appended to jt1-7's flip/hold tables. **No new files, no new machinery.**

**Tests Written:** 11 rails
**Status:** RED — **11 failed / 387 passed** (398). `tsc --noEmit` exit 0.

### Every flip reproduced against the live scanner, control live

| Probe | Current scanner |
|---|---|
| **CONTROL** — plain `Math.random()` | **CAUGHT** |
| `const M = (Math); M.random()` | **MISSED** |
| `(Math satisfies object).random()` | **MISSED** |
| `(Math as unknown as T)!.random()` | **MISSED** |
| `Math['random']()` | **MISSED** |
| `Date['now']()` | **MISSED** |
| ``Math[`random`]()`` | **MISSED** |
| line numbers in the report | **ABSENT** — report is `["Math.random()"]` |

### One defect, seen four ways

Parenthesis, `satisfies`, non-null assertion and string-literal element access all defeat the scanner for the same reason: it matches the **syntax it expects** — a bare identifier, a dotted member — so any wrapper or re-spelling walks past. Best fixed as one unwrap-then-match step, which is also how it stays closed against the next wrapper TypeScript adds. Element access additionally needs the ban list keyed **by member**, not by dotted text, so a parenthesis-only fix will not catch it — both forms are in the table so the halves cannot be done separately and called done.

### The risk the story does not name
The unwrap fix can trade a false negative for a **false positive**: `(frameCount).toFixed(2)`, `(state satisfies object).posX`, `table['random']` all start flowing through the matcher too. A companion hold-block pins five clean forms. Without it this story could ship a scanner that reddens legitimate core code — on a 1800-line data module, a worse outcome than the hole.

### The documentation rail is mutation-checked in both directions
Text matches have passed vacuously on me three times across this epic (the arena header's "differently"; the jsdom pragma; a near-miss on PPOSX scope). So for the last story I added a limitations block to the scanner header, confirmed the two doc rails **PASS**, reverted, and confirmed they return to **RED**. Scanner restored byte-identical. The claim in the comment is earned rather than promised.

**Commit:** joust `chore/jt1-11-scanner-tail` — `09eb3a2`

**Handoff:** To Dev for implementation (GREEN).
### Dev (implementation)
- **Gap** (non-blocking, but it shaped the change): **adding a location to every report broke two suites that assert rule IDENTITY, not location.** jt1-1's fixture self-tests and jt1-7's MUST FLIP / MUST HOLD rails use array-exact matching — `expect(violations(src)).toContain('Date.now()')` — so `'Date.now() (probe.ts:1)'` fails them, while jt1-11's own rails join the array and match on a line number, which a suffix satisfies. The two conventions are incompatible by construction. I added a name-only view (`rules()`) in each of those suites and left the `src/core` sweep on the located form, since the sweep is the one a human reads. Affects any fleet repo that ports this scanner: the located form is a breaking change for identity-matching tests. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **`unwrap` had to be applied at every identifier site, not just the aliasing one.** The story names `const M = (Math)`, but the same wrappers sit in front of constructors (`new (Date)()`), calls (`(eval)('x')`) and member paths (`(Math).random()`). Fixing only the declarator would have closed the named case and left three siblings open — the half-implementation the ruling warns about, in miniature. All four sites now unwrap. *Found by Dev during implementation.*
- **Question** (non-blocking): **the located form makes reports position-sensitive, which is a new way for the sweep to churn.** Two identical violations on different lines now report as two entries rather than one deduplicated rule. That is what the rails want (`reports distinct lines for distinct violations`), but it means a generated module that shifts by one line produces a wholly different report string. Nothing depends on report stability today; worth knowing before anything snapshots it. Affects `tests/purity.test.ts`'s sweep output. *Found by Dev during implementation.*

## Design Deviations — Dev (implementation)

- **Added a name-only view to two TEA-authored suites** rather than changing the report format to satisfy both. See the finding: the located form is what jt1-11 asks for, and identity-matching tests need the suffix stripped. Neither suite's assertions changed meaning.
- **Unwrapped at all four identifier sites**, not only the one the story names — see the finding.
- **Documented the dataflow limits with the reasoning for NOT implementing them**, not just the list: each route needs real dataflow or a type checker, and the boundary is additionally defended by review and by core being generated from transcription tools. That is the distinction between these routes and the jt1-7 holes, which an innocent string could trip.

## Dev Assessment

**Implementation Complete:** Yes

| Run | Result |
|---|---|
| `purity-scanner.test.ts` | **39/39** (11 red rails green) |
| `purity.test.ts` | **21/21** |
| full suite | **398/398** |
| `npm run build` | **exit 0** |

**New detections proven by execution:**

| Probe | Report |
|---|---|
| `const M = (Math)` | `Math aliasing (= Math) (probe.ts:1)` |
| `const D = Date!` | `Date aliasing (= Date) (probe.ts:1)` |
| `Math['random']()` | `Math.random() (probe.ts:1)` |
| `` Math[`random`]() `` | `Math.random() (probe.ts:1)` |
| violation on line 3 | `Date.now() (probe.ts:3)` |
| legitimate core constant | `[]` — no false positive |

**Stated limitations (documented, deliberately not implemented):** spread, `Object.assign`, `Reflect.get`, reassignment aliasing, class-extends — each needs real dataflow. Shadowing strictness is deliberate and explained: a false positive costs one rename, a false negative costs the determinism the epic rests on.

**Commit:** `5e4a182` — pushed. Tables unchanged and still fleet-portable.

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — executed directly by the Reviewer** | clean | Attack-based verification of all three fold-back items plus four variants of my own; zero false positives across all four `src/core` modules; the doc rail mutation-checked. Tree clean, temp probing only. | **No specialists spawned**, per my standing rule: this is a 1-point story whose entire verification is attacking my own jt1-7 prescriptions, and putting the load-bearing evidence off the critical path is what cost jt1-6 and jt1-8. |
| 1 | reviewer-rule-checker | **Not spawned — executed directly by the Reviewer** | clean | Core/shell purity rule verified by attack rather than inspection; the documented-limits rail confirmed to bite. | Same reasoning. |

**All received: Yes** — no specialists spawned; both enabled scopes executed directly and on the critical path.

## Reviewer Assessment

**Verdict:** APPROVED

**Every item on my jt1-7 fold-back list is closed, verified by attack rather than by reading the diff [RULE].**

### Items 3 and 4 — wrapped aliases and literal subscripts

| Attack | Result |
|---|---|
| `const M = (Math); M.random()` | **CAUGHT** — `Math aliasing (= Math)` |
| `Math!.random()` (NonNull) | **CAUGHT** |
| `const M = (Math satisfies object)` | **CAUGHT** |
| `Math['random']()` | **CAUGHT** — reported as `Math.random()` |
| `Date['now']()` / `performance['now']()` | **CAUGHT** |
| `Math?.['random']()` (optional-chained subscript) | **CAUGHT** |

**And four variants of my own devising, none on the fold-back list — all caught:** `(Math)['random']()` (parens *and* subscript composed), `const M = Math as typeof Math` (as-cast wrap, a different unwrap path from parens/NonNull/satisfies), `const M = (((Math)))` (nested parens), and `const { random } = (Math)` (wrap composed with destructuring). The unwrapping is general rather than a list of the three shapes I happened to name — which is the difference between fixing my findings and fixing the class behind them.

I probed the composed and nested forms deliberately: my recurring error this epic has been testing one instance of a case and generalising to the class (jt1-7's `new Function()` vs bare `Function()`, jt1-9's empty-verbatim-on-a-non-blank-line). Composition is where a partial unwrap would show.

### Item 6 — the documented limits, and the rail that keeps them honest

The header names all five undetected dataflow routes **explicitly and with examples** (`:46-50`): spread, `Object.assign`, `Reflect.get`, reassignment aliasing, and `class extends`. It also states the **shadowing strictness** (`:58-59`) — a local named `document` or `window` reports even though it is harmless — so the over-strictness I found at jt1-7 is now declared rather than surprising.

**The text rail bites.** I stripped the limits lines from the header and the suite reddened with a precise message: *"the header must name these as KNOWN LIMITATIONS — an undocumented gap reads as completeness to the next author"* (1 failed / 38 passed). Restored clean. That matters because two of my last four reviews found doc-text assertions that passed on unintended content; this one is anchored to the specific route names, not to keyword proximity.

### Located reports and no false positives

Failure messages now carry file and line, and the lines are **correct**, not merely present — a fixture with violations on lines 5 and 7 reports `Math.random() (m.ts:5)` and `Date.now() (m.ts:7)`. That closes the jt1-7 finding about a reviewer grepping an 1800-line generated module.

**Zero false positives** across `frame.ts`, `arena.ts`, `pictures.ts` and `flight.ts` — including the 90KB generated `pictures.ts`. The hardening did not cost precision, which was the real risk in widening the unwrap and subscript paths.

### Findings

**None.** No blocking, no non-blocking. The story closed the three items it was scoped to close, the fix generalises past the specific shapes I named, and the one documentation rail is mutation-verified.

**Handoff:** To SM for finish-story — the last review of epic jt1.