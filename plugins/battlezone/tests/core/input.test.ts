// tests/core/input.test.ts
//
// Story bz1-4 — RED phase (Furiosa / TEA). The core Input contract for tank
// movement.
//
// The pure core reads only ABSTRACT tread axes — never a key code (the epic's
// non-negotiable core/shell boundary: the shell maps devices to this shape).
// This story adds the two differential-drive tread axes and a NO_INPUT
// zero-constant (the star-wars house idiom, src/core/input.ts). Firing (bz1-5)
// will EXTEND Input with a fire axis; these tests pin only the tread axes, so
// that later extension stays non-breaking.
//
// RED: input.ts does not exist yet — the module load is itself the first
// assertion of the contract.

import { describe, it, expect } from 'vitest'

/** The contract movement's Input must satisfy (declared here; RED: not built). */
interface Input {
  readonly leftTread: number
  readonly rightTread: number
}
interface InputModule {
  NO_INPUT: Input
}

async function loadInput(): Promise<InputModule> {
  let m: Partial<InputModule> = {}
  try {
    // RED contract load: input.ts is not built yet. A dynamic import + declared
    // shape keeps a missing module/export a clean per-test contract failure
    // instead of a collection-time crash (bz1-2/bz1-3 house pattern).
    m = (await import('../../src/core/input')) as unknown as Partial<InputModule>
  } catch {
    // module not built yet — the assertions below report the precise miss
  }
  if (!m.NO_INPUT) {
    throw new Error('CONTRACT: src/core/input.ts must export NO_INPUT: Input { leftTread, rightTread }')
  }
  return m as InputModule
}

describe('core Input — differential-drive tread axes', () => {
  it('exports NO_INPUT with both treads neutral (zero)', async () => {
    const { NO_INPUT } = await loadInput()
    expect(typeof NO_INPUT.leftTread).toBe('number')
    expect(typeof NO_INPUT.rightTread).toBe('number')
    expect(NO_INPUT.leftTread).toBe(0)
    expect(NO_INPUT.rightTread).toBe(0)
  })

  it('NO_INPUT is a self-consistent Input (a valid neutral frame)', async () => {
    const { NO_INPUT } = await loadInput()
    const frame: Input = { leftTread: NO_INPUT.leftTread, rightTread: NO_INPUT.rightTread }
    expect(frame).toEqual({ leftTread: 0, rightTread: 0 })
  })
})
