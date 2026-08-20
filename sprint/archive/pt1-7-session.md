---
story_id: pt1-7
jira_key: pt1-7
epic: pt1
workflow: tdd
---
# Story pt1-7: lobby: game tiles should identify the actual keys, not just say 'keyboard'

## Story Details
- **ID:** pt1-7
- **Jira Key:** pt1-7
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-7-lobby-tile-real-key-labels
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T08:05:20Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T07:33:08Z | 2026-08-20T07:35:47Z | 2m 39s |
| red | 2026-08-20T07:35:47Z | 2026-08-20T07:42:42Z | 6m 55s |
| green | 2026-08-20T07:42:42Z | 2026-08-20T07:51:09Z | 8m 27s |
| review | 2026-08-20T07:51:09Z | 2026-08-20T08:01:19Z | 10m 10s |
| green | 2026-08-20T08:01:19Z | 2026-08-20T08:03:35Z | 2m 16s |
| review | 2026-08-20T08:03:35Z | 2026-08-20T08:05:20Z | 1m 45s |
| finish | 2026-08-20T08:05:20Z | - | - |

## Acceptance Criteria

From the playtest surface (pt1-7 surfaced by defender's tile):
- Each lobby tile's control hint names the actual key bindings for that game, sourced from each plugin's manifest `controls:` field
- Defender specifically no longer shows only "Keyboard" — real bindings (A/D/W/S/Up/Down/Space/Enter/RightShift for reverse/thrust/vertical/fire/smart-bomb) are displayed
- The rendering machinery already exists (`lobby/src/shell/tiles.ts` lines ~80-85); this story is about data: update each game's manifest `controls:` field to carry real keys instead of placeholders

## Background

The lobby renders control hints from each game's manifest `controls:` field (via `game.controls[]`, a direct pass-through). Most games already carry the real bindings in their manifests:
- asteroids, battlezone, joust, missile-command, pac-man, red-baron, star-wars, tempest: OK — real keys listed
- defender: "Keyboard" only (the bug)
- centipede, millipede: placeholder device names only (source-driven judgment call: check if they have keyboard input)

**Measured binding sources (develop tip):**
- defender: `plugins/defender/src/shell/input.ts` → A/Left=reverse-facing, D/Right=thrust, W/S/Up/Down=vertical, Space/Enter=fire, RightShift=smart-bomb
- centipede, millipede: need verification of keyboard-input support before deciding on placeholder vs real bindings

The fix is to audit each game's `plugin.ts` manifest and update the `controls:` field to match the real key bindings from that game's `src/shell/input.ts`.

## Delivery Findings

### Dev (GREEN) — commit `4d4da04c`

All 15 pt1-7 tests green; fleet-wide 18018 passed / 0 failed; orchestrator 503/503; lint clean.

**What changed (data + regen, no rendering change):**
- `plugins/defender/plugin.ts:18` `['Keyboard']` → `['MOVE — WASD / Arrows', 'FIRE — Space', 'SMART BOMB — B']`
- `plugins/centipede/plugin.ts:9` `['Mouse']` → `['MOVE — Mouse / Arrows / WASD', 'FIRE — Click / Space']`
- `plugins/millipede/plugin.ts:17` `['Mouse / Trackball']` → `['MOVE — Mouse / Trackball', 'FIRE — Click / Space']`
- `src/host/registry.ts` regenerated (`npm run gen:registry`; `--check` reports up to date).

**Binding provenance (each sourced from the game's own shell, cross-checked against its ESC card where one exists):**
- defender — `src/shell/input.ts:17-24` (thrust D/→, reverse A/←, up W/↑, down S/↓), fire Space/Enter `:22`, smart bomb B/ShiftLeft `:25`. No ESC card exists.
- centipede — matches its ESC pause card `src/main.ts:189` (`ARROWS/WASD MOVE`, `SPACE FIRE`) plus pointer-lock mouse (the primary control for a trackball game).
- millipede — pointer-lock mouse/trackball is the only MOVE (no keyboard move); fire is the click + `FIRE_KEYS` set `src/main.ts:97`. Represented compactly as Click / Space.

**Judgment call — defender line count.** Went 3 lines, not 2, to name the SMART BOMB (defender's signature panic button, explicitly named in the playtest as undiscoverable). Omitted HYPERSPACE to keep the tile tight, consistent with the fleet norm where asteroids' tile likewise omits its hyperspace/shield keys. Visually confirmed (Playwright, this checkout on :5290): all tiles stay a uniform 176px, defender's 3-line hint sits 35px clear of the tile bottom, `scrollHeight === clientHeight` (no clip). Screenshot inspected then discarded (temp artifact).

**Deviation — one edit to TEA's test harness (disclosed).** `src/host/controls-name-real-keys.test.ts` used `String.prototype.replaceAll` (ES2021). This repo targets ES2020 (`tsconfig.json` lib), so `tests/shared-tests-typechecked.test.mjs` (tsc gate) failed with TS2550 even though vitest ran it fine. Rewrote the strip to `split(word).join('')` (ES2020-safe, longest-word-first so a future 'touchscreen' can't leave 'screen') — **semantics identical**, no assertion weakened. Flagging for Reviewer visibility since Dev touched a TEA-authored file.

**Comment hygiene (lang-review #17).** Updated millipede's manifest comment which self-declared "controls are placeholders (OQ-4)" — that was true when it shipped `['Mouse / Trackball']` and is now stale; narrowed it to the colour (still a placeholder) and cited pt1-7 as the resolver of the controls.

**Left alone (in TEA's out-of-scope list):** pac-man start keys (optional judgment call, not a hard AC), structured-controls contract change, defender ESC card.

### Dev (rework round 1) — commit `9e82a98f`

Addressed all three review findings; **no manifest/registry data change** (data was accepted). Test file only.
- **F1 (MEDIUM, rule #15/#18) — CLOSED.** Added a direct `describe('isBareDeviceLabel …')` block: `it.each` truth-cases (`'Keyboard'`, `'Mouse'`, `'Mouse / Trackball'`, `'Joystick'`, `'  '`, `'—'` → `true`) and false-cases (`'MOVE — WASD / Arrows'`, `'FIRE — Space'`, `'SMART BOMB — B'`, `'AIM — Mouse'`, `'FLY — Mouse / Arrows'`, `'Joystick — ←↑↓→ / WASD'`, `'FIRE — Click / Space'` → `false`). **Mutation-proven** in the working tree: patching the body to `return false` → 6 fail; to `return true` → 18 fail; original → 28 pass. Both mutants now die.
- **F2 (LOW, rule #17) — FIXED.** centipede citation now splits the claim: keyboard move/fire `input.ts:96-100`, mouse+left-button fire `input.ts:43-75` (`FIRE_BUTTON=0`, `onMouseDown`).
- **F3 (LOW, rule #17) — FIXED.** millipede citation corrected: fire keys `main.ts:97`, pointerdown handler `:116-119` with `fireHeld=true` at `:119` (click fires).

Verified: pt1-7 file 28 passed (was 15); host project 95; orchestrator 503; lint clean. Routing back to Reviewer (Zorg) for re-review, round-trip 1.

## Design Deviations

Dev logged two judgment calls in Delivery Findings (not in this section). Audited below.

### Reviewer (audit)
- **Dev edited TEA's test file (`replaceAll`→`split/join` for ES2020 lib-compat)** → ✓ ACCEPTED by Reviewer: verified semantics-identical (`split(w).join('')` ≡ `replaceAll(w,'')`), the longest-word-first sort correctly prevents `touchscreen`→`screen` residue, and it fixes a real gate failure (`tests/shared-tests-typechecked.test.mjs` TS2550). No assertion weakened. Disclosed transparently.
- **defender rendered as 3 control lines (added SMART BOMB), omitting HYPERSPACE** → ✓ ACCEPTED by Reviewer: consistent with the fleet (asteroids' tile likewise omits its hyperspace key), fits the tile (visually confirmed no clip), and names the signature control the playtest flagged. Sound.
- **No undocumented spec deviations found** — the manifest bindings match each game's shell source; registry mirrors the manifests (field-for-field, `registry.test.ts`).

## Sm Assessment

Setup verified against the current develop tip (fast-forwarded 7 commits before scoping; the pt1-20 defender in-game control-hint story merged cleanly in the meantime).

**Contention cleared.** The one live sibling in the neighbourhood was pt1-20 (a-3, "defender control hints"), which sounded adjacent because both stem from defender's discoverability gap in the 2026-08-19 playtest. It is now merged, and its real source footprint vs develop is empty. It touched only defender `core/scene.ts` (the in-game attract hint) — NOT the lobby tiles or any manifest `controls:` field. The two stories are complementary exactly as pt1-20's own description states. pt1-7 has no remote branch or sibling session other than this claim, which is now pushed (`feat/pt1-7-lobby-tile-real-key-labels`).

**Premise is live, not stale.** The bug is real on the current tree: `plugins/defender/plugin.ts` still carries `controls: ['Keyboard']`. No banner, no rot — the falsifiable claim was measured directly.

**Scope handed to TEA/Dev (data, not new UI).** The lobby rendering machinery already exists — `lobby/src/shell/tiles.ts` iterates `game.controls[]` and renders each entry as a `.tile-control` line. This story is about the manifest DATA. Survey of all eleven manifests on develop tip:
- Real keys already present (no change): asteroids, battlezone, joust, missile-command, pac-man, red-baron, star-wars, tempest.
- Generic placeholder (in scope): defender `['Keyboard']` (unambiguous fix), centipede `['Mouse']`, millipede `['Mouse / Trackball']` (device-only — source-driven judgment: read each `src/shell/input.ts` to decide whether a keyboard binding exists; a genuinely mouse-only game naming its device may be correct, since the AC targets generic placeholders like 'Keyboard', not device names).

**Reference shape:** joust's `['MOVE — ←→ / A D', 'FLAP — Space / Shift']` is the format to copy. Note the manifest-format trap the context records: `gen-registry.mjs` needs one-line, single-quoted manifest entries with no apostrophes.

**No user ruling required** — the AC has no either/or, source-of-truth is canonical, and the fix is the obvious one. Routing to TEA for RED.

## Tea Assessment

RED landed: `src/host/controls-name-real-keys.test.ts` (host project, node env), committed `a2dd4a07`. 6 failing, 9 passing (15 new cases). The 6 failures are **exactly** the three offenders (defender, centipede, millipede) — no good manifest trips a false positive.

**Where the test lives and what it reads.** It reads `GAMES` from the committed `src/host/registry.ts` — the single source of truth the lobby tile actually renders (`lobby/src/shell/tiles.ts:80-85`), not the manifests. `src/host/registry.test.ts` already pins GAMES to a field-for-field match of the manifests, so a manifest edit that skips `npm run gen:registry` leaves stale data here and this suite stays red. That is the AC3 regen pressure, reused — I deliberately did **not** write a bespoke regen test, because `tests/registry.test.mjs:41-47` (byte-match) and `src/host/registry.test.ts:41-64` (manifest↔registry equality) already own AC3. A duplicate would be redundant.

**Formalized ACs (derived from the story + Architect research):**
- **AC1 (general invariant):** for every game, no control hint is a *bare device label* — a string that, stripped of device nouns (Keyboard/Mouse/Trackball/Joystick/...) and non-key separators, leaves nothing. Red on `['Keyboard']`, `['Mouse']`, `['Mouse / Trackball']`; green on all 8 manifests that already pair an action with keys (verified: pac-man `['Joystick — ←↑↓→ / WASD']` passes because the arrow glyphs + WASD survive the strip).
- **AC2 (spot-pins, loose on phrasing, tight on ground truth):** each offender must name how you MOVE and how you FIRE, grounded in each shell's `input.ts`:
  - defender — fire `Space` (input.ts:22), move `WASD`/arrows (:17-21). Suggested: `['MOVE — WASD / Arrows', 'FIRE — Space', 'SMART BOMB — B']`.
  - centipede — still name `mouse` (pointer-lock primary) + a fire input `Click`/`Space` (input.ts:96-105).
  - millipede — still name `mouse`/trackball + a fire input `Click`/`Space` (main.ts:97,113-118).
- **AC3 (regen):** owned by existing tests (above) — Dev MUST run `npm run gen:registry` after editing manifests.

**What Dev must do (GREEN):** edit `controls:` in `plugins/defender/plugin.ts:18`, `plugins/centipede/plugin.ts:9`, `plugins/millipede/plugin.ts:17` to real bindings, then `npm run gen:registry`, then `node scripts/gen-registry.mjs --check`. **Format trap (load-bearing):** the array must stay ONE line, single-quoted, NO apostrophes in values (`gen-registry.mjs:76` regex + `JSON.parse(raw.replace(/'/g,'"'))`); em-dashes/arrows are preserved byte-for-byte. pac-man start keys are an optional judgment call, out of the hard ACs. Keep strings consistent with each game's ESC pause card where one exists (defender has none — out of scope).

**Rule Coverage (TS lang-review checklist):**
- #15 (source-text token vs claim): AVOIDED by construction — the test reads the structured `GAMES` array, never greps source text. Non-vacuity floor asserted FIRST (`GAMES.length >= 11`) so a filtered-empty set can't silently pass zero `it.each` cases.
- #18/#26 (assertion terms all test-local / fixture IS the expectation): the expectation is derived from real registry data (`game.controls`); `DEVICE_WORDS` is the classifier, not the expected value. Not vacuous — reverting any offender to its bare label reddens AC1, and copying the wrong game's bindings reddens AC2.
- #8 test-quality: every `it` carries a meaningful assertion with a message naming the SHAPE wanted (per #30), no `as any`, no `let _ =`.
- Others (#1-#7, #9-#14, #16-#25, #27-#29): N/A — no source change in this phase; a data-only manifest edit + regen follows in GREEN. Dev to self-check #1 (no `as any` sneaking into manifests) and the format trap above.

**Mutation-tested:** current tree (bare labels present) → 6 red; the fix makes all 15 green. Confirmed the RED is isolated — full host project is 6 failed / 76 passed, all failures in the new file. Routing to Dev (Korben Dallas) for GREEN.

## Subagent Results

**Round-Trip Count:** 0 (first review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | N/A | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | N/A | Skipped | disabled | Disabled via settings (domain covered by rule-checker #8/#15/#18/#26 + my own read) |
| 5 | reviewer-comment-analyzer | N/A | Skipped | disabled | Disabled via settings (domain covered by rule-checker #17 + my own read) |
| 6 | reviewer-type-design | N/A | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | N/A | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via settings)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred
**Working-tree audit:** `pf reviewer audit-tree` — initially false-DIRTY on `sprint/epic-pt1.yaml` (the pf-written `in_progress`→`in_review` status stamp, tracking-only — diff read and confirmed); `git checkout --` it, re-audit CLEAN. No subagent left a source mutation.

### Rule Compliance (TS lang-review, 30 checks)

The rule-checker enumerated all 30 against every changed `.ts`. I independently verified the material ones:
- **#17 (comments assert a mechanism nobody re-ran):** 4 citations checked, **2 violations** (centipede & millipede test-comment citations — see findings F2/F3). The other two (tiles.ts:80-85, registry.test.ts field-equality) verified TRUE.
- **#15 / #18 (mutation-testability):** **1 violation** — `isBareDeviceLabel` is not mutation-safe (see F1). The token-vs-claim half of #15 is compliant (reads structured `GAMES`, non-vacuity pinned to 11, not a loose bound).
- **#8 (test quality):** compliant — no `as any`, no mocks, `it.each` over production data, non-vacuity floor precedes the loop.
- **#1 (non-null assertion):** `game!.controls` (test:70) is guarded by `expect(game).toBeDefined()` on the prior line — safe, though indirect. Compliant.
- **#24 (retirement applied everywhere):** compliant — 'Keyboard'/'Mouse'/'Mouse / Trackball' retired in BOTH the manifest and the mirrored registry; remaining hits are past-tense archive/context docs.
- **#2, #5, #19, #20, #26:** compliant (verified). **#3,#4,#6-14,#16,#21-23,#25,#27-30:** N/A (no such construct in a data + string-predicate diff).

### Observations
1. `[VERIFIED]` Manifest bindings are faithful to each shell — defender fire=Space `input.ts:22`, move WASD/arrows `:18-21`, smart bomb B `:24`; centipede fire=Space `:100`, move Arrows/WASD `:96-99`; millipede movement is genuinely pointer-only (all `movementX/Y`, `shell/input.ts:82-88`; keydown handler `main.ts:98` is fire/start only). Data is correct.
2. `[VERIFIED]` `[SEC]` No injection surface — rendered via `textContent` (`tiles.ts:32`), and no new string contains `'`/`"` so `gen-registry.mjs:101`'s quote-swap parse is safe.
3. `[VERIFIED]` Registry mirrors manifests field-for-field (`registry.test.ts` `expect(GAMES).toEqual(expected)`), and `gen-registry --check` reports up to date — the regen was actually run.
4. `[MEDIUM]` `[RULE][TEST]` F1 — `isBareDeviceLabel` (test:53-64) is the sole guard for AC1 and untested in isolation; a `return false` mutant survives the whole suite (lang #15/#18). See findings table.
5. `[LOW]` `[RULE][DOC]` F2 — centipede citation `input.ts:96-105` (test:106) misses the mouse-fire mechanism it's credited with (that's `:43-75`).
6. `[LOW]` `[RULE][DOC]` F3 — millipede citation `main.ts:113-118` (test:114) is off-by-one for "click fires" (the `fireHeld=true` is `:119`).
7. `[VERIFIED]` Full suite green fleet-wide (18018), orchestrator 503, lint clean, tile visually confirmed no clip (Dev's Playwright check).

### Devil's Advocate

Suppose this change is worse than it looks. The shipped data is correct today — but the story's whole deliverable is a *guard against regression*, and that guard has a hole. `isBareDeviceLabel` is a bespoke string heuristic that no test pins directly. Eight of the eleven games (every one except the three offenders, which carry independent AC2 checks) are defended solely by AC1's `it.each`, which routes exclusively through that one function. Break the function — a careless edit to `DEVICE_WORDS`, a botched `NON_KEY_CHARS` class, a merge that fat-fingers the body to `return false` — and the suite goes *greener*, not redder: every `bare` array empties, every `toEqual([])` passes, and the exact defect this file exists to catch (a future `battlezone: ['Keyboard']`) sails through untouched. That is precisely the failure mode lang-review #15 was written to forbid ("delete the mechanism and require red"), and #18 ("a test apparatus that fails by passing"). A malicious or merely rushed future contributor doesn't even need bad intent; the test's own structure invites the silent regression.

A confused reader is also mistreated. The centipede citation sends someone checking the "left-button fire" claim to keyboard-only lines; the millipede citation stops one statement short of the very line that proves "click fires." Citations exist so the next person doesn't have to re-derive — a citation that lands on unrelated code is worse than none, because it manufactures false confidence (the #17 tell). None of these are catastrophic, and none touch runtime behaviour — which is why they are Medium/Low, not High. But the mutation gap is a real, cheap-to-close hole in the one thing this story was supposed to build: durable protection. Closing it (a handful of direct `isBareDeviceLabel` fixtures) is five minutes and converts a guard that *looks* protective into one that *is*. Given #15 is a hard, oft-cited project rule I may not dismiss, this goes back for one tight round rather than shipping a self-defeating guard.

## Reviewer Assessment

**Verdict:** REJECTED

The shipped manifest/registry data is correct and the bug is fixed — but the new test carries a confirmed violation of project rule #15 (mutation-testability of guards), plus two #17 citation slips. All three are in `src/host/controls-name-real-keys.test.ts`; no change to the manifest data is required.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [RULE][TEST] | `isBareDeviceLabel` is the sole AC1 guard and is untested in isolation — a `return false` mutant survives the whole suite, leaving 8 games unprotected (lang #15/#18) | `src/host/controls-name-real-keys.test.ts:53-64` | Add a direct unit test of `isBareDeviceLabel` with controlled fixtures that kill both mutants: assert `true` for `'Keyboard'`, `'Mouse'`, `'Mouse / Trackball'`; assert `false` for `'MOVE — WASD'`, `'AIM — Mouse'`, `'Joystick — ←↑↓→ / WASD'`. (Kills `return false` via the true-cases and `return true` via the false-cases.) |
| [LOW] [RULE][DOC] | Citation `input.ts:96-105` is credited with "pointer-lock mouse + left-button fire" but those lines are keyboard-only; the mouse-fire mechanism is `:43-75` | `src/host/controls-name-real-keys.test.ts:106` | Cite `:43-75` (or `:59-63,75`) for the mouse/left-button fire half, keep `:96-100` for the keyboard move/fire half |
| [LOW] [RULE][DOC] | Citation `main.ts:113-118` for "click fires" is off-by-one — `fireHeld=true` on pointerdown is `:119` | `src/host/controls-name-real-keys.test.ts:114` | Correct the range to `:97,116-119` |

**Not blocking / verified good:** manifest bindings faithful to shells; registry mirrors manifests; `[SEC]` no injection surface — control strings render via `textContent` (`tiles.ts:32`) and contain no `'`/`"` to break `gen-registry.mjs:101`'s quote-swap parse (reviewer-security returned clean); all suites green; tile renders without clipping. Data layer is sound — the rework is test-hardening only.

**Handoff:** Back to Dev (Korben Dallas) for fixes.

## Subagent Results

**Cycle: 1**

Re-review method: **targeted re-verification** of the three round-0 findings with direct probes (stronger evidence than a fresh generalist sweep for characterized findings, per the rework protocol). No new code paths were introduced this round — the rework touched only `src/host/controls-name-real-keys.test.ts` (test-hardening), so the previously-clean preflight/security domains were re-confirmed rather than re-swept.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes — re-verified | clean | none | re-ran host (95 pass), orchestrator (503), lint (clean); tree clean |
| 2 | reviewer-edge-hunter | N/A | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | N/A | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | N/A | Skipped | disabled | Disabled via settings (F1 re-verified by mutation probe below) |
| 5 | reviewer-comment-analyzer | N/A | Skipped | disabled | Disabled via settings (F2/F3 citations re-verified below) |
| 6 | reviewer-type-design | N/A | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes — re-verified | clean | none | test-only change, no new injection/input surface; still clean |
| 8 | reviewer-simplifier | N/A | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes — re-verified | findings resolved | 3 (all from round 0) | all 3 CONFIRMED FIXED — see below |

**All received:** Yes (3 enabled re-verified; 6 disabled via settings)
**Total findings:** 0 new; 3 prior findings all verified FIXED
**Working-tree audit:** `pf reviewer audit-tree` — false-DIRTY on `sprint/epic-pt1.yaml` (pf status stamp again, tracking-only, diff read = `in_progress`→`in_review`); `git checkout --`, re-audit CLEAN.

### Finding re-verification (targeted probes)
- **F1 [MEDIUM][RULE][TEST] mutation gap — FIXED.** New `describe('isBareDeviceLabel …')` at test:78 with truth/false fixtures. Independent probe: patched the body to `return false` → **6 failed** (the truth-case fixtures redden); restored → 28 passed. `return true` was Dev-proven → 18 failed, corroborated by the 7 false-case fixtures being present. The AC1 guard is now mutation-safe (kills both directions). Rule #15 satisfied.
- **F2 [LOW][RULE][DOC] centipede citation — FIXED.** Now cites keyboard move/fire `input.ts:96-100` and mouse+left-button fire `:43-75`. Verified: `:43` = `const FIRE_BUTTON = 0`, `:59` = `onMouseDown`, `:75` = `addEventListener('mousedown', …)`, `:96/:100` = `RIGHT_KEYS`/`FIRE_KEYS`. Accurate.
- **F3 [LOW][RULE][DOC] millipede citation — FIXED.** Now cites `main.ts:97` (fire keys) and `:116-119` (pointerdown). Verified: `:116` = `canvas.addEventListener('pointerdown', …)`, `:119` = `fireHeld = true`. Accurate.

## Reviewer Assessment

**Verdict:** APPROVED

Round-trip 1 re-review. All three round-0 findings are confirmed fixed by targeted probe (mutation re-run for F1; source-line re-read for F2/F3), and no new findings surfaced — the rework was confined to `src/host/controls-name-real-keys.test.ts` and introduced no runtime code.

- `[RULE][TEST]` F1 CLOSED — `isBareDeviceLabel` is now pinned directly and mutation-safe; the AC1 fleet loop is no longer defended by an untested helper.
- `[RULE][DOC]` F2, F3 CLOSED — both test-comment citations now land on the exact code they describe.
- `[SEC]` re-confirmed clean — the round's diff is test-only; no injection/input/secret surface.
- `[VERIFIED]` suites green — pt1-7 file 28 pass, host 95, orchestrator 503, lint clean; manifest/registry data unchanged from the approved state.

The shipped deliverable — every lobby tile now names real keys (defender no longer bare "Keyboard"), with a mutation-tested guard preventing regression across all 11 games — meets AC1/AC2/AC3. No Critical/High/Medium/Low remaining.

**Handoff:** To SM (Ruby Rhod) for finish-story.