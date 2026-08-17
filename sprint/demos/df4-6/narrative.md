# df4-6

## Problem

Problem: The team had built the individual pieces of Defender's enemy behavior — enemies appearing, enemies dying, and enemies capturing humanoids — but those pieces had never been connected together and shown running live on screen. Why it matters: A game feature isn't real to a player until it works together, in real time, in the browser. This story proves the pieces actually work as a system, and specifically confirms that when an enemy dies, the game does NOT flash the whole screen — an important accessibility protection for players sensitive to strobing light, which is a documented safety commitment (ADR-0005) ahead of adding even more intense effects later.

## What Changed

Think of it like this: previously we had built separate LEGO pieces — one for enemies "materializing" onto the screen, one for a small explosion effect when something dies, and one for detecting when a laser hits an enemy — but nobody had snapped them together yet. This story snaps them together and takes a screenshot to prove it works.

Specifically:
- Enemies now visibly **fade/materialize onto the screen** when they spawn, instead of just popping into existence.
- When a laser hits an enemy, that enemy **dies with a small, localized spark effect** at the exact spot where it was hit — not a jarring full-screen flash.
- A "lander" enemy can now be seen **abducting a humanoid** character, matching the classic Defender gameplay.
- All of this was verified against a real running copy of the game at `http://127.0.0.1:5270/defender/`, and compared against a deliberately broken/nonsense page to make sure the screenshot tool is actually looking at the right thing (not just reporting "success" on any page it's pointed at).

## Why This Approach

The team specifically avoided taking a shortcut here: it would have been easy to mark this feature "done" just because the underlying code existed, without ever checking that it actually renders correctly together on screen. Instead, they insisted on capturing a real screenshot of the real running game and comparing it against a "control" screenshot of a nonsensical page — the same rigor used earlier when building the site's core navigation — to guarantee the test isn't just rubber-stamping a webpage that returns "OK" without actually showing anything meaningful.

The accessibility check (no full-screen flash) was treated as a hard requirement, not a nice-to-have, because upcoming features (a "smart bomb" and "hyperspace" screen-clearing effects) will also need to freeze or fade rather than strobe. Confirming the rule holds now, before those features are added, makes it much easier to hold the line later.
