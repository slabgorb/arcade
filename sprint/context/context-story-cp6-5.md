# Story cp6-5: centipede's claim ledger cannot re-run a COUNT

**Points:** 2  
**Epic:** cp6 (Centipede sound — the samples cp5 never filed a story to bake)  
**Workflow:** tdd  
**Type:** chore  

## Background

Centipede's ROM-study dossier is machine-verified by `plugins/centipede/tests/audit/citations.test.ts` against the vendored 1981 Atari source at `reference/atari-source/centipede`. The citation gate verifies verbatim/line pairs between claims in the JSON ledger and the source text.

**THE DEFECT:** The citation gate checks only the verbatim/line pair, not the **counts embedded in claim prose**. Claim SND-114 in `plugins/centipede/docs/rom-study/claims/16-sound.json` embodies a reproducible count: "the same 52$ spelling is DEFINED four more times in this revision (CENTI4.MAC:622, :1076, :2065 and CENIR4.MAC:388), and 20 times across the whole vendored tree; counted with grep -rn '^52[$]:' over reference/atari-source/centipede." Both numbers (`4` and `20`) are **currently correct and unguarded**. A future edit to the vendored source can silently rot "four"/"20" with a green test suite — there is no re-derived count, so the prose diverges from the machine.

**RELATED PRECEDENT:** cp6-1 extracted the coverage sweep (`dossier-sweep` module). Tempest and red-baron audit gates already re-run count-style guards. The discipline applied to verbatim/line pairs must extend to embedded counts.

**MEASURED AT SETUP:**
- `grep -rn '^52[$]:' reference/atari-source/centipede` returns exactly 20 hits
- In revision.v4: CENTI4.MAC has 52$ at lines 622, 1076, 2065, 2418 and CENIR4.MAC at 388 — five total
- Line 2418 is inside the SOUNDS routine; the other four are elsewhere in the codebase
- The claim text correctly states "four more times" (implicitly excluding the SOUNDS routine itself)

## Acceptance Criteria

- **AC-1: COUNT SCHEMA EXTENSION** — Extend the claims JSON schema to carry a machine-checkable COUNT assertion. The assertion includes a recipe (like `grep -rn '^52[$]:'`) over the vendored root and an expected number. The schema and the assertion format are documented in the claims README so builders understand how to write future count assertions.

- **AC-2: CITATIONS.TEST.TS RE-RUNS COUNTS** — The citation gate (`plugins/centipede/tests/audit/citations.test.ts`) re-derives every COUNT assertion in the claims ledger during the suite run. The assertion is re-executed; the result is compared to the expected number; a mismatch reddens the test.

- **AC-3: SND-114 CARRIES THE COUNT GUARDS** — Claim SND-114 is updated to carry two machine-checkable count assertions that re-derive the numbers already in its prose: (1) `grep -rn '^52[$]:'` over the whole vendored centipede tree (`reference/atari-source/centipede`) expects **20** hits; (2) the claim's "**four** more times in this revision" — the four `52$` definitions in revision.v4 that lie OUTSIDE the SOUNDS routine, namely `CENTI4.MAC:622`, `:1076`, `:2065` and `CENIR4.MAC:388`. Re-derivation: `grep '^52[$]:'` across revision.v4's `CENTI4.MAC` + `CENIR4.MAC` yields **5** defs, exactly one of which (`CENTI4.MAC:2418`) is the SOUNDS-owned label, leaving **four** others. The claim's prose is unmodified — it already correctly says "four" and "20" — only the machine-checkable assertions are added. (The exact recipe encoding is Dev's to choose; the NUMBERS above are the contract.)

  > ⚠ **SM correction (2026-08-05, Thrawn):** the originally-derived AC-3 said the SOUNDS span `CENTI4.MAC:2322-2465` "expects 4 hits". That is false — that span contains exactly ONE `52$` (line 2418, the SOUNDS-owned label). The claim's "four more times" are the defs OUTSIDE SOUNDS elsewhere in revision.v4, corrected above. Both figures were measured against the current tree this session (`grep -rn '^52[$]:' reference/atari-source/centipede` = 20; revision.v4 = 5 defs, one SOUNDS-owned → four others).

- **AC-4: MUTATION-PROVEN, MUTANT RECORDED** — The gate is mutation-tested by editing the vendored source (or the expected count) and verifying the test reddens. The exact source mutation is recorded verbatim so the next reader can re-run it. A positive control proves the shipped counts still pass when the expected numbers match the machine's result.

- **AC-5: MECHANISM GENERALIZES** — The count-checking mechanism is designed so future claims can be guarded the same way. A second claim (if any) in this or another game's dossier can adopt the same schema without additional gate rewrites.

## Related Stories

- **cp6-1:** The POKEY dossier and the fourteen-cues-over-six-tables ruling (extracted dossier-sweep module, established citation discipline)
- **cp6-2:** Bake the samples, upload them, and prove a live 200
- **cp6-3:** POKEY voice 0 is contended and our CHANNELS map does not model it
- **cp6-4:** centipede's rogue-manifest guard asserts only the interpolated cue name

## Notes for Development

- The count re-derives from the vendored source, not from the claim text — the gate must run the recipe fresh each time, not cache or interpolate
- The mechanism should be agnostic to the recipe: the schema should accept any shell command that returns a count, not just grep
- Review how tempest and red-baron gates handle similar count-style assertions for consistency
