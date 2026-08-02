# centipede — the POKEY sound dossier

**Story cp6-1.** What centipede's ROM actually sounds like, ruled cue by cue
against the vendored 1981 source before anything bakes a byte.

> **centipede is still silent, and it is still silent when this story closes.**
> This is a ruling, not a feature. No sample is baked here, nothing is uploaded,
> and `just deploy-assets` does not name this game. The story that ends the
> silence is cp6-2, and its acceptance test is a live 200 rather than a green
> vitest.

Every citation below is into the **vendored** tree,
`reference/atari-source/centipede/revision.v4/CENTI4.MAC`. The
`~/Projects/centipede-source` copy is off by one from line 44 and none of these
numbers were taken against it. Every line cited here is pinned by a claim in
[`claims/16-sound.json`](./claims/16-sound.json), which the citation gate
re-opens byte-for-byte, and the numbers in
[`sound.fixture.json`](./sound.fixture.json) are re-derived from the ROM by
`tests/audit/sound-dossier.test.ts` rather than trusted.

---

## 1. The engine, in one paragraph

`SOUNDS` is called **once per video frame** from `MAIN` (`CENTI4.MAC:24`), after
the loop has spun on `SYNC` waiting for VBLANK (`CENTI4.MAC:17`). That is the
fact every duration in this document rests on: one `SOUNDS` pass is one video
frame, so a countdown of N is N frames at `FRAME_HZ`, which lives as a named
constant at `src/shell/timebase.ts:20` and is deliberately not restated here.

The machine drives **seven countdown variables over four POKEY voices**, and it
says both — in two different files. Reading one of those statements as the other
is the single easiest mistake to make in this routine, and this document made it
once.

**The seven** are declared a byte apiece at `CENDE4.MAC:193-199`, and the count
is the machine's own: `NCHAN	=6			;NUMBER OF SOUNDS (SEE CHAN0 THRU CHAN 6)`
(`CENDE4.MAC:121`).

**The four** are the subject of the `SOUNDS` header comment (`CENTI4.MAC:2325`,
`CENTI4.MAC:2326`, `CENTI4.MAC:2327`, `CENTI4.MAC:2328`) — and that header is
about POKEY **voices**, not about those seven variables. One line proves it:
`CENDE4.MAC:194` declares `CHAN1:	.BLKB 1			;INDEX FOR CENTIPEDE SOUND` — the
centipede alone — while the header's CHAN 1 line reads BONUS, CENTIPEDE, ANT AND
SCORPION SOUNDS. Four cues cannot be one one-byte index. Read as the voice it is,
the header is exact and it is COMPLETE: POKEY has four voices, the header names
four, and its CHAN 1 line lists precisely the four cues §2.5 recovers from the
four `STA AUDF1` writes. **The machine documented the voice-1 contention in 1981.**
This dossier rediscovered it the long way round and, in one earlier spelling,
denied the comment said anything of the kind.

The remaining three variables are missing from that header for the same reason —
they are not voices. `CHAN4` is the bonus countdown (`CENTI4.MAC:2373`), `CHAN5`
the player explosion (`CENTI4.MAC:2436`), `CHAN6` the scorpion
(`CENTI4.MAC:2386`). The four voices are the four `AUDF` registers those seven
variables write: `AUDF0` (`CENTI4.MAC:2423`), `AUDF1` (`CENTI4.MAC:2433`),
`AUDF2` (`CENTI4.MAC:2357`) and `AUDF3` (`CENTI4.MAC:2349`). Each pass, `SOUNDS`
walks the channels that are non-zero, indexes a frequency table by the countdown,
writes `AUDF`/`AUDC`, and decrements.

**Attract is silent by ROM design, not by our omission.** `SOUNDS` opens by
testing `MODE` (`CENTI4.MAC:2329`), zeroes all four `AUDC` registers
(`CENTI4.MAC:2331`) and returns (`CENTI4.MAC:2336`). Our shell already does the
same thing.

---

## 2. The ruling: fourteen cues over eight trigger sites

The manifest at `src/shell/audio.ts` declares fourteen cues. The ROM raises a
sound in exactly **eight places in the entire program**, and one of those eight
has no cue name at all. This table is the deliverable; the machine-readable form
is `sound.fixture.json`.

| Cue | Source | ROM channel | Table | Gate | Length |
|-----|--------|-------------|-------|------|--------|
| `fire` | ROM | CHAN2 | FREQ2 | every pass | 11 frames |
| `mushroom` | **INVENTION** | — | — | — | — |
| `segmentKill` | ROM | CHAN0 | FREQ0/CONT0 | every pass | 19 frames |
| `spiderKill` | ROM | CHAN0 | FREQ0/CONT0 | every pass | 19 frames |
| `fleaKill` | ROM | CHAN0 | FREQ0/CONT0 | every pass | 19 frames |
| `scorpionKill` | ROM | CHAN0 | FREQ0/CONT0 | every pass | 19 frames |
| `headBottom` | **INVENTION** | — | — | — | — |
| `playerDeath` | ROM | CHAN5 | FREQ0/CONT0 + volume | every 4th | 19 passes |
| `waveClear` | **INVENTION** | — | — | — | — |
| `bonusLife` | ROM | CHAN4 | FREQ4 | every 8th | 17 passes |
| `march` | ROM | CHAN1 | FREQ1/CONT1 | every pass | 7 frames, re-armed |
| `spiderLoop` | ROM | CHAN3 | FREQ3/CONT3 | every 2nd | 20 passes, loops |
| `fleaLoop` | ROM (**computed**) | none | none | every pass | unbounded |
| `scorpionLoop` | ROM | CHAN6 | FREQ6 | every pass | 20 frames, loops |

### 2.1 Four kill cues are one ROM sound

`segmentKill`, `spiderKill`, `fleaKill` and `scorpionKill` all resolve to the
**same** trigger and the **same** table. Label `19$` (`CENTI4.MAC:2299`,
`CENTI4.MAC:2300`) is the single convergence point: the centipede segment path
arrives by `JMP 19$` (`CENTI4.MAC:2289`), and the spider, ant and scorpion paths
arrive by falling through `18$`. The scoring call immediately above it names all
three by hand — `;SCORES FOR SPIDER,ANT, OR SCORPION` (`CENTI4.MAC:2298`).

This collapse is the machine's behaviour and recording it is the point. It is
also already modelled shell-side: the `CHANNELS` map puts all four kills on one
voice-stealing bucket, so the later kill winning is the hardware's economy
rather than a compromise we introduced.

### 2.2 There is no FREQ5, and the player explosion is why

The table numbering runs FREQ0, FREQ1, FREQ2, FREQ3, FREQ4, **FREQ6**. The gap is
not an omission in the source. The player explosion re-reads `FREQ0`
(`CENTI4.MAC:2444`) and adds `hex 02` to the control byte to `;INCREASE VOLUME`
(`CENTI4.MAC:2449`) — it is the general explosion made louder, not a sound of its
own. A reader who assumed the numbering was contiguous would invent a table the
machine does not have.

Player death also zeroes the other five channels (`CENTI4.MAC:1813`,
`CENTI4.MAC:1818`) so the explosion plays alone.

### 2.3 Three cues are inventions, and the mushroom is the sharpest case

`mushroom` has **no ROM source**, and the ROM is unusually explicit about it. The
shot-hits-mushroom path scores the mushroom, rewrites the playfield stamp, and
jumps to `20$` (`CENTI4.MAC:2169`) — which is the line *after* the `19$`
explosion seed. `20$` (`CENTI4.MAC:2303`) repositions the shot and touches no
channel. The mushroom path deliberately steps over the sound that a creature kill
raises. `OBSTAC`, which our manifest names for this cue, is a pure
playfield-address lookup with no sound register write anywhere in it
(`CENTI4.MAC:1701`, `CENTI4.MAC:1739`).

`headBottom` has no source: a head reaching the bottom row sets `NEWD` to arm the
new-head factory (`CENTI4.MAC:1310`) and does nothing else.

`waveClear` has no source for the transition itself — clearing a wave sets
`DELAY` (`CENTI4.MAC:2319`) with no channel write. But see §4: the wave *cleanup*
is audible even though the wave *end* is not.

Per AC-5 none of these are deleted. Each carries a named decision for cp6-2 in
`sound.fixture.json` under `cp62Decision`.

### 2.4 The flea's voice is computed, not tabulated

`fleaLoop` is the one ROM-sourced cue with no table and no countdown variable.
While the ant (flea) is on screen, `SOUNDS` derives `AUDF1` from `ANTV` — the
flea's vertical position — on every pass (`CENTI4.MAC:2409`), forcing the result
to `hex 80` or above to `;USE LOWER FREQUENCIES` (`CENTI4.MAC:2413`) before
writing it (`CENTI4.MAC:2414`). **The pitch falls as the flea descends.** It has
no length; it lasts exactly as long as the flea is on screen.

A picture at or above `hex 20` takes the scorpion branch instead
(`CENTI4.MAC:2408`) — flea and scorpion share creature slot 12, which is also why
arming the flea silences the scorpion (`CENTI4.MAC:155`).

### 2.5 POKEY voice 1 is contended four ways, and the march loses

This is the least obvious ruling in the document and the one most likely to be
missed by a reader who goes table by table.

The ROM writes `AUDF1` in exactly **four** places in the whole of `SOUNDS`, one
per cue: the bonus life (`CENTI4.MAC:2382`), the scorpion loop
(`CENTI4.MAC:2392`), the computed flea voice (`CENTI4.MAC:2414`) and the march
(`CENTI4.MAC:2433`). All four converge on a single `AUDC1` write
(`CENTI4.MAC:2435`). So `bonusLife`, `scorpionLoop`, `fleaLoop` and `march` are
one voice, not four, and at most one of them sounds at a time. (The first of
those write sites is shared: label `44$` is also where the declined 15-second
alarm lands — `CENTI4.MAC:2369`, `CENTI4.MAC:2371` — so `CENTI4.MAC:2382` serves
a fifth claimant this ruling puts out of scope. See §4.)

**The priority is decided before the arbitration is reached, and the bonus wins
by NOT branching.** `CENTI4.MAC:2373` reads the bonus countdown `CHAN4` and
`CENTI4.MAC:2374` is `BEQ 48$`: when `CHAN4` is **zero** control goes TO `48$`
and the ant/scorpion/march arbitration runs. When a bonus tone is live, `CHAN4`
is non-zero, the branch is not taken, and the bonus block runs instead — on the
eighth frame it takes the `AUDF1` write itself, and on the other seven it leaves
for the player-explosion tail at `CENTI4.MAC:2377`. Either way `48$` is skipped.
**A bonus life silences the other three outright**, with one frame's exception:
on the tick the countdown expires, `CENTI4.MAC:2379-2380` (`DEY / BEQ 48$`) drops
into the arbitration as the tone ends.

With no bonus sounding, arbitration begins at `CENTI4.MAC:2396`, and the march
block (`CENTI4.MAC:2428`) is entered on only three conditions:

- the ant or scorpion is **off screen** (`CENTI4.MAC:2399`), or
- the player is exploding or dead (`CENTI4.MAC:2402`), or
- the ant or scorpion is **exploding** (`CENTI4.MAC:2406`).

So on the real cabinet, **a live flea or scorpion silences the marching tick**
too. The full order is bonus, then scorpion, then flea, then march — and the
scorpion and the flea share creature slot 12, so they can never both be live.

Our `CHANNELS` map gives all four contenders a channel of their own —
`bonusLife`, `march`, `fleaLoop` and `scorpionLoop` — so all four can ring
together where the cabinet allows exactly one. That is a cp5-1 decision made
before this ruling existed, and a deliberate departure. The consequence is that
the clone will sound **fuller** than the cabinet whenever a flea, scorpion or
bonus is live. AC-5 forbids this story from changing the map, so the divergence
is recorded rather than fixed: it is now a decision, not a surprise.

The spider is not one of the contenders and its own channel is faithful: it
writes `AUDF3` (`CENTI4.MAC:2349`), owns POKEY voice 3 outright, and rings
alongside voice 1 on the cabinet exactly as it does here.

---

## 3. Lengths, gates and loops — derived, never chosen by ear

**The formula.** `lengthSeconds = lengthFrames × frameGate ÷ FRAME_HZ`, where
`lengthFrames` is the ROM's own countdown seed and `frameGate` is the number of
video frames per `SOUNDS` pass for that cue.

**The radix is load-bearing, and the tables prove the reading.** `.RADIX 16` is
inherited from `CENDE4`, so a bare literal is hex and only a trailing period is
decimal. Every seed in this engine equals the length of the table it drives — and
because two of the seven are spelled decimal and five hex, that agreement is only
reachable with the radix read correctly:

| Channel | Seed | Spelled | Value | Table bytes |
|---------|------|---------|-------|-------------|
| CHAN0 | `CENTI4.MAC:2299` | `LDA I,13` hex | 19 | FREQ0 = 19 |
| CHAN1 | `CENTI4.MAC:1288` | `LDA I,07` hex | 7 | FREQ1 = 7 |
| CHAN2 | `CENTI4.MAC:2133` | `LDA I,0B` hex | 11 | FREQ2 = 11 |
| CHAN3 | `CENTI4.MAC:430` | `LDA I,14` hex | 20 | FREQ3 = 20 |
| CHAN4 | `CENTI4.MAC:1994` | `LDA I,17.` **decimal** | 17 | FREQ4 = 17 |
| CHAN5 | `CENTI4.MAC:1811` | `LDA I,13` hex | 19 | FREQ0 = 19 |
| CHAN6 | `CENTI4.MAC:2024` | `LDA I,20.` **decimal** | 20 | FREQ6 = 20 |

Read `LDA I,17.` as hex and the bonus seed becomes 23 against a 17-byte table —
six entries of whatever follows `FREQ4` in memory. Read `LDA I,20.` as hex and
the scorpion runs 32 against 20. Neither mistake is visible by ear; both are
caught mechanically by the fixture test.

**The coincidence to watch.** `CENTI4.MAC:2346` is `LDA I,14`, hex, decimal 20.
`CENTI4.MAC:2389` is `LDY I,20.`, decimal, also 20. Same value, different
radices, different channels. They are pinned by two separate claims on purpose.

### 3.1 The gating is not uniform

`SOUNDS` runs every video frame, but three cues mask `FRAME` before advancing.

| Gate | Cue | Citation | What the ROM does |
|------|-----|----------|-------------------|
| every 2nd | `spiderLoop` | `CENTI4.MAC:2338-2340` | `LDA FRAME` / `LSR` / `BCC` — carry is bit 0 |
| every 4th | `playerDeath` | `CENTI4.MAC:2438-2439` | `AND I,3` |
| every 8th | `bonusLife` | `CENTI4.MAC:2375-2376` | `AND I,07` |

Everything else advances once per pass: `CENTI4.MAC:2355` (shot),
`CENTI4.MAC:2421` (explosion), `CENTI4.MAC:2431` (march), `CENTI4.MAC:2386`
(scorpion).

So the bonus life is the longest cue in the game by a wide margin — 17 passes at
one pass per 8 frames is about 2.27 seconds, against the shot's 11 frames at
about 0.18. A baker that flattened the gating would make the bonus jingle eight
times too fast.

### 3.2 Which cues loop, in the ROM's own words

- `march` — `CONT1` says `;MUST BE REPEATED` (`CENTI4.MAC:2458`). The repeat is
  mechanical rather than internal: `MOTION` masks `FRAME` (`CENTI4.MAC:1286`) and
  re-seeds `CHAN1` (`CENTI4.MAC:1288`, `CENTI4.MAC:1289`) every 16 frames, while
  the cue is only 7 passes long. The machine's own words for that test are
  `;IF NOT 1/4 SECOND BOUNDARY` (`CENTI4.MAC:1287`) — a branch *away* from the
  seed, not a label on it. **It rings for 7 frames of every 16** — a tick, not a
  drone. This matters for cp6-2: baking a 16-frame looping sample would be wrong;
  the sample is 7 frames and the silence is real.
- `spiderLoop` — `CONT3` says `;WELL REPEAT UNTIL TURNED OFF`
  (`CENTI4.MAC:2462`), and `SOUNDS` reseeds `CHAN3` in place
  (`CENTI4.MAC:2346`, `CENTI4.MAC:2347`). It needs an explicit stop, which
  arrives when the spider is shot (`CENTI4.MAC:2255`) or leaves the screen
  (`CENTI4.MAC:282`).
- `scorpionLoop` — the ROM's own `;CONTINOUS LOOP` (its spelling)
  (`CENTI4.MAC:2388`), reseeding to decimal 20 (`CENTI4.MAC:2389`).
- `fleaLoop` — continuous by construction; it is recomputed every pass while the
  flea is on screen.

Everything else is a one-shot.

---

## 4. Open items handed forward

**An eighth sound-raising site has no cue name.** `RESTOR`
(`CENTI4.MAC:1826`), the between-wave routine that restores partially-eaten
mushrooms and awards 5 points each (`CENTI4.MAC:1857`), seeds the explosion cue
once per restored mushroom (`CENTI4.MAC:1881`, `CENTI4.MAC:1882`). Our manifest
has no cue for it. This is the mirror image of an unsourced cue — a ROM sound
with nowhere to go — and wiring it would be a core/shell change, not a baker's
job. Recorded here; not smuggled into this story.

**The 15-second alarm is declined, not missed.** `CENTI4.MAC:2360-2371` is a
warning tone for the TIMED-play DIP option that cp1 ruled is not modelled. Note
that it contains a **fourth** `FRAME` mask (`CENTI4.MAC:2368`), so a reader
grepping this routine for frame gates finds four and should expect only three to
appear in §3.1. Its low end is also the one place an earlier spelling of this
story went dangerously wrong: the alarm begins at `CENTI4.MAC:2360`, not at
2358, and `CENTI4.MAC:2358` / `CENTI4.MAC:2359` are the **shot cue's own**
control byte, which cp6-2 needs.

It also takes POKEY voice 1, which makes it a fifth claimant on the contended
voice rather than a separate tone: both of its exits (`CENTI4.MAC:2369`,
`CENTI4.MAC:2371`) jump to label `44$`, the bonus life's own `STA AUDF1` at
`CENTI4.MAC:2382`. Out of scope here because TIMED play is not modelled — but if
a later story ever models it, §2.5's arbitration gains a member, and it enters
above the bonus rather than below it.

**The manifest is unchanged.** Per AC-5 this story ruled and did not edit.
`SOUNDS` and `CHANNELS` in `src/shell/audio.ts` are exactly as cp5-1 left them,
pinned by `tests/audit/sound-dossier.test.ts`.

---

## 5. For cp6-2

1. Consume `sound.fixture.json`. Do not re-derive lengths from this prose.
2. Bake the six tables. The frequency bytes are `AUDF` values and the control
   bytes are `AUDC` (distortion in the high nibble, volume in the low).
3. The three inventions must be baked as **declared stand-ins or not at all** —
   never presented as transcribed. Each has a recommendation in the fixture.
4. `fleaLoop` is a sweep, not a tone. A single fixed sample is a stand-in for it
   and must say so.
5. `march` is 7 frames of sound in a 16-frame period. Do not stretch it.
