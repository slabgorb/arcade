# Story jt1-5 Context

## Title
Flight + ground movement — flap impulse decay, gravity pair, FLYX ladder, ground state machine, 2P input contract

## Metadata
- **Story ID:** jt1-5
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** joust
- **Epic:** Joust — foundation slice (scaffold, citations, image transcription, arena, flight, render)

## Problem
The flap model, transcribed exactly (subsystems §2): flap on release→press edge; impulse ΔVY = ((PTIMUP×96)>>8) − 96 (ADDFLP, JOUSTRV4.SRC:6429-6436); PTIMUP saturating frame counter (:6476-6478); gravity 4/frame wings-down (button held), 8 wings-up (:952-953, :6170, :6197) — the glide mechanic; FLYX 9-entry ladder ±{2.0,1.0,0.5,0.25,0} px/frame indexed by PVELX, ±2×joystick per flap edge only, REJECTION clamp at ±8 (update discarded, not saturated — :6440-6448; comments lie, trust branches); NO air drag, NO terminal velocity (negative tests pin both absent); takeoff −$0080 + 1px lift vs walk-off zero-VY (:6123-6151); wing-frame holds decoupled from gravity state (:6147, :6221, :6203); positions integrate as 16-bit pixel+fraction. Ground: the STATE machine (:7160-7175) with animation-driven deltas (ORRUN 0/3/2/1/2, skid 2 — :7185-7189, :7242), 8-frame state advance, landing conversion FRCONV (:6253-6257), skid sets PLANTZ=2 (:6071-6072 — recorded now, consumed by jt2's joust). Bump registers as one-shot positional shoves (:7270-7284, :6495-6496). Input: device-agnostic per-player contract {dir −1/0/+1, flap edge} mirroring the ROM's normalisation (:7261-7263); shell maps P1 arrows+flap and P2 A/D+flap, both proven against the same core contract in a shell test. Deterministic under seeded replay. [BLOCKER RECORDED by the jt1-4 review, 2026-07-20 — resolve FIRST: the (x,y)→landing-mask step DOES NOT EXIST. CKGND computes LNDXTB[x] & LNDYTB[y], but LNDXTB/BCKXTB are per-wave RAM buffers (RAMDEF.SRC:373,377) populated from LNDXS1/2/3 (JOUSTRV4.SRC:7787,7879,7799) and BCKXS1/2 (:7616,:7708) — jt1-4 transcribed only the Y side. jt1-5 cannot land an entity from a position until the X source tables are transcribed (this story or a fast precursor — TEA decides the seam and flags if it deserves a split). The jt1-4 reachability ruling lands here too: whichever story transcribes the X tables owns the groundOutcome reachability assertion (impossible masks are currently mapped silently, ROM-faithfully). ALSO: jt1-7 (purity-scanner tokenizer) and jt1-10 (SUB-001/002 process-block arithmetic) both GATE this story — check their status before setup; if either is unstarted, the SM must sequence them first or explicitly waive the gate with rationale.] [jt1-4 REVIEW ADDENDUM, mutation-tested: (a) the REVISED reachability ruling — full reachability still belongs to the X-table story, but the cheap partial version lands WITH jt1-5: derive [...new Set(LND_Y_TABLE)] (= {0,1,2,4,8,16,128,0xA0}) and assert groundOutcome handles each — today CASES covers all eight by coincidence, not construction. (b) bridgeDestroyedOnWave: mutating >= to === passed EVERY test (confirmed silent-regression channel, MEDIUM) — the wave-4 one-liner is riding jt1-7; verify it landed before trusting bridge coverage.] [jt1-4 REVIEW ADDENDUM 2 (edge-hunter returned; all findings verified first-hand by the Reviewer): arena.ts exports are UNFROZEN and groundOutcome returns PLATFORMS[i] BY REFERENCE — a determinism channel the purity guard cannot see (mutating a returned platform corrupts the module permanently; seeded replay diverges silently); freeze the exports and correct the header's false 'no shared mutable state' claim — an API decision for this story, not a drive-by. wrapX is WHOLE-PIXEL-domain only: fractional inputs escape the band in both directions (292.5→292.5; −10.5→292.5) — ROM-faithful (the ROM wraps the whole-pixel D register with the fraction in a separate byte) but this story integrates 16-bit pixel+fraction and the signature invites passing the composite; document the domain or assert integrality. Fold the NaN/out-of-range coercion cluster (applyCeiling(NaN)→confident bump, isLavaDeath(NaN)→false, groundOutcome(256)→airborne via &0xff, land(undefined)→raw TypeError) into ONE input-validation decision, not six patches. Corroboration: the 256-mask CKGND verification now has TWO independent confirmations.]

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- Flap impulse, gravity pair, FLYX values, clamp-rejection semantics, wrap/ceiling/floor interactions, and the ground-state deltas all transcribed with radix-cited comments + claims entries; citations suite green.
- Negative tests prove no-drag (horizontal speed persists indefinitely without flapping) and no-terminal-velocity (VY grows unbounded until floor/ceiling) — the dossier's cited negative claims stay true in code.
- Determinism: identical seed + input script reproduces the identical flight trajectory bit-for-bit through wrap, ceiling bounce, landing, and takeoff.
- Both players drive the same core contract from different shell mappings (P1 arrows, P2 A/D) in a shell test; a rapid-flap script out-climbs a slow-flap script (PTIMUP decay observable).

---
_Generated by `pf context create story jt1-5` from the sprint YAML._
