---
story_id: "tp1-28"
jira_key: "tp1-28"
epic: "tp1"
workflow: "trivial"
---
# Story tp1-28: The audit doc says MAYBLR chases on an EVEN invader index. It is ODD, and the error has now propagated through three documents.

## Story Details
- **ID:** tp1-28
- **Jira Key:** tp1-28
- **Workflow:** trivial
- **Type:** bug
- **Points:** 1
- **Priority:** p2
- **Repos:** tempest
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** approved
**Phase Started:** 2026-07-18T12:39:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| implement | 2026-07-18T12:39:01Z | - | - |

## Acceptance Criteria

1. **W-023 claim correction:** W-023's `claim` in docs/audit/findings/pair-1-alwelg-sim-enemies.json no longer asserts an EVEN gate. It states the code's behaviour — the chase falls through on an ODD index — and cites ALWELG.MAC:2157-2160, noting that the ROM's own comment on 2157 contradicts its own code.

2. **Preserve correctness:** The rest of the claim is preserved, including the parts that are RIGHT: TWFUSC's first record starts at wave 17, and TR alternates 0/$40 across 17-32 (the audit had this correct; it was the story that garbled it into a 'ramp').

3. **Citation gate + test guard:** npm test -- citations stays green and `node tools/audit/reanchor-citations.mjs` reports 0 lost. The existing refutation test in tests/core/tp1-25.source-rules.test.ts still passes UNCHANGED — it is the guard that stops this being 'corrected' back.

## Scope Guard

**Do NOT touch the citations' line numbers or the remediated_by mechanics — only the prose that is false.**

ROM source: ~/Projects/tempest-source-text/ALWELG.MAC (LF copy — NEVER the CRLF sibling ~/Projects/tempest-source).

## Delivery Findings

### Dev (implementation)
- **Doc fix** (non-blocking): W-023's `claim` in `docs/audit/findings/pair-1-alwelg-sim-enemies.json` had the MAYBLR chase gate backwards (asserted EVEN index chases; ROM's TXA/LSR/BCC LEFRIT at ALWELG.MAC:2157-2160 shows ODD index chases via fallthrough to JSR FUCHPL, EVEN branches away to LEFRIT). Corrected the false clause only.
  - Before: `"...and MAYBLR only chases on an EVEN invader index (2157-2159). Our fuseball ALWAYS steps toward the player's lane."`
  - After: `"...and MAYBLR's chase (JSR FUCHPL) falls through on an ODD invader index, not an even one: TXA/LSR/BCC LEFRIT (2157-2160) shifts the index's bit 0 into carry and branches to the random LEFRIT path when carry is clear (index EVEN), falling through to FUCHPL only when carry is set (index ODD) — the ROM's own comment on 2157 ('YES. ONLY IF INDEX IS EVEN') contradicts its own code. Our fuseball ALWAYS steps toward the player's lane."`
  - Confirmed via `git diff --stat`: only `docs/audit/findings/pair-1-alwelg-sim-enemies.json` changed, 1 line touched (the `claim` string); no other field of W-023 or any other finding was modified.
  - Gates: `npm test -- citations` — 4 files / 25 tests passed. `node tools/audit/reanchor-citations.mjs` — "103 present in 4232ed4, 0 lost, 0 skipped". `npm test -- tp1-25` — 2 files / 30 tests passed, file unchanged. *Found by Dev during implementation (this was the story's own target defect, not a new discovery).*

### Reviewer (code review)
- **Verification** (non-blocking): VERDICT APPROVED. Independently traced ALWELG.MAC:2157-2160 (LF copy) — `TXA` (2157, comment "ONLY IF INDEX IS EVEN") / `LSR` (2158, bit0→carry) / `BCC LEFRIT` (2159, branches when carry CLEAR = index EVEN → coin) / `JSR FUCHPL` (2160, falls through when carry SET = index ODD → chase). The corrected W-023 `claim` states exactly this (ODD → FUCHPL chase; EVEN → LEFRIT coin) and was NOT re-inverted. ROM-comment contradiction is quoted verbatim. Diff is exactly one file / one logical line (the `claim`); no code/test/other-field/other-finding touched; JSON parses. Corrected claim AGREES with the tp1-25 source-rules guard (which pins the ODD-index refutation at lines 193-218). Previously-correct prose (TWFUSC first record at wave 17; TR alternates 0/$40 across 17-32) preserved verbatim, not garbled. Gates: citations 25/25 green, reanchor "103 present, 0 lost, 0 skipped", tp1-25 30/30 green with test file unchanged. *Found by Reviewer during code review.*

## Design Deviations

No design deviations.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `docs/audit/findings/pair-1-alwelg-sim-enemies.json` - corrected W-023's `claim` prose: MAYBLR's chase (FUCHPL) falls through on an ODD invader index, not EVEN as previously stated; noted the ROM's own 2157 comment contradicts its own code. Cited ALWELG.MAC:2157-2160. Preserved the correct wave-17/TR-alternation prose verbatim. No other field, finding, or file touched.

**Tests:** citations 25/25 passing, tp1-25 source-rules 30/30 passing (unchanged file), reanchor-citations reports 0 lost (GREEN)
**Branch:** fix/tp1-28-mayblr-odd-index-doc (not pushed — per instructions, no push/PR in this phase)

**Handoff:** To next phase
