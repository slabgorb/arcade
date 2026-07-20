---
story_id: "cp2-14"
jira_key: "cp2-14"
epic: "cp2"
workflow: "tdd"
---
# Story cp2-14: Global orientation flip — cellScreenX + input sign chain match the upright cabinet

## Story Details
- **ID:** cp2-14
- **Jira Key:** cp2-14
- **Workflow:** tdd
- **Stack Parent:** cp2-12
- **Repos:** centipede
- **Points:** 3
- **Priority:** p2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-20T09:32:35Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T01:01:28Z | 2026-07-20T01:03:26Z | 1m 58s |
| red | 2026-07-20T01:03:26Z | 2026-07-20T01:22:00Z | 18m 34s |
| green | 2026-07-20T01:22:00Z | 2026-07-20T04:19:37Z | 2h 57m |
| review | 2026-07-20T04:19:37Z | 2026-07-20T09:32:35Z | 5h 12m |
| finish | 2026-07-20T09:32:35Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): The story's derivation routes through MAME, but the flip is
  provable from the vendored 1981 Atari source alone — MOVE's own clamp comments label the
  edges (`CENTI4.MAC:1505-1512`: `0F4 ... ;IF NOT AT LEFT EDGE`, `0B ... ;IF NOT AT RIGHT EDGE`).
  Both bytes are already transcribed in the clone with Atari's labels intact.
  Affects `docs/rom-study/claims/` (a claim pinning the two edge bytes to CENTI4.MAC:1505-1512
  would make the orientation machine-verified by the citation gate, not just by unit tests).
  *Found by TEA during test design.*
- **Gap** (non-blocking): Three independent mirror-invariances made this bug invisible to the
  whole suite, and two of them will hide the NEXT orientation regression too: the gun's rest
  position `h=0x80` maps to x=112 under either orientation, and the high-score HUD band h12-17
  mirrors onto itself (29-17=12, 29-12=17). Any future orientation pin staged at rest, or on the
  high score, is vacuous by construction.
  Affects `tests/` generally (stage orientation pins at the ROM edges, never at centre).
  *Found by TEA during test design.*
- **Question** (non-blocking): `src/shell/atlas.ts`'s per-stamp ROT270 bake (cp2-1) is a SEPARATE
  decomposition of the same cabinet rotation and was tuned by eyeball against the MIRRORED field.
  Reasoning says it is unaffected — a mirrored cell POSITION never touches the tile's own pixels,
  and cp2-12's HUD digits read correctly — so it needs no change here, and the RED suite pins
  that glyphs still read MSD-first. Worth one human glance at the AC-1 screenshot anyway.
  Affects `src/shell/atlas.ts` (no change expected; confirm visually, do not "fix" pre-emptively).
  *Found by TEA during test design.*
- **Conflict** (non-blocking): The SM handoff's caution #4 (citation-gate line re-anchoring after
  any edit, incl. comments) does NOT apply to this story. centipede's gate pins line numbers in
  the VENDORED ROM/MAME sources, not in clone files — clone-side prose mentions `src/shell/render.ts`
  but nothing anchors to its lines. Editing `layout.ts`/`render.ts` cannot shift a claim. Verified:
  the citation suite is green on the RED tree.
  Affects nothing (removes a constraint Dev would otherwise work around).
  *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): The centipede enters ON the reserved HUD row, so at spawn the train
  sits across the high-score digits. `CENT_ENTER_V = 0xf8` (CT-4, CENTI4.MAC:489 "top of
  screen") maps through `gunScreenY` to row 31 — which is `PLYFLD_HEIGHT - 1`, the same row
  cp2-12 reserved for the HUD (v=0x1F). Visible in the AC-1 screenshot: the parked train
  overlaps the h12-17 high-score band. PRE-EXISTING and unrelated to this story — cp2-14 changed
  nothing on the vertical axis — but it means the reserved row is not actually reserved.
  Either the entry V or the HUD row is off by one row's worth of pixels; worth one story to
  settle which against CENTI4.MAC.
  Affects `src/core/centipede.ts` (CENT_ENTER_V) or `src/shell/render.ts` (hudY) — decide from
  the ROM, do not just nudge one.
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): TEA's Question about `src/shell/atlas.ts` is answered and can
  be closed. The per-stamp ROT270 bake needed no change: the live screenshot shows glyphs
  reading correctly left-to-right after the flip (score "000000" at h0-5, high score at h12-17),
  confirming that mirroring cell POSITIONS never touched tile pixels.
  Affects `src/shell/atlas.ts` (no change needed — confirmed visually as TEA asked).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `InputCounts` is now the contract for a sign convention it
  does not document. Its doc comment (`src/core/player.ts:56-58`) and the module's own
  "THE COMP SIGN CONVENTION" header (`:18-25`) both spell out `+dv = up` and say the shell owns
  the translation — but neither says anything about `dh`, which cp2-14 has just made equally
  load-bearing and considerably less guessable (`+dh` drives PLAYH toward 0xF4 and therefore
  moves the gun screen-LEFT). The convention IS documented, but only in `src/shell/input.ts`,
  which is not the file a future adapter author reads. TEA's own deviation note predicted the
  hazard verbatim: "Any future adapter (gamepad, touch) must negate device-right too."
  Affects `src/core/player.ts` (extend the InputCounts doc comment and the COMP header to state
  the H convention alongside V — a comment-only change; centipede's citation gate pins vendored
  ROM lines, not clone lines, so nothing re-anchors).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): At `lives == 6` the HUD lives band overruns the high-score band by 8px.
  The GUN icon blits at width `SPRITE_H` (16) on an 8px column pitch, so six icons span x=48..104
  while the high score starts at `cellScreenX(12)` = 96. Measured, not estimated. This is
  PRE-EXISTING and cp2-14 strictly IMPROVES it — before the flip the same 16-on-8 overrun
  collided with the P1 score at *every* `lives >= 1` (icons ...200 vs score from 192); now it is
  clean up to lives=5 and only bites at the cap. Flagged because the flip changed *which*
  neighbour gets clobbered, so anyone who remembers the old symptom will look on the wrong side.
  Affects `src/shell/render.ts:180` (the lives loop) — settle the icon footprint against
  CENTI4.MAC:920-932 / CL-15 rather than nudging the anchor.
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): The render-recorder test idiom cannot see blit WIDTH, which is why the
  finding above is invisible to a green suite. `makeRecorder`'s `drawImage` mock
  (`tests/orientation-flip.test.ts:100`) declares seven parameters and captures only `x`/`y`;
  the real call passes nine, with `w`/`h` last. Every HUD pin in the suite therefore asserts
  anchor positions and never footprints, so any overlap defect is structurally unreachable.
  Also: no test stages `lives = 6`, the maximum `livesShown` permits.
  Affects `tests/orientation-flip.test.ts` / `tests/render.test.ts` (capture w/h in the recorder
  and add a lives=6 case) — cheap, and it retires a whole class of blind spot.
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): cp2-14 silently fixed a second, unclaimed ROM-fidelity defect
  that nobody logged. Claim `08-render-color.json:179` (CHAR advances +0x20 per glyph) means the
  six score digits occupy ASCENDING ROM columns with the MSD at the LOWEST h. Under the mirror,
  `drawText` anchored at `cellScreenX(5)` and advanced rightward in SCREEN space, walking ROM
  columns h5 → h0 — so the MSD sat at h5, backwards against that claim. The new `cellScreenX(0)`
  anchor puts the MSD at h0 and makes the clone agree with a claim the citation gate already
  verifies. Worth recording so the fix is not re-litigated as arbitrary.
  Affects `docs/rom-study/claims/` (nothing to change; this is provenance for the anchor choice).
  *Found by Reviewer during code review.*
- **Question** (non-blocking): Two stray untracked artifacts sit at the ORCHESTRATOR root —
  `cp2-14-canvas.txt` and `cp2-14-orientation.png` — almost certainly Dev's AC-1 canvas-pixel
  sampling output. They are outside the centipede repo and in no commit, so they do not affect
  this PR; they will otherwise linger in `git status` for every future session in this checkout.
  Affects nothing in the deliverable (delete at SM finish).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

3 deviations

- **Re-pinned 12 existing tests across 6 files, not the 3 files the story names**
  - Rationale: the story's list was written from the cp2-12 review, before anyone had run the
  - Severity: minor
  - Forward impact: the PR touches 4 files the story text does not mention — expected, not scope creep.
- **The input sign chain is re-pinned at the shell ADAPTER, fixing the meaning of `InputCounts.dh`**
  - Rationale: core MOVE is byte-faithful — it does `ADC PLAYH` with the raw TB count
  - Severity: minor
  - Forward impact: `InputCounts.dh` is now unambiguously a ROM TB count on both axes. Any future
- **Two of the 14 new tests are preservation fences, green before the change**
  - Rationale: a green-before-the-change test normally refutes nothing (a standing TEA gotcha), so
  - Severity: minor
  - Forward impact: none — they must simply stay green.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- No deviations from spec. The five edits TEA scoped were implemented exactly as specified,
  all within `src/shell`; `src/core` was not touched. Comments in the three edited files were
  rewritten where they asserted the old mirror as correct — leaving a comment that contradicts
  the code it documents would have been worse than the bug.

### TEA (test design)

- **Re-pinned 12 existing tests across 6 files, not the 3 files the story names**
  - Spec source: context-story-cp2-14.md, AC-2 / story description
  - Spec text: "Re-pin sign-chain.test.ts, the cp2-7 hitbox pins, and the cp2-12 order-agnostic
    HUD tests"
  - Implementation: the actual break set, measured by applying a trial fix and running the full
    suite, is `layout.test.ts` (2), `hitbox-alignment.test.ts` (2), `input.test.ts` (3),
    `input-distribution.test.ts` (4 assertions), `input-lifecycle.test.ts` (1),
    `pointer-lock.test.ts` (1). Of the three files the story names, `sign-chain.test.ts` and the
    cp2-12 HUD tests did NOT break — both are mirror-invariant (see Delivery Findings), so there
    was nothing to re-pin; they were STRENGTHENED instead. The four input files the story does
    not name broke because the sign chain's negation lands in the shell input adapter.
  - Rationale: the story's list was written from the cp2-12 review, before anyone had run the
    flip. Re-pinning only the named files would leave 8 real failures for Dev to discover and be
    tempted to "fix" by weakening. Every re-pin flips an expected VALUE or DIRECTION; no
    assertion was relaxed, and each carries a comment naming the ROM line that forced it.
  - Severity: minor
  - Forward impact: the PR touches 4 files the story text does not mention — expected, not scope creep.

- **The input sign chain is re-pinned at the shell ADAPTER, fixing the meaning of `InputCounts.dh`**
  - Spec source: context-story-cp2-14.md, AC-2
  - Spec text: "device-right-to-screen-right must still hold AFTER the flip"
  - Implementation: exactly one link in device -> dh -> h -> screenX must negate to preserve the
    feel once `gunScreenX` reverses. The tests pin that link in the shell adapter (`+movementX`
    and ArrowRight now yield NEGATIVE dh), not in core `movePlayer`.
  - Rationale: core MOVE is byte-faithful — it does `ADC PLAYH` with the raw TB count
    (CENTI4.MAC:1490-1497), so negating in core would break transcription fidelity. The shell
    already owns exactly this translation on the other axis (`dv -= movementY`, "the core
    contract is +dv = up"), and `InputCounts`' own doc comment says the shell owns the ROM's
    sign. The H axis never got that treatment only because the renderer was mirrored instead.
  - Severity: minor
  - Forward impact: `InputCounts.dh` is now unambiguously a ROM TB count on both axes. Any future
    adapter (gamepad, touch) must negate device-right too. NOTE: the trackball's hardware polarity
    is not transcribable from the source (it is wiring, not code) — this direction is DERIVED from
    the proven edge labels plus AC-2, and is flagged as such rather than cited to a ROM line.

- **Two of the 14 new tests are preservation fences, green before the change**
  - Spec source: context-story-cp2-14.md, AC-3
  - Spec text: "Orientation becomes testable: at least one render test pins ABSOLUTE left/right
    field placement"
  - Implementation: 12 of 14 new tests are RED drivers; 2 are green-on-arrival guards (the cp2-7
    hitbox contract, and the no-canvas-mirror guard).
  - Rationale: a green-before-the-change test normally refutes nothing (a standing TEA gotcha), so
    both were proven DISCRIMINATING by injecting the wrong implementation and watching each fail
    alone: `LOGICAL_W - h` breaks the hitbox fence (sprite centre lands in the next tile for 1 h
    in 8), and `ctx.scale(-1,1)` breaks the mirror fence. They are fences, not drivers, and are
    labelled as such in the file.
  - Severity: minor
  - Forward impact: none — they must simply stay green.

### Reviewer (audit)

Every logged deviation stamped. No undocumented deviation found: I diffed
`origin/develop...HEAD` in full and every source change maps to TEA's five scoped edits.

- **Dev — "No deviations from spec; five edits as scoped, comments rewritten where they asserted
  the old mirror"** → ✓ ACCEPTED by Reviewer: verified exhaustively, not on assertion. `grep` for
  every consumer of `cellScreenX`/`gunScreenX`/`LOGICAL_W` across `src/` returns render.ts and
  main.ts only; main.ts:136 blits the logical backbuffer straight through with no transform, so
  render.ts is the single h-anchored surface and all of it moved together. `src/core` is untouched
  in the diff. The comment rewrites were mandatory, not cosmetic — `layout.ts`'s carry-forward-5
  header instructed the reader that "grid column 0 must be drawn at the RIGHT edge", which the
  same commit made false.
- **TEA — "Re-pinned 12 existing tests across 6 files, not the 3 the story names"** → ✓ ACCEPTED
  by Reviewer: I read all 12 re-pins line by line specifically hunting for a weakened assertion
  and found none. Every one flips an expected VALUE or DIRECTION and keeps its original strength:
  `.toBe(7)`→`.toBe(-7)`, `.toBeGreaterThan(0)`→`.toBeLessThan(0)`, `.toBe(1)`→`.toBe(-1)`. No
  `toBeCloseTo`, no loosened bound, no deleted assertion, no `.skip`. Conservation pins keep their
  magnitude (`totalDh` 10→-10, 6→-6, TOTAL→-TOTAL). The story's file list was written from the
  cp2-12 review before anyone had run the flip; TEA measured the real break set instead. That is
  the correct order of operations, and the four extra files are consequence, not scope creep.
- **TEA — "Input sign chain re-pinned at the shell ADAPTER, fixing the meaning of
  `InputCounts.dh`"** → ✓ ACCEPTED by Reviewer: this is the right seam and I verified the
  fidelity argument against primary source rather than taking it. CENTI4.MAC:1493-1497 is a bare
  `ADC PLAYH` with no `JSR COMP` on the horizontal read, while the vertical at :1524 *does* carry
  `JSR COMP ;DIRECTIONS ARE REVERSED RELATIVE TO MOTION OBJECT VIDEO`. Negating in core would have
  invented a complement the ROM does not perform on that axis. The shell already owned exactly
  this translation for V. One caveat, and TEA flagged it honestly rather than dressing it up: the
  trackball's hardware H polarity is wiring, not code, so "device-right == screen-right" is a
  DERIVED playability requirement (AC-2), not a transcribed one. Correctly labelled as derived.
  See my Delivery Finding on documenting the resulting `dh` convention where adapter authors
  will actually read it.
- **TEA — "Two of the 14 new tests are preservation fences, green before the change"** → ✓
  ACCEPTED by Reviewer: a green-on-arrival test is normally a refutation of nothing, and TEA
  pre-empted that by proving each one discriminating through injection. I re-derived the hitbox
  fence independently: `gunScreenX(h) + SPRITE_H/2` reduces to exactly `delta`, and
  `obstacleCellFor(h,v,0).h` is `(delta & 0xf8) >> 3` = `delta >> 3` over the whole clamp range,
  so the centre lands `delta & 7` into its own tile for every h — while `LOGICAL_W - h` pushes it
  one pixel past the boundary whenever `(delta & 7) == 7`. The fence fails on precisely that and
  nothing else. Both are labelled as fences in the file, which is what keeps them honest.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 26 failing / 574 total, 8 files. Ready for Julia (Dev).

**Test Files:**
- `tests/orientation-flip.test.ts` — NEW, 14 tests. The cp2-14 driver suite: absolute grid and
  field placement, absolute + order-sensitive HUD pins, the input sign chain asserted as both
  halves in one test, and the ROM edge labels pinned through `gunScreenX`.
- `tests/sign-chain.test.ts` — +2 tests (drive to the stops, assert the ROM clamp AND the screen
  side). The existing relative pins were kept.
- `tests/layout.test.ts`, `tests/hitbox-alignment.test.ts` — 4 re-pins (direction).
- `tests/input.test.ts`, `tests/input-distribution.test.ts`, `tests/input-lifecycle.test.ts`,
  `tests/pointer-lock.test.ts` — 8 re-pins (adapter sign).
- `tests/render.test.ts` — comment only; corrected a header claiming its order-agnostic pins pass
  "however Dev resolves the reversal". That sentence is the defect this story exists to fix.

**Tests Written:** 16 new, 12 re-pinned, covering 3 ACs.

### The derivation, re-opened against primary source

I did not take the handoff's MAME chain on trust. The flip is provable from the vendored 1981
Atari source alone: MOVE labels its own horizontal clamps (`CENTI4.MAC:1505-1512`) —
`CMP I,0F4 / BCC 3$ ;IF NOT AT LEFT EDGE` and `CMP I,0B / BCS 10$ ;IF NOT AT RIGHT EDGE`. A
higher pixel-H is further LEFT on the real cabinet. Both bytes are already in the clone with
Atari's labels intact (`src/core/player.ts:38-39`), and the renderer contradicts them: measured
this session, `gunScreenX(0x0B) = -5` (left, off-screen) and `gunScreenX(0xF4) = 228` (right).
**The clone's own constants convict its own renderer.** I re-confirmed the MAME half too
(ROT270 at `centiped.cpp:2377`, TILEMAP_SCAN_ROWS at `centiped_v.cpp:93`, no tilemap flip at
`:414-419`) — it agrees, and the same transform re-derives the vertical axis as already correct,
which is why only the h-axis moves.

### Why 558 green tests never saw this

Three mirror-invariances, measured rather than assumed:

1. The gun's rest position `h=0x80` maps to x=112 under **both** orientations.
2. The high-score band h12-17 mirrors onto itself (29-17=12, 29-12=17) — anchor x=96 either way.
3. cp2-12's HUD pins read **sorted multisets** out of bands **derived from `cellScreenX` itself**,
   so the band moves with the mirror and the sort discards reading order.

`sign-chain.test.ts` was hit by (1) and by being purely relative — which is precisely why it
stayed green through my trial fix. Every new pin is therefore absolute: a literal screen
coordinate, or a left/right relation between two absolute coordinates.

### Verified GREEN-able — and the fences verified discriminating

A RED suite Dev cannot turn green is worthless, so I applied a trial fix (`cellScreenX -> col*TILE_W`;
`gunScreenX` sub-cell `7-(delta&7) -> delta&7`; adapter H sign; HUD anchors `cellScreenX(5)->(0)`
and `(17)->(12)`) and got **574/574 green with `tsc --noEmit` clean**. That trial was reverted
before commit — Dev receives a genuine RED tree. It also flushed out one real staging bug in my
own suite (deriving the HUD row as "the topmost blit" finds a centipede segment, not the HUD).

Both green-on-arrival fences were proven to fail under a wrong implementation:

| Fence | Wrong implementation injected | Result |
|---|---|---|
| cp2-7 hitbox contract | `gunScreenX = LOGICAL_W - h` | fails alone — centre lands in the next tile for 1 h in 8 |
| no canvas mirror | `ctx.translate(W,0); ctx.scale(-1,1)` | fails alone — would mirror-write every glyph |

The second is the trap worth flagging to Dev: a one-line canvas mirror flips the field *and*
reverses every digit. **The flip must be a coordinate change.**

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) / action | Status |
|------|------------------|--------|
| #1 type-safety escapes (`as unknown as`) | removed the `RenderWithHigh` double-cast — `render` already takes the 4th param; the two remaining casts are the house partial-mock idiom (`render.test.ts` precedent) | fixed |
| #1 non-null assertion `!` | `exec(...)![1]` is guarded by filtering on the same regex first | pass |
| #2 `readonly` on non-mutated params | `digitsLeftToRight(blits: readonly Blit[], …)` | pass |
| #4 `??` vs `\|\|` | `pending ?? '<none>'`, `map.get(t) ?? []` — nullish, not falsy | pass |
| #8 test quality — mock signatures | recorder's `drawImage`/`rect` match the real call shapes render uses | pass |
| #8 test quality — vacuous assertions | audited all 16; the 2 green-on-arrival tests proven discriminating by injection (table above) | pass |

**Rules checked:** 6 of 13 applicable (React/JSX, async, build-config, security-validation,
enum, and bundle sections do not apply to a synchronous pure-geometry render suite).
**Self-check:** 0 vacuous tests. No `let _ =`, no `assert(true)`, no assertion weakened in any
of the 12 re-pins — each flips an expected value or direction and cites the ROM line forcing it.

### For Julia (Dev)

The whole change is small — 5 edits — but they must land **together**:

1. `layout.ts` `cellScreenX` -> `col * TILE_W`.
2. `layout.ts` `gunScreenX` sub-cell -> `delta & 7` (mirrors cellScreenX's flip; keeps the
   `- SPRITE_H/2` structure). Do **not** reach for `LOGICAL_W - h` — off by one, fence catches it.
3. `input.ts` — negate the H axis in BOTH adapters, exactly as `dv` already does.
4. `render.ts` HUD anchors -> `cellScreenX(0)` and `cellScreenX(12)` (the band's low column;
   the old `(5)`/`(17)` were the mirror's special-casing that AC-1 wants gone).
5. Nothing in `src/core` — the core is byte-faithful and stays untouched.

AC-1 also wants a **screenshot from this checkout** committed. Heed the standing trap: port 5278
may be served by a sibling checkout, so verify whose tree answers (`lsof`) or serve on a spare port.

**Handoff:** To Julia (Dev) for GREEN.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 574/574 passing (GREEN) · `tsc --noEmit` clean · `vite build` clean
**Branch:** `feat/cp2-14-global-orientation-flip` (pushed)

**Files Changed:** five edits, all in `src/shell`. `src/core` untouched — MOVE is a byte-faithful
`ADC PLAYH` and must stay that way.

- `src/shell/layout.ts` — `cellScreenX` -> `col * TILE_W` (ROM h=0 at the LEFT edge);
  `gunScreenX` sub-cell -> `delta & 7`, which reduces the function to `LOGICAL_W - 1 - h`.
- `src/shell/input.ts` — both adapters emit ROM-signed H counts (device-right is a NEGATIVE
  count, driving PLAYH toward 0x0B, the cabinet's right edge).
- `src/shell/render.ts` — HUD anchors moved to their band's low column, `cellScreenX(0)` and
  `cellScreenX(12)`.
- `docs/rom-study/screenshots/cp2-14-orientation-flip.png` — the AC-1 deliverable.

Comments in all three files were rewritten where they documented the mirror as correct. That was
not cosmetic: `layout.ts`'s carry-forward-5 header explicitly instructed the reader that "grid
column 0 must be drawn at the RIGHT edge", which is now false.

### The one real trap, and the fence that caught it

The obvious mirror is `gunScreenX = LOGICAL_W - h`. It is wrong by one pixel: the sprite centre
lands in the NEXT tile whenever `(delta & 7) == 7` — one h value in eight — silently breaking
cp2-7's guarantee that the gun draws over the column its own shot collides in. TEA's hitbox
fence fails on exactly that and nothing else, so the correct form is `LOGICAL_W - 1 - h`, which
puts the centre exactly on `delta`, inside collision column `delta >> 3` for every h. I kept it
expressed as `cellScreenX(col) + subCell - SPRITE_H/2` so the relationship to the collision
column stays visible in the code rather than collapsing into a magic constant.

### AC-1 verified live, from THIS checkout

The standing trap was live: **port 5278 was being served by the `a-3` checkout**, so screenshotting
it would have verified someone else's code. Confirmed with `lsof`, then served my own tree on 5288
and left a-3's server alone. Sampling the real canvas pixels (not just eyeballing) gives, in ROM
columns: score at **h0-h5** hard against the left edge, high score at **h12-h17** centred — the
classic cabinet layout, with no HUD special-casing. Screenshot committed.

**Self-review:** wired through the real shell entry (the flip is in the same functions `main.ts`
already calls — no new seams); follows the project's core/shell split; all three ACs met; no debug
code; working tree clean. Two Delivery Findings logged, one of which (the centipede entering on
the reserved HUD row) is a genuine pre-existing defect this story's screenshot exposed but
deliberately did not fix — no failing test demanded it.

**Handoff:** To the Thought Police (Reviewer).

## Sm Assessment

**Setup complete — routing to O'Brien (TEA) for RED.**

**Story shape.** 3pt bug, `centipede`, TDD, gitflow. Branch
`feat/cp2-14-global-orientation-flip` cut from `origin/develop` (up to date, clean
tree). Context written to `sprint/context/context-story-cp2-14.md` with the
byte-derived derivation intact and three concrete ACs.

**Pre-flight checks I ran (results, not assumptions):**

- **No sibling-checkout race.** Memory warns that parallel checkouts (`a-1`/`a-2`/`a-3`)
  can work the same backlog story invisibly. Fetched centipede: no `cp2-14` commits on
  `origin/develop`, no `cp2-14` branch on any remote. This checkout owns the story.
- **Merge gate — false positive, consciously bypassed.** star-wars PR #116 (`sw7-10`,
  non-draft, story status `backlog`) would normally block new work. That branch does
  **not** exist in this checkout and the PR was created minutes before setup — it is a
  sibling checkout's live in-flight work, not mine to merge. Waiting on it would
  deadlock. Different repo, different epic, no shared files with cp2-14. Proceeding is
  the correct call; flagged here so the record shows it was a decision, not an oversight.

**Guidance for TEA — where this story is likely to go wrong:**

1. **The flip must be global and atomic.** `cellScreenX`, the input sign chain,
   `gunScreenX`, and *every* h-anchored render site flip TOGETHER. A partial flip is
   worse than no flip: it desynchronizes the field from the HUD, and the cp2-12 HUD is
   the only reason this bug is visible at all. Grep every consumer of `cellScreenX`
   before writing the first test.
2. **Order-agnostic pins cannot catch a mirror.** This is the reviewer's LOW finding and
   it is the crux of AC-3. The existing cp2-12 HUD tests assert multisets — a mirrored
   field passes them unchanged. RED must add at least one **absolute** left/right
   placement pin. A test that would pass both before and after the flip is not a test of
   this story.
3. **Re-pinning is not weakening.** `sign-chain.test.ts` and the cp2-7 hitbox pins will
   go red by design — they encode the mirrored geometry. Re-anchor them to the corrected
   orientation; do not relax an assertion to make it pass. AC-2 explicitly forbids that,
   and device-right must still move the gun screen-right *after* the flip.
4. **Citation gate.** centipede runs a citation gate (129 claims as of cp1). Any edit to
   a cited file — **including comment-only edits** — shifts pinned lines and breaks
   `npm test -- citations`. Re-anchor after any edit to `layout.ts` and friends.
5. **Pure-core boundary.** `layout.ts` sits near the core/shell line. Keep the flip
   deterministic and free of shell globals; centipede's boundary scanner reads source
   text including comments.

**Not my call to make, deliberately left open for TEA/Dev:** whether the flip is best
expressed as a change to `cellScreenX`'s formula or as a single orientation constant
threaded through the h-anchored sites. That is a design decision, not a coordination one.
## Subagent Results

Only `preflight` is enabled in this project (`pf settings get workflow.reviewer_subagents` →
every other key is `false`). Disabled specialists are pre-filled per the gate's rule, and I
performed each disabled specialist's analysis **myself** — a disabled subagent is not a claim
of coverage, so the domains below are covered by my own reading of the diff, cited inline in
the assessment.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (2 housekeeping notes) | confirmed 1, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | N/A — Disabled via settings; boundary analysis done by Reviewer |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | N/A — Disabled via settings; failure-path analysis done by Reviewer |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings; test analysis done by Reviewer |
| 5 | reviewer-comment-analyzer | Yes | Skipped | disabled | N/A — Disabled via settings; doc analysis done by Reviewer |
| 6 | reviewer-type-design | Yes | Skipped | disabled | N/A — Disabled via settings; type analysis done by Reviewer |
| 7 | reviewer-security | Yes | Skipped | disabled | N/A — Disabled via settings; security analysis done by Reviewer |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | N/A — Disabled via settings; complexity analysis done by Reviewer |
| 9 | reviewer-rule-checker | Yes | Skipped | disabled | N/A — Disabled via settings; full 13-rule enumeration done by Reviewer below |

**Preflight results:** tests 574/574 GREEN (1.15s) · `tsc --noEmit` clean · `vite build` clean ·
citation gate 26/26 GREEN · working tree clean · branch pushed and current · 0 code smells
(no `console.log`, TODO/FIXME, commented-out code, or `.skip`). No PR open yet — correct, SM
opens it at finish. Preflight's one substantive note (two stray untracked artifacts at the
orchestrator root) is CONFIRMED and logged as a Delivery Finding.

**All received:** Yes (1 returned with results, 8 pre-filled as disabled and covered by Reviewer)
**Total findings:** 5 confirmed (all non-blocking), 0 dismissed, 0 deferred

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks). centipede has no
`CLAUDE.md`, `SOUL.md`, or `.claude/rules/` of its own; the orchestrator `CLAUDE.md`'s binding
rule for this repo is the **`src/core` / `src/shell` split** ("the single most important rule in
every game repo"). Enumerated exhaustively over the 3 changed source files and 9 changed test
files — every instance, not one exemplar per rule.

| # | Rule | Every instance in the diff | Verdict |
|---|------|---------------------------|---------|
| — | **core/shell split** (CLAUDE.md) | All 5 edits land in `src/shell/{layout,input,render}.ts`. `git diff origin/develop...HEAD -- src/core` is EMPTY. `movePlayer` stays a byte-faithful `ADC PLAYH` (player.ts:117-141); the sign translation lives in the adapter, matching how `dv` was already handled. | compliant |
| 1 | Type-safety escapes | `as unknown as` ×2 — orientation-flip.test.ts:123 (`ctx`, `atlas` partial mocks). No `as any`, no `@ts-ignore`, no `@ts-expect-error`. Non-null `!` ×2: `:212` `exec(...)![1]` guarded by the identical regex filter at `:211`; `:154` `map.get(t)!` guarded by the `if (!map.has(t)) map.set(...)` on the line above. Commit fed8411 *removed* an unneeded `RenderWithHigh` double-cast. | compliant (see LOW-1 — the 2 mock casts are the repo's established idiom, severity downgraded with rationale, not dismissed) |
| 2 | Generic/interface pitfalls | `Record<string, unknown>` (never `any`) on every event payload — input.ts:30-31,50,59,62; orientation-flip.test.ts:145-147. `readonly Blit[]` on `digitsLeftToRight` (:209). `Partial<SimState>` on `bareSim` (:127) is a spread-override, its correct use. No `object`, no `Function`, no `Omit<T, string>`. | compliant |
| 3 | Enum anti-patterns | Zero enums in the diff. | N/A |
| 4 | Null/undefined | `??` ×4, all genuinely nullish, none where `\|\|` would differ harmfully: input.ts:55,57 `e.movementX ?? 0`; orientation-flip.test.ts:101 `pending ?? '<none>'` (`pending` is `string \| null`, `''` would be a valid stamp name); `:160` `map.get(t) ?? []`. Zero `\|\|` on a nullable. No unchecked `Map.get()`. | compliant |
| 5 | Module/declaration | `import type { Atlas }` (:74) and inline `type SimState` (:73) correctly type-only. Extensionless relative imports match every existing file (Vite/bundler resolution, repo-wide). No `declare`, no `/// <reference>`. | compliant |
| 6 | React/JSX | No `.tsx` in the repo. | N/A |
| 7 | Async/Promise | No async added. `input-distribution.test.ts`'s pre-existing `run()` is awaited at every call site (:49,58,66). `createPointerLock.request` untouched. | compliant |
| 8 | Test quality | No `as any` in any assertion. Mock call-shapes match: `atlas.rect(name)` and `drawImage` pair correctly with `blit`'s real sequence (render.ts:91-92). Tests import `../src/...`, never `dist/`. Zero vacuous assertions — the 2 green-on-arrival fences were proven discriminating by injection, and I re-derived the hitbox one independently. | **finding** — the `drawImage` mock captures 7 of 9 params, dropping `w`/`h`; see MEDIUM-1 |
| 9 | Build/config | `tsconfig.json` and `vite.config.ts` untouched. Strict mode unchanged. | compliant |
| 10 | Security: input validation | Only external inputs are DOM `movementX`/`movementY` (coerced via `Number(... ?? 0)`) and `e.key` (coerced via `String()`), both in input.ts. No parsing, no network, no storage, no `JSON.parse`, no `as T` on untrusted data. | compliant |
| 11 | Error handling | No `catch` added. `glyphStamp`'s throw-on-unknown-character (layout.ts:128) is unchanged. | compliant |
| 12 | Performance/bundle | `cellScreenX` got strictly cheaper (one multiply, was subtract+multiply). Render loop shape unchanged. No barrel imports, no sync fs. | compliant |
| 13 | Fix-introduced regressions | Three commits re-scanned. fed8411 removes a cast rather than adding one to silence an error; bce7478 introduces no `as any`, no `\|\|`-for-`??`, no weakened type. | compliant |

### Devil's Advocate

Let me argue this branch is broken. The strongest attack is that the whole story flips the field
the **wrong way**, and does it so confidently — with ROM citations, MAME cross-checks, 14 new
tests and a screenshot — that nobody would think to re-open it. Two derivations are offered, and
on first reading they contradict each other. The clamp labels say PLAYH `0xF4` is the LEFT edge,
i.e. a *higher* h is further left. The MAME chain says ROM h=0 lands at display LEFT, i.e. a
*higher* h is further right. If that contradiction were real, the branch would have flipped one
axis with two incompatible justifications and shipped a field that is still mirrored, now with
the tests re-pinned to bless it — the worst possible outcome, because the suite would defend the
bug. So I chased it. The contradiction is illusory, and the resolution is `OBSTAC`: the two "h"s
are different coordinate systems. The clamp labels talk about motion-object pixel `PLAYH`; MAME
talks about the tilemap/videoram grid column. `obstacleCellFor` converts between them by
*reversing* about `0xF7` (`(0xF7 - h) & 0xF8) >> 3`), so `PLAYH = 0xF4` → grid column 0, and grid
column 0 is display-LEFT under ROT270. Both derivations land on the same screen. The
implementation encodes exactly this: `cellScreenX` runs left-to-right in GRID space, `gunScreenX`
routes PLAYH through the OBSTAC reversal *before* calling it, and the two therefore disagree in
sign on purpose. I verified both citations at their sources rather than trusting the transcript:
`CENTI4.MAC:1505-1512` reads `CMP I,0F4 / BCC 3$ ;IF NOT AT LEFT EDGE` and `CMP I,0B / BCS 10$
;IF NOT AT RIGHT EDGE`, and MAME `centiped.cpp:2377` is `ROT270` for revision 4 over
`TILEMAP_SCAN_ROWS` (`centiped_v.cpp:93`) with `tile_index` as the raw videoram offset (`:19-23`)
and no tilemap flip in `screen_update` (`:414-421`). Second attack: the confused user. Does the
gun still track the mouse? Yes — and the tests assert both halves in one `it()`, so neither the
ROM half nor the feel half can pass alone. Third: the stressed input. `movementX` absent or
`null` → `Number(undefined ?? 0)` = 0, not `NaN`. Held key through a `blur` → cleared. Lock exit
without blur → `pointerlockchange` clears it. Fourth: what does a malicious user get? Nothing —
this is a pure-geometry change in an offline canvas game with no network, no storage write, no
parsing, and no privilege boundary anywhere in the diff. Fifth: the h-wrap region. Segment `h` is
`& 0xff`, so `h ∈ [0xF8, 0xFF]` yields a negative `delta`; JS arithmetic shift keeps the identity
`(delta>>3)*8 + (delta&7) === delta` for negatives, so those segments render off-screen LEFT
where they used to render off-screen RIGHT — a clean mirror of the old behaviour, not a new
defect, and `obstacleCode` still guards the out-of-grid column. What the devil's advocate DID
turn up is real but narrow, and it is the width-blindness of the test idiom: the recorder mock
never captures `w`/`h`, so every HUD assertion in this suite pins anchors and is structurally
incapable of seeing a footprint overlap. That is how the `lives == 6` band overrun survives a
green suite. Both are logged as non-blocking findings.

## Reviewer Assessment

**Verdict:** APPROVED

Five source lines change and they are the right five. The derivation is correct, and I verified
it from primary sources myself rather than accepting the transcript — the apparent contradiction
between the ROM clamp labels and the MAME chain dissolves once `OBSTAC`'s reversal is applied,
and both then agree on the same screen layout. Nothing Critical or High. Five non-blocking
observations, all logged as Delivery Findings.

**Data flow traced:** DOM `mousemove.movementX` (+12, device-right) → `createMouseAdapter`
negates to ROM-signed `dh = -12` (input.ts:55) → `main.ts:103` sums both adapters → `movePlayer`
applies `applyTblmt` and a byte-faithful `ADC PLAYH`, walking PLAYH DOWN toward the `0x0B` clamp
(player.ts:117-133) → `gunScreenX` reverses through OBSTAC and returns a HIGHER screen-x
(layout.ts:92-97) → `blit` draws the gun further RIGHT (render.ts:131). Safe because exactly one
link in that chain negates, it is in the shell where the V axis was already handled, and the
suite asserts both the ROM half and the feel half in a single test so neither can pass alone.

**Pattern observed (good):** `gunScreenX` (layout.ts:92-97) reduces algebraically to
`LOGICAL_W - 1 - h` — I confirmed the identity holds for all 234 clamped values of h — yet Dev
kept it written as `cellScreenX(col) + subCell - SPRITE_H/2`. Collapsing it to the closed form
would have been shorter and would have severed the visible tie to the collision column that
cp2-7 depends on. Keeping the decomposition means a future change to `cellScreenX` drags
`gunScreenX` with it automatically. Right call; deliberately NOT flagged as [SIMPLE].

**Error handling:** No new failure paths. External inputs are coerced defensively at the only
boundary — `Number(e.movementX ?? 0)` (input.ts:55-57) yields 0, never `NaN`, for a missing or
null delta; `String(e.key)` (:106) for a missing key. Lifecycle teardown is unchanged and still
covered: `blur` → `reset()`, and an Escape-exit that keeps focus → `pointerlockchange` → `reset()`.

**Observations (11 — issues and explicit verifications):**

- `[VERIFIED]` **The flip direction, from primary source, not from the transcript.**
  `CENTI4.MAC:1505-1512` reads `CMP I,0F4 / BCC 3$ ;IF NOT AT LEFT EDGE` and `CMP I,0B / BCS 10$
  ;IF NOT AT RIGHT EDGE` — read directly from the vendored rev-4 source. MAME confirms
  independently: `centiped.cpp:2377` is `ROT270` for revision 4, `centiped_v.cpp:93` is
  `TILEMAP_SCAN_ROWS`, `:19-23` makes `tile_index` the raw videoram offset, `:414-421` draws with
  no tilemap flip. The two reconcile through `obstacleCellFor` (playfield.ts:126-132), which
  reverses PLAYH about `0xF7` to reach the grid column. Complies with the core/shell rule — the
  reversal already lived in core and was not touched.
- `[VERIFIED]` **`gunScreenX` is exact, and cp2-7 survives.** `gunScreenX(h) + SPRITE_H/2 ===
  delta` and `obstacleCellFor(h,v,0).h === delta >> 3` over the whole `[0x0B, 0xF4]` clamp, so
  the sprite centre sits `delta & 7` pixels into its own collision column for every h — never
  the next one. Measured at the clamps: `gunScreenX(0x0B) = 228` (right), `gunScreenX(0xF4) = -5`
  (left), `gunScreenX(0x80) = 111` (rest). The `LOGICAL_W - h` near-miss Dev documents is real
  and the fence rejects it.
- `[VERIFIED]` **The flip is global — no h-anchored site was missed.** `grep` for every consumer
  of `cellScreenX`/`gunScreenX`/`LOGICAL_W` across `src/` returns render.ts and main.ts only, and
  main.ts:136 blits the logical backbuffer straight through with no transform. `src/shell/` holds
  six modules; only layout/input/render carry h-geometry. The lives loop (render.ts:180) needed
  no edit — `cellScreenX(6 + i)` reverses direction for free.
- `[VERIFIED]` **`src/core` is untouched.** `git diff origin/develop...HEAD -- src/core` is empty.
  MOVE stays a byte-faithful `ADC PLAYH`, which is the whole reason the sign lands in the shell.
- `[VERIFIED]` **No assertion was weakened across the 12 re-pins.** Read line by line hunting for
  exactly that. Every re-pin flips a value or a direction at identical strength; conservation
  pins keep their magnitude (`totalDh` 10→-10, 6→-6, TOTAL→-TOTAL). No `toBeCloseTo`, no loosened
  bound, no deletion, no `.skip`.
- `[VERIFIED]` **The h-wrap region mirrors cleanly.** `wrapH = h & 0xff` (centipede.ts:118) admits
  `delta < 0`; JS arithmetic shift preserves `(delta>>3)*8 + (delta&7) === delta` for negatives,
  so `h ∈ [0xF8,0xFF]` now draws off-screen LEFT where it drew off-screen RIGHT — the correct
  mirror. `obstacleCode` (playfield.ts:140-145) still guards the out-of-grid column.
- `[DOC]` `[MEDIUM]` **`InputCounts` documents the V sign convention and not the H one** —
  `src/core/player.ts:56-58` and the "THE COMP SIGN CONVENTION" header at `:18-25`. cp2-14 makes
  `+dh = screen-LEFT` load-bearing and far less guessable than `+dv = up`, and it is documented
  only in `src/shell/input.ts:51-54` — not the file an author of the next adapter opens. TEA
  predicted this hazard in its own deviation note. Non-blocking, comment-only fix.
- `[TEST]` `[MEDIUM]` **The recorder mock is blind to blit width** —
  `tests/orientation-flip.test.ts:100` declares 7 of `drawImage`'s 9 parameters and drops `w`/`h`.
  Every HUD pin therefore asserts anchors and can never see a footprint overlap. This is rule #8
  ("mock types not matching real implementation signatures") and it is the direct cause of the
  next finding surviving a 574-green suite. No test stages `lives = 6` either, the maximum
  `livesShown` permits.
- `[EDGE]` `[LOW]` **`lives == 6` overruns the high-score band by 8px** — render.ts:180 blits the
  GUN icon at width `SPRITE_H`(16) on an 8px pitch, so six icons span x=48..104 against a
  high-score anchor at 96. Measured, and PRE-EXISTING: before the flip the same 16-on-8 overrun
  hit the P1 score at *every* `lives >= 1`. cp2-14 strictly improves it. Flagged only because the
  flip moved which neighbour gets clobbered.
- `[SEC]` `[VERIFIED]` **No security surface exists in this diff.** Offline canvas game, no
  network, no storage write, no parsing, no auth, no tenancy, no privilege boundary. The only
  external inputs are DOM `movementX`/`movementY`/`key`, coerced at input.ts:55-57,106. Nothing
  in the diff can be reached by an untrusted party.
- `[SIMPLE]` `[TYPE]` `[RULE]` `[SILENT]` `[LOW]` **Combined, all non-blocking.** [SIMPLE]:
  `gunScreenX`'s column+subCell decomposition is algebraically redundant but deliberately
  retained — see "Pattern observed"; not a finding. [TYPE]: the 2 `as unknown as` partial-mock
  casts (orientation-flip.test.ts:123) match rule #1's flagged pattern; severity DOWNGRADED with
  rationale (established repo idiom with `render.test.ts` precedent, and the mock call-shapes do
  match the real ones) but recorded, not dismissed. [RULE]: full 13-check enumeration in the Rule
  Compliance table above — one finding (#8), everything else compliant or N/A. [SILENT]: no
  swallowed errors introduced; the one pre-existing swallow (`createPointerLock`'s R4 rejection)
  is untouched and already has an `onReject` sink from cp2-8.

**Challenge of my VERIFIEDs:** Preflight is the only subagent that returned, and it contradicts
none of the above — its two notes (stray orchestrator-root artifacts, no PR yet) are both
confirmed and neither touches a VERIFIED. I re-checked each VERIFIED against the one binding
project rule (core/shell) and the 13 lang-review checks; the only VERIFIED that came under
pressure was "no h-anchored site was missed", which I did not settle by reading the diff but by
grepping every consumer of all three geometry exports across `src/` and confirming main.ts's
passthrough blit applies no transform.

**AC verification:** AC-1 (field + HUD in the upright cabinet's orientation, no HUD
special-casing) — met; screenshot committed at
`docs/rom-study/screenshots/cp2-14-orientation-flip.png` and read: score hard against the LEFT
edge at h0-5, lives at h6-8, high score at h12-17. AC-2 (device-right still moves the gun
screen-right, no assertion relaxed) — met and pinned as both halves in one test. AC-3
(orientation is testable; at least one ABSOLUTE left/right render pin) — met, and exceeded: the
absolute pins run through the public `render()` on real staged state, not on the layout helpers
alone.

**Gate summary:** 574/574 tests · `tsc --noEmit` clean · `vite build` clean · citation gate
26/26 · working tree clean · 0 code smells · 0 Critical · 0 High · 2 Medium · 3 Low (all
non-blocking, all logged as Delivery Findings).

**Handoff:** To Winston Smith (SM) for finish-story. No PR exists yet — SM opens and merges it.