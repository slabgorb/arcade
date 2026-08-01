// tests/audio-seam-scope.test.ts
//
// Story cp5-1 — RED phase (Leeloo / TEA). The two ACs that are about what this
// story says and does NOT ship: AC5 (the bonus-life deferral banner in
// core/bonus.ts is rewritten to point at the seam that now exists) and AC6 (no
// `.wav` is committed, no R2 upload is claimed, and the docs stop advertising a
// gap that has closed WITHOUT advertising sound the game has not got).
//
// ─── WHY THESE ASSERTIONS ARE WRITTEN IN BOTH DIRECTIONS ─────────────────────
// A doc assertion that only searches for a new phrase matches a TOKEN, not the
// CLAIM: it goes green the moment someone appends the phrase, while the stale
// sentence sits three lines above it contradicting the whole file. So every
// check below is a PAIR — the stale claim must be GONE, and the honest one must
// be PRESENT. The negative half is the one with teeth; a "seam" section added
// under a status line still reading "playable and silent" is the exact failure
// this shape catches.
//
// The epic's own guardrail is the reason AC6 matters more than it looks:
// @shared/audio degrades SILENTLY at every failure path — no WebAudio, blocked
// autoplay, failed fetch, undecodable sample all leave the game quiet and never
// throw. So a manifest full of filenames that do not exist yet is
// indistinguishable, at runtime and in this suite, from working audio. The only
// defence is that the docs say plainly which one it is.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const gameRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const bonusPath = join(gameRoot, 'src', 'core', 'bonus.ts')
const readmePath = join(gameRoot, 'README.md')

const bonusSrc = (): string => readFileSync(bonusPath, 'utf8')
const readmeSrc = (): string => readFileSync(readmePath, 'utf8')

/** Markdown prose wraps, and the status block is a `>` blockquote — so the
 *  sentence "there is no `src/shell/audio.ts`, no event channel and no
 *  dispatch." is split across two lines with a `> ` in the middle of it. A
 *  regex written against the sentence as a human reads it silently fails to
 *  match the file as it is stored, and the assertion passes while the stale
 *  claim sits there untouched. (It did exactly that on the first cut of this
 *  file.) Strip the quote markers and collapse whitespace before matching any
 *  multi-word claim. */
const normalized = (md: string): string => md.replace(/^\s*>\s?/gm, ' ').replace(/\s+/g, ' ')

/** Every file under a directory, recursively. */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : walk(full)
    return [full]
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// AC5 — the deferral banner in core/bonus.ts becomes a pointer to the seam
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-1 AC5 — bonus.ts stops deferring the bonus-life sound', () => {
  it('no longer says the sound is DEFERRED or deliberately not stubbed', () => {
    // The banner as it stands (src/core/bonus.ts:30-35) reads: "It is DEFERRED
    // to cp5 with the rest of the audio, and deliberately not stubbed — an
    // empty hook would be dead code pretending to be a seam." cp5 IS this
    // story; leaving that sentence in place makes the file lie about its own
    // repo.
    const src = bonusSrc()
    expect(src, 'the deferral is closed — bonus.ts must stop saying it is DEFERRED').not.toMatch(
      /DEFERRED to cp5/,
    )
    expect(src, 'the "deliberately not stubbed" rationale is spent').not.toMatch(
      /deliberately not stubbed/,
    )
  })

  it('still cites the ROM line the cue comes from — the fidelity claim is not collateral', () => {
    // The rewrite must not throw away the citation with the deferral. The cue
    // is CENTI4.MAC:1994-1995 "LDA I,17. / STA CHAN4 ;BONUS LIFE SOUND".
    const src = bonusSrc()
    expect(src, 'the ROM citation for the bonus-life sound must survive the rewrite').toMatch(
      /1994-1995/,
    )
    expect(src, 'CHAN4 is the cabinet channel the cue rides').toMatch(/CHAN4/)
  })

  it('points at the seam that now exists', () => {
    // The positive half: name the modules a reader should go to next.
    //
    // `bonus-life` is deliberately NOT in this alternation. The first cut of
    // this test included it and passed on the UNCHANGED file — bonus.ts:31
    // already reads "is the bonus-life sound", so the assertion matched the
    // very deferral it was meant to replace. Every alternative below is
    // absent from bonus.ts today (verified), so this reds until the rewrite.
    const src = bonusSrc()
    expect(
      /core\/events|shell\/audio|audio-dispatch|events\.ts|SOUNDS/.test(src),
      'the rewritten banner must point at the event channel / manifest that now exists',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC6 — no samples ship, and nothing claims they do
// ═════════════════════════════════════════════════════════════════════════════

describe('cp5-1 AC6 — this story ships the seam and NO audio data', () => {
  it('commits no .wav (or any other sample) anywhere in the plugin', () => {
    const samples = walk(gameRoot).filter((f) => /\.(wav|mp3|ogg|m4a|flac)$/i.test(f))
    expect(
      samples.map((f) => f.slice(gameRoot.length + 1)),
      'cp5-1 ships the seam only — later stories bake and upload the samples',
    ).toEqual([])
  })

  it('claims no R2 upload — the manifest names files that do not exist yet', () => {
    // The epic's rule is that a LIVE 200 is the acceptance test for an asset
    // story, and this is explicitly not one. A test or doc asserting the files
    // are hosted would be asserting something nobody has checked.
    const audioPath = join(gameRoot, 'src', 'shell', 'audio.ts')
    if (!existsSync(audioPath)) {
      throw new Error('cp5-1 not implemented yet: src/shell/audio.ts must exist.')
    }
    const src = readFileSync(audioPath, 'utf8')
    expect(src, 'do not claim the samples are uploaded — none are').not.toMatch(
      /uploaded|hosted and verified|confirmed 200|curl-verified/i,
    )
  })
})

describe('cp5-1 AC6 — the README stops advertising a gap that has closed', () => {
  it('the status block no longer says there is no audio.ts, event channel or dispatch', () => {
    // README.md:11-20 — the PRIMARY stale claim, and the one a reader meets
    // first. It currently reads "there is no `src/shell/audio.ts`, no event
    // channel and no dispatch." — wrapped across two blockquote lines, hence
    // `normalized`.
    const src = normalized(readmeSrc())
    expect(src, 'the seam exists now — the status block must stop denying it').not.toMatch(
      /no event channel and no dispatch/i,
    )
    expect(src, 'src/shell/audio.ts exists as of this story').not.toMatch(
      /there is no `?src\/shell\/audio\.ts`?/i,
    )
    // The deferral pointer in the same block goes with it.
    expect(src, 'the bonus-life sound is no longer "deferred by name in the source"').not.toMatch(
      /deferred by name in the source/i,
    )
  })

  it('the shared-library section no longer says centipede does not consume @shared/audio', () => {
    // README.md:121-123 — the second stale claim.
    const src = readmeSrc()
    const consumesLine = /does \*\*not\*\* consume[\s\S]{0,200}?@shared\/audio/
    expect(src, 'centipede consumes @shared/audio as of this story').not.toMatch(consumesLine)
  })

  it('says plainly that the seam exists but no samples ship yet', () => {
    // The positive half — and the guard against "fixing" the two negatives
    // above by simply deleting the sentences and leaving a reader with nothing.
    //
    // Both alternations are built ONLY from tokens absent from the README
    // today (verified: audio-dispatch, core/events, SOUNDS, manifest, "no
    // samples", "not yet baked", arcade-assets all appear 0 times). The first
    // cut used `@shared/audio` and `silent`, which the CURRENT README already
    // contains — in the very sentence saying the seam does not exist — so it
    // passed on the unchanged file and asserted nothing.
    const src = normalized(readmeSrc())
    expect(
      /audio-dispatch|core\/events|SOUNDS|manifest/i.test(src),
      'the README must name the seam that now exists (the event channel, manifest or dispatch)',
    ).toBe(true)
    expect(
      /no samples|no `?\.wav`?|not yet baked|no audio data|samples are not|no sample/i.test(src),
      'the README must still say the game makes no sound yet — the seam is not the sound',
    ).toBe(true)
  })

  it('does not claim centipede now HAS sound', () => {
    // NOTE: this one is shared with cp5-2's block below — the seam being wired
    // does not make the cabinet audible, and the README must not start saying
    // it does just because main.ts now calls the dispatch.
    // The failure this whole AC exists to prevent: the seam landing and the
    // docs reading as though the cabinet is audible, when every cue resolves
    // to a 404 the shared engine swallows in silence.
    const src = readmeSrc()
    expect(src, 'no sample is hosted yet — the game cannot be described as audible').not.toMatch(
      /\bnow (?:has|with) (?:full )?(?:sound|audio)\b/i,
    )
    expect(src).not.toMatch(/\bfully voiced\b|\bsound is live\b/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// cp5-2 — REWORK (Reviewer round 1, HIGH). The same guard, one story later.
// ═════════════════════════════════════════════════════════════════════════════
//
// cp5-1 spent the six tests above making the README tell the truth about a seam
// that had just landed. cp5-2 wired that seam into main.ts and left the README
// saying the opposite — every clause of its status block false as of 6c2bf1a:
// "The shell is **not connected**", "`main.ts` calls neither `createAudio` nor
// `playEventSounds`", "unreachable in play", "That is story `cp5-2`". Nothing
// caught it, because cp5-1's tests guard cp5-1's claims and this was a new one.
//
// That is a bigger deal in this epic than it would be anywhere else, and the
// reason is written at the top of this file: @shared/audio degrades SILENTLY at
// every failure path, so a working cabinet and a broken one are
// indistinguishable to the whole suite. The docs are the mechanism. A status
// block that describes the wrong build is not a documentation nit here — it is
// the safety net reading backwards.
//
// Same shape as above, and for the same reason: a PAIR per claim. The stale
// sentence must be GONE and the honest one PRESENT, because a "now wired" line
// appended under a paragraph still reading "not connected" is precisely the
// failure being guarded against.

describe('cp5-2 — the README stops saying the shell is unwired, because it is wired', () => {
  it('no longer claims main.ts calls neither createAudio nor playEventSounds', () => {
    // main.ts imports both (main.ts:20-21), builds the engine at main.ts:102
    // and dispatches at main.ts:203. Every one of these sentences is false on
    // the shipped tree. (Round 2: the bare `:91`/`:192` forms this note first
    // used went stale when the `?seed=` block grew main.ts by 11 lines — the
    // prefixed spellings are the ones tests/audio-citations.test.ts re-checks.)
    const src = normalized(readmeSrc())
    expect(src, 'main.ts calls both — it builds the engine and dispatches per step').not.toMatch(
      /`main\.ts` calls neither/i,
    )
    expect(src, 'the shell IS connected as of cp5-2').not.toMatch(
      /The shell is \*\*not connected\*\*/i,
    )
    expect(src, 'the seam is reached on every stepped frame of live play').not.toMatch(
      /unreachable in play/i,
    )
  })

  it('no longer names cp5-2 as the future story that will do it', () => {
    // The tell that the block was never re-read: it points forward at the story
    // that had already shipped by the time anyone could read it.
    const src = normalized(readmeSrc())
    expect(src, 'cp5-2 is done — it cannot be the story that will connect the shell').not.toMatch(
      /That is story `?cp5-2`?/i,
    )
    expect(src, 'with the wiring landed, only the samples are still missing').not.toMatch(
      /\*\*Two\*\* things are still missing/i,
    )
  })

  it('says plainly that the shell IS wired now, and as of which story', () => {
    // The positive half — the guard against "fixing" the negatives by deleting
    // the paragraph and leaving a reader with no status at all.
    //
    // Both alternations were built ONLY from tokens the README did not contain
    // WHEN THIS WAS WRITTEN — verified against the pre-rewrite file: "as of
    // cp5-2", "cp5-2 wired" and "cp5-2 connected" all appeared 0 times, and
    // `cp5-2` occurred exactly once, in the "That is story" sentence the test
    // above deletes. That is why it reddened until the rewrite instead of
    // passing on the file as it stood. (The rewrite has since landed, so the
    // tokens are present now — this note records the measurement, not the
    // current state.)
    const src = normalized(readmeSrc())
    expect(
      /as of `?cp5-2`?|cp5-2 (?:wired|connected)/i.test(src),
      'the status block must say the shell is wired into main.ts, and name cp5-2 as the ' +
        'story that did it — not merely stop denying it',
    ).toBe(true)
  })

  it('warns that the first gesture now produces a wall of 404s, and that they are expected', () => {
    // The cost the epic knowingly accepted, and the one thing a reader opening
    // devtools will actually meet. There are FOURTEEN — one per SOUNDS entry
    // (measured: SOUNDS has 14 keys, src/shell/audio.ts), fired the moment
    // resume() opens the gate, all against arcade-assets.slabgorb.com. They look
    // exactly like a bug and are not, and until the asset stories land nothing
    // else explains them.
    //
    // `\b14\b` and "expected"/"harmless" were absent from the pre-rewrite
    // README (verified), so both halves reddened. "404" alone was NOT — that
    // text already said wiring "would buy nothing but 404s" — which is why the
    // COUNT carries this assertion and a bare /404/ would have passed
    // vacuously. Same note as above: this records the measurement taken when
    // the assertion was written, not the state of the file today.
    const src = normalized(readmeSrc())
    expect(
      /\b14\b[\s\S]{0,120}404|404[\s\S]{0,120}\b14\b/.test(src),
      'the README must say how many 404s appear (14 — one per SOUNDS entry) so the next ' +
        'person does not go hunting for a bug that is the missing samples',
    ).toBe(true)
    expect(
      /expected|harmless|not a bug/i.test(src),
      'the 404s must be described as expected, not merely mentioned — a console full of red ' +
        'reads as a fault unless the docs say otherwise',
    ).toBe(true)
  })
})
