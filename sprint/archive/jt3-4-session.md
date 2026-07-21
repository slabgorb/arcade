---
story_id: "jt3-4"
jira_key: "jt3-4"
epic: "jt3"
workflow: "tdd"
---
# Story jt3-4: Pterodactyl — gravity-exempt FLYXP flight, the lance-height kill window, opposite-facing gate, normal-joust-loses fallback, the ptero wave type

## Story Details
- **ID:** jt3-4
- **Jira Key:** jt3-4
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-21T16:27:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T16:27:01Z | - | - |

## Story Description

The pterodactyl as a process on a gravity-EXEMPT flight core (FLYXP table ±$0300, 'NO GRAVITY!' JOUSTRV4.SRC:1506, 1585-1595 — the ptero ignores the gravity pair the mounts obey). THE KILL WINDOW is a lance-height MATCH, not the ostrich height compare: the attack frame requires the player's lance at offset 8 ± 3; else offset 10 ± 2; AND opposite facings AND the player facing INTO it (JOUSTRV4.SRC:4971-5000). Failing ANY of those tests falls through to the NORMAL joust — which the ptero WINS. Kill value = 1000 points (DVALUE $10 via SCRHUN, JOUSTRV4.SRC:5563-5577 — DERIVED, not stated in any comment; caveat carried forward per ruling C, open-questions §4) emitted as a score event. The pterodactyl WAVE TYPE goes live: jt2-5 landed the 6-entry WJSRTB dispatch skeleton (JOUSTRV4.SRC:2586-2591); the pterodactyl entry (menagerie behaviour, ruled jt3) now spawns pteros per the wave table's ptero nibble (JOUSTRV4.SRC:175-181). Ptero frames = 6 blocks (jt1-3). Death animation (ASH1R/L dissolve) is jt3-6; this story emits the kill and uses the existing interim poof until then. Radix-cited + claims entries.

## Acceptance Criteria

- The ptero is gravity-exempt: it holds altitude with no flap input where a mount would fall (FLYXP, cited); proven by a no-input drift test against a mount baseline.
- The lance-height kill window resolves per the ROM: correct offset band + opposite facings + player-facing-into-it kills the ptero (1000-pt event, caveat carried); failing any single test drops into the normal joust and the ptero wins — every branch tested + cited.
- The pterodactyl wave type spawns pteros from the wave table's ptero nibble through jt2-5's dispatch; claims entries; citations suite green.
- Determinism: a seeded ptero encounter (kill and loss) replays bit-for-bit; purity guard green.

## Technical Approach

### Ground Truth & Citations
- **Repository:** joust/docs/rom-study/ (machine-gated by citations suite)
- **Vendored source:** /Users/slabgorb/Projects/a-2/reference/williams-source/joust/ (JOUSTRV4.SRC, JOUSTI.SRC)
- **Do NOT fabricate citations** — all ROM FILE:LINE claims copy verbatim from vendored tree or epic YAML

### Key ROM References
- **Gravity-exempt flight:** FLYXP table ±$0300, 'NO GRAVITY!' (JOUSTRV4.SRC:1506, 1585-1595)
- **Kill window logic:** Lance-height match: offset 8 ± 3 or offset 10 ± 2, opposite facings, player facing INTO it (JOUSTRV4.SRC:4971-5000)
- **Normal joust fallback:** Failing any kill-window test drops into normal joust, ptero wins
- **Kill value:** 1000 points (DVALUE $10 via SCRHUN, JOUSTRV4.SRC:5563-5577) — DERIVED, carry verify-in-emulation caveat (ruling C)
- **Wave dispatch:** 6-entry WJSRTB skeleton (JOUSTRV4.SRC:2586-2591, jt2-5 landing)
- **Spawn rate:** Wave table's ptero nibble (JOUSTRV4.SRC:175-181)
- **Frame count:** 6 blocks (jt1-3)
- **Death animation:** Interim poof; ASH1R/L dissolve deferred to jt3-6

### Test Structure
1. **Gravity exemption:** No-input altitude hold vs mount baseline (reproduces ROM behaviour)
2. **Kill window branches:** Test all three conditions:
   - Offset band (8±3, 10±2)
   - Opposite facings
   - Player facing INTO ptero
   - Each branch failure drops into normal joust (ptero wins)
3. **Wave type dispatch:** Ptero spawns via WJSRTB entry, wave table nibble drives spawn rate
4. **Seeded determinism:** Kill and loss encounters replay bit-for-bit
5. **Purity guard:** No wall-clock, no Math.random

## Delivery Findings

### TEA (test design)
- **The two-band lance-height predicate, traced from source** (non-blocking): The kill window (`JOUSTRV4.SRC:4971-5001`) computes a lance offset `B = PLANTZ,U + PPOSY,U − PPOSY,X` (whole pixels) then MATCHES it against one of two bands selected by the ptero's animation frame. `CMPA #FLY2-FLY1 / BLS 13$` (`:4975-4976`): the ATTACKING frame (FLY3, `PIMAGE > FLY2-FLY1`) falls through and uses `SUBB #15-7`→centre **8**, `CMPB #3` "WITHIN 7 PIXELS" → **8 ± 3**; ELSE (FLY1/FLY2 wings-up, 13$) uses `SUBB #15-5`→centre **10**, `CMPB #2` "WITHIN 5 PIXELS" → **10 ± 2**. `FLY1/FLY2/FLY3` are consecutive `RMB 12` buffers (`:140-142`) → `FLY2-FLY1 = 12`, `FLY3-FLY1 = 24`. The full predicate: `kill ⟺ inBand ∧ oppositeFacings (EORA PFACE/BPL, :4991-4993) ∧ facingInto (COLDX sign vs PFACE, :4994-5001)`; ANY miss → `BR OSTBO` (the normal joust, `:5002`). Verified: the 19 source re-derivations in `ptero-source.test.ts` pass against the vendored tree. *Found by TEA during test design.*
- **The SCRHUN→1000 derivation chain** (non-blocking): 1000 is DERIVED, never stated. P7DEC (the ptero enemy) DVALUE = `$10` (`:5577` FCB 2nd operand), DVALUR = `SCRHUN` (`:5575` FDB 4th operand). SCRHUN adds the byte at the score's THOUSANDS-&-HUNDREDS BCD position (`:7340-7348` header + `ADDA 2,Y`), so `$10` = high-nibble 1 thousand + low-nibble 0 hundreds = **1000**. Cross-checked against the existing anchor P6DEC (shadowLord) `$15` via SCRHUN → 1500 (`joust.ts killScore`). SCRHUN is the straight thousands/hundreds routine, NOT the "BACKWARDS" SCRTEN (`:7353`) — the ptero dodges that trap. The verify-in-emulation caveat (ruling C) rides in the claim/comment; nothing gates on an emulator. *Found by TEA during test design.*
- **The ptero wave type slots into WJSRTB** (non-blocking): `WPTERO` is the 6th `WJSRTB` entry (index 5, `:2591`), which jt2-5's `WAVE_TYPES[5]` already routes to `'ptero'`. `WPTERO` reads `WPTEN` (the wave row's ptero byte, `:179`,`:2614-2615`) for the spawn count. The committed 90-row `WAVE_TABLE` (jt2-5) carries the invariant `pterodactyls > 0 ⟺ ptero-type wave` (verified independently: **17 ptero waves, zero mismatch**); wave **8** is the first (1 ptero). AC-3 is pinned both purely (`pteroWaveSpawnCount` = nibble on a ptero-status, 0 else, via `dispatchWaveType`) and as a demo call-site (advancing to wave 8 must spawn 1 `kind:'ptero'`). *Found by TEA during test design.*
- **Question for Dev — the `pteroWins` fallback is a RULING, not the raw OSTBO** (non-blocking): the ROM's kill-window miss jumps to `OSTBO` (the ordinary `plantHeight` joust, `:5002`), whose winner is decided by height. The story RULES the fallback = "the ptero wins" (the player loses). Implement `resolvePteroAttack`'s non-kill branch as an unconditional `{kind:'pteroWins'}` — do NOT re-run the `resolveJoust` height compare — per the binding story ruling. Cited in `ptero-source.test.ts` ("an out-of-band lance drops into the NORMAL joust OSTBO"). *Found by TEA during test design.*

### Dev (implementation)
- **The ptero process is INERT in the scheduler this story** (Gap, non-blocking): the demo spawns real `kind:'ptero'` processes (AC-3), but `frame.ts:runBehaviour` has no `'ptero'` case so a spawned ptero naps/wakes without moving — it does not yet fly (`stepPteroFlight`) or enter the live collision loop (`resolvePteroAttack`). AC-1/AC-2 are pinned PURELY (tested on the functions directly), which is all jt3-4 requires; wiring the ptero's live flight + the lance-window into `collisionPass`/the scheduler is a successor menagerie story. Affects `src/core/frame.ts` (add a `'ptero'` dispatch) + `src/core/demo.ts` `collisionPass` (currently filters to player/enemy only). *Found by Dev during implementation.*
- **A ptero does NOT block wave-clear** (Improvement, non-blocking): `stepDemo`'s `clearable`/`enemiesLeft` count only `kind:'enemy'`, so a wave with only pteros left is treated as cleared. Faithfully, a ptero must be killed to end the wave. Left as-is because no jt3-4 test requires it and the demo-ptero test strips processes before advancing (never exercising it); changing it would also touch the growth-cadence `enemiesLeft`. Affects `src/core/demo.ts:stepDemo` (include live pteros in the wave-busy set once ptero death lands in jt3-6). *Found by Dev during implementation.*

## Design Deviations

### TEA (test design)
- **Attack-frame modeled as a boolean flag:** Spec/source keys the band on `PIMAGE > FLY2-FLY1` (the FLY3 image offset). `PteroEntity` carries `attackFrame: boolean` rather than a raw PIMAGE byte. Reason: keeps the behaviour test independent of picture byte offsets; `ptero-source.test.ts` re-derives the `FLY2-FLY1 = 12` threshold + `FLY3 = 24` from the `RMB 12` declarations so the discriminant stays byte-gated.
- **`pteroWins` fallback encodes the story ruling, not the raw OSTBO height compare:** see the matching Delivery Finding — the fallback is an unconditional player-loss per the binding story ruling, with the ROM `OSTBO` target cited.

## Tea Assessment

**Tests Required:** Yes
**Reason:** New behaviour (gravity-exempt ptero flight, the lance-height kill window, the ptero wave type, 1000-pt SCRHUN scoring) — not a chore.

**Test Files:**
- `tests/helpers/ptero-contract.ts` — the `src/core/ptero.ts` contract (module shape + `loadPtero` feature-absent loader).
- `tests/ptero.test.ts` — behaviour: AC-1 gravity exemption, AC-2 the two-band kill window (kill + 3 loss branches + both bands' exact edges), AC-3 the wave-type spawn count, AC-4 determinism + purity (23 tests).
- `tests/ptero-source.test.ts` — vendored-source re-derivation (FLYXP ±$0300, ADDGRX gravity skip, the two bands, opposite/facing tests, DVALUE $10 → SCRHUN → 1000 with the $15→1500 anchor, WJSRTB/WPTEN) + JT34-* claim coverage (26 tests).
- `tests/demo-ptero.test.ts` — the wave type going LIVE: advancing the demo to wave 8 spawns exactly one `kind:'ptero'` (5 tests).

**Tests Written:** 32 failing tests across 4 ACs (22 companion source/demo assertions already green: the vendored re-derivations that confirm the traced ROM facts).
**RED command:** `npx vitest run tests/ptero.test.ts tests/ptero-source.test.ts tests/demo-ptero.test.ts`
**RED counts:** 32 failed | 22 passed. Reds: all 23 `ptero.test.ts` (loadPtero feature-absent); 7 `ptero-source.test.ts` (3 module-agreement + 1 existence rail + 3 JT34 claim-coverage — Dev owes `docs/rom-study/claims/ptero.json`); 2 `demo-ptero.test.ts` (behaviour: wave 8 spawns 0 pteros, must be 1). Full suite: 32 failed | 1219 passed — no regressions; citations + purity green.
**Status:** RED (failing — ready for Dev)

**Handoff:** To Dev (Julia) for implementation — create `src/core/ptero.ts` + `docs/rom-study/claims/ptero.json`, wire the ptero wave type into `src/core/demo.ts`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `joust/src/core/ptero.ts` (NEW) - the pure ptero core: gravity-EXEMPT `stepPteroFlight` (ADDGRX skips `ADDB GRAV`, FLYXP ±$0300 ladder), `lanceOffset`, `resolvePteroAttack` (two-band 8±3 / 10±2 window + opposite facings + facing-into, else `pteroWins`), the DERIVED `PTERO_SCORE` (DVALUE $10 via SCRHUN = 1000), `pteroScoreEvent`, `pteroWaveSpawnCount` (the ptero nibble through jt2-5's `dispatchWaveType`).
- `joust/docs/rom-study/claims/ptero.json` (NEW) - 34 JT34-* claims, each byte-verified verbatim with a fully-qualified `JOUSTRV4.SRC:<line>`; covers all 15 required ranges incl. the DERIVED-1000 pin at `:5577`.
- `joust/src/core/demo.ts` - wired the ptero wave type LIVE: dropped the `'bounder'`-fill placeholder, ground enemies now enter by their own count, and `spawnWavePteros` spawns `kind:'ptero'` processes from `pteroWaveSpawnCount`.

**Tests:** 54/54 ptero tests pass; full suite 1252 passed / 0 failed (GREEN) incl. citations + purity. `npm run build` (tsc --noEmit && vite build) green.
**TEA re-derivation:** the lance predicate (`kill ⟺ inBand ∧ oppositeFacings ∧ facingInto`, else `pteroWins`) and the SCRHUN→1000 chain (`$10` → thousands/hundreds BCD) both re-derived cleanly against the vendored source at `:4971-5002` / `:5575-5577,7340-7348`.
**Branch:** feat/jt3-4-pterodactyl (pushed)
**Tests touched:** none (only `src/` + the claim file).

**Handoff:** To review (Reviewer / Thought Police).

## Reviewer Assessment

**Verdict:** APPROVED

**Specialist gate:** [RULE] APPROVED · [TEST] APPROVED (2 non-blocking nits) · [SEC] CLEAN (pure core, no I/O, no secrets, no injection surface) · [EDGE] 1 non-blocking divergence

The pipeline held up under independent ROM re-verification. I read the load-bearing ranges out of the vendored `JOUSTRV4.SRC` myself (not the impl, not the claims) and every load-bearing law matches. No Critical/High findings — this ships.

**Data flow traced:** wave row byte → `waveRowAt(8).pterodactyls` (=1) + `.status` (0x7b) → `pteroWaveSpawnCount` → `dispatchWaveType` gate (index 5 = 'ptero') → `spawnWavePteros` → one `kind:'ptero'` DemoProcess entering `createWaveDemo`/`stepDemo`. Safe: non-ptero waves gate to 0 (verified wave 1-7 = 0 pteros through the REAL step path, demo-ptero.test.ts). Separately, player↔ptero contact: `lanceOffset` (B = plantZ + playerPixelY − pteroPixelY) → two-band select on `attackFrame` → `inBand ∧ oppositeFacings ∧ facingInto` → `kill` (1000) else `pteroWins`.

**Independent source verification (I re-derived, did not trust the impl):**
- **Kill window `:4971-5002` — MATCHES.** Band selection is by the ptero frame exactly as the ROM's `CMPA #FLY2-FLY1 / BLS 13$` picks it: fall-through (PIMAGE > 12 = FLY3 attack) → `SUBB #15-7`→centre 8, `CMPB #3`→8±3; else (13$, wings-up) → `SUBB #15-5`→centre 10, `CMPB #2`→10±2. `BHI OSTBO` = `|B−centre| > tol` → no kill, so in-band ⟺ `<= tol` (inclusive) — the impl's `Math.abs(off−center) <= tol` is edge-exact. Opposite facings (`EORA PFACE / BPL OSTBO`) and facing-into (COLDX-sign vs PFACE, both side branches `:4995-5001`) both trace correctly; every failing branch drops to the OSTBO fallback.
- **The band buffers `:140-142` — MATCHES.** FLY1/FLY2/FLY3 are consecutive `RMB 12` → FLY2-FLY1 = 12, FLY3-FLY1 = 24; `ATTACK_FRAME_THRESHOLD = 12` is correct.
- **FLYXP `:1587-1595` — MATCHES.** Nine rungs ±$0300, zero labelled in the middle. The gravity exemption is real: mount enters `ADDGRA ADDB GRAV` (`:6489`), ptero enters one instruction later at `ADDGRX ADDD PPOSY+1,U` (`:6494`) via `JSR ADDGRX` (`:1508`) — no gravity add. `stepPteroFlight` omits the `+ GRAV`; AC-1 test compares against a REAL `stepFlight` mount baseline (mount VY accrues gravity + sinks, ptero VY exactly 0 + holds) — a genuine differential, not a vacuous assert. The 8.8 horizontal accumulate (low byte → velXFrac, carry + sex8 high byte → posX) I traced for −$0300/−$0180/+$0300 and it is bit-faithful to the mount's FLYX handling.
- **SCRHUN → 1000 `:5574-5577,7340-7348` — MATCHES, genuinely DERIVED.** P7DEC's 4th DVALUR operand is `SCRHUN` (`:5575`), DVALUE byte `$10` (2nd FCB operand, `:5577`). SCRHUN = "INCREMENT SCORE BY THOUSANDS AND HUNDREDS" (`:7340`, `ADDA 2,Y :7348`), so $10 = 1 thousand + 0 hundreds = 1000. NOT the "BACKWARDS" SCRTEN (which P4/P5DEC use). Cross-checks the P6DEC $15→1500 shadow-lord anchor already in `joust.ts:304`.
- **Claims — 34 JT34-* entries, ALL byte-exact.** I checked every cited line number + verbatim against the vendored file. The DERIVED-1000 pin (JT34-026) correctly cites line 5577 (P7DEC's `$10`) and NOT the decoy `$10` at line 5561 (belongs to another enemy) — no tautology trap. Floor is 14; there are 34. Unique ids, no bare `:N`. The citation gate byte-verifies verbatim at the EXACT cited line (`check-citations.mjs`: `actual.trimEnd() !== verbatim.trimEnd()` at `lines[line-1]`), so these are load-bearing, not scenery.

**Preflight (subagent, re-confirmed):** full suite 1252/1252 pass, `npm run build` (tsc --noEmit && vite build) green, `npm run lint` green, working tree clean, 54/54 ptero tests. Dev's GREEN commit touched only `src/` + the claim file (no test edits — clean TDD).

**Error handling:** `stepPteroFlight` throws `RangeError` on an off-ladder velXIndex (fail-loud, good); `waveRowAt` rejects wave < 1. The inert ptero cannot crash anything: `runBehaviour`'s fall-through returns an unknown-kind process unchanged (naps), `collisionPass` filters to player/enemy, `enemiesLeft` counts only `kind:'enemy'`. No NaN/undefined path reaches the tested surface.

### Deviation audit
- **TEA — attack-frame as a boolean flag** (`attackFrame` vs raw PIMAGE byte): **ACCEPTED.** The FLY2-FLY1 = 12 threshold + FLY3 = 24 are byte-gated from the `RMB 12` declarations, so the discriminant stays source-derived; the boolean is just `PIMAGE > 12` lifted out.
- **TEA — `pteroWins` fallback encodes the story RULING, not raw OSTBO** height-compare: **ACCEPTED** (see explicit call below). Documented as both a Design Deviation and a Delivery Finding, with the OSTBO target cited (JT34-024, `:5002`).
- No UNDOCUMENTED deviations found. The inert-ptero gap and the ptero-doesn't-block-wave-clear consequence are both recorded as Dev Delivery Findings.

### Non-blocking findings (nits — do NOT block; log for successor stories)
| # | Sev | Finding | Location |
|---|-----|---------|----------|
| N1 | [LOW] | `facingInto = player.facing === Math.sign(ptero.posX − player.posX)` returns no-kill at EXACTLY equal posX (`Math.sign(0)=0 ≠ ±1`), where the ROM's `LDD COLDX / BPL` treats COLDX=0 as "ptero on right" (kill if facing right). Degenerate equal-column case; COLDX is already a modeled proxy and the resolver is not wired to a live collision this story. Re-check when jt3-5/jt3-7 wire it. | `src/core/ptero.ts:181` |
| N2 | [LOW] | "Seeded determinism" tests (kill/loss) call a PURE resolver twice with identical literal args and assert `toEqual` — trivially true, redundant with the purity test. Real determinism (the 60-frame flight trajectory replay) IS pinned; the resolver has no seed. Reframe as a purity guard or drop. (test-analyzer, medium) | `tests/ptero.test.ts:339,350` |
| N3 | [LOW] | The 1000-score tests assert `=== 1000` / `=== scrhun(0x10)` (algebraically 1000), so a hypothetical hardcoded-literal impl would survive. NON-BLOCKING because the source-side re-derivation independently gates it: `ptero-source.test.ts:240` parses the ROM byte `$10` from the vendored file and `:246` pins `PTERO_SCORE === scrhun(0x10)` — a WRONG value cannot ship without reddening. The gap is only that the runtime arithmetic path isn't mutation-exercised (immaterial for a fixed single-byte constant). (test-analyzer, high) | `tests/ptero.test.ts:247`, `tests/ptero-source.test.ts:246` |

### Explicit calls (per SM)

**(a) The `pteroWins` fallback — ruling vs raw ROM OSTBO:** **Following the ruling is CORRECT, and the deviation is properly documented.** The epic text (`epic-jt3.yaml` jt3-4 description + AC-2) is a binding user ruling: "failing any single test drops into the normal joust and the ptero wins." TEA flagged that the raw ROM OSTBO (`:5002`) is a plantHeight compare, not an unconditional ptero win — and Dev implemented the RULING: `resolvePteroAttack`'s non-kill branch returns an unconditional `{kind:'pteroWins'}` and does NOT re-run the height compare. The divergence from raw OSTBO is recorded in BOTH the Design Deviations section and a TEA Delivery Finding, with the OSTBO target cited (JT34-024). This is the right way to ship a ruling that deviates from source: implement it, cite the source it diverges from, and record the deviation. No silent drift.

**(b) The inert-ptero deferral — does AC-3 hold?** **YES — AC-3 holds at spawn+count level for THIS story; live flight/joust wiring is legitimately deferred.** AC-3 reads "spawns pteros from the wave table's ptero nibble through jt2-5's dispatch" — a spawn+count criterion, which the demo test proves against the REAL `stepDemo` path (wave 8 → exactly one `kind:'ptero'`, waves 1-7 → zero). AC-1/AC-2/AC-4 are satisfied PURELY (the ACs say "proven by a no-input drift test", "every branch tested + cited", "seeded encounter replays" — none demand live-scheduler wiring). The spawned ptero being inert (no `'ptero'` case in `frame.ts:runBehaviour`, filtered out of `collisionPass`, not counted by wave-clear) is a documented, harmless Gap. This mirrors the jt3-2/jt3-3 seam-deferral reasoning explicitly: the epic stages the menagerie so jt3-5 reuses the ptero core for baiters and jt3-7 ("the full ecosystem hunts you") lands live flight + rendering + wave-clear participation. jt3-4 does NOT owe live behaviour now.

### Delivery Findings (for successor stories)
- **Gap** (non-blocking): the ptero core (`stepPteroFlight`/`resolvePteroAttack`) is built and pure-tested but not wired to the live scheduler/collision loop. jt3-5 (baiters) + jt3-7 (playable slice) must wire it; re-check nit N1 (equal-column facing) against the real COLDX the collision routine supplies. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): a pure-ptero wave is currently treated as cleared (`enemiesLeft` counts only `kind:'enemy'`). Faithfully a ptero must be killed to end the wave — fold live pteros into the wave-busy set once ptero death lands (jt3-6). *Found by Reviewer during code review.*
- **Improvement** (non-blocking, test hardening): consider exposing a `scrhunDecode(byte)` helper from `ptero.ts` and testing it against $10→1000 AND $15→1500 so the runtime nibble arithmetic is mutation-exercised (closes nit N3's cosmetic gap). *Found by Reviewer during code review.*

**Handoff:** To SM for finish-story.

## Sm Assessment

**Outcome:** APPROVED and merging — RED `2fcc9e1`, GREEN `e932348`. Full suite 1252/1252, build green.

**Pipeline (peloton, subagents):** setup → TEA RED (32 reds; traced the two-band lance predicate + SCRHUN→1000 + WJSRTB[5] dispatch; deferred JT34 claims to Dev under ≥14 coverage pins) → Dev GREEN (built `src/core/ptero.ts` + 34 byte-verified JT34 claims + live ptero wave type in demo.ts) → Reviewer APPROVED [RULE][TEST][SEC][EDGE] (independently re-read the load-bearing ranges from JOUSTRV4.SRC; test-analyzer confirmed the kill-window three-conjunct isolation + both band edges are mutation-resistant).

**Load-bearing verified (Reviewer, against source):** the lance-height kill window (`:4971-5002`) is edge-exact — band by ptero frame (`CMPA #FLY2-FLY1 / BLS`), attack-frame → 8±3, glide → 10±2, inclusive edges (`BHI OSTBO`), kill ⟺ inBand ∧ oppositeFacings ∧ facingInto, every failing branch → fallback. Gravity-exempt flight omits `ADDB GRAV` (FLYXP ±$0300). 1000 is DERIVED (DVALUE $10 → SCRHUN thousands BCD, `:5563-5577,:7340-7348`) and independently byte-gated (`ptero-source.test.ts:240/246` redden on a wrong byte or wrong PTERO_SCORE — NOT a magic literal). 34 JT34 claims byte-verified.

**Two design points, both resolved clean:** (a) `pteroWins` fallback is the BINDING EPIC RULING (unconditional player-loss), diverging from raw OSTBO's height-compare — implemented as the ruling and documented in Design Deviations + JT34-024 (Reviewer: right way to ship a source-diverging ruling). (b) inert-ptero deferral: AC-3 holds at spawn+count level (proven vs real stepDemo — wave 8→1, waves 1-7→0); AC-1/2/4 satisfied purely.

**CARRIED-FORWARD OBLIGATIONS → jt3-5 / jt3-7 (I am threading these into their setups):** the spawned ptero is INERT this story — no `'ptero'` case in `frame.ts:runBehaviour`, filtered from `collisionPass`, uncounted by wave-clear. jt3-5 reuses the ptero core for baiters (first place the resolver may go live) and jt3-7 ("the full ecosystem hunts you") lands live flight/joust/render/wave-clear. When the resolver goes live, fix the degenerate `facingInto` equal-column edge (`Math.sign(0)=0` returns no-kill where ROM's `COLDX=0 / BPL` would allow a kill). Non-blocking test-hardening also owed: expose `scrhunDecode` and test $10→1000 + $15→1500; reframe the redundant call-twice "determinism" assertions (real 60-frame trajectory replay IS pinned).
