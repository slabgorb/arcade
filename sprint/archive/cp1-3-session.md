---
story_id: "cp1-3"
jira_key: "cp1-3"
epic: "cp1"
workflow: "tdd"
---
# Story cp1-3: Picture-ROM transcription — decode 136001.201/202 into src/core/pictures.ts, byte-gated against the chips

## Story Details
- **ID:** cp1-3
- **Jira Key:** cp1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Repo:** centipede
- **Branch:** feat/cp1-3-picture-rom-transcription

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T23:46:56Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-18T22:39:40Z | 2026-07-18T22:41:33Z | 1m 53s |
| red | 2026-07-18T22:41:33Z | 2026-07-18T23:18:10Z | 36m 37s |
| green | 2026-07-18T23:18:10Z | 2026-07-18T23:34:02Z | 15m 52s |
| review | 2026-07-18T23:34:02Z | 2026-07-18T23:46:56Z | 12m 54s |
| finish | 2026-07-18T23:46:56Z | - | - |

## Story Summary

Decode the rev-2 picture ROM binaries (vendored VERBATIM at arcade/reference/atari-source/centipede/revision.v2/136001.201-202 — rev 4 shipped these chips) into a committed data module: tiles and sprites with names cross-referenced to CENPIC.MAC labels (CENPIC is .RADIX 16 at line 8, assembled OUTSIDE the CPU link). A vitest re-derives every tile from the ROM bytes and compares byte-exact, so the transcription is auditable, not asserted. Bake a contact-sheet artifact for human review (bake-models.mjs precedent at the orchestrator). NO hand-authored pixels anywhere.

## Acceptance Criteria

1. A test decodes 136001.201/202 from the vendored tree and matches src/core/pictures.ts byte-for-byte; it degrades to committed-fixture comparison when the tree is absent (CI).
2. Tile/sprite names traceable to CENPIC.MAC labels; naming table committed in the story docs.
3. Contact sheet baked and committed; mushroom, all centipede head/body frames, spider, flea, scorpion, player gun, shot, and the character/digit tiles are all present and identified.
4. Zero hand-drawn pixel data: every byte in pictures.ts provably originates in the ROM dump.

## Delivery Findings

Carry-forward from cp1-2 review:
- (a) The citation checker's search path deliberately EXCLUDES revision.v2/ — cp1-3 must extend it for any new claims citing revision.v2/ files (CENPIC.MAC etc.).
- (b) When broadening the search path, add a path-traversal containment assertion in tools/audit/check-citations.mjs `resolveInTree` (currently none — trusted-JSON threat model, but the slash-branch is the intended mechanism for revision.v2/ citations).
- The citations gate is LIVE (cp1-2 shipped): every transcribed constant/label fact needs a radix-cited comment and a claims/*.json entry; CENPIC.MAC is .RADIX 16 — hex values.
- The picture ROM binaries are BINARY files vendored verbatim by extension; the decode test must read them as bytes, never as text.
- Purity guard governs src/core/pictures.ts — it's core, so no browser globals/wall-clock.

### TEA (test design)
- **Improvement** (non-blocking): CENPIC.MAC is byte-identical at the tree ROOT and under `revision.v2/` (both sha1 `12dceaf4…`), so a bare `CENPIC.MAC` citation already resolves at root today. cp1-3 path-qualifies as `revision.v2/CENPIC.MAC` anyway — per open-questions #2 ("graphics ground truth is rev-2's artifacts") — to make provenance explicit and to exercise the hardened slash-branch. *Found by TEA during test design.*
- **Gap** (non-blocking): the vendored picture binaries are named `136001.201/.202`, but their SHA1 is byte-identical to MAME's shipped rev-4 chips `136001-211/212` (`centiped.cpp:2034-2035`). brief §1 cites the rev-1 part numbers `136001-101/102` (`CENTI.DOC:18`). Three naming schemes (ledger vs dump vs MAME) for the SAME bytes — recorded so a future reader doesn't chase the 201-vs-211-vs-101 mismatch. *Found by TEA during test design.*
- **Improvement** (non-blocking): the decode LAYOUT is not a baked dossier fact (open-questions has no picture entry). TEA established it from CENPIC structure + MAME's gfx layout and pinned it as claims-backed constants; the full ruling is in the TEA Assessment for Dev. Consider back-filling a `docs/rom-study` picture-subsystem note in a later story. *Found by TEA during test design.*

### Reviewer (code review)
- **Improvement** (non-blocking): the 2bpp decode ORIENTATION (MSB-first x, plane roles) is the one link not silicon-gated — `pictures.test.ts`'s golden compares `decodeStamp` to a twin `refDecode` using the same `0x80>>x` / `upper<<1|lower` formula, and the MAME `centiped.cpp:1722` spritelayout that corroborates it is NOT vendored in this checkout (corroboration is shape-validated, not byte-verified). The plane BYTES (the epic's pixel ground truth) are byte-exact regardless; orientation is corroborated by the cited MAME layout + visually-true glyph renders and would be cheaply fixed by a later render story without moving the data. A future render story should pin at least one hand-derived pixel grid (independent of `refDecode`) to lock orientation. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `decodeStamp` (and `decodeStampPlanar`) hardcode the inner loop bound `x < 8` rather than the exported `SPRITE_W`/`TILE_W` (both = 8). Harmless today; a future non-8-wide stamp kind would need both the constant and the literal changed. *Found by Reviewer during code review.*

### Dev (implementation)
- **Gap** (non-blocking): CENPIC.MAC also defines `PLAY0-8` (16-byte motion objects, offsets `0x100`/`0x300`ish — never named "player" anywhere in comments, purpose unconfirmed), `GRASS0-3` (a "GRASS HOPPER" enemy — `CENPIC.MAC:280-281` literally comments it, a fifth enemy type outside AC-3's spider/flea/scorpion/centipede list), `EXPLD0-5`/`EXPLS` (explosion animation frames), and `THREE`/`SIX`/`NINE` (score-digit variants, presumably for bonus-life "12000" style rendering, outside `DIGIT_0..9`). None of these are required by AC-3, so `STAMPS` does not name them — offsets are still decodable from `PLANE_LOWER`/`PLANE_UPPER` by any future story that needs them (e.g. a grasshopper-enemy or explosion-effects story). *Found by Dev during implementation.*
- **Gap** (non-blocking): CENPIC also has a playfield tile literally commented `;GUN` at region offset `0x2F8` (colours 3/2, likely an alternate/HUD gun glyph) distinct from the `GUN` motion-object sprite at `0x080`. Left unnamed in `STAMPS` to avoid a naming collision with the motion-object `GUN`; a future consumer of the tile set should pick a distinguishing name (e.g. `TILE_GUN`) if it's needed. *Found by Dev during implementation.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Committed fixture is a DIGEST MANIFEST, not a byte copy:** AC-1's CI "committed fixture" is `tests/fixtures/pictures/rom-manifest.json` (size+sha1+sha256 per chip), not a redundant raw-byte copy. Reason: a byte-copy fixture compared to pictures.ts is the vacuous tautology SM flagged (both hand-authored together). Instead pictures.ts AND the manifest are each pinned to a TEA SHA-256 anchor computed from silicon (and re-verified against the chips whenever the tree is present) — a third fixed point, so neither validates against the other.
- **TEA-authored pure stub `src/core/pictures.ts`:** shape + placeholder constants (`0`) + empty planes + throwing `decodeStamp`, so the suite compiles (tsc green) and runs RED. Reason: pictures.ts is a `.ts` core module (no `.d.mts` route); the stub is the established harness pattern (cp1-2 `check-citations.d.mts`, cp1-1 `package.json`). It holds NO real data or decode — GREEN overwrites it entirely.
- **`tests/audit/citations.test.ts` extended additively:** +1 describe block (path-qualified `revision.v2/` + traversal containment) and widened the `node:fs` import (git: 97 added / 1 removed = the import line). NO existing cp1-2 assertion altered. Reason: carry-forward (a)/(b) route the checker extension through cp1-3; recorded per SM's "mind the cp1-2 fixtures" note.
- **AC-2 traceability is split by stamp kind:** labeled MOTION objects get rigorous offset verification via an embedded CENPIC location-counter parser; UNLABELED tiles (chars/digits/mushrooms) are traced by convention name (`CHAR_A…`, `DIGIT_0…`, `*MUSHROOM*`) + the byte gate + the contact sheet. Reason: CENPIC labels exist only for motion objects; the `.=200/.=800+200` tile blocks are `.BYTE`+`;comment` only.

### Dev (implementation)
- **`STAMPS` names only the AC-3-required entities, not every CENPIC picture:** playfield tiles `BLANK`, `CIRCLE C/P`, `DOT`, `ONE HALF`, the tile-`GUN`, the four `COLOR n BLANK`s, and `COLON` (all present in the `.=200` block) are decodable but not added to `STAMPS`. Reason: none is required by AC-2/AC-3, and minimalist discipline says don't add hand-authored naming surface a test doesn't exercise — every entry in `STAMPS` is one more claim a future edit could silently get wrong with no test catching it. Same reasoning covers the non-AC-3 motion objects logged under Delivery Findings (`PLAY*`, `GRASS*`, `EXPLD*`, `THREE`/`SIX`/`NINE`).
- **Bake tool imports `SPRITE_H`/`TILE_H`/`STAMPS` directly from `src/core/pictures.ts`** (a `.ts` file) rather than re-declaring a duplicate offset/geometry table in the `.mjs` tool. Reason: this Node runtime (v25.9.0) resolves bare `.ts` imports via native type-stripping (verified directly), and a duplicate table would be a second hand-maintained copy of the same offsets — exactly the drift risk AC-4 is designed to eliminate. `tools/` importing from `src/core/` does not violate the core/shell purity boundary (purity guard only sweeps files inside `src/core/`; the tool itself is not core).

## Sm Assessment

**Setup verified:** session + context files in place (epic context untouched — checked against the setup commit), branch `feat/cp1-3-picture-rom-transcription` off origin/develop @ 0bed329 (cp1-2's merge), epic YAML flipped to in_progress. Merge gate clear; no sibling cp1-3 race on origin.

**Story shape:** 5pt, `workflow: tdd` explicit. Repo centipede only. The vendored binaries live at the ORCHESTRATOR path `reference/atari-source/centipede/revision.v2/` — read-only quarry, nothing in the orchestrator changes. (The contact-sheet "bake-models.mjs precedent" is an orchestrator-side idiom to imitate, not to modify — the centipede bake tool lives in the centipede repo.)

**Hazards routed to TEA (O'Brien):**
- AC-1 is a THREE-way identity: vendored ROM bytes ↔ committed pictures.ts ↔ committed fixture (the CI fallback). The fixture must itself be provably derived (AC-4), or the degraded path becomes a self-confirming copy. Design the derivation chain so each link is tested.
- Decode format is NOT in the dossier as a baked fact — the 2bpp tile layout must be transcribed from CENPIC.MAC structure / MAME centiped driver (gfx layout in centiped.cpp is legitimate corroboration). Any decode-layout constant (plane offsets, tile size, ordering) is a transcribed fact → radix-cited comment + claims entry. CENPIC.MAC is .RADIX 16.
- Citation checker search path: revision.v2/ is currently EXCLUDED. Extending it is IN scope (carry-forward a), WITH the containment assertion (carry-forward b). Mind the cp1-2 suite's fixture expectations — it may pin the current search-path behavior; those tests may legitimately change, but record it as a deviation if so.
- Binary reads only — the ROMs are byte-verbatim dumps; any text-mode read corrupts. Node `readFileSync` with no encoding.
- Purity guard: pictures.ts is core — the decode helpers must be pure; the BAKE tool (contact sheet, writes a PNG/HTML artifact) is NOT core — it lives in tools/, not src/core/.
- AC-3's identification list is the review contract: mushroom, all centipede head/body frames, spider, flea, scorpion, player gun, shot, character/digit tiles — each must be named and present on the sheet.
- Sibling checkouts are active today (rb4 landed mid-cp1-2): re-verify no cp1-3 race at review time.

**Peloton mode:** subagent peloton (user-directed) — SM drives phases via inline subagents.

**Routing:** phased tdd → next phase `red`, owner `tea`.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 5pt transcription story with byte-exact fidelity ACs — the deliverable is auditable-not-asserted, so the suite must re-derive every byte from the ROM rather than trust a hand-written table.

**Test Files (new/changed this phase):**
- `centipede/tests/pictures.test.ts` (25 tests) — decode-layout constants; `PLANE_LOWER/UPPER == the chips` pinned to a SHA-256 anchor; committed-fixture (digest manifest) itself anchored to the chips; byte-for-byte vs vendored `.201/.202` (tree); 2bpp decode goldens for HEAD0 (8×16 sprite, all four colours) + FULL MUSHROOM (8×8 tile), both derived from cited CENPIC bytes; a CENPIC location-counter parser (with fixture self-tests) verifying every motion-object STAMP sits at its true label offset (AC-2); AC-3 entity presence; the committed naming-doc.
- `centipede/tools/pictures-bake/bake-contact-sheet.test.mjs` (8 tests) — bake-tool contract (`decodeStampPlanar` / `bakeContactSheet` / `bakeContactSheetFromRom`); pure deterministic labelled render; committed contact sheet exists + names every AC-3 entity + CHAR_*/DIGIT_*; re-bake-from-ROM `===` committed sheet (baked-not-hand-drawn proof, tree).
- `centipede/tests/audit/citations.test.ts` (+3 tests, additive) — path-qualified `revision.v2/CENPIC.MAC` resolves + byte-verifies; a `..` that normalises back INSIDE the tree still resolves; **an escaping path is REFUSED even with a correct verbatim** (the containment RED).
- `centipede/src/core/pictures.ts` — TEA-authored PURE STUB (harness only; GREEN overwrites entirely).

**Tests Written:** 36 new (29 RED, 7 legitimately-green harness/anchor self-tests) covering AC-1–AC-4 + carry-forward (a)/(b).
**Status:** RED (failing — ready for Dev).

**RED verification (testing-runner, `npx vitest run --reporter=json`):** full suite **98 tests / 69 pass / 29 fail / 0 pending**. Pre-existing 61 all green (scaffold 25, purity's original 13, citations' original 23); purity's `it.each` core sweep gained 1 passing case (the pure `pictures.ts` stub). `npm run lint` (tsc --noEmit) green. Per-file RED: pictures 20, bake 8, citations 1. Failure reasons confirmed correct (missing implementation, not harness): constants `0`, empty-plane SHA `e3b0c442…` ≠ anchor, missing manifest/`pictures.md`/contact-sheet, missing bake exports, containment gap. **RED commit `1279ebf`** on `feat/cp1-3-picture-rom-transcription`.

### Decode-layout ruling (ground truth GREEN encodes as claims-backed constants)

CENPIC.MAC is `.RADIX 16` (`revision.v2/CENPIC.MAC:8`), `.ASECT`; assembled image = `0x1000` bytes.
- **Two planes / two chips:** `136001.201` = region `0x000–0x7FF` (LOWER bitplane), `136001.202` = region `0x800–0xFFF` (UPPER bitplane). CENPIC names the split: `.=0` "LOWER BIT FOR 8X16 MOTION OBJECTS" (`:12`), `.=800` "UPPER BIT OF 8 X 16 MOTION OBJECT STAMPS" (`:156`). MAME corroborates: `gfx1` region `0x1000`, `136001-211.f7@0x0000` + `136001-212.hj7@0x0800` (`centiped.cpp:2033-2035`). Vendored `.201/.202` SHA1 === MAME `211/212` (proven this session).
- **2bpp planar decode:** `colour = (upperBit << 1) | lowerBit`; plane 0 (LSB) = first half (`.201`), plane 1 (MSB) = second half (`.202`); pixel **x=0 is the MSB (0x80)**. MAME `spritelayout {8,16, RGN_FRAC(1,2), 2 planes, planeoffset {RGN_FRAC(1,2),0}, xoffset {0..7}}` (`centiped.cpp:1722-1732`).
- **Plane mirror invariant:** the UPPER-plane byte for a stamp at region offset `X` (X<0x800) is `region[X + 0x800]` — `.201` and `.202` hold the same stamp layout, one bitplane each.
- **Geometry:** motion objects 8×16 (16 bytes/plane); playfield stamps 8×8 (8 bytes/plane). CENPIC `:12` + `.=200` "8X8 PLAYFIELD STAMPS" (`:53`).
- **Head/body share ONE sprite pool:** `HEAD0..HEADF` (16 frames). `CENDEF.MAC:129-137` documents motion-object picture numbers (0-7 = centipede head pictures + body/poisoned variants) all indexing these stamps; `CENTI4.MAC:478/500` select "HEAD PICTURE" vs "BODY PICTURE" by number. Do NOT invent a separate BODY sprite set.

Authoritative CENPIC label→offset map (from the parser, lower plane; upper = +0x800):
`HEAD0=0x000 HEAD2=0x10 HEAD4=0x20 HEAD6=0x30 HEAD8=0x40 HEADA=0x50 HEADC=0x60 HEADE=0x70 GUN=0x80 BUG0=0xA0 BUG2=0xB0 BUG4=0xC0 BUG6=0xD0 ANT0=0xE0 ANT2=0xF0 SCORP0=0x180 SCORP2=0x190` … `HEAD1=0x400 HEAD3=0x410 … HEADF=0x470 SHOT=0x480 BUG1=0x4A0 BUG3=0x4B0 BUG5=0x4C0 BUG7=0x4D0 ANT1=0x4E0 ANT3=0x4F0 SCORP1=0x580 SCORP3=0x590`. Tiles: `.=200` block, 8 bytes each, order BLANK, A–Z, CIRCLE C, CIRCLE P, DOT, ONE HALF, GUN, 0–9, COLOR blanks×4, COLON, 9 blanks, then POISON MUSHROOM ×4 (1/4→full), MUSHROOM ×4 — FULL MUSHROOM = `0x3F8`, FULL POISON = `0x3D8`.

### Notes for Dev (Julia) — the GREEN build list

1. **`src/core/pictures.ts`** (overwrite the stub, keep it PURE — purity sweep binds it):
   - Constants `REGION_SIZE=0x1000, PLANE_SIZE=0x800, SPRITE_W=8, SPRITE_H=16, TILE_W=8, TILE_H=8` — each with a radix-cited comment + a `claims/05-pictures.json` entry.
   - `PLANE_LOWER` = 2048 INLINE byte literals of `136001.201`; `PLANE_UPPER` = 2048 of `136001.202`. Generate them from the vendored ROM with a one-off script (binary read, no encoding) and paste — do NOT hand-type; the SHA anchor + byte gate catch any slip. No file I/O in core.
   - `STAMPS` naming table = `{name, kind, offset}` only (NO pixel literals → no hand-authored surface, AC-4). Motion names = CENPIC labels; tiles named `CHAR_A..CHAR_Z`, `DIGIT_0..DIGIT_9`, `MUSHROOM_1_4/1_2/3_4/FULL`, `POISON_MUSHROOM_*` (the tests look these up by exact name).
   - `decodeStamp(stamp)` pure: rows = `SPRITE_H` if sprite else `TILE_H`; `L=PLANE_LOWER[offset+r]`, `U=PLANE_UPPER[offset+r]`; `colour = (((U>>(7-x))&1)<<1) | ((L>>(7-x))&1)`.
2. **`tests/fixtures/pictures/rom-manifest.json`** — `{"136001.201":{"size":2048,"sha1":"6c862352c329776f2f9974a0df9dbe41f9dbc361","sha256":"8916f56b898f448abd4f45e5590531c747617ffe14efa2b611135dd0781f148c"},"136001.202":{"size":2048,"sha1":"974c03d29aeca672fffa4dfc00a06be6a851aacb","sha256":"9d0c60b686a2478c679c36be0bf6cdd312363b0af161533de3d3ebcf304b105f"}}`.
3. **`docs/rom-study/pictures.md`** — the committed naming table (AC-2): every motion label + tile → CENPIC label/comment + offset + entity; must contain the words centipede/spider/flea/scorpion/mushroom/shot/gun.
4. **`tools/pictures-bake/bake-contact-sheet.mjs`** — exports `decodeStampPlanar(lower,upper,offset,rows)`, `bakeContactSheet({lower,upper,stamps})→SVG` (pure, DETERMINISTIC — no Date/random, or the re-bake test breaks), `bakeContactSheetFromRom(romDir)`; isMain-guarded CLI writes `docs/rom-study/pictures-contact-sheet.svg`.
5. **`docs/rom-study/pictures-contact-sheet.svg`** — baked + committed (AC-3), every entity labelled.
6. **`docs/rom-study/claims/05-pictures.json`** — structural claims citing `revision.v2/CENPIC.MAC` (path-qualified): radix `:8`; block markers `.=0` `:12`, `.=200` `:53`, `.=400` `:113`, `.=800` `:156`, `.=800+200` `:195`, `.=0C00` `:254`; representative labels HEAD0 `:13`, GUN `:21`, BUG0 `:26`, ANT0 `:30`, SCORP0 `:42`, SHOT `:122`, HEADS `:157`; corroborate the decode against `centiped.cpp:1722` / `:2033`.
7. **`tools/audit/check-citations.mjs`** — add path-traversal containment to `resolveInTree`'s slash-branch: after building `p`, `path.resolve` it and return `undefined` unless it stays within `resolve(vendoredRoot)` (allow `..` that normalises back inside; reject escapes — use a resolved-prefix check, NOT a naïve `includes('..')`). Leave `REVISION_SUBDIRS=['','revision.v4']` unchanged (revision.v2/ rides the slash-branch).

**Traps:**
- Read the ROMs in BINARY only (`readFileSync` no encoding) — text mode corrupts.
- The SHA-256 anchor constants in `pictures.test.ts` are ground truth; make pictures.ts + the manifest match them — never edit the test to fit wrong data.
- Path-qualify picture claims as `revision.v2/CENPIC.MAC` (root is byte-identical but path-qualified states rev-2 provenance + exercises containment). Don't add `revision.v2` to `REVISION_SUBDIRS`.
- Contact sheet MUST be deterministic + isMain-guarded, or the re-bake equality test and a stray top-level write will bite.

### Rule Coverage (lang-review/typescript.md — TEA-authored `.ts` files)

| # | Rule | Status | Note |
|---|------|--------|------|
| 1 | Type-safety escapes | pass | No `as any`/`as unknown as`; the two `stamp!` non-null asserts are guarded by a preceding `expect(...).toBeTruthy()`. |
| 2 | Generic/interface | pass | Manifest typed `Record<string,{size,sha1,sha256}>` (not `any`); planes `readonly number[]`; `StampKind` is a string union, not an enum. |
| 4 | Null/undefined | pass | `process.env.X ?? …` (nullish, not `||`); `findByOffset` result guarded before use. |
| 5 | Module/declarations | pass | `import type {Claim}` / `type Stamp`; no `.js` suffix — repo uses `moduleResolution: bundler` (matches every sibling import). |
| 8 | Test quality | pass | Imports from `src/`, never `dist/`; no `as any` in assertions; goldens derived from cited ROM bytes, not hand-drawn. |
| 9 | Build/config | pass | `tsc --noEmit` green; strict untouched. |

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `centipede/src/core/pictures.ts` — overwrote the TEA stub: decode-layout constants (`REGION_SIZE`, `PLANE_SIZE`, `SPRITE_W/H`, `TILE_W/H`, radix-cited), `PLANE_LOWER`/`PLANE_UPPER` (2048 bytes each, generated programmatically from the vendored `136001.201`/`.202` — never hand-typed, to eliminate transcription risk), `STAMPS` (78 offset-only entries: 16 `HEAD*` + 8 `BUG*` + 4 `ANT*` + 4 `SCORP*` + `GUN` + `SHOT` + 26 `CHAR_*` + 10 `DIGIT_*` + 8 mushroom stages), and `decodeStamp` (the ruled 2bpp planar decode).
- `centipede/tests/fixtures/pictures/rom-manifest.json` — new. The AC-1 CI-fallback digest manifest, pinned to the same SHA-256/SHA1 anchors as the chips.
- `centipede/docs/rom-study/pictures.md` — new. AC-2's committed naming table: every motion label + CENPIC line, tile-block conventions, decode summary.
- `centipede/tools/pictures-bake/bake-contact-sheet.mjs` — new. Exports `decodeStampPlanar`, `bakeContactSheet` (pure, deterministic SVG renderer, labels each stamp with its CENPIC-derived entity class), `bakeContactSheetFromRom`; isMain-guarded CLI. Imports `SPRITE_H`/`TILE_H`/`STAMPS` directly from `src/core/pictures.ts` (see Design Deviations).
- `centipede/docs/rom-study/pictures-contact-sheet.svg` — new. Baked (not hand-drawn) via the CLI; every AC-3 entity + CHAR_*/DIGIT_* present and labelled (168599 bytes, 78 stamps).
- `centipede/docs/rom-study/claims/05-pictures.json` — new. 14 claims (`PIC-1`..`PIC-14`) citing `revision.v2/CENPIC.MAC` path-qualified, covering the radix, all 4 region-block markers (`.=0`/`.=200`/`.=400`/`.=800`/`.=800+200`/`.=0C00`), and 7 representative labels; 2 claims corroborate against `centiped.cpp` (ROM_LOAD offsets + the spritelayout planar decode).
- `centipede/tools/audit/check-citations.mjs` — `resolveInTree`'s slash-branch now resolves the joined path and refuses it unless it stays within `resolve(vendoredRoot)` (prefix containment, allowing a normalising `..` but rejecting an escape) — closes the cp1-2 carry-forward.

**Tests:** 98/98 passing (GREEN) — verified via `testing-runner`: full `npm test` (5 files: scaffold 12, pictures 25, purity 26/misc, bake 8, citations 26 — 98 total), `npm run build` clean, `npm run lint` clean, `npm test -- citations` 26/26 green (new claims byte-verify: `node tools/audit/check-citations.mjs` reports "checked 65 claim(s) / all claims verified").

**AC walkthrough:**
- **AC-1** (byte-exact + CI fallback): `pictures.test.ts`'s three-way identity all green — chips↔anchor, manifest↔anchor, `pictures.ts`↔anchor always; `pictures.ts`↔vendored chips byte-for-byte when the tree is present (local: present, both PASS).
- **AC-2** (traceability + naming doc): the embedded CENPIC location-counter parser's fixture self-test passes, and every `STAMPS` motion-object offset matches its real CENPIC.MAC label (`HEAD0=0x000`, `GUN=0x080`, `BUG0=0x0A0`, `SHOT=0x480`, etc. — all independently re-derived from the file, not hand-copied); `docs/rom-study/pictures.md` committed and contains every required label + entity word.
- **AC-3** (contact sheet): `docs/rom-study/pictures-contact-sheet.svg` committed; contains every `HEAD0..HEADF`/`BUG0..BUG7`/`ANT0..ANT3`/`SCORP0..SCORP3`/`GUN`/`SHOT`/`CHAR_A..Z`/`DIGIT_0..9`, and the words mushroom/spider/flea/scorpion/centipede (verified via grep); re-baking from the ROM reproduces the committed sheet byte-for-byte (proving it's baked, not drawn).
- **AC-4** (zero hand-authored pixels): `PLANE_LOWER`/`PLANE_UPPER` were generated by a one-off script reading the binary chips directly (no manual transcription of pixel bytes — the first attempt at hand-embedding the arrays via the Write tool silently dropped 2 rows mid-array and was caught by the SHA-256 anchor test failing, which is exactly the gate AC-4 exists for); `STAMPS` carries offsets only.

**Commits:**
- RED: `1279ebf` (TEA, prior phase)
- GREEN: `10215a9` — `feat(cp1-3): transcribe the picture ROM (136001.201/202) into pictures.ts`, pushed to `origin/feat/cp1-3-picture-rom-transcription`.

**Handoff:** To Reviewer.

## Subagent Results

| Subagent | Received | Result |
|----------|----------|--------|
| testing-runner | Yes | **PASS** — `npm test` 98/98 (5 files), `npm run build` clean, `npm run lint` (tsc --noEmit) clean, `node tools/audit/check-citations.mjs` → "checked 65 claim(s) / all claims verified". |
| reviewer-preflight | Yes | **Clean** — no TODO/FIXME/debugger; one `console.log` inside the bake CLI `import.meta.url` guard (mirrors check-citations' CLI, not library code); `resolveInTree` before/after captured; all 19 AC-3 label/entity greps PRESENT in the SVG; `src/core/pictures.ts` has zero imports and zero browser-globals (window/document/performance/Date/Math.random); no open PR on the branch. |
| reviewer-edge-hunter | Disabled | Skipped/disabled (peloton config). |
| reviewer-silent-failure-hunter | Disabled | Skipped/disabled. |
| reviewer-test-analyzer | Disabled | Skipped/disabled. |
| reviewer-comment-analyzer | Disabled | Skipped/disabled. |
| reviewer-type-design | Disabled | Skipped/disabled. |
| reviewer-security | Disabled | Skipped/disabled. |
| reviewer-simplifier | Disabled | Skipped/disabled. |

**All received: Yes** (2 enabled subagents returned; the other 7 reviewer-* specialists are disabled in this peloton config).

Independent Reviewer verification (not delegated) — see Devil's Advocate below for the SHA/offset/bake re-derivations.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** vendored chip `136001.201`/`.202` bytes → `PLANE_LOWER`/`PLANE_UPPER` (inline literals) → `decodeStamp(stamp)` 2bpp planar decode → `bakeContactSheet` → committed `pictures-contact-sheet.svg`. I independently re-derived every link: sha256 of the chips === sha256 of the plane arrays (computed from `pictures.ts` via Node type-stripping) === the manifest anchors === the test's `EXPECTED` anchors; `bakeContactSheetFromRom` re-run reproduces the committed SVG byte-for-byte. No corruption at any link. Safe because the three fixed points (silicon / pictures.ts / manifest) are mutually independent — none validates against a copy of itself.

**Pattern observed:** triple-anchored fidelity chain — `tests/pictures.test.ts:156-192` pins `sha256(PLANE_LOWER/UPPER)`, the manifest digests, AND the pictures.ts↔manifest comparison to one `EXPECTED` constant computed from the chips, so the CI-degraded path is not a self-confirming byte-copy (the tautology SM flagged is genuinely avoided).

**Error handling:** `decodeStamp` reads `PLANE_LOWER[offset+r]` — I verified all 78 STAMP offsets + row spans stay within `PLANE_SIZE` (max sprite 0x590+16=0x5A0 < 0x800), so no undefined access despite `strict` without `noUncheckedIndexedAccess`; the bake tool's `decodeStampPlanar` additionally guards out-of-range with `?? 0`. `resolveInTree` refuses tree escapes (returns `undefined` → surfaced as a checker error), verified live.

### Observations (tagged)

1. **[VERIFIED — CRITICAL PATH]** Plane bytes are byte-exact to silicon and NOT swapped. `Buffer.from(PLANE_LOWER).equals(136001.201)` = true, `PLANE_UPPER`.equals(`.202`) = true; the swap cross-check (`LOWER===.202`, `UPPER===.201`) is false both ways; all 4096 bytes in range 0-255. sha256 lower `8916f56b…`, upper `9d0c60b6…` — match the manifest, the test anchors, and the chips.
2. **[VERIFIED]** All 34 motion-object offsets in `STAMPS` match `CENPIC.MAC` labels. My own location-counter parser (`.RADIX 16`, handling `.= expr`, `.BYTE`, and the `.REPT 16./.ENDR` zero-fill blocks that Dev's data correctly accounts for) reproduced HEAD0=0x0, GUN=0x80, BUG0=0xA0, ANT0=0xE0, SCORP0=0x180, SHOT=0x480, HEADF=0x470, … with **0 mismatches / 0 missing**. All 44 tiles fall inside the `.=200` playfield block (0x200-0x3FF); tile offsets are internally consistent (A@0x208, Z@0x2D0, DIGIT_0@0x300, DIGIT_9@0x348, mushrooms 0x3C0-0x3F8) and the doc's tile-comment line refs (`;A`@:55, digits :86-95, mushrooms :104-111) check out against the file.
3. **[VERIFIED]** No test or anchor was weakened to make GREEN pass. `git diff 1279ebf..HEAD -- '*.test.ts' '*.test.mjs'` is empty; the only test-adjacent GREEN change is *adding* `rom-manifest.json` (the fixed anchor it must match, not a test assertion). RED→GREEN is an honest TDD transition (29 failing teeth tests → implementation).
4. **[VERIFIED]** Contact sheet is baked, not hand-drawn, and reproducible. Re-running `bakeContactSheetFromRom` yields a sheet byte-identical to the committed one (sha256 `7ba34b2d…`, 168599 bytes); the tool imports `STAMPS`/`SPRITE_H`/`TILE_H` from `pictures.ts`, so the sheet is a true derivative of the committed data + the chips. All AC-3 entities present and labelled.
5. **[VERIFIED]** Containment fix (cp1-2 carry-forward b) works. Live probe: `revision.v2/../../CENTI.DOC` (real file, outside tree) is REFUSED even though the file exists; `revision.v2/CENPIC.MAC` and a normalising `revision.v4/../revision.v2/CENPIC.MAC` both resolve + byte-verify. The `resolve()`-prefix check correctly distinguishes an escaping `..` from an inside-normalising one (not a naïve `includes('..')`). 65/65 claims byte-verify.
6. **[VERIFIED]** Purity holds — `src/core/pictures.ts` is a standalone pure data module (no imports, no browser globals, no I/O; the plane bytes are inline literals). The purity sweep gained it as a passing case.
7. **[LOW]** Decode orientation is corroboration-only, not silicon-pinned (twin-decoder golden + un-vendored MAME cite). Non-blocking — see Delivery Findings; data is exact and glyphs render true.
8. **[LOW]** `decodeStamp`/`decodeStampPlanar` hardcode `x < 8` instead of the exported width constants. Cosmetic — see Delivery Findings.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` vs the GREEN `.ts` diff — `src/core/pictures.ts`)

| # | Rule | Status | Note |
|---|------|--------|------|
| 1 | Type-safety escapes | pass | No `as any` / `as unknown` / `@ts-ignore` / non-null assertions anywhere in pictures.ts. |
| 2 | Generic/interface | pass | `Stamp` interface with `readonly` fields; planes `readonly number[]`; `STAMPS: readonly Stamp[]`; no `Record<string,any>`/`Function`/`object`. |
| 3 | Enum anti-patterns | pass | `StampKind` is a string union (`'sprite'|'tile'`), not an enum; the `kind==='sprite'?…:…` ternary is exhaustive over the 2-member union. |
| 4 | Null/undefined | pass | No `||`-on-falsy; in-bounds indexing proven (no undefined). Bake tool uses `?? 0` (nullish) defensively. |
| 5 | Module/declarations | pass | `export type StampKind`; no barrel/`.js` issue — the bake `.mjs` imports `../../src/core/pictures.ts` with the `.ts` suffix intentionally for Node native type-stripping (Design Deviation, `tsc --noEmit` green, matches repo convention). |
| 8 | Test quality | pass | Tests import from `src/` not `dist/`; guarded `head0!`/`mush!` follow `toBeTruthy()`; goldens ROM-derived. |
| 9 | Build/config | pass | `strict: true` untouched; build + lint clean. |
| 6,7,10,11,12,13 | React/async/input-val/error/perf/fix-regression | n/a | No JSX, no async, no user input, no error handling, no hot-path serialization in this diff. |

### Devil's Advocate (assumed subtle breakage — results)

- **Planes swapped (lower↔upper)?** Disproven — `.equals()` matches correct orientation both ways and fails both swapped ways.
- **MSB/LSB pixel order flipped (mirrored sheet)?** Data is exact; orientation matches the cited MAME `xoffset {0..7}` (MSB-first) and renders visually-true glyphs (mushroom cap+stem, centipede head, scorpion; letters/digits rotated 90° per Centipede's vertical monitor — expected, not mirrored). The golden test would NOT independently catch a global mirror (twin decoder) — logged as a non-blocking Delivery Finding.
- **Manifest self-confirmation (degraded CI path is a tautology)?** Disproven — manifest, pictures.ts, and the test all pin to the same silicon-derived `EXPECTED` anchor; I recomputed that anchor from the chips myself.
- **pictures.ts not reproducible from the chips?** Disproven — I regenerated both plane hashes from the chips and they equal the committed arrays.
- **Node-version coupling of the bake tool's `.ts` import?** Real but contained — relies on Node ≥ ~22 type-stripping (local v25.9.0). The bake tool is a dev/CI artifact, NOT shipped in `vite build` (build stays clean); the committed SVG is the durable output, so a CI Node that can't strip types can't *re-bake* but the story's deliverables still stand. Acceptable; no game-runtime dependency on it.
- **Offsets off-by-`.REPT`?** My first naïve parser under-counted by exactly the `.REPT 16.` fills (−0xF before BUG, −0x1E before SCORP); the ROM bytes at 0xA0 literally match BUG0's `.BYTE` line, proving Dev's offsets right and my parser wrong — fixed the parser, 0 mismatches.

### Deviation Audit

| Deviation | Verdict | Rationale |
|-----------|---------|-----------|
| TEA — committed fixture is a DIGEST MANIFEST, not a byte copy | ✓ ACCEPTED | The three-way silicon/pictures.ts/manifest anchoring genuinely defeats the self-confirming-copy tautology; I re-derived the anchor from silicon independently. |
| TEA — TEA-authored pure stub `pictures.ts` | ✓ ACCEPTED | Standard harness pattern; GREEN overwrote it entirely (409-line diff); stub held no real data. |
| TEA — `citations.test.ts` extended additively | ✓ ACCEPTED | `git diff 1279ebf..HEAD` shows no cp1-2 assertion altered; the +3 containment tests are new; import line widened only. |
| TEA — AC-2 traceability split by stamp kind | ✓ ACCEPTED | CENPIC labels exist only for motion objects; tiles are `.BYTE`+`;comment` only — I confirmed this in the source. Convention-naming + byte gate + sheet is the correct fallback. |
| Dev — `STAMPS` names only AC-3-required entities | ✓ ACCEPTED | Minimalist discipline; unnamed tiles/objects (`PLAY*`, `GRASS*`, `EXPLD*`, tile-GUN, COLON…) remain decodable by offset. No test surface left unguarded. |
| Dev — bake tool imports geometry from `src/core/pictures.ts` | ✓ ACCEPTED | Avoids a second hand-maintained offset table (the exact drift AC-4 targets); `tools/` is not swept by the purity guard, so no core-boundary violation. Node type-stripping verified working. |

All Delivery Findings (TEA a/b, TEA×3, Dev×2) reviewed — each is an accurate forward-carry, none blocking. No undocumented deviations found in the diff.

### Merge Safety

- **origin/develop freshness:** `merge-base(origin/develop, HEAD) == origin/develop @ 0bed329` — develop has NOT moved since the fork. Clean fast-forward; no trial-merge required.
- **Sibling race:** only `origin/feat/cp1-3-picture-rom-transcription @ 10215a9` exists; no rival cp1-3 branch, no open cp1-3 PR. No checkout race.
- **Orchestrator:** the vendored quarry (`reference/atari-source/centipede/revision.v2/`) is read-only and untouched; centipede working tree is clean.

**Handoff:** To SM (Winston) for finish-story. No rework needed. Blocking items: none. Two LOW improvements logged in Delivery Findings for a future render story (decode-orientation golden; width-constant use) — neither gates this merge.