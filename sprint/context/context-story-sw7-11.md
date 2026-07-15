# Story sw7-11 Context

## Title
R9a TIE choreography VM engine — per-fighter bytecode VM (A-009)

## Metadata
- **Story ID:** sw7-11
- **Type:** feature
- **Points:** 8
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Star Wars — primary-source fidelity: the ruling sheet from the 2026-07-15 audit

## Problem
The arcade sim currently lacks the per-fighter bytecode choreography system. The cabinet's alien TIEs follow scripted behavioral patterns driven by a compact bytecode VM. Our sim has no equivalent — every alien is a hardcoded state machine, missing authentic flight choreography, wave-based composition, and scripted maneuvers. Finding A-009 names the authentic thing: the per-fighter bytecode choreography VM (TCHOP) with per-alien program counter (A$CHPC), one-deep call stack, and five bytecode opcodes (IF, GOTO, GOSUB, RETURN, TWIRL) plus event-gated dispatch operators (.CUNTIL, .CIF).

## Technical Approach

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

## Scope

**In scope:**
- VM engine in `src/core` with JMP @A(U) opcode dispatch, per-alien program counter (A$CHPC), one-deep call stack (GOSUB/RETURN).
- Five opcodes: IF, GOTO, GOSUB, RETURN, TWIRL.
- Event-gated dispatch operators: .CUNTIL (count-until), .CIF (conditional-if).
- 16 TCH1 scripts (alien types 0-15) and 12 TCH2 split entries loaded from disassembled ROM.
- Unit tests for bytecode parsing and opcode dispatch (mutation-proven).
- `remediated_by: sw7-11` set on finding A-009 in `pair-ai.json`.
- All constants bake on the 20.508 Hz timebase (sw7-1).

**Out of scope:**
- **TSPWAV wave composition (sw7-12):** The 6-set wave composer and Darth ordering.
- **Darth behavior (sw7-13):** Darth's 4 lives, immortal-in-space rule, retreat logic, 2,000-pt scoring.
- **A-019 music-timed descent:** Deferred until sw7-8 lands and tunes are baked.
- **src/shell render/audio/input:** The VM is pure core.

## Acceptance Criteria

1. A per-alien bytecode VM lives in `src/core` with JMP @A(U) opcode dispatch into TCHOP, per-alien program counter A$CHPC, one-deep call stack (GOSUB/RETURN), and five opcodes: IF, GOTO, GOSUB, RETURN, TWIRL.

2. Event-gated dispatch operators .CUNTIL (count-until) and .CIF (conditional-if) gate opcodes to specific frames or state conditions per the ROM.

3. 16 TCH1 scripts (types 0-15) and 12 TCH2 split entries (wave duplication per A-017) are loaded from the disassembled ROM and exposed as data.

4. All frame counts and counters in the VM bake on the 20.508 Hz base from sw7-1; TICK_HZ=30 is NOT used anywhere in VM logic.

5. A-019 (music-timed descent) is recorded as a deferred concern in the session. The VM is architected so sw7-8 can wire audio cues into it post-landing.

6. `remediated_by: sw7-11` is set on finding A-009 in `pair-ai.json`. Related findings (A-011..A-014 symptom-divergences) are left unmarked pending sw7-12/13 integration. `npm test -- citations` is green.

7. star-wars `npm test`, `npm run build`, and `npm run lint` are all green. VM bytecode parsing and dispatch are unit-tested with mutation gates.

## Primary Sources
- **Epic context:** sprint/context/context-epic-sw7.md and parent sw7-9 description in epic-sw7.yaml.
- **Audit findings:** star-wars/docs/audit/findings/pair-ai.json (finding A-009).
- **ROM reference:** 6809 disasm + AVG vectors in star-wars/reference/disasm/ (gitignored). For authentic 6809 source: historicalsource/star-wars (WSVROM.MAC).

---
_Generated by `pf context create story sw7-11` from the sprint YAML._
