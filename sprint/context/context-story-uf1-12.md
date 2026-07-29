# Story uf1-12 Context

## Title
star-wars C_PS is never derived — TCH1DZ's loiter branch is unreachable dead code

## Metadata
- **Story ID:** uf1-12
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** star-wars
- **Epic:** Unwired features — ported-but-unconsumed mechanics found by the 2026-07-28 fleet sweep

## Problem
Found by TEA during uf1-3's RED phase, the same defect class the uf1 sweep was built to find — and the sweep missed it. src/core/tie-vm.ts:226 destructures C_PS out of Status and the assembled program gates on it in FOUR places, all inside TCH1DZ (the D-group loiter loop every D fighter, Darth included, ends up in): tie-vm.ts:341 'CUNTIL(C_PN | C_PS)', 'CUNTIL(C_AS | C_AG | C_PS)', 'CUNTIL(C_AG | C_PS)', and tie-vm.ts:342 'CIF(C_PS), CGOTO(TCH1DZ_20), CIF(0), CGOTO(TCH1DZ)'. But computeStatus (src/core/tie-status.ts) derives only C_AS, C_PN, C_PV, C_AG, C_R1 and C_R2 — it never derives C_PS, and its header says so out loud: 'the remaining player-relative bits (C_AD, C_AV, C_PS, C_PM) stay out of scope until a consumer needs them.' A consumer DOES need it, and has since sw7-11 assembled the program. Consequence: C_PS reads permanently false, so the two-way branch at :342 can only ever take the CIF(0) arm and the label TCH1DZ_20 is UNREACHABLE — dead ported code — while the three CUNTIL gates above it lose one of their two release conditions and hold longer than the cabinet does. Unlike its neighbours this is a real gap, not a faithful omission: the ROM genuinely sets the bit (WSMAIN.MAC:3930 'CHSET C$PS ;STATUS: ALIEN IN PLAYER SITES') and reads it at WSCPU.MAC:1639,1641,1643,1646 — the same four sites the port carried over. By contrast C_AD, C_AV and C_PM are correctly absent: the ROM never sets C_AD either (WSCPU.MAC:28 annotates it '/PLEASE DELETE/' and it has zero setters tree-wide), and the program does not gate on any of the three. Do for C_PS what uf1-3 did for C_AH: derive it in computeStatus from the player's aim, cite WSMAIN.MAC:3930 for the rule rather than inventing a cone, and prove the TCH1DZ_20 arm reachable with a test. Note C_PS is the mirror of C_AS (which computeStatus already derives with the INFERRED 12-degree FIRE_CONE_COS and a TODO(playtest) on it) — check whether WSMAIN.MAC:3930's own gate gives a portable threshold that could retire that guess too.

## Technical Approach
_Pointers only — the design is TEA's and Dev's to make. These are the sources to
read first, not a prescribed solution._

**Provenance.** This story was filed by TEA during **uf1-3's RED phase**, not by the
uf1 fleet sweep. Read `sprint/archive/uf1-3-session.md` before anything else — its
Delivery Findings section carries the `C_PS` Gap entry that spawned this story, and
its line 321 confirms uf1-3 deliberately left `C_PS` untouched as this story's work.

**Precedent — read the diff as a template.** uf1-3 did for `C_AH` exactly what this
story must do for `C_PS`: derive the bit in `computeStatus`, cite the ROM setter
rather than invent a rule, and prove the gated branch reachable with a test. It
shipped as **star-wars#137, commit `94905d7`** on `origin/develop`
(`feat(uf1-3): wire C_AH — a shot fighter's damage reaches its choreography`).

**Files in play (star-wars):**
- `src/core/tie-status.ts` — `computeStatus` derives the bit; the header's
  out-of-scope comment line also needs correcting (AC-5).
- `src/core/tie-vm.ts:226` — the `C_PS` destructure; `:341-342` — the four gate
  sites inside `TCH1DZ`, including the two-way branch whose `TCH1DZ_20` arm is
  currently unreachable.

**ROM quarry.** The 1983 Atari "Warp Speed" source is checked out at
`/Users/slabgorb/Projects/star-wars-1983-source-text`. Verified 2026-07-29:
`WSMAIN.MAC:3930` reads `CHSET C$PS ;STATUS: ALIEN IN PLAYER SITES` — the setter,
inside an `?ALIVE?` guard (`BNE 86$` / `LDD A$CHST(X)` … `STD A$CHST(X)`). The four
readers are at `WSCPU.MAC:1639,1641,1643,1646`. Note `WSOBJ.MAC` is `.RADIX 16`;
check the radix of any file you pull a constant from.

**Open question carried by AC-1.** `C_PS` is the mirror of `C_AS`, which
`computeStatus` already derives from an **inferred** `FIRE_CONE_COS` (12°) carrying
a `TODO(playtest)`. Determine whether the gate around `WSMAIN.MAC:3930` yields a
portable threshold — if it does, it may retire that guess too; if it does not, AC-1
requires the chosen rule be logged as a deviation with its rationale.

## Scope
- **In scope:** deriving `C_PS` in `computeStatus`; proving the `TCH1DZ_20` arm
  reachable; the three `C_PS`-bearing `CUNTIL` gates releasing on `C_PS` alone; the
  mutation proof; the `tie-status.ts` header comment correction.
- **Out of scope:** `C_AD`, `C_AV` and `C_PM`. Their absence is **correct, not a
  gap** — the ROM never sets `C_AD` (`WSCPU.MAC:28` annotates it `/PLEASE DELETE/`,
  zero setters tree-wide) and the assembled program gates on none of the three. AC-5
  requires they stay documented as correctly-absent so the next sweep does not
  re-file them.
- **Out of scope:** retuning `C_AS`/`FIRE_CONE_COS` beyond what AC-1's finding
  supports. If the ROM threshold turns out to be portable and retiring the 12° guess
  becomes a real change, that is a separate story to file — not a silent widening of
  this one.

## Acceptance Criteria
- computeStatus derives C_PS from a rule cited to WSMAIN.MAC:3930, or the absence of a portable threshold there is logged as a deviation with the chosen rule and its rationale.
- The TCH1DZ_20 arm is proven reachable: a test drives C_PS true and asserts the VM takes the CIF(C_PS) branch rather than the CIF(0) fallthrough.
- The three C_PS-bearing CUNTIL gates in TCH1DZ release on C_PS alone, not only on their C_PN/C_AS/C_AG partners.
- Mutation-proven: pinning C_PS back to false reddens the TCH1DZ_20 reachability test.
- The tie-status.ts header line listing C_PS as out-of-scope is corrected, so the next sweep does not re-report it; C_AD, C_AV and C_PM stay listed with the ROM reason they are correctly absent.

---
_Generated by `pf context create story uf1-12` from the sprint YAML._
