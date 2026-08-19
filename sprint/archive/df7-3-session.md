---
story_id: "df7-3"
jira_key: "df7-3"
epic: "df7"
workflow: "tdd"
---
# Story df7-3: Self-playing attract demo

## Story Details
- **ID:** df7-3
- **Jira Key:** df7-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df7-3-self-playing-attract-demo
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T13:46:41Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T12:57:32Z | 2026-08-19T13:00:52Z | 3m 20s |
| red | 2026-08-19T13:00:52Z | 2026-08-19T13:12:35Z | 11m 43s |
| green | 2026-08-19T13:12:35Z | 2026-08-19T13:20:00Z | 7m 25s |
| review | 2026-08-19T13:20:00Z | 2026-08-19T13:33:33Z | 13m 33s |
| green | 2026-08-19T13:33:33Z | 2026-08-19T13:38:57Z | 5m 24s |
| review | 2026-08-19T13:38:57Z | 2026-08-19T13:46:41Z | 7m 44s |
| finish | 2026-08-19T13:46:41Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **[TEA][Improvement][non-blocking] AC3's ROM attract-display citations are ALREADY covered — df7-3 adds no new claim.** Both lines AC3 names — HALDIS (`AMODE1.SRC:377`; the story's `:375` is the section header df7-1 corrected to `:377`) and HALL13 (`AMODE1.SRC:230`, the "ATTRACT MODE NOW" `JMP HALDIS`) — are already byte-pinned in `plugins/defender/docs/rom-study/claims/19-phase.json` by df7-1 and re-verified every run by the df1-1 gate (`citations.test.ts`). So AC3's citation half is a *regression guard that is green on arrival*, not new RED work. The RED substance of AC3 is therefore the **palette-index-only render guard** (`df7-3-attract.test.ts` — every composed attract pixel ∈ 0..15, with real content). Dev: do NOT invent a new attract-display claim; if you add auto-player tuning knobs they are AI targets (the jt13 `demo-ai.ts` precedent: `ABOVE_ENEMY` etc. are explicitly "not a cited ROM constant"), not ROM claims — keep them named + commented, out of `claims/`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
- **[TEA] "seeded" pinned as the mc6-4 "no entropy of its own" reading — `attractInput(sim: SimState): Input`, no second rand.** The story says "seeded RNG ... the mc6-4 analog." The cited analog (missile-command AUTCUR) and the pac-man `autoPlayDir(pac)` / joust `demoInput(game)` precedents are ALL deterministic functions of the field with no private entropy — the "seed" enters through the game's own `createSim(rand)` seed, so the same seed replays the attract bit-for-bit. I therefore pinned the auto-player as `attractInput(sim)` (field-only, no `rand` parameter), NOT `attractInput(sim, rand)`. What the spec asked for (pure, seeded, clock-free, same-seed replay) is fully satisfied — the determinism/replay tests seed the SIM (`createSim(makeRand(seed))`) and prove byte-identical runs + seed-flow divergence. Dev: if a private entropy source turns out genuinely necessary, the replay contract still holds, but keep the field-only signature unless the sim alone cannot produce a lively demo.

### Reviewer (audit)
- **[TEA] "seeded" pinned as field-only `attractInput(sim)`** → ✓ ACCEPTED by Reviewer: sound. It matches the cited mc6-4 AUTCUR / pac-man `autoPlayDir` / joust `demoInput` precedents (auto-players with no private entropy), the seed genuinely flows through `createSim`, and the determinism + seed-flow tests prove same-seed bit-for-bit replay and different-seed divergence. No hidden entropy in `attract.ts` (security + rule-checker + purity sweep all confirm).
- **Undocumented deviation (Reviewer):** the auto-player targets by ROW only and always fires right (`reverse` is never set), so it wastes shots on landers behind it and only hits those approaching from ahead. Spec said the demo should "show actual gameplay"; the code delivers a functional-but-modest patrol-and-shoot. Dev's assessment acknowledges "not a wave-clearing optimum," so this is disclosed, not hidden. Severity LOW (demo quality, not correctness) — NOT a blocking finding, recorded for the df7 full-lifecycle visual playtest to eyeball.

## Tea Assessment

RED phase complete — two failing test files committed (`96c557fa`), verified RED by the testing-runner (absent-feature collection failure + incomplete-wiring scan). Ready for Dev (Korben) GREEN.

**The seam Dev must build (pinned by the tests):**
1. `plugins/defender/src/core/attract.ts` — a PURE, deterministic, clock-free module:
   - `export function attractInput(sim: SimState): Input` — the mc6-4/pm4-8 auto-player. A deterministic function of the field that returns the REAL sim `Input` (thrust/reverse/up/down/fire/smartBomb) and MUST actually PLAY — move the ship and fire — so the demo field is alive (the jt13 dead-bird lesson). Same-seed sim ⇒ byte-identical run.
   - `export function hasPlayerInput(input: Input): boolean` — true iff ANY button is pressed. The pure core of AC2.
   - `purity.test.ts`'s armed `src/core` sweep will cover this file automatically once it lands — no clock, no rAF, no `Math.random`, no shell import.
2. `plugins/defender/src/main.ts` — wire the driver into the df7-2 boot loop:
   - DURING attract, step the REAL sim: `session = { ...session, sim: stepSim(session.sim, attractInput(session.sim)) }` — the SAME `stepSim` play uses (no forked demo path).
   - Broaden the attract exit: `startRequested` must fire on ANY human key, computed from the HUMAN snapshot via `hasPlayerInput(mapInput(held))` (in addition to `startPressed(held)`). Feed the HUMAN keyboard to the exit; feed `attractInput(sim)` to the SIM — never cross them, or the demo exits itself on frame 1.

**Test files:**
- `tests/df7-3-attract.test.ts` — AC1 (well-formed Input; the demo plays; diverges from a NEUTRAL dead run; same-seed replay; seed-flow divergence), AC2 (hasPlayerInput: NEUTRAL false, each of 6 buttons true, combos true), AC3 (every composed attract pixel is a df2 palette index 0..15 with real content), AC4 (no consecutive demo-frame strobe over 180 frames; the smart-bomb clear does not strobe). Whole file RED-by-collection until `attract.ts` exists.
- `tests/df7-3-main-wiring.test.ts` — `main.ts?raw` source scan (df7-2 idiom): imports `./core/attract`, `stepSim(x, attractInput(` drives the sim in attract, `hasPlayerInput(mapInput(` computes the exit. The `startRequested:` scan already passes (df7-2).

**Rule Coverage (TS lang-review checklist):**
- **#25 (over what text a match runs):** both files strip line+block comments before every source-scan / and the wiring scan anchors to `stepSim(x, attractInput(` and `hasPlayerInput(mapInput(` — a token surviving only in a doc comment cannot false-green (the df7-2 idiom, copied verbatim).
- **#18 (a fixture that fails by passing):** every fixture is guarded — `NEUTRAL` is proven all-false before `hasPlayerInput(NEUTRAL)===false`; the determinism replay asserts `inputs.some(hasPlayerInput)` so it compares a run that actually plays; the palette frame asserts `distinct.size > 1` so a blank clear can't pass it; the divergence test isolates the auto-player by holding the seed constant.
- **#15 (guards mutation-tested / anchored):** the strobe guard uses the real `assertNoFullFrameStrobe` (fails CLOSED on a malformed/empty pair, so it also proves the frames are real 292×240 rasters); regex anchors are specific expressions, not bare tokens.
- **Purity/determinism (df1-1 boundary):** `attract.ts` is pinned as a pure field-only function; the replay + seed-flow tests enforce clock-freedom and seeding without a private entropy source.

**Delivery Findings / Deviations:** see the two entries above — AC3's ROM citations are already covered by df7-1 (regression guard, not new claim work); "seeded" pinned as field-only (`attractInput(sim)`).

## Sm Assessment

**Story:** df7-3 — Self-playing attract demo (defender, 3pt, tdd, p2). A pure,
seeded, clock-free auto-player drives the REAL df3 sim during phase `attract`, so the
attract screen plays itself; ANY player input exits attract → setup. The mc6-4 / pm4 /
joust-jt13 self-play analog.

**Board state at setup (all verified this session):**
- Sibling probes CLEAN: no `df7-3` branch on origin, no `df7-3` session in any
  `a-*` checkout. Nobody else owns it.
- Dependencies satisfied: df7-1 (phase machine core, `phase.ts`) and df7-2
  (setup→play wiring) are both `status: done` and merged. df7-3 CONSUMES them + df3
  `sim.ts`. The spine it hangs off is in place.
- Merge gate clear: the one open PR (#584) is a sibling's df6-1 (audio files —
  disjoint blast radius from this attract driver); `pf agent start sm` returned
  `NEW_WORK_STATE`, not blocked.
- No parked banner, no either/or in the ACs, no stale-measurement premise to refute.
  The ROM cites (HALDIS `AMODE1.SRC:375`, HALL13 `:230`) are design targets for TEA/Dev
  to verify under the df1-1 citation gate — not SM-pre-verified state claims.

**Binding design principle (carry into RED):** drive the REAL df3 sim via the seeded
auto-player — do NOT fork a separate demo path (the jt13 `demoInput` lesson). Pure,
seeded, clock-free, in `plugins/defender/src/core`. Same seed replays bit-for-bit.
Colour by df2 palette index only. No full-frame strobe (ADR-0005 / df4-2 render guard).

**Acceptance criteria** (verbatim from epic YAML):
- AC1: Pure, seeded, clock-free attract driver drives REAL df3 sim (no fork — jt13
  lesson); `purity.test.ts` green; same seed replays bit-for-bit.
- AC2: ANY player input during attract transitions attract→setup; test pins first real
  input exits demo.
- AC3: Attract display cited (HALDIS `defender/AMODE1.SRC:375`, HALL13 `:230`) with
  `claims/*.json` under df1-1 gate; colour by df2 palette index only.
- AC4: No full-frame strobe (ADR-0005); df4-2 render guard stays green with demo live.

**Claim pushed:** commit on `feat/df7-3-self-playing-attract-demo` (context + epic
`in_progress` stamp), branch pushed to origin so the sibling branch probe lights up.

**Routing:** tdd is phased → hand off to TEA (Leeloo) for RED. The transition/driver
functions get failing tests BEFORE the shell wires anything (Decision A precedent from
df7-1).

## Dev Assessment

GREEN complete — commit `2f2f795a`, pushed to `feat/df7-3-self-playing-attract-demo`. Full
defender suite **859/859**, `npm run lint` (tsc) clean, purity/df7-1/df7-2 guards all green.

**What shipped (two files, minimal):**
1. `plugins/defender/src/core/attract.ts` — the pure auto-player:
   - `attractInput(sim: SimState): Input` — a deterministic function of the field (TEA's
     pinned field-only signature; no second `rand`). It patrols forward (`thrust` always),
     climbs/dives onto the nearest live lander's row (`up`/`down` outside a 6-row dead-band),
     `fire`s when within 10 rows of that lander, and drops a `smartBomb` when ≥4 live landers
     crowd the field on a `camera`-derived parity (occasional, not every tick). The steering/
     fire bands are AI tuning knobs — named + commented, NOT cited ROM constants (the jt13
     `demo-ai.ts` precedent; no `claims/*.json` entry, per TEA's Delivery Finding).
   - `hasPlayerInput(input): boolean` — OR of the six buttons.
   - purity.test.ts's armed src/core sweep now covers it and is green ⇒ no clock, no rAF, no
     `Math.random`, no shell import.
2. `plugins/defender/src/main.ts` — wired the driver into the df7-2 boot loop:
   - During attract, `stepSim(session.sim, attractInput(session.sim))` — the SAME `stepSim`
     play uses, so the attract screen runs the real game (no forked demo path).
   - `startRequested: startPressed(held) || hasPlayerInput(mapInput(held))` — any human key
     exits attract→setup. The exit reads the HUMAN snapshot; the demo drives the sim; the two
     input sources never cross (or the demo would exit itself on frame 1).

**Reviewer notes:**
- No new ROM claim was added (AC3's HALDIS/HALL13 lines were already pinned by df7-1 — see
  TEA Delivery Finding). If you expect a df7-3-identity claim, that's the reason there isn't one.
- The auto-player's competence is deliberately modest (patrol + row-align + fire + swarm-bomb):
  it satisfies "the field plays itself" and the ADR-0005 guards; it is not a wave-clearing
  optimum, and it doesn't need to be. The df7 full-lifecycle visual playtest is where a human
  eyes the demo's look.
- AC4's smart-bomb strobe guard is exercised two ways: the auto-player emits `smartBomb` when
  swarmed, and `df7-3-attract.test.ts` also forces a bomb tick directly.

### Dev rework — review round 1 (commit `e94b39d1`)

Both of Zorg's findings fixed; both accepted without pushback (correct calls):
- **[MEDIUM][RULE #17] stale `main.ts` header** → corrected. Removed the now-false df7-2
  sentences ("stepped ONLY in play — the attract screen never advances a game") and added a
  df7-3 header block: the sim is stepped in BOTH play (human keyboard) and attract (pure
  auto-player, same `stepSim`), and attract exits on ANY player key, not only start/coin.
  The already-accurate inline loop-body comments were left as-is.
- **[LOW][RULE A2] magic numbers `attract.ts:72`** → extracted `SMART_BOMB_MASK = 0xff` and
  `SMART_BOMB_WINDOW = 0x08` as named, doc-commented constants beside `SWARM`, matching the
  file's convention; the expression now reads `(sim.camera & SMART_BOMB_MASK) < SMART_BOMB_WINDOW`.

Both changes are semantically identical (a comment edit + a constant rename). Verified: full
defender suite **859/859**, `npm run lint` (tsc) clean. Nothing else touched.

## Subagent Results

Toggles (`workflow.reviewer_subagents`): only `preflight`, `security`, `rule_checker` enabled;
the other six are disabled — I covered their domains myself (edge/degenerate-input, test quality,
type design, simplification, silent-failure, and comment accuracy — the last of which the enabled
rule-checker also caught).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned, 1 with findings; 6 disabled via settings)
**Total findings:** 2 confirmed, 0 dismissed, 0 deferred
**Working-tree audit:** `pf reviewer audit-tree` → initial false-DIRTY on `sprint/epic-df7.yaml`
(the pf `in_progress→in_review` phase stamp, a tracking-only change — no subagent touched `sprint/`);
`git checkout -- sprint/epic-df7.yaml` then re-audit → CLEAN (exit 0).

## Reviewer Assessment

**Verdict:** REJECTED

Two confirmed, high-confidence findings — both cheap and both belonging in this same commit
(the diff that introduced the contradiction). No Critical/High correctness, security, purity or
ADR-0005 defect; the rejection is on documentation accuracy + the file's own magic-number
convention, which this comment-rigorous codebase treats as first-class (rule #17, the df1-1
citation culture). The Reviewer cannot edit, so approval would ship the stale header as the
permanent record.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | Stale file-header comment — introduced FALSE by this diff. The df7-2 block still asserts *"The sim is stepped ONLY in play — the attract screen never advances a game (the self-playing attract demo is df7-3)"* while `main.ts:60-62` now steps the sim in `attract`. Line 9 *"a start/coin press advances attract → setup → play"* is also now incomplete — `main.ts:51` also advances on ANY player key via `hasPlayerInput`. A future maintainer trusting the header could read the attract-stepping as a bug. [RULE #17] | `plugins/defender/src/main.ts:9-12` | Update the df7-2 header block to state that df7-3 now steps the real sim during attract via the auto-player, and that any player key (not only start/coin) exits attract→setup. Keep the inline loop-body comments (already accurate). |
| [LOW] | Magic numbers `0xff` and `0x08` inlined in the smart-bomb cadence `(sim.camera & 0xff) < 0x08`, while the file promotes its three sibling tuning knobs (`ALIGN_BAND`/`FIRE_BAND`/`SWARM`) to named, doc-commented constants 40 lines above — an internal-consistency gap. [RULE A2] | `plugins/defender/src/core/attract.ts:72` | Extract named constants (e.g. `SMART_BOMB_MASK = 0xff`, `SMART_BOMB_WINDOW = 0x08`) with a one-line comment on why an 8-in-256 (~3%) duty cycle, matching the file's own convention. |

**Specialist coverage (all 8 categories — 6 disabled via settings, covered by me):**
- `[EDGE]` No boundary defect — degenerate/empty-and-all-dead lander field → `nearestLander` returns null → `up/down/fire/smartBomb` all false, `thrust:true` static, well-formed `Input`, no throw/NaN/division (`attract.ts:37-72`). Corroborated by reviewer-rule-checker #27.
- `[SILENT]` No swallowed error/silent fallback — the module has no try/catch, no `?.`-chained fallback, no default-on-error path; every branch is an explicit boolean decision.
- `[TEST]` Test quality sound (I authored these as TEA; audited adversarially): fixtures guarded (`NEUTRAL` proven all-false; `distinct.size>1`; `inputs.some(hasPlayerInput)`), no vacuous assertions, AC1-4 each covered — 20/20 green.
- `[DOC]` One confirmed stale comment (`main.ts:9-12`) — see findings table; the rest of the diff's comments match the code (reviewer-rule-checker #17 verified 7/8 header/inline claims accurate).
- `[TYPE]` Types sound — `import type` for all type-only imports, `Input`/`SimState`/`Lander` fields already `readonly`, no `as any`/non-null assertion/stringly-typed API (reviewer-rule-checker #1/#2/#5).
- `[SEC]` No security/safety defect — purity boundary + ADR-0005 + determinism/DoS all clean (reviewer-security returned `status: clean`, no findings).
- `[SIMPLE]` No over-engineering — 83 lines, one bounded scan + one pure decision function; no dead code, no premature abstraction. The only simplification note is the magic-number extraction (a consistency fix, in the findings table).
- `[RULE]` Two confirmed rule violations (#17 stale comment, A2 magic numbers) — see findings table.

**Observations (evidence-backed, with rule compatibility):**
- `[VERIFIED]` Core purity — `attract.ts` imports only `import type` from `./sim.js`/`./landers.js`; no `Date`/`Math.random`/browser-global/scheduling/`fetch`/shell import. Evidence: `attract.ts:21-22`. **Rule checked:** the CLAUDE.md core/shell purity boundary — COMPLIES; `purity.test.ts`'s armed recursive `src/core` sweep is green with the file present (security subagent re-ran it: 47/47).
- `[VERIFIED]` Determinism/seeding — `attractInput` is a pure function of `SimState`; same seed replays bit-for-bit, different seed diverges. Evidence: `df7-3-attract.test.ts` determinism + seed-flow tests pass. **Rule checked:** the "deterministic core, no private entropy" convention — COMPLIES (no RNG in the file; seed flows through `createSim`).
- `[VERIFIED]` AC2 no self-exit — the exit reads the HUMAN keyboard (`hasPlayerInput(mapInput(held))`, `main.ts:51`) while the attract step reads `attractInput(session.sim)` (`main.ts:61`); the two sources never cross. Evidence: `main.ts:51` vs `:61`. **Rule checked:** no project rule governs input routing beyond the AC — COMPLIES with AC2; corroborated by reviewer-security.
- `[VERIFIED]` `hasPlayerInput` completeness — ORs all six `Input` fields (`attract.ts:82`); no field omitted. Evidence: matches the `Input` interface (`sim.ts:64-77`). **Rule checked:** exhaustiveness (#3-adjacent) — COMPLIES; all six fields consulted.
- `[VERIFIED]` ADR-0005 safety — the smart-bomb cadence self-limits (a clear drops `liveCount` below `SWARM`), and AC4 asserts `assertNoFullFrameStrobe` over 180 demo frames + a forced bomb. Evidence: `attract.ts:71-72`, `df7-3-attract.test.ts:182-211`. **Rule checked:** the ADR-0005 / photosensitive-safety rule (outranks ROM fidelity) — COMPLIES.
- `[VERIFIED]` State-machine edge (#14) — `startRequested` is computed once on the mainline every frame, not inside a phase branch, so the attract→setup transition cannot be missed. Evidence: `main.ts:49-52`. **Rule checked:** lang-review #14 (derived edges in one branch) — COMPLIES.
- `[RULE][DOC][MEDIUM finding]` Stale header — see table.
- `[RULE][SIMPLE][LOW finding]` Magic numbers — see table.
- `[LOW/undocumented deviation]` Row-only, always-right targeting (`reverse` never set) — demo quality, not correctness; disclosed in Dev assessment; recorded in the Design Deviations audit for the visual playtest. Non-blocking.

### Rule Compliance

Rules from CLAUDE.md (core/shell purity, no un-cited constant, ADR-0005 safety) and the TS
lang-review checklist, enumerated against every governed instance in the diff:

**Rule: src/core purity boundary (no browser global / Date / Math.random / scheduling / network / shell import)**
- `attract.ts` (whole file) — compliant: imports only `type Input/SimState` (`./sim.js`) and `type Lander` (`./landers.js`); armed `purity.test.ts` sweep green.
- `main.ts` — N/A: shell file, correctly outside the boundary (owns canvas/keyboard/entropy).

**Rule: ADR-0005 photosensitive-safety (no full-frame strobe; outranks ROM fidelity)**
- `attractInput` smart-bomb emission (`attract.ts:72`) — compliant: routes the existing df5-5 `smartBombClear` (writes no framebuffer); AC4 guard green over demo + forced bomb.

**Rule: no un-cited constant in core; AI tuning knobs are named+commented, not ROM claims (joust demo-ai.ts precedent)**
- `ALIGN_BAND=6` (`attract.ts:26`) — compliant: named + doc-commented AI knob.
- `FIRE_BAND=10` (`attract.ts:29`) — compliant: named + doc-commented.
- `SWARM=4` (`attract.ts:32`) — compliant: named + doc-commented.
- `0xff` / `0x08` (`attract.ts:72`) — VIOLATION: inline magic numbers, unnamed while three siblings are named (finding A2).

**Rule: lang-review #17 — comments/docs must not assert a mechanism the code contradicts**
- `main.ts:9-12` df7-2 header block — VIOLATION: asserts "stepped ONLY in play / attract never advances a game", made false by this diff (finding #17).
- `main.ts:44-57` inline loop-body comments — compliant: updated to match df7-3 behaviour.
- `attract.ts` header + doc comments (8 claims) — compliant: reviewer-rule-checker verified each against the code.

**Rule: lang-review #4 (|| vs ??), #1 (type escapes), #5 (import type / .js extensions)**
- `main.ts:51` `startPressed(held) || hasPlayerInput(mapInput(held))` — compliant: boolean OR, not a falsy-default.
- `attract.ts:59` `target ? ... : 0` — compliant: `target` is `Lander|null`, truthiness ≡ `!== null` (style-only, noted).
- All imports (`attract.ts:21-22`, `main.ts:24`) — compliant: `import type` where type-only, `.js` extensions present; no `as any`/non-null assertion anywhere.

**Data flow traced:** human key → `installHeldKeys`→`held` → `mapInput(held)`/`startPressed(held)` → `startRequested` signal → `advanceStart` → `advancePhase` exits attract→setup (`main.ts:49-53`). Separately, during attract: `attractInput(session.sim)` → `stepSim(session.sim, ...)` advances the REAL sim (`main.ts:61`). The two flows are disjoint (human drives the exit; auto-player drives the sim) — the story's load-bearing invariant, verified correct.

### Devil's Advocate

Trying to break it: (1) *Can the demo strobe an epileptic?* The only visual novelty is that attract now steps the sim; every frame still routes through the same `composeFrame` play uses (palette-index framebuffer 0..15), and the smart-bomb clear writes no framebuffer. The AC4 guard runs `assertNoFullFrameStrobe` over 180 consecutive demo frames AND a forced bomb — it fails closed on a malformed pair, so it also proves the frames are real rasters. No strobe path exists. (2) *Can a held key wedge the machine?* Holding a key across attract→setup→play: `startRequested` stays true but `advancePhase` reads it only in attract; setup reads `setupComplete`, play ignores it. No wedge. (3) *Can the demo self-exit?* Only if `startRequested` read `attractInput` — it reads `mapInput(held)`, the human snapshot. It cannot. (4) *Empty/degenerate field?* `nearestLander` returns null → `up/down/fire` false, `smartBomb` false (`liveCount 0 < SWARM`), `thrust:true` static → a well-formed `Input`, no throw, no NaN, no division. (5) *Non-determinism sneaking in?* No RNG in the file; the only entropy is the sim's own seed. (6) *The bomb cadence starving or spamming?* `camera` advances every patrol frame so `& 0xff` cycles 0..255 — the window recurs ~every 256 frames and self-limits once the field clears. The one thing the Devil DID find is already in the findings: the header comment now lies about the stepping model, which is the trap a confused maintainer would fall into. That is the reject.

Review round: 1 (first review; pf tracks the authoritative counter in Workflow Tracking).
**Handoff:** Back to Dev (Korben) for the two fixes; then re-review (round 2).

## Review Correlation

Sources gathered: internal reviewer (Zorg, round 1) — 2 findings. No external reviewer
comments (no PR open; `gh pr view` N/A), no CI findings (deploy fires on tag, not on this
branch). Repo `arcade`, language TypeScript → checklist `.pennyfarthing/gates/lang-review/typescript.md`.

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|---------------|-----------------|--------|
| 1 | reviewer | Stale `main.ts` header asserted "stepped ONLY in play / attract never advances a game", made false by df7-3 | EXISTING_CHECK | #17 (comments/docs asserting a mechanism the code contradicts) | Dev missed the existing check; fixed in `e94b39d1`. No checklist update. |
| 2 | reviewer | Inline magic numbers `0xff`/`0x08` in `attract.ts:72` while the file names its 3 sibling tuning knobs | EXISTING_CHECK | Project convention (rule-checker A2): AI tuning knobs are named+commented constants — the file ALREADY followed it for `ALIGN_BAND`/`FIRE_BAND`/`SWARM` | Dev was inconsistent applying the file's own convention; fixed in `e94b39d1` (`SMART_BOMB_MASK`/`SMART_BOMB_WINDOW`). No checklist update. |

### Signal Summary
- **External findings: 0** (no PR/AI-reviewer comments)
- **CI findings: 0**
- **Internal findings: 2** (both caught in-process by the reviewer)
- **New checks added: 0** — both map to existing checks/conventions; this was a process miss (Dev overlooked them), not a checklist gap. Neither has been missed 3+ times, so no promotion-to-gate flag.

## Subagent Results

**Cycle: 1**

Method: FULL re-run of all enabled subagents against the whole `develop...HEAD` diff for this
rework cycle (not a targeted re-probe). Toggles unchanged — only `preflight`/`security`/`rule_checker`
enabled; the other six disabled (I re-covered their domains myself). All three returned CLEAN:
the round-1 fixes are a comment edit + a constant rename (semantically identical), and both
round-1 findings are verified resolved.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (round-1's 2 verified fixed) | N/A |

**All received:** Yes (3 enabled re-ran, all clean; 6 disabled via settings)
**Total findings:** 0 open (round-1's 2 confirmed resolved), 0 dismissed, 0 deferred
**Working-tree audit:** `pf reviewer audit-tree` → false-DIRTY on `sprint/epic-df7.yaml` (the
`in_progress→in_review` pf phase stamp, tracking-only); `git checkout --` then re-audit → CLEAN.

## Reviewer Assessment

**Cycle: 1**

**Verdict:** APPROVED

Round-2 re-review of the rework (commit `e94b39d1`). Both round-1 findings are fixed and
independently re-verified; the fixes are a comment correction + a magic-number rename, both
semantically identical (confirmed by `git show e94b39d1`), and all three re-run subagents plus
the full defender suite (859/859) and `tsc` are clean. No new issue introduced.

**Round-1 findings — resolution verified:**
- `[RULE][DOC]` #17 stale header (`main.ts`) → FIXED. The df7-2 "stepped ONLY in play / attract never advances a game" sentences are gone; the new df7-3 header block accurately states the sim is stepped in BOTH play (human keyboard) and attract (`attractInput`, same `stepSim`, no forked path) and that any player key exits attract→setup. Re-verified against the code (`main.ts:51` `startRequested`, `:58-62` play/attract branches) and the six-member `Phase` union — every clause true. Confirmed by reviewer-rule-checker #17 + #24 (no survivor of the old phrasing).
- `[RULE][SIMPLE]` A2 magic numbers (`attract.ts`) → FIXED. `SMART_BOMB_MASK = 0xff` / `SMART_BOMB_WINDOW = 0x08` are named, doc-commented (with the 8/256≈3% duty-cycle rationale and the AI-knob/not-a-ROM-constant disclaimer), and used at the cadence expression; no raw `0xff`/`0x08` literal remains in executable code. Matches the file's `ALIGN_BAND`/`FIRE_BAND`/`SWARM` convention.

**Specialist coverage (all 8 categories — 6 disabled, covered by me):**
- `[EDGE]` No boundary defect — the constant rename doesn't touch the degenerate-field path; `nearestLander` still returns null on an empty/all-dead field → safe (rule-checker #27, security re-confirmed).
- `[SILENT]` No swallowed error — unchanged; no try/catch, no silent fallback.
- `[TEST]` Tests unchanged and still green (859/859); the fixes are comment+rename, so the wiring scan (comment-stripped) and all AC tests still pass.
- `[DOC]` The one round-1 doc defect is fixed; rule-checker re-verified all 4 comment/header claims accurate.
- `[TYPE]` No type change; `import type` + `readonly` interfaces intact, no `as any` (rule-checker #1/#2/#5).
- `[SEC]` reviewer-security returned `status: clean` — purity, ADR-0005, determinism/DoS all still hold.
- `[SIMPLE]` The magic-number extraction closed the only simplification/consistency note; nothing new.
- `[RULE]` reviewer-rule-checker `status: clean`, 0 violations across 30 checks; both round-1 rule findings resolved.

**Observations (evidence-backed, with rule compatibility):**
- `[VERIFIED]` Round-1 fixes are semantic no-ops — `git show e94b39d1` shows only comment lines + a literal-to-named-constant rename (`0xff`→`SMART_BOMB_MASK`, `0x08`→`SMART_BOMB_WINDOW`), same values. **Rule checked:** lang-review #13 (fix-introduced regressions) — COMPLIES, no regression class introduced.
- `[VERIFIED]` New header accuracy — every clause of the df7-3 header block matches the code. Evidence: `main.ts:13-18` vs `main.ts:51`/`:58-62` and `phase.ts` union. **Rule checked:** #17 — COMPLIES.
- `[VERIFIED]` Constant naming — `SMART_BOMB_MASK`/`SMART_BOMB_WINDOW` named + doc-commented, no raw literal left. Evidence: `attract.ts:33-39`, `:78`. **Rule checked:** project AI-knob convention (A2) — COMPLIES.
- `[VERIFIED]` Purity/determinism/ADR-0005 unchanged — the rename introduces no import/symbol/behaviour; purity sweep + AC4 strobe guard still green. **Rule checked:** core purity boundary + ADR-0005 — COMPLIES (security subagent re-confirmed).

### Rule Compliance

- **Rule: lang-review #17 (no comment asserting a mechanism the code contradicts)** — `main.ts:13-18` header: compliant (fixed); `main.ts:52-65` inline comments: compliant; `attract.ts:33-37` cadence doc: compliant (8/256 arithmetic verified).
- **Rule: AI tuning knobs named+commented, not cited ROM constants** — `ALIGN_BAND`/`FIRE_BAND`/`SWARM`: compliant; `SMART_BOMB_MASK`/`SMART_BOMB_WINDOW` (`attract.ts:38-39`): compliant (fixed — the round-1 violation).
- **Rule: src/core purity boundary** — `attract.ts`: compliant (type-only core imports, no clock/entropy/shell); `main.ts`: N/A (shell).
- **Rule: lang-review #4/#1/#5** — `main.ts:51` boolean OR: compliant; `attract.ts:59` `target ? … : 0`: compliant; imports (`import type`, `.js`): compliant; no `as any`/non-null assertion.

### Devil's Advocate

Trying to break the rework specifically: (1) *Did the rename change behaviour?* `git show e94b39d1` — the constants hold the exact prior values (`0xff`, `0x08`) and the expression is `(sim.camera & SMART_BOMB_MASK) < SMART_BOMB_WINDOW`, byte-identical to `(sim.camera & 0xff) < 0x08`; the 859-test suite is unchanged-green, so no observable delta. (2) *Is the new header now wrong in the OTHER direction — over-claiming?* It says "setup/pause/death/game-over still hold their frame — only play and attract advance a sim." The loop steps in exactly the `play` and `attract` branches; setup/pause/death/game-over fall through with no `stepSim`. Accurate, not over-claimed. (3) *Did the comment edit accidentally break the `main.ts?raw` wiring test?* That test strips comments before matching, so a header edit cannot affect it — and the wiring test is green. (4) *Any new magic number sneaked in with the constants?* The doc comment references `256`/`8` as prose arithmetic, not executable literals; the only executable numbers are the two named consts. Nothing new. The rework is minimal, correct, and closes both findings without collateral. No basis to reject.

**Data flow traced (unchanged, re-confirmed):** human key → `held` → `mapInput`/`startPressed` → `startRequested` → `advanceStart`/`advancePhase` exits attract→setup; separately, attract steps `stepSim(session.sim, attractInput(session.sim))`. The two flows stay disjoint.
**Pattern observed:** clean minimal rework — exactly the two fixes, nothing else touched (`git diff 2f2f795a..HEAD`).
**Error handling:** unchanged; degenerate-field path still returns a well-formed `Input`, no throw.
**Handoff:** To SM (Ruby Rhod) for finish-story.