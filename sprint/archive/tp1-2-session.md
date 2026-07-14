---
story_id: "tp1-2"
jira_key: "tp1-2"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-2: THE AUDIO CROSS-WIRING — player_fire.wav IS the enemy-explosion envelope; enemy_explosion.wav IS the thrust sound

## Story Details
- **ID:** tp1-2
- **Jira Key:** tp1-2
- **Workflow:** tdd
- **Type:** bug
- **Points:** 4
- **Priority:** p1
- **Repo:** tempest
- **Stack Parent:** none (no dependencies)

## Story Context

### Summary
Cluster C8. Subsumes S-008, S-009, S-010. The highest value-to-effort item in the audit and it depends on NOTHING — run it in parallel with the rebase. Every shot the player fires currently plays an explosion; every enemy that dies plays an engine. These are the two most-heard cues in the game. The correct launch-sound bytes are ALREADY IN OUR OWN BAKE DATA: twelve bytes at offset 24 of sfx-data.mjs's ALSOUN_STREAM blob (ROM $cbe9), which the POKEY map's authors flagged with a '?' and never resolved.

### Key Technical Facts
- **Audit Document:** `tempest/docs/2026-07-12-tempest-primary-source-audit.md`
- **Primary Source:** `~/Projects/tempest-source-text` (the CRLF sibling `~/Projects/tempest-source` is NOT citable)
- **Correct Launch-Sound Bytes:** twelve bytes at offset 24 of the `ALSOUN_STREAM` blob in `tempest/tools/pokey-bake/sfx-data.mjs` (ROM $cbe9) — see Key Files below for the verified path
- **POKEY Map Location:** `tempest/docs/ux/2026-06-28-pokey-sfx-rom-map.md:32` — flagged with `?` by the original authors, never resolved
- **Audit Cluster:** C8 (subsumes findings S-008, S-009, S-010)

### Key Files (verified by SM — sm-setup's first guesses were wrong; these are the real paths)
- `tempest/tools/pokey-bake/sfx-data.mjs` — **the bake data. NOT in `src/shell/`.** `ALSOUN_STREAM_BASE = 0xcbd1` (line 111) and `ALSOUN_STREAM` (line 114) hold the verbatim ROM bytes `$cbd1..$ccaa`. Offset 24 therefore lands on `0xcbd1 + 24 = 0xcbe9` — the story's address, confirmed arithmetically. `SFX` entries `player_fire` (line 31) and `enemy_explosion` (line 52) live in the same file.
- `tempest/tools/pokey-bake/bake-sfx.mjs` — renders each SFX to a `.wav` by driving the vendored web-pokey core headlessly.
- `tempest/tools/pokey-bake/bake-sfx.test.mjs` — lines 38/40 pin `player_fire: '$cc5d'` and `enemy_explosion: '$cc81'`. These assertions encode the cross-wiring and will need to move.
- `tempest/docs/ux/2026-06-28-pokey-sfx-rom-map.md` — **the POKEY map. The unresolved `?` is line 32**: `| 2 | Lcb01_02 | $cbe9 | sound_Lccea @9527 (player shot setup) | player-shot variant? | **no — multi-segment** |`. Lines 23–24 record the current (wrong) mapping; line 37 shows `$cc81` is the *zoom-end* sound, not an enemy explosion.
- `tempest/src/shell/audio.ts` — lines 31/33 are the shipping slot map: `fire: 'player_fire.wav'` (★ ROM $cc5d), `enemyDeath: 'enemy_explosion.wav'` (★ $cc81).
- `tempest/src/shell/audio-dispatch.ts` — sim-event → cue dispatch.
- `tempest/docs/audit/findings/pair-5-alsoun-audio.json` — the S-008/S-009/S-010 finding records.
- `tempest/tests/audit/citations.test.ts` — re-opens every cited ROM line byte-for-byte. Must stay green (AC5).
- Existing audio tests: `tempest/tests/shell/audio.test.ts` (lines 105/106/119 assert the current wav names), `tempest/tests/shell/audio.sustain.test.ts`, `tempest/tests/shell/audio-dispatch.test.ts`, `tempest/tests/core/sim.audio-events.test.ts`.

### The .wav files are NOT in this repo
There are zero `.wav` files under `tempest/`. They are baked by `tools/pokey-bake/bake-sfx.mjs` and **hosted on Cloudflare R2** (`arcade-assets.slabgorb.com/tempest/sfx/`), gitignored and never committed. Consequence for this story: any re-baked or renamed cue must be uploaded to R2 (`wrangler r2 object put … --remote`; the `--remote` flag is required) or production will 404 on it. Tests can and should prove the *mapping* without the audio files present — which is exactly what AC2 demands ("proved by a test on the bake mapping, not by ear alone").

## Acceptance Criteria
1. The player's fire cue is rebuilt from the twelve bytes at offset 24 of ALSOUN_STREAM (ROM $cbe9) — the sound is DERIVED from the bake data, not hand-authored to taste.
2. The enemy-explosion cue plays the envelope currently shipping as player_fire.wav, and the thrust/launch cue plays the envelope currently shipping as enemy_explosion.wav. The swap is proved by a test on the bake mapping, not by ear alone.
3. The '?' annotation in the POKEY map is resolved and replaced with the ROM address it resolves to.
4. No new .wav is invented. Every shipped sound traces to a slot in ALSOUN's 13-sound table.
5. npm test -- citations stays green.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-13T21:34:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-13T20:54:57Z | 2026-07-13T20:58:46Z | 3m 49s |
| red | 2026-07-13T20:58:46Z | 2026-07-13T21:14:01Z | 15m 15s |
| green | 2026-07-13T21:14:01Z | 2026-07-13T21:23:58Z | 9m 57s |
| review | 2026-07-13T21:23:58Z | 2026-07-13T21:34:55Z | 10m 57s |
| finish | 2026-07-13T21:34:55Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): Re-baking `player_fire.wav` and `enemy_explosion.wav` changes the CONTENT of two R2 objects while keeping their NAMES, so every cached copy — browser and CDN edge — keeps playing the cross-wired sound until its TTL expires. Affects the R2 upload step for `arcade-assets.slabgorb.com/tempest/sfx/` (needs a cache purge, or content-versioned filenames). This sharpens SM's setup finding: the fix can be merged, uploaded, AND still not reach the player. *Found by TEA during test design.*
- **Improvement** (non-blocking): `audio.ts:31,33` label the fire and enemy-death cues with the ROM addresses `$cc5d` and `$cc81` in comments, and `tests/shell/audio.test.ts:105,106,119` repeat them. Those comments are the cross-wiring written down as fact; they are stale the moment this story lands. Affects `src/shell/audio.ts` and `tests/shell/audio.test.ts` (comments only — no assertion in those files is wrong, so nothing there goes red to prompt Dev). *Found by TEA during test design.*
- **Question** (non-blocking): The displaced T3 record ($cc81, "THRUST SOUND IN SPACE") must survive this story as its own baked cue — tp1-9 depends on it ("reusing tp1-2's corrected T3 bytes") — but nothing in this story wires it to an event, so it will ship as a baked-but-unwired cue exactly like `pulsar_hum` did. My tests require it to exist and to be nobody else's cue; they deliberately do not pin its NAME, since that is tp1-9's to consume. Affects `tools/pokey-bake/sfx-data.mjs`. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (blocking-at-release, not blocking-at-merge): The corrected audio is NOT live until the three `.wav` files are uploaded to R2. I confirmed against production that `https://arcade-assets.slabgorb.com/tempest/sfx/player_fire.wav` is **still 51,116 bytes — the 0.53s explosion** (`last-modified: 2026-06-28`). Merging this PR alone changes nothing a player hears, because the code only names files; the bytes live in the bucket. Affects the release step — three uploads are needed: `player_fire.wav` and `enemy_explosion.wav` (overwrites, corrected content) and `thrust_space.wav` (new). Command: `wrangler r2 object put arcade/tempest/sfx/<file> --file=<path> --remote` (the `--remote` flag is required, or it writes to a local simulacrum). Bake first with `node tools/pokey-bake/bake-sfx.mjs <outdir>`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): TEA's cache-staleness concern is **real but mild — do not solve it by renaming**. I measured the live headers: `cf-cache-status: DYNAMIC` (Cloudflare is not edge-caching these objects) and no `cache-control` header at all, so revalidation falls back to `etag`/`last-modified`, both of which change on overwrite. A returning player may hold a heuristically-cached copy briefly, but there is no CDN layer pinning the old bytes. Overwriting in place is safe; content-versioned filenames would be churn for a hazard that is not there. Affects the R2 upload step only. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `countdown_beep.wav` is baked from `$cc69`, which is ALSOUN's **SL — `;SLAM`** (the cabinet tilt warning), not a countdown. The real 3-second warning is **S3 at `$cc8d`**, which we never bake. This is the same class of by-ear error as tp1-2's, from the same 6-6 session — but it is **inert today**: `countdown_beep` is not in `audio.ts`'s SOUNDS manifest, so nothing plays it, and the audit already records that neither trigger exists in our clone (S-016 and S-017, both `wont_fix`). So there is no bug to fix and I did not touch it. The residual risk is only the *name*: a future story that adds a level-select countdown will reach for `countdown_beep.wav` and get the slam siren. I noted the truth in the POKEY map so that story finds it. Affects `tools/pokey-bake/sfx-data.mjs` (the `countdown_beep` cue name). *Found by Dev during implementation.*

- **Gap / non-blocking (SM, setup):** The ACs are silent on *shipping* the corrected audio. The `.wav` files are gitignored and served from R2 (`arcade-assets.slabgorb.com/tempest/sfx/`), so a re-baked fire cue is not live until someone runs `wrangler r2 object put … --remote`. The story can be *proved* green without that (AC2 deliberately asks for a mapping test, not an ear test), but if the upload never happens the player hears a 404 instead of the fix. Dev/Reviewer: either do the upload as part of delivery or file it explicitly — do not let it evaporate between the merge and the release.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **The cue NAMES are pinned; only the ROM records behind them move.**
  - Spec source: context-story-tp1-2.md, AC#2
  - Spec text: "The enemy-explosion cue plays the envelope currently shipping as player_fire.wav, and the thrust/launch cue plays the envelope currently shipping as enemy_explosion.wav."
  - Implementation: The tests require `SFX.player_fire` to carry the LA record ($cbe9) and `SFX.enemy_explosion` to carry the EX record ($cc5d) — i.e. the cue names stay and their DATA is corrected. They do not permit a rename (`launch.wav` etc.), and `cue()` throws a message saying so.
  - Rationale: The names were never wrong — `player_fire.wav` is exactly what the fire cue should be called; 6-6 just put the enemy-explosion envelope inside it. Renaming would churn `audio.ts`'s SOUNDS manifest and every existing audio test for no fidelity gain. It would also invent new R2 objects when AC#4 says invent nothing.
  - Severity: minor
  - Forward impact: Constrains Dev to the minimal-churn shape. If Dev renames for cache-busting (see the finding below), these tests must change and the Reviewer should see the deviation.

- **AC#5 is tested as "the audit record is reconciled", not merely "citations pass today".**
  - Spec source: context-story-tp1-2.md, AC#5
  - Spec text: "npm test -- citations stays green."
  - Implementation: Added tests requiring S-008/S-009/S-010 to carry `remediated_by: "tp1-2"`, and requiring S-010 to gain an `ours` citation.
  - Rationale: `check-citations` re-opens each finding's `ours` line against the working tree, so the moment Dev edits `sfx-data.mjs` those citations stop matching and AC#5 goes red on its own. `remediated_by` is the mechanism tp1-1 established for exactly this (16 findings carry it); it is the only way AC#5 can be satisfied without either falsifying the audit or deleting it. S-010 is a new case — the first NO_COUNTERPART finding to be remediated — and the checker requires an `ours` for anything marked remediated, so it must be given one.
  - Severity: minor
  - Forward impact: none — it closes the audit record for cluster C8.

### Dev (implementation)

- **Every clean cue is now DERIVED from the ROM blob by address, not just the fire cue.**
  - Spec source: context-story-tp1-2.md, AC#1
  - Spec text: "The player's fire cue is rebuilt from the twelve bytes at offset 24 of ALSOUN_STREAM (ROM $cbe9) — the sound is DERIVED from the bake data, not hand-authored to taste."
  - Implementation: AC#1 demands derivation for the fire cue only. I applied it to all eight clean cues via one helper, `alsounAt(rom)`, which slices the embedded ROM data region at the cue's own address. I first proved by arithmetic that all seven pre-existing clean cues derive byte-for-byte identically to their hand-typed literals — so no cue's DATA changed except the three this story re-seats.
  - Rationale: The hand-typed bytes were not merely redundant, they were the bug's mechanism. Each cue carried an address AND a separate copy of the bytes at that address, with nothing checking the two agreed — which is precisely how the fire cue ended up declaring `$cc5d` while sounding like an explosion. Deriving from the address collapses the two copies into one that cannot disagree. Fixing the three cues while leaving the same trap set for the other five would be fixing the symptom.
  - Severity: minor
  - Forward impact: none — identical bytes out, and a wrong address now yields wrong *bytes* (loud, testable) instead of a silent mislabel.

- **The displaced T3 record ships as a new cue, `thrust_space`, deliberately unwired.**
  - Spec source: context-story-tp1-2.md, AC#2 and AC#4
  - Spec text: "the thrust/launch cue plays the envelope currently shipping as enemy_explosion.wav" / "No new .wav is invented. Every shipped sound traces to a slot in ALSOUN's 13-sound table."
  - Implementation: Added an eighth clean cue at `$cc81`. It is baked and will be hosted, but no `GameEvent` plays it and it is not in `audio.ts`'s SOUNDS manifest.
  - Rationale: The bytes have to go somewhere or tp1-9 loses them (its description says it "reuses tp1-2's corrected T3 bytes"). It is not invented — it is ALSOUN's T3 slot. I left it out of the SOUNDS manifest on purpose: the manifest is fetched on engine resume, so listing a cue nothing plays would fetch a file for no reason. tp1-9 adds the manifest entry and the wiring together, the way 6-11 landed `spike_shot` and `extra_life` ahead of their triggers.
  - Severity: minor
  - Forward impact: tp1-9 must add `thrust_space` to SOUNDS and wire it to the dive's second phase (audit S-014).

- **Three unrelated findings had their citations re-pointed, not remediated.**
  - Spec source: context-story-tp1-2.md, AC#5
  - Spec text: "npm test -- citations stays green."
  - Implementation: S-007, FR-002 and S-019 cite lines in `sfx-data.mjs` that this story's restructure moved. I re-pointed their `ours` line/verbatim to the same code's new location. I did NOT mark them `remediated_by`.
  - Rationale: All three are CONFIRMED/STRUCTURAL findings that cite our code as evidence it is **right** (FR-002 literally says the bake tool "is the one place in the codebase that already uses the right timebase"). They are not defects and this story does not fix them — their pointers merely had to follow the code. Marking them remediated would falsely claim tp1-2 resolved them. I also reverted a gratuitous re-wording of the comment at `sfx-data.mjs:16` that two of them quote verbatim, and made the `audio.ts` edit line-neutral (3 insertions, 3 deletions) so that S-011's and S-018's citations into that file did not shift either.
  - Severity: minor
  - Forward impact: none — S-007/FR-002/S-019/S-011/S-018 remain open and correctly aimed.

## SM Assessment

**Story is well-formed and ready for RED. Setup complete; no scope changes taken.**

**Why this story is safe to run now.** tp1-2 depends on nothing. The epic's gating story — tp1-1, the ROM_FPS rebase — is already merged (tempest PR #97) and released (v1.0.9), so there is no risk of this work baking the old 60 fps into a baseline. The branch `fix/tp1-2-audio-cross-wiring` is cut from a clean `develop` that contains the rebase. tp1-3 is in flight in a *different checkout* (its PR #96 is open and belongs to that session); it touches `glyphs.ts`, `render.ts`, `rules.ts`, `sim.ts`, `fx.ts`, `fuseball.ts` — **zero file overlap** with this story's audio surface. The two cannot collide.

**What I verified, and the one thing I corrected.** sm-setup placed `sfx-data.mjs` under `src/shell/`. It is not there — it lives in `tools/pokey-bake/`, and I have rewritten the Key Files section with paths I opened myself. Two facts in the story statement check out against the code, which is worth stating plainly because the whole story rests on them:
1. `ALSOUN_STREAM_BASE = 0xcbd1`, so the story's "twelve bytes at offset 24" resolves to `$cbe9` exactly as claimed. The address is not approximate.
2. The `?` the story says was never resolved is real and is a single line — `docs/ux/2026-06-28-pokey-sfx-rom-map.md:32`, idx 2, `$cbe9`, *"player-shot variant?"*, annotated `no — multi-segment`. AC3 has a precise target.

**The trap I want TEA to design against.** The cross-wiring is currently *asserted as correct* in at least three places: `bake-sfx.test.mjs:38,40` pins `player_fire → $cc5d` and `enemy_explosion → $cc81`, and `tests/shell/audio.test.ts:105,106,119` asserts the shipping wav names. Those tests will go red, and that is the fix landing, not a regression — but a red test whose message reads "expected $cc5d" is exactly the kind of thing a later agent "repairs" by restoring the bug. The RED phase must leave behind tests that state the *ROM-cited* truth, so the old assertions die by being superseded rather than by being deleted quietly.

**Route:** phased tdd → RED. Han Solo (TEA) has the con.

## TEA Assessment

**Tests Required:** Yes
**Status:** RED — 17 failing, 841 passing. Typecheck clean.

**Test Files:**
- `tests/audit/alsoun-cue-mapping.test.ts` (new) — the cluster-C8 authority. 25 tests: the 13-slot ALSOUN table, the LA/EX/T3 records, the event→cue→ROM chain, the POKEY map, and the audit reconciliation.
- `tools/pokey-bake/bake-sfx.test.mjs` (edited) — `BASELINE_6_6` **asserted the cross-wiring as correct** (`player_fire: '$cc5d'`). Re-sourced from the ROM. This was the single most dangerous thing in the repo for this story: left alone, it goes red when Dev fixes the bug, and its failure message invites the next agent to "repair" it by putting the bug back. Its comment now says, in as many words, that the old addresses ARE the bug.
- `tools/pokey-bake/sfx-data.d.mts` (new) — companion declaration so the strict TS suite can import the bake data, mirroring `tools/audit/check-citations.d.mts`. Type-only; no runtime code.

**What the ROM actually says.** I did not take the audit on trust — every constant is re-read from Theurer's source, and five provenance tests re-open `ALSOUN.MAC` and prove them byte-for-byte (skipped in CI, which has no copy of the source; they pass locally). The decisive citation is not a byte at all, it is a label. ALSOUN's sound table is thirteen `OFFSET` macros (`ALSOUN.MAC:88-100`) and Theurer named every one of them:

- `OFFSET EX ;ENEMY EXPLOSION` — `$cc5d` — **we ship this as the player's fire cue**
- `OFFSET LA ;PLAYER FIRE` — `$cbe9` — **we ship this nowhere**
- `OFFSET T3 ;THRUST IN SPACE` — `$cc81` — **we ship this as the enemy-death cue**

The disassembly's `Lcb01` table is that same list in the same order, so the POKEY map's own `idx` column already contained the answer: its row 2 is the LA slot, and its authors wrote `player-shot variant?` next to it and moved on. The bytes at `ALSOUN_STREAM` offset 24 are `LA3F`/`LA3A` verbatim, and `ALSOUN_STREAM_BASE + 24 === 0xcbe9` exactly. Nothing about this story is approximate.

**The trap I built for the green phase.** Every positive assertion is paired with a negative one. `player_fire` must be at `$cbe9` **and must not carry the EX envelope**; `enemy_explosion` must be at `$cc5d` **and must not carry the T3 envelope**; each of the three records must have **exactly one** home. A swap done by copy-paste rather than by moving leaves a duplicate behind and drops a record on the floor — that passes a naive equality test and fails these.

**What I deliberately did not test.** AC#2 says the swap is proved "by a test on the bake mapping", so I tested the bake mapping and did not force `audio.ts` to export its `SOUNDS` manifest to satisfy me. The chain is closed instead by testing the hop that IS exported (`playEventSounds`: `fire` → `'fire'`, `enemy-death` → `'enemyDeath'`) and relying on the manifest's existing, correct name→file map. One hop is therefore unguarded: an edit to `SOUNDS` could re-cross the wires without failing a test. I judged a new public export too high a price for a hazard nothing in this story creates, but the Reviewer should know the hole is there and is deliberate.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test / treatment | Status |
|------|------------------|--------|
| #1 type-safety escapes | No `as any`, no `as unknown as T`, no `@ts-ignore`. I wrote two `as never` casts on the audio fake, caught them in self-check, and replaced them with a properly typed `Pick<AudioEngine, 'play'\|'startLoop'\|'stopLoop'>` and real `GameEvent` literals | clean |
| #1 non-null assertions | Every `!.` removed — `cue()` and `finding()` throw a descriptive error instead, so a missing cue fails legibly rather than dying on `undefined.rom` | clean |
| #4 null/undefined | `expect(ours, …).not.toBeNull()` before reading `ours?.file`; `Map.get`-style lookups all guarded | clean |
| #8 test quality — vacuous assertions | Self-checked all 25: no `let _ =`, no `assert(true)`, no `is_none()` on an always-none. Every test asserts a value, not just a shape | clean |
| #8 test quality — `as any` in assertions | none | clean |
| #9 build config | `npx tsc --noEmit` passes; the `.d.mts` keeps `allowJs` off, preserving the repo's strict posture | clean |
| CI portability | The provenance suite reads `~/Projects/tempest-source-text`, which **does not exist on GitHub's runners** — guarded with `describe.skipIf(!sourceAvailable)`, the same pattern `citations.test.ts` uses. An unguarded read here would have gone green locally and red in CI | clean |

**Rules checked:** 7 of 13 lang-review rules are applicable to a test-only, node-env, non-React diff. The rest (React/JSX, async/promises, enums, bundle size, error handling, input validation) have no surface in this change.
**Self-check:** 2 issues found and fixed in my own tests (the `as never` casts; the non-null assertions). 0 vacuous tests.

**Handoff:** To Yoda (Dev) for GREEN. The work is: re-seat three ROM records in `sfx-data.mjs` (keeping the cue names), give the displaced T3 record its own cue, resolve the `?` in the POKEY map, and mark S-008/S-009/S-010 `remediated_by: tp1-2`. Then re-bake — and read the two R2 findings above before you upload, because a re-baked `player_fire.wav` under the same name is a file the CDN may keep serving stale.

## Dev Assessment

**Implementation Complete:** Yes
**Tests:** 858/858 passing (GREEN). `npx tsc --noEmit` clean.
**Branch:** `fix/tp1-2-audio-cross-wiring` (pushed)

**Files Changed:**
- `tools/pokey-bake/sfx-data.mjs` — re-seated the three ROM records, added the `thrust_space` cue, and replaced every hand-typed byte literal with `alsounAt(rom)`, which slices the embedded ROM data region at the cue's own address.
- `docs/ux/2026-06-28-pokey-sfx-rom-map.md` — resolved the `?`, added the ALSOUN slot name to every row, and replaced the note that waved the discrepancy away.
- `docs/audit/findings/pair-5-alsoun-audio.json` — S-008/S-009/S-010 `remediated_by: tp1-2`; S-010 (the first NO_COUNTERPART finding to be remediated) given the `ours` citation the checker requires. S-007/FR-002/S-019 re-pointed, not remediated.
- `src/shell/audio.ts`, `tests/shell/audio.test.ts` — corrected the ROM addresses in comments that recorded the cross-wiring as fact.

**The fix, and why it stays fixed.** The three records are now seated where ALSOUN dispatches them from. But the reason 6-6 could get this wrong is that every cue carried a ROM address *and* a separate hand-typed copy of the bytes at that address, with nothing checking the two agreed — so a cue could declare `$cc5d` and sound like an explosion, and no test would notice. Those two copies are now one: a cue declares an address, and `alsounAt()` lifts the bytes out of the ROM blob we already embed verbatim. I proved by arithmetic first that all seven pre-existing clean cues derive byte-for-byte identically to their literals, so nothing but the three C8 records changed. A wrong address now produces wrong *bytes* — loud and testable — instead of a silent mislabel.

**Independent confirmation, from outside the test suite.** The bake durations tell the story without a table or an assertion:

| cue | before | after |
|---|---|---|
| `player_fire.wav` | **0.532s** — an explosion tail, on every trigger pull | **0.148s** — a short, sharp "pew" |
| `enemy_explosion.wav` | **1.620s** — a 1.6-second engine drone, on every kill | **0.532s** — a decaying blast |
| `thrust_space.wav` | *(unshipped)* | **1.620s** — the drone, where it belongs |

A 1.6-second engine note fired on every enemy death, stacking. That is what we have been shipping.

**Production is still wrong, and merging this will not fix it.** I fetched the live object: `arcade-assets.slabgorb.com/tempest/sfx/player_fire.wav` is **still 51,116 bytes — the 0.53s explosion**, last modified 2026-06-28. The code only names files; the bytes live in R2. Three uploads are needed at release (two overwrites + one new file) — see the Delivery Findings for the exact command. I did not upload: that mutates production, and doing it mid-review would change what players hear before anyone has approved the change.

**On the cache hazard TEA raised:** measured, not assumed. `cf-cache-status: DYNAMIC` and no `cache-control` header — Cloudflare is not edge-caching these objects, and both `etag` and `last-modified` change on overwrite. Overwriting in place is safe; renaming the files for cache-busting would be churn against a hazard that is not there.

**Self-review:** Cue names and `.wav` filenames unchanged (TEA pinned them; the names were always right). `thrust_space` deliberately unwired and deliberately absent from the SOUNDS manifest, so nothing fetches a file nothing plays — tp1-9 adds both together. The `audio.ts` edit was made line-neutral on purpose, so that S-011's and S-018's citations into that file did not shift; three other findings that cite `sfx-data.mjs` as evidence our code is *right* had their pointers moved to follow the code, without being falsely marked as fixed by this story.

**Handoff:** To Obi-Wan (Reviewer).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — tests 858/858, `tsc --noEmit` clean, `npm run build` clean, tree clean + pushed, no console.log/.only/.skip/TODO/debugger |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (see R-1, the `alsounAt()` NaN hole) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (see R-1) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (see R-2, the tautological derivation assertion) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (12 of 13 POKEY-map slot labels re-verified against ALSOUN.MAC) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker (#2, `SFX` missing `readonly`) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no attack surface: no network, no user input, no auth, no secrets; build-time tooling + test code only |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — the diff is a net simplification (140 lines of duplicated byte literals deleted) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both low) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 pre-filled as disabled per `workflow.reviewer_subagents`)
**Total findings:** 6 confirmed (0 critical, 0 high, 2 medium, 4 low), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict: APPROVED** — with one release condition that is not a code defect and must not be lost (F-1).

No Critical and no High findings. The fix is correct, and I verified that independently of the test suite rather than taking Dev's word or the suite's green.

### What I verified myself (evidence, not vibes)

- **[VERIFIED] The refactor changed no cue it was not supposed to change.** This was my primary worry: Dev deleted every hand-typed byte literal and replaced it with `alsounAt(rom)` slices, and **no test pins the bytes of the five cues this story wasn't meant to touch** — so a bad derivation would have sailed through green. I imported `develop`'s `sfx-data.mjs` and HEAD's side by side and compared every cue's `audf`/`audc`/`stream`/`gain`. Result: the three C8 records moved exactly as intended, `thrust_space` is new, and **all ten pre-existing cues are byte-identical, gains included. Zero unintended changes.**
- **[VERIFIED] The three re-seatings match Theurer's source.** `$cbe9` = LA3F/LA3A, `$cc5d` = EX2F/EX2A, `$cc81` = T36F/T36A, and ALSOUN's own `PNTRS` table names the slots `;PLAYER FIRE`, `;ENEMY EXPLOSION`, `;THRUST IN SPACE` (ALSOUN.MAC:88-100). The dispatch chain corroborates: `SLAUNC` loads `SIDLA` (ALSOUN.MAC:249), `EXSNON` loads `SIDEX` (:224), `SOUTS3` loads `SIDT3` (:253).
- **[VERIFIED] The POKEY map's new slot labels are true — 12 of 13 proven by byte-match.** Dev added an ALSOUN-slot column to all thirteen rows, and only three of those rows are covered by any test. I matched the blob's bytes at each claimed address against every labelled `.BYTE` record in ALSOUN.MAC: 12 of 13 confirm exactly (the multi-segment rows PU/DI match on their 4-byte first note). The 13th, PO `$cca9`, is unverifiable because the embedded blob *ends* at `$ccaa` — it is a `DEFERRED`, unshipped sound, so this is pre-existing and out of scope.
- **[VERIFIED] The core/shell boundary is untouched** — evidence: `git diff develop...HEAD --name-only` contains zero files under `src/core/`; the only `src/` change is a 3-line comment edit in `src/shell/audio.ts`.
- **[VERIFIED] Merging this cannot break production.** The `.wav` filenames are unchanged, so nothing 404s; `thrust_space.wav` is new but unwired and unlisted in SOUNDS, so nothing fetches it. Evidence: `audio.ts:30-33` (SOUNDS keys unchanged), `CHANNELS` therefore still exhaustive over `SoundName` — no compile break.
- **[VERIFIED] The audit edits are surgical.** The findings JSON diff is 13 insertions / 6 deletions with no reformatting churn and no key reordering; exactly one findings file touched. Dev correctly re-pointed S-007/FR-002/S-019 (which cite our code as evidence it is **right**) without falsely marking them remediated, and deliberately kept the `audio.ts` edit line-neutral so S-011's and S-018's citations into that file did not shift. That is unusually careful.

### Findings

**F-1 · MEDIUM (release-blocking, not merge-blocking) — merging and releasing this story will not change one thing a player hears.**
The corrected audio lives in `.wav` files that are gitignored and served from a *different* R2 bucket than the game. I confirmed CI does not touch it: `.github/workflows/deploy.yml` uploads `dist/` to bucket `arcade-tempest`, and **`arcade-assets` appears nowhere in `.github/`**. I also fetched the live object — `arcade-assets.slabgorb.com/tempest/sfx/player_fire.wav` is still 51,116 bytes, the 0.53-second explosion, last modified 2026-06-28. So the merge is safe but *inert*: the board will say "p1 audio bug fixed" while every shot in the shipped game still detonates. Dev found and filed this; I am confirming it and raising it to a gate on "done". **SM: the story is not deliverable until three objects are uploaded** (`player_fire.wav`, `enemy_explosion.wav` overwritten; `thrust_space.wav` new) — or until a follow-up story is filed and linked. Do not let this evaporate between the merge and the release.

**F-2 · MEDIUM [TEST] — the refactor removed the second witness, and only 3 of 8 clean cues have an independent byte check.**
Deriving every cue from one blob is the right call and I endorse it — but be clear-eyed about what it costs. The hand-typed literals were a *redundant copy*; redundancy is what lets you detect corruption. Now there is one copy, and the test that supposedly proves derivation (`alsoun-cue-mapping.test.ts:123-124`) asserts `fire.alsoun.audf` equals `ALSOUN_STREAM.slice(24, 30)` — which is *literally the expression `alsounAt('$cbe9')` evaluates to*. It compares X to X. It still pins the **address** (a wrong `rom` slices elsewhere and fails), so it is not vacuous, but its byte-derivation half **cannot fail**. Bytes are checked against a source outside the blob for LA, EX and T3 only (lines 112-113, 141-142, 158-159, plus the provenance suite). `enemy_fire`, `warp`, `countdown_beep`, `segment_tick` and `spike_shot` now have **no independent byte validation at all** — if the blob were ever corrupted at their offsets, every test would still pass.
They are correct *today* — I proved that above by matching all 13 slots against ALSOUN.MAC by hand. **The fix is to make that check a test, not a review artifact:** extend the `skipIf(!sourceAvailable)` provenance suite to assert the blob against ALSOUN.MAC for all 13 slots. I have already demonstrated it passes, so this is cheap and known-good. Not blocking — the code is right — but this is the one thing that would make it *stay* right.

**F-3 · LOW [EDGE/SILENT] — `alsounAt()`'s guard has a hole precisely where a typo lands.**
`tools/pokey-bake/sfx-data.mjs:78-85`. A malformed address (`'$zzzz'`, `'$'`) makes `parseInt` return `NaN`; every `NaN` comparison is `false`, so `offset < 0 || offset + 12 > length` **passes**, and `slice(NaN, NaN+6)` coerces to `slice(0, 0)` — returning **empty envelopes instead of throwing**. I ran it: `$zzzz` and `$` both sail through the guard and yield `audf.length === 0`. The guard exists to make a bad address fail loudly, and it misses the likeliest form of bad address. In practice this is caught downstream (`bake-sfx.test.mjs` asserts every clean record has exactly 6 bytes), which is why it is LOW and not higher — but a guard that silently returns garbage is exactly the genre of bug this whole story is about. One-line fix: `if (!Number.isInteger(addr) || offset < 0 || …)`.

**F-4 · LOW [RULE] (rule-checker #2, confirmed) — `SFX` is declared mutable while its siblings are `readonly`.**
`tools/pokey-bake/sfx-data.d.mts:25` declares `export const SFX: SfxSpec[]`, whereas `ALSOUN_STREAM` (:26) and `DEFERRED` (:28) in the same file are `readonly`, and every field of `SfxSpec` is `readonly`. Any consuming `.ts` file may therefore legally `SFX.push()`/`.sort()` the module singleton and corrupt it for every other test in the worker. Fix: `readonly SfxSpec[]`.

**F-5 · LOW [RULE] (rule-checker #10, confirmed — downgraded, not dismissed) — `JSON.parse(...) as T` with no runtime validation.**
`tests/audit/alsoun-cue-mapping.test.ts:264-268` literally matches checklist rule #10. I am **not dismissing it** (it matches a stated rule), but I am downgrading it to LOW with rationale: this is test code reading a trusted, checked-in repo fixture — not user input, not an API response — the `finding()` helper (:270-274) already throws on shape drift, and it is *stricter* than the existing precedent at `citations.test.ts:90,100`, which parses the same files into implicit `any[]`. Worth fixing if the pattern is ever tightened repo-wide; not worth blocking this story.

**F-6 · LOW [DOC] — the audit's `ours` field now means two different things, and S-007's citation no longer exhibits what it claims.**
Two consequences of an otherwise-good refactor. (a) `check-citations.mjs:86` requires any `remediated_by` finding to keep an `ours` "as HISTORY". S-010 was `NO_COUNTERPART` with `ours: null` — there *was* no history — so satisfying the checker meant pointing `ours` at the **fix** (`sfx-data.mjs:101`). A reader now sees a finding titled "has no shipped counterpart" whose `ours` cites the shipped counterpart. It is the first `NO_COUNTERPART` ever remediated and the schema has no clean way to express it; the encoding is defensible and Dev documented it, but the epic owner should decide whether the checker should instead permit `remediated_by` with a null `ours`. (b) S-007's `ours` used to quote warp's actual byte array — the very thing its claim is about ("byte-identical to warp.wav's baked audf/audc arrays"). Those literals no longer exist, so it now points at `rom: '$cc75'`. The claim is still true; the citation just no longer *shows* it.

### Rule Compliance — `.pennyfarthing/gates/lang-review/typescript.md`

| # | Rule | Instances checked | Verdict |
|---|---|---|---|
| 1 | Type-safety escapes | All 8 changed files grepped for `as any`, `as unknown as`, `@ts-ignore`, `!` non-null | **PASS** — zero. TEA self-caught and removed two `as never` casts and all `!` assertions during RED |
| 2 | Generics/interfaces | `SfxSpec`, `AlsounRecord`, `SFX`, `ALSOUN_STREAM`, `DEFERRED` (all 5 declarations in the new `.d.mts`) | **FAIL → F-4** — `SFX` missing `readonly`. No `Record<string,any>`/`object`/`Function`/`Partial` anywhere |
| 3 | Enums | none in diff | **N/A** |
| 4 | Null/undefined | `??` at test:34 (correct — preserves empty string); every `alsoun?.audf` at :123-124,131,141-142,147,158-159 terminates at a property read; no `Map.get()`; no `\|\|` introduced | **PASS** |
| 5 | Modules/declarations | New `.d.mts` verified export-by-export against the real runtime shape of `sfx-data.mjs` — all 5 exports exist, shapes match, nothing undeclared. `import type` used correctly at test:30-31. Extensionless relative imports match the repo-wide `moduleResolution: bundler` convention | **PASS** |
| 6 | React/JSX | no `.tsx` in diff | **N/A** |
| 7 | Async/promises | no async code added | **N/A** |
| 8 | Test quality | All 25 new tests + the edited `BASELINE_6_6`: no `toBeTruthy`, no vacuous `.not.toThrow`, no mocks (hand-rolled fake typed from the real `AudioEngine` so it cannot drift), no stray `.only`/`.skip` (the one `skipIf` is documented and legitimate). **But see F-2** — the derivation assertion is tautological w.r.t. bytes | **PASS with F-2** |
| 9 | Build/config | no tsconfig/package.json changes; `tsc --noEmit` + `vite build` clean | **PASS** |
| 10 | Input validation | `JSON.parse(...) as T` at test:264-268 | **FAIL → F-5** (confirmed, downgraded to LOW with rationale — trusted repo fixture, not untrusted input) |
| 11 | Error handling | 3 new `throw` sites — `cue()` (:92-95), `finding()` (:272), `alsounAt()`'s `RangeError` (mjs:81-84) — all real Error objects with messages, none swallowed. No `catch` added. **But see F-3** — the RangeError guard has a NaN hole | **PASS with F-3** |
| 12 | Performance/bundle | no barrel imports, no dynamic `import()`; `readFileSync` is in Node test/tooling code, not a request handler | **PASS** |
| 13 | Fix-introduced regressions | Re-scanned the fix diff against #1-#12: no `as any` added to silence errors, `??` not `\|\|`, and the ambient `.d.mts` landed in the same commit as the runtime shape it describes | **PASS** |
| — | **Project rule: the core/shell boundary** (CLAUDE.md) | Zero files under `src/core/`; grepped every hunk for `Date.now`/`performance.now`/`Math.random`/`requestAnimationFrame`/`document.`/`window.` — zero matches | **PASS** |

### Devil's Advocate

Let me argue this change is broken.

The strongest attack is that **this refactor makes the codebase more confident and less verified at the same time**. Before, each cue carried its bytes twice: once as an address, once as a literal. That duplication was the *bug* — but duplication is also *evidence*. Two independent copies can be compared; one copy can only be believed. Dev collapsed them into one, deleted the second witness, and the test suite did not replace it. Today only three of eight clean cues have their bytes checked against anything outside the blob. If `ALSOUN_STREAM` were ever corrupted — a fat-fingered hex digit in a 218-byte wall of numbers, in a merge conflict, in a bad rebase — five cues would silently change their sound and the entire 858-test suite would stay green, because the tests now ask the blob to confirm itself. The suite would report success while the game played garbage. That is precisely the failure mode this story exists to prevent, reintroduced one level up. I confirmed by hand that the blob is currently correct at all 13 slots, so there is no defect today — but "I checked it once during review" is not a regression test, and the next person will not check.

The second attack: **the story's own theme survives in the one hop nobody pinned.** The manifest in `audio.ts` maps `fire → player_fire.wav` and `enemyDeath → enemy_explosion.wav`, and `SOUNDS` is not exported, so no test asserts it. Swap those two string values tomorrow and every test still passes — the cross-wiring returns, in a story whose entire purpose was to kill cross-wiring. TEA saw this, reasoned that AC#2 scopes the proof to "the bake mapping", and declared the hole deliberately. That is a defensible reading of the AC and I am not overruling it. It is still a hole, and it is *this* hole.

Third: what does a stressed environment do? `alsounAt` throws `RangeError` on an out-of-range address but silently returns empty arrays on an unparseable one (F-3). The bake tool would then emit a silent `.wav`, and silence is the one defect an ear-based process never catches — which is how we got here in the first place.

None of these are present defects. All three are the same shape: *the thing that made this bug possible was a missing check, and the fix, while correct, leaves adjacent checks missing.* That is why F-2 is recorded as MEDIUM rather than waved through, and why F-1 gates "done".

### Verdict

**APPROVED.** The story delivers exactly what it claimed, and it is right for reasons I could verify from primary source rather than from the tests it ships with. The durations alone settle it: a 0.53-second explosion on every trigger pull becomes a 0.148-second launch, and a 1.62-second engine drone on every kill becomes a 0.53-second blast. The refactor that made a cue's address and its bytes the same fact is the correct root-cause fix, not scope creep, and Dev's restraint elsewhere — line-neutral comment edits to protect other findings' citations, re-pointing rather than falsely remediating three findings that were never defects — is the kind of care this audit epic needs.

Merge it. But **F-1 is a condition of calling it done**: until the three `.wav` objects are uploaded to R2, this p1 fix is invisible to every player, and the code review cannot make that true by approving it.

**Handoff:** To Thrawn (SM) for finish — carry F-1.