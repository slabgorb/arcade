// tests/audio-dispatch-convention.test.mjs
//
// SH4-5 (epic SH4, "Shared-library extraction") — the DESIGN-GATE resolution.
//
// The story asked to "retire the audio-dispatch.ts duplication across all 7 games …
// lift the TYPE at minimum." The Architect's design gate (recorded in full at
// sprint/context/context-story-SH4-5.md → "## Design Gate Decision") found there is
// NOTHING to lift: the shared engine contract already lives in `@shared/audio`
// (`AudioEngine<N>`), and what the title called "the identical SoundPlayer type" is a
// `Pick` (a TS builtin) over SEVEN DIFFERENT engine types with five distinct member
// sets. The residue is a ~6-line idiom + each game's own ROM cue map, which the epic's
// own rule ("share the VERB, not the NUMBERS") keeps in the games. So SH4-5 ships no
// new shared export and ZERO changes under plugins/ — it PINS the convention the seven
// dispatchers already follow, so a new game (or a careless edit) can't silently drift.
//
// WHY THE AST, NOT A REGEX (the mc10-6 ruling): a line/text scan for `never` or
// `AudioEngine` leaks through comments and string literals — a dispatcher could satisfy
// a grep with a comment and violate the convention in code. The TypeScript compiler API
// is trivia-blind: comment prose can never satisfy a check here. The AC-4 controls below
// PROVE that (a comment-only `never` fails AC-3's predicate), so this guard is not
// vacuous even though all seven files pass it today.
//
// Convention pinned (mirrors the 5 clauses documented in src/shared/audio.ts's header):
//   AC-1  the dispatch-file owners are EXACTLY the seven vector/raster games with a
//         standalone src/shell/audio-dispatch.ts (pac-man folds dispatch inline into a
//         stateful driver; star-wars uses lookup tables — both are deliberate exemptions
//         pinned by set identity, not by count).
//   AC-2  every dispatch function narrows the engine to a same-file `Pick<AudioEngine,…>`
//         slice — never the bare full engine (checked as: no parameter is typed bare
//         `AudioEngine`; the local Pick tracks the game's real engine signatures).
//   AC-3  exhaustiveness is anchored by an explicit `never`-typed binding inside a
//         function body (the switch-default / closed-union anchor).
//   AC-4  restrictive-direction controls: inline fixtures run through the SAME predicates
//         prove a violation is REJECTED and a comment cannot pass.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import ts from 'typescript'

const repo = resolve(import.meta.dirname, '..')
const pluginsDir = join(repo, 'plugins')

// The pinned owner set. Changing it is a deliberate one-line baseline edit — and a new
// dispatch file automatically enters the AC-2/AC-3 sweep below.
const EXPECTED_OWNERS = [
  'asteroids',
  'battlezone',
  'centipede',
  'joust',
  'missile-command',
  'red-baron',
  'tempest',
]

const dispatchPath = (game) => join(pluginsDir, game, 'src', 'shell', 'audio-dispatch.ts')

function parse(src) {
  return ts.createSourceFile('dispatch.ts', src, ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TS)
}

// AC-2 predicate — does ANY parameter type the audio surface as the bare `AudioEngine`?
// A `Pick<AudioEngine, …>` param types on the `Pick` reference, not on `AudioEngine`, so
// it passes; a param typed `SoundPlayer`/`SoundSurface` (a same-file alias) passes too.
function hasBareAudioEngineParam(src) {
  const sf = parse(src)
  let bad = false
  const walk = (n) => {
    if (
      ts.isParameter(n) &&
      n.type &&
      ts.isTypeReferenceNode(n.type) &&
      ts.isIdentifier(n.type.typeName) &&
      n.type.typeName.text === 'AudioEngine'
    ) {
      bad = true
    }
    ts.forEachChild(n, walk)
  }
  walk(sf)
  return bad
}

// AC-3 predicate — is there a `never`-annotated variable binding INSIDE a function body?
// Module-scope `const x: never` (were it to exist) is not an exhaustiveness anchor, so we
// require function ancestry. Comment/string `never` cannot reach the AST, so it can't pass.
const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
])

function hasNeverAnchorInFunction(src) {
  const sf = parse(src)
  let found = false
  const walk = (n, inFn) => {
    const nowInFn = inFn || FUNCTION_KINDS.has(n.kind)
    if (
      nowInFn &&
      ts.isVariableDeclaration(n) &&
      n.type &&
      n.type.kind === ts.SyntaxKind.NeverKeyword
    ) {
      found = true
    }
    ts.forEachChild(n, (c) => walk(c, nowInFn))
  }
  walk(sf, false)
  return found
}

function ownersOnDisk() {
  return readdirSync(pluginsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((game) => existsSync(dispatchPath(game)))
    .sort()
}

// ── AC-1: identity, not count ────────────────────────────────────────────────
test('SH4-5 AC-1: the audio-dispatch.ts owners are EXACTLY the seven expected games', () => {
  assert.deepEqual(
    ownersOnDisk(),
    [...EXPECTED_OWNERS].sort(),
    'The set of plugins with a standalone src/shell/audio-dispatch.ts drifted. If a game ' +
      'gained or lost one, update EXPECTED_OWNERS deliberately (and confirm pac-man/star-wars ' +
      'stay exempt by design).',
  )
})

// ── AC-2: every dispatch narrows the engine (no bare AudioEngine param) ───────
test('SH4-5 AC-2: no dispatch file types a parameter as the bare AudioEngine', () => {
  const violators = ownersOnDisk().filter((game) =>
    hasBareAudioEngineParam(readFileSync(dispatchPath(game), 'utf8')),
  )
  assert.deepEqual(
    violators,
    [],
    `These dispatch files pass the full engine instead of a same-file Pick<AudioEngine,…> ` +
      `slice: ${violators.join(', ')}`,
  )
})

// ── AC-3: exhaustiveness is anchored by a never-typed binding in a function ───
test('SH4-5 AC-3: every dispatch file carries a never-typed exhaustiveness anchor in a function body', () => {
  const missing = ownersOnDisk().filter(
    (game) => !hasNeverAnchorInFunction(readFileSync(dispatchPath(game), 'utf8')),
  )
  assert.deepEqual(
    missing,
    [],
    `These dispatch files lost their explicit \`const _: never\` exhaustiveness anchor: ${missing.join(', ')}`,
  )
})

// ── AC-4: restrictive-direction controls — the predicates have teeth ─────────
// If these ever pass in the wrong direction, the AC-2/AC-3 sweeps above are vacuous.
const FIXTURE_BARE_PARAM = `
import type { AudioEngine } from './audio'
export function playEventSounds(audio: AudioEngine, events) {
  for (const e of events) audio.play(e.kind)
}
`

const FIXTURE_COMMENT_ONLY_NEVER = `
import type { AudioEngine } from './audio'
type SoundPlayer = Pick<AudioEngine, 'play'>
export function playEventSounds(audio: SoundPlayer, events) {
  for (const e of events) {
    switch (e.kind) {
      case 'x': audio.play('x'); break
      // default: { const _exhaustive: never = e }   <-- anchor only in a COMMENT
    }
  }
}
`

const FIXTURE_COMPLIANT = `
import type { AudioEngine } from './audio'
type SoundPlayer = Pick<AudioEngine, 'play'>
export function playEventSounds(audio: SoundPlayer, events) {
  for (const e of events) {
    switch (e.kind) {
      case 'x': audio.play('x'); break
      default: { const _exhaustive: never = e; void _exhaustive }
    }
  }
}
`

test('SH4-5 AC-4a: the AC-2 predicate REJECTS a bare-AudioEngine param', () => {
  assert.equal(hasBareAudioEngineParam(FIXTURE_BARE_PARAM), true)
})

test('SH4-5 AC-4b: the AC-3 predicate is trivia-blind — a comment-only never does NOT satisfy it', () => {
  assert.equal(hasNeverAnchorInFunction(FIXTURE_COMMENT_ONLY_NEVER), false)
})

test('SH4-5 AC-4c: a minimal compliant dispatcher PASSES both predicates', () => {
  assert.equal(hasBareAudioEngineParam(FIXTURE_COMPLIANT), false)
  assert.equal(hasNeverAnchorInFunction(FIXTURE_COMPLIANT), true)
})
