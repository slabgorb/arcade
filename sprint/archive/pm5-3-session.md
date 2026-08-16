---
story_id: "pm5-3"
jira_key: "pm5-3"
epic: "pm5"
workflow: "tdd"
---
# Story pm5-3: Resolve the redundant high-score-qualified event

## Story Details
- **ID:** pm5-3
- **Jira Key:** pm5-3
- **Epic:** pm5
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/pm5-3-resolve-redundant-hs-event-doc-oracles
- **Stack Parent:** none

## Story Summary

Resolve three documentation and redundancy issues in Pac-Man core/shell event and oracle definitions:

1. Delete the `high-score-qualified` event (unused; name entry uses state contract, not event)
2. Document `THEME_FRAMES` as test-only oracle (theme-cycle test harness, no runtime reader)
3. Document `PHASES` as test-only oracle (phase iteration, test-only; drop false runtime promise)

No behaviour change — pac-man vitest must stay green after edits.

## Acceptance Criteria

### AC1: Delete high-score-qualified event
- `HighScoreQualifiedEvent` interface removed from plugins/pac-man/src/core/events.ts:89
- `high-score-qualified` member removed from `GameEvent` union (events.ts:104)
- Event emit `state.events.push({ type: 'high-score-qualified' })` removed from plugins/pac-man/src/core/game.ts:803 (keep `state.nameEntry` assignment on preceding line)
- Silent-event entry removed from plugins/pac-man/tests/shell/audio.test.ts:121
- pac-man vitest suite passes (no tests assert the deleted event's presence)

### AC2: Document THEME_FRAMES as test-only oracle
- Comment at plugins/pac-man/src/shell/tune.ts:153 marks `THEME_FRAMES` as test-only derived oracle
- Comment notes: "theme length in engine frames, used to drive a full theme cycle in the tune/audio tests; no runtime reader by design"
- No wiring changes; no runtime reader introduced

### AC3: Document PHASES as test-only oracle
- Comment at plugins/pac-man/src/core/phase.ts:26 rewritten to remove runtime-iteration promise
- Comment marks `PHASES` as test-only oracle over the `GamePhase` union
- No wiring changes; no runtime reader introduced
- pac-man vitest suite passes

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T20:52:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T20:27:12Z | 2026-08-16T20:29:49Z | 2m 37s |
| red | 2026-08-16T20:29:49Z | 2026-08-16T20:38:09Z | 8m 20s |
| green | 2026-08-16T20:38:09Z | 2026-08-16T20:42:30Z | 4m 21s |
| review | 2026-08-16T20:42:30Z | 2026-08-16T20:52:56Z | 10m 26s |
| finish | 2026-08-16T20:52:56Z | - | - |

## Delivery Findings

No upstream findings.

### TEA (test design)

- No upstream findings during test design. The story's three premises were all
  confirmed true against the current tree (event unconsumed; both consts src-unread).

### Dev (implementation)

- No upstream findings during implementation. The deletion was clean — no
  consumer, sim, or shell path depended on the event.

### Reviewer (code review)

- **Improvement** (non-blocking): the two positive doc-honesty assertions in
  `oracle-docs.test.ts` (the `.toMatch(/test-only|no runtime reader/i)` checks at ~:73 and
  ~:93) scan the WHOLE source file, not the JSDoc block above `export const PHASES` /
  `export const THEME_FRAMES`. Affects `plugins/pac-man/tests/core/oracle-docs.test.ts`
  (anchor each positive assertion to the comment block immediately preceding its
  declaration — e.g. capture `/\/\*\*[\s\S]*?\*\/\s*export const PHASES\b/` and match the
  phrase against that slice; a shared helper / `it.each` also dedupes the two identical
  `count==1` bodies). Confirmed by reviewer-test-analyzer and reviewer-rule-checker (#25);
  low real-world risk (docs are correct now, and the robust `count==1` guard + the
  whole-file NEGATIVE assertion remain load-bearing), so routed rather than blocking.
  *Found by Reviewer during code review.*

## Design Deviations

No design deviations.

### TEA (test design)

No design deviations. All tests key on the ruled no-op branches; the doc-honesty
assertions are keyed to the exact phrase the story names (lang-review #15/#17), with
the durable claim enforced structurally (src identifier count == 1), not by prose.

### Dev (implementation)

- **Refreshed two out-of-AC shell comments that named the deleted event**
  - Spec source: context-story-pm5-3.md, AC1
  - Spec text: AC1 lists the union/interface/emit and `audio.test.ts:121` as the deletion sites.
  - Implementation: also edited `src/shell/overlays.ts:107` and `src/shell/audio.ts:101`, whose "no overlay"/"no sound" comments still listed `high-score-qualified` as a live event kind.
  - Rationale: leaving them is the exact "false comment ships green" defect this story targets (lang-review #16) — they would name a `GameEvent` member that no longer exists. Pure comment edits, no code.
  - Severity: trivial
  - Forward impact: none — comments only; no behaviour, no sibling assumption touched.

### Reviewer (audit)

- **Dev's out-of-AC comment refresh (overlays.ts:107, audio.ts:101)** → ✓ ACCEPTED by
  Reviewer: correct and necessary. Both comments listed `high-score-qualified` as a live
  event kind; leaving them would be the exact stale-comment defect (lang-review #16) this
  story exists to prevent. Comment-analyzer confirmed no other stale reference survives
  anywhere in the plugin. Pure comment edits, no behaviour.
- No undocumented deviations found. The shipped source matches every AC; the only additions
  beyond the named AC sites were the two comment refreshes above (logged by Dev) and the new
  explanatory comment at game.ts:801-804 (accurate per comment-analyzer + my own check
  against main.ts:169).

## Resolved Decisions

### Decision 1: high-score-qualified event
**Ruling:** DELETE the event (not re-document as state mirror)

**Rationale (measured against tree):**
- Event defined: plugins/pac-man/src/core/events.ts:89
- Event emitted: plugins/pac-man/src/core/game.ts:803 (`if (qualifies)` block)
- No consumer in src/; nothing reads the event
- Name entry opens off `state.nameEntry` (main.ts:169), not the event
- Driven by @shared/name-entry `stepNameEntry` verb (state-based contract)
- overlays.ts:107 comment: no overlay
- audio.ts:101 comment: no sound
- grep in src/shared: zero shared reach
- Deletion is behaviour-preserving

### Decision 2: THEME_FRAMES
**Ruling:** DOCUMENT as test-only oracle (no runtime wiring)

**Rationale (measured against tree):**
- Located: plugins/pac-man/src/shell/tune.ts:153
- Runtime readers in src/: NONE
- Test readers: plugins/pac-man/tests/shell/tune.test.ts and tests/shell/audio.test.ts
- Current doc does not promise runtime reader
- Purpose: derived oracle for theme length in engine frames
- Used by tune and audio tests to drive full theme cycle
- No runtime wiring required by design

### Decision 3: PHASES
**Ruling:** DOCUMENT as test-only oracle, drop false runtime promise

**Rationale (measured against tree):**
- Located: plugins/pac-man/src/core/phase.ts:26
- Runtime readers in src/: NONE
- Test readers: plugins/pac-man/tests/core/phase.test.ts
- Current comment (phase.ts:24): "iterate this rather than re-typing the string literals" (false runtime promise)
- Decision: rewrite comment to drop runtime promise, mark as test-only oracle
- Purpose: oracle over `GamePhase` union literals for test iteration
- No wiring required

## SM Assessment

**Premise verified against the current tree before setup.** pm5-3 is a pac-man-local
documentation/no-op cleanup (2pt, p3). All three cited symbols are documented capabilities
with **no runtime consumer** — measured, not assumed:

- `high-score-qualified` event: emitted at `game.ts:803`, in the `GameEvent` union at
  `events.ts:104`. No reader anywhere. Name entry opens off `state.nameEntry`
  (`main.ts:169`), driven by the state-based `@shared/name-entry` contract, never the
  event. `overlays.ts:107` / `audio.ts:101` comments confirm no overlay / no sound. Zero
  reach into `src/shared`.
- `THEME_FRAMES` (`tune.ts:153`): read only by `tune.test.ts` / `audio.test.ts` — already
  a test-only oracle; its doc makes no runtime promise.
- `PHASES` (`phase.ts:26`): read only by `phase.test.ts`, but its comment promises runtime
  iteration nothing honours.

**Library question raised and resolved.** No `@shared` change is in scope: there is no
shared events/phase/theme module (verified `src/shared` inventory), and per the repo's
extraction rule these per-game constructs stay local. The name-entry + highscore feature
that *does* use `@shared` is unaffected by any fork (it never depended on the event).

**Three either/or forks were user-ruled BEFORE setup** (see Resolved Decisions): delete the
event; document `THEME_FRAMES` as a test-only oracle; document `PHASES` as a test-only
oracle and drop its false runtime promise. All three are the no-op branch, keeping the
story behaviour-preserving. ACs were derived around the ruled branches (epic
`acceptance_criteria` was null).

**Behaviour-preserving contract for TEA/Dev:** `npx vitest run --project pac-man` must stay
green after every change, except `audio.test.ts:121` (which asserts the deleted event's
presence and is itself edited by AC1).

**Claim pushed:** branch `feat/pm5-3-resolve-redundant-hs-event-doc-oracles` (commit
`21af0891`, context + epic stamp) is on `origin`; story stamped `in_progress`. Sibling
probe lit.

**Routing:** tdd (phased) → TEA for RED. TEA owns the failing-test design; I have not
planned it.

## TEA Assessment

**Tests Required:** Yes
**Reason:** AC1 is a real behaviour-adjacent change (deleting an emitted event); AC2/AC3
are documentation, but the story exists precisely because the docs over-promise, so the
claims are guarded mechanically rather than chore-bypassed.

**Test Files:**
- `plugins/pac-man/tests/core/game-over-timeout.test.ts` — appended one AC1 test to the
  existing game-over lifecycle suite, reusing its local `arrangeDeath`/`forcePhase`
  harness (no duplication). Drives a real qualifying last-life death; asserts name entry
  still opens off `state.nameEntry` (behaviour preserved) AND the lethal frame's
  `state.events` does NOT carry `high-score-qualified`.
- `plugins/pac-man/tests/core/oracle-docs.test.ts` — NEW. AC2/AC3. Two layers:
  (1) durable CLAIM guards — `PHASES`/`THEME_FRAMES` each occur in `src/` exactly once
  (their own `export const`), the enforceable form of "no runtime reader"; (2) doc-honesty
  RED drivers — `PHASES` must drop the named false promise ("iterate this rather than
  re-typing") and both consts must carry a `test-only`/`no runtime reader` mark.

**Tests Written:** 6 tests (7 new assertions groups) covering 3 ACs
**Status:** RED — 4 failing / 418 passing on `npx vitest run --project pac-man`; tsc clean.

The 4 RED failures are exactly the intended drivers (AC1 event-absence; AC3 drop-promise;
AC3 test-only mark; AC2 test-only mark). The 2 structural no-runtime-reader guards and the
AC1 behaviour-preservation asserts are GREEN and stay green after Dev's change.

### Rule Coverage

| Checklist rule (typescript.md) | Test(s) | Status |
|---|---|---|
| #1 justified casts | AC1 `e.type as string` widen — commented as deliberate (survives union narrowing post-deletion) | n/a (green) |
| #15 assert the collected FACT, not a token | `PHASES`/`THEME_FRAMES` src identifier-count == 1 (structural claim guard) | green (durable) |
| #17 docs asserting a mechanism nobody re-ran | AC3 "drops the false runtime-iteration promise" | failing (RED) |

**Rules checked:** 3 of the applicable typescript.md checks directly informed test design;
#15/#17 are the story's core shape.
**Self-check:** 0 vacuous tests. Every assertion has a meaningful expectation; the doc
regexes are paired with a structural fact so they cannot go vacuously green.

**Guardrail for Dev:** the ONLY existing test that references the deleted event is
`plugins/pac-man/tests/shell/audio.test.ts:121` (the silent-events list). Removing the
`GameEvent` union member turns that literal into a TS2367-adjacent no-overlap error, so it
must be deleted alongside the emit (AC1). After the change, `npx vitest run --project
pac-man` must be fully green and `npm run lint` clean.

**Handoff:** To Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/pac-man/src/core/events.ts` — deleted the `HighScoreQualifiedEvent` interface + its doc comment, and removed `| HighScoreQualifiedEvent` from the `GameEvent` union (AC1).
- `plugins/pac-man/src/core/game.ts` — removed the `state.events.push({ type: 'high-score-qualified' })` emit; kept the `state.nameEntry = {…}` assignment and added a comment explaining name entry rides the state contract (AC1).
- `plugins/pac-man/src/shell/tune.ts` — documented `THEME_FRAMES` as a test-only oracle, "no runtime reader by design" (AC2).
- `plugins/pac-man/src/core/phase.ts` — rewrote the `PHASES` comment: dropped the false "iterate this rather than re-typing" runtime promise, marked it a test-only oracle (AC3).
- `plugins/pac-man/src/shell/audio.ts`, `plugins/pac-man/src/shell/overlays.ts` — refreshed two comments that still listed the deleted event (out-of-AC cleanup; see Design Deviations → Dev).
- `plugins/pac-man/tests/shell/audio.test.ts` — removed the `high-score-qualified` entry from the silent-events list and de-staled the test name (AC1 test edit).

**Behaviour change:** None. Name entry still opens off `state.nameEntry` on a qualifying
game-over; only the unconsumed parallel event was removed. Both oracles keep their
value; only their docs changed. Structural guards confirm each still occurs in `src/`
exactly once (no runtime reader introduced).

**Tests:** 422/422 passing (GREEN) on `npx vitest run --project pac-man`; `npm run lint`
(repo-wide `tsc --noEmit`) clean. Branch `feat/pm5-3-resolve-redundant-hs-event-doc-oracles`
pushed (`2049f141`).

**Handoff:** To Reviewer.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN 422/422, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 1 (routed, Low), dismissed 1 (race), noted 1 (Low) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — verified every new comment true; no stale ref survives |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 (Low, #25; #15 compliant, mutation-verified) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 1 confirmed & routed (Low), 1 dismissed (with rationale), 1 noted (Low)

### Finding dispositions

- **[TEST] oracle-docs.test.ts positive doc-match is whole-file, not declaration-anchored**
  (test-analyzer medium; rule-checker #25 low) — CONFIRMED, downgraded to **Low**, routed as a
  non-blocking Improvement (see Delivery Findings → Reviewer). The rule specialist cleared #15
  as compliant (the `count==1` guard is mutation-verified) and the whole-file NEGATIVE
  assertion stays robust; only the secondary positive marker is loose, and defeating it needs
  two simultaneous future edits in a small single-purpose file. Not blocking.
- **[TEST] intermittent `srcIdentifierCount` over-count (total:2 once in 14 runs)** — DISMISSED.
  The anomaly coincided with reviewer-rule-checker's LIVE mutation probes on the SAME shared
  working tree (by its own report it injected `import { PHASES }` into game.ts and reverted).
  A concurrent-subagent race, not a test defect (cf. the "parallel reviewer mutation subagents
  race the shared tree" hazard). Verified deterministic post-review: tree clean, no lingering
  import, 5/5 sequential `oracle-docs.test.ts` runs green.
- **[TEST] the two `count==1` test bodies are structurally identical (copy-paste)** — noted,
  **Low**, non-blocking; folds into the routed improvement (a shared helper / `it.each`).

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High issues. The shipped source is correct, every AC is met, and the two
load-bearing guards (the `count==1` structural "no runtime reader" check and the whole-file
NEGATIVE "false promise removed" check) are robust and were mutation-verified by the
rule-checker. The single confirmed finding is a Low, non-blocking test-robustness improvement,
routed forward.

**Data flow traced:** qualifying last-life death → `stepPlayingSim` sets `state.nameEntry`
(`game.ts:806`, `if (qualifies)`) → shell reads `game.nameEntry` at `main.ts:169` (unchanged
by this diff) → `enterInitial`/`confirmNameEntry` via `@shared/name-entry`. The deleted event
was never on this path; removing it changes no behaviour. Verified GREEN: name entry still
opens and `.qualifies` is `true` (AC1 test).

**Pattern observed:** claim-guarded documentation — the "test-only oracle / no runtime reader"
claims are enforced mechanically by an identifier-count guard, not just asserted in prose
(`oracle-docs.test.ts:38-66`). Good pattern, consistent with the repo's mechanically-enforced
citation/purity culture.

**Error handling:** N/A — no new control flow, no catch/throw, no external input; pure
deletion + comment edits + tests.

### Rule Compliance (typescript.md)

- **#1 (type-safety escapes):** COMPLIANT — the only `as` in the diff is `e.type as string`
  (`game-over-timeout.test.ts`), justified by an inline comment (widens off `GameEvent['type']`
  post-deletion to avoid TS2367). No `as any`, no `!`, no `@ts-ignore`.
- **#14 (edge computed in one branch):** COMPLIANT — the surviving `state.nameEntry` write and
  the deleted event push shared the one `if (qualifies)` branch; the real edge (nameEntry) is
  untouched. Only one `nameEntry` write site (`game.ts:806`).
- **#15 / #17 (source-text token vs claim; docs asserting an unrun mechanism):** COMPLIANT —
  the old PHASES comment WAS a #17 violation ("iterate this rather than re-typing" — a
  mechanism nothing in `src/` performs) and this story correctly removes it; the new claims are
  verified true (count==1 + grep), not merely reworded. #25 low note on the positive-marker
  scope is the routed Low finding.
- **Exhaustiveness (union-member deletion):** COMPLIANT — both `switch (event.type)` sites
  (`audio.ts:69`, `overlays.ts:93`) use `default: break`, not `assertNever`; no `case
  'high-score-qualified'`, no `Record<GameEvent['type'], …>` anywhere. `tsc` clean confirms.

### Observations

- [VERIFIED] Event fully removed with no dangling consumer — evidence: repo-wide grep leaves
  only the intentional `game.ts:804` comment + the AC1 test + sprint spec prose; no `case`
  label, no union/Record reference. Complies with #24 (retirement scoped to where AC named it;
  both shell comments swept, not one).
- [VERIFIED] Behaviour preserved — evidence: `main.ts:169` gates name entry on `game.nameEntry`
  and is NOT in the diff; AC1 test asserts nameEntry opens + `.qualifies` true, GREEN.
- [VERIFIED] "No runtime reader" claims are TRUE — evidence: `PHASES`/`THEME_FRAMES` each occur
  exactly once in `src/` (their `export const`); the tune driver loops on per-cursor
  `framesLeft` (`tune.ts:181-215`), never `THEME_FRAMES` (confirmed by comment-analyzer).
- [TEST][LOW] Positive doc-match assertions are whole-file scoped — routed improvement (above).
- [SIMPLE][LOW] The two `count==1` test bodies duplicate — noted; fold into the routed fix.
- [VERIFIED] No `@shared` change — evidence: diff touches only `plugins/pac-man/**`; the shared
  name-entry/highscore wiring is unaffected (it never depended on the event).
- [DOC] reviewer-comment-analyzer returned clean: every new/edited comment was verified TRUE
  against the call graph (name entry off `main.ts:169`; both oracles have zero `src/` readers;
  the tune driver loops on per-cursor `framesLeft`, not `THEME_FRAMES`), and NO comment anywhere
  in the plugin still names the deleted event as live. No stale event-count claim. Confirmed —
  nothing to action.
- [RULE] reviewer-rule-checker found no violations across all 30 typescript.md checks. It
  mutation-verified the `count==1` guards (three probes reddened correctly) and confirmed the
  union-member deletion is safe against both `default: break` switches. #15 COMPLIANT; the only
  note is the Low #25 positive-marker scope, routed above. Confirmed.

### Devil's Advocate

Could this deletion break something the tests don't cover? The nightmare case for deleting a
`GameEvent` member is a consumer that fans out on `event.type` exhaustively — a `switch` with
`assertNever`, or a `Record<GameEvent['type'], Handler>` literal — where losing a member either
leaves a now-uninhabited `case` label (TS2678) or a spurious excess key (TS2353). I hunted for
both: the only two `event.type` switches (`audio.ts`, `overlays.ts`) fall through a `default`,
and there is no `Record`/`satisfies` keyed on the union in the plugin. `tsc --noEmit` over the
whole repo is clean, which would have screamed at any of those. A subtler worry: does any OTHER
game or the lobby import pac-man's `GameEvent`? No — per-game event unions are isolated
(`src/shared` has no events module), and the repo-wide grep for the string is empty outside
pac-man. What about the shell that DRAINS `game.events` each frame — could dropping an event it
counted throw off a length/index assumption? The drain sites (`audio.onEvents`, `overlays`)
iterate and match by `type`; none indexes by position or asserts a count, so one fewer event is
invisible to them. Could a confused future reader trust the now-loose positive doc guard and
ship a false "test-only" comment? Yes — that's exactly the routed Low finding, and the reason I
confirmed rather than dismissed it. Finally, the flakiness scare: a source-text census that
over-counts under concurrent tree mutation is real, but the mutation here was the reviewer's own
parallel subagent, not production code; sequentially it is deterministic. Nothing rises to
Critical/High. The story does exactly what it claims and no more.

**Handoff:** To SM for finish-story.