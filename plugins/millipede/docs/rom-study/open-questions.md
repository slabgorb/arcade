# Open questions — Millipede ground truth (OQ-1..OQ-4)

The four gaps the `rom-source-study` preflight (`brief.md`) left OPEN. Each is
scoped to the story that closes it; nothing here is settled on faith.

## OQ-1 — the exact refresh rate

`brief.md` answer (2) established the timebase ARCHITECTURE: game logic runs once
per video frame, the VBLANK interrupt being one of the four-per-frame IRQs the
interrupt spec names (`MLDEF.MAC:31`). The EXACT refresh rate in Hz is **not**
stated anywhere in the source and is deliberately left OPEN here — it is resolved
in **ml1-4** from board geometry and the MAME driver cross-check, **not** inherited
from Centipede on faith. Millipede runs on a revised Centipede board, so the two
rates may differ; do not assume they match until ml1-4 measures it.

## OQ-2 — the missing design document `MILLI.DOC`

The ROM sign-off ledger names a design document, `MILLI.DOC`, at `368X1.DOC:39`,
but that file is **absent** from the vendored tree. This is a missing SECONDARY
document, not a ground-truth gap: scoring and behaviour ground truth live in the
code tables (`brief.md` answer (3)), not in the design doc. Whether a copy of
`MILLI.DOC` survives elsewhere is open.

## OQ-3 — graphics and RAM-driven colour

The shipped set (`368X1.DOC:23`) lists program and picture EPROMs but **no colour
PROM** — a real board difference from Centipede, whose colour comes from a PROM.
Millipede therefore drives colour from **RAM**, initialized by `CLRCH`
(`MLIRQ.MAC:242`). The full graphics and colour-RAM wiring — the 8×8 stamps, the
palette layout, how the RAM colour is loaded per wave — is studied in ml2; only
the *mechanism* (RAM, not PROM) is settled here.

## OQ-4 — trackball vs joystick input

The input routine is `JOYS` (`MLIRQ.MAC:897`, `.SBTTL JOYS - READ AND RESPOND TO
JOYSTICKS`), which reads the joystick. Millipede cabinets shipped in both trackball
and joystick variants; which input path the code services by default, and exactly
how the trackball counters are read and integrated, is OPEN pending the input
study. The routine at `MLIRQ.MAC:897` is the entry point that study starts from.
