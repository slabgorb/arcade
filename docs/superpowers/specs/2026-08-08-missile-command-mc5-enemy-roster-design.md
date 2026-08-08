# Missile Command — mc5, the full enemy roster (REV-01) — Architect design

2026-08-08. Detailed epic design for **mc5**, executing the roadmap slice at
`docs/superpowers/specs/2026-08-07-missile-command-full-cabinet-roadmap.md:111`
under the one-design-per-epic rule. Ground truth for every ROM fact is the
vendored **REV-01** tree (`plugins/missile-command/reference/source/`) and the
machine-gated dossier (`plugins/missile-command/docs/rom-study/`); this design
*cites* that source, it does not re-derive the dossier. Citation form is
`FILE.MAC:LINE` against the physical file (W3MAIN is CRLF + has stray binary
bytes → read a `tr -d '\r'` copy with `grep -a`; the line numbers match). RADIX:
W3MAIN/W3COMN inherit `.RADIX 16`, so **bare literals are HEX**, a trailing `.`
is DECIMAL, and score arithmetic runs under `SED` (BCD). Every value below is
decoded with its radix noted.

## Where mc5 mounts

mc5 depends on **mc3** (done — the core combat loop: ICBM spawn/flight, damage
both directions, ammo, score, play→over) and **mc4** (the per-wave difficulty
schedule; 5 of 6 stories done, mc4-4 stepGame wiring in review). The roadmap put
mc5 *after* mc4 deliberately: the new enemies are **spawned by the wave-difficulty
schedule**, so `wave.ts` is their natural home and `game.ts`'s seven-step
`stepGame` is the composition root they grow. mc5 is the last epic that adds
enemy *behaviour*; mc6/mc7 are shell states, mc8 audio, mc9 render.

The fidelity contract from the roadmap (§"Fidelity contract") binds every mc5
story unchanged: REV-01 ground truth, every new `src/core` constant carries a
claim gated by `citations.test.ts`, the core/shell boundary holds
(`purity.test.ts` — pure enemy logic in `src/core`, all pixels in `src/shell`),
the RNG is seeded state never ambient entropy, and any REV-01↔REV-03 divergence
is catalogued, never silently picked.

## Ground-truth findings that shaped this design

Extracted from `W3MAIN.MAC`/`W3COMN.MAC` (REV-01). Three findings drove the scope
and the story order:

### 1. The four "enemies" are three, and they enter in a fixed wave order

Sorting by the wave each enemy first becomes active in REV-01:

| Order | Enemy | First wave | Gate (cited) |
|---|---|---|---|
| 1 | **MIRV** | 1 | `MIRVWV=1` (`W3COMN.MAC:205`); split armed when a live ICBM's height is in band `[MIRVLO, MIRVHI]` |
| 2 | **Sputnik / bomber** | 2 | `SPUTWV=2` (`W3COMN.MAC:203`, ";# OF WAVE WITH 1ST SPUTNIK") |
| 3 | **Cruise missile** | 6 | `CRMWAV` per-wave budget table (`W3MAIN.MAC:5723`) first nonzero at wave 6 |
| — | **Smart bomb** | never | **absent from REV-01** (see §2) |

`CRMWAV: .BYTE 0,0,0,0,0,1,1,2,3,4,4,5,5,6,6,7,7,7,7` (`W3MAIN.MAC:5723`, hex —
all single-digit so hex==decimal). Read at NEWWV1 by `LDX AY,CRMWAV-1 / STX
CRMTOL` (`W3MAIN.MAC:3943-3945`); the `-1` offset makes the effective index
`WAVENO-1`, so the first nonzero cruise budget is at **wave 6**.

The user chose **ROM-faithful order** over unblock-mc8-5-first, so the stories run
**MIRV → Sputnik → Cruise**.

### 2. Smart bombs do not exist in REV-01 (scope correction)

The roadmap's mc5 row lists "smart bombs that dodge blasts." An exhaustive search
of the 035820-01 tree for `SMART/KILLER/DODGE/EVADE/AVOID` found **no
blast-dodging enemy** — the only `SMART` is `.SBTTL SMART CURSOR MOVER (ATTRACT)`
(`W3MAIN.MAC:891`), the attract-mode demo cursor, unrelated. The dodging smart
bomb is a later-revision (REV-02/03) addition and cannot cite our vendored source.

**Ruling (user, 2026-08-08):** drop smart bombs from mc5 and **file a REV-03
follow-up** blocked on vendoring the REV-03 source; correct the roadmap row. mc5
ships three REV-01 enemies, 100% cited. See §"Smart bombs → REV-03 follow-up".

### 3. `CRMONS` is cruise-only — the mc8-5 drone needs two signals

mc8-5's brief calls the drone trigger a "cruise/Sputnik on-screen count," but in
REV-01 `CRMONS` (`W3MAIN.MAC:271`, ";# OF CMS ON SCREEN") counts **cruise missiles
only**. Sputnik presence is a separate condition — `PLCPV ≠ 0` ("PLANE ACTIVE?",
`W3MAIN.MAC:5771`); there is no sputnik on-screen *counter* (`STSNON`/`STSNOF` are
the sputnik sound on/off routines, not counts). Yet the drone voice already
models `sputnik`/`cruise`/`both` (`src/core/drone.ts`, MRBILL bits). So mc5 must
expose **two** signals — a cruise-on-screen count and a sputnik-active flag — and
a selector that maps their combination to the `DroneKind` the drone consumes. This
becomes the mc5↔mc8-5 contract (§"The mc8-5 drone contract").

## Architecture — model by the ROM's entity boundary

The roadmap reserved a single `raider.ts` for all of it. The ground truth shows
the enemies split two ways, and the design follows that split rather than a
uniform blob — each unit stays single-purpose and independently testable (and each
new `src/core` file is scanned by `purity.test.ts` and `citations.test.ts`):

- **Cruise & MIRV are ICBM-family.** In the ROM a cruise missile is an ICBM slot
  flagged in the `ICBTYP` bitmask (`W3MAIN.MAC:2653`); a MIRV is an ordinary ICBM
  that *spawns more ordinary ICBMs* (`MIRVER`, `W3MAIN.MAC:2685`). Neither is a
  new entity array. → Extend the existing `Icbm` with a `kind: 'ballistic' |
  'cruise'` discriminant (backward-compatible, exactly like the existing optional
  `velocity?`); model MIRV as a pure *split function*, not a type.
- **Sputnik is a distinct entity.** A "plane" (`PLCPH`/`PLCPV`) that flies
  horizontally across the screen, comes in bomber/satellite variants
  (`SOBJID`, `W3MAIN.MAC:5793`), periodically fires ICBMs downward
  (`W3MAIN.MAC:2433`), and is killed for 4× the ICBM value (`W3MAIN.MAC:2071`).
  It is not an ICBM → its own module and its own `GameState` array.

**Rejected alternative — one uniform `raider.ts`:** it mixes an ICBM-family type
flag with a distinct fly-across flyer and produces one file doing three unrelated
jobs, fighting both the ROM's own structure and the core/shell testability the
epic depends on.

### New / changed core modules

- **`icbm.ts` (changed)** — `Icbm` gains `kind: 'ballistic' | 'cruise'` (optional,
  defaulting to `'ballistic'` so every existing literal and claim is unchanged). A
  cruise ICBM flies an **angle-driven** path (`ANGLE`→`CMANGL 0–13`,
  `W3MAIN.MAC:6421`), distinct from `stepIcbm`'s straight-line-to-target; the
  cruise step is a sibling function in `icbm.ts` selected on `kind`.
- **`mirv.ts` (new)** — a pure predicate + spawner: an in-flight *ballistic* ICBM
  whose head height is in `[MIRVLO, MIRVHI]` is eligible; the split emits ≤3 child
  ballistic ICBMs from the parent's current position, each re-targeted. Suppressed
  in attract and when ≥12 explosions are live.
- **`sputnik.ts` (new)** — the fly-across plane: horizontal flight, bomber/satellite
  variant, the periodic-fire cadence, and the kill/score. Exposes an `active`
  predicate (the drone's sputnik signal).
- **`spawn.ts` (changed)** — the per-wave cruise budget (`CRMWAV`→`CRMTOL`) and the
  sputnik activation timing (`WSPFIR`/`WSPLAU`, first wave `SPUTWV`) join the
  existing ICBM budget. Still pure, still seeded-RNG-only.
- **`score.ts` (changed)** — the ×4 (sputnik) and ×5 (cruise) multiples of the base
  ICBM value; MIRV children reuse the ×1 ICBM value. The base value and the
  `SMULTI` wave multiplier already exist.
- **`game.ts` (changed)** — `GameState` gains `sputniks: readonly Sputnik[]`, a
  cruise/sputnik-derived drone signal, and the cruise `kind` on its ICBMs;
  `stepGame`'s seven-step order gains a "step sputniks (fly + maybe fire) and split
  eligible MIRVs" beat inside the existing spawn/fly stages. No new step is bolted
  on the end — the enemies live inside the current frame order.

### Shell (functional only; authentic render is mc9)

Each story adds *functional* render so its enemy is visible and hand-verifiable
(the mc3 precedent — functional colours/shapes, pixel-authentic stamps deferred to
mc9): a cruise missile's angled trail, a sputnik/bomber sprite crossing the top
band, MIRV children forking. No new audio wiring is in mc5 — the drone lives in
mc8; mc5 only *produces the signal* mc8-5 consumes.

## Stories — ROM-faithful order

Sliced by enemy and by file surface (grouping edits to the same module into one
story, per the review-as-generator grooming rule). Point estimates are the
Architect's sketch; grooming refines them.

### mc5-1 — MIRV split *(wave 1)*

An in-flight **ballistic** ICBM whose head height enters the band
`[MIRVLO=0x80=128, MIRVHI=0xA0=160]` (`W3COMN.MAC:159/161`, hex) becomes the MIRV
candidate (`MIRVIX`, re-armed in `ICPOSI` at `W3MAIN.MAC:1561-1575`). When the
wave gate passes (`WAVENO ≥ MIRVWV=1`, i.e. every wave, `W3MAIN.MAC:2555-2557`)
and a candidate exists, `MIRVER` (`W3MAIN.MAC:2685`) splits it into **≤3** child
ballistic ICBMs (`POTENT` capped at 2 → "NO MORE THAN 3 SHOTS FROM A MIRV",
`W3MAIN.MAC:2695-2700`), each launched from the parent's current position and
re-targeted at a live structure. The split is **suppressed** in attract mode and
when `EXPLCT ≥ 12.` explosions are on screen (`W3MAIN.MAC:1533-1537`, decimal 12).
Children are ordinary ICBMs and score ×1 (`ICKILL`, `W3MAIN.MAC:2085`).

- **New:** `mirv.ts` (eligibility predicate over height band; pure split spawner).
- **Changed:** `game.ts` (invoke the split inside the fly/spawn beat, threading the
  seeded RNG for child targeting and the live explosion count for suppression).
- **Claims:** `MC-MIRVWV` (1), `MC-MIRVLO` (128), `MC-MIRVHI` (160), `MC-MIRV-MAX`
  (3 children), `MC-MIRV-EXPSUP` (12 explosions).
- **Not:** no new entity, no new flight model, no render entity (children render as
  ICBMs) — the smallest of the three, a clean epic opener.

### mc5-2 — Sputnik / bomber fly-across launcher *(wave 2)*

A new `sputnik.ts` entity. When the plane slot is free, `WAVENO ≥ SPUTWV=2`
(`W3COMN.MAC:203`; gate `W3MAIN.MAC:5777`) and the activation timer permits, a
plane activates: random left/right edge + direction, a `SOBJID = rand AND 1` pick
of **bomber vs satellite** (`W3MAIN.MAC:5793`), and a random vertical band around
`VPLMIN=0x64=100` (decimal). It flies horizontally across the field
(`PLAVEL`/`PLCPH`), and once it has travelled far enough (`HORFIR ≥ SPUTDS`) and is
in bounds it **fires ICBMs downward** (`SPUTFIR`, `W3MAIN.MAC:2433`): launch count
`= min(MXICON − 2·CRMONS − ICBONS − 1, 4, ICBTOL, POTENT)` (`W3MAIN.MAC:2455-2479`;
`MXICON=7`, `W3COMN.MAC:193`). Fire cadence and activation separation ramp by wave
from `WSPFIR` (`.BYTE 80,60,40,30,20,20,10` → decimal 128,96,64,48,32,32,16,
`W3MAIN.MAC:5725`) and `WSPLAU` (`.BYTE 0F0,0A0,080,80,60,40,20` → decimal
240,160,128,128,96,64,32, `W3MAIN.MAC:5729`), both indexed from `SPUTWV` and
clamped to the table end (waves ≥8 reuse the fastest row, `W3MAIN.MAC:4125-4137`).
A sputnik is killed for **×4** the ICBM value (`SPUTKI LDX I,3` ";4X ICBM",
`W3MAIN.MAC:2071-2079`).

- **New:** `sputnik.ts` (activation, horizontal flight, variant, periodic ICBM
  fire, kill/score, an `active` predicate).
- **Changed:** `game.ts` (`GameState.sputniks`; step planes and fold their fired
  ICBMs into the existing ICBM array within the frame order); `spawn.ts` (sputnik
  activation timing); `score.ts` (×4). Functional render: a plane sprite crossing
  the top band + its variant.
- **Produces:** the `sputnikActive` drone signal (`= sputniks.length > 0`, the
  `PLCPV ≠ 0` analogue).
- **Claims:** `MC-SPUTWV` (2), `MC-VPLMIN` (100), `MC-SPUT-SCORE` (×4), `MC-WSPFIR-*`,
  `MC-WSPLAU-*`, `MC-SPUT-FIREMAX` (4), and the launch-count formula note.
- **Heaviest story** (new entity + firing + two timing tables) — may split at
  grooming into (a) the entity + flight + kill and (b) the periodic-fire cadence.

### mc5-3 — Cruise missiles + the mc8-5 drone contract *(wave 6)*

A cruise missile is an `Icbm` with `kind: 'cruise'`. The per-wave budget is
`CRMWAV` (`W3MAIN.MAC:5723`, → `CRMTOL`), first nonzero at **wave 6**. `CMLAUN`
(`W3MAIN.MAC:2635`) launches it like an ICBM then flags it cruise (`ICBTYP` bit,
`INC CRMONS`, `DEC CRMTOL`). It flies an **angle-driven** path: `ANGLE`
(`W3MAIN.MAC:6421`) computes `CMANGL` 0–13 from the geometry (a `SLOPEH/SLOPEL`
lookup mirrored by sign), and `ICPOSI` steps cruise slots via `CMNEWP` instead of
the straight `UPDPOS` (`W3MAIN.MAC:1583-1585`). A cruise kill scores **×5**
(`CMKILL LDX I,4` ";5X ICBM", `W3MAIN.MAC:2107-2113`). `CRMONS` — recomputed each
ICBM-update tick (`W3MAIN.MAC:1481` reset, `:1635` per-slot `INC`), adjusted at
launch/kill — is the cruise-on-screen count.

**The mc8-5 contract lands here.** mc5-3 exposes both drone signals and a pure
selector:

```
droneRequest(state): DroneKind | null
  // cruiseOnScreen = state.icbms.filter(kind==='cruise').length   (CRMONS)
  // sputnikActive  = state.sputniks.length > 0                    (PLCPV≠0)
  // both present → 'both'; cruise only → 'cruise'; sputnik only → 'sputnik';
  // neither → null (drone silent)
```

`DroneKind` is the exact type `src/core/drone.ts` already declares. mc8-5 becomes a
pure consumer: read `droneRequest(state)`, start/stop the drone lifecycle, feed
`droneSweep`. No sputnik/cruise counting lives in mc8.

- **Changed:** `icbm.ts` (`kind` + cruise angled flight), `spawn.ts` (`CRMWAV`
  budget), `score.ts` (×5), `game.ts` (cruise kind + `droneRequest`). Functional
  render: an angled cruise trail.
- **Claims:** `MC-CRMWAV-*` (the 19-entry budget table), `MC-CRUISE-SCORE` (×5),
  `MC-CMANGL` (angle range 0–13), and the `SLOPEH/SLOPEL` table note.
- **Unblocks mc8-5** the moment it lands.

> **No separate drone-signal story.** The signals are produced incrementally —
> `sputnikActive` by mc5-2, `cruiseOnScreen` + the selector by mc5-3 — and folding
> the selector into its only consumer's data (mc5-3) avoids shipping a latent
> prerequisite alone (the grooming rule). mc8-5 depends on **mc5-3**, not on a
> fourth mc5 story.

### mc5-4 — Smart bomb *(filed, blocked — not worked in mc5)*

The blast-dodging smart bomb is a REV-02/03 enemy absent from our vendored REV-01
source (§2). Filed as a story **blocked on vendoring the REV-03 Missile Command
source** (`just vendor-source <org/repo>`, then a `rom-source-study` of the dodge
routine). It cannot enter the sprint until that source exists — a bare "out of
scope" note would violate the descoped-findings-must-be-filed rule, so it is a real
tracked id from epic creation, in `status: blocked` with its blocker recorded.

## Smart bombs → REV-03 follow-up + roadmap correction

Two bookkeeping actions accompany this epic (both in the plan):

1. **File mc5-4** (above) at epic materialization — `blocked`, blocker = "REV-03
   source not vendored; smart bomb / blast-dodge logic is not in the 035820-01
   REV-01 tree."
2. **Amend the roadmap** (`2026-08-07-missile-command-full-cabinet-roadmap.md:111`):
   the mc5 "Delivers" cell drops "smart bombs that dodge blasts" and adds a note —
   "smart bombs are REV-02/03 only; deferred to mc5-4, blocked on vendoring REV-03
   (2026-08-08 mc5 design §2)." The `SPUTNIK KILL` anchor stays; the smart-bomb
   anchor had none.

## The mc8-5 drone contract (summary for the mc8 epic)

After mc5-3, `game.ts` exposes:

- `state.icbms` carrying `kind: 'ballistic' | 'cruise'` — cruise count = `CRMONS`.
- `state.sputniks` — non-empty = sputnik active (`PLCPV ≠ 0`).
- `droneRequest(state): DroneKind | null` — the presence→kind selector.

mc8-5 reads `droneRequest` each frame: a non-null result that differs from the
running drone's kind restarts the drone lifecycle at the new kind; `null` stops it.
`droneSweep(frame, kind)` (already shipped by mc8-4) renders the pitch. This
resolves the "cruise/Sputnik count" imprecision in mc8-5's title — the trigger is
two signals, not one count.

## Testability notes for TEA

- `mirv.ts`, `sputnik.ts`, and the cruise flight in `icbm.ts` are pure, seeded, and
  unit-testable exactly like `icbm.ts`/`damage.ts`: deterministic step functions
  over plain data. A fixed `createGame(seed)` replays every enemy frame-by-frame —
  the whole roster is replayable, which is the mc5 integration test's backbone.
- **Boundary-rich spots to pin, not just sample:** MIRV eligibility is a *band* —
  test one tick above `MIRVHI`, inside, and one tick below `MIRVLO`; test the
  ≥12-explosion suppression at 11/12/13. The `CRMWAV` first-nonzero edge is
  wave 5 vs 6. Sputnik fire is gated on `HORFIR ≥ SPUTDS` — test one tick before
  and at the threshold. The launch-count formula clamps at four independent bounds
  (`MXICON−2·CRMONS−ICBONS−1`, 4, `ICBTOL`, `POTENT`) — drive each bound.
- **`droneRequest` truth table** is four cases (neither/cruise/sputnik/both) — pin
  all four; a vacuous "returns a DroneKind" assertion misses the `null` and the
  `both` merge.
- The wave-gating tables (`CRMWAV`, `WSPFIR`, `WSPLAU`) clamp past their end — test
  a wave beyond the table (≥19 for `CRMWAV`, ≥8 for the sputnik tables) reuses the
  last row, mirroring `wave.ts`'s existing clamp tests.

## Open questions

- **O-3 (REV-01 vs REV-03):** the enemy roster is a second place the revisions
  diverge (difficulty tuning was the first, in mc4). mc5 ships REV-01; the smart
  bomb (§2) is the sharpest delta and is deferred to mc5-4 with the REV-03 source
  as its blocker. Any per-wave table that REV-03 retunes is catalogued in that
  story's claim note when the REV-03 source is vendored.
- **Cruise angle fidelity:** `ANGLE`/`CMANGL` maps geometry to one of 14 discrete
  directions via `SLOPEH/SLOPEL`. mc5-3 ports the discrete-angle behaviour and
  cites the table; whether the functional render interpolates or snaps to 14
  directions is a render concern that hands cleanly to mc9.
- **Bomber vs satellite distinction:** `SOBJID` picks the variant; REV-01 differs
  them by sprite/behaviour detail. mc5-2 models the variant flag and its cited
  effect; any purely visual difference defers to mc9.
