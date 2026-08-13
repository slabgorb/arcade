// tests/render-jt4-5.test.ts
//
// Story jt4-5 — RED phase (Leeloo / TEA). The SHELL half of the epic closer: the
// HUD wiring, pinned as SOURCE TEXT (the jt1-6 / tempest tp1-39 / centipede
// cp1-6 `?raw` idiom, reviewer-blessed). A node runtime cannot boot a canvas or run
// requestAnimationFrame — exactly the lines a render shell goes wrong on — so the
// wiring is pinned by reading src as text. Every match is written to fail on a
// PLAUSIBLE wrong shell, not merely an empty one.
//
// ─── NODE ENV ON PURPOSE (the render.test.ts trap) ──────────────────────────
// This file reads src/ off disk; a jsdom run throws at module load on
// `fileURLToPath`. It stays the default node env — and this header never spells the
// environment directive as a token (vitest scans the leading comment for it with no
// regard for prose, so quoting it sets the very trap it warns of).
//
// ─── WHAT jt4-5 CHANGES IN THE SHELL ─────────────────────────────────────────
//   • main.ts now drives the SESSION layer (createGame / stepGame), not the raw sim
//     (createWaveSim / stepSim) — the demo is two knights playing a full loop, so
//     the shell must step the ledgers, not just the sim.
//   • it draws a HUD (score + lives + wave per player) from `overlayReadout`
//     — the PURE projection off the very GameState it steps, so the readout cannot be
//     a shell-side copy. The overlay's OUTPUT is pinned in tests/game-jt4-5.test.ts;
//     here we pin that the shell READS the sim and invents no colours drawing it.
//   • the authentic MESSAGE.SRC score display is jt5 — this is the HUD only.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { frameLoopBody } from './helpers/frame-loop.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const mainPath = join(repoRoot, 'src', 'main.ts')
const renderPath = join(repoRoot, 'src', 'shell', 'render.ts')

function mainSource(): string {
  if (!existsSync(mainPath)) throw new Error('src/main.ts is missing — the shell entry')
  return readFileSync(mainPath, 'utf8')
}
const renderSource = (): string => readFileSync(renderPath, 'utf8')

// ─────────────────────────────────────────────────────────────────────────────
// AC — main.ts drives the SESSION layer (stepGame), not just the raw sim.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt4-5 shell — the demo is driven by the session layer stepGame (no shell-side game state)', () => {
  it('main.ts pulls createGame + stepGame from core/game (the ledgers, not just the sim)', () => {
    const src = mainSource()
    // RED today: main.ts drives createWaveSim/stepSim from core/sim. The full loop
    // needs the session layer — score/lives/wave/game-over ride stepGame.
    expect(src, 'main.ts must import the session layer from core/game').toMatch(
      /from\s+['"]\.\/core\/game(\.js)?['"]/,
    )
    expect(src, 'and build the game session').toMatch(/createGame\s*\(/)
    expect(src, 'and step it once per frame through stepGame').toMatch(/stepGame\s*\(/)
  })

  it('main.ts still owns the clock and maps BOTH players (regression guards)', () => {
    const src = mainSource()
    expect(src, 'the shell owns the clock (core is stepped, never ticks)').toMatch(
      /requestAnimationFrame|pumpFrames|timebase/,
    )
    expect(src, 'P1 input mapping survives the migration').toMatch(/mapPlayer1/)
    expect(src, 'P2 input mapping survives the migration').toMatch(/mapPlayer2/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC — the HUD reads the core registers STRAIGHT off the stepped state.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt4-5 shell — the HUD reads the sim registers, not a shell-side copy', () => {
  it('main.ts draws the overlay from overlayReadout (the pure projection off the GameState)', () => {
    const src = mainSource()
    // The overlay must consume the pure projection of the state the shell steps — so it
    // shows the SAME score/lives/wave the sim holds (routing≠geometry: the OUTPUT is
    // pinned in game-jt4-5.test.ts; here the shell must actually reach for it). RED today.
    expect(src, 'main.ts draws the HUD from overlayReadout(game)').toMatch(/overlayReadout\s*\(/)
  })

  it('main.ts CALLS the overlay each frame INSIDE the animation loop (removing the per-frame draw reddens)', () => {
    // Round-2 fix (Reviewer [MEDIUM][TEST], Subagent #2 vacuity finding): the sibling
    // `/overlayReadout\(/` pin above is VACUOUS for the CALL SITE — `overlayReadout(` also appears
    // inside the `drawOverlay()` DEFINITION, so removing the per-frame `drawOverlay(game)` call from
    // the animation loop leaves it green (test-analyzer mutation-proved all render pins stayed
    // green with the call gone). This ties the overlay to the FRAME LOOP: the draw CALL must live
    // INSIDE the animation-frame function so it runs every frame, not merely be defined. Anchoring
    // on the `frame` fn declaration and slicing FROM it EXCLUDES the drawOverlay()/overlayReadout()
    // definitions (which precede the loop), so only a real per-frame CALL satisfies the match.
    // MUTATION-VERIFIED this round: deleting the `drawOverlay(game)` loop line reddens this test;
    // restoring it greens it.
    // jt11-10 (b): bound to the frame fn's closing brace via the AST (helpers/frame-loop),
    // not a slice to EOF — a `drawOverlay(`/`overlayReadout(` living OUTSIDE the loop can
    // no longer satisfy this, even if a decl is one day added after `frame` in main.ts.
    const loopBody = frameLoopBody(mainSource())
    expect(
      loopBody,
      'the animation loop must CALL the HUD every frame — drawOverlay(...) / ' +
        'overlayReadout(...) INSIDE the frame fn, not merely defined; removing the call reddens this',
    ).toMatch(/(?:drawOverlay|overlayReadout)\s*\(/)
  })

  it('main.ts keeps NO shell-side score/lives counters — it reads the sim, never recomputes', () => {
    // A shell that accumulates its own score/lives would drift from the sim (the copy
    // bug this story exists to prevent). The overlay must READ the ledgers, so the shell
    // must not mutate a score/lives of its own. (Green guard — it bites if a shell-side
    // counter is ever introduced alongside the overlay.)
    const src = mainSource()
    expect(src.match(/\bscore\s*\+=/g) ?? [], 'no shell-side score accumulation').toEqual([])
    expect(src.match(/\blives\s*(\+\+|--|[+-]=)/g) ?? [], 'no shell-side lives mutation').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC — no invented colours (the cp2-1 denylist scan, widened to the overlay).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt4-5 shell — the HUD invents no colours (denylist stays clean)', () => {
  it('main.ts + render.ts carry no hard-coded colour literals after the overlay lands', () => {
    // The overlay draws TEXT, which needs a fillStyle — it must derive from COLOR1
    // (rgb(${...}) built from palette-decoded values), never a hex/rgb-literal/CSS name.
    // Mutation-checked in render.test.ts; re-run here so THIS story's new paint is covered.
    for (const [label, src] of [
      ['main.ts', mainSource()],
      ['render.ts', renderSource()],
    ] as const) {
      expect(src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [], `hex colour literals in ${label}`).toEqual([])
      expect(src.match(/\brgba?\s*\(\s*\d/g) ?? [], `rgb()/rgba() literal args in ${label}`).toEqual([])
      expect(src.match(/fillStyle\s*=\s*['"](?!#)[a-z]+['"]/gi) ?? [], `CSS named colours in ${label}`).toEqual([])
    }
  })

  it('the shell still derives its colours from the transcribed palette (the positive half)', () => {
    const src = mainSource()
    expect(src, 'main.ts must reach for the transcribed palette/colours').toMatch(
      /PALETTES|COLOR1|rgbaPalette|colours/,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// jt11-10 (b) — HARDEN THE FRAME-LOOP SOURCE PINS: bound at the closing brace,
// not EOF. RED phase (Han Solo / TEA), routed from jt11-4.
//
// The per-frame-call pins above (`main.ts CALLS the overlay each frame …`) and the
// sibling in hud-jt11-2.test.ts anchor on the `frame` fn declaration and then take
// everything from that anchor to EOF (an UNBOUNDED slice from `loopStart`). That is
// correct ONLY while `frame` stays the LAST top-level declaration in main.ts (it
// currently is). The day a decl is added after it, the "loop body" silently swallows
// everything after the loop too, and a `drawHud(...)` living OUTSIDE the frame fn
// would satisfy the pin — the exact vacuity these tests exist to prevent, drifted in.
//
// The fix (mc10-6 ruling): bound the frame body with the TypeScript compiler API —
// walk to the `frame` fn's matching closing brace via the AST, never by line/regex/EOF.
// GREEN (Yoda) creates `tests/helpers/frame-loop.ts` exporting
// `frameLoopBody(src: string): string` (the `helpers/purity-scanner.ts` pattern is
// the precedent for using `typescript` in a joust test helper), then refactors BOTH
// pins to call it in place of the unbounded frame-to-EOF slice.
//
// NOTE (self-match hazard): the second test below scans this very file, so its
// matcher is BUILT (never written as a literal) and this prose never contains the
// searched idiom — otherwise the test could never reach green after the real pins
// are fixed. The matcher targets the `.slice`-from-`loopStart` call shape.
//
// The helper is loaded through a runtime-assembled specifier so a missing module
// reddens only THESE tests with a self-describing message, not the whole file at
// collection (the citations.test.ts `loadChecker` idiom).
async function loadFrameLoopBody(): Promise<(src: string) => string> {
  const specifier = ['.', 'helpers', 'frame-loop.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as { frameLoopBody?: (s: string) => string }
    if (typeof mod.frameLoopBody !== 'function') throw new Error('module has no `frameLoopBody` export')
    return mod.frameLoopBody
  } catch (e) {
    throw new Error(
      'frame-loop bounding helper not built yet — GREEN creates tests/helpers/frame-loop.ts ' +
        'exporting `frameLoopBody(src): string`, returning the `frame` fn body bounded at its ' +
        'matching closing brace via the TypeScript AST (mc10-6), NOT an unbounded slice from ' +
        `the frame anchor to EOF. (${(e as Error).message})`,
    )
  }
}

// The fragile idiom, assembled so it appears NOWHERE as a literal in this file.
const UNBOUNDED_SLICE = new RegExp('\\.slice\\(\\s*loopStart\\s*\\)', 'g')

describe('jt11-10 — the frame-loop source pins are AST-bounded, not sliced to EOF', () => {
  it('bounds the frame fn at its closing brace — a decl appended AFTER frame is EXCLUDED', async () => {
    const frameLoopBody = await loadFrameLoopBody()
    // `frame` is the last top-level decl today, so a frame-to-EOF slice and a real
    // bound are indistinguishable on the untouched file. Append a sentinel AFTER it
    // to tell them apart: a correct bound stops at the frame fn's `}`, EOF does not.
    const withTrailer = mainSource() + '\nconst JT11_10_AFTER_FRAME_SENTINEL = 1\n'
    const body = frameLoopBody(withTrailer)
    expect(
      body,
      'the bounded body must stop at the frame fn closing brace, not run to EOF ' +
        '(a decl added after `frame` must NOT leak into the pinned loop body)',
    ).not.toContain('JT11_10_AFTER_FRAME_SENTINEL')
    // …and the bound must not be cut so early it loses the real per-frame paint call.
    expect(
      body,
      'the bounded body still contains the per-frame HUD/overlay call',
    ).toMatch(/(?:drawHud|drawOverlay|overlayReadout)\s*\(/)
  })

  it('neither pin still takes an unbounded frame-to-EOF slice — both call the AST helper', () => {
    const testsDir = join(dirname(fileURLToPath(import.meta.url)))
    for (const rel of ['render-jt4-5.test.ts', 'hud-jt11-2.test.ts']) {
      const text = readFileSync(join(testsDir, rel), 'utf8')
      expect(
        text.match(UNBOUNDED_SLICE) ?? [],
        `${rel} still slices from the frame anchor to EOF — replace that unbounded slice with ` +
          `the AST-bounded frameLoopBody(...) helper so the pin cannot swallow code after the loop`,
      ).toEqual([])
    }
  })
})
