# Joust playability — design spec (enemies hunt, eggs are caught)

2026-07-28. Architect (Vito Cornelius). Brainstormed and approved with the
user this session; this document is the validated design. Ground truth for
every ROM fact: [`docs/rom-study/`](../../rom-study/) and the vendored
`JOUSTRV4.SRC` (red-label RV4 — the behavior target set by the
[clone spec](./2026-07-19-joust-clone-design.md), ruling 2). Line numbers
below are `JOUSTRV4.SRC`.

## Why this exists

The game boots, renders faithfully (P1 ostrich, P2 stork, green buzzard-riders,
eggs), scores, and tracks lives — but it is **not playable**, for two reasons
confirmed this session by code read, a deterministic sim trace, and a live
screenshot:

1. **Enemies do not hunt.** The smart brains (`enemy.ts`, jt2-2) are only ever
   stepped as `stepEnemy(enemy)` at `frame.ts:265` — **the player is never
   passed**, so every "seek the player" branch (`enemy.ts:238`) is dead. Worse,
   an enemy's horizontal `facing` is set once at spawn and never changes, so
   enemies orbit the screen at a fixed altitude. In the trace, the one promoted
   bounder slid right, wrapped `287→13→…→65`, and sank toward the lava while the
   player sat at `x=100` — never once turning toward them.
2. **Eggs cannot be collected.** `collisionPass` (`demo.ts`) makes only
   `player`/`enemy`/`ptero` eligible; there is **no player↔egg pass**. The
   entire egg scoring ladder (`egg.ts`, jt2-4 — `eggScoreEvents`,
   `airCatchBonus`, `bumpEggHits`) is pure, tested, and **never called**. A
   settled egg placed directly on the player yielded score delta 0 after 20
   frames.

Neither is an intentional descope — presentation/sound/ship are the deferred
buckets (jt5/6/7). These are core mechanics that fell between the jt2 stories.

## The core insight — reuse-first

Almost no new *logic* is required. The vertical-seek brains and the full egg
scoring ladder already exist and are ROM-cited. The gaps are **wiring** plus
two additions the earlier epics left cited-only: horizontal homing and target
selection. New code is a liability; this design keeps it to the minimum the ROM
demands.

## Rulings (user, 2026-07-28)

1. **Full pursuit AI**, not minimal wiring — enemies genuinely threatening:
   vertical seek + horizontal homing + cliff look-ahead + shadow-lord tracking.
2. **Full `TARPLY`/`TARTM` targeting**, not a nearest-player shortcut — the
   real aggro subsystem with spawn-grace timers.
3. **pf story workflow** — TDD + ROM citations, session files, PRs to `develop`.
4. Egg collection implemented faithfully to `PLYEGG`/`EGGSCR`.

## Behavior ground truth (cited)

### Target selection — the aggro subsystem (`SELPLY`, :4462)
Global registers `TARPLY` / `TARPL2` (primary/secondary targeted-player
workspaces) with grace timers `TARTM1` / `TARTM2`, reloaded from `TARTIM`:

- **Register on spawn** (`STPLY1/2`, :4655-4665): a new player takes the first
  free slot and its timer is set to `TARTIM`.
- **Grace gate** (`SELPLY`, :4464-4469): a player is targetable only once its
  timer has decremented to **0** — a freshly-materialised knight is protected.
- **Nearest of the targetable** (:4476-4514): when both are targetable, pick the
  closer by combined |ΔX|/|ΔY|.
- **Death shift** (:4746-4753): when the primary target dies, `TARPL2→TARPLY`
  (and `TARTM2→TARTM1`); `TARPL2` cleared.
- **Timer tick** (:4857-4862) each frame; **reset** at wave/game start (:969-970).
- Returns "no target" (Z set, :4519) when nobody is targetable.

### Vertical seek (`BOUNDR`, :3787-3807)
Compare the targeted player's `PPOSY,X` to the enemy's; seek up (`BOUNUP`) or
down (`BODN`) with long/short-range gating. Already modeled by
`smartDecision` (`enemy.ts`) — it only lacks the player.

### Horizontal homing (`BODIR` :3876 / `BOLEVB` :3939-3945)
`dir = PFACE`. `PFACE` is nudged toward the target by **copying the target's
X-velocity direction** (`BOLEV` `LDA PVELX,X`, :3907), *throttled* — "DO NOT
COPY PLAYERS MOVES TOO OFTEN" (:3939) — with a periodic flip, "TRY THE OTHER
DIRECTION" (`COM PFACE,U`, :3945). This is the missing piece that makes an
enemy corner you instead of orbiting.

### Cliff look-ahead (`B2XLEN` = 27+4 = 31, :3969; `B2DIR` :4104-4159)
The hunter (and shadow, `SHXLEN` :4228) projects `B2XLEN` px ahead in its travel
direction, samples the arena solid-mask (`BCKXTB±B2XLEN` ∧ `BCKYTB`), and on a
cliff ahead flips `PFACE` and slows (`B2AV`). The plain bounder lacks this. Our
arena solid-mask is `arena.groundMaskAt` — the direct `BCKXTB`/`BCKYTB` analog.

### Shadow lord (`SHADOW` :4230, `SHDN` :4246, `SHLEP` :4277)
Free-falls on descent (no braking, "NO FLAPING WINGS"), tracks the **player's**
line directly (`SHLEP`), flaps only to escape the lava below `$D3`. The deadliest
brain; already partly in `enemy.ts`'s `shadow` (lava-escape + free-fall), needs
the player-line track + homing.

### Egg catch (`PLYEGG` :3009 → `EGGSCR` :3030)
On player↔egg overlap: ladder score via `EGGVAL` (:3097-3104) —
250/500/750/1000 by hit count, capped — **+500 if caught mid-air**
(`PFEET==0`, :3063-3069), decrement the rider count, **cancel any incoming
remount bird** (`AUTOFF`, :3078-3087), then the egg shows its score and stops
colliding (`PID &= $7F`, :3092-3094). Every value is already in `egg.ts`.

## Architecture

Nothing crosses the `core`/`shell` boundary that doesn't already; all additions
are pure `src/core`. The sim gains one carried field (the aggro state), mirroring
how `IntelBudget` and `BaiterClock` already ride `DemoSim`/`DemoState`.

| # | Piece | Home | Reuses | New |
|---|-------|------|--------|-----|
| 1 | Aggro subsystem | new pure `core/target.ts`, carried on the sim | — | `TARPLY`/`TARPL2`/`TARTM*` state + grace-timer + nearest-targetable pick |
| 2 | Wire target → enemy step | `frame.ts runBehaviour` | `stepEnemy(enemy,{player})`, `smartDecision` | one call-site change (compute this enemy's target, pass it) |
| 3 | Horizontal homing | `enemy.ts` brains | `Decision.dir` / `facing` | `PFACE` nudge: copy target X-vel dir (throttled) + periodic flip |
| 4 | Cliff look-ahead + shadow track | `enemy.ts` (`B2DIR`/`SHDIR`/`SHLEP`) | `arena.groundMaskAt`, existing lava-escape | project 31px, turn+slow at cliff; shadow player-line track |
| 5 | Egg collection | `demo.ts collisionPass` (new player↔egg pass) | **all** of `egg.ts` + the `game.ts` `reason:'egg'` drain | overlap detect, remove egg, cancel remount |

**Data flow.** `stepDemo` advances aggro state (timers tick, slots shift on the
same death `collisionPass` already detects) → each enemy's `runBehaviour` asks
the aggro module for its target `PlayerView | null` → the brain seeks vertically
**and** nudges facing horizontally → a new player↔egg pass in `collisionPass`
emits `{kind:'score', reason:'egg', player}` events → `game.ts`'s existing drain
credits the catching player's BCD ledger. No second stepping path — the jt2-1
one-sim seam holds.

## Epic jt8 — stories

New epic `jt8` (jt5/6/7 reserved for presentation/sound/ship). Egg collection is
independent of the enemy chain; jt8-1→2→3 form a dependency chain.

- **jt8-1 — Target aggro subsystem + wiring.** `core/target.ts` (register on
  spawn, grace-timer tick, nearest-targetable pick, death slot-shift, wave
  reset), threaded on the sim and passed into `stepEnemy` at `frame.ts:265`.
  *Outcome: smart enemies fly to your altitude and respect materialise grace.*
- **jt8-2 — Horizontal homing.** `PFACE` nudge (copy target X-vel dir, throttled
  + periodic flip); `dir` follows the updated facing.
  *Outcome: enemies turn toward and corner you.*
- **jt8-3 — Cliff look-ahead + shadow-lord tracking.** `B2DIR`/`SHDIR` (project
  31px, turn+slow at cliffs) and `SHLEP` player-line tracking.
  *Outcome: hunters/shadows navigate the arena and hunt hardest.*
- **jt8-4 — Egg collection.** Player↔egg catch pass → `eggScoreEvents`
  (250/500/750/1000 + 500 mid-air), remove egg, cancel incoming remount.
  *Outcome: eggs are worth catching. (Ships independently; quickest win.)*

## Testability (routing≠geometry — pin OUTPUT, not routing)

- **jt8-1:** aggro picks the correct target under a crafted 2-player layout;
  a player inside its grace window is NOT targetable; the slot shifts on the
  target's death; wave reset clears both slots. Mutation-checked selection.
- **jt8-2:** facing flips toward a target at the pinned throttle and holds
  otherwise; `dir` tracks facing. Deterministic seed.
- **jt8-3:** look-ahead turns at a cliff coordinate and does NOT turn in open
  air (both cases pinned against `groundMaskAt`); shadow seeks the player line.
- **jt8-4:** a mid-air catch emits `[ladder, 500]`, a grounded catch emits
  `[ladder]`; the egg is removed and an incoming remount is cancelled; the
  catching player's ledger (not the partner's) advances.

## Out of scope

- **1P mode.** The shell always spawns both P1 and P2 (both keyboard-mapped);
  with full `TARPLY`, enemies split aggro onto an idle P2. A real 1P mode is a
  shell/menu concern — leave it to the presentation epic (jt5).
- Byte-exact `TARTIM` grace duration and `BODNRG`/`BOUPRG` range constants are
  transcription details for the stories to cite, not design decisions.

## Spec self-review

- **Placeholders:** none.
- **Consistency:** the component table, data flow, and story list all describe
  the same five pieces; egg collection is consistently independent.
- **Scope:** one epic, four TDD stories; each is a single focused slice with an
  existing pure core to reuse. jt8-1/2/3 chain; jt8-4 parallel.
- **Ambiguity:** target selection resolved to full `TARPLY`/`TARTM` (ruling 2);
  targeting picks the nearest *targetable* (grace-gated) player.
