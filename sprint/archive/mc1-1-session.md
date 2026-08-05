---
story_id: "mc1-1"
jira_key: "mc1-1"
epic: "mc1"
workflow: "tdd"
---
# Story mc1-1: Scaffold the missile-command plugin and boot it in the cabinet

## Story Details
- **ID:** mc1-1
- **Jira Key:** mc1-1
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-05T23:36:28Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-05T23:01:37.882658Z | 2026-08-05T23:03:29Z | 1m 51s |
| red | 2026-08-05T23:03:29Z | 2026-08-05T23:13:35Z | 10m 6s |
| green | 2026-08-05T23:13:35Z | 2026-08-05T23:23:32Z | 9m 57s |
| review | 2026-08-05T23:23:32Z | 2026-08-05T23:31:11Z | 7m 39s |
| green | 2026-08-05T23:31:11Z | 2026-08-05T23:34:19Z | 3m 8s |
| review | 2026-08-05T23:34:19Z | 2026-08-05T23:36:28Z | 2m 9s |
| finish | 2026-08-05T23:36:28Z | - | - |

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.**

First story of a brand-new game (Missile Command, the eighth arcade plugin). No prior `plugins/missile-command/` code exists; the Architect has staged reference source + docs under `plugins/missile-command/{reference,docs}` (uncommitted, in the working tree).

- **Scope:** scaffold `plugins/missile-command/` by copying `plugins/joust/` and stripping to a bootable black-canvas skeleton, do the three registrations (justfile `games`, vitest.config `GAMES`, `npm run gen:registry`), and stand up the core/shell purity boundary. No gameplay — field/cursor/fire are mc1-2..mc1-4.
- **Authoritative spec:** the 5 acceptance criteria + description in `sprint/epic-mc1.yaml` (mc1-1), carried into `sprint/context/context-story-mc1-1.md`.
- **Must-read for TEA/Dev:** `plugins/missile-command/docs/design/mc1-skeleton.md` (core/shell decomposition + skeleton acceptance) and `docs/rom-study/brief.md` (cited constants).
- **Serve trap (test design):** `tests/canonical-serve.test.mjs` — the one dev server answers `200` to everything via the lobby SPA fallback, so the boot assertion MUST compare `/missile-command/` against a nonsense control (e.g. `/banana/`) and assert they DIFFER, not that both are `200`.
- **Branch:** none

**Handoff:** Han Solo (TEA) — write the failing tests for the five ACs (boot-distinct, four-file shape, three registrations, purity boundary, gates green).

## Tea Assessment

**RED established — routing to Yoda (Dev) for GREEN.**

Missile Command is the eighth game and a raster title; the fleet's two-layer game-scaffold pattern applies unchanged. Tests written (all mirror the joust sibling):

1. **`tests/missile-command-bootstrap.test.mjs`** (node:test — orchestrator wiring). Pins the three registrations + the four-file shape + the registry entry. **Verified RED now** via `node --test`: 6 tests, 5 fail on exactly the missing pieces (justfile `games`, vitest `GAMES`, registry entry, the four files, plugin.ts meta), 1 passes — the "does not regress the existing seven games" anti-vacuity anchor, which is correct to be green now and must stay green.
2. **`plugins/missile-command/tests/scaffold.test.ts`** (vitest — `missile-command` project). Four-file shape, tsconfig strict-inheritance walk (stub must not mention `strict`), `package.json` three-field stub, `plugin.ts` meta, `index.html` boots a canvas via `/src/main.ts`, and the `src/core` + `src/shell` skeleton.
3. **`plugins/missile-command/tests/purity.test.ts`** (vitest) + **`tests/helpers/purity-scanner.ts`** (byte-identical copy of joust's hardened AST scanner). Fixture teeth self-tests (clock/entropy/globals/scheduling/surface-types/shell-import/evasion forms, plus the comment/string non-matches) and the `src/core/` sweep, whose "non-empty core" teeth fail until GREEN lands the skeleton.

**Project-level RED (layer 2):** `npx vitest run --project missile-command` → "No projects matched the filter" — the plugin-internal tests cannot run until Dev adds `missile-command` to `vitest.config.ts` `GAMES`. That registration is AC2 GREEN work; once done, scaffold + purity run and must pass.

**Pre-existing red (not mine):** the Architect staged `plugins/missile-command/{reference,docs}`, so the dir already exists without a `plugin.ts` — `tests/registry.test.mjs` ("expected seven games") and `monorepo-topology`'s "exactly seven" anchor are already red. These are the fleet's self-triggering "adding a game" invariants; Dev's GREEN turns them green (they must be updated to eight, and `gen:registry` regenerated).

### ⚠ Design correction folded into the tests — `order: 8`, not 7
The design doc (`mc1-skeleton.md`) and the story context both specify `order: 7`, but **red-baron already owns order 7** (orders 1..7 = tempest, star-wars, asteroids, battlezone, centipede, joust, red-baron). The next free lobby slot is **8**. All three test files pin `order: 8`. Logged as a Design Deviation below; Dev must scaffold `plugin.ts` with order 8.

### Rule Coverage
- **Core/shell purity boundary** (the load-bearing project rule): covered by `purity.test.ts` — fixture teeth prove the scanner bites, and the `src/core` sweep enforces it on every module forever.
- **Desktop-only** (repo rule): not exercised at the skeleton stage (no input yet); belongs to mc1-3.
- **No hardcoded version** (sibling convention): `scaffold.test.ts` asserts `plugin.ts` imports `version` from `package.json` rather than a literal.
- **Serve-distinct / no all-200 sweep** (canonical-serve contract): covered by the existing `tests/canonical-serve.test.mjs`, which reads `plugins/` live and asserts every game path DIFFERS from the `/banana/` control — auto-covers missile-command once it serves its own `index.html`. No new test needed; noted so Dev knows the boot AC is already guarded.

**Note on commits:** the RED tests are in the working tree, uncommitted, alongside the Architect's staged reference/docs and the SM sprint YAML — the whole missile-command bootstrap is one reviewable, as-yet-uncommitted unit for the user. Verified RED by direct run, recorded above.

**Handoff:** Yoda (Dev) — copy `plugins/joust/` to scaffold, add the three registrations (justfile `games`, vitest `GAMES`, `npm run gen:registry`), build the four files + minimal `src/core`+`src/shell` black-canvas boot, and update the two "seven games" anchors to eight. Use `order: 8`. Make all of the above green.

## Dev Assessment

**GREEN — implementation complete, routing to verify/review.**

Scaffolded `plugins/missile-command/` from the joust raster shape: `.gitignore`,
`index.html`, `package.json`, `tsconfig.json`, `plugin.ts`, and a minimal
`src/core/game.ts` (pure `createGame`/`stepGame`) + `src/shell/render.ts` +
`src/main.ts` that boots a black canvas over the stepped core. Three registrations
done; registry regenerated (8 games, 7 listed). Committed as `86bad1a` (green) on top
of `973b27d` (TEA red).

### AC accountability
| AC | Status | Evidence |
|----|--------|----------|
| 1 — four-file shape + "adding a game" invariants | **DONE** | `plugins/missile-command/{index.html,plugin.ts,package.json,tsconfig.json}`; `scaffold.test.ts` (10 tests) + `registry.test.mjs` + `monorepo-topology.test.mjs` green. |
| 2 — three registrations, no more | **DONE** | justfile `games` += missile-command; vitest `GAMES` += 'missile-command'; `npm run gen:registry` → registry.ts (verified `--check` agrees). build-app/deploy read `plugins/` directly — untouched. |
| 3 — boots distinct from lobby fallback | **DONE** | `canonical-serve.test.mjs` "every game path DIFFERS from the nonsense control" green — `/missile-command/` serves its own `index.html` (title "Missile Command"), body hash ≠ `/banana/`. |
| 4 — core/shell purity boundary | **DONE** | `src/core/` + `src/shell/` exist; `purity.test.ts` (12 tests incl. the non-empty `src/core` sweep) green — `game.ts` is clean. Scanner byte-identical to joust's. |
| 5 — gates green | **DONE** (1 pre-existing red, not mine) | `npx vitest run --project missile-command` → 22/22. `npm run lint` clean. `npm run test:orchestrator` → **397/398**; the single fail is pre-existing (below). |

### Pre-existing red (NOT mc1-1 — do not attribute)
`tests/sprint-repo-routing.test.mjs:60` fails on `sprint/epic-jt9.yaml:1016` → `repos: arcade (.)` — a malformed repos value in jt9-46 (a completed story). Verified against HEAD: `git show HEAD:sprint/epic-jt9.yaml` already contains `arcade (.)`, and none of that test's inputs (epic-jt9.yaml, the test, `.pennyfarthing/repos.yaml`, the helper) are touched by this story. It was red on `main` before this session. Out of mc1-1 scope; should be filed as its own one-line fix (`arcade (.)` → `arcade`).

### Anchors bumped seven → eight (part of "adding a game")
`registry.test.mjs` (dir count 7→8, id list, `--check` message `7 games (6 listed)`→`8 (7)`), `monorepo-topology.test.mjs` (`GAMES`, the "exactly seven" title, the dev-tool `EXPECTED` map += `'missile-command': []`), `release.test.mjs` (app count 8→9, since it includes the lobby).

### Deviations honored / added
- **order 8** (TEA's design deviation): `plugin.ts` ships `order: 8`; registry confirms. Honored, not re-litigated.
- **reference/ gitignored** (Dev scaffold decision): `plugins/missile-command/.gitignore` excludes `reference/`, matching the joust convention and the CLAUDE.md copyright wall — the raw Atari WW3 source stays local and is never committed/pushed. The cited dossier under `docs/rom-study/` IS committed. Logged below.

**Handoff:** verify/review — the black-canvas skeleton is proven server-side; a live screenshot of a black field adds little, but the dev server serves `/missile-command/` and `main.ts` transforms cleanly (canonical-serve spins the real Vite server). Gameplay (field, cursor, ABM) is mc1-2..mc1-4.

### Dev Rework (round 1 — addressing Reviewer REJECT)

Committed `ebe8734`. All findings resolved:
- **[RULE][MEDIUM] render.ts geometry constants** → FIXED by deletion. `LOGICAL_WIDTH/HEIGHT` and the self-contradicting comment removed; a comment now records that visible geometry is deferred to mc1-2 (brief.md O-5). Confirmed no `LOGICAL_` references remain anywhere. render.ts stays a valid shell module (`clearField`/`drawFrame`).
- **[DOC] purity-scanner.ts header** → FIXED. Prepended a missile-command provenance note (verbatim port of joust's jt1-7 scanner, logic unchanged) and corrected the `purity-scanner.test.ts` reference (joust-only). `purity.test.ts` prose updated "byte-identical" → "ported verbatim (logic unchanged)".
- **[DOC] design doc order** → FIXED. `mc1-skeleton.md:82` now `order: 8` with a reconciliation note.

Re-verified: `npm run lint` clean, `npx vitest run --project missile-command` 22/22. Orchestrator invariants untouched (no registration/test-anchor changed this round), so it remains 397/398 (the pre-existing jt9 red). Routing back to Obi-Wan for the re-review spot-check.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — gates verified: vitest 22/22, lint clean, orchestrator 397/398; pre-existing jt9 red independently CONFIRMED (predates mc1-1) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A — copyright wall verified, no secrets, no XSS |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 (3 angles) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned, 5 disabled via settings)
**Total findings:** 2 distinct confirmed (1 substantive + 1 doc cluster), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict: APPROVED (round 2, after rework `ebe8734`).** Round 1 was REJECTED for one rule-matching finding + a doc cluster; all are now resolved (see Re-review below). The full round-1 analysis is retained beneath for the audit trail.

### Re-review (round 2 — spot-check)
The rework touched only the flagged items (deleted the geometry constants; edited three comment/doc lines) — it did not alter the surface the round-1 panel verified clean (purity boundary, type safety, security, four-file shape, the 7→8 anchors), so that coverage stands; I directly re-verified the changed surface:
- **[RESOLVED] render.ts geometry constants** — `grep` confirms no `LOGICAL_`/`231`/`VBLANK 24` remain in `src/`; the uncited/self-contradicting/dead constants are gone, geometry deferred to mc1-2 with a pointer to brief.md O-5.
- **[RESOLVED] purity-scanner.ts header** — now opens with a "PORTED VERBATIM into missile-command" note and states it does not carry joust's `purity-scanner.test.ts`; `purity.test.ts` prose reconciled.
- **[RESOLVED] design doc order** — `mc1-skeleton.md:82` now `order: 8` with a reconciliation note.
- **[VERIFIED] no regression** — `npm run lint` clean, `npx vitest run --project missile-command` 22/22, `npm run test:orchestrator` 397/398 (unchanged — the one red is the pre-existing jt9 `arcade (.)` typo, still not mc1-1's).

All acceptance criteria met; the eighth cabinet boots and is wired into the fleet. Ships.

---
_Round-1 analysis (verdict was REJECTED):_

**Original verdict: REJECTED — one small, rule-matching rework, then this ships.**

This is a clean, well-executed scaffold: the joust raster shape faithfully mirrored, the copyright wall correctly enforced (reference/ gitignored, nothing tracked, docs cite only), all TypeScript-safety mechanics green, and the core/shell purity boundary real and mechanically enforced. No Critical/High. The one thing standing between this and merge is a self-contradicting, uncited constant that the epic's own guardrail forbids — and the fix is a deletion.

### Findings

- **[RULE][MEDIUM] `render.ts` ships an uncited, self-contradicting, UNUSED geometry constant** — `plugins/missile-command/src/shell/render.ts:9-14`. `LOGICAL_HEIGHT = 231` but the adjacent comment's own arithmetic (`VTOTAL 256 − VBLANK 24 = 232`) yields 232, and `LOGICAL_WIDTH = 256` is not derivable from the cited `HTOTAL 320` (no HBLANK figure given). Confirmed by both rule-checker (#17 mechanism-nobody-re-ran, #20 quantity-from-same-diff, #29 radix/citation-soundness) and comment-analyzer. This directly violates the epic's stated guardrail ("no magic number faithful to nothing, even under skeleton-first" — `context-epic-mc1`) — so it cannot be dismissed. Compounding it: `LOGICAL_WIDTH`/`LOGICAL_HEIGHT` are **exported but never imported** (main.ts sizes the canvas from `clientWidth/clientHeight`), so they are dead code today. **Fix: delete both constants and the geometry comment.** The exact visible geometry is an open question (`brief.md` O-5) that belongs to mc1-2 (the field-draw story), which will introduce real, cited values. Deleting now removes the guardrail violation AND the dead export in one stroke; `clearField`/`drawFrame` keep `render.ts` a valid shell module.

- **[DOC][LOW] copied `purity-scanner.ts` header + design-doc order cluster** (comment-analyzer) — fold into the same rework since Dev is already touching the tree:
  1. `plugins/missile-command/tests/helpers/purity-scanner.ts:4` — header says the scanner is shared by `tests/purity-scanner.test.ts`, which does not exist in this game (joust-only companion). Correct the sentence, or add the pinning test.
  2. same file, `:1-3` — the `jt1-7 (GREEN, Julia)` provenance is joust's; add a one-line "ported verbatim from plugins/joust/…; see jt1-7 for rationale" so a reader of this file in isolation isn't misled.
  3. `plugins/missile-command/docs/design/mc1-skeleton.md:82` — still shows `order: 7`; the design doc is "handed verbatim to later agents", so reconcile it to `8` (or add a pointer to the Design Deviation) to prevent a future agent scaffolding the wrong order.

### Rule Compliance (lang-review typescript + project rules)
Exhaustively checked by rule-checker across 30 rules / 61 instances; I confirm the load-bearing ones against the diff:
- **[VERIFIED] `.js` extensions on all relative ESM imports** — main.ts:9-10, render.ts:7 (`import type`), purity.test.ts:30. Complies with rule #5; lint (NodeNext) would have failed otherwise.
- **[VERIFIED] no type-safety escapes** — no `as any`/`as unknown`/`@ts-ignore`; canvas & context narrowed via `if (!x) throw` (main.ts:12-15), not `!`. Complies with rule #1.
- **[VERIFIED] core/shell purity** — `src/core/game.ts` has no clock/entropy/browser-global/shell-import; enforced mechanically by `purity.test.ts`'s src/core sweep (not just asserted). Complies with the project's #1 rule.
- **[VERIFIED] `readonly GameState.frame`** (game.ts:14), version-from-package.json (plugin.ts), four-file shape + `extends ../../tsconfig.json`. Compliant.
- **[VERIFIED] anchor edits preserve exactness** — registry (count 8 + exact id deepEqual), monorepo-topology (GAMES deepEqual anti-vacuity anchor intact, dev-tool count still 4), release (=== 9). Bumping 7→8 weakened no invariant.
- **[SEC][VERIFIED] copyright wall + no secrets + no injection** — security subagent returned CLEAN, corroborated directly: `git ls-files plugins/missile-command/reference/` empty; `.gitignore` ignores `reference/`; committed docs cite paths/lines only; no credentials anywhere; `main.ts`/`render.ts` reach no DOM-string/`innerHTML` sink (canvas primitives + hardcoded literals only). Complies with CLAUDE.md licence wall.

### Devil's Advocate
Could this be broken? The skeleton boots a black canvas and steps a pure counter — the attack surface is nearly nil, but I pushed on it. **Malicious/confused input:** there is none — no network, no user strings reach any sink (security subagent confirmed no innerHTML/injection). **Stressed environment:** if `#game` is missing or 2D context is unavailable, main.ts throws with a clear message rather than silently no-op'ing — correct. A zero-width/hidden canvas sets `width=0` and `fillRect(0,0,0,0)` degrades harmlessly; no division or aspect math exists yet to divide-by-zero (rule-checker #21 watch-item for mc1-2, not a bug now). **Determinism:** `createGame`/`stepGame` are referentially transparent; the frame counter grows unbounded but never overflows in any real session and is never used as an array index. **The real risk is the one the finding names:** the render story (mc1-2) inherits `render.ts` and could treat `LOGICAL_WIDTH/HEIGHT = 256/231` as ground truth — that is precisely how an uncited "faithful to nothing" constant hardens into the codebase, the exact failure the epic guardrail exists to prevent. That is why it is a fix-now, not a defer. **What a stressed filesystem produces:** the tests read real files (`existsSync`-guarded in purity.test.ts:104), so a missing dir fails loudly, not vacuously. Nothing else surfaced.

**Decision:** Hand back to Dorik/Yoda (Dev) for the green-phase rework above. Everything else is approved; re-review is a spot-check of `render.ts` + the three doc lines.

## Delivery Findings

No upstream findings

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Deviation:** `plugin.ts` / registry `order` is **8**, not the 7 the design specifies.
  - **Spec source:** `plugins/missile-command/docs/design/mc1-skeleton.md` (plugin.ts meta block) and `sprint/context/context-story-mc1-1.md` line 22.
  - **Spec text (quoted):** "order: 7,              // ..." and "plugin.ts meta per design: id 'missile-command', title 'MISSILE COMMAND', year 1980, order 7, listed true, showcase false".
  - **Actual (in tests):** `order: 8`. Pinned by `tests/missile-command-bootstrap.test.mjs`, `plugins/missile-command/tests/scaffold.test.ts`.
  - **Why:** `src/host/registry.ts` shows orders 1..7 already assigned — tempest 1, star-wars 2, asteroids 3, battlezone 4, centipede 5, joust 6, **red-baron 7**. Order 7 collides; the lobby renders games by `order`, so two 7s would make ordering ambiguous. 8 is the next free slot.
  - **Forward impact:** the lobby carousel and any `order`-sorted list place missile-command last (correct for the newest cabinet). No sibling story depends on order 7. The design doc and story context should be corrected to 8 (cosmetic; tests are authoritative).

### Dev (implementation)

- **Deviation:** the raw vendored Atari source under `plugins/missile-command/reference/` is gitignored, not committed.
  - **Spec source:** `plugins/missile-command/reference/PROVENANCE.md` (Architect) — describes `reference/source/` as "durable ground truth" vendored into the repo.
  - **Spec text (quoted):** "Vendored: 2026-08-05. Files under `source/` are LF-normalized working copies ... Never edit them; they are read-only ground truth."
  - **Actual:** `plugins/missile-command/.gitignore` ignores `reference/`; the source is present locally but not tracked. `docs/rom-study/brief.md` (the cited extraction) IS committed.
  - **Why:** matches the fleet convention (`plugins/joust/.gitignore` ignores `reference/` verbatim) and the CLAUDE.md licence wall — original Atari source is copyright and "cited externally", never copied into the committed tree. The dossier is the durable, shareable artifact; the raw source is a local quarry.
  - **Forward impact:** later mc-epic stories cite `docs/rom-study/` (committed) for constants; anyone reproducing must re-vendor `reference/` locally from historicalsource `bab468c`. PROVENANCE.md records the SHA. No behavioural impact.

### Reviewer (deviation audit)

- **order 7 → 8** → ✓ ACCEPTED: red-baron owns order 7 (registry verified); 8 is the only correct free slot. Sound, consistent across plugin.ts / tests / registry.
- **reference/ gitignored** → ✓ ACCEPTED: matches the fleet convention (joust) and the CLAUDE.md copyright wall; verified `git ls-files` returns nothing under reference/. Correct call. Note for the record: PROVENANCE.md lives under the now-gitignored `reference/`, so it is not committed — the durable citation record is `docs/rom-study/brief.md` (committed), which is sufficient; no action required.