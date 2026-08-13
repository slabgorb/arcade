# Story jt11-10: Chore: sweep the retired dev-bar naming and harden the frame-loop source pins

## Story Details
- **Story ID:** jt11-10
- **Epic:** jt11 (Joust — cabinet experience: start flow, HUD, landing physics, transporter cadence, lava shore, high-score UX)
- **Type:** chore
- **Points:** 3
- **Priority:** p3
- **Repos:** arcade (plugins/joust/src/core, plugins/joust/tests)
- **Workflow:** tdd

## Background

**WARNING: Title is a SUBSET label, not the complete scope.** This story is a deliberate UNION chore routed from jt11-4 round-3 review findings. The title describes only work-items (a) and (b):

- **(a)** Sweep retired dev-bar/drawOverlay prose from three joust test files (render-jt4-5.test.ts, helpers/game-contract.ts, demo-td1-12.test.ts) — truth-fix headers/prose only, keep assertions unchanged.
- **(b)** Harden two frame-loop source pins that currently slice `src.slice(loopStart)` from the `frame` declaration to EOF — correct only while `frame` stays the last top-level decl in main.ts (currently it is: main.ts:500). Bound the slice to the matching closing brace or, per the **mc10-6 ruling**, the **TypeScript compiler API / AST** (devDep typescript ^5.4.0), NOT regex/line-grep. Files: plugins/joust/tests/render-jt4-5.test.ts (~:90-92) and plugins/joust/tests/hud-jt11-2.test.ts (~:382-384).

**Real scope: EIGHT work-items total** — (a), (b), and the SIX acceptance_criteria below. The routing commit 2bc709fd says "jt11-10 … takes the five LOWs" (actually six, one was mislabeled) and bumped points 1→3. Each AC is a routed jt11-4 round-3 finding that **is also in scope here**.

## mc10-6 Ruling Citaton

From `context-story-mc10-6.md` and `context-story-SH4-5.md:165`:

> Use the TypeScript compiler API (devDep `typescript ^5.4.0`) — AST, not regex/line-grep. Text scans leak through comments and enclosing declarations; the AST is trivia-blind, so comment prose can never satisfy a check.

This applies to item (b): harden the frame-loop pins to be reachable only by AST analysis, not by line-counting or regex.

## Guardability Notes for TEA (RED planning)

The story has many items. Some are guardable by existing/extended tests; others are one-shot edits:

**Guardable by existing/extended tests:**
- **AC1 (R3-F4, test control rename):** jt9-55-joust-yaml-refs.test.mjs already exists and enforces the "pick a basename joust genuinely lacks" rule. Test is guardable if extended to forbid attract.ts as a control.
- **AC3 (R3-F6, symbol citation in comment):** comment-line-refs.test.ts already exists. Test scope could be widened from `tests/` to `src/` to catch code comments with dangling/wrong line refs.
- **AC6 (Delivery Finding, ROM citation in comment):** plugins/joust/tests/audit/citations.test.ts already exists (citations.test.ts verifies claims). Scope could be extended to cover `JOUSTRV4.SRC:<line>` refs found in `src/**` and `tests/**` comments.

**One-shot edits (no existing guard):**
- **(a) Prose sweep:** three test files need header/prose corrections. One-shot text edit.
- **AC2 (R3-F5, doc edit):** typescript.md lines 590 and 655 need "#14-#29" → "#14-#30". One-shot edit.
- **AC4 (R3-F8, symbol rename):** stepSim parameter rename — mechanical refactor, file-local, tsc confirms. Could be guarded by a new scan (all stepSim call sites correctly pass the renamed param), but it's straightforward enough to verify manually.
- **AC5 (R3-F7, PNG deletion):** joust-after-start.png delete is a one-shot. No test can verify absence — only that it's tracked and removed.
- **(b) Frame-loop pins:** hardening the pins is testable IF a guard is added to render-jt4-5.test.ts and hud-jt11-2.test.ts, but the existing tests may just be source-scanning for string patterns today; upgrading them to AST-based bounds is the real work, not a simple prose fix.

**Recommendation:** Prioritize (a), (b), and the AC5 deletion first (straightforward edits). Then tackle AC2 (doc bumps). AC3, AC4, AC6 can ride guarded tests or be one-shot edits depending on Dev's judgment. AC1 requires a test extension.

## ⚠ MEASURED CORRECTIONS (SM, pre-setup)

All 6 AC premises are still live; none was fixed by the intervening jt11-9, jt11-11, or jt11-13. However, **line numbers and cite locations have drifted** due to intervening commits. The corrections below are verified live as of this setup:

1. **AC4 (R3-F8) line drift:** `export function stepSim(demo: SimState, …)` is at plugins/joust/src/core/sim.ts:**2241**, NOT the AC's ":2168". The AC is still correct in intent (rename the parameter from `demo` to `state`), but use symbol-based renaming, not line numbers.

2. **AC6 (Delivery Finding) cite location drift:** the wrong "SECCR PTERST → JOUSTRV4.SRC:2618" cite is now at plugins/joust/src/core/sim.ts:**734** (the PendingPtero interface comment), not :700. Per the byte-read in the AC, SECCR PTERST,PTEID is really at JOUSTRV4.SRC:**2621**; :2618 is the `PTERWV PCNAP 65` nap line. **NOTE:** `JOUSTRV4.SRC:2618` now appears at MULTIPLE sim.ts sites (:408, :734, :1043, :1062, :2594) — some legitimately cite the PCNAP nap (:2618 is correct for those) and only the ones citing the SECCR PTERST *instruction* are wrong. Relocate and disambiguate by symbol; do not blanket-rewrite every :2618.

3. **Other premises remain live:**
   - R3-F7: joust-after-start.png IS present at the repo root and tracked — delete is valid.
   - R3-F5: .pennyfarthing/gates/lang-review/typescript.md IS tracked in arcade (single-repo edit). Lines :590 and :655 read "#14-#29"; :104 reads "#14-#30". BOTH :590 and :655 need bumping to #14-#30. Caveat for Dev: the LIVE pf gate loads from `…/pennyfarthing-dist/`, so this arcade-tracked copy may be a vendored duplicate that doesn't drive the live check — it is still in scope as a doc-consistency fix.
   - R3-F6: enemy.ts:534 cites `sim.ts:425`/`:654` — live, lines match. Name the SYMBOL per the jt9-30 rule (prefer ROM names over file:line refs in comments).
   - R3-F4: jt9-55-joust-yaml-refs.test.mjs uses `attract.ts` as the ambiguity control (~:233); joust really HAS src/core/attract-scheduler.ts and src/shell/attractScreen.ts, so attract.ts violates the "pick a basename joust genuinely lacks" rule. Live.

**The acceptance_criteria below are reproduced VERBATIM AND HAVE NOT BEEN EDITED.** Line numbers inside them may be stale (e.g., AC4's :2168, AC6's :700); use the corrections above to locate the actual code, and rely on symbol names for durability.

## Acceptance Criteria

1. 'ROUTED from jt11-4 round-3 review (R3-F4, LOW): tests/jt9-55-joust-yaml-refs.test.mjs:230 moved its ambiguity control off sim.ts (which jt11-4 made real for joust) onto attract.ts, while the same comment states the rule ''Pick a basename joust genuinely lacks, not one it happens to lack today''. attract.ts is exactly such a name - joust has src/core/attract-scheduler.ts and src/shell/attractScreen.ts, and the fleet-convergence pressure that just produced sim.ts is what would produce attract.ts. Pick a game-specific noun joust cannot acquire: volcano.ts (battlezone), mirv.ts (missile-command), scorpion.ts (centipede) or trench-channel.ts (star-wars).'

2. 'ROUTED from jt11-4 round-3 review (R3-F5, LOW, check #24): .pennyfarthing/gates/lang-review/typescript.md bumped check #13''s range at line 104 (''#1-#12 and #14-#30'') but not at :590 or :655, which still read ''#14-#29''. Bump both - it is check #24''s own pattern inside the checklist that defines check #24.'

3. 'ROUTED from jt11-4 round-3 review (R3-F6, LOW): the demo.ts->sim.ts sweep converted a DANGLING line-ref into a plausible wrong one. plugins/joust/src/core/enemy.ts:534 cites sim.ts:425 and :654 for the pchase:0 / brain:''linet'' spawn sites; :425 is the serviceQueue field declaration and :654 is the enemy-types doc block. It was already wrong as demo.ts:425 on develop, but a live filename reads as authoritative where a dead one reads as suspect - which comment-line-refs.test.ts''s own header calls ''the worse failure''. Name the SYMBOL per the jt9-30 rule. joust src/ holds 5 such refs; jt11-4 rewrote 2. Consider widening comment-line-refs.test.ts scope from tests/ to src/.'

4. 'ROUTED from jt11-4 round-3 review (R3-F8, LOW, check #24): stepSim(demo: SimState, ...) at plugins/joust/src/core/sim.ts:2168 still names its parameter demo and reads demo. 24 times inside the very function the rename renamed, while commit 13265a4d claims the name ''means the same thing everywhere''. Rename to state (mechanical, file-local, tsc confirms), or fold it into the deferral Dev already logged for the 49 demo-*.test.ts filenames so the claim and the code agree.'

5. 'ROUTED from jt11-4 round-3 review (R3-F7, LOW): joust-after-start.png (1635x1085, added by 3c7c8196) sits at the REPO ROOT, referenced by nothing, and is the only tracked PNG there - every other tracked PNG lives under plugins/*/docs, plugins/*/public, lobby/public or sprint/demos. Delete it.'

6. 'ROUTED from jt11-4 round-3 review (Delivery Finding, LOW): a ROM citation living in a CODE COMMENT is verified by nothing, and a second instance of the R2-F3 shape sits in the renamed file. plugins/joust/src/core/sim.ts:700 cites JOUSTRV4.SRC:2618 for ''SECCR PTERST''; byte-read, :2618 is ''PTERWV PCNAP 65'' and the SECCR PTERST,PTEID instruction is at :2621 - the nap line cited for the instruction below it, exactly how :2189/:2191 went wrong. Pre-existing (jt9-59); jt11-4 only rewrote the symbol on that line. Fix the cite, and consider extending plugins/joust/tests/audit/citations.test.ts to cover JOUSTRV4.SRC:<line> refs found in src/** and tests/** comments (round-2 Delivery Finding, still open).'

## Out of Scope

- No further prose sweeps in other files beyond the three listed in (a).
- No refactor of the frame-loop architecture itself; only the source-pin bounds.
- Additions to test files outside the guardability scope listed above (TEA decisions).

## Branch Strategy

Branch created from `develop` (gitflow integration branch):
**Branch:** feat/jt11-10-devbar-naming-sweep-and-frameloop-source-pins
