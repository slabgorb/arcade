// tests/demo-jt2-9-source.test.ts
//
// Story jt2-9 — RED phase (Leeloo / TEA). The SOURCE-WIRING companion to
// demo-jt2-9.test.ts, for item (2)'s BLIT half: the horizontal sprite flip is a
// canvas operation main.ts performs, which a node env cannot exercise — so it is
// pinned as TEXT via the readFileSync idiom (the jt2-7 demo-source.test.ts
// convention). The DATA half (drawList emits op.facing) is pinned behaviourally
// in demo-jt2-9.test.ts item 2c; here we pin that the SHELL actually consumes it.
//
// The gap (source-confirmed, main.ts:63-84 on HEAD a755096): blit() does a plain
// drawImage(atlas, …, x, y, w, h) with no transform, and blitOp() passes the op's
// x/y straight through — nothing reads facing, so every right-facing atlas frame
// draws un-flipped and a LEFT-moving sprite visually faces RIGHT. The enemyFrame /
// mountFrame comments ("Facing is applied at the blit") are therefore a PROMISE
// the shell does not keep. This story makes it true.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const mainSource = (): string => readFileSync(join(repoRoot, 'src', 'main.ts'), 'utf8')

// ─────────────────────────────────────────────────────────────────────────────
// ITEM 2 (blit half) — main.ts flips the sprite horizontally by the op's facing.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt2-9 item 2 (blit) — the shell mirrors a left-facing sprite at the blit', () => {
  it('main.ts reads the draw op’s facing (the flip is data-driven, not by-eye)', () => {
    const src = mainSource()
    // The shell must consult the op's facing to decide which way to draw. A render
    // path that never mentions facing cannot flip anything (the current bug).
    expect(src, 'main.ts must read facing off the draw op to flip left-facers').toMatch(/facing/)
  })

  it('main.ts horizontally mirrors the blit (a scale(-1,…) / negative-axis transform), not a plain copy', () => {
    const src = mainSource()
    // A horizontal mirror on a 2D canvas is a scale(-1, 1) (usually wrapped in
    // save/restore with a translate) or an equivalent setTransform. A plain
    // drawImage with no transform — what main.ts has today — cannot flip.
    expect(
      src,
      'the shell must mirror the atlas frame for a left-facer (scale(-1,…)/setTransform), so BR*/O*/S* right-facing frames face left',
    ).toMatch(/scale\(\s*-1|setTransform\(\s*-1/)
  })

  it('the mirror is GATED on a facing CONDITIONAL, not applied to everything (right-facers draw un-flipped)', () => {
    const src = mainSource()
    // Reviewer round 2: a bare `/facing/` token near the transform is too weak — an
    // UNCONDITIONAL mirror (flips every sprite) with a stray `op.facing` reference
    // passed it. Require the actual conditional SHAPE, and require the mirror to sit
    // AFTER it (inside the branch), so an unconditional flip cannot satisfy this.
    const cond = src.match(/if\s*\(\s*op\.facing\s*===\s*-\s*1\s*\)/)
    expect(cond, 'the mirror must be guarded by `if (op.facing === -1)` — a value conditional, not a token').toBeTruthy()
    const condIdx = cond ? src.indexOf(cond[0]) : -1
    const flip = src.slice(condIdx).match(/scale\(\s*-1|setTransform\(\s*-1/)
    expect(flip, 'the scale(-1,…) mirror must appear INSIDE the `op.facing === -1` branch, after the guard').toBeTruthy()
  })
})
