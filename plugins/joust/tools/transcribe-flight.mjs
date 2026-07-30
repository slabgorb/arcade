// tools/transcribe-flight.mjs
//
// Story jt1-5 (GREEN, Julia) — emits src/core/flight.ts from the vendored 1982
// Williams source. Same split as jt1-3/jt1-4: the DATA is read from the source,
// the LOGIC is transcribed branch for branch from the cited routines.
//
// Written from the source format; shares no code with the reader under
// tests/helpers/, which is the second entry of the transcription gate.
//
// ─── THE TWO STRUCTURAL TRAPS ────────────────────────────────────────────────
//  1. THE FLYX LABEL IS THE ZERO ENTRY, NOT THE TABLE START. Four entries sit
//     BEFORE it (JOUSTRV4.SRC:7150-7153) and the index is SIGNED — `LDA PVELX,U`
//     then `LDD A,X` with X = #FLYX, so index -8 reads FOUR WORDS BACK. A
//     transcription that treats FLYX as element 0 is wrong for every leftward
//     flight while reading like a perfectly sensible ladder. LNDXS3 is the same
//     shape, so this is a Williams house convention rather than a one-off.
//  2. X AND Y USE DIFFERENT POSITION FORMATS. Y is 8.8 pixel+fraction
//     (`ADDD PPOSY+1,U`). X is a 16-bit SIGNED WHOLE-PIXEL count whose sub-pixel
//     accumulator lives in the VELOCITY (`ADDB PVELX+2,U / ADCA #0`), not the
//     position. Symmetrising them is the natural assumption and it is wrong.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const TREE =
  process.env.JOUST_SOURCE_DIR ?? join(repoRoot, '..', '..', 'reference', 'williams-source', 'joust')

const cache = new Map()
const lines = (f) => {
  if (!cache.has(f)) cache.set(f, readFileSync(join(TREE, f), 'utf8').split('\n'))
  return cache.get(f)
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

const F = 'JOUSTRV4.SRC'
const src = lines(F)
const anchor = (a, b = a) => `{ file: '${F}', startLine: ${a}, endLine: ${b} }`

/** Read `count` bytes of FCB data starting at a line. */
function fcbBytes(startLine, count) {
  const out = []
  for (let n = startLine; out.length < count && n <= src.length; n++) {
    const m = src[n - 1].match(/^(?:[A-Z][A-Z0-9$_]*)?[ \t]+FCB[ \t]+(\S+)/)
    if (!m) continue
    for (const t of m[1].split(',')) out.push(evalOperand(t) & 0xff)
  }
  if (out.length !== count) throw new Error(`${startLine}: got ${out.length} bytes, want ${count}`)
  return out
}

// ─── FLYX: nine FDB words starting FOUR entries before the label ──────────
const FLYX = []
for (let n = 7150; FLYX.length < 9; n++) {
  const m = src[n - 1].match(/^(?:[A-Z][A-Z0-9$_]*)?[ \t]+FDB[ \t]+(\S+)/)
  if (!m) continue
  const v = evalOperand(m[1])
  FLYX.push(v < 0 ? v : v >= 0x8000 ? v - 0x10000 : v)
}
if (!/^FLYX\s+FDB\s+\$0000/.test(src[7153])) throw new Error('FLYX label is not on the zero entry')
if (FLYX[4] !== 0) throw new Error(`FLYX middle entry is ${FLYX[4]}, want 0`)

// ─── ORRUN deltas: the SECOND operand of each FCB ──────────────────────────
const ORRUN_DELTAS = []
for (let n = 7185; n <= 7189; n++) {
  const m = src[n - 1].match(/^(?:[A-Z][A-Z0-9$_]*)?[ \t]+FCB[ \t]+(\S+)/)
  if (m) ORRUN_DELTAS.push(evalOperand(m[1].split(',')[1]))
}

// ─── The ground state machine: the STATE macro rows ────────────────────────
const GROUND_STATES = []
for (let n = 7163; n <= 7175; n++) {
  const m = src[n - 1].match(/^([A-Z0-9]+)\s+STATE\s+(\S+)/)
  if (!m) continue
  const [wait, call, onMinus, onZero, onPlus, flyVel] = m[2].split(',')
  GROUND_STATES.push({
    id: m[1],
    wait: parseInt(wait, 10),
    call,
    onMinus,
    onZero,
    onPlus,
    flyVel: parseInt(flyVel, 10),
    line: n,
  })
}

// ─── FRCONV: landing speed → ground state ─────────────────────────────────
const FRCONV = []
for (let n = 6253; n <= 6257; n++) {
  const m = src[n - 1].match(/^(?:[A-Z0-9]+)?\s+FDB\s+(\S+)/)
  if (m) FRCONV.push(m[1])
}

// ─── The 352-byte X maps ──────────────────────────────────────────────────
const LND_X_TABLE = fcbBytes(7788, 352)
const BCK_X_TABLE = fcbBytes(7617, 352)

const GRAV = 4
const MAXVX = 8
if (!src[951].includes('#4')) throw new Error('JOUSTRV4.SRC:952 is not the GRAV init')
if (!/^MAXVX\s+EQU\s+8/.test(src[39])) throw new Error('MAXVX EQU 8 not at :40')
if (!src[6123].includes('-$0080')) throw new Error('STFLY takeoff impulse not at :6124')

const numList = (rows, per = 16) => {
  const out = []
  for (let i = 0; i < rows.length; i += per) out.push('  ' + rows.slice(i, i + per).join(', '))
  return out.join(',\n')
}

const module_ = `// src/core/flight.ts
//
// Story jt1-5 (GREEN, Julia) — GENERATED by tools/transcribe-flight.mjs from the
// vendored 1982 Williams source. DO NOT HAND-EDIT.
//
// The flight and ground model — the epic's payload. CORE: pure functions over
// plain numbers, no clock, no entropy, no browser surface, no shell import, and
// every function is a pure transform of the state handed in (AC-3 determinism
// depends on it).
//
// ─── TWO POSITION FORMATS, DELIBERATELY NOT SYMMETRIC ────────────────────────
// This is the trap that produces a plausible, wrong implementation:
//
//   Y is 8.8 fixed point — whole pixel in the high byte, fraction in the low
//   (\`ADDD PPOSY+1,U\`, JOUSTRV4.SRC:6494). \`posY >> 8\` is the pixel.
//
//   X is a 16-bit SIGNED WHOLE-PIXEL count. Its sub-pixel accumulator lives in
//   the VELOCITY (\`ADDB PVELX+2,U / ADCA #0\`, :6514-6516) — \`velXFrac\` here —
//   and only the carry reaches the position. \`posX\` is already a pixel.
//
// Making both 8.8 is the natural symmetry assumption. It is wrong, and it is
// why arena.wrapX takes whole pixels while arena.applyCeiling takes 8.8.
//
// ─── THE FLYX LADDER IS INDEXED FROM ITS MIDDLE ──────────────────────────────
// In the ROM the \`FLYX\` label sits on the ZERO entry with four entries BEFORE
// it (:7150-7153), and the index is signed: \`LDA PVELX,U / LDD A,X\` with
// X = #FLYX reads backwards for a negative index. The array below is stored in
// index order −8..+8, so the ladder rung for index i is \`FLYX[i / 2 + 4]\`.
// Storing nine entries forward from the label would be wrong for every leftward
// flight. (LNDXS3 is the same zero-point-label shape — a house convention.)

import { LND_Y_TABLE } from './arena.js'

/** Where a constant came from: an inclusive line range in a vendored file. */
export interface SourceAnchor {
  file: string
  startLine: number
  endLine: number
}

/**
 * The device-agnostic per-player input contract (\`P2NJMP\`, JOUSTRV4.SRC:7261-7263).
 *
 * The ROM normalises two joystick bits with \`ANDA #\$03 / ASRA / SBCA #0\`,
 * mapping raw 0→0, 1→−1, 2→+1 and — notably — 3→0: BOTH directions held is
 * neutral, not "last pressed wins". \`flap\` is the release→press EDGE; the shell
 * owns debouncing, core sees only the edge.
 */
export interface PlayerInput {
  dir: -1 | 0 | 1
  flap: boolean
  flapHeld: boolean
}

/** An entity's flight/ground state. Positions per the note above. */
export interface EntityState {
  posX: number
  posY: number
  velXIndex: number
  velXFrac: number
  velY: number
  timeUp: number
  groundState: string | null
  plantZ: number
  airborne: boolean
  /**
   * \`PFRAME\` — the run-animation phase, cycling 4 -> 3 -> 2 -> 1 -> 4
   * (\`RUNR\`, :7191-7196). \`ORRUN_DELTAS\` is indexed BY this, which is what
   * makes the gait uneven (3,2,1,2 px). Without it there is nothing to index by,
   * and a constant delta is the signature of a stub.
   */
  animPhase?: number
}

/** One row of the ground state machine (the \`STATE\` macro, :7160-7180). */
export interface GroundState {
  id: string
  wait: number
  call: string
  onMinus: string
  onZero: string
  onPlus: string
  flyVel: number
  anchor: SourceAnchor
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** \`LDA #4 / STA GRAV\` (JOUSTRV4.SRC:952-953). DECIMAL. The BASE of the pair. */
export const GRAV = ${GRAV}
/** Flap button HELD — \`CLRB\`, no offset (:6170). This is the glide. */
export const GRAVITY_WINGS_DOWN = GRAV
/** Flap button RELEASED — \`LDB #\$04\` offset (:6197). HEX offset, decimal sum. */
export const GRAVITY_WINGS_UP = GRAV + 4
/** \`MAXVX EQU 8\` (:40). DECIMAL. The FLYX index bound — see flap()'s rejection note. */
export const MAX_VEL_X_INDEX = ${MAXVX}
/** \`LDD #-\$0080\` (\`STFLY\`, :6124). HEX. Initial VY on a flap takeoff. */
export const TAKEOFF_VEL_Y = -0x0080
/** \`ORRUN\` per-frame X deltas, the second FCB operand of each row (:7185-7189). DECIMAL. */
export const ORRUN_DELTAS: readonly number[] = Object.freeze([${ORRUN_DELTAS.join(', ')}])
/** \`LDD #SKID*256+2\` (:7242) — the skid frame's X delta. DECIMAL. */
export const SKID_DELTA = 2
/** \`LDB #2 / STB PLANTZ,U\` (:6071-6072) — a skidding mount sits 2px lower. jt2 consumes it. */
export const SKID_PLANT_Z = 2

/**
 * The nine FLYX entries in INDEX order −8..+8 (:7150-7158). 256 units = 1 px/frame,
 * so the ladder is ±{2.0, 1.0, 0.5, 0.25, 0}. HEX in the source, signed 16-bit.
 * Index i maps to \`FLYX[i / 2 + 4]\` — zero is in the MIDDLE, not at the start.
 */
export const FLYX: readonly number[] = Object.freeze([${FLYX.map((v) => (v < 0 ? `-0x${(-v).toString(16).padStart(4, '0')}` : `0x${v.toString(16).padStart(4, '0')}`)).join(', ')}])

/** \`FRCONV\` (:6253-6257) — landing speed selects the ground state. */
export const FRCONV: readonly string[] = Object.freeze([${FRCONV.map((s) => `'${s}'`).join(', ')}])

/** The ground state machine (\`STATE\` rows, :7163-7175). */
export const GROUND_STATES: Readonly<Record<string, GroundState>> = Object.freeze({
${GROUND_STATES.map(
  (s) =>
    `  ${s.id}: Object.freeze({ id: '${s.id}', wait: ${s.wait}, call: '${s.call}', onMinus: '${s.onMinus}', onZero: '${s.onZero}', onPlus: '${s.onPlus}', flyVel: ${s.flyVel}, anchor: ${anchor(s.line)} }),`,
).join('\n')}
})

// ─── The landing / background X maps ────────────────────────────────────────
//
// \`LNDXS1\` (:7787) is ONE contiguous 352-byte table covering CRT pixel −\$20
// through \$13F — NOT a family of per-wave variants. \`LNDXS3\` (:7799) is a LABEL
// INTO it at the zero point (the same shape as FLYX) and \`LNDXS2\` (:7879) is the
// END MARKER. Confirmed by the RAM declarations: \`LNDXD1\` \$20 + \`LNDXTB\` \$140
// = 352 bytes exactly (RAMDEF.SRC:376-378).
//
// The per-wave variance lives entirely in RAM mutation, not in the ROM table:
// the wave init below, and a per-cliff create/destroy read-modify-write
// (:2341-2352) that is wave-machine scope and only ever REMOVES bits — so
// nothing transcribed here becomes wrong when that lands.

/** The index origin: \`LND_X_TABLE[x + X_TABLE_ORIGIN]\` is the mask for pixel x. */
export const X_TABLE_ORIGIN = 32

/** ROM \`LNDXS1\` (:7788+), 352 bytes, index 0 = CRT pixel −32. */
export const LND_X_TABLE: readonly number[] = Object.freeze([
${numList(LND_X_TABLE)},
])

/** ROM \`BCKXS1\` (:7617+), 352 bytes, same origin. */
export const BCK_X_TABLE: readonly number[] = Object.freeze([
${numList(BCK_X_TABLE)},
])

/**
 * The wave-1 landing mask for a pixel X — the ROM table with the wave init's
 * \`ORA #\$20\` applied (\`LNDXUP\`, :987-989, *"FOR NOW, CLIFF 5 LANDS AT ALL
 * POINTS"*). Omitting that OR makes the bottom island unlandable outside its own
 * X span, which shows up as entities falling through the world.
 *
 * Outside the table's range there is no ground: the ROM's RAM buffer simply does
 * not extend there, and an entity that far off-screen has already wrapped.
 */
export function landMaskAtX(x: number): number {
  if (!Number.isInteger(x)) throw new TypeError(\`landMaskAtX expects a whole pixel, got \${x}\`)
  const i = x + X_TABLE_ORIGIN
  if (i < 0 || i >= LND_X_TABLE.length) return 0
  return LND_X_TABLE[i] | 0x20
}

/**
 * \`LNDXTB[x] & LNDYTB[y]\` (\`CKGND\`, :6705-6706) — the (x,y) → mask step jt1-4
 * defined a dispatch for but could not supply the input to.
 */
export function groundMaskAt(x: number, y: number): number {
  if (!Number.isInteger(y)) throw new TypeError(\`groundMaskAt expects a whole scanline, got \${y}\`)
  if (y < 0 || y >= LND_Y_TABLE.length) return 0
  return landMaskAtX(x) & LND_Y_TABLE[y]
}

// ─── Flight ─────────────────────────────────────────────────────────────────

const assertInt = (v: number, what: string): void => {
  if (!Number.isInteger(v)) throw new TypeError(\`\${what} must be a whole number, got \${v}\`)
}

/** Sign-extend an 8-bit value — the 6809's \`SEX\` (:7290). */
const sex8 = (v: number): number => ((v & 0xff) << 24) >> 24

/** Exact 16-bit two's-complement wrap, so long trajectories match the ROM. */
const int16 = (v: number): number => ((v & 0xffff) << 16) >> 16

/**
 * Apply one flap edge (\`ADDFLP\`, :6429-6448). A no-op unless \`input.flap\` is
 * set — the edge is the shell's to detect.
 *
 * VERTICAL: \`LDB PTIMUP / LDA #256*96/255 / MUL / TFR A,B / CLRA / SUBD #96\`
 * gives ΔVY = ((timeUp × 96) >> 8) − 96, which is ADDED to the existing
 * velocity. A long climb yields a WEAKER impulse — hovering costs you lift, and
 * that decay is the mechanic the whole game rests on.
 *
 * HORIZONTAL: the joystick contributes ±2 to the index, and the result is
 * REJECTED, not clamped. \`BGT ADXMX2\` / \`BLT ADXMX2\` return WITHOUT storing, so
 * an over-range result leaves the index completely unchanged — a player at +8
 * who flaps right STAYS at +8, and the top rung is reachable only from exactly
 * one rung below. A saturating implementation looks similar and is wrong.
 * (The ROM's own comments on those two branches are inverted. Trust the branches.)
 *
 * The rejection is HORIZONTAL ONLY — a rejected flap still lifts.
 */
export function flap(state: EntityState, input: PlayerInput): EntityState {
  if (!input.flap) return state
  assertInt(state.timeUp, 'timeUp')
  assertInt(state.velY, 'velY')

  const impulse = ((state.timeUp * 96) >> 8) - 96
  const candidate = state.velXIndex + input.dir * 2
  const accepted =
    candidate >= 0 ? candidate <= MAX_VEL_X_INDEX : candidate >= -MAX_VEL_X_INDEX

  return {
    ...state,
    velY: int16(state.velY + impulse),
    velXIndex: accepted ? candidate : state.velXIndex,
  }
}

/**
 * Advance one frame of flight (\`ADDGRA\`/\`ADDGRX\`, :6489-6518).
 *
 * Gravity is added to VY, then VY is added to the 8.8 Y position. Horizontally
 * the FLYX word's LOW byte accumulates into \`velXFrac\` and only the CARRY plus
 * the sign-extended HIGH byte reach \`posX\` — which is what makes the shallow
 * rungs move a pixel every few frames rather than every frame.
 *
 * There is NO air drag and NO terminal velocity. Both are cited negative claims:
 * the FLYX index is STATE, not a decaying velocity, and gravity accumulates
 * without a cap until the floor or ceiling intervenes.
 */
export function stepFlight(state: EntityState, input: PlayerInput): EntityState {
  assertInt(state.posX, 'posX')
  assertInt(state.posY, 'posY')
  assertInt(state.velY, 'velY')
  assertInt(state.velXFrac, 'velXFrac')

  const gravity = input.flapHeld ? GRAVITY_WINGS_DOWN : GRAVITY_WINGS_UP
  const velY = int16(state.velY + gravity)
  const posY = state.posY + velY

  const rung = FLYX[state.velXIndex / 2 + 4]
  if (rung === undefined) throw new RangeError(\`velXIndex \${state.velXIndex} is off the ladder\`)
  const sum = state.velXFrac + (rung & 0xff)
  const velXFrac = sum & 0xff
  const whole = sex8(((rung >> 8) & 0xff) + (sum >> 8))

  return { ...state, posX: state.posX + whole, posY, velY, velXFrac }
}

/**
 * \`AIRTIM\` (:6476-6478): \`INC / BNE / DEC\` — saturate at 255, never wrap.
 * Wrapping would hand a fully-spent flapper a brand-new full-strength impulse.
 */
export function tickTimeUp(timeUp: number): number {
  assertInt(timeUp, 'timeUp')
  return timeUp >= 255 ? 255 : timeUp + 1
}

// ─── Ground ─────────────────────────────────────────────────────────────────

/**
 * One frame of ground movement: the STATE row's transition for the joystick
 * direction, plus the X delta.
 *
 * LIMITATION, stated rather than hidden: the ROM selects its per-frame delta
 * from \`ORRUN\` indexed by \`PFRAME\` (:7191-7196), the run-animation phase.
 * \`EntityState\` carries no such field, so the full 4→3→2→1→4 cycle cannot be
 * represented here; a skid uses SKID_DELTA and everything else uses the run
 * cycle's entry delta. Recorded as a Delivery Finding — the animation phase
 * belongs in the entity state before ground movement can be exact.
 */
export function stepGround(state: EntityState, input: PlayerInput): EntityState {
  const current = state.groundState === null ? null : GROUND_STATES[state.groundState]
  if (!current) return state
  // The ROM's transitions are FACING-relative: it compares CURJOY against
  // PFACE, so onPlus means "with your facing" and onMinus means "against it"
  // (the reversal / skid path). EntityState carries no facing field, so a
  // non-zero direction is read as forward and the sign only drives the delta.
  // CONSEQUENCE, stated rather than hidden: onMinus is unreachable here, so the
  // reversal chain cannot be entered. Adding facing to EntityState is the fix —
  // the same shape of gap the missing animPhase was.
  const nextId = input.dir !== 0 ? current.onPlus : current.onZero
  const next = GROUND_STATES[nextId]
  if (!next) throw new RangeError(\`\${current.id} names an unknown state \${nextId}\`)

  // RUNR (:7191-7196): LDB PFRAME / BLE RUNRST / DECB / BGT RUNFRM / LDB #4.
  // A phase at or below zero is "starting to run" and enters at 1; otherwise
  // decrement, wrapping past zero back to 4. So the cycle is 4,3,2,1,4,...
  const phase = state.animPhase ?? 0
  const nextPhase = phase <= 0 ? 1 : phase - 1 > 0 ? phase - 1 : 4

  // ORRUN (:7185-7189) is indexed BY the phase: index 1 -> 3px, 2 -> 2px,
  // 3 -> 1px, 4 -> 2px. One full cycle is 3+2+1+2 = 8px per 4 frames, so forty
  // held frames is exactly ten cycles = eighty pixels. A constant per-frame
  // delta would travel a plausible distance while erasing the ROM's gait.
  const running = next.call === 'RUNR' || next.call === 'RUNSR'
  const skidding = next.call === 'SKIDR'
  const delta = skidding ? SKID_DELTA : running ? ORRUN_DELTAS[nextPhase] : 0

  return {
    ...state,
    groundState: next.id,
    animPhase: running ? nextPhase : 0,
    posX: state.posX + delta * input.dir,
    plantZ: skidding ? SKID_PLANT_Z : state.plantZ,
  }
}

/**
 * Flap-initiated takeoff (\`STFLY\`, :6123-6128): VY = −\$0080, then
 * \`DEC PPOSY+1,U\` lifts one WHOLE pixel to clear the landing band, and both
 * sub-pixel fractions are cleared. Without the lift the entity re-lands on the
 * same frame it took off.
 */
export function takeOff(state: EntityState): EntityState {
  return {
    ...state,
    velY: TAKEOFF_VEL_Y,
    posY: ((state.posY >> 8) - 1) << 8,
    velXFrac: 0,
    airborne: true,
    groundState: null,
  }
}

/**
 * Walking off an edge (\`STFALL\`, :6139-6151): VY = 0 and the fractions cleared,
 * but NO lift. The entity simply stops being supported — which is what makes
 * stepping off a ledge feel different from jumping.
 */
export function walkOff(state: EntityState): EntityState {
  return {
    ...state,
    // Without this a saturated glide walks off with timeUp 255 and the next
    // flap lifts by -1 instead of -96. Also from the jt1-5 review reversal.
    timeUp: 0,
    velY: 0,
    posY: (state.posY >> 8) << 8,
    velXFrac: 0,
    airborne: true,
    groundState: null,
  }
}

/**
 * Landing (\`FRCONV\`, :6253-6257): the incoming horizontal speed selects the
 * ground state — standing at rest, through four running speeds. The Y snap
 * itself is the arena's (\`LNDBn\`), so this takes the platform's snapY as given.
 *
 * \`PTIMUP\` resets here and ONLY here: it never resets in flight, so a long
 * glide's spent impulse is only restored by touching down.
 */
export function land(state: EntityState, platform: { snapY: number }): EntityState {
  const speed = Math.min(Math.abs(state.velXIndex) / 2, FRCONV.length - 1)
  return {
    ...state,
    posY: platform.snapY << 8,
    velY: 0,
    velXFrac: 0,
    // STLDIR writes LDA #1 — the ROM's MINIMUM DOWN TIME, not zero. Restored
    // from the jt1-5 review reversal (0ff5591) after the generator, which
    // predates that hotfix, regenerated over it in jt1-6.
    timeUp: 1,
    airborne: false,
    animPhase: 0,
    groundState: FRCONV[speed],
  }
}
`

mkdirSync(join(repoRoot, 'src', 'core'), { recursive: true })
writeFileSync(join(repoRoot, 'src', 'core', 'flight.ts'), module_)

console.log(`FLYX (index order): ${FLYX.join(', ')}`)
console.log(`ORRUN deltas: ${ORRUN_DELTAS.join(', ')} | FRCONV: ${FRCONV.join(', ')}`)
console.log(`ground states: ${GROUND_STATES.length} | LND_X ${LND_X_TABLE.length} | BCK_X ${BCK_X_TABLE.length}`)
console.log('wrote src/core/flight.ts')
