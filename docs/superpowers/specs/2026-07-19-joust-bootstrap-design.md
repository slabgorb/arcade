# Joust — pre-implementation bootstrap design

2026-07-19. Approved by the user before execution. This is the *bootstrap*
design — repo founding, source vendoring, ground-truth dossier. The **clone
design spec** (rulings, architecture, roadmap, epic jt1) is a separate document
written after the ROM study, facts in hand, at
`joust/docs/superpowers/specs/` — the centipede precedent
(`centipede/docs/superpowers/specs/2026-07-18-centipede-clone-design.md`)
applied to the arcade's first Williams machine.

## Scope ruling (user)

Full pre-implementation bootstrap in one session: subrepo + remote, orchestrator
registration, vendored source, `rom-source-study` dossier, then rulings → clone
design spec → seeded first epic. No scaffold, no code — story jt1-1 creates the
Vite/TS/Vitest scaffold (cp1-1 precedent).

## The four movements

**1. Identity & registration** (orchestrator, this commit)

- Subrepo `joust/` — remote `github.com/slabgorb/joust`, default branch
  `develop`, gitflow, bootstrap commit = README + .gitignore only (centipede
  precedent, commit `83ac539` there). Founded via a `bootstrap` branch + GitHub
  API ref-create because pf's branch-protection hook rightly refuses direct
  `develop` pushes and an empty repo cannot receive a PR.
- `repos.yaml`: joust registered pre-implementation; centipede's stale
  "pre-implementation" record corrected in passing.
- CLAUDE.md: seven games, joust in the structure tree, port **5279 reserved**.
- Deliberately *not* touched: `justfile` lists (flip with jt1-1) and
  `docs/ops/hosting.md` / R2 bucket `arcade-joust` → `joust.slabgorb.com`
  (provisioned at the ship epic).

**2. Source vendoring**

- `reference/williams-source/joust/` — new `williams-source/` lineage beside
  `atari-source/`. Verbatim copy of
  [historicalsource/joust](https://github.com/historicalsource/joust), pinned
  `9bcfdb1` ("Prepare to Joust"), 49 files. Already LF/ASCII (no CR
  normalization needed, unlike star-wars). `*.PIC` files are Motorola
  S-Records — image data, vendored verbatim.
- MAME sparse checkout at `~/Projects/mame` extended:
  `src/mame/williams/` (williams.cpp, williams_v.cpp, williamsblitter.cpp …)
  + `src/mame/shared/` (williamssound.*). Williams drivers live under
  `williams/`, **not** `midway/` — first assumption corrected in execution.

**3. Ground-truth dossier** — the `rom-source-study` skill produces
`joust/docs/rom-study/` (brief, subsystems, glossary, pictures,
open-questions), citations claims-ready for jt1's citation-checker story.
Known questions going in: which revision shipped (`JOUSTRV1–RV4.SRC`,
`T12REV1/3`, `TB12REV1/3`); the 6809 timebase; the blitter ("Special Chip")
division of labor; and the fact that the **sound board source is absent** —
`JOUSTSND.DOC` says only `SEE [LIBRARY.SOUND]VSNDRM4.SRC`, so sound ground
truth will lean on `williamssound.*`/ROMs (open question for the dossier).

**4. Rulings, spec, epic** — brainstormed *after* the dossier: 2-player
simultaneous co-op (Joust's soul — would be an arcade first), controls
(left/right + flap), faithful-raster identity, sound deferral. Output: clone
design spec in the joust repo + epic **jt1** seeded at the orchestrator.
