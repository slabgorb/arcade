---
story_id: "lb2-9"
jira_key: ""
epic: "lb2"
workflow: "tdd"
---
# Story lb2-9: Draw a real vector model in each lobby tile's model slot

## Story Details
- **ID:** lb2-9
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T22:22:02Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T21:39:39+00:00 | 2026-07-12T21:43:08Z | 3m 29s |
| red | 2026-07-12T21:43:08Z | 2026-07-12T21:54:23Z | 11m 15s |
| green | 2026-07-12T21:54:23Z | 2026-07-12T22:01:30Z | 7m 7s |
| review | 2026-07-12T22:01:30Z | 2026-07-12T22:22:02Z | 20m 32s |
| finish | 2026-07-12T22:22:02Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Gap / non-blocking** — The story as written claimed the lobby was pinned at `@arcade/shared` v0.4.0 and that lb2-9 must "eat the version-bump cost" across the SH2 render epic, sequenced against lb2-2. This was stale: `lobby/package.json` already pins `github:slabgorb/arcade-shared#v0.13.1`, which exports `/glow`, `/view`, `/font`, `/math3d`, `/rng`, `/highscore`, `/loop` and `/audio`. The bump was paid during lb2-2/lb2-3. Story description and ACs corrected. Other lb2 stories written in the same sitting may carry the same stale premise — worth a scan.
- **Question / non-blocking** — The story asserted that promoting tile geometry into a shared subpath "is the ADR-0001 answer." That reading is not obviously right: ADR-0001 extracts on *proven duplication* (its stated evidence is `math3d.ts` being byte-identical across two repos), and tile art would be new geometry with exactly one consumer. Decision was made explicitly rather than by deferring to the ADR — see Sm Assessment.

### TEA (test design)
- **Improvement** (non-blocking): The lobby has no canvas anywhere today, so it has no recording-canvas test helper — every other game in the arcade has hand-rolled its own. `tests/model-bay.test.ts` now carries a fifth copy. Affects `lobby/tests/model-bay.test.ts` (a `@arcade/shared/test-canvas` subpath would retire all five, and unlike the tile art this one IS the proven duplication ADR-0001 asks for). *Found by TEA during test design.*
- **Gap** (non-blocking): `jsdom` implements no canvas, so `getContext('2d')` returns `null` in every lobby test that boots the page. This is not just a test artifact — it is a real browser condition (exhausted context pool, hardened privacy modes), and the lobby had no prior code that could meet it. Affects `lobby/src/shell/modelBay.ts` (the null-context branch is a shipping requirement, not defensive padding). *Found by TEA during test design.*

### Reviewer (review)
- **Gap** (non-blocking): The geometry assertions added in `74810d4` derive the model→canvas mapping from the first drawn point, so a **constant translation offset is absorbed and invisible to them** — drawing every point 10px off on both axes passes 132/132. Consequence is bounded (the in-bounds assertion caps drift at the models' ~8px margin, so the worst undetected case is a slightly off-centre model — cosmetic, not functional). Affects `lobby/tests/model-bay.test.ts` (the model's origin maps to the bay's centre, so the two-line close is `expect(offsetX).toBeCloseTo(size / 2, 0)` and the same for `offsetY`). *Found by Reviewer during re-review, by mutating the fix.*

### Dev (implementation)
- **Improvement** (non-blocking): `npm test` now prints 14 lines of `Not implemented: HTMLCanvasElement's getContext()` from jsdom's virtual console. It is cosmetic and it is arguably informative — it is jsdom announcing the exact null-context path the lobby now handles — but it is noise on every run forever. Affects `lobby/tests/main.test.ts` (the pre-existing bootstrap tests do not stub `getContext`; a stub in their `beforeEach`, or installing the `canvas` package, would silence it). Left alone deliberately: it is TEA's file and quieting it is not Dev's call to make mid-phase. *Found by Dev during implementation.*
- **Question** (non-blocking): The lobby now hardcodes `BAY_PX = 92` to match `.tile-model`'s `5.75rem` in `index.html`. Two sources of truth for one number, and a restyle of the bay would silently leave the canvas backing store at the old resolution (the model would still fit — the CSS size is `100%` — but it would be soft or over-sampled). Affects `lobby/src/shell/modelBay.ts` and `lobby/index.html` (a CSS custom property read at mount, or a `getBoundingClientRect` measurement, would tie them together). Not worth the complexity today; recorded so the next person to resize the bay knows to look. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Animation is tested as an invariant, not as a required behaviour**
  - Spec source: context-story-lb2-9.md, AC-4
  - Spec text: "Animation (if any) is cheap and courteous — it pauses when the tab is hidden and does not run a full per-tile rAF game loop."
  - Implementation: The suite does not require the models to animate. It pins two invariants that hold under EITHER choice: mounting the five-tile row registers at most one animation frame (static = 0, one shared loop = 1, per-tile loop = 5 → fail), and no frame is scheduled while `document.hidden` is true.
  - Rationale: "if any" makes animation Dev's call, and the story says "static or slowly rotating is fine". A test that forced motion would over-constrain the spec; a test that forbade it would too. The invariants are what the AC actually protects — the visitor's battery.
  - Severity: minor
  - Forward impact: If Dev ships a static model, the tab-hidden test cannot fail (there is no loop to keep running). It is a standing guard that becomes load-bearing the moment anyone adds motion — noted so the Reviewer does not read it as a passing test that proves motion is handled.

- **Layout stability is pinned structurally, not by measurement**
  - Spec source: context-story-lb2-9.md, AC-5
  - Spec text: "The slot's presence or absence never shifts the tile layout lb2-7 established."
  - Implementation: jsdom computes no CSS layout, so the bay's 5.75rem box cannot be measured in a unit test. Pinned instead: the canvas must declare CSS width AND height (a `<canvas width=256>` with no CSS sizing lays out at 256 CSS px and blows the recess open — the actual failure mode), the canvas is appended INSIDE the slot, and the tile's own child list is byte-identical before and after mounting.
  - Rationale: These catch the real regression. A true layout assertion needs a browser.
  - Severity: minor
  - Forward impact: The final "does the row still line up" check is an eyeball in a real browser — worth one look at `just serve` before review closes.

### Dev (implementation)
- **Shipped static models — no animation at all**
  - Spec source: context-story-lb2-9.md, AC-4
  - Spec text: "Animation (if any) is cheap and courteous — it pauses when the tab is hidden and does not run a full per-tile rAF game loop."
  - Implementation: `mountModels` draws each model once and registers no `requestAnimationFrame` at all. Zero frame loops, no `visibilitychange` listener — there is nothing running to pause.
  - Rationale: The AC says "if any" and the story says "static or slowly rotating is fine", so motion was mine to choose. Static is the only option that costs the visitor nothing, and these are 2D silhouettes — spinning a flat shape about its centre reads as a rotating sticker, not a tumbling model, so the motion would have bought nothing to pay for. TEA's two invariants (≤1 frame registered for the whole row; nothing scheduled while hidden) hold trivially.
  - Severity: minor
  - Forward impact: TEA already flagged this — the tab-hidden guard cannot fail against a static implementation. It is a standing guard, not proof that motion is handled. Anyone who later adds a rotation must make it ONE shared loop for the row and must pause it on `visibilitychange`; both tests are already waiting.

## Sm Assessment

**Story:** lb2-9 — Draw a real vector model in each lobby tile's model slot
**Workflow:** tdd · **Repos:** lobby (only) · **Branch:** `feat/lb2-9-tile-vector-models` off `develop`
**Points:** 5 · **Jira:** none (local sprint tracking)

### Decision made before setup: where the geometry lives

The story deferred an explicit choice — copy the model geometry into the lobby, or promote it into a shared `@arcade/shared` subpath — and hinted the shared subpath was "the ADR-0001 answer." Put to the user, who chose **author in the lobby**. Locked in:

- Hand-author tile-scale **2D vector silhouettes** in the lobby, one per game (Tempest blaster, TIE fighter, asteroid, Battlezone tank, Red Baron biplane).
- Draw them with **`@arcade/shared/glow`** (`withGlow` + `glowPolyline`) — do not re-implement a glow stack.
- **`arcade-shared` is NOT touched.** No new subpath, no release, no pin bump. The story's `repos` field was corrected from `lobby, arcade-shared` to `lobby`.

Rationale: ADR-0001's extraction test is *proven duplication*, and tile art would be new geometry with a single consumer. The games' own model data is not reusable at tile scale anyway — it is 3D ROM geometry (`star-wars/src/core/models.ts` is 743 lines, `battlezone/src/core/models.ts` is 278). If a second consumer ever appears, extract then.

### Corrections applied to the story

- Description rewritten to record the decision and kill the stale v0.4.0 version-bump premise.
- Acceptance criteria replaced: the old AC #5 demanded paying a bump that does not exist, and old AC #2 posed the geometry question as still open. Both would have sent TEA after phantom work.

### Existing hook

lb2-7 already landed the slot — `lobby/src/shell/tiles.ts:56` sets `slot.dataset.modelSlot = game.id`. This story fills it. Registry glow colours live in `lobby/src/core/registry.ts`.

### Watch items for TEA

- **Battery constraint is a real AC, not decoration.** Static or slowly-rotating only; no per-tile `requestAnimationFrame` game loop, and animation must pause when the tab is hidden. This is the front door — it should not spin fans.
- **Layout stability.** The slot's presence or absence must never shift the tile layout lb2-7 established, including the no-model degrade path.
- **Degrade path.** A game with no model falls back to the empty slot, not a broken or blank canvas.
- `star-wars`' models contact sheet (`/models.html`) is a useful reference for eyeballing shape and scale — reference only, not a dependency.

**Handoff:** Imperator Furiosa (TEA) — red phase.

---

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (failing — ready for Dev)
**Tests Written:** 46 new tests across 3 files, covering all 6 ACs
**Commit:** `77a1cd8` — tests only; `src/` is untouched (`git diff --stat src/` is empty)

### The seam, and why it is where it is

Two new modules. Dev creates both:

| Module | Owns | Notes |
|---|---|---|
| `src/core/models.ts` | The hero geometry as pure data — `ModelPath { points, closed }`, `TileModel { paths }`, `getTileModel(id): TileModel \| undefined` | No DOM. Points normalised to a unit box (`\|x\| ≤ 1`, `\|y\| ≤ 1`), origin at bay centre. `closed` maps 1:1 onto `glowPolyline`'s 4th argument. |
| `src/shell/modelBay.ts` | `mountModels(container: HTMLElement): void` — fills every `[data-model-slot]` with a canvas, drawn via `@arcade/shared/glow` | Mounting is a SEPARATE pass, run after `renderTiles`. |
| `src/main.ts` | Calls `mountModels(games)` at boot | Pinned by `main.test.ts`. |

**`buildTile` still leaves the bay empty.** That is deliberate and it is the load-bearing decision of this phase. `tiles.ts` already promises it in two places — the build path is structural, and `refreshScores` (lb2-3) rewrites a score line *in place* precisely so the tiles "keep their identity, their focus and their model bays". If the model were drawn inside `buildTile`, the only way to refresh a score would be to rebuild the tile, which would destroy every model on the row. So the existing `tiles.test.ts` assertion did not need re-seating — it is the build path's standing contract. I restated its name and comment to say so, since its old comment read as a placeholder awaiting deletion. Its intent is unchanged.

### Test files

- **`tests/tile-models.test.ts`** (29 tests, pure) — every registry game has a model; unknown ids answer `undefined`; models are drawable (no stranded one-point path), bounded to the unit box, actually fill the bay, and are **distinct from one another**.
- **`tests/model-bay.test.ts`** (17 tests, jsdom) — mounting, the glow seam, the degrade paths, the battery budget, and layout stability.
- **`tests/main.test.ts`** (+2 tests) — the bays are filled at boot, and the page still comes up when the browser gives no 2D context.

### Traps these were built to catch

- **The prototype-key trap.** `getTileModel` is called with `slot.dataset.modelSlot` — a DOM string, which is data, not a key to trust (ts rule #10). A model table that is a bare object literal answers `TILE_MODELS['toString']` with a **function** — truthy, not a model, and the caller cheerfully tries to draw it. Use a `Map` (or a null-prototype table). Pinned.
- **The hand-rolled glow stack.** `@arcade/shared/glow` is mocked at the specifier the shell imports, and the recording context watches for direct `ctx.shadowBlur` writes. Re-implementing the set-draw-**reset** envelope fails — including the reset that asteroids, star-wars and battlezone each forgot.
- **The blown-out bay.** `<canvas width=256>` with no CSS sizing lays out at 256 CSS px and rips open a 5.75rem recess. The canvas must declare both a backing-store size and a CSS size.
- **The null 2D context.** `getContext('2d')` genuinely returns `null` (jsdom always; real browsers under context exhaustion / hardened privacy modes). Leaving a dead canvas in the bay is exactly the "broken or blank canvas" AC-1 forbids — bail and leave the bay as lb2-7 built it.
- **Five loops on the front door.** Five tiles must not mean five `requestAnimationFrame` loops. At most one frame may be registered for the whole row, and none while `document.hidden`.

### Rule Coverage

| Rule (typescript.md) | Test(s) | Status |
|---|---|---|
| #2 missing `readonly` on data that must not be mutated | `TileModel`/`ModelPath` are `readonly` throughout the pinned type surface | failing |
| #4 null/undefined — `Map.get()` used without an undefined check | `returns undefined for a game it has never heard of`; `leaves the bay empty for a listed game with no model`; `leaves no canvas behind when the browser gives us no 2D context` | failing |
| #8 test quality — no `as any`, mock types match the real signatures | Self-checked: zero `as any` in the new suites. The two `as unknown as CanvasRenderingContext2D` casts are the recording-context stubs and are commented as such | n/a |
| #10 input validation — DOM input reaching a lookup untrusted | `answers undefined — not an inherited Object member — for prototype keys`; `does not trust the slot dataset — an id the registry never issued draws nothing` | failing |
| #12 performance — barrel imports, hot-path cost | The shell must import the `@arcade/shared/glow` **subpath**, not the package barrel (the suite mocks the subpath, so a barrel import fails to intercept); `does not start an animation loop per tile` | failing |

**Rules checked:** 5 of 5 applicable lang-review rules have test coverage (#3 enums, #6 React, #7/#11 async+errors, #9 build config carry no surface in this story).
**Self-check:** 0 vacuous tests. Every test carries a meaningful assertion; none uses `let _ =`, `assert(true)`, or an always-`undefined` `is_none()`-style check.

### Verification: the tests were proven to discriminate

RED alone only proves the modules are missing. So I wrote a throwaway implementation, confirmed the suite goes fully **green** against it (52 passing), then mutated it with each bug the suite claims to catch. **Every mutation failed exactly the test written for it, and no others:**

| Mutation | Test that caught it |
|---|---|
| Model table as a plain object literal | `answers undefined … for prototype keys` |
| One silhouette returned for all five games | `gives every game its own shape, not one silhouette copy-pasted five times` |
| Glow envelope hand-rolled on the ctx | `never hand-rolls the glow envelope`; `strokes through the shared glow subpath` |
| Hardcoded colour instead of the registry's | `draws each game in its own registry glow colour` |
| `getContext` null result ignored | `leaves no canvas behind when the browser gives us no 2D context` |
| One rAF loop **per tile** | `does not start an animation loop per tile` |
| Loop keeps running while the tab is hidden | `schedules no frames while the tab is hidden` |
| Canvas with no CSS sizing | `sizes the canvas in CSS so its pixel buffer cannot blow the bay open` |

The throwaway implementation was deleted before the commit. **Dev writes the real one — do not go looking for it in the branch.**

### Notes for Dev (The Word Burgers)

- `npx tsc --noEmit` currently reports 3 errors, **all cascades of the two missing modules** (`TS2307` ×2, plus a `TS7006` on `path` that resolves the moment `TileModel` exists). They disappear when you create the files; they are not bugs in the tests.
- The bay is 5.75rem square (`index.html` `.tile-model`) — about 92 CSS px. Scale the unit box into that and leave a margin; the bay has a visible border and the model should sit inside it, not touch it.
- Registry glow colours are the source of truth for the stroke (`src/core/registry.ts`) — same as the title and the href. Do not put a palette in the model file.
- Reference for shape and scale: star-wars' models contact sheet (`/models.html`). Reference only — no dependency, and none of that 3D geometry ships here.

**Handoff:** To Dev (The Word Burgers) — green phase.

---

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 127/127 passing (GREEN) · `tsc --noEmit` clean · `vite build` clean
**Branch:** `feat/lb2-9-tile-vector-models` (pushed) · commit `2016d30`

**Files Changed:**
- `src/core/models.ts` (new) — the five hero silhouettes as pure data, normalised to a unit box.
- `src/shell/modelBay.ts` (new) — `mountModels()`: a canvas per bay, stroked through `@arcade/shared/glow`.
- `src/main.ts` — calls `mountModels(games)` after `renderTiles`.

Took the seam TEA laid out, unchanged. No test was weakened, moved, or deleted.

### The decisions inside the implementation

- **A `Map`, not an object literal.** The lookup key arrives from `data-model-slot` — a DOM string. A bare object answers `TILE_MODELS['toString']` with a *function*: truthy, not a model, and the caller draws it. A Map has no prototype to inherit from.
- **Static. Zero `requestAnimationFrame`.** The AC's "if any" made motion my call, and these are 2D silhouettes — spinning a flat shape about its centre reads as a rotating sticker, not a tumbling model. So the motion would have bought nothing and cost the visitor a frame loop on the front door. Logged as a deviation, because it means TEA's tab-hidden guard cannot fail today.
- **The canvas carries two sizes.** A backing store (`92 × dpr`, capped by `@arcade/shared/view`'s `MAX_DPR`) *and* a CSS size (`100%`). With only the first, the canvas lays out at its pixel width — 184 CSS px on a retina panel — and rips the 5.75rem recess open, ragging the whole row.
- **Bail before appending, not after.** When `getContext('2d')` returns null the canvas is simply never attached, so the bay is left exactly as lb2-7 built it. An empty recess reads as part of the cabinet; a dead canvas reads as something that failed to load.

### Verified in a real browser, not just in jsdom

jsdom computes no layout, so green tests cannot prove the row still lines up — TEA flagged this explicitly. I served the working tree and looked at it.

Port 5270 was already held by another checkout's dev server (`strictPort` doing its job), so I served this tree on a spare port rather than trust a page another checkout was rendering.

Result: **the row lines up, no layout shift, zero console errors**, and four of the five models read instantly — TIE panels-and-ball, the craggy asteroid, the tank and its barrel, Tempest's claw.

**The fifth did not, and the test suite could not have told me.** The first cut of the biplane had a fat diamond fuselage that dominated the bay; the wings hung off it as crossbars and the whole thing read as a decorative glyph. It passed every assertion — bounded, distinct, drawable, correctly coloured — because "is it recognisably a biplane" is not a property a unit test can hold. Re-cut it with a slim fuselage, the wings as the longest strokes on screen, and landing gear. It reads as a biplane now.

### Acceptance criteria

| AC | Status |
|---|---|
| 1 — hero model per tile, in the registry glow colour; no model degrades to the empty slot | ✅ five models; missing-model / unknown-id / null-context all leave the bay empty |
| 2 — drawing goes through `@arcade/shared/glow` | ✅ `glowPolyline` only; nothing touches `ctx.shadowBlur` directly |
| 3 — geometry authored in the lobby; `arcade-shared` untouched | ✅ `src/core/models.ts`; no shared change, no release, no pin bump |
| 4 — animation cheap and courteous | ✅ static: zero frame loops (see deviation) |
| 5 — slot never shifts the lb2-7 layout | ✅ canvas is CSS-sized inside the bay; confirmed by eye in a browser |
| 6 — `npm run build` and `npm test` pass | ✅ 127/127, build clean |

**Handoff:** To Reviewer (Immortan Joe) — review phase.

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 127/127 green, build clean, 0 debug/TODO/skip smells, tree clean, branch pushed |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents.edge_hunter` |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents.silent_failure_hunter` |
| 4 | reviewer-test-analyzer | Yes | findings | 8 | confirmed 5, deferred 3, dismissed 0 |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents.comment_analyzer` |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents.type_design` |
| 7 | reviewer-security | Yes | clean | none | N/A — no findings; independently corroborated (see VERIFIED items) |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via `workflow.reviewer_subagents.simplifier` |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 6 confirmed, 0 dismissed, 3 deferred

---

## Reviewer Assessment

**Verdict:** REJECTED — changes required (test-only; the shipped code is correct)
**Story:** lb2-9 · **Branch:** `feat/lb2-9-tile-vector-models` · **Commits:** `77a1cd8` (red), `2016d30` (green)

The implementation is right. I verified it in a real browser and it does what the story asked. **The test suite that is supposed to protect it does not.** I broke the code in two different ways and the suite reported 127/127 both times.

### The finding that blocks this

**[TEST] CRITICAL — The suite cannot detect that the models are never drawn. `tests/model-bay.test.ts:182,199`**

Nothing in the suite ever inspects the geometry handed to `glowPolyline`. `glowStyles()` (line 182) extracts only `call[2]` — the style object. The one test that claims otherwise, *"actually strokes geometry — a mounted canvas that draws nothing is just an empty box"* (line 199), asserts only `mock.calls.length >= GAMES.length`. `call[1]` (the points) and `call[3]` (the closed flag) are never read by any test in the repo — I grepped for them; there are zero hits.

I proved the gap is exploitable rather than merely theorising it. Two mutations of `drawModel` (`src/shell/modelBay.ts:45-50`), each run against the full suite:

| Mutation | What the visitor sees | Suite result |
|---|---|---|
| Drop `scale` from the transform (`half + x` instead of `half + x * scale`) | Every model collapses into a 2px speck in the middle of the bay | **127/127 PASS** |
| Pass `glowPolyline` an empty array instead of the points | **Every bay is blank. The story delivers nothing at all.** | **127/127 PASS** |

A suite that stays green while the entire feature renders nothing is not protecting the feature. This is the exact seam TEA's own mutation-testing pass missed: it mutated the model data, the colour, the glow envelope, the rAF discipline and the CSS sizing — but never the coordinate transform, which is the one piece of logic actually converting the story's data into pixels.

**Required fix (test-only, ~20 lines):** capture `call[1]`/`call[3]` and assert, per game, that (a) the point count matches the authored model's paths, (b) every point lands inside `0..BAY_PX` on both axes, (c) the points are not all identical (catches the collapsed-transform mutation), and (d) `closed` matches each path's authored flag. Then re-run both mutations above and confirm each one now goes red.

### Also required (cheap, and each has a concrete failure it lets through)

**[TEST] MEDIUM — The wiring test cannot tell "mountModels ran and degraded" from "mountModels was deleted". `tests/main.test.ts:152`**
*"still comes up when the browser hands back no 2D context"* asserts the tiles render and no canvas exists. With `getContext` stubbed to null, deleting `mountModels(games)` from `src/main.ts:19` entirely leaves this test green. Spy on `HTMLCanvasElement.prototype.getContext` and assert it was called, which proves the mount pass actually attempted the draw before declining.

**[RULE] LOW — rule #2: `RecordingContext.shadowBlurWrites` is `number[]`, should be `readonly number[]`. `tests/model-bay.test.ts:60`**
The `readonly` modifier stops reassignment of the property, not mutation of the array. Every consumer only reads it. Flagged by the rule-checker against typescript.md #2 ("missing `readonly` on array/object parameters that should not be mutated"); it is a project rule, so it is confirmed, not dismissed.

### Confirmed but NOT blocking — disclosed, and honest about themselves

**[TEST] MEDIUM — The two animation tests cannot fail against the shipped code. `tests/model-bay.test.ts:288,296`**
`mountModels` never calls `requestAnimationFrame` and never reads `document.hidden`, so `rafRequests <= 1` is `0 <= 1` (a tautology today) and "schedules no frames while the tab is hidden" passes because nothing is ever scheduled, hidden or not. The test-analyzer is right on the facts.

I am **not** blocking on these, and the reason matters: **both TEA and Dev disclosed this in writing before I looked** — TEA logged it as a deviation with the explicit warning "the Reviewer must not read it as a passing test that proves motion is handled", and Dev logged the static-model choice with the same caveat. They are forward-looking regression guards for a per-tile rAF loop, which is a real and likely future mistake on a page like this. A guard that cannot fire today but will fire the day someone adds motion is worth keeping. Disclosed inert guards are a different animal from the geometry hole above, which was *advertised as covered and was not*.

**[TEST] LOW — "does not trust the slot dataset" doesn't exercise what it claims. `tests/model-bay.test.ts:262`**
`getGame('toString')` already returns `undefined` via `Array.find`, so this passes even if `TILE_MODELS` were a plain object literal — the exact footgun `src/core/models.ts:35-38` warns about. The Map protection *is* genuinely proven, just next door in `tests/tile-models.test.ts` ("answers undefined — not an inherited Object member"). The invariant is covered; only this test's stated intent is oversold. Reword the comment.

### Deferred (file as follow-ups, not blockers)

- **[TEST]** No runtime test drives a degenerate model (empty `paths`, single-point path) through `drawModel` — `TILE_MODELS` is a private Map with no injection seam. Low real risk: the real `glowPolyline` no-ops on an empty list and a 1-point path strokes nothing, so it degrades safely by construction. The static authoring lint in `tests/tile-models.test.ts` covers the realistic failure.
- **[TEST]** The `MAX_DPR` clamp (`src/shell/modelBay.ts:88`) is never exercised — jsdom's `devicePixelRatio` is always 1, so no test proves the backing store is capped at 2× rather than 4×.
- **[TEST/IMPROVEMENT]** The glow mock is a bare `vi.fn()` that always "succeeds", hiding the real `glowPolyline`'s no-op-on-empty-list contract. Fixing the CRITICAL finding above makes this moot.

### Rule Compliance — typescript.md, enumerated

The rule-checker enumerated 56 instances across 17 rules (13 checklist + 4 project conventions). I spot-verified its load-bearing claims against the source rather than taking them on faith.

| Rule | Instances | Verdict |
|---|---|---|
| #1 type-safety escapes | 11 | PASS — zero `as any`, zero `@ts-ignore`, zero `!` non-null assertions. The two `as unknown as CanvasRenderingContext2D` are test mocks of a ~100-member browser interface, documented in place. `modelBay.ts:47`'s `as readonly [number, number]` narrows a genuine 2-tuple. |
| #2 generic/interface pitfalls | 11 | **1 VIOLATION** — `RecordingContext.shadowBlurWrites` (above). `ModelPath`, `TileModel`, `TILE_MODELS` are all correctly `readonly`/`ReadonlyMap`. |
| #3 enums | 0 | N/A — no enum in the diff. |
| #4 null/undefined | 9 | PASS — every nullable is checked before use: `dataset.modelSlot` (`modelBay.ts:71`), `getGame` + `getTileModel` (`:80`), `getContext('2d')` (`:98`). I specifically re-checked `window.devicePixelRatio > 0 ? … : 1` (`:88`): `undefined > 0` and `NaN > 0` are both `false`, so it degrades to 1 correctly — it is *more* defensive than `|| 1`, not a bug. Zero `??`/`||`-as-default in the diff. |
| #5 module/declaration | 5 | PASS — `import { getTileModel, type TileModel }` correctly splits type from value. Missing `.js` extensions are correct under `moduleResolution: "bundler"`. |
| #6 React/JSX | 0 | N/A. |
| #7 async/promise | 3 | PASS — the shipped functions are synchronous and correctly typed `void`. |
| #8 test quality | 4 | PASS on the letter of the rule (no `as any`, mock shape matches the real `glow.d.ts`, no `dist/` imports) — but see the CRITICAL finding, which is a test-quality defect the checklist's named patterns do not reach. |
| #9 build/config | 0 | N/A — no config changed; `strict: true` intact. |
| #10 input validation | 1 | PASS — `getTileModel(id)` takes a DOM-derived string, but the prototype-pollution risk is structurally eliminated by the `Map` (not an object literal) and directly tested against `__proto__`/`constructor`/`toString`/`valueOf`/`hasOwnProperty`. |
| #11 error handling | 0 | N/A — no try/catch; no swallowed errors. |
| #12 performance/bundle | 5 | PASS — and this answers the question I put to the checker explicitly: `@arcade/shared/glow` and `@arcade/shared/view` are **subpath** exports resolving to `dist/glow.js` / `dist/view.js`, not the aggregate barrel. That is the correct pattern, not a #12 violation. |
| #13 fix regressions | 0 | N/A — initial implementation, no prior fix diff. |
| core/shell purity (project) | 2 | PASS — `src/core/models.ts` contains zero DOM references; `src/shell/modelBay.ts` is the only new file touching the DOM. |
| registry is source of truth (project) | 2 | PASS — the stroke reads `game.color` (`modelBay.ts:101`), never a hardcoded palette. The one hex literal in the diff is the `SYNTHETIC` test fixture for an *unregistered* game, which by construction has no model and is never drawn. |
| data never becomes markup (project) | 2 | PASS — `modelBay.ts` renders no text and touches no HTML sink; the `innerHTML` in tests is static literals only. |
| no new deps (project) | 1 | PASS — `package.json` unchanged; zero new dependencies. |

### Verified independently (evidence, not vibes)

- **[VERIFIED] AC-5 (layout never shifts) — measured, not eyeballed.** jsdom computes no layout, so no unit test can prove this; TEA said as much. I served the working tree and measured the real DOM. Tile heights are **268.53px with the models and 268.53px with every canvas removed** — identical across all five tiles. Every canvas measures 90×90 inside its 92×92 bay (`overflowBottom = -1px`, `overflowRight = -1px`): nothing escapes the recess. I specifically hunted the baseline trap — `getComputedStyle(canvas).display` is `inline`, which would normally add descender space — but a canvas is a *replaced* element and honours its own height, so no line-box gap appears. AC-5 holds.
- **[VERIFIED] The models are genuinely five different, recognisable objects — `src/core/models.ts`.** Rendered and inspected: TIE panels-and-ball, a craggy asteroid, a hulled tank with barrel, Tempest's claw, a biplane with stacked wings and landing gear. Not five copies of one shape (and `tests/tile-models.test.ts:94` pins that independently). Dev re-cut the biplane after finding the first version read as a diamond glyph — a defect no test could have caught, found only by looking.
- **[VERIFIED] Zero console errors on load** — checked in the live page, not inferred.
- **[VERIFIED] Degrade paths are real, not decorative — `src/shell/modelBay.ts:71,80,98`.** Three independent bail-outs (absent dataset id, unknown game/model, null 2D context), and the canvas is created but **not appended** until after the context check (`:103`), so the null path provably leaves no dead canvas in the bay. Complies with typescript.md #4.
- **[VERIFIED] The glow is not re-implemented — `src/shell/modelBay.ts:49`.** All drawing goes through `glowPolyline`; nothing in `src/` assigns `ctx.shadowBlur`. Corroborated by the recording context in the suite, which watches for exactly that write. AC-2 holds.
- **[SEC] [VERIFIED] Security clean — no findings, and I checked the claim rather than accepting it.** reviewer-security returned zero findings; I corroborated each load-bearing point against the source. The DOM-sourced `data-model-slot` string cannot reach an inherited property: `getGame` is an `Array.find` with `===` (`src/core/registry.ts:66`) and `getTileModel` is a `Map` (`src/core/models.ts:252`), so `__proto__`/`toString`/`constructor` all answer `undefined`, and **both** lookups must succeed before anything draws (`src/shell/modelBay.ts:80`). `game.color` reaching `strokeStyle`/`shadowColor` is inert — Canvas2D style setters are parsed by the browser's colour parser, not an HTML/CSS text sink — and is a hardcoded registry literal, not attacker-reachable; I read `@arcade/shared/dist/glow.js` to confirm the assignment path. No HTML sink is touched in `src/` (the `innerHTML` in the diff is static literals in test fixtures only). No network calls, no secrets, no new external input, no information leakage.

### Devil's Advocate

Let me argue this branch is broken, and take the argument seriously.

The strongest case against it is the one I have already made and proved: **this feature has no working regression net.** The suite is 46 tests and 905 lines, and it is green when the product draws literally nothing. That is worse than a thin suite, because it is a *confident* suite — it advertises "actually strokes geometry" in a test name, and the words are false. The next engineer to touch `drawModel` will trust the green check. They will refactor `half + x * scale`, ship a page of empty boxes, and the CI will congratulate them. The whole apparatus of this story — the unit-box invariant in `models.ts`, the bounds tests, the distinctness test — exists to guarantee geometry that the suite then never checks arrives anywhere. Everything upstream of the transform is pinned; the transform itself, the one function that turns data into pixels, is naked.

What would a confused user see? Nothing unusual — and that is the point. A blank bay is indistinguishable from lb2-7's intended empty recess. This feature fails *silently and beautifully*: the degrade paths were built so that a missing model looks like furniture. That excellent design decision is precisely what makes an undetected geometry regression invisible in production too. No console error, no layout break, no exception — just five quiet empty boxes on the front door and nobody the wiser until someone happens to look at the arcade. The failure mode and the intended fallback are pixel-identical.

Where else could it break? A visitor with a browser-zoom or an accessibility root font-size of 20px gets a 115px bay while the backing store stays at `92 × dpr`; the model is upscaled and soft. Not a bug — `BAY_PX` is a resolution hint, the CSS `100%` keeps the box correct, and Dev logged the two-sources-of-truth coupling as a Question finding. A hostile `data-model-slot` is dead on arrival: `getGame` is an `Array.find` with `===` and `getTileModel` is a `Map`, so both answer `undefined`, and both must succeed before anything draws. A stressed browser that refuses a 2D context leaves the bay exactly as it was. Called twice, `mountModels` no-ops on the second pass. I tried to find a crash and could not; the *runtime* behaviour is genuinely solid, which is why this is a rejection about tests and not about code.

The honest summary: Dev built the right thing and checked it by looking at it, which is the only reason we know it works. The suite is the part that is broken.

### Verdict

**REJECTED — changes required.** No production code needs to change; I verified the shipped behaviour is correct in a real browser. Three test fixes:

1. **(CRITICAL, blocking)** Assert the geometry actually handed to `glowPolyline` — points, bounds, and the `closed` flag. Re-run the two mutations in the table above and confirm each now fails.
2. **(MEDIUM, blocking)** `tests/main.test.ts:152` — spy on `getContext` so the null-context test proves `mountModels` ran.
3. **(LOW, blocking — project rule #2)** `tests/model-bay.test.ts:60` — `shadowBlurWrites: readonly number[]`.

Then reword the overselling comment on `tests/model-bay.test.ts:262`, and file the three deferred items as follow-ups.

**Handoff:** Back to Imperator Furiosa (TEA) — the fixes are entirely in the test suite, and test maintenance is hers.

---

## TEA Assessment — review remediation

**Status:** All three blocking findings fixed. **132/132 passing** · `tsc --noEmit` clean · `vite build` clean
**Commit:** `74810d4` (tests only — `git diff --stat src/` is empty; no production code changed)

The rejection was correct and the miss was mine. My RED-phase mutation pass tested the model *data*, the colour, the glow envelope, the rAF discipline and the CSS sizing — and never once mutated `drawModel`'s coordinate transform, the single function that turns the story's data into pixels. Everything upstream of it was pinned; it was naked.

### 1. CRITICAL — the geometry now has to arrive (`tests/model-bay.test.ts`)

The fix is *not* to recompute `half + x * scale` in the test. A test that re-implements the transform agrees with a wrong implementation exactly as happily as a right one. Instead the drawn geometry is held to the properties a faithful render must have, whatever arithmetic produced it:

- one stroked path per authored path, carrying **every** point, `closed` exactly as authored;
- every point lands **on** the canvas (`0..size` both axes);
- the drawn shape is the model under **one uniform scale + offset** — derived from the extremes of what was actually drawn, then **every individual point** held to that derived mapping;
- and that scale is large enough to be a hero object rather than a speck (`> size × 0.25`; a transform that lost its scale factor lands at 1).

Also replaced `calls.length >= GAMES.length` with the exact total path count across the five models — the old bound let a bay stroke one path and drop the rest of its model on the floor.

**Re-mutated, seven attacks, all now caught** (A and B are the two that previously shipped green at 127/127):

| Mutation | Before | After |
|---|---|---|
| A — scale dropped (every model a 2px speck) | **PASS 127/127** | 5 failed |
| B — empty point list (**every bay blank**) | **PASS 127/127** | 5 failed |
| C — x/y axes swapped | not tried | 5 failed |
| D — y mirrored (model upside-down) | not tried | 5 failed |
| E — squashed on one axis (non-uniform scale) | not tried | 5 failed |
| F — closed-ring flag dropped | not tried | 5 failed |
| G — only the first path of each model drawn | not tried | 4 failed |

### 2. MEDIUM — the wiring test now proves the mount pass ran (`tests/main.test.ts`)

The null-context test now spies on `getContext` and asserts it was called. Verified by mutation: **commenting `mountModels(games)` out of `main.ts` now fails both wiring tests** (previously only one — "no canvas on the page" was equally true of a lobby that tried and declined, and one that never wired the mount pass up at all).

### 3. LOW — project rule #2 (`tests/model-bay.test.ts:60`)

`RecordingContext.shadowBlurWrites` is now `readonly number[]`. The `readonly` modifier blocked reassigning the property, not mutating the array; every consumer only reads it.

### Also done

Reworded the oversold comment on the "does not trust the slot dataset" test. It is an integration smoke test: a hostile id dies in `getGame`'s array scan before `getTileModel` is ever consulted, so it would pass even with the object-literal table `models.ts` warns against. The Map protection is genuinely proven next door in `tile-models.test.ts`'s prototype-key test. Both tests matter — this one pins that the shell *asks*, that one pins what it is *told* — and the comment now says so.

### Not changed, and why

The two animation guards (`does not start an animation loop per tile`, `schedules no frames while the tab is hidden`) stay as they are. The Reviewer confirmed the finding but explicitly did not block on it, and I agree with his reasoning: they were disclosed in writing before review, they cannot fire against a static implementation, and they will fire the day someone adds a per-tile rAF loop to the front door — which is a real and likely future mistake. Deleting them would remove the guard precisely where the temptation lives. They are documented as inert-by-design in the Design Deviations above, so nobody can mistake their passing for proof that motion is handled.

The three deferred items (no injection seam for a degenerate model, the untested `MAX_DPR` clamp, the glow mock not replicating the no-op-on-empty contract) remain deferred. The third is now moot — the geometry assertions make an empty point list fail loudly.

**Handoff:** Back to Immortan Joe (Reviewer) — re-review.

---

## Reviewer Assessment — re-review

**Verdict:** APPROVED
**Commits:** `77a1cd8` (red) · `2016d30` (green) · `74810d4` (test remediation)
**Re-review basis:** independently re-run, not taken on trust.

All three blocking findings are fixed. I verified each one myself rather than reading TEA's summary.

### Verified: production code was not touched

`git diff 2016d30..HEAD --stat -- src/` is **empty**. The remediation is 116 insertions across two test files and nothing else — exactly what I asked for, and it means the behaviour I measured in the browser during the first pass still stands unaltered.

### Verified: the geometry is now genuinely pinned

I re-ran my two killers and then wrote four fresh mutations aimed squarely at the *new* assertions, to see whether they were merely re-describing the implementation:

| Attack | First review | Now |
|---|---|---|
| A — scale dropped (every model a 2px speck) | **PASS 127/127** | **5 failed** |
| B — empty point list (**every bay blank**) | **PASS 127/127** | **5 failed** |
| I — points reversed within each path | — | **5 failed** |
| J — every point collapsed onto one coordinate | — | **5 failed** |
| K — scale ×3, model overflows the bay | — | **5 failed** |
| H — `mountModels()` deleted from `main.ts` | 1 test failed | **both wiring tests fail** |

The approach is right, and it is the reason these hold: the suite does **not** recompute `half + x * scale` (a test that re-implements the transform agrees with a wrong implementation as readily as a right one). It derives the mapping from what was actually drawn and then holds every individual point to it. That is why it catches mirroring, axis-swaps and reordering — failure modes nobody enumerated in advance.

**[RULE #2] fixed** — `shadowBlurWrites: readonly number[]` at `tests/model-bay.test.ts:61`.

### One residual I found by attacking the fix — accepted, not blocking

**[TEST] LOW — a constant translation offset is absorbed by the derived mapping. `tests/model-bay.test.ts`**

Mutation L: drawing every point at `+10px` on both axes passes **132/132**. Because the test derives `offsetX/offsetY` from the first drawn point, any uniform translation is invisible to it.

I am not blocking, and I want the reasoning on the record rather than buried:
- The consequence is bounded. The in-bounds assertion (`0..size`) caps how far a model can drift, and the models carry only ~8px of margin, so the worst undetected case is a model sitting a few pixels off-centre in its bay — visible if you look for it, uniformly scaled, correct shape, correct colour, fully inside the recess.
- It is cosmetic, not functional. No AC requires centring, and every failure mode that would actually *break* the story — blank, speck, mirrored, squashed, swapped, truncated, overflowing — is now caught.
- The current code is verified correct by measurement, so this is a hole in the net, not a live defect.

**The two-line close, for whoever picks it up:** the model's origin maps to the bay's centre, so `offsetX`/`offsetY` should both be `size / 2` — `expect(offsetX).toBeCloseTo(size / 2, 0)` and the same for `offsetY`. Filed as a Delivery Finding.

### The animation guards — unchanged, and correctly so

TEA left the two inert rAF tests in place and I agree. They were disclosed in writing before I ever looked, they are documented as inert-by-design in Design Deviations, and they will fire the day someone adds a per-tile frame loop to the front door — which is exactly the mistake this page invites. Deleting a guard because it hasn't caught anything yet is how you get bitten by the thing it was guarding. Disclosed-inert is a different animal from advertised-as-covered-and-isn't, which is what I rejected on.

### Final state

- **132/132 passing** · `tsc --noEmit` clean · `vite build` clean · working tree clean · branch pushed.
- All six ACs met. AC-5 verified by DOM measurement (tile heights 268.53px with and without models); AC-1/AC-2 verified in a live browser and now pinned by mutation-checked assertions.
- Zero production-code findings across both passes. The security scan, the rule-checker's 56-instance enumeration, and my own trace all came back clean; the one rule violation (#2, readonly) is fixed.

**Handoff:** To The Organic Mechanic (SM) — finish phase.