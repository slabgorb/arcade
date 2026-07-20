# Story cp4-2 Context

## Title
Fragmented train — CENTIN connected segments plus loose extra heads from RNGEN

## Metadata
- **Story ID:** cp4-2
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** centipede
- **Epic:** Centipede — game structure (wave progression, bonus lives, the outer loop, high scores, attract)

## Problem
The real difficulty curve, and the harder (rng-sensitive) half of the scope fence. CENTPC (:496-551) lays CENTIN connected segments (head + bodies, :477-524) and then fills the REMAINING slots CENTIN..NCENT-1 with LOOSE INDEPENDENT HEADS (:527-546): DEAD=NCENT is set unconditionally (:549-551), so a 'short' train still puts 12 objects on screen — wave 2 is 11 segments PLUS one free-roaming head, NOT a shorter train (the cp3-4 carry-forward's 'shorter' framing was imprecise; the design doc corrects it). Each loose head costs TWO seeded-rng reads in ROM order: first the DIRECTION sign ('BIT RNGEN / BPL / JSR COMP' :536-540, negative → try other direction) then HPOS ('LDA RNGEN / AND I,0F8' :543-545). MOBJDV for a loose head is 2, or CKFE if cocktail (:531-534 — non-cocktail default 2, cocktail is out of scope, transcribe the default and note the branch). createCentipede() currently hardcodes NCENT=12 connected; this story makes it read centin and place the loose heads. DETERMINISM: draw ONLY from @arcade/shared/rng (seeded by the shell); a determinism test replays an identical wave from a fixed seed and asserts identical loose-head columns/directions; purity guard stays green (no Date.now/Math.random). Closes the fragmentation half of the scope fence at centipede.ts:162-168. NEEDS cp4-1 (speed) landed so the loose heads march at the right CENTIS.

## Technical Approach
_Approach hints to be refined by TEA/Dev. The story title above defines the
intended behavior — the notes below are discovery already done during setup so
TEA doesn't have to re-derive the ASM._

**Sources (read these first):**
- **Design spec (authoritative rationale):** `centipede/docs/superpowers/specs/2026-07-20-centipede-cp4-game-structure-design.md` — the "Constant-source findings" section reads CENTPC in full, including the fragmentation half.
- **ROM ground truth:** `reference/atari-source/centipede/revision.v4/CENTI4.MAC` (repo root, NOT inside `centipede/`), routine `CENTPC` `:456-554`. This is the VENDORED tree — the ONLY numbering `npm test -- citations` accepts. The `~/Projects/centipede-source` copy is off-by-one from line 44 (CRLF + form-feeds); do NOT cite it.
- **Code under change:** `centipede/src/core/centipede.ts` — `createCentipede()` (`:196-210`), the "SCOPE (Delivery Findings, TEA)" comment (`:20-32`) and the "SCOPE FENCE" comment (`:158-168`, both need updating/striking). `centipede/src/core/sim.ts` — the three lay sites: boot `:139`, death respawn `:396`, wave-clear re-lay `:439`.
- **Existing claims:** `centipede/docs/rom-study/claims/09-centipede-train.json` — 97 entries (`CT-1`..`CT-97`); cp4-2's new claims start at **CT-98**. Schema: `{id, claim, source:{file, line, verbatim}, corroboration?}` — `verbatim` is byte-checked against the vendored tree, `.trimEnd()` compared.
- **Next CT already claimed by a sibling story:** `NEWHD_HEAD_PIC = 0x00` (`centipede.ts:501`, CT-80, `:1664 "LDA I,0"` — "plain head, not CENTPC's 0x03") is the EXACT SAME ROM idiom CENTPC's loose-head fill uses (`:531 "LDA I,0" / STA X,MOBJP`). Reuse this constant (or cite CT-80 as corroboration for the new claim) rather than inventing a second "plain head pic" constant — the codebase already named this value once.

**The ROM shape to pin — CENTPC decoded line-by-line (`:456-554`):**

CENTPC always re-lays every one of the `NCENT` (12) motion-object slots on
every call (boot, death respawn, AND wave-clear); the `DEAD` check at
`:458-460` gates ONLY the colour flip and the CENTIN/CENTIS cadence walk
(already built, cp3-4/cp4-1), never the lay itself. TEMP1 holds CENTIN
(`:494-495 "LDA X,CENTIN-1 / STA TEMP1"`) for the rest of the routine.

1. **Head** (`:477-493`): pic `CENT_HEAD_PIC` (0x03), V=`CENT_ENTER_V`
   (0xF8), H=`CENT_ENTER_H` (0x80), `dv`/`dh` from CENTIS (cp4-1, unchanged).
2. **Connected bodies** (`:494-522`, loop `20$`): `CMP I,01 / BEQ 60$` at
   `:496-497` — if CENTIN==1 there are NO bodies, skip straight to loose-head
   fill. Otherwise the loop lays indices `1..TEMP1-1` (i.e. `CENTIN-1`
   bodies), alternating pic `CENT_BODY_PIC`/`CENT_BODY_PIC_ALT` (existing
   `CT-6` behaviour, unchanged) — **so the connected block now lays `CENTIN`
   total segments (1 head + `CENTIN-1` bodies), not always `NCENT`.**
3. **Skip check** (`:523-526`): `LDA X,CENTIN-1 / CMP I,NCENT / BEQ 90$` —
   when CENTIN already equals NCENT (12), the loose-head fill is skipped
   entirely (no RNGEN reads at all — this is the boot-time case, see below).
4. **Loose-head fill** (`:527-548`, loop `70$`, indices `CENTIN..NCENT-1`),
   PER ITERATION:
   - V = `CENT_ENTER_V` (0xF8, same as the connected head — non-cocktail).
   - pic = `0x00` — **NOT `CENT_HEAD_PIC` (0x03)**. Same idiom as `NEWHD_HEAD_PIC`
     (CT-80). This is the easiest thing to get wrong: reusing `CENT_HEAD_PIC`
     for loose heads is a plausible-looking but unfaithful transcription.
   - `dv` = `2`, or `CKFE` if cocktail (`:533-536` — **non-cocktail default is
     2; cocktail is OUT OF SCOPE, transcribe the default and leave a comment
     noting the branch**, per the story description).
   - **Read #1 — direction sign** (`:538-540`, `"BIT RNGEN / BPL 82$ / JSR
     COMP"`): `BIT` tests bit 7 of a FRESH RNGEN read without touching the
     accumulator (which still holds `dv`'s magnitude, 2 or CKFE); `BPL`
     branches (keep positive) when that bit is CLEAR, else `COMP`
     (two's-complement negate) flips it negative. Net: `dh = (rngByte(rng) &
     0x80) === 0 ? +dvMagnitude : -dvMagnitude` — **note the mask is `0x80`
     (bit 7 / sign), NOT `spider.ts`'s `SPIDER_SIDE_BIT = 0x04`** (a
     different routine, different bit — don't copy the wrong sibling
     pattern). `|dh| === |dv|`, same magnitude both axes, unlike the
     connected train where dh/dv both equal CENTIS independently.
   - **Read #2 — HPOS** (`:542-544`, `"LDA RNGEN / AND I,0F8 / STA X,MOBJH"`):
     a SECOND, independent RNGEN read, masked to a multiple of 8 (`0F8` is
     HEX — `.RADIX 16` — column-aligned, same mask idiom as `flea.ts`'s
     `FLEA_H_MASK`). No rejection-sampling loop here (unlike `createFlea`'s
     `do/while` against 0x00) — CENTPC just stores it, min value can be 0.
   - `:545 "LDA X,MOBJV"` — a stray reload with no visible consumer in this
     routine; transcribe-and-ignore (note it in a comment, don't invent
     behaviour for it).
5. **`90$` convergence** (`:549-551`): `DEAD = NCENT` unconditionally,
   whichever path was taken — 12 objects on screen every re-lay regardless of
   CENTIN, exactly as the story/AC-1 states.

**RNG plumbing — this is the part that changes the function's contract, not
just its body.** `createCentipede` is currently documented as "pure and
seed-free" (`:20-23`, `:181-182`) — that claim becomes FALSE the moment CENTIN
< NCENT. It needs an `Rng` parameter (mutating `rng.seed`, same contract as
`createSpider(rng, score, opts)` / `createFlea(rng, score)` — see
`spider.ts:196`, `flea.ts:161`, and the shared `rngByte = (rng: Rng) =>
nextInt(rng, 0x100)` helper already duplicated in both those files; a third
copy in `centipede.ts` continues that pattern rather than importing across
core modules — see the existing note at `spider.ts:143-146` on why
`isSpiderWalking` is deliberately NOT imported into `centipede.ts`, same
import-cycle reasoning applies here). Suggested signature: `createCentipede(rng:
Rng, centis: number = CENTIS_INIT, frame: number = 0, centin: number =
NCENT)` — `centin` defaults to `NCENT` so a call site that doesn't pass it
gets today's behaviour (full connected train, zero RNGEN reads, matching CT-97's
boot value) — same "optional params with ROM-boot defaults" convention cp4-1
established. TEA/Dev should confirm the exact param order and name during RED
design; whichever is chosen, **every existing call site AND every existing
test that calls `createCentipede` positionally must be updated** (grep the 5
files listed under "Repo facts" below).

**CRITICAL ordering hazard — read before writing the RED suite.** `sim.ts`'s
own file-header comment (`:11-16`) already warns: "That cursor now has THREE
consumers, so the ordering between them is part of the replay contract...
Adding or reordering a draw shifts every later one." `createCentipede`
becomes the FOURTH. At the **death-respawn** site (`sim.ts:387-418`), the
return object currently lists `segs: createCentipede(...)` at `:396`, BEFORE
`spider: createSpider(state.rng, score)` (`:408`) and `flea: createFlea(state.rng,
score)` (`:411`). JS evaluates object-literal values in SOURCE order, so today
that ordering is harmless only because `createCentipede` draws nothing. Per the
ROM's own flow (`sim.ts:423-429`'s comment: death reaches `:732 "85$: JSR
BUGOFF"` → ANTPC → falls into `90$`/CENTPC), **the ROM's real draw order on a
death is spider, THEN flea, THEN the centipede's loose heads** — so once
`createCentipede` draws entropy, **the `segs:` property must move BELOW `spider:`
and `flea:` in that object literal**, or the sim will draw centipede entropy
before spider/flea and silently diverge from the ROM (and from its own
existing spider/flea determinism tests, which may need re-baselining if this
is gotten wrong — a death that happens on a wave where `centin < NCENT` is the
only case that exercises it; a death on wave 1, where `centin === NCENT`,
draws zero entropy and can't catch the bug). The **wave-clear re-lay**
(`sim.ts:433-446`) has no other rng consumer in that branch, so ordering there
is a non-issue. **Boot** (`sim.ts:139` vs `:149-150`) is also safe by
construction: `CENTIN_INIT === NCENT`, so the boot lay draws zero entropy
regardless of where `segs:` sits in the object literal — but that safety
depends on the invariant `centin === NCENT` at boot; TEA may want a test that
pins "boot draws zero RNGEN reads for the loose-head fill" explicitly rather
than relying on it silently.

**Stale comments to strike/update (beyond the story's cited `:162-168`):**
`centipede.ts:20-32`'s "SCOPE (Delivery Findings, TEA)" block explicitly
says "createCentipede is a pure, seed-free function (the RNGEN reads at
CENTI4.MAC:538-544 are the extra-centipede placement for CENTIN<12... out of
scope)" — that sentence becomes false once cp4-2 lands and needs updating in
the same commit, not just the `:162-168` fence the story names.

**Boundary reminders:** pure `src/core`, seeded-rng only (no `Date.now` /
`Math.random` — the purity guard scans source text INCLUDING comments, so
don't even name the forbidden globals in a comment). Every transcribed
constant needs a radix-cited comment (`0F8`, `0x80` are HEX; `NCENT=12.` and
`CENTIN_RELOAD`'s twelve are the RADIX trap precedent already logged in this
module) + a claims entry (CT-98+). Citations cite the vendored tree only.

## Scope
- In scope: `createCentipede()` reading `centin` and placing loose independent
  heads via two seeded RNGEN reads each, threaded at all three `sim.ts` lay
  sites (boot, death respawn, wave-clear re-lay) with correct rng-cursor
  ordering at the death-respawn site; striking/updating both scope-fence
  comments (`:20-32` and `:158-168`); new CT-98+ claims; src/core only.
- Out of scope: cocktail mode (`CKFE` branch — transcribe the default 2 and
  comment the branch, don't implement it); colour cycling (cp4-3); bonus
  lives / game loop / high scores / attract (cp4-4..cp4-7); any shell/render
  change (a loose head's `pic=0x00` vs a connected head's `pic=0x03` may or
  may not read identically through the sprite atlas — that's a render
  question for a future story if it turns out to matter, not this one).

## For TEA — RED suite design pointers
- **Unit-level, pure `createCentipede`:** given a fixed seed, `centin < NCENT`
  lays exactly `centin` connected segments (head + `centin-1` bodies, existing
  alternating-pic behaviour unchanged) then `NCENT - centin` loose heads, each
  with `pic === 0x00`, `v === CENT_ENTER_V`, `|dh| === |dv| === 2` (or CKFE,
  untested/out of scope), and `h`/sign drawn from the two RNGEN reads in ROM
  order (sign first, HPOS second) — assert against a hand-computed sequence
  from `nextInt(rng, 0x100)` calls in that order, the same way `spider.test.ts`
  /`flea.test.ts` presumably pin `createSpider`/`createFlea`'s draws (check
  those test files for the established assertion idiom before inventing a new
  one).
- **`centin === NCENT` (boot value):** zero loose heads, zero RNGEN reads —
  assert the rng cursor is UNCHANGED (`rng.seed` before/after) as a direct
  pin, not just "12 segments come out looking right".
- **`centin === 1` edge case** (`:496-497 BEQ 60$`): one connected head, then
  `NCENT - 1` loose heads — the body loop must be provably skipped, not just
  short.
- **Determinism (AC-2):** same seed + same centin → byte-identical loose-head
  columns AND directions across two independent calls; a different seed
  produces a different-but-still-deterministic field (replay it twice from
  that second seed too, not just eyeball one run).
- **Integration (AC-3):** drive a REAL wave clear to `centin === 11` (reuse
  cp3-4/cp4-1's cadence-driving test idiom — `stepWaveCadence` from
  `centis>=3` reaches `centin=11` on the very first clear) and assert exactly
  one loose head + an 11-segment connected train, all alive
  (`!isVacant(pic)`), all marching at the wave's `centis` (both dv magnitude
  AND the loose head's independent `|dh|===|dv|` rule — don't conflate the
  connected train's `dh=±centis` with the loose head's `dh=±2`).
- **Ordering regression (the hazard above):** a test that kills the player on
  a wave where `centin < NCENT` and asserts the resulting spider/flea state
  matches what you'd get from manually drawing spider-then-flea-then-loose-heads
  in that order from a fresh `createRng(seed)` — this is the test that catches
  a `segs:`-before-`spider:`/`flea:` object-literal ordering mistake; a death
  on wave 1 (`centin===NCENT`) CANNOT catch it, the test must force a death
  after at least one wave clear.
- **Purity guard:** no new `Date.now`/`Math.random` (or the bare words, even
  in comments) in `centipede.ts`/`sim.ts`.
- **Citations:** every new constant/behaviour needs a `CT-98`+ entry in
  `docs/rom-study/claims/09-centipede-train.json` with a byte-verified
  `verbatim` against `reference/atari-source/centipede/revision.v4/CENTI4.MAC`;
  run `npm test -- citations` before calling RED done.

## Acceptance Criteria
- createCentipede() lays CENTIN connected segments then fills slots CENTIN..NCENT-1 with loose independent heads, each placed by two seeded RNGEN reads in ROM order (direction sign :536-540, then HPOS = RNGEN AND 0F8 :543-545); DEAD=NCENT (12 objects on screen regardless of CENTIN); radix-cited comments + claims entries; citations green.
- A determinism test replays an identical wave from a fixed seed and asserts byte-identical loose-head columns and directions; a second seed produces a different-but-deterministic field; purity guard green.
- An integration test drives a real wave clear to centin=11 and observes exactly one loose head plus an 11-segment connected train, all alive, all marching at the wave's CENTIS.
- The scope-fence comment at centipede.ts:162-168 is struck (both halves now closed) or updated to reflect what genuinely remains; full suite green from baseline; build + lint clean.

---
_Generated by `pf context create story cp4-2` from the sprint YAML._
