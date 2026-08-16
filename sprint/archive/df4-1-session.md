---
story_id: "df4-1"
jira_key: "df4-1"
epic: "df4"
workflow: "tdd"
---
# Story df4-1: Collision core FIRST (RED first, TDD)

## Story Details
- **ID:** df4-1
- **Jira Key:** df4-1
- **Workflow:** tdd
- **Branch:** feat/df4-1-collision-core-colide-port
- **PR:** https://github.com/slabgorb/arcade/pull/483
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T21:58:44Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T21:12:11Z | 2026-08-16T21:13:22Z | 1m 11s |
| red | 2026-08-16T21:13:22Z | 2026-08-16T21:29:56Z | 16m 34s |
| green | 2026-08-16T21:29:56Z | 2026-08-16T21:33:16Z | 3m 20s |
| review | 2026-08-16T21:33:16Z | 2026-08-16T21:44:50Z | 11m 34s |
| green | 2026-08-16T21:44:50Z | 2026-08-16T21:49:30Z | 4m 40s |
| review | 2026-08-16T21:49:30Z | 2026-08-16T21:58:44Z | 9m 14s |
| finish | 2026-08-16T21:58:44Z | - | - |

## SM Assessment

**Setup verdict:** Ready for TEA (RED phase).

- **Story:** df4-1 — build the shared Defender collision seam FIRST (before any enemy), porting the ROM `COLIDE` object-pointer-list box hit test. 5pt, TDD/phased.
- **Base:** stands only on shipped df1/df2/df3. No enemy needed — tests use SYNTHETIC object lists.
- **Context:** rich context preserved at `sprint/context/context-story-df4-1.md` (not regenerated); 4 ACs, all citation-gated.
- **Decision A (RULED, ROM-always-wins):** port COLIDE's object-list model, do NOT re-derive a quadtree/AABB. AC4 pins this mechanically. This is the single biggest trap — a tidier structure silently changes which overlaps count (the df3 routing≠geometry lesson).
- **Citation traps (standing df*):** line numbers from TOOL OUTPUT only; RASM radix (`$hex` vs bare decimal). Every new src/core constant needs a `claims/*.json` entry verified byte-for-byte against `reference/original-source/defender/` under the df1-1 gate.
- **Purity:** `collision.ts` must stay pure/clock-free — `purity.test.ts` stays green.
- **Note (non-blocking):** sprint YAML references a `pm5` epic whose shard `sprint/epic-pm5.yaml` is absent in this checkout — unrelated to df4, flagged for later.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Gap** (non-blocking): the port is COLIDE's box PRE-TEST only; the pixel-perfect intersection stage (IC1, `defender/DEFA7.SRC:2927-3020`) is deferred but was not documented as such. Affects `plugins/defender/src/core/collision.ts` (correct comments + a logged deviation; the seam df4-3+ consume must state it is box-level, not pixel-perfect). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `screenAddr = (x<<8)|y` (`collision.ts:93`) silently wraps/sign-flips for coordinates outside the ROM's 0–255 byte range (JS `<<`/`|` ToInt32). Not reachable today (no untrusted caller), but a later story letting `CollObject.x/y` derive from less-trusted state should add a byte-range assertion or a documented assumption. Affects `plugins/defender/src/core/collision.ts`. *Found by Reviewer (corroborated by reviewer-security).*

### Reviewer (code review — round 2)
- **Improvement** (non-blocking): the crash-return citation `LDA #1 / RTS HIT` is written as "at :3011", but `LDA #1` is at :3010 and only `RTS HIT` at :3011 — a range `:3010-3011` is more precise (and matches the block's own convention for multi-instruction citations). Not false (the crash *return* is at :3011). Affects `collision.ts:21,46` and `collision.test.ts:14,39`. *Found by Reviewer (comment-analyzer) round 2 — LOW, deferred.*
- **Improvement** (non-blocking): the `Hit` interface JSDoc still reads "COLIDE's return on a crash"; given the now-documented box-only scope, "return on a box overlap (a superset of the ROM's pixel crashes until IC1 lands)" would be more precise. The file header + the `collide()` doc already state this correctly. Affects `collision.ts` (`Hit` interface). *Found by Reviewer (comment-analyzer) round 2 — LOW, deferred.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (rework — review round 1)
- **Box pre-test ported; IC1 pixel-intersection stage deferred.** Spec/story: "port COLIDE's object-pointer-list BOX hit test," tested against SYNTHETIC object lists. What the ROM does: COLIDE is two stages — the box pre-test (`DEFA7.SRC:2907-2925`) and the `IC1` pixel-intersection stage (`:2927-3020`, crash return `LDA #1 / RTS HIT` @:3011) that walks both sprites' bitmaps and only then signals a crash. **Why deferred:** df4-1's synthetic object lists carry NO bitmap pixel data, so stage 2 has nothing to compare — it cannot be built or tested until a story provides real sprite bitmaps. **Consequence:** `collide()` reports a Hit on BOX overlap, a superset of the ROM's pixel-level crashes; a consumer (df4-3+) treats box overlap as the hit for now. This is a scope narrowing within the story's stated "box hit test," now documented in both files' banners and here, per the Reviewer audit below.
- **UNDOCUMENTED deviation — box-only port dressed as full COLIDE.** Spec/story: "port COLIDE's object-pointer-list box hit test" (box test — correct, and pixel-perfect intersection genuinely can't be built without the sprite bitmaps df4-1 lacks). Code: `collide()` returns a Hit the instant the four box comparisons pass — the ROM's box PRE-TEST (`DEFA7.SRC:2907-2925`), NOT the crash condition, which lives in the unported `IC1` pixel-intersection routine (`:2927-3020`, `LDA #1 / RTS HIT` @:3011). This narrowing is CORRECT for the story's scope but was NOT logged as a deviation, and the file/test banners instead over-claim a full `:2904-3020` port and assert "NOT a re-derived quadtree/AABB" (the shipped code IS an AABB overlap). Severity: **MEDIUM** — misrepresents the seam to every downstream consumer (df4-3+ would treat box overlap as a faithful hit → collisions too generous). → ✗ FLAGGED by Reviewer: fix in green rework — narrow the citations, log this deviation, and reword the AABB disclaimer to name the real Decision-A distinction (ROM object-LIST scan, not a spatial quadtree/hash).

### Reviewer (audit — round 2)
- **Box-only port / IC1 pixel stage deferred** → ✓ ACCEPTED by Reviewer: the Dev (rework round 1) entry above now documents the two-stage COLIDE and why stage 2 is deferred (synthetic lists carry no bitmap), and both file banners state it. reviewer-comment-analyzer (round 2) independently confirmed the replacement comments are TRUE against the ROM source (`:3011` crash return, `:2925` RET EQ, `:2927` IC1 banner, `:3020` JMP COLLP). The scope narrowing is sound and within the story's stated "box hit test"; the consuming stories (df4-3+) are now warned that box overlap ≠ pixel-level crash.

**RED verdict:** 26 failing tests in `plugins/defender/tests/collision.test.ts`, committed at `dc5f1a99`. tsc green; the other 455 defender tests stay green. Clean, isolated RED.

**Ground truth (this session):** the ROM `COLIDE` routine was deep-read from `reference/original-source/defender/DEFA7.SRC` (+ PHR6.SRC struct offsets, DEFB6.SRC box dims). The load-bearing semantics the port must honour:
- **Exclusive AABB on all four edges** — overlap iff `cand.ULX<ref.LRX ∧ cand.ULY<ref.LRY ∧ cand.LRX>ref.ULX ∧ cand.LRY>ref.ULY` (`:2914-2922`, `BHS`/`BLS`/`BHI`). Touching edges do NOT collide. This is the one semantic a "cleaner" inclusive-boundary AABB gets wrong (Decision A).
- **LR = UL + (OBJW,OBJH)** for both the reference (`:2908-2910`) and each candidate via `ADDD [OPICT,X]` (`:2918`) — the candidate's own W/H matter.
- **Off-screen (0,0) skip** — `LDD OBJX,X / BEQ COLLP` (`:2912-2913`): a candidate whose UL word is exactly 0 is inactive and skipped even if it would overlap.
- **First-in-list-order wins** (`:2923` OLINK walk); list exhausted → EQ/no-crash.
- **RET+2 = COLLISION PICT** (`:2553`) — the hit carries the struck object's picture, not a boolean.
- **CENTMP** (`:2998-3008`) — box-level screen address = the hit object's UL coord-as-address `(x<<8)|y` (column high byte, row low byte). Pixel-precise centre refinement needs real bitmaps df4-1 doesn't carry → deferred.

**The seam contract (defined here for GREEN):** `collision.ts` exports `collide(query, objects)` + three cited wrappers `laserVsObject` / `bombVsPlayer` / `shipVsObject`, each returning `Hit {object, collisionPicture, screenAddr} | null`. Box dims are INPUTS — `collision.ts` mints no box-dimension constants (they live in the df2-4 objects table). Pure/clock-free; `purity.test.ts` sweeps it automatically on arrival.

### Rule Coverage (lang-review/typescript.md)
- **#15 (token-not-claim) / #25 (whole-file scope):** no source-text greps — every guard is a **behavioural** assertion over the reducer's output, mutation-lethal (flip boundary→inclusive, drop the (0,0) skip, ignore list order, or drop the candidate-dimension term → exactly the named test reddens).
- **#21 (degenerate-but-not-nullish):** the (0,0) off-screen skip pins a present-and-meaningful `0` reaching geometric code.
- **#22 (accept vs reject NaN safety):** the four-edge exclusive boundary is pinned by explicit just-touching (CLEAR) vs one-pixel-inside (HIT) coordinate pairs, so an inverted comparison reddens.
- **#18 / #26 (fixture value IS the expectation / all-local terms):** hit/clear booleans come from the MODULE (always-hit fails the CLEAR cases, always-null fails the HIT cases); `collisionPicture` is disambiguated by candidates with DIFFERENT pictures so an echo-of-objects[0] mutant is caught; `screenAddr` uses distinct non-mirrored bytes (107,100) so a byte-swap is caught.
- **#8 (test quality):** every `it` has a meaningful assertion; no `as any`, no vacuous `is*` checks. The one `as unknown as` is confined to the runtime-assembled import shim (the objects-gate precedent), not an assertion.

### Handoff to Dev (GREEN)
1. Create `plugins/defender/src/core/collision.ts` — the pure reducer above. Keep it clock-/entropy-/browser-/shell-free (purity sweep is automatic).
2. Create `plugins/defender/docs/rom-study/claims/13-collision.json` — a claim per constant introduced, citing the box test (`:2914-2922`) and the CENTMP model (`:2998-3008`). **Line numbers from tool output only; RASM radix — bare decimal unless `$`-prefixed** (the standing df* traps). `brief-dossier.test.ts` byte-verifies each `verbatim` against the vendored tree, so quote the exact source line.
3. `npx vitest run --project defender` green; `npm run lint` green.

**No upstream findings** — the story stands cleanly on shipped df1/df2/df3; no gaps or conflicts surfaced.

## Dev Assessment

**GREEN verdict:** all 26 df4-1 tests pass; full defender project 482 green; `purity.test.ts` green; `tsc --noEmit` green. Commits: RED `dc5f1a99`, GREEN `2d8d05a1`.

**What shipped (minimal, faithful):**
- `plugins/defender/src/core/collision.ts` — a pure reducer `collide(query, objects)` + three thin cited wrappers (`laserVsObject`/`bombVsPlayer`/`shipVsObject`). The wrappers delegate to `collide` — they are the three ROM call sites (distinct reference box + list + meaning), documented with their citations; there is no behavioural difference to encode because in the ROM the only differences (which box, which list) are the caller's arguments.
- `docs/rom-study/claims/13-collision.json` — 7 claims (CD-1..CD-7) citing the box test (`:2909`,`:2913`,`:2914`,`:2918`) and the CENTMP model (`:2998`,`:3003`,`:3008`), byte-verified by `brief-dossier.test.ts` against the vendored tree.

**Faithfulness notes for review:**
- The box test is the ROM's EXCLUSIVE open-interval overlap; `screenAddr = (x<<8)|y` is the box-level CENTMP (UL coord-as-address). The pixel-precise centre refinement (`FC1`/`FC2` loop over real bitmap data) is intentionally NOT ported — synthetic lists carry no bitmap, so it has nothing to compute; a later story with real sprite data revisits it. This is a scope boundary, not a deviation from the box model.
- No box-dimension constants live in `collision.ts` — boxes are inputs (the df2-4 objects table owns those). So AC3's "every collision constant" reduces to the box-test + CENTMP algorithm constants, which is what 13-collision.json enrolls.

**Correlation:** [DOC] claims + citations byte-verified (13-collision.json, CD-1..CD-7). [RULE] src/core purity held (sweep green); lang-review self-check clean (no `as any`/non-null in production; `readonly` params; pure/deterministic). [SEC] n/a — no I/O, no user input, no network; a pure deterministic reducer over in-memory snapshots.

**No design deviations.** *(Superseded — see the rework note and Design Deviations below.)*

### Dev Assessment — rework round 1 (green, commit `dec0b6bc`)

Addressed all four Reviewer findings; **comment/citation + test-assertion only, no behavioural change** — the 26 df4-1 tests and the full defender project (482) stay green, tsc green, citation byte-gate + purity green.

- **[DOC MEDIUM] box-only over-claim** — both banners now state only COLIDE's box PRE-TEST (`:2907-2925`) is ported and the `IC1` pixel stage (`:2927-3020`, crash @:3011) is DEFERRED (no bitmap in synthetic lists); the "not AABB" disclaimer reworded to the real Decision-A point (no spatial index over the object list). Logged as a Design Deviation.
- **[DOC MEDIUM] wrong crash citation** — corrected to `:2925` (EQ/no-crash) + `:3011` (NE/crash, in the deferred stage) in both files; verified those exact lines against the ROM source (`:3011` = `RTS  HIT`, `:2925` = `RTS  RET EQ`), so no fresh lie.
- **[DOC LOW] CENTMP understatement** — reworded to say it belongs to the deferred pixel stage, box-level approximated here.
- **[RULE LOW] four bare non-null assertions** — `expect(...).not.toBeNull()` guards added before the `!` uses (`collision.test.ts` PICTURE / CENTMP / owns-no-shell-state tests).
- Non-blocking follow-ups (`screenAddr` byte-range wrap) left as Delivery Findings, not fixed this round.

## Subagent Results (round 1 — superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 482/482, tsc, purity, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by rule-checker's 10-mutant boundary battery (all killed) + my own analysis |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no swallowed errors; the one catch adds context (rule-checker #11 confirmed) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker's mutation battery (10 mutants, 0 survivors) + the #1 non-null nit below |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 3 (box-only overclaim, wrong :2923-2925 crash citation, CENTMP understatement), 0 dismissed, 2 folded into the first |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker #2 confirmed types clean (readonly, no Record<string,any>, proper interfaces) |
| 7 | reviewer-security | Yes | clean | none (1 non-blocking note) | N/A — screenAddr byte-range wrap noted, not exploitable; captured as a follow-up |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — the three query wrappers are thin delegations but justified (AC2's three cited call sites); not over-engineered |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4 (bare non-null assertions, LOW), 0 dismissed; 10-mutant battery all killed (no coverage gap) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 7 confirmed (3 DOC + 4 RULE), 0 dismissed, 2 non-blocking follow-ups captured

## Reviewer Assessment (round 1 — REJECTED, superseded by round 2 below)

**Verdict:** REJECTED

The implementation is **mutation-proven correct for its scope** (reviewer-rule-checker ran a 10-mutant battery — every box-boundary, (0,0)-skip, screenAddr-byte, first-hit-wins and collisionPicture-echo mutant reddened a test; AC3's claim matcher is robust with no false-green). The reject is for **documentation fidelity**, not runtime behaviour — in a cited ROM clone a wrong citation and an over-claimed port scope are first-class defects that mislead every downstream consumer, and the reviewer's deviation-audit duty requires the box-only narrowing be documented, not slipped through.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [DOC][MEDIUM] | Box-only port over-claims a full COLIDE port. The banners cite `:2904-3020` as "ported" and assert "NOT a re-derived quadtree/AABB", but only the box PRE-TEST (`:2907-2925`) is ported; the pixel-perfect `IC1` intersection stage (`:2927-3020`, crash at :3011) is unported and unflagged. The shipped code IS an AABB overlap. Misleads df4-3+ (box overlap read as a faithful hit → collisions too generous). | `collision.ts:3`; `collision.test.ts:4`, `:337`; `loadCollision` msg `:143` | Narrow the "ported" citation to `:2907-2925`; add a Design Deviation documenting the deferred `IC1` pixel stage (needs real sprite bitmaps df4-1 lacks); reword the disclaimer to the real Decision-A point — ROM object-LIST scan, not a spatial quadtree/hash — instead of "not AABB". |
| [DOC][MEDIUM] | Factually wrong ROM citation: "First hit wins (`:2923-2925`) … RTS NE = crash". `:2923-2925` is only the EQ / no-crash path (`LDX OLINK,X` / `BNE COL1` / `RTS RET EQ`); the NE/crash return is `LDA #1 / RTS HIT` at **:3011**, inside the unported IC1 routine. (lang-review #17.) | `collision.ts:27`; `collision.test.ts:29` | Cite `:2925` for the EQ/no-crash return and `:3011` for the NE/crash return (noting :3011 is in the deferred pixel stage), or drop the "(RTS NE = crash)" parenthetical from the `:2923-2925` citation. |
| [DOC][LOW] | The CENTMP comment frames the `(x<<8)|y` shortcut as deferring only "pixel-precise centre refinement", implying the hit is already correctly decided. In the ROM, reaching CENTMP requires a pixel match already found — it is part of the hit decision, not a refinement on top of it. | `collision.ts:34-36` | Clarify that df4-1 approximates the hit-decision mechanism itself (box-only vs pixel-perfect), not just CENTMP precision. |
| [RULE][LOW] | Four bare non-null assertions on a `Hit \| null` with no preceding null check in that test — on an unexpected null they throw a raw TypeError instead of a legible assertion failure (lang-review #1). Fails loud, not silent, so LOW; fold into this rework since the file is already being touched. | `collision.test.ts:191`, `:192`, `:204`, `:225` | Add `expect(hit, …).not.toBeNull()` before the `!` uses (as the first AC1 test already does) or use the `?.` chain form the AC2 tests use. |

**Non-blocking follow-ups** (captured under Delivery Findings, not required for this rework):
- `screenAddr` (`collision.ts:93`) silently wraps for coordinates outside the ROM's 0–255 byte range — add a byte-range assumption/assertion when a less-trusted caller appears (reviewer-security + rule-checker #21).

**Dispatch tags:** [EDGE] no unhandled boundary path — the four-edge exclusive box + (0,0) skip are exhaustively pinned and mutation-proven (rule-checker M1–M8). [SILENT] no swallowed errors; `loadCollision`'s catch adds self-describing context (rule-checker #11). [TEST] no vacuous/tautological assertions — 10-mutant battery, 0 survivors; the collisionPicture fixture uses two different pictures so an echo mutant dies. [DOC] the three MEDIUM/LOW findings above (comment-analyzer, verified against the ROM source). [TYPE] types clean — all fields `readonly`, proper interfaces, no `Record<string,any>`/`object`/`Function` (rule-checker #2). [SEC] no injection/auth/secret/leak surface; pure reducer over in-memory snapshots (reviewer-security clean). [SIMPLE] the three query wrappers are thin `collide` delegations but justified as AC2's three distinct cited call sites — not over-engineered. [RULE] the four LOW non-null assertions above (rule-checker #1); src/core purity held (purity sweep green).

**Handoff:** Back to Dev (Yoda) for green rework — comment/citation corrections + a logged deviation + the 4 non-null cleanups. No behavioural change, no test-logic change; the 26 tests and 482-green project stay green.
## Subagent Results (round 2 — current)

Re-review of the green rework (commit `dec0b6bc`). I verified via `git diff 2d8d05a1 HEAD` that the `collide()` LOGIC is byte-identical since GREEN (the rework touched only comments + the loadCollision message + three added `.not.toBeNull()` guards), so round-1's clearances that depend on behaviour still hold; the two enabled subagents whose DOMAIN the rework touched (preflight, comment-analyzer) were re-dispatched.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (round 2) | clean | none | N/A — 482/482, tsc, purity + citation gate green; 0 smells; confirmed no behavioural change |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — logic unchanged; round-1 boundary coverage (mutation-proven) unaffected |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no error-handling change |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test logic unchanged (guards only ADD assertions); round-1 mutation battery still valid |
| 5 | reviewer-comment-analyzer | Yes (round 2) | findings | 2 | confirmed 2 LOW (imprecise :3011 vs :3010-3011; stale Hit-doc phrase), 0 dismissed — both non-blocking follow-ups; all substantive replacement comments verified TRUE (no fresh lie) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types unchanged |
| 7 | reviewer-security | Yes (round 1, reused) | clean | none | Code logic byte-identical (verified by git diff) → round-1 security clearance holds; screenAddr note already captured |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — structure unchanged |
| 9 | reviewer-rule-checker | Yes (round 1, reused) | findings→fixed | 4→0 | Code logic byte-identical → round-1 10-mutant battery still valid (all killed); the 4 LOW non-null findings (#1) are now FIXED (`.not.toBeNull()` guards added; preflight lint+tests green) |

**All received:** Yes (2 re-dispatched this round; 2 reused with git-diff-verified justification; 5 disabled)
**Total findings:** 2 confirmed LOW (non-blocking follow-ups), 0 blocking; round-1's 4 non-null findings fixed

## Reviewer Assessment

**Verdict:** APPROVED

The round-1 defect (box-only port over-claiming a full COLIDE + a mis-cited crash return) is **verifiably fixed**: reviewer-comment-analyzer (round 2) independently byte-confirmed every replacement citation against `reference/original-source/defender/DEFA7.SRC` — `:3011`=`RTS HIT` (crash), `:2925`=`RTS RET EQ` (no-crash), `:2922`=`BHI IC1`, `:2927`=IC1 banner, `:3020`=`JMP COLLP` — and confirmed no fresh lie was introduced in the rewrite. The `collide()` logic is byte-identical since GREEN (I verified via `git diff`), so round-1's 10-mutant battery (every mutant killed) and security clearance still hold, and the 4 LOW non-null findings are now fixed with `.not.toBeNull()` guards.

**Data flow traced:** synthetic `CollObject[]` snapshot + a `Query` box → `collide()` linear list scan → `Hit | null` (struck object + its collision picture + box-level CENTMP `screenAddr`). Safe: pure, deterministic, mutates no input (frozen fixtures prove it), reads no clock/entropy/DOM/network, imports no shell code (purity sweep green). Box overlap fails CLOSED on NaN coordinates (accept-style `&&` chain).

**Pattern observed:** the ROM's own object-LIST scan with exclusive-boundary AABB semantics, ported faithfully (Decision A) rather than as a spatial index — `collision.ts:75-98`. Box dims are inputs; the module mints no box-dimension constants.

**Error handling:** `loadCollision()`'s catch adds self-describing context (`collision.test.ts:149-157`); no swallowed errors; the reducer has no throw path (verified by reviewer-security across NaN/Infinity/negative/huge inputs).

**Remaining (non-blocking, captured as Delivery Findings, LOW):** cite `:3010-3011` rather than `:3011` for the `LDA #1 / RTS HIT` pair; qualify the `Hit` interface's "return on a crash" JSDoc; add a byte-range assumption for `screenAddr` when a less-trusted caller appears. None block merge — the substantive fidelity is correct, the claims JSON is byte-gated, and the code is mutation-proven.

**Dispatch tags:** [EDGE] boundary paths exhaustively pinned + mutation-proven (round-1 M1–M8, logic unchanged); no unhandled edge. [SILENT] no swallowed errors; the one catch adds context. [TEST] test logic unchanged and mutation-proven (0 survivors); the 3 added guards only strengthen it. [DOC] round-1 findings fixed and re-verified TRUE by comment-analyzer; 2 residual LOW nits deferred as follow-ups. [TYPE] types clean (readonly, proper interfaces) — unchanged. [SEC] pure reducer, no injection/auth/secret/leak surface; NaN fails closed (reviewer-security clean). [SIMPLE] three thin query wrappers justified as AC2's cited call sites; no over-engineering. [RULE] src/core purity green; the 4 non-null (#1) findings fixed.

**Handoff:** To SM for finish-story.