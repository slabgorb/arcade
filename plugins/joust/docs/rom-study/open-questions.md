# Joust — Open Questions

Honest gaps and contradictions, recorded so no story silently picks a side.
Citations file:line into the vendored tree (pin `9bcfdb1`).

## 1. Revision ↔ label-set mapping (the fine grain)

The **family-level** correlation is proven (brief §0): RV1/RV2 + T12REV1 +
TB12REV1 = the `$22`-checksum family (yellow + green labels); RV3/RV4 +
T12REV3 + TB12REV3 = the `$85` family, with RV4 the shipped red program
(double-locked by the `$6000→$85` and `$D000→$3D` fudge matches).

Within the first family, **which of RV1/RV2 is yellow and which is green is
probable but unproven**:

- *For RV1=yellow, RV2=green:* the RV1→RV2 diff is the `PAMSG` attract
  message-queue erase rework — and `TB12REV3.SRC:394-396`'s re-cut note says
  the new revision existed "TO HANDEL ATTRACT MODE (AT GAME ADJUST 0 TO 3)
  NOT ERASEING TEXT". Green re-cut exactly ROMs 7 (`$6000`) and 10 (`$D000`),
  and the `PAMSG` rework plausibly lands in ROM 7. No other attract/text
  change exists anywhere in RV2→RV3 or RV3→RV4 (verified by diff+grep).
- *The wrinkle:* the RV1→RV2 diff's second hunk (a one-byte `BEQ→BNE` at
  `JOUSTRV1.SRC:1746`) sits, by line-position estimate, in ROM 8's address
  range — a chip yellow and green **share**. Either the position estimate is
  off (plausible: ±one PROM over ~600 source lines) or RV2 is not
  byte-exactly the green set.
- The TB12 timeline also needs care: TB12 lives in ROM 4, which green did
  *not* re-cut — so TB12REV3's 09/10/82 stamp reached silicon only with red.

**Resolution path:** assemble each revision and compare against the MAME set
CRCs (`williams.cpp:3006-3076`). No ROM binaries are vendored, so this is
real tooling work — do it only if a story actually needs the green byte-map.
Implementation cites RV4 regardless; green-vs-red *behaviour* is a design
ruling, not a source gap.

## 2. The sound board source is absent

`JOUSTSND.DOC:2` = `SEE [LIBRARY.SOUND]VSNDRM4.SRC`; `JOUST.DOC:33` names
`JOUSTSND.SRC - ENTIRE 4K SOUND ROM (6800 PROCESSOR)`. Neither file is in
the tree. The shipped chip is the shared Williams board ROM
`video_sound_rom_4_std_780.ic12` (`williams.cpp:3022`). Sound ground truth
must come from MAME's board emulation (`shared/williamssound.*`, M6808 +
MC1408 DAC) + the ROM's behaviour, or from locating VSNDRM4.SRC in another
historicalsource tree. **Defer the sound-path decision to the sound epic**
(centipede cp5 precedent).

## 3. OS layer

- **`PPRI`'s comment is a fossil** (`RAMDEF.SRC:170` says "START LINK OF
  OBJECT(S) BLOCK"); the code uses it purely as the primary/secondary flag
  (`SYSTEM.SRC:231,248,403`). Trust the code.
- **"Vertical line 0" is really ~scanline 32** (VA11's rising edge;
  `SYSTEM.SRC:589,591` vs `williams_m.cpp:28`) — a clone should apply
  deferred palette writes at frame start and move on.
- **Coin-slot naming permutation**: source says B2=R/B4=L/B5=C
  (`EQU.SRC:43-46`); MAME calls them COIN3/1/2 (`williams.cpp:983-986`).
  Only matters if per-slot audits are ever surfaced.
- `DMAINT` init is commented out but the variable is toggled
  (`SYSTEM.SRC:122,721`) — starts 0 from the RAM clear; defined, low risk.
- `TIMER` (`RAMDEF.SRC:229`) appears unused in SYSTEM.SRC.
- `SHRAMDEF`/`SHORTEQU` are mechanical comment-outs of `RAMDEF`/`EQU`
  (verified by diff) — no semantic divergence; game modules include the short
  twins so system symbols aren't re-emitted.

## 4. Physics / gameplay

- **`GRAV` is "VARIABLE" only in comments** (`:6489,3111`): its sole writer
  is the init `LDA #4` (`:952-953`) and it is not in `DYTBL`. Provisionally
  constant; if a story finds another writer, this entry is wrong.
- ~~**`BCKCOL`** (cliff-*side* pixel bounce) is only partially read.~~
  **CLOSED in jt1-4.** The dispatch is traced end to end
  (`JOUSTRV4.SRC:6799-6921`): `BCKXTB`/`BCKYTB` is a box broad-phase, and on a
  hit `BCKCOL` dispatches on the mask, dereferences that cliff record's
  collision-span pointer (`LDY [CLIF1L]`, `JOUSTRV4.SRC:6818` — the tables
  jt1-3 transcribed) and walks it from an `(LDD #originX, LDX #originY)`
  origin. The full eight-bit map is transcribed in `src/core/arena.ts`
  (`BACKGROUND_SURFACES`), and every `originY` is the cliff record's own
  destination scanline — the same number stated in two unrelated places.
  **The payload:** this bit assignment is *not* the landing table's. See
  "Two bit assignments" below. The `COLDX`-doubling *exit* paths
  (`JOUSTRV4.SRC:6892-6901`) decide left/right/top/bottom response and remain
  for the collision-response story; the *dispatch and geometry* — what jt1-4
  needed — are settled. Claims JT4-038…JT4-045.
- The `LNDXTB`/`BCKXTB` bitmask **generators** (`:979-991,244-258`) were
  inferred from the `LND18` dispatch, not read; bit `$20` = CLIF5 is explicit
  (`:988`), the rest inferred.
- **Ptero = 1000 points is derived** (`DVALUE $10` via `SCRHUN`,
  `:5575-5577`), not stated in any comment or attract text. One confirming
  check (or a MAME playtest) before baking into scoring tests.
- **The 50-points-for-dying** (`:4730-4732`) is real but odd; note that
  misreading `SCRTEN`'s "BACKWARDS" convention would award 500. Verify in
  emulation before asserting in a test.
- `EMYTIM` makes enemies literally lower-framerate entities (integrate every
  N frames: 2 on waves 1-2 and after early deaths, else 1). Model it as a
  divider, not a speed scale.
- ~~`TBRIDGE`/`TTROLL` arithmetic vs the "1ST, 2ND, OR 3RD WAVE?" comment at
  `:4719` don't obviously agree~~ — **TRACED in jt3-2.** The comment reads a
  COUNTDOWN, not a wave number: `LDA TTROLL` (`JOUSTRV4.SRC:4719`) and
  `LDA TBRIDGE` (`JOUSTRV4.SRC:2202`) both gate the `EMYTIM`=2 early-game
  enemy-slowdown after a player death. `TBRIDGE` (seeded 3, `JOUSTRV4.SRC:955`)
  and `TTROLL` (seeded 1, `:957`) are pre-decremented once per inter-wave pass in
  `IWAVE2` (`:1934-1936`) BEFORE `WAVBCD` increments (`:2001-2004`), so:
  `TBRIDGE` hits 0 — `JSR STBRID` burns the bridge (`:1938`) — as **wave 3**
  begins (present in waves 1-2, gone from wave 3; = `arena.BRIDGE_WAVE` and the
  `wave >= 3` hook). `TTROLL` then hits 0 as **wave 4** begins (`TTROLL =
  TBRIDGE + 1`, the jt3-3 gate). The comments are ACCURATE once the pre-decrement
  is accounted for: at `:2202` "TBRIDGE≠0" holds on waves 1-2; at `:4719`
  "TTROLL≠0" holds on waves 1-3 — exactly "1ST, OR 2ND" / "1ST, 2ND, OR 3RD".
  Claims JT32-013…JT32-021.
- Wave 0's table entry (`:2437`) appears never played (`PWAVE` seeded at
  `WAVTBL-WLEN`, `:1878`); unverified that nothing reads it.
- `WBJSR` bits promise wave-type offsets up to 14 (`:187`); only 6 types
  exist and no wave uses 12/14. **Do not implement the phantom types.**
- `WAVDEL`-area "one second" delays divide by 6, not 8 (`180/6` `:2045`,
  `90/6` `:2601`) and run through a variable-length message loop — they are
  *approximately* a second; don't pin exact durations without modelling
  `REWMSG`.
- Waves 6-76 of `WAVTBL` were not individually decoded (head, sample, tail
  only). The full 90-row decode is mechanical — a good early-story appendix.

## 5. Images

- **Every cliff record has a second variant one scanline shorter**
  (`JOUSTI.SRC:54/55` et al.; `CLIF3U`'s two are identical) — consumer not
  found. Possibly an erase variant, possibly dead. **TRACED in jt3-2, consumer
  STILL NOT FOUND (the prime suspect is FALSIFIED).** The variant is real and
  structural: the record is a 4-word DMA block (`FDB collPtr,srcPtr,dest,w/h`,
  e.g. `CLIF1L … $1107`, `JOUSTI.SRC:54`), and the following FDB is 3 words —
  same source + dest, **height nibble one less** (`$1106`, `JOUSTI.SRC:55`;
  `CLIF1R` `$1806`, `:79`; `CLIF2` `$2C08`, `:107`), with the **collision pointer
  dropped**. jt3-2's destruction path was the prime suspect (bridge/cliff burn),
  but the trace falsifies it: cliff destruction runs entirely through the
  `LNDXD1`/`BCKXD1` RAM bit-tables (`WCLFEW`, `JOUSTRV4.SRC:2301-2325`) and the
  `CLFDES` crumble animation (`JOUSTRV4.SRC:4562-4599`), neither of which reads
  the shorter variant. Every game-code reference to a destructible cliff
  (`CLIF1L`/`CLIF1R`/`CLIF2`/`CLIF4`) targets offset 0 — the image pointer table
  (`JOUSTI.SRC:20-27`), the `[CLIFxx]` collision indirection
  (`JOUSTRV4.SRC:6817-6919`), and `WCLFTB` (`:2407-2414`); **no line computes
  `CLIFxx+8`**, so nothing reaches the variant. It remains an unconsumed
  erase-variant candidate. Claims JT32-022…JT32-025; pinned by
  `tests/arena-destruction-source.test.ts`.
- **`ASH1R/L`** (pterodactyl dissolve, `JOUSTI.SRC:2778-2781`) use a third,
  undecoded format (value/run pairs?). Trace the consumer before the ptero
  death story.
- `HICOLR` entries carry ambiguous trailing numbers (`JOUSTRV4.SRC:755,757`)
  — comment stale vs dead alternate column. The two name-verified entries
  have no trailing number; weak evidence the trailing values are dead.
- `CLIF3R`'s `OLD X` comment is a copy-paste error (`JOUSTI.SRC:222` says
  `$CA`, record says 254; 9/10 siblings check out). Trust records.
- Artist-file header signatures drift from their frames (`OSTRICH.SRC:5`) —
  export artifacts, not ground truth. The `$AA05`/`$70C0` header fields are
  undecoded (stripped by the merge; no clone impact).
- `OSTICH.FRM` (199 lines) and the `*.PIC` S-Records were not individually
  examined; `JOUSTI.SRC` is proven authoritative for OSTRICH and CLIFF.

## 6. Text / attract / operator

- **The 09/10/82 attract-erase fix could not be located as a diff** — TB12's
  delta is data-only, and no `ETEXT`/`PAMSG` change exists after RV2. Most
  likely the RV1→RV2 `PAMSG` rework *is* the fix (see §1); the alternative is
  a file not in this tree.
- `ETEXT`/`ETEXT35` jump-table comments appear swapped
  (`MESSAGE.SRC:38-39`); the names and the game's usage agree with each
  other — trust them.
- **`MESSEQU` equate comments drift from shipped text** (confirmed:
  `ONLY5M`, `MSW00`, `MSNEW1`, `ELECTROINCS`, `SAFTEY`). Fidelity quotes come
  from `PHRASE.SRC` data only.
- The third CMOS adjustment is dual-named (`N2SHIP`, `EQU.SRC:112` vs "HIGH
  SCORE TO DATE ALLOWED", `TB12REV3.SRC:136`); the game reads it as the HSTD
  gate (`:716`). Follow the reader.
- **`ATT.SRC`'s `MARQUE` logo page is undecoded** (~490 lines: line lists,
  fill, colour cycling). A faithful attract needs a dedicated story.
- The operator menu navigation, `ENTRY`/`ENTINT` initials state machine
  (`TB12REV3.SRC:1160+`), and `T12`'s 24-line REV1→REV3 delta (likely the
  HSTD border) are unread.
- The 53+49 font glyphs (`MESSAGE.SRC:347-1057`) are format-verified but not
  transcribed — that is the font story's work, byte-gated like the images.
- Default-table initials `JRN`/`MRS` unattributed (`JRN` plausibly John
  Newcomer).

## 7. Meta

- The nap-unit question raised mid-study is **resolved** (1 nap = 1 frame at
  60.096 Hz; five independent oracles across two readers) — recorded here
  because early notes said "~4 ms tick"; any stray 4 ms-based constant
  conversion is wrong.
- `BR=NO`-style branch comments are inverted in several hot paths
  (`:6442,6447,6169,6196`) — the discipline everywhere: **trust branches,
  not prose**.
- The `IFN DEBUG` blocks (`:1982-1990,2953-2959,2966-2970,3765-3770`) are
  the author's own invariant list ("NSMART had better be zero", …) — a free
  test oracle for the clone's wave bookkeeping.
