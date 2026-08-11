---
story_id: "pm4-9"
jira_key: "pm4-9"
epic: "pm4"
workflow: "tdd"
---
# Story pm4-9: Attract presentation + high-score ladder display + default table (shell+core)

## Story Details
- **ID:** pm4-9
- **Jira Key:** pm4-9
- **Workflow:** tdd
- **Stack Parent:** pm4-8 (depends_on; DONE, merged as PR #224)
- **Points:** 3
- **Priority:** p3
- **Branch:** feat/pm4-9-attract-presentation-showcase
- **PR:** https://github.com/slabgorb/arcade/pull/233

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T12:05:11Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T11:16:13Z | 2026-08-11T11:20:22Z | 4m 9s |
| red | 2026-08-11T11:20:22Z | 2026-08-11T11:39:16Z | 18m 54s |
| green | 2026-08-11T11:39:16Z | 2026-08-11T11:55:43Z | 16m 27s |
| review | 2026-08-11T11:55:43Z | 2026-08-11T12:05:11Z | 9m 28s |
| finish | 2026-08-11T12:05:11Z | - | - |

## Background

**Measured facts at setup (2026-08-11):**

1. **Ladder logic is complete.** The high-score LADDER LOGIC is already in core (`plugins/pac-man/src/core/game.ts` — the mc7 half: qualifiesForHighScore/insertHighScore + name entry). pm4-9 delivers the *DISPLAY* of that ladder on the attract screen plus a SEEDED DEFAULT ladder (mirror missile-command mc7-4's default-table seeding from the ROM defaults). Do NOT re-implement the ladder logic.

2. **PM4-8 forward impacts (from PR #224, archived session findings):**
   - The attract demo maze RESEEDS to a full board every time the demo Pac is caught (the loop mechanism: `game.ts` attract branch uses `Object.assign(state, createGameState(state.seed, ...))`). The attract PRESENTATION layer must NOT assume one continuous demo run — the board visibly resets to full on each demo death.
   - The demo loops on Pac's DEATH but NOT on a board CLEAR: level-clear is gated on `phase === 'playing'` (`game.ts:748`), which is `attract` during the demo. If the auto-player ate all 240 dots Pac would idle while ghosts roam. Reviewer logged this as a non-blocking rough edge DEFERRED TO pm4-9 — pm4-9 may reseed on board-clear too (a follow-up option, not a hard requirement; flag it for TEA/Dev to decide).

3. **Scope ruling (user-decided at setup, 2026-08-11):** pm4-9 INCLUDES the `showcase: false -> true` flip — `plugins/pac-man/plugin.ts:12` (currently `showcase: false`) AND the pac-man entry in `src/host/registry.ts`. This makes pac-man's now-working attract demo join the lobby showcase rotation. EXPECT registry/census/topology tests to need updating (the "ad1 showcase blast radius": flipping showcase reddens registry + census/topology guards). Record this as an explicit in-scope AC.

4. **Accessibility (binding, overrides ROM):** the boss has photosensitive epilepsy (pm4-1). The attract presentation MUST NOT introduce any full-screen flash/strobe — no blinking title, no strobing text. This is the ONE exception to rom-always-wins.

5. **ROM anchor for RED:** attract strings/cadence at `pacman.asm:36a7` (the attract/PUSH-START table). Any NEW cited constant Dev adds must carry a citations.test.ts-gated claim; core purity (purity.test.ts) stays green.

## Acceptance Criteria

**DERIVED from measured facts (epic had no ACs):**

1. [ ] **AC-1: Render attract overlay** — Draw the attract screen overlay (title + ROM attract text from pacman.asm:36a7) over the pm4-8 self-playing demo. Shell render layer (shell/render.ts) only; do NOT modify core demo loop logic.

2. [ ] **AC-2: High-score ladder display** — Display the high-score ladder (logic already in core game.ts) on the attract screen. The ladder display must respect the maze reseed behavior from pm4-8 (board resets to full on demo-Pac death).

3. [ ] **AC-3: Default ladder seeding** — Seed a default high-score table (mirroring missile-command mc7-4 ROM defaults) at game init. This provides sensible defaults when no scores exist yet.

4. [ ] **AC-4: Board-clear reseed (deferred decision)** — Verify that the demo board reseed behavior from pm4-8 is honored. Document whether board-clear triggers a reseed (pm4-8 left this as a non-blocking deferred option for pm4-9 to decide). Flag the decision for TEA/Dev.

5. [ ] **AC-5: Showcase flip + registry updates** — Enable showcase mode in `plugins/pac-man/plugin.ts:12` (flip `showcase: false` to `true`). Update `src/host/registry.ts` pac-man entry. Update registry/census/topology tests to handle the showcase flip (expect RED on these tests until updated).

6. [ ] **AC-6: Accessibility compliance (binding)** — Verify that the attract presentation introduces NO full-screen flash/strobe (no blinking title, no strobing text). This is a binding accessibility rule (boss has photosensitive epilepsy) and overrides any ROM fidelity preference.

7. [ ] **AC-7: Citations and purity** — All new core constants (if any) must carry citations.test.ts-gated claims anchored at pacman.asm:36a7. Run purity.test.ts and verify green (core functions remain clock-free, seeded-RNG only, frame-count timers).

## Scope (In and Out)

**IN SCOPE (shell + core):**
- Attract overlay render (title, ROM text, ladder display) — shell layer
- Default high-score table seeding — core layer
- Showcase flip + registry updates — tooling/host config
- Accessibility compliance — NO flash/strobe on attract

**OUT OF SCOPE:**
- Pause phase
- Coin/credit economy UI
- Intermission cutscenes
- Maze row-table changes (deferred to pm4-10)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict, non-blocking — RESOLVED by user ruling] (TEA/Leeloo, red):** AC-3's
  "mirror mc7-4's ROM defaults" is a FALSE PARALLEL. Measured: Pac-Man's ROM has NO
  default high-score ladder — only a single HIGH SCORE value (RAM `4e88-4e8b`, powers
  up 0), and the clone's initials ladder is a **centipede clone-ism** (`game.ts:181`
  "Mirrors centipede's InitialsEntry"), with no ROM counterpart. mc7-4 mirrored REAL
  missile-command ROM defaults (SCOINI/STRINI, W3DSUP.MAC); pac-man has none — the fleet
  norm (centipede et al.) is an EMPTY ladder. **User ruled ROM-honest (start empty).** So
  `createGameState`'s empty default STAYS; AC-3 drops the ROM-default premise; there is
  **no citations-gated default constant**, and AC-7's 36a7 citation applies only to the
  attract TEXT (shell). Independently corroborated by `@shared/highscore`'s own comment:
  "fabricating a level would be the cabinet inventing a fact about a player's game." **Dev:
  do NOT seed a default ladder.** The attract HIGH SCORE value reads `highScoreTable[0]?.score
  ?? 0`.

- **[Improvement, non-blocking] (TEA/Leeloo, red):** two STALE comments in the pm4-9 blast
  radius, both pre-dating the attract work (same class as pm4-8's fixed `game.ts:494`):
  `game.ts:168` still says "`createGameState` still starts at `'playing'`" but it returns
  `phase: 'attract'` (`game.ts:367`); `main.ts:8` still says "this cabinet has no attract
  mode / trackball" — pm4-8 gave it one. **Dev:** fix both comment-only in the pm4-9 diff so
  the Reviewer's [DOC] pass stays clean.

- **[Question → RULED by TEA, non-blocking] (TEA/Leeloo, red):** AC-4 (the pm4-8-deferred
  "demo idles if it clears all 240 dots" edge). **TEA rules: NO board-clear reseed added.**
  It is unreachable in practice (a demo death reseeds a full board long before a 240-dot
  clear — pm4-8 Reviewer), non-blocking, and out of the 3-pt presentation scope; it also
  cannot be triggered deterministically for a test. The death-reseed loop (pm4-8) stays the
  sole loop. A later story may reseed on `level-cleared` inside the attract branch if ever
  wanted. No test added; AC-4 is resolved as documented-no-action.

- **[Gap, non-blocking] (TEA/Leeloo, red):** RED seam is `overlays.draw(ctx, game)` — the
  per-frame overlay call `main.ts` already makes (render loop: `drawHud` then
  `overlays.draw`). It already receives the FULL `GameState`, so it can read
  `game.highScoreTable` for the HIGH SCORE value and gate the attract text on
  `game.phase === 'attract'` with no new plumbing. Dev MAY delegate to a helper (render.ts /
  a new module) as long as that per-frame call produces the text in attract.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **HUD layout reworked to the ROM-authentic arrangement (PLAYTEST-DRIVEN)**
  - Spec source: live Playwright playtest — the boss flagged three defects on the first
    GREEN screenshot: (1) "high score is bleeding onto playfield and should not be",
    (2) "lives and level should be there" [at the bottom], (3) "can't see the lowest part
    of the game board … important game information".
  - What the first GREEN did (wrong): the attract overlay drew HIGH SCORE at y=24/34 —
    row 3-4, i.e. the PLAYFIELD, not a reserved HUD band — so it bled onto the maze; and
    `drawHud` stacked SCORE + LIVES/LEVEL all in the TOP band, leaving the reserved BOTTOM
    band (rows 33-35) empty.
  - Implementation: `drawHud(ctx, score, highScore, lives, level)` (new `highScore` arg)
    now paints SCORE top-left, HIGH SCORE top-centre (both in the top band, y < 24,
    pacman.asm:36a5), and LIVES (bottom-left) + LEVEL (bottom-right) in the BOTTOM band
    (y >= 264) — the ROM-authentic placement. HIGH SCORE is therefore a PERMANENT HUD
    element (all phases, since `drawHud` runs every frame), so the attract overlay
    (`drawAttractScreen`) now draws ONLY the attract-specific "PUSH START BUTTON"
    (pacman.asm:36b3).
  - Test restructure: the HIGH SCORE label/value assertions moved out of
    `attract-screen.test.ts` into a NEW `tests/shell/hud.test.ts` that pins the BAND
    (top vs bottom, a y-coordinate) each readout lands in — including an explicit
    "no HUD text in the playfield band (24 <= y < 264)" bleed guard that reproduces the
    exact defect the playtest caught. AC-1 (attract text) / AC-2 (persisted HIGH SCORE)
    are still fully covered — HIGH SCORE via drawHud (which runs in attract), PUSH START
    BUTTON via the overlay.
  - Rationale: rom-always-wins — Pac-Man puts HIGH SCORE top-centre and lives/level at
    the bottom; the reserved bands exist exactly so no readout touches the maze.
  - Severity: moderate (public `drawHud` signature changed — sole caller main.ts updated;
    behaviour-corrective, playtest-verified).
  - Forward impact: none new. A later story could upgrade the bottom band from text to the
    authentic ICON display (Pac-life sprites + fruit-level sprites via drawPacman/drawFruit)
    — deliberately kept as TEXT here to match the clone's existing procedural-text HUD style
    (not a per-story choice; the whole HUD has been text since pm1-8).

- **Reconciled `tests/shell/overlays.test.ts` to the attract feature (expected overturn)**
  - `stubGame()` now returns a `'playing'` state (was a fresh `createGameState`, which boots
    into `'attract'`): those tests exercise the popup/READY!/GAME OVER mechanics, which live
    in play/game-over, and overlays now paints the attract SCREEN in attract, so the old
    attract-phase stub would have collided (steady per-frame text breaks the popup
    "calls stabilise" assertions). The restart test's post-restart expectation became the
    attract prompt (PUSH START BUTTON) rather than READY!, since a restart lands in attract.
  - Rationale: same shape as pm4-8 overturning the frozen-attract lifecycle assertion.
  - Severity: minor (test-only; every mechanic still covered, now in its real phase).

- **Fixed two stale comments (TEA Delivery Finding)** — `game.ts:168` ("still starts at
  'playing'" → now boots into 'attract') and `main.ts:8` ("no attract mode" → the pm4-8
  demo + pm4-9 screen). Comment-only.

## Tea Assessment

**RED (Leeloo / TEA), 2026-08-11.** Tests-first suite for the attract-screen
presentation over the pm4-8 self-playing demo, plus the showcase flip. All shell
tests drive the public per-frame seam (`overlays.draw(ctx, game)` via a mock ctx),
never a driver internal.

**ROM anchor verified FIRST (my duty per SM handoff).** `pacman.asm:36a7` is a hex
ADDRESS (file line 7768), the attract string-pointer table: `HIGH SCORE` (36a5),
`CREDIT` (36a7), `PLAYER ONE` (36ab), `PUSH START BUTTON` (36b3), `CHARACTER/NICKNAME`
(36bd, the ghost-intro — NOT player initials). The citation is accurate. The tests
cite the exact string addresses (36a5, 36b3).

**Premise refuted + ruled (see Delivery Findings).** AC-3's "mirror mc7-4 ROM
defaults" has no ROM basis for pac-man (no default ladder exists; single HIGH SCORE
powers up 0). Boss ruled ROM-honest → empty ladder stays, no fabricated defaults. The
tests pin the PERSISTED top score (or a real 0), and explicitly assert nothing is
invented.

**Files:**
- NEW `plugins/pac-man/tests/shell/attract-screen.test.ts` — 8 tests (mock-ctx
  harness lifted from `overlays.test.ts`).
- EDIT `src/host/registry.test.ts` — showcase census reconciled to include `pac-man`
  (AC-5); RED until Dev flips `plugins/pac-man/plugin.ts`.

**RED verified DIRECTLY** (vitest, NOT testing-runner — it confabulates test names):
- `--project pac-man`: **4 failed / 358 passed** — the 4 REDs are AC-1 (PUSH START
  BUTTON, HIGH SCORE) and AC-2 (persisted top score, empty→0), each failing because
  nothing paints the attract screen today. No collateral regressions.
- `--project host`: **1 failed / 62 passed** — the showcase census (expects `pac-man`,
  currently `showcase:false`).
- `npm run test:orchestrator`: **457/457 GREEN** — `showcase-liveness` derives targets
  live, so it neither reddens now nor breaks on the flip.
- `npm run lint` (tsc, repo-wide): **0 errors, 0 TS2367** — tests are type-clean.

**AC coverage:**
- AC-1 (ROM attract text) → PUSH START BUTTON + HIGH SCORE label, accumulated across a
  60-frame window (tolerates the authentic blink + a split render). RED.
- AC-2 (HIGH-score value) → seeded top score 31415 renders; empty table → real 0 and
  NOT 31415 (no fabrication). RED.
- AC-3 (default ladder) → RULED ROM-honest: empty stays. Covered by AC-2's empty-table
  test (asserts nothing invented). No new seeding test.
- AC-4 (board-clear reseed) → RULED no-action (Delivery Finding). No test.
- AC-5 (showcase flip) → census in `registry.test.ts` reconciled to include pac-man. RED.
- AC-6 (no strobe, BINDING) → no full-screen fill + no high-luminance full-screen
  transition across 300 frames, with a negative control proving the mock catches a real
  white flash. GREEN guards (the blink is allowed; the flash is not).
- AC-7 (citations + purity) → the attract strings are SHELL text (overlays/render), so
  `citations.test.ts` (core scanner) does not gate them and `purity.test.ts` stays green
  (no new core constant). Verified green in the RED run. Dev should still add
  `// pacman.asm:36b3` / `:36a5` provenance comments beside the strings.

**Rule Coverage:**
- **Accessibility (pm4-1/epilepsy, BINDING):** the strongest guard here — AC-6 pins NO
  full-screen high-luminance flash on the attract screen, with a non-vacuous negative
  control. Overrides ROM fidelity; the authentic PUSH START BUTTON blink is explicitly
  permitted (small glyph, not a hazard).
- **Core purity** (`purity.test.ts`, machine-enforced): no new core constant added; the
  attract presentation is shell-only. Stays green automatically.
- **Citations gate** (`citations.test.ts`): unaffected — the ROM strings live in the
  shell, outside the core scanner. Green in the RED run.
- **No fabrication** (rom-always-wins / lb2-8 "don't invent initials"): AC-2 pins that
  the HIGH SCORE value is the real persisted top or 0 — never a seeded default. This is
  the test that keeps a "populate the showcase" instinct honest.
- **TS lang-review (typescript.md):** flagging for Dev — the attract value read is
  `highScoreTable[0]?.score ?? 0` (use `??`, not `||`; 0 is a valid score); no `as any`
  on the ctx; gate on `phase === 'attract'` (no wrong-phase leak, covered by the guard).

**Phase-gating guard (green, load-bearing at GREEN):** attract text must never appear
while `phase === 'playing'` — passes trivially now, becomes real once Dev adds the
screen (mirrors pm4-8's never-self-exit guard).

**Handing to Dev (Korben Dallas) for GREEN.** Paint the attract screen on the
`overlays.draw` seam when `phase === 'attract'`: HIGH SCORE label + persisted value,
PUSH START BUTTON (both ROM-cited by comment), over the demo — no full-screen flash, no
seeded defaults — and flip `plugins/pac-man/plugin.ts` `showcase: true` (regen registry
if needed). Fix the two stale comments (Delivery Findings).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/pac-man/src/shell/overlays.ts` — attract branch in `draw` paints the
  attract prompt (`drawAttractScreen` → "PUSH START BUTTON", pacman.asm:36b3) while
  `phase === 'attract'`; no full-screen fill (accessibility).
- `plugins/pac-man/src/shell/render.ts` — `drawHud` reworked (new `highScore` arg):
  SCORE top-left, HIGH SCORE top-centre (pacman.asm:36a5), LIVES/LEVEL moved to the
  BOTTOM band. ROM-authentic HUD, no playfield bleed. (See Design Deviation.)
- `plugins/pac-man/src/main.ts` — passes `game.highScoreTable[0]?.score ?? 0` to
  `drawHud`; stale "no attract mode" comment fixed.
- `plugins/pac-man/src/core/game.ts` — stale "starts at 'playing'" comment fixed.
- `plugins/pac-man/plugin.ts` — `showcase: false → true` (AC-5).
- `src/host/registry.ts` — regenerated via `npm run gen:registry` (pac-man showcase:true).
- Tests: NEW `tests/shell/hud.test.ts` (HUD band placement + bleed guard); reworked
  `tests/shell/attract-screen.test.ts` (prompt + accessibility); reconciled
  `tests/shell/overlays.test.ts` (stub → 'playing', restart → attract prompt).

**Approach:** the attract SCREEN is HUD (permanent, top/bottom bands) + one attract-only
prompt. HIGH SCORE reads the persisted top score (or a real 0) — no fabricated default,
per the boss's ROM-honest ruling. The demo (pm4-8) is untouched; pm4-9 only paints over it.

**Playtest:** verified live via Playwright (headless, port 5291, `/pac-man/`): the attract
screen renders over the self-playing demo — SCORE + HIGH SCORE in the top band, LIVES +
LEVEL in the bottom band, PUSH START BUTTON over the maze, demo self-playing (ghosts
frightened, score climbing). Two screenshots taken (first exposed the HUD-bleed defect the
boss flagged; second confirmed the fix), then artifacts removed.

**Tests:** pac-man **366/366** GREEN (was 4 RED + reworked); `--project host` **63/63**
(showcase census now includes pac-man); `npm run test:orchestrator` **457/457**;
`npm run lint` (tsc, repo-wide) GREEN, 0 TS2367.

**AC status:** AC-1 (attract text) ✓ · AC-2 (persisted HIGH SCORE) ✓ · AC-3 (RULED empty,
no default) ✓ · AC-4 (RULED no board-clear reseed) ✓ · AC-5 (showcase flip + census) ✓ ·
AC-6 (no strobe, BINDING) ✓ · AC-7 (purity + citations green; ROM strings shell-cited) ✓.

**Branch:** feat/pm4-9-attract-presentation-showcase (pushed)
**Handoff:** To review (Reviewer / Jean-Baptiste Emanuel Zorg).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint 0/0, pac-man 366/366, host 63/63, orch 457/457, 0 debug residue, registry byte-identical to gen |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled in config — hand-covered: `[0]?.score ?? 0` handles empty table; `String()` total; HUD band positions in-range (BOTTOM=272 within 264-287) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — hand-covered: no try/catch, no swallowed errors; `?? 0` is an explicit ROM-honest fallback, not a silent swallow |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: bleed guard non-vacuous (original bled, watched live); negative control present; overlays reconciliation still asserts in its real phase |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — hand-covered; FOUND stale `render.ts:19` "untouched" → FIXED forward (4e62e6a2) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — hand-covered: no as-any/double-cast in prod (test-mock cast is the house idiom); `??` correct; primitives only |
| 7 | reviewer-security | Yes | clean | none | N/A — no injection sink (fillText ≠ HTML), `String()` total, core comment-only, no-flash confirmed |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — hand-covered: dropped the unused `_game` param; minimal diff, no dead code |
| 9 | reviewer-rule-checker | Yes | clean | none (33 rules, 0 violations) | N/A — 7 project + 26 TS checks; mutation-killed the phase-gate (2 tests reddened); registry byte-identical |

**All received:** Yes (3 enabled returned — all clean; 6 disabled pre-filled and hand-covered)
**Total findings:** 0 confirmed blocking; 1 LOW [DOC] found by Reviewer and FIXED forward (render.ts:19, commit 4e62e6a2); 1 non-defect note (registry.test.ts:180 "RED until" phrasing — a ~90-instance fleet provenance convention per the rule-checker, left consistent with the fleet).

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** in `attract`, `main.ts`'s frame loop calls `drawHud(ctx, score,
game.highScoreTable[0]?.score ?? 0, lives, level)` then `overlays.draw` →
`drawAttractScreen` ("PUSH START BUTTON"). No external input reaches the render: the
prompt is a literal; the HIGH SCORE value is the persisted table's top entry (sorted
descending, `@shared/highscore`) or a real 0. Safe — `fillText` is a Canvas draw, not an
HTML/JS sink, and the load-time row guard keeps the score finite.

**Pattern observed:** HUD in RESERVED BANDS. `drawHud` writes only into the two black
bands `maze.ts` reserves (`isHudRow`: rows 0-2 top, rows 33-35 bottom) — SCORE + HIGH
SCORE top, LIVES + LEVEL bottom — so no readout can touch the playfield. This is the
ROM-authentic layout and it fixes the exact defect the live playtest surfaced (HIGH
SCORE bleeding onto the maze).

**Error handling:** none needed; no throws introduced. The `?? 0` is the explicit
empty-table case, not a swallowed failure.

**Observations (8):**
- [VERIFIED] No HUD bleed — `drawHud` (render.ts) writes only in reserved bands; the new
  `hud.test.ts` "bleed guard" asserts NO HUD text in the playfield band (24 ≤ y < 264),
  and a live Playwright playtest confirmed SCORE/HIGH SCORE top, LIVES/LEVEL bottom over
  the demo. Corroborated by [RULE] (rule 5/17) and [PRE].
- [VERIFIED] No fabrication — the attract HIGH SCORE is `highScoreTable[0]?.score ?? 0`
  (real persisted top or a real 0); `hud.test.ts` pins the empty→0 case and that 31415
  round-trips. Matches the boss's ROM-honest ruling + `@shared/highscore`'s own
  no-invention rule. Corroborated by [SEC] and [RULE] (rule 4).
- [VERIFIED] Accessibility (BINDING) — `drawAttractScreen` uses only `fillText`, never
  `fillRect`; `attract-screen.test.ts` AC-6 (300-frame window) + a non-vacuous negative
  control prove no full-screen flash. Corroborated by [SEC] and [RULE] (rule 5).
- [VERIFIED] Showcase flip is real and consistent — `registry.ts` regenerated
  byte-identical to `npm run gen:registry` (not hand-edited); the `registry.test.ts`
  census reconciled to include pac-man; `showcase-liveness` derives targets live so the
  orchestrator suite stays 457/457. Corroborated by [PRE] and [RULE] (rule 6).
- [VERIFIED] Phase-gating is real — the rule-checker MUTATION-KILLED the
  `game.phase === 'attract'` branch: reverting it reddened exactly 2 tests
  (attract-screen AC-1, overlays restart). The attract prompt cannot leak into play.
- [PRE] reviewer-preflight: clean — lint 0/0 (0 TS2367), pac-man 366/366, host 63/63,
  orchestrator 457/457, 0 debug residue, registry byte-identical.
- [SEC] reviewer-security: clean — no injection sink (`fillText` renders literal glyphs,
  not HTML), `String(highScore)` is total, core diff is comment-only, no new trust boundary.
- [RULE] reviewer-rule-checker: clean — 33 rules (7 project + 26 TS lang-review), 0
  violations, verified live (test runs, `tsc`, `gen:registry` re-run, a mutation kill).
- [LOW][DOC] STALE COMMENT — `render.ts:19` said `drawHud` was "untouched here, still out
  of scope"; pm4-9 relaid it out. FIXED forward (doc-only commit 4e62e6a2), re-verified
  366/366 + lint 0.

**Dispatch tags present:** [PRE] clean · [SEC] clean · [RULE] clean · [DOC] one found+fixed ·
[EDGE] hand-covered (empty-table / String / band bounds) · [SILENT] hand-covered (no swallow) ·
[TEST] hand-covered (bleed guard non-vacuous, reconciliation valid, mutation-killed) ·
[TYPE] hand-covered (no as-any in prod, `??` correct) · [SIMPLE] hand-covered (dropped unused param).

### Rule Compliance
- **Core purity** (no Date/performance/Math.random/DOM in src/core): `game.ts` diff is
  comment-only — COMPLIANT (purity.test.ts green; [RULE] rule 1 confirms).
- **Core/shell boundary**: the render/HUD work is entirely shell; core imports no shell —
  COMPLIANT ([RULE] rule 2).
- **Citations gate**: the ROM strings ("PUSH START BUTTON" 36b3, "HIGH SCORE" 36a5) live in
  the SHELL, outside the core/dossier scanner, so no claim is owed — citations.test.ts 54/54
  green — COMPLIANT ([RULE] rule 3).
- **No fabrication** (rom-always-wins / lb2-8): real persisted top or 0 — COMPLIANT.
- **Accessibility (BINDING, pm4-1)**: no full-screen flash on attract — COMPLIANT (AC-6 +
  negative control).
- **Generated registry**: byte-identical to `gen:registry` — COMPLIANT ([RULE] rule 6, [PRE]).
- **TS lang-review (26 checks)**: 0 violations — COMPLIANT ([RULE] rule 7).

### Devil's Advocate
Suppose this is broken. The scariest change is `drawHud`'s new signature + band math — a
wrong `BOTTOM` could push LIVES/LEVEL off-screen or back onto the maze. Checked:
`BOTTOM = (MAZE.rows-2)*TILE_PX = 272`, baseline 'top', text ~8px → 272-280, inside the
264-287 bottom band; `hud.test.ts` pins LIVES/LEVEL at y ≥ 264 and the bleed guard forbids
24 ≤ y < 264 — and the live playtest showed them correctly placed. Could the HIGH SCORE
value lie? Only if `highScoreTable[0]` weren't the max — but `@shared/highscore` maintains
descending order and the row guard keeps scores finite; the empty case is a real 0, pinned.
Could the attract prompt strobe? It's `fillText`-only, no `fillRect`, proven by a window
test with a live negative control. Could the showcase flip drift the registry? The generated
file is byte-identical to the generator and the census is reconciled; the orchestrator
liveness gate derives live and stays green. Could the attract text leak into play? The
phase-gate was mutation-killed. The one real defect was a stale comment, now fixed. Nothing
rises to Critical or High.

**Handoff:** To SM for finish-story.

## Impact Summary

**Upstream Effects:** No upstream effects noted.
**Blocking:** None (single review round, APPROVED; 0 blocking findings).

### Rulings & deviations (all resolved)
- **AC-3 — ROM-honest empty ladder** (Conflict → ruled): Pac-Man's ROM has no default
  high-score ladder (single HIGH SCORE, RAM 4e88-4e8b powers up 0; the initials ladder is a
  centipede clone-ism). No seeded defaults; attract reads `highScoreTable[0]?.score ?? 0`.
- **AC-4 — board-clear reseed** (Question → ruled no-action): unreachable in practice;
  death-reseed loop (pm4-8) stays the sole loop. No test.
- **HUD relaid out (playtest-driven)**: a live Playwright playtest caught HIGH SCORE bleeding
  onto the playfield and lives/level missing from the bottom band. `drawHud` moved to the
  ROM-authentic layout — SCORE + HIGH SCORE top band, LIVES/LEVEL bottom band; attract overlay
  draws only PUSH START BUTTON. Public `drawHud` signature gained `highScore`. Forward impact:
  a later story may upgrade the bottom band from TEXT to authentic ICON sprites (Pac-life +
  fruit) — filed as a follow-up.
- **Two stale comments fixed forward** (game.ts:168, main.ts:8; commit 4e62e6a2).

### Verification
pac-man 366/366 · host 63/63 · orchestrator 457/457 · lint 0 errors / 0 TS2367 · registry
byte-identical to `gen:registry` · phase-gate mutation-killed · code PR #233 MERGED to develop.

## Sm Assessment

**Setup (Ruby Rhod / SM), 2026-08-11.** Cut immediately after finishing pm4-8
(its code merged as PR #224; sprint-archive rides PR #227). Board probed clean before
setup: no `origin/*pm4-9*` branch, siblings a-1 (mc10-6) and a-3 (mc6-7) are unrelated.
Dependency **pm4-8 is `done`**; the self-playing attract demo now runs, so pm4-9 is the
presentation layer over a LIVE demo, not a frozen screen.

**Premise measured, not copied.** The epic prose ("the already-built high-score ladder")
was verified against the tree before setup: the mc7 ladder LOGIC (qualifies/insert + name
entry) is genuinely already in `plugins/pac-man/src/core/game.ts` — pm4-9 delivers only the
DISPLAY of it plus a seeded DEFAULT table (mirroring mc7-4). ACs were **derived** (epic
`acceptance_criteria: null`) and banner-marked as such in both the session and context.

**Two pm4-8 forward-impacts carried into the context (Background §2):** (a) the attract maze
RESEEDS to a full board on every demo-Pac death — the presentation must not assume one
continuous run; (b) the demo loops on death but not on a board CLEAR (`game.ts:748` gated on
`playing`), a non-blocking rough edge the Reviewer explicitly deferred to pm4-9 — surfaced as
AC-4 for TEA/Dev to rule on, not pre-decided.

**Scope ruling (user, at setup).** pm4-9 INCLUDES the `showcase: false -> true` flip
(`plugins/pac-man/plugin.ts:12` + `src/host/registry.ts`), so pac-man's working demo joins
the lobby rotation — captured as AC-5 with the expected **ad1 showcase blast radius**
(registry/census/topology guards will redden until updated). Recorded as a user ruling since
the epic text doesn't mention it.

**Binding accessibility (AC-6):** no full-screen flash/strobe on attract — the boss's
photosensitive epilepsy overrides ROM fidelity (pm4-1). **ROM anchor for RED:** attract
strings/cadence at `pacman.asm:36a7`; TEA verifies that citation as its first act. Handing to
TEA (Leeloo) for RED.