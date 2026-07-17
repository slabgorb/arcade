---
story_id: "tp1-20"
jira_key: "tp1-20"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-20: HUD & MESSAGES — fixed field colours and the ROM's actual strings; drop the three invented captions

## Story Details
- **ID:** tp1-20
- **Jira Key:** tp1-20
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T13:06:50Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T12:16:11Z | 2026-07-17T12:18:11Z | 2m |
| red | 2026-07-17T12:18:11Z | 2026-07-17T12:37:40Z | 19m 29s |
| green | 2026-07-17T12:37:40Z | 2026-07-17T12:48:03Z | 10m 23s |
| review | 2026-07-17T12:48:03Z | 2026-07-17T13:02:23Z | 14m 20s |
| green | 2026-07-17T13:02:23Z | 2026-07-17T13:05:09Z | 2m 46s |
| review | 2026-07-17T13:05:09Z | 2026-07-17T13:06:50Z | 1m 41s |
| finish | 2026-07-17T13:06:50Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): `tests/shell/render.banners.test.ts` (Story 10-9 AC2 + AC4) pins the bare `'RANK'` literal via `bannerColorArg` — those two assertions go RED the moment Dev lands V-036 (the literal is replaced by the RANKING sentence, so the extractor returns null → family 'other').
  Affects `tempest/tests/shell/render.banners.test.ts` (during GREEN, Dev migrates the two RANK pins: redirect them to the RANKING sentence or drop them in favour of the tp1-20 suite, which pins the same contract. Expected churn per the format-widening pattern — the `toContain('RANK')` loop stays green since 'RANKING FROM 1 TO ' contains the substring).
  *Found by TEA during test design.*
- **Gap** (non-blocking): V-018's LAYOUT half is not covered by any AC and not tested — the ROM SCORES template places the high score directly under player 1's score with the level below it and 3 hi-score initials beside (CSTAT GREEN → SCHIIN, ALVROM.MAC:1990-1992); ours centres hi-score/level in a top row and draws no initials field at all.
  Affects `tempest/src/shell/render.ts` (candidate follow-up story: HUD layout + initials field per the SCORES template geometry).
  *Found by TEA during test design.*
- **Gap** (non-blocking): AC-3 lists three verbatim strings but the story description also subsumes V-034 ('PRESS FIRE TO SELECT', YELLOW — ALLANG.MAC:71/:131). The RED suite covers it (see Design Deviations); PM may want the epic YAML's AC list amended to match the description.
  Affects `sprint/epic-tp1.yaml` (AC-3 of tp1-20 omits the fourth ROM string its own description subsumes).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): GREEN must set `"remediated_by": "tp1-20"` on V-018/V-033/V-034/V-035/V-036 in `docs/audit/findings/pair-2-alvrom-shapes-font.json` and run `node tools/audit/reanchor-citations.mjs --write` after editing render.ts (every edit shifts the unfixed citations' pinned lines) — that is how AC-5 (`npm test -- citations` green) survives the fix. All five findings verified CONFIRMED with no existing `remediated_by`.
  Affects `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` (five remediated_by flags + re-anchor pass, before commit).
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): `reanchor-citations.mjs --write` re-serializes findings JSON with literal unicode (em-dashes) replacing the original `\uXXXX` escapes — whole-file byte churn on pair-2/pair-6 that buries the real diff. The semantic diff was verified clean by parsing both versions (exactly: 5 remediated_by stamps, 8 line re-points, 2 verbatim re-spells); a reviewer eyeballing the raw diff will see hundreds of cosmetic lines.
  Affects `tempest/tools/audit/reanchor-citations.mjs` (serialize with escaped non-ASCII, or note the normalization in the tool's output).
  *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's own suite guard (`never again draws the bare four-letter 'RANK' caption`) scans render.ts source text INCLUDING comments — my first comment mentioning the old caption in quotes tripped it. Same comment-inclusive class as the purity scanner; worth remembering that tp1-20's guard now polices comments in render.ts for quoted RANK forever.
  Affects `tempest/src/shell/render.ts` (future comments must not quote the bare four-letter word).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Conflict** (blocking): V-018's `remediated_by: "tp1-20"` stamp overclaims — the finding's layout aspect (hi-score under P1's score, level below, SCHIIN GREEN initials field) is a live divergence the stamp now hides from the citation gate forever.
  Affects `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` (remove V-018's remediated_by, re-point its `ours` onto the living layout evidence — see the Reviewer Assessment fix; the other four stamps are honest and stand).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): two ENTER-string presence assertions in `tp1-20.hud-messages.test.ts` are satisfiable by the adjacent citation comment (auditor mutation M5: delete the draw, both stay green); the contract survives only through the draw-call-anchored colour test's `colors.length > 0`.
  Affects `tempest/tests/shell/tp1-20.hud-messages.test.ts` (TEA follow-up: anchor the presence and heading-position assertions on parsed draw calls, or strip comments before scanning).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): once V-018 is re-pointed at the layout divergence, the colour/caption half of its claim becomes historical prose — the audit curators should carry a note (not an edit) recording that tp1-20 fixed those aspects, per the WD-016 curator-note pattern.
  Affects `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` (curator note only; claim/reasoning must not be edited by story work).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **V-034 ('PRESS FIRE TO SELECT') tested although AC-3's string list omits it**
  - Spec source: epic-tp1.yaml story tp1-20 — description vs acceptance_criteria
  - Spec text: description: "Subsumes V-018, V-033, V-034, V-035, V-036"; AC-3: "The ROM's actual strings ship, verbatim: 'ENTER YOUR INITIALS', 'RANKING FROM 1 TO n', 'SPIN KNOB TO CHANGE'" (no PRESS FIRE TO SELECT)
  - Implementation: RED suite pins V-034 fully (verbatim string on the select screen, invented 'PRESS START / ENTER TO BEGIN' retired, fixed YELLOW per ALLANG.MAC:71) in its own describe block, separable if the Reviewer rules it out
  - Rationale: the description names V-034 individually (not a range — the tp1-17 "range lies" precedent doesn't apply), and the epic already overrode the audit's browser-concession for the SAME class of string (V-033's SPIN text was equally conceded by the auditor yet AC-3 demands it verbatim); consistency says the omission is an oversight, logged as a Gap finding for PM
  - Severity: minor
  - Forward impact: Dev implements a fourth string swap in drawSelect; render.banners.test.ts is unaffected by this one (no sibling pins 'PRESS START / ENTER TO BEGIN')
- **Colours pinned by FAMILY (channel dominance), not exact hex; TURQOI pinned by a stricter cyan test**
  - Spec source: context-story-tp1-20.md AC-1 + repo convention (tests/shell/render.banners.test.ts header)
  - Spec text: "HUD field colours are FIXED per field, per the ROM: green score, yellow lives, green hi-score, blue level"
  - Implementation: classify() by channel dominance (any valid hue within the family passes, wrong family fails); V-033's TURQOI additionally requires isCyanFamily (rejects ZBLUE '#2b6bff', the translucent steel wash, and white) + a no-rgba full-opacity pin
  - Rationale: the AC speaks in colour families, and the repo's established banner-colour convention is family classification — an exact-hex pin would reject a legitimate hue tweak within the family; TURQOI needs the stricter test because the generic classifier folds cyan into 'blue', which would let ZBLUE pass a slot the ROM says is turquoise
  - Severity: minor
  - Forward impact: Dev may use GLYPH_HEX slots directly (identifiers classify correctly); no test re-seat needed when hues are tuned within family

### Dev (implementation)
- **Entry-screen heading rendered at 28px, not the 44px the invented banner used**
  - Spec source: epic-tp1.yaml tp1-20 AC-3 + V-035 (ALLANG.MAC:69 `MESS ENTER,RED,1,0B0`)
  - Spec text: "The ROM's actual strings ship, verbatim: 'ENTER YOUR INITIALS' …" (no size specified; the ROM message is scale 1 — normal text, not a banner)
  - Implementation: `drawGlowText(ctx, 'ENTER YOUR INITIALS', W / 2, H * 0.2, 28, GLYPH_HEX.red, 16)` — same slot the old banner occupied, smaller cap height
  - Rationale: the 19-character ROM string at the banner's 44px would approach the canvas width; the ROM draws it at scale 1, so a normal text size is the faithful reading. No test pins size.
  - Severity: minor
  - Forward impact: none
- **Two audit citations outside the story's findings (SC-006, SC-007, pair-6) hand re-pointed onto re-spelled lines — NOT marked remediated**
  - Spec source: tempest/CLAUDE.md citation-gate rules + the two-honest-exits sidecar rule
  - Spec text: "Removed → remediated_by … Re-spelled → hand-edit `ours` line+verbatim onto the new spelling and leave the finding open"
  - Implementation: SC-006 (concordance: our select screen mirrors RQRDSP's shape) re-pointed from the bare-RANK draw to the RANKING-sentence draw (line 807); SC-007 (structural: ALSCOR.MAC alone can't confirm the colour split) re-pointed onto the reworded comment (line 802). Both stay open.
  - Rationale: tp1-20 re-spelled the lines these findings cite but did not change what they record — stamping remediated_by would write a phantom fix into the audit; the re-pointed quotes still evidence the same claims (SC-006's now more faithfully).
  - Severity: minor
  - Forward impact: Reviewer should verify the two re-points evidence their claims; reanchor reports 0 lost
- **`render.banners.test.ts` two bare-RANK colour pins migrated (test edit during GREEN)**
  - Spec source: session file, TEA Conflict finding (Delivery Findings)
  - Spec text: "during GREEN, Dev migrates the two RANK pins: redirect them to the RANKING sentence or drop them in favour of the tp1-20 suite, which pins the same contract"
  - Implementation: dropped the `'RANK'` line from Story 10-9 AC2's rank-red test and AC4's cross-check, each with a comment pointing at tp1-20.hud-messages.test.ts where the sentence's red pin now lives; the substring presence loops were left untouched (still green)
  - Rationale: sanctioned by TEA's finding — the bare literal is gone by design and `bannerColorArg` cannot read a template-literal text argument; the contract (rank line is red) is pinned by the tp1-20 suite
  - Severity: minor
  - Forward impact: none — NOVICE/EXPERT/RATE YOURSELF pins unchanged

### Reviewer (audit)
- **TEA: V-034 tested although AC-3 omits it** → ✓ ACCEPTED by Reviewer: the description names V-034 individually and the epic already overrode the identical browser-concession for V-033; the auditor's ROM re-check confirms the implemented string/colour are the cabinet's. The AC-list amendment stays with PM (TEA's Gap finding).
- **TEA: colours pinned by FAMILY, TURQOI by stricter cyan test** → ✓ ACCEPTED by Reviewer: matches the repo's established banner-colour convention; the stricter TURQOI split is what caught nothing slipping ZBLUE into the PRMOV slot — mutation M9 proves it bites.
- **Dev: entry heading at 28px, not 44px** → ✓ ACCEPTED by Reviewer: ROM's ENTER is scale 1 (normal text), size unpinned by any test, and the 19-glyph string at 44px would crowd the canvas; presentation judgment, correctly logged.
- **Dev: SC-006/SC-007 re-pointed, NOT remediated** → ✓ ACCEPTED by Reviewer: the correct two-honest-exits treatment; auditor byte-verified both new verbatims against the tree and confirmed claim/reasoning untouched.
- **Dev: render.banners.test.ts RANK-pin migration** → ✓ ACCEPTED by Reviewer: sanctioned in advance by TEA's Conflict finding; intent (rank line is red) preserved in the successor suite; NOVICE/EXPERT pins intact.
- **UNDOCUMENTED (Reviewer): V-018 stamped fully remediated despite its live layout aspect.** Spec (tempest CLAUDE.md + epic convention) says `remediated_by` is only for defects actually removed; V-018's claim includes the layout divergence this story deliberately did not touch (TEA logged the layout as out-of-scope, but nobody logged the decision to stamp the WHOLE finding anyway). Severity: H — this is the blocking finding in the Reviewer Assessment.


**Branch Strategy:** gitflow (fix/tp1-20-hud-messages, from origin/develop)

**Dependency:** Depends on tp1-12 (THE PALETTE) for the per-wave COLTAB banks, which this story uses for the HUD field colours. tp1-12 is DONE.

**Critical Context from tp1-12 archive:**
- Per-level HUD/frame/warp accent currently derives from `wellColor(s.level)` with white fallback on invisible-well waves 65-80
- Location: tempest/src/shell/render.ts:939-940
- tp1-12's Reviewer noted (non-blocking): authentic HUD/LETTERS colour is palette slot 5/7, not white
- **tp1-20 supersedes the accent-driven colouring with fixed per-field colours (green score, yellow lives, green hi-score, blue level)**
- Existing palette exports: COLTAB_BANKS, paletteBank, paletteColor, wellColor (all cited)

**Unverified Subsumes List:**
The epic lists "Subsumes V-018, V-033, V-034, V-035, V-036" — **this is an unverified guess**. TEA must verify before RED by pulling each finding's actual claim + reasoning from tempest/docs/audit/findings/*.json. The reasoning's [REFUTATION]/[CORRECTION] can flip a claim, some findings may already carry `remediated_by` (already fixed), and misfiled findings must be carved to their real story.

**Citation Gate Traps:**
- `npm test -- citations` pins file+line to exact locations
- ANY edit in a cited file — even a comment-only change — shifts pinned lines and breaks the test
- Re-anchor after edits: `node tools/audit/reanchor-citations.mjs --write`
- `remediated_by` is ONLY for defects actually removed by this story

**Purity Scanner:**
- tempest/tests/audit/purity.test.ts scans source text INCLUDING comments for forbidden globals
- Avoid `window.`, `document.`, `canvas`, `FontFace` even in comments (e.g., "the window dimension" will fail)

## Sm Assessment

**Decision: proceed to red phase (TEA).** Rationale for each setup decision:

- **Story selected:** tp1-20 (user-directed via `/pf-work tp1-20`). 5pt p1 bug, tempest, workflow `tdd` from the epic YAML — no fallback needed.
- **Race check: clean.** Fetched tempest origin; no `tp1-20` commits on origin/develop and no remote branch. No sibling checkout has claimed this story.
- **Merge gate: passes.** Zero open PRs on slabgorb/tempest.
- **Dependency gate: satisfied.** tp1-12 (THE PALETTE) is `status: done` in epic-tp1.yaml; its exports (COLTAB_BANKS, paletteBank, paletteColor, wellColor) are the palette this story's AC-1 depends on.
- **Branch:** `fix/tp1-20-hud-messages` cut from origin/develop (gitflow — the repos.yaml strategy for tempest; `fix/` prefix because the story is `type: bug`).
- **Jira:** skipped explicitly — this project tracks locally via sprint YAML; jira_key is the story id.
- **Context enrichment:** wrote the tp1-12 archive quarry (HUD accent = wellColor + white fallback, render.ts:939-940; Reviewer's slot-5/7 nit), the unverified-subsumes warning (TEA must pull V-018/V-033/V-034/V-035/V-036 claims from docs/audit/findings/*.json before RED), citation-gate re-anchoring, and the comment-inclusive purity scanner into Setup Notes + context file.
- **Risk flagged for TEA:** the subsumes list is a guess; findings may carry [REFUTATION]/[CORRECTION] or `remediated_by`. Verify before writing RED tests.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — 5pt fidelity bug with five confirmed audit findings; full RED suite written.

**Finding verification (the mandated pre-RED step):** all five subsumed findings pulled from `docs/audit/findings/pair-2-alvrom-shapes-font.json` and read whole — claim AND reasoning. All five are **CONFIRMED**, none carries `remediated_by`, and every `[REFUTATION]` block records a FAILED refutation attempt ("holds against every attack angle") — no claim flips. The subsumes list is, for once, accurate — with one scope wrinkle: AC-3 omits V-034's string (see Design Deviations + Delivery Findings). Primary source re-opened independently: ALVROM.MAC:1957-1994 (SCORES template: :1958 GREEN score, :1971 YELLOW lives, :1979 GREEN hi-score, :1987 BLUE level, :1990 GREEN initials; only `JSRL CHAR.`/`JSRL LIFE0` — no caption glyphs) and ALLANG.MAC:69-73 + :121/:126/:131/:141 (ENTER/PRMOV/PRFIR/RANK messages + English literals, ERANK's trailing space real). Every line number in the test header was verified against `~/Projects/tempest-source-text`, not copied from the findings.

**Test Files:**
- `tempest/tests/shell/tp1-20.hud-messages.test.ts` — 27 tests: source-scan seam (`?raw`, the repo's established convention for render text — no canvas in the node env) with a paren/quote-aware call parser (`textDrawCalls`/`argsOf`) because the banners test's regex extractor cannot read `vecText` calls with bare-number positions (sidecar entry written).

**Tests Written:** 27 tests covering 4 ACs + V-034 (AC-4 is the tp1-12 dependency, satisfied; AC-5 is the citations gate, enforced by the existing suite)
**Status:** RED (19 failing / 8 passing — verified by testing-runner, RUN_ID tp1-20-tea-red; full suite otherwise green: 1602/1621 passing, 135/136 files, citations included)

**Fails-for-the-right-reason audit (every failure inspected):** AC-1 score/level/hi fail on `classify('color') = 'other'` — the level-cycling defect itself; AC-2 ×3 fail on the invented caption literals being present; V-035 fails on 'NEW HIGH SCORE' present, `CLAW_COLOR → 'yellow' ≠ 'red'`, and heading index 311 > guard index 213 (the dead-branch placement); V-033/V-036/V-034 fail on missing verbatim strings, surviving invented strings, and null colour extraction; bare-'RANK' guard fails on the current literal. **Pre-GREEN pass audit (all 8 must be intended guards, and are):** helper sanity ×4 (parser + classifier self-checks, incl. the nested-comma and `${}` fixtures), the drawHud structural precondition, the lives-yellow KEEP guard (LIFE1 carries its own CSTAT YELLOW — the one field already faithful), the string-presence check for 'ENTER YOUR INITIALS' (exists today in the defensive branch; the RED work is carried by its colour/position tests), and the lang-review no-escapes guard.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes | `introduces no as any or @ts-ignore alongside the HUD/message fixes` | passing (keep-guard on render.ts) |
| #8 test quality | helper-sanity describe (4 fixture self-checks) + this self-check | passing |
| #2 generics / #3 enums / #4 null-undefined / #5 modules / #6 React / #7 async / #9 build / #10 input validation / #11 errors / #12 bundle | n/a | render-only source-scan story: the diff under test is colour arguments + string literals in one shell file; no new types, enums, async paths, config, or external input surface |

**Rules checked:** 2 of 2 applicable lang-review rules have test coverage (10 n/a with reasons above)
**Self-check:** 0 vacuous tests found — every test carries a meaningful assertion; the two conditional guards (heading-precedes-`!entry`, which only relaxes if Dev deletes the defensive branch outright) are backed by unconditional presence + colour assertions in the same describe.

**Notes for Julia (Dev):**
- The palette is already in place (tp1-12): `GLYPH_HEX.green/.yellow/.blue/.cyan/.red` in render.ts — identifiers classify correctly, use them directly.
- `MAX_SELECT_LEVEL` (core/rules.ts:123) must be referenced by the RANKING sentence's template literal — the test pins the identifier, not the number 16.
- After editing render.ts: set `remediated_by: "tp1-20"` on all five findings + `node tools/audit/reanchor-citations.mjs --write`, or the citations gate goes red (AC-5).
- `render.banners.test.ts`'s two bare-'RANK' colour pins go red under your fix — migrate them as part of GREEN (see the Conflict finding).
- Purity scanner: you're only in shell files, but keep `window.`/`document.` out of comments anyway.

**Handoff:** To Julia (Dev) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/src/shell/render.ts` — drawHud: score/hi-score → `GLYPH_HEX.green`, level → `GLYPH_HEX.blue` (fixed per field, ALVROM.MAC:1958/1979/1987); the three invented captions and their `LABEL_COLOR` const deleted. drawSelect: bare RANK → `` `RANKING FROM 1 TO ${MAX_SELECT_LEVEL}` `` in `GLYPH_HEX.red`, SPIN prompt → 'SPIN KNOB TO CHANGE' in `GLYPH_HEX.cyan`, confirm prompt → 'PRESS FIRE TO SELECT' in `GLYPH_HEX.yellow`. drawEntry: heading → 'ENTER YOUR INITIALS' in `GLYPH_HEX.red`, invented 'NEW HIGH SCORE' removed, defensive `!entry` branch reduced to a bare return. `MAX_SELECT_LEVEL` added to the core/rules import.
- `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` — V-018/V-033/V-034/V-035/V-036 stamped `remediated_by: "tp1-20"`; 5 pure line re-points from reanchor.
- `tempest/docs/audit/findings/pair-6-alscor-scoring.json` — SC-006/SC-007 hand re-pointed onto the re-spelled lines (open, NOT remediated — see deviation); SC-011 line re-point.
- `tempest/tests/shell/render.banners.test.ts` — two bare-RANK colour pins migrated per TEA's Conflict finding.

**Tests:** 1621/1621 passing (GREEN — testing-runner RUN_ID tp1-20-dev-green-2, full suite, 136 files; citations 104 correct / 0 lost; `npm run build` (tsc + vite) clean)
**Branch:** fix/tp1-20-hud-messages (pushed, commits 8f7e1b9 test + ef0e113 impl)

**RED verification note:** the RED state was verified by TEA's testing-runner run (tp1-20-tea-red, 19 failing) immediately before this phase with no intervening commits; I did not re-run it separately.

**One mid-GREEN catch:** my first version of the drawSelect comment quoted the old caption and tripped TEA's comment-inclusive source guard (26/27) — reworded, 0 citation drift, then full green. Logged as a Delivery Finding so the next editor of render.ts knows the guard polices comments too.

**Handoff:** To The Thought Police (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1621/1621 green, build clean, 0 smells, tree clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by reviewer directly (see [EDGE] note) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by reviewer directly (see [SILENT] note) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — mutation testing delegated to the independent auditor (see [TEST] note) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by reviewer directly (see [DOC] note) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by reviewer directly (see [TYPE] note) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain covered by reviewer directly (see [SEC] note) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by reviewer directly (see [SIMPLE] note) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — rule-by-rule enumeration done by reviewer (see Rule Compliance) |
| + | independent general-purpose auditor (sidecar-mandated for self-authored review with subagents off) | Yes | findings | 3 (1 integrity caveat, 2 observations) | confirmed 1 HIGH (V-018 stamp), confirmed 1 MEDIUM (comment-foolable presence tests), noted 1 LOW (SC-006 tension) |

**All received:** Yes (preflight + independent auditor returned; 8 specialists disabled via settings)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred

## Rule Compliance

Lang-review TypeScript checklist (.pennyfarthing/gates/lang-review/typescript.md), enumerated against every changed construct in the diff (render.ts draw-call edits; two test files; two findings JSONs — no new types, enums, traits, or async paths anywhere in the diff):

| # | Check | Verdict |
|---|-------|---------|
| 1 | Type-safety escapes | COMPLIANT — zero `as any`/`@ts-ignore`/non-null-asserts in the diff; pinned by tests on render.ts |
| 2 | Generic/interface pitfalls | N/A — no types/interfaces/params added; `GLYPH_HEX` lookups use the existing `Record<GlyphColor, string>` |
| 3 | Enum anti-patterns | N/A — no enums |
| 4 | Null/undefined handling | COMPLIANT — `if (!entry) return` guards the optional entry (correct: absent entry has no valid render); `hi` fallback keys on `.length`, not a falsy score |
| 5 | Module/declaration issues | COMPLIANT — one named import added to an existing relative import (repo bundler convention, no extensions used repo-wide) |
| 6 | React/JSX | N/A — no .tsx |
| 7 | Async/Promise | N/A — no async in diff |
| 8 | Test quality | ONE FINDING — two ENTER-string presence assertions are satisfiable by the adjacent citation comment (auditor M5, mutation-proven); the contract survives via the draw-call-anchored colour test (one-deep redundancy). Non-blocking, route to TEA follow-up. All other new assertions mutation-verified load-bearing (10/10 kills) |
| 9 | Build/config | COMPLIANT — no config changes; tsc + vite clean |
| 10 | Input validation | N/A — all drawn text derives from internal sim state (initials restricted to A-Z by core `stepNameEntry`); no external input reaches the diff |
| 11 | Error handling | N/A — no catches; no new failure modes (constants + pure draws) |
| 12 | Performance/bundle | COMPLIANT — no new imports beyond one named constant; template literal per select-frame is negligible |
| 13 | Fix-introduced regressions | COMPLIANT — the mid-GREEN comment rewording was re-scanned (0 citation drift, full green) |

## Reviewer Observations

1. `[VERIFIED]` HUD field colours match the SCORES template — render.ts:895/897/900 draw score/level/hi in `GLYPH_HEX.green/.blue/.green`; independently re-derived from ALVROM.MAC:1958/1987/1979 by the auditor (field-by-field MATCH table) and mutation-proven guarded (M1-M3 each 1 red; my own serial re-run of M1: 26/27). Complies with lang-review #1 (no escapes used to wire it).
2. `[VERIFIED]` all four ROM strings ship verbatim in their Messages-table colours — render.ts:807 (RANKING+`MAX_SELECT_LEVEL`, red), :819 (SPIN, cyan/TURQOI, full opacity), :822 (FIRE, yellow), :832 (ENTER, red); ERANK's trailing space byte-verified by the auditor; mutations M7-M10 all killed (3 reds each).
3. `[VERIFIED]` the three invented captions are gone and guarded — no quoted `SCORE`/`LEVEL`/`HI-SCORE` literal anywhere in render.ts; M4 (re-adding one) killed by AC-2.
4. `[HIGH]` [RULE] V-018 `remediated_by: "tp1-20"` overclaims — the finding's layout aspect ("high score directly under player 1's score with the level below it", plus the never-rendered SCHIIN GREEN initials field) is a LIVE divergence, and the stamp freezes the whole finding so the audit record now shows a phantom fix, at docs/audit/findings/pair-2-alvrom-shapes-font.json (V-018). This is the exact `remediated_by`-on-a-live-divergence trap the epic's conventions name. Code is correct for the story's scope; the AUDIT RECORD is what misstates.
5. `[MEDIUM]` [TEST] two ENTER-string presence assertions in tp1-20.hud-messages.test.ts ("draws 'ENTER YOUR INITIALS' on the entry screen", "draws it as the heading proper…") are satisfied by the citation comment alone (auditor M5: deleting the draw leaves both green; only the colour test's `colors.length > 0` goes red). Contract intact but one-deep — if that colour test is ever weakened, heading deletion ships green. Non-blocking; TEA follow-up to anchor presence on parsed draw calls.
6. `[LOW]` [DOC] SC-006's frozen claim still narrates a "'RANK' header" while its re-quoted `ours` now shows the RANKING sentence — deliberate (claims are frozen; prose edits would be laundering), visible tension only. No action this story.
7. `[VERIFIED]` findings-diff integrity (bar observation 4) — semantic field-by-field diff shows exactly: 5 remediated_by stamps, 8 integer `ours.line` re-points, 2 `ours.verbatim` re-spells (SC-006/SC-007) that byte-match the current tree; zero claim/reasoning/title/source edits. The unicode churn is reanchor-tool normalization, semantically empty. Complies with the anti-laundering rule.
8. `[VERIFIED]` sibling migration honest — render.banners.test.ts drops exactly the two `bannerColorArg('RANK')` pins (mechanically unreadable post-change), keeps NOVICE/EXPERT/RATE YOURSELF pins, comments point at the successor suite; sanctioned in advance by TEA's Conflict finding.

**Coverage notes for disabled specialists:** [EDGE] boundaries checked directly — >6-digit scores, >2-digit levels, empty high-score table, absent entry, lives overflow: all pre-existing behaviours untouched by this diff. [SILENT] no catches/fallbacks added; the one guard (`!entry`) fails loud-by-absence (blank entry screen) exactly as before. [DOC] comments audited — new citation comments are accurate (auditor spot-checked every cited ROM line); one internal-tension note (obs 6). [TYPE] no type surface changed; colour args stay within `GLYPH_HEX`'s typed record. [SEC] no external input, no DOM sinks (stroke canvas), no secrets. [SIMPLE] the diff DELETES more presentation code than it adds (captions + defensive draw); no new abstractions. [TEST]/[RULE] see Rule Compliance table and the auditor's mutation matrix.

## Devil's Advocate

Assume this is broken. First attack: the colours look right in tests but wrong on screen — the tests assert identifiers, not pixels; if `GLYPH_HEX.blue` were mistuned, every test stays green. Countered: GLYPH_HEX is tp1-12's audited palette (V-004-class findings pinned its slots); this story correctly binds fields to slots rather than hexes. Second attack: the RANKING sentence lies to the player — it promises levels 1..16, but if a future story makes the selectable cap dynamic (the real cabinet widens the range with player rating), the sentence tracks `MAX_SELECT_LEVEL` and would silently misreport a dynamic cap. Today it is exactly the chooser's clamp (sim.ts:1127 uses the same constant), so the sentence is true by construction — but the coupling is to the constant, not to the clamp expression. Acceptable now; a dynamic-cap story must move both. Third attack: the heading at 28px is an eyeballed presentation choice nobody verified visually — true, and unverifiable in this node-only suite; the deviation is logged, size is unpinned by design, and the dev-port trap makes a careless screenshot worse than none. Fourth attack: Dev wrote comments containing the exact strings the tests grep — a deliberate saboteur could satisfy TEA's presence checks with comments alone. The auditor's M5 proved two assertions are indeed comment-foolable, and only the draw-call parser catches deletion; that is finding 5, and the reason it is non-blocking is that the mutation still dies. Fifth attack: the audit record — the gate is green, every quote resolves, and yet the record now claims V-018 fully fixed when its layout half lives. The gate cannot see prose overclaims; only the diff audit caught it. That attack LANDED — it is the blocking finding. The devil rests having earned one conviction.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | V-018 stamped `remediated_by: "tp1-20"` while its layout aspect (hi-score under P1's score with level below; SCHIIN GREEN initials field) is a live, un-fixed divergence — a phantom fix frozen into the audit record | `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` (V-018) | Apply the half-remediated pattern (W-030/tp1-24): REMOVE `remediated_by` from V-018 and hand re-point its `ours` onto living evidence of the layout divergence (the hi-score top-centre draw, render.ts:900 `vecText(ctx, String(hi).padStart(6, '0'), W / 2, 22, …)`), leaving claim/reasoning untouched. Run `reanchor-citations.mjs` (expect 0 lost) + full suite (citations must stay green). Log a Delivery Finding for the audit curators noting the colour/caption aspects ARE fixed by tp1-20 (claim prose deliberately unedited). Do NOT touch the other four stamps — V-033/034/035/036 are fully remediated and honest. |

**Non-blocking (recorded as Delivery Findings, not fix-required this round):** [MEDIUM] comment-foolable ENTER presence assertions (TEA follow-up); [LOW] SC-006 frozen-claim tension (none).

**Data flow traced:** `s.score`/`s.level`/`s.highScoreTable[0].score`/`s.entry.initials` (internal sim state, initials A-Z-restricted by core) → `String(...)`/literals → `vecText`/`drawGlowText` with constant palette colours → stroke canvas (no DOM/HTML sink; safe — no external input can reach a draw).
**Pattern observed:** fields bound to named palette slots (`GLYPH_HEX.green` at render.ts:895) rather than raw hexes — the right idiom for post-tp1-12 colour fidelity, and what keeps the family-classified tests meaningful.
**Error handling:** `if (!entry) return` at render.ts:834 — absent entry renders heading only, no crash; empty high-score table falls back to 0 via a `.length` ternary (render.ts:899), not a falsy-value trap.
**Verification integrity:** 10/10 auditor mutations killed in an isolated worktree + 1 re-confirmed serially by me in the main tree (restored, tree clean); preflight 1621/1621 + build clean.

**Handoff:** Back to Julia (Dev) for the single audit-record fix (green rework).

## Dev Assessment — Rework Round 1

**Implementation Complete:** Yes (the one required fix, exactly as specified)

**Files Changed:**
- `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` — V-018: `remediated_by` REMOVED; `ours` re-pointed from the frozen historical quote onto living evidence of the un-fixed layout aspect (render.ts:900, the hi-score top-centre `vecText` — byte-matched). `claim`/`reasoning`/`title`/`source` untouched. V-033/V-034/V-035/V-036 stamps untouched (verified in the edit script's output). The diff is 3+/4- lines, all inside V-018's `ours` + the stamp line — no tool re-serialization this time (hand edit, no `--write` needed since reanchor reported 0 drift).

**Verification:** reanchor dry-run: **105 already correct, 0 re-anchored, 0 lost** (V-018 re-joined the live-checked set — was 104). Full suite via testing-runner (RUN_ID tp1-20-dev-green-3): **1621/1621 green, 136 files, citations 25/25 green**, lint + typecheck PASS.
**Branch:** fix/tp1-20-hud-messages (pushed, commit cd6d160)

**Curator note (per the Reviewer's Improvement finding):** V-018's claim prose now reads partly historical — its cycling-colour and invented-caption aspects WERE fixed by tp1-20 (see commits ef0e113/cd6d160 and the archived session); only the layout aspect (hi-score placement, level position, SCHIIN initials field) remains live, and the finding's `ours` now cites it. Claim deliberately unedited per the no-prose-edits rule.

### Design Deviations — Dev (rework round 1)
- **V-018 left OPEN with ours re-pointed, rather than stamped**
  - Spec source: Reviewer Assessment round 1 (session file) + tempest CLAUDE.md citation-gate rules
  - Spec text: "REMOVE remediated_by from V-018 and hand re-point its ours onto living evidence of the layout divergence … leaving claim/reasoning untouched"
  - Implementation: exactly that — stamp removed, ours → render.ts:900 hi-score top-centre draw, byte-matched
  - Rationale: the half-remediated split (W-030/tp1-24); a multi-aspect finding with a live aspect must stay open and cite the living divergence
  - Severity: minor
  - Forward impact: the future HUD-layout story remediates V-018 (its ours already points at the right evidence); TEA's layout Gap finding names the scope

**Handoff:** To The Thought Police (Reviewer) for re-review (round 2).

## Reviewer Assessment — Round 2

**Verdict:** APPROVED

**Scope:** the delta since round 1 (`ef0e113..cd6d160`) — everything else was verified in round 1 (ROM re-derivation MATCH on every field/string, 10/10 mutations killed, findings-diff laundering audit clean bar V-018, preflight 1621/1621).

**Round-2 verification (each done by me, serially, tree restored after):**
1. `[VERIFIED]` the rework diff is EXACTLY the ordered fix — one hunk in pair-2's V-018: `ours.line` 891→900, `ours.verbatim` re-spelled to the current hi-score top-centre draw, `remediated_by` line removed; `claim`/`reasoning`/`verdict`/`recommendation` byte-identical; V-033/034/035/036 not in the diff at all. Complies with the anti-laundering rule and the W-030/tp1-24 half-remediated pattern as specified.
2. `[VERIFIED]` byte-match — V-018's new verbatim equals render.ts:900 exactly (programmatic comparison, True).
3. `[VERIFIED]` the gate BITES on the re-opened finding — mutation: corrupted V-018's verbatim → `citations.test.ts` 2 failed; restored → 12/12 green, `git status` clean. V-018 rejoined the live-checked set (reanchor now reports 105 correct / 0 lost, was 104).
4. `[VERIFIED]` full suite green post-rework — testing-runner RUN_ID tp1-20-dev-green-3: 1621/1621, 136 files, citations 25/25, lint + typecheck PASS.
5. `[VERIFIED]` the curator note the round-1 Improvement finding required is recorded (Dev rework assessment), and the claim prose was correctly left unedited.

**Subagents (round 2):** not re-spawned — the delta is a 3+/4- line JSON edit fully covered by the four serial verifications above plus the fresh testing-runner run; round 1's table and independent-auditor evidence stand for the unchanged remainder. [EDGE][SILENT][TEST][DOC][TYPE][SEC][SIMPLE][RULE] coverage is unchanged from round 1.

**Non-blocking residue (stands as recorded, does not block):** TEA follow-up to harden the two comment-foolable ENTER presence assertions; the HUD-layout follow-up story (V-018's living scope — its `ours` now points future work at the right evidence); curator note on V-018's part-historical claim; reanchor-tool unicode normalization improvement.

**Deviation audit (round 2):**
- **Dev rework: V-018 left OPEN with ours re-pointed** → ✓ ACCEPTED by Reviewer: exactly the ordered fix, verified four ways above.

**Handoff:** To Winston Smith (SM) for finish-story. Reminder for SM: PR creation + merge need the user's authorization (the auto-mode classifier blocks self-merge of AI-authored+AI-reviewed PRs).

## Impact Summary (compiled by SM at finish, round-2-aware)

**Delivered:** tempest PR #136 (squash `48c1d8b` on develop) — HUD field colours fixed per the ROM SCORES template (GREEN score, GREEN hi-score, BLUE level; lives already yellow, now pinned), the three invented captions removed, and four ROM message strings shipped verbatim in their Messages-table colours (ENTER YOUR INITIALS/RED, SPIN KNOB TO CHANGE/TURQOI, PRESS FIRE TO SELECT/YELLOW, RANKING FROM 1 TO n/RED with n = MAX_SELECT_LEVEL). Findings V-033/V-034/V-035/V-036 remediated; V-018 partially remediated (colours+captions) and deliberately left OPEN with its `ours` re-pointed at the living layout divergence.

**Review outcome:** APPROVED (round 2). Round 1's single HIGH — V-018 stamped fully remediated while its layout aspect lives — was FIXED in `cd6d160` (stamp removed, citation re-pointed, gate-bite mutation-proven). It is NOT an open blocker; do not resurrect it from the round-1 text above.

**Blocking:** none.

**Open follow-ups (all non-blocking, for backlog grooming):**
1. HUD layout story — hi-score under P1's score, level below, GREEN SCHIIN initials field (V-018's remaining scope; its `ours` already cites the evidence). From TEA + Reviewer findings.
2. TEA test-hardening — two ENTER-string presence assertions in tp1-20.hud-messages.test.ts are comment-satisfiable; anchor on parsed draw calls. From Reviewer finding (auditor mutation M5).
3. PM: amend epic AC-3 to list V-034's string the description already subsumes. From TEA finding.
4. Audit curators: note on V-018 that tp1-20 fixed its colour/caption aspects (claim prose deliberately unedited). From Reviewer finding.
5. Tooling: reanchor-citations.mjs unicode normalization buries diffs; consider escaped-ASCII serialization. From Dev finding.