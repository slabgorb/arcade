# ml7-9

## Problem

Problem: When Millipede players kill a beetle or a mosquito, clear a wave, or lose a life, the original 1982 arcade game shifts the entire playing field up or down — mushrooms and all — to signal what just happened. That visual cue existed in the game's simulation code but was never connected to the part of the game that actually runs frame by frame, so players saw a static field no matter what happened on screen. Why it matters: this is one of the signature "feel" details of Millipede — without it, kills and wave transitions look and feel flatter than the original cabinet, and testers/reviewers comparing the clone side-by-side with the source material would immediately notice the field wasn't moving when it should.

## What Changed

Think of the playing field as a photo that's supposed to slide up or down a notch every time certain things happen — a beetle dies, a mosquito dies, the centipede gets rebuilt, or a life is lost. The code that knows *how* to slide the photo already existed from earlier work; this story is the wiring that finally plugs it into the live game loop, so those slides actually happen while you're playing instead of just sitting there unused.

Concretely:
- The game's internal state now tracks a "scroll counter" and a live count of mushrooms, matching how the original game tracked the same things.
- Every frame, right after enemies move and get killed (and around the special "field rebuild" moment), the game checks: did something happen that should trigger a scroll? If so, it shifts the field down (for a beetle kill) or up (for a mosquito kill), and adjusts the mushroom tally to match.
- All five triggers from the original game are now wired in: the continuous slow scroll, a beetle kill, a mosquito kill, the centipede reappearing after being wiped out, and cancelling a scroll when the player dies.
- A deliberate accessibility rule was enforced and tested: this scroll is a smooth, incremental shift — never a jarring full-screen flash or strobe — so the effect is safe for players sensitive to sudden visual changes.
- A first-pass review caught a subtle ordering bug (the game was allowed to trigger a scroll one frame too early in one specific case) and a couple of test-quality issues; those were fixed and re-verified before shipping.

## Why This Approach

The team already had two separate, well-tested pieces: the logic for *how* the field should scroll (built earlier) and the logic for *when* an enemy is killed or the field resets (also built earlier). This story didn't invent new game behavior — it connected the "when" to the "how," in the exact order and under the exact conditions the original 1982 game used. That's a deliberately conservative approach: reusing already-verified logic and focusing all the new work on correct sequencing, which is the part most prone to subtle bugs (as the review round proved — a one-frame-early trigger is the kind of thing that's invisible in casual play but shows up as a fidelity mismatch against the original). Building it this way also kept the change small and easy to verify: 20 new tests target exactly this wiring, and the full test suite (over 16,000 tests project-wide) still passes, so this change didn't destabilize anything else in the game.
