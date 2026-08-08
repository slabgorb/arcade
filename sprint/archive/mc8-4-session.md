---
story_id: mc8-4
jira_key: mc8-4
epic: mc8
workflow: tdd
---
# Story mc8-4: Parametric drones + full event wiring

## Story Details
- **ID:** mc8-4
- **Jira Key:** mc8-4
- **Workflow:** tdd
- **Stack Parent:** mc8-2 (no stacking; standard dependency chain)
- **Branch:** feat/mc8-4-parametric-drones-full-event-wiring
- **PR:** https://github.com/slabgorb/arcade/pull/126

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-08T16:56:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T16:08:48Z | 2026-08-08T16:11:29Z | 2m 41s |
| red | 2026-08-08T16:11:29Z | 2026-08-08T16:33:38Z | 22m 9s |
| green | 2026-08-08T16:33:38Z | 2026-08-08T16:47:55Z | 14m 17s |
| review | 2026-08-08T16:47:55Z | 2026-08-08T16:56:39Z | 8m 44s |
| finish | 2026-08-08T16:56:39Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **(TEA/RED, Gap, non-blocking) The authoritative scope is the spike doc §8+§5, not the story title.**
  `docs/superpowers/specs/2026-08-07-missile-command-mc8-audio-driver-spike.md` §8 planned this work as its
  "mc8-3 — parametric sounds + full event wiring"; the stories were later renumbered (a new mc8-3 "Verify
  audio live" was inserted), so this is now **mc8-4**. The §5 event→sound map (verified at W3MAIN call sites)
  is the ground truth for what to wire.
- **(TEA/RED, Conflict, non-blocking) The SM assessment was WRONG that "low-ammo" is already wired.**
  §5 distinguishes TWO cues: `NS`/CAN'T-FIRE (`SNSHOT`, ammoEmpty → already wired to `no-fire`) and
  `LO`/LOW-ON-ABMS (`SLOABM`, the low-base *launch* variant, W3MAIN:1389 `BASLOW`). `LO` is UNWIRED — it is
  genuinely new work. `LaunchedEvent` is a bare `{type:'launched'}` today, so `LO` needs a small pure-data
  addition (a `baseLow` flag on the launch event, computable from `bases[].ammo`), never a callback.
- **(TEA/RED, Gap, non-blocking → FILED) The parametric drone's LIVE TRIGGER depends on mc5.**
  The sweeping drone VOICE (`AUDF1+6` TOP→BOTTOM by 2/frame, per-type `BOTTOM=30,0,0`/`TOP=70,30,30`,
  W3SOUN:354) is self-contained and buildable/testable now at the engine seam. Its lifetime gate is `CRMONS`
  (cruise/Sputnik count, W3MAIN:2647) — those enemies are an **mc5** deliverable that does not exist. Per the
  user ruling (Option A), mc8-4 builds the voice and DEFERS the live trigger. **Filed as mc8-5** (blocked on
  mc5's cruise/Sputnik enemies).
- **(TEA/RED, Gap, non-blocking → FILED) The SLAM/tilt blip has no source in the browser clone.**
  Doc §8 lists the SLAM blip (`SLMSND`, W3SOUN:262); no tilt/slam input exists in `src/`. **Filed as mc8-6**
  (may be won't-do pending a tilt-input decision).
- **(TEA/RED, Note, non-blocking) The bonus-TICK emitter cadence is already a separate follow-up.**
  `BonusTickEvent`'s own comment (core/sound-events.ts) says "Emitter is a filed follow-up; the map is wired."
  So the EXPFRA tick-train cadence is NOT mc8-4 — the `TK` map entry is already wired.

### Dev (implementation)

- **(Dev/GREEN, Note, non-blocking — for Reviewer) `audio.feedDrone` is built but intentionally
  NOT called by `main.ts` yet.** Per the user ruling (Option A), mc8-4 builds the drone VOICE
  (pure `core/drone.droneSweep` + the engine's `feedDrone`) and DEFERS the live trigger to
  **mc8-5**. So the sweep is unit-tested (AC5, pure) and reachable (audio.ts consumes
  `droneSweep`), but nothing starts the drone at runtime until mc8-5 wires CRMONS/cruise-Sputnik
  presence. `feedDrone` is a public `AudioEngine` method (not dead local code); it early-returns
  unless the drone is `running`. This is the deferral, not an omission.
- **(Dev/GREEN, Note, non-blocking) The drone bounds are properly claimed, not borrowed.** 0x70
  (112) and 0x30 (48) happened to already exist as claim values (MC-BONMSK; color.json), which
  would have satisfied the value-presence gate coincidentally — but I authored real drone claims
  `SOUND-DRONE-TOP-70` / `SOUND-DRONE-BOUND-30` (both cited to `A35820.1C:355` `TOP: .BYTE
  70,30,30`) and added `'TOP'` to the `citations-source` DERIVED set, the same pattern mc8-2's
  SOUND sequences use. Avoided the JSDoc-leak (drone.ts uses `//` for numbers, not `/** */`).
- **(Dev/GREEN, Note, non-blocking) `LOW_AMMO = 4` lives in `shell/input.ts`, not core.** It is the
  fire→sound seam threshold (W3MAIN:1385 `CMP I,4`); the fire reducer already owns launched/
  ammoEmpty emission. Keeping it in shell avoids a core citation claim for a non-core constant.
  The `LaunchedEvent.baseLow` field it sets IS pure core data (the union stays 6 kinds).

### Reviewer (code review)

- **Improvement** (non-blocking → FILED mc8-7): the `bonus-city` cue fires when
  `bonusCitiesEarned` increments, which can be MID-PLAY (a kill crossing the score
  threshold), whereas the ROM sounds `SBONUS`/BN at the wave-end GRANT (W3MAIN:4845).
  Affects `plugins/missile-command/src/shell/audio-dispatch.ts` (`playEdgeCues`). The
  implementation faithfully matches the ruled mechanism ("edge: bonusCitiesEarned++"), so
  this is a timing refinement, not a regression. *Found by Reviewer during code review.*
- **Note** (non-blocking): the citation byte-checker does NOT verify a claim's `line`
  number (mutation M6: corrupting `SOUND-DRONE-*` `line: 355`→`999` reddened nothing —
  the physical-byte read is skipped, the documented jt1-3 degradation). Pre-existing gate
  characteristic, not introduced here; the drone claims' `line: 355` was verified manually
  (`awk NR==355` = `TOP:\t.BYTE 70,30,30`, carrying both 0x70 and 0x30). *Found by Reviewer.*

## Dev Assessment

GREEN complete for mc8-4 on the ruled scope. All 7 ACs pass:
- AC1 whoop / AC2 end-game / AC3 bonus-city — `playEdgeCues(audio, prev, curr)` in
  audio-dispatch.ts, driven from `main.ts` (now keeps `prev = game` before the step).
- AC4 low-launch — `LaunchedEvent.baseLow` set by `fireFromKey` at `ammo === 4`; dispatch voices
  `launched + baseLow → play('low')`.
- AC5 drone sweep — pure `core/drone.droneSweep` (AUDF1+6 −2/frame wrap, per-type TOP/BOTTOM,
  A35820.1C:354-355); `audio.feedDrone` renders it (trigger → mc8-5).
- AC6 no-incoming-ICBM — the green guard stayed green (no cue invented).
- AC7 — the stale "mc8-3" sweep attribution in audio.ts corrected to mc8-4.

**Verification (direct, not just vitest):** MC vitest `843 passed`; `npm run lint` (tsc --noEmit,
repo-wide) exit 0; `node scripts/build-app.mjs missile-command` built clean; `npm run
test:orchestrator` `457 pass, 0 fail`. No existing test changed behaviour. Two commits on the
branch: RED `ae013b71`, GREEN `dbdc922f` (pushed).

Handing to Heimdall (Reviewer).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Derived ACs revised to the ruled scope (user ruling: Option A, 2026-08-08).** The SM-derived ACs in
  `sprint/context/context-story-mc8-4.md` were updated by TEA at RED: (a) AC for `low-ammo`/`LO` ADDED (the SM
  Background wrongly listed it as already-wired — see Delivery Findings); (b) the drone-sweep AC re-mechanised
  from the SM's fabricated "proportional to time-remaining-in-play-phase" to the ROM-faithful `AUDF1+6`
  TOP→BOTTOM sweep, with its LIVE TRIGGER explicitly deferred to mc8-5; (c) SLAM explicitly out-of-scope
  (mc8-6). The epic YAML carries no ACs (they were derived), so there is no YAML to diverge from; this session
  + the context header record the change.

### Reviewer (audit)

- **ACCEPTED** — "Derived ACs revised to the ruled scope (Option A)". The revision is
  correct and well-evidenced: `low-ammo`/`LO` IS distinct from the already-wired `NS`
  (§5, W3MAIN:1385 vs 1283) and the drone-sweep mechanism matches PMRBIL (A35820.1C:354-355),
  not the SM's fabricated phase-timer. The user ruled Option A explicitly; the epic carries
  no ACs to contradict; the context header + session record which came first. No disguised
  scope change. Deviation stands.

## Sm Assessment

Setup for mc8-4 (5pt, tdd/phased). Dependency mc8-2 is done; sibling probes clean
(only mc8-2 branches on origin, no live sibling sessions). Claim pushed on the
feature branch (context + epic stamp, commit 24592c62); status stamped in_progress.

**Measured-premise correction (authoritative over the title).** The story title lists
`bonusTick`, `low-ammo`, and the cruise/Sputnik drone as if they need wiring — but I
verified against the tree that mc8-2 ALREADY wired them: `bonusTick`→`bonus-tick` and
`ammoEmpty`→`no-fire` in audio-dispatch.ts, and the drone's start/stop LIFECYCLE
(silenced once phase reaches `over`). Writing RED for those would be vacuous. The
genuinely-new work — folded into the derived ACs — is the `whoop` (new-wave),
`end-game`, and `bonus-city` cues plus the drone's PARAMETRIC descending pitch sweep
(mc8-2 shipped lifecycle only). All measured facts are in the committed context.

**Boundary (contract 2).** Core's SoundEvent union is exactly 6 kinds today, none for
the new cues; they must be surfaced as pure GameState data (a new kind or an
edge-detectable field), never a callback/clock read. `Phase` already carries `between`
and `over`, so whoop and end-game are edge-detectable — mirroring the existing
drone-stop. Sharp edge for TEA: `game.ts:129` zeroes `soundEvents` on the over-frame,
so an end-game cue CANNOT ride the event stream; it must edge-detect the transition.

**Stale cross-reference filed as an AC.** `audio.ts:46` says the parametric sweep lands
in "mc8-3" — a renumber-drift error; mc8-3 is asset verification, the sweep is THIS
story. AC6 requires correcting that comment.

**Open design choice (not a blocker, TEA/Architect's call):** whether the new cues
become new SoundEvent kinds or pure edge-detectable state fields — both satisfy the
purity boundary; AC5 leaves it open deliberately.

## Tea Assessment

RED landed for mc8-4 on the ruled scope (user Option A). Two test files, split by whether
they need a not-yet-built surface, so the RED is both cohesive and assertion-visible:

- `tests/mc8-4-event-wiring.test.ts` — AC1 whoop, AC2 end-game, AC3 bonus-city, AC5 drone
  sweep, + reachability. Needs `playEdgeCues` (shell/audio-dispatch) and `droneSweep`
  (core/drone), which don't exist → **module-load RED** (the mc8-2/bz1-11 idiom).
- `tests/mc8-4-fidelity.test.ts` — AC4 low-launch (`LO`), AC6 no-incoming-ICBM guard, AC7
  comment-fix. Rides EXISTING surfaces so it LOADS → **assertion RED**.

**RED evidence (direct run, `npx vitest run --project missile-command`):** `2 failed | 43
passed` files; `4 failed | 822 passed` tests. The 4 real failures are AC4-positive
(`ammo==4 → baseLow`), AC4 map (`launched+baseLow → play('low')`), and AC7 ×2 (audio.ts
still says "mc8-3"). AC4 NEGATIVES (ammo 5/3/full not low) and AC6 green guards PASS on
arrival — they are mutation/regression guards, not vacuous. **No existing test broke.**
(`npm run lint`/tsc WILL be red until GREEN — the tests reference `baseLow`/`playEdgeCues`/
`droneSweep` which Dev has yet to add; that is expected at RED.)

**The seams the tests define (for Loki / Dev — GREEN):**
1. `LaunchedEvent` gains `baseLow?: boolean` (pure data; union stays 6 kinds). `fireFromKey`
   (shell/input.ts) sets it `= (base.ammo === 4)` BEFORE the decrement — the exact ROM
   crossing (W3MAIN:1385 `CMP I,4 / IFEQ`). `playEventSounds`: `launched` + `baseLow` →
   `play('low')`, else `play('launch')`. Keep the `default: never` exhaustiveness guard.
2. `playEdgeCues(audio, prev, curr)` in shell/audio-dispatch.ts — pure, no module state:
   whoop on `curr.wave > prev.wave`; end-game on `prev.phase !== 'over' && curr.phase ===
   'over'`; bonus-city on `bonusCitiesEarned(curr.score, bonusInterval(0)) >
   bonusCitiesEarned(prev.score, …)`. main.ts must keep the PREVIOUS GameState and call it
   each frame (the frame loop holds only `game` today — add `prevGame`).
3. `core/drone.ts`: pure `droneSweep(frame, kind: 'sputnik'|'cruise'|'both'): number` —
   `AUDF1+6` from per-type TOP to BOTTOM, −2/frame, wrapping (W3SOUN:329-355). **The
   constants (TOP/BOTTOM, the −2 step) are literals in `src/core/` → `citations.test.ts`
   WILL demand a cited DERIVED block (the mc-citations gotcha).** The engine (audio.ts) feeds
   it per frame for a running drone; the live START (cruise/Sputnik presence) is **mc8-5**,
   not this story — do not wire a trigger. The existing `stopLoop('drone')` over-edge silence
   stays green.
4. Fix the stale "mc8-3" sweep attribution in audio.ts (and, courtesy, audio-dispatch.ts /
   audio-dispatch.test.ts comments) → mc8-4.

**Rule Coverage (TS lang-review checklist — tests that would catch a violation):**
- *Exhaustiveness on the discriminated union* (checklist: "Missing exhaustiveness check in
  switch on enum"): AC4 map test drives `launched`/`baseLow` through `playEventSounds`; the
  `default: never` guard must survive the new branch. Existing audio-dispatch.test.ts already
  pins the full-union exhaustiveness.
- *`??` vs `||` on a valid-falsy 0* (checklist: "`x || default` where x can be 0"): `baseLow`
  is derived from `ammo` where 0 is meaningful (empty ≠ low). AC4's empty-base test pins that
  `ammo===0` routes to `ammoEmpty` (NS), never to `LO` — a `||`/truthiness slip there is caught.
- *`readonly` on shared data*: the drone sweep is asserted PURE/deterministic (same output per
  (frame,kind)) — a mutable module-state impl fails the determinism test.
- *`.js` extensions in ESM imports*: both new test files import with `.js` specifiers, matching
  the repo rule; the modules Dev creates must too or vitest/node resolution fails.

**Filed follow-ups (descoped, per the user rule):** mc8-5 (drone live trigger, blocked on mc5
cruise/Sputnik enemies), mc8-6 (SLAM/tilt blip, no input source). Both in epic-mc8.yaml.

Handing to Loki Silvertongue (Dev) for GREEN.

Routing to Tyr One-Handed (TEA) for RED. The phase pointer read `setup` on arrival.

## Subagent Results

All nine reviewer specialists are disabled in `.pennyfarthing/config.local.yaml`
(`workflow.reviewer_subagents.*: false`), so each is pre-filled as Skipped/disabled. In
their place I ran a **7-mutation battery** against the changed logic (self-re-reading finds
nothing on this project) plus a manual adversarial read and a Devil's Advocate pass.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Skipped | disabled | N/A | Disabled via settings |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (all 9 disabled via settings; substituted with a mutation battery)
**Total findings:** 0 confirmed blocking · 2 non-blocking notes (1 filed as mc8-7) · 0 dismissed

**Mutation battery (each mutant must redden its guard — all did; restore verified clean):**
- M1 `baseLow === 4` → `<= 4` → AC4 (ammo 3) RED ✓
- M2 whoop `>` → `>=` → AC1 (same-wave) RED ✓
- M3 end-game drop `prev !== 'over'` guard → AC2 (no-replay) RED ✓
- M4 drone `STEP 2` → `1` → AC5 (−2 descent, ×3 kinds) RED ✓
- M5 dispatch low branch → always `'launch'` → AC4 (map) RED ✓
- M6 corrupt claim `line 355` → `999` → citations GREEN (byte-check skipped — pre-existing; noted)
- M7 bonus-city `>` → `<` → AC3 (crossing) RED ✓

### Devil's Advocate

I argued this code is broken. **Attack 1 — the drone never sounds.** `feedDrone` is a public
method but no caller invokes it; `startLoop('drone')` is never reached because cruise/Sputnik
enemies (the trigger, `CRMONS`) are mc5 and don't exist. So a player hears NO drone, and the
story is titled "Parametric drones." Verdict: not a defect — the drone never sounded before
(mc8-2 was lifecycle-only) and nothing CAN trigger it yet; the ruling (Option A) deferred the
trigger to mc8-5 explicitly and the voice is unit-tested pure. The title over-promises what
ships this story, which the context header + mc8-5 record. **Attack 2 — bonus-city fires at the
wrong moment.** `bonusCitiesEarned` is cumulative `floor(score/interval)`; a kill mid-play that
crosses 10,000 makes it increment MID-WAVE, so `playEdgeCues` sounds BN before the ROM would
(the ROM grants+sounds at wave-end regen, W3MAIN:4845). This is real → filed mc8-7; the
implementation matches the ruled mechanism, so non-blocking. **Attack 3 — a confused user fires a
base at exactly 4 and hears the wrong cue, or the boundary is off-by-one.** Checked: `baseLow =
base.ammo === 4` is the pre-decrement magazine, exactly `LDA NMMISB / CMP I,4 / IFEQ`
(W3MAIN:1385); the empty branch (`ammo === 0`) returns `ammoEmpty` before this line, so LO never
collides with NS. Mutation M1 proves `<= 4` is caught. **Attack 4 — stale `prev` in main.ts.**
Between frames a keydown mutates `game` (ammo/abms) and pointermove mutates the cursor, so is
`prev` wrong? No — none of those touch `wave`/`phase`/`score`, the only fields the edge cues read,
so `prev` captured at frame top equals last frame's post-step values for those fields. **Attack 5
— end-game double-fires or misses.** `'between'` never transitions straight to `'over'` (the
between branch always `resumePlay`s to `'play'`), and `over→over` is guarded, so it fires exactly
once on `play→over` (M3 proves the guard has teeth). Nothing here rises to blocking.

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** core pure-state (`wave`/`phase`/`score`, `bases[].ammo`) → shell edge
readers (`playEdgeCues`, `fireFromKey.baseLow`) → `AudioEngine.play`/`feedDrone` → POKEY feed.
Safe because the core→shell direction is preserved (shell reads pure data; no callback/clock in
core), `purity.test.ts` stays green, and the SoundEvent union is unchanged at 6 kinds
(`LaunchedEvent` gained a pure optional field, not a variant).
**Pattern observed:** the edge-cue seam mirrors the existing `updateSustainedSounds` drone-stop
(state re-read per frame) at `audio-dispatch.ts:82`; the low-launch branch extends the existing
exhaustive `switch` (`default: never` intact) at `audio-dispatch.ts:33`.
**Error handling:** the engine's no-throw contract holds — `feedDrone` early-returns without a
context/worklet (`audio.ts:180`), same guard shape as `play` (`audio.ts:144`); nothing added can
throw inside `frame()`.
**ROM fidelity:** `droneSweep` matches PMRBIL (A35820.1C:354-355) — TOP/BOTTOM per index,
−2/frame, wrap at BOTTOM; `baseLow` matches ABMLAU (`CMP I,4/IFEQ`, W3MAIN:1385); drone bounds
properly claimed (`SOUND-DRONE-TOP-70`/`-BOUND-30`, `TOP` in DERIVED).
**Gates:** MC vitest 843 pass · lint (tsc) clean · MC build clean · orchestrator 457 pass · and
all green on the trial-merged tree (develop +20, joust/sprint only — no MC overlap, clean merge).
**Non-blocking:** bonus-city cue timing → mc8-7; drone live trigger → mc8-5; SLAM → mc8-6.

### Specialist Coverage (all 9 subagents disabled — performed manually)

- [DOC] Comment/doc analysis — VERIFIED accurate. The stale "mc8-3" sweep attribution is
  corrected to mc8-4 in both sites (`audio.ts:44-46`, `:164-166`); every new comment cites a real
  ROM line (W3MAIN:1385/3911/4647/4845, A35820.1C:354-355); `core/drone.ts` uses `//` not `/** */`
  for numbers (the citation-scanner JSDoc-leak avoided). No stale/misleading comment introduced.
- [RULE] Project + TS lang-review compliance — VERIFIED. Exhaustive `switch` keeps `default: never`
  (`audio-dispatch.ts:56`); the low branch is `event.baseLow ? …` — no `||`-on-falsy-0 trap (ammo 0
  routes to `ammoEmpty` earlier); relative imports carry `.js`; new arrays/records are `readonly`;
  core/shell boundary held (`purity.test.ts` green). New core literals are claim-backed
  (citations green). No rule violation.
- [TEST] Test quality/coverage — VERIFIED non-vacuous. 7-mutation battery: 6 of 7 mutants reddened
  their guard (M6 exposed a pre-existing gate gap, filed as a note). AC6 is an explicit GREEN
  regression guard; AC4 negatives are mutation guards (pass by design). Gap noted: the edge cues
  are unit-tested on synthetic prev/curr, not an end-to-end stepGame drive — acceptable (main.ts
  wiring is source-text verified; the bonus-city timing nuance is filed mc8-7).
- [SEC] Security — clean. No user input parsing, network, secrets, or injection surface; pure
  in-process audio wiring. N/A.
- [SIMPLE] Simplicity — clean. `droneSweep`/`playEdgeCues`/`feedDrone` are minimal; no dead local
  code (`feedDrone` is a public API method whose caller is the deferred mc8-5 trigger). No
  over-engineering.
- [TYPE] Type design — VERIFIED. `LaunchedEvent.baseLow?: boolean` is a pure optional field (union
  stays 6 kinds); `DroneKind` is a closed string union; `tsc --noEmit` clean repo-wide.
- [EDGE]/[SILENT] Boundaries + silent failures — VERIFIED (see Devil's Advocate): `ammo === 4`
  exact crossing, `over→over` and `between→over` guards, `prev` correctness; the engine no-throw
  contract is preserved (`feedDrone` early-returns, mirroring `play`). No swallowed error added.

**Handoff:** To SM for finish-story.