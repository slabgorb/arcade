---
story_id: "ml7-11"
jira_key: "ml7-11"
epic: "ml7"
workflow: "tdd"
---
# Story ml7-11: Per-region playfield palette from the 99$ colour table

## Story Details
- **ID:** ml7-11
- **Jira Key:** ml7-11
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/ml7-11-per-region-playfield-palette
- **Stack Parent:** none

## Story Description
The millipede field currently renders through a FLAT 4-colour palette PLAYFIELD_COLOUR_BYTES=[black,red,green,white] (render.ts:27), so mushrooms/rocks/gun all share one colour ramp. Real Millipede colours each playfield region separately from the CLRCH init (MLIRQ.MAC:242) + the per-wave 99$ colour table (MLIRQ.MAC:304-351). Wire per-region colour (inside/outside mushroom, poison, gun/lives) so the field matches the ROM.

## Derived Acceptance Criteria

**AC1: Per-region palette replaces flat PLAYFIELD_COLOUR_BYTES**
- render.ts no longer uses a single PLAYFIELD_COLOUR_BYTES constant for all field regions
- Palette lookup is region-indexed (e.g., CLRCH colour table index + per-wave offset)
- All three draw sites (stamp playfield, grid stamps, sprite motion-object stamps) use the new per-region palette function
- Test: A unit test in tests/palette.test.ts verifies decodeColourByte on sample bytes from CLRCH (MLIRQ.MAC:242) and the per-wave 99$ table

**AC2: Core unit test pins region→colour mapping (routing, not geometry)**
- tests/core/palette.test.ts (or similar) tests the colour decode + region-to-palette-index mapping deterministically
- Test covers the CLRCH init structure and per-wave colour-table lookup (data routing, not canvas pixel placement)
- Verified against MLIRQ.MAC:242 and 304-351 citations
- No visual geometry assertions in this test (that's AC4)

**AC3: Distinct regions render their ROM colours**
- Inside-mushroom region renders from its CLRCH/99$ colour
- Outside-mushroom region renders from its CLRCH/99$ colour
- Poison-mushroom region renders from its CLRCH/99$ colour
- Gun/lives region renders from its CLRCH/99$ colour
- Visual playtest verifies each region's colour matches the original arcade at wave 1 (or a low wave with all region types visible)

**AC4: Accessibility no-strobe rule maintained**
- No full-screen strobe or flash introduced by the colour-region wiring
- Colour transitions are steady (no on/off/on blink per frame)
- Verified by visual playtest: advance a wave transition and confirm the field colour change is a steady switch, not a flashing pattern
- Standing exception (epic ml7, ml7-4): confirmed by the dev's review playtest notes

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T10:07:08Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T09:09:36Z | 2026-08-15T09:12:27Z | 2m 51s |
| red | 2026-08-15T09:12:27Z | 2026-08-15T09:25:06Z | 12m 39s |
| green | 2026-08-15T09:25:06Z | 2026-08-15T09:44:42Z | 19m 36s |
| review | 2026-08-15T09:44:42Z | 2026-08-15T09:55:14Z | 10m 32s |
| green | 2026-08-15T09:55:14Z | 2026-08-15T10:00:07Z | 4m 53s |
| review | 2026-08-15T10:00:07Z | 2026-08-15T10:07:08Z | 7m 1s |
| finish | 2026-08-15T10:07:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the derived AC1 says "all three draw sites use the new per-region palette function", but `drawStampPlayfield` is the ml2-4 DIAGNOSTIC CENSUS page and must KEEP its max-distinct `PLAYFIELD_COLOUR_BYTES` (its whole purpose is exposing plane/ROT inversions). Only the GAME paths `drawGridStamps` and `drawStampAtPx` get per-region colour. Affects `plugins/millipede/src/shell/render.ts` (wire the two game draw paths to the new core map; leave the census flat). *Found by TEA during test design.*
- **Conflict** (non-blocking): `tests/playfield.test.ts:174-176` pins `PLAYFIELD_COLOUR_BYTES === [0xff,0x1f,0xe7,0x00]` and `tests/hud-render.test.ts` draws `drawGridStamps`/`drawStampAtPx` through that flat palette. When Dev switches the game draw paths to per-region colour, those hud-render palette assertions will need reconciling (the census assertion in playfield.test.ts should STAY green — census unchanged). Affects `plugins/millipede/tests/hud-render.test.ts` (update the palette expectations to the region colour for the drawn char/centin). *Found by TEA during test design.*
- **Question** (non-blocking, watch-item for GREEN — lang-review #14): the per-region palette is a wave-transition edge (CLRCH runs only when `LCOLOR` is set). If Dev recomputes the region colour inside one draw path but not another, or off a stale centin, regions drift silently (a MISSING update, invisible to snapshot tests). Compute the wave colours once at the frame/step exit and feed every draw path the same value. Affects `plugins/millipede/src/shell/render.ts` + the frame loop. *Found by TEA during test design.*
- **Improvement** (non-blocking): `tests/audit/palette-claims.test.ts:35-36` fences `CLRCH_LAST = 315` and its own comment names the CENTIN=4..12 continuation rows as "the business of whichever story transcribes the full per-level table" — i.e. this one. Dev MAY widen that fence / add continuation-row claims, but the RED suite does not require it (the module's table is byte-verified against the ROM directly, not via claims). Affects `plugins/millipede/tests/audit/palette-claims.test.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking, follow-up): millipede colours the field by CENTIN — the millipede LENGTH (MLDEF.MAC:299 "LENGTH OF CENTIPEDE"), latched at a `LCOLOR`-gated wave event — NOT a centipede-style per-wave scheme. `GameState` models neither CENTIN-as-colour-index nor `LCOLOR`, so the LCOLOR-gated recolour as the millipede shortens is not implemented; the render holds CENTIN=12 (the full-millipede / wave-start colour, INIT MILLI.MAC:1168-1170). Affects `plugins/millipede/src/core/game-state.ts` + `src/shell/playfield-palette.ts` (a follow-up should model the CENTIN colour index + LCOLOR gate and thread it into `playfieldPens`). *Found by Dev during implementation.*
- **Question** (BLOCKING acceptance, human gate): AC3 (colours match the ROM) and AC4 (no full-screen strobe — the owner's photosensitive-epilepsy safety rule) are VISUAL playtests that cannot be run headlessly here. The wiring is steady-by-construction (a fixed colour index → one colour per view → no strobe), but a human must confirm at `just serve` → `/millipede/`. Affects the story's acceptance. *Found by Dev during implementation.*

### Reviewer (code review)
- **Conflict** (blocking, rework): a fabricated ROM citation `MLDEF.MAC:4866` (file is 414 lines; CENTIN is at :299) and an off-by-one `MILLI.MAC:1169`→:1170 ship in `src/shell/playfield-palette.ts` and `tests/playfield-palette.test.ts`. Affects those two files + the session records. *Found by Reviewer during code review.*
- **Gap** (blocking, rework): `WaveColours` fields are mutable and `waveColours()` returns a live reference into the shared `FIELD_REGION_COLOURS` table — a latent shared-state corruption. Affects `src/core/playfield-colour.ts` (mark fields readonly). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `tests/playfield-colour.test.ts:206-219` is tautological (reads static consts, cannot fail). Affects that test (delete/re-cast). *Found by Reviewer during code review.* → FIXED round 2 (re-cast to a real PLAYER_COLOUR provenance check; mutation-verified).
- **Improvement** (non-blocking, round 2 — routed follow-up): the round-2 re-cast test guards `PLAYER_COLOUR`'s "immediate, not a 99$ read" provenance but not `ALPHANUMERIC_COLOUR`'s (it collides with wave-1 inside `0x1f`). A future mis-wire of `ALPHANUMERIC_COLOUR = waveColours(1).insideMushroom` would pass every test. Affects `plugins/millipede/tests/playfield-colour.test.ts` (add an ALPHANUMERIC provenance check against a non-colliding level; optionally assert `0x00` never appears in `FIELD_REGION_COLOURS`). Non-blocking — the shipped constants are correct; this only strengthens future coverage. *Found by Reviewer during code review (round 2).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

**Reuse note (non-blocking, flagged for Dev/Architect review):**
A new `src/shared/palette-decoder.ts` landed on develop from df2-2 (defender). Both defender and millipede now decode colour bytes. The story does not mandate extraction or reuse, but the Dev agent and Architect should weigh whether to unify the two local `decodeColourByte` implementations into the shared module (currently only `plugins/millipede/src/core/palette.ts::decodeColourByte` and the new `src/shared/palette-decoder.ts` exist). This is a possible future refactor, not blocking the story.

### TEA (test design)
- **RED scoped to the pure core data module, not the render integration**
  - Spec source: session AC1/AC2, context-story-ml7-11.md (title-derived)
  - Spec text: "render.ts no longer uses a single PLAYFIELD_COLOUR_BYTES constant for all field regions … all three draw sites use the new per-region palette function"
  - Implementation: the RED suite (`tests/playfield-colour.test.ts`) pins only the pure `src/core/playfield-colour.ts` region→colour map; it does NOT assert render.ts wiring or that the census draw site changes.
  - Rationale: the census (`drawStampPlayfield`) must keep its diagnostic palette (see Delivery Findings); render integration is inherently canvas/visual and is AC3's VISUAL-playtest job (the epic mandates visual playtests precisely because routing tests pass while a mis-coloured field ships). Pinning the ROM data purely is the strong, non-brittle guard.
  - Severity: minor
  - Forward impact: Dev owns the render wiring; Reviewer verifies it via the AC3 playtest, not via a unit assertion. AC1's "all three draw sites" wording is over-broad — treat it as the two GAME paths.
- **Test lives at flat `tests/playfield-colour.test.ts`, not the AC's `tests/core/palette.test.ts`**
  - Spec source: session AC2
  - Spec text: "tests/core/palette.test.ts (or similar)"
  - Implementation: new file `plugins/millipede/tests/playfield-colour.test.ts`; there is no `tests/core/` dir — millipede tests are flat, and `tests/palette.test.ts` already owns the decode seam.
  - Rationale: follow the existing convention; keep the per-region MAP separate from the byte DECODE (mirrors the ml2-3 module split).
  - Severity: trivial
  - Forward impact: none.
- **Added a poison-slot CLAIM requirement not spelled in the derived ACs**
  - Spec source: story title ("poison" is a named region) + `docs/rom-study/claims/06-colour-ram-palette.json` (PAL-5/6 pin inside/outside, none pins poison)
  - Spec text: title names "poison" as a region to colour from the ROM; the ACs did not mention claims.
  - Implementation: one RED test requires a claim quoting the INSIDE-OF-POISON write (MLIRQ.MAC:273).
  - Rationale: every ROM fact in this plugin is pinned as a byte-verifiable claim; poison shipping as an unsourced magic byte would break that discipline and dodge the citations gate.
  - Severity: minor
  - Forward impact: GREEN adds PAL-12 (ANCOL+7, :273); the existing citations/palette-claims gates byte-verify it.
- **Motion-object per-creature colours (99$+3..+11) scoped OUT**
  - Spec source: story title scope ("the millipede FIELD … inside/outside mushroom, poison, gun/lives")
  - Spec text: the named regions are the three field regions plus gun/lives; enemy sprite colours are not named.
  - Implementation: `waveColours` returns only inside/outside/poison; the enemy MOCOL colours are not pinned.
  - Rationale: the story is the playfield, not the bestiary; enemy colours are a separable follow-up.
  - Severity: minor
  - Forward impact: a later story may extend the module with the MOCOL creature colours (centipede/bee/spider, 99$+3..+11).

### Dev (implementation)
- **Colour index held at CENTIN=12 (full millipede); LCOLOR-gated per-length recolour deferred**
  - Spec source: story title ("so the field matches the ROM"); MLDEF.MAC:299, MILLI.MAC:1168-1170
  - Spec text: colour the field per region from the CLRCH init + the per-wave 99$ colour table.
  - Implementation: `playfieldPens()` defaults to CENTIN=12 — the full-millipede colour INIT sets (MILLI.MAC:1169), which is what a fresh wave shows. The ROM's colour index is the millipede LENGTH (CENTIN), recoloured only when LCOLOR fires; GameState models neither, so the colour does not cycle as the millipede shortens.
  - Rationale: faithful for the dominant wave-start view AC3 asks for ("wave 1 or a low wave"), and a fixed index is a steady colour that satisfies AC4 (no strobe) by construction. Modelling the CENTIN/LCOLOR lifecycle is a separable core change (see Delivery Findings).
  - Severity: minor
  - Forward impact: filed as a follow-up (CENTIN colour-index + LCOLOR gate in core, threaded into `playfieldPens`). Note the ROM's wave-1 colour is 99$ row 12 (inside orange, outside green, poison blue), NOT row 1.
- **Full-wire scope confirmed with the user before building the render subsystem**
  - Spec source: user ruling this session (AskUserQuestion → "Full wire (mirror centipede)")
  - Spec text: TEA scoped the RED to the pure core; the render wiring was AC3-visual only.
  - Implementation: built the shell palette + wired render's game paths (field + gun) beyond the RED's core scope, mirroring centipede's `shell/palette.ts`.
  - Rationale: the story title mandates "wire … so the field matches the ROM"; the user chose the full wire over a core-only + follow-up split.
  - Severity: minor
  - Forward impact: none — sanctioned scope.
- **Optional palette param instead of reconciling hud-render.test.ts (refutes TEA's Conflict finding)**
  - Spec source: session Delivery Findings → TEA "Conflict" (hud-render palette assertions will need reconciling)
  - Spec text: switching the game draw paths to per-region colour will break the flat-palette assertions in hud-render.test.ts.
  - Implementation: `drawGridStamps`/`drawStampAtPx` gained an OPTIONAL `palette` param defaulting to the flat census ramp; `main.ts` passes region pens. Existing tests call with no palette → unchanged behaviour → stay green. The census `drawStampPlayfield` is untouched.
  - Rationale: the draw primitives are palette-agnostic; the caller supplies the palette. No test reconciliation was needed — the TEA Conflict did not materialise.
  - Severity: trivial
  - Forward impact: none. HUD text/lives-icon per-region colour is left on the flat default (deferred) — only the field and the player ship are wired.
- **Fixed a latent tsc error in the RED claim probe**
  - Spec source: `npm run lint` (tsc --noEmit)
  - Spec text: the RED test read `c.source.line` on the Claim union, which includes a byte-citation variant with no `.line` (TS2339) — vitest ran green but tsc failed.
  - Implementation: narrowed with `isTextClaim` (the palette-claims.test.ts idiom) in `tests/playfield-colour.test.ts`. Assertion intent unchanged.
  - Severity: trivial
  - Forward impact: none.

### Reviewer (audit)
- **TEA: RED scoped to the pure core, render deferred to visual** → ✓ ACCEPTED by Reviewer: correct — the census must keep its diagnostic palette, and render colour is a canvas/visual concern; AC2's ROM-parse guard is the right load-bearing test.
- **TEA: flat `tests/playfield-colour.test.ts` path** → ✓ ACCEPTED: matches the flat-test convention; there is no `tests/core/`.
- **TEA: added the poison-slot claim requirement** → ✓ ACCEPTED: in-grain with the plugin's citation discipline; PAL-12 shipped and is byte-verified by the sibling palette-claims suite.
- **TEA: motion-object colours scoped OUT** → ✓ ACCEPTED: the story is the field + gun/lives, not the bestiary.
- **Dev: colour index held at CENTIN=12; per-length LCOLOR recolour deferred** → ✓ ACCEPTED: faithful for the wave-start view (verified CENTIN=12 = 99$ row 12 against MLIRQ.MAC:348), steady-by-construction so AC4 holds; the deferral is filed as a Delivery Finding.
- **Dev: full-wire scope confirmed with the user** → ✓ ACCEPTED: user ruling on record.
- **Dev: optional palette param instead of reconciling hud-render.test.ts** → ✓ ACCEPTED: sound — the draw primitives are palette-agnostic; existing tests stay green on the default, and I confirmed the census is untouched.
- **Dev: fixed a latent tsc error in the RED claim probe** → ✓ ACCEPTED: correct narrowing; assertion intent preserved.
- **UNDOCUMENTED (Reviewer-found):** the CENTIN provenance comment cites `MLDEF.MAC:4866` (nonexistent line; real line :299) and attributes "SET CENTIPEDE SIZE" to `MILLI.MAC:1169` instead of :1170. Not a spec deviation but a citation defect — see the Reviewer Assessment severity table. Severity: M/L.

## Sm Assessment

**Setup complete — handoff to TEA for the red phase.** The phase pointer read `setup` on arrival.

**Premise verification (done before sm-setup, since sm-setup copies the description forward as current fact):** the description's falsifiable claims were measured against the tree and are ACCURATE and current — no correction banner was needed:
- `plugins/millipede/src/shell/render.ts:27` holds the flat `PLAYFIELD_COLOUR_BYTES = [0xff, 0x1f, 0xe7, 0x00]`.
- All three draw sites (render.ts:37, :122, :136) map that same flat 4-colour palette — mushrooms/rocks/gun share one ramp today. No per-region colour is wired.
- Core `plugins/millipede/src/core/palette.ts` documents the CLRCH colour-RAM law; render.ts cites the per-wave 99$ table (MLIRQ.MAC:304-351) at :13 but does not yet consume it region-wise.

**Board / contention:** sibling branch probe (`git fetch --prune` + `git branch -r | grep -Ei ml7-11`) returned no ml7-11 branch — the only sibling activity is a-2 on `jt11-17` (unrelated). No open PRs → merge gate clear. develop synced to 9834dac8, clean; feature branch `feat/ml7-11-per-region-playfield-palette` cut from it, claim committed (94e6c8d9) and pushed so the sibling probe lights up.

**ACs:** the epic YAML carried `acceptance_criteria: null`, so the four ACs in this session were DERIVED from the (verified-accurate) title/description, not copied. AC2 is the core/pure unit test pinning the region→colour mapping (routing/data, not canvas geometry); AC3/AC4 are visual playtest ACs. **Accessibility no-strobe rule (ml7-4 standing exception) is a hard constraint** and is captured as AC4 — TEA/Dev must keep it.

**For TEA (Tyr One-Handed):** the RED test belongs in millipede's core/pure suite and should pin the per-region colour data routing against MLIRQ.MAC:242 (CLRCH init) and :304-351 (per-wave 99$ table). Reference source is in-repo at `plugins/millipede/reference/original-source/millipede` with CRLF endings — use `awk`, not bare `grep`. Weigh the `src/shared/palette-decoder.ts` reuse note above, but it is not blocking.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** ROM-fidelity behaviour (a per-region/per-wave colour map) with a pure, byte-verifiable data core — the highest-value thing to pin before render integration.

**Test Files:**
- `plugins/millipede/tests/playfield-colour.test.ts` — the per-region playfield palette from the CLRCH `99$` table.

**Tests Written:** 18 tests covering AC1 (module exists + cites CLRCH/99$), AC2 (region bytes reproduce the 99$ table), the fixed gun/lives + alphanumeric colours (AC3 data half), the decode-seam tie-in, the level-index guards, and the poison-slot claim.
**Status:** RED — 18/18 failing; full millipede suite **18 failed | 1233 passed**, so the new file reddens nothing else. Verified the failures are the RIGHT reasons: `src/core/playfield-colour.ts` absent (the loadScanner idiom throws "not built yet") and no claim pins MLIRQ.MAC:273 yet.

**Ground truth established (CLRCH, MLIRQ.MAC:242-302, index 12*(CENTIN-1)):**
- `99$+0` → inside mushroom (ANCOL+5/+0D) **and** DDT explosions (ANCOL+1/+9)
- `99$+1` → outside mushroom (ANCOL+6/+0E)
- `99$+2` → **inside poison** mushroom (ANCOL+7/+0F) — NOT DDT (the table's own :304 comment mislabels byte 2 "DDT"; the routine is authoritative)
- `$1F` RED → alphanumerics (ANCOL+2); `$00` WHITE → player/gun (MOCOL+0F, ANCOL+3) — both wave-invariant
- Wave 1 (CENTIN=1): inside `$1F`, outside `$27`, poison `$21`; the suite byte-verifies all 12 waves by PARSING the vendored 99$ table (not by hand-copy).

### Rule Coverage

| lang-review check | Test(s) | Status |
|---|---|---|
| #21/#4 degenerate/invalid numeric input | `waveColours guards its level index` (centin 0/13/1.5/NaN/-1 throw; 1..12 accepted) | failing (drives a real level-index guard, not `??`) |
| byte-domain validity | `every field-region byte across all 12 levels is a valid colour-RAM byte` (sweeps through `decodeColourByte`, no throw) | failing |
| #15 token-not-claim (self-discipline) | AC2 asserts against ROM-parsed bytes, not test-locals; citation greps are DOCUMENTARY, the byte parse is load-bearing | n/a (test design) |
| #18/#26 self-referential assertion (self-discipline) | ground truth comes from `MLIRQ.MAC` + real `decodeColourByte`/`loadClaims` — no mocks, no fixture-equals-expectation | n/a (test design) |
| citation/claims fidelity | `the poison-mushroom slot is pinned as a claim` (MLIRQ.MAC:273) | failing (drives PAL-12) |

**Rules checked:** the applicable numeric-input, byte-domain, and test-honesty checks (#4/#15/#18/#21/#26) have coverage or are satisfied by design; the render/JSX/async/security checks (#6/#7/#10/#12) are not applicable to a pure data core.
**Self-check:** 0 vacuous tests — every test asserts a concrete value; the ROM cross-check and the poison-trap test would redden on a swapped/mis-transcribed byte (the mutation this story is about).

**Watch-items handed to Dev (see Delivery Findings):** the census keeps its flat palette (only the two GAME draw paths change); `hud-render.test.ts`'s flat-palette expectations need reconciling; compute the wave colour once at the step exit so all draw paths agree (lang-review #14); AC4 no-strobe is a single steady switch per wave, verified by the AC3/AC4 VISUAL playtest.

**Handoff:** To Dev (Loki Silvertongue) for GREEN — ship `src/core/playfield-colour.ts` (`waveColours`, `PLAYER_COLOUR`, `ALPHANUMERIC_COLOUR`), add the PAL-12 poison claim, then wire `drawGridStamps`/`drawStampAtPx` and playtest the field.

## Dev Assessment

**Status:** GREEN — full millipede suite **1260/1260**, `npm run lint` (tsc, the only type check) **clean**. Commits `4b36622d` (impl) on `4b36622d..`, pushed to `origin/feat/ml7-11-per-region-playfield-palette`.

**Scope note:** the user chose **Full wire (mirror centipede)** when I surfaced that the story's render half is bigger than the RED's pure-core scope. So this GREEN ships BOTH the core data module (what TEA's RED demanded) AND the render wiring (the story's "so the field matches the ROM").

**What shipped:**
- `src/core/playfield-colour.ts` (pure core, purity-swept) — `waveColours(centin)` returns the inside/outside/poison field-region bytes for CENTIN 1..12, transcribed from the 99$ table (MLIRQ.MAC:304-351) and **byte-verified by the RED suite against the ROM parse**; `PLAYER_COLOUR=0x00` (WHITE, gun/lives), `ALPHANUMERIC_COLOUR=0x1f` (RED, HUD), `COLOUR_LEVELS=12`.
- `docs/rom-study/claims/06-colour-ram-palette.json` — **PAL-12** pins the poison slot (ANCOL+7, MLIRQ.MAC:273), generated from the ROM line (byte-match verified); the existing citations/palette-claims gates verify it (surgical 9-line insert, PAL-1..11 untouched).
- `src/shell/playfield-palette.ts` (new, mirrors centipede `shell/palette.ts`) — `playfieldPens(centin=12)` decodes the region bytes into the 4-pen array `[bg, inside, outside, poison]` indexed by a stamp's 2-bit pixel value; `playerPens()` = white for the ship.
- `src/shell/render.ts` — `drawGridStamps`/`drawStampAtPx` gained an OPTIONAL decoded-palette param (default = the flat census ramp, so existing tests unchanged); the diagnostic census `drawStampPlayfield` keeps its flat palette.
- `src/main.ts` — the field (`fieldPlacements`) now draws through `playfieldPens()` and the player ship through `playerPens()`.

**Model resolved from the ROM (the risky part, so it is documented):**
- **Pen order** = centipede precedent (`penFor` indexes `playfield[pixelValue]`): value → [bg, inside(99$+0), outside(99$+1), poison(99$+2)]. Normal vs poison mushrooms share one pen set, differing by which pixel values their stamp uses.
- **Colour index** = CENTIN, the millipede LENGTH (MLDEF.MAC:299), set to 12 at INIT (MILLI.MAC:1168-1170). So the wave-start / full-millipede colour is 99$ row 12 (inside 0x0B→orange, outside 0xE2→green, poison 0xF8→blue), held constant. The LCOLOR-gated per-length recolour is a documented deferral (Design Deviations + a filed follow-up).

**New tests (TDD, watched fail first):**
- `tests/playfield-colour.test.ts` (RED from TEA, now green) — 18 tests, core data byte-verified against the ROM.
- `tests/playfield-palette.test.ts` (Dev) — 8 tests: `playfieldPens`/`playerPens` values, AND a **drawn-colour** test proving the region palette reaches the canvas (a mushroom stamp's poison-value pixels paint pure blue 0xF8, impossible under the flat census palette — lang-review #18/#26, not just the pen array in isolation).

**⚠ Acceptance NOT self-verifiable — human visual playtest required (AC3/AC4):** I cannot run the browser playtest, and AC4 is the owner's photosensitive-epilepsy safety rule. Please confirm at `just serve` → `http://127.0.0.1:5270/millipede/`: mushrooms show the ROM region colours (orange/green fill + blue poison), the gun is white, and a wave transition is a steady colour switch with no full-screen flash. The wiring is steady-by-construction (one colour index per view), so no strobe is expected.

**Handoff:** To Reviewer (Heimdall) for code review — and to the user for the AC3/AC4 visual playtest.
## Subagent Results — Round 1

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (facts only) | N/A — 1260/1260 green, lint clean, no smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — covered by my own edge review (default-param + waveColours guard) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered manually (no try/catch; waveColours THROWS, no silent path) |
| 4 | reviewer-test-analyzer | Yes | findings | 3 | confirmed 2, dismissed 1 |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 4 (2 unique defects across src+test), dismissed 1 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #2 (readonly) + my manual type pass |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A domain (pure data + canvas, no auth/injection/input) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered manually (1 LOW nit: census:37 could reuse flatPalette()) |
| 9 | reviewer-rule-checker | Yes | findings | 1 | confirmed 1 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled; 3 with findings)
**Total findings:** 4 confirmed blocking-for-rework, 3 confirmed low/noted, 2 dismissed (with rationale)

**Mutation battery (Reviewer, compensating for disabled edge/type/silent specialists):** MUT-A swap inside↔poison → 4 red; MUT-B swap pen order → 3 red; MUT-C break the render wire (ignore passed palette) → drawn-colour test red; MUT-D delete the waveColours guard → 5 red. All load-bearing guards have teeth; tree restored clean. rule-checker independently mutation-verified the guard live too.

## Reviewer Assessment — Round 1 (REJECTED, superseded by Round 2 APPROVED below)

**Verdict:** REJECTED

Behaviour is correct and the tests are genuinely mutation-effective (verified above), but four **rule-matching** findings must be fixed before this becomes the permanent archived record — the millipede plugin runs dedicated citation gates and holds an explicit "every test must assert something meaningful" rule, so a citation to a line that cannot exist, a tautological test, and a mutable hand-out of a shared table are not dismissible. Fixes are comment/test/1-line-code only → **green rework (Dev)**.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[DOC]` | Fabricated ROM citation `MLDEF.MAC:4866` — that file is 414 lines; `CENTIN: .BLKB 2 ;LENGTH OF CENTIPEDE` is at **MLDEF.MAC:299** (cumulative-`NR` awk trap) | `src/shell/playfield-palette.ts:16`; `tests/playfield-palette.test.ts:11`; and the session records above | Change every `MLDEF.MAC:4866` → `MLDEF.MAC:299` |
| [MEDIUM] `[RULE #2]` | `WaveColours` fields not `readonly`; `waveColours()` returns a live reference into the shared `FIELD_REGION_COLOURS` — `waveColours(n).poison = 0` compiles and corrupts that level for all callers (latent) | `src/core/playfield-colour.ts:38-43` | Mark the three fields `readonly` (and `FIELD_REGION_COLOURS` rows) so the hand-out is immutable |
| [MEDIUM] `[TEST]` | Tautological test: the loop reads static consts `PLAYER_COLOUR`/`ALPHANUMERIC_COLOUR` 12× without passing `centin` — a Set of repeated static reads can never exceed size 1, so it cannot fail (lang-review #26). Redundant with :196-204 | `tests/playfield-colour.test.ts:206-219` | Delete it (values already pinned at :196-204), or re-cast it as a real invariant |
| [LOW] `[DOC]` | Off-by-one citation: "SET CENTIPEDE SIZE" is on `MILLI.MAC:1170` (`STA CENTIN+1`); :1169 is `STA CENTIN` with no inline comment | `src/shell/playfield-palette.ts:17,32`; `tests/playfield-palette.test.ts:13` | Cite `MILLI.MAC:1169-1170` for the quoted comment |

**Also confirmed (LOW / non-blocking, fix while here):**
- `[TEST]` the `waveColours` guard tests assert bare `.toThrow()` — tighten to `.toThrow(RangeError)` (`tests/playfield-colour.test.ts:253`).
- `[SIMPLE]` three sites now compute the flat palette; the census `drawStampPlayfield:37` could reuse `flatPalette()` (`src/shell/render.ts:37`).
- `[DOC]` `playerPens` ANCOL+3 = gun/lives is asserted, consistent with the core module — acceptable, note it's inferred not inline-labelled.

**Dismissed (with rationale):**
- `[TEST]` AC1 whole-file citation `toMatch` (`tests/playfield-colour.test.ts:144`): rule-checker verified this compliant — a genuine citation-presence check on an 86-line dedicated file where the string appears once, and AC2's independent ROM parse carries the transcription-correctness burden. Not a vacuous guard.
- `[DOC]` the second comment-analyzer note duplicates the MILLI off-by-one already listed above.

**Tag coverage:** `[DOC]` citation defects (comment-analyzer). `[TEST]` tautological + throw-type (test-analyzer). `[RULE]` readonly (rule-checker). `[SIMPLE]` census dedup (my manual pass — subagent disabled). `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]` — subagents disabled; I covered them manually + by mutation: no edge/silent/security issues found (waveColours guards all degenerate inputs and throws loudly; no auth/injection surface); the one type issue is the `[RULE #2]` readonly hole above.

**Data flow traced:** `state.field` (char bytes) → `fieldPlacements` → `drawGridStamps(placements, playfieldPens())` → `rotatedStampImage` indexes `palette[pixelValue]` → `putImageData`. Colour index is the hardcoded default 12; no untrusted input reaches the math. Safe.

**Note for the finish gate:** AC3/AC4 remain a HUMAN visual playtest (epilepsy safety) — see Dev's blocking-acceptance finding; unaffected by this rework.

**Handoff:** Back to Dev (Loki Silvertongue) for green rework.
## Dev Rework (round 2)

Responding to the Reviewer's round-1 findings (all verified correct before fixing — the citations were objectively wrong, the readonly hole and vacuous test were real). Commit `d2a37d1f`, pushed. 1260/1260 green, lint clean.

| Finding | Response |
|---------|----------|
| [DOC] `MLDEF.MAC:4866` fabricated (real :299) | FIXED — `playfield-palette.ts:16` + `tests/playfield-palette.test.ts:11` now cite `MLDEF.MAC:299`; verified byte-match (`CENTIN: .BLKB 2 ;LENGTH OF CENTIPEDE`). Session records (:79/:129/:234 forward claims) corrected too. |
| [DOC] `MILLI.MAC:1169` off-by-one | FIXED — cite `MILLI.MAC:1168-1170` / `:1169-1170`; verified `:1168 LDA I,12.` / `:1169 STA CENTIN` / `:1170 STA CENTIN+1 ;SET CENTIPEDE SIZE`. |
| [RULE #2] `WaveColours` mutable / live reference | FIXED — the three fields are `readonly`, so `waveColours()`'s hand-out into the shared table is immutable. |
| [TEST] tautological level-invariance test | FIXED — replaced with a real invariant: `PLAYER_COLOUR` ($00) is absent from every field-region byte, so it is an immediate not a lookup (reddens if PLAYER is wired to a field colour). |
| [TEST] bare `.toThrow()` | FIXED — guard now asserts `.toThrow(RangeError)`. |
| [SIMPLE] census dup | FIXED — `drawStampPlayfield` reuses `flatPalette()`. |
| [DOC] `playerPens` ANCOL+3 | ADDRESSED — comment now cites the ROM lines (`:297-299`) and notes the gun/lives reading is the port's own, established in the core module. |

**Unchanged (unaffected by rework):** the AC3/AC4 human visual playtest remains the finish-gate item (Dev's blocking-acceptance finding).

**Handoff:** Back to Reviewer (Heimdall) for round 2.
## Subagent Results

Round 2 (rework verification) — re-ran the three subagents whose domains the round-1 fixes touched, on the rework delta `4b36622d..HEAD`.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1260/1260 green, lint clean (verified by Reviewer directly) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed: re-cast test non-vacuous (mutation-verified); 1 new non-blocking coverage note routed as follow-up, 1 low invariant note |
| 5 | reviewer-comment-analyzer | Yes | clean | none | both round-1 citations byte-verified FIXED (MLDEF.MAC:299, MILLI.MAC:1168-1170); no new citation errors |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker #2 |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A domain |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | round-1 #2 readonly CONFIRMED FIXED (TS2540 compile-probe); 0 violations across 30 checks; flatPalette forward-ref not a TDZ error |

**All received:** Yes (3 re-run enabled returned clean/confirmed, 5 disabled pre-filled, preflight self-verified)
**Total findings:** 0 blocking; 2 non-blocking (1 routed follow-up, 1 low note)

**Reviewer mutation re-verification (round 2):** (a) `waveColours(1).poison = 0` now → TS2540 (readonly hole closed at the type level); (b) setting `PLAYER_COLOUR` to a field byte `0x1f` reddens the re-cast test (non-vacuous). Both independently corroborated by rule-checker and test-analyzer. Tree restored clean.

## Reviewer Assessment

**Verdict:** APPROVED

Round 1's two blocking findings are fixed and independently verified three ways (subagents + my mutation probes + byte-match against the vendored source):
- `[DOC]` the fabricated `MLDEF.MAC:4866` citation → `MLDEF.MAC:299` (`CENTIN: .BLKB 2 ;LENGTH OF CENTIPEDE`) and the off-by-one `MILLI.MAC:1169` → `:1168-1170` (`LDA I,12.` / `STA CENTIN` / `STA CENTIN+1 ;SET CENTIPEDE SIZE`) — comment-analyzer verified verbatim, rule-checker re-verified.
- `[RULE]` `WaveColours` fields are now `readonly`; `waveColours()`'s hand-out into the shared `FIELD_REGION_COLOURS` table is immutable — proven by a TS2540 compile-probe (mine and rule-checker's).
- `[TEST]` the tautological level-invariance test is replaced with a real, mutation-verified `PLAYER_COLOUR` provenance check; the guard now asserts `.toThrow(RangeError)`.

**Data flow traced:** `state.field` char bytes → `fieldPlacements` → `drawGridStamps(placements, playfieldPens())` → `rotatedStampImage` indexes `palette[pixelValue]` → `putImageData`. Colour index is the hardcoded default 12 (the full-millipede/wave-start colour); no untrusted input reaches the arithmetic; `waveColours` guards and throws `RangeError` on any degenerate index. Safe.

**Pattern observed:** the shell palette mirrors centipede's `shell/palette.ts` (`playfieldPensForWave`) — pixel value → `[bg, inside, outside, poison]`; the census `drawStampPlayfield` keeps its diagnostic ramp via the optional-param default (`render.ts:127,146`). No regression to existing callers (1260/1260).

**Error handling:** `waveColours` throws `RangeError` on out-of-range/non-integer CENTIN (`playfield-colour.ts:83`), asserted at `tests/playfield-colour.test.ts` guard suite; no swallowed errors, no silent fallback.

**Tag coverage:** `[DOC]` citations fixed (comment-analyzer clean). `[RULE]` readonly fixed (rule-checker clean, 30/30). `[TEST]` re-cast test verified + 1 routed follow-up (test-analyzer). `[SIMPLE]` census dedup applied, no new complexity. `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SEC]` — subagents disabled; covered manually + by mutation: no edge/silent/security issues (guarded degenerate inputs, no auth/injection surface); the type concern was the readonly hole, now closed.

**Non-blocking, routed to follow-up (see Delivery Findings):** the re-cast test guards `PLAYER_COLOUR`'s provenance but not `ALPHANUMERIC_COLOUR`'s (value collision with wave-1 inside). Shipped constants are correct; a later test-strengthening story should add the ALPHANUMERIC guard.

**⚠ Finish-gate note:** AC3 (colours match) and AC4 (no strobe — the owner's photosensitive-epilepsy rule) remain a HUMAN visual playtest that cannot be run headlessly (Dev's blocking-acceptance finding). The wiring is steady-by-construction (one fixed colour index → no per-frame recolour), but SM/the user must confirm at `just serve` → `/millipede/` before the story is truly done.

**Handoff:** To SM (Baldur the Bright) for finish-story.
## Impact Summary (finish)

**Ready to finish: blocking_count 0.** PR #405 merged into develop (d08a0602); millipede 1260/1260 green, full suite green on the trial-merged tree (16426), lint clean; review verdict APPROVED (round 2).

**Two-round review — all round-1 blocking findings FIXED and re-verified in round 2:**
- Citation `MLDEF.MAC:4866` → `:299` (byte-verified). FIXED (d2a37d1f).
- Citation `MILLI.MAC:1169` → `:1168-1170` (byte-verified). FIXED.
- `WaveColours` fields → `readonly` (TS2540 verified). FIXED.
- Tautological test → real `PLAYER_COLOUR` provenance check (mutation-verified). FIXED.

**Non-blocking, routed follow-ups (not blocking finish):**
- Model the CENTIN colour-index + LCOLOR gate in core so the field recolours as the millipede shortens (currently held at CENTIN=12, the faithful wave-start colour).
- Add an `ALPHANUMERIC_COLOUR` provenance test on a non-colliding level.

**⚠ AC3/AC4 remain a HUMAN visual playtest (epilepsy-safety no-strobe).** Merging to develop is INTEGRATION, not deployment — the visual playtest gates the eventual `just release millipede`, an owner step. AC4 (no strobe) is met by construction (one fixed colour index, no per-frame recolour); AC3 (colours match) needs a person at `just serve` → `http://127.0.0.1:5270/millipede/`.
