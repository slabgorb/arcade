# Story Context: sw8-27

> **DO NOT REGENERATE.** This file is hand-authored by SM with measured facts and a user
> ruling. `pf context create` / `sm-setup` would overwrite it with the raw epic description
> and filler. If a tool offers to regenerate it, decline.

**Story:** The player's GUN carries the same visibility divergence C_PS just lost — the clone can kill a TIE it never drew (sw8-19 TEA + Dev finding) — PLUS the ROM's hit/sights SHAPES (user ruling at setup; box∩1.5x octagon, L1 sights diamond)

**Points:** 5 (re-estimated from 3 at setup — see the corrections below)
**Workflow:** tdd · **Epic:** sw8 · **Repo:** arcade

---

## Problem

The clone can kill a TIE it never drew. sw8-19 gated the C_PS *sights bit* on C_PV because the
cabinet's sole `CHSET C$PS` is unreachable unless the object was drawn. The cabinet's LASER-HIT
block sits under the *same* four exits — so the same gate belongs on the gun, and our port does
not have it.

> ⚠ **CORRECTIONS to the filing, measured at setup 2026-08-03.** The epic description now carries
> these too, in an appended block. Four items; the ACs are the authority.
>
> 1. **"the SPACE-arm CALL SITE" is singular and there are TWO.** `sim.ts:546` (TIEs) and
>    `sim.ts:554` (enemy fireballs). The cabinet gates both. **USER RULING: do both.** (AC2)
> 2. **The OPEN QUESTION is answered, and the user ruled the FIX in.** The L1/L2 shapes do
>    disagree; the numbers are in AC7. Points 3 → 5. (AC5/AC6/AC7)
> 3. **"closing this story means deliberately retiring that assertion" is FALSE.** The
>    `does NOT change the GUN` test calls `beamHit` DIRECTLY and stays green under the
>    caller-side gate. **Do not retire it.** (AC4)
> 4. **"box AND octagon at 1.5x" compresses two thresholds.** The box is 1.0× TMPSIZ; only the
>    octagon is 1.5×. (AC5)

---

## Background — what was measured, so nobody re-derives it

### The ROM, verified line-exact (vendored source does not rot; spend the budget in-repo)

| Claim | Where | Verdict |
|---|---|---|
| `RTS1: RTS` | `WSMAIN.MAC:3754` | ✓ |
| `S2VW:` | `WSMAIN.MAC:3755` | ✓ |
| Four exits before `CHSET C$PV` | `:3825-3826` (near, `CMPD #10`/`LBLE`), `:3827-3828` (far, `CMPD #7F00`/`LBHI`), `:3834-3836`, `:3840-3842` (ratio, `LBHS`) | ✓ all four, all to `RTS1` |
| `CHSET C$PV` | `:3846` | ✓ |
| Laser-hit block under those exits | `:3898-3918` | ✓ — **no label at all** between `:3846` and `:3898`; the three `JSR`s (`IS2UV` `:3871`, `OBJCEN` `:3873`, `MGOWT` `:3879`) return to the next line and cannot gate |
| `CHSET C$PS` | `:3930` | ✓ |
| Sights = pure L1, no box | `:3920-3924` | ✓ `3*TMPSIZ >= TMPOCT` |
| Kill = box AND octagon | `:3898-3908` | ✓ **but box is 1.0×**, octagon 1.5× |

**NEW — the fireball path, which the filing does not mention.** `VWGUN::` (`WSGUNS.MAC:852`) has
the identical four-exit shape before its `;GUN SHOT IS VISIBLE` marker at `:904`:

| Exit | Lines | Test |
|---|---|---|
| near | `:884-885` | `CMPD #01` / `LBLE 90$` |
| far | `:886-887` | `CMPD #7F00` / `LBHI 90$` |
| ratio Y | `:895-896` | `SUBD M.XP` / `LBHS 90$` |
| ratio Z | `:902-903` | `SUBD M.XP` / `LBHS 90$` |

<!-- Each exit is a two-instruction PAIR and the span must name both lines: the compare and the
     long branch that acts on it. These four read `:885`, `:887`, `:896` and `:903` until the
     sw8-27 finish — one line each, naming only the BRANCH while quoting both instructions, so
     every row attributed a `CMPD`/`SUBD` to the line below it. Verified against
     `reference/atari-source/star-wars-1983/WSGUNS.MAC` at finish: :884 `CMPD #01`, :885
     `LBLE 90$`, :886 `CMPD #7F00`, :887 `LBHI 90$`, :895 `SUBD M.XP`, :896 `LBHS 90$`, :902
     `SUBD M.XP`, :903 `LBHS 90$`, :904 `;GUN SHOT IS VISIBLE`. These are BARE `:N` refs, which
     the citation guard does not watch — it matches only `file.ts:N` — which is why the error
     survived six review rounds untouched. Sweep both spellings when re-anchoring. -->



The hit-record that writes `CL.GDS` / `CL.GP` is `:906-948`, below all four. So the cabinet
cannot resolve a laser hit on a fireball it did not draw either. (Note the near clamp differs
from S2VW's — `#01` vs `#10` — and the ratio tests compare raw values where S2VW compares
squares. Same shape, different literals; do not copy S2VW's constants onto this path blind.)

### The port, verified today

- `beamHit` is `gameRules.ts:138-150`. **Five** call sites: `sim.ts:546` (TIEs), `:554`
  (fireballs), `:1094` (turrets, surface), `:1323` (exhaust port, trench), `:1339` (obstacles,
  trench), plus `tie-status.ts:339` (the sights predicate). The three the filing names for the
  helper-sharing argument are correct as cited.
- **The C_PV predicate is INLINE** at `tie-status.ts:243-251` and nothing exports a standalone
  frustum test. Extracting one is the enabling move for AC2 — fireballs have no status word.
- `TIE_HIT_RADIUS = 250` (`state.ts:486`), `ENEMY_SHOT_HIT_RADIUS = 150` (`:482`),
  `SIGHTS_BAND_FACTOR = 2` (`tie-status.ts:172`), `VIEW_NEAR = 0x10`, `VIEW_FAR = 0x7f00`.
- The `SIGHTS_BAND_FACTOR = 2` rationale at `tie-status.ts:157-171` is **not wrong** — it derives
  2 from the two OCTAGON thresholds (3 ÷ 1.5), and that ratio really is 2. What a disc cannot
  express is the *axis* ratio, which is 3. AC6 rewrites the test, not the reasoning.

### The answer to the story's OPEN QUESTION (2000 sampled directions, units of R)

| angle | ROM kill | port kill | ROM sights | port sights |
|---|---|---|---|---|
| 0° | 1.0000 | 1.0000 | 3.0000 | 2.0000 |
| 26.57° | **1.1180** | 1.0000 | 2.2361 | 2.0000 |
| 45° | 1.0607 | 1.0000 | 2.1213 | 2.0000 |
| 90° | 1.0000 | 1.0000 | 3.0000 | 2.0000 |

**0 / 2000 directions where the clone reaches further than the cabinet, in either test.** The
disc model is a strict subset of the ROM's in both. Widest kill disagreement is at
`atan(1/2) = 26.57°` — the octagon corner, `sqrt(5)/2 = 1.1180 R` = 279.5 u against our 250, a
29.5 u shell a test can plainly see. Containment (kill within sights) holds in both models. So
the deviation could only ever make the clone **stingier**, never more permissive — which is why
it survived unnoticed, and why it is a fidelity gap rather than a live hazard.

### Blast radius of the candidate fixes (applied to committed source, run, restored, md5-verified)

Baseline on a clean tree, this checkout, 2026-08-03: **`--project star-wars` 2252/2252 across
201 files · `npm run lint` 0 errors · `npm run test:orchestrator` 390/390**.

| Change | Behavioural red |
|---|---|
| Gate `sim.ts:546` (TIEs) | **2** — `tie-hit-status.test.ts`, both `uf1-3` Darth end-to-end tests, via `fireUntilDarthHit`'s own "the FIXTURE geometry is wrong" throw |
| Gate `sim.ts:554` (fireballs) | **0 additional** |
| ROM kill shape in `beamHit` | **0** |
| ROM sights shape (L1 diamond) | **1** — `tie-sights-status.test.ts`, "opens the band at EXACTLY twice the kill radius" |

> ⚠ **The small number is the RISK, not the good news.** Three of the four changes are invisible
> to 2252 tests — the exact shape in which a guard ships as scenery. AC8 makes the mutation proof
> mandatory, with the mutated string recorded verbatim.

---

## Technical approach — measured pointers, not design

Design is TEA's and Dev's. These are the facts they would otherwise spend an hour finding.

- **Where the gate goes:** the space arm's laser block, `sim.ts:541-560`. Both `beamHit` calls
  live inside it, four lines apart. Note `sim.ts` has **three** such blocks (space, surface,
  trench) — anchor any edit on something unique; my first scripted anchor matched 3 and aborted.
- **What the gate reads:** extract the `tie-status.ts:243-251` predicate to a named export taking
  `(pos, aspect)`. `sim.ts:425` already consumes `status & Status.C_PV` for the TIE *fire* gate,
  so there is precedent for the bit in the space arm — but that read happens inside
  `tickedEnemies.map` at `:422`, a different scope from the laser block.
- **A trap in my own measurement, handed over as a trap and not as a design:** I built the
  perpendicular basis as `right = normalize(cross(dir, [0,1,0]))`, which is **degenerate when the
  ray is vertical**. It did not matter for a blast-radius count. It would matter shipped. The
  screen basis the cabinet uses is the projection's, not an arbitrary world-up cross.
- **`fireUntilDarthHit`** is `tie-hit-status.test.ts:130-150`; its throw message already says the
  fixture geometry is what is wrong when the beam does not land. Under AC1 that message becomes
  literally true, so the fixture is what moves — reseat Darth on the glass, do not widen the gate.

## Out of scope

- `beamHit`'s signature and its surface/trench callers keep their current gating (AC3 — the
  helper does not gain a view test).
- The trench and ground phases' visibility, which have no C_PV notion in the ROM either.
- The 29 stale citations the comment-citation guard reports — that is **sw8-24**. AC4's
  `sim.ts:535` is NOT among them (the guard cannot see it), so fixing it here does not overlap
  that sweep, and the tree-wide count must not RISE past the 29 ceiling.

## Sibling / environment state at setup

- Board clean for this story: no `origin` branch matching `sw8-27`; live sibling sessions are
  `a-1` on `jt9-3` and `a-3` on `cp6-2`, neither touching star-wars.
- **Dev port 5270 is held by a-1's listener** (`lsof -nP -iTCP:5270 -sTCP:LISTEN` → pid 7744,
  cwd `/Users/slabgorb/Projects/a-1`). This story has no visual AC, so it should not matter — but
  if anything wants a served page, use `npx vite --port 5290 --strictPort` and do **not** kill
  a-1's server.
- Every row of sw8-19's ten-finding table was checked against the board: rows 1,2,3,4,6,7,9 fixed
  in its finish chore; rows 5 and 10 are this story; row 8 verified present in `sw8-25`'s
  description TEXT, not merely "owned by" it. Nothing unowned, nothing dropped.

---

## Acceptance Criteria

*Reproduced verbatim from `sprint/epic-sw8.yaml` by generating this file from `yaml.safe_load`.
They have not been edited — the equality is by construction, not by inspection.*

- AC1 — The player's laser can no longer resolve a TIE the cabinet would not have DRAWN. The space arm's TIE resolution (the `beamHit(beamOrigin, beamDir, enemies[ei].pos, TIE_HIT_RADIUS)` call in sim.ts) is gated on the same C_PV predicate `computeStatus` derives. Transcription, not inference: `S2VW` (WSMAIN.MAC:3755) has exactly four exits before `CHSET C$PV` (:3846) — :3825-3826 near clamp, :3827-3828 far clamp, :3834-3836 and :3840-3842 the two ratio tests, all long-branching to `RTS1` at :3754 — and the ROM's laser-hit block (:3898-3918) sits below all four with no intervening label. Pinned seat: a TIE at [0, 240, -400] on 16:9 is off the glass (vertical bound 230.9) yet 240 u from the aim ray, inside TIE_HIT_RADIUS (250); it must stop being killable, with an on-glass positive control asserted in the same test so the zero is an observed zero.

- AC2 — The SAME gate covers the FIREBALL resolution (`beamHit(beamOrigin, beamDir, enemyShots[si].pos, ENEMY_SHOT_HIT_RADIUS)`), because the cabinet gates it identically and nobody had checked. `VWGUN::` (WSGUNS.MAC:852) has exactly four exits before its `;GUN SHOT IS VISIBLE` marker at :904 — :884-885 (`CMPD #01` / `LBLE 90$`), :886-887 (`CMPD #7F00` / `LBHI 90$`), and :895-896 and :902-903 (the two `SUBD M.XP` / `LBHS 90$` ratio tests) — and the hit-record that writes `CL.GDS`/`CL.GP` (:906-948) sits below all four. USER RULING at setup: BOTH space-arm sites, not the one the description names. MEASURED at setup: adding this second site costs ZERO additional red, so it buys no fixture saving to omit.

- AC3 — The gate is CALLER-SIDE and `beamHit` itself is unchanged. The helper stays shared with the surface and trench phases (sim.ts:1094 turrets, :1323 exhaust port, :1339 obstacles — all three re-verified at setup against the post-chore file), which have no C_PV notion at all; clamping the helper is mutant G6/M6 in sw8-19's two batteries and must stay caught. Note the enabling structural fact: the C_PV predicate is INLINE in `computeStatus` (tie-status.ts:243-251) and no standalone frustum test is exported anywhere, so a named predicate has to be extracted — and that extraction is what makes AC2 nearly free, since fireballs carry no status word to read C_PV from.

- AC4 — `tests/core/tie-sights-visibility.test.ts`'s `does NOT change the GUN` assertion is NOT retired. The story description says closing this story `means deliberately retiring that assertion`; MEASURED at setup, that is FALSE for the caller-side fix — the test calls `beamHit` DIRECTLY, so the gate leaves it green, and what it pins (the gate is not in the helper) is exactly what AC3 still needs. Keep it, and re-anchor its stale `sim.ts:535` citation to the real call site at :546 (+11, the shift from sw8-19's finish chore). That citation is invisible to the comment-citation guard, which range-checks only when no verbatim is adjacent, so it is in neither the guard's 29 nor sw8-24's sweep.

- AC5 — The KILL region ports the cabinet's SHAPE: box AND octagon — `|dx| <= TMPSIZ && |dy| <= TMPSIZ && |dx| + |dy| <= 1.5 * TMPSIZ` (WSMAIN.MAC:3898-3908) — replacing the Euclidean disc. Note the box threshold is 1.0x TMPSIZ and only the octagon is 1.5x; the description's `box AND octagon at 1.5x` compresses two different thresholds into one. MEASURED at setup: this change reddens ZERO of 2252 tests, because today's disc is a strict subset of the ROM region — so its entire observable footprint is the test nobody has written yet, and AC8's mutation proof is what makes it real rather than scenery.

- AC6 — The SIGHTS region ports the cabinet's SHAPE: a pure L1 octagon, `|dx| + |dy| <= 3 * TMPSIZ` with NO box test (WSMAIN.MAC:3920-3924), replacing the disc at SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS. MEASURED at setup: exactly ONE test reddens — `tie-sights-status.test.ts`'s `opens the band at EXACTLY twice the kill radius — 3xTMPSIZ over 1.5xTMPSIZ`. That test is not wrong so much as unable to say more: 3 over 1.5 is the octagon-to-octagon ratio and it is genuinely 2, but the ratio a disc model cannot express is the AXIS one, which is 3. Rewrite it to assert the diamond; do not merely relax it.

- AC7 — The shape deviation being retired is recorded WITH ITS NUMBERS, and the doctrine paragraph at gameRules.ts:118-123 that argues for the world-space sphere is rewritten rather than left contradicting the code it sits above. MEASURED at setup over 2000 sampled directions: the disc model is a strict SUBSET of the cabinet's in both tests — 0/2000 angles where the clone reaches further than the ROM. Kill: identical on the axes, cabinet reaching sqrt(5)/2 = 1.1180 R at atan(1/2) = 26.57 degrees off-axis (the octagon corner: 279.5 u against our 250). Sights: cabinet 3.0 R on axis against our 2.0 R, never dipping below 2.121 R. So the pre-existing deviation could only ever make the clone STINGIER than the cabinet, never more permissive — which is why it survived this long unnoticed.

- AC8 — Each of the four behaviour changes (AC1 gate, AC2 gate, AC5 kill shape, AC6 sights shape) is MUTATION-PROVEN with the mutated string recorded VERBATIM, so the next reader re-runs the string rather than reconstructing the intent. This is mandatory rather than customary here: measured blast radius is 2 tests, 0, 0 and 1 respectively, so three of the four ship invisible to a 2252-test suite. Record which test reddens for each mutant, and treat any mutant that survives as a question about observability before writing a test for it.

