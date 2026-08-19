# Story df6-1 Context

> ⚠ **DO NOT REGENERATE THIS FILE.** The Technical Approach, Scope, Dependencies and
> Design Notes are Architect-enriched from the df6 epic plan. `pf context create`
> refills Technical Approach/Scope with placeholder text and would overwrite them.

## Title
Audio seam + the single-shot gameplay emitters: plugins/defender/src/core/events.ts (a discriminated union emitted as DATA on the sim state, Decision C), plugins/defender/src/shell/audio.ts (the SOUNDS manifest + CHANNELS map consuming @shared/audio, each cue CITING its *SOUND TABLE entry defender/DEFA7.SRC:659-691), and plugins/defender/src/shell/audio-dispatch.ts (event->cue switch behind a never exhaustiveness guard, SH4-5 convention). The sim EMITS every single-shot cue at its cited call site: laser (LASSND :686), the *HIT cues (lander LHSND :682, swarm SWHSND :685, probe PRHSND :678, ufo/pod UFHSND :680, tie TIHSND :681, schitz/baiter SCHSND :679), the *SHOOT cues (lander LSHSND :688, schitzo SSHSND :689, ufo USHSND :690, swarm SWSSND :691 per DEFB6.SRC:269), lander grab (LGSND :687) + pick-up (LPKSND :683), appear/materialize (APSND :677), smart-bomb (SBSND :672, call site SBOMB->LDD #SBSND->JSR SNDLD defender/DEFA7.SRC:3183-3184), player death (PDSND :667), free ship/extra-man (RPSND :666), wave start (ST1SND :668/ST2SND :669), astro catch/land/hit/scream (ACSND :673/ALSND :674/AHSND :675/ASCSND :676). NOTE: hyperspace has NO dedicated cue — the HYPER routine (defender/DEFA7.SRC:3211-3280) issues no SNDLD; df6 does NOT invent one. NO samples, NO uploads (this story cannot be blocked by asset production, the jt5-1 split). Maps SNDPRI->channel (Decision E), cited. Consumes @shared/audio + df3 sim.ts + df4/df5 seams.

## Metadata
- **Story ID:** df6-1
- **Type:** story
- **Points:** 5
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Defender sound (df6) — the absent-source audio epic (phase 5): the fleet event-channel seam, every gameplay cue ported from the ROM SOUND TABLE (priority/timer/sound#, cited), synthesised samples proven by a live 200, and the thrust held-loop; the two attract musics deferred to df7

## Problem
The seam and the single-shot emitters together so the seam is never dead (the jt5-1 blind spot: six declared cues were deletable with the suite fully green). Cues are DATA on the returned sim state, never callbacks (Decision C) — purity green, df3 seeded-determinism replays bit-for-bit. Each manifest cue cites its SOUND TABLE symbol+line or is explicitly marked invention-pending (none should be — the table is complete). SNDPRI byte -> CHANNELS voice-stealing (Decision E), not a re-implemented 6809 sequencer. The two STATEFUL cues (thrust held-loop, lander-suck repeat) are df6-2. Attract musics are df7 (Decision A). Audio only — no render/colour change.

## Technical Approach
Build the fleet audio seam and wire the **single-shot** cues in one story, so the seam is
never dead (the jt5-1 blind spot: six declared cues were deletable with the suite green).

- **`plugins/defender/src/core/events.ts` — the cue union, emitted as DATA (Decision C).**
  A discriminated union of gameplay cue moments (`{kind: 'laser'}`, `{kind: 'lander-hit'}`,
  …). The sim returns them as a **field on the state** it already returns from `stepSim`
  (`sim.ts:219,247`), never as a callback — so the core stays pure and df3's seeded-RNG
  replay reproduces bit-for-bit. Model it on jt5-1's `core/events.ts` + the SH4-5 dispatch
  convention.
- **`plugins/defender/src/shell/audio.ts` — the NUMBERS.** A `SOUNDS` manifest (logical
  name → baked filename) and a `CHANNELS` map, consuming `@shared/audio` (the VERB —
  imported, one line, no pin). Each cue **cites its `*SOUND TABLE` symbol+line**
  (`defender/DEFA7.SRC:659-691`): laser `LASSND :686`, lander-hit `LHSND :682`, swarm-hit
  `SWHSND :685`, probe-hit `PRHSND :678`, ufo/pod-hit `UFHSND :680`, tie-hit `TIHSND :681`,
  schitz/baiter-hit `SCHSND :679`, lander-shoot `LSHSND :688`, schitzo-shoot `SSHSND :689`,
  ufo-shoot `USHSND :690`, swarm-shoot `SWSSND :691` (`DEFB6.SRC:269`), grab `LGSND :687`,
  pick-up `LPKSND :683`, appear `APSND :677`, smart-bomb `SBSND :672`, player-death
  `PDSND :667`, free-ship `RPSND :666`, wave-start `ST1SND :668`/`ST2SND :669`, astro
  catch/land/hit/scream `ACSND :673`/`ALSND :674`/`AHSND :675`/`ASCSND :676`.
- **`SNDPRI → CHANNEL` (Decision E).** Read each cue's `SNDPRI` byte from its `FCB` and map
  it onto the `@shared/audio` voice-stealing CHANNELS — higher priority cannot be
  interrupted by lower, equals interrupt (`:662`). Do **not** port the 6809 `SNDSEQ`.
- **`plugins/defender/src/shell/audio-dispatch.ts` — event→cue.** PURE, node-importable
  functions narrowing the engine to a `Pick<AudioEngine, …>` slice, behind a `never`
  exhaustiveness guard (SH4-5, pinned by `tests/audio-dispatch-convention.test.mjs`).
- **Emit at the cited call sites.** The sim emits each single-shot cue where the ROM does:
  laser fire (df3 laser), each enemy hit (df4-1 collision), each enemy shoot (df4 reducers),
  grab/pick-up (df4-3 abduction), appear (df4 materialize), smart-bomb (df5 powers, `SBOMB`
  `defender/DEFA7.SRC:3183-3184`), player death, free ship (df5 extra-man), wave start
  (df5-2 waves), astro catch/land/hit/scream (df5-4 rescue). **Hyperspace emits no cue** —
  `HYPER` (`defender/DEFA7.SRC:3211-3280`) issues no `SNDLD`; do not invent one.
- **No dead seam.** A mutation battery must red on deleting **any** emitter (the jt5-1
  guard). Assert emission, not coverage.
- **Citation gate + no samples.** Every sound constant → a `claims/*.json` entry byte-
  verified under the df1-1 gate. **No `.wav` committed, no upload** — df6 stays silent when
  this story closes (df6-3 bakes the samples).

## Scope
- **In scope:** `events.ts` (the cue union as DATA on the sim state), `shell/audio.ts`
  (`SOUNDS`/`CHANNELS` consuming `@shared/audio`, each cue cited), `shell/audio-dispatch.ts`
  (`never`-guarded event→cue), the `SNDPRI→CHANNEL` mapping (Decision E), the sim emitting
  every **single-shot** cue at its cited call site, `claims/*.json` per constant, purity +
  df3-determinism tests, the deleting-an-emitter mutation guard.
- **Out of scope:** the **stateful** cues — thrust held-loop + lander-suck repeat (df6-2);
  the baked `.wav` samples + upload + live-200 (df6-3); the audible playtest (df6-4); the
  two attract musics + any attract/hall-of-fame cue (df7, Decision A); any render/colour
  change (audio only).

## Acceptance Criteria
- AC1: plugins/defender/src/core/events.ts defines a discriminated union of gameplay cue moments emitted as a DATA field on the sim state the core returns (never a callback); purity.test.ts stays green and a test pins that df3's seeded-RNG determinism replay reproduces bit-for-bit with the event channel live (no new RNG draw, no ordering change) — Decision C.
- AC2: plugins/defender/src/shell/audio.ts holds a SOUNDS manifest + CHANNELS map consuming @shared/audio (imported, not re-implemented); every cue in the manifest CITES its *SOUND TABLE entry (defender/DEFA7.SRC:659-691 — e.g. LASSND :686, LHSND :682, SBSND :672) with a claims/*.json entry verified byte-for-byte under the df1-1 gate, or is explicitly marked invention-pending-source; no un-cited src/core sound constant.
- AC3: plugins/defender/src/shell/audio-dispatch.ts maps every event kind to a cue behind a never exhaustiveness guard (SH4-5 convention, pinned by tests/audio-dispatch-convention.test.mjs), and each SNDPRI byte is mapped to a @shared/audio CHANNEL (Decision E — higher priority cannot be interrupted by lower, equals interrupt per DEFA7.SRC:662), cited; it does NOT re-implement the 6809 SNDSEQ sequencer.
- AC4: the sim EMITS each single-shot cue at its cited ROM call site (laser fire, each enemy hit/shoot, grab/pick-up, appear, smart-bomb SBOMB defender/DEFA7.SRC:3183-3184, player death, free ship, wave start, astro catch/land/hit/scream); hyperspace emits NO cue (HYPER defender/DEFA7.SRC:3211-3280 issues no SNDLD — not invented); a mutation battery confirms deleting ANY emitter reddens a value/emission assertion (not a coverage/presence check — the jt5-1 six-deletable-cues blind spot must not recur); NO .wav is committed and the story states plainly Defender is still silent when it closes.

## Dependencies
- **df1** — the citation gate (df1-1) + `src/core` purity test.
- **df3** — `sim.ts` (the state the cue field rides on) + `scheduler.ts` + seeded RNG (the
  determinism replay this story must not perturb) + the laser fire seam.
- **df4** — `collision.ts` + the enemy reducers (the hit/shoot/grab call sites) + df4-3
  abduction (grab/pick-up).
- **df5** — `powers.ts` (smart-bomb cue only — hyperspace is silent), `score.ts` (free-ship/extra-man),
  `waves.ts` (wave-start), the df5-4 rescue (astro cues).
- **`@shared/audio`** — the engine VERB (consumed, not re-implemented).
- **Blocks:** `df6-2` (adds the stateful cues onto this seam), `df6-3` (bakes the manifest
  this story defines), `df6-4` (the playtest reads this dispatch).

## Design Notes
- **Decisions C & E (RULED):** cues are DATA not callbacks; `SNDPRI` maps to CHANNELS, the
  6809 sequencer is not re-emulated. See the epic plan (`sprint/epic-df6.yaml`).
- **The jt5-1 blind spot is the headline risk:** ship the seam with its emitters and
  mutation-guard every one, or six cues become deletable with a green suite.
- `@shared/audio` is the VERB, the game keeps its NUMBERS (SH2/SH4); line numbers from tool
  output only; RASM radix (`$hex` — the `FCB`s are hex) — the standing df* traps.

---
_Generated by `pf context create story df6-1` from the sprint YAML._
