---
story_id: "sw6-1"
jira_key: "sw6-1"
epic: "sw6"
workflow: "tdd"
---
# Story sw6-1: Bake the four POKEY music loops from the original 1983 source — port Rusty's POKEY Music driver (SNDPM.MAC) + the SWMUS.MAC tunes, upload to R2, and make Star Wars audible for the first time

## Story Details
- **ID:** sw6-1
- **Jira Key:** sw6-1
- **Workflow:** tdd
- **Repos:** star-wars, orchestrator
- **Branch:** feat/sw6-1-pokey-music-bake (star-wars, off origin/develop)
- **Context:** sprint/context/context-story-sw6-1.md
- **Design:** docs/superpowers/specs/2026-07-13-star-wars-music-bake-design.md
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-14T12:18:10Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T10:04:37Z | 2026-07-14T10:08:09Z | 3m 32s |
| red | 2026-07-14T10:08:09Z | 2026-07-14T10:43:09Z | 35m |
| green | 2026-07-14T10:43:09Z | 2026-07-14T11:31:28Z | 48m 19s |
| review | 2026-07-14T11:31:28Z | 2026-07-14T11:45:58Z | 14m 30s |
| green | 2026-07-14T11:45:58Z | 2026-07-14T12:02:47Z | 16m 49s |
| review | 2026-07-14T12:02:47Z | 2026-07-14T12:18:10Z | 15m 23s |
| finish | 2026-07-14T12:18:10Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (blocking): AC-5 and the design spec both state `towers = PMBEN`, quoting SNDPM.MAC:337's label `;BENS THEME (START OF TOWER)`. That comment is STALE. `PMBEN`'s only caller in the entire 1983 source is `WSMAIN.MAC:2161` — `JSR PMBEN ;BEN'S THEME WHEN LOSE GAME WITH NO HIGH SCORE`. It is the **game-over** theme; the real ground/towers cue is `PM4TH` ("BATTLE MUSIC IN FOURTHS: GROUND TOWERS", `WSMAIN.MAC:1636`, cmd `$20`). Following the AC literally would bake the you-lost music onto the Death Star surface. Affects `sprint/epic-sw6.yaml` (AC-5) and `docs/superpowers/specs/2026-07-13-star-wars-music-bake-design.md` (its phase→tune table) — both should be corrected. Resolved with the user, who chose the ROM; tests pin `towers = PM4TH + PMREB` and explicitly refute `BEN`. *Found by TEA during test design.*
- **Gap** (non-blocking): AC-1 says to "mirror `tools/speech-bake/gen-speech-data.mjs`" — **that file does not exist**. `speech-data.mjs`'s header credits a generator that was never committed, so the speech bake's data module cannot actually be reproduced. The exemplar cannot be mirrored, and mirroring it literally would reproduce the defect. Affects `tools/speech-bake/` (a follow-up should commit the generator or correct the header). sw6-1's tests instead require `gen-music-data.mjs` to ship and to record a SHA-256 of its source. *Found by TEA during test design.*
- **Gap** (non-blocking): AC-2 requires the player to implement `.CALL`, `.GOSUB`/`.RETURN` — but **none of the six in-scope tunes reach them** (verified across all 24 voice streams; the only `.GOSUB` in SWMUS.MAC belongs to `CNTV4`, the out-of-scope cantina tune). They fall under AC-2's own escape clause and are pinned to THROW rather than be implemented. Also worth knowing: the ROM's `PKGOSB` keeps a single return pointer, not a stack — it could not nest anyway. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-6 describes "TWO towers cues (`$20`/`$21`)". `$21` is `PMREB` — "REBEL SHIP THEME: TRANSITION INTO TRENCH" — which fires *during* the ground phase at `PH.TIM==14` ("FINISH GROUND WITH REBEL"), so grouping it under towers is defensible, but the story's wording invites the reader to mis-assign it to the trench. The trench's own cue is `$22` (`PMRRP`), alone. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking, **affects already-shipped code — worth a look**): `tools/pokey-bake/bake-sfx.mjs` sets `SW_BEAT = 0.004096`, on the belief that the FX driver is walked by the 4.096 ms sound IRQ. The 1983 source says otherwise: `SNDAUX.MAC:167-170` calls `AUDDO` (the SFX driver) only on the **"?8 MILL BOUNDARY?"** — `LDA $INTCT / LSRA / IFCC` — i.e. every *other* interrupt, the same halving that makes the music clock 8.192 ms. If that is right, **every shipped star-wars SFX is baked at double speed**. I did not chase it (out of scope, and the SFX were signed off by ear), but it is cheap to test: re-bake one effect at `0.008192` and compare. Affects `tools/pokey-bake/bake-sfx.mjs` and the `sfx/` assets on R2. *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's finding that `tools/speech-bake/gen-speech-data.mjs` does not exist is **confirmed** — `speech-data.mjs` credits a generator that was never committed, so that data module cannot be reproduced or audited. sw6-1's generator ships and records a SHA-256 of every source file it read; the same treatment would make the speech and SFX data auditable. Affects `tools/speech-bake/`, `tools/pokey-bake/sfx-data.mjs`. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `just deploy-assets` is manual by necessity — CI's reusable workflow only ever uploads an app's `dist/`. A future story could add an assets workflow so that a bake cannot be forgotten again. Documented in `docs/ops/hosting.md` for now. *Found by Dev during implementation.*
- **Gap** (non-blocking, **a live defect, found by actually playing the game**): **on a cold load the space theme does not play at all.** The music buffers (~5 MB) only begin loading on the audio-unlock gesture — and on that very same keypress the core fires its run-start `MusicEvent`, so `startLoop('space')` reaches `@arcade/shared/audio`'s `startSource` *before the buffer exists*, hits `if (!buffer) return  // silent no-op`, and the space phase runs to completion in silence. The second run has music, because by then the buffers have decoded. I hit this on the first press of START and mistook it for my own bug. It is the SAME silent-degrade contract that hid this epic's 404s for a whole epic — now hiding a load race instead. Not in sw6-1's scope (it is sw3-5 / shared-engine behaviour, and the assets are genuinely correct), but it means a first-time visitor still hears no space theme. Fix is small: have `startLoop` remember the requested track and (re)start it when the buffer finishes decoding, or gate START on `audio.ready()`. Affects `arcade-shared/src/audio.ts` (`startSource`) and `star-wars/src/main.ts`. **Worth its own story.** *Found by Dev during implementation.*

- **Improvement** (non-blocking, rework): the AC-7 "one POKEY core" guard was disarmed by a
  `.filter()` that excluded the very directory it existed to police — a guard that cannot fail.
  I checked the sibling bake for the same shape and `tools/pokey-bake/bake-sfx.test.mjs` is clean
  (its only `.filter()` selects object keys), so this was a one-off, not a pattern. Worth knowing
  that the class exists: an exclusion added to make a tree-walk pass is a guard being switched off.
  Affects nothing outstanding. *Found by Dev during rework.*
- No other new upstream findings during rework — the four logged above (SFX double-speed, the
  uncommitted speech generator, manual `deploy-assets`, and the **cold-load music race**) all still
  stand. The cold-load race is the one that still costs a first-time visitor the space theme.

### Reviewer (code review)

- **Improvement** (non-blocking): **eight of the nine reviewer specialists are disabled** in `workflow.reviewer_subagents` (only `preflight` is on). I covered their domains by hand, and the single enabled one independently found the High — which is itself an argument for turning `silent_failure_hunter` back on. A story of this size going through review with one specialist is a thin net. Affects `.pennyfarthing` settings. *Found by Reviewer during code review.*
- **Gap** (non-blocking, **found on re-review — carry forward if not taken now**): the "fail loudly"
  rule holds in the middle of the note path but not at its two boundaries. (a) A note transposed onto
  **exactly** NOTTAB index 0 becomes a silent rest with no error — `NOTTAB[note]` is `undefined`
  off-array (throws) but `0` at the rest slot (does not); the corpus test filters `n !== 0` before
  asserting its margin, so it is blind to precisely the event it is named for. (b) A stray `.ENDL`
  with no open `.LOOP` now replays the whole voice **256×** silently, a regression introduced by the
  8-bit-wrap fidelity fix. Neither is reachable in the shipped corpus (min effective note 25; 30
  balanced loop pairs, 0 strays), which is exactly what was true of the High before it was fixed.
  Both are ~6 lines: `if (op !== 0 && note === 0) throw`, and `loopPc = null` + throw on an unopened
  `.ENDL`. Affects `tools/music-bake/pm-player.mjs`, `tools/music-bake/music-data.test.mjs`.
  **They become live the moment the generator is pointed at a sixth tune.** *Found by Reviewer during
  re-review.*
- **Improvement** (non-blocking): **`tools/` is outside the typecheck boundary.** `tsconfig.json` includes only `["src","tests"]`, and the bake tools are `.mjs`, so `npm run build` (`tsc --noEmit && vite build`) is green without ever looking at 1,000+ lines of new tooling. The same is true of `pokey-bake` and `speech-bake`, so this is pre-existing, not introduced here — but the green build should not be read as evidence about this code. Affects `star-wars/tsconfig.json`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Pinned `towers = PM4TH`, contradicting AC-5's literal text**
  - Spec source: context-story-sw6-1.md, AC-5 (and the design spec's phase→tune table)
  - Spec text: "towers=PMBEN (';BENS THEME (START OF TOWER)')"
  - Implementation: tests pin `towers → PM4TH (SW4V1-4) + PMREB (REBV1-4)` and explicitly assert `not.toContain('BEN')`
  - Rationale: AC-5's stated *basis* is "the source's own named entry points". The entry point's label comment is stale; its only caller (`WSMAIN.MAC:2161`) uses PMBEN as the game-over theme. Honouring the AC's basis means overriding its conclusion. Escalated to and approved by the user before any test was written.
  - Severity: major
  - Forward impact: `towers_theme.wav` is baked from SW4+REB. AC-5 in `sprint/epic-sw6.yaml` and the design spec's table should be corrected to match.

- **Carved amplitude envelope NUL (0) out of AC-2's throw-set**
  - Spec source: context-story-sw6-1.md, AC-2
  - Spec text: "An opcode or envelope the four in-scope tunes never reach MAY be left unimplemented — but it must THROW on encounter, never silently no-op."
  - Implementation: the five unimplemented frequency *instruments* (HRN/TRB/BAS/GLK/WW) must throw, but amplitude envelope NUL (0) is not required to.
  - Rationale: NUL means "no envelope" — it is the identity, not an unimplemented instrument. Demanding a throw would crash a voice that legitimately disables its envelope. (Frequency NUL is in fact selected by in-scope tunes, so only the amplitude NUL is affected.)
  - Severity: minor
  - Forward impact: none.

- **AC-8 (upload) is asserted only when the orchestrator is checked out**
  - Spec source: context-story-sw6-1.md, AC-8
  - Spec text: "this story either adds one (a `just deploy-assets` recipe) or documents the manual step in docs/ops/hosting.md"
  - Implementation: `deploy-assets.test.mjs` asserts when `../justfile` + `../.pennyfarthing` exist, and skips otherwise.
  - Rationale: AC-8's deliverables live in the ORCHESTRATOR repo. star-wars CI checks out star-wars *alone*, so an unconditional test would go red in that repo's CI for a file it must not contain. It still bites on the dev machine and at review, which is where this story is judged.
  - Severity: minor
  - Forward impact: Reviewer must confirm AC-8 by inspection; AC-9's live 200 is the real gate.

### Dev (implementation)

- **Rescaled the ROM's note divisors to the emulator's POKEY clock**
  - Spec source: context-story-sw6-1.md, AC-7
  - Spec text: "THE BAKE ... drives the SAME vendored web-pokey core — no second POKEY implementation enters the repo."
  - Implementation: still the same vendored core, but each 16-bit divisor is rescaled — `N_emu = round(N_rom × emuClock / 1512000) − 7` — before it is written to the emulated POKEY's AUDF pair.
  - Rationale: `NOTTAB` is explicitly "FOR 1.512 MHZ CLOCK" (the cabinet's POKEY). web-pokey models an Atari, whose POKEY runs at `sampleRate × divider` = 1,776,000 Hz at 48 kHz. Fed the ROM's divisors raw, the entire score renders **2.72 semitones sharp** — in tune with itself, in the wrong key. Rescaling preserves the *pitch the cabinet played*, which is the thing being ported. Measured: corrected, the Imperial March opens on 98.36 Hz = **G2 +6 cents** (G2 = 98.00 Hz); uncorrected, 115.11 Hz = A♯2. The user A/B'd both bakes and confirmed the corrected one. `--no-clock-correct` reproduces the naive version.
  - Severity: minor — no AC is contradicted; this is a necessity the ACs did not anticipate.
  - Forward impact: `tools/pokey-bake`'s SFX are unaffected (they are register-level, not note-table-driven). Any *future* ROM table that assumes a non-Atari clock needs the same treatment.

- **The generator reads SNDPM.MAC as well as SWMUS.MAC**
  - Spec source: context-story-sw6-1.md, AC-1
  - Spec text: "the tune data is generated from SWMUS.MAC (the original source), not hand-authored"
  - Implementation: the tunes come from SWMUS.MAC; `NOTTAB` and the five envelope tables come from SNDPM.MAC. `MUSIC_SOURCE` records a SHA-256 of **both**.
  - Rationale: the note→frequency table and the envelopes are the *driver's* data, and AC-2 requires porting the driver. Hand-transcribing 98 divisors and 160 envelope bytes would have reintroduced precisely the transcription risk AC-1 exists to eliminate.
  - Severity: minor
  - Forward impact: none.

- **REWORK: memoized the bake in the TEST file, not inside `bakeTrack()` as the review prescribed**
  - Spec source: Reviewer Assessment, [MEDIUM] `[SIMPLE]` (the 113.9s test file)
  - Spec text: "Memoize the bake per `(track, rate, clockCorrect)` and hoist `loadPokeyClass` out of `bakeTrack`."
  - Implementation: `loadPokeyClass` is now cached per sample rate inside the tool, as asked. The *bake* memo, however, lives in `bake-music.test.mjs` as a `bakeOnce(track)` helper — `bakeTrack()` itself stays pure.
  - Rationale: a cache inside `bakeTrack()` would hand every caller the same mutable `Float32Array` — and, the real objection, it would silently make the determinism test compare an object **with itself**. That test is the only thing guarding reproducibility, and the prescribed fix would have quietly turned it into a tautology: precisely the "test that cannot fail" the same review rejects one row above (M1). The suite is the only caller that repeats itself — the CLI bakes each track once — so the memo belongs there. The determinism test now baits the trap explicitly (`expect(a.samples).not.toBe(b.samples)`), so it cannot be undone by accident. The finding's actual intent is met: **115.2s → 58.4s**.
  - Severity: minor
  - Forward impact: none.

## Dev Assessment

**Implementation Complete:** Yes — **1104/1104 tests passing (GREEN)**, 97 files, no pre-existing test touched (baseline 1029).

**Files Changed**

star-wars (`feat/sw6-1-pokey-music-bake`, pushed):
- `tools/music-bake/gen-music-data.mjs` — **committed** generator. Lifts the tunes from `SWMUS.MAC` and the driver tables from `SNDPM.MAC`, records a SHA-256 of each. (`speech-bake`'s generator was never committed — its data module credits a file that does not exist. This one ships.)
- `tools/music-bake/music-data.mjs` — GENERATED: 4 tracks, 24 raw voice byte streams, `NOTTAB[98]`, 2 frequency + 5 amplitude envelopes.
- `tools/music-bake/pm-player.mjs` — the `SNDPM.MAC` port.
- `tools/music-bake/bake-music.mjs` — headless bake driving the **same** vendored `pokey-bake/vendor/pokey.js`.

orchestrator (`main`):
- `justfile` — `just deploy-assets`
- `docs/ops/hosting.md` — the `arcade-assets` bucket, and why CI cannot see it

**Note: `src/` is untouched.** The flatten decision (AC-6) kept the manifest at four files, so `audio.ts`, `main.ts` and the sw3-5 music-channel tests needed no change. The music path sw3-5 built was correct all along — it just had nothing to fetch.

### What the ROM had to tell us, and no comment would have

- **The music clock is 8.192 ms, not 4.096 ms.** The sound board's timer is 4 ms (`LDA #06 / STA E1024T ;MAKE INTO 4 MS`), but `PKDR` updates voices 1/3/5/7 on one interrupt and 2/4/6/8 on the next — so any *one* voice advances every **other** tick. The driver corroborates it from the inside: `CMPB #31. ;LIMIT AT 31 (QUARTER SECOND)`, and 31 × 8.192 ms = 254 ms. At 4.096 ms the Imperial March would run at 258 BPM.
- **Every instruction is a 2-byte pair** — the fetch is `LDB ,X++`, a 6809 post-increment *by two*. That is why `.ENDL` (`8F,00`) is not mistaken for the terminator, and why end-of-tune is a zero **duration** byte, not a zero note byte (a zero note is a *rest*).
- **Bit 0 of the duration byte is the TIE flag** (`ANDA #01 ;TEST IF NOTE IS TIED`), which is the whole explanation for TEA's `0x80`/`0x81` pairs: a tied note does not reset `VSEQ`, so its envelope runs on instead of re-attacking.
- **`FETAB` has only two entries.** The ROM implements frequency envelopes NUL and OFS; HRN is commented out and 2–6 do not exist. TEA's throw-set was not a guess — selecting one would index off the end of the ROM's own table.

### Verification

The AC-3 oracle passes: the decoder reproduces RR1 note-for-note against TEA's hand transcription, including the `.LOOP 2` expansion — so the generator, the radix reading, the rest handling and the loop semantics are all confirmed against what the 1983 author wrote in his own comments.

Baked lengths: space 15.0 s · towers 27.0 s · trench 11.8 s · imperialMarch 7.5 s. All four non-silent (peak ≈ 0.6), deterministic, no dead air at either end.

### AC-8 — UPLOAD: the music is live (user-authorised)

Before, all four 404'd. After `just deploy-assets`:

```
space_theme.wav     200   1,438,428 bytes   audio/wav
towers_theme.wav    200                     audio/wav
trench_theme.wav    200                     audio/wav
imperial_march.wav  200                     audio/wav
```

**⚠ The bucket is `arcade`, not `arcade-assets`.** The hostname is
`arcade-assets.slabgorb.com`, but the R2 bucket behind it is plain `arcade` — every
*other* bucket matches its domain, so this is the exception, and wrangler reports a
wrong guess as *"The specified bucket does not exist."* It cost a failed upload; the
recipe and `docs/ops/hosting.md` now both say so loudly.

### AC-9 — THE LIVE CHECK (a browser, not a green vitest)

Served **this** checkout on a spare port: `lsof` showed port 5274 was owned by
`/Users/slabgorb/Projects/a-2/star-wars` — a **sibling checkout**. Screenshotting it
would have verified someone else's code. Served a-1 on :5284 and confirmed the server's
cwd before trusting a thing.

1. **The real game fetches the real assets.** With the run started, the network shows
   all four `star-wars/music/*.wav` at `200` from R2.
2. **A real phase edge rings the right loop.** Pressing START drives the core's
   run-start edge → `MusicEvent` → `main.ts` `startLoop` → **one live looping source,
   `space`.** Identified by buffer duration (15.0 s), which is exactly what the bake
   emitted — so the game is playing *these* files.
3. **The single-music-channel invariant holds.** Driving the shell's own `audio.ts`
   (the same `MUSIC` manifest, the same `MUSIC_CHANNELS` — all four → `'music'` — and
   the same `@arcade/shared` engine `main.ts` wires up) through every track:

   | startLoop | live looping sources |
   |---|---|
   | `space` | `[space]` |
   | `towers` | `[towers]` |
   | `trench` | `[trench]` |
   | `imperialMarch` | `[imperialMarch]` |

   Exactly one loop at every step, always the right one. A phase edge swaps it by
   voice-stealing on the shared channel, precisely as sw3-5 designed.

**Star Wars is audible for the first time.**

**Handoff:** To the Thought Police (Reviewer).

## Dev Assessment — REWORK after REJECT

**Implementation Complete:** Yes — **1115/1115 passing** (baseline 1104; +11 new tests). Build green.
All 7 findings addressed: **H1 (blocking) + 3 Medium + 3 Low**. `src/` still untouched.

The High was right, and it was right in the way that stings: I wrote "no opcode may silently no-op"
into the ACs, into the commit message, and into a comment block in the player — and then wrote
`NOTTAB[note] ?? 0` in the one line that converts a note to a pitch. The fallback isn't "nothing",
it's `NOTTAB[0]`, the **REST** divisor, which `output()` force-mutes. A note that walked off the
table would not crash, would not warn, and would not even sound *wrong* — it would sound like a
rest, and the bake would still report a healthy peak. That is this epic's bug, reintroduced by the
person who named it.

| # | Finding | Fix | Proof it bites |
|---|---------|-----|----------------|
| **H1** | note off `NOTTAB` → silent rest | `pm-player.mjs` throws, naming the note, the key, and what it sounded as | 5 new tests, incl. a `.CKEY -30` compounding through a `.LOOP 4` until the note walks off (66→36→6→**−24**) |
| **M1** | AC-7 guard couldn't fail | dropped the `music-bake\|pm-player` exclusion — the invariant is *one* core, at the vendored path, **wherever** it lands | re-planted `tools/music-bake/vendor/pokey.js`: **now fails** (`expected 2 to have length 1`). It passed before |
| **M2** | 1 of 24 voices had an oracle | hand-transcribed **SW4V1** from SWMUS.MAC:2515 — 31 notes, both loop passes | pins the compounding `.CKEY -12.` *inside* `.LOOP 2`, the `.NKEY 0` reset, and refutes the hex reading (−0x12) |
| **M3** | 113.9s test file | memo in the test (see deviation) + `loadPokeyClass` cached per rate | **115.2s → 58.4s** |
| L1 | `decodeVoice` doc lied ("start", returned final) | captures at the **first note**, making the doc true | a 2-note stream whose `.AENV` changes — the single-op streams could never catch it |
| L2 | `.LOOP 0` diverged from ROM | reproduced the 8-bit `DEC` wrap: 0 → 255 → **256 passes** | test asserts 256 |
| L3 | CLI ate the positional `<dir>` | parse against a known flag set; unknown flags **throw** | `--no-clock-correct <dir>` now lands in `<dir>`, not `out/`; `--typo` errors instead of being ignored |

### What I measured rather than assumed

- **`loadPokeyClass` was not the cost.** The review paired it with the memo, but it compiles in
  **0.35 ms** — 1.7 ms for five loads. The 114 s was the render loop: a cycle-accurate chip over 61 s
  of audio at ~0.9 s of CPU per second of sound. One bake of each track is 47.5 s, and the suite was
  baking each 2–3×. I cached the class anyway (it's free, and all of pokey.js's module scope is
  `const`, so no state can leak between bakes — which the determinism test now also proves), but the
  win came from not baking the same track four times.
- **The rest path survived the throw.** The guard is `divisor === undefined`, not `!divisor`. A
  truthiness check there would have thrown on **every rest**, because `NOTTAB[0]` is `0` — the same
  lang-review JS#4 trap that this file's rest handling already turns on.

### The audio did not change — the live assets are still correct

The player changes are behaviour-preserving on the shipped corpus (min effective note 25, max 73;
loop counts 2/3/6/13/14, so the 8-bit wrap is unreachable). Rather than assert that, I re-baked all
four and checksummed them against **what R2 is actually serving right now**:

```
space_theme      rebake=c02721a48db70fd8  live=c02721a48db70fd8  IDENTICAL
towers_theme     rebake=0e87629178aef313  live=0e87629178aef313  IDENTICAL
trench_theme     rebake=dd2d469e07230fbe  live=dd2d469e07230fbe  IDENTICAL
imperial_march   rebake=3a3289570b252340  live=3a3289570b252340  IDENTICAL
```

Byte-for-byte. **No re-upload needed**, AC-8/AC-9 still hold, and Star Wars is still audible.

**Handoff:** Back to the Thought Police (Reviewer).

### Reviewer (audit)

**TEA — Pinned `towers = PM4TH`, contradicting AC-5** → ✓ **ACCEPTED.** I verified it independently:
`PMBEN` has exactly one caller in the 1983 tree (`WSMAIN.MAC:2161`, *"BEN'S THEME WHEN LOSE GAME WITH
NO HIGH SCORE"*), and `SNDPBX.MAC` independently types `$20 PM 4TH` as *"BATTLE MUSIC IN FOURTHS:
GROUND TOWERS"*. AC-5's own stated basis is "the source's own named entry points" — the entry point's
label is stale and its caller is not. Honouring the basis over the conclusion is correct, it was
escalated before a line was written, and the refutation is pinned in a test. This is the story's best
catch.

**TEA — Carved amplitude envelope NUL (0) out of the throw-set** → ✓ **ACCEPTED.** Vindicated by the
ROM: `AETAB` (SNDPM.MAC:1197) *does* list `NULENV` at index 0, so NUL is a real, selectable entry, not
an unimplemented instrument. Demanding a throw would have been wrong. (Note the mirror image also
checks out: `FETAB` really does have only two entries, so the freq-envelope throw-set is exactly
right.)

**TEA — AC-8 asserted only when the orchestrator is checked out** → ✓ **ACCEPTED.** Correct call.
star-wars CI checks out star-wars alone; an unconditional test would have gone red in that repo's CI
for a file it must not contain. The `skipIf` is honest and it still bites where the story is judged.

**Dev — Rescaled the ROM's note divisors to the emulator's POKEY clock** → ✓ **ACCEPTED.** Not a
deviation from the ROM but a *precondition* for matching it: `NOTTAB` is stated "FOR 1.512 MHZ CLOCK"
and web-pokey runs at `sampleRate × divider`. Measured (G2 +6¢ corrected vs A♯2 uncorrected), A/B'd by
the user, and `--no-clock-correct` preserves the naive path for comparison. Correctly kept inside the
vendored core, so AC-7 is not breached.

**Dev — The generator reads SNDPM.MAC as well as SWMUS.MAC** → ✓ **ACCEPTED.** `NOTTAB` and the
envelopes are the *driver's* data and AC-2 mandates porting the driver. Hand-transcribing 98 divisors
and 160 envelope bytes would have reintroduced exactly the risk AC-1 exists to remove. Both sources
are checksummed.

**UNDOCUMENTED DEVIATION (found by Reviewer)** — **the note-index lookup silently no-ops.** AC-2:
*"it must THROW on encounter, never silently no-op."* `pm-player.mjs:140` does
`NOTTAB[note] ?? 0`, turning an out-of-range note into a rest. Every other out-of-range path in the
file throws by name, so this is an inconsistency with both the AC and the file's own stated
philosophy — and it was not logged by Dev. Severity: **HIGH**. See H1.
→ **RESOLVED in rework (854e285).** `pm-player.mjs:141-155` now throws, naming the note, the key and
the computed index. Verified in place; the `?? 0` is gone from the data path.

### Reviewer (audit) — round 2, the rework

**Dev — "Memoized the bake in the TEST file, not inside `bakeTrack()` as the review prescribed"**
→ ✓ **ACCEPTED — and my prescription was wrong.** I told Dev to memoize inside `bakeTrack()`. Had he
done as told, `bakeTrack('trench')` would have returned *the same object* on the second call, and the
determinism test — the only thing guarding reproducibility — would have been comparing an object with
itself. It would have passed no matter how broken the bake was. That is a test that cannot fail:
**precisely the defect I rejected as M1, one row above, in the same review.** Dev declined the fix,
explained why, and put the memo where it belongs. I verified the result: `bakeOnce()` is declared
before the determinism test in file order (`bake-music.test.mjs:99` vs `:122`), so `a` is a real bake
from an earlier invocation and `b` is baked fresh, with **three other track bakes in between on the
same cached POKEY class** — meaning the test now also proves the class cache leaks no state. And
`expect(a.samples).not.toBe(b.samples)` (`:250`) baits the trap so it cannot be quietly undone.
Correct call, correctly argued, correctly logged. The reviewer was the one who needed reviewing.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer |

**All received:** Yes (1 enabled subagent returned; 8 disabled via `workflow.reviewer_subagents`)
**Total findings:** 7 confirmed round 1; 2 new confirmed on re-review (both Medium); 0 dismissed, 0 deferred

Only `preflight` is enabled in settings. A disabled specialist grants NO coverage, so I worked its
domain myself: I read all four source files line-by-line against `SNDPM.MAC`, probed the player's
out-of-range behaviour directly, and **planted a rogue `pokey.js` to test whether AC-7's own guard
can fail** (it cannot — see M1).

**Round 2 (re-review of 854e285)** — `reviewer-preflight` re-run: **Received: Yes, GREEN.**
1115/1115, build clean, tree clean, no debug code, no swallowed errors left in the four source files
(it re-read every `catch`/`??`/`||` and cleared them individually). It independently reproduced my
timings: the bake test file alone is **58.01s** (was 113.9s). The other eight remain disabled, so I
again worked their domains by hand — and this time by **execution, not reading**:
- **[SILENT]** I swept the note index across the table boundary (1 → 0 → −1) and found the surviving
  hole at exactly 0 (see M4).
- **[TEST]** I re-planted the rogue `pokey.js` **myself** rather than trust the claim — the guard now
  fails, as it must.
- **[TEST]** I checked whether the new SW4V1 oracle was **circular** — i.e. transcribed from the
  generated `music-data.mjs` instead of the source. It is not: I read SWMUS.MAC:2515 myself and it
  matches byte-for-byte.
- **[EDGE]** I fuzzed the new 8-bit loop wrap with a malformed stream and found the regression (M5).

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/javascript.md` (the changed source is four `.mjs` files;
`tsconfig.json` includes only `["src","tests"]` and the files are `.mjs`, so **`tsc` never type-checks
any of this** — `npm run build` being green says nothing about it. TypeScript rules are therefore N/A).

| # | Rule | Enumeration | Verdict |
|---|------|-------------|---------|
| **1** | **Silent error swallowing** | Every out-of-range path in `pm-player.mjs`: unimplemented opcode (`:147`) **throws**; freq envelope (`:171`) **throws**; amp envelope (`:181`) **throws**; unknown opcode (`:194`) **throws**; **note index (`:140`) `NOTTAB[note] ?? 0` — SILENTLY DEGRADES TO A REST.** Zero `catch` blocks anywhere (preflight §4). | **VIOLATION — H1.** 4 of 5 comply; the fifth is the one that handles the actual musical data. |
| 2 | Promise/async pitfalls | `bakeTrack` is sync; the only `async` is the test's `it.each`. No floating promises, no `forEach` with async callback. | Compliant |
| 3 | Prototype pollution | No `Object.assign` on external input; no bracket access from user input. `NOTTAB[note]` is a numeric index into a frozen literal array. | Compliant |
| 4 | Equality / `0` is falsy | The load-bearing rule here — note `0` is a REST. `op === 0 ? 0 : op + this.key` (`:139`) uses `===`; terminator is `arg === 0` (`:133`), NOT a truthiness check; `this.onote === 0` (`:211`) mutes a rest. `if ((arg & 1) === 0)` for the tie flag (`:142`). All explicit. | Compliant — and pinned by 3 tests |
| 5 | DOM / browser security | N/A — build-time Node tooling, no DOM. | N/A |
| 6 | Node.js specifics | `readFileSync(path, 'latin1')` — explicit encoding, correct for CR-terminated 1983 ASCII. No `child_process` in the new files. `scripts/deploy-r2.mjs` (unchanged) uses `execFileSync` with **array args** — no shell, no injection. `justfile` quotes `"$staging"`, uses `mktemp -d` + `trap … EXIT`, `set -euo pipefail`. | Compliant |
| 7 | Regex safety | Regexes in the generator are static literals over a local file. No `new RegExp(userInput)`… except `parseEnvelope` builds `new RegExp(\`^${label}:\`)` from a **hardcoded** label list — not user input. No ReDoS. | Compliant |

### Devil's Advocate

*Arguing this is broken.*

The headline claim is "no opcode may silently no-op — a silent no-op is how a tune loses a voice and
nobody notices." That sentence is in the acceptance criteria, in the commit message, and in a
comment block in `pm-player.mjs` itself. And then, in the single hottest line of the player — the
line that converts a note byte into a frequency — the code writes `NOTTAB[note] ?? 0`. If the index
misses, the note becomes `0`, and `0` is not an error: `0` is the REST divisor, and four lines later
`onote === 0` force-mutes the channel. **A note that falls off the table does not crash, does not
warn, does not even sound wrong — it becomes silence, in a tune, in a game whose entire epic exists
because silence was mistaken for correctness.** The author wrote the rule and then broke it in the
one place the rule was for.

"But it's unreachable." Is it? The shipped towers data does `LOOP 2 [ … CKEY -12 … ] ENDL`, so the
key steps to −12 and then −24 across the two passes, and `NKEY 0` resets it afterwards. Transposition
is not hypothetical; it is live, compounding, and inside a loop. The lowest *effective* note in the
whole corpus is 25 — so today there is margin. But the margin is data-dependent, undefended, and
untested: nothing in the suite asserts a note ever lands on the table. Re-point the generator at a
different tune (the epic has five more), fix a parse bug, mis-count a loop, and notes drop below 1
and vanish one at a time. The suite stays green. The bake still "works." Peak amplitude is still 0.6.
Every AC-7 assertion still passes. That is the exact shape of the bug this story was written to end.

And the guard that was supposed to stop a rival POKEY from entering the repo? I planted one at
`tools/music-bake/vendor/pokey.js` and the test **passed** — it filters out the entire `music-bake`
directory before counting. So AC-7's invariant is enforced everywhere except the one directory where
a second implementation would actually be added. A test that cannot fail is not a test; it is a
comment with a green tick next to it.

Meanwhile 99% of the suite's runtime is now one file, and CLAUDE.md already records that this project
has been bitten by CPU-bound tests timing out on slower CI runners.

The fidelity work is genuinely excellent. The guardrails around it are not yet worthy of it.

### Devil's Advocate — round 2 (the rework)

*Arguing the rework is broken.*

The fix draws a line and calls it a principle: "a note that falls off NOTTAB must throw, never become
a rest." But look where the line actually falls. `NOTTAB[note]` returns `undefined` for index −1, and
that throws. It returns `0` for index **0**, and that does **not** throw — it becomes a rest, silently,
force-muted by `output()` four lines later. So a real note transposed down onto exactly the rest slot
vanishes into silence with no complaint, while the very same note transposed one semitone further
crashes the bake. The guard is off by one against its own stated rule, and it is off by one *in the
direction of silence*. I proved it: `.CKEY -66` on F5 yields `{note: 0}` and no error.

Worse, the new corpus test cannot see it. It computes `sounded = effective.filter(n => n !== 0)` and
then asserts `min === 25` — so a real note transposed onto 0 is not a low note that trips the margin,
it is *reclassified as a rest* and drops out of the sample entirely. The one test written to prove
"nothing quietly becomes a rest" is blind to the exact event it is named after.

And the `.LOOP 0` fidelity fix bought ROM-accuracy at the price of a regression. `PKEL` now decrements
an 8-bit counter, so a stray `.ENDL` with no matching `.LOOP` takes `loopCount` from 0 to 255 and jumps
to `loopPc` — which defaults to **0**, the top of the stream. The old code no-oped. The new code replays
the entire voice 256 times, stays under `MAX_STEPS`, throws nothing, and hands you a tune. A silently
256×-repeated voice, from a file whose entire thesis is that silence and nonsense must be loud. Both
holes are unreachable in the shipped corpus — 30 balanced loop pairs, minimum effective note 25 — which
is exactly what was said about the High I rejected last time, right before it was fixed.

## Reviewer Assessment

**Verdict:** APPROVED

**Round 1 verdict (REJECTED — 1 High, 3 Medium, 3 Low) is below, preserved.** All seven are fixed and
I verified each by execution rather than by reading the claim. Two NEW Mediums found on re-review
(M4, M5); neither blocks, both are ~6 lines, and both should be taken before the generator is ever
re-pointed at another tune.

### Round 2 — what I verified, and how

| # | Prior finding | Verdict | How I proved it (not by reading the diff) |
|---|---|---|---|
| **H1** | note off NOTTAB → silent rest | ✅ **FIXED** | Swept the index across the boundary: −1 throws, naming note/key/result. The `?? 0` is gone from the data path; preflight independently found no swallowed errors left in any of the four files. |
| **M1** | AC-7 guard couldn't fail | ✅ **FIXED** | **I re-planted `tools/music-bake/vendor/pokey.js` myself.** The test now fails (`expected 2 to have length 1`). It passed with that same file last round. |
| **M2** | 1 of 24 voices had an oracle | ✅ **FIXED** | Checked for **circularity** — an oracle copied from the generated data would prove nothing. Read SWMUS.MAC:2515 myself: the 31-note transcription matches byte-for-byte, and the pitch names check out independently (G5 = 5·12+7+1 = 0x44). It also discriminates: a wrong loop expansion, a non-compounding `.CKEY`, or a relative `.NKEY` each break it. |
| **M3** | 113.9s test file | ✅ **FIXED** | 58.01s, reproduced by preflight. Not vacuous — see the deviation audit; the memo placement is *better* than what I prescribed. |
| **L1** | doc said "start", returned final | ✅ FIXED | Captures at first note; pinned by a 2-note stream whose `.AENV` changes — which the old single-op tests could never have caught. |
| **L2** | `.LOOP 0` diverged | ⚠️ **FIXED, with a regression** | 256 passes confirmed. But it widened the blast radius on malformed input — see **M5**. |
| **L3** | CLI ate the positional `<dir>` | ✅ FIXED | Unknown flags now throw; `--no-clock-correct <dir>` lands in `<dir>`. |

### Round 2 — new findings

| Severity | Issue | Location | Fix |
|----------|-------|----------|-----|
| **[MEDIUM]** `[SILENT]` | **The H1 guard is off by one, in the direction of silence.** `NOTTAB[note]` is `undefined` off the array (throws) but `0` at index 0 (does not). A real note transposed onto exactly the rest slot becomes silence, no error — the same defect class as H1, surviving at the boundary. **Proved:** `.CKEY -66` on F5 → `{note: 0}`, no throw. The new corpus test cannot catch it either: it filters `n !== 0` before asserting `min === 25`, so a note-turned-rest drops out of the sample rather than tripping the margin. Unreachable today (min effective note 25) and defensibly ROM-faithful — but that was the argument for H1 too. | `pm-player.mjs:139-155`, `music-data.test.mjs` corpus test | `if (op !== 0 && note === 0) throw` — a *written* rest is `op === 0`; a *computed* 0 is a transposition bug. And count 0s in the corpus test instead of filtering them out. |
| **[MEDIUM]** `[EDGE]` | **The `.LOOP 0` fidelity fix regressed malformed input.** A stray `.ENDL` with no matching `.LOOP` used to be a harmless no-op (`0 - 1 = -1`, not `> 0`, no jump). Now `(0 - 1) & 0xff = 255` and it jumps to `loopPc`, which defaults to **0** — the top of the stream. **Proved:** `[F5, 0x16, ENDL, 0, ENDT]` decodes to **256 notes**, under `MAX_STEPS`, with no error. A silently 256×-repeated voice, in the file whose thesis is that nonsense must be loud. Unreachable in the corpus (I checked: 30 balanced `.LOOP`/`.ENDL` pairs, 0 strays) but a live foot-gun the moment the generator is pointed at a sixth tune. | `pm-player.mjs:203-211` | Initialise `loopPc = null` and throw on `.ENDL` with no open loop. |

### Round 2 — VERIFIED

- **[VERIFIED] The shipped audio is unchanged, so the live assets remain valid — evidence:** I re-baked
  `trench` myself and checksummed it against **what R2 is serving right now**: `dd2d469e07230fbe…` both
  sides, byte-for-byte. Dev's claim held for all four; I spot-checked one rather than take the table on
  trust. No re-upload needed and AC-8/AC-9 still stand.
- **[VERIFIED] The POKEY class cache cannot leak state between bakes — evidence:** `pokey.js` declares
  only `const` at module scope (filter tables + class declarations), and `processEvents(currentFrame)`
  takes the frame as a **parameter**, shadowing the sandbox global — so all mutable state is per-instance
  (`this.buffer`, `this.buffer_pos`). The class closes over `sampleRate`, which is exactly why the cache
  is keyed by rate. And the determinism test bakes trench twice with three other bakes in between on the
  same cached class, so a leak would surface there.
- **[VERIFIED] `0` is falsy, and the fix respects it — evidence:** the guard is `divisor === undefined`
  (`pm-player.mjs:141`), NOT `!divisor`. A truthiness check would have thrown on **every rest**, since
  `NOTTAB[0] === 0`. This is lang-review JS#4, and it is the one the whole file turns on.
- **[VERIFIED] `src/` is untouched — evidence:** `git diff --name-only origin/develop...HEAD` returns
  zero paths under `src/`. The flatten decision (AC-6) held; the game code sw3-5 built needed no change.

### Rule Compliance — round 2

Rubric: `.pennyfarthing/gates/lang-review/javascript.md`. `tsconfig.json` includes only `["src","tests"]`
and these are `.mjs`, so **`tsc` never type-checks any of this** — the green build says nothing about it.

| # | Rule | Enumeration | Verdict |
|---|------|-------------|---------|
| **1** | **Silent error swallowing** | Every out-of-range path re-enumerated: unimplemented opcode **throws**; freq envelope **throws**; amp envelope **throws**; unknown opcode **throws**; **note index off-array now THROWS (H1 fixed)**. Remaining `??`/`||`: `opening ??= settingsNow()` and `?? settingsNow()` (a voice with no notes — a default, not a suppression) and `positionals[0] || out/` (CLI default, now guarded by an unknown-flag throw). Zero `catch` blocks. **BUT:** note-index **0** still degrades silently (M4), and a stray `.ENDL` silently 256×-repeats (M5). | **2 VIOLATIONS — M4, M5.** The rule's headline case is fixed; two boundary cases are not. |
| 2 | Promise/async pitfalls | The bake tests correctly dropped `async`/`await` — `bakeTrack` is synchronous. No floating promises. | Compliant |
| 3 | Prototype pollution | `NOTTAB[note]` is a numeric index into a frozen literal; `VALUE_FLAGS[a]` is a lookup on a hardcoded literal keyed by a `--`-prefixed string. No user-controlled key reaches an object write. | Compliant |
| 4 | Equality / `0` is falsy | The load-bearing rule. `divisor === undefined` (not `!divisor`); `arg === 0` terminator; `op === 0 ? 0 : op + key`; `this.onote === 0` mutes; `(arg & 1) === 0` tie flag; `(this.loopCount - 1) & 0xff !== 0`. All explicit. | Compliant |
| 5 | DOM / browser security | N/A — build-time Node tooling. | N/A |
| 6 | Node.js specifics | `readFileSync(path, 'latin1')` explicit encoding. New CLI parses against a known flag set and **throws on an unknown flag** rather than ignoring it — a strict improvement. | Compliant |
| 7 | Regex safety | Static literals; `new RegExp(\`^${label}:\`)` builds from a hardcoded label list. No ReDoS. | Compliant |

**Data flow re-traced (the hop that broke):** `SWMUS.MAC .BYTE` → `parseLiteral` (radix-aware) → raw
stream → `fetchNote` (2-byte fetch, sign bit splits note from opcode) → `note + key` → **`NOTTAB[note]`,
now throwing on `undefined`** ← *the hole, closed* → `divisor + fenv*8` → `toEmulatorDivisor` → POKEY
`AUDF` lo/hi → `.wav` → R2 → `startLoop`. Every hop defended except index **0** (M4).

**The bottom line.** The ROM archaeology was already the best in this sprint; the guardrails have now
caught up with it. The one thing I got wrong, I got wrong in the direction of a test that cannot fail —
and Dev caught me. M4 and M5 are the same lesson one notch further out: the rule is "fail loudly", and
it has to hold at the boundary, not just in the middle.

**Handoff:** To Winston Smith (SM) for finish. **⚠ This PR is AI-authored and AI-reviewed — a human
must authorise the merge.**

### Round 1 — REJECTED (preserved)

**Verdict:** REJECTED

**Blocking:** 1 High. Also 3 Medium and 3 Low (non-blocking, but cheap — please take them in the same pass).

The ROM archaeology here is the best I have reviewed in this sprint: the 8.192 ms per-voice clock
(and its independent corroboration from `LIMIT AT 31 (QUARTER SECOND)`), the 1.512 MHz divisor
rescale, the stale-comment catch on `PMBEN`, and a regeneration that is byte-for-byte reproducible.
The *artifact* is right — the music is live and in tune. What I am rejecting is small, and it is the
story's own central rule, broken in the one line that matters.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| **[HIGH]** `[SILENT]` | **A note that falls off `NOTTAB` silently becomes a rest.** `NOTTAB[note] ?? 0` → `onote = 0` → the output path force-mutes it (`:211`). Every *other* out-of-range case in this file throws by name. AC-2: *"it must THROW on encounter, never silently no-op. A silent no-op is how a tune loses a voice and nobody notices."* Transposition is live in shipped data (`towers`/SW4 v1-3 do `CKEY -12` **inside** `LOOP 2`, compounding to −24), so the index is genuinely computed, not constant. Not currently triggered (min effective note 25) — but wholly undefended and untested. Independently flagged by preflight. | `tools/music-bake/pm-player.mjs:140` | Throw on an out-of-range note index, naming the note and the key offset. Add a test: a `.CKEY` that walks a note off the table must throw, not fall silent. |
| [MEDIUM] `[TEST]` | **AC-7's "no second POKEY" guard cannot fail.** `found.filter(p => !/music-bake\|pm-player/.test(p))` excludes the whole `music-bake` directory before counting. **I proved it:** planted `tools/music-bake/vendor/pokey.js`, re-ran the test — it passed. The invariant is unenforced in the only directory where a rival core would be added. | `tools/music-bake/bake-music.test.mjs:33` | Exclude by exact path (`tools/pokey-bake/vendor/pokey.js`), not by directory. Re-plant a rogue file and confirm the test now fails. |
| [MEDIUM] `[TEST]` | **Only 1 of 24 voices has a note-level oracle.** RR1 (trench) is pinned note-for-note; the other 23 are not. `towers`/SW4 is the tune whose mapping the story got **wrong**, and the *only* one exercising transposition, compounding `CKEY` inside a loop, and `NKEY` — i.e. the highest-risk voice in the corpus has the least coverage. | `tools/music-bake/music-data.test.mjs` | Add a hand-transcribed oracle for at least SW4V1 (its `CKEY -12`/`NKEY 0` figure), so the transposition path is pinned to what the 1983 author wrote. |
| [MEDIUM] `[SIMPLE]` | **One test file is 113.9s of a 115.2s suite (99%).** The suite went from ~1s to ~2min. Each track is baked 2–3× across tests, and `loadPokeyClass` re-compiles the 768-line vendored core in a fresh VM on *every* `bakeTrack` call. CLAUDE.md explicitly warns this project has been bitten by CPU-bound tests on slower CI runners (tempest needed a scoped 30s timeout). | `tools/music-bake/bake-music.test.mjs`, `bake-music.mjs:57` | Memoize the bake per `(track, rate, clockCorrect)` and hoist `loadPokeyClass` out of `bakeTrack`. Should cut the file to well under a minute. |
| [LOW] `[DOC]` | `decodeVoice`'s `tempo` / `freqEnvelope` / `ampEnvelope` are documented as *"in effect at the **start**"* but return the **final** values after the whole stream is walked. SW4V1 proves they differ — it starts on `AENV 1` and ends on `AENV 3`. Harmless today (the bake uses `renderVoice`, which evolves state correctly per tick), but the doc is false and the tests only use single-op streams, so nothing catches it. | `pm-player.mjs:13-16, 240-246` | Either capture the values at first note, or fix the comment to say "final". |
| [LOW] | `.LOOP 0` diverges from the ROM. `PKEL` does `DEC VLC / LBEQ` on an 8-bit register, so `0 → 255` = **256 passes**; this implementation exits after 1. Unreachable (shipped counts are 2, 3, 6, 13, 14), but the comment claims ROM fidelity. | `pm-player.mjs:190-193` | Note the divergence in the comment, or reproduce the 8-bit wrap. |
| [LOW] | **CLI silently writes to the wrong directory.** `bake-music.mjs --no-clock-correct <dir>` — the positional `<dir>` is swallowed by the `argv[i-1].startsWith('--')` heuristic (which cannot tell a boolean flag from a value-taking one), and the bake silently lands in the default `out/`. Inherited from `bake-sfx.mjs`. `just deploy-assets` passes the path first, so it is unaffected. | `bake-music.mjs:196` | Parse `--no-clock-correct` as a known boolean, or require `--out`. |

**Data flow traced:** `SWMUS.MAC` `.BYTE` pair → `gen-music-data.mjs` `parseLiteral` (radix-aware:
trailing dot = decimal, else hex) → `music-data.mjs` raw stream → `pm-player` `fetchNote` (2-byte
fetch; high bit splits note from opcode) → `note + key` → **`NOTTAB[note] ?? 0`** ← *the hole* →
`divisor + fenv*8` → `toEmulatorDivisor` (×1776000/1512000 − 7) → POKEY `AUDF` lo/hi on a linked
pair → `.wav` → R2 → `startLoop`. Every hop is defended except one.

**[VERIFIED] AC-1 provenance — evidence:** I re-ran the generator myself; `git diff --stat
tools/music-bake/music-data.mjs` is **empty** — regeneration reproduces the committed file
byte-for-byte (preflight independently got identical SHA-256s across two runs). `gen-music-data.mjs`
reads `SWMUS.MAC`/`SNDPM.MAC` and contains **no** reference to `Music_Tables.asm` or
`Music_Functions.asm`. `MUSIC_SOURCE.sha256` records both sources. This is the first data module in
this repo that is actually reproducible — `speech-data.mjs` credits a generator that was never
committed.

**[VERIFIED] AC-8 live — evidence:** I fetched all four URLs myself: `200 audio/wav` on
`space_theme`, `towers_theme`, `trench_theme`, `imperial_march`.

**[VERIFIED] Rest semantics match the ROM — evidence:** `pm-player.mjs:139` `op === 0 ? 0 : op + this.key`
skips transposition for a rest, matching `BEQ 9$ ;?SOUNDFUL NOTE?(NOT A REST)`; `:211`
`this.vac & 0xf0` mutes it, matching `PKNOFF: LDA #0F0`. Complies with lang-review JS #4 (`0` is
falsy) — checked as `=== 0`, never truthiness.

**[VERIFIED] Volume clamp is bit-exact — evidence:** `:207-208` `if (vol < 0) vol = 0` /
`if (vol >= 0x10) vol = 0x0f` reproduces `BPL 5$ / CLRA` and `CMPA #10 / BLT 6$ / LDA #0F`
(note: `#31.` decimal vs `#10` hex on adjacent lines of the ROM — the radix trap, read correctly).

**[VERIFIED] Loop state matches the ROM's single `VLC` — evidence:** `:186-193` keeps one
`loopCount`/`loopPc` per voice, which is exactly what `PKSL`/`PKEL` do; the ROM has no loop stack and
cannot nest either, and the measured nesting depth is 1. Not a simplification — a match.

**[VERIFIED] No shell injection in the new deploy path — evidence:** `scripts/deploy-r2.mjs:62`
`execFileSync` with array args (no shell); `justfile` `deploy-assets` uses `mktemp -d`, quotes
`"$staging"`, and traps cleanup on EXIT under `set -euo pipefail`.

**Handoff:** Back to Julia (Dev) for the High. The four Mediums/Lows are cheap and I would like them
in the same pass, but only H1 blocks.

## Tea Assessment

**Tests Required:** Yes
**Status:** RED — confirmed. 4 new test files fail; the 1029-test pre-existing suite stays green.

**Test Files** (all under `star-wars/tools/music-bake/`, `.mjs` beside the tool — the house pattern from `tools/pokey-bake`, which keeps Node-flavoured bake tests out of the browser-pure TS suite):

| File | Covers |
|------|--------|
| `music-data.test.mjs` | AC-1 provenance, AC-3 oracle, AC-4 radix, AC-5 mapping, AC-6 segments |
| `pm-player.test.mjs` | AC-2 — the SNDPM.MAC player port: opcodes, envelopes, throw-set, NOTTAB |
| `bake-music.test.mjs` | AC-7 — one POKEY core, four .wav, non-silent, deterministic, seamless |
| `deploy-assets.test.mjs` | AC-8 — an upload path exists (orchestrator-conditional) |

### The ROM evidence (AC-6 demanded this be written down)

Every music cue in the cabinet, from the only 11 `JSR PM*` sites in the 1983 source (all in `WSMAIN.MAC`), cross-checked against `SNDPBX.MAC`'s positional command table:

| Phase | Cue | Entry | The ROM's own words | TUNTAB |
|-------|-----|-------|---------------------|--------|
| space | `$24` | PMTH5 | ";THEME MUSIC" (start of game) | 27-30 |
| space | `$25` | PMTHB | ";THEME B FOLLOWS MAIN THEME" | 35-38 |
| towers | `$20` | PM4TH | ";BATTLE MUSIC IN FOURTHS" (ground towers) | 31-34 |
| towers | `$21` | PMREB | ";FINISH GROUND WITH REBEL" (at `PH.TIM==14`) | 19-22 |
| trench | `$22` | PMRRP | ";THEN DO REBEL REPEAT THEME" | 23-26 |
| vader | `$1D` | PMDAR | ";THEN DO DARTH THEME" (wave≥3 odd) | 43-46 |
| *(not ours)* | `$1B` | PMBEN | ";BEN'S THEME WHEN LOSE GAME WITH NO HIGH SCORE" | 7-10 |

**SEGMENTS decision (AC-6): one flattened loop per phase, manifest unchanged.** The cabinet plays a *sequence* per phase (TH5→THB; 4TH→REB), but our engine's contract (sw3-5) is a single looping track per phase on one channel, with no notion of a timed one-shot follow-on. So each phase is baked as its segments concatenated in the order `WSMAIN` fires them: **no ROM segment is dropped, and `audio.ts` / `main.ts` / the sw3-5 music-channel tests are untouched.** Approved by the user.

### The encoding, recovered and cross-validated

`SWMUS.MAC` is the *assembled* listing — every `.BYTE` carries its macro call as a comment above it, so the file is its own Rosetta stone. Mined mechanically, the encoding self-verified at **1225/1227** note bytes on the first pass:

- **pitch byte = `octave*12 + semitone + 1`; 0 = REST** (`NOTTAB:` opens `.WORD 0 ;REST`). Pitches stay < `0x80`, so the sign bit alone separates note from opcode (`SNDPM.MAC:701 TSTB ;CHECK THE OPCODE`).
- **opcode byte = `0x80 | index into PKDT`** (the dispatch table at `SNDPM.MAC:934`).
- **`.LOOP N` plays its body N times total** — `PKSL` stores N, `PKEL` does `DEC VLC / LBEQ done` (`SNDPM.MAC:1056-1069`). Max nesting in our tunes is 1, and the ROM has one loop register per voice, so it could not nest anyway.

**Scope, measured across all 24 in-scope voice streams** (not assumed):

- Opcodes reached: `NRATE NVOL CVOL NKEY CKEY FENV AENV LOOP ENDL` + `.ENDT`. Never reached: `CRATE CHK RCHK VC PKC SYN CALL GOSUB RETURN` → pinned to **throw**.
- Frequency envelopes: only NUL, OFS. The five instruments (HRN/TRB/BAS/GLK/WW) → pinned to **throw**.
- Amplitude envelopes: SDR, HRD, QKR, TIE.
- `.CVOL` operands are **signed** (−4…+4). `.NRATE` operands are **decimal** (72…152).

### Rule Coverage

| Rule (`gates/lang-review/javascript.md`) | Test(s) | Status |
|---|---|---|
| **#1 silent error swallowing** — the load-bearing rule of this epic | `throws on .CALL/.GOSUB/.RETURN/…` (9), `throws on the unimplemented frequency envelope …` (5) | failing |
| **#4 `0` is falsy** — a rest is note 0 | `does NOT mistake a rest for a terminator`, `leaves a REST a rest, however the key is shifted`, `keeps rests as real events` | failing |
| #1 (data path) — a silent bake is the bug | `bakes %s to real audio, not silence` (4) | failing |

The whole epic exists because `@arcade/shared`'s audio engine degrades silently: four 404ing `.wav` files read as working code for an entire epic. The player must not repeat that — an unhandled opcode that quietly does nothing costs a voice, and a tune missing one of its four voices *still sounds like music*.

**Self-check:** 3 vacuous or self-contradictory assertions found in my own first draft and fixed — (a) a tautology that asserted `NOTTAB[idx] !== 258` where `idx` was found by searching for 600; (b) a "reached opcodes must not throw" case that fed `AENV 0`, which my *other* test permits Dev to throw on; (c) `.CVOL`/`.CKEY` pinned only loosely (`toBeLessThan`), now exact, plus the transposed-rest case added.

### What Dev must build

`tools/music-bake/` — mirroring `tools/pokey-bake`, importing its vendored core (**no second POKEY enters the repo**; the test walks the tree and asserts exactly one `pokey.js`):

- `gen-music-data.mjs` — **committed** generator: reads `SWMUS.MAC`, writes `music-data.mjs`
- `music-data.mjs` — generated: `MUSIC_SOURCE {file, sha256, generator}` + `TRACKS` of raw lifted byte streams
- `pm-player.mjs` — the SNDPM port: `decodeVoice(bytes) → {notes:[{note,duration,volume}], tempo, freqEnvelope, ampEnvelope}` + `NOTTAB`
- `bake-music.mjs` — headless: `bakeTrack(name, {sampleRate})` + the CLI that writes the four `.wav`

The exact contracts are documented in each test file's header.

**⚠ AC-9 is not a green vitest.** With the assets live, entering each phase must ring the right loop in a browser, with sw3-5's single-music-channel invariant holding. No unit test can prove that. Note the local-port trap: a pinned arcade port may be served by a *sibling checkout* (a-2/a-3), so screenshotting `:5274` can verify someone else's code — check the server's cwd with `lsof` first.

**Handoff:** To Julia (Dev) for GREEN.

## Sm Assessment

Setup complete. Story sw6-1 is ready for RED.

**What was verified:**
- Session file, story context (`sprint/context/context-story-sw6-1.md`, all 9 ACs verbatim), and epic context exist.
- Branch `feat/sw6-1-pokey-music-bake` created in star-wars off `origin/develop` (fetched, not the stale local ref).
- No open PRs in star-wars — merge gate clear.
- The design spec named in the story exists: `docs/superpowers/specs/2026-07-13-star-wars-music-bake-design.md`.
- The 1983 source quarry is present at `~/Projects/star-wars-1983-source-text` (SWMUS.MAC, SNDPM.MAC).
- Sprint state committed and pushed to orchestrator `main` (rebased over a sibling checkout's push).

**Routing:** tdd (phased) → TEA (O'Brien) owns the RED phase.

**What TEA should not let slide** (routing notes only — the calls are TEA's, not mine):
- The SEGMENTS criterion demands an *explicit* decision with ROM evidence written into this session: one flattened loop per phase, or extend the MUSIC manifest. The story says "do not quietly pick one." Whichever way it goes, it must be argued here.
- The RADIX TRAP criterion asks for a test that *refutes* the decimal reading, not merely one that asserts the hex reading. This project has been bitten by radix twice (red-baron equates, star-wars WSOBJ `.PH` vertices).
- AC-9 is a live 200 in the browser, not a green vitest. This story is not done on a passing test suite. Note the local-port trap: a pinned arcade port may be served by a *sibling checkout*, so a screenshot can verify someone else's code.

**Jira:** none — this project tracks locally in `sprint/` YAML; `jira_key` is just the story id.