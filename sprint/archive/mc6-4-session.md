---
story_id: "mc6-4"
jira_key: "mc6-4"
epic: "mc6"
workflow: "tdd"
---
# Story mc6-4: Self-playing attract (smart-cursor demo): a deterministic seeded auto-player drives cursor + fire during phase attract so the field plays itself; any input -> setup. Pure attract driver in src/core (seeded RNG, no clock). REV-01 W3MAIN.MAC:891 / 5277 / 5331 attract

## Story Details
- **ID:** mc6-4
- **Jira Key:** mc6-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Repos:** arcade
- **Branch:** feat/mc6-4-self-playing-attract
- **PR:** https://github.com/slabgorb/arcade/pull/197 (MERGED, merge commit 25bcc28c)
- **Epic:** mc6 (Missile Command — attract + state machine + pause (REV-01): the full MAINLINE attract/setup/play/pause loop)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T11:14:44Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T08:51:57Z | 2026-08-10T08:54:13Z | 2m 16s |
| red | 2026-08-10T08:54:13Z | 2026-08-10T10:39:09Z | 1h 44m |
| green | 2026-08-10T10:39:09Z | 2026-08-10T10:53:24Z | 14m 15s |
| review | 2026-08-10T10:53:24Z | 2026-08-10T11:14:44Z | 21m 20s |
| finish | 2026-08-10T11:14:44Z | - | - |

## Technical Approach

**Scope from mc6-2 archive (sprint/archive/mc6-2-session.md:160,185,189-190,206):**

- `createGame` currently boots to `'play'`, NOT `'attract'`. mc6-2 deliberately deferred boot-to-attract to mc6-4. So mc6-4 must:
  1. Wire `createGame` to boot to `attract` (INITIAL_PHASE)
  2. Add `attract` handling on `GameState` in the state machine
  3. Broaden attract's exit trigger to "ANY input -> setup" (not just fire keys)
- The pure attract driver must be seeded RNG + clock-free (respect src/core purity boundary)
- OUT OF SCOPE: rendering attract / THE-END / setup screens (mc6-5)

**Simulation dir:** `plugins/missile-command/src/core/`
- Attract/state model: `plugins/missile-command/src/core/state.ts` (INITIAL_PHASE, stateCode, mainline)
- Cursor model: `plugins/missile-command/src/core/cursor.ts`
- Wiring seam: `plugins/missile-command/src/core/game.ts`
- ROM source: `plugins/missile-command/reference/source/W3MAIN.MAC` (lines 891 / 5277 / 5331 for attract behaviour)

**Implementation plan:**

1. Create pure `attractDriver(state: GameState): GameState` in `src/core/game.ts` that:
   - Only runs when `state.phase === 'attract'`
   - Uses seeded RNG (`state.rng`) to drive cursor movement and fire timing
   - Does NOT use clock/Date.now/performance.now
   - Returns the mutated state (or a fresh state copy with cursor/fire actions applied)

2. Wire `attractDriver` into `stepGame` reducer to execute during attract phase

3. Add input handler to transition `attract -> setup` on ANY input (currently only fire keys trigger start):
   - Broaden the exit from attract to all keyboard input
   - Wire this through the input seam (fireOrStart or similar)

4. Modify `createGame` boot phase from `'play'` to `'attract'` (INITIAL_PHASE)

5. Add ROM citations for attract behaviour (W3MAIN.MAC:891 / 5277 / 5331) to `docs/rom-study/claims/` as needed

## Acceptance Criteria (measured, not transcribed)

> ⚠ **SUPERSEDED where they conflict with the TEA RED ruling + ROM findings below**
> (Delivery Findings / Tea Assessment). The SM sketched these before the ROM was read;
> TEA measured and corrected them, and the RED tests are the authoritative spec:
> - AC1's "driver uses only `state.rng`" is **wrong** — AUTCUR is DETERMINISTIC PURSUIT,
>   not RNG (the "seeded" is the whole replay via ICBM spawns). Do NOT drive the cursor
>   from `state.rng`.
> - AC3's "score may increment / ABMs interact" is emergent from running the combat sim
>   in the attract branch — pin the OBSERVABLES the tests assert, not this prose.
> - AC5's numbering aside, createGame→attract is real; the play field is `createPlayGame`.

**AC1: Pure seeded attract driver exists and is deterministic**
- Implement `attractDriver(state: GameState): GameState` in `src/core/game.ts`
- Driver uses only `state.rng` (seeded RNG), no `Date.now`/`Math.random`/`performance.now`
- Purity test (`purity.test.ts`) must stay green
- Determinism: replaying the same seed produces identical cursor/fire sequences

**AC2: Attract driver moves cursor and fires during phase attract**
- `stepGame` integration: attractDriver runs when `state.phase === 'attract'`
- Driver produces measurable cursor position changes frame-to-frame
- Driver produces fire events (ABM launches) during attract sequence
- Test: pin a seed, assert cursor moves and fire count increases over N frames

**AC3: Field plays itself during attract (no player interaction needed)**
- ABMs from attract driver interact with enemies
- Enemy spawns continue in attract phase
- Score may or may not increment (depends on ROM behavior) — pin what the ROM does
- Explosions/collisions occur naturally from auto-player actions

**AC4: Any input transitions attract -> setup (broadened from fire-key-only)**
- Keyboard input handler catches ALL keys (not just Z/X/C fire keys)
- Any keydown in attract phase advances state to `'setup'`
- Test: send a random key (e.g., 'a', ' ', 'Enter') while in attract, assert phase becomes 'setup'

**AC5: createGame boots to attract, not play**
- Change `createGame(seed)` return object's `phase` field from `'play'` to `'attract'`
- Verify: 17 existing combat/wave test suites stay green (they call `createGame()` and expect the state to evolve)
- Attract phase runs one frame, then accept input to transition to setup

**AC6: ROM citations present and verified**
- File anchor claims for attract behaviour at W3MAIN.MAC:891 / 5277 / 5331 in `docs/rom-study/claims/`
- `check-citations.mjs` byte-verifies the citations
- Un-cited-literal gate stays green

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

### TEA RED ruling (user, this session) — the phase-model shape

Following the mc6-1/mc6-2 precedent that the USER rules phase-model shape at RED, O'Brien
(TEA) measured the ROM and surfaced the fork; the user ruled **Faithful**:

- **createGame boots to `'attract'`** (was `'play'`). A new **`createPlayGame(seed)`** returns
  the old fully-defended `'play'` field; the ~18 combat/wave suites that call `createGame()` and
  assume play migrate to it in GREEN (blast radius the user accepted).
- **stepGame `'attract'` branch:** runs the full combat sim + the pure `attractDriver` (AUTCUR
  self-player) so the field plays itself; phase stays `'attract'` (does NOT auto-flip via
  nextPhase). MIRV suppressed in attract (ROM W3MAIN.MAC:1519).
- **Any input in attract → `'setup'`** (broadened from mc6-2's fire-keys-only → play).
- **stepGame `'setup'` branch auto-advances to `'play'`** (reseed a fresh field) THIS story.
  End-to-end: `attract –(input)→ setup –(1 frame)→ play`.

### ROM findings (measured at RED, W3MAIN.MAC / W3COMN.MAC)

- **AUTCUR (:895, `.SBTTL` :891)** is DETERMINISTIC pursuit, NOT RNG: it targets an active ICBM,
  leads it (V to a ~14-dot offset, H via velocity>>4), steps the cursor by **AUTSPD=2**
  (W3COMN.MAC:233), and fires an ABM from the NEAREST base when on-target AND `<2` ABMs onscreen
  AND `abms+explosions < incoming ICBMs`, then picks a new target (NEWTAR). The story's "seeded
  RNG" = the whole attract *replay* is seed-deterministic (ICBM spawns), the cursor logic itself
  uses NO rng. Tests pin the OBSERVABLES (pursuit direction, ≤AUTSPD/axis, nearest-base fire gate,
  determinism) — NOT the exact fixed-point lead math (that is mc9-level, and ADCURS multiplies the
  raw AUTSPD increment, so exact pixel step is out of scope here).
- Start-in-attract writes `STATE = S.SETU` (W3MAIN.MAC:740-757) → attract→setup is ROM-faithful.
- **Scope note (FILED):** the title also cites W3MAIN.MAC:**5277** (REFRESH ATTRACT MODE MESSAGES)
  and **5331** (SCROLL ATTRACT MESSAGES) — these are attract *message render*, which is **mc6-5**
  (attract/THE-END/setup render), NOT mc6-4. mc6-4 requires only the AUTCUR citation (:891/:895).
- **Follow-up (FILE in GREEN/finish):** attract demo game-over→attract loop (ROM ENDGM→attract)
  is out of mc6-4 scope; the demo keeps phase `'attract'` and does not handle a full demo loss.

No other upstream findings.

### Reviewer (code review)

- **Improvement** (non-blocking): MIRV-suppression during the attract demo (`stepCombat` `opts.suppressMirv`, ROM W3MAIN.MAC:1519) is unverified — MIRV is wave-6+ eligible, the attract-demo tests run wave 1, so a mutation removing the suppression stays green. Affects `plugins/missile-command/tests/self-playing-attract.test.ts` (add an attract-phase MIRV-eligible fixture asserting no split, vs play). *Found by Reviewer during code review.*
- All other review findings (2 vacuous tests, 5 under-migrations, 4 comment/prose, 1 type-readonly) were fixed in-place round-1 (commit 6acd1b29) and mutation-verified. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

(No deviations logged during setup phase.)

### GREEN (Julia / Dev) — implementation notes & scoped deviations

- **Combat suite migration:** flipping `createGame` to boot `'attract'` reddened 7 suites
  (game, mc3-playthrough, mc4-playthrough, mirv-integration, pause, sound-events,
  audio-dispatch) that used `createGame()` as a PLAY fixture. Migrated each to
  `createPlayGame()` (createGame's distinct attract boot + determinism is now covered by
  self-playing-attract.test.ts). game.test.ts's AC1 now legitimately tests createPlayGame.
- **stepGame refactor:** extracted the combat body into `stepCombat(state, opts)` so play
  and the attract demo run the IDENTICAL battle; `opts.suppressMirv` disables MIRV in
  attract (W3MAIN.MAC:1519). Play = `stepCombat(state,{})` — byte-identical to before.
- **DEVIATION (scoped, from the TEA ruling):** the attract demo keeps phase `'attract'`
  forever — it does NOT advance waves or handle a demo game-over→attract loop (ROM
  ENDGM→attract). When the wave-1 budget empties + clears, the demo simply goes quiet.
  This is the filed follow-up (attract demo loop, out of mc6-4 scope); the tests assert
  the demo plays (cursor moves, ABMs fire, explosions) over its lively window, which holds.
- **DEVIATION (shell UX):** `main.ts` routes pointer**down** (a click) in attract → setup,
  not every pointer**move** — a stray mouse jitter should not end the demo. Keydowns leave
  via `fireOrStart`. "Any input" is honoured for keyboard (any key) and a deliberate click.
- **AUTCUR fidelity:** the driver chases the warhead directly at `AUTSPD=2` and fires from
  the nearest loaded base. The exact ROM lead (14-dot V offset, Hvel>>4 H prediction) and
  its fixed-point AUTSPD·ADCURS step are mc9-level pixel fidelity — deliberately not modelled
  here (consistent with the TEA ROM findings). No new claim needed: MC-ANCH-W3MAIN-891 exists.

### Reviewer (audit)

- **DEVIATION: attract demo keeps phase 'attract' forever (no wave advance / no demo game-over
  loop)** → ✓ ACCEPTED by Reviewer: matches the TEA RED ruling and the filed follow-up (attract
  demo loop, out of mc6-4 scope). The demo stays lively across its tested window; AC4 pins that.
- **DEVIATION: pointerdown (not pointermove) leaves the demo** → ✓ ACCEPTED by Reviewer: sound
  shell UX (a stray mouse jitter shouldn't cut attract short); "any input" is honoured for keyboard
  (any key) + a deliberate click. The main.ts comment was corrected in round-1 to state exactly this.
- **UNDOCUMENTED (found in review): MIRV-suppression-in-attract is unverified** — the `opts.suppressMirv`
  path (ROM :1519) is correct-by-construction but no test exercises it (MIRV is wave-6+; the demo runs
  wave 1). Severity: LOW. Accepted non-blocking with rationale in the Reviewer Assessment; an
  attract-MIRV test is an optional follow-up.
- **AUTCUR direct-chase vs ROM lead** → ✓ ACCEPTED by Reviewer: the 14-dot/Hvel>>4 lead is mc9-level
  pixel fidelity, correctly scoped out by TEA; the tested observables (pursuit, gate, nearest base,
  determinism) are faithful.

## Sm Assessment

**Setup complete — routing to TEA for RED.** Story is title-only (no description), so the
title IS the spec and every AC was measured, not transcribed. Merge gate clear (no open
PRs), clean tree on `develop`, no sibling checkout racing mc6-4, branch
`feat/mc6-4-self-playing-attract` cut from `develop`.

**Verified before setup:**
- `src/core/state.ts` really holds `INITIAL_PHASE='attract'`, `stateCode`, `mainline` (mc6-1);
  `cursor.ts` and `game.ts` seams present; `reference/source/W3MAIN.MAC` present.
- Scope boundary lifted from mc6-2 archive (:160,185,189-190,206): `createGame` boots to
  `'play'` today; boot-to-attract + `attract` on `GameState` + broaden-to-any-input were
  **deliberately deferred to mc6-4**. Render of attract/THE-END/setup is **mc6-5, out of scope**.

**Risks TEA must resolve against the ROM (do not take the ACs on faith):**
- AC3 wording ("ABMs launch, enemies spawn, score may increment") is an SM guess at what
  "the field plays itself" means. Ground it in W3MAIN.MAC:891/5277/5331 — the ROM attract may
  be a scripted/seeded demo, not a full live game. Pin what the ROM actually does before RED.
- AC5 must not redden the ~17 combat/wave suites that call `createGame()` and expect play; if
  the boot phase flips to `'attract'`, those suites likely need an explicit start-into-play
  helper. Confirm the blast radius and cite the count at RED (memory: joust file-count census
  trap — recount by content, not by the number in a prior note).
- Purity: driver must use only `state.rng`; the core-boundary scanner reads source TEXT incl.
  comments — no `window.`/`document.`/`Date.now`/`performance.now`, even in comments.

Next agent: **TEA (red phase).**

## Tea Assessment

**RED landed — 35 failing tests across exactly the two files I authored/edited; 1116
pass; `tsc --noEmit` green (loader idiom keeps absent surfaces out of static imports).**
Every failure is an intentional feature-absence red that GREEN resolves — no collateral
damage to the combat/wave suites (createGame still boots `'play'` in RED, so they stay
green until Dev flips it).

### The GREEN surface Dev must build

**`src/core/game.ts`**
- `createGame(seed=1)` → boot `phase: 'attract'` (use `INITIAL_PHASE` from state.ts).
- `createPlayGame(seed=1)` → the OLD createGame field but `phase: 'play'` (share one builder
  so the two can't drift). **Then migrate the ~18 combat/wave suites** that call
  `createGame()` and expect play to `createPlayGame()` — they go red the moment createGame
  flips. (Find them: `grep -rl 'createGame(' plugins/missile-command/tests`, keep the ones
  that step into combat / assert `phase 'play'`.)
- `attractDriver(state): GameState` — pure AUTCUR (W3MAIN.MAC:895). Not-`'attract'` →
  unchanged. Pick nearest ACTIVE (`!arrived`) ICBM; none → cursor holds. Move cursor toward
  the (led) target by ~`AUTSPD=2`/axis, gradual (no teleport), clamped. When converged AND
  `abms.length < 2` AND `abms+explosions < icbms` → launch ONE ABM from the base nearest the
  cursor (H thresholds 0x60/0xA0). Deterministic, pure.
- `stepGame` `'attract'` branch: apply `attractDriver`, run the full combat sim, keep
  `phase: 'attract'` (do NOT let `nextPhase` flip it). Suppress MIRV in attract (W3MAIN.MAC:1519).
  Emit soundEvents like the play path (checklist #14 — a silent branch reddens AC4).
- `stepGame` `'setup'` branch: auto-advance → `startGame(state)` (fresh play reseed).
- `startGame(state)`: reseed to fresh `'play'` from `phase ∈ {'over','setup'}`; else unchanged
  (attract removed — it exits via input).

**`src/shell/input.ts`**
- `beginSetupOnInput(state)`: `phase==='attract' ? {...state, phase:'setup'} : state`.
- `fireOrStart(key,state)`: attract → `beginSetupOnInput`; over + fire key → `startGame`; else
  `fireFromKey`. **`main.ts`**: route pointerdown/pointermove in attract → `beginSetupOnInput` too.

### Rule Coverage (typescript.md lang-review checklist)

- **#14 (edge computed in one state-machine branch):** covered — AC4 asserts the attract
  branch still emits soundEvents, and AC5 asserts the setup→play reseed clears the channel
  (`soundEvents: []`). A branch that forgets either reddens.
- **#15/#25 (source/citation guard keys on token not claim):** AC6 binds to the SMART CURSOR
  MOVER verbatim, not a bare 891..895 line-range cover. No source-text greps used elsewhere.
- **#18/#26 (vacuous / self-referential assertions):** AC4 uses a real PLAY control (cursor
  static in play, moving in attract); AC3 gate test would add a 3rd ABM without the gate; every
  assertion draws a term from the code under test.
- **#22 (REJECT rewrite inverts NaN safety):** the `<2` fire gate is asserted to fail CLOSED
  (no 3rd ABM), pinning the safe direction.
- **Purity (#core boundary):** auto-swept over all `src/core/*.ts` by purity.test.ts — the new
  `attractDriver`/`createPlayGame` in game.ts are covered automatically; keep them clock/entropy-free.

### Notes for Dev / Reviewer
- AC6 is ALREADY green: `MC-ANCH-W3MAIN-891` (SMART CURSOR MOVER (ATTRACT)) is pre-filed in
  `docs/rom-study/claims/anchors.json`. No new claim needed. The title's 5277/5331 cites are
  attract-message RENDER = **mc6-5**, out of scope here.
- **Follow-up to FILE (descoped):** attract demo game-over→attract loop (ROM ENDGM→attract)
  is out of mc6-4 scope; the demo keeps `'attract'` and does not handle a full demo loss.
- Integration frame budget is 300 (`DEMO_FRAMES`, seed 7) — generous for wave-1 spawns + ABM
  flight. If a GREEN AUTCUR is a slow starter, tune the driver, not the threshold.

Next agent: **Dev (green phase).**

## Dev Assessment

**GREEN complete — 1151/1151 mc tests pass; `tsc --noEmit`, purity, and un-cited-literal
gates all green.** Two commits: RED (`2daa3207`), GREEN (`a8293ecc`).

**Changed src:** `core/game.ts` (createGame→attract + createPlayGame; attractDriver;
startGame repoint to {over,setup}; stepGame split into stepGame + stepCombat with the
attract/setup branches), `shell/input.ts` (beginSetupOnInput + broadened fireOrStart),
`main.ts` (pointerdown→setup in attract). **Changed tests:** the RED files plus 7 combat
suites migrated to `createPlayGame`.

**Self-review vs typescript.md checklist (the dev-exit gate extension):**
- #14 (edge in one branch): the attract branch returns `{...stepCombat(...), phase:'attract'}`
  at ONE exit, carrying `soundEvents` through; the setup branch reseeds with `soundEvents: []`.
  No transition/output dropped. `stepCombat` is the single combat exit shared by play + attract.
- #1/#2: no `as any`, no casts, no non-null assertions; `opts` is a typed bag; `!opts.suppressMirv`
  defaults MIRV ON (undefined→run), matching play.
- #21/#22: driver geometry is finite (Math.hypot/abs/sign on positions); `<`/`<=` gates fail
  CLOSED; both `reduce`s run only on guarded non-empty arrays.
- purity: `attractDriver`/`createPlayGame` are clock/entropy/DOM-free (auto-swept, green).

**For the Reviewer:** the two scoped deviations (attract demo never advances waves / no
game-over→attract loop; pointerdown-not-pointermove leaves the demo) are in Design Deviations
above, and the demo-loop is a filed follow-up. `createGame`'s distinct attract boot +
determinism live in self-playing-attract.test.ts (game.test.ts now tests createPlayGame).

Next agent: **Reviewer (review phase).**

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (1152 pass, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (covered by my own read + mutation battery) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (covered by my own read + mutation battery) |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 7, dismissed 0 — 2 vacuous tests + 5 under-migrations, all FIXED round-1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0 — all FIXED round-1 (citations independently re-verified accurate) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (no new input surface; pure core + one pointerdown reducer) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 8 | confirmed 8, dismissed 0 — 29 rules/71 instances; all FIXED round-1 (overlaps #4/#5 + opts readonly) |

**All received:** Yes (4 enabled returned, 5 disabled skipped)
**Total findings:** 12 distinct confirmed (2 vacuous tests, 5 under-migrations, 4 comment/prose, 1 type-readonly), 0 dismissed, 0 deferred — ALL fixed in round-1 (commit 6acd1b29).

## Reviewer Assessment

**Verdict:** APPROVED (with round-1 fixes applied — commit `6acd1b29`)

All four enabled specialists returned; the five disabled ones I covered myself by reading the
diff and running a 4-mutant battery on the quiescent tree. Every confirmed finding was fixed in
round-1 and the fixes are mutation-verified.

**Confirmed findings, all FIXED:**
- `[TEST]` AC3 "< 2 ABMs" gate test was CONFOUNDED (single-ICBM fixture closed the gate via the
  2nd clause regardless) → rebuilt with 3 ICBMs + a boundary complement. **Mutation-verified:**
  dropping the `<2` clause now reds the isolated test (was green before).
- `[TEST]` soundEvents-clear test was vacuous (`dirty()` soundEvents is `[]`) → injects a real
  stale cue now. **Mutation-verified:** a setup branch that preserves soundEvents now reds it.
- `[TEST]`/`[RULE]` under-migration: `createGame`→attract silently drifted 5 unmigrated stepGame-loop
  suites → migrated to `createPlayGame` (cruise-integration, sputnik-integration,
  mc5-8-sputnik-fire-arbitration, mc8-4-event-wiring, mc8-4-fidelity). Verified render-*/fire-ammo
  don't step and bonus-city always pins phase, so those correctly stay on `createGame`.
- `[DOC]` main.ts "click/move" (only pointerdown exits) + stale keydown comment (attract=any key→setup);
  `[DOC]` input.ts JSDoc-embedded ROM cite → moved to `//`; `[DOC]`/`[RULE]` game.ts ATRACT polarity
  ("clears ATRACT to attract mode", not "set"). Comment-analyzer independently re-verified ALL my ROM
  citations (AUTCUR :891/:895, AUTSPD :233, MIRV-suppress :1519, fire gate :1035-1047, S.SETU :740-757,
  NEWGAM chain) as byte-accurate.
- `[RULE]` stepCombat `opts` param marked `readonly`.

**Mutation battery (I ran, covering the disabled edge/silent-failure specialists):** 4 mutants — drop
`<2` gate clause → RED; setup branch keeps soundEvents → RED; invert pursuit direction → RED; **never
suppress MIRV → GREEN (equivalent mutant).**

**Accepted LOW observation (non-blocking, documented per no-silent-caps):** MIRV-suppression-in-attract
(`opts.suppressMirv`, ROM W3MAIN.MAC:1519) is UNVERIFIED — MIRV is wave-6+ eligible and the attract-demo
tests run wave 1, so the flag's effect is unobservable there. The code path is ROM-cited and defensively
correct; a dedicated attract-MIRV test (construct an in-band eligible ICBM in attract, assert no split)
is a reasonable optional follow-up, not a blocker.

**[VERIFIED] purity** — grep of game.ts's new fns for Date.now/performance.now/Math.random/window./document.
= zero hits; attractDriver's determinism is drawn only from downstream `state.rng` spawns, never touched
directly — evidence: purity.test.ts auto-sweep green + rule-checker rule #27 clean.
**[VERIFIED] play path unchanged** — `stepGame(playState) === stepCombat(state, {})`, byte-identical to the
pre-mc6-4 combat body (only the MIRV condition gained `!opts.suppressMirv`, which defaults true) — evidence:
all 7 migrated combat suites + mc3/mc4 playthroughs green.
**[VERIFIED] data flow** — attract input → `fireOrStart`/`beginSetupOnInput` → phase 'setup' → stepGame
reseed → 'play' (self-playing-attract.test.ts end-to-end test).

### Devil's Advocate

Could this be broken? (1) The attract demo could get STUCK: if the driver never fires, the demo is inert.
Countered by AC4 (cursor moves, ABMs launch, explosions occur over 300 frames) + the mutation showing an
identity driver reds the control test. (2) A malicious/confused user spamming keys in attract → repeated
beginSetupOnInput → idempotent (setup→setup is a no-op via startGame's phase guard; stepGame advances
setup→play once). (3) The demo depletes ammo and never refills (no wave advance) → goes quiet — this IS a
real limitation, but it's the filed follow-up (attract demo loop), and the demo stays lively across its
tested window. (4) Determinism under floats: attractDriver snaps onto fractional ICBM positions; two runs
same seed are byte-identical (AC4 determinism test). (5) Empty/degenerate inputs: no-target holds the
cursor, no-loaded-base skips the fire, guarded reduces never touch empty arrays — all tested. (6) The
`suppressMirv` gap above is the one genuinely unverified path, accepted as wave-6+ and non-blocking. No
Critical/High survives.

**Handoff:** To SM for finish-story.