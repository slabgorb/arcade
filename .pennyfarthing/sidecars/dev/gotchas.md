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
