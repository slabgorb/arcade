# Story A-13 Context

## Title
Saucer scoring (200/1000) + collisions + siren cadence

## Metadata
- **Story ID:** A-13
- **Type:** story
- **Points:** 2
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-11 and A-12 make both saucer variants move, cross the screen, and fire —
but nothing happens when a saucer is hit, hits something, or dies, and the
siren that famously shifts pitch based on which saucer size is active has
no state hook for A-18 to read yet. A-13 is the integration story: wire
saucer-kill events into A-9's scoring, extend A-8's collision helpers to
the saucer/saucer-bullet pairs, and expose a pure siren-state selector. 2
points because the entities, movement, and math already exist (A-9, A-8,
A-11, A-12) — this story connects them, it doesn't invent new mechanics.

## Technical Approach

**Research pass reused from A-11/A-12's fetches (computerarcheology.com/
Arcade/Asteroids/Code.html, 6502disassembly.com/va-asteroids/Asteroids.html)
plus one corroborating web search**, focused here on scoring values,
saucer↔rock collision, and wave-clear persistence — all directly relevant
to this story's wiring surface.

- **Scoring values — one clean confirm, one direct conflict.** Large
  saucer: both disassembly sources and the epic agree on **200 points**
  (ROM byte `$20` BCD → ×10 display scaling per the epic's own documented
  score format — a clean match). Small saucer: **both disassembly fetches
  independently read the ROM byte as `$99` BCD (→ 990 displayed at the
  same ×10 scaling)**, and a corroborating web search of secondary sources
  also states 990 — three independent reads converging on 990, against
  the epic document's and this story's own title's stated **1000**. This
  is a genuine, non-trivial conflict, not a rounding quirk: `$99` and
  `1000` aren't the same value under any BCD-×10 reading. Possible
  explanations neither fetch resolved: a carry into a second BCD byte
  elsewhere in the add routine (the excerpts only showed a single-byte
  load, not the full add-with-carry), or the epic's 1000 being the
  commonly-cited (but possibly imprecise) community figure. **Recommendation:**
  don't hardcode either number in this story — source `SAUCER_SCORE_SMALL`
  from A-9's canonical score-constants module (A-9 owns BCD scoring and
  should be the single place this gets decided), and flag this conflict
  explicitly for A-9/A-17 to settle against the actual quarry bytes rather
  than either the epic prose or this research pass.
- **Saucer↔rock collision — brief and primary sources disagree.** This
  story's brief states saucers collide with rocks and split them,
  matching commonly-cited secondary/community sources (a corroborating web
  search: "flying saucers are destroyed if they collide with an
  asteroid"). **However, both fetched disassembly excerpts explicitly
  looked for this and did not find it**: the hit-detection routine
  excerpts they surfaced cover bullet-vs-asteroid, bullet-vs-ship,
  bullet-vs-saucer, and ship-vs-asteroid/saucer pairs, but neither listed
  a saucer-vs-asteroid pair. This may simply be a gap in what the fetch
  tooling excerpted rather than true absence (per A-3's standing caveat
  about this tooling summarizing rather than reading byte-for-byte) — it
  is not strong evidence the collision *doesn't* exist, just that this
  pass didn't find it where expected. Given secondary sources assert it
  and it's cheap to wire once A-8's helpers exist, **implement it**, but
  ship it behind a clearly named flag and call out the conflict with the
  primary-source excerpts explicitly — **verify against reference/ quarry
  (A-17)** before treating it as settled, including whether the saucer is
  simply destroyed or whether the rock also splits/is destroyed.
- **Wave-clear persistence.** One of the two fetches (6502disassembly)
  describes an "asteroid-break timer" that suppresses saucer spawn for a
  period after the last rock on a wave is destroyed, implying the saucer
  does not carry over into the next wave uninterrupted; the other fetch
  didn't address this. Single-source, provisional: implement despawn (or
  at minimum, a spawn-suppression window) on wave clear behind a named
  constant, **verify vs quarry**.
- **Siren cadence — scope clarification, not a research finding.** The
  story title's "siren cadence" is the **timing/state hook**, not audio.
  A-18 owns sound synthesis entirely; this story's job is to make "which
  saucer is currently alive" observable as a pure value so A-18 has
  something to drive the siren's pitch/cadence from. Zero Audio/Web Audio
  API surface belongs anywhere in `core/`.

| Constant | Provisional value | Status |
|---|---|---|
| `SAUCER_SCORE_LARGE` | 200 | corroborated — epic, both disassembly fetches, and search agree |
| `SAUCER_SCORE_SMALL` | source from A-9's canonical score constants, not hardcoded here | **conflict**: epic/story title say 1000; three independent research reads (both disassembly fetches + web search) say 990 — flagged for A-9/A-17 to resolve against actual quarry bytes |
| `SAUCER_ROCK_COLLISION_ENABLED` | `true` (implement) | secondary sources + brief assert it; **both primary-source disassembly excerpts fetched for this pass did not find the routine** — direct conflict, verify vs quarry (A-17) |
| `SAUCER_DESPAWN_ON_WAVE_CLEAR` | `true` | single-source (6502disassembly "asteroid-break timer") — provisional, verify vs quarry |

**Code shape.**
- `awardSaucerKill(state, saucer) → state` — calls into A-9's score-add
  entry point (signature TBD by A-9; assume something shaped like
  `addScore(state, points)`), keyed by `saucer.size` against
  `SAUCER_SCORE_LARGE`/`SAUCER_SCORE_SMALL` sourced from A-9's constants
  module, not redefined locally.
- Extend A-8's collision helpers (signature TBD by A-8, which lands before
  this story per the epic's dependency order) to cover: player-bullet↔
  saucer (→ `awardSaucerKill` + saucer removal), saucer-bullet↔ship (→
  existing ship-destruction hook, distinct from direct saucer↔ship
  contact), saucer↔ship (mutual destruction), and — behind
  `SAUCER_ROCK_COLLISION_ENABLED` — saucer↔rock (saucer destroyed on
  contact; whether the rock also splits is unconfirmed, default to
  "rock unaffected, saucer destroyed" as the minimal interpretation unless
  A-17's quarry says otherwise).
- `sirenState(state): 'large' | 'small' | null` — new pure selector (in
  `core/saucer.ts` or a small new `core/siren.ts`), returning `null` with
  no saucer alive, else `saucer.size`. This is the entire A-18 seam: no
  timers, no audio, just "what's alive right now" as a derived value A-18
  can poll or diff each tick.
- Wave-clear wiring: when the wave-clear condition (owned by whichever
  story tracks wave completion) fires, clear `state.saucer` and suppress
  the spawn director for `SAUCER_DESPAWN_ON_WAVE_CLEAR`'s window if
  enabled.

**Standing epic ACs, restated:** determinism (fixed seed + fixed dt, no
wall-clock/`Math.random` in `core/`); A-2's banned-globals guard continues
to cover all new/changed `core/` files automatically.

## Scope
- **In scope:** saucer-kill → A-9 scoring wiring (200/1000 per size,
  sourced from A-9's constants, not hardcoded); collision wiring extending
  A-8's helpers for saucer↔player-bullet, saucer-bullet↔ship, saucer↔ship,
  and (flagged provisional) saucer↔rock; `sirenState` pure selector for
  A-18; wave-clear despawn/suppression (provisional); Vitest coverage for
  all of the above.
- **Out of scope:** actual BCD score storage/rollover/extra-life mechanics
  (A-9 owns; this story only calls in); collision geometry/shape math
  itself (A-8 owns; this story only extends pair coverage); siren audio
  synthesis (A-18); life-loss/respawn/invulnerability flow beyond
  triggering whatever hook A-8/A-15 already expose; resolving the
  990-vs-1000 discrepancy definitively (flagged for A-9/A-17, this story
  sources the constant rather than picking a side).

## Acceptance Criteria
- Fixed-seed script: large saucer destroyed by a player bullet increases
  score by exactly `SAUCER_SCORE_LARGE` (200); small saucer destroyed by a
  player bullet increases score by exactly the value A-9 exports as
  `SAUCER_SCORE_SMALL` — assert against that exported constant, not a
  hardcoded literal, so the two stories can't silently drift apart if the
  990/1000 conflict gets resolved differently than assumed here.
- Saucer↔ship direct collision destroys both the ship (via the existing
  ship-destruction hook) and the saucer, deterministic given fixed
  seed/dt.
- Saucer-bullet↔ship collision triggers the ship-destruction hook via a
  path distinctly testable from direct saucer↔ship contact (different
  originating entity).
- Saucer↔rock collision (behind `SAUCER_ROCK_COLLISION_ENABLED`): when
  enabled, saucer is destroyed on contact with a rock; test documents the
  flag and links to the primary/secondary source conflict noted above —
  **verify against reference/ quarry (A-17)**.
- `sirenState(state)` returns `null` with no saucer alive, `'large'` while
  a large saucer is alive, `'small'` while a small saucer is alive — pure
  function; a source-scan test (extending A-2's banned-globals guard
  pattern) confirms no `Audio`/`AudioContext`/Web Audio reference anywhere
  in `core/`.
- Determinism: identical seed + input script + `dt` produce deeply-equal
  `GameState` after N ticks covering a kill event; A-2's banned-globals
  guard continues to pass for all new/changed core files.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-13` from the sprint YAML._
_Enriched by Architect (Goldstein): scoring/collision/siren-hook wiring design, from a research pass across computerarcheology.com/Arcade/Asteroids/Code.html, 6502disassembly.com/va-asteroids/Asteroids.html, and one corroborating web search — flags two direct conflicts for downstream resolution: small-saucer score reads as 990 (not 1000) across three independent sources, and saucer↔rock collision was asserted by the brief/secondary sources but not found in either fetched primary-source disassembly excerpt._
