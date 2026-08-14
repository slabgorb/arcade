---
story_id: "df1-5"
jira_key: "df1-5"
epic: "df1"
workflow: "tdd"
---
# Story df1-5: VISUAL boot check for defender scaffold

## Story Details
- **ID:** df1-5
- **Jira Key:** df1-5
- **Workflow:** tdd
- **Stack Parent:** none

**Branch:** feat/df1-5-defender-visual-boot-check
**PR:** https://github.com/slabgorb/arcade/pull/367

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T13:13:47Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T12:52:48Z | 2026-08-14T12:54:47Z | 1m 59s |
| red | 2026-08-14T12:54:47Z | 2026-08-14T13:01:04Z | 6m 17s |
| green | 2026-08-14T13:01:04Z | 2026-08-14T13:06:48Z | 5m 44s |
| review | 2026-08-14T13:06:48Z | 2026-08-14T13:13:47Z | 6m 59s |
| finish | 2026-08-14T13:13:47Z | - | - |

## Sm Assessment

Title-only story; the title is the full spec. Two acceptance criteria carry it:

- **AC1 (visual boot check):** Screenshot `http://127.0.0.1:5270/defender/` and confirm the black canvas actually renders — not merely a `200`. The mechanical byte-DIFFER check against a nonsense control already runs in `tests/canonical-serve.test.mjs`, so this AC is the *human/visual* confirmation the automated check cannot give: the SPA fallback answers `200` to everything, and DIFFER only proves the bytes are not the lobby's. Someone must look at the pixels.
- **AC2 (roster correction):** Fix `CLAUDE.md`'s game-roster line — add `defender` (Williams, 1980) and correct the "first Williams title `joust`" phrase, since Defender (1980) precedes Joust (1982). Routed here from the df1-1 review Gap finding.

Scaffold context: the four files, registrations, topology pin and citation gate all landed with df1-1 by owner decision (`sprint/archive/df1-1-session.md`); this story is verification + doc-correction, not new scaffold work.

TEA owns RED next: pin AC2 mechanically (a guard that Defender is in the roster and the false "first Williams" phrasing is gone — mutate with a *wrong* value, not the stale spelling), and specify the AC1 visual check. AC1's screenshot is a human/browser step, so RED should assert what it can (the roster prose, the serve DIFFER already covered) and leave the pixel confirmation as an explicit manual verification.

## Tea Assessment

**RED landed.** New orchestrator test: `tests/df1-5-defender-roster-doc.test.mjs` (node:test, `npm run test:orchestrator`). Verified state: **4 tests, 1 pass, 3 fail** — a proper RED with an anti-vacuity control that already passes.

### What the two ACs actually reduce to
- **AC1 (visual boot check) — MANUAL + already mechanically covered.** The byte-DIFFER of `/defender/` vs the `/banana/` nonsense control is *already* asserted by `tests/canonical-serve.test.mjs`: it derives its game list from `readdirSync(plugins/)`, so the moment df1-1 landed `plugins/defender/` the "every game path DIFFERS from the nonsense control" test began covering defender — no new test needed, and a duplicate would be redundant. The genuinely-remaining part of AC1 is the **human screenshot** of a black canvas rendering at `http://127.0.0.1:5270/defender/`; a 200 proves nothing (SPA fallback answers 200 to everything), and no automated test can sign off pixels. **Dev/Reviewer must run the browser screenshot** and record it — this is the one AC that TDD cannot close.
- **AC2 (roster correction) — the testable deliverable.** Guarded by the new file.

### The three failing AC2 guards (each fails for a real, feature-shaped reason)
1. `AC2: the roster names 'defender' with its 1980 attribution` — no defender in the roster today.
2. `AC2: the "first Williams title" clause names defender, not joust` — the clause currently reads ``the first Williams title `joust` (1982)``; the fix relocates the attribution to defender (Defender 1980 predates Joust 1982).
3. `AC2: CLAUDE.md no longer calls joust "the first Williams title"` — belt-and-suspenders ban on the literal stale phrasing.
Plus the passing control `control: the '**Games:**' roster block is real and lists the known games` — the anchor that proves the three guards evaluate against the actual roster, not an empty match.

### Rule Coverage (prose-guard discipline — this repo's recurring vacuity trap)
A prose guard goes vacuous three ways; all three are answered:
- **Matches nothing** → a control asserts the roster block is non-empty and still lists untouched games (tempest, star-wars, centipede, joust, pac-man).
- **Bans a spelling without asserting truth** → guard #2 requires the *resolution* (defender IS the first Williams title), symmetric to the ban (guard #3), so the attribution must MOVE from joust to defender, not merely vanish.
- **Satisfiable by deletion** → the positive assertions (#1 defender present with 1980; #2 defender named as first Williams) make a bare deletion of the sentence insufficient.

### GREEN scope for Dev (Julia)
Edit **only** `CLAUDE.md`'s `**Games:**` roster (lines ~21–27): add ``defender`` (1980) and move "the first Williams title" from joust to defender. **Do not** expand to the roster count/millipede drift — that is a filed Delivery Finding for a separate story; the guard deliberately does not pin the numerals. After GREEN, run `node --test tests/df1-5-defender-roster-doc.test.mjs` (all 4 green) and perform the AC1 manual screenshot.

## Dev Assessment

**GREEN landed.** Both ACs verified.

### AC2 — roster correction (the testable deliverable)
One-line minimal edit to `CLAUDE.md`'s `**Games:**` roster (lines 21–27): moved `the first Williams title` from `` `joust` `` to `` `defender` `` and added `` `defender` (1980) `` to the raster group. Reads now: ``…and four raster: `centipede` (1981), the first Williams title `defender` (1980), `joust` (1982), `missile-command` (1980) and `pac-man` (1980).``
- `node --test tests/df1-5-defender-roster-doc.test.mjs` → **4 tests, 4 pass, 0 fail** (was 1/3 in RED).
- Full orchestrator suite (`npm run test:orchestrator`) → **498 pass, 0 fail** on a stable run. (A first run showed 5 flakes; all were the vite-spawning `canonical-serve` behavioural tests racing 54xx ports under the parallel runner — `canonical-serve` alone re-ran 15/15 green, and the failures had nothing to do with the doc edit.)
- `npm run lint` (tsc --noEmit) → clean.
- **Left untouched per TEA's Delivery Finding:** the roster count numerals (`nine`, `four raster`). Adding defender makes the raster list read as five while the prose still says "four" — but bumping the numerals without also adding the absent **millipede** would just produce a different wrong count (true total is eleven; true raster is six). That reconciliation is a separate doc-accuracy story, filed below.

### AC1 — visual boot check (manual, now performed)
The mechanical DIFFER (`/defender/` ≠ `/banana/` control) is already green in `canonical-serve`. I performed the human pixel confirmation:
- **Port discipline:** 5270 is owned by sibling checkout **a-3** (`lsof` cwd → `/Users/slabgorb/Projects/a-3`), so I served THIS checkout (a-1) on a spare `--port 5292 --strictPort` and confirmed its cwd is a-1 before trusting anything — a screenshot at 5270 would have been a-3's tree ([[dev-port-owned-by-sibling-checkout]]).
- **Serve identity:** `/defender/` → `<title>Defender</title>`, `<canvas id="game">`, own module `/defender/src/main.ts`; the `/banana/` control → `<title>Slabcade</title>` (lobby SPA fallback). Distinct, as required.
- **Render proof (not just a 200):** headless Chromium (Playwright) — `canvas#game` present and visible at 1920×824, **center pixel opaque black `rgb(0,0,0,255)`** (a painted canvas, not an uninitialised transparent one), body background black. Screenshot showed a full black canvas. Only console error was a benign `favicon.ico` 404. Verification artifacts (screenshot, `.playwright-mcp/`) were transient and removed — the repo commits no boot screenshots (no sibling game does).

### Files changed
- `CLAUDE.md` (GREEN, this phase) — roster line, 2 insertions / 2 deletions.
- `tests/df1-5-defender-roster-doc.test.mjs` (RED, prior phase).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 498/498 green, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents.edge_hunter |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents.silent_failure_hunter |
| 4 | reviewer-test-analyzer | Yes | findings | 1 | confirmed 1 (LOW), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (MEDIUM, non-blocking), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via workflow.reviewer_subagents.type_design |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via workflow.reviewer_subagents.security |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via workflow.reviewer_subagents.simplifier |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 0 violations across 16 rules/21 instances |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled as skipped)
**Total findings:** 2 confirmed (1 MEDIUM non-blocking, 1 LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

A two-line documentation correction plus a well-formed prose guard. The mechanical surface is fully green (preflight 498/498, tsc clean, rule-checker 0 violations), the historical fact is correct (Defender © 1980 Williams predates Joust 1982 — independently confirmed against `plugins/defender/plugin.ts` `year: 1980`), and both acceptance criteria are satisfied — AC2 by the guard, AC1 by the manual black-canvas screenshot Dev performed on a-1's own tree (5292, after proving 5270 belongs to sibling a-3). Two findings surfaced; neither is Critical/High, so neither blocks. Both are already known and routed.

### Findings (tagged by source)

- **[DOC] `CLAUDE.md:21` — roster count now internally inconsistent (MEDIUM, non-blocking) — CONFIRMED, ROUTED.** The sentence says "nine faithful clones … four raster" but this diff inserts defender as a 5th raster game, so it now lists five raster games under "four", and "nine" undercounts the ten games the sentence lists (and the eleven actually wired). *Confidence high, severity Medium:* it is a prose-summary accuracy defect, not a code-correctness/security/race issue, so it does not meet the Critical/High blocking bar. It is also **not net-new in kind** — the count was already wrong before this diff because **millipede** was never added to the roster prose (real total was already 10, not 9). A correct fix must add millipede AND set the counts to *eleven faithful clones — five vector … and six raster*; bumping "four→five / nine→ten" alone would just mint a different wrong number and still omit millipede. TEA and Dev deliberately scoped this out (documented in the test's "DELIBERATELY NOT ASSERTED" block and the Delivery Finding) rather than half-fix it or pull a sibling game into df1-5. **I confirm that scoping decision** and do not reject over it — but per "descoped findings must be filed", it must land as a concrete backlog story, not only a session note. **Routed: SM to file a df1 doc-accuracy follow-up story at finish** (add millipede to the roster + reconcile the vector/raster/total counts to eleven).
- **[TEST] `tests/df1-5-defender-roster-doc.test.mjs:159` — clause test couples to comma placement (LOW, non-blocking) — CONFIRMED, accepted with note.** The "first Williams title" clause is isolated via `roster.split(',')`. This is correct for the committed fix (defender's clause is comma-delimited both sides) and reddens correctly on the real defect (test-analyzer verified by reverting to develop's text). The risk is a *false negative* for a hypothetical future rewording that drops the comma between defender and joust ("…`defender` (1980) and `joust` (1982)") — a correct edit could then trip `doesNotMatch(/joust/i)`. Not gameable today, purely future-fragility. Optional hardening (recorded, not required): anchor on the backtick game-name immediately after the phrase — `/first Williams title\s+`?(\w[\w-]*)`?/i` — instead of comma-splitting. Left as-is: the current guard is green and correct; churning a passing test for a hypothetical is not worth a round.

### Rule Compliance (JS lang-review + project conventions)
- **Test quality (js #8):** no vacuous/tautological assertions. The anti-vacuity control asserts on untouched roster entries (tempest/star-wars/centipede/joust/pac-man) so it cannot pass on an empty/mis-extracted block; the stale-spelling ban (test 4) is paired with a positive resolution assertion (tests 2–3) — satisfies "mutate with a wrong value, not the old spelling"; deletion of the phrase is caught by `assert.ok(firstWilliamsClause)`. All three prose-guard vacuity modes closed. **Compliant.**
- **Regex safety (js #7):** 6 static literals, no `g`-flag statefulness, `new RegExp(g)` fed from a hardcoded array (no ReDoS/user input). **Compliant.**
- **Strict equality (js #4):** `node:assert/strict` throughout; no bare `==`/`!=`. **Compliant.**
- **Node fs (js #6):** `readFileSync(..., 'utf8')` — explicit encoding. **Compliant.**
- **Orchestrator conventions (project):** file under `tests/**/*.test.mjs`, `node:test` import, zero `vitest` references, `df1-5-` story-id-prefixed name. **Compliant.**
- **Disabled specialists — no rule coverage claimed from them:** **[EDGE]**, **[SILENT]**, **[TYPE]**, **[SEC]**, **[SIMPLE]** are disabled via settings. I assessed their domains directly against this diff: no boundary/unhandled-path surface (a synchronous read-and-assert test), no swallowed errors (all failures are node:assert's own AssertionError with messages), no type/newtype surface (plain JS test), no security surface (fixed repo-relative path, no user input/network/exec), no over-engineering (4 focused tests, one helper). **[RULE]** clean, **[DOC]** and **[TEST]** as above.

### Observations (≥5)
1. **[VERIFIED]** Fact accuracy — `plugins/defender/plugin.ts` pins `year: 1980` citing MAME © 1980 Williams; Joust is 1982. The relocation of "first Williams title" to defender is factually correct, not just green.
2. **[VERIFIED]** AC1 mechanical half genuinely covered elsewhere — `tests/canonical-serve.test.mjs` derives games via `readdirSync(plugins/)` and runs the `/banana/` DIFFER control, so defender is auto-covered; the new file correctly does NOT duplicate it and correctly defers the pixel check to a human step.
3. **[VERIFIED]** "(The last two…)" parenthetical still refers to missile-command + pac-man — defender was inserted mid-list, not at the end, so that reference did not go stale. (comment-analyzer confirmed.)
4. **[VERIFIED]** No other suite pins the roster prose I touched — grep for "four raster"/"nine faithful"/"first Williams" finds no other test asserting the old text (the "five vector" hits are unrelated centipede-pause comments).
5. **[DOC]** Count inconsistency (finding above).
6. **[TEST]** Comma-split fragility (finding above).
7. **[VERIFIED]** RED→GREEN transition is real, not a broken harness — test-analyzer independently reverted CLAUDE.md to develop's text and confirmed the three AC2 guards redden with feature-shaped messages while the control stays green.

### Devil's Advocate
Argue this is broken. First attack: **the guard is theater.** A prose test that greps a markdown file proves nothing about the game — true, but irrelevant: AC2 is explicitly a documentation correction (a routed df1-1 Gap finding), and the guard's job is to stop the false "first Williams title `joust`" claim from regressing. It does that, and it resists the three classic prose-guard failures (empty match, spelling-ban-without-truth, satisfiable-by-deletion), each independently verified. Second attack: **the fact is wrong.** Is Defender really Williams' first title? Williams was a pinball house that entered video with Defender (1980), its breakthrough; Joust (1982) came two years later. Among these clones Defender is unambiguously the earlier — and the registry already pins 1980. The claim holds. Third attack: **the change makes the doc worse.** This has teeth — "four raster" now lists five, so a reader who counts is misled. But the count was already wrong (millipede absent), the sentence's purpose (naming the clones) is now *more* accurate, not less, and the inaccuracy is a numeral in a summary, self-disclosed and routed. A stressed reader loses nothing a correct reader didn't already lose to the pre-existing millipede omission. Fourth attack: **the test will betray a future editor.** Real but latent — the comma-split can false-negative on a comma-less rewording; captured as a LOW finding with a concrete hardening. Fifth: **AC1 was never really checked.** Countered by evidence: canvas present and visible at 1920×824, center pixel opaque black `rgb(0,0,0,255)` (a painted, not uninitialised, canvas), on a server proven to be a-1's own tree — not a 200, actual pixels. Nothing here rises to Critical/High.

### Deviation Audit
`## Design Deviations` is empty — no deviations logged, none observed. The count-scoping was a documented decision, not a silent deviation; it is captured as a Delivery Finding and routed above.

**Disposition:** APPROVED. No Critical/High. Two non-blocking findings, both confirmed and routed: the MEDIUM doc-count inconsistency to a filed df1 follow-up story (add millipede + reconcile counts) at finish; the LOW comma-split fragility accepted with an optional hardening note. Per "ship after N rounds; route dormant findings" — round 1, clean mechanical surface, correct fact, both ACs met — this ships.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap (non-blocking) — TEA/df1-5:** CLAUDE.md's `**Games:**` roster count is stale beyond df1-5's routed scope. The prose says "nine faithful clones — five vector … and four raster", but **eleven** games are wired (justfile `games`, vitest `GAMES`, `src/host/registry.ts`): both **millipede** and **defender** are absent from the roster prose. df1-5 adds defender (which makes "four raster" read as five), but millipede's omission and the "nine" total are a separate doc-accuracy defect. df1-5 GREEN should NOT be expanded to fix the millipede/count drift (it would pull millipede into an unrelated story); the AC2 guard in `tests/df1-5-defender-roster-doc.test.mjs` deliberately does not pin the numerals. **Recommend filing a follow-up story** to reconcile the roster count + subcounts and add millipede. Owner decides whether Dev also touches the numerals opportunistically while editing the same sentence. → **FILED as df1-7** (chore, p3, trivial workflow) at finish by SM, per the reviewer's [DOC] routing.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->