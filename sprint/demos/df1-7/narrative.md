# df1-7

## Problem

Problem: The project's top-level guide (CLAUDE.md) told everyone the arcade had "nine" game clones split into "five vector" and "four raster" games — but the guide actually *listed* ten games by name, and one of those raster games (Millipede) wasn't mentioned in the descriptive sentence at all. Why it matters: This file is the first thing any engineer or AI assistant reads before touching the project. When the summary numbers don't match the actual list of games, people lose confidence in the document and have to double-check everything else it says — and a completely shipped, live game (Millipede) was invisible to anyone skimming the roster.

## What Changed

Think of CLAUDE.md as the "About Us" page for this project. It had a sentence like "we have 9 employees: 5 in sales, 4 in support" — but the actual staff directory below it listed 10 names, and one of the support staff wasn't mentioned in the summary sentence at all. This fix corrects the sentence to say "11 employees: 5 in sales, 6 in support" and adds the missing name (Millipede) into the summary, placed right after its closest sibling game (Centipede) so the list still reads in a sensible order. Nothing about the actual games changed — only the description of them was corrected to match reality.

## Why This Approach

This was a pure documentation correction, so the engineering approach was simple: find where the numbers and the list disagree, fix the count, and insert the missing item in a logical spot rather than tacking it onto the end. The team also recognized that a one-time fix doesn't prevent the same mistake from happening again next time a game is added — so rather than just patching the text, they filed a new follow-up ticket (df1-9) to build an automated check that keeps this count honest permanently, plus two other places (a README comment and a hosting table) where the same stale "nine games" story was still lingering. That's a deliberate choice to separate "fix the visible symptom now" from "prevent the root cause later" rather than trying to do everything in one small change.
