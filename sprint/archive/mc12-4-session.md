---
story_id: "mc12-4"
jira_key: "mc12-4"
epic: "mc12"
workflow: "tdd"
---
# Story mc12-4: VISUAL playtest — verify all four owner findings are fixed IN THE BUILD

## Story Details
- **ID:** mc12-4
- **Jira Key:** mc12-4
- **Workflow:** tdd
- **Branch:** feat/mc12-4-visual-playtest-owner-findings
- **PR:** 515
- **Stack Parent:** none

## Workflow Tracking
**Repos:** arcade
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T20:31:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T19:41:04Z | 2026-08-17T19:43:34Z | 2m 30s |
| red | 2026-08-17T19:43:34Z | 2026-08-17T19:51:06Z | 7m 32s |
| green | 2026-08-17T19:51:06Z | 2026-08-17T20:11:20Z | 20m 14s |
| review | 2026-08-17T20:11:20Z | 2026-08-17T20:31:37Z | 20m 17s |
| finish | 2026-08-17T20:31:37Z | - | - |

## Acceptance Criteria

- **AC1:** a screenshot of a live MIRV wave shows a bounded fan (no runaway swarm) and a short played session confirms the early waves are progressable; captured against a nonsense-control path that visibly DIFFERS (not just a 200).
- **AC2:** screenshots confirm incoming missiles draw with no lollipop disc, the bomber and satellite draw as authentic shapes (not rectangles), and aim tracks a locked pointer as a trackball; each finding's before/after is noted.
- **AC3:** any residual gap found in the build (that green vitest missed) is filed as a follow-up story BEFORE the epic closes — a Delivery Finding is not a backlog item (the sidecar gotcha).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (mc12-4 playtest, 2026-08-17)

**Finding — CONFIRMED & FIXED: the incoming-ICBM "lollipop" was NOT removed by mc12-2 (owner-reported, reproduced in the served build).**

- **Reproduced:** served this checkout on `:5290` (cwd verified = a-3), `/missile-command/`
  attract demo. Every incoming red ICBM trail ended in a solid ~10px red disc — the
  lollipop. Screenshots in scratchpad `mc12-4-shots/` (`mc12-4-initial.png` = before).
- **Root cause:** `render.ts` drew the ICBM head as `ctx.arc(head, tipR)` with
  `tipR = Math.max(1, Math.round(width / 200))`. `width/200` is tied to nothing physical:
  at the 256-wide unit-test canvas it is `round(1.28)=1` (a legit 1px tip), but at the
  real ~955px display canvas it is `round(4.78)=5` → a 10px solid disc. mc12-2 recoloured
  the disc to the FLASH register but never shrank it; the comment even falsely claimed
  "tipR is one flash pixel."
- **Why green vitest missed it (the mc9→mc10 lesson, exactly):** the mc12-2 AC1 guard
  (`render-battle.test.ts:445`) only asserted the head references `FLASH_SLOTS`/`abmTip`
  (a colour check via a colour-blind mock), and every render test runs at `W=256` where
  the tip IS 1px. No test rendered at display resolution, so the size defect was invisible.
- **Fix (this story):** `tipR = Math.max(1, Math.round(uH / 2))` where `uH = width/256` is
  the cabinet-pixel unit already computed at `render.ts:109` — the tip is now ONE cabinet
  pixel across at every display scale (radius 2px at W=1024, was 5px). The shared ABM tip
  inherits the same fix (both are authentic 1px flash tips, per the epic's "exactly like
  the ABM"). Comment corrected.
- **New non-vacuous guard:** `render-battle.test.ts` `mc12-4 — the incoming ICBM tip is one
  flash pixel at display resolution` renders at `W=1024` and asserts the head-arc radius
  (captured in the mock's `w` field) ≤ one cabinet px. Mutation-proven: reddens on the old
  `width/200` (`expected 5 to be less than or equal to 4`), green on the fix. A sibling test
  keeps the tip PRESENT (no bare-line regression).
- **Verified:** full missile-command suite GREEN (1438), `npm run lint` clean, AC1 DIFFER
  check passes (`/missile-command/` ≠ nonsense control), and the served build now shows
  pinpoint flash tips (`mc12-4-after-1.png`).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (mc12-4) — fixed a found defect in-place rather than filing it as an AC3 follow-up

- **What:** mc12-4's AC3 says a build-level gap "is filed as a follow-up story." The owner,
  present during the playtest, explicitly directed that the lollipop be removed, so I fixed
  it in-place on this story's branch (render.ts tip-size + a new display-resolution guard)
  instead of filing mc12-5. User instruction overrode the AC3 workflow default.
- **Blast radius:** the fix touches `render.ts` (mc12-2's surface) and shrinks the SHARED
  missile tip, so the ABM leading tip also becomes a true 1px point — intended and authentic
  ("exactly like the ABM"), but it is a visible change to the ABM, not just the ICBM. A
  Reviewer should confirm the ABM tip still reads correctly (it did in the served build:
  `mc12-4-after-1.png`, the blue base→up ABM trail ends in a pinpoint).
- **TEA/Dev collapse:** I wrote both the RED size-guard AND the fix in one session (no
  separate TEA RED). Mitigated by the mutation proof (guard reddens on old code). Flagged so
  the Reviewer applies extra scrutiny (the "Dev==Reviewer/TEA miss" gotcha).

## Dev Playtest Notes (mc12-4) — before/after per owner finding

| # | Finding (epic) | Verified in served build | Result |
|---|---|---|---|
| 1 | mc12-1 MIRV bounded fan, waves progressable | Owner confirmed live | ✅ working (owner-verified) |
| 2a | mc12-2a incoming lollipop removed | **Before:** ~10px red disc on every ICBM head (`mc12-4-initial.png`). **After:** 1px flash tip (`mc12-4-after-1.png`) | ❌ was NOT fixed by mc12-2 → **FIXED here** |
| 2b | mc12-2b bomber/satellite authentic shapes | **Verified in the served build** via a deterministic in-page probe (imported the served render/game modules, drew both variants both facings onto an overlay canvas — `mc12-4-planes-probe.png`): bomber = angular plane silhouette, satellite = distinct sputnik shape (body + side panels), both correctly mirrored by `dir`; neither is a rectangle. | ✅ authentic distinct silhouettes confirmed (satellite blue portholes / flash-antenna tips remain the epic's pre-declared follow-up — enemy-hue only here, as designed) |
| 3 | mc12-3 pointer-locked trackball aim | Owner confirmed live | ✅ working (owner-verified) |

## Sm Assessment

**Story shape.** mc12-4 is a 2pt VISUAL PLAYTEST verification under the `tdd` (phased)
workflow. It confirms — in the built/served game, not merely via green vitest — that the
four owner findings are fixed. This applies the mc9→mc10 lesson: green tests next to wrong
pixels ship a bug.

**Premise verified at setup (all four fixes are shipped/done).**
- mc12-1 (done): MIRV bounded to a single split — bounded fan, early waves progressable.
- mc12-2 (done): (a) incoming ICBMs draw with no lollipop disc head; (b) bomber(plane) and
  satellite(sputnik) draw as authentic stamp shapes, not fillRect placeholders.
- mc12-3 (done): pointer-locked trackball aim, made the default.
The story's `mc12-2a`/`mc12-2b` references are the two sub-findings inside the single
completed story mc12-2 — not missing stories. No stale falsifiable claim to correct; the
epic description's references all check out against tracking.

**Sibling contention: none.** `git branch -r | grep mc12-4` was empty before setup; the two
live sibling sessions (a-1 jt13-1, a-2 ml12-3) are unrelated. Merge gate clean (no open PRs).
Claim branch `feat/mc12-4-visual-playtest-owner-findings` pushed at setup so the story is
visible to other checkouts.

**Method constraints TEA/Dev MUST honor (from the story text and the sidecar lessons):**
1. Serve YOUR checkout on a NON-default port to dodge the shared-5270 wrong-tree hazard:
   `npx vite --port 5290 --strictPort`. Screenshot `/missile-command/`.
2. Canonical-serve lesson: an all-200 sweep proves nothing (SPA fallback answers 200 to
   everything). Any "the cabinet serves the game" check MUST compare a real game path against
   a NONSENSE control path and assert they DIFFER — not merely both 200.
3. Record before/after notes per finding for the archive (AC2).
4. AC3: any residual gap the build reveals that green vitest missed is filed as a follow-up
   story BEFORE the epic closes — a Delivery Finding is not a backlog item.

**Housekeeping.** `sm-setup` omitted the `**Repos:**` field from the session (a known
recurrence) — added it (`arcade`). ACs were diffed against `sprint/epic-mc12.yaml` and match
verbatim. The phase pointer read `setup` on arrival; single pointer confirmed.

**Handoff:** → TEA (Han Solo) for the RED phase. The failing test is the browser/visual seam,
not a pure-core unit — expect a served-cabinet + screenshot harness with a nonsense-control
differ assertion, per constraint 2 above.

## Tea Assessment

**VERDICT: RED phase BYPASSED — no honest failing automated test exists for this
verification playtest. Handing directly to Dev for the served visual playtest.**

### Why bypass (evidence, not assertion)

1. **The four fixes are shipped and fully unit-green.** `npx vitest run --project
   missile-command` = **1436/1436 passing across 81 files, 0 failures** (testing-runner,
   RUN_ID `mc12-4-tea-baseline`). mc12-1 (MIRV bound), mc12-2 (lollipop drop + authentic
   bomber/satellite dot-lists), mc12-3 (pointer-lock trackball) are all in-tree with their
   own passing suites. There is **no new behaviour to test-drive** — the whole point of
   mc12-4 is to confirm the PIXELS in the running build, precisely because green vitest
   coexisted with wrong pixels in the mc9→mc10 episode.

2. **Source-level reading of all four surfaces confirms the fixes are present and plausible,
   so a code-derived unit test would be green, not red:**
   - mc12-2a lollipop: `render.ts` ICBM head now draws `ctx.arc(head, tipR)` with
     `tipR = max(1, round(width/200))`. With `LOGICAL_WIDTH=256`, that is ≈1.28 cabinet px —
     the small FLASH-coloured tip **shared with the ABM** (the mc9-3 `tipArcsAtHead` test
     pins the ABM tip-as-arc as authentic), NOT the old solid enemy-hue head dot. Reads
     correct; only the live pixels can confirm it no longer reads as a ball-on-a-stick.
   - mc12-2b bomber/satellite: `render.ts` now iterates `BOMBER_DOTS` / `SATELLITE_DOTS`
     dot-lists (with a `dir<0` horizontal mirror), not the mc5-2 placeholder `fillRect`.
   - mc12-1 MIRV: `mirvSpent` marker on Icbm; covered by
     `tests/mc12-1-mirv-single-split.test.ts`.
   - mc12-3 trackball: pointer-lock + movementX/Y adapter reused from centipede/millipede,
     defaulted; covered in `input.test.ts`.

3. **The repo has ZERO browser/screenshot test infrastructure.** No `playwright` /
   `playwright-core` / `puppeteer` in `package.json`; every orchestrator served test
   (`canonical-serve`, `mc8-8-dev-serve-worklet`) is **fetch-based** and cannot render a
   canvas. Standing up a Playwright visual-regression suite for a **2-point** verification
   story is disproportionate, and would be a new fleet-wide dependency decision, not a
   story-scoped one.

4. **A fetch-based "served differ" guard would be a VACUOUS RED.** The cabinet server
   (mg1-2) already returns byte-different HTML for `/missile-command/` vs a nonsense control
   — `canonical-serve.test.mjs` already pins the cabinet-wide version of exactly that. A
   missile-command-specific copy would be green on arrival, and my rules forbid shipping a
   test that cannot fail. The AC1 "DIFFERS, not just 200" clause is a **method constraint on
   the playtest** (don't trust a 200 from the SPA fallback), not a request for a new unit
   test.

5. **Precedent — ad1-2 (battlezone attract playtest, the repo's closest analogue).** Same
   "serve YOUR checkout on :5290 + screenshot + verify-in-build" shape. It was reclassified
   `tdd`→`trivial`, and the verification was done **by Dev in the implement phase using
   browser tools**, screenshots kept in scratchpad (`.playwright-mcp/` is gitignored, tree
   left clean), with a canvas-liveness spot-check (ten samples at 250 ms → ten distinct
   lit-pixel counts). mc12-4 is the same shape; I am keeping the `tdd` label but bypassing
   RED to the same effect rather than forcing a workflow-surgery detour.

### Chore-bypass classification

Fits the "refactoring/shipped work with existing coverage — verify, don't re-drive"
spirit of the bypass criteria. **Rule Coverage: N/A** — no tests authored, so no
lang-review rule-enforcement tests apply; the shipped fixes already carry their own
(purity, citations, render, input suites all green).

### Dev brief (the implement work)

Do the actual served visual playtest — this IS the story:

1. **Serve YOUR checkout on a non-default port** (`:5270` may be a sibling's tree):
   `npx vite --port 5290 --strictPort`. Before trusting any screenshot, confirm whose
   server answers (`lsof -a -p $(lsof -ti tcp:5290|head -1) -d cwd -Fn`), per CLAUDE.md.
2. **DIFFER check (AC1 method):** fetch/load `/missile-command/` AND a nonsense control
   path (e.g. `/banana-xyz/`) and confirm they **visibly DIFFER** — the SPA fallback
   answers 200 to everything, so a 200 alone proves nothing.
3. **Screenshot `/missile-command/` and confirm each finding** — keep screenshots in the
   scratchpad, NOT committed (follow ad1-2: gitignored, tree clean):
   - (1) mc12-1: drive into a MIRV wave — a MIRV splits into a **bounded fan** (≤3 warheads
     per MIRV, no re-split cascade) and the early waves are **progressable**, not a swarm.
   - (2) mc12-2a: incoming ICBMs draw as a trail with a small flashing tip — **no lollipop
     ball**. (Watch the tip size vs. the ABM tip — they should match.)
   - (3) mc12-2b: bomber and satellite render as **authentic silhouettes**, not a
     rectangle. (The epic pre-declares the satellite's FLASH antenna tips / BLUE portholes
     and the exact 1px `EOR 0FF` offset as **mc12-4 screenshot refinements** → expect to
     file these as follow-ups.)
   - (4) mc12-3: aim is a **pointer-locked trackball** feel (movement drives the cursor
     relative + scaled; click to lock).
4. **Record before/after notes per finding for the archive** (AC2) — write them into this
   session's Delivery Findings / a notes block.
5. **AC3 (BLOCKING gate on the epic):** any residual gap the build reveals that green
   vitest missed is **filed as a follow-up story BEFORE the epic closes** — a Delivery
   Finding is not a backlog item. Given the epic's pre-declared refinements above, expect
   at least the satellite-detail follow-up.

### Delivery Findings (from TEA)

- **Improvement (non-blocking, candidate AC3 follow-up):** the repo has no automated guard
  that any game actually RENDERS a live, correct frame when served/framed — the mc9→mc10
  and ad1-2 gap. mc12-4's evidence will live in the archive as screenshots, not in CI, so a
  future render regression of any of these four surfaces would keep the suite green. Worth a
  fleet story on canvas-liveness-in-CI; raised for routing, not filed here.

**Handoff:** → Dev (Yoda) for the GREEN/implement phase — the served playtest above.
## Reviewer Assessment

**Verdict: APPROVED** (round 1). The mc12-4 lollipop fix is correct, verified in the
built game, and now guarded non-vacuously at multiple display resolutions. Three
test-quality findings and one coverage gap surfaced by independent adversarial review
were all applied and mutation-re-proven within this round. No defect in the production
fix. Extra scrutiny applied per the Dev-flagged TEA/Dev collapse — the review was NOT a
rubber-stamp: it changed the test in four material ways.

### Correlation tags
- **[DOC]** — the false `tipR is one flash pixel` comment was corrected; new comments
  accurately derive the tip from the cabinet-pixel unit and explain the mc9→mc10 blind
  spot (test only ran at 256px, where the bug is invisible). No stale/misleading comment
  remains in the diff.
- **[RULE]** — core/shell boundary honoured (shell-only; `purity.test` green); citations
  intact (no `claims/*.json` touched; `citations.test` green; W3DSUP.MAC:931 cite
  retained); no invented magic constant (the fix REPLACES a magic `/200` with the
  physical `uH = width/256`); accessibility no-flash n/a (a 1px tip is not a strobe).
- **[SEC]** — no security surface: pure client-side canvas rendering, no I/O, no input
  parsing, no secrets. N/A.

### Findings & disposition
1. **[DOC][MED] wrong ROM citation for the tip SIZE** (comment-analyzer + rule-checker
   #17) — **FIXED** (`d9952504`): the comment cited `W3DSUP.MAC:931` ("TIP OF MISSILE
   TRAIL IS FLASH" — the tip's COLOUR) for the one-pixel SIZE claim. Re-cited the actual
   size evidence: `OUTPUT DOT` (W3DSUP.MAC:969) in the MISTIP/MOVMIS routine (:927-973).
   Verified against the ROM myself before editing — prose cites aren't byte-gated by
   `citations.test`, so this would have shipped green.
2. **[TEST][HIGH] loose size bound** (test-analyzer) — **FIXED** (`2a459b6d`): assert tip
   DIAMETER ≤ one cabinet px (+1px `Math.round` slack). NB the analyzer's own
   `≤ cabinetPx/2` suggestion was itself WRONG — it fails at 955 (`round(1.86)=2 > 1.86`);
   caught and corrected during review.
3. **[TEST][MED] empty-array vacuity** — **FIXED**: `arcs.length ≥ 1` asserted before
   `Math.max`, so `Math.max(...[]) === -Infinity` can never pass the bound trivially.
4. **[TEST][MED] single width (1024 only)** — **FIXED**: `it.each` over 512/955/1024/2048;
   955 is the owner's reported width. Proves the `uH`-relative scaling law, not one point.
5. **[TEST][MED] ABM head unguarded** (edge-hunter E1) — **FIXED**: `tipR` is shared by the
   ICBM and ABM head arcs; both heads are now asserted, so a future edit that re-sizes only
   one call site reddens.
6. **[CODE][MED] magic `dot = round(width/200)`** (rule-checker #24/#33, edge-hunter E2) —
   **FILED as mc12-5, not fixed here.** Rule #33 (no invented magic constants) forbids
   dismissal, so it is tracked rather than dropped. NOT fixed in-place because: (a) it is
   the base ready-missile stockpile marker — a DIFFERENT visual element than the tip,
   needing ROM ground truth on its intended size before conversion (a blind shrink could
   break the stockpile display); (b) it is out of mc12-4's four-finding scope; (c) it is
   pre-existing (rule-checker #13 confirms a survivor, not a regression from this diff).
7. **[TEST][LOW] arc-op coupling** — **ACCEPTED as-is**: matches the mc9-3/mc12-2 file
   convention and the fix intentionally keeps an arc.
8. **[CODE][LOW] NaN radius exposure** (edge-hunter E3) — **NOTED**: pre-existing (identical
   exposure before this diff), already characterised by `explosion.test.ts`; not introduced
   here.

### Rule Compliance (typescript lang-review + CLAUDE.md additionals)
- reviewer-rule-checker ran all 36 rules: **2 violations, both resolved this round** — #17
  (citation) FIXED; #24/#33 (`dot` magic constant) FILED as mc12-5. Rules #1-16, #18-23,
  #25-32, #34-36 all clean.
- Core/shell boundary (#31): shell-only; `purity.test` green. No src/core constant added
  (#32), so no `claims/*.json` / `citations.test` obligation.
- Test quality (#8,#15,#18,#26,#29): the new guard is mutation-proven RED at 4 widths and
  its empty-set vacuity is explicitly closed — the strongest form of non-vacuity.
- No invented magic (#33): the tip now uses the physical `uH`; the sibling `dot` survivor
  is filed as mc12-5, not dismissed.

### Verification performed by Reviewer (evidence, not assertion)
- Independent preflight: missile-command 1444 green, `npm run lint` clean, orchestrator
  505 green (no wiring/citation guard trips).
- Mutation: reverted `tipR`→`round(width/200)`, confirmed the size guard reddens at ALL
  four widths (diameter 6/10/10/20 px vs bound), then restored the fix.
- ROM cross-check: independently read W3DSUP.MAC:927-973 to confirm :931=FLASH colour and
  :969=OUTPUT DOT (size) before accepting the citation fix.
- Visual: served build shows pinpoint flash tips; bomber/satellite render as distinct
  authentic silhouettes (scratchpad `mc12-4-shots/`).

**Handoff:** → SM (Thrawn) for the finish ceremony. All findings resolved: 5 fixed this
round (1 doc citation + 4 test-hardening), 1 filed as mc12-5 (magic-constant `dot`), 2
accepted/noted (arc-op convention; pre-existing NaN). No blockers.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 1 | reviewer-preflight | Yes | clean | none | N/A — mc 1444, lint, orchestrator 505 all green; zero smells |
| 2 | reviewer-comment-analyzer | Yes | findings | 1 (tip SIZE cited :931 not :969) | FIXED (d9952504) |
| 3 | reviewer-security | Yes | clean | none | N/A — no security surface (pure canvas math) |
| 4 | reviewer-rule-checker | Yes | findings | 2 (#17 citation; #24/#33 `dot` magic) | #17 FIXED; #24/#33 FILED mc12-5 |
| 5 | reviewer-test-analyzer | Yes | findings | 3 (loose bound; empty-array vacuity; single width) | ALL FIXED (2a459b6d) |
| 6 | reviewer-edge-hunter | Yes | findings | 3 (ABM head unguarded; `dot` magic; NaN) | ABM FIXED; `dot`→mc12-5; NaN pre-existing |

**All received: Yes** — 4/4 enabled subagents (preflight, comment-analyzer, security,
rule-checker) plus 2 extra (test-analyzer, edge-hunter) all returned.

Subagents 1-4 are this project's configured/enabled set (`config.local.yaml`:
comment_analyzer + security enabled; preflight + rule_checker always-on). Subagents 5-6
(test-analyzer, edge-hunter) are DISABLED in config but were run as extra adversarial
coverage given the Dev==Reviewer collapse — they surfaced every test-hardening issue.