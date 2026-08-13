---
story_id: "ml4-6"
jira_key: "ml4-6"
epic: "ml4"
workflow: "tdd"
---
# Story ml4-6: Extract the shared BEE-family helpers into one millipede core helper module

## Story Details
- **ID:** ml4-6
- **Jira Key:** ml4-6
- **Epic:** ml4 — Millipede — the menagerie + DDT (phase 4b)
- **Workflow:** tdd
- **Repos:** arcade
- **Points:** 2
- **Type:** refactor
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T20:52:11Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T20:14:41Z | 2026-08-13T20:17:34Z | 2m 53s |
| red | 2026-08-13T20:17:34Z | 2026-08-13T20:30:29Z | 12m 55s |
| green | 2026-08-13T20:30:29Z | 2026-08-13T20:38:16Z | 7m 47s |
| review | 2026-08-13T20:38:16Z | 2026-08-13T20:45:47Z | 7m 31s |
| green | 2026-08-13T20:45:47Z | 2026-08-13T20:47:23Z | 1m 36s |
| review | 2026-08-13T20:47:23Z | 2026-08-13T20:52:11Z | 4m 48s |
| finish | 2026-08-13T20:52:11Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (RED)

- **[Improvement, non-blocking] The duplication census is WIDER than the story text.** The story
  names four consumers (dragonfly/mosquito/bee/earwig) and three MILLI.MAC ranges. Measured against
  the tree, the real spread is:
  - `mushroomsNeeded` (BEEMV1): `bee.ts`, `dragonfly.ts` — 2 copies, exported, same name. ✅ clean.
  - `spawnH` (BEEMV2): `bee.ts`, `dragonfly.ts`, `mosquito.ts` — 3 copies, exported, same name. ✅ clean.
  - **BEEOFF body** (`pts=0; color=0; h=0`, byte-identical): duplicated under FIVE *different* per-critter
    names — `beeOff` (bee), `dragonflyOff` (dragonfly), `mosquitoOff` (mosquito), `earwigOff` (earwig),
    and **`spiderOff` (spider)** — each exported and typed to its own slot interface. So BEEOFF is the
    same LOGIC under distinct symbols, not one shared symbol.
  - **`comp`** (`(0x100 - b) & 0xff`, byte-identical, PRIVATE): lives in SIX files — `dragonfly.ts`,
    `earwig.ts`, **`mosquito.ts`**, `beetle.ts`, `inchworm.ts`, **`spider.ts`**.
  Consequence for Dev: the extracted `beeOff` needs a structural slot type (`{ pts; color; h }`) since the
  five callers each have their own slot; each caller keeps its public name via re-export/alias. The
  SM's ⚠ "fold beetle/inchworm or not" scope decision now also covers **mosquito's comp** (in-scope, a
  named consumer → fold it) and **spider** (out-of-scope `spiderOff`+`comp` → Dev's call). The RED suite
  asserts ONLY the four named consumers and is silent on spider/beetle/inchworm, so Dev may fold them or
  leave them without fighting a test.
- **[Gap, non-blocking] The story context cites a test file that does not exist.** `context-story-ml4-6.md`
  names the core-purity guard as `plugins/millipede/tests/core-boundary.test.ts`; the real guard is
  `plugins/millipede/tests/purity.test.ts` (it auto-sweeps every new `src/core/*.ts` via its `it.each`,
  so the extracted `bee-family.ts` is boundary-guarded for free — it stays pure, which it is). A filename
  slip carried in from SM setup; the constraint it describes is correct.

### Dev (implementation)

- **No upstream findings.** The wider census (comp in 6 files, BEEOFF under 5 names incl. spider) was
  already recorded by TEA above; I acted on it (scope decision below) rather than re-filing it. One
  forward note, non-blocking: `comp` still lives in `beetle.ts` / `inchworm.ts` / `spider.ts`, and
  `spiderOff` still duplicates the BEEOFF body — a future story can fold those into `bee-family.ts` (or a
  neutral `byte-math`/`slot` module) if/when they hit their own ml4-1 extraction trigger.

### Reviewer (code review)

- **Gap** (non-blocking, but routed to rework this round): three file-HEADER comments still describe the
  pre-extraction architecture and are now falsified by this same commit. `plugins/millipede/src/core/bee.ts`
  (header ~:34) still says the BEEMV1/BEEMV2/BEEOFF ports "are module-local copies … the extraction call is
  routed as a Delivery Finding, **not taken silently here**"; `mosquito.ts` (~:31) "The BEEMV2 spawn bytes
  are module-local copies (… ml4-1 rule)"; `earwig.ts` (~:33) "The BEEOFF port is a module-local copy (…
  ml4-1 rule)". Each file imports the extracted helper a few lines below. Update the three headers to state
  the ml4-6 extraction happened (this file re-exports/aliases from `./bee-family`). *Found by Reviewer during
  code review (corroborated by reviewer-comment-analyzer, 3× high confidence).*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **Dedup asserted by TS-AST function-definition walk, not enumerated line/text scan**
  - Spec source: context-story-ml4-6.md — "extraction is a pure refactor under an existing net"
  - Spec text: implies the four named consumers stop holding module-local copies
  - Implementation: `tests/bee-family.test.ts` parses each core file with the TypeScript compiler API
    (`definedFns`) and asserts no consumer *defines* the helper — a re-export or alias-to-identifier does
    NOT count. Mirrors the codebase's own choice of AST over flat text (`tests/helpers/purity-scanner.ts`),
    avoiding the comment/string false-positives that a grep-style guard hits.
  - Rationale: robust dedup proof that lets Dev preserve every public name while the body moves.
  - Severity: minor
  - Forward impact: a thin delegating wrapper (`export function beeOff(s){ return shared(s) }`) would trip
    the guard by design — the story wants the logic to LIVE in bee-family.ts, so aliases/re-exports are the
    intended shape, not wrappers.
- **RED scope limited to the four NAMED consumers; spider/beetle/inchworm deliberately unasserted**
  - Spec source: context-story-ml4-6.md ⚠ scope note on `comp`
  - Spec text: "explicitly decide whether to fold beetle/inchworm … Do not silently miss either"
  - Implementation: the suite asserts dedup for bee/dragonfly/mosquito/earwig only; it makes NO assertion
    about spider's `spiderOff`/`comp` or beetle/inchworm's `comp`.
  - Rationale: the breadth beyond the four named consumers is the SM's open decision routed to Dev; a test
    that forced it would pre-empt that ruling.
  - Severity: minor
  - Forward impact: Dev must consciously decide + document the spider/beetle/inchworm breadth in GREEN;
    the Reviewer should confirm the decision is stated, not defaulted.

### Dev (implementation)
- **Scope decision: folded ONLY the four named consumers; left spider/beetle/inchworm's copies in place**
  - Spec source: context-story-ml4-6.md ⚠ scope note on `comp`; TEA Delivery Finding (census)
  - Spec text: "explicitly decide whether to fold beetle/inchworm … Do not silently miss either"
  - Implementation: `bee-family.ts` is the home for mushroomsNeeded/spawnH/beeOff/comp; bee/dragonfly/
    mosquito/earwig import from it. `beetle.ts`, `inchworm.ts` and `spider.ts` keep their private `comp`,
    and `spider.ts` keeps its `spiderOff` — left untouched.
  - Rationale: the story names exactly four consumers; spider/beetle/inchworm are separate subsystems, not
    bee-family critters. Under the ml4-1 "one standalone subsystem per file" rule each keeps its own copy
    until its OWN extraction trigger. Folding them now is scope creep beyond the story and would couple
    unrelated reducers (beetle/spider) to the bee-family module.
  - Severity: minor
  - Forward impact: `comp` remains defined in 4 places (bee-family + beetle + inchworm + spider); a future
    story may consolidate — logged as a non-blocking Dev finding above.
- **BEEOFF parameter widened to a structural slot type; the five per-critter names become aliases**
  - Spec source: tests/bee-family.test.ts (RED — behaviour + dedup); ⚠ citation cohesion note
  - Spec text: extract BEEOFF into one helper; keep each consumer's public name working
  - Implementation: shared `beeOff(slot: { pts; color; h })` (structural, since each critter has its own
    slot interface). `bee.ts` re-exports `beeOff` directly (name matches); `dragonflyOff`/`mosquitoOff`/
    `earwigOff` become type-annotated aliases (`export const dragonflyOff: (slot: DragonflySlot) => void =
    beeOff`) so each keeps its exact public signature while the body lives once.
  - Rationale: the alias preserves the per-critter type (contravariant param assignment) with zero body
    duplication — the shape TEA's dedup guard intends (definitions collapse, names survive).
  - Severity: minor
  - Forward impact: none — callers pass their own slot (a subtype), unchanged. spider's `spiderOff` keeps
    its own body per the scope decision above.

No design deviations beyond those logged above.

### Reviewer (audit)

- **TEA — Dedup asserted by TS-AST walk** → ✓ ACCEPTED by Reviewer: the AST `definedFns` approach is
  strictly more robust than a text scan and matches the codebase's own `purity-scanner` philosophy;
  reviewer-rule-checker (#15/#18/#25) independently confirmed it is not defeatable by the exact regression
  it targets. Sound.
- **TEA — RED scope limited to the four NAMED consumers** → ✓ ACCEPTED by Reviewer: correctly refuses to
  pre-empt the SM's open spider/beetle/inchworm decision; the guard is silent on them, so Dev's choice was
  genuinely free.
- **Dev — Scope decision: folded ONLY the four named consumers** → ✓ ACCEPTED by Reviewer: the decision is
  stated, reasoned (ml4-1 "one subsystem per file"; avoid coupling beetle/spider to a bee-family module),
  and matches the diff exactly (verified: `comp` still private in beetle/inchworm/spider, `spiderOff`
  untouched). Not a default — a conscious, documented choice, which is exactly what the ⚠ note demanded.
- **Dev — BEEOFF parameter widened to a structural slot type; per-critter names become aliases** → ✓
  ACCEPTED by Reviewer: the structural param is a widening (verified byte-identical logic), the aliases are
  type-annotated to preserve each public signature, and tsc confirms every consumer slot satisfies the
  structural shape. This is the cleanest possible collapse — definitions merge, names survive.

**Setup by Grand Admiral Thrawn (SM). Phase pointer read `setup` on arrival; routing to TEA (Han Solo) for RED.**

**Story shape:** 2pt refactor, TDD, priority p3. Filed by the ml4-3 review (TEA Delivery Finding routed the decision). Goal: extract the duplicated BEE-family helpers into ONE millipede core helper module — a pure behavioural refactor under an existing test net.

**Premise verified against the current tree (not taken on faith):**
- `mushroomsNeeded` (BEEMV1): behaviourally byte-identical copies in `src/core/bee.ts:114`, `dragonfly.ts:111`.
- `spawnH` (BEEMV2): copies in `bee.ts:142`, `dragonfly.ts:159`, `mosquito.ts:117`.
- `beeOff` (BEEOFF, MILLI.MAC:166-171): copies in `bee.ts:211`, `dragonfly.ts:266`, `earwig.ts:182`, `mosquito.ts`.
- `comp` (COMP): copies in `beetle.ts:97`, `dragonfly.ts:97`, `earwig.ts:93`, **and `inchworm.ts:80`** — more consumers than the four BEE-family bugs named in the title.
- Pinning suites present: `tests/{bee,dragonfly,mosquito,earwig,beetle}.test.ts`. The behaviour is under net, so extraction is a pure refactor.

**Three constraints handed to TEA (rendered as ⚠ blocks in the context, since epic YAML `acceptance_criteria` is `null` — ACs are DERIVED, TEA to define RED specs):**
1. **Citation cohesion** — the copies are byte-identical in *code* but their inline citation-tag comments differ per file (`BE-39` vs `DF-34` vs bare). The extracted module needs one canonical citation form.
2. **Core boundary** — the new module MUST live under `src/core/` so it stays inside the sim purity boundary that `core-boundary.test.ts` scans.
3. **`comp` scope** — decide explicitly whether to fold `beetle`/`inchworm`'s `comp` copies too, or leave them module-local. Do not silently miss either.

**Board hygiene:** sibling probes clean (no `origin` branch for ml4-6, only sibling session is a-2/ml6-2). Merge gate clean (no open PRs). Claim committed + branch `feat/ml4-6-extract-bee-family-helpers` pushed from `develop` (gitflow) so the story is visible. Status stamped `in_progress`.
## TEA Assessment

**Tests Required:** Yes
**Reason:** Extraction refactor — the *behaviour* is already netted by the four critter suites, but the
deliverable itself (a single shared module + de-duplicated consumers) is a structural change that needs
its own guard. A pure "refactor with existing coverage" chore-bypass would leave the extraction unproven:
Dev could add a dead parallel module and the suite would stay green. So RED pins two new things the old
net cannot see — the shared module's contract, and that the duplication actually collapses.

**Test Files:**
- `plugins/millipede/tests/bee-family.test.ts` — new RED suite (behaviour + AST dedup guards).

**Tests Written:** 11 failing (4 behaviour + 7 structure) covering the extracted contract and the dedup.
**Status:** RED (failing — ready for Dev)

**RED verification (full `--project millipede`, not file-scoped):** `11 failed | 814 passed | 5 skipped`
across `1 failed | 37 passed` files. Every failure is in the new file and self-describing:
- 4 behaviour tests fail via the self-describing loader — `src/core/bee-family.ts` does not exist yet.
- `mushroomsNeeded` / `spawnH` fail the exactly-once guard (2 and 3 definers today).
- `bee-family.ts defines all four` fails (module absent).
- the 4 per-consumer guards fail with accurate survivor lists (bee→mushroomsNeeded/spawnH/beeOff,
  dragonfly→+comp, mosquito→spawnH/mosquitoOff/comp, earwig→earwigOff/comp).
Repo-wide `npm run lint` (tsc --noEmit) stays GREEN — the computed specifier keeps the RED tree
type-clean while the target module is absent (the conway/bee.test.ts pattern).

### Rule Coverage

Language: TypeScript (`.pennyfarthing/gates/lang-review/typescript.md`). This is a byte-for-byte
extraction, so most checklist families are N/A (no new enums, generics, null-handling, or type-escapes).
The applicable surface is **§5 module/declaration hygiene**, and it is covered:
- **Re-export vs re-definition** — the AST `definedFns` walk distinguishes a real definition from a
  re-export/alias, which is exactly the mechanism §5 cares about; a stray `export type` slip or a
  duplicate definition both surface as a guard failure.
- **Relative-import extension convention** — confirmed the millipede core imports siblings
  EXTENSIONLESS (`from './conway'`), so Dev writes `import { comp } from './bee-family'` (no `.js`).
  This is app/bundler code, not the ESM-strict shared library — no `.js`-extension trap here.
- **No new type-safety escapes / vacuous assertions** — self-checked: every test asserts a concrete
  value or an exact array; no `assert(true)`, no `let _ =`, no always-None checks.

**Handoff:** To Dev (Yoda) for GREEN. The build order that makes RED go green:
1. Create `src/core/bee-family.ts` exporting `mushroomsNeeded`, `spawnH`, `beeOff(slot: { pts; color; h })`
   and `comp` — one canonical citation form each (the ⚠ citation-cohesion note; the `citations`/`purity`
   audits will judge the new module).
2. Rewire the four named consumers to import from it and DROP their local copies, preserving each public
   name via re-export (same name: bee's `beeOff`, the exported `mushroomsNeeded`/`spawnH`) or alias
   (`export const dragonflyOff = beeOff`, etc.). Keep the four critter suites GREEN — they are the net.
3. Consciously decide + DOCUMENT whether to also fold spider (`spiderOff`+`comp`), beetle, and inchworm
   (`comp`). The RED suite is silent on them; the Delivery Finding has the full census.
## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/core/bee-family.ts` — NEW. The single home for `mushroomsNeeded` (BEEMV1),
  `spawnH` (BEEMV2), `beeOff` (BEEOFF — structural-slot fn), `comp` (COMP). Canonical citation form: BE-*
  tags (bee.ts's settled, byte-verified naming). Pure — the purity sweep now covers it and passes.
- `plugins/millipede/src/core/bee.ts` — dropped local mushroomsNeeded/spawnH/beeOff; imports + re-exports
  them from `./bee-family`. Public surface unchanged.
- `plugins/millipede/src/core/dragonfly.ts` — dropped local mushroomsNeeded/spawnH/comp; imports from
  `./bee-family`, re-exports mushroomsNeeded/spawnH, `dragonflyOff` now aliases the shared `beeOff`.
- `plugins/millipede/src/core/mosquito.ts` — dropped local spawnH/comp; imports, re-exports spawnH,
  `mosquitoOff` aliases `beeOff`.
- `plugins/millipede/src/core/earwig.ts` — dropped local comp; imports comp + beeOff, `earwigOff` aliases
  `beeOff`.

Net: **92 insertions / 96 deletions** across 5 files — a reduction (the point of the refactor).

**Tests:** GREEN. Full `npx vitest run --project millipede` → **38 files / 826 passed | 5 skipped | 0 failed**
(the 11 new bee-family tests pass; every pre-existing critter suite stays green — behaviour is unchanged).
Repo-wide `npm run lint` (tsc --noEmit) clean.

**Scope decision (required by the story's open ⚠ note):** folded ONLY the four named consumers
(bee/dragonfly/mosquito/earwig). `spider` (spiderOff + comp), `beetle` (comp) and `inchworm` (comp) are
left as-is — separate subsystems under the ml4-1 rule, not bee-family critters. Documented in Design
Deviations + a forward Delivery Finding. The RED suite asserts nothing about them, so this is a conscious
choice, not a default.

**Branch:** feat/ml4-6-extract-bee-family-helpers (pushed)

**Handoff:** To Reviewer (Obi-Wan) for review. Suggested focus: (1) the scope decision is stated, not
defaulted; (2) the four critter suites still pin behaviour post-extraction; (3) the `beeOff` structural
param + type-annotated aliases preserve each public signature.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — millipede 826/0, orchestrator 481/0, lint clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (covered by Reviewer: pure byte-domain fns, boundaries pinned by bee-family.test.ts) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (no error paths introduced — pure fns, no catch/fallback) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (covered by Reviewer: assertions concrete, dedup guard non-vacuous — proven RED→GREEN) |
| 5 | reviewer-comment-analyzer | Yes | findings | 3 | confirmed 3, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (covered by Reviewer: structural beeOff + annotated aliases, no stringly-typed/unsafe casts) |
| 7 | reviewer-security | Yes | clean | none | N/A — purity boundary intact, no casts |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (covered by Reviewer: change REMOVES duplication; alias/re-export is minimal) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 33 rules / 51 instances / 0 violations; byte-identity confirmed |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled as Skipped)
**Total findings:** 3 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** REJECTED

Rationale: the extraction itself is exemplary — byte-identical, pure, well-guarded — but this commit
leaves three file-header comments asserting the *opposite* of what the code now does. In a ROM-fidelity
codebase where these headers are the load-bearing narrative (and `citation cohesion` is an explicit AC),
shipping a header that says the extraction was "not taken silently here" — in the very file that now
imports from `bee-family` — is a documentation-correctness defect, not a nitpick. It is trivially fixable
(three header edits, no test change), so this is a lightweight **green rework**, not a redesign.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[DOC]` | Header still says BEEMV1/BEEMV2/BEEOFF are "module-local copies … extraction … not taken silently here" — falsified by the import 3 lines below | `plugins/millipede/src/core/bee.ts` (~:34-36) | Rewrite to state ml4-6 extracted these to `./bee-family`; this file re-exports them |
| [MEDIUM] `[DOC]` | Header still says "The BEEMV2 spawn bytes are module-local copies (… ml4-1 rule)" | `plugins/millipede/src/core/mosquito.ts` (~:31-33) | Rewrite to note the ml4-6 extraction; spawnH is re-exported |
| [MEDIUM] `[DOC]` | Header still says "The BEEOFF port is a module-local copy (… ml4-1 rule)" | `plugins/millipede/src/core/earwig.ts` (~:33-34) | Rewrite to note the ml4-6 extraction; earwigOff aliases the shared beeOff |

### Subagent dispatch (all 8 tags)
- `[EDGE]` — edge-hunter DISABLED. Self-covered: inputs are byte-domain (0–255) POKEY/SCORE2 registers,
  boundaries (0x02/0x12/0x30 cap; 0x10 reroll) are byte-identical to develop and pinned by bee-family.test.ts.
- `[SILENT]` — silent-failure-hunter DISABLED. Self-covered: no error handling, catch, or fallback introduced;
  `spawnH` returns `null` explicitly (a modelled reroll), unchanged.
- `[TEST]` — test-analyzer DISABLED. Self-covered: every assertion is a concrete byte or exact array; the
  dedup guard was RED before GREEN (non-vacuous by construction); rule-checker #15/#18/#26 corroborate.
- `[DOC]` — **comment-analyzer: 3 CONFIRMED** (the REJECT findings above). All high confidence, verified
  against the files.
- `[TYPE]` — type-design DISABLED. Self-covered: `beeOff(slot: {pts;color;h})` is an intentional widening;
  the three `*Off` aliases carry explicit signatures; no `as any`/unsafe cast (rule-checker #1/#2 confirm).
- `[SEC]` — security: CLEAN. Core/shell purity boundary intact in the new module and all four consumers; no
  casts.
- `[SIMPLE]` — simplifier DISABLED. Self-covered: the change is a net dedup (−4 fn bodies); alias + re-export
  is the minimal wiring; the test's `definedFns` AST helper (~15 lines) is justified by robustness, not gold-plating.
- `[RULE]` — rule-checker: CLEAN. 33 rules / 51 instances / 0 violations, incl. byte-identity (#33), purity
  (#31), extensionless imports (#32), and re-export hygiene (#5).

### Rule Compliance (TS lang-review checklist + project rules)
- **§1 type-safety escapes** — COMPLIANT: no `as any`/`@ts-ignore`/non-null `!` in any touched file (verified
  by grep + rule-checker).
- **§2 generics/interfaces** — COMPLIANT: `beeOff`'s mutable structural param is correct (mutation is BEEOFF's
  purpose); no `Record<string,any>`/`object`/`Function`.
- **§4 null handling** — COMPLIANT: `spawnH` returns `null` explicitly, byte-identical to originals.
- **§5 module/declaration** — COMPLIANT: value re-exports use plain `export {}` (functions, not types);
  imports are extensionless (`from './bee-family'`) matching the 5 pre-existing core sibling imports.
- **§8 test quality** — COMPLIANT: no `as any` in assertions; imports from `src/` (not `dist/`); fixture
  interface matches the real export shape.
- **Core/shell purity (project rule)** — COMPLIANT: new module under `src/core/`, pure; purity sweep GREEN.
- **ROM-fidelity (project rule)** — COMPLIANT: all four bodies byte-identical to develop (independently
  verified via `git show develop` + rule-checker #33).
- **§3/§6/§9/§10 enums/JSX/config/input-validation** — N/A (none present in diff).

### Observations (adversarial — ≥5)
1. `[VERIFIED]` byte-identity — `mushroomsNeeded`/`spawnH`/`beeOff`/`comp` in `bee-family.ts` are
   character-for-character identical to `develop:bee.ts` (and comp to `develop:dragonfly.ts`) — evidence:
   `git show develop:...` diff produced no body delta. Complies with the ROM-fidelity rule.
2. `[VERIFIED]` re-exports are load-bearing, not dead — no module imports these symbols by name cross-module,
   but the consumer test suites access `m.mushroomsNeeded`/`m.spawnH` via computed-specifier import;
   dropping the export would redden `bee.test.ts`/`dragonfly.test.ts`/`mosquito.test.ts`. Evidence: millipede
   suite 826/0 with re-exports present. So the re-exports are required, not scope creep.
3. `[VERIFIED]` `noUnusedLocals: true` is set (tsconfig.json) and repo lint is clean → every new import
   binding is genuinely used (bee: internal + re-export; dragonfly/mosquito/earwig: internal comp + alias).
4. `[MEDIUM] [DOC]` the three stale file headers (see severity table) — the REJECT.
5. `[VERIFIED]` scope decision matches the code — `comp` remains private in `beetle.ts`/`inchworm.ts`/
   `spider.ts` and `spiderOff` is untouched; the diff touches ONLY the four named consumers + the new module.
   Evidence: `git diff develop...HEAD --stat` lists exactly those 5 core files.
6. `[LOW] [DOC]` (noted, not blocking) — `bee-family.ts`'s `spawnH` docstring drops the "logged ml4-3 Design
   Deviation" phrase the original carried (rule-checker #17). Nothing false; merely less detail. Optional to
   restore during the rework.

### Devil's Advocate
Argue the code is broken. First attack: the structural widening of `beeOff` to `{ pts; color; h }`. Could a
caller now pass an object that type-checks but is the wrong slot — e.g. a mushroom cell that coincidentally
has pts/color/h — and silently clear the wrong thing? Traced: all `*Off` callers pass their own slot record
pulled from the motion-object array (bee.ts moveBee, dragonfly/mosquito/earwig sweep exits), never a foreign
object; and the aliases are typed to each nominal SlotType, so an accidental mushroom-cell argument would be
a type error at the call site. Not broken. Second attack: excess-property — the RED test passes a literal
`{ pts, color, h, v }` to `beeOff` whose param is `{ pts; color; h }`; shouldn't TS reject the extra `v`?
It would for a fresh literal against a declared type — but the test imports via computed specifier so `beeOff`
is `any` there; and no production caller passes a literal. So no false safety and no hidden compile break.
Third attack: aliasing changes identity — does `bee.beeOff === dragonfly.dragonflyOff`? Yes now (all alias
one object); could any test have depended on them being DISTINCT? None does; behaviour is what the suites
assert, and 826/0 holds. Fourth: a confused future reader. THIS is where it bites — the stale headers say
the extraction wasn't done. A maintainer reading `bee.ts`'s header could "helpfully" re-inline the helpers
to honour the "one subsystem per file" claim, silently reintroducing the duplication this story removed —
except `bee-family.test.ts`'s exactly-once guard would catch it. So the guard contains the blast radius, but
the misleading comment is exactly the kind of trap that guard exists to survive; leaving it is negligent even
though it can't cause a silent regression. Fifth: `comp` promoted to exported in `bee-family.ts` while still
private elsewhere — any name clash or double-definition? The exactly-once guard only governs mushroomsNeeded/
spawnH; comp is deliberately allowed in beetle/inchworm/spider. No clash: each `comp` is module-scoped. Net:
the only real defect the devil finds is the documentation, which is precisely the REJECT.

**Handoff:** Back to Dev (Yoda) for a green rework — update the three stale file headers to state the ml4-6
extraction. No code or test change required; the byte-identical extraction and its guards stand as-is.
## Dev Assessment — Rework Round 1

**Addressed the Reviewer's 3 MEDIUM [DOC] findings (comment-only):**
- `bee.ts` header — rewrote "module-local copies … not taken silently here" → "EXTRACTED to ./bee-family
  (ml4-6 …); this file re-exports them."
- `mosquito.ts` header — "module-local copies (ml4-1 rule)" → "EXTRACTED to ./bee-family (ml4-6); spawnH
  re-exported here."
- `earwig.ts` header — "module-local copy (ml4-1 rule)" → "EXTRACTED to ./bee-family (ml4-6); earwigOff
  aliases the shared beeOff."
- Also restored the Reviewer's LOW: the "logged ml4-3 Design Deviation" phrase on `bee-family.ts`'s spawnH
  docstring.

**Verification:** `grep "module-local cop"` across the four consumers → none remain. `npm run lint` clean.
`npx vitest run --project millipede` → 826 passed | 5 skipped | 0 failed. No code or test change — pure
comment fix; the byte-identical extraction and its guards are untouched.

**Branch:** feat/ml4-6-extract-bee-family-helpers (pushed, commit 729d03ba)
**Handoff:** Back to Reviewer (Obi-Wan) for re-review.
## Subagent Results — Round 2 (re-review after comment-only rework)

Round-2 delta vs the round-1 commit is COMMENT-ONLY (verified: zero executable-line changes), so the
byte-identical code carries security's and rule-checker's round-1 CLEAN verdicts forward unchanged; the two
specialists whose domain the rework actually touched (comments, and the green suite) were re-run.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — RE-RUN r2: lint clean, millipede 826/0, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — RE-RUN r2: 3 round-1 findings FIXED, no new stale comment, docstring restore accurate |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — round-1 CLEAN stands (code byte-identical; comment-only r2 delta) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — round-1 CLEAN stands (code byte-identical; comment-only r2 delta) |

**All received:** Yes (2 re-run + 2 carried-forward clean; 5 disabled)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

## Reviewer Assessment — Round 2 (re-review)

**Verdict:** APPROVED

The round-1 REJECT was a documentation-correctness defect (3 stale file headers). Dev's rework corrected all
three headers to state the ml4-6 extraction and restored the LOW docstring phrase, with ZERO executable-line
change. Re-review confirms:
- `[DOC]` comment-analyzer RE-RUN → CLEAN: bee.ts/mosquito.ts/earwig.ts headers now accurately describe the
  extraction (re-export/alias), no new stale comment, and the surviving "module-local" mentions are
  legitimate (`bee-family.ts` narrating pre-extraction history; `spider.ts` describing its own out-of-scope
  copy). The `spawnH` docstring's restored "logged ml4-3 Design Deviation" phrase is accurate.
- `[RULE]` rule-checker → CLEAN (round 1, code byte-identical): 33 rules / 51 instances / 0 violations,
  incl. byte-identity (#33), purity (#31), extensionless imports (#32), re-export hygiene (#5).
- `[SEC]` security → CLEAN (round 1, code byte-identical): core/shell purity boundary intact, no casts.
- `[EDGE]`/`[SILENT]`/`[TEST]`/`[TYPE]`/`[SIMPLE]` — disabled via settings; self-covered in round 1 and
  untouched by a comment-only rework (no boundary/error/test/type/complexity surface changed).

**Data flow traced:** POKEY register bytes (rnd0) → `spawnH`/`comp` byte math → slot mutation via `beeOff`;
all deterministic, byte-identical to develop, safe (no I/O, no boundary crossing).
**Pattern observed:** clean extraction-to-shared-module with public names preserved via re-export/alias —
`plugins/millipede/src/core/bee-family.ts` + the four consumers.
**Error handling:** N/A — pure functions; `spawnH` returns `null` for the modelled reroll (unchanged).
**Deviation audit:** all four logged deviations stamped ACCEPTED in round 1 (see `### Reviewer (audit)`); the
rework added no new deviation.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.