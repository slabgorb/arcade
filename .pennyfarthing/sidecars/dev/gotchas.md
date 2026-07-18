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
