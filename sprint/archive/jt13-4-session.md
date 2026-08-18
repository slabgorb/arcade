---
story_id: "jt13-4"
jira_key: "jt13-4"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-4: Replace 'press 1' prompt with click-to-enter, single player

## Story Details
- **ID:** jt13-4
- **Jira Key:** jt13-4
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/jt13-4-click-to-enter
- **PR:** https://github.com/slabgorb/arcade/pull/531 (code PR → develop)
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T09:56:30Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T02:00:57Z | 2026-08-18T02:03:00Z | 2m 3s |
| red | 2026-08-18T02:03:00Z | 2026-08-18T09:16:43Z | 7h 13m |
| green | 2026-08-18T09:16:43Z | 2026-08-18T09:33:56Z | 17m 13s |
| review | 2026-08-18T09:33:56Z | 2026-08-18T09:56:30Z | 22m 34s |
| finish | 2026-08-18T09:56:30Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Improvement, non-blocking] (TEA)** Dormant 2-player entry paths survive this
  2-point change. The keyboard `Digit1`/`Digit2` direct-start (jt11-17) and the
  1P/2P `select` coin-up (jt11-16 title→select) are left intact but unadvertised:
  the new prompt says "CLICK TO START" only. "Single player only" is satisfied for
  the CLICK gesture (the visible flow); a player mashing `Digit2` could still seed a
  2P game. Fully retiring the coin-start/select state machine (cabinet.ts `select`
  mode, `toSelect`, `readSelectInput`, `selectScreen`) is a larger change than 2
  points and is a candidate follow-up story if the owner wants the 2P path gone
  entirely.
- **[Gap, non-blocking] (TEA)** `main.ts:586` comment still quotes the old CTA
  ("PRESS 1 OR 2 TO START"). Dev should refresh that comment when changing the
  prompt or the attract-branch wiring, or the comment-line-refs / citation guards
  may flag stale prose.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Scope: surgical, not a state-machine teardown.** The story says "replace the
  'press 1'/coin-start prompt flow with click-to-enter." A literal reading could
  retire the whole coin-up/select machine; the 2-point sizing rules that out, so the
  RED contract pins only (1) the prompt text and (2) a click-to-start-single-player
  listener, leaving the keyboard/select paths dormant (see Delivery Findings). This
  is a deliberate scope bound, not the ROM — the whole story is an anti-coin-op
  descope (consistent with the "no coin-op urgency mechanics" project rule).
- **Superseded jt11-1 prompt text.** `start-experience.test.ts` AC-2 pinned
  `START_PROMPT =~ /PRESS 1 OR 2/`. jt13-4 changes that string, so that assertion was
  retargeted to the still-true invariant (exported, non-empty); the new prompt
  contract now lives in `click-to-enter-jt13-4.test.ts`. Two tests cannot assert
  contradictory text about one constant — this was required for GREEN, not optional.

### Reviewer (audit)
- **TEA: surgical scope (dormant keyboard/select paths)** → ✓ ACCEPTED by Reviewer:
  the 2-point sizing and the story headline support leaving the coin-up machine
  dormant; the dormant-2P follow-up is logged in Delivery Findings.
- **TEA: superseded jt11-1 prompt text** → ✓ ACCEPTED by Reviewer: retargeting the
  contradictory constant assertion was mandatory; the stale-text sweep (rule-checker
  #24) confirmed no other live assertion pins the retired string.
- **Click-start gate tightened (Dev `mode !== 'playing'` → entry-screen allowlist):**
  Spec said "a click starts the game directly." Dev's `!== 'playing'` guard was
  under-inclusive — it also started from 'highscore' (losing an in-flight initials
  entry) and 'gameover' (bypassing qualification). Reviewer replaced it with an
  allowlist of the idle/entry screens (attract | title | select). Severity: M.
  Fixed in-review (commit dde2a3ea), mutation-verified. Not a spec change — the
  click still "starts directly" from the screens where a player is waiting to start.

## Sm Assessment

Setup complete for jt13-4 (joust entry-screen chore). Session, branch
`feat/jt13-4-click-to-enter`, and story context are in place; story moved to
in_progress. No ROM fidelity work here — this is a UI/entry-flow change:
replace the coin-op 'press 1' prompt with click-to-enter, single-player only,
and remove the 1-button prompt text. No acceptance criteria in the sprint YAML;
TEA defines them in the RED phase. Relevant surfaces live in
`plugins/joust/src/shell/` (input/render for the entry/attract screen) — TEA to
locate the exact prompt text and start seam. Handoff to TEA for RED.

## Tea Assessment

RED complete. 7 failing tests in `plugins/joust/tests/click-to-enter-jt13-4.test.ts`,
each named for the mutant it kills; every failure is feature-missing (not a typo).
Full joust project: 7 failed / 3758 passed; `tsc --noEmit` clean. Committed as
`test(jt13-4): RED …` on `feat/jt13-4-click-to-enter`.

### Acceptance Criteria (defined by TEA — none were in the sprint YAML)
- **AC-1 — the prompt invites a click.** `attractScreen.START_PROMPT` names a CLICK
  and carries NO `PRESS 1` / `1 OR 2` / `PRESS 2` text; `layoutStartPrompt` lays out
  every glyph (one op per char — FONT57 carries C/L/I/K, verified via ORDER).
- **AC-2 — click-to-start wiring.** `main.ts` registers a
  `pointerdown`/`mousedown`/`click` listener whose (inline arrow) body begins a game
  via `enterPlaying(`.
- **AC-3 — single player only.** The click handler calls `enterPlaying(1)` and never
  `enterPlaying(2)` / `toSelect(`.
- **AC-4 — gated against restart.** The handler starts only when the cabinet is not
  `'playing'` (guard lives INSIDE the handler body, not the frame pump).

### Contract for Dev (GREEN)
1. `plugins/joust/src/shell/attractScreen.ts` — change `START_PROMPT` from
   `'PRESS 1 OR 2 TO START'` to a click instruction, e.g. `'CLICK TO START'`
   (letters+space only; all glyphs present in FONT57). Refresh the doc comment on
   the constant (it currently justifies naming the digit keys).
2. `plugins/joust/src/main.ts` — add a pointer/click listener (mirror the inline
   `keydown` handler idiom) that, when `cabinet.mode !== 'playing'`, calls
   `enterPlaying(1)`. Consider `audio.resume()` there too (a click is a user gesture)
   — not gate-required, but the natural place. Update the stale `main.ts:586` comment
   quoting the old CTA (see Delivery Findings).
3. Minimal code only — do NOT retire the keyboard/select machine (out of scope; see
   Design Deviations). The dormant 2P paths are a logged follow-up.

### Rule Coverage (typescript lang-review)
- **#15 (comment/string can't satisfy a source guard):** every `main.ts` wiring
  assertion strips line comments first (`mainCode()`); the click-handler body is
  brace-extracted from real code, so prose/strings cannot pass it.
- **#14 (an event mutating run-state must gate on that state):** AC-4 pins the
  not-`'playing'` guard INSIDE the handler body (the file-level pump guard is
  excluded by the slice), so an ungated `enterPlaying(1)` on every click reddens.
- **Test-quality self-check:** no vacuous assertions — AC-1 kills unchanged-text AND
  leftover-digit mutants; AC-3's `enterPlaying(2)`/`toSelect` negatives are the
  non-vacuity control for AC-2/AC-3's positive `enterPlaying(1)`; the silent-skip
  glyph guard (ops === length) carries over the jt11-1 lesson.

Handoff to Dev for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/shell/attractScreen.ts` — `START_PROMPT` changed from
  `'PRESS 1 OR 2 TO START'` to `'CLICK TO START'`; doc comment refreshed to explain
  click-to-enter (the browser cabinet has no physical start buttons).
- `plugins/joust/src/main.ts` — added a `canvas.addEventListener('pointerdown', …)`
  handler that calls `enterPlaying(1)` when `cabinet.mode !== 'playing'` (click-to-enter,
  single player, gated against restarting a live game); `audio.resume()` rides along
  (the click is a user gesture). Refreshed the stale attract-branch comment that quoted
  the old CTA (TEA Delivery Finding).

**Tests:** joust project 3765/3765 passing (GREEN — the 7 jt13-4 ACs + the superseded
start-experience AC-2 + the jt11-17 dormant-keyboard fence). `tsc --noEmit` clean;
`build-app.mjs joust` OK.

**Observed in play** (Playwright against a dev server on my own tree): the attract
screen renders **CLICK TO START**; a click starts a **single-player** game — one HUD
score (500) + one row of 5 lives (NSHIP), the prompt gone. The only console errors are
benign `favicon.ico` 404s, nothing from the handler. Minimal change — the dormant
keyboard/select paths were left untouched per TEA's scope ruling.

**Branch:** feat/jt13-4-click-to-enter (committed; not yet pushed)

**Handoff:** To Reviewer for code review.

### Delivery Findings (Dev)
- No upstream findings during implementation. (TEA's two findings — dormant 2P paths,
  the stale `main.ts` comment — stand; the comment is now refreshed.)

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (3766 green, tsc clean, no code smells) |
| 2 | reviewer-edge-hunter | Yes | skipped/disabled | none | hand-covered by Reviewer (see Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Yes | skipped/disabled | none | hand-covered — audio.resume() unawaited is the established seam pattern |
| 4 | reviewer-test-analyzer | Yes | skipped/disabled | none | hand-covered — corroborated the rule-checker's test-soundness finding |
| 5 | reviewer-comment-analyzer | Yes | skipped/disabled | none | hand-covered — comment updates accurate, no stale citations (full suite green) |
| 6 | reviewer-type-design | Yes | skipped/disabled | none | hand-covered — no new types; START_PROMPT stays string; enterPlaying(1) type-safe |
| 7 | reviewer-security | Yes | clean | none | N/A (no untrusted input; handler takes no event data; no DOM writes) |
| 8 | reviewer-simplifier | Yes | skipped/disabled | none | hand-covered — 2-line handler, no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 4 (2 classes) | confirmed 2, fixed in-review; 2 rows were restatements of the same instances |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled and hand-covered)
**Total findings:** 2 confirmed (both fixed in-review), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Two MEDIUM findings from the rule-checker were CONFIRMED (both mutation-verified by me)
and FIXED in-review (commit dde2a3ea) — neither is Critical/High, and no finding remains
outstanding. Preflight and security returned clean.

- [SEC] Security specialist: clean, no findings. Verified — the pointerdown handler reads
  no event payload, performs no DOM writes, touches no secrets/network; `enterPlaying(1)`
  is a hardcoded literal, and `START_PROMPT` is a developer-authored string rendered via
  font-glyph draw calls, not HTML insertion. No injection/XSS/auth surface.
- [RULE] Rule-checker: two confirmed MEDIUM findings (guard under-inclusiveness, test
  comment-strip soundness), both fixed in-review — see the table below.

**Confirmed findings (fixed in-review):**

| Severity | Tag | Issue | Location | Resolution |
|----------|-----|-------|----------|------------|
| [MEDIUM] | [RULE] | Click-start guard `mode !== 'playing'` also started from 'highscore' (abandons in-flight initials entry, bypasses commitHighScore — the one path that persists a row) and 'gameover' (bypasses afterGameOver qualification); a reflex click could silently lose a qualifying high score. | plugins/joust/src/main.ts:517 | Replaced with an entry-screen allowlist (attract \| title \| select); a new mode defaults to NOT starting. Mutation: the old guard reddens 2 AC-4 tests. |
| [MEDIUM] | [RULE] | Test `mainCode()` stripped only `//` comments and its docstring falsely claimed main.ts has no block comments (it has ~15 `/** */`); the bare "registers a listener" assertion passed against a block-comment mention with the real listener deleted. | plugins/joust/tests/click-to-enter-jt13-4.test.ts | Strip `/* */` blocks too; correct the docstring. Mutation: a block-comment-hidden listener now reddens the "registers" test. |

**Data flow traced:** canvas `pointerdown` → (no event payload read) → `enterPlaying(1)`,
gated to attract/title/select. Safe: no external input reaches the handler; the count is
a hardcoded literal `1`; the audio unlock is the same idempotent hook keydown uses.
**Pattern observed:** the new listener mirrors the existing module-scope inline `keydown`
handler (main.ts:501) — same lifetime, same shape.
**Error handling:** `audio.resume()` unawaited is the deliberate silent-degradation seam
(jt5-1); no new error paths introduced.

### Rule Compliance (typescript lang-review)
- **#1 type-safety escapes:** clean — `body!`/`layout!` follow synchronous
  `expect(...).not.toBeNull()` (throws first); casts are `as Record<string, unknown>`,
  never `as any`.
- **#5 module/`.js` extensions:** clean — dynamic `import('../src/shell/attractScreen.js')`.
- **#14 (edge computed in one branch of a state machine):** was VIOLATED (the under-inclusive
  click guard) → FIXED (allowlist).
- **#15/#17/#18/#25 (source-text guard matching a token not the claim):** was VIOLATED
  (line-comment-only strip + false docstring) → FIXED (block-comment strip + corrected doc,
  mutation-verified).
- **core/shell purity (CLAUDE.md):** clean — shell-only diff; no core import; no clock/entropy
  entered core.

### Devil's Advocate
Argue the code is broken. The strongest attack was the state-machine gate: a click is a
global event, and the original guard only excluded 'playing', so every OTHER non-play
screen — including the two that hold unsaved player data — would start a fresh game. A
player typing initials into the JOUST CHAMPIONS entry who brushes the canvas loses the row
(enterPlaying wraps a fresh createGame; the in-flight `entry` is never committed). And a
click during the ~88-tick game-over banner starts before afterGameOver runs, so a run that
would have qualified never reaches the table. That is silent data loss triggered by a
plausible reflex, and it was fixed. Next attack: does the click even fire? Source-scan
tests can't prove a listener runs — but Dev observed it in a real browser (attract →
CLICK TO START → single-player game with one HUD/5 lives), and I re-verified the listener
is attached to the mounted `canvas` in module scope with all bindings (`cabinet`, `audio`,
`enterPlaying`) in scope. Next: could the allowlist strand a player at gameover with no way
to replay? No — gameover auto-routes (attract or highscore) within ~88 ticks, after which
the click works; the qualification path is preserved, which is the point. Next: font
coverage — 'CLICK TO START' uses C/L/I/K/T/O/S/A/R + space, all present in FONT57's ORDER,
and the ops===length guard would redden on a dropped glyph; visually confirmed rendering.
Next: listener leak — the pointerdown listener is never removed, but it is app-lifetime and
matches the existing keydown/pagehide listeners; no leak in an SPA whose canvas lives for
the app's life. Next: the dormant keyboard Digit2→2P path still exists — but it is
unadvertised and out of the 2-point scope, logged as a follow-up. No further defects found.

**Handoff:** To SM for finish-story.