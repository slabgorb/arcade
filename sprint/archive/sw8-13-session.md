---
story_id: "sw8-13"
jira_key: "sw8-13"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-13: Space warp tune-channel priority

## Story Details
- **ID:** sw8-13
- **Jira Key:** sw8-13
- **Workflow:** tdd
- **Stack Parent:** sw8-12 (done)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T13:46:41Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T11:41:18Z | 2026-08-01T11:43:42Z | 2m 24s |
| red | 2026-08-01T11:43:42Z | 2026-08-01T12:00:09Z | 16m 27s |
| green | 2026-08-01T12:00:09Z | 2026-08-01T12:09:27Z | 9m 18s |
| review | 2026-08-01T12:09:27Z | 2026-08-01T13:35:49Z | 1h 26m |
| green | 2026-08-01T13:35:49Z | 2026-08-01T13:38:28Z | 2m 39s |
| review | 2026-08-01T13:38:28Z | 2026-08-01T13:46:41Z | 8m 13s |
| finish | 2026-08-01T13:46:41Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Improvement** (non-blocking): the story's "stale tune-cue.test.ts routing
  comment (sw7-9/A-019)" scope item was already resolved before this story ran —
  grep finds no sw7-9/A-019 reference anywhere in star-wars tests/ or src/;
  sw8-12's re-seat removed it. Scope item retired, no work owed.
  Affects nothing (verified absent). *Found by TEA during test design.*
- **Gap** (non-blocking): `sim.ts:650-651`'s comment claims "A dead cockpit never
  reaches this stepper (the gameover branch exits first)" — true only for a
  frame ENTERED dead; a fatal hit resolved mid-frame (loseShield at :632) still
  reaches the unconditional milestone block at :652-656, which is exactly the
  divergence under test. The comment must gain the same-frame nuance in the same
  edit that gates the block, or it re-becomes sw8-18-class wrong prose.
  Affects `plugins/star-wars/src/core/sim.ts` (comment + gate, one edit).
  *Found by TEA during test design.*

### Reviewer (code review)

- **Improvement** (non-blocking): the surface phase carries the IDENTICAL
  death-gate divergence sw8-13 just fixed for space — the ROM's PHEGD does
  `LDA S.GAS / LBMI PHIG0D ;J EXIT WHEN DEAD` (WSMAIN.MAC:1645-1646) BEFORE
  the PH.TIM walk that fires `JSR PMREB` (:1673), while our surface stepper
  pushes `finishGround` (sim.ts:995-997) before the frame's loseShield
  (:1126) with no lives gate. Pre-existing (sw7-18's rider), out of this
  story's named scope (context names PHESP1/space). **Filed as sw8-21** with
  the full quarry. Affects `plugins/star-wars/src/core/sim.ts` (port the
  sw8-13 gate shape to the speed-crossing sibling).
  *Found by reviewer-rule-checker (#14 family sweep), ROM-verified by
  Reviewer, during code review.*
- Round 2: no further upstream findings (comment-only rework, verified clean).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Dev re-seated a TEA test helper (pm-channel.test.ts fake-source physics)**
  - What changed: added an `ended` flag + `ringOut()` helper so a one-shot that
    finishes naturally stops counting as "ringing" (a real AudioBufferSourceNode
    goes silent without stop(); the fake only modelled stop()-silence).
  - What the spec/tests said: the no-resume pin asserted `ringing()` empty after
    the knell's onended — unsatisfiable under the fake's physics, since the
    engine (correctly) never calls stop() on a source that ended by itself.
  - Why: intent-preserving fixture correction, not a weakening — both of the
    test's assertions (nothing sounding after ring-out; no fresh trench source
    minted) survive and still pin the no-auto-resume behavior. Flagged for
    TEA/Reviewer attention since Dev touched a RED-phase file.
  - Severity: minor

### Reviewer (audit)

- **Dev re-seated a TEA test helper (pm-channel.test.ts fake-source physics)**
  → ✓ ACCEPTED by Reviewer: agrees with author reasoning, and verified
  independently — the `ended`/`ringOut()` re-seat models what a real
  AudioBufferSourceNode does (goes silent without stop(); onended after), and
  the no-resume pin keeps BOTH teeth: `ringing()` empty after ring-out AND the
  trench source-count === 1, which reddens if the engine ever auto-restarts a
  stolen loop (a fresh source would be minted). Mutation A confirms the whole
  test still fails hard when the unification is reverted, so the re-seat did
  not defang it.
- No undocumented deviations found: the diff was swept against the RED design
  (channel maps, gate placement, prose targets) and everything else matches
  TEA's handoff.

## Sm Assessment

Setup complete for sw8-13 (1pt, p3, bug, tdd). Dependency sw8-12 is done; no
remote branch or sibling session claims the story. Context file
`sprint/context/context-story-sw8-13.md` enriched from sw8-12's archived
Delivery Findings/Impact Summary — the sm-setup stub was replaced (per the
standing context-stub check). Scope: the shell tune/music channel priority model
in `plugins/star-wars/src/shell/audio.ts` — decide/port the cabinet's single-PM-
player steal semantics (towers music PM4TH steals a ringing descent PMDES; any
new tune silences the loop). Story also owns the [EDGE][LOW] death-frame tune
nuance and the stale tune-cue.test.ts routing comment (sw7-9/A-019, both
closed). Trunk-based, no feature branch.

**Routing:** → TEA for the RED phase (define ACs + failing tests pinning the
ruled steal semantics at the warp overlap).

## TEA Assessment

**Tests Required:** Yes

**THE RULING** (settled from primary source, not the longplay): the cabinet has
ONE PM player. Every PM entry — music (PMTH5 :372, PM4TH :379, PMTHB :386,
PMDAR :400, PMRRP :365) and one-shot tunes (PMSF2 :330 … PMDES :393) alike —
claims POKEY voices 1-4 via four `.TUNE` invocations; the macro's expansion
opens with `JSR PKCUT'VNUM ;CLEAR OUT AND INIT THIS VOICE` (SNDPM.MAC:319-326).
Unconditional clear, no priority test, no resume — the steal is SYMMETRIC (even
the repeating trench PMRRP dies to the torpedo's PMSF2), which refutes the
story's narrower "music-starts-kill-tunes" option. Port = ONE logical channel
shared by every music track and every tune. Corollary ruled FAITHFUL: a tune
ringing across gameover — PHIS0D skips only speech (`JSR SPKSKP`, WSMAIN.MAC:
2036); PM voices ring until the endgame cues steal them. No stop-at-gameover.

**Test Files:**
- `tests/shell/pm-channel.test.ts` (NEW) — union-of-channels pin; behavioral
  steals both directions (PM4TH over PMDES = the warp; PMSF2 over PMRRP;
  PMTHB over the space loop); no-resume after ring-out; SFX/speech isolation.
- `tests/shell/tune-channel.test.ts` — FLIPPED the sw7-8 pin "a knell must not
  kill the phase loop" (overturned by the ruling); header prose updated.
- `tests/core/space-music-milestones.test.ts` — sw8-13 death-frame describe:
  PHESP1's `LDA S.GAS / LBMI PHIS0D` (WSMAIN.MAC:1396-1397) precedes the
  PH.TIM walk, so a crossing on the last-shield frame cues nothing; controls
  pin the gate to lives==0 (alive hit still cues), covering the [EDGE][LOW]
  finding inherited from sw8-12.

**Tests Written:** 14 (8 new shell + 1 flipped + 5 core); **9 RED**, 5 green by
design and declared inline (tune-over-tune steal, SFX/speech isolation guards,
two alive controls — they fence the unification and the gate from overreach).

**Status:** RED (9 failing / 2063 passing on the star-wars project; lint clean;
verified by direct full-project run — failures are exactly the 9 intended pins,
zero collateral). Committed and pushed as b158bac (claims the story on origin).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| TS #1 type-safety escapes | no `as any`/`!`/casts in new tests; typed FakeSource interface | self-check clean |
| TS #2 generics | channel maps already `Record<Name, string>` (compile-time key coverage pinned by existing suites) | n/a (no new API) |
| TS #4 null handling | `srcOf(...)?.stopped` asserted against explicit booleans, never truthiness | clean |
| test quality (vacuous) | every green-on-arrival guard is declared inline with its reason | 0 vacuous found |

**Rules checked:** behavior-pin story; the TS checklist's API-design rules
target implementation code, which this phase does not touch.
**Self-check:** 0 vacuous assertions (each pin asserts concrete files/values;
`ringing()` equality checks pin exact survivor sets, not mere containment).

**Dev notes (GREEN scope):**
- Unify the channel VALUE across `MUSIC_CHANNELS` + `TUNE_CHANNELS` in
  `src/shell/audio.ts` — the shared engine already steals per-channel
  (startSource → stopChannel), so no @shared/audio change is needed.
- Rewrite the now-false two-channel prose: audio.ts :93-103, :125-139,
  :194-206 (interface docs), :229-241; main.ts pump-arm comments are still
  true. Do NOT resurrect "the two never steal each other".
- Gate the sim.ts milestone block (:652-656) on post-hit `lives > 0` and fix
  the :650-651 comment in the same edit (see Delivery Findings).
- If edits shift audit-cited lines, run `tools/audit/reanchor-citations.mjs
  --write` (sw7-21 standing rule).

**Handoff:** To Dev for implementation.

## Dev Assessment

**Status:** GREEN — star-wars 2072/2072 (192 files), lint clean, orchestrator
358/358, citation gate 12/12 (source-side describe ran, not skipped).
Committed as 6e0a548 (pushed).

**Implementation (minimal, as the RED design intended):**
- `src/shell/audio.ts` — the whole behavioral change is the channel maps:
  `MUSIC_CHANNELS` + `TUNE_CHANNELS` all map to one `'pm'` channel. The shared
  engine's per-channel steal (`startSource` → `stopChannel`, loop/one-shot
  agnostic) supplies the PKCUT semantics with no @shared/audio change: any
  start steals in both directions, a stolen loop stays dead. SFX remain a
  separate engine instance; speech its own context — outside the steal.
- `src/core/sim.ts` — the three milestone pushes now sit under
  `if (lives > 0)` (post-`loseShield` lives), porting PHESP1's death exit
  (`LDA S.GAS / LBMI PHIS0D` before the PH.TIM walk, WSMAIN.MAC:1396-1397).
  The :650 comment gained the same-frame nuance per the TEA finding.
- Prose corrected where the two-channel model was asserted: audio.ts interface
  docs + engine construction + MUSIC manifest divergence notes (now state the
  narrowed steal windows: space loop rings 2s-10s until themeB; towers until
  finishGround), main.ts pump arms, events.ts TuneEvent doc. Did NOT touch
  events.ts:217's "five one-shot POKEY tunes" stale count — that is sw8-15's
  filed scope.
- 19 audit citations re-anchored (`reanchor-citations.mjs --write`, line drift
  from comment edits only, 0 lost — sw7-21 standing rule).

**Non-vacuity evidence:** the RED→GREEN transition itself is the mutation
proof for both flanks (channel split → 6 shell reds; missing gate → 3 core
reds, all observed failing before 6e0a548 and passing after with zero
collateral across 2072 tests).

**Handoff:** ready for review phase.

### Rework round 1 (review findings F1/F2) — committed f2519a7 (pushed)

Prose-only, exactly as prescribed — no behavior, no tests, no new claims
beyond what was verified:
- **F1** `src/shell/audio.ts` stopLoop doc rewritten to the one-PM-player
  model: name-blind channel silence (loop OR still-ringing tune), explicitly
  "NOT a no-op just because nothing loops," notes zero game callers (verified
  by grep: only the impl forwarding at :354 and music-channel's not-throw
  guards) and that phase edges swap loops via startLoop's steal (main.ts
  'music' arm). The no-throw half of the old sentence is kept — that part the
  not-throw tests do pin.
- **F2** `tests/shell/music-channel.test.ts` header: "a dedicated `music`
  channel" → "one shared logical channel ('music' then; since sw8-13 the same
  PM channel the tunes ride — no longer dedicated)" — sw3-5 narrative kept,
  current fact corrected.
- **Verification:** the Reviewer's round-trip grep (`dedicated .music.` |
  `no-op when nothing is looping`) returns nothing; affected suites 76/76
  green (music-channel, audio, pm-channel, tune-channel, citations); tsc
  clean. Audit pins into audio.ts (:51/:106/:165) all sit ABOVE the edit at
  :210, and audio.test.ts's ?raw guard slices only the SPEECH block (:255) —
  checked BEFORE editing, so no re-anchor and no ?raw window disturbed.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | No | error (stalled after 2 tool calls, silent ~20 min; pinged, stood down) | none delivered | Domain covered by Reviewer directly: star-wars 2072/2072 (192 files), orchestrator green (fail 0), lint clean + citation gate 12/12 (rule-checker's independent runs), diff smell grep clean (no TODO/FIXME/console.log/.skip/.only/`as any`/`@ts-ignore`/non-null `!`), tree clean before and after |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer: death-frame boundary pinned by my mutation C (pre-hit vs post-hit lives, 3 red); decode-pending steal edges traced through @shared/audio; spaceCues filter scope verified honest |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: stopChannel's catch is the documented already-ended guard, not a swallow; silent-degrade contracts unchanged; no new catches in diff |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer with executed mutations in an isolated worktree: A (channel re-split) → exactly the 6 claimed shell pins red; B (gate deleted) → exactly the 3 death pins red; C (pre-hit `state.lives`) → 3 red; controls 48/48 green; green-on-arrival guards declared inline and verified fencing |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer BY HAND (doc-heavy diff): found F1 (stopLoop doc falsified — probe-proven) and F2 ("dedicated `music` channel" survivor); Dev's sw8-15 descope claim verified true against epic-sw8.yaml:156 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — covered by rule-checker checks #1–#5 (0 violations; FakeSource fully typed; Record types unchanged) and Reviewer |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: no input boundary, no auth, no new network surface; domain N/A for this diff |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer: change is minimal by design (two map value-sets + one gate); no dead code added; old channel names grepped: no consumer expected 'music'/'tune' values |
| 9 | reviewer-rule-checker | Yes | findings | 1 (+ full compliance sweep) | confirmed 1 — [RULE] finishGround death-gate gap, ROM-verified by Reviewer at PHEGD (WSMAIN.MAC:1645-1646 vs PMREB :1673) and sim.ts:995-997/:1126 ordering, routed non-blocking → **sw8-21 filed**; its COMPLIANT sweep accepted (19 rules / 71 instances / 16 ROM cites exact / 19 intra-repo cites exact / laundering 0 / 14 frozen pins correctly untouched); its self-declared mutation gap covered by my executed mutations A/B/C |

**All received:** Yes (all 9 rows accounted for: rule-checker's report
received; preflight recorded as ERROR per rule 1 — it stalled and never
reported, so no coverage is claimed from it; its entire domain was re-run by
the Reviewer directly with every number recorded in row 1 — star-wars
2072/2072, orchestrator fail 0, lint clean, citations 12/12, smells clean,
tree clean — and independently re-measured by the rule-checker in round 2;
the 7 remaining rows are disabled via settings, each with its hand-coverage
named in its Decision column.)

**Total findings:** 3 confirmed (1 [RULE] non-blocking → sw8-21; 2 [DOC]
blocking rework items F1/F2), 0 dismissed, 0 deferred.

**Round 2 (rework f2519a7):** reviewer-rule-checker re-dispatched on the fix
diff — Received Yes, status clean (every added prose claim VERIFIED against
code, #13/#15 clean, round-trip grep empty, full star-wars suite 2072/2072
independently re-run, audit pins confirmed). reviewer-preflight not
re-dispatched: the diff is comment-only, and its domain (suite/lint/citations)
was re-measured by both the rule-checker and the Reviewer post-fix.

### Rule Compliance

Checklist: `.pennyfarthing/gates/lang-review/typescript.md` (15 checks), swept
by reviewer-rule-checker across every changed `.ts` file (71 instances) and
spot-verified by me. Per-rule result:

- **#1 type-safety escapes** — 0 violations (every + line grepped: no `as
  any`/`as unknown`/`@ts-ignore`/`@ts-expect-error`/non-null `!`).
- **#2 generics/interfaces** — compliant ×3: `FakeSource` (pm-channel.test.ts)
  fully typed with specific signatures; `MUSIC_CHANNELS`/`TUNE_CHANNELS` keep
  `Record<MusicName|TuneName, string>`, values-only change.
- **#3 enums** — N/A (none in diff). **#6 React** — N/A. **#9 build/config** —
  N/A (no config touched). **#10 input validation** — N/A (no boundary).
  **#11 error handling** — N/A (no new catches). **#12 perf/bundle** — N/A.
- **#4 null/undefined** — compliant ×6: `?? ''` in fileOf is correct nullish
  use; `srcOf(...)?.stopped` asserted against explicit booleans.
- **#5 modules** — compliant ×3: `type`-marked type-only imports; extensionless
  relative imports are the repo convention (moduleResolution: bundler).
- **#7 async** — compliant ×7: every async test body settles the real
  fetch→arrayBuffer→decode chain (8-tick settle traced sufficient).
- **#8 test quality** — compliant ×14 (8 new + 5 core + 1 flipped): no casts,
  house-idiom stubs (speech-serial.test.ts pattern), 48/48 green by direct run.
- **#13 fix-regressions** — GREEN commit re-scanned: no silencing casts, no
  `||`-for-`??`, no type drift.
- **#14 branch-local edges** — 1 VIOLATION (pre-existing, NOT in the diff's
  changed lines): sim.ts:995-997 finishGround push lacks the death gate the ROM
  gives its phase (PHEGD, WSMAIN.MAC:1645-1646 before :1673) — "one member of a
  family handled centrally and its siblings handled locally" verbatim. Routed
  non-blocking → sw8-21 (out of the story's named PHESP1/space scope). The
  diff's own gate is COMPLIANT: all three pushes in ONE branch, `lives` and
  `phaseTime` computed unconditionally above it; the only other phase-edge
  music push (progress(), sim.ts:1762) has its own gameOver short-circuit
  (:1751).
- **#15 token-vs-claim assertions** — 0 violations: union pin reads the real
  exported maps; steal pins are behavioral (started/stopped state); death pins
  drive stepGame and read returned events; no source-text greps added.
- **ROM citation extent (hard asks)** — 16/16 EXACT, sed-verified: the .TUNE
  macro's `JSR PKCUT'VNUM` at SNDPM.MAC:324 inside cited :319-326; all 11 PM
  entry labels line-exact (:330-405 range exact, PMTST correctly outside);
  WSMAIN.MAC:1396-1397 (PHESP1 exit, above the :1415-1444 walk), :1636 (PM4TH,
  its ONLY call site — no scope overclaim), :2036 (SPKSKP → SNDSPK.MAC:205,
  speech-only, so the gameover corollary holds). Independently re-derived by
  Reviewer with universal-newline reads — same answers on a different axis.
- **Intra-repo citations** — 19/19 re-anchored pins byte-exact against the
  post-diff tree; my own duplicate-verbatim scan: every moved pin resolves
  UNIQUELY at its new line (0 td1-13-class mis-anchor candidates). Laundering
  grep over the 8 pair-*.json hunks: every changed line is `"line": N` — 0
  prose/source/stamp edits. 14 `remediated_by` frozen pins correctly left
  untouched.

### Devil's Advocate

Assume this code is broken. The strongest attack is the one F1 documents: a
future dev, reading `stopLoop`'s contract ("Safe no-op when nothing is
looping there"), wires `stopLoop('space')` into a phase edge or a pause
handler. On the shared 'pm' channel that call now kills whatever rings —
a still-tolling death knell, the cantina at the table — and NOTHING reddens,
because stopLoop's only tests are not-throw guards. That is a silent
wrong-steal bug with a lying doc inviting it, the exact class this story was
filed to kill; it is why F1 blocks despite zero current callers. Second
attack: undecoded assets. If towers_theme.wav has not decoded at the warp,
startLoop parks a pending request and the descent tune keeps ringing — the
overlap the story retires briefly returns, then the late decode steals. That
is the pre-existing, documented sw6-2 pending contract ("No-op until … the
track has decoded"), unchanged by this diff, and the alternative (dropping the
loop) is worse — accepted. Third: same-frame double cues. A detonation and a
knell on one frame race to one channel; last startSource wins, which
sim.ts:1512 documents as the one-player behavior — faithful. Fourth: could the
gate eat a cue it shouldn't? Only if lives could read 0 on a frame the cabinet
counts as alive; loseShield returns post-hit lives and the boundary control
(2→1 lives, cue expected) pins exactly that seam — mutation C proves the
suite catches the pre-hit misread. Fifth: the fake's physics — could `ended`
hide a real regression? Only if the engine stopped calling stop() on steals;
mutation A reddens precisely that world. The attack surface that remains
standing is prose, and both survivors are in the findings table.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — the round-1 prose rework verified; the
engineering was verified in round 1 and is unchanged since)

**Round-2 scope and method:** the rework (f2519a7) is COMMENT-ONLY — proven
by grepping every +/- line for non-comment content (2 files, 7 insertions).
Because this session authored the fix itself, the round-2 evidence is
independent: reviewer-rule-checker was re-dispatched to ATTACK every claim in
the added prose, and my own re-verification ran as executed probes in an
isolated worktree at f2519a7, not as re-reading.

| Round-1 finding | Status | Independent re-verification |
|-----------------|--------|------------------------------|
| F1 [MEDIUM] stopLoop doc falsified (audio.ts:210-211) | **FIXED** | Worktree probe 3/3 on f2519a7: a ringing tune IS silenced name-blind; the loop still stops; no-throw without WebAudio — the rewritten doc describes exactly the measured behavior. Rule-checker verified all 5 sub-claims against @shared/audio.ts:167-177/:231-238, the caller grep (only the :358 interface forwarding + 2 not-throw tests — "no game path calls it today" TRUE), and main.ts:234-241 ("phase edges swap via startLoop" TRUE) |
| F2 [LOW] "dedicated `music` channel" (music-channel.test.ts:6) | **FIXED** | Rule-checker verified both halves: pre-sw8-13 values were 'music'/'tune' (git show 6e0a548^), current maps all 'pm'; the "no longer dedicated" phrasing matches. History-squash caveat noted honestly and corroborated via the import commit |

**Fix-diff re-scan (#13/#15):** clean — no new false or unverifiable claim;
no `?raw`/raw-read window overlaps either edit (audio.test.ts's slice closes
at SPEECH's `} as const`, before the interface; audio-migration.test.ts's 5
regexes match none of the new prose; nothing raw-reads music-channel.test.ts).
The round-1 round-trip grep returns zero matches tree-wide. Full star-wars
suite independently re-run by the rule-checker: 2072/2072; lint clean; audit
findings JSON untouched and pins audio.ts:51/:106/:165 confirmed still exact.

**Non-blocking finding routed in round 1 stands:** sw8-21 (the PHEGD
finishGround death gate) — untouched by this rework, correctly so.

**Dispatch tags (round 2):** [RULE] rule-checker re-attack clean, zero
refutations; [DOC] both prose findings verified fixed by agent AND probe;
[EDGE] [SILENT] [TEST] [TYPE] [SEC] [SIMPLE] — domains structurally
unreachable by a comment-only diff; round-1 hand coverage stands unchanged.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

### Round 1 — REJECTED (both findings now fixed; kept for the record)

**Round-1 verdict (superseded):** REJECTED — prose-only rework; the
engineering is correct and stays

**What is right, said plainly first:** the implementation is minimal and
correct — two channel-map value sets and one three-line gate carry the whole
behavior, exactly as the RED designed. Every Dev claim I tested reproduced:
2072/2072 + orchestrator green + lint clean + citations 12/12 re-measured;
mutations A (re-split → the 6 named shell pins red), B (gate deleted → the 3
death pins red), and my own extra C (pre-hit `state.lives` → 3 red) all bite
with zero collateral, run in an isolated worktree and restored. The RULING
itself was re-derived from primary source on my own axis — .TUNE → `JSR
PKCUT'VNUM` (SNDPM.MAC:324), eleven PM entries all claiming voices 1-4,
SPKSKP speech-only — and holds. All 35 citations (16 ROM + 19 re-anchored)
are byte-exact, the audit JSON diff is laundering-free, and the one logged
deviation is stamped ACCEPTED. The death knell now steals the phase loop at
gameover, which the old two-channel overlay could not do — a faithful gain
nobody claimed.

**Why a MEDIUM cluster still blocks (stated, not inflated):** the story's
charter explicitly included "rewrite the now-false two-channel prose," and
TEA's handoff named audio.ts :194-206 (interface docs) as a rewrite target.
The falsified stopLoop sentence sits at pre-diff :198 — INSIDE that named
range, between the two verbs Dev did rewrite. A survivor of the exact
corrected law, inside the assigned range, in a story correcting that law, is
an incomplete deliverable (the jt2-8 precedent), and the charter outranks the
grading table (the mg1-2 precedent). The severities below are honest MEDIUMs;
the rejection rationale is the charter, not the table.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [DOC] | F1: stopLoop's contract is now false — "Stop the looping music. Safe no-op when nothing is looping there." On the unified 'pm' channel, `stopLoop('space')` with only a TUNE ringing STOPS THE TUNE (empirically proven: worktree probe through the shipped fake-context idiom — descent.stopped === true; mechanism: @shared/audio stopLoop → stopChannel stops the channel's occupant name-blind, src/shared/audio.ts:231-237). Zero production callers today (latent) and zero behavioral test coverage beneath the claim — a lying contract inviting a silent wrong-steal | plugins/star-wars/src/shell/audio.ts:211 (doc at :210) | Rewrite the two sentences to the one-PM-player model: stopLoop stops whatever the PM channel is sounding, loop OR tune, and note it currently has no game callers. Prose only — do NOT change behavior or add tests (new scope) |
| [LOW] [DOC] | F2: "a dedicated `music` channel" — the sibling suite's header still asserts the retired two-channel model as current fact (the suite's assertions themselves are still live and correct) | plugins/star-wars/tests/shell/music-channel.test.ts:6 | Reword to the shared-PM model (one line; e.g. "on the shared PM channel — since sw8-13 the same channel the tunes ride") |

**Non-blocking, routed:** [RULE] finishGround death-gate gap
(sim.ts:995-997 vs ROM PHEGD WSMAIN.MAC:1645-1646/:1673) — pre-existing,
outside the story's named scope, **filed as sw8-21** and recorded in Delivery
Findings.

**Dispatch-tag coverage** (7 of 9 specialists disabled; every disabled domain
assessed by hand, per row Decisions above): [EDGE] boundary controls
mutation-proven (A/B/C); [SILENT] no swallowed errors — stopChannel's catch
is the documented ended-source guard; [TEST] all 14 new/changed tests
non-vacuous, green-on-arrival guards fence correctly; [DOC] F1+F2 confirmed,
sw8-15 descope claim verified true; [TYPE] 0 escapes, typed fake, Record
types unchanged; [SEC] no input/auth/network surface touched; [SIMPLE]
minimal change, no dead code, no stale channel-name consumers; [RULE] 1
confirmed (→ sw8-21), compliance sweep otherwise clean.

**Data flow traced:** cockpit fireball → collides (sim.ts:625) → damage++ →
loseShield (:633) → post-hit `lives` → gate (:662) suppresses all three
milestone pushes on the death frame while pushFarewell still cues the knell →
shell 'tune' arm (main.ts:242) → playTune → startSource steals the 'pm'
channel (src/shared/audio.ts:204) → the knell rings alone, exactly the
cabinet's PKCUT semantics.

**Pattern observed (good):** the channel maps ARE the mechanism —
`MUSIC_CHANNELS`/`TUNE_CHANNELS` both mapping to 'pm'
(plugins/star-wars/src/shell/audio.ts:106-148) lets the shared engine's
per-channel steal carry the whole PKCUT semantics with zero @shared/audio
change; the union pin (pm-channel.test.ts:135) reads the real exports, so the
invariant is compile-adjacent, not prose.

**Error handling:** verified — a steal of an already-ended source cannot
abort the cut-in (try/catch at src/shared/audio.ts:171-176, its stated
purpose); undecoded tracks degrade silently per the documented sw6-2
contract; the fake models onended ordering the way real nodes deliver it.

**Round-trip note for the rework's reviewer:** re-run only F1/F2 prose reads
plus one grep — `grep -rn "dedicated .music.\|no-op when nothing is looping"
plugins/star-wars/` must return nothing — and re-check the fix diff against
checks #13/#15 (a prose fix can introduce a new false claim; that is the
highest-risk edit class per the sw7-16 sidecar).

**Round-1 handoff (executed):** back to Dev for the two-line prose rework —
delivered as f2519a7 and verified above.