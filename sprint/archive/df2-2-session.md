---
story_id: df2-2
jira_key: df2-2
epic: df2
workflow: tdd
---
# Story df2-2: Palette: the 16-entry CRAM/PCRAM model + the 3-3-2 decode decision

## Story Details
- **ID:** df2-2
- **Jira Key:** df2-2
- **Workflow:** tdd
- **Repos:** .
- **Branch:** feat/df2-2-palette-cram-pcram-decode
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T23:18:36Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T22:06:05.858836Z | 2026-08-14T22:08:54Z | 2m 48s |
| red | 2026-08-14T22:08:54Z | 2026-08-14T22:27:50Z | 18m 56s |
| green | 2026-08-14T22:27:50Z | 2026-08-14T22:45:50Z | 18m |
| review | 2026-08-14T22:45:50Z | 2026-08-14T22:59:41Z | 13m 51s |
| finish (mis-advanced) | 2026-08-14T22:59:41Z | 2026-08-14T23:02:19Z | 2m 38s |
| green | 2026-08-14T23:02:19Z | 2026-08-14T23:09:38Z | 7m 19s |
| review | 2026-08-14T23:09:38Z | 2026-08-14T23:18:36Z | 8m 58s |
| finish | 2026-08-14T23:18:36Z | - | - |

## SM Assessment

**Story:** df2-2 — Defender palette: the 16-entry CRAM/PCRAM model + the 3-3-2 decode decision. 3pt, p2, tdd (phased). No deps.

**Board on arrival:** Clean. No `origin` branch for df2-2 (unclaimed); the only sibling session across checkouts was a-1's ml7-9 (unrelated, millipede). The merge gate was momentarily blocked by ml7-9's open PR #395 (stamped backlog locally); the user merged it and I pulled develop (4 commits, ml7-8/ml7-9 archived) — gate now clean, zero open PRs. Claim pushed on the feature branch (gitflow — `develop` is protected, so the claim rides the branch, not a direct develop push).

**Falsifiable anchors — measured, not assumed:** The description quotes source line cites and a format premise, so I verified them against the current tree before letting sm-setup copy them forward:
- `reference/original-source/defender/PHR6.SRC` is real: CRAM at line 13 (`EQU $C000`), PCRAM at line 219 (`RMB 16`). Cites are accurate; TEA still pins them precisely.
- df1-4 (epic df1) is the MAME SHA-pin story; the byte-format source (`williams.cpp` palette init) lives in its pinned dump. Anchor real.
- joust genuinely decodes 3-3-2 BBGGGRRR today (`plugins/joust/src/shell/render.ts:50` `paletteToRgba`, `plugins/joust/src/core/pictures.ts:89`), and it is NOT yet in `@shared`.

**The fork is research, not a user ruling.** The "extract to `@shared` vs keep local" branch is decided by a measurable fact — does defender's MAME byte format match 3-3-2 BBGGGRRR? — read from the df1-4 pinned object. That is source-resolvable, so I did NOT put it to the user as an either/or. Evidence points strongly to the EXTRACT branch (joust already decodes 3-3-2; same Williams video family). TEA must confirm defender's byte format against the df1-4 dump before locking AC5/AC6. Encoded as a conditional in the ACs.

**Guardrail flagged:** colours-are-never-invented (df2-1 regressed it). Palette entries transcribed from source; any ground/letterbox fill resolves through the palette index, never a hex literal. `paletteToRgba` lives in shell, not core — the purity gate scans `plugins/defender/src/core/`.

**Routing:** phased tdd → handoff to TEA (Han Solo) for the RED phase. Session, context (with SM-verified anchor block), and branch all created; status stamped `in_progress`; `**Repos:**`/`**Branch:**` fields backfilled (sm-setup omitted them).

## TEA Assessment

RED phase complete. Failing tests written, committed (`fea04747`), pushed. Handoff to Dev (Yoda) for GREEN.

**The architectural decision is RESOLVED — EXTRACT.** The fork ("extract `paletteToRgba` to `@shared` vs keep local") turns on whether Defender's CRAM byte format is the 3-3-2 BBGGGRRR joust already decodes. The df1 dossier settles it: Defender is the `williams.cpp` `defender` parent set on the **same Williams 6809 video board** as joust (CRC-for-CRC match, board-facts.md), decoded through MAME's one williams palette path. So the format matches → the CLAUDE.md "extract on the second game" bar is met and the tests target the EXTRACT branch. This is a hardware fact from the dossier, not a guess — but Dev must still **confirm the exact `williams.cpp` palette-init line against the df1-4 pinned MAME clone and record the format decision in `board-facts.md`** (AC4), because that prose citation is the deliverable, not my inference.

**What GREEN must build (the contract the RED tests pin):**
1. `src/shared/palette-decoder.ts` — MOVE joust's `paletteToRgba` here **verbatim** (the BBGGGRRR maths: `r=byte&7`, `g=byte>>3&7`, `b=byte>>6&3`, each widened to 8 bits, `a=255`), replacing the `export {}` stub.
2. Re-point **joust** to import+re-export `paletteToRgba` (and it already exports `rgbaPalette`/`Rgba`) from `@shared/palette-decoder`. **Joust must keep exporting `paletteToRgba` and `rgbaPalette`** — joust's own `render.test.ts:141,150` and six other joust suites consume them; re-export keeps joust green (that IS the "joust unchanged" guarantee). The re-point is verified by reference identity (`joust.paletteToRgba === shared.paletteToRgba`), so a wrapper/copy fails — re-export the symbol.
3. `plugins/defender/src/core/palette.ts` — replace the `export {}` stub with `DEFAULT_PCRAM` (16 default colour-RAM bytes **transcribed from the vendored source under the df1-1 citation gate** — each byte needs a `claims/*.json` entry, byte-verified; the citation gate owns byte-accuracy, my tests only pin shape) and a pure `resolveCram(pcram)` modelling the per-frame PCRAM→CRAM copy.
4. `plugins/defender/src/shell/render.ts` — swap the grey-ramp `indexToRgba` for `paletteToRgba(resolveCram(DEFAULT_PCRAM)[index])`, importing from `@shared/palette-decoder`. df2-1's render suite (which pins *properties*, not the grey values) stays green.

**Where are the default 16 bytes?** Not yet pinned by me (that's Dev's gated transcription). The likely source anchor is the colour-RAM init at `defender/DEFA7.SRC:1056` ("*INITIALIZE COLOR RAM"); there are several colour tables in the tree (BLK71 `PCRAM $A026`, DEFB6 `*COLOR RAM TABLE`) — Dev picks the boot default that populates the PHR6 `PCRAM` ($A0xx RMB 16) shadow, and cites via `grep -n` line output (guardrail #4).

## Rule Coverage (lang-review/typescript.md)

Tests were designed to enforce project rules, not just ACs:

- **#18 / #26 (fixtures/assertions that are identities dressed as checks):** the shared decoder is asserted against **hand-computed** byte→RGBA values (0x00→black, 0xFF→white, 0x07/0x38/0xC0 single-field saturation, 0x01/0x08/0x40 to pin the *widening* not just 0/255, 0xAA mixed so a field-order/mask bug can't pass by symmetry) — none derived from the decoder under test. `resolveCram` is exercised with **crafted** 16-byte inputs (not `DEFAULT_PCRAM`), so the copy semantics can't pass by hardcoding the transcription. The seam-swap assertion's terms all come from code under test (defender `indexToRgba`, defender palette+resolver, `@shared` decoder) — the df2-1 grey ramp cannot satisfy it.
- **#25 (source-text guard scope):** the AC4 `board-facts.md` doc check bounds its window — it finds `bbgggrrr` then requires `williams.cpp` **within ±600 chars**, so an incidental token elsewhere in the file can't satisfy it.
- **#21 (degenerate numeric input) & colours-never-invented hex scan:** already owned by df2-1's `render.test.ts` (0×0-canvas scale-1 clamp, comment-stripped hex-literal denylist) and stay green through the `indexToRgba` swap — not re-duplicated (AC7/AC8 covered by the existing suite; my job was not to regress them, verified).
- **RED-seam-for-new-module convention:** `export {}` stubs seeded for both new modules so `tsc --noEmit` resolves the specifiers (lint green) while runtime loaders red on the empty exports — the honest RED-in-a-typechecked-language state.

## RED Evidence

- Command: `npx vitest run` + `npm run lint` (verified twice directly + by `testing-runner`, RUN_ID `df2-2-tea-red`).
- **11 tests fail** — 4 in `src/shared/tests/palette-decoder.test.ts`, 7 in `plugins/defender/tests/palette.test.ts` — **and no others**. ~841 pass (the +1 vs the pre-RED baseline is purity.test.ts scanning the new clean `core/palette.ts` stub). Every failure is a "not built yet"/missing-export/missing-doc message, not an authoring error.
- `npm run lint`: **green (exit 0)**.

## Dev Assessment

GREEN complete. All 11 df2-2 tests pass; full cabinet green; committed (`a5167304`), pushed. Handoff to Reviewer (Obi-Wan).

**The decision landed on EXTRACT — confirmed from primary + secondary source, not inferred.** MAME's williams driver states the format outright: `williams.cpp:66` — "c000-C00F color_registers (16 bytes of BBGGGRRR)" — with `palette_init` registered at `williams.cpp:1559`, both read at the df1-4 pin (`aaac1f637a8…`). That is the same BBGGGRRR Joust decodes, so the "extract on the second game" bar is met. Cross-checked independently: decoding the ROM's own CRTAB bytes through BBGGGRRR reproduces its per-entry colour labels exactly ($07→RED, $28→GREEN, $2F→YELLOW, $81→BLUE, $C7→PURPLE, $FF→WHITE) — the format is read right.

**What shipped:**
1. `src/shared/palette-decoder.ts` — `paletteToRgba` + `Rgba` moved from joust VERBATIM (byte masks and widening unchanged).
2. `plugins/joust/src/shell/render.ts` — imports + re-exports `paletteToRgba`/`Rgba` from `@shared`; joust's `rgbaPalette` uses the imported binding. Joust's own suite (render.test.ts consumes both) stays green; reference identity holds (defender's AC5 test asserts `joust.paletteToRgba === shared` — a copy would fail it).
3. `plugins/defender/src/core/palette.ts` — `DEFAULT_PCRAM` = the 16 CRTAB bytes (`defender/DEFB6.SRC:1876`); `resolveCram` = pure per-index copy modelling the frame IRQ's PCRAM→CRAM copy. No colour in core (purity gate green).
4. `plugins/defender/src/shell/render.ts` — `indexToRgba(i)` now `paletteToRgba(CRAM[i & 0x0f])`, `CRAM = resolveCram(DEFAULT_PCRAM)`. The single blit-path point df2-2 replaces; ground fill (BACKGROUND_INDEX 0) resolves through it → still black, so df2-1's cleared-frame/hex-scan guards stay green.
5. `docs/rom-study/board-facts.md` — palette-format prose (AC4): BBGGGRRR, MAME pointers in prose (never backticked), the extract decision, the CRTAB cross-check. Placed OUTSIDE the 8-fact census table, so the df1-4 row-exact census is untouched (still 8, verified).
6. `docs/rom-study/claims/09-palette.json` — 16 CRTAB entries + the CRINIT boot copy, each byte-verified against the vendored source by `citations.test.ts` (runs on CI — the tree is tracked). Covers the `defender/DEFB6.SRC:1876` anchor cited in board-facts.md.

**One deviation (logged):** df2-1's "varies by index" witness `(0,15)` → `(2,3)`, because the real palette makes SPACE (0) and TIE3 (15) both `$00`. Intent preserved; minor; no forward impact. **Reviewer: this is the one test edit outside the RED set — please scrutinise that the intent is genuinely preserved and I did not weaken the guard.**

**Gate/rule coverage:** citation gate green (17 new claims byte-verified); board-facts 8-fact census intact; core purity green (palette bytes are data, decode is shell); colours-never-invented — every colour reached by index through the transcribed palette, render.ts hex-scan clean; `tsc --noEmit` green.

**GREEN evidence:** `npx vitest run` → 16350 pass / 5 skipped / 1 todo / **0 fail** (1078 files); `npm run test:orchestrator` → 498/498; `npm run lint` → exit 0.

## Subagent Results

_Round 2 (re-review of the rework commit `78b70f21`). Round 1's table — which drove the REJECT — is preserved below this one for history._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | N/A — disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (new: 3rd stale joust anchor, context-doc:66 [LOW]) | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — disabled via settings |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none (both round-1 fixes survive mutation) | confirmed 0, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 confirmed (1 Low), 0 dismissed, 0 deferred. The [HIGH] AC4-guard vacuity is INDEPENDENTLY mutation-confirmed FIXED by rule-checker (deleting the palette-section `williams.cpp` cites reds the test; the facts-table rows above the heading no longer leak in). Both Mediums verified fixed (render.ts header accurate; DEFA7 `1968-1980` re-read against the ROM source by both comment-analyzer and me). Both Lows fixed. The one new Low is a third occurrence of the round-1 stale-anchor class in an SM setup-time snapshot — non-blocking, captured as a Delivery Finding.

### Round 1 (original review — REJECTED) — historical

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 (DEFA7 range over-claim; context-doc .ts:line) | confirmed 2, dismissed 0, deferred 0 |
| 7 | reviewer-security | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 |
| 9 | reviewer-rule-checker | Yes | findings | 3 (vacuous AC4 guard [HIGH]; stale header; redundant loop) | confirmed 3, dismissed 0, deferred 0 |

(Round 1 disabled: edge-hunter, silent-failure-hunter, test-analyzer, type-design, simplifier.)

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

The palette decode, extraction, transcription and seam-swap are functionally correct and faithful — the code half is clean (security clean, preflight green, byte-verified citations, core/shell purity, colours-never-invented all upheld). But this is a ROM-fidelity project whose defining value is *verifiable citations and guards that actually guard*, and the review found one **vacuous test** (a guard that cannot fail for the defect it names) plus two citation/comment-accuracy defects in newly-shipped artifacts. A High blocks. Since the same session authored test+code, I leaned entirely on the adversarial subagents; the rule-checker mutation-tested the vacuous guard directly, and I re-confirmed it by measurement.

**Observations:**

1. `[HIGH][RULE]` **AC4 board-facts guard is vacuous** at `plugins/defender/tests/palette.test.ts:180-197`. `lower.indexOf('bbgggrrr')` anchors on the section **heading**, and the ±600-char window leaks into the preceding Decoder-PROM/WDOG facts-table rows whose `williams.cpp` mentions (measured offsets −191, −506, −569) satisfy `.toContain('williams.cpp')` — so the *real* palette citation (`williams.cpp:66`/`:1559`, offsets +409/+481) is never actually required. Mutation-confirmed twice: rule-checker deleted the real sentence → test stayed green; I measured the offsets independently. This is exactly lang-review #25/#15 (a whole-file positive scan anchored to a token, not the claim). The guard gives false assurance that AC4 is enforced.

2. `[MEDIUM][RULE][DOC]` **Stale module header** at `plugins/defender/src/shell/render.ts:11-15`. Still asserts the palette "is a TEMPORARY placeholder **until** df2-2 transcribes the real 16-entry CRAM/PCRAM palette … df2-2 replaces THIS ONE function" — false in the very commit that performed the transcription. The `indexToRgba` docstring (42-48) was correctly rewritten; the header two lines above the imports was not (lang-review #17/#24). Found independently by me and by rule-checker (R-2).

3. `[MEDIUM][DOC]` **Over-broad ROM citation** `defender/DEFA7.SRC:1968-1994` for the PCRAM→CRAM copy. Source (verified): the `*COLOR MAPPING` copy block is `DEFA7.SRC:1968-1980`; line 1981 is `I01 JSR CSCAN` and 1981-1994 is coin-switch/MAPC/OPROC/VELO IRQ housekeeping — ~14 unrelated lines. Present in df2-2 code at `core/palette.ts:6,32` and `tests/palette.test.ts:10,70`, and in `sprint/context/context-story-df2-2.md:13,49`. **Root is inherited** — the same range is carried in `sprint/epic-df2.yaml`, `context-epic-df2.md:91`, and the df2 design specs (df1 dossier origin) — so df2-2 propagated it rather than coined it. comment-analyzer + my source read.

4. `[LOW][RULE]` **Redundant no-regression loop** at `plugins/defender/tests/palette.test.ts:169-175`. It sits below `expect(joustDecode).toBe(sharedDecode)` (line 166); once reference identity holds, the 256-byte loop compares one function object to itself and cannot fail in any state the identity check does not already catch (purity is pinned separately in the shared decoder suite). Adds no detection (lang-review #26). rule-checker R-3.

5. `[LOW][DOC]` **Context-doc TS line citations** at `sprint/context/context-story-df2-2.md:22` (`plugins/joust/src/shell/render.ts:50`, `pictures.ts:89`). The `render.ts:50` anchor is now stale — this diff moved `paletteToRgba` out of joust's render.ts to `@shared`. comment-analyzer.

6. `[VERIFIED]` **Extraction is a verbatim move, not a copy** — `src/shared/palette-decoder.ts` `paletteToRgba` is byte-identical to joust's removed implementation; joust re-exports it (`render.ts:35-36`) and reference identity holds (`defender/tests/palette.test.ts:166` `.toBe`). No divergent copy remains (preflight + rule-checker). Complies with CLAUDE.md "extract into src/shared only once a second game proves the duplication is real".

7. `[VERIFIED][SEC]` **`indexToRgba(index & 0x0f)` is total** — `render.ts:49-51`: `&` coerces any number (negative/NaN/Infinity/float) to an int in 0..15; `CRAM` is fixed at 16 entries, so no `undefined` reaches `paletteToRgba`, whose `RangeError` guard is intact as defense-in-depth. security agent clean.

8. `[VERIFIED]` **Transcription is byte-accurate** — `DEFAULT_PCRAM` (`core/palette.ts:24-25`) + `claims/09-palette.json` PAL-0..15/INIT byte-verified against `DEFB6.SRC:1876-1891` and `DEFA7.SRC:1057` by `citations.test.ts` (green on CI, tree tracked). GPL discipline upheld (no backticked `.cpp:N`).

### Rule Compliance (lang-review/typescript.md + project rules)

- **#15 / #25 (source-text guard scope/anchor):** VIOLATION — AC4 guard (Obs 1). The one enforced-doc check does not anchor to its claim.
- **#17 / #24 (stale comment / retirement not applied everywhere):** VIOLATION — stale header (Obs 2); the DEFA7 over-claim is a citation not re-measured from tool output for its actual extent (guardrail #4 spirit).
- **#26 (assertion redundant with a sibling):** VIOLATION — the 256-byte loop (Obs 4).
- **#18 / #26 (fixtures/assertions that are identities):** COMPLIANT — `KNOWN` table hand-computed and independently recomputed by rule-checker; `resolveCram` uses crafted arrays A/B, not `DEFAULT_PCRAM`; the seam-swap test wires real pieces and mutation-reddens.
- **#24 (retirement witness):** COMPLIANT — the `(0,15)→(2,3)` change is intent-preserving and mutation-tested (SPACE/TIE3 both `$00` under the real palette; old pair would be a false-red).
- **#4 / #21 (nullish / degenerate numeric):** COMPLIANT — `index & 0x0f` clamp is total.
- **#5 (module/type-only exports):** COMPLIANT — `export { paletteToRgba }` / `export type { Rgba }` correctly split in both render.ts files.
- **#1–#12 (type-safety, generics, async, error handling):** COMPLIANT — no `as any`/`as unknown as`/`@ts-ignore`/non-null assertions/`Record<string,any>` in the 7 changed `.ts` files.
- **Project: core/shell purity** — COMPLIANT (`core/palette.ts` pure data+resolver, purity.test.ts sweeps it). **colours-never-invented** — COMPLIANT (index-reached colour, render.ts hex-scan clean). **Citation gate** — COMPLIANT (byte-verified). **MAME prose-only/GPL** — COMPLIANT.

### Devil's Advocate

Argue it is broken: the AC4 guard is the crack that matters. The whole point of this project is that a fidelity claim is *mechanically checkable*; the citation gate exists because "a truncated extent manufactures corroboration." df2-2 reintroduces that exact failure one level up — a hand-rolled doc check that greens whether or not the palette section actually cites MAME, because `williams.cpp` is dense elsewhere in the file. A future editor could delete `williams.cpp:66`/`:1559` from the palette section entirely and every gate stays green; AC4's "the format is documented" silently rots. The over-broad `DEFA7.SRC:1968-1994` compounds the trust problem: an auditor opens the cited range for the "per-frame copy," finds `JSR CSCAN` / coin switches / velocity updates at 1981+, and reasonably distrusts the model built on it — corrosive in a project whose currency is citations you can open and verify. A latent structural risk: `resolveCram` is an identity `slice()` with no length discipline; if a df3 blink/cycle story ever feeds a longer PCRAM, it returns that length and `CRAM[index & 0x0f]` silently reads only the first 16 — a truncation nobody guards (not reachable today, since the sole caller passes the 16-byte constant, but the "resolve 16 indices" contract is unenforced). And the redundant 256-loop advertises "no regression" coverage it does not independently provide, so a reader trusts a guard subsumed by the `===` above it. None break the running game today — but three of the five findings sit on this project's most load-bearing surface (its citations and the guards that verify them), which is why a green suite is not sufficient here.

**Findings requiring fix (rework → Dev):**

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | AC4 board-facts guard is vacuous — passes on unrelated `williams.cpp` rows | `plugins/defender/tests/palette.test.ts:180-197` | Bound the scan to the `## Palette format` section (slice between that heading and the next `## `), and require BOTH `BBGGGRRR` and a `williams.cpp` citation WITHIN that section. Mutation-test: delete the palette section's `williams.cpp:66`/`:1559` → must red. |
| [MEDIUM] | Stale module header asserts a placeholder df2-2 already retired | `plugins/defender/src/shell/render.ts:11-15` | Rewrite the header's palette bullet to current state (df2-2 transcribed the real 16-entry CRAM palette, decoded via `@shared/palette-decoder`). |
| [MEDIUM] | ROM citation over-claims by ~14 lines (copy is 1968-1980) | `core/palette.ts:6,32`; `tests/palette.test.ts:10,70`; `context-story-df2-2.md:13,49` | Narrow to `defender/DEFA7.SRC:1968-1980` in df2-2's artifacts. (Project-wide occurrences → separate follow-up, see Delivery Findings.) |
| [LOW] | Redundant no-regression loop (subsumed by `===`) | `plugins/defender/tests/palette.test.ts:169-175` | Drop it (identity + the shared KNOWN-table suite cover behaviour), or make it independent of the reference-identity check. |
| [LOW] | Stale/`.ts:line` citations in context doc | `sprint/context/context-story-df2-2.md:22` (also :13,49) | Refer to joust's `paletteToRgba` by module/name (it moved to `@shared`); drop the stale `render.ts:50` line anchor. |

**Handoff:** Back to Dev (Yoda) for fixes.

## Dev Rework Assessment (rework 1 — all 5 findings addressed)

**Note on phase state:** on arrival the session `**Phase:**` read `finish`/sm — the REJECTED
review's `complete-phase` advanced forward (forward-only) instead of routing back to `green`.
`fix-phase` refused to walk it back (also forward-only), so I repaired the `**Phase:**` line
directly to `green` (rework) before starting. The mis-advance is recorded in Phase History.

**All 5 findings fixed:**

1. `[HIGH]` **AC4 board-facts guard vacuous** — `tests/palette.test.ts`. Rewrote the guard to
   slice the `## Palette format` section (from its heading to the next `## `) and require BOTH
   `BBGGGRRR` and a `williams.cpp` citation WITHIN that slice — no more ±600-char window that
   leaked into the facts table above. **Mutation-verified**: stripping `williams.cpp:66`/`:1559`
   from the palette section reds the test (was green under the old window); restored after.
2. `[MEDIUM]` **Stale module header** — `src/shell/render.ts:11-15`. Rewrote the palette bullet
   to current state: df2-2 transcribed the real 16-entry CRAM palette (core/palette.ts), decoded
   through `@shared/palette-decoder`; `indexToRgba` reads it. No more "TEMPORARY placeholder until
   df2-2…".
3. `[MEDIUM]` **DEFA7 over-claim `1968-1994`→`1968-1980`** — narrowed in df2-2's own artifacts:
   `core/palette.ts:6,32`, `tests/palette.test.ts:10,70`, `context-story-df2-2.md:13,49`. The
   inherited project-wide occurrences (epic YAML, epic context, df1 dossier/specs) are the deferred
   Delivery-Finding follow-up, left untouched by design.
4. `[LOW]` **Redundant 256-byte loop** — dropped it; the reference-identity `.toBe` above subsumes
   it and the @shared KNOWN-table suite pins the byte behaviour. Left a comment saying why.
5. `[LOW]` **Stale joust `.ts:line` citations** — `context-story-df2-2.md:22,51`. Now refer to
   `paletteToRgba` by name / `@shared/palette-decoder` (it moved out of joust's `render.ts`); the
   `render.ts:50` and `pictures.ts:89` line anchors dropped.

**No new spec deviations** — every change is a citation/comment/test-scope accuracy fix requested
by review; the shipped behaviour (decode, extraction, transcription, seam-swap) is unchanged.

**Rework evidence:** `npx vitest run` → 1078 files, **16349 pass / 0 fail** (16350→16349 = the one
dropped redundant loop); `npm run test:orchestrator` → 498/498; `npm run lint` → exit 0; AC4 guard
mutation-reddens as required.

**Handoff:** Back to Reviewer (Obi-Wan) for re-review.

## Reviewer Assessment

**Verdict:** APPROVED

Round 2 re-review of rework commit `78b70f21`. The rework addressed all five round-1 findings, and — critically for a ROM-fidelity project whose currency is verifiable citations and guards that actually guard — the one HIGH that drove the rejection is now **independently mutation-confirmed fixed**. The rework is comment/citation/test-scope only; no runtime logic changed (the render.ts and core/palette.ts hunks are entirely inside comment blocks — verified). A single new LOW surfaced (a third occurrence of the round-1 stale-anchor class in an SM setup-time snapshot); it is non-blocking and captured as a Delivery Finding.

**Data flow traced:** a framebuffer index → `indexToRgba(index & 0x0f)` → `CRAM[…]` (fixed 16 entries) → `paletteToRgba` → RGBA. Total for any numeric input (`& 0x0f` clamps negative/NaN/Infinity/float to 0..15). Unchanged by this rework; re-confirmed clean.

**Pattern observed:** section-scoped source-text guard at `plugins/defender/tests/palette.test.ts:176-200` — slices the `## Palette format` section (heading → next `## `) and requires BOTH `BBGGGRRR` and `williams.cpp` inside it. This is the correct fix for lang-review #25/#15 (anchor the guard to the CLAIM, not a token near dense prose).

**Error handling:** `headingAt` is asserted `>= 0` before the slice, so a renamed/removed section fails loudly rather than slicing from -1.

**Findings verified fixed (round 1):**

1. `[RULE][HIGH]` **AC4 guard vacuity — FIXED, mutation-confirmed twice.** rule-checker independently deleted the palette-section `williams.cpp:66`/`:1559` cites while leaving the facts-table's incidental `williams.cpp` rows (board-facts.md:24-31, above the heading) intact → the guard went RED. I confirmed the slice boundaries statically: `## Palette format` (line 33) is unique, the next `## ` is line 51, so the slice is lines 33-50; the two real cites (lines 39-40) are inside, the facts-table rows are excluded. The old `±600-char` window reached back into the table and is gone.
2. `[DOC][MEDIUM]` **Stale render.ts header — FIXED.** `render.ts:11-16` now states df2-2 transcribed the real palette (core/palette.ts) decoded via `@shared/palette-decoder`; matches `indexToRgba` at 50-52. comment-analyzer + me.
3. `[DOC][MEDIUM]` **DEFA7 over-claim — FIXED, source-verified.** Both comment-analyzer and I independently re-read `DEFA7.SRC`: `1968 *COLOR MAPPING` … `1980 PSHU D,X` is the PCRAM→CRAM copy; `1981 I01 JSR CSCAN` begins unrelated coin/MAPC/OPROC/VELO code. `1968-1980` is the correct extent; every df2-2 artifact occurrence updated, no residual `1968-1994` (inherited project-wide occurrences correctly left for the deferred follow-up).
4. `[RULE][LOW]` **Redundant 256-byte loop — FIXED.** Removed; the reference-identity `.toBe` subsumes it and the `@shared` KNOWN-table suite pins byte behaviour. Replacement comment accurate (lang-review #26). rule-checker confirmed no orphaned helpers.
5. `[DOC][LOW]` **Stale context-doc `.ts:line` anchors — PARTIALLY fixed.** Lines 22/49/51 corrected; see the new finding below for the missed third occurrence.

**New finding (round 2):**

- `[DOC][LOW]` **Third stale joust anchor** at `sprint/context/context-story-df2-2.md:66` — the "SM-Verified Anchors" blockquote still reads *"Joust's `paletteToRgba` in `plugins/joust/src/shell/render.ts:50` … currently in joust's SHELL, not yet in `@shared/`."* Present-tense-false after the extraction. **Non-blocking**: it lives in an SM setup-time snapshot (true when written), a sprint context doc that is a story input, not shipped code, not a test guard, and cited by no gate. Same class as round-1 finding #5. Captured as a Delivery Finding for a doc-cleanup pass (can ride with the inherited-DEFA7 doc follow-up). A LOW does not block per the severity rubric, and a third full rework cycle for one stale line in a working context doc is disproportionate.

### Subagent dispatch tags

- `[SEC]` reviewer-security — clean (comment-only changes; `indexToRgba` totality intact; no unsafe casts / path injection).
- `[DOC]` reviewer-comment-analyzer — 1 confirmed (context-doc:66, above); fixes 1-3 verified accurate & source-checked.
- `[RULE]` reviewer-rule-checker — clean; both round-1 fixes survive adversarial mutation; no type-safety escapes / dead helpers introduced.
- `[EDGE]`, `[SILENT]`, `[TEST]`, `[TYPE]`, `[SIMPLE]` — subagents disabled via `workflow.reviewer_subagents`. I covered their domains myself for this comment/test-scope rework: no new branches/paths (`[EDGE]`), no error handling touched (`[SILENT]`), test quality is the core of this rework and I mutation-verified the AC4 guard + confirmed the loop removal is sound (`[TEST]`), no type/interface changes (`[TYPE]`), and the diff is a net simplification — one redundant loop removed, no new abstraction (`[SIMPLE]`).

### Rule Compliance (lang-review/typescript.md + project rules)

- **#25 / #15 (source-text guard scope/anchor):** COMPLIANT (was the round-1 VIOLATION) — the AC4 guard now anchors to the palette-format section, both markers asserted-found before slicing, mutation-reddens.
- **#26 (redundant assertion):** COMPLIANT — the identity-subsumed 256-byte loop removed; remaining `.toBe` is the meaningful check.
- **#17 / #24 (stale comment / retirement applied everywhere):** COMPLIANT for shipped code (render.ts header rewritten); one residual in a context doc (finding above) — LOW, non-blocking.
- **#1–#12 (type safety):** COMPLIANT — no `as any`/`as unknown`/`@ts-ignore`/non-null `!`/`Record<string,any>` introduced (rule-checker diff-wide grep: 0).
- **Project: core/shell purity** — COMPLIANT (core hunk comment-only; purity.test.ts green). **colours-never-invented** — COMPLIANT (no colour literal touched). **Citation gate** — COMPLIANT (green; byte-accuracy unchanged). **DEFA7 extent** — now source-accurate.

### Devil's Advocate

Argue it is still broken. The strongest case: the rework is the SECOND cycle and it STILL shipped an incomplete fix — finding #5's stale-anchor defect has a third instance at context-story-df2-2.md:66 that Dev missed, in a project whose entire premise is that a cited fact can be opened and verified. If the fix for "stale citations" itself leaves a stale citation, how much can we trust the sweep? A skeptic opens line 66, reads "paletteToRgba … currently in joust's SHELL, not yet in @shared/", checks the tree, finds the opposite, and distrusts the whole doc. That is exactly the corrosion the citation gate exists to prevent — one level up, in prose the gate doesn't scan. Second: the AC4 guard, though no longer vacuous, still lets `/BBGGGRRR/` be satisfied by the section HEADING text alone — if a future editor deletes the BBGGGRRR prose from the body but keeps it in the heading, the format-token half stays green on the heading; only the williams.cpp half is now genuinely load-bearing. Third: `resolveCram` remains an identity `slice()` with no length discipline (the round-1 Improvement finding) — still latent for a df3 dynamic-PCRAM story. Why do none of these flip the verdict? The line-66 anchor sits in a setup-time snapshot that was true when SM wrote it and is a non-shipped, un-gated working doc — a genuine LOW, tracked, not hidden. The heading-satisfies-BBGGGRRR path is a theoretical future-editor scenario, not a current defect, and the citation half (the actual round-1 vacuity) is now mutation-proven to red. The `resolveCram` length contract is already an explicit deferred Delivery Finding for df3, unreachable today (sole caller passes the fixed 16-byte constant). The running game, the tests, the citation gate, and core/shell purity are all clean and green; the HIGH that made this a blocker is independently dead. No Critical or High remains. Approve, with the one LOW tracked.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Question / non-blocking (TEA, RED):** AC4 documents the palette byte format in `docs/rom-study/board-facts.md`. That file carries the df1-4 **row-exact census** enforced by `tests/audit/board-facts.test.ts`, which re-opens every cited MAME line at the pinned SHA on a machine with the MAME clone. If Dev records the palette format as a **new table ROW** (naming a `williams.cpp` palette-init line), the df1-4 census/count and the board-facts audit likely need updating **in the same commit**, and the cited palette-init line must be real at the pin. Recording it as **prose within an existing render-facts row** avoids the census churn. My RED check only requires `BBGGGRRR` + a co-located `williams.cpp` pointer; it does not force row-vs-prose — Dev's call, but pick with the census in mind.
- **Improvement / non-blocking (TEA, RED):** the exact 16 default palette bytes and their source anchor are **not** pinned in the RED tests (that is Dev's gated transcription; the `claims/*.json` + `citations.test.ts` gate owns byte-accuracy). Likely anchor: `defender/DEFA7.SRC:1056` ("*INITIALIZE COLOR RAM"). Confirm which colour table is the boot default for the PHR6 `PCRAM` shadow before transcribing; cite line numbers from `grep -n` output only (guardrail #4).
- **Conflict** (non-blocking): the ROM citation for the per-frame PCRAM→CRAM copy over-claims as `DEFA7.SRC:1968-1994` project-wide — the actual `*COLOR MAPPING` copy block is `DEFA7.SRC:1968-1980` (1981+ is `JSR CSCAN`/MAPC/OPROC/VELO). df2-2's own artifacts are corrected in rework, but the same over-broad range is INHERITED from df1's dossier and remains in `sprint/epic-df2.yaml`, `sprint/context/context-epic-df2.md:91`, `docs/superpowers/specs/2026-08-14-defender-df2-framebuffer-transcription-design.md:37`, `docs/superpowers/specs/2026-08-13-defender-cabinet-roadmap-and-df1-design.md:114`, and likely df1's `board-facts.md`/`brief.md`. Affects those files (narrow `1968-1994`→`1968-1980`). Needs a separate df1/df-hardening follow-up to correct atomically — out of df2-2 scope. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `plugins/defender/src/core/palette.ts` `resolveCram(pcram)` is an identity `slice()` with no length discipline, yet its contract is "resolve **16** indices". Not reachable today (sole caller passes the 16-byte `DEFAULT_PCRAM`), but a df3 blink/cycle story feeding a longer PCRAM would get a longer array while `CRAM[index & 0x0f]` reads only 16 — a silent mismatch. Consider clamping/asserting 16 when df3 makes the shadow dynamic. *Found by Reviewer during code review.*

### Reviewer (code review) — Round 2

- **Improvement** (non-blocking): a third stale joust anchor survived the rework at `sprint/context/context-story-df2-2.md:66` — the "SM-Verified Anchors" blockquote still reads *"Joust's `paletteToRgba` in `plugins/joust/src/shell/render.ts:50` … currently in joust's SHELL, not yet in `@shared/`"*, now present-tense-false (df2-2 moved it to `@shared/palette-decoder`). Same class as round-1 finding #5 but in an SM setup-time snapshot; not shipped code, cited by no gate. Affects `sprint/context/context-story-df2-2.md:66` (reword to past/setup-time tense, or drop the line anchors as done at :22/:51). LOW — can ride the deferred inherited-DEFA7 doc-cleanup follow-up. *Found by Reviewer (comment-analyzer) during round-2 re-review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Updated a df2-1 render.test.ts witness pair (0,15) → (2,3) — the real palette makes indices 0 and 15 identical**
  - Spec source: plugins/defender/tests/render.test.ts:179 (the df2-1 render suite's "varies by index — not a constant fill" guard)
  - Spec text: "expect(indexToRgba(0)).not.toEqual(indexToRgba(15))"
  - Implementation: changed the witness to `expect(indexToRgba(2)).not.toEqual(indexToRgba(3))` (RED $07 vs GREEN $28) and updated the test title/comment; the guard's intent (decodes BY INDEX, not one constant fill) is unchanged.
  - Rationale: df2-2 swaps the grey-ramp placeholder for the real transcribed CRAM palette (CRTAB, defender/DEFB6.SRC:1876), in which index 0 (SPACE) and index 15 (TIE3) are BOTH $00 (black) — so the placeholder-era pair no longer differs; a "varies" witness must use two entries the source gives different bytes.
  - Severity: minor
  - Forward impact: none

### Reviewer (audit)
- **Dev's `(0,15)→(2,3)` witness change** → ✓ ACCEPTED by Reviewer: intent-preserving and independently mutation-tested by the rule-checker (green→red on a constant-fill mutant). Under the real CRAM, indices 0 (SPACE) and 15 (TIE3) are both `$00`, so the placeholder-era pair would now be a FALSE-RED guard; `(2,3)` (RED `$07` vs GREEN `$28`) decode to genuinely distinct RGBA. Correct call.
- No undocumented deviations found: the transcribed `DEFAULT_PCRAM` bytes, the extraction, and the seam swap all match spec; the citation/comment defects above are accuracy issues, not spec deviations.

### Reviewer (audit) — Round 2
- No new spec deviations introduced by the rework (`78b70f21`): all changes are citation/comment/test-scope accuracy fixes responding to the round-1 findings. Dev's "no new deviations" statement confirmed by diff inspection — no executable logic changed (render.ts and core/palette.ts hunks are comment-only; the test file's only behavioural change is a tighter, mutation-verified guard and the removal of a redundant assertion). The round-1 `(0,15)→(2,3)` witness deviation stands ACCEPTED and untouched.