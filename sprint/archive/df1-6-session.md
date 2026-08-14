---
story_id: "df1-6"
jira_key: "df1-6"
epic: "df1"
workflow: "tdd"
---
# Story df1-6: Harden the claims-JSON load path in the fleet's citation checkers

## Story Details
- **ID:** df1-6
- **Jira Key:** df1-6
- **Workflow:** tdd
- **Type:** chore
- **Points:** 2
- **Repo:** arcade
- **Branch Strategy:** gitflow (feat/df1-6-harden-claims-json-load-path)
- **Branch:** feat/df1-6-harden-claims-json-load-path
- **PR:** 370 (MERGED into develop, merge commit 7da00054)

## Scope Widening (SM Ruling — User Approved 2026-08-14)

This story covers **FOUR games** — defender, millipede, centipede, and pac-man. The epic YAML title names three games (defender, millipede, centipede), but pac-man carries the byte-identical vulnerable `loadClaims` function (plugins/pac-man/tests/audit/dossier-sweep.ts:77) and is folded into scope. Every per-game fix and test applies to all four games.

**Measured Correction (Ground Truth — verified against current tree before setup):**

1. `loadClaims` is byte-identical across all four games:
   ```typescript
   export function loadClaims(): Claim[] {
     if (!existsSync(claimsDir)) return []
     return readdirSync(claimsDir)
       .filter((f) => f.endsWith('.json'))
       .flatMap((f) => JSON.parse(readFileSync(join(claimsDir, f), 'utf8')) as Claim | Claim[])
       .flat()
   }
   ```
   Sites:
   - plugins/defender/tests/audit/dossier-sweep.ts:148
   - plugins/millipede/tests/audit/dossier-sweep.ts:152
   - plugins/centipede/tests/audit/dossier-sweep.ts:152
   - plugins/pac-man/tests/audit/dossier-sweep.ts:77

2. **Half (1) — Error Handling:** The bare `JSON.parse(...)` is uncaught — a malformed claims/*.json throws a raw SyntaxError naming NO file. Fix: wrap the parse in a controlled per-file error that names the offending file.

3. **Half (2) — Shape Validation:** The `as Claim | Claim[]` cast does NO runtime shape validation — a well-formed-JSON but wrong-shape file (an object instead of an array, or entries missing source.file/source.line/verbatim) flows into the sweep unchecked. Fix: add a shape assertion in loadClaims (or an unconditional schema test).

Both halves are on the SAME load path — one edit per game closes both.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T15:20:08Z

> ℹ REVIEW HISTORY (resolved): rounds 1 & 2 returned REJECTED and each time `pf handoff
> complete-phase` misrouted the pointer to `finish` (the known reviewer-reject misroute); it was
> hand-repaired to `green` for rework both times (gate `recovery_config`: rework→green, max 3).
> Round 1 fixed R1–R5 + r6–r7; round 2 fixed R6 (8 `isValidClaimSource` docstrings). **Round 3
> APPROVED** — this `finish` phase is correct (approval routes here legitimately). One follow-up
> routed to SM: file **df1-8** for joust's inline `loadClaims` at `citations.test.ts:641`.

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T14:10:23Z | 2026-08-14T14:12:36Z | 2m 13s |
| red | 2026-08-14T14:12:36Z | 2026-08-14T14:16:58Z | 4m 22s |
| green | 2026-08-14T14:16:58Z | 2026-08-14T14:36:07Z | 19m 9s |
| review | 2026-08-14T14:36:07Z | 2026-08-14T14:52:33Z | 16m 26s |
| green (rework r1) | 2026-08-14T14:52:33Z | 2026-08-14T15:02:44Z | 10m 11s |
| review (r2) | 2026-08-14T15:02:44Z | 2026-08-14T15:09:46Z | 7m 2s |
| green | 2026-08-14T15:09:46Z | 2026-08-14T15:16:33Z | 6m 47s |
| review | 2026-08-14T15:16:33Z | 2026-08-14T15:20:08Z | 3m 35s |
| finish | 2026-08-14T15:20:08Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup time.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations at setup time.

- **Deviation (non-blocking): the fix touched 5 files beyond the 4 `dossier-sweep.ts`.** The spec is "add a shape assertion in loadClaims." I implemented the assertion by reusing each game's own citation-shape predicate (single source of truth, no drift) — so I added an `isValidClaimSource` export to each `check-citations.mjs` (+`.d.mts`). Adding that export widened the module's namespace type, which surfaced a **latent-fragile whole-module cast** — `(await import('.../check-citations.mjs')) as { checkClaims: CheckClaims }` — in 5 sibling test helpers whose local `CheckClaims` typed the param `readonly Claim[]`. With one export the cast passed; with two, TS re-evaluates comparability and the readonly-vs-mutable nuance trips TS2352. Fixed those 5 casts with `as unknown as` (defender `tests/helpers/dossier-audit.ts`; millipede `board-facts`/`brief-dossier`/`glossary-subsystems-oq`/`graphics-rom`). The casts were always semantically fine (`checkClaims` never mutates its input); `as unknown as` is the standard idiom and is now durable against any future export. **Why not the alternative:** a self-contained inline check requiring only `source.file` avoids the collateral but would NOT reject a claim whose `source` has `file` but is missing `line`/`verbatim` — exactly the case the story names — so the reuse approach delivers the story's intent more faithfully.

## Sm Assessment

**Setup complete — routing to TEA for RED.** This is a 2pt tdd chore, no sibling contention (branch/session probes clean; `feat/df1-6` now pushed as the claim).

**Premise measured and CONFIRMED exact (not stale).** Both halves of the story reproduce against the current tree, and `loadClaims` is byte-identical across all sites — see the Measured Correction block above for the code and the four file:line sites. No refutation; the description is current fact.

**Scope ruling (user-approved 2026-08-14): pac-man folded in → FOUR games.** The epic YAML title still names three; that is the original filing, not current scope. pac-man (`plugins/pac-man/tests/audit/dossier-sweep.ts:77`) carries the identical defect and is in scope. The context file carries a `> ⚠` note above the ACs recording this; the AC text is reproduced verbatim and unedited.

**For TEA (RED):** two failure modes on one load path, replicated ×4 games:
1. Malformed JSON → bare `JSON.parse` throws a raw `SyntaxError` naming no file. RED: assert the thrown error names the offending file.
2. Well-formed JSON, wrong shape (object-not-array, or entries missing `source.file`/`source.line`/`verbatim`) → flows through the `as Claim | Claim[]` cast unchecked. RED: assert `loadClaims` rejects it (shape assertion or unconditional schema test).

Note the four `dossier-sweep.ts` files are near-identical modules — a per-game replicated test is expected. Watch for a shared helper opportunity, but "extract only once duplication is proven" (CLAUDE.md) — four copies may justify it; leave that call to Dev/Reviewer.

## Tea Assessment

**RED landed — 20 failing tests (5 × 4 games), all failing for the right reason.** Committed `fe5f809e`.

**What I wrote.** One new test file per game, byte-identical apart from the `describe` label:
- `plugins/defender/tests/audit/load-claims-hardening.test.ts`
- `plugins/millipede/tests/audit/load-claims-hardening.test.ts`
- `plugins/centipede/tests/audit/load-claims-hardening.test.ts`
- `plugins/pac-man/tests/audit/load-claims-hardening.test.ts`

Each imports `loadClaims` from `./dossier-sweep` and asserts five behaviors:
1. malformed JSON → throws an error whose message **names the offending file** (`/broken\.json/`);
2. that message is a controlled string containing the filename, not a bare `SyntaxError` (defined + `toContain`);
3. wrong-shape JSON — an object that is not a Claim — is **rejected, naming the file** (`/wrong-shape\.json/`);
4. a claim entry **missing `source.file/line/verbatim`** is rejected, naming the file (`/bad-entry\.json/`);
5. a well-formed, correctly-shaped file **still loads** — `Array.isArray`, `toHaveLength(1)`, `id === 'a'` (no false positive).

**The GREEN contract this pins (for Loki / Dev).** `loadClaims` currently reads a hardcoded `claimsDir` with a 0-arg signature and no injectable seam, so the tests point it at a temp dir via an **optional directory argument** — `loadClaims(dir = claimsDir)` — mirroring the codebase's existing `checkClaims(claims, { vendoredRoot })` seam. RED expresses that intended 1-arg API through a `const load = loadClaims as unknown as (dir?: string) => unknown[]` cast, so **tsc stays green** (verified: `npx tsc --noEmit` reports nothing on these files) and only the runtime behavior is red. Dev must:
- give `loadClaims` the optional dir arg (default `claimsDir` — production callers unchanged);
- wrap the per-file `JSON.parse` in a try/catch that rethrows a controlled error **including the filename**;
- shape-assert each parsed value (a `Claim` object or `Claim[]`; each entry needs `id`, `claim`, and `source.{file,line,verbatim}`) — `check-citations.mjs` already exports an `isCitation`-style guard that can be reused;
- **replicate the one edit across all four `dossier-sweep.ts` files.**

**RED evidence.** `npx vitest run --project <game> load-claims-hardening` for each of the four → `5 tests | 5 failed`; sample reason `AssertionError: expected [Function] to throw an error` — i.e. today's `loadClaims` silently ignores the arg, reads the real (valid) claims and never throws. Not a collect/compile crash; tsc is clean.

**Self-check (Phase C).** No vacuous assertions — every test asserts a throw+filename match or a concrete shape+value. No `let _ =`, no `assert(true)`, no `is_none()`-on-always-none.

### Rule Coverage
- Language: **TypeScript** (`.pennyfarthing/gates/lang-review/typescript.md` is the applicable checklist; no `.claude/rules/` or `SOUL.md` in this repo).
- **Non-vacuous coverage sweep / injectable seam (the df1-1 lineage rule):** the citation checkers are hardened against their own load path — a malformed or wrong-shape claims file is now a named, controlled failure rather than a raw stack or a silent pass. Tests exercise the REAL `loadClaims`, not a copy.
- **`as` cast is a compile-time lie (lang-review — unchecked type assertions):** directly targeted — the `as Claim | Claim[]` cast is the defect; test 3/4 prove a runtime shape assertion must back it.
- **Error messages must be actionable (lang-review — swallowed/opaque errors):** test 1/2 require the filename in the thrown message.
- **No false positives on the happy path:** test 5 guards the well-formed case.

**Deviation from stated scope:** none beyond the SM-recorded pac-man widening (four games, not three) — already annotated in the context and Scope Widening block above.

## Dev Assessment

**GREEN — all 20 RED tests pass, full fleet stays green.** Commit `9d8e9c0f`.

**The fix (identical shape in all four `dossier-sweep.ts`).** `loadClaims` gains an optional `dir` argument (`loadClaims(dir = claimsDir)` — production callers unchanged), and per file:
- wraps `JSON.parse` in a try/catch that rethrows `claims file <name> is not valid JSON: …` — a **controlled error naming the offending file**, closing half (1);
- normalizes single-object/array, then asserts each entry's `source` via `isValidClaimSource(entry.source)`, throwing `claims file <name> has a malformed claim …` if any entry fails — closing half (2).

**Why reuse the checker's own predicate (the key design call).** The claim `source` schema is **not uniform across games** — I discovered this the hard way: pac-man's real `sound.json` uses `{file, offset, nibbles}` (WSG PROM), and pac-man claims carry no `claim` field at all (`id/symbol/value/meaning/addr/source`); centipede is text-only; defender/millipede are text+byte. A hand-rolled validator in `loadClaims` would have rejected real claims (it did, on first attempt — pac-man `sound.json` reddened) or drifted from what `checkClaims` accepts. So I exported `isValidClaimSource` from each `check-citations.mjs` (+`.d.mts`), ORing exactly that game's own guards (`isCitation` / `isByteCitation` / `isBinaryCitation`). Now the **load-boundary gate and the schema gate share one predicate** and cannot drift.

**Collateral (logged as a Design Deviation above).** The new export widened check-citations' namespace type and tripped TS2352 on 5 latent-fragile whole-module casts in sibling test helpers; fixed with `as unknown as`. No behavior change — those casts were always sound.

**Verification (all run, all green):**
- new hardening tests: `5 passed` × 4 games (20/20);
- per-game full suites: defender 171, millipede 1065, centipede 1275, pac-man 398 — all pass (pac-man went 344→398 as the previously-failing `citations.test.ts` collect now loads clean);
- **full vitest: 1060 files, 16149 tests pass, 1 todo, 0 fail**;
- **orchestrator: 498 pass, 0 fail**;
- **`npm run lint`: 0 errors** (was 0 at baseline; my export briefly made it 5, now 0 after the cast fixes).

**For the Reviewer (Heimdall):** two spots worth an adversarial look — (1) `isValidClaimSource` per game must OR the *right* guard set; I verified centipede is genuinely text-only and pac-man needs all three by running every real claims file through the new path (all four suites green). (2) The 5 `as unknown as` edits are the only files outside the 4 core modules; confirm they are pure cast-robustness, not behavior.

### Dev Rework — Round 1 (commit `8322b655`)

All five REQUIRED findings and both RECOMMENDED addressed; the two challenged/dismissed items left as-ruled; the follow-up routed to SM.

- **R1 `[DOC][RULE]` DONE** — reworded all four `loadClaims` comments: `isValidClaimSource` is now described as "composed from the SAME guard functions (`isCitation`/`isByteCitation`/…) that `checkClaims` dispatches on … as long as those guards remain the single definition (isValidClaimSource does not re-implement them)." Dropped the false "the SAME predicate checkClaims uses / cannot drift." (Chose reword over making `checkClaims` call `isValidClaimSource`: `checkClaims` must dispatch on *which* shape to run the right byte/nibble/line verification, so it needs the individual guards, not a boolean — the shared guards are the real anti-drift mechanism, now stated accurately.)
- **R2 `[TEST]` DONE** — added a shape-acceptance test per game: byte `{file,offset,bytes}` for defender/millipede, nibble `{file,offset,nibbles}` for pac-man; centipede omits it (text-only, noted in-file). **Mutation-verified**: dropping `|| isByteCitation` in defender reddens exactly the new "still loads a BYTE-shaped source claim" test (1 failed / 7 passed), restore → 8/8.
- **R3 `[TEST][RULE]` DONE** — deleted the `const load = loadClaims as unknown as (dir?: string) => unknown[]` scaffold in all 4 test files; tests now call the typed `loadClaims` directly, so tsc guards the signature (lint still 0).
- **R4 `[RULE]` DONE** — all 4 catch blocks now `e instanceof Error ? e.message : String(e)`.
- **R5 `[TEST]` DONE** — renamed test 4 to "rejects a claim entry with NO source at all"; added "rejects a claim whose source is PRESENT but missing a required field (verbatim)" pinning the finer schema.
- **r6 `[RULE]` DONE** — removed the dead trailing `.flat()` in all 4 `dossier-sweep.ts`.
- **r7 DONE** — annotated `const entries: unknown[]` (stops `Array.isArray` narrowing to `any[]`); added a single-object-file test.
- **Challenged #3 (id/claim) — left as source-only** per the ruling (pac-man claims have no `claim` field). **Dismissed #2 (readonly root-cause) — left as `as unknown as`** in the 5 sibling files.
- **Follow-up (joust `citations.test.ts:641`) — NOT touched**; awaiting SM to file df1-8.

**Verification:** hardening suites 8/8/7/8 (defender/millipede/centipede/pac-man); full per-game 174/1068/1277/401; **full vitest 16160 pass, 1 todo, 0 fail**; **orchestrator 498 pass**; **lint 0**.

## Subagent Results (Round 1 — superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN: 3307 tests, lint 0) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Covered by me — mutation battery + edge probes (empty dir, null entry, single-object, byte/nibble) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Covered by me — catch-block review surfaced R4 |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 3 (byte/nibble untested, test-4 misname, vestigial cast), noted 2 (single-object, test-1/2 overlap) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — missed the overclaim rule-checker caught (see R1) |
| 6 | reviewer-type-design | No | Skipped | disabled | Covered by me + rule-checker (`entries as Claim[]`, `Array.isArray`→`any[]`) |
| 7 | reviewer-security | No | Skipped | disabled | N/A — test/tooling code, no runtime attack surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Covered — dead trailing `.flat()` (r6) |
| 9 | reviewer-rule-checker | Yes | findings | 7 (empirically verified) | confirmed 5, challenged 1 (#3 id/claim), dismissed 1 (#2 root-cause) |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled and their domains covered by the Reviewer directly)
**Total findings:** 8 confirmed, 2 dismissed/challenged (with rationale), 1 routed to follow-up

## Reviewer Assessment (Round 1 — REJECTED, superseded by Round 2 below)

**Verdict: REJECTED (round 1) — route to Dev for a short, well-scoped fix round.**

The implementation is **functionally correct and fully green**, and I independently proved the new tests bite with a mutation battery on defender (restored after): dropping the filename from the throw → exactly the 2 filename tests fail; neutering `isValidClaimSource` to `return true` → exactly the 2 wrong-shape tests fail; removing the try/catch → the malformed tests fail; tree restored to 5/5. The design call to reuse each game's own guards (avoiding a hand-rolled validator that would redden pac-man's nibble claims) is the right one.

But five cheap, verified defects keep this from shipping — most pointed for a **citation-fidelity epic** whose whole premise is that a checker's claims must be true:

**Specialist contributions:** `[TEST]` reviewer-test-analyzer (5 findings → R2, R3, R5, r7), `[RULE]` reviewer-rule-checker (7 verified findings → R1, R4, r6; #3 challenged, #2 dismissed), `[DOC]` reviewer-comment-analyzer (returned clean — but see R1, a comment-accuracy defect it missed that `[RULE]` caught).

**REQUIRED**
- **R1 `[DOC]` `[RULE]` — Overclaiming comment (rule-checker #5, CONFIRMED).** All four `loadClaims` comments say `isValidClaimSource` is "the SAME predicate checkClaims uses, so the load gate and the schema gate cannot drift." Verified false: `checkClaims` inlines `isCitation`/`isByteCitation`/`isBinaryCitation` directly and never calls `isValidClaimSource` (`grep -c isValidClaimSource check-citations.mjs` → 1, the definition). They are two independent compositions of the same primitives and *can* drift. In this repo a false mechanism-claim in a comment is exactly the defect class the epic exists to prevent. **Fix (choose one):** (a) make `checkClaims` actually call `isValidClaimSource` (makes the claim TRUE and removes the drift — the stronger fix), or (b) reword to "composed from the same guards checkClaims uses."
- **R2 `[TEST]` — Byte/nibble acceptance is never tested (test-analyzer #1, CONFIRMED).** The hardening suite's only positive fixture `GOOD_CLAIM` is text-shaped. A regression dropping `|| isByteCitation` (defender/millipede) or `|| isBinaryCitation` (pac-man) would wrongly reject real byte/nibble claims — caught by the *full* suites but NOT by the dedicated guard that claims to cover this. **Fix:** add a byte-source acceptance fixture to defender/millipede and a nibble-source one to pac-man (and ideally a malformed-byte rejection case). Centipede is exempt (genuinely text-only — verified).
- **R3 `[TEST]` `[RULE]` — Vestigial RED cast (test-analyzer #5 / rule-checker #1, CONFIRMED dead).** `const load = loadClaims as unknown as (dir?: string) => unknown[]` in all 4 test files was RED scaffolding; the GREEN signature `loadClaims(dir = claimsDir): Claim[]` now satisfies every call. Removing it compiles clean (rule-checker verified). Leaving it routes every call through `unknown` and defeats tsc's ability to catch signature drift on the very API this suite locks. **Fix:** delete the cast; call `loadClaims` directly.
- **R4 `[RULE]` — Unnarrowed catch cast (rule-checker #4, lang-review #11).** `(e as Error).message` in all 4 catch blocks casts without an `instanceof` guard. **Fix:** `e instanceof Error ? e.message : String(e)`.
- **R5 `[TEST]` — test 4 misnamed + finer schema untested (test-analyzer #3).** Test 4 ("rejects a claim entry missing source.file/line/verbatim") actually feeds an entry with **no `source` at all** — the same case test 3 covers. A regression weakening one `isCitation` clause (e.g. `line > 0` → `>= 0`, or dropping `file.length > 0`) is caught by nothing here. **Fix:** rename it, and add a partial-invalid-source case (e.g. `source:{file:'X.SRC', line:1}` with `verbatim` missing) asserting rejection naming the file.

**RECOMMENDED (cheap, not blocking on their own)**
- **r6 `[RULE]` — Dead `.flat()` (rule-checker #7 / simplifier).** The `flatMap` callback always returns an array, so the trailing `.flat()` is a no-op (pre-existing, but on a line this diff rewrote). Drop it.
- **r7 — Optional:** type the `[parsed]` branch as `unknown[]` to stop `Array.isArray` silently narrowing to `any[]` (rule-checker #6); add a single-object-file test (test-analyzer #2).

**CHALLENGED / DISMISSED (do NOT action)**
- **rule-checker #3 (validate `Claim.id`/`Claim.claim`, not just `source`) — CHALLENGED.** Verified pac-man's real claims carry **no `claim` field** (`id,symbol,value,meaning,addr,source`), so requiring `id`+`claim` fleet-wide would redden pac-man. Source-only validation is a **deliberate, correct scope** for this story (half-2 is about *source* shape). Accepted as-is.
- **rule-checker #2 (fix the readonly-vs-mutable root cause instead of 5× `as unknown as`) — DISMISSED.** `as unknown as` is a standard idiom and rule-checker itself verified the casts are *necessary* and behavior-preserving; re-typing the local `CheckClaims`/`.d.mts` across 5 files is more churn than value. (R3 removes the 4 *test-suite* casts anyway; the 5 sibling casts are legitimately needed.)

**ROUTED TO FOLLOW-UP (out of df1-6 scope — do not fix here).** `plugins/joust/tests/audit/citations.test.ts:641` has an inline `loadClaims` with the identical unhardened `JSON.parse(...) as Claim | Claim[]` pattern. Note joust's and missile-command's `tests/helpers/claims.ts` loaders are *already* hardened (via an `asClaim(c,f)` shape check) — so the fleet gap is specifically joust's citations.test.ts inline copy. **SM: please file a follow-up story (suggest df1-8) to harden it**; the fleet is otherwise consistent.

**Process note (not a code finding):** a reviewer subagent's in-place mutation left the working tree dirty mid-review (a `.orig` backup + a reverted `as unknown as` in `dossier-audit.ts`, briefly reddening working-tree lint). HEAD was never affected; cleaned and re-verified lint 0 after all subagents returned.

### Rule Compliance (Round 1)

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (31 checks). `[RULE]` reviewer-rule-checker ran all applicable checks empirically (tsc + vitest + isolated probes), 97 instances. Mapping of the checks that bit this diff:

- **#1 Type-safety escapes (`as`, `as unknown as`, predicates):** VIOLATIONS → R3 (dead RED cast in 4 test files) and the 5 sibling `as unknown as` (verified *necessary*, dismissed as acceptable idiom — see rule-checker #2). Also #1 flags `Array.isArray(parsed)` narrowing to `any[]` → r7.
- **#10 Type-level input validation:** COMPLIANT improvement — `JSON.parse` is now `unknown`, gated by `isValidClaimSource`, replacing the bare `as Claim | Claim[]` this story was filed to remove. Partial note: `entries as Claim[]` validates `source` only (rule-checker #3) — CHALLENGED: id/claim can't be validated fleet-wide (pac-man claims lack `claim`); accepted scope.
- **#11 Error handling (narrow catch with instanceof; add context on rethrow):** VIOLATION on narrowing → R4 (`(e as Error).message` unguarded); COMPLIANT on rethrow context (the message names the file).
- **#15 Source-text assertions match the claim, not a token:** COMPLIANT — the `toThrow(/broken\.json/)` etc. anchor to the exact filename the mechanism must name; mutation-verified.
- **#17 Comments/docs asserting an unrehearsed mechanism:** VIOLATION → R1 (the "SAME predicate checkClaims uses / cannot drift" claim is false); the per-game `.d.mts` JSDoc accepted-shape lists are COMPLIANT (verified against each `||` composition).
- **#8 Test quality:** VIOLATION → R3 (mock/stub return type `unknown[]` ≠ real `Claim[]`); R2/R5 add missing positive/edge coverage.
- **#31 (parent-requested) Dead code:** VIOLATION → r6 (trailing `.flat()`).
- Checks #2–7, #9, #12–14, #16, #18–30: no applicable violations (see the `[RULE]` table in the subagent transcript for per-check instance counts).
---

## Subagent Results (Round 2 — superseded)

Review Round 2 (rework verification). Enabled specialists re-dispatched on the round-2 diff (through commit `8322b655`); disabled ones covered by the Reviewer directly (mutation battery).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN: 3418 tests, lint 0, no dead code) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Covered by me — mutation battery on the new byte/nibble + partial-source + single-object tests |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Covered by me — verified R4 catch narrowing (4× instanceof, 0 bare cast) |
| 4 | reviewer-test-analyzer | Yes | clean | 0 (R2/R3/R5/r7 all verified resolved, each mutation-backed) | N/A |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 blocking + 1 low | **confirmed** the blocking (R1-incomplete: 8 docstrings); low pac-man-header precision deferred |
| 6 | reviewer-type-design | No | Skipped | disabled | Covered by rule-checker (`unknown[]` annotation r7 resolved) |
| 7 | reviewer-security | No | Skipped | disabled | N/A — test/tooling code |
| 8 | reviewer-simplifier | No | Skipped | disabled | Covered — dead `.flat()` (r6) resolved |
| 9 | reviewer-rule-checker | Yes | clean | 0 (5/5 round-1 findings resolved, 0 new violations) | N/A |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled and covered by the Reviewer directly)
**Total findings:** 1 confirmed blocking (R6 below), 1 low deferred, 0 new functional issues

## Reviewer Assessment (Round 2 — REJECTED, superseded by Round 3 below)

**Verdict: REJECTED (round 2) — ONE surgical finding, then re-approve. Everything else is resolved and independently verified.**

The rework is excellent: **all five required and both recommended round-1 findings are genuinely fixed**, and I re-verified the load-bearing ones with my own mutation battery — dropping `|| isByteCitation` reddens exactly the new byte-acceptance test (defender & millipede), dropping `|| isBinaryCitation` reddens exactly the nibble test (pac-man), and relaxing `isCitation`'s verbatim clause reddens exactly the new partial-source test. `[TEST]` reviewer-test-analyzer and `[RULE]` reviewer-rule-checker both independently mutation-confirmed the same; preflight is GREEN (3418 tests, lint 0, no dead code).

**REQUIRED (the one blocker) — R6 `[DOC]` — R1 is only HALF fixed.** `[DOC]` reviewer-comment-analyzer caught, and I verified by grep, that the exact R1 falsehood the rework removed from the four `loadClaims` comments **survives verbatim in 8 more docstrings** — the JSDoc directly on the `isValidClaimSource` export in every `check-citations.mjs` AND `.d.mts`:
- `.mjs` (4): centipede:294, millipede:290, defender:294, pac-man:324 — "…gate its load boundary with the **SAME predicate checkClaims uses, keeping the two from drifting**."
- `.d.mts` (4): defender:77, millipede:73, centipede:100, pac-man:129 — "…the **same predicate checkClaims applies, so the two cannot drift**."

`checkClaims` never calls `isValidClaimSource` (verified: it dispatches on `isCitation`/`isByteCitation`/`isBinaryCitation` directly) — so these are the identical false mechanism-claim R1 required removing, and the `.d.mts` copies sit on the **public type-declaration surface**. In an epic whose whole premise is that a checker's stated claims must be true, shipping this right after requiring the same comment be made truthful is inconsistent. **Fix:** reword all 8 to match the corrected `loadClaims` wording — e.g. "True when `source` is a citation shape this checker accepts. `loadClaims` uses this at the load boundary; it is composed from the SAME guard functions (`isCitation`/`isByteCitation`/…) that `checkClaims` dispatches on — not called BY `checkClaims` — so the two stay aligned while those guards remain the single definition." (Same reword ×8; no code change; lint/tests already green so re-verify should be instant.)

**DEFERRED (low, optional) — pac-man header precision `[DOC]`.** `plugins/pac-man/tests/audit/load-claims-hardening.test.ts:15` lists the composed guards as "isCitation/isByteCitation/…"; the "…" does cover pac-man's `isBinaryCitation`, so it is not wrong, just imprecise for the one three-shape game. Nice-to-have alongside R6, not required.

**No other findings.** No new functional defects; the four test files' deliberate divergence-by-shape is correct and documented; `noUnusedLocals` is clean (no orphan `GOOD_BYTE_CLAIM`/`GOOD_NIBBLE_CLAIM`). The out-of-scope `as unknown as { checkClaims }` sibling casts (from GREEN `9d8e9c0f`, dismissed round 1) remain dismissed. The joust follow-up (`citations.test.ts:641`) is still routed to SM (df1-8), untouched.

### Rule Compliance (Round 2)

Round-2 rubric focus: verify the round-1 fixes against `.pennyfarthing/gates/lang-review/typescript.md` and scan for new violations. `[RULE]` reviewer-rule-checker ran all five targeted checks + a new-violation sweep (lint 0, `noUnusedLocals` clean, 2920 tests green).

- **#1 Type-safety escapes:** R3 (dead RED cast) REMOVED in all 4 test files ✓; r7 `const entries: unknown[]` added ✓ (stops `Array.isArray`→`any[]`).
- **#8 Test quality:** R3 return-type mismatch gone (tests call typed `loadClaims`) ✓; R2/R5/r7 add positive/edge coverage, each mutation-backed ✓.
- **#11 Error handling:** R4 — all 4 catch blocks narrow `e instanceof Error ? e.message : String(e)` ✓.
- **#17 Comments/docs asserting an unrehearsed mechanism:** R1 fixed in `loadClaims` ✓ **BUT VIOLATION REMAINS** in the 8 `isValidClaimSource` docstrings → **R6 above** (the one blocker).
- **#31 Dead code:** r6 — trailing `.flat()` removed in all 4 ✓.
- No new violations introduced by the rework (verified).
### Dev Rework — Round 2 (commit `a82c1878`)

- **R6 `[DOC]` DONE (the round-2 blocker)** — reworded all 8 `isValidClaimSource` docstrings that still carried the R1 falsehood: 4 `check-citations.mjs` + 4 `check-citations.d.mts`. New wording is **guard-name-free** so it is accurate for every game regardless of shape set (centipede text-only, pac-man three-shape): "…composed from the same source-shape guards checkClaims dispatches on — it is NOT called by checkClaims — so the two stay aligned while those guards remain the single definition." Verified: `grep` for "same predicate"/"cannot drift"/"keeping the two from drifting" across all 8 files → **zero hits**; checkClaims still never calls isValidClaimSource.
- **Deferred low-conf item DONE** — pac-man's `loadClaims` comment now spells out its three guards `(isCitation/isBinaryCitation/isByteCitation — pac-man has all three)` instead of the `…`.
- **Verification:** comment-only change; **full vitest 16160 pass, 1 todo, 0 fail; orchestrator 498 pass; lint 0.** No code changed, so all round-2 mutation-verified test teeth are unaffected.
---

## Subagent Results

Review Round 3 (comment-only fix verification, commit `a82c1878`). The round-3 delta (`8322b655..HEAD`) is **purely comment/docstring text** — I confirmed zero non-comment `+/-` lines — so the test-logic and type/rule surfaces are unchanged and round-2's CLEAN `[TEST]`/`[RULE]` verdicts carry forward legitimately. The two specialists whose domain the change touches were re-dispatched fresh.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (r3) | clean | none (GREEN: 3019 tests, lint 0; diff confirmed comment-only) | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — comment-only change |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — comment-only change |
| 4 | reviewer-test-analyzer | Yes (r2 carried fwd) | clean | none | Round-2 CLEAN; round-3 delta touches no test surface |
| 5 | reviewer-comment-analyzer | Yes (r3) | clean | none | **R6 confirmed resolved** — all 8 docstrings accurate, checkClaims verified to never call isValidClaimSource |
| 6 | reviewer-type-design | No | Skipped | disabled | Covered by rule-checker (r2) — no type surface changed |
| 7 | reviewer-security | No | Skipped | disabled | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — comment-only change |
| 9 | reviewer-rule-checker | Yes (r2 carried fwd) | clean | none | Round-2 5/5 resolved + 0 new; round-3 delta touches no code/rule surface |

**All received:** Yes (2 re-dispatched fresh for round 3; 2 carried forward from round-2 CLEAN since the delta is comment-only; 5 disabled)
**Total findings:** 0 — all round-1 and round-2 findings resolved and verified

## Reviewer Assessment

**Verdict: APPROVED.**

Every finding across three rounds is resolved and independently verified. `[DOC]` reviewer-comment-analyzer round 3 is CLEAN — the round-2 blocker (R6: eight `isValidClaimSource` docstrings carrying R1's false "same predicate checkClaims uses / cannot drift" claim) is fully fixed; I also confirmed by grep that the overclaim has **zero** hits across all 8 `.mjs`/`.d.mts` files and that `checkClaims` never calls `isValidClaimSource`, so the new "composed from the same source-shape guards checkClaims dispatches on — not called by checkClaims" wording is factually true. `[RULE]`/`[TEST]` verdicts carry forward from round-2 CLEAN because the round-3 delta is comment-only (verified: no non-comment `+/-` lines).

**What ships (df1-6, four games — defender, millipede, centipede, pac-man):** `loadClaims` gains an optional `dir` arg (production callers unchanged), wraps each file's `JSON.parse` in a try/catch that rethrows a controlled error **naming the offending file** (half 1), and validates every entry's `source` via `isValidClaimSource` — a per-game export composed from that game's own citation-shape guards (half 2). Both halves close the story on one load path.

**Verification I ran myself (not just subagent trust):**
- Mutation battery (all restored clean): dropping the filename from the throw fails exactly the 2 filename tests; neutering `isValidClaimSource`→`true` fails exactly the 2 wrong-shape tests; removing the try/catch fails the malformed tests; dropping `|| isByteCitation` fails exactly the byte-acceptance test (defender & millipede); dropping `|| isBinaryCitation` fails exactly the nibble test (pac-man); relaxing `isCitation`'s verbatim clause fails exactly the partial-source test.
- Full suite green THIS round: **3019 tests across the four games + orchestrator (498), lint 0**; earlier full-fleet run at rework r2 was **16160 vitest + 498 orchestrator, 0 fail**.

**Rounds:** R1 (comment truth), R2 (byte/nibble acceptance untested), R3 (vestigial RED cast), R4 (catch narrowing), R5 (test-4 rename + partial-source) + r6 (dead `.flat()`) + r7 (`unknown[]` + single-object test) — all fixed in rework r1. R6 (R1 incomplete on 8 public docstrings) — fixed in rework r2. Two findings correctly **challenged/dismissed** (validating id/claim would break pac-man's schema; the 5 sibling `as unknown as` casts are necessary).

**ROUTED TO SM (out of scope — file before/at finish):** `plugins/joust/tests/audit/citations.test.ts:641` has an inline `loadClaims` with the identical unhardened `JSON.parse(...) as Claim | Claim[]` pattern (joust/mc *helpers* are already hardened via `asClaim`). **Suggest filing df1-8** to harden it. This is the only fleet residue; it is deliberately not fixed here (df1-6 is scoped to the four dossier-sweep loaders).

**Merge readiness:** branch `feat/df1-6-harden-claims-json-load-path` at `a82c1878`, gitflow → PR into `develop`.

### Rule Compliance

Rubric `.pennyfarthing/gates/lang-review/typescript.md`. Final state after three rounds (round-3 delta comment-only; `[RULE]` reviewer-rule-checker round-2 verified all code checks, comment-analyzer round-3 verified the doc checks):

- **#1 Type-safety escapes:** COMPLIANT — vestigial RED cast removed (R3); `entries: unknown[]` annotated (r7); the 5 sibling `as unknown as` casts are verified-necessary and dismissed.
- **#8 Test quality:** COMPLIANT — tests call the typed `loadClaims`; byte/nibble/partial-source/single-object coverage added, each mutation-backed (R2/R5/r7).
- **#10 Type-level input validation:** COMPLIANT — `JSON.parse` typed `unknown`, gated by `isValidClaimSource`, replacing the `as Claim | Claim[]` this story removed. Source-only validation is the deliberate scope (id/claim unvalidatable fleet-wide — pac-man claims lack `claim`).
- **#11 Error handling:** COMPLIANT — catch narrows `e instanceof Error ? … : String(e)`; rethrow names the file (R4).
- **#17 Comments/docs asserting an unrehearsed mechanism:** COMPLIANT — R1 fixed in `loadClaims` (r1) AND in all 8 `isValidClaimSource` docstrings (r2, R6); verified zero overclaim hits.
- **#31 Dead code:** COMPLIANT — trailing `.flat()` removed (r6).
- No open violations.