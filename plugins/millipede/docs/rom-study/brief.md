# Millipede (1982) — Ground-Truth Brief

Produced with the `rom-source-study` skill (story `ml1-2`). Millipede is Ed Logg's
1982 sequel to Centipede on a **revised Centipede board**, assembled with the same
toolchain (`MAC65`, `.MAC`, `.RADIX 16`). This is a `rom-source-study` **sibling**
case: parts of the ground truth transfer from Centipede *by citation*, but only the
parts proven to transfer — everything below was re-opened against the vendored 1982
source this session, and every claim is pinned by a `claims/*.json` entry the
citation gate re-opens byte-for-byte.

**Primary source:** `reference/original-source/millipede/` — an LF/ASCII vendored
copy of [historicalsource/millipede](https://github.com/historicalsource/millipede),
pinned `29f3e05` (`docs/reference-sources.md`). Citations are `FILE:LINE` in that
tree; a bare filename resolves at the tree root (a single vendored revision — no
`revision.v4/` layer, unlike Centipede).
**Secondary source:** MAME driver `src/mame/atari/milliped.cpp`. It wins only on
board-level facts the source never states (master clock, exact refresh, geometry,
colour wiring) — resolved in `ml1-4`, cited in prose, never copied (GPL).

**Line-number discipline.** Line numbers are copied only from numbered tool output
(`grep -n`, `sed -n 'Np'`), never from memory or arithmetic — the Centipede brief
records both of its study runs drifting line numbers by one. Read
`reference/original-source/millipede/`, or set `MILLIPEDE_SOURCE_DIR`.

---

## 0. Revision and shipped set — one version, six EPROMs, no PROM

There is a single preserved release. The ROM sign-off ledger `368X1.DOC` identifies
it as **MILLIPEDE, Ed Logg, Sept. 29 1982, version 1** (`368X1.DOC:7`).

**Program:** four EPROMs, `136013-101` (H1, address 7000) through `136013-104`
(M/N1, address 4000) — `368X1.DOC:17` and `368X1.DOC:20` — each a 2532 4Kx8 tiling
the `4000-7FFF` program space.
**Picture:** two EPROMs, `136013-106` (N/P5) and `136013-107` (R5), 2716 2Kx8 —
`368X1.DOC:22` and `368X1.DOC:23`. These are a **separate** set from the program
EPROMs and carry the 8×8 stamps `ml2` decodes.
**No colour or sync PROM is listed** — a real board difference from Centipede's
82S129 sync PROM, and the reason colour is RAM-driven here (studied in `ml1-3`/`ml2`).

The verification image is **`MILLI.LDA`** (control file 013X1.DAT, `368X1.DOC:10`) —
the *linked CPU program* load image, **not** the picture pixels. It is built from
seven modules by the link command: `MILLI, MLSUB, MLATR, CONWAY, MLCOIN`
(`MILLI.LNK:1`) then `MLIRQ, MLTST` (`MILLI.LNK:2`).

## 1. Radix — hex by default, decimal only with a trailing period

`.RADIX 16` is set **once** in the shared include `MLDEF.MAC:2` and inherited via
`.INCLUDE` by every CPU module, so **a bare literal is hexadecimal**. The separately
assembled coin module sets its own radix the same way — `COIN65.MAC:11` (space-
indented `.RADIX 16` in that file) — and restores the caller's radix on exit
(`.RADIX .RAD`, `COIN65.MAC:662`).

**A trailing period means decimal**, even inside a hex-radix file. The two spellings
sit side by side: `NDDT =4` is **hex four**, the DDT-bomb count, with no period
(`MLDEF.MAC:191`); `PTS: .BLKB 16.` reserves a **decimal-sixteen**-entry table by the
trailing period (`MLDEF.MAC:398`). Read either in the wrong radix and its meaning
changes silently — the discipline the whole study depends on.

## 2. Timebase architecture — game logic once per video frame

The interrupt spec is Centipede's, verbatim: `;INTERRUPT REQUIREMENTS:IRQ 4 PER
FRAME (1 IN VBLANK)` (`MLDEF.MAC:31`). One of the four interrupts per frame lands in
vertical blank, and the handler picks it out by testing bit **D6 of ENDSCREEN**,
which is what `VBLANK =2000` names (`MLDEF.MAC:117`): the IRQ does `BIT VBLANK` / `BVS`
(`MLIRQ.MAC:708-709`), branching only on the VBLANK pass ("WE ARE IN VBLANK"). So the
per-frame game logic hangs off that branch — **game logic runs once per video frame**,
exactly as Centipede does.

The **exact refresh rate** is deliberately left **open (OQ-1) for `ml1-4`**: Millipede
is a *revised* board, and whether it still runs at Centipede's 59.88593 Hz must be
confirmed against `milliped.cpp` (recording any `/263`-vs-`/262` hedge verbatim), not
inherited on faith. This brief records the timebase **architecture** only.

## 3. Source gaps — two files named in the ledger, absent from the tree

Two files the ledger names were searched for as embedded content before being called
gaps; both are genuinely missing:

- **MILLI.DOC** — the design document (`368X1.DOC:39`). Absent from the vendored tree
  and embedded in no `.MAC` file. This is a **secondary-doc gap, not a ground-truth
  gap**: Centipede got Ed Logg's `CENTIP.DOC` vendored and Millipede did not, but the
  design intent is still first-hand in the *code*. Scoring is the **16-entry `PTS`
  table** (`MLDEF.MAC:398`), and difficulty is an operator **option-switch (DIP)**
  setting, documented per bit in `MLDEF` — `D1=BEETLE DIFFICULTY` (`MLDEF.MAC:88`)
  through `D6=SPIDER DIFFICULTY` (`MLDEF.MAC:91`). Ground truth for scoring/difficulty
  is the source (the `PTS` table and the option-switch bits), not the missing doc.
- **368XX.SB2** — the picture source (`368X1.DOC:41`). Also absent. The picture pixels
  come from the **MAME `milliped` ROM set** (`136013-106/107`), decoded in `ml2` — the
  ordinary raster trap the playbook predicts (data ROMs live outside the CPU link).

## 4. Sibling reuse — COIN65.MAC is Centipede's, verified by diff

`COIN65.MAC` is **byte-identical** to Centipede's copy (`diff
reference/original-source/millipede/COIN65.MAC
reference/original-source/centipede/COIN65.MAC` reports no difference). It is the only
literally-shared source file, so the coin/credit subsystem is cited *identical to
Centipede's `COIN65.MAC` — verified by diff*, not re-studied. Its `.RADIX 16`
(`COIN65.MAC:11`) is the same shared line the radix answer above leans on.

---

*Scope: this brief answers the five `rom-source-study` preflight questions only. The
glossary, subsystem map and open questions are `ml1-3`; the secondary-source MAME
board facts (master clock, exact refresh, geometry, colour wiring) are `ml1-4`.*
