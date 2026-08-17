// plugins/defender/src/core/landers.ts
//
// Story df4-3 (RED stub — Han Solo / TEA). The signature Defender loop: the
// LANDER descends from the top, targets a HUMANOID walking the terrain, grabs it,
// carries it toward the top (the transform TRIGGER df4-4 consumes), and — when the
// carrying lander is shot — drops the humanoid into an AFALL free-fall.
//
// This file ships EMPTY on purpose: it is the brand-new-core-module RED seam. TEA
// authors the failing suite (tests/df4-3-*.test.ts) against the contract declared
// in tests/helpers/df4-3-landers-contract.ts; GREEN (Yoda) implements
// `createEnemyBank(sched, rand)` + the LANDER/HUMANOID/AFALL constants here, each
// cited to reference/original-source/defender/DEFB6.SRC and pinned by a
// claims/*.json entry (the df1-1 citation gate — no core constant without a claim).
//
// Re-derived from DEFB6.SRC:
//   *START LANDERS  :649  LANDST     — spawn N landers at YMIN+2, descending (LNDYV)
//   *LANDER KIDNAP  :688  LANDS0     — descend, target a humanoid, align, grab (LANDG0/LANDG3)
//   *ASTRONAUT PROC :290  ASTRO      — the humanoid; walks the terrain (NAP 2)
//   FLEE            :795  LANDF      — carry up until OY16 <= YMIN+8 (the transform trigger)
//   *KILL KIDNAPPING:903  LKIL1      — shot carrier with a passenger → NEWP AFALL,STYPE :911
//   *ASTRONAUT FALL :927  AFALL      — +8 accel/tick, capped $300 (ground outcome ALAND is df5)
//
// Purity: this module is scanned by tests/purity.test.ts — no clock, no ambient
// entropy (the spawn RNG is INJECTED as `rand`, exactly as createSim injects it),
// no browser surface, no shell import. Colour reaches the frame by df2 palette
// INDEX only (never a hex literal).

export {}
