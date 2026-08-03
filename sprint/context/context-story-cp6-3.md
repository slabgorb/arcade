# Story Context: cp6-3

**Title:** POKEY voice 0 is contended and our CHANNELS map does not model it — the player explosion must silence the kill cues
**Epic:** cp6 — Centipede sound: the samples cp5 never filed a story to bake
**Points:** 5 (re-pointed from 3 at setup — see Sizing below)
**Workflow:** tdd
**Type:** bug

> ⚠ **DO NOT REGENERATE THIS FILE.** It is hand-authored from measurements taken at
> setup on 2026-08-03. `pf context create` renders the epic `description` verbatim
> into `## Problem` and fills Technical Approach with placeholder text; both would
> destroy the corrections below. The acceptance criteria at the end are injected from
> `sprint/epic-cp6.yaml` programmatically (`yaml.safe_load` → this file), so they are
> byte-identical to the YAML by construction and have NOT been edited.

## Problem

On the cabinet, POKEY voice 0 is contended between the player explosion and the four
creature-kill cues, and the player explosion **wins outright**. Our clone rings both.

The mechanism is control flow, not adjacency. Label `52$` (`CENTI4.MAC:2418`) — the
CHAN0 kill-cue path that writes `AUDF0`/`AUDC0` — has **exactly one** reference in the
whole `SOUNDS` routine: the `BEQ 52$` at `CENTI4.MAC:2437`, which is taken only when
`CHAN5` is zero. `:2416`'s `BNE 50$ ;ALWAYS` prevents any fall-through into it. So
while the player is exploding the kill path is *unreachable*, and `CHAN0` is neither
decremented nor sounded. (Verified at setup by counting label references, not by
reading the cited span — the sw8-19 method.)

Separately, the ROM zeroes `CHAN0/1/2/3/6` on the death frame itself
(`CENTI4.MAC:1813-1818`) so the explosion plays alone.

## ⚠ CORRECTIONS TO THE FILING (SM, 2026-08-03)

The story's description is preserved in `sprint/epic-cp6.yaml` and its ROM claims are
all true and line-exact. **Four claims about this repo are false**, two of them
load-bearing. The full correction block is appended to the description; the
consequences for the build are:

| # | The filing says | Measured |
|---|---|---|
| C-1 | "your input is already written — the `voiceArbitration` record, and `sound.md` §2.5" | Both are POKEY **voice 1** (bonusLife/scorpionLoop/fleaLoop/march). The fixture scores **zero** for `2437`, `AUDF0`, `AUDC0`, `52$`, "voice 0". The voice-0 rule is **recorded nowhere** — writing it is AC-7, not an input. |
| C-2 | "expect to touch CHANNELS"; "retire the cp6-1 dossier guard" | The engine's `priorities` arbitration is **cross-channel** (`src/shared/audio.ts:253-255`). Probe-proven with CHANNELS exactly as shipped: the kill is refused. **CHANNELS does not change and the guard stays green** (AC-2). |
| C-3 | open question: "preemption, or merely never together?" | **Answered by the machine.** Merging channels steals FORWARD — probe-proven, a later kill *stops* a ringing death, the opposite of the cabinet. Only the priorities path gives refusal-of-the-later-cue. No ruling needed. |
| C-4 | "the march, spider, flea and scorpion loops keep running under a death" | **False in both halves.** `march-stop` fires ON the death frame and is a recorded pair at `tests/audio-wiring.test.ts:94`. The creatures stop too, at the pause's end — pinned green by `tests/audio-events.test.ts:553`. The real defect is **timing**: ≤ `DEATH_DELAY` = 0x30 = **48 frames** late. |

**What you can trust from the fixture:** per-cue `pokeyVoice` (0 for `playerDeath` and
all four kills; `null` for the three inventions), `lengthFrames`, `frameGate`. Those are
byte-verified by the citation gate. The *arbitration rule* is not there.

## Technical Approach

Measured pointers, not design. The design is TEA's and Dev's.

**The seam.** `plugins/centipede/src/shell/audio.ts:122-128` builds the shared engine
from `SOUNDS` + `CHANNELS`. The shared engine already implements exactly this machine's
behaviour under `priorities`/`frameDurations` (`src/shared/audio.ts:70-87, 228-232,
251-255, 310-315`), added for joust by jt5-5. Refusal happens *before* any node is
built (`:232`), and an accepted arbitrated sound stops what is ringing on a **different**
channel (`:253-255`) — which is why the CHANNELS map need not move.

**The precedent is exactly one game.** joust is the only cabinet that declares
`priorities` or calls `tick()`. Copy its shape:

- `plugins/joust/src/shell/audio.ts:151-167` — `PRIORITIES` / `FRAME_DURATIONS` wiring.
- `plugins/joust/src/shell/audio-dispatch.ts:98-110` — `audio.tick()` first and
  unconditionally, with the comment explaining why that order is the machine's.
- `plugins/joust/tests/audio-dispatch.test.ts:60-72` — the recording fake carrying a
  `tick` member and a no-op implementation, plus the note that a per-frame tick is not
  a per-event effect. **This is what fixes the 14 failures below.**

**centipede's frame path.** `playEventSounds` is called once per *stepped* frame from
`plugins/centipede/src/main.ts:203` (a fixed-step accumulator, not per-rAF — the file
says so at `:6`). `SoundSurface` at `audio-dispatch.ts:20` is a `Pick<>` and must widen
to include `tick`. `npm run lint` was clean with that widening applied.

**The numbers, from the fixture (AC-3).** `playerDeath`: `lengthFrames` 19 ×
`frameGate` 4 = **76** frames. Each kill cue: 19 × 1 = **19**. Seeds at
`CENTI4.MAC:1811` (`LDA I,13` hex) and `:2299-2300`; the 4-frame gate at `:2438-2439`.

**The death-instant clear (AC-6).** `marchAudible` already carries `s.delay === 0`;
`spiderAudible` / `fleaAudible` / `scorpionAudible` do not. Note the discriminator: the
wave-clear pause also sets `delay`, and the ROM does **not** clear channels there
(`:2319` sets DELAY with no channel write), so a bare `delay === 0` over-applies.
`playerExplode` is the death-specific term — sim.ts's own comment distinguishes the
wave pause "by playerExplode staying 0 through the pause".

## Measured blast radii

Baseline at setup: **1668 passed / 1668, 89 files** (`--project centipede --project shared`),
tree clean, nothing attributable to a sibling.

| Change | Red | Where | Character |
|---|---|---|---|
| `priorities` + `frameDurations` + `tick()`, CHANNELS untouched | **14** | one file: `tests/audio-dispatch.test.ts` | mechanical — the fake at `:91-93` has no `tick`. lint clean. |
| death-instant clear for the three creature loops | **2** | `audio-events.test.ts`, `audio-wiring.test.ts` | behavioural re-baselines, both *expected* to move |
| merging CHANNELS (**the rejected approach**) | 1 | the cp6-1 AC-5 guard | its tiny radius is exactly why it is dangerous — nothing can hear it go the wrong way |

The correct fix is **invisible** to the baseline except for mechanical fixture rework.
That is why AC-8 makes the mutation proof mandatory rather than advisory: the tests
written here are the entire observable footprint.

## Two unrecorded ROM facts found at setup

1. **The gate is control flow.** One reference to `52$` in the routine (above). This
   is a transcription, not the "implicit / sits inside" inference the filing offers.
2. **`35$:` at `:1813` is a branch target** — `BMI 35$ ;IF IN ATTRACT` at `:1810`. In
   attract the `CHAN5` seed is skipped and only the clear runs, so the attract demo
   dies **silently**. Unverified against our attract path. **TEA should check this,
   not assume it** — it may or may not have a referent in our clone.

## An open question SM could NOT settle — verify before leaning on it

Our death pause is **48** frames, and **no one-shot can be emitted during it**: only
`stepPlayingFrame` builds events, and the pause runs `stepDeathFrame` (`sim.ts:962-982`
explains the array-identity discriminator). The ROM's `CHAN5` window is **76** frames.
So ~48 of the 76 may already be faithful *by accident of the pause*, leaving roughly a
**28-frame tail** as the only stretch where the divergence is audible.

**SM did not confirm a kill cue is reachable in that tail** — it needs a respawn, a shot
in flight and a contact, all inside 28 frames. This matters because if it is *not*
reachable, an AC of the form "no kill cue sounds during a death" passes **vacuously
forever**. Settle it before writing the RED, and carry a **positive control** proving
the sweep can observe a kill cue at all (the jt9-1 rule: hand forward the control with
the zero).

## Scope

**In scope:** voice-0 arbitration (AC-1..AC-5), the death-instant clear for the three
creature loops (AC-6), the dossier's voice-0 record (AC-7), mutation proofs (AC-8).

**Out of scope:** re-baking or re-uploading any `.wav` — the fourteen samples are
correct and live as of cp6-2, and nothing here touches `tools/pokey-bake/` or
`just deploy-assets`. The voice-**1** contention (`voiceArbitration` in the fixture) is
a *recorded, accepted* divergence from cp6-1 and is **not** this story's to fix; do not
disturb that record while adding voice 0's.

## 🔨 USER RULINGS (2026-08-03) — binding

- **R-1.** The death-instant clear is **folded into cp6-3**, not filed separately.
  (SM recommended filing separately and was overruled; SM's stated cost for folding in
  — "~2 more points, widens into core/sim.ts's loop-edge model, the part with the most
  existing coverage" — was an **unmeasured estimate and was wrong**. Measured
  afterwards: **2 tests**, both of which should move. Recorded so the error does not
  become the scope premise.)
- **R-2.** Arbitration keys on the fixture's `pokeyVoice` field. The three inventions
  (`mushroom`, `headBottom`, `waveClear` — all `pokeyVoice: null`) stay **outside**
  arbitration and ring through a death. Nothing is invented for a cue the cabinet
  never sounds.

## Sizing

Filed at 3 points against a shell-only channel edit that does not work. Re-pointed to
**5**: arbitration wiring + a new `tick()` call site centipede has never had + 14 fake
fixups + 2 behavioural re-baselines + the dossier record.

## Acceptance Criteria

1. AC-1 VOICE 0 IS ARBITRATED, NOT MERGED. While the player explosion is ringing, all four ROM kill cues (segmentKill, spiderKill, fleaKill, scorpionKill) are REFUSED — they must not reach the engine's start path at all. A player explosion arriving while a kill cue rings INTERRUPTS it. This is the cabinet's direction and it is the OPPOSITE of plain channel-sharing: CENTI4.MAC:2437's `BEQ 52$` is the only reference to label `52$` (:2418) in the SOUNDS routine, so the kill path is unreachable while CHAN5 is non-zero. Implemented with the shared engine's `priorities`/`frameDurations` (jt5-5), which arbitrate ACROSS channels (src/shared/audio.ts:253-255).

2. AC-2 CHANNELS IS NOT EDITED, AND cp6-1's AC-5 GUARD STAYS GREEN. `tests/audit/sound-dossier.test.ts:431-478` must still pass unmodified at the end of this story. The filing's instruction to expect a CHANNELS edit and to retire that guard was written against a candidate fix that does not reproduce the cabinet; do not delete a guard on this story's authority. If the implementation appears to require a CHANNELS change, that is a signal the arbitration is being modelled the wrong way — stop and say so rather than editing the map.

3. AC-3 THE WINDOW COMES FROM THE FIXTURE, NOT FROM TASTE. The player explosion holds voice 0 for lengthFrames 19 x frameGate 4 = 76 video frames (CENTI4.MAC:1811 seeds 0x13; :2438-2439 gates on `AND I,3`); each kill cue holds 19 frames at frameGate 1. Both numbers are read from `docs/rom-study/sound.fixture.json` rather than written a second time as literals, so a dossier correction cannot silently disagree with the engine.

4. AC-4 tick() IS DRIVEN ONCE PER STEPPED FRAME, FIRST AND UNCONDITIONALLY. centipede has never called `engine.tick()` and declares no priorities today; joust is the only game that does. Without the tick the arbitration window never expires and the FIRST player death refuses every kill cue for the rest of the run. Follow joust's shape and its reasoning: `plugins/joust/src/shell/audio-dispatch.ts:98-110` ticks at the top of `playEventSounds`, before any cue, on every frame including silent ones. centipede's `playEventSounds` is already called once per stepped frame from `main.ts:203`.

5. AC-5 ONLY `pokeyVoice: 0` CUES ARE ARBITRATED — USER RULING, 2026-08-03. The arbitration set is derived from the fixture's `pokeyVoice` field, not hand-listed. The three INVENTIONS — mushroom, headBottom, waveClear, each `pokeyVoice: null` and each riding a bucket shared with an arbitrated cue — stay OUTSIDE arbitration and ring through a player death. The cabinet never sounds them, so arbitrating them would invent behaviour rather than transcribe it. A test must show an invention sounding during a death window in which a kill cue is refused, or the ruling is unproven.

6. AC-6 THE DEATH-INSTANT CHANNEL CLEAR IS MODELLED — USER RULING, 2026-08-03 (folded in). The ROM zeroes CHAN0/1/2/3/6 on the death frame itself (CENTI4.MAC:1813-1818), so the spider, flea and scorpion loops must stop ON the death frame rather than at the death pause's end — today they ring up to DEATH_DELAY = 0x30 = 48 frames (0.8s) longer than the cabinet. The march is ALREADY correct (`marchAudible` carries `s.delay === 0`; `player-died+march-stop` is a recorded pair at tests/audio-wiring.test.ts:94) and must not regress. Expect the seeded pair-composition fingerprint to MOVE: re-measure it from a run, never hand-edit the expected list.

7. AC-7 THE DOSSIER GAINS THE VOICE-0 RULE IT DOES NOT CARRY. The fixture's existing `voiceArbitration` record is POKEY voice 1 and sound.md section 2.5 is the voice-1 prose; a term scan of the fixture scores zero for 2437, AUDF0, AUDC0 and `52$`. Record voice 0's contention where cp6-1 recorded voice 1's — the contenders, the control-flow mechanism (the single reference to `52$`), the 76-vs-19-frame windows, and how our clone now models it — with citations that pass the existing citation gate. Do not disturb the voice-1 record.

8. AC-8 EVERY NEW GUARD IS MUTATION-PROVEN, WITH THE MUTANT RECORDED VERBATIM. The baseline is 1668/1668 across 89 files, and the correct fix is invisible to all of it except mechanical fixture rework — so the tests written here ARE the entire observable footprint. For each new assertion, name the exact source mutation that reddens it and paste the mutated string, so the next reader re-runs the string rather than reconstructing the intent. A 'no kill cue sounds during a death' sweep additionally needs a POSITIVE CONTROL proving the sweep can observe a kill cue at all — see the open question about the ~28-frame audible tail.
