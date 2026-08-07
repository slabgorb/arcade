# Missile Command — W3SOUN audio decode & driver-path decision (mc8-1 spike)

**Story:** mc8-1 (architecture spike, 3pt, p1) · **Epic:** mc8 — Missile Command authentic audio
**Date:** 2026-08-07 · **Status:** decided — this doc is the plan for mc8-2 / mc8-3
**No `src/` production code is changed by this story.** See the mc8 roadmap:
[`2026-08-07-missile-command-full-cabinet-roadmap.md`](./2026-08-07-missile-command-full-cabinet-roadmap.md).

---

## BLUF — the decision

**Drive the sound at RUNTIME from the lifted W3SOUN tables. Do NOT bake to assets.**

Recommended runtime target: **the vendored `pokey.js` as a live `AudioWorkletProcessor`**,
fed by a small deterministic port of W3SOUN's `MODSND` envelope stepper. Fallback if the
live-worklet integration proves too costly for mc8-2: **`@shared/synth`** oscillator/noise
voices (the battlezone pattern) driven by the same lifted envelopes — still runtime, still
asset-free.

Baked-asset (the tempest/star-wars `pokey-bake` → WAV → `@shared/audio` pattern) is
**explicitly not recommended** for this game. Three of Missile Command's sounds are
*parametric and continuous* (the cruise-missile and Sputnik descending drones, and the
bonus count-up tick) and do not reduce to fixed WAVs without losing their defining
behaviour; and baking incurs the R2-upload + contract-5 live-verify + asset/code-drift
burden that runtime synthesis sidesteps entirely. The if-baked contingency (R2 layout +
live-verify plan) is documented in §9 as the AC requires, but it is the rejected branch.

---

## 1. Conventions for every citation below

- **Quarry:** `plugins/missile-command/reference/source/` (gitignored; vendored — copy it
  into any checkout that lacks it). The sound module **W3SOUN is the file `A35820.1C.bin`**
  — ASCII assembler source despite the `.bin` extension (CRLF-lined, trailing-null padded),
  decode pinned in [`docs/rom-study/brief.md` §O-1](../../../plugins/missile-command/docs/rom-study/brief.md).
- **Line numbers** are as produced by `tr -d '\r' < FILE` (CRLF→LF, one assembler line per
  text line, blank lines counted). This matches the repo's existing convention — e.g.
  `W3INT.MAC:281` is `INC SYNC`, the VBLANK frame counter, exactly as brief.md cites it.
  Reproduce a citation with: `tr -d '\r\000' < <file> | sed -n '<N>p'`.
- **Radix.** W3SOUN opens `.RADIX 16` (**W3SOUN:2**) — **every numeric literal in W3SOUN
  and in every table below is HEXADECIMAL.** `10` means 0x10 = 16; `FE` means 0xFE = 254
  (used as a two's-complement −2 delta). The `I,` prefix in operands is the assembler's
  immediate-mode marker (`LDA I,SEXPLO` = `LDA #SEXPLO`), not a digit.

---

## 2. W3SOUN architecture (the engine we are reproducing)

W3SOUN is a **POKEY** sound driver: two entry points plus init (W3SOUN:13-19, 30-31).

- **`SNDON` / `EXSNON`** (W3SOUN:221-260) — *start a sound.* Takes a one-hot **sound-ID
  flag** in A, applies priority, and arms the per-register sequence pointers.
- **`MODSND`** (W3SOUN:273-353) — *continue the sound; called once per frame.* Steps every
  active register's envelope one frame and writes POKEY. "Must be called once every 16 msec
  (or 1 frame)" (W3SOUN:17-18). It is invoked from the VBLANK IRQ path at **`W3INT:451`**
  (`JSR MODSND ;PROCESS SOUNDS`). The board's frame rate is **VSYNC ≈ 61.0076 Hz** (nominal
  60; see `docs/rom-study/timebase.md`). **This 61 Hz frame is the engine's only clock** —
  every duration below is counted in these frames.
- **`INISOU`** (W3SOUN:389-403) — *init / all-off.* Writes SKCTL (`AUDF1+0F` = $400F) 0 then
  3, zeroes all 8 audio registers and pointers, and sets `AUDCTL = AUDCV = 0x20` (W3SOUN:128,
  401-402). Called on reset (`W3MAIN:485`) and at every wave/game boundary
  (`W3MAIN:3909, 4757, 4923`).

### 2.1 POKEY register model

`AUDF1 = 0x4000`, `AUDCTL = 0x4008` (**W3SOUN:70-71**). The engine treats POKEY as **8
one-byte registers** at `AUDF1+0 … AUDF1+7` — the four voices' interleaved
frequency/control pairs (`AUDF1,AUDC1,AUDF2,AUDC2,AUDF3,AUDC3,AUDF4,AUDC4`). `MODSND`'s
loop runs `LDX I,7` down to 0 (W3SOUN:275) and writes `CURRENT` to `X,AUDF1` (W3SOUN:326).
So a "channel" in the sound tables = **one POKEY register**; each sound supplies up to 8
sequence-lists, the odd-indexed ones driving AUDF (pitch), the even ones AUDC
(distortion+volume). `AUDF1+0A` (= $400A) is POKEY's **RANDOM** register (W3SOUN:317).

### 2.2 Sequence data format (identical shape to `pokey-bake`)

Each register's data is a series of **4-byte sequences** (W3SOUN:65-69, 143-148):

| Byte | Name | Meaning |
|------|------|---------|
| 0 | `STVAL` | starting value written to the register |
| 1 | `FRCNT` | frames to hold before each change |
| 2 | `CHANGE` | signed delta applied per change (hex two's-complement; `FE`=−2) |
| 3 | `NUMBER` | total number of changes in this sequence |

A **2-byte `X,0` sequence** ends the list, leaving `X` as the channel's new idle value
(W3SOUN:149-150). **All sound ends when channel 1 goes idle**, so channel 1 is the longest
(W3SOUN:151-152). This is structurally the same envelope model the fleet's `pokey-bake`
already walks — its record is `[count, duration, value, delta]`
(`plugins/star-wars/tools/pokey-bake/README.md`, `sfx-data.mjs`) — which is why the lift is
low-risk whichever runtime we pick.

### 2.3 Hardware randomness (a bake cannot reproduce it dynamically)

`MODSND` reads the POKEY RANDOM register and folds it into the frequency step **when the
current sound's ID has bit 6 set and the register index ≠ 1** (W3SOUN:313-324):

```
313  BIT SOUNDN        ; V ← bit6 of the active sound-ID
314  IFVS              ; bit6 (=0x40 = SBONUS) set?
315  CPX I,1
316  IFNE              ; …and not register 1
317  LDA AUDF1+0A      ; GET A RANDOM NUMBER FROM POKEY  ($400A)
318  AND I,1E          ; mask to 0..0x1E
319  IFEQ / 320 LDA I,1E   ; floor at 0x1E if zero
```

bit6 = `SBONUS` = 0x40 (W3SOUN:79), so **the bonus-city fanfare is frequency-jittered per
frame from hardware RNG.** It is one celebratory cue, not the explosion — a minor fidelity
point on its own — but it means the driver must *read a live POKEY register mid-effect*,
which a pre-baked WAV freezes to a single instance. `pokey.js` implements the poly counters
that back this register (`Poly4/5/9/17`, `pokey.js:50-53, 325-360`); a live worklet
reproduces it exactly, a bake does not.

### 2.4 Non-table sounds (parametric — the crux of the decision)

Two sound sources bypass the sequence tables entirely and are **live-parametric**:

- **SLAM / tilt** — `SLMSND` (W3SOUN:262-266) writes `AUDF1 = 0x18`, `AUDF1+1 = 0xAF`
  directly when `SLAMSN` ≠ 0 (flag set at `W3MAIN:829`). A fixed blip; bakeable, but trivial
  to synth.
- **Cruise-missile & Sputnik descending drones** — `PMRBIL` tail of `MODSND`
  (W3SOUN:329-352). `CMSNON` sets `MRBILL` bit7 (`ORA I,80`, W3SOUN:360) for the cruise
  missile (smart bomb); `STSNON` sets bit6 (`ORA I,40`, W3SOUN:364) for the Sputnik. Each
  frame the tail collapses those two bits to an index — **1=Sputnik, 2=Cruise, 3=both**
  (comment W3SOUN:337) — and **sweeps `AUDF1+6` (voice-4 frequency) between per-type TOP and
  BOTTOM values** (`BOTTOM: .BYTE 30,0,0` / `TOP: .BYTE 70,30,30`, W3SOUN:354-355),
  decrementing by 2 each frame and wrapping. The drone's pitch therefore **descends
  continuously and its lifetime is gated by how many cruise/Sputnik threats are on screen**
  (`CRMONS`, incremented at `W3MAIN:2647`, `INC CRMONS`). This is a variable-duration,
  per-frame-repitched sound — **it has no fixed WAV form.**

---

## 3. Sound tables — transcribed (hex; W3SOUN line cites)

The 8 table-driven sounds. Each row is one 4-byte sequence `STVAL,FRCNT,CHANGE,NUMBER`;
`0,0` terminates a channel/list. Values verbatim from W3SOUN.

### EXPLOSION — label `EX` (W3SOUN:155-164)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| EX1 | A0 | 10 | 04 | 10 | 157 |
| EX2 | 86 | 40 | FE | 04 | 159 |
| EX3 | C0 | 10 | 04 | 10 | 161 |
| EX4 | 86 | 40 | FE | 04 | 163 |

### LAUNCH — label `LA` (W3SOUN:165-176)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| LA5 | 60 | 10 | 00 | 01 | 166 |
| LA5 | 50 | 10 | F8 | 01 | 167 |
| LA5 | 48 | 10 | 18 | 01 | 168 |
| LA5 | 60 | 18 | F0 | 01 | 169 |
| LA5 | 60 | 10 | F8 | 01 | 170 |
| LA5 | 60 | 10 | 08 | 10 | 171 |
| LA6 | 82 | 20 | 02 | 01 | 173 |
| LA6 | 84 | 10 | 00 | 04 | 174 |
| LA6 | 84 | 38 | FF | 04 | 175 |

### BONUS TICK — label `TK` (W3SOUN:177-181)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| TK1 | 10 | 04 | 00 | 01 | 178 |
| TK2 | 2F | 04 | 0F | 01 | 180 |

### BONUS CITY — label `BN` (W3SOUN:182-187)
> ⚠ The source annotates this block **`;BONUS CITY (DUMMIES)`** (W3SOUN:182) — Rich Adam
> marked BN1/BN2 as placeholder data, yet `SBONUS→BN` is wired and fires (W3MAIN:4845). Treat
> the values as authentic-as-shipped, but expect this cue to sound unpolished; do not "improve"
> it. See §10.
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| BN1 | 18 | 18 | 00 | 18 | 183 |
| BN2 | A4 | 18 | 00 | 18 | 185 |
| BN2 | A0 | 10 | 00 | 02 | 186 |

### WHOOP (new wave) — label `WP` (W3SOUN:188-197)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| WP1 | 10 | 02 | 01 | 20 | 189-194 (×6 identical) |
| WP2 | A4 | 02 | 00 | C0 | 196 |

### LOW ON ABMS — label `LO` (W3SOUN:198-204)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| LO7 | 20 | 80 | 00 | 03 | 199 |
| LO8 | A3 | 40 | FD | 02 | 201-203 (×3 identical) |

### "THE END" EXPLOSION (end game) — label `XX` (W3SOUN:205-213)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| XX1 | 40 | FF | 02 | 08 | 206 |
| XX2 | 88 | FF | FF | 08 | 208 |
| XX3 | C0 | FF | 02 | 08 | 210 |
| XX4 | 88 | FF | FF | 08 | 212 |

### CAN'T FIRE (out of ammo) — label `NS` (W3SOUN:214-219)
| Seq | STVAL | FRCNT | CHANGE | NUMBER | line |
|-----|-------|-------|--------|--------|------|
| NS7 | 18 | 02 | FF | 10 | 215 |
| NS7 | 08 | 20 | 00 | 01 | 216 |
| NS8 | A4 | 10 | FF | 04 | 218 |

**Special (non-table):** SLAM `AUDF1=18, AUDF1+1=AF` (W3SOUN:262-266); cruise/Sputnik drone
`BOTTOM=30,0,0 / TOP=70,30,30` on `AUDF1+6` (W3SOUN:354-355). Init `AUDCTL=AUDCV=20`
(W3SOUN:128, 402).

---

## 4. Sound-ID flags & priority (`SNDON`)

The one-hot flag passed to `SNDON` (W3SOUN:72-80, all hex):

| Flag | Value | bit | → sound label | data label |
|------|------:|----:|---------------|------------|
| `SLOABM` | 01 | 0 | `LO` | LOW ON ABMS |
| `SEXPLO` | 02 | 1 | `EX` | EXPLOSION |
| `SABLAU` | 04 | 2 | `LA` | LAUNCH |
| `SUNABM` | 08 | 3 | `TK` | BONUS TICK |
| `SNEWAV` | 10 | 4 | `WP` | WHOOP |
| `SENDGA` | 20 | 5 | `XX` | "THE END" |
| `SBONUS` | 40 | 6 | `BN` | BONUS CITY |
| `SNSHOT` | 80 | 7 | `NS` | CAN'T FIRE |
| `SOHNO`  | 02 | (=`SEXPLO`) | `EX` | "OH NO" alias — same as explosion (W3SOUN:72) |

`SNDON` shifts the flag left until a bit falls into carry to recover the **bit index**
(W3SOUN:230-234), then indexes the `PNTRS` pointer table (`OFFSET LO/EX/LA/TK/WP/XX/BN/NS`,
W3SOUN:117-125). Because it shifts from the MSB, **the highest set bit wins** when more than
one is requested — i.e. `SNSHOT` (0x80) is highest priority, `SLOABM` (0x01) lowest.

---

## 5. Game-event → sound map (W3MAIN call sites)

Verified at the callers, not inferred from names. Line cites in `W3MAIN.MAC`.

| In-game event | Flag / entry | Sound | Caller | Notes |
|---------------|--------------|-------|--------|-------|
| **ABM launch** (normal) | `SABLAU` → `SNDON` | `LA` | W3MAIN:1399-1403 | "LAUNCH SOUND" |
| **ABM launch, base low** | `SLOABM` → `SNDON` | `LO` | W3MAIN:1389-1395 | low-ammo *variant* of launch (`BASLOW` "LOW"); this **is** the "low" warning cue |
| **Explosion** (ABM detonation kills ICBM) | `EXSNON`/`SEXPLO` | `EX` | W3MAIN:2121 (`JMP EXSNON ;BANG ON`) | |
| **City / base destroyed** (by enemy) | `SOHNO` → `SNDON` | `EX` | W3MAIN:2215 (base), 2259 (city; "MAKE DESTROY SOUND") | `SOHNO`=`SEXPLO`, so reuses the explosion sound |
| **Out-of-ammo klaxon** ("can't fire") | `SNSHOT` → `SNDON` | `NS` | W3MAIN:1283 ("NO FIRE NOISE"), 1303 | fires on fire-press with no ABMs / all bases empty |
| **New wave** | `SNEWAV` → `SNDON` | `WP` | W3MAIN:3911-3913 | preceded by `INISOU` all-off |
| **Wave-bonus count-up tick** | `SUNABM` → `SNDON` | `TK` | W3MAIN:4277-4279, 4463-4465 | one tick per bonus unit; timer `EXPFRA`=5 frames (W3MAIN:4273) |
| **Bonus city earned** | `SBONUS` → `SNDON` | `BN` | W3MAIN:4845-4847 | RNG-jittered (§2.3) |
| **End game / game over** | `SENDGA` → `SNDON` | `XX` | W3MAIN:4647-4649 | "END GAME SOUND" |
| **Cruise missile (smart bomb) on screen** | `CMSNON` … `CMSNOF` | drone | on W3MAIN:2645; off W3MAIN:1603, 2111, 4911 | parametric descending drone (§2.4) |
| **Sputnik / satellite on screen** | `STSNON` … `STSNOF` | drone | on W3MAIN:5837; off W3MAIN:2073, 5907 | parametric descending drone (§2.4) |
| **Tilt / slam switch** | `SLAMSN` flag → `SLMSND` | blip | flag set W3MAIN:829 | direct register write |

**Fidelity finding — there is NO dedicated "incoming ICBM" sound.** A search of the game
code for an incoming/whistle/ICBM cue is empty. Regular ICBM trails are **silent**; the only
continuous "threat" audio is the cruise-missile and Sputnik drones above. The mc8-2/mc8-3
implementation must **not** invent an incoming-missile sound — doing so would be a fidelity
regression. (This resolves the one item on the story's event checklist that has no ROM
counterpart.)

---

## 6. Reuse surface — confirmed by reading it

- **`@shared/audio`** (`src/shared/audio.ts`) — the **sample** engine: `AudioManifest` →
  `fetch` → `decodeAudioData` → `AudioBufferSourceNode` (audio.ts:104, 163-181, 235-270),
  with `play`/`startLoop`/`stopLoop`. This is the path a **baked WAV** plugs into. It can
  loop a buffer but exposes **no per-frame pitch control**, so it cannot render the
  descending drones' pitch sweep.
- **`@shared/synth`** (`src/shared/synth.ts`) — the **runtime WebAudio** engine:
  `createSynthEngine`, `SynthTarget`, `Voice`/`PersistentVoice`, `noiseBuffer`
  (synth.ts:127, 135, 244, 273). Oscillator + noise + gain primitives with resume-on-gesture
  and backgrounded-tab guards already handled. **This is the runtime-fallback target.**
- **`plugins/star-wars/tools/pokey-bake/vendor/pokey.js`** — a full POKEY emulator: 4 voices,
  `AUDCTL` handling (`set_audctl`), and the poly-counter noise/RANDOM generators
  (`Poly4/5/9/17`, pokey.js:50-53, 325-360). Crucially it is an **`AudioWorkletProcessor`**
  (`class POKEYProcessor extends AudioWorkletProcessor`, pokey.js:232) at 48000/44100/56000
  Hz — **built to run live in the browser**, though `pokey-bake` currently only runs it
  *headlessly in `node:vm`* to bake WAVs. This is the **recommended runtime target**.
- **Precedents:** `pokey-bake` (tempest→star-wars) is the *baked* precedent; **battlezone**
  (`plugins/battlezone/src/shell/audio.ts`, `engineParams(throttle)`, `cueEnvelope`) is the
  *runtime-parametric* precedent — its engine drone re-pitches with throttle exactly as MC's
  drones re-pitch with descent, and it is **runtime synthesis, not a `@shared/audio`
  consumer.** No plugin yet runs a **live** `AudioWorklet`; that is the one piece of new
  ground the recommended path breaks.

---

## 7. Decision & rationale

**Runtime synthesis. Not baked assets.** The determining factors:

1. **Parametric/continuous sounds have no fixed-WAV form.** The cruise-missile and Sputnik
   drones sweep pitch per frame and last as long as the threat is on screen (§2.4); the
   bonus count-up is a game-tempo tick train. `@shared/audio` can loop a buffer but cannot
   sweep its pitch per frame, so a bake would flatten the drones to static loops — an
   audible fidelity loss on the game's most characteristic sounds. Runtime replay of
   `MODSND` reproduces them exactly.
2. **Operational cost & drift.** Baking requires a WAV set uploaded to R2 (`just
   deploy-assets`) into a bucket that CI never reconciles against the build — the documented
   star-wars failure mode where audio 404s silently and asset/code versions drift. It also
   pulls in the **contract-5 live-verify follow-through** as a hard dependency. Runtime
   synthesis ships the sound *in the JS bundle, versioned with the game* — no bucket, no
   `deploy-assets`, no live-verify story.
3. **Hardware randomness** (§2.3) is preserved live and frozen by a bake.
4. **The lift is small and shared-friendly.** The envelope stepper is a pure, deterministic
   function of `(tables, frame, rngRead)` — it belongs in `plugins/missile-command/src/core/`
   behind the sim/shell boundary, with the POKEY/worklet wiring in `src/shell/`. The 4-byte
   record format already has a fleet walker (`pokey-bake/expandSwfx`) to borrow from.

**Within runtime, recommended: `pokey.js` as a live `AudioWorkletProcessor`.** It is the
only option that is simultaneously bit-accurate to POKEY timbre, parametric for the drones,
and asset-free. `pokey.js` already exists and already runs headlessly, so wrapping it in a
worklet is bounded. **Fallback: `@shared/synth`** oscillator/noise voices (battlezone
pattern) driven by the same lifted envelopes — chosen only if the live-worklet integration
overruns mc8-2; it trades bit-exact POKEY timbre for proven, in-fleet infrastructure while
keeping every envelope value exact and staying asset-free. MC's POKEY use is
frequency-sweep-dominated with a single fixed `AUDCTL=0x20` and only one RNG-jittered cue,
so the timbre gap of the fallback is smaller here than it would be for a distortion-heavy
title like tempest.

**Rejected: baked assets** — best-in-class only for pure one-shots, which is the minority of
this game's sound; the parametric drones and the operational burden make it the worst fit.

---

## 8. mc8-2 / mc8-3 plan

- **mc8-2 — engine + one-shots (runtime).** Transcribe the §3 tables into a
  `core/` data module (values verbatim, hex, each cited as here). Port `MODSND`'s per-frame
  stepper as a pure function. Stand up `pokey.js` as an `AudioWorkletNode` in `shell/`, prove
  one one-shot end-to-end (recommend `EX`/explosion), wired to the sim's existing event
  emission. Boundary: stepper + tables in `src/core/`, worklet/POKEY wiring in `src/shell/`
  (the game's purity gate scans `core/` source text — keep `window`/`document`/`Audio*` out
  of it). If the worklet integration stalls, switch to the `@shared/synth` fallback without
  changing the `core/` stepper or tables.
- **mc8-3 — parametric sounds + full event wiring.** The cruise/Sputnik drones (`PMRBIL`
  sweep, gated by `CRMONS`), the SLAM blip, the bonus count-up tick train (`EXPFRA` cadence),
  and the RNG-jittered bonus cue; wire the full §5 event map to the sim. Assert **no**
  incoming-ICBM sound is emitted (§5 finding) as a regression guard.

---

## 9. If-baked contingency (the REJECTED branch — recorded per AC)

Documented only because the AC requires the baked path be fully specified even when not
chosen; do not build this without a decision reversal.

- **Bake:** extend `pokey-bake` (its 4-byte record already matches §2.2) with the §3 tables;
  render one WAV per table-driven one-shot at 48 kHz. The parametric drones cannot bake
  faithfully (§2.4) and would regress.
- **R2 layout:** the arcade uses one public bucket `arcade-lobby`, each game under its
  `<id>/` key prefix; game *audio assets* live in the **separate hand-uploaded bucket named
  plain `arcade`** (fronted by `arcade-assets.slabgorb.com`, `just deploy-assets`), which CI
  never touches. Keys: `missile-command/sfx/<name>.wav` (e.g.
  `missile-command/sfx/explosion.wav`, `.../launch.wav`, `.../no-fire.wav`,
  `.../new-wave.wav`, `.../bonus-city.wav`, `.../end-game.wav`, `.../bonus-tick.wav`).
- **contract-5 live-verify + follow-up:** because `deploy-assets` and `release` are
  independent and CI does not compare R2 against the build, a baked path **requires** a
  follow-up story that fetches each live key post-deploy and asserts a `200` + non-empty body
  (the contract-5 live-verify), mirroring the star-wars audio-deploy remediation. That extra
  story is itself a cost counted against this branch in §7.

---

## 10. Open questions / notes for implementers

- **AUDCTL semantics:** the engine sets a single fixed `AUDCTL=0x20` (W3SOUN:128, 402) and
  never changes it; mc8-2 should mirror that constant into `pokey.js`'s `set_audctl` rather
  than deriving POKEY clock modes from scratch.
- **Per-register channel assignment** (which of AUDF1..AUDC4 each `EXn/LAn/…` sequence drives)
  follows from the `OFFSET` macro emitting 8 pointers per sound (W3SOUN:87-95, 117-125) and
  `SNDON` loading them into `POINT[0..7]` (W3SOUN:244-254). mc8-2 should transcribe the full
  8-pointer block per sound; §3 lists the defined sequences but not the (mechanical)
  channel-to-register binding, which is mc8-2's transcription task.
- **Frame clock:** step the engine at the sim's 61.0076 Hz tick (`docs/rom-study/timebase.md`),
  not at an audio-thread rate; the worklet renders samples, the sim drives register changes.
- **Bonus-city cue is dummy-annotated** (W3SOUN:182) and RNG-jittered (§2.3): transcribe it
  verbatim as shipped and resist the urge to hand-tune it — its rough character is authentic.
