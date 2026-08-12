# sw11-1

## Problem

Problem: In our Star Wars trench sequence, enemy gun turrets shoot the player with computer-perfect aim, fire far more often than the original 1983 arcade cabinet ever did, and shoot at the player from angles the real machine never allowed.

Why it matters: The trench run is the signature moment of Star Wars — the tense, high-speed dash where players dodge the Death Star's defenses. In the real arcade cabinet, most of those shots miss on purpose, because the original hardware simply wasn't sophisticated enough to aim accurately and was deliberately throttled to keep the level fair and fun. Our version accidentally gave the guns superhuman aim and let too many of them fire at once, making the trench feel unfairly punishing instead of tense-but-winnable. Anyone who played the original cabinet — or watches footage of it — will immediately notice our trench feels wrong: harder, less fair, and less authentic.

## What Changed

Think of each gun turret in the trench as a little cannon with three behaviors: how well it aims, how many guns are allowed to shoot at once, and which guns are even allowed to shoot in the first place. We had all three wrong.

1. **Aiming ("smart" vs. "scattershot"):** Our guns were calculating exactly where the player would be and firing a laser-guided shot that always found its mark. The original game never did this — it fired shots off at a semi-random angle from wherever the gun was mounted, then let the shot slowly "creep" toward the player over time, like a dim searchlight, not a laser. And a shot mounted on the left wall could only drift right, never backtrack — same for the right wall. We rebuilt our aiming to match this "dumb, slow-drifting" behavior, so shots now genuinely miss the way they did on the real machine.

2. **How many guns can fire at once:** Our game let up to 6 shots be in the air simultaneously, no matter how early or late in the game you were. The original cabinet was much stingier — on the very first trench run, it allowed only ONE shot in the air at a time, gradually allowing more as the game got harder. We were letting six times as many bullets fly as the original game ever did on wave one. We fixed this so the number of simultaneous shots now scales with difficulty exactly like the original.

3. **Which guns are even allowed to shoot:** In the real game, a gun turret could only fire if the player's ship was flying above it and within a specific vertical "sweet spot" — too far above, and the gun wouldn't bother; too close, and it was disabled entirely (no cheap point-blank shots). Our version had every gun shooting regardless of the player's position. We added back this "can this gun even see me" check, including the point-blank safety zone that protects the player from unfair close-range shots.

## Why This Approach

Rather than inventing new gun behavior, we treated the original arcade machine's own program code as the answer key. Engineers traced the exact routines the 1983 hardware used to decide when a gun fires, how it aims, and how many can be active — down to the specific lines of assembly code — and reproduced that same logic in our version. This is the safest kind of fix: it's not a guess or a "vibe-based" nerf, it's a faithful recreation of behavior that's already proven to be fun and fair, because millions of people already enjoyed it in arcades. We also wrote automated tests that lock in the correct behavior (right number of guns firing, right firing angles, no point-blank shots) so this can't silently regress in the future.
