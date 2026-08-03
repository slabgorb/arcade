---
story_id: "jt9-38"
jira_key: "jt9-38"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-38: The egg wave deals TWELVE eggs and hatches WENEMY at a time — port the ROM's egg density (:2778-2822) and the NENEMY/WENEMY hatch gate (:3238-3242)

## Story Details
- **ID:** jt9-38
- **Jira Key:** jt9-38
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T21:50:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T16:55:00Z | 2026-08-03T21:05:44Z | 4h 10m |
| red | 2026-08-03T21:05:44Z | 2026-08-03T21:30:00Z | 24m 16s |
| green | 2026-08-03T21:30:00Z | 2026-08-03T21:40:35Z | 10m 35s |
| review | 2026-08-03T21:40:35Z | 2026-08-03T21:50:10Z | 9m 35s |
| finish | 2026-08-03T21:50:10Z | - | - |

## Story Acceptance Criteria

Reproduced verbatim from `sprint/epic-jt9.yaml`; this block is GENERATED from
`yaml.safe_load(...)['acceptance_criteria']`, so it is byte-identical to the YAML and to
`sprint/context/context-story-jt9-38.md` by construction. It has not been hand-edited.

1. AC-1 WENEMY IS DERIVED, AND IT IS 255 OUTSIDE AN EGG WAVE. A pure helper resolves a wave's WENEMY exactly as the ROM does: 255 for any NON-egg wave (LDA #255 / STA WENEMY "MAXIMIM ENEMIES FOR A NORMAL WAVE", WNRM JOUSTRV4.SRC:1991-1992, reached on every wave advance via :1937/:1952/:1955/:1957), and for an EGG wave the three-way nibble select of :2744-2759 - WBOUND's LOW nibble when non-zero, else WBOUND's HIGH nibble, else WLORD's HIGH nibble. Guarded on one wave per branch (wave 5 bounders, wave 15 hunters, wave 60 lords) AND on at least one non-egg wave returning 255. MUTATION: making the non-egg path return the egg-wave value must redden a named test.

2. AC-2 THE EGG WAVE DEALS TWELVE EGGS, INDEPENDENT OF THE WAVE ROW. spawnWaveEggs deals the ROM's twelve - six one-per-ledge over EGLEDG's six entries (LDA #6 / STA PWREGA,U, JOUSTRV4.SRC:2778-2779, the 5$ loop :2780-2804, EGLEDG LEVEL0..LEVEL5 :2910-2915) then six more scattered over the 69-slot EGPTBL (LDA #6 / STA PWREGA,U "6 MORE EGGS TO GO", :2805-2822) - rather than the wave's ground complement. Pinned on BOTH a 6-nibble egg wave and an 8-nibble one (waves 15 and 10) so a complement-shaped regression reddens on each. The port's placement across four PADS (transporter.ts:127-132) against the ROM's six ledges plus 69 slots is a PORT DECISION and is stated as one in a comment at the site, not shipped as if it were the ROM's layout.

3. AC-3 NENEMY IS THE LIVE ENEMY POPULATION, AND IT EXCLUDES BAITERS AND PTERODACTYLS. Modelled from the live process list rather than as a stored counter, which satisfies all six ROM writers by construction (INC :460 attract-only, INC :2193 WCREATE, INC :3242 the hatch commit, DEC :2965 DEATH3, DEC :3080 egg collected with a remount bird already inbound, CLR :975). A guard asserts a live baiter or pterodactyl does NOT count toward the population - the ROM keeps them on a separate NBAIT (INC NBAIT :2111, never NENEMY) and the port matches for free because both are kind ptero processes (demo.ts:1331), so the guard pins a property that is currently free and must stay free.

4. AC-4 A WAVE AT QUOTA DEFERS A MATURED EGG, AND IT IS THE SAME EGG AFTERWARDS. At the exact frame the gate fires, assert by PROCESS IDENTITY that the egg is still there - that id, still a settled egg - and never by a count: jt9-9's Reviewer found a count assertion passing on a REGENERATED egg (a permadeath egg hatched, its bird died, and the NEW egg satisfied length === 1). Ship the POSITIVE CONTROL in the same test: the same fixture one enemy BELOW quota does hatch on that same frame, so a gate that defers everything cannot pass.

5. AC-5 THE DEFERRAL RE-POLLS ONCE PER NAP - TWELVE FRAMES - NOT ONCE PER WAIT AND NOT EVERY FRAME. INC PJOYT,U "SET = 1," (JOUSTRV4.SRC:3238) re-primes the timer to 1 BEFORE the population test, so the branch back to EGGLN2 costs exactly one PCNAP 12 (:3227) - twelve display frames, the port's own EGG_WAIT_NAP_FRAMES (demo.ts:620). Without it the branch would DEC a zero timer to $FF and wait 255 more naps. Assert the gap between two consecutive re-checks is 12 frames, and redden TWO mutants by name: one that re-primes the full EGGWT wait, and one that re-checks on the next frame.

6. AC-6 THE PWHCH DISPOSITION IS RECORDED IN WRITING, AND IF DESCOPED IT IS FILED. LDA #2 / STA PWHCH,U "NUMBER OF PRE-MATURE EGG HATCHINGS" (JOUSTRV4.SRC:2776-2777), consumed in CREGG at :2888-2894 (DEC PWHCH / BMI / VRAND / MUL / NEGA / ADDA PJOYT,Y), gives two of the twelve eggs a randomly-shortened hatch time. It is the third unmodelled piece of the same block and SM did not decide it. TEA states explicitly whether it is in scope; the recommendation is OUT (it consumes the RNG, so folding it in moves the re-baseline a second time). If out, it ends with a filed story id - SM owns that at finish, before pf sprint story finish archives the session.

7. AC-7 THE DETERMINISM RE-BASELINE LANDS AS ITS OWN COMMIT AND ITS NUMBERS ARE RE-FOUND, NOT NUDGED. Per this epic's standing rule. Re-run the seeded sweeps and take the moved fixtures from that run rather than pasting whatever the new code prints; name in the commit message which seeds moved and why. Separately, confirm a seeded EGG WAVE still CLEARS with twelve eggs against a quota of six - the wave-clear gate wants no enemies AND no eggs (demo.ts:1481-1484) and now has twice as many eggs to get through. That is a termination property, nothing currently asserts it, and a stall would look like a hung demo rather than a failing test.

## SM Assessment — setup (2026-08-03)

### Board probes

| probe | result |
|---|---|
| `git fetch --prune` then `git branch -r \| grep -Ei jt9` | one hit, `origin/feat/jt9-1-glide-wake-prologue` — a STALE beacon for a story already `done`; nothing for jt9-38 |
| `ls /Users/slabgorb/Projects/a-*/.session/*-session.md` | one live sibling session: `a-2` on `sw8-27` (star-wars). No overlap with joust. |
| merge gate / epic status on `origin/main` | jt9-38 `backlog`, unclaimed |
| dev port 5270 listener (`lsof -nP -iTCP:5270 -sTCP:LISTEN -t`, then `-d cwd`) | held by **this** checkout, `a-1` |
| baseline `npx vitest run --project joust` | **2577 passed / 2577**, 108 files |

The stale `feat/jt9-1-…` beacon is jt9-1's finish-phase leftover, not this story's; noted,
not touched.

### Predecessor audit (jt9-9's findings table, per the standing rule)

jt9-9's Reviewer filed exactly two out-of-scope findings and **both reached the board** —
`jt9-38` (this story) and `jt9-39` (`ROW_DISPOSITION` guard generality + the `owner`-string
drift). Verified by parsing `sprint/epic-jt9.yaml`, not by reading the archived prose. No
row was routed nowhere. jt9-9's own TEA finding about `LAVTIM`/`LAVGRA` carrying a stale
`uf1-10` owner is named inside jt9-39's description, so it has a real owner too.

### Measurement of the filing's falsifiable claims

The filing was seven sentences of ROM citation. **Every ROM line and comment it quoted
verified line-exact** — `:3236-3237`, `:3239`, `:3240`, `:3241`, `:3242`, `:2759`,
`:2761` — as did "NENEMY has no port equivalent yet" (the only occurrence in
`plugins/joust/src` is `assertWaveEndClean`'s `activeEnemies` parameter, `wave.ts:389`) and
"NOT A REGRESSION". Recording that explicitly so the next reader does not re-run the sweep.

Four things did not survive, and they are written up in full at the top of
`sprint/context/context-story-jt9-38.md`:

1. **`WENEMY` is 255 in every non-egg wave.** `WNRM` — `LDA #255 / STA WENEMY`
   *"MAXIMIM ENEMIES FOR A NORMAL WAVE"*, `:1991-1992` — is reached on every wave advance
   (all four routes converge: `:1937`, `:1952`, `:1955`, `:1957`), and only the egg-wave
   setup at `:2759` overwrites it. So the filing's headline complaint describes **faithful**
   behaviour for every normal wave, which is precisely where jt9-9's kill-eggs live.
2. **"WENEMY is already modelled in the port" is false** — zero hits for `WENEMY` in
   `plugins/joust/src`. The four WAVTBL nibbles are modelled; the ROM *derives* `WENEMY`
   from them by the three-way branch at `:2744-2759`. That derivation is unwritten work.
3. **The cited span starts one line late.** `:3238 INC PJOYT,U` *"SET = 1,"* is what makes
   the deferral a one-nap re-poll — twelve display frames, the port's own
   `EGG_WAIT_NAP_FRAMES` (`demo.ts:620`) — rather than a fresh `EGGWT` wait or a per-frame
   spin. Without it the branch would `DEC` a zero timer to `$FF`.
4. **The gate as filed would have shipped DORMANT**, and this is what re-scoped the story.
   See below.

### The measurement that re-scoped it, and the user's ruling

`WENEMY`'s own ROM comment is *"NUMBER OF ENEMIES TO HATCH AT A TIME"* (`:2759`), so it can
only bite when more eggs exist than `WENEMY`. The port's `spawnWaveEggs` (`demo.ts:669-679`)
deals `bounders + hunters + lords` eggs. Checked against **all eighteen** egg waves
(`status: 0x08`, every fifth wave from 5) rather than a sample, because "each of these N" is
exactly the quantifier that fails for one member: every egg row carries exactly one non-zero
ground nibble, so the ROM's derived `WENEMY` equals the port's egg count in **every** one of
them (6 for waves 5/15/20/25/30/60/65/70/75; 8 for 10/35/40/45/50/55/80/85/90).

Population is conserved across the port's cycle — a death removes one enemy, that egg's
hatch restores one — so `NENEMY` tops out at the eggs dealt and the last egg hatches at
`NENEMY = WENEMY - 1`. **`NENEMY >= WENEMY` is unreachable.** Building the gate alone would
have shipped a correct guard no seeded run can exercise: the sw8-19 "zero blast radius"
shape one level worse, because it would be unobservable in the *game*, not just in the
tests.

The ROM's own answer is density: an egg wave deals **twelve** eggs — six one-per-ledge over
`EGLEDG`'s six entries (`LDA #6 / STA PWREGA,U`, `:2778-2779`, loop `:2780-2804`, table
`:2910-2915`), then `LDA #6 / STA PWREGA,U` *"6 MORE EGGS TO GO"* (`:2805-2806`) and six
more across the 69-slot `EGPTBL` (`:2807-2822`). Both sixes are literal immediates,
independent of the wave row.

Three dispositions went to the user with that census attached — fold the density in and
re-point; build the gate alone against a fabricated state and file the density; or re-scope
this story to the density and file the gate. **The user ruled: fold the density in, re-point
3 → 5.** Applied: `--title`, `--points 5`, `--description` rewritten, seven ACs derived, and
`--status in_progress --started 2026-08-03`.

**The title was rewritten too.** A re-scope that leaves the title advertising the old scope
is half a re-scope (the uf1-9/jt5-8 precedent). It now names both halves and carries the
corrected span `:3238-3242`. The original filing text is not lost — it survives verbatim in
`sprint/archive/jt9-9-session.md` under "Filed, with story ids".

### One observation handed over as a QUESTION, not as a fact

`LDA #2 / STA PWHCH,U` *"NUMBER OF PRE-MATURE EGG HATCHINGS"* (`:2776-2777`), consumed in
`CREGG` at `:2888-2894`, gives two of the twelve eggs a randomly-shortened hatch time. It is
the third unmodelled piece of the same block and sits between the two halves this story
builds. **SM did not determine whether it belongs here.** It is AC-6: TEA states the
disposition in writing, the recommendation is OUT (it consumes the RNG, so folding it in
moves the re-baseline a second time), and if it is descoped it ends with a filed story id —
SM's, before `story finish`.

### What TEA inherits, stated plainly

- Baseline is **2577/2577 green** on `--project joust`, measured at 16:47 today. It is a
  claim with a timestamp; re-measure before treating any red as yours.
- The gate cannot be observed in a seeded run **until AC-2 lands**. Build the density first
  or the RED test for AC-4 has no reachable fixture.
- AC-4's identity assertion is not a style preference: jt9-9's Reviewer caught a count
  assertion passing on a **regenerated** egg. Assert the id, stop at the moment, and ship
  the positive control in the same test.
- AC-7's termination check is a real risk, not ceremony — twelve eggs against a quota of six
  doubles what the wave-clear gate (`demo.ts:1481-1484`) has to get through, and a stall
  presents as a hung demo rather than a failing test.

### Pre-handoff checklist

- [x] Session file exists with all header fields present
- [x] Story context written with the measured background, the corrections and the ACs
- [x] ACs byte-identical across YAML / context / session — verified by a `python3` `in`
      test against `yaml.safe_load`, not by grep
- [x] Story stamped `in_progress` and verified by parsing
- [x] Claim pushed: the stamp + context to `main`, and an empty beacon branch
- [x] Jira: N/A — issue tracking is local `sprint/` YAML

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `plugins/joust/tests/demo-jt9-38.test.ts` — the behavioural suite (new, 17 tests)
- `plugins/joust/tests/demo-jt9-38-source.test.ts` — the ROM provenance suite (new, 33 tests)
- `plugins/joust/tests/demo-jt4-5.test.ts` — jt4-5's complement pin, INVERTED (existing)
- `plugins/joust/tests/helpers/egg-contract.ts` — mirror fix: `waitFrames` (existing)
- `plugins/joust/README.md` — the derived test-FILE count, 108 -> 110 (apparatus)

**Tests Written:** 50 across 7 ACs. **Status: RED** — 12 failing, 2615 passing, **2627 collected**.
Orchestrator 390/390. `npm run lint` clean. **Production untouched** (`git diff --stat
plugins/joust/src/core/` is empty; `demo.ts` md5 `c86e76a4…` unchanged from before the phase).

### The measurement that shaped the whole suite

SM's setup said the gate would ship dormant. I did not take that on trust — I probed the real
seeded demo, and the answer was sharper than the argument.

| probe | result |
|---|---|
| reachable wave counters | `1-9, 16-25, 32-41, 48-57, 64-65 …` — the counter is BCD, so decimal "wave 10" is **not reachable** |
| egg-typed among them | 5, 20, 25, 35, 40, 50, 55, 65 |
| wave 5 today, seeds `0x1234`/`0xbeef`/`0x2468` | all **six** eggs mature on the SAME frame (**f=624**) with **zero** enemies alive |
| so the gate | never fires: the sixth hatches at a population of 5 against a quota of 6 |
| wave 5 with the density at twelve | `hatched=12` at f=624 — **six must defer** — plus deferrals at f=1403/1738/2694 with 10-11 alive |

**And that produced the mutant the suite is built around.** Because every egg matures on ONE
frame, the gate is only a gate if the population rises **within** the frame — the ROM's
`INC NENEMY` (`JOUSTRV4.SRC:3242`) runs on the pass that hatches, not once per frame. An
implementation that counts enemies once before the hatch pass lets all twelve through and is
indistinguishable from no gate at all. It is the natural implementation, and `AC-2/4` kills it.

Blast radius of the density alone, measured by applying it: **exactly one test** —
`demo-jt4-5.test.ts:69`, which asserted the opposite of AC-2.

### Two defects found by RUNNING a candidate, neither in the filing

**1. The quota lookup kills the cabinet at the BCD rollover.** `waveRowAt` refuses a wave < 1 and
the hundredth wave's counter is `0x00`.

| form | result |
|---|---|
| resolved EAGERLY, once per frame | reddens the two existing R2-3 "the cabinet must not die" guards in `difficulty-wiring.test.ts` — 2 failed / 2625 |
| resolved LAZILY, on the first hatch decision | **whole project green, 2625/2625** — and the crash is still there, only hidden: those fixtures stage a falling ENEMY, not an egg |
| lazily, staged with a ripe EGG at counter `0x00` | still throws `there is no wave 0 — waves are 1-based` |

So the lazy form passes every guard in the tree and ships a crash. I pinned the **invariant**
(`a settled egg maturing at the ROLLED counter does not throw`) and left the mechanism to Dev —
see the Delivery Finding for the two options and why I did not choose.

**2. Writing the ROM immediate hash-255 in a `demo.ts` comment trips the cp2-1 colour denylist.**
`demo-source.test.ts:145` scans the paint path for `#[0-9a-fA-F]{3,8}` and reads comments, so the
ROM operand parses as a hex colour. Reword it as "LDA immediate 255". This costs a debugging
session otherwise; `wave.ts` is not on the scanned path, so the same text is fine there.

### Why the jt4-5 pin was inverted HERE and not left for GREEN

`demo-jt4-5.test.ts:69` asserted `eggCount === groundComplement` — the exact opposite of AC-2. A
guard like that stays green through the whole build and reds only at the end, at which point the
cheapest way back to green is to undo the story's own AC while the suite reports success. It is
inverted in RED with an inline comment naming this story and the reason, so Dev cannot read it as
collateral damage.

### The twelve is DERIVED, not transcribed

`12` is the only constant this story adds, and a test that reads two `LDA #6`s and asserts 12 is a
transcription checking a transcription. The provenance suite walks the WAVEGG placement block,
collects each `STA PWREGA,U` with the immediate that primed it, asserts there are exactly **two**
loops carrying `[6, 6]`, and multiplies. Corroborated independently by reading `EGLEDG` to its own
end (six rows) rather than to a pinned extent.

### Mutation battery — 11 mutants against a verified candidate

Every mutant caught, **each by a different set of tests**, with the collected count stable at 2627
throughout (so no result came from a file that silently stopped collecting).

| # | mutant | caught by |
|---|---|---|
| M1 | population never increments (count once per frame) | the twelve-maturity test + its control |
| M2 | `>= quota` -> `> quota` | 5 tests across three describes |
| M3 | defer re-primes ONE frame | both AC-5 tests |
| M4 | defer re-primes the FULL wait | both AC-5 tests |
| M5 | population counts pteros too | the AC-3 ptero test |
| M6 | `wenemyFor` SUMS the nibbles on an egg wave | the SYNTHETIC-row test **only** |
| M7 | `wenemyFor` drops the 255 branch (gate every wave) | both AC-1 non-egg tests + the crowded-normal-wave guard |
| M8 | density reverts to the ground complement | 3 tests incl. the inverted jt4-5 pin |
| M9 | density is a WRONG constant (24, not the old 6) | the same 3 |
| M10 | `wenemyFor` always takes the HIGH nibble | 3 tests |
| M11 | rollover guard removed | the rollover invariant **only** |

M6 is the one worth noting: **no real row can catch it.** All eighteen shipped egg rows carry
exactly one non-zero ground nibble, so `bounders + hunters + lords` agrees with the ROM's
three-way select on every one of them. Only a fabricated row separates them, which is why AC-1
carries a synthetic-row test and an explicit disclosure test asserting that one-nibble property.

A separate 6-mutant battery on the provenance suite caught 5. The sixth — replacing the `EGLEDG`
label-find with the literal `2910 - 1` — **survived and is an equivalent mutant**: EGLEDG really is
at that line, and no assertion can observe the difference. Recorded in the file with "do not add
one", and the assertion message was corrected from "must be found by its label" (which it does not
prove) to "is present in the source" (which it does).

### The 28 green-on-arrival tests, and why each passes

Per the standing rule, the passes are where vacuity hides. Three of these pass **for the wrong
reason today** and are the story's design, not filler:

- `five enemies plus three pteros … the egg hatches` — green because nothing gates yet. Its
  partner (`six enemies and NO pteros defers`) is RED, and the pair is what makes it discriminating.
  M5 proves it bites.
- `twenty enemies in a non-egg wave still let a settled kill-egg hatch` — green because nothing
  gates yet. This is the guard that must STAY green under the fix; M7 reddens it.
- `a settled egg maturing at the ROLLED counter does not throw` — green because no lookup exists
  yet. M11 reddens it.

The rest are the ROM provenance suite (33, all real reads — `describe.skipIf(!vendoredAvailable)`
did NOT skip; 33 tests ran) plus the negative control and the one-nibble disclosure.

### What remains for Dev — a VERIFIED candidate, not a design

The diff below was applied uncommitted, run, mutated 11 ways and reverted (`demo.ts` restored
byte-identical by md5). Under it the whole project is **2627/2627 green**. Applying the refactor
and committing it are separable, and TDD wants them separated — so it is here rather than in the
tree.

The verified diff, embedded here rather than left in a session-scoped scratchpad (NOTE the three traps listed below it — the diff is reproduced as it was RUN, including its own defects, so do not paste it blind):

```diff
diff --git a/plugins/joust/src/core/demo.ts b/plugins/joust/src/core/demo.ts
index 8ccc9cd..7265d2a 100644
--- a/plugins/joust/src/core/demo.ts
+++ b/plugins/joust/src/core/demo.ts
@@ -69,6 +69,7 @@ import { trollSpawnable } from './troll.js'
 import { seedBaiterClock, stepBaiterClock, NAP_FRAMES, type BaiterClock } from './baiter.js'
 import {
   waveRowAt,
+  wenemyFor,
   seedWaveBudget,
   emytimForWave,
   waveBeats,
@@ -667,9 +668,9 @@ function settledWaveEgg(posX: number, feetY: number): EggState {
  * the pteros (+$80) and the kill-eggs ($1_0000+).
  */
 function spawnWaveEggs(waveNumber: number): DemoProcess[] {
-  const complement = enemyTypesForWave(waveRowAt(waveNumber)).length
+  const EGG_WAVE_EGGS = 12 // :2778-2779 six per ledge + :2805-2806 six more
   const eggs: DemoProcess[] = []
-  for (let i = 0; i < complement; i++) {
+  for (let i = 0; i < EGG_WAVE_EGGS; i++) {
     const pad = PADS[i % PADS.length]
     // `waveEgg` tags the complement egg so the self-clear hatch (stepDemo) serves it the
     // EGGWT2 egg-wave wait rather than the EGGWT a landing egg takes. Since jt9-9 the tag no
@@ -1441,6 +1442,8 @@ export function stepDemo(demo: DemoState, inputs?: Record<number, PlayerInput>):
   // at `eggsLeft === 0` the enemy is permanently dead (`BNE 1$`, :3002) and its egg can only
   // ever be collected, never hatched. Deleting the whole conjunction would resurrect dead
   // enemies forever.
+  let quota: number | null = null
+  let population = processes.filter((p) => p.kind === 'enemy').length
   processes = processes.flatMap((p) => {
     if (!(p.kind === 'egg' && p.egg?.settled === true && willHatch(p.egg))) return [p]
     // EGGWT2 for an egg an EGG WAVE dealt out, EGGWT for one that landed here.
@@ -1448,6 +1451,17 @@ export function stepDemo(demo: DemoState, inputs?: Record<number, PlayerInput>):
     // `DEC PJOYT,U / BNE EGGLN2` (:3236-3237) — still waiting, so still an egg.
     const remaining = wait - 1
     if (remaining > 0) return [{ ...p, egg: { ...p.egg, waitFrames: remaining } }]
+    // `LDA NENEMY / CMPA WENEMY / BHS EGGLN2` (:3239-3241) — at quota, back round the
+    // loop, re-primed to ONE nap by `INC PJOYT,U  SET = 1,` (:3238) + `PCNAP 12` (:3227).
+    // Resolved LAZILY and only when an egg actually reaches the decision — the ROM
+    // reads WENEMY at the test, not every frame — and guarded at the BCD rollover:
+    // on the hundredth wave the counter is 0x00, which `waveRowAt` refuses. 255 is
+    // the ROM's own normal-wave default (WNRM's LDA immediate 255, :1991-1992) and
+    // gates nothing,
+    // so the unresolvable wave behaves exactly like a wave with no quota.
+    quota ??= demo.wave >= 1 ? wenemyFor(waveRowAt(demo.wave)) : 255
+    if (population >= quota) return [{ ...p, egg: { ...p.egg, waitFrames: EGG_WAIT_NAP_FRAMES } }]
+    population += 1 // `INC NENEMY  1 MORE ENEMY COMMING UP` (:3242) — per hatch, not per frame
     // SNEGGH "EGG HATCHING SOUND" (:8099) — the maturing egg, not the remount
     // bird's flight in. One cue per egg that matured this frame.
     cues.push({ type: 'egg-hatched' })
diff --git a/plugins/joust/src/core/wave.ts b/plugins/joust/src/core/wave.ts
index 71b1c9b..c3542be 100644
--- a/plugins/joust/src/core/wave.ts
+++ b/plugins/joust/src/core/wave.ts
@@ -179,6 +179,23 @@ const WAVE_LOOP_LEN = WAVE_TABLE_LEN - WAVE_LOOP_START + 1 // 10
  * wave 81's row and so on forever. Throws for a wave < 1 — wave 0 is never played
  * (PWAVE advances before the first wave, JOUSTRV4.SRC:1878).
  */
+/**
+ * WENEMY — how many enemies this wave may hold at once (JOUSTRV4.SRC).
+ *
+ * A NORMAL wave has no quota: WNRM loads `#255` (`LDA #255 / STA WENEMY
+ * MAXIMIM ENEMIES FOR A NORMAL WAVE`, :1991-1992), and every wave-advance path
+ * converges on WNRM (:1937/:1952/:1955/:1957). Only the EGG-wave setup overwrites
+ * it, with the row's own ground nibble (`STA WENEMY  NUMBER OF ENEMIES TO HATCH
+ * AT A TIME`, :2759) selected three ways at :2744-2759 — WBOUND's LOW nibble if
+ * non-zero, else WBOUND's HIGH nibble, else WLORD's HIGH nibble.
+ */
+export function wenemyFor(row: WaveRow): number {
+  if (rawWaveType(row.status) !== 'egg') return 255
+  const byte0 = (row.bounders << 4) | row.hunters
+  if (byte0 !== 0) return (byte0 & 0x0f) !== 0 ? byte0 & 0x0f : (byte0 >> 4) & 0x0f
+  return (((row.lords << 4) | row.pursuers) >> 4) & 0x0f
+}
+
 export function waveRowAt(waveNumber: number): WaveRow {
   if (!Number.isInteger(waveNumber) || waveNumber < 1) {
     throw new Error(`there is no wave ${waveNumber} — waves are 1-based and wave 0 is never played`)
```

Shape:

1. `wave.ts` — `export function wenemyFor(row: WaveRow): number`: `rawWaveType(row.status) !== 'egg'`
   -> `255`; else `byte0 = (bounders << 4) | hunters`, low nibble if non-zero, else high nibble,
   else `WLORD`'s high nibble.
2. `demo.ts` `spawnWaveEggs` — the loop bound becomes `12`, not the complement.
3. `demo.ts` `stepDemo` — before the hatch `flatMap`, `let quota: number | null = null` and
   `let population = processes.filter((p) => p.kind === 'enemy').length`; inside, after the
   `remaining > 0` early return, resolve the quota lazily, `if (population >= quota)` return the egg
   with `waitFrames: EGG_WAIT_NAP_FRAMES`, else `population += 1` and hatch.

**Three traps in my own candidate, so you do not re-find them:**

- My inserted docblock landed **between `waveRowAt`'s docblock and `waveRowAt`**, orphaning it —
  the same defect jt9-9's Reviewer caught on `resolveContacts`. Put `wenemyFor` after `waveRowAt`,
  not before it.
- The rollover comment wrapped badly mid-sentence; rewrite it rather than pasting.
- Do not write the ROM immediate with a leading hash anywhere in `demo.ts` (defect 2 above).

**Ordering:** land the density (AC-2) before the gate. The gate's behavioural tests have no
reachable fixture until twelve eggs exist — that is the whole reason the two halves are one story.

### Rule Coverage

| Rule / project law | Test(s) | Status |
|---|---|---|
| pure `src/core` — no shell imports in the new seam | existing `purity-scanner.test.ts` (unchanged, green) | green |
| ROM claims carry a verbatim line citation | `demo-jt9-38-source.test.ts` — 33 pins | green |
| a derived constant is derived, not transcribed | `DERIVES the twelve` | green |
| a table's extent is read from both sides | `EGLEDG really has six ledge entries` | green |
| a "count is zero"/absence criterion ships its positive control | AC-2/4 control, AC-3 control, AC-4 rollover control | 1 green / 2 red |
| identity, never a count, for a survivor | `the six that remain are the SAME eggs` | red |
| citations spell the filename (no bare colon spans) | every ROM cite in both new files | green |
| new test files feed the derived FILE-count guard | README 108 -> 110 | green |

**Rules checked:** 8 of 8 applicable. **Self-check:** no vacuous assertions found in my own tests;
one over-claiming assertion MESSAGE found by mutation (the EGLEDG label-find) and corrected.

**Handoff:** To Bicycle Repair Man (Dev) for GREEN.


## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/wave.ts` — `wenemyFor(row)`: 255 for a normal wave, the ROM's three-way
  nibble select for an egg wave. Placed AFTER `waveRowAt`, not before it, so `waveRowAt`'s docblock
  is not orphaned (TEA's trap 1).
- `plugins/joust/src/core/demo.ts` — `spawnWaveEggs` deals `6 + 6`; the hatch pass gates on a
  population that rises within the pass; the `spawnWaveEggs` docblock rewritten (see deviations).

**Tests:** 2627/2627 passing (GREEN). Lint clean. Orchestrator 390/390.
**Landed on:** `main` (`aa08507`), trunk-based, pushed. No branch, no PR.

### The gate is LIVE — proved, not inferred from a green suite

An all-green suite after a change billed as disruptive is indistinguishable from a change that does
nothing, so the liveness proof is positive and separate from the tests:

| seed | wave 5 entry | at f=624 | held |
|---|---|---|---|
| `0x1234` | 12 eggs | 6 hatch, enemies 0 -> 6 | 6, and `heldAreOriginals=true` |
| `0xbeef` | 12 eggs | 6 hatch, enemies 0 -> 6 | 6, same |
| `0x2468` | 12 eggs | 6 hatch, enemies 0 -> 6 | 6, same |

The held six stay held while the population sits at quota, which is the mechanic: an egg wave drains
only as the player COLLECTS eggs, because every kill returns an egg that re-hatches into the slot the
death freed. With idle inputs it does not clear — and it did not clear before this change either
(6 eggs, 6 enemies, no advance), so that is the ROM's unattended egg wave, not a stall this story
introduced.

### AC-7 predicted a determinism re-baseline. There is none, and that is measured

Natural seeded play reaches **wave 1-2 in 3000 frames** (`0xbeef` -> 1, `0x2468` -> 2,
`0x1a2b_3c4d` -> 2) and the first egg wave is wave 5. No fingerprint or entity digest can reach the
changed code. **Zero pins moved**, and the collected test count is unchanged at 2627 — which is the
right cross-check, because "no pins moved" and "the suite stopped seeing the tests" look identical.

So this story is **one commit, not two**. AC-7 reserved a second commit for the re-baseline; it has
nothing to carry, and manufacturing one would put a fabricated re-baseline in the permanent record.
This is the jt9-1 shape exactly — a determinism warning reasoned by analogy from a story that
perturbed every wake, applied to one that changes a wave most runs never reach.

### A false claim in MY OWN comment, caught by mutating it

I wrote that an eager quota lookup "takes the cabinet down (the R2-3 laws)" immediately beside the
`demo.wave >= 1` guard — which implies the guard is what protects those laws. It is not. Measured,
each by making the change and running the project:

| form | reds |
|---|---|
| resolve once per frame (truly eager) | **3** — both R2-3 laws in `difficulty-wiring.test.ts` **and** the rollover guard |
| drop the `>= 1` test, keep it lazy | **1** — the rollover guard only |

Laziness is what keeps a frame with no ripe egg out of the lookup, which is what the R2-3 fixtures
need (they stage a falling ENEMY and never reach the line — exactly how the crash hid from TEA's
first candidate). The `>= 1` test is what protects an egg that matures AT the rolled counter. Two
halves, two properties. The comment now says both, with the counts, so the next reader can re-run
the strings rather than reconstruct the intent.

### Mutation battery against the SHIPPED code — 5/5 caught

TEA's battery ran against a candidate that is not byte-identical to what shipped, so it was re-run
here. Collected count stable at 2627 for every mutant.

| # | mutant | caught by |
|---|---|---|
| D1 | drop the rollover guard | the rollover guard **only** |
| D2 | population never increments (count once per frame) | the twelve-maturity test + its control |
| D3 | density `6 + 6` -> `6` | 3 tests incl. the inverted jt4-5 pin |
| D4 | `wenemyFor` drops the 255 branch | both AC-1 non-egg tests + the crowded-normal-wave guard |
| D5 | defer re-primes the full wait | both AC-5 tests |

### The citation blast radius: 51 refs moved, and I deliberately did NOT re-anchor them

My insertions shift `demo.ts` line numbers, so 51 `demo.ts:<line>` refs across 16 files now point one
or twenty lines off. I built the difflib map and re-anchored all 51 — the shift histogram was clean
(`{+20: 33, +1: 18}`, two values matching my two insertion points, nothing lost) — and then **spot-
checked the results and reverted the whole thing.**

The spot-checks did not resolve, and the reason is the finding: **these citations were already stale
at HEAD.** `HEAD:797` is blank, `HEAD:1288` is `: null`, `HEAD:955` is `toPteroEntity`. Measured
across the checkable subset (refs whose comment quotes a backticked identifier I can look for near
the cited line): **14 of 16 do not resolve at HEAD.**

Re-anchoring preserves a citation's REFERENT, which is mathematically right and informationally
worthless when the referent was already wrong — and it is actively harmful, because a freshly-updated
line number reads as maintained. That is the sw8-19 principle ("worse than uniformly stale, because
the corrected neighbours lend it credibility") arriving from the other side. It would also have wrapped
a 3-file behavioural change in a 16-file churn diff.

Routed to **`jt9-30`**, which owns exactly this — "Comment-body `<file>.ts:<line>` refs in the joust
suite become symbol refs — 86 distinct refs across 30 test files". Mechanism checked, not just theme:
it converts comment-body refs in the joust suite, which is precisely this population. Its counts (86
distinct / 102 occurrences / 30 files) are **unaffected** by this story — I added no new `.ts:<line>`
refs; every citation I wrote is `JOUSTRV4.SRC:`, which jt9-30 hard-excludes. What it does gain is the
staleness rate, which answers its own open question.

**Handoff:** To The Argument Professional (Reviewer) — this workflow routes green -> review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | not spawned — assessed by Reviewer directly | none | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped / disabled (`workflow.reviewer_subagents`) | none | N/A |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped / disabled | none | N/A |
| 4 | reviewer-test-analyzer | Yes | Skipped / disabled | none | N/A |
| 5 | reviewer-comment-analyzer | Yes | Skipped / disabled | none | N/A |
| 6 | reviewer-type-design | Yes | Skipped / disabled | none | N/A |
| 7 | reviewer-security | Yes | Skipped / disabled | none | N/A |
| 8 | reviewer-simplifier | Yes | Skipped / disabled | none | N/A |
| 9 | reviewer-rule-checker | Yes | Skipped / disabled | none | N/A |

**All received:** Yes (1 assessed directly, 8 disabled by project setting)
**Total findings:** 4 confirmed, 0 dismissed, 1 routed as a finish-phase obligation

`pf settings get workflow.reviewer_subagents` reports `preflight: true` and the other eight
`false`. Row 1 is marked "not spawned": this session's instructions bar the Agent tool unless the
user asks for it, so preflight's mechanical work (diff, suite, lint, tree state) was done here
directly rather than delegated — I am not claiming coverage from a subagent that never ran. With
eight specialists disabled, **the review IS the mutation battery below**; re-reading the diff by
hand found none of the four findings.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** `demo.wave` (the BCD counter carried on `DemoState`) → `waveRowAt(demo.wave)`
→ `wenemyFor(row)` → `quota` → compared against a running `population` derived from
`processes.filter(kind === 'enemy')` → decides hatch-vs-defer for each settled egg → new
`DemoProcess[]`. Safe because every input is an integer already on the state, the one throwing call
(`waveRowAt`, on `< 1`) is guarded, and the whole path is pure — no I/O, no shared mutable state, no
async.
**Pattern observed:** the running-counter-inside-the-pass at `plugins/joust/src/core/demo.ts:1470`
(`population += 1` inside the `flatMap` rather than a count taken before it) is the right shape and
is the story's whole mechanism — good pattern, and mutation-proven by both TEA and Dev.
**Error handling:** `wenemyFor` cannot throw — verified by calling it on all 90 rows: **0 threw**,
and the only quota values the whole table produces are **6, 8, 255** (never 0). The one throwing
dependency, `rawWaveType`'s phantom-WBJSR-offset guard, is unreachable from any shipped row.

### Mutation battery — 8 mutants, 2 caught, 6 survived, 3 of those genuinely equivalent

TEA ran 11 and Dev re-ran 5; both batteries targeted the mechanism. I aimed mine at what neither
tried — the FALLBACK VALUES and the PLACEMENT, i.e. the parts that are correct-by-choice rather
than correct-by-derivation. Collected count stable at 2627 for every mutant.

| # | mutant | result |
|---|---|---|
| R1 | rollover fallback `255` -> `0` | **SURVIVED — finding 1** |
| R2 | rollover fallback `255` -> `1` | **SURVIVED — same finding** |
| R3 | all twelve eggs onto ONE pad | **SURVIVED — finding 2** |
| R4 | `quota ??=` -> `quota =` (recompute per egg) | survived — EQUIVALENT |
| R5 | lords branch -> `row.lords` | survived — EQUIVALENT |
| R6 | the deferral drops the `waveEgg` tag | caught (identity test) |
| R7 | `rawWaveType` -> `dispatchWaveType` | survived — EQUIVALENT, finding 4 |
| R8 | density `6 + 6` -> `11` | caught (3 tests) |

### Findings

| Severity | Issue | Location | Fix Required |
|---|---|---|---|
| [MEDIUM] | The rollover fallback VALUE is unguarded — `0` there soft-locks the hundredth wave and ships green | `demo.ts:1476` | assert the quota at the rolled counter admits a hatch |
| [MEDIUM] | Egg PLACEMENT across pads is unguarded — AC-2 required the decision be stated, and it is stated only in prose | `demo.ts:684` | assert the twelve land on more than one pad |
| [MEDIUM] | The stacking's CONSEQUENCE is undisclosed: a stack is collected ATOMICALLY | `demo.ts:676-681` | one sentence in the docblock |
| [LOW] | `wenemyFor` uses `rawWaveType`; its caller's egg test uses `dispatchWaveType` | `wave.ts:220` vs `demo.ts:751` | note the equivalence, or unify |

**Finding 1 — the rollover fallback is a bare value with no guard behind it.**
`quota ??= demo.wave >= 1 ? wenemyFor(waveRowAt(demo.wave)) : 255`. The shipped `255` is right, and
the reasoning in the comment is right. But TEA's rollover test asserts only `.not.toThrow()`, so
**every** non-throwing value passes it — I ran `0` and `1` and the whole project stayed green at
2627. A `0` there makes `population >= quota` true for every egg forever: on the hundredth wave no
settled egg can ever hatch, the clear gate wants no eggs, and the wave becomes unwinnable. That is a
permanent soft-lock shipping green from a one-character edit. This is a coverage gap on correct
code, not a live defect — which is why it is Medium and not High.

**Finding 2 — the placement is prose-only.** Putting all twelve eggs on `PADS[0]` leaves the entire
project green. AC-2 says the placement "is a PORT DECISION and is stated as one in a comment at the
site, not shipped as if it were the ROM's layout" — the comment is there and is honest, but nothing
holds the behaviour it describes. Given finding 3, a single-pad regression would award four ladder
rungs and twelve cues in one frame.

**Finding 3 — the stack is collected ATOMICALLY, and that is not in the disclosure.** Measured, not
argued. The catch loop at `demo.ts:1200-1231` iterates every egg without breaking, so a player
standing on a pad collects the whole stack in one frame:

| | eggs | distinct positions | max stack | one frame on a stacked pad |
|---|---|---|---|---|
| before this story (`3887638`) | 6 | 4 | **2** | 2 collected — score events `250,500`, 2 cues |
| after | 12 | 4 | **3** | 3 collected — score events `250,500,750`, **3 cues** |

So the divergence PRE-EXISTS and this story deepens it by one. It is not a regression jt9-38
introduces, and I am not asking for it to be fixed here. But the docblock says only that the eggs
"stack three per pad" — the reader is not told that a stack collects atomically, climbing three
DEGGS rungs and firing three `egg-collected` cues in a single frame where the machine, spreading
eggs over six ledges and 69 slots, can never do so. That consequence is what a future reader needs
and it is one sentence.

**Finding 4 — a predicate inconsistency that is currently harmless.** `wenemyFor` gates on
`rawWaveType(row.status) !== 'egg'`; the caller that decides to deal eggs at all gates on
`dispatchWaveType(row.status, { p1: true, p2: true }) === 'egg'`. Substituting one for the other
leaves the project green (R7), because egg is the one type that does not degrade by player count.
They are equivalent today and would silently diverge if the degrade laws ever grew an egg case.

### Equivalent mutants — recorded so nobody re-derives them, and NO test should be added

- **R4 (`??=` -> `=`)**: `demo.wave` is constant within a frame, so recomputing the quota per egg is
  observationally identical. The `??=` is a evaluation-count choice, not a behavioural one.
- **R5 (the lords branch -> `row.lords`)**: `((lords << 4) | pursuers) >> 4` **is** `lords` whenever
  `pursuers <= 15`. Verified across the table — max `pursuers` is 15, max `lords` is 10, no nibble
  exceeds 15 — so the two forms cannot be distinguished by any input the decoder can produce. The
  longer form is written to mirror the ROM's byte assembly and that is a legitimate readability
  choice; a test for it would be untestable by construction.
- **R7**: see finding 4.

### Rule Compliance

| Rule (source) | Governed items in the diff | Judgement |
|---|---|---|
| `src/core` is the PURE deterministic simulation; shell concerns stay out (CLAUDE.md) | `wenemyFor`, `spawnWaveEggs`, the hatch pass | **Compliant** — no `window`/`document`/`Date`/`Math.random`; `purity-scanner.test.ts` green |
| ROM claims carry a verbatim citation to the vendored source | 14 new `JOUSTRV4.SRC:` citations across both files | **Compliant** — all 33 pins in `demo-jt9-38-source.test.ts` green, and the citations spell the filename so the nearest-preceding-filename rule cannot mis-bind them |
| No `as any`, no `@ts-ignore`, `.js` on relative imports | the `wenemyFor` import in `demo.ts:72` | **Compliant** — `tsc --noEmit` clean; import is from `'./wave.js'` |
| A guard must be mutation-proven, not assumed | every new assertion | **Compliant for the mechanism** (TEA 11/11, Dev 5/5), **violated for two fallback values** — findings 1 and 2 |
| Extract into `src/shared` only once a second game proves duplication | `wenemyFor` | **Compliant** — joust-only, correctly in `plugins/joust/src/core/wave.ts` |
| Prose in comments is unguarded surface; a claim must be true | the rewritten `spawnWaveEggs` docblock and the gate comment | **Compliant with one gap** — every ROM claim re-checked against the vendored source and correct; the stacking sentence is true but incomplete (finding 3) |

### Observations

- `[VERIFIED]` **`wenemyFor` cannot throw and never returns 0 on real data** — called on all 90 rows:
  0 threw, distinct outputs `{6, 8, 255}`. The soft-lock in finding 1 is reachable only through the
  rollover fallback, not through any table row. Evidence: measured, `wave.ts:214-221`.
- `[VERIFIED]` **the population excludes baiters and pterodactyls, matching NBAIT** — `demo.ts:1470`
  filters `kind === 'enemy'`, and baiters/pteros are `kind: 'ptero'` (`demo.ts:1351`). Complies with
  the ROM-fidelity rule; `JOUSTRV4.SRC:2111` increments NBAIT and never NENEMY.
- `[VERIFIED]` **a dying enemy has already left the population** — `collisionPass` turns a killed
  enemy into `kind: 'dissolve'` (`demo.ts:998`), so it stops counting at the moment of death, which
  is where `DEC NENEMY` sits (`JOUSTRV4.SRC:2965`). No double-count, no phantom slot.
- `[VERIFIED]` **the deferral quantum is 12 frames, not 13** — traced the arithmetic: deferred at F
  with `waitFrames = 12`, frames F+1..F+11 store 11..1, and `remaining === 0` lands the next decision
  at F+12. Matches `PCNAP 12` (`JOUSTRV4.SRC:3227`). Pinned by both AC-5 tests.
- `[VERIFIED]` **egg id namespaces do not collide at twelve** — `0x100 * wave + i` with `i` now 0..11
  (`demo.ts:685`) stays clear of the ptero `+$80` band and the kill-egg `$1_0000+` band.
- `[MEDIUM]` findings 1-3 above. `[LOW]` finding 4.
- `[VERIFIED]` **security / tenant isolation: not applicable, and that is a positive statement rather
  than a skip.** This diff is a pure offline game simulation: no auth, no network, no filesystem, no
  user-supplied data, no tenant concept anywhere in the repo. There is no input to sanitise — the
  only "input" is a wave counter the sim itself produced. Nothing in the diff reads a secret, writes
  a file, or crosses a trust boundary.

### Specialist domains, assessed directly (all eight are disabled by project setting)

Each tag below names the domain, what I did in it, and the outcome. None of these came from a
subagent — the specialists are `false` in `workflow.reviewer_subagents` and none was spawned, so
the coverage is mine and is claimed as mine.

- `[EDGE]` — boundary conditions. Enumerated the quota's edges: `demo.wave === 0` (the BCD
  rollover, guarded), `wave > 90` (loop region, handled by `waveRowAt`), quota `=== 0` (impossible
  from any row — measured `{6, 8, 255}` across all 90), and `population` at exactly the quota
  (the `>=` boundary, pinned by AC-2/4 and by mutant R8 of TEA's battery). **One finding: the
  rollover FALLBACK edge is unguarded — finding 1.**
- `[SILENT]` — swallowed errors and silent fallbacks. The `: 255` arm IS a silent fallback: it
  substitutes a value when a row cannot be resolved and says nothing at runtime. Judged acceptable
  (it is the ROM's own normal-wave value and the alternative is a crash), but it is precisely the
  kind of silent arm that needs a guard — **finding 1 again, reached from a second direction.**
  No other swallowed error: `wenemyFor` has no try/catch and cannot throw (verified on 90 rows).
- `[TEST]` — test quality. Ran an 8-mutant battery aimed at what the two prior batteries did not
  cover. Confirmed the mechanism guards bite (R6, R8 caught) and found **two dead guards (R1/R2,
  R3)** plus **three equivalent mutants** correctly not worth testing (R4, R5, R7). Also confirmed
  the collected count is stable at 2627 under every mutant, so no result came from a file that
  stopped collecting.
- `[DOC]` — documentation. Re-opened every new ROM citation against the vendored source: all
  correct. The rewritten `spawnWaveEggs` docblock correctly narrows a disclaimer this story
  falsified rather than deleting it. **One finding: the stacking disclosure stops one step short of
  the consequence — finding 3.**
- `[TYPE]` — type design and invariants. `wenemyFor(row: WaveRow): number` takes the decoded row
  rather than a wave number, which is what makes the synthetic-row test possible — good choice.
  `quota: number | null` with `??=` is sound (a `0` quota would be assigned and not re-evaluated,
  and `0` is unreachable from real rows). No stringly-typed API, no widened type, no `as any`.
- `[SEC]` — security. Not applicable and stated positively above: pure offline simulation, no auth,
  no I/O, no network, no user-supplied input, no tenant concept in the repo. Nothing in the diff
  crosses a trust boundary. **No tenant-isolation surface exists to audit** — there are no trait
  methods taking data and no structs carrying tenant fields anywhere in this codebase.
- `[SIMPLE]` — unnecessary complexity. `6 + 6` over `12` is deliberate and earns its keep (it
  mirrors the ROM's two literal immediates). The lords branch's `((lords << 4) | pursuers) >> 4`
  reduces to `row.lords` — measured equivalent — and is kept for ROM symmetry; that is a judgement
  call I agree with, recorded so nobody "simplifies" it without knowing it was considered. No dead
  code: `enemyTypesForWave` is still used at its other call site.
- `[RULE]` — project rules. Enumerated in the Rule Compliance table above: six applicable rules,
  every governed item judged. Five compliant; the mutation-proof rule is compliant for the
  mechanism and **violated for two chosen values** (findings 1 and 2).

### Devil's Advocate

Let me argue this is broken. The strongest case starts with the number twelve. It is a literal, and
it is asserted by tests that also hard-code twelve, so the whole edifice rests on the provenance
suite's derivation actually deriving. I re-read that derivation: it walks the WAVEGG block, collects
each `STA PWREGA,U` with the immediate that primed it, and asserts exactly two loops carrying
`[6, 6]`. Cutting its window to one loop reds it. So the number is genuinely derived, and my attack
fails there. Next: the gate's quota. `wenemyFor` is a bit-twiddling function with three branches,
and on real data all three produce the same answer as naively summing the nibbles — which means the
suite could have been green with a wrong derivation forever. TEA saw that and pinned it on a
fabricated row. That attack fails too.

Where the code IS vulnerable is everywhere a value was CHOSEN rather than derived. The rollover
fallback is chosen. The pad placement is chosen. Neither is guarded, and I proved both by mutation:
`0` for the fallback and `PADS[0]` for the placement each leave 2627 tests green. A confused future
maintainer "simplifying" the rollover branch to `: 0` — which looks like the safe, conservative
default, since zero means "no enemies allowed" — ships a hundredth wave that can never be cleared,
and no test in this repo will say a word. That is the realistic failure, and it is realistic
precisely because `0` reads as the cautious choice.

A malicious user has nothing to attack: no input crosses a boundary. A stressed filesystem is
irrelevant; nothing here touches one. The nastiest *user* behaviour is standing on a transporter pad
during an egg wave and collecting three eggs in a single frame — which I measured, which awards
three ladder rungs and three simultaneous audio cues, and which the ROM cannot do. It predates this
story at depth two, so it is not a regression, but the story deepens it while its own comment
describes only the stacking and not the atomic collection. That is the gap between what the code
says about itself and what it does, and this project's whole rap sheet says that gap is where the
next defect hides.

**Handoff:** To SM for finish-story, with a routed chore (below).

### Routed chore — three items, all specified, to be applied before `story finish`

Approved rather than rejected because there is no Critical or High: the implementation is correct
and mutation-proven on its mechanism. What is missing is two assertions and one sentence, and
nothing needs re-deriving — the mutants that must redden are named and were run. **If this chore
does not land, these findings must be re-raised rather than quietly dropped.**

1. **Guard the rollover fallback** (`demo-jt9-38.test.ts`, beside the existing rollover test). The
   existing test asserts `.not.toThrow()`; add that at the rolled counter a ripe egg with the arena
   already holding several enemies still HATCHES — i.e. the fallback admits, not refuses. Must be
   mutation-proven: with `: 0` in `demo.ts` the new assertion reds, and with `: 255` it is green.
2. **Guard the placement** (same file, beside AC-2). Assert the twelve eggs occupy MORE THAN ONE
   distinct `(posX, posY)` — the measured value today is four positions, three eggs each. Must redden
   under `const pad = PADS[0]`.
3. **Complete the disclosure** (`demo.ts`, the `spawnWaveEggs` docblock). Add one sentence to the
   "WHAT IS STILL NOT TRANSCRIBED" paragraph: a stack is collected ATOMICALLY — measured, three eggs
   in one frame give three DEGGS rungs (250/500/750) and three `egg-collected` cues, where the ROM's
   six-ledge/69-slot spread cannot stack at all. Say that it predates this story at depth two.

### Finish-phase obligation the pipeline cannot discharge

**AC-6 is not yet satisfied.** TEA correctly ruled `PWHCH` OUT of scope in writing, with the
mechanism read from `JOUSTRV4.SRC:2888-2894`. The AC's second half — "if out, it ends with a filed
story id" — remains open: `grep` over every epic finds `PWHCH` only inside jt9-38's own description
and AC text, nowhere else. **SM must file it before `pf sprint story finish` archives the session**,
per the standing rule that a descope ends with a story id. Dev's citation finding (routed to
`jt9-30`) similarly wants the staleness rate written into that story's description, not just into
an archived session.

## Design Deviations

### Dev (implementation)
- **`spawnWaveEggs`'s docblock rewritten, not just extended — it disclaimed the count this story transcribes**
  - Spec source: `plugins/joust/src/core/demo.ts`, the jt4-4/jt4-5 docblock on `spawnWaveEggs`
  - Spec text: "the byte-exact EGG1 placement table (:2737-2776) is untranscribed — TEA's design
    deviation pins the 'enters as eggs' observable, not the exact ledge coordinates / **the
    6-per-ledge count** / the 2 pre-mature hatchings"
  - Implementation: the clause naming the 6-per-ledge count as untranscribed was removed, because
    this story transcribes it; the disclaimer was NARROWED to what remains true (the EGG1
    coordinates — twelve eggs stack three per pad against the ROM's six ledges plus 69 slots — and
    the `PWHCH` pre-mature hatchings) rather than deleted.
  - Rationale: no test asserts that sentence, so it would have shipped false and green. Prose is the
    unguarded surface, and a docblock that disclaims work the function now does is worse than no
    docblock.
  - Severity: minor
  - Forward impact: whoever picks up `PWHCH` or a truer egg placement will find both named here as
    still-open, with their ROM lines.

- **AC-7's re-baseline commit was NOT made, because there is no re-baseline**
  - Spec source: context-story-jt9-38.md, AC-7
  - Spec text: "THE DETERMINISM RE-BASELINE LANDS AS ITS OWN COMMIT AND ITS NUMBERS ARE RE-FOUND"
  - Implementation: one commit. Measured that natural seeded play reaches wave 1-2 in 3000 frames
    while the first egg wave is wave 5, so no seeded fixture can observe the change; zero pins moved
    and the collected count is unchanged at 2627.
  - Rationale: the AC conditions the commit on a re-baseline existing. Splitting an empty change out
    into a ceremonial second commit would put a fabricated re-baseline into the permanent record.
  - Severity: minor
  - Forward impact: AC-7's other half (an egg wave still CLEARS) is answered in the assessment and is
    unchanged from before this story — an unattended egg wave did not clear at 6 eggs either.

- **The 51 shifted `demo.ts:<line>` citations were left stale rather than re-anchored**
  - Spec source: the standing repo rule that a comment insertion re-anchors the citations it moves
    (sw8-19 finish; TEA's own note that citations spell the filename)
  - Spec text: "All 11 were shifted by hand, each replacement asserting `count == 1`"
  - Implementation: built the map, re-anchored all 51, spot-checked, found 14 of 16 checkable refs
    already stale at HEAD, and reverted the re-anchor entirely. Routed to `jt9-30` with the
    measurement instead.
  - Rationale: shifting an already-wrong pointer preserves a wrong referent while making it look
    maintained. The population is pre-existing rot with a named owner, not damage this story caused.
  - Severity: minor
  - Forward impact: `jt9-30`'s counts are unaffected (no new `.ts:<line>` refs were added), but its
    open question — convert ALL comment-body refs on principle, or only the demonstrably-stale ones —
    now has evidence: 14 of 16 sampled were already stale, which argues for "all, on principle".

### TEA (test design)

- **AC-6 is answered rather than deferred to Dev, and the answer is OUT of scope**
  - Spec source: context-story-jt9-38.md, AC-6
  - Spec text: "TEA states explicitly whether it is in scope; the recommendation is OUT"
  - Implementation: ruled OUT, with the mechanism read from `JOUSTRV4.SRC:2888-2894` rather than
    from the recommendation; no test written for `PWHCH`. Recorded as a Delivery Finding so SM can
    file it before the finish ceremony.
  - Rationale: the AC asks for a written disposition, not for code; `CREGG` consumes the RNG per
    egg, so folding it in would move the determinism re-baseline twice inside one story.
  - Severity: minor
  - Forward impact: the follow-up must be filed with a story id before `story finish`, or the
    finding is lost — the descope rule is not satisfied by this note alone.

- **AC-4's rollover behaviour is pinned as an INVARIANT, not as a mechanism**
  - Spec source: context-story-jt9-38.md, AC-4
  - Spec text: "gate the hatch … assert a crowded wave defers a matured egg"
  - Implementation: an extra pair of tests no AC named — a settled egg at the rolled counter must
    not throw, plus its control at counter `0x99`. The tests assert only that nothing throws; they
    do not require any particular quota value at the rollover.
  - Rationale: found by running a candidate. Both natural implementations ship a crash, and the two
    ways out have different fidelity costs (see the Delivery Finding), which is Dev's and the
    Reviewer's call rather than a test author's.
  - Severity: minor
  - Forward impact: whichever option Dev takes, the Reviewer should confirm the quota row still
    matches the row `spawnWaveEggs` dealt from; option (a) would silently break that above wave 9.

- **`plugins/joust/README.md` edited in the RED phase (apparatus, not behaviour)**
  - Spec source: context-story-jt9-38.md, Scope
  - Spec text: "In scope: … the twelve-egg density (AC-2) …" — the README is named nowhere
  - Implementation: the derived test-FILE count on the `--project joust` command line moved 108 ->
    110, because `audio-seam-scope.test.ts` derives that count and pins it against the README.
  - Rationale: two new test files are never free here; leaving it red would put an apparatus failure
    in the same bucket as the story's behavioural reds and conflate the two.
  - Severity: minor
  - Forward impact: the `~2620 tests, indicative` figure beside it is approximate by its own wording
    and will drift again at GREEN; it is not asserted by anything.

### Reviewer (audit)

- **TEA: "AC-6 is answered rather than deferred to Dev, and the answer is OUT of scope"** → ✓ ACCEPTED
  by Reviewer: the ruling is sound and the reasoning is a read of `JOUSTRV4.SRC:2888-2894`, not a
  preference — `CREGG` draws from the wave RNG per egg, so folding it in would move the re-baseline
  twice inside one story. Note the AC is only HALF discharged: the filing is still outstanding and is
  named as a finish-phase obligation above.
- **TEA: "AC-4's rollover behaviour is pinned as an INVARIANT, not as a mechanism"** → ✗ FLAGGED by
  Reviewer: pinning the invariant rather than the mechanism was the right call, but the invariant as
  written is `.not.toThrow()`, which admits every non-throwing value including `0` — and `0` is a
  permanent soft-lock. Mutation-proven: `: 0` and `: 1` both leave 2627 green. This is finding 1 and
  item 1 of the routed chore. The deviation's *decision* stands; its *coverage* does not.
- **TEA: "`plugins/joust/README.md` edited in the RED phase (apparatus, not behaviour)"** → ✓ ACCEPTED
  by Reviewer: the file-count guard derives its number and pins it against the README, so two new test
  files genuinely require the edit. Verified the guard is green at 110 and that the count is derived
  rather than typed.
- **Dev: "`spawnWaveEggs`'s docblock rewritten, not just extended"** → ✓ ACCEPTED by Reviewer, and
  this was the right instinct: the old sentence disclaimed the 6-per-ledge count as untranscribed and
  would have shipped false and green. Narrowing rather than deleting preserved the two clauses still
  true. Incomplete in one respect only — the stacking's atomic-collection consequence (finding 3,
  chore item 3).
- **Dev: "AC-7's re-baseline commit was NOT made, because there is no re-baseline"** → ✓ ACCEPTED by
  Reviewer. Independently re-derived rather than taken on trust: natural seeded play reaches wave 1-2
  in 3000 frames while the first egg wave is wave 5, so no fixture can observe the change; the
  collected count is unchanged at 2627, which is the cross-check that separates "no pins moved" from
  "the suite stopped collecting". Manufacturing a ceremonial second commit would have put a fabricated
  re-baseline in the permanent record. The AC conditions the commit on a re-baseline existing.
- **Dev: "The 51 shifted `demo.ts:<line>` citations were left stale rather than re-anchored"** → ✓
  ACCEPTED by Reviewer, and it is the better call by a clear margin. I spot-checked the premise rather
  than accepting it: `HEAD:797` is blank, `HEAD:1288` is `: null`, `HEAD:955` is `toPteroEntity` where
  the citing comment wants `nextWaveBcd`. Shifting an already-wrong pointer preserves a wrong referent
  while making it look maintained, and it would have wrapped a 3-file change in a 16-file churn diff.
  Owner `jt9-30` confirmed by reading its description, not by theme-matching: it converts comment-body
  `<our>.ts:<line>` refs in the joust suite and hard-excludes the `JOUSTRV4.SRC:` citations this story
  adds, so its counts are genuinely unaffected.
- **UNDOCUMENTED, found by Reviewer:** the egg PLACEMENT changed behaviour in a way no deviation
  records. Spec (AC-2) says the placement is a port decision to be *stated*; it was stated. But the
  measured stack depth went 2 → 3 and a stack collects atomically, so the story changes scoring and
  audio timing on a player who stands on a pad. Severity: **Medium**, routed as chore items 2 and 3
  rather than as a rejection, because the divergence predates this story and only its depth moved.

## Impact Summary

Hand-written before `story finish` (the generator has silently skipped this on four recorded
occasions; writing it beforehand is strictly better than grepping for it afterwards).

**Shipped.** The joust egg wave now deals the ROM's TWELVE eggs (`JOUSTRV4.SRC:2778-2779` six
one-per-ledge over EGLEDG's six, `:2805-2806` six more over EGPTBL) instead of the wave's ground
complement, and the settled-egg hatch is gated on the population — `wenemyFor(row)` resolves
WENEMY (255 for a normal wave per WNRM `:1991-1992`; the row's own ground nibble for an egg wave
per the three-way select at `:2744-2759`), and `NENEMY` rises INSIDE the hatch pass so twelve
simultaneous maturities admit exactly the quota and defer the rest, each deferral re-primed to one
`PCNAP 12` nap by `:3238`.

**Live, proven positively:** at wave 5 on seeds `0x1234`/`0xbeef`/`0x2468`, 12 eggs enter, exactly
6 hatch at f=624, exactly 6 are held, and the held six are the same processes.

**Two commits, not the three the ACs anticipated.** GREEN (`aa08507`) and the review chore
(`f934cc8`). AC-7 reserved a commit for a determinism re-baseline; there is none, measured —
natural seeded play reaches wave 1-2 in 3000 frames while the first egg wave is wave 5, so no
fixture reaches the change. Zero pins moved; collected count moved 2627 -> 2629, exactly the two
tests the chore added.

**Review: APPROVED, no Critical or High.** Four findings, all Medium or Low, all closed here rather
than deferred:
1. the rollover quota fallback was unguarded (`: 0` = permanent soft-lock on the hundredth wave,
   green across 2627 tests) — now pinned, mutation-proven against `: 0` and `: 1`;
2. the egg placement was unguarded (`PADS[0]` green across 2627) — now pinned on the weak property
   (more than one position) so a truer six-ledge placement need not redden it;
3. the stacking's consequence was undisclosed — a co-located stack is collected ATOMICALLY (three
   eggs, three DEGGS rungs 250/500/750, three cues, one frame). Measured on BOTH sides: it
   pre-dates this story at depth two and jt9-38 deepened it by one. Now stated in the docblock;
4. `rawWaveType` vs `dispatchWaveType` between `wenemyFor` and its caller — equivalent today
   (egg never degrades), recorded, no code change.

**Three equivalent mutants recorded with "do not add a test":** `??=` vs `=`, the lords branch vs
`row.lords`, and the predicate swap above.

**Two false claims caught and corrected before shipping, both the author's own.** Dev's comment
credited the wrong half of a two-clause defensive line for protecting the R2-3 laws (laziness buys
that; the `>= 1` test buys the egg-at-rollover case) — corrected with the measured red counts. And
SM's first draft of jt9-40's filing asserted PWHCH shortens THREE eggs "despite the comment saying
two"; re-running the DEC/BMI trace gave TWO and the 1982 comment was right. Corrected in the filing,
with the reversal recorded there.

**Backlog obligations discharged before archival:**
- **`jt9-40` filed** (3pt, tdd, p3, arcade) — AC-6's descope, with the ROM lines, why it was
  descoped (it draws from VRAND, so it moves the re-baseline a second time), the measured
  all-twelve-at-f=624 simultaneity it exists to break up, and the corrected count.
- **`jt9-30` extended** with the citation staleness rate Dev measured (14 of 16 checkable refs
  already stale at HEAD), which answers that story's own open question. Its counts are unchanged
  because jt9-38 added zero new `<our>.ts:<line>` refs.

**Not done, deliberately:** the 51 `demo.ts:<line>` refs this story's insertions shifted were NOT
re-anchored. They were already stale at HEAD, so shifting them preserves a wrong referent while
making it look maintained. Owned by `jt9-30`.

**Gates at finish:** `--project joust` 2629/2629, `npm run lint` clean, `npm run test:orchestrator`
390/390. No epic is 100% done, so `archive_epics` sweeps nothing and the finish is gate-neutral
(pre-checked with `grep -rn "sprint/epic-" tests/*.mjs`).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->




### SM (setup)

- **Conflict, non-blocking — the ROM's own comment at `:2804` is wrong, and it is the
  copy-paste family this project has already been bitten by.** `DEC PWREGA,U` / `BNE 5$`
  carries `BR=NO`, but `BNE` there means *more eggs left*, i.e. yes. The parallel loop at
  `:2821-2822` gets it right (`BR=YES`). Load-bearing only if someone reads the comment
  instead of the branch; same shape as `GOFLAP :6217`. Do not cite `:2804`'s comment as
  evidence for anything.
- **Question, non-blocking — the port's egg placement is already an approximation and this
  story makes it more visible.** Four `PADS` against the ROM's six ledges plus a 69-slot
  `EGPTBL` means twelve eggs stack three per pad. AC-2 requires the decision be stated in a
  comment rather than shipped silently; whether a truer placement is worth its own story is
  a judgement for the Reviewer to make with the diff in front of them.

### TEA (test design)

- **Question** (blocking for AC-4): **a quota lookup keyed on the wave counter throws at the BCD
  rollover, and the obvious lazy fix hides the crash rather than removing it.** Affects
  `plugins/joust/src/core/demo.ts` (the quota resolution in `stepDemo`'s hatch pass). Measured:
  eager resolution reddens the two R2-3 guards in `plugins/joust/tests/difficulty-wiring.test.ts`
  outright; lazy resolution is green across the whole project (2625/2625) yet still throws when a
  ripe egg is staged at counter `0x00`. Two options, and I deliberately did NOT choose: **(a)**
  resolve via `decimalWaveFromBcd` (defined at 100) — but that ordinal differs from the raw counter
  for every counter at or above `0x10`, so the quota row would stop matching the row
  `spawnWaveEggs` dealt from, a silent divergence above the ninth wave; **(b)** fall back to 255 —
  the ROM's own normal-wave default, which gates nothing — when the counter has no resolvable row.
  My candidate uses (b) as the cheaper and more conservative option, but the choice belongs to Dev
  and the Reviewer. The root cause is the td1-12 raw-counter/ordinal confusion, not this story.
  *Found by TEA during test design.*

- **Gap** (non-blocking): **the cp2-1 colour denylist scans COMMENTS on the paint path**, so writing
  the ROM operand `LDA` with a hash-prefixed 255 inside `plugins/joust/src/core/demo.ts` fails
  `demo-source.test.ts:145` with `hex colour literals on the paint path: [ '#255' ]`. Affects any
  future ROM citation quoting a decimal immediate in that file. Reword as "LDA immediate 255".
  Same family as the `tempest-purity-scanner-reads-comments` trap. *Found by TEA during test design.*

- **Improvement** (non-blocking): **`plugins/joust/tests/helpers/egg-contract.ts` had drifted from
  production** — `waitFrames` has been on `EggState` in `plugins/joust/src/core/egg.ts:73` since
  jt9-9, but the test mirror never gained it, so no test could stage a hatch wait and jt9-9's own
  suite had to step the full 624-frame wait to reach expiry. Added, with a note that seeding it is
  not a fixture cheat (the hatch loop writes that field every frame). Worth a sweep of the other
  contract mirrors for the same drift. *Found by TEA during test design.*

- **Question** (non-blocking): **AC-6's `PWHCH` disposition — I am ruling it OUT of scope, with the
  reasoning, so SM can file it.** `LDA #2 / STA PWHCH,U  NUMBER OF PRE-MATURE EGG HATCHINGS`
  (`JOUSTRV4.SRC:2776-2777`), consumed in `CREGG` at `:2888-2894`, shortens the hatch wait of two of
  the twelve eggs by a `VRAND` draw. I read the cited lines: it is `JSR VRAND / MUL / NEGA / ADDA
  PJOYT,Y`, i.e. it **consumes the wave's RNG stream once per egg**, so folding it in would move the
  determinism re-baseline a second time inside the same story and make the AC-7 fixtures unstable
  mid-flight. It is also independently testable. Recommend a filed follow-up; per the standing rule
  this descope must end with a story id. *Found by TEA during test design.*

- **Gap** (non-blocking): **the port's egg-wave placement is now visibly an approximation.** Twelve
  eggs across four `PADS` (`plugins/joust/src/core/transporter.ts:127-132`) stacks three per pad,
  where the ROM spreads six over six ledges (`EGLEDG`) and six over a 69-slot `EGPTBL`. AC-2 requires
  the decision be stated in a comment rather than shipped silently; whether a truer placement is
  worth its own story is a judgement for the Reviewer with the diff in front of them. Nothing in this
  suite asserts positions. *Found by TEA during test design.*

- **Conflict** (non-blocking): **`.gitignore` carries an uncommitted modification that is not this
  story's** — the `/arcade-shared/` rule and its explanatory block were removed, matching the now-
  deleted directory (`CLAUDE.md`: "Delete this line together with the directory"). It was present in
  the working tree before RED and was deliberately left uncommitted and unmodified; it was parked by
  file copy across the rebase and restored byte-identical (md5 `214623bb…`), because `git stash` in
  this checkout is a shared stack holding someone else's parked work. Whoever owns the
  `arcade-shared` teardown should commit it. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): **14 of 16 checkable `demo.ts:<line>` refs in the joust suite were already
  stale at HEAD, before this story touched anything** — `HEAD:797` is blank, `HEAD:1288` is `: null`,
  `HEAD:955` is `toPteroEntity` where the citing comment expects `nextWaveBcd`. Affects the 51 refs
  across 16 files that this story's insertions shift by a further +1/+20 (`plugins/joust/tests/*.ts`
  plus `plugins/joust/src/core/enemy.ts:470` and `events.ts:32`). **Owner: `jt9-30`** — mechanism
  confirmed by reading it, not matched on theme: it converts comment-body `<our>.ts:<line>` refs in
  the joust suite to symbol refs, which is exactly this population, and it hard-excludes the
  `JOUSTRV4.SRC:` citations this story adds. Its measured counts (86 distinct / 102 occurrences / 30
  files) are unchanged by this story. **What jt9-30 should gain at finish:** the staleness rate,
  because its own description leaves open "whether this story converts ALL comment-body refs on
  principle or only the demonstrably-stale ones" — 14 of 16 sampled already stale is the evidence for
  the first. *Found by Dev during implementation.*

- **Conflict** (non-blocking): **AC-7's predicted determinism re-baseline does not exist, and the
  prediction should not be inherited by sibling stories.** Affects `sprint/epic-jt9.yaml` (jt9-38's
  description and AC-7). Measured: natural seeded play reaches wave 1-2 in 3000 frames across three
  seeds while the first egg wave is wave 5, so no fingerprint or entity digest reaches the change;
  zero pins moved, collected count unchanged at 2627. This is the jt9-1 shape — a warning reasoned by
  analogy from a story that perturbed every wake. Worth correcting where it is written down, because
  the next story in this epic that touches egg waves will otherwise budget for a re-baseline that
  cannot happen. *Found by Dev during implementation.*

- **Improvement** (non-blocking): **an egg wave with idle inputs never clears, and now visibly parks
  at 6 enemies + 6 held eggs.** Affects `plugins/joust/src/core/demo.ts` (the attract/demo path).
  This is not a regression — before this story it parked at 6 enemies + 0 eggs and equally never
  advanced — and it is faithful, since the ROM's egg wave requires a player to collect the eggs. But
  the arena is now visibly twice as full for an unattended demo, which is the state the lobby
  carousel shows. If any attract-demo story wants an egg wave to progress unattended it needs a
  deliberate mechanism, not a tweak to this gate. *Found by Dev during implementation.*

- **Question** (non-blocking): **the quota reads `waveRowAt(demo.wave)` — the RAW BCD counter — to
  match the row `spawnWaveEggs` dealt from, which means both inherit td1-12's unit confusion
  together.** Affects `plugins/joust/src/core/demo.ts`. Consistency between the two was chosen
  deliberately over correctness of either: resolving the quota through `decimalWaveFromBcd` would fix
  the rollover without a guard, but would make the quota read a DIFFERENT row from the one the eggs
  came from for every counter at or above `0x10`. If td1-12 ever unifies the units, both call sites
  must move together — they are correct relative to each other and wrong relative to the wave the
  player is actually on. *Found by Dev during implementation.*

### Reviewer (review)

- **Gap** (non-blocking): **two chosen fallback/placement values in this story are unguarded, and
  each ships green under a mutation that breaks the game.** Affects
  `plugins/joust/src/core/demo.ts:1476` (the rollover quota fallback — `: 0` soft-locks the hundredth
  wave permanently, since `population >= 0` defers every egg forever and the clear gate wants no
  eggs) and `demo.ts:684` (the pad placement — all twelve on `PADS[0]` leaves 2627 tests green).
  Both proven by mutation, collected count stable. Routed as chore items 1 and 2 with the mutants
  named; the fix is two assertions. *Found by Reviewer during review.*

- **Improvement** (non-blocking): **a stack of co-located eggs is collected ATOMICALLY, and the
  disclosure stops one step short of saying so.** Affects `plugins/joust/src/core/demo.ts:676-681`
  (the docblock) — the catch loop at `demo.ts:1200-1231` iterates every overlapping egg without
  breaking. Measured on both sides: before this story 6 eggs / max stack 2 / one frame yields score
  events `250,500` and 2 cues; after, 12 eggs / max stack 3 / one frame yields `250,500,750` and 3
  cues. The ROM spreads eggs over six ledges plus a 69-slot table and cannot stack, so it never
  awards three DEGGS rungs in a frame. **Pre-existing at depth 2 — not a regression this story
  introduces** — but its depth moved and the comment describes only the stacking. Chore item 3.
  A truer placement (six ledges rather than four pads) is a genuine follow-up candidate and is
  NOT filed; it belongs with whoever picks up the EGG1 coordinate transcription. *Found by Reviewer
  during review.*

- **Question** (non-blocking): **`wenemyFor` and the code that decides to deal eggs at all use
  DIFFERENT wave-type predicates.** Affects `plugins/joust/src/core/wave.ts:220` (`rawWaveType`)
  versus `plugins/joust/src/core/demo.ts:751` (`dispatchWaveType(..., { p1: true, p2: true })`).
  Substituting either for the other leaves the project green, because egg is the one wave type that
  does not degrade by player count — so they are equivalent today and would diverge silently if the
  degrade laws ever grew an egg case. Worth one sentence naming the equivalence at one of the two
  sites, or unifying them. *Found by Reviewer during review.*

- **Conflict** (blocking for the FINISH phase only, not for this review): **AC-6's filing obligation
  is still open.** Affects `sprint/epic-jt9.yaml` — `PWHCH` appears only inside jt9-38's own
  description and AC-6 text, in no other story. TEA discharged the AC's first half (the disposition
  is ruled OUT, in writing, from the ROM). The second half — "it ends with a filed story id" — is
  SM's and must happen before `pf sprint story finish` archives the session that explains it. Same
  shape as jt5-10: an AC naming a backlog artifact that no phase agent can satisfy. *Found by
  Reviewer during review.*