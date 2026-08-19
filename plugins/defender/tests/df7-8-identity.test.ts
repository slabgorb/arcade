// plugins/defender/tests/df7-8-identity.test.ts
//
// Story df7-8 — RED phase (Leeloo / TEA). AC3: every constant the scanner PLAYER BLIP
// draws must be CITED to the 1981 ROM under the df1-1 gate (citations.test.ts), not
// guessed — a claims/15-scanner.json entry the gate re-opens verbatim against the
// vendored source (reference/original-source/defender/AMODE1.SRC).
//
// df5-1 pinned the scanner PROJECTION geometry (64-column strip :1223, the SUBD/OX16
// world path :1260-1261, the X/Y shifts :1262/:1265, OBJCOL :1270) and df7-5 added the
// BEZEL byte (:1227). What df7-8 ADDS is the *PLAYER BLIP OUTPUT path (AMODE1.SRC:1242-1258),
// which the ROM keeps SEPARATE from the world-attacker loop: the player sits at a fixed
// screen position, so its radar marker is computed from PLAXC directly — with NO camera
// (XTEMP) subtraction — not through the SCNR world→radar projection. The two OPERATIVE
// bytes df7-8 draws by:
//   • :1242  `LDD  PLAXC`   — the player-position SOURCE (its two bytes become the marker's
//                             radar column and row: A>>4 :1243-1246, B>>3 :1247-1249). This
//                             is why the marker is camera-INVARIANT, unlike an attacker blip.
//   • :1253  `LDD  #$9099`  — the marker VALUE: palette index 9 (WHITE) in its high nibble,
//                             the same index-9 white the df7-5 bezel ($9090, :1227) uses.
// Pin the OPERATIVE instruction that ENCODES each value (the df7-2/df7-5-identity precedent
// cites operative instructions, not the *PLAYER BLIP OUTPUT banner, which carries no bytes).
//
// This file reads ONLY the claims (loadClaims/coveredBy from the dossier-sweep helper), so it
// is INDEPENDENTLY red before GREEN — no claim covers :1242 or :1253 today (15-scanner.json
// stops at :1270/:1227). GREEN adds two claims/15-scanner.json entries pinning :1242 and :1253.

import { describe, it, expect } from 'vitest'
import { loadClaims, coveredBy, type ProseCitation } from './audit/dossier-sweep'

const claims = loadClaims()

/** A single-line AMODE1 citation as the coverage checker wants it (basename + line range). */
function amode1(line: number): ProseCitation {
  return {
    file: 'AMODE1.SRC',
    start: line,
    end: line,
    raw: `defender/AMODE1.SRC:${line}`,
    from: 'df7-8-identity.test.ts',
  }
}

describe('df7-8 AC3 — the scanner PLAYER BLIP is cited under the df1-1 claims gate', () => {
  it('the 64-column scanner strip (AMODE1.SRC:1223) is claimed — already pinned by df5-1 (green anchor)', () => {
    // The player marker sits inside THIS strip; keep the width anchor covered so a failure of
    // the two df7-8 assertions below is the MISSING new claim, not a broken gate reader (proves
    // this file reads the claims, not a tautology — the df7-5-identity precedent).
    expect(
      coveredBy(claims, amode1(1223)),
      'df5-1 pinned the 64-column scanner strip at AMODE1.SRC:1223 (CMPA #(SCANER!>8)+64)',
    ).toBe(true)
  })

  it('the player-position source (LDD PLAXC, AMODE1.SRC:1242) is claimed', () => {
    // The ROM's *PLAYER BLIP OUTPUT (:1242) loads PLAXC — the player's fixed screen position —
    // and derives BOTH the marker's radar column (A>>4, :1243-1246) and row (B>>3, :1247-1249)
    // from it, with NO camera subtraction. That is the byte df7-8's camera-invariant marker
    // position is derived from; it must be pinned so the df1-1 gate byte-checks it. RED before
    // GREEN — no claim covers :1242 (15-scanner.json's world-path claims stop at OX16 :1260).
    expect(
      coveredBy(claims, amode1(1242)),
      'claims/15-scanner.json must pin AMODE1.SRC:1242 (LDD PLAXC — the player-blip position source)',
    ).toBe(true)
  })

  it('the player-marker value (LDD #$9099, AMODE1.SRC:1253) is claimed — index 9 WHITE', () => {
    // The marker written into the framebuffer is $9099 (:1253): palette index 9 (WHITE) in its
    // high nibble — the SAME index-9 white as the df7-5 bezel ($9090, :1227). Pin the operative
    // colour byte so the df1-1 gate byte-checks the value the code draws. RED before GREEN — no
    // claim covers :1253.
    expect(
      coveredBy(claims, amode1(1253)),
      'claims/15-scanner.json must pin AMODE1.SRC:1253 (LDD #$9099 — the WHITE index-9 player marker)',
    ).toBe(true)
  })
})
