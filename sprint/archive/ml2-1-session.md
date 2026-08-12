---
story_id: ml2-1
jira_key: ml2-1
epic: ml2
workflow: tdd
---
# Story ml2-1: Vendor + byte-citation-gate the picture EPROMs 136013-106/107 from the MAME milliped set (368XX.SB2 not preserved upstream, ml1 OQ-3): place the ROM bytes under a byte-equality gate like pac-man/centipede, provenance recorded, reference/ licence-walled.

## Story Details
- **ID:** ml2-1
- **Epic:** ml2
- **Jira Key:** ml2-1
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Branch:** feat/ml2-1-vendor-picture-eproms-byte-gate
- **PR:** #287 (code → develop, open) — https://github.com/slabgorb/arcade/pull/287
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T17:46:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T17:00:24Z | 2026-08-12T17:04:33Z | 4m 9s |
| red | 2026-08-12T17:04:33Z | 2026-08-12T17:15:43Z | 11m 10s |
| green | 2026-08-12T17:15:43Z | 2026-08-12T17:25:05Z | 9m 22s |
| review | 2026-08-12T17:25:05Z | 2026-08-12T17:46:14Z | 21m 9s |
| finish | 2026-08-12T17:46:14Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA][Gap→closed, non-blocking] The ROM-source premise is VALIDATED, not just present.** TEA
  extracted `136013-106.p5` and `136013-107.r5` from `~/roms/milliped.zip` into the scratchpad and
  CRC32'd them: `106.p5` = `f4468045`, `107.r5` = `68c3437a`, both 2048 bytes — an EXACT match to
  MAME's `ROM_START( milliped )` (centiped.cpp:2226-2227). The romset is authentic; Dev vendors with
  confidence and the byte-equality gate proves GREEN against real, verified bytes.
- **[TEA][Improvement, IMPORTANT for GREEN] The byte-teeth must skip on a missing BINARY, not a
  missing ROOT — or every deploy reddens.** millipede's `vendoredAvailable = existsSync(vendoredRoot)`
  keys on the DIRECTORY, which is always present (the `.MAC` source is committed). The picture EPROMs
  are licence-walled (absent on CI). So the byte path in `check-citations.mjs` must treat an absent
  binary under the root as SKIP (schema-only), never a "file does not exist" error — the per-FILE guard
  lives in the byte path itself (pac-man's `soundRoot = soundAvailable ? … : null` idiom). This is the
  "First-ship quarry gate CI-red" trap; the RED test `SKIPS a byte citation whose binary is ABSENT
  under the root` pins exactly this contract deterministically (temp dir, no real ROM needed).
- **[TEA][Gap, non-blocking, for ml2-2] MAME gfx1 load ORDER: 107 first, 106 second.** centiped.cpp
  loads `136013-107.r5` at region offset `0x0000` and `136013-106.p5` at `0x0800`. ml2-1 only pins raw
  bytes, but the eventual planar decode (ml2-2) will need to know which EPROM is the lower/upper plane —
  don't assume `106` = plane 0 from the part-number ordering.
- **[TEA][Reference, non-blocking] Provenance values for the claims JSON (cite centiped.cpp:2226-2227,
  never copy):** `136013-106.p5` CRC32 `f4468045`, SHA1 `602fcc7290f9f4eacb841c76665961ebf4307f80`;
  `136013-107.r5` CRC32 `68c3437a`, SHA1 `4c7ea33d9501456ee8f5a642da7d6c972f2bb90d`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

Setup by SM (Ruby Rhod). Phase pointer read `setup` on arrival; routing to TEA for RED.

**ROM-source premise MEASURED and RESOLVED before setup.** The epic description frames the
picture EPROMs as sourced from "the MAME milliped set (368XX.SB2 not preserved upstream — ml1
OQ-3)", which reads as an open acquisition question. It is closed for this story: the user
supplied the romset at `~/roms/milliped.zip`, and `unzip -l` confirms it holds the two picture
EPROMs ml2-1 needs — `136013-106.p5` (2048 bytes) and `136013-107.r5` (2048 bytes). Byte images
are NOT on disk anywhere else (verified: `reference/original-source/millipede/` holds only the
`.MAC` assembler source; `~/Projects/millipede-source` is the same source set; no `milliped.zip`
in Downloads/Desktop/Projects). So the full centipede model applies — vendor the two EPROMs
licence-walled (gitignored, never committed), prove the byte-equality gate GREEN against the real
bytes, don't ship a dormant skip-only gate.

**Provenance driver-path corrected.** There is NO `milliped.cpp`. MAME defines Millipede inside
the Centipede driver: `~/Projects/mame/src/mame/atari/centiped.cpp`, `ROM_START( milliped )` —
the source of the part numbers + CRC32s (GPL, cite in prose only). sm-setup's Technical Approach
step 3 initially said "milliped.cpp"; corrected in `context-story-ml2-1.md`.

**Dependency satisfied.** ml1 is fully done — citation gate
(`plugins/millipede/tools/audit/check-citations.mjs` + `tests/audit/`), purity scan
(`plugins/millipede/tests/purity.test.ts`), and the rom-study dossier
(`plugins/millipede/docs/rom-study/`) are all in place. Every new claim must ride the citation gate.

**Sibling probes clean** — no `ml2` branch anywhere, only live session across checkouts is
jt11-4 (a-3, different story). Claim committed on the feature branch and pushed
(`origin feat/ml2-1-vendor-picture-eproms-byte-gate`), status stamped `in_progress`.

**Scope fence:** vendor + byte-equality gate + provenance + licence-wall ONLY. Decode primitive
= ml2-2, RAM-colour palette seam = ml2-3, bake-to-`*-data.ts` + visual playfield = ml2-4.

## Tea Assessment

RED authored by TEA (Leeloo). One new file: `plugins/millipede/tests/audit/graphics-rom.test.ts`
(260 lines, committed `5747f465`). RED state verified: full millipede project = **7 failed | 134
passed | 3 skipped**; only the new file is red, no collateral. `npm run lint` (repo-wide `tsc
--noEmit`, the CI gate) = **exit 0**.

**The GREEN contract (what Korben builds, in order):**
1. **Vendor** `136013-106.p5` + `136013-107.r5` from `~/roms/milliped.zip` into
   `reference/original-source/millipede/`, and add a `.gitignore` rule so the bytes are LICENCE-WALLED
   (never committed — the `.MAC` source there stays committed). CRC-verified authentic (see Findings).
2. **Extend** `tools/audit/check-citations.mjs` (+ `.d.mts`) with a BYTE citation `{ file, offset,
   bytes }` (whole bytes 0..255), ported in spirit from pac-man's graphics-ROM teeth
   (`plugins/pac-man/tools/audit/check-citations.mjs`). Must: schema-validate everywhere;
   byte-verify against the vendored binary; and **SKIP (not error) an absent binary under the root**
   (the CI-green invariant — see the IMPORTANT Delivery Finding).
3. **Record provenance** as byte claims under `docs/rom-study/claims/` (e.g. `06-graphics.json`),
   one run per EPROM, each carrying the MAME CRC32 + a `centiped.cpp` corroboration in prose.

**Rule coverage (`.pennyfarthing/gates/lang-review/typescript.md`):**
- **#15 (token vs claim) / #18 (test apparatus fails-by-passing):** the byte-equality teeth are
  MUTATION-tested — `a drifted byte reddens` and `a run that overflows EOF reddens` prove the gate
  can fail. The one token-match assertion (CRC32 hex present in the claim JSON) is deliberately
  BACKSTOPPED by the real-byte proof (`crc32(vendoredFile) === expected` + `checkClaims` re-opens
  byte-for-byte), so provenance can't be a bare keyword with no bytes behind it.
- **#19 (population filtered by a neighbouring field):** the two AC3 tests are split so the floor is
  guarded — one asserts a byte claim EXISTS per EPROM (`length > 0`), the other asserts its CONTENT;
  an empty filtered population fails the first, never passes the second vacuously.
- **#8 / no `as any` in assertions:** casts are `as unknown as <typed>` at the loadClaims boundary
  only (the real `Claim` is text-only until GREEN adds the byte variant); no `as any`. Local
  `ByteClaim`/`ByteSource` shims mirror the pac-man contract so the suite compiles today.
- **Harness-error trap:** `loadChecker()` wraps the dynamic import with a self-describing "not
  byte-extended yet" message, so a RED proves the FEATURE is absent, not that the test is broken.
- **skip-if-absent is explicit:** the dev-only real-byte block is `describe.skipIf(!allRomsPresent)`
  with the reason in the name; it keys on per-FILE existence, not `existsSync(vendoredRoot)`.

Handing to Korben (Dev) for GREEN.

## Dev Assessment

GREEN by Dev (Korben). Commit `8586bab8` (pushed). Five files, all within `plugins/millipede/`
+ the root `.gitignore`; the two ROM binaries are gitignored and never staged (verified
`git status` shows no `.p5`/`.r5`).

**What was built (the TEA contract, in order):**
1. **Vendored** `136013-106.p5` + `136013-107.r5` from `~/roms/milliped.zip` into
   `reference/original-source/millipede/`, and **licence-walled** them with an anchored
   `.gitignore` block (`/reference/original-source/millipede/136013-10{6,7}.{p5,r5}`). CRC-verified
   in place: `106`=`f4468045`, `107`=`68c3437a`, 2048 bytes each — exact MAME match.
2. **Extended the checker** (`check-citations.mjs` + `.d.mts`) with a byte citation
   `{ file, offset, bytes }` (whole bytes 0..255), ported in spirit from pac-man's graphics-ROM
   teeth. Text and byte sources now route separately; the byte path byte-verifies against the
   vendored binary and, crucially, **SKIPS an absent binary under the root** rather than erroring —
   the CI-green invariant TEA flagged. Proven two ways: the unit test `SKIPS a byte citation whose
   binary is ABSENT`, and a full CI-clone simulation (a temp tree with every `.MAC` but no EPROM →
   `checkClaims(loadClaims())` returned 0 errors).
3. **Recorded provenance** in `docs/rom-study/claims/06-graphics.json`: one byte-pinned run per
   EPROM (first 8×8 row-block at offset 0, real bytes) with MAME CRC32 + SHA1 + `centiped.cpp`
   corroboration (cited in prose, never copied — GPL).

**One type-fallout fix:** the `source` union (text | byte) broke `dossier-sweep.ts::claimCovers`,
which reads `source.line`. Narrowed with `'line' in src` — a byte claim pins no prose line, so it
covers no prose citation. (This is what reddened the orchestrator lint-count gate momentarily;
green after the narrow.)

**Naming note (not a spec deviation):** the story context said "claims/graphics.json (pac-man
format)"; I named it `06-graphics.json` to follow millipede's existing numbered-claims convention
(`00-…`..`05-…`). Same format, same `claimsDir` glob — `loadClaims()` picks it up unchanged.

**Scope fence held:** no decode primitive, no palette, no bake — only raw byte pins. The gfx1 load
ORDER (107 first, 106 second) is recorded in the GFX-107 claim prose for ml2-2, but nothing here
assigns planes.

**Verification (evidence, not assertion):**
- `npx vitest run --project millipede` → **144 passed** (the 7 RED now green; the 3 dev-only
  real-byte proofs now RUN against vendored bytes and pass).
- `npm run test:orchestrator` → **478 passed**.
- `npx vitest run` (all projects) → **983 files, 14897 passed, 1 todo, 0 failed**.
- `npm run lint` → **exit 0**. `node scripts/build-app.mjs millipede` → **exit 0**.
- `node tools/audit/check-citations.mjs` CLI → **45 claims verified** against the vendored tree.

Handing to Zorg (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (hand-covered — overlaps [SEC]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (hand-covered — found+fixed stale header, see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [TYPE]) |
| 7 | reviewer-security | Yes | findings | 2 | confirmed 1 (fixed), dismissed 1 (precedent) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (hand-covered — see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 3 (all fixed) |

**All received:** Yes (3 enabled returned — preflight/security/rule_checker; 6 disabled per `workflow.reviewer_subagents`, hand-covered)
**Total findings:** 4 confirmed (all fixed + mutation-verified in `5511bfff`), 1 dismissed (with rationale), 0 deferred

### Rule Compliance

Rules: `.pennyfarthing/gates/lang-review/typescript.md` + `javascript.md` (check-citations.mjs is plain ESM), plus CLAUDE.md's cite-don't-copy / citation-gate / src-core-purity conventions. Enumerated every changed function/type/test/claim:

- **cite-don't-copy (GPL):** the two `06-graphics.json` corroborations paraphrase `centiped.cpp:2226-2227` (filename/offset/CRC32/SHA1) — NOT verbatim `ROM_LOAD()` syntax. No MAME source text anywhere in the diff. COMPLIANT (rule_checker diffed against the real driver).
- **licence-wall:** both EPROM binaries gitignored (anchored) + untracked; the diff commits no full ROM image. COMPLIANT.
- **citation-gate coverage:** both byte claims byte-verify against the vendored EPROM (real-byte proof green) and ride the existing gate. COMPLIANT.
- **src/core purity:** diff touches only `.gitignore`, `docs/`, `tools/audit/`, `tests/audit/` — nothing in `src/core/`. N/A (COMPLIANT).
- **TS #1 (type-safety escapes):** three `as unknown as` casts — VIOLATION (fixed → plain typing, `5511bfff`).
- **TS #15 / JS #8 (token vs claim):** provenance test — VIOLATION, mutation-confirmed vacuous (fixed → structured-corroboration assertion).
- **TS #17 (stale comment):** header schema comment + "not-yet-extended" fixture comment — VIOLATION (both fixed).
- **TS #18 (test apparatus):** byte teeth, gitignore guard, crc32-from-zlib — COMPLIANT (mutation-verified by rule_checker; crc32 not reimplemented).
- **JS #11 (path traversal):** byte path now refuses pathful/`..` citations — COMPLIANT after fix (was the [SEC] finding).
- **JS #6 (command injection):** `execFileSync('git',[...])` uses array args — COMPLIANT.
- All other numbered rules: 0 applicable instances (enum/JSX/numeric-degeneracy/etc.).

### Devil's Advocate

Suppose this code is broken. Where would it bite? The whole deliverable is an audit GATE — its failure mode is not a crash but a FALSE GREEN: reporting a claim "verified" that was never checked. Round 1 found exactly two such holes and both are now closed, but let me keep attacking. First, the licence-wall skip: a byte citation to an absent bare filename skips silently. A malicious or careless contributor could add a claim `{file:"136013-106.p5", offset:0, bytes:[<wrong>]}` and, on a CI clone where the EPROM is walled, it would skip — the wrong bytes never caught in CI. Mitigation: the bytes ARE proven in any dev checkout (the `skipIf(!allRomsPresent)` real-byte block runs there and reddens on drift — mutation-verified), and no release ships without a dev/vendored run. The gate is "dev proves, CI trusts," which is the established pac-man/centipede model, not a new hole. Second, a typo'd bare filename still skips silently even in a dev checkout — but the `records a byte citation pinning each EPROM` test requires an EXACT-filename claim per EPROM, so a typo reddens that test. Third, could a huge `offset`/`bytes` array hang or OOM the checker? `offset + bytes.length > buf.length` short-circuits before any indexing, and JSON parse bounds the array to the file's realistic size; a 2GB bytes array would be rejected by the schema loop first (it iterates once, O(n), no allocation beyond the parse). Fourth, the traversal fix: does `file.includes('/')` miss a Windows `\` separator? On darwin/CI (posix) `/` is the separator and `resolveInTree` already normalises; a `\` in a filename is a literal char, resolves-not-found, and — being a bare-looking name — would skip. That's a theoretical gap on a non-existent Windows runner, noted not blocking. Fifth, the provenance test now keys on the `corroboration` field; could a claim satisfy it with a junk corroboration like `{note:"centiped.cpp f4468045"}` that cites nothing real? Yes — the test proves STRUCTURE + tokens, not that the CRC is CORRECT; but the real-byte proof + the CLI's actual byte re-open are what bind the identity to reality, and the CRC value itself is cross-checked against MAME by rule_checker. The layered gate (structure test + byte teeth + real CRC) is why no single weak assertion is load-bearing. No new blocking issue survives this pass.

## Reviewer Assessment

**Verdict:** APPROVED

Reviewed the ml2-1 diff (`git diff origin/develop...HEAD`, final commit `5511bfff`) with 3 enabled subagents (preflight, security, rule_checker) + hand-coverage of the 6 disabled specialists. Round 1 surfaced 4 real findings (1 High), all fixed and **mutation-verified** in the rework commit; 1 dismissed with rationale. The current tree is green everywhere and the gate's fail-loud guarantees are restored. Observations, tagged by source:

- [SEC] CONFIRMED+FIXED (Med) — byte-citation path silently skipped a traversal/pathful citation (`check-citations.mjs`), regressing the text path's S1 containment (no read escaped, but a `../…` citation was reported clean). Now refuses pathful/absolute/`..` loudly; bare-filename absence stays the licence-wall skip. New tests BT-ESC/BT-DOTDOT, mutation-verified red when the refusal branch is disabled.
- [RULE] CONFIRMED+FIXED (High) — the provenance test (`graphics-rom.test.ts`) was a whole-claim token match: rule_checker deleted `corroboration` and moved the CRC/driver into prose and it stayed green. Now asserts a STRUCTURED `corroboration` field carries the CRC32 + centiped.cpp — I re-ran the identical mutation and it now reddens, restores green.
- [RULE] CONFIRMED+FIXED (Med) — three `as unknown as` double-casts (dead RED scaffolding); dropped to plain typing, `tsc` clean.
- [DOC]/[RULE] CONFIRMED+FIXED (Med) — the top-of-file schema comment claimed source was text-only, and a fixture comment claimed the checker was "not-yet-extended" — both false post-GREEN. Both rewritten to describe the byte source + the skip semantics.
- [SEC] DISMISSED (Low) — committed 16-byte ROM excerpts in `06-graphics.json`. Rationale: this is the story's explicitly-mandated pac-man/centipede byte-equality pattern; precedent exists (`pac-man/docs/rom-study/claims/graphics.json` commits a full 32-byte PROM verbatim); the two full binaries stay walled; a 16/2048-byte identity excerpt is de-minimis fingerprinting (MAME itself publishes the CRCs). Ruled acceptable, not escalated (per the "ROM/precedent wins — rule it, don't ask" convention).
- [PRE] VERIFIED clean — lint 0, millipede 145/145, orchestrator 478/478, full suite 14898 passed/0 failed, CLI 45 claims verified, licence-wall confirmed (both EPROMs gitignored + untracked). Evidence re-run post-rework.
- [EDGE] VERIFIED — byte-compare boundaries: `offset+len == buf.length` reads exactly to EOF; `offset+len > buf.length` errors before indexing; negative offset / >255 / empty bytes rejected by schema. No out-of-bounds read.
- [SILENT] CONFIRMED (folded into [SEC]) — the sole silent fallback (skip-on-absent) is now bounded to bare-filename absence and documented in `.d.mts`; pathful failures are loud.
- [TEST] VERIFIED — every guard mutation-verified non-vacuous (byte drift, EOF overflow, gitignore removal, corroboration strip, traversal-branch disable all redden); the dev-only real-byte block skips explicitly with the reason in the name; no `assert(true)`/`let _ =`.
- [TYPE] VERIFIED — `Claim.source` union (`.d.mts`) is sound; `isByteCitation` runtime-validates the byte arm; `claimCovers` narrows with `'line' in src`; no `as any`.
- [SIMPLE] VERIFIED — byte path mirrors the text path structure; no dead code or over-engineering; the dossier-sweep narrowing is minimal.

No Critical or High issues remain. Story ml2-1 delivers the vendor + byte-equality gate + provenance + licence-wall exactly to the pac-man/centipede model, scope-fenced (no decode/palette/bake), CI-green-safe.

Handing to Ruby Rhod (SM) for finish.