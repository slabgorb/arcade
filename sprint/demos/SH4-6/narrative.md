# SH4-6

## Problem

**Problem:** Every one of our seven arcade games has its own "sound effect dispatcher" — the code that decides which explosion, laser, or death jingle to play. To keep any one game's dispatcher from silently starting to misuse the shared audio system, we built an automated rulebook checker last sprint. Round-2 review found two ways a developer could accidentally slip past that checker without technically breaking its rules: renaming an import, or moving a required safety check to the wrong spot in the code.

**Why it matters:** This checker is a guardrail, not a game feature — players never see it directly. But if it can be fooled, a future code change could quietly let one game's sound code grab full control of the shared audio engine instead of the narrow, safe slice it's supposed to use, or drop the built-in "did we forget a sound case?" safety net entirely. Either failure mode ships invisibly and only shows up later as a real bug — a missing sound effect, a wrong sound firing, or a crash in production. Closing both gaps now means the guardrail can be trusted to actually stop that class of bug before it's written.

## What Changed

Think of the checker as a security guard reading ID badges at a door. Previously, the guard only checked the *name printed on the badge* — so someone could get through by simply renaming their badge to look like the safe kind while quietly using the full-access version. Now the guard checks the badge's *actual credentials* underneath the name, no matter how it's spelled, aliased, or renamed on import. That's the first fix.

The second fix is about where a required "safety switch" has to live. Each dispatcher is supposed to have a built-in check that says "if a new, unhandled sound type shows up, fail loudly instead of silently doing nothing." Previously, that safety switch just had to exist *somewhere* in the function — even off to the side, doing nothing useful. Now it has to sit in the one place where it actually works: directly inside the switch statement that handles each sound type. A safety switch parked anywhere else no longer counts.

Along the way, a subtler issue was caught during a second review pass: the test harness used to verify all of this had its own blind spot — a missing piece of setup meant one of the "does this pass correctly" checks was accidentally passing for the wrong reason, not because the real logic worked. That's been fixed too, and a new check was added that proves the checker is actually looking at real code, not silently doing nothing and reporting false confidence.

**No visible change for players.** This story touches zero game code (`plugins/` is untouched) — it only strengthens an internal quality checker that runs automatically before code ships.

## Why This Approach

The team could have kept the simpler, "read the text and look for keywords" version of this checker — it's faster to write and easier to read. But that approach only catches violations that are spelled exactly one expected way. As soon as a developer (even accidentally) renamed something or moved a safety check around, the simple version would wave it through without complaint.

Instead, the team upgraded the checker to actually ask the TypeScript compiler — the same tool that already type-checks all our code — "what does this really resolve to?" rather than "what does this look like?" That's a fundamentally more reliable question: it can't be fooled by cosmetic renaming because it's reasoning about the underlying types, not the text on the page. It costs a bit more engineering effort up front, but it means the guardrail keeps working even as the codebase evolves in ways nobody anticipated today — which is exactly the point of a guardrail.
