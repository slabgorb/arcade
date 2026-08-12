---
story_id: "ml6-1"
jira_key: "ml6-1"
epic: "ml6"
workflow: "tdd"
---
# Story ml6-1: Two-POKEY, eight-channel sound driver in core/shell: port the SOUNDS routine (MLIRQ.MAC:8) over the CHAN table (MLDEF.MAC:311), writing AUDF0/AUDC0 (MLDEF.MAC:83-84) and AUDF1/AUDC1 (:96-97), lower/upper POKEY by channel (MLIRQ.MAC:58). Reuse @shared/synth + centipede sound.md; the sweep IS the effect (not a static beep).

## Story Details
- **ID:** ml6-1
- **Jira Key:** ml6-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml6-1-two-pokey-sound-driver
- **PR:** https://github.com/slabgorb/arcade/pull/297 (into develop — awaiting boss merge)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T19:36:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T18:54:00Z | 2026-08-12T18:56:10Z | 2m 10s |
| red | 2026-08-12T18:56:10Z | 2026-08-12T19:09:53Z | 13m 43s |
| green | 2026-08-12T19:09:53Z | 2026-08-12T19:18:12Z | 8m 19s |
| review | 2026-08-12T19:18:12Z | 2026-08-12T19:36:43Z | 18m 31s |
| finish | 2026-08-12T19:36:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Question, non-blocking] Sweep play DIRECTION unverified — GREEN must resolve against the `NY` macro.** SOUNDS reads its FREQ/CONT tables via negative-Y indexing off a `table-1` pointer (MLIRQ.MAC:38-40) and the header states the bytes are stored "IN THE OPPOSITE ORDER WRITTEN TO THE POKEY" (MLIRQ.MAC:106-107) — strongly implying emission is the table REVERSED. TEA did not confirm the vendored `NY` macro's exact semantics, so no RED test asserts a play direction: every sweep assertion compares as multiset / endpoint-set / monotonic-either-way, all true forward OR reversed. GREEN owns nailing the direction against the macro definition and logging it as a Design Deviation if it differs from a naive forward read. This is the one open fidelity question in the driver.
- **[Improvement, non-blocking] Per-voice contention within a POKEY is out of ml6-1.** SOUNDS maps 12 logical slots onto 2 POKEYs × 4 voices with priority/contention logic (MLIRQ.MAC:20-23,66-73). This RED pins only WHICH CHIP a slot uses (`pokeyOf`), the clean cited fact. Which of a chip's four voices a slot occupies — and how a higher-priority cue steals it — is ml6-2 wiring; flag if it turns out the synth binding needs it sooner.

### Reviewer (code review)

- **Improvement** (non-blocking → **ml8-2**): the sweep VALUES of 8 of 12 effects are unprotected — `freqSweep` is byte-pinned only for slots 2/6/10 and `contSweep` only for 1/2/6; FREQ0,1,3,5,6,8,9,11 and CONT0,3,5,10 (plus the bee/inchworm/earwig/bonus constant volumes) rest solely on the `distinct(freqSweep(i)) > 1` flat-beep guard (`sound-rom.test.ts:354-364`). Mutation-confirmed by rule_checker (FREQ1 and CONT5 bytes mutated → 19/19 still green) and by me (only 5 `toEqual(sorted(...))` pins in the suite). The DATA is byte-correct today — I re-parsed all 12 FREQ + all CONT tables straight out of `MLIRQ.MAC:148-239` and every byte matches, reverse-read included — so this is missing regression protection, not a wrong value. **ml8-2 is chartered for exactly this** ("Mutation battery over ... the two-POKEY sound driver (ml6-1): pin ... channel writes against surviving mutants"); the survivors are pre-identified here to cut its churn. Affects `plugins/millipede/tests/sound-rom.test.ts` (extend the exact-value pins to every table-backed slot) and/or `docs/rom-study/claims/07-sound.json`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `shouldTick(index, intct)` returns `true` for any out-of-range `index` (`MASK[index]` is `undefined`; `undefined & intct === 0`), silently, where its siblings `freqSweep`/`contSweep` both guard the same case and return `[]`. No live bug — every caller passes a fixed 0..11 slot — but an ml6-2 off-by-one (`i <= EFFECT_NAMES.length`) would get a phantom "always tick" instead of a caught error, the exact trap the module's own NCHAN-radix paragraph guards against. Affects `plugins/millipede/src/shell/sound-rom.ts:210-212` (add a bounds guard or an explicit doc note). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Sweep play order resolved to STORED-REVERSED.** *What changed:* `freqSweep`/`contSweep` emit each effect's table in reverse of ROM storage order (`[...table].reverse()`). *What the spec said:* TEA's RED left direction unasserted (Delivery Finding: the `NY` macro isn't in the vendored tree), so every RED assertion is direction-agnostic. *Why:* three converging signals — (1) the FREQ/CONT pointers are stored as `table-1` and the slot countdown falls from N to 1 (`DEC X,CHAN`, MLIRQ.MAC:28-29), so a `(table-1)+Y` read walks the table back-to-front; (2) the header states the bytes are stored "IN THE OPPOSITE ORDER WRITTEN TO THE POKEY" (MLIRQ.MAC:106-107); (3) it is acoustically decisive — CONT2 played reversed is a loud attack decaying to silence (the explosion envelope), forward it would fade *in*. *Caveat:* the `NY` macro's exact addressing is NOT byte-verified (it is a cross-assembler global, absent from the vendored source), so this rests on the countdown + the opposite-order comment + envelope shape, not the macro text. If a later story vendors the macro and it reads forward, flip the two `.reverse()` calls — the RED suite passes either way, so it will not catch a regression here; a directional pin belongs in ml8 hardening if the macro is ever recovered.

### Reviewer (audit)

- **Sweep play order resolved to STORED-REVERSED** → ✓ ACCEPTED by Reviewer: the reasoning is sound and the caveat is honest. Verified independently that (a) the vendored tree contains no `NY` macro definition (grepped `reference/original-source/millipede/`), so the direction genuinely cannot be byte-pinned here, and (b) the acoustic argument is decisive — `CONT2` played reversed is a loud attack (0x8F…) decaying to the rests (0x00), the explosion envelope; forward it would fade *in*, which no explosion does. The deviation names exactly what would refute it (a recovered `NY` macro reading forward) and admits its own suite is blind to a regression — the correct, non-overreaching form. The one residual risk (a future edit silently flipping direction) is routed to ml8 with the fix instruction. Accepted.
- **Undocumented → coverage overclaim, corrected.** Severity: Low (record accuracy, not code). The RED-spec text carried in the session ("Every transcribed table carries a citations.test.ts-gated claim", line ~56) and the Dev note ("a claims file the citation gate byte-verifies against the vendored tree", line ~76) read as *full* byte-verified coverage. Actual coverage is **23 anchor claims** (the routine, registers, MASK/FREQ/CONT headers, and the FREQ2/CONT2/FREQ10/shot anchors) **+ 4 effects value-pinned in tests** — consistent with the ml2-3 palette-claims precedent (anchor-citation, approved), but NOT "every table". The remaining table values are hand-verified-correct and their gating is deferred to ml8-2. This correction is the authoritative record for the Architect spec-reconcile; no code change required.

## Tea Assessment

RED complete for ml6-1. `plugins/millipede/tests/sound-rom.test.ts` (19 tests, committed 4c50e3fa) fails cleanly with the "sound-rom seam not built yet" self-describing error; the other 197 millipede tests stay green and `npm run lint` (tsc) passes. Verified by direct `npx vitest run --project millipede`, not via testing-runner (its test-name reporting is unreliable per prior sprints).

**The seam GREEN must ship:** a PURE `plugins/millipede/src/shell/sound-rom.ts` (mirroring the plugin's own `gfx-rom.ts` — no fetch/DOM/canvas/clock/entropy; swept by the ml1-1 purity scanner) exporting `NCHAN`, `EFFECT_NAMES`, `pokeyOf(index)`, `MASK`, `shouldTick(index, intct)`, `freqSweep(index)`, `contSweep(index)`. Full contract in the test file's header. Every transcribed table carries a `citations.test.ts`-gated claim quoting the vendored MLIRQ/MLDEF lines verbatim (the ml2-3 palette-claims pattern; `loadClaims()` enrols a new `claims/*.json` by glob).

**Design choices, so review isn't surprised:**
- Seam lives in `src/shell` (not core), following `gfx-rom.ts` and centipede's shell-only audio precedent — but held to core purity because it is deterministic ROM data. If the Architect spec-check prefers `src/core`, it is a one-file move; the tests are behavioural and would follow the import path.
- I did **not** re-derive centipede's engine: centipede documented SOUNDS but stayed silent (no envelopes ported). Millipede genuinely diverges — it ports the FREQ/CONT sweeps — so the reuse is `@shared/synth` (the tone engine, bound in ml6-2) + centipede's `sound.md` decode *approach*, not its code.
- The sweep tests are direction-agnostic on purpose (see Delivery Findings) so a faithful GREEN passes whichever way the `NY` read resolves.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **Purity / no side-channels** — AC-7 runs the ml1-1 purity scanner over `sound-rom.ts` source (no fetch/DOM/canvas/clock/entropy), enforcing the plugin's core-boundary law on a shell file.
- **Magic-number / radix correctness** — AC-2 pins `NCHAN === 11` and `!== 0x11`, the exact decimal-vs-hex trap `.RADIX 16` sets; AC-4 pins the `MASK` bytes exactly.
- **No vacuous assertions (self-check, Phase C)** — every `it` asserts a concrete value/shape; the flat-beep guards use `Set` size `> 1` (not `is-truthy`), multiset equality uses sorted deep-equal, and the constant-volume shot asserts an exact single-element set. No `let _ =`, no `assert(true)`, no `is-None`-on-always-None.
- **No GPL leak** — AC-7 asserts the source carries no `.cpp` (MAME) citation; the sound source is the vendored `.MAC` and needs no MAME.
- **Meaningful failure messages** — the runtime module loader yields "seam not built yet" with the export list, never a collect-time stack trace (the ml1-1 loadScanner idiom).

Handing off to Dev (Korben Dallas) for GREEN. First move: resolve the `NY` play-direction (Delivery Finding) before transcribing the tables, so the sweep is ported in the right order once.

## Dev Assessment

GREEN complete for ml6-1. Shipped `plugins/millipede/src/shell/sound-rom.ts` (pure driver) + `docs/rom-study/claims/07-sound.json` (23 byte-verified claims), commit 4d0ab417 (pushed). RED test unchanged (4c50e3fa). Verified by direct `npx vitest run --project millipede` — **216/216 pass** (the 19 ml6-1 tests now green, 197 pre-existing unaffected); `npm run lint` (tsc) clean; the ml1-1 purity scanner reports **zero** violations on the new module.

**Implementation — minimal and faithful.** The seam is exactly the surface TEA specified: `NCHAN` (11), `EFFECT_NAMES` (12 slots), `pokeyOf`, `MASK`, `shouldTick`, `freqSweep`, `contSweep`. All twelve FREQ tables and the CONT sources (table / constant / program-stuffed) are transcribed verbatim from `MLIRQ.MAC:148-239` with per-line citations in the source and a claims file the citation gate byte-verifies against the vendored tree. No synth, no DOM, no wiring — that is ml6-2.

**AC coverage (all DONE):**
- **AC-1** — `src/shell/sound-rom.ts` exists and exports the seven-member driver surface. DONE.
- **AC-2** — `NCHAN === 11` (`!== 0x11`), `EFFECT_NAMES` length 12, names match CHAN0..11. DONE.
- **AC-3** — `pokeyOf` splits at 8 (0..7 → #0, 8..11 → #1). DONE.
- **AC-4** — `MASK` is the twelve ROM bytes; `shouldTick` = `(MASK[i] & intct) === 0`. DONE.
- **AC-5** — every table-backed slot sweeps (non-constant, exact ROM multiset/range); explosion/centipede-pulse/player-explosion/shot-over-constant all pinned. DONE.
- **AC-6** — dragonfly (4) and bee (7) have empty `freqSweep` (program-stuffed). DONE.
- **AC-7** — the played sweep emits a changing pitch on POKEY #0; purity + no-GPL guards green. DONE.

**One decision logged as a Design Deviation:** play order = stored-table-reversed (the `NY` reverse-read). It rests on the countdown + the "opposite order" comment + the envelope shape, not a byte-verified macro — see the deviation for the flip instruction if the macro is ever recovered. Everything else is a direct ROM transcription.

Handing off to Reviewer (Jean-Baptiste Emanuel Zorg).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 216/216 green, tsc clean, no smells (independently re-run) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered: out-of-range index (shouldTick) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — hand-covered: shouldTick silent-true is the only swallow |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: weak flat-beep guard (corroborated by rule-checker #15) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: coverage overclaim (corroborated by rule-checker A2/#17) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — hand-covered: readonly typing throughout, no `as any` |
| 7 | reviewer-security | Yes | clean | none (1 informational) | N/A — no network/entropy/secrets; robustness note folded into the EDGE finding |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — hand-covered: minimal (data + 4 pure fns), no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 — 1 deferred to ml8-2 [RULE], 1 doc-corrected [DOC], 1 non-blocking [EDGE] |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled and hand-covered)
**Total findings:** 3 confirmed (0 blocking), 0 dismissed, 2 deferred to ml8-2

## Reviewer Assessment

**Verdict:** APPROVED

The change is a byte-faithful, pure transcription of millipede's SOUNDS driver. I verified the data independently rather than trusting the suite: I re-parsed every FREQ/CONT table straight out of `reference/original-source/millipede/MLIRQ.MAC:148-239` and compared to the module's output — **all twelve FREQ tables and every CONT source match byte-for-byte**, reverse-read included — and I re-opened all 23 claims against the source (**all byte-match**). No Critical or High issue. Three Medium findings, none blocking; two are routed to their chartered owner (ml8-2), one is a record correction.

**Data flow traced:** ROM bytes (`MLIRQ.MAC` FREQ/CONT/MASK) → cited const tables in `sound-rom.ts` → pure reads (`freqSweep`/`contSweep`/`shouldTick`/`pokeyOf`) → (ml6-2) `@shared/synth`. Safe: no I/O, no untrusted input, indices are the fixed 0..11 slots. Purity scanner: 0 violations.

**Findings (all Medium, non-blocking):**
- [RULE] Citation-gate covers ~1/3 of the ROM data — 17 of 24 FREQ/CONT blocks have no `claims/*.json` entry (`docs/rom-study/claims/07-sound.json`). Not a wrong value (all hand-verified correct); missing drift protection. **Deferred to ml8-2** (chartered: "mutation battery over the two-POKEY sound driver"), survivors pre-identified in Delivery Findings. Consistent with the ml2-3 palette anchor-citation precedent, so not a rule *breach* — an intentional two-phase boundary.
- [TEST] The flat-beep guard (`sound-rom.test.ts:354-364`) asserts only `distinct > 1` for 8 of 12 slots; mutation-provable (FREQ1/CONT5 mutations stay green). Same gap as above, expressed as coverage. **Deferred to ml8-2.**
- [DOC] The session's RED-spec/Dev prose overstates coverage as "every table byte-verified"; true coverage is 23 anchor claims + 4 effects value-pinned. **Corrected** in the deviation audit (record only, no code change).
- [EDGE]/[SILENT] `shouldTick` out-of-range → silently `true` (`sound-rom.ts:210`), inconsistent with its guarded siblings. No live caller hits it; recommend a bounds guard in ml6-2/ml8.
- [SEC] Clean — no secrets, network, entropy, or injection surface; JSON is repo-authored.
- [TYPE] Clean — `readonly` throughout, `pokeyOf: 0|1`, zero `as any`/`@ts-ignore`.
- [SIMPLE] Clean — data plus four small pure functions; `freqSweep().length || 1` is the *correct* deliberate `||` (0 steps = program-stuffed → 1), not a falsy-zero bug.

**[VERIFIED] observations (evidence + rule compat):**
1. [VERIFIED] Byte-fidelity of all 12 FREQ + all CONT tables vs `MLIRQ.MAC:148-239` — independent re-parse (`verify-tables.mjs`) matched every byte; reverse-read applied consistently. Complies with the ROM-canonical rule.
2. [VERIFIED] All 23 claims in `07-sound.json` byte-match their cited source lines (independent check); complies with the citation-accuracy rule.
3. [VERIFIED] `NCHAN === 11` decimal (`sound-rom.ts:60`), not hex `0x11` — the radix trap the module documents and AC-2 pins.
4. [VERIFIED] POKEY split exactly at 8 (`pokeyOf`, `sound-rom.ts:197`) matches `MLIRQ.MAC:57-58` (`CPX I,08`/`BCC …LOWER POKEY`).
5. [VERIFIED] Purity: 0 violations from the ml1-1 AST scanner; no fetch/DOM/clock/entropy; complies with the core/shell purity law.
6. [VERIFIED] No GPL leak — no `.cpp` in any changed file; every cited file is the vendored `.MAC`.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
rule_checker enumerated 34 rules / 61 instances; I confirmed its dispositions. Compliant: #1 type-safety escapes (zero `as any`/`@ts-ignore`/bare `!`), #2 generics/`readonly` (all exports immutable), #5 module/dynamic-import idiom (the precedented gfx-rom loader, runs green), #7 async error-context, #8/#18/#26 test quality (production-vs-ROM comparisons, no fixture-equals-expectation identity, shared AST purity scanner not reimplemented), #17 the load-bearing play-direction comment is properly caveated, #21 the `|| 1` zero-mapping is intentional, #25 whole-file negative GPL guard, A1 purity, A3 no-MAME, A4 ROM-canonical (byte-exact). Violations: A2 (citation coverage — deferred), #15 (weak guard — deferred), #4 (`shouldTick` unguarded index — non-blocking).

### Devil's Advocate
Assume this driver is broken. The most dangerous line is the reverse: `[...table].reverse()`. The entire premise "the sweep IS the sound" rests on play order, and that order is derived, not byte-verified — the `NY` macro isn't in the tree. If my acoustic read is wrong, every explosion, footstep, and death cry plays backwards, and **not one test would fail**, because the suite compares multisets and monotonic-either-way — the sound could be inside-out and green. That is a genuine hole; I accept it only because the deviation is explicit, the envelope-shape argument is strong (a reversed CONT2 is a decay, the physically correct shape), and the fix is a one-line flip if a future macro contradicts it. Second attack: the eight unpinned tables. A single fat-fingered byte in FREQ5 ships silently today — mutation-proven. The data is correct now, but nothing in CI keeps it correct, and the record claims it does; a maintainer trusting that prose would not re-verify. Third: `shouldTick(12, x) === true`. An ml6-2 loop written `for (i = 0; i <= NCHAN; i++)` — plausible, since NCHAN is a *top index*, not a count — would drive a phantom slot 12 that "always ticks"; `freqSweep(12)` is `[]` so it won't loop forever, but `MASK[12]` feeds `undefined` into any arithmetic a careless caller does. Fourth: `contSweep(7)` (bee, program-stuffed) returns `[0xA8]` of length 1 — an arbitrary duration the ROM never specified; if ml6-2 reads that length as the bee's sound duration, it is wrong. None of these is a *current* defect (verified data, fixed callers), but three of the four are silent-by-construction — which is exactly why they are logged for ml6-2/ml8 rather than waved off.

**Handoff:** To SM for finish-story. Session file, story context (`sprint/context/context-story-ml6-1.md`) and feature branch `feat/ml6-1-two-pokey-sound-driver` (cut from `develop`) are in place; story flipped to `in_progress`; Jira disabled. Merge gate clear (no open PRs).

**Scope — driver ONLY.** This story ports the two-POKEY / eight-channel sound driver: the SOUNDS routine (MLIRQ.MAC:8) over the CHAN table (MLDEF.MAC:311), writing AUDF0/AUDC0 (MLDEF.MAC:83-84, POKEY #0) and AUDF1/AUDC1 (MLDEF.MAC:96-97, POKEY #1), with lower-vs-upper POKEY selected by channel (MLIRQ.MAC:58). Wiring sfx to core game events + audio-gesture gating is **ml6-2 and OUT OF SCOPE here** (ml6-2 is itself blocked on ml3/ml4 events, which do not exist yet).

**Reuse-first (verified in-tree):** reuse `src/shared/synth.ts` (@shared/synth) and follow centipede's decode approach in `plugins/centipede/docs/rom-study/sound.md` — do not re-implement a synth. Millipede adds one chip over centipede (two POKEYs, eight channels vs one).

**Guardrails for TEA/Dev:**
- THE SWEEP IS THE SOUND — per-effect frequency/amplitude envelopes must sweep; a static render is flat beeps (the silent-feature trap). Pin the envelope shape, not just a first-frame value.
- Every new constant carries a `citations.test.ts`-gated claim citing `millipede/<FILE>.MAC:<line>`; MAME cited in prose only, never copied (GPL). Core-boundary/purity stays green.
- The millipede reference source is licence-walled/gitignored — cite it, do not commit ROM bytes.

Handing off to TEA (Leeloo) for the RED phase.