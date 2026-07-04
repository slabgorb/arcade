# Narrative

## Problem Statement
**Problem:** During the first live playtest of Battlezone (our vector-tank-duel arcade clone), obstacles and enemy tanks appeared far closer and larger on screen than their actual in-game distance — players couldn't judge distance accurately, and the world felt cramped and "zoomed in."

**Why it matters:** Distance judgment is the core skill in a tank-combat game — knowing whether an enemy is close enough to hit you or far enough to ignore. If the camera makes everything loom up unnaturally, the game feels unfair and disorienting no matter how good the underlying combat logic is. This was flagged as a p2 (important, not urgent) issue in the very first playtest of the game slice, alongside four sibling issues (canvas stretching, HUD font, aim precision, and missing pause) that together make up the "playtest followup" epic.

## What Changed
Think of the game's 3D camera like a movie camera with two separate settings that got accidentally wired together: one setting controls **what the camera can "see and react to"** (used for targeting and radar), and a second setting should control **what actually gets drawn on your screen** (the picture you see). The code was using the "targeting" setting to also decide "what you see" — and that setting was too narrow, so everything on screen got visually magnified by about 2.4x, like using a zoom lens by mistake.

The fix introduces a second, dedicated "what you see" setting that's twice as wide as the original targeting setting, and points the on-screen picture at that new, wider setting instead. The targeting/radar logic itself was never touched, so aiming, hit detection, and firing behave exactly as before — only the visual picture changed. A couple of code comments that had become misleading after the fix (claiming the background scenery and the 3D objects always used identical zoom) were also corrected during review, so future engineers don't get tripped up by stale documentation.

## Why This Approach
The team deliberately made the smallest possible change that fixes the symptom: one new number, doing one job (un-zooming the picture), instead of rewriting how the camera works. That keeps the fix low-risk — nothing about how the radar, targeting, or shooting logic works was touched, so there's no chance of quietly breaking "aim here, hit there."

Before writing the fix, the team first wrote an automated check that measures exactly where an object at a known distance should land on screen, and confirmed that check failed under the old (buggy) settings — proving the bug was real and precisely diagnosed, not just "feels off." Only then was the fix written, and the same check now passes. A second engineer independently reviewed the change, caught two pieces of stale documentation left behind by the fix, and sent it back once before approving — a normal part of quality control, not a sign of a problem with the fix itself. The very last word on "does it *feel* right" is intentionally left to a full human playtest later in this epic, because some things — like whether a scene feels too zoomed in — are best confirmed by a person looking at it, not just a number.

## Before/After
| | Before (bug) | After (fixed) |
|---|---|---|
| **What the screen used the same "cone" for** | Targeting/radar range *and* on-screen picture (conflated) | Targeting/radar range unchanged; on-screen picture uses its own, wider setting |
| **On-screen field of view** | ~45° (too narrow — everything magnified) | ~90° (correct, matches the background scenery's horizon width) |
| **Object at edge of targeting range** | Rendered at the very edge of the screen (looked "in your face") | Rendered about 40% of the way from center to edge (reads at correct distance) |
| **Apparent object size/closeness** | ~2.4x larger/closer than actual in-game distance | Matches actual in-game distance |
| **Targeting, radar, firing behavior** | N/A (unaffected either way) | Unchanged — confirmed by test, no regression |
| **Automated verification** | No calibration test existed; bug was invisible to test suite | 9 dedicated tests pin the correct on-screen distance; full 389-test suite passes |
