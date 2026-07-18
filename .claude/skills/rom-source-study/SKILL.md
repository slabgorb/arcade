---
name: rom-source-study
description: Use when starting a faithful clone of an arcade machine from its original ROM/assembler source before any implementation exists — a newly vendored source tree needs reading, ground truth (revision, shipped files, radix, timebase) is unestablished, or a new game repo needs the reference dossier its first stories will cite.
---

# ROM Source Study

Read an arcade machine's original source and produce the ground-truth dossier a fresh implementation is built from. This is the pre-implementation sibling of `rom-fidelity-audit`: no clone exists yet, so every finding is single-sided — a claim about the machine, cited to the primary source.

**Core principle: every claim in the dossier will be trusted for months of stories.** An uncited or wrong "fact" here becomes a fleet of code faithful to nothing. The audit skill's citation rule applies from day one, not after code exists.

**REQUIRED BACKGROUND:** `rom-fidelity-audit` — its preflight traps (link maps, dead conditionals, CRLF copies, unit/BCD errors), citation rule, and refutation discipline all apply here unchanged. This skill covers only what differs when there is no "ours" side yet.

<run>
Preflight — FIVE questions, answered in order, before any subsystem reading:

```bash
SRC=<vendored greppable copy>          # LF/ASCII — never the pristine CRLF clone

# 0. WHICH REVISION? Preserved trees often hold several complete releases
#    (centipede: root=rev1 + revision.v2/3/4). Pick the implementation target
#    (usually the final release), record WHY, and list per-revision artifact
#    gaps — a late revision may re-cut only program EPROMs, so its picture/
#    sync ROMs are an EARLIER revision's. Cite the release ledger.
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
</output>

## Secondary source — the emulator driver

Sparse MAME clone at `~/Projects/mame/src/mame/atari/` (`git clone --depth 1 --filter=blob:none --sparse https://github.com/mamedev/mame.git && git sparse-checkout set src/mame/atari`). Read the machine config for board-level facts the source assumes silently: master clock, exact refresh, screen geometry, IRQ scanline generation, palette wiring, memory map, input polling rates.

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
