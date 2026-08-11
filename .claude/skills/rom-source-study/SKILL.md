---
name: rom-source-study
description: Use when starting a faithful clone of an arcade machine from its original ROM/assembler source before any implementation exists — a newly vendored source tree needs reading, ground truth (revision, shipped files, radix, timebase) is unestablished, or a new game repo needs the reference dossier its first stories will cite.
---

# ROM Source Study

Read an arcade machine's original source and produce the ground-truth dossier a fresh implementation is built from. This is the pre-implementation sibling of `rom-fidelity-audit`: no clone exists yet, so every finding is single-sided — a claim about the machine, cited to the primary source.

**Core principle: every claim in the dossier will be trusted for months of stories.** An uncited or wrong "fact" here becomes a fleet of code faithful to nothing. The audit skill's citation rule applies from day one, not after code exists.

**REQUIRED BACKGROUND:** `rom-fidelity-audit` — its preflight traps (link maps, dead conditionals, CRLF copies, unit/BCD errors), citation rule, and refutation discipline all apply here unchanged. This skill covers only what differs when there is no "ours" side yet.

<acquire>
Step 0 — get the source into the repo as the greppable byte-of-record, BEFORE the preflight.

Most machines have a preserved tree at `historicalsource/<game>`. One command clones it,
LF/ASCII-transcribes the text (upstream is CR-terminated non-UTF8 — grep flags it binary
and returns nothing), passes ROM/binary dumps through VERBATIM (so the tree is also the
byte-of-record the fidelity oracles read), and records repo + pinned SHA in
`docs/reference-sources.md`:

```bash
just vendor-source historicalsource/<game> <sha>   # ref is POSITIONAL via just; PIN it — HEAD drifts
# (raw script form: node scripts/vendor-source.mjs historicalsource/<game> --ref <sha>)
# → reference/atari-source/<game>/   ← this is $SRC in the preflight below.
```

The `atari-source/` path is a fleet-wide legacy name, not a claim of manufacturer — Williams'
Defender vendors there too (`just vendor-source historicalsource/defender 3fae9d3`). A
pristine clone is cached at `~/Projects/<game>-source`; no tool reads it.

**No historicalsource repo?** (hand-vendored disassembly, e.g. a cubeman.org listing.) Place
the tree under `plugins/<id>/reference/source/` and hand-write `plugins/<id>/reference/PROVENANCE.md`
— origin URL, what proves it is the arcade machine (embedded ROM text/copyright string), and
the radix/encoding traps — the convention pac-man and missile-command follow.

Either layout MUST be committed, never gitignored: the citation gate byte-verifies against the
in-repo tree, so a CI checkout has to contain it.
</acquire>

<sibling>
Before deriving the preflight from scratch, check for a SIBLING already vendored AND studied
in this repo — arcade machines come in families (centipede→millipede; the Williams
defender/joust/robotron board). Two moves, each CITED, never assumed:

- DIFF the literally-shared source files to prove what transfers verbatim. millipede ∩ centipede
  is one file, `COIN65.MAC`, and `diff` reports it byte-IDENTICAL — so the coin subsystem is
  cited "identical to `reference/atari-source/centipede/COIN65.MAC`, verified by diff", not
  re-studied.
- CROSS-REFERENCE the sibling's dossier (`plugins/centipede/docs/rom-study/brief.md`) for
  shared-board facts — timebase, radix inheritance, trackball, screen geometry — then RE-VERIFY
  each against THIS tree and THIS machine's MAME set, because a sequel is usually a REVISED
  board. millipede's exact refresh IS centipede's 59.88593 Hz (both drivers carry the identical
  "/263 ?? could be /262" hedge) — confirm it, cite it as shared, don't copy on faith.

The game code (all `ML*.MAC`) shares nothing with the sibling; it gets the full study below.
</sibling>

<run>
Preflight — FIVE questions, answered in order, before any subsystem reading:

```bash
SRC=<vendored greppable copy>          # LF/ASCII — never the pristine CRLF clone

# 0. WHICH REVISION? Two questions, not one.
#  (a) HOW MANY releases does the tree hold? Preserved trees often hold several
#      (centipede: root=rev1 + revision.v2/3/4). Pick the target (usually the
#      final release), record WHY, list per-revision artifact gaps — a late
#      revision may re-cut only program EPROMs, so its picture/sync ROMs are an
#      EARLIER revision's. Cite the release ledger.
#  (b) WHICH revision IS this tree? A single tree still has an identity its
#      FILENAMES do not give you (defender's DEFA7/DEFB6/PHR6 do not encode the
#      white/blue/green/red label; the suffix is an iteration counter, not the
#      revision). Identify by a DISTINGUISHING BEHAVIOUR read from the source,
#      cross-check it against the emulator's set list (which set is PARENT), then
#      CONFIRM by matching the assembled CKBYT/checksum to that set's ROM CRCs.
#      The label is the CONCLUSION, never the evidence — and beware label-SHAPED
#      tokens that are not revisions (defender's "FULL RED PRESENT?" is a Williams
#      logo colour check, not a version flag). WORKED: defender ships UNCONDITIONAL
#      cocktail screen-flip (PHR6 `WDATA $38` normal/`$39` flipped; DEFA7 `LDA PIA3
#      COCKTAIL?` → "SWITCH UPSIDE DOWN GUYS"), which INFO.SRC's ledger defines as
#      the RED/cocktail software = MAME's parent set `defender`. Checksums present
#      rule out WHITE; runtime (not assembly-time) cocktail rules out plain GREEN.
ls $SRC $SRC/revision.* 2>/dev/null

# 1. WHAT SHIPPED? Linker map + the author's own ;LINK COMMAND comment +
#    .INCLUDE transitively + conditional assembly (per rom-fidelity-audit).
#    RASTER TRAP: data ROMs assembled OUTSIDE the CPU link — picture ROMs,
#    sync/color PROMs (CENPIC.MAC, SYNC.MAC) — appear in NO link string yet
#    absolutely shipped. Match every source file to a ROM part number in the
#    release DOC before concluding anything "didn't ship".
grep -iE "^BIN:|=OBJ:" $SRC/**/*.MAP; grep -n "\.INCLUDE\|LINK COMMAND" $SRC/**/*.MAC

# 2. WHAT RADIX? Per file — and note the INHERITANCE MECHANISM: .RADIX often
#    lives ONLY in the shared equates file and reaches every CPU module via
#    .INCLUDE. A module with no .RADIX of its own is NOT decimal. Trailing
#    period = decimal literal. Say which file SETS it and which files INHERIT.
grep -n "\.RADIX" $SRC/**/*.MAC

# 3. WHAT TIMEBASE? IRQ rate ≠ frame rate: derive (a) IRQs per frame and which
#    one is VBLANK-flagged, (b) what actually gates the mainloop (a SYNC flag?),
#    (c) nominal AND exact rate. Corroborate THREE ways: author comments,
#    timer arithmetic (e.g. a "4 second" counter ticking every 256 frames),
#    and the emulator machine config (below). Record nominal vs exact
#    separately (centipede: nominal 60, exact 59.886).
grep -n -i "IRQ\|VBLANK\|SYNC\|FRAME" $SRC/<irq-module> | head -40

# 4. WHAT DID THE AUTHOR ALREADY TELL YOU? The tree usually carries the
#    author's own documentation — a program/design doc (CENTIP.DOC is Ed Logg
#    explaining centipede) and a ROM part ledger (CENTI.DOC). These are
#    primary-source design intent, not paperwork. Read them BEFORE the
#    assembly; the ledger is also how question 1's data ROMs get matched.
ls $SRC/*.DOC && head -40 $SRC/*.DOC
```
</run>

<output>
The study yields a dossier, written into the new game repo at `docs/rom-study/`:

- `brief.md` — the five preflight answers, each cited. This is handed verbatim
  to every later agent, including `rom-fidelity-audit` when code exists.
- `subsystems.md` — subsystem → owning file + routine + `.SBTTL` line.
- `glossary.md` — the author's names → plain English (BUG=spider, ANT=flea).
- `open-questions.md` — primary/secondary disagreements, missing artifacts
  (a documented PROM revision with no vendored binary), undecoded macros.
- `claims/*.json` — machine-checkable citations, single-sided schema:
  `{id, claim, source: {file, line, verbatim}, corroboration?}`. Build the
  citation checker FIRST (TDD), reusing the audit's checker shape with the
  `ours` side dropped. The checker prints one error per bad claim and exits
  non-zero; a claim that fails is DELETED, not repaired.

Every claim's `source.file` resolves into the vendored tree from Step 0
(`reference/atari-source/<game>/` or `plugins/<id>/reference/source/`), whose
provenance row lives in `docs/reference-sources.md`. The dossier is the prose;
that tree is the bytes it cites — the study produces both.
</output>

## Secondary source — the emulator driver

MAME's driver holds board-level facts the source assumes silently: master clock, exact refresh, screen geometry, IRQ scanline generation, palette/PROM wiring, memory map, input polling rates. Find the machine's driver dir FIRST — it is per-manufacturer and **NOT always `atari/`**. Williams games (Defender, Joust, Robotron) live in `src/mame/williams/`; Namco/Midway Pac-Man in `src/mame/pacman/`. Locate by machine name, then sparse-checkout just that dir:

```bash
git clone --depth 1 --filter=blob:none --sparse https://github.com/mamedev/mame.git
cd mame && git grep -l -i "<machine>" -- 'src/mame/**/*.cpp'   # which driver owns it
git sparse-checkout set src/mame/<manufacturer>                # e.g. williams, atari, pacman
```

Read the machine config — the `<machine>_state` class, its `_main_map`/`_sound_map`, the `ROM_START` and `MACHINE_CONFIG` — for the silent hardware facts (Defender's is `defender_state` + `defender_main_map` in `src/mame/williams/williams.cpp`, which also documents its 1-vs-2 video-decoder PROM variants).

**Hierarchy:** the assembler source wins on game logic; MAME wins on hardware the source never states. A disagreement is a recorded open question, never a silent pick — and MAME hedges too (centipede's driver says "263 ?? could be /262"); record the hedge. **License wall:** never copy MAME code into the repo (GPL), same as the Atari source (copyright) — cite both externally.

## Red flags — STOP

- "Every file opens with `.RADIX 16`." → Did you check each, or does the shared include set it? Name the setter and the inheritors.
- "It's not in the link string, so it didn't ship." → Raster data ROMs live outside the CPU link. Match part numbers instead.
- "The .DOC files are paperwork." → One of them is the author explaining the game. Read them first.
- "60 fps." → Nominal or exact? Show the derivation and the emulator's number side by side.
- Citing the newest revision's tree for an artifact that revision didn't re-cut.
- A dossier claim you didn't re-open before finishing. Even good agents drift: both test runs on centipede got every verbatim TEXT right and still drifted LINE NUMBERS (one off-by-one each). Copy line numbers from numbered tool output (`grep -n`, `sed -n` with `=`), never from memory or arithmetic on a range you read earlier.

## Handoff

The dossier is what sprint stories cite while implementing. Once code exists, `rom-fidelity-audit` runs against the SAME ground truth — its preflight is answered by `brief.md`, handed verbatim. Agent prompt templates: `prompts.md` beside this file.

For a raster cabinet, this study is **phase 1** of a larger build sequence. The full phased order (scaffold + fidelity gate → graphics-ROM decode → core sim → sound → wiring → HUD → hardening), the raster-only render/sound seams and the traps that shipped green tests while being wrong are captured in the arcade repo's playbook: `docs/playbooks/next-sprite-game.md`.
