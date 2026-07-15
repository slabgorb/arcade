---
story_id: "sw7-3"
jira_key: "sw7-3"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-3: R3 Text and board authenticity — PULL TRIGGER TO START, PRINCESS LEIAS REBEL FORCE, SHOOT YOUR INITIALS, the seeded OBI/WAN/HAN board, comma-grouped scores

## Story Details
- **ID:** sw7-3
- **Jira Key:** sw7-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T19:43:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T18:46:00Z | 2026-07-15T18:47:58Z | 1m 58s |
| red | 2026-07-15T18:47:58Z | 2026-07-15T19:12:14Z | 24m 16s |
| green | 2026-07-15T19:12:14Z | 2026-07-15T19:27:53Z | 15m 39s |
| review | 2026-07-15T19:27:53Z | 2026-07-15T19:43:59Z | 16m 6s |
| finish | 2026-07-15T19:43:59Z | - | - |

## Story Context

**Points:** 3  
**Type:** bug  
**Priority:** p2  
**Repository:** star-wars  
**Branch:** feat/sw7-3-text-board-authenticity  
**Branch Strategy:** gitflow (feat/sw7-3-text-board-authenticity)

### Acceptance Criteria

This story subsumes ROM-fidelity findings H-010, H-011, H-012, H-015 (BCD-decoded seed high-score board: OBI 1,285,353 ... RLM 380,655), H-020 (two-site formatScore fix at render.ts — game-over screen AND high-score board).

Optional rider H-024: shield-gauge color ramp — palette fully specified by refutation (green 5-9 / yellow 3-4 / red 1-2, plus #0FF cyan refuel flash).

**CRITICAL WARNING from refutation:** there is NO "<REBEL FORCE>" string in the ROM — the board title is "PRINCESS LEIA'S REBEL FORCE" produced via .NEXTMESS repositioning. Do not introduce a bare "REBEL FORCE" string.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): the shared VGMSGA font (`@arcade/shared/font`) has NO apostrophe glyph — `GLYPH_CHARS` is `" 0123456789A-Z-,/_"` and `charGlyph` degrades `'` to a blank space — so the ROM board title `PRINCESS LEIA'S REBEL FORCE` (TCMES.MAC:605) cannot render its apostrophe in-scope. Affects `@arcade/shared/font` (adding an apostrophe/tick glyph is a cross-repo, version-bump change — out of scope for this star-wars-only story) and any future SW screen quoting apostrophised ROM text. The RED title test is apostrophe-tolerant (`/^PRINCESS LEIA'?S REBEL FORCE$/`) to avoid forcing an unrenderable char. *Found by TEA during test design.*
- **Improvement** (non-blocking): H-024 (shield-gauge colour ramp) is deferred as the optional rider. Decoded TGCLR palette is green (`S.GAS` 5-9) / yellow (3-4) / red (1-2) / off (0) with a `#0FF` refuel flash while `S.CAN>0`, but our `STARTING_LIVES = 6` differs from the ROM's 0-9 `S.GAS` energy scale, so the bands need an explicit 6→9 mapping decision. Affects `src/shell/render.ts` (`HUD_SHIELD_COLOR` → a per-shield-count ramp) and warrants a dedicated sw7 follow-up story. *Found by TEA during test design.*

### Dev (implementation)

- **Confirmed** (non-blocking): the shared-font apostrophe gap TEA flagged is real in play — `"PRINCESS LEIA'S REBEL FORCE"` renders as `PRINCESS LEIA S REBEL FORCE` (the `'` degrades to a blank). The authentic apostrophe'd string is kept in `src/shell/render.ts` so it renders correctly once the glyph lands; the achievable-clean alternative would be dropping the apostrophe. A cross-repo `@arcade/shared/font` follow-up (add the tick glyph) resolves it. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the seeded board now always shows 10 rows on the attract + game-over screens (previously usually `NO SCORES YET`), starting at `h*0.5+30` with 24px spacing. Layout fit is an eyeball item for the verify/review phase per the repo's shell-verified-by-running-game convention. Affects `src/shell/render.ts` (`drawHighScoreBoard` vertical extent). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): the H-015 seeding WIRE at `src/main.ts:68` is untested — a subagent mutation reverting it to plain `highScoreStorage.load()` left all 1247 tests green. The repo already has the pattern to close this (`main.ts?raw` source-scan, as in `tests/shell/music-channel.test.ts` / `audio.test.ts` / `font-migration.test.ts`). Affects `tests/shell/` (add a raw-source assertion that `seedDefaultHighScores(` wraps the `highScoreStorage.load()` initializer). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the seed reaches the cross-origin publish path — once a player earns a qualifying score, `highScoreStorage.save()` → `publishTop(topScoreOf=max)` advertises a ROM seed score (up to 1,285,353) the player never earned to the lobby cookie, and there's a fresh-install window where the in-game board (seeded in-memory) and the lobby (empty until first save) disagree. Affects `src/main.ts` (decide: persist the seed at boot so the lobby mirrors the authentic board, OR keep the seed display-only and never round-trip it through `save()`); a design call about whether the lobby shows authentic-cabinet vs player-earned scores. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): board-render tests use a synthetic 2-row fixture, never the real 10-row `DEFAULT_HIGH_SCORES`; truncating `drawHighScoreBoard`'s loop to 3 rows leaves all sw7-3 tests green. Affects `tests/shell/render.rebel-force-board.test.ts` (add one assertion rendering all 10 seeded rows and confirming a middle entry like `JED`/`NLA` appears). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Deferred the optional H-024 shield-gauge colour ramp (test omission)**
  - Spec source: context-story-sw7-3.md, "Optional rider H-024"; sprint/epic-sw7.yaml sw7-3
  - Spec text: "Optional rider H-024: shield-gauge color ramp — palette fully specified by refutation (green 5-9 / yellow 3-4 / red 1-2, plus #0FF cyan refuel flash)."
  - Implementation: No tests written for the shield colour ramp; the required ACs (H-010/011/012/015/020) are fully covered.
  - Rationale: the ROM palette keys on `S.GAS` (0-9) but our `STARTING_LIVES=6`, so the bands need a scale-mapping decision that is a shield-model concern orthogonal to this text/board story; the finding itself recommends "accept".
  - Severity: minor
  - Forward impact: minor — raised as a Delivery Finding for a dedicated sw7 follow-up (3-hue ramp + refuel flash with an explicit 6→9 mapping).
- **Re-seated four SH2-5 sibling assertions in font-text-seam.test.ts to the new contract**
  - Spec source: tests/shell/font-text-seam.test.ts (SH2-5 layoutText seam suite)
  - Spec text: "expect(texts()).toContain('PRESS START')" / "toContain('HIGH SCORES')" / "toContain('SCORE 2500')"
  - Implementation: updated those fixtures to the sw7-3 contract (`PULL TRIGGER TO START` ×2, `PRINCESS LEIA['S] REBEL FORCE`, `SCORE ${formatScore(2500)}`); the suite's intent (text flows through the layoutText seam) is preserved.
  - Rationale: the story changes the framing strings, so leaving SH2-5's old-string fixtures would flip them RED after GREEN with no way for Dev to fix them — TEA owns test maintenance.
  - Severity: minor
  - Forward impact: none
- **The board-title assertion accepts LEIA'S or LEIAS (apostrophe-tolerant)**
  - Spec source: context-story-sw7-3.md, H-011; TCMES.MAC:605
  - Spec text: "the board title is PRINCESS LEIA'S REBEL FORCE"
  - Implementation: the RED test matches `/^PRINCESS LEIA'?S REBEL FORCE$/` rather than pinning the exact apostrophe'd string.
  - Rationale: the shared VGMSGA font has no apostrophe glyph (degrades `'` to a blank), so the apostrophe cannot render in-scope; the tolerant pin still forbids `HIGH SCORES` and a bare `REBEL FORCE` while not forcing an unrenderable char.
  - Severity: minor
  - Forward impact: none — font-glyph gap raised as a Delivery Finding.
- **Seed entries' `wave` field value is not pinned**
  - Spec source: TCHSCR.MAC:718-738 (INTINT/INTSCR); context-story-sw7-3.md H-015
  - Spec text: "BCD-decoded seed high-score board: OBI 1,285,353 ... RLM 380,655"
  - Implementation: the RED tests pin each seed entry's (name, score) exactly and require a numeric `wave` (via the shared row guard), but do NOT pin the wave value.
  - Rationale: the ROM hi-score table stores no per-entry wave; our `HighScoreEntry<'wave'>` schema requires one, so the seed wave is a clone artifact Dev supplies — pinning an invented value would be false fidelity.
  - Severity: minor
  - Forward impact: none

### Dev (implementation)

- **Seed entries use `wave: 0` as the "no real run" placeholder**
  - Spec source: .session TEA deviation "Seed entries' wave field value is not pinned"; TCHSCR.MAC:718-738
  - Spec text: "the seed wave is a clone artifact Dev supplies"
  - Implementation: every `DEFAULT_HIGH_SCORES` entry carries `wave: 0` (a "seeded default, never played" sentinel).
  - Rationale: the ROM board stores no per-entry wave; 0 reads as "not a real run" without inventing a fake one.
  - Severity: minor
  - Forward impact: minor — sw7-10 (attract mode) renders the board and will show `WAVE 0` for the seeded rows.
- **Reconciled audit citations broken by the code edits (remediated_by + reanchor)**
  - Spec source: tests/audit/citations.test.ts (the audit-citation gate)
  - Spec text: "every committed findings file cites real source lines"
  - Implementation: marked H-010/011/012/015/020 `remediated_by: "sw7-3"` (freezes their `ours` citation as history) and ran `tools/audit/reanchor-citations.mjs --write` to relocate the citations my line-shifts moved (H-007/013/014, U-003, T-001/003). Verified by semantic diff: the only field changes are the 5 `remediated_by` marks + 6 `ours.line` moves — no citation content clobbered. `pair-hud.json` normalized to the plain-canonical format the other 8 findings files already use.
  - Rationale: fixing the divergences necessarily changes the cited lines; the sanctioned reconcile keeps the audit gate honest without hand-editing quotes.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)

- **Deferred H-024 shield ramp** → ✓ ACCEPTED by Reviewer: sound — `STARTING_LIVES=6` ≠ the ROM's 0-9 `S.GAS` scale, and the finding itself recommends "accept"; genuinely orthogonal to a text/board story.
- **Re-seated 4 SH2-5 sibling assertions** → ✓ ACCEPTED by Reviewer: correct TEA test-maintenance; the re-seats go red on old code and green after the fix, preserving the suite's seam intent. Verified the only sibling pinning the old strings was `font-text-seam.test.ts`.
- **Apostrophe-tolerant title assertion** → ✓ ACCEPTED by Reviewer: confirmed the shared font has no apostrophe glyph (`charGlyph` degrades `'` to a blank); the tolerant regex still forbids `HIGH SCORES`/bare `REBEL FORCE`.
- **Seed `wave` not pinned** → ✓ ACCEPTED by Reviewer: `TCMES`/`TCHSCR` store no per-entry wave; pinning an invented value would be false fidelity.
- **Seed entries use `wave: 0`** → ✓ ACCEPTED by Reviewer: a reasonable "no real run" sentinel; the `WAVE 0` display on seeded rows is cosmetic and forward-noted for sw7-10.
- **Citation reconcile (remediated_by + reanchor)** → ✓ ACCEPTED by Reviewer: independently verified via semantic diff vs `develop` — only `remediated_by=sw7-3` (×5) and `ours.line` moves (×6); no claim/verbatim/reasoning altered; `pair-hud.json` normalized to the plain-canonical format the other 8 findings files already use. Not laundering.

## TEA Assessment

**Tests Required:** Yes
**Reason:** N/A — string/data content changes with clean, identifiable seams.

**Test Files:**
- `tests/core/default-high-scores.test.ts` — H-015: the seeded default board (`DEFAULT_HIGH_SCORES` + `seedDefaultHighScores`) — pure-core data fidelity + the DOINTS-on-reset seam. **8 tests.**
- `tests/shell/render.rebel-force-board.test.ts` — H-011 board title (PRINCESS LEIA['S] REBEL FORCE, not HIGH SCORES, not bare REBEL FORCE) + H-020 board comma-grouping, at the layoutText seam. **5 tests.**
- `tests/shell/render.framing-prompts.test.ts` — H-010 PULL TRIGGER TO START (attract + game-over sites), H-012 SHOOT YOUR INITIALS, H-020 comma-grouped game-over score. **4 tests.**
- `tests/shell/font-text-seam.test.ts` — **re-seated** 4 SH2-5 sibling assertions to the new contract (2 it-blocks).

**Tests Written:** 17 new + 4 re-seated assertions, covering H-010, H-011, H-012, H-015, H-020.
**Status:** RED — full suite `10 failed | 1229 passed` (105 files); every one of the 10 failures is an intended sw7-3 assertion, **zero collateral** to the other 101 files.

### RED breakdown (what Dev must turn green)
- `default-high-scores.test.ts` → fails on `Cannot find module '../../src/core/highScores'` — Dev creates the module (`DEFAULT_HIGH_SCORES` pure data + `seedDefaultHighScores(loaded)`).
- `render.rebel-force-board.test.ts` → 4 fail (title, no HIGH SCORES, comma group, no raw). The 1 pass is the **bare-REBEL-FORCE guard** — green now by design, bites if Dev falls into the `.NEXTMESS` fabrication trap.
- `render.framing-prompts.test.ts` → all 4 fail.
- `font-text-seam.test.ts` → the 2 re-seated blocks fail; the other 8 SH2-5 seam tests stay green.

### Implementation notes for Dev (GREEN) — not tested here, verify by running the game
- `src/core/highScores.ts` (new): `DEFAULT_HIGH_SCORES` = the 10 BCD-decoded ROM entries (OBI 1,285,353 … RLM 380,655, descending), each a valid `HighScoreEntry<'wave'>` (supply a numeric `wave` placeholder — value not pinned). `seedDefaultHighScores(loaded)` returns the defaults on `[]`, the loaded table unchanged otherwise.
- `src/main.ts`: seed the storage — `let highScores = seedDefaultHighScores(highScoreStorage.load())` (and `save` the seed like DOINTS writes NOVRAM). This is the shell wire (verified by running the game); the pure seam is tested in core.
- `src/shell/render.ts`: swap `HIGH SCORES`→`PRINCESS LEIA'S REBEL FORCE` (drawHighScoreBoard:1034), `PRESS START`→`PULL TRIGGER TO START` (drawAttract:993, drawGameOver:1020), `ENTER YOUR INITIALS`→`SHOOT YOUR INITIALS` (drawGameOver:1015), and route both bypassed sites through `formatScore` (game-over `SCORE`:1009, board `pts`:1044). `formatScore` is already imported.
- **Do NOT** introduce a bare `REBEL FORCE` string (the `.NEXTMESS` RF1 only re-centres the same title). **Do NOT** touch `src/core` sim logic — this is a render/data story.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) / Status |
|------|---------|
| #8 Test quality — meaningful assertions, no vacuous | Self-checked: every test asserts a concrete string/value; guards proven live (bare-REBEL-FORCE bites the `.NEXTMESS` trap; BCD-not-hex refutes `0x01285353`; non-empty-board guard refutes the Design-B fallback). |
| #8 Test quality — no `dist/` imports | Tests import from `src/` and the `@arcade/shared` package entry (not `dist/`), matching the repo's render-test convention. |
| #4 Null/undefined (`??` vs `\|\|`, valid falsy) | seed-guard test forces well-formed rows; score/`0` handled by the pre-existing `formatScore`. |

**Rules checked:** the test-writable lang-review checks (#8 test quality; #4 null-handling at the data seam) have coverage. The structural type-safety checks (#1–#3, #5–#7, #9) apply to Dev's GREEN code and are the Reviewer's diff-time concern — there is no code to test them against pre-GREEN.
**Self-check:** 0 vacuous tests. The one always-green assertion (bare-REBEL-FORCE) is a deliberate live guard, not scenery — it fails if Dev draws a lone `REBEL FORCE`.

**Handoff:** To Dev (The Word Burgers) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/highScores.ts` (new) — `DEFAULT_HIGH_SCORES` (10 BCD-decoded ROM entries, highest first) + `seedDefaultHighScores(loaded)` (DOINTS-on-reset: seed only an empty board). [H-015]
- `src/main.ts` — seed the high-score storage on load: `seedDefaultHighScores(highScoreStorage.load())`. [H-015 wiring]
- `src/shell/render.ts` — `PULL TRIGGER TO START` ×2 [H-010], `SHOOT YOUR INITIALS` [H-012], board title `PRINCESS LEIA'S REBEL FORCE` [H-011], game-over + board scores via `formatScore` [H-020].
- `docs/audit/findings/pair-hud.json`, `pair-audio.json`, `pair-timing.json` — citation reconcile (5 `remediated_by=sw7-3` + 6 `ours.line` reanchors; pair-hud normalized to canonical format).

**Tests:** full suite `1247 passed (105 files)` — GREEN. The 4 sw7-3 files (27 tests) pass; the audit-citation gate (12 tests) restored to green.
**Build:** `tsc --noEmit && vite build` passes.
**Branch:** `feat/sw7-3-text-board-authenticity` (pushed).

**Not unit-tested (eyeball items for verify/review, per shell-verified-by-running-game):**
- main.ts seeding wire (fresh cabinet → 10 default rows on attract/game-over).
- The `PRINCESS LEIA'S REBEL FORCE` apostrophe renders as a blank (font gap — Delivery Finding).
- The 10-row board's vertical fit on the framing screens.

**Deferred:** H-024 shield-gauge colour ramp (optional rider — see Delivery Findings for the scale-mapping caveat).

**Handoff:** To next phase (verify).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: 1247 pass, tsc clean, build ok, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 6 (all Low/Medium), dismissed 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (Medium, non-blocking) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (Low, latent) |

**All received:** Yes (4 enabled ran, 5 disabled via settings)
**Total findings:** 9 confirmed (all Medium/Low, none blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is correct and ROM-faithful. I independently re-derived the seed board from primary source (`TCHSCR.MAC:718-738`, node decode) and the message strings from `TCMES.MAC` — every value matches. No Critical/High issue exists; all nine confirmed findings are Medium/Low test-coverage and hardening improvements, recorded as non-blocking Delivery Findings.

**Observations (confirmed findings tagged by source):**
- [SEC] Medium — Cross-origin publish of a seed score: once a player earns a qualifying score, `highScoreStorage.save()` → `publishTop(topScoreOf=max)` advertises a ROM seed (up to 1,285,353) the player never earned to the lobby cookie (`src/main.ts:68` seed → shared `topScoreOf` at `highscore.js:275`). Non-blocking: the in-game board (this story's scope) legitimately shows the seeds and the cookie *mirrors* the board, so the lib's invariant holds; the real wrinkle is a self-healing fresh-install window. Design follow-up filed.
- [TEST] Medium — The H-015 seeding wire (`src/main.ts:68`) is untested: reverting it leaves 1247 tests green. Repo has the `main.ts?raw` pattern to close it. Follow-up filed.
- [TEST] Low/Medium — Board-render tests use a 2-row fixture, never the real 10-row `DEFAULT_HIGH_SCORES`; truncating the loop to 3 rows stays green. Follow-up filed.
- [TEST] Low — `tests/core/default-high-scores.test.ts:65` `.not.toBe(0x01285353)` is redundant given the exact `.toBe(1_285_353)` above it (rule #8: adds no independent detection power). Confirmed, not dismissed; low severity because line 64 still catches the real bug.
- [TEST] Low — The bare-`REBEL FORCE` guard (`render.rebel-force-board.test.ts:104`) has narrow unique value (it only bites the "full title PLUS a separate bare string" case, which no test renders); the armed-entry render path is unexercised.
- [RULE] Low — `seedDefaultHighScores(loaded)` param isn't `readonly`, departing from the shared lib's `readonly E[]` convention (matches local render.ts style, though).
- [RULE] Low — `[...DEFAULT_HIGH_SCORES]` shallow-copies; entries are shared refs, so a future caller mutating an entry field would corrupt the module constant (latent — no live mutator; recover via `map(e => ({...e}))` or `readonly`/freeze).
- [VERIFIED] Seed board faithful — independent node decode of `TCHSCR.MAC:718-738` (INTINT hex letter-indices + INTSCR packed BCD) reproduces OBI 1,285,353 … RLM 380,655 exactly; complies with the fidelity requirement (evidence: all 10 entries in `src/core/highScores.ts:20-30`).
- [VERIFIED] Message strings faithful & no fabrication — STR/HSZ/RF2 match `TCMES.MAC:549/603/605`; line 604 is a bare `.NEXTMESS RF1` with no text, so no `<REBEL FORCE>` exists and the code (`render.ts:1044`) uses only the full title. The CRITICAL warning is respected.
- [VERIFIED] Core purity — `src/core/highScores.ts:17` is `import type` (erased); zero `Date`/`Math.random`/DOM/nondeterminism. Complies with the CLAUDE.md core/shell boundary.
- [VERIFIED] Citation integrity — no finding's claim/verbatim/reasoning drifted vs `develop`; only `remediated_by` + `ours.line`. Not laundering.

**Disabled-subagent domains (covered by my own analysis):**
- [EDGE] edge-hunter disabled — I checked boundaries: `seedDefaultHighScores` empty vs non-empty (both tested), board loop over 0/2/N rows, `formatScore(0)` → `'0'` (shared `Math.max(0, Math.floor)`), score-0 not swallowed.
- [SILENT] silent-failure-hunter disabled — no swallowed errors introduced; no new try/catch; the empty-board `NO SCORES YET` path is an intentional reachable fallback, not a silent failure.
- [DOC] comment-analyzer disabled — verified the new comments: `highScores.ts` BCD-provenance comment is arithmetically accurate; `render.ts` comments cite the correct `TCMES` lines; no stale docs.
- [TYPE] type-design disabled — covered by rule-checker's two type findings (readonly + aliasing), both confirmed Low.
- [SIMPLE] simplifier disabled — the change is minimal (6 string swaps + one pure data module + one wire); no over-engineering; the empty-board fallback is reachable (the tests exercise it), not dead code.

### Rule Compliance (typescript.md checklist + core boundary)

| Rule | Verdict |
|------|---------|
| #1 Type-safety escapes | Compliant — no `as any`/`@ts-ignore`/`!` in source; the test `proxy as unknown as CanvasRenderingContext2D` is the pre-existing repo Canvas-mock idiom (24 files). |
| #2 Generic/interface (readonly) | 2 Low findings — `seedDefaultHighScores` param + `[...DEFAULT_HIGH_SCORES]` should be `readonly`/deep-copied. Confirmed, non-blocking. |
| #4 Null/undefined (`??` vs `\|\|`) | Compliant — mock uses `?? 0` (preserves 0); seed guard uses `.length === 0`; `formatScore` handles score 0. |
| #5 Module/import type | Compliant — `import type` erased; extensionless imports correct under `moduleResolution: bundler`. |
| #8 Test quality | 1 Low finding — redundant assertion at `default-high-scores.test.ts:65`. No `as any`, no `dist/` imports, mock signatures match. |
| #14-19 Core purity (CLAUDE.md) | Compliant — `core/highScores.ts` imports no shell/DOM, no Date/RNG; shell→core direction preserved. |

### Devil's Advocate

Assume this ships and breaks. The loudest failure is the cross-origin high score: a player grinds to 400,000 — a real achievement — and the lobby tile proudly reads **1,285,353**, a number no human at this machine ever earned, mirrored to a different origin and cached for up to 400 days. The shared library was built (lb2-2) precisely to kill "a tile showing a number the game denies"; a hostile reading says this story quietly resurrects that defect by pouring ten fictional scores into the board that `topScoreOf` then maxes over. Second: the headline feature has no safety net — delete the one wiring line in `main.ts` and every one of 1247 tests still passes, so a careless future refactor silently reverts H-015 and nobody notices until a player sees an empty board. Third: the attract marquee literally renders "PRINCESS LEIA S REBEL FORCE" — an apostrophe-shaped hole mid-word that reads like a typo on the game's front door. Fourth: every seeded row shows "WAVE 0", which a confused user reads as a glitch, not a design choice. Fifth: ten rows at 24px starting at 0.5·h will clip off the bottom of any short viewport, and nothing tests the row count, so a truncated board could ship green. Sixth: `[...DEFAULT_HIGH_SCORES]` hands out live references to the module constant's entries — one stray `board[0].score = 0` corrupts the ROM defaults for the whole process. None of these are correctness bugs in the shipped path today (the row guard sanitizes junk localStorage, `insertHighScore` never mutates entries, the board fits at standard heights), but each is a real seam a follow-up should close — chiefly the cross-origin publish and the untested wire.

**Data flow traced:** player score (sim core `state.score`) → `main.ts` `insertHighScore(seededBoard, {name, score, wave})` → `highScoreStorage.save()` → localStorage + `publishTop` cookie → lobby. Safe for the in-game board (row guard validates every row; seed data is well-formed); the cross-origin publish of the seed-max is the one flagged wrinkle (non-blocking follow-up).

**Pattern observed:** minimal, surgical diff — 6 string swaps + one pure data module + one wire; ROM values verified against primary source at `src/core/highScores.ts:20-30`.

**Handoff:** To SM for finish-story.

## SM Assessment

**Disposition:** APPROVED and tracking-complete; PR to `develop` opened and awaiting the user's merge (per standing preference: the user merges PRs). Once merged, sw7-10 (`depends_on: sw7-3`) unblocks.

**What shipped (star-wars):** the five subsumed ROM-fidelity fixes, verified faithful against primary source (`TCHSCR.MAC`, `TCMES.MAC`):
- H-010 `PULL TRIGGER TO START` (attract + game-over) · H-011 board title `PRINCESS LEIA'S REBEL FORCE` (no bare `REBEL FORCE`) · H-012 `SHOOT YOUR INITIALS` · H-015 the seeded 10-entry Rebel board (OBI 1,285,353 … RLM 380,655, packed-BCD decoded) · H-020 comma-grouped game-over + board scores.
- Plus the audit-citation reconcile (5 `remediated_by=sw7-3`, 6 `ours.line` reanchors) and 4 re-seated SH2-5 sibling assertions.

**Quality gates:** RED (10 intended failures, 0 collateral) → GREEN (1247 tests, tsc clean, vite build) → REVIEW APPROVED (4 subagents, 5 disabled; 9 findings all Medium/Low, none blocking). Every TEA/Dev deviation audited ACCEPTED by the Reviewer.

**Deferred:** H-024 shield-gauge colour ramp (optional rider — `STARTING_LIVES=6` vs ROM `S.GAS` 0-9 needs a mapping decision).

**Follow-ups carried to the epic (non-blocking):**
1. Shared-font apostrophe glyph (`@arcade/shared/font`) — cross-repo; the title renders `LEIA S` until added.
2. H-015 seeding wire test (`main.ts?raw` scan) — the wire is currently untested.
3. Cross-origin publish of the seed max — decide seed persistence vs display-only for lobby parity.
4. 10-row board-render coverage + `default-high-scores.test.ts:65` redundant assertion + `seedDefaultHighScores` `readonly` hardening.

**Sprint diagnosis:** a clean transcription story — the ROM was authoritative, the values decoded arithmetically, and the only real seam (the lobby cross-origin publish) is a design call surfaced as a follow-up, not a blocker.