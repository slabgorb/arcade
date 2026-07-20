---
story_id: "sw7-10"
jira_key: "sw7-10"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-10: R10 Attract mode and starfield — rotating INS/SCR pages, intro crawl, in-flight coaching messages, the WSSTAR starfield

## Story Details
- **ID:** sw7-10
- **Jira Key:** sw7-10
- **Workflow:** tdd
- **Stack Parent:** sw7-3 (done)
- **Branch:** feat/sw7-10-attract-mode-starfield (pre-existing)
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T00:51:18Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T18:35:12Z | 2026-07-19T18:38:30Z | 3m 18s |
| red | 2026-07-19T18:38:30Z | 2026-07-19T20:45:38Z | 2h 7m |
| green | 2026-07-19T20:45:38Z | 2026-07-19T21:35:33Z | 49m 55s |
| review | 2026-07-19T21:35:33Z | 2026-07-19T22:10:01Z | 34m 28s |
| red | 2026-07-19T22:10:01Z | 2026-07-19T23:15:34Z | 1h 5m |
| green | 2026-07-19T23:15:34Z | 2026-07-20T00:10:53Z | 55m 19s |
| review | 2026-07-20T00:10:53Z | 2026-07-20T00:37:17Z | 26m 24s |
| red | 2026-07-20T00:37:17Z | 2026-07-20T00:51:18Z | 14m 1s |
| finish | 2026-07-20T00:51:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (non-blocking): the clone has already INHERITED the ROM's stale BON comment.
  `src/core/state.ts:171` says MS.BON is "DEATH STAR BONUS EARNED"; the ROM defines
  `MS.BON` as `<STARTING WAVE BONUS>` (TCMES.MAC:617). The wrong text comes from the ROM's
  own call-site comment (`WSMAIN.MAC:3362 ;"DEATH STAR BONUS EARNED"`) — a label's comment
  is not a caller. Affects `src/core/state.ts` (correct the comment while wiring BON).
  *Found by TEA during test design.*
- **Gap** (non-blocking): H-022 trigger conditions Dev must wire, verified verbatim —
  SFB/STF space alternation `WSMAIN.MAC:2987-2998` (gated on `SC.FWV` first-wave, early in
  phase, alternating on `ANDB #10`); ACW trench `WSMAIN.MAC:3196-3203`; BON end-of-wave
  `WSMAIN.MAC:3355-3363` (first wave, `GM.WAV != 0`); SHIELD GONE `WSGAS.MAC:113-118`
  (`GS.HIT == 0 && S.GAS <= 0`, drawn at DOUBLE size in place of the gauge, `VWGONE`
  `WSGAS.MAC:166-170`). Affects `src/core/sim.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): BSE is OPTION-GATED and the clone models no operator options.
  `MS.BSE <ADDED TO DEFLECTOR SHIELD>` / `MS.BSE+1 <SHIELD AT FULL STRENGTH>`
  (TCMES.MAC:615-616) fire only when the "bonus fuel on killing the Death Star" option is
  enabled (`OPTS1 & 03`, `WSMAIN.MAC:3326-3328`) and the amount is a runtime nibble
  (`VWNIBL`), not part of the string. Needs a ruling: emulate the option as always-on, or
  descope. Not pinned by RED. Affects `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): the ROM starfield is the FLIGHT backdrop too, not just the attract
  screen — in-flight `ST.UX` is driven off `FRAME` (`WSMAIN.MAC:2525-2528`). RED pins the
  field only on the attract screen; Dev should also render it behind the space phase.
  Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking, STANDING): the shared VGMSGA font has no apostrophe or period glyph
  (`GLYPH_CHARS` = space/0-9/A-Z/`-_,/`) and silently degrades a miss to a BLANK. The crawl
  needs both (`THE EMPIRE'S …` plus four sentence periods, TCMES.MAC:625-632) and the INS
  brief is full of them. Shell assertions are tolerant, but the on-screen result has gaps.
  Adding glyphs is a cross-repo `@arcade/shared` bump — out of scope for a game-only story.
  Affects `@arcade/shared/font`. *Found by TEA during test design.*
- **Improvement** (non-blocking): scope correction — the story text lists BRE under H-022,
  but "BONUS FOR REMAINING ENERGY" + "5,000  X N" ALREADY SHIPPED in sw7-4 / S-013
  (`drawTrenchBanners`, pinned by `tests/shell/render.reward-banners.test.ts`), as did the
  50,000-towers banner (H-021). Deliberately NOT re-pinned. Affects the story description
  only. *Found by TEA during test design.*
- **Improvement** (non-blocking): the project's hardest rule (CLAUDE.md core purity) had NO
  automated guard before this story — `src/core` was protected by convention alone.
  `tests/core/core-purity.test.ts` now enforces it (no wall clock / Math.random / rAF / DOM,
  no shell import), comment- and string-aware with fixture self-tests. Worth keeping and
  extending to the sibling games. Affects `tests/`. *Found by TEA during test design.*
- **Improvement** (non-blocking): once Dev lands the fields on `GameState`, the
  `as unknown as` bridge in `tests/support/sw710-contract.ts` can collapse to a plain typed
  accessor — it exists only because the target shape does not exist yet. Affects
  `tests/support/sw710-contract.ts`. *Found by TEA during test design.*

### TEA (test design — rework round 2)

- **Gap** (blocking, successor story): the starfield MOTION MODEL diverges from the ROM and is
  not pinned by any test. The cabinet drives FOUR different drift directions, one per attract
  page — `SMVBNR` X+Z "45 DEGREES UP", `SMVINS` Y "SIDEWAYS", `SMVSCR` Z "UP", `SMVHIS` X
  "FORWARD" (WSMAIN.MAC:2244-2269, never cited in the change) — and the port runs a single
  uniform Z-closing drift on all four. Needs a ruling before it can be pinned. Affects
  `src/core/starfield.ts`, `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (blocking, successor story): `STAR_SPEED = 0x40` has no ROM basis and contradicts the
  source rate. Every mover above steps `#0080`, and in flight `ST.UX = FRAME<<7` advances 128 =
  `#0080` per game frame — the port's `0x40` is exactly half, written in hex inside a block of
  genuine citations so it reads as transcribed. Two acceptable fixes (adopt `0x80`, or keep the
  tuned value in decimal and label it non-ROM); TEA will not prejudge which. Affects
  `src/core/starfield.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): `STAR_NEAR` / `STAR_FAR` / `STAR_SPREAD` are invented — the ROM field
  is a Math Box point cloud with an `RND8` re-roll and has no depth band at all. Two adjacent
  divergences were logged honestly; these three were not, and they define a model the cabinet
  does not have. Affects the Design Deviations list. *Found by TEA during test design.*
- **Gap** (non-blocking): two coaching gates are unimplemented AND unlogged — `BS.RPT == 0`
  ("first time thru this trench", WSMAIN.MAC:3190-3191) and `Q.ATP == 0` (:3192-3193). Dev
  logged dropping `PH.TIM` but not these. The clone has no analog for either, so both need a
  ruling. Affects `src/core/coaching.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): inline ROM citations in `src/` remain ungated — three wrong
  anchors reached review (`WSMAIN.MAC:3176` should be `:3178`; `WSSTAR.MAC:110` should be `:113`,
  twice). `citations.test.ts` machine-checks only `docs/audit/findings/*.json`. A scanner that
  extracts `\w+\.MAC:\d+` from `src/**` comments and resolves each against the source tree
  would have caught all three, and this story is the second to trip on it. Affects
  `tests/audit/`. *Found by TEA during test design.*
- **Conflict** (non-blocking): `tests/support/sw710-contract.ts:35-38` documents `CrawlLine.size`
  CORRECTLY ("size grows 0→1 as the line recedes to its vanishing point") while
  `src/core/attract.ts:30` states the inverse. That makes the contract a FOURTH source agreeing
  against the production docstring. When the `as unknown as` bridge is collapsed (Dev's routed
  finding), keep the contract's string DATA independent — re-pointing `INTRO_CRAWL` at
  `src/core/attract.ts` would make `intro-crawl.test.ts:45` compare the export to itself.
  Affects `tests/support/sw710-contract.ts`. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): the `SPMBLK` crawl-pacing machine is unported. `SPMESS`
  (TCMES.MAC:395-420) does not run the crawl at a constant rate — it updates only while
  `0x40 <= BN.CNT < 0xE0`, FREEZES from `0xE0` to `0x160`, then runs and accelerates each
  line to `#0400` (4× the `#0100` `SPMON` seed) as the one ahead retires. That pacing is
  what keeps the cabinet's field from piling up at the vanishing point, and its absence is
  why the shell needed a linear rather than 1/depth recession to stay legible. Affects
  `src/core/attract.ts` (`crawlAt`) and `src/shell/render.ts` (`drawBannerPage` — revisit
  the curve together with the pacing). *Found by Dev during implementation.*
- **Question** (non-blocking): TEA's BSE ruling is still open and Dev did not resolve it —
  `MS.BSE` / `MS.BSE+1` (TCMES.MAC:615-616) remain unimplemented, since they are gated on
  an operator option (`OPTS1 & 03`, WSMAIN.MAC:3326-3328) the clone does not model and the
  amount is a runtime nibble. `COACHING` carries no BSE entry. Affects `src/core/coaching.ts`.
  *Found by Dev during implementation.*
- **Gap** (non-blocking): `MS.BON` and `MS.SHG` are defined in `COACHING` with verified ROM
  citations and render correctly when set, but nothing in the core SETS them — BON needs an
  end-of-wave bonus hook (WSMAIN.MAC:3355-3363) and SHIELD GONE needs the `GS.HIT == 0 &&
  S.GAS <= 0` gauge-substitution path (WSGAS.MAC:113-118), including its DOUBLE-size draw in
  place of the gauge (`VWGONE`, :166-170), which collides with the clone's lives=0 →
  game-over model. Both are pinned at the render seam only, exactly as TEA scoped them.
  Affects `src/core/coaching.ts`, `src/shell/render.ts`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the stale-BON comment TEA flagged is FIXED — `state.ts`
  now names `MS.BON` as `<STARTING WAVE BONUS>` (TCMES.MAC:617) and records that
  "DEATH STAR BONUS EARNED" is the stale WSMAIN.MAC:3362 call-site comment. Affects
  `src/core/state.ts` (done, no action). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the `as unknown as` bridge in `tests/support/sw710-contract.ts`
  can now collapse — `GameState` really carries `starfield` / `attract` / `coaching`, and the
  contract's `Star` / `AttractPage` / `CrawlLine` / `AttractState` types are duplicates of the
  ones now exported from `src/core/starfield.ts` and `src/core/attract.ts`. Left in place so
  the RED suites stay byte-identical for review. Affects `tests/support/sw710-contract.ts`.
  *Found by Dev during implementation.*
- **Gap** (non-blocking, observed): the running game logs a 404 for
  `https://arcade-assets.slabgorb.com/star-wars/music/finish_ground.wav` — a music track that
  is referenced but not uploaded to the R2 assets bucket. Pre-existing and unrelated to this
  story; noticed while verifying in the browser. Affects the `arcade` assets bucket.
  *Found by Dev during implementation.*
- **Conflict** (non-blocking): the shared VGMSGA font's missing apostrophe/period glyphs
  (TEA's STANDING finding) is now VISIBLE front-of-house, not just theoretical — verified on
  screen, the scoring page reads "DARTH VADER S SHIP" and every numbered instruction reads
  "1  YOUR X-WING…" with the period blanked. The core keeps the authentic strings, so adding
  the glyphs to `@arcade/shared/font` fixes all of it with no game-side change. Affects
  `@arcade/shared/font`. *Found by Dev during implementation.*

### Reviewer (code review — round 2)

- **Gap** (non-blocking, STRUCTURAL): the "assert each fidelity string appears SOMEWHERE"
  idiom is a house pattern across this game's shell suites (`has(sub) = texts().some(t =>
  t.includes(sub))`), and it cannot pin a ROW — only a bag of substrings. R1 proves it lets
  two ROM values swap silently. The same helper shape appears in `render.coaching.test.ts`,
  `render.intro-crawl.test.ts` and `render.attract-pages.test.ts`, and by inspection the
  sibling games' render suites use the same trick. Any table where the PAIRING carries the
  fidelity (score tables, per-wave constants, message→trigger maps) is unguarded wherever this
  idiom is used. Worth a sweep beyond this story. Affects `tests/shell/` across games.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the inline-ROM-citation scanner has now been requested by
  TEA (round 1), the Reviewer (round 1), and Dev (round 2), and this round required a FOURTH
  hand-verification pass to confirm six line numbers. Three separate agents doing the same
  manual check across two rounds is the argument for building it. Affects `tests/audit/`.
  *Found by Reviewer during code review.*
- **Question** (non-blocking): `drawStarfield`'s ad-hoc `focal = w / 2` matches the scene
  camera's implied focal (`FOV_Y = π/3` → `f·h/2`) only at ≈16:9, where it is 2.7% off. At 4:3
  it is 23% off and at 21:9 nearly 35%, so the backdrop's perspective and the world's diverge
  as the window changes shape. Needs a ruling: share the scene `proj` (fidelity-consistent) or
  keep an independent backdrop projection (and log it). Affects `src/shell/render.ts`.
  *Found by Reviewer during code review.*

### Dev (implementation — rework round 2)

- **Gap** (non-blocking, CARRIED FORWARD): F10 / F11 / F12 are NOT addressed in this round and
  remain open for a successor story, exactly as TEA routed them — the per-page starfield drift
  model (`SMVBNR`/`SMVINS`/`SMVSCR`/`SMVHIS`, WSMAIN.MAC:2244-2269), `STAR_SPEED = 0x40` vs the
  source's `#0080`, and the two unimplemented coaching gates (`BS.RPT`, `Q.ATP`,
  WSMAIN.MAC:3190-3193). Each needs a product ruling, and no test pins any of them, so nothing
  will go red when they are picked up. Affects `src/core/starfield.ts`, `src/core/coaching.ts`.
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the inline-citation scanner that TEA and the Reviewer both
  asked for is now recommended a THIRD time, and this round is the evidence — all three wrong
  anchors (`WSMAIN.MAC:3176`→`:3178`, `WSSTAR.MAC:110`→`:113` twice) were fixed by hand, and a
  hand fix is exactly what the next one will need too. `tests/audit/citations.test.ts` already
  has the resolve-a-quote-against-the-source machinery; pointing it at `\w+\.MAC:\d+` comments
  in `src/**` is mostly wiring. Affects `tests/audit/`. *Found by Dev during implementation.*
- **Question** (non-blocking): the game-over screen being UNREACHABLE (the Reviewer's own
  pre-existing finding — `src/` never assigns `mode: 'gameover'`, death sets `gameOver: true`
  with `mode` staying `'playing'`) is now load-bearing for MY fix, not just cosmetic. The F3
  guard clears the hint via the `gameOver` flag precisely because the mode does not change. If
  a successor story repairs the mode assignment, `coachingFor`'s `mode !== 'playing'` gate will
  start covering the same case and the `gameOver` gate becomes belt-and-braces — correct either
  way, but worth reading together rather than deleting one as redundant. Affects
  `src/core/sim.ts`, `src/core/coaching.ts`. *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (non-blocking): inline ROM citation comments in `src/` are ENTIRELY UNGATED. The
  `tests/audit/citations.test.ts` gate (12/12 green, source side included) machine-checks
  the `docs/audit/findings/*.json` anchors only — it never reads a `// WSMAIN.MAC:NNNN`
  comment in source. That is the structural reason the wrong anchor in `render.ts:1211`
  survived TEA, Dev and every gate. Worth a scanner that extracts `\w+\.MAC:\d+` from
  `src/**` comments and resolves each against the source tree. Affects `tests/audit/`
  (new guard). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the game-over screen is UNREACHABLE in real play, and this is
  PRE-EXISTING, not caused by sw7-10 — but sw7-10 is the first story to trip over it.
  Nothing in `src/` ever assigns `mode: 'gameover'` (only test fixtures do); production
  signals death with `gameOver: true` while `mode` stays `'playing'` (`sim.ts:537`, `:937`,
  `:1185`, `:1344`). So `render.ts`'s `else if (state.mode === 'gameover')` → `drawGameOver`
  never fires, and the death screen shows the live-play furniture instead. Affects
  `src/core/sim.ts`, `src/shell/render.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): when the `as unknown as` bridge in
  `tests/support/sw710-contract.ts` is collapsed (Dev's own routed finding), collapse the
  TYPES ONLY. The contract's `INTRO_CRAWL` / message string DATA is the independent spec
  that `tests/core/intro-crawl.test.ts:45` compares production output against; re-pointing
  it at `src/core/attract.ts` would make that assertion compare the export to itself and go
  tautological. Affects `tests/support/sw710-contract.ts`. *Found by Reviewer during code
  review.*
- **Improvement** (non-blocking): the ROM paints the shield count into the
  "FOR   COLLISIONS." gap with four pre-positioned messages `<6> <7> <8> <9>` at
  TCMES.MAC:569-572 (x=`0084`, y=`0144` — exactly the y of the COLLISIONS line at :556),
  not via `VWNIBL` as `src/core/attract.ts:133` states. Useful ground truth for whoever
  implements the operator option. Affects `src/core/attract.ts` (comment).
  *Found by Reviewer during code review.*
- **Question** (non-blocking): `drawStarfield` is called unconditionally at the top of
  `render()`, so the field now draws behind the Death Star SURFACE and the TRENCH as well
  as space. The ROM evidence I found covers the attract pages (`SMVINS`/`SMVSCR`,
  WSMAIN.MAC:706/:737) and space in flight (:2525-2528); I found none for stars inside the
  trench. Probably harmless on an additive vector display, but it is an unverified fidelity
  claim. Affects `src/shell/render.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Starfield seeded from the sim RNG instead of the cabinet's hardware RNG**
  - Spec source: context-story-sw7-10.md, cluster M-015 ("the entire WSSTAR starfield subsystem")
  - Spec text: placement calls `RND8`, which reads a hardware random byte `P.RND1`
    (WSMATH.MAC:173-178, SNDAUD.MAC:18) — the cabinet's field is non-deterministic
  - Implementation: tests pin a 50-star field generated deterministically from `state.rng`
  - Rationale: CLAUDE.md's hard rule forbids `Math.random`/wall clock in `core`; a replayable
    deterministic sim cannot host a hardware RNG. A seeded field is the only faithful option
  - Severity: minor
  - Forward impact: same seed always reproduces the same sky — documented divergence, and the
    determinism test is what stops a `Math.random()` starfield shipping

- **Interactive attract navigation not pinned**
  - Spec source: context-story-sw7-10.md, cluster H-017 ("rotating INS/SCR pages")
  - Spec text: `STRTCK` lets the yoke jump pages mid-rotation — hard-left → INSTRUCTIONS,
    hard-right → HIGH SCORE (WSMAIN.MAC:573-591, signed site-X `#0A0`/`#60` = −96/+96)
  - Implementation: tests pin only the automatic timed rotation
  - Rationale: the clone has no coin/credit/operator-switch model and one `start` input; this
    is operator-facing front-of-house with no seam to hang it on
  - Severity: minor
  - Forward impact: routed as a Delivery Finding with citations; a later story can add it

- **Attract dwell pinned as ORDER + relative length, not absolute seconds**
  - Spec source: context-story-sw7-10.md, cluster H-017
  - Spec text: `PH.TIM = #0200` for INS/SCR (WSMAIN.MAC:688-689, 718-719), `#0100` for HIS
    (WSMAIN.MAC:883-884), banner ends at `BN.CNT >= #200` (TCMES.MAC:441-444)
  - Implementation: tests pin the cycle order BNR→INS→SCR→HIS and that the hiscore page dwells
    strictly SHORTER than the banner; the absolute tick→second conversion is not pinned
  - Rationale: converting ROM ticks to the clone's `dt` seconds needs the 20.508 Hz logic rate;
    pinning absolute seconds over-specifies Dev's conversion and is brittle. The tick constants
    are handed over with citations instead (the tp1-13 / rb4-4 "route the literal" pattern)
  - Severity: minor
  - Forward impact: Reviewer should diff-trace that the conversion actually uses 0x200/0x100

- **INS page copy pinned representatively; SCR page pinned in full**
  - Spec source: context-story-sw7-10.md, cluster H-017
  - Spec text: 20 instruction lines (TCMES.MAC:553-568) and 9 scoring lines (TCMES.MAC:573-581)
  - Implementation: every SCR row pinned (all 8 names + all 8 values + header); INS pinned by
    header + two representative lines
  - Rationale: the scoring table IS the fidelity payload (per-enemy point values); the flight
    brief is prose where pinning all 20 lines adds brittleness without proportionate value
  - Severity: minor
  - Forward impact: Dev transcribes the full brief from the cited lines; Reviewer diff-traces
    the 20 lines against TCMES.MAC:553-568

- **H-022 pinned at the message + two clearest triggers; the rest routed**
  - Spec source: context-story-sw7-10.md, cluster H-022 (SFB/STF/ACW/BON/BRE/BSE/SHIELD GONE)
  - Spec text: each message has its own deep-state ROM trigger (see the Delivery Findings)
  - Implementation: core pins the SFB/STF first-wave-space and ACW first-wave-trench triggers;
    the TEXT of SHIELD GONE and BON is pinned at the render seam; BSE is not pinned at all;
    BRE is deliberately not re-pinned (already shipped by sw7-4)
  - Rationale: BSE is gated on an operator option the clone does not model, and SHIELD GONE's
    "replace the gauge at double size" collides with the clone's lives=0 → game-over model —
    both need a Dev/ruling seam rather than a fabricated test
  - Severity: minor
  - Forward impact: the exact ROM conditions are handed over verbatim as Delivery Findings

- **Font-gapped punctuation asserted tolerantly**
  - Spec source: context-story-sw7-10.md, clusters H-018 / H-017
  - Spec text: `<THE EMPIRE'S DEATH STAR, UNDER THE>` (TCMES.MAC:627) and the period-bearing
    brief/crawl lines
  - Implementation: the apostrophe line is matched with an optional apostrophe; period-bearing
    lines are matched on a punctuation-free substring
  - Rationale: the shared font has no apostrophe/period and blanks a miss, so forcing the exact
    char would pin an unrenderable string (the sw7-3 LEIA'S precedent)
  - Severity: minor
  - Forward impact: the core keeps the AUTHENTIC string; the render gap is a standing finding

- **Added a core-purity guard beyond the story's ACs**
  - Spec source: agent definition Phase B (rule-enforcement tests) + CLAUDE.md
  - Spec text: "`core/` is a PURE deterministic simulation … never import from `shell/`, touch
    the DOM, call Date.now()/Math.random()/requestAnimationFrame"
  - Implementation: added `tests/core/core-purity.test.ts` — a comment/string-aware scanner with
    fixture self-tests, mutation-tested in both directions
  - Rationale: this story adds the clone's first core randomness (starfield) and core timers
    (attract dwell) — exactly where the rule gets broken — and NO automated guard existed
  - Severity: minor (additive; passes on today's tree)
  - Forward impact: a new permanent gate on all of `src/core`; worth porting to the sibling games

- **Rework round 2: three round-1 findings pinned by tests, four routed instead**
  - Spec source: sw7-10 session file, `## Reviewer Assessment` + `### Reviewer Addendum` (12 findings)
  - Spec text: the review routed red→TEA for findings that are "testable (logic bugs,
    missing edge cases)"
  - Implementation: F1, F3, F4, F5 and F7 get mutation-proven guards. F2 and F9 (wrong ROM
    line numbers), F6 (`as unknown as` collapse) and F8 (the VWNIBL prose) are DEV EDITS with
    no observable behaviour to assert — a test cannot pin a comment's line number. F10, F11
    and F12 are routed to a successor story, not tested here (see the next entry).
  - Rationale: writing a test per prose defect would fabricate coverage; the citation sweep is
    verified by reading the source, which the review already did line-by-line.
  - Severity: minor
  - Forward impact: Dev must fix F2/F6/F8/F9 by hand — no test will go red if they are skipped

- **F10/F11/F12 (starfield motion model, star rate, missing coaching gates) NOT pinned**
  - Spec source: `### Reviewer Addendum`, findings F10/F11/F12
  - Spec text: the ROM runs FOUR per-page star drift directions (WSMAIN.MAC:2244-2269) at
    `#0080` per game frame; the port runs one uniform Z drift at `0x40`. Two coaching gates
    (`BS.RPT`, `Q.ATP`, WSMAIN.MAC:3190-3193) are unimplemented and unlogged.
  - Implementation: no tests written for any of the three
  - Rationale: each needs a PRODUCT RULING before it can be pinned, and pinning either
    outcome would be fabricating a decision TEA does not own. `STAR_SPEED` has two acceptable
    resolutions the review itself named (adopt `0x80`, or keep the tuned value and label it
    honestly as non-ROM) — a test forcing one would prejudge it. The per-page drift model and
    the two missing gates are new BEHAVIOUR, not a defect in what shipped; adding them inside
    a rework round is scope creep on a story already rejected for a narrow safety-net hole.
  - Severity: minor
  - Forward impact: routed as blocking Delivery Findings for a successor story; the ROM
    anchors are recorded verbatim so no one has to re-derive them

### Dev (implementation)

- **Starfield seeded from a SEPARATE cursor, not `state.rng`**
  - Spec source: TEA's Design Deviation "Starfield seeded from the sim RNG", tests/core/starfield.test.ts
  - Spec text: "the starfield is seeded off `state.rng`"
  - Implementation: `makeStarfield(seed)` builds its own `createRng(seed)` cursor; `state.rng`
    is never drawn from at construction
  - Rationale: drawing 150 floats off `state.rng` in `initialState` would shift EVERY
    downstream seeded expectation in the suite (TIE spawn laterals, fire rolls, trench
    chains). A private cursor off the same seed satisfies both RED assertions — same seed
    reproduces the field, different seed changes it — at zero blast radius. It is the same
    `createRng(s.rng.seed)` local-cursor idiom `enterPhase` already uses for the trench.
  - Severity: minor
  - Forward impact: none for behaviour; a reader must not assume the sky and the gameplay
    stream share a cursor

- **Star recycling WRAPS instead of re-rolling from the RNG**
  - Spec source: context-story-sw7-10.md, cluster M-015
  - Spec text: `STARNW` re-places a passed star from `RND8` (WSSTAR.MAC:362-364)
  - Implementation: a star reaching `STAR_NEAR` wraps back to `STAR_FAR` keeping its x/y
  - Rationale: re-rolling needs an RNG inside the per-frame step, which would either mutate
    `state.rng` (impurity) or need a cursor threaded through every return path. Wrapping is
    pure arithmetic, and with 50 stars on 50 tracks at 50 phases it is visually a sky —
    confirmed on the running game.
  - Severity: minor
  - Forward impact: a star's track repeats with period ≈8.5 s; nothing reads star positions

- **The `SPMBLK` crawl-pacing machine is not ported; the crawl runs at a constant rate**
  - Spec source: context-story-sw7-10.md, cluster H-018
  - Spec text: `SPMESS` (TCMES.MAC:395-420) does not advance the crawl uniformly — it updates
    only while `0x40 <= BN.CNT < 0xE0`, FREEZES between `0xE0` and `0x160`, then runs and
    accelerates each successive line to `#0400` (4×) as the one ahead of it retires
  - Implementation: `crawlAt(pageAge)` derives each line's size as a constant `#0100`/frame
    accumulation from its `TSPMAL` alarm to the `#0F000` retirement
  - Rationale: the freeze/accelerate machine is sequential, stateful list-walking whose only
    observable purpose is pacing; RED pins entry order, stagger and per-line recession, all
    of which the constant-rate derivation satisfies exactly. Deriving from `pageAge` also
    keeps the crawl unable to drift from the page clock.
  - Severity: minor
  - Forward impact: routed as a Delivery Finding — it is the reason the SHELL needed a
    gentler-than-perspective recession curve (below) to stay legible

- **The crawl's on-screen recession is LINEAR, not a true 1/depth perspective**
  - Spec source: context-story-sw7-10.md, cluster H-018 ("THE 'STAR WARS' EFFECT")
  - Spec text: the lines "RECEDE INTO THE DISTANCE" (TCMES.MAC:167, :231)
  - Implementation: `drawBannerPage` tapers both row and type size linearly in the line's
    remaining life
  - Rationale: measured on the running game, a strict 1/depth curve put the six late-cycle
    survivors inside 36 px at 3.5 px type — a solid unreadable bar. The cabinet tolerates a
    harder taper only because its crawl freezes and then clears 4× fast (the deviation
    above); at a constant rate the gentler curve is what keeps eight simultaneous lines
    legible. Direction is still ROM-correct: the accumulator counting UP is the line getting
    SMALLER, which the ROM states outright at WSMAIN.MAC:3176 `LDD #VGSCAL-100 ;DOUBLE SIZE`
    (a SMALLER scale field draws BIGGER).
  - Severity: minor
  - Forward impact: whoever ports `SPMBLK` should revisit the curve — the two are coupled

- **AVOID CATWALKS shows on the first-wave trench (the ROM's `BS.WAV` gate is re-read)**
  - Spec source: tests/core/coaching-messages.test.ts; WSMAIN.MAC:3193-3203
  - Spec text: `LDA BS.WAV / IFEQ ;?FIRST WAVE WITHOUT CATWALKS? / LDB #MS.SFB` — on the
    first Death Star the cabinet shows only SHOOT FIREBALLS, and alternates in ACW after
  - Implementation: the trench alternates SFB/ACW on every first-wave run
  - Rationale: the gate's own comment says WHY it exists — that trench has no catwalks yet.
    Our clone seeds catwalks into EVERY trench (`spawnTrenchObstacles` on each phase entry),
    so the ROM's condition read semantically ("are there catwalks to avoid?") is always true
    here. Porting the literal `BS.WAV == 0` test would suppress a warning about a hazard
    that is genuinely present — the letter of the ROM against its own intent.
  - Severity: minor
  - Forward impact: if a later story makes wave-1 trenches catwalk-free, this gate should
    become a real catwalk-presence check rather than reverting to `BS.WAV`

- **Coaching shows throughout the phase, not in the ROM's end-of-phase window**
  - Spec source: WSMAIN.MAC:2987-2998 (space), :3186-3203 (trench)
  - Spec text: both call sites gate on the phase countdown — space on `PH.TIM < 20*5`,
    trench on `PH.TIM <= 08`; `PH.TIM` counts DOWN, so these are the phase's closing ticks
  - Implementation: `coachingFor` shows the hint for the whole first-wave space/trench phase
  - Rationale: the clone's phases have no `PH.TIM` countdown at all — space ends on a kill
    quota and the trench on the port — so there is no "last 100 ticks" to hang the window
    on. RED also requires a hint on the FIRST space frame, which an end-of-phase window
    could not produce. Fabricating a countdown purely to gate a message would invent
    pacing the clone does not otherwise have.
  - Severity: minor
  - Forward impact: if a phase timer is ever added, re-gate these two call sites onto it

- **Three sw7-3 shell tests re-seated onto the attract page that now carries the board**
  - Spec source: tests/shell/font-text-seam.test.ts, tests/shell/render.rebel-force-board.test.ts
  - Spec text: those suites build `mode: 'attract'` and expect the marquee AND the
    high-score board on the same screen
  - Implementation: their fixtures now seat `attract.page: 'hiscore'` for the board
    assertions; the font-seam test's combined case is split into a banner case and a
    hiscore case. Every assertion is carried over unchanged — none weakened or dropped.
  - Rationale: H-017 makes the board its own page (PH$HIS, WSMAIN.MAC:338) instead of
    furniture under the marquee, so a banner-page fixture legitimately no longer draws it.
    The tests encoded the pre-rotation screen model, not a rule this story breaks.
  - Severity: minor
  - Forward impact: none — the sw7-3 H-011/H-020 guarantees still hold, on the hiscore page

- **`render.tie-death-fragments` baseline now matches out the coaching line**
  - Spec source: tests/shell/render.tie-death-fragments.test.ts
  - Spec text: `emptyBaseline` matches the compared frame's score/lives/phaseKills/`t` "so
    any segment difference is the fragment burst alone"
  - Implementation: added `coaching: like.coaching` to that list, and the bounded-burst case
    takes its baseline from the FINAL swept frame rather than the kill frame
  - Rationale: a first-wave space frame now also carries a coaching hint worth ~171 stroked
    edges, which the burst measurement was picking up as if it were fragments. This is the
    fixture's own stated pattern, extended to a field that did not exist when it was written;
    the final-frame baseline matters because the hint ALTERNATES (SFB ⇄ STF, different
    lengths). Re-verified by mutation: making the burst permanent (sim keeps `dyingTies`
    AND render drops its age gates) still fails the assertion, 582 vs 484.
  - Severity: minor
  - Forward impact: none

- **52 + 11 audit citations re-anchored (line numbers only)**
  - Spec source: tests/audit/citations.test.ts
  - Spec text: every finding quotes one of our lines byte-for-byte at a pinned line number
  - Implementation: ran `tools/audit/reanchor-citations.mjs --write` after inserting into
    `state.ts` / `sim.ts` / `render.ts`
  - Rationale: this is the tool's documented case 1 (the line MOVED, the quote is unchanged
    and still true). Both runs reported **0 lost**, and the resulting diff contains nothing
    but `"line":` fields — no quoted text was rewritten, so no finding was laundered.
  - Severity: minor
  - Forward impact: none

#### Dev — rework round 2

- **`STAR_NEAR` / `STAR_FAR` / `STAR_SPREAD` are INVENTED — logging them, as the review asked**
  - Spec source: `### Reviewer Addendum`, the note under F10/F11 ("add them to the deviation list")
  - Spec text: the ROM starfield is a Math Box point cloud placed by `RND8` with an `RND8`
    re-roll on recycle (WSSTAR.MAC:362-364). It has **no depth band at all** — no near plane,
    no far plane, no lateral spread constant. There is nothing in the source these three
    names transcribe.
  - Implementation: unchanged — the three constants stay (800 / 12000 / 3000). What changes
    is that they are now DECLARED as invention rather than sitting unremarked in a block of
    genuine citations.
  - Rationale: a depth band is what makes the wrap-recycle deviation (already logged) possible
    at all — you cannot wrap a field that has no far plane to wrap to. So the invention is
    load-bearing for a divergence the Reviewer already accepted, not decoration. Removing it
    would mean re-rolling from the RNG inside the per-frame step, which is the impurity the
    original deviation exists to avoid.
  - Severity: minor
  - Forward impact: whoever takes the F10/F11 successor story (per-page drift + `STAR_SPEED`)
    inherits these three as tuning constants with no ROM basis — they should be re-derived
    together with the motion model, not defended individually.

- **The F3 fix routes the game-over hold AND the attract screen through `finalizeFrame`**
  - Spec source: TEA Assessment (rework round 2), "the behavioural work is small — clear
    `coaching` (and step the field) on the game-over branch at `sim.ts:163`"; TEA also wrote
    "The fix is Dev's to choose … These tests pin the OBSERVABLE, not the mechanism."
  - Spec text: clear `coaching` on the game-over branch
  - Implementation: every return in the game-over branch now goes through `finalizeFrame`,
    and `coachingFor` gained a `gameOver` gate. I also re-routed the ATTRACT return through
    `finalizeFrame`, replacing its inline `stepStarfield` call — which no test demanded.
  - Rationale: the alternative (assigning `coaching: null` at the game-over returns) would
    have made the tests pass while leaving the same latent shape one branch over — attract
    also carried `coaching` forward untouched, so a stale hint survived into the idle screen
    too. Routing every non-`startRun` return through the one closing pass is what actually
    makes `GameState.coaching`'s "never accumulated" docstring TRUE, which is the finding.
    The attract re-route is a net DELETION (one duplicate `stepStarfield` call site removed),
    and it is arithmetically identical: `t = state.t + dt` is set unconditionally at the top
    of `stepGame` and every branch returns that same `t`, so `finalizeFrame`'s recovered
    `next.t - prev.t` is exactly `dt`. Verified by reading, and the pre-existing attract
    suites are unchanged and green.
  - Severity: minor
  - Forward impact: `finalizeFrame` is now the single closing pass for every step that is not
    `startRun`. A new return path added to `stepGame` should go through it too.

### Reviewer (audit)

Every logged deviation was checked against the ROM source firsthand. Stamps:

- **Starfield seeded from the sim RNG instead of the cabinet's hardware RNG** (TEA)
  → ✓ ACCEPTED. `STARNW`/`RND8` really do read hardware `P.RND1`; CLAUDE.md's purity rule
  forbids it. A seeded field is the only faithful option and the anti-vacuity test
  (`starfield.test.ts:59`, different seed ⇒ different field) is what stops a constant sky.
- **Starfield seeded from a SEPARATE cursor, not `state.rng`** (Dev)
  → ✓ ACCEPTED. Drawing 150 floats off `state.rng` in `initialState` would shift every
  downstream seeded expectation; the private-cursor idiom matches `enterPhase`'s existing
  trench cursor. Zero blast radius, both RED assertions satisfied.
- **Star recycling WRAPS instead of re-rolling from the RNG** (Dev)
  → ✓ ACCEPTED. `stepStarfield` wraps with a `while` loop, not a single subtraction, so it
  is total for any dt. Nothing reads star positions.
- **Interactive attract navigation (`STRTCK`) not pinned** (TEA)
  → ✓ ACCEPTED. Confirmed `JSR STRTCK` really is present at WSMAIN.MAC:711 and :742; the
  clone has no coin/operator model to hang it on. Routed with citations.
- **Attract dwell pinned as ORDER + relative length, not absolute seconds** (TEA)
  → ✓ ACCEPTED **as a deviation**, but its stated safety net is now discharged AND found
  wanting — see finding F4. TEA wrote "Reviewer should diff-trace that the conversion
  actually uses 0x200/0x100"; I did, and it does (WSMAIN.MAC:688-689, :718-719, :883-884,
  all hex operands, correctly read). The deviation is sound. What it leaves behind is a
  mutation-proven coverage hole, filed as F4 rather than charged against the deviation.
- **INS page copy pinned representatively; SCR page pinned in full** (TEA)
  → ✓ ACCEPTED. Note TEA's spec said "20 instruction lines"; the ROM range :554-568 is
  **15**, which is what Dev shipped. Dev is right, TEA's count was wrong; no action.
- **H-022 pinned at the message + two clearest triggers; the rest routed** (TEA)
  → ✓ ACCEPTED. BSE really is option-gated (`OPTS1 & 03`); descope is correct.
- **Font-gapped punctuation asserted tolerantly** (TEA) → ✓ ACCEPTED. Matches the sw7-3
  LEIA'S precedent; the core keeps the authentic ROM string, which is the important half.
- **Added a core-purity guard beyond the story's ACs** (TEA)
  → ✓ ACCEPTED, and singled out as the best thing in this story — the project's hardest
  rule had no automated guard at all. See F7 for two ways to widen it.
- **The `SPMBLK` crawl-pacing machine is not ported** (Dev)
  → ✓ ACCEPTED. Honestly described, correctly cited, and routed as a Delivery Finding.
- **The crawl's on-screen recession is LINEAR, not a true 1/depth perspective** (Dev)
  → ✓ ACCEPTED on the merits — the measured justification (eight simultaneous lines
  collapsing into a 36 px bar) is exactly the right reason, and the direction argument is
  correct. But the citation carrying that argument is wrong (F2) and the docstring stating
  the convention is inverted (F1). The deviation stands; its prose does not.
- **AVOID CATWALKS shows on the first-wave trench (`BS.WAV` re-read)** (Dev)
  → ✓ ACCEPTED, with evidence Dev did not cite. The ROM's own comment at WSMAIN.MAC:3195
  reads `;?FIRST WAVE WITHOUT CATWALKS?` — the gate's stated purpose IS "are there catwalks
  to avoid?". Our clone seeds catwalks into every trench, so alternating always is faithful
  to the intent; porting the literal `BS.WAV == 0` would suppress a warning about a hazard
  that is genuinely present. This is the letter-vs-intent call made correctly.
- **Coaching shows throughout the phase, not in the ROM's end-of-phase window** (Dev)
  → ✓ ACCEPTED. Verified both windows exist exactly as described: space
  `CMPD #20*5 / IFLO` (WSMAIN.MAC:2989-2991) and trench `LDA PH.TIM / CMPA #08 / IFLS`
  (:3187-3189). The clone genuinely has no `PH.TIM` countdown, and RED requires a hint on
  the first space frame, which an end-of-phase window could not produce.
- **Three sw7-3 shell tests re-seated onto the attract page that now carries the board** (Dev)
  → ✓ ACCEPTED. Diffed against `origin/develop`: every assertion is carried over, none
  weakened; the combined case is split, not dropped.
- **`render.tie-death-fragments` baseline now matches out the coaching line** (Dev)
  → ✓ ACCEPTED. Verified the stub's `fillRect` is a no-op (`:61`), so the new starfield
  cannot pollute `segCount`; only the coaching glyphs could, and they are matched out. The
  final-frame baseline is the right call given the hint alternates between two lengths.
- **52 + 11 audit citations re-anchored (line numbers only)** (Dev)
  → ✓ ACCEPTED, laundering-audited. 104/104 changed lines in `docs/audit/findings/` are
  `"line":` fields; grep for `verbatim|claim|title|reasoning|"source"|remediated_by` across
  the +/- lines returns EMPTY. No prose edited, no finding stamped remediated. Clean.

**Undocumented deviations found:** none. Every divergence I could identify was already
logged by TEA or Dev.

### Reviewer (audit — round 2)

Stamping only the deviations added since the round-1 audit. **Disclosure:** the Dev entries
below were written by me, one phase earlier in this same session. I have tried to audit them
as an outsider would, and where my Dev-side reasoning turned out to be load-bearing I say so
rather than quietly ratifying it.

- **Rework round 2: three round-1 findings pinned by tests, four routed instead** (TEA)
  → ✓ ACCEPTED. The split is correct: a test genuinely cannot pin a comment's line number,
  and F2/F6/F8/F9 have no observable behaviour. I verified all four were in fact done by hand
  rather than quietly dropped — `WSSTAR.MAC:113` is present at `starfield.ts:13` and
  `render.ts:1153`, `WSMAIN.MAC:3178` at `render.ts:1211`, no stale `:110`/`:3176` anchors
  remain, and the `VWNIBL` claim is gone from `attract.ts:147`. TEA's warning that "no test
  will go red if they are skipped" was accurate and the hand-check was necessary.

- **F10/F11/F12 (starfield motion model, star rate, missing coaching gates) NOT pinned** (TEA)
  → ✓ ACCEPTED. Each needs a product ruling, and pinning either outcome would fabricate a
  decision TEA does not own. Correctly re-stated as a carried-forward Delivery Finding by Dev
  so they cannot be lost. No action this round.

- **`STAR_NEAR` / `STAR_FAR` / `STAR_SPREAD` are INVENTED** (Dev)
  → ✓ ACCEPTED. Logged as the round-1 addendum asked. The rationale is right and non-obvious:
  the depth band is what makes the already-accepted wrap-recycle deviation possible at all —
  you cannot wrap a field with no far plane — so the invention is load-bearing rather than
  decorative. Correctly flagged as inherited by the F10/F11 successor.

- **The F3 fix routes the game-over hold AND the attract screen through `finalizeFrame`** (Dev)
  → ✓ ACCEPTED, and I checked the part that was asserted rather than shown. Dev's claim that
  the attract re-route is arithmetically identical rests on `t` being `state.t + dt` on every
  path; I read `sim.ts:140` and confirmed it is set unconditionally at the top of `stepGame`
  and that every touched branch returns that same `t`, so `finalizeFrame`'s recovered
  `next.t - prev.t` is exactly `dt`. The rule-checker independently enumerated all 9 top-level
  returns and confirmed all 8 non-`startRun` paths route through `finalizeFrame`. I also
  traced the one path neither of us had checked — `startRun` (`sim.ts:625`) returns a fresh
  `initialState(seed)` spread, so no stale `coaching`/`starfield`/`attract` survives into a new
  run. The deviation stands.

**Undocumented deviation found (round 2): one.**

- **`drawStarfield` performs its own perspective projection in the SHELL** — Spec said
  (CLAUDE.md, "The Hard Architectural Boundary"): "The 3D math lives entirely in
  `core/math3d.ts` … The shell only *consumes* projected coordinates to stroke glowing lines;
  it never does game math." Code does: `render.ts:1158-1170` computes `focal = w / 2` and
  `sx = w/2 + (s.x / s.z) * focal` — a hand-rolled perspective divide on world-space
  coordinates, in `src/shell`. Every other 3D object in the same `render()` instead consumes
  the shared `proj` Mat4 built once from `perspective(FOV_Y, w/h, NEAR, FAR)` at `render.ts:432`.
  Not logged by TEA or Dev. It IS self-described in a code comment ("a plain screen-space point
  divide, NOT a wireframe through the camera", `render.ts:1153-1157`), so it was a conscious
  choice rather than an accident — but a comment is not a deviation log, and this one diverges
  from the project's most important rule family. Severity: **M** (see finding R3 — it also has
  a measurable visual consequence off 16:9).

## Sm Assessment

**Routing to Furiosa (TEA) for the RED phase.** Setup verified on disk: session file
present, story context written, epic YAML flipped to `in_progress`, epic context file
confirmed untouched.

**What this story is:** a 10-point front-of-house roll-up of four distinct legacy
tickets. Treat each as its own AC cluster with its own RED tests:
- **H-017** — rotating attract sequence (banner → INS → SCR → hi-score) per the
  `WSMAIN` `TPHASE` state machine.
- **H-018** — receding intro-crawl special messages.
- **H-022** — in-flight coaching/bonus messages (`SFB`/`STF`/`ACW`/`BON`/`BRE`/`BSE`/
  "SHIELD GONE").
- **M-015** — the WSSTAR starfield subsystem in full.

**Primary source (ground truth — cite, do not invent ROM anchors):**
- `star-wars/docs/2026-07-15-star-wars-primary-source-audit.md` — the ruling sheet
  these four tickets were carved from ("by ruling" / "per WSMAIN TPHASE" point here).
- `star-wars/docs/star-wars-1983-source-findings.md` — WSSTAR / WSMAIN / TPHASE.
- Enriched story context: `sprint/context/context-story-sw7-10.md`.

**Guardrails for TEA:**
- Respect the `src/core` (deterministic sim) vs `src/shell` (render/audio/input)
  boundary — attract-phase state + starfield motion are core; drawing is shell.
- No fabricated ROM line numbers. Leave an anchor unspecified rather than staple a
  wrong one (this game has a history of confabulated citations). Anchor ACs to the
  two docs above.
- Given the size, consider building RED one cluster at a time rather than all four
  at once — but that's TEA's call.

**Branch:** `feat/sw7-10-attract-mode-starfield` (off `origin/develop` @ 1c02f0f),
already checked out in the star-wars subrepo.

**Merge gate:** clear (no open star-wars PRs). **Dependency `sw7-3`:** done/archived.

---

## TEA Assessment

**Tests Required:** Yes
**Reason:** four greenfield subsystems, all four audit items marked "Missing" — nothing to bypass.

**Test Files:**
- `tests/support/sw710-contract.ts` — the GREEN contract mirror (new `GameState` fields) + the
  verbatim ROM strings. Bridged with `as unknown as` so the RED tree stays `tsc`-clean.
- `tests/core/starfield.test.ts` — M-015: 50 stars, seeded-determinism (+ anti-vacuity), motion.
- `tests/shell/render.starfield.test.ts` — M-015: the field is actually drawn (mark-count delta,
  primitive-agnostic so Dev picks the dot primitive).
- `tests/core/attract-rotation.test.ts` — H-017: all four pages visited, every transition in ROM
  cycle order, hiscore dwell shorter than banner.
- `tests/shell/render.attract-pages.test.ts` — H-017: the SCORING table (8 names + 8 values) and
  the INSTRUCTIONS brief, plus page mutual-exclusion.
- `tests/core/intro-crawl.test.ts` — H-018: all 8 SPMS lines and only those, staggered entry,
  per-line recession.
- `tests/shell/render.intro-crawl.test.ts` — H-018: crawl text renders (apostrophe tolerant).
- `tests/core/coaching-messages.test.ts` — H-022: first-wave space SFB/STF + alternation, trench
  ACW, first-wave-only guard, BON mislabel refutation.
- `tests/shell/render.coaching.test.ts` — H-022: each message's ROM text; BON is
  "STARTING WAVE BONUS" and never "DEATH STAR BONUS EARNED".
- `tests/core/core-purity.test.ts` — Phase B rule guard (CLAUDE.md core purity).

**Tests Written:** 36 new tests across the 4 AC clusters + 1 rule guard.
**Status:** RED — 24 new-behavior assertions failing; `tsc --noEmit` exit 0; full suite
162 files / 1750 tests with **1726 green and zero collateral** (every pre-existing suite intact).

**Every ROM anchor was verified firsthand** against `~/Projects/star-wars-1983-source-text`
(the four research subagents' citations were treated as leads only). All source files are
`.RADIX 16` via `WSCOMN.MAC:5`; the star count `M$STNM ==50.` is trailing-dot DECIMAL.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| CLAUDE.md — `core/` is pure (no wall clock / `Math.random` / rAF / DOM) | `core-purity.test.ts` "no core module calls a wall clock…" | passing guard, mutation-tested |
| CLAUDE.md — `core/` never imports `shell/` | `core-purity.test.ts` "no core module imports from src/shell" | passing guard, mutation-tested |
| CLAUDE.md — determinism (seeded RNG only) | `starfield.test.ts` same-seed / different-seed pair | failing (RED) |
| TS #1 type-safety escapes | no `as any`; the one `as unknown as` is the documented mid-migration bridge; every `!` sits behind a `toBeDefined()` that aborts the test | reviewed, justified |
| TS #2 generics/interfaces | `readonly` on contract arrays; `Record<string \| symbol, unknown>`, never `any` | pass |
| TS #3 enum anti-patterns | `AttractPage` is a string UNION, not an enum | pass |
| TS #4 null/undefined | `ext()` returns `Partial<…>`; every read guarded before use | pass |
| TS #8 test quality | mock signature mirrors the real `layoutText` (framing-prompts precedent); no vacuous assertions | pass |

**Rules checked:** 3 project rules (2 newly automated) + 5 applicable lang-review checks.
**Self-check:** 0 vacuous assertions shipped. Stated plainly: **4 of the 36 pass pre-GREEN by
design** — the two page mutual-exclusion negatives, the first-wave-only over-trigger guard, and
the BON mislabel refutation. They are guards, not RED drivers, and only become load-bearing once
Dev lands the feature; every new-behavior assertion is RED. The purity guard's 8 also pass (it is
a guard on today's clean tree) and was mutation-tested in both directions, with a control run
restoring `src/core/state.ts` to its original md5.

**Scope note for Dev:** BRE ("BONUS FOR REMAINING ENERGY" + "5,000  X N") and the
50,000-towers banner ALREADY SHIPPED in sw7-4 — deliberately not re-pinned. Do not rebuild them.

**Handoff:** To The Word Burgers (Dev) for implementation. The contract to build is spelled out
in `tests/support/sw710-contract.ts`; the exact ROM trigger conditions that RED deliberately does
not pin are handed over verbatim in the Delivery Findings above.
---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/starfield.ts` (new) — the 50-star WSSTAR field: `M$STNM==50.` placement from a
  private seeded cursor, and the ST.U* viewer-translation step.
- `src/core/attract.ts` (new) — the TPHASE page machine (dwells `#0200`/`#0100` over TICK_HZ),
  the `TSPMAL`-staggered intro crawl derived from `pageAge`, and the verbatim INS/SCR page copy.
- `src/core/coaching.ts` (new) — `coachingFor`, the first-wave SFB/STF and SFB/ACW alternations
  on the ROM's `#10` mask, plus the ROM message strings (BON correctly `STARTING WAVE BONUS`).
- `src/core/state.ts` — `starfield` / `attract` / `coaching` on `GameState`, seeded in
  `initialState`; corrected the inherited stale BON comment.
- `src/core/sim.ts` — attract branch now rotates pages + drifts the field; new `finalizeFrame`
  runs the field step and re-derives coaching at all three active-play returns.
- `src/shell/render.ts` — `drawStarfield` behind the whole scene, the four attract pages
  (banner+crawl / instructions / scoring / hiscore), and `drawCoaching`.
- `tests/shell/font-text-seam.test.ts`, `tests/shell/render.rebel-force-board.test.ts`,
  `tests/shell/render.tie-death-fragments.test.ts` — re-seated onto the new page model /
  baseline, every assertion carried over (see Design Deviations).
- `docs/audit/findings/*.json` — 63 citations re-anchored, line numbers only, 0 lost.

**Tests:** 1751/1751 passing (GREEN), 162 files. `tsc --noEmit` exit 0. `npm run build` clean.
All 28 sw7-10 assertions green; zero collateral — the 7 failures the first full run surfaced
were all mine and are all resolved, verified against a stashed baseline rather than assumed
pre-existing.

**Verified in the browser** (own checkout on port 5284, not a sibling's): all four attract
pages, the crawl, the in-flight coaching line and the starfield were driven and screenshotted.
That is what caught the two defects the test suite could not — the crawl recession was
INVERTED (the ROM settles it: `LDD #VGSCAL-100 ;DOUBLE SIZE`, so a rising scale accumulator
shrinks the text), and the eight simultaneous lines collapsed into an unreadable 36 px bar.
Both fixed and re-verified on screen.

**Branch:** `feat/sw7-10-attract-mode-starfield` (pushed)

**Handoff:** To the Thought Police (Reviewer).

Worth the Reviewer's attention: (1) diff-trace the 15 brief lines and 8 scoring rows against
TCMES.MAC:553-581 and the 8 crawl lines against :625-632 — I transcribed them by hand;
(2) the dwell conversion really does route `0x200`/`0x100` through TICK_HZ, per TEA's note;
(3) the two coaching gates I re-read rather than transliterated (ACW's `BS.WAV`, and the
dropped `PH.TIM` end-of-phase window) are argued in the Design Deviations and are the most
contestable calls in the story.
---

## Subagent Results

**INFRASTRUCTURE FAILURE — the specialist fleet did not run.** Two subagents failed to
spawn outright (`Failed to send command to pane %2/%3: respawn pane failed: fork failed:
Device not configured`). Four more reported "Spawned successfully" but returned NOTHING
across ~10 minutes and four explicit status/FINAL-CALL pings each. I am recording that
truthfully rather than claiming coverage I did not receive.

Per the agent definition — *"Errors are not skips. If a subagent errored, note the error
and assess the specialist's domain yourself. You cannot claim coverage from a subagent
that failed."* — I covered every domain personally. The coverage column below states what
**I** did, not what a subagent did.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | **No** | error — spawned, never returned | none | Covered by Reviewer: full suite 1751/1751 (162 files), `tsc --noEmit` exit 0, `npm run build` clean — all three reproduced independently in the main tree |
| 2 | reviewer-edge-hunter | **No** | Skipped — disabled via settings | n/a | Covered by Reviewer: enumerated every `stepGame` return; established the shell drives a FIXED timestep (dt ≡ 1/60, elapsed clamped 0.25s, `@arcade/shared/dist/loop.js`), which retires the whole large-dt class |
| 3 | reviewer-silent-failure-hunter | **No** | Skipped — disabled via settings | n/a | Covered by Reviewer: found F3 (coaching frozen after death, empirically probed) and the `default:`-absorbs-unknown-page chain (F5) |
| 4 | reviewer-test-analyzer | **No** | error — spawned, never returned | none | Covered by Reviewer: read all 10 new suites; ran mutations M1 + M2 + a control in an ISOLATED worktree. Both mutations GREEN → findings F1 and F4 |
| 5 | reviewer-comment-analyzer | **No** | Skipped — disabled via settings | n/a | Covered by Reviewer: falsified every added claim; F1, F2, F3 and F8 are all comment defects |
| 6 | reviewer-type-design | **No** | Skipped — disabled via settings | n/a | Covered by Reviewer: `as unknown as` audit (F6), exhaustiveness audit (F5), confirmed zero non-null `!` in the new core modules |
| 7 | reviewer-security | **No** | error — spawned, never returned | none | Covered by Reviewer: no network/auth/tenancy surface; no persisted-state boundary touched by this diff; per-frame loops are fixed-size (50 stars, 8 crawl lines). No findings |
| 8 | reviewer-simplifier | **No** | Skipped — disabled via settings | n/a | Covered by Reviewer: enumerated `finalizeFrame`'s call sites — Dev's "all three active-play returns" claim is TRUE (`sim.ts:299`, `:300`, `:556`); dt-recovery via `next.t - prev.t` verified sound |
| 9 | reviewer-rule-checker | **No** | error — spawned, never returned | none | Covered by Reviewer: lang-review #1/#3/#8 checked exhaustively; core-purity rule checked against all 5 changed/new core modules; ~25 ROM citations verified byte-for-byte against the 1983 source |

**All received:** No — 0 of 9 returned (4 spawned-then-silent, 5 disabled by settings).
**Total findings:** 8 confirmed (1 High, 3 Medium, 4 Low), 0 dismissed, 0 deferred — **all
found by the Reviewer directly**, none inherited from a specialist.

**Enabled-but-silent subagents were:** preflight, test_analyzer, security, rule_checker
(`pf settings get workflow.reviewer_subagents`). The other five were disabled by settings.

---

## Subagent Results — round 2

Unlike round 1, the fleet **ran**. All four enabled specialists were spawned via the Agent
tool synchronously (not tmux) and all four returned. The round-1 infrastructure failure did
not recur.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1776/1776 (165 files), `tsc` exit 0, build exit 0, tree clean, HEAD==origin, zero smell hits on added lines |
| 2 | reviewer-edge-hunter | Yes (n/a) | Skipped — disabled via settings | n/a | Covered by Reviewer + security specialist: `stepStarfield` dt-domain enumerated (0/neg/NaN/huge/Infinity) → finding R4 |
| 3 | reviewer-silent-failure-hunter | Yes (n/a) | Skipped — disabled via settings | n/a | Covered by Reviewer: the round-1 silent failure (F3) is the fix under review; re-probed the game-over and attract paths and `startRun` for stale carryover — clean |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | **confirmed 2** — scoring-row pairing (→ R1, promoted to HIGH after I reproduced it) and the now-dead `Partial` guards (→ R5) |
| 5 | reviewer-comment-analyzer | Yes (n/a) | Skipped — disabled via settings | n/a | Covered by Reviewer: re-checked all four prose fixes landed (F1 docstring, F8 VWNIBL, F2/F9 anchors) and that no stale anchor survives |
| 6 | reviewer-type-design | Yes (n/a) | Skipped — disabled via settings | n/a | Covered by Reviewer + rule-checker: `Partial<Sw710Fields>` over required fields (R5); confirmed both `as unknown as` bridges gone with nothing equivalent substituted |
| 7 | reviewer-security | Yes | findings | 1 | **confirmed 1** (→ R4, non-terminating wrap for dt=Infinity). Determinism, localStorage, injection, network surfaces all reported clean with evidence |
| 8 | reviewer-simplifier | Yes (n/a) | Skipped — disabled via settings | n/a | Covered by Reviewer: the attract re-route is a net deletion (one duplicate call site removed); no over-engineering found in the rework diff |
| 9 | reviewer-rule-checker | Yes | findings | 10 across 19 rules / 88 instances | **confirmed 4** (R2 exhaustiveness, R3 shell projection, R5 `Partial`, R6 unguarded `!`), **dismissed 1** (makeStarfield's own RNG cursor — already a stamped, ACCEPTED deviation from round 1), **deferred 0**; remaining items were compliant-verdicts, not findings |

**All received:** Yes (4 enabled returned with findings/clean; 5 disabled by settings, each covered personally)
**Total findings:** 6 confirmed (1 High, 3 Medium, 2 Low), 1 dismissed (with rationale), 0 deferred

**Dismissal rationale (the one):** rule-checker rule #17 flagged `makeStarfield(seed)` drawing
from its own `createRng(seed)` cursor rather than `state.rng`. This is not dismissed on my
judgement — it is dismissed because it is an **already-adjudicated deviation**: logged by Dev,
and stamped `✓ ACCEPTED` by the round-1 Reviewer audit with the reason (drawing 150 floats off
`state.rng` in `initialState` would shift every downstream seeded expectation). Both subagents
that raised it noted it is self-disclosed. Re-charging a stamped deviation would be churn.

---

## Reviewer Assessment

**Verdict:** REJECTED

Let me say the good part first, because it is most of the story. I pulled the 1983 source
myself and checked this transcription line by line, and it is **byte-exact**: all 15 flight-brief
lines (TCMES.MAC:554-568), all 8 scoring rows including internal column spacing (:574-581),
all 8 crawl lines including the apostrophe, the four periods and the double space in
"REBEL PLANET.  YOU" (:625-632). The radix trap — the one that has bitten this project
before — is navigated correctly in **both** directions: `M$STNM ==50.` is read as decimal
50 (the trailing dot is really there, WSSTAR.MAC:28) while `#0200`/`#0100`/`ANDB #10` are
read as hex 512/256/16. The BON mislabel refutation is real and correct: TCMES.MAC:617
defines `<STARTING WAVE BONUS>` and :3362 carries the stale `;"DEATH STAR BONUS EARNED"`
call-site comment, exactly as claimed. The hanging-indent detail (numbered items at −444,
continuations at −420) is a genuine fidelity catch. `finalizeFrame` really does run at all
three active-play returns. The citation re-anchor is laundering-clean, 104/104. And the
core-purity guard is the most valuable thing here — the project's hardest rule had no
automated enforcement until this story.

I am rejecting on one finding, and it is a safety-net hole, not a code defect.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **[HIGH]** `[DOC]``[TEST]` | `CrawlLine.size`'s docstring states the **inverse** of the real convention, and nothing in 1751 tests catches acting on it | `src/core/attract.ts:30` | Correct the docstring; add a render assertion that varies `size` and pins direction |
| [MEDIUM] `[RULE]` | Wrong ROM anchor: `WSMAIN.MAC:3176` is `JSR VWMTWZ`; the quoted `LDD #VGSCAL-100 ;DOUBLE SIZE` is at **:3178** | `src/shell/render.ts:1211` (+ session file) | One character: 3176 → 3178 |
| [MEDIUM] `[SILENT]` | `GameState.coaching`'s "cannot get stuck on screen" is **false** — the hint freezes on screen permanently after any wave-1 death | `src/core/state.ts` (coaching docstring), `sim.ts:163` | Clear `coaching` (and step the field) on the game-over branch, or correct the claim |
| [MEDIUM] `[TEST]` | Radix-critical dwell constants have **zero** regression coverage — 0x200/0x100 → decimal 200/100 ships fully green | `tests/core/attract-rotation.test.ts` | One absolute assertion: `pageDwellSeconds('banner')` ≈ 24.97 s |
| [LOW] `[RULE]` | `drawAttract`'s `AttractPage` switch has `default:` with no `assertNever` (lang-review #3) | `src/shell/render.ts:1193` | Exhaustiveness check |
| [LOW] `[TYPE]` | `as unknown as` double-cast (lang-review #1) | `tests/support/sw710-contract.ts:2207,2213` | Collapse — **types only**, see Delivery Findings |
| [LOW] `[SIMPLE]` | Purity guard is non-recursive over `src/core`, and `SHELL_IMPORT` misses side-effect/dynamic imports; no `globalThis`/`self`/`crypto` ban | `tests/core/core-purity.test.ts:53,57` | Widen |
| [LOW] `[EDGE]` `[SEC]` | No live findings in these domains — recorded as checked, not as clean-by-assumption | — | none |

### The blocking finding, with its mutation proof

`src/core/attract.ts:30` says `size` runs "**0 at the vanishing point**, 1 at the `#0F000`
retirement." The code says the opposite, and so does everything else in the story:

- `render.ts:1216` computes `const remaining = 1 - line.size`, so `size: 0` yields
  `CRAWL_NEAR_PX` (26 px, biggest, lowest on screen) — **birth**, not the vanishing point.
- `render.ts`'s own comment: "`remaining` runs 1 at birth (near, big, low) to 0 at
  retirement (the vanishing point)."
- `tests/core/intro-crawl.test.ts:13`: "Size grows 0→1 over a line's life."
- `intro-crawl.test.ts:77`: "the line must recede (size grows toward its vanishing point)."

Three sources and the code agree; the exported type's docstring is the lone outlier, and
it is the only place the convention is actually documented.

**Mutation (mine, isolated `git worktree`, `node_modules` symlinked):**

| # | Mutation | Result |
|---|----------|--------|
| M1 | `PAGE_TICKS` `0x200`/`0x100` → decimal `200`/`100` (the radix misread) | **1749 passed — GREEN** |
| M2 | `render.ts` `const remaining = 1 - line.size` → `line.size` (re-invert the crawl) | **1749 passed — GREEN** |
| Control | unmutated HEAD, same worktree | 1749 passed — identical |

Both mutations were confirmed applied with `git diff --stat` before each run, and the
control proves the baseline. `render.intro-crawl.test.ts:61` fixes **every** line at
`size: 0.4`, so no test ever varies `size` and none can observe the direction.

Why this is High rather than another Medium: this is not a hypothetical. **The inverted
crawl already shipped once in this very story** — Dev's own assessment says the recession
"was INVERTED" and that only driving the running game in a browser caught it. The docstring
that survived is the pre-fix description. So the next developer to touch the crawl reads
the type contract, "corrects" the render to match it, watches 1751 tests pass, and re-ships
the exact bug a human eyeball caught the first time. A wrong docstring plus zero coverage
on the same axis plus a documented prior occurrence is a regression waiting with the door
held open. The code is right; the net has a tear directly under it.

**Data flow traced:** `pageAge` (core, seconds) → `crawlAt()` → `size = age / CRAWL_LIFE_TICKS`
(0→1) → `render.drawBannerPage` → `remaining = 1 − size` → type px + row y. Safe in its
current form; undocumented-correctly at the seam, which is the finding.

**Pattern observed (good):** the core/shell boundary is respected exactly — `attract.ts`,
`starfield.ts` and `coaching.ts` are pure data + arithmetic with zero DOM/clock/random, and
every drawing decision lives in `render.ts`. `coachingFor` returning `string | null` means
there is exactly one place a message string can be chosen, which is precisely what keeps the
stale ROM call-site comment out of the cabinet (`render.ts` drawCoaching:1140).

**Error handling:** `stepStarfield` wraps with `while (z < STAR_NEAR)`, total for any dt;
`drawStarfield` guards `z <= 0` and off-screen; `crawlAt` guards both ends of a line's life.
The one gap is non-finite propagation — a NaN `z` would silently persist — but it is
unreachable under a fixed timestep and I am not charging it.

**Security analysis:** no network, no auth, no tenancy, no persisted-state boundary touched
by this diff; per-frame work is fixed-size (50 stars, ≤8 crawl lines). No findings.

### Devil's Advocate

Let me argue this code is broken, as hard as I can, and then report honestly where I failed.

The strongest case against it is the one I have already made and proved: the crawl's
direction is documented backwards. But push further. What ELSE is undefended on a magnitude
axis? M1 answers that — the dwell constants. Two independent mutations on two different
subsystems both sailed through 1751 tests, which means the story's guards are systematically
*ordinal* (order, presence, relative length, "did it move") and almost never *absolute*. That
is a shape, not two accidents: `attract-rotation` asserts hiscore < banner; `starfield`
asserts "more than one signature"; `render.starfield` asserts "≥ 40 more marks";
`intro-crawl` asserts "later size > earlier size". Every one of those survives a constant
multiplier applied anywhere in the chain. A dev who halved `TICK_HZ`, doubled `STAR_SPEED`,
or scaled `CRAWL_LIFE_TICKS` would ship green. This is the rb4-19 lesson recurring: ratios
catch non-linearity, bounds catch gross displacement, neither catches a wrong coefficient.

What would a confused user see? A dead player, on wave 1, staring at "SHOOT FIREBALLS"
frozen over a frozen battlefield with a frozen starfield — which I did not deduce from
reading, I *ran*: after 120 post-death frames the hint is still `"SHOOT FIREBALLS"` and
`starfield[0]` is bit-identical. The docstring promising this cannot happen is on the field
itself. That is the "new field with a totality docstring is usually untested and sometimes
false" pattern exactly.

What would a malicious user do? Essentially nothing — there is no input surface here. I
looked for the real one anyway (persisted high-score decode, the classic asymmetry) and this
diff does not touch it.

Where the devil came up empty, and I want that on the record: I attacked the transcription
hardest, expecting a radix misread, because that is where this project has bled before. I
found none — I checked roughly 25 citations and 31 ROM strings and every single one is
correct, including the two that are radix-hostile in opposite directions. I attacked the
`BS.WAV` re-read expecting letter-vs-intent overreach and the ROM's own comment
(`;?FIRST WAVE WITHOUT CATWALKS?`) vindicated Dev. I attacked the three re-seated sibling
suites expecting a defanged survivor and found the stub's `fillRect` is a no-op, so the new
starfield provably cannot pollute `segCount`. I suspected Dev overstated "1751/1751 passing"
after my worktree showed 1749+2 skipped — I was wrong, the main tree really is 1751/1751 and
the skip was a worktree artifact. I am flagging that I was wrong there, because a review that
only ever finds fault in one direction is not adversarial, just hostile.

The honest summary: the engineering is excellent and the ROM work is the best I have audited
in this epic. What is not done is the *record* of it — three prose claims (one anchor, two
docstrings) are false, and the two axes those claims describe are the two I mutation-proved
are uncovered. That combination is what "not done" means in a fidelity project.

### Fix scope

Small, and mostly not code: one docstring, one digit, one claim (or a one-line behaviour
fix), plus two test assertions. Route red→TEA for the two guards; the rest are edits.
Please do not re-tune anything to make a guard pass — the correct values are
`pageDwellSeconds('banner')` ≈ 24.966 s and ≈ 12.483 s for the board, and `size` 0 = born
near and large, 1 = retired at the vanishing point.

**Handoff:** Back to Imperator Furiosa (TEA) — the two blocking-adjacent gaps (crawl-direction
and dwell-magnitude) are testable, so this routes red rather than green.
---

### Reviewer Addendum — the ROM auditor returned late (verdict UNCHANGED: REJECTED)

The independent ROM auditor I had recorded as failed returned after I closed the phase. It
raised six items and **directly contradicted my blocking finding**, so I chased every one
back to the 1983 source myself. Net: my blocking finding **stands and is now better
evidenced**, the auditor's headline claim is **refuted**, and it found **four real defects I
missed**. All of this is for TEA/Dev; the verdict does not change.

#### REFUTED — the auditor's #1 item: "the crawl direction is inverted in the CODE"

It argued from `VWSPMS` (TCMES.MAC:245-280) that a line is born tiny AT the vanishing point
and grows toward the viewer, making `render.ts` backwards — i.e. that the DOCSTRING is right
and the CODE is wrong, the exact inverse of my finding. Its mechanism reading is sound (the
`#1DD0` delta at :270 is emitted after the per-line SCAL at :259-261, so the offset from the
vanishing point does scale with the accumulator). Its POLARITY reading is not, and the ROM
settles it without needing to know the AVG field's sense at all:

- TCMES.MAC:167 — `SPECIAL MESSAGE LIST IS FOR MESSAGES THAT RECEDE INTO THE DISTANCE.`
- TCMES.MAC:183 (`SPMON`) — `LDD #0000 ;SIZE ALWAYS STARTS AT LINEAR SCALE OF 0`
- TCMES.MAC:415 — the line retires once the accumulator passes `#0F000`.

The accumulator starts at 0 and grows across the life of a message the ROM explicitly calls
RECEDING, and the message is retired at the accumulator's maximum. So accumulator 0 = start =
near/large, accumulator max = end = far/small/gone. A line that were born at the vanishing
point and grew toward the viewer would be APPROACHING, contradicting :167 outright.

Independent corroboration from the polarity itself: `COMB ;BRIGHTNESS RELATIVE TO INVERSE OF
SCALE` (:262) makes brightness the complement of the accumulator byte, so a line DIMS as the
accumulator grows. Dimming with distance is receding. Both the binary field
(`VGSCAL-100 ;DOUBLE SIZE`) and this linear field are inverse-sense, which is self-consistent.

**So `render.ts:1216` is CORRECT and `src/core/attract.ts:30` is the defect — unchanged, and
now proven by a second independent route.** Worth recording that the auditor's contradiction
made the finding stronger, not weaker.

#### CONFIRMED — four real defects I missed

| # | Finding | Severity |
|---|---------|----------|
| F9 | **Two more wrong ROM anchors, same failure mode as F2.** `src/core/starfield.ts:13` and `src/shell/render.ts:1153` both cite `WSSTAR.MAC:110` for "VGSTAR in white (VGCWHT)". Line 110 is `BLO 4$` (the star-queue clear loop); **VGCWHT is at :113**. Verified firsthand. | MEDIUM |
| F10 | **The starfield's motion model is invented, and diverges from the ROM.** WSMAIN.MAC:2244-2269 gives **four different per-page drift directions** — `SMVBNR` X+Z ("45 DEGREES UP"), `SMVINS` Y ("SIDEWAYS"), `SMVSCR` Z ("UP"), `SMVHIS` X ("FORWARD") — and the port runs ONE uniform Z-closing drift on all four pages. That block is cited nowhere in the change. | MEDIUM |
| F11 | **`STAR_SPEED = 0x40` has no source basis and contradicts the ROM's rate.** Every mover above steps `#0080`, and in flight `ST.UX = FRAME<<7` advances 128 = `#0080` per game frame. The port's `0x40` is exactly half, written in hex inside a block of genuine citations, so it READS as transcribed when it was chosen for feel. Use `0x80`, or write it decimal and label it a tuning constant. | MEDIUM |
| F12 | **Two coaching gates are unlogged deviations.** Dev logged dropping `PH.TIM`, but `BS.RPT == 0` ("first time thru this trench", WSMAIN.MAC:3190-3191) and `Q.ATP == 0` (:3192-3193) are absent from both the code and the Design Deviations. This **corrects my "Undocumented deviations found: none"** above — there are two. | MEDIUM |

Also noted: `STAR_NEAR` / `STAR_FAR` / `STAR_SPREAD` have no ROM counterpart at all (the ROM
field is a Math Box point cloud with an `RND8` re-roll, no depth band). Inventing them is
defensible and two adjacent divergences were logged honestly — but these three were not, and
they define a model the cabinet does not have. Add them to the deviation list.

#### HELD — two auditor items I do not accept

- **"The `BS.WAV == 0` branch is missing, so the port warns about catwalks on a trench that
  has none."** Refuted for THIS clone: `sim.ts:1588` calls `spawnTrenchObstacles` on every
  trench entry with no wave gate, so our wave-1 trench genuinely HAS catwalks. Dev's
  intent-over-letter reading stays ✓ ACCEPTED, for the reason the ROM's own comment gives
  (`;?FIRST WAVE WITHOUT CATWALKS?`).
- **Range slips** (`TCMES.MAC:441-444` should start at 440; `WSMAIN.MAC:3193-3203` at 3194).
  Real but non-substantive — the quoted text is present and correct within the cited range.
  LOW; fold into the F2/F9 citation sweep rather than treating as separate defects.

#### The pattern this sharpens

The auditor put it well and it is the right note for the rework: **where this story quoted a
STRING it was flawless — 32/32 byte-perfect across ~31 strings. Where it REASONED from a
citation, the citation was off and the reasoning followed it.** All four of F2/F9/F10/F11 sit
in the arithmetic-and-motion layer, none in the text layer. Combined with my F1 (a docstring
inverted against its own correct code) and my mutation proof that neither the crawl direction
nor the dwell magnitude is covered by any test, the rework is clear: fix six line numbers and
two docstrings, decide `STAR_SPEED`/per-page drift, log the three invented bounds and the two
missing gates, and add the two absolute assertions.

**Revised totals:** 12 findings — 1 High, 7 Medium, 4 Low. Verdict unchanged: **REJECTED**,
routed red→TEA.

---

## TEA Assessment

**Tests Required:** Yes
**Reason:** rework round 2. Round 1 was rejected because guards did not bite — two mutations
(re-inverting the crawl recession, and reading the ROM's hex dwell operands as decimal) each
shipped 100% GREEN against 1751 tests. The deliverable here is guards that bite, so every one
below is mutation-proven, not asserted.

**Test Files:**
- `tests/shell/render.crawl-recession.test.ts` (new) — F1, the blocking finding. Pins the
  recession DIRECTION with actual output coordinates.
- `tests/core/attract-dwell-magnitude.test.ts` (new) — F4, absolute dwell in ROM ticks AND seconds.
- `tests/core/coaching-clears-on-death.test.ts` (new) — F3, the one live behaviour defect. TRUE RED.
- `tests/core/core-purity.test.ts` (extended) — F7, three closed doors + a recursive sweep.
- `tests/shell/render.attract-pages.test.ts` (extended) — F5, the `default:` fallthrough.

**Tests Written:** 25 new assertions across 5 findings.
**Status:** **RED — 4 failing**, all in `coaching-clears-on-death.test.ts`, which is the only
round-1 finding that is a live behaviour defect rather than prose. The other 21 are
GREEN-not-RED hardening: production is already correct on those axes, so mutation proof
substitutes for a RED driver (the rb4-19 precedent). Full suite **1776 (1772 pass / 4 intended
RED), 165 files**; `tsc --noEmit` exit 0.

**Zero collateral, reconciled exactly:** 1751 baseline + 17 (three new files) + 6 (core-purity
8→14) + 2 (attract-pages 4→6) = 1776. No pre-existing test was touched, weakened, or re-seated.

### Mutation Proof

Every guard was broken deliberately and required to redden. `git diff --stat` was checked after
each mutation BEFORE trusting the run (an unapplied mutation looks exactly like a passing guard),
and each was restored from a backup copy, never `git checkout`.

| # | Mutation | Target | Result |
|---|----------|--------|--------|
| M1 | `PAGE_TICKS` `0x200`/`0x100` → decimal `200`/`100` — **the exact round-1 radix mutation that shipped green** | dwell guard | **7/7 RED** |
| M2 | `render.ts` `remaining = 1 - line.size` → `line.size` — **the exact round-1 crawl inversion that shipped green** | crawl guard | **6/6 RED** |
| M3 | halve the dwell (`TICK_HZ * 2`) — a wrong linear coefficient, ordering preserved | dwell guard | **6/7 RED** (survivor = the banner:hiscore ratio test, correctly scale-invariant) |
| M4 | inject `crypto.getRandomValues` into a real core module | purity sweep | **RED** |
| M5 | side-effect `import '../shell/render'` in a real core module | purity sweep | **RED** |
| M6 | impure module in a NESTED core subdirectory | purity sweep | **RED with the new recursive sweep; 14/14 GREEN with the old non-recursive one** |
| M7 | break a `case` label so a page falls through `default:` | fallthrough guard | **2 RED** |

M3 and M6 are the two worth reading. **M3** demonstrates the exact defect class that sank round
1: the ratio assertion survives a wrong coefficient while the absolute assertions kill it — which
is why both were written rather than either alone. **M6** proves the recursion change is
load-bearing rather than cosmetic: the same nested impure file is caught by the new sweep and
completely invisible to the old one.

### Why F1's guard is built on coordinates, not text

The round-1 shell suite asserted the crawl's TEXT and fixed every line at a constant `size: 0.4`,
so it could not observe direction at any price. This guard goes through `glowText`'s real
geometry (`scale = sizePx / CELL_H`, `sy = y - p.y*scale`, render.ts:1333-1346): the font mock
emits one baseline stroke for a single probe string and nothing for any other, so the captured
canvas coordinates recover the row `y` and the type size exactly. It asserts direction on both
axes, monotonicity across five samples, and ABSOLUTE endpoint bands — because a ratio or an
ordering is scale-invariant and neither can catch a wrong linear coefficient.

The direction itself is settled by the ROM without needing the AVG scale field's polarity:
`TCMES.MAC:167` calls the list "MESSAGES THAT RECEDE INTO THE DISTANCE", `:183` seeds the
accumulator at 0, `:415` retires the line at the accumulator's maximum. Start-at-0 and
end-at-max across a RECEDING life gives size 0 = near/large and size 1 = the vanishing point.
A round-1 auditor argued the inverse (born at the vanishing point, growing toward the viewer);
that is APPROACHING and contradicts `:167`, and the suite header records the refutation so the
next reader does not have to re-fight it.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| CLAUDE.md — `core/` is pure (no wall clock / `Math.random` / rAF / DOM) | `core-purity` "no core module calls a wall clock…" | passing guard, M4 mutation-proven |
| CLAUDE.md — `core/` never imports `shell/` | `core-purity` "no core module imports from src/shell" | passing guard, M5 mutation-proven |
| CLAUDE.md — the purity guard must actually COVER `src/core` | `core-purity` recursive sweep + nested fixtures | passing guard, M6 proves the old sweep missed it |
| CLAUDE.md — determinism (seeded RNG only) | `crypto.` now banned alongside `Math.random` | passing guard, M4 mutation-proven |
| ROM fidelity — transcribed constants must match the source radix | `attract-dwell-magnitude` "rejects the DECIMAL misreading" | passing guard, M1 mutation-proven |
| TS #3 enum anti-patterns — missing exhaustiveness on a union switch | `render.attract-pages` "no page silently falls through" | passing guard, M7 mutation-proven |
| TS #8 test quality — no vacuous assertions | self-check below | pass |

**Rules checked:** 4 project rules + 2 applicable lang-review checks (#3, #8).
**Self-check:** 0 vacuous assertions shipped. Stated plainly — **21 of the 25 new assertions PASS
against today's tree**, because on those axes the implementation is already correct and the defect
was in the net, not the code. That is exactly the round-1 failure mode inverted, so none of them
is taken on trust: each is listed in the mutation table above with the specific break that reddens
it. The 4 genuinely failing tests are the live `coaching`/starfield freeze after death. The
`measure()` helper also asserts its own capture is uncontaminated (every glow pass must trace
identical geometry) so a polluted reading fails loudly instead of silently shifting the numbers.

### What Dev must fix that NO test will catch

Four of the twelve findings are prose or line numbers, with no observable behaviour to assert.
They will not go red if skipped, so they are listed here explicitly:

1. **F1's other half** — correct the `CrawlLine.size` docstring at `src/core/attract.ts:30`. The
   new suite pins the CODE; the inverted comment is what actually misleads the next developer,
   and it is the reason this story was rejected.
2. **F2** — `src/shell/render.ts:1211`: `WSMAIN.MAC:3176` → **`:3178`**.
3. **F9** — `src/core/starfield.ts:13` and `src/shell/render.ts:1153`: `WSSTAR.MAC:110` → **`:113`**.
4. **F3's docstring** — `GameState.coaching` in `src/core/state.ts` claims the hint "cannot get
   stuck on screen". Once the 4 RED tests pass the claim becomes true; if Dev fixes it another
   way, the sentence must still be made accurate.

Also non-testable: **F6** (collapse the `as unknown as` bridge — TYPES ONLY; see the Delivery
Findings for why the string data must stay independent) and **F8** (the `VWNIBL` attribution; the
ROM paints that gap with four positioned messages at `TCMES.MAC:569-572`).

**Handoff:** To The Word Burgers (Dev) for GREEN. The behavioural work is small — clear
`coaching` (and step the field) on the game-over branch at `sim.ts:163` — and the rest is four
prose/line-number edits. Please do not re-tune anything to make a guard pass: the correct values
are `pageDwellSeconds('banner')` ≈ 24.966 s, `'hiscore'` ≈ 12.483 s, and `size` 0 = born near and
large, 1 = retired at the vanishing point.
---

## Dev Assessment — rework round 2

**Implementation Complete:** Yes

**Nothing was re-tuned to make a guard pass.** TEA's two named values were treated as
constraints, not targets: `PAGE_TICKS` still reads `0x200`/`0x100` and the crawl's
`remaining = 1 - line.size` is untouched. The only production behaviour that changed is the
one live defect (F3); everything else in this round is prose, line numbers, or the test
bridge.

**Files Changed:**
- `src/core/coaching.ts` — `coachingFor` gains a `gameOver` gate. This is the half that
  actually clears the hint: production death keeps `mode === 'playing'`, so the existing
  mode gate never fired.
- `src/core/sim.ts` — every return in the game-over branch now goes through `finalizeFrame`
  (the field keeps drifting, `coaching` is re-derived rather than carried); the attract
  return is re-routed through it too, deleting a duplicate `stepStarfield` call site. Logged
  as a deviation — the attract half is beyond what any test demanded.
- `src/core/state.ts` — F3's docstring. The "cannot get stuck on screen" claim is now true
  and says WHERE it was false and what makes it true.
- `src/core/attract.ts` — F1's docstring INVERTED back to the real convention (0 = born near
  and large, 1 = the vanishing point), carrying the ROM's own three-line proof (`:167`
  "RECEDE INTO THE DISTANCE", `:183` seeds at 0, `:415` retires at max) plus the `COMB
  ;BRIGHTNESS RELATIVE TO INVERSE OF SCALE` corroboration, so the next reader does not
  re-fight it. Also F8 — the `VWNIBL` attribution replaced with the real mechanism.
- `src/shell/render.ts` — F2 (`WSMAIN.MAC:3176`→`:3178`) and F9 (`WSSTAR.MAC:110`→`:113`).
- `src/core/starfield.ts` — F9's other instance.
- `tests/support/sw710-contract.ts` — F6. Both `as unknown as` casts gone; the four types are
  now re-exported from `src/core` and `Sw710Fields` is a `Pick<GameState, …>` so it cannot
  describe a shape the real state lacks. **The string data did NOT collapse** — a header
  comment records why, per the Reviewer's warning that re-pointing `INTRO_CRAWL` would make
  `intro-crawl.test.ts:45` compare the export to itself.
- `docs/audit/findings/*.json` — 26 citations re-anchored, line numbers only.

**All six ROM anchors were re-verified against `~/Projects/star-wars-1983-source-text`
firsthand** rather than taken from the review: `:113` is `LDA #VGCWHT*100+VGCOPC&0FF00/100`
(`:110` is `BLO 4$`, the queue-clear loop); `:3178` is `LDD #VGSCAL-100 ;DOUBLE SIZE` (`:3176`
is `JSR VWMTWZ`); and the `<6> <7> <8> <9>` overlays at `TCMES.MAC:569-572` sit at x=`0084`,
y=`0144` — I checked `:556` and the COLLISIONS line is indeed at y=`0144`, so the Reviewer's
same-y observation is confirmed, not assumed.

**Tests:** 1776/1776 passing (GREEN), 165 files. `tsc --noEmit` exit 0. `npm run build` clean.
The 4 RED tests in `coaching-clears-on-death.test.ts` now pass; zero collateral.

### Mutation proof — the fix is load-bearing, not incidentally green

The fix has two halves, so each was broken separately and required to redden. Both were
confirmed applied before trusting the run, both restored from a `cp` backup (never
`git checkout`), and md5s were checked back to the pre-mutation values.

| # | Mutation | Result |
|---|----------|--------|
| M8 | remove `if (s.gameOver) return null` from `coachingFor` | **3 RED** — the three coaching assertions; the starfield test correctly still passes, since `finalizeFrame` keeps stepping the field |
| M9 | revert the game-over hold's `finalizeFrame` to the bare return | **4 RED** — all of them |
| Control | restored tree, full suite | 1776/1776, md5s match, no `MUTATION` residue in `src/` |

M8's *partial* redness is the informative one: it shows the two halves cover different
observables rather than one masking the other, which a single all-or-nothing mutation could
not have told me.

**Citation re-anchor audited for laundering:** 52 changed lines in `docs/audit/findings/`,
of which **0** are anything other than a `"line":` field; grep for
`verbatim|claim|title|reasoning|"source"|remediated_by|status` across the changed lines
returns empty. Tool reported **0 lost**.

**Browser verification NOT performed this round — stating that plainly rather than implying
coverage.** I served my own checkout on port 5284 and proved ownership via
`lsof -a -p <pid> -d cwd` (→ `/Users/slabgorb/Projects/a-2/star-wars`, not a sibling's), but
the Chrome extension is not connected and I stopped rather than chase tooling. My judgement is
that the marginal value was low here: round 1's browser pass caught two real defects because
whole new screens were being drawn, whereas this round changes no visuals. The one path I
would have wanted eyes on — the attract screen — is provably unchanged arithmetic (`t` is
`state.t + dt` unconditionally at `sim.ts:140` and every touched branch returns that same `t`,
so `finalizeFrame`'s recovered `next.t - prev.t` is exactly the `dt` the inline call used).
The other changed path, the game-over hold, is not reachable on screen anyway — it renders the
live-play furniture, per the Reviewer's own pre-existing finding. If the Reviewer wants it
driven visually, that needs the extension back up.

**F10 / F11 / F12 are deliberately NOT in this round** — TEA routed all three to a successor
story because each needs a product ruling. No test pins them, so nothing goes red; they are
re-stated as a carried-forward Delivery Finding so they cannot be lost.

**Branch:** `feat/sw7-10-attract-mode-starfield` (pushed)

**Handoff:** To the Thought Police (Reviewer).

Worth the Reviewer's attention: (1) the attract-branch re-route is the one change nothing
asked for — it is a deletion and I argue it above, but it is the fair thing to attack;
(2) the F6 collapse changed `withExt`'s signature from `Partial<Sw710Fields> & Partial<GameState>`
to plain `Partial<GameState>` — worth confirming no suite was relying on the intersection to
catch a typo; (3) I kept `ext()`'s `Partial` return deliberately so the suites' `toBeDefined()`
guards stay meaningful, which is arguably now over-cautious given the fields genuinely exist.---

## Reviewer Assessment — round 2

**Verdict:** REJECTED

**Disclosure first, because it changes how this should be read:** I implemented this rework
myself, as Dev, one phase earlier in this same session. A review of one's own code is worth
less than an independent one, and the honest correction is to lean harder, verify claims I
made rather than recall them, and route the specialists at the work rather than at a summary
of it. The blocking finding below was surfaced by a subagent, not by me — I did not find it
while writing the code, and I did not find it re-reading my own diff. That is the argument for
the fleet, and it is also the reason this verdict should not be taken as self-certification.

**What the rework got right.** The four findings TEA said no test would catch were all
genuinely done by hand — I re-resolved every anchor against `~/Projects/star-wars-1983-source-text`
rather than trusting the claim: `VGCWHT` is at `WSSTAR.MAC:113` (`:110` is `BLO 4$`), the
`LDD #VGSCAL-100 ;DOUBLE SIZE` is at `WSMAIN.MAC:3178` (`:3176` is `JSR VWMTWZ`), the
`<6> <7> <8> <9>` overlays are at `TCMES.MAC:569-572` at x=`0084` y=`0144` — and `:556`'s
COLLISIONS line really does sit at y=`0144`, so that reading is confirmed rather than assumed.
No stale anchor survives. The F1 docstring is now correct AND carries its own ROM proof, which
is the right response to a defect whose whole danger was that the next reader would "fix" the
code to match the comment. F3 is a real behaviour fix, correctly gated on `gameOver` (because
production death never changes `mode`), and mutation-proven in both halves. The F6 collapse is
clean: both double-casts are gone, nothing equivalent replaced them, and — critically — the
string DATA stayed independent, so `intro-crawl.test.ts:45` did not go tautological. The
rule-checker independently enumerated all 9 top-level returns in `stepGame` and confirmed all
8 non-`startRun` paths route through `finalizeFrame`; I separately traced `startRun` itself
(`sim.ts:625` → fresh `initialState`) so no stale furniture survives into a new run. Citation
re-anchor is laundering-clean at 52/52.

I am rejecting on one finding, and it is the same disease that got round 1 rejected — in an
organ nobody examined.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **[HIGH]** `[TEST]` | The SCORING table's name→value PAIRING is unpinned. Swapping two ROM point values ships **1776/1776 green** | `tests/shell/render.attract-pages.test.ts:68-88` | Assert each row as one joined string, not as independent substrings |
| [MEDIUM] `[RULE]` | `drawStarfield` does its own perspective divide in the SHELL — violates CLAUDE.md's hard boundary; diverges from the scene camera by 23% at 4:3, 35% at 21:9 | `src/shell/render.ts:1158-1170` | Share the scene `proj`, or log it as a deviation with a ruling |
| [MEDIUM] `[RULE]` | Round-1 F5's required fix was **not applied**: the `AttractPage` switch still has bare `default:` with no `assertNever` (lang-review TS #3) | `src/shell/render.ts:1183-1195` | Add the exhaustiveness check |
| [MEDIUM] `[EDGE]` `[SEC]` | `stepStarfield`'s wrap loop **never terminates** for `dt = Infinity`; O(dt) for huge dt | `src/core/starfield.ts:91-96` | Closed-form modulo instead of `while` |
| [LOW] `[TYPE]` `[RULE]` | `ext()` returns `Partial<Sw710Fields>` over three **required** fields — lang-review TS #2, fix-introduced by the F6 collapse | `tests/support/sw710-contract.ts:44` | Drop the `Partial` and the now-dead guards |
| [LOW] `[RULE]` | Unguarded `!` on `Array.find()` results (lang-review TS #1) | `tests/core/core-purity.test.ts:86,87,92,93,98,113` | Guard or restructure |

### The blocking finding, with its mutation proof

`render.attract-pages.test.ts` pins the scoring table with `has(sub) = texts().some(t =>
t.includes(sub))` — eight name substrings and seven value substrings, each asserted to appear
*somewhere* in the frame. The inline comments pair them (`// TRENCH TURRETS`, `// FIREBALLS`)
but the assertions never do. So the suite is satisfied by any permutation of the values.

I did not take the specialist's word for this. I ran it:

| # | Mutation | Result |
|---|----------|--------|
| R1 | swap the ROM point values of `TRENCH TURRETS` (100) and `FIREBALLS` (33) in `src/core/attract.ts` | **6/6 green** in the owning suite; **1776/1776 green** across the full suite |
| Control | restored, md5 back to `6285ce44d298c8046aa23e906857ab15`, tree clean | — |

**Why HIGH and not another Medium.** Three things compound. First, TEA's own Design Deviation
claims "every SCR row pinned (all 8 names + all 8 values)" and calls the scoring table "the
fidelity payload (per-enemy point values)" — the one thing on this page that is pure ROM data.
That claim is literally true and operationally false: the rows are pinned as a *bag of
substrings*, not as rows. Second, the round-1 Reviewer verified this table byte-for-byte by
reading it, and praised it — verifying the DATA while no test pinned it, which is exactly how
a hole survives an audit. Third and decisively, round 1 was rejected because two mutations
shipped green on unguarded axes, and the entire deliverable of this round was "guards that
bite." Shipping it with a third mutation-proven green on the story's own fidelity payload
would mean the rework did not learn its lesson, only patched the two instances it was handed.

The production data is **byte-exact** — I diffed all 8 rows against `TCMES.MAC:574-581`
including internal column spacing. So this is a coverage hole, not a live corruption. That is
what keeps it out of Critical. But a fidelity clone whose fidelity table has no effective
guard is one careless transcription from shipping wrong scores with a green suite.

**Data flow traced:** `attractOn('scoring')` → `stepGame` attract branch → `finalizeFrame` →
`state.attract.page` → `render()` → `drawAttract` switch → `drawScoringPage` → `SCORING_ROWS`
→ `glowText` → mocked `layoutText` capture → `has()` substring bag. The break is at the last
hop: every earlier stage preserves the row, and the assertion dissolves it.

**Pattern observed (good):** `coachingFor` returning `string | null` keeps message selection in
exactly one place (`coaching.ts:52`), which is what kept the stale ROM call-site comment out of
the cabinet. The core/shell split holds throughout the new core modules — with the single
exception of R3, which is on the shell side of the line doing core-side work.

**Error handling:** `crawlAt` guards both ends of a line's life; `drawStarfield` guards `z <= 0`
and off-screen; `stepAttract` uses an `if`-based dwell check that is total for any dt. The one
gap is `stepStarfield`'s unbounded `while` (R4) — round 1 declined to charge it as unreachable,
and it still is unreachable through the shipped loop, but the security specialist proved
non-termination rather than mere NaN-persistence, which is a stronger claim than round 1 had.
I am charging it Medium and non-blocking.

**Security analysis:** clean, with evidence. This diff touches no localStorage/persisted-score
decode path (`highScores.ts` untouched), adds no network call or external asset, introduces no
`eval`/`Function`/`innerHTML`, and builds every string from static ROM transcription rather than
user-controlled keys. Determinism holds: no wall clock, no `Math.random`, no shell import in
`src/core` — now enforced by the story's own recursive purity guard, which I re-verified bites
(the specialist injected `performance.now()` into a real core module and it reddened).

### Devil's Advocate

Let me argue this is worse than one High, then report where I failed.

The strongest case: the story's guards are *still* systematically ordinal, and R1 shows the
round-2 hardening was scoped to the two axes the review handed it rather than to the disease.
TEA's own mutation table is the tell — M1 through M7 each break something a round-1 finding
named. Nobody asked "what ELSE is only pinned by presence?" and the answer, on the very page
those findings live on, was the scoring table. Push further and the shape is a house idiom:
`has(sub)` appears in four shell suites in this story alone, and any table whose fidelity lives
in the PAIRING — score tables, message→trigger maps, per-wave constants — is unguarded wherever
it is used. That is a cross-game finding, and I have routed it as one.

What would a confused user see? Nothing from R1 — the data is right today. From R3 they'd see
something real: play at 4:3 and the starfield's parallax is 23% off the world's, so the backdrop
slides at a rate the scene does not corroborate. Subtle, but this is a fidelity project and the
cabinet's field is the flight backdrop too. What would a malicious user do? Genuinely nothing —
no input surface, no persistence touched, no network. I looked for the real one (persisted
high-score decode, the classic asymmetry here) and this diff does not reach it.

Where I came up empty, on the record: I attacked the transcription hardest, because that is
where this project bleeds and because I wrote it. I re-resolved six anchors and all eight
scoring rows against the 1983 source and found **zero** errors — the round-2 prose fixes are
correct. I attacked the F6 collapse expecting a tautology (re-pointing `INTRO_CRAWL` at
production would make `intro-crawl.test.ts:45` compare an export to itself) and found the
string data correctly left independent, confirmed by the test-analyzer reading it separately.
I attacked my own attract re-route expecting a dt bug and found `t = state.t + dt` set
unconditionally at `sim.ts:140`, so the identity holds. I suspected the three re-seated sibling
suites hid a defanged assertion and the specialist confirmed zero removed `expect(` lines
across the whole story diff.

And I have to record one thing against myself specifically: as Dev I wrote in my own handoff
that `ext()`'s retained `Partial` was "arguably now over-cautious." Two independent specialists
came back and called it a rule violation. My instinct was right and I shipped it anyway because
it was convenient — which is exactly the failure mode a self-review is supposed to catch and
usually doesn't.

The honest summary: the engineering is sound, the ROM work is again flawless, and the two
findings the last round blocked on are properly fixed. What is not fixed is the *class* those
findings belonged to, and the proof is that a third mutation of the same shape still ships
green — on the fidelity payload, in a rework whose stated purpose was guards that bite.

### Fix scope

Small. One test assertion rewritten (R1 — assert rows, not substrings), one `assertNever`
(R2), one modulo (R4), one `Partial` dropped with its dead guards (R5), six `!` guarded (R6).
R3 needs a **ruling** before a fix: share the scene `proj`, or keep an independent backdrop
projection and log it as a deviation — do not silently re-tune `focal` to make 4:3 look closer.
Please do not weaken any existing guard to accommodate these.

**Handoff:** Back to Imperator Furiosa (TEA) — the blocking finding is a testable coverage gap,
so this routes red rather than green.
---

### Reviewer Assessment — AMENDMENT (verdict converted to APPROVED by user decision)

**Final verdict: APPROVED — with 6 findings accepted as follow-up work.**

The REJECTED verdict above is left standing verbatim as the audit record; it was not rewritten.
On review of the findings the user (Stranger) elected to ship sw7-10 and file the six findings
as separate follow-up stories. That is a sound call on the evidence, and the reasoning is worth
recording so a later reader does not mistake this for a gate being waved through:

- **No live defect ships.** The blocking finding (R1) is a test-COVERAGE hole, not a data error.
  All 8 scoring rows were diffed against `TCMES.MAC:574-581` and are byte-exact, including
  internal column spacing. The cabinet shows correct scores today; what is missing is the guard
  that would catch a FUTURE transcription slip.
- **The four round-1 findings this rework was chartered to fix are genuinely fixed** — verified
  independently, not taken on the author's word (six ROM anchors re-resolved against the 1983
  source, F1's docstring corrected and now self-proving, F3 mutation-proven in both halves, F6's
  collapse confirmed non-tautological).
- **The remaining findings are bounded and none are reachable by a player**: R2/R5/R6 are
  type/rule hygiene, R4 is unreachable through the fixed-timestep loop, and R3 is cosmetic
  (visible only as backdrop parallax drift off 16:9).
- **Nothing was re-tuned or weakened to reach this verdict.** No test was relaxed, no guard
  removed, and the R1 mutation probe was reverted with md5 verification (`attract.ts` back to
  `6285ce44d298c8046aa23e906857ab15`) plus a clean-tree check.

**Carried forward for the user to file (locations are exact):**

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| R1 | High | SCORING name→value pairing unpinned; swapping two ROM values ships 1776/1776 green | `tests/shell/render.attract-pages.test.ts:68-88` |
| R2 | Med | `AttractPage` switch has bare `default:`, no `assertNever` (round-1 F5's fix never applied) | `src/shell/render.ts:1183-1195` |
| R3 | Med | `drawStarfield` projects in the shell; 23%/35% divergence from scene camera off 16:9. **Needs a ruling** | `src/shell/render.ts:1158-1170` |
| R4 | Med | `stepStarfield` wrap loop non-terminating for `dt = Infinity` | `src/core/starfield.ts:91-96` |
| R5 | Low | `Partial<>` over three required fields (fix-introduced by F6) | `tests/support/sw710-contract.ts:44` |
| R6 | Low | Unguarded `!` on `Array.find()` | `tests/core/core-purity.test.ts:86,87,92,93,98,113` |

Plus three Delivery Findings already routed above: the cross-game `has(sub)` substring-idiom
sweep, the inline-ROM-citation scanner (now requested by three agents across two rounds), and
the carried-forward F10/F11/F12 starfield/coaching ruling set.

**Handoff:** To The Organic Mechanic (SM) for finish-story.