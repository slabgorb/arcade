# Defender (1981) — cabinet roadmap + `df1` ROM-study design

**PM:** Thor Odinson · **Date:** 2026-08-13 · **Skill:** `rom-source-study`
**Epic opened:** `df1` (ROM study + scaffold + fidelity harness)
**Primary source (already vendored):** `reference/original-source/defender/`
— [historicalsource/defender](https://github.com/historicalsource/defender), pinned
`3fae9d3` (`docs/reference-sources.md`, vendored 2026-08-11). Twelve Williams RASM
`.SRC` files, Eugene Jarvis et al., signed `DR J. 1/21/81` (`INFO.SRC:11`).
**Sibling oracle:** `plugins/joust/` + its `docs/rom-study/` dossier — the *later*
Williams board; hypotheses only, every fact re-verified against this tree.
**ROM bytes (machine-local, not vendored):** `~/roms/defender.zip` — the MAME parent
set, CRC-matched this study (see §1). **Tertiary:** MAME `src/mame/williams/` and
[mwenge/defender](https://github.com/mwenge/defender) (annotated reconstruction) —
cite in prose, never copy, never ground truth.

> This is a *pre-implementation* design. No `plugins/defender/` exists yet — and none
> may exist until `df1-5`: `tests/monorepo-topology.test.mjs` pins `plugins/` to
> exactly the registered game set, so the scaffold and its three registrations land
> together. Every factual claim below is single-sided — a claim about the machine,
> cited `defender/<FILE>.SRC:<line>` into the vendored tree — and was verified against
> numbered tool output in the 2026-08-13 preflight study. The `df1` dossier stories
> re-open every one of them under the citation gate before anything downstream trusts them.

---

## 1. Which machine this is — the preflight findings the roadmap stands on

- **Revision: the tree is the RED (cocktail) software = MAME parent set `defender`.**
  The tree carries its own four-colour release ledger (`INFO.SRC:15-23`: WHITE = first
  release without checksums, BLUE = with checksums, GREEN = 2×2716-at-$D000 re-cut,
  RED = "COCKTAIL SOFTWARE- ALSO RELEASED FOR ROM"). Three independent legs identify
  this tree as RED: (1) unconditional *runtime* cocktail support — `WDATA EQU $38
  NORMAL SCREEN;($39=FLIPPED)` (`PHR6.SRC:15`), `LDA PIA3 COCKTAIL?` → `SWITCH UPSIDE
  DOWN GUYS` (`DEFA7.SRC:1190-1193`), and a full second `*INVERTED IRQ FOR SCREEN
  FLIP` handler (`DEFA7.SRC:2006-2008`); (2) per-chip `CKBYT CHECKSUM(ACTUAL)` bytes
  present (`DEFA7.SRC:5` et al.), ruling out WHITE; (3) every file in the ROM zip
  matches `ROM_START( defender )` CRC-for-CRC (`williams.cpp:1985-2007`), and MAME
  names that set "Defender (Red label)" parent (`williams.cpp:3968`). Filename
  suffixes (DEFA**7**, PHR**6**) are iteration counters, not labels; `FULL RED
  PRESENT?` (`AMODE1.SRC:878`) is a logo colour test, not a version flag.
- **Board: the pre-blitter Williams framebuffer.** MC6809E at 1.0 MHz (12 MHz master
  /3/4, `williams.cpp:1531,1537`), software-drawn bitmap — no SC1 blitter (that is
  Joust's later board), no tile/sprite ROMs, no colour PROM. **All graphics are inline
  `FCB` tables in the program source** (DEFB6 inline graphics, `SAMEXAP7.SRC`
  explosions/appearances, `BLK71.SRC` terrain + player explosion, `MESS0.SRC`
  character set). The raster playbook's "graphics-ROM decode" phase becomes an
  **image-table transcription** phase, exactly as Joust's jt1 did it.
- **Banked ROM is the structural novelty.** `$D000-$FFFF` is resident; `$C000-$CFFF`
  is a banked window selected by writing the block number to `MAPC EQU $D000 MAP
  CONTROL` (`PHR6.SRC:11`; helpers `MAPCH1/2/3/7`, `DEFB6.SRC:1292-1299`; MAME
  `bank_select_w`, `williams.cpp:505`). Block 1 = attract/hall-of-fame/scanner
  (`AMODE1.SRC`), block 2 = messages/charset (`MESS0.SRC`), block 3 = diagnostics +
  some graphics (`ROMC0/ROMC8`), block 7 = terrain + wave table (`BLK71.SRC`), block 0
  = I/O. Cross-block calls go through the `MLJSR` long-JSR macro (`AMODE1.SRC:39-43`).
  The clone flattens this — banking is provenance, not architecture to port — but the
  dossier must map it or half the citations point into the wrong block.
- **Timebase: nominal 60 Hz / author's "16 msec" tick; exact 60.09615 Hz.** One IRQ
  handler splits on the video beam counter (`VERTCT EQU $C800`, `PHR6.SRC:19`;
  `CMPA #128`, `DEFA7.SRC:1937-1938`): the <128 arm is the vblank-equivalent tick that
  strokes the watchdog and does `INC TIMER` exactly once per frame; the executive
  spins on it (`EXEC0 LDA TIMER / BEQ EXEC0 / CLR TIMER`, `DEFA7.SRC:3048-3050`) with
  an overload path when TIMER>1 (`*OVERLOAD WIPE OUT A GUY`, `DEFA7.SRC:3056-3070`).
  Corroborated three ways: `*A=SLEEP TIME X 16MSEC` (`DEFA7.SRC:9`), `NAPP 60,HOFST
  SLEEP 1 SECOND` (`AMODE1.SRC:311`), and MAME's `set_raw(MASTER_CLOCK*2/3, 512, 6,
  298, 260, 7, 247)` → 8e6/(512×260) = 60.09615 Hz (`williams.cpp:1556`), visible
  292×240 (`williams.cpp:1601`). Defender has **processes with frame-tick naps**
  (SLEEP/KILL/MKPROC, `DEFA7.SRC:12-87`) — the jt2 scheduler pattern, one board
  earlier.
- **Dialect: Williams RASM, and it is NOT Joust's assembler.** `$` hex, bare decimal
  (`YMAX EQU 240`, `PHR6.SRC:20`), **no octal, no binary, no local labels** (probes
  empty); `!>` shift-right / `!.` AND expression operators (`DEFA7.SRC:6`,
  `DEFB6.SRC:1647`); `MACRO`/`ENDM` with `\0,\1` params (`PHR6.SRC:591-594`); `FCC`
  strings in single quotes (`ROMC8.SRC:836` — the copyright line). No conditional
  assembly anywhere in the tree.

## 2. Source gaps (checked inside the files, not just the file list)

| Missing | Verdict |
|---|---|
| **Sound-board source** | The sound board is a separate M6808 (894.886 kHz, `williams.cpp:1540`) running `defend.snd` = `video_sound_rom_1.ic12` (`williams.cpp:2002`) — **no source in the tree**, the same gap Joust's tree has. ROMF8/ROMC0/ROMC8 are main-CPU control/diag ROMs, *not* sound source. The main CPU commands it over 6 PIA lines (`SOUND EQU $CC02`, `PHR6.SRC:18`; `*B0-B5 SOUND`, `PHR6.SRC:132-133`). Ground truth for `df6` = the command values the game writes (cited) + MAME's board model + the `defend.snd` bytes (machine-local); synthesis approach as battlezone/jt5. |
| `ALL.CF` diag chain, and the older iterations the RASM commands name (PHR2, DEFA2, DEFB2, AMODE0) | Build-history gap only; the tree's own files are the successors (`INFO.SRC:3-9`). |
| Decoder PROM source (decoder.2/.3) | Hardware, no source anywhere; MAME documents the 1-vs-2 PROM cocktail-inversion variants (`williams.cpp:29-31`). Irrelevant to a clone that renders the framebuffer directly. |
| `BRUTSUM2.SRC` | **Never shipped** — 19-line dev tool that brute-forces checkbytes in RAM (`ORG $8000`, exits via monitor `JMP [$FF16]`). Documented, not ported. |

## 3. Citation vocabulary (fixed here, enforced by the gate)

One vocabulary: **`` `defender/<FILE>.SRC:<line>` ``** resolving into
`reference/original-source/defender/`. Line numbers are copied only from numbered tool
output (`grep -n`), never from memory or arithmetic. MAME facts are cited
`williams.cpp:<line>` / `williams_m.cpp:<line>` in prose only. Nothing downstream may
introduce a `src/core` constant that is not backed by a claim in `claims/*.json` and
gated by `citations.test.ts`.

## 4. The cabinet roadmap (the complete build sequence)

Defender is a **framebuffer raster** cabinet, so it follows the playbook's phased arc
(`docs/playbooks/next-sprite-game.md`) with the graphics phase in its Joust form
(image-table transcription, no tile-ROM decode) — and it has a **studied sibling arc**:
Joust walked jt1 (foundation) → jt2 (scheduler + enemies) → jt3/jt4 (menagerie +
structure) → jt5 (audio) → jt8-jt11 (hardening + lifecycle). This roadmap binds that
order to *this* machine's file→subsystem map (§1, refined by the `df1` study).
**Pixels before physics, gate before constants, wire last.**

> **Provisional by construction.** Only `df1` is a live sprint shard. `df2`-`df8` live
> here as story-level plans and are **materialized into `sprint/epic-df*.yaml` at each
> epic's own kickoff** — `df1` will resolve OQ-1..OQ-5 and pin constants that sharpen
> every later epic. Points are order-of-magnitude (Joust/millipede burns as the prior).

### `df1` — study + scaffold + fidelity harness *(live; §5)*
Phase 1-2. The dossier, the citation gate, the boot-stable scaffold. **(≈21 pts)**

### `df2` — framebuffer + transcription → pixels on screen
Phase 3 in its Joust form. The render seam (16-colour palette RAM copied to CRAM each
frame by the IRQ, `DEFA7.SRC:1968-1994`; 292×240 visible), the `MESS0` character set,
the `DEFB6`/`SAMEXAP7` object image tables, `BLK71` terrain + mini-terrain data.
Render a static planet surface + text early; **visual playtest for orientation traps
now, before physics** (playbook §4). Leans on: jt1's image transcription stories,
`@shared/font` conventions. **(≈18 pts)**

### `df3` — the ship + the scheduler *(the novel-heavy epic)*
Phase 4a. The process scheduler core (SLEEP/KILL/MKPROC, `DEFA7.SRC:12-87`) with the
16-msec nap tick; player ship velocity/thrust/reverse (`VELO`), the scrolling
wrap-around world coordinate system, stars, laser fire. The world-wrap + camera model
is Defender's hardest coordinate problem — design it in core from day one. Leans on:
jt2's scheduler port (pattern only — re-derived and re-cited from this tree). **(≈24 pts)**

### `df4` — the menagerie
Phase 4b. One cited reducer per enemy: landers + humanoid abduction and mutants,
bombers, pods/swarmers, baiters (the `DEFB6.SRC` enemy processes; UFO at
`DEFB6.SRC:1`), materialize/explode effects (`SAMEXAP7.SRC` — "SAM EXPLOSIONS AND
APPEARANCES"), collision (`COLIDE`, `DEFA7.SRC:2907`). **Accessibility ruling (the
standing exception to ROM-always-wins):** the original's smart-bomb and death effects
flash the full screen — the owner has photosensitive epilepsy, so these become
freeze/fade/particle effects, decided *here*, not retrofitted. **(≈21 pts)**

### `df5` — game structure + scanner
Phase 4c. Waves (`WVTAB`, `BLK71.SRC:82-90` vectors), scoring + extra men, smart
bombs, hyperspace, humanoid rescue/fall/planet-explodes-to-mutant-space, 2P handoff
(`DEFA7.SRC:1182-1241` — the cocktail *flip* itself is documented, not ported), game
over; the **scanner** (radar viewport, `SCNR` via `AMODE1.SRC:113-115` vectors) —
gameplay-critical, not HUD garnish. High-score table via `@shared/highscore` +
`@shared/name-entry` (hall of fame, `AMODE1.SRC` `HALLOF`); CMOS ledger
(`ROMF8.SRC:16-38`) maps to one-origin `localStorage`. **(≈24 pts)**

### `df6` — sound
Phase 5. The absent-source epic (§2): pin the 6-bit sound command values the game
writes (`SOUND EQU $CC02`), then synthesize each effect informed by MAME's board model
and the `defend.snd` bytes — the battlezone/jt5 synthesis approach, behind the fleet's
core event-channel audio seam. Gate audio on first gesture. **(≈13 pts)**

### `df7` — phase machine, attract, wiring, HUD, showcase
Phase 6-7. Attract mode + hall of fame (`AMODE1.SRC`, block 1), the
attract→play→death→game-over phase machine (pure first, wired after — pm4/mc6 model),
HUD, lobby-showcase opt-in, and the **visual playtest** for coordinate/colour/scanner
correctness. No full-screen strobe anywhere (the §`df4` ruling). **(≈18 pts)**

### `df8+` — hardening / mutation batteries
Phase 8. Reviewer-driven; expect it to *file* stories, grouped by **file surface**
(the jt9 gotcha). Open-ended.

**The one to watch:** `df3`'s wrap-around world + camera + scanner coordinate system —
no sibling has one (Joust is single-screen). Everything else has a Joust analog, a
playbook seam, or a `@shared` consumer to copy.

---

## 5. `df1` — the epic this design opens

**Goal:** produce `plugins/defender/docs/rom-study/` (the dossier every later `df*`
story cites) **and** the boot-stable scaffold + citation gate, folded into one epic as
pac-man's `pm1` and millipede's `ml1` did. Definition-of-done is the playbook's DoR
rows through the citation gate — *not* game logic.

**Standing rules for this epic**
- Reuse-first: consume `src/shared/`; copy the four-file scaffold from
  `plugins/joust/`; port **millipede's** `tools/audit/check-citations.mjs` (it already
  carries the ml1-1 review hardening — containment fix, mutation-tested batteries).
- The citation gate + `src/core` purity test are committed **before the first game
  constant**.
- Every claim re-opened before the epic closes (the centipede drift lesson: verbatim
  right, line numbers drifted by one on both test runs).

### Stories (first cut — TEA/PM refine)

- **`df1-1` — Citation gate + purity test first (TDD).** Port millipede's
  single-sided checker + `citations.test.ts` (fails on any uncovered prose citation)
  + the `src/core` purity scan. Committed before any constant. (5 pts)
- **`df1-2` — `brief.md`: the five preflight answers, each cited.** Revision (RED
  ledger legs, §1), what shipped (the file→chip/block map incl. the never-shipped
  `BRUTSUM2` and the sound-source gap), dialect conventions, timebase (nominal vs
  exact as separate numbers), `INFO.SRC` author documentation. All citations re-opened
  under the `df1-1` gate. (5 pts)
- **`df1-3` — `glossary.md` + `subsystems.md` + `open-questions.md`.** Author names →
  plain English (PHRED/MAPC/CKBYT/MLJSR/NAPP; the per-author message blocks
  `* EUGENE'S VECTORS` / `* SAM'S VECTORS`, `MESS0.SRC:165,175`); subsystem → owning
  file + routine + line (§1 skeleton, deepened per file); OQ-1..OQ-5 below. (3 pts)
- **`df1-4` — Secondary source: MAME board facts as claims.** Clocks, exact refresh
  60.09615 Hz derivation, visible area, banked-ROM model, VA11/COUNT240 IRQ
  generation (resolve OQ-1/OQ-2), the WDOG decode (OQ-4), decoder-PROM variant note.
  MAME cited in prose, never copied (GPL). (3 pts)
- **`df1-5` — Four-file scaffold + three registrations → boots black canvas at
  `/defender/`.** Copy `plugins/joust/`; add `defender` to `justfile` `games` and
  `vitest.config.ts` `GAMES`; `npm run gen:registry`; update the
  `tests/monorepo-topology.test.mjs` game-count pin. Green project suite + lint;
  visual boot check at `http://127.0.0.1:5270/defender/` against a nonsense control
  path. (5 pts)

### Open questions carried into the dossier

- **OQ-1 — CB1 vs CB2.** `PHR6.SRC:135` comments `*CB2 IRQ`, but MAME wires VA11 to
  **CB1** (`williams_m.cpp:27-28`) and the handler's CRB values ($04/$05) fit CB1.
  Implement the CB1 model; record the source comment as a likely author slip.
- **OQ-2 — COUNT240/CA1 enablement.** Is the CA1 interrupt enabled in game mode, or
  does the handler distinguish phases purely by polling `VERTCT`? Decode the RESET PIA
  setup (`ROMF8.SRC:64+`).
- **OQ-3 — defend.3 upper-half packing.** DEFB6 tail + ROMF8 (`ORG $FB00
  TEMPORARY!!!!!!`) + SAMEXAP7 (`$FC60`) co-load into $F800-$FFFF; byte boundaries
  unproven without assembling ("BEWARE OF ORDER OF LOADING", `INFO.SRC:8`).
- **OQ-4 — WDOG address model.** Source strokes `WDOG EQU $C3FC` with $38/$39
  (flip in bit 0); MAME decodes $C3FC via the $C010 mirror into `video_control_w` but
  puts `watchdog_reset_w` at $C3FF only. Reconcile before the watchdog/flip seam.
- **OQ-5 — the $D000 2716 split.** The ledger calls the 2×2716-at-$D000 re-cut GREEN
  (`INFO.SRC:17-18`), yet the RED parent set also ships 2K chips there. Presumably RED
  inherited the split; the ledger never says so. Provenance note only.

---

## 6. Handoff

`df1` is groomed and ready for `/pf-sm`. The dossier it produces is handed verbatim to
every later `df*` story and, once code exists, to `rom-fidelity-audit`. Sibling assets
to copy, not reinvent: millipede's `docs/rom-study/` layout and hardened
`tools/audit/check-citations.mjs`, joust's four-file scaffold and image-transcription
story shapes, and the `src/core` purity test every game carries.
