# Story sw8-19 Context

## Title
C_PS can be set while C_PV is clear — the port carries only one of the ROM draw-pass gates

> The board title is the full filed finding (it was filed with its whole body in the `title`
> field). The line above is a readable short form; the authoritative text is the epic YAML.

## Metadata
- **Story ID:** sw8-19
- **Type:** bug
- **Points:** 2
- **Priority:** p3
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** sw8
- **Lineage:** uf1-12 (derived C_PS) → uf1-14 (re-shaped the C_PV pyramid) → uf1-15 (re-shaped
  C_AS) → sw8-8 (retired `spaceEye`, exposing this) → **sw8-19**. All four are `done`.

## Problem

`computeStatus` (`plugins/star-wars/src/core/tie-status.ts`) can set **C_PS** — "player has the
alien in his sights" — for a TIE that is **not on the player's screen**. Consequence: TCH1DZ's
loiter break (four C_PS gates, `tie-vm.ts:341-342`) can fire for a fighter the player cannot see.

> ⚠ **CORRECTION (SM, 2026-08-02).** The filed finding is substantially right and two of its
> claims are wrong. Read this block before the filed text; each item was measured, and the
> method is named so you can re-run it rather than take it.

**C1 — the story's own citation has rotted.** It cites `tie-status.ts:170-173` for "beamHit
refusing anything behind the gun (says so out loud)". That sentence is now at **:283-284**
(+113 lines); :170-173 is the `SIGHTS_BAND_FACTOR` doc block. The *claim* survives at the
corrected lines — only the pointer rotted. (This is sw8-18's own thesis, demonstrated again.)

**C2 — the ROM gate is far STRONGER than filed, and it changes "likely fix" into
"transcription".** The filing says the gate is implicit in the `CHSET` "sitting inside the object
draw pass". Measured: `S2VW` (`WSMAIN.MAC:3755`) is one straight-line routine with **exactly four
exits before `CHSET C$PV`** — `LBLE RTS1` :3826, `LBHI RTS1` :3828, `LBHS RTS1` :3836,
`LBHS RTS1` :3842 (target `RTS1: RTS` at :3754; those four are its only references in the file).
Those four tests **are** C_PV's definition — the near clamp `#10`, the far clamp `#7F00`, and the
two ratio tests. `CHSET C$PV` is :3846; the tree's sole `CHSET C$PS` is :3930; the only branch
target between them is the forward `86$` at :3933. **So `:3930` is unreachable unless `:3846`
executed, on the same object, in the same pass.** "Gate C_PS on C_PV" is not a guess — it is what
the cabinet does.

**C3 — the story's open question ("check whether the draw pass has other implicit gates worth
porting") is ANSWERED: there are none left.** Between :3846 and :3930 sit the Darth speech block
(:3849-3868, no exit), `IS2UV`/`OBJCEN` (:3870-3873 — both `JSR`, and a `JSR` returns to :3875, so
neither can skip the caller's remaining code), the `TMPSIZ`/`TMPOCT` setup, and the laser-hit
block (:3898-3918, whose four `ENDIF`s all close before :3919 — **C_PS is NOT nested inside the
laser's conditions**). The only other gate inside the C_PS block is `?ALIVE?`
(`LDA A$TYP(X) / CMPA #1 / BNE 86$`, :3926-3928), which is **already ported** — `state.enemies`
holds only live fighters (`tie-status.ts:281-283`).

**C4 — the impact is UNDERSTATED.** The filing says "Behaviourally small (the fighter is about to
collide)". That is true of the seat it chose and false of the region. Measured sweep along the
vertical pyramid edge (aspect 16/9, yoke at rest), C_PS set / C_PV clear holds from depth 10 out
to **depth ≈ 866** — the crossover is `band / tan(FOV_Y/2)` = `500 / 0.5774` = 866.0:

| depth | vert (just outside the pyramid) | C_PS | C_PV |
|------:|-------------------------------:|:----:|:----:|
|    10 |    5.8 | set | clear |
|   200 |  115.6 | set | clear |
|   400 |  231.2 | set | clear |
|   800 |  462.3 | set | clear |
|   866 |  500.5 | clear | clear |
|  2000 | 1155.9 | clear | clear |

At depth 800 the TIE is ~925 u from the cockpit — **3.7 × `TIE_HIT_RADIUS`**, not colliding.

**C5 — uf1-14 made this defect BIGGER, which is why the dependency said do it first.** The
crossover is `band / tan(half-angle)`. At the retired ±45° pyramid it was `500 / 1.0 = 500`; at
uf1-14's rendered 30° vertical it is 866 — a **73% deeper** divergence region. Horizontally it
scales with the canvas: `hBound = vBound × aspect`, so the crossover is `866 / aspect` ≈ 487 at
16:9, 371 at 21:9 and 866 at 1:1. The defect is aspect-dependent and **worst on a square canvas**.

### What was VERIFIED and needed no correction

Line-exact, from primary source and from execution:

- `WSMAIN.MAC:3930` is the tree's **sole** `CHSET C$PS` (fixed-string grep; `WSMAIN.FUL:2669` is
  the same code in the `.FUL` listing). The block `:3919-3932` is exactly the C_PS block.
- `tie-vm.ts:341-342` carries **exactly four** C_PS gates — three `CUNTIL` on :341
  (`C_PN|C_PS`, `C_AS|C_AG|C_PS`, `C_AG|C_PS`) and the two-way `CIF(C_PS), CGOTO('TCH1DZ_20')`
  on :342.
- `TIE_HIT_RADIUS = 250` (`state.ts:486`) → the band is **500**. `VIEW_NEAR = 0x10 = 16`
  (`tie-status.ts:141`).
- `beamHit` (`gameRules.ts:138-150`) carries **no FOV clamp** — only `along <= 0` (behind the gun)
  and `along > maxRange`. The filing is right that nothing ties C_PS to visibility.
- **The worked example was RUN, not read:** a TIE at `[400, 0, -10]` returns **C_PS set, C_PV
  clear** today, at aspect 16/9.

### Two boundaries TEA should not waste a test on

- **The far clamp is unreachable.** `VIEW_FAR = 0x7f00 = 32512`, but the play cube clamps at
  ±`0x7CFF` = 31999, so view depth can never exceed `VIEW_FAR` in space. The divergence is a
  near/off-axis phenomenon only — a far-side seat cannot be built.
- **Behind the player is already covered**, by `beamHit`'s `along <= 0`. Both bits read clear
  there; verified.

## Technical Approach

Measured pointers only — the design is TEA's and Dev's.

| What | Where |
|---|---|
| The bit to gate | `plugins/star-wars/src/core/tie-status.ts:285-288` (the C_PS block) |
| The bit to gate it ON | `tie-status.ts:243-251` (the C_PV block; `status \|= Status.C_PV`) |
| The four consumers | `plugins/star-wars/src/core/tie-vm.ts:341-342` |
| The ray | `beamHit` / `aimDirection`, `plugins/star-wars/src/core/gameRules.ts:53-56, 138-150` |
| ROM: the four exits | `WSMAIN.MAC:3826, 3828, 3836, 3842` → `RTS1: RTS` at `:3754` |
| ROM: `CHSET C$PV` | `WSMAIN.MAC:3846` |
| ROM: `CHSET C$PS` | `WSMAIN.MAC:3930` (block `:3919-3932`) |
| Existing C_PS suites | `plugins/star-wars/tests/core/tie-sights-status.test.ts`, `tests/core/tie-loiter-sights.test.ts` |
| ROM source root | `~/Projects/star-wars-1983-source-text` (LF-normalised; grep this one) |

**SIZING — the single most important measurement, and it cuts both ways.** SM applied the
candidate one-line gate (`(status & Status.C_PV) !== 0 && beamHit(…)`) to committed source and ran
the whole game suite: **2238 passed / 200 files / zero red**, then restored from a `cp` backup and
confirmed the md5 matched and `git status` was clean.

- *Good:* no fixture rework. No existing seat sits outside the pyramid. The 2-point estimate holds.
- *Bad, and it is the real risk:* **nothing already in the tree can observe this change.** The new
  test is the fix's entire observable footprint. A gate that no test can see is scenery — which is
  why AC4 makes the mutation proof mandatory rather than customary.

## Scope

**In scope:** the C_PV gate on C_PS in `computeStatus`; the tests pinning it (negative seats,
positive control, mutation proof); the comment correction at `tie-status.ts:283-284`.

**Out of scope, deliberately** (AC6): the **L1-octagon vs Euclidean-sphere shape deviation**. The
ROM's C_PS test is `|dx| + |dy| <= 3·TMPSIZ` with **no** box test (`WSMAIN.MAC:3920-3924`), while
the laser hit is box **and** octagon at 1.5× (`:3898-3908`). Our port models both as Euclidean
spheres at 2× and 1×. Leave it: the 2× ratio is the octagon-term ratio (3 ÷ 1.5) and is correct;
the L1-vs-L2 shape is **pre-existing and documented** at `gameRules.ts:118-123`; it is **shared
with the gun**, and the port's own doctrine says keeping the sights on the gun's exact predicate is
what stops the two disagreeing about a target. Containment (kill ⊆ sights) holds in both models.
Changing it would move the gun, which is not a 2-point story.

**Also out of scope:** re-litigating the `spaceEye` retirement (sw8-8 ruled it; the Reviewer
confirmed it satisfies uf1-12's ACs), and the C_AS cylinder (uf1-15, `done`).

## Acceptance Criteria

Reproduced **verbatim** from `sprint/epic-sw8.yaml` and **not edited**. These were derived at
setup — the story was filed with `acceptance_criteria: null` — and written to the YAML first, so
the YAML and this file are the same text by construction.

1. computeStatus sets C_PS only when C_PV is also set. This is a transcription of the ROM control flow, not a heuristic: S2VW (WSMAIN.MAC:3755) has exactly four exits before its CHSET C$PV -- LBLE RTS1 :3826, LBHI RTS1 :3828, LBHS RTS1 :3836, LBHS RTS1 :3842, whose target RTS1: RTS is :3754 -- and those four tests ARE C_PV (near clamp #10, far clamp #7F00, the two ratio tests). CHSET C$PV is :3846, the tree-sole CHSET C$PS is :3930, and the only branch target between them is the forward 86$ at :3933, so :3930 is unreachable unless :3846 executed on the same object in the same pass.

2. A pin that is RED on arrival at TWO seats, not one. (a) the degenerate near-clamp seat -- the story worked example [400, 0, -10], execution-verified today as C_PS set / C_PV clear; and (b) a NON-degenerate seat off the vertical pyramid edge at depth <= 866, e.g. pos [0, 462.3, -800] at aspect 16/9, also verified today as C_PS set / C_PV clear, where the TIE is ~925 u from the cockpit (3.7x TIE_HIT_RADIUS) and nowhere near collision. Seat (b) is required because seat (a) alone reproduces the filed claim that the divergence is collision-adjacent, which SM measured to be false.

3. A POSITIVE CONTROL proving the negative assertions are not vacuous: a TIE seated inside BOTH the 500 u sights band and the rendered view pyramid still sets C_PS, and the TCH1DZ_20 reachability arm uf1-12 shipped (tie-vm.ts:342 CIF(C_PS), CGOTO(TCH1DZ_20)) stays reachable and green. Without this, a derivation that broke outright would pass every C_PS-is-clear assertion.

4. MUTATION-PROVEN, and mandatory here rather than routine: deleting the C_PV term from the C_PS condition must redden at least one test, with the exact mutated string recorded verbatim in the commit or comment so the next reader re-runs the string rather than reconstructing the intent. SM measured that the one-line gate passes the ENTIRE pre-existing star-wars suite -- 2238 tests across 200 files, zero red -- so nothing already in the tree observes this change and the new test is its whole observable footprint.

5. The C_PS comment block records the ROM structural gate -- that the four RTS1 exits are C_PV own three tests and are what make :3930 unreachable -- replacing the sentence currently at tie-status.ts:283-284 ("the must be drawn gate the CHSET inherits from sitting in the draw pass is beamHit refusing anything behind the gun"), which understates a hard control-flow gate as a by-product of the draw pass. beamHit behind-the-gun refusal stays described as what it is: a separate, weaker guard that survives the change and is NOT the ported gate.

6. No behaviour beyond the gate moves: SIGHTS_BAND_FACTOR stays 2, beamHit is untouched, and the L1-octagon-vs-Euclidean-sphere shape deviation (ROM C_PS is |dx|+|dy| <= 3*TMPSIZ with NO box test, WSMAIN.MAC:3920-3924, against the laser box-and-octagon at 1.5x, :3898-3908) is explicitly OUT of scope -- it is pre-existing, documented at gameRules.ts:118-123, shared with the gun, and containment (kill subset of sights) holds in both models.

## Baseline at handoff (measured 2026-08-02, this checkout, clean tree)

- `npx vitest run --project star-wars` → **2238 passed / 200 files**, zero failures
- `npm run test:orchestrator` → **390 pass / 0 fail**
- `npm run lint` → **0** `error TS`

Nothing red is inherited. Any red after RED lands is this story's, which is the point.

## Environment note

Dev port **5270 is held by the `a-1` checkout** (`node /Users/slabgorb/Projects/a-1/node_modules/.bin/vite`,
pid 7744 at the time of writing). This story is pure-core and needs no browser, so this should never
matter — but do **not** kill that server, and if a served check is ever wanted use
`npx vite --port 5290 --strictPort` instead.

---

_Context authored by SM at setup and verified against the epic YAML by parse (a `python3` `in`
test of every AC), not by grep. Do not regenerate or overwrite this file._
