---
story_id: "pt1-17"
jira_key: "pt1-17"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-17: pac-man: verify the fruit sequence against the ROM table

## Story Details
- **ID:** pt1-17
- **Jira Key:** pt1-17
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-17-pac-man-fruit-ladder-rom-verify
- **PR:** (none yet — recorded when the PR is created)

## Story Context
**Type:** bug  
**Points:** 1  
**Priority:** p1  
**Playtest Date:** 2026-08-19

### Observation
After the melon level comes another melon level — an unusual pattern that raised suspicion during playtest, but the AUTHENTIC Pac-Man fruit ladder DOES double most fruits across levels. This is a verify-and-confirm story: the table is suspected to be correct already, but needs a ROM-fidelity citation and a test to prove it stays correct.

## Verified Facts (SM Triage, 2026-08-20)

**Our implementation:** `plugins/pac-man/src/core/level.ts`
- `FRUIT_PROGRESSION` (lines 103-116): arrays defining fruit type and points for levels
- `KEY_FRUIT` (line 117): hardcoded key entry
- `fruitForLevel()` (lines 119-121): accessor function

**Fruit ladder (ours vs. ROM):**
- Level 1: cherry, 100 points
- Level 2: strawberry, 300 points
- Level 3–4: orange, 500 points (doubles)
- Level 5–6: apple, 700 points (doubles)
- Level 7–8: melon, 1000 points (doubles)
- Level 9–10: galaxian, 2000 points (doubles)
- Level 11–12: bell, 3000 points (doubles)
- Level 13+: key, 5000 points

**ROM source:** `pacman.asm:2b23`–`2b31` (packed BCD points table): 100 / 300 / 500 / 700 / 1000 / 2000 / 3000 / 5000

**Verdict:** OUR TABLE MATCHES THE ROM EXACTLY in points, fruit types, and the doubling pattern (each fruit on two consecutive levels from L3 onward). The playtest "peach after peach" observation is the MELON at L7→L8 (Pac-Man's melon sprite is commonly mistaken for a peach). The doubling is authentic ROM behavior — WORKING-AS-INTENDED.

**Coverage gap (the real deliverable):**
- NO existing test independently asserts the level→fruit MAPPING / doubling against the ROM.
- `plugins/pac-man/tests/shell/hud-icons.test.ts` consumes `levelRow(level).fruit` as its source of truth (lines 18–21), so it VALIDATES the accessor, not the underlying ladder.
- `plugins/pac-man/tests/core/game.test.ts:80` only spot-checks level 1 = cherry 100 — ONE fruit, not the full ladder.
- The citations audit (`plugins/pac-man/tests/audit/citations.test.ts` + `tools/audit/check-citations.mjs`) byte-checks ROM comment lines but not the level→fruit mapping.

### Acceptance Criteria
1. **Write a comprehensive ROM-fidelity test** asserting the FULL fruit ladder (levels 1–13+) and doubling pattern against `pacman.asm:2b23`–`2b31` with byte-level citations.
   - Test location: `plugins/pac-man/tests/core/` (core module, not shell; supports TDD RED→GREEN flow).
   - Verify fruit TYPE for each level.
   - Verify POINTS VALUE for each fruit.
   - Verify the DOUBLING PATTERN (each fruit on two consecutive levels from L3 onward).
2. **Cite the ROM table byte-for-byte** — each points value must anchor the byte in the ROM that ENCODES it (the packed-BCD literal in the operand, per citation-anchor rule: cite the VALUE byte, not just an adjacent line).
3. **Prove non-vacuity by mutation** — temporarily change ONE `FRUIT_PROGRESSION` entry and watch the test fail (redden), then revert. This demonstrates the test catches real bugs.
4. **Keep the table working-as-intended** — if tests pass, no code changes to `fruitForLevel()` or `FRUIT_PROGRESSION`. Close as VERIFIED with the test as the citation evidence.

## Sm Assessment

**Triage outcome:** Premise measured and confirmed working-as-intended. Our pac-man fruit ladder in `plugins/pac-man/src/core/level.ts` matches `pacman.asm:2b23`–`2b31` exactly — types, points, and the doubling of every fruit across two consecutive levels from L3 on. The playtest's "peach after peach" is the ROM-correct MELON pair at L7→L8 (the melon sprite reads as a peach to many eyes). No fidelity defect exists.

**Why this is still a story, not a paper-close:** the ladder mapping is not independently guarded by any test — `hud-icons.test.ts` treats `levelRow().fruit` as its own source of truth, and `game.test.ts` spot-checks only level 1. So the deliverable is a green-guard regression test (jt8-6 pattern): it passes on arrival because the table is already right, and locks the doubling ladder against the ROM so a future edit reddens. The story text prescribes exactly this for the "matches" case, so no backlog-shape ruling was needed from the user.

**Routing:** phased tdd → TEA (red). TEA writes the ladder+doubling test in `plugins/pac-man/tests/core/`, byte-cites each points value to its packed-BCD operand, and proves non-vacuity by mutating one `FRUIT_PROGRESSION` entry. Heed the citation-anchor gotcha: the cite must sit on the byte that ENCODES the value, not an adjacent load — mutate the byte to confirm each cite reddens.

**Contention:** clean at setup — no remote `pt1-17` branch, sibling checkout a-2 is on pt1-3 (star-wars). Claim branch pushed to close the invisibility window.

## Tea Assessment

**Deliverable:** `plugins/pac-man/tests/core/fruit-ladder.test.ts` — 16 assertions locking the level→fruit progression the player actually experiences, via the public seam `levelRow(level).fruit`.

**Design.** ROM-anchored on two axes rather than transcribed:
- **Points** are decoded LIVE from the vendored scoring table `pacman.asm:2b23`–`2b31` using the project's own `dataWordOf` + `decodeBcdX10` (from `tests/audit/dossier-sweep`). Each rung's `addr` anchors its points to the encoding byte; because the eight addresses decode to eight distinct values (100/300/500/700/1000/2000/3000/5000), a mis-anchor reddens. An extra assertion pins the decoded set so the per-level checks can't pass vacuously.
- **Doubling** (the playtest's "peach after peach") is asserted structurally — cherry & strawberry once each, then orange/apple/melon/galaxian/bell on two consecutive levels apiece, key terminal from L13. Provenance is the level→fruit sprite table `pacman.asm:3b08` (bytes `90·94·98 98·a0 a0·a4 a4·a8 a8·9c 9c·ac ac...`, the pairs being the doubling). The "peach" is the MELON at L7–L8.

**Green-guard, per jt8-6.** SM triage already confirmed our table matches the ROM exactly, so this test PASSES on arrival (16/16; full pac-man project 513/513; `tsc` clean). The RED was proven by **mutation**: melon→orange at L7 reddens the type + doubling checks (2 failures); cherry 100→200 reddens the live ROM cross-check (1 failure). Both reverted.

**Rule Coverage** (TypeScript lang-review checklist `.pennyfarthing/gates/lang-review/typescript.md`):
- **#15 — guard mutation-tested, anchored to the declaration not a token:** the points cite anchors the value-encoding ROM data word (decoded live via `decodeBcdX10`), proven load-bearing by mutating the byte (cherry 100→200 → red). Not a bare-keyword grep. Also memory `citation-claim-anchors-value-byte`.
- **#18 — fixture is not the expectation; helper is not untested reimplementation:** expected POINTS come from the actual vendored `pacman.asm`, never a hand-typed list, so the assertion can distinguish a wrong table from a right one. The BCD decode reuses the project's audited `dossier-sweep` helpers (already mutation-tested by `citations.test.ts`), not a private reimplementation. The distinct-values test forecloses "all rungs collapse to one value."
- **core/shell purity:** the guard lives in `tests/core/`, imports only `src/core/level.ts` + the audit helper — no shell, no DOM, no clock; exercises the pure sim seam.
- **no count guards (memory `no-count-guards-or-count-comments`):** the ladder is asserted by content and structure, not by a manifest-size count.

**Handoff note for Dev (green):** there is **no implementation to write** — the table already matches the ROM, which is the story's verified outcome. GREEN = confirm the suite is green with no change to `FRUIT_PROGRESSION`/`fruitForLevel`, record that the story closes WORKING-AS-INTENDED with this test as the "citation as evidence" the ACs ask for, then hand to Reviewer. Do NOT edit the fruit table.

## Dev Assessment

**Implementation Complete:** Yes — by verification, with zero production code.

This is a verify-against-ROM story and the confirmed outcome is *already-correct*: our fruit ladder in `plugins/pac-man/src/core/level.ts` matches the ROM scoring table `pacman.asm:2b23`–`2b31` exactly (types, points, and the doubling of every fruit from L3). AC4 explicitly prescribes "if tests pass, no code changes to `fruitForLevel()` or `FRUIT_PROGRESSION`." The minimalist-correct implementation of a green-guard is therefore no edit at all — touching the table would have been scope creep and a fidelity regression.

**Files Changed:** none in `src/`. The guard `plugins/pac-man/tests/core/fruit-ladder.test.ts` is the sole artifact. Green-phase follow-up commit `c3b62f19` applied the two advisory comment-accuracy nits the dev-exit lang-review extension surfaced (checklist #17): (1) the "peach" is the THIRD fruit (L3-4, our `orange`, which `graphics.json` sprite-index-18 labels "peach, by conventional ROM ordering") — the earlier "melon" claim was corrected in both header and inline annotation; the guard's assertions are unchanged; (2) the L13+ clamp test now asserts `toEqual(levelRow(13).fruit)` rather than a transcribed `{type:'key',points:5000}` literal, so the value flows from the byte-checked `2b31` rung.
**Tests:** 513/513 passing across the full pac-man project (GREEN), including the 16 fruit-ladder assertions; `tsc --noEmit` clean. Working tree clean.
**Verdict:** WORKING-AS-INTENDED — the guard is the "citation as evidence" the story asked for.
**Branch:** feat/pt1-17-pac-man-fruit-ladder-rom-verify (pushed).

**Handoff:** To Reviewer.

### Rework (round 1 → round 2), commit `afc69382`
Addressed both Reviewer round-1 findings in `fruit-ladder.test.ts` (still no `src/` change — table untouched, story remains WORKING-AS-INTENDED):
- **R-1 (rule #1):** `romPoints()` now uses narrowing `throw`s (`if (line === undefined) throw …` / `if (word === null) throw …`); the `expect().toBeTruthy()` + `line!`/`word!` non-null escapes are gone.
- **R-2 (rule #17):** made `pacman.asm:3b08` genuinely load-bearing. Added a raw byte-stream reconstruction (`romByteAt`) that reads the byte at every address from the disassembly's hex column — needed because the 3b08 fruit-per-level bytes are folded into `ld` operands and the scoring-table line map can't reach them. New test asserts our ladder's doubling boundaries coincide with the ROM's sprite-code boundaries (`3b08`, 2 bytes/level) for levels 1–13. **Mutation-proven:** breaking level 4's doubling reddens the new `3b08` test specifically. Header rewritten so the "two axes against the ROM" claim is now true, with the decode-anchor literal (distinct-values test) acknowledged.
- Suite: **514/514** pac-man green (+1 cross-check), `tsc` clean.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 513/513 green, tsc 0, no smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none | all citations verified vs primary source |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | pure test, hardcoded path, no untrusted input |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | R1: findings / R2: clean | R1: 2 → R2: 0 | R1 confirmed 2; R2 both resolved, 0 new |

**All received:** Yes (4 enabled; 5 disabled pre-filled), both rounds
**Total findings:** Round 1: 2 confirmed, 0 dismissed. Round 2: 0 (both resolved, 0 new).
**Round 2 re-run:** preflight clean (514/514, tsc 0), security clean, comment-analyzer clean (header now accurately describes a live 3b08 byte-level cross-check; byte list verified vs source; bonus corroboration via the `2bf9`–`2c41` fruit-draw routine that 3b08 is the level→fruit table), rule-checker clean (0/33; both round-1 findings resolved, mutation-proven; ROM re-parsed independently in Python — `romFruitCode(1..14)` = `90/94/98/98/a0/a0/a4/a4/a8/a8/9c/9c/ac/ac`, no off-by-one).
**Working-tree audit:** `pf reviewer audit-tree` → CLEAN both rounds (each time after restoring a false-DIRTY on `sprint/epic-pt1.yaml` — the pf-written status stamp, not a leftover mutation; memory `reviewer-audit-tree-false-dirty-on-status-stamp`).

## Reviewer Assessment

### Round 1 — REJECTED

**Verdict:** REJECTED (rework). No Critical/High correctness defects — the story's core claim holds: our fruit ladder matches the ROM, the POINTS axis is genuinely live-decoded from `pacman.asm:2b23`–`2b31` and mutation-tested (rule_checker ran 4 fresh mutations, all reddened and reverted; the anti-vacuity family #15/#18/#19/#26 is clean). Two confirmed quality findings must be fixed before merge — one of them a citation-accuracy defect, which this project holds to a high bar in ROM-fidelity work.

**Required-1 (rule #1, type-safety escape — LOW):** `fruit-ladder.test.ts:50,52` — `romPoints()` uses `expect(line,...).toBeTruthy()` then `dataWordOf(line!)` / `decodeBcdX10(word!)`. Vitest's `expect` is not an assertion-function signature, so it does NOT narrow the type; the `!` is a real non-null escape, not a TS-recognized guard. Functionally safe (the `expect` throws first), but the checklist calls it out and the fix is trivial. Replace each with a narrowing throw, e.g. `if (line == null) throw new Error(\`pacman.asm has no line at ${addr}\`)` / `if (word == null) throw new Error(\`pacman.asm:${addr} carries no data word\`)`, then drop the `!`. Keep the message content.

**Required-2 (rule #17, unexercised citation — MED):** `fruit-ladder.test.ts:16–21` — the header frames the guard as locking the ladder "against the ROM **on two axes**: POINTS ... **DOUBLING: the shape of the level→fruit table `pacman.asm:3b08`**," in parallel with the live-decoded POINTS axis. But the doubling test (lines 95–107) checks `levelRow()` against ITSELF (`t(a)===t(b)`, `t(a-1)!==t(a)`) — it never reads or decodes `3b08`. The cited bytes are accurate (verified by hand: even-offset `90·94·98 98·a0 a0·a4 a4·a8 a8·9c 9c·ac ac`), so the claim is TRUE but UNEXERCISED — it reads as a ROM cross-check while being a self-consistency regression pin. In a fidelity test that is a manufactured-corroboration risk (cf. memory `citation-claim-anchors-value-byte`, jt8-6's citation-prose rounds). **Resolve it, preferably by making `3b08` load-bearing:** parse the fruit-per-level table at `3b08` live (even-offset sprite codes, one per level) and assert our ladder's doubling matches the ROM pairing — levels 1 & 2 carry distinct singleton codes, then `code[3]===code[4]`, `code[5]===code[6]`, `code[7]===code[8]`, `code[9]===code[10]`, `code[11]===code[12]`, with each pair opening on a new code — so a mutation to the doubling reddens against the ROM, not just against the implementation. That fully delivers the story's AC-1 "verify the DOUBLING PATTERN ... against `pacman.asm`." **Acceptable fallback** if a live `3b08` cross-check proves impractical (no established sprite-code→level parse): soften the header to describe the doubling as a self-consistency regression pin and drop the "two axes against the ROM" framing, so the comment no longer implies a check the test does not perform.

**Not blocking (noted):** the 8-distinct-values guard (line 92) transcribes the expected decoded set `[100,...,5000]` despite the header's "never transcribed here." This is CORRECT and necessary — it is the decode-integrity anchor and must have an independent expected list (rule_checker mutated the `×10` out of `decodeBcdX10` and this test reddened, proving it non-vacuous). No change required; if Required-2 rewrites the header, a half-sentence acknowledging the intentional decode-anchor literal would make the "never transcribed" line fully precise.

## Reviewer Assessment

### Round 2 — APPROVED

**Verdict:** APPROVED. Both round-1 findings are resolved and independently re-verified; the rework introduced no new violations across all four enabled specialists.

**Specialist inputs (round 2):**
- **[SEC]** (reviewer-security): clean — pure test, hardcoded path from `import.meta.url`, no untrusted input; the two parse regexes are linear-time (no ReDoS) and the input is a fixed vendored file.
- **[DOC]** (reviewer-comment-analyzer): clean — every header claim verified byte-accurate against `pacman.asm`; the doubling axis now genuinely reads `3b08` live (not a bare citation); the `3b1d/3b1e` operand-folding example is true; bonus corroboration via the fruit-draw routine (`2bf9`–`2c41`) that `3b08` is the level→fruit table.
- **[RULE]** (reviewer-rule-checker): clean — 0/33 checks violated; both round-1 findings resolved (no `!` non-null assertions remain; the `3b08` cross-check mutation-proved load-bearing); ROM re-parsed independently, `romFruitCode(1..14)` correct with no off-by-one. Raised one non-blocking latent-fragility note (below).
- **[PRE]** (reviewer-preflight): clean — 514/514 pac-man green, `tsc` 0 errors, no code smells.

- **Required-1 (rule #1) — RESOLVED.** `romPoints()` and the new `romFruitCode()` narrow with `if (… === undefined/null) throw`; a whole-file grep confirms zero `!` non-null assertions remain.
- **Required-2 (rule #17) — RESOLVED, and upgraded from citation to live check.** The doubling is now cross-checked against the ROM's own `pacman.asm:3b08` fruit-per-level table: a byte-stream reconstruction (`romByteAt`) recovers the sprite code at each level — including the bytes folded into `ld` operands that a per-line address map would miss — and the new test asserts our ladder's doubling boundaries coincide with the ROM's. rule_checker mutation-proved it live (melon→apple at L7 reddens the 3b08 test), and re-parsed the ROM independently in Python (all 14 target addresses match, no off-by-one). The header's "two axes against the ROM" claim is now true. comment-analyzer separately corroborated via the fruit-draw routine (`2bf9`–`2c41`) that `3b08` is genuinely the level→fruit table.

**Story outcome:** WORKING-AS-INTENDED. The pac-man fruit ladder matches `pacman.asm` exactly on both points (`2b23`–`2b31`, live-decoded) and doubling (`3b08`, live-cross-checked); no `src/` change was made. The guard is the ROM-fidelity citation evidence the story asked for.

**Non-blocking observation (no action required):** rule_checker noted the byte-reconstruction technique has a latent fragility — 4 addresses elsewhere in `pacman.asm` (`0x131`, `0x36f8`, `0x3711`, `0x3712`, all far outside this test's `2b23`–`2b31` / `3b08`–`3b22` read range) carry conflicting disassembly bytes that `Map` last-write-wins would resolve arbitrarily. It cannot affect this test (the 14 read addresses are conflict-free, and `pacman.asm` is an immutable vendored ROM). Recorded for the next reader of the technique, not a defect in this diff.

## Workflow Tracking
**Workflow:** tdd  
**Phase:** finish  
**Phase Started:** 2026-08-20T10:02:11Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T09:18:06Z | 2026-08-20T09:21:10Z | 3m 4s |
| red | 2026-08-20T09:21:10Z | 2026-08-20T09:29:20Z | 8m 10s |
| green | 2026-08-20T09:29:20Z | 2026-08-20T09:37:58Z | 8m 38s |
| review | 2026-08-20T09:37:58Z | 2026-08-20T09:48:12Z | 10m 14s |
| green | 2026-08-20T09:48:12Z | 2026-08-20T09:54:17Z | 6m 5s |
| review | 2026-08-20T09:54:17Z | 2026-08-20T10:02:11Z | 7m 54s |
| finish | 2026-08-20T10:02:11Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement  
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. AC4 prescribes zero code change when the table matches the ROM; it does, so `FRUIT_PROGRESSION`/`fruitForLevel` were left untouched and the suite is green as delivered by TEA.

### TEA (red)
- **[TEA, red] Green-guard: no permanently-failing test (tests-fail gate check #1 N/A).** This is a verify-against-ROM story; SM triage confirmed our fruit table already matches `pacman.asm:2b23`–`2b31` exactly. A correct verify story cannot carry a permanently-red test without fabricating a defect, which would violate the very no-vacuous-tests principle the gate exists to enforce. The RED-equivalent proof is the **mutation demonstration**, per TypeScript lang-review checklist **#15** ("Every guard must be mutation-tested: delete the mechanism and require red") and jt8-6 precedent: melon→orange at L7 → 2 failures (type + doubling); cherry points 100→200 → 1 failure (live ROM cross-check). Both reverted; guard is now green (16/16) against correct code. The gate's substantive checks (#2 AC coverage, #3 rule coverage, #4 no-vacuity, #5 committed) all hold; only the literal "one red test" is inapplicable. Green phase has no implementation — Dev confirms and routes to Reviewer.
  → ✓ ACCEPTED (Reviewer, round 1): a verify-against-ROM story cannot carry a permanently-red test without fabricating a defect; the mutation demonstration is the correct RED-equivalent and rule_checker independently re-ran 4 mutations, all reddening. Legitimate.