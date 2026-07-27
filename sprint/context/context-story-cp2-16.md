# Story cp2-16 Context

> **⚠ HAND-AUTHORED (2026-07-27, a-2 SM) — do NOT let sm-setup regenerate this file.**
> At story start, pass sm-setup an explicit override ("SKIP story-context regeneration")
> and verify on disk afterward (`git status --short` empty + md5 match), per the rb4-16
> precedent. The epic YAML's cp2-16 entry has no description body; a regen writes garbage.

## Title
PLAYEX side-effects on a gun death — stamp the colliding slot 0xFF and blank the shot (CENTI4.MAC:1805-1808)

## Metadata
- **Story ID:** cp2-16
- **Type:** bug · **Points:** 2 · **Priority:** p3 · **Workflow:** tdd · **Repo:** centipede

## Provenance — read this first

cp2-16 was filed by the checkout that merged cp2-15 (centipede PR #35, squash `156430e`),
scoped as "stamp the colliding slot 0xFF and blank the shot." Concurrently, checkout a-2
ran cp2-15 through a full TDD cycle and its review discovered the supersession; that
session's branch **`fix/cp2-15-frame-order`** (pushed to centipede origin, head `7babb64`)
is a complete WORKING REFERENCE for this story's scope, built on the pre-#35 base. Full
record: `sprint/archive/cp2-15-session-superseded-a2.md` (assessments, deviations, probe).

## Scope — declared, plus a REQUIRED amendment

**Declared (the stamps):** on a PLAY kill, PLAYEX stamps the killing slot's picture 0xFF
(`:1805-1806 LDA I,0FF / STA X,MOBJP`, CT-53) and blanks the shot (`:1807-1808 LDA I,28 /
STA SHOTP`). X is the CALLER's slot: 0-11 via MOTION's per-segment PLAY (`:1449`), 13 via
BUGMV (`:417`), **12 via ANTMV (`:107-108`) — the flea that kills the player dies WITH
him.** Consequences the reference branch pins: a MOTION-stamped segment ends its frame at
0xFE (EXPLOD `:31` runs after MOTION `:30`); BUGMV/ANTMV stamps hold 0xFF to frame end
(EXPLOD already ran); SHOOT's `:2177-2178` skips the stamped slot, so nothing scores on a
death frame.

**Amendment (found by a-2's review probe, NOT in the filed title):** the merged `156430e`
resolves the slot-12 dual-window frame AGAINST the ROM. Its single pre-SHOOT
`checkPlayerContact(segs, player, spider, state.flea)` includes the (pre-step) flea, but
the ROM's slot-12 PLAY runs inside ANTMV at mainloop `:37` — AFTER SHOOT (`:34`) and after
ANTMV's own move (`:105` then `:108`), gated off for a dead flea (`:50-56`). Proven by
running the reference suite against `156430e`: a fast flea in both boxes kills the PLAYER
and scores 0 where the cabinet kills the FLEA for 200 (`expected +0 to be 200`); a slow
flea is never sped up (`expected 1 to be 4`). The shipped in-code comment defending the
pre-step check ("Do not 'fix' this by passing the post-step flea") must be corrected — it
generalizes OVRLAP's genuinely-pre-step phasing (BUGMV reading slot 12) to ANTMV's own
PLAY, where it is false.

## The reference branch — what to lift

`fix/cp2-15-frame-order` (`7babb64`) contains, beyond what #35 merged:
- The three PLAY sites with stamps: `playerContactIndex` in centipede.ts (MOTION's
  NCENT-1-descending tie-break; `checkPlayerContact` delegates so the diamond stays in
  one place), spider/flea stamps at their own sites, ONE PLAYEX construction (the cp3-1
  source-scan guard `playerExplode:\s*PLAYER_EXPLODE_START` must stay at exactly 1).
- `tests/frame-order.test.ts` — 10 tests incl. the dual-window suite and the T6a/T6b
  slot-12 asymmetry guards (these two FAIL on current develop; they are the amendment's
  RED, ready-made).
- The ROM death-frame gates: BUGMV `:289-291` / ANTMV `:50-52` skip once the gun is dead.
  NOTE: #35 chose the opposite ("every stepper still runs — no rng-draw shift, replays
  unchanged"). Reconcile deliberately: the ROM says freeze; #35's replay argument is
  real. Route to a ruling rather than silently keeping either.
- A `tests/newhd-factory.test.ts` re-seat (lone head off the gun's column) — needed the
  moment stamps exist, proven green under both codes.
- Dossier sweep: `09-centipede-train.json` cites MOTION's `JSR PLAY` at `:1447` in FOUR
  places; the verified line is `:1449` (a-2 fixed one occurrence pre-supersession).

Expect real conflicts rebasing the reference onto develop — both sides rewrote
stepPlayingFrame. Treat the reference as a spec-with-proofs, not a mergeable branch.

## Acceptance criteria (as filed — epic-cp2.yaml carries no AC list yet)
The filed entry is title-only. Suggested AC shape from the reference record: (1) the
stamps at all three sites with the 0xFE/0xFF explosion-frame observables; (2) the shot
blank incl. a far-away in-flight shot on a contact death; (3) the slot-12 amendment —
fast-flea +200/player-lives, slow-flea no-score-speed-up-then-death, flea-dies-with-him;
(4) no regression, stamps proven by the frame-order dual-window suite going fully green.

---
_Hand-authored from sprint/archive/cp2-15-session-superseded-a2.md; not generated._
