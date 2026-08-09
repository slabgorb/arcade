# Missile Command — mc7, high-score ladder + name entry (REV-01) — Architect design

2026-08-09. Detailed epic design for **mc7**, executing the roadmap slice at
`docs/superpowers/specs/2026-08-07-missile-command-full-cabinet-roadmap.md:113`
under the one-design-per-epic rule. Ground truth for every ROM fact is the
vendored **REV-01** tree (`plugins/missile-command/reference/source/`); hi-score
lives in the display processor `W3DSUP.MAC`. Citation form is `FILE.MAC:LINE`
against a `tr -d '\r'` copy read with `grep -a`. RADIX: W3DSUP inherits
`.RADIX 16`, so **bare literals are HEX** and a trailing `.` is DECIMAL; scores
are BCD (`SED`).

## Where mc7 mounts

mc7 depends on **mc4** (done — score + wave, so there is a final score to rank)
and couples softly to **mc6**: the ROM enters initials entry as part of the SETUP
sequence after game-over, so the cleanest home for the `'entry'` phase is a task in
mc6's state machine (`W3MAIN.MAC` SETUP). mc7 is therefore **best sequenced after
mc6**, but two of its four stories are mc6-independent: the pure table
(`mc7-1`) and localStorage persistence (`mc7-3`) need only mc4's score. If mc7
runs before mc6, `'entry'` is added to the current `state.ts` `Phase` and re-homed
into the SETUP task list when mc6 lands.

**Reuse-first (contract 4).** The arcade already owns both halves of this epic —
`@shared/highscore` (`src/shared/highscore.ts`: `qualifiesForHighScore`,
`insertHighScore`, `highScoreKey`, `MAX_HIGH_SCORES`, the row guards and the
`readTopScores` transport) and `@shared/name-entry`
(`src/shared/name-entry.ts`: `stepNameEntry(buffer, key, maxLength)`) — and
asteroids, battlezone, centipede and joust already consume them. mc7 is a
**consumer**, not a new mechanism. The standing rule holds
(`[[highscore-initials-live-in-core]]`): the table, the qualifies check, and the
initials buffer live in `src/core` (pure); the shell holds only load-on-boot and
save-on-commit.

The fidelity contract binds every mc7 story: REV-01 ground truth, every new
`src/core` constant carries a claim gated by `citations.test.ts`, `purity.test.ts`
stays green (the ladder + entry are pure, seeded, clock-free), and any
REV-01↔REV-03 divergence is catalogued.

## Ground-truth findings that shaped this design

Extracted from `W3DSUP.MAC` (REV-01). Three findings shaped the module split and
the claims.

### 1. The ROM ladder has its own depth and a seeded default table — pin it, don't assume 10

`@shared/highscore` defaults `MAX_HIGH_SCORES = 10` (`src/shared/highscore.ts:47`),
but the MC ROM sets its own ladder. `INITIALIZE HIGH SCORE TABLE`
(`W3DSUP.MAC:3724`) runs an init loop (`LDX I,14.` — decimal 14) and seeds a
default score table `SCOINI: .BYTE 50,69,0, 05,70,0, 30,73,0, 95,74,0, 0,75,0`
(`W3DSUP.MAC` in that routine — five BCD seed triples), and `DSPHI` moves "BEST" to
the display bucket from `HSCORL+<3*4>`. The exact **ladder depth** and the default
names/scores are the ROM's, not the shared default. **mc7-1 must pin depth and the
seed table to their cited `W3DSUP` symbols at RED and parameterize
`@shared/highscore` if the depth ≠ 10 — never hard-code 10 uncited.** This is the
direct analogue of mc5's "pin the magazine size to its symbol" rule.

### 2. Entry is a distinct short-lived phase gated on qualification

The ladder update is a search-then-insert: `UPDATE HIGH SCORE LADDER`
(`W3DSUP.MAC:3780`) → `SEARCH FOR NEW ENTRY ON LADDER` (`:3958`) → `INSERT SCORES
+ INITIALS ON LADDER` (`:3868`). Initials are taken only when the final score
qualifies, in `TAKE INITIALS FOR NEW HIGH SCORE` (`:4064`), which is a bounded
interaction: it **aborts on a start-switch press or a timeout**
(`W3DSUP.MAC:4064-4075`, ";ABORT IF EITHER START SWITCH PRESS", ";TOO MUCH TIME?
… ABORT INITIALS"). So `'entry'` is a real transient phase between game-over and
attract, not a modal side effect — it belongs in the state machine (finding drives
the mc6 coupling), and it has a **timeout/abort** path that must be modelled, not
just the happy path.

### 3. The ROM enters initials by trackball cursor, not a keyboard — the port maps input, reuses the buffer

`TAKE INITIALS` is cursor-driven: `ATRACB` indexes the initial array and the
trackball (`ADCURS`, via `TBHD` horizontal displacement, `W3DSUP.MAC:4064+`) scrolls
the current letter; `INTLHS` holds the horiz coords of the **3** initials being
entered (`W3DSUP.MAC:4060`, ";HORIZ COORD OF 3 INITIALS BEING ENTERED"). MC's
browser controls are mouse/trackball + Z/X/C (registry: `missile-command`), not a
joystick. `@shared/name-entry.stepNameEntry(buffer, key, maxLength)` is
keystroke-shaped. **Design ruling:** reuse `stepNameEntry` for the pure 3-char
buffer transitions and drive it from MC's input scheme (trackball scroll → letter
step, fire → commit), rather than re-implementing a buffer or forcing a keyboard.
Whether the letter cycling is trackball-scroll or key-step is a shell input-mapping
choice over the same pure buffer; the buffer stepping stays shared. Charset and
the 3-length are pinned from `INTLHS`/`TAKE INITIALS` at RED.

## Architecture — pure ladder + entry in core, storage in shell

Follows `[[highscore-initials-live-in-core]]` and the asteroids/joust consumer
shape. Each new `src/core` file is scanned by `purity.test.ts` and
`citations.test.ts`.

### New / changed core modules

- **`highscore.ts` (new, MC domain wrapper).** Thin MC-typed layer over
  `@shared/highscore`: the MC `HighScoreEntry` row type, `qualifiesForHighScore`
  over MC `GameState.score`, `insertHighScore` at the **ROM-pinned depth**, and the
  seeded default table (finding §1). No storage here — pure.
- **`state.ts` (changed).** Add the `'entry'` phase: on the game-over SETUP task, if
  `qualifiesForHighScore(table, score)` the machine routes to `'entry'`; otherwise
  straight to the game-over→attract timeout (mc6-6). `'entry'` holds the initials
  buffer and an abort/timeout countdown (finding §2); committing inserts and
  returns to attract. If mc6 has landed, this is a SETUP task; if not, it is a
  `Phase` member re-homed later.
- **`name-entry` usage (no new module).** The 3-char buffer is
  `@shared/name-entry.stepNameEntry`; MC only owns the buffer *field* on the
  `'entry'` phase state and the commit trigger.

### Shell (functional only; authentic render is mc9)

- **`storage` (shell).** On boot, read the MC table from one-origin
  `localStorage` under `highScoreKey('missile-command')`; on commit, write it.
  This is the *only* mc7 code the core does not own — load + save trigger, exactly
  the asteroids/joust pattern. One origin means the key is shared cabinet-wide
  (CLAUDE.md Production; ADR-0004 amendment).
- **`render.ts` (changed).** Draw the ladder on the attract high-score slot mc6-5
  exposes, and the initials-entry cursor during `'entry'`. Functional layout;
  pixel-authentic stamp typography is mc9.
- **`input.ts` (changed).** Map trackball scroll → letter step and fire → commit
  during `'entry'` (finding §3), and the start-switch/timeout abort.

**Rejected alternative — a bespoke MC high-score module.** Re-implementing the
table, qualifies, and buffer would duplicate four existing consumers and the
shared tests, violating reuse-first for no ROM-fidelity gain (the ROM fidelity is
in the *depth, default table, charset, and abort rules* — all expressible as
parameters/claims over the shared primitives).

## Stories — reuse-first order

Matches the four stories materialized in `sprint/epic-mc7.yaml`. Point estimates
are the Architect's sketch; grooming refines them.

### mc7-1 — High-score table in core (pure), over `@shared/highscore`

MC `highscore.ts`: the MC row type, `qualifiesForHighScore` + `insertHighScore`
over `GameState.score`, ladder **depth pinned to the ROM** (verify vs `INITIALIZE
HIGH SCORE TABLE`, `W3DSUP.MAC:3724`; `UPDATE HIGH SCORE LADDER`, `:3780`; not
hard-coded 10), and the seeded default table `SCOINI`.

- **New:** `highscore.ts` (MC wrapper). **mc6-independent.**
- **Claims:** `MC-HISCORE-DEPTH` (the ROM ladder length), `MC-HISCORE-DEFAULTS`
  (the `SCOINI` seed table), `MC-HISCORE-QUALIFY` (qualify rule).

### mc7-2 — Name-entry `'entry'` phase + initials buffer, over `@shared/name-entry`

On game-over, a qualifying score routes `phase` → `'entry'`; `stepNameEntry`
drives the 3-char initials buffer over the ROM charset; **abort on start-switch or
timeout** (`TAKE INITIALS`, `W3DSUP.MAC:4064`; `INTLHS` 3-length, `:4060`);
commit inserts into the table then returns to attract/game-over. Slots into
mc6-1's phase machine (SETUP task if mc6 has landed).

- **Changed:** `state.ts` (the `'entry'` phase + timeout/abort), `game.ts`.
- **Claims:** `MC-INITIALS-LEN` (3), `MC-INITIALS-CHARSET`, `MC-ENTRY-ABORT`
  (start-switch/timeout).
- **Soft dep:** mc6-1 (the phase machine it slots into).

### mc7-3 — Persistence via one-origin `localStorage`

Shell reads on boot and writes on commit under `highScoreKey('missile-command')`;
core stays pure (owns table/qualifies/initials), shell holds only the storage +
save trigger. Reuse the asteroids/joust `@shared/highscore` consumer pattern.

- **Changed:** shell storage + boot wiring. **mc6-independent.**
- **Claims:** none new in core; a consumer test that a committed entry survives a
  reload.

### mc7-4 — ROM-faithful ladder display + seeded default table

Seed the initial ladder from the cited `INITIALIZE HIGH SCORE TABLE` defaults and
render the ladder on the attract high-score screen (the mc6-5 slot). Pin default
names/scores at RED (`W3DSUP.MAC:3724`; `DISPLAY HIGH SCORES TABLE`, `:4290`).

- **Changed:** `render.ts` (ladder on the attract slot). **Soft dep:** mc6-5 (the
  slot); renders standalone if mc6 not yet landed.
- **Claims:** `MC-HISCORE-DEFAULTS` shared with mc7-1 (the seed table is one
  citation, consumed twice — one claim, not two).

## Testability notes for TEA

- `highscore.ts` and the `'entry'` transitions are pure and seeded — unit-test
  like the shared `highscore.test.ts`, plus MC-specific: qualify at the boundary
  (one point below / at / above the lowest ladder score), insert ordering, and
  depth truncation at the ROM depth (not 10 unless the ROM says 10).
- **The abort/timeout path is not optional coverage** (finding §2): pin
  start-switch-during-entry → abort (no insert) and timeout → abort, alongside the
  happy commit. A suite that only tests a successful 3-letter commit misses the two
  ROM abort branches.
- **Persistence round-trip** (mc7-3): a committed entry must survive a simulated
  reload under `highScoreKey('missile-command')`; assert the *shared* key, so a
  regression to a per-game key (pre-one-origin) is caught.
- **Default seed table** is a `.BYTE` table → derive each entry from the cited
  bytes and assert the whole table, not one row (the `[[mc-citations-jsdoc-leak]]`
  rule: `.BYTE` tables need a derived + consistency check, and citations must be
  `//` line comments, not `/** */`, or the scanner leaks the numbers).

## Open questions

- **O-7a (ladder depth):** is REV-01's ladder 10 like the shared default, or its
  own length? `LDX I,14.` and `HSCORL+<3*4>` are the anchors; mc7-1 RED pins it. If
  ≠ 10, `insertHighScore`/`MAX_HIGH_SCORES` must accept a depth argument rather
  than MC forking the shared module.
- **O-7b (initials input mapping):** trackball-scroll letter cycling vs discrete
  key-step over the shared buffer (finding §3) — a shell input-mapping choice;
  resolve at mc7-2 with the human smoke test the MC pointer-lock/trackball path
  already needs.
- **O-7c (REV-01 vs REV-03 ladder):** default names/scores and depth are a place
  the revisions diverge; mc7 ships REV-01 and catalogues the REV-03 delta in the
  mc7-1 claim note if the REV-03 source is vendored (shared blocker with mc5-4).
