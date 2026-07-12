// scripts/audio/games/star-wars-music.mjs
// Star Wars music. SNDAUX.MAP: `TUNTAB 58E5`. TUNTAB is 50 real tune-voice entries
// (plus a leading SWNUL sentinel), grouped as 4 voices per tune (the SF2 effect gets
// 6 and is not a "tune" -- excluded here, same as the brief's TUNES table).
//
// TUNE NAMES COME FROM SNDPM.MAC's PM*:: LAUNCHERS, NOT from SWMUS.MAC's .TITLE
// comments -- those are copy-pasted boilerplate ("STAR WARS THEME" sits above tunes
// that are not it; confirmed by reading SNDPM.MAC directly, e.g. PMTH5::/PMDAR::).
//
// *** WHY THIS DOESN'T PARSE SWMUS.MAC's `.WORD` LITERALS (unlike a first read of the
// task brief might suggest): TUNTAB:: is declared as
//   .WORD SWNUL,SF2V1,SF2V2,...,TSTV4
// -- SYMBOLIC LABELS, not numeric literals. scripts/audio/parse/mac.mjs's `.WORD`
// handling (see `value()`) only resolves hex literals / `SYMBOL+hhhh` tokens; it
// can't resolve a bare label, so `words.get('TUNTAB')` comes back empty. This is the
// exact shape of problem Task 10 hit for SWVOC3's SPKVTB (see star-wars-speech.mjs)
// -- and the fix is the same: read the table out of the LINKED IMAGE, where the
// assembler has already resolved every label to its final address.
//
// *** ENDIANNESS: the sound board is a 6809, and 6809 `.WORD` tables are baked
// BIG-ENDIAN in the linked image (established in star-wars-speech.mjs for SPKVTB;
// reconfirmed here empirically -- see below). TUNTAB's own global-symbol value
// (0x58e5, from SNDAUX.MAP) is NOT itself in the map's Global Symbol Summary for the
// individual voice labels (SF2V1, BENV1, ... are local `:` labels, not global `::`),
// so we can't cross-check via parseMap either; the image is the only oracle.
//
// Empirical proof of big-endian, straight from SNDAUX.LDA: reading 51 big-endian u16
// words at $58E5 gives [0x594b, 0x594b, 0x5953, ...] -- entry 0 (SWNUL) and entry 1
// (SF2V1) resolve to the IDENTICAL address, which is exactly right: SWNUL: is an
// empty label (all-comment body) immediately followed by SF2V1:, so they must share
// an address. Reading the same words little-endian gives nonsense addresses outside
// the code's actual $59xx-$68xx footprint.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseMap } from '../parse/map.mjs';
import { parseLda } from '../parse/rom.mjs';
import { runVoice } from '../render/musicvm.mjs';

const TEXT = join(homedir(), 'Projects', 'star-wars-1983-source-text');
const PRISTINE = join(homedir(), 'Projects', 'star-wars-1983-source');

const TUNTAB_ADDR = 0x58e5;   // SNDAUX.MAP: TUNTAB
const TUNTAB_ENTRIES = 50;    // real tune-voice entries (SF2V1..TSTV4); +1 for the
                               // leading SWNUL sentinel at index 0, so we read 51 words.

// TUNTAB entry (1-based) -> tune. Names from SNDPM.MAC's PM*:: routines
// (PMSF2/PMBEN/PMCNT/PMEND/PMREB/PMRRP/PMTH5/PM4TH/PMTHB/PMDES/PMDAR/PMTST).
const TUNES = [
  { first: 7, name: 'bens_theme' },
  { first: 11, name: 'cantina' },
  { first: 15, name: 'death_star_explodes' },
  { first: 19, name: 'rebel_theme' },
  { first: 23, name: 'rebel_theme_repeats' },
  { first: 27, name: 'main_theme' },
  { first: 31, name: 'battle_in_fourths' },
  { first: 35, name: 'theme_b' },
  { first: 39, name: 'descent' },
  { first: 43, name: 'vader_theme' },
  { first: 47, name: 'test_tones' },
];

// Resolve TUNTAB straight from the reconstructed sound-board image: 51 consecutive
// BIG-ENDIAN absolute u16 addresses starting at TUNTAB_ADDR (index 0 = SWNUL
// sentinel, 1..50 = the real entries, matching TUNTAB's own 1-based numbering so
// `tuntab[N]` lines up with musicvm's `.CALL N` lookups without any reindexing).
function resolveTuntab() {
  const { image } = parseLda(readFileSync(join(PRISTINE, 'SNDAUX.LDA')));
  const tuntab = [];
  for (let i = 0; i <= TUNTAB_ENTRIES; i++) {
    const off = TUNTAB_ADDR + i * 2;
    tuntab.push((image[off] << 8) | image[off + 1]);
  }
  return { image, tuntab };
}

export default {
  name: 'star-wars',
  dirbase: 'star-wars-1983',
  sourceFile: 'SWMUS.MAC',
  mapFile: 'SNDAUX.MAP',
  tuntabAddr: TUNTAB_ADDR,

  music() {
    // Sanity-check the map still says what we hardcoded, the way star-wars-speech.mjs
    // treats SNDAUX.MAP's numbers as ground truth rather than baking them in blind.
    const { symbols } = parseMap(readFileSync(join(TEXT, 'SNDAUX.MAP'), 'utf8'));
    if (symbols.get('TUNTAB') !== TUNTAB_ADDR) {
      throw new Error(`SNDAUX.MAP TUNTAB moved: expected 0x${TUNTAB_ADDR.toString(16)}, got 0x${symbols.get('TUNTAB')?.toString(16)}`);
    }

    const { image, tuntab } = resolveTuntab();

    return TUNES.map((t) => {
      const voices = [];
      for (let v = 0; v < 4; v++) {
        const entry = t.first + v; // 1-based TUNTAB index
        const addr = tuntab[entry];
        voices.push(runVoice(image, addr, tuntab, { voice: v + 1, maxSeconds: 60 }));
      }
      // TUNTAB[0] is the SWNUL sentinel, so entry N's own pointer slot sits N*2
      // bytes past TUNTAB_ADDR (not (N-1)*2 -- there's no "entry 0" tune to offset by).
      const romAddr = TUNTAB_ADDR + t.first * 2;
      return {
        name: t.name,
        voices,
        romAddr,
        provenance: `SNDAUX.LDA TUNTAB[${t.first}..${t.first + 3}] @ $${romAddr.toString(16)}`,
      };
    });
  },
};

// The dual-encoding cross-check: SWMUS.SND (the composer's symbolic score) vs
// SWMUS.MAC (the assembled bytes, with each mnemonic preserved as a `;`-comment
// beside its .BYTE pair). Independent encodings of the SAME music -- agreement
// verifies the byte encoding against authorial intent.
//
// SWMUS.SND has NO newlines at all (one ~30,695-byte line), so two problems that
// don't exist in SWMUS.MAC show up:
//   1. An operand-less mnemonic can butt directly against the NEXT token with zero
//      separator once the newline that used to separate them is gone (".ENDT" +
//      "SF2V2:" -> "ENDTSF2V2", or ".AENV" + "4" + "13$:" -> "AENV 413$:" when
//      SOME whitespace survives but a local branch label is still glued onto a real
//      numeral). We resolve these using the file's OWN closed vocabularies -- the
//      GOSUB subroutine names (CSUB1..CSUB8, TSUB, TSUB2) and the numeric local
//      label set ("N$") -- both derived from SWMUS.MAC, where real newlines make
//      them unambiguous, then applied to split SWMUS.SND's glued tokens correctly.
//   2. The `.MACRO .GOSUB`/`.MACRO .RETURN` *definitions* near the top of the file
//      contain the literal tokens ".GOSUB"/".RETURN" as macro headers, not
//      invocations -- stripped out before matching.
const MNEMONICS = ['GOSUB', 'RETURN', 'NRATE', 'CRATE', 'NVOL', 'CVOL', 'NKEY', 'CKEY',
  'FENV', 'AENV', 'SYN', 'VC', 'CALL', 'LOOP', 'ENDL', 'ENDT', 'NOTE'];
const OP_RE = new RegExp(`\\.(${MNEMONICS.join('|')})`, 'g');
const NO_OPERAND = new Set(['ENDT', 'ENDL', 'RETURN']); // confirmed by full-file scan: never carry an operand

function stripMacroDefs(text) {
  return text.replace(/\.MACRO\b[\s\S]*?\.ENDM\b/g, '');
}

// GOSUB targets, derived from SWMUS.MAC's real (unambiguous) `.GOSUB LABEL` calls.
function gosubTargets(macText) {
  const targets = new Set();
  for (const m of stripMacroDefs(macText).matchAll(/(?:^|\s)\.GOSUB\s+([A-Z0-9]+)/g)) targets.add(m[1]);
  return [...targets].sort((a, b) => b.length - a.length); // longest first
}

// Numeric local ("N$") label targets, derived from SWMUS.MAC (real newlines -> no
// gluing ambiguity there).
function localLabelNumbers(macText) {
  const nums = new Set();
  for (const m of macText.matchAll(/(\d+)\$/g)) nums.add(m[1]);
  return nums;
}

function extractOps(text, { gosubSet, labelNums }) {
  const stripped = stripMacroDefs(text);
  const ops = [];
  OP_RE.lastIndex = 0;
  let m;
  while ((m = OP_RE.exec(stripped))) {
    const mnemonic = m[1];
    let arg = '';
    if (!NO_OPERAND.has(mnemonic)) {
      const i = OP_RE.lastIndex;
      if (stripped[i] === ' ' || stripped[i] === '\t') {
        let j = i;
        while (stripped[j] === ' ' || stripped[j] === '\t') j++;
        const raw = (stripped.slice(j).match(/^[^\s;.]*/) || [''])[0];
        if (mnemonic === 'GOSUB') {
          arg = gosubSet.find((t) => raw.startsWith(t)) ?? raw;
        } else {
          arg = raw;
          const dm = raw.match(/^(.*?)(\d+)\$:?$/);
          if (dm) {
            const [, prefix, digits] = dm;
            for (let k = 0; k < digits.length; k++) {
              const suffix = digits.slice(k);
              if (labelNums.has(suffix)) { arg = prefix + digits.slice(0, k); break; }
            }
          }
        }
      }
    }
    ops.push(`.${mnemonic} ${arg}`.trim());
  }
  return ops;
}

export function crossCheck() {
  const mac = readFileSync(join(TEXT, 'SWMUS.MAC'), 'utf8');
  const snd = readFileSync(join(TEXT, 'SWMUS.SND'), 'utf8');

  const gosubSet = gosubTargets(mac);
  const labelNums = localLabelNumbers(mac);

  const macOps = extractOps(mac, { gosubSet, labelNums });
  const sndOps = extractOps(snd, { gosubSet, labelNums });

  const mismatches = [];
  const n = Math.max(macOps.length, sndOps.length);
  for (let i = 0; i < n; i++) {
    if (macOps[i] !== sndOps[i]) mismatches.push({ at: i, mac: macOps[i], snd: sndOps[i] });
  }
  return { agree: mismatches.length === 0, mismatches, macCount: macOps.length, sndCount: sndOps.length };
}
