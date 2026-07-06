---
story_id: "A-20"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-20: Turn rate too coarse for fine aim — hard to line up an accurate shot; verify ship rotation speed/model against ROM reference and retune

## Story Details
- **ID:** A-20
- **Jira Key:** (no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** red
**Phase Started:** 2026-07-06T13:26:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-06T13:24:44Z | 2026-07-06T13:26:43Z | 1m 59s |
| red | 2026-07-06T13:26:43Z | - | - |

## Sm Assessment

**Story:** A-20 — "Turn rate too coarse for fine aim … verify ship rotation speed/model against ROM reference and retune." 2 pts, p2, type `bug`, repo `asteroids`.

**Setup status:** Complete. Session file, story context (`sprint/context/context-story-A-20.md`), and branch `fix/A-20-turn-rate-rom-retune` (off `develop`, gitflow) all created. Merge gate clear — no open asteroids PRs. Sprint YAML carries only the title; no description or ACs recorded.

**Routing:** tdd / phased → hand off to **O'Brien (TEA)** for the RED phase. TEA defines the acceptance criteria (none in YAML).

**Watch-items for TEA (from prior asteroids retune stories — coordination notes, not implementation direction):**
- Asteroids "retune X against ROM reference" stories have historically been *mechanism* changes, not just constant tweaks — verify the rotation model itself (per-frame step, cadence, granularity), not only a single turn-rate value.
- Recover the ROM rotation routine from the disassembly directly (`curl` + `grep` of the raw `nmikstas/asteroids-disassembly` asm) — WebFetch has been unreliable for this.
- Check the preceding asteroids archive session(s) under `sprint/archive/A2-*-session.md` / `A-1*-session.md` for Delivery Findings and any pre-extracted ROM quarry on ship rotation.

**Risks/blockers:** None blocking. Story is well-scoped and self-contained to the asteroids sim.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): ROM verification proved the ship turn rate is ALREADY byte-faithful (+3 dir-units/frame, every frame; `ChkPlyrInput $7086` `LDA #$03`/`#$FD`, `ShipDir` a byte). The "too coarse for fine aim" symptom is a keyboard input-layer limitation (a held key rotates continuously, so the minimum reliable turn is one hold-duration ≈ 25–38°), NOT a sim-fidelity gap. Affects `asteroids/src/shell/input.ts` (tap-to-nudge) and `asteroids/src/shell/tuning-panel.ts` (new gated `?tune` dev tuning tool). *Found by TEA during test design.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **A-20 re-scoped from a sim turn-rate retune to an input-layer tap-to-nudge + gated dev tuning panel**
  - Spec source: sprint/epic-A.yaml, A-20 title
  - Spec text: "Turn rate too coarse for fine aim … verify ship rotation speed/model against ROM reference and retune"
  - Implementation: ROM verification (nmikstas disassembly, `ChkPlyrInput $7086`) confirmed the sim's +3/frame every-frame rotation is already byte-faithful → NO sim change. Fix delivered in the shell: tap-to-nudge (tap = one ROM step, hold = continuous) + a `?tune`-gated dev tuning panel. Sim turn rate exposed as an injectable param defaulting to the ROM value (`SHIP_ROTATION_RATE`), so the default path stays byte-identical.
  - Rationale: retuning the sim would break the epic's fidelity bar; the coarse-aim complaint is a keyboard-affordance problem. Confirmed with the user, who re-scoped to the input layer.
  - Severity: major (scope change; points raised 2 → 5)
  - Forward impact: PR slabgorb/asteroids#27 → develop. Dev tuning panel intentionally retained (gated) for future feel work per user direction.