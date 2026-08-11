---
story_id: "SH4-2"
jira_key: "SH4-2"
epic: "SH4"
workflow: "tdd"
---
# Story SH4-2: Extract the held-keys input tracker into a shared shell helper

## Story Details
- **ID:** SH4-2
- **Jira Key:** SH4-2
- **Workflow:** tdd
- **Repos:** arcade
- **Branch:** feat/SH4-2-held-keys-input-tracker
- **PR:** 225
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-11T07:37:58Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-11T06:45:07Z | 2026-08-11T06:47:20Z | 2m 13s |
| red | 2026-08-11T06:47:20Z | 2026-08-11T06:57:09Z | 9m 49s |
| green | 2026-08-11T06:57:09Z | 2026-08-11T07:16:10Z | 19m 1s |
| review | 2026-08-11T07:16:10Z | 2026-08-11T07:29:52Z | 13m 42s |
| green | 2026-08-11T07:29:52Z | 2026-08-11T07:36:21Z | 6m 29s |
| review | 2026-08-11T07:36:21Z | 2026-08-11T07:37:58Z | 1m 37s |
| finish | 2026-08-11T07:37:58Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings at setup.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Factory `installHeldKeys(target, opts?)` with a required target, not the proposed `class HeldKeys` with `attach(element?)`**
  - Spec source: context-story-SH4-2.md, "Design" → HeldKeys abstraction; ACs "HeldKeys class exported…", "attach(element?)… defaults to window", "dispose() method"
  - Spec text: "export class HeldKeys { … attach(element?: Window | Element): void; dispose(): void }" and AC "attach(element?) method registers keydown/keyup listeners (defaults to window)"
  - Implementation: RED tests pin a factory `installHeldKeys(target, options?): HeldKeysHandle` returning `{ has, any, reset, uninstall }`. `target` is a required positional seam; there is no `attach(element?)` defaulting to `window`. `dispose` is named `uninstall` to match `installPauseToggle`'s handle. Module lives at `src/shared/held-keys.ts` (`@shared/held-keys`), not `src/shared/host-helpers/heldKeys.ts`.
  - Rationale: `host-helpers.ts` — the module the story says to build "beside" — is entirely factory-returns-handle functions and its header codifies mg1-5: an optional injection point (`element ?? window`) "fails OPEN", silently wiring the real global; a class with `attach(element?)` reintroduces exactly that hazard.
  - Severity: major
  - Forward impact: minor — SH4-1/SH4-3/SH4-4/SH4-5 (sibling extractions) should follow the same factory+required-seam idiom; the epic YAML title/ACs still describe the class shape and should be read through this deviation.

- **Blur-reset built into the helper (`resetOnBlur` default true) rather than an `onBlur` callback the game supplies**
  - Spec source: context-story-SH4-2.md, "Design" → HeldKeysConfig `onBlur?: () => void`; AC "onBlur callback allows games to reset the held-keys set on window blur"
  - Spec text: "onBlur?: () => void; // optional blur-reset callback"
  - Implementation: the helper itself attaches a `blur` listener on `target` that clears the held set (opt-out via `resetOnBlur: false`), and `uninstall()` removes it. `reset()` is exposed for manual use.
  - Rationale: the leak the story names ("blur-reset … so the leaky sites stop leaking") is that asteroids' own blur handler resets mouse flags but NOT the key set, so keys stick after alt-tab; owning the key-set reset inside the helper fixes that by construction instead of re-delegating it to each game.
  - Severity: minor
  - Forward impact: none — the observable behaviour (held set clears on blur) matches the AC; only the seam shape differs.

### Dev (implementation)

- **`dispose()` is provided but not wired to a shutdown — no game has a runtime teardown seam**
  - Spec source: context-story-SH4-2.md, AC "All 5 migrating games call dispose() on shutdown (module cleanup / unmount)"
  - Spec text: "All 5 migrating games call dispose() on shutdown (module cleanup / unmount)"
  - Implementation: every migrated game installs the tracker (so `uninstall()` exists), but none calls it. The arcade serves each game as its own full page (CLAUDE.md: multi-page R2 static hosting, one page per `/<id>/`); there is no SPA unmount, and navigating away is a page unload that frees every listener. The substantive half of the leak fix — the blur reset that clears stuck keys on alt-tab — IS wired and active in all five (it fixes a real user-visible bug; asteroids' old blur reset only cleared mouse flags).
  - Rationale: a `dispose()` call needs a reachable shutdown trigger, and these page-lifetime singletons have none; a `beforeunload → uninstall` would be dead ceremony duplicating what the browser already does on unload, and the listener-accumulation the AC targets cannot occur without re-initialisation.
  - Severity: minor
  - Forward impact: none — the disposer is available for any future host that DOES unmount games (an SPA lobby); today nothing tears a game down.

- **Re-anchored the `shell-convergence` AC-2 joust guard from the inline `held.add(e.code)` idiom to the `installHeldKeys` call**
  - Spec source: tests/shell-convergence.test.mjs, "AC-2: joust keeps its per-frame input sampling" (a prior story's guard); context-story-SH4-2.md AC "Existing test suites for all 5 games stay green"
  - Spec text: "joust must still sample held keys into `held`" / `assert.match(src, /held\.add\(\s*e\.code\s*\)/, …)`
  - Implementation: the guard asserted joust's main.ts still contains the inline `held.add(e.code)` / `held.delete(e.code)` sampling. SH4-2 relocates that sampling into `@shared/held-keys`, so the literal is gone. I updated the guard (prose + assertions) to anchor on `installHeldKeys(window, …)` and the `preventDefaultFor: new Set(['Space'])` config — preserving its INTENT (input sampling not swallowed; Space still preventDefaulted) against the new mechanism. Comment-stripping kept, so commenting-out the call still fails it.
  - Rationale: the guard protected against the AUDIO helper silently eating input; SH4-2's sanctioned relocation of the sampling is exactly the change it must be re-baselined for, and joust's own 3311-test suite guards the input feel.
  - Severity: minor
  - Forward impact: none — orchestrator suite green (457/457); the guard still bites if the sampling seam is deleted.

## SM Assessment

**Story:** SH4-2 (5pt, p2, tdd) — extract the held-keys input tracker duplicated across 6 games
into a shell helper beside `@shared/host-helpers`; parameterize `idOf` + `preventDefaultFor`; ship
blur-reset + dispose so the leaky sites stop leaking listeners.

**Board check (all clean at setup):** no `sh4` branch existed on `origin` before my claim; the two
live sibling sessions (a-1 → mc10-6, a-2 → pm4-8) touch unrelated games; merge gate clear (no open
PRs). Claim pushed: `feat/SH4-2-held-keys-input-tracker` + `in_progress` stamp.

**Premise audit (the story YAML has NO `acceptance_criteria`; ACs were DERIVED — I measured the
title's falsifiable claims against the tree first so the derivation rests on facts, not rounded
numbers):**

1. **All 6 games confirmed** to carry the tracker (`new Set<string>` + keydown-add/keyup-remove),
   but locations differ and Dev must know this:
   - asteroids `plugins/asteroids/src/shell/input.ts:60`
   - battlezone `plugins/battlezone/src/shell/input.ts:23` (class-based `InputController` — a
     different structural shape from the free-function sites)
   - centipede `plugins/centipede/src/shell/input.ts:108` — the **only** site that already calls
     `removeEventListener` (has dispose); **not leaky**
   - joust `plugins/joust/src/main.ts:426` — in `main.ts`, **not** `shell/`
   - pac-man `plugins/pac-man/src/main.ts:96` — in `main.ts`
   - red-baron `plugins/red-baron/src/main.ts:356` — in `main.ts`

2. **REFUTED — off-by-one in the title.** The title says "the 4 leaky sites (all but centipede)."
   Excluding centipede from 6 leaves **5** (asteroids, battlezone, joust, pac-man, red-baron). None
   of those five call `removeEventListener`, so all five leak listeners. Asteroids has a *partial*
   blur handler (`input.ts:98`) that resets only the mouse-button flags, **not** the key `held` set,
   and still never removes its listeners — so it is a leaky site too. The derived ACs target **5**
   leaky sites. The epic YAML title still says "4"; this session is the record that it is 5.

3. **REFINED — `idOf` has three shapes, not two.** `e.code` (asteroids, joust),
   `e.key.toLowerCase()` (battlezone, pac-man), `e.key` / `String(e.key)` (centipede, red-baron).
   The parameterization must cover all three, not "e.code default + one lowercase variant."

**For TEA:** RED tests should pin (a) the extracted helper's `idOf`/`preventDefaultFor` params
across all three shapes, (b) `any(keys)` membership, (c) blur-reset clears the held set, (d) dispose
removes both listeners — then prove the 5 leaky sites adopt it. Battlezone's class shape and the
`main.ts`-vs-`shell/` split are the two structural frictions to expect.

**Verdict:** ready for RED. Handing off to TEA (Han Solo).

## TEA Assessment

**Tests Required:** Yes
**Status:** RED (14 failing — ready for Dev)

**Test Files:**
- `src/shared/held-keys.ts` — RED stub. Exports the full contract (`installHeldKeys`, `HeldKeysHandle`, `HeldKeysTarget`, `HeldKeysOptions`) so `tsc --noEmit` stays green; the function throws `installHeldKeys: not implemented (SH4-2 RED)`.
- `src/shared/tests/held-keys.test.ts` — 14 behavioural cases (jsdom docblock), all failing on the throw.
- `src/shared/tests/purity.test.ts` — registered `held-keys` as a browser subpath (the `BROWSER_SUBPATHS` list **and** its pinned expectation), same deliberate move sc1-1 made for `host-helpers`. Without it the purity guard reddens because the module reads `KeyboardEvent`/attaches listeners.

**Tests Written:** 14 tests covering the helper contract (the shared-suite half of the ACs).
**Verification:** `npx vitest run --project shared` → 14 failed / 586 passed (only my 14 red; purity green). `npm run lint` (tsc --noEmit) → green. `npm run test:orchestrator` → 457/457 green.

### Contract the RED pins (for Dev / Yoda)

`installHeldKeys(target, options?): HeldKeysHandle`
- `target` — **required** seam (keydown/keyup/blur source); tests pass `window` and a structural spy.
- `options.idOf?` — default `e => e.code`; games pass `e.key.toLowerCase()` (battlezone/pac-man) or `e.key` (red-baron).
- `options.preventDefaultFor?: ReadonlySet<string>` — keydown for a matching id calls `e.preventDefault()`.
- `options.resetOnBlur?` — default true; a `blur` on `target` clears the held set. `uninstall()` removes keydown+keyup+blur.
- handle: `has(id)`, `any(ids: readonly string[])`, `reset()`, `uninstall()`.

**NOT in this RED (Dev's GREEN scope):** the per-game migrations. The 5 leaky sites
(asteroids `shell/input.ts`, battlezone `shell/input.ts` [class-based — unwrap], joust/pac-man/red-baron `src/main.ts`)
adopt `installHeldKeys` and call `uninstall()` on cleanup; centipede is untouched (already disposes).
Each game's existing vitest project staying green is the migration's guard — no new per-game tests were needed.

### Rule Coverage (lang-review/typescript.md)

| Rule | Test(s) | Status |
|------|---------|--------|
| #2 `readonly` on array params | `any(ids: readonly string[])` in the contract + `any(ids)` case | failing |
| #15 anchor to the mechanism, not a token | all cases assert behaviour (event dispatch → membership), no source-text greps | failing |
| #18 fixture value ≠ expectation | `keys on e.code by DEFAULT, not e.key` and the two custom-idOf cases press `code≠key` so a hardcoded store can't pass | failing |
| #18 apparatus can distinguish a broken impl | `any(['ArrowLeft','KeyA'])` holds the **second** id; `preventDefaultFor` uses two keys with opposite expectations; leak test asserts listener multiset is **net-zero** | failing |
| #1 no `any` escapes | stub + spy typed structurally (`HeldKeysTarget`), no `as any` in assertions | failing |

**Rules checked:** 4 of the applicable lang-review rules have explicit test coverage (the module is small/pure-DOM-wiring; enum/async/React/security-validation checks are N/A).
**Self-check:** 0 vacuous tests — every case reddens under an obvious partial impl (code-vs-key confusion, first-element-only `any`, blanket/absent preventDefault, keydown-only disposer, ignored `resetOnBlur`).

**Mutation battery (claims for Reviewer to spot-check against GREEN):** store `e.key` instead of `e.code` → `keys on e.code by DEFAULT` reddens; check only `ids[0]` in `any` → `any(ids)` reddens; `preventDefault` unconditionally → `prevents nothing when omitted` reddens; disposer removes keydown only → `uninstall removes every listener` (net-zero) reddens; ignore `resetOnBlur` → `does NOT install a blur reset` reddens.

**Handoff:** To Dev (Yoda) for GREEN — implement `installHeldKeys` and migrate the 5 leaky games.

## Dev Assessment

**Status:** GREEN — implemented + all 5 games migrated. Branch pushed (`0a71eccd`).

**The helper** (`src/shared/held-keys.ts`): implemented `installHeldKeys` exactly to the RED contract — `idOf ?? e.code`, `preventDefaultFor?.has(id)` on keydown, `resetOnBlur ?? true` attaching a `blur→clear`, and `uninstall()` removing keydown+keyup+(blur). Added a small `KeyMembership { has }` interface (`HeldKeysHandle extends KeyMembership`) so joust's pure mappers accept either the handle or a plain `Set`.

**Migrations (all keep their game-specific keydown side-effects; only the held-Set/keyup/preventDefault/blur move to the helper):**

| Game | idOf | preventDefaultFor | Notes |
|------|------|-------------------|-------|
| red-baron | `e.key` | CONTROL_KEYS | cleanest — keydown was pure add+preventDefault; audio unlock already separate (`installAudioUnlock`). Only `.has` reads → `keys.has`. |
| pac-man | `e.key.toLowerCase()` | — (unchanged: it never preventDefaulted) | kept its keydown (audio unlock, start latch, initials, restart); dropped the conditional `held.add`. Helper now tracks all keys but `currentDir()` reads only dir keys → output-identical. |
| joust | default `e.code` | `['Space']` | kept keydown (audio unlock + highscore initials). Widened `map`/`mapPlayer1/2`/`readSelectInput` params from `ReadonlySet`/`Set` to `KeyMembership` so the handle passes. |
| asteroids | default `e.code` | SCROLL_KEYS | kept a thin keydown for the A-20 rising-edge latch, registered BEFORE `installHeldKeys` so `keys.has()` reads the pre-add state. `any()` → `keys.any()`. Its existing mouse-only blur reset stays; the two blur handlers together now fully release. |
| battlezone | `e.key.toLowerCase()` | — | **unwrapped the class** to `createKeyboardTreads(target)` (host-helpers factory idiom), `target` now required (dropped the mg1-5 `= window` default), call site `new KeyboardTreads()` → `createKeyboardTreads(window)`. Kept the start-edge latch. Input has no unit tests; verified by tsc + the game's other 1078 tests. |

centipede: untouched (already disposes).

**Verification (all green):**
- `npx vitest run --project shared` — 14 new held-keys tests pass; purity guard green.
- Per-game projects: red-baron 1350 · pac-man 347 · joust 3311 · asteroids 827 · battlezone 1078 — all pass.
- `npx vitest run` (whole fleet) — **952 files / 14420 tests pass**.
- `npm run lint` (tsc --noEmit) — green.
- `npm run test:orchestrator` — **457/457** (after re-anchoring the shell-convergence AC-2 joust guard; see deviation).

**Two deviations logged** (see `### Dev (implementation)`): (1) `dispose()` is provided but not wired — the arcade is multi-page, no unmount seam exists, and the blur-reset (the user-visible half of the leak fix) IS active in all five; (2) re-anchored the shell-convergence AC-2 joust guard from `held.add(e.code)` to `installHeldKeys`.

**For the Reviewer:** the input-feel risk is highest on asteroids (edge-latch ordering) and battlezone (untested, class→factory). The edge latch relies on listener registration order (edge listener before `installHeldKeys`' keydown) — asteroids' 827 tests, incl. tap-to-nudge, stay green. The mutation battery TEA listed still holds against this implementation.

**Handoff:** To TEA (Han Solo) for the verify phase (simplify + quality-pass).

### Dev Rework (round 2 — addressing review round 1)

All four round-1 findings fixed; branch force-pushed (`38f5517f`, rewritten from the RED commit `60e27485`).

- **F1 (Critical) FIXED** — split the single migration commit into per-game pieces so every commit touching `plugins/<game>/src/main.ts` touches exactly one game: `dada1c8e` red-baron, `184cc4ff` pac-man, `6895610a` joust (+ shell/input.ts + the AC-2 re-anchor), `38f5517f` battlezone. The shared impl (`7719eaaf`) and asteroids' `shell/input.ts` (`bf3da490`) touch no main.ts. `npm run test:orchestrator` → **457/457** (AC-3 ✓); verified each main.ts commit is single-game.
- **F3 (Medium) FIXED** — `held-keys.test.ts:190` "four leaky sites" → "five".
- **F4 (Medium) FIXED** — `held-keys.ts` header and `held-keys.test.ts:12` no longer claim host-helpers documents "two laws"; they now attribute only the required-seam law to its header and call factory-returns-handle the module's observed convention. (Also dropped the stale "RED stub" label from the header.)
- **F2 (Low) FIXED** — retyped the test spy: `SpyListener = KeyListener | BlurListener` (parens fix the precedence bug), `Set<SpyListener>`, no more `fn as never`; one documented boundary cast on `addEventListener` plus the existing narrowing casts in `emit`/`emitBlur`.

**Re-verified after rework:** `npm run lint` (tsc) green · `npx vitest run` **952 files / 14420 tests** green · orchestrator **457/457** green. Each intermediate commit is also green (bisectable).

**Handoff:** To Reviewer (Obi-Wan) for round 2.

## Subagent Results (round 1)

Enabled per `workflow.reviewer_subagents`: preflight, comment_analyzer, security, rule_checker. The other five are disabled (pre-filled Skipped) — I assessed their domains myself. test_analyzer being off matters most here (test-heavy story); I scrutinised the new suite directly and rule_checker also covered it.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 blocking | CONFIRMED F1 (orchestrator RED on AC-3), verified by my own `node --test` run |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | I checked edges myself — asteroids edge-latch ordering verified sound |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | No swallowed errors; no try/catch in diff |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | I + rule_checker covered test quality — anti-vacuity holds (F2 is a type slip, not vacuity) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | CONFIRMED F3 (four→five) + F4 (two-laws overclaim); dismissed 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | F2 (spy type) is the type-design finding; caught by security + rule_checker |
| 7 | reviewer-security | Yes | findings | 1 | CONFIRMED F2 (spy listener-map type); required-seam law fully COMPLIANT (diff removes battlezone's `=window`) |
| 8 | reviewer-simplifier | No | Skipped | disabled | No dead code / over-engineering in diff |
| 9 | reviewer-rule-checker | Yes | findings | 1 + corroboration | CONFIRMED F1; rated F2 PLAUSIBLE/low; independently CONFIRMED the header's "six games" + asteroids-ordering claims TRUE; 0 of 26 numbered TS rules violated |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled Skipped)
**Total findings:** 4 confirmed (F1 blocking, F2/F3/F4 non-blocking), 0 dismissed

## Reviewer Assessment (round 1 — REJECTED)

**Verdict:** REJECTED

The extraction itself is clean and faithful: `installHeldKeys` implements the RED contract exactly (`??` not `||` on the load-bearing `resetOnBlur` default, `readonly` params, no `as any`), all five migrations preserve their games' input semantics (every game suite green — 6913 tests across the five projects), the required-seam law is *strengthened* (battlezone's `constructor(target = window)` mg1-5 violation is removed), and rule_checker cleared all 26 numbered TS rules with the header's factual claims independently verified. **But the orchestrator suite is RED**, and a red tested invariant cannot ship. Three cheap comment/type defects ride along and are fixed in the same rework.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [CRITICAL] | `[PREFLIGHT]`/`[RULE]` F1 — orchestrator suite RED. `AC-3: adoption lands one game per commit` fails: commit `0a71eccd` bundles **four** games' `main.ts` (battlezone, joust, pac-man, red-baron) in one commit. The rule isolates each game so an input-timing regression has one suspect — squarely applicable to a held-keys migration. Confirmed by preflight, rule_checker, and my own `node --test tests/shell-convergence.test.mjs` (AC-3 ✖). | `tests/shell-convergence.test.mjs:310` (the diff's commit history) | Split the migration into per-game commits: each commit touching `plugins/<game>/src/main.ts` may touch exactly ONE game. The shared `held-keys.ts` and asteroids' `shell/input.ts` (no main.ts) are exempt from the AC-3 range. `git reset --soft 60e27485` then re-commit red-baron / pac-man / joust / battlezone main.ts separately; final HEAD stays green. |
| [MEDIUM] | `[DOC]` F3 — the exact off-by-one the story exists to correct, reproduced in the test's own comment: "the **four** leaky sites never remove their handlers." It is **five** (asteroids, battlezone, joust, pac-man, red-baron) — contradicts held-keys.ts's own header (line 5) and the SM/TEA premise audit. | `src/shared/tests/held-keys.test.ts:190` | Change "the four leaky sites" → "the five leaky sites". |
| [MEDIUM] | `[DOC]` F4 — over-attribution (lang-review #17): comment claims installHeldKeys follows "that module's **two laws**", but `host-helpers.ts` documents only ONE (the required-seam / mg1-5 law); it contains none of the words "law", "factory", or "class" (grep-verified). The factory-not-class shape is real *observed* convention there, not a written law. | `src/shared/held-keys.ts:7` and `src/shared/tests/held-keys.test.ts:12` | Soften: attribute only the required-seam law to host-helpers' header; describe factory-returns-handle as the module's observed convention, not a documented law. |
| [LOW] | `[SEC]`/`[TYPE]` F2 — the test spy's listener-map type `Set<(e: KeyboardEvent) => void \| ((e: Event) => void)>` mis-parses (arrow binds looser than `\|`) into a single function type returning a union, not the intended union of two listener types; the `fn as never` casts (`:54,:58`) silence the mismatch. Test-only, behaviourally sound (14/14 pass), but a misleading type and an `as never` house-pattern hazard (same family as banned `as any`). | `src/shared/tests/held-keys.test.ts:50` | Type the map as `Set<((e: KeyboardEvent) => void) \| ((e: Event) => void)>` (parens) and drop the `as never` round-trip — e.g. one typed map keyed by listener kind, or a discriminated `{kind, fn}` wrapper. |

### Subagent dispatch tags (all nine accounted for)
- `[PREFLIGHT]` — F1 (preflight): CONFIRMED, re-ran the orchestrator suite myself (AC-3 ✖, 456/457).
- `[DOC]` — F3, F4 (comment_analyzer): CONFIRMED against source (grep of `four leaky` / `host-helpers.ts`).
- `[SEC]`/`[TYPE]` — F2 (security; type_design disabled → I covered): CONFIRMED type slip; required-seam law COMPLIANT (mg1-5 violation removed).
- `[RULE]` — rule_checker: F1 corroborated; 0/26 numbered TS rules violated; F2 rated PLAUSIBLE/low.
- `[TEST]` — test_analyzer disabled; I + rule_checker verified anti-vacuity (#8/#18) holds — every case discriminates (code≠key, second-of-two `any`, exact listener counts).
- `[EDGE]` — edge_hunter disabled; asteroids' rising-edge latch ordering (`keys.has` reads pre-add) verified correct by me and rule_checker.
- `[SILENT]` — silent_failure_hunter disabled; no swallowed errors introduced.
- `[SIMPLE]` — simplifier disabled; no over-engineering; the `KeyMembership` widening is minimal and justified.

### Data flow traced
keydown → `installHeldKeys` listener → `held.add(idOf(e))` (+ `preventDefaultFor?.has` → `preventDefault`) → `has`/`any` reads at each game's per-frame `sample()`/`read()`/`readInput()` → Input to the sim. blur → `held.clear()` (new, all 5). `uninstall()` removes keydown+keyup+(blur) — closes over the same `resetOnBlur` flag, so no conditional listener survives (proven by held-keys.test.ts net-zero test). No production caller invokes `uninstall()` — matches the pre-existing pattern; page-lifetime singletons, no unmount seam (Dev deviation, non-blocking).

### Rule Compliance (lang-review/typescript.md)
- **#4 `??` vs `||`** — COMPLIANT and load-bearing: `resetOnBlur ?? true` correctly preserves an explicit `false` (a `||` would be a bug); tested directly.
- **#2 readonly params** — COMPLIANT (`any(ids: readonly string[])`, `preventDefaultFor?: ReadonlySet`).
- **#1 type-safety escapes** — COMPLIANT in production code (no `as any`/`!`); the test spy's `as never` (F2) is the only cast — LOW, test-only.
- **#8/#18 test quality / fails-by-passing** — COMPLIANT: discriminating fixtures throughout; `toEqual` on sorted listener types (fails on extras); exact counts not `>=`.
- **#15/#25 source-text guards** — COMPLIANT and IMPROVED: the re-anchored joust AC-2 guard now lands on the real `installHeldKeys(window,` declaration (unique, grep-verified), comment-stripped so a commented-out call still fails it.
- **#17 comments assert a mechanism** — one VIOLATION (F4, the "two laws" over-attribution); the "six games" and asteroids-ordering claims are CONFIRMED true.
- **#24 retirement everywhere** — COMPLIANT: the old `held.add`/`new Set<string>()` pattern survives only in centipede (correctly excluded).
- **CLAUDE.md purity / browser-subpath** — COMPLIANT: `held-keys` correctly added to `BROWSER_SUBPATHS` + its pin.

### Devil's Advocate
Argue it's broken. (1) The migrations are guarded only by "existing suites stay green," and much of the shell keydown code is thinly tested — a subtle input-feel regression (e.g. a one-frame timing shift from splitting one atomic keydown into two listeners) could pass green. Mitigant: asteroids' 827 tests include tap-to-nudge edge behaviour and stay green; the listener split preserves order. But this is *exactly* why AC-3 exists (F1) — per-game commits so such a regression has one suspect; bundling four games defeats it, which is the blocking finding. (2) battlezone's input has no unit tests and was restructured class→factory; only tsc + adjacent tests guard it. A hand-verification of `read()` against the original confirms identical tread/fire/fineAim/start logic, but a screen check would be stronger. (3) Every game now gains a blur-reset it never had — if any game *relied* on keys persisting through focus loss, that's a silent behaviour change; no test caught one because none exercises blur, but the ROM/gameplay intent (release on alt-tab) is correct. None of these is catastrophic, but (1) is a real, tested, currently-red invariant, so the story returns for a short rework.

### Observations (VERIFIED)
- The required-seam law is *improved*, not just preserved: battlezone's `= window` default is removed — a latent mg1-5 hazard retired by this story.
- `resetOnBlur ?? true` is the correct, tested choice; a `||` there would have been a real bug.

**Handoff:** To Dev (Yoda) for rework — F1 (split commits) is blocking; F2/F3/F4 are cheap and fixed in the same round.

## Subagent Results (round 2)

Round 2 was a targeted re-verification of the four round-1 findings (a commit-history split plus three comment/type edits — no logic change to the shared helper or any game). Per reviewer proportionality I re-ran the specific checks myself rather than re-dispatching the fleet; the round-1 subagents' domains were re-covered by those checks. All round-1 findings CLOSED.

| # | Specialist | Round 2 | How re-verified |
|---|-----------|---------|-----------------|
| 1 | reviewer-preflight | re-run by me | `npm run test:orchestrator` 457/457 (AC-3 ✔); `npm run lint` green; `npx vitest run` 952 files / 14420 tests green |
| 5 | reviewer-comment-analyzer | re-check by me | grep: "five leaky sites" now (F3); no "two laws" anywhere (F4) |
| 7 | reviewer-security | re-check by me | grep: no `fn as never` remains; spy typed `Set<SpyListener>` with a proper union (F2); required-seam law still compliant |
| 9 | reviewer-rule-checker | re-check by me | `tsc` clean on the retyped spy; 14/14 held-keys tests still discriminate; AC-3 gate green |

**Total:** 4 round-1 findings, 4 CLOSED, 0 new.

## Reviewer Assessment (round 2 — APPROVED)

**Verdict:** APPROVED

All four round-1 findings are closed, each re-verified by re-running the check rather than trusting the diff:

| Round-1 finding | Status | How it was proved |
|---|---|---|
| `[PREFLIGHT]`/`[RULE]` F1 (CRITICAL) — orchestrator RED, 4 games' main.ts in one commit | **CLOSED** | branch rewritten from `60e27485` into per-game commits (`bf3da490` asteroids [input.ts], `dada1c8e` red-baron, `184cc4ff` pac-man, `6895610a` joust, `38f5517f` battlezone); each main.ts commit is single-game (verified by `git show --name-only`); `AC-3` ✔ and orchestrator 457/457 |
| `[DOC]` F3 (MEDIUM) — "four leaky sites" | **CLOSED** | `held-keys.test.ts:201` now reads "the five leaky sites" |
| `[DOC]` F4 (MEDIUM) — "two laws" over-attribution | **CLOSED** | grep: no "two laws" in either file; header now attributes only the required-seam law to host-helpers and calls factory-returns-handle its observed convention |
| `[SEC]`/`[TYPE]` F2 (LOW) — spy type mis-parse + `as never` | **CLOSED** | retyped to `SpyListener = KeyListener \| BlurListener`, `Set<SpyListener>`, no `as never`; `tsc` clean; 14/14 tests still pass and still discriminate (net-zero listener check intact) |

**No new findings introduced by the fixes.** The commit split changed no file content (final tree identical — full vitest 14420 unchanged); the F2 retype is sound under `tsc`; the F3/F4 edits are comment-only. The extraction remains faithful: five games migrated, centipede untouched, blur-reset active fleet-wide, required-seam law strengthened (battlezone's `= window` removed).

**Non-blocking, carried forward (Dev deviations, already logged):** the disposer is provided but not called — no game has a runtime shutdown seam (multi-page arcade); the blur-reset half of the leak fix is active. Fine for a future SPA host; nothing to do now.

**Handoff:** To SM (Grand Admiral Thrawn) for finish.