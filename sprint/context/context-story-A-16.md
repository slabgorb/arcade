# Story A-16 Context

## Title
Attract mode + start/game-over/high-score + lobby high-score wiring

## Metadata
- **Story ID:** A-16
- **Type:** story
- **Points:** 5
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-2 declared `GameState.mode: 'attract' | 'playing' | 'gameover'` in the very
first story, and every story since (A-3 through A-15) has gated its behavior
on `mode === 'playing'` — but nothing has ever set `mode` to anything else,
or given `'attract'`/`'gameover'` any behavior of their own. The sim has
effectively been stuck in a single mode for the entire epic. A-16 closes
that loop end to end: an attract-mode demo (rocks drifting, no ship, a start
prompt) that a keyboard press turns into a real game; a game-over that
checks the final score against a persisted high-score table and, if it
qualifies, captures initials; and persistence that survives a page reload
and is visible from the lobby tile without launching the game. It's also the
first story to render score/lives at all — A-9 computed the score but
nothing has ever drawn it — and the first to touch a vector font, mirroring
star-wars' `shell/font.ts`.

## Technical Approach

**Mode flow.** `attract → playing` on a keyboard start press; `playing →
gameover` already happens inside A-15's `handleShipDeath` when `lives` hits
`0` — this story doesn't touch that transition, only what happens on both
sides of it. `gameover → attract` happens either immediately after a fixed
display delay (non-qualifying score) or after initials are confirmed
(qualifying score). Per the epic, `GameState.mode`'s union is **not**
extended — no new top-level mode value for "entering initials." That state
nests inside a `gameOver` field instead, so A-2's mode union stays exactly
as declared.

- `core/input.ts` (A-2) gets one new field, `start: boolean`, alongside the
  existing `left`/`right`/`thrust`/`fire`/`hyperspace` — the same pattern
  A-14 used for reading `hyperspace` off an already-declared-but-unused
  field, just one story later for a field that doesn't exist yet.
  `NO_INPUT.start = false`.
- `core/state.ts`: add `gameOver: { qualifies: boolean; initials: string;
  confirmed: boolean; displayTimer: number } | null` to `GameState` — `null`
  outside `'gameover'` mode. Set on entry to `'gameover'` (by whichever code
  sets `mode = 'gameover'`, i.e. A-15's `handleShipDeath`, or by this story
  if that's cleaner to land here — coordinate the exact call site with A-15
  during implementation) via `qualifiesForHighScore(loadedTable,
  state.score)`.
- `core/sim.ts`'s `stepGame` mode dispatch:
  - `'attract'`: advance rocks only (reuse whatever rock-drift movement
    A-6/A-10 already established) — no ship update, no collision, no
    scoring, regardless of `input`. `input.start === true` transitions to
    `'playing'` via a fresh-game reset (`lives = STARTING_LIVES`, `score =
    0`, `wave` reset, ship spawned alive at center) — reusing
    `initialState`'s field defaults rather than duplicating them, but *not*
    re-seeding `rng` (the game continues drawing from the same RNG stream
    across attract→playing→attract cycles; only a hard page reload
    re-seeds).
  - `'gameover'`: if `gameOver.qualifies` and not yet `confirmed`, accept
    letter input to build `gameOver.initials` (see initials entry below) and
    wait for confirm; if `!qualifies`, tick `gameOver.displayTimer` down and
    transition to `'attract'` (and, on the qualifying path, transition to
    `'attract'` once `confirmed` — after inserting the entry into the
    high-score table via `insertHighScore`) when it reaches zero.
- **Attract-mode demo scope, kept deliberately small.** "Runs the sim with
  no ship" is read literally: rocks continue drifting (existing A-6+
  movement, unmodified), the ship entity is simply absent/inert, nothing
  collides, nothing scores. This story does **not** build a
  recorded/simulated demo-play sequence (a ship flying itself) —
  computerarcheology's account of the pre-game routine (`ChkPreGameStuff`)
  describes cycling a "PUSH START" prompt with the high-score list and
  flashing button LEDs, not autonomous ship gameplay, so a rocks-only
  backdrop with a HUD overlay cycling between the start prompt and the
  high-score table is the faithful-enough version for 5 points on the
  widest story in the epic.

**Vector font — port star-wars' `shell/font.ts` pattern.** star-wars'
`font.ts` is a small, self-contained module: a `UI_FONT_FAMILY` constant, a
`FontFace` loaded from a `public/fonts/*.ttf` resolved against
`import.meta.env.BASE_URL` (so the `/star-wars/` vs `/asteroids/` deploy
base is honored), registered into `document.fonts`, with the whole load
wrapped in a try/catch that returns `false` and leaves the existing
`'Orbitron', monospace` CSS fallback in render.ts untouched on any failure
(missing `FontFace` API, non-DOM context, blocked/missing file). Port this
near-verbatim into `asteroids/src/shell/font.ts`. The actual typeface
(star-wars vendors "Vector Battle," freeware/non-commercial,
`public/fonts/Readme.txt` shipped unmodified per its license) can be reused
by vendoring the same `.ttf` + its `Readme.txt` into `asteroids/public/
fonts/` — each subrepo carries its own copy per the license's
redistribution term, not a shared asset. No new/different font is required
to satisfy this story; sourcing a distinct Asteroids-specific face is out of
scope.

**HUD.** `shell/render.ts` gains the score/high-score/lives display this
story is the first to need: current score (`state.score`), the
running-session high score (max of the persisted table's top entry and the
current score, loaded once at boot — mirrors star-wars' pattern of loading
the table via `storage.ts` at startup and keeping a live running value
rather than re-reading localStorage every frame), and a row of small
ship-glyph icons, one per remaining life (`state.lives`), reusing whatever
ship vector shape A-5/A-17 already defines rather than a new glyph.

**High-score persistence — port star-wars' `core/highscore.ts` +
`shell/storage.ts` near-verbatim.**
- `core/highscore.ts`: `MAX_HIGH_SCORES = 10`; `HighScoreEntry { name:
  string; score: number; wave: number; date?: string }` — Asteroids already
  calls its level counter `wave` (per A-2's own state shape), so this is an
  even more literal port than star-wars' own adaptation of tempest's `level`
  → `wave`; `HighScoreTable = HighScoreEntry[]`; `qualifiesForHighScore(table,
  score): boolean` and `insertHighScore(table, entry): HighScoreTable` —
  copy the exact logic (non-positive scores never qualify; open slots always
  qualify; once full, must strictly beat the lowest entry; ties place the
  new entry after existing equal scores; result truncated to
  `MAX_HIGH_SCORES`).
- `shell/storage.ts`: same defensive shape as star-wars' — `getStorage()`
  guards against `localStorage` being absent/throwing (private browsing,
  non-browser context); `loadHighScores()` returns `[]` on any unhappy path
  (missing key, corrupt JSON, non-array JSON, or a well-formed array with
  malformed rows — `isHighScoreEntry` filters row-by-row); `saveHighScores()`
  swallows write failures (quota exceeded, unavailable storage). The one
  required change from a straight copy: **`STORAGE_KEY =
  'asteroids-high-scores'`**.

**Lobby wiring — confirmed convention, one-line registry addition.** The
lobby (`lobby/src/shell/storage.ts`) derives each game's localStorage key
generically — `highScoreKey(gameId) = \`${gameId}-high-scores\`` — from the
`id` field of its game registry (`lobby/src/core/registry.ts`), which
currently lists:
```ts
export const GAMES: readonly Game[] = [
  { id: 'tempest', title: 'TEMPEST', launchUrl: '/tempest/', color: '#00eaff' },
  { id: 'star-wars', title: 'STAR WARS', launchUrl: '/star-wars/', color: '#ffe81f' },
]
```
This story adds one entry, `{ id: 'asteroids', title: 'ASTEROIDS',
launchUrl: '/asteroids/', color: '#<hex>' }` (pick a color distinct from the
existing two — e.g. asteroid-grey/white `#c0c0c0` or classic vector-white
`#ffffff`, TEA/Dev's call). With `id: 'asteroids'`,
`highScoreKey('asteroids')` automatically resolves to
`'asteroids-high-scores'` — **exactly** the `STORAGE_KEY` this story's
`shell/storage.ts` writes to, so no other lobby change is needed. The
lobby's `getTopScore(gameId)` only requires each stored row to carry a
finite numeric `.score` field (`scoreOf()` ignores everything else and takes
`Math.max` over valid rows, tolerant of extra/missing fields) — this story's
`HighScoreEntry.score` satisfies that with no lobby-side type changes. This
is a cross-repo touch: the registry entry lands in
`lobby/src/core/registry.ts`, not in `asteroids/`; verify `lobby`'s own
`npm run build`/`npm test` stay green after the one-line addition.

**Initials entry — simplified from the ROM's rotary-switch UI.**
computerarcheology's account describes a genuine 3-letter capture on a
qualifying score ("YOUR SCORE IS ONE OF THE TEN BEST" / "PLEASE ENTER YOUR
INITIALS"), cycled per-letter with the cabinet's rotate-left/rotate-right
switches and confirmed with the hyperspace button. Porting that exact
rotary-cycle interaction is a nontrivial shell UI on its own and isn't what
"keep scope disciplined" buys on a 5-point story with two other large chunks
(attract framing + persistence) already in it. Simplest faithful version:
capture 3 characters via keyboard letter keys directly (typed, uppercased,
capped at 3), `Enter` to confirm — same *outcome* (3 initials attached to a
qualifying score, shown in the table) via a plainer *interaction*. Flag the
ROM's rotate-and-confirm interaction model as an explicit non-goal, not a
future story — nothing later in the epic (A-17–A-19: tables, sound, glow)
touches UI interaction model.

**Non-goals (explicit, per the epic's scope discipline for the widest
story):** sound of any kind, including the attract/high-score jingles
(A-18); DVG brightness/glow calibration for the HUD text or attract-mode
rendering (A-19); coin mechanics, credits, or DIP-switch-driven pricing —
this is a free-play browser game with no coin door, so the ROM's
insert-coin/price-display text (computerarcheology's offsets `#$07`–`#$0A`)
is skipped entirely, not ported-and-hidden; the ROM's rotary-switch
initials interaction (see above); a simulated/recorded attract-mode
gameplay demo (rocks-drift-only, per above); quarry-exact attract-mode
page-cycling timings (A-17).

## Scope
- **In scope:** `Input.start` field; `GameState.gameOver` nested field (mode
  union untouched); `stepGame`'s `'attract'`/`'gameover'` dispatch branches
  and the `attract → playing → gameover → attract` transitions; rocks-only
  attract sim path; `core/highscore.ts` (ported from star-wars, `wave`-named
  field kept as-is); `shell/storage.ts` (ported, `STORAGE_KEY =
  'asteroids-high-scores'`); `shell/font.ts` (ported pattern, vendored font
  asset); HUD additions to `render.ts` (score, high score, life icons);
  keyboard start + initials-entry input mapping (shell); one registry entry
  in `lobby/src/core/registry.ts`; Vitest coverage for all core-side logic
  (fixed-seed + fixed-dt), plus a `storage.ts` suite mirroring star-wars'
  corrupt/missing-data cases.
- **Out of scope:** sound, DVG glow calibration, coin/credit mechanics,
  ROM-accurate rotary initials UI, simulated attract-mode gameplay,
  quarry-exact timings (A-17–A-19, all listed above); any lobby change
  beyond the one registry entry (the lobby's storage/scoring code is already
  generic and needs none); the death/respawn/game-over-*trigger* logic
  itself (A-15 owns setting `mode = 'gameover'`; this story owns what
  happens once it's there).

## Acceptance Criteria
- A state with `mode === 'attract'` fed fixed `dt` ticks advances rock
  positions deterministically (fixed-seed golden test) while `score`,
  `lives`, and ship-related fields never change, regardless of
  `input.thrust`/`fire`/`hyperspace`.
- Feeding `{ ...NO_INPUT, start: true }` to a `'attract'`-mode state
  transitions `mode` to `'playing'` within one tick, with `lives ===
  STARTING_LIVES`, `score === 0`, and a live ship at center — and the same
  `rng` stream continuing (not re-seeded) across the transition (assert via
  a known next-`nextFloat()` value matching an un-reset continuation).
- A `'gameover'` fixture with a non-qualifying score (`gameOver.qualifies
  === false`) ticks `displayTimer` to zero over fixed-`dt` steps and then
  transitions to `'attract'` without ever touching `gameOver.initials`.
- A `'gameover'` fixture with a qualifying score accepts simulated
  letter-key input up to 3 characters into `gameOver.initials` (uppercased,
  extra input beyond 3 ignored), and a confirm input inserts a
  `HighScoreEntry { name: initials, score, wave, date }` into the table via
  `insertHighScore` and transitions to `'attract'`.
- `qualifiesForHighScore`/`insertHighScore` behave exactly as star-wars'
  ported suite: table under 10 entries always qualifies (given a positive
  score); once full, only a strict improvement over the lowest entry
  qualifies; ties insert after existing equal-score entries; result is
  always truncated to `MAX_HIGH_SCORES`.
- `loadHighScores()`/`saveHighScores()` round-trip through a mock/shim
  `localStorage` under the exact key `'asteroids-high-scores'`; corrupt
  JSON, a non-array payload, and an array containing malformed rows each
  degrade to `[]`/row-dropped rather than throwing.
- `lobby/src/core/registry.ts` contains the `asteroids` entry (`id:
  'asteroids'`, `launchUrl: '/asteroids/'`) — verified by inspection/
  lobby's own test+build, not an asteroids-repo unit test.
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green in `asteroids/`; `lobby`'s `npm run build`/`npm test`
  stay green after the registry addition.

---
_Generated by `pf context create story A-16` from the sprint YAML._
_Enriched by Architect (Goldstein): attract/game-over mode-flow design, high-score/font/storage porting plan from star-wars, confirmed lobby high-score-key convention (`${gameId}-high-scores` via `lobby/src/core/registry.ts`), and scope discipline on the widest story in the epic._
