---
story_id: "jt3-1"
jira_key: ""
epic: "jt3"
workflow: "tdd"
---
# Story jt3-1: Difficulty ramp — DYTBL 28-row decode, IWAVE per-wave walk + plateau, GA1 starting column, retrofit jt2's per-wave stubs

## Story Details
- **ID:** jt3-1
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none (depends on jt2-5, not stacked)

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-21T13:55:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T13:06:41Z | 2026-07-21T13:30:00Z | - |
| red   | 2026-07-21T13:30:00Z | 2026-07-21T13:32:00Z | RED committed 5e382ed (23 reds); TEA plateau fix 67c4f99 |
| green | 2026-07-21T13:32:00Z | 2026-07-21T13:55:00Z | GREEN committed 0790abd; 1112/1112; build green |
| review | 2026-07-21T13:55:00Z | - | - |

## Technical Approach

The ROM's difficulty engine is centralized in this story. DYTBL contains 28 DYWORD rows (JOUSTRV4.SRC:7303-7332), each a start→end pair walked once per wave by a per-difficulty step schedule then held flat (IWAVE, JOUSTRV4.SRC:1890-1926). The operator GA1 (default 5) picks the starting column — tiers 0-3 / 4-6 / 7+ (JOUSTRV4.SRC:930-939).

The full 28-row DYTBL decode is derived from source with a re-derivation gate against the vendored tree (following the jt2-5 90-row WAVTBL pattern). Radix discipline applies: every DYWORD constant carries a radix-cited comment + claims entry (Motorola syntax — bare DECIMAL, $ hex, @ octal, % binary).

Per user ruling (A), jt2's story-local stubs are retrofitted to read from this difficulty walk:
- EMYTIM divider (2 on waves 1-2, JOUSTRV4.SRC:2202-2205)
- Lava-level step ($EA→$E5→$E0, JOUSTRV4.SRC:1929-1933)
- NSMART/WSMART budget seed (pursuit nibble, JOUSTRV4.SRC:2075-2129)

The retrofit changes the SOURCE of these values, not any given wave's realized value — jt2's seeded determinism replays must survive bit-for-bit (the jt2-1 migration bar).

## Acceptance Criteria

- All 28 DYTBL rows decoded and committed with a re-derivation gate against the vendored source (the jt2-5 byte-gate pattern); the IWAVE walk-once-per-wave-then-plateau law and the GA1 starting-column tiers (0-3/4-6/7+) hold by test at two GA1 tiers; claims entries for the table format and the decode.
- The retrofit re-points jt2's EMYTIM / lava-level / budget-seed stubs to read from the DYTBL walk; jt2's seeded determinism replays reproduce bit-for-bit (the migration changes the source, not any wave's realized values).
- A difficulty value walks start->end by its per-difficulty step exactly once per wave then plateaus (a wave past the walk length reads the end value); proven by test.
- No wall-clock, no Math.random in core (purity guard green); npm test fully green including citations.

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): The DYWORD row is NOT a "start→end pair" (YAML) nor "start/end/step triples" (glossary.md:49). Traced from source — the `DYWORD` macro (`JOUSTRV4.SRC:210-213`) + field EQUs (`JOUSTRV4.SRC:202-208`) emit a **14-byte** struct (`DYWLEN`=14): **three** start columns (`DYWST0/1/2`, one per GA1 tier, `:202-204`), a signed word **end** (`DYWEND`, `:205`), a **5-byte / 10-nibble** per-difficulty step-cadence table (`DYWTIM`, `:206`), and a signed **byte** increment (`DYWINC`, `:207`). **TRANSCRIPTION TRAP for Dev:** the macro moves `INCRE` (its 4th operand) to the **last** emitted byte — `FDB START1,START2,START3,ENDV,TIM1,TIM2 / FCB TIM3,INCRE` — so operand order ≠ byte order. Decode in emission order; the byte-gate (`tests/difficulty-source.test.ts`) re-derives all 28×14 bytes independently.
- **Gap** (non-blocking): The retrofit's three stubs are **not** all in `wave.ts` as the story states. Dev re-points: `src/core/wave.ts::emytimForWave` (~:288) and `src/core/wave.ts::seedWaveBudget` (~:297), **plus** `src/core/arena.ts::lavaLevelForWave` (~:326, with `LAVA_START/MIN/STEP` :116-120). All three must read from `src/core/difficulty.ts` while keeping realized values bit-for-bit — jt2's existing pins that must stay green: `tests/wave.test.ts:346-368` (EMYTIM + budget) and `tests/arena.test.ts:374-408` (lava).
- **Question** (non-blocking): `EMYTIM` / lava / budget-seed are **not** literal `DYTBL` rows — they are the *other* per-wave knobs computed in the same `IWAVE` inter-wave pass (lava `:1929-1933` sits inside `IWAVE` right after the DYTBL loop; EMYTIM `:2202-2205` and the budget seed `:2075-2077` are seeded per wave). I read ruling A as "centralize the whole `IWAVE` difficulty engine" and put all four in `src/core/difficulty.ts`. The **raw DYTBL decode is certain** (byte-gated). The one soft spot is the walk's **wave↔pass offset**: I traced init-timer=2 (`:945`), one IWAVE pass per wave-advance, so `difficultyValue(row,ga1,wave)` = the value after `wave-1` passes (wave 1 = the start). The reference-walk in `tests/difficulty.test.ts` pins this; if Dev's read of the offset differs, reconcile against the cited walk lines (`:1890-1926`) — the table is not in doubt, only the pass mapping.
- **Info:** Files added (test-only, no `src/`): `tests/difficulty.test.ts` (behaviour: AC-1 decode + GA1 tiers, AC-3 walk/plateau, AC-2 retrofit identity+golden, AC-4 purity), `tests/difficulty-source.test.ts` (source byte-gate + laws + retrofit source-wiring + JT31 claim coverage), `tests/helpers/difficulty-contract.ts` (contract + `loadDifficulty` loader), `docs/rom-study/claims/difficulty.json` (33 `JT31-*` claims, byte-verified by the citations gate).

### Dev (implementation)

- **Info:** Built `src/core/difficulty.ts` (committed 28-row DYTBL decode via a generator against the source, byte-gated; `ga1StartColumn`/`stepNibble`/`difficultyValue` IWAVE walk; retrofit seams `emytimForWave`/`lavaLevelForWave`/`seedBudgetForRow`). Retrofit re-points `wave.ts::emytimForWave`+`::seedWaveBudget` and `arena.ts::lavaLevelForWave` to the engine. **jt2 determinism pins stayed bit-for-bit green** (`wave.test.ts:346-368`, `arena.test.ts:374-408` all pass). Byte-gate green (392 bytes re-derive). Build green (tsc + vite). No test/claim files touched.
- **Info (wave↔pass offset RECONCILED CLEAN):** My independent read of the IWAVE walk agrees with TEA's reference walk exactly. Traced: CIA init `BRA IWAVE2` (`:1883`) SKIPS the difficulty walk on the first pass, and the end-of-wave loop `LBEQ IWAVE` (`:2099`) runs the walk once per subsequent wave — so during wave N the walk has run N-1 times (wave 1 = start, timer seeded 2 at `:945`). AC-3's `refWalk` reproduces byte-for-byte; the golden `LAVTIM@GA1 9 = [4,4,3,2,1,1]` holds. **No disagreement on the offset.**
- **Conflict** (blocking): `tests/difficulty.test.ts:203` ("is monotonic…") asserts `difficultyValue(BODNVY, 5, 80) === end (768)`, but the correct ROM value is **576** — and TEA's OWN `refWalk` (test lines 50-73, run verbatim) produces **576** too, so this single assertion contradicts TEA's reference simulation. Root: BODNVY@GA1 5 = tier 1 start 256, inc +32, cadence **nibble 8** (byte-gated `timeBytes[2]=0xF8`, low nibble for odd GA1 — confirmed by the passing `stepNibble` tests). 16 steps of +32 at cadence 8 → it plateaus at wave **123**, not 80. Wave 80 = 10 steps = 576. The monotonic law itself (gap-never-grows) PASSES for all three rows; only the "deep enough to plateau by 80" assumption is wrong for this slow row. Affects `tests/difficulty.test.ts:203` (needs a deeper wave, e.g. `123+`, for BODNVY's `toBe(end)`, or drop the plateau-by-80 claim for slow rows). *Escalated to SM per the double-entry rule — NOT edited by Dev. This is the ONLY red (1111/1112 green).* *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): AC-2 delegation is not test-enforced. The source-wiring gate (`tests/difficulty-source.test.ts:264-282`) only does `expect(src).toMatch(/difficulty/)`, which a bare comment satisfies; the AC-2 identity tests (`tests/difficulty.test.ts:243-288`) prove value-parity, not source-parity. Mutation-proven: reverting `wave.ts`/`arena.ts` to independent (non-delegating) copies of the same golden formula keeps all 73 tests green. The actual code DOES delegate (verified in the diff), so AC-2 is met in fact — but a future regression that keeps values while un-sourcing would ship green. Suggest asserting a real import (`/from ['"]\.\/difficulty\.js['"]/`). Affects `tests/difficulty-source.test.ts`, `tests/difficulty.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Only 2 of 28 DYTBL rows (LAVTIM, BODNVY) are literal-pinned in the always-run `tests/difficulty.test.ts`; the other 26 rows' decoded values are verified ONLY by the vendored-gated byte-gate (`describe.skipIf(!vendoredAvailable)`), which skips on CI/fresh clones. This is the sanctioned epic-wide degradation pattern (AC-1 explicitly names "the jt2-5 byte-gate pattern"), so AC-1 is satisfied — but a transcription typo in rows 3-28 would ship green anywhere without `reference/`. Suggest literal-pinning a few more representative rows (a negative-word start like BODNDI, a plateau row) in the ungated suite. Affects `tests/difficulty.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The per-range claim-coverage check (`CITED_RANGES`, `tests/difficulty-source.test.ts:288-312`) rides prior-story claims — 6 of 9 ranges (e.g. budget seed :2076 in enemy.json, IWAVE :1890 / lava :1929 in qualified.json) stay "covered" even if `difficulty.json` is emptied, because `claimCovers()` scans all `claims/*.json`. The JT31-authorship test (:314) + the citations byte-gate DO gate this story's own claims, so citation integrity holds. Suggest scoping the per-range check to `/^JT31-/`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): `docs/rom-study/glossary.md:49` still describes DYWORD as "start/end/step triples" — contradicted by this story's authoritative 14-byte struct decode (three starts + end + 5-byte cadence + signed inc). `glossary.md:70` says GA1 is "0-8"; the source (`DYWST2 = WORD START 7,8,9`, 5-byte/10-nibble DYWTIM) makes it 0-9. Neither is in this diff; jt3-1 is the natural place to correct them. *Found by Reviewer during code review.*

## Design Deviations

None recorded.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## TEA Assessment

**Tests Required:** Yes
**Reason:** Numeric ROM transcription + behaviour + retrofit — the byte-gate/purity/citation discipline the whole joust epic runs on.

**Test Files:**
- `tests/difficulty.test.ts` — behaviour (RED): 28-row decode, GA1 start-column tiers (two tiers), the IWAVE walk-once-per-wave-then-plateau (vs an independent reference walk), the EMYTIM/lava/budget retrofit identity + ROM golden vectors, and the AC-4 purity teeth.
- `tests/difficulty-source.test.ts` — source byte-gate (RED): independently re-derives the 28 DYWORD rows (392 bytes) from `JOUSTRV4.SRC` through the macro, 35 source-law token pins, retrofit source-wiring, JT31 claim coverage. `describe.skipIf(!vendoredAvailable)` degrades on CI.
- `tests/helpers/difficulty-contract.ts` — the contract + `loadDifficulty()` loader (test-side only; nothing under `src/` imports it).
- `docs/rom-study/claims/difficulty.json` — 33 `JT31-*` claims, byte-verified by `tests/audit/citations.test.ts`.

**Tests Written:** 73 tests across the two suites, covering all 4 ACs.
**Status:** RED — 23 failing (the whole behaviour surface + byte gate + retrofit wiring + AC-4 file-absent) for the right reason (`src/core/difficulty.ts` does not exist / stubs not re-pointed). 50 pass = source-law facts + committed-claim coverage. Full joust suite: 1088 pre-existing tests still green (no regressions); `tsc --noEmit` clean.

**Handoff:** To Dev (Julia) for GREEN — build `src/core/difficulty.ts` and re-point the three jt2 stubs. See `.session/jt3-1-handoff-red.md` and the Delivery Findings above (esp. the INCRE/ENDV macro-order trap and the wave↔pass offset).

## Reviewer Assessment

**Verdict:** APPROVED [TEST]

No Critical or High findings. The difficulty engine is ROM-faithful, the byte-gate is a genuine independent double-entry, the retrofit truly delegates while keeping jt2 values bit-for-bit, purity holds, and the arena<->difficulty import cycle is call-time-only and safe. All findings are non-blocking test-quality / coverage observations. Full suite green (1112/1112, 34 files), `npm run build` green (tsc + vite), working tree clean, verified independently.

**Independent ROM verification (not trusting the pipeline):**
- Hand-decoded 5 DYTBL rows straight from `JOUSTRV4.SRC:7304+` through the DYWORD macro, covering every sign/format trap — LAVTIM (baseline), BODNVY (the INCRE/ENDV operand-vs-byte reorder), EGGWT2 (`$5A+4` decimal-sum operand), LAVGRA (leading `+02`), BODNDI (negative 16-bit starts `$F000`). All five match `DIFFICULTY_TABLE` byte-for-byte. The committed table's emission order (START1,START2,START3,ENDV,TIM1,TIM2,TIM3,INCRE) is correct — INCRE lands at DYWINC offset 13, exactly as the macro intends.
- Hand-traced the IWAVE walk for LAVTIM@GA1 9: start 4 (DYWST2, tier 2), seed timer 2, nibble 1 -> [4,4,3,2,1,1], reproducing the golden and the ROM's `LDB 2,Y / BEQ / DEC / BNE` cadence gate + `CMPD DYWEND,X / BLT|BGT` signed clamp. `stepNibble` (ADDB #DYWTIM*2 / ASRB / BCS -> low nibble on odd GA1) and `ga1StartColumn` (CMPA #3 / CMPA #6 / BLS) both match source exactly.
- Confirmed the byte-gate ACTUALLY EXECUTED here (not skipped): `vendoredAvailable` resolves true via the orchestrator-root `reference/` tree; "every one of the 28 DYWORD rows matches its source bytes (THE GATE)" passed in 29ms. The gate re-derives the table with a TEA-authored reader (`dywordRowsFromSource`/`evalDy`) that shares no code path with `src/core/difficulty.ts` (which reads no files) — genuine double-entry, not a decoder re-running itself.

**Data flow traced:** operator GA1 -> `ga1StartColumn` (0-3/4-6/7+) -> `starts[tier]` -> `difficultyValue` per-wave walk -> signed clamp at `end` (plateau). Retrofit: `wave` -> `emytimForWave`/`seedBudgetForRow` (wave.ts:24 delegation) and `lavaLevelForWave` (arena.ts:51 delegation) -> difficulty.ts as the single source.

**Pattern observed:** the migration bar (user ruling A / AC-2) is genuinely enforced by the UNCHANGED jt2 pins — `tests/wave.test.ts:346-368` and `tests/arena.test.ts:374-408` are not in the diff yet pass against the retrofitted delegating code against independent literal goldens (`{nsmart:0,wsmart:15}`, `emytimForWave(1)=2/(3)=1`, lava `0xEA/0xE5/0xE0`). That is the real teeth for "change the source, not the value."

**Error handling / purity:** `src/core/difficulty.ts` is pure DATA + decoder — no `node:fs`, no clock, no entropy; the AST-based purity scanner (real teeth) plus the `not.toMatch(/node:fs|readFileSync/)` guard both hold. Out-of-domain inputs (GA1 > 9 -> `timeBytes[5]` undefined -> nibble 0; wave <= 0 -> start) are silently handled, unreachable by construction (GA1 is DIP-bound 0-9, wave >= 1) — noted as a low nit, not a defect.

**Deviation audit:** session records none. Dev's mid-implementation "Conflict (blocking)" (BODNVY plateau-by-80) was resolved before GREEN by TEA commit 67c4f99 — the current test (`tests/difficulty.test.ts:206`) asserts the plateau at wave 10_000, not 80. ACCEPTED (resolved, no open deviation).

**Findings (all non-blocking):**
| Sev | Finding | Location |
|-----|---------|----------|
| [LOW] | AC-2 delegation not test-enforced (regex matches a comment; identity tests prove value- not source-parity). Code delegates correctly; a future values-preserving un-source would ship green. | tests/difficulty-source.test.ts:264-282; tests/difficulty.test.ts:243-288 |
| [LOW] | Only 2/28 rows literal-pinned in the always-run suite; other 26 rows' values are vendored-gate-only (skips on CI). Epic-sanctioned pattern; AC-1 met. | tests/difficulty.test.ts:85-117 |
| [LOW] | Per-range claim coverage rides prior-story claims (6/9 ranges pass on enemy.json/qualified.json). JT31 authorship + citations byte-gate still gate this story's claims. | tests/difficulty-source.test.ts:288-312 |
| [LOW] | `expect(2+2+2+2+5+1).toBe(14)` is a literal tautology — tests no module surface. | tests/difficulty-source.test.ts:212 |
| [LOW] | Stale docs: glossary.md:49 "start/end/step triples" (wrong), :70 GA1 "0-8" (should be 0-9). Pre-existing, not in diff. | docs/rom-study/glossary.md:49,70 |

**Handoff:** To SM for finish-story.

## Sm Assessment

**Outcome:** APPROVED and merged — PR #26 (`slabgorb/joust`, squash `df3116c`), 4 commits (RED `5e382ed`, TEA plateau fix `67c4f99`, GREEN `0790abd`, hardening `afa1ad4`). Full suite 1112/1112, build green.

**Pipeline (peloton, subagents):** setup → TEA RED (23 reds, all genuine) → Dev GREEN (correctly ESCALATED a TEA self-contradiction — `difficultyValue(BODNVY,5,80)` = 576 vs the test's hardcoded 768, which contradicted TEA's own refWalk; TEA fixed test-only in `67c4f99` with wave 10_000) → Reviewer APPROVED [TEST] (hand-decoded 5 DYTBL rows from source byte-for-byte; confirmed byte-gate is genuine double-entry, retrofit truly delegates, purity holds).

**In-branch hardening of Reviewer findings (fix, don't ship the contradiction):** 3 of 5 non-blocking findings resolved before finish — (1) the AC-2 delegation gate was decorative (`toMatch(/difficulty/)` matched a comment; mutation-proved to pass on an un-source) → hardened to a comment-stripped real-`import` regex and **I independently mutation-checked it bites** (commented wave.ts's import → RED, restored, control green); (2) the `2+2+2+2+5+1 === 14` tautology → replaced with a real module-surface assertion; (3) stale `glossary.md` (DYWORD is a 14-byte struct, not "start/end/step triples"; GA1 range 0-9) → corrected with citations. The remaining 2 (26/28 rows vendored-gate-only; per-range claim coverage riding prior claims) are the epic-sanctioned byte-gate pattern — AC-1 met, accepted.

**Key ROM finding for downstream stories:** DYTBL DYWORD is a **14-byte** struct (three GA1-tier start columns + signed-word end + 5-byte/10-nibble cadence table + signed-byte increment), operand order ≠ byte order (`JOUSTRV4.SRC:202-213`). The IWAVE walk (`:1890-1926`) walks once/wave then plateaus; wave 1 = start (timer=2 init at `:945`). jt3-3/4/5 read wave-varying cadences from this axis.
