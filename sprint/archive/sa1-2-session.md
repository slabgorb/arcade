---
story_id: "sa1-2"
jira_key: "sa1-2"
epic: "sa1"
workflow: "tdd"
---
# Story sa1-2: Consistent ESC pause overlay with per-game localized graphics

## Story Details
- **ID:** sa1-2
- **Jira Key:** sa1-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/sa1-2-consistent-esc-pause-overlay-per-game-graphics
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-08-21T12:03:57Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-21T11:24:11Z | 2026-08-21T11:26:00Z | 1m 49s |
| red | 2026-08-21T11:26:00Z | 2026-08-21T11:32:16Z | 6m 16s |
| green | 2026-08-21T11:32:16Z | 2026-08-21T12:03:57Z | 31m 41s |
| review | 2026-08-21T12:03:57Z | - | - |

## Story Acceptance Criteria

1. **Shared pause overlay mechanism is generalized:**
   - `@shared/esc-overlay` already accepts per-cabinet parameters (lines, color, opacity)
   - `@shared/pause` provides the pure VERB (toggle, freeze, keydown detection)
   - The architecture is complete; games only need to supply their own NUMBERS

2. **Each game defines its own pause card:**
   - Every game that has pause (battlezone, missile-command) + games without pause yet (all others) define PAUSE_LINES (the card text), PAUSE_COLOR (glow hue), and PAUSE_DIM (dim alpha)
   - Each game's shell/render.ts exports a drawPauseOverlay wrapper that calls drawEscOverlay with game-specific parameters

3. **Pause overlay is consistently wired in every game:**
   - Games that already have pause (battlezone, missile-command) keep their existing NUMBERS; others adopt pause with game-appropriate values
   - All games call drawPauseOverlay at the same point in their render pipeline (when paused, after sim but before returning frame)

4. **Tests confirm per-game adoption:**
   - Each game's pause-adoption.test.ts (like asteroids/tests/pause-adoption.test.ts) verifies:
     - A game module imports @shared/pause
     - A game module imports @shared/esc-overlay
     - Both exports are present and correct

5. **No game shows battlezone pause art:**
   - Visual verification: run each game, press ESC, verify the pause card matches that game's aesthetic (not battlezone's)

## Technical Approach

**Architecture Status (already completed in SH2-12):**
- `@shared/esc-overlay::drawEscOverlay` is fully generic: it takes EscOverlayOptions (lines, color, opacity)
- `@shared/pause` is pure and DOM-free: provides toggle logic and the stepUnlessPaused frame gate
- The MECHANISM is shared; the NUMBERS (card, color, opacity) are per-cabinet

**Implementation Plan:**
1. **Audit & standardize existing games** (battlezone, missile-command):
   - Confirm PAUSE_LINES, PAUSE_COLOR, PAUSE_DIM are already per-game
   - Document the values so new games can follow the same shape

2. **Add pause to all remaining games** (tempest, star-wars, asteroids, centipede, joust, pac-man, defender, red-baron, millipede):
   - For each game:
     - Add pause import at shell/render.ts: `import { drawEscOverlay } from '@shared/esc-overlay'`
     - Import @shared/pause at shell main loop
     - Define PAUSE_LINES (game-specific card text: e.g. "PAUSED", game name, "ESC TO RESUME"), PAUSE_COLOR (game's signature hue), PAUSE_DIM (0.72 or tuned per game)
     - Export drawPauseOverlay wrapper calling drawEscOverlay with game parameters
     - Wire pause toggle and drawPauseOverlay into the render/step loop (mirroring battlezone/missile-command pattern)

3. **Verify wiring patterns per game type:**
   - **Vector games** (tempest, star-wars, asteroids, battlezone, red-baron): Pause halts vector drawing, dims the field, overlays the card
   - **Raster games** (missile-command, centipede, pac-man, joust, defender, millipede): Pause halts sprite animation, dims the playfield, overlays the card

4. **Handle game-specific pause cards:**
   - Tempest: "PAUSED" + game name (e.g. "TEMPEST")
   - Star-Wars: Star-Wars–styled text (check CLAUDE.md for star-wars strict comment-ref guards)
   - Asteroids: "PAUSED" + game name
   - Each raster game: game name + "PAUSED" + "ESC TO RESUME"

5. **Test each adoption** with pause-adoption.test.ts pattern (already used by asteroids):
   - Verify @shared/pause is imported
   - Verify @shared/esc-overlay is imported
   - Verify exports are present

6. **Run manual playtest** (post-implementation):
   - Every game on arcade.slabgorb.com or dev server
   - Press ESC, verify pause card matches game aesthetic (NOT battlezone)
   - Verify pause freezes the game state
   - Verify ESC again resumes

## Delivery Findings

**Upstream Findings:** None

**Risk Areas:**
- **Comment-ref guards** (star-wars, joust, missile-command have strict guards per CLAUDE.md):
  - star-wars: any bare `<file>:<line>` in comments reddens tree; must path-qualify
  - joust: forbids `<file>.ts:line` refs in test comments; use symbols or ROM citations
  - missile-command: W3MAIN cites are logical ordinals; verify correct order before citing
- **Core/Shell purity:** @shared/pause is pure (no DOM); @shared/esc-overlay is browser-side and exempt; each game's drawPauseOverlay is shell-only; new pause wiring stays in shell
- **Vector vs. raster render paths:** Ensure pause dim is applied correctly in each render style (vector strokes vs. raster pixel composites)

## SM Assessment

**Story is ready for RED.** Clean start: 3 pts, tdd (phased), p2, no `depends_on`, merge gate clear, `develop` in sync, branch `feat/sa1-2-consistent-esc-pause-overlay-per-game-graphics` cut from develop, session + story/epic context created.

**Load-bearing premise-check for TEA — resolve BEFORE writing RED tests:**
The story's bug report says *"currently shows battlezone for all."* The setup research concluded the shared `@shared/esc-overlay` / `@shared/pause` are already fully generic with *"no shared hardcoding of battlezone graphics,"* and that battlezone + missile-command already adopt a per-game pattern. **These two statements are in tension.** One of the following is true, and TEA must confirm which by reading the actual shared source and each game's current pause wiring — not by trusting the setup summary:
  - (a) Un-adopted games fall through to a battlezone-flavored default baked into the shared overlay (or a shared constant) → RED tests assert each game supplies its OWN card and that no un-adopted game renders battlezone's values.
  - (b) The shared code is genuinely neutral and the "battlezone for all" report is stale / describes only the games that copy-pasted battlezone's constants → RED scope narrows to per-game adoption of distinct constants.
  The RED tests must encode whichever is the real current behavior; write the test that FAILS against today's code, per rom-always-wins / evidence-first. Grep the real files (`src/shared/esc-overlay*`, each `plugins/<id>/src/shell/`) before asserting.

**Scope reality:** this is a fleet-wide change (up to 11 games). Per-game adoption tests (the `pause-adoption.test.ts` shape) plus the comment-ref guards on star-wars / joust / missile-command are the main risk surface — RED tests in those games must path-qualify / use symbol refs, not bare `<file>.ts:line`.

**Routing:** phased tdd → hand off to TEA (Leeloo) for RED.

## TEA Assessment (RED complete)

**RED state CONFIRMED:** exactly 8 failures — the two adoption assertions × 4 games — everything else green (7158 passing, joust `comment-line-refs` guard green, zero collateral). Committed as `96d70526`.

### PREMISE CORRECTION for Dev — read before implementing
I verified the story's headline against the actual source. **"Currently shows battlezone for all" is STALE and false.** Evidence:
- `src/shared/esc-overlay.ts` bakes in **no** battlezone constant — it is the generic VERB (dim + centred card via the shared font); LINES/COLOUR/OPACITY are per-cabinet NUMBERS the caller passes (SH2-12 verb/numbers split).
- **7 of 11 games already adopt** it, each with its OWN distinct card + colour: tempest `#39ff14`, star-wars `#00e600`, asteroids `#ffffff`, battlezone `GLOW_GREEN`, red-baron `#33ff66`, centipede `#f4f4f4`, missile-command `#fff`. None reuse battlezone's card.
- **The real gap is the 4 games that adopt NOTHING** — no pause overlay at all: **millipede, defender, joust, pac-man**. That is the scope this story closes.

So the deliverable is NOT "de-hardcode a shared battlezone default" (there is none). It is: **wire the 4 gap games onto the existing shared pattern, each supplying its own localized card.**

### What Dev must do (GREEN)
For each of millipede, defender, joust, pac-man, mirror an existing adopter (asteroids `plugins/asteroids/src/main.ts` is the cleanest reference):
1. `import { INITIAL_PAUSED, isPauseKey } from '@shared/pause'` and `import { drawEscOverlay } from '@shared/esc-overlay'`.
2. Install the Escape toggle (the adopters use an `installPauseToggle(window, isPauseKey, INITIAL_PAUSED)` helper) and gate the sim step with `stepUnlessPaused` (or the game's local paused-frame gate).
3. Define the game's OWN card constant: `lines` (e.g. `['PAUSED', '', 'ESC  RESUME', …]`), `color` = that cabinet's signature hue (**NOT** battlezone `GLOW_GREEN` — AC-5), `opacity: 0.72` (the fleet-standard dim).
4. In the rAF/render loop, `if (paused) drawEscOverlay(ctx, W, H, THIS_GAME_PAUSE)` after the frozen scene.

The 4 RED files only pin steps 1–2 automatically (import presence + shared resolution). **Steps 3–4 and the "card matches the cabinet, not battlezone" look are AC-5 — a MANUAL playtest** (the standing "shell IO is verified by running the game" convention; the automated seam is intentionally import+resolution, exactly as the 5 existing adoption tests do). Dev must run each of the 4 games (`just serve`, press ESC) and confirm freeze + resume + a game-appropriate card.

### Risk flags for Dev
- **joust:** the `comment-line-refs` guard forbids contiguous `<name>.ts:<line>` refs in joust test comments — if you add/edit joust tests, cite symbols only. Also joust has attract-demo/fingerprint tests keyed on sim behaviour; pause wiring is **shell-only** and must not touch `core/` — keep it out of the sim so no fingerprint cascades.
- **Purity:** `@shared/pause` is pure; the wiring (toggle install, drawEscOverlay call) is shell/main only. Don't import esc-overlay into any `core/`.
- **pac-man / defender / millipede** render through `src/main.ts` (their shell entry) — wire there.

### Rule Coverage (lang-review typescript.md)
- **#8 test quality / #15 token-vs-claim / #18 apparatus fails-by-passing:** the adoption assertion (`importersOf(@shared/pause).not.toHaveLength(0)`) is load-bearing and mutation-proven — it is RED against today's tree and can only go green when a genuine import line is added; it is the identical idiom the 5 shipped adopter tests use. The resolution tests assert real behaviour (the thunk gate returns the prior reference and never calls `step` when paused), not a bare token match.
- **AC-5 (visual, "not battlezone art"):** deliberately manual per the fleet's shell-IO convention — no vacuous static color assertion invented, so Dev is not boxed into a specific hue before choosing it.

**Routing:** phased tdd → hand off to Dev (Korben) for GREEN.

## Dev Delivery Findings (GREEN complete)

**Commits:** RED `96d70526`, GREEN `0ba5b1a9` on `feat/sa1-2-...`.
**Full fleet:** `npm run lint` PASS; `npx vitest run` → 1255 files, 18368 passed, 1 todo, 0 fail.

**What shipped:** the 4 gap games (millipede, defender, joust, pac-man) now adopt `@shared/pause` + `@shared/esc-overlay`, each with its OWN card + colour:
- pac-man `#ffff00` (banner yellow) · defender `#5ad1ff` (scanner cyan) · millipede `#7bff5a` (green) · joust P1-yellow COLOR1 register (index 5), built as an `rgb(${...})` template from the transcribed palette so the joust render denylist (`render.test.ts` AC-2, scans main.ts) stays green.
- Each: `installPauseToggle(window, isPauseKey, INITIAL_PAUSED)`; the fixed-step pump is skipped while paused (frame clock kept current → paused wall-time discarded, no catch-up burst); `drawEscOverlay` dims the frozen frame + strokes the card.

**Premise resolution (confirms SM/TEA):** "battlezone for all" is STALE. Shared code bakes in no battlezone constant; the other 7 games already adopt with distinct cards. The real gap was these 4 having NO pause overlay at all.

**Two in-flight fixes (not deferred):**
1. My defender adoption broke `df3-6-boot-shell.test.ts`: its harness dispatched keyless synthetic keydowns, and the new pause consumer reads `e.key`. Fixed the HARNESS (`boot-shell.ts` now derives a realistic `key` from `code`, matching the real DOM) rather than adding an unreachable null-guard to the shared verb (real/jsdom events always carry `key`; only that hand-rolled stub omitted it — a guard would be dead code the simplifier/lang-review #15/#18 would flag).
2. Corrected my own inconsistency: joust initially froze/overlaid only in `mode==='playing'`; changed to pause in ANY phase, matching the fleet convention (asteroids et al. + my other 3).

**Visual verification (AC-5, dev server via Playwright, this working tree on :5290):** pac-man, joust, millipede, defender all dim + show their own localized card on ESC (screenshots); pac-man freeze proven programmatically (animating → byte-identical frames post-ESC); tempest spot-checked as a working pre-existing adopter.

**For Reviewer — consistency note (not a defect):** the shared `drawEscOverlay` centres each card line at `w/2` and sizes glyphs by `min(w,h)*0.05`, so on an ultra-wide window the two-column keybind lines spread far apart. This is the EXISTING fleet behaviour (all 7 prior adopters do the same), so it is consistent, not a regression introduced here.

## Reviewer Verdict (Zorg) — APPROVED (after fixes)

Six lenses ran in parallel (preflight, edge-hunter, test-analyzer, comment-analyzer, simplifier, rule-checker). The edge-hunter earned the review: it found **three real freeze bugs** the initial pass missed. All actionable findings fixed + committed (`acf92537`); full fleet re-verified green (lint clean, `npx vitest run` → 1255 files / 18368 passed / 0 fail).

**Confirmed defects — FIXED:**
- **millipede (HIGH, functional):** the generic keydown handler ran `startPlay()` for ANY non-entry key incl. Escape → toggling pause on attract latched `startPending` → booted an unrequested game on resume. Fixed: Escape returns early before `startPlay`/fire. **Live-verified:** ESC keeps attract in `attract`; Enter still → `play`.
- **pac-man (MED, freeze):** `overlays.draw` aged score popups (`framesLeft--`) every rAF outside the pause guard → a popup vanished mid-pause. Fixed: `draw(ctx, game, paused)` paints frozen, no decrement while paused.
- **joust (MED, freeze):** MARQUE `titleFrame++` in the draw path → title colour-cycled under the paused overlay. Fixed: gated on `!pause.isPaused()`.
- **joust (comment):** stale "only PLAYING freezes" install-site comment contradicted the actual freeze-anytime gate. Corrected.
- **un-braced-if hazard (pac-man/millipede/joust):** the multiline-pump guards are now braced.
- **vacuous import assertion (test rigor):** the adoption regex matched ANY quoted `@shared/pause` (a commented/dead import false-passed — mutation-proven by test-analyzer). Anchored to a line starting with `import … from`; **re-mutation-proven** the commented import now reddens.

**Findings adjudicated, NOT changed (with rationale):**
- **`as unknown as SharedPauseModule` (rule-checker #1, 8×):** downgraded to LOW. This is the *required* bridge — `import('@shared/pause')` resolves to the real typed module namespace, and converting it to the hand-written structural `SharedPauseModule` interface needs the `unknown` intermediate (a single `as` fails to compile between non-overlapping types). Interfaces are mutation-verified to match the real exports (the thunk-gate test exercises the real fn), and it's the identical fleet idiom (asteroids SH2-14). Not a type-safety escape hiding a bug.
- **test-file duplication (simplifier #4, 9 files):** deferred as a follow-up. The duplication predates sa1-2 (5 of 9 files shipped in SH2-12/14); extracting a shared `definePauseAdoptionTests` factory is a separate fleet-wide refactor, out of this story's scope.

**Recommended follow-ups (new stories, not blockers):** (1) extract the shared pause-adoption test factory and align all 9 files' import regex to the anchored form; (2) consider unifying the fleet's pause-freeze idioms (stepUnlessPaused vs run-pump-early-return vs skip-pump) — currently a documented mix.

## Design Deviations

(No deviations logged yet.)