---
story_id: "mc5-1"
jira_key: "mc5-1"
epic: "mc5"
workflow: "tdd"
---
# Story mc5-1: MIRV split (mirv.ts): an in-flight ballistic ICBM entering height band [128,160] forks into <=3 child ICBMs, re-targeted; suppressed at >=12 live explosions. REV-01 W3MAIN.MAC:2685 MIRVER

## Story Details
- **ID:** mc5-1
- **Jira Key:** mc5-1
- **Workflow:** tdd
- **Stack Parent:** mc4 (inherited from epic mc5)
- **Repos:** arcade
- **Branch:** feat/mc5-1-mirv-split
- **PR:** https://github.com/slabgorb/arcade/pull/132

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-08T19:48:06Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-08T19:10:01Z | 2026-08-08T19:13:36Z | 3m 35s |
| red | 2026-08-08T19:13:36Z | 2026-08-08T19:19:06Z | 5m 30s |
| green | 2026-08-08T19:19:06Z | 2026-08-08T19:30:22Z | 11m 16s |
| review | 2026-08-08T19:30:22Z | 2026-08-08T19:48:06Z | 17m 44s |
| finish | 2026-08-08T19:48:06Z | - | - |

## SM Assessment

**Story:** mc5-1 — MIRV split (3pt, tdd, arcade). The opener of the freshly-materialized mc5 epic (full REV-01 enemy roster). This is Tasks 1–2 of the committed plan `docs/superpowers/plans/2026-08-08-missile-command-mc5-enemy-roster.md`; design at `docs/superpowers/specs/2026-08-08-missile-command-mc5-enemy-roster-design.md` §mc5-1.

**Contention probe (clean):** at setup no remote branch existed for mc5-1 (unclaimed); the two live sibling sessions are a-2 on mc4-6 and a-3 on sw10-1 — neither touches `mirv.ts`. Merge gate clear (no blocking open PRs). Claim pushed: story stamped `in_progress` + `feat/mc5-1-mirv-split` pushed empty so the sibling branch-probe lights up.

**Premise verified, not stale:** the band `[128,160]`, ≤3 children, and ≥12-explosion suppression were derived directly from `reference/source/W3MAIN.MAC`/`W3COMN.MAC` today (this session authored the mc5 design), cited `W3COMN.MAC:159/161`, `W3MAIN.MAC:2695-2700`, `W3MAIN.MAC:1533-1537`. No re-measurement needed.

**For TEA (RED):**
- Deliverable is a new pure `src/core/mirv.ts` (`mirvEligible` band predicate + `mirvSplit` ≤3-child fork) then wiring into `game.ts` `stepGame` (play branch, after enemy flight, before damage), suppressed at ≥12 live explosions. Plan Tasks 1–2 carry full RED test code, claim-capture `grep`/`sed` recipes, and commit steps.
- Every new `src/core` literal needs a claim in `docs/rom-study/claims/mirv.json`; put numbers in `//` comments not `/** */`; `purity.test.ts` + `citations.test.ts` must stay green. Reading `W3MAIN.MAC` needs `tr -d '\r'` **and** `grep -a` (stray binary bytes).
- **Layering:** cruise missiles don't exist yet — do NOT add an `Icbm.kind === 'cruise'` guard to `mirvEligible` here; that's mc5-3 (plan Task 6).
- **Soft collision:** a-2's mc4-6 edits the `'between'` branch of `stepGame`; this story edits the `'play'` branch — same file, different region. Re-measure on integrated develop at finish (the finish-time re-fetch rule).

**Handoff:** phased tdd → TEA (Tyr One-Handed) for RED.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- (TEA/RED, Improvement, non-blocking) The RED integration suppression test uses REAL `startExplosion(...)` records at the 11/12 boundary (not fabricated stand-ins) and pins `remaining: 0` so any `icbms.length` change is provably MIRV, not a spawn — Dev must keep that isolation intact when wiring.

## TEA Assessment (RED)

**RED delivered — 10 new tests fail, 843 existing green, `tsc` clean.**

Two files: `tests/mirv.test.ts` (pure reducer) + `tests/mirv-integration.test.ts` (stepGame wiring). What GREEN (Loki) must build to turn them green:

1. **`src/core/mirv.ts`** (new, pure — swept by `purity.test.ts`): export `MIRV_LO=128`, `MIRV_HI=160`, `MIRV_MAX_CHILDREN=3`, `MIRV_EXPLOSION_SUPPRESS=12`; `mirvEligible(icbm)` (true iff `!arrived` and `pos.v` in `[128,160]` inclusive — do NOT check `Icbm.kind`, cruise doesn't exist yet); `mirvSplit(parent, liveTargets, rng)` (≤3 child ballistic ICBMs via `launchIcbm(parent.pos, target, parent.velocity)`, RNG-picked live target, empty when no targets). Follow plan Task 1.
2. **`docs/rom-study/claims/mirv.json`**: claims `MC-MIRV-LO/-HI/-MAX/-EXPSUP` with `verbatim` captured by `grep -an` from the original W3MAIN/W3COMN (never retyped). Put numbers in `//` comments, not `/** */`, or `citations.test.ts` will flag JSDoc numerics.
3. **Wire into `game.ts` `stepGame`** (plan Task 2): after `flownIcbms`, `flatMap` each eligible ballistic ICBM into `[icbm, ...mirvSplit(icbm, liveTargets, state.rng)]`, gated off `state.explosions.length >= MIRV_EXPLOSION_SUPPRESS`; feed the result into `killIcbmsInBlasts`. Reuse the existing `liveTargets`.

**RED reason verified honest:** pure tests fail on `Cannot find module '/src/core/mirv.js'` (self-describing loader); integration tests fail on assertions (`expected 1 to be greater than 1`) — behaviour absent, not import error. Both flip green only when the split is actually wired.

**Handoff:** phased tdd → Dev (Loki Silvertongue) for GREEN.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **What changed:** MIRV is bounded to at most ONE split per frame with children capped by the MXICON on-screen ceiling — NOT "every eligible ballistic ICBM forks every frame."
- **Spec source:** `docs/superpowers/plans/2026-08-08-missile-command-mc5-enemy-roster.md` (Task 2): *"after `flownIcbms`, `flatMap` each eligible ballistic ICBM into `[icbm, ...mirvSplit(icbm, liveTargets, state.rng)]`, gated off `state.explosions.length >= MIRV_EXPLOSION_SUPPRESS`."*
- **What the code does instead:** `game.ts` picks the LAST in-band eligible ICBM (`mirvAt`), splits it once, and appends `mirvSplit(...).slice(0, openSlots)` where `openSlots = max(0, MXICON − flownIcbms.length)`. So ≤1 MIRV/frame and the roster never exceeds `MXICON` (7).
- **Why:** the plan's flatMap-every-eligible **avalanches**. MIRV children spawn IN the band `[128,160]` and, at wave-1 descent (~0.17 units/frame over a 32-unit band), stay in-band for ~180 frames — each re-splitting every frame → exponential growth → `RangeError: Maximum call stack size exceeded` in `spawnIcbms`'s `Math.max(...current.map())` (reproduced: `mc3-playthrough.test.ts`). The ROM does NOT avalanche: `MIRVIX` is a SINGLE slot re-armed to the last in-band ICBM per tick (`STX MIRVIX`, W3MAIN.MAC:1561-1575) — one MIRV/frame — and ICBMs on screen are hard-capped at `MXICON=7` (W3COMN.MAC:193, claim MC-MXICON). The bound is therefore REV-01 fidelity, not a shortcut.
- **Forward impact:** matches the ROM. mc5-2 (sputnik-fired ICBMs) and mc5-3 (cruise) also count against `MXICON` — the ROM's own launch-count formula already subtracts `CRMONS`/`ICBONS`. **The design §mc5-1 and plan Task 2 wiring should be corrected to show the one-per-frame + MXICON bound** so mc5-2/mc5-3 executors don't copy the avalanching flatMap. (Plan Task 2 corrected on this branch.)
- **Fidelity note:** "last in-band eligible" matches the ROM's `STX MIRVIX` overwrite (the last in-band ICBM in slot-iteration order wins the single slot).

## Dev Assessment (GREEN)

**GREEN complete — 858/858 missile-command tests pass, `tsc` clean.** All 10 mc5-1 RED tests flip green; no existing test disturbed (the one transient regression — a stack overflow in `mc3-playthrough` — was the avalanche bug above, now fixed and green).

**Built (plan Tasks 1–2):**
- `src/core/mirv.ts` (new, pure) — `MIRV_LO=128`/`MIRV_HI=160`/`MIRV_MAX_CHILDREN=3`/`MIRV_EXPLOSION_SUPPRESS=12`, `mirvEligible` (inclusive band, no `kind` check — cruise is mc5-3), `mirvSplit` (≤3 children from `parent.pos`, RNG-re-targeted, empty on no targets).
- `docs/rom-study/claims/mirv.json` — MC-MIRV-LO/-HI (EQU) + MC-MIRV-MAX/-EXPSUP (derived instruction-site: `LDA I,2`+1=3, `CPY I,12.`=12), verbatims captured programmatically (byte-exact).
- `game.ts` — bounded MIRV wiring (see deviation) after enemy flight, before damage.
- `tests/citations-source.test.ts` — registered POTENT/EXPLCT in `DERIVED` + a mc5-1 value-consistency block (the mc-citations rule for derived instruction-site constants).

**AC accountability:** AC1 (band edges + arrived) DONE — `mirv.test.ts`. AC2 (≤3 fork, determinism, empty) DONE — `mirv.test.ts`. AC3 (wired + suppression) DONE — `mirv-integration.test.ts` (11 splits / 12 suppressed, real explosions). AC4 (claims + gates green) DONE — `citations`/`purity` green in the 858.

**Handoff:** phased tdd → Reviewer (Heimdall) — with attention to the deviation (is one-per-frame + MXICON the right fidelity call?) and whether the plan/design docs should carry the bound.

## Reviewer Assessment (Heimdall)

**Verdict: APPROVED** (after one rework round, all findings closed and mutation-verified).

**Method.** 3 enabled reviewer subagents (test-analyzer, comment-analyzer, rule-checker) on the diff + a hand-run **mutation battery** covering the disabled dimensions (edge-hunter/simplifier/etc. are `false` in `workflow.reviewer_subagents`). Preflight run inline: 862/862 missile-command green, `tsc` clean. The code logic was correct on arrival (band, one-per-frame bound, MXICON cap, suppression, purity, determinism all verified — rule-checker: *"No blocking defects — everything is green and ROM-faithful"*). Every finding was a **test-permissiveness or comment-accuracy** gap, not a behavioral bug.

**7 findings, all CLOSED (commit `86da8b04` + `2b47083e`), each re-verified by re-running the mutant.** Source tags: `[TEST]` = reviewer-test-analyzer, `[DOC]` = reviewer-comment-analyzer, `[RULE]` = reviewer-rule-checker (corroborating tags in brackets):

| # | Finding | Sev | Source | Proof | Fix |
|---|---------|-----|--------|-------|-----|
| 1 | `kids.length` pinned only `<=3`/`>0`, not exact 3 | Med | **[TEST]** ([RULE]) | MUT-A (1-child) survived → now FAIL(caught) | `toBe(MIRV_MAX_CHILDREN)` + single-target replacement case |
| 2 | MXICON on-screen cap untested | Med | **[TEST]** **[RULE]** | MUT-E (cap bypass) survived mirv-tests → now FAIL(caught) | 6-ICBM fixture asserts roster `=== MXICON`, never exceeds |
| 3 | one-per-frame tie-break untested | Med | **[TEST]** **[RULE]** | MUT-G (split-all) survived → now FAIL(caught) | 2-in-band fixture asserts exactly one splits (`=== 5`) |
| 4 | suppression pre-frame count unguarded | Med | **[TEST]** | (post-count mutant is compile-blocked) | forward regression guard: 11 blasts + same-frame ABM detonation → still splits |
| 5 | JSDoc `mirv.ts:34` leaked `128/160` past AC3 scanner | High | **[DOC]** **[RULE]** | scanner regex is per-line, misses multi-line block | reworded to `[MIRV_LO, MIRV_HI]`, no digits |
| 6 | `game.ts` comment overclaimed `STX MIRVIX` order | Med | **[DOC]** | ROM ICPOSI counts DOWN → lowest slot wins, not "last" | comment now states real invariants (one-per-frame + MXICON), disclaims exact slot-order |
| 7 | "does NOT test Icbm.kind" implies field exists | Low | **[DOC]** | `Icbm` has no `kind` until mc5-3 | reworded |

**Per-subagent incorporation:**
- **[TEST]** (reviewer-test-analyzer): findings #1–#4 above (vacuous/loose count assertions, untested MXICON cap, untested one-per-frame, untested pre-frame suppression count) — all closed.
- **[DOC]** (reviewer-comment-analyzer): findings #5–#7 above (JSDoc numeric leak, `STX MIRVIX` order overclaim, `Icbm.kind` wording) — all closed.
- **[RULE]** (reviewer-rule-checker): all rules PASS (purity, AC3 citations, determinism, core/shell boundary, gates green); it independently corroborated the JSDoc leak (#5), the MXICON-cap gap (#2), the tie-break gap (#3), and the loose `kids.length` bound (#1) under TS-checklist #15. No blocking defects.

**Correction to the archived record (I do not edit Dev's entry):** the Dev deviation's closing "**Fidelity note**" claims *"last in-band eligible matches the ROM's STX MIRVIX overwrite."* That is **inaccurate** — comment-analyzer verified ICPOSI initialises `XLOOP=IBLOOP` (NICBMS-1, the highest slot) and `DEC`s to 0, so `STX MIRVIX`'s surviving value is the *lowest* slot, the opposite of our ascending "last". Our array index is also not the ROM slot index. The `game.ts` comment has been corrected to claim only the faithful, tested invariants (one-per-frame + MXICON); the exact split-victim is a deliberate, disclosed deviation. No behavioral consequence (which ICBM splits doesn't change the count or the bound).

**Standing residual (non-blocking, no action):** the citation gate checks quotes not meaning ([[citation-gate-checks-quotes-not-meaning]]) — the `POTENT` "+1 = 3 shots" derivation is asserted with the same reading the claim states; a wrong reading would ship green. Pre-existing project-wide limitation, not introduced here.

## Subagent Results

| Subagent | Enabled | Received | Outcome |
|----------|---------|----------|---------|
| reviewer-preflight | inline | Yes | 862/862 green, `tsc` clean |
| reviewer-test-analyzer | yes | Yes | findings (child count, MXICON, one-per-frame, pre-frame count) — all closed |
| reviewer-comment-analyzer | yes | Yes | findings (JSDoc leak, STX MIRVIX overclaim, kind wording) — all closed |
| reviewer-rule-checker | yes | Yes | PASS all rules; corroborated the 3 test gaps; no blocking defects |
| reviewer-edge-hunter | no (disabled) | Skipped | covered by hand-run mutation battery (7 mutants) |
| reviewer-silent-failure-hunter | no (disabled) | Skipped | n/a (pure reducer, no error paths) |
| reviewer-type-design | no (disabled) | Skipped | rule-checker covered TS type checklist |
| reviewer-security | no (disabled) | Skipped | n/a (pure core, no I/O) |
| reviewer-simplifier | no (disabled) | Skipped | mutation battery + simplicity reviewed inline |

**All received: Yes**

**Handoff:** phased tdd → SM (Baldur) for finish.