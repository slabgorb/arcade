---
story_id: "cp7-2"
jira_key: "cp7-2"
epic: "cp7"
workflow: "tdd"
---
# Story cp7-2: The train enters on the score line — the render paints where the ROM says off-screen

## Story Details
- **ID:** cp7-2
- **Jira Key:** cp7-2
- **Workflow:** tdd
- **Points:** 2
- **Repos:** arcade
- **Stack Parent:** none (stack root)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T12:46:49Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T11:34:28Z | 2026-08-04T11:36:27Z | 1m 59s |
| red | 2026-08-04T11:36:27Z | 2026-08-04T11:55:15Z | 18m 48s |
| green | 2026-08-04T11:55:15Z | 2026-08-04T12:09:15Z | 14m |
| review | 2026-08-04T12:09:15Z | 2026-08-04T12:26:18Z | 17m 3s |
| green | 2026-08-04T12:26:18Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## Branch & Runtime

**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch `main`)

## Story Acceptance Criteria

1. No motion object is painted in the V >= 0xF8 band, and the guard is expressed the way the flea's already is at src/shell/render.ts:250 rather than as a new idiom.
2. CENT_ENTER_V (src/core/centipede.ts:64) is UNCHANGED, and tests/centipede.test.ts:152/:164/:170-174, tests/sim-assembly.test.ts:158 and tests/fragmented-train.test.ts:121/:264 all stay green untouched — a red one of those means the wrong layer was changed.
3. The story rules explicitly between a draw gate and a vertical offset, writes down which and why, and names the blast radius of the rejected option — they are not the same fix and gunScreenY is shared with the gun.
4. tests/segment-render.test.ts:97-98 is rewritten to a visible row rather than deleted or weakened; the story states that its 0xF8 fixture was testing the defect.
5. Every HUD glyph still sits at y = cellScreenY(31) (tests/render.test.ts:260, :379-386) and the score, lives and high-score row is unobstructed at wave start, asserted rather than eyeballed.
6. The off-by-one in the entry band (y = 247 - v puts a v=0xF8 sprite at y = -1) is resolved or explicitly recorded as out of scope with a reason — not left unmentioned.

## Key Constraints

- **Sim Layer:** CENT_ENTER_V = 0xF8 at `plugins/centipede/src/core/centipede.ts:64` is byte-cited to CENTI4.MAC:489 and MUST NOT be changed. Editing is automatic reject.
- **Render Gate:** Copy the precedent from `src/shell/render.ts:250` — gate the flea with `if (flea.v < FLEA_PARK_V)` where FLEA_PARK_V = 0xf8. Apply the same pattern to the train.
- **Offset vs Gate Ruling:** The story requires an explicit ruling on whether the fix uses a draw gate (conservative, matches flea) or a vertical offset (larger blast radius, gunScreenY is heavily pinned). Write down which and why.

## Test Impact

### Tests That Will Go Red by Design (Rewrite Scope)
- `tests/segment-render.test.ts:97-98` — builds fixture from segments at v=0xf8, asserts drawImageCount() >= mushrooms + 1 + 3 with HEAD3/HEAD2 stamps. Goes red when segments at 0xF8 stop drawing. Rewriting to a visible row is IN SCOPE.

### Tests That Must Stay Green (Non-Negotiable)
- `tests/gun-vertical.test.ts:42-45` — pins y = 247 - v only over PLAYV_MIN..PLAYV_MAX. A segment-only fix is safe; an offset fix is not.
- `tests/render.test.ts:260` and `:379-386` — require every HUD glyph at y = cellScreenY(31).

### Sim Tests That Must Stay Green (Untouched)
- `tests/centipede.test.ts:152/:164/:170-174` — pin the 0xF8 entry in the SIM
- `tests/sim-assembly.test.ts:158` — assembly invariant
- `tests/fragmented-train.test.ts:121/:264` — fragmented train behavior
If any go red, the wrong layer was changed.

## Commands

```bash
npx vitest run --project centipede     # This app's suite
npm run lint                           # Repo-wide type check
```

## SM Assessment

**Setup complete.** Story was free on every probe: no `cp7*` branch on origin, no `cp7-2`
session in `a-1`, `a-2` or `a-3`, tree clean at `f8d5e1b`. No claim beacon pushed — this
checkout is the only one with a cp7-2 session and the story is now `in_progress`.

Two gaps left by `sm-setup` were filled by hand and are worth knowing about: the session
carried no `**Branch:**` field (finish greps for it and refuses without the literal `none`),
and the six acceptance criteria already filed in `sprint/epic-cp7.yaml` had not been injected
into this file. Both now match the shape cp7-1 finished on. The ACs here and in
`sprint/context/context-story-cp7-2.md` are copies of the YAML — the YAML is the source.

**For TEA:** this is a shell-layer story with a load-bearing "do not touch" on the core. The
RED test must fail because the render paints in the V >= 0xF8 band, not because the sim holds
a segment there — the sim is correct and byte-cited. AC-3 is a written ruling, not code:
decide gate vs. offset before writing the test, because the two fixes have different blast
radii and the test shape follows the ruling.
## O'Brien (TEA) Assessment — RED

**RED committed at `9803860`.** Green baseline was 1223; now 3 failed / 1225 passed.
The 3 failures are the new behavioural gate assertions in
`tests/train-entry-gate.test.ts`, each failing for the honest reason — the
entry-band segment IS requested from the atlas today (`… to not include 'HEAD5'`,
`… 'HEAD2'`, and wave-start `expected [ 'HEAD3', 'HEAD2', 'HEAD7', … ] to deeply
equal []`). The positive halves (`HEAD3`/`HEAD1`/`DIGIT_0`/`GUN`) all pass, so
render ran and the recording atlas captured correctly — not an anchor miss.

### The AC-3 ruling: DRAW GATE, not vertical offset
Recorded in full in the test header. The decisive point is behavioural, not
stylistic: an offset (`y = 248 - v` for motion objects) still **blits** the
wave-start segment — one pixel lower, at `y = 0..7`, still on the HUD row. Only a
draw gate removes it. So the wave-start and band tests **reject an offset fix**:
an offset leaves the HEAD stamp in the requested list. Blast radius seals it —
`gunScreenY` (`y = 247 - v`, layout.ts:111-116) is shared with the gun and pinned
by gun-vertical over PLAYV_MIN..PLAYV_MAX; the gate leaves it untouched, an offset
perturbs it or forks a new motion-object-only idiom AC-1 forbids. **AC-6** is
resolved by the gate: a gated segment is never painted, so it never lands at
`y = -1`; below the band `y = 247 - v` is unchanged.

### For Julia (GREEN) — the minimal fix
The segment loop (`render.ts:289-300`) is the one motion object that blits in the
band ungated. Add the flea's own gate — `FLEA_PARK_V` is **already imported**
(render.ts:39). Skip a segment when `seg.v >= FLEA_PARK_V` (equivalently wrap the
blit in `if (seg.v < FLEA_PARK_V)`), the exact idiom four lines down at the flea.
Do NOT touch `gunScreenY`, `CENT_ENTER_V`, or any core file. No magic `0xF8`
literal — reuse the named constant (the AC-1 source guard enforces this).

### AC coverage
- **AC-1** (band gate, flea's idiom, not a new one) — `train-entry-gate.test.ts`
  band + boundary tests; the named-constant source guard (comments stripped).
- **AC-2** (CENT_ENTER_V unchanged; sim tests green untouched) — verified: the
  full sim suite (centipede/sim-assembly/fragmented-train) stayed green; the fix
  is render-only.
- **AC-3** (gate-vs-offset ruling, written, blast radius named) — test header +
  above; enforced behaviourally (offset fails the band/wave-start tests).
- **AC-4** (segment-render.test.ts rewritten off 0xF8, not deleted) — done; the
  fixture moved to visible rows with a comment naming the defect it had pinned.
- **AC-5** (HUD row unobstructed at wave start, asserted) — wave-start test:
  zero HEAD stamps while `DIGIT_0`/`GUN` still draw (row intact, not erased).
  render.test.ts:260/:379-386 HUD-geometry pins remain green.
- **AC-6** (off-by-one resolved or recorded) — resolved by the gate; recorded above.

### Rule coverage (TS lang-review)
- **#15 (source-text token vs claim):** the AC-1 guard strips comments first and
  targets the mechanism (no magic `0xF8`/`248` in code), not a prose token.
- **#26/#434 (all-local assertions):** stamp names are the render's observable
  output vs. ROM-derived expectations; `FLEA_PARK_V` is anchored by a separate
  `.toBe(0xf8)` rather than compared to itself.
- No `as any` / non-null assertions / `@ts-ignore`. Self-checked for vacuous
  assertions — the "no invented stamps" guardrail is green-now/green-after by
  design (catches a bogus stamp), not vacuous.

**Handoff → Julia (Dev), GREEN phase.**
## Julia (Dev) Assessment — GREEN

**GREEN at `2e7692e`.** 1228/1228 pass; lint clean.

One-line fix, the flea's own idiom: added `if (seg.v >= FLEA_PARK_V) continue` to
the segment loop (`render.ts:289`), with a comment citing the three ROM off-screen
comments and naming the gate-not-offset ruling. `FLEA_PARK_V` was already imported
(render.ts:39) — no new import, no magic `0xF8` literal.

- **Diff:** render.ts only, +8 lines (comment + one gate). No core file touched;
  `CENT_ENTER_V` and the sim are byte-correct and unmodified.
- **Non-vacuous:** mutation-proven — replacing the gate with `if (false) continue`
  reddens exactly the 3 `train-entry-gate` assertions and nothing else; restored.
- **AC-2 verified:** the sim suite (centipede/sim-assembly/fragmented-train) and
  gun-vertical/render stayed green — the fix is render-only.
- Followed TEA's fix note exactly; no scope beyond the gate.

**Handoff → Thought Police (Reviewer).**
## Subagent Results

| Subagent | Tag | Received | Notes |
|----------|-----|----------|-------|
| reviewer-preflight | [PRE] | Yes | Ran inline: `npx vitest run --project centipede` 1228/1228 green, `npm run lint` clean. |
| reviewer-edge-hunter | [EDGE] | Yes | Clean. Independently traced that v>=0xF8 is entry-only; gate hides nothing on-field. |
| reviewer-silent-failure-hunter | [SILENT] | Skipped | No error handling, catches, or fallbacks in an 8-line `continue` gate. |
| reviewer-test-analyzer | [TEST] | Yes | Clean. Mutation-proved gate + offset-rejection; 2 low-sev regex caveats, non-blocking. |
| reviewer-comment-analyzer | [DOC] | Yes | **2 findings** — ROM citation errors in the new comment (see verdict). |
| reviewer-type-design | [TYPE] | Skipped | No new types/casts; one `number >= const` compare, named constant. |
| reviewer-security | [SEC] | Skipped | Client-side canvas render; no auth/secrets/injection surface. |
| reviewer-simplifier | [SIMPLE] | Skipped | Single early-`continue`, the flea's own idiom; nothing to simplify. |
| reviewer-rule-checker | [RULE] | Skipped | Manual rule pass done inline (see Rule Compliance) — proportionate to 8 lines. |

All received: Yes

## Reviewer Assessment

**Verdict:** REJECTED

The behavioural fix is correct and well-tested — the reject is on two confirmed
ROM-citation errors in the comment prose, which in this fidelity codebase are a
real (not cosmetic) defect: they contradict the codebase's own committed
citations for the same ROM facts, and the same wrong citations are duplicated in
the new test's header.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| MEDIUM | `ANTPC :135-137 "REMOVE ANT FROM SCREEN"` — `:135-137` is the flea's `STA ANTV ;VPOS` park (flea.ts:67, flea.test.ts:91/335); the "REMOVE ANT FROM SCREEN" quote is cited at **`:125`** everywhere else (render.ts:333-334, flea.ts:285). Self-contradicts render.ts:333 in the same file. | render.ts:292; train-entry-gate.test.ts:10 | Change to `ANTPC :125 "JSR ANTPC ;REMOVE ANT FROM SCREEN"` (the park position is separately `:135-137 STA ANTV=0F8`). |
| MEDIUM | `SHOOT :2177-2182 "IF OFF TOP OF SCREEN"` — merges two distinct ROM checks. `:2177-2178` is CT-104's alive-test (sim.ts:537, frame-order.test.ts:18/117); the off-top test "IF OFF TOP OF SCREEN" is cited at **`:2181-2182`** (CT-69, centipede.ts:360 — the `SHOT_TOP_SKIP=0xf8` this story leans on) / `:2180-2182` (flea.ts, scorpion.ts). Never `:2177`. | render.ts:291; train-entry-gate.test.ts:8-9 | Change to `SHOOT :2181-2182 "CMP I,0F8 / BCS ;IF OFF TOP OF SCREEN"` (drop the CT-104 lines from the span). |

Both verified against the codebase's committed citations, not asserted — the
grep evidence is in the review log. `ANTMV :59-62` (the third citation) is
CORRECT and matches render.ts:333.

### [DOC] Comments — 2 findings (both resolved at c3ee8a0)
The comment-analyzer found two ROM-citation errors in the new gate comment
(SHOOT `:2177-2182`→`:2181-2182`; ANTPC `:135-137`→`:125`) — see the Findings
table. Both confirmed against the codebase's committed citations and fixed inline.
No other stale/misleading comments; `ANTMV :59-62` is correct.

### [EDGE] Correctness — VERIFIED
The gate `if (seg.v >= FLEA_PARK_V) continue` hides exactly v in [0xF8,0xFF].
Traced core: `CENT_ENTER_V=0xf8` is the only assignment of v=0xF8 (centipede.ts
:230/:237/:258); `bounceDv` reverses at CENT_BOTTOM_V=8 / CENT_BOUNCE_TOP_V=0x30,
both far below 0xF8; `newV = seg.v - dv` has no `& 0xff` wrap, so a descended
segment never re-enters the band. Off-by-one is exactly symmetric with the flea
(`flea.v < FLEA_PARK_V`). Edge-hunter concurs. Correctly also gates mid-play
loose-head entries (:258), which is stronger than a frame-0-only fix.

### [TEST] VERIFIED
5 tests, mutation-proven RED→GREEN. The offset-rejection is real (test-analyzer
independently confirmed a `+1` offset still fails the band tests, because they
assert on stamp *names* not coordinates). AC-1 source guard is a distinct check.
Two low-severity regex-robustness caveats (substring `0xf8` match; a contrived
comment-strip edge) — both safe-direction (over-strict), non-blocking, noted for
the record, no change required.

### [SILENT]/[TYPE]/[SEC]/[SIMPLE] — VERIFIED (skipped, proportionate)
8-line early-`continue` on a byte compare with a named constant: no swallowed
errors, no new types or casts, no security surface, nothing to simplify.

### Rule Compliance ([RULE], manual — TS lang-review)
- No `as any` / non-null assertions / `@ts-ignore` in the diff.
- #15 (source-text token vs claim): the AC-1 guard strips comments and targets
  the mechanism (magic `0xF8`), compliant.
- #26/#434 (all-local assertions): stamp names are render output vs ROM-derived
  expectations; `FLEA_PARK_V` anchored by a separate `.toBe(0xf8)`. Compliant.
- Named-constant reuse over magic literal: compliant (`FLEA_PARK_V`, already
  imported; no `0xF8` literal in render.ts code).

### Devil's Advocate
Could the gate hide a segment the player should see? Only if a live segment
reaches v>=0xF8 on-field — refuted above (entry-only; no wrap; bounce bounds
0x30). Could it fail to hide one? The band is [0xF8,0xFF]; `>=` covers all of it;
a segment can't exceed 0xF8 anyway. Could the reordering (gate before the
live/exploding check) change explosion handling? No — explosions only occur
after descent onto the field, never at v>=0xF8 (edge-hunter confirmed). Could the
wave-start test pass vacuously? No — mutation-proven, and it asserts both the
absence (no HEAD stamps) and the HUD's presence (DIGIT_0, GUN). The only surviving
attack is the prose: a maintainer who trusts the new comment's `:135-137` /
`:2177-2182` citations would mis-locate two ROM routines and, worse, "correct"
the *right* citations elsewhere to match the wrong one — exactly the laundering
this epic's citation discipline exists to prevent. That is why the citation
errors block despite perfect behaviour.

### Design Deviations audit
No deviations were logged; none observed — the fix is the gate the TEA ruling
prescribed. N/A.

**Handoff:** Back to Dev (green rework) — correct the two citation strings in
`src/shell/render.ts` and mirror in `tests/train-entry-gate.test.ts`. No code,
test, or behaviour change; re-run `npx vitest run --project centipede` to confirm
still-green (the AC-1 guard forbids re-introducing a bare `0xF8`, so use the
named line numbers only).
## Reviewer Assessment — Resolution (verdict flipped to APPROVED)

**Both citation findings fixed inline at `c3ee8a0`** (user directed a direct fix
rather than another Dev→Reviewer round). `SHOOT :2177-2182` → `:2181-2182 "CMP
I,0F8 / BCS ;IF OFF TOP OF SCREEN"` (CT-69); `ANTPC :135-137` → `:125 "JSR ANTPC
;REMOVE ANT FROM SCREEN"` — now consistent with render.ts:334, flea.ts, centipede.ts.
Comment-only; 1228/1228 green, lint clean, AC-1 source guard still passes (line
numbers only, no bare `0xF8`). No open findings remain.

**Verdict:** APPROVED