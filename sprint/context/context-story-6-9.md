# Story 6-9 Context

## Title
Authentic enemy motion & behavior constants (core fidelity)

## Metadata
- **Story ID:** 6-9
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** tempest
- **Epic:** Wave 6 — Playtest feel & balance

## Problem
Tune enemy motion/behavior to authentic constants from the rev-3 ROM (enemy-recon). CORE/sim - deterministic (dt + seeded RNG). GLOBAL: along 0x10=near rim/player .. 0xf0=far; enemies spawn 0xf0 and climb toward low along; 0x20 = near-rim trigger (split / spiker-reverse / grab). Speed bytes are signed, sign-extended x8; net ~ (byte)/32 along/frame, x60 -> per second. FLIPPER: climb spd_flipper L1 -1.375/fr (-82.5/s, ~2.7s up the tube), L33+ -3.375/fr; a flip sets 0x80+target angle then steps +/-1 per tick into the adjacent lane; per-level flip patterns (m_l0b 8-moves-then-flip, m_l19 constant flip, m_l24 2-then-3 alternating, m_l87 flip-away-then-4-moves); rim grab kills if same seg as player; flip_top_accel 2 (L1-32) / 3 (L33+). TANKER: straight up at flipper speed; SPLITS on reaching 0x20 OR on death into 2 children of cargo type into adjacent lanes (seg-1, seg+1); split-type 1 -> 2 flippers / 2 -> 2 pulsars / 3 -> 2 fuzzballs. SPIKER: spike grows only toward the rim (spike_ht=along when along<spike_ht), growth rate = climb speed; oscillates ~0x20 <-> far; at the far end hops to a random lane (prefers the tallest-spike lane), converts to flipper/tanker if none pending; speed flipper-relative (L21+ faster). FUSEBALL: spd_fuzzball = 2x spd_flipper (fastest; L1 -2.75/fr, -165/s); rolls along the rim + slides lanes toward the player gated by fuzz_move probability (pokey2_rand); KILLABLE ONLY on a lane in its vulnerable phase (L02cc bit7), NOT while rolling the rim; hit_tol 6 (wider); score 250/500/750 random. PULSAR: appears L17+; flipper speed when far, pulsar speed near (spd_pulsar const -82.5/s); pulse integrated by pulse_beat (4/6/8); pulsar_fliprate 40fr@L17 -> 10-20fr@L40+; LETHAL LANE: when pulsing is active and the player is in the pulsar's lane -> player death (standing in a pulsing pulsar's lane kills you). SPAWN/MIX (verify vs our difficulty): flippers-only L1-4; tankers L5+; spikers L5-16; fuseballs L11+; pulsars L17+; steady L33+ (5F/3P/3T/1S/3Fz); wave_enemies released via 64 staggered ~16fr/0.27s countdowns while in-tube < max_enm=6. SCORES (verify): Flipper 150, Pulsar 200, Tanker 100, Spiker 50, Fuseball 250/500/750. May split per-enemy. Full notes in design ref (Enemy roster).

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior._

## Scope
- In scope: the behavior described by the story title.
- Out of scope: unrelated changes.

## Acceptance Criteria
- Enemy climb / flip / split / spike-growth / fuseball-rim / pulsar-lethal-lane behavior matches the authentic constants (speeds per second, timers in frames), driven by dt + seeded RNG; covered by seeded core unit tests.
- Fuseball killable only in its on-lane vulnerable phase (not on the rim); Tanker splits into 2 cargo-type children on 0x20/death; Spiker spike grows toward rim and hops at the far end; Pulsar lethal-lane kills a player standing in a pulsing lane.
- Spawn mix by level and scoring verified vs the ROM (Flipper150 / Pulsar200 / Tanker100 / Spiker50 / Fuseball250-500-750).
- Pure-core boundary preserved: no DOM / time / Math.random; deterministic and frame-rate independent.

## Reference Notes — *Tempest vs Tempest* (Hogan, 2026)

> Independent second source: Rob Hogan, *Tempest vs Tempest: The Making and Remaking
> of Atari's Iconic Videogame* (2026), a chapter-by-chapter walk of the 6502 source of
> the **1981 arcade** and the **1994 Tempest 2000 (T2000)**. Page cites are the book's
> printed page numbers. This **corroborates** the primary ROM extract in
> `docs/ux/2026-06-27-enemy-roster-rom-extract.md`; the book's behavior chapters are mostly
> qualitative, so **numeric motion constants (climb speeds, flip-step, `flip_top_accel`, scores)
> remain ROM-extract-only** — but two 1981 chapters add hard, codeable detail.

**Flag-byte semantics — LAYOUT corroborated, but 🚩 fire bits CONFLICT (open item).** The book
documents a 1981 per-enemy byte **`INVAC2`** "that governs the type, firepower, and movement direction
of each active invader" (p.272):

| `INVAC2` | bit7 = direction | bit6 = fire | low-2 bits = carrier payload |
|----------|------------------|-------------|------------------------------|
| `00000000` | Up   | No fire | none |
| `10000001` | Down | No fire | Flippers |
| `11000010` | Down | Fire    | Pulsars |
| `01000011` | Up   | Fire    | Fuses (fuseballs) |

The **bit layout matches** our `L028a` model (bit 0x80 = direction, bit 0x40 = can-shoot, low 2 bits =
carrier/split type 1→flippers / 2→pulsars / 3→fuseballs) — model the flags as this one byte. **But the
fire bits disagree with the rev-3 extract:** here the **flipper-carrier tanker has fire CLEAR (no fire)**
and only pulsar/fuse carriers fire, whereas the rev-3 reading (`enemy-roster-rom-extract.md` §F) has the
tanker `L028a = tanker_load|$40` → fire **always set**. So this does **not** confirm "tankers/spikers
always fire" — it points the other way (narrower fire set). 🚩 **Enemy fire eligibility is RE-FLAGGED as
an open verification item** (see §F honesty flag). Story 6-5 shipped on the user's "match literal rev-3"
decision; if that ever looks wrong in play, this `INVAC2` evidence is the reason to re-check.

**Flipper behavior — qualitative AGREEMENT** (reproduced arcade manual, p.195): "Originates at far
rim and rides up two rails. Flips in the tube and on near rim. Kills player by flipping onto shooter."
First appears **Level 1**. Confirms: climbs far→near, flips both mid-tube and at the rim, **rim-grab
kill** when it reaches the player's lane, active from L1. (No numeric climb/flip constants in the book —
use the ROM-extract values.)

**Tanker split — AGREEMENT.** "A standard tanker in *Tempest* releases flippers when it is struck."
(p.233) Confirms split-on-death with **flipper** cargo for the default tanker; per-cargo children
(flipper/pulsar/fuseball) per the `INVAC2`/`L028a` low-2-bits table above.

**Player bullets ("charges") — AGREEMENT on the cap.** 1981 calls them **"charges"** that "run along
the rail the player occupies, into the well"; **`NCHARG` = 8** slots, a charge is **active iff its depth
(`CHARY`) is non-zero**, lane held in `CHARL1`. (p.255–256) Confirms the 8-shot pool and the
depth-along-current-lane motion model. (Bullet speed `+9/frame`, spike-slowdown stay ROM-extract-only.)

**Superzapper — RESOLVED → twice per LEVEL** (adjacent context; not enemy-motion, but settles the
open question). Processed once per tick in `PLAY` via `PROSUZ`. Constants: **`CSUMAX = 2`** (max uses
per level), `CSUSTA = 3`, `CSUINT = 1`, durations **`TIMAX = {_, 13, 5}` ticks** (first zap 13, second
5). First press kills **all enemies and enemy bullets EXCEPT tankers** (carrier bits cleared first so a
killed tanker can't release its cargo); second press kills **one** more (the mechanism nets "7 then 1").
**No dedicated zap sound** (cascade of per-enemy death SFX). The superzapper **recharges at the start of
each level** (`SUZCNT` reset in per-level `INISUZ`) — **not per-life**; this matches the canonical,
manual-documented Atari behavior, so the earlier per-life assumption is dropped. (p.269–272)

**Architecture contrast — T2000 is NOT the model.** The book's `activeobjects` and `jump` chapters
are **Tempest 2000**: a doubly-linked list of fixed **64-byte structs** dispatched through stored
**`run_vex` function pointers** (`run_flipper`/`run_fuseball`/`run_spiker`/`run_ashot`…), plus a
player **"jump"** feature (`cjump`, add `$c11`/frame, ~42 steps up/down) that **does not exist in the
1981 game**. (p.251–267) Our core must keep the **arcade per-enemy bytecode-VM** model, not this struct/
pointer scheme. (T2000 velocities — flipper 4, fuseball -1 — also invert the arcade "fuseball = 2×
flipper"; T2000-specific, ignore for our target.) T2000's attract-mode `auto` does show useful **closed-
web shortest-path lane logic** (reads `web_max`, halves it, branches on a `connect` open/closed flag) —
a contrast mirror of our wrap-vs-clamp rim traversal. (p.184–187)

**Coverage gap (honest).** The book did not provide numeric constants for Spiker oscillation/hop,
Fuseball rim-roll probability, or Pulsar fliprate/lethal-lane timing; for those the ROM extract
(`enemy-roster-rom-extract.md` §C/D/E) remains the sole authority.

---
_Generated by `pf context create story 6-9` from the sprint YAML._
_Reference Notes added 2026-06-27 by Architect from_ Tempest vs Tempest _(Hogan, 2026)._
