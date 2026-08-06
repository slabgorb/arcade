// tests/demo-jt3-7-reviewfix.test.ts
//
// Story jt3-7 — REVIEW-FIX RED phase (Leeloo / TEA). The Reviewer returned CHANGES
// REQUESTED with one BLOCKING gap (B1) and two non-blocking fidelity/render nits
// (N1, N2). These are the FAILING guards Dev turns green. NO src/ is written here.
//
// ─── B1 (BLOCKING) — the ptero dissolve paints ZERO pixels in the shell ───────
// drawList emits entityOp('ASH1R', …) for a dissolving body, but the shell paints
// nothing: ASH1R is encoding:'runlength' (pictures.ts), excluded from the
// atlas (buildAtlas keeps encoding==='raster', render.ts), so blitOp's
// `atlas.blocks['ASH1R']` is undefined and it silently `return`s (main.ts).
// expandAsh/expandAshFrames (pictures.ts) have NO shell caller. The
// shipped precedent is COMCL5: main.ts decodes the non-raster 'stream' via
// expandComcl5 → drawIsland and PAINTS it (main.ts). The dissolve needs the
// same last shell mile. The existing render test pins only the OP (green while the
// pixels stay dark) — this guard pins PIXELS: the shell's dissolve-paint seam must
// emit fillRect paints covering exactly the decoded ASH frame's visible pixels.
//
//   THE SEAM THIS TEST DEFINES (Dev builds it in src/shell/render.ts, the node-
//   testable shell module — main.ts is not importable in a node env):
//     export function paintDissolve(
//       context: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>,
//       op: { x: number; y: number; frame?: number; facing?: number },
//       colours: readonly Rgba[],
//     ): void
//   It decodes ASH1R via expandAshFrames, picks the `op.frame` image (default 0),
//   and fillRects each NON-ZERO (nibble 0 = transparent) pixel at op.x+col, op.y+row
//   — exactly the drawIsland idiom. main.ts then calls it for a kind:'dissolve' op.
//
// ─── N1 (FOLD-IN) — resolvePteroAttack over-kills the exact-column LEFT-facer ──
// ptero.ts `player.facing > 0 ? coldx >= 0 : coldx <= 0`. The right-facer
// COLDX=0 kill is ROM-correct + already pinned (LDD COLDX / BPL 12$ — BPL takes 0
// → kill, JOUSTRV4.SRC:4994-5001). But the ROM groups COLDX=0 into the RIGHT branch,
// so a LEFT-facing player at the same column (coldx=0, facing<0) falls to OSTBO =
// NO kill — whereas `coldx <= 0` KILLS it. The left branch must be strict `coldx < 0`.
//
// ─── N2 (FOLD-IN) — live trolls accumulate one-per-wave ──────────────────────
// demo.ts `if (trollSpawnable(arena, wave))` fires on every wave-clear once
// bridgeBurned latches (wave≥4), with no "already a live troll" guard and nothing
// removing a troll → ~5 stacked trolls by wave 8. GREEN adds
// `&& !processes.some(p => p.kind === 'troll')`.
//
// Node env on purpose (B1 reads/executes the shell render module + text-scans main.ts).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadRender } from './helpers/render-contract.js'
import { loadPictures } from './helpers/pictures-contract.js'
import { loadPtero, type JoustEntity, type PteroEntity } from './helpers/ptero-contract.js'
import { loadDemo, type DemoState, type DemoProcess } from './helpers/demo-contract.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const SEED = 0x1234

// ═════════════════════════════════════════════════════════════════════════════
// B1 — THE DISSOLVE PAINTS VISIBLE PIXELS (RED: no shell caller for expandAshFrames).
//   Pin PIXELS, not the op: drive the shell's dissolve-paint seam with a recording
//   2D context and assert it paints exactly the decoded ASH frame's visible pixels.
// ═════════════════════════════════════════════════════════════════════════════

/** A fake 2D context that records every fillRect (the paint the shell must emit). */
function recordingContext(): {
  ctx: { fillStyle: string; fillRect(x: number, y: number, w: number, h: number): void }
  fills: Array<{ x: number; y: number; w: number; h: number; style: string }>
} {
  const fills: Array<{ x: number; y: number; w: number; h: number; style: string }> = []
  const ctx = {
    fillStyle: '',
    fillRect(x: number, y: number, w: number, h: number): void {
      fills.push({ x, y, w, h, style: ctx.fillStyle })
    },
  }
  return { ctx, fills }
}

/** The non-transparent (nibble != 0) pixel count of a decoded ASH frame. */
function visiblePixels(frame: { pixels: number[] }): number {
  return frame.pixels.filter((p) => p !== 0).length
}

describe('B1 (BLOCKING) — the ptero dissolve PAINTS non-zero pixels in the shell (RED)', () => {
  it('the shell has a dissolve-paint seam that fillRects exactly the decoded ASH frame', async () => {
    const pics = await loadPictures()
    const r = await loadRender()

    // The data that SHOULD paint exists today (jt3-6 landed expandAshFrames) — the
    // bug is purely that no shell path consumes it. Establish the paintable pixels.
    const ash = pics.PIXEL_BLOCKS.find((b) => b.name === 'ASH1R' || b.aliases.includes('ASH1R'))
    expect(ash, 'ASH1R must be transcribed (jt3-6)').toBeDefined()
    const frames = pics.expandAshFrames(ash!.bytes)
    expect(frames.length, 'the dissolve is a 3-frame ASH animation').toBeGreaterThanOrEqual(1)
    const visible0 = visiblePixels(frames[0])
    expect(visible0, 'ASH frame 0 has pixels to paint (else the guard is vacuous)').toBeGreaterThan(0)

    // The SEAM. Undefined today → NO shell caller for expandAshFrames (the B1 gap).
    const paintDissolve = (r as unknown as { paintDissolve?: unknown }).paintDissolve
    expect(
      typeof paintDissolve,
      'src/shell/render.ts must export paintDissolve — the shell path that decodes ' +
        'ASH1R and fillRects it (mirroring expandComcl5 → drawIsland). Missing = the ' +
        'dissolve op paints ZERO pixels (B1).',
    ).toBe('function')
    const paint = paintDissolve as (
      context: unknown,
      op: { x: number; y: number; frame?: number; facing?: number },
      colours: readonly { r: number; g: number; b: number; a: number }[],
    ) => void

    const colours = r.rgbaPalette(pics.PALETTES.COLOR1)

    // Drive frame 0 through the seam. A stub that paints nothing stays RED (fills 0);
    // painting the wrong frame or a single dummy pixel fails the exact-area pin.
    const rec0 = recordingContext()
    paint(rec0.ctx, { x: 40, y: 100, frame: 0, facing: 1 }, colours)
    const painted0 = rec0.fills.reduce((a, f) => a + f.w * f.h, 0)
    expect(rec0.fills.length, 'the dissolve must PAINT (fillRect), not silently skip like blitOp').toBeGreaterThan(0)
    expect(
      painted0,
      'the painted pixel area must equal ASH frame 0’s visible-pixel count (nibble 0 is transparent)',
    ).toBe(visible0)

    // Painting must be positioned at the op (not at 0,0) so the ash lands on the body.
    expect(
      rec0.fills.every((f) => f.x >= 40 && f.y >= 100),
      'every painted pixel sits at/after the op position (op.x=40, op.y=100)',
    ).toBe(true)

    // And it must INDEX by op.frame (DissolveState.frame): a later frame paints a
    // different visible-pixel count, so a seam frozen at frame 0 reddens here.
    if (frames.length > 1) {
      const lastIdx = frames.length - 1
      const visibleLast = visiblePixels(frames[lastIdx])
      const recLast = recordingContext()
      paint(recLast.ctx, { x: 40, y: 100, frame: lastIdx, facing: 1 }, colours)
      const paintedLast = recLast.fills.reduce((a, f) => a + f.w * f.h, 0)
      expect(
        paintedLast,
        `ASH frame ${lastIdx} must paint its own visible-pixel count — the seam indexes op.frame`,
      ).toBe(visibleLast)
      if (visibleLast !== visible0) {
        expect(paintedLast, 'and frames genuinely differ, so it is not frozen on frame 0').not.toBe(painted0)
      }
    }
  })

  it('main.ts WIRES the dissolve paint seam (the shell actually calls it, no dark regress)', () => {
    // A painting function nobody calls still ships a dark death. main.ts must reach
    // for the dissolve decode/paint on its render path (the ?raw source idiom, jt1-6).
    const main = readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')
    expect(
      main,
      'main.ts must call the dissolve paint seam (paintDissolve) or decode expandAshFrames ' +
        'on its draw path — like it decodes expandComcl5 for the island',
    ).toMatch(/paintDissolve|expandAshFrames/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// N1 — resolvePteroAttack: the exact-column LEFT-facer must NOT kill (RED).
//   The right-facer COLDX=0 kill (facing:1) is ROM-correct and pinned in the
//   deferred-fixes suite; this is its MIRROR — the left-facer COLDX=0 no-kill.
// ═════════════════════════════════════════════════════════════════════════════
function playerEntity(over: Partial<JoustEntity> = {}): JoustEntity {
  return {
    posX: 100,
    posY: 110 << 8,
    velY: 0,
    velX: 0,
    plantZ: 0,
    facing: 1,
    bumpX: 0,
    bumpY: 0,
    party: 'player',
    collision: null,
    groundState: null,
    ...over,
  }
}
function pteroEntity(over: Partial<PteroEntity> = {}): PteroEntity {
  return { posX: 100, posY: 100 << 8, facing: -1, attackFrame: false, ...over }
}

describe('N1 — resolvePteroAttack over-kills the exact-column LEFT-facer (JOUSTRV4.SRC:4994-5001, RED)', () => {
  it('a LEFT-facer at the SAME column (coldx=0), in-band + opposite-facing, must NOT kill', async () => {
    const ptero = await loadPtero()
    // Mirror of the right-facer coldx=0 kill: player faces LEFT (facing:-1), ptero
    // faces RIGHT (opposite), SAME column (coldx = 100 − 100 = 0), lanceOffset =
    // 0 + 110 − 100 = 10 (glide band centre, in band). The ROM groups COLDX=0 into
    // the RIGHT branch (BPL), so a LEFT-facer here falls to OSTBO = the normal joust
    // (pteroWins), NOT a kill. `coldx <= 0` wrongly kills it — the fix is `coldx < 0`.
    const out = ptero.resolvePteroAttack(
      playerEntity({ posX: 100, posY: 110 << 8, facing: -1 }),
      pteroEntity({ posX: 100, posY: 100 << 8, facing: 1 }),
    )
    expect(
      out.kind,
      'coldx=0 belongs to the RIGHT branch (BPL); a left-facer at the exact column does not kill',
    ).toBe('pteroWins')
  })

  it('CONTROL — a LEFT-facer facing INTO a ptero to its LEFT (coldx<0) still kills (fix keeps genuine kills)', async () => {
    // Guards against a lazy fix that makes left-facers never kill. Ptero 4px to the
    // LEFT (coldx = 96 − 100 = −4 < 0), player faces left into it, in band, opposite
    // facings → kill both before AND after the `coldx < 0` fix.
    const ptero = await loadPtero()
    const out = ptero.resolvePteroAttack(
      playerEntity({ posX: 100, posY: 110 << 8, facing: -1 }),
      pteroEntity({ posX: 96, posY: 100 << 8, facing: 1 }),
    )
    expect(out.kind, 'a genuine left-into contact (coldx<0) still kills').toBe('kill')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// N2 — live trolls must not accumulate one-per-wave (RED).
//   Drives the REAL stepDemo across waves 4→8. The menagerie suite's forceAdvance
//   strips to PLAYERS ONLY between steps — which drops the accumulated trolls each
//   frame and MASKS the leak. This driver clears only enemies/eggs (to force wave
//   clears) and KEEPS trolls/pteros, so the stacking is observable, as the ROM run
//   would show it. Confirmed empirically: trolls climb 1→2→3→4→5 across waves 4-8.
// ═════════════════════════════════════════════════════════════════════════════

/** Force a wave-clear WITHOUT hiding the leak: drop enemies+eggs, keep everything else. */
function clearEnemies(d: DemoState): DemoState {
  return {
    ...d,
    sim: {
      ...d.sim,
      processes: d.sim.processes.filter(
        (p: DemoProcess) => p.kind !== 'enemy' && p.kind !== 'egg',
      ),
    },
  }
}

describe('N2 — live trolls do not stack one-per-wave through the real stepDemo (RED)', () => {
  it('at most one kind:troll process exists at any point driving waves 4→8', async () => {
    const demo = await loadDemo()
    let d = demo.createWaveDemo(SEED)
    let maxTrolls = 0
    let guard = 0
    while (d.wave < 8) {
      d = demo.stepDemo(clearEnemies(d))
      const trolls = d.sim.processes.filter((p) => p.kind === 'troll').length
      maxTrolls = Math.max(maxTrolls, trolls)
      if (++guard > 300) throw new Error(`stuck advancing waves at wave ${d.wave}`)
    }
    // Sanity: the drive actually reached the troll waves (else the guard is vacuous).
    expect(d.wave, 'the drive reached wave 8 (past the troll wave 4)').toBeGreaterThanOrEqual(8)
    expect(
      maxTrolls,
      'a live troll spawns once per wave-clear with no dedup guard nor removal — it must be ≤ 1',
    ).toBeLessThanOrEqual(1)
  })
})
