---
story_id: "jt13-3"
jira_key: "jt13-3"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-3: Entry screen 'new mount every' line: read the setting or remove it

## Story Details
- **ID:** jt13-3
- **Jira Key:** jt13-3
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/jt13-3-attract-extra-mount-line
- **PR:** none
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T00:44:31Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T00:15:57Z | 2026-08-18T00:18:12Z | 2m 15s |
| red | 2026-08-18T00:18:12Z | 2026-08-18T00:25:36Z | 7m 24s |
| green | 2026-08-18T00:25:36Z | 2026-08-18T00:31:31Z | 5m 55s |
| review | 2026-08-18T00:31:31Z | 2026-08-18T00:44:31Z | 13m |
| finish | 2026-08-18T00:44:31Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA/red] Conflict, non-blocking — context mis-cites the ROM source file.** The context's "Related Code References" line names `JOUSTRV4.SRC:63-79` for the attract OUTBCD sequence. That is wrong: the sequence (`TSTA/BEQ`, `MSW17`, `LDX #REPLAY`, `OUTBCD`, `MSW18`) lives in `ATT.SRC:63-79` — verified by reading `reference/williams-source/joust/ATT.SRC`. `JOUSTRV4.SRC:63` is unrelated. The RULED-SPEC banner at the top of the context cites `ATT.SRC:63-79` correctly; only the reference-list line is wrong. Tests cite `ATT.SRC`. No scope impact.
- **[TEA/red] Gap, non-blocking — `REPLAY` is a CMOS level (BCD 20), the port stores full points (20,000).** ROM `REPLAY` (EQU.SRC:110) holds the operator replay LEVEL as BCD thousands (20); `OUTBCD` prints it directly ("20"). The port's `REPLAY_INTERVAL = 20_000` is the same setting in full points. The derivation the tests pin — `extraMountThousands(interval) = interval / 1000` — bridges the two representations so the displayed number is 20. Dev: keep this the divide-by-1000 mapping, not a raw REPLAY_INTERVAL print.

### Reviewer (code review)
- **Improvement** (non-blocking): the test helper `plugins/joust/tests/helpers/title-contract.ts`'s hand-duplicated `TitleScreenLayout` type is now missing the new `replayLevel` field, and the colour-threading sweep in `plugins/joust/tests/title.test.ts` (`for (const line of ['copyright','extraMount','pointsSuffix'])`) is a hardcoded field enumeration that a same-kind third future field would silently miss. No coverage is lost today (`attract-extra-mount-jt13-3.test.ts` covers `replayLevel` colour-threading independently). Affects those two pre-existing files — worth syncing in a future hygiene pass; out of scope for this story's changed files. *Found by Reviewer during code review (rule-checker #19).*
- **Improvement** (non-blocking): `extraMountThousands` has no domain guard on its argument (`extraMountThousands(0)` → "0", negatives/NaN → wrong glyphs, not a crash). Currently unreachable — `REPLAY_INTERVAL` is a fixed non-configurable const — so blast radius is zero. If a configurable replay level is ever added, add the ROM's `TSTA/BEQ` skip-when-zero behaviour then. Affects `plugins/joust/src/core/title.ts` (future). *Found by Reviewer during code review (rule-checker #21).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None.

### Reviewer (audit)
- No spec deviations were logged, and I found none: the implementation matches the ruled seam exactly (READ THE SETTING; number in core, placement in shell). → ✓ Nothing to stamp.
- **Dev's test-file edit (removing the RED-phase probe casts)** was disclosed in the Dev Assessment, not logged as a Design Deviation. It is a test-mechanics cleanup, not a spec deviation — I verified it is type-only and weakened no assertion (the glyph-identity, width, colour, and value checks are unchanged). → ✓ ACCEPTED.

## Tea Assessment

**RED delivered.** New file `plugins/joust/tests/attract-extra-mount-jt13-3.test.ts` — 11 tests, **10 fail / 1 passes** (the one pass is the intended regression fence: `renderTitleScreen` already paints `screen.extraMount`). Full joust project otherwise green: 203 files / 3745 tests pass; the pre-existing `title.test.ts` still passes, confirming the design is additive. RED committed `86fcd916`, pushed.

**Every failure is self-describing and names what GREEN must add:**
- `core/game must export REPLAY_INTERVAL` (today an un-exported `const`).
- `core/title must export a pure extraMountThousands(interval)` — the OUTBCD "thousands of replay points" derivation.
- `core/title` must cite `OUTBCD` (the ROM anchor for the derivation).
- `layoutTitleScreen` must expose a `replayLevel` `LaidOutText` rendering "20" (two FONT57 digit glyphs).
- `renderTitleScreen` must paint `screen.replayLevel` AND `screen.pointsSuffix`, not only the prefix.

**The seam pinned (core/shell boundary, jt1-7 — number SELECTION is core DATA, pixel PLACEMENT is shell):**
1. `core/game`: `export const REPLAY_INTERVAL = 20_000`.
2. `core/title`: `export function extraMountThousands(interval: number): number` = `interval / 1000` (pure; cite `ATT.SRC:63-79` / `OUTBCD`).
3. `shell/titleScreen`: `layoutTitleScreen` gains a `replayLevel: LaidOutText` slot — `layoutText('FONT57', String(extraMountThousands(REPLAY_INTERVAL)), colour)` — between the UNCHANGED `extraMount` and `pointsSuffix` slots (so `title.test.ts` stays green).
4. `main.ts` `renderTitleScreen`: paint `extraMount` → `replayLevel` → `pointsSuffix` adjacently, so the line reads "EXTRA MOUNT EVERY 20,000 POINTS".

**Design notes for Dev (Korben):**
- Keep the divide-by-1000 mapping: ROM `REPLAY` is BCD 20 (thousands); the port stores 20,000 full points (see Delivery Finding #2). Displaying `REPLAY_INTERVAL` raw would print "20000,000 POINTS".
- COMPOSE, don't re-type: reuse `TITLE_EXTRA_MOUNT` / `TITLE_POINTS_SUFFIX`; do not introduce a new "EXTRA MOUNT EVERY 20,000 POINTS" literal (AC-4; `title.test.ts` AC-5 already bans re-hardcoding those strings in the shell).
- The ROM line is conditional (`TSTA/BEQ` skips it when replay level is 0), but the port has no operator menu and `REPLAY_INTERVAL` is a fixed nonzero const, so the skip branch is unreachable — out of scope. Do not add a "hide when 0" path.
- Positioning (x-offsets for the three adjacent parts) is by-eye shell tuning like the rest of `renderTitleScreen`; the tests pin the DATA and the wiring, not pixel coordinates.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`):**
- **#8 Test quality** — every test has a meaningful assertion; no `let _ =`, no `assert(true)`, no `is*` on an always-fixed value. The derivation is mutation-guarded: `extraMountThousands(30_000)===30` and `(50_000)===50` kill a hardcoded `return 20`.
- **#15 Source-text matches the CLAIM, not a token** — the `main.ts` wiring scan strips comments first and matches the specific painted property accesses `screen.replayLevel` / `screen.pointsSuffix` (not a loose "replayLevel" token that prose could satisfy); the layout behaviour is independently verified for real.
- **#16 Composition, not replacement** — the line is pinned as three composed parts reusing the existing core strings, not a single re-typed literal.
- **#26 Non-local assertion terms** — the compose test anchors on the external literal `'EXTRA MOUNT EVERY 20,000 POINTS'` (the ROM value), not purely on the module's own exports.

**Handoff → Dev (Korben) for GREEN.** Make the 10 reds pass with the seam above; keep `title.test.ts` and the rest of the joust suite green.

## Sm Assessment

**Story:** jt13-3 — the attract/entry screen "EXTRA MOUNT EVERY" line (2pt, joust, tdd). The phase pointer read `setup` on arrival; sibling probes were clean (no branch, session, or PR for jt13-3 before I claimed it — a-1 owns the unrelated jt13-5).

**Premise measured before setup (the either/or was RULED, not left open):**
- The story frames an either/or — read the setting and display the value, OR remove the line — and asks to confirm the original attract screen first.
- ROM ground truth: the MARQUE routine (`reference/williams-source/joust/ATT.SRC:63-79`) prints the FULL line and reads the operator replay level — `LDX #REPLAY` → `MSW17` ("EXTRA MOUNT EVERY ", `MESSEQU.SRC:158`) → `OUTBCD` ("DISPLAY THOUSANDS OF REPLAY POINTS") → `MSW18` (",000 POINTS", `MESSEQU.SRC:157`). The authentic line is "EXTRA MOUNT EVERY <N>,000 POINTS".
- Port default: `REPLAY_INTERVAL = 20_000` (`plugins/joust/src/core/game.ts:223`, seeds `extraManAt` at `game.ts:295`), so the default line is "EXTRA MOUNT EVERY 20,000 POINTS".
- The defect: `renderTitleScreen()` (`plugins/joust/src/main.ts:312-318`) paints only `screen.extraMount` ("EXTRA MOUNT EVERY ") at `main.ts:317` and never paints the numeric value or `screen.pointsSuffix` (",000 POINTS"). The line renders as a dangling "EXTRA MOUNT EVERY" — the "wrong" the story cites.

**Ruling (ROM-always-wins; no user question — offering ROM-vs-shipped as a choice is disallowed):** READ THE SETTING and render the full phrase. Removing the line would be a fidelity regression — the ROM shows it by default. The "remove the line" half of the either/or is DEAD. Recorded in the context file with a `⚠ RULED SPEC` banner citing `ATT.SRC:63-79`.

**Derived ACs (story `acceptance_criteria` was null; sm-setup derived four toward the ruled branch):**
1. The attract line renders the complete "EXTRA MOUNT EVERY <N>,000 POINTS" with no gaps between prefix, number, suffix.
2. N is SOURCED from the replay/extra-man setting (`REPLAY_INTERVAL`/`extraManAt`), default 20,000 → N=20; not a hardcoded literal divorced from the setting.
3. No fidelity regression — neither the suffix nor the numeric value may be hidden/omitted.
4. Reuse the committed core data (`TITLE_EXTRA_MOUNT`, `TITLE_POINTS_SUFFIX`, `REPLAY_INTERVAL`/`extraManAt`); do not invent new strings.

TEA/Dev own the exact seam (the number/string SELECTION is core DATA under the jt1-7 boundary; only pixel placement is the shell's). I did not over-specify implementation.

**Handoff → TEA (Leeloo) for RED.** The RED test should pin that the attract render emits the full phrase including the setting-sourced thousands value and the ",000 POINTS" suffix, and should fail against the current dangling render. Probe RED first to confirm it fails for the right reason.
## Dev Assessment

**GREEN delivered.** All 11 tests in `attract-extra-mount-jt13-3.test.ts` pass; full joust project green (204 files / 3755 tests); `npm run lint` (tsc --noEmit) clean; **visually confirmed** on the attract title screen (served this tree on scratch port 5293, Playwright screenshot) — the line reads "EXTRA MOUNT EVERY 20,000 POINTS", centred, with the three parts abutting cleanly. Committed `131fb82f`, pushed.

**Implemented exactly the seam TEA pinned (4 source edits):**
1. `core/game.ts` — `const REPLAY_INTERVAL` → `export const REPLAY_INTERVAL` (no value change).
2. `core/title.ts` — added pure `extraMountThousands(replayInterval) = Math.floor(replayInterval / 1000)`, cited to `OUTBCD` / `ATT.SRC:78` (the ROM "thousands of replay points" derivation). No clock, no shell surface — stays inside the jt1-7 core boundary.
3. `shell/titleScreen.ts` — `TitleScreenLayout` gains `replayLevel: LaidOutText`; `layoutTitleScreen` lays out `String(extraMountThousands(REPLAY_INTERVAL))` (= "20") in FONT57 with the caller's colour. `extraMount`/`pointsSuffix` slots UNCHANGED, so `title.test.ts` AC-4 stays green.
4. `main.ts` `renderTitleScreen` — computes the combined width of the three parts, centres them as one line, and paints `extraMount` → `replayLevel` → `pointsSuffix` at cumulative x-offsets (FONT57 is fixed-width, so they abut exactly).

**One test-file edit, disclosed:** the RED file used `layoutTitleScreen(...) as Record<string, unknown>` to probe the not-yet-existent `replayLevel` field. Once the field became a typed member of `TitleScreenLayout`, tsc rejected that cast (TS2352). I removed the five obsolete probe casts and access the typed layout directly — **type-only cleanup, no assertion changed, no assertion weakened** (the same values are checked: glyph identity for '2'/'0', width, colour threading, non-empty ops). Verified the file still fails on a reverted implementation before trusting green.

**Scope held (minimalist):** no operator-menu / "hide when replay=0" path (the port's `REPLAY_INTERVAL` is a fixed nonzero const — the ROM's `TSTA/BEQ` skip branch is unreachable here, per TEA's note); no new ROM string literal (the phrase is COMPOSED from the existing core strings + the derived number); positioning is by-eye shell tuning like the rest of `renderTitleScreen`.

**Handoff → Reviewer (Zorg).** The either/or was ruled to READ THE SETTING per ROM (`ATT.SRC:63-79`); verify the derivation reads the setting (not a hardcoded 20), the boundary is intact, and the composed line matches the ROM.
## Subagent Results

Enabled on this project (`workflow.reviewer_subagents`): preflight, security, rule_checker. The other six are disabled — pre-filled as Skipped and hand-covered (see Rule Compliance / Devil's Advocate).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 3 gates green: joust 3755, lint exit 0, orchestrator 505 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered: straight-line code, `extraMountThousands` is total |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered: no error paths; `readMain()` throws loudly |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered: see Rule Compliance #8/#18/#26 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered: fixed stale comment (#17) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered: `replayLevel` is `readonly LaidOutText`, matches siblings |
| 7 | reviewer-security | Yes | clean | none | N/A — pure pixel `fillRect`, no injection sink; number is a fixed const |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered: removed the redundant probe casts |
| 9 | reviewer-rule-checker | Yes | findings | 4 (all Low, test-hygiene) | confirmed 3 (fixed in-review), dismissed 1 (rationale below) |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 3 confirmed (all Low, fixed in-review commit `cc078de7`), 1 dismissed (with rationale), 0 blocking

**rule-checker dispositions:**
- #1 (Record casts, high) → CONFIRMED, Low — fixed: direct typed access.
- #17 (stale "un-exported const" comment, med) → CONFIRMED, Low — fixed: comment deleted.
- #15/#25 (`toContain('ATT.SRC')` vacuous, high) → CONFIRMED, Low — fixed: citation guard scoped to the `extraMountThousands` docstring so it mutation-tests the new cite.
- #18 (`mainCode()` comment-stripper reimplements the naive regex) → DISMISSED: it is the **established joust idiom** for source-scanning `main.ts` (identical `.replace(/\/\/.*$/,'')` in `title-boot-jt11-16-wiring.test.ts`); the AST walk is `purity-scanner.ts`'s tool for scanning core files, a different context. The flagged failure mode (a `//` inside a string literal in `main.ts`) is confirmed unreachable today. Diverging would be inconsistent over-engineering for a 2pt fix.

## Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (33 checks incl. project additions) + CLAUDE.md (jt1-7 purity, comment-citation, ROM-string reuse). Enumerated every changed symbol:

- **#31 Core purity (jt1-7):** `extraMountThousands` (core/title.ts) is pure — `Math.floor`, no `Date`/`Math.random`/DOM/shell import. `Math.floor` is not in `purity-scanner.ts`'s BANNED set. COMPLIANT (VERIFIED — the joust `purity` test is green in the 3755 suite).
- **#33 ROM-string reuse:** the shell composes `String(extraMountThousands(REPLAY_INTERVAL))` and reuses `TITLE_EXTRA_MOUNT`/`TITLE_POINTS_SUFFIX` verbatim; no new ROM phrase literal. COMPLIANT.
- **#32 Comment citations:** `grep '\.ts:[0-9]+'` over the diff = 0; every added cite is ROM `.SRC` (exempt). COMPLIANT.
- **#1 Type-safety escapes:** the RED-phase `as Record<string, unknown>` casts were the only escapes — removed in review. Now zero casts. COMPLIANT (post-fix).
- **#2 Generic/interface:** `replayLevel: readonly LaidOutText` matches its sibling fields. COMPLIANT.
- **#5 Module/`.js` extensions:** all new imports carry `.js`; type-only imports marked `import type`. COMPLIANT.
- **#8/#18/#26 Test quality:** assertions are meaningful and mutation-guarded (`extraMountThousands(30_000)===30`/`(50_000)===50` kill a hardcoded 20); glyph-identity `toBe(FONT57.glyphFor('2'))` is sound (stable Map refs); the compose test anchors on the external ROM literal. No vacuous assertions. COMPLIANT (post-fix to the citation guard).
- **#14 Derived edges:** `renderTitleScreen`/`extraMountThousands` are branch-free — rule N/A.
- **#21 Degenerate numeric input:** `extraMountThousands` has no range guard — noted as a non-blocking future Improvement (unreachable today; fixed const). Not a violation at current blast radius.

## Devil's Advocate

Suppose this code is broken. Where would it hurt? First, the number: `extraMountThousands` blindly divides by 1000 and floors. If some future story wires a configurable replay level and passes `0`, the screen would proclaim "EXTRA MOUNT EVERY 0,000 POINTS" — nonsense the real ROM avoids with its `TSTA / BEQ 20$` skip. A negative or `NaN` would emit `-` or `NaN` glyphs, some of which FONT57 lacks and silently drops, producing garbled pixels rather than a crash. Today this is unreachable because `REPLAY_INTERVAL` is a fixed `export const`, but the function's own docstring and the shell comment both call it "the setting," inviting exactly that future misuse — which is why I filed it as a Delivery Finding rather than ignoring it. Second, layout: `renderTitleScreen` now centres three parts by summing their widths and abutting them. If FONT57 were NOT fixed-width, the cumulative x-offsets would drift and the parts would overlap or gap; I confirmed FONT57 advances by a constant cell (`cellWidth`) for every glyph including space, and I saw the composed line render cleanly in a live screenshot, so the abutment holds. Third, a confused maintainer: the trailing space in `TITLE_EXTRA_MOUNT` is load-bearing (it separates "EVERY" from "20") — a well-meaning "trim trailing whitespace" lint fix on that constant would silently glue the words. The existing `title.test.ts` pins that width to the string length, so such a change would redden — good. Fourth, the tests: could they pass on broken code? The `main.ts` wiring scan matches `screen.replayLevel`/`screen.pointsSuffix` in the comment-stripped function body; a paint that references the property but paints it off-screen or with zero width would still pass the source-scan — but the shell-layout tests independently assert the glyphs and widths are real, and the screenshot confirms on-screen placement, so the combination is not foolable by a no-op reference. Fifth, the boundary: `extraMountThousands` lives in core; if a later edit reached for the shell's `layoutText` there, purity would break — the purity test guards that. Nothing here rises to a correctness defect; the residue is all future-proofing, filed and non-blocking.

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** A faithful, minimal 2-point fix. The attract "EXTRA MOUNT EVERY" line now renders the full ROM phrase "EXTRA MOUNT EVERY 20,000 POINTS", with the number read from the `REPLAY_INTERVAL` setting via a pure core derivation and painted in the shell — matching `ATT.SRC:63-79` (MSW17 → OUTBCD → MSW18) and the ruled READ-THE-SETTING branch. Production code is clean against every project rule; all subagent findings were Low test-hygiene and are fixed or filed.

**Data flow traced:** `REPLAY_INTERVAL` (core/game const 20000) → `extraMountThousands` (core/title, ÷1000 → 20) → `String("20")` → `layoutText` FONT57 (shell) → `renderTitleScreen` paints prefix+number+suffix (main). Safe: the value is a fixed compile-time constant, no untrusted input reaches it (confirmed by [SEC] reviewer-security — pure `fillRect`, no injection sink).

**Pattern observed:** correct use of the jt1-7 core/shell seam — number SELECTION in core, pixel PLACEMENT in shell — and the layout composes from existing core strings (no re-hardcoded ROM text), at `plugins/joust/src/shell/titleScreen.ts` and `plugins/joust/src/main.ts`.

**Error handling:** no new error paths; `extraMountThousands` is total; `readMain()` in the test throws loudly on a missing file. Degenerate numeric input to `extraMountThousands` is unreachable today (fixed const) and filed as a non-blocking future Improvement.

**Findings by source (enabled + hand-covered):**
- [RULE] rule-checker: 4 findings, all Low test-hygiene — 3 confirmed & fixed in-review (`Record` casts #1, stale comment #17, vacuous `toContain('ATT.SRC')` citation guard #15/#25), 1 dismissed (#18, established idiom).
- [SEC] security: clean — no injection/secrets/auth surface.
- [TEST] hand-covered: assertions meaningful and mutation-guarded; no vacuity (post-fix).
- [DOC] hand-covered: stale "un-exported const" comment removed; new comments cite ROM `.SRC` only.
- [TYPE] hand-covered: `replayLevel` is `readonly LaidOutText`; casts removed.
- [SIMPLE] hand-covered: probe casts simplified to direct typed access.
- [EDGE] hand-covered: branch-free code; degenerate `extraMountThousands` input filed (unreachable).
- [SILENT] hand-covered: no swallowed errors or silent fallbacks.

**Severity:** no Critical and no High findings. Low findings fixed in-review commit `cc078de7`. Full joust suite 3755 green, lint exit 0, orchestrator 505 green; the rendered line was verified in a live screenshot.

**Handoff:** To SM (Ruby Rhod) for finish-story.
## Impact Summary

**jt13-3 — attract "EXTRA MOUNT EVERY 20,000 POINTS" line — DONE.** Single TDD round, APPROVED by Reviewer (Zorg) with no Critical/High; 3 Low test-hygiene findings fixed in-review. Code PR #527 merged to develop (`7d19b68b`).

- **Delivery:** the attract/title line now renders the full ROM phrase, with the number read from `REPLAY_INTERVAL` via a pure core derivation (`extraMountThousands`) and painted in the shell. Matches `ATT.SRC:63-79`. Visually confirmed.
- **Forward impact (non-blocking, filed):** (1) `extraMountThousands` has no domain guard — harmless while `REPLAY_INTERVAL` is a fixed const; add the ROM `TSTA/BEQ` skip-when-zero if a configurable replay level is ever wired. (2) `tests/helpers/title-contract.ts` `TitleScreenLayout` and the `title.test.ts` colour-threading enumeration don't yet include `replayLevel` — no coverage lost (covered in the new file); sync in a future hygiene pass.
- **Correction to tracking:** the context's "Related Code References" mis-cited `JOUSTRV4.SRC:63-79`; the real source is `ATT.SRC:63-79` (the RULED banner was already correct).
