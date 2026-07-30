// tests/dissolve.test.ts
//
// Story jt3-6 — RED phase (Leeloo / TEA). The BEHAVIOUR of the pterodactyl death
// dissolve: the ASH1R/L run-length DECODE (AC-1), the third encoding discriminant
// so the dissolve is never blitted as a raster (AC-2), the nap-driven three-frame
// dissolve STATE both the ptero and the baiter enter on death — NOT the interim
// poof — with jt3-4's 1000-point kill event STILL firing and NOT re-emitted (AC-3),
// and bit-for-bit determinism (AC-4). The CLIFER consumer trace + the INDEPENDENT
// source re-derivation + the JT36-* claim coverage live in the companion
// tests/dissolve-source.test.ts.
//
// ─── WHERE THE EXPECTED NUMBERS COME FROM (independent, not copied) ──────────
// Every geometry, alphabet, and pixel literal below was decoded from the real
// ASH1R/L stream by TEA this session with an INDEPENDENT reader transcribed
// straight from CLIFER's algorithm (the routine PTEASH JMPs into, JOUSTRV4.SRC:
// 4604-4631), then hand-checked. If Dev's expandAsh disagrees, do NOT edit these
// numbers — one of the two decoders is wrong and a human looks (the jt1-3 / cp1
// double-entry rule). The full byte-for-byte source re-derivation is the source
// companion; these literals are the mutation-resistant backstop.
//
// ─── THE FORMAT, ESTABLISHED FROM THE CONSUMER (open-questions §5 resolved) ──
// open-questions §5 flagged ASH1R/L as "value/run pairs?" — undecoded, "trace the
// consumer before the ptero death story". CLIFER IS that consumer. It establishes:
// each byte packs (length = HIGH nibble) | (color = LOW nibble); $00 ends the
// image; a byte whose length nibble is 0 but is non-zero (e.g. $01) ends the line;
// a run of `length` writes `length` screen-bytes of `color` (both 4bpp pixels),
// the LAST byte one pixel only (high nibble; low nibble 0 — the debris gap).

import { describe, it, expect } from 'vitest'
import { loadPictures } from './helpers/pictures-contract.js'
import { loadDissolve, type DissolveState } from './helpers/dissolve-contract.js'
import { loadPtero } from './helpers/ptero-contract.js'

// ─────────────────────────────────────────────────────────────────────────────
// The ASH block bytes, reached through the jt1-3 byte gate (PIXEL_BLOCKS ASH1R is
// re-derived byte-for-byte from JOUSTI.SRC:2781-2815 by pictures-gate.test.ts), so
// feeding them to the decoder here inherits that provenance — no hand-authored
// bytes enter this file.
// ─────────────────────────────────────────────────────────────────────────────
async function ashBytes(): Promise<number[]> {
  const pics = await loadPictures()
  const ash = pics.PIXEL_BLOCKS.find((b) => b.name === 'ASH1R' || b.aliases.includes('ASH1R'))
  if (!ash) throw new Error('ASH1R block missing from PIXEL_BLOCKS (jt1-3 transcribed it)')
  return ash.bytes
}

/** GREEN adds the CLIFER decoder to pictures.ts; fail self-describingly until then. */
async function loadDecoder() {
  const pics = await loadPictures()
  if (typeof pics.expandAshFrames !== 'function' || typeof pics.expandAsh !== 'function') {
    throw new Error(
      'GREEN adds expandAsh + expandAshFrames to src/core/pictures.ts — the CLIFER ' +
        'run-length decoder for the ASH1R/L ptero dissolve (JOUSTRV4.SRC:4604-4631)',
    )
  }
  return pics
}

// The frames TEA decoded independently this session, verified against the stream.
const FRAME_COUNT = 3
const FRAME0 = {
  width: 28,
  height: 11,
  pixelCount: 248,
  alphabet: [0, 4, 12],
  rowLengths: [28, 28, 26, 26, 28, 26, 26, 22, 16, 8, 14],
}
const FRAME1 = { width: 28, height: 11, pixelCount: 254, alphabet: [0, 4, 14] }
const FRAME2 = { width: 28, height: 11, pixelCount: 252, alphabet: [0, 4, 14] }

const alphabetOf = (pixels: readonly number[]): number[] => [...new Set(pixels)].sort((a, b) => a - b)

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE DECODE. ASH1R/L expands through the CLIFER run-length format.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 — ASH1R/L decodes through the CLIFER run-length format', () => {
  it('expandAshFrames returns exactly the THREE dissolve frames (PTERA1/2/3)', async () => {
    const pics = await loadDecoder()
    const frames = pics.expandAshFrames(await ashBytes())
    // The stream carries three $00-terminated images (LDA #3 "3 FRAME ANIMATION",
    // JOUSTRV4.SRC:1400). A decoder that stopped at the first $00 would return 1.
    expect(frames.length, 'the dissolve is a three-frame animation').toBe(FRAME_COUNT)
  })

  it('frame 0 (PTERA1) has the decoded geometry: 28×11, 248 ragged pixels', async () => {
    const pics = await loadDecoder()
    const [f0] = pics.expandAshFrames(await ashBytes())
    expect([f0.width, f0.height], 'PTERA1 is 28 wide (max row) × 11 rows').toEqual([
      FRAME0.width,
      FRAME0.height,
    ])
    expect(f0.pixels.length, 'the pixels are ragged, not width×height').toBe(FRAME0.pixelCount)
    expect(f0.rowLengths, 'per-row nibble counts, from the end-of-line markers').toEqual(
      FRAME0.rowLengths,
    )
    expect(
      f0.rowLengths.reduce((a, b) => a + b, 0),
      'rowLengths must sum to the pixel count (the reshapeRagged contract)',
    ).toBe(f0.pixels.length)
  })

  it('the nibble mapping: color is the LOW nibble, length the HIGH nibble', async () => {
    const pics = await loadDecoder()
    const [f0] = pics.expandAshFrames(await ashBytes())
    // Row 1 is `$D0,$1C,$01`: $D0 = length 13, color 0 → 26 background pixels; then
    // $1C = length 1, color $C → a single colour-12 pixel. A decoder that read the
    // HIGH nibble as colour would put 13/1 here, not 0/12.
    expect(f0.pixels[25], 'the tail of the 13-long background run is 0').toBe(0)
    expect(f0.pixels[26], 'then one colour-12 pixel ($1C: colour = LOW nibble)').toBe(12)
    expect(f0.pixels[27], 'the last byte of a run is ONE pixel — the low nibble is 0').toBe(0)
    // Row 11 ends `$5C,$00`: a length-5 colour-12 run whose LAST byte is one pixel.
    expect(f0.pixels[246], 'the last drawn pixel of PTERA1 is colour 12').toBe(12)
    expect(f0.pixels[247], 'and its trailing low nibble is 0 (last-byte-one-pixel)').toBe(0)
    expect(f0.pixels[234], 'row 11 opens with colour 4 (run $24, colour = LOW nibble)').toBe(4)
  })

  it('each frame emits ONLY the ash palette nibbles it can produce (mutation-resistant)', async () => {
    // The three frames use only {0, ash-colour}: PTERA1 = {0,4,12}, PTERA2/3 =
    // {0,4,14}. A decoder that mis-mapped the nibbles would emit run lengths
    // (13,11,12,…) into the pixel alphabet and this reddens. The colour SHIFT
    // 12→14 across the animation is the dissolve brightening — pin it per frame.
    const pics = await loadDecoder()
    const [f0, f1, f2] = pics.expandAshFrames(await ashBytes())
    expect(alphabetOf(f0.pixels), 'PTERA1 alphabet').toEqual(FRAME0.alphabet)
    expect(alphabetOf(f1.pixels), 'PTERA2 alphabet').toEqual(FRAME1.alphabet)
    expect(alphabetOf(f2.pixels), 'PTERA3 alphabet').toEqual(FRAME2.alphabet)
  })

  it('frames 1 and 2 (PTERA2/PTERA3) carry their decoded geometry too', async () => {
    const pics = await loadDecoder()
    const [, f1, f2] = pics.expandAshFrames(await ashBytes())
    expect([f1.width, f1.height, f1.pixels.length]).toEqual([
      FRAME1.width,
      FRAME1.height,
      FRAME1.pixelCount,
    ])
    expect([f2.width, f2.height, f2.pixels.length]).toEqual([
      FRAME2.width,
      FRAME2.height,
      FRAME2.pixelCount,
    ])
  })

  it('expandAsh decodes ONE frame and reports the next frame boundary (past $00)', async () => {
    const pics = await loadDecoder()
    const bytes = await ashBytes()
    // The three $00 end-of-image bytes sit at 50, 108, 171 — so single-frame decode
    // must stop there and hand back the offset just past each ($00 at 50 → next 51).
    const a = pics.expandAsh(bytes, 0)
    expect(a.next, 'PTERA1 ends at $00 index 50 → next frame at 51').toBe(51)
    expect([a.image.width, a.image.height]).toEqual([FRAME0.width, FRAME0.height])
    const b = pics.expandAsh(bytes, a.next)
    expect(b.next, 'PTERA2 ends at $00 index 108 → next at 109').toBe(109)
    const c = pics.expandAsh(bytes, b.next)
    expect(c.next, 'PTERA3 ends at $00 index 171 → next at 172 (stream end)').toBe(172)
  })

  it('expandAsh(offset=0) equals expandAshFrames[0] — the primitive backs the walk', async () => {
    const pics = await loadDecoder()
    const bytes = await ashBytes()
    expect(pics.expandAsh(bytes, 0).image).toEqual(pics.expandAshFrames(bytes)[0])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE THIRD ENCODING DISCRIMINANT. ASH1R/L carries its own tag so it is
// never blitted as a raster NOR fed to the Elias-gamma stream decoder.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 — the third encoding discriminant + no hand-authored pixels', () => {
  it("ASH1R/L is tagged 'runlength', DISTINCT from COMCL5's 'stream' and from 'raster'", async () => {
    const pics = await loadPictures()
    const enc = (name: string): string | undefined =>
      (pics.PIXEL_BLOCKS.find((b) => b.name === name) as { encoding?: string } | undefined)?.encoding
    // The jt1-6 discriminant was raster|stream, and ASH1R rode along as 'stream'.
    // jt3-6 splits it out: the run-length dissolve is NOT the Elias-gamma stream.
    expect(enc('ASH1R'), "ASH1R carries the third 'runlength' tag").toBe('runlength')
    // Mutation guard: tagging it 'raster' would blit the run-length bytes as a
    // 172×1 pixel strip of believable noise (the jt1-6 consumer hazard) — reddens.
    expect(enc('ASH1R'), 'never a raster').not.toBe('raster')
    // COMCL5 stays a stream — the two compressed formats keep DIFFERENT tags.
    expect(enc('COMCL5'), "COMCL5 stays 'stream' (Elias-gamma), not 'runlength'").toBe('stream')
  })

  it('every pixel block still declares one of the THREE known encodings', async () => {
    const pics = await loadPictures()
    const known = new Set(['raster', 'stream', 'runlength'])
    const missing = pics.PIXEL_BLOCKS.filter(
      (b) => !known.has((b as { encoding?: string }).encoding ?? ''),
    ).map((b) => b.name)
    expect(missing, 'blocks with no valid encoding discriminant').toEqual([])
  })

  it('the decoded pixels trace to the gated ASH bytes — no hand-authored pixels', async () => {
    // Every decoded pixel is a pure function of the ASH1R bytes, which are
    // themselves re-derived byte-for-byte from JOUSTI.SRC by pictures-gate.test.ts.
    // So the decode inherits that provenance: no pixel is invented here.
    const pics = await loadDecoder()
    const bytes = await ashBytes()
    const frames = pics.expandAshFrames(bytes)
    const all = frames.flatMap((f) => f.pixels)
    // Only nibbles the source bytes' LOW nibbles can produce reach the output.
    const sourceColours = new Set(bytes.map((b) => b & 0x0f))
    const illegal = [...new Set(all)].filter((n) => !sourceColours.has(n))
    expect(illegal, 'a decoded pixel colour that no source byte encodes is invented').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — DEATH → DISSOLVE. Both the ptero and the baiter enter the nap-driven
// three-frame dissolve (NOT the interim poof); the 1000-pt kill event STILL fires
// and is NOT re-emitted by the dissolve.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-3 — ptero AND baiter death enter the dissolve, not the poof', () => {
  it('the frame count matches the decoded animation (DISSOLVE_FRAME_COUNT === frames)', async () => {
    const d = await loadDissolve()
    const pics = await loadDecoder()
    expect(d.DISSOLVE_FRAME_COUNT, 'three ASH frames (LDA #3)').toBe(FRAME_COUNT)
    expect(
      d.DISSOLVE_FRAME_COUNT,
      'the state index range must match what expandAshFrames returns',
    ).toBe(pics.expandAshFrames(await ashBytes()).length)
    expect(d.DISSOLVE_FRAME_NAPS, 'each frame held 2+6 naps').toBe(8)
  })

  it('startDissolve begins on ASH frame 0, NOT done — a sequence, not a one-shot poof', async () => {
    const d = await loadDissolve()
    const s = d.startDissolve()
    expect(s.frame, 'the dissolve opens on PTERA1').toBe(0)
    expect(s.done, 'a dissolve is a multi-frame sequence, not an instant poof').toBe(false)
    expect(s.nap, 'the first frame holds a full nap window').toBe(d.DISSOLVE_FRAME_NAPS)
  })

  it('stepDissolve walks all three ASH frames in order, then removes the body', async () => {
    const d = await loadDissolve()
    let s = d.startDissolve()
    const framesSeen: number[] = [s.frame]
    // Walk to completion, collecting each distinct frame the dissolve shows.
    for (let i = 0; i < 200 && !s.done; i++) {
      const next = d.stepDissolve(s)
      if (next.frame !== s.frame) framesSeen.push(next.frame)
      s = next
    }
    expect(s.done, 'the dissolve terminates (the body is removed)').toBe(true)
    expect(framesSeen, 'it shows PTERA1 → PTERA2 → PTERA3, in order').toEqual([0, 1, 2])
  })

  it('each ASH frame is held for DISSOLVE_FRAME_NAPS wakes before advancing', async () => {
    const d = await loadDissolve()
    let s = d.startDissolve()
    let held = 0
    while (s.frame === 0 && !s.done) {
      s = d.stepDissolve(s)
      held++
    }
    expect(held, 'frame 0 is held the full nap window (PCNAP 2 + PCNAP 6)').toBe(d.DISSOLVE_FRAME_NAPS)
    expect(s.frame, 'then it advances to PTERA2').toBe(1)
  })

  it('a BAITER enters the SAME dissolve, tagged baiter (PTEKLL DECs NBAIT)', async () => {
    const d = await loadDissolve()
    const ptero = d.startDissolve()
    const baiter = d.startDissolve({ baiter: true })
    expect(ptero.baiter, 'a wave-type ptero is not a baiter').toBe(false)
    expect(baiter.baiter, 'a baiter carries the PCHASE≠0 flag (NBAIT bookkeeping)').toBe(true)
    // The ANIMATION is identical — the shared PTEKLL path — only the flag differs.
    expect({ ...baiter, baiter: false }, 'baiter and ptero share the dissolve animation').toEqual(
      ptero,
    )
  })

  it('the 1000-point kill event STILL fires and the dissolve does NOT re-emit it', async () => {
    const d = await loadDissolve()
    const p = await loadPtero()
    // jt3-4 owns the score event; entering the dissolve does not change it.
    expect(p.pteroScoreEvent(), 'jt3-4 still emits the 1000-pt kill event').toEqual({
      kind: 'score',
      value: 1000,
      reason: 'kill',
    })
    // The dissolve module is the body's FATE — it exports no score event, so it
    // cannot double-count the kill. (Ruling C: scoring accumulation is jt4.)
    const mod = d as unknown as Record<string, unknown>
    const scoreEmitters = Object.keys(mod).filter((k) => /score/i.test(k))
    expect(scoreEmitters, 'the dissolve emits no score of its own (no re-emit)').toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — DETERMINISM + PURITY. A seeded kill → dissolve → removal replays
// bit-for-bit; the decoder and the state machine never mutate their arguments.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 — a seeded ptero kill → dissolve → removal replays bit-for-bit', () => {
  /** Run a dissolve to completion, capturing the full (frame,nap,done) trace. */
  function playOut(d: Awaited<ReturnType<typeof loadDissolve>>, baiter = false): DissolveState[] {
    const trace: DissolveState[] = []
    let s = d.startDissolve({ baiter })
    trace.push(s)
    for (let i = 0; i < 200 && !s.done; i++) {
      s = d.stepDissolve(s)
      trace.push(s)
    }
    return trace
  }

  it('the dissolve trajectory replays identically (same frames, same naps)', async () => {
    const d = await loadDissolve()
    expect(playOut(d)).toEqual(playOut(d))
    expect(playOut(d, true), 'the baiter dissolve is deterministic too').toEqual(playOut(d, true))
  })

  it('the decode replays identically and never mutates its input', async () => {
    const pics = await loadDecoder()
    const input = await ashBytes()
    const snapshot = [...input]
    const a = pics.expandAshFrames(input)
    const b = pics.expandAshFrames(input)
    expect(a).toEqual(b)
    expect(input, 'the decoder must not mutate its input bytes').toEqual(snapshot)
  })

  it('stepDissolve is PURE — it never mutates the state handed in', async () => {
    const d = await loadDissolve()
    const s = d.startDissolve()
    const snap = JSON.stringify(s)
    d.stepDissolve(s)
    expect(JSON.stringify(s), 'stepDissolve must return a NEW state, not mutate its argument').toBe(
      snap,
    )
  })

  it('a completed dissolve is idempotent under further steps (removal is terminal)', async () => {
    const d = await loadDissolve()
    let s = d.startDissolve()
    for (let i = 0; i < 200 && !s.done; i++) s = d.stepDissolve(s)
    expect(s.done).toBe(true)
    expect(d.stepDissolve(s), 'stepping a done dissolve changes nothing').toEqual(s)
  })
})
