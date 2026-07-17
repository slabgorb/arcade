---
story_id: "sw7-4"
jira_key: "sw7-4"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-4: R4 Score and shield rules — wave-scaled Force bonus, per-shield wave bonus and banner, drop the invented 400k/800k thresholds, post-hit shield window

## Story Details
- **ID:** sw7-4
- **Jira Key:** sw7-4
- **Workflow:** tdd
- **Stack Parent:** sw7-2 (dependency, already DONE)
- **Branch Strategy:** gitflow (feat/sw7-4-score-shield-rules)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-17T20:03:12Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T18:06:27Z | 2026-07-17T18:09:08Z | 2m 41s |
| red | 2026-07-17T18:09:08Z | 2026-07-17T18:54:11Z | 45m 3s |
| green | 2026-07-17T18:54:11Z | 2026-07-17T19:27:23Z | 33m 12s |
| review | 2026-07-17T19:27:23Z | 2026-07-17T19:47:58Z | 20m 35s |
| green | 2026-07-17T19:47:58Z | 2026-07-17T19:55:45Z | 7m 47s |
| review | 2026-07-17T19:55:45Z | 2026-07-17T20:03:12Z | 7m 27s |
| finish | 2026-07-17T20:03:12Z | - | - |

## Story Context

This story subsumes four audited fidelity sub-tasks from the 2026-07-15 primary-source audit (docs/2026-07-15-star-wars-primary-source-audit.md):

### S-012: Force Bonus by Wave
- **Finding:** Force bonus is 5k/10k/25k/50k/100k indexed by 0-based wave number
- **ROM Source:** WSINT.MAC force-bonus lookup table
- **Dependency:** Requires sw7-2 (wave-parity fix) for correct 0-based wave indexing
- **Current State:** Implementation required in src/core/game.ts scoring logic

### S-013: Per-Shield Wave Bonus and RWD Banner
- **Finding:** 5,000 points awarded per surviving shield unit at wave completion
- **Banner:** H-021 "RWD" (reward) banner displayed on wave completion
- **ROM Source:** GDBNKGN wave-completion handler, AUDSS reward banner
- **Current State:** Implementation required; shield bonus display in render.ts

### S-015: Remove Invented 400k/800k Thresholds
- **Finding:** BOOK_WAS_WRONG — The strategy guide invented 400k/800k extra-shield thresholds that do not exist in the ROM
- **Refutation:** Exhaustive BCD hunt in the ROM binary found no such thresholds
- **Current State:** Remove non-ROM constants from src/core/state.ts

### S-016: Post-Hit Shield-Loss Window
- **Finding:** ROM shield-loss window: max one shield lost per gauge-redraw cycle (sprite refresh)
- **Impact:** Rapid repeated hits during a single redraw cycle do not stack; only the first hit counts
- **ROM Source:** GDVIEW gauge-redraw cycle timing in WSGRND playfield handler
- **Current State:** Implement window tracking in src/core/shield.ts

## Sm Assessment

**Routing:** RED phase → TEA (Han Solo). This is a 4pt phased TDD story in `star-wars`,
unblocked (dependency sw7-2 is DONE), merge gate clear, clean tree, feature branch
`feat/sw7-4-score-shield-rules` cut from `develop`.

**Nature of the story (pattern analysis):** Four audited fidelity sub-tasks folded into one,
splitting cleanly into three *additive* rules and one *deletion*:
- S-012 — wave-scaled Force bonus (5k/10k/25k/50k/100k), **0-based** wave index (why it depends
  on sw7-2's wave-parity fix).
- S-013 — 5,000 per surviving shield unit at wave completion + the H-021 "RWD" banner.
- S-015 — **remove** the invented 400k/800k extra-shield thresholds (BOOK_WAS_WRONG; refuter's
  BCD hunt found nothing in ROM). This is the one that deletes code/constants.
- S-016 — post-hit shield-loss window: at most one shield lost per gauge-redraw cycle.

**Boundary discipline:** scoring and shield rules are deterministic sim → they belong in
`src/core`, not `src/shell`. Only the RWD banner has a render surface (`src/shell`). TEA's RED
tests should target core behavior, with the banner as the sole shell-facing assertion.

**⚠️ Caution for TEA — unverified source pointers:** the ROM routine/file names in the Story
Context above (WSINT.MAC, GDBNKGN, AUDSS, GDVIEW, WSGRND) and the file paths
(`src/core/shield.ts`) were produced by the setup subagent and are **inferences, not confirmed
citations**. Do not cite them as fact. Verify the actual score/shield constants against the
gitignored `reference/disasm` and the historicalsource star-wars disasm before writing tests,
and confirm the real file layout in `src/core` (there may be no `shield.ts`). The audit doc
`docs/2026-07-15-star-wars-primary-source-audit.md` is the authoritative internal reference for
S-012/013/015/016 — read it first.

**Recommended RED coverage:** Force-bonus table indexed by 0-based wave (incl. wave 0 and the
cap beyond index 4); 5,000×surviving-shields at wave end; RWD banner fires on wave completion;
NO 400k/800k threshold grants an extra shield (negative test — this is the deletion); and the
one-shield-per-redraw-cycle window (a second hit inside the same cycle does not stack).

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — verified by testing-runner (`sw7-4-tea-red`): **33 failing tests across
exactly 9 files, 0 unintended breakage**, 1496 still green. Failures are for the right
reasons (missing `forceBonusForWave`/`FORCE_BONUS_BY_WAVE`/`SHIELD_BONUS_PER_UNIT`/
`POST_HIT_SHIELD_WINDOW`; the `shield-bonus` event; the two reward banners; and the still-live
extra-life award loop).

**All ROM facts re-verified against the 1983 Warp Speed source (~/Projects/star-wars-1983-source-text,
.RADIX 16). The setup-context pointers (WSINT.MAC/GDBNKGN/AUDSS/`src/core/shield.ts`, "4 values")
were the setup subagent's INFERENCES and were wrong — real citations below.**

**New test files:**
- `tests/core/wave-force-bonus.test.ts` — S-012: `TSCFRC` table [5k,10k,25k,50k,100k]
  (WSGAS.MAC:509-513, packed BCD); 0-based index `wave-1`; **the walk-off** (waves ≥6 clamp
  to 100k — GETFRP `IFHS`, WSGAS.MAC:406-408); end-to-end via the `force-bonus` event amount.
- `tests/core/shield-wave-bonus.test.ts` — S-013: 5,000 × surviving shields (`SCRSHLD`
  WSGAS.MAC:375-391, `TSCSHL`=5,000 :519); NOT clean-gated; combined-award integration.
- `tests/core/post-hit-shield-window.test.ts` — S-016: ≤1 shield lost per gauge-redraw cycle
  (`BG1GLW`/`DO1GAS`); same-frame, cross-source, within-window, after-window, contract-only.
- `tests/shell/render.reward-banners.test.ts` — S-013 banner `MS.BRE` "BONUS FOR REMAINING
  ENERGY" + H-021 banner `MS.RWD` "50,000 FOR SHOOTING ALL TOWERS" (two DISTINCT banners).

**Re-seated siblings (contract change: flat `FORCE_BONUS` → wave-scaled; extra-life inverted):**
- `tests/core/extra-life.test.ts` — the extra-life-threshold block INVERTED to a negative
  (S-015); `bonusFlash`/purity blocks preserved verbatim.
- `tests/core/rom-score-values.test.ts`, `tests/core/force-bonus.test.ts`,
  `tests/core/speech-cues.test.ts`, `tests/shell/font-text-seam.test.ts` — off `FORCE_BONUS`
  onto `forceBonusForWave(wave)`.

**Tests written/changed:** ~40 assertions covering 4 sub-tasks + 2 banners (S-012, S-013, S-015,
S-016, H-021).

### Rule Coverage

| Rule / check | Test(s) | Status |
|---|---|---|
| TEA-sidecar: table walk-off (test the wave PAST the last row) | `wave-force-bonus` "the walk-off" ×3 | RED |
| star-wars quarry: BCD digit-pairs, not raw hex | `wave-force-bonus` "reads as BCD", `shield-wave-bonus` "5,000" | RED |
| TS #38-39 falsy-zero / index clamp returns a value, never `undefined`/`0` | `wave-force-bonus` clamp = last entry | RED |
| off-by-one / 0-based index (romWave0) — wave 1 is the SMALLEST | `wave-force-bonus` "wave 1 gets 5,000 NOT 10,000" | RED |
| core purity/determinism (sacred boundary) | determinism tests in all 3 core suites | RED |
| Meaningful assertions (no vacuous) — "it really scored/crossed" guards | throughout (self-checked) | — |
| Don't pin an invented constant (the 0.92 lesson) | S-016 window pinned as CONTRACT, not value | RED |

**Rules checked:** relevant TS-checklist items (falsy-zero, `readonly` arrays, ESM) + the
TEA/star-wars sidecar rules. **Self-check:** every test asserts a concrete value; each threshold/
kill carries a "not vacuous" guard; no `let _ =`, no `assert(true)`.

**Handoff:** To Dev (Yoda) for GREEN.

## Delivery Findings

<!-- append-only; each agent under its own subheading -->

### TEA (test design)
- **Gap** (non-blocking): the S-016 post-hit window must be a SHARED funnel. My RED tests exercise
  the SPACE cockpit path (`sim.ts:422-440`), but the ROM's gauge debounce is universal — EVERY
  shield-loss site must route through the one-loss-per-cycle gate: surface crash/object
  (`sim.ts:~604`), trench catwalk (`~927`), port crash (`~1055`). Affects `src/core/sim.ts` (Dev
  must apply the window to all ~5 `lives - damage` sites; reviewer should trace the diff). *Found by TEA during test design.*
- **Improvement** (non-blocking): delete the flat `FORCE_BONUS` export from `src/core/state.ts`
  after migrating `render.ts:894` and `events.ts` onto `forceBonusForWave(state.wave)`; no test
  references it anymore. Declare `FORCE_BONUS_BY_WAVE` `readonly number[]` (TS #26). Affects
  `src/core/state.ts`, `src/shell/render.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, future story): the numbers 400k/800k S-015 removes ARE real ROM values —
  the Death-Star-SELECTION start bonus (`TSCBN1..4` 200k/400k/600k/800k, WSGAS.MAC:527-530; banner
  MS.BON "DEATH STAR BONUS EARNED"; awarded once at game start, `SCRWAV` WSMAIN.MAC:1982). Our
  clone has no Death-Star-selection screen, so this authentic feature is unmodelled — candidate for
  a future story. NOT in scope here. *Found by TEA during test design.*
- **Question** (non-blocking): the per-shield banner's phase/dwell placement is Dev's call — the ROM
  shows `MS.BRE` in the between-wave `VEWNXT` beat; my shell fixture seeds it in the trench phase
  (where `forceBonusAwardedAt`/`deathStarDestroyedAt` banners already render). *Found by TEA during test design.*

### Dev (implementation)
- **Resolved** the TEA per-shield-banner placement Question: both reward banners are drawn in
  `drawTrenchBanners` (which runs every playing frame, stamp-gated — not trench-only), so the
  per-shield banner rides `shieldBonusAwardedAt` into the next space wave and the towers banner
  rides `towerBonusAwardedAt` through the trench. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the Death-Star-SELECTION start bonus TEA flagged (TSCBN1..4,
  MS.BON) remains unmodelled — a genuine future story, out of scope here. *Found by Dev during implementation.*
- No other upstream findings; TEA's findings stand.

### Reviewer (code review)
- **Gap** (non-blocking, PRE-EXISTING): the trench detonation gate (`sim.ts:1010`
  `detonates = armed && inApproachWindow`) has no `gameOver` guard, so a fatal catwalk crash on the
  exact winning frame lets the run "clear while dead" — a self-contradictory state (`phase:'space'`
  but `mode:'gameover'`). Identical on `origin/develop`; benign (next `stepGame` short-circuits to
  gameover). sw7-4 now also fires a harmless `shield-bonus:0` on this path. Affects `src/core/sim.ts`
  (a one-line `&& !afterObstacles.gameOver` guard would close it). Out of sw7-4 scope. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the per-shield banner shows live `state.lives` instead of the frozen
  `ShieldBonusEvent.shields` count; a hit during the ~3 s dwell makes the banner N disagree with the
  banked score, and leaves `shields` an orphaned event field. Affects `src/shell/render.ts:912` +
  a state stamp. Cosmetic; a fast-follow. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **H-021 is the towers banner, not the per-shield banner (story conflation)**
  - Spec source: sprint `sw7-4` description; audit R4 cluster
  - Spec text: "S-013 (5,000 per surviving shield unit + H-021 RWD banner)"
  - Implementation: tests pin TWO distinct banners — per-shield `MS.BRE` "BONUS FOR REMAINING
    ENERGY / 5,000 X N" (TCMES.MAC:611-612, shown at wave-end) and, separately, H-021 = `MS.RWD`
    "50,000 FOR SHOOTING ALL TOWERS" (TCMES.MAC:609, ROM:E039, shown when towers-left hits 0)
  - Rationale: the 1983 source shows these are different banners at different triggers; the story
    equated them
  - Severity: minor
  - Forward impact: Dev implements two banners; the `tower-bonus` core event already exists
- **S-016 window DURATION pinned as a contract, not a ROM value**
  - Spec source: audit S-016; story title "post-hit shield window"
  - Spec text: "ROM loses max one shield per gauge-redraw cycle"
  - Implementation: tests pin the observable CONTRACT (≤1 loss per window; window finite & positive)
    but assert NO specific duration — the ROM cycle is data-dependent on shield count
    (GS.VTP/VUP/VBS off S.GAS + TGDLM, ~200ms–1s+ at 20Hz), so the length is an authentic-feel tunable
  - Rationale: there is no single ROM byte for the duration; pinning a false-precision value would
    repeat the invented-0.92 mistake
  - Severity: minor
  - Forward impact: Dev chooses the tunable; reviewer should not expect a cited duration constant
- **`as unknown as GameState` cast in `render.reward-banners.test.ts` (TS #16)**
  - Spec source: TS lang-review checklist #16
  - Spec text: "`as unknown as T` — double-cast bypass, almost always wrong"
  - Implementation: the shell banner fixture names `shieldBonusAwardedAt`/`towerBonusAwardedAt`,
    which do not exist on `GameState` until Dev adds them in GREEN; the double-cast lets the RED
    fixture reference them now (documented in the file)
  - Rationale: standard "field does not exist pre-GREEN → RED" pattern; tightens to `as GameState`
    once Dev adds the stamps
  - Severity: minor
  - Forward impact: verify/reviewer can tighten the cast after GREEN

### Dev (implementation)
- **Re-seated 4 sibling test files the RED phase missed (per-shield bonus + new event)**
  - Spec source: the S-013 tests TEA wrote (shield-wave-bonus.test.ts)
  - Spec text: "5,000 per surviving shield unit, banked on ANY win"
  - Implementation: `rom-score-values` / `exhaust-port-outcome` / `trench.test.ts` asserted the
    port-kill TOTAL without the per-shield term — they went red in GREEN (not RED), because TEA's
    re-seat list missed them; updated each to `+ SHIELD_BONUS_PER_UNIT * s1.lives`. Also updated
    `events.test.ts` exhaustiveness (switch arm + count 18→19 + ALL_EVENTS) for the new
    `shield-bonus` variant — a tsc-only error vitest hid in RED.
  - Rationale: the per-shield bonus correctly rides every win; these are legitimate re-seats (intent
    preserved, isolated via the `SHIELD_BONUS_PER_UNIT * s1.lives` term), not goalpost-moving.
  - Severity: minor
  - Forward impact: none — behaviour unchanged, expectations corrected
- **POST_HIT_SHIELD_WINDOW = 0.5s**
  - Spec source: TEA deviation "S-016 window DURATION is an authentic-feel tunable"
  - Spec text: "~200 ms–1 s+ at the 20 Hz game frame, no single ROM byte"
  - Implementation: picked 0.5 s (mid-band of the ROM's data-dependent cycle)
  - Rationale: felt but not game-trivializing; inside the ROM band
  - Severity: minor
  - Forward impact: tunable — the S-016 tests pin the contract, not this value
- **Per-shield banner shows `5,000 X <state.lives>` (live count, not a frozen stamp)**
  - Spec source: S-013 banner MS.BRE ("5,000 X N")
  - Spec text: the ROM draws the surviving count from GS.OLD, frozen at the win
  - Implementation: the banner reads `state.lives` for N rather than stamping a frozen count
  - Rationale: minimal (no extra state field); exact at the win frame and its immediate dwell — a
    hit during the ~3 s dwell would shift N cosmetically
  - Severity: minor
  - Forward impact: a frozen-count field is a trivial follow-up if the cosmetic drift ever matters
- **Audit citations: `remediated_by` + one re-anchor after the src edits**
  - Spec source: the `docs/audit/findings` citations gate
  - Spec text: each finding's `ours` must match the live source line
  - Implementation: S-012 / S-015 / H-009 (the defects sw7-4 fixes) marked `remediated_by: sw7-4`
    — the intended freeze-as-history route (their defect code deliberately no longer exists);
    S-011 (CONFIRMED "1 shield per hit", merely refactored) re-anchored to the new `loseShield` line
    (sim.ts:1231). Reanchor tool moved the other 46 drifted citations.
  - Rationale: standard star-wars citation upkeep — reanchor for line drift, `remediated_by` for
    fixed findings (never re-point a fixed finding, per the gate's own rule)
  - Severity: minor
  - Forward impact: none

## Dev Assessment

**Status:** GREEN — full star-wars suite **131 files / 1529 tests pass**, `tsc --noEmit` clean,
`vite build` clean (46 modules).

**Implementation (all in `star-wars/src`, `src/core` for logic + one `src/shell` banner surface):**
- **S-012** — replaced flat `FORCE_BONUS` with `FORCE_BONUS_BY_WAVE` + `forceBonusForWave(wave)`
  (clamped `Math.min(wave-1, len-1)`); award reads `forceBonusForWave(state.wave)` (sim.ts) and the
  banner shows the wave amount (render.ts). Flat constant removed; all callers migrated.
- **S-013** — `SHIELD_BONUS_PER_UNIT = 5000`; the detonation banks `5000 × afterObstacles.lives`
  on ANY win (not clean-gated) and emits `shield-bonus` {amount, shields}; `shieldBonusAwardedAt`
  stamp (re-stamped by clearRun) drives the MS.BRE banner.
- **S-015** — removed `EXTRA_LIFE_THRESHOLDS` and the award loop from `finalizeScore` (now
  flash-only). The extra-life suite's inverted negative tests pass.
- **S-016** — `loseShield()` funnel (≤1 shield per `POST_HIT_SHIELD_WINDOW`) threaded through ALL
  four damage sites (space, surface, catwalk, port-crash) via a new `shieldHitAt` stamp — the
  shared-funnel my TEA Delivery Finding required.
- **H-021** — `towerBonusAwardedAt` stamped on the surface→trench drop drives the MS.RWD
  "50,000 FOR SHOOTING ALL TOWERS" banner (the `tower-bonus` core event already existed).

**Verification note:** core scoring/shield logic is fully driven by deterministic unit tests; the
banner text is exercised by `render.reward-banners`/`font-text-seam` through the real `render()`.
Banner POSITION/glow is an eyeball item per the repo's render guardrail — flagged for the Reviewer.

**Handoff:** To Reviewer (Obi-Wan) for code review.

## Subagent Results

Toggles (`workflow.reviewer_subagents`): only `preflight` + `rule_checker` enabled; the other 7
disabled by project settings. Because this is a SELF-AUTHORED story (one session did tests + code),
I added a **custom adversarial correctness pass** (general-purpose, sonnet) with a hard specific-asks
list to cover the disabled edge/correctness domains — it is the row that found the real bugs.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 (2 documented test casts) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | — | covered by the custom adversarial pass (Bug 1/2/3) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | — | no error-handling code changed; N/A |
| 4 | reviewer-test-analyzer | Skipped | disabled | — | covered by rule-checker #8 + custom pass #5 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | — | covered by rule-checker (stale RED-phase comment flagged) |
| 6 | reviewer-type-design | Skipped | disabled | — | covered by rule-checker #1/#2/#5 |
| 7 | reviewer-security | Skipped | disabled | — | no input/auth boundaries touched; N/A |
| 8 | reviewer-simplifier | Skipped | disabled | — | manual: no over-engineering found |
| 9 | reviewer-rule-checker | Yes | findings | 3 (all LOW test hygiene) | confirmed 3 |
| + | custom adversarial correctness | Yes | findings | 3 (Bug 1 blocking, Bug 2 pre-existing, Bug 3 LOW) | confirmed 3 |

**All received:** Yes (preflight + rule_checker + custom pass returned; 7 disabled per settings)
**Total findings:** 4 confirmed (1 blocking, 3 low), 1 deferred (Bug 2 pre-existing/out-of-scope), 0 dismissed

## Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` + the star-wars sacred-boundary rules:
- **#1 type-escapes:** `render.reward-banners.test.ts:85` `as unknown as GameState` — **VIOLATION** (LOW):
  now that GREEN added the stamp fields, `Partial<GameState>` works (sibling fixtures use it). The
  `shieldBonusEvent`/`forceBonusEvent` type predicates have real runtime discriminants — compliant.
- **#3 union exhaustiveness:** the new `shield-bonus` variant is handled in both `main.ts` and
  `events.test.ts` switches with intact `never` guards — **compliant**. But `audio.test.ts:297-315`'s
  hardcoded "every audio-bearing event" list is stale (missing `shield-bonus` + pre-existing
  `tower-bonus`) — **VIOLATION** (LOW, vacuous exhaustiveness test).
- **#4 null handling:** `loseShield` and the two banner guards use explicit `!== null` (0 is a valid
  `t`) — **VERIFIED** compliant.
- **#8 test quality:** `layoutText` mock drops the optional `opts` param vs the faithful sibling —
  **VIOLATION** (LOW, no functional gap).
- **#14 core purity:** grep of all changed core files for `shell/`/`window`/`Date`/`performance`/
  `Math.random`/`requestAnimationFrame` = **zero** (independently confirmed + rule-checker). `t` is
  `state.t + dt` threaded via `StepCommon`; `loseShield`/`forceBonusForWave` are pure — **VERIFIED**.
- **#15 readonly array:** `FORCE_BONUS_BY_WAVE: readonly number[]` — **VERIFIED** compliant.
- **#16 BCD/ROM:** rule-checker verified `TSCFRC`/`TSCSHL`/`GETFRP` against `WSGAS.MAC` byte-for-byte
  — **VERIFIED** compliant.
- **#17 determinism:** window is `t`-driven, no wall clock — **VERIFIED**.

## Reviewer Observations

- **[HIGH][EDGE] Phase-boundary shield-window bypass** at `src/core/sim.ts:1366` (`enterPhase` nulls
  `shieldHitAt`). `progress()` runs `enterPhase` on the SAME frame a hit stamps `shieldHitAt`, so the
  debounce is discarded at every wave-internal transition (space→surface, surface→trench).
  **Failure scenario (reachable in normal play):** kill the last TIE while a fireball is at the
  cockpit → lose 1 shield, `shieldHitAt` stamped then immediately nulled by the transition → a hit
  on the next frame (16 ms later) also costs a shield. Two shields lost 30× tighter than the 0.5 s
  window — a direct violation of the S-016 acceptance criterion. Fix: don't reset `shieldHitAt` in
  `enterPhase` (let it persist via `...s`; `t` monotonic, so it expires naturally) + add a
  phase-boundary regression test.
- **[LOW][TYPE] Unnecessary `as unknown as GameState`** at `tests/shell/render.reward-banners.test.ts:85`
  — the stamp fields are real `GameState` fields as of this commit; use `Partial<GameState>` like the
  sibling fixtures.
- **[LOW][TEST] Stale `audio.test.ts` exhaustive coverage list** (`:297-315`) — missing the new
  `shield-bonus` (and pre-existing `tower-bonus`); the test passes vacuously off a hardcoded array.
- **[LOW][TEST] `layoutText` mock drops `opts?`** at `render.reward-banners.test.ts:34` vs the faithful
  sibling mock — no functional gap, but a signature drift.
- **[LOW][EDGE] Stale per-shield banner count** at `src/shell/render.ts:912` — reads live `state.lives`,
  not the frozen count the bonus was computed from; a hit during the ~3 s dwell shows an N inconsistent
  with the banked score. Cosmetic, rare, self-correcting (matches Dev's documented deviation).
- **[VERIFIED] `shieldHitAt` threaded at all 4 damage sites** (space 441/455, surface 725/737, catwalk
  924/932, port-crash 1068/1085) + safe-hold path — evidence: grep; the window never silently resets
  WITHIN a step (only the enterPhase reset above is the bug).
- **[VERIFIED] `forceBonusForWave` clamp** — `Math.max(0, Math.min(wave-1, 4))`: wave 1→5000, 5→100000,
  6+→100000; matches the 0-based `romWave0` convention. No off-by-one.
- **[VERIFIED] `finalizeScore`** still drives `bonusFlash` correctly; no caller depended on its removed
  lives-adjustment (extra-life.test.ts asserts it never raises lives).
- **[VERIFIED-PRE-EXISTING] Win-while-dead** at `sim.ts:1010` (`detonates` has no `gameOver` guard) —
  identical on `origin/develop`, benign dead-letter (next `stepGame` short-circuits to gameover). Out
  of sw7-4 scope; recorded as a Delivery Finding.

## Devil's Advocate

Argue this code is broken. The S-016 window is the story's marquee feature, and it has a hole the
author's own tests never probe: every one of the post-hit-shield-window tests operates INSIDE a single
phase (space), so none of them crosses the space→surface or surface→trench boundary where `enterPhase`
throws the stamp away. A skilled player who clears a wave under fire — the exact tense moment the
feature exists to protect — gets LESS protection than one sitting still, because the phase change
resets the debounce. That is the feature failing precisely when it matters most, and it passed a green
suite because the suite's fixtures never leave the phase. A confused reviewer would trust "7 S-016
tests, all green" and miss that they're all the same phase.

What else? The per-shield banner reads `state.lives` live, so a player hit during the reward dwell sees
a shield count that contradicts the points already on the board — a small lie the HUD tells. The
`ShieldBonusEvent.shields` field was added specifically to carry that frozen count (its own comment
says so) and then nobody reads it — a field that exists only to be ignored. The win-while-dead path
now fires a `shield-bonus: 0` event and a `death-star-destroyed` for a corpse; harmless today, but it
is scoring machinery running for a run that ended, and if a future story keys anything off those
events it inherits the contradiction. And the `audio.test.ts` "exhaustive" list quietly went stale —
the kind of test that reads as coverage but enforces nothing, so the next dev who adds an event and
forgets the pump gets a green light. Individually small; together they say the change was verified
narrowly (in-phase, no-hit-during-dwell) rather than adversarially. The blocking one is real and
reachable — reject.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | S-016 window bypassed at wave-internal phase boundaries (violates the AC in normal play) | `src/core/sim.ts:1366` (`enterPhase` resets `shieldHitAt`) | Stop resetting `shieldHitAt` in `enterPhase` (persist across phases); add a phase-boundary regression test to `post-hit-shield-window.test.ts` |
| [LOW] | Unnecessary `as unknown as GameState` (fields are real now) | `tests/shell/render.reward-banners.test.ts:85` | Use `Partial<GameState>` + drop the cast |
| [LOW] | Stale exhaustive audio-event coverage list | `tests/shell/audio.test.ts:297-315` | Add `shield-bonus` (and `tower-bonus`) |
| [LOW] | `layoutText` mock drops `opts?` | `tests/shell/render.reward-banners.test.ts:34` | Add the optional `opts` param |

The three LOW items are cheap and should be bundled into the Bug-1 fix pass. Bug 3 (stale banner N)
and the win-while-dead edge are recorded as non-blocking Delivery Findings.

**Specialist tag coverage** (2 subagents enabled by settings; 7 disabled ones dismissed with rationale):
- [RULE] rule-checker: 3 LOW findings (unnecessary `as unknown as` cast, stale audio.test.ts list,
  layoutText mock `opts`); core purity, determinism, readonly, and BCD/ROM math VERIFIED clean.
- [EDGE] custom adversarial: Bug 1 (S-016 phase-boundary bypass, blocking) + Bug 2 (pre-existing) + Bug 3 (cosmetic).
- [TEST] the in-phase-only S-016 tests missed Bug 1; audio.test.ts exhaustive list is stale.
- [TYPE] `as unknown as GameState` cast unnecessary post-GREEN.
- [SILENT] No swallowed errors — no error-handling code changed.
- [DOC] stale RED-phase fixture comment flagged.
- [SEC] No security concerns — pure internal scoring/shield sim, no input/auth boundaries.
- [SIMPLE] No unnecessary complexity; dead extra-life code fully removed, not commented out.

**Handoff:** Back to Dev (Yoda) for fixes.

### Reviewer (audit) — Design Deviations

- TEA/Dev deviation **"S-016 window DURATION is a tunable" (POST_HIT_SHIELD_WINDOW=0.5s)** → ✓ ACCEPTED:
  inside the ROM's ~200 ms–1 s+ band; the S-016 tests pin the contract, not the value.
- TEA/Dev deviation **"H-021 is the towers banner, not the per-shield banner"** → ✓ ACCEPTED: the
  ROM has two distinct banners (MS.BRE / MS.RWD); both implemented correctly.
- Dev deviation **"per-shield banner reads live `state.lives`"** → ✗ FLAGGED (LOW, non-blocking): it
  produces a banner/score inconsistency if hit during the dwell, and orphans `ShieldBonusEvent.shields`.
  Recorded as a Delivery Finding; not a merge blocker.
- Dev deviation **"`as unknown as GameState` in render.reward-banners"** → ✗ FLAGGED: no longer needed
  post-GREEN (fields are real). Fix required (LOW).
- Dev deviation **"remediated_by + S-011 re-anchor"** → ✓ ACCEPTED: rule-checker confirmed the S-011
  re-anchor still supports its claim and the reanchors are line-number-only.

## Dev Assessment — Round 2 (review rework)

**Status:** GREEN — full suite **131 files / 1531 tests** (+2 regression), tsc + vite build clean.
Commit `65465fa`, pushed.

**Addressed every Reviewer finding:**
- **[HIGH] S-016 phase-boundary bypass — FIXED.** `enterPhase` no longer resets `shieldHitAt`
  (`sim.ts`): the ROM shield gauge is one continuous mechanism across a run, and `t` is monotonic so
  an old stamp expires on its own — no reset needed. Added 2 regression tests to
  `post-hit-shield-window.test.ts` (`enterPhase` preserves the stamp; a real `stepGame` space→surface
  clear preserves it) — **confirmed RED before the fix**, green after.
- **[LOW] `as unknown as GameState` — FIXED.** `render.reward-banners.test.ts` fixture now uses
  `Partial<GameState>` (the stamp fields are real post-GREEN), no cast.
- **[LOW] stale `audio.test.ts` list — FIXED.** Added `shield-bonus` (sw7-4) and the pre-existing
  `tower-bonus` to the exhaustive audio-event coverage list + corrected its comment.
- **[LOW] `layoutText` mock — FIXED.** Now models the optional `opts` param like the sibling mock.

**Deferred (non-blocking, as the Reviewer agreed):** the pre-existing win-while-dead edge and the
cosmetic banner-count drift remain Delivery Findings — not sw7-4 scope / cosmetic fast-follow.

**Handoff:** Back to Reviewer (Obi-Wan) for re-review.

## Reviewer Re-Review (Round 2)

Proportionate re-review of a small rework (one src line in `enterPhase` + the 2 regression tests +
3 LOW test cleanups + citation reanchors). The round-1 subagents already found the issues; this pass
verifies each is closed and the fix introduces nothing new.

### Subagent Results (Round 2)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 | Re-verified on rework: testing-runner 1531/1531, tsc clean, vite build clean, smells grep on the diff clean |
| 2 | reviewer-edge-hunter | Skipped | disabled | — | N/A |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | — | N/A |
| 4 | reviewer-test-analyzer | Skipped | disabled | — | regression tests confirmed RED→GREEN by me |
| 5 | reviewer-comment-analyzer | Skipped | disabled | — | N/A |
| 6 | reviewer-type-design | Skipped | disabled | — | LOW #1 cast removed (verified) |
| 7 | reviewer-security | Skipped | disabled | — | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | — | fix is a 1-line removal — no complexity added |
| 9 | reviewer-rule-checker | Carried | findings | round-1's 3 LOW | all 3 FIXED; one-line diff re-checked manually — no new rule violations, core boundary intact |
| + | custom adversarial | Carried | findings | round-1's Bug 1/2/3 | Bug 1 FIXED (regression RED→GREEN); Bug 2/3 deferred as agreed |

**All received:** Yes (fresh full-suite subagent run confirms green; round-1 findings all verified addressed on the small diff)
**Total findings:** 0 new; all 4 round-1 findings resolved (1 fixed, 3 low fixed), 2 deferred (Bug 2/3, non-blocking)

### Verification of each round-1 finding

- **[HIGH] S-016 phase-boundary bypass** → FIXED. Diff `b7f039b..HEAD`: `enterPhase` no longer sets
  `shieldHitAt: null`; it persists via `...s`. `grep shieldHitAt` confirms no null-reset remains. The
  fix is faithful (continuous gauge; `t` monotonic → old stamps expire). Re-checked no other consumer
  breaks: only `loseShield` reads `state.shieldHitAt`. 2 regression tests were RED pre-fix, GREEN now.
- **[LOW] `as unknown as GameState`** → FIXED (`Partial<GameState>`, cast gone — smells grep clean).
- **[LOW] stale `audio.test.ts` list** → FIXED (`shield-bonus` + `tower-bonus` added).
- **[LOW] `layoutText` mock `opts`** → FIXED.

### Reviewer (audit) — Round 2

- Round-1 FLAGGED **"`as unknown as GameState`"** → ✓ now RESOLVED (fixed this round).
- Round-1 FLAGGED **"per-shield banner reads live `state.lives`"** → remains a non-blocking Delivery
  Finding (cosmetic fast-follow), accepted as-is.

## Reviewer Assessment (Round 2)

**Verdict:** APPROVED

**Specialist tag coverage** (2 subagents enabled by settings; the 7 disabled ones dismissed with
rationale, per the gate's explicit-dismissal rule):
- [RULE] rule-checker (enabled): 3 LOW findings — all FIXED this round; core purity, determinism,
  readonly, and the BCD/ROM math against WSGAS.MAC all VERIFIED clean.
- [EDGE] (custom adversarial pass): blocking Bug 1 (S-016 phase-boundary bypass) — FIXED, regression
  RED→GREEN; Bug 2/3 deferred as non-blocking Delivery Findings.
- [TEST] regression tests added and confirmed RED→GREEN; the stale audio.test.ts exhaustive list fixed.
- [TYPE] the unnecessary `as unknown as GameState` cast removed (fields are real post-GREEN).
- [SILENT] No swallowed errors or silent fallbacks — no error-handling/Result code was added or changed.
- [DOC] the stale RED-phase comment on the render fixture corrected; no misleading public-API docs.
- [SEC] No security concerns — no user/API input, auth, secrets, or tenant boundaries touched; pure
  internal scoring/shield sim.
- [SIMPLE] No unnecessary complexity — the fix is a one-line removal; no dead code (extra-life fully
  deleted, not commented out).

**Incorporated specialist findings (all resolved this round):**
- `[RULE]` reviewer-rule-checker's 3 LOW findings — unnecessary `as unknown as GameState` cast
  (`render.reward-banners.test.ts`), stale `audio.test.ts:297-315` exhaustive event list (missing
  `shield-bonus`/`tower-bonus`), and the `layoutText` mock dropping `opts?` — all **FIXED** this round
  and re-verified. The rule-checker also VERIFIED (still holds): core purity, determinism, `readonly`
  on `FORCE_BONUS_BY_WAVE`, and the BCD/ROM math against `WSGAS.MAC`.
- `[RULE]` reviewer-rule-checker confirmed the one-line `enterPhase` fix adds no new rule violation
  (core boundary intact, no new escapes) — re-checked manually on the small diff.
- `[EDGE]` custom adversarial pass's blocking Bug 1 (S-016 phase-boundary bypass) — **FIXED**
  (regression tests RED→GREEN); Bug 2 (pre-existing win-while-dead) and Bug 3 (cosmetic banner count)
  deferred as non-blocking Delivery Findings.

**Data flow traced:** clean port kill → `forceBonusForWave(wave)` + `SHIELD_BONUS_PER_UNIT × lives`
→ `score` + `shield-bonus` event → HUD/banner (safe; deterministic, `t`-driven).
**Pattern observed:** the S-016 window is now a single shared `loseShield` funnel with a run-continuous
`shieldHitAt` stamp (`sim.ts:1221`) — mirrors the ROM GS.GLW gauge correctly across phases.
**Error handling:** N/A (pure sim; no I/O). Null handling on the stamps uses explicit `!== null`.
**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.