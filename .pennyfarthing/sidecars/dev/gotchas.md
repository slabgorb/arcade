# Dev Gotchas

Common pitfalls encountered during Dev (GREEN / implementation) work.

---

### Moving a shared mechanism into a NEW coordinate space breaks siblings THREE ways RED can't see — and the front-end wiring is a silent no-op unless you thread it yourself

**Situation:** GREEN work that changes the SPACE a core mechanism reads, not just its value —
rb4-16 moved the red-baron enemy window-servo from reading the plane's stored WORLD position to
its POST-DIVIDE SCREEN position `(world − eye) × POSITH_SCALE / positionZ`, and replaced an ad-hoc
±olim world clamp with the ROM's PLONSN screen bound. TEA rewrote ONLY the new suite
(`plonsn.test.ts`) and reported "zero collateral, full suite 1111 pass."

**Problem — TEA's "zero collateral" is the RED-vs-OLD-code illusion.** RED runs the NEW tests
against the OLD implementation, so it CANNOT see the ripple GREEN introduces. Moving the servo
world→screen turned SIX sibling assertions RED on the FULL green run, in files TEA never touched,
in three distinct flavours: (1) **world-space zone fixtures** (`withEnemy({ x: -(ilim>>1) })`
expecting "inside the inner window") — now the wrong ZONE, because `x` is a world coord and the
servo reads `x × scale / depth`; (2) a **retired-invariant assertion** (`right.x ≤ olim`) — AC-3
DELETES the ±olim fence, so world may now exceed olim by design; (3) a **real code regression** —
the ±olim `clamp` used to be X's NaN sink, and the new per-axis PLONSN clamp dropped it, so a NaN
x survived (a totality test, correctly RED). `npm test` (vitest) catches all three, but ONLY on
the WHOLE suite — never on the story's own file.

**Problem — the front-end wiring is a SILENT NO-OP.** The eye-aware servo is worthless unless
`main.ts` actually passes the eye. TEA's RED pinned the CORE seam (3-arg `stepWave` in the new
suite) but NOTHING asserts `main.ts` threads it — `main.ts` shipped `stepWave(enemies, level)`
(2-arg), so the real game read the boresight and re-created the exact soft-lock the story kills,
with 1120 tests green. The Dev self-review "wired to front end" line is the only thing that
catches it. The consumer half (`guns.step(…, eye)`) was already wired a story earlier, which
makes the producer gap easy to miss.

**Prevention:** (1) After a space/mechanism change, `grep -rn` the WHOLE `tests/` for every fixture
that hand-builds the old-space coordinate or asserts the retired invariant, and run the FULL
`npm test` before declaring green — never the story's file alone. Re-seat intent-preservingly:
seat zone fixtures at the IDENTITY depth (`positionZ = POSITH_SCALE` ⇒ screen == world) so the
zone logic reads unchanged with the divide factored out; re-express excursion proxies that the new
space legitimately shrinks (a weave whose WORLD amplitude falls as it closes is still a weave —
assert the DELTA oscillates, not `maxAbs(world) > k`); delete assertions of the invariant the AC
retires. Log each as a Dev deviation + a "TEA re-seat gap" Delivery Finding. (2) Trace the new
input to the FRONT END (`main.ts`) and thread it — the producer call, not just the consumer — and
file the missing-wiring test as a Finding. (3) When an undetermined ROM constant (here the Math
Box divide's fixed-point) gates a "measure-and-see" guard (AC-R3), pin it EMPIRICALLY by sweeping
through the exact guard and choosing the clean power-of-two centred in the band that holds EVERY
baseline — that is the D5 process ("pin the scale/unit, never re-tune the bar"), and document it
as a declared seam with the derivation shown, not a magic number.

**Example (rb4-16):** 6 red siblings across `enemy.test.ts`/`enemy-machine.test.ts` (3 zone
fixtures re-seated to identity depth, 1 Y-weave re-driven with a band-centred eye, 1 beeline
re-expressed via deltaX sign-oscillation, 1 ±olim assertion deleted per AC-3), 1 code NaN-fix in
`plonsnClamp`, `main.ts:577` given `toEye(flight)`, and `POSITH_SCALE = 2^14` swept-and-pinned
(L0 15000/15000 exact; L1-4 244/110/66/26 ≥ the 208/44/32/17 bar). Net red-baron 1120 green.

---

### Widening an arcade-shared cookie/transport FORMAT breaks TWO coupled suites, not the one TEA scopes — and `"NO SCORES YET"` trips the `/NO SCORE/` source guard

**Situation:** GREEN work that changes the VALUE SHAPE of a published `@arcade/shared`
transport — lb2-8 widened the cross-origin high-score summary cookie from a single bare
number (`arcade-hi-<gameId>=124500`, ADR-0004) to a top-N list of name+score rows.

**Problem (two-suite coupling):** TEA's RED correctly flags the obvious coupled suite
(`highscore-publish.test.ts`) for the rows migration — but the ORIGINAL transport suite from
the feature's first story (`arcade-shared/tests/score-cookie.test.ts`, the lb2-2 ~50-test
baseline) is *equally* welded to the bare-number signature (`publish('tempest', 124500)` →
asserts `arcade-hi-tempest === '124500'`). It sits in the GREEN baseline as "passing", so
`grep`-ing only the TEA-named file misses it; the instant you widen the transport it goes RED
in a suite RED never touched. vitest catches it on the FULL run, not the story's own file.

**Problem (source-guard substring):** the honest empty-state string `"NO SCORES YET"` CONTAINS
`"NO SCORE"`, and `lobby/tests/refresh-rules.test.ts` has a `?raw` source guard `/NO SCORE|HI·/`
that forbids that substring ANYWHERE except `src/core/score.ts`. Defining the constant in the
board component fails the guard even though the board is the only consumer.

**Prevention:** (1) When widening a shared transport format, `grep -rln "<the-cookie-prefix>\|publish(" arcade-shared/tests/`
for EVERY suite asserting the old shape — migrate all of them (scalars → one-row ladders,
`null` → `[]`, route number/null reads through the back-compat reader), not just TEA's named one.
Log the extra migration as a Dev deviation + Delivery Finding so Reviewer confirms the coverage
(scope/injection/fail-soft) survived and any dropped test is justified. (2) Put any cabinet-copy
string that contains a guarded token in `core/score.ts` (the one place the guard allows) and
import it — never inline it in the shell.

**Also (overlay, not a regression):** developing the lobby against a locally-overlaid widened
`node_modules/@arcade/shared` — the package.json pin stays at the OLD tag until the finish-time
repin — Vite serves the STALE pre-bundled dep from `.vite` until `rm -rf node_modules/.vite &&
vite --force`. vitest/tsc stay green throughout, so a blank dev-server page with a missing-export
console error is a cache artifact, NOT your code. It will not recur after the finish repin.

**Example (lb2-8):** widening broke `score-cookie.test.ts` (unnamed by TEA) alongside
`highscore-publish.test.ts`; migrated both, dropped one now-meaningless decline-vs-clear test
(the guarantee moved to the factory boundary), `NO_SCORES_YET` defined in `core/score.ts`.
Net arcade-shared 490 green, lobby 150 green, both builds clean.

---

### To implement an authentic vector shape, pull geometry from historicalsource — `star-wars/reference/disasm/` doesn't have it

**Situation:** GREEN-phase implementation of an authentic 1983 vector *shape* (fireball, explosion, gunshot, object picture) in the star-wars game.

**Problem:** `reference/disasm/` is only the two-board 6809 disassembly. It shows the draw *routine* + a `JSRL`/`VR` picture *address* (e.g. fireball `sub_AC52` → `JSRL $A015`), but the AVG vector-picture ROM — the actual `AON/AOFF/FUSE` vertex deltas — is **not** there. Coding "to match the disasm" leaves you guessing the geometry.

**Prevention:** Get the exact geometry from the preserved Atari source: GitHub **`historicalsource/star-wars`** (commit `5355b76`, codename **"Warp Speed"**) → **`WSVROM.MAC`** = object pictures. Translate its `CXY`/`COLOR`/`AON dx,dy`(draw)/`AOFF dx,dy`(move)/`FUSE`(dot) directives into our TS render.

**Fix:** `curl -sSL raw.githubusercontent.com/historicalsource/star-wars/5355b76/WSVROM.MAC` → `tr '\r' '\n'` (CR-terminated non-UTF8) → `grep -a`. Match the picture label the disasm's `JSRL` targets; re-express as our own code (never copy verbatim — it's copyrighted, study-only).

**Example:** enemy fireball = `GNB0–3` (base sparkle, `COLOR VGCRED`, ~8 spikes from center `(0,0)` + `FUSE` balls, 4 flicker frames) + `GNT0–3` (small tip fuse-ball); `ASPECT` for round; distance-scaled. Red, spiky — NOT concentric amber rings. Writeup: `star-wars/docs/star-wars-1983-source-findings.md` ("Original Atari source").

---

### Adding a `GameEvent` variant fails `tsc` in two exhaustiveness spots — vitest stays green and hides it

**Situation:** GREEN work that adds a new `GameEvent` union member in `star-wars/src/core/events.ts` (a new scoring bonus, cue, or HUD trigger — common in the sw2/sw3 fidelity epics).

**Problem:** `npm test` (vitest via esbuild) strips types and passes, so you think you're done — but `npm run build` (`tsc --noEmit`) fails with `Type 'XEvent' is not assignable to type 'never'` in the exhaustive consumers. Two are easy to miss because neither is the file you edited:
1. `src/main.ts` — the event→sound/HUD pump's `default:` arm has a `const _exhaustive: never = event` guard; every variant needs a `case`.
2. `tests/core/events.test.ts` — a union CENSUS: `ALL_EVENTS` (one instance per variant), a `discriminant()` switch with the same `never` guard, AND a `expect(new Set(kinds).size).toBe(N)` + exact-set assertion. All three must grow.

**Prevention:** After adding the interface + union member, `grep -rn "'<your-new-type>'\|: never" src tests` and run `npm run build` (NOT just `npm test`) before declaring GREEN. The Dev exit gate's `pf check` runs the typecheck, so a skipped build just fails later.

**Fix:** add the `case` in `main.ts` (reuse an existing `audio.play(...)` cue if no new asset — the `force-bonus`/`tower-bonus` pattern), and in `events.test.ts` add the `ALL_EVENTS` entry, the `discriminant` arm, and bump the count + set. Note: RED (TEA) often pins the new event's behavior but leaves this census un-extended — flag it as a Delivery Finding when you close it.

**Example (sw3-3):** adding `TowerBonusEvent` broke `main.ts:196` and `events.test.ts:99`; fixed by a `levelClear` cue arm + census bump 14→15.

---

### Optional entity fields get silently stripped by sim `.map()` rebuilds — spread the source object

**Situation:** GREEN work adds an optional field to a star-wars core entity (`Turret.kind`, a per-TIE timer, any new discriminator) that must survive across frames.

**Problem:** The sim's per-frame advance loops rebuild entities with object literals — e.g. `stepSurface`'s scroll map returned `{ pos, age }`, which would drop `kind` on the FIRST step after spawn. Tests that only inspect freshly-spawned entities stay green; anything reading the field a frame later sees `undefined`. With `absent == default` semantics (back-compat), this degrades silently — bunkers would all quietly become towers.

**Prevention/Fix:** When adding a field, grep the entity's type name through `src/core/sim.ts` for rebuild sites (`.map((x): Type =>`, literal returns) and switch them to spread-plus-override: `{ ...turret, pos, age: ... }`. Determinism tests that fingerprint a full run (same-seed kind sequences) catch this class of bug; single-frame spawn assertions do not.

**Example (sw3-11):** `Turret.kind` ('tower' | 'bunker') — the scroll map was the one rebuild site; TEA's same-seed sequence test only stayed honest because the map was changed to `{ ...turret, pos, age }`.

---

### Animate a shell render effect off the sim stamp, never shell effect-state or a wall-clock

**Situation:** GREEN for a star-wars/tempest render ANIMATION — a multi-frame flicker (gunshot sparkle `GNB0-3`), an explosion, a pulsing glow — where the shape must change over time on screen.

**Problem:** The obvious reaches are wrong. A module-level frame counter incremented per `render()` call makes `render()` non-deterministic (breaks the recording-canvas tests and the "render is a pure function of state" contract). `Date.now()`/`performance.now()` is worse — non-deterministic AND drifts toward the core-boundary rule. Adding a `Map<shotId, phase>` of shell effect state is scope creep and a lifecycle headache.

**Prevention:** Derive the frame from a quantity the SIM already stamps on the entity. For projectiles that's `elapsed = <TTL const> - entity.ttl`; `render.ts` already uses exactly this for the muzzle flash and player-laser flash ("derived purely from elapsed flight vs TTL — no shell-side effect state"). `frame = floor(elapsed / SECONDS_PER_FRAME) % N`. Deterministic, zero new state, and unit-testable by varying the entity's `ttl` in the fixture.

**Fix:** Thread the entity's `ttl` (or its sim timestamp) into the draw fn as a param and pick the frame there. Keep the geometry tables `ReadonlyArray<ReadonlyArray<readonly [number, number]>>` (one inner array per frame). Leave the frame RATE (`*_FRAME_SECONDS`) and any sub-feature SCALE as named consts — they're eyeball tunables for the sw2-7 playtest, not test-pinned. Confirm `git diff develop...HEAD` shows `src/shell` only — no `src/core`.

**Example (sw3-13, worked as sw3-11):** fireball flicker — `drawFireball(…, ttl)`, `frame = floor((ENEMY_SHOT_TTL - ttl)/0.05) % 4`, `FIREBALL_FRAMES[frame]` + `FIREBALL_FUSE_FRAMES[frame]`. TEA's tests sweep 24 `ttl` values and assert ≥2 distinct signatures — a static table (1 signature) fails, any age-driven flicker passes, and the seam stays shell-only.

---

### Tightening a shared game mechanism breaks sibling test FIXTURES across many files — TEA's re-seat is usually incomplete; grep the whole `tests/` for the trigger

**Situation:** GREEN work that TIGHTENS or GATES a core game outcome the whole suite leans on as a *trigger* — the exhaust-port kill, a phase-clear, a scoring event. RED (TEA) re-seats the one or two "obvious" sibling suites (and says "zero regressions elsewhere"), but that RED verification runs the NEW tests against the OLD code, so it CANNOT see the ripple your gate introduces.

**Problem:** Many unrelated suites (speech cues, music cues, voice timers, determinism) don't test the mechanism — they stage it as a fixture to drive OTHER events (`greatShotKid` speech, `imperialMarch` music, `level-clear`, wave++). They share a `portKill(state)`-style helper that parks a bolt on the port at its **spawn** position (`spawnPort → -EXHAUST_PORT_DISTANCE`). The instant your window gate lands, every one of those kills silently stops firing → a fan-out of failures in files RED never touched. Unlike the `tsc`-only `GameEvent`-exhaustiveness trap, **vitest DOES catch these** — so you'll see them on the GREEN run, but only if you run the FULL suite, not just the story's new file.

**Prevention:** Before declaring GREEN, `grep -rn "portKill\|<trigger-event>\|exhaustPort:\s*{" tests/` for EVERY fixture that stages the mechanism you changed, not just the files named in the TEA assessment. Any fixture seating the trigger OUTSIDE your new gate needs the same in-window re-seat TEA applied to its two siblings.

**Fix:** Re-seat the fixture INTO the gate (mechanical, assertion-preserving): move the port to an in-window `-300`, keep the parked-bolt style. These files often don't import `Vec3` — type the literal off the existing value: `const p = state.exhaustPort!.pos; const port: typeof p = [p[0], p[1], -300]`, then override `exhaustPort: { pos: port }`. Log it as a Dev deviation AND a Delivery Finding (Gap: "RED's sibling re-seat missed N spots") so Reviewer/TEA can confirm the intent (the feature under test) is unchanged — you only relocated where the kill happens.

**Example (sw3-15):** the `$800` approach-window gate turned 10 tests RED across `speech-cues`, `music-cue`, `trench-voice-timer`, and one `exhaust-port-outcome` determinism test (`-1500`) — none named by TEA, all fixed by re-seating their `portKill`/inline port to `-300`. TEA had re-seated only `force-bonus` + one `exhaust-port-outcome` test.

---
### Eyeballing a render change? The pinned dev port may already be served by ANOTHER CHECKOUT — you'd be verifying someone else's code

**Situation:** GREEN work on a shell/render change (geometry, orient, scale, palette) that the code's own comments say "MUST be eyeballed in the dev server" — structural tests can't catch an orientation or scale error. You go to screenshot `localhost:5274`.

**Problem:** The arcade repo is checked out **many times** (`a-1`, `a-2`, `a-3`, …) and every checkout's vite config pins the SAME port (`strictPort`). Whichever checkout started a server first owns it. If a sibling checkout is already serving 5274, then:
- `npm run dev` in YOUR checkout dies with `Port 5274 is already in use` — the loud, harmless case; but
- if you skip straight to the browser (or the server was already up), `localhost:5274` silently serves **the other checkout's working tree**. You screenshot it, see the old geometry, and conclude your change didn't work — or worse, see a *good* render that isn't yours and sign off GREEN on unverified code.

The CLAUDE.md rule "canonical is the repo, not the directory" is the same trap wearing a different hat.

**Prevention:** Before trusting ANY screenshot, prove which checkout is answering the port:
```bash
PID=$(lsof -ti tcp:5274 | head -1)
lsof -a -p "$PID" -d cwd -Fn | grep '^n'      # → n/Users/you/Projects/a-2/star-wars
```
If the cwd isn't your checkout, do NOT kill it (it's another session's work). Serve YOUR tree on a spare port instead: `npx vite --port 5284 --strictPort`.

**Fix/verify recipe (star-wars):** the game has dev-only phase-jump keys (`main.ts`, gated on `import.meta.env.DEV`) — `7` space, `8` surface, `9` trench, and backtick toggles the debug overlay. Jump straight to the phase you changed instead of playing to it. Screenshot, then crop+magnify the object with PIL (`im.crop(box).resize(..., Image.NEAREST)`) — a 40px-tall tower at the horizon tells you nothing until it's 8x.

**Example (sw5-5):** re-porting the ground objects into raw ROM units made `TOWER_ORIENT` a real matrix (was IDENTITY) — precisely the class of bug tests miss. Port 5274 turned out to be `a-2`'s vite. Serving a-1 on 5284 and pressing `8` showed the corrected tower: tall tapered yellow column, white cannon cap, standing on the floor. Also note pre-existing 404s for the remote `arcade-assets.slabgorb.com` music `.wav`s — console noise, not your regression.

---

### Rewriting a cited line has TWO honest exits, and `remediated_by` is only one of them — triage every LOST citation

**Situation:** GREEN work in tempest that edits/deletes lines the audit's findings cite as
`ours` (any tp1 story — tp1-6 rewrote the spawn block, the grab predicate, and the
level-clear gate in one commit).

**Problem:** `reanchor-citations.mjs` reports LOST and its own message offers "fix the
quote, or mark the finding remediated_by" — but those map to DIFFERENT situations and
picking by reflex writes a phantom fix into the audit. tp1-6's two LOST were both the
second kind: W-010 (a CONFIRMED whose anchor line I split) and WD-016 (an OPEN divergence
whose gate I respelled `remaining === 0` → `nymphs.length === 0` without fixing the
divergence — the ROM still warps out from under rim invaders and we still don't). Stamping
either would have closed the gate's eye on a live defect; the citation gate would go GREEN
on a lie and the sidecar's tp1-25 lesson says the Reviewer WILL find it.

**Prevention:** Before committing, run the reanchor tool and TRIAGE each LOST by asking
"did this story remove the DIVERGENCE the finding describes, or merely re-spell the line?"
Removed → `remediated_by` (quote frozen as history). Re-spelled → hand-edit `ours`
line+verbatim onto the new spelling and leave the finding open. Half-removed → neither:
re-point at the half that still diverges and file the split (the W-030/tp1-24 pattern).
And when a re-spell makes half the finding's CLAIM stale (WD-016's NYMCOU clause now
matches), log a finding for the audit curators rather than silently editing prose.

---

### Deleting a state mechanism? Grep the tests for INVARIANT pins on it — "RNG untouched" style assertions break semantically, not just at tsc

**Situation:** A GREEN that replaces a core mechanism and adds a NEW RNG draw site (tp1-6:
wave-init now rolls a lane per nymph, as the ROM's ININYM does).

**Problem:** tsc finds every fixture that touches the deleted SHAPE, but not the tests that
pin an INVARIANT the new mechanism legitimately breaks: `sim.framing.test.ts` asserted
`out.rng` deep-equal across the select→start commit ("framing transitions must not touch
RNG") — true for menus, now false for the commit that seeds a wave. Vitest catches it only
if you run the FULL suite; the assertion reads like a law, and the reflex is to "fix" the
implementation by hiding the draw (derived seed, pre-rolled lanes), which would silently
fork the RNG accounting away from the ROM's.

**Prevention:** When adding a draw site, grep tests for `rng` equality/snapshot assertions
(`toEqual(rngBefore)`, seed compares) and re-scope the pinned invariant to what is still
true (menu NAVIGATION stays RNG-free; the WAVE-SEEDING commit draws, citably). State the
ROM citation in the updated test comment so the next reader knows the draw is the arcade's
own cost, not leakage — and log the assertion-subject change as a deviation, since it is a
spec edit, not a translation.

---

### Adding a SECOND warp/dive phase shifts "frames until mode leaves warp" — the ROM-timing sibling tests that measured the in-well dive via that proxy break

**Situation:** GREEN work in tempest that inserts a new segment INTO the warp dive between the old in-well transit and the level advance — tp1-13 added the crash-proof "space" phase (T3 drone) after the cursor passes the well bottom (ILINDDY), before `advanceLevel`.

**Problem:** Two ROM-timing suites RED never touched — `tests/core/tp1-23.warp-curwav.test.ts` ("46 ROM frames to dive at level 1") and `tests/core/rom-clock-timing.test.ts` (the 1.30–1.90 s dive band) — pin the IN-WELL dive duration but MEASURE it as "frames/seconds until `s.mode !== 'warp'`". That was a faithful proxy while the dive ended AT the bottom-crossing; the instant you add a phase after the bottom, the proxy overcounts by your new phase's length (46→55 frames, 1.62→1.93 s) and both go red. vitest catches it on the FULL run, not the story's own file — run `npm test`, not just `npm test -- tp1-13`.

**Prevention:** Before declaring GREEN, `grep -rn "mode.*'warp'\|=== 'warp'\|!== 'warp'" tests/` for every suite that ends/times the dive on the mode leaving 'warp'. Any that INTENDS the in-well leg (the ROM's 46-frame/1.62 s traverse) must be re-seated to the bottom-crossing endpoint you introduced.

**Fix:** Expose the bottom-crossing as observable STATE (tp1-13 added `warp.inSpace`, set the frame progress crosses 1) and re-point the measurement at it: `while (!s.warp.inSpace)` / `runUntil(s, x => x.warp.inSpace)`. The in-well ramp is unchanged, so the figures stay identical (46 frames, 1.62 s) — the endpoint just moved from arrival to the bottom. Log it as a Dev deviation + Delivery Finding (RED's re-seat missed these two).

**Also (bonus-on-arrival):** an "award once at the bottom-crossing" bonus can't be paid there when a warp-crash advances the level WITHOUT re-diving (Story 3-6's `respawn → advanceLevel`). Pay it in `advanceLevel` (the single arrival door both a completed dive and a crash-respawn reach) — that's the only timing that satisfies the crash-and-retry test AND the `warp-space <= wave-bonus <= warp-end` window.

---

### Inserting a sub-phase that EXTENDS a mode's frame-duration breaks every sibling that measured that mode as a proxy for a sub-phase — vitest catches it, but only on the FULL suite

**Situation:** GREEN work that adds a new phase INSIDE an existing `mode`, so the mode now lasts more frames than it used to (tp1-10: the warp gained a post-descent EYE FLY-IN — after the descent bottoms out the sim stays `mode === 'warp'` for `WARP_FLYIN_FRAMES` more frames before resuming play, per WD-018/NEWAV2).

**Problem:** Dozens of sibling suites use `while (s.mode === 'warp')` (or `mode !== 'playing'`, or `runUntil(x => x.mode !== 'warp')`) as a stand-in for "the DESCENT" — to count its frames (tp1-23 pins 46), time it (rom-clock pins ~1.62 s), or sample its per-frame speed curve for monotonicity (sim.warp-ramp). The instant you extend the mode, all of those silently absorb the new phase: 46→56 frames, 1.62→1.97 s, and the speed-delta samples pick up the fly-in's progress RESET (a huge negative delta) → monotonicity dies. RED (TEA) can't see this — its new tests run against OLD code where the mode still ends at the old boundary — so TEA re-seats the one or two "obvious" siblings and misses the rest. Unlike the `tsc`-only GameEvent trap, **vitest DOES catch these**, but ONLY if you run the WHOLE suite, not the story's files.

**Prevention:** Before declaring GREEN, `grep -rn "mode === '<mode>'\|mode !== 'playing'\|<mode>.*toBe" tests/` for EVERY suite that loops on the mode, not just the ones TEA named. Any that measures a SUB-PHASE (its duration, count, or per-frame curve) needs re-keying off the new sub-phase boundary, not the mode boundary.

**Fix:** Expose the sub-phase as a field on the mode's state (tp1-10 added optional `WarpState.flyIn`, set the frame the descent bottoms out) and re-seat the siblings to stop at it: `while (s.mode === 'warp' && (s.warp.flyIn ?? 0) === 0)`, or a predicate `x => x.mode !== 'warp' || (x.warp.flyIn ?? 0) > 0`. Make the new field OPTIONAL — the suite's pre-existing literals that build the state by hand (`s.warp = { progress, velocity, warning }`) are type-checked too (tsconfig `include: ["tests"]`), so a required field breaks `tsc` on tests you must not edit. These re-seats are intent-preserving (you still measure the descent) — log them as a deviation + a "TEA re-seat gap" Delivery Finding.

**Also (tempest GameEvent exhaustiveness spots):** adding a `GameEvent` variant in tempest breaks TWO `never`-guarded switches, and NEITHER is `main.ts` (it just delegates `playEventSounds(audio, frameEvents)` — no switch): they are `src/shell/audio-dispatch.ts` (the dispatcher) and `tests/core/events.test.ts` (the `discriminant()` census + its `toBe(16)` count and exact-ordered set). `fx.ts` reacts with `if (e.type === ...)` chains, so it does NOT need the new arm. Grep `grep -rn "_exhaustive: never" src tests` to find them.

**Example (tp1-10):** the fly-in turned 5 suites RED on the FULL run — `sim.audio-events` (warp-end capture keyed on leaving 'warp'), `tp1-23.warp-curwav` (46→56), `rom-clock-timing` (1.62→1.97 s), `sim.warp-ramp` (delta monotonicity), and `sim.events` (an empty board that clears into the now-`warp-descent-start`-emitting dive) — none named by TEA, all fixed by re-keying off `warp.flyIn` (or keeping the board out of the clear path). TEA had grown only `audio-dispatch`'s 17-row table and `sim.warp`/`sim.warp-death-respawn`.

---

### Driving a render change through a moving "eye" fights the `?raw` POSITIONAL guards — restructuring render() can regress a call-ORDER test even when behaviour is preserved

**Situation:** GREEN work on a warp/dive render effect where the ROM moves the CAMERA (tp1-10 WD-012: the eye dives with the Claw so the well expands past a fixed rim Claw). The pinned half (Claw drawn via `clawTransform`, fixed) is easy; the tempting other half is to zoom the tube about its vanishing point as the dive progresses.

**Problem:** render() is undrivable in node, so its structure is pinned by `?raw` source tests that assert the relative POSITION of call sites — e.g. `render.warp-dispatch.test.ts` requires `iSpikes < iWarpCond` ("drawSpikes runs before the `s.mode === 'warp'` split"). To zoom the tube you must know "are we warping" and `save()/scale()` BEFORE `drawTube`/`drawSpikes` — which forces a `s.mode === 'warp'` (or moving those calls into the branch) ahead of `drawSpikes`, flipping `iSpikes` after `iWarpCond`. The regex matches `s.mode === 'warp'` ANYWHERE in the file, so even a helper defined above render() trips it — you cannot dodge it without gaming the guard.

**Prevention/Fix:** Ship the test-pinned half (the fixed Claw + any progress-gated draw like the starfield) with the EXISTING call order intact, and treat the eye-driven well-expansion as a separate, Reviewer-eyeball concern (TEA delegated exactly this as a non-blocking Delivery Finding). A faithful moving-eye zoom in tempest really wants a live eye field in core (tp1-9 baked the per-well eye into the geometry — there is none to read), so it is a follow-up, not a GREEN-phase bolt-on. Don't restructure render()'s main flow to force an unverifiable visual past a deliberate call-order guard.

---

### Two parallel stories can build the SAME sub-phase with OPPOSITE orderings — unify to ONE counter, re-seat by INTENT not spelling, and mutation-check the handover events

**Situation:** A story sits Reviewer-APPROVED but can't finish because `develop` merged a sibling story DURING its pipeline, and both independently added the SAME new phase. tp1-10 (the warp EYE FLY-IN, `WarpState.flyIn`, wave++ at the START via `beginFlyIn`) collided with tp1-13 (#120, the warp SPACE drone, `inSpace`/`spaceFrames`, wave++ at the END via `advanceLevel`). tp1-13 even labelled its `WARP_SPACE_FRAMES` "PROVISIONAL — tp1-10 owns the camera timing and should replace this." They were the same post-descent beat, built twice, with INVERTED wave-increment ordering.

**Problem:** A plain `git merge` (union both sides) leaves TWO live counters and TWO orderings — the state carries `flyIn` AND `inSpace`/`spaceFrames`, and the sim tries to both `beginFlyIn` (wave++ now) and `advanceLevel` (wave++ later). tsc passes (both fields exist), a naive test run may even be mostly green, but the model is incoherent: the level advances twice, or the drone/fly-in compose wrong. The 649-line sibling suite from the merged story asserts ITS ordering (level does NOT advance at the bottom-crossing; a crash ADVANCES the wave) — the opposite of what the ROM (ENDWAV before NEWAV2) and the surviving story require.

**Prevention/Fix:** Decide ONE authoritative model up front (here: the ROM ordering — wave++ at ENDWAV, BEFORE the fly-in — which was tp1-10's; drop the provisional counter the sibling itself flagged as replaceable). Then: (1) DROP the redundant state fields + constant + the now-dead function, grep the WHOLE tree for every initializer/reset of the dropped fields (they auto-merge into `startGameAtLevel`/`checkLevelClear` silently); (2) FOLD the sibling's still-wanted behaviour into the surviving path (tp1-13's ENDWAV skill-step bonus payment moved into `beginFlyIn`, paid with INC CURWAV); (3) reconcile the EVENT stream — the descent bottom now emits the sibling's `warp-space` (drone handover) instead of the old `warp-end`, and `warp-end` moves to the phase END; (4) RE-SEAT the sibling's suite by INTENT: its "space is still the warp" (mode ≠ playing) survives, but its "level hasn't advanced yet" flips to "level HAS advanced" (unified ROM ordering) — keep both stories' intents, weaken neither; (5) a crash test written against the sibling's crash-ADVANCES model must be re-seated onto the survivor's crash-REPLAYS model (clear the re-armed board so the retry dive actually arrives). Then MUTATION-CHECK every unified guard AND every handover event (revert each → a specific test goes RED): the events that MOVED (`warp-space` at the bottom, `warp-end` at the end) are exactly where a silent union-merge would have shipped a plausible-but-wrong composition.

**Audit citations across the merge:** all conflicts were pure `"line": N` anchor shifts EXCEPT one `verbatim` (both stories re-spelled the same cited comment). Resolve each hunk in place taking the surviving-tree's wording — do NOT `git checkout --theirs` the whole file (it drops the surviving story's auto-merged `remediated_by` stamps). Then `reanchor-citations.mjs --write` recomputes every line from the verbatim (expect 0 LOST if the unified tree preserves the cited lines).

**Example (tp1-10 ⨝ tp1-13):** unified to `flyIn` only; descent-bottom `warp-space`→(stop levelClear/T2 + start thrustSpace/T3), fly-in-end `warp-end`→stop both; events union 16→20; `startBonus` paid in `beginFlyIn`. 1253/1253, tsc 0, build 0, citations 19/19; all 6 guards RED-on-revert. This CLOSED tp1-10's own deferred "space sound over the fly-in" finding — the sibling had shipped exactly the sound tp1-10 punted.

---

---

### main.ts's accumulator loop carries a BRACE-SENSITIVE source regex — a pre-motion block must be a brace-free call

**Situation:** GREEN work that inserts logic at the TOP of red-baron's calc-frame loop, BEFORE
`flight = step(flight, input)` (rb4-4: the EOLSEQ/SCOREM/GREND pre-motion block — the ROM checks
all three before PFMOTN).

**Problem:** `tests/cockpit-boot.test.ts` pins the ÷N-trap fix STRUCTURALLY with
`/while\s*\([^)]*SIM_TIMESTEP_S[^)]*\)\s*\{[^}]*\bstep\s*\(/` — `step(` must follow the loop
opener with NO `}` in between. ANY braced statement inserted above the flight step (an `if {}`,
a scoped `{}` block) breaks the guard, and the failure message ("step() must be called INSIDE
the accumulator") points at the loop, not at your insertion.

**Prevention/Fix:** Package the pre-motion logic as a main.ts-local helper returning "frame
consumed?" and call it brace-free: `if (preMotionFrame(events)) continue`. The helper mutates
the same closure state the loop does (and does its own `simFrame += 1; accumulator -= …` on
consuming paths — do NOT move the shared decrement to the loop top: `simFrame`'s parity drives
`blimpFires`, and shifting it re-times the airship's whole life). Grep
`tests/cockpit-boot.test.ts` for source regexes before restructuring the loop.

---

### GREND's D6 is the freeze discriminant — only a GROUND death freezes the war; killing the WORLD for a shells death breaks the airship suites

**Situation:** Wiring the rb4-4 death sequence into the cockpit loop: what stops while the
EOGTMR runs?

**Problem:** The obvious "death freezes everything" (skip the whole loop body while dying) is
UNFAITHFUL and broke three sibling suites at once: the blimp's drift PAUSED for 28 calc frames
per death (cockpit-loop's one-step-chain and CROSSES pins), game-over-clears-the-sky deleted a
visible airship mid-screen (the "DROPPED state was off-screen" pin), and frozen in-flight shells
were re-drawn every display frame (cockpit-draw-path's measured shell total inflated 82→130).

**Prevention/Fix:** Read the branch: `BIT GREND / BVS 20$` (RBARON.MAC:783-789) tests V = D6 —
the GROUND bit. Only a ground crash skips PFMOTN/NWPLNE/PLMOTN (world + planes frozen). A
SHELLS death (GREND=0x80, D7 only) merely zeroes the PILOT's deltas (:1108-1113) and clears
GUN.ST (:1109-1110): the horizon holds still, the planes "FLY AWAY", the airship drifts on. So:
freeze ONLY the pilot (skip `flight = step(...)`, gate the trigger) on shells; consume the whole
frame on ground; after game over let the yoke fly the empty war (the ROM parks in attract).
And keep every rng DRAW unconditional across the change — evaluate the blimp's per-shot roll on
every fire-frame and gate only the EFFECT — or the stream shifts and every seed-calibrated
sibling (and the airship's own trajectory) silently re-rolls.

---

### One `ours` line can back MULTIPLE tempest findings across DIFFERENT pair files — reanchor's LOST finds the ones the story never named

**Situation:** GREEN in tempest that edits a source line the audit cites, then marking the story's
named findings `remediated_by` and running `reanchor-citations.mjs --write` (tp1-35 rewrote the
enemy-bolt `strokeGlyph` call for V-009's frame source).

**Problem:** You mark the findings the story names (V-005/V-007/V-009, all in pair-2) and expect a
clean reanchor. But the SAME physical line can be the `ours` citation of a finding in a DIFFERENT
pair file you never opened — the depth-driven `enemyBoltGlyph(Math.floor(b.depth*8))` line was
cited by BOTH V-009 (pair-2, shot geometry+frame) AND **DA-018** (pair-3, the frame-cadence
divergence). Marking only the named three, reanchor reported `LOST DA-018 render.ts:356` — and had
I ignored it, the citation gate (`citations.test.ts`, which re-opens every `ours`) would go RED on
the next story with a confusing "does not match verbatim", because DA-018's quote points at a line
that no longer exists.

**Prevention/Fix:** Treat every reanchor `LOST` as a finding to triage, not just the ones in the
story's ACs. `grep -rl '"<the-line-or-symbol>"' docs/audit/findings/` to find EVERY finding citing
the line, read each, and apply the two-honest-exits rule per finding: if your change removed the
divergence it describes (DA-018: depth-driven → global `renderTime*ROM_FPS`, so the cadence is now
the ROM's shared QFRAME/4 ≈ 7.1 Hz), mark THAT one `remediated_by` too and make the fix actually
reproduce its target (don't just delete the line — match ROM_FPS/4 so the remediation is honest).
Re-run reanchor until it reports `0 lost`. A story can legitimately close a finding outside its
named set; log it as a deviation so the Reviewer sees the extra remediation.

---

### Changing a per-wave COUNT shifts the seeded RNG and breaks seeded fixtures FAR from your diff

**Situation:** Implementing a ROM-table transcription that changes a *count* consumed at state
init — tp1-7 replaced `enemyCount = 6+2*(level-1)` with the TNYMMX table, making the level-1
budget 10 instead of 6.

**Problem:** `initialState(seed)` builds the wave's nymph queue by drawing `enemyCount(1)` random
lanes (`spawnForLevel` → `nextInt` per nymph). Bumping the count from 6 to 10 draws **4 extra RNG
values at init**, so every test fixture built on `playingState(seed)`/`isolated(seed)` starts its
step with the RNG cursor in a *different place* — and any test that pins an exact seeded outcome
downstream (a fuseball's LEFRIT jitter coin, here) silently flips. Two fuseball tests in unrelated
files (`tp1-3`, `tp1-6`) went red at GREEN, nowhere near the rules.ts diff, and the failure looked
like a speed/collision bug (the fuse "didn't grab at the rim") when the real cause was the jitter
coin rolling the other way and hopping the fuse off the player's lane. The vitest RED run never
saw it — vitest doesn't typecheck and the fixtures were green until the count actually changed.

**Prevention:** When your change alters a value CONSUMED DURING `initialState`/state setup (a count,
a loop bound, anything that gates an RNG draw), expect seeded fixtures elsewhere to shift. After
GREEN, read the *reason* each newly-failing test fails before assuming a logic bug — a fixture that
pins `lane`/`depth`/a coin outcome at a magic seed is RNG-fragile, not wrong. Fix the FIXTURE, not
the assertion: pin the incidental degree of freedom out (set `jitterTimer` high so the roll doesn't
fire) or SEARCH for a seed that reproduces the intended case (a `settleOnce`/`rollOnce` retry loop),
never chase a new magic number. And run `tsc --noEmit` before handoff — vitest-green ≠ build-green
(an unused `const` under `noUnusedLocals` passes vitest and fails the build).

---

### The INVERSE case: a LATENT table-record fix does NOT ripple — and comment it INLINE so cited lines don't shift

**Situation:** GREEN for a fidelity fix to a single record of a ROM table whose value is consumed by
only a REDUCER, not per-wave (tp1-7 rework: WSPIMX record 6 `start:35`→`53`, read solely by
`firstNonZeroWave(WSPIMX)`=4 — the spiker intro wave, which record 1 already fixes).

**Two things worth knowing.** (1) Unlike the count-change class above (which shifts every seeded
fixture), a LATENT record change touches nothing downstream — the full suite stayed 1377/1377 with
zero RNG ripple. Don't over-hunt for breakage that a latent fix can't cause; DO run the full suite
once to PROVE it (the reassurance is only worth having if you checked). (2) The faithful fix can
look like a bug: `{ start: 53, end: 39 }` is a deliberately DEAD descending range (it transcribes
an un-dotted hex ROM byte, `0x35`, a 1981 typo). Without a comment, the next dev "fixes" `53>39`
straight back to the misread `35`. It NEEDS an explanatory comment citing the ROM line + the typo.

**Prevention:** Put that comment INLINE on the record line, not as a block ABOVE it. Any line you
ADD above a record shifts every line below — and in a cited file (`docs/audit/findings/*.json` pins
`ours` at a line number) that silently breaks the citation gate on the NEXT story. An inline `//` on
the changed line itself adds no lines, keeps every citation anchored, and `npm test -- citations`
stays green with no reanchor. (Inline comments also survive the test suites' `stripComments` only if
that helper anchors `^\s*//` to line-start — an inline `//` is preserved, but it sits AFTER the `}`
so a `/\{[^{}]*\}/g` record parser never sees it. Verify both still parse.)

---

### star-wars' purity guard greps COMMENTS too — the English word "window." in a core file reads as `window.` DOM access

**Situation:** GREEN work adding a commented block to `star-wars/src/core/*` (sw7-5's crash
comment ended a sentence with "…the ROM's `M.XP - $200 - speed` window. The crashed…").

**Problem:** `tests/core/events.test.ts` pins the core boundary with `?raw` source regexes, and
the `window access` pattern is `/\bwindow\s*\./` — which matches the word "window" followed by a
sentence-ending PERIOD in prose just as well as real `window.foo` code. The suite goes red with
"pure-core boundary: window access" pointing at a comment, hours after you wrote it. (A
testing-runner helper hit this first and hot-fixed the comment mid-run — verify any such edit
with `git diff` before trusting the GREEN it reports.)

**Prevention:** In star-wars core comments, don't end a sentence right after the word "window"
(write "time-window —", "fire window,", etc.). If a purity regex fires on a line you believe is
prose, read the pattern in events.test.ts (~line 292) before assuming real DOM leakage — but
check the CODE first; the guard exists because real leaks happen.

---

### A one-shot bake CAP can silently truncate FINITE ROM data — check the chain length before trusting the default

**Situation:** sw7-8 adding AUDDF (death_star_boom) to tools/pokey-bake: the transcription was
byte-perfect, the bake ran clean, and the wav came out at EXACTLY 1.62s — the same length as
enemy_explosion. Exact equality between two unrelated effects is the tell.

**Problem:** `MAX_SFX_S = 1.6` exists to bound SUSTAINED/LOOPING envelopes into a one-shot wav
(enemy_explosion's envelope loops; the cap is doing intended work there). AUDDF is a FINITE
288-tick (2.36s) decay chain — the cap silently cut its last ~0.75s and nothing failed. The
expected-duration test I added (2.379s) is what caught it; a "samples.length > 0" sanity alone
would have shipped the truncation.

**Prevention:** when adding an effect, compute the chain's tick sum BY HAND (vol chain bounds the
effect: sum count×duration to the .SZ) and pin the derived seconds in EXPECTED_SECONDS. If it
exceeds the cap, don't raise the global (that would lengthen the looping effects and change
shipped assets) — thread a per-spec `maxSeconds` through the expander. And treat any two effects
with IDENTICAL durations as a cap artifact until proven otherwise.

---

### SNDPBX command ordinals: COUNT them with a multi-point calibration, never trust one anchor

**Situation:** sw7-8 needed AUDDF/AUDSS's PBX command bytes for sfx-data provenance. The sidecar
rule says the IDs are positional (entry 0 = RESET, commented entries skipped) — but a hand count
is itself easy to fumble (I first wrote $32 for AUD SS; that's AUD RY).

**Prevention:** count the whole table once and CALIBRATE against every ordinal already known
from independent sources before reading off the new ones — sw7-8 had seven anchors (SPK STR=$16,
TRU=$18, YAU=$1A, PM DAR=$1D, 4TH=$20, RRP=$22, TH5=$24 from the shipped Sound_NN mapping); all
seven landing on the count is what makes the new $27 (AUD DF) / $34 (AUD SS) trustworthy. One
matching anchor can be a coincidence; seven can't. Write the calibration into the provenance
comment so the Reviewer can re-run it.

---

### A ROM table that looks ABSURD is usually missing its SCALE — and the scale lives in the routine that CONSUMES the data, not near the data

**Situation:** Transcribing a ROM data table whose magnitudes make no physical sense against the
constants around them. rb4-6: P.ODLX/P.IDLX/P.IIDL (RBARON.MAC:2948-2956) assemble to deltas of
288/24/0 "per frame" — inside a window (P.OLIM[0] = 0x40 = 64) a third that size. A 288-unit step in
a 64-unit window is not a weave, it is a teleport.

**Problem:** the absurdity gets read as evidence the TRANSCRIPTION is wrong, and the story invents a
"behavioural stand-in" instead. Round 1 of rb4-6 did exactly that — it declared the `.2WORD`/`.3WORD`
macro scale "unverified with NO baked artifact to arbitrate" and shipped `sqrt(ACCEL·ilim)`, i.e. it
fabricated a constant to avoid the risk of fabricating a constant, in the epic that exists to kill
fabricated constants. The Reviewer then proved the macros ARE defined (:20-27) — correct, and still
not enough: the numbers remain absurd until you find the scale, so a Dev told only "the tables are
recoverable" will transcribe them and watch the sim fly apart.

**Prevention:** when a table's magnitudes don't fit their own units, do NOT re-litigate the radix or
the macros — go read the CONSUMER and follow the value all the way into the state it mutates. The
scale is almost never adjacent to the data. rb4-6's was one `JSR` away: `UPDPLN` integrates the delta
into the position through `DIVBY4` (:2570-2581), and `DIVBY4` (:6170-6176) is a signed 16-bit ÷4
(`CMP I,80 / ROR / ROR TEMP2`, twice — the `CMP` seeds the carry from the sign bit). So the tables are
QUARTER-units per frame: 288 → 72, 24 → 6. Against a 64-unit window that is a hard run home and a
gentle drift — exactly the engagement the arcade plays. The same delta is ALSO the rotation source at
×1 ("PLANE X/Y ROTATION=-4*DELTA X", :2629), which is why one field legitimately feeds two consumers
at two scales.

**Grep that finds it:** `ST[AXY]\s+(ZX,)?<FIELD>` for the WRITES, then read every reader. If a 6502
routine does `LDA <lsb> / STA TEMP2 / LDA <msb> / JSR DIVBYn` before an `ADC`, the value is being
rescaled on the way in — and that shift IS part of the transcription, as much as the bytes are.

**Also — the block layout comment is the primary source for coordinate SPACE.** rb4-6 round 1 spent a
whole review round arguing whether enemy x/y were world or screen. RBARON.MAC:266-297 answers it flat:
`+0 PLANE POSITION X` and `+8 DISPLAY POSITION X` are DIFFERENT FIELDS. Read the `.IF EQ,1` data-format
block before deriving a coordinate space from behaviour.

---

### A `vi.mock` passthrough that RE-DECLARES the wrapped signature silently drops any argument the real function later grows

**Situation:** GREEN work that adds a parameter to a core function a shell/integration suite mocks for
recording. rb4-6 gave `guns.step(guns, targets)` a third `eye` argument.

**Problem:** the recorder mock reads `step: (guns, targets) => { const out = actual.step(guns, targets)
... }`. It still compiles (extra args are dropped, and the mock's type is inferred from its own
parameter list, not checked against `actual`), and it still records — so the suite goes on measuring a
sim that NO LONGER EXISTS. In rb4-6 the recorded cockpit collided from the eye origin while the real
one collided from the pilot: **no kill landed in the entire 24-frame run**, and the suite's own
`TARGET TRUTH` guard reported a plausible-looking "drawn in the wrong place" instead of "your mock is
lying". It was caught only because a SEPARATE guard asserted its own precondition — `WRECK TRUTH`'s
"no wreck was drawn — a kill must land, or this guard is vacuous".

**Prevention:** when adding a parameter to a mocked function, `grep -rn "vi.mock.*<module>" tests/` and
check every wrapper's parameter list, not just the call sites in `src/`. A passthrough is a COPY of the
signature, and (guns.ts's own `shellDepth` comment says it best) a copy cannot track anything. Prefer
`(...args: Parameters<typeof actual.step>) => actual.step(...args)` so the wrapper cannot drift; if the
recorder needs a specific argument, destructure it from `args` AND record it — capturing what was
really used is what let rb4-6's `TARGET TRUTH` become a genuine display-seam guard rather than a
re-implementation of one.

**Tell:** an integration suite that suddenly asserts "drawn somewhere else" / "no kill landed" after a
signature change is accusing your code of a bug the MOCK is committing. Check the wrapper first.
---

### In a fix round convened to delete FALSE CLAIMS, your own correction prose is the likeliest new false claim — and never write "reverting X reddens N" about a behaviour-PRESERVING revert

**Situation:** Dev green on round N+1 of a story the Reviewer rejected for shipping a true fix beside
false comments (sw7-16: the surface gun). You fix the three claims, write a tidy mutation table
proving each guard bites, and hand back.

**Problem:** sw7-16 round 2 deleted 3 false claims and **added 7** — and was rejected again. The
fix round is the highest-risk place for new falsehoods precisely because you are now writing prose
ABOUT your own corrections, and nobody re-audits prose. What landed: a verification row claiming
"re-inlining the literal reddens 5" (it reddens **zero**); "JSDoc trimmed rather than grown" (it grew
22→28, +27% — *measure it*: `git show <base>:file | sed -n 'A,Bp' | wc -l`); "crosshairOn is GONE /
One copy" (the sibling suite still had its own copy and didn't import the shared one); and TEA's test
header asserting "Round 2 makes `shipPoint` exhaustive over Phase" while Dev had **deliberately
declined** that refactor — nobody reconciled the two, so the guard file described code that did not
exist.

**THE STRUCTURAL TRAP — a behaviour-preserving revert is unprovable by mutation.** `render.ts`
called `surfaceShip(alt)`; the test asserted `eyeOf(s) == surfaceShip(s.altitude)`. Reverting
render.ts to an inline `[0, alt, 0]` returns the **same value**, so both sides of the `toEqual` move
together and 45/45 stay green. "Did you call my function or retype its body?" is a question about
SOURCE; value tests only ever catch DRIFT. If your change is a de-duplication whose revert is
behaviour-identical, **no test can guard it** — the export/extraction itself is the guarantee. Say
that. Also: when a new test file's RED came from a **missing export**, those reds are *collection
errors*, not behavioural coverage — "13 reds → green" proves the export exists and nothing more.

**And mutate the CALLER, not just the helper.** "Retargeting `toCockpit` reddens 2 tests" proved the
*helper* was guarded via `moveEnemy` — but the comment claimed the suite drove **both** callers.
Retargeting `spawnTie`'s call alone left 1056/1056 green (`tie-peel-away`'s fixture parks the spawner
at `spawnTimer: 1e9`). Mutating a helper and mutating each of its call sites are **different
experiments**; run the one your sentence actually claims.

**Prevention:**
1. Before handing back, grep your own round's prose for falsifiable words — `trimmed`, `GONE`,
   `One copy`, `exhaustive`, `every guard`, `reddens N`, `guarded by` — and **falsify each one**.
   Every one of these was a finding.
2. If TEA's test header describes a SOURCE change, diff it against what you actually shipped. A
   declined "recommended" finding silently strands the header — flagging your skip in the assessment
   is NOT enough if the test file still asserts you did it.
3. Given "delete the claim **or** make it true", **prefer making it true** when it's a couple of
   lines. sw7-16's `shipPoint` → `switch` with no `default`/no trailing return took 6 lines and
   converts the next recurrence into TS2366. Proven: add a 4th union member → compile error at the
   function. That's a real guard a comment can never be.
4. **Retract in place, visibly** (`~~strikethrough~~` + a RETRACTION note). Do not silently rewrite
   a verification table — a table whose misses can be edited out is not evidence, and the Reviewer
   will notice you erased the catch.

**Also — a Reviewer's suggested one-liner can carry collateral; check before pasting it.** Finding 8
proposed `if (!Number.isFinite(altitude)) altitude = SKIM_ALTITUDE`. But `!isFinite` also captures
±Infinity, which the existing clamps handle *correctly* (`+Inf` → ceiling 238; `-Inf` → crash bump +
shield + event) — pasting it would have silently deleted a shield charge and a `terrain-crash`.
`Number.isNaN` closes the same regression with zero collateral. Take the narrower guard and **log the
deviation**; the Reviewer accepted it.

**Also — editing `src/core/sim.ts` at all shifts the audit citations.** Run
`node tools/audit/reanchor-citations.mjs` (dry) → `--write`. "0 lost" means no `verbatim` re-points
and no judgment calls. Then prove the anti-laundering rule yourself before claiming it: every `+`/`-`
line in `docs/audit/findings/` that is not `"line":` must be **empty**. The citation gate reddens on
the FULL suite, not on your story's files — run `npm test`, not just your two suites.

---

### `reanchor-citations.mjs --write` re-serializes the WHOLE findings file — `\uXXXX` escapes become literal unicode and bury your real diff

**Situation:** Any tempest GREEN that runs the reanchor tool on a findings pair file still carrying
the audit generator's `—`-style escapes (tp1-20 on pair-2/pair-6).

**Problem:** The tool parses and re-writes the entire JSON with JS defaults, so every escaped
em-dash/arrow in every finding flips to a literal character — hundreds of cosmetic +/- lines that
make the anti-laundering check ("every non-`"line":` diff line must be empty") LOOK violated and
hide the substantive changes from the Reviewer.

**Prevention:** Verify the diff at the SEMANTIC level, not the byte level: `git show HEAD:<file>` →
`json.loads` both versions → compare finding-by-finding, field-by-field, and print what actually
changed. For tp1-20 that proved exactly 5 `remediated_by` stamps + 8 line re-points + 2 sanctioned
verbatim re-spells and nothing else. Paste that inventory into the Dev assessment so the Reviewer
audits 15 semantic changes instead of a 90KB byte diff. (Filed as an Improvement finding: the tool
could serialize with escaped non-ASCII.)


---

### A TEA source-text pin can encode a FALSE wiring premise — read the call site before "fixing" behavior that was never broken

**Situation:** tp1-38's render suite demanded drawWarp stop anchoring the Claw via
`clawTransform(tube, …)` ("the warped tube handed to drawWarp"). The premise: render maps
`{...s, tube: warpDescentTube(...)}` and drawWarp draws that. False — the call site passes the
UNMAPPED `s` (only drawTube/drawSpikes get the mapped `scene`), so the Claw was ALREADY static.

**Prevention:** Before implementing a wiring change a textual pin demands, trace the actual call
site. If the premise is wrong, the minimal GREEN is a clarity rename (`tube` → `staticTube`) that
makes the correct wiring structural + a Delivery Finding correcting the record — not a behavior
change. Satisfying the pin's letter while documenting its premise keeps both the suite and the
audit honest.

**Bonus (tempest warp geometry):** for a moving-eye phase, re-parameterising interior depths onto
the truncated visible span (`d' = min(d, span)/span`, span = eye-clip depth) keeps the projective
interpolation EXACT — position scale comes out `R/(1−(p+d)(1−R))`, the true CASCAL law — because
the projective form is invariant under linear re-spans of PY. And `p + d_eye ≡ 1/(1−R)` (constant),
so the eye-plane clip ring has a progress-independent scale. Both identities save you from hacking
approximations into drawSpikes.

---

### A wave-SCHEDULE fidelity fix ripples into every booted-cockpit snapshot/staging test — and re-staging a stalled booted test wants SEED-HUNTING, not an aim controller

**Situation:** rb4-7 flipped red-baron's wave clock from a per-frame countdown with 1:1 plane/ground
alternation to the ROM's NEWCT-counts-WAVES model (a plane MODE fields a RUN of MCOUNT[MODECT>>1]
plane waves, then one ground wave). Unit tests went green immediately; two BOOTED-cockpit sibling
tests (that drive the real main.ts loop) turned red — exactly the "green-now-doomed sibling" the TEA
sidecar warns surfaces in Dev's lap, not RED.

**Problem:** Two distinct ripples. (1) A deterministic SNAPSHOT — `cockpit-draw-path`'s
`TOTAL_LIVE_SHELLS` — shifts by one (52→51) because a different seeded sequence of planes consumes a
shell a frame sooner. That guard's own comment says "re-read the numbers on purpose," so it is a
deliberate re-baseline, not a regression. (2) A STAGING test — `ground-collision-wiring` — held fire
and waited for the schedule to reach a ground wave. Under 1:1 alternation the ground wave came after
wave 1 (~frame 8); under RUNS it comes only after the opening 4-plane run clears — and it never
arrived. Probing showed why: **in a booted test the sim STALLS.** With no fire the opening plane never
despawns (still alive after 800 calc frames ≈ 76 s — rb4-6's "fly past P.MNDP" does not fire for a
level-0 plane in bounded time); and *with* hold-fire, each kill raises the score until a multi-plane
wave spawns whose DRONE (offset ±256) the fixed-forward trigger can never hit, so the run stalls at
wave 3. "Hold fire and wait" cannot reach a ground slot anymore.

**Prevention/Fix:** (a) For the snapshot, re-baseline the one number with a cited comment — that IS the
guard working. (b) For the stalled staging test, DON'T build an aim controller in the black-box booted
harness (it only exposes tick()/pressKey — reading enemy screen positions to steer is fragile and may
not converge). SEED-HUNT instead: a 12-seed probe (hold fire, 500 frames, tap `landscape.stepMountain`
to detect ground mode) found 2 seeds whose opening RUN the held trigger clears and that reach a ground
slot (~frame 107). Swap the seed + widen the frame window; the four assertions and their intent are
untouched. Cheap, robust, no new test machinery. Write the throwaway probe to a scratch FILE (vitest
swallows console.log) and delete it before committing.

**Also — the interface rename is what forces the main.ts rewire.** No behavioral test pinned main.ts's
wave integration, but renaming `WaveClock.countdown`→`newct` is a tsc error at the `stepWaveClock`
call site, so tsc (not a test) forces the faithful rewire: move the step off the per-frame clear-sky
tick onto the wave-COMPLETION edge. And AC-4's `groundModeEnds` predicate needs a REAL consumer in the
loop, not just a unit pin — wire it as the ground-mode exit (arm GRNDCT on entry, hold until spent),
or the ground mode collapses to one frame and starves the systems that need its duration (mountains
are created before the wave block each frame, and `groundCollision` runs before mountains are created,
so a 1-frame ground mode never lets the collision check SEE a mountain). Placeholder the GTIMER pacing
(decrement GRNDCT per frame, visibleGroundObjects=0) until rb4-8/rb4-11 supply the real inputs.

---

### A RED assertion that never REACHED its expect() is unverified against existing data — a cross-check can encode a false premise about bytes shipped stories ago

**Situation:** GREEN for a transcription story whose RED suite cross-checks the NEW data
against an EXISTING transcription (rb4-11: "BLCOLL equals the blimp model's own bounding
extents — ±16 in x, ±16 in y, ±40 in z").

**Problem:** during RED the test never reached the assertion — `need(topo.BLCOLL_POINTS)`
threw on the missing export, which IS the intended red. So the premise about the EXISTING
side (rb2-2's BLIMP_POINTS) was never executed against the repo: the envelope is ±16 in y,
but the GONDOLA corners are [±8, −20, ±8] — max |y| is 20. Land the byte-correct BLCOLL and
the cross-check fails 16 ≠ 20 with your transcription blameless. The reflex "make the test
pass" would corrupt the byte-pinned box (or 'fix' the blimp model!) to satisfy a claim the
ROM never made — the ROM sized BLCOLL to the ENVELOPE; a shot under the gondola misses,
authentically.

**Prevention:** when a GREEN turns a need()-guarded cross-check red, audit the test's PREMISE
against the QUARRY before touching either transcription. If the premise is false, re-seat the
assertion to the true relationship (keep the axes that match; state the mismatch as the ROM's
intent with the quarry citation), and log a Dev deviation + a Delivery Finding so TEA/Reviewer
re-confirm intent. The transcription always outranks a test comment.

**Also (orientation probes):** span-RATIO stroke laws are sign-blind — an upside-down pyramid
passes 12/8 = 1.5. Before handoff, run a throwaway node probe through the REAL segments fn
(vite `ssrLoadModule` from the repo root; scratch file, deleted before commit) and check the
apex endpoint count sits at MAX ndc y, plus every group lands in-frame at a realistic carrier
staging. Two minutes, and it is the only thing between you and a green-suite inverted render.

---

### A spawn-GATE story can kill DISTANT boot stagings whose choreography secretly employed the OLD entity — as the pilot's EXECUTIONER

**Situation:** rb4-15 gates the blimp behind "four planes have appeared". GREEN turned four
UNRELATED booted suites red: three ground-wave stagings (the shared seed-444 held-trigger clear)
and cockpit-draw-path's pinned shell counts. None of them asserts anything about the blimp.

**Problem:** the old drifter blimp spawned on the OPENING wave decision (25 % of seeds) and did
TWO invisible jobs in every staging that ran longer than ~30 frames. (1) Its kill bumped `kills`,
and every wave spawns via `createRng((seed + kills) >>> 0)` — so the hunted seeds' later-wave
weave paths silently included the blimp kill in their derivation. (2) Far worse: its every-level
÷2 fire SHOT the idle pilot, and the death sequence cools GUN.ST — which is the ONLY thing that
un-jams a held trigger (heat +1/shot locks the gun out permanently at ~f31; cooling needs release
frames). The blimp was the staging's hidden EXECUTIONER-COOLANT. Under the new gate: 0 of 30,000
seeds reach a ground slot with a held trigger; under the OLD code, 5,746/30,000 do — ≈ the 25 %
blimp-spawn rate, which is the tell that the entity, not the seed, carried the choreography.

**Prevention/Fix:** when a story changes WHEN an entity exists (a spawn gate, a lifetime), grep
for booted stagings with long held-input scripts and A/B them: `git stash push -- src`, run the
seed-scan against OLD code, `git stash pop` — a success-rate ≈ the entity's spawn probability
convicts the entity. The remedy that survives the next entity change is to remove the dependency,
not re-hunt it: FEATHER the trigger (6 display frames on / 6 off — +1/shot heat never outruns the
×3 release cooling), after which MOST seeds clear and the staging stops needing anyone to die.
And when a short-window suite exists to measure the entity itself (draw-path's TARGET TRUTH),
hold the gate open at a delegating vi.mock seam that RECORDS the argument main.ts really passed —
force the branch, keep the truth assertable — rather than stretching the run to minutes.

---

### Porting a ROM 2D vector PICTURE: draw DISJOINT segment-runs with explicit edges, and pick colours that hit the intended FAMILY (a teal "blue" reads as cyan)

**Situation:** GREEN for sw7-15 / M-010 — replacing the procedural Death Star UV sphere with
the authentic WSVROM 2D picture (a green `BSCIR` circle, a white `BSTRN` equatorial trench, a
red `BSDSH` dish), each stroked in its own colour via three flat `Model3D` exports.

**Problem 1 — disjoint runs.** A ROM picture is often several `AOFF/AON` runs (pen-up moves
between them). `BSTRN` is TWO chords: `AOFF 49,10 / AON -49,-9` and `AOFF -49,-10 / AON 49,9`.
A naive "polyline" builder that links every consecutive point (`edge i→i+1`) inserts a SPURIOUS
segment between the two runs (here `(-49,-9)→(-49,-10)`), drawing a line the cabinet never drew.
Build multi-run pictures with EXPLICIT edge pairs (`[[0,1],[2,3]]`), not a blanket polyline.

**Problem 2 — colour family.** The TEA render tests classify strokes by COLOUR FAMILY (green/
white/red/blue/cyan…), not exact hex. A "blue" with too much green reads as CYAN: `#3aa0ff` =
(58,160,255) has g=160, and a `g≥140 && b≥140 && r≤130` cyan rule fires before the blue rule, so
the finale's PH2 "blue" rings were classified cyan and the red→blue→white order test stayed red.
A TRUE blue (`#3355ff`, g=85 < 140) classifies as blue. When a render colour must land in a named
family, check it against the classifier's thresholds (low cross-channel bleed), don't just eyeball.

**Problem 3 — registry invariants still apply to the swapped model.** `DEATH_STAR` stayed in the
`MODELS` registry, so the new flat picture must still pass models.test.ts's well-formedness
(finite verts, in-range/no-duplicate/no-degenerate edges, NO orphan vertices). A closed-loop
circle and explicit-segment chords pass; a trimmed or mis-indexed table would redden the registry
sweep, not the M-010 tests. Run the FULL suite — a model swap's blast radius reaches the registry.

**Also:** any src edit to a file cited by `docs/audit/findings/*.json` reddens the citation gate.
Mark the findings you actually FIXED `"remediated_by": "<story>"` BY HAND (the checker then freezes
their `ours` side), THEN run `node tools/audit/reanchor-citations.mjs --write` for the line-shift
drift in the OTHER findings. The tool leaves the remediated ones alone (nothing to re-anchor to).

---

### Verifying a manual index.html rebrand: the name lives in FOUR parallel copies + a GREEN test pins the OLD one, and an early grep goes STALE under the user's live edits

**Situation:** Ad-hoc "verify I didn't mess anything up" on the user's hand-edit to the lobby
`index.html` — a marquee-wordmark rebrand (VECTOR ARCADE → SLABCADE, a portmanteau) that also
deleted the `SLABGORB PRESENTS` and `INSERT COIN` lines. NEW_WORK_STATE, no story/phase — a
verify-and-reconcile, not a GREEN run.

**Problem — the human-readable name has FOUR independent copies and the build hides three.** The
lobby wordmark is spelled one glyph per `<span>`, so the name is duplicated across (1) the visible
`<span>` letters, (2) `<h1 aria-label="…">`, (3) `<title>`, and (4) an explanatory source comment.
The user changed only the glyphs. `tsc && vite build` stays CLEAN (the HTML is still well-formed)
and 148/150 tests pass — so it *looks* finished — while a screen reader still announces the OLD
name and the browser tab still reads the OLD name. Worse: `tests/chrome.test.ts`'s accessible-name
test (`expect(accessibleName(h1)).toBe('VECTOR ARCADE')`) stays GREEN, because the stale
`aria-label` still matches it — a green assertion pinning a now-wrong value. The only RED is the two
tests for the DELETED content. So the failing suite points at the removals, not at the desync that
actually matters.

**Problem — an early snapshot goes stale mid-session.** This was INTERACTIVE; the user kept editing
while I worked. My opening `grep -rni centipede lobby/src` came back empty and I reported "the lobby
registry has no centipede tile." By the time the user said "look again," `src/core/registry.ts` HAD
the entry — they'd saved it after my grep. A grep / `git status` taken at the top of an interactive
session is NOT ground truth by the time you report a conclusion from it.

**Prevention:** (1) On any index.html brand/content edit, reconcile EVERY copy of the name —
`grep -niE "<old name>|<title>|aria-label" index.html` — and don't trust a green suite: an
accessible-name assertion pinned to a hardcoded string passes on the stale value, so update the
TEST too (retarget the `toBe(...)`), and DELETE the tests for content the edit removed rather than
leaving them red. (2) Prune the CSS the edit orphaned (`.presents`, `.insert-coin`, `.wordmark-gap`)
but check shared keyframes first — `.select` still used `vb-blink`, so that keyframe stays. (3)
Before reporting "X is missing" in a live session, RE-RUN the check — the user may have added it
since your first look.

**Example (lobby SLABCADE, 2026-07-19):** fixed `<title>`, `aria-label`, and the comment; deleted
the two removed-content tests (`SLABGORB PRESENTS`, `INSERT COIN`); retargeted the accessible-name
test to `SLABCADE`; removed three dead CSS rules (kept `vb-blink`, still used by `.select`). Full
suite 148/148, build clean. Separately `registry.ts` had gained the centipede tile
(`launchUrl: https://centipede.slabgorb.com/`) — which my first grep missed because the user saved
it mid-session.

---

### A "sweep vs zoom" TIE-approach fix is the SPAWN HEADING, not the flight loop — and it retro-improves a CONFIRMED audit finding you must re-spell (not freeze)

**Situation:** sw8-6 (star-wars) — offset TIEs "grow on the crosshair then loop" instead of sweeping
across the field. TEA's probe showed the angular position `|x|/depth` is dead FLAT across the
approach (a centreline zoom); the fix must make it WIDEN (carry the offset).

**Where it actually lives:** NOT `applyManeuver`/the choreography VM. `spawnTie` seeded
`orient: lookRotation(toCockpit(pos))` — the nose aimed at the *exact origin* from the offset slot.
Flight thrusts along the nose (`applyManeuver` §5), so a nose pointed at the origin drags `x` down
*proportionally to depth* → `|x|/depth` constant → zoom. The ROM (WSCPU §4, finding A-008
`LDA #0C0 ;FACE ALIEN TOWARDS PLAYER`) faces the fighter **straight down-range** (an Ax/By sign
flip), NOT a per-slot look-at-origin. One-line fix: `orient: lookRotation([0,0,1])` (a named
`FACING_PLAYER`). Straight facing → forward thrust holds `x` while depth shrinks → `|x|/depth`
widens → the fighter sweeps across and flies PAST, exactly the longplay. The choreography's own
later YAW/AIM_PLAYER maneuvers steer it home. **Probe the design space before editing prod:** build
the hero with an overridden `orient` (blend 0=straight … 1=look-at-origin) in a throwaway
`*.test.ts` at the repo root (delete before commit) and read the `x`,`depth`,`ratio` table — it
showed lean=1 flat/rams, lean=0 carries-then-flies-past, instantly.

**The test tension you'll hit:** a faithful full carry holds `x=−1024` across the whole near field,
so a preservation guard that measures convergence at a MID-FIELD sample (`|x_close| < |x_spawn|` at
depth 3000) fails by an exact tie — `expected 1024 to be less than 1024`. The ROM script converges
only LATE (TCH1A2's first YAW is ~66 frames in, after the field is swept), so convergence is a
fly-past/end-of-life event, not mid-field. Correct measure: `min(|x|) over the FULL trajectory <
spawn·0.3` (it comes home somewhere), keeping the guard's intent. Log this as a real-time deviation
— it is re-measuring the same property at the right point, not weakening a driver; the RED driver
(the sweep assertion) stays untouched and mutation-verified.

**Audit-citation fallout (two kinds, one edit):** the edit shifts cited lines two ways
(`tools/audit/reanchor-citations.mjs` documents both). (1) A line MOVED, verbatim intact →
`reanchor-citations.mjs --write` fixes the number (A-015 here). (2) You CHANGED a cited line's text
(`lookRotation(dir)` → `lookRotation(FACING_PLAYER)`, A-008). The tool reports it LOST. Its default
prescription is `remediated_by: <story>` (freeze it) — but A-008 is a **CONFIRMED** finding that
your change made MORE faithful (the code now matches the ROM's straight facing exactly), so DON'T
freeze it: re-spell its `ours.line`/`ours.verbatim` AND the claim/reasoning prose to the new code so
the gate keeps verifying our code still faces the player. Freezing a still-live CONFIRMED match
would stop the audit checking it. Run the citations suite green before committing.

---

### A REFERENCE branch bundles decisions your story hasn't ratified — port the mechanism, strip the pending ruling, and guard the CHECK not the MOVEMENT

**Situation:** cp2-16 (centipede) ports the PLAYEX stamps from the superseded cp2-15 reference
branch (`7babb64`). The reference's stepPlayingFrame threads a `died` flag that also FREEZES the
spider/flea/SHOOT steppers on the kill frame — the ROM's BUGMV/ANTMV dead-gun gates — but the
session had explicitly routed that freeze-vs-run question for a ruling (upstream #35 keeps
steppers running for replay stability, and an attract demo now depends on the draw cadence).

**Problem:** porting the reference wholesale would have decided the ruling silently, shifted
rng-draw cadence on every death frame, and put the attract demo's determinism in play — none of
it demanded by any red. The reference is spec-with-proofs for the MECHANISM (stamps at the three
PLAY caller sites, slot-12 post-SHOOT/post-move phasing), not a ratified design for every choice
it happens to contain.

**Prevention:** before porting, split the reference diff into (a) what the reds demand, (b) what
both regimes agree on, (c) what's pending a ruling. Here the narrow line: gate the PLAY CHECKS
one-death-per-frame (`!playerHit`) — in the ROM a dead gun's PLAY is unreachable (both callers
gate on PLAYP), and in #35's regime the single consolidated check had the same net effect, so
(b) covers it — while the STEPPERS stay ungated (c). Log the strip as a deviation so the ruling
story knows the gates are cleanly addable. Bonus, same story: a finding that counts occurrences
of a line-number STRING overcounts wrong citations — of four `1447`s in the dossier, two were a
DIFFERENT instruction genuinely at :1447 (`ADC X,MOBJH`); verify each occurrence's claimed
instruction against the quarry before sweeping, and expect inherited line cites to be off by a
line or two per copy (the reference's ":1281 LDX I,NCENT-1" is :1284 in this quarry).

---

### The known "TEA's re-seat is incomplete" failure has a NUMERIC variant — grep the trigger FIELD, and expect the citation gate to hand you the story's own finding as LOST

**Situation:** sw8-11 GREEN (quota → PH.TIM time-box). TEA's sweep was thorough by SYMBOL
(`SPACE_WAVE_QUOTA`, 12 files re-seated, full-suite-verified) — and still two fixtures broke in
GREEN, because they forced the space→surface cross with a NUMERIC literal (`phaseKills: 9999`)
the symbol grep cannot see. One even said "whatever mechanism GREEN builds" in its own comment —
mechanism-agnostic intent, mechanism-specific staging.

**Fix/Prevention:** after a mechanism swap, grep the trigger FIELD (`phaseKills:` /
`spawnTimer:` / whatever the old gate read), not just the retired constant. Re-seat onto the
RED's dual-mechanism helper so the fixture stays valid under both.

**Citation-gate corollary:** deleting the divergent line LOSES exactly the citation of the audit
finding that documented the divergence (here A-019 quoting `export const SPACE_WAVE_QUOTA = 6`).
That is the one case where `remediated_by: "<story>"` is the honest exit (the story really
removed the defect; X-002/sw7-7 precedent) — everything else re-anchors mechanically
(`tools/audit/reanchor-citations.mjs --write`; its full-file re-serialization normalizes unicode
escapes across all findings files, so warn the Reviewer the bulk of that diff is mechanical).

---

### Splitting a CONCATENATED bake needs the release-ORDER check, and a positional manifest scrape can mask a missing bake source

**Situation:** sw8-12 split theme B out of star-wars' concatenated `space_theme.wav` (the core now
cues `themeB` at its own 10s milestone) — a code change AND an asset re-shape in one story.

**Problem (two distinct):** (1) The asset and the code deploy through DIFFERENT channels (R2
deploy-assets by hand vs the release CI), so there is a WRONG ORDER in each direction: upload the
re-baked assets before the merge and LIVE (old code) plays a re-shaped loop early; release the new
code before uploading and the old concatenated wav DOUBLE-PLAYS theme B (loop lands it at ~8.3s,
the cue again at 10s). (2) bake-music.test.mjs's manifest-agreement test scraped audio.ts's TUNES
with a POSITIONAL count (first 5 entries) — which silently excluded `finishGround` and thereby
hid that `finish_ground.wav` has NO bake source at all (OUTPUT_FILES never included it; a bucket
wipe loses the asset forever). Extending the count by one for the new tune would have deepened
the mask.

**Prevention:** (1) When a story re-shapes a served asset, write the ORDERING into the Delivery
Findings as release-blocking: deploy-assets with/before the release, never from the unmerged
branch; verify the bake locally into the scratchpad instead. (2) Never extend a positional scrape
— scrape the WHOLE manifest, and if an entry has no bake source, state the carve-out in the test
with a filed owner (sw8-14) rather than tuning the count so the test can't see it. A test that
"agrees" by not looking is the silent-404 bug the suite exists to prevent.

---

### The citation gate's re-anchor loop already HAS a tool in the repo (check `tools/audit/` before writing one), and the working-tree model it serves is what tempest retired

**Situation:** GREEN work that inserts lines into a file the ROM-fidelity audit cites.
`docs/audit/findings/*.json` pin an `ours` citation as `{file, line, verbatim}` and star-wars's
`tests/audit/citations.test.ts` re-opens the pinned LINE **in the working tree**
(`check-citations.mjs:155`), so ANY insertion — even a comment — moves every pin below it.
uf1-12 added 5 lines to `star-wars/src/core/sim.ts` (the `stepGame` viewport shadow) and moved 23
pins across 9 findings files; `sim.ts` alone carries 36.

**Problem 1 — the repo already has the tool.** Dev hand-rolled a scratchpad re-anchor script
without looking. `tools/audit/reanchor-citations.mjs` has been there all along (dry-run by
default, `--write` to apply, skips `remediated_by`, nearest-match on duplicates). Run against the
hand-anchored result it said "96 already correct, 0 re-anchored, 0 lost" — i.e. it would have done
the identical job in one command. **`ls tools/` before writing any audit/maintenance script.**

**Problem 2 — the loop itself is obsolete, and the sibling proved it.** tempest RETIRED this in
tp1-22 by pointing its gate at the **audit COMMIT** (`git show 4232ed4:<file>`) instead of the
working tree. The audit record is immutable, so a finding green once is green forever however the
code is later refactored, `ours.line` goes decorative, and tempest's re-anchor tool is demoted to
a LOST-only health check. star-wars still reads the working tree, so it still pays the churn —
filed as **td1-13** (port the freeze; the reconciliation of already-moved pins is the real work).

**Why the freeze matters beyond saved churn — a non-unique verbatim can go green on the WRONG
code.** The gate only asks "does the text at this line still match?", so a pin moved to a
different occurrence of the same text passes. In star-wars `sim.ts`, `      damage++` occurs at
616, 1016 **and** 1101, and `    if (collides(s.pos, ship, COCKPIT_HIT_RADIUS)) {` at 615 and
1100 — the space and surface damage paths are near-identical code. A mis-anchored S-016 would
describe the surface routine and read green forever; nothing would ever flag it. Nearest-match
(what the tool does) is sound for insert-only edits, since insertions preserve order, but its own
header states that as an assumption and a code MOVE breaks it. Freezing makes it moot.

**Second trap, opposite direction: ~1/3 of the pins are stale BY DESIGN.** The checker exempts any
finding carrying `remediated_by` (`check-citations.mjs:117`) so a fixed finding keeps the citation
it was AUDITED with — 34 such pins against 96 live ones in star-wars. A sweep that "fixes all the
stale pins" rewrites the audit's own history. Whatever tool you run, it must skip them (both
repos' tools do).

**If you must re-anchor by hand anyway** (mid-story, tool unavailable): compare with the checker's
own rule — `trimEnd()`, not exact equality (`:158`); skip `remediated_by`; resolve a
multi-candidate verbatim by the file's uniform shift (one edit inserts at ONE point, so every pin
below moves by the same delta) and refuse to guess otherwise; write with
`JSON.stringify(findings, null, 2) + '\n'` so the diff stays line-numbers-only (`git diff --stat`
should show equal insertions/deletions and no reformat).

**Also:** a line number in a CODE COMMENT is outside the gate entirely. uf1-12's own new comment
cited `sim.ts:298` for the gun's `beamDir` — a line the same commit pushed to 303. Nothing catches
that but you; name the symbol instead of the line.

---

### A shipped feature can be a MIS-PORT of a real register — grep every consumer of the ROM symbol before you inherit the port's premise

**Situation:** sw8-8 (star-wars) had to close a fairness defect that traced back to `spaceEye`, a
camera sw8-1 derived from the ROM's `ST.UX`. Two obvious fixes existed and both were blocked: home
the incoming fire at the camera (breaks frame-rate independence — the camera is a sawtooth of the
integer `frame`), or park the camera (deletes the shipped drift).

**Problem:** the dilemma was fake, and it dissolved the moment anyone grepped the ROM symbol instead
of reasoning from the port. `ST.UX` has exactly ONE reader in the whole 1983 tree — the star
generator (`WSSTAR.MAC:98-102`, `LDD ST.UX ;STARS RELATIVE MOVEMENT`). Its siblings are literally
named `;PLAYERS UNIVERSE Y/Z FOR STARS` (WSGLOB.MAC:752-753), every writer sits under `.SBTTL MOVE
STARS IN SOME DIRECTION`, and the Death-Star movers are assembled out (`.REPT 0`). sw8-1 read the
writer (`S1MV: LDD FRAME / JSR LSLD7 / STD ST.UX`) correctly and ported it TWICE — faithfully into
`starfield.ts`, and again as a global camera. The second copy was the whole bug, and it had been
live and green for two stories, defended by its own confident doc comment.

**Prevention:** when a defect traces to a ported ROM register, do not start from the port's reading.
`grep -rn "SYMBOL" *.MAC` and enumerate **every reader and every writer**. A register with one
consumer is a single-purpose register no matter how general its declaration comment sounds
(`ST.UX::` is commented `;VIEWER X POSITION` — that names the QUANTITY; the siblings name the
CONSUMER). Check whether the port already implements the same register somewhere else and correctly:
a duplicate port is the strongest possible evidence that one of the two copies is wrong. And check
whether the ROM's writers even run in the phase you care about — four of these five were attract
and interstitial screens.

**Prevention (the retirement itself):** DELETE the mis-ported symbol, do not leave it exported and
unused — a dead `spaceEye` is an invitation to wire it back in. Leave a TOMBSTONE comment in its
place carrying the source case (which file reads it, which write it, which are assembled out) and
pointing at where the register legitimately lives. Then INVERT the tests that asserted the mis-port
rather than deleting them: `render.moving-eye.test.ts` became `render.space-camera.test.ts` whose
first test now pins that the camera is frame-INVARIANT. The inversion is the tripwire; deleting the
tests would leave the third re-derivation unopposed. Rename the file too — a filename asserting the
retired premise is a citation the next reader will trust.

**Also:** retiring a symbol shifts line numbers across `sim.ts`/`render.ts`/`gameRules.ts` and the
audit citation gate WILL redden (38 findings here). Run `node tools/audit/reanchor-citations.mjs`
DRY FIRST and read the summary line: `0 lost` means every hit was a pure line MOVE and `--write` is
safe. A non-zero "lost" means a citation's quoted TEXT is gone, which is a real decision (mark the
finding `remediated_by`), not a mechanical reanchor. After `--write`, confirm the diff is only
`"line": N` values — the tool re-serializes whole files and has previously turned `\uXXXX` escapes
into literal unicode, burying the real change.

---

### Backticks in a `git commit -m "…"` message run COMMAND SUBSTITUTION — a message quoting `just serve` starts a dev server and hangs the tool call

**Situation:** mg1-2's implementation commit. The message documented the change in this repo's
usual prose style, which means it quoted commands in backticks: `` `just serve` ``,
`` `scripts/build-app.mjs` ``. Passed inline via `git commit -m "…"` — double quotes, not single.

**Problem:** bash evaluates backticks inside double quotes. The commit never ran; instead the shell
executed `just serve`, which starts a Vite dev server and never returns, and the tool call died at
the 2-minute timeout. `git status` afterwards showed everything STAGED but uncommitted, which reads
like a hook rejection and sends you looking in `.git/hooks` (there are none). A stray dev server may
also be left holding a port — check `pgrep -f vite` before retrying.

**Prevention:** any commit message containing backticks goes in a FILE — `git commit -F <path>` —
never `-m`. This repo's house style guarantees backticks in almost every message, so treat `-F` as
the default rather than the exception. The tell is a commit that "times out" while leaving a clean
`git log` and a fully staged index.

---

### Composing per-app Vite configs: mount `middlewareMode` children, don't rewrite URLs — and give them the parent's `httpServer` or six HMR sockets collide

**Situation:** mg1-2 — one dev server had to serve the lobby at `/` and seven games at `/<id>/`,
where the repo already had a `defineAppConfig(id)` factory producing a per-app config (`root` =
that app, `base` = `/<id>/`).

**What worked, in one plugin:** `createServer({ configFile: false, ...defineAppConfig({ id }),
server: { middlewareMode: true } })` per game, held in a Map, and one
`server.middlewares.use(...)` that dispatches on the first path segment and calls
`child.middlewares(req, res, next)`. Each child then does its own resolution, HTML rewriting and
`/<id>/src/…` serving exactly as it does when built — no path map, no HTML rewriting, and dev
cannot drift from the build because ONE definition feeds both. Worked first try.

**Three things that are easy to get wrong:**
- **Install the dispatcher with a bare `use`, not a returned post-hook.** Vite's SPA-fallback
  middleware is one of the internals; a post-hook installs after it, so the fallback answers
  `/tempest/` before your dispatcher ever sees it — which is the exact bug being fixed.
- **The plugin must be `apply: 'serve'` and must live ONLY in the top-level config, never inside
  the shared factory.** A child built from a factory that includes the plugin mounts its own
  children and recurses forever.
- **Pass `hmr: { server: parent.httpServer }` to every child.** Otherwise each opens its own
  websocket on Vite's default 24678 and all but the first fail, printing
  `WebSocket server error: Port 24678 is already in use` on every start — six lines here. Every
  test was green; it was found by reading the server's stdout while measuring startup.

**Cost, measured before optimising:** seven eager children → first response 265 ms, `/tempest/` in
6 ms. Vite does no bundling in dev, so lazy construction would have bought nothing and added a
race. Measure before reaching for it.

---

### A dev-server story is not done at the HTTP layer — crawl the module graph, because a missing import returns the FALLBACK with a 200

**Situation:** mg1-2's suite proved each `/<id>/` returns that game's HTML. That says nothing about
whether the page then survives its first import, and the live risk was real: each child's `root` is
its plugin directory, while `@shared` and `@host` resolve OUTSIDE it.

**The check that closed it:** fetch the page, extract its entry module, then crawl `from "/…"`
specifiers a few levels deep requiring every node to come back as JavaScript. A module that fails
to resolve returns the SPA fallback — **200, `text/html`** — so status is useless and content-type
is the discriminator. Result: 29/22/38/35 modules across four games, zero non-JS.

**Then actually look at it.** Loading two games in a browser and reading the canvas
(`getImageData` → count non-black pixels) turns "it serves" into "it renders": tempest 73.7% lit,
joust 6.2%, no console errors. For a story whose entire point is that a render could not be
verified locally, verifying it any other way would have been the same shape of proof-by-proxy the
story was filed to end.

---

### Making a hand-rolled double SATISFY a big DOM interface: it is ~4 mechanical families, and only two facts are non-obvious

**Situation:** mg1-9. `src/shared/tests/synth.test.ts` carried 22 type errors because its
`FakeAudioContext`/`FakeGain` doubles approximated Web Audio rather than implementing it — invisible
for the whole life of arcade-shared, because vitest strips types without checking them. TEA banned
the cheap exits (`as`, `any`, `@ts-nocheck`, and narrowing the production signature), so the only
route was to actually satisfy `AudioContext` (38 members), `AudioBufferSourceNode` (20),
`OscillatorNode` (18), `GainNode` (12), `AudioParam` (12), `AudioBuffer` (7).

**It is far less work than the member counts suggest — 280 lines of diff, ~30 minutes.** The count
is intimidating and the actual difficulty is concentrated in two places:

1. **`Float32Array` is generic as of TS 5.7.** `new Float32Array(n)` infers
   `Float32Array<ArrayBufferLike>` and does NOT satisfy
   `AudioBuffer.getChannelData(): Float32Array<ArrayBuffer>` — the failure path goes through
   `SharedArrayBuffer` and reads like a compiler bug. Declare the field as
   `Float32Array<ArrayBuffer>` and construct it `new Float32Array(new ArrayBuffer(len *
   Float32Array.BYTES_PER_ELEMENT))`. This was the last error standing.
2. **Members you never call must be LAZY.** `readonly listener: AudioListener = unused()`
   typechecks perfectly and throws on every test, because a field initialiser runs in the
   constructor. Use `get listener(): AudioListener { return unused() }`. `tsc` cannot see this
   distinction at all — the suite going green is the only signal, so run it, do not infer it.

Everything else is mechanical: `extends EventTarget` supplies the three EventTarget members on the
context and on every node; unused methods become one-line `return unused()` where `unused` returns
`never`; and `connect`/`disconnect` need their overload signatures declared ahead of the
implementation, with `'connect' in target` narrowing `AudioNode | AudioParam` **without a cast**
(which matters when a source-rule test is banning casts).

**The call-site half is where the design decision lives.** Once `createGain()` returns a real
`GainNode`, a builder typed `(target: SynthTarget)` sees real node types — so the test's local
`HumController` must hold `OscillatorNode`/`GainNode`/`AudioContext`, not the fakes. That is not a
loss: the assertions still reach the doubles' recording fields (`.values`, `.connectedTo`) through
the context's own registries (`only().gains`, `contexts()[0].oscillators`), which stay typed as the
fakes. **Keep the registries fake and let the factory returns go real** — that one split is what
makes the whole conversion cheap, and it is closer to what a cabinet actually sees.

**Two smaller traps:** a `vi.fn(() => …)` with no declared parameter infers a ZERO-argument
signature, so `mock.calls[0][0]` indexes an empty tuple — three of the 22 errors were that one
omission, fixed by writing `vi.fn((_target: SynthTarget) => …)`. And importing the real type into a
suite built around dynamic `import()` + `vi.resetModules()` is safe as `import type` — it is erased
at compile time and cannot disturb the module reset.

**Verify the pass COUNT, not just green.** The AC was "the pass count is unchanged, so the fix is a
typing change and not a quiet removal of tests that would not compile." Shared came back 501/501
across 26 files and the full cabinet 10413 + 1 todo across 698 — both identical to the pre-fix
baseline TEA recorded. A conversion this wide is exactly where a test quietly stops running, and
"all green" would not have said so.

---

## An audio SEAM story: the suite cannot tell you a cue will ever fire (jt5-1, joust, 2026-07-31)

A three-file audio seam (`core/events.ts` union → `shell/audio.ts` manifest → `shell/audio-dispatch.ts`
switch) is the same shape in every cabinet, and TEA's suites for it are thorough about the WIRING.
They are structurally unable to tell you the thing that actually matters: **that a declared kind has
an emitter that can fire.** The manifest sweep, the dispatch sweep and the coverage check all read
the same `EVENT_KINDS` tuple, so a kind with no emitter passes every one of them and ships a cue
that can never sound. Going green is not the end of the job.

**Drive every kind from a real code path before you claim it works.** On jt5-1 that was 3×12,000
frames of ordinary seeded play, which surfaced **seven of eleven**. The other four each needed
deliberate staging — a forced wave advance past the first destructive wave, a ledger parked one
award under the extra-man threshold, an egg wave stepped far enough for an egg to mature, and a
two-entity collision set up by hand. All four fired, but nothing in the suite would have noticed if
they had not.

**A staged probe can pass for the wrong reason, and it looks identical.** The first ptero-kill
staging put the knight in the LOSING height band, so the frame emitted `player-death` — which is
the *correct* cue for what actually happened. "A cue came out" was one geometry error away from
being read as "the kill cue works". Assert the SPECIFIC kind and a corroborating state change (a
`dissolve` process appeared), never that the list is non-empty.

**Read the function you are diffing, not its name.** The cliff cue first counted
`destroyedCliffs.length` growth — which silently assumes destruction accumulates. The doc comment on
`applyWaveDestruction`, two lines above the call, says the opposite: destruction *reflects* the
current wave and rebuilds cliffs whose bit is now clear. A wave rebuilding one cliff while
destroying another leaves the count unmoved and would have gone silent. Measured across waves 1–40
the shipped table contains rebuilds but no count-preserving swap, so the emitted count was 21 either
way — **latent, not live**. Say so in exactly those words; "found and fixed a bug" overclaims and
"no findings" hides a real reasoning error the data happened to cover for.

**Where to emit: at the decision, not from a diff.** Reconstructing moments in the session layer by
diffing process lists is tempting and mostly works, but telling a HATCHED egg from a COLLECTED one
ends up leaning on an id-namespace trick (`0x40_0000 + id` reappearing as an enemy). Emitting inside
the collision pass, where the outcome is already decided, cannot mistake one removal for another.
The cost is a new required field on the sim state — check first that every test builds that state by
SPREADING an existing one (they did), and note that a frozen test-contract type mirroring it may
already be a subset and need no edit at all.

**Two derivations worth stealing.** An extra-man award is counted off the ledger's own re-armed
threshold (`(after.extraManAt − before.extraManAt) / INTERVAL`), not off `lives` — a death
decrements lives on the same frame an award increments it and the two CANCEL. A wave bounty is
detected by a score actually MOVING, not by object identity, because the award function returns
fresh ledgers whether or not it paid.

**Prose counts in the README are part of the diff.** joust's README carried five measured figures
this story moved — suite size, claim count (twice), and a whole `skipIf` reconciliation block of six
numbers. Nothing checks any of them. Re-measure and update them in the same commit, or the next
reader inherits a document that is confidently wrong about a thing they can verify in one command.

---

### A wiring story is not done at the unit seam — SERVE it, because the whole point is a code path only a real browser reaches

**Situation:** cp5-2 wired centipede's audio seam into `main.ts`. TEA's RED was unusually strong (a real
boot harness, 14 tests, a six-mutant battery), and `npx vitest run` came back 10,751/10,751 green.

**Why that was not enough:** the harness stubs `AudioContext`. The story's AC4 is about the browser's
*gesture gate* — a rule enforced by the real WebAudio implementation, not by our code — and the shared
engine's whole failure model (silent degrade on absent WebAudio, blocked autoplay, failed fetch,
undecodable sample) is invisible to a stub that never fails. A green suite says the call happens; it
cannot say the browser accepted it.

**What serving it actually showed, in about four minutes:**

| | requests to the assets host |
|---|---|
| booted, attract running untouched | **0** |
| after ONE keypress | **14**, one per manifest entry |

That table IS the AC, measured. And it surfaced the thing no test asserts: the wiring turns on **14
console 404s** the moment the player touches a key, because no sample is uploaded yet. Predicted by the
predecessor story, accepted by the epic, invisible to every suite — and it looks exactly like a bug to
the next person who opens devtools. It became a Delivery Finding instead of a surprise.

**The technique, which needs no fixtures:** `performance.getEntriesByType('resource')` filtered to the
asset host is a direct, cheap observation of "did the lazy engine wake up" — better evidence than trying
to count constructor calls after the fact, because you cannot retroactively instrument a module that has
already evaluated. Pair it with a liveness probe (`frame` delta over 1000 ms — 60 is the ROM cadence, 0
means the loop froze) so "it didn't throw" is distinguished from "it stopped".

**Two traps on the way:**
- The Chrome extension may be down; Playwright MCP against the dev server is the documented fallback and
  worked first try.
- An all-`200` sweep proves nothing on this repo — the lobby's SPA fallback answers 200 for everything.
  Compare the game path's HTML against a nonsense control and require they DIFFER before believing you
  are looking at the game (CLAUDE.md says so; it costs one `md5`).

---

### When TEA hands you a deviation saying "I could not test X, it is your judgment" — do the thing the RULING says, not the thing the test list allows

**Situation:** cp5-2's ruling was to drop two runtime throws. TEA pinned one of them and logged a
deviation for the other: the second `throw` sits in a `default:` arm that is unreachable without a cast,
so no honest runtime assertion can reach it. Removing only the first throw passes 1012/1012.

**The call:** remove both. The arm is on the frame path, the ruling named it, and all five sibling games
end that arm the same way. A test list is a floor, not a specification — and TEA's deviation was not
permission to skip the work, it was a flag that the *verification* had a hole, which is precisely when
the Reviewer needs the implementer to have used judgment rather than the compiler.

**The discipline that keeps this from becoming scope creep:** removing the throw is in the ruling;
restructuring the dispatch would not be. Check what the predecessor's guard REQUIRES before touching
anything near it — cp5-1's `verdict()` demands exactly one `switch` reachable from the entry point,
exactly one `never` binding in the default arm, and no engine call there. So `continue` was the only
shape available for the first fix: an `if/else` wrapping a second `switch` would have reddened a passing
cp5-1 test, and it would have read as collateral damage rather than as my mistake.

**Log it as a deviation either way.** "I did MORE than the tests demanded, here is the ruling that says
so" is exactly the kind of thing the Reviewer should get to rule on rather than discover in a diff.

---

### A routing change that makes the null-target path wave-invariant silently KILLS single-step demo probes — and a single `stepDemo` wake IS a null-target wake

**Situation:** uf1-8 retired the null-target fall-through (a no-target buzzard now flies BOLEV — flap
iff falling, dial dark, wave-invariant). The difficulty-wiring suite drives one-step `demoAtCounter`
probes and compares them against `stepEnemy(probe, { player: FAR_BELOW, wave })` — TEA's re-stage
parked knights below and *believed* the probe would see them. It cannot: `reconcileTargets` registers
players only at the END of a step, with their TARTIM=90 grace armed, so a one-step probe reads
`selectTarget` = null whatever sits on the island. Under the new spec the probe's wake becomes a BOLEV
wake — which flaps at EVERY wave — so the wave-decode tests (BCD vs decimal, R2-1) would have passed
VACUOUSLY: viaDemo equals the wave-10 reference *because both flap*, and a demo that misdecoded the
counter would pass identically. Two other suites broke for the same root cause (game-jt4-5's killers
flapped away; the knightless brake-window run never dives).

**The fix that keeps the guards honest:** stage the regime the new spec says the dial decides in — a
COMMITTED EPISODE (`seek: { mode: 'down', pdist: waveValue('BODNDI', wave) }`). `BODN1` never re-runs
SELPLY, so the brake law decides target-or-none, wave-scaled — discrimination restored through the demo.

**The general trap:** when a spec change makes some branch INSENSITIVE to the thing a sibling probe
measures (here: the wave), every probe whose staging lands on that branch passes for the wrong reason.
Grep the siblings for the branch you just made invariant, not only for the ones that go red — the red
ones are the honest ones.

**Second-order cost, logged for uf1-9:** per-wake level flight (flap every falling wake) saturates a
buzzard's FLYX index long before the TARTIM grace clears, so jt8-2's live-compare homing throttle never
matches an idle or wandering player — 0 reversals over 2,400 frames on every seed. The homing-wiring
liveness guard now stages a rung-matching chase and pins the idle-stick ZERO as a known divergence;
uf1-9's PPVELX snapshot + BOLETM boundary are what turn it back on. If your story lands those rows,
that pin is designed to fail — rewrite it for snapshot semantics, do not "fix" the zero.

## Re-baselining a SEEDED frame pin: scan for the test's OWN preconditions, never nudge the number (jt8-7, joust, 2026-08-01)

**Situation:** tightening the egg catch shifted a deterministic replay, breaking four
frame-exact pins in `audio-events.test.ts` (`egg-collected` @ seed 0xbeef frame 516, and three
at 0xface). TEA had predicted them; the job was moving them honestly.

**The method that makes it defensible.** Each pin already asserts a PRECONDITION before it
asserts the cue — "an egg really leaves on this frame AND really scores", "a knight really
dies", "the wave really advances AND deals a complement". So the search is not "what frame
makes this green" but "at which frames does the precondition hold". A throwaway probe stepped
3000 frames per seed with the same input script and recorded every frame satisfying each
precondition; the new coordinates fell out as data. 516→523, 1614→1641, 1938→1810, 1939→1811,
with both seeds and the script unchanged — the least invasive move.

Why this matters beyond tidiness: a pin whose precondition survives **cannot be made vacuous
by a re-baseline**, because a wrong coordinate fails the precondition before reaching the cue
assertion. That is the sentence to put in the commit and the assessment, because "Dev edited
the test that was failing" and "Dev re-measured a coordinate into a deterministic replay" look
identical in a diff. Say which one it is, show the table of old→new, and name the method.

Also worth knowing: this file had ALREADY been re-baselined twice (jt5-4 changed the seed,
uf1-8 changed the frames), and both times the reasoning was left in a block comment. Extend
that comment rather than replacing it — the history is what makes the third one credible.

## A count-FLOOR guard REQUIRES the bump when you add records — that is not the same as loosening it

`demo-jt3-7-render.test.ts` pins `ENTITY_RECORD_FLOOR` and separately asserts
`ENTITY_RECORD_FLOOR >= realCount` ("no 1-unit slack"). So adding six records reds it with
*"the floor must EQUAL the real record count"* — the guard is DEMANDING the update, and
leaving it alone is the failure mode it exists to catch (a dropped un-enumerated record
hiding in the slack). Read the failing assertion's own message before treating a reddened
guard as an obstacle: here it names the required action outright.

Generally: adding rows to a transcription is exactly the event that puts slack in a count
floor, so expect this every time a table grows, and bump the floor in the same commit.

## The record NAME can be load-bearing for one row of a table and free for the rest

Transcribing EGGI's seven rows, the obvious move is to name each record after its pixel
source (jt3-7's `PT1R`-the-record / `PT1R`-the-block convention — the two arrays are separate
namespaces). But row 0's existing name `EGGI` is consumed twice: `demo.ts` emits
`entityOp('EGGI', …)` for the egg draw op, and `demo-source.test.ts` requires the literal
`'EGGI'` in a required-records list. Renaming it to `EGGUP` for consistency would have broken
both, and the second one only at test time.

`grep -n "'<NAME>'"` across `src/` and `tests/` before renaming any record, and expect the
consumers to be a draw-list string and a test's required-list — neither of which a type
checker will catch, because both are bare strings.

## A "frozen fingerprint" of a seeded run can be blind to a real behaviour change

`audio-events.test.ts`'s `jt5-1 AC3` fingerprint pins `frame/rng/wave/procs/scores/lives` at
2400 frames and passed **identically before and after** a collision-geometry change that
provably moved an egg pickup by 7 frames on the very same seed. It is not broken — its stated
job is narrow (prove the event channel draws no RNG and changes no ordering) — but it pins
fields that read like a general behaviour fingerprint and is not one: the shift washed out by
the sample point.

So do not cite an unchanged fingerprint as evidence a change was inert, and do not assume a
timeline shift will redden one. Filed as a non-blocking finding rather than "fixed", because
tightening it is a different story's call.

## The ENTRY into a state machine is a separate ROM fact from the state machine — and assuming symmetry between two brains cost the bounder its climb (uf1-9, joust, 2026-08-02)

**Situation:** wiring joust's PJOYT wing latch. The two-phase cadence itself was easy to read out of
the source — wings down for BOUPWD wakes, up for BOUPWU — and my implementation reproduced it
exactly. Every one of TEA's thirteen new behavioural tests went green.

**And two OTHER suites went red:** `homing.test.ts` ("the flip is applied BEFORE the wake's step")
and `target-wiring.test.ts` ("a promoted bounder below a targetable player gains upward velocity").
The bounder had stopped climbing.

**Cause: I seeded the latch's starting phase by assuming the two brains matched.** They do not, and
the ROM says so in one instruction each. The bounder's up-seek decide ends `BRA BOUP1A` (:3853) —
which is the FLAP branch, so it enters wings DOWN and commits a flap on the arm wake. The hunter's
ends `BRA B2UP2D` (:4037) — `LDA HUUPWU / … / CLRB`, so it enters wings UP and glides a full hold
first. I gave both the hunter's entry, which silently cost the bounder its first flap and left it
sinking toward a quarry it was supposed to climb to.

**Two things worth generalising.**

1. **A cadence has three ROM facts, not one: the hold lengths, the transition rule, and the ENTRY.**
   The first two are in the state bodies and are what you naturally read; the entry is at the
   *branch target of the decide*, often lines away, and it is the one a test of the steady-state
   cycle cannot see. TEA's suite deliberately pinned "period, not phase" (the right call — phase is
   a design choice for most ports), so the entry bug was invisible to every new test and was caught
   only by two OLD suites about something else entirely.
2. **When two objects share a mechanic, find the ROM line where each ENTERS it before sharing code
   between them.** The asymmetry here was one `BRA` target apart. This is the same family as the
   sidecar's `narrowPhase` and two-mask-table entries: the difference between two things that look
   like a pair is usually a single instruction, and it is never in the part you read first.

**The reason this ended well is worth naming too:** the fix made two failing sibling suites pass,
which is the signature of a real bug fixed rather than a guard re-baselined. Before touching a
single expectation in a story that expects a re-baseline, sort the failures into "moved because the
sim legitimately changed" and "moved because I got it wrong" — and treat *any* failure that a
correction makes GREEN AGAIN as proof it was in the second pile.

## Re-baselining that changes the SEED: sweep before you conclude a coordinate merely moved

The jt8-7 rule is to re-find each pin by sweeping for its own PRECONDITION rather than nudging the
number. uf1-9 needed the next step out: **two pins had no satisfying frame on their seed at all.**

- `audio-events`' egg pin asserts *player 2's* score rises. Swept 2500 frames of seed 0xbeef: every
  `egg-collected` now scores player ONE. Not a moved coordinate — an empty solution set.
- `audio-thud`'s person-thud pin needs a buzzard to bump a knight. Swept 1200 frames of all three
  seeds the file uses: 0x2468 and 0xbeef now produce enemy-vs-enemy thuds only.

Both moved seed (to 0x2468 f230 and 0xface f260), keeping the script and every assertion. **So the
sweep must record which seeds satisfy the precondition, not just which frames on the seed you
started from** — otherwise the honest conclusion "this seed can no longer express this test" reads
as "I could not find the frame" and the temptation is to weaken the assertion instead.

Cheap trick that paid: when a precondition is a conjunction, print the near-misses too. Tagging each
`egg-collected` with whether p1 or p2 scored (`230.2` vs `205.1`) turned "0xbeef has none" into
"0xbeef has six, all scoring the wrong player" — which is the sentence that belongs in the comment.

## Distinguish "the guard's claim survived" from "the guard's numbers survived" — and say which in the comment

Three of the re-baselined digests carry a claim in prose about WHY they are a regression guard and
not a blanket pin: *"`player#1`, `player#2` and the egg are bit-identical across all three trees."*
After uf1-9 the player rows were still bit-identical (the claim's load-bearing half held, and that
is the real finding) — but **the egg was gone**, because `enemy#257` now survives to frame 200 and
the egg it used to become never exists. Updating the numbers and leaving that sentence would have
shipped a false claim inside the very comment that exists to make the pin trustworthy.

So when re-baselining a pin whose comment asserts an invariant: re-check the INVARIANT, not just the
values, and amend the sentence in the same edit. Here the honest version is narrower and more useful
— the players are the invariant; the egg never was, because it is downstream of a KILL and kill
timing is exactly what a flap cadence moves.

## A `wired` disposition string names a function that must actually read the row

Flipping ROW_DISPOSITION's eleven entries to `wired` needs a `consumer` string, and it is unguarded
prose — no test checks that the named function reads the named row. Two of mine (SHLETM, SHCLTM)
would have been false when I first wrote them: `decideInterval` read SHUPTM for every shadow, and
there was no cliff-dwell consumer at all. The fix was to build the two consumers (the shadow's
SHLEP-vs-SHLEV split on `hasTarget`, and `withCliffDwell`), not to soften the strings. If a
disposition string is easier to write than the wiring it describes, that is the moment the inventory
starts lying — and the inventory is what the next sweep trusts instead of re-deriving.
---

## Building a CITATION checker: the first working version reports mostly CORRECT citations, and every rule you add must be earned by opening the cited line (sw8-18, star-wars, 2026-08-02)

A guard that re-opens `<file>:<span>` citations written in source comments sounds like an
afternoon. The checker was quick; **calibrating it was the story.** The first working version
reported **146** stale citations across star-wars and the great majority were correct citations
the matcher could not read. Final count **35 — of which calibration accounts for 146 → 49 and
the actual comment edits for 49 → 35.**

> **Corrected in review.** The first draft of this entry claimed *none* of the drop was a comment
> edit. That was false, and the check that caught it is the reusable part: run the FINAL tool
> against the PRE-STORY tree (`git worktree add --detach /tmp/base <base-sha>`). Old-tool/old-tree
> and new-tool/new-tree cannot decompose an attribution; **new-tool/old-tree** is the pivot, and it
> is one command away. See the Reviewer sidecar entry on decomposing a headline metric.

Six rules, each added only after opening the cited ROM lines and confirming the comment was
RIGHT. They generalise to any tool that matches quoted text against a source:

1. **Pair delimiters by SCANNING, never by regex from a position.** ``/`([^`]+)`/`` pairs the
   CLOSING backtick of one identifier with the OPENING of the next, so
   ``​`ST.UX` is the STARFIELD's register`` is read as a quote. This single bug produced most of
   the false positives.
2. **A quote is a FRAGMENT — require whitespace.** `state.ts \`FIRE_MASK\`, WSCPU.MAC:736` put a
   TypeScript identifier up against the ROM. `WSCPU.MAC:736` is `TGPROB:` and was always correct.
3. **Split the rule on the CITED FILE, not on the quote.** A ROM verbatim must be predominantly
   assembler (else `gdSeq >= seq` gets checked against WSGRND); a markdown verbatim is legitimate
   English prose. One rule for both is unsatisfiable in one direction or blind in the other.
4. **Markdown emphasis-stripping is wrong for assembler.** You need it — the spec stores
   `the **Death Star is entirely out of frame**` and the comment quotes it without asterisks — but
   `*` is the assembler's MULTIPLY operator, and stripping it turns `SUBD #6*120.*2` into
   `6120.2`. Key the normalisation to the target's file type.
5. **A single-line citation conventionally anchors the START of a run.** `LDA BS.WAV / LSRA /
   IFCC`, `WSMAIN.MAC:1868` cites three consecutive instructions by their first line. Demanding
   the whole run inside one line flags a whole codebase's convention as broken.
6. **"Nearest preceding filename" is wrong the moment prose names a second file.** A bare
   `:607-608` belonged to a `WSCPU.MAC` three lines up, with `math3d.ts:171-186` in between.
   Resolve a bare span against the nearest preceding candidate that actually VERIFIES the quote —
   verification beats proximity, and it terminates the guessing.

**The discipline that matters:** every one of those was found by reading the ROM, not by watching
a count. The failure mode available at each step was to "fix" a correct citation to silence the
tool — which would have written a NEW false claim into the exact comments the story convened to
make true.

## A relocation hint is FIRST-OCCURRENCE, so it can name the wrong routine

The guard reports "it is now at X:N — re-anchor to that", which is what makes it usable. But it
finds the first match: `state.ts` cites `ADDD M$TX+M.S1` for `S1MVBS` and the hint said **:2539**,
which is `S1MVGD` — a different routine containing the identical instruction. Correct answer
:2656. Same family as the existing `check-citations.mjs` trap where `damage++` occurs three times
in `sim.ts` and a mis-anchored pin reads green forever.

**Treat the hint as a lead.** When the quoted text is not unique, cite the routine SPAN
(`:2654-2656`) so the label and the instruction are both inside it — that is self-describing and
survives the next insertion better than a bare line.

## Not every "dangling file" is a defect — a rename record is the opposite of one

The guard flagged `bounded-eye-combat.test.ts` and `render.moving-eye.test.ts` as missing. Both
sit in comments reading *"This file was `<old name>`"* — a true, past-tense record of the file's
own rename, and the only place the old name survives.

The defect this story existed to fix was a PRESENT-tense reference to a deleted suite as though it
still ran. Deleting a rename record to satisfy a checker destroys history to make a tool quiet.
Mark it retired (this guard has a `RETIRED:` marker for exactly the citations prose quotes in
order to disown) and the record stays.

**Generally: before making a checker green, ask whether the thing it flagged is a claim about the
present or a record of the past.** Only the first can be stale.

## A hardcoded span in the suite that polices hardcoded spans — and it rotted inside the story

TEA's mutation fixture wrote `design.md:45-46` as "the correct span". Closing a different AC edited
that spec three lines above the observation, and the fixture broke — **the test that proves the
guard catches stale spans went stale, during the same story.** Fixed by deriving the span at run
time (`findIndex` on the observation, build the range from it).

Worth logging as a deviation and worth generalising: when a suite's subject is "pointers rot",
every literal pointer inside it is a latent failure. TEA's own header said assertions should
resolve rather than pin; the one place it didn't follow its own rule is the one place that broke.

## Re-anchoring after comment edits: the repo's tool, and 22 pins hide in one file

Confirms the existing entry. Any comment insertion moves the audit's `ours` pins, which
`citations.test.ts` re-opens against the WORKING TREE. This story's prose edits moved **14** pins;
`sim.ts` alone carries 22 live ones, `state.ts` 14, `render.ts` 13. `tools/audit/reanchor-citations.mjs
--write` did it in one command (82 correct, 14 moved, 0 lost) and the diff was 14 surgical
`"line": N` changes — no re-serialization damage this time.

**Check the live-vs-frozen split before panicking at the count:** 41 of star-wars's pins carry
`remediated_by` and are deliberately frozen; the tool already skips them.

---

## A test that writes into the tree another suite MEASURES is flaky by construction — and the flake lands on the innocent suite (sw8-23, 2026-08-02)

**Situation:** sw8-23 widened a citation guard's scan to include `tools/`. TEA proved the walk
really reaches the directory by planting a probe file there and asserting the default scan
reported it, cleaning up in a `finally`. Sound-looking, and it passed when that file ran alone.

**Problem:** vitest runs test FILES in parallel and they share one filesystem. A sibling suite
holds a tree-wide ratchet (`checkTree(...).length <= N`), and it was scanning while the probe
existed — so the ratchet counted a file that lives for 40ms. `npx vitest run <one file>` was
green; `npx vitest run audit` was red. **The failure surfaced on the OTHER suite**, where
nothing in the diff, the story or the test name explains it, and the obvious diagnosis
("my change added a stale citation") is wrong.

**Fix that keeps all three proofs:** plant into `mkdtempSync(tmpdir())` and pass it via the
`roots` option; assert the exported default list contains the directory; then close the gap
between them with `checkTree({roots: defaultRoots(r)})` deep-equals `checkTree({})`. Same three
claims — the walk descends, the extension is read, the default list is the one actually used —
with no shared state.

**Generalise:** before writing a test that touches the filesystem inside the repo, ask *what
else measures this tree?* Aggregate assertions (counts, ratchets, lint sweeps, "no file
matches X") are the victims, and they are exactly the tests whose failure looks like a real
regression. If a test needs a file in a scanned location, the production code almost always
already accepts an injectable root — use it. Corollary for diagnosis: **a test that passes
alone and fails in a group is a shared-resource bug, not a logic bug** — run the suspect file
solo first; it takes ten seconds and names the class of problem immediately.

## Re-run the mutation battery against the DELIVERED code — the RED battery scored a different program

TEA ran 8 mutants against a throwaway and caught all 8. I re-ran 13 against the real
implementation: 11 caught, **1 survived**, 1 anchor-missed.

- **The survivor was real coverage, not an equivalent mutant.** Removing the head-line cap
  from the pragma scan broke nothing. The tempting read is "unobservable internal, rename the
  test". Wrong here: the scan loop only stops early at the first NON-comment line, so any file
  opening with a long prose block — every design spec in the scanned docs tree, and the tool's
  own 90-line header — would grant opt-out authority anywhere inside it. That is the story's
  headline hazard wearing a second costume. Added the test.
- **An ANCHOR MISS is not a caught mutant.** Two mutations failed to apply because I had
  reworded the target string while implementing. The battery prints `ANCHOR MISS`, and it
  scrolls past looking like just another row. Re-run every miss with the corrected string —
  both were caught, but I would have shipped claiming 13/13 having actually tested 11.

**The rule:** the RED battery scores TEA's throwaway. Yours is a different program with
different internals; its guards deserve their own battery, and the interesting output is the
same as ever — the survivors.

## When your own edit is the thing under test, re-run the tool after every edit

This story hardened a guard that scans source comments — including its own file. Writing the
implementation comments explaining the fix produced **three fresh phantom citations**, because
prose about the citation format contains citation-shaped text. Each appeared only after
re-running the tool, none was visible while writing, and one was inside the very sentence
explaining why phantoms are a problem.

Any self-scanning tool has this property: linters with rule names in their own docs,
secret-scanners with example secrets, dependency-cycle checkers that import for a fixture.
**Budget a re-run per edit rather than one at the end**, and expect the file's own
documentation to be the noisiest part of the diff.

## A guard reporting a CORRECT citation is a guard finding, not a citation to fix

One reported "stale" citation was correct: `JSR PMREB` really is at the cited line. The report
came from the association rule — the comment is a columnar table of citation/quote pairs, and
after the line-joining pass the PREVIOUS row's trailing quote falls inside the NEXT citation's
adjacency window, so the guard checked the wrong pair and helpfully named the previous row as
"where it moved to".

"Correct" the citation and you write a false record into the tree the story exists to make
truthful — and you make the guard's most confident output (a specific relocation line number)
into a lie. The right move was to reformat the comment so the pairs are unambiguous, leave the
citation untouched, and file the association bug. **Before acting on any guard's finding,
verify the finding against the primary source.** Every ROM anchor here was opened before being
trusted, precisely because the tool producing the suggestions was the thing under test.

---

## A story's DETERMINISM WARNING can be reasoned by ANALOGY and be false — measure the delta, don't budget for it (jt9-1, 2026-08-02)

**Situation:** jt9-1's description carried a loud, specific warning: *"this WILL move the jt2
seeded-replay pins again — the same 20-assertion, 4-file blast radius jt5-8 just re-baselined.
Budget for it."* SM and TEA both propagated it. It was the story's expensive half.

**Zero pins moved.** Full fleet green on the first run after the gate landed.

**Why the analogy failed, and the shape is general.** jt5-8 changed the dumb brain's *wingbeat* — a
perturbation applied to every dumb bird on every wake. jt9-1 changes only *which wake a promotion
lands on*, and only when a specific state is pending at that instant: measured, **once in 3000
frames across three seeds**. Continuous perturbation versus a single point event. Both are
"determinism-affecting" and the phrase hides the difference completely.

**What to do instead of budgeting:** measure the behavioural delta directly, before touching a
pin. I swept promotion frames before and after and got a one-line answer — `0x2468 proc 514, frame
2688 → 2690`, everything else identical — and could then check that seed's anchors sit at 188/755/900,
all ahead of it. That is five minutes and it replaces a day of expected re-baselining with a fact.

**And report the correction.** A false warning left in the epic gets inherited by every sibling story
that reasons "same subsystem, same blast radius". It is worth a Delivery Finding in its own right.

## GREEN plus "no pins moved" is exactly when to prove the change is LIVE

The same run that vindicated the above is the one that should have worried me: an all-green suite
after a change that was supposed to be disruptive is indistinguishable from a change that does
nothing. So I proved liveness two ways rather than trusting the suite:

1. **Positive:** the promotion sweep shows the one glide-carrying promotion moved by exactly one wake
   and now enters carrying nothing. The gate demonstrably fires.
2. **Differential:** stepping the same demo with the troll in its new ROM position versus its old
   one produced **byte-identical enemy state for 300 frames on three seeds** — so the *other* half
   of the change, the insertion, was NOT observable.

The second is the useful one, and it is a technique worth reusing: **when a change is a repositioning
or a re-ordering, the test is whether the old and new arrangements diverge at all.** If they do not,
you have shipped a correct mechanism nobody can reach, and the suite will never tell you.

## "Make it reachable" can be blocked by a mechanism NOT in your scope — measure the block, don't quietly widen

The user's ruling was "model it AND make it reachable", so I fixed the troll's insertion position to
the ROM's. It is still not reachable, and the reason took one measurement: the troll's victim runs
the dumb brain for **1 frame out of 600** before promoting, and the scheduler promotes BEFORE the
brain steps — so on the one wake its looker would first come due, it is already running a smart
brain whose own looker is one of three this story deliberately does not port.

Two things follow that are worth generalising:

- **Report the gap with its measurement instead of expanding scope to close it.** Porting the other
  three lookers means three different brain STATES and a real determinism risk. Widening unasked
  would have been worse than shipping a documented gap.
- **The measurement changes the follow-up's priority, which is the actual deliverable.** "Three more
  brains have this too" reads as completeness work. "Three more brains are why this one cannot fire"
  is a blocker. Same finding, and only the second one gets picked up.

## Re-STAGE a guard whose fixture your change made unreachable — and the re-staging finds things

jt5-8's AC3 fence constructed a bird promoted mid-glide. jt9-1 makes that state impossible, so the
group failed. Deleting it or re-baselining it to the new output would both have removed a law
silently.

Re-staged instead: the law is now guaranteed structurally (promotion cannot be REACHED with an
obligation pending), so the group asserts that — **plus a control proving the identical bird with the
obligation removed still promotes.** Without the control the fence passes for a bird that could never
promote for any reason at all: a budget typo, a stray guard, a broken fixture.

**The re-staging paid for itself.** Its reference fixture had to gain the new `plavt` field, because
promotion CARRIES it — `LNTSMT` (:3764-3775) writes NSMART, PCHASE and `STX PJOY,U` and nothing else.
Omitting it would have asserted the opposite of the ROM in the very test I was correcting. **When a
re-staged guard suddenly disagrees with your implementation, check the source before "fixing" either
one** — the disagreement is where the new field's real semantics get decided.

---

## Your own mutation battery tests your model of the artifact, not its coverage

cp6-1 GREEN round 1 applied eleven mutations to the real dossier and caught eleven. The
Reviewer then killed it with two mutations that survived — one on `pokeyVoice`, one on the
single cue a `.filter()` excluded from a sweep. Both survivors were fields the author was not
thinking about, which is exactly the set the author's own battery cannot contain.

So pick mutations from **the filter predicates and the fields nothing reads**, not from the
ruling you just wrote. Concretely: list every field of the artifact, cross off the ones a test
names, and mutate what is left. The uncrossed ones are the whole risk. A field can be *correct*
and still be a defect — cp6-1's eleven `pokeyVoice` values were all right, and the wrong ruling
built on top of them shipped anyway, because nothing could contradict them.

## Restore mutations from a `cp` backup when the deliverable is UNCOMMITTED

The obvious restore — `git checkout -- <file>` — reverts to HEAD, and during GREEN, HEAD does
not yet contain the artifact you are mutating. It silently throws the deliverable away and the
next run is green for the wrong reason. `cp` the files to a scratch dir first and restore from
there; run the baseline once before the battery and assert it is green, so a botched restore
fails loudly instead of flattering the next mutation.

## A mutation that "survives" may just be a no-op — grep for the string you changed

Both this story's rounds hit this. Round 1's malformed-linespec mutant edited a string that
appears in the fixture but not in the prose the guard reads. Before recording a survivor,
confirm the mutated bytes are actually in the file the test opens, and that the value you
changed is one the test path reaches. Otherwise you file a coverage gap that does not exist —
or worse, add a test for a hole that was never open.

---

## The sidecar's own warning fired on my first paragraph — a "no label between them" claim is checkable, "the only branch target between them" is not (sw8-19, star-wars, 2026-08-02)

**Situation:** sw8-19's deliverable is half code (one gate) and half PROSE — a comment correcting
an understated ROM claim. The existing entry in this file says: *in a fix round convened to delete
false claims, your own correction prose is the likeliest new false claim.* It fired immediately.

I wrote — in the source comment AND propagated it from TEA's RED header — that `86$` was *"the
only branch target BETWEEN"* `CHSET C$PV` (`WSMAIN.MAC:3846`) and `CHSET C$PS` (`:3930`). `86$` is
at `:3933`. It is **past** the second CHSET, not between them. The sentence was wrong in a story
whose entire purpose was correcting a wrong sentence about those very lines.

**What made it catchable, and it is a general technique:** the false version was a claim about
*which* label sits in a span; the true version is a claim about *how many* — and a count is
enumerable in one command. `awk 'NR>3846 && NR<3930 && /^[0-9]+\$:/'` returns nothing, and
`grep -n '86\$'` returns exactly two lines (the `BNE` at `:3928` and the definition at `:3933`).
The corrected claim is also STRICTLY STRONGER: no label in the span means nothing can branch in,
where "the only branch target is X" invites the reader to check X and stop.

**Rule:** when writing a structural claim about assembler control flow, prefer the form that a
census settles (*"there is no label in this span"*, *"this symbol has exactly N references"*) over
the form that names one item. Then actually run the census. Naming an item is a claim you verified
by looking at that item; a count is a claim you verified by looking at all of them.

## Two mutating/measuring subagents on the SAME working tree race, and the false failure looks exactly like the real one (jt9-3, joust, 2026-08-03)

**Situation:** jt9-3's whole GREEN phase is re-running a mutation battery TEA already ran once —
apply a one-line mutation to `frame.ts`/`demo.ts`, run `npx vitest run --project joust`, revert,
confirm clean. I launched TWO `testing-runner` subagents in the SAME message to save wall-clock
time: one running the battery script (apply → test → revert, ×3, ~4 full suite runs), the other
running a plain `npx vitest run --project joust` + `npm run lint` + `npm run test:orchestrator`
as an independent confirmation.

**What happened:** the second agent's solo vitest run reported 2 failures — `a frame that flaps
AND thuds emits the wing edge first` and the index-ordering test — with the exact symptom of
mutation M3 (`player-wing-down`/`player-thud` swapped). That is not a coincidence: both agents
share ONE git working tree, and the second agent's `npx vitest run` almost certainly executed
while the first agent's driver had M3 applied (source mutated, not yet reverted). The two agents
have no view of each other's state; neither one's prompt said "another agent is mutating the
files you're about to test."

**Catch:** `git status --porcelain` and `git diff --stat`, run AFTER both agents finished, were
both empty — the tree was provably clean by the time I looked. That is inconsistent with a real
regression (a real regression would still be visible with the guard tests present and no mutation
applied) but perfectly consistent with a stale read from mid-mutation. Re-running the same command
ALONE, sequentially, gave clean 104/104 files, 2510/2510 tests — confirming the first report was
a race artifact, not a finding.

**Rule:** never run two subagents that both (a) read or execute against a shared git working tree
and (b) where at least one of them WRITES to tracked source files mid-run (even transiently, even
with a revert at the end), in parallel. A mutation-battery driver that reverts is not "read-only"
for this purpose — there is a window, and any concurrent reader can land inside it. Either run
them sequentially, or give each its own worktree/checkout. When a parallel run DOES produce a
failure that matches a mutation you know is being applied elsewhere, treat "was the tree provably
clean when I read it" as the first question, not "is this a real regression" — check
`git status --porcelain` / `git diff --stat` timing before writing the failure up.

## Rewriting a comment in `src/core` moves citation pins — and citing a single line while quoting a MULTI-line verbatim is the specific way it breaks

Adding ~35 lines of comment to `tie-status.ts` took the tree-wide stale-citation count from 29 to
**32**. The cause was not drift from the insertion: it was that I cited `WSMAIN.MAC:3826` while
quoting `` `CMPD #10` / `LBLE RTS1` `` — and `CMPD #10` is on `:3825`. The comment-citation guard
verifies the quoted verbatim is *inside the cited span*, so a single-line cite under a two-line
quote fails even though both lines are correct and adjacent.

Fix: cite the SPAN you quoted (`:3825-3826`, `:3827-3828`, `:3834-3836`, `:3840-3842`). Check with
`checkCitations(readFileSync(f), {swRoot, romDir})` per file rather than waiting for the tree-wide
ratchet, which tells you a number and not a location. And note the AC-level consequence: a test
demanding the comment name line `3826` is still satisfied by the span `3825-3826`, so widening the
cite costs nothing.

## Re-derive the handoff's ROM claim before writing it into a comment — the comment IS the deliverable

TEA and SM had both measured the four `RTS1` exits. I re-ran the census anyway before writing the
comment, because on this story the comment is not documentation of the change, it is one of the
acceptance criteria. That is what surfaced the `86$` error — which had survived SM's setup, TEA's
RED and the RED's own passing assertions, because every one of those checks asked "is line X what
you say it is?" and none asked "is your sentence about the SPAN true?"

**Generalise:** citation gates verify `file:line` pairs and quoted verbatims. They cannot see a
false relationship asserted BETWEEN two correct citations. When a comment's load-bearing content
is a relationship (before/after, only/no other, reachable/unreachable), that relationship needs
its own explicit check, and no tool in the repo will do it for you.

## A shared helper is why the sibling finding is NOT the same one-line fix

The gun carries the same divergence this story fixed for the sights bit, and the obvious follow-up
is "gate `beamHit` the same way". It is not: `beamHit` is called from the trench and ground phases
too (`sim.ts:1083`, `:1312`, `:1328`), which have no `C_PV` notion at all. The fix there has to be
a caller-side gate on the space arm. Worth writing INTO the finding — a follow-up filed as "do
what sw8-19 did" would send its Dev to the wrong file and the wrong shape.

---

## `export type { X } from './m.js'` does NOT create a local binding — and vitest will not tell you (cp6-2 GREEN, 2026-08-03)

Splitting centipede's SOUNDS manifest out of `audio.ts`, I wrote the re-export pair:
```ts
export { SOUNDS } from './audio-manifest.js'
export type { SoundName } from './audio-manifest.js'
```
`audio.ts` still *names* `SoundName` in four signatures. `export … from` is a pure re-export: it
forwards the name to consumers and creates **nothing** in the local scope, so those four
signatures referenced an undefined type.

**The whole centipede suite was green — 1118/1118 — because vitest does not typecheck.** Only
`npm run lint` (`tsc --noEmit`) caught it, with four `TS2304: Cannot find name 'SoundName'`. And
because the orchestrator suite has a test asserting `tsc --noEmit` exits 0, the failure surfaced
*there* too, one suite removed from the file that caused it.

Fix is to do both: `export type { X } from …` for consumers **and** `import type { X } from …`
for yourself. joust's `audio.ts` already does exactly that (`:72` imports, `:131` re-exports) —
worth copying the shape rather than reasoning about it.

**The generalisable half: on this repo a green vitest says nothing about types.** After any change
to imports, exports or type-only declarations, run `npm run lint` before believing the suite. It is
the only typecheck in the whole release path.

## A predecessor's scope fences can assert that YOUR story has not happened — and their failure messages name you

TEA inverted four cp5 guards that asserted centipede was silent. GREEN then hit **two more**, in a
file TEA had not scanned: `tests/audit/sound-dossier.test.ts` carried cp6-1's `AC-6` block
asserting `plugins/centipede/tools/pokey-bake/` does **not** exist and that `deploy-assets` does
**not** name centipede.

The tell is unmissable once seen — their own failure messages were *"belongs to cp6-2, not cp6-1"*
and *"adding centipede to deploy-assets is cp6-2"*. A story that fences its scope names the story
that lifts the fence, so:

**At GREEN, grep the test tree for your own story id before assuming a red is yours to fix.**
```bash
grep -rn "cp6-2" plugins/<game>/tests/ plugins/<game>/tools/
```
Retire rather than invert when the guard's subject is "the thing does not exist yet" — a guard
reading "the baker exists" belongs to the story that built it, and its real coverage is the baker's
own suite. Keep any sibling guard whose premise survives: cp6-1's third test (its dossier's
truth-in-reporting clause) was untouched, because cp6-2 does not touch the dossier.

## Correcting prose in one place leaves it false in another — grep the CLAIM, not the sentence

Rewrote the README's status block off "playable and **silent**" and the guard still failed. A
second, identically-false claim sat **130 lines further down** in the shared-library section:
"**No samples ship yet** — see the status note above." Same claim, different words, different
section, and the status note it pointed at now said the opposite.

This is the documented wrong-prose rule from the SM side, met from the implementation side. When a
story's deliverable is *making a document true*, the unit of work is the CLAIM, not the paragraph
you were shown. Grep every synonym before declaring it done — and note that the failing test named
the regex that matched, which located the survivor in one command.

## When a transcription is right, the OUTPUT proves it in ways no assertion asked for

Ten of centipede's fourteen cues are transcribed from the ROM's FREQ/CONT tables. After baking, the
four kill cues came out **byte-identical** (same md5) without anything in the baker special-casing
them — because `segmentKill`, `spiderKill`, `fleaKill` and `scorpionKill` all resolve to CHAN0's
single `;EXPLOSION SOUND` table, exactly as cp6-1's dossier ruled from the assembler months of
work earlier.

Nothing asserted that. It is emergent agreement between an independent reading of the ROM (the
dossier) and a mechanical transcription of it (the bake), and it is stronger evidence than any test
I could have written — a hand-tuned "explosion" per creature would have produced four different
files and passed every check in the suite. **When implementing from primary source, look for
coincidences the spec did not demand; they are the cheapest fidelity signal available.**

---

### Re-running a fully-measured TEA battery still needs its OWN backup file — `git checkout --` reverts to the wrong state when the refactor isn't committed yet

**Situation:** GREEN work where TEA hands you an exact diff already measured against 19 mutants,
reverted, and pasted verbatim into the session file (jt9-4). The mechanical task looks like:
apply diff, confirm green, re-run the battery yourself, revert each mutant, move on.

**Problem:** My first draft of the battery driver reverted each mutant with `git checkout -- <file>`
— which is correct ONLY once the refactor itself is committed. Applied but uncommitted, `git
checkout --` resets the file to HEAD, i.e. the pre-refactor RED state, silently undoing the entire
diff on the very first mutant's cleanup. Caught it before running (the revert target is "the state I
just verified GREEN", not "whatever git last saw"), not after.

**Prevention:** When mutating a file that is itself part of an uncommitted change, snapshot the
CURRENT working-tree content to a scratch file first (`cp file backup`) and restore from THAT on
every iteration, never from git, until the base change is committed. Only reach for `git checkout --`
once the file you're mutating against is itself the committed baseline.

**Also confirmed independently:** TEA's own flagged weak spot was real and reproducible — a mutant
that deletes the `outDir.length === 0` clause (M7) writes every baked `.wav` into the repo ROOT
(`join('', name)` is relative, and vitest's cwd is the repo root, not the plugin), which
`audio-seam-scope.test.ts` never walks. Re-running the battery reproduced all eighteen stray files
exactly as TEA described. **After ANY mutation battery that touches a bake/file-write path, `ls
*.wav` (or the equivalent stray-artifact check) at the repo root before running `git status` and
before committing** — a clean `git status --porcelain` on the SOURCE file says nothing about
untracked binaries the battery may have dropped elsewhere.

**On the in-story judgment call (keep or drop a one-line hardening beyond spec):** the spec said "no
production behaviour change"; the diff added `Object.hasOwn` guarding a real prototype-bracket-read
bug (a manifest cue named `toString` bypassing the missing-spec gate and mis-firing the duration
gate instead) that the repo's own `lang-review/javascript.md` check 3 names. Ruled to KEEP it: one
line, fixes a real misdiagnosis directly on the exact lookup the story's own refactor touches, has a
dedicated test already measured RED→GREEN by the mutation that removes it (M9), and "no behaviour
change" was clearly scoped at "don't redesign the throws," not "leave a known misdiagnosis in the
one function this story is opening up." State the ruling explicitly in the assessment either way —
it is cheap for the Reviewer to overturn a stated ruling and expensive for them to notice an
unstated one.
