# Open questions

Unresolved facts from the 2026-07-18 source study. Resolve and cite — never
silently pick.

1. **Exact VSYNC divisor: 262 or 263?** Even MAME hedges — "`VSYNC = HSYNC/263
   ?? = 59.88593 Hz (not sure, could be /262)`" (`centiped.cpp:25`) — while its
   machine config rounds to `set_refresh_hz(60)` (`centiped.cpp:1798`). The sim
   needs one number; pick, document, and keep it a named constant so a later
   correction is one line.

2. **Rev 4's graphics/sync ground truth is rev 2's artifacts.** Rev 4 cut only
   program EPROMs (`CENTI.DOC:214`); MAME pairs `136001-407..410` with rev-2's
   `136001-211/212` + `-213` (`centiped.cpp:2029`). There is no rev-4
   `CENPIC`/`SYNC` source — never cite a hypothetical one.

3. **Rev 3's sync PROM is documented but not vendored.** The ledger lists
   `136001-313` in the rev-3 parts table (`CENTI.DOC:149`) and as `SYNC3.ROM`
   (`CENTI.DOC:174`), but the tree has no `SYNC3.MAC`
   and no `136001.313` binary — only rev-1 `SYNC.MAC`/`136001.113` and rev-2
   `SYNC2.MAC`/`136001.213`. Irrelevant while we target rev 4 (which shipped
   rev-2's PROM), but do not go looking for it.

4. **`CENTIP.DOC` documents rev 1.** Ed Logg's design doc predates revs 2–4
   (5/13/81 vs 9/23/81). Diff any constant taken from its prose (bonus
   thresholds, difficulty ramps, timer options) against the rev-4 code before
   baking it into the sim. Rev 4's ledger block explicitly says
   `DOCUMENTATION FILE:NONE` (`CENTI.DOC:210`).

5. **The citation checker is not built yet.** This dossier was verified by hand
   in the study session (every line re-opened; two agent-run drifts corrected
   before commit). The first implementation story should port the audit
   checker shape (`tempest/tools/audit/` with the `ours` side dropped) and move
   these claims into `claims/*.json` so CI re-verifies them against the vendored
   tree forever.

6. **cp1-4 — CENTIP.DOC (rev-1) vs rev-4 code, diffed for the playfield/mushroom
   model (AC-2).** Three prose claims were checked against rev-4 code; two
   agree, one comment inside the code itself is wrong:
   - **RESTOR cadence — code wins over the code's OWN comment.** CENTI4.MAC:1832's
     comment reads `;EVERY 16 FRAMES`, but the instruction it annotates
     (CENTI4.MAC:1831, `AND I,07`) masks to 3 bits — the sweep only does work
     when `frame & 7 == 0`, i.e. active every 8 frames, not 16. `AND I,07` =>
     every 8 frames wins; the comment is stale. (Claim PM-23.)
   - **Mushroom scoring — CENTIP.DOC agrees with rev-4, no correction needed.**
     CENTIP.DOC:111-112 says destroying a mushroom scores 1 and restoring a
     partial/poisoned mushroom (after death) scores 5. Diffed against rev-4
     (CENTI4.MAC:2161 `LDA I,01`; CENTI4.MAC:1856 `LDA I,5`) — they AGREE.
     Baked as `SCORE_DESTROY = 1` / `SCORE_RESTORE = 5`. (Claims PM-20/26/32/33.)
   - **Reserved rows — CENTIP.DOC understates rev-4.** CENTIP.DOC:142's "no
     mushrooms on the bottom line" (singular) undercounts what rev-4 actually
     reserves: the seeding column-walk floor (0x02) keeps BOTH bottom rows
     (v=0, v=1) clear, and MUSHER separately refuses the top score row
     (v=0x1F) and the player's own row (v=1). Code wins. (Claims PM-12/27/28/34.)
   See `docs/rom-study/claims/06-playfield-mushrooms.json` for the byte-cited
   source of each claim above.

7. **cp2-4 — CENTIP.DOC (rev-1) vs rev-4 code, diffed for head/body SEGMENT
   scoring (open question 4, AC-2).** The rev-1 prose and the rev-4 code AGREE —
   no correction needed, mirroring the cp1-4 mushroom-scoring finding:
   - **Centipede body = 10 points.** CENTIP.DOC:113 (`3)Centipede body = 10`)
     matches rev-4 CENTI4.MAC:2270 (`LDY I,10 ;BODY=10 POINT` — a BCD 0x10
     digit-pair added under SED at CENTI4.MAC:1951, rendering decimal 10).
     Baked as `SCORE_BODY = 10`. (Claim CT-35, corroborated by CT-37.)
   - **Centipede head = 100 points.** CENTIP.DOC:114 (`4)Centipede head = 100`)
     matches rev-4 CENTI4.MAC:2274-2275 (`LDY I,0 ;HEAD=100 POINTS` + `INC TEMP1`
     → BCD 0x0100). Baked as `SCORE_HEAD = 100`. (Claim CT-36.)
   The shot-vs-segment collision itself is the SHOOT loop (CENTI4.MAC:2171-2303),
   NOT OVRLAP (CENTI4.MAC:1746, the inter-segment overlap check called only from
   CENTPC:411 and MOTION:1371); and the shot-kill train SPLIT (the segment behind
   the kill promoted to a new head, CT-39/40 at :2282-2283) is distinct from
   NEWHD (:1647), which spawns brand-new heads entering from the top edge. See
   `docs/rom-study/claims/09-centipede-train.json` (CT-32..CT-48) for the
   byte-cited source of each claim above.

8. **cp3-1 — CENTIP.DOC (rev-1) vs rev-4 code, diffed for the SPIDER (open
   question 4, AC-1/AC-4).** One prose claim is confirmed, one is misleading,
   and one comment inside the code is misplaced:
   - **Proximity scoring 300/600/900 — CENTIP.DOC AGREES with rev-4.**
     CENTIP.DOC:117's prose matches rev-4 exactly: a spider kill scores 300, 600
     or 900 by distance. What the prose never gave is the BAND EDGES, now
     recovered from `CENTI4.MAC:2243/2247` — distance `>= 0x40` scores 300,
     `< 0x16` scores 900, and the span between them scores 600, where the
     distance is `|BUGV - PLAYV|` (`:2239-2242`). (Claims SP-18/19.)
   - **"The spider hugs the bottom from 60,000 points" — MISLEADING; code
     wins.** CENTIP.DOC:201-202 names 60,000, and 60,000 *is* the BCD datum
     (`:384 SBC I,6`). But the biased score is then HALVED by a binary `LSR`
     (`:388`) before it scales the ceiling, so the ceiling does not actually
     move at 60,000: the first real step down is at **80,000**, after which it
     falls 8 pixels per 20,000 points and clamps 5 steps down (to 0x38) from
     **160,000** (`:389-391`). The prose marks where the arithmetic begins, not
     where the spider first drops. Baked as `spiderTopLimit`. (Claim SP-9.)
   - **A faithful BCD quirk at 860,000.** `SCORE2 = 0x86` minus 6 in BCD is
     `0x80`, whose bit 7 is set, so the `BPL` fails and the ceiling RESETS to
     its base for that decade. The ROM's own comment at `:386` records it —
     `;IF SCORE >=60K OR >=860K`. Reproduced on purpose, pinned by test.
   - **A misplaced comment — the branch wins over its own annotation.**
     `CENTI4.MAC:262` reads `BCC 10$ ;IF SCORE < 1000,USE SLOW SPIDER`, but the
     `BCC` is taken when the threshold is *below* SCORE1, i.e. for the FAST
     spider; the comment describes the fall-through. Transcribed from the
     branch. This is the same class as PM-23's stale RESTOR-cadence comment.
     (Claim SP-2.)
   Two dossier gaps this story closed: cp1-3's picture naming table never named
   the three points sprites (`THREE` 0x1B0, `SIX` 0x1C0, `NINE` 0x5B0 —
   `revision.v2/CENPIC.MAC:47/48/146`), and their picture codes 0xB6/0xB7/0xB8
   decode in the ROM's own sprite order, so `INC PTS` walks **300 → 900 → 600**
   rather than ascending (claims SP-19/22). See
   `docs/rom-study/claims/10-spider.json` (SP-1..SP-22) for the byte-cited
   source of every claim above.

9. **cp3-2 — CENTIP.DOC (rev-1) vs rev-4 code, diffed for the FLEA (open
   question 4, AC-1/AC-3).** The prose claim is confirmed outright; the
   divergences this story found are between the code and its OWN comments, and
   between the code and the folklore:
   - **"Flea 200 points" — CENTIP.DOC AGREES with rev-4.** `CENTIP.DOC:115`'s
     prose is exactly what the code does: `CENTI4.MAC:2219 LDY I,2 ;200 POINTS
     FOR ANT`, reaching `SCORN1` as the BCD MSB at `:2296-2298`. No divergence
     to record for this creature. (Claim FL-16.)
   - **"Two hits, and it speeds up after the first" — the FOLKLORE IS TRUE.**
     Confirmed in rev-4, and the mechanism is tidier than the folklore: there is
     no hit counter at all. `ANTDV` doubles as the flag — `:2220-2222 LDA I,4 /
     CMP ANTDV / BEQ` explodes a flea already at speed 4, and `:2223 STA ANTDV
     ;SPEED UP ON FIRST HIT` promotes one that is not. The first hit consumes
     the shot and scores nothing (`:2224 BNE 108$`, which lands on `RSHOT`
     without passing `SCORN1`). (Claims FL-17/18.)
   - **The hitbox WIDENS for a hit flea — and it keys on speed, not score.**
     `:2194-2199` selects a vertical window of 7 instead of 5 when `ANTDV >= 4`,
     commented `;SHOT GOES UP 6, FAST ANT DOWN 4` — an anti-tunnelling
     widening. ANTPC's 60,000-point speed is **3**, still below that gate, so a
     fresh high-score flea keeps the NARROW window. "Fast" here means "has been
     hit", not "the score is high". (Claims FL-3/14.)
   - **A comment overstates its own picture range — code wins.** `:89 ORA I,1C`
     is commented `;FROM 1C TO 1F`, but the picture advances by **two** per
     change: `:84 INC ANTP` bumps the byte in memory and `:85-87 LDA ANTP / CLC
     / ADC I,01` adds one again to the value read back. From ANTPC's `0x1C` the
     cycle is `0x1C → 0x1E → 0x1C`, so **pictures 0x1D and 0x1F are never
     shown**. The comment describes the ORA mask's range, not the reachable set.
     Transcribed as the code behaves; same class as PM-23's stale RESTOR-cadence
     comment and SP-2's misplaced branch comment. (Claim FL-9.)
   - **Two `12`s eleven lines apart mean 12 and 18.** `:65 CMP I,12.` is
     DECIMAL (the CENTIN spawn gate); `:72 CMP I,12` is HEX 0x12 = 18 (the
     120,000-point score band). Under `.RADIX 16` the trailing period is the
     only thing separating them. (Claims FL-5/6.)
   - **The flea's threshold halves a BCD byte in BINARY**, exactly as the
     spider's ceiling does (`:74-77 LSR / CLC / ADC I,6`). At `SCORE2 = 0x19`
     (190,000) it yields `0x0C + 6 = 18`, where halving the decimal 19 would
     give 15. (Claim FL-6.)
   One structural fact this story pinned for cp3-3: **slot 12 hosts the flea AND
   the scorpion** (`SCORP: LDA ANTP`, `:2001`), told apart only by picture band —
   flea `0x1C-0x1F`, scorpion `0x30-0x33`. A killed flea's only route back to
   life is SCORP's `:2072-2075` branch (`JMP ANTPC ;RESET ENTRY TO ALLOW ANTS`),
   since EXPLOD's revival tail at `:972` is guarded by `CPX I,13.` and belongs to
   the spider. See `docs/rom-study/claims/11-flea.json` (FL-1..FL-23) for the
   byte-cited source of every claim above.

10. **cp3-4 — how a creature ships invisible, and what the ROM says about "off
    screen".** cp3-2's transcription was correct and its tests passed, and the
    flea still could not be seen or met in the actual game. Two integration
    links, neither of them a fidelity question, were simply never made. Recorded
    here because the failure mode is a dossier-level lesson, not a flea one: **a
    byte-perfect core proves nothing about whether the creature reaches the
    player.** Both gaps were invisible to the citation gate, to the purity guard
    and to a 21-mutation battery, because all three only interrogate code that
    is actually wired.
    - **"Not on screen" is a POSITION for the flea, a PICTURE for the spider.**
      The asymmetry that makes slot 12 unlike slot 13 — worth knowing before
      cp3-3 renders the scorpion into that same slot. A parked spider holds
      `0xF8`, the "no motion object" picture code. A parked flea holds `0x1C` —
      a perfectly **live** picture — at `ANTV = 0xF8`. So a renderer that gates
      slot 12 on the picture band paints a permanent flea across the HUD row.
      The ROM states the right predicate twice in its own words: `:59-62 LDA
      ANTV / EOR CKF8 / CMP I,0F8 / BCC 5$ ;IF ON SCREEN, KEEP MOVING`, and
      `:125 40$: JSR ANTPC ;REMOVE ANT FROM SCREEN` naming the parked state
      outright. MAME corroborates that nothing in hardware hides it:
      `centiped_v.cpp` draws all 16 motion-object slots every frame with no VPOS
      test, clipping only horizontally. (Claim FL-23.)
    - **The spawn gate needs a driver, and the ROM has one — no debug hook
      required.** `CENTIN` sat welded at its boot 12 for the whole game, so
      ANTMV's `;NO ANTS EARLY IN GAME` branch refused every launch. The epic's
      wave-gating ruling had anticipated parameterizing this and forcing spawns
      by debug seeding; that is **superseded for the flea**, because `CENTIN`'s
      real driver turns out not to need wave progression at all. It is a
      two-counter cadence: SHOOT's wave-clear tail bumps `CENTIS` (`:2317`, the
      same `50$` that sets `DELAY`), and the next wave's `CENTPC` — gated on
      all-dead at `:459-460`, so the wave-clear re-lay and **never** the death
      re-lay — decrements `CENTIN` when `CENTIS >= 3` (`:465-467`), reloads
      `0x0C` at zero (`:468-470`), and resets `CENTIS` to 2 at/after 40,000 or 1
      below (`:471-476`). The cadence that falls out: **`CENTIN` reaches 11 on
      wave 2**, then every second wave below 40,000 and every wave above it.
      (Claims CT-92..CT-96.)
    - **A third `12`, and this one is hex.** Joining the pair in question 9:
      `CENTPC`'s reload `:469 LDA I,0C` is HEX `0x0C`, which also equals twelve.
      Within one screen the value twelve is written three ways — `12.` decimal
      at `:65` and `:1167`, `0C` hex at `:469` — while `12` *without* the period
      at `:72` is eighteen. (Claim CT-94.)
    - **Still parameterized, deliberately.** `createCentipede()` lays a full
      `NCENT` train regardless of `CENTIN`. `CENTPC` also uses `CENTIN` as the
      lay length — a short train plus one loose `RNGEN`-placed head per vacated
      slot (`:527-548`) — and `CENTIS` as the train's per-frame speed
      (`:479-480`). Both are wave-progression work and remain **cp4's**. The
      counters now hold what the ROM would hold; cp4 makes the train read them.
    - **cp4-1 UPDATE — the speed half is now wired, and the wave pace
      OSCILLATES (it does not ramp).** `createCentipede(centis, frame)` consumes
      `CENTIS` as the per-frame step on both axes (`:479-485`, CT-10), so the
      train finally changes pace between waves. The surprise worth recording:
      below 40,000 the pace is **2, 1, 2, 1, …**, so **wave 2 is SLOWER than
      wave 1**, not faster. Trace: boot `CENTIS=2`; a wave clear does SHOOT's
      `INC CENTIS` (`:2317` → 3); the next re-lay's `CENTPC` sees `CENTIS>=3`,
      decrements `CENTIN`, and resets `CENTIS` to **1** below 40,000 (`:471-476`,
      CT-95). `CENTIN` (length) therefore drops every OTHER wave, and `CENTIS`
      alternates. Above 40,000 `CENTIS` resets to 2 instead, so it stays fast and
      `CENTIN` shrinks every wave. This answers the user's 2026-07-20 "every wave
      same pace" playtest: the faithful behaviour ALTERNATES pace, it does not
      accelerate — pin the ROM, not the folk intuition. The LENGTH /
      fragmentation half of `CENTPC` (short train + loose `RNGEN` heads) remains
      **cp4-2**. NEWHD's fresh head keeps a separate hardcoded `MOBJDV=2` ("NEW
      BUG GOES FAST", `:1672`), never `CENTIS`.

11. **cp4-5 — the outer game loop, and two deliberate divergences.** The whole
    cabinet runs on one signed flag, `MODE`: negative is ATTRACT (INIT leaves it
    -1 at power-on), non-negative is a live game. START1 begins one — `:833 LDA
    START1 / :835 LSR / :836 BCS ;IF 1 PLAYER GAME NOT STARTED` — by seeding
    `LIVES` from `NLIVES` (`:849-851`), running `INC MODE ;NOW IN PLAY MODE`
    (`:852`), and calling `INIT` (`:866`, "INITIALIZE EVERYTHING" `:1163`). The
    last life lost drops back: `:624-626 LDA LIVES / ORA LIVES+1 / BNE ;IF GAME
    NOT OVER` falls through when both bytes are zero to `:627 DEC MODE ;MODE=-1
    FOR ATTRACT`. The clone models this as an explicit `SimState.phase`
    (`attract | playing | gameover`), with `gameOver` kept as a maintained
    mirror of `phase === 'gameover'`. Claims GL-1..GL-10. Two rulings recorded
    for a future options/UX story:
    - **DIP options stay unmodelled — hardcode the ROM default.** `NLIVES` is a
      `OPTNS`-selected 2–5 (the epic's cross-cutting ruling). The clone keeps the
      factory `STARTING_LIVES = 3` and does not read a DIP; a future options
      story parameterizes it. (Same treatment as cp3's wave-gating and cp4-1's
      speed constants.)
    - **The start button is a keyboard UX port, not a transcription.** The
      cabinet has a physical START1 button and a coin economy; a browser clone
      has neither. `START1` is ported to the **Enter** key (the "start / insert"
      convention), read as `InputCounts.start`, with **no coin/credit gate** —
      the one legitimate divergence for the start control, mirroring cp4-6's
      trackball-initials UX port. The self-playing ATTRT demo and the "GAME OVER"
      banner remain **cp4-7**; the score-save on game-over remains **cp4-6**.
      cp4-5 only makes the states real and reachable, and the INIT/RESET reseed
      deterministic (the ROM seeds mushrooms from the RNGEN POKEY `:1223-1230` —
      the clone substitutes the carried seeded rng to stay pure and replayable).

12. **cp3-3 — CENTIP.DOC (rev-1) vs rev-4 code, diffed for the SCORPION (open
    question 4, AC-1/AC-3).** The prose claim is confirmed outright, and the
    transcription turns on a doubled radix trap:
    - **"Scorpion 1000 points" — CENTIP.DOC AGREES with rev-4.** `CENTIP.DOC:116`'s
      prose matches the code: `CENTI4.MAC:2228 LDY I,10 ;1000 FOR SCORPION` loads
      the `SCORN1` high byte as HEX `0x10`, which the BCD score routine reads as
      the digits 1,0 → **1000**. No divergence to record for this creature.
      (Claim SC-15.)
    - **Two `10`s two lines apart mean 10 and 1000.** `:2226 CPY I,10.` is
      DECIMAL (the shot's horizontal window — a hit needs `|dH| < 10`), while
      `:2228 LDY I,10` is HEX `0x10` (the 1000-point BCD score). Under `.RADIX 16`
      the trailing period is the only thing separating them; reading the window as
      hex would make the scorpion hittable from 16 pixels, and reading the score
      as decimal would pay 16 points. (Claims SC-14/15.)
    - **One hit, not two.** Unlike the flea, the scorpion has no speed-up-then-
      explode path: `:2226-2229 131$: CPY I,10. / BCS 132$ / LDY I,10 / 129$ JMP
      18$` goes straight to the explosion. Its vertical window is the generic 5
      (`:2202 CPY I,5`), reached because a scorpion's picture `>= 0x20` skips the
      flea's speed-dependent window at `:2192`. (Claims SC-13/14.)
    - **The CENTIN gate is DECIMAL 11 — one lower than the flea's 12.** `:2019 CMP
      I,11.` carries the trailing period; a hex misreading (0x11 = 17) would admit
      scorpions seven waves early. (Claim SC-3.)
    - **The picture cycle is a GENUINE +1, unlike the flea's +2.** `:2080-2085 LDA
      ANTP / CLC / ADC I,01 / AND I,03 / ORA I,30` adds one with no prior memory
      `INC`, so all four SCORP pictures `0x30-0x33` are reachable — where the
      flea's `INC`-then-`ADC` only ever shows two of its four. (Claim SC-11.)
    - **The scorpion CANNOT harm the player — and not for the reason one assumes.**
      The gun sits in the bottom zone and the scorpion crosses the upper half, but
      the real reason is architectural: the ONLY slot-12 `JSR PLAY` is inside
      `ANTMV` (`:107-108`), which a scorpion never reaches (`ANTMV` returns for any
      picture `>= 0x20`, `:53-56`). `SCORP` itself never calls `PLAY`. So the clone
      correctly excludes the scorpion from `checkPlayerContact` by picture band
      (`:539`), not by distance — transcribed, not assumed. (Claim SC-1.)
    See `docs/rom-study/claims/13-scorpion.json` (SC-1..SC-16) for the byte-cited
    source of every claim above.

13. **cp4-4 — the bonus life, and the two DIP switches behind it that this clone
    does not model.** The mechanism itself is fully transcribed (claims BL-1..BL-21,
    `docs/rom-study/claims/14-bonus-lives.json`); what is deliberately left on the
    machine is the operator's half of it.
    - **The increment is DIP-selected, and the clone hardcodes the default.**
      `BONUS1` reads `OPTNS` bits D4-D5 (`:240 AND I,30 ;D4-D5=BONUS LEVEL
      OPTIONS`) and indexes `BONUSV` (`:248 .WORD 100,120,150,200 ;*100 PER BONUS
      LIFE`) — 10,000 / 12,000 / 15,000 / 20,000 points. Per the epic's
      cross-cutting ruling the DIPs are not modelled: `src/core/bonus.ts` exports
      the whole `BONUSV` table, hardcodes `BONUS_INCREMENT = BONUSV[0]`, and
      parameterises `awardBonus`'s `increment` so a future options screen has
      somewhere to plug in. (Claims BL-1/BL-2/BL-3.)
    - **The radix trap that makes the table read correctly.** Those four words are
      HEX under `.RADIX 16` — 0x0100/0x0120/0x0150/0x0200 — and the hardware adds
      them in decimal mode (`:1975 SED`), so it reads their digit pairs literally.
      Written as decimal literals instead, `120.` would assemble to 0x78, whose BCD
      reading is 78 → 7,800, and no DIP option would match the documented ones.
    - **`OPTSW2`'s timed-play branch is out of scope.** `:1983-1985 LDA OPTSW2 /
      AND I,1C / BEQ 18$ ;IF UNLIMITED TIME` selects between free play and a timed
      game; in the timed case `:1986-1988` withholds the award once the clock has
      run out. The clone transcribes the unlimited-time default only — the award
      always proceeds — and models no game timer at all. (Claim BL-11.)
    - **The ceiling is six SPARE lives, which is SEVEN in the clone's units.**
      `:1990 CMP I,6` tests `LIVES`, and `LIVES` excludes the gun being played
      (`:851 STX LIVES ;NUMBER OF LIVES-1 (WE ARE PLAYING WITH ONE)`, claim BL-17;
      `DLIVES` draws at most six icons, BL-18). `SimState.lives` counts the gun in
      play as well, so `LIVES_CEILING = ROM_LIVES_MAX + 1 = 7`. The story's AC said
      "6"; the source says otherwise, and the source wins. Related: the HUD
      (`src/shell/render.ts`) still draws `min(lives, 6)` icons, one more than
      `DLIVES` does below the cap — an open divergence for a later fidelity story.
    - **Refused is not skipped.** The threshold advances at `:1975-1981`, BEFORE
      the ceiling is tested at `:1989-1991`, so a bonus the ceiling refuses still
      moves the level. And `:1992 10$: BCS 10$ ;OOPS-RESET` hangs the program into
      a watchdog reset if `LIVES` is ever found above six — the ROM's own statement
      that six is an invariant, not a clamp. (Claims BL-13/BL-14.)
    - **What the bonus routine is NOT.** `:1959-1962` fires on the same
      10,000-point carry but decrements `COUNT3` to "INCREASE FREQUENCY OF NEW
      HEADS" — a separate difficulty dial, still unmodelled (the clone's `count3`
      only ramps inside `NEWHD`). Filed here rather than folded into the award.
      (Claims BL-19/BL-20.)
    - **Deferred:** the bonus-life sound `:1994-1995 LDA I,17. / STA CHAN4 ;BONUS
      LIFE SOUND` belongs to the cp5 audio epic and is noted, not stubbed
      (claim BL-16). SCORNG also refuses to score at all in attract mode
      (`:1948-1949 LDY MODE / BMI ;IF IN ATTRACT`) — unreachable today because
      `stepSim` holds without stepping in `attract`, but cp4-7's self-playing demo
      will have to gate scoring on `phase`.

14. **cp4-6 — the high-score write path, and the three places the clone parts
    company with the cabinet.** The board, the qualify verdict and the initials
    buffer became core state this story; the divergences below are deliberate
    and were all read out of `GETINT` (`:1001`) and `UPDATE` (`:2534`) rather
    than assumed. Claims HS-1..HS-15.
    - **The input model is a UX PORT, and it is the one the epic sanctioned.**
      In silicon the picker scrolls a single letter with the horizontal
      trackball every 8th frame (`:1130-1138`, claim HS-9 `:1135 "LDY TB ;GET
      HORIZONTAL TRACKBALL READINGS"`) and commits it with FIRE through a
      5-frame debounce (`:1067-1071`, claim HS-4 `";2 FRAMES OFF 3 FRAMES
      ON"`). A keyboard clone types the letter directly. What is NOT bespoke is
      the buffer arithmetic: that is the cabinet-wide shared verb
      `stepNameEntry` (`@arcade/shared/name-entry`), already used by tempest,
      asteroids, star-wars and battlezone. Only the presentation is ours. What
      the port still honours: three slots (`:1074 "CMP I,03"`, HS-5), and the
      qualify/insert decisions UPDATE makes (`:2574`, HS-12).
    - **The board is 8 deep in the ROM and 10 in the shared library.**
      `CENDE4.MAC:120 "NSCORE =8 ;NUMBER OF HIGH SCORE ENTRIES"` (HS-15),
      walked three bytes per entry at `:2578 "CPY I,3*NSCORE"` (HS-13). But
      `@arcade/shared/highscore` hardcodes `MAX_HIGH_SCORES = 10` and documents
      it as a single source of truth "no game redeclares", and AC-1 names that
      shared write path as the contract — so the clone accepts two placings the
      cabinet would refuse. Invisible in play (only the top score is ever drawn
      in the HUD) and confined to the persisted table's tail. Filed against
      arcade-shared as a Delivery Finding rather than fixed by one game
      unilaterally.
    - **The entry timeout IS modelled (and 0xF4 is not a frame count).** This
      entry originally deferred the timeout to cp4-7 and, worse, read `0xF4` as
      244 frames. Both were wrong, and the second would have made the timeout
      ~4 seconds instead of ~51. `FRAME` is a 16-bit counter incremented once
      per frame and `FRAME+1` is its HIGH byte, advanced only on the low byte's
      overflow (`CENIR4.MAC:269-271`, claim HS-17) — so seeding `FRAME+1` and
      waiting for zero (`:1105-1106`, `";TIME OUT - BACK TO ATTRACT"`) costs
      `(0x100 - seed) * 256` frames. Two sites seed it, and each line's own
      comment confirms the model:
      `UPDATE :2625 "LDA I,0F0 ;1 MINUTE AT 60HZ"` → 4096 frames ≈ 68 s (HS-16),
      and `GETINT :1101 "LDA I,0F4 ;ABOUT 50 SECONDS"` → 3072 frames ≈ 51 s
      (HS-8), reloaded on every accepted letter. Deferring it had been a
      mistake of a different kind: the timeout is the entry state's ONLY exit,
      so a qualifying player who did not type three letters could not leave at
      all. Shipped in cp4-6.
    - **A timeout costs the NAME, never the PLACE.** `UPDATE :2619-2624
      ";MOVE HIGH SCORES IN"` writes the score into the table BEFORE any initial
      is collected, and only then arms the countdown (claim HS-18). So the clone
      commits the row with whatever was typed when the clock runs out, rather
      than discarding the run. This deliberately differs from the START path,
      which still refuses a short buffer (`:1074`) — they are different events.
    - **The ROM's untouched entry reads "A" plus two blanks.** `:2613-2616`
      seeds only the FIRST slot to 'A' and clears the second and third (claim
      HS-19). The clone's keyboard port shows three blanks instead: with no
      letter-scrolling there is no "current letter" to seed, so the placeholder
      would be decoration rather than state. Logged as a divergence.
    - **What the clone added that the ROM does not need.** `START` is a HELD
      level in the shell (`src/shell/input.ts`), and game-over now carries two
      actions on that one button — confirm, then restart — so `SimState.startPrev`
      edge-triggers it. The cabinet solves the same problem in hardware with
      SDBNCE (`:1067-1071`). Without the edge, one ~60Hz press would confirm the
      initials and restart the game on consecutive frames.
    - **Deferred:** the ROM persists to an EAROM buffer via `COPYHS`
      (`:1117`, HS-10) and then displays the whole table with `SCORES`
      (`:1118`). The clone's equivalent of COPYHS is the
      `@arcade/shared/highscore` save; the full 8-row table DISPLAY is not
      drawn anywhere yet — the HUD shows only the top score. A "high score
      table screen" is a candidate for cp4-7's attract cycle.
