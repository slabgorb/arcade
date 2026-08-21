# sa1-1

## Problem

Problem: Every one of the arcade's eleven games draws its screen edges differently — some leave a colored or mismatched margin around the game where the picture doesn't fill the display, and every game does it its own way. Why it matters: players moving between games see the cabinet's "frame" flicker and change instead of feeling like one consistent arcade — small, but it's the kind of polish gap that makes a collection feel unfinished rather than curated.

## What Changed

Think of every game screen as a picture hung in a frame. Before this change, each of the eleven games built its own frame from scratch — different sizes, different treatment of the leftover space around the picture. This story builds one shared "frame shop" (`@shared/cabinet`) that every game now orders its frame from. It does two things: it figures out exactly which parts of the screen are the picture (game/gameplay) versus the mat (the leftover space), and it paints that mat the same dark color everywhere. All eleven games — from twitchy vector classics like Tempest to full-screen raster games like Pac-Man — were individually switched over to use this shared frame, so a player moving between games sees the same edge treatment every time.

## Why This Approach

Rather than touching each game's rendering pipeline directly, the team built one small, well-tested shared component and had every game adopt it individually. That's the same "one recipe, eleven kitchens" approach already used elsewhere in the codebase — write the logic once, prove it's correct once, and let every game plug into it rather than reimplementing similar logic eleven times (and drifting out of sync eleven different ways over time). Games were switched over one at a time and re-tested at each step, so if something had broken, it would point at exactly one game rather than being tangled up with the other ten. This also lays the groundwork for four more polish stories planned for later this quarter (pause screens, mouse behavior, volume, and control remapping) that will reuse this same "one shared piece, adopted everywhere" pattern.
