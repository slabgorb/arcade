// src/core/waves.ts — df5-2 RED seam stub (Leeloo / TEA).
//
// EMPTY on purpose. This file exists only so the df5-2 RED suite
// (tests/df5-2-waves.test.ts) can `import * as waves from './waves.js'` and fail on an
// ASSERTION (undefined is not a function / undefined constant) rather than a
// module-resolution collect crash. GREEN (Korben / Dev) ports the WVTAB wave table
// (BLK71.SRC:676-689) and the GTWV00 "new guys every Nth wave" escalation
// (DEFA7.SRC:1859) here, and adds the docs/rom-study/claims/*.json entries the AC1/AC4
// citation gate demands. The src/core purity sweep (tests/purity.test.ts) auto-arms over
// this file the moment it carries code — AC3's "no clock/rAF/Math.random" clause needs
// no test of its own.
export {}
