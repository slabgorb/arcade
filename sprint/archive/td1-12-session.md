---
story_id: "td1-12"
jira_key: "td1-12"
epic: "td1"
workflow: "tdd"
---
# Story td1-12: joust wave counter is BCD but every consumer reads it as decimal — wrong wave row from the 10th wave on

## Story Details
- **ID:** td1-12
- **Jira Key:** td1-12
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade
- **Branch:** none (trunk-based repo — branching skipped)
- **PR:** none (trunk-based repo)

## Story Summary
demo.wave (DemoState) currently holds a BCD-encoded byte (nextWaveBcd advances it with DAA), but every consumer treats it as a decimal 1-based wave number. BCD and decimal coincide for waves 1–9, so nothing breaks until the tenth wave (0x10 = BCD for 16 in decimal). From there, waveRowAt, applyWaveDestruction, spawnWaveEnemies, trollSpawnable, and seedWaveBudget all read the wrong wave's row, materializing wrong enemy sets, destroying wrong cliffs, and seeding wrong budgets. The display also reads BCD and prints "WAVE 16" on the tenth wave instead of "WAVE 10".

**Option Chosen (USER DECISION):** Option (B) — hold a DECIMAL wave in DemoState, derive the BCD byte (WAVBCD) only where the ROM's byte semantics actually matter (display/overlay, the 0x99 wrap). This models PWAVE (the monotone pointer that walks the wave table), not the ROM's separate WAVBCD counter (which has only four references total: CLR, increment, and one display read — it indexes nothing).

## Acceptance Criteria

**AC-1: demo.wave holds a decimal wave (1-based, monotone), not BCD.**
demo.wave is a DECIMAL field in DemoState. stepDemo's nextWaveBcd call site (which currently does `decimalWaveFromBcd(demo.wave)` and throws on non-BCD) must be updated to preserve monotone increment logic without BCD decode. All decimal consumers (waveRowAt, applyWaveDestruction, spawnWaveEnemies, trollSpawnable, seedWaveBudget, resolveWaveType) receive the decimal wave directly with no decode step.

**AC-2: Wave display formats the BCD byte from the decimal wave.**
The display path (game.ts:613 overlayReadout, main.ts:135, and any overlay/overlay-readout wiring) derives/formats the WAVBCD BCD digits FROM the decimal wave at render time, matching the ROM's WAVEN3 display logic (LDA WAVBCD / BITA #$F0 / BNE / ORA #$F0 / JMP OUTBCD, JOUSTRV4.SRC:2399-2403, leading-zero blank-suppressed). The overlay must show "WAVE 10" (not "WAVE 16") on the tenth wave.

**AC-3: The wave-101 rollover is retired by monotone decimal counter.**
The rollover test in tests/difficulty-wiring.test.ts (pinning the once-per-hundred-waves reset as a known divergence) is EXPECTED TO FAIL under this change and must be updated to assert the new monotone behaviour — demo.wave at 101 is 101, not 1; no difficulty resets occur.

**AC-4: uf1-2's tripwire is closed in the same change.**
The call site in stepDemo that does `decimalWaveFromBcd(demo.wave)` must be updated or removed (the decode is no longer valid; demo.wave is now decimal, and 10 = 0x0a is not a valid BCD byte). Tests must catch the tripwire the moment the field is changed — the suite must fail at or before the tenth wave if this step is missed.

**AC-5: nextWaveBcd role is confirmed under option (B).**
tests/wave.test.ts:155 currently pins 'nextWaveBcd(0x09) BCD not binary -> 0x10'. Confirm whether nextWaveBcd still serves a role (e.g., formatting BCD for display) or is now dead code under option (B); document the decision. If it still has a role, its test remains; if it is dead, delete it and the test together with evidence.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T11:47:20Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T10:53:40Z | 2026-08-05T10:57:06Z | 3m 26s |
| red | 2026-08-05T10:57:06Z | 2026-08-05T11:13:10Z | 16m 4s |
| green | 2026-08-05T11:13:10Z | 2026-08-05T11:29:08Z | 15m 58s |
| review | 2026-08-05T11:29:08Z | 2026-08-05T11:47:20Z | 18m 12s |
| finish | 2026-08-05T11:47:20Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the entire `tests/difficulty-wiring.test.ts` R2 suite (R2-1..R2-3)
  stages demos with `wave: <BCD counter>` via its `counterAtWave`/`demoAtCounter` helpers,
  which become the WRONG UNIT once `demo.wave` is decimal. Affects
  `plugins/joust/tests/difficulty-wiring.test.ts` (Dev must re-seat every `wave:`/`counterAtWave`
  staging to decimal during GREEN, and rewrite the R2-3 rollover/`must-not-die` pins — which
  assert the 0x99→0x00 reset and the 0x00 crash — to the new monotone contract; those pins are
  expected to fail under Option B, by design). This is the "broad re-seat" the story flags.
  *Found by TEA during test design.*
- **Question** (non-blocking): AC-5 (the fate of `nextWaveBcd`/`decimalWaveFromBcd`) has no hard
  RED test because it is a keep-or-delete DECISION Dev must make, not a behaviour. Affects
  `plugins/joust/src/core/wave.ts` and `plugins/joust/tests/wave.test.ts:155` (if `nextWaveBcd`
  survives to FORMAT the display BCD, its test stays; if it is dead under Option B, delete both
  with evidence). *Found by TEA during test design.*
- **Question** (non-blocking): the dev-overlay display beyond wave 99. AC-2's derived text says
  "format the WAVBCD digits", but WAVBCD wraps 0x99→0x00, so a ROM-faithful format would print
  "WAVE 0" on the hundredth wave and re-count — reintroducing the very rollover a monotone
  counter removes. The dev overlay (`main.ts:127` calls it "the dev bar", NOT the authentic
  MESSAGE.SRC row) most usefully shows the true monotone decimal wave (100, 101, …). My AC-2
  test only pins the tenth-wave case (10 not 16), where decimal and BCD-format coincide, and
  deliberately does NOT over-constrain the 100+ display. Affects
  `plugins/joust/src/core/game.ts` (overlayReadout) — Dev/Reviewer should rule the 100+ display
  explicitly. *Found by TEA during test design.*
- **Improvement** (non-blocking): the wrap concern the story flags ("nextWaveBcd wraps at 100 vs
  waveRowAt loops the table at 81") DISSOLVES under Option B — the decimal counter is monotone
  and never wraps; only `waveRowAt` loops, at 81 (`WAVE_LOOP_START`, `wave.ts:171`), which is
  already correct and unit-neutral. There is no counter/table wrap to reconcile once the counter
  is a plain ordinal. Affects nothing to change; recorded so Dev does not hunt a phantom.
  *Found by TEA during test design.*

### Reviewer (code review)
- **Conflict** (blocking): a production comment makes a FALSE measured claim citing DELETED tests.
  `plugins/joust/src/core/demo.ts:1906-1919` says the `demo.wave >= 1 ? … : 255` quota guard has
  "BOTH halves load-bearing" and cites, as measured evidence, "the two R2-3 laws in
  difficulty-wiring.test.ts" — those R2-3 tests were DELETED by this same story. The `>= 1` half is
  now unreachable in real play (the counter is monotone from 1). Affects `demo.ts:1906-1920`
  (rewrite the comment to the Option-B reality; re-point the measurement to what still exercises the
  guard, or rule the guard dead — see below). *Found by Reviewer during code review.*
  **→ ✓ RESOLVED in rework `fad7354`: comment rewritten; `>= 1` guard kept as belt-and-suspenders, pointing at `demo-jt9-38`. No longer blocking.**
- **Gap** (blocking): the "broad re-seat" is INCOMPLETE. `plugins/joust/tests/demo-jt9-38.test.ts:485-513`
  ("survives the hundredth wave (R2-3, cabinet must not die)") still stages BCD rollover literals —
  `0x00` (now decimal wave 0, UNREACHABLE in play) and `0x99` (now decimal wave 153). It passes, but
  test 1 now pins a defensive guard against an impossible input under a title/rationale that describe
  a rollover that no longer exists. Affects `demo-jt9-38.test.ts:485-513` (re-seat or retire; if kept,
  reframe as an out-of-range-wave guard, not a rollover). This block is the twin of the R2-3 tests the
  story deleted; the "grep every `wave:` literal" sweep missed the `stagedDemo(…, 0x00/0x99)` form.
  *Found by Reviewer during code review.*
  **→ ✓ RESOLVED in rework `fad7354`: block reframed to the out-of-range-wave guard; control re-seated `0x99` → decimal 99. No longer blocking.**
- **Question** (non-blocking): now that `demo.wave` is monotone ≥1, is the `demo.wave >= 1 ? … : 255`
  guard (`demo.ts:1920`) wanted defence-in-depth, or dead code? It is exercised only by the stale
  demo-jt9-38 wave-0 staging. Affects `demo.ts:1920` — rule it, and make the comment match the ruling.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): stale production comments describe the RESOLVED BCD confusion as current —
  `demo.ts:179` ("`spawnWaveEggs` still holds the raw WAVBCD counter") and `demo.ts:949-952`
  ("reached with the raw WAVBCD counter — the unit confusion demo.ts's stepFrame comment documents …
  throws outright on the hundredth wave's 0x00"). The stepFrame comment they cross-reference was
  REPLACED this story, so the reference dangles. Affects `demo.ts:179, 949-952`. *Found by Reviewer
  during code review.*
- **Improvement** (non-blocking): `difficulty-wiring.test.ts:1041-1043` — the R2-1 premise comment
  ("the counter really is packed, and really does read 0x10 … If td1-12 makes `demo.wave` decimal,
  THIS fails first") now CONTRADICTS the re-seated assertion two lines down (`.toBe(10)`, which passes).
  The broader R2-1 body still narrates a BCD misread the suite can no longer catch. Affects
  `difficulty-wiring.test.ts` R2-1 (update the premise comment to the decimal reality). *Found by
  Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-5 written as a Delivery Finding, not a RED test.**
  - Spec source: session file, AC-5 (nextWaveBcd role under option B)
  - Spec text: "Confirm whether nextWaveBcd still serves a role … or is now dead code; document the decision. If it still has a role, its test remains; if it is dead, delete it and the test together with evidence."
  - Implementation: no failing test authored for AC-5; it is captured as a non-blocking Question in Delivery Findings for Dev to rule.
  - Rationale: AC-5 asks for a keep-or-delete DECISION, not an observable behaviour. A RED test cannot pin a decision that has not been made, and forcing one would pre-decide it. The wave.test.ts:155 BCD-increment pin already guards nextWaveBcd's arithmetic if it survives.
  - Severity: minor
  - Forward impact: Dev must explicitly rule AC-5 during GREEN and record evidence; Reviewer should confirm the ruling and that wave.test.ts:155 was kept or deleted coherently.
- **AC-4 is a RED-now assertion doubling as a tripwire guard.**
  - Spec source: session file, AC-4 (uf1-2 tripwire, demo.ts:1792)
  - Spec text: "Tests must catch the tripwire the moment the field is changed — the suite must fail at or before the tenth wave if this step is missed."
  - Implementation: AC-4's test asserts the twelfth wave reads 12 (RED now: current gives 0x12 = 18) AND that stepping past it does not throw. The no-throw half is green against today's BCD tree; it only reddens under a PARTIAL Option-B fix (field decimal, demo.ts:1792 left decoding), which throws at wave 10.
  - Rationale: the pure "must not die" property cannot be RED against the current tree (today's game does not throw at wave 10, it silently mis-reads). Folding it into a RED-now ordinal assertion keeps the test failing now for the right reason while still trapping the partial-fix crash.
  - Severity: minor
  - Forward impact: none — Dev fixing demo.ts:1792 in the same edit satisfies both halves.

### Dev (implementation)
- **AC-5 ruled: KEEP `nextWaveBcd` and `decimalWaveFromBcd` as no-consumer ROM primitives.**
  - Spec source: session file, AC-5
  - Spec text: "Confirm whether nextWaveBcd still serves a role … or is now dead code … If it still has a role, its test remains; if it is dead, delete it and the test together with evidence."
  - Implementation: both functions are retained in `wave.ts`; their `demo.ts` imports were removed (they are unused in production now). `wave.test.ts` and `difficulty-wiring.test.ts` R2-2 keep guarding their pure arithmetic.
  - Rationale (evidence): after the two `demo.ts` edits neither function has a production consumer — the wave count is the decimal PWAVE ordinal and the dev overlay shows it directly (demo-td1-12 AC-2 pins no BCD formatting). They are NOT deleted because (a) they faithfully model the ROM's real WAVBCD byte (the display-only counter, WAVEN3 :2399-2403) and are the primitive a future authentic wave display would build on, and (b) the codebase explicitly tolerates no-consumer-yet ROM primitives (e.g. difficulty.ts LAVTIM/LAVGRA). Deleting them would touch 7 files / 60+ refs (wave.ts, wave-contract.ts, wave.test.ts, audio-emission, demo-round2, …) — real overreach for a behaviour fix. So: KEEP, with this documented no-consumer status.
  - Severity: minor
  - Forward impact: a later authentic-wave-display story (jt5) should wire a decimal→BCD FORMATTER (a new function), and may then retire `decimalWaveFromBcd` (BCD→decimal, whose sole purpose — decoding the old BCD counter — is gone) if still unused.
- **Corrected TEA's AC-1 complement discriminator: wave 10 is an EGG wave, so "8 bounders" is unobservable.**
  - Spec source: `tests/demo-td1-12.test.ts`, the AC-1 complement test (TEA-authored)
  - Spec text: TEA asserted the tenth wave materialises "8 bounders" (wave 10's row bounder count).
  - Implementation: rewrote the assertion to the tenth wave's REAL complement — wave 10's status 0x08 is an EGG wave (`waveTypeIndex(0x08)=4 → 'egg'`), so it enters twelve settled EGGS and zero ground enemies; wave 16 (status 0x00) enters ground enemies. The test now guards eggs-vs-enemies with a `rawWaveType` discriminability guard. Still RED against the pre-fix tree (which spawns wave 16's six ground enemies) and GREEN after.
  - Rationale: an egg wave never materialises its row's ground nibble as buzzards, so "8 bounders" was factually impossible under the correct fix — the TEA discriminator (and the story's own "8 bounders" phrasing) conflated the wave-10 ROW's bounder field with the observable complement. The test's INTENT (tenth wave reads wave 10's complement, not wave 16's) is preserved and if anything sharpened (different wave TYPE, not just different counts).
  - Severity: minor
  - Forward impact: none — the corrected test is a stronger discriminator.
- **Re-seat + prune `tests/difficulty-wiring.test.ts` (uf1-2's BCD-counter suite) to the decimal contract.**
  - Spec source: session file AC-3 + Delivery Findings (TEA) "the broad re-seat"
  - Spec text: "the R2-3 rollover pins are expected to fail under Option B, by design … Dev must re-seat every `wave:`/`counterAtWave` staging to decimal."
  - Implementation: `counterAtWave(w, n)` now returns the decimal `n` (was a `nextWaveBcd` BCD walk); R2-1 premises re-based (`0x10→10`, `0x12→12`). DELETED the whole R2-3 describe (rollover crash + reset divergence — none of which exist under a monotone counter; those five tests' own instruction was "when td1-12 lands, delete it") and the R2-2 "says at the seam … is BCD" source test (the difficulty seam no longer decodes a BCD counter — it reads `demo.wave` directly). Monotone/no-crash coverage now lives in demo-td1-12 AC-3/AC-4. R2-2's pure-function tests were kept (the functions were kept — AC-5).
  - Rationale: R2-1..R2-3 were built entirely around staging BCD counter bytes; Option B makes those stagings the wrong unit and the rollover they pin impossible. Re-seating the still-meaningful wiring guard (R2-1) and deleting the obsolete rollover pins is the honest translation, not a weakening.
  - Severity: moderate (deletes 6 tests)
  - Forward impact: net joust test count returns to 2757 (TEA +6, this −6); the rollover behaviour is now guarded by demo-td1-12, not difficulty-wiring.
- **Re-seat `tests/demo-jt9-9.test.ts` egg-hatch staging from BCD `0x20` to decimal `20`.**
  - Spec source: the broad re-seat (Delivery Findings, TEA)
  - Spec text: every `wave:` staging literal must be re-based to decimal.
  - Implementation: `LATE_BCD = 0x20` → `LATE_WAVE = 20` (staging the twentieth wave, which `stagedDemo` writes to `demo.wave`); the EGGWT-walk assertion is otherwise unchanged.
  - Rationale: `demo.wave` is now decimal, so staging the twentieth wave is `20`; the old `0x20` would now stage wave 32 and read a shorter EGGWT wait, breaking the precondition.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)
- **TEA — AC-5 written as a Delivery Finding, not a RED test** → ✓ ACCEPTED: a keep-or-delete decision has no observable behaviour to redden; capturing it as a finding for Dev was correct.
- **TEA — AC-4 RED-now assertion doubling as a tripwire guard** → ✓ ACCEPTED: sound; the ordinal assertion (18≠12) reddens now and the no-throw half traps a partial fix.
- **Dev — AC-5 ruled KEEP `nextWaveBcd`/`decimalWaveFromBcd`** → ✓ ACCEPTED: the DECISION is sound (real ROM primitives, no-consumer-yet is an established pattern, delete-both would touch 7 files). BUT it carries a documentation obligation the Dev did not discharge — keeping the functions while their surrounding comments still describe a live BCD counter/rollover is what produced the stale-comment findings above. Accepted with that follow-up required.
- **Dev — corrected TEA's AC-1 complement discriminator (8 bounders → egg complement)** → ✓ ACCEPTED: verified — `waveTypeIndex(0x08)=4 → 'egg'`, so wave 10 materialises eggs, never bounders; the corrected eggs-vs-enemies discriminator is stronger and still RED against the pre-fix tree.
- **Dev — re-seat + prune difficulty-wiring.test.ts (delete R2-3, re-seat R2-1)** → ✗ FLAGGED by Reviewer: the R2-3 DELETION was correct, but the re-seat is INCOMPLETE and left rot: (a) `demo.ts:1906-1919` still cites the now-deleted R2-3 tests as measured evidence; (b) `demo-jt9-38.test.ts:485-513` is the un-re-seated twin of R2-3, still staging `0x00`/`0x99`; (c) the R2-1 premise comment (`difficulty-wiring.test.ts:1041-1043`) now contradicts its own re-seated assertion. See the blocking Delivery Findings. Severity: Medium.
- **Dev — re-seat demo-jt9-9 `0x20 → 20`** → ✓ ACCEPTED: correct; `demo.wave` is decimal so the twentieth wave stages as 20, and the EGGWT-walk precondition holds.

## Notes for Next Agent (TEA)

**Wrap Divergence (FLAGGED FOR TEA):** 
The description notes that nextWaveBcd wraps at 100 waves while waveRowAt loops the TABLE at 81 (WTBRST, :2535). TEA/Dev must confirm which wrap the ROM actually does before assuming they must agree. This is a known research gap flagged by the story author.

**Blast Radius (FLAGGED FOR SEARCH):** 
Option (B) changes the `demo.wave` field from BCD byte to decimal number. Every test in `plugins/joust/tests/` that constructs a demo state with a `wave:` literal must be re-seated to the new decimal format. Run `grep -n "wave:" plugins/joust/tests/ --include="*.ts"` and re-base each literal on the new semantics.

**uf1-2 Context:**
uf1-2 added a new consumer (per-wave difficulty seam) of the same broken `demo.wave` field and was REJECTED in code review for that reason. This story fixes the pre-existing consumers; uf1-2 will be revised or re-opened on top of this fix.

**Predecessor Responsibility:**
This story must complete BEFORE uf1-8 and uf1-9, which will add more per-wave consumers on top of the same counter.

## Sm Assessment

**Setup complete — routing to TEA (Leeloo) for RED.**

**Sibling-contention probes (clean):** no remote branch matched `td1-12` before claim; live sibling sessions are `jt9-43` (a-1) and `cp7-5` (a-3), neither colliding with this story or the joust wave path. No open PRs blocked the merge gate. Claim now pushed: `main` carries the in_progress stamp + context, and the empty claim branch `feat/td1-12-joust-wave-counter-bcd-decimal` (tip == main) lights up the sibling branch probe.

**The one decision that had to be made before RED — and it is made.** The story presents an A/B architecture fork with a null `acceptance_criteria` field, so the RED test is unspecifiable until the fork is ruled (a different failing test per branch). The USER RULED OPTION (B): model a decimal (PWAVE-style) monotone wave in `DemoState`, derive the BCD (WAVBCD) byte only for the display/overlay and the 0x99 wrap. This is the faithful choice, not merely the simpler one — the round-2 primary-source finding shows WAVBCD has four references in the 1982 source and indexes nothing; the wave table is walked by a separate monotone pointer (PWAVE) and difficulty by a separate RAM countdown. `demo.wave` today conflates those two ROM concepts; Option (B) splits them the way the ROM does. The five derived ACs above target Option (B) exclusively — Option (A) is not in scope.

**Three things TEA must NOT rubber-stamp (all flagged in Notes for Next Agent):**
1. **Wrap divergence** — nextWaveBcd wraps at 100, waveRowAt loops the table at 81 (WTBRST, :2535). Confirm which the ROM does before assuming they agree; do not force them equal.
2. **uf1-2 tripwire (AC-4)** — `stepDemo` calls `decimalWaveFromBcd(demo.wave)`, which throws on a non-BCD byte; the moment `demo.wave` becomes decimal (10 = 0x0a is not valid BCD) that call site must change in the same commit or the game dies at wave 10. The suite must catch this at/before the tenth wave.
3. **Blast radius** — Option (B) re-seats every `wave:` literal in `plugins/joust/tests/`; grep and re-base each, and expect `tests/difficulty-wiring.test.ts`'s wave-101 rollover pin (AC-3) to go red by design and need updating to the new monotone behaviour.

**Session integrity:** all three routing fields present (`Workflow`, `Phase` pointer — exactly one — and `Repos`), branch/PR recorded as `none` (trunk-based). Status stamped `in_progress` and verified. Handing off to TEA for RED.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes

**Test Files:**
- `plugins/joust/tests/demo-td1-12.test.ts` — 6 failing tests pinning the Option (B) target for the joust wave counter.
- `plugins/joust/README.md` — test-file count bumped 123→124 for the new file (the `audio-seam-scope` derived-count guard; not a behaviour change).

**Tests Written:** 6 tests covering AC-1..AC-4 (AC-5 is a Dev decision — see Delivery Findings).
**Status:** RED — full joust project: **1 file failed (demo-td1-12, 6 tests) | 123 passed (124 total); 6 failed | 2757 passed**. The ONLY red is the intended new file; no source was touched, so everything else stays green. Verified via `testing-runner` (RUN_ID `td1-12-tea-red`) and a direct `npx vitest run --project joust`.

**Design method (why the tests are not vacuous):** every test DRIVES the cabinet through its own real `stepDemo`/`stepGame` advance and counts wave ADVANCES — regime-neutral in the driving (waves 1-9 are BCD ≡ decimal, so the drive is identical under either regime), discriminating only in the assertion. No test pins a hand-written `wave:` literal — that was uf1-2 round 1's exact trap. Waves 1-9 are the untouched control.

**What each test pins, and why it is RED against the current tree:**

| AC | Test | RED reason today |
|----|------|------------------|
| AC-1 | tenth wave is ordinal 10 | current advance gives `nextWaveBcd(0x09)=0x10`; `0x10` as a number is 16 |
| AC-1 | tenth wave's complement is wave 10's row (8 bounders) | current reads `waveRowAt(16)` → 0 bounders / 5 hunters / 1 lord |
| AC-2 | dev overlay reads "WAVE 10" | `overlayReadout` returns the raw byte 16; `main.ts:135` prints "WAVE 16" |
| AC-3 | 101st wave is 101, no difficulty reset | monotone; current BCD **crashes** en route: 0x99→0x00 then `waveRowAt(0)` throws mid-advance |
| AC-3 | 101st wave plays differently from the first | current rolled byte 0x01 is indistinguishable from wave 1 |
| AC-4 | drive past the tenth wave, read 12, no throw | current gives 0x12=18; also traps a partial fix that leaves `demo.ts:1792` decoding |

Each behavioural assertion is preceded by an explicit DISCRIMINABILITY guard (e.g. `waveRowAt(10).bounders !== waveRowAt(16).bounders`) so a future table edit that collapses the discriminator reddens loudly instead of going vacuously green.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|------|---------|--------|
| Every guard mutation-testable; assertion discriminates the claim | AC-1/AC-3 discriminability guards (`rowN.bounders !== rowM.bounders`, `waveRowAt(101) !== waveRowAt(1)`) | failing |
| No vacuous assertion; driven through real code, never a literal | all 6 — `demoAtNthWave`/`advanceGame` count real advances | failing |
| No hand-set fixture whose value IS the expectation | staging uses wave-1 seed + real `stepDemo`, no `wave:` literal | failing |

**Rules checked:** the applicable TS lang-review rules are the test-QUALITY meta-rules (non-vacuity, mutation-testable guards, no reimplemented platform algorithm, driven-not-literal) — all satisfied. The Rust-style feature rules (non_exhaustive, validated constructors, tenant context) do not apply to this TS behaviour fix.
**Self-check:** 0 vacuous tests found in the new file. No pre-existing vacuous tests touched.

**Notes for Dev (Korben) — GREEN scope:**
1. Make `DemoState.wave` a monotone DECIMAL wave (model PWAVE). The advance becomes `wave = demo.wave + 1` (no `nextWaveBcd`), and the advance-block consumers (`waveRowAt`, `applyWaveDestruction`, `spawnWaveEnemies`, `trollSpawnable`, `seedWaveBudget`, and `game.ts` `resolveWaveType`) then receive the decimal wave directly.
2. Fix the uf1-2 tripwire IN THE SAME EDIT: `demo.ts:1792` `decimalWaveFromBcd(demo.wave)` must stop decoding (the field is already decimal) or the game dies at the tenth wave.
3. Derive WAVBCD only for the display seam; rule the 100+ overlay display (Delivery Findings Q2).
4. THE BROAD RE-SEAT: `tests/difficulty-wiring.test.ts` R2-1..R2-3 stage `wave: <BCD counter>` and every `wave:` literal across `plugins/joust/tests/` must be re-based to decimal. The R2-3 rollover/`must-not-die` pins are expected to fail and must be rewritten to the monotone contract. `createWaveDemo` seeds wave 1 (a coincidence point), so the seed itself is unaffected.
5. Rule AC-5 (keep/delete `nextWaveBcd`/`decimalWaveFromBcd`) with evidence; keep or delete `wave.test.ts:155` coherently.

**Handoff:** To Dev (Korben) for GREEN.

## Dev Assessment

**Status:** GREEN — full joust project **124 files / 2757 tests passing**, repo-wide `npm run lint` (tsc --noEmit) clean, orchestrator suite **390/390**. Re-verified on the merged tree after a rebase over a sibling's unrelated centipede claim (cp7-6, sprint YAML only).

**The fix is two lines in `plugins/joust/src/core/demo.ts`** — because every consumer already took a decimal wave; they were wrong only because the field was BCD:
1. The advance (was `wave = nextWaveBcd(demo.wave)`) is now `wave = demo.wave + 1` — a monotone increment on the decimal ordinal, no BCD DAA, no wrap.
2. The difficulty hop (was `const waveOrdinal = decimalWaveFromBcd(demo.wave)`, the uf1-2 tripwire) is now the identity `const waveOrdinal = demo.wave` — the field IS the ordinal, so there is nothing to decode.

Making the field decimal (via how it is advanced) fixes all the advance-block consumers at once: `waveRowAt`, `applyWaveDestruction`, `spawnWaveEnemies`, `trollSpawnable`, `seedWaveBudget`, and `game.ts` `resolveWaveType`. The dev overlay (`overlayReadout` → `main.ts`) then shows the true decimal wave. The two now-unused imports (`nextWaveBcd`, `decimalWaveFromBcd`) were removed from `demo.ts`.

**AC coverage (all green):**
- AC-1 — `demo.wave` is decimal-monotone; the tenth wave reads wave 10 and enters wave 10's egg complement (not wave 16's ground enemies). demo-td1-12 AC-1.
- AC-2 — the dev overlay reads "WAVE 10" on the tenth wave. demo-td1-12 AC-2.
- AC-3 — monotone counter: wave 100 is 100, wave 101 is 101; no difficulty reset and no `waveRowAt(0)` death at the old rollover. demo-td1-12 AC-3; the retired uf1-2 R2-3 rollover pins were deleted.
- AC-4 — the tripwire is closed in the same edit (demo.ts:1792 no longer decodes); driving past the tenth wave keeps stepping. demo-td1-12 AC-4.
- AC-5 — RULED: KEEP both `nextWaveBcd`/`decimalWaveFromBcd` as no-consumer ROM WAVBCD primitives (see Design Deviations for the full rationale + evidence). `wave.test.ts` and difficulty-wiring R2-2 keep guarding them.

**Test changes made during GREEN (all logged as Design Deviations):** corrected TEA's AC-1 complement discriminator (wave 10 is an EGG wave, so "8 bounders" is unobservable → assert its egg complement); re-seated difficulty-wiring R2-1 to decimal staging and DELETED the obsolete R2-3 rollover block + the "seam is BCD" source test (−6 tests); re-seated demo-jt9-9 egg-hatch staging `0x20 → 20`. Net joust test count returned to 2757.

**No `wave:` literal left mis-seated:** swept `plugins/joust/tests/` — the only stagings above wave 9 that mattered were difficulty-wiring (re-seated) and demo-jt9-9 (re-seated); everything else stages waves 1-9 (BCD ≡ decimal) or drives the real advance. Confirmed by the full green suite.

**Handoff:** To Reviewer (Zorg) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2757/2757 green, lint clean, 0 smells) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Yes | Skipped — disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped — disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | Skipped — disabled | N/A | Disabled via settings — hand-assessed by Reviewer (test quality) |
| 5 | reviewer-comment-analyzer | Yes | Skipped — disabled | N/A | Disabled via settings — hand-assessed by Reviewer (this is where the stale-comment findings came from) |
| 6 | reviewer-type-design | Yes | Skipped — disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | error (529 Overloaded ×2) | none | hand-assessed neutral (see below) |
| 8 | reviewer-simplifier | Yes | Skipped — disabled | N/A | Disabled via settings — hand-assessed by Reviewer (the `>= 1` dead-guard question) |
| 9 | reviewer-rule-checker | Yes | error (529 Overloaded ×2) | none returned | hand-assessed by Reviewer (comment/citation discipline + non-vacuity) |

**All received:** Yes (accounting — 1 clean, 2 errored+hand-assessed, 6 disabled)
**Total findings:** 2 blocking + 3 non-blocking confirmed (all Reviewer/hand-assessed), 0 dismissed

**Errored-specialist hand-assessment (per the errored-specialist accounting rule — a 529 is a transient platform outage, not a skip):**
- **security** — the change is a wave-counter arithmetic shift in a browser game with no auth/network/secrets/user-data. The only vectors: (a) unbounded growth — `demo.wave` grows +1/wave but every consumer is `waveRowAt`, which loops the table at 81, so the index stays bounded and valid for all wave ≥ 1 (JS numbers never approach 2^53 in play); (b) a decimal wave reaching a BCD-expecting function — the only two such call sites (`nextWaveBcd`, `decimalWaveFromBcd` in `demo.ts`) were removed, and `grep` confirms no other production caller. Security-neutral. VERIFIED.
- **rule-checker** — hand-ran its brief myself against `typescript.md`'s comment/citation and non-vacuity rules; that pass produced the blocking findings below. The new `demo-td1-12.test.ts` assertions are non-vacuous (each driven through real `stepDemo`/`stepGame`, each with a discriminability guard). Core/shell boundary intact (only `demo.ts` in `src/core`, pure).

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — round 1 REJECTED, findings fixed in an in-session rework, re-verified green)

The core code fix is CORRECT and its substance was sound from round 1: making `demo.wave` a monotone decimal ordinal via `demo.wave + 1` (advance) and `waveOrdinal = demo.wave` (difficulty hop) fixes every advance-block consumer at once, closes the uf1-2 tripwire, and is fully green (joust 2757/2757, lint clean, orchestrator 390/390).

**Round 1 was REJECTED** on documentation-integrity + re-seat-completeness — confirmed defects that `comment_analyzer` would normally catch but which is disabled on this project, and which would otherwise become the permanent archived record of a ROM-fidelity codebase. None were crash/security-High; all were mechanical. **The rework (commit `fad7354`) fixed every one**, re-verified: joust 2757/2757 green, lint clean, and grep confirms the stale references are gone. Round-2 verdict: APPROVED.

| Severity | Round-1 finding | Location | Resolution (round 2) |
|----------|-------|----------|--------------|
| [MEDIUM] | Production comment made a FALSE measured claim, citing the R2-3 tests this same story DELETED, and framed the `>= 1` half as load-bearing | `demo.ts:1905-1920` | ✓ FIXED — comment rewritten to the Option-B reality; the `>= 1` guard reframed as belt-and-suspenders against an out-of-range wave, pointing at `demo-jt9-38` (kept, not dead) |
| [MEDIUM] | Re-seat incomplete — the R2-3 twin staged BCD rollover literals (`0x00`, `0x99`) under a "hundredth wave / cabinet must not die" title | `demo-jt9-38.test.ts:485-513` | ✓ FIXED — reframed to the out-of-range-wave guard it now tests; control re-seated `0x99` → decimal 99; deleted-R2-3 cross-references dropped |
| [LOW] | Stale comments described the RESOLVED BCD confusion as current | `demo.ts:177-182, 949-952` | ✓ FIXED — updated to the decimal PWAVE ordinal |
| [LOW] | R2-1 premise comment contradicted its own re-seated assertion (`.toBe(10)`) | `difficulty-wiring.test.ts:1041-1043` | ✓ FIXED — premise comment updated to the decimal reality |
| [QUESTION] | Keep or drop the `demo.wave >= 1 ? … : 255` guard now that the counter is monotone ≥1? | `demo.ts:1920` | ✓ RULED — KEEP as cheap defence-in-depth (the ≥1 invariant is non-local; `demo-jt9-38` exercises it); comment now says so |

**Observations (≥5, adversarial):**
- [VERIFIED] The core fix is correct and complete for the ACs — evidence: `demo.ts:1972` `wave = demo.wave + 1` (monotone) and `demo.ts:1784` `waveOrdinal = demo.wave` (identity). Every advance-block consumer (`waveRowAt`/`applyWaveDestruction`/`spawnWaveEnemies`/`trollSpawnable`/`seedWaveBudget`) and `game.ts:373 resolveWaveType` takes the decimal wave; `grep` confirms no surviving BCD-expecting caller. Complies with the core-purity rule (change is pure).
- [VERIFIED] The new tests are non-vacuous — evidence: `demo-td1-12.test.ts` drives every case through real `stepDemo`/`stepGame` advances (never a `wave:` literal), each with a discriminability guard (e.g. `rawWaveType(row10.status)==='egg'` at line 231; `waveRowAt(101)!==waveRowAt(1)` at 301). RED-verified against the pre-fix tree earlier.
- [MEDIUM][DOC/hand-assessed] False measured claim citing deleted tests — `demo.ts:1910`.
- [MEDIUM][TEST/hand-assessed] Incomplete re-seat — `demo-jt9-38.test.ts:485-513`.
- [LOW][DOC/hand-assessed] Stale BCD-confusion comments — `demo.ts:179, 949-952`.
- [LOW][DOC/hand-assessed] R2-1 premise/assertion contradiction — `difficulty-wiring.test.ts:1041-1043`.
- [VERIFIED] AC-5 KEEP decision is sound — evidence: `nextWaveBcd`/`decimalWaveFromBcd` remain exported+tested (`wave.test.ts`, R2-2); deleting them would touch 7 files. The decision is fine; only its documentation fallout needs cleanup.
- [SEC] security — reviewer-security subagent ERRORED (529 Overloaded ×2); hand-assessed by Reviewer: security-neutral. No auth/network/secrets/user-data surface; unbounded wave growth is bounded by `waveRowAt`'s table loop and JS integer range; the only two BCD-expecting call sites were removed with no surviving caller (grep-confirmed). No injection/leakage. VERIFIED neutral.
- [RULE] rule-checker — reviewer-rule-checker subagent ERRORED (529 Overloaded ×2); hand-ran its brief against `typescript.md`: the comment/citation-must-stay-true rule is VIOLATED at `demo.ts:1910` (cites the deleted R2-3 tests) and stale at `demo.ts:179/949-952` and `difficulty-wiring.test.ts:1041-1043` — the two blocking findings above. New-test non-vacuity and core-purity rules PASS.

**Data flow traced:** a cleared wave → `stepDemo` advance block (`demo.ts:1968`) → `wave = demo.wave + 1` → `waveRowAt(wave)`/`spawnWaveEnemies(wave)`/`seedWaveBudget(waveRowAt(wave))` → the tenth wave (10) enters its egg complement; and `game.ts:513 wave: sim.wave` → `overlayReadout` → `main.ts:137 WAVE ${wave}` renders "WAVE 10". Safe: `wave` is ≥1 and bounded by `waveRowAt`'s table loop.

### Rule Compliance (typescript.md, hand-checked — rule-checker errored)
- **Every guard mutation-tested / no vacuous assertion:** the new tests comply (driven, discriminated). ✓
- **Comments quoting a MEASURED result or citing a test must stay true:** VIOLATED at `demo.ts:1910` (cites deleted R2-3) and stale at `demo.ts:179/949-952`, `difficulty-wiring.test.ts:1041-1043`. ✗ — the two blocking findings.
- **Core/shell boundary (src/core pure, deterministic):** compliant — `demo.ts` change is pure arithmetic. ✓
- **No dead/misleading defensive code without a note:** the `>= 1 : 255` branch is now unreachable in play and its note is false — flagged. ✗

### Devil's Advocate
Suppose this code is broken. Where would it bite? The wave now grows without bound — could it overflow or index out of range? No: `waveRowAt` loops the table at 81 (`WAVE_LOOP_START`) for any wave > 90, and JS integers stay exact far past any reachable wave, so a player would die of old age before precision matters. Could a decimal wave leak into a function still expecting BCD and misbehave silently? That was the whole risk class — but the only two BCD consumers were deleted and grep finds no others, and the AC-4 test drives past the seam without throwing, so a partial fix could not have shipped green. Could the overlay lie at wave 100+? It shows the true decimal wave (100, 101…), which the dev bar wants; the ROM-BCD-wrap display was explicitly descoped and is not built. The real soft spot the devil finds is NOT runtime — it is that a future maintainer reads `demo.ts:1906-1919`, believes "the two R2-3 laws" still exist and still measure the guard, goes looking, finds nothing, and either mis-edits the guard or wastes an hour; and reads `demo-jt9-38`'s "survives the hundredth wave" and believes the cabinet still has a BCD rollover to survive, when it does not. In a codebase whose whole discipline is that comments and citations are load-bearing, that IS the defect — the archived source would assert, permanently, a measurement against tests that no longer exist. That is what the rejection is for. The confused-user and stressed-filesystem angles are moot here (deterministic sim, no IO, no config).

**Handoff (round 1):** Back to Dev (Korben) for fixes — a focused documentation + re-seat round (5 items above), no runtime change needed.

### Round 2 (re-review after rework `fad7354`)
All five round-1 items fixed and re-verified. joust **2757/2757 green**, `npm run lint` clean, grep confirms zero residual "two R2-3 laws" / "raw WAVBCD counter" / "hundredth wave (R2-3)" references. The rework touched comments + one test's framing only — no runtime change, so the green core fix is unaffected. **Verdict: APPROVED.**

**Handoff:** To SM (Ruby Rhod) for finish-story.