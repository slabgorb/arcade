---
story_id: jt9-20
jira_key: jt9-20
epic: jt9
workflow: tdd
---
# Story jt9-20: Shadow SHDIRB coast — SHDN/SHUP wakes write dir 0; our shadow() thrusts at facing (:4388-4392)

## Story Details
- **ID:** jt9-20
- **Jira Key:** jt9-20
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T00:34:14Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T00:17:07Z | 2026-08-06T00:20:02Z | 2m 55s |
| red | 2026-08-06T00:20:02Z | 2026-08-06T00:27:58Z | 7m 56s |
| green | 2026-08-06T00:27:58Z | 2026-08-06T00:30:22Z | 2m 24s |
| review | 2026-08-06T00:30:22Z | 2026-08-06T00:34:14Z | 3m 52s |
| finish | 2026-08-06T00:34:14Z | - | - |

## Technical Approach

### ROM Ground Truth (JOUSTRV4.SRC:4388-4392), confirmed byte-for-byte:
```
SHDIRB  LDA  PVELX,U   ; horizontal velocity index
        BEQ  SHDIRA     ; PVELX==0 (parked) → SHDIRA (the turn/aim writer)
        CLRA
        STD  CURJOY     ; PVELX!=0 (moving) → CURJOY=0 → COAST, no thrust
        RTS
```

**IMPORTANT SUBTLETY:** The coast is CONDITIONAL on PVELX!=0 (a MOVING shadow). A PARKED shadow (velXIndex===0) falls through BEQ to SHDIRA and still aims. So the correct fix is "coast when moving, else keep the SHDIRA turn/aim" — NOT "always dir=0 on SHDN/SHUP". A Dev who unconditionally zeroes dir on those branches will over-correct.

### The Bug
Our port's shadow() (plugins/joust/src/core/enemy.ts:855-893) returns `dir = enemy.facing` on EVERY branch — including the SHDN free-fall branch and the SHUP long-range up-seek branch, both of which exit through SHDIRB in the ROM. That is continuous horizontal thrust the ROM does not apply to a moving shadow. The fix is in shadow()'s dir channel only.

### Structural Pins to Extend (from jt8-3)
- plugins/joust/tests/steering-source.test.ts:86 — "SHLEP exits through the throttle to SHDIRA" (JOUSTRV4:4310)
- :87 — "SHDIRB: the long-range seeks COAST while moving" (JOUSTRV4:4388, must: SHDIRB/LDA/PVELX,U)
- :88 — "SHDN exits through SHDIRB" (JOUSTRV4:4255)
- :203 — law row "SHDIRB — the seeks coast (filed finding)" (4388-4392)

### Determinism Caveat
If the shadow's drift shape changes, the demo-replay determinism fixtures may need a re-baseline. TEA/Dev should verify whether the replays actually shift; do not assume they do or don't.

## Delivery Findings

No upstream findings.

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## SM Assessment

**Story verified accurate at setup.** Before spawning sm-setup I measured the epic
description's falsifiable premise against both the ROM and the port; it is CURRENT tree
truth, so the ACs were copied verbatim with no correction banner.

- **ROM ground truth confirmed byte-for-byte** at JOUSTRV4.SRC:4388-4392 (SHDIRB): a
  moving shadow (PVELX≠0) writes `CURJOY=0` → coast; a parked shadow (PVELX==0) falls
  through `BEQ SHDIRA` and still aims. The coast is CONDITIONAL — TEA/Dev must not zero
  the dir channel unconditionally on the SHDN/SHUP branches.
- **Bug confirmed** at plugins/joust/src/core/enemy.ts:855-893 — shadow() returns
  `dir = enemy.facing` on every branch, thrusting where a moving shadow should coast.
- **Quarry located:** jt8-3's structural pins at steering-source.test.ts:86-88,203 are
  the routing proofs to EXTEND, not re-derive.
- **Contention probes clean:** no remote branch owned jt9-20 at setup; only sibling
  session live was bz5-4 (a-2, battlezone, unrelated). Claim (stamp+context) pushed to
  main; empty branch feat/jt9-20-shadow-shdirb-coast pushed to light the sibling probe.

Scope is the shadow() dir channel only. Handing to TEA for RED.
## TEA Assessment

**RED verified** — 3 failing, 132 passing across the two touched suites.
`npx vitest run --project joust tests/steering.test.ts tests/steering-source.test.ts`
→ `Tests 3 failed | 132 passed (135)`. The 3 REDs are the moving-coast pins; the
4 new guards are green on arrival and constrain the fix.

Followed the story's "extend, don't re-derive" and the audio-seam README-census
gotcha: NO new test file and NO new claim — extended the two existing suites, so
the derived file/claim counts are untouched.

### Acceptance Criteria (defined this phase — sprint YAML had none)
- **AC1** — A MOVING shadow (velXIndex≠0) on the SHDN free-fall writes `dir === 0`
  (coast), not `facing`. [RED]
- **AC2** — A MOVING shadow on the SHUP up-seek writes `dir === 0`. [RED]
- **AC3** — The coast is facing-independent: a left-facing moving shadow also
  writes `0`, not `−facing`. [RED — proves the fix zeroes, not transforms]
- **AC4 (guard)** — A PARKED shadow (velXIndex===0) on SHDN/SHUP still AIMS via
  SHDIRA: `dir === facing` (+1 right, −1 left). Green on arrival — an
  unconditional `dir = 0` fix breaks this. [GREEN]
- **AC5 (control)** — A MOVING shadow on the SHLEP level track still THRUSTS
  (`dir === facing`); SHLEP exits SHDIRA directly (:4310), not SHDIRB. Green on
  arrival — pins the scope boundary. [GREEN]
- **AC6 (provenance)** — steering-source pins extended: SHUP0→SHDIRB (:4267),
  SHUP1→SHDIRB (:4275), SHDIRB CLRA/STD CURJOY (:4390-4391), the parked
  BEQ SHDIRA fall-through (:4389), and SHDIRA's ±1 aim writes (:4384, :4394).
  All pass against the vendored ROM. [GREEN, byte-gated — skips on CI]

### Fix location (for Dev — Loki)
`plugins/joust/src/core/enemy.ts` shadow() (:855-893), the two long-range branches:
- SHDN: `if (!holding && delta >= waveValue('SHDNRG', wave)) return { dir, flap: ... }`
- SHUP: `if (!holding && delta <= waveValue('SHUPRG', wave)) return { dir, flap: ... }`
Replace their `dir` with the SHDIRB rule: `dir: enemy.entity.velXIndex !== 0 ? 0 : dir`
(moving ⇒ coast 0; parked ⇒ keep facing, the SHDIRA aim). Do NOT touch the SHLEP
fall-through, the SHLEV (player==null), the dwell, or the glide branches — they all
map to SHDIRA/SHDIR and correctly keep `dir = facing`. The `flap` channel is already
correct (jt8-3/uf1-9) — this story is the `dir` channel ONLY.

### Determinism caveat (Dev to resolve at GREEN)
The story flags a possible demo-replay re-baseline "if the shadow's drift shape
changes — a claim to verify, not a measurement." Zeroing a moving seek's dir DOES
change enemy horizontal drift, so the replay determinism fixtures may shift. I did
NOT pre-baseline them (the fix hasn't landed). At GREEN, run the full joust suite,
and if the replay digests move, re-baseline them ON THE FIXED tree and note it as a
Design Deviation — that shift is EXPECTED, not a regression.

### Rule coverage
Pure-core boundary honoured: all tests exercise `enemy.shadow()` (pure) via the
contract loader; no shell/DOM. Assertions are all value-checks (`.toBe(0/1/-1)`,
`.toBeGreaterThan/LessThan(0)`) — no vacuous `is*()`/`let _ =` (Phase C self-check
clean). Source pins compare exact vendored line text (byte-gated oracle).
## Dev Notes (GREEN)

**Fix:** enemy.ts shadow() (:878-891) — one `coastDir` const applying the SHDIRB
rule (`enemy.entity.velXIndex !== 0 ? 0 : dir`), used in the SHDN and SHUP returns.
Moving seek ⇒ coast (dir 0); parked seek ⇒ keeps `dir = facing` (the SHDIRA aim).
No other branch touched; the `flap` channel is unchanged.

**Determinism caveat RESOLVED — no re-baseline needed.** TEA flagged a possible
demo-replay shift "if the shadow's drift shape changes." I ran the FULL joust suite
on the fixed tree: **2831/2831 pass**, replay/determinism fixtures included — not one
digest moved. So the drift-shape change does not perturb the recorded demos (they do
not drive a shadow lord through a moving SHDN/SHUP seek at a divergence-visible point).
The caveat is discharged by measurement, not assumed away.

**Verification:** `npx vitest run --project joust` → 2831/2831; the 3 jt9-20 REDs are
now green, the 4 guards still green. `npm run lint` (tsc --noEmit) clean.
## Subagent Results

| Subagent | Enabled | Received | Verdict |
|----------|---------|----------|---------|
| reviewer-preflight | yes | Yes | PASS — 2831/2831 tests, lint clean, no smells |
| reviewer-edge-hunter | no (disabled) | N/A | — |
| reviewer-silent-failure-hunter | no (disabled) | N/A | — |
| reviewer-test-analyzer | no (disabled) | N/A | — |
| reviewer-comment-analyzer | no (disabled) | N/A | — |
| reviewer-type-design | no (disabled) | N/A | — |
| reviewer-security | no (disabled) | N/A | — |
| reviewer-simplifier | no (disabled) | N/A | — |
| reviewer-rule-checker | no (disabled) | N/A | — |

All received: Yes

8 of 9 specialists are disabled on this project (`workflow.reviewer_subagents`), so
per the established pattern I ran a MUTATION BATTERY in an isolated worktree instead
of relying on self-re-reading (which finds nothing).

## Reviewer Assessment

**Verdict: APPROVED.** No findings.

### Mutation battery (the real review — 5 mutations, all caught)
Ran each mutation against the jt9-20 tests in a throwaway worktree; every one is
caught by exactly the test designed to catch it, and the guards fire correctly:

| Mutation | Failed | Caught by |
|----------|--------|-----------|
| unconditional `coastDir = 0` (over-correct) | 2 | AC4 parked-aim guards (SHDN + SHUP both signs) |
| SHLEP return `dir → coastDir` (scope bleed) | 1 | AC5 SHLEP level-route control |
| SHUP left as `dir` (half-fix) | 1 | AC2 moving-SHUP coast |
| SHDN left as `dir` (half-fix) | 2 | AC1 + AC3 moving-SHDN coast |
| moving ⇒ negate facing instead of `0` | 3 | AC1/AC3 literal-0 pins + AC2 |

No mutation survived; no test is vacuous.

### Correctness checks beyond the tests
- **velXIndex ↔ PVELX mapping is sound.** The ROM's SHDIRB reads `PVELX,U` (the FLYX
  travel-direction index; sign = direction, zero = parked); the port's `velXIndex` is
  exactly that ladder index. `velXIndex !== 0 ⟺ PVELX != 0`. Correct.
- **Scope is exact.** `coastDir` is applied ONLY to the SHDN and SHUP `!holding`
  branches. The dwell (:862), glide (:867), SHLEV no-player (:869) and SHLEP
  fall-through (:899) all correctly retain `dir = facing` — each routes to SHDIRA/SHDIR
  in the ROM, not SHDIRB. The `!holding` gate correctly excludes the held level route
  (a running interval holds SHLEP1/SHLEV1, which exits SHDIRA).
- **flap channel untouched**, consistent with the story scoping this to the dir channel.
- **Type annotation** `-1 | 0 | 1` is sound (tsc clean); comment cites the ROM lines.
- **Determinism caveat discharged by measurement** — full joust suite 2831/2831 with
  the demo-replay fixtures unchanged; no re-baseline. Confirmed independently by
  preflight and by Dev's run.

## Delivery Findings

**Impact Summary:** jt9-20 corrects the shadow lord's SHDIRB coast — a moving SHDN/SHUP
long-range seek now writes `dir 0` (coasts) instead of thrusting at facing, matching
JOUSTRV4.SRC:4388-4392; a parked seek still aims via SHDIRA. Fix is a single `coastDir`
const applied to two return sites in `enemy.ts` shadow(). No blocking findings. Tests:
2831/2831 joust, lint clean, demo-replay determinism unchanged. Reviewed by mutation
battery (8/9 specialists disabled). **Blocking: 0.**