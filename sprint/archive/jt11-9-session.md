---
story_id: "jt11-9"
jira_key: "jt11-9"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-9: Transporter pad occupancy

## Story Details
- **ID:** jt11-9
- **Jira Key:** jt11-9
- **Workflow:** tdd
- **Stack Parent:** jt11-4 (none - sequential after jt11-4)

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-13T13:04:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T12:17:27Z | 2026-08-13T12:19:57Z | 2m 30s |
| red | 2026-08-13T12:19:57Z | 2026-08-13T12:40:03Z | 20m 6s |
| green | 2026-08-13T12:40:03Z | 2026-08-13T12:52:54Z | 12m 51s |
| review | 2026-08-13T12:52:54Z | 2026-08-13T13:04:35Z | 11m 41s |
| finish | 2026-08-13T13:04:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): today a respawning player re-enters at `PLAYER1_SPAWN.x` (=100), NOT on a
  transporter pad, so the ROM's player-served-via-transporter path (CREPLY picks a pad in a clear
  third) is unmodelled. Affects `plugins/joust/src/core/sim.ts` (`respawnPlayerProcess` / `stepGame`
  respawn block) and `game.ts`. This is why AC-3's proposed "player respawn on a pad" fixture is not
  directly reachable; it overlaps the context's own **out-of-scope** player-side serving law. Left
  for that separate story — do not absorb it here. *Found by TEA during test design.*
- **Improvement** (non-blocking): the story context's test-file count anchor ("bump README 173 → 174")
  was stale — the real derived count was 184 and this story adds three files (→ 187). The anchor is
  the integer on the README `--project joust` command line, guarded by `audio-seam-scope.test.ts`.
  Affects `sprint/context/context-story-jt11-9.md` (informational). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): `freePad`'s fall-through and null (all-pads-busy) arms are wired into the
  serve path but are UNREACHABLE in ordinary enemy play — the 30-frame stand is shorter than
  jt11-4's 61-frame arrival stagger, so two enemies never occupy pads at once. They become reachable
  only when a player also materialises on a pad (the ROM's transporter-served respawn, CREPLY), which
  is the context's out-of-scope player-serving story. The arms are proven by `freepad-jt11-9.test.ts`
  (pure) today. Affects `plugins/joust/src/core/sim.ts` (`respawnPlayerProcess` / `stepGame` respawn)
  when that story lands. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the GOTR fall-through citation `JOUSTRV4.SRC:5687-5709` (in
  `transporter.ts` freePad, `sim.ts` serveEnemies, and `freepad-jt11-9.test.ts`) starts one line
  after the `GOTR1` label at `:5686` (`:5687` is GOTR1's first instruction `LDA STTR1`). Every other
  ROM cite in the diff is byte-exact. Defensible as "cite the first instruction," so not a blocker —
  a later citation-tidy could widen it to `:5686`. Affects the three cited comments. *Found by
  Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-3 tested via a pure selector + a source-wiring guard, not the context's player-respawn sim fixture**
  - Spec source: context-story-jt11-9.md, AC-3 ("Fixture (real play): kill P1 mid-arrival, let it respawn, assert the next served bird does not land on the knight's pad")
  - Spec text: "Pad selection keeps enterViaPads' draw as the preference and falls through TR1..TR4 to the first free pad. No two processes ever stand on the same pad."
  - Implementation: the fall-through LAW is proven purely (`freepad-jt11-9.test.ts`), and its CONSUMPTION is proven by a comment/import-stripped source guard that `sim.ts` invokes `freePad` (`transporter-occupancy-jt11-9-source.test.ts`, the jt11-4 dead-code-becomes-live idiom).
  - Rationale: the respawn path re-enters at `PLAYER1_SPAWN.x` (not a pad) today; routing respawns onto pads is the context's own **out-of-scope** player-serving path, and 30<61 rules out enemy-to-enemy contention, so no in-scope fixture naturally places two processes on pads at once. The pure law + wiring guard capture AC-3 completely without the out-of-scope plumbing.
  - Severity: minor
  - Forward impact: Dev must WIRE `freePad` into `sim.ts`'s serve path (the source guard enforces it). Whether a respawning knight also materialises on a pad is left to Dev/Reviewer — it is not required to satisfy the ACs and touches the out-of-scope player path.
- **freePad signature introduced as the selection function the context names**
  - Spec source: context-story-jt11-9.md, AC-4 ("`freePad(preferred, occupied)` returns `null` when all four ids are occupied")
  - Spec text: "the serve path leaves that enemy in pendingEnemies (still alive, still holding its ticket, LESERV NOT advanced)"
  - Implementation: `freePad(preferred: PadId, occupied: readonly PadId[]): PadId | null` in `transporter.ts` — preferred if free, else first free in TR1..TR4 order, else null.
  - Rationale: the context calls the function by this name/shape; pinning the exact signature makes the RED unambiguous for Dev.
  - Severity: minor
  - Forward impact: Dev implements `freePad` in `transporter.ts` with exactly this signature.
- **AC-2 (PFRAME=30 ≠ MATERIALISE_WINDOW=120) proven behaviourally, not by a source-constant scan**
  - Spec source: context-story-jt11-9.md, AC-2
  - Spec text: "PFRAME is 30, and it is not MATERIALISE_WINDOW"
  - Implementation: AC-1 pins the stand at 30 frames; a companion guard asserts collisions are still disabled at birth+40 (window is longer). Together they separate the two constants without naming Dev's chosen identifier.
  - Rationale: `MATERIALISE_WINDOW` is a private const; a source scan for a "30" constant would couple to whatever name Dev picks. Behaviour is the stabler pin. If Dev reuses the 120 window for the stand, AC-1's control fails; if Dev shrinks the window to 30, the AC-2 guard fails.
  - Severity: minor
  - Forward impact: none.
- **AC-4 retention ("ticket intact / LESERV not advanced") leans on jt11-4's existing waiting-room guard**
  - Spec source: context-story-jt11-9.md, AC-4
  - Spec text: "the serve path leaves that enemy in pendingEnemies … rather than dropping it"
  - Implementation: jt11-9 adds the `freePad → null` selection contract (pure); the "loser stays in the waiting room, is not dropped" behaviour is already pinned by `demo-jt11-4.test.ts`.
  - Rationale: avoid duplicating an existing green guard; jt11-9's new law is the all-pads-busy selection result.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)
- **The 30-frame stand is implemented via the served arrival's `nap`, not a dedicated PFRAME timer**
  - Spec source: context-story-jt11-9.md, AC-1
  - Spec text: "Its posX/posY must equal its pad's for 30 consecutive frames from birth, then change (LDA #30 / STA PFRAME)"
  - Implementation: `standOnPad` sets the served enemy's `nap = STAND_FRAMES` (30). `stepFrame` already freezes a napping process (no brain, no flight, no gravity), so the entity stays planted on its pad for 30 frames and then flies — exactly the observable AC-1 asks for. `advanceMaterialisation` runs regardless of `nap`, so the 120-frame collision window keeps counting during the stand (AC-2 stays green).
  - Rationale: minimal — reuses the existing nap-freeze the sim already has (the same mechanism jt11-4 fixtures use to hush enemies) instead of adding a new per-process timer field and a new wake path in frame.ts.
  - Severity: minor
  - Forward impact: the lit-transporter render effect (`TREFF`, out of scope) will read this planted window; a standing enemy is `nap`-frozen exactly on its pad, which is also how occupancy is detected (below).
- **Pad occupancy is derived positionally (a process sitting exactly on a pad), not tracked as an explicit TCURUSE flag**
  - Spec source: context-story-jt11-9.md, AC-2 / AC-3
  - Spec text: "A pad is in use from the moment a process is placed on it (INC [TCURUSE,X]) until its stand ends (DEC [TCURUSE,X])"
  - Implementation: at serve time `stepSim` computes `occupied` = the pads a live process's entity sits exactly on (its frozen `STAND_FRAMES` plant); `freePad` is called against that set. Placement on a pad is the `INC`; flying off it is the `DEC`. Pure and deterministic, so replays stay bit-identical.
  - Rationale: minimal — no new SimState field threaded through the frame; a standing process is already exactly on its pad and a flown one is not. Equivalent to TCURUSE for the observable cases.
  - Severity: minor
  - Forward impact: an explicit occupancy set would be needed only if a future feature must mark a pad in use while its occupant is NOT positioned on it (none today). The fall-through/null arms are wired but unreachable in ordinary enemy play (30-frame stand < 61-frame stagger — see the finding below).
- **Re-baselined the difficulty-wiring divergence probe 240 → 360 frames**
  - Spec source: `tests/difficulty-wiring.test.ts` (sibling story), AC-1 "reaches the RUNNING GAME"
  - Spec text: the probe walked 240 frames and asserted a wave-3 run diverges from a wave-1 run of the same seed
  - Implementation: extended its loop to 360 frames and updated its explanatory comment. The 30-frame stand delays every enemy's first flight ~30 frames, so the brake-deciding interaction and the divergence it causes now land past the old 240-frame budget (measured: divergence reappears ~frame 320). The probe's own `discriminating > 0` self-guard confirms the extension still captures a brake-deciding frame.
  - Rationale: any faithful implementation of AC-1 shifts enemy flight timing, so this coupled probe must be re-based; the alternative (not standing) fails the story.
  - Severity: minor
  - Forward impact: none — the probe's intent and self-guard are preserved; its comment's pre-jt11-9 exact frame numbers (113, "14 of 240", death at 121) were removed rather than left stale.

### Reviewer (audit)
- **TEA-1 (AC-3 via pure selector + source-wiring guard, not the respawn fixture)** → ✓ ACCEPTED by Reviewer: sound. The respawn path re-enters at `PLAYER1_SPAWN.x` (not a pad) and the player-serving law is explicitly out of scope; the pure `freePad` law + the dead-code-becomes-live source guard capture AC-3 completely. Verified `sim.ts` genuinely invokes `freePad` (rule-checker + my own read).
- **TEA-2 (freePad signature)** → ✓ ACCEPTED by Reviewer: the `(preferred, occupied) → PadId | null` shape matches the context and the ROM FREET/GOTR/CRELP selection; Dev implemented it exactly.
- **TEA-3 (AC-2 behavioural, not source-constant scan)** → ✓ ACCEPTED by Reviewer: pinning behaviour (stand==30 via AC-1 + collisions-off at birth+40) is stabler than coupling to a private constant's name; both wrong-implementation directions are caught.
- **TEA-4 (AC-4 retention leans on jt11-4's waiting-room guard)** → ✓ ACCEPTED by Reviewer: avoids duplicating an existing green guard; jt11-9's genuinely-new law (freePad→null) is tested directly.
- **Dev-1 (stand via `nap`, not a dedicated PFRAME timer)** → ✓ ACCEPTED by Reviewer: minimal and correct — `stepFrame` already freezes a napping process (verified via frame.ts), and `advanceMaterialisation` runs regardless of nap so the 120-frame window keeps counting (AC-2 green). Matches ROM `LDA #30 / STA PFRAME`.
- **Dev-2 (positional occupancy, not an explicit TCURUSE flag)** → ✓ ACCEPTED by Reviewer: pure, deterministic, and equivalent for the observable cases; a standing arrival sits exactly on its pad, a flown one does not. Correctly empty in enemy-only play (30<61). No new SimState field is a reasonable minimalism call.
- **Dev-3 (difficulty-wiring re-baseline 240→360)** → ✓ ACCEPTED by Reviewer: any faithful AC-1 stand shifts enemy flight timing; the probe's `discriminating > 0` self-guard still fires and the stale exact-frame numbers were removed (comment-analyzer confirmed). Necessary, not avoidable.

## Sm Assessment

**Story:** jt11-9 — Transporter pad occupancy (5pt, joust, tdd, p2). Setup complete; the
phase pointer read `setup` on arrival and now hands to TEA for RED.

### Pre-setup verification (all green)
- **Sequencing satisfied.** jt11-4 (arrival cadence, the hard prerequisite) is `done`;
  jt11-5 (shares `sim.ts`, "do not parallel") is also `done` — no concurrency risk.
- **Sibling probes clean.** `git branch -r | grep jt11-9` → none before my claim;
  `.session/` sweep across `a-*` shows only a-1 on ml4-3. No one else owns this story.
- **Merge gate clear.** No open PRs on slabgorb/arcade.
- **develop synced** (was behind 3, fast-forwarded before setup).

### Context protection (the key setup risk)
`sprint/context/context-story-jt11-9.md` is a hand-authored, committed spec
(commit 2beae26f) carrying the measured premise table, full test design, and the six
ACs. `sm-setup` was given an explicit do-not-regenerate override and honoured it:
`context_file_touched: false`, md5 `c6c18253503e0457ae2d679283f96862` unchanged before
and after. TEA's primary input is that file — read it, not this section.

### Premise trust decision
The description's falsifiable measurements (seed 0x1234: id 256 born f62 at x=23 on TR3,
drifting to x=25 by f82; MATERIALISE_WINDOW=120 is the collision gate, not the standing
period) were authored 2026-08-12 as part of jt11-4's finish, derived from the
just-completed sibling — one day old, not stale. AC-1's "RED today" note IS that
measurement restated as the failing guard, so re-deriving it here would duplicate TEA's
RED work. Trusted, not re-run.

### Handoff to TEA (Han Solo) — RED phase
Write failing tests per the six ACs in the context file. Watch for:
- **AC-1/AC-2:** the stand is `PFRAME`=30 frames (JOUSTRV4.SRC:5726-5727), a *distinct*
  constant from the 120-frame `MATERIALISE_WINDOW`. Do not conflate them — AC-2 exists to
  stop exactly that.
- **AC-3 fixture is a player respawn mid-wave-walk-in** (30 < 61 stagger rules out
  enemy-to-enemy contention); state that in the test comment.
- **AC-4 is a pure-unit test on the selection fn** (`freePad`/all-busy → null, ticket
  survives), NOT a sim fixture.
- **AC-5:** seeded replays with no contention must stay bit-identical — keep `enterViaPads`
  as the VRAND preference, fall through only on contention.
- Observe positions/served-frames off `stepSim`; never assert a pad's "in use" flag by
  name. All changes are `src/core/` — purity guards apply.
- Test-file count anchor: bump `plugins/joust/README.md` 173 → 174 when the RED file lands.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)

**Test Files:**
- `plugins/joust/tests/transporter-occupancy-jt11-9.test.ts` — AC-1 (30-frame stand, sim), AC-2 (stand ≠ collision window, behavioural guard), AC-5 (no-contention pad draw + seeded replay, guards).
- `plugins/joust/tests/freepad-jt11-9.test.ts` — AC-3 (fall-through to first free pad) + AC-4 (all-busy → null), pure unit on `freePad`.
- `plugins/joust/tests/transporter-occupancy-jt11-9-source.test.ts` — AC-3 wiring: `sim.ts` must INVOKE `freePad` (dead-code-becomes-live guard, jt11-4 idiom).
- `plugins/joust/README.md` — derived test-file count 184 → 187 (same commit).

**Tests Written:** 15 tests covering 6 ACs. Verified RED via `testing-runner` (full `--project joust`): **10 failed, 3588 passed**; all 10 failures in the three files above; count-anchor, comment-line-refs, and purity guards all GREEN at 187 files.

**The RED (what Dev must turn green):**
- AC-1 — `stays pinned to its pad for the full 30-frame stand`: posY drifts at birth+2 today (natural velXIndex ramp holds posX ~8 frames). Implement the `PFRAME`=30 plant (`LDA #30 / STA PFRAME`, JOUSTRV4.SRC:5726-5727): pin the arrival's entity position for 30 frames, then release to the brain.
- AC-3/AC-4 — `freePad is not a function` (7 tests) + `sim.ts INVOKES freePad` (2 tests): add `freePad(preferred, occupied): PadId | null` to `transporter.ts` (prefer if free → first free in TR1..TR4 order → null; JOUSTRV4.SRC:5687-5710,5709) and CONSUME it in `sim.ts`'s serve path with real pad-occupancy state (`INC/DEC [TCURUSE,X]`, JOUSTRV4.SRC:5710,5898).

**Green guards (must STAY green):** AC-2 collision-window distinctness; AC-5 pad-draw golden + seeded replay; born-on-a-real-pad. These fail if Dev reuses the 120 window for the stand, shrinks the window to 30, or perturbs the no-contention pad draw.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| core/shell boundary — no clock/DOM/entropy (jt1-1) | existing `purity.test.ts` covers new `src/core/` code | green (pre-wired) |
| no `<file>.ts:<line>` refs in test comments (jt9-30) | `comment-line-refs.test.ts` | green (verified — my comments cite ROM lines + symbol names only) |
| derived test-file count anchor (jt5-7) | `audio-seam-scope.test.ts` | green (bumped 184→187) |
| ServiceQueue-style dead-code-becomes-live (jt11-4) | `transporter-occupancy-jt11-9-source.test.ts` | RED (freePad unwired) |
| no vacuous assertions | Phase-C self-check below | passed |

**Rules checked:** 5 of 5 applicable. **Self-check (Phase C):** 0 vacuous assertions — every test asserts a concrete value with a non-vacuity control (freePad null has a "free one pad" control; the 30-frame stand has a "brain moves it after" control; the source guard has an import-strip non-vacuity check).

**Handoff:** To Dev (Yoda) for implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/joust/src/core/transporter.ts` — new `freePad(preferred, occupied): PadId | null` (FREET/GOTR1..GOTR4/BNE CRELP, JOUSTRV4.SRC:5687-5710).
- `plugins/joust/src/core/sim.ts` — new `STAND_FRAMES=30` (PFRAME); `serveEnemies` now selects the pad via `freePad` against pads currently stood on and applies the 30-frame stand (`standOnPad`/`padIdOfArrival`); serve call site computes the `occupied` set; retired the "no pad-occupancy state" stand-in comment.
- `plugins/joust/tests/difficulty-wiring.test.ts` — re-baselined divergence probe 240→360 frames (see deviation).

**How each AC is met:**
- AC-1 — served arrival is `nap`-frozen on its pad for 30 frames, then flies (posX/posY pinned through birth+29).
- AC-2 — the stand is `STAND_FRAMES` (30); the 120-frame `MATERIALISE_WINDOW` is untouched and keeps counting during the stand (collisions still off at birth+40).
- AC-3 — `freePad` keeps the `enterViaPads` VRAND preference when the pad is clear and falls through TR1..TR4 to the first free pad; wired into `serveEnemies` (source guard green).
- AC-4 — `freePad` returns null when all four pads are busy; the serve path leaves that enemy pending with its ticket, LESERV not advanced.
- AC-5 — no new entropy; occupancy is empty in ordinary play, so `freePad` returns the preference and the pad draw + seeded replay are bit-identical.
- AC-6 — all changes are `src/core/`; `purity.test.ts` green.

**Tests:** joust project **187 files / 3598 tests, all passing (GREEN)**; `tsc --noEmit` (repo-wide lint) clean. Verified via full `npx vitest run --project joust`, not a file-scoped run.

**Branch:** feat/jt11-9-transporter-pad-occupancy
**Branch note:** pushed; GREEN at commit dd474557.

**Handoff:** To Reviewer (Obi-Wan Kenobi) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | smells clean; tests/lint not run (permission) | smells: none | N/A — I ran `npx vitest run --project joust` (187 files/3598 tests green) and `npm run lint` (tsc clean) myself |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary paths assessed by Reviewer (freePad all-busy/null, padIdOfArrival null) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — no try/catch or fallbacks added; assessed by Reviewer |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test quality assessed by Reviewer (non-vacuous, controls present) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — types assessed by Reviewer (PadId union, readonly params, no `as any`) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity assessed by Reviewer (minimal, no over-engineering) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 35 checks | 1 LOW citation-precision note → deferred (non-blocking, filed as Delivery Finding) |

**All received:** Yes (4 enabled returned clean; 5 disabled via settings, pre-filled and covered by Reviewer)
**Total findings:** 0 confirmed blocking, 0 dismissed, 1 deferred (LOW ROM-cite precision)

## Reviewer Assessment

**Verdict:** APPROVED

**Correlation tags (all specialist domains accounted for):**
- `[SEC]` reviewer-security — CLEAN. `freePad`/`serveEnemies`/`standOnPad`/`padIdOfArrival`/occupancy are pure, deterministic, bounded (loops over the frozen 4-element `PADS`), no clock/DOM/`Math.random`, no throw paths.
- `[DOC]` reviewer-comment-analyzer — CLEAN. Every new/edited comment matches implementation; the retired "no pad-occupancy state" comment is gone; the difficulty-wiring re-baseline comment carries no stale exact-frame numbers; ROM cites preserved; README 184→187 correct.
- `[RULE]` reviewer-rule-checker — CLEAN. 0 violations across 35 checks (30 TS lang-review + 5 joust-specific: purity jt1-1, comment-line-refs jt9-30, count anchor jt5-7, ROM idiom). Every ROM citation byte-verified against the vendored source except the `:5687` GOTR range-start (LOW, deferred).
- `[EDGE]` edge-hunter DISABLED — Reviewer covered: `freePad` all-busy→null and one-pad-freed control verified; `padIdOfArrival`→null is unreachable (a pending arrival's `entity.posX` is never mutated, so it is always a pad.x — confirmed by grepping every `stillPending.push`).
- `[SILENT]` silent-failure-hunter DISABLED — Reviewer covered: no try/catch, no swallowed errors, no silent fallbacks introduced; the null-select path is explicit (re-nap with ticket intact).
- `[TEST]` test-analyzer DISABLED — Reviewer covered: all new tests assert concrete values with non-vacuity controls (freePad null has a "free one pad" control; the 30-frame stand has a "moves after" control; the source guard has an import-strip non-vacuity check). No `.only`/`.skip`, no vacuous assertions.
- `[TYPE]` type-design DISABLED — Reviewer covered: `PadId` string-literal union (not stringly-typed), `readonly PadId[]` params, `.js` ESM extensions, `?? null` handling, single narrowing `as number` in a test (idiomatic in the suite), no `as any`.
- `[SIMPLE]` simplifier DISABLED — Reviewer covered: minimal — reuses the existing nap-freeze rather than adding a timer field; occupancy derived, not new state. No dead code or over-engineering.

**Observations (≥5):**
- `[VERIFIED]` The 30-frame stand matches ROM `LDA #30 / STA PFRAME` — evidence: `reference/williams-source/joust/JOUSTRV4.SRC:5726-5727` reads exactly that; `STAND_FRAMES = 30` in sim.ts is applied via `standOnPad` on serve. Complies with core-purity (no clock).
- `[VERIFIED]` `freePad` fall-through + null-when-all-busy matches ROM `GOTR1..GOTR4 / BNE CRELP / GOTTR INC [TCURUSE,X]` — evidence: `JOUSTRV4.SRC:5686-5710` (verified by reading it) iterates TR1..TR4 and branches to CRELP when all busy; `freePad` returns the first free in `PADS` order, else null. Complies with the readonly-array and PadId-union rules.
- `[VERIFIED]` Determinism preserved — evidence: occupancy is a pure filter over `processes`/`PADS`; no entropy added; the AC-5 golden (`enterViaPads(3,SEED)=[TR3,TR4,TR1]`) and the full 3598-test suite are green. `[SEC]` corroborates.
- `[VERIFIED]` `padIdOfArrival`→null cannot strand an arrival — evidence: every `stillPending.push` (sim.ts serveEnemies) spreads `{...pe, nap}` only; `pe.arrival.entity` is never repositioned while pending, so `posX` is always a pad.x and the null branch is unreachable. Fails safe if it ever were. `[RULE #27]` corroborates.
- `[VERIFIED]` Occupancy correctly scopes to pad-standers — evidence: the occupied scan reads `p.kind==='player' ? p.entity : p.enemy?.entity`; pteros/trolls/eggs (no `.enemy.entity`) are excluded, and players spawn at x=100/200 and `PLAYER_START_PIXEL_Y=90` never matches a pad — so nothing falsely occupies. `[DOC]` corroborates.
- `[LOW]` ROM cite `JOUSTRV4.SRC:5687-5709` starts one line after the `GOTR1` label (`:5686`) at `transporter.ts` freePad / `sim.ts` serveEnemies / `freepad-jt11-9.test.ts`. Non-blocking, deferred as a Delivery Finding.

**Rule Compliance:** core/shell purity (jt1-1) — all 5 new/changed core functions clean. comment-line-refs (jt9-30) — no `<name>.ts:<line>` in any new/edited test comment; ROM cites preserved. count anchor (jt5-7) — README 187 == actual file count. ROM citation idiom — byte-exact except the LOW note above.

**Data flow traced:** a wave's pending arrival (`pendingWaveEnemies` → `enterViaPads` pad preference) → `stepSim` computes `occupied` from live process positions → `serveEnemies` calls `freePad(preferred, occupied)` → `standOnPad` plants it (nap=30) → `stepFrame` freezes it 30 frames → brain flies it; collisions re-enable at the 120-frame window. Safe: pure, bounded, deterministic.

**Pattern observed:** dead-code-becomes-live (the jt11-4 idiom) applied correctly — the previously-unmodelled `TCURUSE`/`PFRAME` laws are now transcribed and consumed, guarded against re-death by the source-wiring test at `transporter-occupancy-jt11-9-source.test.ts`.

**Error handling:** the only failure mode (all pads busy) is handled explicitly — the customer stays pending with its ticket, LESERV not advanced (`serveEnemies`, matching `BNE CRELP`). No swallowed errors.

**Devil's Advocate:** Could the stand permanently jam a pad or hang a wave? No — the stand is a fixed 30-frame `nap` countdown; when it expires the bird flies off (verified: AC-1 control asserts movement resumes, and the full suite's wave-clear/troll tests are green). Could the positional occupancy false-positive and force a needless fall-through, perturbing determinism? Only if a flying bird sat at a pad's *exact* (x, y<<8) on the same frame an arrival is served — but with 30<61 no enemy is mid-stand when the next is served, players never spawn on a pad, and any transient coincidence is computed identically in both replay runs (so determinism holds; AC-5 green). Could a hostile/degenerate arrival with a non-pad `posX` reach `freePad`? `padIdOfArrival` fails closed to null (turned away, not a crash), and by construction it never happens. Could the difficulty re-baseline hide a real regression? No — the probe's `discriminating > 0` self-guard still fires within 360 frames, proving the brake still decides; the divergence simply moved later with the stand. Nothing here rises to Critical/High.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.