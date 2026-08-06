---
story_id: "jt9-48"
jira_key: "jt9-48"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-48: Port B2DIRA/SHDIRA: collision-driven bump-facing consumes jt9-17's PBUMPX

## Story Details
- **ID:** jt9-48
- **Jira Key:** jt9-48
- **Workflow:** tdd
- **Stack Parent:** none (stack root)
- **Points:** 3
- **Branch:** feat/jt9-48-b2dira-shdira-bump-facing
- **PR:** https://github.com/slabgorb/arcade/pull/35

## Story Context

Routed from jt9-17 (TEA + Dev, 2026-08-05). jt9-17 built OSTLR (the horizontal bounce) and created the PBUMPX home (DemoProcess.bumpX, drained by drainProcessBumpX at the TOP of stepDemo, WRAPX :7270-7288). It did NOT wire the DIRECTION routines bump-facing arms: B2DIRA (JOUSTRV4.SRC:4148-4150) and SHDIRA (:4379-4381) turn a smart enemy to FACE ALONG its accumulated PBUMPX after a collision shove (LDA PBUMPX,U / BEQ B2FDIR / STA PFACE,U).

This is COLLISION-DRIVEN STEERING facing, distinct from OSTLR own unconditional PFACE turn that jt9-17 DID build: B2DIR/SHDIR read PBUMPX during the enemy steering decision and orient the enemy along the shove.

### Scope
1. In B2DIR/SHDIR (enemy.ts), when PBUMPX != 0 set enemy facing to sign(PBUMPX) before the aim runs; read the parked DemoProcess.bumpX before the drain clears it (drain runs at the TOP of stepDemo so last-frame bump is readable this frame).
2. Promote the de-scoped steering-source pins to LAWS/CITED_RANGES rows with committed claims for :4148-4150 and :4379-4381.
3. Behaviour test: an enemy given a rightward PBUMPX faces right on its next steering decision.

### Notes
- Deferred from jt9-17 because it had no failing test there (TEA logged a major test-omission deviation)
- Couples to the enemy.ts steering subsystem
- Provenance pins currently de-scoped in plugins/joust/tests/steering-source.test.ts (write-set membership :121/:130 + toContain(PBUMPX,U) :122/:131)
- Promotion trips the claimCovers gate (needs committed claims)
- WATCH: likely a fingerprint-mover (facing ripples steering); expect a determinism re-baseline in its own commit
- Prereq (PBUMPX home) is DONE by jt9-17

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T23:14:52Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T22:25:52.157605Z | 2026-08-06T22:28:07Z | 2m 14s |
| red | 2026-08-06T22:28:07Z | 2026-08-06T22:54:40Z | 26m 33s |
| green | 2026-08-06T22:54:40Z | 2026-08-06T23:02:36Z | 7m 56s |
| review | 2026-08-06T23:02:36Z | 2026-08-06T23:14:52Z | 12m 16s |
| finish | 2026-08-06T23:14:52Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **[TEA][Gap][non-blocking] The shadow's SHDIRA is reached by HUNTING shadows too — descoped, filed jt9-60.** jt9-48 wires the shadow bump only on its null-target SHLEV route (steerWake's domain). But SHDIRA (:4379-4381) is also reached by a hunting shadow: `SHLEP → SHLEPB → JMP SHDIRA` (:4303-4310, unconditional) and parked seeks via `SHDIRB → BEQ SHDIRA` (:4388-4389). So a hunting shadow with a parked bump should face along it too, and after jt9-48 will not. Same bucket as the already-filed SHDIRB-coast finding. Filed as **jt9-60** (2pt, backlog).

### Reviewer (code review)
- **[Reviewer][Improvement][non-blocking] Bump read POST-drain drops shoves ≤3 — filed jt9-61.** The ROM reads full PBUMPX in B2DIR before WRAPX drains (brain-before-movement); the port reads the post-top-drain remainder, so `|bump|≤3` (the common organic magnitude) never bump-faces. Softened by jt9-17's OSTLR immediate turn (B2DIRA only maintains). Repro in the Reviewer Assessment. Filed **jt9-61** (p2). Includes the LOW test-realism note (wiring `bumpX=16` unreachable organically).

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Sm Assessment

**Routing:** New-work setup for jt9-48, a 3pt tdd (phased) story in epic jt9 (joust), routed forward from jt9-17. Gates clear at setup: no open PRs (merge gate), clean `develop`, no sibling branch racing this id on origin. Branch `feat/jt9-48-b2dira-shdira-bump-facing` cut from `develop`. No Jira in this project — claim step is n/a.

**For TEA (RED phase):** This is a fidelity port with two coupled surfaces —
1. **Behaviour** in `plugins/joust/src/core/enemy.ts`: B2DIR/SHDIR must, when the parked `DemoProcess.bumpX` != 0, set enemy facing to `sign(bumpX)` before the aim runs. Read the parked bump BEFORE the top-of-`stepDemo` drain clears it (last-frame bump readable this frame — jt9-17 built that home). Distinct from OSTLR's unconditional PFACE turn jt9-17 already shipped.
2. **Provenance**: promote the de-scoped pins in `plugins/joust/tests/steering-source.test.ts` (write-set membership :121/:130 + `toContain(PBUMPX,U)` :122/:131) to LAWS/CITED_RANGES rows with **committed claims** for JOUSTRV4.SRC :4148-4150 (B2DIRA) and :4379-4381 (SHDIRA) — promotion trips the `claimCovers` gate, which needs the claims committed.

**Watch (from story + prior joust sessions):** likely a determinism fingerprint-mover — facing ripples steering — so expect a replay re-baseline; keep it to its own commit. Prior enemy-steering stories note boundr flap can mask facing changes; prefer a shadow/climb harness to observe the bump-facing cleanly. jt9-17 logged this as a major test-omission deviation (no failing test existed there), so a real behaviour test — "an enemy given a rightward PBUMPX faces right on its next steering decision" — is the core of RED.

## TEA Assessment

**RED committed** (`da526234`). `npx vitest run --project joust`: **10 failed / 2998 passed** — every failure is a jt9-48 test; no existing test regressed. Type check (`npm run lint`) clean.

### The ROM I read firsthand (JOUSTRV4.SRC, vendored)
`B2DIRA` (:4148-4150) / `SHDIRA` (:4379-4381) are the shadow/hunter **bump arms** and the ONLY two `PBUMPX` reads in the whole direction region (3780-4450) — `BODIR` (:3876, the bounder) has none, so excluding the bounder is faithful. The arm: `LDA PBUMPX,U / BEQ B2FDIR / STA PFACE,U` — a non-zero shove is the **last word on facing** before the aim (`B2FDIR`/`SHFDIR`, `LDA PFACE / BMI` ⇒ PFACE<0 = LEFT). It is reached on **every** B2DIR/SHDIR exit, not just the parked branch: the parked `BEQ B2DIRA` (:4105), open-air `BEQ B2DIRA` (:4121), AND a cliff turn — `B2DICL` (:4142-4146) installs the slow episode + `LDB #1` then **falls through** into `B2DIRA` (:4147-4148), so a shove overrides even the turn-away it just wrote. `sign(bumpX)` maps to the port's +1=right / −1=left.

### What Dev (GREEN, Julia) must build
1. **`steerWake` gains a 3rd param `bumpX` (default no shove)** — the contract is pinned in `tests/helpers/steering-contract.ts`. On a `b2undr` (any velXIndex) or null-target `shadow` wake that is NOT lava-diverted, after the look-ahead resolves, `if (bumpX ?? 0) !== 0` set `facing = bumpX > 0 ? 1 : -1` (overriding a turn's facing; the `turned` episode/flap is preserved). The bounder/linet/grounded early-returns and the lava-gate return must come BEFORE the bump so those stay green.
2. **Wire the shove in** — `stepEnemyDetailed`'s ctx gains `bumpX`, passed to `steerWake`; `frame.ts` (enemy step, where `p.bumpX` is in hand) passes `bumpX: p.bumpX`. This is the exact hop jt9-17 left inert.
3. **Commit a claim per range** — `claimCovers` reds until a `docs/rom-study/claims/*.json` entry has `source.line` inside 4148-4150 and inside 4379-4381 (add to `steering.json`, JT-style ids; keep ids unique).
4. **Expect a determinism re-baseline** in its OWN commit — enemies now change facing after an OSTLR bounce, so seeded replays with bounces move. The wiring file's `trajectoryHash` is run-to-run (won't break); watch golden-hash replays elsewhere.

### Rule coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#4 null/undefined** — `bumpX` is optional (`DemoProcess.bumpX?`); explicit `undefined` (omitted arg) and `0` are BOTH pinned as no-ops (`undefined != 0` is true in JS — a naive `!= 0` would face `sign(NaN)`).
- **#14 derived edge in one branch** — facing is derived; the "MOVING hunter in open air" + "override a cliff turn" tests force the bump across ALL three B2DIR exits, not one branch.
- **#15 token-vs-claim** — the source LAWS rows match the specific `FACE, BUMPED DIRECTION` comment (not a bare keyword); CITED_RANGES uses the real `claimCovers` gate.
- **#8 test quality** — every test asserts a facing value or `turned`; controls (zero/undefined/lava/bounder/linet/grounded/no-shove-in-play) are green-before-AND-after, so they guard over-application rather than sitting vacuous.

### Non-vacuity of the green controls
Each control flips red if Dev over-applies the bump: zero/undefined → guards the `BEQ` no-write; lava-diverted → guards ordering before the `$D3`/`$D0` gate; bounder/linet → guards the brain-type gate; the moving-open-air and cliff-override REDs guard against a "parked-only" under-implementation.

## Dev Assessment

**GREEN committed** (`2ac3533d`). Full joust suite: **3008 passed / 0 failed** (was 10 RED). `npm run lint` clean. All work on branch `feat/jt9-48-b2dira-shdira-bump-facing`.

### What I built (minimal, three edits + provenance)
1. **`enemy.ts steerWake(enemy, target, bumpX = 0)`** — a `bumpFace` helper applied to the THREE tail returns (`vx===0` parked, open-air `mask===0`, and the cliff-turn return): `bumpX>0 → facing 1`, `<0 → -1`, else untouched (the `BEQ B2FDIR` no-write). It sits AFTER the `!airborne`, lava-gate, and brain-type early-returns, so grounded / lava-diverted / bounder / linet never reach it — the ROM's B2DIRL/`$D0` divert and the `DSMART` brain gate. A shove overrides a cliff turn-away but preserves `turned` (episode + flap), exactly the `B2DICL`→`B2DIRA` fall-through.
2. **`enemy.ts stepEnemyDetailed`** — ctx gains `bumpX`, read as `ctx?.bumpX ?? 0`, handed to `steerWake(flipped, target, bumpX)`. `stepEnemy`'s pinned 2-field signature is untouched (enemy-contract.ts pins it).
3. **`frame.ts`** — the enemy step passes `bumpX: p.bumpX`; `PBUMPX` promoted to `ProcessSpec` (alongside `facing`/`prevFlapHeld`, same process-level home and reason) so `p.bumpX` is typed. This closes the exact hop jt9-17 left inert.
4. **Provenance** — `steering.json` gains `JT948-001` (B2DIRA :4148, byte-exact verbatim) and `JT948-002` (SHDIRA :4379); the promoted CITED_RANGES go green via `claimCovers`. README claim count 978→980 (the audio-seam-scope derived-count census, both sites).

### Design notes for the Reviewer (Heimdall)
- **`bumpFace` uses `>0/<0`, not `Math.sign` or `!= 0`** — deliberately NaN/undefined-safe (both comparisons false → facing untouched), which is what keeps the omitted-arg and zero-bump controls green (#4).
- **No determinism re-baseline was needed.** The story predicted a fingerprint-mover, but nothing regressed: the arm fires only on a bird carrying a live `bumpX`, and the seeded replay windows (staged-hunter `trajectoryHash`, the jt2/jt5 scheduler replays) don't produce an enemy shove in-window. The mechanism is NOT inert — the injected-bump wiring tests (`stepFrame` bare + `stepDemo` full) prove it fires end-to-end; organic shove generation is jt9-17's OSTLR, tested there.
- **Scope held.** Shadow bump is wired only on the null-target SHLEV route (steerWake's domain); the hunting-shadow `SHLEP`/`SHDIRB`→`SHDIRA` reach is descoped and filed as **jt9-60** (Delivery Finding above).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 3008 vitest + 408 orchestrator + lint all green, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes
**Total findings:** 0 confirmed-blocking, 2 deferred (filed jt9-61), 0 dismissed

With 8 of 9 specialists disabled, I ran a **mutation battery** myself (the real bug-finder here) plus firsthand ROM re-derivation.

## Reviewer Assessment

**Verdict:** APPROVED

**Mechanism — verified correct.** `steerWake`'s `bumpFace` applies `sign(bumpX)` as the last word on facing across all three B2DIR/SHDIR tail exits (parked, open-air, cliff-turn override), gated correctly behind the lava-divert and brain-type early-returns. Mutation battery confirmed the tests have teeth:
- Remove `bumpX: p.bumpX` from frame.ts → 2 wiring tests red (the wiring is genuinely tested, not vacuous).
- `bumpX > 0` → `>= 0` → 11 tests red (the zero/undefined no-write guard is well-covered).
Both restored to green. ROM re-derived firsthand: B2DIRA/SHDIRA (:4148-4150/:4379-4381) are the only two `PBUMPX` reads in the direction region; `sign(bumpX)` and the bounder/linet/lava exclusions are faithful.

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#4 null/undefined** — `bumpX` optional, `?? 0` at the ctx seam, `>0/<0` guard is NaN/undefined-safe. ✓
- **#14 derived-edge-in-one-branch** — the derived facing is applied across ALL three exits, tested independently. ✓
- **#3 exhaustiveness / #8 test quality** — no vacuous assertions; controls flip under mutation. ✓
- **comment accuracy** — the stale "port does not model" comment was de-staled; new claims byte-exact. ✓

### F1 [MEDIUM][fidelity — deferred, filed jt9-61] The bump is read POST-drain, so shoves of magnitude ≤3 never bump-face.
`drainProcessBumpX` runs at the TOP of `stepDemo` (jt9-17) and spends ≤3 px BEFORE `stepFrame` runs the brain, so the brain reads the post-drain remainder. **Verified empirically:** bump 2→facing unchanged, 3→unchanged, 4→faces (rem 1), 5→faces (rem 2), 16→faces (rem 13). The ROM reads the FULL PBUMPX in B2DIR/SHDIR (`JMP [DSMART,X]` :3964 → B2DIRA :4148) BEFORE WRAPX (:3140/:6010, the MOVEMENT phase) drains it — brain-before-movement. Organic shoves (`bounceApartX = velX>>1`, velX even ≤8) are frequently ≤3, so the bump-facing MAINTENANCE is lost for the common case.
**Why non-blocking / not a REJECT:** (a) jt9-17's OSTLR already sets the IMMEDIATE facing on the bounce frame — B2DIRA only MAINTAINS it during the drain, so the visible turn still happens; (b) the defect is rooted in jt9-17's drain-at-top ordering, and the faithful fix (drain-after-brain, or thread the pre-drain value) risks re-baselining jt9-17's drain tests — disproportionate for a 3pt story whose mechanism is correct; (c) the story's own guidance is internally ambiguous ("read BEFORE the drain clears it" vs "the top-drain leaves last-frame bump readable"), so Dev's post-drain read is a defensible interpretation. Filed **jt9-61** (p2 bug) with the repro.

### F2 [LOW][test — deferred, folded into jt9-61] The wiring test's `bumpX=16` is unreachable organically.
Organic max is ~5 (`velX>>1`, velX≤8). `16` over-margins the drain-survival (remainder 13), so the FULL-stepDemo "survives the drain" claim doesn't probe the realistic boundary (bump 4 → rem 1; bump 3 → rem 0). Valid as a mechanism proof, but jt9-61 should retest at realistic magnitudes and characterize 1..5.

**No Critical/High.** Mechanism correct, tests have teeth, provenance sound, no smells. The two findings are documented fidelity/test refinements, filed and repro'd, not defects in what jt9-48 claims to deliver.