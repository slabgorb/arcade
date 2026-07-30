# Battlezone primary-source audit — coverage review (Phase 3)

**Reviewer pass over all 161 findings in `docs/audit/findings/pair-*.json`.**
Citations were already verified byte-for-byte by the checker (not re-checked here);
individual DIVERGENCE/BOOK_WAS_WRONG claims are the refuters' job (not judged here).
This pass covers only what neither can see: false CONFIRMEDs, cross-pair
contradictions, scope gaps, honest filing, sizing/fragmentation.

## Tally & class distribution

| File | Total | CONFIRMED | DIVERGENCE | STRUCTURAL | NO_COUNTERPART | BOOK_WAS_WRONG |
|---|---|---|---|---|---|---|
| cadence (C) | 10 | 2 | 2 | 3 | 3 | 0 |
| combat (F) | 9 | 3 | 5 | 0 | 1 | 0 |
| tank-motion (M) | 10 | 6 | 2 | 1 | 1 | 0 |
| radar (D) | 8 | 3 | 5 | 0 | 0 | 0 |
| enemy-ai (E) | 13 | 6 | 6 | 1 | 0 | 0 |
| horizon (H) | 9 | 2 | 4 | 1 | 1 | 1 |
| missile-saucer (R) | 15 | 8 | 5 | 1 | 1 | 0 |
| score-hud (S) | 24 | 19 | 1 | 1 | 3 | 0 |
| sound (U) | 15 | 4 | 3 | 2 | 6 | 0 |
| world-3d (W) | 18 | 13 | 0 | 3 | 2 | 0 |
| doc-reconcile (B) | 30 | 27 | 0 | 0 | 1 | 2 |
| **TOTAL** | **161** | **93** | **33** | **13** | **19** | **3** |

**Honest filing: no red flags.** No file has zero CONFIRMEDs. The two lowest
CONFIRMED ratios are honest, not padded: **horizon (2/9)** genuinely is the
least-faithful subsystem — the clone reinvented the ridge procedurally
(H-002) because a secondary-source sweep missed `BZMTNS.MAC`, and it omits the
volcano ejecta (H-006), moon data (H-003) and bounce-bob (H-007). **sound
(4/15, six NO_COUNTERPARTs)** honestly reflects six ROM cues the synthesis
clone never emits (U-008…U-013). world-3d and doc-reconcile are CONFIRMED-heavy
because they are byte-decode / checklist scopes where matching is the expected
outcome. No file inflates CONFIRMEDs to look faithful.

---

## 1. Cross-pair contradiction (the single most important finding)

### S-007 (CONFIRMED) ⨯ B-026 (BOOK_WAS_WRONG) — bonus-tank threshold. B-026 is WRONG.

Two auditors read the same `BONTBL`/`NEWLIF` code and reach opposite verdicts:

- **S-007** (`pair-score-hud.json`): CONFIRMED — clone `BONUS_TANK_SCORES[0]=15000`
  matches; "`BONTBL` stores last value BELOW the award, so the award triggers
  one thousand higher (14 → 15000)."
- **B-026** (`pair-doc-reconcile.json`): BOOK_WAS_WRONG, **recommendation fix,
  size s** — "award fires at raw 14K/24K/49K … the clone awards the first
  extra tank 1000 points late" and should be retuned 15000 → 14000.

I resolved this against source. `NEWLIF` (BZONE.MAC:2545-2565):
```
LDA AX,BONTBL   ; A = $14 (BCD 14)
CMP TEMP1 / BCC 20$   ; skip if 14 < prior  → proceed if prior <= 14
CMP HITS  / BCS 20$   ; skip if 14 >= current → proceed if current > 14 (>=15)
INC LIVES             ; award
```
The award requires `prior <= 14` **AND** `current > 14` (i.e. `HITS >= 15`).
Because scores are integer thousands, "score exceeds 14000" ≡ "score reaches
15000". The clone's `extraTanksEarned` (src/core/difficulty.ts:81-86) awards on
`before < 15000 && after >= 15000` — **identical** for integer-thousand scores.

**S-007 is correct; the clone's 15000 is faithful. B-026 misread the strict
`BCS`/`BCC` boundary.** B-026 is a **false BOOK_WAS_WRONG**, and its
recommended "fix" (retune to 14000) would *introduce* a one-thousand-early
bug into a currently-correct value. B-026's underlying mechanical observation
is real and worth keeping — the display code does `SED / ADC I,1` (BZONE.MAC:1039-1042)
so the attract screen shows 15/25/50 while `NEWLIF` compares raw 14/24/49 — but
the conclusion drawn from it is wrong. Refuters *will* attack B-026 (it is
BOOK_WAS_WRONG); the danger is that S-007, a CONFIRMED, is **never** attacked,
so if the refuter also slips, the audit ships two contradictory rows and a
code-corrupting recommendation. **Ruling: REFUTE/kill B-026; do not touch
`BONUS_TANK_SCORES[0]`.**

### Non-contradictions I checked and cleared

- **R-006 (CONFIRMED) vs E-010 (DIVERGENCE)** — both key on `missilesLaunched`
  and *describe its base differently* ("1-based" vs "0-based"), which looked
  like a conflict. It is not: R-006 reads the counter **after** the per-spawn
  increment (enemies.ts:502 → :580, first missile in-flight = 1), E-010 reads
  it in `chooseKind` **before** the increment (enemies.ts:501, "missiles so
  far"). Both are correct at their read-point; E-010's "super tank one wave
  early" divergence stands and does not undermine R-006.
- **FRAMES_PER_SEC = 60** — C-001, M-001, F-004 are **consistent, not
  contradictory** (all: true frame = 15.625 Hz, error = 3.84×). C-001 owns the
  shared root; M-001/F-004 own the turn-rate and shell-speed manifestations.
  See §3 for the exact rebase cluster.
- **Radar sweep** — only D-001 addresses the sweep cadence, and it claims
  frame-driven (`+0x0B`/frame). No pair claims otherwise (the cadence pair's
  FRAME/`$INTCT` findings are AI/HUD, not radar). D-006 and B-022 agree that
  obstacles+saucers are excluded. Clean.
- **Score constants** — slow/missile/super/saucer/appearance/intro-band are
  filed 2-3× across S, R, B and all **agree** (only the bonus-tank pair above
  conflicts). This is heavy but expected duplication (doc-reconcile is a
  checklist by design); see §4 for the clustering implication.
- **BOUNCE** (M-009 camera Z-jolt, H-007 mountain bob) and **ENEMY-TO callout**
  (C-005, S-021) are the same effect filed by two pairs — fragmentation, not
  contradiction (§4).

---

## 2. False CONFIRMEDs — the timebase / BCD / radix scrutiny

**No CONFIRMED manufactures agreement via a wrong timebase, BCD, or radix.**
The auditors were well-primed; every time-derived CONFIRMED converts at the
correct clock and each says so explicitly:

- **R-007** (missile swerve 0.5 s): 8 frames × 64 ms = 0.512 s at 15.625 Hz;
  explicitly rejects the 60 Hz read (8/60 = 0.133 s). ✔
- **E-005 / B-021** (fire grace 2.0 s): `$20`=32 frames × 64 ms = 2.048 s. ✔
  (60 Hz would give 0.53 s — the clone's 2.0 confirms 15.625 Hz was used.)
- **E-006 / B-021** (aggression ramp 17 s): `$FF`=255 frames × 64 ms = 16.32 s
  (~4 % under the clone's rounded 17 — disclosed). ✔
- **U-002/U-003/U-004** (sound envelopes): correctly on the **250 Hz** NMI
  timebase (U-001), not the 64 ms frame — envelopes count 4 ms NMIs. ✔
- **BCD**: every score CONFIRMED (S-001…S-008, R-001…R-004, B-001…B-008,
  B-019/B-020) reads `HITS` as BCD-thousands with the `'000'` display suffix;
  `LDA I,n` → n×1000. Internally consistent. ✔
- **Radix**: `MISLVL`/`BONTBL` read as hex→BCD (5/10/20/30, 14/24/49) not
  decimal (R-001, S-006, S-007, B-006); `HSCNUM=10.` trailing-period decimal
  (S-024); obstacle `.NWORD` hex ×4 vs the mountain `.MWORD` decimal ×4/×4/×2
  distinction is drawn correctly (W-012). ✔

**Soft CONFIRMEDs (honest, not false — deltas disclosed, no manufactured
match).** Flag these for the scorecard so they are not read as exact:
- **U-002** buries a real divergence inside a CONFIRMED: the ROM has three
  explosion size tiers (`$FF`/`$70`/`$A0` ≈ 1.02 / 0.44 / 0.64 s) that the clone
  flattens to one 0.9 s burst. The confirmed claim (single generator, ~1 s big
  blast) is true; the **tier-flattening deserves its own DIVERGENCE line** or at
  least a cluster note — it is currently invisible because it rides a CONFIRMED.
- **U-004** (saucer warble 6 Hz vs ROM 7.8 Hz, ~23 % off) and **E-006/B-021**
  (17 vs 16.3 s, ~4 %) are type/endpoint matches with the gap stated.
- **F-001** (shell range 32512): the range value is a genuine match
  (256 × 127 = 32512 = `SHELL_MAX_RANGE`), but the per-step **256** is derived
  from a far-plane note to force the arithmetic, not directly cited from
  shipped source — solid, but lean on the 256.

**Residual risk I could not fully close:** the big byte-decode CONFIRMEDs
W-006 (24 verts/38 edges), W-007 (25/34), W-008 (26/43), W-009 (17/32) assert
full per-vertex/edge exactness but only re-show a few vertices each. I verified
the decode transform `[-4B, 8C, 4A]` on W-001 (narrow pyramid) and it is exact;
the pattern and the cited source/ours lines are sound, and no timebase/radix
trap is involved. The un-reshown interior vertices of the four large models are
the only place a silent mis-decode could survive into a CONFIRMED — low risk,
but the only CONFIRMEDs I cannot personally vouch for line-by-line.

---

## 3. The 60 Hz timebase rebase — exact cluster membership (for Phase 5)

**The single `FRAMES_PER_SEC = 60` error, tightest cluster (one root change):**
- **C-001** — `src/core/movement.ts:45` `const FRAMES_PER_SEC = 60` (the root).
- **M-001** — same line `movement.ts:45` (turn-rate manifestation, 3.84×).
- **F-004** — `src/core/firing.ts:59` (duplicate `FRAMES_PER_SEC = 60`) and
  `firing.ts:65` `SHELL_SPEED` (shell-speed manifestation).

**Coupled constants that MUST retune in the same rebase (fixing the timebase
alone over/under-corrects):**
- **M-003** — `FORWARD_STEP = 48` → ~94 (`0x5E`); the findings show fixing
  `FRAMES_PER_SEC` alone leaves the tank at 0.51× ROM speed, so this moves with
  M-001. This belongs *inside* the rebase.
- **E-011** — enemy turn rates (`TANK_TURN_RATE`/`SUPER_TANK_TURN_RATE`), tuned
  ~1.5× to compensate for the inflated player speed; retune toward ROM after.
- **E-004** — enemy fire cone (0.12 rad), widened to compensate; the finding
  itself says it "cannot ship alone." Couples to E-002/E-011.

**Explicitly NOT part of this rebase (do not fold in):**
- **D-001** (radar 2000 ms) — the finding proves 2000 ms matches *neither*
  15.625 Hz (1489 ms) *nor* 60 Hz (388 ms); it is an unsourced round number, a
  standalone fix to 1489 ms. Easy to mis-cluster; keep separate.
- **U-001** (250 Hz sound clock) — STRUCTURAL/accept; WebAudio uses wall-clock.
- **C-003** — STRUCTURAL/accept; the dt-integration is precisely *why* the
  60 Hz error is only the conversion constant, not the sim step-rate. Keep as
  the rebase's supporting rationale, not a fix.

Per the plan, this cluster lands first.

---

## 4. Fragmentation / clustering notes (same change filed N times)

- **Score constants filed 2-3×**: slow/missile/super/saucer/appearance/intro
  appear in `pair-score-hud` (S-001…S-006), `pair-missile-saucer`
  (R-001…R-004) and `pair-doc-reconcile` (B-001…B-007). All agree; **count the
  fix/verify points once**, not three times.
- **Directional HUD alert**: C-004 (ENEMY IN RANGE should blink on FRAME bit 1),
  C-005 (ENEMY TO L/R/REAR missing) and **S-021** (same, size m) are one
  feature. C-005 (size s) and S-021 (size m) disagree on size — S-021 is the
  better-scoped owner (bearing-bucket + wiring the four confirmed strings
  S-016). **Cluster: C-004 + C-005 + S-021.**
- **BOUNCE collision jolt**: M-009 (camera Z-offset) + H-007 (mountain vertical
  bob) both need the same `BOUNCE` value plumbed from the collision sim into two
  render sites. **Cluster spans motion + horizon.**
- **Missing sound cues**: U-008 (WARNG), U-009 (RBEEP), U-010 (BOING), U-012
  (BONER), U-014 (DISINT layer) + **F-009** (the shell-impact *event* the core
  must first emit) are one "wire up the missing cues" cluster; U-011/U-013 are
  accept/wont_fix.
- **Obstacle proximity tables**: F-006 (tank↔obstacle `PROXTB`) + F-007
  (shell↔obstacle `PRXTBL`) are one decode-the-two-tables change.
- **Radar lifecycle**: D-002 (blip decay) and D-003 (sweep-gating) are the two
  halves of one blip lifecycle (the findings say so); with D-001 (period) and
  D-005 (max range) this is ~1-2 stories of `radar.ts`, not four.
- **Horizon port**: H-002 (ridge, L), H-003 (moon, s — *subsumed* by H-002:
  "a port of MTNS brings the real moon"), H-006 (volcano ejecta, L), H-008
  (volcano cone, m) are the "port real `BZMTNS` geometry" cluster.
- **Enemy-AI difficulty**: E-002 (disposition odds), E-004 (fire cone), E-009
  (spawn arc), E-011 (turn rate), E-013 (range restraint) are mutually coupled
  (each says tightening in isolation makes the tank harmless) → one retune.

---

## 5. Scope gaps

**Coverage against the plan's 11 assigned scopes is comprehensive** — every
`.SBTTL` section named in the plan table is examined, the world-3d pair filed
the required one-finding-per-shape (W-001…W-009), and doc-reconcile covered
every doc section §1-§9 (plus a bonus §6 debris finding, B-030). Unlike
red-baron, **no major subsystem is unaudited.** The gaps are minor and all
recordable as **limitations, not auditor re-runs:**

- **CRACK death/screen-shatter sequence** — named in the plan Rosetta and
  referenced (`CRACK=2`, R-011) but no finding audits the shatter animation
  itself. It is a shell/render effect with no clear owner in the pair table.
  *Record as limitation* (render effect, out of the pure-core audit's reach).
- **"MERP" post-collision sound** — quoted in B-024's doc channel map but not
  individually mapped in the sound inventory; U-010 (BOING) and U-011 (BLKSND)
  cover the collision cues. If MERP is a distinct 13th cue it is a small
  inventory gap. *Record as limitation / note for the sound cluster.*
- **Math Box vertical Y-scale ×2 (W-011)** and **handedness (B-018)** —
  correctly deferred to the `@arcade/shared/math3d` audit per the plan.
  *Recorded limitation, by design.*
- **Absent includes** `VGAN`/`TC65`/`ASCVG`/`COND65` — the four preflight
  limitations; nothing citable, correctly untouched.

None of these warrant re-running an auditor.

---

## 6. Sizing

Sizes are mostly honest. Two flags for Phase 5:

- **F-008 (explosion particle sim, sized `m`) looks under-sized.** It asks for a
  6-piece gravity-driven particle simulation (init velocities `IZVEL`, `GRAVTY`,
  XY drift, per-piece spin, ground-death) built from scratch in a core that
  today has only a 1.5 s scalar timer. The directly-comparable volcano ejecta
  sim (H-006) is correctly sized `l`. **F-008 should probably be `l`,** or split.
- **H-003 (moon, `s`) is subsumed by H-002 (`l`)** — porting `MTNS` brings the
  MTN0-embedded moon with it. Filing it separately double-counts.
- **E-004 (`s`) and E-011 (`s`)** are honest as isolated constants but the
  findings themselves say they cannot ship alone — read their points as part of
  the enemy-AI retune cluster, not standalone.

**Fix-point total & schedulability.** ~37 findings carry `recommendation: fix`
(2×L, ~16×M, ~19×S) plus the B-026 kill. After the clustering in §4 these
collapse to roughly **10-12 remediation stories**: the 60 Hz rebase (lands
first), enemy-AI difficulty retune, radar lifecycle, collision proximity
tables, HUD directional alert, missing sound cues, horizon geometry port
(the heavy one, 2×L), BOUNCE jolt, enemy-tank detail models (W-017/W-018),
plus standalone s-fixes (E-010 super-tank off-by-one, R-008 missile odds 0.4→0.5,
S-020 GREAT SCORE banner, B-028 doc language-code swap) and the B-026 kill.
**The epic is schedulable** — it is a healthy, well-distributed set with one
big-ticket horizon port; nothing here makes it unschedulable.

---

## Summary

I found **1 hard cross-pair contradiction, 0 timebase/BCD/radix false
CONFIRMEDs, and 2 minor scope gaps (both limitations, no re-run)**. The single
most important item is the **S-007 (CONFIRMED) vs B-026 (BOOK_WAS_WRONG)
contradiction on the bonus-tank threshold**: B-026 misread `NEWLIF`'s strict
`CMP HITS / BCS` boundary and wrongly concludes the extra tank is awarded at
14000 — the source and the clone's own `extraTanksEarned` both put the award at
15000, so S-007 is right, B-026 must be refuted/killed, and its recommended
"fix" (retune 15000→14000) would corrupt a currently-correct value. Everything
else is clean: no false CONFIRMEDs (the auditors converted every time-derived
match at 15.625 Hz game / 250 Hz sound, never 60 Hz), honest per-file filing,
comprehensive scope, and a ~10-12-story epic that clusters cleanly with the
60 Hz rebase (C-001 + M-001 + F-004 + M-003) landing first.
