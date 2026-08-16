// plugins/defender/tests/stars.test.ts
//
// Story df3-4 — RED phase (Tyr One-Handed / TEA). The parallax starfield:
// STINIT/STOUT ported line-for-line from the ROM at
// reference/original-source/defender/DEFA7.SRC + PHR6.SRC (ROM-always-wins), NOT a
// tidier re-derivation. Rides the df3-2 camera: the per-frame scroll is a function
// of the BGL − BGLX delta the world module already exposes.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/stars.ts does not exist yet. loadStars() throws a self-describing
// "not built yet" per test (the world.test.ts / purity.test.ts pattern), so a RED
// failure proves the FEATURE is absent — never a cryptic module-resolution trace.
//
// ─── THE ROM MODEL THIS SUITE PINS (verified against the vendored tree this session) ─
// STAR TABLE (defender/PHR6.SRC:536-548): SMAP is 16 records of SLGTH=4 bytes —
//   .SX(0) .SY(1) .SCOL(2) waster(3); SNUM EQU 16 (defender/PHR6.SRC:541) is the count.
//
// STINIT (defender/DEFA7.SRC:2073-2093) — seed the field:
//   • STRCNT ← 16 (LDB #16 / STB STRCNT, :2074-2075). The active count.
//   • Per star: RAND for X, rejected while ≥ $9C  → X ∈ [0, $9B]        (:2077-2080)
//               RAND for Y, rejected while > $A8 or ≤ YMIN → Y ∈ [YMIN+1, $A8] (:2081-2086)
//               SCOL ← B; then B ← (B + $11) AND $77                    (:2087-2089)
//     So the 16 colours are a fixed cycle 0,$11,$22,$33,$44,$55,$66,$77 repeating —
//     INDEPENDENT of the RNG (a clean deterministic pin). RAND is an INJECTED source
//     (the shell owns entropy; core stays clock/entropy-free — purity.test.ts).
//
// STOUT (defender/DEFA7.SRC:2095-2155) — scroll + composite each frame:
//   • The per-star X movement is derived from the camera delta (:2098-2108):
//       ITEMP = high byte of ((BGLX' − BGL') << 1), taken SIGNED, where X' keeps the
//       camera's high byte and bit 7 of its low byte (ANDB #$80). Stars move OPPOSITE
//       the camera (parallax): camera right ⇒ negative movement. (The low-byte mask is
//       output-invisible — only bit 7 can reach the result's high byte — so it is a
//       faithful note, not an observable.)
//   • Phase/colour mask (:2110-2116): LDB #$F0 / LDA BGL+1 / BITA #$40 / (COMB) —
//       mask = (BGL_low & $40) ? $F0 : $0F. ANDed into each star's colour before store.
//   • Edge wrap (:2135-2149): A = SX + movement (8-bit); if A ≥ $9C then
//       $9C ≤ A ≤ $C0 → 0 (walked off the RIGHT), A > $C0 → $9B (walked off the LEFT).
//   • The SMC store (:2151-2153): LDA SCOL / ANDA ITEMP2 / `FCB $A7,$98,$00 (STA [SX,X])`
//       — the `BSO BONER` self-modifying indexed store. Its CLEAN equivalent is
//       "write this star's colour INDEX into its framebuffer cell". Transcribe the
//       BEHAVIOUR; NO opcode bytes / FCB in src/core (AC4). The `LDB STRCNT / … DECB`
//       loop bounds the work to the active count (:2131,2154).
//     ENCODING NOTE (the streams-are-not-rasters cousin the story names): SCOL steps
//       by $11 AND $77, so every star colour is PALINDROMIC ($00,$11,…,$77 — high
//       nibble == low nibble). framebuffer.ts is ONE 4-bit index per cell (0..15), so
//       the star's index is `colour & $0F` (0..7); a raw `colour AND $F0` = $30 would
//       violate that contract. The phase mask ($F0/$0F) selects the star's NIBBLE /
//       sub-pixel column in the ROM's PACKED 2-pixels-per-byte display — it does NOT
//       change the index (both nibbles are equal). So drawStars writes the colour
//       index and phaseMask is kept a SEPARATE export the shell uses for the sub-pixel
//       phase. The packed→unpacked mapping is Dev's documented encoding decision
//       (Delivery Finding, this session).
//
// OUT OF SCOPE (context-story-df3-4.md): SBLNK star-blink (:2156-…), the STATUS-$20
// suppress branch (:2096), hyperspace scatter (df5). "Model the count, not the effect."
//
// ─── CONTRACT (what GREEN/Dev must build in src/core/stars.ts) ────────────────────
//   export const STAR_COUNT: 16                                  // SNUM (PHR6.SRC:541)
//   export interface Star { x: number; y: number; color: number }
//   export function starDelta(bgl: number, bglx: number): number // signed per-frame X move
//   export function phaseMask(bgl: number): number               // $F0 | $0F
//   export function scrollStarX(x: number, delta: number): number// 8-bit add + edge wrap
//   export function stepStars(stars, bgl, bglx, count?): Star[]   // scroll first `count`
//   export function initStars(rand: () => number): Star[]         // STINIT, injected RNG
//   export function drawStars(fb, stars, count?): void            // the SMC store, clean (index)
//
// AC5 (constants enrolled in claims/*.json, byte-verified by the citation gate) and
// AC (purity) are enforced by the EXISTING armed gates the moment stars.ts + its claim
// entries land (the world.test.ts / scheduler.test.ts precedent). GREEN must ENROLL
// the new constants (SNUM=16; the $9C/$C0/$9B wrap thresholds; $F0/$0F phase mask; the
// $11/$77 colour step; the SMC store) — e.g. docs/rom-study/claims/12-stars.json —
// which tests/audit/brief-dossier.test.ts then byte-verifies against the vendored tree.
// The one enrollment tooth below reddens THIS story if no star claim is filed at all.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createFramebuffer, type Framebuffer } from '../src/core/framebuffer.js'
import { loadClaims } from './audit/dossier-sweep.js'

interface Star {
  x: number
  y: number
  color: number
}

interface StarsModule {
  STAR_COUNT: number
  starDelta: (bgl: number, bglx: number) => number
  phaseMask: (bgl: number) => number
  scrollStarX: (x: number, delta: number) => number
  stepStars: (stars: readonly Star[], bgl: number, bglx: number, count?: number) => Star[]
  initStars: (rand: () => number) => Star[]
  drawStars: (fb: Framebuffer, stars: readonly Star[], count?: number) => void
}

async function loadStars(): Promise<StarsModule> {
  // Variable specifier (the terrain-blit.test.ts convention) so tsc does not TS2307 on
  // the not-yet-built module during RED; the runtime miss is caught + re-thrown below.
  const spec = ['..', 'src', 'core', 'stars.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ spec)) as Partial<StarsModule>
    for (const name of ['starDelta', 'phaseMask', 'scrollStarX', 'stepStars', 'initStars', 'drawStars'] as const) {
      if (typeof mod[name] !== 'function') throw new Error(`no \`${name}\` export`)
    }
    if (typeof mod.STAR_COUNT !== 'number') throw new Error('no numeric STAR_COUNT export')
    return mod as StarsModule
  } catch (e) {
    throw new Error(
      'src/core/stars.ts not built yet — GREEN (Dev) creates the pure parallax starfield ' +
        'ported from defender/DEFA7.SRC:2073-2155 + defender/PHR6.SRC:294,536-548: ' +
        'STAR_COUNT=16 (SNUM), starDelta(bgl,bglx) (STOUT camera-delta move, signed), ' +
        'phaseMask(bgl) ($F0 if BGL_low&$40 else $0F), scrollStarX(x,delta) (8-bit add + ' +
        'the $9C/$C0/$9B edge wrap), stepStars() (scroll the first `count` stars), ' +
        'initStars(rand) (STINIT: X∈[0,$9B], Y∈[YMIN+1,$A8], colour cycle $11&$77, INJECTED rng), ' +
        'and drawStars(fb,stars,count) (the clean equivalent of the BSO BONER SMC store: ' +
        'write each star colour INDEX (colour&$0F) into its cell — NO opcode bytes/FCB in src/core). ' +
        'Pure — no clock, no Date, no Math.random (purity.test.ts scans src/core). ' +
        'Enroll every new constant in claims/*.json (the citation gate byte-verifies). ' +
        `(${(e as Error).message})`,
    )
  }
}

// tests/stars.test.ts → the plugin root is one level up; src/core sits under it.
const coreDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core')

/** Read stars.ts source for the AC4 opcode/SMC scan, with a self-describing miss. */
function loadStarsSource(): string {
  const p = join(coreDir, 'stars.ts')
  if (!existsSync(p)) {
    throw new Error(
      'src/core/stars.ts not built yet — GREEN (Dev) creates it; this AC4 scan asserts the ' +
        'BSO BONER self-modifying store is ported as BEHAVIOUR (no FCB / opcode bytes) with a ' +
        'comment recording the SMC (defender/DEFA7.SRC:2151-2153).',
    )
  }
  return readFileSync(p, 'utf8')
}

describe('STAR_COUNT — the star table holds 16 records (SNUM EQU 16, defender/PHR6.SRC:541)', () => {
  it('STAR_COUNT === 16 (a re-radixed $16 == 22 would fail here)', async () => {
    const { STAR_COUNT } = await loadStars()
    expect(STAR_COUNT).toBe(16)
  })
})

describe('starDelta (STOUT :2098-2108) — the parallax move is a SIGNED function of BGL − BGLX', () => {
  it('no camera movement (bgl === bglx) yields no star movement', async () => {
    const { starDelta } = await loadStars()
    expect(starDelta(0x1234, 0x1234)).toBe(0)
  })

  it('camera moved LEFT by $80 (bglx=$80 → bgl=$00) moves stars +1 (parallax, opposite)', async () => {
    const { starDelta } = await loadStars()
    // BGLX'−BGL' = $0080 − $0000 = $80; <<1 = $0100; high byte = $01 → +1.
    expect(starDelta(0x0000, 0x0080)).toBe(1)
  })

  it('camera moved RIGHT by $100 moves stars −2; by $200, −4 (sign + the ×2 scaling)', async () => {
    const { starDelta } = await loadStars()
    // bgl=$0100, bglx=$0000: BGLX'−BGL' = −$100 = $FF00; <<1 = $FE00; hi = $FE = −2.
    expect(starDelta(0x0100, 0x0000)).toBe(-2)
    // bgl=$0200: −$200 = $FE00; <<1 = $FC00; hi = $FC = −4. A dropped `<<1` (would give −2) fails.
    expect(starDelta(0x0200, 0x0000)).toBe(-4)
  })

  it('a sub-bit-7 low-byte wiggle does not move the stars ($7F contributes nothing)', async () => {
    const { starDelta } = await loadStars()
    // Only bit 7 of the low byte can ever reach the result's high byte; $7F is below it.
    expect(starDelta(0x0000, 0x007f)).toBe(0)
  })
})

describe('phaseMask (STOUT :2110-2116) — $F0 when BGL bit 6 (low byte) is set, else $0F', () => {
  it('bit 6 set → $F0; bit 6 clear → $0F', async () => {
    const { phaseMask } = await loadStars()
    expect(phaseMask(0x0040)).toBe(0xf0) // $40: bit6 set
    expect(phaseMask(0x0000)).toBe(0x0f) // bit6 clear
  })

  it('reads bit 6 of the LOW byte only, across the full 16-bit camera', async () => {
    const { phaseMask } = await loadStars()
    expect(phaseMask(0x1234)).toBe(0x0f) // low $34, bit6 clear
    expect(phaseMask(0x1274)).toBe(0xf0) // low $74, bit6 set
  })
})

describe('scrollStarX (STOUT edge wrap :2135-2149) — 8-bit add then wrap, boundary-exact', () => {
  it('an interior star just advances: $50 + 1 → $51, and stays below the $9C edge', async () => {
    const { scrollStarX } = await loadStars()
    expect(scrollStarX(0x50, 1)).toBe(0x51)
    expect(scrollStarX(0x9a, 1)).toBe(0x9b) // $9B is the last on-screen column, kept
  })

  it('walking off the RIGHT edge ($9C..$C0) re-enters at 0', async () => {
    const { scrollStarX } = await loadStars()
    expect(scrollStarX(0x9b, 1)).toBe(0x00) // sum $9C → 0
    expect(scrollStarX(0x9b, 0x25)).toBe(0x00) // sum $C0 (inclusive boundary) → 0
  })

  it('walking off the LEFT edge (sum > $C0, e.g. an 8-bit underflow) re-enters at $9B', async () => {
    const { scrollStarX } = await loadStars()
    expect(scrollStarX(0x00, -1)).toBe(0x9b) // sum $FF → $9B
    expect(scrollStarX(0x9b, 0x26)).toBe(0x9b) // sum $C1 (one past $C0) → $9B, not 0
  })
})

describe('stepStars (the STOUT per-star loop) — scrolls the field by the camera delta, count-bounded', () => {
  it('every active star moves by starDelta; y and colour are untouched', async () => {
    const { stepStars, starDelta } = await loadStars()
    const stars: Star[] = [
      { x: 0x50, y: 0x60, color: 0x11 },
      { x: 0x10, y: 0x44, color: 0x22 },
      { x: 0x9b, y: 0x50, color: 0x33 },
    ]
    const delta = starDelta(0x0100, 0x0000) // −2
    const out = stepStars(stars, 0x0100, 0x0000)
    expect(delta).toBe(-2)
    expect(out.map((s) => s.x)).toEqual([0x4e, 0x0e, 0x99]) // each x scrolled by −2
    expect(out.map((s) => s.y)).toEqual([0x60, 0x44, 0x50]) // y unchanged
    expect(out.map((s) => s.color)).toEqual([0x11, 0x22, 0x33]) // colour unchanged
  })

  it('STRCNT/count governs how many stars are active — only the first `count` move', async () => {
    const { stepStars } = await loadStars()
    const stars: Star[] = [
      { x: 0x50, y: 0x60, color: 0x11 },
      { x: 0x10, y: 0x44, color: 0x22 },
      { x: 0x9b, y: 0x50, color: 0x33 },
    ]
    const out = stepStars(stars, 0x0100, 0x0000, 2) // count 2
    expect(out.map((s) => s.x)).toEqual([0x4e, 0x0e, 0x9b]) // the 3rd star is inactive → still $9B
  })
})

describe('initStars (STINIT :2073-2093) — 16 stars, ranged coords, the fixed colour cycle', () => {
  it('produces 16 stars whose colours cycle 0,$11..$77 regardless of the RNG', async () => {
    const { initStars, STAR_COUNT } = await loadStars()
    const stars = initStars(() => 0x50) // every RAND in range on first draw
    expect(stars).toHaveLength(STAR_COUNT)
    expect(stars.map((s) => s.color)).toEqual([
      0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77, 0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
    ])
    // The in-range RNG lands every X and Y directly.
    expect(stars.every((s) => s.x === 0x50 && s.y === 0x50)).toBe(true)
  })

  it('rejects out-of-range RAND draws: X ≥ $9C and Y ∉ (YMIN,$A8] are resampled', async () => {
    const { initStars } = await loadStars()
    // star 0: X rejects $9C (≥$9C), accepts $30; Y rejects $F0 (>$A8) and $2A (≤YMIN=42), accepts $60.
    const seq = [0x9c, 0x30, 0xf0, 0x2a, 0x60]
    let i = 0
    const rand = () => (i < seq.length ? seq[i++] : 0x50)
    const stars = initStars(rand)
    expect(stars[0]).toEqual({ x: 0x30, y: 0x60, color: 0x00 })
    expect(stars).toHaveLength(16)
  })
})

describe('drawStars (the BSO BONER SMC store :2151-2153, clean) — the colour INDEX into the cell', () => {
  it('writes the star colour index (colour & $0F) at its (x,y) cell, respecting the 4-bit contract', async () => {
    const { drawStars } = await loadStars()
    const fb = createFramebuffer(200, 200)
    drawStars(fb, [{ x: 10, y: 20, color: 0x33 }])
    expect(fb.data[20 * 200 + 10]).toBe(0x03) // $33 → index 3 (NOT $30 — that breaks the 0..15 cell)
    const fb2 = createFramebuffer(200, 200)
    drawStars(fb2, [{ x: 5, y: 7, color: 0x77 }])
    expect(fb2.data[7 * 200 + 5]).toBe(0x07) // $77 → index 7
  })

  it('writes at the star position, not the origin — a hardcoded (0,0) store fails', async () => {
    const { drawStars } = await loadStars()
    const fb = createFramebuffer(200, 200)
    drawStars(fb, [{ x: 12, y: 34, color: 0x22 }])
    expect(fb.data[34 * 200 + 12]).toBe(0x02)
    expect(fb.data[0]).toBe(0x00) // the origin cell is untouched
  })

  it('count bounds the store — an inactive star leaves its cell blank', async () => {
    const { drawStars } = await loadStars()
    const fb = createFramebuffer(200, 200)
    drawStars(
      fb,
      [
        { x: 1, y: 1, color: 0x11 },
        { x: 2, y: 2, color: 0x22 },
      ],
      1, // only the first star is active
    )
    expect(fb.data[1 * 200 + 1]).toBe(0x01) // drawn
    expect(fb.data[2 * 200 + 2]).toBe(0x00) // inactive → untouched
  })
})

describe('AC4 — the SMC store is ported as BEHAVIOUR, not opcodes (no FCB / opcode bytes in core)', () => {
  it('src/core/stars.ts contains no FCB / raw opcode transcription of the store', async () => {
    const src = loadStarsSource()
    // The `FCB $A7,$98,$00` bytes are the self-modifying store's ENCODING; the clean
    // port names none of them. (A comment quoting `BSO BONER` is allowed and expected —
    // this bans the assembler directive itself, which no TypeScript port needs.)
    expect(/\bFCB\b/.test(src), 'a clean port transcribes behaviour, never the FCB opcode bytes').toBe(false)
  })

  it('src/core/stars.ts records the SMC provenance in a comment (defender/DEFA7.SRC:2151-2153)', async () => {
    const src = loadStarsSource()
    expect(
      /BSO BONER|self-modif|2151/i.test(src),
      'AC4 wants a comment recording the self-modifying store and its clean equivalent',
    ).toBe(true)
  })
})

describe('AC5 — a star-table constant is enrolled in claims/*.json (byte-verified by the citation gate)', () => {
  it('GREEN files at least one star claim (e.g. SNUM EQU 16, defender/PHR6.SRC:541)', () => {
    // brief-dossier.test.ts runs checkClaims() over the WHOLE claims/ dir and byte-checks
    // each verbatim against the vendored tree; this only asserts a star claim EXISTS, so the
    // enrollment (not just the bytes) reddens THIS story until GREEN files it.
    const claims = loadClaims()
    // Match on the citation LOCATION, not the prose: `/star/i` also catches "Starting"
    // and "stars ride" in the world/ship claims (a false green). A claim cited into the
    // star table (PHR6.SRC:294 STRCNT / :536-548 SMAP) or STINIT/STOUT (DEFA7.SRC:2073-2155)
    // is unambiguously a star claim.
    const starClaim = claims.find((c) => {
      const s = c.source
      if (!('line' in s)) return false // byte-citations carry no line — not a star claim
      return (
        (s.file === 'PHR6.SRC' && (s.line === 294 || (s.line >= 536 && s.line <= 548))) ||
        (s.file === 'DEFA7.SRC' && s.line >= 2073 && s.line <= 2155)
      )
    })
    expect(
      starClaim,
      'no star claim yet — GREEN adds docs/rom-study/claims/12-stars.json enrolling SNUM/STRCNT/' +
        'the wrap thresholds/the phase mask; brief-dossier.test.ts then byte-verifies it',
    ).toBeDefined()
  })
})
