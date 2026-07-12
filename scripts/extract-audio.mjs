// scripts/extract-audio.mjs
// Audits every sound the arcade fleet ships against the original Atari ROM.
//
// Five links, and NONE may be skipped:
//   PARSE the original source -> LOCATE via the .MAP -> VERIFY against the ROM bytes
//   -> RENDER to PCM -> COMPARE with what we ship.
//
// NO FALLBACKS, in the ADAPTERS/RENDERERS (scripts/audio/**): a sound that cannot
// complete links 1-4 is UNVERIFIED there. It is never satisfied from an existing
// hand-transcribed table or a shipped .wav — that would convert "we could not prove
// this" into "this looks fine", which is the exact state this tool exists to escape.
// (Enforced mechanically by tests/extract-audio.test.mjs's walk of scripts/audio
// banning any import of a hand-written table.)
//
// LINK 5 (COMPARE) is different, and lives here plus scripts/audio/compare/shipped.mjs:
// this driver's whole job is to read each game's SHIPPED artifact — a hand-table, a
// shipped bake engine, whatever it ships — and machine-compare it against the ROM
// truth links 1-4 already established. Reading a shipped table in order to compare
// and condemn it is the opposite of falling back to it. ROM-VERIFIED now means "the
// ROM says X AND the game plays X" — not merely "we read the ROM correctly". A sound
// whose shipped artifact cannot be machine-compared at all (missing, wrong shape, no
// in-repo artifact to check) is UNVERIFIED, naming exactly why — never ROM-VERIFIED
// just because link 5 couldn't run.
//
// Usage:
//   node scripts/extract-audio.mjs <game> [--render] [--out DIR]
//   node scripts/extract-audio.mjs --all
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPokey } from './audio/render/pokey.mjs';
import { synthesize, SAMPLE_RATE as SPEECH_RATE } from './audio/render/tms5220.mjs';
import { writeWav } from './audio/wav.mjs';
import { parseLda, loadRawRom, readImage } from './audio/parse/rom.mjs';
import * as shipped from './audio/compare/shipped.mjs';

import tempest from './audio/games/tempest.mjs';
import battlezone from './audio/games/battlezone.mjs';
import redBaron from './audio/games/red-baron.mjs';
import asteroids from './audio/games/asteroids.mjs';
import swSpeech from './audio/games/star-wars-speech.mjs';
import swMusic from './audio/games/star-wars-music.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const VERDICT = {
  ROM_VERIFIED: 'ROM-VERIFIED',
  MISMATCH: 'MISMATCH',
  UNVERIFIED: 'UNVERIFIED',
  NO_ROM_AUDIO: 'NO ROM AUDIO',
};

export const ADAPTERS = {
  tempest: [tempest],
  battlezone: [battlezone],
  'red-baron': [redBaron],
  asteroids: [asteroids],
  'star-wars': [swSpeech, swMusic],
};

// Runs fn(), turning a thrown exception into a typed failure instead of crashing
// the whole audit run. The entire point of this tool is to report a broken link,
// not to die on one — a missing file three sounds from the end of the list must
// not erase the verdicts already computed for everything before it.
function attempt(fn) {
  try {
    return { ok: true, value: fn() };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// Same contract as attempt(), but for LINK 5 comparators — several of which
// dynamically import a sibling game repo's tools/ directory, which may be
// missing or broken independently of anything this driver controls. A broken
// comparator degrades to UNVERIFIED for that one sound, not a crashed run.
async function attemptAsync(fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    return { ok: false, error: err };
  }
}

// LINK 5 dispatch for SFX: which shipped artifact does this game's port carry,
// and how do we machine-compare it? Each game ships audio in a genuinely
// different shape (a bake engine + hand table for Tempest, a hand-authored
// TS envelope table for Red Baron, nothing at all for Battlezone), so this is
// necessarily per-game — see scripts/audio/compare/shipped.mjs for what each
// comparison actually does.
function compareSfxShipped(adapter, s) {
  if (adapter.name === 'tempest') return shipped.compareTempestSfx(s.name, s.events);
  if (adapter.name === 'battlezone') return shipped.compareBattlezoneShipped();
  if (adapter.name === 'red-baron') {
    return shipped.compareRedBaronShipped(
      s.tone,
      { audfSweeps: s.audfSweeps, audcSweeps: s.audcSweeps },
      join(REPO_ROOT, 'red-baron', 'src', 'shell', 'pokey.ts'),
    );
  }
  return { status: 'unverified', reason: 'no shipped-artifact comparator is wired for this game yet' };
}

// Turns a LINK 5 comparison result (or a thrown failure) into a verdict row.
// `cmpResult` is an attemptAsync() envelope: { ok, value } or { ok: false, error }.
function verdictFromComparison(game, sound, cmpResult, provenance) {
  if (!cmpResult.ok) {
    return {
      game, sound, verdict: VERDICT.UNVERIFIED,
      reason: `link 5 (compare): comparator threw: ${cmpResult.error.message}`, provenance,
    };
  }
  const cmp = cmpResult.value;
  if (cmp.status === 'match') {
    const v = { game, sound, verdict: VERDICT.ROM_VERIFIED, provenance };
    if (cmp.reason) v.reason = cmp.reason;
    return v;
  }
  if (cmp.status === 'mismatch') {
    return { game, sound, verdict: VERDICT.MISMATCH, reason: cmp.reason, provenance };
  }
  return { game, sound, verdict: VERDICT.UNVERIFIED, reason: `link 5 (compare): ${cmp.reason}`, provenance };
}

// LINK 3: is the table we parsed from source actually IN THE ROM, byte for byte?
//
// We verify the WHOLE CONTIGUOUS TABLE in one comparison rather than per-sound
// slices. Simpler, and strictly stronger — a per-sound slice would need to know
// each channel's exact length, which is precisely the thing the sources' stale
// "6 BYTES PER SOUND" comment gets wrong. If the table matches the ROM, every
// sound derived from it is verified by construction.
function verifyTableAgainstRom(adapter) {
  if (!adapter.romFile || !adapter.table) {
    return { ok: false, why: `no ROM image is available for ${adapter.name}` };
  }
  const romPath = join(homedir(), 'Projects', `${adapter.dirbase}-source`, adapter.romFile);
  if (!existsSync(romPath)) {
    return { ok: false, why: `ROM image missing at ${romPath} — run: just vendor-source` };
  }
  const buf = readFileSync(romPath);
  const { image } = adapter.romFile.toUpperCase().endsWith('.LDA')
    ? parseLda(buf)
    : loadRawRom(buf, adapter.romBase);

  const { bytes: want, romAddr } = adapter.table();
  if (!want || want.length === 0) return { ok: false, why: 'adapter produced no table bytes to verify' };
  const got = readImage(image, romAddr, want.length);
  for (let i = 0; i < want.length; i++) {
    if (got[i] !== want[i]) {
      return {
        ok: false,
        why: `ROM byte mismatch at $${(romAddr + i).toString(16)}: source says 0x${want[i].toString(16)}, ROM holds 0x${(got[i] ?? 0).toString(16)}`,
      };
    }
  }
  return { ok: true, bytes: want.length, romAddr };
}

// Int16 lattice output -> the [-1,1] float PCM the shared writeWav/pcmBytes expect
// (renderPokey already returns floats in that range; tms5220's synthesize() does
// NOT — its `samples` is a real Int16Array, so feeding it to writeWav unscaled
// would clip almost everything to +-1).
function int16ToFloat(samples) {
  return Float32Array.from(samples, (v) => v / 32768);
}

export async function audit(adapter, { render = false, outDir = null } = {}) {
  const verdicts = [];

  for (const s of adapter.noRomAudio ?? []) {
    verdicts.push({ game: adapter.name, sound: s.name, verdict: VERDICT.NO_ROM_AUDIO, reason: s.reason });
  }

  // ── SFX: LINK 1 (parse) -> LINK 3 (ROM verify) -> LINK 4 (render) ──────────
  const sfxResult = adapter.sfx ? attempt(() => adapter.sfx()) : { ok: true, value: [] };
  if (!sfxResult.ok) {
    verdicts.push({
      game: adapter.name, sound: 'sfx', verdict: VERDICT.UNVERIFIED,
      reason: `link 1 (parse): sfx() threw: ${sfxResult.error.message}`,
    });
  } else {
    const sfx = sfxResult.value;
    // One ROM check per game, up front. If the table is not in the ROM, NOTHING
    // derived from it is verified — and we say so per sound rather than quietly
    // rendering anyway.
    let check = { ok: true };
    if (sfx.length) {
      const checkResult = attempt(() => verifyTableAgainstRom(adapter));
      check = checkResult.ok ? checkResult.value : { ok: false, why: `verifyTableAgainstRom threw: ${checkResult.error.message}` };
    }
    for (const s of sfx) {
      if (!check.ok) {
        verdicts.push({
          game: adapter.name, sound: s.name, verdict: VERDICT.UNVERIFIED,
          reason: `link 3 (ROM verify): ${check.why}`, provenance: s.provenance,
        });
        continue;
      }
      if (render && outDir) {
        const pcm = renderPokey(s.events, { durationMs: s.durationMs, sampleRate: 48000 });
        mkdirSync(join(outDir, adapter.name, 'sfx'), { recursive: true });
        writeWav(join(outDir, adapter.name, 'sfx', `${s.name}.wav`), pcm, 48000);
      }
      // LINK 5: does the shipped artifact actually match?
      const cmp = await attemptAsync(() => compareSfxShipped(adapter, s));
      verdicts.push(verdictFromComparison(adapter.name, s.name, cmp, s.provenance));
    }
  }

  // ── SPEECH: the LPC bytes are read straight out of the ROM image (see
  // star-wars-speech.mjs), so there is no separate source-vs-ROM table to
  // cross-check — the ROM IS the source for this chain. LINK 1 here is "did we
  // get real LPC bytes for this phrase at all." ─────────────────────────────
  const speechResult = adapter.speech ? attempt(() => adapter.speech()) : { ok: true, value: [] };
  if (!speechResult.ok) {
    verdicts.push({
      game: adapter.name, sound: 'speech', verdict: VERDICT.UNVERIFIED,
      reason: `link 1-3 (parse/locate/ROM-image): speech() threw: ${speechResult.error.message}`,
    });
  } else {
    for (const line of speechResult.value) {
      if (!line.lpc || line.lpc.length === 0) {
        verdicts.push({
          game: adapter.name, sound: `speech/${line.name}`, verdict: VERDICT.UNVERIFIED,
          reason: 'link 1 (parse): no LPC bytes for this phrase', provenance: line.provenance,
        });
        continue;
      }
      if (render && outDir) {
        const { samples } = synthesize(line.lpc, { gain: 2.0 });
        mkdirSync(join(outDir, adapter.name, 'speech'), { recursive: true });
        writeWav(join(outDir, adapter.name, 'speech', `${line.name}.wav`), int16ToFloat(samples), SPEECH_RATE);
      }
      // LINK 5: compare against star-wars/tools/speech-bake/speech-data.mjs.
      const cmp = await attemptAsync(() => shipped.compareStarWarsSpeech(line.n, line.lpc));
      verdicts.push(verdictFromComparison(adapter.name, `speech/${line.name}`, cmp, line.provenance));
    }
  }

  // ── MUSIC: same as speech — the bytecode runs directly against the ROM
  // image (see star-wars-music.mjs), so LINK 1 here is "did interpreting the
  // bytecode actually produce register writes." ──────────────────────────────
  const musicResult = adapter.music ? attempt(() => adapter.music()) : { ok: true, value: [] };
  if (!musicResult.ok) {
    verdicts.push({
      game: adapter.name, sound: 'music', verdict: VERDICT.UNVERIFIED,
      reason: `link 1-3 (parse/locate/ROM-image): music() threw: ${musicResult.error.message}`,
    });
  } else {
    for (const tune of musicResult.value) {
      const total = tune.voices.reduce((n, v) => n + v.events.length, 0);
      if (total === 0) {
        verdicts.push({
          game: adapter.name, sound: `music/${tune.name}`, verdict: VERDICT.UNVERIFIED,
          reason: 'link 1 (parse): the tune produced no register writes', provenance: tune.provenance,
        });
        continue;
      }
      if (render && outDir) {
        mkdirSync(join(outDir, adapter.name, 'music'), { recursive: true });
        const durationMs = Math.max(...tune.voices.map((v) => v.durationMs));
        const mix = new Float32Array(Math.ceil((durationMs / 1000) * 48000));
        for (const v of tune.voices) {
          const pcm = renderPokey(v.events, { durationMs, sampleRate: 48000 });
          for (let i = 0; i < mix.length && i < pcm.length; i++) mix[i] += pcm[i] / tune.voices.length;
        }
        writeWav(join(outDir, adapter.name, 'music', `${tune.name}.wav`), mix, 48000);
      }
      // LINK 5: music ships as pre-rendered .wav on a CDN — no in-repo
      // artifact exists to machine-compare against (see shipped.mjs).
      const cmp = await attemptAsync(() => shipped.compareStarWarsMusic());
      verdicts.push(verdictFromComparison(adapter.name, `music/${tune.name}`, cmp, tune.provenance));
    }
  }

  return verdicts;
}

export function formatReport(verdicts) {
  const icon = {
    [VERDICT.ROM_VERIFIED]: 'OK ', [VERDICT.MISMATCH]: 'XX ',
    [VERDICT.UNVERIFIED]: 'XX ', [VERDICT.NO_ROM_AUDIO]: '-- ',
  };
  const lines = ['| Game | Sound | Verdict | Evidence / Reason |', '|------|-------|---------|-------------------|'];
  for (const v of verdicts) {
    lines.push(`| ${v.game} | ${v.sound} | ${icon[v.verdict]}${v.verdict} | ${v.reason ?? v.provenance ?? ''} |`);
  }
  return lines.join('\n');
}

export function parseArgs(argv) {
  const opts = { game: null, render: false, all: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--render') opts.render = true;
    else if (a === '--all') opts.all = true;
    else if (a === '--out') opts.out = argv[++i];
    else if (!a.startsWith('--')) opts.game = a;
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const games = opts.all ? Object.keys(ADAPTERS) : [opts.game];
  if (!games[0]) {
    console.error('usage: extract-audio <game> [--render] [--out DIR]');
    console.error('       extract-audio --all');
    process.exit(2);
  }

  const outDir = opts.out ?? join(REPO_ROOT, 'out', 'audio');
  const all = [];
  for (const g of games) {
    for (const adapter of ADAPTERS[g] ?? []) {
      all.push(...(await audit(adapter, { render: opts.render, outDir })));
    }
  }

  console.log(formatReport(all));
  const bad = all.filter((v) => v.verdict === VERDICT.MISMATCH || v.verdict === VERDICT.UNVERIFIED);
  const ok = all.filter((v) => v.verdict === VERDICT.ROM_VERIFIED);
  console.log(`\n${ok.length} ROM-VERIFIED, ${bad.length} MISMATCH/UNVERIFIED, ` +
    `${all.length - ok.length - bad.length} NO ROM AUDIO.`);
  if (bad.length) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
