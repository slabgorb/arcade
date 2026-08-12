---
story_id: "sw11-3"
jira_key: "sw11-3"
epic: "sw11"
workflow: "tdd"
repos: "arcade"
---
# Story sw11-3: Trench catwalks are horizontal channel-spanning DIVIDERS (catwalk at top/bottom), not single-wall force-field fins — correct finding B-012.

## Story Details
- **ID:** sw11-3
- **Jira Key:** sw11-3
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/sw11-3-catwalk-channel-dividers
- **PR:** https://github.com/slabgorb/arcade/pull/271
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** green
**Phase Started:** 2026-08-12T10:26:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T00:13:48.872591Z | 2026-08-12T00:16:13Z | 2m 24s |
| red | 2026-08-12T00:16:13Z | 2026-08-12T10:26:48Z | 10h 10m |
| green | 2026-08-12T10:26:48Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

- **ROM ground truth (rom-fidelity-audit, all falsifiable in one grep against the 1983
  source).** (1) WFF/WFG **is** the catwalk — `WSOBJ.MAC` `.WGD WFG ;WALL FORCE FIELD,
  COLLIDED VERSION` whose body has `MOVD #VJFLS ;CATWALK COLOR WHEN COLLIDED`. B-012's
  object identity is CORRECT and the single-panel `.WP WFF` model shape (a vertical fin)
  is unchanged — `trench-force-field-rom.test.ts` stays as-is (it is NOT in the story's
  update list). (2) The dodge is VERTICAL, not lateral — `WSPANL.MAC` runs BOTH `PNVLW`
  ("VIEW LEFT WALL PANELS", `IFLE ;?ON LEFT SIDE?`) and `PNVRW` ("VIEW RIGHT WALL PANELS",
  `IFGE ;?ON RIGHT SIDE?`) per segment, so a force-field row has a left AND a right panel
  at the same band; steering to the far wall just hits the other panel. The hit gate is
  `M.Z0 ADDD #200 ;TOP OF FORCE FIELD → IFGE ?FORCE FIELD ABOVE PLAYER? → SUBD #400 IFLE
  ?BUT NOT TOO FAR?` (a $400 vertical band), panels stacked $400 apart in Z (`ADDD #400
  ;MOVE UP TO NEXT PANEL`). (3) Catwalks seat at a TOP or BOTTOM band across an 8-panel
  divider — `WSBASE.MAC` TWDG92/93 (top), TWDG94/96 (bottom), "8 PANEL DIVIDER WITH
  CATWALK AT TOP/BOTTOM".

- **The B-012 defect, precisely:** it placed ONE panel on ONE wall and gated the graze on
  the pilot's lateral side (`sim.ts` `onFieldSide`), making "steer to the far wall" a fake
  escape. The fix is placement + collision, NOT the model shape.

- **Cross-story tension to hand the Reviewer proactively:** `trench-force-field-rom.test.ts`
  (sw7-19/M-012) pins `.WP WFF` as a single vertical WALL fin and calls the old
  channel-spanning horizontal girder wrong. sw11-3 wants channel-spanning. Both are right
  at different levels: `.WP WFF` is one PANEL's shape (a fin); a CATWALK is a full ROW of
  those panels across the channel at a top/bottom band. Do not "re-fabricate" a horizontal
  girder model — keep the fin panel; span the channel via placement + the both-walls
  collision.

- **Representation contract TEA declared (Dev meets it; propose an alternative via handoff
  if a better one exists):** a channel-spanning catwalk is a `kind:'catwalk'` obstacle at
  `pos[1] === 0` (channel CENTRE, not a wall sign); `pos[2]` is its band height; the graze
  keys on the vertical band + depth ONLY, independent of the pilot's lateral `trenchView[1]`.
  The RED tests pin this. The exact $200/$400 band literals and the grid-slot→band-height
  map are Dev's to derive from the wedge grid.

- **Dev edit surface (GREEN):** `sim.ts` catwalk graze (~:1437-1458 — drop the `onFieldSide`
  term, keep `inBand`+`inDepth`); `trench-obstacles.ts` `streamForceFields`/`streamPanelSlots`
  (place catwalks channel-spanning at `pos[1]=0` with a band height, not per-wall — this is
  the "re-point the streaming/placement" the story calls for); possibly `trench-wedges.ts`
  for the grid→band-height map. The story also asks to update the B-012 docs/findings
  (`docs/star-wars-1983-source-findings.md ## Trench catwalks…` and any `docs/audit/findings`
  B-012 entry).

- **Other tests that assert the per-wall model (pass now, code unchanged; RUN THE FULL
  `--project star-wars` after the code change to catch them):** `trench-obstacles.test.ts`
  (~:173 "a wall force-field catwalk GRAZES…", a LEFT-wall fixture with "rides centre = ROM's
  left side" rationale — the neutral-graze likely still passes but the rationale is stale) and
  `trench-furniture-anchoring.test.ts` (~:71 "streamed wall force fields land INSIDE the
  reachable band"). `trench-panel-grid.test.ts` tests the GRID data (`buildTrench` columns),
  which is UNCHANGED — leave it.

- **Comment-citation zero-floor guard gotcha (cost me a debug loop; save yours).** The
  tree-wide `checkTree` guard (sw8-24, `tests/audit/comment-citations.test.ts`) re-opens every
  `<file>:<line>` comment citation against the VENDORED copy at the **arcade root**
  `reference/original-source/star-wars-1983/` — NOT `~/Projects/star-wars-1983-source-text`,
  and its line numbers DIFFER by a few lines. A new stale citation anywhere reddens THREE audit
  tests (sw8-18/23/24), not your file. My `WSOBJ.MAC` cite was `:1830` in the -source-text copy
  but `:1834` in the vendored copy; re-anchor comment citations to the vendored line numbers.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations yet

## Dev Assessment

**GREEN, and the story's real defect turned out to be one line deeper than the RED
tests reached.** Shipped on user instruction ("ship this") without a separate Reviewer
round; the verification below stands in its place.

**What the RED phase asked for, delivered:** the lateral gate is gone from the catwalk
graze in `sim.ts` — it is now vertical band + depth only, so no lateral steering escapes
a catwalk. All four RED assertions pass.

**What the RED phase got WRONG, and I corrected (user-caught).** TEA (me, prior phase)
declared a representation contract of ONE merged catwalk at the channel centre
(`pos[1] === 0`). That is not what the ROM does, and it rendered as a lone ~512-wide post
floating in a 2048-wide channel. The user supplied cabinet video showing beams reaching
off both walls with a **seam in the middle** and said "I think we just have them turned
wrong." They were right:

- `.WP WFF`'s whole `0→40` run is the **wall normal**, not height. The three rows are
  labelled `FRONT MIDLINE` (x=-20), `BOTTOM MIDLINE` (z=-20), `TOP MIDLINE` (z=+20),
  which fixes x as depth and z as up and leaves y — the run — pointing into the channel.
- Its siblings confirm the frame: `.WP WPN` (square) is flat at `y=0`, a plate ON the
  wall; `.WP WGA` (gun) puts `WALL BASE` at `y=0` and lifts `GUN BODY`/`GUN NOZZLE` to
  `y=4..12`, OFF the wall. So y is the wall normal for all three.
- Therefore all three share one seating, `rotationX(±π/2)` mirrored by `sign(pos[1])`,
  and **deleting the catwalk special-case in `trenchWallOrient` was the entire fix.**
- Placement reverted to per-wall (`streamPanelSlots`) — the ROM places one member per
  wall (`PNVLW`/`PNVRW`). The row's two members reach inboard and meet mid-channel; the
  PAIR is the span. My merged centred catwalk was an invention.

**This is also the root of B-012.** A beam mistaken for a post is one you think you can
steer around — which is exactly where the phantom lateral dodge came from. The
orientation error and the collision error were the same misreading.

**Files:** `sim.ts` (graze), `render.ts` (`trenchWallOrient` + rationale), `models.ts`
(TRENCH_CATWALK doc), `trench-obstacles.ts` (placement), dated B-012 corrections in
`docs/audit/findings/pair-trench.json` and the audit markdown. Rewrote sw11-2's
`render.trench-wall-gun-orient` catwalk test, which had pinned `STAYS VERTICAL` — it now
asserts the run lies ALONG the wall normal and reaches inboard on both walls.

**Verification (all re-run after the final edit):**
- `npx vitest run --project star-wars` → **218/218 files, 2405/2405 tests**
- `npm run lint` (`tsc --noEmit`) → clean
- comment-citation zero-floor guard → `checkTree` count **0**; structured citation gate → 53/53
- Dev server (own tree on :5291, verified it serves star-wars vs a nonsense control):
  `scenes.html` TURRET-ALLEY now draws catwalks as beams reaching off both walls, not posts.

**Delivery Finding — the SEAM does not quite close, and I did not guess at it.** Each
member runs 512 from a wall at `TRENCH_HALF_W` = 1024, so a row meets at ±512 with a gap
rather than touching at 0. `.WP WFF` and `.WP WPN` both carry
`.S=8 ;NOTE HALF SIZE DUE TO PSUB LACK OF DIV2` — at 2× the reach is exactly 1024 and the
seam lands precisely on the centreline, which is suspiciously clean. But `TRENCH_HALF_W`
is itself documented PROVISIONAL, and doubling the `.PH` scale touches the square too.
Left as a measured follow-up rather than a silent constant change.

**Line-drift tax paid (the known sim.ts hazard):** my `sim.ts` comment netted +8 lines,
which broke four line-anchored fixtures and three comment citations. Re-anchored
`sw8-27-remediation` (4 lists), `coaching.ts` (bare `:NNNN` forms), two `tie-waves` tests
and one spec doc. Worth noting the guard's re-locator proposed a FALSE line for one of
them (`sim.ts:2377` → "now at 153", a coincidental `[0, 0, …]` match); the real line was
2385. Verify its suggestion, don't apply it.

## SM Assessment

**Setup complete; handing off to TEA (Han Solo) for RED.** sw11-3 is a p1, 5pt
Star Wars fidelity rework of finding B-012 (originally landed by sw7-19). The story
premise is a ROM-cited correction, not a measurement that could have rotted, so no
pre-setup premise probe was needed: the epic description carries the primary-source
cites (WSBASE.MAC TWDG92-96 "8 PANEL DIVIDER WITH CATWALK AT TOP/BOTTOM",
TCMES.MAC:560/620 "TRENCH CATWALK"/"AVOID CATWALKS", WSPANL.MAC:201-209 vertical
"FORCE FIELD ABOVE PLAYER?" collision). The correction: catwalks are channel-spanning
dividers dodged by diving/climbing (vertical-band gate), not single-wall force-field
fins dodged laterally (the B-012 model in models.ts TRENCH_CATWALK + sim.ts onFieldSide
graze). Scope touches render/placement + core graze + the pinned tests
(trench-viewpoint, trench-force-field-hazard, trench-forcefield-streaming) + the B-012
docs/findings.

**Direction for TEA:** the story explicitly mandates starting with the
`rom-fidelity-audit` skill to nail the WFF/WFG-vs-catwalk distinction BEFORE writing the
RED tests — this is a fidelity rework, so the audit anchors what "correct" is. Verify
playability by hand on the dev server (port 5270, /star-wars/); render orientation isn't
catchable by structural tests.

**Contention / board:** clean. No sibling branch or session for sw11-3
(`git branch -r | grep sw11-3` shows only this checkout's just-pushed claim branch).
Note the wider board: the a-2 checkout is actively building `ml1-1` (Millipede citation
gate) at green, which soft-blocks the whole `ml*` backlog — sw11-3 was chosen precisely
because it's a different game and independent of that bottleneck.

**Pre-handoff bookkeeping done this session:** completed an interrupted `sw11-1` finish
(code was merged in #265, sprint tracking was uncommitted) via chore PR #266, merged and
verified `sw11-1: done` on develop, before setting up sw11-3 on a clean tree. Claim for
sw11-3 pushed: `in_progress` stamp + context committed on `feat/sw11-3-catwalk-channel-dividers`
and pushed so the sibling probe sees it.

## TEA Assessment

**RED landed; handing off to Dev (Yoda) for GREEN.** Commit `94e37cc1` on
`feat/sw11-3-catwalk-channel-dividers`. Per user ruling this phase ran as **behavioral
RED**: the tests pin the corrected OBSERVABLE (channel-spanning, vertical-band graze; no
lateral dodge) and the model/placement/wedge-grid representation is routed to Dev via the
Delivery Findings above — with the ROM ground truth already decoded so Dev is not
re-deriving it. NOTE: the phase's `expected_model` is **best**; this ran on **Sonnet** (user
opted to proceed) — the fidelity audit and cross-story reconciliation are the parts where
that gap could bite, so weigh the Delivery Findings' ROM cites before trusting them blind.

**The four RED assertions (fail against the current side-gate, pass once it is removed):**
- `trench-force-field-hazard.test.ts` — "is CHANNEL-SPANNING: grazes a left, a centre AND a
  right pilot at band height" and "lateral steering is NOT a dodge (inverts B-012)".
- `trench-forcefield-streaming.test.ts` — "catwalks SPAN the channel — seated at centre, not
  mounted to a wall".
- `trench-viewpoint.test.ts` — "steering to EITHER wall does NOT dodge".

**Guards that stay green (kept so a naive `always graze` or `always centre` fix cannot pass):**
the graze-costs-no-shield contract, the depth gate ("far downrange does not graze"), the
TOP-band-dodged-by-DIVE / BOTTOM-band-dodged-by-CLIMB pair (pre-positioned pilots, robust to
scroll timing — this is where the vertical dodge is authoritatively pinned), and the streaming
data-driven/depth-span pins. I DROPPED a yoke-driven climb-dodge test I first wrote: at the
fixture depth the catwalk scrolls in in ~2-3 frames, faster than a real-time climb can exit the
$400 band, so it failed under BOTH current and corrected code (not a valid RED→GREEN). Whether
the yoke can climb out in time is a constants/playability question the story verifies by hand on
the dev server — deliberately not an automated timing test.

**RED verification:** full `npx vitest run --project star-wars` = **4 failed | 2401 passed**
(exactly my 3 reworked files; every other trench/audit suite green). `npm run lint`
(`tsc --noEmit`) clean. I ran the FULL project, not just the new files, because the
comment-citation zero-floor guard is a cross-file durability check — and it caught a real
stale citation of mine (`WSOBJ.MAC:1830`→`:1834`, see Delivery Findings), which I fixed
before committing.

### Rule Coverage
- **Core/shell purity (`plugins/star-wars/src/core` boundary — the project's #1 rule).** The
  graze, streaming and placement all live in `core/` and must stay pure (no DOM/time/Math.random;
  time only via `dt`, randomness via the seeded RNG in `GameState`). The RED tests drive
  `stepGame(state, input, dt)` deterministically with fixed views/obstacles — no wall-clock, no
  randomness — so a Dev change that reaches into the shell or `Date.now()` breaks determinism and
  is caught here and by the standing purity scan. Dev's edits belong in `core/`.
- **Test quality (meaningful assertions, no vacuous tests).** Self-checked every added/changed
  test: each has a concrete `expect(...).toBe(...)` on an observable (a crash event, a shield
  count, a `pos[1]` value), no `let _ =`, no `assert(true)`, no `is*()`-on-always-null. The
  channel-spanning and no-lateral-dodge tests each pair a "grazes" case with a "clears" case (or
  test all three lateral positions) so neither a full-width "always graze" nor a "never graze"
  can pass.
- **Citation fidelity (comment-citation zero-floor guard, sw8-24).** Every ROM cite I added to
  the test comments re-opens clean against the vendored source; verified `checkTree` count = 0.