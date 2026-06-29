---
story_id: "9-1"
jira_key: ""
epic: "9"
workflow: "trivial"
---
# Story 9-1: RE spike (bounded): decode the TIE flight-AI routine from the 6809 disassembly

## Story Details
- **ID:** 9-1
- **Jira Key:** (not in use; Jira not configured for this project)
- **Workflow:** trivial
- **Stack Parent:** none
- **Repository:** star-wars
- **Points:** 3
- **Type:** chore

## Branch Strategy
**Branch Strategy:** gitflow (chore/9-1-re-spike-tie-flight-ai)

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-06-29T11:38:26Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-29T10:35:36Z | 2026-06-29T10:37:57Z | 2m 21s |
| implement | 2026-06-29T10:37:57Z | 2026-06-29T11:19:16Z | 41m 19s |
| review | 2026-06-29T11:19:16Z | 2026-06-29T11:38:26Z | 19m 10s |
| finish | 2026-06-29T11:38:26Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Improvement** (non-blocking): A far richer disassembly than the repo's bare `StarWars.asm` now exists — `reference/disasm/StarWars_annotated.lst` (full $0000–$FFFF IDA listing, ~4000 hand comments), supplied by the user mid-session. It is the **preferred RE source** for all of epic-9. Affects `reference/README.md` (updated to mark it preferred) and every downstream story 9-2..9-5 (they should trace against it, not the bare `.asm`). *Found by Dev during implementation.*
- **Gap** (non-blocking): The TIE **behavior-script opcode table** and **per-wave script/composition data** (`byte_91E1`, `off_9070`/`off_9078`) are not exhaustively decoded — only the VM shape and first wave entries. Affects 9-2 (port the maneuver state machine) and 9-5 (wave ramp): they can port the CONFIRMED kinematics and approximate choreography with a hand-authored maneuver state machine, enumerating the tables further only if needed. See `docs/tie-flight-ai-model.md` §10. *Found by Dev during implementation.*
- **Conflict** (non-blocking): The cabinet's **world-X is the depth axis** (perspective divisor); our clone uses **−Z as depth**. Affects 9-2 `src/core/sim.ts` (the port must swap axes deliberately, not copy raw ROM triples). See `docs/tie-flight-ai-model.md` §2. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The real TIE has **no body↔ship collision** — only fireballs damage the player; un-shot TIEs loiter, fire, then peel away at wave end. Our clone currently lets the TIE body cost a life. Affects 9-3 `src/core/sim.ts` (remove cockpit-ram damage; add wave-end fly-past). See `docs/tie-flight-ai-model.md` §7. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): The "no TIE-body↔ship collision / only fireballs damage" claim (`docs/tie-flight-ai-model.md` §7) is an *unprovable absolute* — strongly supported (the only damage path found is fireball-vs-ship `sub_AAE4`→shield `dec DPbyte_60`, and `sub_B98B` is an effects-pool iterator, not a ship collider) but absence-of-collider can't be exhaustively proven from a static read. Affects 9-3: confirm against MAME/gameplay before relying on it as certain. *Found by Reviewer during code review.*
- **Question** (non-blocking): The firing-arc flag `$15,x` bit `$10` is documented as "set by the render pass" with CONFIRMED weight, but only its *use* (the gate) is byte-proven; the *origin* write (believed `sub_7881`) was not re-verified. Affects 9-4: when porting the fire gate, treat the arc-flag source as INFERRED until traced. *Found by Reviewer during code review.*
- No blocking findings. RE substance independently byte-verified (all 9 load-bearing claims VERIFIED by an adversarial fact-check); decision gate (a) RECOVERABLE is justified.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Produced two docs + captured a reference corpus, beyond the single scoped doc**
  - Spec source: 9-1 AC#6 / story description
  - Spec text: "output is the committed markdown model doc" (singular — `tie-flight-ai-model.md`)
  - Implementation: also wrote `docs/mathbox.md` (Math Box explainer) and preserved the user-supplied annotated disassembly + sound listing into the gitignored `reference/disasm/` (`StarWars_annotated.lst`, `StarWars_HighPage.lst`, `sound/SW_Sound_annotated.lst`), and updated `reference/README.md`.
  - Rationale: explicit mid-session user request ("How does the Math Box work… let's get all this captured to documentation inline in this project"). The Math Box doc directly supports AC#2 ("the math used"). Provenance rule honored: raw disassembly stays gitignored in `reference/`; only our own re-expressed analysis (`docs/*.md`) is committable.
  - Severity: minor
  - Forward impact: positive — `docs/mathbox.md` and the annotated listing materially de-risk 9-2..9-5. No code touched (AC#6 intact).

### Reviewer (audit)
- **Dev deviation "Produced two docs + captured a reference corpus"** → ✓ **ACCEPTED by Reviewer.** Sound and beneficial. The extra `docs/mathbox.md` directly supports AC#2 ("the math used") and was an explicit user request; the reference-corpus capture stayed on the correct side of the provenance line (raw disassembly gitignored under `reference/`, verified by `git diff develop...HEAD` showing only the two `docs/*.md` files, and corroborated by the rule-checker subagent — 0 provenance violations). AC#6 ("no production code") is intact. No undocumented deviations found: the diff is exactly the two committable docs.

## Technical Approach

**Objective:** Decode the TIE fighter flight-AI routine from the 6809 main-program disassembly (StarWars.asm, SW_M_Hi.asm in star-wars/docs/references/SW/) and produce a written model document.

**Key Source Material:**
- `star-wars/docs/references/SW/StarWars.asm` — Main 6809 program disassembly (auto-labeled by IDA, uncommented)
- `star-wars/docs/references/SW/SW_M_Hi.asm` — 6809 disassembly fragment
- `star-wars/docs/HANDOFF-authentic-vector-edges.md` — Related vector work (separate epic)

**Deliverable:** A markdown model document (e.g., `star-wars/docs/tie-flight-ai-model.md`) documenting the flight logic. **No production code in this story** — output is the reverse-engineering record only.

**Acceptance Criteria:**
1. Located in the disassembly: the routine(s) that update TIE object world coordinates each frame, plus where spawn/initial state is set
2. Documented flight model: spawn position/distribution, per-frame position/velocity update (incl. any curve/swoop/weave/banking) and the math used (Math Box calls if any)
3. Documented attack lifecycle: fire timing/trigger and the peel-away / fly-past / exit condition (when a TIE stops approaching)
4. Documented per-wave difficulty knobs the AI reads (speed/aggression/count), or an explicit note they were not recoverable
5. DECISION GATE recorded: (a) model recoverable -> 9-2..9-5 port it faithfully, or (b) RE stalled at the timebox -> fall back to feel-faithful approximation using partial findings
6. No production code changes in this story; output is the committed markdown model doc

**Next Steps:**
- Transition to dev phase (implementation) for reverse-engineering work
- Document findings in the committed markdown model
- Record decision gate for downstream gating of 9-2..9-5

## Sm Assessment

**Phase:** finish → implement | **Routing to:** Dev (Yoda)

**What this story is.** A *bounded* reverse-engineering spike — not a feature. The deliverable is a committed markdown model doc under `star-wars/docs/` (e.g. `tie-flight-ai-model.md`). **Zero production code** (AC #6). The `trivial` workflow is correct: there is no test surface to drive — the artifact is a document, and the review phase will judge the *quality and faithfulness* of the RE, not green tests.

**Why it's first in epic-9.** 9-1 is the **gate** for 9-2..9-5. Those downstream stories (port the model, peel-away lifecycle, strafe-and-fire cadence, wave ramp) all assume a recovered flight model. AC #5 is the pivot: Dev must record a **DECISION GATE** — either (a) the 6809 model is recoverable and 9-2..9-5 port it faithfully, or (b) RE stalled at the timebox and we fall back to a feel-faithful approximation from partial findings. Either outcome unblocks downstream work; an *undecided* gate does not.

**Source material is in place.** The 6809 disassembly (`StarWars.asm`, `SW_M_Hi.asm`) lives under `star-wars/docs/references/SW/` — confirmed present from prior epic work (vector-edges handoff used the same reference dir). Dev does not need to source the ROM; it's already here. Note the disassembly is IDA auto-labeled and uncommented, so expect to trace by data-table cross-reference and Math Box call sites rather than by symbol names.

**Boundary discipline (the real risk).** The named failure mode is scope creep into 9-2: starting to *write* the flight code in core/. Dev must stay in the document. If the RE is going long, the timebox + fallback (gate option b) is the escape hatch — capture partial findings and decide, don't grind past the box. Surface any spec gaps in Delivery Findings for the downstream stories.

**Handoff is clean — routing to Dev for the implement phase.**

## Dev Assessment

**Implementation Complete:** Yes (RE spike — documentation deliverable, no production code per AC#6)

**Decision Gate (AC#5):** **(a) RECOVERABLE.** The full TIE flight model is decoded from the disassembly with addresses + constants. Stories 9-2..9-5 should **port it faithfully**; no feel-fallback needed.

**Files Changed (committable):**
- `star-wars/docs/tie-flight-ai-model.md` — NEW. The 9-1 deliverable: spawn model, per-frame flight (thrust-along-orientation + roll/steer homing), behavior-script VM, attack lifecycle, peel-away, per-wave difficulty, recovered constants, decision gate, and a porting map for 9-2..9-5. All claims carry `ROM:addr` citations + CONFIRMED/INFERRED/UNKNOWN tags.
- `star-wars/docs/mathbox.md` — NEW. Math Box (3D coprocessor) explainer (registers, BIC, microprograms, transform pipeline), answering a direct user question and supporting AC#2.

**Reference corpus preserved (gitignored `reference/`, NOT committed — copyrighted derivative):**
- `reference/disasm/StarWars_annotated.lst` (40k-line annotated full-program listing — the preferred RE source), `StarWars_HighPage.lst`, `sound/SW_Sound_annotated.lst`; `reference/README.md` updated to catalog them.

**ACs:** #1 object table & update loop ✅ · #2 flight model (spawn + per-frame motion + math) ✅ · #3 attack lifecycle (fire + peel-away) ✅ · #4 per-wave difficulty knobs ✅ (table + formula recovered) · #5 decision gate recorded ✅ (=recoverable) · #6 no production code ✅ (docs only).

**Method/quality:** three independent disassembly traces (spawn/struct, per-frame motion, attack/difficulty), mutually cross-checked, plus a Dev byte-level spot-check of the load-bearing claims (`sub_8AB6` pos+=vel, spawn table `$7C00` depth, fire table `byte_8D71`, difficulty index `byte_4B19`, wave-end transition `$1A4`→`$21`).

**Tests:** none applicable — documentation-only story, zero code changed; existing suite unaffected.

**Branch:** `chore/9-1-re-spike-tie-flight-ai` (star-wars subrepo).

**Handoff:** To **review** (Obi-Wan). Reviewer should sanity-check the doc's claims against `reference/disasm/StarWars_annotated.lst` and confirm the decision gate is well-supported.

## Subagent Results

Note: only `preflight` and `rule_checker` are enabled in this project (`workflow.reviewer_subagents`); the other seven are disabled and pre-filled as Skipped. The seven code-analysis specialists have **no surface** on a two-file markdown diff anyway. In their place the Reviewer ran a custom **adversarial RE fact-checker** (the substantive review for an RE spike) that independently re-traced all 9 load-bearing claims to the bytes — logged in the assessment.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean (+1 cosmetic) | 334 tests pass / 0 fail; tsc+vite clean; links valid; §3.2 table cosmetic | confirmed 1 (cosmetic, Low), dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A (disabled via settings; no code surface) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A (disabled via settings; no code surface) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | N/A (disabled via settings; no tests changed) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A (disabled via settings; doc accuracy covered by fact-checker) |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A (disabled via settings; no types in markdown) |
| 7 | reviewer-security | No | Skipped | disabled | N/A (disabled via settings; no code/auth surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A (disabled via settings) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations; provenance rules 14–15 compliant | confirmed 0, dismissed 0, deferred 0 |
| + | (custom) adversarial RE fact-checker | Yes | findings | 9/9 claims VERIFIED at byte level; 5 confidence-calibration nits | confirmed 2 (Low, → touch-ups), dismissed 3 (presentational) |

**All received:** Yes (2 enabled subagents returned + 7 disabled pre-filled + 1 custom fact-check)
**Total findings:** 2 confirmed Low (doc-accuracy touch-ups), 1 cosmetic Low, 3 dismissed (presentational), 0 blocking

## Reviewer Assessment

**Verdict:** APPROVED

**Subject:** A documentation-only RE spike (story 9-1) — two new markdown files (`docs/tie-flight-ai-model.md`, `docs/mathbox.md`), zero production code (AC#6 intact). The review therefore targets what actually matters for an RE deliverable: **(1) are the recovered claims true to the bytes, (2) is provenance respected, (3) is the decision gate justified, (4) doc quality.**

**Data flow traced:** the doc's load-bearing assertions → the disassembly. An independent adversarial fact-checker re-derived all 9 from `reference/disasm/StarWars_annotated.lst`: struct sizes (`byte_4900` 3×$19, `word_50F0` 3×$20), the integrator `sub_8AB6` (`ldd -$A,u / addd 8,u / std 8,u` — `pos += vel`, exact offsets), deterministic spawn tables (`byte_9028+`, depth `$7C00`, lateral {0,±$0400,±$0800}), orientation flip `$C000` (`ROM:8FEB`), the roll/pitch/yaw drivers + exact trig (`$1640`/`$3C02`≈20.3°, `word_89A8[#$14]`≈4.5°), homing Math program `$67`, all six fire gates with correct comparison senses (`ROM:8CAE–8CFB`), fireball spawn (`sub_A68B`, lifetime `$40`, aim = TIE−ship, `Sound_36`), the wave-end fly-past (`sub_8B86` `+$400/frame`, `word_4B0E≥$1A4`→`DPbyte_41=$21`), the **byte-exact** difficulty table `byte_8D71`, and the index formula `min(4B14+4B18,$F)`. Every cited address, constant, and comparison direction is correct. I corroborated a subset directly during my own pass (`sub_8AB6`, `byte_9028`, `byte_8D71`, `byte_4B19`, the `$1A4`/`$21` transition).

**Observations (tagged):**
1. `[VERIFIED]` RE substance is real, not hallucinated — 9/9 claims byte-verified by adversarial fact-check; difficulty table byte-exact. Evidence: fact-check report + my spot-checks (`sub_8AB6`, `byte_8D71`, `byte_4B19`).
2. `[VERIFIED]` Provenance respected — `git diff develop...HEAD --name-only` = only the two `docs/*.md`; no `reference/` staged; ~7 short opcode quotes total; both docs carry self-certification footers. Evidence: rule-checker rules 14–15.
3. `[VERIFIED]` Build/test baseline unaffected — 334 pass / 0 fail, `tsc --noEmit` + `vite build` clean, 0 code smells, 0 `src/` files changed. Evidence: preflight.
4. `[VERIFIED]` Confidence discipline — CONFIRMED/INFERRED/UNKNOWN used consistently; §10 honestly enumerates the un-recovered parts (script opcode table, full wave-composition tables, per-bit thrust-axis selection) and explains why they don't undercut the gate.
5. `[DOC]` `[LOW]` §0 TL;DR: *"Whole formation fires every `ENEMY_FIRE_INTERVAL`"* overstates the **current clone** — `src/core/sim.ts:126` fires **one random TIE** per global interval (`enemies[nextInt(rng, enemies.length)]`), not the whole formation. (Contrast-column nit; does not touch the recovered model.)
6. `[DOC]` `[LOW]` §3.1: `$15,x` bit `$10` is tagged CONFIRMED as *"set by the render pass"*, but only its **use** (the gate) is byte-proven; the **origin** write (believed `sub_7881`) was not re-verified → should read INFERRED for the origin.
7. `[DOC]` `[LOW]` The °/frame turn-rate figures (§5.2/§5.3) are not pinned to a frame rate — a porter applying "20.3°/frame" at 60 fps could get a feel far from the cabinet's actual refresh. Worth a one-line caveat for 9-2.
8. `[SIMPLE]` `[LOW]` §3.2 uses a 5-column table with an empty spacer column — valid markdown, but unconventional; optional cleanup (preflight).
9. `[SEC]` N/A — no code/auth/input surface; the security-adjacent concern (no redistribution of copyrighted ROM) is clean (rule-checker).
10. `[EDGE]` / `[SILENT]` / `[TYPE]` / `[TEST]` N/A — a markdown diff has no code paths, error handling, types, or tests; the existing suite is green and untouched.
11. `[RULE]` Clean — TS lang-review rules 1–13 have zero applicable instances; provenance rules compliant.

**### Rule Compliance**
- **TypeScript lang-review (`.pennyfarthing/gates/lang-review/typescript.md`), checks 1–13:** 0 applicable instances — the diff is pure markdown (no `.ts`/`.tsx`). Trivially compliant (verified by rule-checker, not skipped).
- **Provenance — `reference/` must never be committed (CLAUDE.md):** COMPLIANT. `git diff develop...HEAD` excludes `reference/` entirely; both staged files are under `docs/`.
- **Provenance — no redistribution of ROM code (reference/README.md):** COMPLIANT. Only short evidentiary instruction quotes (≤4 each, ~7 total); no contiguous disassembly block; self-cert footers on both docs.
- **AC#6 — no production code:** COMPLIANT. Zero `src/` changes; tests untouched and green.

**### Devil's Advocate**
Arguing this deliverable is broken: First, the entire model is built on `StarWars_annotated.lst`, whose hand-comments ("Space wave", "Initialise tie fighters and fireballs") are assertions by an **unknown third-party annotator**, not Atari ground truth — if those labels misattribute a routine, the doc's framing inherits the error. *Rebuttal:* the fact-checker verified the underlying **instruction semantics** (the `pos+=vel` loop, the gate comparisons, the literal table bytes) independently of the comments, so the kinematic/numeric core holds even if a label is wrong — but the *phase framing* does lean partly on annotation, so a downstream reader should treat routine **names** as convenience, not proof. Second, "**no TIE-body↔ship collision; only fireballs damage you**" is a universal negative proved by *absence* of a collider in a static read — a confused 9-3 implementer could strip cockpit-ram damage and only later discover an untraced edge state where a TIE *does* hurt you; this is why I filed it as a non-blocking finding recommending a MAME/gameplay cross-check. Third, the turn rates are quoted in **°/frame** without pinning the cabinet's frame/refresh rate, and the fire-probability percentages assume a **uniform PRNG** when the hardware generator is an LFSR that is not uniform over short windows — a porter who tunes difficulty straight off the "~50%/~87%" column could miss the real feel. Fourth, §2's axis mapping is explicitly "-ish" — copied literally without resolving which lateral axis is which, the formation could mirror. None of these are fabrications or wrong addresses (the bytes are right); they are **confidence-calibration and porting hazards**, which is precisely why the doc's CONFIRMED/INFERRED/UNKNOWN tagging and "porting note" callouts matter — and why observations 5–7 are worth folding in. They do not rise to High because the doc already flags most as INFERRED or as porting notes; the risk is a reader who skims only the TL;DR.

**Why APPROVED (not rejected):** Zero Critical/High. The deliverable's whole purpose — recovering a faithful, portable flight model — is met and *independently byte-verified*; the decision gate (a) RECOVERABLE is justified. All findings are Low/cosmetic/calibration. Per the severity rule (only Critical/High block), this passes.

**Recommended non-blocking touch-ups (optional, would tighten a doc that gates 9-2..9-5):** (t1) correct the "whole formation fires" line (obs 5); (t2) downgrade the bit-`$10` *origin* to INFERRED (obs 6); (t3) add a frame-rate caveat to the °/frame figures (obs 7); (t4) optional §3.2 table cleanup (obs 8).

**Touch-ups applied:** t1, t2, t3 were folded into `docs/tie-flight-ai-model.md` and the deliverable commit was amended (local-only, not pushed) — these were unambiguous accuracy/calibration fixes to a gating doc, not worth a full rework cycle. t4 (cosmetic table) left as-is — it renders correctly in GitHub-flavored Markdown. Approval is unaffected (the touch-ups are polish on an already-sound, byte-verified deliverable).

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.