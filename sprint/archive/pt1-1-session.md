---
story_id: "pt1-1"
jira_key: "pt1-1"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-1: millipede: unexploded DDT pills duplicate as the playfield shifts down — fake copies trail down the screen, only one is real

## Story Details
- **ID:** pt1-1
- **Jira Key:** pt1-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-1-millipede-ddt-pill-duplicate-on-shift
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** red
**Phase Started:** 2026-08-20T07:25:00Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T07:23:39Z | 2026-08-20T07:25:00Z | 1m 21s |
| red | 2026-08-20T07:25:00Z | - | - |

## SM Assessment

**Story:** millipede DDT pills duplicate as the playfield shifts down — a column of phantom pills trails the real one; only one is interactable.

**Type/scope:** Sim/render bug (3 pts, p1) in the `millipede` plugin. TDD workflow — TEA writes the failing RED test first.

**Routing notes for TEA (RED):**
- This is a millipede-only defect; the boundary rule applies — DDT pill state and the playfield shift belong in `plugins/millipede/src/core/`, rendering in `src/shell/`. The RED test should target the pure core simulation (deterministic), not the renderer.
- Likely root cause per the playtest note: on a playfield shift-down the pill's position isn't remapped (stale row retained) or the render draws stale rows. TEA to pin the observed behavior with a deterministic core test that shifts the field with an unexploded DDT pill present and asserts exactly one pill survives at the remapped position — no phantom copies.
- Follow the citation-anchoring discipline if any ROM constant is involved, but this reads as a state-management bug rather than a constant mismatch.

**Next agent:** TEA (RED phase).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Question / blocking]** The reported DDT-pill duplication does NOT reproduce in the current code. Verified three ways: (1) pure reducers — `scrollDown`+`ddtScrollDown` keep the field's DDT-stamp count exactly `2 × intact-table-entries` across many scrolls; (2) integration `stepGame` over 24+ forced down-scrolls stays bounded (stamps oscillate 6↔8 as bombs cull/reseed, never accumulate); (3) **LIVE on the running dev server (checkout a-3, byte-identical millipede DDT/scroll/render files to a-1): `maxPhantom = 0` across 60 forced continuous down-scrolls.** The field only ever shifts through one paired path (`scrollDown`+`ddtScrollDown` in `sim.ts:500-514`); no untracked field mutation exists, and the render is a cleared, 1:1 field→screen draw (`main.ts:243-257`, `fieldPlacements`), with `ddtPlacements(table)` dead/unused. Deployed **millipede-v0.0.8** (released 2026-08-19, playtest day) contains the ml7-9 scroll wiring, so the tested build has identical DDT logic. **Blocking RED:** cannot author a failing test for a defect that does not reproduce. Escalated to user to confirm the observed scenario / reclassify.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->