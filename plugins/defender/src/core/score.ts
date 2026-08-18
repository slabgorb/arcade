// src/core/score.ts — Defender scoring, the men (lives) counter and the extra man.
//
// df5-3 SEAM STUB (RED phase, authored by TEA). Empty on purpose: the RED suites
// tests/df5-3-scoring.test.ts and tests/df5-3-score-identity.test.ts import this
// module as a namespace and cast it to the contract they pin, so they COMPILE and
// fail on ASSERTIONS rather than a module-resolution crash (the df5-2 waves.ts
// precedent). GREEN (Dev) replaces this with the pure reducer:
//
//   - per-enemy kill points + the humanoid catch/rescue pop-up values, each a
//     claims/*.json-cited constant (no un-cited src/core value — the df1-1 gate),
//   - the men counter (STARTING_MEN = NSHIP = 3, ROMC8.SRC:802), decremented on
//     ship death and incremented by the extra-man award at every 10,000 points
//     (REPLAY @10,000, ROMC8.SRC:801),
//   - score pop-ups as df3 scheduler STYPE(=0) processes (PHR6.SRC:500), NOT a
//     per-pop-up rAF tick,
//   - PURE core: no render/audio/input/storage, no wall-clock (purity.test.ts).
//
// Every score VALUE is pinned in docs/rom-study/glossary.md (the Scoring table) and
// byte-verified by a claim BEFORE the reducer is named — a wrong point value in
// prose ships GREEN, so the dossier gate runs first (context-story-df5-3.md AC1).

export {}
