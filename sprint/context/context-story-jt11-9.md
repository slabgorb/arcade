# Story jt11-9: Arrivals STAND on their transporter pad, and a pad in use turns the next customer away

## Story Details
- **Story ID:** jt11-9
- **Epic:** jt11 (Joust — cabinet experience)
- **Type:** bug
- **Points:** 5
- **Priority:** p2
- **Repos:** arcade (plugins/joust/src/core)
- **Workflow:** tdd
- **Sequencing:** after jt11-4 (which owns the arrival cadence) and not in parallel with jt11-5 (both edit `sim.ts`).

## Problem / Root Cause

jt11-4 filed pad occupancy as a Gap: `GOTTR INC [TCURUSE,X]` marks a transporter in use
(JOUSTRV4.SRC:5710), `DEC [TCURUSE,X]` releases it when the materialisation ends (:5898), the
`GOTR1..GOTR4` fall-through takes the first pad whose flag is clear (:5687-5709), and `BNE CRELP`
(:5709) sends a customer back to nap when all four are busy. This port models none of it.

**Measured before writing this story (seed 0x1234, 1P, `createGame`/`stepGame`, 260 frames):**

| id  | born frame | pad | x at birth | x 20 frames later | `mat.napLeft` at birth |
|-----|-----------|-----|-----------|-------------------|------------------------|
| 256 | 62        | TR3 | 23        | 25 (f82)          | 120                    |
| 257 | 123       | TR4 | 127       | —                 | 120                    |
| 258 | 184       | TR1 | 113       | —                 | 120                    |

Two facts fall out of that, and they set this story's shape:

1. **An arrival never stands still.** It is born on its pad and its brain starts moving it on the
   very next frame (x 23 → 25 → 34 → 63). `MATERIALISE_WINDOW = 120` is a *collision-disabled*
   window (`mat.collisionsEnabled: false`), **not** the ROM's standing period. The machine's is
   `LDA #30 / STA PFRAME` (:5726-5727) — thirty frames during which the process is planted on the
   transporter and the transporter is drawn lit around it (`TREFF`, :5734-5745).
2. **Therefore a pad is occupied for exactly one frame today**, and no queue can ever form.

**This is why implementing `TCURUSE` alone would be wrong.** It would add state that nothing can
observe and nothing can ever gate on — precisely the dead-code condition epic jt11 exists to
remove (the same condition that left `ServiceQueue` implemented, tested and unwired for four
stories). A sweep for a same-pad collision over 400 frames on seeds `0x1234`, `0xbeef`, `0xface`,
`0x63` found **none**, and would find none for any seed, because nobody is ever standing when the
next customer arrives.

**So the standing period is the prerequisite, and it belongs in the same story as the gate it
makes real.** Order inside the story: land the stand first (it is independently observable), then
the occupancy gate on top of it.

## Test Design

### The observables, and why each is honest

The suite must read **positions and served-frames off `stepSim`**, never a new field by name — the
jt11-4 discipline (`demo-jt11-4.test.ts` watches `sim.processes` change frame by frame). A pad's
"in use" state is not directly observable and must not be asserted directly; what is observable is:

- **where a process is** (its entity `posX`/`posY` against `PADS`), and
- **when it was inserted** (the frame it first appears in `sim.processes`).

### AC-1 — an arrival stands on its pad for 30 frames

`LDA #30 / STA PFRAME` (:5726-5727). Its `posX`/`posY` must equal its pad's for 30 consecutive
frames from birth, then change.

- **Test:** step a seeded 1P game; for the first arrival, assert `posX` is pad-constant on frames
  `birth .. birth+29` and has moved by `birth+31`.
- **Non-vacuity control:** the same assertion at `birth+40` must FAIL to hold constant — otherwise
  a bird that never moves at all would pass. Assert it moved.
- **RED today:** x drifts on the frame after birth (23 → 25), so the constancy assertion fails at
  once. This is the measurement in the table above, restated as a guard.

### AC-2 — `PFRAME` is 30, and it is not `MATERIALISE_WINDOW`

Two distinct constants with two distinct jobs. The 120-frame collision window must be left alone.

- **Test:** the stand is 30 frames while `mat.collisionsEnabled` stays false well past it (to 120).
- **Why:** a Dev who "simplifies" by reusing `MATERIALISE_WINDOW` for the stand would quadruple the
  standing period and jam the pads permanently. This test is what stops that.

### AC-3 — a customer never takes a pad someone is standing on

`GOTR1..GOTR4` fall-through, :5687-5709. **Reachable only after AC-1**, which is the point.

- **Fixture (real play, not synthetic):** with a 30-frame stand and jt11-4's 61-frame stagger,
  enemy-to-enemy contention cannot occur (30 < 61 — state this in the test comment so nobody
  "fixes" the gap by shortening the stagger). The reachable contender is a **player respawn**:
  a knight materialises on a pad while the wave's birds are still walking in (a 5-bird wave is
  still arriving at frame 305). Kill P1 mid-arrival, let it respawn, and assert the next served
  bird does not land on the knight's pad.
- **Assertion:** no two processes share pad coordinates on any frame of the window.
- **Control:** with the respawning knight removed, the bird DOES take that pad on some seed —
  otherwise the test is only observing that the seeds happen not to collide.

### AC-4 — when every pad is busy the customer waits, and is not lost

`BNE CRELP` (:5709). Not reachable from ordinary play (four pads, one arrival per 61 frames), so
this one is a **pure-unit test on the selection function**, not a sim fixture — and the suite should
say so rather than dress a synthetic arena up as gameplay.

- **Test:** `freePad(preferred, occupied)` returns `null` when all four ids are occupied, and the
  serve path leaves that enemy in `pendingEnemies` (still alive, still holding its ticket, `LESERV`
  NOT advanced) rather than dropping it.
- **The trap this guards:** an implementation that serves the enemy anyway onto a busy pad, or one
  that drops it from the queue. The ticket must survive.

### AC-5 — determinism and the existing fixtures

The pad each bird prefers is already drawn by `enterViaPads` (jt11-4 leaves that draw in place).
**Keep it as the VRAND draw and fall through only on contention** — do not re-draw at service time.

- **Why this is the design, not a shortcut:** the ROM's `CREALL` does `JSR VRAND` then falls
  through `GOTR1..GOTR4`, so a random *preference* plus a deterministic fall-through IS the machine.
  It also means that in the overwhelmingly common no-contention case not one byte of behaviour
  changes, so the seeded-replay fixtures jt11-4 just migrated stay green.
- **Test:** on a seed with no contention, every arrival lands on exactly the pad it lands on today.

### Rule coverage

| Rule | Test |
|------|------|
| core/shell boundary — no clock, DOM, ambient entropy | `purity.test.ts` (all changes are `src/core/`) |
| no `<file>.ts:<line>` refs in test comments (jt9-30) | `comment-line-refs.test.ts` — cite ROM lines only |
| test-file count anchor | bump `plugins/joust/README.md` 173 → 174 when the file is added |
| ROM citations resolve | `transporter-source.test.ts` oracle groups |

## Acceptance Criteria

1. An arrival stands on its pad for **30 frames** (`PFRAME`, JOUSTRV4.SRC:5726-5727) before its
   brain moves it; the 120-frame `MATERIALISE_WINDOW` collision gate is unchanged.
2. A pad is in use from the moment a process is placed on it (`INC [TCURUSE,X]`, :5710) until its
   stand ends (`DEC [TCURUSE,X]`, :5898).
3. Pad selection keeps `enterViaPads`' draw as the preference and falls through `TR1..TR4` to the
   first free pad (:5687-5709). No two processes ever stand on the same pad.
4. With every pad busy the customer stays pending, keeps its ticket, and `LESERV` does not advance
   (`BNE CRELP`, :5709).
5. Seeded replays with no pad contention are bit-identical to their pre-story behaviour.
6. Core-only and pure; purity guards pass.

## Out of scope

- The lit-transporter render effect (`TREFF`, :5734-5745) — a render story, not this one.
- The player-side serving law (`takePlayerNumber`/`playerTurn`/`servePlayer`/`spawnProceeds`), which
  jt11-4 established is a **separate** ROM path (`CREPLY`) and still has zero production callers.
  That is its own story; do not absorb it here.
