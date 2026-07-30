# Battlezone primary-source fidelity audit — plan

**Date:** 2026-07-17 (design; Architect)
**Trigger:** ROM sweep requested for battlezone, completing the fleet (tempest 2026-07-12,
red-baron 2026-07-13, star-wars 2026-07-15 already audited).
**Method:** the `rom-fidelity-audit` skill — preflight → citation checker → paired auditors →
coverage review → adversarial refutation → clustering → human ruling.
**Source (LF, read-only, copyrighted — a separate checkout, never copied into this repo):**
`/Users/slabgorb/Projects/battlezone-source-text`
(vendored 2026-07-12 from `historicalsource/battlezone` @ `38d0b07`; the CRLF sibling
`~/Projects/battlezone-source` is **not citable** — same lines, different bytes.)

---

## Ground truth (Phase 0 — hand this section verbatim to every auditor, refuter and reviewer)

### 1. What shipped

`BZONE.MAP` (1-SEP-81) is the authority, corroborated by `BZONE.MAC:25`'s own header:

```
BIN:BZONE,BZONE.XX=OBJ:BZMTNS,BZONE,BZSOUN,VGUT,BZSTST
```

`BZONE.DOC` (Ed Rotberg, 31-AUG-81) maps that binary onto the release ROMs
(036409-01 … 036414-02 program, 036421-01/036422-01 vector) — the same dump files sitting in
the quarry directory.

**ALLOWLIST (citable):** `BZONE.MAC`, `BZMTNS.MAC`, `BZSOUN.MAC`, `VGUT.MAC`, `BZSTST.MAC`,
plus the `.INCLUDE`d files present in the quarry: `VGMC.MAC` (BZMTNS.MAC:7, BZSTST.MAC:46)
and `MBDIAG.MAC` (BZSTST.MAC:380).

**Shipped but ABSENT from the quarry (limitations — nothing can be cited against them):**
`VGAN` (BZMTNS.MAC:186), `TC65` (BZONE.MAC:1238 — the coin routine), `ASCVG` (BZONE.MAC:4267,
BZSTST.MAC:44), `COND65` (BZSOUN.MAC:3).

**DENYLIST (a citation to any of these invalidates the finding):**

| File | Why it must never be cited |
|---|---|
| `BZSADG.MAC` | Stand-alone VG diagnostic program (own `.ASECT`, `.=0` org, `MAXTST=5`). Absent from the link string. Never shipped in the game binary. |
| `COIN65.MAC` | Present on disk but **never included** — the game includes `TC65`, which is absent. COIN65 is the *successor* coin routine ("ALL NEW PROGRAMS SHOULD USE THIS"); citing it against BZONE's coin behaviour cites code the cabinet never ran. Coin plumbing is out of scope anyway (see below). |
| `STATE2.MAC` (+ `.COM`/`.MAP`/`.SAV`) | "STATE2-VECTOR ROM ANALOG" — AVG state-PROM utility, not game code. Same denial as red-baron. |
| `VCRMAN.MAC` | "VCRMAN-VECTOR ROM AUTONORMALIZING" — a build utility, absent from the link string. |
| `MBUCOD.V05` (+ `MBUCOD.COM`/`.MAP`, `MBUDOC.DOC`, `03617X.SAV`) | Math Box 2901 microcode (Albaugh). Real silicon, but the coordinate hardware is ported in `@arcade/shared/math3d` — an **arcade-shared** audit. Here we audit only battlezone's *usage sites*. |
| `MBDIAG.MAC` outside BZSTST scope | Shipped (via BZSTST include) but it is Math Box *diagnostic* code — self-test scope only. |
| `DLXAST.SAV` | A stray Deluxe Asteroids binary. Not battlezone at all. |
| `036409.01` … `036422.01`, `03617X.SAV` | Binary ROM dumps — bytes, not citable lines. Usable only as a cross-check (e.g. via the existing `reference/rom-quarry` byte-decode), never as a citation. |
| `XXX225.DOC`, `BZONE.DOC`, `BZONE.COM` | Build/release documentation. Context, not evidence. |

**Dead conditional-assembly block — emits no bytes, must not be cited as evidence of a value:**
`BZONE.MAC:40–148` is `.IF EQ,1` … `.ENDC`. MACRO-65 assembles `.IF EQ,expr` only when
`expr == 0`, so this block **never assembled**. It is the author's documentation block —
excellent as a glossary, worthless as evidence (red-baron's `PLOBDB` block, same trap).
*Resolved (preflight-verify, 2026-07-17):* `BZSOUN.MAC:89`'s `.ENDC` closes the `.IF DF`
inside the `OFFSET` macro definition (`.MACRO OFFSET,LABEL` … `.IF DF,LABEL''X` / `.IFF` /
`.ENDC`, BZSOUN.MAC:82–91) — the per-channel offset-table generator. Not a dead block; it
assembles per-expansion. Auditors reading sound tables must expand this macro.

### 2. Radix — region by region, not file by file

Default `.RADIX 16` with **decimal islands**. A bare number's meaning depends on the nearest
preceding `.RADIX` directive above the cited line (backward scan, always):

| File | Regions |
|---|---|
| `BZONE.MAC` | `:3` → **16** · `:4878` → **10** (the `BATBL` mountain-scape table and everything after) |
| `BZMTNS.MAC` | `:3`,`:8` → **16** · `:240` → **10** · `:460` → **16** · `:501` → **10** · `:839` → **16** |
| `BZSOUN.MAC` | `:2` → **16** |
| `BZSTST.MAC` | `:21` → **16** · `:622` → **10** · `:647` → **16** |
| `VGUT.MAC` | `:2` → **16** |

**A trailing period forces decimal inside a hex region** (`LDA I,-127.` at BZONE.MAC:433 is
−127, not −0x127). This is the exact trap that broke red-baron (~30 constants transcribed
from a hex region as decimal). Battlezone has the same profile: hex program constants,
decimal data islands.

**Decode the macros.** The `.RADIX 10` region's `.MWORD ..A,..B,..C` expands to
`.NWORD ..A*4,..B*4,..C*2` (BZONE.MAC:4879–4881) — the stored values are **pre-multiplied**.
An operand you didn't decode is one you don't understand; both real kills on tempest were
undecoded operands.

### 3. The timebase — the sim is a 64 ms machine. **Never convert at 60 Hz.**

Derived, not assumed:

| Clock | Derivation | Rate |
|---|---|---|
| Hardware NMI | NMI handler increments `$INTCT` (BZONE.MAC:1084); the author's comment at :1085 says 16 counts = "END OF FRAME (**64 MS**)" ⇒ 64/16 = 4 ms. Corroborated by the twin hardware family (red-baron RBGRND.MAC:102: "INTERRUPT OCCURS EVERY 4 MS"). The header's ";* INTERRUPTS: NMI (4 US)" (BZONE.MAC:21) is a µs/ms typo. | **250 Hz** |
| **Game frame (the sim)** | `AND I,0F / BNE` gates `INC SYNC` to every 16th NMI (BZONE.MAC:1086–1088); `MAIN: LSR SYNC` (BZONE.MAC:422) blocks the main loop on it (`SYNC` declared :235 "NMI. MAIN LOOP SYNCHRONIZATION"). | **15.625 Hz — a 64 ms step** |
| Sound driver | `JSR MODSND` runs inside the NMI handler, **not** the game frame. | **250 Hz / 4 ms** |

**Therefore every piece of game motion advances exactly once per 64 ms.** Our clone advances
the sim in constant **1/60 s** sub-steps via `@arcade/shared/loop` (src/main.ts:17,25) —
3.84 game-frames per ROM frame. When comparing any per-frame source constant against our
per-second (or per-1/60-step) values, convert at **15.625 Hz**. A constant that "matches at
60 Hz" is a **false CONFIRMED** — the worst failure this method has, because refuters never
attack CONFIRMEDs.

Any sound envelope timed against the game frame is 16× wrong — envelopes count **NMIs**.

*Resolved (preflight-verify, 2026-07-17):* the display refresh is the NMI tail's own third
clock: `40$: DEC VTIMER / BNE 20$ / … / 30$: STA GOADD ;C  START UP VECTOR GENERATOR FOR 24 MS.`
with `VTIMER` reloaded to 6 (BZONE.MAC:1216–1235). **The VG restarts every 6 NMIs = 24 ms
≈ 41.67 Hz**, double-buffered via `BUFRDY`/`VECRAM+1` bank flip. So battlezone has THREE
clocks, like red-baron: NMI 250 Hz → display 41.67 Hz (÷6) → sim 15.625 Hz (÷16). The
display redraws the last-built buffer ~2.67× per sim update.

### 4. Vocabulary (Rosetta)

Rotberg's names are not ours: `ROBOT` = the enemy tank AI (both slow and super tank) ·
`R2D3 BUZZ BOMBER` = the **missile** · `SAUCER` = saucer · shells are `SHELL`/projectiles on
both sides · `VOLCAO [sic] ROCK` = the volcano ejecta · `ATRACT` = attract mode ·
`CRACK` = the death/screen-crack sequence · `GOVER` = game over.
Extend this glossary from the dead doc-block (BZONE.MAC:40–148) during preflight-verify.

> **Correction (pair-horizon, finding H-001, 2026-07-17):** an earlier draft of this plan
> glossed **`BATBL` as "the mountain-scape table". That is WRONG.** `BATBL` (object `0x17`) is
> the **"BATTLE" title-logo 3D object**; with `TLETBL` (`0x1E`) and `ZONTBL` (`0x1F`) it spells
> BAT-TLE-ZON(E) — see `LOGOBJ: .BYTE 17,80,1E,80,1F,80` (BZMTNS.MAC:846), the `OBJPNT` table
> (BZMTNS.MAC:490 — *not* BZONE.MAC:490, which is an unrelated `LDA I,10.`), and
> `.SBTTL BATTLE ZONE LOGO` / "bring out ZONE" (BZONE.MAC:701, :755). The
> `.MWORD` ×4/×4/×2 pre-multiply therefore governs the **logo letters**, not the ridge. The real
> mountain-scape is **`MTNS`/`MTN0–MTN7`** (BZMTNS.MAC:11–183, `JSRL MTN0…`), drawn by
> `DRAW MOUNTAIN SCAPE` (BZONE.MAC:1240); `HORIZN` (BZMTNS.MAC:9) is the horizon line. Any
> downstream reader: audit the ridge against `MTNS`, not `BATBL`.

---

## Phase 1 — citation infrastructure (build first, TDD)

Port tempest's reference implementation (`tempest/tools/audit/` +
`tempest/tests/audit/citations.test.ts`) with battlezone values:

- `tools/audit/linked-modules.mjs` — the allowlist above, sole authority, imported everywhere.
- `tools/audit/check-citations.mjs` — schema + both-sides byte-for-byte line checks;
  rejects denylisted modules; degrades gracefully when `BATTLEZONE_SOURCE_DIR`
  (default `/Users/slabgorb/Projects/battlezone-source-text`) is absent, so CI still runs
  the schema + ours-side checks.
- `tools/audit/reanchor-citations.mjs` — adopt from day one, with the `remediated_by`
  convention (tempest invented both mid-epic; we start with them).
- `tests/audit/citations.test.ts` — `npm test -- citations` must be green after every phase.
  Node env; the findings live in `docs/audit/findings/pair-*.json`.

Schema, classes (`DIVERGENCE`/`CONFIRMED`/`BOOK_WAS_WRONG`/`STRUCTURAL`/`NO_COUNTERPART`),
and field rules are identical to tempest's plan. `BOOK_WAS_WRONG` here means **our own
`docs/battlezone-1980-source-findings.md` was wrong** — the doc is a secondary-source
distillation (6502disassembly.com narrative + rev2 ROM byte decode) and is a *claim*, not
authority. A finding that fails the checker is **deleted, not repaired**.

## Phase 2 — the auditor pairs

One agent per pair; scopes define **claim ownership** (auditors may read anything, file only
inside their scope). Findings → `docs/audit/findings/pair-<name>.json`.

| Pair | Prefix | Source (sections, with `.SBTTL` line anchors) | Ours | Scope |
|---|---|---|---|---|
| cadence | C | BZONE.MAC MAIN LOOP `:420`, INTERRUPT ROUTINE `:1071`, globals `:228–255` (`SYNC`,`$INTCT`,`FRAME`,`BUFRDY`) | `src/main.ts`, `src/core/sim.ts` (structure), shared-loop wiring | The 64 ms contract as consumed: what advances per game frame vs per NMI; `FRAME`-counter parity tricks (`AND FRAME` gates at `:556`,`:2621`,`:4046`); sub-frame uses of `$INTCT` (`:3083`,`:3100`,`:3791`); our fixed-step loop vs `LSR SYNC`. **Owns the STRUCTURAL findings and the VG-refresh preflight-verify item.** |
| tank-motion | M | MOTION OF TANK `:2613`, KLUDGE MOVEMENT IN Z `:2086`, BOUNCE CONTROL `:2124` | `src/core/movement.ts`, `src/core/input.ts` | Tread speeds, turn rates, forward/reverse asymmetry, the Z-kludge, obstacle bounce. |
| enemy-ai | E | REACT `:2876`, ROBOT `:2929`, TRACKING ROUTINE `:3472`, HIGH POWERED TANK `:3696`, ROBOT RESET `:3710` | `src/core/enemies.ts`, `src/core/difficulty.ts` | Tank AI states/decision cadence, evade (`R.EVAD` uses `$INTCT` — sub-frame!), super-tank gating, aggression/difficulty ratchet, spawn placement + reset rules. |
| missile-saucer | R | R2D3 BUZZ BOMBER `:3195`, SAUCER MOTION `:3385` | `src/core/saucer.ts`, `src/core/enemies.ts` (missile paths) | Missile spawn threshold/trajectory/hop, saucer wander/timer/scoring gate. |
| combat | F | QWIKCK `:2249`, COLLISION CHECK `:2384`, OBJECT-OBJECT COLLISION `:3587`, UPDATE SHELL POSITION `:4062`, EXPLOSION INITIALIZATION `:2576`, EXECUTE EXPLOSION SEQUENCE `:1744` | `src/core/firing.ts`, `src/core/obstacles.ts`, `src/core/events.ts` | Shell speed/lifetime/range, both collision algorithms and their radii, obstacle blocking, explosion lifecycle/debris. |
| world-3d | W | TRANSLATE & ROTATE `:1450`, DRAW OBJECT `:1857`, PUT PROJECTED POINTS IN TABLE `:1986`, SIN-COS `:2137`/`:2192`, DATA STRUCTURES `:4271`–end (**`.RADIX 10` from `:4878`**) | `src/core/camera.ts`, `src/core/models.ts`, `src/core/obstacles.ts` (21-obstacle table), `src/core/scene.ts`; `@arcade/shared/math3d` **usage sites only** | Rotation/projection pipeline vs camera.ts, sin-cos tables, object/vertex data vs models.ts (the findings doc claims byte-exact — verify against the *source*, per-shape, one finding per shape), the obstacle table. |
| horizon | H | BZMTNS.MAC (whole file, **five radix regions**), DRAW MOUNTAIN SCAPE `:1240`, VOLCAO ROCK MOVEMENT `:1377`, `BATBL` `:4883`– | `src/core/horizon.ts` | Mountain-scape geometry (`.MWORD` pre-multiplies ×4/×4/×2), volcano placement + rock ejecta physics, moon, horizon scroll rate vs heading. |
| radar | D | DISPLAY RADAR `:3878` | `src/core/radar.ts` | Sweep period, blip inclusion rules, range scaling, enemy-direction indicator. |
| score-hud | S | HIGH SCORE STUFF `:806`, MESSAGE ROUTINE `:4095`, INFORMATION OUTPUT `:4178`, BATTLE ZONE LOGO `:701`, `ENGMSG` message table `:4280` | `src/core/scoring.ts`, `src/core/alerts.ts` ("ENEMY TO LEFT" etc.), `src/core/text.ts`, `src/core/screens.ts`, `src/shell/font.ts` | Score values (**BCD trap** — 1000/2000/3000/5000 are likely stored with implicit trailing zeros), extra-life/bonus rules, message texts + trigger conditions, attract/logo/game-over flow, high-score entry. |
| sound | U | BZSOUN.MAC (whole file), NMI sound-priority block BZONE.MAC `:1099–1130` (`SCOLFG`/`OBJCOL`/`SAUCER` priority chain, `EXPCNT`) | `src/shell/audio.ts` (runtime **synthesis** — see arcade CLAUDE.md memory), `src/shell/audio-dispatch.ts`, `src/core/events.ts` | Sound inventory, trigger conditions, the NMI-side priority scheme, envelope rates (**250 Hz units, not game frames**), engine hum behaviour (now `@arcade/shared` persistentVoice — usage sites). |
| doc-reconcile | B | whichever module owns each constant | every `src/core/` line that cites `docs/battlezone-1980-source-findings.md` | **A checklist, not a search**: every constant the findings doc asserts (roster/scoring §1, spawn thresholds §2, 21-obstacle table §3, vertex specs §4, difficulty curve §5, radar §7, sound §8, DIP pin §9) gets exactly one finding — `CONFIRMED` or `BOOK_WAS_WRONG` (or `NO_COUNTERPART` with the module searched). Note `tests/findings-doc.test.ts` pins code to this doc — a `BOOK_WAS_WRONG` here means the remediation story must retune doc + test + code together. |

## Deliberately out of scope (record, do not audit)

| Area | Reason |
|---|---|
| `TC65` coin logic, `COIN65`, coin counters, `$CMODE`/`MOOLAH` | Coin door — no cabinet counterpart in a browser clone. |
| `BZSTST.MAC` + `MBDIAG.MAC` self-test internals | Self-test screens; allowlisted for citation (they shipped) but no pair audits them. |
| Math Box microcode (`MBUCOD.V05`) internals | `@arcade/shared/math3d` is an **arcade-shared** audit; battlezone audits only usage sites. |
| `VGMC.MAC`/`VGUT.MAC` beam internals | AVG hardware plumbing; emulating the beam engine is out of scope. Cite them only where a game-visible value (scale, intensity) originates there. |
| Operator DIP options | No operator panel; the one DIP-dependent constant (missile threshold) is pinned in the findings doc §9 — pair doc-reconcile verifies the pin, nothing else. |

## Secondary sources — treat as CLAIMS, not authority

- `docs/battlezone-1980-source-findings.md` — our own distillation (6502disassembly.com +
  rev2 ROM byte decode). On red-baron the equivalent doc was wrong **ten times** and cited a
  build that never shipped; assume nothing.
- `reference/rom-quarry/` (checkout-local, gitignored) — byte decodes; useful cross-check.
- `tests/findings-doc.test.ts` — pins code to the doc; inherits the doc's errors.

## Phases 3–6

3. **Coverage review** — one agent over ALL findings: false `CONFIRMED`s (especially
   60 Hz-converted "matches"), cross-pair contradictions, scope holes, fragmentation.
   Not optional — on red-baron it killed three false CONFIRMEDs and found an unaudited
   subsystem.
4. **Refutation** — adversarial, batched ~6 findings per agent; every `DIVERGENCE` and
   `BOOK_WAS_WRONG` attacked; re-open both lines, decode the macros, compute the governing
   radix by backward scan, convert time at 15.625 Hz; default REFUTED under uncertainty.
   Healthy signature: low kill rate, high correction rate.
5. **Synthesise + cluster** — `docs/2026-07-XX-battlezone-primary-source-audit.md`: traps,
   timebase, Rosetta, scorecard, findings by subsystem, what the findings doc got wrong,
   limitations (the four absent includes), and a **ruling sheet** of merged clusters with
   dependencies. Any timebase/radix rebase cluster lands first.
6. **Human rules** — recommendations only; the user rules fix/accept/won't-fix per cluster.
   Only then is the remediation epic filed at the orchestrator (proposed id: **bz3** —
   verify against `sprint/archive` at filing time), one story per ruled-fix cluster,
   points from size, `repos: battlezone`, workflow `tdd`.
