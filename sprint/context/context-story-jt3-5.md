# Story Context: jt3-5 — Baiters + the RV4 ptero-farming patches

## Story Summary
**ID:** jt3-5  
**Title:** Baiters + the RV4 ptero-farming patches — BAITBL schedule (V4 15s→1s), max-3 PCHASE=-1, the PCHASE-gated patch block  
**Epic:** jt3  
**Points:** 3  
**Workflow:** tdd  

## Technical Approach

Baiters are anti-stall pterodactyls implemented as the **same ptero core** from jt3-4 (`src/core/ptero.ts`) with `PCHASE = -1` (JOUSTRV4.SRC:2108-2113), capped at 3 live. They spawn on the **BAITBL schedule**, written literally as `SECONDS*60/8` (JOUSTRV4.SRC:2150-2163). 

The V4 rewrite **collapses the mid-game cadence from 15s to 1s** ('4 MIN 16 SEC → 2 MIN 16 SEC') with the RV3 original preserved in `********` comments (JOUSTRV4.SRC:2135-2148).

**The RV4 patch block** (baiter-only, PCHASE-gated per subsystems §2) comprises **six patches** that aim the ptero lower, slow its dive, reroute its lanes, and make its first pass miss (JOUSTRV4.SRC:6296-6360, header JOUSTRV4.SRC:6268). Each patch preserves its displaced instruction as a `********` comment. Because the patches gate on PCHASE, they modify **baiters' behaviour only**, NOT the plain wave-type ptero from jt3-4 — that gating is **why baiters and patches are ONE story**.

The **BAITBL cadence** reads from jt3-1's difficulty axis where wave-varying. The **IFN DEBUG budget invariant** (jt2-2) holds as a free oracle.

### Key Citations & Anchors (resolve for implementation)
- Baiter core reuses jt3-4's ptero with PCHASE=-1 gate (JOUSTRV4.SRC:2108-2113)
- BAITBL schedule: JOUSTRV4.SRC:2150-2163 (`SECONDS*60/8`)
- V4 collapse 15s→1s: JOUSTRV4.SRC:2135-2148 (RV3 preserved as comments)
- RV4 patch block: JOUSTRV4.SRC:6296-6360 (header :6268)
- Patches are PCHASE-gated, so they affect baiters only
- Budget invariant from jt2-2: JOUSTRV4.SRC:2075-2129, JOUSTRV4.SRC:2202-2205

### Carried-Forward Notes from jt3-4 Review
- jt3-4 built the ptero core but left spawned pteros inert in the scheduler (no 'ptero' case in frame.ts:runBehaviour, filtered from collisionPass)
- **jt3-5 is the FIRST place the `resolvePteroAttack` window may go live** — if this story wires a live baiter joust, it must also fix the degenerate `facingInto` equal-column edge (Math.sign(0)=0 returns no-kill where ROM COLDX=0/BPL would allow a kill)
- If jt3-5 stays at the spawn-schedule/patch-behaviour level (leaving full live flight/joust to jt3-7), **scope boundary must be noted explicitly**

## Acceptance Criteria

1. **Baiters are pteros with PCHASE=-1, capped at 3 live, spawned on the BAITBL SECONDS*60/8 schedule; the V4 15s→1s mid-game cadence collapse is transcribed with the RV3 original preserved as ******** provenance; claims entries.**

2. **The six PCHASE-gated patches change baiter behaviour (aim-lower / slow-dive / lane-reroute / first-pass-miss) and DO NOT change the plain wave-type ptero (the gate is proven both ways); each patch keeps its pre-patch instruction as a ******** comment.**

3. **The baiter seam closes against jt2-2: the budget's 15s growth (jt2) and the BAITBL spawn schedule (this story) drive baiter appearance together; the IFN DEBUG budget invariant still holds as an oracle; citations suite green.**

4. **Determinism: a seeded stall that triggers baiters replays bit-for-bit; purity guard green.**

## Definition of Done
- All acceptance criteria tested and passing
- Determinism proven via seeded replay
- Citations suite passes (all ROM addresses verified)
- Purity guard green (no side effects in core)
- No wall-clock, no Math.random in core

## Related Stories
- **Blocks on:** jt3-4 (pterodactyl core + jt2-5's WJSRTB wave-type dispatch)
- **Blocked by:** jt3-1 (difficulty axis for cadence), jt2-2 (budget + 15s growth)
- **Gates:** jt3-6 (ptero death dissolve depends on spawned pteros being live)
- **Consumed by:** jt3-7 (demo, where baiters appear in playable ecosystem)
