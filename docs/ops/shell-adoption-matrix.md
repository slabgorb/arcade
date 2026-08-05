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
| tempest | adopted | adopted | adopted |
| star-wars | adopted | adopted | adopted |
| asteroids | adopted | adopted | adopted |
| battlezone | adopted | adopted | adopted |
| red-baron | adopted | adopted | adopted |
| centipede | rom-cadence | rom-cadence | adopted |
| joust | rom-cadence | rom-cadence | behaviour-absent |

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
| `own-implementation` | the game has its own version that is not merely a copy. Currently unused — see the battlezone note below for the case that nearly needed it. |

**A `rom-cadence` cell is the interesting one**, because it is the only code that
says "yes, this game does this, and we chose not to touch it". Nothing here is a
missed opportunity; the two rows are argued below.

## Why centipede and joust defer the canvas mount and audio unlock

Both run the original cabinets' frame cadences — centipede on `FRAME_HZ =
15750/263`, joust on its own `FRAME_DURATIONS` timebase — and both are gated
against original source. The epic's constraint is explicit: a helper that changes
when a frame starts or how input is sampled is a regression **even if every test
stays green**. That reasoning covers `mountCanvas` and `installAudioUnlock`, which
sit next to the frame/input plumbing; it does NOT cover the pause toggle, whose
listener is independent of both — which is why centipede later adopted that one
alone (see the pause note below).

joust makes the risk concrete. Its audio unlock is not a separate listener; it is
fused into the handler that samples input:

```ts
window.addEventListener('keydown', (e) => {
  audio.resume()            // the unlock
  held.add(e.code)          // the input sample
  if (e.code === 'Space') e.preventDefault()
})
```

Adopting `installAudioUnlock` there necessarily edits the input path — precisely
the hazard the epic names. The helper would have to be added *alongside* that
listener rather than replacing it, which buys nothing: one line of `audio.resume()`
would be traded for one line of `installAudioUnlock(...)` plus a second listener on
the same event. `tests/shell-convergence.test.mjs` pins the `held` sampling so a
later story cannot quietly make that trade.

Both games already hand-wrote the checked canvas mount — with a byte-identical
error string, which is what proved `mountCanvas` was worth extracting at all — so
adopting it there would be the lowest-value, highest-risk cell in the table.

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

## Why battlezone counts as `adopted` for pause

battlezone imports its pause primitives from its own `src/shell/pause.ts`, and the
design spec's original table recorded that as an own implementation. Reading the
module settles it: it **re-exports `INITIAL_PAUSED`, `isPauseKey` and
`togglePaused` verbatim from `@shared/pause`**, and only `stepUnlessPaused` is a
local 4-argument delegate.

So the keydown listener was the same one the other four carried, and battlezone
adopts the helper while keeping its own gate and its own overlay — the helper takes
the pause predicate as a parameter for exactly this reason. It adopts the wiring
without adopting a policy.

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
