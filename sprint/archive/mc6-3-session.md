---
story_id: "mc6-3"
jira_key: "mc6-3"
epic: "mc6"
workflow: "tdd"
---
# Story mc6-3: PAUSE toggle: phase play <-> pause freezes enemy motion, ABM flight, scoring and spawn (stepGame no-op but the clock) while paused; shell binds the pause key and reuses @shared/pause for the overlay. REV-01 W3MAIN.MAC:615 PAUSE

## Story Details
- **ID:** mc6-3
- **Jira Key:** mc6-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** arcade

**Branch:** feat/mc6-3-pause-toggle
**PR:** https://github.com/slabgorb/arcade/pull/190 (MERGED into develop, merge commit 9d8203d4)

## Acceptance Criteria

**Core (pure simulation):**
1. A play<->pause toggle: a pause action flips phase between 'play' and 'pause' (state codes S_PLAY=0x00, S_PAUS=0x80 per W3COMN.MAC:59)
2. While paused, stepGame is a no-op for enemy motion, ABM flight, scoring, and spawn — "no-op but the clock" (the sim clock still advances; game state does not)

**Shell (UI):**
3. Shell binds the pause key (REV-01 W3MAIN.MAC:615 PAUSE)
4. Shell reuses `@shared/pause` for the overlay

**Citation:** REV-01 W3MAIN.MAC:615 (PAUSE)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-10T08:42:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-10T07:59:55Z | 2026-08-10T08:02:16Z | 2m 21s |
| red | 2026-08-10T08:02:16Z | 2026-08-10T08:18:48Z | 16m 32s |
| green | 2026-08-10T08:18:48Z | 2026-08-10T08:26:11Z | 7m 23s |
| review | 2026-08-10T08:26:11Z | 2026-08-10T08:42:00Z | 15m 49s |
| finish | 2026-08-10T08:42:00Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **D-1 (Improvement, non-blocking) — the story's "@shared/pause for the overlay" is imprecise; the overlay module is `@shared/esc-overlay`.** `@shared/pause` is the pure key/toggle VERB (`isPauseKey`, `togglePaused`, `stepUnlessPaused`) — it draws nothing. The shared OVERLAY drawer is `@shared/esc-overlay` (`drawEscOverlay`), which battlezone wraps as `drawPauseOverlay`. mc6-3 reuses BOTH: `@shared/pause` for the pause-key binding (AC3) and `@shared/esc-overlay` for the overlay (AC4). The RED tests are written to that faithful reading. No scope change — recorded so Dev/Reviewer aren't misled by the AC wording.
- **D-2 (Question→resolved, non-blocking) — AC5 files NO new claim; it is a green guard.** mc6-3 adds no new numeric constant (S.PAUS is already cited by mc6-1's MC-STATE-PAUS), so per mc3's "carries no claim" precedent it files nothing. The PAUSE STATE anchor `MC-ANCH-W3MAIN-615` (`.SBTTL PAUSE STATE`) is already committed by the rom-study bootstrap; AC5 guards it stays. Dev must NOT invent a claim.
- **D-3 (Gap, non-blocking) — MC does not pre-lowercase keys, so `pauseFromKey` must lowercase before `isPauseKey`.** The shared `isPauseKey` matches `'escape'` exactly and assumes keys arrive lowercased, but MC's `main.ts` passes the raw `event.key` (`'Escape'`, capital) and `fireKeyToBase` lowercases internally. `pauseFromKey` must do `isPauseKey(key.toLowerCase())` or the real keydown never pauses. AC3's "raw DOM 'Escape'" test pins this.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

- **DEV-1 — widened mc9-4's `@shared` allowlist guard to admit the modules mc6-3 reuses.**
  `tests/render-hud.test.ts` (mc9-4 AC2 "no premature src/shared extraction") allowed ONLY
  `@shared/font` in `src/shell`, so mc6-3's sanctioned imports (`input.ts → @shared/pause`,
  `render.ts → @shared/esc-overlay`) reddened it. The guard's real purpose (its own comment) is
  to forbid MINTING A NEW src/shared library, not to ban reusing an already-extracted shared
  VERB. Changed the allowlist from `=== '@shared/font'` to a set `{font, pause, esc-overlay}` and
  reworded the message; the guard keeps its teeth against a genuinely new extraction. Why: the
  story's AC explicitly reuses these pre-existing SH2-12 modules (as battlezone/tempest do). Not a
  spec change — a guard catching up to sanctioned scope.

## SM Assessment

**Setup by Baldur the Bright (SM). Handoff → Tyr One-Handed (TEA), RED phase.**

**Premise verified against the live tree (not assumed):**
- mc6-1 (done) shipped the phase machine in `plugins/missile-command/src/core/state.ts`:
  the `Phase` union already carries `'pause'`, `Handler = 'play' | 'pause' | 'setup'`,
  and the state codes `S_PLAY=0x00` / `S_PAUS=0x80` (W3COMN.MAC:59) / `S_SETU=0x40` with
  `phaseFromCode`/`codeFromPhase` already mapping `'pause' <-> S_PAUS`. So the pause
  PHASE and its state model already exist; mc6-3 wires the play<->pause TOGGLE, makes
  `stepGame` a no-op-but-the-clock while paused, binds the pause key, and reuses
  `@shared/pause` for the overlay.
- mc6-2 (done) shipped SETUP->PLAY start-of-game; its remote branch is an unpruned
  merged branch, not active contention.

**Null ACs → derived.** The epic YAML has `acceptance_criteria: null`. The four ACs above
were derived from the title-as-spec and grounded in the ROM citation REV-01
W3MAIN.MAC:615, with the core/shell boundary made explicit. The `context-story` file is
the generated stub — this session's AC block is TEA's primary input.

**Sibling contention probes (clean for mc6-3):** `git branch -r | grep -i mc6` showed only
the merged mc6-2 branch; no mc6-3 branch existed before I pushed. Only sibling session is
`a-2/.session/pm4-1-session.md` (a different story). Claim pushed: branch
`feat/mc6-3-pause-toggle` + in_progress stamp, so the branch-probe now lights up.

**Board anomaly flagged, not touched:** PR #186 (pm4-1) is a-2's freshly-opened non-draft
PR while pm4-1's status sits at `backlog` — an unpushed status stamp on a sibling's active
story. Not mine to mutate or merge; noted for a-2 / the merge-gate.

**Boundary reminder for TEA/Dev:** toggle + freeze logic is pure `src/core/`; key binding
and overlay are `src/shell/`. The core purity scanner reads source text including comments,
so keep `window.`/`document.` out of core.

## TEA Assessment

**RED by Tyr One-Handed (TEA). Handoff → Loki Silvertongue (Dev), GREEN phase.**

**RED evidence (verified, not asserted):** `plugins/missile-command/tests/pause.test.ts`
(committed `d48ff848`). `npx vitest run --project missile-command` → **22 failing, isolated
to pause.test.ts; 1091 other MC tests green (62 files); `npm run lint` (tsc --noEmit) green.**
The failures are the FEATURE's absence (self-describing dynamic loaders), not resolution
noise, and the freeze/overlay assertions fail on real behaviour, not crashes.

**The contract Dev implements (all four surfaces):**
1. **`src/core/state.ts` — `togglePause(phase: Phase): Phase` (PURE).** `'play'→'pause'`,
   `'pause'→'play'`, every other phase returned UNCHANGED (you cannot pause attract/setup/
   between/over). No clock, no entropy.
2. **`src/core/game.ts` — a `'pause'` branch in `stepGame`.** Mirror the `'over'` freeze:
   `return { ...state, frame: state.frame + 1, soundEvents: [] }` when `state.phase === 'pause'`.
   Only the clock advances; every simulation field is held byte-identical. (Guard it BEFORE
   the combat path — today `nextPhase('pause', liveCities)` would flip it to `'play'`.)
3. **`src/shell/input.ts` — `pauseFromKey(key, state): GameState` (PURE).** When
   `isPauseKey(key.toLowerCase())` (REUSE `@shared/pause` — see D-3, MC passes raw `'Escape'`),
   return `{ ...state, phase: togglePause(state.phase) }`; else return `state`. Launches no ABM,
   spends no ammo. Wire it into `main.ts`'s keydown dispatch alongside `fireOrStart`.
4. **`src/shell/render.ts` — `drawPauseOverlay(ctx, w, h)` reusing `drawEscOverlay` from
   `@shared/esc-overlay`** (the battlezone `drawPauseOverlay` precedent: full-viewport dim +
   centred keybind card, MC's own copy/colour/opacity — playtest-tunable NUMBERS). Call it from
   `drawFrame` when `state.phase === 'pause'`, after the frozen scene.

See **Delivery Findings D-1/D-2/D-3** for the overlay-module refinement, the no-new-claim
ruling, and the lowercase gotcha. Full ROM grounding and RED rationale are in the test header.

**Rule Coverage (lang-review + Heimdall discipline):**
- **Test quality (#8 / no-vacuous):** every test carries a meaningful assertion; no
  `is*()`-on-always-value, no `let _ =`. Self-checked.
- **Independent oracle (Heimdall #18):** AC1's "lands on the real PAUSE state" asserts against
  mc6-1's exported `S_PLAY`/`S_PAUS`/`mainline` literals, NOT re-derived from `togglePause`.
- **Synthetic-input control (derived-vs-inert):** AC2 runs the SAME board in `'play'` and proves
  it advances (ICBM descends) — so the paused freeze is a real no-op, not a dead input.
- **Behavioural overlay (no vacuous grep):** AC4 uses a recording ctx to count full-viewport
  dims (render is node-importable); it never source-greps for a call, so it can't pass on a
  comment. NOTE for Reviewer: the ctx counts `fillRect(0,0,w,h)` — clearField gives 1, the
  overlay adds 1; if Dev's overlay dim is not full-viewport, tighten the assertion.
- **Core purity:** the toggle + freeze add no `window.`/`document.`; the scanner (comments too)
  stays green.

**Watch for Reviewer:** AC5 is GREEN on arrival by design (a guard on the pre-committed PAUSE
anchor) — not a missed RED. AC4's source-re-derivation half (D `.SBTTL`) is byte-gated and
skips on CI when the reference tree is absent.
## Dev Assessment

**GREEN by Loki Silvertongue (Dev). Handoff → Heimdall (Reviewer).**

**Verified GREEN:** `npx vitest run` → **14154 pass / 0 fail / 1 todo (934 files)**;
`npx vitest run --project missile-command` → **1113/1113 (63 files)**; pause.test.ts
**26/26**; `npm run lint` (tsc --noEmit) green. Branch `feat/mc6-3-pause-toggle` pushed
(`f2d1110b`).

**Implemented, minimally, exactly to the TEA contract (6 files, +69/-6):**
- `src/core/state.ts` — `togglePause(phase)`: play↔pause, no-op elsewhere. Pure.
- `src/core/game.ts` — a `'pause'` branch in `stepGame`, guarded before the combat path,
  mirroring the `'over'` freeze (`{ ...state, frame: frame+1, soundEvents: [] }`).
- `src/shell/input.ts` — `pauseFromKey(key, state)` reusing `@shared/pause` `isPauseKey`
  (lowercasing the raw DOM `'Escape'`), toggling only the phase.
- `src/shell/render.ts` — `drawPauseOverlay` reusing `@shared/esc-overlay` `drawEscOverlay`
  (dim + `['PAUSED','','PRESS ESC TO RESUME']` card, `#fff`, 0.72 dim); `drawFrame` calls it
  when `state.phase === 'pause'`.
- `src/main.ts` — `pauseFromKey` wired into the keydown dispatch before `fireOrStart`.
- `tests/render-hud.test.ts` — see **Design Deviation DEV-1** (widened the mc9-4 `@shared`
  allowlist to admit the pre-existing modules mc6-3 reuses).

**For the Reviewer's attention:**
- **DEV-1 is the one test edit** — a guard widening, not a behaviour change; verify it still
  forbids a genuinely NEW `src/shared` extraction (anything outside {font, pause, esc-overlay}).
- **AC4 is behavioural** (recording ctx counts full-viewport `fillRect(0,0,w,h)`: clearField=1,
  overlay=+1). To adversarially confirm the overlay is really wired, mutate the `drawFrame`
  pause guard to a no-op and watch AC4 redden; mutate `pauseFromKey`'s `.toLowerCase()` away and
  watch AC3's "raw 'Escape'" test redden.
- **AC5 is a green guard** (no new claim; the PAUSE anchor was already committed) — not a miss.
- **Hand-verify:** `just serve` → `/missile-command/`, press Escape mid-game → the field dims
  with the resume card and enemies/score freeze; Escape again resumes from the frozen state.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1113 MC + 457 orch + lint green, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 1 (AC3 gap), noted 1 low (coupled loop) |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 4 (3 fidelity prose + 1 stale comment) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (self-assessed: clean) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (self-assessed: N/A, no auth/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (self-assessed: minimal) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 30 rules / 46 instances | N/A |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 6 confirmed + fixed, 1 low noted, 1 out-of-scope filed (mc6-7)

## Reviewer Assessment

**Reviewed by Heimdall. Verdict: APPROVED (round 1, findings fixed in place).**

The pause feature is functionally correct across all four surfaces — rule-checker CLEAN
(0/30 violations), preflight GREEN, and test-analyzer's own mutation battery confirmed
AC1/AC2/AC4 have real teeth (freeze-removal, lowercase-drop, togglePause-noop and
overlay-unwired mutants all caught). All confirmed findings were Medium/Low severity
(no Critical/High); per the standing fix-prose-in-place preference they were corrected
this round rather than bounced, and the one out-of-scope item was filed.

**Observations:**
- `[VERIFIED]` `togglePause` is pure, total over Phase, and lands on the real PAUSE
  state — state.ts: `if 'play'→'pause' / 'pause'→'play' / else identity`; stateCode &
  mainline confirm S_PAUS/PAUSE. No DOM. Complies with the core-purity + citation rules.
- `[VERIFIED]` `stepGame` pause branch freezes correctly, guarded BEFORE the combat path
  — game.ts:187 mirrors the 'over' early-return; evidence: branch order 'over'(179) →
  'pause'(187) → combat(227), and AC2's freeze + CONTROL exercise it.
- `[DOC]` **[FIXED]** the ROM PAUSE STATE is an automatic self-timed delay, never a
  player pause — the state.ts/game.ts/render.ts comments overstated ROM provenance (the
  quotes-are-accurate-but-meaning-is-wrong trap). Reworded to disclose the repurposing
  of mc6-1's vacant dispatch slot. (comment-analyzer, confirmed against W3MAIN.MAC.)
- `[TEST]` **[FIXED]** AC3's non-pausable-phase no-op test covered only ['attract','over']
  — a `pauseFromKey` re-rolling its own phase check could break 'setup'/'between'
  invisibly (subagent-proven by mutation; the impl is in fact correct via delegation).
  Extended to all NON_TOGGLE_PHASES. (test-analyzer, confirmed.)
- `[DOC]` **[FIXED]** render-hud.test.ts allowlist comment said "battlezone/tempest"; the
  shared pause modules are used by six of the fleet's games. Corrected. (comment-analyzer.)
- `[RULE]` `[VERIFIED]` rule-checker CLEAN across 30 checks incl. core/shell boundary,
  citation discipline (// not JSDoc; no new constant — AC5 only guards the pre-existing
  MC-ANCH-W3MAIN-615), determinism, and exhaustiveness. No violations.
- `[VERIFIED]` ROM citations byte-accurate: W3MAIN.MAC:517 (JSR PAUSE), :615 (.SBTTL
  PAUSE STATE), :617 (PAUSE:), W3COMN.MAC:59 (S.PAUS=80) — verified independently against
  the vendored source.
- `[MEDIUM → FILED mc6-7]` fire-while-paused: main.ts runs `pauseFromKey` then
  `fireOrStart`, and `fireOrStart`/`fireFromKey` do not gate on `phase==='pause'`, so Z/X/C
  while paused spends ammo, queues an ABM (flies on resume) and sounds a launch. The
  `stepGame` freeze itself is correct (the AC); this is ungated shell INPUT, outside the
  four ACs. Filed as mc6-7 (p3 bug) rather than blocking. audio-dispatch already reads
  `phase==='play'` fresh, so the drone stays silent while paused.

**### Rule Compliance** (lang-review typescript.md + CLAUDE.md, mapped to rule-checker):
- Core/shell boundary (CLAUDE.md): togglePause + stepGame pause branch are DOM-free,
  clock-free, entropy-free — COMPLIANT (purity.test.ts green; rule-checker #27).
- Citation discipline (CLAUDE.md): ROM refs in `//` not JSDoc; no new uncited numeric
  literal in src/core; AC5 guards (does not mint) the PAUSE anchor — COMPLIANT (#28).
- Determinism/purity: togglePause, pauseFromKey, stepGame pause branch never mutate input
  — COMPLIANT (#29). Exhaustiveness: togglePause covers all 6 Phase members — COMPLIANT (#30).
- Type safety (#1-2): the recordingCtx `as unknown as CanvasRenderingContext2D` cast
  mirrors the established six-file sibling idiom; `c!` after `toBeDefined()` is guarded —
  COMPLIANT.

**### Devil's Advocate:** Could a malicious/confused player break this? Pausing then
firing DOES spend ammo (mc6-7) — a mild exploit (line up shots against a frozen field on
resume) but not state corruption. Could the overlay hide a real game-over? No — 'over'
freezes before 'pause' can be entered, and togglePause is a no-op on 'over', so you cannot
pause a dead game into hiding. Could pause desync the audio? No — soundEvents is emptied
each paused frame and the drone gate reads phase fresh. Could `pauseFromKey` on a
non-pausable phase corrupt state? It returns `{...state, phase: unchanged}` — a new-but-equal
object (a micro-allocation, harmless). Could the card text crash the shared font? All glyphs
are A-Z/space, which the shared vector font supports. Could a rapid Escape-mash race the
render loop? Each keydown is a synchronous reducer; no async, no race. Nothing found beyond
mc6-7.

### Reviewer (audit) — Design Deviations
- **DEV-1 (widened mc9-4 @shared allowlist)** → ✓ ACCEPTED: the guard's stated purpose is
  to forbid MINTING a new src/shared library, not to ban reusing an already-extracted VERB;
  @shared/pause + @shared/esc-overlay are pre-existing (SH2-12), and the widened guard keeps
  its teeth (an explicit Set, still rejects any genuinely new extraction). Sound.

**Verdict:** APPROVED. All Medium/Low findings fixed in place this round (commit b79a45aa);
fire-while-paused filed as mc6-7. Ready to merge and finish.