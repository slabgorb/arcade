# Story ml13-3: Live /millipede/ playtest: confirm a deployed DDT visibly kills train segments with no full-screen strobe (ml12-3 AC3)

**ID:** ml13-3
**Epic:** ml13
**Type:** chore
**Points:** 1
**Priority:** p2
**Workflow:** trivial
**Repos:** arcade

## Background

This is a follow-up verification chore for ml12-3 (Millipede DDT cloud kills segments). The DDT segment-kill gameplay was implemented and unit-proven in ml12-3, and the implementation is strobe-safe by construction. However, the ml12-3 AC3 criterion—"Verified LIVE at the /millipede/ visual playtest: deploying DDT visibly kills train segments in its blast, with no full-screen strobe/flash introduced"—was never performed. This story adds NO new gameplay or code. It is a live observation chore to close that unperformed acceptance criterion with evidence.

### Operational Notes
- This is a VISUAL/live playtest chore. It may require human eyes or browser automation at `/millipede/`. Millipede's input uses pointer-lock; a HUMAN smoke may be needed (see centipede/millipede bootstrap precedent). The implementer decides the observation method.
- **Dev-server port trust:** The port 5270 can be served by a sibling checkout. Before trusting any screenshot, verify whose working tree answers 5270 using an `lsof` cwd probe, or serve on an alternate port. (Sibling a-3 currently has a live mc12-5 session.)

## Acceptance Criteria

1. **Live playtest observation:** At `/millipede/` (served via `just serve`, http://127.0.0.1:5270/millipede/), a deployed/triggered DDT is observed to visibly kill the train segments within its blast region during live play.

2. **Accessibility gate respected:** No full-screen strobe/flash is introduced by the DDT kill—the ml7-4 owner-epilepsy accessibility gate is respected during the observation.

3. **Evidence recorded:** The observation is recorded (screenshot and/or written finding) in the session so the previously-unperformed ml12-3 AC3 is closed with evidence.

## Related Stories & Findings

- **ml12-3:** Millipede DDT cloud kills segments (completed; unit-proven and strobe-safe; AC3 live playtest never performed)
- **ml13-1:** Segment kills leave a mushroom (MUSHER) at the dead cell (completed)
- **ml13-2:** Shot-kill of a segment scores the ROM head/body split (completed)
- **ml7-4:** Owner-epilepsy accessibility gate (defines strobe/flash constraints)
