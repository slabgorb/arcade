---
story_id: ml7-3
jira_key: ml7-3
epic: ml7
workflow: tdd
---
# Story ml7-3: HUD (score/lives/DDT-count + high-score display) with output COORDINATES pinned in a core unit test (routing != geometry); opt millipede into the lobby showcase carousel (attract self-play). Visual playtest.

## Story Details
- **ID:** ml7-3
- **Jira Key:** ml7-3
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/ml7-3-millipede-hud-carousel
- **PR:** 346
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T21:11:49Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T20:14:00Z | 2026-08-13T20:15:03Z | 1m 3s |
| red | 2026-08-13T20:15:03Z | 2026-08-13T20:34:16Z | 19m 13s |
| green | 2026-08-13T20:34:16Z | 2026-08-13T20:53:38Z | 19m 22s |
| review | 2026-08-13T20:53:38Z | 2026-08-13T21:08:01Z | 14m 23s |
| red | 2026-08-13T21:08:01Z | 2026-08-13T21:11:13Z | 3m 12s |
| green | 2026-08-13T21:11:13Z | 2026-08-13T21:11:13Z | 0s |
| review | 2026-08-13T21:11:13Z | 2026-08-13T21:11:49Z | 36s |
| finish | 2026-08-13T21:11:49Z | - | - |

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint exit 0; millipede 845, host 65, orchestrator 481 all green; 16 files exactly; no smells/artifacts |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via workflow.reviewer_subagents |
| 9 | reviewer-rule-checker | Yes | findings | 2 violations / 61 instances / 30 rules | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 8 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

All 7 round-1 findings verified FIXED on the branch (commits `a3a80b88` test pins +
`d64d96bc` fixes), re-verified by full gates — lint exit 0, millipede **850/850**
(+5 new pins over round 1), host 65/65, orchestrator 481/481:

| Round-1 finding | Outcome | Evidence |
|-----------------|---------|----------|
| [RULE #21] sixDigitStamps NaN propagation | FIXED | `Number.isFinite` fail-safe-to-zero guard (hud.ts); pin `fails SAFE on a non-finite value` was RED before the fix, green after |
| [RULE #21] ddtPlacements col 30 off-grid | FIXED | neighbour stamp gated on `col + 1 < PLYFLD_WIDTH` with the DD-57 citation; pin `never emits a column past the 30-col grid` RED->green |
| [TEST] formula-coupled pixel expectation | FIXED | `stands the '1' upright` asserts a HAND-TYPED literal bitmap (rotated on paper from the stored tile, no shared index arithmetic) — it passed on arrival, independently CONFIRMING the CCW direction |
| [TEST] drawStampAtPx zero coverage | FIXED | new describe block: raw-index + off-grid-coordinate + pixel-identity test; wiring grep `drawStampAtPx(` added beside the four siblings |
| [LOW] single pixel-verified code | FIXED | blank-char boundary test (code 0 -> all-background cell) |
| [LOW] "ONE all-blank stamp" overclaim | FIXED | reworded in render.ts and the test comment: the char-0 MAPPING is the evidence, not uniqueness |
| [LOW] "$80+ bank" speculation as fact | FIXED | main.ts comment now marks the sprite-pair choice as chosen-by-eye and the $80+ contents as UNMEASURED, pointing at the sprite-decode Delivery Finding |

**Data flow re-traced** (the one unsafe hop from round 1): a non-finite score now
clamps to 0 at the entry (`hud.ts` sixDigitStamps) — the pipeline is total from
caller to putImageData. No new code paths were introduced by the fixes; the two
guards are single-site, and the rule-checker's round-1 enumeration (30 rules /
61 instances) remains valid for the unchanged remainder.

**Residual risk, accepted and routed:** sprite pixel decode is pinned only at the
wiring/coordinate/raw-index level — which glyphs the tile pairs actually are
remains eye-verified (Delivery Finding routed to ml7-2/ml8). The manual
`check-showcase-alive` probe and the owner's own look at /millipede/ remain
finish-phase steps (operational note in Delivery Findings).

**Handoff:** To SM for finish-story.

## Reviewer Assessment — Round 1 (superseded by the approval above)

**Verdict:** REJECTED (round 1 — all findings Medium/Low, but every one is cheap,
testable and fixable on the open branch; a tight rework round beats shipping
known warts. None is Critical/High.)

| Severity | Tag | Issue | Location | Fix Required |
|----------|-----|-------|----------|--------------|
| [MEDIUM] | [RULE #21] | sixDigitStamps propagates NaN/±Infinity into stamp values silently (verified by execution: six NaN stamps out) | `plugins/millipede/src/core/hud.ts:57` | Guard non-finite input (fail-safe to 0, the millipede-core clamp idiom) + pin with tests |
| [MEDIUM] | [RULE #21] | ddtPlacements emits col 30 (off the 30-col grid) for a page-3 entry; ROM's seed path forbids page 3 (DD-57) but the pure fn trusts its caller | `plugins/millipede/src/core/hud.ts:118` | Guard the neighbour column against PLYFLD_WIDTH (cite DD-57) + pin the page-3 case |
| [MEDIUM] | [TEST] | Amended pixel expectation re-derives the production tile/rotation formula — a wrong rotation DIRECTION would be invisible (both sides share the formula) | `plugins/millipede/tests/hud-render.test.ts:141-155` | Add an independently hand-typed literal bitmap assertion for a known-asymmetric glyph (the '1') |
| [MEDIUM] | [TEST] | drawStampAtPx + the train path: ZERO coverage — not even the wiring grep that pins the four sibling calls | `plugins/millipede/src/shell/render.ts` (drawStampAtPx), `src/main.ts:81-85` | Wiring grep for `drawStampAtPx(` + a coordinate/pixel test analogous to drawGridStamps' |
| [LOW] | [TEST] | Only one char code (0x20) pixel-verified; charTile mask boundaries (0, 0x3f, 0x7f) unexercised at pixel level | `plugins/millipede/tests/hud-render.test.ts` | Add a boundary-code pixel check (e.g. code 0 -> tile $40 blank) |
| [LOW] | [DOC] | "sheet tile $40 is the census's ONE all-blank stamp" is FALSE — 11 blank tiles exist ($18-$1b, $40, $6a, $98-$9b, $ea); the mechanism claim survives, the uniqueness clause doesn't | `plugins/millipede/src/shell/render.ts:66` and `tests/hud-render.test.ts:132` | Drop "ONE"; say char 0 mapping to a blank tile is what matters, not uniqueness |
| [LOW] | [DOC] | "$80+ half is the alternate playfield graphics bank" stated as fact with no citation and no code exercising it | `plugins/millipede/src/main.ts:76` | Mark as inferred/unverified or cite the ROM |

**Correlation tags:** [RULE] 2 confirmed (both #21, mutation-context verified by
direct execution) — the checker also mutation-PROVED the purity sweep reaches both
new core files (Date.now()/Math.random() injections each reddened purity.test.ts,
tree restored, suite re-run green). [TEST] 3 confirmed. [DOC] 3 confirmed — the
"ONE blank" claim was ALSO caught by my own independent stamp census (11 blanks),
so reviewer and subagent agree from separate measurements. [SEC]/[TYPE]/[SILENT]/
[SIMPLE]/[EDGE] disabled; their highest-risk ground (casts, readonly, silent
fallbacks) was covered by rule-checker #1/#2/#11 passes — 0 violations there.

**Data flow traced:** `score` end-to-end: caller -> hudPlacements({score}) ->
sixDigitStamps (hud.ts:57 wrap + suppression) -> 6 CHAR-CODE stamps -> placements
cols 0-5 row $1F -> drawGridStamps (render.ts) -> charTile masks to $40-$7F (any
numeric input lands in-bounds — the mask emulates the hardware) -> rotatedStampImage
reads STAMPS[tile] -> putImageData at (col*8, 0). The one unsafe hop is the FIRST:
a non-finite score mints NaN stamps (finding 1); charTile then masks NaN to $40
(blank) — so the failure is a silently blank score, not a crash. Everything after
the guard fix is total.

**Rule Compliance:** rule-checker enumerated all 30 typescript.md checks over 61
instances: 2 violations (the #21 pair above), 59 compliant — highlights: #2
readonly params on every pure-fn input; #4 one `??` (correct) and zero `||`; #5
type-only imports throughout; #8/#26 no `as any`, cross-module assertion terms;
#15/#25 wiring greps anchored on call-parens over comment-stripped single-file
scope; #24 the showcase retirement applied at ALL five sites (grep-verified no
stray `showcase: false` millipede reference); #28 claims file self-enrols via
directory glob, not a pattern list.

**Observations:**
- [VERIFIED] Purity boundary holds for both new core files — mutation-proved
  (injected Date.now()/Math.random() each caught by purity.test.ts's readdirSync
  sweep; probes reverted, tree clean, suite re-run green). Complies with the
  core/shell boundary rule (CLAUDE.md).
- [VERIFIED] All 16 HD-* claims byte-match the vendored .MAC lines — re-opened
  independently by comment-analyzer (awk NR==n) AND enforced at test time by
  hud-claims' byte-verify; the P2/cocktail disclaimers in hud.test.ts's header
  cite real lines (MLSUB.MAC:1934, :525).
- [VERIFIED] The showcase flip is consistent at all five sites (plugin.ts,
  generated registry.ts, registry.test.ts census, millipede-bootstrap pins,
  scaffold pin) — rule #24 sweep found no stray opt-out text.
- [VERIFIED] attract demo liveness/determinism tests are load-bearing — each
  asserts on production snap() output; a frozen demo reddens 'is ALIVE', a
  reseeded one reddens determinism (test-analyzer concurs, no vacuous asserts).
- [VERIFIED] charTile total for any numeric input — `0x40|(code&0x3f)` cannot
  index out of STAMPS (render.ts:73); deliberate hardware-mask emulation.
- [MEDIUM]x4, [LOW]x3 — the findings table above.

### Devil's Advocate
Argue it's broken. First: **the rotation direction is a single human's eyeball
call, encoded twice.** If CCW were wrong, suite AND page agree in error — no
current test can falsify it. That is finding 3, and the fix (hand-typed upright
'1' bitmap) makes the direction independently checkable; MAME's ROT270 for the
family corroborates but is not in this repo. Second: **the train could freeze
after hours** — the demo respawns on v<8; if a head ever ping-ponged forever
above the floor, liveness dies. stepMillipede always advances h by dh (the
unconditional coast, MT-24), so horizontal motion never stops even when v holds;
the 3000-tick endurance test plus 10-sample distinctness make a freeze a
regression the suite sees. Third: **a page-3 DDT entry draws off-grid** — real,
finding 2; today unreachable (both real tables stay pages 0-2, DD-57 rejects 3
at seed time) but the pure fn's contract shouldn't lean on a caller invariant it
doesn't state. Fourth: **NaN score** — real, finding 1; today unreachable
(awardScore arithmetic is finite, the demo passes 0) but a future ml7-2 wiring
bug would render a silently blank score, the exact silent-failure class this
repo hunts. Fifth: **the two-blank coincidence** — char $2A also maps to a blank
tile ($6a); if DIGITZ ever emitted $2A the screen would show blank where the ROM
shows something; DIGITZ's `CMP I,2A / SBC I,29` handles letters so codes $2A+
never leave DIGITZ as-is — no route in this diff. Sixth: **the $80+ bank prose**
could mislead a future story into indexing sprites at $80 again — finding 7
neutralizes it. Nothing here rises to Critical/High; four findings gained fixes
from this exercise.

**Deviation audit:** see `### Reviewer (audit)` — TEA 4/4 ACCEPTED, Dev 3/3
ACCEPTED (the hud-render amendment audit is finding 3's subject: the AMENDMENT
was correct and necessary; the residual formula-coupling is routed as rework,
not a flag on the deviation).

**Routing:** findings 1-5 are testable -> **red rework (TEA writes the pins, Dev
fixes)**; findings 6-7 are comment-only edits Dev folds into the same round.

**Handoff:** Back to TEA (red rework).

**Julia (Dev) — GREEN complete.** Implementation at `bcda5301`, playtest fixes at
`ce629401` (+ artifact cleanup `020710a3`), pushed to
`origin/feat/ml7-3-millipede-hud-carousel`.

**Built (exactly TEA's contract):**
- `src/core/hud.ts` — the pure geometry: constants (HUD_ROW $1F, SCORE_COL 0,
  LIVES_COL 6, HISCORE_COL 12, LIVES_SLOTS 6, SHIP_STAMP $1F, DIGIT_STAMP_BASE $20,
  BLANK_STAMP 0), `sixDigitStamps` (DIGIT2 SEC/CLC suppression, mod-1e6 wrap),
  `hudPlacements` (18 cells, reading order), `ddtCount`/`ddtPlacements` (DDTS2's
  drawn set, two stamps per intact bomb). Core speaks ROM CHAR CODES throughout.
- `src/core/attract.ts` — createAttractDemo(seed)/stepAttractDemo: musher-seeded
  field (96 tries), DDTST_ATTRACT bombs, the full boot train (createMillipede,
  headingSign +1 — "special attract forces right"), stepMillipede over the field
  each tick, wave-respawn from the top (alternating heading) when the lead sinks
  to v<8 — coordinates stay 8-bit sane forever. Seeded @shared/rng only; purity
  sweep green.
- `src/shell/render.ts` — `drawGridStamps` (grid law x=col*8, y=(0x1F-row)*8),
  `drawStampAtPx` (motion objects), `charTile`, and the CCW tile rotation (below).
- `src/main.ts` — the attract screen: 240x256 logical canvas, integer-scaled;
  per frame: stepAttractDemo -> field placements + ddtPlacements + hudPlacements
  (score 0, DEMO_LIVES 3, high score DEFAULT_HIGH_SCORES[0] = 89175) through
  drawGridStamps; train segments via drawStampAtPx.
- `plugin.ts` showcase: true (comment updated) + `npm run gen:registry`.
- `docs/rom-study/claims/16-hud.json` — HD-1..16, GENERATED from the vendored
  tree (scratchpad script; verbatims read from the .MAC files, never typed).

**The visual playtest EARNED ITS PLACE — it caught the playbook §4 ROT trap the
suite could not.** First render: HUD glyphs were junk, mushrooms were triangles.
Measured live against the baked sheet (ASCII stamp dumps):
1. **Char code != sheet index.** The hardware tile is `0x40 | (code & 0x3F)` —
   proven by tile $40 being the census's ONE all-blank stamp (char 0 = blank) and
   field codes $40-$7F mapping to themselves (why ml2-4's census mushrooms looked
   right all along). Digits $20-$29 live at tiles $60-$69, the ship at $5F.
2. **Tiles are stored ROTATED** for the vertical monitor (tile $61 is a sideways
   '1', $5F the archer pointing right). The grid law is the whole-frame rotation,
   so each blit turns 90° CCW to complete it.
3. **Sprites** are the tile pairs 2p/2p+1 at the sheet BASE (the $80+ half is the
   alternate playfield-graphics bank); after the frame turn the pair sits side by
   side, stored-top tile left.
After the fix the page reads correctly: "    00" white, three upright archers,
green " 89175", red mushroom caps, three DDT canisters lower-left, a green
legged train marching. Screenshot verified twice (motion confirmed between
loads); served from THIS checkout (5270 is owned by sibling a-3 — probed per
CLAUDE.md; used the pre-existing a-1 server on 5290).

**Gates (evidence):** `npm run lint` exit 0; millipede **845/845**; host 65/65;
orchestrator **481/481**; full-cabinet vitest **15,746 pass**; `build-app.mjs
millipede` clean. Zero regressions.

**Superseded guards updated (each with rationale in place):**
- `tests/playfield.test.ts` AC-5 — main.ts no longer draws the stamp census; the
  wiring pin repoints at drawGridStamps (census renderer itself still exported +
  pixel-pinned by the same file).
- `tests/millipede-bootstrap.test.mjs` (orchestrator) — ml1-5's two "not until it
  self-plays" showcase pins flip to asserting showcase IS true, condition met.
- `tests/hud-render.test.ts` pixel expectation — amended to the MEASURED tile map
  + rotation (the RED draft's assumption was wrong; core geometry tests untouched).

**Remaining for the pipeline:** human visual playtest confirmation at /millipede/
(my browser pass is a first-pass verdict, not the owner's), and
`just check-showcase-alive` once a server for THIS tree owns the probed port.

**Handoff:** → Reviewer. Diff base `origin/develop`.

## Tea Assessment

**O'Brien (TEA) — RED complete.** Failing suite committed at `3a01c53b` and pushed to
`origin/feat/ml7-3-millipede-hud-carousel`.

**Tests Required:** Yes
**Tests Written:** 26 failing (25 millipede + 1 host) across 4 new files + 2 edited pins
**Status:** RED (failing — ready for Dev)

**RED verified (testing-runner, RUN_ID ml7-3-tea-red):** millipede 818 pass / 25 fail
(all feature-absent, self-describing "not built yet" messages); host 64 pass / 1 fail
(carousel census awaiting the manifest flip); orchestrator 481 pass / 0 fail.
**Zero regressions.** `npm run lint` exit 0 on the RED tree (computed specifiers keep
tsc blind to the unbuilt modules).

**Test Files:**
- `plugins/millipede/tests/hud.test.ts` — the GEOMETRY: `src/core/hud.ts` pure module.
  Top-row map measured from the ROM this session: P1 score cols 0-5 (PLYFLD+$1F,
  MLSUB.MAC:1915), P1 lives cols 6-11 (PLYFLD+$0DF, :509; ship stamp $1F, :518; six
  slots, :507), high score cols 12-17 (PLYFLD+$19F, :1950), everything on row $1F;
  +$20 = one column (CHAR, MLIRQ.MAC:658); digits are stamps $20-$29 (DIGITZ, :691).
  DIGIT2 zero-suppression law (SEC :1924 / CLC :1929): leading zeros blank, last pair
  always renders, values wrap mod 1e6. DDT bombs: two stamps per intact entry
  (DDTS2, MLSUB.MAC:443/460/470), vacant + exploding skipped. Full-array `toEqual`
  literals throughout — identity + ordering pinned, a regenerated row cannot pass a count.
- `plugins/millipede/tests/attract-demo.test.ts` — the SELF-PLAY: `src/core/attract.ts`
  (createAttractDemo/stepAttractDemo). Seeded field, DDTST_ATTRACT bombs, marching
  train; deterministic per seed, seed-varied, ALIVE (ten consecutive 15-tick samples
  must each differ — the check-showcase-alive bar in core form), 3000-tick endurance
  with 8-bit-sane coordinates. Public-surface only (pm4-8 model) so ml7-2's stepGame
  refactor stays free.
- `plugins/millipede/tests/hud-render.test.ts` — the ROUTING: `drawGridStamps` in
  `src/shell/render.ts` blits one 8x8 putImageData per placement at pinned
  x=col*8, y=(0x1F-row)*8 (240x256 portrait, HUD row $1F at top — the centipede
  cp2-14 family orientation), pixels through the ml2-4 colour seam (byte-compared);
  plus the main.ts wiring floor on COMMENT-STRIPPED source (stepAttractDemo/
  hudPlacements/ddtPlacements/drawGridStamps all called).
- `plugins/millipede/tests/audit/hud-claims.test.ts` — the CLAIMS arm: GREEN generates
  `docs/rom-study/claims/16-hud.json` (HD-*, floor 12); 12 REQUIRED_ANCHORS
  (file:line measured this session); vendored-.MAC-only; byte-for-byte verbatim re-open.
- `plugins/millipede/tests/scaffold.test.ts` (edit) — the ml1-5 `showcase: false` pin
  flips to `true` with the ml7-3 rationale.
- `src/host/registry.test.ts` (edit) — the carousel census grows `millipede` (host
  project; Dev flips `plugins/millipede/plugin.ts` and runs `npm run gen:registry`).

### What Dev must build (GREEN)
1. `src/core/hud.ts` — pure, constant-cited: HUD_ROW/SCORE_COL/LIVES_COL/HISCORE_COL/
   LIVES_SLOTS/SHIP_STAMP/DIGIT_STAMP_BASE/BLANK_STAMP, `sixDigitStamps`,
   `hudPlacements` (18 placements, reading order), `ddtCount`, `ddtPlacements`.
   Exact contract in tests/hud.test.ts header.
2. `src/core/attract.ts` — AttractDemo {field, segments, ddt, frame, …},
   createAttractDemo(seed)/stepAttractDemo. Reuse conway/mushroom seeding, ddt.ts
   DDTST_ATTRACT, millipede.ts createMillipede/stepMillipede + stepWaveCadence.
   Purity sweep covers both new files automatically — seeded @shared/rng only.
3. `src/shell/render.ts` — add `drawGridStamps(ctx, placements)` (reuse the ml2-4
   stamp/palette path).
4. `src/main.ts` — the page becomes the attract screen: mount, seed demo, per frame
   step + draw field/train/HUD/DDTs. (Train/field drawing shape is Dev's; only the
   grid-stamp path is pinned.)
5. Flip `plugin.ts` `showcase: true` (update its ml1-5 comment), run
   `npm run gen:registry` (registry.ts is GENERATED — never hand-edit).
6. Generate `docs/rom-study/claims/16-hud.json` from the vendored tree (HD-*, >= 12
   claims covering the anchors; do NOT re-claim DD-4/DD-38..41).

### Rule Coverage (typescript.md lang-review)
| Check | How covered |
|-------|-------------|
| #8/#26 test quality, no all-local assertions | Geometry expectations are LITERALS compared against module output; DDT_STAMP/ddtOffset cross-checks tie the literals to production constants; no `as any`, no vacuous asserts. |
| #15/#25/#30 source-text guards | The one wiring grep runs on COMMENT-STRIPPED main.ts and requires identifier+call-paren — prose or an import line cannot satisfy it (raw-wiring-grep lesson). All other assertions are behavioural. |
| #18 fixture-is-expectation | Expected placements are hand-derived from ROM addresses (offset>>5 / offset&$1F shown as literals in comments), never computed by the code path under test. |
| #21 degenerate numerics | lives 0/6/7 (clamp), score 0 (full suppression floor), interior/trailing zeros (500070), wrap at 1e6, vacant + exploding DDT entries, empty placements draw. |
| #14/#19 population filtering | ddtCount/ddtPlacements tested against a MIXED table (intact + vacant + exploding) so the filter is exercised, not assumed. |
| #23 mutants re-runnable | Full-array toEqual: any single-cell mutation (wrong col, wrong stamp, dropped blank, reordered row) reddens a named test. |
| #27 gates that wait forever | The claims tests fail LOUDLY when 16-hud.json is absent (expect.unreachable), never skip-green; byte-verify reads the vendored tree directly. |
| #3 exhaustive dispatch | n/a — no new union dispatch in this story's surface (phase machine is ml7-1's). |

**Self-check:** 0 vacuous tests found; every test carries a value-comparing assertion.

**Scope fence for Dev:** NO input wiring, NO core->shell event stream, NO ml6 audio, NO
play/death/game-over runtime (all ml7-2); NO accessibility-gate work beyond not adding
any flash (ml7-4 owns the gate — and the attract demo must not strobe: freeze/fade only
if any transition is added). The VISUAL playtest + `just check-showcase-alive` are human
steps before finish.

**Handoff:** To Dev for implementation.

## Sm Assessment

Setup complete for ml7-3 (5 pts, tdd, epic ml7/millipede). Session file created, branch `feat/ml7-3-millipede-hud-carousel` cut from `develop`, story context at `sprint/context/context-story-ml7-3.md`. The story is title-only — the title is the spec: (1) HUD rendering score/lives/DDT-count + high-score display, with output coordinates pinned in a **core** unit test (routing vs geometry distinction); (2) opt millipede into the lobby showcase carousel (attract self-play); (3) visual playtest. Handing off to TEA for the red phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Gap** (non-blocking): ml7-3 was picked up BEFORE ml7-2 — millipede has NO `stepGame`/
  `createGameState`/runtime wiring (verified: only per-subsystem reducers + the ml7-1 pure
  phase machine exist). The showcase flip requires live self-play, so this suite specs a
  SCOPED core attract composition (`src/core/attract.ts`: seeded field + DDTST_ATTRACT
  bombs + the ml3 train marching) instead of blocking on ml7-2.
  Affects `plugins/millipede/src/core/attract.ts` (ml7-2 may fold the demo into stepGame's
  attract branch — the mc6-4 shape; the tests drive only the public surface so that
  refactor stays free). *Found by TEA during test design.*
- **Question** (non-blocking): the ROM attract draws LIVES=0 (DLIVES over an attract
  cabinet shows six blanks). If Dev passes lives>0 to the demo HUD so the visual playtest
  can SEE the ship icons, that is a deliberate clone-side choice — log it as a Dev
  deviation, don't let it pass silently.
  Affects `plugins/millipede/src/main.ts` (the demo's HUD inputs). *Found by TEA during test design.*
- **Improvement** (non-blocking): the DDT stamp values/tables are ALREADY claimed
  (13-ddt.json DD-4/DD-38..41); the new 16-hud.json must claim only the NEW facts
  (UPSCRE/DLIVES/CHAR/DIGITZ/DDTS2 lines) — one fact, one claim.
  Affects `plugins/millipede/docs/rom-study/claims/16-hud.json` (GREEN generates it from
  the vendored tree, never hand-typed). *Found by TEA during test design.*
- **Gap** (non-blocking): the visual playtest and the manual liveness gate
  (`just check-showcase-alive`) are HUMAN steps this suite cannot run — the story is not
  done at green vitest; a human must look at `/millipede/` (HUD glyphs upright, top row
  left-to-right score/lives/high-score, DDTs on the field) before finish.
  Affects `.session/ml7-3-session.md` (record the playtest verdict). *Found by TEA during test design.*

### Reviewer (code review)
- **Improvement** (non-blocking): sprite pixel decode (which tile pair is which
  segment frame, and the sprite-vs-char bank layout) is measured only by eye; the
  $80+ half of the sheet is uncharacterised. A future millipede story (ml7-2 render
  wiring or an ml8 hardening item) should pin sprite decode against the gfx ROM the
  way stamps were pinned in ml2.
  Affects `plugins/millipede/src/shell/stamp-data.ts` consumers (sprite indexing
  contract). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `just check-showcase-alive` probes the canonical
  port; with 5270 owned by sibling checkout a-3 the gate would probe the WRONG tree.
  Run it from a checkout that owns the port (or after the sibling releases it)
  before the deploy that ships this flip.
  Affects `docs/ops/hosting.md` manual-gate procedure (no file change needed — an
  operational note for finish). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **P2 HUD arms not ported (score PLYFLD+$31F, reversed lives PLYFLD+$25F, all cocktail addresses)**
  - Spec source: story title (epic-ml7.yaml ml7-3)
  - Spec text: "HUD (score/lives/DDT-count + high-score display)"
  - Implementation: tests pin only the P1 arms + high score (cols 0-17 of the upright top row); UPSCRE's P2 branch, DLIVES's reversed P2 loop and every CKIND cocktail address are untested and unspecced
  - Rationale: the clone has no 2-player game anywhere (no NPLAYR seam); porting write-only geometry for a mode that cannot occur would be dead code (#26). One fact recorded here beats six unreachable placements.
  - Severity: minor
  - Forward impact: a future 2-player story adds the P2 arms; the addresses are in this file's header comment and the ROM lines are one grep away.
- **The attract demo is a clone-side showcase composition, NOT the ROM's MLATR gameplay demo**
  - Spec source: context-epic-ml7.md
  - Spec text: "Attract from MLATR MODE FE/FF (initialize + execute, MLATR.MAC:126/313)"
  - Implementation: tests/attract-demo.test.ts specs createAttractDemo/stepAttractDemo — seeded field + DDTST_ATTRACT bombs + the marching train — with no scoring, no player ghost, no MODE machine
  - Rationale: the ROM attract replays real gameplay, which needs ml7-2's stepGame; the asteroids ad1-3 / pac-man pm4-8 precedent is exactly this scoped demo-first shape, and the epic's own dependency note says wiring lands "in later stories (small diffs)"
  - Severity: minor
  - Forward impact: ml7-2 folds the demo into stepGame's attract branch; ml7-4 layers the accessibility gate over every transition it adds.
- **"DDT-count" read as the DRAWN intact-bomb set (DDTS2), not a numeric HUD counter**
  - Spec source: story title (epic-ml7.yaml ml7-3)
  - Spec text: "HUD (score/lives/DDT-count + high-score display)"
  - Implementation: core exports ddtCount (intact entries) + ddtPlacements (two stamps per intact bomb at its playfield cell); no digit counter is drawn anywhere
  - Rationale: the ROM has NO DDT counter in the HUD — measured this session: UPSCRE draws score+high score, DLIVES draws ships, and the only DDT display is DDTS2's stamps on the field. A numeric counter would be invented UI (ROM-always-wins).
  - Severity: minor
  - Forward impact: none — the visible DDT count IS the drawn bombs.
- **BONUS2's "NEXT BONUS AT XXXXXX" line (DLIVES's tail-call) not ported**
  - Spec source: story title (epic-ml7.yaml ml7-3)
  - Spec text: "HUD (score/lives/DDT-count + high-score display)"
  - Implementation: DLIVES ends `JMP BONUS2` (MLSUB.MAC:545) which prints a MESS text line; the ported geometry stops at the four titled elements
  - Rationale: message/text rendering (MESS + the ASCIN tables) is its own subsystem the title does not name; pulling it in would smuggle a font/message story into this one
  - Severity: minor
  - Forward impact: a message-rendering story (attract text, GAME OVER, initials entry) will own MESS; noted in the header comment of tests/hud.test.ts.

### Dev (implementation)
- **Demo HUD shows 3 lives; the ROM attract shows 0**
  - Spec source: TEA Delivery Finding (this session) / DLIVES over an attract cabinet
  - Spec text: "the ROM attract draws LIVES=0 (six blanks) … if Dev passes lives>0 … log it"
  - Implementation: `DEMO_LIVES = 3` in main.ts, with the rationale in a comment at the constant
  - Rationale: a playtest that cannot SEE the ship icon cannot judge it (playbook §4); the constant is demo dressing in the shell, not core state
  - Severity: minor
  - Forward impact: ml7-2's real runtime passes actual LIVES; the constant dies with the demo page.
- **hud-render.test.ts pixel expectation amended by Dev (a TEA-owned file)**
  - Spec source: tests/hud-render.test.ts (RED draft), "paints the stamp PIXELS through the ml2-4 colour seam"
  - Spec text: expected blit data was `STAMPS[stamp]` upright — char code assumed equal to sheet index
  - Implementation: expectation now `STAMPS[0x40|(stamp&0x3F)]` rotated 90° CCW, with the measurement recorded in the test comment
  - Rationale: the visual playtest MEASURED the RED assumption wrong (tile $40 is the sheet's one blank = char 0; tile $61 is a sideways '1'); the amendment strengthens the pin to the real hardware map — it does not weaken any assertion (same byte-exact compare, same coordinates)
  - Severity: minor
  - Forward impact: none — core geometry tests (hud.test.ts) untouched; Reviewer should audit this edit first.
- **Sprite tile mapping (pair 2p/2p+1 at sheet base) is measured by eye, not by test**
  - Spec source: tests/hud-render.test.ts header ("train/field drawing shape is Dev's")
  - Spec text: n/a — TEA granted latitude
  - Implementation: main.ts draws segment pic p as tiles 2p (left) / 2p+1 (right) after the frame turn
  - Rationale: the pair layout matches hardware sprite indexing (sprite n = tiles 2n/2n+1) and renders as a legged green train on the live page; no unit pin exists for sprite pixels yet
  - Severity: minor
  - Forward impact: ml7-2's real render should pin sprite decode properly (candidate ml8 hardening item).

### Reviewer (audit)
- **P2 HUD arms not ported** → ✓ ACCEPTED: the clone has no 2-player seam; the header documents the addresses (verified real — MLSUB.MAC:1934/:525) for the future story. Dead geometry would be #26 bait.
- **Attract demo is clone-side, not MLATR** → ✓ ACCEPTED: matches the ad1-3/pm4-8 carousel precedent exactly; the scope fence in attract-demo.test.ts keeps ml7-2's refactor free.
- **"DDT-count" = drawn intact set** → ✓ ACCEPTED: independently confirmed — UPSCRE/DLIVES draw score/high/lives only; the only DDT display in the ROM is DDTS2's stamps. A numeric counter would be invented UI.
- **BONUS2 line not ported** → ✓ ACCEPTED: MESS/ASCIN text rendering is a distinct subsystem; pulling it in would smuggle a font story into this one.
- **Demo shows 3 lives (ROM attract shows 0)** → ✓ ACCEPTED: TEA pre-flagged it, Dev logged it, the constant is shell-side dressing that dies with ml7-2's real LIVES.
- **hud-render pixel expectation amended by Dev** → ✓ ACCEPTED (the amendment itself): the RED assumption was measured wrong; the amendment strengthens the byte-exact pin. The RESIDUAL formula-coupling is routed as rework finding 3 — a fix on top, not a reversal.
- **Sprite tile mapping measured by eye** → ✓ ACCEPTED as a deviation, with its gap routed: finding 4 (drawStampAtPx zero coverage) turns the acknowledged eye-measurement into at least a pinned wiring + coordinate contract this round.

## Impact Summary

**Status:** APPROVED (round 2, all round-1 findings verified FIXED)

**Findings Summary:**
- Round 1 violations: 7 total (3 Medium, 4 Low)
- Round 2 resolution: All 7 FIXED and verified (commits a3a80b88, d64d96bc)
- No Critical or High-severity findings
- Remaining work: routed to ml7-2 (render wiring) and ml8 (hardening)

**Residual Risk:**
- Sprite pixel decode (tile pairs) measured by eye; $80+ bank uncharacterised
- Manual verification required: visual playtest at /millipede/ and `just check-showcase-alive`
- All findings are non-blocking improvements; no blockers to merge
