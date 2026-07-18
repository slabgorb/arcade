// Vendors a preserved original-source repo (historicalsource/*) INTO THIS REPO at
// reference/atari-source/<name>/, and records the provenance (repo + pinned SHA)
// in docs/reference-sources.md.
//
// The vendored tree is the greppable copy: same filenames, text LF-normalized to
// plain ASCII, binaries (.lda/.sav/.prg/ROM dumps) passed through VERBATIM — so it
// is ALSO the byte-of-record. The ROM images in it are byte-identical to the clone,
// which is what lets the audit in scripts/extract-audio.mjs use them as its oracle.
//
// A PRISTINE git clone is still kept under ~/Projects/<name>-source as a local
// cache to transcribe from and diff against; it is NOT what any tool reads.
//
// The original Atari source files are CR-terminated, non-UTF8 — grep flags them
// binary and silently returns nothing. The greppable copy applies the canonical
// byte transform documented in star-wars/CLAUDE.md:112.
//
// Usage:
//   node scripts/vendor-source.mjs <org/repo> [--ref <ref>] [--name <dirbase>] [--force] [--index-only]
//   node scripts/vendor-source.mjs --all [--force]
//
// Examples:
//   node scripts/vendor-source.mjs historicalsource/red-baron
//   just vendor-source historicalsource/red-baron
//   just vendor-source-all
import { execFileSync } from 'node:child_process';
import {
  readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync,
} from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = join(homedir(), 'Projects');
const INDEX = join(ROOT, 'docs', 'reference-sources.md');

// The fleet of known original-source repos (one per game). `--all` iterates this.
export const FLEET = [
  { repo: 'historicalsource/tempest' },
  { repo: 'historicalsource/asteroids' },
  { repo: 'historicalsource/battlezone' },
  { repo: 'historicalsource/red-baron' },
  { repo: 'historicalsource/centipede' },
  // Grandfathered: vendored by hand at the load-bearing -1983- path (cited across
  // the sprint context files). Index-only — the tool records it, never clobbers it.
  { repo: 'historicalsource/star-wars', ref: '5355b76', name: 'star-wars-1983', indexOnly: true },
];

// --- pure core (unit-tested) -------------------------------------------------

// The canonical byte transform, identical to star-wars/CLAUDE.md:112:
//   s/\r\n/\n/g; s/\r/\n/g; s/\x0c/\n/g; s/[^\x09\x0a\x20-\x7e]//g
// Reads bytes as latin1 (charCode === byte), normalizes line breaks, then strips
// any byte that is not tab / LF / printable ASCII. The result is pure 7-bit ASCII.
export function transcribe(input) {
  const s = Buffer.isBuffer(input) ? input.toString('latin1') : String(input);
  const out = s
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n') // \f === \x0c form-feed → keep the page break as a newline
    .replace(/[^\x09\x0a\x20-\x7e]/g, '');
  return Buffer.from(out, 'latin1'); // every codepoint is now <= 0x7e → ASCII bytes
}

// Extensions copied VERBATIM — binary artifacts the transcribe would shred into
// ASCII confetti. Classification is by EXTENSION, not content: a content/ratio
// heuristic is impossible here because real source and real binaries overlap —
// star-wars `SNDSUM.MAC` (sound data) is 78% non-ASCII text we WANT greppable,
// while a `.LDA` load-module is only 61% non-ASCII binary we want verbatim.
//
//   .lda  DEC/RSX-11 load-modules   (star-wars — the one proven binary there)
//   .sav  DEC save-images           (red-baron/tempest/battlezone STATE2/03617X)
//   .prg  program/ROM images        (battlezone XXX225.PRG — 32 KB, 84% non-ASCII)
//   \.\d+ numbered ROM-chip dumps   (red-baron 036995.01, battlezone .01/.02)
//
// This preserves the star-wars fidelity oracle exactly: that repo has no `.sav`
// and no numbered files, so only `.lda` triggers there. Extend BINARY_EXTS (with
// evidence from the pristine clone) when a new repo shows a binary format whose
// greppable copy comes out mangled. NOTE: red-baron's two binary `.COM` files
// (STATE2/MBUCOD microcode) still transcribe to harmless confetti — `.COM` is
// text in star-wars, so it can't be denylisted globally; the truth is in the
// pristine clone and neither is a grep target.
export const BINARY_EXTS = new Set(['.lda', '.sav', '.prg']);
const ROM_DUMP = /\.\d+$/; // numbered PROM image, e.g. 036995.01

export function isBinaryName(name) {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot < 0) return false;
  return BINARY_EXTS.has(lower.slice(dot)) || ROM_DUMP.test(lower);
}

// The bytes to write for one source file: binaries verbatim, text transcribed.
export function vendorBytes(buf, name) {
  return isBinaryName(name) ? buf : transcribe(buf);
}

const COLUMNS = '| Name | Repo | Pinned SHA | Clone cache | In-repo source | Vendored |';
const DIVIDER = '|------|------|------------|----------------|----------------|----------|';

export function formatRow(r) {
  return `| ${r.name} | ${r.repo} | ${r.sha} | ${r.pristine} | ${r.greppable} | ${r.vendored} |`;
}

function freshIndex(row) {
  return [
    '# Reference sources — vendored original Atari source',
    '',
    'The preserved original Atari source for each game, vendored **into this repo** at',
    '`reference/atari-source/<name>/` by `just vendor-source`. This table records where',
    'each tree came from and the commit it is pinned to.',
    '',
    'The vendored tree is LF-normalized ASCII (grep it directly — the upstream files are',
    'CR-terminated non-UTF8 and grep flags them binary), but binaries — `.lda`, `.sav`,',
    '`.prg`, numbered ROM dumps — are passed through VERBATIM, so the ROM images here are',
    'byte-identical to the upstream clone. That is what `just extract-audio` audits against.',
    '',
    'Refresh a row with `just vendor-source <org/repo>` (or the fleet with',
    '`just vendor-source-all`). A pristine clone is cached at `~/Projects/<name>-source`;',
    'no tool reads it.',
    '',
    COLUMNS,
    DIVIDER,
    formatRow(row),
    '',
  ].join('\n');
}

// Upsert a row keyed by `name` into the index markdown: replace a row with the
// same name, else append. Rebuilds the whole doc when `md` has no table yet.
export function upsertIndexRow(md, row) {
  const line = formatRow(row);
  if (!md || !md.includes(COLUMNS)) return freshIndex(row);
  const lines = md.split('\n');
  const sep = lines.findIndex((l) => /^\|[-\s|]+\|$/.test(l.trim()));
  const start = sep + 1;
  let end = start;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const rows = lines.slice(start, end);
  const at = rows.findIndex((l) => l.split('|')[1]?.trim() === row.name);
  if (at >= 0) rows[at] = line;
  else rows.push(line);
  return [...lines.slice(0, start), ...rows, ...lines.slice(end)].join('\n');
}

// --- io helpers --------------------------------------------------------------

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function tilde(p) {
  return p.startsWith(homedir()) ? `~${p.slice(homedir().length)}` : p;
}

function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// --- vendoring one repo ------------------------------------------------------

function transcribeTree(srcDir, destDir) {
  rmSync(destDir, { recursive: true, force: true });
  for (const file of walk(srcDir)) {
    const rel = file.slice(srcDir.length + 1);
    const dest = join(destDir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, vendorBytes(readFileSync(file), rel));
  }
}

function vendorOne({ repo, ref, name, force, indexOnly }) {
  const dirbase = name || basename(repo);
  const pristine = join(PROJECTS, `${dirbase}-source`);   // local clone cache
  const greppable = join(ROOT, 'reference', 'atari-source', dirbase); // IN-REPO reference

  // Index-only: the dirs already exist (hand-vendored); record, never clobber.
  if (indexOnly) {
    if (!existsSync(greppable)) {
      throw new Error(`--index-only but the vendored tree is missing at ${greppable}`);
    }
    let sha = ref;
    if (!sha) sha = existsSync(join(pristine, '.git')) ? git(pristine, 'rev-parse', 'HEAD').slice(0, 7) : 'hand';
    return {
      name: dirbase, repo, sha,
      pristine: existsSync(pristine) ? tilde(pristine) : '— (hand copy — text only)',
      greppable: tilde(greppable),
      vendored: today(),
    };
  }

  if (existsSync(pristine)) {
    if (!force) throw new Error(`${pristine} already exists (pass --force to replace)`);
    rmSync(pristine, { recursive: true, force: true });
  }

  const url = `https://github.com/${repo}.git`;
  console.log(`  clone ${url}`);
  git(PROJECTS, 'clone', '--quiet', url, pristine);
  if (ref) git(pristine, 'checkout', '--quiet', ref);
  const sha = git(pristine, 'rev-parse', 'HEAD').slice(0, 7);

  console.log(`  transcribe → ${tilde(greppable)}`);
  transcribeTree(pristine, greppable);

  return {
    name: dirbase, repo, sha, pristine: tilde(pristine), greppable: tilde(greppable), vendored: today(),
  };
}

function record(row) {
  mkdirSync(dirname(INDEX), { recursive: true });
  const md = existsSync(INDEX) ? readFileSync(INDEX, 'utf8') : '';
  writeFileSync(INDEX, upsertIndexRow(md, row));
}

// --- cli ---------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = { force: false, indexOnly: false, all: false };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') opts.force = true;
    else if (a === '--index-only') opts.indexOnly = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--ref') opts.ref = argv[++i];
    else if (a === '--name') opts.name = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`);
    else pos.push(a);
  }
  opts.repo = pos[0];
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.all && !opts.repo) {
    console.error('usage: vendor-source <org/repo> [--ref R] [--name D] [--force] [--index-only]');
    console.error('       vendor-source --all [--force]');
    process.exit(2);
  }

  const jobs = opts.all
    ? FLEET.map((e) => ({ ...e, force: opts.force }))
    : [{ repo: opts.repo, ref: opts.ref, name: opts.name, force: opts.force, indexOnly: opts.indexOnly }];

  const done = [];
  const failed = [];
  for (const job of jobs) {
    try {
      console.log(`\n▶ ${job.repo}${job.indexOnly ? ' (index-only)' : ''}`);
      const row = vendorOne(job);
      record(row);
      done.push(row);
      console.log(`  ✓ ${row.name}  ${row.sha}`);
    } catch (err) {
      failed.push({ repo: job.repo, error: err.message });
      console.error(`  ✗ ${job.repo}: ${err.message}`);
    }
  }

  console.log(`\nVendored ${done.length}/${jobs.length}. Index: ${tilde(INDEX)}`);
  for (const r of done) console.log(`  ${r.name}: grep → ${r.greppable}`);
  if (failed.length) {
    console.log('\nFailed:');
    for (const f of failed) console.log(`  ${f.repo}: ${f.error}`);
    process.exit(1);
  }
}

// Run main only when executed directly, so tests can import the pure helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
