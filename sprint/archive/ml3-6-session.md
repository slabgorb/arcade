---
story_id: ml3-6
jira_key: ml3-6
epic: ml3
workflow: tdd
---
# Story ml3-6: OBSTAC mover→playfield address derivation + wire into movers (ml3-3 follow-up)

## Story Details
- **ID:** ml3-6
- **Jira Key:** ml3-6
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml3-6-obstac-address-derivation
- **PR:** #336 (https://github.com/slabgorb/arcade/pull/336) → develop

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T18:53:40Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T18:17:24Z | 2026-08-13T18:19:11Z | 1m 47s |
| red | 2026-08-13T18:19:11Z | 2026-08-13T18:36:29Z | 17m 18s |
| green | 2026-08-13T18:36:29Z | 2026-08-13T18:41:03Z | 4m 34s |
| review | 2026-08-13T18:41:03Z | 2026-08-13T18:53:40Z | 12m 37s |
| finish | 2026-08-13T18:53:40Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict → RESOLVED** (non-blocking): the story's headline ambiguity — "0x400 (conway
  field base) vs 0x800 (MLSUB.MAC:886 exit comment)" — is resolved against primary source to a
  THIRD value. `PLYFLD = 0x1000` (`MLDEF.MAC:103` "PLYFLD =1000 ;30 WIDE BY 32 HIGH"), and
  `conway.ts:36` already commits to `$1000`. OBSTAC agrees: it loads `PLYFLD/0x400 = 4` (`:858`)
  then shifts the address pair ×4 (`:873-876`), landing the base at `0x1000`, **not** `0x800`.
  The `:886` "800+…" exit comment is STALE (an earlier `PLYFLD=0x800` build); the "(400-7BF)" in
  `MLDEF.MAC:103` is the screen-RAM mirror. Both conway and OBSTAC share one base (`0x1000`) and
  one zero-based index `offset = col*0x20 + row`, so `obstac` returns `obstacleAt(field, absAddr - 0x1000)`.
  Every fixture offset in `obstac.test.ts` is therefore base-independent (== `col*0x20+row`) and a
  wrong base reads an empty/OOB cell → `0` → red. *Found by TEA during test design.*
- **Gap** (non-blocking): the story title says wire obstac "into stepMillipede MOTION/**EXPLOD**
  collision", but EXPLOD (`MILLI.MAC:763-838`) has **no OBSTAC call**. The obstac derivation is a
  MOTION seam only (`:1527` "12$: JSR OBSTA0 / BEQ 13$" — the head turn). The field-*removing*
  OBSTAC (`:2447` "REMOVE OBSTACLE") is SHOOT2's, a shooting-story seam, not EXPLOD; `:839-840`
  ("LDA I,PLYFLD/100 / STA MEM+1 ;RESTORE MUSHROOMS") is the end-of-death restore pointer, not a
  collision. RED therefore wires the turn at the MOTION **head** seam (mirroring the head-only edge
  turn in the current model); body segments still follow via BODY_FOLLOW_GAP. The bestiary movers'
  own OBSTAC seams are already stubbed and belong to separate stories. *Found by TEA during test design.*
- **Gap / pre-existing** (non-blocking, NOT ml3-6): `tests/audit/mushroom-claims.test.ts` >
  "ROCK stays claimed by exactly {BT-33, SC-51}" already fails on this branch's base — a `DD-5`
  claim (from the ddt work) added a third ROCK claimant, so the actual set is
  `{BT-33, DD-5, SC-51}`. Untouched by ml3-6 (I added one test file, no source/claims). Flagging so
  it is not attributed to this story; the ml3-7 audit expectation needs updating by its owner.
  *Found by TEA while isolating RED.*

### Reviewer (code review)
- **Gap** (non-blocking): the ROM's MOTION no-turn branch (13$, `MILLI.MAC:1541`) runs `JSR OVRLAP`
  — the segment-vs-segment OVERLAP turn — before falling through to the edge logic. `checkOverlap`
  is already exported (`millipede.ts:391`, ml3-2) but is NOT wired into `stepMillipede` by any story;
  ml3-6 wires only the OBSTAC (mushroom) turn. A future story should wire OVRLAP into MOTION. Affects
  `plugins/millipede/src/core/millipede.ts`. *Found by rule-checker; confirmed by Reviewer.*
- **Improvement** (non-blocking): `obstac`'s `vpart = (v>>3)+((v&4)?1:0)` reaches `0x20` for
  `v ∈ {252..255}`, which the ROM also does (no mask; `MLSUB.MAC:853-857` + `:877 ORA OBST` spills
  the same carry into the column) — so the port is byte-faithful, NOT a bug, and clamping would
  diverge from source. Unreachable in current callers (max V = `ENTER_V` 0xF8 = 248; `move()` only
  decreases V). Future bestiary-mover OBSTAC seams with a wider V domain should confirm the ROM's
  spill is the intended behaviour there too. Affects `plugins/millipede/src/core/mushroom.ts:165`.
  *Found by reviewer-security (low); verified ROM-faithful by Reviewer.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Wired obstac into MOTION only, not EXPLOD** — the story title says "wire obstac into
  stepMillipede MOTION/**EXPLOD** collision".
  - Spec source: story title (ml3-6).
  - Spec text: "wire obstac(field,{h,v,dh}) into stepMillipede MOTION/EXPLOD collision".
  - Implementation: wired the head turn at the MOTION seam (MILLI.MAC:1527-1539) only.
  - Rationale: EXPLOD (MILLI.MAC:763-838) has NO OBSTAC call — verified against primary source
    (see TEA Delivery Finding). The field-touching OBSTAC near explosions is SHOOT2's mushroom
    *removal* (:2447) and the end-of-death restore pointer (:839-840), neither an EXPLOD collision.
    Inventing an EXPLOD seam would fabricate behavior absent from the ROM.
  - Severity: minor (title imprecision, not a missed mechanic).
  - Forward impact: none for ml3-6; the shooting-story that owns SHOOT2's mushroom removal will
    consume obstac at its own seam.
- **Head-seam obstacle turn; bodies unchanged** — the obstacle turn is applied at the head branch
  of stepSegment (mirroring the head-only edge turn in the ml3-1 model), not per-body.
  - Spec source: TEA test design (AC-7/8 exercise a head) + ml3-1 architecture.
  - Spec text: MOTION runs every segment; each can turn on a mushroom.
  - Implementation: `field` is threaded to every segment, but only the head branch reads it; body
    segments still follow their leader via BODY_FOLLOW_GAP.
  - Rationale: the current model has bodies FOLLOW the leader down rather than run their own edge
    turns; a per-body obstacle turn would require reworking the body-follow model, out of ml3-6 scope.
  - Severity: minor.
  - Forward impact: a later story may give bodies independent obstacle turns if fidelity requires it.

## Sm Assessment

Setup complete for ml3-6 — OBSTAC mover→playfield address derivation (ml3-3 follow-up), a 3-point TDD story on `arcade`, branch `feat/ml3-6-obstac-address-derivation` cut from `develop`.

**Scope for TEA (red phase):** write failing tests pinning the full OBSTAC address math against the cited ROM source, then hand to Dev to wire it in. The derivation, per the story's MLSUB.MAC citations:
- V/8 with the half-way-to-next-row ADC-carry round (MLSUB.MAC:853-857)
- H' = H + 8·dir (MLSUB.MAC:834-871)
- (0xF7 − H') & 0xF8 column fold + right-edge PLYFLD+3C0 wrap (MLSUB.MAC:872-886)
- Reconcile the 0x400 (conway field base) vs 0x800 (MLSUB.MAC:886 exit comment) addressing — this is the key ambiguity to resolve from source, not to guess.
- Then wire `obstac(field,{h,v,dh})` into `stepMillipede` MOTION/EXPLOD collision.

**Fixtures cited by the story:** hand-derived, three cases — non-wrapping, left-margin, right-edge. The `obstacleAt` probe already shipped in ml3-3; reuse it rather than re-adding.

**Guardrails from prior Millipede work:**
- The mushroom field + bands are owned by `plugins/millipede/src/core/conway.ts` (ml3-4); ml3-3 reducers reuse it. Do not re-own the field.
- Cite ROM line numbers verbatim from the vendored source; derive the 0x400-vs-0x800 base from MLSUB.MAC, do not pick one by feel.
- Core-boundary rule applies: address math is pure sim → `plugins/millipede/src/core/`, kept clock/render-free.

**Routing:** phased TDD, next phase = `red`, next agent = TEA. No blockers. Merge gate clear (no open PRs).
## Tea Assessment

**RED complete.** New suite `plugins/millipede/tests/obstac.test.ts` (21 tests): **18 failing** for the right reasons, **3 passing** controls. Committed as `203d033f` ("test: add failing tests for ml3-6"). Lint (`tsc --noEmit`) clean.

### What GREEN (Dev / Korben) must ship
1. **`src/core/mushroom.ts` — `obstac(field, {h, v, dh}): number`** — the full OBSTAC mover→playfield address derivation (MLSUB.MAC OBSTA0 `:834-840`, OBSTAC `:853-889`):
   - `dir = dh < 0 ? -1 : +1` (`:836-839`)
   - `vpart = (v>>3) + ((v&4)?1:0)` — V/8 with the half-way ADC-carry round (`:853-856`)
   - `H' = (h + 8*dir) & 0xFF` (`:860-866`)
   - `col8 = (0xF7-H') < 0 ? 0 : (0xF7-H') & 0xF8` — left-margin clamp on borrow (`:870-872`)
   - `abs = 0x1000 + col8*4 + vpart`; right-edge wrap when `abs >= 0x13C0` → `low=(low&0x1F)|0xA0` (`:879-884`)
   - return `obstacleAt(field, abs - 0x1000)` (`:887-888`). Pure core; reuse conway geometry; **do NOT fork a base** (see Delivery Finding — base is `0x1000`).
2. **`src/core/millipede.ts` — wire into `stepMillipede`'s MOTION head turn** (`:1527-1539`). Optional 3rd `field?` arg (keeps the six ml3-1 callers compiling). A live HEAD whose cell-ahead `obstac` is an obstacle reacts per the band table: `0`→coast; `[1,0x2E)`→turn; `[0x2E,0x6E)` DDT clouds→pass through (coast); `[0x6E,0x78)`→turn; `[0x78,0x7C)` poison→set head `POISON_COLOR` (0x1B) **and** turn; `[0x7C,0x80)`→turn. "Turn" = the same descend-a-row seam the edge turn already routes to (15$ is the shared target).

### Test map
- AC-1 non-wrapping `{0x77,0x50,+1}`→idx(15,10); AC-2 left-margin `{0xF0,0x28,+1}`→idx(0,5); AC-3 right-edge wrap `{0xF8,0x18,+1}`→idx(29,3) (the three cited fixtures).
- AC-4 dir-sign discriminator; AC-5 half-row ADC round; AC-6 background-bit mask (`&0x7F`).
- AC-7 wiring: mushroom-ahead descends vs empty-field control coasts level. AC-8 band table (cloud passes, poison poisons+turns, plain mushroom turns). AC-9 optional-field regression.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **#8 no vacuous assertions:** every test asserts a specific value/inequality; no `let _ =`, no `assert(true)`. Self-checked.
- **#15/#18 guards mutation-tested, not tautological:** each derivation fixture plants a byte at the offset it claims and reads it back through `obstac`, so a wrong offset reads an empty cell → `0` → red. Explicit anti-tautology mutants: AC-1 "a neighbour is NOT seen", AC-4 "sign reads a DIFFERENT cell", AC-5 "without the round reads row 10 — assert NOT", AC-3 "without the wrap reads OOB → 0", AC-8 discriminates cloud-pass vs mushroom-turn.
- **Core-boundary / purity (ml1-1):** `obstac` is pure math + a typed-array read; `purity.test.ts` auto-scans `src/core/` and will cover GREEN's new code (no clock/entropy/browser).

### Notes for GREEN
- The 3 passing controls (empty-field coast, cloud pass-through, no-field regression) must STAY green after wiring.
- Pre-existing unrelated failure `tests/audit/mushroom-claims.test.ts` (ROCK `{BT-33,DD-5,SC-51}` vs expected `{BT-33,SC-51}`) is NOT ml3-6 — see Delivery Findings.

**Routing:** red complete → next phase `green` → Dev (Korben).
## Dev Assessment

**GREEN complete.** obstac.test.ts **21/21**; full millipede project **727/728** (the one failure is the pre-existing, unrelated ml3-7 `mushroom-claims` ROCK/DD-5 audit — see Delivery Findings). Lint (`tsc --noEmit`) clean. purity.test.ts green (obstac is pure core). Committed + pushed.

- **Branch:** `feat/ml3-6-obstac-address-derivation`
- **Commits:** `203d033f` (RED tests) · `feat(ml3-6): implement OBSTAC address derivation + wire into MOTION` (GREEN)

### What shipped
1. **`src/core/mushroom.ts` — `obstac(field, {h,v,dh}): number`** (MLSUB.MAC OBSTA0 :834-840, OBSTAC :853-889): `dir = sign(dh)`; `vpart = v/8 + half-row ADC round`; `H' = h + 8*dir`; `col8 = (0xF7-H')&0xF8` with left-margin clamp on borrow; `abs = 0x1000 + col8*4 + vpart` with the right-edge (col 30→29) wrap; returns `obstacleAt(field, abs - 0x1000)`. Base `PLYFLD = 0x1000`, shared with conway (the "0x800/0x400" of the story resolved — see TEA finding).
2. **`src/core/millipede.ts` — MOTION obstacle turn** (MILLI.MAC:1528-1539): `stepMillipede(segs, frame, field?)` gains an optional field; a live head reads its cell-ahead `obstac` and reacts via a local `obstacleReaction` band table — `none` (0 / DDT cloud [CLOUD,DDT)) coasts, `turn` drops a row (the shared 15$ edge-turn seam), `poison` [POISON,NORMAL) turns AND sets the head `POISON_COLOR`. `CLOUD=0x2e` defined locally (MLDEF.MAC:202); `DDT/POISON/NORMAL` imported from conway.

### Minimalism / scope
- No new exported classifier — `obstacleReaction` is a local helper (tests exercise behavior through `stepMillipede`, not a separate export).
- Optional `field` keeps the six ml3-1 free-space callers compiling and behaving identically.
- Two design deviations logged (EXPLOD has no OBSTAC seam → MOTION-only; head-seam turn, bodies unchanged).

### For Reviewer
- The obstac fixtures are base-independent (offset = col*0x20+row); a wrong base reads empty/OOB → 0 → red. Cross-check the derivation against `reference/original-source/millipede/MLSUB.MAC:834-889` and the `PLYFLD=0x1000` claim (`MLDEF.MAC:103`).
- Pre-existing `mushroom-claims` ROCK/DD-5 failure is NOT this story; do not attribute.

**Routing:** green complete → next phase `review` → Reviewer (Zorg).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | mechanical | confirmed: 21/21 ml3-6, 727/1 full (1 pre-existing), lint clean, no smells |
| 2 | reviewer-edge-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-covered (bounds sweep) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-covered |
| 4 | reviewer-test-analyzer | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-covered + rule-checker #8/#29 |
| 5 | reviewer-comment-analyzer | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-covered + rule-checker #17 |
| 6 | reviewer-type-design | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-covered + rule-checker #2 |
| 7 | reviewer-security | Yes | findings | 1 (low) | confirmed 1, resolved as ROM-faithful (no change), 0 dismissed |
| 8 | reviewer-simplifier | Yes | Skipped (disabled) | N/A | Disabled via settings — hand-covered |
| 9 | reviewer-rule-checker | Yes | findings | 4 + 1 watch | confirmed 4: 3 fixed, 1 accepted w/ rationale; watch addressed |

**All received:** Yes (3 enabled returned, 6 disabled pre-filled)
**Total findings:** 5 confirmed (4 fixed, 1 accepted w/ rationale), 1 verified ROM-faithful (no change), 0 dismissed without rationale

## Reviewer Assessment

**Verdict:** APPROVED

The ml3-6 OBSTAC derivation + MOTION wiring is faithful to primary source, correct across its entire input domain, and all confirmed review findings were resolved in this round (fixes committed `f6879c1d`). No Critical or High issues remain.

### Findings (all resolved or verified)

- [RULE][DOC] **Stale module header** at `mushroom.ts:18-22` (rule-checker #17/#24, was HIGH) — the header claimed "ships the OBSTAC PROBE only; movers wire the full obstac in a follow-up" while this very diff ships `obstac()` in that file. **FIXED** — header rewritten to state obstac ships here and the base resolved to 0x1000.
- [TEST] **Ordering assertion standing in for a magnitude** at `obstac.test.ts` AC-7/AC-8 (rule-checker #29) — the comment derived the exact turn value (v=0x4E) but the asserts used `toBeLessThan(0x50)`, so a wrong-magnitude descend (e.g. by 1) would pass. **FIXED** — three asserts tightened to `toBe(0x4e)`.
- [TYPE] **Non-readonly param** at `mushroom.ts:163` (rule-checker #2) — `mover` is read-only in practice but not `Readonly<>`, unlike the file's own `restor(..., gate: Readonly<RestorGate>)`. **FIXED** — `mover: Readonly<{h,v,dh}>`.
- [DOC] **OVRLAP scope nuance** at `millipede.ts:285-289` (rule-checker watch item) — the "no-turn" fall-through comment omitted that the ROM's 13$ (`:1541`) runs `JSR OVRLAP` (segment-overlap turn) first. **FIXED** — comment now notes OVRLAP is a distinct, still-unwired mechanic; filed as a Delivery Finding.
- [SEC] **vpart reaches 0x20 for v∈{252..255}** at `mushroom.ts:165` (security, low confidence) — carries into the column field, reading the next column's row 0. **VERIFIED ROM-FAITHFUL, no change:** the 6502 does `LSR×3 / ADC I,0 / STA OBST` with NO mask (MLSUB.MAC:853-857) and `:877 ORA OBST` spills the identical carry; clamping vpart would DIVERGE from the ROM (ROM always wins). Also unreachable in wired callers (max V = ENTER_V = 0xF8 = 248; `move()` only decreases V). Filed as a Delivery Finding for future bestiary-mover callers with a wider V domain.
- [TYPE][TEST] **Test mock declares mutable `Segment[]`** at `obstac.test.ts:107-123` (rule-checker #8, low) — the real `stepMillipede` takes `readonly Segment[]`. **ACCEPTED w/ rationale (non-blocking):** structurally assignable, harmless at compile time, and matches the existing `millipede.test.ts` mock convention; tightening a test-local mock adds no coverage.

### Hand-covered dimensions (disabled subagents)

- [EDGE] **VERIFIED** — exhaustive sweep over all 131,072 (h,v,dh) inputs: derived offset stays in `[0, 0x3BF]` (min 0, max 0x3BF), never negative, never OOB. The right-edge wrap is precisely what bounds it (worst unwrapped 0x3E0 always lands in the 0x13C0 catch window). Corroborated independently by [SEC].
- [SILENT] **VERIFIED** — no swallowed errors; `obstacleAt` masks `&0x7f`; the `if (field)` guard is the intentional optional-field (free-space) path, documented, not a silent fallback.
- [SIMPLE] **VERIFIED** — `obstacleReaction` is a local (non-exported) helper; `obstac` is straight-line ROM transcription with no abstraction beyond what the tests demand. No dead code.
- [DOC] **VERIFIED** — every citation (PLYFLD 0x1000 = MLDEF.MAC:103; CLOUD 0x2e = MLDEF.MAC:202; obstac math = MLSUB.MAC:834-889; band table = MILLI.MAC:1528-1539) re-checked against the vendored source; citation gate green (818/818).

### Rule Compliance (`.pennyfarthing/gates/lang-review/typescript.md` + project rules)

- **Core/shell purity (project's #1 rule):** `obstac`, `obstacleReaction`, and the wiring are all `src/core/` — pure math + typed-array reads, no clock/entropy/browser. `purity.test.ts` AST scanner green. COMPLIANT.
- **ROM-fidelity citations:** all new constants/derivation cited and byte-verified; citation gate 818/818. COMPLIANT.
- **No forked field base/model (project rule):** `obstac` reuses conway's 0x1000 base and `offset = col*0x20 + row`; `col8*4 = column*0x20 = PLYFLD_STRIDE`. No second model. COMPLIANT.
- **#2 readonly params:** fixed (`mover: Readonly<>`). COMPLIANT after fix.
- **#3 enum idiom:** `ObstacleReaction` is a string union (recommended), consumed by an if-chain with an unconditional final branch — no assertNever gap. COMPLIANT.
- **#8/#29 test quality:** magnitude asserts tightened; anti-tautology counter-fixtures present (neighbor-not-seen, sign-reads-different-cell, without-round-reads-row-10, without-wrap-reads-OOB). COMPLIANT after fix.
- **#17 comment accuracy:** stale header + OVRLAP nuance fixed. COMPLIANT after fix.
- **#1/#10/#11/#21/#22 (type escapes / input validation / error handling / degenerate inputs / NaN):** no `as any`/`!`/`ts-ignore`; inputs are internal sim state; `dh===0→+1` is a faithful port of the ROM `BMI`. COMPLIANT.

### Devil's Advocate

Suppose this code is broken. The most dangerous surface is the address arithmetic: a single off-by-one in the `col8*4`, the base, or the wrap threshold would silently read the wrong mushroom cell, and because typed-array OOB reads coerce to 0 (an "empty" cell), a wrong derivation would look like "no obstacle" — the millipede would glide through mushrooms and nobody would see a crash. So: is the base right? A confused reader could believe the ROM's own `:886` exit comment ("800+…") and use 0x800, shifting every lookup by 0x800 and reading garbage/zero — this diff explicitly refutes that with two independent derivations (PLYFLD/0x400 ×4 = 0x1000, and conway.ts:36), and the fixtures would go red under 0x800 (they read empty cells → 0). Is the wrap threshold right? A malicious V=0xFF at column 30 is the exact corner where the ROM folds off-field; if my `>= 0xc0` were `> 0xc0`, the boundary cell (low exactly 0xC0) would escape the fold and read OOB — but the exhaustive sweep proves max offset is 0x3BF, so the `>=` is correct. What about a head that is simultaneously at a screen edge AND facing a mushroom? The obstac check runs first and both paths call `move(s,true)` — no double-turn, no contradiction. What about a poisoned head re-entering the obstac path? It returns at the `POISON_COLOR` dive branch before reaching obstac, so it can't be re-poisoned or spuriously turned. What about a body segment? It returns in the body-follow branch before obstac — bodies never consult the field, which is the documented (deviation-logged) scope. The one genuinely uncomfortable spot is the reversal timing: the tests pin the descend (v=0x4E) but not an immediate dh flip, trusting the shared 15$/edge-turn seam and its phase-4 gate — a reviewer could argue the obstacle turn should reverse instantly. But the ROM shares 15$ between edge and obstacle turns, so reusing the exact edge seam is the faithful choice, not a shortcut. Nothing here reaches the outside world — no I/O, no untrusted input, no secrets — so the failure modes are all fidelity, and every one I can construct is either bounded by the sweep or matched to the ROM.

### Dispatch tags (all 8 accounted for)
[EDGE] verified (bounds sweep) · [SILENT] verified (no swallowed errors) · [TEST] fixed (magnitude asserts) · [DOC] fixed (stale header + OVRLAP) · [TYPE] fixed (Readonly) + accepted (test mock) · [SEC] verified ROM-faithful (vpart spill) · [SIMPLE] verified (minimal) · [RULE] 4 confirmed (3 fixed, 1 accepted)

**Routing:** review complete → APPROVED → next phase `finish` → SM.