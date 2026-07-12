// Asteroids (1979) has NO SOUND ROM. Its audio is a discrete analog board — 555
// timers and op-amps. There is nothing to extract, and there never will be.
//
// This adapter exists so the report SAYS SO. A silent omission reads as "not looked
// at yet"; `NO ROM AUDIO` is a finding, and it is terminal. The community field
// recordings the game ships are the permanent ceiling, not a gap awaiting work.
//
// (Aside: asteroids-source/A35131.1A-1E look like chip dumps but are MACRO-65
// assembler SOURCE — .TITLE ASTROD, .TITLE ASTNMI. No Asteroids ROM binary exists
// in the vendored tree at all.)
const REASON = 'Asteroids (1979) has no sound ROM — audio is a discrete analog board (555 timers + op-amps). Nothing to extract; community rips are the permanent ceiling.';

export default {
  name: 'asteroids',
  dirbase: 'asteroids',
  terminal: true,
  noRomAudio: [
    { name: 'fire', reason: REASON },
    { name: 'thrust', reason: REASON },
    { name: 'bang_large', reason: REASON },
    { name: 'bang_medium', reason: REASON },
    { name: 'bang_small', reason: REASON },
    { name: 'saucer_large', reason: REASON },
    { name: 'saucer_small', reason: REASON },
    { name: 'thump_lo', reason: REASON },
    { name: 'thump_hi', reason: REASON },
    { name: 'extra_life', reason: REASON },
  ],
  sfx() { return []; },
};
