---
story_id: "sw8-4"
jira_key: "sw8-4"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-4: Trench reads long + side guns register — extend the visible render window past the 28,672u cutoff and thicken wall-panel density so the channel reads its ~21s length and the wall guns are legible

## Story Details
- **ID:** sw8-4
- **Jira Key:** sw8-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 3
- **Priority:** p2
- **Repos:** star-wars

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-24T14:29:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T20:49:22Z | 2026-07-21T20:53:00Z | 3m 38s |
| red | 2026-07-21T20:53:00Z | 2026-07-24T14:10:10Z | 65h 17m |
| green | 2026-07-24T14:10:10Z | 2026-07-24T14:20:42Z | 10m 32s |
| review | 2026-07-24T14:20:42Z | 2026-07-24T14:29:38Z | 8m 56s |
| finish | 2026-07-24T14:29:38Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA/red] Conflict · BLOCKING — the story's core premise is refuted by the code.** AC1/AC2 ruling: `TRENCH_FAR = 0x7000` (28,672u, `src/core/trench-channel.ts:72`) is **ROM-authentic, not a clamp bug**. It is the cabinet's own far cull — `CMPD #7000` (disasm) + `BSVFAR/BSVBOT/BSVPORT` "?CLOSE ENUF TO SEE?" (WSBASE.MAC) — *and* the `WSLAZR CLBLZ` beam clip (`beamHit(..., TRENCH_FAR)`, sim.ts:1088/1104). It is **cited in 3 audit pair files** (`docs/audit/findings/pair-{trench,surface,guns}.json`) and **already pinned by an existing test**: `tests/core/swept-port-collision.test.ts:198` — `expect(TRENCH_FAR, 'the ROM number itself, not a tuned one').toBe(0x7000)`. Extending it past 28,672u (as the title + context AC4 direct) would (a) diverge from the cabinet, (b) redden the citations gate, and (c) contradict this story's **own AC6** ("no cited constants touched"). **Verdict: accepted-deviation / ROM-authentic — do NOT raise the far cull.**
- **[TEA/red] Gap — "trench reads long" is ALREADY satisfied, faithfully.** The long channel is modeled by content STREAMING from beyond the $7000 draw window (sw7-22 / R6d), not by drawing farther: the exhaust port sits at `TRENCH_PORT_OFFSET > TRENCH_FAR` (`trench-port-bs-plc.test.ts:79`), force fields stream from beyond $7000 (`trench-forcefield-streaming.test.ts:99`), obstacles stream in. The player traverses a long trench while only ever *seeing/shooting* the ROM-authentic 28,672u ahead — exactly as the cabinet does. There is no geometric "short trench" bug left to fix.
- **[TEA/red] Improvement — the only genuinely-open sub-scope is LEGIBILITY, and it's a visual-QA ruling, not a unit test.** Visible wall panels are `trenchWallDetail` (trench-detail.ts): 36 panels/wall at `PANEL_Z=800` out to `TRENCH_FAR`. `PANEL_Z/PANEL_W/PANEL_H` are **PROVISIONAL — "no ROM grid to pin them to"** (trench-detail.ts:14-36), so "thicken density" has **no ROM target to write a failing test against**; picking a number would be an invented (tuned) assertion, which the ROM-authenticity ethos forbids. Whether side guns (sw7-20) are "legible" is a cabinet-comparison judgment (design §6 manual QA), not a `core` invariant. **RED cannot produce a meaningful failing test for the story as written — it needs re-ruling first.**

### TEA (test design) — RE-SCOPED RED pass 2026-07-24
- **Gap** (non-blocking): No tracked trench-end location in `GameState` to drive the terminus's end-approach case (`BSVFAR`'s `BS.ELC`/`BS.EFL` "?END IN VIEW YET?" branch — draw the far frame at the TRUE end once it is within `#7000`). Affects `src/core/state.ts` + `src/core/trench-detail.ts` (a future story wanting the terminus to APPROACH as the trench ends needs an end-distance in state and a `min(endDistance, TRENCH_FAR)` seat; this RED pins only the faithful mid-run seat at −TRENCH_FAR, per AC2's documented deferral). *Found by TEA during test design.*
- Otherwise no blocking upstream findings — the re-scoped AC2 is cleanly unit-testable as pure `src/core` geometry.

### Dev (implementation)
- No upstream findings during implementation. TEA's contract was directly implementable; the only observation (no tracked trench-end in `GameState` for the end-approach terminus) is already captured above as a non-blocking Gap.

### Reviewer (code review)
- No upstream findings during code review. The change is clean and additive; the only forward-looking item (no tracked trench-end state for the end-approach terminus, and AC3/AC4 visual-QA vs the longplay) is already captured by TEA above.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Terminus home: `trench-detail.ts` as a SEPARATE model, not folded into `trenchChannel`**
  - Spec source: context-story-sw8-4.md, AC2
  - Spec text: "a `trenchFarEnd(scroll)` model, or an addition to `trenchChannel`, in `src/core/` — pure, deterministic, mirroring `trenchWallDetail`"
  - Implementation: the RED contract imports `trenchFarEnd` from `src/core/trench-detail.ts` (the home of `trenchWallDetail`, the model AC2 says to mirror) as a SEPARATE `Model3D`; it is NOT the "addition to `trenchChannel`" alternative. Dev may re-export from a dedicated file.
  - Rationale: folding a STATIC terminus into `trenchChannel` breaks its `trenchChannel(s) === trenchChannel(s+RIB_Z)` recycling invariant and the 30-test 11-6 suite → violates AC5. A separate model mirrors `trenchWallDetail` exactly and keeps each model single-responsibility.
  - Severity: minor
  - Forward impact: Dev must make `trenchFarEnd` reachable at `src/core/trench-detail.ts` (implement there or re-export); the shell strokes it like the other trench models.
- **Seat latitude read as one-sided [−TRENCH_FAR, −TRENCH_FAR + RIB_Z], not symmetric ±RIB_Z**
  - Spec source: context-story-sw8-4.md, AC2 (Seat depth bullet)
  - Spec text: "seated at `−TRENCH_FAR` (± the RIB_Z quantum) mid-run"
  - Implementation: tests bound the seat to `[−TRENCH_FAR, −TRENCH_FAR + RIB_Z]` — within one RIB_Z toward the cockpit, but NEVER beyond −TRENCH_FAR.
  - Rationale: `BSVFAR` clamps the far reference to a MAX of `#7000` (`LDD #7000` when no end in view) and never draws past it; AC1/AC5 forbid drawing beyond the $7000 cull. So the faithful "±RIB_Z" is one-sided (+RIB_Z toward the cockpit); a seat past −TRENCH_FAR would over-draw the cabinet's own cull.
  - Severity: minor
  - Forward impact: none — both faithful impls (static at −TRENCH_FAR, or snap-to-farthest-rib-station) fall inside the window.
- **End-approach case (true end within $7000) deferred — RED pins only the mid-run seat**
  - Spec source: context-story-sw8-4.md, AC2 (Seat depth bullet)
  - Spec text: "the true trench end when it is within `TRENCH_FAR`, else `−TRENCH_FAR` … If the current trench has no tracked 'end,' seating at `−TRENCH_FAR` is the faithful mid-run case; document if the end-approach case is deferred."
  - Implementation: RED pins ONLY the mid-run case (terminus at −TRENCH_FAR for all scroll). The `BSVFAR` `BS.ELC`/`BS.EFL` "?END IN VIEW YET?" approach branch is NOT unit-tested.
  - Rationale: there is no tracked trench-end location (a `BS.ELC` analog) in current `GameState` to drive an end-approach test; inventing one exceeds this render-only story. AC2 explicitly permits deferral with documentation.
  - Severity: minor
  - Forward impact: recorded as a non-blocking Delivery Finding — a future story adding a tracked trench end should switch the seat to `min(endDistance, TRENCH_FAR)`.

### Dev (implementation)
- No deviations from spec. `trenchFarEnd` was implemented exactly to TEA's contract and the faithful `BSVFAR` reading: a STATIC ∐ seated at −TRENCH_FAR (the `scroll` param is accepted for signature symmetry but unused, since the mid-run terminus does not recycle — this sits inside the ±RIB_Z latitude TEA already logged, not a new deviation). The 11 render.ts citation re-anchors are mechanical line-number tracking (+4), not a spec change — see the Dev Assessment note.

### Reviewer (audit)
- **Terminus home: separate model in `trench-detail.ts`** → ✓ ACCEPTED by Reviewer: sound — folding a static terminus into `trenchChannel` would break its `trenchChannel(s) === trenchChannel(s+RIB_Z)` recycling invariant and the 30-test 11-6 suite (AC5). A separate `Model3D` mirrors `trenchWallDetail` exactly; verified pure and boundary-clean.
- **One-sided seat latitude `[−TRENCH_FAR, −TRENCH_FAR + RIB_Z]`** → ✓ ACCEPTED by Reviewer: sound and grounded in the higher-authority ROM — `BSVFAR` clamps the far reference to a MAX of `#7000` and never draws past it; a seat beyond −TRENCH_FAR would over-draw the cabinet's own cull and contradict AC1/AC5. The delivered impl seats exactly at −TRENCH_FAR (inside the window).
- **End-approach case deferred (mid-run seat only)** → ✓ ACCEPTED by Reviewer: sound — there is no tracked trench-end (`BS.ELC` analog) in `GameState` to drive it, AC2 explicitly permits deferral with documentation, and it is captured as a non-blocking Delivery Finding. Deferring it keeps this a render-only story.
- **Dev "No deviations from spec"** → ✓ ACCEPTED by Reviewer: confirmed — the implementation matches TEA's contract and the faithful `BSVFAR` reading; the static-seat / unused-`scroll` choice is inside TEA's logged ±RIB_Z latitude, not a new deviation. No undocumented deviations found: the 3-file citation re-anchor is mechanical line-tracking (22 `"line":` bumps, no quoted text changed, 0 lost), not a spec change.

## Sm Assessment

**Story:** sw8-4 — Trench reads long + side guns register (3pt, star-wars, tdd, p2, no deps).
Branch `feat/sw8-4-trench-reads-long` cut off current `develop` (e0fa756, sw8-2 #119). Merge gate clear (no open star-wars PRs).

**Epic frame — RULE BEFORE FIX.** sw8 verifies pixels-and-feel vs the cabinet longplay, not sim-vs-ROM. Many sw8 items are already ROM-authentic and the real culprit is camera/projection/tuning. So this story is a *characterize-then-decide*, not a blind change: first pin what the trench render window/length actually is today, rule the divergence (bug / tuning / accepted-deviation) against the design doc's ROM math, then change only what the ruling demands. Authoritative scope: `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md` (trench section) + `star-wars-longplay.mov`. ACs live in `sprint/context/context-story-sw8-4.md` (10 items).

**Prior-art anchors handed to TEA/Dev (pointers, not orders):**
- "28,672u cutoff" = 0x7000. Prior trench work hit a PORT-CLAMP on render distance — sw7-19 shipped bounded content and split dense grid to sw7-22 because a clamp capped range (~28k stub vs ~327k full). Confirm 28,672u IS that cap and where it sits (render/projection path, `src/shell` vs `src/core`).
- The sw7-6 PANEL_GUN/FORCEFIELD wedge GRID is NOT consumed by gameplay; R6 guns (sw7-20)/force field (sw7-19) landed on legacy TrenchObstacle entities. "Wall-panel density" is the visible wall-panel render — rule which structure feeds the on-screen panels before thickening.
- Trench length "reads ~21s" = render-distance × scroll-speed — verify run-duration EMPIRICALLY (sw7-19 lesson), not by constant inspection alone.
- `state.frame` unused in trench; trench TGPROB (WSBASE) ≠ space TGPROB (WSCPU).

**Verification done:** session + context (163 lines, real ACs) on disk; branch exists off develop; sw8-2's interrupted finish committed + pushed first so the tree was clean and develop current.

**Handoff:** → TEA (Han Solo) for RED. Design failing tests that (1) characterize the current render window/clamp, then (2) pin the extended window + wall-panel density per the design doc. Keep the trench sim deterministic; this should be a render-layer change — hold that boundary in the test design.

---

## Sm Assessment — RE-SCOPED 2026-07-23

**The RED-phase ruling refuted the original premise.** `TRENCH_FAR = 0x7000` is NOT a clamp bug — it is the ROM's own far draw-cull (`WSBASE.MAC` BSVBOT/BSVFAR `CMPD #7000`, also the `WSLAZR CLBLZ` beam clip), cited in 3 audit pair files and already pinned by `swept-port-collision.test.ts:198`. Raising it diverges from the cabinet and reddens citations. See this session's Delivery Findings for the full ruling.

**Re-scoped title/context (do the NEW scope, ignore the stale handoff above):** the "reads short" defect is the **missing ROM far-end terminus frame** (`TBSBF`, "FAR END LINE POINTS" — a ∐ across the far end at the `$7000` draw depth). The cabinet draws it via `BSVFAR`; our `trenchChannel` never does, so the corridor fades instead of terminating → reads short. We ported the far-end NUMBER, skipped the far-end MECHANISM. Corrected ACs (5) are in `sprint/context/context-story-sw8-4.md` — read that, not the pre-re-scope framing.

**RED deliverable:** (AC1) a guard pinning `TRENCH_FAR === 0x7000` (one may already exist — reference it); (AC2) a failing test for a `TBSBF` far-end terminus model — the ∐ vertex/edge pattern at `x=±TRENCH_HALF_W`, floor→wall-top both sides, seated at `−TRENCH_FAR` (mid-run) / true end when within `$7000`; (AC5) existing trench suites stay green. AC3 (reads-deep vs longplay) and AC4 (side-gun/panel legibility, PROVISIONAL constants — tune only if the video shows sparse) are Dev/visual-QA, not unit tests. **Do NOT raise `TRENCH_FAR`.** Pure-core geometry, mirror `trenchWallDetail`; render-layer only.

**Handoff:** → TEA (Han Solo) for RED, on the RE-SCOPED context.

---

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Reason:** AC2 (port the `TBSBF` far-end terminus) is pure, deterministic `src/core` geometry — exactly what RED pins. AC1 is covered by an existing green guard (kept, not duplicated); AC3/AC4 are visual QA (not unit tests) per the re-scoped context.

**Test Files:**
- `tests/core/trench-far-end.test.ts` — 12 failing tests defining the `trenchFarEnd(scroll): Model3D` contract: the `TBSBF` ∐ (down left wall · across floor · up right wall), open at the top, spanning `±TRENCH_HALF_W` × `0→TRENCH_WALL_H`, ±X-symmetric, planar, seated at the far reference `−TRENCH_FAR` and pinned there mid-run across scroll. All constants referenced BY NAME.

**Tests Written:** 12 tests covering AC2 (5 of 5 corrected ACs addressed: AC1 by existing guard, AC2 by this suite, AC3/AC4 visual-QA out of unit scope, AC5 verified green).
**Status:** RED (12 failing on `TypeError: trenchFarEnd is not a function` — the module resolves, the export does not exist yet; per-`it` failures, not a collection abort). Verified by Chewbacca (`testing-runner`, RUN_ID `sw8-4-tea-red`).

### Rule Coverage

| AC / Rule | Test(s) | Status |
|-----------|---------|--------|
| AC1 — pin `TRENCH_FAR === 0x7000` | `swept-port-collision.test.ts:198` (existing, KEPT — not duplicated per context) | green |
| AC2 — `TBSBF` ∐ shape (3 edges: down-left · floor · up-right) | `draws the TBSBF ∐ …` (walls each floor→top, floor spans full width) | failing |
| AC2 — open at top (no lid bar) | `is OPEN at the top — NO lateral "lid" edge …` | failing |
| AC2 — full envelope `±HALF_W × 0→WALL_H`, both walls cornered | `spans the full envelope …` | failing |
| AC2 — ±X mirror symmetry | `is mirror-symmetric across x=0` | failing |
| AC2 — planar (one far depth, per BSVFAR M.X0) | `is PLANAR — the whole cross-section sits at ONE depth` | failing |
| AC2 — seated at `−TRENCH_FAR`, never beyond the $7000 cull | `seats at the far reference …` | failing |
| AC2 — mid-run pinned at far end across scroll (no recycle) | `MID-RUN it stays pinned … as the channel scrolls` | failing |
| Core purity / determinism (repo rule #1) | `is pure & deterministic … (no DOM/time/random leak)` | failing |
| Well-formedness (finite verts, distinct in-range edges) | 3 structural tests | failing |
| TS lang-review #8 (test quality — meaningful assertions) | self-check: 0 vacuous tests | pass |

**Rules checked:** the TS lang-review checklist's runtime/type-safety items (#1–#7, #9–#13) are N/A to a pure integer-geometry generator with no strings, enums, async, user input, `as any`, or React; #8 (test quality) applies and is self-checked. The repo's #1 rule (the `core/`↔`shell` purity boundary) is directly tested via determinism.
**Self-check:** 0 vacuous tests found — every test asserts geometry that would break under a wrong or missing terminus (a closed box fails "open at top"; a recycling terminus fails "mid-run pinned"; a cockpit/mid seat fails the far-reference window).

**Deviations logged:** 3 (terminus home = `trench-detail.ts` separate model; one-sided seat latitude; end-approach case deferred) — see `## Design Deviations` → TEA.

**Handoff:** → Dev (Yoda) for GREEN — implement `trenchFarEnd(scroll): Model3D` in `src/core/trench-detail.ts` (or re-export), a separate pure model mirroring `trenchWallDetail`; the shell strokes it through `drawWireframe` like the other trench models. Do NOT touch `TRENCH_FAR` or `trenchChannel`.

---

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/trench-detail.ts` — new pure `trenchFarEnd(scroll: number): Model3D`. Ports WSBASE.MAC `BSVFAR`/`TBSBF`: a ∐ cross-section (4 vertices, 3 edges — down the left wall, across the floor, up the right wall; OPEN at the top per the open-topped canyon), STATIC at `−TRENCH_FAR`. References `TRENCH_HALF_W`/`TRENCH_WALL_H`/`TRENCH_FAR` by name; a separate `Model3D` mirroring `trenchWallDetail` (does NOT modify `trenchChannel`). `TRENCH_FAR` untouched — the terminus draws AT the ROM cull.
- `src/shell/render.ts` — strokes `trenchFarEnd(state.trenchScrollZ)` in the trench phase, alongside the channel + wall detail (wired to the render front end).
- `docs/audit/findings/pair-{explosions,hud,models}.json` — **11 render.ts citation re-anchors (line numbers only, +4)**, via `tools/audit/reanchor-citations.mjs --write`.

**Tests:** 1805/1805 passing (GREEN) — incl. `trench-far-end.test.ts` 12/12, citations 12/12, and the existing trench suites (trench-channel 30, trench-detail 5, swept-port-collision 13). `npm run build` clean.
**Branch:** `feat/sw8-4-trench-reads-long` (pushed, commit `8c1fefe`; RED tests `7954b3b`).

**Note for Reviewer (Obi-Wan) — the findings-file diff is NOT a fidelity change.** Inserting the 4-line `trenchFarEnd` stroke into `render.ts` shifted 11 UNRELATED citations (HUD/explosion/model findings that cite render.ts rows below the insertion) down by exactly +4. `reanchor-citations.mjs` corrected only their `"line"` numbers — the byte-for-byte quoted `ours` text is unchanged and **no finding was remediated** (no `remediated_by` stamp is warranted). The dry run reported `0 lost`. The trench findings (`pair-trench/surface/guns.json`) that cite `TRENCH_FAR` were NOT touched, because `trench-channel.ts` was not edited — AC1's frozen anchor holds.

**Implementation choice:** the terminus is STATIC (ignores `scroll`) — the most faithful reading of `BSVFAR` (pinned `#7000` ahead mid-run, does not recycle with the ribs) and inside the ±RIB_Z latitude TEA's tests allow. AC3 (reads-deep) and AC4 (side-gun/panel legibility) are visual QA vs `star-wars-longplay.mov` — the terminus is now drawn every trench frame, so it is ready for that comparison.

**Handoff:** → Reviewer (Obi-Wan) for code review.

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1805/1805 tests green, tsc+vite clean, 0 smells, no PR (correct) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — boundary domain covered manually (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — swallowed-error domain covered manually (see [SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test-quality domain covered manually (see [TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — doc domain covered manually (see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type domain covered manually + by rule-checker (see [TYPE]) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — security domain covered manually (see [SEC]) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — complexity domain covered manually (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (15 rules / 19 instances) | N/A — exhaustive rule pass, no violations |

**All received:** Yes (2 enabled returned clean; 7 disabled via `workflow.reviewer_subagents`, domains covered manually)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred (2 LOW verified-good notes below)

## Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + the star-wars core/shell rule. Verified by reviewer-rule-checker (15 rules, 19 instances, 0 violations) and cross-checked manually:

- **#1 Type-safety escapes** — no `as any`/`as unknown`/`@ts-ignore` in the diff. The `left!`/`right!`/`floor!` non-null assertions in the test (`trench-far-end.test.ts`) are each preceded by an `expect(x, msg).toBeDefined()` guard on the same value in the same block — the established suite idiom. COMPLIANT.
- **#2 Generics/interfaces** — `vertices: Vec3[]` / `edges: [number,number][]` locals widen cleanly into `Model3D`'s `readonly` fields, identical to sibling `trenchWallDetail`. COMPLIANT.
- **#3 Enums / #6 React / #7 Async / #9 Build-config / #10–#11 Input-validation/Error-handling** — N/A: no enums, JSX, async, config, user input, or error paths in a pure integer-geometry generator.
- **#4 Null/undefined** — no `?.`/`??`/`||`-on-nullable/`Map.get` introduced. COMPLIANT.
- **#5 Module/declarations** — relative imports are extensionless, matching every existing import in `render.ts` and the test suite (this repo's established convention; the browser build resolves via Vite). `import type { Model3D }` correctly type-only. COMPLIANT.
- **#8 Test quality** — imports from `src/` not `dist/`; no `as any`, no mocks, no `.only`/`.skip`/`debugger`/`console` (grep-confirmed); 12 meaningful assertions. COMPLIANT.
- **#12 Performance/bundle** — direct-module named import, not a barrel. COMPLIANT.
- **#13 Fix regressions** — this is a RED→GREEN feature diff; re-scan clean.
- **Core/shell boundary (star-wars CLAUDE.md, #1 rule)** — `trenchFarEnd` imports only types + `./trench-channel` constants; no `shell/` import, no DOM/window/canvas, no `Date.now()`/`performance.now()`/`Math.random()`/`requestAnimationFrame`; output is fixed literal geometry → deterministic (the suite's own `toEqual` purity test passes). `render.ts`→`core` is the permitted direction. COMPLIANT.

## Reviewer Observations

- `[VERIFIED]` **Core purity & determinism** — `trench-detail.ts:94-108`: pure arithmetic on imported ROM constants; grep found no DOM/time/random/shell import; determinism proven by `trench-far-end.test.ts` `toEqual` test. Complies with the core/shell #1 rule.
- `[VERIFIED]` **TBSBF fidelity** — `trench-detail.ts:97-106`: the 4 vertices map the ROM `TBSBF` table (−400,0)/(−400,−1000)/(400,−1000)/(400,0) into the y=0-floor frame exactly; 3 edges form the ∐ open at top. Matches `WSBASE.MAC` `BSVFAR` verbatim.
- `[VERIFIED]` **Wiring** — `render.ts:496`: `trenchFarEnd(state.trenchScrollZ)` stroked every trench frame with `TRENCH_GLOW`, alongside channel + wall detail. Rendered, not dead code.
- `[VERIFIED]` **AC1 held** — `TRENCH_FAR`/`trench-channel.ts` not in the diff; the pin (`swept-port-collision.test.ts:198`) and the trench/surface/guns citations that reference it are untouched.
- `[VERIFIED]` **AC5 citation integrity** — `docs/audit/findings/*`: 22 `"line":` bumps only (grep-confirmed), no quoted `ours` text changed, `reanchor` dry-run reported 0 lost. Legitimate line-tracking, not laundering; no finding remediated, so no `remediated_by` warranted.
- `[EDGE]` (subagent disabled; covered manually) — boundary check: `scroll` is ignored, so huge/negative/NaN scroll cannot produce degenerate geometry; the terminus is a fixed 4-vertex/3-edge literal for all inputs. No boundary risk.
- `[SILENT]` (disabled; manual) — no error handling exists or is required (pure total function; AC specifies none). No swallowed errors.
- `[TEST]` (disabled; manual) — 12 tests, no vacuous assertions: "open at top" is non-vacuous when paired with "full envelope" (which requires top corners); determinism test catches purity leaks; seat tests use real inequalities. Solid.
- `[DOC]` (disabled; manual) — the new JSDoc and render comment accurately cite `BSVFAR`/`TBSBF`; no stale/misleading comments introduced.
- `[TYPE]` (disabled; manual + [RULE]) — signature `(scroll: number): Model3D` returns the exact interface; `Vec3` literals typed. No stringly-typing.
- `[SEC]` (disabled; manual) — no user input, network, storage, injection surface, or secrets; `scroll` is internal sim state. No security surface.
- `[SIMPLE]` (disabled; manual) — minimal: 4 vertices, 3 edges, no abstraction. `void scroll` is a one-token documented no-op (matches the existing `tie-status.ts` idiom); acceptable, not over-engineering.
- `[RULE]` — reviewer-rule-checker: 15 rules / 19 instances / **0 violations**.
- `[LOW]` **Cosmetic double-draw** at `scroll ≡ 0 (mod RIB_Z)` — the channel's far rib (k=14, z=−TRENCH_FAR) coincides with the terminus, drawing identical lines twice (same glow, additive canvas → negligible, no flicker). Not worth changing; noted for the record.

## Devil's Advocate

Assume this terminus is broken. First attack: the `scroll` parameter is accepted and thrown away (`void scroll`), so the "mid-run pinned across scroll" test proves nothing — a function that ignores its input trivially returns the same thing for every input. Is the terminus therefore glued to the wrong place? No: the trench rails in `trenchChannel` are *also* static in world space over `[0, −TRENCH_FAR]` because sliding a line along its own −Z looks identical; the camera is fixed and the world scrolls past it via `trenchScrollZ`. The terminus is a rail-like cross-section at the far end of that static envelope, so it correctly stays pinned at the far edge of the view — exactly the "vanishing end" the story wants. Ignoring `scroll` is the faithful behavior, not a bug.

Second attack: z-fighting. At `scroll ≡ 0 (mod RIB_Z)` the channel's farthest rib sits at precisely −TRENCH_FAR, on top of the terminus. Two wireframe passes over identical coordinates — could that flicker or double-bright? On an additive glow canvas the lines are identical, so the union is the same stroke; no flicker (both are redrawn every frame in lockstep), and the extra brightness is imperceptible for one instant per RIB_Z of scroll. Cosmetic at worst.

Third attack: does it actually read deep? That is AC3/AC4 — a visual judgment against `star-wars-longplay.mov` — and it is explicitly out of unit scope, flagged for QA. So the code cannot *prove* the perceptual outcome; a confused reviewer might mistake "12 green tests" for "verified reads-deep." I do not: the tests verify geometry, and the eyeball pass remains genuinely open (captured in findings). Fourth: could a future dev think the end-approach case works? The JSDoc and deviations state plainly it is deferred (no `BS.ELC` state). Nothing misleads. No defect survives scrutiny.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `state.trenchScrollZ` (core sim accumulator) → `trenchFarEnd(scroll)` (ignores it; returns fixed −TRENCH_FAR ∐) → `drawWireframe` in the trench phase (`render.ts:496`). Safe because the function is a pure total function over a fixed literal — no input can produce degenerate geometry, NaN, or impurity.
**Pattern observed:** separate pure `Model3D` generator mirroring `trenchWallDetail`, strokable by the shell — `trench-detail.ts:94-108`; correct core/shell boundary (shell→core import only).
**Error handling:** none required or present — pure geometry, no failure modes; verified no swallowed errors.
**Rule compliance `[RULE]`:** lang-review 13 checks + core/shell boundary — 0 violations (reviewer-rule-checker `[RULE]`: 15 rules / 19 instances / 0 violations; cross-checked manually). Domains of the 7 disabled specialists — `[EDGE]` `[SILENT]` `[TEST]` `[DOC]` `[TYPE]` `[SEC]` `[SIMPLE]` — were covered manually (see Reviewer Observations above); all clean.
**Deviations:** 3 TEA deviations audited → all ACCEPTED; Dev "no deviations" confirmed; no undocumented deviations.
**Open (out of scope, flagged):** AC3 (reads-deep) and AC4 (side-gun/panel legibility) are visual QA vs `star-wars-longplay.mov` — the terminus now renders every trench frame and is ready for that eyeball pass.

**Handoff:** To SM (Thrawn) for finish-story.