# Story Context: jt9-9

**The egg lifecycle in ONE re-baseline: an EGGWT wait, a hatching uncollected KILL egg, and EGGSCR scored to the victor on the kill**

Epic: jt9 · Points: 7 · Priority: p3 · Workflow: tdd

---

## Problem

Three mechanisms were merged into one story on 2026-08-03 by Architect grooming: jt9-10 (kill-egg scoring), jt9-12's egg half (wait timer), and the baseline of jt5-4's kill-egg fidelity gap.

**THE SOFT-LOCK READING IS WRONG AND WAS MEASURED WRONG TWICE.** This is a FIDELITY gap, not a soft-lock. Per jt5-4's Reviewer (round 2): seed `0xbeef`'s stray egg settles at `posX 219`, pixel Y `128` — the same platform and height as the idle player 2 at `posX 200`, 19 px away. A bare `dir: 1` from that idle player collects it at frame 1535 and clears the wave at frame 1614. All three seeds jt5-4 called "permanently stuck" (`0xbeef`, `0x2468`, `0x1a2b3c4d`) reach wave 3 within 6000 frames once a player moves. Every settled kill-egg observed landed at a pixel Y a player is also observed standing on. The gap is that the ROM does not require a player to move; the port's restriction to `waveEgg === true` is the invention.

### (1) The EGGWT/EGGWT2 wait timer

`eggProcess` (`demo.ts:902`, spawned at `:1160` from a joust kill) carries `eggsLeft` but no wait timer. `stepDemo`'s self-clear hatch (`demo.ts:1288`) matures only wave eggs with `waveEgg === true`. Kill-eggs have no hatch maturation at all. The ROM walks `EGGWT` from `$40` down to `$10` (a walk of late-wave eggs hatching four times sooner), reading `EGGWT` at settlement time (`EGGLND`, JOUSTRV4.SRC:3224) and `EGGWT2` at wave spawn (`ORG $0` decision block, :2761). The port has neither. This mechanism gives settlement time hatch pressure per wave.

**ROM citations (verified at setup):**
- EGGWT: `JOUSTRV4.SRC:3224` `EGGLND LDA EGGWT GET CURRENT WAIT TIME`
- EGGWT2: `JOUSTRV4.SRC:2761` `LDB EGGWT2 INITIAL EGG WAITING TIME`

### (2) The kill-egg hatch — uncollected eggs eventually mature

`eggProcess` carries no `waveEgg: true` tag, so `stepDemo`'s self-clear hatch (`:1288`, filtering for `p.waveEgg === true && willHatch(p.egg)`) never matures kill-eggs. They sit `settled` with `willHatch === true` forever, blocking the wave-clear gate (`:1322`, `!processes.some((p) => p.kind === 'egg')`). The ROM privileges no wave egg's maturation over a kill egg's — in the machine an uncollected egg hatches into a remounting buzzard regardless of provenance. The fix: remove the `waveEgg === true` check. Kill-eggs will now self-mature under the SAME hatch law that matured wave eggs.

**ROM citation (verified at setup):**
- EGGLND: `JOUSTRV4.SRC:3224-3278` (the entire settlement and hatch routine)
- WILLHATCH (the permadeath gate): `egg.ts:275` `return egg.eggsLeft > 0`

### (3) The EGGSCR kill-scoring — last egg is scored to the victor on the kill

`EGGSCR` has TWO call sites (verified at setup; both exist):
- `:3006` — inside DEATH3 (the kill path), at the moment an enemy's last egg (`DEC PEGG,Y / BNE :3000`, :3001-3002) transfers to zero. Triggers immediately, scoring to the victor with NO catch required.
- `:3021` — PLYEGG (the catch path, wired by jt8-4). Triggers on player-vs-egg collision.

**THE VICTOR GUARD:** `BEQ 1$` at :3005 skips scoring when U (the victor's workspace, populated by `LDU ,S` at :3004) is zero — because a lava death has no victor. This is a REAL law, not an edge case.

The port implements the decrement (`spawnEgg` `eggsLeft: victim.eggsLeft - 1`, `egg.ts:141`) and treats `eggsLeft` zero as permadeath (`:275`, `return egg.eggsLeft > 0`), but NOTHING ever scores it. The award and its ladder bump are silently dropped in play. This mechanism wires the kill-scoring path and its victor guard.

**ROM citations (verified at setup):**
```asm
; JOUSTRV4.SRC:2999-3007 — DEATH3 EGGSCR site
    LDA PEGG,U              TRANSFER NBR OF EGG LEFT
    STA PEGG,Y
    DEC PEGG,Y              YOU CAN ONLY SQUEEZE SO MUCH BLOOD FROM AN EGG
    BNE 1$                   BR=YOU CAN GET MORE EGGS
    TFR Y,X
    LDU ,S                  GET VICTORS WORKSPACE (CURRENTLY DIEING ENEMY)
    BEQ 1$
    JSR EGGSCR              SCORE EGG
 1$ PULS X,U,PC
```

---

## Implementation Order (FIXED AND NOT THE ORDER DESCRIBED)

1. **FIRST:** Wire EGGWT/EGGWT2 wait timer to the egg settle. Add `waitTimer?: number` to `EggState`, read EGGWT at settlement time (`settledWaveEgg`), advance by one per frame in `stepDemo`'s egg driver. Mature when timer expires.

2. **SECOND:** Open the hatch to kill-eggs. Remove the `waveEgg === true` check from `stepDemo:1288`. Kill-eggs will now self-mature.

3. **THIRD:** Add the EGGSCR kill-scoring pass. When an enemy's last egg (`eggsLeft → 0`) transfers, emit the score event routed to the correct player, with the victor guard logic.

4. **FOURTH (LAST ONLY):** Re-baseline the FIVE pinned determinism digests. This is its own commit with its own message.

---

## BLAST RADIUS: The Five Pinned Numbers That Will Go RED

**RE-BASELINES, not regressions.** These five are LEGITIMATE and LOAD-BEARING — closing the kill-egg gap turns them red, and that red is expected. Say so in the commit message for each re-baseline.

> ⚠ **THE STORY'S FIFTH PIN DOES NOT EXIST — SM RE-MEASURED AT SETUP (2026-08-03).**
> The story text, and the first draft of this context, both name `entityDigest(0x2468, 200)`.
> **There is no such call site.** `grep -n 'entityDigest(' plugins/joust/tests/audio-thud.test.ts`
> returns exactly four pinned `.toEqual` sites — `(0xbeef, 118)` :1033, `(0x2468, 188)` :1066,
> `(0xbeef, 160)` :1098, `(0x2468, 755)` :1130 — plus one `not.toEqual` discriminator at :1143.
> Frame 200 appears at none of them. The list of five was correctly ENUMERATED and wrong on one
> member; the story description inherited it from jt5-4's filing text.
>
> **SM's reading, which TEA MUST RE-VERIFY rather than adopt:** the intended pin is
> **`entityDigest(0x2468, 755)` (:1130)**, because the two `.toEqual` pins are paired by their
> enclosing test names — `AFTER it, seed 0xbeef has moved to its frozen post-story digest — frame 160`
> (:1083) and `AFTER it, seed 0x2468 has moved to its frozen post-story digest — frame 755` (:1107).
> Those two "AFTER … frozen post-story" tests are the pair jt5-4's Reviewer froze from `not.toEqual`
> into exact `toEqual`, and `(0xbeef, 160)` is one of them. The `(…, 118)` / `(…, 188)` pair is
> labelled `BEFORE the first contact … is bit-identical` and is a different claim.
> **This is a claim, not a measurement of intent.** Confirm it against jt5-4's archive before
> re-baselining, and re-count how many of the four actually move — it may not be exactly five.

### In `plugins/joust/tests/audio-events.test.ts`:

1. **`fingerprint(0xbeef, 2400)`** (:654) — currently certifies a STALLED run (wave 1 stuck at egg). Will move to wave 3+ once kill-eggs mature.

2. **`fingerprint(0x2468, 900)`** (:676) — currently certifies a STALLED run (wave 1 stuck at egg). Will move to wave 3+ once kill-eggs mature.

3. **The third jt5-4 re-baseline** — **CANDIDATE, VERIFY:** `fingerprint(0x1a2b_3c4d, 240)` at :615.
   It is the only other `fingerprint(...).toEqual` pin in the file, and `0x1a2b3c4d` is the third of
   the three seeds the story names as ones jt5-4's Dev called permanently stuck. Confirm against
   jt5-4's archive; a 240-frame run may not reach the divergence at all, in which case this one
   does NOT move and the "five" is four.

### In `plugins/joust/tests/audio-thud.test.ts`:

4. **`entityDigest(0xbeef, 160)`** (:1098) — will diverge when kill-eggs enter the entity stream and hatch.

5. **`entityDigest(0x2468, 755)`** (:1130) — see the correction block above; the story says `200`, which does not exist.

**GUARD LOSS WARNING (half verified, half not):** the story warns that this fifth digest is ONE OF
ONLY THREE guards on the **SNPTHD register-role law**. Since the named site does not exist, the
guard-count claim is **unverified** — establish it yourself against whichever digest you re-baseline.
What SM DID verify is the other half of the warning: the absolute, non-counting assertions added in
jt5-4 rework round 2 **are still present** in `audio-thud.test.ts` —
`'A is X (eligible[1]): OSTXTP sends REG.X UP, :5108'` (:709),
`'P1 is U (eligible[0]): OSTXTP sends REG.U DOWN, :5106'` (:712), and
`'staging A: OSTXTP sends REG.X (=A) up, :5108'` (:749), with the enemy-path control at :758.
Presence is not bite: **mutate the role assignment and confirm those three redden** before you touch
any digest. If they do not, the digest was the only guard and re-baselining it silently removes the law.

---

## Acceptance Criteria

**AC-1: EGGWT/EGGWT2 timer wired**
- `EggState` carries `waitTimer?: number`, initialized by `settledWaveEgg` from the wave-spawn EGGWT2 read.
- `stepDemo`'s egg-process frame driver decrements the timer by 1 per frame when the egg is settled and timer > 0.
- `willHatch(egg)` returns true when timer reaches zero AND `eggsLeft > 0`. A settled egg with timer > 0 does NOT hatch.
- Late-wave eggs hatch sooner: the ROM reads EGGWT `:3224` at settlement, walking it downward per wave. The port reads EGGWT2 (the per-wave initial) at `settledWaveEgg` time and decrements by 1 per frame, matching the ROM's per-frame decrement (`:3267-3269`).

**AC-2: Kill-eggs now self-mature**
- Remove the `waveEgg === true` gate from `stepDemo:1288`. All eggs (wave and kill alike) now mature when `settled && willHatch(egg)`.
- Kill-eggs will hatch into remounting enemies, clearing the wave if no other entities remain.
- A settled kill-egg with `waitTimer === 0 && eggsLeft > 0` matures into a remount enemy, surfacing the egg-hatched cue.

**AC-3: Last egg scores to the victor**
- On `eggsLeft → 0` during any collision (either the kill or a subsequent touch), emit a score event ONLY IF U (victor workspace) exists. This is the BEQ guard.
- The score routed is `eggValue(bumpEggHits(eggsLeft))` where `eggsLeft` is NOW 0 (the last egg). Use the existing `eggScoreEvents` ladder but route through the kill path, not `eggScoreEvents`.
- A lava death (U = null / zero) skips scoring. This is non-blocking to verify: assert that a lava-troll death with zero eggs left emits NO score event, while a player-killed enemy with zero eggs left emits one.

**AC-4: The victor guard holds**
- Tests stage an enemy with `eggsLeft === 1` and kill it (a collision that reduces to zero). Assert a score event is emitted.
- Tests stage a lava-troll death with `eggsLeft === 1`, verify NO score event is emitted (victor guard). This requires `demo` setup that allows a troll to spawn and kill an enemy (`wave >= 4`), or a `forceAdvance` pattern like jt9-1's `dumb-wingbeat.test.ts`.

**AC-5: Separate commits with explicit re-baseline messages**
- Commit 1: EGGWT/EGGWT2 timer mechanism
- Commit 2: Kill-egg hatch (removes waveEgg check)
- Commit 3: EGGSCR kill-scoring
- Commit 4 (last): The re-baseline commit, carrying the message:
  ```
  test: re-baseline five determinism digests — kill-eggs now mature and affect entity ordering

  Closes #jt9-9 fidelity gap: uncollected kill-eggs now hatch into remounting enemies, as per ROM.
  Moves fingerprint(0xbeef, 2400) and fingerprint(0x2468, 900) from stalled-at-wave-1 to wave-3+.
  Moves entityDigest(0xbeef, 160) and entityDigest(0x2468, 755) due to kill-eggs entering the entity stream.
  ```
  Write this message from what you ACTUALLY re-baselined, not from this template — the template's
  own pin list is the corrected one, and the count may be four rather than five (see the blast-radius
  correction block). Naming a digest here that you did not move makes the record false in the same
  way the story's `(0x2468, 200)` was.

**AC-6: The whole joust suite passes green**
- `npx vitest run --project joust` is green. **Do not carry a hard test count into this AC** — the
  "1979" in the first draft was transcribed, not measured, and this story ADDS tests. Re-measure the
  count at the end and report the number you actually saw.
- The suite must pass with AC-1 through AC-5 satisfied. The re-baselined pins WILL turn red during implementation; re-baseline them deliberately and say so.
- Lint clean, build clean, no debug code on branch.
- Verify that the absolute SNPTHD role assertions (AC-5's guard loss warning) still survive once re-baselined, proving the guard still works.

---

## ROM Source Location

Vendored at: `/Users/slabgorb/Projects/a-1/reference/williams-source/joust/JOUSTRV4.SRC`

All line numbers verified at setup (2026-08-03).

