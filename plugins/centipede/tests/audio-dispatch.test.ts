// tests/audio-dispatch.test.ts
//
// Story cp5-1 — RED phase (Leeloo / TEA). The event -> cue wiring as a PURE,
// importable function. Covers AC3 (every kind maps to a cue, with a `never`
// exhaustiveness guard) and the cross-module half of AC4 (every cue the
// dispatch names exists in the manifest, and concurrent loops do not share a
// voice).
//
// This is deliberately the tempest/battlezone extraction and NOT star-wars's
// inline-in-main.ts switch. battlezone's own header says why
// (plugins/battlezone/src/shell/audio-dispatch.ts:1-9): "so the map is
// unit-testable against a recording fake without booting a canvas." Every test
// below is exactly that — no DOM, no canvas, no AudioContext.
//
// ─── THE TWO EXHAUSTIVENESS CLAIMS, AND HOW EACH IS PINNED ───────────────────
// AC3 asks for a `never` guard "proven by a test or a deliberate compile
// failure". There are two such claims in this story and they need different
// instruments:
//
//  1. every event KIND has a cue. Observable — so it is a RUNTIME sweep over
//     `EVENT_KINDS` (the core's own list): every kind must produce exactly one
//     effect, and the cue it names must exist in the manifest. Add a kind with
//     no cue and that sweep reds whether or not any `never` survived.
//
//  2. every cue EFFECT has its own switch arm. NOT observable — `effectFor`
//     returns a closed three-member union, so no input can produce a fourth
//     effect at runtime, and a guarded switch and an unguarded one ask the
//     engine for exactly the same things. A recording fake cannot tell them
//     apart. A compile-time-only claim can only be read off the source.
//
// Claim 2 is where this file has been beaten four times, each round by a
// cleverer piece of TEXT that a regex could not distinguish from code: the word
// in a comment, a decoy in another function, a decoy nested in this one, a `}`
// inside a string, a brace-less clause. It is no longer read with regexes at
// all — see the AST toolkit below, which asks the compiler's own parser.
//
// Claim 1's companion — `EVENT_SOUND: Record<GameEventKind, SoundName>` in
// shell/audio.ts, the annotation mutation shows is doing the work — is read the
// same way, for the same reason.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
// The compiler's own parser, used to read the source instead of scanning it.
// Already a dependency — it is what `npm run lint` runs. See the AST toolkit
// below for why four rounds of regexes were retired in favour of it.
import ts from 'typescript'
// Static, because these modules now exist. The computed specifiers below stay
// as they are: they are what the coverage sweeps load, and they are also how a
// deleted module reds as "cp5-1 not implemented yet" rather than as a resolve
// error at import time.
import type { AudioEngine, SoundName } from '../src/shell/audio'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const dispatchPath = join(repoRoot, 'src', 'shell', 'audio-dispatch.ts')
const audioPath = join(repoRoot, 'src', 'shell', 'audio.ts')

// ─── the three modules (not-yet-existing when this file was written) ─────────

/** One observable playback effect, tagged by the engine method that produced
 *  it — so a one-shot `play` can be told apart from a sustained `startLoop`. */
type Effect =
  | { kind: 'play'; sound: SoundName }
  | { kind: 'startLoop'; sound: SoundName }
  | { kind: 'stopLoop'; sound: SoundName }

/**
 * The fake engine's shape, DERIVED from the real one.
 *
 * REWORK (Reviewer round 1, MEDIUM): this was hand-rolled as
 * `play(name: string)` while the real surface takes the narrow `SoundName`
 * union — justified during RED, when the module did not exist, but once it does
 * a hand-rolled type lets the fake drift from the thing it stands in for.
 * `Pick` from the real `AudioEngine` instead, which is exactly what the
 * dispatch itself accepts.
 *
 * WHAT THIS DOES AND DOES NOT CATCH, measured rather than assumed — renaming
 * `startLoop` on the shared engine now reds this file (TS2344 on the `Pick`);
 * ADDING a parameter to it does not, because TypeScript assigns a function of
 * fewer parameters to one of more, and `recordingAudio` below declares one. The
 * cue-NAME type is the half that is fully coupled: `Effect.sound` is
 * `SoundName`, so widening or narrowing the union lands here.
 */
type SoundSurface = Pick<AudioEngine, 'play' | 'startLoop' | 'stopLoop' | 'tick'>

function recordingAudio(): SoundSurface & { calls: Effect[] } {
  const calls: Effect[] = []
  return {
    calls,
    play: (sound) => void calls.push({ kind: 'play', sound }),
    startLoop: (sound) => void calls.push({ kind: 'startLoop', sound }),
    stopLoop: (sound) => void calls.push({ kind: 'stopLoop', sound }),
    // cp6-3: the dispatch also carries POKEY voice 0's frame clock, so the fake
    // has to answer it. Deliberately NOT recorded as an `Effect` — every sweep
    // in this file counts "one effect per event kind", and a per-frame tick is
    // not an effect OF an event. Its placement and its unconditional-ness are
    // asserted in tests/voice0-contention.test.ts (AC-4) against a fake that
    // DOES record it. joust made the same split (tests/audio-dispatch.test.ts:56-60).
    tick: () => {},
  }
}

type PlayEventSounds = (audio: SoundSurface, events: readonly { type: string }[]) => void

const load = async <T>(parts: string[]): Promise<Partial<T>> => {
  try {
    return (await import(/* @vite-ignore */ parts.join('/'))) as Partial<T>
  } catch {
    return {}
  }
}

async function dispatchFn(): Promise<PlayEventSounds> {
  const mod = await load<{ playEventSounds: PlayEventSounds }>(['..', 'src', 'shell', 'audio-dispatch'])
  const fn = mod.playEventSounds
  if (typeof fn !== 'function') {
    throw new Error(
      'cp5-1 not implemented yet: src/shell/audio-dispatch.ts must exist and export ' +
        '`playEventSounds(audio, events)`.',
    )
  }
  return fn
}

async function eventKinds(): Promise<readonly string[]> {
  const mod = await load<{ EVENT_KINDS: readonly string[] }>(['..', 'src', 'core', 'events'])
  const kinds = mod.EVENT_KINDS
  if (kinds === undefined) {
    throw new Error('cp5-1 not implemented yet: src/core/events.ts must export `EVENT_KINDS`.')
  }
  return kinds
}

async function manifest(): Promise<{
  SOUNDS: Readonly<Record<string, string>>
  CHANNELS: Readonly<Record<string, string>>
}> {
  const mod = await load<{
    SOUNDS: Readonly<Record<string, string>>
    CHANNELS: Readonly<Record<string, string>>
  }>(['..', 'src', 'shell', 'audio'])
  if (mod.SOUNDS === undefined || mod.CHANNELS === undefined) {
    throw new Error('cp5-1 not implemented yet: src/shell/audio.ts must export SOUNDS and CHANNELS.')
  }
  return { SOUNDS: mod.SOUNDS, CHANNELS: mod.CHANNELS }
}

/** Dispatch one event and return what the engine was asked to do. */
async function effectsFor(kind: string): Promise<Effect[]> {
  const play = await dispatchFn()
  const audio = recordingAudio()
  play(audio, [{ type: kind }])
  return audio.calls
}

/** A sustained cue is signalled by its kind name: `-start` opens a loop and
 *  `-stop` closes it. The pairing itself is pinned in audio-events.test.ts. */
const isLoopStart = (kind: string): boolean => kind.endsWith('-start')
const isLoopStop = (kind: string): boolean => kind.endsWith('-stop')

// ─── THE AST TOOLKIT (Reviewer round 4 — "stop patching the scanner") ────────
//
// Four rounds of hand-rolled source scanning, four defeats, each one level
// deeper than the one before:
//
//   round 1  the word `never` in a COMMENT              -> anchor to the declaration
//   round 2  the guard DELETED outright                 -> write a test at all
//   round 3  a guard-shaped decoy ELSEWHERE in the file -> scope to the function body
//   round 4  a decoy NESTED inside that body; a `}`     -> ...a fifth regex?
//            inside a string; a BRACE-LESS `default:`
//
// No. Every one of those is a PARSING bug, and this repo already depends on the
// parser that has none of them — `typescript` is what `npm run lint` runs. So
// these helpers ask the compiler's own parser what the source says instead of
// guessing at it with regexes, which retires all four defects at once rather
// than one per round:
//
//   - comments are not in the tree, so round 1's defect cannot be expressed;
//   - a node's text is syntax-accurate, so a `}` — or the characters `audio.` —
//     inside a STRING LITERAL is a non-event, closing round 4's H2;
//   - a `DefaultClause` has statements whether or not it wears braces, closing
//     H3 and admitting the fleet's `default: return assertNever(x)` idiom;
//   - and "which switch is the real one" stops being a question about text
//     position and becomes one about the module's CALL GRAPH — see
//     `reachableFrom`, which closes H1 and M1 together.
//
// Nothing here is centipede-specific; if a second game needs it, this is the
// block to lift into a shared test util (see the Delivery Finding — not yet,
// per CLAUDE.md's "extract only once a second game proves the duplication").

type FnLike = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction | ts.MethodDeclaration

const isFnLike = (n: ts.Node): n is FnLike =>
  ts.isFunctionDeclaration(n) ||
  ts.isFunctionExpression(n) ||
  ts.isArrowFunction(n) ||
  ts.isMethodDeclaration(n)

const parseTs = (src: string): ts.SourceFile =>
  ts.createSourceFile('audio-dispatch.ts', src, ts.ScriptTarget.Latest, /* setParentNodes */ true)

/** Every module-local function, keyed by the name it would be CALLED through —
 *  `function f()` and `const f = () => …` alike. */
function localFunctions(sf: ts.SourceFile): Map<string, FnLike> {
  const out = new Map<string, FnLike>()
  const visit = (n: ts.Node): void => {
    if (ts.isFunctionDeclaration(n) && n.name !== undefined) out.set(n.name.text, n)
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer !== undefined &&
      isFnLike(n.initializer)
    ) {
      out.set(n.name.text, n.initializer)
    }
    ts.forEachChild(n, visit)
  }
  ts.forEachChild(sf, visit)
  return out
}

/** Identifiers this function calls — `f()`, not `o.f()`, which is all the local
 *  call graph needs. */
function calleesOf(fn: FnLike): Set<string> {
  const names = new Set<string>()
  const visit = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) names.add(n.expression.text)
    ts.forEachChild(n, visit)
  }
  if (fn.body !== undefined) ts.forEachChild(fn.body, visit)
  return names
}

/**
 * Every function reachable from `root` through the module's own call graph.
 *
 * This is the answer to round 4's H1 **and** M1 — which pull in opposite
 * directions and are really the same question:
 *
 *   H1  a decoy DECLARED INSIDE `playEventSounds` carrying a perfect guard must
 *       NOT satisfy these assertions, because the real switch is unguarded.
 *   M1  a `dispatchEffect(…)` helper EXTRACTED OUT of `playEventSounds` and
 *       called from it MUST satisfy them — nothing about the guarantee changed,
 *       and cp5-2 (wire the seam into the frame loop) is the story most likely
 *       to make exactly that refactor.
 *
 * Position in the file cannot tell those two apart: both are "a switch in some
 * other function", one lexically inside and one outside. What separates them is
 * that the decoy is never CALLED and the helper is. So the subject of every
 * assertion below is the switch owned by a function the dispatch can reach —
 * which is also the only switch that can ever run.
 */
function reachableFrom(sf: ts.SourceFile, root: string): FnLike[] | null {
  const locals = localFunctions(sf)
  if (!locals.has(root)) return null
  const seen = new Set<string>()
  const stack = [root]
  while (stack.length > 0) {
    const name = stack.pop() as string
    if (seen.has(name)) continue
    seen.add(name)
    const fn = locals.get(name)
    if (fn === undefined) continue
    for (const callee of calleesOf(fn)) if (locals.has(callee)) stack.push(callee)
  }
  const fns: FnLike[] = []
  for (const name of seen) {
    const fn = locals.get(name)
    if (fn !== undefined) fns.push(fn)
  }
  return fns
}

/** Switches whose NEAREST enclosing function is one of `fns` — a nested
 *  function owns its own switches, and is only itself in `fns` if it is called. */
function ownedSwitches(fns: readonly FnLike[]): { sw: ts.SwitchStatement; owner: FnLike }[] {
  const found: { sw: ts.SwitchStatement; owner: FnLike }[] = []
  for (const owner of fns) {
    const walk = (n: ts.Node): void => {
      if (isFnLike(n) && n !== owner) return
      if (ts.isSwitchStatement(n)) found.push({ sw: n, owner })
      ts.forEachChild(n, walk)
    }
    if (owner.body !== undefined) ts.forEachChild(owner.body, walk)
  }
  return found
}

/** The string-literal members of a union type annotation, in source order. */
function literalMembers(type: ts.TypeNode | undefined): string[] {
  if (type === undefined || !ts.isUnionTypeNode(type)) return []
  const out: string[] = []
  for (const t of type.types) {
    if (ts.isLiteralTypeNode(t) && ts.isStringLiteral(t.literal)) out.push(t.literal.text)
  }
  return out
}

/**
 * The closed union the switch narrows, READ FROM THE SOURCE rather than listed
 * in this file.
 *
 * A hand-maintained `['play', 'startLoop', 'stopLoop']` in the test agrees with
 * itself forever while the real union drifts underneath it — the same
 * "matches a token, not the claim" failure as round 1, one level of indirection
 * out. Derived instead from the discriminant's DECLARED type: a parameter
 * annotation (the extracted-helper shape) or the return type of the local
 * function it is initialised from (today's shape). Add a fourth effect to that
 * union without a case arm and the sweep below reds — which is the AC3 claim,
 * and which no previous round's test could see at all.
 */
function effectUnionType(sf: ts.SourceFile, sw: ts.SwitchStatement, owner: FnLike): ts.TypeNode | null {
  if (!ts.isIdentifier(sw.expression)) return null
  const disc = sw.expression.text

  const param = owner.parameters.find((p) => ts.isIdentifier(p.name) && p.name.text === disc)
  if (param !== undefined && literalMembers(param.type).length > 0) return param.type ?? null

  const locals = localFunctions(sf)
  const found: ts.TypeNode[] = []
  const walk = (n: ts.Node): void => {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.name.text === disc &&
      n.initializer !== undefined &&
      ts.isCallExpression(n.initializer) &&
      ts.isIdentifier(n.initializer.expression)
    ) {
      const producer = locals.get(n.initializer.expression.text)
      if (producer?.type !== undefined && literalMembers(producer.type).length > 0) {
        found.push(producer.type)
      }
    }
    ts.forEachChild(n, walk)
  }
  if (owner.body !== undefined) ts.forEachChild(owner.body, walk)
  return found[0] ?? null
}

const effectUnion = (sf: ts.SourceFile, sw: ts.SwitchStatement, owner: FnLike): string[] | null => {
  const type = effectUnionType(sf, sw, owner)
  return type === null ? null : literalMembers(type)
}

/**
 * The methods a default arm must not call, derived from the recording fake —
 * which is `Pick<AudioEngine, …>`, so this list is coupled to the real engine
 * by the compiler rather than by my memory of it.
 */
const ENGINE_METHODS: readonly string[] = Object.entries(recordingAudio())
  .filter(([, v]) => typeof v === 'function')
  .map(([k]) => k)

/** What the dispatch's default arm says, structurally. */
type Reading =
  | { ok: false; why: string }
  | {
      ok: true
      owner: string
      discriminant: string
      union: readonly string[]
      cases: readonly string[]
      /** guards that CONSULT the compiler: `const x: never = <disc>` / `assertNever(<disc>)` */
      guards: readonly string[]
      /** `never` bindings whose initialiser is not the bare discriminant — a cast silences it */
      casts: readonly string[]
      /** the first engine call found in the default arm, if any */
      engine: string | null
    }

function readDispatch(src: string): Reading {
  const sf = parseTs(src)
  const fns = reachableFrom(sf, 'playEventSounds')
  if (fns === null) return { ok: false, why: 'no `function playEventSounds` in the module' }

  const owned = ownedSwitches(fns)
  if (owned.length !== 1) {
    return {
      ok: false,
      why:
        `expected exactly ONE switch reachable from playEventSounds, found ${owned.length}` +
        ' — a second reachable switch is a deliberate decision, not a refactor',
    }
  }
  const entry = owned[0] as { sw: ts.SwitchStatement; owner: FnLike }
  const { sw, owner } = entry
  if (!ts.isIdentifier(sw.expression)) {
    return {
      ok: false,
      why:
        'the switch discriminant is not a plain identifier, so TypeScript has no reference to' +
        ' narrow and no `never` guard can be written against it',
    }
  }
  const union = effectUnion(sf, sw, owner)
  if (union === null || union.length === 0) {
    return { ok: false, why: "could not resolve the effect union from the discriminant's declared type" }
  }
  const def = sw.caseBlock.clauses.find(ts.isDefaultClause)
  if (def === undefined) return { ok: false, why: 'the switch carries no `default:` clause — AC3 names it' }

  const cases: string[] = []
  for (const clause of sw.caseBlock.clauses) {
    if (ts.isCaseClause(clause) && ts.isStringLiteral(clause.expression)) cases.push(clause.expression.text)
  }

  const disc = sw.expression.text
  const guards: string[] = []
  const casts: string[] = []
  let engine: string | null = null
  const walk = (n: ts.Node): void => {
    if (ts.isVariableDeclaration(n) && n.type?.kind === ts.SyntaxKind.NeverKeyword) {
      const init = n.initializer
      if (init !== undefined && ts.isIdentifier(init) && init.text === disc) guards.push(n.getText())
      else if (init !== undefined) casts.push(n.getText())
    }
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'assertNever'
    ) {
      const first = n.arguments[0]
      if (first !== undefined && ts.isIdentifier(first) && first.text === disc) guards.push(n.getText())
    }
    if (engine === null && ts.isPropertyAccessExpression(n) && ENGINE_METHODS.includes(n.name.text)) {
      engine = n.getText()
    }
    if (
      engine === null &&
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      ENGINE_METHODS.includes(n.expression.text)
    ) {
      engine = n.getText()
    }
    ts.forEachChild(n, walk)
  }
  ts.forEachChild(def, walk)

  return { ok: true, owner: owner.name?.getText() ?? '<anonymous>', discriminant: disc, union, cases, guards, casts, engine }
}

/**
 * Every reason this source fails AC3's exhaustiveness claim — empty means it
 * holds. One function so the mutation sweep and the named assertions below
 * cannot drift apart: a mutant the sweep accepts is a mutant the tests accept.
 */
function verdict(r: Reading): string[] {
  if (!r.ok) return [r.why]
  const out: string[] = []
  const missing = r.union.filter((e) => !r.cases.includes(e))
  if (missing.length > 0) {
    out.push(`effects with no case arm of their own: ${missing.join(', ')} (a \`default\` that dispatches is not a guard)`)
  }
  if (r.casts.length > 0) {
    out.push(`the default arm CASTS instead of consulting the compiler: ${r.casts.join('; ')}`)
  }
  if (r.guards.length !== 1) {
    out.push(
      `expected exactly one exhaustiveness guard binding \`${r.discriminant}\` in the default arm, found ${r.guards.length}`,
    )
  }
  if (r.engine !== null) {
    out.push(`the default arm reaches the engine (\`${r.engine}\`) — it is dispatching, not guarding`)
  }
  return out
}

describe('cp5-1 AC3 — the dispatch is an importable pure function', () => {
  it('src/shell/audio-dispatch.ts exists', () => {
    expect(existsSync(dispatchPath), 'cp5-1 must create src/shell/audio-dispatch.ts').toBe(true)
  })

  it('exports playEventSounds with no DOM or canvas dependency', async () => {
    expect(typeof (await dispatchFn())).toBe('function')
  })

  it('plays nothing for an empty frame', async () => {
    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [])
    expect(audio.calls).toEqual([])
  })

  it('the compile-time half of AC3 is anchored where it actually fires', () => {
    // REWORK (Reviewer round 1, HIGH). This assertion used to read the dispatch
    // source for the bare word `never` — and `never` also appears in two of that
    // file's COMMENTS, so deleting the whole guard left the test green. A token,
    // not the claim.
    //
    // Two mutations established where the guarantee really is:
    //   add a kind to EVENT_KINDS with no cue -> TS2741 at shell/audio.ts's
    //     EVENT_SOUND literal.                                     <- the mechanism
    //   delete the dispatch's `never` line    -> 0 tsc errors.     <- was scenery
    //
    // So this is pinned to the ANNOTATION that produces the error: drop it, or
    // widen it to `Record<string, SoundName>`, and this test reds. The runtime
    // sweep below covers the same claim from the other side.
    //
    // REWORK (Reviewer round 4): this was the last source-TEXT anchor in the
    // file, and it carried round 1's defect unfixed — the string
    // `EVENT_SOUND: Record<GameEventKind, SoundName>` written in a COMMENT
    // satisfies the regex just as the word `never` once did. Read structurally
    // instead, which also makes it immune to whitespace and to a re-ordered
    // `Record<>` argument list being mistaken for the right one.
    expect(existsSync(audioPath), 'cp5-1 must create src/shell/audio.ts').toBe(true)
    const sf = parseTs(readFileSync(audioPath, 'utf8'))
    let annotation: string | null = null
    const walk = (n: ts.Node): void => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'EVENT_SOUND') {
        annotation = n.type === undefined ? '<none>' : n.type.getText().replace(/\s+/g, ' ')
      }
      ts.forEachChild(n, walk)
    }
    ts.forEachChild(sf, walk)
    expect(
      annotation,
      'EVENT_SOUND must be annotated Record<GameEventKind, SoundName> — that annotation, and ' +
        'nothing else in this story, makes a kind with no cue a COMPILE error',
    ).toBe('Record<GameEventKind, SoundName>')
  })
})

describe('cp5-1 AC3 — EVERY event kind maps to exactly one cue', () => {
  it('the sweep runs over a non-empty kind list', async () => {
    // Non-vacuity: `it.each` over an empty list silently runs zero tests, and
    // the whole exhaustiveness claim below would be made of nothing.
    expect((await eventKinds()).length).toBeGreaterThan(0)
  })

  it('every kind in EVENT_KINDS produces exactly one playback effect', async () => {
    const kinds = await eventKinds()
    const missing: string[] = []
    const overlapping: string[] = []
    for (const kind of kinds) {
      const calls = await effectsFor(kind)
      if (calls.length === 0) missing.push(kind)
      else if (calls.length > 1) overlapping.push(`${kind} (${calls.length})`)
    }
    expect(missing, `event kinds with NO cue: ${missing.join(', ')}`).toEqual([])
    expect(overlapping, `event kinds firing more than one effect: ${overlapping.join(', ')}`).toEqual(
      [],
    )
  })

  it('every cue the dispatch names exists in SOUNDS and CHANNELS', async () => {
    // The cross-module half of AC4: the dispatch and the manifest are written
    // separately and this is the only thing that makes them agree. A cue with
    // no manifest entry is a silent no-op in the shared engine — it degrades
    // quietly, so nothing else in the suite would ever notice.
    const kinds = await eventKinds()
    const { SOUNDS, CHANNELS } = await manifest()
    const unknown: string[] = []
    for (const kind of kinds) {
      for (const call of await effectsFor(kind)) {
        if (!(call.sound in SOUNDS)) unknown.push(`${kind} -> SOUNDS['${call.sound}']`)
        if (!(call.sound in CHANNELS)) unknown.push(`${kind} -> CHANNELS['${call.sound}']`)
      }
    }
    expect(unknown, `cues with no manifest entry: ${unknown.join(', ')}`).toEqual([])
  })
})

describe('cp5-1 AC4 — sustained cues are START/STOP, not repeated one-shots', () => {
  it('a `-start` kind opens a LOOP and a `-stop` kind closes one', async () => {
    const kinds = await eventKinds()
    const loopKinds = kinds.filter((k) => isLoopStart(k) || isLoopStop(k))
    expect(loopKinds.length, 'the union must carry sustained cues').toBeGreaterThan(0)

    for (const kind of loopKinds) {
      const [call] = await effectsFor(kind)
      const want = isLoopStart(kind) ? 'startLoop' : 'stopLoop'
      expect(call?.kind, `'${kind}' must dispatch ${want}, not ${call?.kind}`).toBe(want)
    }
  })

  it('a `-start`/`-stop` pair drives the SAME cue — otherwise the loop never stops', async () => {
    const kinds = await eventKinds()
    for (const start of kinds.filter(isLoopStart)) {
      const stop = `${start.slice(0, -'-start'.length)}-stop`
      if (!kinds.includes(stop)) continue // pairing itself is pinned in audio-events.test.ts
      const [started] = await effectsFor(start)
      const [stopped] = await effectsFor(stop)
      expect(
        stopped?.sound,
        `'${stop}' stops '${stopped?.sound}' but '${start}' started '${started?.sound}'`,
      ).toBe(started?.sound)
    }
  })

  it('one-shot kinds use play(), never a loop', async () => {
    const kinds = await eventKinds()
    const oneShots = kinds.filter((k) => !isLoopStart(k) && !isLoopStop(k))
    expect(oneShots.length, 'the union must carry one-shot cues too').toBeGreaterThan(0)
    for (const kind of oneShots) {
      const [call] = await effectsFor(kind)
      expect(call?.kind, `'${kind}' is a one-shot and must dispatch play()`).toBe('play')
    }
  })

  it('concurrent loops do not share a channel — a shared voice silences one of them', async () => {
    // The property the CHANNELS map exists to express. The marching tick and
    // the creatures are all sounding at once in ordinary play; the shared
    // engine steals the channel on every new cue, so two loops on one channel
    // means starting the second silently stops the first. This is the one
    // manifest defect that produces no error anywhere — just missing sound.
    const kinds = await eventKinds()
    const { CHANNELS } = await manifest()
    const byChannel = new Map<string, string[]>()
    for (const start of kinds.filter(isLoopStart)) {
      const [call] = await effectsFor(start)
      if (call === undefined) continue
      const channel = CHANNELS[call.sound]
      if (channel === undefined) continue // reported by the manifest-coverage test above
      byChannel.set(channel, [...(byChannel.get(channel) ?? []), call.sound])
    }
    // NON-VACUITY (Reviewer round 1, MEDIUM): both `continue`s above can skip
    // every iteration, and an empty map yields an empty `shared` that satisfies
    // the assertion below while nothing whatever was compared. Counted over the
    // COLLECTED cues, not over `byChannel.size` — the map's size is exactly what
    // shrinks when cues share a channel, so guarding on it would fire in place
    // of the real assertion and hide the finding it is protecting.
    const collected = [...byChannel.values()].flat()
    expect(
      collected.length,
      'no sustained cue reached the channel map — the check below is vacuous',
    ).toBe(kinds.filter(isLoopStart).length)
    const shared = [...byChannel.entries()].filter(([, cues]) => new Set(cues).size > 1)
    expect(
      shared.map(([ch, cues]) => `${ch}: ${[...new Set(cues)].join(' + ')}`),
      'sustained cues sharing one channel will cut each other off',
    ).toEqual([])
  })
})

describe('cp5-1 AC3 — the EFFECT union carries its own exhaustiveness guard', () => {
  // ─── WHY THIS BLOCK EXISTS (Reviewer round 2, MEDIUM — M1-r2) ──────────────
  // There are TWO exhaustiveness claims in this story and they guard DIFFERENT
  // unions. The test above pins the first: `EVENT_SOUND: Record<GameEventKind,
  // SoundName>` in shell/audio.ts, which makes an event KIND with no cue a
  // compile error. This block pins the second: the dispatch switch's `default`
  // arm, which makes a new cue EFFECT with no arm a compile error.
  //
  // The second guard was added later, as round 1's L2 fix, and was given no
  // assertion of its own — so it was deleted from the working tree and `tsc`,
  // 956 centipede tests and all 10,476 repo tests stayed green over the hole.
  // That is exactly lang-review #15's closing rule ("every guard must be
  // mutation-tested") going unmet for the newest guard in the diff, in the
  // story that WROTE #15.
  //
  // ─── WHY A SOURCE ANCHOR, WHEN THIS FILE'S HEADER ARGUES AGAINST ONE ───────
  // The header above prefers a runtime sweep to a grep, and it is right about
  // the kind union — that claim is observable, so the sweep can watch it. This
  // claim is not. `effectFor` returns a closed three-member union, so no input
  // can produce a fourth effect at runtime; and the two shapes differ only in
  // what the COMPILER rejects, never in what the engine is asked to do. A
  // recording fake cannot tell them apart. Compile-time-only claims can only be
  // pinned in source text, so the discipline moves into HOW the anchor is
  // written: anchored to the declaration, stripped of comments, and counted.
  //
  // ─── AND WHY IT IS READ FROM THE SYNTAX TREE (Reviewer round 4) ────────────
  // Rounds 1-4 each anchored one level better than the last and were each
  // defeated one level deeper; the table in the AST toolkit above records the
  // sequence. The fifth attempt is not a better regex — it is a different kind
  // of thing, asking the compiler's own parser what the source says. See that
  // toolkit's header for which round each parser property retires.
  //
  // Every assertion below reads ONE field of a single structural `Reading`, and
  // the mutation sweep at the bottom of this block scores mutants with the same
  // `verdict()` those assertions are made of — so a mutant the sweep accepts is
  // by construction a mutant the named tests accept. They cannot drift apart.

  const dispatchSource = (): string => readFileSync(dispatchPath, 'utf8')
  const reading = (): Reading => readDispatch(dispatchSource())

  it('the dispatch can be located and read — the scope control', () => {
    // Non-vacuity for the whole block. If `playEventSounds` is renamed, or
    // refactored to a shape the reader does not understand, every assertion
    // below would be scoring an unread file. Fail loudly and specifically here
    // instead of passing quietly there.
    const r = reading()
    expect(r.ok ? null : r.why, 'the dispatch could not be read — every assertion below is blind')
      .toBeNull()
    const ok = r as Extract<Reading, { ok: true }>
    expect(ok.discriminant, 'the switch must narrow a named reference').toBe('effect')
    expect(
      ok.union.length,
      'the effect union must be derived from the source, not listed in this test',
    ).toBeGreaterThan(1)
  })

  it('the effect union is read from the SOURCE and matches what the engine actually sees', async () => {
    // Ties the source-level union to observed behaviour, so neither can drift
    // alone: every effect the recording fake sees across all EVENT_KINDS must
    // be a member of the union the switch narrows. Without this, `effectUnion`
    // could resolve to some unrelated union and the sweep would score the
    // wrong claim while staying green.
    const r = reading() as Extract<Reading, { ok: true }>
    const observed = new Set<string>()
    for (const kind of await eventKinds()) for (const call of await effectsFor(kind)) observed.add(call.kind)
    expect(observed.size, 'the runtime sweep observed no effects at all').toBeGreaterThan(0)
    expect(
      [...observed].filter((e) => !r.union.includes(e)),
      `effects the engine was asked for that are not in the declared union [${r.union.join(', ')}]`,
    ).toEqual([])
  })

  it('every effect in the union has its OWN case arm, so `default` is unreachable', () => {
    // A `default` that does real work is not an exhaustiveness check
    // (lang-review TS-3). Round 2's mutation deleted `case 'play'` and let the
    // default absorb it — which compiles clean forever, and silently routes a
    // future fade/duck/pitch-bend to a one-shot `play()`. Because the union is
    // now READ, adding that fourth effect without an arm reds here too; no
    // previous round's test could see that at all.
    const r = reading() as Extract<Reading, { ok: true }>
    expect(
      r.union.filter((e) => !r.cases.includes(e)),
      'effects with no case arm of their own — a default that dispatches is not a guard',
    ).toEqual([])
  })

  it('`default` consults the compiler about exhaustiveness, with NO cast', () => {
    // The cast is the difference between a guard and scenery, and round 1
    // shipped the scenery version (`event.type as never`, logged as L1): a cast
    // makes the assignment compile whatever the discriminant's type is, so the
    // arm proves nothing. An UNCAST binding of the discriminant is the
    // mechanism — it compiles only while the arms above consume the union.
    //
    // Structurally this is "the initialiser is the discriminant Identifier
    // itself", which admits `= effect` and rejects `= effect as never`,
    // `= effect!` and `= 0 as never` without enumerating them.
    const r = reading() as Extract<Reading, { ok: true }>
    expect(r.casts, 'the default arm casts to `never` instead of consulting the compiler').toEqual([])
    expect(
      r.guards.length,
      'expected exactly one guard binding the discriminant in the default arm — 0 means it ' +
        'was deleted, lives only in a comment, or sits in a switch this one does not own',
    ).toBe(1)
  })

  it('`default` is a GUARD, not a dispatch arm — it must not touch the engine', () => {
    // The direct negation of round 2's mutation. The engine's method names are
    // derived from the recording fake rather than typed here, and the search is
    // over syntax nodes — so round 4's H2 (a `}` inside a debug string hiding
    // the `audio.play()` that follows it) is not expressible.
    const r = reading() as Extract<Reading, { ok: true }>
    expect(ENGINE_METHODS.length, 'no engine methods derived — the check below is vacuous')
      .toBeGreaterThan(0)
    expect(
      r.engine,
      'the default arm calls the audio engine — it is dispatching, not guarding, so a new ' +
        'effect kind becomes a wrong sound instead of a compile error',
    ).toBeNull()
  })

  it('the committed dispatch satisfies every one of those at once', () => {
    expect(verdict(reading()), 'the shipped dispatch fails its own exhaustiveness claim').toEqual([])
  })
})

// ─── THE MUTATION SWEEP ──────────────────────────────────────────────────────
//
// Reviewer round 4, *What REJECT requires* item 3: "Have the matrix built by
// something other than the author. Twice now a self-authored matrix has
// returned 100% while missing the live defect." He is right, and the reason is
// worth stating plainly: a hand-written list of mutants measures the author's
// imagination, not the guard. Round 3's matrix tested a RENAME because I
// thought of renames, and missed the fleet's brace-less `assertNever` because I
// did not — while citing that very idiom as the motivation.
//
// So the mutants are no longer written. They are GENERATED from the committed
// source, three ways, each of which can turn up a case nobody imagined:
//
//   - one per CASE CLAUSE the real switch declares (grows with the union);
//   - one per ENGINE METHOD, derived from the recording fake, each carrying a
//     brace-in-a-string decoy so round 4's H2 is present in every row rather
//     than being the one case nobody tried;
//   - one per DECOY TOPOLOGY — before / after / nested — which is L2-r4's
//     parameterisation of the fixture that previously covered only "before".
//
// The named shapes that remain (a cast, a commented-out guard, the three fleet
// idioms) are edits to real nodes of the real file, not hand-typed source.
// Every mutant asserts it CHANGED the source before it is scored, because a
// mutation that silently failed to apply proves nothing — that is how round 3's
// "4th effect" row would have passed while editing the wrong line.
describe('cp5-1 AC3 — the guard is proven against mutants of the REAL source', () => {
  type Mutant = { name: string; src: string; want: 'reject' | 'accept'; why: string }

  /** Replace one node's text, by position. */
  const cut = (src: string, node: ts.Node, text: string): string =>
    src.slice(0, node.getStart()) + text + src.slice(node.getEnd())

  /** A perfectly-guarded switch in a function nothing calls. */
  const DECOY = [
    "function __decoy(effect: 'a' | 'b'): void {",
    '  switch (effect) {',
    "    case 'a': break",
    "    case 'b': break",
    '    default: {',
    '      const unreachable: never = effect',
    '      throw new Error(String(unreachable))',
    '    }',
    '  }',
    '}',
    '',
  ].join('\n')

  /**
   * Generation THROWS rather than asserting, and the caller catches.
   *
   * The generator's preconditions are properties of the committed source — a
   * locatable dispatch, one reachable switch, a `never` binding to edit. A
   * mutated tree can violate them, and if that were an `expect()` at collection
   * time the whole FILE would report one opaque error and the named assertions
   * above would never run. The defect this block exists to catch would look
   * like a broken test file rather than like a missing guard. So failures
   * become one legible red row (`the generator can read the committed source`)
   * while everything else still runs.
   */
  function mutants(): Mutant[] {
    const fail = (why: string): never => {
      throw new Error(`cannot generate mutants: ${why}`)
    }
    const src = readFileSync(dispatchPath, 'utf8')
    const sf = parseTs(src)
    const fns = reachableFrom(sf, 'playEventSounds')
    if (fns === null) fail('playEventSounds not found')
    const owned = ownedSwitches(fns as FnLike[])
    if (owned.length !== 1) fail(`expected exactly one reachable switch, found ${owned.length}`)
    const { sw, owner } = owned[0] as { sw: ts.SwitchStatement; owner: FnLike }
    const def = sw.caseBlock.clauses.find(ts.isDefaultClause)
    if (def === undefined) fail('no default clause')
    const arm = def as ts.DefaultClause
    const cases = sw.caseBlock.clauses.filter(ts.isCaseClause)
    if (owner.body === undefined) fail('the dispatch has no body')
    const body = owner.body as ts.Block
    if (!ts.isIdentifier(sw.expression)) fail('the discriminant is not an identifier')
    const disc = (sw.expression as ts.Identifier).text

    // ── everything below is located through the SAME reading the assertions
    // use, never by assuming today's shape. Round 4 raised the same complaint
    // twice (H3-r4: the matrix cited the fleet's idiom and tested something
    // else; M1-r4: an honest extraction reds five tests), and a generator
    // hard-coded to one topology reproduces it one level out — the property
    // would survive a legitimate refactor while the machinery proving it went
    // red, which trains people to weaken the machinery.

    // The guard STATEMENT, whichever of the two accepted forms it wears — a
    // `never` binding or an `assertNever(disc)` call. Replacing the statement
    // works for both; hunting for a `never` binding only works for one.
    const guards: ts.Node[] = []
    const findGuard = (n: ts.Node): void => {
      const isBinding =
        ts.isVariableDeclaration(n) && n.type?.kind === ts.SyntaxKind.NeverKeyword
      const isAssert =
        ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'assertNever'
      if (isBinding || isAssert) {
        // the enclosing STATEMENT, so replacing it leaves valid syntax
        let stmt: ts.Node = n
        while (stmt.parent !== undefined && !ts.isStatement(stmt)) stmt = stmt.parent
        guards.push(stmt)
      }
      ts.forEachChild(n, findGuard)
    }
    ts.forEachChild(arm, findGuard)
    if (guards.length !== 1) fail(`expected one guard statement to mutate, found ${guards.length}`)
    const guard = guards[0] as ts.Node

    // The union the reader actually READS — a parameter annotation when the
    // switch has been extracted into a helper, `effectFor`'s return type today.
    const unionType = effectUnionType(sf, sw, owner)
    if (unionType === null) fail('the effect union could not be located to widen')
    const union = unionType as ts.TypeNode

    const out: Mutant[] = []

    // ── generated: one per case clause the switch declares ──────────────────
    for (const clause of cases) {
      out.push({
        name: `delete ${clause.expression.getText()} case arm`,
        src: cut(src, clause, ''),
        want: 'reject',
        why: 'the default silently absorbs that effect',
      })
    }

    // ── generated: one per engine method, each hiding a `}` in a string ──────
    for (const method of ENGINE_METHODS) {
      out.push({
        name: `default dispatches via audio.${method}() behind a brace-in-string`,
        src: cut(
          src,
          arm,
          'default: {\n        const unreachable: never = effect\n' +
            "        console.debug('legacy}', unreachable)\n" +
            `        audio.${method}(sound)\n      }`,
        ),
        want: 'reject',
        why: 'H2-r4: the `}` in the debug string used to truncate the arm before the engine call',
      })
    }

    // ── generated: one per decoy topology (L2-r4) ───────────────────────────
    const gutted = cut(src, arm, 'default: {\n        audio.play(sound)\n      }')
    const bodyOpen = body.getStart() + 1
    const topologies: Record<string, string> = {
      before: DECOY + gutted,
      after: `${gutted}\n${DECOY}`,
      nested: gutted.slice(0, bodyOpen) + `\n${DECOY}` + gutted.slice(bodyOpen),
    }
    for (const [where, mutated] of Object.entries(topologies)) {
      out.push({
        name: `real switch gutted, guard-shaped decoy ${where} it`,
        src: mutated,
        want: 'reject',
        why: where === 'nested' ? 'H1-r4: the decoy lives INSIDE the dispatch' : 'round 3, H1-r3',
      })
    }

    // ── the same three topologies with the dispatch INTACT — the control that
    // makes the three rows above mean what they say.
    //
    // Found by mutating this file's own machinery rather than by thinking of
    // it: neutering `reachableFrom` to "every function in the module" left the
    // whole matrix GREEN, because a decoy that is merely PRESENT already
    // produces two switches and is rejected on that count alone. So the
    // rejections above did not depend on the call-graph reasoning they are
    // credited to, and the mechanism the Reviewer's H1-r4/M1-r4 pair actually
    // requires was unproven. These rows are the discriminator: dead code
    // elsewhere in the module must not red a guard that has not changed, and
    // only reachability can tell that from a real second switch.
    for (const [where, mutated] of Object.entries({
      before: DECOY + src,
      after: `${src}\n${DECOY}`,
      nested: src.slice(0, bodyOpen) + `\n${DECOY}` + src.slice(bodyOpen),
    })) {
      out.push({
        name: `dispatch INTACT, unreachable decoy ${where} it`,
        src: mutated,
        want: 'accept',
        why: 'an uncalled function elsewhere in the module changes no guarantee',
      })
    }

    // ── named shapes, applied to real nodes ─────────────────────────────────
    out.push(
      {
        name: 'guard cast: the discriminant is `as never` rather than bound',
        src: cut(src, guard, `const unreachable: never = ${disc} as never`),
        want: 'reject',
        why: "round 1's L1 — a cast silences the compiler instead of consulting it",
      },
      {
        name: 'guard commented out',
        src: cut(src, guard, `// ${guard.getText().split('\n').join(' ')}`),
        want: 'reject',
        why: "round 1's H2 — the tree has no comments, so this cannot be missed",
      },
      {
        name: 'guard deleted outright',
        src: cut(src, guard, ''),
        want: 'reject',
        why: "round 2's H1-r2 — the drift the Reviewer found by hand",
      },
      {
        name: 'guard binds something other than the discriminant',
        src: cut(src, guard, 'const unreachable: never = 0 as never'),
        want: 'reject',
        why: 'a `never` binding that narrows nothing is scenery',
      },
      {
        name: 'a fourth effect joins the union with no case arm',
        src: cut(src, union, `${union.getText()} | 'duck'`),
        want: 'reject',
        why: 'THE claim AC3 makes, and the one no previous round could test',
      },
      {
        name: 'default arm removed entirely',
        src: cut(src, arm, ''),
        want: 'reject',
        why: 'AC3 names the default arm',
      },
      // ── must STAY GREEN: refactors that change no guarantee ───────────────
      {
        // Renames every reference at once, by position — so it applies whatever
        // the discriminant is currently called, and cannot half-rename the way
        // a `split().join()` over the raw text would (`effect` is a substring of
        // `effectFor`).
        name: `rename the discriminant \`${disc}\` throughout`,
        src: (() => {
          const sites: ts.Identifier[] = []
          const collect = (n: ts.Node): void => {
            if (ts.isIdentifier(n) && n.text === disc) sites.push(n)
            ts.forEachChild(n, collect)
          }
          ts.forEachChild(sf, collect)
          let next = src
          for (const id of [...sites].reverse()) next = cut(next, id, 'cueEffect')
          return next
        })(),
        want: 'accept',
        why: 'a guard that reds on a rename pins the spelling, not the property',
      },
      {
        // A toggle, not a one-way conversion, so it still applies to a source
        // that has already been reformatted the other way.
        name: 'the case labels swap quote style (a formatter change)',
        src: cut(
          src,
          sw,
          sw.getText().includes("'")
            ? sw.getText().split("'").join('"')
            : sw.getText().split('"').join("'"),
        ),
        want: 'accept',
        why: "round 3's L1-r3",
      },
      // The fleet's three brace-less `assertNever` shapes. Read out of the
      // source files this round rather than recalled — round 4's H3 was
      // precisely a matrix row that cited these and then tested something else.
      // Verbatim but for the discriminant's name (`kind`/`mode` -> `effect`):
      //   plugins/tempest/src/core/sim.ts:159        default: return assertNever(kind, 'enemy kind')
      //   plugins/tempest/src/core/sim.ts:1200-1201  default:
      //                                                assertNever(mode, 'game mode')
      //   plugins/red-baron/src/core/scoring.ts:125-126  default:
      //                                                    return assertNever(kind)
      {
        name: "fleet idiom: `default: return assertNever(effect, 'cue effect')`",
        src: cut(src, arm, "default: return assertNever(effect, 'cue effect')"),
        want: 'accept',
        why: 'tempest sim.ts:159 — brace-less, same line',
      },
      {
        name: "fleet idiom: `default:` then `assertNever(effect, 'cue effect')`",
        src: cut(src, arm, "default:\n        assertNever(effect, 'cue effect')"),
        want: 'accept',
        why: 'tempest sim.ts:1200-1201 — brace-less statement',
      },
      {
        name: 'fleet idiom: `default:` then `return assertNever(effect)`',
        src: cut(src, arm, 'default:\n        return assertNever(effect)'),
        want: 'accept',
        why: 'red-baron scoring.ts:125-126 — brace-less return, one argument',
      },
    )

    // Only meaningful while the switch still lives inside the dispatch; once it
    // HAS been extracted this row would be re-extracting an extraction. Emitted
    // conditionally rather than silently producing a no-op, and the counts
    // control below is written to tolerate its absence.
    const enclosing = sw.parent
    const decl = ts.isBlock(enclosing)
      ? enclosing.statements.find(
          (s) =>
            ts.isVariableStatement(s) &&
            s.declarationList.declarations.some(
              (d) => ts.isIdentifier(d.name) && d.name.text === disc,
            ),
        )
      : undefined
    const ownerName = owner.name !== undefined && ts.isIdentifier(owner.name) ? owner.name.text : ''
    if (ownerName === 'playEventSounds' && decl !== undefined) {
      const swText = sw.getText()
      out.push({
        name: 'the guarded switch extracted into a helper the dispatch CALLS',
        src:
          src.slice(0, decl.getStart()) +
          `dispatchEffect(audio, sound, ${decl.getText().split('=').slice(1).join('=').trim()})` +
          src.slice(sw.getEnd()) +
          '\nfunction dispatchEffect(audio: SoundSurface, sound: SoundName, ' +
          `${disc}: ${union.getText()}): void {\n  ${swText}\n}\n`,
        want: 'accept',
        why: 'M1-r4 — a behaviour-preserving refactor cp5-2 is likely to make',
      })
    }
    return out
  }

  let genError: string | null = null
  let ALL: Mutant[] = []
  try {
    ALL = mutants()
  } catch (e) {
    genError = e instanceof Error ? e.message : String(e)
  }

  it('the generator can read the committed source', () => {
    expect(genError, 'no mutants could be generated — every row below is missing, not passing')
      .toBeNull()
  })

  it('the generated matrix is not empty and covers both directions', () => {
    // Without this, a `mutants()` that returned `[]` would make every row below
    // vacuous — `it.each([])` runs zero tests and reports success.
    const committed = readFileSync(dispatchPath, 'utf8')
    expect(ALL.length, 'no mutants generated').toBeGreaterThan(10)
    expect(ALL.filter((m) => m.want === 'reject').length, 'no must-RED rows').toBeGreaterThan(5)
    // Counted over rows that actually DIFFER from the committed source: a
    // must-ACCEPT row is allowed to no-op (see below), so counting all of them
    // would let the green half of the matrix decay to nothing unnoticed.
    expect(
      ALL.filter((m) => m.want === 'accept' && m.src !== committed).length,
      'no must-GREEN row actually changes the source',
    ).toBeGreaterThan(3)
    expect(new Set(ALL.map((m) => m.name)).size, 'duplicate mutant names').toBe(ALL.length)
  })

  it.each(ALL)('$want: $name', ({ src, want, why }) => {
    // A must-REJECT row that failed to apply is scoring the COMMITTED source,
    // which is accepted — so it would report "rejected as required" while
    // proving nothing. That is how round 3's fourth-effect row would have
    // passed while editing the wrong line, and it is a hard error here.
    //
    // A must-ACCEPT row is held to the weaker rule deliberately: "this shape is
    // already the shape the file uses" is a true and harmless outcome, and
    // failing it would red the suite for a refactor that changed no guarantee —
    // the exact complaint of H3-r4 and M1-r4, reproduced in the machinery. The
    // control above keeps the green half from decaying to no-ops.
    if (want === 'reject') {
      expect(src, `the mutation did not apply — it is scoring the committed source (${why})`)
        .not.toBe(readFileSync(dispatchPath, 'utf8'))
    }
    const reasons = verdict(readDispatch(src))
    if (want === 'reject') {
      expect(reasons, `this mutant must be REJECTED — ${why}`).not.toEqual([])
    } else {
      expect(reasons, `this mutant must be ACCEPTED — ${why}`).toEqual([])
    }
  })
})

describe('cp5-2 AC3 — an unmapped kind DEGRADES: the frame plays on, quietly', () => {
  // ─── THIS BLOCK WAS INVERTED BY cp5-2, ON PURPOSE ──────────────────────────
  // It used to read "an unmapped kind is a LOUD failure, not a silent no-op" and
  // pinned two throws. cp5-1 wrote it that way deliberately and said so: "cp5-2
  // has to decide throw-vs-degrade, and it cannot make that decision against
  // untested behaviour. This pins what the behaviour is TODAY so that the change
  // reds when cp5-2 makes it deliberately." This is that change, made
  // deliberately. The old assertions are not weakened or deleted-and-forgotten —
  // they are turned over, and each one's mirror is asserted below.
  //
  // THE RULING (user, 2026-08-01, taken at cp5-2 setup): DEGRADE. Two reasons,
  // neither of them taste:
  //
  //  1. PRECEDENT, measured. The default arm of all five games that shipped this
  //     seam before centipede is a bare `const _exhaustive: never = event` with
  //     NO throw — tempest:111-119, asteroids:57-64, battlezone:74-80,
  //     red-baron:68-74, joust:70-78. (Re-resolved on rework: the asteroids
  //     citation read :33-37, which is the INNER switch's `= event.source` arm.
  //     Both arms are non-throwing so the claim held, but :57-64 is the `=
  //     event` arm that actually corresponds to this one.) joust states the
  //     reasoning outright: "At
  //     runtime the branch stays SILENT — a stale or typo'd kind falling through
  //     onto some other cue would be audibly wrong, which is worse than quiet."
  //  2. CONSEQUENCE. cp5-2 puts this function inside requestAnimationFrame. An
  //     uncaught throw there skips main.ts:227's trailing
  //     `requestAnimationFrame(frame)` and the game freezes — a total failure
  //     for a defect whose honest cost is one missing sound. Pinned end-to-end
  //     in tests/audio-hot-path.test.ts, which boots the real loop and poisons a
  //     live frame. (Re-anchored on rework: this read main.ts:183, written when
  //     the file was 185 lines. The wiring diff grew the file past it, and
  //     main.ts:183 then landed on `const board = sim.highScoreTable` — a real
  //     line, so the stale citation misled rather than dangled.
  //     tests/audio-citations.test.ts now reds when a cited main.ts line stops
  //     saying what the citation claims.)
  //
  // NOTHING IS GIVEN UP AT COMPILE TIME. The exhaustiveness guarantee never
  // lived in this throw: `EVENT_SOUND: Record<GameEventKind, SoundName>`
  // (shell/audio.ts:113) makes a kind added without a cue a COMPILE error at the
  // declaration — which cp5-1 established by mutation (TS2741 on the object
  // literal) after finding that deleting the dispatch's own `never` line
  // produced zero tsc errors. The `never` guard on the EFFECT union stays, and
  // the whole `verdict()` sweep above still enforces it.

  it('does not throw on a kind with no cue', async () => {
    const play = await dispatchFn()
    const audio = recordingAudio()
    expect(
      () => play(audio, [{ type: 'no-such-event-kind' }]),
      'an unmapped kind still throws. On the hot path this exception escapes into ' +
        'requestAnimationFrame and freezes the frame loop — see the AC3 ruling above',
    ).not.toThrow()
  })

  it('plays nothing for the kind it cannot name — degrading is not guessing', async () => {
    // The other way to "not throw" is to fall through onto some other cue, and
    // that is worse than silence: the player hears the wrong thing and nothing
    // anywhere reports a fault. joust's comment names exactly this.
    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [{ type: 'no-such-event-kind' }])
    expect(
      audio.calls,
      'the unmapped kind reached the engine as some other cue — a wrong sound is worse ' +
        'than no sound',
    ).toEqual([])
  })

  it('dispatches the events on BOTH sides of the bad one — the frame is not truncated', async () => {
    // This is the assertion that inverts cp5-1's "dispatches UP TO the bad event,
    // then throws". Under the old behaviour a mixed frame was left HALF-PLAYED;
    // under the ruling the bad event is skipped and the frame completes. The
    // event placed AFTER the unmapped one is the whole point — it is the cue the
    // old behaviour silently dropped, and no test could see it because the throw
    // masked it.
    const kinds = await eventKinds()
    const oneShots = kinds.filter((k) => !isLoopStart(k) && !isLoopStop(k))
    expect(oneShots.length, 'need two one-shot kinds to bracket the bad one').toBeGreaterThan(1)
    const [before, after] = oneShots as [string, string]

    const play = await dispatchFn()
    const audio = recordingAudio()
    expect(() =>
      play(audio, [{ type: before }, { type: 'no-such-event-kind' }, { type: after }]),
    ).not.toThrow()

    const expected: Effect[] = [...(await effectsFor(before)), ...(await effectsFor(after))]
    expect(
      audio.calls,
      'the cue AFTER the unmapped kind never reached the engine — the frame is still being ' +
        'abandoned at the bad event instead of stepping over it',
    ).toEqual(expected)
  })

  it('a kind WITH a cue still dispatches — the control', async () => {
    // Retained from cp5-1, and it matters MORE under the ruling than it did
    // under the throw. "Never throws" is trivially satisfiable by a function
    // that does nothing at all; without this control the three tests above
    // would all pass over a gutted dispatch.
    const kinds = await eventKinds()
    const first = kinds[0]
    expect(first, 'need at least one real kind for the control').toBeDefined()
    const play = await dispatchFn()
    const audio = recordingAudio()
    expect(() => play(audio, [{ type: first as string }])).not.toThrow()
    expect(
      audio.calls.length,
      'a MAPPED kind produced no cue — the dispatch has been silenced wholesale rather ' +
        'than made to skip what it cannot name',
    ).toBeGreaterThan(0)
  })

  it('records the throw-vs-degrade decision in its own comment (AC3, literally)', () => {
    // AC3 asks for the decision to be "made explicitly and recorded in the
    // dispatch's own comment". The behaviour is pinned by the four tests above;
    // this is the documentation half, and it is written as a PAIR because a
    // one-sided doc assertion matches a TOKEN, not a CLAIM — it goes green the
    // moment someone appends the new sentence, while the old rationale sits
    // three lines up contradicting it (the tests/audio-seam-scope.test.ts rule).
    const src = readFileSync(dispatchPath, 'utf8')
    expect(
      src,
      'the file still carries the old "loud failure" rationale for throwing, which the ' +
        'AC3 ruling retired',
    ).not.toMatch(/LOUD failure|loud, not silent/i)
    expect(
      /degrade|degrading|silently skip|skips the cue|stays SILENT|never throws/i.test(src),
      'the dispatch must SAY that it degrades on an unmapped kind, and why — AC3 requires ' +
        'the decision to be recorded where the next reader meets the code',
    ).toBe(true)
    expect(
      /requestAnimationFrame|frame loop|freez/i.test(src),
      'the recorded rationale must name the consequence that decided it (a throw inside ' +
        'requestAnimationFrame freezes the frame loop), not merely announce the choice',
    ).toBe(true)
  })
})

describe('cp5-1 AC3 — a whole frame dispatches in core order', () => {
  it('one call per event, in the order the core emitted them', async () => {
    const kinds = await eventKinds()
    // Take three distinct one-shots so the ordering assertion is meaningful.
    const oneShots = kinds.filter((k) => !isLoopStart(k) && !isLoopStop(k)).slice(0, 3)
    expect(oneShots.length, 'need at least three one-shot kinds to test ordering').toBe(3)

    const play = await dispatchFn()
    const audio = recordingAudio()
    play(
      audio,
      oneShots.map((type) => ({ type })),
    )

    const expected: Effect[] = []
    for (const kind of oneShots) expected.push(...(await effectsFor(kind)))
    expect(audio.calls).toEqual(expected)
  })

  it('repeats a one-shot that appears twice in one frame', async () => {
    // Two segments can die to one frame. Deduplicating here would silently
    // swallow the second kill's cue.
    const kinds = await eventKinds()
    const oneShot = kinds.find((k) => !isLoopStart(k) && !isLoopStop(k))
    expect(oneShot, 'need a one-shot kind').toBeDefined()

    const play = await dispatchFn()
    const audio = recordingAudio()
    play(audio, [{ type: oneShot as string }, { type: oneShot as string }])
    expect(audio.calls.length).toBe(2)
  })
})
