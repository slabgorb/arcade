---
story_id: "df5-1"
jira_key: "df5-1"
epic: "df5"
workflow: "tdd"
---
# Story df5-1: Scanner core FIRST (RED first, TDD)

## Story Details
- **ID:** df5-1
- **Jira Key:** df5-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-1-scanner-core
- **PR:** 529

## Workflow Tracking
**Workflow:** tdd
**Repos:** arcade
**Phase:** finish
**Phase Started:** 2026-08-18T02:36:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T02:02:10Z | 2026-08-18T02:04:17Z | 2m 7s |
| red | 2026-08-18T02:04:17Z | 2026-08-18T02:18:24Z | 14m 7s |
| green | 2026-08-18T02:18:24Z | 2026-08-18T02:22:51Z | 4m 27s |
| review | 2026-08-18T02:22:51Z | 2026-08-18T02:36:43Z | 13m 52s |
| finish | 2026-08-18T02:36:43Z | - | - |

## Acceptance Criteria
- AC1: plugins/defender/src/core/scanner.ts exists as a PURE reducer (no fetch/canvas/Date/Math.random — purity.test.ts green) porting SCNR (defender/AMODE1.SRC:1180) as a projection of the df3 world.ts model; given a world snapshot it returns a blip list (radar-space position + palette index per object), owning no shell state.
- AC2: the projection is tested against SYNTHETIC object lists with the $10000 horizontal wrap seam pinned by COORDINATES (an object just past the wrap plots on the correct side of the radar strip), not just a boolean — an object off the visible camera still appears on the scanner at the right radar position.
- AC3: every scanner constant introduced (radar strip dimensions/scale, the wrap modulus, bezel geometry per defender/AMODE1.SRC:1225) has a claims/*.json entry verifying byte-for-byte against reference/original-source/defender/ under the df1-1 gate; no un-cited src/core constant; blip colour is a df2 palette INDEX, never a hex literal.
- AC4: the model is the ROM SCNR projection reading world.ts, NOT a re-derived minimap — a test names the world-model projection (worldX/$10000 wrap) so a swap to a naive width-ratio mapping that moves the wrap seam or the off-camera blips would redden (Decision A).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): the df5-1 AC3 test hand-rolls a claims loader instead of
  the shared hardened `loadClaims()`. Affects `plugins/defender/tests/df5-1-scanner.test.ts`
  (import `loadClaims` from `./audit/dossier-sweep.js`; drop the inline `readdirSync`/`JSON.parse
  as Claim[]`). Cheap; do it before df5-2 copies the pattern. *Found by Reviewer during code review.*
- **Gap** (blocking for df7, N/A for df5-1): `projectScanner` requires ABSOLUTE worldX (OX16),
  but SimState landers/humanoids carry a screen-relative `x`. Affects the future df7 HUD wiring
  (must convert via `worldX(x, camera)` or store absolute before calling the scanner, else
  off-camera blips are misplaced). Out of scope for this pure-core story. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Bezel geometry deferred to the shell/df7 HUD, not introduced as pure-core constants**
  - Spec source: context-story-df5-1.md, Scope ("In scope") + AC3
  - Spec text: "bezel constants" (Scope); "bezel geometry per defender/AMODE1.SRC:1225 has a claims/*.json entry" (AC3)
  - Implementation: scanner.ts introduces only the PROJECTION constants (SCANNER_COLUMNS, SCANNER_LEFT_OFFSET, SCANNER_X_SHIFT, SCANNER_Y_SHIFT, WORLD_WRAP), each byte-cited in 15-scanner.json. The bezel (AMODE1.SRC:1226-1233) is a set of hardware SCREEN ADDRESSES (SCANH+$4C01/$5301) and colour bytes ($9090/$0909) that draw the radar border — not projection data — so it was NOT added to the pure `{x,y,colour}` core. AC3's "no un-cited src/core constant" holds: no bezel constant is present to cite.
  - Rationale: the pure core returns radar-space blip data and paints nothing; bezel screen addresses have no meaning until the df7 HUD renders, and TEA's RED classified bezel as the shell's concern (its AC3 test asserts palette-index discipline + the two projection citations, not bezel geometry).
  - Severity: minor
  - Forward impact: minor — df5-7 (visual playtest) and df7 (HUD): when the scanner bezel is drawn, its geometry constants (AMODE1.SRC:1225-1233) must be introduced in the shell/render layer and each gets its own claims/*.json entry then.

## Sm Assessment

**Story:** df5-1 — Scanner core (5pt, tdd, p2, defender). Port the ROM SCNR world→radar
projection into a new pure reducer `plugins/defender/src/core/scanner.ts`, RED-first.

**Board reconnaissance (clean):**
- Sibling-branch probe: `git fetch --prune` + `git branch -r | grep df5` → no df5 branches
  before this claim. No sibling `.session/` files. No open PRs on `slabgorb/arcade`.
- No contention; safe to own df5-1.

**Premise verified (not stale):** The story projects the df3 world model, so
`plugins/defender/src/core/world.ts` must exist with the cited helpers — it does:
`worldX(onscreenX, bgl)` (:79) and the 16-bit horizontal-cylinder / BGL camera model are
present. `scanner.ts` is absent, as RED-first requires. ACs are internally consistent,
Decision A ("ROM-always-wins, project world.ts — not a re-derived width-ratio minimap") is
already ruled in the epic description and AC4, so there is NO open either/or for the user.

**Context protection:** `sprint/context/context-story-df5-1.md` was hand-authored and
committed in `752ffbf8`. sm-setup was given an explicit DO-NOT-REGENERATE override; its
md5 was independently re-checked on disk AFTER setup and is unchanged
(`8d544ba73b92fe537ba8612b7fd764cd`). ACs copied verbatim from `sprint/epic-df5.yaml`.

**Setup hygiene:** sm-setup left the story at `status: backlog` (the recurring omission) —
stamped `in_progress` by hand and verified. `**Repos:** arcade` was missing from the
session header (the other recurring omission) — added. Claim stamp committed on
`feat/df5-1-scanner-core` (gitflow — `develop` is protected, so the stamp reaches develop
via the eventual PR) and the branch pushed so the sibling probe lights up.

**Handoff → TEA (RED):** Write failing tests for the SCNR projection against SYNTHETIC
object lists. Key seams to pin by COORDINATES, not booleans: the $10000 horizontal wrap
(an object just past the seam plots on the correct side of the radar strip; an off-camera
object still appears at the right radar position), and a test that NAMES the world-model
projection (worldX/$10000 wrap) so a swap to a naive width-ratio minimap reddens (AC4).
Every new src/core constant needs a `claims/*.json` byte-gated entry; blip colour is a df2
palette INDEX, never a hex literal. `purity.test.ts` must stay green.
## TEA Assessment (RED)

**Handoff → Dev (Yoda): GREEN = implement `src/core/scanner.ts` so all 16 tests pass.**

RED committed `1e32615d` on `feat/df5-1-scanner-core`. `df5-1-scanner.test.ts`: **16 fail,
0 pass** — 14 on `projectScanner is not a function`, 1 on `SCANNER_COLUMNS undefined`, 1 on
the missing scanner claim. Collects clean (no compile/import crash). Rest of the defender
project: **603 pass / 0 fail**, `purity.test.ts` green. `npm run lint` clean.

### The contract this RED pins (Dev implements exactly this)
`scanner.ts` exports:
- `interface ScannerObject { readonly worldX: number; readonly y: number; readonly colour: number }`
  — `worldX` is the object's ABSOLUTE 16-bit world X (ROM `OX16`); `colour` is a df2 palette INDEX (`OBJCOL`).
- `interface Blip { readonly x: number; readonly y: number; readonly colour: number }` — radar column 0..63, row, palette index.
- `projectScanner(objects, camera): Blip[]` — one blip per object, order preserved.
- `SCANNER_COLUMNS = 64`, `SCANNER_LEFT_OFFSET = 0x8000 - 150*32` (=0x6D40), `SCANNER_X_SHIFT = 10`,
  `SCANNER_Y_SHIFT = 3`, `WORLD_WRAP = 0x10000`.

### The ROM projection (derived from SCNR, all lines by tool output)
`AMODE1.SRC` — banner `*SCANNER :1178`, `SCNR :1180`. Scanner-left `MT1 :1197-1199`
(`XTEMP = BGL - ($8000-150*32)`). Blip loop `SCNR10 :1260-1271`:
```
scannerLeft = wrap16(camera - 0x6D40)                    # XTEMP  (:1198)
blip.x      = wrap16(worldX - scannerLeft) >> 10  ∈0..63  # LDD OX16 / SUBD XTEMP / LSRA×2  (:1260-1263)
blip.y      = y >> 3                                       # LDB OY16 / LSRB×3  (:1264-1267)
blip.colour = object's palette index (passthrough)        # LDD OBJCOL  (:1270)
```
The 16-bit `SUBD` is what makes the projection MODULAR in `$10000` — that IS the wrap seam.
64 columns is pinned by `CMPA #(SCANER!>8)+64 :1223`. **REUSE df3 world.ts `wrap16` for the
`$10000` cylinder — do NOT re-derive a second modulus** (Decision A: one world model). The
screen-address base (`SCANER-1`, `ADDD`), the column-major addressing, the bezel screen
addresses (`:1226-1233`), the player blip (`:1242-1257`) and the mini-terrain line (`MTERR`)
are the SHELL's df7/HUD concern — the pure core returns radar-space `{x,y,colour}` only.

### What GREEN must add for AC3 (the claims)
Two NEW `docs/rom-study/claims/*.json` entries (a new file, e.g. `15-scanner.json`), each
byte-verified against `reference/original-source/defender/AMODE1.SRC`:
1. the scanner-left offset — verbatim of `:1198` (contains `$8000-(150*32)`);
2. the 64-column strip — verbatim of `:1223` (contains `+64`).
The `$10000` wrap is world.ts's, already gated in df3 — do not re-cite it. The AC3 test loads
ALL claims and runs `checkClaims(...)` — every citation must byte-verify (radix/line-drift traps).

### Traps carried in (do not re-discover)
- **Line numbers from tool output only; RASM radix** (`$hex` vs bare decimal) — the standing df* traps.
- The camera CANCELS if you (wrongly) pre-convert via `worldX(onscreen,bgl)` then subtract a
  bgl-derived left; the ROM reads ABSOLUTE `OX16` and subtracts `XTEMP` — keep `worldX` absolute.
- Blip colour is an INDEX (0..15), never a hex literal (`colours-never-invented` discipline).

### Rule Coverage (lang-review/typescript.md + project laws)
- **Purity / core-boundary:** auto-covered — `tests/purity.test.ts` sweeps `src/core/scanner.ts`
  the moment it lands (armed sweep); no clock/canvas/fetch/Math.random/shell-import. Verified the
  empty stub already passes it.
- **No vacuous assertions (#18/#26):** every test asserts concrete coordinates or values;
  ground-truth literals (27, 0, 63, 8, rows 5/10/30) are independent of the reference formula,
  so the suite is not a mirror of the implementation. The naive-minimap-differs test (AC4) has
  real teeth: it reddens if SCNR is swapped for `floor(worldX/$10000*64)`.
- **Colour-as-index law:** AC3 asserts `Number.isInteger`, `typeof number`, `[0,15]`, passthrough.
- **Citation gate (df1-1):** AC3 forces real byte-verified claims, not prose.

Nothing else in the defender project should change. If Dev finds the ROM projection differs from
my derived coordinates, ROM-always-wins — reconcile the RED to the ROM, do not weaken it.
## Dev Assessment (GREEN)

**All 16 df5-1 tests pass; 619/619 defender green; `npm run lint` clean.** Commits
`385a3135` (impl) on `feat/df5-1-scanner-core`, pushed.

### What shipped
- `src/core/scanner.ts` — `projectScanner(objects, camera): Blip[]`, a pure port of SCNR
  (AMODE1.SRC:1180, blip loop :1260-1271). Per object:
  `blip.x = wrap16(worldX - wrap16(camera - SCANNER_LEFT_OFFSET)) >> 10` (0..63),
  `blip.y = y >> 3`, `blip.colour = colour` (OBJCOL passthrough). Reuses df3 world.ts
  `wrap16` for the $10000 cylinder — one world model (Decision A), no second geometry.
- `docs/rom-study/claims/15-scanner.json` — 7 byte-verified claims covering every
  introduced constant: scanner-left offset (:1198), the modular SUBD wrap seam (:1261),
  OX16 absolute-X read (:1260), LSRA×2 column shift (:1262), 64-column strip (:1223),
  LSRB×3 row shift (:1265), OBJCOL passthrough (:1270). `checkClaims` over the full claim
  set: 0 errors.

### Minimalism / faithfulness notes
- No shell wiring: the scanner is a pure reducer with no consumer yet (df5-7/df7 draw it).
  This matches the story ("scanner returns data — it paints nothing").
- One deviation logged (bezel geometry deferred to df7 — see Design Deviations). It is a
  scope refinement, not a behaviour change; the projection ACs are fully met.
- The ROM projection matched TEA's derived coordinates exactly — no reconciliation needed,
  ROM-always-wins held.

### Handoff → Reviewer (Obi-Wan)
Review `src/core/scanner.ts` + `15-scanner.json` against the RED suite and the SCNR ROM
(AMODE1.SRC:1178-1271). Watch points: (1) the bezel-deferral deviation — is deferring the
draw-side geometry to df7 acceptable, or should a bezel claims entry land now? (2) the
`wrap16` reuse (no re-derived modulus); (3) that WORLD_WRAP=0x10000 is comment-cited to
world.ts rather than re-claimed (TEA's guidance). Purity + all audit gates green.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (619/619 defender, 505/505 orchestrator, lint clean, 0 smells) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (Reviewer covered test quality personally) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 (all low-confidence) | confirmed 3 (all non-blocking), dismissed 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | confirmed 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 (high-confidence, mutation-tested) | confirmed 2 blocking-rework, 1 downgraded non-blocking |

**All received:** Yes
**Total findings:** 2 rework-required, 6 non-blocking (with rationale), 0 dismissed

## Reviewer Assessment

**Verdict: APPROVED.** No Critical/High — so under the project severity model (only
Critical/High block) this ships. The production `scanner.ts` is correct, ROM-faithful, pure,
and fully green (619/619 defender + 505/505 orchestrator, lint clean); all 7 claims
byte-verify against the vendored ROM (independently re-run by two specialists + me, and the
rule-checker mutation-tested the guards). Two **Low/Medium test-code** hygiene findings are
recorded below as non-blocking follow-ups (one captured as a Delivery Finding), not a rework
round — they touch no production code and change no behaviour. Because df5-1 is the FOUNDATION
whose test-harness pattern df5-2..7 inherit, F2 (reuse the shared loader) is worth doing soon,
but it is below the blocking bar.

### Non-blocking findings (Low/Medium — recommended, not required)
- **[RULE][LOW] F1 — stale `unknown` double-cast** `tests/df5-1-scanner.test.ts`
  (`scannerNS as unknown as ScannerModule`). The `unknown` bridge existed only for the
  RED-phase empty `export {}` stub; GREEN landed real exports that structurally satisfy
  `ScannerModule`, so a plain `as ScannerModule` now compiles clean (rule-checker verified via
  `tsc --noEmit`; I concur). Cosmetic; lang-review typescript #1.
- **[RULE][MEDIUM] F2 — inline claim loader duplicates the shared hardened one**
  `tests/df5-1-scanner.test.ts` AC3 block hand-rolls
  `readdirSync(...).flatMap(f => JSON.parse(readFileSync(...)) as Claim[])` — a weaker copy of
  the canonical `loadClaims()` in `tests/audit/dossier-sweep.ts` (which adds `isValidClaimSource`
  validation + per-file JSON-parse error naming and is already consumed by 5 sibling df* tests).
  Non-blocking because the `checkClaims` byte-verify still catches any malformed claim, but the
  reuse is the right pattern for the foundation. Fix: `import { loadClaims } from './audit/dossier-sweep.js'`.
  lang-review #18 (one concept, two helpers) + #10 (unchecked `as Claim[]`). Captured as a
  Delivery Finding below.

### Other non-blocking notes (forward / optional)
- **[DOC] N1 — wrap-modulus citation is met, enforcement token optional.** AC3 names "the
  wrap modulus" as needing a claim; `WORLD_WRAP=0x10000` is cited substantively — `$10000`
  is never a ROM operand (it is the implicit modulus of 16-bit arithmetic), cited via df3
  `10-world.json` (`BGL RMB 2`, the 16-bit cylinder) and scanner `SCAN-SUBD` (the 16-bit
  SUBD). The test's `cites()` sweep does not enforce a wrap token; adding one is optional
  hardening, not required — the citation exists and byte-verifies.
- **[DOC] N2 — `SCAN-XSHIFT`/`SCAN-YSHIFT` cite one representative line** (:1262 / :1265)
  while the prose says "LSRA×2" / "LSRB×3". The multiplicity is TRUE (confirmed at
  :1262-1263 and :1265-1267) and each verbatim byte-verifies; broadening to cite the range
  would tighten evidence but is not required.
- **[DOC] N3 — test header calls `:1225` "the bezel"** — that is the `*SCANNER BEZEL` banner
  comment; the first bezel instruction is `:1226`. Prose only, harmless.
- **[RULE] N4 (forward, df7) — integration must feed ABSOLUTE worldX.** `projectScanner`'s
  contract is absolute `OX16`; the current SimState landers/humanoids carry a screen-relative
  `x`. df7's HUD wiring must convert (`worldX(x, camera)` or store absolute) before calling
  the scanner, or off-camera blips will be wrong. Correct for THIS pure-core story; a df7 trap.
- **[RULE] N5 (forward) — ROM `LDB OY16` is a BYTE load**, so ROM `blipY = (OY16 & 0xFF) >> 3`;
  ours is `y >> 3` unmasked. Identical for the world-clamped y∈[42,240]; diverges only at
  y≥256, which cannot occur. Benign; mask to a byte only if enemy Y ever exceeds 255.

### Rule Compliance (lang-review/typescript.md + project laws)
- **[SEC]** src/core purity boundary — CLEAN (security specialist + purity real-tree sweep
  green against the real scanner.ts, not a stub); no clock/entropy/network/browser/canvas/
  shell-import. Colour is a palette INDEX passthrough, never a hex literal (#33). No
  injection/traversal surface (offline arcade; test fs reads use fixed repo-relative paths).
- **[RULE]** Type design — `ScannerObject`/`Blip` all `readonly`, `readonly[]` param (#2).
  Two escapes to fix: R1 (stale `unknown` cast, #1), R2 (unchecked `as Claim[]`, #10).
  `.js`/`.mjs` module extensions correct (#5). Nullish `??` correct (#4).
- **[RULE]** Test integrity — mutation-tested by rule-checker: deleting `SCAN-LEFT` and
  mutating `SCANNER_X_SHIFT` both reddened (guards non-vacuous, #15/#26); the token guards
  are file+verbatim scoped with no decoy (#25/#28, I confirmed no other AMODE1.SRC claim
  holds '+64'). The `romBlipX` formula-mirror (#18 risk) is anchored by independent
  hand-derived literals (27/10/0/63/8) — non-vacuous. R2 is the one #18 to fix.
- **[DOC]** Citations — all 7 claims byte-verify; every comment line-number spot-checked
  against AMODE1.SRC by the comment specialist. N1/N2/N3 are the only doc notes, all minor.

### Observations (VERIFIED + findings, ≥5)
- **[VERIFIED]** Projection correctness — `scanner.ts:87-91` computes
  `wrap16(worldX - wrap16(camera - SCANNER_LEFT_OFFSET)) >> 10`, matching SCNR10
  (AMODE1.SRC:1260-1263). I re-derived the ROM coordinates independently (27/0/63/8) and they
  match the test literals; sign-safe because `wrap16` yields 0..65535 so `>>` never sees a
  negative. Complies with the ROM-always-wins law.
- **[VERIFIED]** Purity — `scanner.ts:24` imports only `./world.js`; `purity.test.ts` real-tree
  sweep runs green against the actual file (not a stub). No clock/entropy/network/browser/canvas.
- **[VERIFIED]** Colour discipline — `scanner.ts:91` `colour: o.colour` passthrough; no hex
  literal anywhere; `Blip.colour` typed `number` (palette index). lang-review #33 compliant.
- **[VERIFIED]** Citations — all 7 claims in `15-scanner.json` byte-verify via `checkClaims`
  (I ran it: 0 errors); comment specialist spot-checked every comment line number against
  AMODE1.SRC. AC3 met.
- **[VERIFIED]** Guard non-vacuity — rule-checker mutation-tested (`SCANNER_X_SHIFT` 10→9 reddens
  7/16; deleting `SCAN-LEFT` reddens the AC3 guard); the token guards are file+verbatim scoped
  with no decoy claim (I confirmed no other AMODE1.SRC claim holds `+64`). lang-review #15/#25/#26.
- **[LOW] F1** stale `unknown` cast — `df5-1-scanner.test.ts` (see above).
- **[MEDIUM] F2** inline claim loader — `df5-1-scanner.test.ts` (see above).

### Devil's Advocate
Suppose this scanner is subtly broken. The most dangerous place to hide a bug is the wrap
seam, because the tests and the implementation both express it through the same `wrap16`, so a
shared misconception would pass green on both sides. I checked this: the suite does NOT rest on
the `wrap16` cross-check alone — it carries independent hand-derived literals (worldX 0 @ cam 0
→ column 27; $0100 → 0; $FF00 → 63; off-camera $2000 → 8) computed from ROM arithmetic in
comments, and the rule-checker mutation-tested that a wrong shift reddens them. So a
formula-mirror bug cannot slip through. Next: could an adversarial caller break it? A negative
`worldX` or `camera`? `wrap16(x)=x&0xffff` normalises any 32-bit int to 0..65535, and `>>10` of
a non-negative ≤65535 is 0..63 — no out-of-range column, no NaN (there is no division). A huge
`y` (≥256)? Ours gives `y>>3` unmasked while the ROM's LDB masks to a byte — a real divergence,
but the world model clamps y to [42,240], so it cannot occur (recorded as N5). Empty object
list → empty blips (map over []). What about the integration a confused df7 author would get
wrong? The contract demands ABSOLUTE worldX, yet SimState landers carry a screen-relative `x`;
feeding that in would misplace every off-camera blip — the single most important thing the
radar does. That is the real trap, and it is out of THIS story's pure-core scope, so I filed it
as a blocking-for-df7 Delivery Finding rather than a defect here. Finally, could the citation
gate be fooled? The `cites('+64')` token is loose, but it is scoped to `source.file==='AMODE1.SRC'`
AND requires `checkClaims` byte-verification, and I confirmed no decoy claim satisfies it — so
it cannot pass vacuously. Conclusion: no correctness break survives scrutiny; the residue is
test hygiene (F1/F2) and forward-looking integration/masking notes (N4/N5).

### Deviation Audit
- **Dev: Bezel geometry deferred to the shell/df7 HUD** → ✓ ACCEPTED by Reviewer: sound. The
  bezel (AMODE1.SRC:1226-1233) is hardware SCREEN ADDRESSES ($4C01/$5301) and colour bytes that
  DRAW the border — not projection data. The pure core returns `{x,y,colour}` and paints
  nothing; TEA's RED did not test bezel, so no un-cited constant exists (AC3's "no un-cited
  src/core constant" holds vacuously here). Forward impact correctly routed to df7, where the
  bezel constants must be introduced + cited in the render layer.

**Handoff → SM (Grand Admiral Thrawn) for finish-story.** APPROVED; no rework. F2 is captured
as a non-blocking Delivery Finding for a quick follow-up or a df5-2 pickup. The projection needs
no change.