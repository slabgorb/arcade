---
story_id: "sw7-11"
jira_key: "sw7-11"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-11: R9a TIE choreography VM engine — per-fighter bytecode VM (A-009)

## Story Details
- **ID:** sw7-11
- **Jira Key:** sw7-11
- **Workflow:** tdd
- **Stack Parent:** sw7-9 (split parent, now status:split)
- **Repo:** star-wars
- **Type:** feature
- **Points:** 8
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T21:59:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T20:55:36Z | 2026-07-15T20:58:39Z | 3m 3s |
| red | 2026-07-15T20:58:39Z | 2026-07-15T21:31:18Z | 32m 39s |
| green | 2026-07-15T21:31:18Z | 2026-07-15T21:45:11Z | 13m 53s |
| review | 2026-07-15T21:45:11Z | 2026-07-15T21:59:55Z | 14m 44s |
| finish | 2026-07-15T21:59:55Z | - | - |

## Story Context

### Title
R9a TIE choreography VM engine — per-fighter bytecode VM (A-009)

### Overview
Port the per-fighter TIE choreography bytecode VM, the foundation of the split parent sw7-9. This story houses the core VM engine (A-009) that executes bytecode scripts for alien fighters. The VM implements a JMP @A(U) opcode dispatch system with per-alien program counter tracking, a one-deep call stack, and four bytecode opcodes (IF, GOTO, GOSUB, RETURN, TWIRL) plus event-gated dispatch operators (.CUNTIL, .CIF). The story loads 16 TCH1 scripts and 12 TCH2 split entries from the ROM.

Siblings sw7-12 (TSPWAV wave composition) and sw7-13 (Darth behavior/scoring) build on this VM foundation. Most accepted symptom-divergences (A-011..A-014) are expected to dissolve once the VM lands.

### Problem Statement
The arcade sim currently lacks the per-fighter bytecode choreography system. Alien TIEs in the cabinet follow scripted behavioral patterns driven by a compact bytecode VM. Our sim has no equivalent — every alien is a hardcoded state machine, missing authentic flight choreography, wave-based composition, and scripted maneuvers. Finding A-009 names the authentic thing: the per-fighter VM.

### Technical Approach

**Core VM Architecture (src/core):**
- **Bytecode dispatch:** JMP @A(U) opcode dispatch into TCHOP (the bytecode table). Each opcode is a 2-byte entry; address = base + 2×opcode.
- **Program counter:** A$CHPC (one per alien fighter). Tracks position in the currently executing script.
- **Call stack:** One-deep. GOSUB pushes return address; RETURN pops and resumes.
- **Opcodes:** IF, GOTO, GOSUB, RETURN, TWIRL.
- **Event gates:** .CUNTIL (count until) and .CIF (conditional if) operators gate opcodes to specific frames or conditions.
- **Script storage:** 16 TCH1 scripts (alien types 0-15, surface waves) and 12 TCH2 split entries (second-half wave tunes for wave duplication, per A-017 TSPWAV).

**Fidelity discipline:**
- Every opcode and gate pattern is cited to an audit finding ID (A-009 is the master).
- Fixing A-009 = set `remediated_by: sw7-11` in star-wars/docs/audit/findings/pair-ai.json and keep `npm test -- citations` green.
- No invented opcodes or state machines — the ROM bytecode is law.

**Constraints & Dependencies:**
- **Depends on sw7-1 (DONE):** The VM runs on the 20.508 Hz timebase. Constants (frame counts, counters) must bake on that base, not TICK_HZ=30. Pull current `origin/develop` (sw7-1 is merged #91).
- **A-019 (music-timed descent) deferred:** A-019 also rides this VM but wants sw7-8's tunes to be landed first. Do NOT block on sw7-8; record the A-019 facet as a deferred finding and build the VM so sw7-8 can wire tunes into it later.
- **Boundary rule (src/core vs src/shell):** The VM is deterministic simulation — lives entirely in `src/core`. No render/audio/input logic here. Callers in `src/shell` will dispatch the VM and queue audio/visual effects, but the VM itself is pure.

**Guardrails for Testing:**
- Tests must pin every opcode's behavior against the disassembled ROM bytecode.
- Mutation-prove the VM: flip a dispatch offset or condition logic → test goes red.
- Citations gate (`npm test -- citations`) must pass with A-009 and related findings marked remediated.
- The 16 TCH1 + 12 TCH2 scripts are loaded as inert data tables; unit tests verify bytecode parsing; integration tests (on sw7-12 and sw7-13) will verify wave-driven script sequencing.

### Acceptance Criteria

1. **VM Engine Implemented:** A per-alien bytecode VM lives in `src/core` with:
   - JMP @A(U) opcode dispatch into TCHOP (address = base + 2×opcode).
   - Per-alien program counter A$CHPC initialized and stepped.
   - One-deep call stack (GOSUB/RETURN).
   - Five opcodes: IF, GOTO, GOSUB, RETURN, TWIRL, each dispatching to its ROM routine.

2. **Event Gates:** .CUNTIL (count-until) and .CIF (conditional-if) operators gate opcodes to specific frames or state conditions per the ROM.

3. **Script Tables:** 16 TCH1 scripts (types 0-15) and 12 TCH2 split entries (wave duplication per A-017) are loaded from the disassembled ROM and exposed as data (no execution here — that's sw7-12/13).

4. **Timebase Correct:** All frame counts and counters in the VM bake on the 20.508 Hz base (from sw7-1). TICK_HZ=30 is NOT used anywhere in the VM logic.

5. **A-019 Deferred:** A music-timed descent finding (A-019) is recorded as a deferred concern in the session; do NOT block on sw7-8's tunes. The VM is architected so sw7-8 can wire audio cues into it post-landing.

6. **Fidelity & Citations:** `remediated_by: sw7-11` is set on finding A-009 in `pair-ai.json`. Related findings (A-011..A-014 symptom-divergences that dissolve with the VM) are left unmarked pending sw7-12/13 integration. `npm test -- citations` is green.

7. **Tests & Build:** star-wars `npm test`, `npm run build`, and `npm run lint` are all green. VM bytecode parsing and dispatch are unit-tested with mutation gates.

### Out of Scope
- **TSPWAV wave composition (sw7-12):** The 6-set wave composer and Darth ordering — built on this VM.
- **Darth behavior (sw7-13):** Darth's 4 lives, immortal-in-space rule, retreat logic, 2,000-pt scoring.
- **A-019 music-timed descent:** Deferred until sw7-8 lands and tunes are baked.
- **src/shell render/audio/input:** The VM is pure core. Shell callers will handle audio/visual dispatch.

### Primary Sources
- **Epic context:** sprint/context/context-epic-sw7.md and parent sw7-9 full description in epic-sw7.yaml.
- **Audit findings:** star-wars/docs/audit/findings/pair-ai.json (finding A-009 and related).
- **ROM reference:** 6809 disasm + AVG vector dumps in star-wars/reference/disasm/ (gitignored). For authentic 6809 source: historicalsource/star-wars (WSVROM.MAC, game object pictures).
- **Constants & opcode specs:** TCHOP base address, A$CHPC per-alien storage, call-stack depth, opcode table layout — all sourced from disassembly evidence in findings JSON.

---

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): AC3 frames TCH1 as "16 scripts (alien **types 0-15**)", implying a flat type→script index, but the ROM selects scripts through the wave-composition tables (TWV/TSPWAV, `WSCPU.MAC:1218-1245`), not a type index — that selection is sw7-12's scope. Affects `sprint/epic-sw7.yaml` sw7-12 (wave composition must index the exported entry tables, NOT assume `TCH1[alienType]`). *Found by TEA during test design.*
- **Question** (non-blocking): The `.CUNTIL` gate is an interrupt-style forward-jump-on-event (CHCN.E, `WSCPU.MAC:836-860`) — it keeps running following ops and skips forward the instant the event fires — NOT the numeric "count-until" the AC phrasing suggests. RED pins only the mask-load; Reviewer must confirm GREEN implements the forward-skip, not a hold/counter. Affects `star-wars/src/core/tie-vm.ts` (`tickChoreo` `.CUNTIL` dispatch). *Found by TEA during test design.*
- **Improvement** (non-blocking): A-009's `ours` citation (`sim.ts:1136` `moveEnemy`) freezes once `remediated_by: sw7-11` is set (checker stops re-opening it; `check-citations.mjs:117-149`), so the VM can be a standalone pure module — wiring it into `stepGame`'s enemy update is sw7-12/integration, not this story. Affects `star-wars/docs/audit/findings/pair-tie-ai.json` (add `remediated_by: sw7-11` to A-009 only; leave A-011..A-014 unmarked). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the RED suite pins the script tables STRUCTURALLY only (counts, TCH2→GOSUB SPLIT, SPLIT head/return) — the 28 ported scripts' per-instruction content (twist/move bits and `.CT` frame counts) is not asserted. The `SOURCE` table in `tie-vm.ts` should be spot-audited against `WSCPU.MAC:1328-1656` and exercised behaviorally when sw7-12 wires scripts into waves. Affects `star-wars/src/core/tie-vm.ts` (the `SOURCE` choreography table). *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Flat-program + entry-offset table model (not per-type script arrays)**
  - Spec source: context-story-sw7-11.md, AC-3 / Technical Approach
  - Spec text: "16 TCH1 scripts (alien types 0-15) and 12 TCH2 split entries loaded from the disassembled ROM and exposed as data"
  - Implementation: tests pin a single flat `program: ChoreoInstr[]` plus entry-offset tables `TCH1: number[16]` / `TCH2: number[12]` / `SPLIT: number`, with GOTO/GOSUB targets as absolute program indices — not an array-of-scripts.
  - Rationale: the ROM is one flat address space with cross-script jumps (`.CGOTO TCH1AZ`, `WSCPU.MAC:1341`) and TCH2→TCH1 fall-through (`WSCPU.MAC:1328-1330`); per-script arrays cannot express cross-script control flow.
  - Severity: major
  - Forward impact: minor — sw7-12 (wave composition) selects scripts by indexing these entry-offset tables.
- **`.CUNTIL` runtime dispatch NOT pinned — only the event-mask load is**
  - Spec source: context-story-sw7-11.md, AC-2
  - Spec text: ".CUNTIL (count-until) and .CIF (conditional-if) gate opcodes to specific frames or state conditions per the ROM"
  - Implementation: `.CIF`/IF is fully pinned (mask-0-always-true, true-takes-next, false-skips-to-next-IF); `.CUNTIL` pins only that a `.CUNTIL mask` loads the gate mask (mask 0 = no gate). The interrupt-style forward-skip on event (CHCN.E) is left for GREEN + Reviewer.
  - Rationale: `.CUNTIL` is an event-mask forward-jump (`WSCPU.MAC:836-860`), not a "count", and its dispatch is intricate; a "hold/count" test would encode a wrong semantic and force a wrong implementation.
  - Severity: major
  - Forward impact: none — contained in sw7-11; Reviewer must verify the `.CUNTIL` dispatch against source.
- **Decoded instruction objects instead of a raw-byte parser**
  - Spec source: context-story-sw7-11.md, Guardrails for Testing
  - Spec text: "unit tests verify bytecode parsing; ... The 16 TCH1 + 12 TCH2 scripts are loaded as inert data tables"
  - Implementation: scripts are exposed as typed `ChoreoInstr` objects; the `& 7` opcode dispatch fidelity is pinned via a standalone `opcodeOf(byte)`, and the `.CT` timer decode `(4 + (arg&0x70)*2 + (arg&0x03)*8) >> 1` (`WSCPU.MAC:961-967`) is documented for Dev to apply — not mandated as a tested byte-parser function.
  - Rationale: decoded objects are idiomatic TS and avoid coupling the whole suite to a raw-byte memory layout; the `.CT` formula is verified certain and documented.
  - Severity: minor
  - Forward impact: none.
- **One maneuver blocks per frame; control ops resolve within a frame**
  - Spec source: context-story-sw7-11.md, AC-1
  - Spec text: "a per-alien bytecode VM ... with JMP @A(U) opcode dispatch into TCHOP, per-alien program counter A$CHPC, one-deep call stack (GOSUB/RETURN), and five opcodes"
  - Implementation: `tickChoreo` resolves IF/GOTO/GOSUB/RETURN within a single call (chaining until a maneuver), and only a TWIRL maneuver (or an active countdown) consumes a game frame.
  - Rationale: matches the ROM, where every control handler `JMP CHNXT`s (continues the frame) while CHTW.D/E `RTS` (ends it) — `WSCPU.MAC:893-927`.
  - Severity: minor
  - Forward impact: none.
- **AC3 "types 0-15" selection deferred to sw7-12**
  - Spec source: context-story-sw7-11.md, AC-3
  - Spec text: "16 TCH1 scripts (types 0-15) ... loaded from the disassembled ROM and exposed as data"
  - Implementation: tests pin the table COUNT (16) and structure (each TCH2 entry GOSUBs SPLIT), not a `type N → TCH1[N]` selection mapping.
  - Rationale: script selection per wave/type is the TSPWAV wave-composition table (sw7-12), not the VM engine; the ROM does not index TCH1 by a flat alien-type.
  - Severity: minor
  - Forward impact: minor — sw7-12 owns wave→script selection over these entry tables.

### Dev (implementation)
- **Ported reachable choreography only; omitted assembled-but-dead tails and commented-out source**
  - Spec source: context-story-sw7-11.md, AC-3
  - Spec text: "16 TCH1 scripts (types 0-15) and 12 TCH2 split entries loaded from the disassembled ROM and exposed as data"
  - Implementation: all 28 scripts + SPLIT are ported, but instruction tails that are unreachable (assembled after an unconditional `.CGOTO`, e.g. TCH1AZ `WSCPU.MAC:1388-1390`, TCH1BZ `1459-1471`, TCH1CZ `1527-1529`) and commented-out source lines (TCH1D1 `1534-1537`, TCH1DZ `1638`) are omitted.
  - Rationale: bytes after an unconditional jump never execute, so porting them adds transcription surface for zero behavioral value; behavior is identical.
  - Severity: minor
  - Forward impact: none — sw7-12 executes only reachable paths; the ported behavior matches the ROM.
- **Implemented the full `.CUNTIL` CHCN.E forward-skip (beyond the RED mask-load tests)**
  - Spec source: sw7-11 TEA Assessment / session `.CUNTIL` note; AC-2
  - Spec text: "RED pins only the mask-load. GREEN implements CHCN.E per source; Reviewer verifies."
  - Implementation: `tickChoreo` polls the armed gate every frame and, on `(status & mask) != 0`, abandons the current maneuver and skips forward to the next control record (`WSCPU.MAC:836-860`) — not a hold/count.
  - Rationale: a mask-load-only no-op gate would be unfaithful; this is the ROM's interrupt-style guard.
  - Severity: minor
  - Forward impact: none — but the forward-skip is not directly covered by a RED test; Reviewer should verify it against source.

---

## Sm Assessment

**Provenance.** sw7-11 is the *foundation* slice of the 18-point sw7-9 ("biggest rock"),
split at the Jedi's ruling into three: **sw7-11 VM engine (this) → sw7-12 TSPWAV waves →
sw7-13 Darth**. Build the VM first — "most divergences dissolve if the VM lands." Parent
sw7-9 is retained as `status:split` and holds the full audit record.

**Routing.** Workflow `tdd` (phased). Setup complete → **RED phase → TEA (Han Solo)**.
Branch `feat/sw7-11-tie-choreography-vm-engine` is live on star-wars.

**What RED should pin (VM behavior only, A-009):**
- Opcode dispatch: `JMP @A(U)` indexing into TCHOP.
- Per-alien program counter `A$CHPC` advancing independently per fighter.
- One-deep call stack: GOSUB pushes, RETURN pops, depth is exactly one.
- Control flow opcodes: IF / GOTO / GOSUB / RETURN / TWIRL.
- Event-gated `.CUNTIL` / `.CIF` (gate on the sim event, not wall-clock).
- Script tables loaded as data: 16 TCH1 scripts + 12 TCH2 split entries (data only — no
  wave composition or Darth execution here).

**Guardrails (carry into RED):**
- Timebase: all counters bake on **20.508 Hz** (sw7-1, DONE) — never TICK_HZ=30.
- The VM is **pure `src/core`** (deterministic). No render/audio/input — shell wires cues later.
- **A-019 (music-timed descent) is DEFERRED** — it rides this VM but wants sw7-8's tunes
  (sw7-8 still backlog). Architect for it; do not block on it.
- Fidelity: mark finding **A-009 `remediated_by: sw7-11`**; keep `npm test -- citations` green.

**Scope fence (do NOT let RED drift into siblings):**
- No TSPWAV wave composition — that is sw7-12.
- No Darth lives/immortality/retreat/scoring — that is sw7-13.
- ⚠️ The A-015 "±2048 corners" landmine lives on **sw7-12**, not here — do not touch corner
  gating in this story.

**Handoff → Han Solo (TEA):** write the failing tests that pin the VM's observable behavior
above, scoped to the engine. Then hand to Yoda (Dev) for GREEN.

---

## TEA Assessment

**Tests Required:** Yes
**Reason:** New VM engine (feature), not a chore — needs mutation-proven unit tests per AC7.

**Test Files:**
- `star-wars/tests/core/tie-vm.test.ts` — 19 tests pinning the per-fighter choreography VM engine + script-table data (finding A-009), cited to `WSCPU.MAC`.

**Tests Written:** 19 tests covering ACs 1–4 (engine + data); ACs 5–7 covered structurally (purity test + Dev marks the finding + suite/tsc green).
**Status:** RED (failing — verified: `Cannot find module '../../src/core/tie-vm'`; sibling `tie-strafe-fire` still 8/8, no collateral).

**AC → test map:**
- **AC1** (dispatch/PC/one-deep stack/5 opcodes): TCHOP enum order; `opcodeOf` `& 7` masking (0x80→IF, 0x84→TWIRL); slots 6/7 trap; GOTO (incl. target 0); GOSUB return-addr; RETURN; nested-GOSUB clobber (one-deep); TWIRL sets maneuver.
- **AC2** (`.CUNTIL`/`.CIF` gating): IF mask-0-always-true, IF true-takes-next, IF false-skips-to-next-IF; `.CUNTIL` mask-load + mask-0-no-gate. *(Partial on `.CUNTIL` runtime — see deviation + Reviewer note.)*
- **AC3** (16 TCH1 + 12 TCH2 as data): counts; every TCH2 entry GOSUBs SPLIT; SPLIT settle-maneuver + RETURN.
- **AC4** (20.508 Hz, not 30): TICK_HZ ≈ 20.508 guard; SPLIT `.CT 01`→6 game-frames (integer, not seconds/÷30); DEC;BMI countdown.
- **AC5** (A-019 deferred; VM pure): behavioral purity test (no mutation, deterministic — no `Math.random`/`Date`). A-019 hook is a Dev architectural note.
- **AC6/AC7** (remediate A-009; build/test/lint green): Dev adds `remediated_by: sw7-11` to A-009 only (`pair-tie-ai.json`; leave A-011..A-014); citations gate + `tsc` + suite go green at GREEN.

### Rule Coverage

| Rule (TS lang-review) | Test(s) | Status |
|-----------------------|---------|--------|
| #3 enum exhaustiveness / `assertNever` | `dispatching an unknown opcode throws rather than silently continuing` | failing |
| #4 null/undefined — `??` not `||` on falsy 0 | `GOTO to index 0 is a real jump`; `.CUNTIL 0 arms NO gate` | failing |
| #8 test quality (no vacuous/`as any`) | self-check (one justified double-cast for the error-path, commented) | failing |
| project rule — core purity / determinism (no DOM, no `Math.random`/`Date`) | `tickChoreo is pure — no mutation, deterministic` | failing |
| #5 module — `.js` import extension | **N/A** — repo uses `moduleResolution: bundler`; zero `.js` in `src/` (scout-verified). No false test written. |

**Rules checked:** 3 of the applicable TS lang-review rules (#3, #4, #8) have direct coverage, plus the project core-purity/determinism rule; #5 documented N/A for this repo.
**Self-check:** 0 vacuous tests (reviewed all 19; the single `as unknown as ChoreoInstr` is a deliberate, commented error-path injection, not a type-silencer).

### Notes for Yoda (Dev / GREEN)

- **Faithful port, not a 6809 emulator.** Realize the observable contract the tests pin; the ROM oracle is `WSCPU.MAC` (VM core `822-927`, TCHOP table `862-868`, IF `872-891`, GOSUB/RETURN `899-910`, TWIRL `911-927`, `.CUNTIL`/`.CIF` macros `933-942`, scripts `1328-1656`, SPLIT `1605-1626`).
- **`.CUNTIL` is the sharp edge.** Implement the CHCN.E forward-skip (`836-860`): while the mask is armed keep running ops, and the instant `(status & mask) != 0` skip forward to the next control record — do NOT build a "hold current maneuver / count" wait. RED only pins the mask-load.
- **`.CT` timer decode** (when porting the 28 scripts): `frames = (4 + (arg&0x70)*2 + (arg&0x03)*8) >> 1` → `.CT 01`=6, `.CT 20`=34, `.CT 40`=66, `.CT 80` clamps to 73→126. Twist bits: ROLL_L=1 ROLL_R=2 PITCH_U=4 PITCH_D=8 YAW_R=0x10 YAW_L=0x20 AIM_AHEAD(C$T9)=0x40 AIM_PLAYER(C$T0)=0x80. Move bits: DOWN=1 DOWN2=2 UP=4 UP2=8 FWD=0x10 FWD2=0x20.
- **Add an iteration bound** to the per-tick control-op loop (a runaway `.CGOTO` self-loop with no maneuver would spin) — not tested, but a robustness guard.
- **Scope fence:** do NOT wire the VM into `stepGame`/`moveEnemy` (that integration is sw7-12), do NOT implement TSPWAV wave selection (sw7-12) or Darth (sw7-13), and do NOT touch the ±2048 corners (A-015, sw7-12). Just build `src/core/tie-vm.ts` as a pure module and mark A-009.

**Handoff:** To Dev (Yoda) for implementation (GREEN).

---

## Dev Assessment

**Status:** GREEN — all tests pass.

**Implemented:** `star-wars/src/core/tie-vm.ts` — a pure `src/core` module (no DOM,
no `Date`/`Math.random`, no `shell` import; obeys the sacred boundary):
- **Engine:** `ChoreoOp` enum (TCHOP order), `Status`/`Twist`/`Move` bit constants,
  `opcodeOf` (`& 7` dispatch + 6/7 trap), `initVm`, and `tickChoreo` — a pure
  per-game-frame step. Control ops resolve within a frame; a TWIRL maneuver (or an
  in-flight countdown, DEC;BMI) consumes the frame; the `.CUNTIL` CHCN.E gate is
  polled every frame and forward-skips on event.
- **Script data:** all 16 TCH1 + 12 TCH2 scripts + SPLIT ported from
  `WSCPU.MAC:1328-1656` as a single flat `program` with entry-offset tables
  (`TCH1[16]`, `TCH2[12]`, `SPLIT`), authored in an assembler-mirroring DSL and laid
  out in ROM order so fall-throughs (TCH2→TCH1, TCH1C1→TCH2C2) hold. `.CT` timers
  decode via `ctFrames` `(4 + (t&0x70)*2 + (t&0x03)*8) >> 1`.
- **Fidelity:** `remediated_by: sw7-11` added to A-009 in `pair-tie-ai.json`; the
  frozen `ours` citation (`sim.ts:1136`) is untouched (anti-laundering).

**Verification (via testing-runner):**
| Command | Result |
|---------|--------|
| `npm test -- tie-vm` | 21/21 pass |
| `npm test -- citations` | 12/12 pass |
| `npm run build` (`tsc --noEmit && vite build`) | pass |
| `npm test` (full suite) | 1268/1268 pass, 106/106 files — no regressions |

**Scope respected:** VM NOT wired into `stepGame`/`moveEnemy` (that integration is
sw7-12); no TSPWAV wave selection (sw7-12); no Darth (sw7-13); ±2048 corners untouched
(A-015, sw7-12).

**Deviations:** 2 logged (omitted dead/commented script tails; implemented the full
CHCN.E `.CUNTIL` forward-skip beyond RED's mask-load tests). See `### Dev (implementation)`.

**Notes for Obi-Wan (Reviewer):**
- **Verify against source:** (a) the `.CUNTIL` CHCN.E forward-skip in `tickChoreo`
  (not directly RED-tested) against `WSCPU.MAC:836-860`; (b) the IF-false "scan to next
  `.CIF`" against `872-891`; (c) spot-audit a few of the 28 ported scripts' maneuver
  content against `WSCPU.MAC:1328-1656` — the RED suite is structural, so per-instruction
  twist/move/timing is unasserted (see Dev Delivery Finding).
- `tickChoreo` has `MAX_STEPS` guards on both the control-op loop and the IF scan to
  prevent runaway loops on malformed data.

**Handoff:** To Reviewer (Obi-Wan) for code review.

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 1 nit | confirmed 1 (Low), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (all Low), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (from subagents) + 3 from my own analysis = 7, all non-blocking (0 Critical, 0 High); 0 dismissed; 0 deferred

Note: `reviewer-security` is disabled, but I assessed its domain myself (see Rule Compliance #10): `tie-vm.ts` takes no untrusted input — `status`/`byte` are internal sim values — so there is no injection/auth/secret surface. `reviewer-test-analyzer` disabled: I assessed test quality myself (rule-checker also did — no vacuous assertions).

---

## Reviewer Assessment

**Verdict: APPROVED** — no Critical/High findings. All 7 ACs met; the port is faithful to `WSCPU.MAC` (independently verified two ways); all gates green (tie-vm 21/21, citations 12/12, full suite 1268/1268, build clean); the `src/core` purity boundary is respected. Seven Low/Medium non-blocking findings recorded below for follow-up (2 are cheap `[RULE]` fixes worth doing before or during sw7-12).

### Rule Compliance (TypeScript lang-review checklist + star-wars CLAUDE.md)

| Rule | Verdict | Evidence |
|------|---------|----------|
| #1 type-safety escapes | Compliant (1 Low) | No `as any`/`@ts-ignore`/non-null `!` in `tie-vm.ts`. One `as unknown as ChoreoInstr` in test.ts:233 — justified error-path (see F3). `opcodeOf` `return op as ChoreoOp` (tie-vm.ts:107) is narrowed by the preceding `if (op > TWIRL) throw`. |
| #2 generics/interfaces | Compliant | `tickChoreo(vm: Readonly<ChoreoVm>, prog: readonly ChoreoInstr[])` and `assemble(source: readonly Line[])` use `readonly`; `Record<string, number>` not `Record<string, any>`. |
| #3 enum exhaustiveness | Compliant + 1 Low | `ChoreoOp` explicit 0-4 values (matches TCHOP order). `tickChoreo` switch has a true `assertNever` default (tie-vm.ts:185). **F1:** `assemble`'s `switch(line.kind)` (tie-vm.ts:349) lacks the same guard. |
| #4 null/undefined (`??` vs `||`) | Compliant + 1 Low | No `??`/`||` defaulting bugs; falsy-0 handled correctly (opcode 0, target 0, mask 0, frames 0 — verified by tests + `=== 0` checks at tie-vm.ts:169). **F2:** unguarded `labels[line.ref]` (tie-vm.ts:354,357), mitigated. |
| #5 module/imports | Compliant | `export type` used for `ChoreoInstr`; extensionless imports match repo convention (`moduleResolution: bundler`, verified against ~50 sibling tests) — the `.js` rule does NOT apply here. |
| #6 React/JSX | N/A | No `.tsx`. |
| #7 async | N/A | No async/Promises. |
| #8 test quality | Compliant | 21 tests, every assertion checks a concrete value tied to a `WSCPU.MAC` citation; no vacuous/tautological assertions (rule-checker + my own read concur). |
| #9 build/config | Compliant | `tsconfig`/`vite.config` untouched; `strict: true`. |
| #10 security input validation | N/A | `status`/`byte` are internal sim values, not untrusted input. |
| #11 error handling | Compliant | 6 `throw` fail-fast sites, no `try/catch`, consistent with the pure fail-loud core. |
| #12 perf/bundle | Compliant | No barrel imports; the one `JSON.parse(JSON.stringify(...))` is a test-only 6-field snapshot. |
| star-wars core purity | Compliant | `tie-vm.ts` has ZERO imports; no DOM/`Date`/`Math.random`; C$R1/C$R2 randomness deferred to the caller's seeded RNG. |
| ROM-is-law (fidelity) | Compliant | Opcode table, Status/Twist/Move constants, `ctFrames` formula, and script blocks verified byte-exact against `WSCPU.MAC` (both by me and rule-checker). |

### Observations (tagged; ≥5)

- **[VERIFIED] Engine dispatch is faithful** — `tickChoreo` (tie-vm.ts:123) dispatches IF/GOTO/GOSUB/RETURN/TWIRL/until per `WSCPU.MAC:829-927`; GOSUB saves `pc+1` (matches CHGS.D return = record+3), RETURN restores it, one-deep single slot. Evidence: tie-vm.ts:154-166; tests one-deep clobber (test.ts) passes.
- **[VERIFIED] ROM fidelity of ported data** — I line-diffed 7 scripts (TCH1A1, B1, C1, CZ, D2, DZ, SPLIT) against `WSCPU.MAC:1328-1656`: all exact, including the TCH1C1→TCH2C2 fall-through and cross-script `.CGOTO`s. An independent data-integrity run confirmed all TCH1/TCH2/SPLIT entries are in-range and all 35 GOTO/GOSUB refs resolve (0 dangling). rule-checker independently verified the opcode table + constants + `ctFrames` + TCH2A1 block.
- **[VERIFIED] Falsy-zero correctness** — GOTO target 0, `.CUNTIL 0` (no gate), opcode 0 (IF), frames 0 all handled without `??`/`||` defaulting bugs; dedicated tests pin each.
- **[RULE][LOW] F1** — `assemble`'s `switch(line.kind)` (tie-vm.ts:349) has no `default: assertNever` (rule #3); currently exhaustive over 4 `Line` kinds, but a future kind would silently no-op. Cheap fix; recommend adding it.
- **[RULE][LOW] F2** — `labels[line.ref]` (tie-vm.ts:354,357) is unguarded `Record` indexing (rule #4); a typo'd ref would be `undefined` at runtime. Mitigated: all 35 refs resolve today, and `tickChoreo`'s out-of-range `throw` would catch any future one loudly rather than corrupt state.
- **[RULE][LOW] F3** — `{ op: 99 } as unknown as ChoreoInstr` (test.ts:233) matches rule #1. Confirmed but accepted: it is the only way to construct an out-of-union value to exercise the `assertNever` trap that rule #3 wants tested; isolated, commented, test-only.
- **[MEDIUM] F4 (fidelity, sw7-12)** — `tickChoreo` arms a `.CUNTIL` gate and dispatches the following maneuver in the SAME frame without re-checking whether the event is already set (tie-vm.ts:180-184 then the loop dispatches the next TWIRL). The ROM's CHOPDO checks `A$CHCN` before every dispatch (`WSCPU.MAC:836-840`), so an already-true event skips the guarded maneuver immediately (0 frames) vs. our 1 frame. Only observable once scripts execute (sw7-12), where scripts are inert here (AC3). Recommend sw7-12 move the gate check to per-dispatch.
- **[LOW] F5 (robustness)** — the CHCN.E forward-skip (tie-vm.ts:180-184) and IF-false scan (tie-vm.ts:170-176) have no explicit end-of-program guard; they rely on every armed gate / false-IF being followed by another control record. True for all 16 scripts today; a malformed script throws "out of range" loudly rather than corrupting state. `MAX_STEPS` guards the loops. Acceptable; note for sw7-12.
- **[LOW] F6 (nit)** — `ctFrames` (tie-vm.ts:206) is exported but has no external consumer yet. Accept: it is a documented ROM decode helper that sw7-12 may reuse; exporting a pure, tested function is harmless.
- **[MEDIUM] F7 (coverage, known)** — the RED suite pins the script tables structurally only; per-instruction content of the 28 scripts is unasserted. Mitigated by: 7 exact manual spot-checks, the data-integrity run, and rule-checker's independent block verification. Already logged as a Dev Delivery Finding for sw7-12 to exercise behaviorally.

### Devil's Advocate

Assume this VM is broken. Where would it bite? First, the **one-deep call stack**: `savedPc` is a single slot, so a `GOSUB` inside a `GOSUB`'d subroutine silently clobbers the outer return — if a future script (or a mis-ported one) nested a call, a fighter's PC would jump to the wrong place and fly a garbage maneuver. Today only TCH2 entries GOSUB (into SPLIT, which never GOSUBs), so it holds — but nothing in the type system *enforces* one-deep, so sw7-12/13 could violate it. Second, the **gate/dispatch ordering** (F4): a maneuver gated by an already-true event runs one extra frame; stacked across many gates in a long loiter loop, a TIE could drift a few frames out of ROM sync — cosmetically invisible, but a fidelity auditor comparing frame-by-frame would catch it. Third, **runaway loops**: a malformed script with a `.CGOTO` cycle containing no TWIRL would spin; `MAX_STEPS=4096` throws instead of hanging — good, but 4096 is arbitrary and a legitimately long control chain (unlikely, but unproven) could false-trip it. Fourth, a **confused future editor** could add a fifth `Line` kind and `assemble` would silently drop it (F1) — the exact class of bug the `tickChoreo` switch guards against but `assemble` does not. Fifth, **the untested 21 scripts I did NOT line-diff** (F7): a single wrong twist bit (say `C$RL` vs `C$RR`) would make a TIE bank the wrong way, and no test would catch it until sw7-12 renders it — the data-integrity run only proves jumps resolve, not that maneuvers are correct. Sixth, a **stressed caller** passing a `pc` outside the program (e.g. a stale index after a table change) hits the `out of range` throw — which, in the live game loop, would crash the frame rather than degrade gracefully; for a pure sim that's defensible fail-loud, but sw7-12 must ensure it only ever seeds `pc` from `TCH1`/`TCH2`. None of these are Critical or High for *this* story — the VM is inert data + a tested engine here — but F4, F1, and F7 are real seeds of future bugs and are recorded so sw7-12 inherits them with eyes open.

### Verdict

**APPROVED.** All ACs met, faithful to source (verified two independent ways), all gates green, boundary respected. The seven findings are Low/Medium and non-blocking; F1 and F2 are cheap `[RULE]` fixes and F4/F7 are fidelity/coverage items that belong to sw7-12 (where the scripts actually execute). No rework required to land the VM engine + data as A-009.

**Handoff:** To SM (Thrawn) for finish.