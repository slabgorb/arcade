---
story_id: "tp1-12"
jira_key: "tp1-12"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-12: THE PALETTE — enemy colours come from a per-wave-group COLTAB bank, not a fixed hex (and this hands us the invisible wells for free)

## Story Details
- **ID:** tp1-12
- **Jira Key:** tp1-12
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T15:01:27Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T14:04:33+00:00 | 2026-07-14T14:08:13Z | 3m 40s |
| red | 2026-07-14T14:08:13Z | 2026-07-14T14:31:10Z | 22m 57s |
| green | 2026-07-14T14:31:10Z | 2026-07-14T14:47:10Z | 16m |
| review | 2026-07-14T14:47:10Z | 2026-07-14T15:01:27Z | 14m 17s |
| finish | 2026-07-14T15:01:27Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (blocking): the subsumed findings must be marked `remediated_by: tp1-12` and touched-file citations reanchored, or AC-6 (`npm test -- citations`) goes red on the next story. Affects `tempest/docs/audit/findings/pair-2-alvrom-shapes-font.json` (V-011, V-019), `pair-4-aldisp-b-well-projection.json` (DB-010, DB-017), `pair-3-aldisp-a-objects.json` (DA-005 colour-half) — each fix makes its own `ours` quote false; mark it `remediated_by`, then run `node tools/audit/reanchor-citations.mjs --write` for any cited file you edited (render.ts, glyphs.ts). *Found by TEA during test design.*
- **Improvement** (non-blocking): the palette's non-well consumers still need wiring — every enemy glyph colour (V-019, "the deepest change") and the rainbow starfield from wave 5 (DB-017). My suite pins the mechanism, the resolver, the well, and `blue`; the enemy/star draw paths are not pinned per-consumer. Affects `src/shell/render.ts` + `src/shell/glyphs.ts` (route enemy stroke colours and per-plane star colours through `paletteColor`, keeping stars blue only while level < 5). *Found by TEA during test design.*
- **Question** (non-blocking): the Superzapper well-flash reuses `LEVEL_COLORS` as its hue ramp. Affects `src/shell/render.ts:946` (`fx.zapFlash != null ? LEVEL_COLORS[...]`) — if Dev retires/repurposes `LEVEL_COLORS`, the flash needs a hue source, and `tests/shell/fx.superzapper.test.ts` may guard it. My tests deliberately do not require `LEVEL_COLORS`' removal, only that the well's per-level hue comes from the palette. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the deferred enemy recolouring is NOT a blanket glyph override — it must recolour only the palette-slot sub-stroke. Affects `src/shell/glyphs.ts` + `src/shell/render.ts` (the tanker's CARGO EMBLEM is a distinct-colour sub-stroke that signals cargo type, and the pulsar's white/cyan STROBE is state-driven; overriding the whole glyph with `paletteColor(level, slot)` would erase both). The follow-up needs RED tests that pin the recoloured stroke AND guard the emblem/strobe survive. *Found by Dev during implementation.*
- **Question** (non-blocking): AC-1 reads "enemies resolve colour through a palette SLOT." tp1-12 ships the mechanism, the cited banks, and the well/accent consuming it, but leaves enemy strokes on fixed hues (see Design Deviations → Dev). Reviewer/SM to rule whether that satisfies AC-1 for this story or whether the enemy wiring must land here. Affects the tp1-12 scope decision. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (blocking for the follow-up story, not for tp1-12): the deferred enemy/star recolouring follow-up must, before wiring, RESOLVE a ROM-semantic question the mechanism silently assumes — does the pulsar read COLTAB slot 4, or is it always PULPIC turquoise/white (tp1-3 / DA-020 established the pulsar colour is a PULPIC two-state toggle, NOT the per-wave slot)? And which tanker sub-stroke recolours (body only, keeping the cargo emblem)? Affects `src/shell/render.ts` + `src/shell/glyphs.ts`. Wire tanker/flipper/pulsar through `paletteColor(level, SLOT_*)` with sub-stroke-aware RED tests (guard the emblem + strobe survive), wire the starfield (DB-017, per-plane, blue only while level<5), then mark V-019/DB-017 `remediated_by`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the AC-1 well-WIRING is gated only by a gameable source-scan — test-analyzer mutation-proved that reverting render.ts to the old `LEVEL_COLORS[(s.level-1)]` bug (through an intermediate var) + a dead `wellColor()` call passes all 28 tests. The delivered wiring is correct (verified on-disk), but the gate is weak. Affects `src/shell/render.ts` + `tests/shell/tp1-12.palette.test.ts` — extract a pure `resolveWellColor(level, zapFlash)` helper that `render()` calls and unit-test it behaviourally; fold this into the enemy-wiring follow-up (it touches the same paths). *Found by Reviewer during code review.*
- **Improvement** (blocking for the follow-up story): `paletteColor(level, slot)` / `paletteBank(level)` are exported with a false `PaletteColor` return contract — an out-of-range `slot` returns `undefined`, and a non-finite `level` (NaN) makes `COLTAB_BANKS[NaN][slot]` throw in the render loop. Unreachable today (sole caller passes the constant `WELL_SLOT=6`; `s.level` is always finite per sim.ts:844's guard, Story 5-9), so non-blocking for tp1-12 — but it goes LIVE the moment the enemy-slot wiring adds callers. Affects `src/shell/glyphs.ts:367-374` — add `Number.isFinite(level)` + `slot` bounds guards WITH that wiring. Flagged by three specialists (security, test-analyzer, rule-checker). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

9 deviations

- **Palette lives in the pure `glyphs.ts` colour-authority module**
  - Rationale: matches the tp1-3 / Story 10-8 precedent (`lifeIconGlyph`, `playerBulletColor` are pure exports there), keeps GlyphColor + `blue` + the palette together, and a namespace import of an already-loading module makes a not-yet-added export read as `undefined` (clean partial-green) instead of a module-load crash.
  - Severity: minor
  - Forward impact: Dev may re-home the exports elsewhere, but glyphs.ts must surface them or the tests miss.
- **Only the LOW nibble (8 primary slots) is pinned; the high-nibble alternates are deferred**
  - Rationale: No AC covers splat/nymph/flash recolouring; pinning the high nibble would invent scope. The eight SLOTS (the low set) are what the ACs name.
  - Severity: minor
  - Forward impact: high-nibble alternates are a future story if ever wanted.
- **`black` is kept OUT of GlyphColor; palette colours are compared as strings**
  - Rationale: the AC forces exactly one type change (`blue`); no glyph/enemy is black (only the well, which isn't a glyph), so black need not join GlyphColor.
  - Severity: minor
  - Forward impact: Dev picks black's representation; the well's draw site must render it invisible.
- **Re-seated `render.bullet-color.test.ts`: the 6-7 ammo tint moves `cyan` → `blue`**
  - Rationale: a new gate (blue ≠ cyan) turns the sibling test red; TEA owns re-seating it so Dev isn't caught between the new AC and an old assertion.
  - Severity: minor
  - Forward impact: none — the correction aligns the test with the ROM.
- **AC-1's per-enemy recolouring is pinned via the resolver + the well, not every enemy's stroke**
  - Rationale: the mechanism + resolver + headline consumers (well) are the unambiguous, landable core; forcing every enemy glyph's per-frame recolour risks over-coupling canvas-private render code. Full consumer wiring is flagged as a Delivery Finding for Dev.
  - Severity: major
  - Forward impact: Dev must wire the palette into the enemy/star draw paths and mark all subsumed findings `remediated_by` — see Delivery Findings.
- **Per-enemy and starfield consumer wiring deferred; the WELL is wired**
  - Rationale: TEA's suite pins the resolver + the well, not per-enemy strokes. Enemy recolouring is V-019's "deepest change" with real subtleties (the tanker CARGO EMBLEM and the pulsar white/cyan STROBE are sub-strokes that must NOT be blanket-recoloured); doing it untested would risk those exact regressions. It needs its own RED tests. The invisible-well payoff — the story's headline — IS delivered.
  - Severity: major
  - Forward impact: a follow-up (or a Reviewer ruling) wires enemy/star colours through the palette WITH tests; V-019 and DB-017 are kept LIVE citations to mark that debt.
- **The invisible well renders as `#000000` via a `paletteHex` helper**
  - Rationale: keeps `black` out of `GlyphColor` and out of `GLYPH_HEX` (which stays `Record<GlyphColor,string>`), matching the TEA decision that no glyph is black.
  - Severity: minor
  - Forward impact: none.
- **The per-level HUD/frame/warp accent now derives from the palette (white on invisible waves)**
  - Rationale: the well and accent were one shared value; repointing the well to the palette carries the accent along, and a black HUD would be unusable, so it needs the white fallback.
  - Severity: minor
  - Forward impact: the HUD accent hues change to the authentic palette; no test pins HUD colour.
- **Citation remediation: DA-003 (a false CONFIRMED), DA-022, DB-010 frozen; the rest reanchored**
  - Rationale: a fix makes its own `ours` quote false; freezing records history and stops re-opening. Leaving the unfixed findings live is honest debt.
  - Severity: minor
  - Forward impact: when the deferred enemy/star wiring lands, V-019/DB-017 get `remediated_by` then.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Palette lives in the pure `glyphs.ts` colour-authority module**
  - Spec source: context-story-tp1-12.md, AC-1 ("enemies resolve colour through a palette SLOT")
  - Spec text: "The six COLTAB banks are transcribed from the ROM and cited."
  - Implementation: Tests import `COLTAB_BANKS` / `paletteBank` / `paletteColor` / `wellColor` from `src/shell/glyphs.ts` (namespace import), rather than a new `palette.ts`.
  - Rationale: matches the tp1-3 / Story 10-8 precedent (`lifeIconGlyph`, `playerBulletColor` are pure exports there), keeps GlyphColor + `blue` + the palette together, and a namespace import of an already-loading module makes a not-yet-added export read as `undefined` (clean partial-green) instead of a module-load crash.
  - Severity: minor
  - Forward impact: Dev may re-home the exports elsewhere, but glyphs.ts must surface them or the tests miss.
- **Only the LOW nibble (8 primary slots) is pinned; the high-nibble alternates are deferred**
  - Spec source: context-story-tp1-12.md, AC-5 ("The ROM's palette is eight slots")
  - Spec text: "Nothing outside those eight slots ships."
  - Implementation: COLTAB bytes are nibble-packed (low → COLRAM[0-7], high → COLRAM+8[8-15] = SPLAT/NYMPH/FLASH). Tests pin the low nibble only.
  - Rationale: No AC covers splat/nymph/flash recolouring; pinning the high nibble would invent scope. The eight SLOTS (the low set) are what the ACs name.
  - Severity: minor
  - Forward impact: high-nibble alternates are a future story if ever wanted.
- **`black` is kept OUT of GlyphColor; palette colours are compared as strings**
  - Spec source: context-story-tp1-12.md, AC-4 ("`blue` is added to GlyphColor")
  - Spec text: only `blue` is named as a GlyphColor addition.
  - Implementation: bank 4 slot 6 is ZBLACK. Tests assert `wellColor(70) === 'black'` as a STRING, without importing a colour type — so whether Dev models black as `GlyphColor | 'black'`, a `PaletteColor` union, or a well-draw special-case is Dev's call.
  - Rationale: the AC forces exactly one type change (`blue`); no glyph/enemy is black (only the well, which isn't a glyph), so black need not join GlyphColor.
  - Severity: minor
  - Forward impact: Dev picks black's representation; the well's draw site must render it invisible.
- **Re-seated `render.bullet-color.test.ts`: the 6-7 ammo tint moves `cyan` → `blue`**
  - Spec source: audit finding V-011 (subsumed), ALDISP.MAC:925 `LDY ZBLUE`
  - Spec text: "the 6-7 tint is 'cyan' (turquoise), where the ROM uses ZBLUE ... GlyphColor has no 'blue' — the type needs one."
  - Implementation: Story 10-8 deliberately mapped the middle tier onto `cyan`; V-011 reverses that. Edited that sibling suite's assertions (and header) cyan→blue. Its intent (tint by charge count, three distinct buckets, never white) is unchanged.
  - Rationale: a new gate (blue ≠ cyan) turns the sibling test red; TEA owns re-seating it so Dev isn't caught between the new AC and an old assertion.
  - Severity: minor
  - Forward impact: none — the correction aligns the test with the ROM.
- **AC-1's per-enemy recolouring is pinned via the resolver + the well, not every enemy's stroke**
  - Spec source: context-story-tp1-12.md, AC-1; audit finding V-019 ("the deepest change on this list")
  - Spec text: "enemies resolve colour through a palette SLOT, not a hard-coded hex."
  - Implementation: pinned HARD are the six banks, `paletteBank`, `paletteColor(level, slot)` (tanker/flipper/pulsar slots), the invisible well, and the well's render wiring. NOT pinned per-enemy is each glyph's stroke resolving through the palette at draw time.
  - Rationale: the mechanism + resolver + headline consumers (well) are the unambiguous, landable core; forcing every enemy glyph's per-frame recolour risks over-coupling canvas-private render code. Full consumer wiring is flagged as a Delivery Finding for Dev.
  - Severity: major
  - Forward impact: Dev must wire the palette into the enemy/star draw paths and mark all subsumed findings `remediated_by` — see Delivery Findings.

### Dev (implementation)
- **Per-enemy and starfield consumer wiring deferred; the WELL is wired**
  - Spec source: context-story-tp1-12.md, AC-1; audit V-019, DB-017
  - Spec text: "Enemies resolve colour through a palette SLOT, not a hard-coded hex."
  - Implementation: delivered the palette (COLTAB_BANKS + paletteBank/paletteColor/wellColor, cited) and wired the WELL + the per-level HUD/frame/warp accent through it. The enemy glyph draw paths (tanker/flipper/pulsar) and the starfield still use fixed hues — not routed through `paletteColor`.
  - Rationale: TEA's suite pins the resolver + the well, not per-enemy strokes. Enemy recolouring is V-019's "deepest change" with real subtleties (the tanker CARGO EMBLEM and the pulsar white/cyan STROBE are sub-strokes that must NOT be blanket-recoloured); doing it untested would risk those exact regressions. It needs its own RED tests. The invisible-well payoff — the story's headline — IS delivered.
  - Severity: major
  - Forward impact: a follow-up (or a Reviewer ruling) wires enemy/star colours through the palette WITH tests; V-019 and DB-017 are kept LIVE citations to mark that debt.
- **The invisible well renders as `#000000` via a `paletteHex` helper**
  - Spec source: context-story-tp1-12.md, AC-3; audit DB-010, ALDISP.MAC:2447 `.BYTE ZBLACK`
  - Spec text: "Waves 65-80 render as INVISIBLE WELLS."
  - Implementation: `wellColor(level)` returns the `PaletteColor` name; render.ts maps it to a pixel with `paletteHex` — the seven visible names via `GLYPH_HEX`, `black` → `#000000` (black-on-black; the tube's stroke, halo and gradient all resolve to black, so it vanishes).
  - Rationale: keeps `black` out of `GlyphColor` and out of `GLYPH_HEX` (which stays `Record<GlyphColor,string>`), matching the TEA decision that no glyph is black.
  - Severity: minor
  - Forward impact: none.
- **The per-level HUD/frame/warp accent now derives from the palette (white on invisible waves)**
  - Spec source: audit DB-010 / V-019 (`ours: render.ts:20-22 LEVEL_COLORS`)
  - Spec text: the accent was `LEVEL_COLORS[(s.level - 1) % LEVEL_COLORS.length]`.
  - Implementation: removed that expression (TEA pins its removal). The shared `color` accent (HUD, framing screens, warp) now = the palette well colour, EXCEPT on waves 65-80 where the well is black — there the accent falls back to white so the HUD/frame stay legible. `LEVEL_COLORS` survives only as the Superzapper strobe ramp.
  - Rationale: the well and accent were one shared value; repointing the well to the palette carries the accent along, and a black HUD would be unusable, so it needs the white fallback.
  - Severity: minor
  - Forward impact: the HUD accent hues change to the authentic palette; no test pins HUD colour.
- **Citation remediation: DA-003 (a false CONFIRMED), DA-022, DB-010 frozen; the rest reanchored**
  - Spec source: context-story-tp1-12.md, AC-6; tempest/CLAUDE.md citation rules
  - Spec text: "npm test -- citations stays green."
  - Implementation: marked `remediated_by: tp1-12` on DB-010 (well fixed), DA-022 (blue added), and DA-003 — a CONFIRMED whose quoted `return 'cyan'` line I changed to `'blue'`; it and DA-022 cite the SAME line with opposite verdicts, so DA-003 was a *false CONFIRMED* now superseded. Ran `reanchor-citations.mjs --write` (45 drifted citations relocated, 0 lost). V-019, V-011, DB-017 kept LIVE (their divergences — enemy hues, bullet recolour scope, star colours — genuinely remain).
  - Rationale: a fix makes its own `ours` quote false; freezing records history and stops re-opening. Leaving the unfixed findings live is honest debt.
  - Severity: minor
  - Forward impact: when the deferred enemy/star wiring lands, V-019/DB-017 get `remediated_by` then.

### Reviewer (audit)
Every logged deviation stamped. All ACCEPTED — none reversed.
- **TEA #1 palette in glyphs.ts** → ✓ ACCEPTED: matches the tp1-3/10-8 precedent; rule-checker confirmed glyphs.ts stays import-free (SHELL boundary intact).
- **TEA #2 low-nibble only** → ✓ ACCEPTED: no AC covers the high-nibble splat/nymph/flash alternates; correct scoping.
- **TEA #3 black out of GlyphColor, strings** → ✓ ACCEPTED: `paletteHex`'s `=== 'black'` narrowing is type-sound (`tsc --noEmit` clean, rule-checker rule 3 confirmed).
- **TEA #4 re-seat bullet cyan→blue** → ✓ ACCEPTED: V-011 is correct (ALDISP.MAC:925 `LDY ZBLUE`, independently confirmed); the re-seat is a fully-coupled real-import gate (test-analyzer confirmed).
- **TEA #5 AC-1 pinned via resolver+well, not per-enemy** → ✓ ACCEPTED (see AC-1 ruling in the assessment): the deferral is sound; forcing untested enemy strokes now would be reckless.
- **Dev #1 enemy/star wiring deferred** → ✓ ACCEPTED (see AC-1 ruling): a required follow-up, not this slice.
- **Dev #2 black → `#000000` via paletteHex** → ✓ ACCEPTED: verified on-disk — well rim/spokes/gradient all resolve to black; invisible well correct.
- **Dev #3 HUD/frame/warp accent from palette (white on invisible waves)** → ✓ ACCEPTED: verified legible; the well-colour-tracks-accent behaviour pre-dates this story (LEVEL_COLORS was shared), so no regression. Minor fidelity nit (authentic HUD/LETTERS colour is slot 5/7, not white) noted as non-blocking.
- **Dev #4 citation remediation DA-003/DA-022/DB-010** → ✓ ACCEPTED: independently verified — exactly those three frozen, V-019/V-011/DB-017 correctly left LIVE; rule-checker confirmed the bookkeeping is internally consistent with what each diff actually fixed.

## Sm Assessment

**Setup complete — routing to TEA (Imperator Furiosa) for the red phase.**

**Why this story, now:** Stranger came in for tp1-17 (SHAPES). Its prose declares a
soft dependency — *"Depends on tp1-12 for the colours"* — yet its structured
`depends_on` is `null` and tp1-12 (THE PALETTE) was still in backlog. tp1-17's
fuseball is the one shape whose colour would be fed by tp1-12's COLTAB bank, so
landing tp1-12 first means nothing in tp1-17 gets stubbed then re-wired. Stranger
chose to reorder: tp1-12 first. tp1-12 has no blockers of its own (`depends_on:
null`), no open PRs on tempest — merge gate clear.

**What this story is:** A single indirection — `enemy -> fixed hex` becomes
`enemy -> palette slot -> per-wave-group COLTAB bank`. Six banks, advancing every
16 waves. The payoff is the invisible-well waves (65-80), which fall out of the
indirection for free.

**For TEA — this is a ROM-transcription story, not a feel-tuning one.** The ACs are
ROM-grounded and each is independently pinnable:
- Enemies resolve colour through a palette SLOT; the six COLTAB banks must be
  transcribed from the ROM **and cited** (`npm test -- citations` stays green).
- Bank advances every 16 waves.
- Waves 65-80 render as INVISIBLE WELLS — pin this as a test; it is the visible
  proof the mechanism is right, not a nice-to-have.
- `blue` is added to GlyphColor.
- The palette is exactly EIGHT slots — nothing outside them ships (orange is not in
  it; that belongs to tp1-3's spiker). Guard the eight-slot boundary.

The ROM is canonical here — transcribe the COLTAB values against Theurer's source
and full-diff them, don't hand-pick or feel-tune. The `rom-fidelity-audit` skill
and the ROM location notes apply.

**Branch:** `feat/tp1-12-palette-coltab` (tempest, off `develop`). Witness me.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** ROM-transcription + behaviour story; the palette data, bank selection, and invisible wells are all unit-pinnable.

**Test Files:**
- `tempest/tests/shell/tp1-12.palette.test.ts` (new) — the palette: six banks, bank selection, the resolver, the invisible wells, `blue`, and the eight-slot/no-orange guard.
- `tempest/tests/shell/render.bullet-color.test.ts` (re-seated) — the 6-7 ammo tint moves `cyan` → `blue` per V-011.

**Tests Written:** 28 new (palette) + 4 re-seated (bullet) covering AC-1..AC-5; AC-6 (citations) is a standing gate, already green.
**Status:** RED — verified directly (not via testing-runner, which confabulates). Full suite: **2 files failed | 85 passed; 31 tests failed | 1009 passed.** All 31 failures are in these two files, each failing for the right reason (undefined `COLTAB_BANKS`/`paletteBank`/`paletteColor`/`wellColor`; missing `blue` in `GlyphColor`; `cyan` ≠ `blue`). The `citations` gate is among the 1009 green.

**AC → test map:**
- AC-1 (palette indirection, six banks cited): the 48-entry byte-for-byte compare vs ALDISP.MAC:2406-2456, the `paletteColor` resolver (tanker/flipper/pulsar slots), the well render-wiring scans.
- AC-2 (advance every 16 waves): `paletteBank` boundary battery + the ROM formula across 96 waves + the walk-off (saturate at bank 5 forever).
- AC-3 (invisible wells 65-80): `wellColor` = ZBLACK for all of 65..80, and black NOWHERE else (1..300 sweep).
- AC-4 (`blue` in GlyphColor): source-scan the type union + `blue`≠`cyan` pixel + the ZBLUE ammo tint.
- AC-5 (eight slots, no orange): only the eight ROM colours ship; orange never; orange stays a GlyphColor for non-palette uses.

### Rule Coverage

| Rule (lang-review TS / test-paranoia) | Test(s) | Status |
|------|---------|--------|
| Boundary / off-by-one at table edges | `holds one bank … then steps at the boundary`, `agrees with the ROM formula` | failing |
| Walk-off past the last table row (sidecar) | `saturates at bank 5 forever …`, `a deep wave resolves to bank 5's ACTUAL colours` | failing |
| #4 null/undefined — falsy-but-valid low end | `clamps the low end defensively (level 0/1 → bank 0)` | failing |
| Silent-default distinguishability (black ≠ fall-through) | `the black band is EXACTLY 65-80` | failing |
| Exhaustive colour vocabulary (#3 exhaustiveness) | `produces only the ROM's eight colours`, `uses all eight` | failing |
| Distinct-value invariant | `blue is a DISTINCT pixel from cyan` | failing |
| #8 over-fix guard | `orange remains a GlyphColor for non-palette uses` | passing (guard) |

**Rules checked:** the runtime-bug-prone TS rules that apply to a data-transcription story (boundaries, undefined fall-through, exhaustiveness, distinct-value) all have coverage. React/async/build rules N/A.
**Self-check:** 1 vacuous test found and fixed — `every bank has exactly EIGHT slots` passed vacuously on the empty fallback; added a `toBeDefined` precondition so it is RED until implemented.

**Handoff:** To Dev (The Word Burgers) for GREEN. Read the Delivery Findings — the `remediated_by` + reanchor obligation is blocking for AC-6.

## Dev Assessment

**Implementation Complete:** Yes (for the scoped slice — see Design Deviations → Dev for the deferred enemy/star wiring).

**Files Changed:**
- `tempest/src/shell/glyphs.ts` — added `blue` to `GlyphColor` + a `PaletteColor` (`| 'black'`); the palette: `COLTAB_BANKS` (six banks, cited to ALDISP.MAC:2406-2456), `WELL_SLOT`, `paletteBank`, `paletteColor`, `wellColor`; `playerBulletColor` 6-7 tint `cyan → blue`.
- `tempest/src/shell/render.ts` — `GLYPH_HEX.blue` (`#2b6bff`, distinct from cyan); `paletteHex` (black → `#000000`); the WELL + the HUD/frame/warp accent now derive from `wellColor(s.level)` (white fallback when the well is black); removed the `LEVEL_COLORS[(s.level-1)]` well index (LEVEL_COLORS kept only as the Superzapper strobe ramp); refreshed stale comments.
- `tempest/docs/audit/findings/pair-3-aldisp-a-objects.json`, `pair-4-aldisp-b-well-projection.json` — `remediated_by: tp1-12` on DA-003, DA-022, DB-010; `reanchor-citations.mjs --write` relocated 45 drifted citations (0 lost).

**Tests:** 1040/1040 passing (GREEN) — verified directly. `tsc --noEmit` clean; `npm run build` (tsc + vite) succeeds; `npm test -- citations` green (AC-6).

**AC status:** AC-2 (bank every 16 waves), AC-3 (invisible wells 65-80), AC-4 (`blue`), AC-5 (eight slots / no orange), AC-6 (citations) — fully met. AC-1: the palette + resolver + cited banks + the well/accent consuming it are delivered; the enemy/star DRAW paths are deferred with a documented rationale + follow-up (see deviations & Delivery Findings; Reviewer to rule).

**Branch:** feat/tp1-12-palette-coltab (pushed)

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1040/1040 green, tsc/build clean, citations 12/12, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — self-assessed (boundary/walk-off; see observations) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — self-assessed (no swallowed errors; pure lookups) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (1 high, 2 med, 3 low) | confirmed 3, deferred 3 (to follow-up); mutation-confirmed data/resolver/wells gated |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — self-assessed (comments refreshed, accurate; see [DOC]) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — self-assessed + covered by rule-checker rules 1-3 |
| 7 | reviewer-security | Yes | findings | 2 (1 med, 1 low) | confirmed 2 (both non-blocking, latent robustness) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — self-assessed (no over-engineering; minimal, focused) |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation (rule 4) | confirmed 1 (downgraded High→Medium, latent; required in follow-up) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled and self-assessed)
**Total findings:** 3 confirmed (non-blocking), 0 dismissed, 3 deferred to the enemy-wiring follow-up

## Reviewer Assessment

**Verdict:** APPROVED

The delivered slice is correct, ROM-accurate, and well-tested where it counts; every finding is latent, test-robustness, or documented scope — no current defect blocks. I ruled explicitly on the open AC-1 question rather than rubber-stamping it (below).

**AC-1 RULING (the open question TEA/Dev escalated).** AC-1 has two clauses: (a) "the six COLTAB banks are transcribed from the ROM and cited" — MET and independently verified; (b) "enemies resolve colour through a palette SLOT, not a hard-coded hex" — the mechanism, resolver, and the WELL/accent consuming it are delivered, but the enemy DRAW paths are NOT yet routed through the palette. I ACCEPT the scope split and approve, because: (1) forcing enemy recolouring now would be reckless — it needs sub-stroke-aware tests (the tanker cargo emblem and pulsar strobe are gameplay tells that a blanket override would erase) that were never written; (2) it carries an UNRESOLVED ROM-semantic question — tp1-3/DA-020 established the pulsar's colour is a PULPIC turquoise/white toggle, which may OVERRIDE COLTAB slot 4, so wiring slot 4 blind could introduce a fidelity bug; (3) the epic itself has precedent for shipping a slice with a documented, unticked AC clause (tp1-1's WD-010, "deliberately left unticked, as the record of the gap"); (4) the headline payoff — the invisible-well waves 65-80 — IS delivered and correct. The enemy/star recolouring is a REQUIRED follow-up (see Delivery Findings → Reviewer), and V-019/DB-017 are deliberately left as LIVE citations to track that debt. **Stranger: if you want the enemy recolouring IN tp1-12 rather than a follow-up, this is the point to say so before SM merges.**

**Independent verification (not trusting the test's own golden):**
- [VERIFIED] COLTAB_BANKS matches the ROM byte-for-byte — evidence: independently re-derived all 48 entries from ALDISP.MAC:2406-2456 + the Z→colour constants at ALCOMN.MAC:375-382, decoded low-nibble per byte, diffed against src/shell/glyphs.ts:347-360 → all 6 banks MATCH. The well slot-6 sequence (blue,red,yellow,cyan,black,green) matches DB-010. This is the check the reviewer sidecar demands — the suite pins the impl against its OWN golden, so a shared mistranscription would be invisible; it is not present.
- [VERIFIED] bank selection matches INICOL — evidence: `Math.max(0, Math.min(5, Math.floor((level-1)/16)))` (glyphs.ts:367) is `(min(CURWAV&0x70,0x5F))>>4` in 1-based-level terms; boundaries + walk-off mutation-confirmed by test-analyzer.
- [VERIFIED] the well renders invisible AND the HUD stays legible on waves 65-80 — evidence: render.ts:939-940 `wellName='black' → color=GLYPH_HEX.white` (HUD/frame/warp) and render.ts:964-967 `wellHex=paletteHex('black')='#000000'` (well); read on-disk.
- [VERIFIED] citation remediation is honest — evidence: exactly DA-003/DA-022/DB-010 carry `remediated_by: tp1-12`; V-019/V-011/DB-017 left LIVE; `npm test -- citations` 12/12 green; rule-checker confirmed internal consistency.
- [VERIFIED] SHELL boundary intact — evidence: glyphs.ts has zero imports (rule-checker rule 14); the palette takes `level: number`, touches no core/DOM/time/random.

**Confirmed findings (all non-blocking):**
- [RULE][SEC][TEST] MEDIUM (downgraded from rule-checker High, with rationale) — paletteColor/paletteBank lack input validation: out-of-range `slot` → undefined (false PaletteColor contract); non-finite `level` → COLTAB_BANKS[NaN][slot] throws in the render loop. glyphs.ts:367-374. Confirmed by THREE specialists. Downgraded because it is UNREACHABLE today (sole caller passes constant WELL_SLOT=6; s.level is always finite via sim.ts:844's Story-5-9 NaN guard). NOT dismissed — required in the enemy-slot wiring follow-up, where it goes live.
- [TEST] MEDIUM — the AC-1 well-WIRING source-scan is gameable (mutation-confirmed: the old bug + a dead call passes all 28 tests). tests/shell/tp1-12.palette.test.ts. Delivered wiring is correct; the gate is weak. Fix: extract a pure `resolveWellColor(level, zapFlash)` and unit-test it — folded into the follow-up (same render paths).
- [TEST] SCOPE — AC-1 enemy draw paths untested because unwired (the ruling above).

**Self-assessed domains (subagents disabled):**
- [EDGE] Boundary/walk-off: exhaustively covered by the suite (all 5 group boundaries, walk-off to level 10,000, the exact 65/80 band, a 1-300 "black nowhere else" sweep). Low-end negative levels are handled by `Math.max(0,...)` but only 0/1 are tested (low-severity gap, noted).
- [SILENT] No swallowed errors: the additions are pure lookups + a ternary; no try/catch, no empty catch, no silent fallback beyond the documented `paletteHex` black→#000000 mapping (intended, not a swallow).
- [DOC] Comments refreshed and ACCURATE: the stale "LEVEL_COLORS' eight hues double as the well-color ramp" and "Per-level color cycling" comments were correctly updated to describe the palette; the ALDISP citations in the new COLTAB comment are verbatim-correct (I re-opened them).
- [TYPE] Type design sound: `PaletteColor = GlyphColor | 'black'` cleanly models "no glyph is black"; `paletteHex`'s narrowing keeps GLYPH_HEX typed `Record<GlyphColor,string>` (exhaustive, tsc clean). COLTAB_BANKS is `readonly` at both levels.
- [SIMPLE] No over-engineering: the palette is minimal data + three one-line pure functions; no speculative abstraction. The `resolveWellColor` extraction I recommend is for testability, not present bloat.

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` (via reviewer-rule-checker, cross-checked by me): 15 checks, 33 instances, **1 violation**.

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 Type-safety escapes | 3 | Compliant — zero `as any`/`as unknown as`/`@ts-ignore` in src/; the two test-only double-casts are the justified missing-export pattern |
| #2 Generics/readonly | 3 | Compliant — COLTAB_BANKS readonly at both levels; GLYPH_HEX is `Record<GlyphColor,string>` |
| #3 Enum/exhaustiveness | 2 | Compliant — GLYPH_HEX exhaustive over 8 GlyphColors; paletteHex narrowing sound (tsc clean) |
| #4 Null/undefined | 4 | **VIOLATION** — paletteColor's `slot` (and paletteBank's NaN `level`) unguarded (see finding above); other 3 instances compliant |
| #5 Module/declaration | 3 | Compliant — type-only imports/exports marked; `.ts?raw` is Vite convention under bundler resolution |
| #6 React/JSX | 0 | N/A |
| #7 Async/Promise | 0 | N/A |
| #8 Test quality | 4 | Compliant — optional-chained asserts fail (not pass) on missing exports; bullet re-seat fully coupled |
| #9 Build/config | 0 | N/A |
| #14 (add'l) SHELL boundary | 2 | Compliant — glyphs.ts import-free; no src/core touched |
| #15 (add'l) Citation gate | 5 | Compliant — 12/12 green; remediated_by bookkeeping internally consistent |

### Devil's Advocate

Let me argue this code is broken. First attack: the whole story is a Potemkin palette. The title promises "enemy colours come from a per-wave-group COLTAB bank," yet a player grinding to wave 40 sees the identical red flipper and purple tanker they saw on wave 1 — nothing about the ENEMIES changed. Only the well cycles. A cynic would say the story shipped its parenthetical ("the invisible wells") and quietly dropped its headline. This is real, and it is exactly why I did not let it pass silently — I ruled on it, required the follow-up, and left V-019 as a live citation so the debt cannot be forgotten. It is a scope decision, not a hidden defect.

Second attack: the render loop can crash. `wellColor(s.level)` runs every frame; if `s.level` were ever NaN, `COLTAB_BANKS[NaN][6]` throws and the game dies. A malicious or confused input path that poisons the level to NaN is a client-side DoS. I chased the provenance: `s.level` is only set from `selectedLevel` (clamped 1..MAX, with an explicit `Number.isFinite` guard at sim.ts:844 whose comment literally warns "a NaN spin would poison selectedLevel") or the demo RNG. No save/continue restores a raw GameState. So the crash is real but unreachable today — a landmine for the future, defused by requiring the guard when the enemy-slot wiring widens the callers.

Third attack: a stressed refactor silently reverts the fix. The AC-1 wiring test only greps the source for the symbol; test-analyzer PROVED a future dev could restore the old LEVEL_COLORS bug and stay green. So the one AC-1 behaviour delivered (the well) is not behaviourally locked. True — I confirmed it as a finding and required the `resolveWellColor` extraction. The code is correct now; the guard against regression is what is thin.

Fourth attack: the HUD goes wrong on invisible-well waves — a confused player on wave 70 might see a white HUD where the arcade showed the LETTERS colour (slot 5/7). Minor fidelity, no AC, and better than an invisible HUD. Fifth: could the transcription be subtly wrong and both the golden and the impl share the error? That is the scariest failure mode for a transcription story — so I did not trust the test; I re-derived the table from the assembler myself, and it matches. The palette is real. The verdict stands: approve the correct slice, block nothing that is a current defect, and hold the follow-up to account.

**Data flow traced:** `s.level` (finite int ≥1) → `wellColor(s.level)` → `paletteColor(level,6)` → `COLTAB_BANKS[paletteBank(level)][6]` → PaletteColor name → `paletteHex` → hex → `drawTube`. Safe for all reachable inputs; the sole hazard (NaN/out-of-range) is unreachable and tracked.
**Pattern observed:** pure exported colour logic in glyphs.ts (matches lifeIconGlyph/playerBulletColor precedent) at src/shell/glyphs.ts:347-379.
**Error handling:** pure lookups need none for valid inputs; the one gap (input validation on the public export) is confirmed and deferred to the follow-up.

**Handoff:** To SM (The Organic Mechanic) for finish-story.