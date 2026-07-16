---
story_id: "sw7-8"
jira_key: "sw7-8"
epic: "sw7"
workflow: "tdd"
---
# Story sw7-8: R8 Audio content — bake PMSF2/PMCNT/PMEND/PMBEN/PMDES, wire missing speech, dedicated AUDDF/AUDSS, fly-by doppler and R2 sound sets

## Story Details
- **ID:** sw7-8
- **Jira Key:** sw7-8
- **Workflow:** tdd
- **Stack Parent:** sw7-2

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T01:43:51Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T23:45:31Z | 2026-07-15T23:47:48Z | 2m 17s |
| red | 2026-07-15T23:47:48Z | 2026-07-16T00:30:54Z | 43m 6s |
| green | 2026-07-16T00:30:54Z | 2026-07-16T01:10:34Z | 39m 40s |
| review | 2026-07-16T01:10:34Z | 2026-07-16T01:27:07Z | 16m 33s |
| red | 2026-07-16T01:27:07Z | 2026-07-16T01:35:21Z | 8m 14s |
| green | 2026-07-16T01:35:21Z | 2026-07-16T01:42:14Z | 6m 53s |
| review | 2026-07-16T01:42:14Z | 2026-07-16T01:43:51Z | 1m 37s |
| finish | 2026-07-16T01:43:51Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): "Add five tunes" is a PIPELINE story, not config — the R8 streams use opcodes the shipped corpus never touched: `.CALL` 0x8D (SF2V1-4 are subroutine calls into SF2V5/V6), `.GOSUB` 0x90 (3-byte record, breaks the pair walk) + `.RETURN` 0x91 (1-byte) in CNTV1, and 0x8A VC / 0x8C SYN / 0x81 CRATE in the knell.
  Affects `tools/music-bake/gen-music-data.mjs` (today THROWS on address-operand labels; must flatten or resolve) and `tools/music-bake/pm-player.mjs` (today THROWS on unknown opcodes). The oracles in `tune-data.test.mjs` pin the FLATTENED decoded stream, so Dev may flatten at generation time or teach the player — either satisfies.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the full ROM win/descent choreography — PMSF2 during the escape, staged AUDDF booms (WSXPLD.MAC:830/890/949), PMEND over the explosion phases, PMDES→descend→PM4TH timed sequencing (WSMAIN.MAC:1405-1450) — needs the sequenced phases sw7-9 / A-019 owns. This story's same-frame overlaps (finale + next-wave space loop; descent + towers loop) are documented adaptations, not bugs to "fix" here.
  Affects `star-wars/src/core/sim.ts` (sw7-9 scope).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): the ROM plays AUDSS as the initials-entry BACKSPACE sound too — `TCHSCR.MAC:588 "JSR AUDSS ;SHOOTING ENEMY SHOT SOUND, RUBBING IT OUT"` (U-022's second citation). Once `fireballHit` is baked, a one-line dispatch on the entry-screen rub is a free authentic touch.
  Affects `star-wars/src/main.ts` (the initials keydown path).
  *Found by TEA during test design.*
- **Question** (non-blocking): SPKFOR/SPKALW are COIN-INSERT lines (WSMAIN.MAC:370-399 IFRAME's COINSPK machine: first credit "The Force will be with you", next credit "always"). The clone has no credit concept (and the no-coin-op-urgency house rule), so U-017's attract/intro half has no seam; only the game-over half (SPKREM + SPKFOA) is wired. If a future story wants the coin easter egg, it needs a "credit" moment first — likely wont_fix.
  Affects `docs/audit/findings/pair-audio.json` (U-017 scope note).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): main.ts's event pump is untestable (boot module) — the cantina/Ben fork and the SFX swaps are pinned via the `?raw` text idiom (sw3-5 precedent), which is token-level. Extracting the pump into an importable shell module would upgrade those pins to behavioral tests.
  Affects `star-wars/src/main.ts`.
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the knell's synth-mode glide (SYN ON slides the old→new note delta across each note, SNDPM.MAC:718-724) is recorded but not modelled — the baked knell tolls 48 discrete descending steps instead of a continuous slide.
  Affects `star-wars/tools/music-bake/pm-player.mjs` (model VSA in renderVoice, then re-bake death_knell.wav).
  *Found by Dev during implementation.*
- **Conflict** (non-blocking, resolved in-phase): TEA's death-knell oracle pinned 30 loop passes — the decimal misreading of `.LOOP 30` (hex 0x30 = 48; the author dots decimal counts, SWMUS.MAC:828). Corrected in tune-data.test.mjs with the evidence in the header; the Reviewer should independently re-derive the byte (deviation logged as major).
  Affects `star-wars/tools/music-bake/tune-data.test.mjs` (already corrected; verify, don't revert).
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Gap** (blocking): a same-frame catwalk crash + exhaust-port miss on the last life fires the game-over farewell TWICE (six speech cues in one frame). Idempotence guard + a double-death-frame test required.
  Affects `star-wars/src/core/sim.ts` (pushFarewell call sites) and `star-wars/tests/core/` (new test).
  *Found by Reviewer during code review.*
- **Gap** (blocking): three mutation-proven test gaps — the speech-queue fetch-failure purge is unguarded (revert survives 57 tests), the five tunes never pass a bake test, and CRATE's accelerando sign-flip survives 72 tests. See the Reviewer Assessment table for the exact tests to add.
  Affects `star-wars/tests/shell/speech-serial.test.ts`, `star-wars/tools/music-bake/bake-music.test.mjs`, `star-wars/tools/music-bake/pm-player.test.mjs`.
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Surface entry speaks BOTH lines sequenced, where the ROM's machine is an either/or**
  - Spec source: pair-audio.json U-016 claim; WSMAIN.MAC:1505-1517 / :1543-1550
  - Spec text: claim: "the cabinet speaks BOTH SPKTHI and, shortly after, SPKSIZ"; the source actually SKIPS SPKTHI exactly when the first-time wave-five-select path will speak SPKSIZ — they are alternatives keyed to a wave-select our sim does not have
  - Implementation: tests pin BOTH lines cued on the surface edge, THI strictly before SIZ, played back-to-back by the serial speech queue
  - Rationale: the story context and U-016's own remediation note ("Could sequence SPKTHI then SPKSIZ") choose the sequenced-both contract; deleting SIZ (the strict ROM reading for a select-less sim) would remove a shipped, beloved sw2-5 line the finding explicitly keeps
  - Severity: minor
  - Forward impact: if a wave-select story ever lands, the ROM's either/or gate can be restored on top of the same cues
- **The game-over farewell speaks on the DEATH FRAME, not two seconds later**
  - Spec source: WSMAIN.MAC:2126-2144 (PHEB0D's 2-second death phase precedes PHIEGM's SPKREM/SPKFOA)
  - Spec text: "CMPD #2*20. ;2 SECONDS" then PH$EGM init speaks the farewell
  - Implementation: tests pin remember/theForceWillBeWithYou/always on the frame gameOver flips true (any death path); no 2-second dying phase exists in the sim
  - Rationale: the sim has no death-animation phase to defer into; inventing a timer for speech alone would be new mechanics beyond this story. The serial queue preserves the ROM's utterance order
  - Severity: minor
  - Forward impact: a future death-sequence story can move the cue to its PHIEGM equivalent without re-pinning order
- **cantina/bensTheme wiring pinned as main.ts TEXT, not behavior**
  - Spec source: WSMAIN.MAC:2153-2166 (PHEEGM's UPDATE fork); U-011 reasoning ("our name-entry flow lives in main.ts")
  - Spec text: new high score → PH$ENT (PHIENT plays PMCNT); else JSR PMBEN
  - Implementation: `tune-channel.test.ts` slices main.ts (`?raw`) at the qualifiesForHighScore edge and demands playTune('cantina') / else playTune('bensTheme'); no unit test drives the fork behaviorally
  - Rationale: qualification is shell data (SH2-13: main.ts owns the table) and main.ts is an unimportable boot module; core-emitting these cues is impossible without moving the table into the core. The ?raw pin is the established sw3-5 idiom and is written to bite on today's text
  - Severity: minor
  - Forward impact: Reviewer should diff-trace the edge block; a pump-extraction story would upgrade the pin (Delivery Finding filed)
- **U-019/U-020 carry no tests — deferred by the ruling, not omitted**
  - Spec source: audit doc R8 row ("FIX core (tunes+speech, ~8); defer U-019/U-020 (l each)"); story context ("DEFER-friendly if trimming")
  - Spec text: fly-by doppler set (U-019) and R2 sound set (U-020), both size-L
  - Implementation: no tests written; `r8-remediation.test.ts` PINS that both findings stay un-remediated (a zealous sweep marking them fails the suite)
  - Rationale: the boss's ruling explicitly defers them; U-020 additionally needs an R2-damage mechanic the sim lacks
  - Severity: minor
  - Forward impact: a follow-on story picks them up; the ledger pin flips when it does

### Dev (implementation)

- **Corrected TEA's death-knell oracle from 30 to 48 loop passes (a Dev edit to a RED test)**
  - Spec source: SWMUS.MAC:114-125 (SF2V5), the epic's match-bytes rule (context-epic-sw7)
  - Spec text: `SF2V5: ;.LOOP 30` / `.BYTE 8E, 30` — under ambient `.RADIX 16` the byte is 0x30 = 48; the author DOTS decimal loop counts when he means them (`;.LOOP 16.` at SWMUS.MAC:828), so the comment's "30" is itself hex
  - Implementation: tune-data.test.mjs's knell oracle now pins 48 passes (floor E5-47 = 0x12) with the refutation `expect(notes).not.toHaveLength(30)` and the evidence in the test header; the pipeline decodes the byte mechanically
  - Rationale: the RED oracle transcribed the macro COMMENT as decimal — pinning 30 would have forced the generator to truncate authentic ROM data to satisfy a mistranscription (laundering, not fidelity). Dev normally never edits TEA's tests; a provably mistranscribed ROM byte in an oracle is the exception, made loudly
  - Severity: major (test-oracle correction by Dev — Reviewer must independently re-derive the byte)
  - Forward impact: none once verified; the corrected oracle guards the byte both ways
- **pm-player records .SYN but does not model the synth-mode glide**
  - Spec source: SNDPM.MAC:1040 (PKSYN) + the synth-delta machinery at :718-724; pm-player's own "unimplemented opcodes must THROW" rule
  - Spec text: SYN ON makes the driver slide VSA (the old→new note delta) across each note — the knell's setup (SF2V6) turns it on for all four voices
  - Implementation: OP.SYN stores the flag (`this.syn`) and playback proceeds with discrete note steps; no throw, no glide
  - Rationale: the alternative was throwing (knell unbakeable) or approximating a portamento (a divergence hiding behind a comment). The knell's 48 descending semitone steps at 4-tick durations are near-continuous already; the glide is a polish nuance routed to a Delivery Finding rather than silently faked
  - Severity: minor
  - Forward impact: a follow-on can model VSA in renderVoice; the flag is already captured per voice
- **expandSwfx accepts a per-spec `maxSeconds` (death_star_boom sets 2.5)**
  - Spec source: SNDAUD.MAC:315-347 (the DF chain, 288 ticks = 2.36 s); no story spec names a cap
  - Spec text: the shared DF8C volume chain runs 288 driver ticks before its `.SZ`
  - Implementation: the global MAX_SFX_S=1.6 cap (sized for sustained/looping envelopes) silently truncated the boom to 1.62 s; expandRecords/expandSwfx now thread an optional per-spec ceiling and the boom declares 2.5
  - Rationale: raising the global cap would lengthen the looping effects (enemy_explosion et al.) and change shipped R2 assets; a per-spec ceiling fixes only the finite chain that needs it
  - Severity: minor
  - Forward impact: any future long finite effect (e.g. U-019's passby set) uses the same knob

## Sm Assessment

**Story:** sw7-8 — R8 Audio content. 13pts, p2, tdd, repos: star-wars, orchestrator.

**Setup complete:**
- Session + context created.
- Branch `feat/sw7-8-r8-audio-content` cut off star-wars/develop (gitflow → PRs target develop, squash merge).
- No Jira (local tracking; jira_key = story id).

**Dependencies:** depends on sw7-2 (R2 Wave-parity, DONE).

**Pre-handoff verification:**
- Story moved to in_progress.

**Routing:** phased tdd → TEA owns RED.

**For TEA (O'Brien):**
- Story subsumes U-010..U-017, U-019, U-020, U-021/U-022 findings from the primary-source audit.
- U-010..U-014 (five tunes): PMSF2, PMCNT, PMEND, PMBEN, PMDES through the existing sw6-1 bake pipeline (PMSF2 is death-knell port).
- U-015/U-016/U-017 (speech wiring): SPKR2N on port miss, SPKTHI on surface entry, attract/game-over lines.
- U-021/U-022 (dedicated SFX): AUDDF (Death Star boom) and AUDSS (fireball-hit), currently reuse enemy_explosion.
- U-019/U-020 (defer-friendly): fly-by doppler set + R2 sound set — both size-L, can defer if trimming.
- Sound board timebase 8.192ms confirmed correct (U-001/U-002).
- R2 upload path per sw7-6 acceptance criteria.
- Enables A-019 (music-timed descent in sw7-9).
- Read the primary-source audit (star-wars/docs/2026-07-15-star-wars-primary-source-audit.md) and findings JSON for full context.
- Mark each finding `remediated_by: sw7-8` and keep `npm test -- citations` green.
## TEA Assessment

**Tests Required:** Yes
**Reason:** 13-point ROM-fidelity story: five tune bakes, four speech wirings, two dedicated SFX, a new core event type, and audit-ledger bookkeeping — every piece has a deterministic contract.

**Test Files:**
- `star-wars/tests/core/tune-cue.test.ts` — TuneName/tune GameEvent: deathKnell at torpedo ARMING (WSGUNS.MAC:1220 FRPTGN — the LAUNCH routine, not the kill), finale at detonation (WSMAIN.MAC:2179 PHIDX1), descent on the space→surface edge only (WSMAIN.MAC:1439); one-shot latches; negative guards on every other edge.
- `star-wars/tests/core/speech-cues-r8.test.ts` — r2Scream on the SURVIVING port miss only (the ROM's S.GAS gate, WSMAIN.MAC:1905-1914); THI before SIZ on surface entry; remember/theForceWillBeWithYou/always farewell in order on EVERY death path (PHIEGM; SPKFOA = TFOA sequence table 15.,16. — no new bake), one-shot.
- `star-wars/tests/shell/tune-channel.test.ts` — TUNES manifest (5 exact filenames under music/), playTune one-shot, ONE shared tune channel (the cabinet has one tune player) distinct from the music loop channel, silent degrade; SOUNDS gains deathStarBoom/fireballHit; main.ts `?raw` pins: tune arm, both SFX swaps (negatives bite on today's enemyDeath aliases), the cantina/Ben game-over fork.
- `star-wars/tests/shell/speech-serial.test.ts` — the TMS5220 is ONE serial chip: same-frame speak() cues queue and chain on source.onended, cue order = spoken order; drain guard.
- `star-wars/tools/music-bake/tune-data.test.mjs` — TUNES export (TRACKS shape, TRACKS untouched); TUNTAB indices SF2 1-4 / BEN 7-10 / CNT 11-14 / END 15-18 / DES 39-42 with voice labels; hand-transcribed voice-1 oracles for all five: the knell's flattened .CALL structure (30-note descending chromatic accelerando, 4-voice CKEY 0/-1/-3/-6 cluster), the cantina's .GOSUB/.RETURN inlining (CSUB1 riff returns), Ben's straight stream, the finale's NKEY 12. with the REST unshifted (SNDPM POKNL's soundful-note guard), the descent opening; radix refutations BOTH ways (dotted-decimal tempos vs hex 0CF).
- `star-wars/tools/pokey-bake/dedicated-sfx.test.mjs` — death_star_boom = AUDDF (SNDAUD.MAC:1004): all EIGHT channels, freq 70..78 with the ROM's gap at 74, 2×144-tick holds, longer than enemy_explosion when baked; fireball_hit = AUDSS (:1028): single channel (1,14.,8,0) + the four-record rising crackle, shorter than enemy_explosion.
- `star-wars/tests/audit/r8-remediation.test.ts` — U-010..U-017, U-021, U-022 must carry `remediated_by: sw7-8`; U-018/U-019/U-020 must STAY open (deferred ≠ fixed).

**Tests Written:** 79 tests (61 RED / 18 intended keep-behavior + negative guards, each pass audited) covering the five tune bakes, three tune cues, four speech wirings, serial speech, two SFX, wiring pins, and the ledger.
**Status:** RED (failing — ready for Dev). testing-runner full-suite: 61 failed, ALL in the seven new files; 1302 passing elsewhere, zero collateral. Commit `f6a6cf1` on `feat/sw7-8-r8-audio-content`.

### Rule Coverage

| Rule (lang-review/typescript.md) | Test(s) | Status |
|------|---------|--------|
| #3 exhaustiveness / union honesty | `TUNES carries no stray keys`; `REQUIRED_TUNES: TuneName[]` compile pin; main.ts never-guard forces the `tune` arm (pinned by `has a 'tune' arm`) | failing |
| #4 falsy-zero handling | BEN/END/CNT oracles pin the 0x00 REST surviving (a `||`-style drop scatters them); END pins the rest NOT taking NKEY | failing |
| #11 silent error handling | `playTune degrades silently when WebAudio is unavailable`; `playTune before resume is a no-op, not a crash` | failing |
| #1 type-safety escapes | New unions pinned as string-literal types (TuneName, SpeechLine additions); zero `as any` in the new suites (self-checked) | failing (type errors until GREEN — the established RED convention) |
| #8 test quality | Self-check below; every assertion is behavioral or a bite-tested text pin (negatives fail on today's code) | n/a |

**Rules checked:** 4 of 13 checklist sections apply to this story's surface; each has coverage.
**Self-check:** 0 vacuous tests found; the 18 pre-GREEN passes were individually audited as intended guards (keep-behavior or negative), not accidents.

**Quarry notes for Dev (the map, not the digging):**
- Tune sources: SWMUS.MAC via TUNTAB (:22-34). gen-music-data.mjs must learn `.CALL`/`.GOSUB`/`.RETURN` (flatten recommended — keeps music-data pure pairs and pm-player's walk intact) plus opcodes 0x8A/0x8C/0x81 reaching the player. SF2V5/V6 are TUNTAB subroutines with no `.TUNE` caller — data for the knell, not voices.
- SFX sources: SNDAUD.MAC DF tables (:315-347, all eight channels share one volume chain via the DF1C..DF8C fall-through) and SS tables (:364-369). Transcribe into the existing 4-byte swfx format; provenance can cite the ORIGINAL source (confidence: confirmed).
- Wiring seams: arming = the `portTorpedoArmed` latch edge (sim.ts:763-767); detonation = the existing `detonates` branch; descent = `progress()`'s space→surface edge; farewell = every `gameOver: lives <= 0` site (centralize or cover all five — the suite kills a single-branch wiring); cantina/Ben = main.ts's qualification edge (playTune both forks).
- After editing main.ts/sim.ts, line anchors in pair-audio.json shift: run `node tools/audit/reanchor-citations.mjs --write` and mark the ten findings `remediated_by: "sw7-8"` (the r8-remediation suite pins exactly which ten).
- R2 upload: the five tune .wavs + two SFX .wavs go to the same arcade-assets prefixes the manifests name (music/ and sfx/) — the sw6-1 deploy-assets path covers the mechanism.

**Handoff:** To Dev (The Word Burgers) for GREEN.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/events.ts` — `TuneName`/`TuneEvent` added to the GameEvent union; `SpeechLine` gains the five R8 lines (with call-site citations)
- `src/core/sim.ts` — deathKnell on the torpedo-arming edge, finale in the detonation branch, descent on the space→surface edge; `ENTER_PHASE_SPEECH` widened to ordered sequences (THI→SIZ); `pushFarewell` at every death site (space, surface, catwalk, fatal port miss); r2Scream gated on survival (the S.GAS split)
- `src/shell/audio.ts` — `TUNES`/`TUNE_CHANNELS` (one shared 'tune' channel) + `playTune` on the music engine instance; `SOUNDS`/`CHANNELS` exported and extended with deathStarBoom/fireballHit; speech rebuilt as a SERIAL queue (cue order = spoken order, chained on `source.onended`; failed fetch purges its queued cues so a dead head can't jam it)
- `src/main.ts` — 'tune' pump arm; death-star-destroyed→deathStarBoom, fireball-destroyed→fireballHit; game-over fork cues cantina (with beginNameEntry) / bensTheme
- `tools/music-bake/gen-music-data.mjs` — flattens `.CALL`/`.GOSUB`/`.RETURN` at generation time (recursion-guarded); emits the `TUNES` export (five one-shot tunes)
- `tools/music-bake/music-data.mjs` — regenerated: 4 tracks + 5 tunes, 44 voices
- `tools/music-bake/pm-player.mjs` — implements CRATE (PKCRAT: rate += arg), VC (PKCON), SYN (flag recorded; glide deferred — finding); CALL/GOSUB/RETURN still throw (flattened upstream)
- `tools/music-bake/bake-music.mjs` — bakes the merged catalogue; OUTPUT_FILES carries the five tune filenames
- `tools/pokey-bake/sfx-data.mjs` — death_star_boom (AUDDF, 8 channels, counted command $27) + fireball_hit (AUDSS, $34, 7-anchor calibration in the comments)
- `tools/pokey-bake/bake-sfx.mjs` — per-spec `maxSeconds` so the boom's finite 2.36 s chain isn't silently truncated by the 1.6 s sustained-envelope cap
- `docs/audit/findings/*.json` — U-010..U-017, U-021, U-022 marked `remediated_by: sw7-8`; citations reanchored (23 moved, 0 lost; U-023's verbatim updated for the CHANNELS export)

**Sibling test migrations (legitimate widenings, intent preserved):**
- `tests/core/events.test.ts` — union grows to eighteen ('tune' arm + fixture)
- `tools/music-bake/pm-player.test.mjs` — NEVER_REACHED shrinks to the still-unreached six
- `tools/music-bake/bake-music.test.mjs` — manifest-agreement covers MUSIC + TUNES
- `tools/pokey-bake/bake-sfx.test.mjs` — EXPECTED_SECONDS gains the two new effects
- `tools/music-bake/tune-data.test.mjs` — the knell oracle corrected 30→48 passes (SEE the major deviation; Reviewer must re-derive)

**Assets shipped:** `just deploy-assets` baked 9 music + 9 sfx wavs and uploaded to `arcade-assets.slabgorb.com/star-wars/{music,sfx}/`; all seven NEW files verified HTTP 200. The five tunes bake to: knell 0.44 s (48-note accelerating fall), cantina 27.9 s, finale 13.9 s, bensTheme 12.8 s, descent 6.3 s.

**Tests:** 1362/1362 passing (GREEN, testing-runner sw7-8-dev-green); `npm run build` (tsc + vite) clean.
**Branch:** `feat/sw7-8-r8-audio-content` (pushed, c2eeaee)

**Handoff:** To Immortan Joe for review (tdd: green → review). Review hot-spots: the knell-oracle correction (re-derive `.BYTE 8E, 30` under .RADIX 16 yourself), the serial speech queue's failure paths, and the main.ts game-over fork (text-pinned only).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1362/1362 green, tsc clean, 0 smells, tree clean) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 3, deferred 1 (SYN stub, low — folded into finding R-3's fix) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | clean | 1 (low) | dismissed 1 — duplicate same-name speech cues while decoding queue extra plays; the cabinet's own PBX FIFO queues repeated commands identically (SNDPBX design), cue sources are edge-gated one-shots in the core, and no attacker-controlled path exists; behavior is arguably MORE authentic than the old drop |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (16 rules, 61 instances) + 2 informational | N/A — both informational notes are pre-existing repo idioms (guarded `finding!` after toBeTruthy; documented silent-degrade catches) |

**All received:** Yes (4 enabled returned; 5 disabled via settings)
**Total findings:** 4 confirmed (3 from test-analyzer + 1 from my own probe), 1 dismissed (with rationale), 1 deferred (folded into R-3)

### Independent ROM verification (Reviewer's own, mechanical)

- **[VERIFIED] The knell-oracle correction (30→48) is RIGHT** — evidence: fresh raw-source read shows `SF2V5: ;.LOOP 30` / `.BYTE 8E, 30` (no dots, ambient .RADIX 16 → 0x30 = 48), and the decisive counterexample at SWMUS.MAC:828-829 — `;.LOOP 16.` / `.BYTE 8E, 16.` — proves the author dots BOTH comment and byte for decimal. An independent mini-decoder (fresh code, not the repo's) flattens SF2V1 to exactly 48 chromatically-descending notes E5(0x41)→0x12. Complies with the epic's match-bytes rule. Dev's correction ACCEPTED on independent evidence.
- **[VERIFIED] All 20 tune voice streams are byte-identical (mod 256) to a SECOND, independently-written parser** over SWMUS.MAC with its own .CALL/.GOSUB/.RETURN flattening — every voice of SF2/BEN/CNT/END/DES matches music-data.mjs TUNES exactly. Two implementations agreeing on 1,000+ byte pairs.
- **[VERIFIED] AUDDF/AUDSS transcriptions match a fresh parse of SNDAUD.MAC** — all 8 boom volume chains equal the fresh DF8C chain (18 records); the hit's freq/vol records identical. The 74-gap in the freq cluster is the ROM's own.
- **[VERIFIED] PBX ordinals $27 (AUD DF) / $34 (AUD SS)** — mechanical recount of SNDPBX's table (entry 0 = RESET, commented entries skipped) with seven independent calibration anchors all landing (SPK STR=$16, TRU=$18, YAU=$1A, PM DAR=$1D, 4TH=$20, RRP=$22, TH5=$24).
- **[VERIFIED] Citations exemption is by design** — check-citations.mjs:99-118: a remediated finding keeps the citation it was audited with (the historical record); my naive spot-check's "stale" hits on U-005/6/7 are that exemption working, not rot. Suite green post-reanchor (0 lost).
- **[VERIFIED] Data flow traced (finale)** — sim.ts detonates branch pushes `{type:'tune',tune:'finale'}` → main.ts `case 'tune'` → `audio.playTune('finale')` → shared engine `play` on the single 'tune' channel → `finale.wav` fetched eagerly from MUSIC_R2 (live 200 verified). Safe: TuneName is a closed literal union end to end; the pump is `never`-guarded (18/18 arms, rule-checker ADD-3).
- **[VERIFIED] main.ts ?raw pins bite** — test-analyzer reverted main.ts to develop in an isolated worktree: all four wiring pins went red (4/16). Not token theater.

### Rule Compliance

Per reviewer-rule-checker's exhaustive pass (16 rules × 61 instances, table in its result) + my own reading: **0 violations**. Highlights mapped to the lang-review checklist: #1 type escapes — none new (the one `finding!` is guarded by a preceding toBeTruthy throw, pre-existing idiom); #3 exhaustiveness — main.ts and events.test.ts both retain `never` guards over the 18-variant union; #4 `||`-vs-`??` — sim.ts:1033's `?? []` correct, REST=0 protected everywhere (domain oracles pin it); #7 promises — speak()'s chain terminates in a catch that purges and re-pumps (no float, no deadlock); #11 — 8 new descriptive throws in the generator, silent catches confined to the documented degrade contract. CLAUDE.md core/shell boundary: intact (no DOM/time/random in any new core code).

### Devil's Advocate

Assume this story ships broken. Where does it break? The bake pipeline is the deepest change — a NEW flattening pass (.CALL/.GOSUB) rewriting ROM byte streams before they're committed as generated data. If the flattener mis-nests a GOSUB inside a CALL, every downstream oracle built from the same assumptions agrees with the same mistake — the tests and the generator share an author. That is why I refused to accept agreement between them as evidence and wrote a THIRD implementation from the raw source; it matched all 20 voices byte-for-byte, which closes the shared-author loophole for the data. But the DYNAMICS are not closed: decodeVoice's return shape exposes no rate/vac/syn state, so the knell's accelerando — the audible soul of PMSF2 — is provably unpinned (the CRATE sign-flip mutation survives 72 tests). A future refactor could invert or drop the acceleration and ship a green, wrong knell. Same shape in the shell: the speech queue's failure path (a 404'd line) is the exact silent-death mode this epic exists to end — the purge code is correct today and NOTHING guards it; revert it and 57 tests stay green while one bad fetch mutes Luke for the whole run. And the sim: my probe proved a same-frame catwalk+port-miss death speaks the farewell TWICE — a real, reachable runtime defect no suite catches. Each item is small; together they are this epic's signature failure class (green suite, silent audio wrongness) reintroduced at three fresh seams. The tyrant's conclusion: the transcription is chrome; the guards are not yet.

## Reviewer Assessment

**Verdict:** REJECTED

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] | Double farewell: a same-frame catwalk crash + port miss on the last life pushes the REM/FOR/ALW trio TWICE (probe-confirmed: `remember` ×2 in one frame's events; the serial queue then speaks six lines). Reachable: catwalk and port scroll in lockstep and can cross the cockpit plane together. | `src/core/sim.ts` (pushFarewell call sites: catwalk crash + port-miss branch) | Make the farewell idempotent per frame (skip if the frame's events already carry `remember`) + a core test staging the double-death frame asserting exactly ONE trio |
| [MEDIUM] [TEST] | Speech-queue failure path unguarded: reverting the .catch queue-purge leaves 57 tests green while one rejected fetch permanently silences all later speech (dead head at queue[0]). The code is correct TODAY; nothing keeps it correct. | `tests/shell/speech-serial.test.ts` (gap); code at `src/shell/audio.ts:296` | Add a failing-fetch test: reject one line's fetch, assert (a) that line is skipped, (b) a line queued behind it still plays |
| [MEDIUM] [TEST] | The five tunes never pass through a bake test AND the CRATE accelerando is unpinned: `bake-music.test.mjs`'s it.each still iterates only the four loop tracks; flipping `this.rate += signed8(arg)` to `-=` (knell decelerates — audibly wrong) survives all 72 related tests. | `tools/music-bake/bake-music.test.mjs:20`, `tools/music-bake/pm-player.test.mjs:62` | Widen the bake it.each to the five tunes (peak/no-clip/determinism; skip the loop-seam check); pin CRATE's effect (successive knell note-onset spacing SHRINKS across renderVoice ticks) and VC's byte reaching output().audc; extend REACHED with CRATE/VC/SYN |
| [LOW] [TEST] | SYN's recorded-flag stub has no explicit assertion — its deferral is incidentally, not provably, intentional. | `tools/music-bake/pm-player.mjs:179` | Fold into the pm-player additions above (assert `syn` recorded) |

**What is already chrome (keep, do not re-litigate):** the 20-voice transcription (independently verified byte-identical), the AUDDF/AUDSS records and their counted PBX ordinals, the knell-oracle 30→48 correction (independently re-derived — ACCEPTED), the reanchored citations (0 lost), the R2 uploads (live 200s), the wiring (pins proven to bite), and 1362/1362 green with tsc clean.

**Data flow traced:** core tune event → never-guarded pump → closed-union playTune → fixed R2 base fetch (see Independent Verification).
**Pattern observed:** core-owns-WHEN/shell-owns-HOW held consistently across all three new cue kinds — good pattern, `src/core/events.ts:216-226`.
**Error handling:** generator throws loudly on malformed subroutine structure (8 sites); shell keeps the documented silent-degrade contract; the ONE unguarded failure path is finding R-2.
**Dispatch tags:** [EDGE] n/a (disabled) · [SILENT] n/a (disabled) · [TEST] findings R-2/R-3/R-4 confirmed from test-analyzer · [DOC] n/a (disabled) · [TYPE] n/a (disabled) · [SEC] 1 dismissed with rationale · [SIMPLE] n/a (disabled) · [RULE] clean (16 rules, 0 violations)

**Handoff:** Back through the red gate — Imperator Furiosa (TEA) owns the four missing tests; The Word Burgers (Dev) owns the two-line farewell idempotence fix. All four findings are testable; the fix list is closed and small. Ride back shiny.

### Reviewer (audit) — deviation stamps

- **TEA: Surface entry speaks BOTH lines sequenced (ROM either/or)** → ✓ ACCEPTED by Reviewer: the finding's own remediation note and the story context choose sequenced-both; the ROM's wave-select gate has no seam in a select-less sim, and the either/or machine is documented for a future select story.
- **TEA: Farewell on the death frame, not two seconds later** → ✓ ACCEPTED by Reviewer: no death-animation phase exists to defer into; utterance order preserved by the serial queue. (The DOUBLE-farewell edge is a separate code defect — finding R-1 — not this deviation.)
- **TEA: cantina/bensTheme pinned as main.ts text** → ✓ ACCEPTED by Reviewer: established sw3-5 idiom, and the test-analyzer PROVED the pins bite (develop-reverted main.ts → 4 pins red). The pump-extraction improvement stays filed.
- **TEA: U-019/U-020 no tests (deferred)** → ✓ ACCEPTED by Reviewer: the boss's R8 ruling defers both; the ledger pin correctly guards against a zealous remediation sweep.
- **Dev: knell oracle corrected 30→48 (Dev edit to a TEA test)** → ✓ ACCEPTED by Reviewer: independently re-derived from raw source — `.BYTE 8E, 30` under ambient .RADIX 16 with the SWMUS.MAC:828 dotted-decimal counterexample (`;.LOOP 16.` / `.BYTE 8E, 16.`); a fresh third-implementation decode confirms 48 chromatic passes E5→0x12. The correction upholds the epic's match-bytes rule; the process exception (Dev editing a RED oracle) was logged loudly and survives scrutiny.
- **Dev: SYN recorded, glide not modelled** → ✓ ACCEPTED by Reviewer: honest stub + filed finding beats a fabricated portamento or an unbakeable knell. The provable-intent assertion is folded into finding R-3/R-4's fix.
- **Dev: expandSwfx per-spec maxSeconds** → ✓ ACCEPTED by Reviewer: the global cap correctly bounds LOOPING envelopes and would have silently amputated 0.75 s of finite authentic decay; the per-spec ceiling is the minimal correct fix and EXPECTED_SECONDS pins the resulting 2.379 s.
## TEA Assessment (rework — review findings R-1..R-4)

**Tests Required:** Yes (4 review findings, all testable)
**Test Files (rework additions, commit abafa2c):**
- `tests/core/speech-cues-r8.test.ts` — R-1: double-death frame (catwalk + port miss, last life) speaks the farewell ONCE. **RED today** — the trio stacks (Immortan Joe's probe, now permanent).
- `tests/shell/speech-serial.test.ts` — R-2: a rejected fetch is skipped and the line behind it plays; the queue drains. Born-green guard, **mutation-proven** (purge reverted → red).
- `tools/music-bake/pm-player.test.mjs` — R-3/R-4: CRATE accelerando pinned twice (synthetic shrinking spans + the real knell under its ROM-derived constant-rate floor `ceil(48·256/0xCF)`); VC's byte reaching `output().audc`; REACHED extended; SYN exposure `decodeVoice(...).syn`. **Mutation-proven** (sign-flip mutant dies twice; VC-drop mutant dies). SYN exposure is **RED today** (field not surfaced).
- `tools/music-bake/bake-music.test.mjs` — R-3: the five tunes ride the same peak/rms/no-clip gate as the loops (ROM-derived duration floors) + knell determinism. Green (the bakes were already sound); guards the CATALOGUE path.

**Status:** RED (2 failing: R-1, R-4-exposure) — ready for Dev. Dev's fix list: (1) farewell idempotence guard in sim.ts (skip when the frame's events already carry `remember`); (2) expose `syn` on decodeVoice's return (1 line).
**Self-check:** every born-green guard was mutation-tested serially with the tree restored after each (3 mutants, 6 red tests among them); no vacuous assertions.

**Handoff:** To The Word Burgers for GREEN (rework).
## Dev Assessment (rework — R-1/R-4 fixes)

**Implementation Complete:** Yes
**Files Changed (commit 83f25e3, pushed):**
- `src/core/sim.ts` — pushFarewell is idempotent per frame (skips when the frame already carries `remember`); the same-frame double-death now speaks one trio
- `tools/music-bake/pm-player.mjs` — decodeVoice's opening-settings capture exposes the recorded `syn` flag
- `docs/audit/findings/*.json` — 9 anchors reanchored after the sim.ts guard (0 lost)

**Deviations:** none — both fixes are exactly the Reviewer's prescribed shape.
**Tests:** 1374/1374 passing (GREEN, sw7-8-dev-green-3); tsc clean.
**Branch:** `feat/sw7-8-r8-audio-content` (pushed, 83f25e3)
**Handoff:** Back to Immortan Joe for re-review of the rework delta (c2eeaee..83f25e3 + the rework RED commit abafa2c).
## Reviewer Assessment (re-review of the rework delta)

**Verdict:** APPROVED

**Scope:** commits `abafa2c` (rework RED) + `83f25e3` (fixes + reanchor) against the round-1 rejection; the round-1 apparatus (4 specialists, independent ROM verification, deviation audit) stands unchanged for the base delta.

**Findings closure — every round-1 finding verified closed:**
- **R-1 (double farewell)** → CLOSED. Fix is the prescribed per-frame idempotence guard (`sim.ts` pushFarewell); the Reviewer probe is now a permanent test; **my own mutation** (guard removed) reddens exactly that test — load-bearing, not coincidental. The guard key (`remember`) has exactly one cue source and events reset per frame, so it can neither suppress a legitimate farewell nor leak across frames.
- **R-2 (queue failure path)** → CLOSED. Failing-fetch test added: the dead line is skipped, the follower plays, the queue drains; purge-revert mutation reddens it (witnessed serially, tree restored).
- **R-3 (tunes unbaked + CRATE unpinned)** → CLOSED. Five tunes ride the same peak/rms/no-clip gate (ROM-derived duration floors) + knell determinism; CRATE pinned twice (synthetic shrinking spans + the real knell under its ROM-derived constant-rate floor) — the sign-flip mutant that survived 72 tests now dies twice; VC's byte pinned to `output().audc` (drop-mutant dies); REACHED extended.
- **R-4 (SYN unasserted)** → CLOSED. `decodeVoice(...).syn` exposed and pinned both on and off.

**Mechanical state:** 1374/1374 green (testing-runner sw7-8-dev-green-3), `tsc --noEmit` clean, citations reanchored after the guard (9 moved, 0 lost), working tree clean, branch pushed (`83f25e3`).

**Deviation audit:** all seven round-1 stamps stand; the rework logged no new deviations (both fixes are the prescribed shapes — verified against the delta diff).

**Data flow traced:** double-death frame → single farewell trio → serial queue (unchanged path, now guarded end to end).
**Pattern observed:** mutation-proven guards as the rework standard — every born-green test in `abafa2c` had its mutant run and killed; good pattern worth keeping (`tools/music-bake/pm-player.test.mjs` sw7-8 suites).
**Error handling:** the one unguarded failure path from round 1 (queue purge) is now the guarded, tested path.
**Dispatch tags:** [EDGE] n/a (disabled) · [SILENT] n/a (disabled) · [TEST] R-2/R-3/R-4 closures verified · [DOC] n/a (disabled) · [TYPE] n/a (disabled) · [SEC] round-1 dismissal stands · [SIMPLE] n/a (disabled) · [RULE] delta re-checked against #3/#4/#11 — clean

### Reviewer (code review) — rework round

- No upstream findings during re-review.

**Handoff:** To The Organic Mechanic (SM) for finish-story. Ride eternal — shiny, chrome, and mutation-proof.
## Impact Summary

Compiled from the Delivery Findings (7 findings across TEA/Dev; Reviewer rework round clean):

- **Pipeline capability unlocked (TEA Gap):** the music bake now handles `.CALL`/`.GOSUB`/`.RETURN` flattening and the CRATE/VC/SYN opcodes — future tune stories are config again, not pipeline work.
- **Routed to sw7-9 / A-019 (TEA Improvement):** the ROM's timed win/descent choreography (PMSF2 escape → staged AUDDF booms → PMEND; PMDES → descend → PM4TH). This story's same-frame overlaps are documented adaptations.
- **Cheap follow-up (TEA Improvement):** AUDSS as the initials-entry backspace sound (TCHSCR.MAC:588) — one dispatch line now that fireball_hit.wav exists.
- **Scoping note (TEA Question):** SPKFOR/SPKALW are coin-insert lines; no seam without a credit concept — likely wont_fix per the no-coin-op house rule.
- **Testability improvement (TEA):** extracting main.ts's pump into an importable module would upgrade the ?raw text pins to behavioral tests.
- **Deferred fidelity (Dev Improvement):** the knell's SYN glide is recorded but not modelled — model VSA in renderVoice, then re-bake death_knell.wav.
- **Oracle correction precedent (Dev Conflict, resolved):** the knell's `.LOOP 30` is hex 48; corrected in-phase with evidence, independently re-derived by the Reviewer.
- **Still open in the audit ledger:** U-018 (needs mechanics), U-019 (fly-by doppler set), U-020 (R2 sound set) — deferred by the R8 ruling, pinned open by r8-remediation.test.ts.
