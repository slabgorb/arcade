#!/usr/bin/env node
// scripts/build-app.mjs — builds ONE app.
//
//   node scripts/build-app.mjs tempest   # → dist/tempest/   (base '/tempest/')
//   node scripts/build-app.mjs lobby     # → dist/           (base '/')
//
// ONE ORIGIN DOES NOT MEAN ONE BUILD. Each app builds independently into its own
// dist/<id>/ and uploads to only its own key prefix in the shared bucket
// (`node scripts/deploy-r2.mjs dist/tempest arcade-lobby tempest`). That is what
// preserves per-game versions, per-game test gates and per-game releases now that
// nine repos are one — a single all-apps build would make every release a fleet
// release.
//
// WHAT IT IMPORTS RATHER THAN RE-STATES
//   - `readManifest` from ./gen-registry.mjs, which imports the REAL `validateMeta`
//     from ../src/host/contract.ts (Node ≥22.18 strips types; contract.ts is
//     erasable-syntax only). So a game cannot be built with a manifest the registry
//     generator would reject — id-vs-directory, colour, controls, unknown keys and
//     all — and this file re-states none of those rules.
//   - `defineAppConfig` from ../vite.config.ts: the one place `base`, `outDir` and
//     the alias map are decided.
//
// WHAT IT OWNS: reading the `build` export out of a manifest. See parseBuildEntries.
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readManifest } from './gen-registry.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PLUGINS_DIR = join(ROOT, 'plugins')

/** Every id this script accepts: the plugin directories, plus the lobby. */
export function appIds() {
  const games = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  return [...games, 'lobby']
}

// ---------------------------------------------------------------------------
// Reading `export const build: BuildSpec = { entries: [...] }` out of a manifest
// ---------------------------------------------------------------------------
// The manifests cannot be imported: `import { version } from './package.json'`
// needs an import attribute and Node's JSON modules have no named exports (the
// same reason gen-registry.mjs parses them as text). So this is a text read — and
// a text read of a declaration TypeScript is happy to reformat is exactly the
// chain that can break silently.
//
// The hazard, stated plainly because it is the whole reason this code is not a
// one-line regex: three games ship a second HTML page (tempest models.html,
// star-wars models.html + scenes.html, red-baron models.html). A naive
// `/entries:\s*\[([^\]]*)\]/` is defeated by `entries` on its own line, a trailing
// comma, `satisfies BuildSpec`, `as const`, double quotes, or the array spilling
// past a printer's width — Prettier reformatting a manifest is enough. Every one of
// those yields ZERO entries and a GREEN build that silently drops a dev-tool page.
//
// Two defences, because a test alone only catches it after the fact:
//   1. the reader below is structural (comments and string contents are blanked,
//      then brackets are matched), so all six of those reformattings parse;
//   2. anything it still cannot read THROWS. It never falls through to `[]`, since
//      silence is indistinguishable from "this game has no dev tools".

/**
 * Blank out comments and string CONTENTS, preserving length and every structural
 * character, so the scans below cannot be derailed by a `}` inside a title, a `,`
 * inside a string, or a commented-out declaration. Indices stay valid against the
 * original source, so values are sliced from the original.
 *
 * Known limit: a regex literal containing quotes would be misread. Manifests are
 * imports plus object literals — there are none, and one would fail loudly here
 * rather than silently, which is the property that matters.
 */
export function scrub(src, { strings = true } = {}) {
  const out = src.split('')
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' '
  }
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (c === '/' && src[i + 1] === '/') {
      const nl = src.indexOf('\n', i)
      const end = nl === -1 ? src.length : nl
      blank(i, end)
      i = end
    } else if (c === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2)
      const end = close === -1 ? src.length : close + 2
      blank(i, end)
      i = end
    } else if (c === "'" || c === '"' || c === '`') {
      // Strings are always SKIPPED (so `'https://x'` is never read as a comment);
      // `strings: false` skips without blanking, which is what lets a QUOTED KEY
      // keep its name while structure is still read from the blanked pass.
      let j = i + 1
      while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
      if (strings) blank(i + 1, j) // keep both quotes; blank what is between them
      i = Math.min(j + 1, src.length)
    } else {
      i++
    }
  }
  return out.join('')
}

/** Bracket depth at `idx`, counting every bracket kind. */
function depthAt(s, idx) {
  let d = 0
  for (let i = 0; i < idx; i++) {
    if (s[i] === '{' || s[i] === '[' || s[i] === '(') d++
    else if (s[i] === '}' || s[i] === ']' || s[i] === ')') d--
  }
  return d
}

/** Index of the bracket closing the one at `open`. Throws if unbalanced. */
function closing(s, open, where) {
  const openChar = s[open]
  const closeChar = { '{': '}', '[': ']' }[openChar]
  let d = 0
  for (let i = open; i < s.length; i++) {
    if (s[i] === openChar) d++
    else if (s[i] === closeChar && --d === 0) return i
  }
  throw new Error(`${where}: unbalanced ${openChar} in the \`build\` export`)
}

/** Split a bracket body at top-level commas, as [start, end) index ranges. */
function splitTop(s) {
  const parts = []
  let d = 0
  let start = 0
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === '{' || c === '[' || c === '(') d++
    else if (c === '}' || c === ']' || c === ')') d--
    else if (c === ',' && d === 0) {
      parts.push([start, i])
      start = i + 1
    }
  }
  parts.push([start, s.length])
  return parts
}

/** Trim an index range against the scrubbed text (whitespace is identical in both). */
function trimRange(s, [start, end]) {
  let a = start
  let b = end
  while (a < b && /\s/.test(s[a])) a++
  while (b > a && /\s/.test(s[b - 1])) b--
  return [a, b]
}

const KEY = /(?:^|[{,\s])(?:'([A-Za-z_$][\w$]*)'|"([A-Za-z_$][\w$]*)"|([A-Za-z_$][\w$]*))\s*:/g

/**
 * The extra HTML entries a manifest declares, in declaration order.
 *
 * Returns `[]` ONLY for a manifest that says nothing about the build — never as a
 * fallback from a failed read. Everything else throws, naming the file.
 *
 * @param {string} src   plugin.ts source text
 * @param {string} where the path to name in errors
 * @returns {string[]}
 */
export function parseBuildEntries(src, where) {
  const code = scrub(src)
  const decl = /(^|[\s;])export\s+const\s+build\b[^=]*=/.exec(code)

  if (!decl) {
    // A manifest that names BuildSpec but has no readable `build` export is the
    // signature of the exact failure this function exists to prevent: the
    // declaration is there and could not be read. Refuse, rather than build a
    // game with its dev-tool pages quietly missing.
    if (/\bBuildSpec\b/.test(src)) {
      throw new Error(
        `${where}: names BuildSpec but has no readable \`export const build = { … }\`. ` +
          `Refusing to build with zero dev-tool entries — that is indistinguishable from a ` +
          `dropped page. Restore the declaration, or drop the unused BuildSpec import.`,
      )
    }
    return []
  }

  const braceAt = code.indexOf('{', decl.index + decl[0].length)
  const gap = code.slice(decl.index + decl[0].length, braceAt === -1 ? code.length : braceAt)
  if (braceAt === -1 || gap.trim() !== '') {
    throw new Error(
      `${where}: \`export const build\` must be assigned an object literal ` +
        `(\`= { entries: ['models.html'] }\`); got ${JSON.stringify(gap.trim().slice(0, 40))}`,
    )
  }
  const close = closing(code, braceAt, where)
  const bodyStart = braceAt + 1
  const body = code.slice(bodyStart, close)

  // Top-level keys only: a key nested in some future sub-object is not `entries`.
  //
  // Candidates are matched against the pass that KEEPS string contents, because
  // `{ 'entries': [...] }` is a legal quoted key whose name the blanking pass
  // erases. Each candidate is then confirmed against the blanked pass, which is
  // what tells a quoted KEY apart from a colon inside a string VALUE:
  //   - quoted key  → blanked pass shows quote, blanks, quote   ('       ':)
  //   - bare key    → blanked pass still shows the identifier   (survived)
  //   - inside a string value → blanked pass shows blanks with no opening quote
  const named = scrub(src, { strings: false }).slice(bodyStart, close)
  const keys = []
  KEY.lastIndex = 0
  for (let m = KEY.exec(named); m !== null; m = KEY.exec(named)) {
    const name = m[1] ?? m[2] ?? m[3]
    const quoted = m[1] !== undefined || m[2] !== undefined
    const at = m.index + m[0].lastIndexOf(name)
    const isKey = quoted
      ? (body[at - 1] === "'" || body[at - 1] === '"') && body.slice(at, at + name.length).trim() === ''
      : body[at] === named[at]
    if (isKey && depthAt(body, at) === 0) keys.push({ name, valueAt: m.index + m[0].length })
    KEY.lastIndex = m.index + m[0].length
  }

  // Unknown keys are rejected rather than ignored — the same stance contract.ts
  // takes on GameMeta, and for the same reason: a typo'd `entires:` that was
  // merely ignored would drop the page silently.
  for (const { name } of keys) {
    if (name !== 'entries') {
      throw new Error(`${where}: unknown key '${name}' in the \`build\` export — expected: entries`)
    }
  }
  const entriesKey = keys.find((k) => k.name === 'entries')
  if (!entriesKey) {
    // `= {}` is a legitimate statement ("no extra pages"); anything else in there
    // means something was declared that this reader did not understand.
    if (body.trim() !== '') {
      throw new Error(`${where}: could not find an \`entries\` key in the \`build\` export`)
    }
    return []
  }

  const openBracket = code.indexOf('[', entriesKey.valueAt + bodyStart)
  const between = code.slice(entriesKey.valueAt + bodyStart, openBracket === -1 ? code.length : openBracket)
  if (openBracket === -1 || between.trim() !== '' || openBracket > close) {
    throw new Error(
      `${where}: \`entries\` must be an array literal of quoted file names; got ` +
        `${JSON.stringify(between.trim().slice(0, 40))}`,
    )
  }
  const closeBracket = closing(code, openBracket, where)
  const arrayBody = code.slice(openBracket + 1, closeBracket)

  const entries = []
  for (const range of splitTop(arrayBody)) {
    const [a, b] = trimRange(arrayBody, range)
    if (a === b) continue // a trailing comma, or an empty array
    const abs = openBracket + 1 + a
    const raw = src.slice(abs, openBracket + 1 + b)
    const quote = raw[0]
    // The scrubbed slice proves it is ONE complete string literal: both quotes at
    // the ends, nothing but blanks between. A variable, a call or a template
    // literal fails here rather than being read as a filename.
    const scrubbedSlice = code.slice(abs, openBracket + 1 + b)
    if (
      (quote !== "'" && quote !== '"') ||
      raw.length < 2 ||
      raw[raw.length - 1] !== quote ||
      scrubbedSlice.slice(1, -1).trim() !== ''
    ) {
      throw new Error(
        `${where}: every \`entries\` element must be a quoted file name; got ${JSON.stringify(raw)}`,
      )
    }
    entries.push(raw.slice(1, -1).replace(/\\(['"\\])/g, '$1'))
  }

  for (const entry of entries) {
    if (entry.trim() === '') throw new Error(`${where}: an \`entries\` element is blank`)
    if (!entry.endsWith('.html')) {
      throw new Error(`${where}: \`entries\` element '${entry}' is not an .html page`)
    }
    if (entry === 'index.html') {
      throw new Error(
        `${where}: 'index.html' is every app's implicit entry — declaring it builds the page twice`,
      )
    }
    if (entry.startsWith('/') || entry.split(/[\\/]/).includes('..')) {
      throw new Error(`${where}: \`entries\` element '${entry}' must be inside the app directory`)
    }
  }
  if (new Set(entries).size !== entries.length) {
    throw new Error(`${where}: duplicate \`entries\` element — rollup would silently collapse them`)
  }
  return entries
}

/** The dev-tool entries plugins/<id> declares. `[]` for an app with no manifest. */
export function buildEntriesFor(id) {
  const where = `plugins/${id}/plugin.ts`
  const file = join(PLUGINS_DIR, id, 'plugin.ts')
  if (!existsSync(file)) return []
  return parseBuildEntries(readFileSync(file, 'utf8'), where)
}

// ---------------------------------------------------------------------------
// The build
// ---------------------------------------------------------------------------

/**
 * The lobby's outDir IS dist/, the parent of every game's dist/<id>/, so Vite's
 * `emptyOutDir: true` deletes all seven games when the lobby is built. MEASURED,
 * not assumed: build tempest, then build the lobby from the unmodified factory
 * config, and dist/tempest/index.html is gone. (Vite's "outDir is outside root"
 * safety does not save it — the factory sets emptyOutDir explicitly.)
 *
 * That breaks the one rule this script exists to keep: each app builds
 * independently. So the lobby cleans only its OWN output — every top-level entry
 * of dist/ that is not a game directory — and builds with emptyOutDir off.
 */
export function cleanLobbyOutput(distDir) {
  if (!existsSync(distDir)) return
  const games = new Set(appIds().filter((id) => id !== 'lobby'))
  for (const entry of readdirSync(distDir, { withFileTypes: true })) {
    if (entry.isDirectory() && games.has(entry.name)) continue
    rmSync(join(distDir, entry.name), { recursive: true, force: true })
  }
}

/**
 * The exact Vite config this script builds `id` with. Separate from buildApp, and
 * side-effect free, so the two properties that cost the fleet a rebuild to discover
 * — the lobby must not empty dist/, and no app may pick up a config file — are
 * assertable without running a build.
 */
export async function appBuildConfig(id) {
  const isLobby = id === 'lobby'
  const appDir = isLobby ? join(ROOT, 'lobby') : join(PLUGINS_DIR, id)
  if (!existsSync(appDir)) {
    throw new Error(`no such app '${id}' — expected one of: ${appIds().join(', ')}`)
  }

  let entries = []
  if (!isLobby) {
    // The real validator, reached through gen-registry.mjs → src/host/contract.ts.
    // A manifest the registry would reject must not build either.
    readManifest(id)
    entries = buildEntriesFor(id)
    for (const entry of entries) {
      if (!existsSync(join(appDir, entry))) {
        throw new Error(`plugins/${id}/plugin.ts declares '${entry}', which does not exist`)
      }
    }
  }

  // Dynamic so that importing this module (from a test) costs nothing but node:fs.
  const { defineAppConfig } = await import('../vite.config.ts')

  const config = {
    ...defineAppConfig({ id, entries }),
    // The root vite.config.ts's default export is the LOBBY's config, and every app
    // root is a subdirectory of the repo. MEASURED on Vite 8.1: with
    // root=plugins/tempest the config search does NOT walk up (resolved configFile
    // was undefined), so this pins that behaviour rather than depending on it —
    // a config search that ever did walk up would build the lobby while reporting
    // that it was building a game.
    configFile: false,
  }
  // A game empties its own dist/<id>/ as usual; only the lobby, whose outDir is
  // the shared parent, must not. See cleanLobbyOutput.
  if (isLobby) config.build = { ...config.build, emptyOutDir: false }
  return config
}

export async function buildApp(id) {
  const config = await appBuildConfig(id)
  const { build } = await import('vite')
  const entries = Object.keys(config.build.rollupOptions.input).filter((k) => k !== 'main')
  if (id === 'lobby') cleanLobbyOutput(config.build.outDir)

  console.log(`Building ${id}${entries.length ? ` (+ ${entries.join('.html, ')}.html)` : ''} → ${config.build.outDir}`)
  await build(config)
  return { id, outDir: config.build.outDir }
}

async function main(argv) {
  const id = argv[0]
  if (!id) {
    console.error(`Usage: node scripts/build-app.mjs <id>\n  ids: ${appIds().join(', ')}`)
    process.exit(1)
  }
  try {
    await buildApp(id)
  } catch (e) {
    // Every throw above names the file and says what is wrong; an uncaught one
    // buries that sentence under ten lines of V8 stack.
    console.error(`build-app: ${e.message}`)
    process.exit(1)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2))
}
