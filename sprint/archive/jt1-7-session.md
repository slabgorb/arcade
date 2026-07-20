---
story_id: "jt1-7"
jira_key: "jt1-7"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-7: Purity-scanner hardening — real tokenizer for the core boundary guard (five confirmed false negatives)

## Story Details
- **ID:** jt1-7
- **Jira Key:** jt1-7
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T01:59:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T01:38:59Z | 2026-07-20T01:40:17Z | 1m 18s |
| red | 2026-07-20T01:40:17Z | 2026-07-20T01:47:08Z | 6m 51s |
| green | 2026-07-20T01:47:08Z | 2026-07-20T01:53:29Z | 6m 21s |
| review | 2026-07-20T01:53:29Z | 2026-07-20T01:59:51Z | 6m 22s |
| finish | 2026-07-20T01:59:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking, fleet-relevant): **the AST rewrite made the ban list *smaller and clearer*, not larger.** The 27 regexes collapse to five intent-named tables — banned OBJECTS (reported by object identifier, so `view.windowSize` and `processInput()` can never trip), banned `object.member` PAIRS, banned bare IDENTIFIERS (which also covers type positions like `const px: ImageData`), banned CALLS, and banned CONSTRUCTORS — plus one aliasing table. Every `\b…\s*` anchoring hack disappears because the parser already knows what an identifier is. This matters for the fold-back: centipede and tempest can port the tables directly and delete more code than they add. Affects `centipede/tests/purity.test.ts` and `tempest`'s equivalent. *Found by Dev during implementation.*
- **Gap** (non-blocking): **the scanner reports rule NAMES but not line numbers, and on a 1800-line generated module that is a real cost.** The old scanner had the same limitation so this is not a regression, but the AST walk has `node.getStart()` available for free and the failure message currently says only "core/pictures.ts crosses the boundary via: Math.random()". On a hand-written module that is fine; on generated data it leaves the author grepping. One line of work whenever someone next touches this file. Affects `joust/tests/helpers/purity-scanner.ts`. *Found by Dev during implementation.*
- **Question** (non-blocking): **the anti-fallback rule keys on `parseDiagnostics`, which is not part of TypeScript's public API surface.** `ts.createSourceFile` does not throw on syntax errors — it returns a tree with error nodes — so the only way to detect "this did not parse" is the `parseDiagnostics` property on the returned SourceFile, which is internal and reached through a cast. It has been stable for many major versions and the structural test covers the behaviour, so a silent break would redden rather than pass. But a TypeScript upgrade is the thing that could quietly turn the anti-fallback rule into a no-op. Worth knowing before the fleet fold-back multiplies the exposure. Affects `joust/tests/helpers/purity-scanner.ts` and `package.json`'s typescript pin. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **the destructuring and alias rules had to be made mutually exclusive.** My first pass reported `const { random } = Math` under BOTH `Math aliasing (= Math)` and `destructuring Math`, which is exactly the double-report the jt1-1 Date-alias tightening was written to remove — a failure message naming two rules for one line sends the author hunting a second, non-existent problem. Caught by reading the demonstrated-red output rather than by a test: TEA's FN-4 assertion is `length > 0`, so the noisy version passed. Worth a one-rule-per-defect assertion when the fleet fold-back lands. Affects the ported suites. *Found by Dev during implementation.*

### TEA (test design)
- **Conflict** (blocking to the AC's prescribed mechanism): **acorn is NOT in the dependency tree, and could not do this job if it were.** The story and AC-2 both name acorn as "already available via vite". It is not: `node_modules/acorn` does not exist, `require.resolve('acorn')` throws, and a recursive search finds nothing — **Vite 8 uses rolldown/oxc, not rollup/acorn** (`node_modules` holds `@rolldown`, `@oxc-project`, `es-module-lexer`; `@oxc-project` ships only `types`, no parser). Separately and more fundamentally, **acorn parses JavaScript only** — `src/core/*.ts` is full of interfaces, generics, `as const` and type-only imports, all of which acorn rejects outright. The right tool is already a direct devDependency: **the TypeScript compiler API** (`typescript` 5.9.3, `ts.createSourceFile`), which is TS-native and needs no new dependency. Verified this session: it parses all three core modules, including the 92KB `pictures.ts` (19,140 nodes), in negligible time. Affects `sprint/epic-jt1.yaml` AC-2 wording ("acorn or equivalent" — the equivalent is the one to use). *Found by TEA during test design.*
- **Conflict** (non-blocking): **AC-2 says "the existing 51-test suite"; `purity.test.ts` holds 20 tests.** 51 was jt1-1's combined scaffold+purity total at the time. The suite Dev must keep green is the whole 218-test baseline, of which purity is 20. Affects the AC wording only. *Found by TEA during test design.*
- **Gap** (non-blocking, folded into this story): **a sixth false negative — a string carrying BOTH `//` and `/*`.** Reproduced this session with the same control. Neither stripping order survives it: comments-first lets the `//` eat the line, strings-first lets the `/*` open a phantom block. It is not a new root cause, but it is the case that most cleanly demonstrates why reordering the existing regexes cannot work. *Found by TEA during test design.*
- **Improvement** (non-blocking, shapes the whole suite): **there is no single "regex-impossible" poison — the premise of the steer did not survive experiment.** I probed six inputs a regex "structurally cannot handle" (nested template literals, regex literals containing a quote, regex literals containing `/*`, escaped quotes, division-vs-regex ambiguity, comment markers inside templates) and the **current scanner catches all of them** — incidentally, because its stripping order happens to leave the violation standing. The durable property is therefore the *intersection*: 6 must-flip cases plus 9 must-hold cases, where each plausible regex patch direction breaks a different member of the must-hold set. That is what makes a regex patch fail the suite rather than merely being discouraged from one. *Found by TEA during test design.*
- **Question** (non-blocking): **FN-4 and FN-5 need binding analysis, not just tokenizing.** `const { random } = Math; random()` and `const readClock = Date.now; readClock()` are lexically unremarkable — catching them means noticing a declarator whose initialiser is a banned member expression, or whose pattern destructures a banned object. Cheap on a real AST, impossible on a token stream alone. The tests assert only that *something* is reported (not a specific rule name), so Dev has latitude on how to phrase it. Worth knowing that "tokenizer" understates what these two require. *Found by TEA during test design.*
- **Improvement** (non-blocking): **this scanner is fleet-wide.** centipede and tempest carry the same regex shape and therefore the same six holes. The story already notes folding the fix back once joust proves it; the joust suite is written so the case table ports directly. *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **THE TWO SM-AUTHORIZED RIDERS (disclosed).** Both are from the jt1-4 review addendum, both landed exactly as specified, and **nothing else rode along** — the diff outside `tests/helpers/purity-scanner.ts`, `tests/purity.test.ts` and these two files is empty:
  1. `tests/arena.test.ts` — added `expect(a.bridgeDestroyedOnWave(4)).toBe(true)` to the bridge-hook test, with a comment naming the countdown semantics (`JOUSTRV4.SRC:1934-1936`) and why equality is the wrong shape. **Verified it closes the channel:** mutating `>=` to `===` in `src/core/arena.ts` now reddens this test; before the rider, the same mutation passed every test in the suite. The test title changed to say so ("fires on wave 3 and STAYS fired after").
  2. `tests/helpers/arena-contract.ts` — the `Platform` doc comment no longer claims "every band is exactly 4 scanlines". It now states the split (five 4-scanline ledges, CLIF5's 17-scanline island) and notes that the old text was wrong, since this is the file a later story reads first.
- **Used the TypeScript compiler API rather than acorn**, per the SM ruling and TEA's finding. No new dependency: `typescript` is already a direct devDependency. The suite asserts outcomes, not mechanism, so this is a choice the tests permit rather than one they force — recorded because AC-2's literal text still names acorn.
- **Deleted the old scanner rather than deprecating it.** `purity.test.ts` keeps its 20 tests and its `src/core/` sweep, but the `stripComments`/`stripStrings`/`BANNED`/`SHELL_IMPORT`/`violations` block is gone and replaced by a one-line import. This is what TEA's "exactly one scanner sweeps src/core" test exists to force, and leaving a second implementation in place — even a simpler one for this file's own use — is how the hardened scanner ends up tested while the holey one does the guarding.

### TEA (test design)
- **Pinned VERDICTS, not the AST mechanism (the routing note left this to my call, and steered this way):** nothing in the suite asserts a walk, a visitor, or a library. Two structural requirements do appear, and both are deliberately framed as outcomes rather than style: (a) source the scanner cannot parse must not silently pass — this forbids "tokenize, fall back to the old regex on error", which satisfies every behavioural case while reintroducing every hole, and is the obvious shortcut under time pressure; (b) exactly one scanner sweeps `src/core/`, because otherwise the hardened scanner can be added *alongside* the original and the original keeps doing the sweep while every new test passes.
- **Built the suite as MUST FLIP + MUST HOLD rather than hunting one killer poison:** the steer asked for an input no regex can thread. Experiment refuted the premise — the current scanner catches every "impossible" case I could construct, incidentally. So the constraint is expressed as an intersection instead: 6 flips against 9 holds, chosen so that each plausible patch direction (reorder strings/comments, teach the template regex about `${}`, add regex-literal awareness) breaks a different hold. Each MUST HOLD case carries a one-line note naming the patch it blocks, so a future author sees *why* it is there before deleting it.
- **Named the TypeScript compiler API rather than acorn:** AC-2 says "acorn or equivalent". acorn is absent from the tree and cannot parse TypeScript at all, so following the AC literally would mean adding a dependency that still could not read `src/core`. The tests do not require any specific library — only that the outcomes hold — but the finding records the verified alternative so Dev does not spend the story rediscovering it.
- **Added a sixth flip case beyond the ACs' five:** the string carrying both `//` and `/*`. It is the cleanest demonstration that reordering the existing regexes cannot work, which is exactly the shortcut this story exists to prevent.
- **Added no-false-positive coverage the ACs do not ask for:** `src/core` is no longer 28 trivial lines — it is three real modules including 92KB of transcribed data with ~970 quotes, 20 backticks and 117 slashes. A hardened scanner that flags legitimate data, or that backtracks catastrophically on it, is a worse outcome than the holes being fixed, and would present as a hung suite rather than a red one. Hence the real-module sweep, the TypeScript-syntax case, and the time bound.

## Sm Assessment

**Story:** jt1-7 (2pt, p1, tdd) — purity-scanner hardening: replace the regex comment-stripper with a real tokenizer (acorn, already in the tree via vite). Five reproduced false negatives from the jt1-1 review (string-embedded /* and //, template ${} interpolation, Math destructuring alias, Date function-reference alias); each becomes red-then-green. GATES jt1-5 — src/core now holds frame.ts, pictures.ts, arena.ts and is about to receive the flight model.

**Setup verified:** session + context + branch `chore/jt1-7-purity-tokenizer` off develop (1ae4491, 218/218). The Reviewer's jt1-1 warning binds: a rushed regex patch in a fix loop is how NEW holes get added — the tokenizer is the demanded shape. Existing suite must stay green; the demonstrated-red evidence bar from jt1-1 AC-2 applies.

**Execution mode:** peloton team peloton-jt1-7, persistent riders. jt1-1..jt1-4 shipped this session (joust#3/#4/#5/#6).

**Routing:** setup → red, owner tea.

## Sm Note — two disclosed riders for Dev's GREEN (jt1-4 addendum, user standing rule: simple fixes don't route)

The jt1-4 review addendum (mutation-tested, non-blocking, already-merged story) leaves two one-liners with no natural home before jt3/jt1-5. They ride THIS branch, disclosed:
1. `tests/arena.test.ts`: add `expect(a.bridgeDestroyedOnWave(4)).toBe(true)` — the specialist mutated `>=` to `===` and EVERY test passed; this is a confirmed silent-regression channel (MEDIUM). One line closes it.
2. `tests/helpers/arena-contract.ts:40`: the comment still says "every band is exactly 4 scanlines" — contradicted by the corrected assertion (CLIF5 is 17). Fix the comment (LOW; it's the file a future story reads first).

Both are out of jt1-7's purity scope — Dev discloses them as SM-authorized riders in the Design Deviations section; the jt1-7 Reviewer should verify both landed as specified and nothing else rode along.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — jt1-7 exists because of reproduced defects; the reproductions are the tests.

**Test Files:**
- `joust/tests/purity-scanner.test.ts` — 24 tests. Six must-flip false negatives, nine must-hold constraints, six no-false-positive cases, three structural.

**Tests Written:** 24 tests covering 3 ACs
**Status:** RED — **24 failed / 0 passed**. Baseline **218/218 green**, `tsc --noEmit` exit 0. Repo-local, so all 24 run on CI with no skipIf.

### AC-3 evidence bar — every false negative reproduced against the CURRENT scanner

Poisoned `src/core/__probe.ts`, ran `tests/purity.test.ts`, removed the probe. A plain `Math.random()` control ran in the same harness each time to prove it was live:

| Probe | Current scanner |
|---|---|
| **CONTROL** — plain `Math.random()` | **CAUGHT** (`via: Math.random()`) |
| FN-1 — `/*` inside a string, violation on a later line | **MISSED** |
| FN-2 — `"a//b" + performance.now()` | **MISSED** |
| FN-3 — `` `t${Math.random()}` `` | **MISSED** |
| FN-4 — `const { random } = Math; random()` | **MISSED** |
| FN-5 — `const readClock = Date.now; readClock()` | **MISSED** |
| FN-6 — string carrying **both** `//` and `/*` (found this session) | **MISSED** |

The probe directory was removed; `src/core/` is unchanged and the tree is clean.

### The design finding: there is no single regex-impossible poison

The steer was to find one input a regex structurally cannot thread. That premise did not survive experiment. I probed six candidates — nested template literals, a regex literal containing a quote, a regex literal containing `/*`, escaped quotes, division-vs-regex ambiguity, comment markers inside a template — and the **current scanner catches all six**. Not because it understands them; because its particular stripping order happens to leave the violation standing.

So the load-bearing property is the **intersection**, and the suite is built as two halves:

- **6 MUST FLIP** — currently missed, must be caught.
- **9 MUST HOLD** — currently caught, must stay caught, each blocking a *different* regex patch:

| Hold case | The patch it blocks |
|---|---|
| apostrophe in a comment | reordering to strings-before-comments — **the natural fix for FN-1** |
| double quote in a comment | the same, via the other quote character |
| nested template literals | a template regex taught about `${}` but not nesting — **the natural fix for FN-3** |
| backtick inside a plain string | template handling that treats any backtick as an opener |
| comment marker inside a template | comment stripping that runs before template handling |
| regex literal containing `'` | a char scanner with no regex-literal awareness |
| regex literal containing `/*` | the same, in the other direction |
| escaped quote in a string | naive quote pairing that ignores backslashes |
| division resembling a regex | regex-literal detection that cannot tell `/` from ÷ |

No single pass over flat text satisfies all fifteen; a tokenizer satisfies them without trying. That is the jt1-1 Reviewer's warning — *"a rushed regex patch in a rejection loop is how new holes get added"* — encoded so the suite **refuses** a regex patch rather than merely discouraging one.

### Two structural guards
- **Unparseable source must not silently pass.** Forbids "tokenize, fall back to the old regex on error" — which passes every behavioural case while reintroducing every hole, and is the obvious shortcut.
- **Exactly one scanner sweeps `src/core/`.** Otherwise the hardened scanner lands *beside* the original, every new test goes green, and the sweep is still done by the holey one.

Neither asserts a walk, a visitor, or a library — verdicts only.

**Commit:** joust `chore/jt1-7-purity-tokenizer` — `5625398`

**Handoff:** To Dev for implementation (GREEN).
## Sm Ruling (green-phase entry)

**acorn finding ACCEPTED — ACs amended.** The story's prescription was wrong twice (absent from the rolldown-based tree; JS-only parser vs TS sources). TEA's verified alternative — the TypeScript compiler API, already a direct devDependency — is now the AC's named tool. The "51-test suite" figure corrected to the 218 baseline. TEA's two structural outcomes (no-parse-must-not-pass; exactly-one-scanner) are exactly the anti-shortcut rails the jt1-1 Reviewer demanded — endorsed.

**Riders confirmed for Dev (see Sm Note above):** the wave-4 bridge assertion + the arena-contract.ts:40 comment fix ride this branch, disclosed.

**Routing:** red → green, owner dev.

## Dev Assessment

**Implementation Complete:** Yes

**Files (joust — committed to `chore/jt1-7-purity-tokenizer`, `f02e401`):**
- `tests/helpers/purity-scanner.ts` — **new**, the single shared scanner (TypeScript compiler API)
- `tests/purity.test.ts` — migrated onto it; the regex strippers deleted
- `tests/arena.test.ts`, `tests/helpers/arena-contract.ts` — the two disclosed riders

**Flip/hold results — 24/24:**

| Group | Result |
|---|---|
| **MUST FLIP** (6 false negatives) | **6/6 now caught** |
| **MUST HOLD** (9 patch-blocking cases) | **9/9 still caught** |
| No false positives (6, incl. the real `src/core` sweep and 92KB `pictures.ts`) | **6/6 clean** |
| Structural (anti-fallback, determinism, one-scanner) | **3/3** |

**Tests:**

| Run | Result |
|---|---|
| `purity-scanner.test.ts` + `purity.test.ts` | **44/44** |
| full suite, tree present | **242/242** (RED was 24 failed on the new suite; 218 baseline unchanged) |
| CI path (`JOUST_SOURCE_DIR=/nonexistent`) | **203 passed / 39 skipped, 0 failed** |
| `npm run build` | **exit 0** |
| citation gate | 230 claims, all verified (untouched by this story) |
| scanner on 92KB `pictures.ts` | well inside the 5s bound — whole 24-test file runs in **234ms** |

**Demonstrated red (AC-3 / the jt1-1 evidence bar) — three poisons in `src/core/frame.ts`, each reverted:**

*A — a plain banned call (the bar as written):*
```
× src/core/frame.ts stays inside the boundary
AssertionError: core/frame.ts crosses the core/shell boundary via: Math.random()
```

*B — the SAME violation hidden behind FN-1 (a `/*` inside a string, then a doc comment closing the phantom block). **This is the shape the old scanner certified as clean:***
```
× src/core/frame.ts stays inside the boundary
AssertionError: core/frame.ts crosses the core/shell boundary via: Math.random()
```

*C — the alias form (FN-4), also previously missed:*
```
× src/core/frame.ts stays inside the boundary
AssertionError: core/frame.ts crosses the core/shell boundary via: destructuring Math
```

B and C are the ones that matter: they prove the hardening on the **real tree**, not just on fixtures. Poison reverted; working tree clean; 242/242.

**Portability for the fleet fold-back:** the scanner is one self-contained file with five intent-named tables and no joust-specific knowledge apart from the `src/shell` import path. centipede and tempest carry the same six holes and can port it directly.

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — scope executed directly by the Reviewer** | clean | Suite **242/242** (8 files, matching the baseline exactly); CI path **203 passed / 39 skipped / 0 failed**; `npm run build` **exit 0**; citation gate all verified (untouched by this story); scanner sweeps all three real core modules with **zero** violations — `frame.ts` 1KB/5ms, `arena.ts` 14KB/6ms, `pictures.ts` 90KB/**15ms**, far inside the 5s bound. Tree clean. | Ran directly. Worth recording that my first full-suite run reported **243** and a **failing build** — both artefacts of scratch files a specialist wrote into the repo (see the hygiene finding); the clean numbers above are post-cleanup. |
| 1 | reviewer-edge-hunter | **OUTSTANDING — no result at write-up (138 bytes)** | outstanding | Dispatched on scanner evasions, purity/determinism, node-type coverage. | **Not marked failed** — my own rule from jt1-4, where I called two slow specialists dead and was wrong twice. Its scope is the one I am best placed to cover personally (I authored the original five holes), and I ran an 28-case attack matrix first-hand. Fold in anything additional as a follow-up. |
| 2 | reviewer-rule-checker | **Not spawned — scope executed directly by the Reviewer** | clean | Core/shell rule intact and now *better* enforced; diff scope verified to be exactly the five expected files; the two SM-authorized riders verified line-by-line against their specification; citation gate untouched and green. | jt1-7's rule surface is the purity rule itself, which is the thing under test — verifying it meant attacking the scanner, not checking a list. |

**All received: Yes** — all enabled specialists accounted for: reviewer-preflight and reviewer-rule-checker scopes executed directly by the Reviewer, and reviewer-edge-hunter is recorded as **outstanding** (not failed) with its scope re-covered first-hand.

## Reviewer Assessment

**Verdict:** APPROVED

**I demanded this story in the jt1-1 review and wrote the original five reproductions. All six are fixed, and I verified every one by execution.**

### The holes I filed are closed [RULE]

Called `violations()` directly on synthetic sources, with a live control in the same harness:

| Case | New scanner |
|---|---|
| CONTROL — plain `Math.random()` | **CAUGHT** |
| FN-1 — `/*` in a string, violation on a later line | **CAUGHT** |
| FN-2 — `'a//b' + performance.now()` | **CAUGHT** |
| FN-3 — `` `t${Math.random()}` `` | **CAUGHT** |
| FN-4 — `const { random } = Math; random()` | **CAUGHT** (`destructuring Math`) |
| FN-5 — `const readClock = Date.now; readClock()` | **CAUGHT** |
| FN-6 — string carrying **both** `//` and `/*` (TEA's) | **CAUGHT** |

**Six for six.** And no false positives: clean pure code, a legitimate local shadow named `Math`, `windowSize`/`processInput` lookalikes, and prose mentioning `Date.now` in a string are all correctly silent — the class of failure that would have made this cure worse than the disease.

**The structural guards are real.** Unparseable source fails loudly with a self-describing message (`unparseable source (N syntax error(s)) — the scanner cannot certify a file it cannot read`) across three malformed inputs. The old regex path is **gone, not dormant**: `stripComments`/`stripStrings`/`BANNED`/`SHELL_IMPORT` are absent from `purity.test.ts`, which now imports the single shared scanner. Dev's decision to delete rather than deprecate was right.

**Dev's finding (c) verified fixed** — one rule per defect: `const { random } = Math` reports only `destructuring Math`, `const M = Math` only `Math aliasing`, `Date.now()` only `Date.now()`. The jt1-1 double-report class stays closed.

### The two riders — both landed as specified, nothing else rode

The diff is exactly five files (the scanner, its test, `purity.test.ts`, and the two riders). **Rider 1 verified by mutation**: with `>=` changed to `===` in `arena.ts`, the wave-4 assertion now **fails** (1 failed / 34 passed) where the jt1-4 specialist showed the same mutation previously passed every test. The channel is closed. **Rider 2** corrects the contract comment, states the 4-vs-17 split, and notes the old text was wrong — appropriate for the file a later story reads first.

### The blocking-adjacent finding — Dev's claim (a) is FALSE, proved by execution

Dev's Question finding argues the `parseDiagnostics` internal-API dependency is safe because *"the structural test covers the behaviour, so a silent break would redden rather than pass."* SM asked me to verify by execution. **It does not redden.**

Simulating a TypeScript upgrade that renames the internal field:
- Direct probe — unparseable source with **no banned token** → **silently passes**. The anti-fallback rule becomes a complete no-op.
- The structural suite → **still 24/24 green.** It does not notice.

**Root cause, precisely:** the test's fixture (`purity-scanner.test.ts:292`) is `'export const a = ((((\nexport const b = Date.now()'` — unparseable **and** carrying `Date.now()`. When detection no-ops, the scanner still walks the error-recovered tree, finds the banned call, and `hits.length > 0` passes. **The test cannot distinguish "detected unparseability" from "happened to find a banned token in the wreckage."**

**One-line fix:** drop the banned token from the fixture (`'export const a = (((('` alone). Then only genuine detection can satisfy it — I confirmed that exact input is what exposes the no-op.

This does not block: the anti-fallback rule **works today** (verified), the six ACs' reproductions are fixed, and the failure needs a TypeScript upgrade to trigger. But it is the story's own anti-shortcut rail, and Dev's stated worry — *"a TypeScript upgrade is the thing that could quietly turn the anti-fallback rule into a no-op"* — is now confirmed rather than hypothetical, with the safety net he relied on shown not to exist. **This must be fixed before the fleet fold-back**, which multiplies it across three repos.

### New evasions I constructed — a different class from the original five

I found four the scanner misses:

| Evasion | Result |
|---|---|
| `Math["random"]()` (computed member) | **MISSED** |
| `const m = {...Math}; m.random()` | **MISSED** |
| `Object.assign({}, Math).random()` | **MISSED** |
| `Reflect.get(Math,'random')()` | **MISSED** |

Weighted honestly, these are **materially less serious than the five I filed at jt1-1**, and I want to be clear why rather than inflate my own findings. The original five were **accidental** — an innocent string containing `/*` silently disabled the guard over unrelated code, which is the guard's actual threat model. All four of these require **deliberate** circumvention; nobody writes `Math["random"]()` by accident in a deterministic sim. A purity lint is defence-in-depth against absent-mindedness, not an adversary.

Also caught and worth noting on the credit side: multi-hop aliasing (`const M = Math; const r = M.random; r()`), renamed destructuring (`{random: rnd}`), `new Function()`, `globalThis[...]`, dynamic `import()`, `export * from '../shell/x'`, `import type` from shell, class fields, default params, getters, static blocks, `satisfies` expressions, and array destructuring of `Date.now` are **all caught**. The AST walk is thorough.

Cheapest close: `Math["random"]` is an `ElementAccessExpression` with a string-literal argument — a few lines, and it generalises. The spread/`Object.assign`/`Reflect` cases need dataflow and are genuinely out of a scanner's scope; better documented as known limits than half-solved.

### Rulings on Dev's remaining findings

| Finding | Ruling |
|---|---|
| (a) `parseDiagnostics` internal API | **Claim falsified — see above.** On the typescript pin: I would **not** tighten it in this story. The exposure is real but the correct mitigation is the one-line fixture fix, which makes the *test* catch the break — a pin only delays the upgrade, it does not detect the regression. Fix the fixture; leave the pin. |
| (b) No line numbers in the failure message | **Note for fold-back, do not fix now.** `node.getStart()` is free and on a 1800-line generated module the cost is real, but it is not a regression (the old scanner had the same limitation) and the fold-back is when someone is next in this file with the fleet in view. Recording so it is not lost. |
| (c) Double-report fix | **Verified fixed.** Also note his method — he caught it by *reading the demonstrated-red output*, not from a test, because TEA's assertion is `length > 0`. That is the same shape as finding (a): assertions that only check "something was reported" cannot see how many or which. A one-rule-per-defect assertion at fold-back would close both. |

**Demonstrated-red evidence (the jt1-1 bar):** verified as real output, not a claim. Poisons B and C are the ones that matter — they prove the hardening against the **real tree**, and B is precisely the shape the old scanner certified as clean.

### Findings by severity

| Severity | Issue | Location | Blocks? |
|---|---|---|---|
| MEDIUM | The anti-fallback structural test passes for the wrong reason — its fixture carries `Date.now()`, so a no-opped detection still returns a hit. Proven: with the internal field renamed, unparseable source silently passes and the suite stays 24/24. One-line fixture fix. **Must land before the fleet fold-back.** | `tests/purity-scanner.test.ts:292` | No |
| LOW | Four deliberate-evasion misses: computed member access, object spread, `Object.assign`, `Reflect.get`. Distinct in kind from the accidental holes this story fixed. `Math["random"]` is cheap to close. | `tests/helpers/purity-scanner.ts` | No |
| LOW | Failure messages carry rule names but no line numbers (Dev's (b)) — fold-back item. | `tests/helpers/purity-scanner.ts` | No |
| LOW | Assertions of the form `length > 0` cannot see rule count or identity — the shape behind both (a) and (c). A one-rule-per-defect assertion at fold-back closes the class. | `tests/purity-scanner.test.ts` | No |
| — | **Process hygiene, not a code finding:** a specialist subagent wrote `tests/_scratch-adversarial*.test.ts` into the **committed repo tree** during this review — repeatedly, while I was measuring. They inflated the suite to 243 and broke `npm run build` (tsconfig includes `tests/`). I caught it only because the count disagreed with the baseline. Removed; tree verified clean. Worth a standing instruction that review agents probe via temp dirs, never the working tree. | — | No |

**Handoff:** To SM for finish-story.
## Reviewer Addendum (post-verdict) — outstanding specialist returned

`reviewer-edge-hunter` returned at 272 s, after the verdict. **Verdict unchanged (APPROVED)** — every AC still holds and none of the below is blocking. But it found a materially larger evasion tail than I did, **and it corrected two things I got wrong**, which matter more than the new findings.

### Two corrections to my own assessment

**1. I reported `new Function()` as CAUGHT and put it on the credit side. I only tested the constructor form.** Verified now:
- `new Function("return Date.now")()` → **CAUGHT** (`new Function()`)
- `Function("return Date.now")()` (bare call, identical capability) → **MISSED**

`BANNED_CALLS` has no `Function` entry; only `BANNED_CONSTRUCTORS` covers it. Adding `Function` next to `eval` in `BANNED_CALLS` is a one-line close. My credit-side claim was incomplete and I am withdrawing it.

**2. My "no false positives" claim was too broad.** I tested a shadowed `Math` that accessed a *non-banned* member (`.r`) — which is not a real test of the property. With a banned member, a legitimate local shadow **is** flagged:
- `function f(Math: {random(): number}) { return Math.random() }` → **flagged**
- `function g() { const Date = {now:()=>1}; return Date.now() }` → **flagged**

The scanner does purely lexical name-matching on the AST with no binder resolution, so it cannot tell a shadowed local from the global. This is **overly strict, not a hole** — and in core sim code nobody shadows `Math` or `Date`, so practical impact is near nil — but "no false positives" was wrong as stated and the correct claim is "no false positives on the realistic cases I probed, with a known over-strictness on shadowed bindings."

Both errors are the same shape: I probed one form of a case and generalised to the class. The specialist probed the neighbours.

### The wider evasion tail (all verified first-hand)

| Evasion | Result |
|---|---|
| `SHELL_SPECIFIER` is case-sensitive — `import … from '../SHELL/timebase'` | **MISSED** |
| Parenthesized alias — `const M = (Math)` | **MISSED** |
| Reassignment alias — `let M; M = Math; M.random()` | **MISSED** |
| Class heritage — `class C extends Date {}` | **MISSED** |
| Optional-chain element access — `Math?.['random']()` | **MISSED** |
| `require('../shell/timebase')` | **MISSED** |
| Bare `Function(...)` | **MISSED** |

Plus the four I found (computed member, spread, `Object.assign`, `Reflect.get`) and its further list: `Math!.random()`, `= Math ?? null`, ternary, array/object-literal wrap, function return, default param, class field, IIFE.

**Two of these are closer to accidental than the rest, and are the ones I would prioritise:**
- **`SHELL_SPECIFIER` case-sensitivity** is genuinely reachable: macOS's filesystem is case-insensitive, so `'../SHELL/timebase'` **resolves and runs** while evading the shell-import ban entirely. One character (`i` flag) closes it.
- **`const M = (Math)`** differs from a caught case by one pair of parentheses — a formatter or a refactor could introduce it without anyone intending an evasion.

The rest need deliberate circumvention, which is not this guard's threat model.

### Revised fold-back list (concrete, and this is the payload of the addendum)

Before centipede and tempest port this scanner, close in roughly this order — cheapest and most reachable first:
1. `i` flag on `SHELL_SPECIFIER` (one character, genuinely reachable on macOS).
2. `Function` into `BANNED_CALLS` (one line; the bare-call code-gen hole).
3. Unwrap `Parenthesized`/`NonNull`/`satisfies` before the identifier checks (closes the parenthesized alias and `Math!.random()`).
4. `ElementAccessExpression` with a string-literal argument → run it through `BANNED_MEMBERS` (closes `Math['random']()` and the optional-chained form).
5. Fix the anti-fallback test fixture (my MEDIUM from the main assessment) so the `parseDiagnostics` dependency is actually gated.
6. Document the rest — spread/`Object.assign`/`Reflect`/binding-graph aliasing — as **known limits**. They need dataflow analysis, and a half-implemented version is worse than a documented boundary.

The specialist also confirmed the scanner is referentially transparent (function-local state only, no module-level cache), that the walk covers static blocks, decorators, tagged templates, optional chaining, `.call()`/`.apply()`, multi-declarator and `var` aliasing, and that 91,854 bytes of `pictures.ts` scan with no backtracking risk since no regex touches the source text.

**Process note:** this specialist's scratch files are the ones I found in the working tree mid-review. It states it deleted them after each run and that `git status` was clean; my measurements caught them live (suite 243 instead of 242, and a `tsc` failure), so the deletes lagged the runs. The standing instruction should be temp dirs outside the repo, not untracked files inside it — `tsconfig` includes `tests/`, so anything dropped there enters the build.

## Sm Fix Note (post-approval one-liners, user standing rule)

Applied the Reviewer's three prescribed fixes directly before merge (verdict unchanged — all were his own APPROVED-with-tail items):
1. `Function` added to BANNED_CALLS — bare `Function("…")()` was MISSED while the constructor form was banned (Reviewer withdrew his own earlier "caught" credit after the specialist probe).
2. `SHELL_SPECIFIER` now case-insensitive — `../SHELL/` resolved and ran on macOS (the accidental-evasion channel).
3. Anti-fallback fixture no longer carries a banned token — with one, a no-opped unparseability detection still returns wreckage-hits and the assertion cannot tell (the Reviewer FALSIFIED Dev's "would redden" claim by simulating a TS upgrade; drop-the-token is his one-line fix).
Both behavioral fixes are pinned as new MUST-HOLD rows (regression coverage; first row's expected value corrected after a live run — array toContain is exact-match). Suite 244/244; build clean. Remaining evasion tail (paren/nonnull/satisfies unwrap, element-access bans, dataflow limits documented, line numbers) → jt1-11.
