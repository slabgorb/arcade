---
story_id: "tp1-19"
jira_key: "tp1-19"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-19: SHAPES — the TEMPEST logo's own stair-stepped alphabet and the 22-dot star pictures

## Story Details
- **ID:** tp1-19
- **Jira Key:** tp1-19
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T11:39:28Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T10:02:20+00:00 | 2026-07-16T10:05:19Z | 2m 59s |
| red | 2026-07-16T10:05:19Z | 2026-07-16T10:18:32Z | 13m 13s |
| green | 2026-07-16T10:18:32Z | 2026-07-16T10:37:40Z | 19m 8s |
| review | 2026-07-16T10:37:40Z | 2026-07-16T11:03:49Z | 26m 9s |
| green | 2026-07-16T11:03:49Z | 2026-07-16T11:16:11Z | 12m 22s |
| review | 2026-07-16T11:16:11Z | 2026-07-16T11:19:53Z | 3m 42s |
| green | 2026-07-16T11:19:53Z | 2026-07-16T11:27:44Z | 7m 51s |
| review | 2026-07-16T11:27:44Z | 2026-07-16T11:39:28Z | 11m 44s |
| finish | 2026-07-16T11:39:28Z | - | - |

## Delivery Findings

**Conflict:** Epic YAML `description` field incorrectly lists subsumes as "V-014, V-015, V-022, DA-006 (shape half)". Verified against docs/audit/findings/*.json:
- V-014 (fuseball FUSE0-3) is already remediated by tp1-17 (confirmed in code: src/core/glyphs.ts has authored FUSE_FRAMES from ALVROM.MAC:954-1095). OUT OF SCOPE.
- DA-006 (enemy-kill burst brightness ramp) is already remediated by tp1-3 (confirmed: src/shell/fx.ts:261 reads `frame < 1 ? ENEMY_DIM : ENEMY_BRIGHT`). OUT OF SCOPE. Note: DA-006 has no "shape half" — the finding is purely CB=07/CB=0E intensity off-by-one; the YAML's "(shape half)" is a fabrication.
- V-017 (TEMLIT logo alphabet) is this story's actual subject but was NOT in the subsumes list. Verified per tp1-18-session.md lines 38-39, 57-63: tp1-18's TEA carved V-017 out and wrote "If tp1-19 does NOT already cover V-017, it must be re-filed there". IN SCOPE.

**Verified scope — tp1-19 covers exactly three live findings**, matching the story's four ACs:
1. **V-017** — TEMLIT (ALVROM.MAC 1297-1351, CM=1 CD=1 CB=6): SEVEN dedicated logo-letter routines with authored geometry (e.g. a BACK-SLANTED E). Layout is NOT a straight baseline: after CNTR it moves (-1B0,100), draws T, +60 E, +24 M, +34 P, then JUMPS (0F8,48) up-and-right, draws E, +16,+28 S, then +60,-60 T — so "TEMP" sits low-left and "EST" stair-steps up and right. Ours renders "TEMPEST" through the ordinary message font (render.ts ~679 -> vecText -> layoutText) on one horizontal baseline. Verified NOT to be the ANVGAN message font (cross-checked CHAR.E/CHAR.T — structurally unrelated).

2. **V-015** — MSTAR1-MSTAR4 (ALVROM.MAC 405-515, CM=4 CD=1): four macros of SCDOTs at authored absolute coords. MSTAR1 has 22 dots; MSTAR2/3/4 have 20 each. Ours reuses four 5-dot pictures of hand-picked unit vectors scattered radially from screen centre (render.ts ~133-138). Colour is right for waves 1-4 (BLUE, ALDISP.MAC 2952) but from wave 5 the ROM varies star colour per plane (ALDISP.MAC 2949-2960), which we never do.

3. **V-022** — FUSEX1/2/3 (ALVROM.MAC 1096-1114) are NOT explosions: each sets CSTAT WHITE, SCAL 1,20, backs up VCTR -36.,0,0, then JSRLs digit glyphs — FUSEX1='750', FUSEX2='500', FUSEX3='250'. They are floating score numbers blooming where a fuseball dies (PITAB FUSEX1,PTFUSX, ALVROM.MAC 2148). We render no floating score text anywhere. NOTE: V-022 is the only one of the three with no [REFUTATION] re-verification pass in its reasoning — flag to TEA to verify the FUSEX line range and digit values against ALVROM.MAC directly in RED.

**Hard constraint from AC-3:** LOGO_PASSES must NOT be reintroduced in any form. The book's LOGO_PASSES=19 does not exist in the ROM at all (one of the nine things the book got wrong, §7).

---

### TEA (RED) — findings against the audit itself

The SM flagged V-022 as the only one of the three never re-verified. Verifying it turned up
nothing wrong with V-022 — but verifying the other two, which *had* [REFUTATION] passes, turned
up three errors. All are byte-verified against `~/Projects/tempest-source-text/ALVROM.MAC`
(`.RADIX 16` in force from line 268 through 1956, so every literal below is hex).

- **Correction (V-017, layout) — the audit's claim is REFUTED. This one would have shipped a new
  bug.** V-017 says the logo layout "is NOT a straight baseline" and that "'TEMP' sits low-left
  and 'EST' climbs up and right in a stair-step". It does not. The finding's [REFUTATION] reaches
  this conclusion *explicitly* — "the explicit inter-letter jump before the second E (0F8,48 …)
  is unambiguously up-and-right … so the 'stair-step, not a straight baseline' claim is real" —
  but it reads the advance opcodes without walking the letter subroutines, which move the pen
  themselves (E ends 128 **below** its origin, P 56 above, T 128 above). Traced properly, all
  seven letters span **exactly y=256..384** — one baseline, one cap height:
  `T(-432,256) E(-256,384) M(-208,256) P(-28,256) E(204,384) S(238,296) T(454,256)`, every one
  256..384. The odd-looking `VCTR 0F8,48` and `VCTR 16,28` advances are *compensating* for each
  letter's net displacement to hold the baseline, not staggering the word. The "stair-stepped
  alphabet" of the story title is the **letterforms** (the back-slanted E: arms step left by a
  constant −20 per −64 of descent, lengths growing 80→112→132), NOT the layout. **A port built
  to the finding's text would introduce a divergence that does not exist in the ROM** — the test
  `[CORRECTION 2] all seven letters sit on ONE straight baseline` pins the real geometry.
  Affects `docs/audit/findings/pair-2-alvrom-shapes-font.json` (V-017 claim + reasoning).
  The reasoning does get one step closer than the claim — it notes the final `60,-60` jump "drops
  back down", so the climb is "not a monotonic ascent" — but it is still describing the PEN PATH
  (which genuinely rises and falls) rather than the LETTER PLACEMENTS (which do not move off the
  baseline at all). Confirmed visually in GREEN: the rendered logo reads TEMPEST on one baseline.

- **Correction (V-017, count) — NOT ours; the audit already caught it.** V-017's *claim* says
  TEMLIT "has SEVEN dedicated logo-letter routines"; it has **FIVE** (T:1318, E:1322, M:1329,
  P:1338, S:1344) called seven times, since "TEMPEST" reuses E and T. **Correction by Dev
  (GREEN):** TEA filed this as a new finding. It is not — V-017's own reasoning already carries a
  `[CORRECTION]` reading "'seven routines' should read 'five routines called seven times'". TEA
  truncated the reasoning at 1000 characters while triaging and never saw the tail. The claim
  text was simply never updated to match its own correction, so the discrepancy is real and worth
  restating — but the credit belongs to the audit. *Lesson: read the WHOLE `reasoning` field; the
  [REFUTATION]/[CORRECTION] blocks live at the end.*

- **Correction (V-015, dot counts):** the [REFUTATION] gloss "MSTAR2/3/4 also verified at 20
  SCDOTs each" is wrong — **MSTAR3 has 21** (ALVROM.MAC:459-479, counted directly). Real counts
  are **22 / 20 / 21 / 20**. The finding's *original* "20-22 SCDOTs each" range was accurate; the
  refutation narrowed it incorrectly. AC-2's "the ROM's 22 dots" therefore names **MSTAR1
  specifically** — a port must not force all four to 22. This also propagated into the SM's
  handoff ("MSTAR2/3/4 have 20 each"). Affects `pair-2-alvrom-shapes-font.json` (V-015 reasoning).

- **Confirmed (V-022) — no defect found in the finding.** FUSEX1/2/3 verified at
  ALVROM.MAC:1096-1114: `CSTAT WHITE`, `SCAL 1,20`, `VCTR -36.,0,0`, digit glyphs, wired by
  `PITAB FUSEX1,PTFUSX` (2148-2150). Rendered values **750 / 500 / 250** are correct. One nuance,
  immaterial to behaviour: the ROM shares tails via labels (`FUSEX1`→`CHAR.7`→`JMPL FIFTY`;
  `FUSEX3`→`CHAR.2`→falls through to `FIFTY: JSRL CHAR.5 / ZERO: JMPL CHAR.0`) rather than the
  three independent triplets the claim describes. Output identical. Also note `VCTR -36.,0,0` is
  **decimal 36** — the trailing `.` overrides `.RADIX 16`.

- **Conflict (scope, non-blocking):** **V-022 has no acceptance criterion.** The four ACs cover
  V-017 (AC-1), V-015 (AC-2), LOGO_PASSES (AC-3) and the citation gate (AC-4) — nothing covers
  the fuseball score pop-up, even though it is in the subsumes list and tp1-18 explicitly carved
  "score pop-ups" here. Covered in RED as `V-022` rather than dropped. Affects
  `sprint/epic-tp1.yaml` (tp1-19 acceptance_criteria).

- **Ruling (AC-3) — LOGO_PASSES must STAY.** AC-3's "not reintroduced" reads like "delete it";
  that reading is wrong and would fail AC-4. **B-021** (`pair-8-book-reconciliation.json`) is
  `recommendation: wont_fix`, `remediated_by: None`, and its `ours` citation points at the live
  `src/shell/titleLogo.ts:23` — the citation gate re-opens that line every run. Deleting the
  constant turns `npm test -- citations` RED and tempts a phantom `remediated_by` on a finding
  nobody fixed. The constant is already honestly labelled "the book's ~19" and claims no ROM
  authority, so the status quo already satisfies AC-3. Pinned by three tests under `AC-3`.

- **Conflict (cross-test, blocking for Dev):** `tests/shell/render.title-rainbow.test.ts:51`
  asserts `attractSrc` matches `/['"]TEMPEST['"]/` — "still draws the word TEMPEST". Once the
  logo becomes a glyph, that literal leaves `drawAttract` and **this existing test will fail**.
  It was a Story 10-6 proxy for "the logo is present"; the correct proxy is now "drawAttract
  draws `logoGlyph()`". Dev must update that assertion — it is not a regression. The rainbow
  wiring (`titleLogoPasses`, `.depth/.scale/.color`) must stay green: the rainbow stacks the
  *picture*, and the ROM agrees — `VORLIT::` (ALVROM.MAC:1301) is the very label above `TEMLIT:`.

- **Note (path, minor):** the story context and the Delivery Findings above say
  `src/core/glyphs.ts`; the file is **`src/shell/glyphs.ts`** (there is no `src/core/glyphs.ts`).
  The SHAPES cluster is shell-only by the Hard Architectural Boundary. tp1-17's fix is real and
  is in the shell file.

---

### Reviewer (REVIEW) — upstream findings

- **Gap** (blocking): The "ROM oracle" test pattern inherited from tp1-17/tp1-18 produces
  **tautological tests**. A test file transcribes the ROM into local constants, then asserts
  against those constants — while the implementation's own tables stay module-private. The suite
  looks rigorous (invariance helpers, citations, oracle self-checks) and has near-zero power: the
  full 1540-test suite passes with V-017's defect reinstated. Affects
  `tests/shell/tp1-19.shapes.test.ts` (fix here), and worth auditing in
  `tests/shell/tp1-18.shapes.test.ts` / `tp1-17.shapes.test.ts`, which share the pattern and may
  have the same blind spot. The cure is cheap: assert against the **function's output**, or export
  the table and compare directly. *Found by Reviewer during code review.*

- **Improvement** (non-blocking): TEA's assessment cited "12 tests pass already, by design … that
  is what makes the corrections trustworthy". Inverted: those tests pass **because they never touch
  the implementation**. A test passing in RED is a red flag to investigate, not evidence of
  rigour — the only thing it establishes is internal consistency of the transcription. Worth
  carrying into the TEA agent's guidance for the remaining `tp1` SHAPES stories. *Found by Reviewer
  during code review.*

- **Improvement** (non-blocking): `npm run lint` in tempest is a **no-op echo**
  (`echo "no linting configured (using tsc --noEmit in build)"`) and exits 0 regardless. Any agent
  or gate treating it as a typecheck gets a false green — the real check is inside `npm run build`.
  Affects `tempest/package.json` (either alias `lint` to `tsc --noEmit` or remove it so the
  no-op cannot be mistaken for a gate). *Found by Reviewer during code review.*

- **Question** (non-blocking): V-022 shipped with no acceptance criterion, on the strength of the
  subsumes list plus tp1-18's carve-out. Dev then extended past the tests (wiring the pop-up) to
  avoid dead code — correctly, in my view, but that judgment call was load-bearing and invisible to
  the ACs. Affects `sprint/epic-tp1.yaml` (tp1-19 acceptance_criteria should have gained a fifth AC
  at setup). *Found by Reviewer during code review.*

- **Improvement** (non-blocking, round 2): A point-set comparison is the natural fix for a
  tautological geometry test, and it is what tp1-19 adopted — but it is **blind to stroke
  connectivity**, because sorting the points discards it. For a VECTOR port that is a real blind
  spot: beam-on vs beam-off is the whole semantic of the source data, and a merged-polyline glyph
  keeps every vertex while drawing lines that should not exist. Any story porting `VCTR`/`SCVEC`
  chains should pin the stroke SPLIT alongside the vertices (`sparkGlyph` and `starPictureGlyph`
  already do, via `points.length === 1`). Worth carrying into the remaining SHAPES stories and the
  tp1-17/tp1-18 audit already filed above. *Found by Reviewer during code review.*

### Dev (implementation)

- No upstream findings. (Round 3: the reviewer's stroke-split fix applied verbatim; both escape
  mutations M7/M8 re-run and killed; no source change, no citation impact.)

### Reviewer (code review — round 3)

- **Improvement** (non-blocking): The point-multiset + stroke-split + letter-window pin still
  cannot see vertex ORDER inside a run — permuting interior points of M's chain (M9) passes all
  32 tests while garbling the letterform. The one-assertion cure that subsumes count, bridging
  AND order is to compare the SEGMENT multiset (each stroke's consecutive point pairs, canonical
  endpoints) between glyph and oracle; run-direction reversal stays legitimately free. Affects
  `tempest/tests/shell/tp1-19.shapes.test.ts` (upgrade opportunity) and is the recommended
  pattern for the REMAINING SHAPES stories and the already-filed tp1-17/tp1-18 suite audit —
  pin edges, not points, for any `VCTR`/`SCVEC` chain port.
  *Found by Reviewer during code review.*

## Design Deviations

### Dev (implementation)
- No deviations from spec. (Round 3 is a single test added to `tests/shell/tp1-19.shapes.test.ts`,
  implementing the Reviewer's round-2 fix exactly as specified: pin the 11-stroke beam-off split
  and assert no stroke bridges two letters. No source files changed.)
  → ✓ ACCEPTED by Reviewer: verified — `git diff 19248ef..d8c9230 --stat` is 41 test-only lines;
  the pin matches the round-2 fix specification verbatim and the split was independently
  re-derived from ALVROM.MAC:1301-1351.

### Reviewer (audit)
- No undocumented deviations found in the round-3 delta. One incidental strengthening worth
  naming (not a deviation): the split pin also kills M8 (beam-off drawn lit), which round 2
  called benign — intended, since the requested convention (pin stroke structure like the star
  dots) necessarily encodes it.

## Sm Assessment

**Setup complete. Routing to O'Brien (TEA) for RED.**

Story is well-formed and ready: the four ACs are correct and precisely describe the
work. Branch `feat/tp1-19-logo-alphabet-star-pictures` is cut from current
`origin/develop` (5e76c98, tp1-16). No open PRs on tempest and nothing for tp1-19 on
origin/develop — checked for a sibling-checkout race before setup; none found.

**Scope was corrected at setup — this is the one thing TEA must not skip.** The epic
YAML's subsumes list ("V-014, V-015, V-022, DA-006 (shape half)") is wrong in three
ways. I verified every entry against `docs/audit/findings/*.json` *and* the working
tree rather than trusting the labels:

- **V-014 → OUT.** `remediated_by: tp1-17`, and the fix is real — `glyphs.ts` has the
  authored five-colour `FUSE_FRAMES` from ALVROM.MAC:954-1095. Not a phantom.
- **DA-006 → OUT.** `remediated_by: tp1-3`, fix is real — `fx.ts:261` reads
  `frame < 1`. Its "(shape half)" does not exist: the finding is purely the
  CB=07/CB=0E intensity off-by-one. Nothing to carve.
- **V-017 → IN.** Absent from the list, yet it is the story's headline subject.
  tp1-18's TEA carved it out and wrote "If tp1-19 does NOT already cover V-017, it
  must be re-filed there." This story is where it lands.

Net: tp1-19 is **V-017 + V-015 + V-022** — three live findings, one per AC-1/2/3.
Full detail with ROM citations is in Delivery Findings above and in
`sprint/context/context-story-tp1-19.md`.

**Two traps carried forward for TEA:**
1. **V-022 has no [REFUTATION] pass** — it is the only one of the three never
   re-verified. Verify the FUSEX1/2/3 line range (ALVROM.MAC 1096-1114) and the
   750/500/250 digit values against the source directly in RED.
2. **AC-2 says "the ROM's 22 dots"; only MSTAR1 has 22** — MSTAR2/3/4 have 20 each.
   Do not force all four to 22.

**Housekeeping:** the epic YAML `description:` still carries the bad subsumes list.
Filed as a non-blocking Conflict (Delivery Findings) rather than hand-edited
mid-flight, per tp1-18's precedent. The ACs are right, so the story needs no
re-scoping — only the prose field is stale.

## TEA Assessment

**Tests Required:** Yes
**Test Files:**
- `tests/shell/tp1-19.shapes.test.ts` — the TEMLIT logo alphabet (V-017), the MSTAR star
  pictures (V-015), the FUSEX score pop-up (V-022), the LOGO_PASSES guard (AC-3), plus
  already-remediated guards for V-014/DA-006 and the rule-coverage block.

**Tests Written:** 28 tests covering 4 ACs + V-022 (which has no AC — see Delivery Findings)
**Status:** RED (16 failing, ready for Dev) — verified by `testing-runner`, RUN_ID `tp1-19-tea-red`

**The RED is import-RED, for the right reason.** All 16 failures are
`TypeError: <fn> is not a function` against the four exports Dev must add to
`src/shell/glyphs.ts` — not typos or bad paths. The other **12 tests pass already, by design**:
they are the transcribed ROM oracle's self-checks, which validate my transcription independently
of any implementation. That is what makes the two corrections below trustworthy rather than
assertions — e.g. the `[CORRECTION 2]` baseline check runs its oracle half (every letter spanning
256..384) and passes *before* it ever reaches `logoGlyph()`.

**Citation gate (AC-4):** GREEN before implementation (25/25, 4 files).

### The contract Dev must implement

Four new exports in `src/shell/glyphs.ts` (**shell**, not core — the context file's
`src/core/glyphs.ts` path is wrong):

| Export | Finding | Contract |
|--------|---------|----------|
| `logoGlyph(): Glyph` | V-017 | TEMLIT's own alphabet: 5 letterforms (T/E/M/P/S), 7 placements, ONE baseline |
| `starPictureGlyph(picture: number): Glyph` | V-015 | MSTAR1-4, **22/20/21/20** single-point dots |
| `fuseScoreGlyph(tier: number): Glyph` | V-022 | FUSEX 750/500/250, all-white, digits from the SHARED font |
| `FUSE_SCORE_TIERS: readonly number[]` | V-022 | `[750, 500, 250]` |

Wiring: `drawAttract` draws `logoGlyph()`; the starfield strokes `starPictureGlyph()` and
`STAR_PICTURE_DOTS` goes away. Tests are scale- and Y-flip-invariant, so Dev may pick either Y
convention and any uniform scale — the tp1-17/tp1-18 convention.

### What Dev must NOT do (each is pinned by a test)

1. **Do not stagger the logo.** V-017's text says "EST climbs up and right"; the ROM says
   otherwise. Build to the tests, not the finding. (See Delivery Findings.)
2. **Do not delete `LOGO_PASSES`.** B-021 is `wont_fix` and its citation is live; deleting it
   fails AC-4 and invites a phantom `remediated_by`.
3. **Do not force all four star pictures to 22 dots.** MSTAR3 is 21.
4. **Do not touch the fuseball shape (V-014) or the burst brightness (DA-006).** Already
   remediated by tp1-17/tp1-3; guarded.
5. **Do not invent a second digit alphabet.** FUSEX reuses the shared message font (`CHAR.n`);
   only the *logo* has a bespoke alphabet. That contrast is the ROM's design.

**Known follow-ups for Dev:**
- `tests/shell/render.title-rainbow.test.ts:51` **will fail** and must be updated (see the
  cross-test Conflict). Expected, not a regression.
- Touching a cited file? Run `node tools/audit/reanchor-citations.mjs --write` before committing
  (tempest CLAUDE.md rule 2) — a comment-only edit is enough to shift a pinned line.
- V-022's three tiers pair with **tp1-21** (the fuseball's score tier is a weighted random roll).
  tp1-19 owns the *picture*; tp1-21 owns the *roll*. Do not implement the roll here.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| tempest Hard Architectural Boundary | `glyphs.ts stays SHELL-only: never imports the sim/state/rules/rng/enemies core` | passing (guard) |
| tempest core purity (no ambient time/random) | `glyph geometry is pure: no Math.random / Date / performance time` | passing (guard) |
| TS #1 type-safety escapes | `uses no 'as any' / '@ts-ignore' type-safety escapes` | passing (guard) |
| TS #2 missing `readonly` on data | `the new logo/star/score vertex tables are readonly const data` | passing (guard) |
| TS #4 out-of-range index → silent fallback | `starPictureGlyph covers exactly the four ROM pictures (no 5th, no wrap-around lie)` | failing |
| TS #8 test quality (no vacuous assertions) | Phase-C self-check, below | n/a |
| Determinism (frame-exact, no flicker) | `all three new glyphs are deterministic across repeated calls` | failing |

**Rules checked:** 7 of 7 applicable lang-review rules have coverage. (#3 enums, #5 modules,
#6 React/JSX, #7 async, #9 build config, #10 input validation, #11 error handling and #12
bundle concerns do not apply — this story adds pure const vertex tables and synchronous
value-producing functions to an existing shell module, with no enums, no I/O, no async and no
user input.)

**Self-check (Phase C):** 0 vacuous tests. Every test carries a meaningful assertion; no
`let _ =`, no `assert(true)`, no `is_none()`-on-always-none. The 12 currently-passing tests are
deliberate oracle self-checks and source-text guards, not vacuous filler — each would fail if my
ROM transcription drifted or a guarded regression landed. Two guards worth calling out as
intentionally weak: `DA-006` is a presence-only guard (the real pin lives in tp1-3's suite), and
the `is NOT the message font` test asserts structural difference rather than a byte comparison,
because the logo is a whole word and `charGlyph` is a single cell.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Status:** GREEN — 1540/1540 tests, `npm run build` (tsc --noEmit + vite) clean, citation gate
25/25. Branch `feat/tp1-19-logo-alphabet-star-pictures` pushed (`5dc66bd`). No PR (SM's job).

**Implemented** — four new exports in `src/shell/glyphs.ts` (section `I3.`, following tp1-18's
`I2.`), all `.RADIX 16`, Y negated into canvas space exactly as `LIFE1` does:

| Export | Finding | What it does |
|--------|---------|--------------|
| `logoGlyph()` | V-017 | TEMLIT walked once; lit runs split at each beam-off; normalised to cap height 1 |
| `starPictureGlyph(picture)` | V-015 | MSTAR1-4 as single-point SCDOTs, 22/20/21/20, one shared scale |
| `fuseScoreGlyph(tier)` | V-022 | FUSEX digits from the shared font, white, centred by the ROM's `-36.` |
| `FUSE_SCORE_TIERS` | V-022 | `[750, 500, 250]` |

Wiring: `drawAttract` builds the logo ONCE outside the pass loop and strokes it per rainbow pass;
`drawStarfield` strokes `starPictureGlyph`; `STAR_PICTURE_DOTS` is gone. A new `'fuse-score'` fx
kind spawns on `enemy-death` when `enemyType === 'fuseball'`.

**I verified it in a browser, not just in tests.** `render.ts` can't run under vitest, so a
geometry port could typecheck, pass every source-scan, and still draw garbage. I served THIS
checkout on port 5283 (5273 may belong to a sibling checkout — confirmed the server's cwd with
`lsof` first), imported the module through Vite and rasterised each glyph:
- the logo renders **TEMPEST**, 11 strokes, all seven letters in one vertical band, the E's left
  edge visibly stepping left as it descends — the T's crossbar on top confirms the Y negation;
- the four star pictures return **22/20/21/20** dots with radii spread 0.067→1.274 (an authored
  scatter, not the old unit ring);
- the score pop-up reads **750 / 500 / 250**, ink at `y ∈ [-1,0]` (sitting ON the kill point and
  reading upward, as the ROM's pen does) and centred on the 3-cell box.

### Deviations & decisions

1. **V-022 was wired, not just built (beyond the letter of the tests).** TEA's tests only require
   the glyph to *exist*. Building it alone would have satisfied them while leaving V-022's actual
   defect ("we render no floating score text anywhere") unfixed — dead code. `tsc` proved the
   point immediately: `'fuseScoreGlyph' is declared but its value is never read`. The wiring is
   shell-only and small: the `enemy-death` event already carries `enemyType` and `depth`, and
   `fx.ts` already imports from `core/rules`. The tier is read from `fuseballScore(depth)` — the
   *same* rule the sim scores with — so the number shown is always the number awarded, and
   **tp1-21's weighted roll will move the pop-up with it for free**. I did not implement the roll.
2. **Extracted `glowTrace` from `vecText`** rather than duplicating ~15 lines of the two-pass glow.
   The logo needs that glow at an arbitrary hex hue (the rainbow's per-pass colour), and
   `strokeGlyph`'s `override` takes a `GlyphColor` name, not hex. Behaviour-preserving.
3. **Did NOT convert `LOGO_PALETTE` to `GlyphColor` names** (which would have let me reuse
   `strokeGlyph` directly). `titleLogo.test.ts:62-68` pins its exact hex, and `GLYPH_HEX.purple`
   (#9b30ff) is not the rainbow's magenta (#ff00ff) — the swap would have silently changed the
   rainbow's colours. Out of scope, no failing test asked for it.
4. **Two source-scan tests updated for renamed symbols**, both flagged by TEA in advance:
   `render.title-rainbow.test.ts` ("still draws the word TEMPEST" — the literal necessarily left
   `drawAttract`; the proxy is now `logoGlyph`) and `tp1-31.framing.test.ts` (star dots now read
   `p.x`/`p.y` rather than `ux`/`uy`; I made its regex name-agnostic). Both tests' *intent* is
   preserved and unchanged — tp1-31 still asserts no `cx +` offset. Neither is a regression.
5. **`clampIndex` + the `tier < 0` guard.** `fuseballScore` only ever returns 250/500/750, all
   present in the table, so the guard never fires today. It exists because `clampIndex(-1)` would
   otherwise resolve to tier 0 and draw "750" for an unknown score — a *wrong* number is worse
   than none, so an unmapped score draws nothing.

### Correction to TEA's own assessment (mine, found in GREEN)

TEA filed "V-017 says SEVEN routines, it has FIVE" as a new finding. **It is not** — V-017's
reasoning already carries a `[CORRECTION]` saying exactly that. TEA truncated the `reasoning`
field at 1000 chars while triaging and never read the tail. The claim text was never updated to
match its own correction, so restating it is still useful, but the credit is the audit's. Fixed in
the Delivery Findings and in the test file's header.

**The layout correction stands, and is stronger than TEA knew.** The [REFUTATION] doesn't merely
omit the analysis — it explicitly concludes *"the 'stair-step, not a straight baseline' claim is
real"* on the grounds that the `0F8,48` advance is "unambiguously up-and-right". It is; the
advance genuinely climbs. But the letters do not, because each advance is cancelling the previous
letter's own pen displacement. The audit is describing the pen path, not the letter placements.

### Citation hygiene (tempest CLAUDE.md rules 1 & 2)

- **Rule 1** — V-015, V-017, V-022 → `remediated_by: tp1-19`. Their `ours` quotes describe the
  code I removed, so they are history now, not live divergences. V-022 had no `ours` at all
  (there was no code to cite), marked for the record. **V-014/DA-006 were NOT touched** — already
  `remediated_by` tp1-17/tp1-3, guarded by tests.
- **Rule 2** — `reanchor-citations.mjs --write`: 21 re-anchored, **0 lost**, then 0/0 after my
  comment-only edits. "0 lost" is the proof the two rules were applied to the right findings: a
  fix I forgot to mark would have surfaced as LOST, and a drift I wrongly marked would have
  frozen a live citation.

**Handoff:** To the Thought Police (Reviewer).

## Reviewer Assessment

**Verdict:** REJECTED

**The finding that decides this, reproduced by me directly — not inferred:**

I replaced `logoGlyph()`'s body with `layoutText('TEMPEST')` — reinstating the *exact* defect
V-017 exists to fix, the message-font logo — and ran the suite:

```
tests/shell/tp1-19.shapes.test.ts   28 passed (28)
FULL SUITE                          132 files, 1540 passed (1540)
```

**Not one test in the repository caught it.** The story's headline acceptance criterion — "The
TEMPEST logo uses its own stair-stepped alphabet … not the game's stroke font" — has no
enforcement whatsoever. (Mutation reverted; `git diff HEAD` empty, real implementation restored.)

**Root cause, structurally certain:** `glyphs.ts`'s `LOGO_LETTERS` (592), `LOGO_SEQ` (605) and
`MSTAR` (672) are **module-private**. The test file imports only `logoGlyph`, `starPictureGlyph`,
`fuseScoreGlyph`, `FUSE_SCORE_TIERS`. So the test's own `LOGO_LETTERS`/`LOGO_SEQ`/`MSTAR1_ROM`
constants are a *hand-copied duplicate*, and every test asserting against them compares TEA's
transcription **to itself**. The handful of tests that do call `logoGlyph()` only check a coarse
point-count floor and left/right baseline agreement — both of which a font-rendered string
satisfies trivially.

The implementation is, as far as I can tell, **correct** — Dev verified it visually in a browser
(the logo reads TEMPEST, back-slanted E, one baseline; stars 22/20/21/20; score 750/500/250). This
rejection is not "the code is wrong". It is "nothing stops the code from silently becoming wrong",
which in a *fidelity* epic is the entire deliverable. A future refactor reverts V-017 in green CI.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **CRITICAL** | AC-1 unenforced: full suite passes with the message-font defect reinstated. Tests assert TEA's transcription against itself | `tests/shell/tp1-19.shapes.test.ts` (918, 945, 1012, 1023) | Assert `logoGlyph()`'s **own output** carries TEMLIT's signature — group a letter's run by y-level and pin the back-slanted E: 3 arms, unequal lengths (80/112/132), constant −20 left step. That single test fails on the font. Exporting `LOGO_LETTERS`/`LOGO_SEQ` for a direct comparison is the cheaper route |
| **CRITICAL** | Zero-assertion test dressed as a regression guard: `expect(renderSrc.length + glyphSrc.length).toBeGreaterThan(0)` asserts nothing about DA-006 | `tests/shell/tp1-19.shapes.test.ts:1176` | Give it a real assertion (mirror the sibling V-014 guard: regex `frame < 1` / `ENEMY_DIM` in `fx.ts`) or delete it. A name implying coverage that does not exist is worse than no test |
| **CRITICAL** | V-022's wiring — the behaviour Dev argued for adding — has **zero** coverage: deleting the `enemyType === 'fuseball'` line passes all 1540 tests | `src/shell/fx.ts:312` | Add a test in `fx.explosions.test.ts` (it already has an enemy-death fixture): a fuseball death pushes a `kind: 'fuse-score'` at the kill site with the tier matching `fuseballScore(depth)`; a flipper/tanker death does **not** |
| **MAJOR** | `readonly` guard is vacuous — `/readonly/` matches anywhere in a 700-line file; stripping `readonly` from the new tables still passes (proven by mutation) | `tests/shell/tp1-19.shapes.test.ts:1200` | Scope the regex to the new declarations: `/const LOGO_LETTERS: Readonly</`, `/const MSTAR: readonly /` |
| **MAJOR** | MSTAR2/3/4 content untested — only counts + a radius ratio. Fabricated 20-dot arrays pass (proven by mutation) | `tests/shell/tp1-19.shapes.test.ts:1039-1069` | Add `MSTAR2/3/4_ROM` oracles (the header already cites their exact line ranges) and run `radiiCover` on all four |
| **MINOR** | `clampIndex(NaN)` propagates NaN → `starPictureGlyph(NaN)` throws `TypeError`; `fuseScoreGlyph(NaN)` silently returns an empty glyph. Both contradict `clampIndex`'s own docstring ("clamps to the nearest real entry rather than returning undefined"). Unreachable today | `src/shell/glyphs.ts:95` | Guard non-finite input (`if (!Number.isFinite(i)) return 0`), or drop the docstring's claim |
| **MINOR** | The test named "no wrap-around lie" never calls an out-of-range index, so `clampIndex` — new code — is entirely unexercised | `tests/shell/tp1-19.shapes.test.ts:1210` | Actually call `starPictureGlyph(4)` / `fuseScoreGlyph(-1)` and assert the clamp |
| **MINOR** | `MSTAR_SCALE` normalises by Chebyshev extent (max \|x\|/\|y\|), not Euclidean radius, so dots reach **1.13–1.27×** the plane's nominal reach — a real, unrequested change from the old table's ≤1.0 | `src/shell/glyphs.ts:700` | Judgment call, not a defect: `reach` is our invention, the ROM has no such constant, and stars leaving frame at full dive is intended. **Accepted** — but record it, since it visibly widens the warp field |
| **MINOR** | `LOGO_SEQ`'s letter column is typed `string`, so a future unauthored letter compiles clean and throws *at import time* inside the `LOGO_RUNS` IIFE — taking down all of `glyphs.ts`, not just the logo | `src/shell/glyphs.ts:605` | Type it `keyof typeof LOGO_LETTERS` — a compile error instead of a module-load crash |
| **NOTE** | `spawnFuseScore`'s `if (tier < 0) return` silently no-ops. Unreachable today (`fuseballScore` only returns 250/500/750, all in the table) — but the code's own comment says tp1-21 will change that rule | `src/shell/fx.ts:179` | Optional: a dev-only warn so a future scoring/table drift is loud. Player-facing behaviour (draw nothing) is right |

**Rule Compliance (TypeScript lang-review):** #1 type-safety escapes — pass (no `as any`/`@ts-ignore`
in source; the one `as GlyphColor` was in my reverted mutation, not the diff). #2 `readonly` — the
data *is* readonly, but its **guard** is vacuous (above). #3 enums/exhaustiveness — pass;
`drawExplosions`'s final `else` narrows structurally, and a 5th `Explosion` variant fails to
compile. #4 null/undefined — **fail**, the `clampIndex` NaN path. #8 test quality — **fail**, see
CRITICALs. #10 input validation — n/a (no user input). Build (`tsc --noEmit` + vite) clean; note
`npm run lint` is a **no-op echo** in this repo and proves nothing.

**What I am not asking for.** The three audit corrections are sound and I verified the load-bearing
one myself: TEMLIT's seven letters do all span y=256..384, so V-017's "stair-step" layout claim is
wrong and the code is right to ignore it. The `remediated_by`/re-anchor hygiene is correct —
"0 lost" is real evidence. Don't re-litigate any of that; fix the tests.

**Handoff:** Back to Julia (Dev) for fixes.

## Dev Assessment — round 2 (review rework)

**Status:** GREEN — **1551** tests (was 1540), `npm run build` clean, citations 25/25. Pushed as
`c4534b7`. The reviewer's verdict was correct and I'm not contesting any of it.

**Every finding fixed, and each fix proved by re-running the mutation that exposed it.** The suite
now *fails* on all six defects it previously waved through:

| Mutation | Old suite | Now |
|----------|-----------|-----|
| `logoGlyph()` → message font (**the V-017 defect**) | 1540 passed | **3 fail** |
| Delete the `enemyType === 'fuseball'` wiring | 1540 passed | **6 fail** |
| Symmetric, non-back-slanted E letterform | 28 passed | **3 fail** |
| Fabricated MSTAR2 coordinates (right count, wide spread) | 28 passed | **1 fail** |
| Strip `readonly` off the new tables | 28 passed | **1 fail** |
| DA-006 off-by-one (`frame < 1` → `frame < 2`) | 28 passed | **1 fail** |

**CRITICAL 1 — AC-1.** The fix is `expectSameShape()`: `logoGlyph()`'s **own output** is compared
point-for-point against the traced TEMLIT oracle in a canonical frame (centre on bbox, divide by
height, oracle offered in both Y orientations). Scale, translation and Y convention are still free;
*shape* is not. `letterPts()` cuts a letter out of the shipped glyph using an x-window derived from
the oracle, so the back-slant test now reads the real E — the word's second E is the one with clear
air either side (P ends at 74, E spans 84..216, S starts at 222). "Is NOT the message font" now
compares against `layoutText('TEMPEST')` directly, plus the structural tell I verified in the font
data: the font's E is a comb on **one spine** (all three arms start at x=0), TEMLIT's arms start at
−80/−100/−120. My first attempt used an arm-length ratio (1.65 vs 1.33) — too close to be a real
discriminator; the reviewer would have been right to reject that too.

**CRITICAL 2 — DA-006.** Was `expect(renderSrc.length + glyphSrc.length).toBeGreaterThan(0)`. That
was mine, and it was indefensible. Now pins `frame < 1 ? ENEMY_DIM : ENEMY_BRIGHT` and asserts the
`frame < 2` defect stays gone, mirroring the sibling V-014 guard.

**CRITICAL 3 — V-022 wiring.** New `tests/shell/tp1-19.fx-fuse-score.test.ts`, mirroring tp1-18's
shapes/fx split. Asserts the pop-up spawns at the kill alongside the burst, shows the score the sim
**awarded** (swept across the depth range through `fuseballScore`, not a hard-coded band — so
tp1-21's roll should carry it), reaches all three ROM tiers, fires for **no other enemy kind**, and
ages out. Note it drives `update()` for aging — `detect()` only spawns, which my first draft got
wrong.

**MAJORs.** All four MSTAR pictures now have oracles and are matched point-for-point, plus a
shared-scale test (a plane must not resize when it recycles). The `readonly` guard is scoped to
this story's declarations.

**MINORs.** `clampIndex` guards non-finite input — `Math.trunc/min/max` propagate NaN, so
`starPictureGlyph(NaN)` threw and `fuseScoreGlyph(NaN)` rendered `String(undefined)` → an invisible
pop-up (the font has no lowercase). Both are now tested, including that out-of-range **clamps
rather than wraps**. `LOGO_SEQ`'s letter column is keyed via `satisfies` + `keyof typeof`, so an
unauthored letter is a compile error instead of an import-time crash inside the `LOGO_RUNS` IIFE.
Dead `radiiCover`/`normRadii` removed rather than left behind.

**Accepted as-is:** the MSTAR Chebyshev-vs-Euclidean overshoot (the reviewer accepted it — `reach`
is our invention, the ROM has no such constant, and stars leaving frame at full dive is the intent),
and the `tier < 0` guard (unreachable today; the player-facing behaviour is right).

**The lesson, recorded plainly.** I wrote a 28-test suite with ROM oracles, invariance helpers and
audit corrections that could not fail on a wrong implementation, and then cited its passing tests
as evidence it was trustworthy. The tell was visible in RED and I misread it: **12 tests passing
before a line of implementation existed** was not rigour, it was proof they never touched the code.
The pattern came from tp1-17/tp1-18 — the reviewer's upstream Gap to audit those suites is the
right call.

**Handoff:** To the Thought Police (Reviewer) for re-review.

## Reviewer Assessment — round 2

**Verdict:** REJECTED (one MAJOR, ~3 lines to fix)

**The round-1 findings are genuinely fixed. I re-ran the mutations myself rather than trusting the
report:**

| Mutation | Round 1 | Now |
|----------|---------|-----|
| `logoGlyph()` → message font (the V-017 defect) | 1540 passed | **3 fail** ✓ |
| Pop-up always shows tier 0 (wrong score) | — | **2 fail** ✓ |
| Pop-up spawns for every enemy, not just fuseballs | — | **1 fail** ✓ |

`expectSameShape` is a sound pin: it allows scale, translation and a Y flip, but not an X mirror
and not a different shape. The new fx suite bites. The DA-006 and `readonly` guards are real now.
Dev's own account of what went wrong is accurate and I have nothing to add to it.

**What still slips through — and I missed it in round 1, so this is my finding, not a re-raise:**

`expectSameShape` compares a **sorted point set**, so stroke *connectivity* is invisible to it. Two
mutations pass all 31 tests:

- **M7** — return the identical vertices as ONE polyline (`LOGO_RUNS.flat()`): **31 passed**.
- **M8** — treat every beam-off move as a lit vector: **31 passed**.

M8 is genuinely benign, and interestingly so: TEMLIT's *intra-letter* beam-off moves retrace along
a vector that is already lit (T's jump back along its crossbar, E's back along its middle arm), so
drawing them changes nothing. Theurer authored them that way. But **M7 is not benign** — I traced
it: the correct split is **11 strokes**, and merging them draws inter-letter joins up to **258
units, twice the 128 cap height**. Lines slashing across the word, in green CI.

This matters here specifically because beam-on/beam-off *is* the core semantic of the vector data
this story ports — `b = CB` vs `b = 0` is the distinction the whole `I3.` section is transcribing.
And it is the codebase's own standard, applied unevenly: tp1-18 pins `SPARK1 is 4 lit dots` and
`each mark is a zero-length lit DOT`, and **this very file** pins `points.length === 1` for the star
dots. The logo is the only new glyph whose stroke structure is unpinned.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **MAJOR** | Stroke connectivity unpinned: `logoGlyph()` returning the right vertices as one merged polyline passes all 31 tests, while drawing 10 spurious inter-letter lines up to 258 units (2× cap height) | `tests/shell/tp1-19.shapes.test.ts` (the AC-1 block) | Pin the split: `expect(logoGlyph()).toHaveLength(11)` — T=2, E=2, M=1, P=1, E=2, S=1, T=2 — and assert no single stroke spans two letters (e.g. every stroke's x-extent fits inside one letter's oracle window). Matches the `sparkGlyph`/`starPictureGlyph` convention already in this file |

**Rule Compliance (TypeScript lang-review):** #1 type-safety escapes — pass. #2 `readonly` — pass,
guard now scoped to this story's declarations. #3 exhaustiveness — pass. #4 null/undefined — **now
pass**; `clampIndex` guards non-finite and both clamp paths are tested, including that out-of-range
clamps rather than wraps. #8 test quality — **the remaining MAJOR**; otherwise pass (no vacuous
assertions survive, dead `radiiCover`/`normRadii` removed rather than left). #10 input validation —
n/a. Build (`tsc --noEmit` + vite) clean; 1551 tests; citations 25/25, 0 lost.

**Not asking for anything else.** The MSTAR Chebyshev overshoot stays accepted, the `tier < 0`
guard stays, the audit corrections stand. Add the stroke-split assertion and this is done.

**Handoff:** Back to Julia (Dev) for one fix.

## Dev Assessment — round 3 (review rework)

**Implementation Complete:** Yes
**Files Changed:**
- `tempest/tests/shell/tp1-19.shapes.test.ts` — one new test in the AC-1 block:
  `keeps TEMLIT's beam-off SPLIT: 11 lit strokes, none bridging two letters`. Nothing else
  changed; no source files touched.

**Tests:** 1552/1552 passing (GREEN) — full suite via `testing-runner`, RUN_ID
`tp1-19-dev-green-r3` (133 files, was 1551, +1). `npm run build` (tsc --noEmit + vite) clean.
Citations unchanged — no cited file edited, no reanchor needed (verified: no finding cites the
test file).
**Branch:** feat/tp1-19-logo-alphabet-star-pictures (pushed, `d8c9230`)

**The fix, exactly as specified.** The new test pins the stroke split two ways:

1. `expect(logoGlyph()).toHaveLength(11)` — and the 11 is not hardcoded on trust: the expected
   split is DERIVED from the oracle's own lit flags (`1 +` mid-letter beam-offs per letter) and
   self-checked against `[2, 2, 1, 1, 2, 1, 2]` = T=2, E=2, M=1, P=1, E=2, S=1, T=2.
2. No stroke bridges two letters: each shipped stroke's x-extent must fit inside at least one
   letter's oracle x-window, both mapped through the same canonical frame the rest of the suite
   uses. A faithful stroke's points are a subset of its letter's points, so it always fits; a
   merged polyline spans the word and fits nowhere.

**Both reviewer mutations re-run and killed:**

| Mutation | Round 2 | Now |
|----------|---------|-----|
| M7 — `LOGO_RUNS.flat()` as ONE polyline | 31 passed | **1 fail** (the new test) |
| M8 — every beam-off drawn as a lit vector | 31 passed | **1 fail** (7 strokes ≠ 11) |

M8 was benign on screen (Theurer's intra-letter beam-offs retrace already-lit vectors), but the
split pin catches it too — that is the convention the reviewer asked for (`sparkGlyph`'s 4 lit
dots, the star dots' `points.length === 1`), and stroke structure is now uniformly pinned across
the file's glyphs. Implementation restored after each mutation; `git status` confirms only the
test file changed.

**Handoff:** To the Thought Police (Reviewer) for re-review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all mechanical gates green (1552/1552, build clean, tree clean, no debug code, citations 25/25) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([EDGE] below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([SILENT] below) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([TEST] below) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([DOC] below) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([TYPE] below) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([SEC] below) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([SIMPLE] below) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer directly ([RULE] below) |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (mine, non-blocking), 0 dismissed, 0 deferred

Additionally (per the reviewer sidecar's self-authored-review rule): an **independent
general-purpose auditor** was spawned to verify the load-bearing claim against the primary source
only (`~/Projects/tempest-source-text/ALVROM.MAC`, no repo TypeScript read). It confirmed from
lines 1301-1351: draw order T,E,M,P,E,S,T; beam-offs T=1 (line 1319, mid-chain), E=1 (line 1325,
mid-chain), M/P/S=0; every chain starts and ends lit, no consecutive beam-offs — total **11 runs,
per-letter [2,2,1,1,2,1,2]**, with a flatten cross-check (34 lit + 4 letter beam-offs + 7 advances).
The test's derived split matches the ROM, not merely the author's transcription.

## Reviewer Assessment — round 3

**Verdict:** APPROVED

**Scope of this round:** one commit (`d8c9230`), 41 added lines in
`tests/shell/tp1-19.shapes.test.ts`, nothing else — verified `git diff 19248ef..d8c9230 --stat`.
No source files changed since round 2. The rest of the story stands as reviewed in rounds 1-2.

**The round-2 MAJOR is fixed, and I re-ran every mutation myself rather than trusting the report:**

| Mutation | Round 2 | Now |
|----------|---------|-----|
| M7 — `LOGO_RUNS.flat()` as ONE merged polyline | 31 passed | **1 fail** ✓ |
| M8 — every beam-off drawn as a lit vector | 31 passed | **1 fail** ✓ |
| M10 (new, mine) — bridge E₂→S, split M to keep count at 11 | — | **2 fail** ✓ — the window assertion fires (`stroke 8 x-extent … must sit inside one letter`) independently of the count, AND the compensating split's duplicated point trips `expectSameShape` |

M10 matters: it proves the no-bridge assertion is not dead code riding on `toHaveLength(11)` —
a count-preserving bridge dies on the window check in its own right.

**Observations (round-3 delta):**

- **[VERIFIED]** The pinned 11 and the per-letter split `[2,2,1,1,2,1,2]` match the PRIMARY SOURCE —
  independent auditor on ALVROM.MAC:1301-1351 (quoted above), which also matches my own round-2
  trace. The self-check `toEqual([2,2,1,1,2,1,2])` fails loudly if the letter tables ever drift,
  forcing re-derivation instead of silently recalibrating.
- **[EDGE]** Slicing bookkeeping is exact: `allPoints` flatMaps strokes in order, and each slice is
  keyed by that stroke's own `points.length`, so the per-stroke windows cannot desynchronise.
  `Math.min(...pts)` on an empty slice is unreachable — `buildLogoRuns` only flushes runs with
  `length > 1`, so every stroke has ≥2 points. The float tolerance is decorative: every canonical
  coordinate is an integer (or exact half) divided by 128 — a power of two — so both clouds are
  bit-exact in IEEE754 and the margins the windows discriminate at are ~0.4 canonical units,
  six orders above the 1e-6 epsilon.
- **[TEST]** One residual escape found (mine, this round): **M9 — permuting a run's INTERIOR vertex
  order** (multiset preserved, e.g. swapping two mid-points of M's 9-point chain) passes all 32
  tests — the suite pins the point SET and the run STRUCTURE but not the vertex ORDER within a run,
  so a scrambled M (lines crossing the letterform) would ship green. **Non-blocking**, for a
  reachability reason M7 did not have: `flat()` is a plausible simplification a refactor reaches
  naturally; no plausible edit permutes interior vertices of an authored run while preserving the
  multiset. The one order-change a refactor WOULD plausibly make — reversing a run's direction —
  draws the identical picture (same segments) and correctly passes: the pin is not over-tight.
  The full cure (compare the SEGMENT multiset, not the point multiset — subsumes count, bridging
  and order in one assertion) is filed as an Improvement for the remaining SHAPES stories below.
- **[SILENT]** No swallowed errors in the delta: every comparison lands in an `expect` with a
  labelled message naming the failing stroke and its extent; the pre-existing `letterPts` throw
  path is untouched.
- **[DOC]** The new comment block is accurate history (M7's 258-unit joins, the reviewer
  attribution, the `points.length === 1` star-dot convention it extends) and correctly documents
  WHY the windows check works (subset argument) — not what the next line does.
- **[TYPE]** No type-safety escapes: the only assertion is `as const` on the window tuples
  (narrowing, not escaping). No new persistent data structures — locals only, so the `readonly`
  table rules do not attach.
- **[SEC]** n/a — test-only delta, no I/O, no user input, no DOM.
- **[SIMPLE]** The derivation earns its lines: deriving `expectSplit` from the oracle's lit flags
  and THEN self-checking against the literal avoids both a bare magic 11 (unexplained) and a
  tautology (deriving expected and actual from the same walk). Nothing to simplify.
- **[RULE]** Lang-review mapping below.

**Data flow traced:** `LOGO_SEQ`/`LOGO_LETTERS` (oracle) → `traceLogo()` pen walk → `toCanon` →
per-letter x-windows; `logoGlyph()` → `allPoints` → `toCanon` → per-stroke slices → extent-vs-window
containment. All deterministic module data end to end; no user input enters.

**Rule Compliance (TypeScript lang-review, scoped to the delta):** #1 type-safety escapes — pass
(`as const` only). #2 generics/readonly — n/a (no new tables; locals). #3 enums — n/a.
#4 null/undefined — pass (no nullable path; empty-slice `Math.min` unreachable, see [EDGE]).
#5 modules — n/a. #6 React — n/a. #7 async — n/a. #8 test quality — **pass**: the new test is
non-vacuous (proven by M7/M8/M10 each failing it), its self-check is calibrated against the
primary source, and the one residual (M9) is documented and judged above. #9 build config — n/a.
Build clean, 1552/1552, citations 25/25 (preflight).

### Devil's Advocate

Suppose this round is theatre. The author and the reviewer are the same session — the most
comfortable possible review. What would the comfortable reviewer miss? First: the test could
agree with the implementation because both walk the same transcription — a shared misreading of
TEMLIT would pass its own echo. That is why the split was re-derived by an independent agent from
ALVROM.MAC alone, and it returned the same 11 with the beam-off line numbers quoted; the number
also matches the round-2 reviewer's trace, made before this test existed. Three derivations, one
answer. Second: the no-bridge check could be dead code — `toHaveLength(11)` fires first on every
natural mutation, so the windows loop might never have caught anything in anger. M10 was built to
kill exactly that doubt: count preserved at 11, and the window assertion is what failed. Third:
the epsilon could be load-bearing — a bridging stroke might exceed a window by less than the
tolerance. It cannot: canonical coordinates here are exact binary fractions (dividers are powers
of two), and real bridges overshoot by ~0.4 units against a 1e-6 epsilon. Fourth: what DOES still
slip through? M9 — interior vertex scrambling. I found it, weighed reachability honestly, and
chose not to block on it; if that judgment is wrong, the segment-multiset Improvement below is the
recorded path to close it. Fifth: could the new test be FLAKY — order-dependent, locale-dependent,
timing-dependent? No: pure synchronous arithmetic on module constants, no I/O, no clock, no RNG.

**Not re-litigated:** everything rounds 1-2 settled — the MSTAR Chebyshev overshoot, the
`tier < 0` guard, the audit corrections and `remediated_by` hygiene (the findings diff was
re-audited in round 1; no prose laundering, stamps honest).

**Handoff:** To Winston Smith (SM) for finish-story.