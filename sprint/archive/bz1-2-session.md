---
story_id: "bz1-2"
jira_key: ""
epic: "bz1"
workflow: "tdd"
---
# Story bz1-2: Source findings doc — distill disassembly (entities, scoring, obstacle table, 3D vertex specs, difficulty)

## Story Details
- **ID:** bz1-2
- **Jira Key:** N/A (no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T14:05:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T11:27:06Z | 2026-07-03T11:28:51Z | 1m 45s |
| red | 2026-07-03T11:28:51Z | 2026-07-03T11:41:30Z | 12m 39s |
| green | 2026-07-03T11:41:30Z | 2026-07-03T11:57:53Z | 16m 23s |
| review | 2026-07-03T11:57:53Z | 2026-07-03T14:05:14Z | 2h 7m |
| finish | 2026-07-03T14:05:14Z | - | - |

## Sm Assessment

**Story:** bz1-2 — the epic's authority-chain story. Pull the 6502disassembly.com/va-battlezone/ quarry into a gitignored `battlezone/reference/` (with provenance README per the star-wars convention), author one committed whole-game findings doc (`battlezone/docs/battlezone-1980-source-findings.md`, mirroring the tempest playbook), and land the extracted data as typed, tested TypeScript in `src/core/` (`obstacles.ts` — exactly 21 ROM-table entries; model geometry modules). Verify/correct the epic context's "known ROM facts" placeholders against the real disassembly; pin one authentic DIP default for the missile score threshold.

**Key constraints from context:**
- **The quarry is checkout-local:** `reference/` is gitignored and lives only in the checkout that created it — nothing committed may depend on its presence (hard-won star-wars/asteroids lesson). Tests must run green without `reference/`.
- **Every fact cites its quarry location/label**, not just the value — the findings doc is the citation authority for all later bz1 stories.
- Network access needed to pull the quarry (6502disassembly.com) — TEA/Dev handle mechanics; if fetch is blocked, surface it, don't fake data.
- Branch `chore/bz1-2-source-findings-doc` exists off battlezone `develop`. **No remote, no push** (unchanged from bz1-1).
- No Jira — local YAML tracking.

**Workflow:** tdd. TDD shape here: the typed data ports (`obstacles.ts` 21 entries, model vertex/edge invariants) are the testable surface; the findings doc itself is prose reviewed against citations, not unit-tested. TEA decides the exact test/attestation split in RED.

**Execution mode:** Peloton, team `peloton-bz1-2`. Per user direction this story's teammates run with model overrides: tea=opus, reviewer=opus, dev=sonnet. Same discipline as bz1-1: agents gate themselves (resolve-gate/complete-phase), no marker/relay, SM routes.

**Route:** → tea (RED phase).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The star-wars `reference/README.md` the story tells DEV to copy is NOT present in this checkout — `reference/` is gitignored and checkout-local, so no local template exists. Affects `battlezone/reference/README.md` (DEV must reconstruct the provenance/refresh README shape from `context-epic-bz1.md`'s "reference/ quarry" description, or re-fetch star-wars, rather than reading a local file). *Found by TEA during test design.*
- **Question** (non-blocking): The missile score-threshold's authentic DIP factory default is unspecified beyond the 5K–30K band. The RED test guards the band + whole-thousand shape but CANNOT verify the pin is the authentic default — DEV must pin exactly one value from the quarry's DIP table (or a published analysis if it doesn't resolve cleanly) and the Reviewer must audit that citation. Affects `src/core/scoring.ts` (`MISSILE_INTRO_THRESHOLD`) + the findings doc. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): The 6502disassembly.com/va-battlezone/ quarry's prose/HTML narrative confirms the 21-obstacle table's *existence*, *count*, and *shape roster*, and the per-object vertex-table *format*/*ROM address* ($388e/$7472), but does NOT reproduce the raw ROM byte tables (exact obstacle x/z/orientation values; exact per-model vertex/edge coordinates). Extracting those requires downloading and decoding the ROM binaries or the raw `va-battlezone.zip`/`historicalsource/battlezone` source, which is out of reach of web-fetch-based tooling. Affects `battlezone/src/core/obstacles.ts` (21 positions are AUTHORED, not ROM-decoded) and `battlezone/src/core/models.ts` (all vertex/edge data is AUTHORED, not ROM-decoded) — a future story should redo this pull against the raw ROM/source archive if exact placement/geometry fidelity becomes load-bearing (e.g. bz1-3 render or a later collision-fidelity story). Documented in full in `docs/battlezone-1980-source-findings.md` §3/§4/§6 and `reference/README.md`. *Found by Dev during implementation (after 6 separate fetch attempts across the hub page, objects.html ×2, mathbox.html, and Battlezone.html ×2).* **CLOSED by the 2026-07-03 rework below** — the user supplied the real ROM quarry locally; see the rework's Delivery Findings entries.
- **Resolved Question** (non-blocking, resolves TEA's Question above): Pinned `MISSILE_INTRO_THRESHOLD = 10000` — the factory-default row (marked `$`) in arcade-museum.com's community-maintained Battlezone DIP switch settings table, used per the story's explicit "published analysis" allowance since the disassembly itself only gives the 5K/10K/20K/30K band, not a single default. Citation trail in `docs/battlezone-1980-source-findings.md` §9; Reviewer should audit that citation for authenticity per TEA's original flag. Affects `src/core/scoring.ts`. *Found/resolved by Dev during implementation.*
- **Improvement** (non-blocking): Verification pass against `context-epic-bz1.md`'s "known ROM facts" found ALL bullets confirmed accurate against the quarry — no factual corrections were required, so that file is left untouched by this story (the SM's "epic-context correction edit stays uncommitted" note is therefore moot — there is no edit). Two bullets (difficulty curve, DIP threshold framing) are expanded with newly-cited numeric detail (7000-pt aggression differential, 1000-pt kill increment, ~17s ramp, secondary missile threshold = base+25K) recorded in the findings doc §5/§10/§2 rather than written back into the epic context, per the epic's own framing that bz1-2 "verifies and expands... into the findings doc." *Found by Dev during implementation.*

### Dev (rework — byte-level ROM decode)
- **Gap CLOSED**: `battlezone/src/core/obstacles.ts` (all 21 entries) and `battlezone/src/core/models.ts` (9 of 10 models — everything except `EXPLOSION_DEBRIS`'s edges) are now byte-exact ROM decodes, not authored placeholders. Decoded from a real local quarry (`~/Downloads/va-battlezone/`: 16KB ROM binary, `Battlezone.dis65` SourceGen project, `VisBattlezone.cs` visualizer source) copied into `battlezone/reference/rom-quarry/`. Decoder: `battlezone/reference/decode_rom_tables.py` (ports `VisBattlezone.cs`'s `GenerateWireframe()`/`GenerateMap()` to Python). Full method + cross-checks in `reference/notes/2026-07-03-rom-byte-decode.md`. *Found/closed by Dev during rework.*
- **Improvement** (non-blocking): the ROM's kill-score BCD-add routine has inline immediate-value comments ("1000 points", "2000 points", "3000 points", "5000 points" at specific file offsets) that ROM-confirm `src/core/scoring.ts`'s `SCORES` directly in code, not just via hub-page prose. The DIP `MM` band (5K/10K/20K/30K) is likewise ROM-confirmed via the `.dis65` memory-map comment and the missile-intro routine's own comment. No value changes — both citations strengthened in findings doc §9. *Found by Dev during rework.*
- **Gap** (non-blocking): `EXPLOSION_DEBRIS`'s vertex positions are now ROM-exact, but its 8 edges are still authored — the ROM draws that debris as unconnected points (`cmd 0`), not lines, and `Model3D` (ported from star-wars) has no point primitive to represent that natively. Not blocking (the AC only requires wireframe well-formedness, which the hybrid satisfies), but a real, disclosed representational gap. See the matching Design Deviation entry for full rationale. A future story could add an optional `points?: readonly number[]` to `Model3D` if point-sprite-accurate debris rendering becomes load-bearing (e.g. explosion VFX polish in bz1-9/10). Affects `battlezone/src/core/models.ts`. *Found by Dev during rework.*

### Dev (rework — quarry-commit addendum)
- **Improvement** (non-blocking): the va-battlezone quarry is now committed durably at the orchestrator root (`reference/va-battlezone/`, orchestrator commit `0803722`) instead of living only at `~/Downloads/va-battlezone/`. Updated `battlezone/reference/README.md`'s refresh procedure to source from `../reference/va-battlezone/` (the new master) rather than `~/Downloads/`. Historical citations in `src/core/obstacles.ts`, `src/core/models.ts`, and the findings doc's provenance/changelog still say `~/Downloads/va-battlezone/` — left as-is, since those describe where THIS rework's decode actually pulled from at the time, which is accurate history, not a live pointer. Affects `battlezone/reference/README.md`. *Found/resolved by Dev during rework addendum.*
- **Gap** (non-blocking, SM-found, logged not fixed): the orchestrator `.gitignore`'s `battlezone` entry (line 28, added bz1-1) is unanchored — on macOS's case-insensitive filesystem it matched `reference/va-battlezone/Battlezone` (the ROM binary's own basename, case-folded to `battlezone`), silently excluding it from `git add` until force-added. Suggested fix: anchor to `/battlezone/` (leading slash = repo-root only, trailing slash = directory only) so it can never again basename-match an unrelated nested file. **NOT folded in this rework**: `tests/battlezone-bootstrap.test.mjs:99` asserts `/^battlezone\s*$/m` — an exact-line match on the CURRENT unanchored form — so anchoring the `.gitignore` line alone would break that bz1-1 AC test; the real fix is two coordinated edits (`.gitignore` line + that regex) across a test file from an already-merged, different story (bz1-1). Given the "log it if you'd rather not touch it mid-review" fallback, and that this touches a locked-in bz1-1 test rather than a clean one-liner, logging it here for a dedicated future story/patch rather than entangling it with bz1-2's branch. Affects orchestrator `.gitignore` line 28 + `tests/battlezone-bootstrap.test.mjs` line 99. *Found by SM, logged by Dev during rework addendum.*
  - **FIXED** (interrupt-driven patch, orchestrator `main`, commit `13dd500`, "fix(patch): anchor battlezone gitignore entry to /battlezone/ [from:bz1-2]"): `.gitignore:28` `battlezone` → `/battlezone/`; `tests/battlezone-bootstrap.test.mjs:99` regex updated in lockstep to `/^\/battlezone\/\s*$/m` (kept exact-line strict, not loosened to a substring match) so the AC still enforces anchored coverage rather than merely "the word battlezone appears somewhere." Verified: orchestrator `npm test` → 18/18 green; `git check-ignore battlezone/index.html` → still ignored (`.gitignore:28:/battlezone/`, exit 0 — subrepo coverage intact); `git check-ignore reference/va-battlezone/Battlezone` → NOT ignored (exit 1, no match — the actual bug is gone). Commit touched only these two files (`.pennyfarthing/.runtime/current-model` and other pre-existing untracked noise excluded). No push. *Fixed by Dev, patch dispatched by SM/user.*

### Reviewer (code review)
- **Gap** (blocking): The findings doc's "near/far culling bounds" claim is **FALSE** against the ROM-decoded obstacle data. `src/core/obstacles.ts:40-42` and findings doc §3 (L178-180) & §4 (L197-199) assert all 21 obstacle positions land inside the Math Box culling window `[1023, 31487]` ("actual range used: ~2500–15900 units"). The committed ROM data actually ranges **~9441–46341 units** from origin (per-axis magnitudes up to 32768) — 7 of 21 exceed the 31487 far bound and the stated range is wrong by ~3×. §4 additionally still calls the data **"authored placement,"** contradicting the doc's own front matter (L18-19) and §6. Root cause: AUTHORED-era prose (a golden-angle scatter deliberately sized to that bound) survived the ROM-decode rework unedited (confirmed via `git show 58fdf21`; independently reproduced by Reviewer's own python distance computation + the comment-analyzer specialist). Affects the citation-authority doc — a false invariant here misleads bz1-3 (render/culling) and any collision-fidelity story. **Fix is prose-only (no data change): correct or remove the three passages; while in there, prefer dropping the camera view-frustum framing entirely for static world placement, or restate it against the real range.** *Found by Reviewer during code review.*
  - **FIXED** (commit `26e80bf` on `chore/bz1-2-source-findings-doc`, "fix(bz1-2): drop false camera-culling framing for obstacle placement"): dropped the camera view-frustum framing for static world placement entirely, per the Reviewer's preferred fix, in all three locations. `src/core/obstacles.ts:40-42` now states the real ~9441-46341 unit range (computed directly from the table) and explains why the culling window doesn't bound placement (camera-relative render-time clip, not an origin-relative placement constraint) — also dropped the stale "spot-checked below" phrase (Reviewer's LOW #4). Findings doc §3 restates the real range with citation. Findings doc §4 keeps the verbatim near/far-plane quote (still a real fact) but replaces the false "authored placement... keeps every obstacle inside this window" claim with the corrected framing + an explicit "Correction (rework)" callout naming the ~9441–46341 range and the 7/21-exceed-far-bound fact. No data or test files touched — re-verified 81/81 battlezone tests green, build clean. *Fixed by Dev, re-verify routed to TEA per SM.*
- **Improvement** (non-blocking): stale/weak comment + test cleanups worth sweeping in the same pass — `tests/core/models.test.ts:24` blanket "edge connectivity is authored by DEV" comment is stale (9/10 models are now ROM-exact edges; only EXPLOSION_DEBRIS is authored); `tests/core/models.test.ts:194/206` cross-module integrity uses a gameable substring match (`norm(name).includes(norm(type))` — mutation-proven: renaming a model to a decoy still passes), tighten to normalized-equality or a typed `type→model` map; `tests/core/scoring.test.ts:438` guards only whole-thousand-in-band, could tighten to the four ROM-documented DIP options `{5000,10000,20000,30000}` (a ROM fact, distinct from the judgment-call factory default); `src/core/obstacles.ts:42` "spot-checked below" implies an in-file verification artifact that doesn't exist. *Found by Reviewer during code review.*
- **Improvement** (non-blocking, forward-looking for bz1-3): no typed `ObstacleType → Model3D` lookup exists — the connection is made only by test-time substring matching. A `Readonly<Record<ObstacleType, Model3D>>` export would let the render layer resolve obstacle geometry in a compile-checked way (missing/extra key = compile error). `OBSTACLE_TYPES` could likewise be compiler-derived from the union for drift-safety. Not required by this story's ACs. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `SCORES.superTank as number` / `SCORES.saucer as number` casts on `toBeLessThan` matcher arguments silence the `undefined` branch of the test's own defensive `Partial<Scores>` typing without a runtime guard — a lang-review TS rule #1 type-safety escape. Cannot mask a defect (a failed module load trips the exact-value assertions above and `expect(undefined).toBeLessThan` fails loudly), but the pattern shouldn't propagate. Affects `battlezone/tests/core/scoring.test.ts` (lines 76-77 — narrow or guard instead of casting, in a future test sweep). *Found by Reviewer (rule-checker specialist) during code review re-check.*


## Impact Summary

**Findings Processed:** 14 delivery findings (across TEA, Dev, Rework, Reviewer phases)
**Blocking Issues:** 1 (HIGH, resolved by Dev fix)
**Non-blocking Improvements:** 7
**Tests Passing:** 81/81 (7 test files)
**Build Status:** Clean (`tsc --noEmit && vite build`)

### Key Deliverables

**1. Byte-Level ROM Decoding (Rework)**
- All 21 obstacle positions decoded from real ROM bytes (addresses `$7681`/`$76ab`/`$3fcc`)
- 9 of 10 game models decoded with byte-exact vertices + edges from ROM command streams
- One documented ROM/schema mismatch: `EXPLOSION_DEBRIS` vertices ROM-exact, edges authored (ROM draws as points, not lines)
- Cross-verified against disassembler annotations, address maps, and `VisBattlezone.cs` visualizer source

**2. Authority Document (battlezone-1980-source-findings.md)**
- Single committed source of truth for Battlezone ROM facts for all downstream bz1 stories
- 11 sections covering entity tables, scoring, difficulty, obstacle placement, model geometry
- Every numeric fact cites its ROM location/offset (e.g., obstacle z-positions @ `$7681`)
- Explicit accounting (§6) of ROM-verified vs authored data, preventing downstream confusion

**3. Typed TypeScript Data Modules**
- `src/core/obstacles.ts`: 21 entries with planar (x,z) + orientation + type
- `src/core/models.ts`: 10 game models (tank, missile, saucer, 4 obstacle shapes, shell, debris)
- `src/core/scoring.ts`: Kill values (1000/2000/3000/5000), saucer appearance (2000), missile threshold (10000)
- All exports typed `readonly`, immutable-by-contract, zero unsafe casts (post-rework)

**4. Test Suite (37 new tests, 81 total including preexisting scaffold)**
- Obstacle integrity: exactly 21 entries, distinct positions, valid types present
- Model well-formedness: valid edge indices, no self-edges, no orphans, all 4 types represented
- Scoring: exact kill values, ascending order, saucer/threshold guards (tightened to ROM DIP options: 5K/10K/20K/30K)
- Findings doc attestation: existence, substance (>2000 chars), provenance citation

**5. Orchestrator Quarry Integration**
- Real ROM binaries + disassembler project committed durably at `reference/va-battlezone/` (orchestrator root)
- Backup reference for future decode/audit work; historical citations point to `~/Downloads/va-battlezone/`
- Related patch (bz1-1 interrupt): `.gitignore` entry anchored to `/battlezone/` to prevent macOS case-folding collision

### Known Gaps (Non-Blocking, Deferred)

**1. EXPLOSION_DEBRIS Point-Sprite Representation**
- ROM encodes debris as 8 points + 1 explosion origin (9 vertices, zero edges drawn)
- Current `Model3D` has no point primitive (only edges)
- Workaround: vertices ROM-exact, edges authored as origin→point connectivity
- **Forward action:** bz1-9/10 can add `points?: readonly number[]` to `Model3D` if VFX polish becomes load-bearing

**2. DIP Factory Default (Judgment Call, Attested)**
- ROM hardware read (DIP switches): 4 options {5000, 10000, 20000, 30000}
- Factory default taken from arcade-museum.com's community-maintained table (factory marker `$`)
- Pinned `MISSILE_INTRO_THRESHOLD = 10000` documented with caveat
- **Forward action:** bz1-10 can audit against cabinet manual / MAME if primary source surfaces

**3. Typed Obstacle→Model Mapping (Improvement, bz1-3)**
- Current cross-module link is substring-match based (no compile-time enforcement)
- Suggested: `Record<ObstacleType, Model3D>` export for render layer
- **Forward action:** bz1-3 can add if collision/render fidelity requires compiled safety

### Blocked Issues (Resolved in This Story)

**Issue: False Camera Culling Bounds Claim (HIGH) — RESOLVED**
- **Original claim:** All 21 obstacles sit inside Math Box culling window `[1023, 31487]` (~2500–15900 units)
- **Reality:** Positions range ~9441–46341 from origin; 7 of 21 exceed far bound at 31487
- **Root cause:** AUTHORED-era prose (golden-angle scatter, intentionally sized to that bound) survived rework unedited
- **Fix:** Dropped view-frustum framing for static placement; documented real range + correction
- **Evidence:** Direct computation from `OBSTACLES` table verified by Reviewer independently

### Test Tightenings (Non-Blocking Improvements, Shipped)

1. **models.test.ts:24** — Stale "edges are authored" comment → Updated to reflect 9/10 ROM-exact, EXPLOSION_DEBRIS hybrid
2. **models.test.ts:194/206** — Gameable substring match → Injective map: exactly one distinct model per obstacle type
3. **scoring.test.ts:438** — Loose band guard → Set membership in ROM DIP options `{5000,10000,20000,30000}`

All tightenings passed on real data; no defects exposed.

### Risk Summary

**Data Integrity:** HIGH CONFIDENCE
- Byte-level audit performed by TEA (independent decode + cross-check against disassembler)
- Reviewer independently re-verified via `xxd` ROM inspection + address-map validation
- All 21 obstacle positions verified distinct; all 9 decoded models pass well-formedness gates

**Citation Authority:** ACCEPTABLE
- Findings doc prose facts all confirmed real in ROM (grep-verified in `.dis65`)
- Derived claims (distance ranges) re-verified and corrected post-rework
- DIP factory default judgment call disclosed and attested; not claimed as ROM fact

**Forward Dependencies:** LOW RISK
- bz1-3 (render) receives byte-exact obstacle placement + model wireframes
- Future stories inherit documented representational gaps (EXPLOSION_DEBRIS, DIP primary source)
- No committed data depends on gitignored quarry; green-without-reference/ verified twice

### Ready for Finish

- ✅ Reviewer verdict: APPROVED
- ✅ Tests: 81/81 passing, green without gitignored quarry
- ✅ Build: Clean (`tsc --noEmit && vite build`)
- ✅ Branch state: `chore/bz1-2-source-findings-doc` @ `e05c81c`, tree clean, no remote
- ✅ Story YAML: `review_verdict: approved`
- ✅ Session complete with all phase assessments

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Missile intro threshold asserted as a range invariant, not an exact value**
  - Spec source: context-story-bz1-2.md, AC-5 ("the missile threshold is pinned to one specific value in the 5K–30K range")
  - Spec text: "Scoring/threshold constants ... are committed as typed `src/core/` constants ... pinned to one specific value in the 5K–30K range, documented with citation in the findings doc."
  - Implementation: `scoring.test.ts` asserts `MISSILE_INTRO_THRESHOLD` is a whole-thousand number in [5000, 30000]; it does NOT assert a specific pinned number.
  - Rationale: The exact pin is a documented findings-doc judgment call with a quarry citation the Reviewer audits. TEA baking a specific value would be inventing the pin (the epic gives only the band). The test locks the invariant; the citation carries the authenticity.
  - Severity: minor
  - Forward impact: Reviewer must audit the pinned value's citation — the test will not catch an in-band-but-inauthentic pin.
- **Findings doc + reference/README + epic "known-ROM-facts" corrections handled as attestation, not unit tests**
  - Spec source: context-story-bz1-2.md, ACs 1, 2 & 6; SM assessment ("TEA decides the exact test/attestation split")
  - Spec text: "A single committed whole-game findings doc ... each fact citing its quarry source"; "corrections ... applied to that file and logged in the findings doc."
  - Implementation: `findings-doc.test.ts` guards only existence + substance (>2000 chars) + provenance string (`6502disassembly.com`). Per-fact citation accuracy, the reference/README, and the epic-context corrections are left to Reviewer prose audit — no unit test.
  - Rationale: Prose citation correctness and doc-vs-quarry agreement are not unit-testable; asserting reference/README existence would violate the "green without reference/" constraint (it is gitignored/checkout-local).
  - Severity: minor
  - Forward impact: Reviewer owns the citation + epic-correction audit; the committed data-module tests are the only automated fidelity gate.

### Dev (implementation)
- **Obstacle table (x, z, orientation) values are AUTHORED, not ROM-decoded**
  - **RESOLVED by ROM decode (2026-07-03 rework) — see "Dev (rework)" below.** Kept here,
    not deleted, per peloton history discipline: this correctly described the state under the
    web-fetch-only constraint that applied at GREEN time.
  - Spec source: context-story-bz1-2.md, Technical Approach ("Port the obstacle table into `src/core/obstacles.ts`") + AC-3 ("`src/core/obstacles.ts` contains a typed table with exactly 21 entries... asserted by a spot-check test")
  - Spec text: "the full 21-obstacle ROM table (position, orientation, obstacle type per entry)" ported "as typed, tested TypeScript in `src/core/`"
  - Implementation: `OBSTACLES` ships 21 entries with a golden-angle spiral scatter (even coverage, all positions distinct, sized to the Math Box's confirmed near/far culling bounds) cycling through the 4 ROM-named shape types, instead of the ROM's actual per-entry byte values.
  - Rationale: 6502disassembly.com's quarry (hub page + objects.html, fetched twice each with targeted prompts) confirms the table's existence/count/shape-roster but states the raw position/orientation bytes live in the ROM binaries themselves — not reproduced in the site's prose/HTML. Byte-exact extraction needs ROM/zip binary decoding, out of reach of the web-fetch tooling available this story. TEA's own RED-phase test design anticipated exactly this gap by asserting structure/count/integrity only, never exact values — so this satisfies every automated AC.
  - Severity: moderate
  - Forward impact: bz1-3 (render foundation) and any future collision-fidelity story will draw/collide against non-ROM-exact obstacle placement until a dedicated future story does a byte-level ROM/zip pull; flagged as a Gap in Delivery Findings and documented prominently in the findings doc §3/§6 and `reference/README.md` so it is never mistaken for verified fidelity.
- **Model3D vertex/edge geometry is AUTHORED, not ROM-decoded**
  - **RESOLVED by ROM decode (2026-07-03 rework) — see "Dev (rework)" below** (9 of 10 models
    fully; `EXPLOSION_DEBRIS` partially — see the new hybrid deviation logged below). Kept
    here, not deleted, per peloton history discipline.
  - Spec source: context-story-bz1-2.md AC-4 ("`src/core/models.ts` ... contains typed vertex/edge tables for every model ... asserted by spot-check tests")
  - Spec text: "3D object/vertex specs for every model" (slow tank, super tank, missile, saucer, each obstacle shape, projectile, explosion debris)
  - Implementation: all 10 `Model3D` entries use hand-authored vertex/edge data matching each ROM-named object's known silhouette (tank hull+turret+barrel, elongated missile, domed saucer, pyramid/box shapes, a 2-point shell tracer, radiating debris), rather than decoded ROM vertex-table bytes.
  - Rationale: same root cause as the obstacle-table deviation above — `objects.html` names the vertex-table format/address ($388e) but the actual coordinates are only in the ROM binaries, not the fetched prose. Well-formedness (valid indices, no self/dup edges, no orphans) is real and test-verified; exact ROM coordinates are not.
  - Severity: moderate
  - Forward impact: same as above — bz1-3 render foundation inherits non-ROM-exact wireframes until a future byte-level pull; documented in findings doc §4/§6.

### Dev (rework — 2026-07-03, byte-level ROM decode)
- **`EXPLOSION_DEBRIS` edges are AUTHORED even after byte decode — a real ROM/schema mismatch, not a leftover gap**
  - Spec source: context-story-bz1-2.md AC-4 (same as above); this rework's orders ("if real ROM data breaks a structural assumption, that's a REAL finding — report it, do NOT bend the data")
  - Spec text: n/a — this is a NEW deviation surfaced by decoding real bytes, not a shortfall against the original AC (which only required well-formedness, satisfied here).
  - Implementation: `EXPLOSION_DEBRIS`'s 9 vertices are now ROM-exact (8 from shape `$24` "Spatter #0", 1 from shape `$0e` "projectile explosion" — both byte-decoded from `reference/rom-quarry/Battlezone`). Its 8 edges (origin → each spatter point) are AUTHORED.
  - Rationale: the ROM does not connect these vertices with lines at all. Shapes `$24`-`$2b` ("Spatter") each decode to 8 vertices / **zero edges** — every draw command in their byte stream is `cmd 0` ("move to vertex, draw **point**"), never `cmd 4` ("draw **edge**"). Shape `$0e` decodes to 1 vertex / zero draw commands (per `VisBattlezone.cs`'s own comment, it's rendered via a hardware-canned "scaled shape" sprite at that point, `cmd 5`, not a vertex/edge mesh). `Model3D` (the type this project ported from star-wars) has `edges: [number,number][]` as its only primitive — no point/sprite primitive exists. Given the explicit instruction not to bend the data, I did NOT invent fake ROM-sourced edges to pretend this is byte-exact; I used the real ROM vertex positions and clearly labeled the edge connectivity as authored (in the module header, the model's own doc comment, the findings doc §4/§6, and here).
  - Severity: minor (all 9 models the AC actually gates on well-formedness pass fully; this is a fidelity note, not a broken AC — unlike the two now-resolved deviations above, which were moderate because the WHOLE table was authored)
  - Forward impact: none blocking. If a future story needs true point-sprite debris rendering (e.g. bz1-9/bz1-10 explosion VFX polish), `Model3D` would need a `points?: readonly number[]` primitive added — flagged as a Delivery Finding (Improvement, non-blocking) rather than done here (out of this story's scope; the AC only requires wireframe well-formedness, which the current hybrid satisfies).

## TEA Assessment

**Tests Required:** Yes
**Reason:** Story is typed "chore" but is NOT a bypass case — it ships three new
typed `src/core/` data modules (`obstacles.ts`, `models.ts`, `scoring.ts`) whose
ACs explicitly demand spot-check tests ("asserted by a spot-check test", "npm test
... new spot-check tests pass"). Hybrid split: the CODE modules are unit-tested;
the PROSE (findings doc, reference/README, epic corrections) is attestation,
review-audited against citations.

**Test/Attestation split (my RED decision):**
- **Unit-tested (committed src/core):** obstacle table shape/count/integrity;
  model vertex/edge well-formedness + roster; scoring/threshold constants.
- **Attestation (Reviewer audit):** per-fact quarry citations in the findings
  doc; the gitignored `reference/` + its README; corrections to the epic
  context's "known ROM facts". The lone doc test is an existence/substance/
  provenance guard, not a content audit.
- **Structural, not exact-value, for tables:** obstacle positions and model
  vertices are asserted for structure/integrity, NOT baked as fixtures — the
  story's Technical Approach prescribes "structural invariants only", and baking
  the ROM tables would couple the committed suite to the gitignored quarry and
  break the "green without reference/" constraint.

**Test Files:**
- `battlezone/tests/core/obstacles.test.ts` — 9 tests: exactly 21 entries; planar
  (x,z)+orientation+type shape; finite positions/orientation; type∈OBSTACLE_TYPES;
  ≥2 distinct types (pyramids AND blocks); 21 distinct positions.
- `battlezone/tests/core/models.test.ts` — 17 tests: Model3D registry mirroring
  star-wars; roster (slow/super tank, missile, saucer, shell, debris); per-model
  well-formedness (in-range edge indices, no self/dup edges, no orphans);
  cross-module — every obstacle type (declared and in-play) has a wireframe model.
- `battlezone/tests/core/scoring.test.ts` — 8 tests: exact kill values
  1000/2000/3000/5000; ascending order; saucer-appearance 2000; appearance≠kill
  guard; missile intro threshold = whole-thousand in 5K–30K band.
- `battlezone/tests/findings-doc.test.ts` — 3 tests (attestation): doc exists, is
  substantive (>2000 chars), cites `6502disassembly.com`.

**Tests Written:** 37 tests covering the 7 ACs' testable surface (5 data-module ACs
directly; 2 prose ACs via attestation + Reviewer audit).
**Status:** RED — verified. `npm test` → 37 failed | 44 passed (pre-existing
scaffold+math3d suites stay green), exit 1. `tsc --noEmit` → exit 2 (TS2307 on the
three not-yet-created modules). Every empty-registry guard fires, so 0 of the 37
tests pass vacuously.

### Rule Coverage

Language: TypeScript. Checklist: `.pennyfarthing/gates/lang-review/typescript.md`.
These are pure static ROM-data modules — most checks (React #6, async #7,
error-handling #11, input-validation #10, JSON.parse #10) are N/A. Applicable
checks and how they are covered:

| Rule | Coverage | Status |
|------|----------|--------|
| #2 missing `readonly` on data tables | Contract: exports typed `readonly Obstacle[]` / `readonly Model3D[]` / `as const` scores (compile-enforced; reviewer-rule-checker on DEV diff). Tests type against `readonly` contracts. | contract |
| #2 no `Record<string, any>` | Contract: `Obstacle`/`Model3D` interfaces, `ObstacleType` union — tests read them by shape. | contract |
| #3 union type over enum | Contract: `ObstacleType` is a string union, not an enum. | contract |
| #4 `??` vs `||` on 0/"" | `?? []` used in loaders (0/"" not falsy-risky here). | followed |
| #8 test quality — no vacuous assertions | Phase-C self-check: every empty-registry guard proven to FAIL during RED (0/37 vacuous passes); every test has a meaningful assertion; no `let _ =`, no `assert(true)`. | verified |

**Rules checked:** 5 of 13 lang-review checks are applicable to pure data modules; all 5 covered by test or by the exported contract (compile-enforced).
**Self-check:** 0 vacuous tests — confirmed empirically (all 37 fail on empty registries; none pass without real data).

**Handoff:** To DEV (Walter) for GREEN — create the three `src/core/` modules from
the quarry, author the findings doc with per-fact citations, wire the
reference/README, and correct the epic's known-ROM-facts where the ROM disagrees.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/obstacles.ts` (new) — `ObstacleType` union (4 ROM-named shapes),
  `OBSTACLE_TYPES`, `Obstacle` interface, `OBSTACLES` (21 entries, `readonly`).
- `battlezone/src/core/models.ts` (new) — `Model3D` interface + 10 named exports
  (`NARROW_PYRAMID`, `WIDE_PYRAMID`, `TALL_BOX`, `SHORT_BOX`, `SLOW_TANK`, `SUPER_TANK`,
  `MISSILE`, `SAUCER`, `SHELL`, `EXPLOSION_DEBRIS`) + aggregate `MODELS` registry.
- `battlezone/src/core/scoring.ts` (new) — `SCORES` (as const), `SAUCER_APPEARANCE_SCORE`,
  `MISSILE_INTRO_THRESHOLD` (pinned 10,000).
- `battlezone/docs/battlezone-1980-source-findings.md` (new) — the committed whole-game
  findings doc (11 sections incl. a dedicated §6 "ROM-verified vs authored" accounting and
  §10 verification pass against the epic context).
- `battlezone/reference/README.md` + `battlezone/reference/notes/*.md` (new, gitignored,
  checkout-local) — provenance, refresh procedure, and distilled fetch notes.
- `battlezone/.gitignore` (modified) — added `reference/`.
- `sprint/context/context-epic-bz1.md` — **NOT modified.** Every "known ROM facts" bullet was
  verified against the quarry and confirmed accurate; no factual disagreement was found, so
  no correction was needed (see findings doc §10 and the Delivery Findings Improvement entry).

**Quarry fetch status:** 6502disassembly.com/va-battlezone/ hub page, `objects.html` (×2),
`mathbox.html`, `Battlezone.html` (×2), `rev1.html` all fetched successfully — no block
encountered. Cross-checked arcade-museum.com's DIP switch settings page for the missile
threshold factory default. What the quarry's prose/HTML does NOT expose: the raw ROM byte
tables for the 21 obstacle positions and per-model vertex/edge coordinates (format + address
are documented; the bytes themselves are not reproduced in prose) — logged as a Gap finding
and two Design Deviations, not silently papered over.

**DIP pin:** `MISSILE_INTRO_THRESHOLD = 10000` — arcade-museum.com's Battlezone DIP switch
table marks the "Missile appears after 10,000 points" row with its factory-default `$`
marker (disassembly itself only gives the 5K/10K/20K/30K band). Full citation in findings
doc §9. Reviewer: please audit this citation per TEA's original Question flag.

**Tests:** 81/81 passing (44 pre-existing scaffold/math3d + 37 new bz1-2 tests, all GREEN).
`npm run build` (`tsc --noEmit && vite build`): clean.
Orchestrator `npm test`: 18/18 passing (unaffected — no orchestrator files touched).

**Git status:**
- `battlezone`: branch `chore/bz1-2-source-findings-doc`, commit `58fdf21` ("feat(bz1-2): port
  ROM findings into typed src/core data + findings doc"), working tree clean, **no push, no
  remote** (per session constraint).
- orchestrator (`.`): working tree clean aside from unrelated pre-existing untracked files
  noted at session start (`.pennyfarthing/peloton-state.json`, `bz1-1-blackcanvas-5276.png`);
  `sprint/context/context-epic-bz1.md` untouched.

**Deviations logged:** 2 (both moderate severity, both rooted in the same quarry limitation
— exact ROM byte tables for obstacle placement and model geometry are not recoverable via
web-fetch tooling; AUTHORED structurally-valid data ships instead, clearly labeled as such in
code comments, the findings doc §6, and `reference/README.md`).

**Handoff:** To Reviewer (The Big Lebowski) — holding per peloton discipline (no marker/relay,
SM routes next).

---

## Dev Rework Assessment (byte-level ROM decode, 2026-07-03)

**Rework complete:** Yes — both original moderate Design Deviations RESOLVED (marked, not
deleted, above); one new minor deviation logged for the one remaining representational gap
(`EXPLOSION_DEBRIS` edges).

**What changed:** the user supplied the real quarry locally
(`~/Downloads/va-battlezone/Battlezone` [16KB ROM], `Battlezone.dis65` [SourceGen project],
`MathBox.sym65`, `VisBattlezone.cs` [visualizer source = the canonical decode algorithm]).
Copied into gitignored `battlezone/reference/rom-quarry/`. Wrote
`battlezone/reference/decode_rom_tables.py`, a Python port of
`VisBattlezone.cs`'s `GenerateWireframe()` (models) and `GenerateMap()` (obstacles), and used
it to decode the real bytes, replacing every AUTHORED value the original GREEN pass had to
place holder.

**Address/offset math (how the decode was grounded, not guessed):** `Battlezone.dis65`'s own
`"AddressMap"` plus its file-header memory-map comment ("$3000-3fff: vector generator ROM
(4KB)", "$5000-7fff: program ROM (12KB)") gives file-offset→ROM-address translation:
offset `$0-$2fff`→addr `$5000-$7fff`; offset `$3000-$3fff`→addr `$3000-$3fff` (identity). Every
table address below was cross-checked against a `Battlezone.dis65` **label** (not just an
assumed default), e.g. label key `"9857"` = `obstacle_z_pos` @ `$7681`.

**Decode-verification note (how I validated the decoder against `VisBattlezone.cs`/`objects.html`,
per the rework orders):**
1. **Obstacle types, independently cross-checked against the disassembler's own annotations.**
   `Battlezone.dis65` carries inline per-byte comments naming the type for all 21
   `obstacle_t_f` entries in order (`"wide pyramind"` [sic], `"short box"`, `"wide pyramid"`,
   ...). My decoder's independently-computed type-byte sequence matches this list exactly,
   entry for entry, without having read those annotations first (I decoded the raw type
   bytes, then found this list and diffed — exact match).
2. **Position decode, cross-checked against `VisBattlezone.cs`'s own minimap logic.**
   `GenerateMap()` reads only the HIGH byte of each 16-bit `obstacle_x_pos`/`obstacle_z_pos`
   word (a coarse 256-unit-grid position). My full 16-bit decode of all 21 positions produced
   values that are *every one* an exact multiple of 256 (low byte always `0`) — not assumed,
   discovered — which is exactly what `GenerateMap`'s high-byte-only read implies. If the
   address math were wrong this coincidence across 42 separate bytes would be astronomically
   unlikely.
3. **Model well-formedness, checked against `VisWireframe.Validate()`'s own gate.**
   `VisBattlezone.cs`'s wireframe visualizer validates its own output (valid indices, i.e. no
   self-edges/dup-edges/orphans implied by a well-formed `VisWireframe`) before ever showing
   it. I ran the equivalent check (implemented in Python, mirroring
   `tests/core/models.test.ts`'s own assertions) against all 9 non-debris decoded shapes
   BEFORE porting them into `models.ts` — all 9 passed cleanly, zero edits needed to satisfy
   well-formedness. That 9-for-9 first-try pass rate is itself strong evidence the decode
   algorithm (vertex parse, command-byte parse, beam-state machine) is a correct port of
   `GenerateWireframe()`.
4. **Semantic spot-match:** decoded `wide-pyramid` (base ±800, apex height 800) vs.
   `narrow-pyramid` (base ±512, apex height 1280) independently reproduces the "wide base,
   shorter apex" vs. "narrow, taller" naming distinction the predecessor had only guessed at.
   Same for `tall-box` (height 1280) vs. `short-box` (height 560, wider footprint). `missile`
   (shape `$16`) is independently named by TWO unrelated ROM game-logic comments ("missile is
   type $16, so Y pos is at index 6"; "inc high byte of #6 (missile=$16)") — confirms the
   shape-index mapping without relying on `objects.html`'s index table alone.
5. **Structural mismatch surfaced honestly, not papered over:** shapes `$24`-`$2b` (Spatter
   debris) and `$0e` (projectile explosion) decode to zero edges — the ROM draws them as
   points, not lines. Rather than inventing ROM-looking edges to force a fit, I used the real
   decoded vertex positions and clearly labeled the edge connectivity as authored (module
   header, model doc comment, findings doc §4/§6, Design Deviations, Delivery Findings) — per
   the explicit "do NOT bend the data" instruction.

**Structural-assumption breaks found:** none that broke a TEA test. The one real
ROM/schema mismatch (`EXPLOSION_DEBRIS` point-vs-edge) was absorbable within the existing
`Model3D` contract (ROM-exact vertices + a disclosed authored edge choice) without bending any
data or touching TEA's tests — logged as a Design Deviation + Delivery Finding rather than a
blocking issue.

**Tests:** 81/81 passing, unchanged from GREEN — re-verified with `reference/` **physically
moved out of the checkout** (not just untested-against), confirming the hard "green without
reference/" constraint still holds after the rework:
```
Test Files  7 passed (7)
     Tests  81 passed (81)
```
`npm run build` (`tsc --noEmit && vite build`): clean, both with and without `reference/`
present. Orchestrator root `npm test`: 18/18 passing (unaffected).

**DIP pin:** UNCHANGED — `MISSILE_INTRO_THRESHOLD = 10000`, still from arcade-museum.com's
factory-default marker. The real ROM's `Battlezone.dis65` disassembly confirms the 4-option
band (5K/10K/20K/30K) exactly via its own `DSW0` memory-map comment and the missile-intro
routine's comment, but — being a physical DIP-bank read, not a ROM constant — the ROM cannot
say which of the 4 shipped as the factory default. No contradiction found; nothing to correct.
Scoring constants (1000/2000/3000/5000) additionally ROM-confirmed via inline immediate-value
comments in the kill-score-add routine — also unchanged.

**Files changed (rework, on top of the GREEN commit):**
- `battlezone/src/core/obstacles.ts` — all 21 `OBSTACLES` entries replaced with byte-decoded
  values; header comment rewritten with full ROM-address citations.
- `battlezone/src/core/models.ts` — full rewrite: 9 of 10 `Model3D` exports now byte-exact
  (vertices + edges); `EXPLOSION_DEBRIS` is the documented ROM-vertex/authored-edge hybrid.
- `battlezone/src/core/scoring.ts` — header/const comments strengthened with ROM code-offset
  citations; no value changes.
- `battlezone/docs/battlezone-1980-source-findings.md` — §3, §4, §6, §9, §11 rewritten.
- `battlezone/reference/README.md` — provenance rewritten (two-tier: web-fetch notes + real
  ROM quarry); refresh procedure updated for the new `rom-quarry/`/decoder.
- `battlezone/reference/rom-quarry/` (new, gitignored) — copied `Battlezone`,
  `Battlezone.dis65`, `MathBox.sym65`, `VisBattlezone.cs`.
- `battlezone/reference/decode_rom_tables.py` (new, gitignored) — runnable decoder.
- `battlezone/reference/notes/2026-07-03-rom-byte-decode.md` (new, gitignored) — full decode
  method, addresses, and cross-checks.

**Git status:**
- `battlezone`: branch `chore/bz1-2-source-findings-doc`, commit `e68fe19` ("fix(bz1-2):
  byte-decode real ROM tables for obstacles + models"), working tree clean, **no push, no
  remote** (unchanged constraint). `git log`: `e68fe19` → `58fdf21` → `5bdfd71` → ...
- orchestrator (`.`): no files touched by this rework; pre-existing untracked files from
  session start (`.pennyfarthing/peloton-state.json`, `bz1-1-blackcanvas-5276.png`) unchanged.

**Handoff:** To Reviewer (The Big Lebowski) — holding per peloton discipline (no
marker/relay/complete-phase; phase is already `review`; SM routes next).

---

## TEA Verify Assessment (The Jesus — independent verify pass, 2026-07-03)

**Verdict: READY FOR REVIEWER.** Took nobody's word. Re-ran everything, diffed the
tests, and hand-decoded raw ROM bytes for obstacles + two models. Everything the
Dev claims holds up at the byte level. This is real ROM data, not a well-dressed
placeholder. The one open judgment call (EXPLOSION_DEBRIS hybrid) is an acceptable,
fully-disclosed hybrid that should NOT grow the schema in this story.

### 1. Test / build re-run — actual outputs
- `cd battlezone && npm test` → **`Test Files 7 passed (7) · Tests 81 passed (81)`** (198ms). Matches Dev's claim.
- `cd battlezone && npm run build` (`tsc --noEmit && vite build`) → **clean**, `✓ built in 24ms`.
- orchestrator root `npm test` → **`pass 18 · fail 0`** (all bz1-1 bootstrap ACs green). Matches.

### 2. Tests not weakened — confirmed
- `git -C battlezone diff 5bdfd71 -- tests/` → **empty**. Not one hunk. The 37 structural tests are byte-identical to my predecessor's RED baseline.
- orchestrator `tests/battlezone-bootstrap.test.mjs`: last touched by `5a05091`; `git diff 5a05091 -- tests/battlezone-bootstrap.test.mjs` → **empty**. Untouched.
- The suite grew 37→ (37 new + 44 pre-existing = 81) with **zero edits to test files** since RED — GREEN was reached by writing source to satisfy fixed tests, exactly the TDD contract.

### 3. Decode audit — the load-bearing check (INDEPENDENT byte reads, NOT a re-run of Dev's decoder)
I `xxd`'d the raw ROM image myself and hand-decoded int16-LE by eye. Not once did I call `decode_rom_tables.py`.

**Obstacles — all 21 entries byte-exact vs `src/core/obstacles.ts`:**
- `obstacle_z_pos` @ file `0x2681` (ROM `$7681`), 21×int16 LE: every word matches (e.g. #4 `0x8000`→−32768 ✓, #10 `0xf700`→−2304 ✓, #13 `0x9400`→−27648 ✓, #20 `0x2c00`→11264 ✓).
- `obstacle_x_pos` @ file `0x26ab` (ROM `$76ab`), 21×int16 LE: every word matches (e.g. #12 `0x8c00`→−29696 ✓, #15 `0xe400`→−7168 ✓, #20 `0xf400`→−3072 ✓).
- `obstacle_t_f` @ file `0x3fcc` (ROM `$3fcc`), 21×[type,facing]: type bytes `0c/0f/00/01`→wide/short/narrow/tall and facing→radians (`facing*2π/256`) match all 21 (e.g. #0 `(0c,00)`→wide/0.0 ✓, #16 `(01,80)`→tall/π ✓, #20 `(01,a0)`→tall/3.926991 ✓). **`$ff` sentinel present** at file `0x3ff6` (`$3fcc+42`) ✓.

**Model geometry — WIDE_PYRAMID (`$0c`) fully byte-verified:**
- Vertex-pointer table `$388e` → shape `$0c` = `$3c3b` ✓; command-pointer table `$7472` → shape `$0c` = `$74cb` ✓ (both match the module's per-model citation).
- Vertex blob @ `$3c3b`: len `0x1f`→5 vertices; hand-decoded (`zc=rawZ, xc=−rawX, yc=rawY*2`) → all 5 exact: `[800,−640,−800] [−800,−640,−800] [−800,−640,800] [800,−640,800] [0,800,0]` ✓.
- Command blob @ `$74cb` (`03 a1 24 0c 04 1c 24 14 1c 12 0c ff`): decoded → edges `[0,4][4,1][1,0][0,3][3,4][4,2][2,3][2,1]` — **exact match to all 8 edges**, center vertex correctly NOT appended (no edge touches it).
- Corroboration across the whole roster: the vertex-pointer table I dumped matches EVERY model's cited `vertex tbl` address ($00→$38e6, $01→$3905, $02→$3955, $03→$3936, $0c→$3c3b, $0e→$3b3f, $0f→$3c5a). Decode addresses are grounded in the real ROM, not guessed.

### 4. Green-without-`reference/` — confirmed myself
Physically `mv reference /tmp/bz1-2-reference-parked`, then: `npm test` → **81/81 passed**, `npm run build` → **clean**, with the quarry absent from the checkout. Restored; `git status` clean. Nothing committed depends on the gitignored quarry. The hard star-wars/asteroids constraint holds.

### 5. Deviation stamps
- **EXPLOSION_DEBRIS hybrid — STAMPED ACCEPTABLE; do NOT grow the schema this story.** Byte-proven: shape `$24` command stream `3b a1 00 08 10 18 20 28 30 38 ff` = 8× `cmd 0` (draw **point**), **zero `cmd 4` edges**; shape `$0e` = `03 05 ff` = 1 vertex drawn via `cmd 5` (canned sprite), zero edges. The ROM genuinely does not connect these with lines. `$24`'s 8 vertices decode byte-exact to EXPLOSION_DEBRIS v0–v7 (verified the full ring); `$0e` origin decodes to `[0,0,0]` = v8. The 8 origin→point edges are authored connectivity. This is a true ROM-vs-schema mismatch, not a decode error — and the AC only requires wireframe well-formedness (satisfied). Adding `points?` to `Model3D` here would be scope creep on a data/docs story; correctly deferred to a future VFX story (bz1-9/10) as a Delivery Finding. **The Dude's rug stays where it is.**
- **DIP pin `MISSILE_INTRO_THRESHOLD = 10000` — STAMPED ACCEPTABLE.** The `.dis65` ROM confirms the BAND verbatim (`MM=missile appears at score (5K, 10K, 20K, 30K)` and `missiles first appear, based on DSW0 setting: after 5000, 10000, 20000, or 30000 points`) but, being a physical DIP-bank read, the ROM cannot name a single factory default. The pin is taken from arcade-museum.com's factory-default marker under the story's explicit "published analysis if the table doesn't resolve to a clean single default" allowance. In-band, whole-thousand, disclosed. **Reviewer still owns the final authenticity audit of that arcade-museum citation** (per TEA's original RED-phase Question) — the test only guards the band/shape invariant, by design.

### 6. Structural tests bind for the RIGHT reasons — confirmed
Not vacuous. Against the real data: 21 **distinct** (x,z) positions (verified — no two share both coords), **4** distinct types present (test needs ≥2), every model well-formed (valid indices / no self-edges / no dup edges / no orphans — spot-verified on WIDE_PYRAMID and EXPLOSION_DEBRIS), and every obstacle type is model-backed by name. The empty-registry guards would fire on missing data (proven vacuum-free in RED).

**⚠️ Scope note for the Reviewer — what the automated suite does and does NOT guarantee:** the 37 committed tests are STRUCTURAL/integrity only (TEA's deliberate RED test/attestation split). They would pass on the earlier AUTHORED data too — they do **not** by themselves prove ROM fidelity. ROM fidelity is now carried by (a) this byte-level audit and (b) the Reviewer's prose citation audit of the findings doc + `reference/README.md` + the arcade-museum DIP pin. That division of labor is intact and correct.

**Handoff:** To Reviewer (The Big Lebowski). Holding per peloton discipline — no
complete-phase, no marker, no relay. Phase stays `review`; SM routes next. That's
just, like, my verdict, man — and it's byte-audited.

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (inline — reviewer ran the mechanical checks directly rather than spawning) | 0 | N/A — battlezone 81/81, build clean, orchestrator 18/18, scope clean |
| 2 | reviewer-comment-analyzer | Yes | findings | 5 | CONFIRMED — independently reproduced the HIGH blocker (false culling-bounds claim, 3 locations, git-traced to `58fdf21`); 2 lesser stale comments (`models.test.ts:24`, `obstacles.ts:42`) folded into the fix |
| 3 | reviewer-test-analyzer | Yes | findings | 7 | CONFIRMED non-blocking — mutation testing verified the load-bearing tests genuinely bind; gameable substring match + loose DIP-band guard = non-blocking Improvements (both fixed in `e05c81c`); findings-doc "lorem-ipsum-gameable" is by-design attestation (citation audit is reviewer-owned, performed) |
| 4 | reviewer-type-design | Yes | findings | 2 | DISMISSED as blockers — kept as forward-looking Improvements for bz1-3 (typed `ObstacleType→Model3D` map, compiler-derived `OBSTACLE_TYPES`); readonly correctness / no-DOM-time-randomness / `tsc` clean / no unsafe casts all confirmed sound |
| 5 | reviewer-simplifier | Yes | findings | 5 | DISMISSED — all LOW; RED-phase dynamic-import scaffolding is deliberate; the identical pyramid/box edge arrays corroborate the decode (shared ROM command streams `$74cb`/`$74d7`), not a defect |
| 6 | reviewer-security | Yes | clean | none | N/A — no secrets in added lines; `reference/` gitignore rule verified (`git check-ignore` + `git ls-files`: quarry never tracked); no eval/DOM-injection/network surface; test fs access read-only + repo-scoped; no leaked local paths. Run at re-check gate, 2026-07-03 |
| 7 | reviewer-rule-checker | Yes | findings | 2 | CONFIRMED at LOW, non-blocking — `scoring.test.ts:76-77` `as number` casts silence the `undefined` branch of the test's defensive `Partial<Scores>` on matcher args (TS rule #1 match, not dismissible); cannot fabricate a pass (exact-value tests above + `expect(undefined).toBeLessThan` fail loudly); logged as Improvement in Delivery Findings. Remaining 13 rules × 71 constructs: compliant. Run at re-check gate, 2026-07-03 |
| 8 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (`workflow.reviewer_subagents.edge_hunter: false`) |
| 9 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (`workflow.reviewer_subagents.silent_failure_hunter: false`) |

All received: Yes (all enabled specialists returned — 5 in round 1, security + rule-checker at re-check; 2 disabled via settings)

## Reviewer Assessment (The Big Lebowski — adversarial review, 2026-07-03)

**Verdict: REJECTED.** One HIGH, blocking. The ROM *data* is genuinely excellent —
byte-exact, independently re-verified — but the citation-authority doc ships a
**demonstrably false quantitative claim** about that data, in three places, and this
story's whole job is to be the fact-accurate authority every later bz1 story cites.
That doesn't get waved through. The fix is small and prose-only. The rug does not tie
the room together when it's got a hole in it, man.

**The blocker (HIGH — doc-fidelity defect in the authority deliverable):**
The findings doc + `obstacles.ts` header assert all 21 obstacle positions sit inside
the Math Box near/far culling window `[1023, 31487]` ("range ~2500–15900 units"). The
committed ROM-decoded positions actually range **~9441–46341** from origin (per-axis
magnitudes to 32768) — **7 of 21 exceed the far bound**, and §4 still calls the data
"authored placement," contradicting the doc's own ROM-decode thesis. Three locations:
`src/core/obstacles.ts:40-42`, findings doc §3 (L178-180), findings doc §4 (L197-199).
It's AUTHORED-era prose (golden-angle scatter, deliberately sized to that bound) that
survived the rework un-re-derived (`git show 58fdf21` confirms). Logged as a blocking
Gap in Delivery Findings. **No data/test change required — prose correction only.**

### Judgment items I own (per the review orders)

1. **Citation audit (prose vs quarry) — PASS, except the blocker above.** I independently
   byte-audited beyond TEA's DATA audit: vertex-pointer citations `$00→$38e6`, `$0c→$3c3b`,
   `$16→$3c8b`, `$24→$3d28` all verify by `xxd`; command-pointer `$00/$0c→$74cb`, `$24→$75f4`
   verify; `NARROW_PYRAMID` vertex blob at `$38e6` hand-decodes to the committed
   `[512,-640,-512]…`. Obstacle tables `$7681/$76ab/$3fcc` + `$ff` sentinel re-confirmed by
   `xxd`. Prose citations grep-confirmed present in `Battlezone.dis65`: difficulty (`7000`,
   `17 second`, `aggression`), secondary threshold (`25K`), the verbatim DIP band
   ("missile appears at score (5K, 10K, 20K, 30K)"), and all four kill-score point comments.
   Every *cited fact* is real. The one false statement is a *derived geometric claim*, not a
   quarry citation — which is exactly the class of thing a prose audit exists to catch.
2. **DIP pin `MISSILE_INTRO_THRESHOLD = 10000` — AUTHENTICITY: ACCEPTABLE (non-blocking).**
   The ROM confirms the 4-option band verbatim but, being a physical DIP-bank read, cannot
   name a factory default. The pin rests on arcade-museum.com's `$` factory-default marker,
   used under the story's explicit tier-2 "published analysis if the table doesn't resolve to
   a clean single default" allowance, and the doc §9 honestly quotes that site's own
   "community-contributed, not verified" caveat. Honest, in-band, disclosed, permitted. Not a
   fidelity guarantee and the doc never claims it is. Downstream bz1-10 should revisit if a
   primary source (cabinet manual / MAME DIP defaults) surfaces — logged as a soft note, not a
   blocker.
3. **Epic corrections outcome — JUSTIFIED.** Dev's "zero corrections needed, file untouched"
   conclusion holds: `sprint/context/context-epic-bz1.md` is untouched in the worktree, and I
   grep-confirmed the epic's known-ROM-facts (scoring, spawn rule, DIP band, difficulty
   ratchet, radar cone, POKEY sound) are all present/consistent in the quarry. The one
   unverifiable bullet (radar 90° FOV horizon) is honestly flagged "not confirmed or denied"
   in §7/§10 rather than rubber-stamped. Correct call to expand-in-doc rather than edit the epic.
4. **Deviation audit — see stamps below.**
5. **Scope guard — CLEAN.** Diff is data + docs + tests only. No `sim/render/state/input/loop/`
   `audio/enemies/radar/ai` files. `.gitignore` diff is just `reference/`. Nothing snuck in.
6. **Independent re-runs.** battlezone `npm test` → **81/81**; `npm run build` → clean;
   orchestrator `npm test` → **18/18**. Green-without-`reference/` was verified twice upstream
   (Dev + TEA); I did not re-move it — satisfied.

### Deviation audit (every TEA + Dev deviation stamped)

| Deviation | Source | Stamp | Rationale |
|-----------|--------|-------|-----------|
| Missile threshold asserted as range invariant, not exact value | TEA | **ACCEPTED** | Correct test/attestation split; I performed the citation audit it delegated. (Minor: band-membership could tighten to the 4 documented options — non-blocking Improvement.) |
| Findings doc / README / epic corrections handled as attestation, not unit tests | TEA | **ACCEPTED** | Prose citation audit performed by Reviewer; epic needed no corrections (verified). |
| Obstacle table (x,z,orientation) AUTHORED | Dev (GREEN) | **ACCEPTED (resolved)** | Superseded by rework; data now byte-exact — independently `xxd`-verified. |
| Model3D vertex/edge geometry AUTHORED | Dev (GREEN) | **ACCEPTED (resolved)** | Superseded by rework; 9/10 byte-exact — vertex/cmd citations verified. |
| EXPLOSION_DEBRIS edges AUTHORED after byte decode (ROM/schema mismatch) | Dev (rework) | **ACCEPTED** | Byte-proven: shape `$24` blob `3b a1 00 08 10 18 20 28 30 38 ff` = 8×`cmd 0` (points), zero `cmd 4` (edges). ROM genuinely has no debris edges; `Model3D` has no point primitive. Honest ROM-vertex/authored-edge hybrid, fully disclosed. `points?` schema growth correctly deferred to a future VFX story — do NOT grow the schema here. The Dude's rug stays. |

**No undocumented deviations found** — nothing to log under a Reviewer (audit) heading.

### Specialist subagents (Brandts) — confirm/dismiss

- **comment-analyzer:** CONFIRMED the blocker independently (same ~9441–46341 range, all 3
  locations, git-traced to the authored era) + the stale `models.test.ts:24` comment (MEDIUM,
  folded into the fix) + `obstacles.ts:42` "spot-checked below" (LOW, folded). Rated the
  culling claim Critical; I classify it HIGH (false doc claim, but the *data* is correct —
  no corruption/crash). Either way it blocks.
- **test-analyzer:** mutation testing CONFIRMED the load-bearing tests genuinely bind (exactly-21,
  distinct positions, well-formedness, exact kill values). Surfaced gameable substring match
  (`models.test.ts:194/206`) and loose DIP-band guard (`scoring.test.ts:438`) — real but
  **non-blocking** test-robustness Improvements (shipped data is correct; tests are weaker than
  they claim). The findings-doc test being "gameable by lorem ipsum" is **by design** — TEA's
  RED split makes it a smoke guard and hands the real per-fact citation audit to the Reviewer,
  which I performed. Test-name overclaim is a LOW cosmetic note.
- **type-design:** DISMISSED as blockers, kept as forward-looking Improvements — no typed
  `ObstacleType→Model3D` map (MEDIUM, for bz1-3) and non-derived `OBSTACLE_TYPES` (LOW).
  Confirmed readonly correctness sound, no DOM/time/randomness, `tsc` clean, no unsafe casts,
  `ObstacleType` union + `Model3D` shape both correct/convention-matching.
- **simplifier:** all LOW/dismissed — RED-phase dynamic-import scaffolding is deliberate; the
  identical pyramid/box edge arrays *corroborate* the decode (those shape families share a ROM
  command stream, `$74cb`/`$74d7`), not a defect.

### Verdict table

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **[HIGH]** | Findings doc + module header assert all 21 obstacles fall in culling window `[1023,31487]` / "~2500–15900 units"; real ROM range is ~9441–46341 (7/21 outside). §4 also still says "authored placement." | `src/core/obstacles.ts:40-42`; findings doc §3 (L178-180); findings doc §4 (L197-199) | Correct or remove the three passages (prose-only, no data/test change). Prefer dropping the view-frustum framing for static world placement, or restate against the real range. |
| [MEDIUM] | Stale "edge connectivity is authored" blanket comment (9/10 now ROM-exact) | `tests/core/models.test.ts:24` | Update/soften (non-blocking; sweep with the fix) |
| [MEDIUM] | Cross-module integrity uses gameable substring match | `tests/core/models.test.ts:194,206` | Tighten to normalized-equality or a typed map (non-blocking) |
| [LOW] | DIP-band guard accepts any whole-thousand in-band (e.g. 15000) | `tests/core/scoring.test.ts:438` | Tighten to `{5000,10000,20000,30000}` (non-blocking) |
| [LOW] | "spot-checked below" implies a nonexistent in-file artifact | `src/core/obstacles.ts:42` | Reword (non-blocking) |

**Data flow traced:** ROM bytes (`$7681/$76ab/$3fcc`, `$388e/$7472`) → `decode_rom_tables.py`
→ `src/core/obstacles.ts` + `models.ts` → consumed by future bz1-3 render. Safe: the *data* is
byte-exact (independently re-decoded). The *prose describing it* carries one false invariant that
must be corrected before it becomes load-bearing citation.

**Handoff:** Back to Dev via SM — one prose-only correction (3 passages) closes the blocker;
non-blocking test/comment sweeps optional but recommended in the same pass. Re-review is a
quick prose re-check; no data re-audit needed. Holding per peloton discipline.

---

### Reviewer Re-Review (2026-07-03, after Dev `26e80bf` + TEA `e05c81c`)

**Verdict: APPROVED.** The blocker is gone and every prior finding is addressed. Reviewed
`git diff e68fe19..e05c81c` end to end — the diff touches only the findings-doc prose, the
`obstacles.ts` **header comment** (the `OBSTACLES` array itself is untouched — no data change),
and two strengthened test bodies. Nothing smuggled; scope stays data + docs + tests.

**Blocker (HIGH) — CLEARED, verified true at all 3 locations against the data:**
- `src/core/obstacles.ts:40-42` — false culling claim replaced with the real range
  (~9441–46341) and the correct camera-relative-clip framing (my preferred fix: the
  view-frustum framing is dropped for static placement, not just re-numbered). "spot-checked
  below" (LOW #4) folded in.
- Findings §3 (L178-180) — distinctness claim kept (true: 21 distinct); false culling sentence
  replaced with "ranges ~9441–46341 units (7 of 21 entries exceed 31487)."
- Findings §4 (L197-199) — keeps the verbatim `$03ff`/`$7aff` near/far quote (a real ROM
  fact), adds a transparent "Correction (rework)" paragraph; no longer asserts "authored
  placement" as a live claim.
- Figures independently confirmed against my round-1 computation: **min 9441 (#15), max 46341
  (#4), 7 outside `31487` at indices [2,3,4,5,6,16,17]** — exact match. The corrections read
  true.

**TEA's three tightenings — confirmed STRENGTHENING, none weakened:**
- `tests/core/models.test.ts:24` — stale "edges authored" blanket comment rewritten accurately
  (9/10 ROM-exact edges; EXPLOSION_DEBRIS the lone hybrid). ✓
- `tests/core/models.test.ts:194/206` — gameable `.some()`/substring replaced with an injective
  `filter().length === 1` per type **+** `picked.size === types.length` (all distinct). Defeats
  both the mega-name superstring attack and one-model-covering-two-types. Strictly stronger;
  still passes on the real roster (each of the 4 obstacle types matches exactly its own model). ✓
- `tests/core/scoring.test.ts:438` — `%1000 in [5000,30000]` replaced with
  `[5000,10000,20000,30000].toContain(...)`, rejecting non-options (7000/15000/25000) while
  leaving WHICH of the four is the factory default as the citation-owned judgment call. Strictly
  stronger. ✓

**Re-run:** battlezone `npm test` → 81/81; `npm run build` → clean.

**Remaining open items (all NON-blocking, correctly deferred — not re-review gates):**
- Type-design forward-looking Improvements for bz1-3 (typed `ObstacleType→Model3D` lookup;
  compiler-derived `OBSTACLE_TYPES`) — logged in Delivery Findings, not required by this story's
  ACs.
- All previously-stamped ACCEPTED items (EXPLOSION_DEBRIS hybrid, DIP pin, resolved GREEN
  deviations) unchanged.

**Verdict:** APPROVED. `pf sprint story update bz1-2 --review-verdict approved`.

**Specialist tags (enabled set):** [TEST] test-analyzer findings processed — mutation-verified
that the load-bearing tests bind; gameable substring match + loose DIP guard confirmed as
non-blocking Improvements, both fixed in `e05c81c`. [SEC] security scan run at the re-check
gate — CLEAN (no secrets, `reference/` gitignored and never tracked, no injection/network
surface, no leaked paths). [RULE] rule-checker run at the re-check gate — 2 findings CONFIRMED
at LOW non-blocking (`scoring.test.ts:76-77` `as number` type-safety escapes on matcher args;
cannot fabricate a pass), remaining 13 rules × 71 constructs compliant. Full detail in the
Reviewer Re-Check addendum below.

**Handoff:** To SM for finish-story. Holding per peloton discipline — no marker, no
complete-phase. The rug ties the room together now.

## Dev Fix Pass (blocker resolution, 2026-07-03)

**Blocker addressed:** dropped the camera view-frustum framing for static obstacle placement
entirely (per the Reviewer's endorsed recommendation), rather than patching the stale numbers,
and re-derived the real distance-from-origin range directly from the decoded `OBSTACLES` table
with citation — confirmed by direct computation: **min ≈ 9440.8, max ≈ 46340.95** (7 of 21
entries exceed the 31487 far-plane value). Root explanation now on record in both fixed
locations: the Math Box's near/far culling bounds clip by distance from the **camera** at
render time (the player's tank moves freely around the plane), not by an obstacle's fixed
distance from **world origin** — the two were never the same quantity, so there's no reason to
expect the latter to sit inside a bound defined for the former.

**Files changed (prose/comments only — no `OBSTACLES` values, no test files):**
- `src/core/obstacles.ts:40-47` (header comment) — corrected + dropped the stale
  "spot-checked below" reference (Reviewer's LOW finding #4, folded in).
- `docs/battlezone-1980-source-findings.md` §3 — corrected range + citation.
- `docs/battlezone-1980-source-findings.md` §4 — corrected the "authored placement... keeps
  every obstacle inside this window" claim; kept the verbatim near/far-plane quote (still a
  real, accurately-cited ROM fact) but added a "Correction (rework)" paragraph naming the real
  range and explaining why camera-relative culling was never the right bound for placement.

**Did NOT touch:** any test file (`tests/core/models.test.ts:24/194/206`,
`tests/core/scoring.test.ts:438` — those three non-blocking sweeps are explicitly routed to
TEA at re-verify, per SM instruction, not mine to fix), any `src/core/*.ts` data values, the
gitignore/bootstrap patch (already closed in a separate commit), `sprint/context/context-epic-bz1.md`.

**Verification:**
```
npm test  → Test Files 7 passed (7) / Tests 81 passed (81)
npm run build → tsc --noEmit && vite build — clean
```
`git status` clean on `chore/bz1-2-source-findings-doc` after commit.

**Commit:** `26e80bf` — "fix(bz1-2): drop false camera-culling framing for obstacle placement"
(on top of `e68fe19`). No push (unchanged constraint).

**Handoff:** To TEA (The Jesus) for re-verify per SM routing (the 3 non-blocking test/comment
sweeps are his), then a quick prose re-check by Reviewer — no data re-audit needed. Holding.

---

## TEA Re-Verify Assessment (The Jesus — fix re-verify + test tightenings, 2026-07-03)

**Verdict: BLOCKER FIX VERIFIED + 3 TEST SWEEPS DONE. READY FOR REVIEWER re-check.**
This is an addendum to my earlier `## TEA Verify Assessment` (the byte-audit stands unchanged —
only prose and tests moved). Everything below I re-derived myself.

### Part A — Walter's blocker fix (`26e80bf`) re-verified independently
- **Computed min/max obstacle distance-from-origin myself** (python over `src/core/obstacles.ts`,
  not trusting the prose): **min = 9440.8 (obstacle #15), max = 46341.0 (#4)** → rounds to the
  corrected prose's `~9441–46341`. **7/21 exceed the 31487 far bound** (indices [2,3,4,5,6,16,17]),
  **0/21** below the 1023 near bound. Matches Walter's numbers and the Reviewer's "7/21" exactly.
- **Stale-figure sweep:** the old false range `"2500–15900"` is **gone** (grep: no hits). The
  surviving `1023`/`31487`/`culling`/`frustum` mentions are all in the CORRECTED framing —
  `obstacles.ts:40-48` and findings doc §3 (L178-180) + §4 (L196-216) now state the culling
  window is a **camera-relative render-time clip that does not bound static world placement**,
  and §4 carries an explicit "**Correction (rework)**" paragraph quoting-then-refuting the old
  claim. No stale false invariant survives anywhere. The "spot-checked below" phantom-artifact
  phrasing (LOW #4) is also gone from `obstacles.ts`.
- **Re-ran:** `battlezone npm test` → **`Test Files 7 passed (7) · Tests 81 passed (81)`**;
  `npm run build` (tsc --noEmit && vite build) → **clean**.

### Part B — three Reviewer test/comment findings, STAMPED ADDRESSED (commit `e05c81c`, separate from Walter's)
- **[MEDIUM] `models.test.ts:24` stale comment → FIXED.** The "ROM object tables give vertices;
  edge connectivity is authored by DEV" blanket claim was false post-rework. Rewritten to state
  9/10 models are fully ROM-exact (vertices AND edges from each shape's command stream),
  EXPLOSION_DEBRIS the lone hybrid, and that the tests assert well-formedness (not exact edges)
  to avoid duplicating the port / coupling to the gitignored quarry — not because edges are authored.
- **[MEDIUM] `models.test.ts:194/206` gameable substring match → TIGHTENED.** Replaced the
  gameable `MODELS.some((m) => norm(m.name).includes(norm(t)))` with a real **injective map**:
  EXACTLY ONE model per obstacle type AND all per-type models must be DISTINCT. (Exactly-one
  alone was insufficient — a single model named `narrowpyramidwidepyramidtallboxshortbox` is a
  superstring of every type id and passes a per-type count check; the distinctness assertion is
  what actually kills the mega-name.) **Scratch-proved it bites:** real model names → PASS;
  mega-name single model → FAIL (distinct 1/4); the old `some()` would have accepted the mega-name.
- **[LOW] `scoring.test.ts:438` loose DIP guard → TIGHTENED.** Replaced "any whole-thousand in
  [5000,30000]" (which wrongly admitted 7000/13000/25000) with membership in the four discrete
  ROM DIP options `{5000, 10000, 20000, 30000}` — a hard ROM fact (byte-confirmed `MM=missile
  appears at score (5K,10K,20K,30K)`). Which of the four is the factory default stays the
  citation-audited judgment call, deliberately NOT hard-asserted — the RED test/attestation
  split is preserved.

### Part C — discipline notes
- **Tightening only, no data loosened, no defect exposed.** Current data satisfies every tightened
  assertion (4 distinct types → 4 distinct models; `MISSILE_INTRO_THRESHOLD = 10000` ∈ the DIP set).
  Nothing to report as a new finding.
- **Test count unchanged: 81** (no assertions split; two tests renamed, none added/removed).
- Touched only `tests/core/models.test.ts` + `tests/core/scoring.test.ts`. No source/data, no
  `obstacles.ts`/`models.ts`/`scoring.ts` values, no findings doc, no epic context. Branch
  `chore/bz1-2-source-findings-doc` @ `e05c81c`, tree clean, no push (unchanged constraint).

**Handoff:** To Reviewer (The Big Lebowski) for the quick prose re-check + a glance at the three
tightened tests. Holding per peloton discipline — no complete-phase, no marker, no relay; phase
stays `review`; SM routes next.
---
## Reviewer Re-Check (The Big Lebowski — blocker fix + 3 test tightenings, 2026-07-03)

**Verdict: APPROVED.** The blocker is genuinely fixed and all three test findings are
addressed, not gamed. No new findings. Ready for finish flow.

### What I verified myself (not taken on faith)
- **Branch state:** `chore/bz1-2-source-findings-doc` @ `e05c81c`, tree clean; `26e80bf`
  (blocker fix) and `e05c81c` (test tightenings) both present and scoped as described.
- **Recomputed obstacle distances independently** (node over the `OBSTACLES` table in
  `src/core/obstacles.ts`): min **9440.8** at #15, max **46341.0** at #4, **7/21 beyond 31487**
  at indices [2,3,4,5,6,16,17], **0/21 below 1023**, all coordinates exact multiples of 256,
  all 21 pairwise distinct. Matches the corrected prose ("~9441–46341"), TEA's re-verify, and
  my original review's numbers exactly.
- **Stale-figure sweep:** grep for `2500`/`15900` across src/tests/docs — only hit is the
  substring "25000" inside `scoring.test.ts`'s comment *explaining* the old loose guard. The
  false "2500–15900" range is gone. All surviving `1023`/`31487` mentions
  (`obstacles.ts:43-48`, findings doc §3 L181-183, §4 L196-216) carry the corrected
  camera-relative-clip framing; §4's explicit "Correction (rework)" paragraph
  quotes-then-refutes the old claim accurately.
- **Test tightening 1** (`models.test.ts` header, ~L24-34): comment now correctly states 9/10
  models ROM-exact (vertices AND edges), EXPLOSION_DEBRIS the lone hybrid, with the
  well-formedness-not-exact-edges rationale. Accurate post-rework.
- **Test tightening 2** (`models.test.ts:194-239`): traced the mega-name attack through the new
  assertions — a single superstring-named model passes exactly-one per type but fails
  `picked.size === usedTypes.length` (1 ≠ 4). The injective map is real, applied to both the
  in-play and declared-type tests.
- **Test tightening 3** (`scoring.test.ts:92-101`): guard is now set-membership in
  `[5000, 10000, 20000, 30000]` — 7000/13000/25000 no longer admitted. Factory default stays
  attested (citation-audited), not hard-asserted; RED/attestation split preserved.
- **Suite re-run myself:** `npm test` → **7 files, 81/81 pass**.

### Residual concerns
None blocking. The exactly-one-model-per-type constraint means a future legitimate variant
model (e.g. "Narrow Pyramid (damaged)") would trip the test — acceptable safe-side tightness
for this story; whoever adds variants owns loosening it deliberately.

**Handoff:** Review phase complete, APPROVED. Per peloton discipline no complete-phase/marker
from me — SM (The Dude) routes to finish.

### Reviewer Re-Check addendum (completion-gate catch — security + rule-checker run, 2026-07-03)

The phase-completion gate correctly REJECTED the first exit attempt: two ENABLED specialists
(`reviewer-security`, `reviewer-rule-checker`) had no Subagent Results rows — round 1 never ran
them (it ran three disabled ones instead: comment-analyzer, type-design, simplifier). Errors are
not skips; both were spawned for real against `git diff develop...e05c81c` before this second
exit attempt. Independent spot-checks by me at the same commit: corrected prose confirmed in
`obstacles.ts:41-48` + findings doc §3/§4 "Correction (rework)"; no stale `2500–15900` anywhere;
DIP guard is set-membership `[5000,10000,20000,30000]`; injective-map `picked.size` assertions
present in both model tests.

- **[SEC] reviewer-security → CLEAN.** No secrets/tokens in any added line; `.gitignore`
  `reference/` rule verified via `git check-ignore` + `git ls-files` (quarry never tracked, no
  ROM bytes committed — table/vertex data is decoded output integers); no eval/innerHTML/dynamic
  code, no runtime network calls (doc URLs are inert citations); test fs access read-only and
  repo-scoped; no absolute local paths/usernames leaked (`~` shorthand only).
- **[RULE] reviewer-rule-checker → 2 findings, both CONFIRMED at LOW (non-blocking).**
  13 checklist rules × 71 constructs, all else compliant (incl. rule #13 re-scan of both fix
  commits: zero escapes introduced). The two: `scoring.test.ts:76-77` cast
  `SCORES.superTank/.saucer as number` on matcher args, silencing the `undefined` branch of the
  test's own defensive `Partial<Scores>`. I read the lines myself: a failed module load cannot
  produce a false pass — the exact-value tests directly above fail first and
  `expect(undefined).toBeLessThan(...)` fails loudly. Rule #1 match → NOT dismissed: confirmed
  LOW, logged as non-blocking Improvement in Delivery Findings for a future test sweep. LOW does
  not block per severity policy.
- Round-1 tags for the record: [TEST] processed (mutation-verified, 2 tightenings shipped in
  `e05c81c`), [DOC] processed (blocker confirmed + fixed in `26e80bf`), [TYPE] processed
  (forward-looking Improvements logged), [SIMPLE] processed (all dismissed LOW with rationale);
  [EDGE]/[SILENT] disabled via settings — no coverage claimed.

**Verdict unchanged: APPROVED.** No Critical/High. Exit sequence re-run follows — this addendum
closes the gate honestly rather than penciling in rows for work never done.