# ml12-2

## Problem

Problem: In Millipede, when the segmented "train" of enemies got cut into pieces mid-battle (from the player shooting it), the front piece of a headless section would sometimes run straight off the edge of the screen and pop back out the other side — repeatedly, in a dead-straight horizontal line. Why it matters: the original 1982 arcade game never does this; every segment, whether it still has its distinctive red head or not, is supposed to hit the screen edge, turn around, and drop down a row, just like the classic centipede-style march. Seeing a piece of the enemy vanish off one side and instantly reappear on the other broke the illusion of a faithful recreation and made the game look buggy during play.

## What Changed

Think of the millipede as a train of cars. Only the lead car (the "head") used to know the rule "when you hit the wall, turn around and drop down." The other cars ("bodies") just followed whoever was in front of them. Normally that's fine — the head always turns first, and the cars behind it turn when they catch up to where the head turned.

But when the player shoots the train and breaks it into separate segments, the front car of a now-headless piece has nobody ahead of it to follow and no head-turning rule of its own — so it just kept driving straight through the wall and materialized on the opposite side of the screen, like a video glitch. We gave every car in the train — not just the head — the same "when you hit the edge, turn around and drop a row" rule. Now any leaderless front piece turns exactly like a head would, so nothing ever drives off-screen and reappears.

## Why This Approach

The team looked at how the original arcade hardware handles this and found that the real game avoids the problem differently: whenever a train gets split by gunfire, the original hardware "promotes" a new head onto each broken-off piece so it inherits the turning behavior automatically. Rebuilding that full promotion mechanism is a bigger, separate piece of work already tracked for later.

For this fix, the team applied the simpler, safe equivalent: instead of waiting for a full "promotion" system, just give every segment the same edge-turning check the head already uses. In a normal, unbroken train this changes nothing — a body only ever reaches the edge at the same moment it would have turned anyway by following its leader. It only kicks in for the broken/headless case that was actually going wrong, so it fixes the bug without touching or risking any of the well-tested normal march behavior.
