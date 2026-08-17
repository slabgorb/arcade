---
story_id: "ml12-1"
jira_key: "ml12-1"
epic: "ml12"
workflow: "tdd"
---
# Story ml12-1: Train enters one row too high and runs over the score/HUD (owner playtest; analogous to the centipede train-start-row bug)

## Story Details
- **ID:** ml12-1
- **Jira Key:** ml12-1
- **Epic:** ml12
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Repos:** arcade
- **Branch:** fix/ml12-1-train-enter-row-too-high
- **PR:** https://github.com/slabgorb/arcade/pull/501 (code → develop)

## Story Background

Owner playtest finding (2026-08-17): the millipede train enters ONE ROW TOO HIGH and runs over the score/HUD — the same shape as the analogous centipede train-start-row bug. HYPOTHESIS (unverified, verify against ROM + live code before pinning): the enter row is off by one against the top-of-play boundary the HUD occupies. Likely seam: the train enter/spawn V in core/millipede.ts (ENTER_V and the NEWHD_SPAWN_V family, ~:101-102; the loose-head enter loop uses ENTER_V, ~:202-206) measured against the HUD region (core/hud.ts) and the playfield top. STORY: find the correct top enter row from the millipede ROM (MILLI.MAC / MLSUB.MAC — the analogous centipede fix is a reference, not the source of truth), and correct the enter row so the train's top march sits one row below where it is now, clear of the score. Every changed core constant carries a citations.test.ts-gated claim. Confirm LIVE at /millipede/ that the train no longer overruns the score.

## Acceptance Criteria

- The train's top enter row is corrected so it no longer overlaps/overwrites the score/HUD: pinned by a test that spawns the train and asserts its topmost segment row is at the ROM-correct enter row (one row below the current value), with the value cited to the millipede ROM (not the centipede analogue) and gated by citations.test.ts.
- The corrected enter row does not regress existing millipede movement/turn behaviour: the existing millipede core suite stays green, and the loose-head enter path (fragmented-train reseed) enters at the same corrected boundary.
- Verified LIVE at the /millipede/ visual playtest: the train marches across the top clear of the score, with no full-screen strobe/flash introduced (ml7-4 owner-epilepsy accessibility gate).

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-17T10:44:46Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| red | 2026-08-17T09:58:56Z | 2026-08-17T10:16:30Z | 17m 34s |
| green | 2026-08-17T10:16:30Z | 2026-08-17T10:28:33Z | 12m 3s |
| review | 2026-08-17T10:28:33Z | 2026-08-17T10:44:46Z | 16m 13s |
| finish | 2026-08-17T10:44:46Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict, non-blocking] (TEA, red) The story's prescribed fix location is refuted — the bug is in the RENDER (shell), not core `ENTER_V`.** The story hypothesised an off-by-one in the core enter row, fixed by moving `ENTER_V` "one row down". Grounding against the ROM refutes this: `ENTER_V = 0xF8` (`core/millipede.ts:78`) is byte-cited to `MILLI.MAC:537` (`LDA I,0F8 / EOR CKF8 / STA MOBJV`) and is CORRECT — the ROM lays the whole wave-start train along the top row `v=0xF8` and holds it there. There is no "one row below" ROM value to cite. The real defect: `main.ts:260` blits every non-vacant segment ungated via `px(h,v)=[0xf7-h, 0xf8-v]`, so the wave-start train at `v=0xF8` paints at `y=0` — the reserved HUD score row (`hudPlacements` draws there too, `main.ts:286`). This is the owner's "train runs over the score". The ROM treats a motion object at `MOBJV (EOR CKF8) >= 0xF4` as OFF TOP OF SCREEN (`MILLI.MAC:1865-1872`), and the centipede family already settled the identical bug in **cp7-2** with a RENDER DRAW-GATE (not a sim change, not a vertical offset — an offset would still blit the train onto the score row). Fix scope therefore moves core→shell: a pure `segmentOnScreen(v)` off-top predicate the segment loop consults.
- **[Question, non-blocking] (TEA, red) Exact off-top boundary + descending-segment visibility deferred to Dev-derivation + the mandatory visual playtest.** The load-bearing invariants (enter row `0xF8` gated; a descended field row drawn; `ENTER_V` unchanged) are threshold-independent and pinned. The EXACT boundary pixel — the ROM's `0xF4` (`MILLI.MAC:1872`) vs the field-top `v=0xF0`, and whether a segment mid-descent (dv=2 passes 0xF6/0xF4/0xF2) pokes into the score band — is NOT frozen in RED to avoid false precision; AC3's `/millipede/` visual playtest settles that the score line reads fully clear. Centipede's cp7-2 chose `0xF8` (FLEA_PARK_V); millipede's own ROM off-top is `0xF4` — Dev picks the ROM-cited value and gates it with `citations.test.ts`.
- **[Gap, non-blocking] (Dev, green) The ENEMY roster likely shares this bug — out of scope for ml12-1 (train only), flag for an ml12 follow-up.** `main.ts:263-268` blits spiders/bees/beetles/dragonflies/mosquitoes/earwigs/inchworms ungated, and several enter at the top row (`BEE_SPAWN_V = 0xf8`, `bee.ts:53`; the fly family enters high too). So a bee/fly at wave entry would paint on the score row exactly like the train did. ml12-1's scope, ACs and tests are the TRAIN (`state.segments`) only, so I did NOT gate the enemy loops (minimalist-discipline — no test demands it). `segmentOnScreen` is a general MOBJV predicate and is ready to reuse there; recommend a small follow-up (`ml12-4`?) to gate the enemy loops the same way after a visual check confirms which enemies actually enter in the band.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **(TEA, red) AC1's premise is refuted and the RED tests deviate from it deliberately.** AC1 asks for "the train's top enter row is corrected ... its topmost segment row is at the ROM-correct enter row (one row below the current value), with the value cited to the millipede ROM". That is not implementable as written: the ROM enter row IS `0xF8` (`MILLI.MAC:537`), there is no "one row below" ROM value, and changing the sim value would be a fidelity regression. Per **ROM-always-wins**, the RED suite instead pins the ROM-correct fix — a render off-top **draw-gate** (`segmentOnScreen(v)`, `MILLI.MAC:1872`, the cp7-2 family ruling) — and adds a GUARD test asserting `ENTER_V` stays `0xF8`, which reddens any "move the enter row" fix. AC1's INTENT ("the train no longer overlaps/overwrites the score/HUD") is fully honoured; only its prescribed MECHANISM (mutate a core constant) is replaced. AC2 (no regression; existing suite green) and AC3 (visual playtest, no strobe) stand unchanged. The context file carries a ⚠ correction banner pointing here. Story title still accurately describes the SYMPTOM, so no retitle is required — flagged for the user's awareness in the TEA handoff.

### Dev (implementation)
- **Off-top threshold resolved to `OFFTOP_V = 0xF4` (the millipede ROM's own value), settling TEA's deferred question.**
  - Spec source: context-story-ml12-1.md ⚠ banner + session Delivery Finding (TEA, red) "exact boundary deferred"; AC1 (cite the millipede ROM, not the centipede analogue).
  - Spec text: "Centipede's cp7-2 chose `0xF8` (FLEA_PARK_V); millipede's own ROM off-top is `0xF4` — Dev picks the ROM-cited value and gates it with `citations.test.ts`."
  - What I did: `segmentOnScreen(v) = (v & 0xff) < OFFTOP_V` with `OFFTOP_V = 0xF4`, cited to `MILLI.MAC:1871` (`CMP I,0F4`) → `:1872` (`BCS ;IF OFF TOP OF SCREEN`), claim MT-35 in `09-millipede-train.json` (byte-verified by `citations.test.ts`). Chose the millipede value `0xF4` over centipede's `0xF8` because AC1 mandates the millipede ROM and `0xF4` is strictly cleaner (it also hides a descending head at `0xF6`/`0xF4`, so less of the drop transient pokes into the score band). `ENTER_V` untouched (guard test green).
  - Why not the alternative: the field-top `v=0xF0` has no direct ROM off-top citation; `0xF4` is the ROM's stated off-top boundary and self-verifies.

## Dev Assessment

**Phase outcome:** GREEN complete. `plugins/millipede/tests/train-entry-gate.test.ts` 5/5 pass; full millipede project **1450/1450**; orchestrator **505/505**; `npm run lint` (tsc) clean; `citations.test.ts` green (MT-35 byte-verified against the vendored `MILLI.MAC:1871`).

**What shipped (3 files):**
- `src/core/millipede.ts` — new pure exports `OFFTOP_V = 0xf4` (MT-35, `MILLI.MAC:1871-1872`) and `segmentOnScreen(v)`. No DOM; core/shell boundary intact (`purity`/`core-boundary` scan stays green).
- `src/main.ts` — segment draw loop (`:260`) now gates on `segmentOnScreen(s.v)`; `ENTER_V` untouched.
- `docs/rom-study/claims/09-millipede-train.json` — claim MT-35.

**LIVE visual playtest (AC3) — done, with a control (the ml9 green-tests/wrong-pixels guard):** served this tree at `127.0.0.1:5290` (confirmed cwd), imported the REAL shipped `core/millipede` + `shell/render` modules in-page and reproduced `main.ts`'s exact `drawSprite` on a wave-start train (all 12 at `ENTER_V=0xF8`):
- WITH the shipped gate: **0** opaque pixels on the score row (top 8 rows), and 0 total (whole wave-start train held off).
- WITHOUT the gate (control = old code): **523** train pixels on the score row — the bug, reproduced, so the check is non-vacuous.
- A descended train (`v=0xD0`): **0** score-row pixels but **523** field pixels — the gate is an off-top band, not a blanket hide.
- Gate boundary verified exactly: `segmentOnScreen` false at `0xF8`/`0xF4`, true at `0xF3`/`0xF0`.
- The attract SHOWCASE screen renders correctly (score/labels clear, no garbage); no strobe/flash — the gate is a static draw-gate, no transition (ml7-4 accessibility holds by construction).

**Note for the Reviewer (Zorg):** the enemy roster (`main.ts:263-268`) is ungated and several enemies enter at `v=0xF8` (e.g. `BEE_SPAWN_V`), so they share this bug — deliberately OUT OF SCOPE for ml12-1 (train only; no test demands it). Filed as a Delivery Finding for an ml12 follow-up. `segmentOnScreen` is reusable there.

## Tea Assessment

**Phase outcome:** RED complete. New failing suite `plugins/millipede/tests/train-entry-gate.test.ts` (5 tests: 4 fail feature-absent, 1 guard passes). Full millipede project `4 failed | 1446 passed (1450)` — failures isolated to the new file. `npm run lint` (tsc --noEmit) clean.

**What GREEN (Korben/Dev) must ship:**
1. A pure, exported `segmentOnScreen(v: number): boolean` in `src/core/millipede.ts` — false in the ROM off-top band, true on the visible field. Cite `MILLI.MAC:1865-1872` (`LDA X,MOBJV / EOR CKF8 / CMP I,0F4 / BCS ;IF OFF TOP OF SCREEN`); any new threshold constant gets a `docs/rom-study/claims/*.json` entry gated by `tests/citations.test.ts` (epic guardrail). Keep core pure (no DOM import).
2. `src/main.ts` segment draw loop (`:260`) skips off-top segments (`if (!segmentOnScreen(s.v)) continue`, or a filter) so the entering train is not painted on the HUD score row. Do NOT touch `ENTER_V`.
3. The MANDATORY `/millipede/` visual playtest (AC3): confirm the wave-start train no longer sits on the score row and the score line reads fully clear as the train descends — this is where the exact off-top boundary is validated. No full-screen strobe/flash (ml7-4 accessibility).

**Rule Coverage (millipede is a raster game; core/shell boundary is the load-bearing rule):**
- **core/shell purity** — the new predicate is pure core (a number→bool); the DOM gate stays in `main.ts` (shell). `purity`/`core-boundary` scan stays green (no shell import added to core). Covered by keeping `segmentOnScreen` DOM-free.
- **ROM-citation gate** — the off-top threshold is a new core constant; RED requires it be cited (`MILLI.MAC:1872`) and `citations.test.ts`-gated. Encoded in the loader message + test #4's `MILLI.MAC:537` guard.
- **No-magic-literal / named-constant idiom** (cp7-2 AC-1) — Dev expresses the gate via the named predicate, not a re-inlined `0xf4`/`0xf8`. Noted for Dev (millipede's `main.ts` already carries `0xf8` in `px()`, so RED does not assert literal-absence; the predicate carries the naming).
- **Accessibility (ml7-4, owner-epilepsy)** — a static draw-gate introduces no transition/flash; steady-by-construction. Verified at the visual playtest (AC3).
- **Test non-vacuity** — every test has a meaningful assertion; the guard test (`ENTER_V===0xF8`) passes today by design (it documents the refutation and reddens a wrong fix), not vacuously.

**Handoff note for the user (via SM):** the story's filed fix location (core `ENTER_V`) was refuted by the ROM; the fix moved core→shell (render draw-gate, cp7-2 precedent). No backlog-shape change needed — the title still describes the symptom, ACs' intent is preserved. See Delivery Findings + Design Deviations above.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (millipede 1450/1450, orchestrator 505/505, tsc clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — hand-covered: segmentOnScreen boundary + NaN case (unreachable, sim-only input) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — hand-covered: pure predicate, no error paths, no swallowed errors |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered: found OFFTOP_V value unpinned → HARDENED (pinned + boundary) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — hand-covered + rule-checker overlap: stale main.ts:286 cite → FIXED to :291 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — hand-covered: clean number→bool signature, no casts/any/non-null |
| 7 | reviewer-security | Yes | clean | none (no auth/net/secrets; NaN note informational, unreachable) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — hand-covered: minimal diff; `& 0xff` is defensive byte-mask, acceptable |
| 9 | reviewer-rule-checker | Yes | findings | 4 (all in the test file; 0 in production src/core or src/main logic) | confirmed 3 (all FIXED), dismissed 1 (established convention) |

**All received:** Yes (3 enabled returned — preflight, security, rule-checker; 6 disabled via `workflow.reviewer_subagents`, each hand-covered)
**Total findings:** 3 confirmed (all fixed this round), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict: APPROVED.** No Critical or High. The fix is behaviourally correct, ROM-faithful, purity-preserving, citation-verified, and visually playtested with pixel proof. Three Medium/Low test-apparatus findings were fixed this round (mutation-verified); one Low was dismissed with rationale.

### What the change does (traced end-to-end)
The owner-observed bug ("train runs over the score") is a RENDER defect, not the sim bug the story hypothesised. `main.ts`'s in-game segment loop blitted every non-vacant segment ungated; at wave start all 12 segments sit at `ENTER_V=0xF8` → `px()` maps them to `y=0`, the reserved HUD score row. The fix adds a pure `segmentOnScreen(v)` off-top predicate (`OFFTOP_V=0xF4`, the ROM's own off-top boundary) and gates the segment loop on it. Data flow: `state.segments[i].v` (sim-constructed ROM byte) → `segmentOnScreen(s.v)` → skip-if-off-top → `drawSprite`. `ENTER_V` is untouched.

### Observations (tagged by source)
- [PRE] Preflight clean — millipede 1450/1450, orchestrator 505/505, `tsc --noEmit` clean, 0 code smells. Confirms no regression.
- [SEC] Security clean — no auth/network/secrets/injection surface; core/shell purity preserved; `segmentOnScreen(s.v)` is fed only sim-internal integers, never external input.
- [RULE] rule-checker: 47 rules / 61 instances / 4 violations, ALL in `tests/train-entry-gate.test.ts`, ZERO in `src/core` or `src/main` logic. All ROM-citation, core/shell, trailing-comment and no-magic-number additional rules independently verified (byte-diff of MT-35 vs `MILLI.MAC:1871`, purity scanner run, citation suite run).
- [RULE][TEST] MEDIUM — WIRING test was a whole-file token match `/segmentOnScreen\(/` (rule-checker TS#15/#25), mutation-proven weak (gate removed + unrelated call elsewhere stayed green). FIXED: scoped the regex to the `state.segments` draw loop + `s.v` argument; mutation-verified it now reddens when the gate is removed.
- [TEST] MEDIUM — `OFFTOP_V=0xF4` value was not pinned by any assertion (my own finding; test-analyzer disabled); a mutant `0xF0`/`0xF8` passed all 5 tests. FIXED: added `expect(OFFTOP_V).toBe(0xf4)` + exact-boundary asserts (`0xF4` off, `0xF3` on); mutation-verified `OFFTOP_V=0xf0` now reddens.
- [DOC] LOW — test docblock cited `main.ts:286` for the HUD draw; my GREEN commit shifted it to `:291` (rule-checker TS#17/#20, stale-within-same-diff). FIXED: re-anchored to `:291`.
- [SIMPLE] LOW — DISMISSED: `stripComments()` is a hand-rolled regex comment-stripper (rule-checker TS#18). Rationale: it is the established cross-file convention used by the ml7-2 / hud-render wiring tests verbatim; no failure was found against current `main.ts`; changing it here would diverge this one test from its siblings. Filed conceptually for a fleet-wide follow-up, not an ml12-1 defect.
- [VERIFIED] Core purity — `segmentOnScreen` is a number→bool with no DOM/shell import; `plugins/millipede/tests/purity.test.ts` (AST scanner over `src/core/`) passes. Evidence: `core/millipede.ts` imports only `@shared/rng`, `./mushroom`, `./conway` (all core-legal); the DOM call site is in `main.ts` (shell).
- [VERIFIED] ROM citation — `OFFTOP_V=0xf4` carries claim MT-35, `source.verbatim` byte-matches `MILLI.MAC:1871` (`\tCMP I,0F4`); `citations.test.ts` green. Complies with the epic's ROM-citation gate.
- [VERIFIED] `ENTER_V` unchanged at `0xF8` — `core/millipede.ts:78` untouched, byte-faithful to `MILLI.MAC:537`; guarded by its own test. The story's refuted "move the enter row" fix cannot be reintroduced without reddening.
- [VERIFIED] Live pixel playtest (AC3) — the shipped modules gate the wave-start train to 0 score-row pixels (523 without the gate); descended train still draws. Static draw-gate → no strobe (ml7-4 accessibility).

### Rule Compliance
- **core/shell boundary** (every applicable symbol): `OFFTOP_V` (const, pure), `segmentOnScreen` (fn, pure) — both compliant; the only shell touch is the `main.ts` call site. No core symbol crosses the line. ✓
- **ROM-citation gate** (every new/changed core constant): `OFFTOP_V` → MT-35, byte-verified. ✓ (`segmentOnScreen` is a function, not a transcribed constant — no claim required; it composes `OFFTOP_V`.)
- **Trailing MT-xx comment** (every new constant): `OFFTOP_V` has `// MT-35 (MILLI.MAC:1871 ...)`. ✓
- **No magic numbers**: gate expressed via named `OFFTOP_V`, not a re-inlined `0xf4`, in both the predicate body and the call site. ✓
- **Accessibility (ml7-4)**: static draw-gate, no transition/flash. ✓
- **Test non-vacuity**: all 7 assertions now trace to real imported values; boundary + wiring mutation-verified. ✓

### Design Deviation Audit
- **(TEA, red) AC1's premise refuted; RED pins a render draw-gate + ENTER_V guard** → ✓ ACCEPTED by Reviewer: ROM-grounded and correct (MILLI.MAC:537 makes ENTER_V faithful; cp7-2 is the settled family ruling). AC1's intent preserved; mechanism replaced. Sound.
- **(Dev, implementation) OFFTOP_V=0xF4 (millipede ROM value) over centipede's 0xF8** → ✓ ACCEPTED by Reviewer: AC1 mandates the millipede ROM; `0xF4` byte-verifies to MILLI.MAC:1871 and is strictly cleaner on the descent transient. Now pinned by test (was the one soft spot; hardened this round).

### Devil's Advocate
Suppose this code is broken. First attack: the gate is cosmetic — it hides the train but the sim still marches it across the score row, so collision/scoring against a "hidden" segment on the HUD row would be invisible-but-live. Rebuttal: the change is render-only by construction; `ENTER_V` and all sim reducers are untouched (guard test + 1450 green sim tests), and the ROM itself treats `MOBJV>=0xF4` as off-the-field for its own collision sweep (MILLI.MAC:1869-1872), so hidden-and-inert is exactly ROM behaviour, not a divergence. Second attack: `(v & 0xff)` silently swallows a malformed `v` — `NaN & 0xff = 0` reads as on-screen, so a corrupted segment would paint at the bottom. Rebuttal: `Segment.v` is sim-constructed as a byte; no external/measured quantity reaches it (security + rule-checker #21 both concur), so the degenerate input is unreachable — and if it ever occurred, painting a corrupt segment is a strictly smaller failure than the original bug. Third attack: the descent transient — a head mid-drop passes `0xF6/0xF4/0xF2` at `dv=2`; with the `>=0xF4` gate a head at `0xF3/0xF2` (y=5/6) still pokes into the score band for a frame or two. Rebuttal: this is ROM-faithful (the ROM's own off-top is `0xF4`, and the HUD draws last so digits stay legible), it is strictly less than centipede's shipped `0xF8` transient, and the live playtest confirmed the sustained wave-start hold — the visible defect the owner reported — is gone. Fourth attack: the wiring test could rot if `main.ts` reformats the loop across lines. Rebuttal: the scoped regex normalises whitespace first (`replace(/\s+/g,' ')`) and was mutation-verified. Fifth: the enemy roster (bees/flies enter at `0xF8`) still paints on the score row. This is real — but it is a filed, out-of-scope Delivery Finding, not an ml12-1 regression (the train story ships correct). No attack survives; the residuals are ROM-faithful or filed follow-ups.

### Follow-ups filed (non-blocking, for the epic)
- Dev's Delivery Finding: gate the enemy roster (`main.ts:263-268`) — bees/flies enter at `v=0xF8` and share this bug. Recommend `ml12-4`. `segmentOnScreen` is reusable.
- Fleet-wide: the `stripComments` hand-rolled stripper is shared across wiring tests — a parser-based helper would retire the whole class (rule-checker TS#18). Out of scope here.