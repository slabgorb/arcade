// scripts/audio/games/star-wars-speech.mjs
// Star Wars TMS5220 LPC speech.
//
// WHICH VOCABULARY IS REAL: there are TWO SPKVTB tables, and they are different ROM
// REVISIONS, not one table split across two files.
//   SWVOC2.MAC (.CSECT VOCAB)       — 12 phrases, literal VOCAB+hhhh offsets. SUPERSEDED.
//   SWVOC3.MAC (.CSECT VOCABULARY)  — 23 phrases, symbolic P#S/P#E labels. SHIPPED.
// SNDAUX.MAP settles it: `VOCABU 4002 18E3 REL,OVR SWVOC3` — the linker put SWVOC3
// in the sound-board image at $4002. SWVOC2 is not linked at all.
//
// THE ORACLE IS THE ROM IMAGE, NOT THE SOURCE. SWVOC3.MAC defines P9S/P13S/P18S/P21S
// TWICE; an assembler resolves each to its FINAL definition, leaving orphaned dead LPC
// blocks in between. Naive source concatenation therefore overshoots the linked length.
// We slice the reconstructed SNDAUX.LDA image at VOCABU instead.
//
// A SECOND wrinkle, specific to this table: SPKVTB itself (the [start,stop] address
// lookup table SWVOC3.MAC builds via `.WORD P#S,P#E`) is unrecoverable from source
// through our MACRO-11 parser (scripts/audio/parse/mac.mjs) — its .WORD handling was
// built for SWVOC2's literal `VOCAB+hhhh` tokens and can't resolve bare symbolic labels
// (P1S, P9E, ...), and even if it could, PDP-11 .WORD is little-endian while this table
// is baked BIG-ENDIAN (see below) — so naive resolution both drops the table's own 96
// bytes from the byte-count AND gets the endianness wrong. Rather than teach the shared
// parser a one-off resolution pass for a superseded-format quirk, we read SPKVTB the
// same way we read the phrase data: out of the linked image, which already carries the
// assembler's fully-resolved answer.
//
// SNDAUX.MAP's own Global Symbol Summary proves the table's exact span:
//   `SPKVTB 4002 SWVOC3# SNDSPK`   -- table starts at VOCABU's base, as expected
//   `SPKVTZ 4062 SWVOC3# SNDSPK`   -- table ends at $4062 => 96 bytes = 24 entries x 2 words
// Reading those 96 bytes as 24 big-endian absolute u16 addresses (P0S,P0E,P1S,P1E,...,
// P23S,P23E) and subtracting VOCAB_BASE reproduces a perfectly contiguous, monotonic
// span of phrase offsets that fills the vocab image exactly: P1 starts right where the
// table ends (0x60), and P23 ends at 0x18e2 -- one byte short of VOCAB_SIZE. That
// internal consistency (not a guess) is what confirms the big-endian, image-sourced
// reading is correct.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parseLda, readImage } from '../parse/rom.mjs';

const P = join(homedir(), 'Projects');
const PRISTINE = join(P, 'star-wars-1983-source');

const VOCAB_BASE = 0x4002;   // SNDAUX.MAP: VOCABU / SPKVTB
const VOCAB_SIZE = 0x18e3;
const TABLE_ENTRIES = 24;    // P0..P23 (P0 aliases P1); SNDAUX.MAP: SPKVTZ - SPKVTB = 0x60 = 24 * 2 words

// Phrase names, in SWVOC3's SPKVTB order (its comments are the source of truth).
const PHRASES = [
  'USE THE FORCE, LUKE', 'REMEMBER', "I'M ON THE LEADER",
  'THE FORCE IS STRONG WITH THIS ONE', 'RED FIVE STANDING BY',
  "THIS IS RED FIVE, I'M GOING IN", 'R2, TRY AND INCREASE THE POWER',
  "YOU'RE ALL CLEAR, KID", 'LET GO, LUKE', '(BREATHING)', 'YAH-HOO',
  'I HAVE YOU NOW', 'LOOK AT THE SIZE OF THAT THING',
  'STAY IN ATTACK FORMATION', 'THE FORCE WILL BE WITH YOU', 'ALWAYS',
  'R2 NO', 'ELEPHANT SOUND FOR PASSBY',
  "I'M HIT BUT NOT BAD, R2 SEE WHAT YOU CAN DO WITH IT", "I'VE LOST R2",
  'GREAT SHOT KID, THAT WAS 2 IN A MILLION', "I CAN'T SHAKE HIM",
  'LUKE, TRUST ME',
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

export default {
  name: 'star-wars',
  dirbase: 'star-wars-1983',
  sourceFile: 'SWVOC3.MAC',
  mapFile: 'SNDAUX.MAP',
  romFile: 'SNDAUX.LDA',

  speech() {
    const { image } = parseLda(readFileSync(join(PRISTINE, this.romFile)));
    const vocab = readImage(image, VOCAB_BASE, VOCAB_SIZE);

    // SPKVTB: 24 entries x (start,stop) as big-endian absolute u16 addresses,
    // baked into the first TABLE_ENTRIES*4 bytes of the linked VOCABULARY csect.
    const table = [];
    for (let i = 0; i < TABLE_ENTRIES * 2; i++) {
      const off = i * 2;
      table.push(((vocab[off] << 8) | vocab[off + 1]) - VOCAB_BASE);
    }

    const out = [];
    // Entry 0 aliases entry 1 ("PLEASE START AT ZERO") — skip it; take 23 real ones.
    for (let i = 1; i <= PHRASES.length; i++) {
      const start = table[i * 2];
      const stop = table[i * 2 + 1];
      if (start === undefined || stop === undefined || stop < start) continue;
      const phrase = PHRASES[i - 1];
      out.push({
        name: slug(phrase),
        phrase,
        lpc: Array.from(vocab.slice(start, stop + 1)), // inclusive stop
        romAddr: VOCAB_BASE + start,
        provenance: `SNDAUX.LDA VOCABU[$4002] SPKVTB[${i}] @ $${(VOCAB_BASE + start).toString(16)}..$${(VOCAB_BASE + stop).toString(16)}`,
      });
    }
    return out;
  },
};
