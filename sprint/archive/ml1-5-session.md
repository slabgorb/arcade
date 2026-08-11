---
story_id: "ml1-5"
jira_key: "ml1-5"
epic: "ml1"
workflow: "tdd"
---
# Story ml1-5: Millipede scaffold boot

## Story Details
- **ID:** ml1-5
- **Jira Key:** ml1-5
- **Branch:** feat/ml1-5-millipede-scaffold-boot
- **PR:** https://github.com/slabgorb/arcade/pull/261
- **Workflow:** tdd
- **Repos:** arcade
- **Branch Strategy:** gitflow (feat/ml1-5-millipede-scaffold-boot)
- **Stack Parent:** none

## Background

This is the first Millipede story to execute. The epic ml1 produces the ROM-source dossier and 
boot-stable scaffold; ml1-5 creates the scaffold itself, enabling ml1-1 (citation gate + purity 
test) to resume afterward.

**Premise verification (per SM — all TRUE):**
- `plugins/joust/{index.html,plugin.ts,package.json,tsconfig.json}` all exist (copy source)
- `justfile:19` lists nine games, no millipede yet
- `vitest.config.ts` `GAMES` = nine games, no millipede yet
- `scripts/gen-registry.mjs` reads `plugins/` directory and regenerates `src/host/registry.ts`

**CRITICAL premise correction:** The title understates the registration surface. Four hidden 
orchestrator checks will RED the moment `plugins/millipede/` exists:
- `tests/monorepo-topology.test.mjs:96` hardcodes nine-game `GAMES` const; `:104` asserts 
  tsconfig-extends, per-app base-path, and package fields
- `tests/monorepo-topology.test.mjs:104` asserts `plugins/` holds EXACTLY those nine games
- `tests/registry.test.mjs` hardcodes nine-game list
- `tests/joust-bootstrap.test.mjs` is the model for a future `tests/millipede-bootstrap.test.mjs`

GREEN requires updating BOTH orchestrator test lists in addition to the three named registrations, 
else `npm run test:orchestrator` reddens. This is the CLAUDE.md "omitting a registration fails, 
and not at the step you were on" trap.

## Acceptance Criteria

Derived from story title (null in epic YAML):

1. **Four-file scaffold copied from `plugins/joust/`:**
   - `index.html` (Vite entry point)
   - `plugin.ts` (plugin manifest)
   - `package.json` with `{name:"millipede",version,private}`
   - `tsconfig.json` extending `../../tsconfig.json`

2. **Registrations so `plugins/millipede/` is first-class:**
   - Add `millipede` to `justfile:19` `games` line
   - Add `millipede` to `vitest.config.ts` `GAMES` array
   - Run `npm run gen:registry` to regenerate committed `src/host/registry.ts`
   - Update `tests/monorepo-topology.test.mjs:96` `GAMES` const (add millipede)
   - Update `tests/registry.test.mjs` (add millipede to nine-game list)

3. **Green gates:**
   - `npx vitest run --project millipede` passes
   - `npm run lint` (repo-wide tsc) passes
   - Visual boot check at `http://127.0.0.1:5270/millipede/` serves black canvas (compare 
     against nonsense control path; all-200 sweep proves nothing due to lobby SPA fallback)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T22:32:27Z
**Branch:** feat/ml1-5-millipede-scaffold-boot

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T21:39:20.822550+00:00 | 2026-08-11T21:41:33Z | 2m 12s |
| red | 2026-08-11T21:41:33Z | 2026-08-11T21:50:07Z | 8m 34s |
| green | 2026-08-11T21:50:07Z | 2026-08-11T22:20:45Z | 30m 38s |
| review | 2026-08-11T22:20:45Z | 2026-08-11T22:32:27Z | 11m 42s |
| finish | 2026-08-11T22:32:27Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the story title names three registrations, but the full
  registration surface is five hardcoded-nine lists that redden the moment `plugins/millipede/`
  exists — `tests/monorepo-topology.test.mjs:96`, and `tests/registry.test.mjs` at `:33`
  (`dirs.length===9`), `:58` (`--check` banner `9 games (8 listed)`), and `:69` (curated tile
  order). GREEN must update all of them; `npm run test:orchestrator` is the safety net. Affects
  those two files. *Found by TEA during test design.*
- **Improvement** (non-blocking): AC-3's "serve /millipede/ distinct from a nonsense control" is
  already mechanized — `tests/canonical-serve.test.mjs` derives its game set from
  `readdirSync(plugins)`, so it auto-asserts /millipede/ differs from /banana/ once GREEN lands
  the plugin. A black canvas that serves the lobby SPA-fallback bytes reddens there. The VISUAL
  black-canvas check stays a manual verify step (Playwright headless; a 200 proves nothing).
  *Found by TEA during test design.*
- **Question** (non-blocking): `npx vitest run --project millipede` will run ZERO test files at
  ml1-5 (the per-plugin purity/citation tests arrive with the parked ml1-1). `vitest.config.ts`'s
  header says an empty project is fine; if GREEN's vitest version errors on "no test files", drop
  a trivial `plugins/millipede/tests/scaffold.test.ts`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): "adding a game" touches EIGHT roster-coupled edit points, not
  the CLAUDE.md "four files + three registrations". Beyond the three registrations (justfile,
  vitest GAMES, gen:registry) and the two orchestrator guards TEA flagged (monorepo-topology,
  registry.test.mjs), GREEN also had to update `tests/release.test.mjs` (app-count 10→11),
  `src/host/registry.test.ts` (the static `MANIFESTS` import map + curated/listed arrays — this
  one is BY DESIGN a hard failure so the game gets validated), and `lobby/tests/main.test.ts`
  (tile count + hardcoded launch-path list). Confirmed no game-project test couples to the roster
  count (each is directory-isolated). Worth folding into `docs/playbooks/next-sprite-game.md` /
  CLAUDE.md's "Adding a game" so the eleventh game's scaffolder doesn't rediscover it by
  red-suite. *Found by Dev during implementation.*
- **Confirmed** (non-blocking): AC-3's serve-vs-control check is GREEN automatically —
  `tests/canonical-serve.test.mjs` spun the cabinet dev server and verified `/millipede/` serves
  a page distinct from the `/banana/` nonsense control (inside the 478/478 orchestrator pass). The
  black-canvas `main.ts` + black `index.html` body make the visual result trivially correct; a
  Playwright-headless screenshot in verify/review is optional confirmation, not a gate. *Found by
  Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/millipede-bootstrap.test.mjs:165`
  `assert.match(src, /version/, 'plugin.ts meta must carry a version (imported from
  package.json)')` is a bare-keyword guard whose message oversells it. The substring
  `version` also appears in `import { version } from './package.json'`, so the guard
  survives the exact mutant it claims to forbid: hardcoding `version: "9.9.9"` in
  plugin.ts (import left dangling) keeps all 10 tests in that file GREEN
  (mutation-verified live by Reviewer). The property is NOT unguarded — the sibling
  `plugins/millipede/tests/scaffold.test.ts:75` `toMatch(/version,/)` reddens on that
  same mutant (verified), and `gen:registry --check` would flag the resulting
  registry drift. Fix: scope :165 like its sibling (`/version,/`) or drop the weaker
  redundant assertion. Affects `tests/millipede-bootstrap.test.mjs`
  (tighten one assertion). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Concretized the silent meta fields the derived ACs left open.**
  - Spec source: context-story-ml1-5.md, AC-1/AC-2 (derived from title; epic YAML AC = null)
  - Spec text: "copy plugins/joust/ … plugin.ts … npm run gen:registry"
  - Implementation: the RED test pins `order: 10` (pac-man owns 9 — derived from the current
    registry, per the mc1-1 "order 7 was taken" trap), `title: 'MILLIPEDE'`, `year: 1982`
    (Ed Logg, Sept 1982), `listed: true` (every native-game scaffold — mc/pac-man/joust — is
    listed:true from its scaffold story), and `showcase` NOT true (a black-canvas scaffold cannot
    boot into a live self-playing demo, so `showcase:true` would redden
    `tests/showcase-liveness.test.mjs` — the one value a blind joust copy would get wrong).
    color/controls left unpinned (GREEN's cosmetic call; millipede's real input is the dossier's
    open question OQ-4).
  - Rationale: the title says "copy joust," but joust is `showcase:true` and would fail the
    liveness gate; the meta must be derived from millipede's actual (non-self-playing) state.
  - Severity: minor
  - Forward impact: if the owner prefers millipede hidden from the lobby until playable (like
    red-baron, `listed:false`), flip `listed` — the test asserts `listed:true` and would need the
    matching edit. Flagged for Reviewer.

### Dev (implementation)
- **Chose placeholder colour + controls for the meta.**
  - Spec source: context-story-ml1-5.md, AC-1 (plugin.ts meta); TEA left color/controls unpinned.
  - Spec text: "copy plugins/joust/ … plugin.ts"
  - Implementation: `color: '#7ac142'` (a green distinct from centipede's `#2aa358`), `controls:
    ['Mouse / Trackball']`. validateMeta requires a hex colour and a non-empty controls array, so
    neither can be omitted.
  - Rationale: both are cosmetic and provisional — millipede's authentic input (trackball vs
    joystick) is dossier open question OQ-4, and the lobby-tile colour is a design choice a later
    presentation story (ml7) can tune. Placeholders keep the manifest valid without pre-empting
    that work.
  - Severity: minor
  - Forward impact: a later ml* story may retune both; no test pins their VALUES (only presence).
- **Added `plugins/millipede/tests/scaffold.test.ts` (a test) during GREEN.**
  - Spec source: TEA Delivery Finding (Question) — `--project millipede` runs zero files and exits
    non-zero without at least one test.
  - Spec text: "drop a trivial plugins/millipede/tests/scaffold.test.ts"
  - Implementation: a lean, non-vacuous plugin-internal scaffold suite (10 tests) — the four-file
    shape, tsconfig strict-inheritance, index.html→main.ts mount, package + meta. It is the
    plugin-internal complement to the orchestrator `tests/millipede-bootstrap.test.mjs`, the same
    two-runner split every native game uses.
  - Rationale: Dev normally writes no tests, but AC-3's `npx vitest run --project millipede` gate
    is unsatisfiable without one, and TEA explicitly authorized it. The per-plugin purity/citation
    tests still belong to the parked ml1-1.
  - Severity: minor
  - Forward impact: ml1-1 adds `purity.test.ts` + `citations.test.ts` alongside it.

### Reviewer (audit)
- **TEA — Concretized the silent meta fields (order 10 / title / year / listed:true /
  showcase not-true)** → ✓ ACCEPTED by Reviewer: the derivations are all correct.
  `showcase:false` verified against the live `showcase-liveness` filter; `order:10`
  verified non-colliding against the generated registry (orders 1–10). On the item TEA
  explicitly flagged for me — `listed:true` vs red-baron's `listed:false` — I ACCEPT
  `listed:true`: it matches the established native-scaffold precedent (missile-command,
  pac-man, joust were all `listed:true` from their scaffold story), it is deliberately
  pinned by the tests, and no production deploy fires from this feature branch. See the
  non-blocking note below for the one downstream consideration.
- **Dev — Placeholder `color:'#7ac142'` + `controls:['Mouse / Trackball']`** → ✓ ACCEPTED
  by Reviewer: `validateMeta` requires both to be present and non-empty, both are cosmetic
  and provisional (OQ-4 / a later presentation story), and no test pins their VALUES —
  only presence. Agrees with author reasoning.
- **Dev — Added `plugins/millipede/tests/scaffold.test.ts` during GREEN** → ✓ ACCEPTED by
  Reviewer: AC-3's `--project millipede` gate is unsatisfiable without ≥1 test file, TEA
  explicitly authorized it, and the suite is lean and non-vacuous (10 real, mutation-live
  assertions). The purity/citation gates correctly stay with the parked ml1-1.
- **Undocumented (Reviewer):** `listed:true` on a not-yet-playable scaffold means the lobby
  will render a MILLIPEDE tile linking to `/millipede/` the next time the LOBBY is
  released — before a `millipede-vX.Y.Z` game deploy exists, that tile would resolve to the
  bucket's SPA fallback rather than the game. This is a deploy-sequencing consideration, not
  a code defect in this scaffold (no deploy fires here), and it matches how the prior native
  scaffolds shipped. Severity: L (non-blocking); recorded so the owner can flip `listed:false`
  if they prefer millipede hidden until it ships, exactly as TEA's forward-impact note offers.

## Sm Assessment

Setup by SM (Ruby Rhod). ml1-5 promoted to first-executed millipede story after ml1-1 was
PARKED (ml1-1's rails need a real `plugins/millipede/`; user ruled scaffold-first, matching the
pac-man pm1 precedent the design cites).

- **Premise verified live:** joust's four scaffold files exist; `justfile:19` and
  `vitest.config.ts` `GAMES` both carry nine games, no millipede. `scripts/gen-registry.mjs`
  reads `plugins/` and writes `src/host/registry.ts`.
- **Registration-surface correction (key):** the title names three registrations, but the
  orchestrator suite hardcodes the nine-game list in TWO more places
  (`tests/monorepo-topology.test.mjs:96`, `tests/registry.test.mjs`) and asserts `plugins/`
  matches it (`:104`). GREEN must update both or `npm run test:orchestrator` reddens. Captured
  in Background + AC-2. `tests/joust-bootstrap.test.mjs` is the RED model.
- **ACs `null` in YAML** → three derived from the title (scaffold / registrations / green gates);
  the green gates include the CLAUDE.md nonsense-control caveat (all-200 sweep proves nothing).
- **Sibling probes clean;** claim pushed on `feat/ml1-5-millipede-scaffold-boot`.

Ready for RED. Next: TEA (Leeloo).

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `tests/millipede-bootstrap.test.mjs` (orchestrator / `node:test`, modeled on
  `tests/missile-command-bootstrap.test.mjs`) — the ORCHESTRATOR-side wiring contract for
  adding millipede as the tenth game. Deliberately creates NO `plugins/millipede/` file, so the
  existing topology/registry suites stay green during RED (they redden only in GREEN's WIP, as
  the safety net).

**Tests Written:** 10 (9 RED drivers + 1 anti-regression guard that passes now and must stay green).
Covers AC-1 (four files + tsconfig-extends + private millipede package) and AC-2 (justfile `games`,
vitest `GAMES`, generated `registry.ts` with pinned meta). AC-3's serve-vs-control is auto-covered
by `tests/canonical-serve.test.mjs`; its visual black-canvas check is a manual verify step.

**Status:** RED (failing — ready for Dev). Verified DIRECTLY (testing-runner confabulates names):
`npm run test:orchestrator` → **478 tests, 469 pass, 9 fail**, and all 9 failures are exactly the
millipede-bootstrap RED drivers — zero collateral, zero pre-existing failures. Each RED message is
feature-shaped ("`games` must include millipede", "scaffold not landed", "order 10 must belong to
millipede alone"), never a harness error.

### Rule Coverage

| Rule source | Applies? | Coverage |
|-------------|----------|----------|
| `gates/lang-review/typescript.md` (validated constructors, non_exhaustive, newtypes, …) | No | This is a registration/config story: the "code" GREEN writes is a declarative `plugin.ts` meta copied from joust + justfile/vitest/registry edits. No constructor/enum/newtype surface. The invariants ARE the registration assertions above. |
| Registry anti-rot (`registry.test.mjs`) | Yes (existing) | GREEN's `gen:registry` output is re-validated by the existing suite; my test pins the millipede-specific meta on top. |
| Anti-vacuity | Yes | Every test asserts a concrete value; anti-regression + order-collision + showcase guards are non-vacuous (verified by the 1-pass/9-fail split). |

**Rules checked:** lang-review TS rules reviewed, none applicable to a scaffold/registration story.
**Self-check:** 0 vacuous tests.

### GREEN checklist (for Korben)
1. Copy `plugins/joust/{index.html,plugin.ts,package.json,tsconfig.json}` → `plugins/millipede/`;
   fill `plugin.ts` meta: `id:'millipede'`, `title:'MILLIPEDE'`, `year:1982`, `order:10`,
   `listed:true`, `showcase:false` (NOT joust's true), version from package.json; add a minimal
   `src/main.ts` that paints a black canvas (boots at `/millipede/`).
2. Register: add `millipede` to `justfile:19` `games` + `vitest.config.ts` `GAMES`; run
   `npm run gen:registry` (commit the regenerated `src/host/registry.ts`).
3. Update the hardcoded-nine lists the title omits: `tests/monorepo-topology.test.mjs:96` GAMES,
   and `tests/registry.test.mjs` `:33`/`:58` (`10 games (9 listed)`)/`:69` (append millipede to the
   curated order).
4. Green gates: `npm run test:orchestrator`, `npx vitest run --project millipede`, `npm run lint`,
   and a manual visual boot check at `http://127.0.0.1:5270/millipede/` vs the `/banana/` control.

**Handoff:** To Dev (Korben Dallas) for GREEN.

## Dev Assessment

**Implemented by Dev (Korben Dallas).** Millipede scaffolded as the tenth game.

**Created (`plugins/millipede/`):**
- `index.html` (joust's shape, title Millipede, `#game` canvas → `/src/main.ts`)
- `plugin.ts` — meta: id/title `MILLIPEDE` / year 1982 / `color:'#7ac142'` /
  `controls:['Mouse / Trackball']` / `order:10` / `listed:true` / `showcase:false` / version
- `package.json` (`millipede`, `0.0.1`, private), `tsconfig.json` (extends `../../tsconfig.json`)
- `src/main.ts` — minimal shell: `mountCanvas` + a RAF loop that paints black (no core yet)
- `tests/scaffold.test.ts` — the plugin-internal scaffold suite (see deviation)

**Registrations / roster guards updated:** `justfile` games, `vitest.config.ts` GAMES,
regenerated `src/host/registry.ts` (10 games, 9 listed); plus every hardcoded-roster guard the
tenth game reddens — `tests/monorepo-topology.test.mjs`, `tests/registry.test.mjs`,
`tests/release.test.mjs`, `src/host/registry.test.ts`, `lobby/tests/main.test.ts`.

**GREEN verification (all run, all pass):**
- `npm run test:orchestrator` → **478/478** (millipede-bootstrap flipped 9-fail → pass; the
  auto-derived `canonical-serve` proves `/millipede/` serves distinct from the `/banana/` control)
- `npx vitest run --project millipede` → **10/10**
- `npm run lint` (tsc --noEmit) → **clean**
- `--project host --project lobby --project shared` → **204/204** after fixing the two vitest
  roster guards
- `--project missile-command` spot-check → **1354/1354**; the other 8 game projects are
  directory-isolated with no roster coupling (verified by grep), so provably unaffected

**Handoff:** To Reviewer (Jean-Baptiste Emanuel Zorg) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — all gates GREEN (lint clean, orchestrator 478/478, millipede 10/10, host+lobby+shared 857/857, build OK, gen:registry --check no drift, zero smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (scaffold has no branching/boundary logic; main.ts is a stateless per-frame paint) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no try/catch, no fallbacks; mountCanvas throws loudly) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered + rule-checker #8/#15/#18/#26 (found the one weak assertion) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered + rule-checker #17 (plugin.ts/main.ts comments verified against showcase-liveness + clock-free claims) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered + rule-checker #1/#2/#5 (GameMeta typed, type-only import, no escapes) |
| 7 | reviewer-security | Yes | clean | none | N/A — no attack surface (static markup, canvas-2D only, no eval/network/secrets/untrusted JSON.parse) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (four-file scaffold is minimal; no dead code or over-engineering) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (of 47 instances across 30 rules; 46 compliant) | confirmed 1, dismissed 0, deferred 0 — [RULE] bootstrap.mjs:165 weak version guard, MEDIUM non-blocking |

**All received:** Yes (3 enabled returned — preflight, security, rule-checker; 6 disabled via `workflow.reviewer_subagents` and hand-covered)
**Total findings:** 1 confirmed (MEDIUM, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

Millipede lands as the tenth game exactly the way CLAUDE.md's "Adding a game" contract
prescribes: the four-file scaffold, the three registrations, and every hardcoded-roster
guard the tenth game reddens. I ran the enabled Right Arm (preflight, security,
rule-checker), hand-covered the six disabled specialists, read the whole diff myself, and
mutation-tested the one guard that was in doubt. The code is correct and the property set
is genuinely guarded; the single finding is a redundant, misleadingly-messaged assertion,
not a coverage hole, and rates MEDIUM (non-blocking).

**Data flow traced:** `plugins/millipede/index.html` `<canvas id="game">` → `main.ts`
`mountCanvas(document)` (querySelector + getContext('2d'), throws loudly on a missing or
non-canvas element — `src/shared/host-helpers.ts:51`) → a rAF loop that paints black. No
user input, no network, no clock read — a shell-only scaffold, as the story scopes it.

**Pattern observed:** the meta is derived from millipede's real state, not blind-copied from
joust — `showcase:false` at `plugins/millipede/plugin.ts:17` (a black canvas cannot
self-play; a blind joust copy would ship `showcase:true` and redden
`tests/showcase-liveness.test.mjs`), and `version` is the imported shorthand at
`plugin.ts:19`, never hardcoded.

**Error handling:** none added, and correctly so — the only failure path is `mountCanvas`,
which throws a named error rather than casting past a null (`host-helpers.ts:53-63`).

### Observations

- [VERIFIED] Registry consistent with plugin.ts, no drift — `src/host/registry.ts:112-122`
  (order 10, showcase:false, listed:true, version '0.0.1') matches `plugin.ts` field for
  field; `npm run gen:registry -- --check` exits 0 ("10 games (9 listed)"). Complies with the
  "generated registry is committed and re-validated" rule (registry.test.ts validateMeta).
- [VERIFIED] Order 10 is unique — enumerated orders 1–10 in `registry.ts`; no collision, and
  `tests/millipede-bootstrap.test.mjs:494` independently asserts order 10 is millipede alone.
- [VERIFIED] Registration surface complete — swept every hardcoded roster guard: justfile
  `games`, vitest `GAMES`, `monorepo-topology.test.mjs` GAMES, `registry.test.mjs`
  count+banner+tile-order, `registry.test.ts` manifests/listed arrays, `release.test.mjs`
  app-count (10→11), `lobby/tests/main.test.ts` tile count + launch-path list. No guard
  missed — `src/shared/tests/view-integer-scale.test.ts` correctly excludes millipede (it
  needs `src/shell/layout.ts`, which the scaffold has not built yet).
- [VERIFIED] Both order-tests are mutually consistent — `registry.test.ts:143` (order-sorted
  manifests) and `tests/registry.test.mjs:69` (curated tile order) both end
  `…pac-man, millipede`; LISTED excludes red-baron → 9 listed. All GREEN (preflight
  857/857 on host+lobby+shared).
- [SEC] Security clean — no injected HTML, no DOM sinks beyond canvas 2D, no eval/network/
  secrets, and the two `JSON.parse` calls read repo-local config at test time, not untrusted
  input (`scaffold.test.ts:34,57`). No backend/auth/tenant concept exists in this project.
- [TYPE] Type design clean — `GameMeta` is a typed interface, `import type { GameMeta }` is
  correctly type-only (`plugin.ts:2`), no `as any`/`@ts-ignore`/non-null assertions anywhere
  in the diff (rule-checker #1/#2/#5, tsc --noEmit clean).
- [DOC] Comments verified, not just present — `plugin.ts`'s showcase rationale checks out
  against the live `showcase-liveness` filter, and `main.ts`'s "no clock read, SHELL only"
  claim is true (no `performance.now`/`Date`) (rule-checker #17).
- [SIMPLE] Minimal and non-vacuous — the four-file scaffold carries no dead code; the 10-test
  scaffold suite pins the real, distinct millipede meta (not a shared placeholder), so it is
  not the single-fixture trap (rule-checker #18).
- [SILENT] No swallowed errors — no try/catch or silent fallback added; the one throw path
  (`mountCanvas`) surfaces loudly.
- [EDGE] No unhandled boundary paths — `main.ts`'s `frame()` is a stateless per-frame paint
  with no mode/phase branch to mis-derive an edge from (rule-checker #14).
- [TEST] / [RULE] **[MEDIUM, non-blocking]** weak version guard at
  `tests/millipede-bootstrap.test.mjs:165` — `assert.match(src, /version/, '…imported from
  package.json…')` cannot detect a hardcoded version because the substring survives in the
  `import { version }` line. **Mutation-verified by Reviewer live:** hardcoding
  `version: "9.9.9"` (import left dangling) kept all 10 tests in that file GREEN, while the
  sibling `scaffold.test.ts:75` `/version,/` correctly reddened. The property is therefore
  guarded (by the sibling, and by `gen:registry --check` drift) — this is a redundant, weak,
  over-claiming assertion, not an unguarded behavior. Recommend tightening to `/version,/`;
  recorded as a non-blocking Delivery Finding.

### Rule Compliance

Checked the diff's TypeScript against `.pennyfarthing/gates/lang-review/typescript.md` (30
numbered checks) and CLAUDE.md's "Adding a game" contract. Rule-checker enumerated 47
instances across 30 rules; I confirmed its inventory and the one exception.

- **Type-safety escapes (#1):** 0 violations across plugin.ts, main.ts, scaffold.test.ts,
  registry.ts/.test.ts, lobby/main.test.ts — no `as any`/`as unknown`/`@ts-ignore`/`!`.
- **Type-only imports (#5):** compliant — `import type { GameMeta }` (plugin.ts:2); value
  import `import { version }` correct and matches joust.
- **Test quality / source-text guards (#8/#15/#25/#26):** one violation — bootstrap.mjs:165
  (above). Every other source-text anchor is `key:\s*value` or exact count/array equality,
  and `registryEntry()` correctly narrows scope to the millipede object literal before
  matching. All mutation-appropriate.
- **Build/config (#9):** tsconfig extends `../../tsconfig.json`, never redeclares `strict`
  (guarded by scaffold.test.ts:171, mutation-appropriate).
- **Counts measured from same-diff artifacts (#20/#24):** all number swaps (9→10 games, 8→9
  listed, 10→11 apps) taken after the registry change and verified by the full green run;
  terminology swept across every touched file, not just the story-named ones.
- **CLAUDE.md "Adding a game":** four files present; three registrations wired;
  `gen:registry --check` clean; `version` imported not hardcoded; `showcase:false` correct;
  `order:10` unique. Fully compliant.

### Devil's Advocate

Let me try to break this. First attack: the meta is a lie the registry launders. `plugin.ts`
declares `version` as a shorthand, but the committed `registry.ts` hardcodes `'0.0.1'` — what
stops those diverging? I mutated exactly that (hardcode `version: "9.9.9"` in plugin.ts) and
found the orchestrator's own version guard sails straight past it, which smells like the whole
"generated, never drifts" story is theatre. But it is not: `gen:registry --check` recomputes
registry.ts from plugin.ts and exits non-zero on any drift (preflight ran it: clean), and
`registry.test.ts` re-validates field-for-field. The bootstrap:165 guard is weak, but it is
the third lock on a door already bolted twice — the mutant that beats :165 is caught by
`scaffold.test.ts:75` and by `--check`. So the divergence attack fails; only the redundant
assertion is soft, and I've filed it.

Second attack: `listed:true` on a black screen. A confused user opens the lobby, sees a
MILLIPEDE tile, clicks it, and lands on a black void — or worse, on a bucket 404 if the lobby
is redeployed before the game ships. That is real, and I logged it as an undocumented
deviation (L, non-blocking): it is a deploy-sequencing property, not a defect this commit
introduces, and it matches how missile-command/pac-man/joust scaffolds shipped. No deploy
fires from this feature branch, so nothing reaches a user today. The owner has a documented
one-flag escape (`listed:false`).

Third attack: `main.ts` resizes the canvas every frame — `canvas.width = canvas.clientWidth`
forces a layout read and clears the buffer 60×/s. On a stressed machine that is a reflow
storm. But the buffer's only content is a black fill drawn immediately after, so the clear is
free and the geometry is always correct even across a window resize; for a scaffold whose
entire job is "paint black and mount," this is simpler and more correct than a resize
listener, not a bug. Fourth: could a malicious `index.html` or a missing `#game` crash
silently? No — `mountCanvas` throws a named error rather than casting past null, so a broken
page fails loudly at boot, which is the behavior you want. Fifth: does the empty
`src/core`/`src/shell` violate the purity gate? No such gate exists yet for millipede — it
arrives with the parked ml1-1 — and no orchestrator test assumes every plugin has a core
(478/478 green). The attacks that land are the two I already recorded; the rest fail.

**Handoff:** To SM (Ruby Rhod) for finish-story.