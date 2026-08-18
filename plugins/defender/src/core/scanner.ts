// src/core/scanner.ts
//
// df5-1 RED SEAM (O'Brien / TEA). This is a deliberately EMPTY stub so the failing
// suite tests/df5-1-scanner.test.ts can IMPORT `../src/core/scanner.js` and fail on
// ASSERTIONS (undefined export → clean per-test RED), never on a module-resolution
// collect crash (the red-seam-new-module convention). It carries no logic.
//
// GREEN (Julia / Dev) replaces this with the ported SCNR world→radar projection
// (reference/original-source/defender/AMODE1.SRC:1180, blip loop SCNR10 :1260-1271,
// scanner-left XTEMP :1197-1199, 64-column count :1223, bezel :1225), reading the df3
// world.ts model (worldX + the $10000 wrap). Every constant it introduces re-opens
// under the df1-1 citation gate (docs/rom-study/claims/*.json). Stays inside the
// core/shell boundary — tests/purity.test.ts sweeps this file.
export {}
