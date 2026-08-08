---
story_id: mc9-2
jira_key: mc9-2
epic: mc9
workflow: tdd
---
# Story mc9-2: Per-wave 8-colour palette and colour cycling (resolve open question O-5)

## Story Details
- **ID:** mc9-2
- **Jira Key:** mc9-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T00:11:59Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T22:58:31Z | 2026-08-07T23:00:28Z | 1m 57s |
| red | 2026-08-07T23:00:28Z | 2026-08-07T23:28:34Z | 28m 6s |
| green | 2026-08-07T23:28:34Z | 2026-08-07T23:38:02Z | 9m 28s |
| review | 2026-08-07T23:38:02Z | 2026-08-07T23:55:09Z | 17m 7s |
| green | 2026-08-07T23:55:09Z | 2026-08-08T00:02:50Z | 7m 41s |
| review | 2026-08-08T00:02:50Z | 2026-08-08T00:11:59Z | 9m 9s |
| finish | 2026-08-08T00:11:59Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA for RED phase.**

- **Story:** mc9-2 — Per-wave 8-colour palette and colour cycling (resolve open question O-5). 5 pts, p1, tdd workflow, epic mc9 (Missile Command render fidelity).
- **Availability verified:** no remote branch `mc9-2`, no open PRs, merge gate clear. Branched from clean `develop`.
- **Branch:** none
- Code shipped via PR #89 (`feat/mc9-2-per-wave-palette-colour-cycling` → `develop`, merged, gitflow).
- **Scope:** Shell-only — a per-wave 8-colour palette data module + render wiring. Port SET UP COLORS FOR NEXT WAVE (W3DSUP.MAC:1583). Must keep `plugins/missile-command/src/core/` untouched so `purity.test.ts` stays green.
- **Key deliverable beyond code:** resolve open question O-5 in writing (how REV-01 maps palette indices to the 8 hardware colours, incl. 3rd-colour-bit / hardware address scramble) and cite it in the dossier or mc9 design doc. TEA should pin the citation source before writing render tests.
- **Dependencies:** depends on mc3 (done); independent of mc9-1.
- **Handoff to TEA (Han Solo):** write failing render tests asserting per-wave palette selection (background/structures/missiles/blasts pull from the palette, not hard-coded hex), colour cycling where the cabinet cycles, and that the O-5 resolution is documented/cited. Confirm the W3DSUP.MAC:1583 citation and the REV-01 palette→hardware-colour mapping source before coding tests.

## Tea Assessment

**RED phase complete (Han Solo). 53 failing tests across 4 new files; 561 pre-existing pass; `tsc` green.** Verified by `testing-runner` (RUN_ID mc9-2-tea-red).

### What the tests pin (by AC)

- **AC1 — per-wave palette drawn from W3DSUP:1583, not hardcoded hex:**
  - `tests/palette.test.ts` — `paletteCodesForWave(wave)` returns the ROM row (byte-for-byte, dispatch order), the 8 legend slots (sky/ground/icbm/city-bottom/abm/city-top = COL000..COL111), consecutive palettes differ.
  - `tests/render-palette.test.ts` — a new recording ctx that **snapshots `fillStyle`/`strokeStyle`** proves the background (sky COL000) and ICBMs (COL010) come from `rgbCss(paletteForWave(wave)[slot])`; the six retired element hexes (`#f80 #f44 #9f9 #6f6 #4cf #ff0`) are gone from `render.ts`; a `wave`-less call defaults to wave 1.
- **AC2 — O-5 resolved in writing + cited:**
  - `tests/palette-docs.test.ts` — `brief.md` O-5 flips to `*(RESOLVED — see …)*`, retires the `Confirm colour source.` imperative, records the colour-register mechanism (SETCOL / COL000..COL111), keeps the address-scramble non-goal, and any linked resolution doc must exist.
  - `tests/palette-source.test.ts` — committed claims must **cite** the palette source (the 8 codes W3COMN:491-505, GAMEFL, SETCOL, dispatch table, DBLCOL macro, the 10 rows). The existing byte-checker (`spawn-claims.test.ts §3`) then validates their verbatims.
- **AC3 — colour cycling + selection per wave, shell-only:**
  - `tests/palette.test.ts` — `paletteIndexForWave` = `((wave-1)>>1) mod 10`, period 20; `FLASH_MASK`=0x30 / `FLASH_SLOTS`=[4,5] (GAMEFL, self-consistent with the mask); the palette module stays in `src/shell`, never `src/core` (purity direct-intent guard). `purity.test.ts` unaffected (no core files added).

### The Dev (Yoda) contract — `src/shell/palette.ts`

Replace the empty seed's body with: `Rgb`, `PALETTE_COUNT=10`, `FLASH_MASK=0x30`, `FLASH_SLOTS=[4,5]`, `paletteIndexForWave`, `paletteCodesForWave` (8 ROM codes COL000..COL111), `colorCodeToRgb` (**labelled adapter policy — not a ROM constant**; CBLACK→{0,0,0}, 8 distinct hues), `paletteForWave` (codes→RGB), `rgbCss`. Grow `drawFrame(ctx, state, w, h, wave?)` (optional, defaults `INITIAL_WAVE`) and wire sky/ground/icbm/city/abm/blast to the palette. Author the palette claims in `docs/rom-study/claims/` (a new `color.json` — do NOT re-declare `MC-ANCH-W3DSUP-1583`) and flip O-5 in `brief.md`. The palette fixture in `palette.test.ts` is **confirmed byte-identical to the vendored ROM** by `palette-source.test.ts`'s re-derivation.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

- **#1 type-safety escapes:** the two `as unknown as` casts (namespace + `drawFrame` widening) are the deliberate, commented RED seam (the module seed exports nothing) — flagged for the reviewer as intentional, removable once GREEN concretely types the module and 5-arg signature.
- **#4 `??` vs `||`:** selection clamps via `Math.max(1, …)` not `||`, so wave `0` is handled correctly (degenerate-input test covers -5/0/fractional).
- **#5 `.js` ESM extensions:** used on all `../src/core/*.js` imports; the new module imports use extension-optional forms consistent with vitest resolution.
- **test quality (#15/#18):** every fixture carries a self-vacuous-pass guard (the 10×8 table shape/hue check; `FLASH_SLOTS` derived-from-mask cross-check); no `assert(true)`/`let _ =`; negative pins have teeth (distinct-hue, differs-between-waves).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/shell/palette.ts` — the palette module: 10 per-wave rows (dispatch order), `paletteIndexForWave` = `((wave-1)>>1) mod 10`, `paletteCodesForWave`, `colorCodeToRgb` (labelled adapter, 8 named hues, CBLACK→black), `paletteForWave`, `rgbCss`, `PALETTE_COUNT`, `FLASH_MASK`/`FLASH_SLOTS`, `SLOT` legend.
- `plugins/missile-command/src/shell/render.ts` — `drawFrame(ctx, state, w, h, wave = INITIAL_WAVE)`; sky/ground/ICBM/city-bottom/city-top/ABM pull from their legend slots, blasts from the flash slot; the six mc3 element hexes removed; `clearField` takes an optional sky colour. Rubble grey + crosshair/HUD white kept (not palette registers).
- `plugins/missile-command/docs/rom-study/claims/color.json` — 27 byte-verified claims (8 colour codes, GAMEFL, SETCOL routine, dispatch table, DBLCOL macro, the 10 rows, the colour registers + flash cycle). Non-EQU sites carry the `'cite'` kind tag (mc2-6 invariant).
- `plugins/missile-command/docs/rom-study/palette.md` — the O-5 resolution note (colour source, per-wave selection, flash, the address-scramble non-goal).
- `plugins/missile-command/docs/rom-study/brief.md` — O-5 flipped to `*(RESOLVED — see palette.md)*`.

**Tests:** 623/623 passing (GREEN), verified by `testing-runner` (RUN_ID mc9-2-dev-green). `npm run lint` (tsc) exits 0.

**Notes for the reviewer (Obi-Wan):**
- The `wave` seam is TEA's chosen optional-param contract; `main.ts` still calls `drawFrame` with 4 args, so the live game renders the **wave-1 palette** until a wave counter exists to feed it (per TEA's Delivery Finding — no `GameState.wave` exists; out of scope here). No `src/core/` files touched — `purity.test.ts` green.
- Blast=`COL100` / base=`COL110` slot choices are logged as a minor Design Deviation (the legend pins neither); everything else maps to its exact legend slot.
- Colour fidelity beyond the code→slot mapping (the adapter RGB hues) is an owner-screenshot check at `/missile-command/`.

**Code branch:** `feat/mc9-2-per-wave-palette-colour-cycling` (pushed; merged via PR #89)

**Handoff:** To review (Reviewer / Obi-Wan).

## Dev Assessment — Round 2 (rework after REJECTED)

**Implementation Complete:** Yes. Every reviewer finding addressed. 629/629 tests green; tsc exit 0. The 2³¹ throw is verified fixed by direct execution.

| Reviewer finding | Fix |
|---|---|
| [HIGH] `paletteIndexForWave` throws for wave ≥ 2³¹ | `palette.ts:95` now `Math.floor((w-1)/2) % PALETTE_COUNT` (no int32 coercion, `%` stays non-negative); docstring corrected. Verified: `paletteIndexForWave(2147483649)===4`, `paletteForWave(...)` returns 8 RGBs, no throw. |
| [HIGH-adjacent] test oracle shared the bug | `palette.test.ts` `romIndex` now uses `Math.floor(/2)`; added `2³¹+1`, `2³²+1`, `MAX_SAFE_INTEGER` to the [0,9] guard + a new "never throw/undefined past 2³¹" test. |
| [MED] header claims "ground pulls from palette" (unread `SLOT.GROUND`) | `render.ts:16-23` header reworded — GROUND (COL001) has no on-screen element and is not drawn. |
| [MED] two source-text guards satisfiable by header comment prose | `render-palette.test.ts` strips comments first, then requires a real `import { paletteForWave } from './palette'` AND an actual `paletteForWave(` call. |
| [MED] blast COL100 == sky COL000 on WVACOL (invisible) | `render.ts` blast now picks the flash slot whose hue differs from the sky; added a render regression test (waves 1/13/14) + a pure module invariant ("a flash slot always differs from the sky"). |
| [LOW] blast=COL100 labelled as ROM fact | reworded `render.ts` + `palette.md` comments: repurposing a flash register is a rendering choice, not a ROM-assigned use. |
| [LOW] slot legend `W3DSUP.MAC:1706` uncited | added claim `MC-COL-LEGEND` (color.json now 28 claims) + a CITED coverage entry in `palette-source.test.ts`. |
| [LOW] SLOT "8 slots" comment vs 6 keys | reworded `palette.ts:79`. |

**Code branch:** `feat/mc9-2-per-wave-palette-colour-cycling` (pushed, commit d7d407be; merged via PR #89)
**Handoff:** Back to review (Reviewer / Obi-Wan).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1036 tests green, tsc 0, orchestrator green, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — test-quality assessed by rule-checker (rules 15/18/19/25/26) + me |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 | confirmed 5, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — type design assessed by rule-checker (rules 1-5) |
| 7 | reviewer-security | Yes | clean | none (rgbCss/indexing safe for its inputs) | N/A — but see note: it did NOT test the 2³¹ boundary the rule-checker did |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 7 (across rules 15,17,21,25) | confirmed 7, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 7 confirmed (1 High, 3 Medium, 3 Low) + 1 I found myself (WVACOL blast/sky collision, Medium), 0 dismissed, 0 deferred

Note: the security subagent reported `paletteIndexForWave` "clean" by reasoning about NaN/Infinity/negative but did **not** execute the 2³¹ boundary; the rule-checker executed it and found a real throw. I reproduced it myself (below). Execution beat reasoning — the security "clean" is superseded on that one point.

## Reviewer Assessment

**Verdict:** REJECTED

The implementation is close and the ROM fidelity is genuinely well-grounded (the palette fixture re-derives byte-for-byte from the vendored source, the 27 claims byte-check green, purity holds). But it ships a confirmed unhandled-throw in a public function whose own docstring guarantees the opposite, plus a cluster of comment/citation-honesty inaccuracies that matter in this repo. One High = REJECT.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [RULE] | `paletteIndexForWave` throws for `wave ≥ 2³¹`: `(w-1) >> 1` int32-coerces and JS `%` keeps the dividend's sign → **negative** off-table index → `paletteCodesForWave`→`undefined`→`paletteForWave` throws `TypeError`. **Reproduced by me:** `paletteIndexForWave(2147483649) === -4` (also `-1` at `MAX_SAFE_INTEGER`), `paletteForWave(2147483649)` throws. The docstring's "the lookup can never index off-table" is FALSE — and this is the exact "debug-seeded wave" robustness the guard claims to provide (AC-2). | palette.ts:92-95 | Replace `(w - 1) >> 1` with `Math.floor((w - 1) / 2)` (no int32 coercion; `w-1 ≥ 0` keeps `%` non-negative). Correct the docstring. Add a boundary test at `2³¹+1` and `MAX_SAFE_INTEGER` — do NOT use the duplicated buggy `romIndex` helper (palette.test.ts:114) as the oracle; it shares the bug. |
| [MEDIUM] [RULE][DOC] | Module-header claims "sky, **ground**, ICBMs, city bottom/top and ABMs all pull from `paletteForWave(wave)`" — but `SLOT.GROUND` (COL001) is **never read** in `drawFrame`; no ground element is drawn. False comment. | render.ts:16-21 | Drop "ground" from the header (or draw a ground element that reads `SLOT.GROUND`). |
| [MEDIUM] [RULE][TEST] | Two source-text assertions ("imports the palette module" / "selects a colour per wave") match the file-level **header comment**, not the call site — the rule-checker mutation-proved them green with the real `paletteForWave(wave)` call stubbed out. (The 6 behavioral colour tests DID catch the mutant, so the suite has teeth — but these two auxiliary anchors are satisfiable by prose.) | render-palette.test.ts:189,193 | Bound the regex to the call-site region, or drop them in favour of the behavioral guards. |
| [MEDIUM] [REVIEW] | Blast colour `COL100` **equals the sky `COL000`** on `WVACOL` (dispatch index 6 = waves 13,14,+20) → explosions render invisible there. I verified this is the *only* element that collides with the sky on any wave. Latent today (main.ts passes 4 args → wave 1 = WV1COL, blast=CRED, visible) but bites the moment a wave counter is wired. | render.ts:161-165 | Pick a blast colour that never collides with sky, or implement the real flash cycle; document it. |
| [LOW] [DOC] | Blast=`COL100` labelled "the explosion FLASH register" beside a ROM citation, implying the ROM assigns COL100 to explosions — but the legend (W3DSUP.MAC:1706) marks COL100/COL101 "UNUSED(FLASH)". It's the clone's choice, not a cited ROM fact. | render.ts:161; palette.md:64 | Reword to separate ROM fact from clone choice. |
| [LOW] [DOC] | palette.md opens "pinned by the claims … all byte-verified", implying the slot legend (W3DSUP.MAC:1706) — the source for the whole slot→element mapping — is claim-pinned. It is **not** in color.json or the CITED array. | palette.md:1; color.json | Add a claim citing W3DSUP.MAC:1706 + extend palette-source `CITED`, or soften the sentence. |
| [LOW] [DOC] | `SLOT` comment "indexed by the 8 legend slots" but `SLOT` defines only 6 keys (slots 4/5 handled via `FLASH_SLOTS`). | palette.ts:79 | Reword to "the 6 named registers among the 8 slots". |

### Observations (tagged)

- [SEC] reviewer-security — clean: `rgbCss` builds `rgb(r,g,b)` from integer channels only (no injection); `paletteIndexForWave`/`colorCodeToRgb` index fixed tables. (Caveat: it reasoned about NaN/Inf/neg but did NOT execute the 2³¹ boundary — the [RULE] finding below did, and found the throw. Execution beat reasoning.)
- [HIGH] [RULE] `paletteIndexForWave` off-table throw — reproduced by me (see severity table). Anchors the rejection.
- [MEDIUM] [DOC] render.ts:20 "ground pulls from palette" — false; `SLOT.GROUND` unread.
- [MEDIUM] [TEST] render-palette.test.ts:189,193 satisfiable by header prose (mutation-proven).
- [MEDIUM] blast/sky collision on WVACOL (waves 13,14) — invisible explosions; latent behind the wave-1 default.
- [VERIFIED] `colorCodeToRgb` is overflow-safe for EVERY integer — evidence: `(code>>1)&0x7` bounds the index to [0,7] and `HUES` has 8 entries; I swept codes, rule-checker swept -2..17. Complies with null/undefined rules (no undefined deref). Contrast palette.ts:95 which uses `%` (sign-unsafe), not `&`.
- [VERIFIED] Core/shell purity holds — evidence: `git diff --name-only develop...HEAD` touches ZERO `src/core/` files; `palette.ts` imports nothing; `render.ts` imports `../core/*.js` one-way only. Complies with CLAUDE.md purity rule; `purity.test.ts` green.
- [VERIFIED] Citation discipline — evidence: 27 color.json claims; the 9 EQU carry radix-decoded numeric values, the 18 non-EQU all carry the `'cite'` kind tag (mc2-6 invariant, citations-source.test.ts). Byte-checker green against the vendored source. Complies.
- [VERIFIED] Retired hexes gone — evidence: grep finds none of `#f80 #f44 #9f9 #6f6 #4cf #ff0` in render.ts; the 6 behavioral RETIRED guards pass.
- [VERIFIED] `drawFrame` back-compat — evidence: sole caller main.ts:38 is 4-arg; new `wave` param optional (`= INITIAL_WAVE`); tsc exit 0.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)

- **#1 type-safety escapes:** 4 `as unknown as` — all test-only, documented RED-seam, matching the cp2-13 sibling precedent; none leak into `src/`. Compliant. (Advisory: post-GREEN the casts could become plain typed imports; repo-wide convention leaves them, so not a defect.)
- **#4 `??` vs `||`:** render.ts `?? true` / `?? MISSILE_STACK.length` correct where 0/falsy is valid. Compliant.
- **#5 ESM `.js`:** all render.ts relative imports carry `.js`; test namespace imports match `moduleResolution: bundler`. Compliant.
- **#15 / #25 source-text-token assertions:** **VIOLATION** — render-palette.test.ts:189,193 (see severity table). The RETIRED negative guards are the correct idiom (compliant).
- **#17 comments asserting an un-re-run mechanism:** **VIOLATION ×2** — render.ts:16-21 "ground" claim; palette.ts:92 "never index off-table" (false).
- **#21 degenerate non-nullish numeric input:** **VIOLATION** — palette.ts:95 int32 overflow (the High). `colorCodeToRgb` compliant.
- **#24 retirement completeness:** all 6 hexes retired. Compliant.
- **Rules 3/6/7/9-14/16/22/23:** N/A to this diff (no enums, JSX, async, build config, error/catch, server fs).

### Devil's Advocate

Argue the code is broken. It is — and worse, its most-promised property is the one it fails. `paletteIndexForWave` opens with a `Number.isFinite`/`Math.max(1,…)` guard whose stated reason is to make a "degenerate/debug-seeded wave" safe so the lookup "can never index off-table." A reader trusts that. But the very next line, `(w - 1) >> 1`, silently coerces to int32, and `% 10` on a wrapped-negative value returns a negative index. A shell that debug-seeds a large wave — exactly the AC-2 scenario the guard invokes — gets a thrown `TypeError`, not a clamped palette. The author's own test "always lands in [0,9]" samples up to 999 and reuses the identical buggy formula as its oracle, so it is structurally incapable of catching this. That is the trap: a guard, a docstring, and a test all agreeing on a falsehood.

Now the malicious/confused user: there isn't one — this is a backend-less canvas game, wave comes from internal state — which is why I rate the throw High-by-category (unhandled throw in a public API) but not Critical (unreachable in real play). Still, "unreachable today" is doing heavy lifting: the WHOLE feature is unreachable today, because `main.ts` never passes a wave, so the shipped game renders only WV1COL. The headline behavior — "colours change wave to wave" — is invisible in production until a future story wires a wave counter. And the moment it does, WVACOL (waves 13-14) paints explosions in the sky colour, so the player's own blasts vanish on 10% of the cycle. A stressed reviewer would also note per-frame allocation (`paletteForWave` rebuilds an 8-element array of objects every `drawFrame`), and comments that quietly launder a rendering choice (COL100=blast) into a "ROM FLASH register" fact in a repo whose entire identity is not doing that. None of these is catastrophic; together they are a clear "not yet." Fix the overflow, correct three comments, add the legend claim, tighten two assertions — small, mechanical, testable — and this is an easy approve.

**Handoff:** Back to TEA (red rework) — the anchor finding is a testable logic bug; TEA adds the boundary test (currently throws → red) and tightens the two prose-satisfiable assertions, then Dev fixes the formula + comments + legend claim.

## Subagent Results — Round 2 (re-review after rework)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (629 vitest + 408 orchestrator green, tsc 0, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) — all 4 round-1 comment findings RESOLVED | confirmed 0 blocking; 1 LOW noted (non-blocking) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none (formula + blast fallback verified safe) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 new; all 3 round-1 findings verified RESOLVED (by execution + mutation-test) | confirmed resolved |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 0 blocking; 1 Low non-blocking (noted). All 7 round-1 findings resolved.

## Reviewer Assessment — Round 2 (APPROVED)

**Verdict:** APPROVED

**Specialist findings incorporated (round 2):**
- [SEC] reviewer-security — **clean**: `Math.floor((w-1)/2) % 10` stays in [0,9] for all finite inputs (no int32 coercion); the blast `FLASH_SLOTS.find(...) ?? FLASH_SLOTS[0]` fallback is always defined. No injection/indexing defect.
- [RULE] reviewer-rule-checker — all 3 round-1 findings (Rule 21 HIGH, Rule 15/25, Rule 17×2) verified **RESOLVED** by execution + mutation-testing the tightened guards; 0 new violations in the delta; `MC-COL-LEGEND` carries the `'cite'` kind tag and byte-verifies.
- [DOC] reviewer-comment-analyzer — all 4 round-1 comment findings **RESOLVED**; one [LOW] non-blocking residual: the `MC-COL-LEGEND` `meaning` paraphrase drops "UNUSED" (the byte-checked `verbatim` is correct).

Every round-1 finding is genuinely resolved — verified independently, not taken on faith:

- **[HIGH → resolved]** `paletteIndexForWave` overflow: I re-executed the shipped function — `paletteIndexForWave(2147483649)===4`, `4294967297→8`, `MAX_SAFE_INTEGER→5`, and `paletteForWave(...)` returns 8 RGBs with no throw. The rule-checker independently re-ran the *old* `>>` formula to confirm the defect was real (`-4`/`-1`) and the new `Math.floor((w-1)/2)` fixes it. The docstring no longer lies; the test's `romIndex` oracle no longer shares the bug; boundary tests at 2³¹/2³²/MAX_SAFE_INTEGER pass.
- **[MEDIUM → resolved]** the two source-text guards: now strip comments and require a real `import { paletteForWave } from './palette'` + a `paletteForWave(` call. The rule-checker **mutation-tested** them — with the real import/call removed but a prose mention left, both guards go red. They have teeth now.
- **[MEDIUM → resolved]** the "ground pulls from palette" header: reworded; `SLOT.GROUND` confirmed unused and the comment now says so.
- **[MEDIUM → resolved]** blast/sky collision on WVACOL: `render.ts` now picks the flash slot that differs from the sky (`FLASH_SLOTS.find((s) => hue(s) !== skyCss) ?? FLASH_SLOTS[0]`), with a render regression test (waves 1/13/14) + a pure module invariant. Verified WVACOL (waves 13-14) `COL100==COL000==CPURPL` and the fix makes blasts visible there.
- **[LOW → resolved ×3]** blast-as-ROM-fact comments reworded (clone choice vs the ROM's UNUSED legend); slot legend now claim-pinned (`MC-COL-LEGEND`, W3DSUP.MAC:1706, byte-verified, `'cite'` kind tag) + CITED coverage; SLOT "6 named registers among the 8 slots".

**Remaining (non-blocking):**
- [LOW] the new `MC-COL-LEGEND` claim's `meaning` paraphrase drops "UNUSED" from the flash slots (`…(FLASH),(FLASH)…`). The byte-checked `source.verbatim` is correct and this matches the file's terse-`meaning` house style; an optional one-word tidy, not a blocker.

**Data flow traced:** internal `wave` (or the `INITIAL_WAVE` default) → `paletteForWave(wave)` → per-element `rgbCss(pal[slot])` → canvas `fillStyle`/`strokeStyle`. Safe: `wave` is internal game state (no external input); indexing is clamped in [0,9] for all finite inputs; the code→RGB adapter returns one of 8 fixed hues.
**Pattern observed:** the shell/core boundary is respected — palette is pure shell data, `render.ts` imports core one-way, zero `src/core/` files touched (`purity.test.ts` green).
**Error handling:** degenerate/huge/NaN waves clamp rather than throw (verified by execution); the blast fallback can never deref undefined.

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA] Gap (non-blocking, resolved-by-seam):** `wave` never reaches the render layer. `GameState` (`src/core/game.ts`) has no `wave` field, `stepGame` never advances one, and `src/core/wave.ts` (`waveSchedule`, `INITIAL_WAVE`) is imported by nothing. So `drawFrame(ctx, state, w, h)` cannot select a per-wave palette today. **RED contract chosen:** grow `drawFrame` with an OPTIONAL trailing `wave?` param (the cp2-12 "render extra-arg" precedent), defaulting to `INITIAL_WAVE` so the existing 4-arg callers (`main.ts`, three render tests) stay tsc-green and render wave-1 colours. Dev may instead thread wave via a core `GameState.wave` field — that keeps `purity.test.ts` green but is a core touch that needs a Design Deviation entry and contradicts the story's "shell-only" wording, so the optional-param seam is preferred. `main.ts` wiring an actual wave source into `drawFrame` is out of scope here (no wave counter exists to wire); this story ships the seam + wave-1 default.
- **[TEA] Question (non-blocking, scope reading):** AC3 "colour cycling is reproduced where the cabinet cycles." The cabinet's literal per-frame cycling is the `GAMEFL=0x30` flash of `COL100`/`COL101` via `INC` at each VBLANK (`W3INT.MAC:291-313`) — an explosion/flash effect on two "UNUSED(FLASH)" slots barely visible in normal play. The dominant, player-visible "cycling" is the **per-wave recolour of the whole field**. **RED reading:** the primary cycling is the per-wave palette change (pinned in render + module tests); the flash is pinned as ROM-cited DATA (`FLASH_SLOTS`/`FLASH_MASK` + a claim), NOT as a required per-frame render animation (that would over-scope a 5-pt story and is an owner-screenshot check). Reviewer to confirm this reading; if fuller flash animation is wanted it is a follow-up.
- **[TEA] Seam file created in RED:** an empty `src/shell/palette.ts` (`export {}`, header-labelled) was committed so the RED suite imports resolve and `tsc` stays green while every palette symbol is `undefined` → a self-describing "not implemented yet" throw (the centipede namespace-cast idiom). It carries ZERO game logic — Dev replaces its whole body in GREEN.

### Reviewer (code review)
- **Gap** (blocking, this story): `paletteIndexForWave` throws `TypeError` for `wave ≥ 2³¹` (int32 `>>` + signed `%` → negative off-table index). Affects `src/shell/palette.ts:95` (use `Math.floor((w-1)/2)`; fix the docstring; add a boundary test not built on the duplicated buggy `romIndex`). *Found by Reviewer during code review.*
- **Gap** (non-blocking, future wave-wiring story): once a real wave source feeds `drawFrame`, blast colour `COL100` collides with sky `COL000` on `WVACOL` (waves 13,14,+20) → invisible explosions. Affects `src/shell/render.ts:161-165` (pick a collision-free blast colour or implement the flash cycle). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the slot legend `W3DSUP.MAC:1706` — the source for the whole slot→element render mapping — is uncited. Affects `docs/rom-study/claims/color.json` + `tests/palette-source.test.ts` CITED array (add a claim + coverage entry). *Found by Reviewer during code review.*
- **Question** (non-blocking): the shipped game renders only the wave-1 palette (`main.ts` passes no wave), so the story's headline "colours change per wave" is not observable in production until a future story wires a wave counter — is that acceptable for the epic's demo, or should a wave source be brought forward? *Found by Reviewer during code review.*
- **[Round 2 — APPROVED]** The round-1 blocking gap (`paletteIndexForWave` overflow) and the two other blocking findings are fixed and verified. One non-blocking residual: **Improvement** (non-blocking): the `MC-COL-LEGEND` claim's `meaning` paraphrase drops "UNUSED" from the flash slots. Affects `docs/rom-study/claims/color.json` (a one-word tidy of the summary; the byte-checked `verbatim` is already correct). *Found by Reviewer during round-2 review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

1 deviation

- **Blast and base colour-slot assignment (legend-underspecified)**
  - Rationale: the two "UNUSED(FLASH)" registers COL100/COL101 are the cabinet's explosion-flash colours (GAMEFL=0x30), so COL100 is the faithful blast hue; a base is an ABM launcher, so ABMS (COL110) is its natural colour. Both recolour per wave with the field, satisfying AC1. TEA's tests pin sky+ICBM to exact slots and require the six old element hexes gone, but leave blast/base slot to Dev.
  - Severity: minor
  - Forward impact: none for siblings — a cosmetic slot choice; the owner screenshot at `/missile-command/` is the final arbiter and can retune it.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Blast and base colour-slot assignment (legend-underspecified)**
  - Spec source: context-story-mc9-2.md, AC1 ("background, structures, missiles, and blasts pull their colour from [the palette]"); slot legend W3DSUP.MAC:1706.
  - Spec text: legend names SKY/GROUND/ICBMS/CITY(BOTTOM)/UNUSED(FLASH)/UNUSED(FLASH)/ABMS/CITY(TOP)&ABMS for COL000..COL111 — it assigns NO register to "blasts" or to the base platform.
  - Implementation: blasts (explosions) draw in the flash register `COL100` (`FLASH_SLOTS[0]`); the base pyramid/platform draws in `COL110` (the ABMS hue). Sky/ground/ICBM/city-bottom/city-top/ABM-trail map to their exact legend slots.
  - Rationale: the two "UNUSED(FLASH)" registers COL100/COL101 are the cabinet's explosion-flash colours (GAMEFL=0x30), so COL100 is the faithful blast hue; a base is an ABM launcher, so ABMS (COL110) is its natural colour. Both recolour per wave with the field, satisfying AC1. TEA's tests pin sky+ICBM to exact slots and require the six old element hexes gone, but leave blast/base slot to Dev.
  - Severity: minor
  - Forward impact: none for siblings — a cosmetic slot choice; the owner screenshot at `/missile-command/` is the final arbiter and can retune it.

### Reviewer (audit)
- **Dev deviation "Blast and base colour-slot assignment"** → ✗ FLAGGED by Reviewer (partial): the **base=COL110** half is ACCEPTED (I verified COL110 never equals the sky on any of the 10 palettes — bases stay visible). The **blast=COL100** half is FLAGGED: COL100 equals the sky COL000 on `WVACOL` (waves 13,14,+20), so explosions render invisible there. It is latent (main.ts renders wave 1 today) but the rework should pick a collision-free blast colour (or implement the flash cycle). Also reword the comment that presents COL100 as a ROM-assigned "explosion FLASH register" — the legend marks it UNUSED, so this is the clone's choice, not a ROM fact. Tracked as a [MEDIUM] finding in the Reviewer Assessment. → **RESOLVED in round 2:** blast now picks the flash slot that differs from the sky (render + module regression tests added), and the ROM-fact-vs-choice comments were reworded. The original deviation is superseded; the blast is no longer a static COL100.