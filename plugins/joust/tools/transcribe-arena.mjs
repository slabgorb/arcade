// tools/transcribe-arena.mjs
//
// Story jt1-4 (GREEN, Julia) — emits src/core/arena.ts from the vendored 1982
// Williams source. Same split as jt1-3: the DATA (constants and the two
// 240-entry scanline maps) is read from the source, and the LOGIC is
// transcribed branch for branch from the routines cited in each comment.
//
// Written from the source format; shares no code with the reader under
// tests/helpers/, which is the second entry of the transcription gate. The gate
// suite scans this file for such an import, so the module is not named here.
//
// ─── WHAT THIS FILE IS RESPONSIBLE FOR GETTING RIGHT ─────────────────────────
// Five of the story's own anchors were falsified before the tests were written;
// the amended laws are what gets transcribed here, and each one has a comment
// naming the routine and the branch it comes from:
//   1. WRAPX is ONE conditional subtract then ONE conditional add — not a
//      modulus. They agree for every velocity the game can produce (MAXVX = 8)
//      and diverge outside it, which is exactly how the wrong law ships green.
//   2. The ceiling NEGATES velocity exactly and only when already ascending
//      (BPL guard), then CLAMPS position to CEILNG<<8 unconditionally.
//   3. CLIF5's landing mask is $A0, matched with BITA — not a bare $20.
//   4. There are SEVEN dispatch outcomes; LNDB7 is the lava troll's grip.
//   5. LNDB2's author comment says CLIF3R but its constant is CLIF3U's band.
//      Follow the constant.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const TREE =
  process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')

const cache = new Map()
function lines(file) {
  if (!cache.has(file)) cache.set(file, readFileSync(join(TREE, file), 'utf8').split('\n'))
  return cache.get(file)
}

/** `$` hex, `@` octal, `%` binary, BARE = DECIMAL, with + and unary minus. */
function evalOperand(tok) {
  let total = 0
  for (const addend of tok.split('+')) {
    const t = addend.trim()
    let v
    if (t.startsWith('-')) v = -evalOperand(t.slice(1))
    else if (t.startsWith('$')) v = parseInt(t.slice(1), 16)
    else if (t.startsWith('@')) v = parseInt(t.slice(1), 8)
    else if (t.startsWith('%')) v = parseInt(t.slice(1), 2)
    else if (/^\d+$/.test(t)) v = parseInt(t, 10)
    else throw new Error(`unresolved operand term: ${t}`)
    total += v
  }
  return total
}

/** `SYMBOL EQU value` out of a vendored file. */
function equValue(file, symbol) {
  for (const line of lines(file)) {
    const m = line.match(new RegExp(`^${symbol}\\s+EQU\\s+(\\S+)`))
    if (m) return evalOperand(m[1])
  }
  throw new Error(`${symbol} EQU not found in ${file}`)
}

/** Read a 240-entry FCB scanline map starting at `startLine`. */
function readScanlineTable(file, startLine) {
  const src = lines(file)
  const out = []
  for (let n = startLine; out.length < 240; n++) {
    const m = src[n - 1]?.match(/^(?:[A-Z][A-Z0-9$_]*)?[ \t]+FCB[ \t]+(\S+)/)
    if (!m) break
    for (const tok of m[1].split(',')) out.push(evalOperand(tok) & 0xff)
  }
  if (out.length !== 240) throw new Error(`${file}:${startLine} yielded ${out.length} rows, want 240`)
  return out
}

/** The `LDB #$xxxx-1` snap-Y line for a landing handler. */
function snapYAt(file, line) {
  const m = lines(file)[line - 1]?.match(/LDB\s+#\$([0-9A-F]{4})-1/)
  if (!m) throw new Error(`${file}:${line} is not an LDB #$xxxx-1 line`)
  return parseInt(m[1], 16) - 1
}

const F = 'JOUSTRV4.SRC'
const anchor = (startLine, endLine = startLine) => ({ file: F, startLine, endLine })

const CEILING = equValue(F, 'CEILNG')
const FLOOR = equValue(F, 'FLOOR')
const ELEFT = equValue(F, 'ELEFT')
const ERIGHT = equValue(F, 'ERIGHT')

// ─── The six landing surfaces (LNDB0..LNDB5) ──────────────────────────────
// bit, snap-Y line, LNDYTB band top, the cliff records the surface serves.
// The band tops were read out of LNDYTB and are asserted against it below;
// every snapY is bandTop-1, i.e. the entity rests one pixel ABOVE the surface.
const PLATFORM_SPEC = [
  [0x01, 6729, 69, ['CLIF1L', 'CLIF1R'], 'LNDB0'],
  [0x02, 6735, 81, ['CLIF2'], 'LNDB1'],
  // LNDB2's author comment reads CLIF3R, but its constant $0081-1 = 128 puts it
  // one pixel above scanline 129 — CLIF3U's band. CLIF3R is at 138 and is
  // served by LNDB3. Follow the constant, not the comment.
  [0x04, 6741, 129, ['CLIF3U'], 'LNDB2'],
  [0x08, 6747, 138, ['CLIF3L', 'CLIF3R'], 'LNDB3'],
  [0x10, 6753, 163, ['CLIF4'], 'LNDB4'],
  [0x20, 6759, 211, ['CLIF5'], 'LNDB5'],
]

// ─── The eight BCKCOL cliff-side surfaces ─────────────────────────────────
// A DIFFERENT bit assignment from landing: eight bits with left and right
// SEPARATE, against landing's six with the pairs merged. Bit 4 is CLIF3L here
// and CLIF4 there — sharing one table between the mechanisms collides against
// the wrong geometry.
//
// BCKB3 and BCKB5 are byte-identical in the ROM: both dereference CLIF3R's
// collision pointer with CLIF3U's origin (202,129), even though CLIF3R sits at
// (254,138). Preserved as shipped — tidying it would silently change collision
// behaviour.
const BACKGROUND_SPEC = [
  [0x01, 'CLIF1L', -32, 69, 'CCLF1L', 6817, 6821],
  [0x02, 'CLIF1R', 252, 69, 'CCLF1R', 6856, 6860],
  [0x04, 'CLIF2', 86, 81, 'CCLF2', 6909, 6913],
  [0x08, 'CLIF3U', 202, 129, 'CCLF3R', 6873, 6876],
  [0x10, 'CLIF3L', -32, 138, 'CCLF3L', 6823, 6826],
  [0x20, 'CLIF3R', 202, 129, 'CCLF3R', 6862, 6865],
  [0x40, 'CLIF4', 106, 163, 'CCLF4', 6918, 6921],
  [0x80, 'CLIF5', 54, 211, 'CCLF5', 6903, 6906],
]

const LND_Y_TABLE = readScanlineTable(F, 7719)
const BCK_Y_TABLE = readScanlineTable(F, 7549)

const platforms = PLATFORM_SPEC.map(([bit, line, bandTop, cliffs, label]) => {
  const snapY = snapYAt(F, line)
  if (snapY !== bandTop - 1) {
    throw new Error(`${label}: snapY ${snapY} is not bandTop-1 (${bandTop - 1})`)
  }
  // The band height is MEASURED from LNDYTB, not assumed. Five surfaces are
  // thin 4-scanline ledges; CLIF5 is the bottom ISLAND and runs 17 scanlines
  // (211..227) — which is what its $A0 mask marks. Asserting a blanket 4 would
  // have recorded a false geometry for it.
  let bandHeight = 0
  while (LND_Y_TABLE[bandTop + bandHeight] & bit) bandHeight++
  if (bandHeight === 0) throw new Error(`${label}: LNDYTB carries no band at ${bandTop}`)
  if (LND_Y_TABLE[bandTop - 1] & bit) throw new Error(`${label}: row above the band carries the bit`)
  return { bit, snapY, bandTop, bandHeight, cliffs, anchor: anchor(line), label }
})

// ─── Emit ─────────────────────────────────────────────────────────────────
const anchorLit = (a) => `{ file: '${a.file}', startLine: ${a.startLine}, endLine: ${a.endLine} }`
const table = (rows) => {
  const out = []
  for (let i = 0; i < rows.length; i += 16) {
    out.push('  ' + rows.slice(i, i + 16).map((v) => v.toString()).join(', '))
  }
  return out.join(',\n')
}

const module_ = `// src/core/arena.ts
//
// Story jt1-4 (GREEN, Julia) — GENERATED by tools/transcribe-arena.mjs from the
// vendored 1982 Williams source. DO NOT HAND-EDIT.
//
// The arena: where an entity may be, what it lands on, and what kills it. This
// is the epic's first real simulation logic, so it is CORE — pure functions over
// plain numbers, no clock, no entropy, no browser surface, no shell import.
//
// ─── POSITION UNITS: X AND Y ARE NOT THE SAME FORMAT ─────────────────────────
// The two axes use DIFFERENT representations, and flattening them into one
// sentence is worse than saying nothing — the next author trusts it and
// symmetrises, which is the natural assumption and silently wrong.
//
//   Y is 16-bit pixel+fraction (8.8): 256 units = one pixel, whole pixel in the
//   high byte (ADDD PPOSY+1,U — JOUSTRV4.SRC:6494). The ROM compares only that
//   HIGH byte against CEILNG and FLOOR (CMPA #CEILNG), so every threshold below
//   is a WHOLE-PIXEL test on pos >> 8; comparing the full 16-bit value would be
//   wrong by up to a pixel at every boundary. applyCeiling and isLavaDeath take
//   Y in this form.
//
//   X is a 16-bit signed WHOLE-PIXEL count. Its sub-pixel accumulator lives in
//   the VELOCITY (ADDB PVELX+2,U / ADCA #0 — :6514-6516), not in the position,
//   so only whole pixels ever reach PPOSX. wrapX therefore takes and returns
//   whole-pixel X, and a fractional X is a caller bug rather than a value to
//   round silently.
//
// ─── DOMAIN: TOTAL INSIDE, THROWING OUTSIDE ──────────────────────────────────
// Every function here is total over its documented domain and THROWS outside
// it. The alternative — letting a NaN through — is far worse in a deterministic
// sim: it propagates for thousands of frames and surfaces as an unreproducible
// trajectory instead of a stack trace at the call that caused it.
//
// ─── FIVE LAWS THAT ARE NOT WHAT THEY LOOK LIKE ──────────────────────────────
// Each was verified against the source before it was written here; the story's
// original prose had all five differently.
//   1. The X wrap is NOT a modulus (see wrapX).
//   2. The ceiling CLAMPS position and negates velocity only when ascending.
//   3. CLIF5's landing mask is $A0, tested with BITA — not a bare $20.
//   4. The landing dispatch has SEVEN outcomes; the seventh is the lava troll.
//   5. LNDB2's author comment names the wrong cliff; its constant is right.

/** Where a constant came from: an inclusive line range in a vendored file. */
export interface SourceAnchor {
  file: string
  startLine: number
  endLine: number
}

/**
 * One landing surface. \`bandTop\`..\`bandTop+bandHeight-1\` are the scanlines
 * LNDYTB marks for it; \`snapY\` is the whole-pixel Y the entity is placed at.
 * Every band is 4 scanlines and every snapY is \`bandTop - 1\` — the entity rests
 * one pixel ABOVE the surface it stands on.
 */
export interface Platform {
  /** LNDXTB/LNDYTB mask bit. */
  bit: number
  snapY: number
  bandTop: number
  bandHeight: number
  /** Cliff records this surface belongs to, by jt1-3 label. Frozen: flight.ts
   * reads PLATFORMS every frame and an accidental write would corrupt every
   * subsequent entity silently, breaking determinism WITHIN a run. */
  cliffs: readonly string[]
  anchor: SourceAnchor
}

/** What CKGND's dispatch decides for a given mask value. */
export type GroundOutcome =
  | { kind: 'airborne' }
  | { kind: 'platform'; platform: Platform }
  /** LNDB7 — the lava troll's grip, gated on TTROLL. Behaviour lands in jt3. */
  | { kind: 'troll' }

/** One entry of the BCKCOL cliff-side collision path. */
export interface BackgroundSurface {
  /** BCKXTB/BCKYTB mask bit — NOT the landing table's assignment. */
  bit: number
  cliff: string
  /** \`LDD #n\` — the X origin the span walk starts from. */
  originX: number
  /** \`LDX #n\` — the cliff's top scanline. */
  originY: number
  /** jt1-3 collision-table label reached via \`LDY [cliff]\`. */
  collisionTable: string
  anchor: SourceAnchor
}

// ─── Bounds (JOUSTRV4.SRC:36-39) ────────────────────────────────────────────

/** \`CEILNG EQU $0020\` — highest position in the game. HEX. */
export const CEILING = 0x${CEILING.toString(16).padStart(2, '0')}
/** \`FLOOR EQU $00DF\` — lowest position in the game. HEX. */
export const FLOOR = 0x${FLOOR.toString(16)}
/** \`ELEFT EQU -10\` — extreme left of the wrap-around screen. DECIMAL. */
export const ELEFT = ${ELEFT}
/** \`ERIGHT EQU 292\` — extreme right of the wrap-around screen. DECIMAL. */
export const ERIGHT = ${ERIGHT}

/**
 * \`ERIGHT-ELEFT+1\` = ${ERIGHT - ELEFT + 1}, the correction step WRAPX applies at most once
 * in each direction. Derived from the bounds, never stated independently.
 */
export const WRAP_SPAN = ERIGHT - ELEFT + 1

/**
 * \`CMPA #FLOOR+7\` (JOUSTRV4.SRC:6508) — at or below this whole-pixel Y the
 * entity is swimming in the lava and dies.
 */
export const DEATH_Y = FLOOR + 7

// ─── Lava + bridge (JOUSTRV4.SRC:954-962, 1929-1933) ────────────────────────

/** \`LDA #$EA / STA SAFRAM\` (:962-963) — the wave-1 lava surface. HEX. */
export const LAVA_START = 0xea
/** \`CMPA #$E0 / BLS\` (:1930-1931) — the lava stops rising here. HEX. */
export const LAVA_MIN = 0xe0
/** \`SUBA #$5\` (:1932) — one step per wave. Rising lava means DEcreasing Y. */
export const LAVA_STEP = 5
/** \`LDA #3 / STA TBRIDGE\` (:954-955) — the wave that burns the bridge. DECIMAL. */
export const BRIDGE_WAVE = 3
/** \`LDA #1 / STA TTROLL\` (:956-957) — waves after the bridge until the troll. DECIMAL. */
export const TROLL_DELAY = 1

// ─── The six landing surfaces (LNDB0..LNDB5, JOUSTRV4.SRC:6728-6762) ────────

export const PLATFORMS: readonly Platform[] = Object.freeze([
${platforms
  .map(
    (p) =>
      `  // ${p.label} — ${p.cliffs.join(' & ')}. \`LDB #$${(p.snapY + 1).toString(16).padStart(4, '0').toUpperCase()}-1\`` +
      (p.label === 'LNDB2'
        ? '\n  // (the author comment here reads CLIF3R; the constant is CLIF3U\'s band — follow the constant)'
        : '') +
      `\n  Object.freeze({ bit: 0x${p.bit.toString(16).padStart(2, '0')}, snapY: ${p.snapY}, bandTop: ${p.bandTop}, bandHeight: ${p.bandHeight}, cliffs: Object.freeze([${p.cliffs.map((c) => `'${c}'`).join(', ')}]), anchor: ${anchorLit(p.anchor)} }),`,
  )
  .join('\n')}
])

// ─── The eight BCKCOL cliff-side surfaces (JOUSTRV4.SRC:6799-6921) ──────────
//
// open-questions §4 asked how far this path could be traced. All the way:
// BCKXTB/BCKYTB is a box broad-phase; on a hit BCKCOL dispatches on the mask,
// dereferences that cliff record's collision-span pointer (\`LDY [CLIF1L]\` — the
// tables jt1-3 transcribed) and walks it from an (originX, originY) origin.
//
// THE TRAP: this bit assignment is NOT the landing table's. Eight bits with
// left/right separate here, six with the pairs merged there. Bit 4 is CLIF3L
// here and CLIF4 there.

export const BACKGROUND_SURFACES: readonly BackgroundSurface[] = Object.freeze([
${BACKGROUND_SPEC.map(
  ([bit, cliff, originX, originY, ct, from, to]) =>
    `  Object.freeze({ bit: 0x${bit.toString(16).padStart(2, '0')}, cliff: '${cliff}', originX: ${originX}, originY: ${originY}, collisionTable: '${ct}', anchor: ${anchorLit(anchor(from, to))} }),`,
).join('\n')}
])

// ─── The scanline maps ──────────────────────────────────────────────────────

/** LNDYTB (JOUSTRV4.SRC:7719+) — one landing mask byte per scanline. */
export const LND_Y_TABLE: readonly number[] = Object.freeze([
${table(LND_Y_TABLE)},
])

/** BCKYTB (JOUSTRV4.SRC:7549+) — the SEPARATE background-collision map. */
export const BCK_Y_TABLE: readonly number[] = Object.freeze([
${table(BCK_Y_TABLE)},
])

// ─── Laws ───────────────────────────────────────────────────────────────────

/**
 * WRAPX (JOUSTRV4.SRC:7290-7298).
 *
 * ONE conditional subtract, then ONE conditional add — deliberately NOT a
 * modulus. \`CMPD #ERIGHT / BLE\` skips the subtract when x is in range, and
 * \`CMPD #ELEFT / BGE\` skips the add. Both comparisons are inclusive, so the
 * bounds themselves are legal positions.
 *
 * For every velocity the game can produce (\`MAXVX EQU 8\`, :40) this agrees with
 * \`((x - ELEFT) mod 303) + ELEFT\`, which is exactly why writing the modulus
 * would ship green. They diverge on large deltas, where the ROM applies its one
 * correction and stops — leaving x legally outside the range (600 -> 297, not -6).
 */
export function wrapX(x: number): number {
  // X is a WHOLE-PIXEL count — see the header. A fractional or NaN X is a
  // caller bug, and a deterministic sim must hear about it here rather than
  // thousands of frames later as an unreproducible trajectory.
  if (!Number.isInteger(x)) throw new TypeError(\`wrapX expects a whole-pixel X, got \${x}\`)
  let r = x
  if (r > ERIGHT) r -= WRAP_SPAN
  if (r < ELEFT) r += WRAP_SPAN
  return r
}

/**
 * The ceiling half of ADDGRX (JOUSTRV4.SRC:6497-6506).
 *
 * \`CMPA #CEILNG / BHI ADGCEI\` — nothing happens while the whole-pixel Y is
 * strictly above (numerically greater than) the ceiling. On contact:
 *   - \`LDD PVELY / BPL ADGDWN\` negates velocity ONLY when it is already upward.
 *     An entity descending through the band keeps its velocity; flipping it
 *     would fling it back up and trap it.
 *   - \`COMA / NEGB / SBCA #-1\` is exact 16-bit two's-complement negation —
 *     elastic means elastic, with no damping.
 *   - \`ADGDWN LDD #CEILNG*256\` runs unconditionally, so position is CLAMPED to
 *     exactly CEILING<<8 with the fraction zeroed, however far past the ceiling
 *     the step went. Mirroring the overshoot instead drifts from the ROM within
 *     a single frame.
 */
export function applyCeiling(
  posY: number,
  velY: number,
): { posY: number; velY: number; bumped: boolean } {
  if (!Number.isInteger(posY)) throw new TypeError(\`applyCeiling posY must be an integer, got \${posY}\`)
  if (!Number.isInteger(velY)) throw new TypeError(\`applyCeiling velY must be an integer, got \${velY}\`)
  if (posY >> 8 > CEILING) return { posY, velY, bumped: false }
  // Only when ascending, and wrapped to 16 bits so the negation is the 6809's.
  const velOut = velY < 0 ? ((-velY << 16) >> 16) : velY
  return { posY: CEILING << 8, velY: velOut, bumped: true }
}

/**
 * ADGCEI (JOUSTRV4.SRC:6508-6509): \`CMPA #FLOOR+7 / BHS ADGFLR\`. Unsigned
 * higher-or-same on the HIGH byte, so the test is at-or-below on whole pixels
 * and a deep fraction one pixel short does not kill.
 */
export function isLavaDeath(posY: number): boolean {
  if (!Number.isInteger(posY)) throw new TypeError(\`isLavaDeath posY must be an integer, got \${posY}\`)
  return (posY >> 8) >= DEATH_Y
}

const platformByBit = (bit: number): Platform => {
  const p = PLATFORMS.find((q) => q.bit === bit)
  if (!p) throw new Error(\`no platform for bit \${bit}\`)
  return p
}

/**
 * CKGND's dispatch (JOUSTRV4.SRC:6715-6726), branch for branch:
 *
 *   LND18  CMPA #\$08 / BLO LND13 / BEQ LNDB3
 *   LND47  CMPA #\$20 / BLO LNDB4 / BITA #\$20 / BNE LNDB5 / BRA LNDB7
 *   LND13  CMPA #\$02 / BEQ LNDB1 / BHI LNDB2   (falls through to LNDB0)
 *
 * Note the last step is a BIT test, not equality: LNDYTB never holds a bare
 * \$20 — CLIF5's band is \$A0 (bit 7 | bit 5). A dispatch written as
 * bit-per-platform equality misses CLIF5 entirely and drops entities through
 * the bottom island. Bit 7 WITHOUT bit 5 is the lava troll.
 */
export function groundOutcome(mask: number): GroundOutcome {
  // The mask is one byte, produced by ANDing the X and Y maps. Anything else is
  // a caller bug, including the 256/-1 off-by-one at the ends of the range.
  if (!Number.isInteger(mask) || mask < 0 || mask > 0xff) {
    throw new RangeError(\`groundOutcome expects a byte mask 0..255, got \${mask}\`)
  }
  const a = mask & 0xff
  if (a === 0) return { kind: 'airborne' }
  if (a < 0x08) {
    // LND13
    if (a === 0x02) return { kind: 'platform', platform: platformByBit(0x02) }
    if (a > 0x02) return { kind: 'platform', platform: platformByBit(0x04) }
    return { kind: 'platform', platform: platformByBit(0x01) }
  }
  if (a === 0x08) return { kind: 'platform', platform: platformByBit(0x08) }
  // LND47
  if (a < 0x20) return { kind: 'platform', platform: platformByBit(0x10) }
  if (a & 0x20) return { kind: 'platform', platform: platformByBit(0x20) }
  return { kind: 'troll' }
}

/**
 * LNDBn (JOUSTRV4.SRC:6728-6762): \`LDB #\$xx-1 / STB PPOSY+1,U / CLRA\`.
 *
 * Landing is a SNAP, not a resolve. The whole-pixel Y is ASSIGNED and the
 * fraction is cleared, so nothing about the entry position or velocity
 * survives — which is what makes it idempotent. Vertical motion stops.
 */
export function land(platform: Platform): { posY: number; velY: number } {
  return { posY: platform.snapY << 8, velY: 0 }
}

/**
 * SAFRAM's per-wave rise (JOUSTRV4.SRC:1929-1933): \`CMPA #\$E0 / BLS / SUBA #\$5\`.
 *
 * A five-unit step with a hard floor, not a two-value range: \$EA, \$E5, \$E0,
 * then it holds forever. Rising lava means DEcreasing Y, so the sequence is
 * monotonically non-increasing.
 */
export function lavaLevelForWave(wave: number): number {
  let level = LAVA_START
  for (let w = 2; w <= wave; w++) {
    if (level <= LAVA_MIN) break // BLS IWAVE2 — already at the top level
    level -= LAVA_STEP
  }
  return level
}

/**
 * TBRIDGE (JOUSTRV4.SRC:954-955, 1934-1936) is a countdown seeded at 3 and
 * decremented once per wave; the bridge burns when it reaches zero and stays
 * gone. The HOOK is this story's scope — what the destruction looks like is
 * jt3's.
 */
export function bridgeDestroyedOnWave(wave: number): boolean {
  return wave >= BRIDGE_WAVE
}
`

mkdirSync(join(repoRoot, 'src', 'core'), { recursive: true })
writeFileSync(join(repoRoot, 'src', 'core', 'arena.ts'), module_)

console.log(`CEILING=0x${CEILING.toString(16)} FLOOR=0x${FLOOR.toString(16)} ELEFT=${ELEFT} ERIGHT=${ERIGHT} span=${ERIGHT - ELEFT + 1}`)
console.log(`platforms: ${platforms.map((p) => `${p.label}=${p.snapY}`).join(' ')}`)
console.log(`LNDYTB nonzero rows: ${LND_Y_TABLE.filter((v) => v).length}, BCKYTB nonzero rows: ${BCK_Y_TABLE.filter((v) => v).length}`)
console.log('wrote src/core/arena.ts')
