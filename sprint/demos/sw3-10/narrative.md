# Narrative

## Problem Statement
**Problem:** The Death Star — the signature target players attack in the space combat phase of the *Star Wars* arcade game — was rendering with a visible defect. Instead of a smooth, solid-looking sphere, a jagged, X-shaped spike jutted out of its side, making the iconic shape look broken, "inside-out," or turned inside itself.

**Why it matters:** The Death Star is one of the most recognizable objects in the game and a centerpiece of the space-combat sequence we're rebuilding to faithfully match the original 1983 arcade cabinet. A visibly glitched hull breaks the illusion of authenticity for players and undercuts confidence in the visual polish of this ROM-fidelity effort, which is a priority (P1) initiative this sprint.

## What Changed
Picture the Death Star as a ball with a small "eye" drawn on it — that's the superlaser dish, the concave dish that gives the Death Star its distinctive look. That eye had been drawn on the *side* of the ball, the part that's always turned away from the camera during play. Seen edge-on like that, a circular dish collapses visually into a crossed, spiky line — which is exactly the "broken" artifact players were seeing.

The fix moves that one feature — and only that feature — from the side of the ball to the front, facing the player, where it belongs for the entire game. Nothing else about the sphere's shape changed.

## Why This Approach
Before touching anything, the team first ruled out the more alarming possibility: that the sphere itself had been built backwards, which would have meant reconstructing the entire 3D shape from scratch — a bigger, riskier job. Using an automated, repeatable check that renders exactly what a player would see, they proved the sphere was already correct and isolated the problem to one misplaced decoration.

That let them make the smallest possible fix: reposition the one feature, confirm it stays properly recessed and seamlessly attached to the ball, and leave everything else — including how the game draws graphics in general — completely untouched. Smaller, more targeted fixes carry lower risk of introducing new problems elsewhere, and this one was verified with 719 automated checks, all passing, before it shipped.

## Before/After
| | Before | After |
|---|---|---|
| **Visual appearance** | Crossed, spike-shaped artifact jutting from the side of the sphere | Clean, solid-looking sphere with a centered concave dish facing the player |
| **Root cause** | Superlaser dish geometry seated on the sphere's side axis (facing away from the camera) | Dish geometry seated on the camera-facing axis |
| **Player-facing read** | Looked "inside-out" or broken | Reads as the authentic, iconic Death Star silhouette |
| **Scope of fix** | — | One file, one feature repositioned; sphere shape, game logic, and rendering engine all unchanged |
| **Verification** | — | 719/719 automated tests passing, including 5 new tests written specifically to catch this defect |
