# Narrative

## Problem Statement
Problem: Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70.. Why it matters: a defect was impacting functionality.

## What Changed
We implemented: Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70..

## Why This Approach
This approach addresses the root cause rather than symptoms.

## Before/After
Before: The system exhibited incorrect behavior that affected users.
After: Swept/substepped bolt-vs-port collision — PORT_HIT_RADIUS STAYS 70 (sw3-15's corrected octagon-tight value; do NOT restore 120). sw4-1's restored 12000 u/s bolt (200 u/frame) tunnels the 140-u-diameter port between frames; fix by decoupling anti-tunneling from the hit radius: add a segment-swept or substepped bolt-vs-target hit-test so a fast bolt registers on the small port without inflating it — keep sw3-15's octagon-tight accuracy AND sw4-1's far-plane reach. Unblocks sw4-1 (PR #69): must land first, then sw4-1 rebases and adopts PORT_HIT_RADIUS=70. — the issue has been resolved and verified with tests.
