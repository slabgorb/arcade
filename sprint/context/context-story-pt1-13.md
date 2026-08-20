# Story pt1-13 Context

## Title
joust: the troll should not be able to pull the player through a platform

## Metadata
- **Story ID:** pt1-13
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Playtest bug sweep 2026-08-19 (pt1)

## Background
Playtest 2026-08-19: when the lava troll grabs the player, it can drag them through solid platform geometry. Collision should still resolve against platforms during a troll grab; check the ROM's troll-pull behavior.

## ⚠ Critical Setup Note: Troll is Wave-Gated

**Do NOT measure on a wave-1 sim.** In joust the lava troll only spawns wave 4+, and `createWaveSim(1)` covers the lava band entirely (bridge burns wave 3, troll spawns wave 4+). ANY suicide/lava/troll measurement on a wave-1 arena is vacuous. TEA must build a wave-4+ (or `bridgeBurned:true`) arena — see the `trollSim` helper precedent — to reproduce the pull-through and to guard against it. Reproduce the RED against a real troll-grab state, not a synthetic wave-1 one.

## Findings (research complete — two defects, the second is the real one)

Joust's vendored source is at `reference/williams-source/joust/` (JOUSTRV1-4.SRC
etc., pinned 9bcfdb1 per `plugins/joust/docs/rom-study/brief.md:8-11`) — NOT
under reference/original-source/.

**A1 — the grip integration has no ground resolve.** `stepTrolls`
(`src/core/sim.ts:1112-1218`) drives the victim by pure arithmetic:
`sim.ts:1149-1150` writes `stepGrip(...)`'s posY unconditionally; `stepGrip`
(`troll.ts:173-188`) tests only `escaped` (VY < −$0180) and `inLava`. Meanwhile
`frame.ts:401-406` early-returns for any process with `grippedBy` set, so
`stepPlayerEntity` — and with it the landing resolve (`frame.ts:305-306`) AND the
FLOOR+7 backstop (`frame.ts:307-327`) — never runs for a gripped bird. Y sweeps
monotonically to 230 through every platform band.

**A2 — it should never be reachable: the ROM re-verifies RANGE every frame and we
never ported the check.** `LAVVIC/LAVVI2/LAVVI3` (`JOUSTRV4.SRC:1711-1731`) is
run at reach start (`:1606`), inside the grip loop (`:1667`), and after EVERY
fall step inside ADDLAV (`:6653` `JSR LAVVI3 / BNE ADLFRE`). Its three tests, all
missing from the port (`stepTrolls`' only give-up is victim-exists,
`sim.ts:1131-1141`):
1. victim grounded ⇒ release (`:1716-1717`)
2. victim higher than FLOOR+7−32 (Y < ~198, within 32px of lava) ⇒ release (`:1718-1720`)
3. victim x−2 in (40, 240) ⇒ release (`:1721-1726`) — in range ONLY at the
   screen-edge lava gaps

The geometry is what makes the ROM safe: measured against our own tables
(`flight.ts:148-244` LND_X_TABLE/masks, `arena.ts:179-195` LND_Y_TABLE),
lava-troll cells ($80 without $20) live at X ∈ [−32,38] ∪ [239,319] — columns
with NO platform above. **But `TROLL_CLIF5_X = 148` (`sim.ts:996-998`, the
jt11-4 once-per-wave victim pick, spawn at `sim.ts:2956-2967`) has mask 0x32 —
ON the CLIF5 platform, a column the ROM troll can never reach.** The jt11-18
per-contact path (`sim.ts:2983-2995`) is faithful (grabs only a bird whose feet
are on a troll cell); the jt11-4 path is the through-platform factory.

## Technical Approach
Port `LAVVIC` as a pure `trollVictimInRange(entity)` in `troll.ts` (grounded ⇒
out; pixelY < DEATH_Y−32 ⇒ out; posX−2 in (40,240) ⇒ out), called at the top of
every `stepTrolls` iteration AND after `stepGrip`'s integrate (the ADLX→LAVVI3
order), releasing the grip. That alone makes the through-platform pull
unreachable. Also gate `pickTrollVictim` on the same predicate and retire the
bogus `TROLL_CLIF5_X = 148`. New claims for `JOUSTRV4.SRC:1711-1731` (no claim
covers LAVVIC today; `claims/troll.json` JT33-001..021 cover the rest).
Provenance idiom: pair `troll.test.ts` changes with `troll-source.test.ts`
re-derivations via `tests/helpers/joust-source.ts` (nothing under src/ may import
it — the tautology trap); ROM cites `JOUSTRV4.SRC:<line>` in comments are
in-idiom (`comment-line-refs.test.ts` bans only `<file>.ts:<line>`).

## Scope
- In scope: the range predicate + its three release sites, the victim-pick gate,
  the TROLL_CLIF5_X retirement, claims.
- Out of scope: grip pull strength/escalation (`escalateGrip` — cited, correct);
  lava death itself; the demo AI.

## Tests affected / cascade risk
- `tests/troll.test.ts` (AC1 :70, AC2 :136, AC3 :218; AC4 :302 seeded replay is
  self-consistency — survives), `tests/troll-source.test.ts` (extend),
  `tests/jt13-7-troll-grab-cue.test.ts`, `tests/lava-troll-enemy-grip-drown.test.ts`,
  `tests/lava-troll-grip-drown-cinematic-jt13-11.test.ts`.
- **Cascade (the jt13 standing risk):** a range gate changes which frames a troll
  holds a victim → process lists move → `tests/demo-troll.test.ts`,
  `demo-jt9-11*.test.ts`, `demo-jt9-42.test.ts` (concrete frames — likely reds)
  and possibly the frozen fingerprints in `tests/audio-events.test.ts:825-1067`.
  The gate reads position/velocity only — draws no randomness — so **rng must
  not move** (the re-baseline tell); procs/scores may legitimately move. Lead any
  re-baseline note with the rng assertion.

## Acceptance Criteria
_TEA to define at RED. Suggested: AC1 a grip releases the moment the victim
leaves LAVVIC range (three conditions pinned + cited to JOUSTRV4.SRC:1711-1731);
AC2 no reachable state pulls a bird through a $20 landing cell (property test
across the grip integrate); AC3 victim picks only from in-range birds (the 148
column can't be grabbed); AC4 purity green; AC5 fingerprint re-baselines, if any,
show rng unmoved._

---
_Generated by `pf context create story pt1-13`; researched and expanded by Architect 2026-08-19._
