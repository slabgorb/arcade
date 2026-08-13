# ml4-6

## Problem

Problem: Four different game creatures in Millipede — the bee, dragonfly, mosquito, and earwig — each had their own private, hand-copied version of the same three pieces of logic (how many mushrooms a bee needs before it appears, how it picks its landing spot, and how a creature is cleared from the screen when it's gone). Why it matters: When the same logic lives in four places, a single bug fix or accuracy correction has to be made four times — and if even one copy is missed, the four creatures quietly drift out of sync with each other and with the original 1982 arcade hardware, without anyone noticing until it's rediscovered by a future review.

## What Changed

Think of it like four employees who each independently learned the same company policy and each wrote their own personal cheat-sheet for it. Over time, someone realizes all four cheat-sheets say exactly the same thing, word for word. Instead of leaving four copies lying around, the team writes **one official policy document**, and each employee's cheat-sheet is replaced with "see the official policy" — so everyone still does their job exactly the same way, but now there's only one place to update if the policy ever changes.

Concretely: a brand-new file, `bee-family.ts`, now holds the four shared calculations (mushroom-count logic, landing-spot logic, "clear this creature" logic, and a small math helper). The four creature files (bee, dragonfly, mosquito, earwig) no longer contain their own copies — they simply point to the one shared version. Nothing about how the game behaves changed; a full automated test suite (826 checks) confirms the game plays byte-for-byte identically before and after.

## Why This Approach

This is a "wait until it's proven, then clean it up" strategy rather than "clean it up as soon as you notice duplication." The team has a standing rule: don't consolidate shared logic until at least three separate parts of the game are proven to need the exact same thing — because premature consolidation can accidentally weld together things that only *look* similar today but need to diverge later. Here, a prior review flagged that the bee-family logic had crossed that threshold (four consumers, byte-identical, all covered by tests), which is what triggered this cleanup now rather than earlier or later.

It was also scoped deliberately narrowly: three *other* creatures (spider, beetle, inchworm) use a small piece of this same math too, but the team explicitly chose **not** to fold those in yet, to avoid overreaching beyond what was asked and coupling unrelated parts of the game together. That's a controlled, incremental cleanup rather than a sweeping rewrite.
