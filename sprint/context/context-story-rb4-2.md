# Story rb4-2 Context

## Title
RETRACT THE POISONED DOC — it cites the decoy build R2BRON.MAC and misreads hex as decimal

## Metadata
- **Story ID:** rb4-2
- **Type:** bug
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** red-baron
- **Epic:** Red Baron — ROM fidelity against the original 1980 Atari source

## Problem
Cluster C2. Subsumes EN-001, CD-013, CD-014, OB-013, RD-016, FL-002, FL-003, SN-003, MI-010. Run ALONGSIDE rb4-1 — this doc is the CAUSE of rb4-1, it is cited as authority in code comments across src/, and until it is fixed it will re-infect every future Red Baron story. It sources its enemy facts to R2BRON.MAC, a build that never shipped; it states its own radix rule correctly and then breaks it; its watchdog claim is off by 21x (CALFLG>=3, not >=0x40); three of its §1 line citations are off by one AND one of them is copied verbatim into src/core/timing.ts:18. It also mislabels the LOD as a 'distance LOD' — which is where biplane.ts's invented LOD_DISTANCE=1500 came from.

## Technical Approach

### The primary source is vendored — read it, don't trust the doc
`red-baron/reference/red-baron/` holds the Atari source as a byte-of-record.
Nothing in this story may be sourced to anything else.

- **SHIPPED (the only citable build):** `RBARON.MAC`, `RBGRND.MAC`, `RBSOUN.MAC`,
  `RBCOIN.MAC`, `RBINT.MAC`, `RBROM.MAC`, `VGUT.MAC`, `TCN65.MAC`, `VGMC.MAC`,
  `037007.*` / `037006.*` (the picture/char ROMs).
- **DECOY (must not appear anywhere):** `R2BRON.MAC`, `R2BRON.MAP`, `R2BRON.COM`,
  `R2GRND.MAC`. R2BRON is identical to RBARON but for 14 lines; R2GRND differs from
  RBGRND in TWO (`FRMECNT=5` vs `4` → 50 Hz vs 62.5 Hz); R2BRON's own load map names
  its object module `RBARON`, which is exactly how it got mistaken for the ship build.

**Line-number trap:** these files are CRLF/mixed. Count lines with Python
`open(..., newline=None)` (universal newlines) or every citation shifts. The off-by-one
citations in the doc are the symptom of getting this wrong.

**Radix:** `RBARON.MAC` is `.RADIX 16` from line 74. The ONLY decimal island is
`:6217-6280` (the vertex table). A trailing period forces decimal inside a hex region
(`CMP I,250.` is 250, not 592). rb4-1 already swept the *code* for this; rb4-2 sweeps
the *doc* that caused it.

### The blast radius is bigger than the doc
The doc is cited as authority in code comments, and the decoy build name has been
copied into `src/` verbatim. Known infection sites (grep `R2BRON|R2GRND|source-findings`):

| File | What is wrong |
|------|---------------|
| `src/core/timing.ts:18` | `RBARON.MAC:620` — off by one; CALCNT is `:621` |
| `src/core/topology.ts:292,365` | cites `R2GRND.MAC` / `R2BRON.MAC:3880-3902` |
| `src/core/blimp.ts:8` | cites `R2BRON.MAC:4165+` |
| `src/core/lives.ts:9,15,38` | cites `R2BRON.MAC:1055-1210`, `:1215-1291`, `INITLF` |
| `src/core/flight.ts:9,14,16,18,23,42` | cites `R2BRON.MAC` six times |
| `src/core/enemy.ts:83` | cites `biplane.ts`'s LOD_DISTANCE as authority |

Each citation must be **re-resolved against the shipped build** — the same symbol at the
correct file and line — not merely string-replaced `R2BRON` → `RBARON`. The two builds
differ; a blind rename would launder the decoy into the ship build.

### Suggested verification seam (TEA's call)
The durable way to make this story *stay* fixed is an executable **citation checker**:
resolve every `FILE.MAC:NNN` reference — in the doc AND in `src/` comments — against the
vendored source and assert the named symbol is actually on that line, and that no
`R2*` build is referenced anywhere. That turns "the doc is true" into a test that fails
the next time someone cites the decoy. Shape is TEA's to design.

## Scope
- **In scope:** `docs/red-baron-1980-source-findings.md` (re-source, header, radix rule,
  line citations, retract the "distance LOD" claim), and the `src/` **comments** that
  cite it — re-pointed at the ROM (file:line + radix) or at the audit.
- **Open scope question for TEA:** AC5 retracts the doc's *"distance LOD"* claim (the ROM
  picks the plane model on `PLSTAT+6` bit `0x10` — "PLANE ROTATED"/"FACING AWAY" — with no
  distance test anywhere in the picture path). But `src/core/biplane.ts` still *implements*
  a distance LOD (`LOD_DISTANCE`, re-derived under rb4-1 Reviewer finding 4). Ripping out
  the behaviour is a separate story; this one retracts the false ROM claim and stops the
  code from citing it as authority. Confirm that boundary before writing tests against
  `biplane.ts` behaviour.
- **Out of scope:** re-tuning game behaviour. rb4-1 landed the numeric sweep; do not
  re-baseline it here.

## Acceptance Criteria
- Every fact in docs/red-baron-1980-source-findings.md is re-sourced to the SHIPPED build (RBARON/RBGRND/RBSOUN/RBCOIN/RBINT/RBROM/VGUT + TCN65/VGMC + 037007/037006) or deleted. Zero references to R2BRON/R2GRND remain.
- The doc carries a loud header naming the decoy trap: R2BRON.MAC is identical to RBARON.MAC but for 14 lines, R2GRND differs from RBGRND in TWO (FRMECNT=5 vs 4 → 50 Hz vs 62.5 Hz), and R2BRON's own load map identifies its object module as 'RBARON'.
- The radix rule is stated ONCE, correctly, with the per-region table — and every constant in the doc is written with its radix explicit.
- The off-by-one line citations are fixed, INCLUDING the one copied into src/core/timing.ts:18 (CALCNT is RBARON.MAC:621, not :620).
- The 'distance LOD' claim is retracted: the ROM selects the plane model on PLSTAT+6 bit 0x10 ('PLANE ROTATED'/'FACING AWAY'), not on distance. No distance test exists anywhere in the picture path.
- Every code comment in src/ that cites the doc as authority is re-pointed at the ROM (file:line + radix) or at the audit.

---
_Generated by `pf context create story rb4-2` from the sprint YAML._
