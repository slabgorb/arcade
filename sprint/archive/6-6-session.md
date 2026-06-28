---
story_id: "6-6"
jira_key: "6-6"
epic: "6"
workflow: "tdd"
---
# Story 6-6: Bake & wire authentic POKEY SFX from ROM (incl. enemy-fire)

## Story Details
- **ID:** 6-6
- **Epic:** 6 — Wave 6 — Playtest feel & balance
- **Jira Key:** 6-6 (local tracking, no Jira integration)
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd (phased: setup → red → green → review → finish)
- **Repos:** tempest
- **Status:** ready

## Acceptance Criteria

1. Numeric POKEY envelope data for the 13 catalogued SFX extracted from the rev-3 source and encoded in `tools/pokey-bake/sfx-data.mjs` (register-event format; envelope timing at the ~246 Hz IRQ, step/246 s).
2. SFX baked to WAV via `tools/pokey-bake/bake-sfx.mjs` (no SILENT warnings) and hosted on R2.
3. Enemy-fire bolt sound produced and wired to the enemy-fire event (pairs with 6-5).
4. Existing R2 SFX set audited vs the catalog; gaps filled (priority enemy-fire; secondary segment-tick, spike-shot, pulsar hum/active).
5. Shell/asset-only: `src/core/` pure simulation untouched; web-pokey MIT attribution retained.

## Technical Approach

### Tempest Audio Architecture
- **No PCM samples** — all audio is live POKEY synthesis via 2× POKEY chips
- **13 catalogued SFX** from rev-3 ROM (table `Lcb01` @ line 16867):
  - segment-tick, player-fire, **enemy-fire**, spike-shot, enemy-death, player-explosion
  - pulsar-hum, pulsar-active, zoom-start, zoom-through/level-clear, countdown-beep, extra-life, slam
- **Timing:** Envelopes driven by ~246 Hz sound IRQ (not 60 Hz game frame)
  - Envelope step N maps to time ≈ N/246 s
  - ROM: table `Lcbd1` holds target/duration/ramp triples; streamed to AUDF/AUDC

### Production Pipeline (web-pokey bake tool)
- **Tool exists:** `tools/pokey-bake/` (vendored web-pokey POKEY core, MIT; headless Node)
- **Bake utility:** `bake-sfx.mjs` — produces 16-bit 48kHz mono WAV from register sequences
- **Data file:** `sfx-data.mjs` — register-event format (register state changes + timings)
- **Hosting:** R2 (`arcade-assets.slabgorb.com/tempest/sfx/`)

### Key Assets
- **Reference doc:** `docs/ux/2026-06-27-tempest-arcade-feel-reference.md` (Sound section; line 172+)
- **Enemy roster:** `docs/ux/2026-06-27-enemy-roster-rom-extract.md` (enemy-fire details)
- **Existing bake tool:** `tools/pokey-bake/` (README.md, vendor/, bake-sfx.mjs, sfx-data.mjs placeholder)

### Story Dependencies
- **Depends on:** Story 6-5 (enemy-fire event wiring) — this story produces the sound to pair with that event
- **Pairs with:** Story 6-5 (enemies fire bolts); story also fills R2 gaps for secondary SFX

## Sm Assessment

**Routing:** setup → **red (TEA)**. Phased tdd workflow, single repo (`tempest`), branch `feat/6-6-pokey-sfx-bake` on `develop`. Merge gate clear (no open tempest PRs). Local tracking, no Jira.

**Story shape:** Audio production + integration, 3pts. Most of the heavy lifting (the bake tool, vendored POKEY core, WAV pipeline) **already exists** at `tools/pokey-bake/` — this is not a from-scratch build. The remaining work is (a) extract numeric envelope data into `sfx-data.mjs`, (b) bake to WAV, (c) host on R2 + wire/audit, prioritizing the **enemy-fire** bolt that pairs with 6-5.

**What TEA should weigh for RED:** This is shell/asset-only by AC#5 — `src/core/` stays untouched, so tests live in the shell/audio + tooling layer. Testable surfaces likely include: the `sfx-data.mjs` envelope encoding (structure/validity, 13 entries, 246 Hz step→time mapping), the bake producing non-silent valid WAV, and the wiring of the enemy-fire event → its baked asset. R2 hosting and live audio audit (AC#2/#4) are partly external/manual — TEA to decide what's genuinely test-coverable vs. verified by inspection, and flag any AC that can't carry a failing test.

**Dependencies:** Pairs with **6-5** (enemy-fire event). Confirm 6-5's event hook exists/lands so AC#3 wiring has something to bind to; if 6-5 isn't in place, that's a coordination flag, not a blocker for the data/bake work.

**Reference material is rich** — don't re-derive ROM facts: `docs/ux/2026-06-27-tempest-arcade-feel-reference.md` (Sound section, line 172+) and `docs/ux/2026-06-27-enemy-roster-rom-extract.md`.

## SM Update — Rebase onto develop (2026-06-28)

Branch `feat/6-6-pokey-sfx-bake` rebased onto `origin/develop @ d70afcf` (0/0 divergence). Picked up #45 safe-respawn, **#46 "Enemies fire energy bolts" (the enemy-fire event — the "6-5" dependency)**, #47 enemy/bolt shapes, and 6-7 geometry. One conflict in `src/shell/audio.ts`, resolved by keeping both sides (6-6 restructure + upstream's `enemyFire` key). `tsc --noEmit` clean.

**State for TEA's RED phase:**
- **AC#3 dependency is now satisfied** — #46 added the `enemy-fire` event call in `main.ts` and the `enemyFire` SOUNDS key, so the event is wired end-to-end (currently to R2 `enemyfire.wav`). Remaining AC#3 work: repoint `enemyFire` to the authentic bake (`enemy_fire.wav`) — a deliberate wiring step, intentionally NOT done during the mechanical rebase.
- All 6-6 work is **uncommitted** in the working tree: `src/shell/audio.ts`, `tools/pokey-bake/{README.md,bake-sfx.mjs,sfx-data.mjs}`.
- User decision (2026-06-28): **formalize tests (TEA RED)** rather than commit/PR the spike directly.
- AC#2/#4 R2 hosting + audit are gated on user creds; segment_tick + countdown_beep deferred to new story 6-10.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes

**Test Files:**
- `tests/shell/audio.test.ts` — audio engine dual-source URL resolution (authentic ROM bakes served locally vs community rips on R2), custom-base resolution, the AC#3 enemy-fire authentic-bake wiring (the failing test), engine readiness, and the `main.ts` enemy-fire event→sound wiring (via `?raw`, browser-pure).
- `tools/pokey-bake/bake-sfx.test.mjs` — AC#1 ALSOUN envelope-data shape (6-byte audf/audc records, stop terminator, 0–255 bytes, gain) + the confirmed sound→ROM map; AC#2 non-silent WAV bake driven through the real vendored web-pokey core (guards the documented merge-sort SILENT gotcha); AC#5 web-pokey MIT attribution. Authored as `.mjs` beside the tool so its `node:` imports stay out of the deliberately browser-pure TS test posture (tsconfig has no `@types/node`).

**Tests Written:** 12 tests (1 failing, 11 passing) across the 5 ACs
**Status:** RED — ready for Dev

The one genuinely-incomplete AC (the failing test) is **AC#3**: the enemy-fire bolt must play the AUTHENTIC bake served locally, but `enemyFire` still points at the R2 `enemyfire.wav` inherited from the #46 (6-5) hook. The other 11 are characterization/regression tests that lock in the already-built spike (data format, dual-source resolution, non-silent bake, attribution) — they pass now and guard the fragile audio work going forward.

### AC Coverage

| AC | Coverage | Status |
|----|----------|--------|
| #1 envelope data in sfx-data.mjs | data-shape + sound→ROM map (6 of 13 — see deviation) | passing |
| #2 non-silent WAV bake | end-to-end bake, peak > noise floor, no SILENT (R2 hosting untested — ops) | passing |
| #3 enemy-fire wired to baked asset | URL-resolution + event wiring | **failing (RED)** |
| #4 R2 set audited vs catalog | not test-covered — manual/ops (deviation) | n/a |
| #5 core untouched + MIT attribution | LICENSE + README attribution asserted; spike is shell/tooling only | passing |

**Self-check:** No vacuous assertions — every test asserts a concrete value/URL/peak. tsc --noEmit clean; no pre-existing tests broken (420 still pass).

### GREEN handoff to Dev (Walter)
1. Repoint `src/shell/audio.ts` `enemyFire` → `LOCAL + 'enemy_fire.wav'` (makes the AC#3 test green).
2. Bake + place the authentic `enemy_fire.wav` into `public/sfx/` so it actually sounds in-game (`node tools/pokey-bake/bake-sfx.mjs`, copy from `out/`). Gitignored — asset step, not a commit.
3. Out of GREEN scope (ops/follow-up): R2 hosting + the bare-filename flip (AC#2/#4, needs user creds); AC#1 re-scope (13→6) + remainder to 6-10 — flagged for SM/user.

**Handoff:** To Dev for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes (GREEN)

**Files Changed:**
- `src/shell/audio.ts` — repointed `enemyFire` from the R2 `enemyfire.wav` to the authentic local bake `/tempest/sfx/enemy_fire.wav` (ROM $cc45). One line; matches the other ★ entries.
- `public/sfx/enemy_fire.wav` — baked authentic asset placed (gitignored, not committed). All four ★ bakes (player_fire, enemy_fire, enemy_explosion, warp) now serve locally.

**Tests:** 421/421 passing (GREEN). The AC#3 failing test now passes; no pre-existing tests broken. `tsc --noEmit` exit 0.

**Branch:** `feat/6-6-pokey-sfx-bake` — committed locally (`feat` spike → `test` RED → `fix` GREEN), **NOT pushed** (held for user go-ahead; see Delivery Findings).

**Self-review:** enemy-fire wired end-to-end (core event → `main.ts` → `audio.play('enemyFire')` → authentic bake); follows the existing dual-source manifest pattern; `src/core/` untouched (AC#5); minimal change, no scope creep.

**Held for user decision before the workflow continues to review/finish:**
1. Push `feat/6-6-pokey-sfx-bake` + open PR to `develop`? (outward action)
2. AC#1 re-scope (13 catalogued → 6 delivered) — blocking finding; remainder to 6-10 + a new extraction story.
3. AC#2/#4 R2 hosting + audit — needs Cloudflare R2 credentials.

**Handoff:** Paused for user — outward/gated steps above are the user's call.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 smell + public/sfx-gitignored note | confirmed 1 (stale comment, LOW); elevated the gitignored-asset note to my HIGH merge finding |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 6 | confirmed 4 (MEDIUM); deferred 2 (LOW, non-blocking) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 1 | confirmed 1 (LOW, documented) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 | N/A — 29 rules / 91 instances / 0 violations |

**All received:** Yes (4 enabled returned; 5 disabled via `workflow.reviewer_subagents`)
**Total findings:** 1 HIGH (merge-readiness), 4 MEDIUM (test quality), 2 LOW (stale comment, vm sandbox); 0 dismissed; 2 deferred non-blocking.

## Reviewer Assessment

**Verdict:** APPROVED — initially REJECTED on a merge-readiness blocker, resolved in-session (see *Reviewer follow-up — R2 hosting resolved* below). The original rejection analysis is retained for the audit trail.

This was **not a code-quality rejection** — the rule-checker passed cleanly (0 violations across 29 rules), the core-purity boundary holds, tests are green, and `tsc` is clean. The blockers are **merge-readiness and incomplete ACs**, both of which require user/ops decisions, not Dev/TEA rework.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | Authentic-sound assets are **gitignored and not on R2**. This PR repoints `fire`/`enemyDeath`/`levelClear` (previously played from R2) **plus** new `enemyFire` to local `/tempest/sfx/*.wav`. Any env without the local bakes (CI build, fresh clone, the deploy box) 404s them → **3 previously-working sounds + enemy-fire go silent**. | `src/shell/audio.ts:32-40`; `.gitignore` (`sfx/` → `public/sfx`) | Make assets reproducible from the repo BEFORE merge: host bakes on R2 + flip audio.ts to bare R2 names (AC#2), OR commit the WAVs, OR add a bake-on-build step. |
| [MEDIUM] | AC#1 delivers 6 of 13 catalogued SFX (documented deviation). | `tools/pokey-bake/sfx-data.mjs` | Re-scope AC#1 (user/SM); track remainder → 6-10 + new extraction story. |
| [MEDIUM] | enemy-fire event→sound wiring tested only via a brittle `?raw` regex on main.ts (breaks on valid refactor; can't catch runtime breakage). | `tests/shell/audio.test.ts:97` | Non-blocking: extract the event-dispatch loop into a pure importable fn for a real behavioral test. |
| [MEDIUM] | No negative test for the silent-degradation path (a rejected fetch). | `tests/shell/audio.test.ts` | Non-blocking: stub a rejected fetch, assert `ready()` still true and no throw. |
| [MEDIUM] | merge-sort SILENT invariant guarded only via the integration subprocess; no unit test of `expandAlsoun`. Future `count=1` single-event data could pass even with the sort removed. | `tools/pokey-bake/bake-sfx.test.mjs:84` | Non-blocking: export `expandAlsoun`, unit-assert merged timestamps are non-decreasing. |
| [LOW] | Stale `// AC#3 (RED) … fails until Dev repoints` comment — test is now green. | `tests/shell/audio.test.ts:73-76` | Trivial comment cleanup. |
| [LOW] | `node:vm` is not a security sandbox (trusted committed vendor file). | `tools/pokey-bake/bake-sfx.mjs:52` | Document the limitation. |

**Data flow traced:** core `GameEvent {type:'enemy-fire'}` → `main.ts:75` switch → `audio.play('enemyFire')` → `SOUNDS.enemyFire = '/tempest/sfx/enemy_fire.wav'` → `fetch(url)`. Safe at the code level (hardcoded const, no user input), but the terminal `fetch` resolves to a **gitignored local asset** → 404/silent anywhere the bake hasn't been run. This is the [HIGH].

**Findings by source:**
- `[RULE]` rule-checker — CLEAN. 29 rules, 91 instances, 0 violations. Core purity (no shell→core, no DOM/Date.now in core) intact; strict TS + `.mjs`-beside-tooling honored.
- `[SEC]` security — 1 LOW: `node:vm` is not a sandbox (vendored file is trusted/committed → acceptable; document). URL resolution carries no injection/SSRF (SOUNDS `as const`; `createAudioEngine()` no-arg in prod — `main.ts:38`); `execFileSync` uses an arg array; no secrets introduced.
- `[TEST]` test-analyzer — 4 MEDIUM (brittle wiring test, narrow fetch-stub type, missing rejected-fetch test, expandAlsoun sort-invariant only integration-guarded) + 2 LOW deferred (peak>200 threshold weak; protocol-relative URL boundary untested). No `as any`; imports from `src/`; `toContain`/`toEqual(IN_SCOPE)` assertions genuine.
- `[EDGE]` edge-hunter — DISABLED via settings; manual check: URL regex boundaries (rooted `/…`, bare, absolute `https://`, protocol-relative `//`) classify correctly; `buffers.get()` null-checked (`audio.ts:121`); `ctx` null-guarded before `.state` (`audio.ts:115`).
- `[SILENT]` silent-failure-hunter — DISABLED; manual check: the `fetch().catch()` and AudioContext `catch` are intentional, documented graceful degradation. The one consequential silence is the gitignored-asset 404 (the [HIGH]) — not a swallowed error but a missing asset.
- `[DOC]` comment-analyzer — DISABLED; manual check: `README.md` accurately rewritten to the ALSOUN format; one stale test comment (the [LOW]).
- `[TYPE]` type-design — DISABLED; manual check: `SOUNDS as const` + `SoundName = keyof typeof SOUNDS` union (well-typed, not stringly); `Object.keys(...) as SoundName[]` is the necessary idiom; no unsafe casts.
- `[SIMPLE]` simplifier — DISABLED; manual check: `expandSeq` looping math (`bake-sfx.mjs:80`) is dense but acceptable for a one-shot build tool; no dead code in shipped paths; `spec` mutation is immaterial for a single-run CLI.

### Devil's Advocate

Assume this is broken. The most damning case is real: **the feature's assets do not ship.** `public/sfx/` is gitignored, nothing in `npm run build` runs the bake, and the bakes aren't on R2 — so the authentic sounds exist only on the one machine where someone manually ran `bake-sfx.mjs`. Merge this to `develop` and the next clean CI build or deploy produces a game where `fire`, `enemy-death`, and `level-clear` — which **worked before** via R2 `shot.wav`/`explo.wav`/`getwarp.wav` — are now silent, alongside the new enemy-fire. The audio engine swallows the 404s, so nothing errors; the regression is invisible until someone notices the cabinet went quiet. A confused maintainer doing a fresh checkout sees passing tests (the unit test mocks `fetch`) and a silent game, with no failure pointing at the cause. The `?raw` wiring test compounds the false confidence: it asserts a *string* in main.ts, so it stays green even if the dispatch never runs, if `audio` is undefined at that scope, or if the event type is renamed in core. The merge-sort guard is similarly conditional — it only fails loudly for data that *requires* interleaving; a future single-event envelope would let a removed sort slip through. And the bake itself mutates the shared imported `spec` objects, so any future code that imports `SFX` and bakes twice in one process gets contaminated state. None of these are crashes — which is exactly why they're dangerous: a game that silently loses its sound and a test suite that stays green is the worst combination for a regression. The code is clean; the *deliverability* is not.

**Handoff:** Paused for user — the blockers (asset hosting/commit strategy + AC#1 re-scope) are user/ops decisions, not Dev/TEA rework. See the user-facing summary.

### Reviewer follow-up — R2 hosting resolved (verdict → APPROVED)

User chose "Host on R2 now." Completed in-session (binaries belong in R2 per the user, not the repo):
- **AC#4 audit** (HTTP HEAD on `arcade-assets.slabgorb.com/tempest/sfx/`): community rips present; authentic names + `enemyfire.wav` were 404. Confirms the pre-spike sounds played from `shot/explo/getwarp`.
- **Uploaded** all 6 authentic bakes to the R2 `arcade` bucket at `tempest/sfx/` via `wrangler r2 object put --remote` (player_fire, enemy_fire, enemy_explosion, warp, countdown_beep, segment_tick) — verified 200 with correct sizes. (countdown_beep + segment_tick pre-stage 6-10.)
- **`src/shell/audio.ts`**: flipped all authentic entries to bare R2 filenames; removed the interim `LOCAL` const + rooted-URL regex (now dead). Every sample resolves against the R2 base again.
- **`tests/shell/audio.test.ts`**: rewritten to the R2 end-state; added a rejected-fetch silent-degradation test (addresses a MEDIUM finding). 422/422 pass, `tsc` clean.
- Commit `5560ed9` pushed to PR #48.

**[HIGH] merge-blocker — RESOLVED.** **[MEDIUM]** test-quality items: rejected-fetch ✓ added; `expandAlsoun` unit test + main.ts dispatch extraction left as non-blocking follow-ups. **[LOW]** stale RED comment removed in the rewrite.

**Revised verdict:** APPROVED. No Critical/High remaining. AC#2/#3/#4/#5 satisfied; only **AC#1 (6 of 13)** remains — a scope decision for the user/SM before story finish (re-word AC#1 to the delivered 6; remainder → 6-10 + a new extraction story).

## Deferral Inventory (story 6-6 → tracked follow-ups)

Every deferral surfaced during 6-6 and where it is now tracked. Nothing dropped.

**SFX catalog — AC#1 "13 catalogued" delivered as 6:**
- Delivered + wired (4): player-fire, enemy-fire, enemy-death (enemy_explosion), level-clear (warp). On R2.
- Baked + R2-hosted, no game trigger yet (2) → **story 6-10**: segment-tick ($cc39), countdown-beep ($cc69).
- Not yet extracted from ROM (7) → **story 6-11**: spike-shot, player-explosion, pulsar-hum, pulsar-active, zoom-start, extra-life, slam.

**Review follow-ups (non-blocking) → story 6-12:**
- Export `expandAlsoun` + unit-test the merge-sort non-decreasing-timestamp invariant (only integration-guarded now).
- Extract main.ts event→sound dispatch into a pure importable fn for a real behavioral test (replace the brittle `?raw` match).
- Derive a meaningful bake-test audibility threshold (peak>200 is weak) or assert the bake's reported peak.
- Document `node:vm` is not a sandbox in the bake tool.

**Resolved in-session (NOT deferred):** AC#2 R2 hosting ✓; AC#4 R2 audit + available gaps filled ✓; AC#3 authentic enemy-fire wiring ✓; rejected-fetch degradation test added ✓; stale RED comment removed ✓; protocol-relative-URL finding moot (dual-source machinery removed).

**AC re-scope:** 6-6 AC#1 re-worded to the delivered 6 (remainder → 6-10/6-11); AC#4 annotated (audit done; secondary extraction gaps → 6-11).

**Separate flag (not a 6-6 deferral):** lobby subrepo git origin fetch fails — unrelated to 6-6, still open.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T10:10:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T22:52:56Z | 2026-06-27T22:55:40Z | 2m 44s |
| red | 2026-06-27T22:55:40Z | 2026-06-28T09:06:20Z | 10h 10m |
| green | 2026-06-28T09:06:20Z | 2026-06-28T09:14:21Z | 8m 1s |
| review | 2026-06-28T09:14:21Z | 2026-06-28T10:10:32Z | 56m 11s |
| finish | 2026-06-28T10:10:32Z | - | - |

## Delivery Findings

### TEA (test design)
- **Gap** (blocking): AC#1 specifies 13 catalogued SFX but `sfx-data.mjs` delivers 6 (the confirmed-address subset). Affects `tools/pokey-bake/sfx-data.mjs` (re-scope AC#1 to the delivered 6 and track the rest: segment_tick + countdown_beep have data but no trigger → story 6-10; spike-shot, pulsar-hum, pulsar-active, player-explosion, zoom-start, extra-life, slam need extraction → new story). *Found by TEA during test design.*
- **Gap** (non-blocking): the AC#3 unit test mocks `fetch`, so it verifies wiring only — the authentic asset must exist at `public/sfx/enemy_fire.wav` for sound to actually play in-game. Affects `tempest/public/sfx/` (gitignored) — Dev must bake and copy `enemy_fire.wav` locally (and host on R2 per AC#2). *Found by TEA during test design.*
- **Question** (non-blocking): AC#2/#4 R2 hosting + audit need the user's Cloudflare R2 credentials; the audio.ts authentic entries currently use local `/tempest/sfx/` paths and must be flipped to bare R2 filenames once hosted. Affects `src/shell/audio.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the GREEN change is committed locally but NOT pushed, and no PR is open — held for the user's go-ahead per tempest CLAUDE.md ("don't commit/push unless asked") and because outward steps below are user-gated. Affects branch `feat/6-6-pokey-sfx-bake` (needs `git push` + PR to `develop`). *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's asset gap is resolved — `enemy_fire.wav` baked (peak 0.346) and placed in `public/sfx/`, so all four ★ authentic bakes now serve locally; but the asset is gitignored, so it only exists in this checkout until hosted on R2. Affects `tempest/public/sfx/`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): authentic-sound assets are gitignored and not on R2, so merging silences `fire`/`enemy-death`/`level-clear` (previously played from R2) + new enemy-fire in any clean build/deploy. Affects `src/shell/audio.ts` + `.gitignore` (make assets reproducible from the repo: R2-host + flip to bare names, commit the WAVs, or bake-on-build). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the enemy-fire wiring is only asserted via a `?raw` text match on main.ts; extracting the shell event-dispatch loop into a pure importable function would allow a real behavioral test (and a rejected-fetch negative test). Affects `src/main.ts` / `tests/shell/audio.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `expandAlsoun`'s merge-sort SILENT invariant is only integration-guarded; export it and unit-assert non-decreasing timestamps. Affects `tools/pokey-bake/bake-sfx.mjs` / `bake-sfx.test.mjs`. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **AC#1 partial coverage — 6 of the 13 catalogued SFX**
  - Spec source: context-story-6-6.md, AC#1
  - Spec text: "Numeric POKEY envelope data for the 13 catalogued SFX extracted from the rev-3 source and encoded in tools/pokey-bake/sfx-data.mjs"
  - Implementation: Tests assert exactly the 6 SFX with a confirmed sound→ROM address (player_fire $cc5d, enemy_fire $cc45, enemy_explosion $cc81, warp $cc75, countdown_beep $cc69, segment_tick $cc39). The other 7 catalogued SFX are absent from sfx-data.mjs and untested.
  - Rationale: The spike extracted only the 6 confirmed-by-ear sounds. segment_tick + countdown_beep have data but no game trigger (deferred to 6-10); the remaining 7 (spike-shot, pulsar-hum, pulsar-active, player-explosion, zoom-start, extra-life, slam) are not yet extracted. A "must be 13" failing test would test descoped work no one intends to green this story.
  - Severity: major
  - Forward impact: AC#1 should be re-scoped to the delivered 6 with the remainder tracked. Raised as a blocking Delivery Finding for SM/user.
- **AC#2 R2 hosting — not test-covered (bake half is)**
  - Spec source: context-story-6-6.md, AC#2
  - Spec text: "SFX baked to WAV via tools/pokey-bake/bake-sfx.mjs (no SILENT warnings) and hosted on R2."
  - Implementation: The bake half (no SILENT, valid non-silent WAV) is tested in bake-sfx.test.mjs; the "hosted on R2" half carries no test.
  - Rationale: R2 hosting is an external ops action needing the user's Cloudflare credentials — not deterministically test-coverable; verified by ops/inspection.
  - Severity: minor
  - Forward impact: Hosting + the R2 flip in audio.ts is a Dev/ops follow-up gated on user creds; authentic bakes are served locally from public/sfx/ until then.
- **AC#4 R2-set audit vs catalog — not test-covered**
  - Spec source: context-story-6-6.md, AC#4
  - Spec text: "Existing R2 SFX set audited vs the catalog; gaps filled (priority enemy-fire; secondary segment-tick, spike-shot, pulsar hum/active)."
  - Implementation: No failing test; the audit is a manual comparison of the live R2 bucket against the catalog.
  - Rationale: Auditing the live bucket requires R2 access and is a manual/inspection task, not unit-testable.
  - Severity: minor
  - Forward impact: Manual audit by Dev/user during the R2 hosting step; the enemy-fire gap is covered by the AC#1 re-scope + 6-10.

### Dev (implementation)
- No deviations from spec. The GREEN change was the minimal one-line manifest repoint TEA scoped (`enemyFire` → `LOCAL + 'enemy_fire.wav'`); `src/core/` untouched, web-pokey attribution intact.

### Reviewer (audit)
- **TEA — AC#1 partial coverage (6 of 13)** → ✓ ACCEPTED: the engineering rationale is sound and the remainder is tracked. BUT AC#1 as literally written is unmet — story acceptance requires the user/SM to re-scope AC#1 to the delivered 6 (remainder → 6-10 + a new extraction story). Surfaced as a MEDIUM finding.
- **TEA — AC#2 R2 hosting not test-covered** → ✓ ACCEPTED as a testing call (hosting is ops, not unit-testable). HOWEVER the *consequence* is not benign: deferring R2 hosting while serving from gitignored `public/sfx/` is exactly the [HIGH] merge-readiness blocker. Accepting the test-coverage deviation does not accept merging before the assets are deployable.
- **TEA — AC#4 R2-set audit not test-covered** → ✓ ACCEPTED: manual/ops audit, not unit-testable.
- **Dev — "no deviations from spec"** → ✓ ACCEPTED: the GREEN change was minimal and correctly scoped; `src/core/` untouched.
- No undocumented deviations found — TEA and Dev logged the scope/hosting gaps accurately. The only thing they under-weighted was the *deployability* consequence of the gitignored assets, now raised as the [HIGH].