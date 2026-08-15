// tests/sprite-colour.test.ts
//
// The MOTION-OBJECT (SPRITE) per-creature colours — the follow-up the ml7-11
// playfield-colour story explicitly scoped OUT ("the motion-object per-creature
// colours (centipede/bee/spider, MOCOL slots, 99$+3..+11) … are GREEN's",
// playfield-colour.test.ts:48-53). This is milliped's AUTHENTIC packed sprite
// palette, replacing the earlier shared wave-table approximation.
//
// ─── GROUND TRUTH ────────────────────────────────────────────────────────────
// CLRCH (MLIRQ.MAC:242-302) walks bytes +3..+11 of each 12-byte 99$ row
// (MLIRQ.MAC:304-351) into the MOCOL colour-RAM slots:
//   99$+3/+4/+5 -> MOCOL+1/+2/+3   CENTIPEDE LEGS / EYES / BODY (:275-282)
//   99$+6/+7/+8 -> MOCOL+5/+6/+7   ANT / FLY / BEE              (:283-287)
//   99$+9/10/11 -> MOCOL+9/+0A/+0B SPIDER / SCORPION / EARWIG / SNAIL (:288-293)
// A motion object's `color` attribute byte packs three 2-bit MOCOL sub-indices
// (centiped_v.cpp milliped_set_color:360-387): pen base = color*4 @ 4 pens/bank,
// so value 1 <- MOCOL[base+(color&3)], value 2 <- MOCOL[base+((color>>2)&3)],
// value 3 <- MOCOL[base+((color>>4)&3)], base = 4*(color>>6).
//
// The 99$ bytes are TRANSCRIBED into src/core/playfield-colour.ts, so this suite
// PARSES the vendored MLIRQ.MAC and asserts the module against those bytes (the
// "independent input" rule) — a transcription typo reddens here, not on screen.
// The rendered creature colours are the AC3 VISUAL playtest (/millipede/).

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { decodeColourByte } from '../src/core/palette'
import {
  spriteColours,
  spriteColourIndices,
  spriteInkBytes,
  SCORE_COLOUR,
  COLOUR_LEVELS,
} from '../src/core/playfield-colour'
import { HEAD_COLOR, BODY_COLOR, POISON_COLOR } from '../src/core/millipede'
import { BEE_COLOR } from '../src/core/bee'
import { DRAGONFLY_COLOR } from '../src/core/dragonfly'
import { MOSQUITO_COLOR } from '../src/core/mosquito'
import { SPIDER_COLOR } from '../src/core/spider'
import { BEETLE_COLOR } from '../src/core/beetle'
import { EARWIG_COLOR } from '../src/core/earwig'
import { INCHWORM_COLOR } from '../src/core/inchworm'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mlirqPath = join(root, '..', '..', 'reference', 'original-source', 'millipede', 'MLIRQ.MAC')

const STRIDE = 12
const LEVELS = 12

/** Parse the vendored 99$ table (MLIRQ.MAC:304-351) into 144 flat bytes — the
 *  same independent-input parse playfield-colour.test.ts uses (CRLF quarry). */
function parse99Table(): number[] {
  const lines = readFileSync(mlirqPath, 'utf8').split('\n')
  const bytes: number[] = []
  for (let n = 304; n <= 351; n++) {
    const raw = (lines[n - 1] ?? '').replace(/\r$/, '')
    const operand = raw.split(';')[0]
    const m = operand.match(/\.BYTE\s+(.+)$/)
    if (!m) throw new Error(`MLIRQ.MAC:${n} is not a .BYTE row: ${JSON.stringify(raw)}`)
    for (const tok of m[1].split(',')) {
      const t = tok.trim()
      if (t === '') continue
      const v = parseInt(t, 16)
      if (!Number.isInteger(v) || v < 0 || v > 0xff) throw new Error(`MLIRQ.MAC:${n} bad byte ${JSON.stringify(tok)}`)
      bytes.push(v)
    }
  }
  return bytes
}

describe('sprite-colour — spriteColours reproduces the 99$ table bytes +3..+11', () => {
  it('CENTIN=1 is the source’s own centipede/bee/spider triples', () => {
    // MLIRQ.MAC:305-307 — .BYTE 0F,39,0E2 / 21,0F8,0E0 / 14,04,68
    expect(spriteColours(1)).toEqual({
      centLegs: 0x0f,
      centEyes: 0x39,
      centBody: 0xe2,
      bee1: 0x21,
      bee2: 0xf8,
      bee3: 0xe0,
      spider1: 0x14,
      spider2: 0x04,
      spider3: 0x68,
    })
  })

  it('all 12 levels match 99$[12*(centin-1) + {3..11}] parsed from MLIRQ.MAC', () => {
    const table = parse99Table()
    expect(table.length).toBe(LEVELS * STRIDE)
    for (let centin = 1; centin <= LEVELS; centin++) {
      const b = STRIDE * (centin - 1)
      expect(spriteColours(centin), `CENTIN=${centin}`).toEqual({
        centLegs: table[b + 3],
        centEyes: table[b + 4],
        centBody: table[b + 5],
        bee1: table[b + 6],
        bee2: table[b + 7],
        bee3: table[b + 8],
        spider1: table[b + 9],
        spider2: table[b + 10],
        spider3: table[b + 11],
      })
    }
  })

  it('every sprite colour byte across all 12 levels is a valid colour-RAM byte', () => {
    for (let centin = 1; centin <= LEVELS; centin++) {
      for (const byte of Object.values(spriteColours(centin))) {
        expect(() => decodeColourByte(byte), `CENTIN=${centin} byte ${byte}`).not.toThrow()
      }
    }
  })
})

describe('sprite-colour — spriteColourIndices decodes the packed color byte to MOCOL slots', () => {
  // Verified against CLRCH's own MOCOL labels: the sub-indices must land on the
  // family slots the ROM comments name.
  it('millipede head ($39) selects the CENTIPEDE slots MOCOL+1/+2/+3 (legs, eyes, body)', () => {
    expect(HEAD_COLOR).toBe(0x39)
    expect(spriteColourIndices(0x39)).toEqual([1, 2, 3])
  })

  it('bee/dragonfly/mosquito ($79) select the ANT/FLY/BEE slots MOCOL+5/+6/+7', () => {
    for (const c of [BEE_COLOR, DRAGONFLY_COLOR, MOSQUITO_COLOR]) expect(c).toBe(0x79)
    expect(spriteColourIndices(0x79)).toEqual([5, 6, 7])
  })

  it('spider & others ($B9) select the SPIDER slots MOCOL+9/+0A/+0B', () => {
    for (const c of [SPIDER_COLOR, BEETLE_COLOR, EARWIG_COLOR, INCHWORM_COLOR]) expect(c).toBe(0xb9)
    expect(spriteColourIndices(0xb9)).toEqual([9, 0xa, 0xb])
  })

  it('millipede body ($3D) paints legs then body×2 — v1 MOCOL+1, v2/v3 MOCOL+3', () => {
    expect(BODY_COLOR).toBe(0x3d)
    expect(spriteColourIndices(0x3d)).toEqual([1, 3, 3])
  })

  it('a poison segment ($1B) permutes the centipede slots (body, eyes, legs)', () => {
    expect(POISON_COLOR).toBe(0x1b)
    expect(spriteColourIndices(0x1b)).toEqual([3, 2, 1])
  })

  it.each([[-1], [256], [1.5], [Number.NaN]])('rejects a non-byte color %s', (bad) => {
    expect(() => spriteColourIndices(bad)).toThrow(RangeError)
  })
})

describe('sprite-colour — spriteInkBytes resolves the MOCOL bytes for a level', () => {
  it('the full-millipede head ($39, CENTIN=12) is legs $F8, eyes $1F, body $04', () => {
    // MLIRQ.MAC:349 — CENTIN=12 centipede row .BYTE 0F8,1F,04.
    expect(spriteInkBytes(HEAD_COLOR, 12)).toEqual([0xf8, 0x1f, 0x04])
  })

  it('defaults to the full-millipede level (COLOUR_LEVELS), like waveColours', () => {
    expect(spriteInkBytes(HEAD_COLOR)).toEqual(spriteInkBytes(HEAD_COLOR, COLOUR_LEVELS))
  })

  it('the millipede body pixel (value 3) decodes to the reference YELLOW (255,222,104)', () => {
    // The whole point of the port: body colour $04 through the ml2-3 seam is the
    // arcade's yellow, not the salmon the wave-table approximation showed.
    const [, , body] = spriteInkBytes(HEAD_COLOR, 12)
    expect(body).toBe(0x04)
    expect(decodeColourByte(body)).toEqual({ r: 0xff, g: 0xde, b: 0x68 })
  })

  it('the millipede eyes pixel (value 2) decodes to pure RED (255,0,0)', () => {
    const [, eyes] = spriteInkBytes(HEAD_COLOR, 12)
    expect(decodeColourByte(eyes)).toEqual({ r: 0xff, g: 0, b: 0 })
  })

  it('bee ($79, CENTIN=12) resolves the ANT/FLY/BEE bytes $E7,$F8,$4F', () => {
    // MLIRQ.MAC:349 — CENTIN=12 bee row .BYTE 0E7,0F8,4F.
    expect(spriteInkBytes(BEE_COLOR, 12)).toEqual([0xe7, 0xf8, 0x4f])
  })

  it('spider ($B9, CENTIN=12) resolves the SPIDER bytes $27,$68,$0F', () => {
    // MLIRQ.MAC:351 — CENTIN=12 spider row .BYTE 27,68,0F.
    expect(spriteInkBytes(SPIDER_COLOR, 12)).toEqual([0x27, 0x68, 0x0f])
  })

  it('SCORE_COLOUR is RED $1F (MOCOL+0E, scores/explosions)', () => {
    expect(SCORE_COLOUR).toBe(0x1f)
  })
})
