#!/usr/bin/env node
// scripts/gen-registry.mjs — generates src/host/registry.ts from every
// plugins/*/plugin.ts manifest.
//
// This replaces lobby/src/core/registry.ts, which hardcoded each game's launch URL,
// version, colour and controls with nothing generating or checking it — so it rotted:
// red-baron was live but unlisted with no reason recorded, and every version was a
// hand transcription (battlezone's said 1.0.0 while its package.json said 1.0.3). The
// generated file is COMMITTED so the diff is reviewable and the lobby builds with no
// pre-step; tests/registry.test.mjs fails if it goes stale.
//
// WHY IT IMPORTS THE REAL VALIDATOR
// The plan expected this script to re-state src/host/contract.ts's rules in JavaScript,
// because an .mjs script "cannot import a .ts module". It can, since Node 22.18/23.6:
// type stripping is on by default and contract.ts is erasable-syntax only (interfaces,
// annotations and `as` — no enums, namespaces or parameter properties). So the import
// below is the genuine article. Two validators that disagree is worse than one, because
// the loose one is the one that runs; there is now only one.
//
// WHY THE MANIFESTS ARE STILL PARSED AS TEXT
// Node cannot import plugin.ts even with type stripping: `import { version } from
// './package.json'` needs an import attribute, and Node's JSON modules expose only a
// default export, so the named import fails outright. The manifests are deliberately
// plain object literals, so a text parse is exact.
//
// WHAT THIS SCRIPT STILL CHECKS ITSELF, AND WHY IT IS NOT A DUPLICATE
// Only two things, neither of which validateMeta can possibly know:
//
//   1. PRESENCE, checked on the raw text before any coercion. Once a missing field has
//      been coerced it is indistinguishable from a legitimate value: `Number(null)` is
//      0 — a valid integer that validateMeta accepts and that sorts the game FIRST —
//      and a missing `showcase` coerces to `false`, which validateMeta also accepts and
//      which silently drops the game from the lobby carousel. Both are the exact class
//      of invisible absence this whole feature exists to correct, so `order`, `listed`
//      and `showcase` are required as TEXT and booleans must be the literal token.
//   2. Duplicate `order` across the fleet. contract.ts says so in GameMeta's own doc
//      comment: one manifest cannot see its siblings, so this script owns it.
//
// Every rule about a VALUE — id shape, id-vs-directory, title, year, colour, controls,
// listed, showcase, version, and unknown-key rejection — is delegated to validateMeta.
//
// USAGE
//   node scripts/gen-registry.mjs           # write src/host/registry.ts
//   node scripts/gen-registry.mjs --check   # verify it is current; write nothing
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateMeta } from '../src/host/contract.ts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGINS_DIR = join(ROOT, 'plugins');
const OUT = join(ROOT, 'src', 'host', 'registry.ts');
const OUT_REL = 'src/host/registry.ts';

/** Single-quoted TS string literal, escaped. The emitted file is TypeScript source:
 *  an unescaped apostrophe in a title would generate a file that does not parse. */
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Read one manifest and return it validated. Throws — with the offending file named —
 * rather than emitting a registry entry nobody checked.
 */
export function readManifest(dir) {
  const where = `plugins/${dir}/plugin.ts`;
  const file = join(PLUGINS_DIR, dir, 'plugin.ts');
  if (!existsSync(file)) {
    throw new Error(`${where}: missing — every plugins/ directory must declare a manifest`);
  }
  const src = readFileSync(file, 'utf8');
  const body = src.match(/export const meta:\s*GameMeta\s*=\s*\{([\s\S]*?)\n\}/);
  if (!body) throw new Error(`${where}: no 'export const meta: GameMeta = {…}' found`);

  // Anchored at the start of a line: an unanchored \bkey: would also match inside
  // another field's string value.
  const pick = (key) => {
    const m = body[1].match(new RegExp(`^\\s*${key}:\\s*(.+?),\\s*$`, 'm'));
    return m ? m[1].trim() : null;
  };
  const required = (key) => {
    const raw = pick(key);
    if (raw === null) throw new Error(`${where}: missing ${key}`);
    return raw;
  };
  const str = (key) => required(key).replace(/^['"]|['"]$/g, '');
  // required(), never pick(): Number(null) is 0, not NaN, so a missing `order` would
  // survive validateMeta as a legitimate 0 and sort that game to the front.
  const num = (key) => Number(required(key));
  // The literal token, never a truthiness test: `pick(key) === 'true'` alone turns both
  // a missing field and a typo into a silent `false`.
  const bool = (key) => {
    const raw = required(key);
    if (raw !== 'true' && raw !== 'false') {
      throw new Error(`${where}: ${key} must be literally true or false; got ${raw}`);
    }
    return raw === 'true';
  };

  const controlsRaw = required('controls');
  let controls;
  try {
    controls = JSON.parse(controlsRaw.replace(/'/g, '"'));
  } catch {
    throw new Error(
      `${where}: controls must be a one-line array literal of single-quoted strings; got ${controlsRaw}`,
    );
  }

  // The version is read from package.json, never from the manifest, so it cannot be
  // hand-transcribed — which is how the list this replaces rotted. Require the
  // shorthand so a manifest that pins a literal `version: '9.9.9'` fails loudly
  // instead of having it silently ignored.
  if (!/^\s*version,\s*$/m.test(body[1])) {
    throw new Error(
      `${where}: version must be the shorthand \`version,\` imported from ./package.json — a literal would be ignored`,
    );
  }
  const { version } = JSON.parse(readFileSync(join(PLUGINS_DIR, dir, 'package.json'), 'utf8'));

  const parsed = {
    id: str('id'),
    title: str('title'),
    year: num('year'),
    color: str('color'),
    controls,
    order: num('order'),
    listed: bool('listed'),
    showcase: bool('showcase'),
    version,
  };

  // Hand validateMeta the keys it does NOT read, too. Building `parsed` from a fixed
  // list of nine reads means a tenth key — a stale `launchUrl` transcribed from the old
  // registry, or a typo'd `showcas` — is simply not looked at, and validateMeta's
  // unknown-key rule can never fire because the extra key never reaches it. Measured:
  // adding `launchUrl` to a manifest passed generation cleanly until this loop existed.
  // The known set is `Object.keys(parsed)` itself, so no second list can drift.
  // (A nested object literal would make this over-report rather than under-report; the
  // manifests are flat by design, and a loud false alarm beats a silent drop.)
  for (const key of body[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[:,]/gm)) {
    const name = key[1];
    if (name in parsed) continue;
    parsed[name] = pick(name) ?? true;
  }

  // One validator, and it is the real one. `dir` is what makes the id-vs-directory
  // rule bite.
  return validateMeta(parsed, dir);
}

/** Render the registry source. Pure — writes nothing, so tests can diff it against the
 *  committed file without rewriting the very file under test. */
export function buildRegistry() {
  const dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  // Read in directory order, then sort by the CURATED `order` field. Emitting in
  // directory order would silently re-sort the cabinet alphabetically — the tile
  // sequence is a design decision, not an accident of the filesystem.
  const games = dirs.map(readManifest).sort((a, b) => a.order - b.order);

  const seenOrder = new Map();
  for (const g of games) {
    if (seenOrder.has(g.order)) {
      throw new Error(`duplicate order ${g.order}: ${seenOrder.get(g.order)} and ${g.id}`);
    }
    seenOrder.set(g.order, g.id);
  }

  const entries = games
    .map(
      (g) => `  {
    id: ${q(g.id)},
    title: ${q(g.title)},
    year: ${g.year},
    color: ${q(g.color)},
    controls: [${g.controls.map(q).join(', ')}],
    order: ${g.order},
    listed: ${g.listed},
    showcase: ${g.showcase},
    version: ${q(g.version)},
  },`,
    )
    .join('\n');

  const source = `// GENERATED by scripts/gen-registry.mjs — do not edit by hand.
// Run \`npm run gen:registry\` after changing any plugins/*/plugin.ts.
//
// This file replaced lobby/src/core/registry.ts, which was maintained by hand and
// silently drifted from what was actually deployed. Every entry below was validated
// by src/host/contract.ts's validateMeta at generation time, and src/host/registry.test.ts
// re-validates both the manifests and this file on every test run.
import type { GameMeta } from './contract'

/** Every game on the cabinet, in curated tile order — the \`order\` field, not the
 *  directory order the filesystem happens to hand back. */
export const GAMES: readonly GameMeta[] = [
${entries}
]

/** The games the lobby lists — \`listed: false\` opts a game out deliberately. */
export const LISTED_GAMES: readonly GameMeta[] = GAMES.filter((g) => g.listed)

/** The path a game is served at on the single origin. Replaces the old
 *  hand-maintained absolute \`launchUrl\`, which could drift from reality. */
export function gamePath(id: string): string {
  return \`/\${id}/\`
}

/** Look up a game by id; \`undefined\` when no game matches. */
export function getGame(id: string): GameMeta | undefined {
  return GAMES.find((g) => g.id === id)
}
`;

  return { source, games };
}

function main(argv) {
  const check = argv.includes('--check');
  const { source, games } = buildRegistry();
  const tally = `${games.length} games (${games.filter((g) => g.listed).length} listed)`;

  if (check) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : null;
    if (current !== source) {
      console.error(`${OUT_REL} is stale — run \`npm run gen:registry\`.`);
      process.exit(1);
    }
    console.log(`${OUT_REL} is up to date — ${tally}.`);
    return;
  }

  writeFileSync(OUT, source);
  console.log(`Wrote ${OUT_REL} — ${tally}.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2));
}
