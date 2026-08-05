---
story_id: jt9-16
jira_key: jt9-16
epic: jt9
workflow: tdd
---
# Story jt9-16: The two thud paths return OPPOSITE carry — the ROM's collision scan continues after SNETHD and ABORTS after SNPTHD

## Story Details
- **ID:** jt9-16
- **Jira Key:** jt9-16
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none (trunk-based — commits landed directly on `main`: c26486c claim, e69924d RED, 7ec78bc GREEN)
- **PR:** none (trunk-based — no PR; work already on origin/main)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T06:44:08Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T06:15:21Z | 2026-08-05T06:18:53Z | 3m 32s |
| red | 2026-08-05T06:18:53Z | 2026-08-05T06:32:55Z | 14m 2s |
| green | 2026-08-05T06:32:55Z | 2026-08-05T06:37:00Z | 4m 5s |
| review | 2026-08-05T06:37:00Z | 2026-08-05T06:44:08Z | 7m 8s |
| finish | 2026-08-05T06:44:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Improvement, non-blocking] Liveness is asserted from a synthetic 3-body fixture, not observed in seeded play.** The RED suite stages the pile-up directly (three frozen bodies at one plantHeight). The story notes the machine reaches this only in a wave-6 swarm, and the SM sidecar rule "a feature must be observed in play" wants a seeded-demo + ordinary-input witness alongside the synthetic one. I did NOT add a seeded-swarm test because forcing a deterministic 3-overlap-on-one-object frame out of a seed is fragile and a flaky liveness test is worse than none. The synthetic 3-body fixture is exactly the observability the story itself specifies ("a fixture needs a person tie plus a third body still overlapping the same object on the same frame"). Candidate for Dev/verify to strengthen if a stable seed+frame can be found.
- **[Question, non-blocking] Determinism re-baseline may be needed at GREEN.** The story warns: "EXPECT A DETERMINISM RE-BASELINE if the abort turns out to suppress contacts that currently resolve." Once Dev makes the player-thud branch abort, any golden/attract-mode determinism fixture that happened to rely on a post-tie contact resolving will shift. That is the ROM-correct outcome — re-baseline the golden, do NOT restore the `continue` to keep it green. Flag it in the Dev deviation log if it fires.

### Reviewer (code review)
- No upstream findings during code review. TEA's two non-blocking findings above are reviewed and I concur: the synthetic-only liveness is acceptable (it is the observability the story itself specifies, and a seeded 3-body-pileup fixture would risk flakiness), and the determinism re-baseline did not fire (full joust suite green with no golden edited).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)
- **No Design Deviations were logged by TEA or Dev, and I confirm none exist.** The GREEN fix implements the story's specced direction exactly (SNPTHD aborts, SNETHD continues) — the ROM verification found the story's premise CORRECT, so there was nothing to deviate from. → ✓ ACCEPTED.
- **README test-count bump (119→121 files, ~2658→~2747 tests) at `plugins/joust/README.md:48`** — documented by Dev in the Dev Assessment, not a spec deviation. It is a mechanical consequence of adding two guarded test files; `tests/audio-seam-scope.test.ts` (jt5-7 AC5) derives and enforces the file count, so the bump is REQUIRED for green, not optional. The adjacent indicative test count is unguarded and was refreshed for honesty on the same line. → ✓ ACCEPTED.

## Dev Assessment

**Story:** jt9-16 (3pt, joust, tdd). GREEN. One-branch fix; full joust suite green; typecheck clean. Handing to the Thought Police (Reviewer).

**The change** (`plugins/joust/src/core/demo.ts:1428`). The bounce branch of `collisionPass` pushed the thud cue then unconditionally `continue`d for both cues. Per Leeloo's ROM-verified direction, SNPTHD (person tie) must ABORT the outer object's remaining scan while SNETHD (enemy thud) continues. Replaced the bare `continue` with:
```
if (isEnemyThud) continue
break
```
`break` exits the inner `j` loop so the outer `i` advances to the next object — the port of the driver's `BCS 20$` (:4886) → `20$`/`25$ LDU PLINK,U` (:4874) outer-walk advance on SNPTHD's set carry (:5059 `ORCC #$01`). `enemy-thud` keeps `continue` (SNETHD clears carry, :4947 `ANDCC #$FE`, scan continues). The `bounced` map is set for both parties BEFORE the branch, so a tie still bounces the pair apart (ROM `OSTXTP` restories then sets carry) — only the *scan continuation* changes. Minimal: no new helpers, no touched neighbours. Comment cites the six decisive ROM lines.

**Determinism re-baseline (TEA's Question finding): DID NOT FIRE.** The full joust project is green with no golden changes — the abort suppressed no contact any existing attract-mode/determinism fixture relied on. No golden edited, no `continue` restored to force green.

**Second edit — the guarded test-file count.** Adding the two RED files moved the count `walk()` + the vitest pattern derive from 119 to 121, which `tests/audio-seam-scope.test.ts` (jt5-7 AC5) guards against the joust README. Bumped `README.md:48` `119 → 121` (and refreshed the adjacent *indicative* test count `~2658 → ~2747` on the same line for honesty; that number is unguarded). This surfaced at GREEN, not RED, only because TEA ran the two files in isolation — noting it so the Reviewer isn't surprised the README moved.

**Verification (testing-runner):**
- `jt9-16-dev-green` — full joust project: 121 files / 2747 passed, 1 failed (the README count only).
- `jt9-16-dev-green-2` — after the README bump: **121 files / 2747 passed, 0 failed.** Both jt9-16 files green, jt5-7 AC5 green.
- `npm run lint` (repo-wide `tsc --noEmit`): clean.

**For the Reviewer:** the behavioural claim is the 1-vs-2 `player-thud` discriminator (SNPTHD aborts) with the SNETHD control staying at 2 and the two-body null case at 1 — all in `demo-jt9-16.test.ts`; the opposite-carry ROM provenance is pinned independently in `demo-jt9-16-source.test.ts`. The one behavioural line changed is `demo.ts:1428`.

## Tea Assessment

**Story:** jt9-16 (3pt, joust, tdd). RED phase complete. One failing behavioural test pins the defect; a source companion proves the port direction is faithful. Handing to Dev (Korben) for GREEN.

**Port direction — VERIFIED against the ROM (the story's "settle this first").** I read JOUSTRV4.SRC:4855-4903 (the PLYCOL scan driver) and :4930-5060 (both thud tails) directly. Confirmed, opposite carry:
- The driver walks an OUTER pointer U (`:4874 LDU PLINK,U`) and an INNER pointer X from U forward (`:4880 LEAX ,U` / `:4881 LDX PLINK,X`) — exactly this port's `for (i) for (j=i+1)`, U = earlier `a`, X = later `b`.
- **SNETHD** (enemies, :5019) → `OSTH11 JSR OSTBMP` → `:5029 JMP HITEM2` → `:4947 HITEM1 ANDCC #$FE` **clears carry** → `:4886 BCS 20$` NOT taken → `:4897 45$ LDX PLINK,X` → **inner scan CONTINUES**.
- **SNPTHD** (persons, "BOTH ON SAME LEVEL" :5010 → `1$` :5014) → `OSTXTT JSR OSTXTP` → `:5054 BRA OSTX12` → `:5059 ORCC #$01` **sets carry** → `:4886 BCS 20$` taken → `20$`/`:4874 LDU PLINK,U` **advances the OUTER walk**, abandoning U's remaining inner partners. Second HITEM site (:4901-4903) splits the same way (`BCC 40$` continue / `BRA 20$` abort). So the story's direction is CORRECT — no deviation. The surprising bit is real: `OSTX12`'s "REG.U GUY IS DEAD" comment fires on a tie where `OSTXTP` killed nobody; the carry-abort convention is reused as "advance past U."

**The defect, located.** `plugins/joust/src/core/demo.ts:1428-1429`: the bounce branch pushes `isEnemyThud ? 'enemy-thud' : 'player-thud'` then unconditionally `continue`s. For `player-thud` (SNPTHD) the ROM ABORTS U's remaining scan instead. The GREEN fix: on the `player-thud` bounce, break the inner `j` loop so the outer `i` advances (ROM `BCS 20$` → next U); leave `enemy-thud` on `continue`. (Direction only — the exact break/flag shape is Dev's call; the tests pin behaviour, not structure.)

**Observability (why 3 bodies).** With two eligible entities the inner loop is empty after the first pair regardless of carry, so continue and abort are indistinguishable — that is precisely why jt5-4's two-body fixtures descoped this. AC-3 pins that null case; AC-1/AC-2 use a 3-body pile-up (A overlaps B and C at 10px; B–C 20px apart so broadPhase keeps them unpaired; array order `[A,B,C]` so the tie is visited first). `narrowPhase` is X-blind (jt9-14 AC-5) so broadPhase alone gates the B–C separation. SNPTHD is modelled as three PLAYERS (literally "PLAYERS COLIDE", :5014); the SNETHD control as three PTEROS (both side with the enemies, :4961). Both use the simple `p.entity` shape; the enemy `p.enemy` nested shape was avoided deliberately.

**RED evidence (testing-runner, RUN_ID jt9-16-tea-red):** 11 passed / 1 failed.
- ❌ **AC-1 headline** — "a knight ties one body while a THIRD still overlaps it" — `expected 1, received 2`. THE RED: the port resolves A–C after the A–B tie. Fails for exactly the defect, kills the do-nothing mutant.
- ✅ AC-1 no-death guard (a tie leaks no `*-death`), ✅ AC-2 enemy-thud control (2 enemy-thuds — guards a fix that aborts BOTH cues), ✅ AC-3 two-body null case, ✅ all 8 source-provenance cases.

**Non-vacuity.** AC-1's assertion is a count discriminator (1 vs 2), not `is_some`. AC-2 is the same harness producing the OTHER count (2), so the fixture demonstrably CAN emit two thuds — AC-1's `1` is a real suppression, not a fixture that never reaches a second pair. AC-3 proves the third body (not some two-body artefact) is what the test turns on.

**Rule Coverage** (`.pennyfarthing/gates/lang-review/typescript.md` — no `.claude/rules/*.md`, no `SOUL.md`, no `plugins/joust/CLAUDE.md`):
- *Meaningful assertions / no vacuous tests:* every case asserts a concrete count or an exact array (`toBe(1)`, `toBe(2)`, `toEqual([])`) — no `is_some`/`assert(true)`/`let _ =`.
- *Determinism / purity:* fixtures are frozen (napped) and stepped one frame; `collisionPass` is pure over the process list. No clock, no `Math.random`, seed pinned (`0x1234`).
- *Provenance / double-entry (project idiom):* the behaviour file and the independent source-reader file are separate (jt1-10 pattern); the source file imports only `tests/helpers/joust-source.js`, never `src/`, so the two derivations cannot collapse.
- *Graceful degradation:* every source-reader case is `it.skipIf(!vendoredAvailable)` (jt1-3 pattern) — the byte-reads skip where the gitignored ROM is absent, the behaviour suite runs everywhere.

**For Korben (Dev):** the fix is a one-branch change at `demo.ts:1428-1429` (abort the outer object's scan on `player-thud`, keep `enemy-thud` continuing). Watch the two Delivery Findings above: a determinism golden may need a ROM-correct re-baseline (do NOT restore `continue` to keep it green), and the liveness observation is synthetic-only by design.

## Sm Assessment

**Story:** jt9-16 (3pt, p3, joust epic jt9, tdd). Setup complete, claim pushed, handing to TEA for RED.

**Board check (all clean before claim):**
- Sibling probes: no `origin/feat/*jt9-16*` branch and no sibling `.session/jt9-16` file existed pre-claim (a-3 was on cp7-4). `origin/main` had moved (`2a3b16c..5684209`) — fast-forwarded before claiming.
- Merge gate clean: `gh pr list -R slabgorb/arcade --state open` returned `[]`.
- Claim now pushed both ways (monorepo, one remote): commit `c26486c` on `main` (context + epic stamp), and empty branch `feat/jt9-16-thud-paths-opposite-carry` (tip == main) so the sibling branch-probe lights up.

**Premise verification (per the stale-description rule):** The description carries falsifiable anchors, so I confirmed the port target is real — `plugins/joust/src/core/demo.ts:1368` holds the exact inner pair loop `for (let j = i + 1; j < eligible.length; j++)` the story names. The ROM citations (JOUSTRV4.SRC:4886/4947/5029/5054/5059) came from jt5-4's TEA Delivery Finding and are self-consistent; I did NOT re-derive them — the story itself instructs the implementer to "VERIFY THE PORT DIRECTION BEFORE IMPLEMENTING" against :4885-4886 and :4867-4890, which is TEA's job, not mine.

**Acceptance criteria:** genuinely `null` in `sprint/epic-jt9.yaml` (confirmed via `pf sprint story field jt9-16 acceptance_criteria` → `null`) — nothing dropped by setup. This is the jt8-6 shape: TEA derives ACs from the story title + Problem during RED.

**Status:** `sm-setup` left the story at `backlog` (unconditional, as always) — stamped `in_progress` myself and verified.

**For Leeloo (TEA) — the two things this story turns on:**
1. **Port direction is load-bearing and must be verified first.** The carry read at `:4886 BCS 20$` restarts the OUTER walk (`20$`, a fresh `LDU PLINK,U` at :4874), NOT the inner loop. So SNPTHD (person tie) must ABORT the current object's whole remaining scan while SNETHD (enemy thud) CONTINUES — a break-inner vs restart-outer distinction where only one is the machine's. Read :4867-4890 before writing the RED test.
2. **Observability requires a 3+ entity pile-up.** With exactly two eligible entities the inner loop has nothing left to visit either way, so the two paths are indistinguishable — this is precisely why jt5-4's two-body fixtures descoped it. The RED fixture needs a person tie PLUS a third body still overlapping the same object on the same frame (a wave-6 swarm reaches this in ordinary play). Prefer a seeded-demo / ordinary-input path over a synthetic two-body fixture so the behavior is observed in play, not just transcribed.
3. **Expect a determinism re-baseline** if the abort suppresses contacts that currently resolve — flag it rather than silently rewriting the golden.

## Subagent Results

Only three specialists are enabled in `workflow.reviewer_subagents` on this project (`preflight`, `security`, `rule_checker`); the other six are disabled and their domains were assessed by me directly (see Reviewer Assessment).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (tests 2747/2747 green, `tsc` clean, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edge cases covered by Reviewer (see Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error-handling surface in a pure-sim branch |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer (non-vacuity, control fixtures) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comment ROM citations re-verified by Reviewer against the source |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — no new types/APIs; rule_checker covered type-safety rules |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — change is already minimal (one branch) |
| 9 | reviewer-rule-checker | Yes | clean | none (30 rules / 47 instances / 0 violations) | N/A |

**All received:** Yes (3 enabled returned, all clean; 6 disabled pre-filled)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Specialist dispatch (plain-text tags for the gate): [SEC] security — clean; [RULE] rule-checker — clean, 30 rules / 47 instances / 0 violations. Disabled-but-covered-by-Reviewer: [EDGE] edge cases, [SILENT] silent-failure, [TEST] test quality, [DOC] comment accuracy, [TYPE] type design, [SIMPLE] simplification — each assessed directly below.

**Data flow traced:** a per-frame `collisionPass` over `eligible` processes → the inner pair loop at `demo.ts:1368` → on a `bounce` outcome, the thud cue is pushed and the loop now branches: `enemy-thud` → `continue` (next inner partner), `player-thud` → `break` (outer `i` advances). Safe because the `bounced` map for both parties is written at :1424-1425, BEFORE the branch, and consumed after the loops regardless of exit path — so a person tie still bounces the pair apart; only scan-continuation changes.

**Five+ observations:**
1. [VERIFIED] The fix is faithful to the ROM. `break` ports `BCS 20$` (:4886) → `20$`/`25$ LDU PLINK,U` (:4874): carry-set on SNPTHD (`ORCC #$01`, :5059) advances the outer walk. `continue` ports SNETHD's carry-clear (`ANDCC #$FE`, :4947 via `JMP HITEM2`, :5029) → `45$ LDX PLINK,X` (:4897). I re-read all seven cited lines in `reference/williams-source/joust/JOUSTRV4.SRC` — every citation in the code comment is exact.
2. [VERIFIED / TYPE] No type-safety escape introduced — evidence: `demo.ts:1441-1442` is pure control flow (`if`/`continue`/`break`), no cast, no `any`, no non-null assertion; `tsc --noEmit` clean (preflight + rule_checker both re-ran it). The one cast in the tests, `c.type as string` (`demo-jt9-16.test.ts:106`), is a widening of a string-literal union to `string[]`, not an escape (rule_checker #1).
3. [VERIFIED / EDGE] The kill outcome (non-bounce) is a disjoint branch and correctly UNCHANGED — evidence: an outer object that DIES is auto-skipped by the pre-existing `removed.has(pa.id)` guard at `demo.ts:1371`, so only the bounce/tie path ever lacked the abort. rule_checker #14 confirms the sibling kill code (:1445-1482) is untouched. Mixed enemy-then-person sequences resolve correctly because the branch is evaluated per-pair.
4. [VERIFIED / TEST] Tests are non-vacuous and self-protecting — evidence: AC-1 asserts `player-thud === 1` while AC-2's identical-geometry all-ptero control asserts `enemy-thud === 2` on the SAME `frameCues` harness, so "2 is reachable" is proven and AC-1's `1` is a real suppression, not a fixture that never reaches a second pair. AC-3 pins the two-body null case. A stray wave-anchor collision would ADD cues and fail the exact-count `.toBe`/`.toEqual([])` assertions rather than pass silently.
5. [VERIFIED / DOC] The comment's ROM claims are not un-run prose — evidence: every cited line (:4874/:4886/:4897/:4947/:5029/:5054/:5059) is independently pinned and executed by `demo-jt9-16-source.test.ts` under `it.skipIf(!vendoredAvailable)`; rule_checker #17 confirms. I re-verified the seven lines by hand against the vendored source.
6. [VERIFIED / SIMPLE] Minimal — one branch, no new helpers, no touched neighbours. rule_checker #24 confirms the old bare `continue` was fully replaced with no stray survivor.
7. [VERIFIED / DOC] Provenance double-entry preserved — `demo-jt9-16-source.test.ts` imports ONLY `./helpers/joust-source.js`, never `src/` (grepped), so the reader and the implementation stay independent (rule_checker #29).

**Error handling:** the only throw is the descriptive missing-anchor guard at `demo-jt9-16.test.ts:97` (`if (!anchor) throw`) — appropriate for a test fixture; no swallowed errors, no empty catches ([SILENT] domain clean).

### Rule Compliance
Checklist `.pennyfarthing/gates/lang-review/typescript.md` (+4 project idioms), enumerated exhaustively by rule_checker over all three changed `.ts` files (47 instances) and spot-audited by me:
- **#1 type-safety escapes** — PASS (no `as any`/`@ts-ignore`/new `!`; `c.type as string` is a benign widening).
- **#4 null/undefined** — PASS (`find()` result guarded before use; no new `??`/`||`/`.get()`).
- **#5 modules** — PASS (`.js` extensions on all relative ESM imports; `type` on type-only imports).
- **#8 test quality** — PASS (concrete `.toBe`/`.toEqual` assertions; no `dist/` imports; no `as any` in assertions).
- **#14 disjoint-branch edges** — PASS (fix confined to the bounce branch; kill branch disjoint).
- **#15/#25 source-text guards** — PASS (each assertion scoped to one indexed `sourceLines(ROM)[N-1]` line and its mnemonic/label, never a whole-file grep).
- **#17 un-run comment mechanism** — PASS (comment claims are executed by the source test).
- **#18 fail-by-passing apparatus** — PASS (control fixtures genuinely distinct; AC-3 is the #18 self-check).
- **project idioms #27–#31** (`.js` imports, non-vacuous asserts, double-entry, `skipIf` degradation, `core/` purity) — all PASS.
- Rules #3/#6/#7/#9/#10/#12/#16/#21/#22/#23 — N/A (no enums, JSX, async, config, user-input, DOM, or numeric-default surface in the diff).
No violations. No project rule matches an unaddressed pattern.

### Devil's Advocate
Suppose this fix is wrong. The strongest attack: `break` advances the outer walk to `i+1`, but the ROM's `LDU PLINK,U` follows a LINKED LIST — if the port's `eligible` array order ever diverged from the PLINK chain order, `break` would advance to the wrong "next object" and silently skip or double-process a body. Is that a latent bug this change introduces? No — the `for(i) for(j=i+1)` loop ALREADY assumes eligible-order == link-order (the load-bearing invariant documented at `demo.ts:1403-1412`, established by jt5-4); `continue` relied on it just as much as `break` does. My change inherits the invariant, it does not create the exposure. Second attack: a malicious/degenerate frame with a huge pile-up — say 50 bodies all overlapping one knight. Does `break` cause a body to be permanently starved of collision? No: the skipped partners are re-scanned next frame (the tie "consumes the object's whole remaining scan" for THIS frame only — the exact ROM semantic the story cites), and each skipped body still gets its own turn as an outer object against LATER elements this same frame. Nothing is dropped from the simulation, only deferred, which is faithful. Third attack: what if `resolveContacts` returns `bounce` for a person pair that is NOT actually a same-level tie — e.g. a floating-point/rounding path where `plantHeight` ties spuriously? Then a spurious abort could suppress a real kill. But `plantHeight` is integer arithmetic (`plantZ + (posY>>8)`, joust.ts:204-205) — no float, no rounding; a tie is exact. Fourth: a confused reader might think `break` exits the WHOLE pass. It exits only the inner `j` loop; the outer `i` loop continues. The tests (AC-2 asserting the OTHER objects still resolve) would catch a mistaken full-pass break — they pass. Fifth: could the README indicative-count refresh mask a future real drift? It is explicitly unguarded (only the FILE count is derived+guarded), so it neither helps nor harms the gate; harmless. I could not construct a breaking input. The change is correct and faithfully scoped.

**Handoff:** To SM for finish-story.

## Impact Summary

**Status:** Finished — approved in one review round, all checks clean.

**Change:** One branch in `plugins/joust/src/core/demo.ts:1428` — the collision-scan inner loop now aborts the outer object's remaining scan on a person tie (`player-thud`/SNPTHD) and continues on an enemy thud (`enemy-thud`/SNETHD), porting the ROM's opposite-carry contract (SNPTHD `ORCC #$01` :5059 sets carry → `BCS 20$` :4886 advances the outer walk `LDU PLINK,U` :4874; SNETHD `ANDCC #$FE` :4947 clears it → inner scan continues :4897). Plus two new test files (behavioural 3-body discriminator + ROM-provenance) and a guarded README test-file-count bump (119→121).

**Verification:** Full joust suite green (121 files / 2747 tests); `tsc --noEmit` clean. Reviewer APPROVED — all three enabled specialists (preflight, security, rule_checker: 30 rules / 47 instances / 0 violations) clean; ROM port direction verified against JOUSTRV4.SRC:4855-5060.

**Delivery Findings (both non-blocking, Reviewer concurred):** synthetic-only liveness (the observability the story specifies; seeded liveness deferred as fragile); determinism re-baseline did NOT fire (no golden edited).

**Release:** ships on the next `joust-vX.Y.Z` tag — no further change needed.