---
story_id: df2-6
jira_key: df2-6
epic: df2
workflow: tdd
---
# Story df2-6: VISUAL playtest for orientation traps + still-frame proof

## Story Details
- **ID:** df2-6
- **Jira Key:** df2-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df2-6-visual-playtest-orientation
- **PR:** https://github.com/slabgorb/arcade/pull/421

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T15:26:36Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T14:47:35Z | 2026-08-15T14:49:34Z | 1m 59s |
| red | 2026-08-15T14:49:34Z | 2026-08-15T15:00:17Z | 10m 43s |
| green | 2026-08-15T15:00:17Z | 2026-08-15T15:16:57Z | 16m 40s |
| review | 2026-08-15T15:16:57Z | 2026-08-15T15:26:36Z | 9m 39s |
| finish | 2026-08-15T15:26:36Z | - | - |

## Sm Assessment

Capstone of epic df2 — df2-1 through df2-5 are all DONE (render seam, palette, MESS0
charset, DEFB6/SAMEXAP7 objects, BLK71 terrain). This 1-pt story is the visual
still-frame proof that the transcribed static pixels actually render: planet surface +
charset text + a sample object at http://127.0.0.1:5270/defender/.

Routing notes for TEA (Han Solo):
- **Prove DIFFER, not 200.** A screenshot/assertion must compare `/defender/` against a
  nonsense control path and assert they DIFFER — an all-200 sweep proves nothing (the
  canonical-serve lesson; the mechanical DIFFER check already lives in
  tests/canonical-serve.test.mjs, so do not re-implement it there — this story is the
  VISUAL/render proof, not a re-run of the serve topology test).
- **Orientation + colour BEFORE physics** (playbook sec 4): confirm the render is
  upright and colours are transcribed palette indices, not invented hex
  (see [[colours-never-invented-ground-fill-uses-index]]).
- **Accessibility forward-note:** carry forward the df4 ruling (no full-screen strobe
  downstream) as a NOTE only — df2 renders no strobe; nothing to implement here.
- **Held-input / screenshot traps:** Playwright `press()` is too brief for held keys
  (see [[arcade-held-input-needs-key-hold]]); this is a static still, so no input is
  needed, but do not add game-start interaction. Confirm whose dev server answers 5270
  before trusting a screenshot (CLAUDE.md serve pin).

No blocking PRs, gate clear. Branch `feat/df2-6-visual-playtest-orientation` cut from
develop.

## Tea Assessment

**RED verified.** Baseline `npx vitest run --project defender` = 297 passed / 16 files
(green). After adding `plugins/defender/tests/still-frame.test.ts`: **8 failed / 297
passed / 17 files** — every failure is in the new file, each with a self-describing
"src/core/scene.ts not built yet" / "main.ts does not call composeStaticFrame(...)"
message. RED is caused by the ABSENT feature, not a broken test. (Verified directly;
the run is clean and unambiguous — baseline-green then +8-red isolated to my file.)

### The gap (why it's RED)
`src/main.ts` only does `clear(fb, 0)` — a **blank** screen. df2-1..df2-5 transcribed
and gated each piece in isolation (palette, MESS0 charset, DEFB6 objects, BLK71
terrain) but nothing composes them into one still. render.test.ts already anticipated
this suite: *"The full pixel result is proven by the df2-6 VISUAL check."*

### Contract for GREEN (Yoda / Dev)
1. **NEW pure core module `src/core/scene.ts`:**
   `export function composeStaticFrame(width: number, height: number): Framebuffer`
   — allocate + clear the surface, then blit the STATIC still: planet across the
   **bottom** (terrain), a line of charset **text** near the top, a sample DEFB6
   **object** below the text.
   - **PURE src/core** — composes framebuffer/terrain/charset/objects only. **Take
     width/height as ARGUMENTS**; do NOT `import { LOGICAL_WIDTH } from '../shell/render'`
     — that crosses the boundary and `tests/purity.test.ts` (which sweeps every
     `src/core/*.ts`) reddens on `import from shell/`.
   - Colours are palette **indices**, never RGB hex. Terrain colour must be 0..15
     (blitTerrain validates it); text/object colours must also be 0..15 — blitGlyph/
     blitObject write the caller's index straight into the `Uint8Array`, so a value >15
     is stored and later rendered as `CRAM[i & 0x0f]` = an INVENTED colour. See
     [[colours-never-invented-ground-fill-uses-index]].
2. **Wire `src/main.ts`:** paint `composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)`
   instead of `createFramebuffer + clear`. (main.ts is the shell — it owns the board
   constants and passes them in.)
3. **Capture the actual visual proof** (the human deliverable AC1/AC2): screenshot
   `http://127.0.0.1:5270/defender/` showing planet + text + object, saved under
   `sprint/demos/df2-6/`. Confirm whose dev server answers 5270 before trusting it
   (CLAUDE.md serve pin) and remember games don't hot-reload — refresh. Held input is
   NOT needed (static still); do not add game-start interaction
   ([[arcade-held-input-needs-key-hold]]).

### Test → AC coverage
| Test | AC | Proves |
|------|----|--------|
| dims / shape | 1,2 | composeStaticFrame returns the 292×240 raster |
| not blank (differs from cleared) | 2,3 | vitest analogue of the canonical-serve DIFFER — not a blank/fallback |
| wide planet LOW, not at top | 4 | upright — catches X/Y swap, vertical flip, 90° rotation |
| text + object ABOVE planet | 2,4 | integrated upright scene, nothing off-screen |
| ≥3 distinct on-screen colours | 2 | planet + text + a THIRD element (the object), position-free |
| every cell ≤ index 15 | 5 | no colour invented via byte overflow |
| scene.ts no hex literal (comment-stripped) | 5 | colours reached BY INDEX |
| main.ts calls composeStaticFrame(...) | 1 | the still is actually mounted, not just cleared |

Thresholds are coarse on purpose (per-pixel fidelity is each df2-N gate's job; this is
the integration + orientation gate) — measured, not guessed: `decodeAltitudes(TDATA)`
puts the first 292 altitudes in rows **186..232** across all 292 columns, so "wide band
low" is a real fact, not an assumption.

### Rule coverage
- **colours-never-invented** (project rule; joust settled the ground-fill precedent):
  two tests — the source-text hex scan on scene.ts and the `index ≤ 15` overflow guard.
- **lang-review #21 (silent no-op / fail-loud)**: blitGlyph/blitObject already throw on
  malformed input; the overflow-index guard closes the one hole they DON'T validate
  (an out-of-range caller colour), catching it at the composition layer.
- **streams-are-not-rasters**: already gated by df2-4/df2-5 (blit* refuse non-raster);
  composeStaticFrame only uses raster objects + the TDATA bitstream via decodeAltitudes,
  so no new surface here.
- **Vacuous-assertion self-check**: every test asserts a concrete value/predicate; no
  `assert(true)`, no always-true `is*` checks. The band thresholds are witnessed by the
  measured 186..232 range.

### AC6 (accessibility) — documentation, not a test
"df2 renders no full-screen strobe; df4/df7 inherit freeze/fade/particle (owner
photosensitive)" is already recorded in `sprint/context/context-epic-df2.md` (§
Accessibility forward-note) and df1. df2 has NO animation, so a "no strobe" code test
would be vacuous — deliberately omitted. Reviewer should confirm the note survives.

### AC7 (tree clean)
No debug code / temporary harness added — the still is permanent shell code; the proof
is the visual output + this suite. Covered by review, not a dedicated test.

## Dev Assessment

**GREEN.** defender 307/307 (17 files), orchestrator 498/498, `npm run lint` clean.
Branch `feat/df2-6-visual-playtest-orientation` pushed.

### What I built
- **`src/core/scene.ts` (new, pure):** `composeStaticFrame(width, height)` — clear, then
  planet (BLK71 terrain, GREEN idx 3) along the bottom, title "DEFENDER" (WHITE idx 9)
  across the top, player-ship object PLAPIC between. Takes dims as args (board constant
  stays in the shell); purity sweep passes it.
- **`src/main.ts`:** mounts `composeStaticFrame(LOGICAL_WIDTH, LOGICAL_HEIGHT)` instead
  of a bare clear.

### The orientation trap the visual playtest CAUGHT (and I settled)
The first render showed a **garbled title** (`sprint/demos/df2-6/before-charset-garbled.png`).
The charset/object cells are **COLUMN-major** (`bytes[col*height + row]`), not row-major
— exactly the "nibble ORDER / Williams screen rotation" question `charset.ts`/`objects.ts`
deferred to df2-6. Source-proven: LETTRD's 24 bytes (`defender/MESS0.SRC:558`) only spell
a 'D' column-first; UFOP1/PLAPIC only read as a saucer/ship column-first (I dumped both
decodes as ASCII to confirm before touching code). Fixed the one-line transpose in
`blitGlyph` and `blitObject`. After: legible DEFENDER + ship + upright planet
(`after-still-frame.png`). See [[defender-image-cells-column-major]].

### Why this was safe / in-scope
- The df2-3/df2-4 blit suites are **packing-agnostic BY DESIGN** (their own comments say
  df2-6 owns the orientation) — they stayed green across the transpose. The byte gates
  are unaffected (bytes unchanged). Terrain is a separate bitstream decode, already
  correct.
- Locked the orientation in `still-frame.test.ts` ("'D' has a solid left vertical stroke
  and a top bar — impossible row-major") so a regen/refactor can't silently re-transpose.

### Visual proof (`sprint/demos/df2-6/`)
before/after stills + `/nonsense/` lobby-fallback control (page title "Slabcade" vs
"Defender") = DIFFER, not just 200. Captured on port 5311 (5270 held by sibling checkout
`a-1`; served my own tree per the CLAUDE.md pin rather than killing theirs).

### For the Reviewer (Obi-Wan)
- The scope note: this GREEN legitimately edited **two previously-approved stories'** core
  files (df2-3 charset.ts, df2-4 objects.ts). That is df2-6's explicit mandate — the blit
  comments deferred orientation here — not scope creep. Verify the transpose is correct
  (ASCII-dump a glyph column-major) and that the blit suites' packing-agnostic claim
  genuinely holds.
- AC6 accessibility note is documentation (epic context + demo README); df2 has no
  animation, so no strobe test.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 307 defender + 498 orchestrator pass, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (low) | confirmed 1 (non-blocking), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 2 (low) | confirmed 2 (non-blocking), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (low) | confirmed 1 (non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (all LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

df2-6 did exactly what a visual playtest is for: it caught the orientation trap
df2-3/df2-4 explicitly deferred here (the charset/object cells are COLUMN-major,
`bytes[col*height + row]`, not row-major), and the fix is source-proven, mutation-tested
and locked. No Critical/High issues. The four confirmed findings are all LOW and
non-blocking; two are pre-existing and one is a cosmetic citation gap.

**Data flow traced:** ROM-transcribed data (charset-data/objects-data/terrain-data, all
df1-1-gated) → `composeStaticFrame(292,240)` builds a pure index framebuffer (title 9,
object own-nibbles, planet 3) → `main.ts` mounts it → `render.ts indexToRgba` decodes
each index through the transcribed CRAM palette to RGBA on the canvas. No user input
enters the path (static still); safe because every colour is an index 0..15 and every
blit clips to the framebuffer.

**Pattern observed:** the transpose was applied CONSISTENTLY to both blit sites
(`charset.ts:83`, `objects.ts:57`), each keeping its `bytes.length === width*height`
guard — so `col*height+row` stays in `[0, width*height)` for all 43 glyphs / every object
(rule-checker verified the invariant programmatically). Good pattern.

### Observations (all VERIFIED / tagged by source)
- **[VERIFIED] The column-major fix is correct and load-bearing** — rule-checker
  mutation-reverted `col*height+row`→`row*width+col` in a disposable worktree and ONLY
  `still-frame.test.ts`'s 'D' orientation test reddened; charset/objects blit suites
  stayed green (genuinely packing-agnostic). Evidence: `charset.ts:83`, `objects.ts:57`,
  lock at `still-frame.test.ts` 'D' left-stroke/top-bar test.
- **[VERIFIED] src/core purity holds for the new module** — `scene.ts:29-32` imports only
  core (`framebuffer/charset/objects/terrain`), no shell import, no canvas/RGBA/clock/
  entropy; `tests/purity.test.ts` `readdirSync(coreDir, recursive)` sweeps it and the
  suite is green. Complies with the CLAUDE.md core/shell boundary rule.
- **[VERIFIED] colours-are-never-invented** — `scene.ts` uses numeric indices only
  (BACKGROUND 0, TEXT 9, TERRAIN 3); grep of all changed files + render.ts finds zero hex
  literals; `still-frame.test.ts` asserts every cell ≤15 (verified live max index 15).
  Complies with the joust ground-fill precedent.
- **[VERIFIED] orientation thresholds are magnitudes, not degenerate** — rule-checker
  probed live: bottom band 292/292 columns (gate ≥200), top band 40/292 (<200), 8 distinct
  colours (≥3), terrain rows 186–232. Wide margins.
- **[SEC] low, non-blocking** — `blitGlyph` (`charset.ts:83`) writes the caller's
  `colorIndex` with no 0..15 range check (unlike `blitTerrain`). Pre-existing from df2-3;
  UNCHANGED by this diff (only the source-byte index math moved); the only callers pass
  literal 9/3, and the composition-layer `≤15` test already catches an overflow. Optional
  future hardening (mirror blitTerrain's throw), not required by this 1-pt story.
- **[SEC] low, non-blocking** — `blitObject` (`objects.ts:57`) writes each nibble without
  an explicit range assert; nibbles are structurally 0..15 (`byte & 0x0f`), so effectively
  safe. Noted for symmetry only.
- **[DOC] low, non-blocking** — `objects.ts` header claims "UFOP1/PLAPIC only read
  column-first" but dropped the ROM line citation its sibling `charset.ts` carries
  (`MESS0.SRC:558`). Format rule (`SRC:line` not `ts:line`) is NOT violated; this is a
  cosmetic asymmetry. Suggest a future touch adding `defender/DEFB6.SRC:1961 PLAPIC`.
- **[RULE] low, non-blocking (checklist #11)** — `still-frame.test.ts:77`
  `catch (e) { (e as Error).message }` casts an implicit-`unknown` catch var to `Error`
  without an `instanceof` narrow. Confirmed as a checklist match (not dismissed);
  downgraded to LOW with rationale: it is the verbatim repo-wide RED-phase idiom in EVERY
  sibling df2 test file (purity/objects-blit/framebuffer/charset-*/render/palette/
  terrain-* tests), NOT introduced by this diff, and the only thrown value is a genuine
  Error — no runtime risk. Candidate for a shared narrowing helper someday.

### Rule Compliance
Rules applied to the changed `.ts` (lang-review/typescript.md + CLAUDE.md core rules):
- **core/shell purity** (scene.ts, the one new core file): COMPLIANT — core-only imports,
  swept by purity.test.ts.
- **colours-never-invented** (scene.ts, charset.ts, objects.ts, main.ts): COMPLIANT — no
  hex literal; indices only; `≤15` enforced.
- **.js extensions on relative imports** (scene.ts:29-32, charset/objects/main/test):
  COMPLIANT — all present.
- **Map.get()/find() undefined-checked** (charset `byChar.get`→`?? QUESTION`; scene
  `require_`→`if(!found) throw`): COMPLIANT.
- **type-safety escapes** (no `as any`/`as unknown as T`/`@ts-ignore`; casts are typed):
  COMPLIANT.
- **readonly array params** (scene `require_(table: readonly T[])`, terrain retained):
  COMPLIANT.
- **ROM-ref citation format** (`defender/<FILE>.SRC:<line>`): COMPLIANT — 0 `ts:line`
  citations; one cosmetic missing-citation ([DOC] above), not a format violation.
- **error-handling catch narrowing** (checklist #11): ONE low match at test:77 (see [RULE]).
- **COLUMN-major applied to BOTH blit sites + byte-length guard intact**: COMPLIANT
  (verified programmatically for all glyphs/objects).

### Devil's Advocate
Assume this render is broken. First attack: the transpose is a coincidence — maybe
column-major just happens to make 'D' look right while silently corrupting other glyphs
or objects. Rebuttal: the fix is not eyeballed on one glyph; rule-checker mutation-tested
it (revert → only the 'D' test reddens), the byte-length invariant `length==width*height`
was verified for all 43 glyphs so `col*height+row` can never go out of bounds, and the
screenshot shows a full legible "DEFENDER" (8 distinct letters) plus a coherent ship and
terrain — a coincidence would not survive eight different letterforms. Second attack: the
still-frame tests are vacuous — they assert "pixels exist in a band" which any garbage
frame satisfies. Rebuttal: the tests distinguish column-major from row-major structurally
(the 'D' left-stroke is solid for rows 0..6 and the top bar is contiguous x=1..4 — both
FALSE under row-major, which dots those cells), the bottom-vs-top column-count gate is a
magnitude check that a flipped frame fails, and the ≥3-distinct-colours check forces a
third element beyond text+terrain. Live probing showed wide margins, not borderline
passes. Third attack: this GREEN silently rewrote two APPROVED stories' core code — scope
creep that could regress df2-3/df2-4. Rebuttal: those stories' blit suites are
packing-agnostic BY DESIGN and their own comments name df2-6 as the owner of this exact
decision; both suites stayed green, the byte gates are untouched (bytes unchanged), and
the change is documented as a design deviation. Fourth attack: a degenerate
`composeStaticFrame(0,0)` or huge dims could throw or hang. Rebuttal: dims flow into the
existing framebuffer/blit contracts (unchanged), blits clip, and the shell's render() is
separately proven safe on a 0×0 canvas (render.test.ts). Fifth: the colorIndex overflow
([SEC]) — a caller passing 200 would invent a colour. Rebuttal: real; but no such caller
exists, and the composition-layer `≤15` test would catch it. Nothing rises to blocking.

### Deviation audit
See `## Design Deviations` → `### Reviewer (audit)`.

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Improvement / non-blocking:** `main.ts` was intentionally left as a bare
  `clear(fb, 0)` by df2-1..df2-5 (blank surface); this is expected, not a regression —
  df2-6 is exactly the story that wires the integrated still. `render.test.ts` already
  forward-references this suite ("the full pixel result is proven by the df2-6 VISUAL
  check"), confirming scope. No upstream conflicts.

### Reviewer (code review)
- **Improvement** (non-blocking): `blitGlyph` (`plugins/defender/src/core/charset.ts:83`)
  writes the caller's `colorIndex` with no 0..15 range check, unlike `blitTerrain`. A
  colour >15 would be stored and shell-decoded as `CRAM[i & 0x0f]` — an invented mapping.
  Pre-existing from df2-3, not introduced here; the composition-layer `≤15` test guards it.
  Consider mirroring `blitTerrain`'s throw in a future df2-3 touch. *Found by Reviewer.*
- **Improvement** (non-blocking): `objects.ts` header claims UFOP1/PLAPIC read column-first
  but omits the ROM citation its sibling `charset.ts` carries. Affects
  `plugins/defender/src/core/objects.ts` (add `defender/DEFB6.SRC:1961 PLAPIC`). *Found by Reviewer.*
- **Improvement** (non-blocking): `still-frame.test.ts:77` `catch (e) { (e as Error).message }`
  lacks an `instanceof Error` narrow (lang-review #11) — a repo-wide RED-phase idiom across
  all df2 test files, candidate for a shared narrowing helper someday. *Found by Reviewer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev] Image-cell decode row-major → column-major (charset.ts, objects.ts).** df2-3/df2-4
  shipped `blitGlyph`/`blitObject` reading cells row-major (`bytes[row*width+col]`) and
  explicitly deferred the orientation to df2-6's visual playtest. The playtest rendered a
  garbled title; the ROM cell is column-major (`bytes[col*height+row]`, proven from
  LETTRD/UFOP1/PLAPIC). Transposed both (one line each). Not a spec change — it is the
  orientation df2-6 was created to settle; the packing-agnostic blit suites stayed green.

### Reviewer (audit)
- **[Dev] row-major → column-major cell decode** → ✓ ACCEPTED by Reviewer: this is
  precisely the orientation df2-3/df2-4 deferred to df2-6 (their comments name it). The
  transpose is applied consistently to both blit sites, the `bytes.length==width*height`
  guard keeps `col*height+row` in bounds for every glyph/object, it is mutation-tested
  (revert reddens only the 'D' lock), and the packing-agnostic df2-3/df2-4 suites stayed
  green. No undocumented deviations found.