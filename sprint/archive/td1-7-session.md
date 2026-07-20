---
story_id: "td1-7"
jira_key: "td1-7"
epic: "td1"
workflow: "trivial"
---
# Story td1-7: Scaffold suites guard the wrong invariant — assert host 127.0.0.1 pin, not just strictPort

## Story Details
- **ID:** td1-7
- **Jira Key:** td1-7
- **Workflow:** trivial
- **Stack Parent:** none
- **Type:** chore
- **Points:** 1
- **Priority:** p2
- **Repos:** battlezone, red-baron, centipede, joust (joust added in review round 2 — see Design Deviations)
- **Branch:** `chore/td1-7-scaffold-host-pin` (cut from `develop` in all four subrepos)

## Story Description

Found by the td1-1 Reviewer (2026-07-20). The scaffold test files in battlezone, red-baron, and centipede (at lines 53, 70, and 69 respectively) assert `strictPort: true` — the guarantee td1-1 just proved insufficient — while nothing asserts `host: '127.0.0.1'`, the guarantee that actually works.

**Why this matters:** The suites currently guard the broken invariant and leave the working one unguarded. A future edit could silently delete the host pin and regress the exact bug td1-1 fixed, with a fully green suite. That is the same failure shape td1-4 found in the audit tooling (a check that cannot fail is worse than no check) and the same shape jt1 flagged repeatedly.

**The proof td1-1 established, at the socket layer, both directions:**
- held 127.0.0.1:19911 → binding vite's default host 'localhost' SUCCEEDED on ::1 (port shared, NO error)
- held 127.0.0.1:19912 → binding '127.0.0.1' gave EADDRINUSE (fails loudly)

So the pin is the load-bearing line; strictPort alone is not.

**Acceptance Criteria:**
1. battlezone/tests/scaffold.test.ts, red-baron/tests/scaffold.test.ts, and centipede/tests/scaffold.test.ts each assert `host: '127.0.0.1'` on BOTH the server and preview blocks of vite.config.ts.
2. The assertions are added to the correct locations (alongside the existing strictPort assertions).

**Open Decision (must be recorded either way):**
lobby, tempest, star-wars and asteroids have no scaffold.test.ts at all, so they carry no guard of either kind. Decision: extend the pattern to them or leave them unguarded? Record the decision with rationale rather than leaving it implicit.

## Workflow Tracking
**Workflow:** trivial
**Phase:** review
**Phase Started:** 2026-07-20T15:35:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T13:57:31Z | 2026-07-20T14:00:00Z | - |
| implement | 2026-07-20T14:00:00Z | 2026-07-20T14:30:00Z | - |
| review (round 1 — APPROVED with fold-ins) | 2026-07-20T14:30:00Z | 2026-07-20T15:00:00Z | - |
| implement (round 2 — block-anchor + joust) | 2026-07-20T15:00:00Z | 2026-07-20T15:35:00Z | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Gap** (non-blocking): `lobby`, `tempest`, `star-wars`, and `asteroids` already carry the `host: '127.0.0.1'` pin in their `vite.config.ts` (from td1-1) but have **no `tests/scaffold.test.ts` at all** — zero config assertions of any kind (not port, not strictPort, not host). This is the same "guard the broken invariant, leave the working one bare" shape td1-7 fixes in the other three repos, just one level up (no guard exists to fix). Extending the scaffold-suite pattern to four repos from scratch (deciding idiom, port/base/strictPort/host assertions each) is clearly more than 1 point — recommend SM file a follow-up story (e.g. "add scaffold.test.ts host+strictPort guard to lobby/tempest/star-wars/asteroids") rather than growing td1-7. Left unguarded for now per the story's explicit scope-discipline instruction. *Found by Dev during implementation.*

### Dev (round 2 — post-review fixes)
- **Gap** (resolved, not a new finding): SM/Reviewer identified that `joust` fell in the gap between td1-7's 3-repo scope and its 4-repo "no scaffold suite" open-decision list — it has a `scaffold.test.ts` (jt1-1) that already asserts `strictPort: true` but, like the original three, asserted nothing about the host pin. SM judged this cheap enough to fold into td1-7 rather than deferring (unlike the lobby/tempest/star-wars/asteroids gap above, which has no scaffold suite to extend at all). Fixed in round 2 — see Design Deviations. *Folded in by SM per Reviewer finding, implemented by Dev.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Judgement call 1 — regex-on-config-text, not a behavioural test:** The story flags that a behavioural test (hold `127.0.0.1:<port>`, assert the dev server fails loudly) would be a *stronger* proof than a text match, but that joust's own behavioural strictPort test (the only precedent in the fleet) is IPv4-only and was flaky before the host pin landed. Chose config-text regex, matching each of the three suites' existing idiom exactly: all three already guard `strictPort: true` with the plain `count(cfg, 'strictPort: true')` substring helper (not the fancier decoy-safe regex reserved for ports/allowedHosts), so the new host assertion uses `count(cfg, "host: '127.0.0.1'")` alongside it, same pattern, same file. Rationale: (1) the story's own AC is phrased as a vite.config.ts assertion — "assert `host: '127.0.0.1'` on BOTH the server and preview blocks of vite.config.ts" — a text-level claim, not a runtime one; (2) all three suites are 100% declarative today (no `child_process`/`net` imports); introducing a spawn-based test would be a foreign idiom and the story's own text warns that the one fleet precedent for this shape was flaky; (3) disproportionate for a 1-point chore — a behavioural test needs a 25-30s timeout and a real vite spawn per repo, three times, for a check a two-line regex already proves can fail (mutation-checked below); (4) checked the exact string does not collide with prose in the config's own comments (e.g. battlezone's comment says "with 127.0.0.1:5276 held", never the literal `host: '127.0.0.1'` token), so it isn't a decoy-vulnerable match.

- **Judgement call 2 — the open decision on lobby/tempest/star-wars/asteroids:** Confirmed all four already carry the `host: '127.0.0.1'` pin in code (td1-1) but have zero `scaffold.test.ts` of any kind. Decision: **do not extend the pattern in this story.** Authoring a whole new scaffold suite (idiom, port pin, base, strictPort, host, per-repo taken-port lists) for four repos from nothing is materially more than the 1 point td1-7 is sized for, and the story explicitly instructs filing a follow-up rather than growing scope. Filed as a Delivery Finding above for SM to raise as a new story.

### Dev (round 2 — post-review fixes, folded into this branch before merge, not a rejection)

- **Block-membership anchoring (all four repos):** Review round 1 correctly rejected the round-1 assertion shape (`count(cfg, "host: '127.0.0.1'") >= 2`) by executing the exact defect it couldn't catch: a config with both host pins moved into `server` and none in `preview` still totals 2 occurrences and passes. Rejected the "parity with the existing strictPort assertion" defence explicitly, on the grounds that copying strictPort's weak shape into the test meant to replace it reproduces the story's own thesis-violation one level up. Replaced the bare count in all four files (`battlezone`, `red-baron`, `centipede`, `joust`) with a `block(cfg, 'server' | 'preview')` helper that isolates each block's own text via `${key}:\s*{[^}]*}` (server/preview never nest braces in any of these configs — verified by extracting and printing both blocks for all four repos before writing the assertion) and asserts the pin is `toContain`-ed inside each block separately. Did NOT add decoy-safe regex escaping to the needle itself — the rule-checker verified in round 1 that `host: '127.0.0.1'` does not collide with any comment prose (comments write bare `127.0.0.1:PORT`, never the `host:` prefix), so that risk is zero and out of scope per the coordinator's explicit instruction.

- **Extended to joust:** SM/Reviewer identified joust as a census gap (has a scaffold suite, asserts strictPort, doesn't assert host — same defect shape as the original three, and cheap to fix since it's the same 5-line pattern). Cut `chore/td1-7-scaffold-host-pin` from joust's `develop` (joust was clean, not previously on a td1-7 branch) and added the identical block-anchored assertion. Noted in the test's own comment that joust's pre-existing behavioural strictPort test (spawns real vite, occupies port 5279) already implicitly exercises the *server*-side host pin — without it vite would bind `[::1]:5279` and not collide — so the new explicit assertion may read as partially redundant there; kept it anyway for consistency with the other three repos and because it separately covers the *preview* block, which the behavioural test does not touch at all.

## Dev Assessment (round 1 — superseded by round 2 below)

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/tests/scaffold.test.ts` — added assertion that `host: '127.0.0.1'` appears >=2 times in vite.config.ts (server + preview)
- `red-baron/tests/scaffold.test.ts` — same assertion added
- `centipede/tests/scaffold.test.ts` — same assertion added

No `vite.config.ts` files were touched in any repo — all three already carry the correct `host: '127.0.0.1'` pin from td1-1; this story only closes the test-coverage gap.

**Mutation-check evidence (all three observed RED, then restored clean):**
- battlezone: removing both `host: '127.0.0.1'` lines → `AssertionError: expected 0 to be greater than or equal to 2` at scaffold.test.ts:60, 1 failed / 21 passed (22 total)
- red-baron: same failure shape at scaffold.test.ts:77, 1 failed / 21 passed (22 total)
- centipede: same failure shape at scaffold.test.ts:76, 1 failed / 25 passed (26 total)
- All three vite.config.ts restored; `git diff vite.config.ts` empty in all three repos afterward.

**Tests (per repo, before -> after this story):**
- battlezone: 72 files / 1056 tests -> 72 files / 1057 tests, all green. `npm run build` green.
- red-baron: 81 files / 1361 tests + 1 todo -> 81 files / 1362 tests + 1 todo, all green. `npm run build` green.
- centipede: 38 files / 668 tests -> 38 files / 669 tests, all green. `npm run build` green.

**Branch:** `chore/td1-7-scaffold-host-pin` in all three repos (battlezone, red-baron, centipede), committed, NOT pushed (per instructions — SM handles push/PR).

**Handoff:** To review phase.

## Dev Assessment (round 2 — post-review fixes: block-anchoring + joust)

**Implementation Complete:** Yes

**Files Changed:**
- `battlezone/tests/scaffold.test.ts` — host-pin assertion rewritten from a bare `count(...) >= 2` to block-anchored `block(cfg, 'server')` / `block(cfg, 'preview')` checks, each independently asserting the pin via `toContain`. Added a `block()` helper alongside the existing `count()` helper.
- `red-baron/tests/scaffold.test.ts` — same rewrite.
- `centipede/tests/scaffold.test.ts` — same rewrite.
- `joust/tests/scaffold.test.ts` — same `block()` helper added; new block-anchored host-pin assertion added after the existing strictPort assertion (joust had no host-pin test of either shape before this round).

No `vite.config.ts` touched in any repo — confirmed `git diff vite.config.ts` empty in all four after every mutation-check cycle.

**Mutation-check evidence (4 repos x 2 cases = 8 reds observed, all restored clean):**
- Case A (remove both `host: '127.0.0.1'` lines entirely): battlezone, red-baron, centipede, joust each went RED — `server` block assertion failed first (`expected "" to contain "host: '127.0.0.1'"` at the `block(cfg, 'server')` line), 1 failed / N-1 passed in each.
- Case B (the case round-1's assertion missed — duplicate both host lines inside `server`, delete `preview`'s line, so the file-wide count stays at 2): battlezone, red-baron, centipede, joust each went RED — this time the `server` assertion passed and the `preview` assertion failed (`expected "" to contain "host: '127.0.0.1'"` at the `block(cfg, 'preview')` line), 1 failed / N-1 passed in each. This is the exact case the coordinator/Reviewer proved the round-1 assertion could not catch; confirmed it now fails.
- All four `vite.config.ts` restored from backup after each case; `git diff vite.config.ts` empty in all four repos throughout (checked after every restore, not just at the end).

**Tests (per repo, before this round -> after):**
- battlezone: 72/1057 (round 1 baseline) -> 72/1057, all green (assertion count unchanged, shape changed). `npm run build` green.
- red-baron: 81/1362+1 todo -> 81/1362+1 todo, all green. `npm run build` green.
- centipede: 38/669 -> 38/669, all green. `npm run build` green.
- joust: 20 files / 648 tests (baseline, confirmed via `git stash`) -> 20 files / 649 tests, all green (one new test added). `npm run build` green. (An unrelated pre-existing stderr line about "no claims found" prints during `npm test` in joust — a claims-audit tool, present identically in the stashed baseline run, not caused by this change.)

**Branch:** `chore/td1-7-scaffold-host-pin` in all four repos (battlezone, red-baron, centipede, joust — joust's branch cut fresh from `develop` in this round), committed, NOT pushed. `main` untouched everywhere.

**Handoff:** To review phase (round 2).
