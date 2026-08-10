---
story_id: "mc10-7"
jira_key: "mc10-7"
epic: "mc10"
workflow: "trivial"
---
# Story mc10-7: Test-hygiene for mc10-2 GROUND tests

## Story Details
- **ID:** mc10-7
- **Jira Key:** mc10-7
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-10T08:22:28Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T07:58:28Z | 2026-08-10T08:00:45Z | 2m 17s |
| implement | 2026-08-10T08:00:45Z | 2026-08-10T08:05:47Z | 5m 2s |
| review | 2026-08-10T08:05:47Z | 2026-08-10T08:16:36Z | 10m 49s |
| implement | 2026-08-10T08:16:36Z | 2026-08-10T08:18:22Z | 1m 46s |
| review | 2026-08-10T08:18:22Z | 2026-08-10T08:22:28Z | 4m 6s |
| finish | 2026-08-10T08:22:28Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

<!-- markers below: append findings, never edit others' -->
### Dev (implementation)
- No upstream findings. Scope was self-contained test hygiene; render.ts and the palette
  were correct as shipped by mc10-2 and were not touched.

### Reviewer (code review)
- **Improvement** (blocking → **RESOLVED R2**): the hardened wiring guard's `it()` title and expect
  message overclaimed what the regex verifies. Affects
  `plugins/missile-command/tests/render-ground.test.ts` (lines 189-190 title/message + line 15
  summary bullet — reworded to claim only that render.ts *calls* `hue(SLOT.GROUND)` in real code,
  not "on the fill path"). Fixed in commit `81efeff9`, re-verified clean (comment-analyzer R2).
  *Found by Reviewer during code review.*
- No further upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations yet — the story offered two options for the wiring guard (harden or
drop). Chose HARDEN, which is spec-conformant, not a deviation. Rationale in Dev Assessment.

**Reviewer audit (deviations-audited):** No deviation entries to stamp — Dev logged none, and
the harden-vs-drop choice is a spec-offered option, not a deviation. Reviewer ACCEPTS the
harden choice (rule-checker confirmed the guard is a valid whole-file wiring guard, #25). The
one issue is prose-accuracy in the guard's title, captured as a Delivery Finding above and in
the severity table below — not a design deviation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/missile-command/tests/render-ground.test.ts` — test hygiene only, no production code.

Four RED-phase artifacts detensed / hardened (story title is the spec; no ACs in YAML):
1. **Module header (lines 3-16)** — rewrote the stale RED-phase narration. Removed the
   verbatim quote of render.ts's DELETED "…so it is not drawn" sentence and the "CURRENTLY
   SKIPS" claim; the "WHY THIS IS RED" block became "WHAT THESE TESTS PIN", present tense
   (mc10-2 shipped the draw). render.ts now paints from `hue(SLOT.GROUND)`, stated as fact.
2. **`it()` title (line ~113)** — dropped the false "— today none does" clause (the test
   passes now) and detensed its assertion message ("currently skips COL001" → "in the COL001
   colour").
3. **Wiring-rationale comment (lines ~182-186)** — removed "while explaining it is NOT drawn";
   now explains the comment-strip AND the decoy risk it guards against.
4. **Wiring guard #25 — HARDENED (the story's first option), not dropped.** Old assertion
   matched a bare `/\bSLOT\.GROUND\b/` against comment-stripped code, which passed on a decoy
   `const _decoy = SLOT.GROUND`. New assertion matches the paint expression
   `/\bhue\(\s*SLOT\.GROUND\s*\)/`. Proved non-vacuous out of band: matches real render.ts
   (`ctx.fillStyle = hue(SLOT.GROUND)`, render.ts:91) → true; matches the decoy scenario
   (`const _decoy = SLOT.GROUND` + real draw `hue(SLOT.SKY)`) → false. So the guard now
   reddens on exactly the decoy that defeated it.

**Why harden and not drop:** dropping was the spec's second option (redundant with the
behavioural `groundMarks` tests, which would also fail the decoy since no fillRect would carry
the GROUND colour). Kept a wiring guard because it's the cheapest, most localised proof that
render.ts *reads* the slot via the file's pervasive `hue(SLOT.*)` idiom, and hardening closes
the hole without adding coverage the behavioural tests already own. Reviewer may still prefer
drop-as-redundant — flagging the choice, not asserting it's the only right one.

**Tests:** missile-command project 1087/1087 passing (GREEN). Repo-wide `npm run lint`
(tsc --noEmit) clean.
**Scope guard:** `git status` shows only the test file under src/plugins changed (the epic
YAML status stamp + untracked context file are SM tracking artifacts, not code).
**Branch:** feat/mc10-7-test-hygiene-ground-tests

**Handoff:** To review (Obi-Wan / Reviewer).

### Dev rework — round 1 (addresses Reviewer [DOC] finding)
Reviewer REJECTED on one finding: the hardened guard's `it()` title/message and the header
summary bullet overclaimed "on the fill path" / "set the fill from", asserting a `ctx.fillStyle`
assignment the regex `/\bhue\(\s*SLOT\.GROUND\s*\)/` never verifies. Fixed all three phrasings
to claim only what the regex proves — render.ts *references the GROUND colour via a
`hue(SLOT.GROUND)` call in real code* (not a comment, not a bare-name decoy):
- line 15 summary bullet: "paints via hue(SLOT.GROUND), not a decoy" → "calls hue(SLOT.GROUND) in real code"
- line 189 it() title: dropped "on the fill path" → "references the GROUND colour via a hue(SLOT.GROUND) call in real code (not a comment or a bare-name decoy)"
- line 190 message: "must set the fill from" → "must read the GROUND colour via a hue(SLOT.GROUND) call"
No assertion/behaviour change; regex unchanged. missile-command 1087/1087 GREEN, lint clean.
Commit `81efeff9`. **Handoff:** back to review.

## Sm Assessment

**Story:** mc10-7 — test-hygiene follow-up filed by the mc10-2 Reviewer. 1 pt, trivial, p2.
Scope is `plugins/missile-command/tests/render-ground.test.ts` ONLY — no production code change.

**Premise verified against HEAD (`1981bd81`) before setup.** This is a Reviewer-filed
follow-up, so the standing rule is: probe HEAD, because an intervening merge can silently
close the concern. It has NOT been closed — all four claims are live in the file today:
1. Line 10 — header quotes render.ts's DELETED "…so it is not drawn" sentence as verbatim.
2. Line 116 — `it()` title "wave 1: … — today none does" is FALSE; the test now passes
   (mc10-2 drew the GROUND band), so the "today none does" clause describes a state that
   no longer exists.
3. Line 186 — wiring-rationale comment states the header is "explaining it is NOT drawn".
4. Lines 190-191 — the `#25` "references SLOT.GROUND" guard matches `/\bSLOT\.GROUND\b/`
   against comment-stripped render.ts. It is still decoy-defeatable: a bare
   `const _decoy = SLOT.GROUND` anywhere in code would satisfy it while the real paint used
   another slot. Task: re-anchor to the paint expression, or DROP it as redundant with the
   behavioural fillRect-colour tests above it.

Because the description is current and accurate, no correction block was needed; ACs were
copied verbatim from the epic YAML.

**Routing:** trivial (phased) → Dev owns the `implement` phase. No RED author — Dev edits the
test file directly (comment detense + guard harden/drop), keeps the suite green, then Review.

**Board notes:**
- Sibling probes clean for mc10-7 (no remote branch, no other checkout's session). Claim
  branch pushed empty so a sibling now sees it.
- Open non-draft PR #186 is a-2's pm4-1 (epic pm4 kickoff, live session in a-2) — not tracked
  in this checkout, not mine to merge or close.
- `sm-setup` named the branch `feat/…` though the story `type: chore` (convention is
  `chore/…`). Left as-is: Reviewer diffs branch content against `origin/develop`, not by name;
  not worth a re-cut on a 1-pt trivial.

---

**Branch Strategy:** gitflow (feat/mc10-7-test-hygiene-ground-tests)

## Subagent Results

Enabled on this project (`workflow.reviewer_subagents`): preflight, comment_analyzer,
security, rule_checker. The other five are disabled → pre-filled Skipped/disabled.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1087/1087 pass, lint clean, 0 smells, scope confined) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (test quality self-assessed below) |
| 5 | reviewer-comment-analyzer | Yes | R1 findings → R2 clean | R1: 1 confirmed overclaim → FIXED; R2 re-dispatched on the reword: clean | confirmed 1 (R1), all resolved R2 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (linear-time regex, static path, no injection) | N/A — carried fwd (regex byte-identical in R2) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (27 rules, 34 instances, 0 violations) | N/A — carried fwd (no code/rule surface changed in R2) |

**All received:** Yes (4 enabled returned R1; comment-analyzer re-dispatched R2 → clean; security/rule-checker/preflight carried forward — the R2 delta was a 3-line prose reword with the regex byte-identical, touching only the comment-analyzer domain)
**Total findings:** 1 confirmed in R1 (guard-title overclaim), FIXED in R2 and re-verified clean; 0 dismissed, 0 deferred, 0 open

### Round 2 (rework re-review)
Dev reworded the three overclaiming phrasings (session Dev rework note, commit `81efeff9`). The
R2 delta `git diff 58efba7e..HEAD` is exactly those 3 comment/title/message lines; the regex
`/\bhue\(\s*SLOT\.GROUND\s*\)/` and all assertions are byte-identical. I re-dispatched
comment-analyzer (the only changed domain; a reword can ship a fresh lie) — it returned CLEAN:
each phrasing now claims only that render.ts *calls* `hue(SLOT.GROUND)` in real code, with the
"(not a comment or a bare-name decoy)" parenthetical verified against the comment-strip + the
`hue(` anchor. I independently re-ran the full project (1087/1087) and lint (clean). Security,
rule-checker and preflight are carried forward: their domains (ReDoS/static-path, project rules,
mechanical green) are untouched by a prose-only delta.

### Reconciliation note — comment-analyzer vs rule-checker on the guard
Not a contradiction. rule-checker (#25) judged the guard *mechanism* compliant: it is a valid
whole-file WIRING guard ("is `hue(SLOT.GROUND)` called anywhere in real code"), and render.ts
has exactly one such call (render.ts:91), so nothing else could be miscredited. comment-analyzer
flagged the guard's *title prose* ("on the fill path"), which promises the regex verifies a
`fillStyle =` assignment — it does not. The guard is sound; its name overstates it. The finding
is about the words, not the assertion's correctness.

### Rule Compliance
Rules surface for this diff (a Vitest test file reading `src/shell/render.ts`; no production
code). Enumerated by rule-checker (27 rules / 34 instances, 0 violations) and re-checked here:
- **Core/shell boundary (CLAUDE.md, rule #27):** COMPLIANT. The test lives in
  `plugins/missile-command/tests/` and reads `src/shell/render.ts`. `purity.test.ts` +
  `helpers/purity-scanner.ts` scan only `src/core/**` — this file is outside the swept
  population by construction. Verified by reading the scanner's `coreDir` scope, not inferred.
- **Source-text guard genre (rules #15/#24/#25):** COMPLIANT mechanism. The bare-token guard
  (`/\bSLOT\.GROUND\b/`) is replaced with the anchored call form (`/\bhue\(\s*SLOT\.GROUND\s*\)/`),
  which is precisely what rule #15 ("match the CLAIM, not a TOKEN") demands. Whole-file scope is
  correct for a wiring guard (#25). Detense of RED-phase language is complete file-wide (#24) —
  swept for `RED|reddens|currently skips|not drawn|today none does|no on-screen`, no survivors.
- **Test quality (rule #8, self-assessed since test_analyzer disabled):** COMPLIANT. Both edited
  `it()`s use explicit `.toBeGreaterThan(0)` / `.toMatch(re)` with descriptive messages; no
  `as any`, no `.only`/`.skip`, no vacuous `toBeTruthy`. Non-vacuity of the hardened guard was
  independently mutation-proven (matches render.ts:91; reddens on `const _decoy = SLOT.GROUND`
  + real draw `hue(SLOT.SKY)`).
- **Module/import convention (rule #5):** COMPLIANT. `from '../src/shell/palette'` (no `.js`) is
  pre-existing, untouched, and matches sibling test files — no regression.
- **Comments assert re-run mechanisms (rule #17):** the decoy-rationale comment is accurate
  (mutation-confirmed); the guard *title* overclaims — the single confirmed finding below.

## Reviewer Assessment

**Verdict:** APPROVED (round 2). Round 1 was REJECTED on one `[DOC]` finding, now FIXED and
re-verified clean — full history preserved below for the archived record.

**Data flow traced:** `render.ts` source text (repo-controlled, read via `readFileSync` from a
static `import.meta.url`-derived path) → comment-stripped `code` → `.toMatch(regex)`. No user
input, no runtime state; safe.
**Pattern observed:** hardened source-text wiring guard anchored to the call form
`/\bhue\(\s*SLOT\.GROUND\s*\)/` at `plugins/missile-command/tests/render-ground.test.ts:189-190`
— a valid whole-file wiring guard (rule-checker #25), non-vacuity mutation-proven.
**Error handling:** a missing `render.ts` throws at collection (fails loud); no silent paths.
**Handoff:** To SM for finish-story.

**Dispatch tag coverage (all 8):**
`[EDGE]` disabled/skipped · `[SILENT]` disabled/skipped · `[TEST]` disabled — self-assessed,
tests non-vacuous & clean · `[DOC]` R1: 1 confirmed (guard-title overclaim) → **R2 FIXED, clean** ·
`[TYPE]` disabled/skipped · `[SEC]` clean (no ReDoS, static path) · `[SIMPLE]` disabled/skipped ·
`[RULE]` clean (0 violations across 27 rules).

### Round 1 finding — RESOLVED in round 2
| Severity | Issue | Location | Fix | Outcome |
|----------|-------|----------|-----|---------|
| [LOW] `[DOC]` | The hardened wiring guard's `it()` title said it "paints via hue(SLOT.GROUND) **on the fill path**" and its expect message said render.ts "**must set the fill from** hue(SLOT.GROUND)", but the regex `/\bhue\(\s*SLOT\.GROUND\s*\)/` only proves the call appears in comment-stripped code — it does NOT verify assignment to `ctx.fillStyle`. Re-introduced the exact claim > verification defect that mc10-7 exists to remove. | `render-ground.test.ts:189-190` + bullet `:15` | Reword all three phrasings to claim only that render.ts *calls* `hue(SLOT.GROUND)` in real code. | **FIXED** commit `81efeff9`; comment-analyzer R2 re-review CLEAN; 1087/1087 GREEN, lint clean. |

**Why that LOW-severity prose issue blocked THIS story in round 1 (proportionality):** normally a lone LOW/prose
finding on a 1-pt trivial is an approve-with-note, not a block. The exception applies here: the
story's *acceptance intent is claim accuracy* — it was filed because test #25's name/claim
outran what it verified. Shipping the fix with a fresh instance of that same defect in the
guard's own title fails the story's purpose. The correction is one line, unambiguous, and Dev
is in-session — cheaper to fix in-flight than to approve-and-refile. Per the jt8-6 lesson, the
rework brief tells Dev what the claim should STOP asserting (the fill-assignment) and what it
MAY assert (the call exists in real code), so this does not become a value-tweak treadmill.

**Observations (≥5, no rubber-stamp):**
1. **VERIFIED GOOD** — Scope is exactly the test file; no production code touched (matches the
   story's "no production code change" constraint). preflight + my own `git diff` confirm.
2. **VERIFIED GOOD** — The four flagged staleness items are all genuinely fixed: deleted "not
   drawn" verbatim quote gone, false "today none does" title gone, "NOT drawn" rationale gone,
   guard hardened. File-wide RED-phase sweep is clean (rule-checker #24 + my own grep).
3. **CONFIRMED FINDING `[DOC]`** — the guard title/message overclaim "on the fill path" (severity
   table above). Independently identified by me and by comment-analyzer (medium confidence).
4. **VERIFIED GOOD** — Guard non-vacuity mutation-proven three ways (by me, preflight, and
   rule-checker): the new regex reddens on the precise decoy that defeated the old one, and does
   not match the `hue` *definition* line.
5. **VERIFIED GOOD** — Comment accuracy: the new header's claim that render.ts "paints from
   hue(SLOT.GROUND) right after the sky clear and BEHIND the structures" checks out against
   render.ts:83 (sky clear) → :91-92 (GROUND fill) → structures after (comment-analyzer, high
   confidence).
6. **VERIFIED GOOD** — Core/shell boundary not violated; the test reads shell, and the purity
   scanner sweeps only core. Regex is linear-time (no ReDoS).

### Devil's Advocate
Assume this diff is broken. Where would it bite? First, the whole change is comments and one
regex in a test file — so the danger is not a runtime crash but a guard that *lies*, which is the
worst kind of test because it fails green. The hardened regex `/\bhue\(\s*SLOT\.GROUND\s*\)/` is
matched against the *whole* comment-stripped render.ts. Imagine a future refactor that hoists the
colour: `const groundHue = hue(SLOT.GROUND)` at module top, then `ctx.fillStyle = groundHue` in
draw. The band still draws, the regex still matches — fine. But now imagine a regression that
*deletes* the fillRect but leaves `const groundHue = hue(SLOT.GROUND)` dangling: the wiring guard
stays GREEN while the GROUND vanishes. Does anything catch it? Yes — the behavioural `groundMarks`
tests assert a fillRect actually carries the GROUND colour, so they go red. So the guard's blind
spot is fully backstopped, which is exactly why its over-specific title ("on the fill path") is a
documentation problem and not a coverage hole. A confused maintainer is the real victim: reading
"on the fill path (a real expression, not a comment or a decoy)", they may trust the guard to
prove the fill assignment and, on seeing it green, not check the behavioural tests — precisely the
over-trust that let the original #25 decoy slip through mc10-2. What about a stressed filesystem?
`readFileSync` on a missing render.ts would throw at collection and fail loudly — acceptable. What
about the regex on hostile input? render.ts is repo-controlled, not user input, and the pattern is
linear-time (security confirmed) — no ReDoS. What if render.ts legitimately had *two* GROUND
paint sites? rule-checker confirmed exactly one exists, so the whole-file match is unambiguous
today, though the guard would silently accept a second (again backstopped behaviourally). The
conclusion the devil's advocate reaches is the same as the review: the mechanism is sound and
well-backstopped; the only real defect is that the guard's *name promises more than it checks*,
and in a story whose reason for existing is name-vs-check alignment, that must be fixed before it
ships.

### Round 2 conclusion — APPROVED
Dev's round-2 reword (commit `81efeff9`) addresses the sole finding exactly: the guard's title,
message and header bullet now claim only that render.ts *calls* `hue(SLOT.GROUND)` in real code —
no "fill path", no "set the fill from". comment-analyzer was re-dispatched on the reword and
returned CLEAN (no fresh inaccuracy; the "(not a comment or a bare-name decoy)" parenthetical
verified against the comment-strip and the `hue(` anchor). The R2 delta is prose-only, the regex
and every assertion are byte-identical, so security/rule-checker/preflight carry forward. I
independently re-ran the full missile-command project (1087/1087) and lint (clean). All four
story-title hygiene items are delivered, no production code changed, the guard is now both sound
and accurately named. Nothing blocks.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.