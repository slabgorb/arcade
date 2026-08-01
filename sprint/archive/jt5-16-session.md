---
story_id: "jt5-16"
jira_key: "jt5-16"
epic: "jt5"
workflow: "tdd"
---
# Story jt5-16: Make the pterodactyl a full collision participant: ptero-vs-ptero must reach SNETHD and the ordinary bump

## Story Details
- **ID:** jt5-16
- **Jira Key:** jt5-16
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T18:06:16Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T17:29:55Z | 2026-08-01T17:31:47Z | 1m 52s |
| red | 2026-08-01T17:31:47Z | 2026-08-01T17:50:42Z | 18m 55s |
| green | 2026-08-01T17:50:42Z | 2026-08-01T17:59:40Z | 8m 58s |
| review | 2026-08-01T17:59:40Z | 2026-08-01T18:06:16Z | 6m 36s |
| finish | 2026-08-01T18:06:16Z | - | - |

## Story Acceptance Criteria

**Derived from the story description and jt5-10's settled findings. jt5-10 made the ROM read and was ruled to RECORD the collision reachability gap and FILE it as this story — not to build it.**

1. **The pterodactyl joins the eligible set for collision tests.** The `collisionPass` pair loop's filter at `plugins/joust/src/core/demo.ts` currently admits `kind === 'player' || kind === 'enemy'`. This story widens it to include `'ptero'`, so two pterodactyls can meet. The eligibility change is the entire engine work.

2. **A ptero-vs-ptero pair emits the correct cue and follows the correct path.** jt5-10 settled that SNETHD is sounded BEFORE the ROM knows who collided (`:5019-5020`), then the PID tests on both parties route the ptero pair back to the ordinary bump at `:5031-5033`. This port follows the same order: collision detection, sound the cue (already wired by jt5-4), then route. A ptero/ptero pair shall emit `enemy-thud` and execute the ordinary bump, identical to a buzzard/buzzard pair.

3. **The two guards jt5-10 added are updated.** `plugins/joust/tests/audio-ptero-wing-source.test.ts` carries two intentional guards: one asserts the filter is UNCHANGED, and one forbids the widened predicate. Update them in place here — that is the point of them. They exist so the fence could not be moved by a story that had not priced it.

4. **No fidelity regression and the blast radius is measured.** `npx vitest run --project joust --project shared` stays green. The `resolvePteroAttack` path for ptero-vs-player remains untouched. Roughly a hundred `demo.ts:N` citations across other suites and archived sessions point into that file — verify with hunk arithmetic that edits are an EOF append or equal-line-count in-place edits, and spot-check critical anchors (at minimum, the KNOWN GAP block at the foot of demo.ts itself and any pointer from another test file).

## Measured Background (Inherited from jt5-10)

### Settled Findings

jt5-10's TEA and Reviewer measured the ROM's pterodactyl collision behaviour and delivered the chain in code and claims. Everything below is verified against the vendored source at `e5457ab`; do not re-derive it.

**THE ROM MAKES THE PTERODACTYL A FULL COLLISION PARTICIPANT.**

- No-kill branch: `BNE OSTHT2 BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)` `:4961`
- SNETHD is sounded FIRST: `OSTHT2 LDX #SNETHD` `:5019`, `JSR VSND` `:5020` — before testing who collided
- Ptero/ptero routes to ordinary bump: `:5022-5027` tests `PID` for PTEID on both parties, `BEQ OSTH12` / `BEQ OSTH13` branch routing; `:5031-5033` OSTH12 falls back to `OSTH11 JSR OSTBMP NO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS` with SNETHD already sounding
- Ptero/bird routes to existing path: `PTEBRD` `:5034` and `:5037-5038`

**THE GAP IN THIS PORT (which is what jt5-10 RECORDED, not fixed):**

`collisionPass`'s pair loop (demo.ts) filters to `kind 'player' or 'enemy'`. A ptero is resolved only through `resolvePteroAttack` against a PLAYER — so two pteros never meet. jt3-5's baiters cap at `MAX_BAITERS` (src/core/baiter.ts) and a wave carries its own pteros besides, so ptero pairs really do occur in ordinary play.

**WHAT IS ALREADY DONE, so this story does not redo it:**

- The `enemy-thud` event kind exists in `src/core/events.ts` and its comment already names ptero-vs-ptero
- jt5-4 wired SNETHD (:8106, priority 009) through the audio seam
- The `resolvePteroAttack` path for ptero-vs-player is unchanged

### User Ruling — SCOPE (recorded from jt5-10's setup)

Settle both the wing-cue and collision reads in jt5-10 and deliver whatever the wing-cue read supports. **File the ptero-vs-ptero collision reachability — pteros into `collisionPass`'s eligible set, pair → `enemy-thud` + ordinary bump — as its own story.** Rationale: the collision change alters how three on-screen pteros behave and is a gameplay change, not a cue change; folding it into a 2-pointer would misprice it.

**Consequence for development:** Do not touch any other eligible-set logic. This story is ONLY the predicate widening, the path routing, and the guards.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): AC-1's "the eligibility change is the entire engine work" is
  mechanically false — `toJoustEntity` has no `'ptero'` arm (returns null, demo.ts:741-776) and
  `collisionMaskFor` none either (demo.ts:734-738), so the widened predicate alone changes
  nothing: every ptero pair dies at `if (!a || !b) continue`. The transcribed ptero collision
  masks DO exist (`PT1RC/PT2RC/PT3RC/PT1LC/PT2LC/PT3LC`, pictures.ts `COLLISION_TABLES`,
  anchors JOUSTI.SRC:2608-2690). Affects `plugins/joust/src/core/demo.ts` (Dev must add both
  arms; the behavioural test pins the outcome either way). *Found by TEA during test design.*
- **Gap** (blocking): the widening makes ptero-vs-BUZZARD *reachable*, and the ROM routes that
  pair to `PTEBRD` (`:5034`, `:5037-5038` after `EXG X,U` — "REG.U IS PTERODACTYL") with SNETHD
  already sounded (`:5019`) — an UNMEASURED mechanic the jt5-10 ruling did not price. The suite
  fences it to today's no-interaction (`demo-jt5-16.test.ts`, scope-fence group), so a follow-up
  story must EXIST for the descope to be a routing and not a forgetting. Affects
  `sprint/epic-jt5.yaml` (SM must run `pf sprint story add` at finish, read the minted id from
  the add's output, and put the PTEBRD ROUTING — not just a title — in the description).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `spawnWavePteros` stacks a wave's whole ptero complement at ONE
  coordinate (posX 8, posY 90, demo.ts:541-547) on the same frame. Once the set widens, a
  stacked pair bumps apart on entry (the exact-tie separation is ROM law, so the PHYSICS is
  right) but SNETHD will fire at every multi-ptero wave entry — cue spam the real machine avoids
  by staggering ptero entries in time. Affects `plugins/joust/src/core/demo.ts` (Dev should
  note it; whether entry staggering is wanted is a ruling for Reviewer/user, not a silent fix —
  the jt5-16 tests deliberately anchor their wave so this never pollutes them). *Found by TEA
  during test design.*

### Dev (implementation)

- No upstream findings. TEA's three stand as written; the blocking one (the PTEBRD follow-up
  story must be FILED) is SM's at finish and is unaffected by anything implemented here. The
  cue-spam Improvement is real but latent: wave rows that send ≥2 pteros will now thud on entry
  (stacked spawns separate through the ordinary bump — ROM-lawful physics, un-ROM-like timing);
  nothing was changed there, per TEA's own note that it is a ruling, not a silent fix.

### Reviewer (code review)

- No upstream findings beyond TEA's three, which are confirmed accurate: the AC-1 correction was
  real (all four arms were required — proven by mutations M3/M4/M5, each individually fatal and
  each caught); the PTEBRD filing obligation stands for SM at finish; the cue-spam Improvement
  is correctly routed as a ruling, not a fix. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Ptero-vs-buzzard pinned to NO interaction, though the ROM sounds SNETHD for it**
  - Spec source: context-story-jt5-16.md, Problem section (the ROM read)
  - Spec text: "OSTHT2 then sounds the cue BEFORE it knows who collided — ':5019 OSTHT2 LDX #SNETHD' / ':5020 JSR VSND' — and only afterwards tests PID"
  - Implementation: `demo-jt5-16.test.ts` asserts a ptero/buzzard overlap emits NO thud and resolves nothing — diverging from the ROM, which would sound SNETHD and route to PTEBRD
  - Rationale: PTEBRD's behaviour is unmeasured and the user's jt5-10 ruling priced ONLY the ptero/ptero pair; sounding a cue attached to an unbuilt mechanic would be worse than silence
  - Severity: minor
  - Forward impact: minor — the PTEBRD follow-up story (to be filed at finish per the blocking Delivery Finding) inherits both the cue and the routing together

## Impact Summary

**Key Findings:** 3 discovered (1 blocking resolved, 2 non-blocking routed)

- **Blocking Finding (RESOLVED):** TEA found ptero-vs-BUZZARD is now reachable with the widened eligibility set. The ROM routes this unmeasured pair to PTEBRD (`:5034`, `:5037-5038`) with SNETHD already sounding (`:5019`). This mechanic was unpriced by jt5-10's ruling. The suite fences it to no-interaction today; **filed as jt5-17** with the full PTEBRD routing in its description.

- **Non-blocking Conflict:** AC-1's claim that the eligibility change alone is "the entire engine work" was false. Dev correctly identified and implemented all four required arms (`toJoustEntity`, `collisionMaskFor`, and routing logic). Proven by mutation battery (M3/M4/M5 individually fatal; all caught).

- **Non-blocking Improvement:** `spawnWavePteros` stacks a wave's whole ptero complement at one frame. Once the eligibility widens, stacked pairs separate via ordinary bump on entry (ROM-lawful physics, un-ROM-like cue timing). This causes cue spam on multi-ptero wave entries — **owned by jt5-17's description** as a latent observation inherited from this story's mechanics. jt5-16 tests deliberately anchor their wave to prevent this from polluting the suite.

**Measurements Completed:**
- Conflict validated by mutation testing (4/4 mutations caught; tree restored after each)
- Gap confirmed and routed to a filed follow-up (jt5-17)
- Improvement documented and assigned to jt5-17's design considerations
- All acceptance criteria verified (AC-1 through AC-4)
- Blast radius measured: `+1@737, −1@866, +3@880` + EOF rewrite; three genuinely-live shifted anchors re-anchored; all other pre-existing stale citations verified
- Full suite green: 2111/2111 joust, 10883/10883 repo-wide, `npm run lint` clean

**Verdict:** Delivery findings are complete and routed. Blocking issue resolved via jt5-17. Ready for preflight.


## Sm Assessment

**Verdict:** READY for RED.

- Session and story context created by sm-setup; ACs 1-4 derived from the story description and jt5-10's settled findings.
- No sibling checkout has touched jt5-16 (origin/main grep shows only jt5-10's finish commit filing it). No open PRs — merge gate clear.
- Scope is pinned by the user's jt5-10 ruling: predicate widening in `collisionPass`, ptero-pair → `enemy-thud` + ordinary bump, and updating the two intentional guards in `audio-ptero-wing-source.test.ts`. Nothing else.
- The Measured Background is inherited from jt5-10's reviewed session; TEA should treat any line-range citations there as claims to spot-check against the vendored source (`LABEL (:line)`), not re-derive from scratch.
- Trunk-based: no branch; work lands on `main`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — a gameplay mechanic with a settled ROM reading; behaviour, routing fences and records all need pins.

**Test Files:**
- `plugins/joust/tests/demo-jt5-16.test.ts` — NEW. Group 1: the deliverable (ptero pair → enemy-thud + ±2px ordinary bump, no-one dies) plus its buzzard-pair presence CONTROL. Group 2: routing fences — ptero-vs-PLAYER resolves exactly once through `resolvePteroAttack` (both the lance-kill and pteroWins bands; kills the pair-loop double-resolution), and ptero-vs-BUZZARD resolves NOTHING (PTEBRD is unpriced — see the blocking Delivery Finding). Group 3: demo.ts must name jt5-16, and a JT516 claim must cover `JOUSTRV4.SRC:5033` (BEQ OSTH11, the ptero-pair dispatch) with byte-checked verbatims.
- `plugins/joust/tests/audio-ptero-wing-source.test.ts` — jt5-10's two Group-6 fences flipped IN PLACE per AC-3: the record test now also demands `jt5-16` in demo.ts, and the filter guard now demands `'ptero'` (quoted, anchored to the `const eligible = processes.filter` declaration) instead of forbidding it.

**Tests Written:** 8 new + 2 flipped, covering 4 ACs
**Status:** RED (6 failing as designed, verified at commit 9e59321: `Tests 6 failed | 2105 passed`; the behavioural red fails on `thudFrame -1` — the missing mechanic — with every overlap precondition green)

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #15 source-text anchors, not tokens | filter guard anchored to the `const eligible` declaration + quoted `'ptero'` (comments say ptero unquoted); claims count asserted before the verbatim loop | failing (by design) |
| #15 mutation-named guards | each test comment names its mutant (do-nothing, wrong-route, double-resolution, invented-PTEBRD) | n/a (comments) |
| #8 test quality (no `as any`, no vacuous asserts) | typed fixtures (`DemoProcess` annotations survive `npm run lint`); every absence test shares a harness with a presence control | passing |
| #4 null/undefined | `pixelPos`/`stage` throw instead of `!`-asserting | passing |
| #14 edge in one branch | not applicable — no state-machine edges added by tests; Dev's widening is behaviourally pinned instead | n/a |

**Rules checked:** 4 of 15 lang-review rules applicable to a test-only diff; the rest bind Dev's GREEN diff
**Self-check:** 0 vacuous tests — the two absence groups are backed by the same-harness buzzard control, and the ±2px deltas are exact (flight contributes 0 at velY 0)

**Staging notes for Dev (measured, not guessed):**
- The wave-open ANCHOR matters: a napped base enemy holds `clearable` false (demo.ts:1226-1229 counts only kind `'enemy'`), else the wave advances and `spawnWavePteros` stacks pteros at one coordinate — which would thud on its own once the set widens.
- `stepPteroFlight` carries velY untouched (ptero.ts:140-152), so at velY 0 the bump's ±2 is the ONLY Y movement — the exact-delta assertions depend on this.
- Real pteros spawn `collisionEnabled: true` (demo.ts:469-480); the fixtures mirror that shape exactly.

**Handoff:** To Dev for implementation

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/core/demo.ts` — the whole mechanic, four small arms + routing: the eligible filter admits `'ptero'`; `toJoustEntity` and `withBounced` take a ptero on their entity-bearing (player) arm with `party` decided by kind (`'enemy'` for a ptero — the PID class bit, `:4961`); `collisionMaskFor` returns the transcribed FLY1 mask `PT1RC` (mirrors the buzzard's single resolving wing mask `BWNG3R`); the pair loop skips MIXED ptero pairs (`(pa.kind === 'ptero') !== (pb.kind === 'ptero')`), so player-ptero remains `resolvePteroAttack`'s alone and ptero-buzzard remains unbuilt (PTEBRD). The KNOWN GAP foot block is rewritten to GAP CLOSED, keeping every ROM anchor and adding the PTEBRD descope + both story ids.
- `plugins/joust/docs/rom-study/claims/audio.json` — JT516-001 (`:5031`, OSTH12's "2 PTERODACTYL'S?") and JT516-002 (`:5033`, "BR=YES, SAME OLD COLISION"), byte-checked against the vendored source by the new suite.
- `plugins/joust/tests/audio-thud.test.ts`, `audio-events.test.ts`, `demo-jt8-4.test.ts` — comment-only re-anchors for the three prose citations the diff shifted (`926-927→929-930`, `1318→1321`, `988-992→991-995`).

**Implementation decisions (not deviations):**
- Widening the PLAYER arm of `toJoustEntity`/`withBounced` instead of adding a parallel ptero arm keeps the diff at ZERO inserted lines in both functions — the ptero carries `entity` exactly as a player does, and the blast-radius rule (AC-4) rewards the smaller shift.
- `PT1RC` (FLY1, right) as the one ptero mask mirrors the established buzzard precedent (one resolving mask, facing ignored).

**AC-4 blast radius, measured:** hunks `+1@737, −1@866, +3@880`, foot block rewritten at EOF. Bands: old 738-865 shifted +1, 869-879 unshifted, 883+ shifted +3. Every live prose anchor in a shifted band was re-anchored (three, listed above); every other `demo.ts:N` citation in the sweep was verified ALREADY stale before this story (checked against `git show HEAD:`). No mechanical line-pin existed in any suite — proven by the full green run.

**Tests:** 2111/2111 joust (all six RED now green), 10883/10883 repo-wide, `npm run lint` clean
**Branch:** main (trunk-based), commits 9e59321 (red) + 2a06648 (green)

**Handoff:** To Reviewer

## Reviewer Assessment

**Verdict:** APPROVED

**Scope reviewed:** commits 9e59321 (RED) + 2a06648 (GREEN) — `demo.ts` mechanic, claims, guard flips, citation re-anchors.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none — 2111/2111 joust green, 0 console.log/TODO/skip, 7 files +500/−57 | N/A |

All received: Yes

The other eight specialists are disabled in settings; their domains were assessed directly (table below).

### Review Dimensions (direct)

| Dimension | Status | Result |
|----------|--------|--------|
| mechanical (self) | done | full-suite + lint runs gathered inline: 2111/2111 joust, 10883/10883 repo-wide, tsc clean |
| edge-hunter | direct (subagent disabled) | consumer sweep of every `toJoustEntity` call site: pair loop routed; lance and egg-catch loops iterate `livePlayers` only — a ptero can neither lance-joust as a player nor catch an egg; baiter invariant (`countBaiterDeaths`: deaths only via lance kill) survives since ptero pairs always bounce |
| test-analyzer | direct (subagent disabled) | mutation battery 4/4 caught: M2 (mixed-pair skip removed → both fences red), M3 (withBounced ptero arm removed → ±2px assertions red), M4 (mask arm removed → thud red), M5 (party flipped → thud/no-death red); tree verified restored after each |
| comment-analyzer | direct (subagent disabled) | foot-block rewrite verified true sentence-by-sentence; JT516-001/002 readings verified against the VENDORED source :5019-5038 (U tested first → OSTH12; OSTH12 tests X → OSTH11 "SAME OLD COLISION"), not just their verbatims |
| rule-checker | direct (subagent disabled) | lang-review/typescript over the diff: no `as any`/`@ts-ignore`; the one `source!.line` follows an explicit `filter(c => c.source…)` (the jt5-10 Group-4 idiom); `??` used correctly; #15 anchors mutation-proven |
| security / silent-failure / simplifier / type-design | direct (subagent disabled) | no I/O, no error paths, no new types in the diff; the entity-arm widening REMOVED prospective duplication rather than adding an abstraction |

All received: Yes

**AC verification:** AC-1 ✓ (filter admits `'ptero'`; flipped guard green). AC-2 ✓ (enemy-thud + exact ±2px ordinary bump, no deaths — behavioural test with same-harness buzzard control). AC-3 ✓ (both jt5-10 guards updated in place, nothing else in that file touched beyond its Group-6 header note). AC-4 ✓ (repo-wide green; `resolvePteroAttack` untouched — `git diff` shows no hunk in its region and the two fence tests pin its exclusivity; hunk arithmetic measured `+1@737, −1@866, +3@880` + EOF rewrite; the three genuinely-live shifted anchors re-anchored, all other stale citations verified pre-existing against `git show HEAD:`).

**Round 1 findings:** none requiring change — nothing was fixed in place because nothing was found; the mutation battery, not self-rereading, is what was relied on (same-session relay).