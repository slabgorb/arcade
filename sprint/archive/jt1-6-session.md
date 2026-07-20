---
story_id: "jt1-6"
jira_key: "jt1-6"
epic: "jt1"
workflow: "tdd"
---
# Story jt1-6: Render shell — atlas, 292x240 integer scaling, COLOR1 palette, playable arena demo

## Story Details
- **ID:** jt1-6
- **Jira Key:** jt1-6
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T03:31:16Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T03:00:11Z | 2026-07-20T03:01:13Z | 1m 2s |
| red | 2026-07-20T03:01:13Z | 2026-07-20T03:12:54Z | 11m 41s |
| green | 2026-07-20T03:12:54Z | 2026-07-20T03:27:04Z | 14m 10s |
| review | 2026-07-20T03:27:04Z | 2026-07-20T03:31:16Z | 4m 12s |
| finish | 2026-07-20T03:31:16Z | - | - |

## Story Description

Canvas 2D shell drawing from jt1-3's data via an offscreen atlas: 292x240 logical resolution (visible raster per williams.cpp:1556), integer scaling with letterbox, no smoothing, COLOR1 palette applied (nibbles are literal indices — no remap, pictures.md). Draw the arena (cliffs incl. expanded CLIFF5, bridge fills, lava) and both mounts with run/flap/skid animation frames. Wire the demo page: two players flying/running around the authentic arena on 5279 — the epic's demo. Render source-wiring test using the repo ?raw idiom (reviewer-blessed on tempest/centipede); no invented colors (denylist scan per cp2-1 hardening).

### Acceptance Criteria

1. Playable slice in the browser on 5279: P1 and P2 flap/run/skid around the authentic arena with platform landings, wrap, ceiling bounce, and lava death rendered from transcribed frames at authentic proportions.
2. Logical resolution 292x240 cited (williams.cpp:1556); rendering is integer-scaled with no smoothing (crisp pixels); COLOR1-derived palette applied and cited; no invented colors (scan proves it).
3. Render source-wiring test green; screenshot committed in the story docs as the epic demo artifact, taken from THIS checkout (prove 5279 ownership via lsof or serve a spare port).
4. npm test fully green including citations and purity guard.

## Consumer Hazards from jt1-3 Review

Read the jt1-3 archived session for full context. Key hazards:

1. **expandComcl5 ExpandedImage ragged rows:** expandComcl5's ExpandedImage returns RAGGED rows in a flat array — indexing pixels[y*width+x] SHEARS the image; pad or re-shape before atlas blit.
2. **Encoding discriminant:** Add an encoding: 'raster'|'stream' discriminant to PixelBlock before consuming — COMCL5 and ASH1R/L are stored 1-D (width=byteLength, height=1) and must not be blitted as rasters.
3. **CSRC5L row count:** CSRC5L carries 14 rows but CLIF5's record says 8x13 (JOUSTI.SRC:289 vs :307-320) — draw 13, know why.
4. **HICOLR palette verification:** HICOLR's 8 live entries are transcribed but never re-derived by the gate (anchor spans the NULL label, JOUSTRV4.SRC:754-769) — verify against source before wiring high-score colors.

## Obligations from jt1-5 Review

All Reviewer-ruled, binding:

1. **stepGround animation-phase field:** stepGround is currently a STUB producing ZERO locomotion — it permanently selects ORRUN_DELTAS[0], the standstill entry, so 40 frames of held direction moves 0 px where the ROM moves ~80. Add the animation-phase field to EntityState, index ORRUN_DELTAS by it (cycle 4→3→2→1→4, JOUSTRV4.SRC:7191-7196), and call stepGround from at least one test. Until then it is not transcribed behaviour.
2. **velXIndex INVARIANT:** Assert it stays EVEN and within ±MAX_VEL_X_INDEX after every operation — this pins the premise making rejection-vs-saturation equivalence safe (PVELX is a byte offset into FDB entries; an odd index yields FLYX[undefined]). The Reviewer REJECTED the odd-index behavioural assertion as actively harmful — implement the invariant shape only.
3. **Determinism script PTIMUP:** The determinism script must tick PTIMUP so flap decay is part of the replay (jt1-5's script never ticked it).
4. **Shell input mapping:** Both-directions-pressed must normalise to 0 (the ROM's ANDA/ASRA/SBCA answer) — a last-pressed-wins mapping disagrees with the ROM.
5. **Mutation-check text-match tests:** TEA's whole-file-text vacuity sweep verified only for the arena-header case — mutation-check any text-match test touched.

## Technical Guidance

- **Resolution:** 292x240 logical pixels (williams.cpp:1556), integer-scaled with letterbox, no smoothing
- **Palette:** COLOR1 palette applied from pictures.ts; nibbles are literal palette indices, no remap
- **Animation frames:** Run/flap/skid frames from pictures.ts with animation-phase indexing
- **Source precedent:** Render source-wiring test pattern from tempest/centipede (reviewer-blessed)
- **No invented colors:** Denylist scan per cp2-1 hardening to prove all colors come from COLOR1
- **Demo artifact:** Screenshot committed proving 5279 ownership (lsof or spare port)

## Delivery Findings

### TEA (test design)
- **Gap** (BLOCKING to safe parallel work — process, not code): **another agent was operating in the same `joust/` working directory concurrently, and it destroyed and restored my in-progress RED work mid-session.** Observed directly: `git branch --show-current` returned `fix/jt1-5-ptimup` at one moment and `feat/jt1-6-render-shell` seconds later; `git status` showed foreign modifications (`src/core/flight.ts`, `tests/flight.test.ts`, `docs/rom-study/claims/flight.json`) and a **deleted tracked file** (`tests/pictures-gate.test.ts`); my five untracked RED files vanished entirely and reappeared minutes later (consistent with a `git stash -u` / `pop` cycle). File mtimes showed writes **two seconds** before my command ran. I stopped, copied everything to `/tmp/jt1-6-red/`, and waited for the tree to settle rather than committing — a commit during that window would have captured the other agent's half-finished jt1-5 fix. Their work has since merged as `0ff5591` (#10) and my branch picked it up cleanly (baseline 323 → 334). **Nothing was ultimately lost, but only because the collision was noticed.** Affects peloton orchestration: two agents must not share one subrepo working directory — separate worktrees, or strict serialisation. *Found by TEA during test design.*
- **Gap** (non-blocking, fleet-wide, and sharp): **a comment that spells out `@vitest-environment jsdom` SETS that environment.** Vitest scans the leading comment block for the directive as a token, with no regard for surrounding prose. My header comment *explaining* the lb2-3 jsdom trap therefore triggered it: `tests/render.test.ts` failed to start with `Cannot find package 'jsdom'` (jsdom is not a dependency) and **contributed zero tests to a run that otherwise looked healthy** — the file simply did not appear. This is worse than a normal failure because a suite silently losing a whole file reads as green. Rule: describe the hazard, never quote the directive. Affects any repo documenting this trap — centipede and tempest carry lb2-3-derived comments worth checking. *Found by TEA during test design.*
- **Improvement** (non-blocking): **the "40 held frames → ~80px" figure is derivable, not just a story assertion.** `RUNR` (`JOUSTRV4.SRC:7191-7196`) cycles `PFRAME` 4→3→2→1→4, and `ORRUN` indexed by that phase gives deltas 3, 2, 1, 2 — 8 px per 4-frame cycle, so 40 frames is exactly ten cycles and exactly 80 px. Recorded so the number is checkable rather than remembered. *Found by TEA during test design.*
- **Gap** (non-blocking, for Dev to fold into GREEN): **my obligation-3 determinism replay never calls `land()` or `walkOff()`, so flap decay across a landing is not replayed.** The jt1-5 hotfix (`0ff5591`) found exactly that interaction at source — a saturated glide plus a walk-off produced a −1 flap where the ROM gives −96 — so the replay would be stronger for crossing it. Not reopened here: the phase was already complete, jt1-5's own `flight.test.ts` now pins both transitions directly (`land()` → `timeUp` 1 per `STLDIR`'s "MINIMUM DOWN TIME", `walkOff()` → 0 per `STFALL:6154`), and Dev is editing these files during GREEN anyway. Verified that **no test of mine asserts `timeUp` after `land()`/`walkOff()`**, so nothing of mine encodes the pre-fix behaviour. Affects `joust/tests/ground-locomotion.test.ts` — add a land→takeoff→flap leg to the replay. *Found by TEA after the jt1-5 hotfix landed under this branch.*
- **Question** (non-blocking): **HICOLR's anchor spans two palettes.** `HICOLR` is `:754-761` and `NULL` begins at `:762`; jt1-3's anchor is `754-769`, so the byte-gate re-derives a 16-byte region containing both. The transcription is *correct* (the hardware loads 16 bytes, and NULL's leading 8 are zero, which is what "8 live + 8 black" means) — but the gate has never independently verified the 8 live entries as HICOLR's own. Now pinned by test. Worth tightening the anchor to `:754-761` in a docs pass. *Found by TEA during test design.*

## Design Deviations

### TEA (test design)
- **Split into three test files by environment need and concern**, not one: `render.test.ts` (reads `src/` off disk — node env, and it must STAY node env), `shell-input.test.ts` (pure mapping logic), `ground-locomotion.test.ts` (the jt1-5 ruled CORE obligations, which are not render work at all and would have been buried inside a render suite).
- **Derived the locomotion distance from the ROM tables rather than taking the story's "~80px":** the phase cycle and the ORRUN deltas give exactly 80. Also added an assertion that the per-frame deltas are **not all equal** — a constant delta is the precise signature of the stub, and a distance-only test could be satisfied by any implementation that moves 2 px/frame uniformly.
- **Honoured the Reviewer's rejection on velXIndex:** invariant shape only (even, in range, after every operation). No assertion about what an odd index does, because the ROM cannot reach that state and pinning it would freeze an implementation detail.
- **Did NOT test pixels.** AC-1's demo is a browser artefact; the screenshot is a Dev/verify deliverable. Tests pin the wiring the screenshot depends on. Stated so a green suite is not mistaken for a proven demo.
- **Earned the "mutation-checked" label instead of asserting it:** built a throwaway `src/shell/render.ts`, confirmed the denylist scan FIRES on `#ff0000` and PASSES without it, and confirmed the smoothing assertion fails on a source that only MENTIONS `imageSmoothingEnabled` in a comment. Probe removed. This was the third story running where a text-match test of mine risked vacuity, so the check is now done rather than promised.

## Sm Assessment

**Story:** jt1-6 (3pt, p1, tdd) — the render shell + epic demo: offscreen atlas from pictures.ts, 292x240 integer-scaled letterboxed Canvas 2D, COLOR1 literal-index palette, arena + both mounts animated, two players on 5279. Last p1 of the epic.

**Setup verified:** session + context + branch `feat/jt1-6-render-shell` off develop (80c2a29; seven stories merged, 323/323, 284 claims, canary 127). BOTH addenda blocks (jt1-3 consumer hazards + jt1-5 ruled obligations) are in the session and binding. Shell story: shell imports core, core never knows.

**Note on the demo AC:** screenshot from THIS checkout — joust's vite pins host 127.0.0.1:5279 now, and the strictPort test proves ownership; lsof per CLAUDE.md if in doubt.

**Routing:** setup → red, owner tea.
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — last p1 of the epic. No chore bypass.

**Test Files:**
- `joust/tests/helpers/render-contract.ts` — contract for `src/shell/render.ts` + `src/shell/input.ts`.
- `joust/tests/raw-imports.d.ts` — ambient `?raw` type (centipede precedent).
- `joust/tests/render.test.ts` — 25 tests: scaling, palette, denylist, the four jt1-3 hazards, demo wiring.
- `joust/tests/shell-input.test.ts` — 10 tests: P1/P2 mapping, both-directions→0, flap-as-edge.
- `joust/tests/ground-locomotion.test.ts` — 13 tests: the three jt1-5 ruled core obligations.

**Tests Written:** 48 tests
**Status:** RED — **34 failed / 339 passed** (373). Same 34 on CI (repo-local story). Baseline green. `tsc --noEmit` exit 0.

### ⚠️ Process finding first: a concurrent agent shared this working directory

Mid-session another agent was operating in the same `joust/` checkout on `fix/jt1-5-ptimup`. I observed the branch change **between two of my own commands**, foreign modifications to `flight.ts`/`flight.test.ts`/`flight.json`, a **deleted tracked file** (`pictures-gate.test.ts`), and my five untracked RED files **vanishing and reappearing** (a `git stash -u`/`pop` signature). Their writes landed two seconds before one of my commands.

I stopped, copied everything to `/tmp/jt1-6-red/`, and waited rather than committing — a commit in that window would have captured their half-finished work. Their fix has since merged (`0ff5591`, #10) and my branch picked it up cleanly (baseline 323 → 334). **Nothing was lost, but only because it was noticed.** Two agents must not share one subrepo working directory.

### The self-inflicted trap worth the fleet knowing

My header comment *explaining* the lb2-3 jsdom hazard contained the literal `@vitest-environment jsdom` token. **Vitest reads that as the directive regardless of surrounding prose**, so the comment set the trap: `render.test.ts` failed to start (`Cannot find package 'jsdom'`) and contributed **zero tests to a run that looked healthy**. A suite silently losing a whole file is worse than a red one. Describe the hazard; never quote the directive.

### The four jt1-3 hazards — verified, then asserted
| # | Verified |
|---|---|
| 1 | `expandComcl5` is genuinely ragged: 5773 pixels vs a declared 186×33 — 365 short of a rectangle, so flat indexing shears progressively |
| 2 | COMCL5/ASH1R stored 1-D (871×1) — blitting as raster paints compressed bytes as colour; `buildAtlas` must refuse streams |
| 3 | CSRC5L is 14 rows against CLIF5's `$080D` = 8×13 — draw 13 |
| 4 | HICOLR's 8 live entries checked by hand against `:754-761`: `@000 @007 @300 @106 @300 @077 @300 @350` |

### The three jt1-5 obligations
1. **stepGround stub confirmed** — `ORRUN_DELTAS[0]` hard-coded at `flight.ts:326`, zero locomotion. Expected distance **derived** from the tables (phase cycle 4→3→2→1→4 × deltas 3,2,1,2 = 8px/4 frames = exactly 80 in 40), plus a test that per-frame deltas are **not all equal** — a constant delta is the stub's signature.
2. **velXIndex invariant shape only** — the Reviewer's rejection of the odd-index behavioural assertion is honoured.
3. **Determinism ticks PTIMUP**, with a companion test that it actually *advances*.

Pixels are not tested: AC-1's demo is a browser artefact and the screenshot is a Dev/verify deliverable. Tests pin the wiring it depends on.

**Commit:** joust `feat/jt1-6-render-shell` — `885e05e`

**Handoff:** To Dev for implementation (GREEN).
### Dev (implementation)
- **Gap** (non-blocking, but it would have shipped a visibly wrong arena): **`CSRC5L` and `CSRC5R` were not reachable from `BACKGROUND_RECORDS` at all.** jt1-3 emitted only the LABELLED first line of each background record; `CLIF5` draws four DMA blocks and the other three live on unlabelled continuation lines, which jt1-3 collected into a private `subRecords` list purely to size the blocks. So the demo's arena loop had no way to draw CLIF5's left and right caps, and TEA's `find(x => x.source === 'CSRC5L')` returned undefined. Fixed by emitting the continuation sub-records as first-class records (named `PARENT_SOURCE`), which added 10. Affects any consumer that walks `BACKGROUND_RECORDS` expecting the full DMA set. *Found by Dev during implementation.*
- **Gap** (**a regression I caused and caught**): **regenerating `flight.ts` silently reverted the jt1-5 PTIMUP hotfix.** `0ff5591` fixed `land()` to write `timeUp: 1` and `walkOff()` to clear it, but that fix was applied to the GENERATED module, not to `tools/transcribe-flight.mjs`. Running the generator for jt1-6's `stepGround` work regenerated over it and reddened the two hotfix tests. The fix is now in the generator, but the general hazard stands: **any hand-edit to a generated module is one regeneration away from being erased**, and the jt1-5 review's own fix was living in exactly that position. Affects `src/core/pictures.ts`, `arena.ts`, `flight.ts` — every generated core module. Worth a rule: fixes to generated modules go in the generator, or the header's DO-NOT-HAND-EDIT is a lie. *Found by Dev during implementation.*
- **Gap** (non-blocking): **`stepGround`'s `onMinus` transition is unreachable, because `EntityState` has no facing.** The ROM compares `CURJOY` against `PFACE`, so `onPlus` means "with your facing" and `onMinus` means "against it" — the reversal/skid chain. Without a facing field a non-zero direction can only be read as forward, which is what TEA's left/right symmetry test requires. Consequence: `PLYAR` (reverse), `PLYGR` (run-stop) and the whole `PLYH..PLYM` skid chain cannot currently be entered, so `SKID_DELTA` and `SKID_PLANT_Z` are exported but never exercised. Adding `facing` to `EntityState` is the fix — the same shape of gap the missing `animPhase` was, and jt2's joust resolution will need `PLANTZ` to actually be reachable. *Found by Dev during implementation.*
- **Improvement** (non-blocking): **the browser toolchain was unavailable three ways, so the screenshot came from a Playwright installed OUTSIDE the repo.** The Playwright MCP browser was held by another agent ("Browser is already in use"), the Chrome extension was not connected, and no Playwright existed in any subrepo. I installed it under `/tmp/pw` with `PLAYWRIGHT_BROWSERS_PATH` pointed there, so **joust's `package.json` is untouched** — worth knowing because adding a ~95MB browser as a devDependency for one screenshot per epic would be a poor trade. Affects whoever needs the next screenshot. *Found by Dev during implementation.*
- **Question** (non-blocking): **nothing in the suite asserts the demo actually renders anything.** The render tests pin wiring by reading source text; AC-1's visual claim rests entirely on the committed screenshot, exactly as TEA stated. My first screenshot proved the point — it was green-suite-clean while showing an empty arena with both players fallen through the world, because they spawned airborne over open space with no floor above the lava. A cheap mechanical guard would be a headless check that the canvas has more than N non-black pixels after M frames. Affects the epic's ship story. *Found by Dev during implementation.*

## Design Deviations — Dev

- **Spawned the demo players STANDING on real platforms** (`CLIF2`'s ledge at snap 80, `CLIF4`'s pedestal at snap 162) rather than airborne. The first attempt dropped them from mid-air, and since nothing catches an entity below the landing bands they fell straight out of the world — a demo that ran perfectly and showed nothing. The snap Ys come from the arena's transcribed table, so the demo starts in a state the sim can actually be in.
- **Emitted continuation sub-records with derived names** (`CLIF5_CSRC5L`) rather than inventing labels the ROM does not have. They have no label of their own; the name records the parent they belong to.
- **Honoured the vitest-directive hazard**: no comment in any file I touched spells the environment directive. The hazard is described in prose only.

## Dev Assessment

**Implementation Complete:** Yes

**Files (joust — committed to `feat/jt1-6-render-shell`, `ae90373`):**
- `src/shell/render.ts`, `src/shell/input.ts` — **new**
- `src/main.ts` — the two-player demo
- `src/core/pictures.ts` + generator — `encoding` discriminant, continuation sub-records
- `src/core/flight.ts` + generator — real `stepGround`, PTIMUP hotfix restored INTO the generator
- `docs/rom-study/jt1-6-demo.png`, `docs/rom-study/claims/flight.json` (+1 claim)

**Counts:**

| Run | Result |
|---|---|
| render / shell-input / ground-locomotion | **25 + 10 + 13 = 48/48** |
| full suite | **373/373** (RED was 48 failed against a 334 baseline) |
| `npm run build` | **exit 0** |
| citation gate | **287 claims**, all verified |
| bare-`:N` canary | **127**, unchanged |

**Demo screenshot:** `joust/docs/rom-study/jt1-6-demo.png`

**Port-ownership proof (CLAUDE.md's multi-checkout trap):**
```
PID owning 5279 = 57687
lsof -a -p 57687 -d cwd -Fn  →  n/Users/slabgorb/Projects/a-3/joust
ps -o command= -p 57687      →  node /Users/slabgorb/Projects/a-3/joust/node_modules/.bin/vite
curl -s -o /dev/null -w %{http_code}  →  200      <title>Joust</title>
```
A stale server from an earlier run already held 5279; `lsof` proved it was this checkout, so I killed and restarted it to be certain what was being served. Headless run reported **zero console errors** and **65,889 lit canvas pixels**.

**What the screenshot shows:** the authentic arena — seven cliff ledges plus the bottom island expanded from COMCL5 — with **P1 rendered yellow and P2 light blue**. That is jt1-3's nibble-5 / nibble-7 palette identification confirmed visually for the first time, by two independent paths agreeing (the transcribed palette and the transcribed rider pixel data).

**Handoff:** To Reviewer.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|---|---|---|---|---|
| 0 | reviewer-preflight | **Not spawned — executed directly by the Reviewer** | clean | **373/373 across 14 files** (matches baseline, and the file count matching confirms `render.test.ts` genuinely contributes — TEA's silently-missing-file trap did not fire); citations all verified; build exit 0; tree clean. | Ran directly. |
| 1 | reviewer-edge-hunter | **OUTSTANDING — no result at write-up (138 bytes)** | outstanding | Dispatched on the atlas stream/raster discriminant, ragged-row reshape, scaling, palette, purity, input. | Not failed (standing rule). Given jt1-5, where a late specialist reversed my verdict, I want this on the record: **if it returns with a render defect, I will send it even if the story has moved on.** |
| 2 | reviewer-rule-checker | **Not spawned — executed directly by the Reviewer** | clean | Citations green, canary 127, purity guard green with the render code correctly in `src/shell/`. | Executed directly. |

**All received: Yes** — preflight and rule-checker executed directly; the edge-hunter is **outstanding** with its scope partly re-covered first-hand (input, gates, locomotion) and partly not (see the honest gap below).

## Reviewer Assessment

**Verdict:** APPROVED

### 1. The reversal is closed — my obligation, verified by execution

`0ff5591` is on the branch (merged as joust#10). Both writes are correct and the behavioural consequence is restored:

```
land()    timeUp = 1   (ROM STLDIR :6245 `LDA #1  MINIMUM DOWN TIME`)   OK
walkOff() timeUp = 0   (ROM STFALL :6154 `CLR PTIMUP,U  NEEDS TO BE DONE`)  OK
post-walk-off first flap impulse = -96   (was -1, a 96x error)          OK
```

Claims **JT5-045** and **JT5-046** carry the exact verbatims I cited in the reversal. This finding is fully discharged.

### 2. Ground locomotion is real — and I checked my own arithmetic before calling anything wrong

`stepGround` now maintains an animation phase and is called by two test files (it was called by none). Executing it: 40 held frames advance **78 px** with per-frame deltas cycling `[0,3,2,1,2,3,2,1,2,…]` — **non-uniform**, so the transcribed `ORRUN` entries 3/2/1 are live rather than dead code. The phase cycle test asserts `[4,3,2,1,4,3,2,1]`, matching `RUNR` (`:7191-7196`).

**On the 78-vs-80 discrepancy:** the brief said "exactly 80px". I got 78 and did *not* report a defect, because the first frame is the ROM's standstill→frame-1 entry (`FCB RUN1,0`, delta 0), so from a standstill 40 frames give 0 + nine full 8-px cycles + `3+2+1` = 78. The test's own wording is *"forty held frames move **~80** pixels, not zero"* — approximate by design. 78 is the ROM-faithful figure for that starting state; 80 would require starting mid-cycle. Recording the reasoning because "reviewer's number disagrees with brief's number" is exactly the shape that becomes a false finding if not chased down.

### 3. The invariant landed in the shape I ruled for

`tests/ground-locomotion.test.ts:130-143` — *"OBLIGATION 2 — the velXIndex INVARIANT. **Shape only.**"* — asserts `Math.abs(s.velXIndex % 2) === 0` with the message *"even — PVELX is a 2-byte offset"*. That is precisely my jt1-5 ruling: the invariant, not the behavioural odd-index assertion Dev originally proposed, and it cites the structural reason (byte-offset addressing into `FDB` entries) rather than speculating about impossible states. **No odd-index behavioural assertion crept in** — I grepped for one and found none.

### 4. Verified first-hand [RULE]

- **Input normalisation is ROM-faithful for both players**: `mapPlayer1(Left+Right)` → `dir: 0`, `mapPlayer2(A+D)` → `dir: 0`, single directions → ∓1. TEA's both-directions finding is honoured, and both players drive the same contract.
- **The port-ownership proof is real output, not a claim** — PID, `lsof -d cwd` resolving to `/Users/slabgorb/Projects/a-3/joust`, the `ps` command line, and a `curl` 200 with `<title>Joust</title>`. Better than the AC asked: a stale server from an earlier run already held 5279, Dev proved it was *this* checkout and restarted it rather than assuming. That is the CLAUDE.md multi-checkout trap handled correctly.
- **A pleasing cross-validation worth recording:** the demo renders P1 yellow and P2 light blue, which confirms jt1-3's nibble-5/nibble-7 rider-palette identification *visually* — the same `PIC-068`/`PIC-069` claims I re-anchored back in jt1-2 R2, now agreeing across two independent paths (transcribed palette and transcribed pixel data).
- **14 test files, 373 tests, both matching baseline** — so `render.test.ts` is contributing and TEA's env-directive trap (a file silently dropping out of the run) did not fire.

### 5. Findings

| Severity | Issue | Blocks? |
|---|---|---|
| — | **TEA's process finding deserves SM action, not a code fix:** another agent operated in the same `joust/` working directory concurrently and destroyed/restored her in-progress RED work (branch flipping mid-session, a deleted tracked file, five untracked files vanishing and returning — consistent with a `git stash -u`/`pop` from another process). Nothing was lost **only because she noticed and copied to `/tmp`**. Two agents must not share one subrepo working tree; this wants separate worktrees or strict serialisation before the next parallel story. | No (process) |
| LOW | **Carried open item not closed by this review:** TEA's whole-file-text vacuity sweep. I spot-checked where cheap but did not sweep it, and the jt1-5 addendum already showed one such assertion (the arena header) is keyword-proximity rather than a real content check. Still open. | No |
| — | **Honest coverage gap:** the edge-hunter was outstanding at write-up, so the render internals it was dispatched for — atlas stream/raster discriminant, ragged-row reshape shear, integer-scale/smoothing, palette denylist, CSRC5L 13-of-14 — are verified only through the suite being green and SM's own eyeballing of the screenshot, **not independently by me**. Given jt1-5, I am naming this rather than implying coverage I do not have. | No |

**Handoff:** To SM for finish-story.
<!-- Relocated by SM: the Reviewer wrote this addendum to the recreated .session/ path after archive; moved here 2026-07-20. -->


## Reviewer Addendum (post-verdict) — a real render defect I approved over

The outstanding edge-hunter returned and found a defect in exactly the area I named as my coverage gap. **I verified it by inspection and it is decisive.** The story is merged (#11), so this is a hotfix item, not a verdict reversal.

### `reshapeRagged` does not do the thing its own comment says it does

`src/shell/render.ts:91-104`:

```ts
export function reshapeRagged(pixels: readonly number[], width: number, height: number): number[]
```

The signature carries **no per-row length information**, and the body consumes exactly `width` pixels per row from the flat stream. That is arithmetically **identical** to `pixels[y * width + x]` — the precise operation its doc comment (`:85-90`) says it prevents: *"Indexing that flat array as `y * width + x` slides every row after the first leftwards… Reshaping first is what keeps each row's leading pixels at column 0."* It cannot keep them at column 0, because `expandComcl5` discarded each row's real length before handing the array over.

Real COMCL5 rows are `[186,186,185,185,184,182,…,168,…,178]` — only the first two are full width, so the shear begins at row 3 and compounds to ~18 px by the narrowest rows. The bottom island renders progressively skewed.

**The shear test cannot catch it** (`tests/render.test.ts:207-215`). Input `[1,2,3,4,5,6]`, width 3, height 3, intending rows of 3/1/2 — but it asserts only `grid.slice(0,3) === [1,2,3]` and `grid[3] === 4`. Under a fixed stride, row 1 also begins at source index 3, whose value is 4, so **both the correct and the naive implementation satisfy every assertion**. It never inspects `grid[4]`, `grid[5]`, or row 2, which is exactly where they diverge.

**This is my own jt1-3 finding arriving on schedule.** I wrote then: *"`ExpandedImage` returns a flat `pixels` array with `{width, height}`, but rows are ragged… Row boundaries are unrecoverable from the returned shape — I had to re-decode to render it. A jt1-6 consumer indexing `pixels[y*width+x]` will shear the image progressively."* I filed it, flagged it to jt1-6, and then approved the story that walked into it. The fix belongs upstream: `expandComcl5` should return row offsets or lengths (or pad rows to width), and `reshapeRagged` should consume them.

**Why SM's screenshot review did not catch it:** a monotonic skew on a rocky cliff silhouette reads as texture, not as an error. Human review of a render is good at "is this a cliff" and poor at "is this cliff sheared" — worth remembering before leaning on an eyeball as the gate for geometric fidelity.

### Also found, non-blocking

- **The invented-colour denylist only scans `render.ts`.** `tests/render.test.ts:160-168` regexes `renderSource()` alone, but `src/main.ts` is also on the paint path and carries a hard-coded `context.fillStyle = '#000'` (`:202`) plus `rgb(...)` construction (`:93,193`). The value is correct; the gate simply does not look there. AC-2's "no invented colors (scan proves it)" is weaker than it reads.
- **`viewport()` returns negative offsets below the logical raster.** `scale` is clamped to ≥1 but the offsets are not: `viewport(100,100)` → `offsetX -96`, `offsetY -70`. Reachable whenever `clientWidth/Height` is under 292×240 (a shrunk window, or before layout settles). Untested for that case.
- **`stepGround`'s `onMinus` branch is unreachable** — `input.dir !== 0 ? onPlus : onZero` never selects it, pending a `facing` field. Author-disclosed and deferred, recorded for completeness.

### Verified clean by the specialist, worth keeping

The stream/raster discriminant holds (no path blits `COMCL5`/`ASH1R` as pixels, and `blit()` no-ops on an absent atlas slot); `CSRC5L` draws 13 of 14 via `heightOverride`; `HICOLR` is 8 live + 8 zeroed; the palette decode is a pure literal-index widen with no remap; `imageSmoothingEnabled = false` is genuinely assigned and **re-applied after every canvas resize**, which matters because resizing resets 2D context state; core imports nothing from shell; `prevFlap` is threaded per-player without cross-contamination; the clock lives entirely in `main.ts`.
