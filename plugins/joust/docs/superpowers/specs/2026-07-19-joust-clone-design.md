# Joust clone — design spec

2026-07-19. Brainstormed and approved section-by-section; this document is the
validated design. Ground truth for every ROM fact: [`docs/rom-study/`](../../rom-study/)
(brief, subsystems, pictures, glossary, open questions) — this spec cites the
dossier rather than re-deriving it.

## Rulings (user, 2026-07-19)

1. **Deliverable:** whole-game roadmap + fully-storied first epic (the full
   pre-implementation bootstrap, in one session).
2. **Behavior target: red label / RV4** — Williams' final word (Oct '82):
   the patched pterodactyl (aim-lower / slow-dive), the strengthening lava
   troll, the 1-second baiter cadence, the gladiator-wave state fix.
   `JOUSTRV4.SRC` is both the citation file and the behavior — the straightest
   path. Every patched site preserves its pre-patch instruction in `********`
   comments, so a "classic green" mode remains recoverable later; the
   revision↔label forensics live in the dossier (brief §0, open-questions §1).
3. **2-player simultaneous co-op is in** — the arcade's first simultaneous-2P
   game. P1 arrows + flap; P2 A/D + flap (one keyboard). The ROM's wave
   machine already degrades gracefully (co-op→survival when solo; gladiator
   no-ops solo — subsystems §3), so 1P play falls out for free.
4. **Visual identity: faithful raster.** Transcribed frames from
   `JOUSTI.SRC`, `COLOR1` palette (nibbles are literal palette indices — no
   remap PROM, proven), no glow treatment. Second raster cabinet after
   centipede.
5. **Scope: free play, no coin layer.** Keep `GA1` (difficulty, default 5),
   `REPLAY` (extra man @ 20,000), `NSHIP` (lives, default 5), and the
   high-score tables. No coin pricing, no audits, no operator menu, no
   self-test. **The JZAP/LZAP/KZAP anti-tamper zappers are deliberately
   omitted** (their checksums cannot hold in a re-implementation; documented
   in brief §4).
6. **Build strategy: playable slices** — every epic ends demoable.

## Architecture

Repo shape mirrors the siblings: `src/core/` pure deterministic sim,
`src/shell/` render/input/audio/storage. Vite 8 + TypeScript + Vitest 4.
Port **5279** `strictPort`, `base: '/'`. Deploys to R2 bucket `arcade-joust`
→ `joust.slabgorb.com` (provisioned at the ship epic).

**Timebase.** One sim step per video frame, integer frame counting:

```ts
// Exact frame rate per MAME (williams.cpp:1556): 8 MHz dot clock,
// 512×260 total raster. The ROM's nap unit IS one video frame —
// five independent author oracles (dossier brief §3).
export const FRAME_HZ = 8_000_000 / (512 * 260); // 60.09615…
```

All gameplay timers count frames (the ROM's nap unit). The shell accumulates
wall time and steps the sim in whole frames; core never reads a clock.

**Core model stays ROM-shaped — the process architecture is the sim's
shape.** Entities are a tagged-union list ("processes") with frame-quantized
nap timers, mirroring the ROM's 40-slot cooperative scheduler (subsystems
§1). Positions are 16-bit pixel+fraction (**256 units = 1 px/frame** velocity
— `ADDGRX`, `JOUSTRV4.SRC:6494`); `PVELX` is a table *index* into the
non-linear `FLYX` ladder, exactly as shipped; the joust resolves on the
sub-pixel `PLANTZ + PPOSY` comparison (integer-Y comparison produces false
ties — dossier). Collision is box broad-phase + transcribed span narrow-phase;
landing is the bitmask-table + snap model. **No air drag, no terminal
velocity** — both cited negative claims with tests to keep them absent.
RNG is `@arcade/shared/rng`, seeded by the shell, with a deterministic
per-frame stir mirroring the IRQ's (`SYSTEM.SRC:581-582`); no
`Date.now`/`Math.random` anywhere in core.

**Rendering.** Faithful raster: frames transcribed from `JOUSTI.SRC`
(byte-gated against the source's own FCB/FDB data + `*.PIC` S-Records — no
ROM chip binaries exist to gate against; brief §1), drawn through an
offscreen atlas onto a **292×240** logical canvas, integer-scaled, crisp
pixels. `COLOR1` palette (octal-radix trap documented); text from the
transcribed 5×7 and 3×5 fonts + custom charset. We repaint every frame, so
the ROM's erase-by-black constraint dissolves harmlessly — noted so nobody
reimplements it.

**Input.** Core takes a device-agnostic per-player contract
{direction: −1/0/+1, flap-edge}; the shell maps P1 arrows+flap, P2 A/D+flap.
The ROM's own normalisation (`ANDA #$03 / ASRA / SBCA #0`) is the model.

**Shared library** (version-pinned git-URL, house rules): `/rng`, `/loop`,
`/highscore` (lobby contract), `/pause`. Not used: `/math3d`, `/font` (ROM
fonts instead), `/glow`, `/view`.

**Audio** is deferred to epic jt5 with the fleet's both paths open (runtime
board emulation à la star-wars vs baked samples à la tempest). Extra
constraint here: the 4K sound ROM's source is absent from the tree
(`VSNDRM4` — brief §1), so ground truth leans on MAME's
`shared/williamssound.*` + the shipped ROM's behavior. Deciding now would be
premature.

## Roadmap

| Epic | Slice | ~Pts | Demo at the end |
|---|---|---|---|
| jt1 | Foundation: scaffold, citation checker, image transcription, arena + landing, flap physics, render shell | 23 | Fly the ostrich around the authentic arena |
| jt2 | The joust: enemies + the intelligence budget, joust resolution, eggs, wave machine core, transporters | 15 | Wave 1 vs the buzzards |
| jt3 | Menagerie: pterodactyl (+patches), lava troll, bridge destruction, baiters, difficulty ramp | 13 | The full ecosystem hunts you |
| jt4 | Game structure: 2P co-op + all six wave types, scoring/BCD, extra men, HSTD + initials, attract lessons | 10 | Two knights, full loop |
| jt5 | Sound: path decision + all cues | 8 | It sounds like a Joust |
| jt6 | Ship: lobby tile, R2 + `joust.slabgorb.com`, release pipeline, closing `rom-fidelity-audit` | 5 | Live |

Dependencies: jt2 → jt3 (shared enemy/collision machinery); jt4 needs jt3;
jt5 and jt6 close. The citation checker (jt1-2) blocks every
constant-transcription story — the rb4/cp1 lesson, applied from day one.

## Epic jt1 — Foundation (stories)

- **jt1-1 Scaffold** (2): Vite/TS/Vitest on 5279 strictPort + core/shell
  purity guard + ten-line CI caller (bucket `arcade-joust`) + orchestrator
  registration (justfile lists/serve, CLAUDE.md port row live).
- **jt1-2 Citation checker + claims JSON** (3): single-sided schema (cp1-2
  precedent), dossier citations converted to `claims/*.json`, byte-for-byte
  re-open against the vendored tree, graceful schema-only degrade in CI.
  **Blocks jt1-3/4/5.**
- **jt1-3 Image transcription + contact sheet** (5): decode `JOUSTI.SRC`
  into `src/core/pictures.ts` — both record formats, `COMCL5` RLE expansion,
  collision span tables, `COLOR1`/`HICOLR` palettes — byte-gated against the
  source data itself; octal/DMAFIX traps enforced by tests; contact-sheet
  artifact (91 blocks) for human review.
- **jt1-4 The arena** (5): cliff placements, landing bitmask tables + the
  six snap Ys, lava + bridge fills, X-wrap bounds [−10,292], ceiling/floor;
  every constant radix-cited + claims entry.
- **jt1-5 Flight + ground movement** (5): flap edge with `PTIMUP` impulse
  decay, the gravity pair (4 held / 8 released), `FLYX` ladder + rejection
  clamp, elastic ceiling, lava death, the ground `STATE` machine with
  animation-driven deltas, landing conversion table; negative tests pinning
  no-drag/no-terminal-velocity; deterministic under seeded replay; 2-player
  input contract.
- **jt1-6 Render shell + demo** (3): atlas from jt1-3 data, 292×240 integer
  scale, palette-correct; playable demo on 5279 — fly the ostrich around the
  authentic arena (the epic's demo); render source-wiring test.

## Spec self-review

Checked: no placeholders; rulings↔architecture consistent (RV4 constants
cited to RV4 lines; 2P contract present from jt1-5); scope fits six epics
with jt1 implementable from the dossier alone; ambiguities pushed to
open-questions.md rather than silently resolved (revision fine-mapping,
sound path, MARQUE page).
