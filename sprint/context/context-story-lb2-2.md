# Story lb2-2 Context

## Title
Implement the ADR's cross-origin high-score path so lobby tiles show each game's real best score

## Metadata
- **Story ID:** lb2-2
- **Type:** bug
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade-shared, lobby
- **Epic:** Lobby follow-ups — cross-origin high scores, plus front-end/design work

## Problem
Implement ADR-0004 (docs/adr/0004-cross-origin-high-scores.md). The decision is made — do not re-litigate it. Games publish their top score to a cookie on the shared parent domain; the lobby reads it. The game's own localStorage table stays the authoritative source of truth, untouched and unmigrated; the cookie is a DERIVED cache, republished on every game load, so it heals itself and can never lose scores. Put the publish/read pair INSIDE @arcade/shared/highscore behind a narrow interface, so the transport stays swappable (single-origin collapse was rejected on cost, not merit, and must stay one adapter swap away). Cookie shape: arcade-hi-<gameId>=<top score>, Domain=slabgorb.com, Path=/, SameSite=Lax, Secure when https; one cookie PER GAME so no game can clobber a sibling via read-modify-write. In dev (just serve, six localhost PORTS) omit the Domain attribute — cookies ignore port, so a host-only localhost cookie is already shared across all six. KEY STRUCTURAL FACT: every game calls makeHighScoreStorage(gameId, guard) exactly once in main.ts and that factory owns the only save() in the cabinet — install the publish there and tempest/star-wars/asteroids/battlezone need ZERO code changes, only a version bump. The real cost is the lobby's pin jumping v0.4.0 -> v0.13.x, which crosses the whole SH2 render epic. Keep the house fail-soft discipline: every failure mode degrades to NO SCORE, never throws, never blocks the page.

## Technical Approach
**The design is already decided — read `docs/adr/0004-cross-origin-high-scores.md`
at the ORCHESTRATOR root before writing anything.** Do not re-litigate it. The ADR
is the technical approach; the notes below are only the delivery traps around it.

Choke point: every game calls `makeHighScoreStorage(gameId, guard)` exactly once in
its `main.ts`, and that factory owns the only `save()` in the cabinet. The publish
goes there. If a game needs code changes, the publish was installed in the wrong place.

### Known traps in this repo pair (learned the hard way)
1. **Consumption model.** Games and the lobby pin `@arcade/shared` as a git-URL
   **tag** (`github:slabgorb/arcade-shared#vX.Y.Z`), not a local working copy. Code
   added to `arcade-shared/` is invisible to `lobby/` until it is published and the
   pin is bumped. Landing sequence is: squash-PR to `arcade-shared` `develop` →
   `just release arcade-shared` (library = tag only, no R2 deploy) → repin consumers
   to the new tag → merge the consumer PRs.
2. **`npm install` will not re-resolve a changed git ref.** Force it:
   `npm install @arcade/shared@github:slabgorb/arcade-shared#<ref>`.
3. **ESM `.js` extension rule.** A browser subpath importing a sibling MUST write
   `from './cookie.js'`. `tsc` bundler-resolution compiles happily without it, then
   the shipped ESM artifact dies under native Node ESM. Vite hides this locally.
4. **The lobby's pin jumps `v0.4.0` → `v0.13.x`**, crossing the whole SH2 render
   epic. That jump — not the cookie — is the real risk in this story. Expect the
   lobby build/tests to surface unrelated SH2-era breakage and budget for it.

## Scope
- In scope: the publish/read pair behind an interface in `@arcade/shared/highscore`;
  the lobby reading it; killing the single-shared-localStorage fixture in
  `lobby/tests/storage.test.ts`; the lobby's `@arcade/shared` pin bump.
- Out of scope: any game-side code change (tempest/star-wars/asteroids/battlezone are
  version-bump-only, by AC); migrating or touching existing localStorage tables;
  collapsing the games to a single origin (explicitly rejected in the ADR).

## Acceptance Criteria
- On the production origin split, each tile shows that game's own real best score — verified per game, not just for one.
- tempest, star-wars, asteroids and battlezone are fixed by a VERSION BUMP ONLY, with no game-side code changes; if any game needs code, that is a signal the publish was not installed at the makeHighScoreStorage/save() choke point.
- The publish/read pair lives behind an interface in @arcade/shared/highscore — swapping the cookie for same-origin localStorage or a fetch would touch one adapter and nothing else.
- Tests model TWO SEPARATE STORES (a game store and a lobby store) plus a cookie jar. lobby/tests/storage.test.ts currently stubs ONE shared localStorage seeded with the games' keys — it encodes the bug as a fixture and cannot fail on it. That fixture must die.
- Scores work in local dev (just serve, six localhost ports) AND in production (six subdomains) — a fix that works in one and silently breaks the other is not a fix.
- Every failure mode degrades to NO SCORE without throwing: cookie absent, malformed, evicted, document.cookie unavailable, plus the pre-existing storage failures.
- No migration is performed and none is needed: existing per-game localStorage tables are left in place and remain authoritative; a tile self-heals to the real score after one visit to that game.

---
_Generated by `pf context create story lb2-2` from the sprint YAML._
