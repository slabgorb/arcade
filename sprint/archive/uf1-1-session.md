---
story_id: "uf1-1"
jira_key: "uf1-1"
epic: "uf1"
workflow: "tdd"
---
# Story uf1-1: red-baron enemy planes cannot shoot — wire planeFires into the calc-frame damage channel

## Story Details
- **ID:** uf1-1
- **Jira Key:** uf1-1
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T09:44:17Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T09:13:27Z | 2026-08-06T09:16:13Z | 2m 46s |
| red | 2026-08-06T09:16:13Z | 2026-08-06T09:28:37Z | 12m 24s |
| green | 2026-08-06T09:28:37Z | 2026-08-06T09:35:02Z | 6m 25s |
| review | 2026-08-06T09:35:02Z | 2026-08-06T09:44:17Z | 9m 15s |
| finish | 2026-08-06T09:44:17Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (review)
- **Improvement / non-blocking:** mock-signature looseness in `tests/plane-fire-wiring.test.ts`
  (`evadeCheck`/`blimpFires` mocks drop typed params vs the `ace-wiring.test.ts` convention). tsc-clean,
  tests green + mutation-verified. Future cleanup: type the ignored params to catch signature drift.
- **Improvement / non-blocking:** `PLANE_HIT_CHANCE = 0.05` is an inferred value (ROM GRSHLS shell-flight
  out of scope); aggregate lethality scales with live-plane count and may want playtest tuning. No ROM
  per-shot probability to violate, so not a fidelity defect — a possible tuning follow-up.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No design deviations. The wiring follows the story ACs and TEA's seam guide exactly, mirroring the
  blimp path (main.ts). (The decoy-citation fix noted in the Dev Assessment is a correction of my own
  new comment, not a departure from spec.)

## Sm Assessment

**Setup verified on disk (not trusted from the subagent report):**
- Session, story-context, epic-context all created; status stamped `in_progress` (confirmed via `pf sprint story show`).
- All 5 acceptance_criteria match `sprint/epic-uf1.yaml` **verbatim** — no silent AC edit this round.
- Added the three fields sm-setup omitted: `**Repos:** arcade`, `**Branch:** none`, `**PR:** none` (the last two are required or the trunk-based finish errors).
- Exactly one real phase pointer in the file (the Workflow Tracking line).

**Premise re-verified against the current tree (main fast-forwarded 5 commits before setup):**
- `planeFires` (`plugins/red-baron/src/core/enemy.ts:789`) has **ZERO production callers** — TRUE. Only its own definition, the "stays silent for now" comment, and `core/returning-ace.ts` comments reference it. The pilot really is immortal to plane gunfire today.
- **Line drift:** the description's main.ts cites are a few lines stale after the 5-commit fast-forward — e.g. the "stays silent for now" comment cited at `main.ts:632` is now at **`main.ts:638`**. Treat every main.ts line number in the description as an approximate anchor to re-locate, not an exact pin.

**No user ruling needed:** unambiguous wiring story, no either/or AC, no ROM-vs-shipped conflict. It mirrors the existing, working blimp seam (`blimpFires` / `BLIMP_HIT_CHANCE` / `blimpRng` → rb2-9 `loseLife`).

**Sibling probes clean:** no `uf1-1` branch on origin; no live sessions in any `a-*` checkout.

**For TEA (RED):** the mutation AC (AC-5) is the load-bearing one — the RED test must assert *player damage* from plane fire and redden when the new call site is disabled, not merely that `planeFires` returns true. Seed determinism (AC-1) and the level gate (AC-4: nothing below L4, ~half at L4) also need pinning.

Handoff: TEA (red phase).

## Tea Assessment

**RED delivered — `plugins/red-baron/tests/plane-fire-wiring.test.ts` (committed `d6279092`, pushed to `main`).**
Full red-baron suite after: **3 failed | 1347 passed | 1 todo**. The 3 failures are exactly the three
wiring ACs; nothing else reddened. `npm run lint` (tsc --noEmit, repo-wide) clean.

### The harness choice (why behavioral, not structural)
main.ts touches `document`/`window` at module top-level, so older wiring tests (blimp-wiring.test.ts)
read it as TEXT and regex the wiring. The newer rb4-4 pattern rejects that ("no import scans, no regex")
and boots the real loop via `tests/helpers/boot-cockpit.ts` against a fake DOM, watching only what the
player hears. I used bootCockpit so AC-5's "asserts player damage, not merely that planeFires returns
true" is satisfied for real: the tests observe a `crash` the pilot takes, not a symbol in the source.

### Isolation (calibrated with a throwaway probe, since deleted)
Plane fire must be the ONLY damage source a run can produce. main.ts has three player-hit sites
(line-drifted from the story's :557/:602/:750 to **:563 ace / :608 ground / :756 blimp**). The tests mute
the ace (`closesPast→false`, `evadeCheck→'evaded'`) and the blimp's gun (`blimpFires→false`) by module
tap, and keep the window (600 calc frames) inside the opening plane wave where ground collision can't
fire. Probe result across 4 seeds with those mutes: **0 crashes of any kind today** — a genuine
"the sky never shoots back" baseline, not seed luck. (Seed 777 crashed at frame 222 with only the ace
muted — that was the blimp; muting `blimpFires` removed it, confirming the attribution.)

### The level lever (AC-4 gate is unreachable organically)
`gmlevlForKills` = `PLNLVL[floor(kills/2)]`; level 4 needs **22 kills**, level 5 needs **32** — impossible
hands-off in a bounded run. So `gmlevlForKills` is tapped to `ctl.forceLevel` (5 to prove the wiring, real
level 0 to prove the gate). Everything else in `scoring` passes through.

### AC coverage
- **AC-2 / AC-5** (`the sky shoots back`): level 5, hands-off, 600f → expect ≥1 `crash`. RED (0 today).
  This IS the mutation-non-vacuity proof — a Dev who wires only the gun cue and not the loseLife channel,
  or deletes the call, gets 0 crashes and reddens.
- **AC-1** (`deterministic`): same seed booted twice → crash-frame arrays equal AND non-empty. Enforces a
  seeded Rng (Math.random would diverge). RED via the non-empty staging assertion.
- **AC-3** (`SN-017 gun cue`): hands-off (so `gunFiring=false`) + blimp muted → any `setGun(true)` is a
  plane latching `enemyFiring`. RED (never true today).
- **AC-4** (`level gate`): real level-0 run → 0 crashes, 0 enemy gun, guarded non-vacuous by a `WP`
  wave-announce assertion (planes provably present). **Passes today and after** — a keep-behavior guard.
- The PURE decision (`planeFireChance` gate, `planeFires` ÷2 cadence + coin flip) is already exhaustively
  covered by rb2-7's `tests/core/enemy-fire.test.ts` — **not duplicated here**.

### Rule Coverage (lang-review/typescript.md)
- **#15 / #26 (token-matching & all-local assertions → vacuous):** avoided by construction. Every
  assertion's terms come from the code under test (a `crash`/`setGun`/`WP` the booted game emitted), not
  from source text or test-local arithmetic. No regex/import-scan assertions.
- **Meaningful-assertion self-check (Phase C):** no `let _ =`, no `assert(true)`, no `is-None`-on-always-
  None. The AC-4 guard carries its own non-vacuity assertion (`waveAnnounced`).
- **#25 (as any / ts-ignore):** none. Type-check is clean.

### For Dev (GREEN) — the seam to mirror (main.ts blimp path, :742-759)
- Add a dedicated **`planeRng`** sub-seeded off the one shell `seed` (e.g. `createRng((seed ^ 0x…)>>>0)`,
  next to `blimpRng`/`aceRng` at ~main.ts:473-494) so the fire pattern is deterministic **and** the stream
  does not shift the others (rb4-7 discipline — draw unconditionally on a fire-frame if you mirror the
  blimp's short-circuit).
- In the calc-frame loop, for each **live plane** in `enemies`, call `planeFires(level, simFrame, roll)`
  with `level = gmlevlForKills(kills)` and `roll = nextFloat(planeRng)`. On a fire: latch
  `enemyFiring = true` (AC-3), then a per-shot hit roll (mirror `BLIMP_HIT_CHANCE`) `&& dying === null &&
  !gameOver` opens `dying = beginEol('shells')` + `events.push({ type: 'player-hit' })` (AC-2).
- **Boundary:** the decision stays PURE in `core/enemy.ts` (already there); only the loop wiring + the roll
  draw are new, and they live in the SHELL (main.ts) exactly like the blimp — do not push RNG/time into
  core (the sim-clock-free/purity guards will catch it).
- Update main.ts:638's "stays silent for now" comment — it becomes false the moment you wire this.

Handoff: Dev (green phase).

## Dev Assessment

**GREEN delivered — `plugins/red-baron/src/main.ts` (implementation `774b6d28`, pushed to `main`).**
All four uf1-1 tests pass. Full red-baron suite **1350 passed | 1 todo**; orchestrator **398 pass / 0
fail**; `npm run lint` (tsc --noEmit) clean — verified on the rebased/merged tree (a sibling landed a
sprint-YAML-only commit mid-flight; `pull --rebase` was conflict-free and I re-ran the suite after).

### What was wired (31 insertions, mirrors the blimp seam)
1. `import { … planeFires … } from './core/enemy'`.
2. `const PLANE_HIT_CHANCE = 0.05` next to `BLIMP_HIT_CHANCE` — same per-shot hit model (the ROM's full
   GRSHLS shell-flight model is out of scope, per rb2-7's own note).
3. `const planeRng = createRng((seed ^ 0x91a2) >>> 0)` — a dedicated sub-seed alongside blimpRng/aceRng
   so the fire pattern is deterministic (AC-1) and does NOT shift the airship's or the ace's streams
   (rb4-4 draw discipline).
4. A per-plane loop in the calc-frame block (right after the blimp): for each live plane,
   `planeFires(level, simFrame, nextFloat(planeRng))` → on a fire, latch `enemyFiring` (AC-3), then a
   second `nextFloat(planeRng) < PLANE_HIT_CHANCE && dying === null && !gameOver` opens
   `dying = beginEol('shells')` + `addBulletHole` + `events.push({type:'player-hit'})` (AC-2). The hit
   roll is drawn on every fire-frame (stream stable) and only the EFFECT is pilot-state gated — verbatim
   the blimp's discipline. Multiple planes on one frame: the first death sets `dying`, later planes still
   draw (stream stable) but the `dying===null` guard makes their hit a no-op — one death at a time.
5. Rewrote the stale main.ts comment that claimed plane fire "stays silent for now".

### The decoy-citation catch (worth recording)
My first draft cited the routine as `R2BRON.MAC:4798-4807`. `tests/audit/source-citations.test.ts` went
red on three assertions: **R2BRON is the DECOY build that never shipped** (byte-identical to RBARON.MAC
save 7 checksum bytes; the poison lives in the linked R2GRND ground module). The audit forbids the decoy
name anywhere in `src/`. Because the two builds share line numbers, the shipped citation is the SAME line
in `RBARON.MAC:4798-4807` (matching how `core/enemy.ts` already cites PLNSHL). Fixed the module name;
audit green. The rb2-7 TEST files still cite R2BRON — that is allowed (the audit scans `src/` only), so
untouched.

### Why the RNG choice matters (AC-1)
A separate `planeRng` was deliberate: routing the plane roll through blimpRng/aceRng would have shifted
those streams and reddened the blimp/ace determinism guards. The AC-1 test (same seed → same crashes)
passes, which also proves the roll is seeded, not `Math.random`.

Handoff: verify/review (TEA verify phase per the tdd workflow).

## Reviewer Assessment

**Verdict: APPROVED**

**What was reviewed:** `git diff baa8b281..HEAD -- plugins/red-baron/` — the uf1-1 wiring in
`src/main.ts` (a `planeFires` import, a `PLANE_HIT_CHANCE` const, a dedicated `planeRng` stream, a
per-plane fire loop in the calc-frame body, an updated comment) and the new behavioral test
`tests/plane-fire-wiring.test.ts`. I read the full diff, both changed files, the seam it mirrors (the
blimp block), the pure decision it consumes (`core/enemy.ts` `planeFires`/`planeFireChance`, rb2-7), and
I diffed the new ROM citation against the actual gitignored source.

**Independent verification I ran myself (not taken from a subagent):**
- **Citation truthfulness (diff-vs-ROM).** `PLNSHL, RBARON.MAC:4798-4807` is verified against
  `~/Projects/red-baron-source/RBARON.MAC`: line 4798 is `PLNSHL:` ("CHECK PLANE FIRE") through 4807
  `10$: RTS`, and 4803-4805 (`LDA FRAME / LSR / BCS ;EVERY OTHER FRAME`) are exactly the ÷2 cadence the
  code implements. It matches the pre-existing `enemy.ts` PLNSHL citation convention. (The `-text` copy
  numbers PLNSHL at 4804 — the known "staircase" — but the repo cites the non-text numbering throughout,
  and the decoy-name audit `tests/audit/source-citations.test.ts` is green.)
- **The decoy was almost re-introduced and was caught.** Dev's first draft cited `R2BRON.MAC` (the build
  that never shipped); the audit reddened and Dev corrected it to `RBARON.MAC`. Confirmed no `R2BRON`/
  `R2GRND` remains in `src/` (`grep` clean).
- **Faithful consumption.** The ROM's PLNSHL checks a per-plane grant bit (`PLOBDB+6 AND 8`) and a global
  `FRAME` LSB (÷2, synchronized volleys). The wiring calls `planeFires(level, simFrame, roll)` per plane
  with the global `simFrame` parity — faithful to the ported rb2-7 decision (the per-frame level-4 coin
  flip is rb2-7's ratified abstraction of the grant, already shipped and tested; not this story's scope).

### Specialist Coverage
Only `preflight`, `security`, and `rule_checker` are enabled here (`workflow.reviewer_subagents`); the
other six are disabled, so I hand-covered their domains directly (rule_checker is the backstop).

[PRE] reviewer-preflight (enabled) — GREEN: red-baron 1350 passed / 1 todo, orchestrator 398 passed, lint
clean, 0 code smells (no console.log/TODO/.skip/dangerouslySetInnerHTML). Matches my own runs.
[SEC] reviewer-security (enabled) — clean, no findings. Confirmed: the only external input is the existing
`?seed=` param; `planeRng = createRng((seed ^ 0x91a2) >>> 0)` reuses the already-validated seed, no new
cast, no eval/innerHTML/JSON.parse, no prototype-pollution vector (iterates in-memory Enemy objects).
Dismissed nothing — I concur.
[RULE] reviewer-rule-checker (enabled) — 26 rules checked, 0 blocking, 1 non-blocking (#8, mock-signature
looseness). It independently reproduced my mutation check (deleting the plane loop reddens AC-2/AC-1/AC-3,
leaves AC-4 green) in a disposable worktree. I confirm the #8 finding and defer it (below).
[EDGE] Hand-covered (subagent disabled) — the fire loop sets `dying`/`enemyFiring` after the blimp block,
guarded `dying === null && !gameOver`; one death per frame, blimp-precedence preserved, mirrors the blimp
exactly. Empty `enemies` (between waves) → no draws, deterministic. No unhandled boundary. No concern.
[SILENT] Hand-covered (disabled) — no swallowed errors, no empty catches, no silent fallback. The
`nextFloat(planeRng) < PLANE_HIT_CHANCE` compare fails CLOSED (no hit) on any degenerate value. No concern.
[TEST] Hand-covered (disabled) — every assertion's terms come from the booted game (crash/setGun/WP
recorders), non-vacuous by mutation; AC-4 carries its own `waveAnnounced` non-vacuity guard; the pure
decision is not duplicated (deferred to rb2-7's enemy-fire.test.ts). Strong. One nit → see [RULE]/#8.
[DOC] Hand-covered (disabled) — the new comments are truthful and re-verified: the ROM citation (above),
"0 below level 4, 0.5 at 4, 1 above" (matches `planeFireChance`), "unconditionally on the pilot's state
so it never shifts" (both rolls are drawn before the `dying`/`gameOver` gate). The stale "stays silent for
now" comment was correctly retired. No stale/misleading comment.
[TYPE] Hand-covered (disabled) — `PLANE_HIT_CHANCE`/`planeRng` typed like their blimp/ace siblings; no
casts, no `any`, no non-null assertions; `tsc --noEmit` clean. No type-invariant concern.
[SIMPLE] Hand-covered (disabled) — the loop is minimal (one `planeFires` call, reuses the fire branch —
actually tighter than the blimp block's double `blimpFires` call). No dead code, no over-engineering.

### Rule Compliance
**Rule: core/shell purity boundary (red-baron — src/core/ must be pure)**
- `git diff --stat plugins/red-baron/src/core/` — compliant: ZERO core files changed. The RNG draw + fire
  loop live entirely in `src/main.ts` (shell); `planeFires` is an import only, already pure (rb2-7).

**Rule: ROM citations name only the SHIPPED build; the decoy (R2BRON/R2GRND) is forbidden in src/ (source-citations audit)**
- `main.ts:769` header comment `PLNSHL, RBARON.MAC:4798-4807` — compliant (verified vs the ROM above; was
  R2BRON in Dev's first draft, caught by the audit and fixed). `grep -rn 'R2BRON|R2GRND' src/` — clean.

**Rule: #22 accept-style predicate NaN safety (fails closed)**
- `main.ts` `nextFloat(planeRng) < PLANE_HIT_CHANCE` — compliant: accept-style, identical polarity to the
  sibling `nextFloat(blimpRng) < BLIMP_HIT_CHANCE`; no `>`/`>=` rejection rewrite introduced.

**Rule: #14 derived edges computed at the common exit, not one branch**
- `enemyFiring` (decl once/frame, blimp write, plane write, read once at frame bottom) — compliant: both
  writers run unconditionally in the same calc-frame sequence, neither in a mutually-exclusive branch.
- `dying` (ace, ground, blimp, plane writers) — compliant: all gate on the same `dying === null` invariant
  in one linear sequence; blimp-then-plane ordering makes plane fire yield to an earlier death this frame.

**Rule: #15 / #26 non-vacuous, non-all-local assertions (mutation-tested guards)**
- AC-2 crash, AC-1 determinism, AC-3 gun-cue, AC-4 gate — all four compliant: behavioral (bootCockpit),
  every asserted quantity sourced from the module under test, mutation-verified red on loop deletion.

**Rule: #8 test-quality — mock signatures match the real implementation**
- `test.ts` `evadeCheck: (ace: unknown) => …` — VIOLATION (non-blocking): drops the real
  `(ace, turnRate, roll)` params; diverges from the fully-typed sibling `ace-wiring.test.ts:69`.
- `test.ts` `blimpFires: () => false` — VIOLATION (non-blocking): drops the real `(frame, level)` params.
- `vi.mock('../src/shell/audio')`, `gmlevlForKills` mock — compliant (surface/signature match).

### Findings & Decisions
1. **[RULE]/[TEST] #8 — mock-signature looseness** (`tests/plane-fire-wiring.test.ts` `evadeCheck`/
   `blimpFires` mocks). **DEFERRED (non-blocking).** tsc is clean (TS bivariant params permit fewer
   args), the tests are green and mutation-verified, and the isolation intent ("always evade" / "never
   fire") is correct. The risk it guards against (a future `evadeCheck`/`blimpFires` signature change
   slipping past a stale mock) is real but low: `main.ts` reads `attack.result`, so a return-shape change
   breaks the build upstream first. Recommend a future cleanup: type the ignored params (`_turnRate:
   number, _roll: number`) to match the sibling convention. Not worth a rework round for a 3pt wiring
   story that is otherwise clean. Recorded as a Delivery Finding.
2. **[SIMPLE]/design — `PLANE_HIT_CHANCE = 0.05` is an inferred tuning value** (mine). The ROM models
   enemy shells via the full GRSHLS shell-flight, explicitly out of this story's scope, so a per-shot
   probability is already an approximation; 0.05 mirrors the blimp, the most defensible inference. **NON-
   BLOCKING / DEFERRED:** at high levels the aggregate lethality scales with the number of live planes
   (each rolls per fire-frame), which may want playtest tuning — but there is no ROM per-shot probability
   to violate, so it is not a fidelity defect. Flagged for a possible tuning follow-up, not a change here.

**No Critical or High findings. No blocking findings. APPROVED for finish.**

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — hand-covered ([EDGE], no concern) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — hand-covered ([SILENT], no concern) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | N/A — hand-covered ([TEST]; #8 nit via rule-checker) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — hand-covered ([DOC], no concern) |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — hand-covered ([TYPE], no concern) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — hand-covered ([SIMPLE], no concern) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (non-blocking #8) | confirmed 1, dismissed 0, deferred 1 |

**All received: Yes**
**Total findings:** 1 confirmed (non-blocking, deferred) + 1 reviewer-originated design note (deferred); 0 blocking, 0 dismissed.

## Impact Summary

**What shipped.** Red Baron enemy planes now shoot back. `plugins/red-baron/src/main.ts` gains a
dedicated `planeRng` sub-seed (alongside `blimpRng`/`aceRng`) and a per-plane fire loop in the calc-frame
body that calls the already-ported, already-tested `planeFires(level, simFrame, roll)` on each live plane.
On a fire it latches `enemyFiring` (the SN-017 gun cue) and rolls `nextFloat(planeRng) < PLANE_HIT_CHANCE`
to open the real rb2-9 `loseLife` death channel (`dying = beginEol('shells')` + `player-hit`), guarded on
`dying === null && !gameOver`. The PLNLVL level gate is preserved end to end (nothing below level 4, ~half
at 4, always at ≥5). It mirrors the working blimp seam; `planeFires` had ZERO production callers before —
the pilot was immortal to gunfire, the game's central threat absent. The stale "stays silent for now"
comment was retired. Verified: the new ROM citation `PLNSHL, RBARON.MAC:4798-4807` is truthful against the
source (a `R2BRON` decoy slip in the first draft was caught by the citations audit and corrected).

**Tests.** New behavioral suite `tests/plane-fire-wiring.test.ts` (4 tests, bootCockpit) covering AC-1
(seeded determinism), AC-2/AC-5 (plane fire costs a life — mutation-non-vacuous), AC-3 (gun cue), AC-4
(level gate). The pure decision stays covered by rb2-7's `enemy-fire.test.ts` (not duplicated).

**Review.** One round, verdict **APPROVED**, 0 Critical / 0 High / 0 blocking. Two non-blocking findings,
both DEFERRED: (1) rule-#8 mock-signature looseness in the new test (tsc-clean, mutation-verified;
low-risk future cleanup); (2) `PLANE_HIT_CHANCE = 0.05` is an inferred tuning value (GRSHLS shell-flight
out of scope) that may want playtest tuning at high plane counts — no ROM per-shot probability to violate.

**Suite state at finish:** red-baron **1350 passed / 1 todo**, orchestrator **398 passed**, lint clean.
All code on `origin/main` (test `d6279092`, impl `774b6d28`). Trunk-based — no PR, no branch.