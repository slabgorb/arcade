---
story_id: "ml8-2"
jira_key: "ml8-2"
epic: "ml8"
workflow: "tdd"
---
# Story ml8-2: Mutation battery over the scroll geometry (ml3-5) + the two-POKEY sound driver (ml6-1): pin output coordinates and channel writes against surviving mutants; group any survivors by file surface, not by subsystem.

## Story Details
- **ID:** ml8-2
- **Jira Key:** ml8-2
- **Workflow:** tdd
- **Stack Parent:** none
**Branch:** feat/ml8-2-mutation-battery-scroll-sound
**PR:** https://github.com/slabgorb/arcade/pull/386

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T19:17:49Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T18:46:57Z | 2026-08-14T18:49:03Z | 2m 6s |
| red | 2026-08-14T18:49:03Z | 2026-08-14T19:03:23Z | 14m 20s |
| green | 2026-08-14T19:03:23Z | 2026-08-14T19:04:51Z | 1m 28s |
| review | 2026-08-14T19:04:51Z | 2026-08-14T19:17:49Z | 12m 58s |
| finish | 2026-08-14T19:17:49Z | - | - |

## Sm Assessment

Title-only 5pt tdd mutation-hardening story; **both premises measured before setup** (do not re-derive):
- **ml6-1 sound driver** — the ml6-1 Reviewer chartered ml8-2 *by name* and pre-identified the survivors: sweep VALUES of 8 of 12 effects unprotected (freqSweep byte-pinned only slots 2/6/10; contSweep only 1/2/6). UNGUARDED: FREQ0,1,3,5,6,8,9,11 + CONT0,3,5,10 + bee/inchworm/earwig/bonus constant volumes. Mutation-confirmed (FREQ1+CONT5 → 19/19 green). DATA is byte-correct today — missing regression protection, not a wrong value. Surface: `plugins/millipede/tests/sound-rom.test.ts` (+ `docs/rom-study/claims/07-sound.json`).
- **ml3-5 scroll geometry** — ml3-5's own review already reddened survivors M8/M9 (0x70 / 0xF8 boundaries) and ruled GREY_POISON_MAX equivalent; TEA runs a *fresh* battery to find what ml3-5 did NOT cover — the OUTPUT COORDINATE emission (title: "pin output coordinates"). Surface: `plugins/millipede/src/core/` scroll module + its core unit test.

Open directional pin (ml6-1 Dev flagged it "belongs in ml8 hardening"): sweep play order resolved STORED-REVERSED but `NY` macro absent from vendor tree, so unverified; RED currently passes forward OR reversed. Pin direction against emitted output if possible; else document as open.

Group survivors **by file surface, not subsystem**. Test-only — production behavior unchanged; millipede vitest project must stay green. Sibling-race probe clean (no branch/session elsewhere). Claim branch pushed. Route to TEA (red).

## Tea Assessment (RED)

**Deliverable:** mutation-battery guards for both file surfaces, appended to the
two existing test files — production is byte-correct and **UNCHANGED** (a
coverage-hardening story). Two batteries, harnesses in the ml8-2 scratchpad,
each mutant a single-line WRONG value, source restored by `git checkout`, every
site applied by exact single-match (`git diff --numstat` = `1 1`, no wrong-dup
risk).

### File surface 1 — sound driver (`plugins/millipede/src/shell/sound-rom.ts`)
Commit `fb342401`. 23-mutant battery, confirmed against **every** importer
(sound-rom / pokey-voice / pokey-voice-range / audio / events — not just
sound-rom.test.ts, since the range/length consumers add partial coverage).
- **Before guards:** 17 survivors reddened nothing; the 6 controls (FREQ2/6/10,
  CONT1/2, shot 0x68 — already multiset-pinned) reddened.
- **Survivors closed:** FREQ byte-values slots **0,1,3,5,8,9,11**; CONT
  byte-values slots **0,3,5,10**; constant volumes **bee(7)/inchworm(8)/earwig(9)/
  bonus(11)**; and **PLAY DIRECTION** — removing `.reverse()` from *both*
  `freqSweep` and `contSweep` survived the whole suite.
- **Guards (`describe('ml8-2 …')`, 24 new tests):** every table-backed slot's
  `freqSweep`/`contSweep` pinned to the **exact ordered play sequence** = the
  stored table REVERSED, tables transcribed **independently from MLIRQ.MAC**
  (not copied from the module under test). One `.toEqual` per slot kills the
  value gap AND the direction gap at once; constant-volume slots pinned by
  `Set`+length. **After guards:** all 17 survivors + both `.reverse()` mutants
  redden (re-run battery proof).
- **Note — pre-identified list corrected by measurement:** ml6-1's Reviewer
  listed FREQ6 among the unguarded; the battery shows FREQ6 **is** pinned (its
  control reddened). Ran the battery rather than trusting the list.
- **Direction resolution:** the pins lock ml6-1 GREEN's shipped decision
  (STORED-REVERSED, its Design Deviation). The `NY` macro is still absent from
  the vendored tree, so this pins the *derived* decision, not a byte-verified
  one; if a future story recovers `NY` and it reads forward, production's two
  `.reverse()` calls and these pins flip together. That was ml6-1 Dev's
  explicit "belongs in ml8 hardening" ask — now done.

### File surface 2 — scroll geometry (`plugins/millipede/src/core/scroll.ts`)
Commit `de2ecc02`. 23-mutant battery (constants + operators + return deltas);
scroll.ts has no runtime importer, so confirmation = scroll.test.ts. ml3-5's own
review already pinned the shift geometry tightly (whole-column/whole-field
`toEqual`, the $70/$6F rock and $78/$7C poison boundaries), so nearly everything
reddened. **3 survivors:**
- **1 REAL gap (guarded):** scrollUp's push-off-the-**top** count masks the grey
  bit with `& 0x7f` before the rock threshold (SC-45), but every scrollUp count
  test used bit-7-clear values → dropping the mask (`& 0xff`) survived.
  scrollDown's twin *is* covered (its grey $80|$6E DDT-stamp test). Added the
  mirror test for the scrollUp side (1 new test); re-run battery: now reddens.
- **2 EQUIVALENT (documented, no guard, no follow-up):** `GREY_POISON_MAX`
  0xFC→0xFD and the band's upper `<`→`<=` are the same equivalence — both admit
  $FC, whose `$FC | $04` poison→normal conversion is a no-op (bit 2 already set).
  Same class ml3-5's review ruled equivalent (GREY_POISON_MAX).

### Verification
- `npx vitest run --project millipede` → **1133/1133 green** (67 files).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.
- `git status` → only the two committed test files changed; `sound-rom.ts` and
  `scroll.ts` untouched. Both commits pushed on `feat/ml8-2-…`.

### Rule Coverage (lang-review: typescript.md)
- **#15 — "every guard must be mutation-tested: delete the mechanism and require
  red."** This story is that rule end-to-end: every guard was authored *from* a
  confirmed survivor and re-run under its mutant to prove it reddens.
- **#18 — a helper that reimplements the algorithm is untested code.** The sound
  guards transcribe expected tables as independent literals from MLIRQ.MAC and
  only call the module's own exports; the scroll guard reuses the file's `idx`/
  `emptyField`/`column` geometry helpers, reimplementing no reducer logic.
- **Meaningful assertions:** every guard is a concrete `.toEqual` on bytes or a
  `.toBe` on a count delta — no `assert(true)`, no `is*` on a constant.

**GREEN-phase note for Dev (Loki):** nothing to implement — both modules are
faithful and unchanged; the guards already pass. Your GREEN is a verification
pass (suite green, lint clean — both confirmed at this handoff), then the
simplify fan-out over the two changed test files. Do NOT add production code to
manufacture a RED (that would be changing a byte-verified ROM port to satisfy a
ritual). **AC-4 (group survivors by file surface):** satisfied — the two
batteries and their findings are reported per file surface above, not by
subsystem. **No out-of-scope follow-up stories owed:** the one non-blocking
production hardening ml6-1 flagged (shouldTick out-of-range → phantom `true`) is
a *code* guard, not a test pin, and is out of this test-hardening story's scope
— re-flag it to the Reviewer if a bounds guard is wanted, else it stays a
non-blocking note.

**Verdict:** RED complete. 18 coverage gaps closed by mutation-proven guards
(17 sound + 1 scroll), 1 direction gap closed, 2 equivalent mutants documented,
0 code defects found, 0 follow-up stories owed.

## Delivery Findings

### Measured Premises (SM pre-setup measurement, TEA do not re-derive)

**File Surface 1: Scroll Geometry (ml3-5 core)**
- ml3-5 shipped SCROLL/SCROLD/SCROLU reducers for scroll-aware coordinate transformation
- ml3-5's OWN review ran mutation battery; survivors M8/M9 (0x70 boundary, 0xF8 poison edge) were reddened; GREY_POISON_MAX ruled EQUIVALENT
- Geometry boundaries already mutation-proven; TEA should re-run battery to find UNCOVERED output coordinate emission (the title spec: "pin output coordinates")
- Files in scope: `plugins/millipede/src/core/` (scroll module) + its core unit test

**File Surface 2: Sound Driver (ml6-1 shell)**
- ml6-1 shipped two-POKEY driver (AUDF0/AUDC0 lower, AUDF1/AUDC1 upper via pokeyOf)
- Reviewer pre-identified surviving mutants: 8 of 12 effects byte-unprotected
  - FREQ0, FREQ1, FREQ3, FREQ5, FREQ6, FREQ8, FREQ9, FREQ11 (only 2/6/10 byte-pinned)
  - CONT0, CONT3, CONT5, CONT10 (only 1/2/6 byte-pinned)
  - Bee/inchworm/earwig/bonus constant volumes (only guard: `distinct(freqSweep(i)) > 1`)
- Mutation-confirmed: FREQ1 + CONT5 mutated → 19/19 still green
- DATA is byte-correct (re-parsed MLIRQ.MAC:148-239, reverse-read included); this is MISSING REGRESSION PROTECTION, not wrong values
- OPEN: sweep play order (STORED-REVERSED via `[...table].reverse()`) not byte-verified (NY macro absent from vendor source); direction stays open unless TEA pins emitted output
- Second finding (non-blocking, may be out-of-scope): shouldTick(index) returns true for out-of-range index where table returns []
- Files in scope: `plugins/millipede/tests/sound-rom.test.ts` (extend exact-value pins) and/or `docs/rom-study/claims/07-sound.json`

## Acceptance Criteria

1. Fresh mutation battery over BOTH file surfaces (scroll geometry + sound driver)
2. Every survivor either reddened by new exact-value pin OR documented as EQUIVALENT with reasoning
3. ml6-1's pre-identified survivors (FREQ0,1,3,5,6,8,9,11; CONT0,3,5,10; constant volumes) each covered by toEqual byte-pin
4. Survivors grouped/reported BY FILE SURFACE (core scroll test vs sound-rom test), not by subsystem
5. Test-only change; production behavior unchanged
6. Full millipede vitest project green

## Design Deviations

No design deviations documented at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **[ACCEPTED — Reviewer]** No deviations from spec. This is a coverage-hardening story: TEA's two mutation
  batteries proved `sound-rom.ts` and `scroll.ts` already faithful, so GREEN adds
  no production code. Manufacturing a RED by editing a byte-verified ROM port
  would itself be the deviation; per the minimalist discipline, nothing was
  written.

## Dev Assessment

**Implementation Complete:** Yes (verification pass — no production code by design)
**Files Changed:**
- `plugins/millipede/tests/sound-rom.test.ts` — 24 ml8-2 mutation-battery guards (TEA, committed `fb342401`)
- `plugins/millipede/tests/scroll.test.ts` — 1 ml8-2 guard for the scrollUp push-off-top grey mask (TEA, committed `de2ecc02`)
- Production `sound-rom.ts` / `scroll.ts`: **UNCHANGED** (`git diff origin/develop` empty).

**Verified on current branch tip (pushed):**
- `git status` clean; working tree has no uncommitted work.
- `git diff origin/develop -- plugins/millipede/src` empty — both reducers untouched.
- `npx vitest run --project millipede` → **1133/1133 green** (67 files).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.

**Tests:** 1133/1133 passing (GREEN). The guards' "RED" was demonstrated
per-mutant by TEA's batteries (the correct shape for a mutation-hardening story);
there is no literal failing test to turn green.

**Branch:** feat/ml8-2-mutation-battery-scroll-sound (pushed)

**Handoff:** To review (Reviewer / Heimdall).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | — (1133 green, lint clean, production untouched, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 2 (CONT[4] gap, length-coupling), dismissed 1 (redundant STORED-REVERSED block) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | — (arithmetic, transcriptions, equivalence, citations all verified vs source) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 5 | confirmed 2 (CONT[4] gap #15/#19, completeness comment #17 — both fixed), dismissed/noted 3 (non-null assertion cosmetic; scratchpad-harness precedented-low; equivalence-claim unverified-but-consistent) |

**All received:** Yes
**Total findings:** 3 confirmed (all fixed in-branch), 4 dismissed/noted (with rationale), 0 deferred

**Reviewer's own supplemental work** (disabled-subagent compensation, per project convention):
- **Differential mutation probe** over 13 sites RED's two batteries did NOT touch (MASK bytes, pokeyOf boundary, shouldTick, const-fill `||1`, null-branch inversion, scroll nextInt range, col-sweep direction, RND check, grey OR, both inner shift-loop bounds) → **all 13 KILLED**, no new gaps beyond the CONT[4] survivor the subagents independently found.
- **Independent transcription cross-check** — parsed MLIRQ.MAC:148-239 and confirmed production `freqSweep`/`contSweep` equal the source tables reverse-read for all 16 tables + 5 constant volumes (fully independent of the test literals).

## Reviewer Assessment

**Verdict:** APPROVED

Tags reviewed: [EDGE] (disabled — covered by my differential probe + edge cases in the battery), [SILENT] (disabled — N/A, test-only, no error paths), [TEST] (test-analyzer: 2 confirmed→fixed, 1 dismissed), [DOC] (comment-analyzer: clean), [TYPE] (disabled — N/A, no new types; one cosmetic non-null assertion removed), [SEC] (disabled — N/A, test-only, no external input), [SIMPLE] (disabled — one redundant block dismissed with rationale; length assertion simplified), [RULE] (rule-checker: 2 confirmed→fixed, 3 noted).

**Data flow traced:** ROM source (MLIRQ.MAC / MLSUB.MAC bytes) → independent test literals → `.toEqual` against the real `freqSweep`/`contSweep`/`scrollUp` exports. Safe because the expected side is transcribed from primary source (not the module under test), verified byte-for-byte by comment-analyzer, test-analyzer, and my own cross-check.
**Pattern observed:** mutation-battery guard pattern (mirrors ml8-1) at `sound-rom.test.ts` and `scroll.test.ts` — every guard authored from a confirmed survivor and re-run under its mutant.
**Error handling:** N/A — test-only diff; production (`sound-rom.ts`, `scroll.ts`) unchanged (`git diff origin/develop` empty).

**One HIGH finding, resolved in-branch:** rule-checker (#15/#19) and test-analyzer independently found `contSweep(4)` (dragonfly's null CONT pointer) was a live, unguarded survivor — the one slot in neither ml8-2 CONT table, though its FREQ twin was guarded. I re-confirmed it (mutating `source == null` survived the whole suite), then closed it in commit `6e43a30c` with the CONT twin of the freqSweep(4)/(7) null guards, decoupled the constant-volume length assertion from `freqSweep` (independent literal step counts, removing a non-null assertion), and corrected the survivor-count comment. The new guard is mutation-proven (reddens under the null-branch mutant); full millipede project **1134/1134 green**, lint clean, production still untouched.

**Dismissed/noted:** the redundant STORED-REVERSED slot-2 block (not vacuous — FREQ2/CONT2 aren't palindromes — and carries documentation value; kept); the equivalence claim for GREY_POISON_MAX (consistent with ml3-5's own ruling, arithmetically true: `0xFC|0x04==0xFC`); the battery harness living in the session scratchpad rather than a committed script (precedented — ml8-1 was approved the same way — non-blocking).

### Devil's Advocate

Assume this is broken. First attack: the guards pass only because the transcribed literals were copied from the same faithful production tables, so a shared transcription error would ship green undetected. Refuted — three independent readers (comment-analyzer, test-analyzer, and my own MLIRQ.MAC parser) checked the literals against primary source byte-for-byte, and my parser compared *production's emitted output* to the source reverse-read without touching the test literals at all; a shared error would have to exist in the ROM file itself. Second attack: the play-direction pin locks a DERIVED decision (STORED-REVERSED) that the absent `NY` macro cannot confirm, so it could be pinning a wrong direction into permanence. Partially conceded — but the pin locks exactly what ml6-1 shipped, so it protects against silent regression, not against a future macro recovery (which would flip production and pin together); this is the correct scope for a hardening story and is documented as such. Third attack: a confused maintainer deletes a "redundant" freqSweep pin and the constant-volume length assertion silently stops guarding. Refuted for the fixed version — the length assertion now uses independent literals, so it no longer depends on any sibling test. Fourth attack: the mutation battery's completeness is unverifiable because its harness is ephemeral, so other survivors could lurk. Mitigated — I ran a 13-site differential probe over exactly the classes RED skipped and all reddened; the one true survivor (CONT[4]) was caught by two subagents and is now closed. Fifth: could a stressed CI (no vendored ROM tree) weaken these? No — the guards assert against in-file literals and the imported module, not against the vendored tree (that gate is the separate citations suite). Residual risk is low and confined to the documented derived-direction pin. Nothing blocks approval.

**Handoff:** To SM for finish-story.

## Delivery Findings

<!-- Reviewer findings appended below -->

### Reviewer (code review)
- **Improvement** (non-blocking): the mutation-battery harnesses live in the ml8-2 session scratchpad, not a committed re-runnable script — the same convention ml8-1 used (approved there), and the direct reason the CONT[4] survivor was found by inspection rather than mechanically. Affects future ml8 hardening passes (consider committing a `tools/` battery script so survivor-completeness is machine-checkable). *Found by Reviewer during code review.*
- **Gap** (non-blocking, pre-existing, out of scope): `shouldTick(index)` returns `true` for an out-of-range `index` (`MASK[index]` undefined → `undefined & intct === 0`) where `freqSweep`/`contSweep` return `[]` — a production hardening opportunity ml6-1 already flagged. It is a code guard, not a test pin, so it is out of this test-only story; re-file if a bounds guard is wanted. Affects `plugins/millipede/src/shell/sound-rom.ts:210-212`. *Found by Reviewer during code review.*