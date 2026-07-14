# Star Wars — bake the POKEY music from the original source

**Date:** 2026-07-13
**Author:** Architect (Emmanuel Goldstein)
**Story:** sw6-1
**Status:** proposed

## The problem

Star Wars has never played music. Not once, in production.

sw3-5 built the whole music path and it is correct: the core emits a `MusicEvent`
on each phase edge, `main.ts:223` calls `audio.startLoop(event.track)`, and that
reaches a `@arcade/shared/audio` engine pointed at the `music/` R2 prefix. What it
reaches for is not there:

```
https://arcade-assets.slabgorb.com/star-wars/music/space_theme.wav      404
https://arcade-assets.slabgorb.com/star-wars/music/towers_theme.wav     404
https://arcade-assets.slabgorb.com/star-wars/music/trench_theme.wav     404
https://arcade-assets.slabgorb.com/star-wars/music/imperial_march.wav   404
                                        (sfx/*.wav, by contrast, are 206 — they exist)
```

The engine's contract is **silent degrade at every failure path** — a missing asset
is indistinguishable from working code. No console error, no crash, just silence.

Asset production was deliberately scoped out of sw3-5 and flagged three times (TEA,
Dev, and the Reviewer all logged it as a non-blocking Delivery Finding). No follow-up
story was ever filed, so the finding died in the archive. This story is that
follow-up.

## Do not reverse-engineer the disassembly

The obvious path — read `reference/disasm/sound/Music_Functions.asm` (1,173 lines of
6809) and decode note words like `fdb $805A, $8701, $3316` — is the wrong one, and so
is emulating the sound board (we have no sound ROM binary, and the disasm listing
carries mnemonics without opcode bytes, so one cannot be reconstructed from it).

**The original 1983 Atari source has the music, fully commented**, at
`~/Projects/star-wars-1983-source-text` (see CLAUDE.md → "The original 1983 Atari
source"):

| File | What it is |
|------|-----------|
| `SWMUS.MAC` (62KB) | **"STAR WARS TUNES"** — `TUNTAB` plus every voice's note stream |
| `SNDPM.MAC` (34KB) | **"(RUSTY'S POKEY MUSIC) DRIVER, 6809 VERSION"** — the player |

`SWMUS.MAC` carries the assembled bytes *with the original macro call as a comment
directly above them*, so the encoding documents itself:

```
SF2V1:	;.CALL	6		;PARALLEL DESCENDING SEMI-TONE SCALES
	.BYTE	8D, 6
	;.CKEY	0
	.BYTE	85, 0
	;.ENDT
	.BYTE	0, 0
```

`$8D` = `.CALL`, `$85` = `.CKEY`, `$90`/`$91` = `.GOSUB`/`.RETURN` (macro-defined at
the head of the file), `0,0` = end-of-tune. Notes appear in human notation in the
comments (`.NOTE G5A,FS5A,E5B,D6H`). `SNDPM.MAC` supplies the opcode dispatch table,
the note→frequency table (`.WORD 038DC ; G# 51.9131 HZ`), and the frequency and
amplitude envelope engines (`HRN` horn, `TRB` trombone, `BAS` bassoon, `GLK`
glockenspiel, `WW` woodwinds; `SDR` steel drums, `HRD`, `QKR`, `TIE`).

This is the same shape as the two bakes that already work. `tools/speech-bake` did
not emulate the 6809 either — it lifted the LPC bitstreams out of the source and
re-implemented only the TMS5220 decoder in JS. Music is that pattern with a different
chip: lift the tune data, port the player, feed the **already-vendored** POKEY core
(`tools/pokey-bake/vendor/pokey.js`). No second POKEY implementation enters the repo.

## The phase→tune mapping is named in the source

`SNDPM.MAC`'s entry points are labelled by game moment — nothing here is inferred:

| Our track | ROM entry | The source's own comment |
|-----------|-----------|--------------------------|
| `space` | `PMTH5` | `;MAIN THEME (START OF GAME)` |
| `towers` | `PMBEN` | `;BENS THEME (START OF TOWER)` |
| `trench` | `PMRRP` | `;REBEL THEME WITH REPEATS(TRENCH WITH REPEATS)` |
| `imperialMarch` | `PMDAR` | `;LORD VADER'S THEME` |

`PMRRP` — the *with-repeats* variant — is the looping trench cue, which is what a
`startLoop` channel wants. (Also present, unused by us: `PMCNT` cantina/hi-score,
`PMEND` after the Death Star explosion, `PMDES` descent, `PM4TH` battle-in-fourths,
`PMTHB` theme B, `PMSF2` proton torpedo.)

**Open question for TEA/Dev to settle from the ROM, not from taste:** the main board
fires *two* space cues (`$24`/`$25` = "space wave music 1 / 2") and *two* towers cues
(`$20`/`$21`), so the cabinet has more segments per phase than our four-file manifest
has slots. Decide explicitly, with the ROM evidence written into the session: either
bake one flattened loop per phase (manifest unchanged) or extend the manifest to
carry the segments. Do not quietly pick one.

## Radix trap

`SWMUS.MAC` and `SNDPM.MAC` are **`.RADIX 16`** — constants are HEX unless the
trailing-dot decimal trick is used (the file's own first line, `.RADIX 16.`, is a
decimal 16). This project has been bitten by exactly this twice: red-baron's
`RBARON`/`RBGRND` equates and star-wars' own `WSOBJ.MAC` `.PH` vertices. A decimal
misreading of the frequency table or note durations yields music that is plausible
and wrong — pin it with a test that *refutes* the decimal reading.

## Scope

One story, `sw6-1`. Ends with music audible in production, or it has not landed:

1. **Transcribe** the four tunes' voice streams from `SWMUS.MAC` (generated, not
   hand-edited — mirror `tools/speech-bake/gen-speech-data.mjs`).
2. **Port** `SNDPM.MAC`'s player to JS: opcode dispatch, `.CKEY` key offset,
   `.CALL`/`.GOSUB`/`.RETURN`/`.LOOP`/`.ENDT`, the note→AUDF table, and the frequency
   + amplitude envelopes. An opcode or envelope the four tunes never reach may be
   left unimplemented — but it must **throw**, never silently no-op.
3. **Bake** four seamless `.wav` loops through the vendored POKEY core.
4. **Upload** to R2 under `star-wars/music/`.

## The upload is not free — and it is the step that makes this real

There is **no automated upload path for the `arcade-assets` bucket**. CI deploys each
app's `dist/` only (`scripts/deploy-r2.mjs`); the existing SFX and speech appear to
have been placed by hand. This story must either add a recipe (`just deploy-assets`)
or document the manual step in `docs/ops/hosting.md`.

A story that bakes four beautiful `.wav` files and never uploads them leaves the game
exactly as silent as it is today. The acceptance test is a live `200`, not a green
`vitest`.
