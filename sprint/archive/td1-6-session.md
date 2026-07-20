---
story_id: "td1-6"
jira_key: "td1-6"
epic: "td1"
workflow: "tdd"
---
# Story td1-6: tempest bake-sfx expandSeq omits the ROM AUDC high-nibble mask on a ramp — player_fire diverges from event 3

## Story Details
- **ID:** td1-6
- **Jira Key:** td1-6
- **Workflow:** tdd
- **Type:** bug
- **Points:** 2
- **Repos:** tempest, .
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-20T19:46:31Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T19:46:31Z | - | - |

## Full Story Description

Surfaced by td1-4 (2026-07-20), NOT created by it — a pre-existing tempest bake-tool defect that only became visible once td1-4 un-crossed the orchestrator's cue->ROM-address map (scripts/audio/games/tempest.mjs). Before that fix, link 5 was comparing player_fire's ROM slice against a DIFFERENT cue's shipped bake, so this divergence was hidden behind the wrong comparison.

### THE DEFECT

tempest/tools/pokey-bake/bake-sfx.mjs's expandSeq() never applies the ROM's AUDC high-nibble (distortion) mask on a ramp — the odd-channel XOR/AND-0xF0/XOR dance MODSND performs in ALSOUN.MAC. The orchestrator's own envelope.mjs DOES apply it (maskHighNibble: true). Consequence: player_fire's LA record ramps AUDC by -8 per step, the ROM masks the high nibble on every step, the shipped bake does not — so the two streams disagree from event 3 onward, not merely at the tail. Observed reason string: ROM=[1,170] shipped=[1,154].

This is DISTINCT from the terminal-zero-write omission affecting segment_tick/enemy_explosion/enemy_fire/spike_shot (those read ROM=[0,0] shipped=null). Two different bake-tool bugs; do not conflate them.

### THE CRITICAL COUPLING

This story spans TWO repos with a hard coupling and required sequence:

**THE DEFECT is in the TEMPEST subrepo:** tempest/tools/pokey-bake/bake-sfx.mjs's expandSeq() never applies the ROM's AUDC high-nibble (distortion) mask on a ramp.

**THE ORCHESTRATOR has a CANARY TEST:** The orchestrator's own scripts/audio/render/envelope.mjs DOES apply it (maskHighNibble:true, line 96: `val = maskHighNibble ? ((next & 0x0f) | (val & 0xf0)) : next`). The canary coupling is in tests/extract-audio.test.mjs:253-256, which currently asserts player_fire = VERDICT.MISMATCH with reason /register-event stream differs/ and /ROM=\[1,\d+\] shipped=\[1,\d+\]/. This test is GREEN today because tempest is buggy. The orchestrator's link-5 comparison (scripts/audio/compare/shipped.mjs:86-87) imports tempest's WORKING TREE directly (../../../tempest/tools/pokey-bake/bake-sfx.mjs). So the MOMENT tempest's expandSeq is fixed in this checkout, player_fire becomes ROM_VERIFIED and that orchestrator assertion GOES RED. This story REQUIRES flipping :253-256 from MISMATCH to ROM_VERIFIED.

Fixing the bake tool without updating it will redden the orchestrator suite, which is the intended coupling.

### THE REQUIRED SEQUENCE (governs finish)

1. **TEA RED:** a failing test IN TEMPEST (tempest has tools/pokey-bake/bake-sfx.test.mjs — see it) proving expandSeq applies the AUDC high-nibble mask on a ramp. RED against current buggy tempest. (The orchestrator canary is NOT the red test — it's green now and must be flipped at the end.)

2. **Dev GREEN:** fix expandSeq in tempest so distortion (high nibble) holds while volume (low nibble) ramps — port the same mask envelope.mjs uses. tempest's own suite green.

3. **Merge the TEMPEST PR to develop;** checkout tempest develop so the fix is permanent in the tree the orchestrator reads.

4. **ONLY THEN flip the orchestrator canary** (tests/extract-audio.test.mjs:253-256) MISMATCH -> ROM_VERIFIED and commit to orchestrator main (trunk-based, no PR). Run the orchestrator suite: it now reads fixed tempest develop -> player_fire ROM_VERIFIED -> canary green. **Flipping BEFORE tempest is merged reds the orchestrator; the order is not optional.**

## Branches

**tempest:** chore/td1-6-bake-audc-highnibble-mask (gitflow: branch from develop, PR to develop)
**orchestrator:** none (trunk-based — commits straight to main, no branch)

## Acceptance Criteria

- A failing test in tempest proves expandSeq applies the AUDC high-nibble mask (maskHighNibble logic) on a ramp; currently fails against the buggy version.
- expandSeq is fixed so that distortion (high nibble) holds while volume (low nibble) ramps — matches the ROM's MODSND behavior and envelope.mjs implementation.
- tempest's full suite passes post-fix.
- The tempest PR is merged to develop.
- The orchestrator's canary assertion (tests/extract-audio.test.mjs:253-256) is flipped from MISMATCH to ROM_VERIFIED.
- The orchestrator suite passes with the canary now ROM_VERIFIED.

## TEA Assessment

**Tests Required:** Yes
**Reason:** Bug fix with a pinnable, documented contract (ROM AUDC high-nibble mask on a ramp).

**Test Files:**
- `tempest/tools/pokey-bake/bake-sfx.test.mjs` - new describe block "expandSeq AUDC high-nibble (distortion) mask on a ramp (story td1-6)" (3 tests appended, +79 lines, test-only)

**Where the contract is reachable:** `expandSeq` is NOT exported — pinned through the public `expandAlsoun({audf,audc})` export (which calls `expandSeq(1, audc)` for the AUDC voice and `expandSeq(0, audf)` for AUDF). Per-register events read back out of the merged `pokey1` feed via the file's existing module-level `feedEvents(pokey1, reg)` helper. No new export added. Harness: vitest (`describe/it/expect`), matching `bake-sfx.test.mjs` idiom.

**Tests Written:** 3 tests covering AC#1 (the RED contract) + the even-register guard:
1. RED — real `player_fire` record: AUDC (odd) event 1 must be `0xAA` (distortion held 0xA0, volume ramped), not `0x9A` (whole-byte ramp). Pins the exact canary reason `ROM=[1,170] shipped=[1,154]`. Also: every AUDC value's high nibble held at 0xA0; low nibble genuinely varies (non-vacuous).
2. RED — synthetic `{audc:[0xA8,1,4,6,0,0]}`: the +4 ramp carries `0xAC->0xB0`; masked stream must stay `[0xA8,0xAC,0xA0,0xA4,0xA8,0xAC]`, buggy gives `[...,0xB0,0xB4,...]`. Divergence at step 2.
3. GUARD (green now, must stay green after fix) — `player_fire` AUDF (even): pitch must keep ramping the WHOLE byte (`audf[3]==0x25`, high nibble changes). Fails only if the GREEN fix wrongly masks reg 0 too.

**Status:** RED (2 failing as designed; 1 guard passing — ready for Dev)

**Counts:** tempest full suite `2 failed | 1740 passed (1742)` — baseline was 1739 passed, so +1 (the guard) passes, +2 are the intended RED; no pre-existing test broke. Orchestrator suite unchanged at **288 passed, 0 fail** (canary untouched, still MISMATCH/green — correct, tempest working tree still buggy).

**Anti-vacuity (out-of-band probe, current repo module vs a masked reimpl):**
- `player_fire` AUDC — buggy `0xa2 0x9a 0x92 0x8a ...` vs masked `0xa2 0xaa 0xa2 0xaa ...`; first divergence @ event 1: buggy `0x9a` (154) / masked `0xaa` (170).
- AUDF (reg 0) is byte-identical buggy-vs-masked (mask never touches the even register) — confirms the guard.

**Handoff:** To Dev for implementation (GREEN). Commit `1e3109a` on `chore/td1-6-bake-audc-highnibble-mask` (not pushed, no PR).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `tempest/tools/pokey-bake/bake-sfx.mjs` - `expandSeq` now masks the AUDC (odd
  register) high nibble on a ramp: `const next = (val + delta) & 0xff; val =
  (reg & 1) ? ((next & 0x0f) | (val & 0xf0)) : next;` — 6 lines added, 1 removed.
  No test file touched.

**Tests:** 1742/1742 passing (GREEN) — was 1740 passed/2 failed pre-fix; the 2
RED tests now pass and the even-register guard stays green. Test file
`bake-sfx.test.mjs` is byte-for-byte unchanged (`git diff` shows only
`bake-sfx.mjs` modified).

**Build:** `npm run build` (tsc --noEmit && vite build) — clean.

**Citations gate:** `npm test -- citations` — 25/25 passing, unaffected (change
is in `tools/`, not `src/core`).

**Blast-radius verification (empirical, per TEA's finding):** compared every
`spec.alsoun` cue's baked AUDC bytes pre-fix vs post-fix. Only `player_fire`
changed (`0xa2 0x9a 0x92 0x8a ...` -> `0xa2 0xaa 0xa2 0xaa ...`, matching the
canary reason `ROM=[1,170] shipped=[1,154]`). `enemy_fire`, `enemy_explosion`,
`thrust_space`, `warp`, `countdown_beep`, `segment_tick`, `spike_shot` are all
byte-identical pre/post fix — confirms TEA's prediction that the fix moves
exactly one cue's bytes. (Stream-path cues — `player_explosion`, `extra_life`,
`pulsar_hum` — go through `streamVoice`, which already applied the mask and
was not touched by this change.)

**Branch:** `chore/td1-6-bake-audc-highnibble-mask` (NOT pushed, no commit made
— per instructions, Dev does not commit/push/PR on this story; SM owns the
commit and cross-repo sequence). Working tree has one unstaged modification:
`tools/pokey-bake/bake-sfx.mjs`.

**Did not touch:** the orchestrator repo, the orchestrator canary
(`tests/extract-audio.test.mjs:253-256`), or any test file. No test appeared
wrong — TEA's contract was exact and the fix satisfied it on the first attempt.

**Handoff:** To next phase (SM: commit, PR, merge tempest, then flip the
orchestrator canary per the required sequence).

## TEA Canary Re-aim (orchestrator, post-merge)

After tempest's mask fix merged to develop (#150 / 211b158), the orchestrator's
link-5 canary (`tests/extract-audio.test.mjs`) went 287/1: player_fire's mask
divergence is fixed, revealing its SECOND defect — the terminal-zero tail
truncation (`event 64: ROM=[0,0] shipped=null`), filed separately as **td1-11**.
Re-aimed the canary honestly (edited ONLY `tests/extract-audio.test.mjs`, no
commit — coordinator owns the finish):

- **Moved player_fire into the terminal-zero (a) group** (`:256`): it now asserts
  MISMATCH + /register-event stream differs/ + /shipped=null/, same as the other
  four. Group (a) now covers FIVE cues, owned by td1-11.
- **Replaced the old (b) value-disagreement block** with a mask-fix guard
  (`:276-285`): player_fire's reason must NOT match /ROM=\[1,\d+\] shipped=\[1,\d+\]/
  and MUST match /shipped=null/. This reds if td1-6 is reverted.
- **Rewrote the comment block** to record "mask: FIXED by td1-6" vs "terminal-zero:
  OPEN, td1-11" and updated the test title.
- **Left unchanged (verified):** UNVERIFIED group, ROM_VERIFIED group (6 cues),
  `sfx.length === 13`. player_fire stayed MISMATCH (moved group, not verdict).

**Mutation-check (non-vacuity):** throwaway-reverted tempest's mask (`bake-sfx.mjs`
line 90 → `val = next`), re-ran the test → player_fire assertion went RED with
`event 3: ROM=[1,170] shipped=[1,154]`; then `git checkout` restored tempest to
pristine. Orchestrator back to **288 pass / 0 fail** with the fixed tree.

## Delivery Findings

No upstream findings.

### TEA (test design)
- **Improvement** (non-blocking): the mask fix's blast radius is exactly ONE cue. An out-of-band scan of all 8 `spec.alsoun` cues shows only `player_fire` (AUDC value 0xA2, delta -8) changes under the mask. Every other alsoun cue is inert: `enemy_fire` (AUDC high nibble already 0), `enemy_explosion`/`thrust_space`/`warp`/`countdown_beep` (delta 0, no ramp), `segment_tick` (count=1, no ramp step), `spike_shot` (count=5, 0xa1..0xa5 never crosses a nibble boundary). Streaming cues (`player_explosion`/`extra_life`/`pulsar_hum`) go through `streamVoice`, which is already masked. So Dev's fix to `expandSeq` should move ONLY `player_fire`'s baked bytes — no other orchestrator canary row should shift. *Found by TEA during test design (verify empirically after the fix; if any other cue's bake moves, a data cue crossed a nibble boundary and its canary row needs review too).*

## Design Deviations

No design deviations.
