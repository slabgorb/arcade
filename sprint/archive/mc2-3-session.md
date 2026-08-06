---
story_id: "mc2-3"
jira_key: "mc2-3"
epic: "mc2"
workflow: "tdd"
---
# Story mc2-3: O-2: pin the exact sim tick from W3INT

## Story Details
- **ID:** mc2-3
- **Jira Key:** mc2-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-06T18:38:25Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-06T17:20:15Z | 2026-08-06T17:22:12Z | 1m 57s |
| red | 2026-08-06T17:22:12Z | 2026-08-06T17:34:06Z | 11m 54s |
| green | 2026-08-06T17:34:06Z | 2026-08-06T17:41:44Z | 7m 38s |
| review | 2026-08-06T17:41:44Z | 2026-08-06T18:20:41Z | 38m 57s |
| red | 2026-08-06T18:20:41Z | 2026-08-06T18:26:22Z | 5m 41s |
| green | 2026-08-06T18:26:22Z | 2026-08-06T18:30:27Z | 4m 5s |
| review | 2026-08-06T18:30:27Z | 2026-08-06T18:38:25Z | 7m 58s |
| finish | 2026-08-06T18:38:25Z | - | - |

## Story Context

### Objective
Resolve open question O-2 by reading W3INT.MAC in full to derive the game-logic tick: which IRQ advances game logic and how the FRAME counter increments. This must be reconciled against MAME's authoritative board model to pin the TIME UNIT that every missile velocity and enemy descent speed is expressed in.

### Technical Approach
1. **Study W3INT.MAC** — the interrupt/timebase subsystem
   - Identify which IRQ handler advances game logic
   - Trace FRAME counter increments and their relationship to IRQs
   - Note the 4 IRQs/frame pattern at V=0, 64, 128, 192 (from missile.cpp:485-497)
   - Document VBLANK timing (V<24, missile.cpp:528-532)

2. **MAME Reference Data** — authoritative board model
   - VSYNC: 61.0076 Hz (from missile.cpp line refs)
   - CPU half-speed band at scanline 224 (missile.cpp:542-555) — affects per-frame work calculations
   - Cross-reference with existing FRAME globals at W3DSUP.MAC:19 and W3MAIN.MAC:2039

3. **Document Findings**
   - Derive the exact sim tick (Hz and ticks/frame) from W3INT
   - Record the nominal-60 Hz fallback for reference
   - Create a docs/rom-study note with W3INT line citations and missile.cpp anchors
   - Mark O-2 resolved in docs/rom-study/brief.md

4. **Implement Time Constant**
   - Encode the exact tick as a claim in claims/*.json (from mc2-1)
   - Create/update a core constant for shell/timebase.ts consumption
   - Replace any placeholder nominal-60 logic with the derived value

### Dependencies
- **mc2-1:** Citation checker + claims format must exist (check-citations.mjs, claims/*.json structure)
- **mc2-2:** subsystems.md + glossary.md provide context on subsystem organization
- **Blocker for mc3:** O-2 must land before the threat loop (enemy descent/velocity stories)

### Acceptance Criteria
1. docs/rom-study note derives the sim tick from W3INT (which IRQ advances logic, FRAME increment pattern), cited to W3INT lines and missile.cpp anchors
2. Exact Hz and ticks/frame recorded with nominal-60 fallback documented
3. Tick encoded as claim/const consumed by shell/timebase.ts (or core constant), replacing nominal-60
4. O-2 marked resolved in docs/rom-study/brief.md

### Key References
- **Source:** plugins/missile-command/reference/source/W3INT.MAC (interrupt/timebase subsystem)
- **Reference:** MAME missile.cpp lines 485-497 (IRQ frame structure), 528-532 (VBLANK), 542-555 (CPU half-speed)
- **Existing Notes:** W3DSUP.MAC:19, W3MAIN.MAC:2039 (FRAME globals)
- **Design:** plugins/missile-command/docs/design/mc2-dossier.md
- **Ground Truth:** plugins/missile-command/docs/rom-study/brief.md (REV-01)

## SM Assessment

Story mc2-3 set up on trunk-based `main` (no feature branch). This is a ROM-fidelity
**investigation** story: read `W3INT.MAC` in full, derive the game-logic tick (which IRQ
advances logic + FRAME increment pattern), and reconcile against MAME's board model, then
encode the derived tick as a claim/const replacing the nominal-60 placeholder.

Path check (verified during setup):
- Source present: `plugins/missile-command/reference/source/W3INT.MAC`
- rom-study docs present: `brief.md`, `subsystems.md`, `glossary.md`
- Citation checker present: `plugins/missile-command/tools/audit/check-citations.mjs`
- **Claims live at `plugins/missile-command/docs/rom-study/claims/`** (config/cursor/explosion/field
  already exist) — the context's `claims/*.json` maps here; a new tick claim belongs alongside them.
- No `shell/timebase.ts` exists yet — AC3 explicitly permits a core constant instead, so the
  implementers choose the seam.

Relevant skills for TEA/Dev: **rom-source-study** (reading the vendored source) and
**rom-fidelity-audit** (verifying constants against primary source). The cited MAME anchors
(missile.cpp:485-497, 528-532, 542-555) are the authoritative cross-reference.

Handing off to TEA (red phase): write the failing test(s) that pin the derived sim tick and
the citation contract for the new note/claim. Routing only — no implementation planning done here.

## TEA Assessment

RED phase complete. One new test file: `plugins/missile-command/tests/timebase-docs.test.ts`
(committed `72543a2`). Verified via testing-runner: **19 fail, 283 pass, zero regressions**;
all failures are missing-file RED, not test-code errors.

### What the tests demand of GREEN (Dev / Yoda)

The story's premise carries a **trap I confirmed against the source**: "how the FRAME counter
increments *in W3INT*" — but **FRAME is not in W3INT at all.** It is a W3MAIN construct:
- defined  at **W3MAIN.MAC:239** — `FRAME:  .BLKB 1  ;FRAME COUNTER (1-60)`
- advanced at **W3MAIN.MAC:781** — `INC FRAME` (the only `INC FRAME` in the tree)

W3INT owns the **interrupt/VBLANK timebase** the mainline syncs to (`IRQ:` @175,
`.SBTTL HANDLE VBLANK` @269). brief.md's `W3DSUP.MAC:19` / `W3MAIN.MAC:2039` are **logical
(non-blank) ordinals** — the recurring double-space trap; the physical FRAME lines are 239/781.
The byte-gated block forces the note to cite the **physical** increment/definition, so a note
that copies brief.md's logical numbers (which land in the double-space gaps) reddens.

Three deliverables the suite pins:
1. **`docs/rom-study/timebase.md`** — derives the tick: W3INT IRQ/VBLANK path + the W3MAIN FRAME
   counter, the 4-IRQ/frame model (V=0,64,128,192), cited to physical W3INT/W3MAIN lines AND the
   MAME `missile.cpp` anchors (485-497 IRQ, 528-532 VBLANK, 542-555 half-speed). Records the exact
   **61.0076 Hz**, the **nominal-60** fallback, the **ticks-per-frame** relationship, and the
   **scanline-224** half-speed band.
2. **`src/shell/timebase.ts`** — exports a numeric constant ≈ **61.0076** (value read out of the
   module at runtime, not a text token), records the nominal-60 fallback, and cites its source.
   **Seam choice:** the shell, not core — 61.0076 Hz is a MAME/PCB hardware rate with no W3COMN
   EQU, so it has no byte-verifiable claim; putting it in `src/core` would trip the mc2-1
   "no un-cited numeric literal" guard (`citations.test.ts` §4), which demands a claim carrying
   the value. The AC names `shell/timebase.ts` first for exactly this reason.
3. **`docs/rom-study/brief.md`** — mark O-2 **resolved** and retire the "…until W3INT is read in
   full" clause (checked positively + as a targeted retirement, lang-review #24).

### Scope guardrails for Dev
- **No claims/*.json change required.** `INC FRAME` is an instruction, not an EQU; a claim would
  break the `every claim value = radix decode of verbatim` invariant in `citations-source.test.ts`.
  The byte-gated doc-anchor cross-check is the source-of-record proof here.
- **Do not rewrite the rAF loop into a fixed-timestep accumulator.** The const must EXIST and be
  EXPORTED (so mc3 can import the time unit); wiring the loop to consume it is mc3's threat-loop
  work, deliberately out of scope. `src/main.ts` is untouched.
- Keep `src/shell/timebase.ts` a pure constants module (no DOM at load) — the test dynamic-imports
  it under the mc `node` vitest env.

### Rule Coverage (typescript.md lang-review)
This is a docs + single-constant story; the applicable checks are the **source-text-guard** family,
and the tests are written to satisfy them:
- **#15 (token vs claim / assert the count first):** anchor-count floor asserted before the
  per-anchor checks; doc assertions anchor to the derivation vocabulary + the byte-gated real
  source lines, not bare keywords.
- **#24 (retirement applied everywhere):** AC4 greps the OLD open-question clause (`until W3INT is
  read in full`), not just the new "resolved".
- **#25 (whole-file positive anchor):** the strongest guard is the byte-gated cross-check against
  the vendored `.MAC` — prose alone cannot satisfy it; the negative retirement guard (#24) is a
  whole-file `.not.toMatch`, which is the acceptable case for #25.
- **#26 / self-check (Phase C):** removed the one vacuous AC4 assertion (brief.md already contains
  `61.0076` in its open-question §3, so it could not fail for the defect it named).
- **#5 (.js extensions / ESM):** dynamic-import specifier uses the `.js` extension (`../src/shell/timebase.js`).

Lint (`tsc --noEmit`) green with the new file.

Handing off to Dev (Yoda) for GREEN. Relevant skills: **rom-source-study** (read W3INT.MAC in
full) and **rom-fidelity-audit** (verify the constants against primary source).

## Dev Assessment

GREEN complete. All 20 timebase-docs tests pass; full mc suite **302/302**, orchestrator
**409/409**, `tsc --noEmit` clean.

### The derivation (read W3INT.MAC in full — AC1)

O-2's premise is a trap and the note reconciles it faithfully: **FRAME is not in W3INT.**
The interrupt/VBLANK *timebase* is W3INT; the FRAME *counter* is W3MAIN. Chain, all physical
lines:
- `IRQ:` (`W3INT.MAC:175`) → overrun check `LDA SYNC ;OVERRUN TIME LIMIT?` (`:209`) → falls into
  `HANDLE VBLANK` (`:269`).
- `INC INTCNT ;COUNT INTERRUPTS` (`W3INT.MAC:275`) counts **all 4 IRQs/frame**; the per-frame work
  is gated by `IFMI ;IS THIS BLANK TIME?` (`:279`, reads VENDSC). Only inside that gate:
  `INC SYNC` (`:281`). So **one** of the four IRQs — the VBLANK one — advances the frame.
- Mainline blocks on it: `BEGIN ;SYNC UP WITH I/O` (`W3MAIN.MAC:497`) spins on `LSR SYNC`, clears
  it, runs one frame, then `INC FRAME` (`:781`).
- `FRAME: .BLKB 1 ;FRAME COUNTER (1-60)` (`W3MAIN.MAC:239`). Sub-second proof it means 60/sec:
  `LDA FRAME / AND I,03 / IFEQ ;UPDATE EVERY 4/60 SEC` (`:623`).

**Result: sim tick = 1 logic step per video frame = VSYNC 61.0076 Hz (nominal 60).** Not 4×/frame.

### Files
1. `docs/rom-study/timebase.md` — the O-2 derivation note (new).
2. `src/shell/timebase.ts` — `TICK_HZ = 61.0076`, `NOMINAL_TICK_HZ = 60`, `SECONDS_PER_TICK`.
   Pure constants module (no DOM at load), cited to `missile.cpp`/`timebase.md`/W3INT.
3. `docs/rom-study/brief.md` — O-2 marked resolved in all three spots (§3 paragraph, subsystem-map
   row, Open-questions bullet); the stale "until W3INT is read in full" clause retired.

### Followed TEA's guardrails
- Const in **shell**, not core (avoids the mc2-1 core-literal guard; 61.0076 has no EQU claim).
- **No `claims/*.json` change** (`INC FRAME` is an instruction, not a radix EQU).
- **No rAF-loop rewrite** — `src/main.ts` untouched. The const is exported for mc3 to consume; the
  threat loop wires it. This is why the story lands *before* mc3.

## Subagent Results — Round 1 (superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (lint pass, mc 302/302, orchestrator 409/409, 0 smells) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — assessed manually (pure constants + fs-reading tests; no boundary logic) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — assessed manually (no error-swallowing; catch re-throws with context) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — assessed manually; rule-checker + my own analysis covered test quality |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (LOW) | confirmed 1, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — assessed manually (no type surface beyond `Record<string,unknown>` + one import cast, both compliant) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed manually (`SECONDS_PER_TICK` is a trivially-correct derived export for the mc3 API; not over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 4 (all mutation-tested) | confirmed 4, dismissed 0, deferred 0 (2 blocking, 2 non-blocking) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 5 confirmed (2 blocking MEDIUM, 3 non-blocking LOW), 0 dismissed, 0 deferred

## Reviewer Assessment — Round 1 (REJECTED, superseded by round 2 below)

**Verdict:** REJECTED (round 1 — superseded by the APPROVED round-2 assessment at the end of this file)

The shipped **content is correct and faithful** — I independently re-verified every W3INT/W3MAIN
physical-line citation against the vendored source (all TRUE), and the comment-analyzer and
rule-checker did the same by direct read + control-flow trace. The derivation (1 logic step per
video frame, VBLANK-gated `SYNC`, `INC FRAME`, 61.0076 Hz) is a true reading of the assembler.
There are **no Critical or High correctness bugs.**

I am nonetheless rejecting on **verification-integrity + source-of-record coherence** — the two
failure modes this very epic's lang-review rules (#15/#18, #24) exist to catch. Per the reviewer
sidecar: *a mutation-proven vacuous guard is not a matter of opinion, and a correct implementation
with a lying guard is not done.* Both blocking findings are cheap, concentrated fixes.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[RULE][TEST]` | **AC4 "O-2 resolved" guard is vacuous** — mutation-confirmed: `/\bO-2\b.*\bresolv/i` matches "O-2 not resolved" (verified: `node -e` → true; rule-checker negated brief.md's 3 O-2 mentions → all 20 tests stayed green). The guard tests the token, not the claim (#15). | `tests/timebase-docs.test.ts:283` | Make it negation-proof — anchor to a real resolved marker (e.g. require `O-2` immediately adjacent to `resolved`/`RESOLVED` with no intervening `not`, or assert a specific `(RESOLVED` marker) AND retain the existing `.not.toMatch(/until W3INT is read in full/)`. Mutation-test: negating brief.md must go red. |
| [MEDIUM] `[RULE]` | **Source-of-record incoherence (#24)** — `subsystems.md` (:25-26, :44) and `glossary.md` (:59-67) still frame O-2 as OPEN ("module not yet read", "unresolved"), and `glossary.md` still cites the stale logical-ordinal lines `W3DSUP.MAC:19`/`W3MAIN.MAC:2039` that this story proved wrong. Three rom-study docs now contradict each other. | `docs/rom-study/subsystems.md:25-26,44`; `docs/rom-study/glossary.md:59-67` | Mark O-2 resolved consistently (point to `timebase.md`; subsystems.md W3INT row → real `.SBTTL` anchors `:169`/`:269`); correct glossary.md's FRAME citations to physical `W3MAIN.MAC:239` (def) / `:781` (`INC FRAME`). |
| [LOW] `[RULE]` | `lineAt(module,line)` shadows `citations-source.test.ts`'s `lineAt(file,n)` with **different semantics** (bare module name vs full path) — the #18 "one concept, two helpers" trap. | `tests/timebase-docs.test.ts:189` | Rename (e.g. `physLineOf`) so a porter can't pass the wrong arg silently. |
| [LOW] `[DOC]` | The `LDA FRAME / AND I,03 / IFEQ ;UPDATE EVERY 4/60 SEC` snippet is cited to one line but spans physical 619/621/623 (#24 "quoted span cited as one line"). | `docs/rom-study/timebase.md:49` | Cite `W3MAIN.MAC:619-623` (or per-line). |
| [LOW] `[RULE]` | The bare `:781` in the rate table (inheriting `W3MAIN` from earlier in the cell) is invisible to `ANCHOR_RE`, so that citation instance escapes the byte-gated sweep (#24 "sweep both spellings"). | `docs/rom-study/timebase.md:57` | Write it fully-qualified `W3MAIN.MAC:781`. |

### Dispatch tags
- `[SEC]` — reviewer-security: **clean**. No auth/network/secret surface; test regexes bounded (no ReDoS), all fs paths built from `import.meta.url`, dynamic-import specifier is a hardcoded literal. Nothing to confirm.
- `[DOC]` — reviewer-comment-analyzer: 1 confirmed LOW (the `:623` span citation, above). All other citations verified TRUE against source.
- `[RULE]` — reviewer-rule-checker: 4 confirmed (2 blocking, 2 LOW), all mutation-tested. The byte-gated anchor block and the AC3 numeric check were mutation-proven to have teeth (wrong line → red; `TICK_HZ`→60.5 → red).
- `[TEST]` — test-analyzer disabled; assessed manually + via rule-checker. Confirmed the AC4-guard vacuity (blocking, above) and that the byte-gated block + AC3 runtime check are genuinely mutation-sensitive.
- `[EDGE]` — edge-hunter disabled; assessed manually. No boundary logic in a constants module; the one edge (`split('\n')[line-1] ?? ''` on an out-of-range citation) correctly degrades to a rejected blank anchor.
- `[SILENT]` — silent-failure-hunter disabled; assessed manually. No swallowed errors; `loadTimebase`'s catch re-throws with added context.
- `[TYPE]` — type-design disabled; assessed manually. Only type surface is `Record<string,unknown>` (the rule's own recommended form) and one `as` on an `import()` result — compliant.
- `[SIMPLE]` — simplifier disabled; assessed manually. `SECONDS_PER_TICK` is an unused-elsewhere derived export, but it is a deliberate, trivially-correct convenience for the mc3 time-unit API — not over-engineering.

### Rule Compliance (typescript.md lang-review — changed .ts files)
Enumerated by the rule-checker across 26 rules / 61 instances; I confirm the material ones:
- **#15 (token vs claim):** 16 instances. **1 VIOLATION** — the AC4 resolved guard (blocking, above). The count-floor (`byModule >= 1`) and the byte-gated line checks are compliant and mutation-proven.
- **#18 (apparatus fails by passing):** 3 instances. **1 VIOLATION** — the `lineAt` shadow (LOW, above). The AC3 numeric check reads the REAL module value — compliant.
- **#24 (retirement applied only where named):** **2 VIOLATIONS** — subsystems.md/glossary.md coherence (blocking) + the bare `:781` (LOW). brief.md itself retires the clause correctly (grepped repo-wide — the old phrase survives only inside the test's own quoted string).
- **#25 (whole-file positive anchor):** 15 instances flagged. **Accepted with rationale, non-blocking** — the doc-content checks match the established `dossier-docs.test.ts` doc-contract pattern for a small (73-line) file, and the byte-gated source cross-check is the real teeth. Recommend TEA fold the weakest bare-number `doc.includes()` checks into a bounded window while reworking, but this is not independently blocking.
- **#11 (catch cast):** **1 instance, accepted** — `(e as Error).message` in `loadTimebase` matches the established repo idiom (`citations.test.ts`) and is a test-only diagnostic on an import failure. Nit, non-blocking.
- **#1/#5/#8/#17/#26:** compliant (no `as any`/ts-ignore; `.js` extension present; no vacuous/`as any` assertions; header comments verified TRUE against source; the numeric assertion compares the real module value to an external hardware literal, not a self-referential term).

### Observations (≥5)
1. **Faithful, mutation-hardened core.** The byte-gated anchor cross-check genuinely reddens on a wrong citation (rule-checker: `:781`→`:780` → 2 fails), and the AC3 check reddens on a wrong rate (→60.5 → 1 fail). Good pattern.
2. **The FRAME-not-in-W3INT finding is correct and well-documented** (`game.ts`-independent; verified `INC FRAME` @W3MAIN:781 unique via `grep -a`). This is the story's real value.
3. **Verified-good:** `src/shell/timebase.ts` correctly sits in the shell, dodging the mc2-1 core-numeric-literal guard; `main.ts` untouched (no premature loop rewrite).
4. **Verified-good:** the `61.0076`/`60`/`224`/half-speed facts are carried from brief.md's pre-existing MAME citations, not newly invented; missile.cpp isn't vendored so those are out of re-verification scope (correctly).
5. **Concern (blocking #1):** a TDD story whose contract IS the test shipped a guard that green-lights the negation of its own AC — unacceptable in a teeth-focused epic.
6. **Concern (blocking #6):** the epic's product is a *coherent* source-of-record; leaving two sibling docs saying "O-2 open" + wrong citations re-introduces the exact drift this epic guards against.

### Devil's Advocate
Suppose I approve. What ships? First, a test suite that a future edit could quietly defang: the AC4
guard already passes when brief.md says "O-2 not resolved," so a careless rebase or a bad
auto-merge that flips the resolution wording would sail through green — the guard is scenery. In an
epic whose entire selling point is "nothing hardens un-cited / every guard has teeth," that is the
worst possible thing to normalize, because the NEXT author will copy this file as the template (the
`readDoc`/`lineAt` idioms are already copied from sibling tests) and propagate the weakness.
Second, a reader trusting the source-of-record set gets contradictions: `brief.md` and `timebase.md`
say O-2 is resolved with physical citations `W3MAIN:239/781`; `subsystems.md` says W3INT is "not yet
read"; `glossary.md` says the tick is "unresolved" and points them at `W3DSUP.MAC:19` /
`W3MAIN.MAC:2039` — line numbers this very story proved are the logical-ordinal trap. The
`rom-fidelity-audit` skill reads these docs; an auditor following glossary.md would land in a
double-space gap and either waste time or "correct" the right file to match the wrong one. A
confused downstream dev implementing mc3's descent speed might see glossary.md's "unresolved" and
re-derive the tick differently from `TICK_HZ`, splitting the time unit the story exists to unify.
What about a malicious/careless input? The tests read only repo-vendored files and the regexes are
bounded, so no injection/ReDoS — security is genuinely clean. The real hazard here isn't runtime;
it's epistemic: two guards that report "verified" while measuring nothing, next to three docs that
disagree on a settled fact. The fixes are a one-line regex hardening and two doc edits — far cheaper
than the drift they prevent. That tips me decisively to REJECT.

**Handoff:** Back to TEA (red) — the primary finding is a test-apparatus defect; TEA hardens the AC4
guard (and may add a coherence guard), then Dev fixes the sibling docs in green. Rework checklist:
- **R1 [BLOCKING]** Harden the AC4 resolved guard (`tests/timebase-docs.test.ts:283`); mutation-test it.
- **R2 [BLOCKING]** Reconcile `subsystems.md` + `glossary.md` O-2 status and citations (Dev, green).
- **R3–R5 [recommended, cheap]** rename shadowing `lineAt`; cite `:619-623`; fully-qualify the table's `:781`.

## Delivery Findings

- **For the Reviewer — byte-gated tests skip on CI.** The vendored `.MAC` tree is gitignored, so
  the anchor cross-check block in `timebase-docs.test.ts` (`describe.skipIf(!sourceAvailable)`)
  runs only where the source is present (locally). The always-on doc-contract + shell-const tests
  carry the CI signal; the byte-gated block was exercised here and is green.
- **`TICK_HZ` is exported but not yet consumed by `src/main.ts`.** Deliberate and in-scope: this
  story pins the time unit; mc3 expresses descent/velocity in it. Not dead code — it is the
  published API the next epic imports. Flagged so it is not misread as an unwired constant.
- **Corrected brief.md's stale FRAME citations** (`W3DSUP.MAC:19` / `W3MAIN:2039`, logical/wrong
  module) to the physical `W3MAIN.MAC:239` / `:781` as part of resolving O-2 (lang-review #17 — a
  cited-but-unverified mechanism). This is a documentation correction, not a behaviour change.

### Reviewer (code review)

- **Gap** (blocking): AC4 "O-2 resolved" guard is mutation-proven vacuous (matches negated text).
  Affects `plugins/missile-command/tests/timebase-docs.test.ts` (harden the regex; mutation-test).
  *Found by Reviewer during code review.*
- **Gap** (blocking): `subsystems.md`/`glossary.md` still frame O-2 as open and carry the stale
  `W3DSUP.MAC:19`/`W3MAIN.MAC:2039` citations (lang-review #24). Affects
  `plugins/missile-command/docs/rom-study/subsystems.md` + `glossary.md` (mark O-2 resolved; correct
  citations to `W3MAIN.MAC:239`/`:781`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): rename the `lineAt(module,line)` helper (shadows a differently-typed
  `lineAt` in `citations-source.test.ts`); cite `timebase.md`'s 3-line snippet as `:619-623`;
  fully-qualify the rate table's bare `:781`. Affects `tests/timebase-docs.test.ts` + `timebase.md`.
  *Found by Reviewer during code review.*

## Design Deviations

No design deviations. The AC offered "shell/timebase.ts (or core constant)"; chose the shell seam
the AC names first, for the reason TEA recorded (the core numeric-literal guard). Encoding was a
**const**, not a claim, because the rate is a MAME/PCB hardware value with no assembler EQU to
byte-verify — within the AC's "claim/const" latitude.

## TEA Assessment — Rework R1 (round 2, red)

Addressed the reviewer's round-1 findings in the test layer (commit `4e14f8c`). Full mc suite now
**5 fail / 304 pass** — the 5 failures are the new cross-doc coherence block, the RED signal for Dev.

- **R1 [BLOCKING, done]** — the vacuous AC4 guard is replaced. New guard is O-2-scoped: a mention
  must *positively* state resolved (`resolved && !STILL_OPEN`) AND **no** O-2 mention may be
  `STILL_OPEN` (`unresolved | not (fully|yet)? resolved | not yet read | to be read`).
  Mutation-verified with `node`: the correct brief.md passes (positively-resolved, 0 open); all
  three of the reviewer's mutations ("O-2 NOT fully resolved" / "still not resolved" / "not
  resolved → see timebase.md") now redden. Teeth confirmed.
- **R2 [BLOCKING → Dev/green]** — added 5 coherence guards (RED now) enforcing that the *sibling*
  source-of-record docs agree O-2 is resolved. **Dev's green task:**
  - `subsystems.md`: stop framing W3INT/O-2 as "not yet read" (the prose at :25-26 and the
    subsystem-map row at :44); point the row at `timebase.md` with real `.SBTTL` anchors
    (`:169 PROCESS INTERRUPT`, `:269 HANDLE VBLANK`).
  - `glossary.md`: the FRAME entry (:59-67) must drop the stale `W3DSUP.MAC:19` / `W3MAIN.MAC:2039`
    citations, cite the physical `W3MAIN.MAC:239` (def) / `:781` (`INC FRAME`), and stop calling the
    tick "unresolved". (O-4/SCITYM may remain open — the guards are scoped to O-2 lines only.)
- **R3 [done]** — renamed the shadowing `lineAt(module,line)` → `physLineOf` (was colliding with
  `citations-source.test.ts`'s `lineAt(file,n)`).
- **R4/R5 [recommended, LOW — Dev/green]** — while editing `timebase.md`: cite the `LDA FRAME / AND
  I,03 / IFEQ` snippet as `W3MAIN.MAC:619-623` (not a single `:623`), and fully-qualify the rate
  table's bare `:781` → `W3MAIN.MAC:781` so it is not invisible to the anchor sweep. No hard guard
  added for these (proportionality); reviewer will confirm.

Accepted-with-rationale (not reworked): [#25] the small-file whole-file doc anchors (match the
`dossier-docs.test.ts` pattern; the byte-gated block is the real teeth); [#11] `(e as Error).message`
in the catch (the established `citations.test.ts` idiom, test-only diagnostic).

Handing to Dev (Yoda) for green: make the 5 coherence guards pass by fixing subsystems.md +
glossary.md, and fold in R4/R5.

## Dev Assessment — Rework R1 (round 2, green)

All 5 coherence guards green (commit `0cdb22d`). Full mc suite **309/309**, orchestrator
**409/409**, `tsc` clean. No regressions.

- **subsystems.md** — corrected the mc2-2 error that lumped `W3INT` with coin as anchorless: W3INT
  DOES carry `.SBTTL` directives, so the interrupt/timebase row now cites the real
  `W3INT:169 PROCESS INTERRUPT` / `W3INT:269 HANDLE VBLANK` (byte-verified by `dossier-docs.test.ts`
  — these are genuine `.SBTTL` lines) and points at `timebase.md`; the "not yet read" prose is gone.
- **glossary.md** — the FRAME entry now cites the physical `W3MAIN.MAC:239` (def) / `:781`
  (`INC FRAME`), drops the stale `W3DSUP.MAC:19` / `W3MAIN.MAC:2039`, and is marked **O-2 resolved**.
  O-4 (SCITYM) left open, as intended.
- **timebase.md (R4/R5)** — the `LDA FRAME / AND I,03 / IFEQ` snippet is now `W3MAIN.MAC:619-623`;
  the rate table's bare `:781` is fully-qualified `W3MAIN.MAC:781`.

Verified the new subsystems `W3INT:169/:269` anchors are real `.SBTTL` lines (dossier-docs byte-gated
cross-check passes) and that `timebase.md`'s new `:619` anchor lands on a non-blank line
(`LDA FRAME`). Bonus fidelity fix: subsystems.md/glossary.md no longer misstate W3INT as unread.

Handing back to Reviewer for round 2.

## Subagent Results (Round 2 — rework re-review)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (lint pass, mc 309/309, orchestrator 409/409) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — N/A (docs + test-regex rework) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — N/A |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled — rule-checker mutation-tested the rework's guards |
| 5 | reviewer-comment-analyzer | Yes | clean | none (all new citations verified TRUE byte-for-byte) | confirmed 0, dismissed 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — N/A |
| 7 | reviewer-security | Yes | clean | none (no ReDoS in new regexes, no external-input paths) | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — assessed manually |
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW/MEDIUM, non-blocking) — plus all 3 round-1 findings mutation-verified CLOSED | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 1 confirmed (non-blocking LOW), 0 dismissed, 0 deferred. Round-1's 2 blocking + 3 LOW findings: all verified CLOSED by mutation.

## Reviewer Assessment

**Verdict:** APPROVED

Round-2 re-review of the rework (commits `4e14f8c` red, `0cdb22d` green). **Both round-1 blockers are
genuinely closed, mutation-proven, and the rework introduced no fresh error.** All suites green; the
tree is clean after the rule-checker's revert.

**Round-1 blocking findings — verified CLOSED (by mutation, per the "a green-rework can ship a fresh
lie" discipline):**
- `[RULE][TEST]` **AC4 guard now has teeth.** The vacuous `/\bO-2\b.*\bresolv/i` is replaced by an
  O-2-line-scoped check (`o2LinesOf` + `STILL_OPEN`): a mention must positively state resolved AND no
  mention may be still-open. Mutation-proven both by me (`node`) and the rule-checker (negating
  brief.md's O-2 lines → RED, reverted byte-identical). The word-boundary `\bresolved\b` no longer
  matches inside "unresolved". Closed.
- `[RULE]` **Source-of-record coherence restored.** `subsystems.md` no longer calls W3INT "not yet
  read" and cites real `.SBTTL` anchors (`W3INT:169` PROCESS INTERRUPT, `:269` HANDLE VBLANK —
  byte-verified by `dossier-docs.test.ts`'s cross-check AND independently by comment-analyzer);
  `glossary.md`'s FRAME entry dropped the stale `W3DSUP.MAC:19`/`W3MAIN.MAC:2039` and now cites the
  physical `W3MAIN.MAC:239`/`:781`, marked O-2 resolved. New coherence guards mutation-proven non-vacuous
  (revert to "open"/stale → RED). Closed. **Bonus fidelity gain:** the rework corrected mc2-2's own
  error of listing W3INT as anchorless.
- `[RULE]` `lineAt`→`physLineOf` rename complete (no live `lineAt` remains); `[DOC]` `:619-623` range
  and `[RULE]` fully-qualified `:781` applied. Closed.

**New finding this round — non-blocking:**
| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] `[RULE]` | `subsystems.md points at timebase.md` uses a whole-file `/timebase\.md/` scan (#25), not O-2-scoped. Rule-checker mutation: reverting O-2 to "open" while keeping an unrelated `timebase.md` mention → this *one* assertion falsely green. | `tests/timebase-docs.test.ts:342` | **Masked-redundant, not vacuous:** the sibling line-scoped test in the same describe (`…no longer frames W3INT/O-2 as "not yet read"`) catches that exact scenario (rule-checker confirmed the SUITE stays red). Trivial follow-up: scope to `o2LinesOf(sub).some(l => /timebase\.md/.test(l))`. Not worth a 3rd round given the sibling has teeth. |

### Dispatch tags
- `[SEC]` reviewer-security: clean (round 2) — new regexes bounded, no external-input paths.
- `[DOC]` reviewer-comment-analyzer: clean — every new/changed citation TRUE byte-for-byte; stale citations confirmed gone; no self-contradiction.
- `[RULE]` reviewer-rule-checker: all 3 round-1 findings mutation-verified CLOSED; 1 new non-blocking #25 nit (above).
- `[TEST]` disabled; the rule-checker's mutation battery covered test quality — the hardened guards and coherence guards all proven to redden on the defect.
- `[EDGE]`/`[SILENT]`/`[TYPE]`/`[SIMPLE]` disabled; round-2 changes are docs + declarative test regexes with no new control flow, error handling, type surface, or complexity — assessed manually, nothing to add.

### Observations
1. The two round-1 blockers were the right calls: a mutation-proven vacuous guard and a real source-of-record contradiction, both now closed with teeth.
2. The rework improved fidelity beyond the ask — subsystems.md's W3INT row went from "unread/anchorless" (an mc2-2 error) to two byte-verified `.SBTTL` anchors.
3. Verified-good: no new citation is false (comment-analyzer byte-checked all); the stale logical-ordinal citations that started this whole thread are gone from every rom-study doc.
4. The one residual nit is redundant coverage, not a hole — the coherence is enforced by a line-scoped sibling test.
5. Proportionality: two full TDD rounds on a 3-pt story is already generous; a third round for a backstopped LOW test-robustness nit would be disproportionate. Documented as a follow-up.

### Devil's Advocate
Could I be approving a still-broken suite? The specific worry: the `/timebase\.md/` whole-file assertion
the rule-checker flagged. If that were the ONLY guard on subsystems coherence, a future edit could
reopen O-2's framing while leaving a stray `timebase.md` link and stay green — the round-1 disease. But
the rule-checker mutation-tested exactly that and the *suite* went red, because the sibling
`…"not yet read"` test is line-scoped (`o2LinesOf` + `STILL_OPEN`) and catches it. So the coherence is
genuinely enforced; the weak assertion is redundant, not load-bearing. Could a fresh lie hide in the new
citations? Comment-analyzer byte-verified all seven new anchors against the vendored source and I
independently confirmed the load-bearing ones earlier; the byte-gated tests (which run locally where the
source exists) would redden on any wrong line. Could the AC4 fix be circumvented? `\bresolved\b` with
word boundaries plus the `STILL_OPEN` exclusion was probed against "unresolved", "not resolved", the
`## Open questions` heading, and passed each — and negating brief.md reddens it. The remaining honest risk
is only the documented redundant assertion, which is a cleanliness nit, not a correctness hole. Approving.

**Handoff:** To SM for finish-story.

## Delivery Findings (Round 2)

### Reviewer (round 2 re-review)

- **Improvement** (non-blocking): the `subsystems.md points at timebase.md` test assertion
  (`tests/timebase-docs.test.ts:342`) scans the whole file for `/timebase\.md/` rather than the O-2
  lines; it is redundant-masked by a line-scoped sibling (the suite still reddens correctly), so no
  coherence hole — but scope it to `o2LinesOf(...)` on a future touch. *Found by Reviewer during round-2 review.*
- No blocking findings; both round-1 blockers verified CLOSED by mutation.