# Narrative

## Problem Statement
**Problem:** A recent feature landed a smarter "brain" for enemy TIE fighters (PR #110, merged 2026-07-19) that took over their flight and firing decisions — but it left behind old wiring that no longer did anything: unused data fields, a difficulty dial that quietly stopped working, and a duplicated formula living in two places. **Why it matters:** dead code that *looks* active is a trap for the next person who touches it — they'll waste time investigating a "feature" that's actually inert, or worse, change it and expect an effect that was never really there. Left alone, it also makes the codebase harder to trust: a difficulty setting that silently does nothing undermines confidence in every other setting around it.

## What Changed
Think of it like renovating a house after installing a new smart thermostat, but never removing the old manual dial it replaced. The old dial still looks like it does something — you can still turn it — but it's disconnected from the furnace. This story removed that dial.

Specifically:
- **Three unused pieces of enemy data** (`bank`, `peeling`, `vel` — a leftover steering bias, an "is retreating" flag, and a velocity number) were deleted. None of them were being read anywhere in the game anymore; the new flight system had made them obsolete.
- **A "difficulty ramp" that had stopped ramping** was removed. There was a setting meant to make enemies approach faster on later waves, but it only fed a number nobody read — later waves were *not* actually getting faster from this setting. (Difficulty still increases correctly through two other levers — how often enemies spawn and how often they shoot — which were untouched.)
- **A duplicated math formula was consolidated.** The calculation for "which direction is the cockpit from this enemy" existed as two separate copies in two different files. It's now one shared version both files call, so a future fix only has to happen once.
- **~20 test files were cleaned up** to stop referencing the deleted fields, and old tests that checked the now-removed (and already-broken) behavior were retired.

No visible or playable behavior changed — this is purely tidying up the inside of the machine.

## Why This Approach
The engineering judgment call here was **retire, don't repair**. The team could have instead tried to fix the broken difficulty ramp so it actually made enemies faster on later waves — but that would require reverse-engineering the exact speed curve from the original 1983 arcade hardware and play-testing it, which is a much bigger, separate effort. Since the story's job was cleanup (not new tuning), the simpler and safer choice was to delete the non-functional dial rather than half-fix it, and leave the "make it actually ramp" work as a future, clearly-scoped story if it's ever wanted.

The team also caught and closed out one extra loose end mid-task: a cutoff distance value (`TIE_EXIT_RANGE`) was only used by the retreat logic being deleted, so leaving it in place would have just created a *new* piece of dead code — defeating the purpose of a cleanup story. It was removed too, verified first that nothing else depended on it.

Every change was checked against the full automated test suite (1,714 tests) before and after, confirming zero behavior change to the actual game.

## Before/After
**Enemy data shape** (`src/core/state.ts`)

*Before:*
```ts
export interface Enemy {
  pos: Vec3
  vel: Vec3          // written at spawn, never read
  kind: 'tie' | 'darth'
  orient: Mat4
  bank?: number      // never set or read
  peeling?: boolean  // never set, so dependent logic was permanently dead
  // ...
}

export const ENEMY_SPEED = 10000  // fed only the unread `vel` above
export const TIE_EXIT_RANGE = 8000 // fed only a filter that could never trigger
```

*After:*
```ts
export interface Enemy {
  pos: Vec3
  kind: 'tie' | 'darth'
  orient: Mat4
  // ...
}
// ENEMY_SPEED and TIE_EXIT_RANGE removed — their only consumers were the
// fields/logic retired above. Difficulty now visibly escalates only through
// spawn cadence and fire cadence (gameRules.waveParams).
```

**Cockpit-direction formula** (duplicated → shared)

*Before:* one copy inline in `sim.ts`, a second copy inline in `tie-status.ts`:
```ts
// tie-status.ts (inline duplicate)
const toCockpit = normalize(sub(COCKPIT, e.pos))
if (dot(nose, toCockpit) >= FIRE_CONE_COS) status |= Status.C_AS
```

*After:* one shared function in `gameRules.ts`, imported everywhere it's needed:
```ts
// gameRules.ts
export const toCockpit = (pos: Vec3): Vec3 => normalize(sub(COCKPIT, pos))

// tie-status.ts
import { toCockpit } from './gameRules'
const toCockpitDir = toCockpit(e.pos)
if (dot(nose, toCockpitDir) >= FIRE_CONE_COS) status |= Status.C_AS
```

**Net result:** 1,714/1,714 tests passing both before and after, confirming the cleanup changed *what the code looks like* without changing *what the game does*.
