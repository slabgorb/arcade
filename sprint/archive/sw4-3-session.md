---
story_id: "sw4-3"
jira_key: ""
epic: "sw4"
workflow: "tdd"
---
# Story sw4-3: Surface maze port

## Story Details
- **ID:** sw4-3
- **Jira Key:** (none — no Jira integration)
- **Workflow:** tdd
- **Stack Parent:** none (independent story)
- **Repo:** star-wars
- **Branch Strategy:** gitflow (feat/sw4-3-surface-maze-port)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-12T10:22:05Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-12T08:11:36Z | 2026-07-12T08:14:21Z | 2m 45s |
| red | 2026-07-12T08:14:21Z | 2026-07-12T08:54:40Z | 40m 19s |
| green | 2026-07-12T08:54:40Z | 2026-07-12T09:20:54Z | 26m 14s |
| review | 2026-07-12T09:20:54Z | 2026-07-12T09:35:08Z | 14m 14s |
| red | 2026-07-12T09:35:08Z | 2026-07-12T09:44:29Z | 9m 21s |
| green | 2026-07-12T09:44:29Z | 2026-07-12T09:56:05Z | 11m 36s |
| review | 2026-07-12T09:56:05Z | 2026-07-12T10:22:05Z | 26m |
| finish | 2026-07-12T10:22:05Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

### TEA (test design)

- **Conflict** (blocking — RESOLVED): the disasm's `byte_98CB` surface quota (sw3-3: 22,22,32,…,50) and the original source's per-maze `TTWRS` counts (0,16,16,20,…,32) are genuinely different tables and cannot coexist for a finite single-pass maze. Resolved by user ratification 2026-07-12 ("Maze wins (authentic)"); see Design Deviations → TEA #1. Affects `src/core/state.ts` (`towersForWave` → maze-derived) and `src/core/sim.ts` (`stepSurface` single-pass field). *Found by TEA during test design.*
- **Gap** (non-blocking): the clone↔ROM wave→maze offset is a Dev decision. The clone has a wave-1 surface phase but the ROM ground table starts at wave 2 (`BUNK`). **Constraint:** the default surface-test wave (wave 1, used by `surface-towers.test.ts` sw2-3 and `surface-bunkers.test.ts` sw3-11 to *observe* the spawner raising towers+bunkers) must map to a MIXED maze — both towers AND bunkers, `towerCount > 4` — NOT `BUNK` (0 towers) or `TWRCTY` (0 bunkers), or those sibling spawn-observation tests break. Affects `src/core/sim.ts` (phase-entry maze placement) + `src/core/surfaceMazes.ts` (`mazeForWave`). *Found by TEA during test design.*
- **Question** (non-blocking): spec §C says "wave 2 → TBUNK bunkers-only," which collides with the wave-1 sibling constraint above. Dev must reconcile the spec's wave-2=BUNK intent with the clone's 1-based wave numbering; the all-bunker `BUNK` maze exists in the registry, but where it lands in the clone's wave sequence is the mapping decision. *Found by TEA during test design.*
- **Improvement** (non-blocking): surface scroll speed must be re-derived (spec §C: "re-derived on the same PROVISIONAL `TICK_HZ` basis"). The maze reaches Y=$8000 (32768); today's `TURRET_SCROLL_SPEED=600` takes ~55s to scroll a full field. PROVISIONAL / playtest-tuned — deliberately NOT unit-tested (spec §D). Affects `src/core/state.ts` (`TURRET_SCROLL_SPEED`). *Found by TEA during test design.*
- **Gap** (non-blocking): the coordinate transcription itself (239 distinct coords / 316 entries) is intentionally NOT value-pinned (clone-safe convention). The structural cross-checks (per-maze TTWRS counts, radix-multiple-of-$400 guard, clamp cube, base⊂extended prefix, +4 append) catch dropped/added/mis-radixed entries, but a single in-grid coordinate swap would pass — the **Reviewer must independently full-diff `surfaceMazes.ts` against `~/Projects/star-wars-1983-source-text/WSGRND.MAC`**. *Found by TEA during test design.*

### Dev (implementation)

- **Question** (non-blocking): the wave-2 bunker maze (`BUNK`) has 0 towers, so `towersForWave(2) = 0` and the surface **insta-clears on entry** — the phase quota is met at 0 kills, dropping straight to the trench and banking the 50,000 cleared-all bonus for free. The ROM's clear condition for the all-bunker wave is unverified (likely scroll-completion, not tower-count). Reachable only at clone wave 2 (BUNK is not in the deep-wave wrap set), so once per game. Recommend a follow-up: give the bunker wave a scroll-completion clear and reconsider the free bonus. Affects `src/core/sim.ts` (`phaseQuota`/`progress`). Out of sw4-3's placement scope. *Found by Dev during implementation.*
- **Improvement** (non-blocking): the surface scroll speed (`TURRET_SCROLL_SPEED = 600`) is unchanged, but the authored field now reaches Y=$8000 — with the SPAWN_DISTANCE lead-in the far edge sits ~34,000 units out, ~57 s to fully transit at 600 u/s. The spec's PROVISIONAL scroll re-derivation (spec §C/§D) is deferred to playtest tuning. Affects `src/core/state.ts` (`TURRET_SCROLL_SPEED`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): surface tower fire now originates from the authored positions, and the whole field is present from lay-time, so a *far* tower (deep −Z) can be the random fire pick and launch a straight-line fireball that may never reach the cockpit. Fire behavior (aim/cadence/range) is explicitly out of sw4-3 scope (placement only); a future fire-range gate could restrict shooters to the near band if playtest wants it. Affects `src/core/sim.ts` (`stepSurface` fire block). *Found by Dev during implementation.*
- No blocking upstream findings — the maze data, the maze-derived quota, and the authored field all landed as TEA specified; the full suite is green.

### Dev (implementation — rework r1)

- **Improvement** (non-blocking): the PROVISIONAL scroll speed now sets the surface phase's LENGTH, and it is long. With `TURRET_SCROLL_SPEED = 600` the scroll-completion exit takes **~50 s of no-fire flight** (measured: wave 1/5/7/20/26 → 49.8 s; wave 2 BUNK → 53.2 s, its field being the deepest at y=30720). That is the worst case — a player who shoots the towers clears early — but it is the floor for a passive/struggling run, and it is longer than the arcade surface felt. This upgrades the round-1 "provisional scroll speed" finding from cosmetic to a **playtest-tuning priority**: raising `TURRET_SCROLL_SPEED` is now the single knob for surface phase duration. Affects `src/core/state.ts` (`TURRET_SCROLL_SPEED`). *Found by Dev during rework implementation.*
- **Gap** (non-blocking): the wave-2 bunker wave (BUNK, 0 towers) is now a pure fly-through — 53 s of bunkers that are shootable, quota-neutral, and non-firing (sw3-11), with no clear objective and no bonus available. Mechanically correct and no longer a free 50,000, but it may play as dead air. Whether the ROM's bunkers fire (and whether the wave carries some other objective) is the open question sw3-11 already logged. Affects `src/core/sim.ts` (`stepSurface` fire block) — worth a look during the sw4 playtest. *Found by Dev during rework implementation.*
- **Improvement** (non-blocking): `progress`'s clear condition is now a boolean predicate (`phaseCleared`) rather than a kill quota (`phaseQuota`), because the surface no longer clears by count. Nothing outside `progress` consumed `phaseQuota` (grep-verified), so this is internal — but any future HUD that wants to show "towers remaining" should read `towersForWave(wave) - phaseKills` directly and must NOT present it as the exit condition, since it no longer is. Affects `src/core/sim.ts`. *Found by Dev during rework implementation.*

### Reviewer (code review)

- **Conflict** (blocking): the finite authored field + the unchanged `phaseKills >= towersForWave` clear gate makes the surface **soft-lock** — a player who misses any tower can never reach the quota and is trapped (only escape is a forced game-over). Empirically proven: flying wave 1's surface 300 s without firing, the whole field scrolled past and `phase` stayed `surface`. Affects `src/core/sim.ts` (`progress`/`phaseQuota` need a scroll-completion clear; the 50k bonus should gate on all-towers-actually-killed) and the surface tests (need a "field passes → still clears" regression). *Found by Reviewer during code review.*
- **Gap** (blocking): the story's central contracts are under-tested — the reconcile assertion is a tautology, no test binds a wave NUMBER to a maze NAME, and placement is only checked as a subset/ceiling (never that the FULL field is laid). A partial-field or off-by-one-mapping bug passes all 93 touched tests (subagent-verified by injection). Affects `tests/core/surface-maze-field.test.ts` + `tests/core/surface-tower-quota.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): stale comments/names — `phaseQuota` still cites "authentic ROM `byte_98CB`" (now maze-derived); `surface-tower-quota.test.ts` names/comments still say "22-tower"/"22nd tower" (wave 1 is now SQUARE=16); `surface.test.ts` "turrets rise on a timed schedule" no longer describes the one-shot field. Affects `src/core/sim.ts`, `tests/core/surface-tower-quota.test.ts`, `tests/core/surface.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `mazeForWave(NaN|Infinity)` returns `undefined` typed as `SurfaceMaze`; callers deref it unguarded. Latent (no path produces a non-finite `wave`) and NOT a new regression (the old `byte_98CB` clamp shared the failure mode), but a cheap `Number.isFinite` guard would harden it if `wave` is ever loaded from saved state. Affects `src/core/surfaceMazes.ts`. *Found by Reviewer during code review.*

### Reviewer (code review — rework r1)

- **Gap** (non-blocking, MEDIUM): the surface clear DISTANCE is not bound to the maze's actual depth by any test. `surfaceFieldDepth` is the entire mechanism that resolves my round-1 soft-lock, yet a wave-BLIND implementation passes the whole suite: I replaced `deepest + SPAWN_DISTANCE` with `deepest` (dropping the lead-in) → 878/878 still pass; reviewer-test-analyzer independently replaced the function body with a hardcoded `return 34000`, and separately replaced the whole surface branch with a flat `s.surfaceScrollZ >= 20000` timer → 878/878 pass in both cases. The clear is currently pinned only as "eventually reaches the trench on a generous budget," never as "clears when THIS wave's field has passed." The soft-lock itself IS guarded (a never-clearing depth such as `Infinity` fails the suite), so this is a precision gap, not a lock risk. Affects `tests/core/surface-clear.test.ts` (needs a pin tying clear distance to maze depth — e.g. two waves with different deepest-Y must clear at different, maze-proportional `surfaceScrollZ`, or a direct boundary assertion at `surfaceFieldDepth(w) ± ε`). *Found by Reviewer during code review (corroborated by reviewer-test-analyzer, high confidence).*
- **Improvement** (non-blocking, MEDIUM): the placement transform is duplicated — `mazeField` (`sim.ts:990`) places at `z = -(e.y + SPAWN_DISTANCE)` while `surfaceFieldDepth` (`sim.ts:816`) re-derives `deepest + SPAWN_DISTANCE`. These MUST stay in sync or the surface ends early/late, and nothing enforces it. This is the root cause of the gap above. Affects `src/core/sim.ts` + `src/core/surfaceMazes.ts` (single source of truth — e.g. precompute `maxDepth` on `SurfaceMaze` the way `towerCount` already is, and/or a shared `fieldZ(y)` helper both call). *Found by Reviewer during code review.*
- **Gap** (non-blocking, LOW): the scenario the fix's own comment warns about is untested — "shoot every bunker on wave 2 EARLY, well before the scroll completes, and the surface must NOT clear." Every wave-2 test flies with `NO_INPUT`, so `turrets` only ever empties by scroll-culling, which coincidentally matches the depth check. The behavior is correct (I verified by hand), but the guard rests on tests that catch the `turrets.length` alternative only incidentally. Affects `tests/core/surface-clear.test.ts`. *Found by reviewer-test-analyzer, confirmed by Reviewer.*
- **Gap** (non-blocking, LOW): no test exercises `mazeForWave(NaN)` / `mazeForWave(Infinity)` — the exact scenario the fix's commit message cites ("a future deserialized save"). Correctness was verified by inspection and by reviewer-security's exhaustive input trace, not by a shipped test. Affects `tests/core/surface-maze-field.test.ts`. *Found by reviewer-rule-checker, confirmed by Reviewer.*
- **Improvement** (non-blocking, LOW): `surface-tower-quota.test.ts` fixtures set `turrets: []` intending "no ground objects," but the auto-lay heuristic treats an empty array as "not hand-placed" and silently refills the FULL wave maze on the next frame. Harmless today (those assertions only read `phaseKills`), but the fixture's stated intent is false at runtime and will mislead the next editor. Affects `tests/core/surface-tower-quota.test.ts`. *Found by reviewer-test-analyzer, confirmed by Reviewer.*
- **Improvement** (non-blocking, LOW): `surfaceFieldDepth`'s `let deepest = 0` silently yields `SPAWN_DISTANCE` for a hypothetical zero-entry maze (a ~2 s surface). Unreachable with the current static data (all 19 mazes carry 28–32 entries, and `orderMazes` throws on a missing maze), but it fails soft where this file otherwise fails loud. Affects `src/core/sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reconciliation Decision: sw3-3 towers-remaining quota vs mazes TTWRS

**Deviation:** spec §C authorizes maze data to win in case of disagreement with sw3-3's `byte_98CB` quota.

**Reasoning:** The hand-authored WSGRND.MAC mazes represent the canonical tower layout per wave. If `byte_98CB` counts diverge from the TTWRS maze counts for a given wave, the maze-data placement is authoritative. This reconciliation is an in-story decision to be finalized during green phase.

**Impact:** Documentation only; actual tower placement will follow maze data, not quota.

### TEA (test design)

- **Maze-derived clear quota supersedes sw3-3 `byte_98CB`**
  - Spec source: context-epic-sw4.md "Reconcile flag (sw4-3)"; spec §C "Flagged reconcile"
  - Spec text: "sw3-3's `byte_98CB` towers-remaining quota vs the mazes' `TTWRS` counts. If they disagree for a wave, **maze data wins for placement**; the quota reconciliation is an in-story decision, documented as a deviation."
  - Implementation: the surface clear quota (`towersForWave`) is re-defined as the placed maze's own tower count (`mazeForWave(wave).towerCount`), superseding the byte_98CB values (22–50). RED re-seats `surface-tower-quota.test.ts`: the byte_98CB value pins are removed; the clear-mechanic and 50,000-bonus coverage is re-keyed to the opaque maze-derived quota.
  - Rationale: the original Atari source (WSGRND.MAC — `IGRND` seeds "# OF TOWERS LEFT" from `.TWRS`) outranks the disasm (`byte_98CB`) per star-wars/CLAUDE.md, and a finite single-pass maze of N towers cannot satisfy a larger byte_98CB target without soft-locking. **User-ratified 2026-07-12** ("Maze wins (authentic)").
  - Severity: major
  - Forward impact: Dev makes `towersForWave` maze-derived and the surface field single-pass; Reviewer confirms no sibling still depends on the byte_98CB values (grep: only `surface-tower-quota` pinned them; other callers use the quota opaquely).

- **Structural (not value-exhaustive) coordinate tests**
  - Spec source: spec §D "Testing"; `reviewer-diff-transcription-vs-rom` convention
  - Spec text: "Mazes: structural — entry counts match `TTWRS` per maze; coordinates within the clamp cube; every wave maps to a maze; prefix invariant (base list ⊂ extended list)."
  - Implementation: tests pin structural invariants + the ROM-declared count golden, but not the full 239-coordinate transcription.
  - Rationale: pinning every coordinate would duplicate the transcription (a shared transcription error would pass); §D specifies structural tests; the Reviewer full-diffs the coordinates against the ROM.
  - Severity: minor
  - Forward impact: Reviewer independently diffs `surfaceMazes.ts` coordinates against WSGRND.MAC.

- **`MazeEntry` stores source-frame `{x, y}`, not pre-transformed `{x, z}`**
  - Spec source: spec §C
  - Spec text: "entries `{ x, y, kind, typeDigit }`. Source coordinate frame is top-view X ±right, Y forward (hex) → our X lateral, −Z depth, unscaled."
  - Implementation: tests assume `MazeEntry` carries the raw source `{x (lateral), y (forward ≥ 0)}`; the sim maps `y → −Z` at placement.
  - Rationale: keeps the data a faithful 1:1 transcription of the source frame; the source→sim axis map is a placement concern, not baked into the data.
  - Severity: minor
  - Forward impact: Dev's placement code owns the `y → −Z` (and unscaled `x → x`) mapping.

- **Rework r1 — surface clears by scroll-completion, not tower-count alone (fixes the Reviewer soft-lock)**
  - Spec source: Reviewer REJECT (round-trip 1); WSGRND `sub_973A` / ROM surface model
  - Spec text: the ROM surface is a scroll-completion approach; clearing all towers is the 50k "cleared all towers" BONUS + an early clear, not the sole exit.
  - Implementation: RED rework `surface-clear.test.ts` pins the corrected contract — the surface clears even when towers are missed (scroll-completion); the 50k fires only when all towers are killed; wave 2 (0 towers) does not insta-clear or bank a free bonus. This supersedes round-1's implicit "clear iff `phaseKills >= towerCount`" (which soft-locked the finite field). GREEN implements a scroll-completion surface→trench exit + bonus gating.
  - Rationale: a finite field with a kill-count-only gate is unwinnable on any missed tower (Reviewer proved the soft-lock). Scroll-completion is the authentic and non-locking model.
  - Severity: major (corrects a blocking gameplay regression)
  - Forward impact: Dev changes `sim.ts` `progress`/`phaseQuota` (add scroll-completion clear; gate the 50k on all-towers-killed with `towerCount > 0`); the round-1 quota-crossing tests still hold for the full-clear/early path.

### Dev (implementation)

- **Authored field laid on the first surface step, gated by a "no hand-placed turrets" heuristic**
  - Spec source: spec §C ("the maze is a fixed field ... entities are not spawned one-by-one; they become visible ... as the scroll brings them into range")
  - Spec text: "replace the random turret spawn timer with maze-driven placement — the maze is a fixed field laid out at its authored coordinates; the whole field translates toward the cockpit with the existing surface scroll."
  - Implementation: `stepSurface` lays the WHOLE `mazeForWave(wave)` field into `turrets` on the first surface frame (guarded by the new `surfaceMazeLaid` flag), then the existing scroll/cull machinery translates it in and drops each object as it sweeps past. The lay is skipped when `turrets` is already non-empty, so hand-placed test/save fixtures are respected.
  - Rationale: laying the whole field at once (vs emitting row-by-row) reuses the tested scroll/cull path and keeps the field's authored 2D geometry intact; the "skip if non-empty" gate preserves every sibling suite that hand-places turrets (surface collision tests, sw3-11 quota fixtures) without re-seating them.
  - Severity: minor
  - Forward impact: a save/fixture that enters the surface with pre-placed turrets keeps them (no maze injected); the maze re-lays per wave via `enterPhase`.

- **Field depth uses a constant SPAWN_DISTANCE lead-in: z = −(y + SPAWN_DISTANCE)**
  - Spec source: spec §C
  - Spec text: "Source ... Y forward (hex) → our −Z depth, unscaled."
  - Implementation: an entry at authored depth `y` is placed at world `z = −(y + SPAWN_DISTANCE)`. The `−y` is unscaled per spec; the added `SPAWN_DISTANCE` is a constant lead so the nearest row (y=0) enters from the same spawn horizon the turrets always rose at, rather than sitting on the cockpit.
  - Rationale: a constant offset preserves the maze's relative depth spacing exactly (all rows share the shift) while keeping y=0 rows from being culled instantly at z≥0.
  - Severity: minor
  - Forward impact: the absolute field depth is offset by SPAWN_DISTANCE; transit time is governed by the (provisional) scroll speed.

- **Re-seated sibling `surface.test.ts` MAX_TURRETS-cap test; removed the now-dead spawner constants**
  - Spec source: sibling AC — `surface.test.ts` (story 8-4), "never puts more than MAX_TURRETS on the surface at once"
  - Spec text: asserted `turrets.length <= MAX_TURRETS` (the old random spawner's on-screen cap of 4)
  - Implementation: sw4-3 replaces the capped random spawner with the wave's fixed authored field, which has no on-screen cap — the whole maze is present. Re-seated the assertion to `turrets.length <= mazeForWave(wave).entries.length` (finite-field bound) and removed the now-unreferenced `MAX_TURRETS`, `SPAWN_SPREAD`, and `BUNKER_SPAWN_CHANCE` constants.
  - Rationale: the capped-spawner contract is the exact mechanism this story removes (gotcha: tightening/replacing a shared mechanism breaks sibling assertions); the finite-field bound preserves the test's intent (the surface never floods with unbounded objects).
  - Severity: minor (edits a merged 8-4 test's assertion + drops three constants)
  - Forward impact: nothing imports the removed constants (verified by grep); `TURRET_SPAWN_INTERVAL` is retained (surface `spawnTimer` seed + suite step-size unit).

### Dev (implementation — rework r1)

- **Scroll-completion is measured from the MAZE DATA (`surfaceScrollZ` vs the field's deepest row), not from the live `turrets` array**
  - Spec source: TEA rework deviation "surface clears by scroll-completion"; `tests/core/surface-clear.test.ts`
  - Spec text: "implement the scroll-completion surface→trench clear (advance when the laid field has fully passed)"
  - Implementation: `phaseCleared` (replacing `phaseQuota`) clears the surface when `allTowersKilled(s) || s.surfaceScrollZ >= surfaceFieldDepth(s.wave)`, where `surfaceFieldDepth` = the wave maze's deepest authored `y` + `SPAWN_DISTANCE`. The obvious alternative — "the field has passed when `turrets` is empty" — was rejected.
  - Rationale: `turrets` empties on KILLS too, so an empty-array test would let a good player's last kill be read as "the field passed" and would clear the bunkers-only wave the moment its 28 bunkers were shot — re-introducing a free exit and coupling the clear to the cull order. `surfaceScrollZ` accumulates at exactly the rate the turrets advance (`TURRET_SCROLL_SPEED·dt`, story 11-5), so it measures the SCROLL alone: shooting objects down cannot make the field end early, and a missed tower cannot make it never end.
  - Severity: minor
  - Forward impact: the surface phase's max duration is now governed by the (PROVISIONAL) scroll speed — ~50 s of no-fire flight (see Delivery Findings). A surface fixture that hand-places turrets still clears on the wave maze's depth, not on its own placements.

- **Re-seated the merged sw3-5 wave-2 music-cue fixture onto the scroll-completion exit**
  - Spec source: sibling AC — `tests/core/music-cue.test.ts` (sw3-5), AC4 "no run-two-silent regression"
  - Spec text: staged the wave-2 surface→trench edge as `playing({ phase: 'surface', phaseKills: towersForWave(2), wave: 2 })`
  - Implementation: re-seated to `playing({ phase: 'surface', surfaceScrollZ: 100_000, wave: 2 })`; the assertions (phase → trench, music cue contains 'trench') are untouched.
  - Rationale: wave 2's maze is BUNK — ZERO towers — so `phaseKills: towersForWave(2)` is `0`, and the fixture was crossing the edge via the exact insta-clear defect this rework removes. Its INTENT is the music cue on a second run's surface→trench edge, not the clear mechanism; wave 2's authentic exit is scroll-completion, so the fixture now stages that. (Predicted by the Dev sidecar gotcha: "tightening a shared game mechanism breaks sibling test FIXTURES" — grepped all of `tests/` for `towersForWave`/`surfaceScrollZ` staging; every other fixture uses waves 1/3, whose towers>0 early-clear path is byte-for-byte unchanged, and the full suite confirms this was the only one.)
  - Severity: minor (edits a merged sw3-5 test's fixture; assertions preserved)
  - Forward impact: none — the only fixture in the suite that depended on a 0-tower wave insta-clearing.

- **Added the `Number.isFinite` guard to `mazeForWave` (Reviewer LOW; not test-driven)**
  - Spec source: Reviewer REJECT, LOW finding; TEA rework handoff ("optionally a `Number.isFinite` guard in `mazeForWave` (latent)")
  - Spec text: "`mazeForWave(NaN|Infinity)` returns `undefined` typed as `SurfaceMaze`; callers deref it unguarded."
  - Implementation: the clamp became `Number.isFinite(wave) && wave >= 1 ? Math.floor(wave) : 1`, so a non-finite wave falls back to wave 1 instead of indexing out of the table.
  - Rationale: the return type promises a `SurfaceMaze`; honoring that for every input is a one-expression change with no behavior change on any reachable path (no test drives it — logged here because it is scope beyond the failing tests, taken only because the Reviewer named it).
  - Severity: minor
  - Forward impact: a future save/load that deserializes `wave` can no longer hard-crash on `undefined.entries`.

### Reviewer (audit)

- **TEA #1 (maze-derived quota supersedes byte_98CB)** → ✓ ACCEPTED: sound and user-ratified; original source outranks the disasm. BUT the *test* that pins it is a tautology (`towersForWave(wave) === mazeForWave(wave).towerCount` — `towersForWave` IS that expression), so the reconcile is asserted but not actually verified against concrete values or the wave→maze binding. Flagged as a test finding, not a deviation reversal.
- **TEA #2 (structural, not value-exhaustive coordinate tests)** → ✓ ACCEPTED: correct convention, and I discharged the Reviewer's half of it — independently full-diffed all 568 base+extended coordinates in the runtime `SURFACE_MAZES` against `WSGRND.MAC`; every coordinate matches (evidence below).
- **TEA #3 (`MazeEntry` stores source-frame {x,y})** → ✓ ACCEPTED: faithful to spec §C; the `y → −Z` map lives in `mazeField`.
- **Dev #1 (field laid on first surface step, gated by "no hand-placed turrets")** → ✓ ACCEPTED: a clever seam that preserved every hand-placed sibling fixture; verified the heuristic in `stepSurface`.
- **Dev #2 (`z = −(y + SPAWN_DISTANCE)` lead-in)** → ✓ ACCEPTED: constant offset preserves relative depth; unscaled per spec.
- **Dev #3 (re-seated MAX_TURRETS test + removed dead constants)** → ✓ ACCEPTED: the cap is exactly the mechanism this story removes; grep-confirmed no remaining importers of the dropped constants.
- **UNDOCUMENTED (Reviewer-found):** the surface **clear condition** was NOT reconciled with the finite field. Spec/ROM: the surface is a scroll-completion approach (you reach the trench when the field passes; clearing all towers is the 50k BONUS, not the gate). Code: the only surface→trench exit is `phaseKills >= towersForWave` (`sim.ts` `progress`/`phaseQuota`). With the new **finite** field, missing any tower makes the quota permanently unreachable → **the surface soft-locks** (empirically proven — see the assessment). Severity: HIGH. This is the blocking finding; the wave-2 insta-clear Dev logged is the same root cause (0-tower quota → the gate fires at entry).

### Reviewer (audit — rework r1)

- **Dev rework #1 (scroll-completion measured from the MAZE DATA, not `turrets.length`)** → ✓ ACCEPTED: not just accepted — INJECTION-VERIFIED. I swapped the surface exit to Dev's rejected alternative (`allTowersKilled(s) || (s.surfaceMazeLaid && s.turrets.length === 0)`) and it fails 6 tests. Dev's stated reason (the array empties on kills too, re-opening a free exit on the bunkers-only wave) is sound and the suite now agrees.
- **Dev rework #2 (re-seated the merged sw3-5 wave-2 music-cue fixture onto `surfaceScrollZ`)** → ✓ ACCEPTED: this is the deviation I scrutinised hardest — a Dev editing a merged sibling test to make his own change pass is the classic way a regression gets laundered. It is legitimate. The two assertions (`phase` → `'trench'`, `musicTracks` contains `'trench'`) are byte-identical to before; only the fixture's staging changed. The old fixture crossed the edge via `phaseKills: towersForWave(2)` — which is `0` — i.e. it was riding the very insta-clear defect being fixed, so it could not survive the fix by any honest means. `surfaceScrollZ: 100_000` genuinely exceeds `surfaceFieldDepth(2)` (BUNK: 30720 + 1200 = 31920), so the frame is a real scroll-completion edge, and the magic number fails LOUDLY (not vacuously) if a future maze ever runs deeper. Independently corroborated by reviewer-test-analyzer, which mutation-tested the re-seated test and confirmed it still discriminates a real bug.
- **Dev rework #3 (`Number.isFinite` guard in `mazeForWave`)** → ✓ ACCEPTED: reviewer-security exhaustively traced NaN, ±Infinity, −0, 0, 0.5, 1.5, −5, `MAX_SAFE_INTEGER`, and 1e308 through the new clamp — every one now yields a real `SurfaceMaze` with an in-range index. My round-1 LOW is closed. (LOW carried forward: no test pins it — see findings.)
- **UNDOCUMENTED (Reviewer-found):** the placement transform is now written TWICE. `mazeField` places each entry at `z = -(e.y + SPAWN_DISTANCE)` (`sim.ts:990`) and `surfaceFieldDepth` independently re-derives the same offset as `deepest + SPAWN_DISTANCE` (`sim.ts:816`) — 174 lines apart, with no single source of truth and NO test binding them. Change the lead-in in one place and the surface silently ends early or late. Not logged by Dev. Severity: MEDIUM (the shipped values agree, so there is no defect today — this is a latent coupling + the root cause of the [TEST] gap below).

## Sm Assessment

**Setup Status:** Complete

- Session file created at `.session/sw4-3-session.md`
- Story context generated at `sprint/context/context-story-sw4-3.md` (epic context preserved)
- Workflow permissions: tdd workflow has no special permissions
- No Jira integration for this story
- Feature branch ready to be created: `feat/sw4-3-surface-maze-port` (off develop in star-wars)

**Next Phase:** red (TEA agent)

## TEA Assessment

**Tests Required:** Yes
**Reason:** Pure-data transcription with EXACT geometry + a sim behavior change (spec §D mandates structural maze tests).

**Test Files:**
- `tests/core/surface-mazes.test.ts` (NEW) — the `surfaceMazes.ts` pure-data registry: registry shape, kind↔typeDigit map, per-maze `TTWRS` count cross-check (ROM golden), 0x400 hex-radix guard, clamp cube, bunker quota-neutrality, bishop counts, base⊂extended prefix invariant (+4 append), immutable-singleton.
- `tests/core/surface-maze-field.test.ts` (NEW) — sim integration: `mazeForWave` total+pure, maze-derived clear quota (reconcile), authored-not-random placement (seed-invariant field), turrets only at authored lateral coords, finite (non-endless) field, bishop rides the tower collision/quota path.
- `tests/core/surface-tower-quota.test.ts` (RE-SEATED) — sw3-3's byte_98CB value pins removed and replaced with the maze-derived contract; clear-mechanic + 50,000-bonus coverage preserved (opaque quota).

**Tests Written:** 3 files (2 new suites + 1 re-seat) covering ACs 1–6; AC7 (reconcile) documented as a deviation; AC8 (green build) is the GREEN gate.
**Status:** RED — full suite 801 pass / 0 fail; the 3 sw4-3 files load-fail on the not-yet-written `src/core/surfaceMazes` module (this repo's standard "symbols GREEN adds" RED convention, as sw2-3/sw3-3 used). No collateral: the other 78 test files stay green.

### Rule Coverage (lang-review/typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 readonly / immutable data | `the maze registry is stable, immutable data` (singleton identity) | failing (module absent) |
| #3 union ↔ discriminant consistency | `consistent kind↔typeDigit map`; bishop/bunker/tower coverage | failing |
| #4 undefined handling | `getMaze is undefined for a non-name, not a throw` | failing |
| #8 test quality (no vacuous) | `extended coordinates genuinely differ from base tail` guards a vacuous prefix; determinism pin asserts non-empty field | failing |

**Rules checked:** 4 of the applicable lang-review rules for a pure-data/deterministic-sim TS module have test coverage (React/async/security/enum-runtime rules are N/A to this core).
**Self-check:** 0 vacuous tests — every `it` asserts a concrete value; the seed-invariance test guards against a vacuous empty-field pass with an explicit `sawField` non-emptiness assertion.

**Handoff:** To Dev (The Word Burgers) for GREEN — implement `src/core/surfaceMazes.ts` (transcribe WSGRND.MAC), extend `Turret.kind` with `'bishop'`, make `towersForWave` maze-derived, and replace the random turret spawner in `stepSurface` with the fixed authored field. Honor the wave→maze mapping constraint in Delivery Findings (wave-1 maze must be mixed).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/surfaceMazes.ts` (NEW) — pure-data transcription of WSGRND.MAC TOWER MAZES: 19 mazes in TGDPTR order, `MazeEntry {x,y,kind,typeDigit}`, prefix-encoded base/extended families (one list + base length), `SURFACE_MAZES`, `getMaze`, and `mazeForWave` (ROM wave map: wave 1 → SQUARE intro, 2..20 ROM order, ≥21 wrap the last six).
- `src/core/state.ts` — `Turret.kind` gains `'bishop'`; `towersForWave` is now `mazeForWave(wave).towerCount` (TTWRS), superseding the byte_98CB table; added `surfaceMazeLaid` (GameState + initialState); removed the now-dead random-spawn constants `MAX_TURRETS`, `SPAWN_SPREAD`, `BUNKER_SPAWN_CHANCE`.
- `src/core/sim.ts` — `stepSurface` lays the wave's authored maze once (skipped if turrets were hand-placed) and scrolls it in as a finite single-pass field, replacing `spawnTurret`; `enterPhase` resets `surfaceMazeLaid` per wave; new `mazeField(wave)` helper; import cleanup.
- `tests/core/surface.test.ts` — re-seated the MAX_TURRETS-cap test to the finite-field bound (`<= mazeForWave(wave).entries.length`).

**Tests:** 877/877 passing (GREEN). `tsc --noEmit` + `vite build` clean.
**End-to-end drive:** entered space→surface at waves 1/2/7 — wave 1 lays SQUARE (16 towers + 12 bunkers), wave 7 lays DIFF (17 towers + 8 bunkers + 3 bishops), all at authored X coordinates, byte-identical across RNG seeds. Wave 2 (BUNK, 0 towers) insta-clears — logged as a Delivery Finding.

**Branch:** `feat/sw4-3-surface-maze-port` (pushed to origin).

**Handoff:** To Reviewer (Immortan Joe) — note the Delivery Findings (wave-2 bunker insta-clear; provisional scroll speed; far-tower fire) and TEA's standing ask to independently full-diff `surfaceMazes.ts`'s 239 coordinates against WSGRND.MAC (the suite pins structure, not every coordinate).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 877/877 pass, tsc+vite build clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — Reviewer checked index math directly |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — Reviewer checked the one throw site directly |
| 4 | reviewer-test-analyzer | Yes | findings | 11 | confirmed 5 (tautology, wave→name binding gap, field-completeness gap, wave-2 insta-clear, vacuous ===), deferred 6 (stale names, dup, boundary) as LOW/non-blocking |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — Reviewer found stale comments directly (LOW) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — rule-checker covered type design |
| 7 | reviewer-security | Yes | findings | 2 | confirmed 1 (mazeForWave NaN, downgraded LOW/latent), noted 1 (test bang LOW); all injection/auth/tenant categories N/A (offline game) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — dead-constant removal already clean |
| 9 | reviewer-rule-checker | Yes | findings | 2 classes | confirmed as LOW (test non-null bang ×12; mazeForWave NaN — NOT a new regression); pure-core boundary + readonly + union exhaustiveness all compliant |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled per settings)
**Total findings:** 3 confirmed blocking (2 HIGH + 1 MEDIUM), 4 confirmed LOW, 0 dismissed, several test-quality nits deferred as LOW

## Reviewer Assessment

**Verdict:** REJECTED

The transcription itself is flawless and the pure-core boundary is respected — but the story ships a **surface soft-lock**, and the tests that should have caught it are hollow (a tautology and subset-only checks). For a TDD story whose central claims are "the finite maze is the surface" and "the quota is the maze's tower count," the green suite does not actually verify either. Blocking.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| HIGH | Surface soft-locks: the finite authored field + the unchanged `phaseKills >= towersForWave` clear gate means missing ANY tower (some sit at ±0x8000, off-screen) leaves the quota permanently unreachable — the run is trapped on the surface (only escape: forced game-over). Proven: 300 s of no-fire flight, field fully scrolled, `phase` still `surface`. | `src/core/sim.ts` `progress` (~833) / `phaseQuota` (~777) | Add a scroll-completion surface→trench clear (advance when the field has fully passed); bank the 50,000 bonus only when all towers were actually killed. |
| HIGH | Core contracts under-tested: reconcile test is a tautology (`towersForWave(w) === mazeForWave(w).towerCount` — that IS the impl); no test binds a wave NUMBER to a maze NAME; placement is checked as subset/ceiling only, never full-field. Injection-verified: off-by-one map AND half-field placement both leave all 93 tests green. | `tests/core/surface-maze-field.test.ts:83,110`; `surface-tower-quota.test.ts:87` | Pin concrete wave→count (2→0, 7→20, 16→24) AND wave→name (1→SQUARE, 2→BUNK, 7→DIFF, 16→3DIFF, wrap); assert `s.turrets` length == full maze entry count; add the soft-lock regression test. |
| MEDIUM | Wave 2 (BUNK, 0 towers) insta-clears on entry and banks 50,000 free; no test locks the intended behavior. Same root cause as the soft-lock (0-tower quota fires the gate at entry). | `src/core/sim.ts` + tests | Resolved by the scroll-completion clear; add a wave-2 integration test asserting the intended outcome. |
| LOW | Vacuous assertion `expect(SURFACE_MAZES).toBe(SURFACE_MAZES)` (x===x, always true). | `tests/core/surface-mazes.test.ts:222` | Remove (the adjacent `getMaze('DIFF') === getMaze('DIFF')` already tests the singleton via two calls). |
| LOW | Stale comments/names: `phaseQuota` cites "byte_98CB"; quota test says "22-tower"/"22nd tower" (now 16); `surface.test.ts` "turrets rise on a timed schedule" (no timer now). | `sim.ts`, `surface-tower-quota.test.ts`, `surface.test.ts` | Update to the maze-derived reality. |
| LOW | `mazeForWave(NaN\|Infinity)` returns `undefined` typed as `SurfaceMaze`; callers deref unguarded. Latent (no path yields a non-finite `wave`) and NOT a new regression. | `src/core/surfaceMazes.ts:244` | Optional `Number.isFinite` guard for defense-in-depth. |

**Observations (tagged; VERIFIED items cite evidence):**

- [VERIFIED] Transcription is exact — I independently parsed `WSGRND.MAC` and diffed the runtime `SURFACE_MAZES` against it: all 568 base+extended coordinates match (0 mismatches), the base⊂extended prefix holds for all 9 pairs, and the wave→maze map is correct (wave 2→BUNK, 7→DIFF, 16→3DIFF, ≥21 wrap the last six). Evidence: independent ROM parse vs runtime dump, re-run post-linter — still 19/19 match. Complies with the transcription-vs-ROM review rule.
- [VERIFIED] Sacred pure-core boundary held — `surfaceMazes.ts` imports nothing, no DOM/`Date`/`Math.random`/`performance.now`; the diff REMOVES an RNG call (old `spawnTurret`), improving determinism. Evidence: security + rule-checker greps; `sim.ts` diff at the spawn site.
- [VERIFIED] No TDZ / no exhaustiveness gap — `MAZE_ORDER`/`RAW_FAMILIES` are `const`-initialized before `SURFACE_MAZES`'s initializer (module loads; 877 tests run); `Turret.kind` gaining `'bishop'` needs no switch case (all uses are `!== 'bunker'`, which correctly buckets bishops with towers). Evidence: rule-checker rule #3; `sim.ts:475,506`.
- [HIGH] [TEST] Tautological reconcile + missing wave→maze-name binding + subset-only placement — the story's core contracts pass regardless of correctness (`surface-maze-field.test.ts:83,110`; `surface-tower-quota.test.ts:87`).
- [HIGH] Soft-lock — the finite field is unexitable on a missed tower; [TEST]-corroborated (half-field injection stays green), proving the suite can't catch it.
- [MEDIUM] [TEST] Wave-2 insta-clear + free 50,000 — emergent, unpinned.
- [LOW] [SEC] `mazeForWave(NaN)` latent undefined; [RULE] `getMaze(name)!` non-null bang ×12 (test-only); [DOC] stale `byte_98CB`/"22-tower"/"timed schedule" comments (comment-analyzer disabled — Reviewer found these directly).
- [SIMPLE] N/A — simplifier disabled; the dead-constant removal (`MAX_TURRETS`/`SPAWN_SPREAD`/`BUNKER_SPAWN_CHANCE`) is already clean, no importers remain.
- [EDGE] N/A — edge-hunter disabled; Reviewer enumerated `mazeForWave` index math directly (all integer waves ≥1 map in-range; only NaN/Infinity break it).
- [SILENT] N/A — silent-failure-hunter disabled; the one throw (`orderMazes` at module load) is a loud static-data integrity guard, not a swallowed error.
- [TYPE] N/A — type-design disabled; rule-checker verified readonly on all maze types and the union design.

### Rule Compliance (lang-review/typescript.md + star-wars/CLAUDE.md boundary)

| Rule | Verdict |
|------|---------|
| #1 type-safety escapes | src: compliant (no `as any`/`@ts-ignore`). LOW: `getMaze(name)!` ×12 in tests; `mazeForWave` return-type over-promises for non-finite input (latent, pre-existing). |
| #2 generic/interface (readonly) | Compliant — `MazeEntry`/`SurfaceMaze`/`RawFamily` fully `readonly`; `SURFACE_MAZES: readonly`, `BY_NAME: ReadonlyMap`; no `Record<string,any>`. |
| #3 enum/union exhaustiveness | Compliant — `GroundKind` union; `typeDigit: 1\|2\|3` compile-checks every row; `'bishop'` needs no switch case. |
| #4 null/undefined (`??` vs `\|\|`) | Compliant — `age ?? 0` correct; no `\|\|` misuse; `getMaze` honestly typed. LOW: `mazeForWave` NaN gap. |
| #5 modules/declarations | Compliant — `export type` used; value/type imports separated; `.js` extension N/A (bundler resolution). |
| #6 React / #7 async / #9 build-config / #10 external input | N/A — no JSX, no async, no config change, no external trust boundary (internal sim state). |
| #8 test quality | VIOLATIONS — tautology, vacuous `===`, missing wave→name + full-field coverage (the HIGH/MEDIUM [TEST] findings). |
| #11 error handling | Compliant — `orderMazes` throw is a fail-loud integrity guard, nothing swallowed. |
| #12 perf/bundle | Compliant — scoped subpath imports only. |
| #13 fix-introduced regressions | N/A (feature story); the `mazeForWave` NaN class is carried forward from the old `byte_98CB` clamp, not newly introduced. |
| CLAUDE.md sacred core boundary | COMPLIANT — pure data, no forbidden imports/APIs, determinism improved. |

### Devil's Advocate

Assume this code is broken, and it is. The headline defect makes the game unwinnable for anyone who is not a perfect shot. The surface is now a fixed field of N towers and the ONLY way off the surface is to kill all N — but the field scrolls past once and is culled. A confused or merely human player who lets a single tower slip by (and towers are authored out to x = ±0x8000, some of which never enter the field of view at all) will fly forever over an empty floor with no towers left to shoot and no way to advance; the game *looks* frozen. The only "exit" is to deliberately crash into the surface until every shield is gone — a forced game-over dressed up as progression. On deep waves (≥21) the wrap selects the *extended* 32-tower mazes, so there are even more towers to miss and the soft-lock becomes more certain, not less. A stressed player under fire will miss more, so the harder the wave, the more likely the trap.

Now the tests. A future maintainer refactors `towersForWave`, or fat-fingers the `w - 2` in `mazeForWave` to `w - 1`, and every "reconcile" and "quota" test stays green because they compare the function to itself and only check a subset of placed X's — the injection experiment proved exactly this. A partial-field bug (lay half the maze) also ships silently and produces the same soft-lock. The wave-2 maze hands out 50,000 points for flying straight for one frame, inflating every score run and the extra-life economy. And a save/load feature that ever deserializes `wave` from disk hits a hard `undefined.entries` crash. None of these are hypothetical edge cases dredged up to justify a rejection — the first one is the *common* play experience. This is not shiny and chrome. Back to the forge.

**Handoff:** REJECTED → back to TEA (Imperator Furiosa) for a RED rework — the blocking findings are testable (a soft-lock regression test + concrete wave→count/name pins + a full-field-placement assertion), then Dev implements the scroll-completion clear. The transcription and pure-core work are sound and need no rework.

## TEA Assessment (rework r1)

**Tests Required:** Yes
**Reason:** Reviewer REJECT (2 HIGH) — the finite field soft-locks, and the core contracts were tested tautologically. RED rework pins the corrected behavior and hardens the hollow tests.

**Test Files:**
- `tests/core/surface-clear.test.ts` (NEW) — the corrected clear contract: no soft-lock (scroll-completion clears even with towers missed), 50k bonus only when all towers are killed, wave 2 (BUNK, 0 towers) neither insta-clears nor banks a free bonus. **5 failing** (drive Dev's scroll-completion fix) + 1 guard (all-towers-killed still early-clears + banks 50k, sw3-3 preserved).
- `tests/core/surface-maze-field.test.ts` (STRENGTHENED) — replaced the tautological `towersForWave === mazeForWave().towerCount` with CONCRETE wave→count + wave→NAME pins (1→SQUARE/16, 2→BUNK/0, 7→DIFF/20, 16→3DIFF/24, 20→3TWRCTY/32), the deep-wave wrap (period 6, ≥24 towers), the wave≤0/fractional clamp, and a **full-field completeness** assertion (`turrets.length === maze.entries.length`) that catches the half-field soft-lock.
- `tests/core/surface-tower-quota.test.ts` (STRENGTHENED) — concrete count pins replace the duplicated tautology; refreshed the stale "22-tower"/"22nd tower" names to the SQUARE=16 reality; dropped the now-unused import.
- `tests/core/surface-mazes.test.ts` (STRENGTHENED) — replaced the vacuous `SURFACE_MAZES).toBe(SURFACE_MAZES)` (x===x) with a two-distinct-path singleton check.
- `tests/core/surface.test.ts` (STRENGTHENED) — renamed the stale "turrets rise on a timed schedule" test to describe the laid-not-timed field.

**Tests Written:** 1 new suite (6) + 4 hardened files. Injection-resistant now: an off-by-one wave→maze map and a half-field placement each fail a concrete test (verified against the Reviewer's exact injection scenarios).
**Status:** RED — full suite 873 pass / 5 fail; the 5 failures are all in `surface-clear.test.ts` (the corrected clear contract), driving Dev's fix. `tsc --noEmit` clean. No collateral.

### Rule Coverage (lang-review/typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test quality (no tautology/vacuous) | tautologies replaced with concrete pins; vacuous `x===x` removed; completeness + soft-lock now discriminating | fixed |
| pure-core determinism | `surface-clear.test.ts` drives only `stepGame(state, NO_INPUT, dt)` — no DOM/time/RNG | covered |

**Self-check:** 0 vacuous tests introduced; the strengthened pins assert concrete independently-known ROM values (not the implementation against itself).

**Handoff:** To Dev (The Word Burgers) for GREEN — implement the scroll-completion surface→trench clear (advance when the laid field has fully passed) and gate the 50,000 bonus on all-towers-actually-killed (`towerCount > 0 && phaseKills >= towerCount`), so a missed tower no longer traps the run and wave 2 no longer gifts a free clear. Round-1's quota-crossing tests (full clear/early path) must stay green. Also fix the LOW leftovers Dev owns: the stale `phaseQuota` "byte_98CB" comment; optionally a `Number.isFinite` guard in `mazeForWave` (latent).

## Dev Assessment (rework r1)

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/sim.ts` — `phaseQuota` (kill count) → `phaseCleared` (boolean, exhaustive over `Phase`): the surface now clears on `allTowersKilled(s) || s.surfaceScrollZ >= surfaceFieldDepth(s.wave)`. New `allTowersKilled` (`towers > 0 && phaseKills >= towers` — the `> 0` is what stops the 0-tower BUNK wave insta-clearing) and `surfaceFieldDepth` (the maze's deepest authored `y` + `SPAWN_DISTANCE`). `progress` now gates the 50,000 `tower-bonus` on `allTowersKilled`, so a scroll-completion exit banks nothing. Stale `byte_98CB` comments retired.
- `src/core/surfaceMazes.ts` — `mazeForWave` clamps non-finite waves (`Number.isFinite(wave) && wave >= 1`) instead of indexing out of the table (Reviewer LOW).
- `tests/core/music-cue.test.ts` — re-seated the merged sw3-5 wave-2 fixture (it staged the surface→trench edge via `phaseKills: towersForWave(2)`, i.e. `0` — the very insta-clear defect being fixed) onto the scroll-completion exit. Assertions preserved.

**Tests:** 878/878 passing across 82 files (GREEN). `tsc --noEmit` + `vite build` clean.
All 5 of TEA's rework failures are green, and round-1's quota-crossing tests (full clear / early path) still hold.

**End-to-end drive (the Reviewer's own repro, inverted):** flew the surface with NO fire and padded lives, the way the REJECT proved the soft-lock:

| wave | maze | towers | no-fire flight | bonus |
|------|------|--------|----------------|-------|
| 1 | SQUARE | 16 | → **trench** @ 49.8 s | 0 |
| 2 | BUNK | 0 | → **trench** @ 53.2 s (no insta-clear) | 0 (was a free 50,000) |
| 5 / 7 | TURNON / DIFF | 20 | → **trench** @ 49.8 s | 0 |
| 20 / 26 | 3TWRCTY (incl. deep-wave wrap) | 32 | → **trench** @ 49.8 s | 0 |

No wave traps the run — including the deep-wave wrap, where the REJECT argued the trap was *most* certain. Killing every tower still clears EARLY (1 frame) and banks the 50,000 (waves 1 and 7 verified) — sw3-3's contract intact.

**Branch:** `feat/sw4-3-surface-maze-port` (pushed)

**Handoff:** To Reviewer (Immortan Joe) for re-review. The two HIGH findings are addressed: the soft-lock is gone (scroll-completion exit, driven from the maze data — NOT from `turrets.length`, which empties on kills too and would have re-opened a free exit), and the 50,000 is gated on towers actually killed. The MEDIUM (wave-2 insta-clear + free bonus) falls out of the same fix. Three LOWs closed (stale `byte_98CB`/"22-tower"/"timed schedule" comments, the vacuous `x===x`, the `mazeForWave` non-finite guard). Note the new Delivery Findings — chiefly that the PROVISIONAL scroll speed now sets the surface's ~50 s worst-case duration, which is a playtest knob, not a defect.

## Subagent Results (rework r1)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 878/878 pass (82 files), tsc + vite build + lint clean, tree clean & pushed, 0 debug smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — Reviewer enumerated the boundary math directly (algebraic proof + empirical final-frame probe; 5 injections) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — Reviewer found the one silent fallback directly (`let deepest = 0`, LOW) |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 4 (wave-blind clear distance = MEDIUM; wave-2 shoot-early scenario; `turrets: []` fixture refill; kill-based wave≥2 music pin), 0 dismissed. Independently mutation-tested and CLEARED the music-cue re-seat |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — Reviewer verified the round-1 stale comments (`byte_98CB`, "22-tower", "timed schedule") are all retired |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — rule-checker covered type design (readonly, unions, exhaustiveness) |
| 7 | reviewer-security | Yes | clean | none | N/A — round-1 `mazeForWave` LOW VERIFIED FIXED (exhaustive input trace: NaN/±Inf/−0/0/0.5/1.5/−5/MAX_SAFE_INTEGER/1e308 all return a real maze); purity boundary grep-clean; injection/auth/tenant categories explicitly N/A (offline game) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — Reviewer found the complexity finding directly (duplicated placement transform, MEDIUM) |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 as LOW (test-only `getMaze(...)!` non-null assertions ×4 — downgraded, not dismissed: rationale below). Rule #13 (fix-introduced regressions) explicitly CLEAN across all 12 sub-checks |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled per settings)
**Total findings:** 0 blocking (0 Critical, 0 High), 2 MEDIUM confirmed, 5 LOW confirmed, 0 dismissed

## Reviewer Assessment (rework r1)

**Verdict:** APPROVED

The soft-lock is dead, and I did not take Dev's word for it — I re-ran my own REJECT repro and then attacked the fix with five injections. The two HIGH findings are genuinely closed: the finite field now exits by scroll-completion on every wave, and the 50,000 no longer falls out of the sky. The suite that blessed those bugs in round 1 now kills them. What remains is one real MEDIUM — the clear DISTANCE is not pinned to the maze — plus a duplicated placement transform that is its root cause. Neither is a defect in shipped behavior, and neither blocks.

**Data flow traced:** authored maze entry `{x, y}` → `mazeField` places it at world `z = -(y + SPAWN_DISTANCE)` (`sim.ts:990`) → `stepSurface` advances every object by `TURRET_SCROLL_SPEED·dt` and culls at `z >= 0` (`sim.ts:460,464`) → the same `dt` advances `surfaceScrollZ` (`sim.ts:538`) → `progress(stepSurface(...))` (`sim.ts:175`) reads the fresh scroll → `phaseCleared` clears the surface at `surfaceScrollZ >= deepest + SPAWN_DISTANCE` (`sim.ts:788,816`). Safe because the exit is algebraically EXACT: an object is culled iff `-(y + SPAWN) + surfaceScrollZ >= 0` ⟺ `surfaceScrollZ >= y + SPAWN`, so taking the deepest `y` makes the clear fire on precisely the frame the last object passes — no earlier, no later.

**Pattern observed:** the exit is derived from IMMUTABLE maze data, not from the mutable `turrets` array (`sim.ts:812-817`). This is the correct call and the review's best decision — `turrets` empties on KILLS as well as on scroll, so reading it would have handed the bunkers-only wave a free exit the moment its 28 bunkers were shot. I verified adversarially: swapping in `s.turrets.length === 0` fails 6 tests.

**Error handling:** `orderMazes` throws loudly on a missing maze at module load (`surfaceMazes.ts:220`) — a static-data integrity guard, nothing swallowed. `mazeForWave` is now TOTAL (`surfaceMazes.ts:249`): every input, finite or not, returns a real `SurfaceMaze`. The one soft failure is `surfaceFieldDepth`'s `let deepest = 0` (`sim.ts:814`), which would quietly yield a 2-second surface for a zero-entry maze — unreachable, LOW.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| MEDIUM | [TEST] The clear DISTANCE is wave-blind-testable. `surfaceFieldDepth` is the whole mechanism that resolves the round-1 soft-lock, yet nothing binds it to the maze: dropping the `SPAWN_DISTANCE` lead-in passes 878/878 (my injection); a hardcoded `return 34000` and a flat `surfaceScrollZ >= 20000` timer each pass 878/878 (test-analyzer). The lock itself IS guarded (a never-clearing depth fails), so this is precision, not safety. | `tests/core/surface-clear.test.ts` | Pin clear distance to maze depth — two waves with different deepest-Y must clear at different, proportional `surfaceScrollZ` (or assert the boundary at `surfaceFieldDepth(w) ± ε`). Non-blocking; logged as a Delivery Finding. |
| MEDIUM | [SIMPLE] The placement transform is written twice — `mazeField` at `-(e.y + SPAWN_DISTANCE)` and `surfaceFieldDepth` at `deepest + SPAWN_DISTANCE`, 174 lines apart, with no single source of truth and no test binding them. Root cause of the above. | `sim.ts:816` / `sim.ts:990` | Precompute `maxDepth` on `SurfaceMaze` (as `towerCount` already is) and/or share one `fieldZ(y)` helper. Non-blocking. |
| LOW | [TEST] The scenario the fix's OWN comment warns about is untested: shoot every bunker on wave 2 early → the surface must not clear. All wave-2 tests use `NO_INPUT`. | `tests/core/surface-clear.test.ts` | Add the shoot-early wave-2 case. |
| LOW | [TEST] No test drives `mazeForWave(NaN)`/`(Infinity)` — the very case the guard was added for. | `tests/core/surface-maze-field.test.ts` | Add the pin. |
| LOW | [TEST] `turrets: []` fixtures are silently REFILLED with the full maze by the auto-lay heuristic; the fixture's stated intent ("no ground objects") is false at runtime. Harmless today. | `tests/core/surface-tower-quota.test.ts` | Hand-place a dummy turret to opt out, or comment the refill. |
| LOW | [RULE] `getMaze(base)!` / `getMaze('BUNK')!` non-null assertions ×4 without a preceding runtime check (rule #1). | `tests/core/surface-mazes.test.ts:133,134,136,174` | Downgraded, NOT dismissed — test-only, inputs are hardcoded literals, a real regression still fails loudly (TypeError), and the idiom is pervasive across this repo's suite. |
| LOW | [SILENT] `let deepest = 0` fails soft — a hypothetical zero-entry maze yields a ~2 s surface instead of throwing. Unreachable with the static data. | `sim.ts:814` | Optional loud guard. |

**Observations (tagged; VERIFIED items cite evidence):**

- [VERIFIED] **The soft-lock is dead.** I re-ran my own REJECT repro (no-fire flight, padded lives) across waves 1/2/5/7/20/26 — every wave reaches the trench (49.8 s; wave 2 at 53.2 s), including the deep-wave wrap where my Devil's Advocate argued the trap was *most* certain. Evidence: `sim.ts:788` scroll-completion branch; `surfaceScrollZ` advances unconditionally at `sim.ts:538`, so no play pattern can stall it.
- [VERIFIED] **The clear boundary is EXACT, not approximate.** Algebra above, plus an empirical probe: on the FINAL surface frame the last standing objects sit at z = −2 (wave 1/7) and z = −10 (wave 2) — a hair in front of the cockpit, culled the next frame. The surface ends the instant the field is spent. Evidence: `sim.ts:460,464` (cull at z≥0) vs `sim.ts:816` (depth = deepest + SPAWN_DISTANCE).
- [VERIFIED] **Round-1's killer injections now die.** The two bugs that left all 93 tests green in round 1: off-by-one wave→maze map (`w-2`→`w-1`) now fails **10** tests; half-field placement now fails **1**. The hollow suite is no longer hollow. Evidence: my own re-injection, tree restored clean.
- [VERIFIED] **The fix's own logic is guarded** (4 of 5 injections caught): surface-always-clears → 29 failures; drop the `towers > 0` guard (wave-2 insta-clear returns) → 2; exit via `turrets.length === 0` → 6; ungate the 50k → 2. Only the depth formula slipped through — that is the MEDIUM above.
- [VERIFIED] **The merged sibling test was NOT gutted.** The `music-cue.test.ts` re-seat is the deviation I hunted hardest. Both assertions are byte-identical; only the staging moved, and it HAD to — the old fixture crossed the edge via `phaseKills: towersForWave(2)` = `0`, i.e. it rode the exact insta-clear defect being fixed. `surfaceScrollZ: 100_000` really does exceed `surfaceFieldDepth(2)` = 31920 and fails loudly, not vacuously, if a maze ever runs deeper. Independently mutation-tested and cleared by reviewer-test-analyzer.
- [VERIFIED] [SEC] **`mazeForWave` is now total.** reviewer-security traced NaN, ±Infinity, −0, 0, 0.5, 1.5, −5, `MAX_SAFE_INTEGER`, 1e308 — all return a real maze with an in-range index. My round-1 LOW is closed. Evidence: `surfaceMazes.ts:249`.
- [VERIFIED] **The sacred core boundary holds.** No `Date.now`/`new Date`/`performance.now`/`Math.random`/`requestAnimationFrame`/DOM/`shell` import anywhere in `src/core/` (grep-clean, two independent subagents). The diff REMOVES an RNG call (the old `spawnTurret`) — determinism improved. Complies with star-wars/CLAUDE.md's hard architectural rule.
- [VERIFIED] **The transcription still stands.** Both rework commits left the maze DATA untouched (`f1ce327` touches no lines of `surfaceMazes.ts`; `02e4b34` touches only the 6-line `mazeForWave` clamp), so my round-1 independent full-diff of all 568 base+extended coordinates against `WSGRND.MAC` — 0 mismatches — remains valid. No re-diff needed.
- [VERIFIED] **No dangling wreckage from the rename.** `phaseQuota` has zero remaining references in `src/` or `tests/`; `progress(stepSurface(...))` (`sim.ts:175`) means the clear sees the fresh scroll on the same frame.
- [VERIFIED] **Wiring / no player-facing lie.** I checked whether the HUD still shows a tower quota that no longer governs the exit: the only shell consumer of `phaseKills` is `deathStarPlacement` (`render.ts:178`), which is scoped to `SPACE_WAVE_QUOTA` — the space-phase approach. Nothing renders a surface tower counter, so the player is not misinformed by the changed exit.
- [HIGH] — **none.** Both round-1 HIGHs are closed and verified.
- [MEDIUM] [TEST] Wave-blind clear distance (see table). [SIMPLE] Duplicated placement transform (see table).
- [LOW] [TEST] wave-2 shoot-early scenario; `mazeForWave(NaN)` unpinned; `turrets: []` fixture refill; the weak `expect(towersForWave(9)).toBe(towersForWave(9))` purity assertion (`surface-tower-quota.test.ts:98` — NOT the round-1 `x===x` sin: it sits in a test named "is a pure function of the wave", so it CAN fail on an impure impl, and the next line anchors it with a concrete `21`).
- [LOW] [RULE] test-only `getMaze(...)!` ×4 — downgraded with rationale, not dismissed.
- [LOW] [SILENT] `let deepest = 0` fails soft (`sim.ts:814`).
- [DOC] Round-1's stale comments are all retired — `phaseQuota`'s "byte_98CB" citation, the quota test's "22-tower"/"22nd tower", and `surface.test.ts`'s "turrets rise on a timed schedule". The new comments are accurate and unusually good: `surfaceFieldDepth`'s doc explains WHY it reads maze data instead of `turrets`, which is the exact trap a future maintainer would fall into.
- [TYPE] N/A — type-design disabled; rule-checker verified `MazeEntry`/`SurfaceMaze`/`RawFamily` are fully `readonly`, `GroundKind`/`Phase` are string unions (not enums, per rule #3), and `phaseCleared`'s 3-case switch is compiler-enforced exhaustive via TS2366 under `strict` + its explicit `: boolean` return — a 4th `Phase` would fail the build, not silently misroute.
- [EDGE] N/A — edge-hunter disabled; I enumerated the boundary myself (algebra + final-frame probe + 5 injections). Integer waves ≥1 all map in range; non-finite waves now clamp.
- [SEC] Offline single-player game: injection, auth/authz, session, tenant isolation, CORS, CSRF, deserialization all explicitly N/A. No secrets, no network, no backend. `localStorage` (high scores) is untouched by this diff.
- [SIMPLE] The duplicated placement math is the one real simplification target (MEDIUM). Otherwise the fix is minimal: `phaseQuota` → `phaseCleared` + two small pure helpers, no new state, no new abstraction. `surfaceFieldDepth` recomputes a per-wave constant every frame (a ≤32-entry scan) — negligible cost, but precomputing it on `SurfaceMaze` would fix both the perf nit and the coupling in one stroke.

### Rule Compliance (lang-review/typescript.md + star-wars/CLAUDE.md boundary)

| Rule | Verdict |
|------|---------|
| #1 type-safety escapes | Src: COMPLIANT — the fix adds no `as any`/`as unknown as`/`@ts-ignore`/`!`. LOW: `getMaze(...)!` ×4 in `surface-mazes.test.ts` (test-only, hardcoded literals — downgraded, not dismissed). |
| #2 generic/interface (readonly) | COMPLIANT — `MazeEntry`/`SurfaceMaze`/`RawFamily` all `readonly`; `SURFACE_MAZES: readonly`; `KIND_FOR` is a closed literal-key `Record`, no `Record<string,any>`, no bare `object`/`Function`. |
| #3 enum/union exhaustiveness | COMPLIANT — no enums (string unions, the rule's preferred form). `phaseCleared`'s switch over `Phase` is exhaustive and compiler-enforced (TS2366 via explicit `: boolean` return under `strict`); rule-checker proved it with an isolated repro adding a 4th variant. |
| #4 null/undefined (`??` vs `\|\|`) | COMPLIANT — `allTowersKilled(s) \|\| s.surfaceScrollZ >= …` is a genuine boolean OR, not the falsy-0 default bug; `age ?? 0` correct; `Map.get()` guarded by a throw in `orderMazes`; `getMaze` honestly typed `SurfaceMaze \| undefined`. `mazeForWave` is now total. |
| #5 modules/declarations | COMPLIANT — `export type`/`import type` used correctly; `.js` extensions N/A under `moduleResolution: bundler`. |
| #6 React / #7 async | N/A — no JSX, no async/Promise code in the diff. |
| #8 test quality | MOSTLY COMPLIANT — round-1's tautology and vacuous `x===x` are GONE, replaced by concrete independently-known ROM pins (`towersForWave(1)=16, (2)=0, (9)=21, (16)=24`) and a full-field completeness assertion; injection-verified discriminating. REMAINING: the wave-blind clear distance (MEDIUM) + 3 LOW coverage gaps. |
| #9 build/config | COMPLIANT — `tsconfig` untouched, `strict: true` intact, `tsc --noEmit` + `vite build` clean. |
| #10 external input | N/A — no trust boundary (internal sim state); `mazeForWave` is nonetheless now defensively total. |
| #11 error handling | COMPLIANT — `orderMazes` throws loudly; nothing swallowed. LOW: `surfaceFieldDepth`'s zero-entry fallback fails soft. |
| #12 perf/bundle | COMPLIANT — a ≤32-entry per-frame scan is not the hot-path class this rule targets; no barrel over-imports. |
| #13 fix-introduced regressions | COMPLIANT — rule-checker re-scanned `02e4b34` against #1–#12 and found ZERO new escapes: no `as any` to silence a type error, no `\|\|`-for-`??`, no exhaustiveness hole, no purity violation. This is the meta-check that matters most on a rework, and it is clean. |
| CLAUDE.md sacred core boundary | COMPLIANT — `src/core` stays pure; the diff REMOVES an RNG call, improving determinism. |

### Devil's Advocate

Assume the fix is broken. Where would it break? The obvious attack is that Dev traded one trap for another: a surface that can never be left for a surface that leaves *too easily*. So I tried to make it leave early. I removed the `SPAWN_DISTANCE` lead-in from the depth — the whole suite still passed, which means a maintainer could ship a surface that cuts to the trench with the last row of towers still 1,200 units ahead and visible, and the tests would applaud. The test-analyzer went further and replaced the entire scroll-completion branch with a flat `surfaceScrollZ >= 20000` timer — a wave-blind stopwatch pretending to be a maze-driven field — and 878 tests still passed. That is the honest weakness of this branch, and it is exactly the species of hole that got round 1 rejected: the story's central claim ("the maze IS the surface") is once again not what the suite verifies. I nearly rejected on that alone.

What stopped me is that the claim is nonetheless TRUE in the shipped code, and I proved it three independent ways rather than trusting the assessment: the algebra (cull at `z ≥ 0` ⟺ `scrollZ ≥ y + SPAWN`, so the deepest `y` is precisely the exit), the empirical final-frame probe (the last objects sit at z = −2 and z = −10 — the field really is spent at the instant the phase ends), and five injections, four of which the suite kills. Crucially, the *soft-lock* — the defect that failed this branch — cannot come back silently: any depth that never resolves (`Infinity`, a `phaseKills`-only gate, a `turrets.length` exit on a wave you clear early) fails the suite loudly. What is unguarded is the *precision* of a boundary that is currently correct. That is a MEDIUM, and dressing it up as a HIGH so I can reject twice would be tyranny, not quality control.

The other angles fail to draw blood. A player who shoots nothing now flies ~50 seconds and lands in the trench — long, but the run continues, and Dev flagged the scroll speed as the tuning knob. A player who dies mid-surface simply dies; `progress` returns early on `gameOver`. The bonus cannot double-fire (the phase flips to trench, and `NEXT_PHASE.trench` is `null`). Bunkers still cannot inflate the quota (`kind !== 'bunker'`). Wave 2 is now 53 seconds of harmless bunkers with no objective and no bonus — genuinely dull, and I would watch it in playtest — but it is *correct*, and it no longer hands out 50,000 points for flying straight for one frame, which was silently inflating every score run and the extra-life economy. The save/load crash I feared in round 1 is gone: `mazeForWave` is total for every input a deserializer could produce. This is shiny. This is chrome.

**Handoff:** APPROVED → to SM (The Organic Mechanic) for finish-story. Two MEDIUM follow-ups are logged in Delivery Findings (pin the clear distance to the maze depth; de-duplicate the placement transform) — neither blocks the merge, both should be picked up in the sw4 playtest pass.