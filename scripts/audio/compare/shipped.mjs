// scripts/audio/compare/shipped.mjs
// LINK 5: COMPARE the ROM-derived truth (links 1-4) against what the game
// actually ships.
//
// THIS FILE IS PART OF THE DRIVER (scripts/extract-audio.mjs), NOT AN ADAPTER
// OR A RENDERER. scripts/audio/{games,parse,render}/** may never import a
// hand-written table — that rule exists so unverified data can't masquerade as
// ROM truth inside the chain that PRODUCES a verdict. This file's entire job is
// the opposite: it reads each game's shipped hand-table/engine in order to
// JUDGE it against the ROM and report exactly where it diverges. Reading a
// table to compare-and-condemn it is not "falling back" to it. Accordingly,
// tests/extract-audio.test.mjs's NO FALLBACK walk explicitly excludes this
// directory — see the comment on that test.
//
// Every function here returns one of:
//   { status: 'match' }                       -- ROM-VERIFIED
//   { status: 'match', reason }                -- ROM-VERIFIED, with a caveat worth surfacing
//   { status: 'mismatch', reason }              -- MISMATCH — reason names what differs
//   { status: 'unverified', reason }            -- cannot be machine-compared — reason says why
import { readFileSync } from 'node:fs';
import { synthesize } from '../render/tms5220.mjs';

const match = (reason) => (reason ? { status: 'match', reason } : { status: 'match' });
const mismatch = (reason) => ({ status: 'mismatch', reason });
const unverified = (reason) => ({ status: 'unverified', reason });

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

// events: flat [reg, val, time, reg, val, time, ...] — our adapters' shape,
// and also the shape the shipped Tempest bake tool returns as `pokey1`.
// Returns [reg, val] pairs IN TIME ORDER, dropping the AUDCTL sentinel (reg 8).
// Sorting is required: our own adapters emit "all of AUDF, then all of AUDC"
// unsorted, while the shipped bake tool merge-sorts by time before returning —
// comparing unsorted-vs-sorted would report false mismatches on ordering alone.
//
// `reg` is an explicit SECONDARY sort key, not just a time sort. Without it,
// two events tied at the same timestamp (a real AUDF+AUDC write landing on
// the same tick) fall back on Array.sort's stability, which just preserves
// whatever order they arrived in — reg0-then-reg1 for our own adapters
// (which always emit all of AUDF then all of AUDC), but whatever order the
// shipped bake tool's own merge happened to produce for its side. The two
// sides agreeing on tie order is then incidental, not guaranteed — exported
// so this canonical ordering is independently testable.
export function sortedRegValuePairs(events) {
  const triples = [];
  for (let i = 0; i < events.length; i += 3) {
    const reg = events[i];
    if (reg === 8) continue; // AUDCTL write, not a voice register
    triples.push([reg, events[i + 1], events[i + 2]]);
  }
  triples.sort((a, b) => a[2] - b[2] || a[0] - b[0]);
  return triples.map(([reg, val]) => [reg, val]);
}

function pairsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

function firstDiffIndex(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i];
    const y = b[i];
    if (!x || !y || x[0] !== y[0] || x[1] !== y[1]) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Tempest — compare (reg, value) event streams, in time order, against the
// shipped tools/pokey-bake/ engine (expandAlsoun / expandStream over
// sfx-data.mjs). Both sides are REAL code paths: ours from parse+ROM-verify+
// render (envelope.mjs), theirs from the actual bake tool that produces what
// ships. This is a genuine machine comparison, not a proxy for one.
// ---------------------------------------------------------------------------
export async function compareTempestSfx(name, romEvents) {
  let sfxData;
  let bake;
  try {
    sfxData = await import(new URL('../../../tempest/tools/pokey-bake/sfx-data.mjs', import.meta.url));
    bake = await import(new URL('../../../tempest/tools/pokey-bake/bake-sfx.mjs', import.meta.url));
  } catch (err) {
    return unverified(`could not load tempest/tools/pokey-bake/ (shipped artifact): ${err.message}`);
  }
  const { SFX, DEFERRED } = sfxData;
  const { expandAlsoun, expandStream } = bake;

  const shipped = SFX.find((s) => s.name === name);
  if (!shipped) {
    const deferred = DEFERRED.find((d) => d.name === name);
    if (deferred) {
      return unverified(
        `tempest/tools/pokey-bake/sfx-data.mjs lists '${name}' in DEFERRED, not baked/shipped: ${deferred.reason}`,
      );
    }
    return unverified(
      `no shipped entry named '${name}' in tempest/tools/pokey-bake/sfx-data.mjs (SFX or DEFERRED) — nothing to compare against`,
    );
  }

  let shippedEvents;
  if (shipped.alsoun) shippedEvents = expandAlsoun(shipped.alsoun).pokey1;
  else if (shipped.stream) shippedEvents = expandStream(shipped.stream).pokey1;
  else return unverified(`shipped entry '${name}' has neither 'alsoun' nor 'stream' data to expand`);

  const romPairs = sortedRegValuePairs(romEvents);
  const shipPairs = sortedRegValuePairs(shippedEvents);
  if (pairsEqual(romPairs, shipPairs)) return match();

  const at = firstDiffIndex(romPairs, shipPairs);
  return mismatch(
    `register-event stream differs from tempest/tools/pokey-bake/'s expansion at event ${at}: ` +
      `ROM=${JSON.stringify(romPairs[at] ?? null)} shipped=${JSON.stringify(shipPairs[at] ?? null)} ` +
      `(ROM emits ${romPairs.length} events, shipped emits ${shipPairs.length})`,
  );
}

// ---------------------------------------------------------------------------
// Red Baron — structural sweep/hold comparison against src/shell/pokey.ts's
// POKEY_SOUNDS table. red-baron.mjs's sfx() already computes, per sound,
// whether each touched register's ROM record has CHANGE == 0 (held) or
// CHANGE != 0 (sweeps) — see its `audfSweeps`/`audcSweeps` fields. Here we
// extract the SAME classification from the shipped TypeScript via a plain
// text/regex scan (no TS dependency, per task brief) and diff the two.
//
// This is intentionally a STRUCTURAL check (which register carries the ramp),
// not a byte-exact one — that is what the task asks for. It is coarser than
// full byte equality: a sound whose port happens to hold/sweep the same
// registers as the ROM, but with different literal values, passes here. TK is
// the only sound independently confirmed byte-exact (see red-baron.mjs's
// header comment); a structural PASS for another sound is not a claim that its
// numbers were checked, only that its shape (which register ramps) was not
// found inverted.
// ---------------------------------------------------------------------------

// Small brace/paren-aware top-level comma splitter — enough for the fixed
// shape of `table(CHANNEL, ARG1, ARG2)` call sites; no TS parser needed.
function splitTopLevelArgs(s) {
  const parts = [];
  let depth = 0;
  let cur = '';
  for (const c of s) {
    if (c === '(' || c === '{') depth++;
    else if (c === ')' || c === '}') depth--;
    if (c === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  parts.push(cur);
  return parts.map((p) => p.trim());
}

// Regex/text-scan extraction of red-baron's POKEY_SOUNDS table. Returns
// tone -> { audfSweeps, audcSweeps }. A slot is "sweeps" unless its argument
// is a bare `held(...)` call (pokey.ts's own name for a flat register).
export function parseRedBaronPokeySounds(tsSource) {
  const out = {};
  const callRe = /\b([A-Z]{2}):\s*table\(/g;
  let m;
  while ((m = callRe.exec(tsSource))) {
    const name = m[1];
    let i = callRe.lastIndex;
    let depth = 1;
    const start = i;
    while (depth > 0 && i < tsSource.length) {
      if (tsSource[i] === '(') depth++;
      else if (tsSource[i] === ')') depth--;
      i++;
    }
    const args = splitTopLevelArgs(tsSource.slice(start, i - 1));
    if (args.length < 3) continue;
    out[name] = {
      audfSweeps: !/^held\(/.test(args[1]),
      audcSweeps: !/^held\(/.test(args[2]),
    };
  }
  return out;
}

// tone: e.g. 'TK', derived by the caller from the ROM label prefix ('TK1' -> 'TK').
// romSweeps: { audfSweeps, audcSweeps } as computed by red-baron.mjs from the
// ROM's own CHANGE bytes.
export function compareRedBaronShipped(tone, romSweeps, pokeyTsPath) {
  let src;
  try {
    src = readFileSync(pokeyTsPath, 'utf8');
  } catch (err) {
    return unverified(`could not read ${pokeyTsPath}: ${err.message}`);
  }
  const shipped = parseRedBaronPokeySounds(src)[tone];
  if (!shipped) {
    return unverified(
      `could not extract POKEY_SOUNDS.${tone} from ${pokeyTsPath} (regex scan found no 'table(' definition for it) — cannot machine-compare`,
    );
  }
  const diffs = [];
  if (romSweeps.audfSweeps !== shipped.audfSweeps) {
    diffs.push(`AUDF: ROM ${romSweeps.audfSweeps ? 'sweeps' : 'holds flat'}, shipped port ${shipped.audfSweeps ? 'sweeps' : 'holds flat'}`);
  }
  if (romSweeps.audcSweeps !== shipped.audcSweeps) {
    diffs.push(`AUDC: ROM ${romSweeps.audcSweeps ? 'sweeps' : 'holds flat'}, shipped port ${shipped.audcSweeps ? 'sweeps' : 'holds flat'}`);
  }
  if (diffs.length) {
    return mismatch(`red-baron/src/shell/pokey.ts POKEY_SOUNDS.${tone} disagrees with the ROM envelope — ${diffs.join('; ')}`);
  }
  return match();
}

// ---------------------------------------------------------------------------
// Battlezone — battlezone/src/shell/audio.ts is BELIEVED to contain NO ROM
// register data at all (it synthesizes every cue at runtime). That belief
// must be a MEASUREMENT, not a standing assertion this comparator returns
// unconditionally regardless of what the file actually says — otherwise
// fixing the port properly could never turn this green; the tool would keep
// saying "invented" forever on principle alone, which is exactly the kind of
// unverified claim this whole audit exists to catch.
//
// So: actually scan the file, the way compareRedBaronShipped scans
// pokey.ts's POKEY_SOUNDS table — for any of the shapes ROM-derived POKEY
// envelope data would show up in: register mnemonics (AUDF/AUDC/AUDCTL), a
// register `table(...)` call (this codebase's own convention, see
// parseRedBaronPokeySounds above), or raw hex byte-record literals (the
// STVAL,FRCNT,CHANGE,NUMBER shape ALSOUN/RBSOUN/BZSOUN records transcribe
// to). Finding NONE of these is itself the finding — today's honest result —
// but it is now something this function actually looked for.
// ---------------------------------------------------------------------------
const ROM_ENVELOPE_SHAPES = [
  { label: 'POKEY register mnemonics (AUDF/AUDC/AUDCTL)', re: /\bAUD[FC]\d?\b|\bAUDCTL\b/ },
  { label: "a register table() call (this codebase's ROM-table convention)", re: /\btable\s*\(/ },
  { label: 'hex byte envelope-record literals (0xNN groups)', re: /(?:0x[0-9a-fA-F]{2}\s*,\s*){3}0x[0-9a-fA-F]{2}/ },
];

// Exported so the scan itself is independently testable — proving this is a
// real measurement and not a disguised constant.
export function findRomEnvelopeShapes(tsSource) {
  return ROM_ENVELOPE_SHAPES.filter((shape) => shape.re.test(tsSource)).map((shape) => shape.label);
}

// Display-only: a repo-relative-looking label for messages, so a checked-in
// doc pasted from CLI output doesn't bake in one machine's absolute checkout
// path (matches the convention every other comparator's mismatch text
// already follows, e.g. compareRedBaronShipped's "red-baron/src/shell/pokey.ts").
// Falls back to the raw path for anything outside that known layout (e.g. a
// test fixture in a tmp dir).
function displayPath(p) {
  const idx = p.indexOf('battlezone/src/shell/');
  return idx >= 0 ? p.slice(idx) : p;
}

export function compareBattlezoneShipped(audioTsPath) {
  let src;
  try {
    src = readFileSync(audioTsPath, 'utf8');
  } catch (err) {
    return unverified(`could not read ${audioTsPath}: ${err.message}`);
  }
  const found = findRomEnvelopeShapes(src);
  const label = displayPath(audioTsPath);
  if (found.length) {
    // The file DOES carry something ROM-table-shaped — this blanket "it's
    // all invented" check can no longer speak for it. That needs a real
    // per-sound comparator (like Red Baron's), not this presence scan.
    return unverified(
      `${label} contains ROM-shaped register data (${found.join('; ')}) — this structural presence scan can no longer classify it as wholly invented; a real per-sound comparator is needed`,
    );
  }
  return mismatch(
    `shipped audio is invented; ${label} was scanned for ROM-derived POKEY envelope data ` +
      `(register mnemonics, a table() call, or hex byte-record literals) and contains NONE, but BZSOUN.MAC has real envelope tables.`,
  );
}

// ---------------------------------------------------------------------------
// Star Wars speech — compare ROM-sliced LPC bytes against the shipped
// star-wars/tools/speech-bake/speech-data.mjs entry, matched by phrase NUMBER
// (both sides are independently 1..23 ordered — matching by transcribed
// slug/name is NOT reliable, since a few phrases' wording differs slightly
// between our PHRASES table and the shipped `phrase` text, e.g. "with" vs
// "in" — the byte data is what matters here, not the caption).
// ---------------------------------------------------------------------------
export async function compareStarWarsSpeech(order, romLpc) {
  let mod;
  try {
    mod = await import(new URL('../../../star-wars/tools/speech-bake/speech-data.mjs', import.meta.url));
  } catch (err) {
    return unverified(`could not load star-wars/tools/speech-bake/speech-data.mjs (shipped artifact): ${err.message}`);
  }
  const SPEECH = mod.default;
  const shipped = SPEECH.find((p) => p.n === order);
  if (!shipped) {
    return unverified(`no shipped entry with n=${order} in star-wars/tools/speech-bake/speech-data.mjs — nothing to compare against`);
  }
  const shipLpc = shipped.lpc;

  let prefixLen = 0;
  while (prefixLen < romLpc.length && prefixLen < shipLpc.length && romLpc[prefixLen] === shipLpc[prefixLen]) prefixLen++;
  const shorterLen = Math.min(romLpc.length, shipLpc.length);

  if (prefixLen < shorterLen) {
    // A real content divergence inside the shared prefix — not just a length
    // difference at the tail.
    return mismatch(
      `LPC bytes diverge at byte ${prefixLen} (ROM=0x${romLpc[prefixLen].toString(16)}, shipped=0x${shipLpc[prefixLen].toString(16)}) — not merely a trailing-length difference`,
    );
  }
  if (romLpc.length === shipLpc.length) return match(); // byte-for-byte identical
  // Content-identical through the shorter blob's full length; the two differ
  // only in bytes trailing that shared prefix. The TMS5220 frame format halts
  // decoding at a STOP energy frame — bytes past it are never read by the
  // decoder — so a pure trailing-length difference does not by itself imply
  // an audible difference, PROVIDED the shorter blob actually reaches a STOP
  // frame on its own. If it doesn't, it isn't harmlessly tail-padded — it is
  // TRUNCATED, and the decoder runs off the end of the buffer (reading zero
  // bits past it) and can render a spurious extra frame with corrupted state.
  // We must actually decode the shorter blob and check, not just infer from
  // the length delta's sign — a shorter ROM slice and a shorter shipped blob
  // both take this branch, but only decoding tells them apart.
  const shorter = romLpc.length <= shipLpc.length ? romLpc : shipLpc;
  const shorterSide = romLpc.length <= shipLpc.length ? 'ROM' : 'shipped';
  if (!synthesize(shorter).stopped) {
    return mismatch(
      `the shorter blob (${shorterSide}, ${shorter.length} bytes) never reaches a STOP frame — it is truncated, not merely tail-padded`,
    );
  }
  return match(
    `content-identical prefix (${prefixLen} bytes); ROM slice is ${romLpc.length} bytes, shipped blob is ${shipLpc.length} bytes — ` +
      `differ only in trailing bytes past the decoder's STOP frame`,
  );
}

// ---------------------------------------------------------------------------
// Star Wars music — ships as pre-rendered .wav files on a CDN (R2); there is
// no in-repo baked artifact (bytecode-VM output, register stream, anything)
// to machine-compare our ROM-derived tune against. Always UNVERIFIED — never
// ROM-VERIFIED, because "we could not check" must never read as "it's fine".
// ---------------------------------------------------------------------------
export function compareStarWarsMusic() {
  return unverified('shipped as pre-rendered .wav; no in-repo artifact to compare');
}
