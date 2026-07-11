# Demo Script — Story rb2-13

## Scene 1: Setup (30 sec)

**Presenter says:** "Problem: Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording.. Why it matters: users needed a better interface."

**Show:** The application screen before the changes

**Click:** Navigate to the relevant screen

## Scene 2: Act 1 (2 min)

**Presenter says:** "We implemented: Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording.."

**Show:** ## Demo Script — Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording.

### Scene 1: Setup (30 sec)
**Presenter says:** "Today we're going to show you what we built for Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording.."
**Show:** The project overview

### Scene 2: Demo (1 min)
**Presenter says:** "Let me show you the changes."
**Show:** The implementation in action

### Scene 3: Closing (30 sec)
**Presenter says:** "That's Blimp cabinet integration — wire the tested blimp core (src/core/blimp.ts, rb2-10) into main.ts: spawn on the ~25% BLMOTN roll, drift-step each calc-frame, render BLIMP_PICTURE BROADSIDE (add a yaw — the ROM geometry is authored nose-on along local z), fire at the player on the ÷2 cadence via a real enemy-shell→player-damage path, collide/score(flat 200)/explode through the shared guns/scoring/explosion seams, and DESPAWN when it drifts off-screen (step is unbounded by design). Resolve the Enemy-vs-Blimp 'kind' plumbing (widen the union or adapt in main.ts). NB: the blimp DRIFTS across (non-weaving) — this corrects rb2-10 AC-3's stale 'weaving motion' wording. — shipped and verified."

**Click:** Walk through the new interface elements

## Scene 3: Act 2 (1 min)

**Presenter says:** "This approach prioritizes user experience and accessibility."

**Show:** The updated interface in action

**Click:** Demonstrate the key interactions and visual feedback

## Scene 4: Closing (30 sec)

**Presenter says:** "That covers the changes. The new interface is live and ready for users."

**Show:** Final state of the screen