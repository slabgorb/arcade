# Battlezone (1980) — primary-source fidelity audit

**Date:** 2026-07-17
**Trigger:** ROM sweep requested to complete the fleet (tempest, star-wars, red-baron already audited).
**Method:** the `rom-fidelity-audit` skill — preflight → citation checker → 11 paired auditors →
coverage review → adversarial refutation → clustering.
**Source:** the preserved 1981 Atari assembler source for the 1980 cabinet (LF copy at
`~/Projects/battlezone-source-text`, read-only, copyrighted, never in this repo; the CRLF sibling
`~/Projects/battlezone-source` is **not citable**). Vendored from `historicalsource/battlezone` @ `38d0b07`.

The machine-checked half of this audit is `docs/audit/findings/pair-*.json` (161 findings, every
citation byte-verified on both sides by `npm test -- citations`) plus `docs/audit/plan.md`
(preflight ground truth), `docs/audit/coverage-review.md`, and `docs/audit/verdicts/` (refutation).

---

## The answer, in one paragraph

Battlezone's clone is **structurally excellent and numerically off in one systematic way**, and that
way is **the timebase, not the radix** that broke its sibling red-baron. `movement.ts` and
`firing.ts` hard-code `FRAMES_PER_SEC = 60`, but the cabinet's game frame is **64 ms = 15.625 Hz**
(the NMI fires at 250 Hz and `SYNC` is bumped every 16th interrupt — the author's own comment reads
"END OF FRAME (64 MS)"). The consequence is **not a uniform 3.84× everywhere**, which is the subtle
part the refutation pass corrected: the player tank *turns* 3.84× too fast (a pure per-frame
quantum), *drives forward* only 1.96× too fast (because `FORWARD_STEP` was **also** under-scaled,
48 where the ROM's sine table gives `0x5E = 94`, the two errors partly cancelling), and *fires*
shells at nearly the right speed (~4% slow, because the shell integrator already sub-steps 4× per
frame). Fixing this is therefore a careful per-quantum rebase, not a one-line constant change — and
it must land first, because every other numeric finding is measured against it. Everything else is
comparatively small: the enemy AI is too passive (the ROM tank charges on a 50/50 coin flip where
the clone pursues 30% of the time), the radar doesn't sweep-gate its blips, the mountains/moon/
volcano are authored approximations of hand-drawn ROM geometry that was in the quarry all along, and
several ROM sound cues are simply missing. What the clone gets *right* is remarkable: **all 10 3D
models are byte-exact ROM decodes**, and scoring, message wording, and the BCD kill-values are
almost entirely faithful (94 CONFIRMED findings).

---

## 1. The three traps, and which ones bit

### Trap 1 — the shipped-file set. **Avoided.**

`BZONE.MAP`'s link string is the authority, not the directory listing:
`BZMTNS, BZONE, BZSOUN, VGUT, BZSTST` (+ `VGMC`, `MBDIAG` via `.INCLUDE`). The quarry is littered
with plausible decoys that **never shipped in the game binary** — the citation checker rejects a
citation to any of them outright, and **zero of the 161 findings cite one**:

| Decoy | Why it must never be cited |
|---|---|
| `COIN65.MAC` | On disk, but the game `.INCLUDE`s **`TC65`** (BZONE.MAC:1238), not COIN65. COIN65 is the *successor* coin routine ("ALL NEW PROGRAMS SHOULD USE THIS") — it looks authoritative and is code the cabinet never ran. |
| `BZSADG.MAC` | Stand-alone VG diagnostic (own `.ASECT`/`.=0` org, `MAXTST=5`). Absent from the link string. |
| `STATE2`, `VCRMAN` | AVG state-PROM / autonormalizing build utilities. Absent from every link. |
| `MBUCOD.V05` | Math Box 2901 microcode — real silicon, but ported in `@arcade/shared/math3d`; here we audit only battlezone's usage sites. |
| `DLXAST.SAV` | A stray Deluxe Asteroids binary. Not battlezone at all. |

**Dead conditional-assembly block:** `BZONE.MAC:40–148` is `.IF EQ,1 … .ENDC` — it never assembled.
A glossary of the data structures, worthless as evidence of a shipped value.

### Trap 2 — the radix. **Mostly avoided; one BCD subtlety it turned into a save.**

`.RADIX 16` is the default, with **decimal islands**, and it flips **region by region**:

| File | Regions |
|---|---|
| `BZONE.MAC` | `:3` → **16** · `:4878` → **10** (the `DATA STRUCTURES` obstacle/geometry tables) |
| `BZMTNS.MAC` | `:3`,`:8` → **16** · `:240` → **10** · `:460` → **16** · `:501` → **10** · `:839` → **16** |
| `BZSOUN.MAC`, `VGUT.MAC` | `:2` → **16** |
| `BZSTST.MAC` | `:21` → **16** · `:622` → **10** · `:647` → **16** |

A trailing period forces a decimal literal inside a hex region (`LDA I,-127.` = −127). The
`.MWORD ..A,..B,..C` macro (BZONE.MAC:4879) pre-multiplies its operands `.NWORD ..A*4,..B*4,..C*2`.
Every auditor computed the governing radix by backward scan and decoded the macros — **no finding
misread a hex constant as decimal**, the error that produced ~30 wrong constants in red-baron.

The radix's teeth showed up instead in **scoring, where it is BCD**: `MISLVL: .BYTE 5,10,20,30` in a
hex region reads naively as {5,16,32,48}, but `HITS` is a BCD counter shown with three fixed trailing
zeros, so `0x10` is BCD 10 and the band is exactly {5,10,20,30}K — confirming, not breaking, the
clone's pin. The same BCD logic **saved a correct value from being "fixed"**: see B-026, below.

### Trap 3 — the timebase. **This is the bug.** Never 60 Hz. Battlezone has **three clocks**:

| Clock | Derivation | Rate |
|---|---|---|
| Hardware NMI | NMI handler `INC $INTCT`; `AND I,0F / BNE` gates `INC SYNC` every 16th NMI (BZONE.MAC:1084–1088), comment "END OF FRAME (**64 MS**)" ⇒ 64/16 = 4 ms | **250 Hz** |
| **Game frame (the sim)** | `MAIN: LSR SYNC` (BZONE.MAC:422) blocks the main loop on `SYNC` | **15.625 Hz — a 64 ms step** |
| Vector display refresh | NMI tail `DEC VTIMER … STA GOADD ;START UP VECTOR GENERATOR FOR 24 MS.`, `VTIMER←6` (BZONE.MAC:1216–1235) | **41.67 Hz — 24 ms (NMI/6)** |
| Sound driver | `JSR MODSND` runs **inside** the NMI | **250 Hz — envelopes count NMIs** |

Every piece of game motion advances once per **64 ms**. The clone advances the sim in fixed
`1/60 s` sub-steps via `@arcade/shared/loop`; that step *rate* is behaviour-neutral (dt integrates
as a per-second rate), but the **conversion constant** `FRAMES_PER_SEC = 60` is not — it is the bug.

---

## 2. Scorecard

| | |
|---|---|
| Findings | **161**, every one citing both sides byte-for-byte |
| `CONFIRMED` (we match) | **94** |
| `DIVERGENCE` | **33** |
| `NO_COUNTERPART` (in the arcade, absent from us) | **19** |
| `STRUCTURAL` (float/dt vs integer/NMI — accepted) | **13** |
| `BOOK_WAS_WRONG` (our own findings doc) | **2** |
| Attacked by refuters (DIVERGENCE + BOOK_WAS_WRONG) | **35 → 35 survived, 0 killed, 6 materially corrected** |
| Killed by the Phase-3 coverage review | **1** (`B-026`, a false BOOK_WAS_WRONG) |
| Recommended `fix` (survivors) | **36**, ~78 raw points → **13 clusters** (below) |

A **zero refutation-kill rate with six corrections is the healthy signature here**: the citation gate
had already removed fabrications, and the coverage review had already killed the one false finding, so
what reached the refuters failed only by *degree* (overstated ratios, wrong sizes), not by existence.

---

## 3. What the secondary sources got wrong

The clone was built from `docs/battlezone-1980-source-findings.md` (a 6502disassembly.com + rev2
ROM-byte-decode distillation) — a *claim*, not authority. It walked out remarkably clean (27 of 30
doc claims CONFIRMED) because it was reworked against a real byte-decode. Three corrections:

| Item | What was wrong | Truth |
|---|---|---|
| **B-028** (BOOK_WAS_WRONG) | Doc: DSW0 language `01`=French, `10`=German | `LNGTBL` (indexed 2×bits⟨7:6⟩) orders English/German/French/Spanish → `01`=**German**, `10`=**French**. Reversed. Immaterial to gameplay. |
| **H-001** (BOOK_WAS_WRONG) | The audit's *own* preflight glossed `BATBL` as "the mountain-scape table" | `BATBL` (object `0x17`) is the **"BATTLE" title-logo object**; with `TLETBL`/`ZONTBL` it spells BAT-TLE-ZON(E) (`LOGOBJ: .BYTE 17,80,1E,80,1F,80`, BZMTNS.MAC:846). The real ridge is `MTNS`/`MTN0–7` (BZMTNS.MAC:11–183). The plan was corrected mid-audit so no phase inherited it. |
| **B-026** (killed) | Doc-reconcile filed "bonus tank awards at 14K, clone is 1000 late" | **False.** `NEWLIF`'s `CMP HITS / BCS` boundary is strict-greater, and all scores are whole thousands, so the award lands at exactly 15000 — where the clone puts it. The coverage review + a `NEWLIF` re-trace reclassified this CONFIRMED; acting on it would have corrupted a correct value. |

---

## 4. Findings by subsystem

Full evidence is in `docs/audit/findings/pair-<subsystem>.json` — each finding carries both citations
byte-for-byte, a claim with unit arithmetic, and (for the 35 attacked) a refuter verdict. Summary of
where the clone stands, per pair:

| Subsystem | File | Divergences of note | Confirmed faithful |
|---|---|---|---|
| Cadence | `pair-cadence` | the 60 Hz mis-scale (C-001); missing direction-flash (C-004/005) | loop shape, one ordered pass/tick |
| Tank motion | `pair-tank-motion` | turn 3.84× fast (M-001), forward 1.96× (M-003) | turn quantum 2π/512, 2:1 throttle, pivot law |
| Enemy AI | `pair-enemy-ai` | attack-passive (E-002) + its 4 compensations; super-tank +1 (E-010) | +1000/death BCD, 16.3 s ramp, evade flank |
| Missile/saucer | `pair-missile-saucer` | 40%→50% missile odds (R-008); saucer wander/timing | kill/appearance scores, kamikaze contact model |
| Combat | `pair-combat` | per-type collision tables flattened (F-006/7); explosion particles (F-008) | shell lifetime `0x7F`, 4 sub-steps, one-shell gate |
| World/3D | `pair-world-3d` | **0 divergences**; missing radar dish + treads (W-017/18) | **all 10 models byte-exact**; 21-obstacle table; projection |
| Horizon | `pair-horizon` | ridge/moon/volcano authored not ported (H-002/3/6/8) | flat horizon line, infinity backdrop tracks heading |
| Radar | `pair-radar` | sweep 34% slow + not sweep-gated (D-001/2/3/5) | blip direction = bearing; saucer/obstacles excluded |
| Score/HUD | `pair-score-hud` | 'HIGH SCORE'→'GREAT SCORE' (S-020); missing directional callout (S-021) | **19 CONFIRMED** — all kill values, all message wording |
| Sound | `pair-sound` | 5 missing/wrong cues (WARNG/RBEEP/BOING/BONER/DISINT) | explosion, cannon, saucer warble, engine gating |
| Doc-reconcile | `pair-doc-reconcile` | language codes reversed (B-028) | 27/30 doc claims match the real ROM |

---

## 5. Limitations (recorded, not audited)

- **Absent from the quarry** (shipped but not present, so uncitable): `VGAN`, `TC65`, `ASCVG`,
  `COND65`. Any behaviour owned solely by these (notably the exact `TC65` coin logic) is unaudited.
- **Math Box microcode** (`MBUCOD`) is out of this repo's scope — it is an `@arcade/shared/math3d`
  audit. World-3d finding W-011 (the vertical ×2 rescale compensating the Math Box's X/Z halving)
  should be confirmed by whoever audits that port; it could not be closed from battlezone alone.
- **Analog/discrete sound**: the cabinet's sound is POKEY + discrete circuits; the clone is runtime
  synthesis. Sound findings compare **trigger logic and envelope shape/timing**, not waveforms.
- Coin door, self-test (`BZSTST`/`MBDIAG`), and DIP operator options are out of scope; the one
  DIP-dependent constant (missile threshold) is pinned to the community DIP table, verified honest.

---

## 6. Ruling sheet — 13 clusters

Raw findings over-count (36 fix-findings ≈ 78 points filed 1:1). Merged, they are **13 changes**.
Points: s≈1, m≈3, l≈5. **Rule each: fix / accept / won't-fix.** Nothing is filed as an epic until you do.

**C1 must land first** — it is the timebase rebase, and every other numeric cluster (C2, C4, C7-D001)
is measured against it. **C5 (particle subsystem) precedes C6 (volcano)**, which reuses it.

| # | Cluster | Subsumes | Size | Depends on | Your ruling |
|---|---|---|---|---|---|
| **C1** | **Timebase rebase** — `FRAMES_PER_SEC 60→15.625`; re-derive per-quantum: turn ÷3.84, `FORWARD_STEP 48→0x5E=94` (net forward ÷1.96), shell already sub-stepped (~4%, leave). Expect the whole magnitude suite to re-baseline — that is the point. | C-001, M-001, M-003, F-004 | **L** | — (first) | ☐ |
| **C2** | **Enemy AI aggression** — restore attack-dominance (50/50 coin to attack) and retune its compensations *together*: fire cone 6.9°→~2.8°, turn 34/59→22/44°·s⁻¹, spawn arc fixed ±90°→score-scaled ±21°→±178°, add the `TDIST≥0x24` rookie fire-restraint. | E-002, E-004, E-009, E-011, E-013 | **M** | C1 | ☐ |
| **C3** | **Spawn probability & roster** — missile-vs-tank odds 0.4→0.5 (fair coin); super tank one missile later (`NOR2D3` is "missiles−1", so the 6th not the 5th). | R-008, E-010 | **S** | — | ☐ |
| **C4** | **Per-type collision tables** — replace the one reused Euclidean tank-circle with the ROM's distinct proximity tables: tank-vs-obstacle `PROXTB` (832/832/1024/960), shell-vs-obstacle `PRXTBL` (56/88/86, with the `>>2` range shift). | F-006, F-007 | **M** | C1 | ☐ |
| **C5** | **Explosion debris particles** — a reusable 6-piece gravity particle subsystem (`IZVEL` launch 55,40,70,88,40,66; `GRAVTY=−4`; physics-driven termination) replacing the fixed 1.5 s timer. | F-008 | **L** | C1 | ☐ |
| **C6** | **Volcano** — the ROM has an *eruption* (rock ejecta on the C5 particle system), not the clone's static cone silhouette; wire the `VOLCNO` ejecta and drop the invented cone. | H-006, H-008 | **M** | C5 | ☐ |
| **C7** | **Radar sweep mechanism** — make the scanner actually sweep: gate each blip to the arm's trailing window (`0x0C`≈16.9°), add afterglow decay (`0xF0`, −8/frame ≈ 1.92 s), correct the sweep rate (`+0x0B`/frame → 1489 ms/rev, not 2000), and drop blips past max range (`TDIST≥0x80`). | D-001, D-002, D-003, D-005 | **L** | C1 (D-001 rate) | ☐ |
| **C8** | **Mountain & moon geometry** — port the hand-authored ridge `MTN0–7` (BZMTNS.MAC:11–183, `.RADIX 16`) and the moon embedded in `MTN0`, replacing the procedural two-sine profile. | H-002, H-003 | **L** | — | ☐ |
| **C9** | **Collision BOUNCE** — the ROM's `BOUNCE` event jolts the view *and* bobs the mountains vertically on a hard obstacle hit; the clone has neither. One mechanic, two visible effects. | M-009, H-007 | **S** | — | ☐ |
| **C10** | **Missing / wrong audio cues** — add the ROM synth cues the clone lacks: `WARNG` enemy-in-range alarm, `RBEEP` radar sweep beep, `BOING` obstacle bump, `BONER` bonus-tank bell, and the `DISINT` zap layer on saucer kill (~104 ms, high-priority). | U-008, U-009, U-010, U-012, U-014 | **M** | — | ☐ |
| **C11** | **Off-axis enemy prompts (visual)** — the ROM flashes an `ENEMY IN RANGE` (≈3.9 Hz) and a directional `ENEMY TO LEFT/RIGHT/REAR` callout; the four strings already exist in `text.ts` but only two are ever emitted. (Audio twin is C10's WARNG.) | C-004, C-005, S-021 | **M** | — | ☐ |
| **C12** | **Enemy tank model detail** — every ROM enemy tank draws a rotating radar antenna (`RDRTBL`/`RDROBJ`) and animated treads (`TREAD4–TREADB`) as separate objects; the clone renders neither. | W-017, W-018 | **M** | — | ☐ |
| **C13** | **HUD & doc text** — initials-entry banner `HIGH SCORE`→`GREAT SCORE` (the constant exists, unused); correct the reversed language-code note in the findings doc. | S-020, B-028 | **S** | — | ☐ |

**Total if all ruled fix: ~41 points across 13 clusters** (vs 78 raw). Schedulable as a ~10–13 story epic.

Deliberately **not** in the ruling sheet (recorded as `accept`/`STRUCTURAL`): the planar-sim collision
shape (F-005), the single-blip radar (D-004), the two-state engine hum vs continuous ramp (U-005), the
`1/60` step rate itself (behaviour-neutral), and the 3D buzz-bomb altitude swoop (R-010, planar descope).

---

*Recommendations only. The user rules each cluster fix / accept / won't-fix; only ruled-fix clusters
become the `bz3` remediation epic.*
