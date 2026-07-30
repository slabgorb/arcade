// tests/input.test.ts
//
// Story cp1-5 — RED phase (O'Brien / TEA). AC-4: the core input contract is
// device-agnostic COUNTS, and BOTH a pointer-lock mouse (trackball analog) and a
// keyboard fallback drive that same contract. This is the FIRST shell-side suite in
// the centipede repo — the core/shell purity boundary gets its two-sided exercise.
//
// ─── THE CONTRACT (who owns what) ────────────────────────────────────────────────
// • core/player.ts owns InputCounts { dh, dv, fire } — device-agnostic signed
//   trackball counts + a fire boolean. Core NEVER sees a device (purity.test.ts).
// • shell/input.ts owns the adapters that PRODUCE InputCounts:
//     - createMouseAdapter: pointer-lock 'mousemove' deltas (e.movementX/Y) →
//       aggregated counts; the trackball's hardware counters are read once per IRQ
//       (240x/s) and the shell aggregates them per frame (dossier / centiped.cpp:514).
//     - createKeyboardAdapter: arrow/WASD keys SYNTHESIZE counts at the clamp rate —
//       a held direction emits +/-TBLMT_LIMIT (8) each frame, so the gun runs at the
//       ROM's max 4 px/frame (TBLMT halves it — PS-7/8).
//   Both expose sample(): InputCounts and reset their per-frame accumulators.
//
// ─── NODE ENV — NO DOM ───────────────────────────────────────────────────────────
// vite/vitest runs these in `environment: 'node'`, so there is no window/document/
// MouseEvent. The adapters therefore take a DUCK-TYPED event target ({ addEventListener })
// and read plain event fields (movementX, key, …). makeBus() below is that target;
// it is the same fake-event idiom the sibling games' shell input tests use.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// Neither src/shell/input.ts nor src/core/player.ts exists yet; both loaders throw a
// self-describing "not built yet" so every test reddens for the FEATURE, not a
// module-resolution stack trace.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// A duck-typed EventTarget for node: register handlers, emit fake events. Events get a
// no-op preventDefault so an adapter may call it. Mirrors tempest/asteroids shell tests.
type Handler = (e: Record<string, unknown>) => void
interface Bus {
  addEventListener(type: string, cb: Handler): void
  // cp1-6 added dispose()/blur to the real adapters, which widened the shell's
  // internal target duck-type to require removeEventListener too — this suite
  // never calls dispose() or fires 'blur', so the no-op below only keeps the
  // shape honest for the module cast below; it changes no test behaviour.
  removeEventListener(type: string, cb: Handler): void
  emit(type: string, event?: Record<string, unknown>): void
}
function makeBus(): Bus {
  const handlers: Record<string, Handler[]> = {}
  return {
    addEventListener(type, cb) {
      ;(handlers[type] ||= []).push(cb)
    },
    removeEventListener(type, cb) {
      const list = handlers[type]
      if (!list) return
      const i = list.indexOf(cb)
      if (i !== -1) list.splice(i, 1)
    },
    emit(type, event = {}) {
      const e = { preventDefault() {}, ...event }
      ;(handlers[type] || []).forEach((cb) => cb(e))
    },
  }
}

// ─── the contracts GREEN implements ──────────────────────────────────────────────
interface InputCounts {
  dh: number
  dv: number
  fire: boolean
}
interface InputAdapter {
  sample: () => InputCounts
}
interface Player {
  h: number
  v: number
  hFrac: number
  vFrac: number
}
interface InputModule {
  /** counts a held key synthesizes each frame — the TBLMT clamp rate (8). */
  KEY_COUNT: number
  createMouseAdapter: (target: Bus) => InputAdapter
  createKeyboardAdapter: (target: Bus) => InputAdapter
}
interface PlayerModule {
  TBLMT_LIMIT: number
  createPlayer: () => Player
  movePlayer: (player: Player, counts: InputCounts) => Player
}

async function loadInput(): Promise<InputModule> {
  try {
    const mod = (await import('../src/shell/input')) as Partial<InputModule>
    if (typeof mod.createMouseAdapter !== 'function' || typeof mod.createKeyboardAdapter !== 'function') {
      throw new Error('module has no `createMouseAdapter` / `createKeyboardAdapter` export')
    }
    return mod as InputModule
  } catch (e) {
    throw new Error(
      'input shell adapters not built yet — GREEN (Julia) creates src/shell/input.ts ' +
        'exporting createMouseAdapter(target) and createKeyboardAdapter(target), each returning ' +
        '{ sample(): InputCounts }. Mouse aggregates pointer-lock movementX/Y into counts; ' +
        'keyboard synthesizes +/-KEY_COUNT (= core TBLMT_LIMIT) per held direction. ' +
        'The InputCounts type is imported from ../core/player (core owns the contract). ' +
        `(${(e as Error).message})`,
    )
  }
}

async function loadPlayer(): Promise<PlayerModule> {
  try {
    const mod = (await import('../src/core/player')) as Partial<PlayerModule>
    if (typeof mod.movePlayer !== 'function') throw new Error('module has no `movePlayer` export')
    return mod as PlayerModule
  } catch (e) {
    throw new Error(`player core module not built yet — see tests/player.test.ts. (${(e as Error).message})`)
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// The two adapters both PRODUCE the same InputCounts shape.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 input — both adapters emit the device-agnostic InputCounts contract', () => {
  it('mouse sample() returns { dh, dv, fire }', async () => {
    const input = await loadInput()
    const s = input.createMouseAdapter(makeBus()).sample()
    expect(s).toEqual({ dh: 0, dv: 0, fire: false })
  })

  it('keyboard sample() returns { dh, dv, fire, start }', async () => {
    const input = await loadInput()
    const s = input.createKeyboardAdapter(makeBus()).sample()
    // cp4-5 widened the keyboard adapter with the START1 port (Enter → start).
    // The mouse adapter above keeps { dh, dv, fire } — a trackball has no start.
    expect(s).toEqual({ dh: 0, dv: 0, fire: false, start: false })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Mouse: pointer-lock deltas aggregate into counts; sample() drains them.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 input — pointer-lock mouse adapter', () => {
  it('aggregates movementX across a frame into dh, and drains on sample()', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const mouse = input.createMouseAdapter(bus)
    bus.emit('mousemove', { movementX: 3, movementY: 0 })
    bus.emit('mousemove', { movementX: 4, movementY: 0 })
    const first = mouse.sample()
    // cp2-14 RE-PIN (sign, not magnitude): dh is the ROM's TB count, and a
    // POSITIVE count drives PLAYH toward 0xF4 — the cabinet's LEFT edge
    // (CENTI4.MAC:1505-1512). So a rightward device push (+movementX) is a
    // NEGATIVE dh, exactly as +movementY (downward) already becomes -dv. The
    // aggregation this test exists to pin is unchanged: 3 + 4 = 7 counts.
    expect(first.dh).toBe(-7) // 3 + 4 aggregated over the frame, ROM sign
    // sample() resets the accumulator — the next frame with no motion is zero
    expect(mouse.sample()).toEqual({ dh: 0, dv: 0, fire: false })
  })

  it('maps vertical movement to dv with a consistent sign (moving the mouse up is +dv)', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const mouse = input.createMouseAdapter(bus)
    bus.emit('mousemove', { movementX: 0, movementY: -5 }) // screen Y grows down; up = negative
    expect(mouse.sample().dv).toBeGreaterThan(0)
    bus.emit('mousemove', { movementX: 0, movementY: 5 })
    expect(mouse.sample().dv).toBeLessThan(0)
  })

  it('reflects the mouse button as fire', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const mouse = input.createMouseAdapter(bus)
    bus.emit('mousedown', { button: 0 })
    expect(mouse.sample().fire).toBe(true)
    bus.emit('mouseup', { button: 0 })
    expect(mouse.sample().fire).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Keyboard: held keys SYNTHESIZE counts at the clamp rate; opposite keys cancel.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 input — keyboard adapter (arrow / WASD fallback)', () => {
  it('KEY_COUNT is the core TBLMT clamp limit (a held key drives the gun at full speed)', async () => {
    const input = await loadInput()
    const player = await loadPlayer()
    expect(input.KEY_COUNT).toBe(player.TBLMT_LIMIT)
    expect(input.KEY_COUNT).toBe(8)
  })

  it('a held direction synthesizes +/-KEY_COUNT each frame until released', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const kbd = input.createKeyboardAdapter(bus)
    bus.emit('keydown', { key: 'ArrowRight' })
    // cp2-14 RE-PIN (sign): ArrowRight is a RIGHTWARD device push, so it
    // synthesizes -KEY_COUNT — the ROM count that drives PLAYH toward 0x0B, the
    // cabinet's RIGHT edge. Magnitude and the held/released lifecycle are
    // unchanged, which is what this test is for.
    expect(kbd.sample().dh).toBe(-input.KEY_COUNT)
    expect(kbd.sample().dh).toBe(-input.KEY_COUNT) // still held on the next frame
    bus.emit('keyup', { key: 'ArrowRight' })
    expect(kbd.sample().dh).toBe(0)
  })

  it('ArrowUp is +dv, ArrowDown is -dv (same sign convention as the mouse)', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const kbd = input.createKeyboardAdapter(bus)
    bus.emit('keydown', { key: 'ArrowUp' })
    expect(kbd.sample().dv).toBe(input.KEY_COUNT)
    bus.emit('keyup', { key: 'ArrowUp' })
    bus.emit('keydown', { key: 'ArrowDown' })
    expect(kbd.sample().dv).toBe(-input.KEY_COUNT)
  })

  it('opposite directions held together cancel to zero', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const kbd = input.createKeyboardAdapter(bus)
    bus.emit('keydown', { key: 'ArrowLeft' })
    bus.emit('keydown', { key: 'ArrowRight' })
    expect(kbd.sample().dh).toBe(0)
  })

  it('supports the WASD aliases and Space to fire', async () => {
    const input = await loadInput()
    const bus = makeBus()
    const kbd = input.createKeyboardAdapter(bus)
    bus.emit('keydown', { key: 'd' })
    expect(kbd.sample().dh).toBe(-input.KEY_COUNT) // cp2-14: 'd' == ArrowRight == ROM-negative
    bus.emit('keyup', { key: 'd' })
    bus.emit('keydown', { key: ' ' }) // Space
    expect(kbd.sample().fire).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// THE AC-4 POINT — mouse and keyboard both DRIVE THE SAME CORE. Feeding either
// adapter's counts through the one movePlayer moves the gun; and because the counts
// pass through the ONE TBLMT clamp in core, a full-speed key and a hard mouse flick
// converge to the same 4 px/frame — the devices differ, the contract does not.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp1-5 input — mouse and keyboard drive the identical core contract (AC-4)', () => {
  it('both adapters, through the same movePlayer, move the gun', async () => {
    const input = await loadInput()
    const player = await loadPlayer()

    const kbdBus = makeBus()
    const kbd = input.createKeyboardAdapter(kbdBus)
    kbdBus.emit('keydown', { key: 'ArrowRight' })

    const mouseBus = makeBus()
    const mouse = input.createMouseAdapter(mouseBus)
    mouseBus.emit('mousemove', { movementX: 20, movementY: 0 })

    const start = player.createPlayer()
    const viaKeyboard = player.movePlayer(start, kbd.sample())
    const viaMouse = player.movePlayer(start, mouse.sample())

    expect(viaKeyboard.h).not.toBe(start.h) // keyboard moved it
    expect(viaMouse.h).not.toBe(start.h) // mouse moved it
    // both drove the gun the SAME way (both saturate TBLMT at 4 px): identical result
    expect(viaKeyboard.h).toBe(viaMouse.h)
  })

  it('the core input contract lives in core, and no device surface leaks into it', () => {
    // core/player.ts owns InputCounts but must not NAME a device surface — mouse/key
    // handling belongs only to shell/input.ts. (Complements purity.test.ts, which bans
    // browser globals in core.) RED until the core module lands, green forever after.
    const corePlayer = join(root, 'src', 'core', 'player.ts')
    expect(
      existsSync(corePlayer),
      'src/core/player.ts must exist (GREEN builds it) — the InputCounts contract lives in core',
    ).toBe(true)
    const src = readFileSync(corePlayer, 'utf8')
    for (const token of ['movementX', 'movementY', 'mousemove', 'keydown', 'keyup', 'pointerlock', 'PointerEvent']) {
      expect(src, `core/player.ts must not reference the device surface "${token}"`).not.toContain(token)
    }
  })
})
