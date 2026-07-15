# Story rb4-4 Context

## Title
WIRE UP THE DEAD MECHANICS — the returning ace is never imported and the player CANNOT DIE

## Metadata
- **Story ID:** rb4-4
- **Type:** bug
- **Points:** 13
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** red-baron
- **Epic:** Red Baron — ROM fidelity against the original 1980 Atari source

## Problem
Cluster C3. Subsumes CD-010, CD-011, EN-019, MI-021, CB-004, SN-009. The story that turns the clone back into a game. FOUR mechanics are wired to nothing. (1) returning-ace.ts is NEVER IMPORTED by any source file — the signature Red Baron mechanic is dead code, and the refuter confirmed the evade logic inside it is actually CORRECT, it is simply unreachable. (2) main.ts declares `lives` (:342) and assigns it (:406) and NEVER READS IT — there is no death, no respawn, no game over. (3) There is NO ground collision at all: you cannot fly into a mountain, though the ROM checks GREND every frame BEFORE any motion (RBARON.MAC:783-784). (4) No extra lives (BONUSL). (5) score-tick and bonus-life events are declared in core/events.ts and consumed in audio-dispatch.ts but EMITTED BY NOTHING — so three of the five shipped POKEY sounds (TK, TP, BN) can never play.

## Technical Approach

### ROM Mechanics Summary

The four dead mechanics are all driven from the ROM's calc-frame loop:

1. **returning-ace.ts (EOLSEQ):** Called every calc frame (RBARON.MAC:825). The evade logic is correct and complete; it needs to be wired into the sim loop alongside enemy updates.

2. **Death & Game Over:** Controlled by `lives` counter. Two distinct death paths emit different durations:
   - Shot down: `.TIME1=16` calc frames (1.536 s at 96 ms)
   - Ground collision: `.TIME2=28` calc frames (2.688 s at 96 ms)

3. **Ground Collision (GREND):** Checked BEFORE motion each frame (RBARON.MAC:783-784), with D6=GROUND COLLISION flag. This is why mountains are deadly — the ROM prevents flying through them via pre-motion collision detection.

4. **Extra Lives (BONUSL):** Award extra lives at RBARON.MAC:1602. Emits bonus-life event so the BN sound (POKEY channel 1) can fire.

5. **Score Tick (SCOREM):** The ROM ticks the score up over time and fires SOUND 0 (TK) / SOUND 4 (TP) on every tick. Both events are declared in core/events.ts and consumed by audio-dispatch.ts, but no producer emits them yet.

### Critical Timing Trap: FRMECNT=4

**Do NOT assume calc frames = display frames.** The ROM's FRMECNT=4 means:
- Sim ticks at ~10.4 Hz calc-frame cadence (every 96 ms)
- Display refreshes at 62.5 Hz (every 16 ms)
- Calc frame = 6 display frames

Death durations are in calc frames:
- 16 calc frames × 96 ms = 1.536 s (not 16 ms)
- 28 calc frames × 96 ms = 2.688 s (not 28 ms)

Any code that confuses display frames with calc frames will run death animations 6× too fast or 6× too slow.

### Upstreams & Blockers

- **Depends on rb4-1** (radix sweep): Many constants in this story have been corrected by rb4-1's hexadecimal transcription fixes. Verify your ROM citations match rb4-1's corrections.
- **Watch rb4-5 (camera rewrite):** PR #26 is open and CONFLICTING on red-baron develop. If develop moves before this story ships, expect merge conflicts on the flight physics.

### Context Notes

- **No event may be declared-and-consumed but never emitted:** A test in the acceptance criteria should grep core/events.ts for all GameEvent variants and confirm each has at least one producer call in src/.
- **audio-dispatch.ts is already correct:** Do not modify pokey.ts or audio-dispatch.ts — they already wire score-tick and bonus-life to sounds. The story is purely about EMITTING these events from the sim.

_Approach hints to be refined by TEA/Dev. The story title above defines the intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- returning-ace.ts is imported and driven from the sim: the ROM calls EOLSEQ every calc frame (RBARON.MAC:825). The evade test already in the module (|PLDELX| >= 0x1C toward ENSIDE, first evasion free via BEFLAG, 50/50 thereafter) is REACHED — do not rewrite it, wire it.
- `lives` is READ: reaching zero ends the game. The two death channels are distinct (shot down vs flew into the ground) and carry the ROM's own durations (.TIME1=16, .TIME2=28 calc frames = 1.536 s / 2.688 s at 96 ms).
- Ground collision exists: flying into a mountain kills you, via the ROM's GREND path (RBARON.MAC:4643-4645, D6=GROUND COLLISION), checked BEFORE motion each frame.
- Extra lives are awarded (BONUSL, RBARON.MAC:1602), and the bonus-life event is EMITTED so the BN sound can fire.
- The score COUNT-UP exists (SCOREM: the ROM ticks the score up over time and fires SOUND 0 / SOUND 4 on every tick) and EMITS score-tick, so TK and TP can fire. The audio layer is NOT at fault — pokey.ts and audio-dispatch.ts are already correct; the producers are missing.
- A test proves every GameEvent variant declared in core/events.ts has at least one producer in src/. No event may be declared-and-consumed but never emitted.

---
_Generated by `pf context create story rb4-4` from the sprint YAML._
