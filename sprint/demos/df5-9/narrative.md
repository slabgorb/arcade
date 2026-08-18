# df5-9

## Problem

Problem: When the ship scrolled across a planet's surface, the terrain and the enemies floating in the world stayed pinned to fixed screen positions instead of moving past the ship the way they should. Why it matters: The core promise of this kind of side-scrolling game is that the world feels alive and continuous as you fly through it — enemies hold their ground while the landscape glides beneath you. With this bug, the ground looked frozen in place and enemies didn't track correctly relative to the ship's movement, breaking the illusion of flight and making the game feel visually broken rather than just difficult.

## What Changed

Think of the game screen like a camera filming a long scroll of paper that represents the planet's surface. As the ship moves forward, the camera should shift to follow it, making the paper appear to slide underneath. The bug was that the part of the code responsible for drawing each frame (`composeFrame`) was drawing the terrain and the enemies at their raw, fixed map coordinates — as if the camera never moved. The fix teaches that drawing code to first subtract the camera's current position from everything before drawing it, so the terrain and enemies are placed correctly relative to where the ship currently is on screen. The result: the ground now visibly scrolls under the ship, and enemies stay correctly anchored to their real position in the world instead of drifting or sitting still incorrectly.

## Why This Approach

The engineering choice here was to fix the drawing step itself rather than patching around it. Every visual element in the world — terrain and enemies alike — needed the same "camera offset" math applied consistently, because inconsistent handling was exactly what caused the bug (some things scrolled, some didn't). By centralizing the offset calculation at the point where frames are composed, the fix guarantees that the terrain and every enemy on screen use the same shared frame of reference. This is also the most maintainable fix: any new object added to the world in the future automatically scrolls correctly, because it goes through this same corrected drawing path — no one has to remember to add camera-offset logic themselves.
