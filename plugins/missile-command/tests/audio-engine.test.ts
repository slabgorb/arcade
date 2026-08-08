// plugins/missile-command/tests/audio-engine.test.ts
//
// Story mc8-2 — RED phase (O'Brien / TEA). The audio ENGINE surface and its
// wiring into the frame loop (AC1: "src/shell/audio.ts drives the POKEY core
// from the lifted sound commands and is reachable from main.ts").
//
// WHAT node CAN and CANNOT prove here (project memory — "node env cannot guard
// DOM branches"): vitest runs under node with no `AudioContext`/`AudioWorklet`,
// so the live POKEY-worklet render path is UNREACHABLE in this suite and any
// assertion about produced samples would be vacuous. What IS real and testable
// is the engine's PUBLIC command surface and its NO-THROW contract: the shell
// runs `play()/startLoop()/stopLoop()` inside main.ts's frame() ABOVE the
// requestAnimationFrame re-schedule, so a throw there freezes render+input, not
// just sound (battlezone SH2-18). The engine must therefore degrade to silent
// no-ops when there is no live context — which is exactly the node case. The
// lifted §3 tables and the MODSND envelope math are verified by the citation
// gate (citations*.test.ts) against W3SOUN, not re-pinned here.
//
// Reachability (AC1) is proven by SOURCE-TEXT wiring (the tempest render.ts?raw
// idiom): main.ts must construct the engine and drain GameState.soundEvents into
// the dispatch each frame. That proves the seam is wired without booting a canvas.
//
// RED today: src/shell/audio.ts is absent, and main.ts has no audio wiring —
// the import fails to load and the source-text checks fail until GREEN.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createAudioEngine } from '../src/shell/audio.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── AC1: the engine exposes the command surface the dispatch consumes ────────
describe('createAudioEngine — the POKEY command surface', () => {
  it('exposes resume + the play/startLoop/stopLoop surface the dispatch calls', () => {
    const engine = createAudioEngine()
    expect(typeof engine.resume).toBe('function')
    expect(typeof engine.play).toBe('function')
    expect(typeof engine.startLoop).toBe('function')
    expect(typeof engine.stopLoop).toBe('function')
  })
})

// ─── AC1: the NO-THROW contract (degrade silently — contract 5) ───────────────
describe('createAudioEngine — silent no-op when there is no live context (no-throw)', () => {
  it('constructs without touching AudioContext (lazy gesture gate)', () => {
    // Building the engine must not require a context — it is wired to a gesture
    // and stood up lazily (the @shared/synth pattern). In node that means it
    // simply must not throw at construction.
    expect(() => createAudioEngine()).not.toThrow()
  })

  it('every command is a harmless no-op before any gesture / with no context', () => {
    const engine = createAudioEngine()
    expect(() => engine.play('explosion')).not.toThrow()
    expect(() => engine.play('launch')).not.toThrow()
    expect(() => engine.startLoop('drone')).not.toThrow()
    expect(() => engine.stopLoop('drone')).not.toThrow()
  })

  it('resume() is idempotent and never throws in a context-less env', () => {
    const engine = createAudioEngine()
    expect(() => {
      engine.resume()
      engine.resume()
    }).not.toThrow()
  })

  it('a stop with nothing running, and a double stop, are harmless', () => {
    const engine = createAudioEngine()
    expect(() => {
      engine.stopLoop('drone')
      engine.stopLoop('drone')
    }).not.toThrow()
  })
})

// ─── AC1: reachable from main.ts — the frame loop drains the channel ──────────
describe('main.ts wires the audio seam into the frame loop (reachability)', () => {
  const mainSrc = readFileSync(join(root, 'src', 'main.ts'), 'utf8')

  it('constructs the engine from src/shell/audio', () => {
    expect(mainSrc, 'main.ts must import the audio engine').toMatch(/from\s+['"]\.\/shell\/audio(\.js)?['"]/)
    expect(mainSrc, 'main.ts must build the engine').toMatch(/createAudioEngine\s*\(/)
  })

  it('drives the event→sound dispatch from GameState.soundEvents', () => {
    expect(mainSrc, 'main.ts must import the dispatch').toMatch(/from\s+['"]\.\/shell\/audio-dispatch(\.js)?['"]/)
    expect(mainSrc, 'main.ts must voice the per-frame events').toMatch(/playEventSounds\s*\(/)
    expect(mainSrc, "main.ts must drain the core's sound channel").toMatch(/soundEvents/)
  })

  it('re-reads sustained voices each frame so they silence at the game-over edge', () => {
    expect(mainSrc, 'main.ts must call the sustained-voice update').toMatch(/updateSustainedSounds\s*\(/)
  })
})
