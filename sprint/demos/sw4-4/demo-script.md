# Demo Script — Story sw4-4

## Scene 1: Setup (30 sec)

**Presenter says:** "Problem: Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70.. Why it matters: a defect was impacting functionality."

**Show:** The issue as users experienced it

## Scene 2: Act 1 (2 min)

**Presenter says:** "We implemented: Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70.."

**Show:** ## Demo Script — Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70.

### Scene 1: Setup (30 sec)
**Presenter says:** "Today we're going to show you what we built for Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70.."
**Show:** The project overview

### Scene 2: Demo (1 min)
**Presenter says:** "Let me show you the changes."
**Show:** The implementation in action

### Scene 3: Closing (30 sec)
**Presenter says:** "That's Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70. — shipped and verified."

## Scene 3: Act 2 (1 min)

**Presenter says:** "Before: The system exhibited incorrect behavior that affected users.
After: Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70. — the issue has been resolved and verified with tests."

**Show:** The fix in action, the problem is now resolved

## Scene 4: Closing (30 sec)

**Presenter says:** "The issue is fixed and users can now proceed without problems."

**Show:** The system working correctly after the fix