# Joust epic jt2 — "The joust" — epic design

2026-07-20. Architect design executing the user-approved roadmap slice
(`joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md`, roadmap row
jt2: "enemies + the intelligence budget, joust resolution, eggs, wave machine
core, transporters — demo: Wave 1 vs the buzzards"). Ground truth for every
ROM fact: `joust/docs/rom-study/` (machine-gated by the citations suite) —
this design cites the dossier, it does not re-derive it.

## What jt1 delivered, what jt2 mounts on

jt1 shipped the transcribed images (93 blocks, byte-gated), the arena
(landing bitmask+snap, background collision map, wrap/ceiling/floor/lava),
the flap model (impulse decay, gravity pair, FLYX ladder, ground state
machine), and the render shell demo. `GameState` is still just a frame
counter (`frame.ts`) — jt2 is where the ROM-shaped **process list** (the
design spec's ruled core model) becomes real, because the wave machine, the
enemies, and the eggs are all processes with frame naps.

## Seeds carried in from the jt1 archives (all binding)

1. **`facing` is missing from `EntityState`** — jt1-6 Dev gap: `onMinus`
   transitions are unreachable, so the skid chain (`SKID_DELTA`,
   `SKID_PLANT_Z`) is exported but dead. The joust resolves on
   `PLANTZ + PPOSY`; skid sets `PLANTZ` = 2 (`JOUSTRV4.SRC:6071-6072`,
   recorded by jt1-5 as "jt2's consumable"). jt2-3 adds `facing` and makes
   the chain reachable.
2. **`PBUMPX`/`PBUMPY` unmodeled** — jt1-5 non-blocking tail, flagged "to
   jt2's combat epic planning". Drain laws already cited: X drained ≤3
   px/frame (`JOUSTRV4.SRC:7270-7284`), Y consumed whole
   (`JOUSTRV4.SRC:6495-6496`). jt2-3 owns them.
3. **Scheduler layout hazards** — jt1-10: anchor the 56-byte block walk on
   `PBLKM` (`RAMDEF.SRC:166`), never on a searched `ORG $0` (an earlier one
   exists — claim JT10-010); any pool arithmetic re-derives 40×56 = 2240,
   not the old 2040. jt2-1 cites both.
4. **Count floors owed on consumption** — jt1-3 review ruling: the pictures
   suite floors only `PIXEL_BLOCKS`; `ENTITY_RECORDS` /
   `COLLISION_TABLES` / `PALETTES` floors land with the story that consumes
   those tables. jt2-3 consumes the collision spans (floors land there);
   jt2-7 consumes the enemy/egg entity records (floors land there).
5. **The 80-row `WAVTBL` decode** — open-questions §4 names the full decode
   "mechanical — a good early-story appendix". jt2-5 owns it, ending the
   head/sample/tail gap.

## Design rulings (Architect, this epic)

- **Scheduler = the ruled tagged union, not a memory image.** Process list
  with frame-quantized naps, two scheduling classes as two passes, kill by
  id+mask — mirroring `SYSTEM.SRC`'s semantics. We do **not** model 56-byte
  blocks, `PPC` resume addresses, or the RAM pool; the dossier's layout
  facts stay citations, not code. (Reuse: `@arcade/shared/rng` is already
  the ruled RNG; the per-frame stir mirrors the IRQ's
  `SYSTEM.SRC:581-582`.)
- **Scoring seam: core emits score events; jt4 accumulates.** jt2
  transcribes the values — `DVALUE` 500/750/1500 (`JOUSTRV4.SRC:5563-5577`),
  `EGGVAL` 250/500/750/1000 capped (`JOUSTRV4.SRC:3097-3104`), air-catch
  +500 (`JOUSTRV4.SRC:3065-3069`) — and emits kill/egg events carrying them.
  BCD accumulation (`SCRTEN` backwards trap), extra men, and display are
  jt4's roadmap row. The odd 50-points-for-dying credit
  (`JOUSTRV4.SRC:4730-4732`) is **deferred with its dossier caveat** (verify
  in emulation first — open-questions §4).
- **Text seam: message events, no fonts.** The wave machine emits its
  message beats (wave number, PREPARE TO JOUST); the jt2 shell renders none
  of it — the 5×7/3×5 font transcription is later work (jt4 row). The demo
  bar is gameplay, not captions. `WAVDEL`-area delays are *approximately*
  one second (`JOUSTRV4.SRC:2045`, `JOUSTRV4.SRC:2601` divide by 6) — no
  exact-duration pins.
- **`EMYTIM` is a divider, not a speed scale** (open-questions §4): enemies
  integrate every Nth frame (2 on waves 1-2 — `JOUSTRV4.SRC:2202-2205`),
  else 1. Model it exactly that way.
- **Phantom wave types stay phantom.** `WBJSR` bits promise offsets to 14;
  only 6 types exist, none uses 12/14 (`JOUSTRV4.SRC:187`) — pinned as a
  negative claim, like no-drag/no-terminal-velocity.
- **Wave-type dispatch lands as a skeleton.** jt2-5 builds the 6-entry
  dispatch (`WJSRTB`, `JOUSTRV4.SRC:2586-2591`) with the survival/co-op
  paths live and degrade-by-player-count law transcribed
  (`JOUSTRV4.SRC:2628-2631`, `JOUSTRV4.SRC:2697-2700`); gladiator/egg/ptero
  wave *behaviours* are jt4/jt3 rows. Cliff destruction (high nibble) is
  recorded as data; the bridge burn is jt3's.
- **Baiter seam:** jt2-2 builds the budget (`NSMART`/`WSMART`,
  `JOUSTRV4.SRC:2075-2129`) including its 15-second growth; the baiter
  *spawn schedule* (`BAITBL`) is jt3's roadmap row. The `IFN DEBUG` blocks
  ("NSMART had better be zero" — `JOUSTRV4.SRC:1982-1990` et al.) are free
  oracles for the budget tests.

## Stories

| id | title | pts | blocks on |
|---|---|---|---|
| jt2-1 | Process scheduler core | 2 | — |
| jt2-2 | Enemies: LINET brain, intelligence budget, three smart brains | 5 | jt2-1 |
| jt2-3 | The joust: collision, resolution, bounce-apart, facing+bumps | 3 | jt2-2 |
| jt2-4 | Eggs: full lifecycle | 2 | jt2-3 |
| jt2-5 | Wave machine core + the 80-row WAVTBL decode | 3 | jt2-1 |
| jt2-6 | Transporters + the spawn service | 2 | jt2-1 |
| jt2-7 | Demo: wave 1 vs the buzzards | 2 | all |

19 points vs the roadmap's ~15 estimate. The variance is honest: the
roadmap row predates the dossier's fine grain (three smart brains, not
one; the 80-row decode; the carried-in jt1 obligations). jt1 ran 23
planned → 32 with review follow-ups; budgeting jt2 at 19 with the seeds
*already folded in* is the realistic number, not scope creep.

Sequencing: jt2-1 first (everything mounts on the process list); jt2-5 and
jt2-6 can run any time after it; the combat chain is jt2-2 → jt2-3 → jt2-4;
jt2-7 closes the epic with the demo.

## Spec self-review

Checked: every story cites dossier facts already inside the machine gate
(no new ROM reading required except jt2-5's ruled WAVTBL appendix); all
five jt1 seeds have an owning story; the four seams (scoring, text,
baiters, wave behaviours) each name the epic that owns the other side;
rulings consistent with the clone design spec (process model, RNG, radix
discipline, FILE:LINE citation form per the jt1-8 lesson).
