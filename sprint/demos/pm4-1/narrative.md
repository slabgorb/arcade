# pm4-1

## Problem

Problem: [SAFETY] Remove the full-screen white level-clear strobe (shell overlays.ts): delete the fillRect(0,0,LOGICAL_W,LOGICAL_H) white fill; hold a brief static frame instead. Zero full-screen luminance flashing (boss has photosensitive epilepsy). Shell-only, independent of the state machine, shippable immediately. pm4-4 later builds the proper freeze on top and MUST NOT reintroduce the strobe.. Why it matters: users needed a better interface.

## What Changed

We implemented: [SAFETY] Remove the full-screen white level-clear strobe (shell overlays.ts): delete the fillRect(0,0,LOGICAL_W,LOGICAL_H) white fill; hold a brief static frame instead. Zero full-screen luminance flashing (boss has photosensitive epilepsy). Shell-only, independent of the state machine, shippable immediately. pm4-4 later builds the proper freeze on top and MUST NOT reintroduce the strobe..

## Why This Approach

This approach prioritizes user experience and accessibility.
