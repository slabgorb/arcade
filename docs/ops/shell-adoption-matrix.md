# Shell adoption matrix — which game uses which host helper

The live decision table for the three compositional host helpers in
[`src/shared/host-helpers.ts`](../../src/shared/host-helpers.ts): `mountCanvas`,
`installAudioUnlock` and `installPauseToggle`. Landed by story **sc1-1**.

`tests/shell-convergence.test.mjs` reads this file on every run and checks it
against the seven `plugins/*/src/main.ts`. It is therefore not a description of
the tree — it is a claim the tree is allowed to refute.

Baseline: 088bc3d

## The table

The markers below delimit the machine-read block. Other tables in this file are
prose; only this one is the contract, and the test refuses to run without them.

<!-- adoption-matrix:start -->

| game | mountCanvas | installAudioUnlock | installPauseToggle |
|------|-------------|--------------------|--------------------|
| tempest | adopted | adopted | own-implementation |
| star-wars | adopted | adopted | own-implementation |
| asteroids | adopted | adopted | own-implementation |
| battlezone | adopted | adopted | own-implementation |
| red-baron | adopted | adopted | own-implementation |
| centipede | rom-cadence | rom-cadence | own-implementation |
| joust | adopted | rom-cadence | own-implementation |

<!-- adoption-matrix:end -->

## What the cells mean

The vocabulary is closed, and the test rejects anything outside it. That is
deliberate: prose reasons rot silently, and a reason nobody can check is a reason
nobody will re-examine.

| cell | meaning |
|---|---|
| `adopted` | the game calls this helper. The test requires the import to exist. |
| `behaviour-absent` | the game does not do this thing at all, so there is nothing to converge. **The test refutes this against the tree** — if the game turns out to perform the behaviour, the cell is wrong and the suite says so. |
| `rom-cadence` | the game performs the behaviour, but it runs a cabinet's own frame cadence and the risk is not worth the tidiness. A deliberate deferral, not an oversight. |
| `own-implementation` | the game has its own version that is not merely a copy. No tree check and no import/call check apply to this code — see the pause-overlay note below for the fleet-wide case, and the battlezone note for the case that nearly needed it before that. |

**A `rom-cadence` cell is the interesting one**, because it is the only code that
says "yes, this game does this, and we chose not to touch it". Nothing here is a
missed opportunity; the two rows are argued below.

## Why centipede and joust defer the audio unlock (and centipede the canvas mount)

Both run the original cabinets' frame cadences — centipede on `FRAME_HZ =
15750/263`, joust on its own `FRAME_DURATIONS` timebase — and both are gated
against original source. The epic's constraint is explicit: a helper that changes
when a frame starts or how input is sampled is a regression **even if every test
stays green**. That reasoning covers `installAudioUnlock`, which sits next to the
frame/input plumbing; it does NOT cover the pause toggle, whose listener is
independent of both — which is why centipede later adopted that one alone (see the
pause note below). Nor does it cover `mountCanvas`: a one-shot at boot, it runs
before the first frame and touches neither the cadence nor the input sample —
which is why joust adopted it in SH3-2 (the canvas-mount note below).

joust makes the audio-unlock risk concrete. Its unlock is not a separate listener;
it is fused into the handler that samples input:

```ts
const held = installHeldKeys(window, { preventDefaultFor: new Set(['Space']) })
window.addEventListener('keydown', (e) => {
  audio.resume()                                   // the unlock
  if (cabinet.mode === 'highscore') entry = ...    // the initials edge, on the same event
})
```

(SH4-2 moved the held-set sample itself into the shared `installHeldKeys` tracker;
the unlock and the highscore-initials edge still ride this same keydown.) Adopting
`installAudioUnlock` there necessarily edits the input path — precisely the hazard
the epic names. The helper would have to be added *alongside* that listener rather
than replacing it, which buys nothing: one line of `audio.resume()` would be traded
for one line of `installAudioUnlock(...)` plus a second listener on the same event.
`tests/shell-convergence.test.mjs` pins the `installHeldKeys` sampling, and joust's
own suite pins the deferral, so a later story cannot quietly make that trade.

## Why joust adopted the canvas mount but centipede has not

The canvas mount is a different cell from the audio unlock: it is a boot-time
one-shot that carries none of the cadence/input risk above. Both games hand-wrote
the same checked mount — with a byte-identical error string, which is what proved
`mountCanvas` was worth extracting at all. **joust adopted it in SH3-2**, retiring
`querySelector('#game')` + the two bespoke throws for `mountCanvas(document)`; a
user ruling on 2026-08-11 split joust's two cells deliberately — mount yes,
audio-unlock deferred — precisely because only the audio half touches the input
path. **centipede's mount stays `rom-cadence`** — a lower-priority judgement call,
not the cadence hazard; a later story may retire it the same way.

Their pause cells diverged. During sc1 neither game had a pause at all, so both
were `behaviour-absent` — checked, not asserted: their `main.ts` mentioned no
pause key, toggle or gate, and **neither grew a pause during the convergence**
(AC-1's rule and the epic's words, "a game that has no pause today must not grow
one"). That rule scopes the *convergence* story — it forbids a refactor sneaking
in a new behaviour — and does not bind a later feature story that deliberately
adds one.

**centipede did exactly that in cp7-6**: it grew a player pause (the house cabinet
feature the vector games already had) and adopted `installPauseToggle` for it, so
its pause cell is now `adopted`. Because the behaviour did not exist at the
baseline, this is the one cell the AC-1 growth check exempts by name — a
`DELIBERATE_GROWTH` entry in `tests/shell-convergence.test.mjs` citing cp7-6. The
exemption is narrow: it waives only the "existed at baseline" test, so the
`adopted`-requires-import-and-call check still holds centipede to actually wiring
the helper. **joust's pause stays `behaviour-absent`** — it never grew one; that
cell is still refuted against the live tree on every run.

## installPauseToggle is retired fleet-wide: pause is now overlay-driven (sa1-5)

**sa1-5** (key rebinding) gives every game a controls overlay
(`createControlsOverlay`), and the simplest correct place to gate the pause
freeze is that overlay's own open/closed state — the sim freezes while
`overlay.isOpen()`, rather than through a separate pause key and the shared
`installPauseToggle` listener. Once a game owns its pause through the overlay,
the shared helper is no longer what drives it, even for the games that used to
call it, so **every `installPauseToggle` cell in the table above is now
`own-implementation`** — there is no adopted/rom-cadence/behaviour-absent
distinction left to draw for this column; all seven games gate on their own
overlay.

This also **corrects joust's previously-stale `behaviour-absent` cell**: sa1-2
gave joust an ESC pause overlay (landed in the "consistent ESC pause overlay
per-game" work), so by the time sa1-5 was picked up joust's main.ts already
performed the behaviour the matrix still recorded as absent —
`tests/shell-convergence.test.mjs`'s AC-1 `behaviour-absent` refutation test
was catching exactly this drift before it was retired (see that test file for
why the guard itself is now gone rather than merely fixed: with no
`behaviour-absent` cell left anywhere in the table, there is nothing left for
it to refute).

## Why battlezone counted as `adopted` for pause (pre-sa1-5 history)

Before sa1-5 retired the column fleet-wide (previous section), battlezone's
cell read `adopted`, not `own-implementation`, and this section recorded why.
It imported its pause primitives from its own `src/shell/pause.ts`, and the
design spec's original table recorded that as an own implementation. Reading
the module settled it: it **re-exported `INITIAL_PAUSED`, `isPauseKey` and
`togglePaused` verbatim from `@shared/pause`**, and only `stepUnlessPaused` was
a local 4-argument delegate.

So the keydown listener was the same one the other four carried, and
battlezone adopted the helper while keeping its own gate and its own overlay —
the helper took the pause predicate as a parameter for exactly this reason. It
adopted the wiring without adopting a policy. sa1-5 replaced that keydown-driven
wiring with the overlay's own open/closed gate, which is why the cell moved to
`own-implementation` along with the other six games.

## The stale table this replaces

Section 4.3 of the [plugin-host design spec](../superpowers/specs/2026-07-30-arcade-plugin-host-design.md)
carries the original measured matrix. It was correct when it was written on
2026-07-30 and **wrong within 48 hours**: it records centipede and joust as having
no audio unlock, and both gained one immediately afterwards —

| game | gained the unlock | story | commit |
|---|---|---|---|
| joust | 2026-07-31 | jt5-1 | `2cafac2` |
| centipede | 2026-08-01 | cp5-2 | `6c2bf1a` |

That is the whole argument for the shape of this file. A recorded census is a claim
about seven source files that nothing re-runs, so it starts rotting the moment it
is written. **This table records only the decision.** Whether a game performs a
behaviour at all is derived from the tree on every test run and never written down
here, so there is nothing left to go stale — and `behaviour-absent`, the one code
that does assert something about the source, is checked against the source.
