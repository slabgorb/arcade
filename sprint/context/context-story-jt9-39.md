# Story jt9-39: ROW_DISPOSITION can lie in the direction that matters

**Type:** bug  
**Points:** 3  
**Priority:** p3  
**Workflow:** tdd  
**Repos:** arcade  

## Background

**Filed by:** jt9-9's Reviewer (2026-08-03)

**Filed from:** A gap jt9-9's TEA raised at RED and confirmed by its own mutation battery.

**Epic context:** This epic orders 28 joust stories (82 points) holding every unfinished work from jt5, jt8, and uf1 resequenced into one dependency-ordered plan.

### Measured Facts (SM re-measured 2026-08-06)

The epic description was filed 2026-08-03 and describes a live 3-category inventory (wired / dead-in-rom / no-consumer-yet) with drifting owner strings. The following measurements were taken against the current tree:

1. **All 28 rows in `plugins/joust/src/core/difficulty.ts` ROW_DISPOSITION are currently `kind: 'wired'`.** There are ZERO `no-consumer-yet` rows and ZERO `dead-in-rom` rows in the live data. The `no-consumer-yet` variant and its `owner: string` field (difficulty.ts:290-293) are the union TYPE only.

2. **The AC's three assertions split by how much live data they see:**
   - "for each WIRED row, fail if NO waveValue/dyRow call passes its name" → 28 live rows; this is the direction with real on-arrival assertions.
   - "for each NO-CONSUMER-YET row, fail if such a call EXISTS" → iterates an EMPTY set today; passes vacuously on arrival.
   - "every owner must match a story id in the sprint" → `owner` exists only on pending rows, of which there are none; also iterates an EMPTY set today.
   
   Two of the three directions are therefore proven ONLY by the mutation the AC already mandates (flip a wired row to no-consumer-yet; synthesise a pending row carrying a bad/dangling owner). This is expected for a regression-prevention guard — flag it so TEA does not write a vacuous test and mistake it for coverage.

3. **Guard lines the story cites are present and check only table self-consistency:** difficulty-wiring.test.ts:781 (wired-set exact equality) and :847 (pending count). Matches the story filing.

4. **Every owner id referenced in difficulty.ts today (jt9-1, jt9-11, jt9-9, uf1-2, uf1-8, uf1-9) exists in the sprint YAML** — the dangling-owner guard passes on arrival and is proven only by mutation.

### Known Mutation Trap

`waveValue('LAVLAV')` appears in BOTH lava lookers, so a naive perl -0 slurp-replace mutation hits the FIRST duplicate and leaves the target intact — a false survivor. Any mutation must be confirmed with `git diff` that the INTENDED site changed.

## Problem Statement

`difficulty.ts`'s ROW_DISPOSITION is the 28-row inventory recording, for every DYTBL row, whether it is wired / dead-in-rom / no-consumer-yet. Two existing guards pin it and BOTH check only the table's self-consistency:
- difficulty-wiring.test.ts:781 pins the wired set by exact equality
- difficulty-wiring.test.ts:847 pins the pending count

**Neither asserts that a row marked `no-consumer-yet` genuinely HAS no consumer.**

**The critical failure is unguarded:** wire a row in code, forget to update the table, and the suite stays green while the inventory says nobody reads it. This is the exact mechanism that kept uf1-2's frozen-dial defect invisible for a year — the inventory is what future sweeps trust instead of re-deriving, and a stale entry is worse than none.

jt9-9 hit this concretely: it wired EGGWT and EGGWT2 but had to move them by hand in the table; nothing would have caught leaving them marked `no-consumer-yet` in the data.

**Secondary issue:** The `owner` strings in ROW_DISPOSITION drift. Both lava rows were marked with owner `uf1-10` until jt9-9 corrected them to `jt9-11` (an id the epic renumbering had invalidated). An owner naming a story id that does not exist in the sprint is a dangling reference and should fail the test.

## Acceptance Criteria

> ⚠ The following criteria are reproduced verbatim and unedited from the story filing at epic-jt9.yaml:817

A guard that asserts the following, with mutation-verification for BOTH directions:

1. For each WIRED row, fail if NO `waveValue`/`dyRow` call passes its name to the consumer (grep the joust core for proof)
2. For each NO-CONSUMER-YET row, fail if such a call EXISTS (must redden on mutation: flip a wired row to no-consumer-yet without touching code)
3. Add a `waveValue` call for a pending row (must redden on mutation)
4. Every `owner` must match a story id present in the sprint YAML (fail on dangling references)

## Exit Criteria

- All acceptance criteria are met
- Mutations confirm both the positive case (wired→no-consumer-yet without code change reddens) and the negative case (adding a waveValue call for a pending row reddens)
- Owner validation catches invalid story ids
