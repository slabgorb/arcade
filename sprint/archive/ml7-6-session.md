---
story_id: "ml7-6"
jira_key: "ml7-6"
epic: "ml7"
workflow: "tdd"
---
# Story ml7-6: Decode the real ship + enemy/mushroom sprites

## Story Details
- **ID:** ml7-6
- **Jira Key:** ml7-6
- **Workflow:** tdd
- **Points:** 5
- **Stack Parent:** none
- **Branch:** feat/ml7-6-decode-ship-enemy-mushroom-sprites
- **PR:** #369 (code, → `develop`) — https://github.com/slabgorb/arcade/pull/369
- **Repos:** arcade

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T14:22:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T13:14:41.623225+00:00 | 2026-08-14T13:17:19Z | 2m 37s |
| red | 2026-08-14T13:17:19Z | 2026-08-14T13:31:14Z | 13m 55s |
| green | 2026-08-14T13:31:14Z | 2026-08-14T14:08:22Z | 37m 8s |
| review | 2026-08-14T14:08:22Z | 2026-08-14T14:22:56Z | 14m 34s |
| finish | 2026-08-14T14:22:56Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement (non-blocking):** the SM correction is fully confirmed by measurement — the
  player gun at `main.ts:114-118` is a `#4cf` 4x4 `fillRect` placeholder (frame-0 draw recorder
  quoted it verbatim: `{"x":121,"y":242,"w":4,"h":4,"style":"#4cf"}`), while segments and the
  enemy cast already route through the decoded-sprite path (`drawSprite`→`drawStampAtPx`). AC1
  (the ship) is the one genuinely undone, RED-able item.
- **Gap (non-blocking):** AC2 (enemy/mushroom/segment pic FIDELITY) and AC3 ("correct to the
  eye") are NOT unit-pinnable — there is no CENPIC-style vendored picture SOURCE for millipede
  (`gfx-rom.ts:12-20`), so no citable golden bitmap exists to assert the *right* shape. Their
  correctness is the human VISUAL PLAYTEST at `/millipede/` (playbook §4, "routing != geometry").
  Dev must run it; the RED suite pins only that the gun becomes a real visible opaque sprite.
- **Question (non-blocking) for Dev:** does the on-field gun reuse the HUD lives-ship (char $1F →
  sheet tile $5F, `core/hud.ts:31` `SHIP_STAMP`, a real 31-px ship already in STAMPS), or is it a
  distinct MOBJ picture pair? Derive from the MOBJ tables + picture ROM 136013-106/107 and CONFIRM
  by eye. $5F is a documented starting point, not a mandate.

### Dev (implementation)

- **Conflict (non-blocking) — the SM correction was itself REFUTED by the playtest.** The context's
  SM CORRECTION claimed enemies/mushrooms "already decode correctly." The `/millipede/` visual
  playtest showed the whole field as **red triangles** — the exact defect the story TITLE named. This
  is the routing-!=-geometry trap: the SM read the code routing (mushrooms DO call the grid blitter)
  and inferred correctness; the eyes proved it false. Root-caused and fixed (see the deviation and
  Dev Assessment). Lesson for future stories: a "premise is stale, it's already fixed" correction is
  a claim to re-verify by EYE, not to trust.
- **Improvement (non-blocking) — cross-story: `render.ts` `charTile` (ml7-3) was incomplete.** ml7-3
  derived `charTile = 0x40|(code&0x3F)` from bit-6-CLEAR codes only (HUD digits + ship) and its own
  comment asserted the field codes "map to themselves." That claim was false for every bit-6-SET
  field graphic (mushroom/DDT/rock $6E-$7F). Corrected here to a bit-6 bank select; the stale claim
  is retired in the rewritten comment. No ml7-3 test broke (all used bit-6-clear codes) — the gap was
  exactly the untested high-code half. Affects `plugins/millipede/src/shell/render.ts:charTile`.
- **Gap (non-blocking) for the Reviewer/follow-up — DDT bomb + colour fidelity NOT closed here.** The
  bank fix maps DDT stamps ($6E/$6F) to tiles $2E/$2F; I did not independently verify the DDT bomb
  graphic is faithful (no rocks/DDT prominent in the attract field at playtest time — the visible
  green "700"s are demo bonus-score popups, not DDT). Separately, the flat playfield palette renders
  mushrooms white/red/green; real Millipede uses per-region colours from the 99$ table — a COLOUR
  concern distinct from this story's pic→tile DECODE scope. Both are candidates for a follow-up.
  Affects `plugins/millipede/src/shell/render.ts` (PLAYFIELD_COLOUR_BYTES) + `core/ddt.ts` tiles.

### Reviewer (code review)

- **Improvement (non-blocking):** the DDT-bomb ($6E/$6F → tiles $2E/$2F) and POISON-mushroom
  ($78-$7B → $38-$3B) mappings were fixed mechanically by the bank flip but NOT visually confirmed
  (no rocks/poison prominent in attract at playtest time). A follow-up should stage a wave with rocks +
  poison + a live DDT and eyeball those tiles. Affects `plugins/millipede/src/shell/render.ts` charTile
  consumers. *Found by Reviewer during code review.*
- **Improvement (non-blocking):** the sibling `tests/hud-render.test.ts` carried a stale survivor of
  the retired "field codes map to themselves" claim (rule #24) — corrected here, but it shows a
  retirement-sweep gap: when a story retires a cross-cutting mapping claim, grep sibling TEST prose too,
  not just the file under edit. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **AC2/AC3 covered by playtest + existing guards, not new failing units (TEA scope call).**
  The context asks for AC2/AC3 "visual playtest" validation. Per the Gap finding above, there is
  no citable ship/enemy golden, so a failing unit asserting the *correct* shape cannot be written
  honestly. AC3's no-full-screen-flash is already pinned by `tests/accessibility.test.ts` (death
  strobe) and the sprite render does not touch the phase machine; AC4's boundary is already pinned
  by `tests/purity.test.ts` (armed core sweep) and all new code stays in `src/shell/`. Writing
  redundant boundary/flash units would violate DRY and add no teeth. RED therefore concentrates on
  AC1 (the ship), which is the real deliverable; AC2/AC3 are Dev's GREEN playtest obligations.

### Dev (implementation)

- **Widened scope from AC1-only to include the AC2 mushroom decode fix.**
  - Spec source: context-story-ml7-6.md AC2 ("mushroom pic→tile mappings validated to decode to the
    correct shapes, and any mismatch is corrected") + user ruling 2026-08-14.
  - Spec text (context Background/SM CORRECTION): "enemies and millipede segments are NO LONGER
    red-triangle pic guesses … already drawn as DECODED sprite tiles."
  - Implementation: the playtest refuted that — the field rendered as red triangles. I root-caused
    it to `charTile` (an ml7-3 mapping, not the RED-tested AC1 surface) and fixed the char BANK
    select, so mushrooms decode to their real tiles. This touches a file/mapping OUTSIDE the RED
    tests' AC1 scope.
  - Rationale: AC2 explicitly requires correcting mushroom mismatches, and the user chose "fix
    mushrooms now in ml7-6" when I surfaced the finding rather than deferring it.
  - Severity: minor (additive fix; all existing tests stayed green; HUD render byte-identical).
  - Forward impact: retires ml7-3's "field codes map to themselves" claim; a follow-up may still
    want DDT-bomb + per-region colour fidelity (see Delivery Findings).

### Reviewer (audit)

- **Dev's scope-widening (AC1-only → +AC2 mushroom decode)** → ✓ ACCEPTED by Reviewer: AC2 explicitly
  requires correcting mushroom mismatches, the user ruled "fix now," and the fix is additive with the
  full suite green and the HUD render byte-identical (mutation-verified by the rule-checker: reverting
  charTile to the ml7-3 formula reddens the new guards, reverting main.ts's player branch reddens the
  AC1 tests). The touched surface (charTile, an ml7-3 mapping) is outside the RED tests' AC1 scope but
  is squarely inside the story TITLE ("enemy/mushroom sprites") — sound.
- **TEA's "AC2/AC3 covered by playtest, not new failing units"** → ✓ ACCEPTED with amendment: correct
  that no citable golden exists for a RED unit, but GREEN then ADDED a real non-vacuous unit
  (`charset-bank.test.ts`) once the concrete mapping was known at the playtest — the right sequencing.
- No UNDOCUMENTED deviations found: every behavioural change (player ship, charTile bank select) is
  logged and matches the diff.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/main.ts` — AC1: the player gun renders the real ROM ship sprite (picture
  $1F, `MLSUB.MAC:518`) via `drawStampAtPx(charTile(SHIP_STAMP)=$5F)` on the shared CCW-rotated
  sprite path, replacing the `#4cf` placeholder fill. Retires the `void SHIP_STAMP`.
- `plugins/millipede/src/shell/render.ts` — AC2 root-cause fix: `charTile` now bit-6 bank-selects
  (alphanumerics $40-$7F vs playfield-graphics $00-$3F) instead of forcing bit 6 set, so field
  mushroom/DDT/rock codes decode to their real graphics. Comment rewritten to retire ml7-3's false
  "map to themselves" claim.
- `plugins/millipede/tests/charset-bank.test.ts` — NEW regression guard tying the mapping to the ROM
  stamp constants (FULL_MUSHROOM/NORMAL/POISON/ROCK/DDT_STAMP); proves the mushroom tile is non-blank
  and materially different from the red fragment the bug drew.

**Tests:** 1067/1067 passing (millipede project, GREEN); `npm run lint` clean.

**Visual playtest (mandatory, AC1/AC2/AC3):** Served this checkout on 127.0.0.1:5293 (verified own
tree), drove the attract demo headless via Playwright. BEFORE: field was red triangles + a blue-square
gun. AFTER: proper mushrooms (white cap, red spots, green stem) across the field, the white ship at
the gun, millipede segments marching, HUD correct. No full-screen flash observed (AC3). Screenshots
were scratch and removed (not committed).

**AC status:** AC1 ✓ (ship, RED-tested + eyes). AC2 ✓ for mushrooms (decode corrected + eyes + unit);
enemy MOBJ tiles (spider/beetle/head) verified plausible; DDT-bomb + per-region colour flagged as
follow-up candidates (Delivery Findings). AC3 ✓ (visual playtest, no strobe; accessibility guard
green). AC4 ✓ (all changes in `src/shell/`; `purity.test.ts` green).

**Branch:** feat/ml7-6-decode-ship-enemy-mushroom-sprites (pushed, `584e12f0`)

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) — note the cross-story `charTile` change and the
open DDT/colour follow-up question in the Delivery Findings.

## Tea Assessment

RED landed and is clean. `git commit 9d0caa90`, pushed to
`feat/ml7-6-decode-ship-enemy-mushroom-sprites`.

**What was written**
- `tests/player-sprite.test.ts` (new) — 4 tests: 2 smoke (gun boots at the pinned, non-grid-
  aligned cell; frame 0 painted) that PASS, and 2 AC1 tests that FAIL RED:
  1. no decoded sprite blit at the gun's screen cell `(119,240)` (today it is a fill), and
  2. a small solid `#4cf` fill sits inside the gun's sprite footprint (the placeholder).
- `tests/helpers/boot-shell.ts` (extended) — a passive draw recorder: `draws('logical'|'display')`
  returns the ordered `fillRect`/`putImageData` calls with their fillStyle / pixels. Additive; the
  existing 62 files / 1062 tests stay green.

**Why behavioural, not a source grep.** The gun cell x=119 is not a multiple of 8, so
`drawGridStamps` (always `col*8`) can never blit there — any 8x8 sprite blit at that cell is the
player's alone. The test reads the ACTUAL pixels the renderer painted, so a wrong ROTATION or a
flipped tile cannot hide behind a shared formula (lang-review #18/#26; the ml7-3 hand-typed-bitmap
lesson). It deliberately does NOT assert the exact ship shape — that is the human playtest (#15/#25:
grep guards are weak here; "routing != geometry", render.ts:7).

**GREEN (Korben) must:** draw the gun as a decoded STAMPS sprite via the existing
`drawSprite`/`drawStampAtPx` path (CCW rotation, like every other MOBJ), replacing the `#4cf`
fill; derive the exact ship pic from the ROM (start point: char $1F → tile $5F, the HUD ship) and
**CONFIRM it by eye at `/millipede/`**; while there, eyeball AC2 (enemy/mushroom/segment pics) and
AC3 (no full-screen flash) per the Delivery Findings.

**State:** full suite `2 failed | 1062 passed` (the 2 are exactly the AC1 RED assertions); `npm run
lint` clean.

### Rule Coverage (lang-review/typescript.md)

| Check | How covered |
|-------|-------------|
| #15 source-text token, not claim | Avoided entirely — AC1 is BEHAVIOURAL (reads rendered draws), no source grep. |
| #18/#26 fixture value IS expectation / terms all test-local | Asserted pixels come from the REAL renderer; the `screenPx` helper only LOCATES the cell, it does not derive the pixels. |
| #21 degenerate numeric input | Gun cell derived from the imported `PLAYER_V_MIN` constant + a smoke that `createGame` really spawns there; x%8≠0 asserted so the locate is collision-free. |
| #25 whole-file search scope | N/A — no source-text guard. |
| Test-quality (#8) — no vacuous asserts | Every assertion checks a concrete count/pixel value; the two RED asserts are mutation-proven by the current tree (they fail on the real placeholder and quote it). |
| Boundary (AC4) | `tests/purity.test.ts` armed core sweep — new code is shell-only. |
| Accessibility (AC3 flash) | `tests/accessibility.test.ts` — sprite render does not touch the phase machine. |

Handing to Korben Dallas (Dev) for GREEN.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1625 tests green, lint clean, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (rule-checker #8/#15/#18/#26) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (this is where the findings landed) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (rule-checker #1/#2) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered |
| 9 | reviewer-rule-checker | Yes | findings | 4 (rules #17×2, #20, #24) | confirmed 4, all FIXED in `6ba2b0cb` |

**All received:** Yes (3 enabled returned; 6 disabled via settings, hand-covered below)
**Total findings:** 4 confirmed (all comment/citation, all fixed), 0 dismissed, 0 deferred

### Rule Compliance

Rule-checker swept all 30 lang-review checks + 3 project rules (core/shell boundary, ROM-citation
honesty, accessibility) — 61 instances — and I independently re-checked. Result:

- **Behavioural rules — all PASS.** #1/#2 (no `as any`/`Function`/bare `object`; `DrawFill`/`DrawBlit`
  discriminated union, `readonly DrawRecord[]` returns). #4 (`??`/`?.` used correctly; the memoised
  `getContext: ()=> (ctx ??= makeCtx(draws))` FIXES a real pre-existing apparatus bug). #5 (`export
  type`/inline `type` imports correct). #8/#15/#18/#26 (both new suites are BEHAVIOURAL/constant-tied,
  non-vacuous, and LIVE-mutation-tested — reverting `charTile` reddens `charset-bank`, reverting the
  player branch reddens `player-sprite`). #31 core/shell boundary: all changes in `src/main.ts` (shell
  entry) / `src/shell/render.ts` / `tests/` — no `core/` touched (`purity.test.ts` green). #33
  accessibility: one static 8×8 blit/frame, no strobe.
- **#17/#20/#24 comment-accuracy — 4 violations, ALL FIXED (`6ba2b0cb`).** Stale `render.ts:71,81`
  citation (main.ts + player-sprite) re-cited by symbol; the RED-phase "still paints a fillRect" header
  reframed; the sibling `hud-render.test.ts` "map to themselves" survivor retired.
- **ROM-fidelity (#32):** `charTile`'s bit-6 claim is mathematically verified (`code ^ 0x40` over the
  7-bit domain); `ddt.ts:38`, `conway.ts:48-49` citations confirmed correct line numbers by me.

### Hand-coverage of disabled specialists

- **[EDGE] VERIFIED** `charTile` is total: for any 7-bit code the output is in `$00-$7F`, and every
  `STAMPS[0..255]` exists — no OOB reachable from the callers (field codes masked to 7 bits, HUD codes
  small). Evidence: `render.ts:78` formula + `stamp-data.ts` length 256.
- **[SILENT] VERIFIED** no swallowed errors introduced; an OOB tile would THROW in `rotatedStampImage`
  (loud), not silently render blank — acceptable fail-fast. Evidence: `render.ts` `rotatedStampImage`.
- **[SIMPLE] VERIFIED** the `charTile` ternary is the minimal expression of a bank select; the
  boot-shell recorder is additive and necessary for the behavioural AC1 test — no over-engineering.
- **[TYPE] VERIFIED** the recorder types are a clean discriminated union keyed on `kind`, filtered with
  a real runtime predicate in `player-sprite.test.ts` — no unsafe casts added by this diff.

### Devil's Advocate

Suppose this code is broken. The most dangerous move here is changing `charTile`, a mapping every
playfield AND HUD glyph flows through — a wrong flip would silently corrupt the entire screen. Could the
bit-6 select be wrong for a code the tests never exercise? The suites cover bit-6-clear HUD codes
(digits/ship/blank) and the bit-6-set mushroom band ($7C-$7F) plus DDT/ROCK/POISON constants — but they
assert the mushroom band decodes to *non-blank* tiles, not that those tiles are the *correct* mushrooms;
a reviewer could argue the unit is satisfied by ANY non-blank tile, so fidelity rests on the human
playtest alone. That is true and disclosed (the "routing != geometry" doctrine): I mitigate by having
personally reviewed the playtest screenshot showing recognisable mushrooms, and by the side-by-side
current-vs-corrected render in the Dev notes. Next: the DDT bomb. The fix sends $6E/$6F to $2E/$2F, and
neither I nor Dev visually confirmed those are the bomb graphic — a confused player in a DDT wave could
see wrong icons. This is real, so it is filed as a non-blocking Delivery Finding, not hidden. Could the
memoised `getContext` break a sibling test that relied on a fresh ctx per call? The full 1067-test suite
is green, so no. Could the player-ship test pass vacuously — e.g. if some OTHER sprite happened to blit
at (119,240)? No: x=119 is not 8-aligned so no grid stamp can land there, and the rule-checker's live
mutation (revert to the fillRect) reddens it, proving it fails for the real defect. Could a huge/negative
player position throw? `px()` masks to a byte, and the player is clamped to $0B-$F4 / $08-$30 by
`applyAxis` — bounded. What breaks under stress? Nothing new: no I/O, no async races, no user-string
sink. The residual risk is entirely FIDELITY of the not-yet-eyeballed DDT/poison/rock tiles and the flat
palette — both documented follow-ups, neither a correctness or safety defect in the shipped diff.

## Reviewer Assessment

**Verdict:** APPROVED

Production logic is correct and independently mutation-verified (rule-checker reverted `charTile` and the
player branch and confirmed the new guards catch both defects). Preflight GREEN (1625 tests, lint clean),
security clean. The four confirmed findings were all comment/citation accuracy (rules #17/#20/#24) and
were FIXED in `6ba2b0cb` (1067/1067 green, lint clean) during this review — no behavioural change.

- **[PRE] VERIFIED** full suite + lint green — evidence: preflight 1625 pass, `npm run lint` clean.
- **[SEC] VERIFIED** no injection/DOM-sink/secret/tenant surface — static Canvas 2D game, no external
  input reaches `charTile`/`drawStampAtPx`.
- **[RULE] CONFIRMED+FIXED** #17: `render.ts:71,81` stale citation in `main.ts:117` + `player-sprite.test.ts` → re-cited by symbol.
- **[RULE] CONFIRMED+FIXED** #20: `player-sprite.test.ts` header "main.ts:114-118 still paints a fillRect" false in-commit → reframed as RED baseline.
- **[RULE] CONFIRMED+FIXED** #24: `hud-render.test.ts` stale "field codes map to themselves / census mushrooms looked right" survivor → retired.
- **[VERIFIED]** AC1 the gun renders a real decoded ship sprite — evidence: `main.ts` `drawStampAtPx(c, charTile(SHIP_STAMP), pxx, pyy)` + `player-sprite.test.ts` (behavioural, mutation-caught) + playtest screenshot.
- **[VERIFIED]** AC2 mushrooms decode to their real tiles — evidence: `render.ts:78` bank flip + `charset-bank.test.ts` + playtest (recognisable mushrooms replace red triangles).
- **[VERIFIED]** AC4 core/shell boundary intact — evidence: diff touches only `src/main.ts`/`src/shell/`/`tests/`; `purity.test.ts` green.

**Data flow traced:** player state (`state.player.h/v`, clamped by `applyAxis`) → `px()` (byte-masked) →
`drawStampAtPx(charTile(SHIP_STAMP)=$5F, …)` → `putImageData` — safe, no external input, no OOB.
**Pattern observed:** bit-6 bank-select correction with an honest docblock retiring the prior false claim — `plugins/millipede/src/shell/render.ts:78`.
**Error handling:** OOB tile fails LOUD (throws in `rotatedStampImage`), not silent — acceptable.
**Handoff:** To SM for finish-story.

## Sm Assessment

Setup done and claim pushed (branch `feat/ml7-6-decode-ship-enemy-mushroom-sprites`,
context + stamp committed). Sibling probe clear at setup: no ml7-6 branch, no sibling
`.session/ml7-6`. This is p3, 5pt, tdd (phased): setup → red → green → review → finish.

**Stale-premise refutation (measured 2026-08-14, matters for the archive).** The story
YAML carries only a title, no ACs — ACs were DERIVED. The title's middle clause is
partially STALE because ml7-3 (commit `ce629401`, "char-tile map + vertical-monitor
rotation") landed after it was written:

- `plugins/millipede/src/shell/gfx-rom.ts` exists — decoder is real (title correct).
- ROT90 tile/sprite asymmetry (pac-man trap) is ALREADY solved in `render.ts` (ml7-3, CCW
  turn). New sprite work follows that convention; it is not re-derived here.
- STALE: enemies + millipede segments are no longer "red-triangle pic guesses" — they draw
  as decoded sprite tiles via `drawSprite`→`drawStampAtPx` (`main.ts:94-111`). Their open
  question is `pic`→tile CORRECTNESS (visual playtest), not being undecoded.
- LIVE core deliverable: the PLAYER SHIP is still a `#4cf` blue-square placeholder
  (`main.ts:114-118`, comment "exact sprite decode is a follow-up").
- Spider-death "parked score in lieu of sprite" is a to-VERIFY item (parked-score hold at
  `core/millipede.ts:512-514`), not an established defect.

The epic YAML title still asserts the stale wording; the context carries a `⚠ SM
CORRECTION` block so TEA reads current reality first. No user ruling needed — the story is
coherent and real work remains (the player ship), so it is not a refuted-premise / either-or
case. Accessibility: no full-screen flashes (photosensitive-epilepsy constraint) and the
core/shell boundary stays green.

Handing to Leeloo (TEA) for the RED phase.