// tests/main-loop.test.ts
//
// Story cp1-6 — RED phase (O'Brien / TEA). AC-1/AC-4: the demo page wiring. The
// boot loop touches requestAnimationFrame, canvas, and pointer-lock — none of
// which exist in the node vitest env — so its wiring is pinned by the `?raw`
// source read (the reviewer-blessed tp1-39 idiom). This is the mechanical half of
// AC-4 ("render source-wiring test green"); the committed screenshot is the other,
// human half (Dev / review).
//
// main.ts is the cp1-1 skeleton (createSim/stepSim once per rAF, no input, no
// atlas, no scaling) — every assertion is RED.

import { describe, it, expect } from 'vitest'
import mainSrc from '../src/main.ts?raw'

// cp2-1 R3 hardening: strip line + block comments so a token that survives only
// in a doc comment (a gutted boot loop) can no longer satisfy a positive scan.
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

describe('cp1-6 main.ts — demo wiring (source-read)', () => {
  const code = stripComments(mainSrc)

  it('paces the sim with the fixed-timestep accumulator, not one step per rAF', () => {
    // The cp1-1 reviewer note: a per-display-frame step runs 2× on 120 Hz. main must
    // drive stepSim through the timebase accumulator instead.
    // cp2-2 R1: the pacing moved behind pumpFrame (the per-step pump), still from the
    // timebase module — accept either the direct stepsForElapsed call or pumpFrame.
    expect(code).toMatch(/from\s+['"].*timebase['"]/)
    expect(code).toMatch(/stepsForElapsed|pumpFrame/)
    expect(code).toMatch(/stepSim/)
  })

  it('wires BOTH input adapters (pointer + keyboard fallback)', () => {
    expect(code).toMatch(/createMouseAdapter/)
    expect(code).toMatch(/createKeyboardAdapter/)
  })

  it('requests pointer lock for the trackball analog (AC-1)', () => {
    // cp2-2 R4/R5: pointer lock moved behind createPointerLock (rejection catch +
    // pointerlockchange reset) — accept the controller or a direct call.
    expect(code).toMatch(/requestPointerLock|createPointerLock/)
  })

  it('builds the offscreen atlas and hands it to render()', () => {
    expect(code).toMatch(/buildAtlas/)
    expect(code).toMatch(/\brender\s*\(/)
  })

  it('applies integer scale + letterbox for crisp pixels (AC-2)', () => {
    expect(code).toMatch(/fitIntegerScale/)
    expect(code).toMatch(/imageSmoothingEnabled\s*=\s*false/)
  })
})

// ─── cp2-2 — RED phase (O'Brien / TEA). The R1/R4/R5 wiring the fix requires main.ts
// to delegate to. Behaviour is proven in tests/input-distribution.test.ts (R1) and
// tests/pointer-lock.test.ts (R4/R5); these `?raw` pins prove main.ts actually uses
// the tested seams. RED until GREEN rewrites main.ts.
describe('cp2-2 main.ts — R1/R4/R5 wiring (source-read)', () => {
  const code = stripComments(mainSrc)

  it('drives the sim through the per-step pump (R1: mouse delta drained per sim step)', () => {
    // pumpFrame samples INSIDE the step loop, so a 0-step frame never drains the mouse
    // (no ~50% loss at 120 Hz) and a catch-up burst consumes each delta exactly once
    // (no gun teleport) — instead of sampling once per rAF frame and reusing it.
    expect(code).toMatch(/pumpFrame/)
  })

  it('hardens pointer lock through the controller (R4 rejection catch + R5 pointerlockchange)', () => {
    expect(code).toMatch(/createPointerLock/)
  })
})

// ─── cp2-8 — RED phase (O'Brien / TEA). The two-click bind fix is DIAGNOSTIC: main.ts
// must SURFACE a rejected pointer-lock request so the first-click failure reason is
// visible, instead of the cp2-2 black-hole `.catch(() => {})`. The controller now
// takes an injectable onReject sink (tests/pointer-lock-acquire.test.ts); main.ts must
// wire that sink to a real diagnostic. RED until GREEN adds the wiring.
describe('cp2-8 main.ts — pointer-lock rejection is surfaced, not silently swallowed', () => {
  const code = stripComments(mainSrc)

  it('wires a diagnostic for a rejected pointer-lock request (first-click failure made visible)', () => {
    // The controller is still the seam…
    expect(code).toMatch(/createPointerLock/)
    // …but main.ts must now route its rejection to a real diagnostic so the
    // two-click bind is diagnosable in the console, rather than vanishing.
    expect(
      code,
      'main.ts must surface a rejected requestPointerLock() (e.g. console.warn) so the two-click bind is diagnosable',
    ).toMatch(/console\.(warn|error|info)/)
  })
})

// ─── cp2-13 — RED phase (O'Brien / TEA). Per-round colour cycling. Two wiring
// contracts main.ts must satisfy (behaviour lives in tests/palette-cycle.test.ts;
// these `?raw` pins prove main.ts USES those seams — canvas/rAF/window are absent
// in node):
//
//   (A) Live colour cycle. The atlas bakes each sprite's RGB in once from the CLRCH
//       pens; today `buildAtlas()` hardcodes scheme 0. main.ts must bake the atlas
//       from the current wave and REBAKE when the wave crosses a scheme boundary
//       (tracked via colorIndexForWave / schemeNumberForWave), so the field + enemy
//       colours visibly change per round in live play (AC-2).
//
//   (B) AC-2 screenshot-pair reachability — ORCHESTRATOR-SCOPED DEBUG SEED (Design
//       Deviation, TEA ruling). The live shell has no dev key / level-skip, so wave
//       2 is otherwise only reachable by fully clearing wave 1. main.ts parses a
//       SHELL-ONLY `?wave=N` query param (URLSearchParams), parses it as an integer,
//       CLAMPS it sanely (>= 1, finite), and seeds it as the initial wave so the
//       wave-1-vs-wave-2 screenshot pair is capturable live. The CORE stays free of
//       any debug pollution — the shell overrides the public SimState.wave field on
//       the created state; createSim / the pure sim gain no debug parameter. Mirrors
//       the star-wars dev-key precedent.
//
// RED until GREEN rewrites main.ts. tsc stays green (source-text scan only).
describe('cp2-13 main.ts — per-wave colour cycle + debug wave-seed (source-read)', () => {
  const code = stripComments(mainSrc)

  it('bakes the atlas from the WAVE, not a bare scheme-0 buildAtlas() (A: live cycle)', () => {
    // `buildAtlas()` today → no arg; `buildAtlas(sim.wave)` / `buildAtlas(debugWave)` passes.
    expect(code, 'buildAtlas must be given a wave so the atlas is coloured per round').toMatch(
      /buildAtlas\s*\(\s*[A-Za-z_$][\w$]*/,
    )
  })

  it('tracks the wave→scheme boundary so it rebakes only when the palette actually changes (A)', () => {
    // Referencing the palette scheme lookup is how main.ts knows a wave change crossed
    // into a new palette (rather than blindly rebaking the canvas every frame).
    expect(code, 'main.ts must consult colorIndexForWave / schemeNumberForWave to gate the rebake').toMatch(
      /colorIndexForWave|schemeNumberForWave/,
    )
  })

  it('parses a shell-only ?wave= query param (B: debug seed for the AC-2 screenshot pair)', () => {
    expect(code, 'main.ts must read the wave seed from the URL query (URLSearchParams / location.search)').toMatch(
      /URLSearchParams|location\.search/,
    )
    expect(code, 'the seed is parsed as an integer').toMatch(/parseInt/)
  })

  it('clamps the debug wave seed sanely (>= 1, finite — no NaN/negative/absurd wave)', () => {
    expect(code, 'the parsed ?wave= must be clamped (Math.min/Math.max or a clamp helper)').toMatch(
      /Math\.(?:min|max)|clamp/,
    )
  })
})
