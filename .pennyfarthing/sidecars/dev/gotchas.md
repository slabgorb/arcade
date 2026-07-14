# Dev Gotchas

Common pitfalls encountered during Dev (GREEN / implementation) work.

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
