---
story_id: "jt3-5"
jira_key: "jt3-5"
epic: "jt3"
workflow: "tdd"
---
# Story jt3-5: Baiters + the RV4 ptero-farming patches — BAITBL schedule (V4 15s→1s), max-3 PCHASE=-1, the PCHASE-gated patch block

## Story Details
- **ID:** jt3-5
- **Jira Key:** jt3-5
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** review
**Phase Started:** 2026-07-21T17:26:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T17:26:22Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): PATCH7's comment "NEW TIME 2 MIN 16 SEC" (=136 s) does NOT reconcile with the shipped V4 `BAITBL` table — the full walk sums to **186 s (3:06)**, not 136 s. By contrast the RV3 "OLD TIME 4 MIN 16 SEC" reconciles EXACTLY (256 s). Tests pin the TABLE as authoritative (`baiter.test.ts` asserts both totals) and quote the comment as provenance only; the "2:16" is an approximate/stale marketing figure, not a derivable constant. Affects `joust/docs/rom-study/subsystems.md` §3 (a one-line note could record the mismatch). *Found by TEA during test design.*
- **Conflict** (non-blocking): the AC-2 wording "each patch keeps its pre-patch instruction as a `********` comment" does NOT match the source. The anti-farming PATCH block (`JOUSTRV4.SRC:6296-6360`) preserves each displaced instruction as an **inline `(RESTORE OLD INSTRUCTION)`** comment (identical to jt3-3's `PATCH1` `OLD INSTRUCTION` convention); the `********` prefix provenance lives on the **BAITBL RV3 schedule rows** (`JOUSTRV4.SRC:2135-2148`, AC-1). Tests assert the ACTUAL mechanism for each. GREEN must carry the `********` RV3 provenance into `src/core/baiter.ts` (the `baiter-source` port-provenance pin requires it) and may note the inline patch-block convention. *Found by TEA during test design.*
- **Question / SCOPE BOUNDARY** (non-blocking, decided): jt3-5 STAYS at the **spawn-schedule + PCHASE-gating + patch-behaviour** level — the six patches are tested PARAMETRICALLY on `pchase` (pure functions), and the send-off clock (`seedBaiterClock`/`stepBaiterClock`) is a pure schedule model. NO live baiter joust is wired into `src/core/frame.ts`/`collisionPass`. Therefore `resolvePteroAttack` is UNCHANGED here and the degenerate `facingInto` equal-column edge (`Math.sign(0)=0` returns no-kill vs ROM `COLDX=0/BPL` allowing a kill) is **NOT** this story's to fix — it remains jt3-7's (the playable live slice), per the epic's stated preference. Affects `joust/src/core/ptero.ts:181` (the edge) — do not touch it in GREEN. *TEA scope call.*
- **Improvement** (non-blocking): `PBAITS`'s explicit seed (=2, which yields the wave→BAISBL-slot mapping wave1→slot2 / wave2→slot1 / wave≥3→slot0) was NOT located in the vendored text; the mapping is DERIVED from the 3-entry labelled `BAISBL` table + the `DEC PBAITS` decrement (`JOUSTRV4.SRC:2078-2083`). `baisblStartIndex` behaviour is pinned in `baiter.test.ts`; the source test cites `BAISBL` + the decrement, NOT a `PBAITS=2` literal. If GREEN finds the seed line, add a JT35 claim for it. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): CONFIRMED — the `PBAITS=2` seed literal is still not in the vendored `JOUSTRV4.SRC` near WBEGIN (`:2078-2089` reads/decrements `PBAITS` but never loads it; the init lives in a workspace table outside this block). I did NOT fabricate a claim for it; `baisblStartIndex` is derived (`Math.max(0, 2 − (wave−1))` → `BAISBL[pbaits]`) and pinned only by `baiter.test.ts` + the source-side `BAISBL` offset citations (JT35-012/013/014). *Found by Dev during implementation.*
- **Gap** (non-blocking): TEA's "2:16" mismatch re-derives cleanly — the shipped V4 `BAITBL` walk sums to **186 s (3:06)**, not the PATCH7 comment's 136 s; RV3 = 256 s exactly. The one-line note TEA proposed for `joust/docs/rom-study/subsystems.md` §3 is still unwritten (out of GREEN scope — src/docs claims only). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the "2 MIN 16 SEC" (=136 s) PATCH7 comment vs the shipped V4 table (=186 s, 3:06) discrepancy is a genuine, interesting ROM artifact — the author under-collapsed relative to the banner. It is fully captured in `baiter.test.ts:86-88`, `src/core/baiter.ts`, and this session, so no knowledge is lost, but TEA's proposed one-line note in `joust/docs/rom-study/subsystems.md` §3 remains unwritten. Affects `joust/docs/rom-study/subsystems.md` (one-line dossier note; the TABLE is authoritative). *Found by Reviewer during code review.*
- **Gap** (non-blocking, jt3-7): the pure send-off clock does not model `DBAIT` (the baiter-removal delay). `DBAIT` is `CLR`ed at seed (`:2090`) and only ever set non-zero at `:4678 STB DBAIT` inside the player-death/wave path — outside jt3-5's schedule block. Modeling `DBAIT=0` is faithful for this pure schedule, but jt3-7 (live baiter joust + removal) MUST wire the `DBAIT` delay (`:2100-2102`, `:1542`) or the live cadence will diverge after a baiter is removed. Affects `joust/src/core/baiter.ts` + jt3-7's scheduler. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Patch modelling:** AC-2 says "six PCHASE-gated patches". The source has SIX numbered patches in `JOUSTRV4.SRC:6296-6360` (PATCH4-9): FIVE are code (aim-lower/4, slow-dive/5, lane-reroute/6, first-pass-miss/8, seek-timer/9) and PATCH7 is the schedule TABLE (the AC-1 15s→1s collapse). Tests model the five as pure `pchase`-gated functions and PATCH7 as the `BAITBL` schedule. Reason: PATCH7 modifies no code (`EQU *`, "NO CODE MODIFIED, JUST A TABLE"), so it cannot be a gated function — it IS the schedule already covered by AC-1.
- **Provenance mechanism:** tests assert the ACTUAL source provenance (inline `(RESTORE OLD INSTRUCTION)` for the patch block; `********` prefix for the RV3 schedule) rather than the AC's uniform "`********` comment" phrasing. Reason: ground-truth-over-spec — the ROM is canonical (see the matching Delivery Finding).
- **Scope:** the send-off SCHEDULE is modelled live as a pure clock (`stepBaiterClock`) but the baiter JOUST is NOT wired into the frame scheduler (deferred to jt3-7). Reason: the epic scopes jt3-5 to the schedule + PCHASE gating + patch behaviour (see the Delivery Finding).

### Reviewer (audit)
- **Patch modelling (PATCH7 = table, five gated fns):** ACCEPTED. Verified `:6317 PATCH7 EQU * "NO CODE MODIFIED, JUST A TABLE"` — PATCH7 cannot be a gated function; it IS the AC-1 schedule collapse. Correct.
- **Provenance mechanism (inline `(RESTORE OLD INSTRUCTION)` for the patch block, `********` for the RV3 schedule):** ACCEPTED — ground truth confirmed line-by-line. The AC-2 phrasing "each patch keeps its pre-patch instruction as a `********` comment" is imprecise: the patch block (`:6310`, `:6360`, `:6344`, `:6323`) uses inline `(RESTORE OLD INSTRUCTION)`; the `********` prefix is the RV3 `BAITBL` rows (`:2135-2148`). Tests + `src/core/baiter.ts` assert the ACTUAL mechanism and carry the `********` marker. Ground-truth-over-spec is correct.
- **Scope (pure clock, no frame wiring; `resolvePteroAttack`/`ptero.ts:181` untouched):** ACCEPTED — epic-ruled (jt3-7 owns the playable slice); confirmed no `frame.ts`/`collisionPass`/`ptero.ts`/`enemy.ts` edits in the diff.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New core behaviour — the baiter spawn schedule + PCHASE-gated RV4 patches. RED phase (test-only, no src/).

**Test Files:**
- `joust/tests/helpers/baiter-contract.ts` — TEA-authored contract + `loadBaiter()` for the not-yet-built `src/core/baiter.ts` (the loadPtero/loadTroll pattern; runtime specifier so absence is a clean per-test error, not a collection crash).
- `joust/tests/baiter.test.ts` — BEHAVIOUR: AC-1 (SECONDS*60/8 schedule, V4 15s→1s collapse, max-3 cap + send-off clock, PCHASE=−1), AC-2 (the six patches proven BOTH WAYS, mutation-resistant gate), AC-4 (seeded-stall determinism + purity).
- `joust/tests/baiter-source.test.ts` — SOURCE re-derivation (double-entry via the independent reader), AC-3 seam vs jt2-2 (napTicks(15)=112=INTEL_GROWTH_NAPS, ×8=896 — the budget-896 oracle kept green), + JT35-* claim coverage (floor 13).

**Tests Written:** 52 tests / 2 files covering all 4 ACs.
**Status:** RED — `npx vitest run tests/baiter.test.ts tests/baiter-source.test.ts` → **33 failed | 19 passed**. Every red is "baiter module not built yet" (missing `src/core/baiter.ts`) or missing JT35-* claims — the RIGHT reason. The 19 green are the INDEPENDENT ROM re-derivations (confirming the transcription: cap `#3-1`, PCHASE `#-1`, the V4/RV3 `BAITBL` rows, the six patch source lines, the BAISBL offsets) plus the jt2-2 budget-896 oracle. Full joust suite: 33 failed | 1271 passed — no non-baiter regression.

**Claims:** DEFERRED to Dev under a coverage floor (JT35-* ≥ 13, one per required law), mirroring jt3-4/jt3-3. `docs/rom-study/claims/baiter.json` is Dev's to write.

**Handoff:** To Dev (Julia) for GREEN — create `src/core/baiter.ts` (satisfying `baiter-contract.ts`) + `docs/rom-study/claims/baiter.json`. Scope: schedule + PCHASE gating + parametric patch behaviour ONLY; do NOT wire a live baiter joust or touch `resolvePteroAttack` (jt3-7). See `.session/jt3-5-handoff-red.md`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/baiter.ts` - NEW pure-core module: BAITER_PCHASE=−1, MAX_BAITERS=3, the BAITBL SECONDS*60/8 schedule (`napTicks`, `BAITBL_SECONDS_V4`/`_RV3`/`BAITBL_V4`), the V4 15s→1s collapse with the `********` RV3 provenance, `BAISBL`/`baisblStartIndex`, the pure send-off clock (`seedBaiterClock`/`stepBaiterClock`), and the six PCHASE-gated patches (`patchFires` + aim-lower/slow-dive/first-pass-miss/seek-timer/lane-reroute), each gated both ways.
- `docs/rom-study/claims/baiter.json` - NEW: 33 JT35-* claims (floor 13), byte-exact verbatim, each naming its fully-qualified `JOUSTRV4.SRC:NNNN`; covers all 13 REQUIRED ranges incl. the V4 schedule (:2150-2163) and the RV3 ******** rows (:2135-2148).

**Tests:** 1305/1305 passing (GREEN) — full suite, incl. baiter (52/52), citations byte-verify, and jt1-7 purity. Build green (`tsc --noEmit && vite build`).
**Branch:** feat/jt3-5-baiters-rv4-patches (pushed)

**Verification notes:**
- TEA's BAITBL trace re-derived cleanly: V4 walk = 186 s, RV3 = 256 s; the collapse (six 1 s vs one, two 15 s vs seven) matches source `:2150-2163` / `:2135-2148`.
- The 6-patch gate re-derived both ways against `:6296-6360`: PATCH6 mid-band boundaries confirmed as `260+7=267` (right) / `200-28-7=165` (left); PATCH5 = signed `>>2`; PATCH9 saturates at 1; PATCH8 = 138; PATCH4 = +2.
- AC-3 seam held green as an oracle: `napTicks(15)=112=INTEL_GROWTH_NAPS`, ×8 = 896 (jt2-2 budget-896 unchanged, enemy.ts untouched).
- Scope honoured: no scheduler/`collisionPass` wiring, `resolvePteroAttack`/`ptero.ts:181` untouched (jt3-7).
- No test or contract file edited.

**Handoff:** To review (Reviewer).

## Reviewer Assessment

**Verdict:** APPROVED

The crux — baiters + patches are ONE story because the six anti-farming patches gate on
`PCHASE` and PCHASE is exactly what the baiter send-off stamps (`-1`) — is proven both
ways and re-derives cleanly against `JOUSTRV4.SRC`. Full suite green independently
(`npx vitest run` → 44 files / **1305 passed**; the "3 citation error(s) / no claims
found" lines are the jt1-9 negative guard-teeth test, not failures). `npm run build`
green (`tsc --noEmit && vite build`). Working tree clean; only the 5 expected files
changed; `enemy.ts` / `ptero.ts` / `frame.ts` untouched.

**[RULE] LOAD-BEARING claim 1 — the PCHASE gate, both ways.** `:2108-2113` (`CMPA #3-1`
cap, `LDA #-1 / STA PCHASE,Y`) and the patch block `:6296-6360` verified line-by-line.
`patchFires(pchase)=pchase!==0` fires for the baiter (`-1`), no-ops for the plain ptero
(`0`). Mutation resistance confirmed by analysis of `baiter.test.ts:230-240` +
`:182-228`: a **drop-gate** mutant (apply unconditionally) reddens ALL five PLAIN pins
(`patchAimLower(0,8)`→10≠8, `patchSlowDive(0,512)`→128≠512, `patchFirstPassMiss(0,40)`→
138≠40, `patchSeekTimer(0,5)`→4≠5, `patchLaneReroute(0,100)`→$88≠$7F); an **invert-gate**
mutant reddens the BAITER pins. Not vacuous.

**[TEST] LOAD-BEARING claim 2 — the six patches vs source.** All correct:
PATCH4 `ADDB #2` (+2, `:6359`); PATCH5 signed `>>2` via ASR/ROR×2 (`:6347-6350`);
PATCH6 flank boundaries — I re-walked the `SUBD #(260+7)` / `SUBD #(200-28-7)-(260+7)`
BGT chain: baiter `posX>267 → $88`, `165<posX≤267 → $7F`, `posX≤165 → $88`; the impl's
`posX > 267 || posX <= 165` reproduces the inclusive/exclusive edges EXACTLY (checked at
165/166/267/268). PATCH8 `LDA #138` (`:6309`); PATCH9 `DEC/BNE/INC` saturating at 1
(`:6296-6302`); PATCH7 = table (`EQU *`). All constants match.

**[TEST] Claim 3 — the BAITBL schedule.** Independently summed: V4 `:2150-2163` =
`[1×6,3,5,7,15,15,30,45,60]` = **186 s (3:06)**; RV3 `:2135-2148` = **256 s (4:16)**. RV3
matches its "OLD TIME 4 MIN 16 SEC" comment exactly; the V4 "2 MIN 16 SEC" (136 s) comment
is **stale/wrong** — the author under-collapsed. Confirmed the `********` RV3 rows are
comment lines (col-0 `*`), so `BAITBL` (label `:2134`) resolves to the V4 table and the
`(BWAVn-BAITBL-2)/2` offsets compute against V4 → `[10,11,12]` (re-derived by word index).
`napTicks` integer truncation verified (`1→7`, `15→112`, `60→450`).

**Call on the "2:16 vs 186 s" mismatch:** the **transcription is CORRECT — the TABLE is
authoritative (186 s), the comment is the stale figure.** Data-over-comment is the right
call and the tests pin it that way. A one-line dossier note in `subsystems.md` §3 is a
**nice-to-have, NON-BLOCKING** follow-up (logged as a Reviewer Delivery Finding); the
discrepancy is already recorded in tests + src + session, so nothing is lost.

**[TEST] Claim 4 — the jt2-2 seam.** `napTicks(15)=112=INTEL_GROWTH_NAPS`, ×8=896;
`enemy.ts` untouched; the IFN DEBUG budget-896 oracle (`demo.test.ts`) stays green in the
full run. Seam holds.

**[RULE] Claim 5 — the 33 JT35 claims + the unfound PBAITS seed.** Byte-verify: every JT35
verbatim matches its cited `JOUSTRV4.SRC:NNNN` line (I probed all 34 cited lines directly;
all match, none bare-`:N`). The `PBAITS=2` seed is genuinely **NOT** in the vendored block
(`:2078-2089` reads/`DEC`s it, never `LDA`s the init) — Dev did **not** fabricate a
citation; `baisblStartIndex` is derived from the 3-entry `BAISBL` + the `DEC` (JT35-012/
013/014) and it necessarily equals 2 to keep wave-1 in-bounds at `BAISBL[2]`. Clean.

**Data flow traced:** `seedBaiterClock(wave)` → `PBAITN = BAISBL[max(0,2-(wave-1))]`,
`CBAIT = BAITBL_V4[startIndex+1]` (the ROM `INCA/ASLA` before the first reload) →
`stepBaiterClock` counts down (`SUBD #1/BGT`), caps at `NBAIT>2` leaving the send-off READY
(CBAIT not committed), else sends + reloads `BAITBL_V4[pbaitn]` + walks PBAITN down
saturating at 0. Matches `:2078-2120` exactly, including the ready-and-refused re-fire.

**Scope call:** the four ACs HOLD at jt3-5's level (spawn schedule + PCHASE gating +
parametric patch behaviour). jt3-5 does **not** owe live behaviour — the epic explicitly
scopes the playable slice to jt3-7, mirroring jt3-4's deferral. Confirmed no
scheduler/`collisionPass`/`resolvePteroAttack` wiring. **APPROVE the deferral.** One
forward obligation flagged for jt3-7: model `DBAIT` (baiter-removal delay, set at `:4678`)
when it wires live removal, or the live cadence diverges post-removal (non-blocking here).

**Non-blocking nits (do not block; note for follow-up):**
- `patchSeekTimer(pchase, 0)` returns `-1` (JS int) where the ROM byte would wrap to `255`;
  unreachable given the saturate-at-1 invariant keeps PPVELX ≥ 1. Cosmetic.
- `patchSlowDive` uses JS 32-bit `>>`; agrees with the ROM 16-bit ASR/ROR for all in-range
  velocities. Fine for the logical-number port.
- PATCH6's line-3 `BLO`/`AOFFL3-2` pre-patch branch (`:6323-6325`) is the restored old
  behaviour, not the new reroute; not modelled — acceptable at this altitude.

**Observations:** 7 (5 verified-good crux confirmations + the 2:16 documentation gap + the
DBAIT scope obligation). No Critical/High findings. No blocking findings.

**Handoff:** To SM for finish-story.

## Sm Assessment

**Outcome:** APPROVED and merging — RED `d8ccfe3`, GREEN `73520a8`. Full suite 1305/1305, build green.

**Pipeline (peloton, subagents):** setup → TEA RED (33 reds; traced BAITBL SECONDS*60/8, the PCHASE gate, the 6 patches; deferred JT35 claims to Dev) → Dev GREEN (built `src/core/baiter.ts` + 33 byte-verified JT35 claims; did NOT fabricate the unfound PBAITS seed) → Reviewer APPROVED (verified all 5 load-bearing claims line-by-line against JOUSTRV4.SRC; re-walked PATCH6's boundary; confirmed the gate mutation-resistant both ways).

**Load-bearing verified (Reviewer, against source):** the PCHASE gate (`TST PCHASE / BEQ`, `:2108-2113`) fires the 6 patches for a baiter (PCHASE=-1) and skips them for a plain wave-type ptero (PCHASE=0), proven BOTH ways and mutation-resistant — the architectural justification for baiters+patches being one story. All six patch constants match source (`:6296-6360`): aim-lower +2, slow-dive signed VY÷4, lane-reroute posX>267/≤165, first-pass-miss 138, seek-timer saturating at 1, PATCH7=schedule. BAITBL is `SECONDS*60/8` nap-ticks; RV3 (256s=4:16, `********` provenance) + V4 (186s, 15s→1s collapse). jt2-2 budget-896 oracle stays green (`enemy.ts` untouched).

**"2:16 vs 186s" — RESOLVED (data over comment):** the V4 table sums to 186s (3:06); the ROM's "2 MIN 16 SEC" (136s) V4 comment is stale/wrong (author under-collapsed vs the banner). Transcription is correct and test-pinned to 186s (a future "correction" to the wrong comment WOULD redden). Captured in tests + session; a subsystems.md §3 dossier note is an optional deferred doc-polish (non-blocking).

**Scope deferral ACCEPTED:** jt3-5 = spawn-schedule + PCHASE-gating + parametric patch-behaviour; no live scheduler/collision wiring; `resolvePteroAttack`/`facingInto` untouched. All 4 ACs hold at this level (mirrors jt3-4).

**CARRIED-FORWARD → jt3-7 (threading into its setup):** (1) live ptero/baiter flight+joust+render+wave-clear wiring (the jt3-4 inert-ptero + this story's baiters); (2) the degenerate `facingInto` equal-column edge (`Math.sign(0)`) when the resolver goes live; (3) model `DBAIT` (baiter-removal delay, `:4678`) when wiring live baiter removal or the live cadence diverges post-removal. Optional deferred doc-polish: the subsystems.md §3 "2:16 vs 186s" note.
