// plugins/missile-command/tests/mc8-3-audio-asset-loop.test.ts
//
// Story mc8-3 — RED phase (Tyr One-Handed / TEA). "Verify audio live and close
// the asset loop." This is a VERIFICATION story: a green vitest is NOT proof of
// sound (contract 5 — @shared/audio degrades to SILENCE, so a broken/absent
// asset is indistinguishable from working code in an automated run). The only
// thing that proves audibility is a human at `just serve` → /missile-command/;
// this file guards the two halves of the story that CAN be pinned in CI.
//
// ── SM CORRECTION (context-story-mc8-3.md): Branch (A) is void ────────────────
// The story description branches: (A) IF sound was baked to files → upload to the
// R2 bucket `arcade` and prove each with a live 200; (B) IF runtime-synth →
// confirm NO external asset is required and the served game is audible OFFLINE.
// SM measured the tree: MC audio is runtime-synth (src/shell/audio.ts:84-86,133 —
// a vendored POKEY AudioWorkletProcessor, referenced by `import.meta.url` so Vite
// bundles it; no fetch/Audio/.wav/R2 anywhere). Branch (A) is DEAD — there are no
// baked files to upload. So this file proves Branch (B).
//
// ── WHAT THIS FILE PROVES, and its RED/GREEN split ────────────────────────────
//  BLOCK 1 (regression guard — PASSES on arrival): the "no external asset"
//    invariant. The engine must resolve its ONE dependency (the POKEY worklet) as
//    a bundled module via `import.meta.url`, never from an external origin, and
//    that vendored file must physically exist in-tree so the build can include it.
//    This is green today BY DESIGN (nothing to implement) — it is the guard that
//    keeps a future edit from re-opening the asset loop (e.g. re-pointing the
//    worklet at `https://arcade.slabgorb.com/...` or a `fetch()`), which is
//    exactly the class of regression the story exists to foreclose. Its
//    non-vacuity (concrete, re-runnable mutant): replace the audio.ts worklet URL
//    literal `'../../../star-wars/tools/pokey-bake/vendor/pokey.js'` with
//    `'https://arcade.slabgorb.com/pokey.js'` — the `not.toMatch(/https?:\/\//)`
//    guard below then reddens the BLOCK-1 describe.
//  BLOCK 2 (the RED work — FAILS until Dev records evidence): AC1 demands the
//    audible confirmation be "evidence recorded, not asserted", and the AC demands
//    "if runtime-synth: the game is audible with no external asset fetch" be
//    recorded in docs/ops/hosting.md. Today hosting.md documents only star-wars'
//    BAKED asset manifest and says nothing about missile-command's runtime-synth
//    audio. GREEN is Dev doing the live smoke test (serve → listen, network
//    offline) and recording the result — the runtime-synth verdict, the closed
//    asset loop, and the offline-audible evidence — in a missile-command audio
//    section of hosting.md.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const testsDir = dirname(fileURLToPath(import.meta.url))
const pluginRoot = join(testsDir, '..')
// docs/ops/hosting.md lives at the repo root: plugins/missile-command/ → ../../
const repoRoot = resolve(pluginRoot, '..', '..')

const audioSrc = readFileSync(join(pluginRoot, 'src', 'shell', 'audio.ts'), 'utf8')

// ─── BLOCK 1: the "no external asset" invariant (regression guard) ────────────
describe('mc8-3 — MC audio requires no external asset (asset loop closed)', () => {
  it('references the POKEY worklet as a bundled module via import.meta.url, not an external URL', () => {
    // The one dependency is the vendored worklet. It must be resolved relative to
    // the module (so Vite bundles it into dist/missile-command/), never fetched
    // from an origin.
    expect(audioSrc, 'audio.ts must resolve the worklet via new URL(..., import.meta.url)').toMatch(
      /new URL\(\s*['"][^'"]*pokey\.js['"]\s*,\s*import\.meta\.url\s*,?\s*\)/,
    )
  })

  it('fetches no external audio asset — no http(s) origin, no fetch(), no HTMLAudio, no baked media literal', () => {
    // Each of these would re-open the asset loop the story is closing. The worklet
    // path is a bare relative `pokey.js`, so none of these substrings is present.
    expect(audioSrc, 'no external origin (http/https) may appear in the audio engine').not.toMatch(
      /https?:\/\//,
    )
    expect(audioSrc, 'the audio engine must not fetch() an asset').not.toMatch(/\bfetch\s*\(/)
    expect(audioSrc, 'the audio engine must not construct an HTMLAudioElement').not.toMatch(
      /\bnew Audio\s*\(/,
    )
    expect(audioSrc, 'no baked media file (.wav/.mp3/.ogg) may be referenced').not.toMatch(
      /\.(wav|mp3|ogg)\b/i,
    )
    expect(audioSrc, 'no reference to the `arcade` asset bucket / its host').not.toMatch(
      /arcade[-.]?(assets)?\.slabgorb|arcade-assets|r2\.cloudflarestorage/i,
    )
  })

  it('the vendored worklet the build depends on physically exists in-tree', () => {
    // "Closing the asset loop" means the only dependency is present in the repo,
    // not a dangling external. Resolve the exact path audio.ts names and stat it.
    const worklet = resolve(pluginRoot, 'src', 'shell', '..', '..', '..', 'star-wars', 'tools', 'pokey-bake', 'vendor', 'pokey.js')
    expect(existsSync(worklet), `vendored POKEY worklet must exist at ${worklet}`).toBe(true)
  })
})

// ─── BLOCK 2: the live-verification evidence is recorded (the RED work) ────────
describe('mc8-3 — docs/ops/hosting.md records the live-audio verification (Branch B)', () => {
  const hostingPath = join(repoRoot, 'docs', 'ops', 'hosting.md')
  const hosting = readFileSync(hostingPath, 'utf8')

  // Slice the markdown section that documents missile-command's audio: from a
  // heading naming both missile-command AND audio/sound/POKEY, up to the next
  // heading of the same-or-shallower level. Proximity matters — the required
  // claims must live together in THIS record, not be scattered across the runbook
  // (project memory: "prose guards need resolution and controls").
  const section = ((): string | null => {
    const lines = hosting.split('\n')
    const isHeading = (l: string): number => (/^(#{1,6})\s/.exec(l)?.[1].length ?? 0)
    let start = -1
    let startLevel = 0
    for (let i = 0; i < lines.length; i++) {
      const lvl = isHeading(lines[i])
      if (lvl > 0 && /missile[-\s]?command/i.test(lines[i]) && /audio|sound|pokey/i.test(lines[i])) {
        start = i
        startLevel = lvl
        break
      }
    }
    if (start === -1) return null
    let end = lines.length
    for (let i = start + 1; i < lines.length; i++) {
      const lvl = isHeading(lines[i])
      if (lvl > 0 && lvl <= startLevel) {
        end = i
        break
      }
    }
    return lines.slice(start, end).join('\n')
  })()

  it('has a missile-command audio section at all', () => {
    expect(
      section,
      'docs/ops/hosting.md must gain a heading naming missile-command audio (e.g. "Missile Command audio (mc8, runtime-synth)")',
    ).not.toBeNull()
  })

  it('records the runtime-synth verdict and the mc8-3 marker inside that section', () => {
    expect(section, 'the missile-command audio section must exist').not.toBeNull()
    const s = section ?? ''
    expect(s, 'the section must state the audio is runtime-synth (POKEY worklet)').toMatch(
      /runtime[-\s]?synth/i,
    )
    expect(s, 'the section must carry the mc8-3 marker so the record is traceable').toMatch(/mc8-3/)
  })

  it('records that the asset loop is CLOSED — no external asset / no arcade-bucket upload required', () => {
    expect(section, 'the missile-command audio section must exist').not.toBeNull()
    const s = section ?? ''
    // The closed-loop claim: missile-command needs NO external asset, so it is
    // absent from the `arcade` bucket manifest by design. The qualifier ("external"
    // or "…bucket asset") is REQUIRED so a negated sentence that merely contains the
    // fragment "no asset" (e.g. "it is NOT the case that … no asset needed") cannot
    // satisfy this — the guard must confirm the positive closed-loop claim, not a
    // stray substring (Reviewer mc8-3 round 1).
    expect(
      s,
      'the section must state no EXTERNAL asset / no <name>-bucket asset is required',
    ).toMatch(/no external asset|requires no external asset|no \S*bucket asset/i)
  })

  it('records the LIVE audible evidence, offline — not a mere assertion', () => {
    expect(section, 'the missile-command audio section must exist').not.toBeNull()
    const s = section ?? ''
    // WORD-ANCHORED on purpose: a bare /audible/ also matches the substring inside
    // "inaudible" — the NEGATIVE claim — so a section recording that the game is
    // "inaudible" would pass. `\baudible\b` cannot match "inaudible" (no word
    // boundary between "in" and "audible"), so this distinguishes the audible verdict
    // from its negation, which is the whole point of the story (Reviewer mc8-3 round 1).
    // (No negative /inaudible/ guard here: the section legitimately uses "inaudible"
    // to disclose the dev-serve gap — "MC is inaudible in dev" — so banning the word
    // would redden against the correct record. The word-anchored POSITIVE match is
    // what fixes the finding: it requires a standalone "audible" verdict and is NOT
    // satisfied by "inaudible" alone.)
    expect(s, 'the section must record that the served game was confirmed AUDIBLE (not merely "inaudible")').toMatch(
      /\baudible\b|\bplayback\b|\bplayed back\b|\bheard\b/i,
    )
    expect(s, 'the Branch-B evidence is that it stays audible with the network OFFLINE').toMatch(
      /offline|network.*(off|disabled)|no network|air[-\s]?gap/i,
    )
  })

  it('does NOT record a baked/R2-upload (Branch A) manifest for missile-command — the void branch', () => {
    // Non-empty precondition FIRST: `''.not.toMatch(...)` passes vacuously, so without
    // this a missing section would report a false "no baked-asset claim" PASS. Assert
    // the section exists before the negative control means anything (Reviewer mc8-3 round 1).
    expect(section, 'the missile-command audio section must exist for this control to be meaningful').not.toBeNull()
    const s = section ?? ''
    // Control: a copy of star-wars' baked manifest would assert live-200 / upload
    // for missile-command. Branch A is void; the section must not claim it.
    expect(
      s,
      'missile-command audio is runtime-synth — the section must not claim baked assets returning a live 200 from the bucket',
    ).not.toMatch(/\b200\b|upload(ed)?\b.*bucket|baked .*asset.*bucket/i)
  })
})
