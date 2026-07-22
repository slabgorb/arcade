# Joust epic jt4 — "Game structure (the game loop)" — epic design

2026-07-22. Architect design executing the user-approved roadmap slice
(`joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md`, roadmap row
jt4: "2P co-op + all six wave types, scoring/BCD, extra men, HSTD + initials,
attract lessons"). Ground truth for every ROM fact: `joust/docs/rom-study/`
(machine-gated by the citations suite) — this design cites the dossier, it does
not re-derive it. Citation form is fully-qualified `FILE:LINE` throughout (the
jt1-8 lesson: never bare `:N`).

## The scope split (user ruling, 2026-07-22)

The roadmap's jt4 bundled two distinct subsystems: the **game-session
mechanics** (scoring registers, lives, game-over, the 2P wave-type behaviours)
and a **text-engine-dependent presentation layer** (authentic score *display*,
the HSTD tables, initials entry, the attract "lessons"). Roughly half of the
row cannot exist until a whole new subsystem — the `MESSAGE.SRC`/`PHRASE.SRC`
text engine — is built; the other half is pure-core and needs no glyph at all.

**Ruling: cut at that seam.** jt4 is the **mechanics half only** — everything
provable headlessly against a seeded sim. A new **jt5 (presentation)** carries
the text engine + score display + HSTD/initials + attract lessons; **sound
moves to jt6, ship to jt7**. This buys two coherent, independently-demoable
epics for the cost of a larger joust tail (see Roadmap update below). All jt4
source is vendored (`MESSAGE.SRC`, `PHRASE.SRC`, `TB12REV3.SRC`, `ATT.SRC`,
`EQU.SRC`, `JOUSTRV4.SRC` all present under
`reference/williams-source/joust/`) — jt5 is fully buildable when it comes; the
split is a sequencing decision, not a ground-truth gap.

## What jt3 delivered, what jt4 mounts on

jt1/jt2/jt3 shipped the entire deterministic **simulation**: the process list
(tagged-union scheduler, frame naps, kill-by-id+mask), the enemy brains + the
`NSMART`/`WSMART` intelligence budget, the joust resolution, the full egg
lifecycle, transporters, the **wave machine core** (90-row `WAVTBL` decode +
the 6-entry `WJSRTB` dispatch skeleton), the difficulty ramp (`DYTBL`/`IWAVE`),
and the full menagerie (pterodactyl, baiters, lava troll, bridge/cliff
destruction, the ptero dissolve). `stepDemo` (`joust/src/core/demo.ts`) already
runs the whole **wave-clear → advance → spawn** loop deterministically.

What the sim has never had is a layer *above* the frame: nothing accumulates a
score, tracks a life, ends a game, or pays a wave bounty. The score **values**
are already emitted as events — `joust.killScore`, `egg.eggScoreEvents`,
`ptero.pteroScoreEvent` — and then *thrown away* (`demo.ts` caps the log and
notes the drain is owed). jt4 is exactly that missing layer.

**Seeds already planted for this epic** (grepped, all binding):

- score **accumulation** is owed — `demo.ts` (the event log "would otherwise
  grow unbounded; nothing drains it"), `egg.ts` ("BCD scoring is jt4"),
  `dissolve.ts` ("scoring accumulation is jt4"), and the joust/egg/collision
  test contracts (events only; "BCD accumulation is jt4");
- **extra men** is owed — the joust-collision contract ("display + extra men
  are jt4");
- the **50-for-dying** credit (`JOUSTRV4.SRC:4730-4732`) was deferred by jt2;
- **DBAIT baiter removal** is owed — `demo.ts` ("nbait settles at
  MAX_BAITERS and the swarm holds"; the baiter dissolve tags itself so "the
  (jt4) baiter count can settle on entry");
- the **egg + gladiator wave-type behaviours** were explicitly deferred here by
  the jt3 design ("gladiator/egg behaviours stay jt4"); jt3-4 only made the
  *ptero* wave type live on the `WJSRTB` skeleton.

## Design rulings (Architect, this epic)

- **A session layer above the sim — one new module, born in the first story.**
  Score, lives, and game-over are *per-session* state that outlives any frame;
  the sim is *per-frame*. jt4 introduces one module (`game.ts`) holding
  `GameState { players: [{ score, lives, out }], gover, wave, sim }` and a
  `stepGame` that wraps the existing `stepDemo` and **drains its event stream**
  into the registers. The pure sim (`frame.ts`/`demo.ts`) is not rewritten; the
  session state is created in jt4-1 and matured across the epic (its wave-to-
  wave loop consolidated in jt4-4). No promotion-refactor debt is deferred to
  the end. The purity guard sweeps `game.ts` the moment it lands.
- **Two knights = two independent ledgers.** ROM co-op gives each player their
  *own* score and *own* lives; a dead player waits, the game ends when both are
  out. `GameState.players` is that 1–2 element array from story one — 2P is not
  a bolt-on, it is the shape.
- **RV4 is the behaviour target** (the whole-game 2026-07-19 ruling). The
  `PLYG1/2` polarity + the `PATC11` "GAME START GOOF" cleanup
  (`JOUSTRV4.SRC:6282-6284`) are red-label behaviour; any displaced instruction
  preserved as a `********` comment per house discipline.
- **Display stays in jt5; accumulation is jt4.** Several existing code comments
  say "scoring display is jt4" — the split re-reads those as "accumulation jt4
  / display jt5". A one-line prose correction the epic sweeps up (jt4-1); no
  behaviour change. The jt4 demo shows score/lives via a **dev-overlay** only —
  the authentic `MESSAGE.SRC` glyph render is jt5's row, not a jt4 stub.
- **Caveated values pass through, not re-litigated.** The `SCRTEN`
  tens/hundreds-*backwards* quirk and the *derived* ptero-1000 `DVALUE`
  (open-questions §4) are pinned by test with their provenance flagged — jt4
  accumulates them faithfully; it does not "correct" a derived value.

## Ground truth (dossier §3 scoring, §6 attract — all machine-gated)

- **BCD scoring:** `SCRHUN` thousands/hundreds, `SCRTEN` tens/hundreds
  *backwards* (`JOUSTRV4.SRC:7340-7366`); the `DVALUE` decision bytes
  (`JOUSTRV4.SRC:5563-5577`) — Bounder 500 / Hunter 750 / Shadow Lord 1500 /
  Ptero 1000 (derived); eggs 250–1000 + 500 air-catch.
- **Wave bounties:** co-op 3000 each (voided by a partner-kill), survival 3000
  for a deathless wave, gladiator 3000 to the first partner-killer
  (`JOUSTRV4.SRC:2642-2728,4691-4698`); the `PLYG1/2` flags invert polarity
  between co-op and gladiator (`JOUSTRV4.SRC:2634-2635` vs
  `JOUSTRV4.SRC:2703-2705`); the dying player is credited 50
  (`JOUSTRV4.SRC:4730-4732`).
- **Wave-type dispatch + degrade:** `WJSRTB` six-entry table
  (`JOUSTRV4.SRC:2586-2591`); status nibble `JOUSTRV4.SRC:175-181`; co-op →
  survival solo (`JOUSTRV4.SRC:2628-2631`), gladiator no-ops solo
  (`JOUSTRV4.SRC:2697-2700`).
- **Extra men:** CMOS `REPLAY` threshold ×16, re-armed after each award
  (`JOUSTRV4.SRC:915-928,7382-7411`); `NSHIP` lives default 5, `GA1`/`REPLAY`/
  `NSHIP` the only kept adjustments; `COINSL $09` = free play
  (`TB12REV3.SRC:134-151,835-837`, `EQU.SRC:110-127`).
- **Game-over:** `GOVER` tri-state — 0 = over, negative = running, positive
  `$7F` = attract simulation (`JOUSTRV4.SRC:232-233,712,1015`).
- **Baiter cap:** max 3, `PCHASE`=−1 (`JOUSTRV4.SRC:2108-2113`); `BAITBL`
  schedule (`JOUSTRV4.SRC:2150-2163`).

## Stories

- **jt4-1 BCD scoring core** (3): the `game.ts` session layer + per-player
  6-digit BCD score registers; the `SCRHUN`/`SCRTEN` (tens-backwards, caveat)
  accumulation; drain the existing kill/egg/ptero event stream into the
  registers. Closes the accumulation seeds in `demo.ts`/`egg.ts`/`dissolve.ts`
  and the "display jt4 → accumulation jt4 / display jt5" prose correction.
  Cite `JOUSTRV4.SRC:7340-7366`, `:5563-5577`.
- **jt4-2 Extra men** (2): per-player lives (`NSHIP` default 5), the `REPLAY`
  extra-man threshold ×16 (@20 000) re-armed after each award, the award event;
  the dying-player 50-point credit. Cite `JOUSTRV4.SRC:915-928,7382-7411`,
  `:4730-4732`; `TB12REV3.SRC:134-151`.
- **jt4-3 Egg + gladiator wave types + the 2P bounties** (3): completes "all
  six wave types" — the egg wave spawns eggs, the gladiator wave rewards the
  PvP bounty (and no-ops solo) — plus the co-op bonus (3000, voided by
  partner-kill) and the survival bonus (3000 deathless), the `PLYG1/2` polarity
  inversion + the `PATC11` cleanup. Mounts on jt2-5's `WJSRTB` dispatch. Cite
  `JOUSTRV4.SRC:2586-2591,2628-2631,2697-2700,2642-2728,4691-4698,2634-2635,2703-2705,6282-6284`.
- **jt4-4 Game-over + the loop + DBAIT** (2): the `GOVER` tri-state; per-player
  death → out → game-over; the wave-to-wave loop reading score/lives;
  consolidate `stepDemo`'s loop under `stepGame`; **DBAIT baiter removal** +
  the nbait settle-on-entry. Cite `JOUSTRV4.SRC:232-233,712,1015`, baiter
  `:2108-2113`.
- **jt4-5 Demo — "two knights, full loop"** (2): the epic demo on 5279 — two
  knights playing a full loop (spawn → waves → death → game-over) with a
  **dev-overlay** score/lives readout (authentic display is jt5); screenshot
  committed with port-ownership proof (strictPort is porous — td1-1; a
  screenshot predating its code misrepresents the renderer — td1-3).

**≈ 12 pts.** All five stories `workflow: tdd`, `repos: joust`, priority p1.
Dependency chain: jt4-1 → jt4-2/jt4-3 (both read the registers) → jt4-4
(game-over reads lives; loop reads both) → jt4-5 (demos the whole).

## Roadmap update

The 2026-07-19 master roadmap table is superseded as follows (the master file
in `joust/` keeps its original snapshot; this table is the amendment of
record, per the jt3 precedent that the orchestrator epic-design carries current
roadmap thinking):

| Epic | Slice | ~Pts |
|---|---|---|
| jt4 | Game structure — the game loop: 2P co-op ledgers, all six wave types, scoring/BCD, extra men, game-over | ~12 |
| jt5 | Presentation — the `MESSAGE.SRC`/`PHRASE.SRC` text engine, authentic score display, HSTD + initials, attract lessons | ~8 |
| jt6 | Sound: path decision + all cues | 8 |
| jt7 | Ship: lobby tile, R2 + `joust.slabgorb.com`, release pipeline, closing `rom-fidelity-audit` | 5 |

## Spec self-review

Checked: no placeholders or TODOs; the scope-split ruling ↔ story ladder ↔
roadmap table are internally consistent (display consistently jt5, accumulation
jt4); every ROM fact carries a fully-qualified `FILE:LINE` from the machine-
gated dossier, with the two derived/caveated values (`SCRTEN` backwards, ptero
1000) flagged as pass-through not re-derivation; scope fits one epic
(mechanics-only, all headless) with the presentation subsystem cleanly excised;
the one genuine ambiguity (where the session layer lives) is resolved explicitly
(`game.ts`, born jt4-1). Note: jt2-8 (a prose-corrections chore) remains a jt2
leftover in backlog, not jt4's concern.
