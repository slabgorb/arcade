# df2-6

## Problem

Problem: The Defender game screen was rendering scrambled — the title text and character graphics were being drawn in the wrong pixel order, producing garbled, unreadable shapes instead of the arcade's original "DEFENDER" title and ship artwork. Why it matters: A garbled screen is the first thing a player or reviewer sees. If the very first frame looks broken, it undermines confidence in the whole game clone before a single second of gameplay happens — and worse, this kind of orientation bug could have gone unnoticed and been built on top of, making it far more expensive to find and fix later.

## What Changed

Think of the game's graphics data like a grid of pixels stored in a filing cabinet. There are two ways to read that cabinet: row by row (left to right, then down) or column by column (top to bottom, then over). The original 1980s Defender hardware stored its images column by column — but the clone was reading them row by row, which is like reading a book by scanning down each column of letters instead of across each line. The result: recognizable shapes became scrambled nonsense.

This story caught that mistake by literally taking a picture of the game screen and looking at it. Once the team saw the garbled text, they traced it back to source, confirmed the original hardware's storage order, and fixed the read order in two small spots in the code. They also built a brand-new "static still frame" — a single, deliberate snapshot combining the ground/planet surface, the title text, and the player's ship — as a proof image that everything now lines up correctly, in the right colors and the right orientation, before any movement or physics gets layered on top.

## Why This Approach

The team's philosophy here was "see it before you build on it." Rather than assuming the visual output was correct because the underlying tests passed, they added a real screenshot-based check — comparing an actual browser screenshot of the game against a deliberately broken/unrelated page to prove the game page is truly different (not just technically "loading"). This visual-first checkpoint is a known discipline for this project: confirm what's on screen looks right before adding movement, collision, or scoring logic on top of it. Fixing an orientation bug now, while the screen is still just a static picture, is far cheaper than fixing it after physics and animation are layered in.

The fix itself was intentionally minimal — a one-line change in each of two places — because the root cause was precisely isolated: the surrounding test suites for the existing image-drawing code didn't care about pixel ordering one way or the other, so they stayed passing throughout, giving confidence nothing else was disturbed.
