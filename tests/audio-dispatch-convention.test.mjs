// tests/audio-dispatch-convention.test.mjs
//
// SH4-5 (epic SH4, "Shared-library extraction") — the DESIGN-GATE resolution.
// SH4-6 (same epic) — the predicate HARDENING (this file's AC-2 + AC-3 machinery).
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
// WHY THE COMPILER API, NOT A REGEX (the mc10-6 ruling): a line/text scan for `never`
// or `AudioEngine` leaks through comments and string literals — a dispatcher could
// satisfy a grep with a comment and violate the convention in code. The TypeScript
// compiler API is trivia-blind: comment prose can never satisfy a check here. The AC-4
// controls below PROVE that (a comment-only `never` fails AC-3's predicate), so this
// guard is not vacuous even though all seven files pass it today.
//
// SH4-6 — WHY A TYPE-RESOLVING PROGRAM, NOT A SYNTACTIC AST WALK (test-analyzer
// Findings 1-3 from the SH4-5 review): the original AC-2 walk matched only a parameter
// whose type node was the literal identifier `AudioEngine`, so an ALIAS
// (`type Engine = AudioEngine; audio: Engine`) or a RENAMED import
// (`import { AudioEngine as Engine }; audio: Engine`) passed the full engine straight
// through, reading as compliant. AC-2 now builds a real `ts.Program` and asks the
// TypeChecker what each parameter's type RESOLVES to — a `Pick<AudioEngine,…>` resolves
// to an anonymous object type, the full engine (however it was spelled or aliased)
// resolves to the `AudioEngine` interface symbol — so aliases and renames no longer
// evade it (AC-5 controls prove both directions). The original AC-3 walk accepted a
// `never`-typed binding ANYWHERE in a function body; it now requires that binding to
// sit inside a `switch` (the exhaustiveness position), so a stray `const _: never`
// unrelated to any switch no longer satisfies it (AC-6 controls prove it).
//
// Convention pinned (mirrors the 5 clauses documented in src/shared/audio.ts's header):
//   AC-1  the dispatch-file owners are EXACTLY the seven vector/raster games with a
//         standalone src/shell/audio-dispatch.ts (pac-man folds dispatch inline into a
//         stateful driver; star-wars inlines the same switch+never dispatch in main.ts
//         with no standalone file — both are deliberate exemptions pinned by set
//         identity, not by count).
//   AC-2  every dispatch function narrows the engine to a same-file `Pick<AudioEngine,…>`
//         slice — never the full engine. Checked by TYPE RESOLUTION: no parameter's
//         resolved type is the `AudioEngine` interface (so an alias or renamed import of
//         the full engine is caught, not just the bare identifier).
//   AC-3  exhaustiveness is anchored by an explicit `never`-typed binding sitting inside
//         a `switch` in a function body (the switch-default / closed-union anchor).
//   AC-4  restrictive-direction controls: inline fixtures run through the SAME predicates
//         prove a violation is REJECTED and a comment cannot pass.
//   AC-5  (SH4-6) AC-2's type resolution REJECTS an aliased or renamed full engine, and
//         still PASSES a Pick — whether the Pick is a same-file alias or written inline.
//   AC-6  (SH4-6) AC-3's position check REJECTS a `never` binding that is not inside a
//         switch, and PASSES one that is.

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
  'defender',
  'joust',
  'millipede',
  'missile-command',
  'red-baron',
  'tempest',
]

const dispatchPath = (game) => join(pluginsDir, game, 'src', 'shell', 'audio-dispatch.ts')

function parse(src) {
  return ts.createSourceFile('dispatch.ts', src, ts.ScriptTarget.Latest, /*setParentNodes*/ true, ts.ScriptKind.TS)
}

// ── AC-2 machinery: resolve the parameter's TYPE, don't match its spelling ────
//
// A parameter narrowed to `Pick<AudioEngine, …>` (however that Pick is named) resolves
// to an anonymous object type — its symbol is TypeScript's synthetic `__type`. The full
// engine, whether written `AudioEngine`, aliased (`type Engine = AudioEngine`) or
// imported under another name (`import { AudioEngine as Engine }`), resolves to the
// `AudioEngine` interface symbol. So "the resolved type's symbol is named AudioEngine"
// is the alias/rename-proof discriminator the syntactic walk could not express.
function isFullEngineType(type) {
  return type?.symbol?.name === 'AudioEngine'
}

// Walk every parameter in a source file and report whether ANY resolves to the full
// engine. Non-audio parameters (GameState, Input, event lists) never resolve to a type
// named `AudioEngine`, so scanning them all is safe.
function fileHasFullEngineParam(sourceFile, checker) {
  let bad = false
  const walk = (n) => {
    if (ts.isParameter(n) && n.type && isFullEngineType(checker.getTypeAtLocation(n))) {
      bad = true
    }
    ts.forEachChild(n, walk)
  }
  walk(sourceFile)
  return bad
}

// A real, path-mapped Program over on-disk files (`@shared/*` etc. resolve through the
// repo tsconfig). Used for the seven real dispatch files.
function buildProgram(files) {
  const { config } = ts.readConfigFile(join(repo, 'tsconfig.json'), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, repo)
  return ts.createProgram(files, { ...parsed.options, noEmit: true })
}

// An in-memory Program for the control fixtures: the fixture plus a stub `./audio`
// declaring an `AudioEngine` interface, and a minimal default lib. The lib MUST declare
// `Pick` — it is a lib-declared utility type, and with an empty lib `Pick<AudioEngine,…>`
// fails to resolve ("Cannot find name 'Pick'") and the parameter degrades to `any`, so the
// Pick fixtures would then pass isFullEngineType only because `any`'s symbol is ALSO
// undefined (a coincidence, not the `__type` mechanism). Declaring `Pick` here makes the
// fixture path resolve a real Pick to the same anonymous `__type` the real on-disk sweep
// sees, so the AC-4c/AC-5c "Pick passes" controls exercise the actual discriminator.
const STUB_AUDIO_MODULE = `
export interface AudioEngine {
  play(n: string): void
  startLoop(n: string): void
  stopLoop(n: string): void
}
`

// Just enough of a global lib for the fixtures: `Pick` as its real mapped-type definition.
// `keyof` is a compiler operator (needs no lib), so this one line resolves `Pick` fully.
const FIXTURE_LIB = `type Pick<T, K extends keyof T> = { [P in K]: T[P] };`

function fixtureResolvesToFullEngineParam(src) {
  const libName = ts.getDefaultLibFileName({ target: ts.ScriptTarget.Latest })
  const fileMap = { [libName]: FIXTURE_LIB, '/audio.ts': STUB_AUDIO_MODULE, '/dispatch.ts': src }
  const host = {
    getSourceFile: (name, lang) =>
      fileMap[name] !== undefined ? ts.createSourceFile(name, fileMap[name], lang, true) : undefined,
    writeFile: () => {},
    getDefaultLibFileName: () => libName,
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (f) => f,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (name) => fileMap[name] !== undefined,
    readFile: (name) => fileMap[name],
    directoryExists: () => true,
    getDirectories: () => [],
  }
  const program = ts.createProgram(
    ['/dispatch.ts'],
    { target: ts.ScriptTarget.Latest, moduleResolution: ts.ModuleResolutionKind.Bundler, noEmit: true },
    host,
  )
  return fileHasFullEngineParam(program.getSourceFile('/dispatch.ts'), program.getTypeChecker())
}

// ── AC-3 machinery: the never anchor must sit inside a switch ─────────────────
const FUNCTION_KINDS = new Set([
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.FunctionExpression,
  ts.SyntaxKind.ArrowFunction,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.SetAccessor,
])

// A `never`-annotated binding is an exhaustiveness anchor only when it sits in the
// switch-default (or any switch clause) of a function — that is the position that makes
// tsc reject a widened union. A `never` binding elsewhere in a function body is not a
// switch anchor, and a module-scope one is not an anchor at all; both are rejected.
// Comment/string `never` never reaches the AST, so it cannot pass either.
function hasNeverAnchorInSwitch(src) {
  const sf = parse(src)
  let found = false
  const walk = (n) => {
    if (ts.isVariableDeclaration(n) && n.type && n.type.kind === ts.SyntaxKind.NeverKeyword) {
      let inFn = false
      let inSwitch = false
      for (let a = n.parent; a; a = a.parent) {
        if (FUNCTION_KINDS.has(a.kind)) inFn = true
        if (a.kind === ts.SyntaxKind.SwitchStatement) inSwitch = true
      }
      if (inFn && inSwitch) found = true
    }
    ts.forEachChild(n, walk)
  }
  walk(sf)
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

// ── AC-2: every dispatch narrows the engine (no full-engine param, alias-proof) ─
test('SH4-5 AC-2: no dispatch file types a parameter as the full AudioEngine (resolved, alias-proof)', () => {
  const games = ownersOnDisk()
  const program = buildProgram(games.map(dispatchPath))
  const checker = program.getTypeChecker()
  const violators = games.filter((game) =>
    fileHasFullEngineParam(program.getSourceFile(dispatchPath(game)), checker),
  )
  assert.deepEqual(
    violators,
    [],
    `These dispatch files pass the full engine (or an alias/rename of it) instead of a ` +
      `same-file Pick<AudioEngine,…> slice: ${violators.join(', ')}`,
  )
})

// ── AC-3: exhaustiveness is anchored by a never-typed binding in a switch ─────
test('SH4-5 AC-3: every dispatch file carries a never-typed exhaustiveness anchor inside a switch', () => {
  const missing = ownersOnDisk().filter(
    (game) => !hasNeverAnchorInSwitch(readFileSync(dispatchPath(game), 'utf8')),
  )
  assert.deepEqual(
    missing,
    [],
    `These dispatch files lost their in-switch \`const _: never\` exhaustiveness anchor: ${missing.join(', ')}`,
  )
})

// ── AC-4 / AC-5 / AC-6: restrictive-direction controls ───────────────────────
// These prove the predicates are not TRIVIA-satisfiable AND that the SH4-6 hardening
// actually bites: a comment-only `never` and a full-engine param are rejected, a Pick
// (named or inline) passes, an ALIASED or RENAMED full engine is now rejected (AC-5),
// and a `never` outside any switch no longer counts (AC-6). All run through the SAME
// predicate functions the real-file sweeps use — if a control passes in the wrong
// direction, the sweeps above are vacuous.
const FIXTURE_BARE_PARAM = `
import type { AudioEngine } from './audio'
export function playEventSounds(audio: AudioEngine, events) {
  for (const e of events) audio.play(e.kind)
}
`

const FIXTURE_ALIASED_ENGINE = `
import type { AudioEngine } from './audio'
type Engine = AudioEngine
export function playEventSounds(audio: Engine, events) {
  for (const e of events) audio.play(e.kind)
}
`

const FIXTURE_RENAMED_IMPORT = `
import type { AudioEngine as Engine } from './audio'
export function playEventSounds(audio: Engine, events) {
  for (const e of events) audio.play(e.kind)
}
`

const FIXTURE_PICK_INLINE = `
import type { AudioEngine } from './audio'
export function playEventSounds(audio: Pick<AudioEngine, 'play'>, events) {
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

const FIXTURE_NEVER_OUTSIDE_SWITCH = `
import type { AudioEngine } from './audio'
type SoundPlayer = Pick<AudioEngine, 'play'>
export function playEventSounds(audio: SoundPlayer, events) {
  const _exhaustive: never = undefined as never   // in a function, but not in a switch
  void _exhaustive
  for (const e of events) audio.play(e.kind)
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

test('SH4-5 AC-4a: the AC-2 predicate REJECTS a full-AudioEngine param', () => {
  assert.equal(fixtureResolvesToFullEngineParam(FIXTURE_BARE_PARAM), true)
})

test('SH4-5 AC-4b: the AC-3 predicate is trivia-blind — a comment-only never does NOT satisfy it', () => {
  assert.equal(hasNeverAnchorInSwitch(FIXTURE_COMMENT_ONLY_NEVER), false)
})

test('SH4-5 AC-4c: a minimal compliant dispatcher PASSES both predicates', () => {
  assert.equal(fixtureResolvesToFullEngineParam(FIXTURE_COMPLIANT), false)
  assert.equal(hasNeverAnchorInSwitch(FIXTURE_COMPLIANT), true)
})

test('SH4-6 AC-5a: the AC-2 predicate REJECTS an aliased full engine (type Engine = AudioEngine)', () => {
  assert.equal(fixtureResolvesToFullEngineParam(FIXTURE_ALIASED_ENGINE), true)
})

test('SH4-6 AC-5b: the AC-2 predicate REJECTS a renamed full-engine import (AudioEngine as Engine)', () => {
  assert.equal(fixtureResolvesToFullEngineParam(FIXTURE_RENAMED_IMPORT), true)
})

test('SH4-6 AC-5c: the AC-2 predicate PASSES an inline Pick (narrowing without a named alias)', () => {
  assert.equal(fixtureResolvesToFullEngineParam(FIXTURE_PICK_INLINE), false)
})

test('SH4-6 AC-6: the AC-3 predicate REJECTS a never binding that is not inside a switch', () => {
  assert.equal(hasNeverAnchorInSwitch(FIXTURE_NEVER_OUTSIDE_SWITCH), false)
})

// ── AC-7 (SH4-6): positive control — the REAL program actually resolves types ──
// The AC-2 sweep reports "no full-engine param" by asking the TypeChecker to resolve each
// parameter. If that resolution silently degraded — a tsconfig/@shared break leaving params
// typed `any`/error — AC-2 would flag nothing and pass having checked NOTHING (vacuously
// green). This pins that the real program is live: every real dispatch file must have at
// least one audio parameter that resolves to a narrowed Pick (the anonymous `__type`), and
// never to `any`. It is the real-path counterpart to the AC-4/AC-5 fixture controls.
test('SH4-6 AC-7: the real AC-2 program resolves each dispatch audio param to a narrowed Pick, not any', () => {
  const games = ownersOnDisk()
  const program = buildProgram(games.map(dispatchPath))
  const checker = program.getTypeChecker()
  const unresolved = games.filter((game) => {
    const sf = program.getSourceFile(dispatchPath(game))
    let sawResolvedPick = false
    const walk = (n) => {
      if (ts.isParameter(n) && n.type) {
        const type = checker.getTypeAtLocation(n)
        const isAny = (type.flags & ts.TypeFlags.Any) !== 0
        if (!isAny && type?.symbol?.name === '__type') sawResolvedPick = true
      }
      ts.forEachChild(n, walk)
    }
    walk(sf)
    return !sawResolvedPick
  })
  assert.deepEqual(
    unresolved,
    [],
    `These dispatch files had no audio param resolve to a narrowed Pick — type resolution may ` +
      `have silently degraded, which would make the AC-2 sweep vacuous: ${unresolved.join(', ')}`,
  )
})
