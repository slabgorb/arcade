---
story_id: "df7-5"
jira_key: "df7-5"
epic: "df7"
workflow: "tdd"
---
# Story df7-5: HUD + scanner render

## Story Details
- **ID:** df7-5
- **Jira Key:** df7-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df7-5-hud-scanner-render
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T15:44:56Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T14:38:04Z | 2026-08-19T14:41:02Z | 2m 58s |
| red | 2026-08-19T14:41:02Z | 2026-08-19T14:53:44Z | 12m 42s |
| green | 2026-08-19T14:53:44Z | 2026-08-19T15:08:57Z | 15m 13s |
| review | 2026-08-19T15:08:57Z | 2026-08-19T15:25:30Z | 16m 33s |
| green | 2026-08-19T15:25:30Z | 2026-08-19T15:34:10Z | 8m 40s |
| review | 2026-08-19T15:34:10Z | 2026-08-19T15:44:56Z | 10m 46s |
| finish | 2026-08-19T15:44:56Z | - | - |

## SM Assessment

**Story:** df7-5 — HUD + scanner render (3pt, p2, tdd/phased). Reached via `/pf-work df7-7`; substituted
to df7-5 by user ruling because df7-7 is blocked on this story + df7-4 (see Delivery Findings).

**Ownership probes (clean):** no `df7-5` remote branch and no `df7-5` session in any `a-*` checkout at
setup. Claim pushed: commit `5320e53b` on `feat/df7-5-hud-scanner-render`, branch pushed to origin.

**Premise verified against current tree** (details in Delivery Findings): the df5-1 scanner projection
(`core/scanner.ts`) and df5-3 score/men (`core/score.ts`) exist; nothing in `shell/` paints the scanner or
a HUD today. The story description is accurate and safe as TEA's Background.

**Scope for TEA (red phase):** write failing tests for the shell painting (a) the scanner strip/bezel from
the df5-1 blip list (`projectScanner`), and (b) the score / men (lives) / wave HUD figures from df5-3 —
into `plugins/defender/src/shell/` (render entry `render.ts`). Hard constraints: the core/shell purity
boundary (core owns no shell state, the shell reads and paints), colour by **df2 palette INDEX only** (no
hex literals), ROM citation `*SCANNER BEZEL defender/AMODE1.SRC:1225` + HUD layout, and **ADR-0005 —
no full-frame strobe** in any painted state.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **SM / routing (non-blocking):** This story was reached via `/pf-work df7-7`. df7-7 (the full-lifecycle
  visual playtest) is the df7 epic's capstone and is **blocked** — its ACs require screenshotting a
  populated HUD/scanner (df7-5, THIS story) and the hall-of-fame name-entry (df7-4), both still in
  backlog. User ruling (2026-08-19): do df7-5 first (most load-bearing prerequisite — the HUD is on-screen
  across game/death/game-over), then df7-4, then return to df7-7. So df7-5 unblocks half of df7-7's captures.
- **SM / premise verification (non-blocking):** df7-5's premise "scanner projected in core but drawn
  NOWHERE today" was verified TRUE against the current tree before setup: `plugins/defender/src/core/scanner.ts`
  exports `projectScanner(objects, camera): Blip[]` (df5-1); `plugins/defender/src/core/score.ts` exports
  `ENEMY_POINTS`, `STARTING_MEN=3`, `EXTRA_MAN_EVERY`, `bonusPerHuman` (df5-3); a `scanner|blip` grep over
  `plugins/defender/src/shell/` returns nothing — the shell paints neither the scanner nor a HUD today.
  Shell render entry is `plugins/defender/src/shell/render.ts`. The description is safe to consume as current fact.
- **TEA / premise REFUTED, scope NARROWED (non-blocking, corrects the SM finding above):** the SM check
  grepped only `src/shell/` and missed where the drawing actually lives — `src/core/scene.ts`. **df5-7
  already shipped** `drawScanner` (live-attacker blips, coloured by palette INDEX) and `drawHud`
  (score + men) inside the pure `composeFrame`, and SimState already carries `wave`. df5-7's own comment
  (`scene.ts:186-192`) explicitly LEFT to df7: *"the scanner SCREEN-ADDRESS/bezel/player-blip ... remain
  df7's."* So the story's "drawn NOWHERE today" (description + AC1) is **stale**: the attacker-blip +
  score/men render is done and green. The genuine, un-built df7-5 delta is only:
  (1) **AC1 — the scanner BEZEL** (the radar-strip frame, drawn regardless of attackers, `*SCANNER BEZEL`
  AMODE1.SRC:1225; the 64-col strip :1223 is already claimed);
  (2) **AC2 — the WAVE number** in the HUD (`drawHud` writes score + men only; `composeFrame` reads
  `state.wave` for nothing);
  (3) **AC3 — the bezel's df1-1 citation** (AMODE1.SRC:1225, absent from `claims/15-scanner.json`).
  **Forward impact:** the story reads bigger than it is (~1pt of real delta, not 3). RED targets ONLY
  the un-built delta — re-asserting the already-green blips/score/men would be vacuous RED. **Player-blip
  flag:** the ROM's player blip (:1242-1257) is named as df7's in the same comment but is **NOT in df7-5's
  ACs**; left untested here for a Reviewer/SM scope ruling rather than silently pulled in.
- **TEA / draw lives in CORE not shell (non-blocking clarification of AC wording):** AC2/AC3 say "the shell
  paints". In this codebase the composition into palette INDICES is pure `core/scene.ts` (charset/objects/
  terrain/scanner all compose there and are purity-scanned); only the index→RGBA blit is shell (`render.ts`).
  df5-7 established this, `purity.test.ts` is green over `scene.ts`, and AC3 says "purity.test.ts stays
  green". GREEN therefore extends `composeFrame`/`drawScanner`/`drawHud` in **core** (reading state, owning
  none), NOT `shell/render.ts` — "the render is shell" means the decode, not the composition.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Corrected TEA bezel test from a ≥64-wide horizontal bar to the ROM's end-bracket rails**
  - Spec source: plugins/defender/tests/df7-5-hud-scanner.test.ts, AC1 bezel test ("a play state with NO live attacker still draws the radar-strip bezel frame")
  - Spec text: "its horizontal rule is a run of ≥ SCANNER_COLUMNS same-index cells in the top band" (TEA's `longestTopBandRun(...) >= SCANNER_COLUMNS`)
  - Implementation: read the ROM — *SCANNER BEZEL / MTX (AMODE1.SRC:1225-1233) writes $9090/$0909 (palette index 9) at SCANH+$4C01 and SCANH+$5301, i.e. end-bracket marks at the strip's TWO ENDS, not a full-width bar. Implemented `drawScannerBezel` as WHITE vertical rails at the strip's left/right ends (attacker-independent) and rewrote the test to assert a vertical bezel rail (run ≥ 3, ±1 col) at BOTH ends of the centred 64-column strip; replaced `longestTopBandRun` with `verticalRun`.
  - Rationale: ROM fidelity outranks the test's proxy — a 64-wide index-9 rule is geometry the ROM never draws (the visible radar frame in Defender is end-caps, not a solid box); implementing one to satisfy the proxy would invent geometry.
  - Severity: minor
  - Forward impact: none — the corrected test still fails without a bezel and passes with the faithful one; df7-7's "populated HUD + scanner" screenshot now shows a framed radar. The ROM player-blip (:1242-1257) remains out of df7-5's ACs (flagged in Delivery Findings).

## Subagent Results

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings; test quality assessed first-hand |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings; comments/citations assessed first-hand |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 LOW: drawScannerBezel x-clip asymmetry, non-exploitable | dismissed non-blocking (no reachable OOB path — main.ts:96, width 292) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 rule-#17 citation violations | both confirmed — re-verified against AMODE1.SRC |

## Reviewer Assessment

**Verdict:** REJECTED

_(round 1)_ The code is correct, the suite is green (1463/1463), lint clean, ROM values accurate, and
every project rule (purity, palette-index, no-backend) is honoured. The two findings are both citation
precision (lang-review #17) — the exact class the df7 epic keeps bleeding on, and comment_analyzer is
disabled here so nothing else catches them. Both are cheap and mechanical; fix targets are given verbatim
below.

**REQUIRED (round 1) — both confirmed by the Reviewer against the vendored source:**

1. [RULE] **[Citation integrity, #17] `SCAN-BEZEL` pins a banner, not the operative instruction it asserts.**
   `claims/15-scanner.json` → `SCAN-BEZEL` sets `source.line: 1225`, `verbatim: "*SCANNER BEZEL"` — a
   comment banner that carries NO bytes — while the claim TEXT asserts `$9090/$0909` at `SCANH+$4C01/+$5301`.
   Those bytes live at the operative lines `:1226-1233`. The df1-1 gate (`citations.test.ts`) re-opens only
   the pinned line, so it byte-verifies the banner and leaves the asserted values unprotected — a future
   silent edit of `$9090`→`$8080` in the prose would pass the gate. Every sibling claim in this file pins its
   operative instruction (SCAN-COLS→:1223 `CMPA`, SCAN-OBJCOL→:1270 `LDD OBJCOL`), and the df7-2-identity
   precedent pins operative lines (`:1103 LDA CREDIT`), never a banner.
   **Fix:** repoint `SCAN-BEZEL` to the operative line that carries the value the code uses —
   `BEZEL_COLOUR=9` is `$9090`'s high nibble, so pin `:1227`, `verbatim: "\tLDD\t#$9090"` (byte-verified),
   and reword the claim to describe what :1227 carries (the bezel mark / index-9 source), noting the MTX
   routine :1225-1233 frames the strip's ends. Then update `df7-5-identity.test.ts` — change the second
   assertion from `coveredBy(claims, amode1(1225))` to `amode1(1227)` (keep the :1223 anchor). Keeping a
   :1225 banner claim as a secondary pointer is fine, but the value-bearing operative line MUST be pinned.

2. [RULE] **[Stale self-citation, #17] the test header quotes a comment this same branch changed.**
   `df7-5-hud-scanner.test.ts:12` quotes *"df5-7's own comment (scene.ts:186-192) explicitly LEFT to df7
   'the scanner SCREEN-ADDRESS/bezel/player-blip'"* — but the GREEN commit rewrote scene.ts:186-192 to
   `"...SCREEN-ADDRESS/player-blip (:1242-1257)..."`, dropping "bezel". In the shipped tree the quoted phrase
   is no longer at the cited lines. **Fix:** update the test header to quote the CURRENT comment (or drop the
   line-range citation and point at the session Delivery Finding instead).

**NON-BLOCKING (optional, do NOT gate on these):**
- [SEC] **[LOW] `drawScannerBezel` x-clip asymmetry** (scene.ts:219-227): clips only `y >= fb.height`,
  not `leftX/rightX` vs `fb.width`, unlike sibling `drawScanner` (4-edge clip). Confirmed **not exploitable**
  — `fb.data` is a `Uint8Array` (out-of-range writes are silent no-ops, no memory corruption), and the sole
  call site (`main.ts:96`) passes `LOGICAL_WIDTH=292` > `SCANNER_COLUMNS=64`, so indices are always in-bounds.
  Optional one-line hardening for consistency; the AC doesn't require it and I won't gate on it.
- **[coverage note] AC4 "off-camera blip visible at the right position"** is covered transitively by the
  green df5-1-scanner unit tests (projection correctness) + df5-7's frame test (blip reaches the top band),
  not by a new df7-5 assertion. Acceptable — the behaviour predates this story and is guarded.

**What I verified myself (not just subagent claims):** read the full diff; re-opened AMODE1.SRC:1225-1233 &
1241-1258 (`*PLAYER BLIP OUTPUT`, the correctly-left-to-df7 player blip); confirmed the corrected bezel test
is behaviour-anchored (frames both ends of the centred strip, ±1 col, RED→GREEN in commit history) and not
vacuous; confirmed the wave test isolates `state.wave` through real `composeFrame`; ran audit-tree (false-DIRTY
on the pf status stamp only — restored, re-audited CLEAN).

### Rule Compliance

Exhaustive enumeration of every project rule against every governed symbol in the diff (new `scene.ts`
symbols: `drawScannerBezel`, `BEZEL_COLOUR=9`, `SCANNER_BEZEL_HEIGHT=32`, `HUD_WAVE_Y=22`, the `drawHud`
wave line, the `composeFrame` bezel call; new claim `SCAN-BEZEL`; two test files):

- **[RULE] src/core purity (no clock/entropy/canvas/RGBA — `purity.test.ts`):** `drawScannerBezel` and the
  wave line read `fb`/constants and write indices only. **Compliant** (purity 51/51 green).
- **[RULE] colours by palette INDEX only, never invented hex:** `BEZEL_COLOUR=9` is a bare index 0..15;
  test 3 asserts every top-band cell ≤15. **Compliant.**
- **[RULE] every src/core ROM-derived constant carries a claims/*.json citation:** `BEZEL_COLOUR=9` cited
  via `SCAN-BEZEL` — but see REQUIRED #1, the citation pins the banner not the operative line (**quality
  violation, not a missing-citation one**). `SCANNER_BEZEL_HEIGHT=32` and `HUD_WAVE_Y=22` are re-derived
  layout heuristics, un-cited **by the same df5-7 precedent** (`SCANNER_ORIGIN_Y`, `HUD_X/SCORE_Y/MEN_Y` are
  un-cited in the same file) — **compliant.**
- **[RULE] citations from tool output / RASM radix, byte-verbatim:** `SCAN-BEZEL` line 1225 verbatim
  `*SCANNER BEZEL` byte-matches source (citations 68/68 green). **Compliant** on the pinned line; the
  claim's PROSE asserts un-pinned bytes → REQUIRED #1.
- **[RULE] #17 comments assert a re-run mechanism:** TWO violations (REQUIRED #1 claim prose, REQUIRED #2
  stale test-header quote). The other touched comments (drawScanner/composeFrame call-order, the `:1242-1257`
  player-blip pointer) were hand-verified accurate. **2 violations.**
- **[RULE] #4 `??` vs `||`:** `state.wave ?? 0` uses `??`, matching the score/men precedent. **Compliant.**
- **[RULE] #5 `.js` import extensions:** all new src imports carry `.js`; the extensionless
  `./audit/dossier-sweep` in the identity test matches 6 existing identity tests under `moduleResolution:
  bundler` (pre-existing, not introduced here). **Compliant.**
- **[RULE] #8 test quality (no vacuous/coupled/`as any`):** no vacuous assertions; every `expect` consumes
  real `composeFrame` output or the live claims gate; bezel/wave tests proven RED→GREEN in commit history.
  **Compliant.**

## Dev Assessment

**GREEN.** Full defender project **960/960** (the 3 df7-5 RED tests flipped; nothing regressed),
`npm run lint` (tsc --noEmit, repo-wide) clean. Committed `29395659`, pushed to
`feat/df7-5-hud-scanner-render`.

**What I built (all in the pure `core/scene.ts` composer — TEA's "draw lives in CORE" finding; `purity.test.ts` stays green):**
- **AC1 — the scanner bezel.** `drawScannerBezel(fb)` draws WHITE (palette index 9) vertical
  end-bracket rails at the left and right ends of the centred 64-column strip, spanning the
  blip band, called from `composeFrame` BEFORE `drawScanner` (so a blip on an edge column
  overpaints its rail). Drawn every play frame, attacker-independent — the radar reads as a
  framed instrument even when empty. This is the ROM's `*SCANNER BEZEL` (MTX, AMODE1.SRC:1225-1233,
  `$9090`/`$0909` end-marks — NOT a full-width bar; see Design Deviations for the test I corrected).
- **AC2 — the wave number.** `drawHud` now writes `state.wave` a glyph-row below men (`HUD_WAVE_Y=22`),
  by df2 charset/palette INDEX (`TEXT_COLOUR=9`).
- **AC3 — the citation.** Added `claims/15-scanner.json` → `SCAN-BEZEL` pinning AMODE1.SRC:1225,
  verbatim `*SCANNER BEZEL` (byte-verified against the vendored source — the df1-1 gate re-opens it).

**Guards held green** (they must, and did): palette index ≤15 on the new bezel/wave, static-frame
determinism, no full-frame strobe (+ its non-vacuity), the :1223 width anchor, and df5-7's own
scanner/HUD tests (the bezel is identical in the with/without-attacker frames, so their blip-diff
still holds).

**Minimalist scope:** built only the AC1/AC2/AC3 delta. Did NOT touch the already-green
blips/score/men (df5-7 owns them) and did NOT add the ROM player-blip (:1242-1257) — out of df7-5's
ACs, flagged for a Reviewer/SM scope ruling in the Delivery Findings.

**Visual confirmation deferred to df7-7** (by design): df7-5's ACs are pinned by the framebuffer
tests; df7-7 is the dedicated full-lifecycle visual playtest that will screenshot the framed radar
+ wave HUD live. No live render run here.

**Gate-driven polish (commit after 29395659):** the dev-exit gate chain (dev-exit + lang-review/typescript
+ review-correlation) passed 3/3 with mutation evidence (bezel/wave/citation each blast-radius-verified;
the :1225 claim byte-pinned — mutating the line reddens 8 files). Two things the gate flagged that I
introduced, fixed in place: (1) off-by-one — `for (r <= SCANNER_BEZEL_HEIGHT)` drew 33 rows, now `r <`
draws 32; (2) the df5-7 header comment (scene.ts:186) still said the bezel "remain[s] df7's" — updated to
record df7-5 shipping it, leaving player-blip/screen-address as still-df7. Re-verified 960/960 + lint clean.
**One advisory left for the Reviewer (intentionally not fixed):** `drawScannerBezel` clips only on
`y >= fb.height`, not x — a bezel with `fb.width < 64` would wrap. UNREACHABLE today (the sole caller,
`src/main.ts:96`, passes `LOGICAL_WIDTH=292`); adding an x-guard is defensive code the AC doesn't need, so
I left it as a Reviewer ruling rather than scope-creep. The sibling `drawScanner` does clip all four edges.

### Dev rework (round 1 → 2) — addressing the Reviewer's two REQUIRED citation fixes

Both fixed; full defender suite **960/960** (citations gate re-opened the new line and byte-matched),
df7-5 8/8, lint clean.

1. **[RULE #17] SCAN-BEZEL repointed from the banner to the operative instruction.** `claims/15-scanner.json`
   → `SCAN-BEZEL` now pins `AMODE1.SRC:1227`, `verbatim "\tLDD\t#$9090"` (byte-verified) — the operative
   load of the bezel mark ($9090, palette index 9 in its high nibble = the source of `BEZEL_COLOUR=9`),
   the value the code actually uses, so the df1-1 gate now byte-protects it (matching every sibling claim
   and the df7-2 operative-line precedent). Reworded the claim to assert only what :1227 carries and to
   REFER to the MTX routine :1225-1233 for the framing (no longer asserting the un-pinned $0909/SCANH
   specifics as if pinned). Updated `df7-5-identity.test.ts` — the second assertion now checks
   `coveredBy(amode1(1227))` (kept the :1223 width anchor). RED→GREEN preserved.
2. **[RULE #17] Stale self-citation removed.** `df7-5-hud-scanner.test.ts` header no longer quotes the
   df5-7 comment this branch rewrote; it states the fact (df5-7 left the bezel + player-blip to df7; df7-5
   ships the bezel) and points at the session Delivery Findings + scene.ts's current header (`:1242-1257`
   player-blip still df7's).

Not changed: the [SEC] LOW x-clip advisory was explicitly non-blocking and the Reviewer did not require it;
left as-is (unreachable at width 292).

## Review Correlation

| # | Source | Finding | Classification | Checklist Check | Action |
|---|--------|---------|----------------|-----------------|--------|
| 1 | reviewer (internal) | SCAN-BEZEL pinned the `*SCANNER BEZEL` banner (:1225, no bytes) while the claim prose asserted $9090/$0909 — the df1-1 gate byte-verified the banner, leaving the asserted values unprotected | EXISTING_CHECK | #17 (citation lands on code unrelated to the sentence citing it); #24 (retirement) secondary | Dev missed an existing check — fixed in 5433d169 (repointed to operative :1227 `LDD #$9090`, byte-verified) |
| 2 | reviewer (internal) | `df7-5-hud-scanner.test.ts:12` quoted scene.ts:186-192, a comment this same branch rewrote — the quoted phrase is no longer at the cited lines | EXISTING_CHECK | #17 (two claims in one diff that cannot both be true) | Dev missed an existing check — fixed in 5433d169 (quote → current fact + session Delivery Findings pointer) |

**Signal Summary — External: 0 · CI: 0 · Internal: 2 · New checks added: 0.** Both findings map to the
existing lang-review `typescript.md` #17 ("comments/docs that assert a mechanism nobody re-ran") — the
checklist already had the class; the pipeline missed the instances because `comment_analyzer` is disabled
for this project, which is exactly why the internal Reviewer's first-hand comment/citation read (and the
rule-checker) caught them instead. No checklist edit owed.

## TEA Assessment

**RED landed.** Two new files, committed on `feat/df7-5-hud-scanner-render`:
- `plugins/defender/tests/df7-5-hud-scanner.test.ts` — black-box over `composeFrame` (the df5-7 digest /
  top-band technique; pins BEHAVIOUR, never an internal export or constant, so GREEN chooses the layout).
- `plugins/defender/tests/df7-5-identity.test.ts` — reads ONLY the df1-1 claims gate (`loadClaims`/`coveredBy`).

**State:** full defender project `957 passed / 3 failed` (the 3 are all df7-5, isolated — nothing else moved).
The 3 failing tests are the GREEN worklist:

| # | AC | Failing assertion | GREEN makes it pass by |
|---|----|-------------------|------------------------|
| 1 | AC2 | `composeFrame` frame is identical when only `state.wave` differs | drawing the **wave number** in the HUD (df5-2 `wave`), df2 charset/palette INDEX |
| 2 | AC1 | zero-attacker top band has no run ≥ `SCANNER_COLUMNS` (=64) | drawing the **scanner bezel** frame (attacker-independent), `*SCANNER BEZEL` AMODE1.SRC:1225 / MTX :1226-1233 |
| 3 | AC3 | `coveredBy(claims, AMODE1.SRC:1225)` is false | adding a `claims/15-scanner.json` entry pinning **AMODE1.SRC:1225**, verbatim `*SCANNER BEZEL` |

5 green guards/anchors ride along (index ≤15 on the new bezel, static-frame determinism, no full-frame
strobe + its non-vacuity, the :1223 width anchor) — they must STAY green through GREEN.

**GREEN guidance for Korben (Dev):**
- Extend the **core** draw (`composeFrame` / `drawScanner` / `drawHud` in `src/core/scene.ts`), NOT
  `shell/render.ts` — see the Delivery Finding "draw lives in CORE not shell". `purity.test.ts` must stay green.
- The bezel is drawn **regardless of live attackers** — today `drawScanner` early-returns on zero attackers;
  the bezel frame must not sit behind that guard. It frames the 64-column strip (`SCANNER_COLUMNS`), so it
  carries a horizontal rule spanning ≥ 64 columns (that is what test 2 detects — a box bezel satisfies it).
- Colour the bezel and the wave figure by **df2 palette INDEX only** (no hex literal; every cell stays 0..15).
- The `claims/15-scanner.json` entry's `verbatim` MUST byte-match `reference/original-source/defender/AMODE1.SRC:1225`
  (`*SCANNER BEZEL`) or the df1-1 gate (`citations.test.ts`) reddens — lang-review #15 (token-vs-claim).
- Do **not** re-open the already-green blips/score/men (df5-7 owns them). The player-blip is out of df7-5's ACs.

### Rule Coverage

Applicable checks from the lang-review `typescript.md` checklist:
- **#8 Test quality / #26 terms-all-local:** every test asserts against real `composeFrame` output or the
  live claims gate — no test-local tautology; no vacuous `let _ =`; assertions carry messages.
- **#18 fails-by-passing:** the strobe safety test is paired with a non-vacuity guard proving
  `assertNoFullFrameStrobe` rejects an actual all-`0x0f` strobe.
- **#15 token-vs-claim:** the citation test checks CLAIM COVERAGE of AMODE1.SRC:1225; the verbatim source-text
  match is enforced by the df1-1 gate (`citations.test.ts`) — flagged for Dev above.
- **#14 edge-in-one-branch:** noted that `composeFrame` has a `gameOver` early-return branch; the bezel/HUD/wave
  draw sits in the play branch (correct — game-over replaces the field), and AC-coverage targets the play path.
- **Purity (SOUL / core-boundary):** the draw stays pure core (indices only); `purity.test.ts` is the standing guard.
- Type-level input-validation / async / React checks (#5-7, #10-12): **N/A** — this is a synchronous pure
  framebuffer composer, no I/O, no constructors, no JSX.

## Subagent Results

**Cycle: 1**

**Method:** re-ran all three enabled subagents against the rework (commits 5433d169, c5a6e7e7).

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | both round-1 #17 findings confirmed FIXED; one new in-diff comment imprecision (:59) + pre-existing out-of-diff :1225 hits | :59 confirmed non-blocking; pre-existing hits out of scope; round-1 fixes verified |

## Reviewer Assessment

**Verdict:** APPROVED

_(round 2)_ Both round-1 REQUIRED findings are fixed and independently re-verified against the vendored
source; the suite is green (1463/1463), lint clean, audit-tree CLEAN. The one new item the rule-checker
surfaced is a test-comment imprecision with no gate role — non-blocking, recorded below.

**Round-1 findings — CONFIRMED FIXED (re-verified first-hand, not taken from the subagent):**
- [RULE] **#1 SCAN-BEZEL now pins the operative line.** `claims/15-scanner.json` → `SCAN-BEZEL` `source.line:
  1227`, `verbatim "\tLDD\t#$9090"` — byte-verified (`awk 'NR==1227'` → `\tLDD\t#$9090`), the operative load
  of the bezel mark ($9090 → index 9 = `BEZEL_COLOUR` at scene.ts:214). The df1-1 gate now protects the
  value the code uses (`citations.test.ts` 28/28 green). The prose no longer over-asserts un-pinned bytes.
  The identity test asserts `coveredBy(amode1(1227))` and its header narrates the operative-line rationale.
- [RULE] **#2 stale self-quote removed** from `df7-5-hud-scanner.test.ts:8-13` (states the fact + points at
  the session Delivery Findings, no longer quoting the comment this branch rewrote). The round-1-rework
  follow-on (the identity-test header still narrating retired `:1225`) is also fixed (c5a6e7e7).

**NON-BLOCKING observations (do NOT gate on these):**
- [RULE] **[#17, minor] `df7-5-hud-scanner.test.ts:59`** — the `verticalRun` jsdoc reads "MTX $9090/$0909 at
  SCANH+$4C01/$5301, AMODE1.SRC:1225", attributing the byte-writes to the banner line `:1225`; the bytes are
  at `:1227`/`:1231`. This is the same *shape* as round-1 #1 but **materially lower stakes** — it is a
  descriptive comment with no df1-1 gate role (nothing byte-checks it), and the file's own `:101` already
  uses the correct range `:1225-1233`. **Recommend** tightening `:59` to `:1225-1233` to match `:101` — a
  one-token edit — but I am not gating on it: the machine-checked citation (the claim) is correct, and a
  test comment's line-vs-range precision does not defeat any protection the way the round-1 claim did.
  I verified the SIBLING refs the subagent also flagged and DISMISS them: `:99`/`:100` (titles) and `:16`
  (header) name the feature by its banner — `:1225` *is* the `*SCANNER BEZEL` label line, so citing it for
  "the scanner bezel" is correct, not a byte-assertion; `:101` is already a range. Dismissed with evidence.
- [RULE] **[#24, out of scope] pre-existing `:1225` refs** at `scene.ts:190`, `scanner.ts:27`,
  `df5-1-scanner.test.ts:23` predate this story (untouched by `27564161..HEAD`); a story fixes citations in
  its own diff, not the repo's standing citation debt. Noted, not gated.
- [SEC] **[LOW, carried forward] `drawScannerBezel` x-clip asymmetry** — unchanged (the rework touched no
  production code); still non-exploitable (Uint8Array no-op writes, width always 292). Non-blocking, as in round 1.

**Re-verification method:** re-ran all three enabled subagents (preflight, security, rule-checker) against
the rework diff, then independently confirmed the byte-match of `:1227`, the 28/28 citations gate, the
absence of any stale `:1225`-*pin* assertion, and read the five flagged `:1225` comment refs myself to
separate the one genuine (non-blocking) imprecision from the four defensible banner/feature/range pointers.
Approving: the story's gate-checked citation record is correct and both filed defects are closed.