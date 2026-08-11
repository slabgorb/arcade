# Millipede (1982) — cabinet roadmap + `ml1` ROM-study design

**Architect:** Vito Cornelius · **Date:** 2026-08-11 · **Skill:** `rom-source-study`
**Epic opened:** `ml1` (ROM study + scaffold + fidelity harness)
**Primary source (already vendored):** `reference/original-source/millipede/`
— [historicalsource/millipede](https://github.com/historicalsource/millipede), pinned
`29f3e05` (`docs/reference-sources.md`, vendored 2026-08-11).
**Sibling oracle:** `plugins/centipede/` + its `docs/rom-study/` dossier.

> This is a *pre-implementation* design. No `plugins/millipede/` exists yet. Every
> factual claim below is single-sided — a claim about the machine, cited to the
> vendored source `file:line` or flagged as an open question for the secondary source
> (MAME `milliped.cpp`). The dossier the epic produces is what months of later stories
> will trust, so uncited "facts" here are forbidden.

---

## 1. Why this epic is cheap where Centipede was expensive — and where it is not

Millipede is Ed Logg's 1982 sequel to Centipede on a **revised Centipede board**,
assembled with the **same toolchain** (`MAC65`, `.MAC`, `.RADIX 16`). That makes it a
`rom-source-study` **sibling** case: parts of the ground truth transfer by citation
instead of fresh study, but *only the parts proven to transfer*. Two moves, each cited,
neither assumed:

### 1a. What transfers from Centipede (cited reuse)

- **`COIN65.MAC` — byte-identical.** `diff reference/original-source/millipede/COIN65.MAC
  reference/original-source/centipede/COIN65.MAC` reports no difference. The coin/credit
  subsystem is cited *"identical to `centipede/COIN65.MAC`, verified by diff"*, not
  re-studied. It is the **only** literally-shared file (`comm -12` of the two file lists).
- **Dialect + radix mechanism — same shape, re-verified.** `.RADIX 16` is set in the
  shared include `MLDEF.MAC:2` and inherited via `.INCLUDE` by the CPU modules; `MLATR.MAC:2`
  and `CONWAY.MAC:4` set it independently; `COIN65.MAC:11` sets and `:662` restores it —
  the identical inheritance pattern the Centipede brief documents. **Trailing period =
  decimal** (`NDDT =4` hex-4 vs `PTS: .BLKB 16.` decimal-sixteen, `MLDEF.MAC:191,398`).
- **Timebase *architecture* — identical wording, re-verify the *rate*.** `MLDEF.MAC:31`
  carries the exact Centipede spec `;INTERRUPT REQUIREMENTS:IRQ 4 PER FRAME (1 IN VBLANK)`.
  The VBLANK-flagged IRQ is distinguished by `BIT VBLANK` / `BVS` (`MLIRQ.MAC:708-709`),
  `VBLANK =2000` being D6 of ENDSCREEN (`MLDEF.MAC:117`). So **game logic runs once per
  video frame**, same as Centipede. The *exact* refresh (Centipede's 59.88593 Hz) is a
  **revised-board** question — confirm against `milliped.cpp`, cite as shared only if the
  divisor matches; do not copy on faith (open question OQ-1).

### 1b. What is genuinely new (full fresh study — no sibling to lean on)

- **`CONWAY.MAC` — the signature mechanic, and it has no Centipede analog.** Authored by
  **Mark Cerny**, July 1982: *"LIFE ALGORITHMS FOR MILLIPEDE"* (`CONWAY.MAC:1-3`). The
  growing/spreading mushroom + DDT field is literally **Conway's Game of Life** over the
  playfield (`INICON`/`MASTER` entry points, `MLDEF.MAC:73`). This is a whole pure-reducer
  subsystem that must be studied and ported from scratch. It is the single highest-risk,
  highest-novelty part of the whole cabinet.
- **A richer bestiary.** Beyond the millipede/mushroom core, the source owns: BEETLE
  (`BEETL`), SPIDER (`SPDMV`), DRAGONFLY (`FLYMV`), MOSQUITO (`MOSQT`), EARWIG (`EARWIG`),
  INCHWORM (`WRMMV`), BEE (`BEEMV`), plus DDT bombs (`NDDT =4`, `MLDEF.MAC:191`) and
  poison mushrooms (`MLDEF.MAC:143`). Owning routines are enumerated by `.SBTTL` in
  `MILLI.MAC` (see `subsystems.md` deliverable).
- **Colour is RAM-driven, not a PROM.** The ROM ledger `368X1.DOC` lists **no colour or
  sync PROM** (only 4 program + 2 picture EPROMs). The source initializes colour from
  **COLOR RAM** at runtime (`MLIRQ.MAC:242` `CLRCH - COLOR RAM INITIALIZATION`). This is a
  real hardware difference from Centipede's `SYNC.MAC` 82S129 PROM and changes the
  graphics-decode seam (OQ-3).

---

## 2. Source gaps found (checked *inside* other files, not just the file list)

Two files named in the sign-off ledger are **not** in the vendored tree. Both were
searched for as embedded content before being called gaps:

| Named in `368X1.DOC` | Vendored? | Embedded elsewhere? | Verdict |
|---|---|---|---|
| `MILLI.DOC` (design doc, `:39`) | No | No — no design prose in any `.MAC` | **Secondary-doc gap, not a ground-truth gap** |
| `368XX.SB2` (picture source, `:41`) | No | No — `.MAC` "PICTURE" refs are index code, not pixel `.BYTE`s | **Graphics from MAME set** |

- **`MILLI.DOC` is a documentation gap, not a fidelity gap.** Centipede got Ed Logg's
  `CENTIP.DOC` (rules/scoring prose) vendored; Millipede did not. But design intent is
  still first-hand in the *code*: scoring is a **16-entry table** `PTS: .BLKB 16.
  ;NUMBER OF POINTS FOR KILLING THIS CRITTER` (`MLDEF.MAC:398`), difficulty is equated in
  `MLDEF.MAC` (`;D1=BEETLE DIFFICULTY`, `;D6=SPIDER DIFFICULTY`, `:88,91`). Ground truth
  for scoring/difficulty is the source tables, not the missing doc. The study should still
  attempt to locate `MILLI.DOC` upstream; if absent, record as a **permanent gap** and
  cite the code tables (OQ-2).
- **`368XX.SB2` picture pixels come from the MAME ROM set.** `MILLI.LDA` (20480 B) is the
  **CPU program** load image — the verification file per `368X1.DOC:10`, opening
  `COPYRIGHT ATARI 1982` + code. The picture EPROMs `136013-106/107` assemble separately
  from `368XX.SB2`, which upstream did not preserve. This is the ordinary raster trap the
  playbook and skill both predict ("data ROMs live outside the CPU link"): decode the
  picture bytes from MAME's `milliped` set, exactly as pac-man/centipede did (OQ-3).

---

## 3. Citation vocabulary (fixed here, enforced by the gate)

One vocabulary, mirroring Centipede: **`` `millipede/<FILE>.MAC:<line>` ``** resolving into
`reference/original-source/millipede/`. Line numbers are copied only from numbered tool
output (`grep -n`), never from memory or arithmetic — the Centipede brief records both of
its test runs drifting line numbers by one. Nothing downstream may introduce a `src/core`
constant that is not backed by a claim in `claims/*.json` and gated by `citations.test.ts`.

---

## 4. The cabinet roadmap (phased, per `docs/playbooks/next-sprite-game.md`)

Millipede is a **raster** cabinet, so it follows the pac-man/missile-command phased arc.
Each epic is boot-stable and depends only on the ones above it. **Pixels before physics,
gate before constants, wire last.**

| Epic | Phase | Scope | Leans on |
|---|---|---|---|
| **`ml1`** | 1–2 | **ROM study dossier + scaffold + fidelity harness** (this epic) | centipede dossier; skill |
| `ml2` | 3 | Graphics-ROM decode: picture EPROMs `136013-106/107` → baked `*-data.ts`; RAM-colour seam | pac-man `gfx-rom.ts`, `bake-graphics` |
| `ml3` | 4 | Core sim reducers — player/shot, millipede train+split, bestiary, **CONWAY Life field** | vector-game process; ml1 claims |
| `ml4` | 5 | Sound — POKEY driver + `MLIRQ` `SOUNDS` routine (`MLIRQ.MAC:8`) | centipede `sound.md`; `@shared/synth` |
| `ml5` | 6–7 | Phase machine (attract `MLATR` MODE FE/FF) + runtime wiring + HUD + showcase | pm4/mc6; `@shared` |
| `ml6+` | 8 | Hardening / mutation batteries (Reviewer-driven, grouped by **file surface**) | jt9 gotcha |

The **CONWAY Life field** (`ml3`) is the schedule risk to watch: it is the one subsystem
with no sibling code and no design-doc prose, ported purely from Cerny's 6502.

---

## 5. `ml1` — the epic this design opens

**Goal:** produce `plugins/millipede/docs/rom-study/` (the dossier every later `ml*`
story cites) **and** the boot-stable scaffold + citation gate, folded into one epic as
pac-man's `pm1` did (the playbook calls the fold "cleaner"). Definition-of-done is the
playbook's DoR rows through the citation gate — *not* game logic.

**Standing rules for this epic**
- Reuse-first: consume `src/shared/` (`loop`, `rng`, `highscore`, `font`, `glow`,
  `host-helpers`, …) — never re-inline. Copy the four-file scaffold from `plugins/joust/`.
- The citation gate + `src/core` purity test are committed **before the first game
  constant** (playbook rule; missile-command learned it as a split, pac-man folded it).
- Build the citation checker by **reusing centipede's `check-citations` shape with the
  `ours` side dropped** — it is a single-sided study, not a two-sided audit.
- Every claim re-opened before the epic closes (the Centipede drift lesson).

### Stories (first cut — points are the Architect's estimate, TEA/PM refine)

- **`ml1-1` — Citation gate + purity test first (TDD).** Port centipede's
  `tools/audit/check-citations.mjs` to a single-sided millipede checker + a
  `citations.test.ts` that fails on any uncovered prose citation, + the `src/core`
  purity scan. Committed before any constant. (5 pts)
- **`ml1-2` — `brief.md`: the five preflight answers, each cited.** Revision/shipped
  set (`368X1.DOC` ledger: EPROMs `136013-101..104` program, `-106/107` picture; link
  `MILLI.LNK`); radix (§1a); timebase architecture (§1a) with the exact-rate question
  left open for `ml1-4`; the `MILLI.DOC`/`368XX.SB2` gap analysis (§2). Sibling reuse of
  `COIN65.MAC` cited by diff. (5 pts)
- **`ml1-3` — `glossary.md` + `subsystems.md` + `open-questions.md`.** Author's names →
  plain English (BEETLE/SPIDER/EARWIG/INCHWORM/MOSQUITO/DRAGONFLY/DDT/poison-mushroom);
  subsystem → owning file + `.SBTTL` line from `MILLI.MAC`/`MLSUB.MAC`/`MLIRQ.MAC`/`MLATR.MAC`;
  the open questions OQ-1..OQ-3 below. (3 pts)
- **`ml1-4` — Secondary source: MAME `milliped.cpp` board facts.** Master clock, **exact
  refresh** (resolve OQ-1 vs centipede's 59.886 Hz + the `/263 ?? /262` hedge), screen
  geometry, cabinet rotation, COLOR-RAM wiring, picture-ROM part numbers. Recorded as
  claims; MAME cited in prose, never copied (GPL). (3 pts)
- **`ml1-5` — Four-file scaffold + registrations → boots black canvas at `/millipede/`.**
  Copy `plugins/joust/`; add `millipede` to `justfile` `games`, `vitest.config.ts`
  `GAMES`; run `npm run gen:registry`. Green `npx vitest run --project millipede` +
  `npm run lint`; visual boot check at `http://127.0.0.1:5270/millipede/`. (5 pts)

### Open questions carried into the dossier

- **OQ-1 — exact refresh.** Is Millipede's revised board still 59.88593 Hz? Confirm the
  `milliped.cpp` divisor; record any MAME hedge verbatim. Do not inherit centipede's rate
  on faith.
- **OQ-2 — `MILLI.DOC`.** Locate Ed Logg's design doc upstream, or record it as a
  permanent gap and pin scoring/difficulty to the code tables (`PTS` `MLDEF.MAC:398`,
  difficulty equates `MLDEF.MAC:88,91`).
- **OQ-3 — graphics + colour.** Picture pixels from MAME `136013-106/107`; colour is
  COLOR-RAM-driven (`MLIRQ.MAC:242`), not a PROM — verify the palette source in
  `milliped.cpp` before designing the `ml2` decode seam.
- **OQ-4 — input.** `MLIRQ.MAC:897` `JOYS - READ AND RESPOND TO JOYSTICKS` alongside a
  trackball cabinet — resolve trackball vs joystick (and which the clone binds) in study.

---

## 6. Handoff

`ml1` is groomed and ready for `/pf-sm`. The dossier it produces is handed verbatim to
every later `ml*` story and, once code exists, to `rom-fidelity-audit` (its preflight is
answered by `brief.md`). Sibling assets to copy, not reinvent: centipede's whole
`docs/rom-study/` layout, its `tools/audit/check-citations.mjs`, and the `src/core`
purity test.
