// tests/audio-manifest.test.ts
//
// Story jt5-1 — RED phase (Mr. Praline / TEA). The SHELL half of the seam:
// joust's own NUMBERS (the SOUNDS name->file manifest, the CHANNELS voice map,
// the R2 base URL) handed to the shared engine's VERB.
//
// Covers AC1 (the shared-versus-standalone question is recorded as MOOT by
// simply importing `@shared/audio` — no pin, no git-URL dependency, no version
// bump) and the manifest half of AC4 (every event kind's cue exists, and the
// channel map cannot silently steal a voice the ROM would not have stolen).
//
// ─── AC1 IS A NEGATIVE CLAIM, SO IT IS TESTED AS ONE ─────────────────────────
// "Recorded as MOOT, not re-litigated" cannot be proven by the presence of an
// import — a git-URL dependency and a workspace pin BOTH produce a working
// import. What makes the question moot is that there is nothing to pin: the
// 2026-07-30 collapse put src/shared in-tree behind the `@shared/*` alias
// declared in vite.config.ts, vitest.config.ts and tsconfig.json. So the tests
// below assert the ABSENCE of every ceremony the pre-collapse world required,
// as well as the presence of the import.
//
// joust's `@shared` consumption was measured at ZERO on 2026-07-31 (battlezone
// 13, star-wars 11, tempest 10, asteroids 10, red-baron 8, centipede 5, joust
// 0). This story lands its first. Nothing in tests/ guarded that zero, so
// nothing reddens as it goes — which is precisely why the count is asserted
// here instead, in the direction it is about to move.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { load } from './helpers/dynamic-load'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const audioPath = join(root, 'src', 'shell', 'audio.ts')

// ─── the not-yet-existing module (computed specifier — see audio-events.ts) ──

interface ManifestModule {
  SOUNDS: Readonly<Record<string, string>>
  CHANNELS: Readonly<Record<string, string>>
  CUE_SOURCES: Readonly<Record<string, { kind: string; priority?: number }>>
  DEFAULT_BASE_URL: string
  createAudioEngine: (baseUrl?: string) => unknown
}

const loadManifest = (): Promise<Partial<ManifestModule>> =>
  load<ManifestModule>(import.meta.url, ['..', 'src', 'shell', 'audio'])

async function need<K extends keyof ManifestModule>(key: K): Promise<ManifestModule[K]> {
  const value = (await loadManifest())[key]
  if (value === undefined) {
    throw new Error(`jt5-1 not implemented yet: src/shell/audio.ts must export \`${String(key)}\`.`)
  }
  return value as ManifestModule[K]
}

async function eventKinds(): Promise<readonly string[]> {
  const kinds = (await load<{ EVENT_KINDS: readonly string[] }>(import.meta.url, ['..', 'src', 'core', 'events']))
    .EVENT_KINDS
  if (kinds === undefined) {
    throw new Error('jt5-1 not implemented yet: src/core/events.ts must export `EVENT_KINDS`.')
  }
  return kinds
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the shared engine is imported, and NOTHING is pinned
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC1 — joust adopts @shared/audio, and the ruling is moot because nothing is pinned', () => {
  it('src/shell/audio.ts exists', () => {
    expect(existsSync(audioPath), 'jt5-1 must create src/shell/audio.ts').toBe(true)
  })

  it('it imports the engine from the in-tree `@shared/audio` alias', () => {
    expect(existsSync(audioPath), 'jt5-1 must create src/shell/audio.ts').toBe(true)
    expect(
      readFileSync(audioPath, 'utf8'),
      "the engine must come from '@shared/audio' — the alias declared in vite.config.ts, " +
        'vitest.config.ts and tsconfig.json',
    ).toMatch(/from\s+['"]@shared\/audio['"]/)
  })

  it('it does NOT reach the shared library by the pre-collapse package name', () => {
    // `@arcade/shared` was the npm/git-URL package before the 2026-07-30
    // collapse. `no @arcade/shared dependency survives anywhere` is already a
    // monorepo-wide invariant; this keeps the new file from being the exception.
    expect(existsSync(audioPath), 'jt5-1 must create src/shell/audio.ts').toBe(true)
    expect(
      readFileSync(audioPath, 'utf8'),
      'the pre-collapse package name is dead — use the @shared alias',
    ).not.toMatch(/@arcade\/shared/)
  })

  it('it does NOT tunnel into src/shared by a relative path, sidestepping the alias', () => {
    // A `../../../src/shared/audio` import works and typechecks, and it would
    // quietly make joust the one game that does not go through the alias — so
    // a later alias change would break six games and leave this one lying.
    expect(existsSync(audioPath), 'jt5-1 must create src/shell/audio.ts').toBe(true)
    expect(
      readFileSync(audioPath, 'utf8'),
      'reach the shared library through the alias, not a relative path',
    ).not.toMatch(/from\s+['"][.]{1,2}\/[^'"]*\/shared\//)
  })

  it('the plugin declares NO dependency — there is no pin, no git URL and no version to bump', () => {
    // The whole of AC1's "no pin, no git-URL dependency and no version bump",
    // stated where it can be checked. joust's package.json is the
    // `{name, version, private}` stub every plugin is; growing a `dependencies`
    // block is exactly the ceremony the collapse removed.
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as Record<
      string,
      unknown
    >
    expect(Object.keys(pkg).sort()).toEqual(['name', 'private', 'version'])
  })

  it('joust now consumes @shared — and the count is no longer zero', async () => {
    // The measured zero is what made joust the fleet's outlier. Assert the
    // change in the direction it moves, since nothing else in tests/ does.
    const sounds = await need('SOUNDS')
    expect(sounds, 'precondition: the manifest exists').toBeTruthy()
    expect(
      readFileSync(audioPath, 'utf8').match(/@shared\/[a-z-]+/g) ?? [],
      "joust's first @shared import lands in this story",
    ).toContain('@shared/audio')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC4 (manifest half) — the numbers, and total coverage of the union
// ═════════════════════════════════════════════════════════════════════════════

describe('jt5-1 AC4 — the manifest carries joust’s numbers', () => {
  it('the base URL is joust’s own prefix on the assets host', async () => {
    // One origin per game under the shared assets bucket — the fleet convention
    // (tempest: .../tempest/sfx/). Note the bucket behind this hostname is named
    // plain `arcade`; nothing in this story uploads to it.
    await expect(need('DEFAULT_BASE_URL')).resolves.toBe(
      'https://arcade-assets.slabgorb.com/joust/sfx/',
    )
  })

  it('SOUNDS maps every cue to a distinct .wav filename', async () => {
    const sounds = await need('SOUNDS')
    const names = Object.keys(sounds)
    expect(names.length, 'SOUNDS must not be empty').toBeGreaterThan(0)
    for (const [name, file] of Object.entries(sounds)) {
      expect(file, `${name} must name a .wav file`).toMatch(/^[a-z0-9_]+\.wav$/)
    }
  })

  // RE-AIMED by jt9-7 (O'Brien / TEA), which was asked to decide whether this
  // map should exist at all. It should — see `tests/audio-channel-role.test.ts`
  // for the decision and its three measurements — but the assertion that used to
  // stand here, `CHANNELS gives every SOUNDS entry a voice`, was not the reason.
  // It was REDUNDANT WITH `tsc`: `Readonly<Record<SoundName, string>>` already
  // makes a missing key `error TS2741` and an extra key an excess-property
  // error, and CI runs `npm run lint` before this project. The three stories
  // that "had to feed the map" were fed by the compiler, not by this test.
  //
  // What is left worth stating at runtime is the ASYMMETRY the compiler states
  // only in passing: `channels` is total over the cue union while `priorities`
  // is a `Partial` built by a filter, so routing is the floor under arbitration
  // rather than a parallel to it. What the map GUARANTEES beyond that — the ROM
  // priority partition, in both directions, and the tail it still cuts once the
  // arbitrated window is released — is pinned in that same jt9-7 file.
  it('CHANNELS routes every cue — the floor under an arbitration that is only Partial', async () => {
    const [sounds, channels] = await Promise.all([need('SOUNDS'), need('CHANNELS')])
    expect(Object.keys(channels).sort()).toEqual(Object.keys(sounds).sort())
  })

  it('createAudioEngine builds an engine with the shared surface', async () => {
    const make = await need('createAudioEngine')
    const engine = make('https://example.invalid/joust/sfx/') as Record<string, unknown>
    for (const method of ['resume', 'play', 'startLoop', 'stopLoop', 'ready']) {
      expect(typeof engine[method], `the engine must expose ${method}()`).toBe('function')
    }
    // The engine degrades silently with no WebAudio present — constructing it
    // must not throw in the node test environment, and `ready()` must be honest.
    expect((engine.ready as () => boolean)(), 'nothing has decoded, so ready() is false').toBe(false)
  })
})

describe('jt5-1 AC4 — the channel map cannot invert the ROM’s priority arbitration', () => {
  // joust's sound hardware is ONE voice arbitrated by PRIORITY, not N channels:
  // SND compares the incoming table's priority byte against the sounding one
  // ("CMPA SPRI  OK TO INTERUPT THIS PIRORITY SOUND? / BLO NOSND",
  // SYSTEM.SRC:767-768) and REFUSES a lower-priority interruption. `@shared/audio`
  // has no priority notion at all — a new sound on an occupied channel always
  // steals. So two cues may share a voice ONLY when the ROM gives them the same
  // priority; otherwise the cheap cue cuts off the expensive one, which is the
  // exact inversion `BLO NOSND` exists to prevent. (The full arbitration is a
  // fidelity gap this seam cannot close — see the session's Delivery Findings.)
  it('cues sharing a channel share the ROM’s priority', async () => {
    const [channels, sources] = await Promise.all([need('CHANNELS'), need('CUE_SOURCES')])
    const byChannel = new Map<string, string[]>()
    for (const [name, channel] of Object.entries(channels)) {
      byChannel.set(channel, [...(byChannel.get(channel) ?? []), name])
    }
    expect(byChannel.size, 'precondition: there is at least one channel').toBeGreaterThan(0)

    for (const [channel, names] of byChannel) {
      if (names.length < 2) continue
      const priorities = names.map((n) => {
        const source = sources[n]
        expect(source, `${n} has no CUE_SOURCES entry`).toBeTruthy()
        return source.kind === 'rom' ? source.priority : undefined
      })
      expect(
        new Set(priorities).size,
        `channel '${channel}' mixes cues of different ROM priority (${names
          .map((n, i) => `${n}=${priorities[i]}`)
          .join(', ')}) — the lower one would steal the higher one's voice, ` +
          'which SYSTEM.SRC:767-768 refuses',
      ).toBe(1)
    }
  })

  it('the voices are not all one channel either — distinct priorities keep distinct voices', async () => {
    // The control for the rule above: collapsing every cue onto one channel
    // would satisfy nothing, but collapsing onto one channel PER PRIORITY is
    // what the rule asks for.
    //
    // The comment here used to read "Eleven cues carry nine distinct ROM
    // priorities," which was already wrong when jt5-6 made the manifest 18 and
    // is corrected by jt9-7 the only way a count should be: by DERIVING both
    // sides below instead of retyping either. Measured today: 18 cues, 13
    // distinct priorities, 13 channels. The exact-equality form of this — which
    // is what catches a map that SPLITS one ROM priority across two channels,
    // something `toBeGreaterThan(1)` cannot see — is
    // `there are exactly as many channels as the ROM has distinct priorities`
    // in `tests/audio-channel-role.test.ts`.
    const [channels, sources] = await Promise.all([need('CHANNELS'), need('CUE_SOURCES')])
    const priorities = new Set(
      Object.keys(channels).map((n) => (sources[n]?.kind === 'rom' ? sources[n]?.priority : undefined)),
    )
    expect(priorities.size, 'precondition: the ROM does not give every cue one priority').toBeGreaterThan(1)
    expect(
      new Set(Object.values(channels)).size,
      'the ROM’s priorities are not all equal, so the voices cannot all be one',
    ).toBeGreaterThan(1)
  })
})

describe('jt5-1 AC4 — the manifest and the union agree', () => {
  it('every EVENT_KIND has a cue, and every cue is reachable from a kind', async () => {
    // The cross-module totality. The dispatch sweep in audio-dispatch.test.ts
    // proves each kind REACHES its cue; this proves the sets match, so a cue
    // cannot be added to the manifest with no event able to fire it (dead
    // weight in the bake) and a kind cannot exist with no cue (a silent moment).
    const [kinds, sounds] = await Promise.all([eventKinds(), need('SOUNDS')])
    expect(kinds.length, 'precondition: the union is not empty').toBeGreaterThan(0)
    // RE-SEATED by jt5-6 (Mr. Praline / TEA). This asserted
    // `Object.keys(sounds).length === kinds.length` — one cue per kind, exactly.
    // That stopped being the invariant when `player-materialise` gained a player
    // id and began reaching TWO cues (SNPCR1 for knight 1, SNPCR2 for knight 2),
    // making the manifest 18 against a 17-entry tuple. The count was never the
    // real property anyway; REACHABILITY was, and a count cannot see it — a cue
    // named for no kind and a kind with no cue cancel out perfectly.
    //
    // The strong form needs the dispatch, so it lives with it:
    // `every cue in the manifest is reachable from some event` in
    // tests/audio-transporter-split.test.ts sweeps EVENT_KINDS against the real
    // dispatch (payloads included) and asserts the played set IS this manifest.
    // What survives here is the half that needs no dispatch, stated so it still
    // bites: a manifest may not shrink below the union it serves.
    expect(
      Object.keys(sounds).length,
      'every kind still needs a cue — the manifest cannot be smaller than the union',
    ).toBeGreaterThanOrEqual(kinds.length)
  })
})
