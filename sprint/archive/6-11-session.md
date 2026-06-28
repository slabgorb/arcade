---
story_id: "6-11"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-11: Extract, bake & host the remaining 7 authentic POKEY SFX

## Story Details
- **ID:** 6-11
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T19:38:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T16:15:01Z | 2026-06-28T16:16:50Z | 1m 49s |
| red | 2026-06-28T16:16:50Z | 2026-06-28T16:26:08Z | 9m 18s |
| green | 2026-06-28T16:26:08Z | 2026-06-28T18:18:40Z | 1h 52m |
| review | 2026-06-28T18:18:40Z | 2026-06-28T19:38:40Z | 1h 20m |
| finish | 2026-06-28T19:38:40Z | - | - |

## Sm Assessment

**Routing:** Phased TDD workflow → handing off to TEA (O'Brien) for RED phase. Single repo (`tempest`), gitflow branch `feat/6-11-pokey-sfx-remaining-7` on `develop`.

**Scope is well-defined and continuation work.** This directly extends 6-6 (baked 6 SFX) and 6-10 (wired segment-tick + countdown-beep). The tooling (`tools/pokey-bake/`), the bake/host pipeline, and the SOUNDS pattern in `src/shell/audio.ts` all already exist and were proven by 6-6 — this story applies the same recipe to 7 more sounds.

**Key tension for TEA to resolve:** The story is tagged `tdd`, but the work is predominantly shell/asset/tooling (ROM extraction → bake WAV → R2 upload → registry wiring) with `src/core/` explicitly untouched (AC#4). The story body even says "no new unit tests required." TEA should decide the honest RED-phase target:
- Testable behavior likely exists at the *registry/wiring* seam — e.g. SOUNDS contains the new keys, sfx-data entries have valid envelope structure, the player-death event maps to `player-explosion` (replacing `shipexplosion.wav`).
- If TEA judges there is no meaningful deterministic behavior to test, flag it rather than writing vacuous tests — by-ear confirmation and R2 upload are inherently manual/integration.

**Known unknowns (built into ACs, not blockers):** Some of the 7 SFX may lack a confirmable ROM address and/or an existing game trigger. ACs #1 and #3 already permit explicit scope/defer with documented reason — so partial delivery of the 7 with logged deferrals is an acceptable outcome, not a failure. Priority order per 6-6's AC#4: spike-shot, pulsar-hum, pulsar-active first.

**Reference material is in-repo:** `tools/pokey-bake/sfx-data.mjs`, `tools/pokey-bake/bake-sfx.mjs`, and `docs/ux/2026-06-27-tempest-arcade-feel-reference.md` (Sound section). External dependency: `wrangler` + R2 credentials for hosting.

## Story Context

### Title
Extract, bake & host the remaining 7 authentic POKEY SFX

### Epic
Wave 6 — Playtest feel & balance (tempest)

### Type
feature

### Points
3

### Priority
p3

### Repos
tempest

### Description
The 7 of the 13 catalogued POKEY SFX NOT delivered by story 6-6 (which baked 6: player_fire, enemy_fire, enemy_explosion, warp, countdown_beep, segment_tick). Extract the ALSOUN envelope data from the rev-3 ROM (136002-136.lm1, sound table $cc2d) with the same method as 6-6 (see tools/pokey-bake/sfx-data.mjs + docs/ux/2026-06-27-tempest-arcade-feel-reference.md Sound section), bake via tools/pokey-bake/bake-sfx.mjs, upload to R2 (`wrangler r2 object put arcade/tempest/sfx/<name>.wav --remote`), add to SOUNDS in src/shell/audio.ts, and wire to the matching game event where one exists. 

THE 7 SFX:
- spike-shot
- player-explosion (wire to existing player-death event; currently community rip shipexplosion.wav)
- pulsar-hum
- pulsar-active
- zoom-start
- extra-life
- slam

Some lack a confirmed sound->ROM address and/or a game trigger — confirm by ear (as in 6-6) and scope/defer any without a trigger. AC#4 of 6-6 named spike-shot + pulsar-hum/active as priority secondary gaps. Completes the '13 catalogued SFX' target AC#1 of 6-6 was descoped from (6-6 delivered 6; 6-10 wires segment-tick + countdown-beep).

### Acceptance Criteria
1. ALSOUN envelope data for the 7 remaining catalogued SFX extracted from the rev-3 ROM and added to tools/pokey-bake/sfx-data.mjs (confirmed by ear; any without a confirmable address explicitly noted).
2. Baked to WAV (no SILENT warnings) and hosted on R2 alongside the existing tempest/sfx set.
3. Each sound with an existing game event wired in src/shell/audio.ts + main.ts (e.g. player-explosion -> player-death); any without a trigger explicitly scoped or deferred with a documented reason.
4. Shell/asset-only: src/core/ untouched; web-pokey MIT attribution retained.

## Technical Approach

### Extraction Strategy
- Reference story 6-6's approach: extract ALSOUN envelope data from rev-3 ROM sound table ($cc2d)
- Use tools/pokey-bake/sfx-data.mjs as the format reference for envelope encoding
- Confirm each sound by ear against authentic arcade footage (as per 6-6 methodology)
- Document ROM addresses for all 7 SFX; explicitly note any without a confirmable address

### The 7 Sounds (Priority Order)
1. **spike-shot** (priority per AC#4 of 6-6) — Spiker projectile impact
2. **pulsar-hum** (priority per AC#4 of 6-6) — Pulsar idle tone
3. **pulsar-active** (priority per AC#4 of 6-6) — Pulsar active/strobing
4. **player-explosion** — Death sound; wire to existing player-death event (replaces current shipexplosion.wav)
5. **zoom-start** — Warp entry effect
6. **extra-life** — Extra life earned
7. **slam** — Impact/slam effect

### Implementation Steps
1. **ROM extraction:** Locate each sound's envelope data in 136002-136.lm1, table $cc2d; document source file:line
2. **Encoding:** Add entries to tools/pokey-bake/sfx-data.mjs in ALSOUN envelope register-event format (~246 Hz IRQ, step/246 s time mapping)
3. **Baking:** Run tools/pokey-bake/bake-sfx.mjs on the new data; verify no SILENT warnings
4. **R2 hosting:** Upload each .wav to `arcade/tempest/sfx/{name}.wav` via wrangler r2 object put
5. **Shell wiring:** 
   - Add to SOUNDS registry in src/shell/audio.ts (parallel to 6-6's entries)
   - Wire to game events in main.ts (e.g., player-explosion on gameEvent('player-death'))
6. **Scope/defer:** Any SFX without a confirmed ROM address or game trigger explicitly noted + decision logged

### Testing & Verification
- No new unit tests required (audio is shell/asset-only; 6-6 validated the bake tool)
- Verify baked WAVs are audible and match authentic arcade behavior by ear
- Confirm R2 uploads succeed and are accessible via the R2 base URL
- Spot-check event wiring by firing the corresponding game event and listening for the sound

## Branch Strategy
**Branch Strategy:** gitflow (feat/6-11-pokey-sfx-remaining-7 on develop)

Tempest uses gitflow: branches target `develop` (not main), PR naming `feat/{story}-{description}`.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** Despite the story note "no new unit tests required," there IS a deterministic, testable seam: the SFX *data* (`tools/pokey-bake/sfx-data.mjs`) and the *event→sound manifest* (`src/shell/audio.ts` + `src/main.ts`). The by-ear ROM confirmation and the R2 upload are inherently manual/integration and are NOT unit-tested — but the registry/wiring layer is, and that is where 6-11's one certain behavioral change lives (player-death now plays the authentic bake).

**Test Files:**
- `tests/shell/audio.test.ts` — new describe block "player-explosion cue (story 6-11: authentic player-death bake)" (4 tests: 3 RED + 1 green wiring guard).
- `tools/pokey-bake/bake-sfx.test.mjs` — new describe block "pokey-bake remaining-7 catalogue (story 6-11)" (2 RED tests). Also refactored 2 existing tests for the expanded scope (see Design Deviations).

**Tests Written:** 6 new + 2 refactored, covering AC#1, AC#2, AC#3.
**Status:** RED (5 failing, ready for Dev) — verified by Room 101 (testing-runner): 5 failed / 469 passed, 0 unexpected regressions.

**The 5 RED tests:**
1. `loads the authentic player_explosion bake from the R2 base (AC#3)`
2. `no longer loads the community-rip shipexplosion.wav placeholder (AC#3)`
3. `resolves the player_explosion bake against a custom base URL too`
4. `delivers the authentic player_explosion bake — it has a game trigger (AC#1/#3)`
5. `accounts for all 7 remaining catalogued SFX — delivered or explicitly deferred (AC#1/#3)`

### Rule Coverage

This is a data + single-string-swap change (`.mjs` data file, one `SOUNDS` entry, no new `SoundName`). The TypeScript lang-review checklist is a Dev self-review of `.ts`/`.tsx` diffs — most checks (generics, hooks, async, input validation) don't apply to this asset/data work. The applicable items are enforced at review:

| Rule (typescript.md) | Applies here? | Enforcement |
|------|------|------|
| #3 enum/union exhaustiveness | The `play()` switch in `main.ts` | No new `SoundName` added (playerDeath exists) → no new case; guarded by existing wiring test |
| #5 module/`as const` integrity | `SOUNDS` stays `as const`, `SoundName = keyof typeof SOUNDS` | Manifest tests load real module; type unchanged |
| #8 test quality (no vacuous asserts) | My new tests | Self-checked below |

**Rules checked:** applicable subset (3 of 13) covered; remainder N/A for a data/asset diff.
**Self-check:** 0 vacuous tests. Every new test asserts a concrete URL membership, a defined SFX entry with a `/^\$[0-9a-f]{4}$/` ROM address, or accountability with a substantive (>10 char) deferral reason. No `let _ =`, no `assert(true)`, no always-None checks.

**The DEFERRED contract (new, introduced by these tests):** AC#1/#3 require any sound without a confirmable ROM address or game trigger to be "explicitly noted / deferred with a documented reason." To make that testable rather than prose (6-10 deferred its one sound in a comment), the accountability test requires `sfx-data.mjs` to export `DEFERRED = [{ name, reason }, ...]`. Dev: every one of the 7 catalogued names must end up either as a real `SFX` entry OR in `DEFERRED` with a >10-char reason. `player_explosion` MUST be delivered (it has the `player-death` trigger).

**Handoff:** To Dev (Julia) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes (code GREEN; R2 hosting + by-ear are user-gated final steps)

**What shipped (authentic, from the rev-3 ROM):**
- **spike_shot** (`$cc51`) — clean 6-byte record, added to `SFX` like the 6-6 set.
- **player_explosion** (`$cbf5`) — multi-note streaming envelope; **wired to the `player-death` event** (replaces community-rip `shipexplosion.wav`). This is the headline deliverable.
- **extra_life** (`$cc11`) and **pulsar_hum** (`$cc99`) — multi-note streaming envelopes; baked + (to be) hosted, left unwired (no core event yet).
- **DEFERRED** (documented): `pulsar_active` (silent one-shot blip), `zoom_start` (= existing `warp.wav`), `slam` (= `countdown_beep` record; no browser trigger).

**How:** Reverse-engineered the authoritative sound→ROM map from the ROM + `tempest.a65` disassembly + the PDF (`docs/ux/2026-06-28-pokey-sfx-rom-map.md`). Discovered the remaining sounds (except spike-shot) are multi-note streaming envelopes, so I re-implemented the arcade `update_sounds` engine as `expandStream` in `bake-sfx.mjs`, **validated bit-for-bit against the six 6-6 sounds** before trusting it for the new ones.

**Files Changed:**
- `tools/pokey-bake/sfx-data.mjs` — added spike_shot (clean), player_explosion/extra_life/pulsar_hum (streaming) + `ALSOUN_STREAM` data region + `DEFERRED` export.
- `tools/pokey-bake/bake-sfx.mjs` — added the streaming engine (`expandStream`/`streamVoice`) + bake-loop handling for `spec.stream`.
- `tools/pokey-bake/bake-sfx.test.mjs` — structural test updated to accept both clean and streaming shapes (deviation logged).
- `src/shell/audio.ts` — `playerDeath` → `player_explosion.wav`.
- `docs/ux/2026-06-28-pokey-sfx-rom-map.md` — authoritative sound map (new).
- `.gitignore` — keep the ROM dumps + PDF local-only.

**Tests:** 474/474 passing (GREEN). `tsc --noEmit` + `vite build` pass. All 10 SFX bake non-silent (6-6 six unchanged; spike_shot 0.123, player_explosion 0.308, extra_life 0.313, pulsar_hum 0.391).

**Branch:** `feat/6-11-pokey-sfx-remaining-7` (committed locally; **not pushed** — per tempest CLAUDE.md "don't push unless asked").

**Remaining (user-gated):** (1) upload baked WAVs to R2 — **required before merge** or player-death goes silent; (2) by-ear confirmation (WAVs at `tools/pokey-bake/out/`).

**Handoff:** To next phase (verify / review).

## Delivery Findings

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): Of the 7 catalogued SFX, only `player-explosion` has an existing core game trigger (`player-death`). `spike-shot`, `pulsar-hum`, `pulsar-active`, `zoom-start`, `extra-life`, and `slam` have NO matching `GameEvent` in `src/core/events.ts`, and `src/core/` is out of scope (AC#4). Affects `tools/pokey-bake/sfx-data.mjs` + `src/shell/audio.ts` (these six likely land in `DEFERRED`, or are baked+hosted but left unwired pending a future core event). *Found by TEA during test design.*
- **Question** (non-blocking): `zoom-start` ("warp entry effect") may overlap the already-authentic `levelClear → warp.wav` cue (ROM $cc75, wired by 6-6). Dev should confirm by ear whether `zoom-start` is a distinct ROM sound or a duplicate of `warp` before adding a redundant entry. Affects `tools/pokey-bake/sfx-data.mjs`. *Found by TEA during test design.*
- **Improvement** (non-blocking): `extra-life` has a plausible trigger (bonus-life award in `src/core/rules.ts`/`sim.ts`) but no `GameEvent` is emitted for it today; wiring it would require a core change (out of scope here). Worth a follow-up story to emit an `extra-life` event so the baked sound can be wired. Affects `src/core/` (future). *Found by TEA during test design.*

### Dev (implementation)
- **RESOLVED — ROM source data:** The earlier blocker (no ROM/disassembly in the checkout) is resolved — the user provided the rev-3 ROM set + the "Tempest vs Tempest" PDF, now at `tempest/docs/rom/` and `tempest/docs/TempestVsTempest_release.pdf` (both gitignored). I obtained the labelled disassembly `tempest.a65` (charlesUnixPro/Tempest-Source-Code) and reverse-engineered the authoritative sound→ROM map (`docs/ux/2026-06-28-pokey-sfx-rom-map.md`). All envelope data is now authentic ROM bytes. *Found by Dev during implementation.*
- **Gap / Scope** (non-blocking): The story assumed "same recipe as 6-6 for 7 more sounds," but only **spike-shot** is a clean 6-byte record like 6-6's. **player-explosion, extra-life, pulsar-hum** are multi-note streaming envelopes — required a faithful re-implementation of the arcade `update_sounds` engine (`expandStream` in `bake-sfx.mjs`, validated bit-for-bit vs the six 6-6 sounds). **pulsar-active, zoom-start, slam** are deferred (see DEFERRED + deviations). Affects `tools/pokey-bake/`. *Found by Dev during implementation.*
- **Gap** (BLOCKING merge-readiness): The baked WAVs are NOT yet on R2. `src/shell/audio.ts` now points `playerDeath` at `player_explosion.wav`; until that file is hosted on `arcade-assets.slabgorb.com/tempest/sfx/`, **player-death will be silent in the live game** (same [HIGH] 6-6 hit). Bakes are reproducible: `node tools/pokey-bake/bake-sfx.mjs tools/pokey-bake/out` → upload `player_explosion.wav` (+ optionally `spike_shot/extra_life/pulsar_hum.wav`) via `wrangler r2 object put arcade/tempest/sfx/<name>.wav --remote --file tools/pokey-bake/out/<name>.wav`. Affects `src/shell/audio.ts` + R2. **Must be hosted before merge.** *Found by Dev during implementation.*
- **Question** (non-blocking): Authenticity is engine-validated (the streaming interpreter reproduces all six 6-6 sounds bit-for-bit) and disassembly-confirmed (identity via labelled call sites), but **by-ear confirmation is still pending the user** — the baked WAVs are at `tools/pokey-bake/out/*.wav` for listening. Affects `tools/pokey-bake/sfx-data.mjs`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): spike-shot, extra-life, pulsar-hum are baked + (to be) hosted but **left unwired** — no `spike-shot` / `extra-life` / pulsar-sound `GameEvent` exists in `src/core/` (and core is out of scope per AC#4). Follow-up: emit those core events so the authentic bakes can be wired. Affects `src/core/events.ts` + `src/main.ts` (future). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (BLOCKING merge): `playerDeath` now references `player_explosion.wav`, not yet on R2 — merging silences player-death (regression from hosted `shipexplosion.wav`). Affects `src/shell/audio.ts:33` (host the new bakes on R2 before merge). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the new ALSOUN streaming engine (`expandStream`/`streamVoice`) has no direct regression test — only the coarse `peak>200` integration bake; the "bit-for-bit validated" claim is unautomated. Affects `tools/pokey-bake/bake-sfx.mjs` + `tools/pokey-bake/bake-sfx.test.mjs` (add a test re-baking a 6-6 sound via `expandStream` and comparing to `expandAlsoun`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `player_explosion` rom assertion is vacuous (`toMatch` any 4-hex) — pin it to `toBe('$cbf5')`; structural test should bound-check stream start indices; inner `for(;;)` in `streamVoice` should get a defensive iteration guard. Affects `tools/pokey-bake/bake-sfx.test.mjs` + `bake-sfx.mjs`. *Found by Reviewer during code review.*

## Design Deviations

None at setup.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Required a structured `DEFERRED` export instead of prose deferral notes**
  - Spec source: context-story-6-11.md, AC#1 + AC#3
  - Spec text: "any without a confirmable address explicitly noted" / "any without a trigger explicitly scoped or deferred with a documented reason"
  - Implementation: The accountability test requires `sfx-data.mjs` to export `DEFERRED = [{ name, reason }, ...]` so each of the 7 catalogued sounds is testably accounted for (delivered or deferred). Story 6-10 satisfied the same kind of clause with a prose comment.
  - Rationale: A prose comment is not testable and can silently rot; a structured, asserted manifest makes "explicitly noted" enforceable and tells Dev exactly what shape to deliver. 6-11 defers up to six sounds (vs 6-10's one), so the bookkeeping warrants structure.
  - Severity: minor
  - Forward impact: `sfx-data.mjs` gains a `DEFERRED` export; future SFX stories should keep it current.
- **Deterministic RED tests scoped to player-explosion + accountability, not per-sound bake/wiring for all 7**
  - Spec source: context-story-6-11.md, AC#1, AC#2
  - Spec text: "ALSOUN envelope data for the 7 remaining catalogued SFX extracted... confirmed by ear" / "Baked to WAV (no SILENT warnings) and hosted on R2"
  - Implementation: Per-sound ROM addresses and audibility are confirmed by ear (manual) — I did not (and cannot) hardcode unknown addresses. Instead: (a) `player_explosion` has firm RED tests (data entry + manifest swap), (b) a guardrail bakes EVERY delivered SFX non-silent, (c) accountability ensures none of the 7 is silently dropped. R2 upload is not unit-tested (network/integration).
  - Rationale: Writing tests against ROM addresses I haven't extracted would be vacuous or wrong. The by-ear and hosting steps are inherently manual and belong to Dev verification + Reviewer, not unit tests.
  - Severity: minor
  - Forward impact: Reviewer/manual verification must confirm by-ear authenticity and that uploaded WAVs are reachable on R2.
- **Refactored two existing 6-6 tests for the expanded catalogue**
  - Spec source: tools/pokey-bake/bake-sfx.test.mjs (6-6 baseline)
  - Spec text: 6-6's `expect(map).toEqual(IN_SCOPE)` locked the data set to exactly six sounds; the bake loop iterated that hardcoded list.
  - Implementation: Changed the exact-match assertion to a baseline regression floor (every 6-6 sound still present at its address) and changed the bake loop to iterate ALL of `SFX` (so 6-11's additions must also bake non-silent).
  - Rationale: The exact-match test would throw a false failure the moment Dev adds a 7th sound; the hardcoded bake list would skip new sounds. Both needed to evolve with scope. Intent (regression protection + audibility) is preserved and strengthened.
  - Severity: minor
  - Forward impact: none — tests now auto-cover future SFX additions.

### Dev (implementation)
- **Delivered 4 of the 7, deferred 3 (vs the story's "7 remaining" framing)**
  - Spec source: context-story-6-11.md, AC#1/AC#3
  - Spec text: "the 7 remaining catalogued SFX extracted... any without a confirmable address explicitly noted / deferred with a documented reason"
  - Implementation: Delivered spike_shot, player_explosion, extra_life, pulsar_hum. Deferred pulsar_active (bakes silent — single per-pulse-beat blip, AUDC volume nibble 0), zoom_start (identical ROM record to the shipped warp.wav), slam (identical record to countdown_beep; no slam/tilt switch in a browser clone). All addresses ARE confirmed; deferrals are about bake-ability / duplication / triggers, not unknown data.
  - Rationale: AC#3 explicitly permits documented deferral. Delivering pulsar_active would fail the non-silent bake; zoom_start/slam would duplicate existing WAVs. Each is recorded in the `DEFERRED` export with its reason.
  - Severity: minor
  - Forward impact: "13 catalogued SFX" target is now 10 delivered + 3 documented duplicates/un-bakeable; no further extraction owed.
- **Re-implemented the ALSOUN streaming engine instead of the simple 6-byte model**
  - Spec source: context-story-6-11.md, AC#1 ("same method as 6-6")
  - Spec text: "Extract the ALSOUN envelope data ... with the same method as 6-6 (see tools/pokey-bake/sfx-data.mjs)"
  - Implementation: 6-6's `{audf:[6],audc:[6]}` model only fits clean single-note records. player_explosion/extra_life/pulsar_hum are multi-note streams, so I added a faithful `update_sounds` interpreter (`expandStream`) + embedded the authentic `Lcbd1` data region. The "same method" (extract from ROM, bake via web-pokey, host on R2) is preserved; the data representation is extended.
  - Rationale: The simple model cannot represent these sounds; faking single records would produce wrong audio. The interpreter is validated bit-for-bit against the six 6-6 sounds, so it cannot have silently changed their output.
  - Severity: minor
  - Forward impact: `sfx-data.mjs` now has two SFX shapes (`alsoun` vs `stream`); `bake-sfx.mjs` handles both. Future sounds pick whichever fits.
- **Updated TEA's structural test to accept the streaming shape**
  - Spec source: tools/pokey-bake/bake-sfx.test.mjs ("encodes every SFX as a pair of 6-byte ALSOUN records")
  - Spec text: TEA's test asserted every SFX has a 6-byte `spec.alsoun.audf`/`audc`.
  - Implementation: Generalised it to require exactly one of `alsoun` (6-byte checks) or `stream` (valid start indices into `ALSOUN_STREAM`), keeping name/rom/gain checks for all. The title now reads "encodes every SFX as a clean ALSOUN record OR a streaming envelope."
  - Rationale: TEA's test premise (all sounds are clean 6-byte records) was incomplete — the ROM proved otherwise. The generalised test still fully validates both shapes; it does not weaken coverage.
  - Severity: minor
  - Forward impact: none — the structural guarantee now spans both representations.

### Reviewer (audit)
- **TEA — DEFERRED export contract** → ✓ ACCEPTED: a structured, asserted deferral manifest is stronger than 6-10's prose; directly enforces AC#1/#3 "explicitly noted."
- **TEA — RED scoped to player-explosion + accountability** → ✓ ACCEPTED: correct call not to hardcode unknown addresses; by-ear/R2 are inherently manual. (But see [MEDIUM] below — once the address WAS confirmed ($cbf5), the test should pin it, not regex-match.)
- **TEA — refactored two 6-6 tests for expanded scope** → ✓ ACCEPTED: regression floor + all-SFX bake loop preserve and strengthen intent.
- **Dev — delivered 4, deferred 3** → ✓ ACCEPTED: deferrals are sound (pulsar_active bakes silent — verified AUDC vol nibble 0; zoom_start = warp duplicate; slam = countdown record + no browser trigger). Each documented in DEFERRED.
- **Dev — re-implemented the ALSOUN streaming engine** → ✓ ACCEPTED with reservation: the extension is necessary and the addressing logic is sound, but the engine itself is under-tested (see [MEDIUM] in assessment).
- **Dev — updated TEA's structural test for the streaming shape** → ✓ ACCEPTED: generalising to "clean OR stream" was required by reality; coverage not weakened (though bounds-check gap noted as [MEDIUM]).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (GREEN) | 0 blockers (5 observations) | confirmed 0, noted 5 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 (2 high-conf, 1 med, 1 low) | confirmed 3, deferred 1 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (low) across 32 rules / 89 instances | confirmed 1 |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 HIGH (merge-readiness, reviewer-found), 3 MEDIUM (test hardening), 2 LOW; 0 Critical.

### Rule Compliance

Exhaustive check by reviewer-rule-checker (JS + TS lang-review checklists) — 32 rules, 89 instances, **1 violation** (ADD-5, low). Key results, confirmed by my own read of the diff:
- **JS-4 / equality (ADD-3):** every comparison in `streamVoice`/`expandStream` uses `===`/`!==` (verified lines 126/129/131/140/142). ✓
- **JS-9 / scope (ADD-4):** no `var`; all `const`/`let`. `SFX.push(...)` mutates the exported array at module-eval time — safe (synchronous ESM; no circular import). ✓
- **JS-1/10 / errors:** `streamByte` bounds-checks both ends and returns `0x00` sentinel (no throw, no swallow). ✓
- **JS-6 / Node:** test uses `execFileSync` with array args (not `exec` string interpolation). ✓
- **CLAUDE.md hard boundary (ADD-1):** zero `src/core/` files in the diff. ✓ (AC#4)
- **MIT attribution (ADD-2):** attribution test block + bake header credit untouched. ✓ (AC#4)
- **ADD-5 (the one violation):** inner `for(;;)` in `streamVoice` is unbounded — see [LOW][RULE] below.
- **TS (audio.ts):** the change is a single string-literal swap inside `SOUNDS as const`; no `as any`, no type escape, `SoundName` union unchanged. ✓

## Reviewer Assessment

**Verdict:** REJECTED (one [HIGH] merge-readiness blocker + recommended [MEDIUM] test hardening; the runtime game code itself is correct)

The shipped game change is minimal and sound — a one-line manifest swap plus authentic ROM-derived bake data and a build-time engine. The reverse-engineering is impressive and well-documented. But two things must be resolved before this is mergeable, and a third class of finding (test hardening) should be closed because the new engine is the story's centerpiece.

**Observations (tagged):**
- `[VERIFIED]` Architectural boundary intact — diff touches zero `src/core/` files; only `src/shell/audio.ts` (1-line swap), `tools/pokey-bake/*`, tests, docs, `.gitignore`. Complies with CLAUDE.md hard boundary + AC#4. `[RULE]` ADD-1 confirms.
- `[VERIFIED]` No regression to the 6-6 sounds — preflight bake peaks for the original six are byte-identical to pre-change (player_fire 0.240, enemy_fire 0.346, warp 0.311, …); the clean `expandAlsoun` path is untouched; `BASELINE_6_6` guards their addresses.
- `[VERIFIED]` web-pokey MIT attribution retained — `[RULE]` ADD-2; AC#4 met.
- `[HIGH]` **Merge-readiness:** `src/shell/audio.ts` now points `playerDeath` → `player_explosion.wav`, which is **not yet hosted on R2**. Merging as-is silences player-death in the live game (regression from the hosted `shipexplosion.wav`). Identical to 6-6's [HIGH]. **Fix: host the new bakes on R2 before merge.** at `src/shell/audio.ts:33`.
- `[MEDIUM]` `[TEST]` The streaming engine (`expandStream`/`streamVoice`, ~60 lines of NMI emulation) has **no direct unit test** — only the integration bake's `peak>200` check. The "validated bit-for-bit against the six 6-6 sounds" comment is not automated; a wrong-but-audible regression (broken odd-nibble masking or restart logic) would pass. Fix: add a test that re-bakes ≥1 6-6 sound through `expandStream` (via its `ALSOUN_STREAM` start indices) and asserts its event list equals `expandAlsoun`'s for the same sound, at `tools/pokey-bake/bake-sfx.mjs:119`.
- `[MEDIUM]` `[TEST]` `player_explosion` rom assertion is vacuous — `toMatch(/^\$[0-9a-f]{4}$/)` passes for any 4-hex address, leaving the headline deliverable's authentic `$cbf5` unguarded (unlike the 6-6 sounds' exact `toBe`). Fix: `expect(pe.rom).toBe('$cbf5')` at `tools/pokey-bake/bake-sfx.test.mjs:187`.
- `[MEDIUM]` `[TEST]` Structural test doesn't verify stream start indices land within `ALSOUN_STREAM` bounds (`streamByte` silently returns `0x00` OOB), at `tools/pokey-bake/bake-sfx.test.mjs:71`.
- `[LOW]` `[RULE]` Inner `for(;;)` in `streamVoice` is unbounded — safe for current data (no jump cycles; `streamByte` OOB→0 terminates for `Lc0≥112`; bake test has a 60s timeout), but a defensive counter would make the invariant explicit, at `tools/pokey-bake/bake-sfx.mjs:134`.
- `[LOW]` `[TEST]` Deferral-reason check (`>10` chars) is weak — could be tightened to require a concrete detail.
- `[VERIFIED]` Streaming addressing logic sound — independently traced `addr = $cbcf + 2·v` against the rom-map doc; note-record reads line up with the disassembly.

**Disabled-subagent tags (no coverage this run, per settings):** `[EDGE]` disabled, `[SILENT]` disabled, `[DOC]` disabled, `[TYPE]` disabled, `[SEC]` disabled, `[SIMPLE]` disabled. I spot-checked these domains myself: no silent-failure or type issues in the 1-line TS swap; security N/A (no user input — all indices are internal, hardcoded data); simplification — the `SFX.push` split is slightly awkward but acceptable.

**Data flow traced:** core emits `player-death` → `main.ts` `case 'player-death': audio.play('playerDeath')` → `SOUNDS.playerDeath = 'player_explosion.wav'` → `fetch(R2 + 'player_explosion.wav')` → decode → play. Safe at the code level (hardcoded const, no user input); the terminal `fetch` resolves to an R2 asset that **must exist** — the [HIGH].

### Devil's Advocate

Argue this is broken: (1) The "bit-for-bit validated" claim covers note-record *reading*, but the full per-tick ramp + AUDC odd-nibble-mask expansion in `streamVoice` is only exercised by the coarse `peak>200` bake — a transposed nibble would ship a wrong *timbre* that the integration test can't catch. Mitigation: by-ear confirmation is pending (and `enemy_fire`'s 9-step audc ramp does exercise the masking path, and reproduced correctly). (2) `player_explosion`'s identity rests entirely on the `pieces_death → sound_Lccb0` disassembly call-site analysis; if that mapping is wrong we ship the wrong sound under an authentic-looking `$cbf5` label — again gated by by-ear. (3) Merging now silences player-death (asset unhosted) — concrete regression. (4) spike_shot/extra_life/pulsar_hum are baked but unwired AND unhosted — if a later story wires them expecting R2 assets, they 404 silently (the engine degrades to silence by design). (5) The inner loop is theoretically unbounded; a future ROM-data edit with a jump cycle would hang the build (caught only by the 60s test timeout). (6) A future dev adding a streaming sound with a bad start index gets a silent `streamByte→0` failure with no guard. Net: the runtime is minimal and correct; risk concentrates in deployment ordering [HIGH] and regression-hardening of the new engine [MEDIUM].

**Handoff:** Blockers are user-gated (R2 hosting + by-ear) and test-hardening — see the closing note to the user. Recommended rework owner for the [MEDIUM]/[LOW] test items: TEA (red).

### Re-Review (rework cycle — 2026-06-28)

Rework ran TDD: **TEA (red) → Dev (green) → Reviewer (re-review)**. All three test-hardening findings from the first pass are now **RESOLVED**; verified independently (not just from subagent reports).

**What changed (uncommitted working tree; 2 files):**
- `tools/pokey-bake/bake-sfx.mjs`: `export`ed `expandAlsoun`/`streamVoice`/`expandStream`; wrapped the top-level bake in `if (process.argv[1] === fileURLToPath(import.meta.url))` so importing the module is inert (import cost 3.5s → 32ms); added a defensive `ADVANCE_CAP = ALSOUN_STREAM.length` guard to the inner advance `for(;;)` in `streamVoice` (degrades to "stop the voice" if ever exceeded — never hit by current data).
- `tools/pokey-bake/bake-sfx.test.mjs`: +5 tests in a new "streaming engine parity" block, +`toBe('$cbf5')` address pin, +first-note in-bounds assertion in the structural test.

**Finding dispositions:**
- `[MEDIUM][TEST]` streaming engine had no direct test → **RESOLVED.** New parity tests drive the *same* sound (`enemy_fire`, embedded verbatim in `ALSOUN_STREAM` @ idx 116/122, start values `0x3b`/`0x3e`) through both `expandStream` and `expandAlsoun` and assert bit-for-bit event-list equivalence (modulo one trailing terminator, asserted+stripped). A **dedicated mask test** points an AUDC-masked voice at note `[0x40,0x01,0xff,0x40]` and proves the high (distortion) nibble stays pinned while the low (volume) nibble ramps — and that the *unmasked* voice does NOT pin it. This closes the devil's-advocate "transposed-nibble ships wrong timbre, integration test can't catch it" gap.
- `[MEDIUM][TEST]` vacuous `player_explosion` rom (`toMatch` any 4-hex) → **RESOLVED.** Pinned to `toBe('$cbf5')`.
- `[MEDIUM][TEST]` stream start indices not bounds-checked → **RESOLVED.** Structural test now asserts the first-note window (`2*v-2 .. 2*v+1`) lands within `ALSOUN_STREAM`. (Scoped to the first note by design: a bad *first* index is the catastrophic silent-failure mode; later OOB reads degrade gracefully via `streamByte→0x00→beats==0→stream ends`.)
- `[LOW][RULE]` unbounded inner `for(;;)` → **RESOLVED.** Bounded with `ADVANCE_CAP`.
- `[LOW][TEST]` weak deferral-reason check → not addressed (cosmetic; left as-is per scope of decision #1).

**Independent verification (Reviewer-run):**
- `npm test` → **479 passed** (was 474 + 5 new). `npm test -- bake-sfx` → 13 passed, import 32ms.
- `npm run build` → `tsc --noEmit` + `vite build` both pass.
- Re-bake → all 10 SFX non-silent, **0 SILENT warnings**; the 7 pinned peaks (player_fire 0.240, enemy_fire 0.346, warp 0.311, spike_shot 0.123, player_explosion 0.308, extra_life 0.313, pulsar_hum 0.391) are **byte-identical** to pre-guard — confirming the iteration guard altered no sound.

**Re-Review Verdict:** **Code-level APPROVED.** Every code/test finding is closed; the runtime change remains a one-line manifest swap plus now-well-tested build-time tooling. **One blocker remains and it is user-gated, not a code defect:** `[HIGH]` `playerDeath → player_explosion.wav` must be hosted on R2 before merge or player-death goes silent in the live game. Per the user's plan, R2 upload happens only *after* by-ear confirmation of the baked WAVs (`tools/pokey-bake/out/*.wav`). Once the 4 new WAVs are hosted, this story is mergeable.

### By-Ear Confirmation + R2 Authorization (SM record — user, 2026-06-28)

The user (Comrade) auditioned the baked WAVs in `tempest/tools/pokey-bake/out/` and confirmed them by ear ("sounds good"). **The by-ear gate is cleared and R2 upload is authorized.** SM is handing back to the reviewer (phase owner) to execute the remaining merge-readiness steps, then return the baton to SM for the finish ceremony.

**Reviewer to execute on resume (then complete the review phase):**
1. **Host on R2** — upload the 4 new WAVs (wrangler authed as slabgorb@gmail.com), run from the orchestrator root:
   ```bash
   for s in player_explosion spike_shot extra_life pulsar_hum; do \
     wrangler r2 object put arcade/tempest/sfx/$s.wav --remote --file tempest/tools/pokey-bake/out/$s.wav; done
   ```
2. **Commit the rework** — the 2 uncommitted files (`tools/pokey-bake/bake-sfx.mjs`, `tools/pokey-bake/bake-sfx.test.mjs`).
3. **Push** branch `feat/6-11-pokey-sfx-remaining-7` + **open PR → `develop`**.
4. **Verify** the `[HIGH]` is cleared (asset reachable on R2), render final **APPROVED**, complete the review phase → hand to SM.

**Then SM finish:** merge PR, archive session, update sprint tracking, `chore(sprint): complete 6-11`, push `develop`. (Per [[finish-merge-gotcha]]: `pf sprint story finish` does NOT merge the PR — SM must merge manually and verify a story file landed on `origin/develop`.)

### Final Approval — review phase COMPLETE (reviewer, 2026-06-28)

By-ear gate cleared by user; reviewer executed the merge-readiness steps:
- **R2 hosting DONE + verified.** Uploaded `player_explosion.wav`, `spike_shot.wav`, `extra_life.wav`, `pulsar_hum.wav` to `arcade/tempest/sfx/`. All four return **HTTP 200, `audio/wav`** on the live `https://arcade-assets.slabgorb.com/tempest/sfx/` domain with byte sizes matching the local bakes (93356 / 3884 / 114860 / 155180). `warp.wav` control = 200. **The `[HIGH]` is cleared — player-death is not silenced by this merge.**
- **Rework committed:** `7407913 test(6-11): harden streaming engine — direct parity tests + guards`.
- **Branch pushed; PR opened:** [tempest#55](https://github.com/slabgorb/tempest/pull/55) → `develop`.

**FINAL VERDICT: APPROVED.** No open blockers. Every code/test finding closed, the streaming engine now has direct + mask coverage, 479 tests green, build clean, the runtime asset is live. Handing off to SM (Winston Smith) for the finish ceremony (merge #55 → develop, archive, sprint update).