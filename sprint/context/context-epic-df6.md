# Epic df6 Context

## Title
Defender sound (df6) — the absent-source audio epic (phase 5): the fleet event-channel seam, every gameplay cue ported from the ROM SOUND TABLE (priority/timer/sound#, cited), synthesised samples proven by a live 200, and the thrust held-loop; the two attract musics deferred to df7

## Overview
Sixth Defender epic and phase 5 of the framebuffer-raster cabinet build
(docs/playbooks/next-sprite-game.md, roadmap docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md sec 4 df6, approx 13 pts).
df1-df5 built a SILENT game: the world scrolls, the menagerie attacks in waves, the
scanner reads the world, humanoids are abducted and rescued, the two emergency powers
fire, and the game ends into a hall of fame — with no sound at all. df6 is the AUDIO.
It is the "absent-source" epic (roadmap sec 2): the sound board is a separate M6808
(894.886 kHz, williams.cpp:1540) running defend.snd = video_sound_rom_1.ic12
(williams.cpp:2002), and NO sound-board source is vendored in this tree — the same gap
Joust's tree has (JOUSTSND.DOC is a three-line pointer). ROMF8/ROMC0/ROMC8 are
main-CPU control/diag ROMs, not sound source. So df6 does NOT emulate the sound board;
it follows the battlezone/jt5 synthesis approach: pin the command values the MAIN CPU
writes (cited), synthesise each effect informed by MAME's board model and the
machine-local defend.snd bytes, and route it all through the fleet's existing
@shared/audio seam.
GROUND TRUTH IS THE MAIN-CPU SOUND TABLE, AND IT IS FULLY CITED. The game writes a
6-bit sound command to SOUND EQU $CC02 (defender/PHR6.SRC:18; *B0-B5 SOUND :133; *B1
THRUST :138) through the SOUND OUTPUT routine (SNDOUT defender/DEFA7.SRC:693-704 -> STB
SOUND :703). Every cue is one entry in the *SOUND TABLE (defender/DEFA7.SRC:659-691),
each an FCB command sequence documented in the header at :660 as
"SNDPRI,N*(REPCNT,SNDTMR,SND#)" with SNDTMR in 16 msec and SNDPRI "HI=HI,INTERRUPTABLE
BY EQUALS" (:662). The SOUND LOADER (SNDLD :706-721) and SOUND SEQUENCER (SNDSEQ
:723-757, called from :1943) drive the priority/interruption/repeat model and the
THRUST held state (THFLG defender/PHR6.SRC:293; on=$16 :750, off=$0F :743). This is a
richer, better-documented command surface than jt5 had — no cue in df6's core need be
an invention.
The fleet AUDIO SEAM is @shared/audio (src/shared/audio.ts): the VERB seven cabinets
share — lazy-context-on-first-gesture, silent-degrade at every failure path, a master
GainNode, buffer load/decode keyed by filename, POKEY-style channel voice-stealing, and
the sw6-2 loop-pending carve-out (a loop requested before its buffer decodes is started
when the decode lands). Each game supplies the NUMBERS (its SOUNDS manifest, CHANNELS
map, baseUrl) and keeps them in-game (SH2/SH4 ruled: share the VERB, not the NUMBERS).
The event->cue dispatch convention (SH4-5, pinned by tests/audio-dispatch-convention.test.mjs):
src/shell/audio-dispatch.ts holds PURE node-importable functions narrowing the engine to
a Pick<AudioEngine, ...> slice behind a never exhaustiveness guard. Defender adopts this
by importing @shared/audio — one import line, no pin, no version bump (the monorepo
dissolved the package boundary). jt5 (joust, also Williams, also absent sound-board
source) is the direct sibling; centipede cp5, battlezone and star-wars are the other
precedents.
DECISION A (RULED, roadmap-canonical): df6 is SOUND ONLY and ships the GAMEPLAY cue set
from the SOUND TABLE. The two ATTRACT musics — TODAYS SOUND $FE "PHANTOM"
(defender/AMODE1.SRC:148) and HIGH SCORE SOUND $FD "TOCCATA" (:152, played by HALL2 via
STBXBV :153,:163) — belong to ATTRACT MODE and the hall-of-fame screen, which df7 builds
(roadmap df7: "attract mode + hall of fame"). df6 DEFERS both, preserving their citations
for df7; it introduces no attract loop, no new enemy and no new picture.
DECISION B (RULED, silent-degrade -> the acceptance test is a live 200, not a green
vitest): @shared/audio degrades silently on a missing context, blocked autoplay, a failed
fetch and undecodable data alike, so a 404 is INDISTINGUISHABLE from working code — this
is exactly how a star-wars .wav stayed missing from sw3-5 through sw8-14, and the
standing Architect gotcha. The ASSET story's acceptance is therefore a curl returning 200
for every manifest URL, NOT a passing suite; and any "a cue must follow in a later story"
finding is FILED as a story before the epic finishes, never left to die in the archive.
Upload is by hand via `just deploy-assets` (CI never touches the assets bucket — named
plain `arcade`; the recipe must be extended to bake defender). No cue is silently
fabricated as authentic: a cue with no MAME/defend.snd anchor is marked invention-pending
in the manifest's source table.
DECISION C (RULED, determinism): cues are emitted as DATA on the sim state (an event
field the sim returns), NEVER as callbacks, so the core stays pure (purity.test.ts green)
and df3's seeded-RNG determinism replays reproduce bit-for-bit — the event channel adds
no RNG draw and no ordering change, and a test pins that. This mirrors jt5-1's
core/events.ts and the SH4-5 dispatch convention. Colour/HUD are unaffected (audio only).
DECISION D (RULED, ADR-0005 is a VISUAL exception and does NOT mute audio): ADR-0005 is
the PHOTOSENSITIVITY accessibility exception — it substitutes the smart-bomb/death/panic
full-frame VISUAL strobe for a freeze/fade/particle (df4-2/df5). It says nothing about
sound. The smart-bomb SBSND (defender/DEFA7.SRC:672), player-death PDSND (:667) and
terrain-blow/panic TBSND (:670) cues play NORMALLY. df6 records this so no one mistakenly
mutes an accessibility-safe visual's audio.
DECISION E (RULED, the ROM priority model maps onto CHANNELS, it is not re-emulated): the
SOUND TABLE encodes a priority/interruption/repeat model (SNDPRI hi, "interruptable by
equals", REPCNT, SNDTMR/16ms; SNDLD :709, SNDSEQ :725). df6 maps each cue's SNDPRI byte
onto the @shared/audio CHANNELS voice-stealing seam (the engine's existing verb, cited) —
it does NOT port the 6809 SNDSEQ sequencer byte-for-byte. Higher-SNDPRI cues take a
channel that a lower one cannot interrupt; equal priorities interrupt (per :662).
Reuse-first: @shared/audio (the seam — CONSUMED, not re-implemented), df3 sim.ts state +
scheduler.ts (cues are data on the returned state; timed cues are scheduler processes),
df4 collision.ts + the enemy reducers (the hit/shoot/grab/suck cue call sites already
exist), df5 score.ts/powers.ts and the rescue/panic (extra-man RPSND, smart-bomb SBSND,
hyperspace, rescue ACSND, panic TBSND all fire at seams df5 built). NO new @shared
extraction — the audio seam already exists and each game keeps its own NUMBERS (the
"extract on the second consumer" bar is met the wrong way here: the VERB is already
shared, the NUMBERS are Defender-specific).
Every command constant re-opens under the df1-1 gate: no src/core sound value without a
claims/*.json entry citing defender/<FILE>.SRC:<line>; line numbers from tool output only
(RASM radix trap: $hex vs bare decimal — the SOUND TABLE FCBs are hex).
Design + full story rationale to be written at kickoff:
docs/superpowers/specs/2026-08-1X-defender-df6-sound-design.md (mirror the df5 spec).
Traps carried in: the sound board is NOT vendored (synthesise, do not emulate); the
acceptance test for assets is a live 200 not a green vitest (silent-degrade); cues are
DATA not callbacks (determinism); a seam with no emitter is a blind spot (jt5-1: six
cues were deletable with the suite fully green — mutation-guard every emitter); ADR-0005
does not mute audio; SNDPRI maps to CHANNELS, it is not re-sequenced; line numbers from
tool output only; RASM radix.
OUT OF SCOPE: the two ATTRACT musics PHANTOM/TOCCATA + any attract/hall-of-fame cue
(df7, Decision A); the attract->play->death->game-over PHASE MACHINE + HUD render (df7);
emulating the M6808 sound board (synthesis only, roadmap sec 2); hardening/mutation
batteries (df8+).

## Metadata
- **Epic ID:** df6
- **Repo:** arcade

## Background
_Cross-story constraints and guardrails to be filled in as the epic
progresses._

---
_Generated by `pf context create epic df6` from the sprint YAML._
