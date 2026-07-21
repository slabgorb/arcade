# Joust epic jt3 — "The Menagerie" — epic design

2026-07-21. Architect design executing the user-approved roadmap slice
(`joust/docs/superpowers/specs/2026-07-19-joust-clone-design.md`, roadmap row
jt3: "pterodactyl (+patches), lava troll, bridge destruction, baiters,
difficulty ramp — demo: the full ecosystem hunts you"). Ground truth for every
ROM fact: `joust/docs/rom-study/` (machine-gated by the citations suite) — this
design cites the dossier, it does not re-derive it. Citation form is
fully-qualified `FILE:LINE` throughout (the jt1-8 lesson: never bare `:N`).

## What jt2 delivered, what jt3 mounts on

jt2 shipped the ROM-shaped **process list** (tagged-union scheduler, frame naps,
two classes, kill-by-id+mask), the shared `LINET` enemy brain, the
**`NSMART`/`WSMART` intelligence budget with its 15-second growth**, the joust
resolution (`facing`, `PBUMPX`/`PBUMPY` bumps), the full egg lifecycle, the
**wave machine core** (90-row `WAVTBL` decode, the 6-entry `WJSRTB` dispatch
skeleton with survival/co-op live, high-nibble cliff destruction *recorded as
data*), and transporters. jt1-4 already **reserved the `LNDB7` troll-grip
landing dispatch** (the seventh outcome, `TTROLL`-gated) and hooked `TBRIDGE`.

jt3 is where the ecosystem's predators — the pterodactyl, its baiter variant,
and the lava troll — and the arena's mid-game destruction and the difficulty
engine all go live. It mounts entirely on jt2's process list and combat seam;
it reads no new subsystem, only the menagerie rows of the same dossier.

## User rulings (2026-07-21, all binding)

- **(A) Difficulty centralizes.** The `DYTBL` 28-row walk (`IWAVE`,
  `JOUSTRV4.SRC:1890-1926`) + the `GA1` starting column
  (`JOUSTRV4.SRC:930-939`) become **the** per-wave difficulty source. jt2's
  story-local stubs — the `EMYTIM` divider (`JOUSTRV4.SRC:2202-2205`), the
  lava-level step (`JOUSTRV4.SRC:1929-1933`), and the `NSMART`/`WSMART` budget
  seed (`JOUSTRV4.SRC:2075-2129`) — **re-point** to it. jt2's seeded
  determinism replays must survive **bit-for-bit**: the retrofit changes where
  these values come from, not any given wave's realized value (the jt2-1
  migration bar).
- **(B) Ptero death decoded now.** The `ASH1R/L` third image format
  (`JOUSTI.SRC:2778-2781`; open-questions §5, "value/run pairs?") is **traced
  and decoded byte-gated**, not deferred to a placeholder poof.
- **(C) Scoring seam continues.** Transcribe the `DVALUE`/escape values, emit
  score **events**, and carry each *verify-in-emulation* caveat forward to jt4
  (where BCD accumulation lands): ptero = 1000 is **derived** via `SCRHUN`
  (`JOUSTRV4.SRC:5563-5577`); troll-escape = 50 (`JOUSTRV4.SRC:6666-6670`); the
  50-for-dying credit (`JOUSTRV4.SRC:4730-4732`) was already deferred by jt2.
  **No emulation gating in jt3.**

## Design rulings (Architect, this epic)

- **RV4 is the behaviour target** (the whole-game 2026-07-19 ruling, applied
  here). The baiter-gated ptero-farming patch block
  (`JOUSTRV4.SRC:6296-6360`, header `JOUSTRV4.SRC:6268`) and the troll
  30-second-grace / escalating-pull patches (`JOUSTRV4.SRC:6374-6396`) are the
  red-label behaviour; each preserves its displaced instruction as a `********`
  comment, so a "classic green" mode stays recoverable later.
- **Wave-type dispatch: the pterodactyl wave goes live; gladiator/egg
  behaviours stay jt4.** jt2-5 landed the 6-entry `WJSRTB` skeleton
  (`JOUSTRV4.SRC:2586-2591`) with survival/co-op live; jt3-4 makes the
  pterodactyl entry spawn pteros. The gladiator and egg wave *behaviours*
  remain jt4's roadmap row.
- **Bridge/cliff destruction becomes behaviour.** jt2-5's high-nibble data
  (`JOUSTRV4.SRC:185-192`) drives arena mutation; the arena that jt1-5 froze is
  mutated *through a wave event*, not by unfreezing exports.
- **Text seam unchanged.** Menagerie message beats are events; the shell
  renders none of them — fonts are jt4.
- **The `IFN DEBUG` invariants** (`JOUSTRV4.SRC:1982-1990`, `2953-2959`,
  `2966-2970`, `3765-3770`) stay free oracles for the wave/budget bookkeeping.

## Seeds carried in from the jt1/jt2 archives (all binding)

1. **`LNDB7` troll-grip dispatch reserved** (jt1-4, the seventh landing
   outcome, `TTROLL`-gated) — jt3-3 makes it reachable and exercises it.
2. **High-nibble cliff destruction is data, not behaviour** (jt2-5,
   `JOUSTRV4.SRC:185-192`) — jt3-2 animates it.
3. **The `BAITBL` spawn schedule is owed** — jt2-2 built the budget and its
   15s growth; jt3-5 lands the schedule and closes the baiter seam.
4. **P2 stork-mount POSOFF gap** (jt2-9 HIGH, still open: `SFLY1R`/`SRUN*R`/
   `SRUNSR` lack `ENTITY_RECORDS` entries → clipped feet; ROM POSOFFs at
   `JOUSTI.SRC:782-796`) — jt3-7 consumes new records and **must enumerate both
   mounts plus the new ptero/troll frames** or they silently no-lift.
5. **Count floors owed on consumption** (jt1-3 review) — the `ENTITY_RECORDS`
   floor lands with jt3-7, the story that consumes the new frames.

## Stories

| id | title | pts | blocks on |
|---|---|---|---|
| jt3-1 | Difficulty ramp — `DYTBL` 28-row decode, `IWAVE` walk + plateau, `GA1` column, retrofit jt2 stubs | 3 | jt2-5 |
| jt3-2 | Bridge + cliff destruction — `TBRIDGE` wave-3 burn, high-nibble mutation as behaviour, second-variant trace | 2 | jt3-1 |
| jt3-3 | Lava troll — `PADGRA→ADDLAV` grip, break-free VY, RV4 grace/escalating-pull cap, `LNDB7` dispatch, escape-50 event | 3 | jt3-2 |
| jt3-4 | Pterodactyl — gravity-exempt `FLYXP`, lance-height kill window, facing gate, ptero wave type live | 3 | jt2-3, jt3-1 |
| jt3-5 | Baiters + RV4 patches — `BAITBL` schedule (V4 15s→1s), max-3 `PCHASE=−1`, the 6 PCHASE-gated patches | 3 | jt3-4 |
| jt3-6 | Ptero death dissolve — decode the `ASH1R/L` third format byte-gated, wire death→dissolve+event | 2 | jt3-4 |
| jt3-7 | Demo — "the full ecosystem hunts you": render ptero/baiters/troll/bridge-burn, playable late-wave slice | 2 | all |

**18 points across 7 stories** vs the roadmap's ~13 estimate. The variance is
honest and mostly the two user rulings: the `ASH1R/L` decode (~+2, ruling B)
and the `DYTBL` centralize-and-retrofit (~+1 over the minimal add-only path,
ruling A); the remainder is the dossier's fine grain (the troll escalation
patch block, the baiter-gated ptero-farming patch block, the cliff
second-variant trace). jt2 ran the same shape — 19 delivered vs 15 estimated —
so budgeting jt3 at 18 with the seeds *already folded in* is the realistic
number, not scope creep.

**Sequencing.** jt3-1 first (the difficulty foundation + the jt2 retrofit —
everything wave-varying reads from it). The arena-hazard chain is
jt3-2 → jt3-3 (the troll spawns only after the bridge has burned:
`TTROLL = TBRIDGE + 1`). The predator chain is jt3-4 → {jt3-5, jt3-6} (baiters
are pteros with `PCHASE=−1`; the dissolve decodes the ptero's death frames).
jt3-7 closes the epic with the demo and pays the P2-stork POSOFF debt.

## Story slicing notes

- **Why baiters and the RV4 patches are one story (jt3-5).** The six anti-farming
  patches gate on `PCHASE` (`JOUSTRV4.SRC:6296-6360`), and baiters are exactly
  the `PCHASE=−1` pteros — so the patches modify *baiter* behaviour, not the
  plain wave-type ptero jt3-4 ships. Bundling them keeps the gate provable in
  one place (patches change baiters, do not change the wave-type ptero) rather
  than splitting a single behavioural fact across two stories.
- **Why the dissolve is its own story (jt3-6).** The `ASH1R/L` decode is a
  self-contained, byte-gated transcription with real risk (an unknown format);
  isolating it means a red decode cannot block the ptero *behaviour* work in
  jt3-4, and the contingency (poof + recorded blocker if the format proves
  underivable from the text) is contained.

## Spec self-review

Checked: every story cites dossier facts already inside the machine gate (the
only new ROM *reading* is jt3-1's ruled `DYTBL` appendix and jt3-6's ruled
`ASH1R/L` trace — both user-approved); all five carried seeds have an owning
story; the three seams named for jt4 (scoring accumulation, gladiator/egg wave
behaviours, fonts/text) each state the other side; the three user rulings are
reflected in the owning stories (A→jt3-1, B→jt3-6, C→jt3-3/jt3-4); rulings
consistent with the clone design spec (process model, RNG, radix discipline,
RV4 target with `********` provenance). No placeholders; points variance
explained; sequencing acyclic.
